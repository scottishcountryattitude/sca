import { shopStore } from "../lib/shop.mjs";
import { getRequest, saveRequest, tokenOk, note, priceRequest, proofUrls, createPayment, emailPayLink, payLinkFor, refreshPaid, itemText } from "../lib/requests.mjs";
import { esc } from "../lib/email.mjs";

// The page a customer reaches from the "I approve this design" button in their email.
// Approving needs a button press on this page (not just opening the link), so email
// link-checkers can't approve by accident.
const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}: Scottish Country Attitude</title>
<meta name="robots" content="noindex">
<style>body{margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#17231d}
.w{max-width:560px;margin:0 auto;padding:20px 14px}.h{background:#17231d;color:#efe7d8;padding:14px 18px;border-radius:6px 6px 0 0;font-weight:bold}
.c{background:#fff;padding:18px;border-radius:0 0 6px 6px;line-height:1.5}img{width:100%;border:1px solid #ddd;border-radius:6px;margin:8px 0}
button,.b{display:block;width:100%;box-sizing:border-box;text-align:center;background:#17231d;color:#efe7d8;border:0;border-radius:6px;padding:15px;font-size:16px;font-weight:bold;margin-top:14px;text-decoration:none;cursor:pointer}
.s{font-size:13px;color:#666}</style></head><body><div class="w"><div class="h">Scottish Country Attitude</div><div class="c">
<h2 style="margin-top:0">${esc(title)}</h2>${body}</div></div></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });

const money = (p) => "£" + (p / 100).toFixed(2);

async function goToPayment(store, r, origin) {
  r = await refreshPaid(store, r);
  if (r.status === "paid" || r.status === "printed") return page("Already paid", "<p>Thank you, this order is already paid. It's with us for printing.</p>");
  if (r.payUrl && r.sessionId) return Response.redirect(r.payUrl, 303);
  const { url, sessionId } = await createPayment(store, r, origin);
  r.payUrl = url; r.sessionId = sessionId;
  await saveRequest(store, r);
  return Response.redirect(url, 303);
}

export default async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const store = shopStore();
  let id = url.searchParams.get("id"), t = url.searchParams.get("t");
  let form = null;
  if (req.method === "POST") {
    form = await req.formData().catch(() => null);
    id = form?.get("id"); t = form?.get("t");
  }
  const r = await getRequest(store, id);
  if (!r || !tokenOk(r, t)) return page("Link not recognised", "<p>Sorry, this link isn't valid. Please use the button in your email, or reply to the email and we'll help.</p>");
  if (r.status === "cancelled") return page("Request closed", "<p>This request has been closed. Reply to your email if you'd like to start it again.</p>");
  if (r.status === "needs-design") return page("Proof not ready yet", "<p>We're still making your proof. We'll email it to you as soon as it's ready.</p>");

  try {
    if (url.searchParams.get("pay") === "1" && req.method === "GET") {
      if (r.status === "awaiting-approval") return Response.redirect(`${origin}/api/approve?id=${r.id}&t=${r.token}`, 303);
      return await goToPayment(store, r, origin);
    }

    if (req.method === "POST" && form?.get("approve") === "yes") {
      if (r.status === "awaiting-approval") {
        r.status = "approved";
        r.approvedAt = new Date().toISOString();
        note(r, "Customer approved the proof");
        await saveRequest(store, r);
        await emailPayLink(r, payLinkFor(r, origin));
      }
      return await goToPayment(store, r, origin);
    }
  } catch (e) {
    return page("Something went wrong", `<p>${esc(e.userFacing ? e.message : "Please try again in a minute.")}</p>`);
  }

  // GET: show the proof and the approve button
  const p = await priceRequest(store, r).catch(() => null);
  const imgs = proofUrls(r, origin).map((u) => `<img src="${u}" alt="Your design proof">`).join("");
  const items = r.items.map((it) => `<li>${esc(itemText(it))}</li>`).join("");
  if (r.status !== "awaiting-approval") {
    return page("You've approved this design", `${imgs}<p>Thanks, you've already approved it.</p>
      <a class="b" href="${payLinkFor(r, origin)}">Go to payment</a>`);
  }
  return page(`Your proof, ${r.customer.name}`, `<p>Please check your design carefully. The watermark is only on the proof.</p>${imgs}
    <ul>${items}</ul>
    ${p ? `<p><b>Total ${money(p.total)}</b> <span class="s">(${esc(p.postageLabel)}${p.postage ? " " + money(p.postage) : ""})</span></p>` : ""}
    <form method="post" action="/api/approve">
      <input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="t" value="${esc(r.token)}">
      <input type="hidden" name="approve" value="yes">
      <button type="submit">I approve: take me to payment</button>
    </form>
    <p class="s">We also email you the payment link. Your order is only printed once it's fully paid.
    Want a change? Reply to the proof email and tell us what.</p>`);
};
export const config = { path: "/api/approve" };
