// Custom design requests: saved on the server, proofs emailed to the customer,
// approval by the customer, then a Stripe payment link. Printing only starts once paid.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { customItemPrice, postageFor, shopSettings, getPrices, CUSTOM_PRODUCTS } from "./shop.mjs";
import { sendEmail, sendToShop, layout, esc } from "./email.mjs";

export const STATUS_LABEL = {
  "needs-design": "Waiting for us to make the proof",
  "awaiting-approval": "Proof sent, waiting for the customer to approve",
  approved: "Approved, payment link sent (not paid yet)",
  paid: "PAID: ready to send to print",
  printed: "Sent to print / done",
  cancelled: "Cancelled",
};

export const newId = () => "q" + Date.now().toString(36) + randomBytes(3).toString("hex");
export const newToken = () => randomBytes(16).toString("hex");
export const validId = (id) => /^q[a-z0-9]{6,20}$/.test(String(id || ""));

export function tokenOk(req, token) {
  const a = Buffer.from(String(token || "")), b = Buffer.from(String(req?.token || ""));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export const getRequest = (store, id) => (validId(id) ? store.get(`req/${id}`, { type: "json" }) : null);
export const saveRequest = (store, r) => store.setJSON(`req/${r.id}`, r);
export async function listRequests(store) {
  const { blobs } = await store.list({ prefix: "req/" });
  const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return all.filter(Boolean).sort((a, b) => b.created - a.created);
}
export const note = (r, what) => (r.history = [...(r.history || []), { at: new Date().toISOString(), what }].slice(-30));

// Prices every item again from the current price list.
export async function priceRequest(store, r) {
  const prices = await getPrices(store);
  const lines = r.items.map((it) => customItemPrice(it, prices));
  const { subtotal, postage, label } = postageFor(lines);
  const post = r.delivery?.collect ? 0 : postage;
  return { lines, subtotal, postage: post, postageLabel: r.delivery?.collect ? "Free collection" : label, total: subtotal + post };
}

const money = (p) => "£" + (p / 100).toFixed(2);
export const itemText = (it) => [CUSTOM_PRODUCTS[it.product] || it.product, it.size, it.color].filter(Boolean).join(", ");

function briefHtml(r) {
  const b = r.brief || {};
  const row = (k, v) => (v ? `<tr><td style="padding:3px 10px 3px 0;color:#666;vertical-align:top;">${k}</td><td style="padding:3px 0;">${esc(v)}</td></tr>` : "");
  return `<table style="font-size:14px;border-collapse:collapse;">
    ${row("Occasion", b.occasion)}${row("Wants", b.kind)}${row("Quote / words", b.quoteText)}
    ${row("Style", b.style)}${row("Colours", b.colours)}${row("Description", b.description)}
    ${row("Items", r.items.map(itemText).join(" | "))}
    ${row("Delivery", r.delivery?.collect ? `Free collection (postcode ${r.delivery.postcode})` : "Post to customer")}
  </table>`;
}

export function proofUrls(r, origin) {
  return Array.from({ length: r.proofs || 0 }, (_, i) => `${origin}/api/proof/${r.id}-${i}?t=${r.token}`);
}

// Email 1 (no image yet): we've got your request.
export async function emailReceived(r, origin) {
  await sendEmail({
    to: r.customer.email,
    subject: "We've got your custom design request",
    html: layout(`Thanks ${r.customer.name}!`, `
      <p>We've got your custom design request. We'll make up a proof of your design on your chosen items and email it to you to approve.</p>
      ${briefHtml(r)}
      <p>Nothing is printed and you pay nothing until you've approved the proof.</p>
      <p>Your reference: <b>${r.id}</b></p>`),
  });
  await sendToShop(`New custom request ${r.id}: needs a proof made`, layout("New custom request (no image)", `
    <p><b>${esc(r.customer.name)}</b> &lt;${esc(r.customer.email)}&gt; ${esc(r.customer.phone || "")}</p>
    ${briefHtml(r)}
    <p>Open the website, log in as Admin and tap <b>Custom requests</b> to upload the proof.</p>`), r.customer.email);
}

// Email 2: here is your proof, please approve.
export async function emailProof(r, origin) {
  const urls = proofUrls(r, origin);
  const p = await priceRequestSafe(r);
  const approve = `${origin}/api/approve?id=${r.id}&t=${r.token}`;
  const sent = await sendEmail({
    to: r.customer.email,
    subject: "Your design proof is ready to approve",
    html: layout(`Hi ${r.customer.name}, here's your proof`, `
      <p>Here's how your design will look. The watermark is only on the proof, not on your finished order.</p>
      ${urls.map((u) => `<p><img src="${u}" alt="Design proof" style="width:100%;max-width:520px;border:1px solid #ddd;border-radius:6px;"></p>`).join("")}
      ${briefHtml(r)}
      ${p ? `<p style="font-size:16px;"><b>Total: ${money(p.total)}</b> (${esc(p.postageLabel)}${p.postage ? " " + money(p.postage) : ""})</p>` : ""}
      <p style="margin:22px 0;"><a href="${approve}" style="background:#17231d;color:#efe7d8;padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">I approve this design</a></p>
      <p>Once you approve, we'll email you a secure payment link. We only send your order to print when it's fully paid.</p>
      <p>Want something changed? Just reply to this email and tell us what.</p>
      <p>Your reference: <b>${r.id}</b></p>`),
  });
  await sendToShop(`Proof sent for ${r.id}`, layout("Proof sent to customer", `
    <p>${esc(r.customer.name)} &lt;${esc(r.customer.email)}&gt; ${esc(r.customer.phone || "")}</p>
    ${urls.map((u) => `<p><img src="${u}" alt="" style="width:100%;max-width:520px;"></p>`).join("")}
    ${briefHtml(r)}${r.uploadId ? `<p>Customer's original image: <a href="${origin}/api/upload/${r.uploadId}">download</a></p>` : ""}`), r.customer.email);
  return sent;
}

// Email 3: approved, here is the payment link.
export const payLinkFor = (r, origin) => `${origin}/api/approve?id=${r.id}&t=${r.token}&pay=1`;

export async function emailPayLink(r, payUrl) {
  const p = await priceRequestSafe(r);
  await sendEmail({
    to: r.customer.email,
    subject: "Thanks for approving: here's your payment link",
    html: layout("Thanks for approving your design", `
      <p>Here's your secure payment link${p ? ` for <b>${money(p.total)}</b>` : ""}:</p>
      <p style="margin:22px 0;"><a href="${payUrl}" style="background:#17231d;color:#efe7d8;padding:13px 22px;border-radius:6px;text-decoration:none;font-weight:bold;">Pay now</a></p>
      <p>As soon as your payment has cleared, your order goes to print. Your reference: <b>${r.id}</b></p>`),
  });
  await sendToShop(`Customer approved ${r.id}`, layout("Design approved", `<p>${esc(r.customer.name)} approved their proof and has been sent the payment link. You'll see it as PAID in Admin > Custom requests once they've paid.</p>`));
}

async function priceRequestSafe(r) {
  try {
    const { shopStore } = await import("./shop.mjs");
    return await priceRequest(shopStore(), r);
  } catch {
    return null;
  }
}

// Makes the Stripe payment page for an approved request.
export async function createPayment(store, r, origin) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw Object.assign(new Error("Payments are not switched on yet."), { userFacing: true });
  const p = await priceRequest(store, r);
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("locale", "en-GB");
  f.set("customer_email", r.customer.email);
  f.set("success_url", `${origin}/?paid=1&custom=${r.id}`);
  f.set("cancel_url", `${origin}/api/approve?id=${r.id}&t=${r.token}`);
  f.set("phone_number_collection[enabled]", "true");
  f.set("metadata[request_id]", r.id);
  if (r.uploadId) f.set("metadata[artwork]", `${origin}/api/upload/${r.uploadId}`);
  if (r.delivery?.collect) {
    f.set("shipping_options[0][shipping_rate_data][display_name]", `Free collection${shopSettings().town ? " (" + shopSettings().town + ")" : ""}`);
  } else {
    f.set("shipping_address_collection[allowed_countries][0]", "GB");
    f.set("shipping_options[0][shipping_rate_data][display_name]", p.postageLabel);
  }
  f.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(p.postage));
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "gbp");
  p.lines.forEach((l, i) => {
    f.set(`line_items[${i}][quantity]`, "1");
    f.set(`line_items[${i}][price_data][currency]`, "gbp");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(l.pence));
    f.set(`line_items[${i}][price_data][product_data][name]`, `${l.name} (ref ${r.id})`.slice(0, 240));
    if (l.description) f.set(`line_items[${i}][price_data][product_data][description]`, l.description.slice(0, 900));
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: f,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    console.error("Stripe error", JSON.stringify(data.error || data));
    throw Object.assign(new Error("Could not make the payment link. Please try again."), { userFacing: true });
  }
  return { url: data.url, sessionId: data.id };
}

// Asks Stripe whether an approved request has been paid. Updates the request if so.
export async function refreshPaid(store, r) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || r.status !== "approved" || !r.sessionId) return r;
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(r.sessionId)}`, {
      headers: { authorization: `Bearer ${key}` },
    });
    const s = await res.json();
    if (res.ok && s.payment_status === "paid") {
      r.status = "paid";
      r.paidAt = new Date().toISOString();
      note(r, `Paid ${money(s.amount_total || 0)}`);
      await saveRequest(store, r);
    } else if (res.ok && s.status === "expired") {
      // Stripe links expire after 24 hours: make a fresh one next time the customer approves
      r.payUrl = ""; r.sessionId = "";
      await saveRequest(store, r);
    }
  } catch {}
  return r;
}
