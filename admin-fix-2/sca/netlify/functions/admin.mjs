import { shopStore, getCatalog, getPrices, getReviews, DEFAULT_PRICES, json, cleanText, isAdmin, adminConfigured, parseImageDataUrl } from "../lib/shop.mjs";
import { randomBytes } from "node:crypto";

const COLLECTIONS = ["quotes", "born", "pets"];

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!adminConfigured())
    return json({ error: "The server has no admin password yet. In Netlify, save ADMIN_PASSWORD under Environment variables, then deploy the site again." }, 503);
  if (!isAdmin(req)) { await new Promise((r) => setTimeout(r, 800)); return json({ error: "Wrong password" }, 401); }
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const store = shopStore();

  if (b.action === "check") return json({ ok: true });

  if (b.action === "add-design") {
    if (!COLLECTIONS.includes(b.collection)) return json({ error: "Bad collection" }, 400);
    const name = cleanText(b.name, 80), price = Number(b.price);
    const img = parseImageDataUrl(b.dataUrl, 3 * 1024 * 1024);
    if (!name || !(price >= 0.5 && price <= 500) || !img) return json({ error: "Check the name, price (£0.50–£500) and image." }, 400);
    const id = b.collection[0] + Date.now() + randomBytes(2).toString("hex");
    await store.set(`img/${id}`, img.bytes, { metadata: { type: img.type } });
    const catalog = await getCatalog(store);
    catalog[b.collection].push({ id, name, price: Math.round(price * 100) / 100, img: `/api/img/${id}` });
    await store.setJSON("catalog", catalog);
    return json({ ok: true });
  }

  if (b.action === "delete-design") {
    if (!COLLECTIONS.includes(b.collection)) return json({ error: "Bad collection" }, 400);
    const catalog = await getCatalog(store);
    catalog[b.collection] = catalog[b.collection].filter((p) => p.id !== b.id);
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

  if (b.action === "delete-review") {
    const reviews = (await getReviews(store)).filter((r) => r.id !== b.id);
    await store.setJSON("reviews", reviews);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
};
export const config = { path: "/api/admin" };
