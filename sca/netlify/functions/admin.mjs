import { shopStore, getCatalog, getPrices, getReviews, normalizeGiftSets, DEFAULT_PRICES, json, cleanText, isAdmin, adminConfigured, parseImageDataUrl, COLLECTIONS, shopSettings } from "../lib/shop.mjs";
import { listRequests, getRequest, saveRequest, refreshPaid, note, emailProof, priceRequest, proofUrls, STATUS_LABEL, itemText } from "../lib/requests.mjs";
import { emailConfigured } from "../lib/email.mjs";
import { randomBytes } from "node:crypto";


export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!adminConfigured())
    return json({ error: "The server has no admin password yet. In Netlify, save ADMIN_PASSWORD under Environment variables, then deploy the site again." }, 503);
  if (!isAdmin(req)) { await new Promise((r) => setTimeout(r, 800)); return json({ error: "Wrong password" }, 401); }
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const store = shopStore();

  if (b.action === "check") return json({ ok: true, emailOn: emailConfigured(), settings: shopSettings() });
  const origin = new URL(req.url).origin;

  /* ---------- custom design requests ---------- */
  if (b.action === "list-requests") {
    const all = await listRequests(store);
    const out = [];
    for (let r of all.slice(0, 100)) {
      r = await refreshPaid(store, r);
      const p = await priceRequest(store, r).catch(() => null);
      out.push({
        id: r.id, created: r.created, status: r.status, statusLabel: STATUS_LABEL[r.status] || r.status, source: r.source,
        customer: r.customer, brief: r.brief, items: r.items.map(itemText), delivery: r.delivery,
        total: p ? p.total : null, proofs: proofUrls(r, origin),
        upload: r.uploadId ? `${origin}/api/upload/${r.uploadId}` : null, rawItems: r.items, history: r.history || [],
      });
    }
    return json({ ok: true, requests: out });
  }

  if (b.action === "send-proof") {
    const r = await getRequest(store, b.id);
    if (!r) return json({ error: "Request not found." }, 404);
    const proofs = Array.isArray(b.proofs) ? b.proofs.slice(0, 10) : [];
    if (!proofs.length) return json({ error: "Add at least one proof image." }, 400);
    for (let i = 0; i < r.proofs; i++) await store.delete(`proof/${r.id}-${i}`);
    r.proofs = 0;
    for (const d of proofs) {
      const img = parseImageDataUrl(d, 2 * 1024 * 1024);
      if (!img) continue;
      await store.set(`proof/${r.id}-${r.proofs}`, img.bytes, { metadata: { type: img.type } });
      r.proofs++;
    }
    if (!r.proofs) return json({ error: "Those images couldn't be read." }, 400);
    r.status = "awaiting-approval"; r.payUrl = ""; r.sessionId = "";
    await saveRequest(store, r);
    const sent = await emailProof(r, origin);
    note(r, sent ? "Proof emailed to customer" : "Proof saved, but NOT emailed (email not set up)");
    await saveRequest(store, r);
    return json({ ok: true, emailed: sent, approveLink: `${origin}/api/approve?id=${r.id}&t=${r.token}` });
  }

  if (b.action === "set-request-status") {
    const r = await getRequest(store, b.id);
    if (!r) return json({ error: "Request not found." }, 404);
    if (!["printed", "cancelled", "paid"].includes(b.status)) return json({ error: "Bad status" }, 400);
    r.status = b.status; note(r, "Admin marked as " + b.status);
    await saveRequest(store, r);
    return json({ ok: true });
  }

  if (b.action === "delete-request") {
    const r = await getRequest(store, b.id);
    if (!r) return json({ ok: true });
    for (let i = 0; i < (r.proofs || 0); i++) await store.delete(`proof/${r.id}-${i}`);
    await store.delete(`req/${r.id}`);
    return json({ ok: true });
  }

  /* ---------- contact messages ---------- */
  if (b.action === "list-messages") return json({ ok: true, messages: (await store.get("messages", { type: "json" })) || [] });
  if (b.action === "delete-message") {
    const list = ((await store.get("messages", { type: "json" })) || []).filter((m) => m.id !== b.id);
    await store.setJSON("messages", list);
    return json({ ok: true });
  }

  if (b.action === "add-design") {
    if (!COLLECTIONS.includes(b.collection)) return json({ error: "Bad collection" }, 400);
    const name = cleanText(b.name, 80), price = Number(b.price), desc = cleanText(b.desc, 300);
    const img = parseImageDataUrl(b.dataUrl, 3 * 1024 * 1024);
    if (!name || !(price >= 0.5 && price <= 500) || !img) return json({ error: "Check the name, price (£0.50–£500) and image." }, 400);
    const id = b.collection[0] + Date.now() + randomBytes(2).toString("hex");
    await store.set(`img/${id}`, img.bytes, { metadata: { type: img.type } });
    const catalog = await getCatalog(store);
    (catalog[b.collection] = catalog[b.collection] || []).push({ id, name, desc, price: Math.round(price * 100) / 100, img: `/api/img/${id}` });
    await store.setJSON("catalog", catalog);
    return json({ ok: true });
  }

  if (b.action === "edit-design") {
    if (!COLLECTIONS.includes(b.collection)) return json({ error: "Bad collection" }, 400);
    const catalog = await getCatalog(store);
    const item = (catalog[b.collection] || []).find((p) => p.id === b.id);
    if (!item) return json({ error: "That image was not found." }, 404);
    const name = cleanText(b.name, 80), price = Number(b.price);
    if (!name || !(price >= 0.5 && price <= 500)) return json({ error: "Check the name and price (£0.50–£500)." }, 400);
    item.name = name;
    item.price = Math.round(price * 100) / 100;
    item.desc = cleanText(b.desc, 300);
    await store.setJSON("catalog", catalog);
    return json({ ok: true });
  }

  if (b.action === "delete-design") {
    if (!COLLECTIONS.includes(b.collection)) return json({ error: "Bad collection" }, 400);
    const catalog = await getCatalog(store);
    catalog[b.collection] = (catalog[b.collection] || []).filter((p) => p.id !== b.id);
    await store.setJSON("catalog", catalog);
    if (/^[a-zA-Z0-9_-]{6,64}$/.test(String(b.id))) await store.delete(`img/${b.id}`);
    return json({ ok: true });
  }

  if (b.action === "set-prices") {
    const next = await getPrices(store);
    for (const k of Object.keys(DEFAULT_PRICES)) {
      const v = Number(b.prices?.[k]);
      if (b.prices && k in b.prices) {
        if (!(v >= 0.5 && v <= 1000)) return json({ error: `Price for ${k} must be between £0.50 and £1000.` }, 400);
        next[k] = Math.round(v * 100) / 100;
      }
    }
    await store.setJSON("prices", next);
    return json({ ok: true });
  }

  if (b.action === "set-giftsets") {
    let list;
    try { list = normalizeGiftSets(b.giftSets); }
    catch (e) { return json({ error: e.userFacing ? e.message : "Invalid gift set list." }, 400); }
    if (!list.length) return json({ error: "Keep at least one gift set (or use Reset to put the standard list back)." }, 400);
    await store.setJSON("giftsets", list);
    return json({ ok: true });
  }

  if (b.action === "reset-giftsets") {
    await store.delete("giftsets");
    return json({ ok: true });
  }

  if (b.action === "delete-review") {
    const reviews = (await getReviews(store)).filter((r) => r.id !== b.id);
    await store.setJSON("reviews", reviews);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
};
export const config = { path: "/api/admin" };
