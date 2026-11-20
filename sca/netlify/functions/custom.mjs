import { shopStore, getPrices, json, cleanText, rateLimit, parseImageDataUrl, isEmail, checkCollection, customItemPrice, OCCASIONS, CUSTOM_PRODUCTS, cleanPostcode } from "../lib/shop.mjs";
import { newId, newToken, saveRequest, note, emailReceived, emailProof } from "../lib/requests.mjs";
import { emailConfigured } from "../lib/email.mjs";

// A customer sends a custom design request from "Design Your Own" (or the Military page).
// With their own image: we save the watermarked proofs made in their browser and email them to approve.
// Without an image: we save the brief and email the shop to make the proof.
export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const store = shopStore();
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (b.website) return json({ ok: true, id: "q0" }); // spam trap
  if (!(await rateLimit(store, context.ip || "unknown", "custom", 10))) return json({ error: "Too many requests from this connection. Please try again later." }, 429);

  const name = cleanText(b.customer?.name, 60), email = String(b.customer?.email || "").trim().slice(0, 200);
  const phone = cleanText(b.customer?.phone, 30);
  if (!name) return json({ error: "Please add your name." }, 400);
  if (!isEmail(email)) return json({ error: "Please add a valid email address, so we can send your proof." }, 400);

  // Words for the design keep apostrophes and quote marks; they are made safe wherever they are shown.
  const words = (v, max) => String(v ?? "").replace(/[<>\\`\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const brief = {
    description: words(b.brief?.description, 1500),
    style: words(b.brief?.style, 200),
    colours: words(b.brief?.colours, 200),
    kind: cleanText(b.brief?.kind, 40),
    quoteText: words(b.brief?.quoteText, 300),
    occasion: OCCASIONS.includes(b.brief?.occasion) ? b.brief.occasion : "",
  };
  const uploadId = /^[a-f0-9]{32}$/.test(String(b.uploadId || "")) ? String(b.uploadId) : null;
  if (!uploadId && brief.description.length < 5 && !brief.quoteText) return json({ error: "Please describe what you'd like, or upload an image." }, 400);

  const items = Array.isArray(b.items) ? b.items.slice(0, 10) : [];
  if (!items.length) return json({ error: "Please add at least one item (T-shirt, hoodie, cap, mug or bag)." }, 400);
  const prices = await getPrices(store);
  const clean = [];
  try {
    for (const it of items) {
      const c = { product: String(it?.product || ""), size: String(it?.size || ""), color: String(it?.color || "") };
      if (!CUSTOM_PRODUCTS[c.product]) throw Object.assign(new Error("Invalid item."), { userFacing: true });
      if (c.product === "cap" || c.product === "bag") c.size = "";
      if (c.product === "mug" || c.product === "bag") c.color = "";
      customItemPrice(c, prices); // checks size and colour
      clean.push(c);
    }
  } catch (e) { return json({ error: e.userFacing ? e.message : "Please check your items." }, 400); }

  const delivery = { collect: !!b.delivery?.collect, postcode: cleanPostcode(b.delivery?.postcode) };
  if (delivery.collect) {
    try { await checkCollection(delivery.postcode); }
    catch (e) { return json({ error: e.userFacing ? e.message : "Collection could not be checked." }, 400); }
  }

  const r = {
    id: newId(), token: newToken(), created: Date.now(),
    source: b.source === "military" ? "military" : "studio",
    customer: { name, email, phone }, brief, items: clean, uploadId, delivery,
    proofs: 0, status: "needs-design", history: [],
  };

  // Proof images made in the customer's browser (only when they uploaded their own image).
  if (uploadId && Array.isArray(b.proofs)) {
    const proofs = b.proofs.slice(0, clean.length);
    for (let i = 0; i < proofs.length; i++) {
      const img = parseImageDataUrl(proofs[i], 2 * 1024 * 1024);
      if (!img) continue;
      await store.set(`proof/${r.id}-${r.proofs}`, img.bytes, { metadata: { type: img.type } });
      r.proofs++;
    }
  }

  const origin = new URL(req.url).origin;
  note(r, "Request received");
  if (r.proofs) {
    r.status = "awaiting-approval";
    await saveRequest(store, r);
    const sent = await emailProof(r, origin);
    note(r, sent ? "Proof emailed to customer" : "Proof NOT emailed (email not set up)");
  } else {
    await saveRequest(store, r);
    await emailReceived(r, origin);
  }
  await saveRequest(store, r);
  return json({ ok: true, id: r.id, status: r.status, emailOn: emailConfigured() });
};
export const config = { path: "/api/custom" };
