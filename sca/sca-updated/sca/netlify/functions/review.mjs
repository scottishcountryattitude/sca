import { shopStore, getReviews, json, cleanText, rateLimit } from "../lib/shop.mjs";
import { randomBytes } from "node:crypto";

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const store = shopStore();
  let b; try { b = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  if (b.website) return json({ ok: true }); // hidden spam-trap field: bots fill it in, people don't
  if (!(await rateLimit(store, context.ip || "unknown", "review", 5))) return json({ error: "Too many reviews from this connection. Please try later." }, 429);
  const name = cleanText(b.name, 60), product = cleanText(b.product, 60), text = cleanText(b.text, 800);
  const exp = Number(b.exp), prod = Number(b.prod);
  if (!name || !product || text.length < 5 || ![1, 2, 3, 4, 5].includes(exp) || ![1, 2, 3, 4, 5].includes(prod))
    return json({ error: "Please fill in every part of the review." }, 400);
  const reviews = await getReviews(store);
  reviews.unshift({ id: "r" + Date.now() + randomBytes(3).toString("hex"), name, product, exp, prod, text, date: new Date().toISOString() });
  await store.setJSON("reviews", reviews.slice(0, 500));
  return json({ ok: true });
};
export const config = { path: "/api/review" };
