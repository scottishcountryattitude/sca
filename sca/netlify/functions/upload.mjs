import { shopStore, json, parseImageDataUrl, rateLimit } from "../lib/shop.mjs";
import { randomBytes } from "node:crypto";

// Customers' own artwork for custom bags / Design Your Own. Saved so you can print it.
export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const store = shopStore();
  if (!(await rateLimit(store, context.ip || "unknown", "upload", 20))) return json({ error: "Too many uploads. Please try again later." }, 429);
  let body; try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const img = parseImageDataUrl(body.dataUrl, 5 * 1024 * 1024);
  if (!img) return json({ error: "That image could not be used. Please try a PNG or JPG under 5MB." }, 400);
  const id = randomBytes(16).toString("hex");
  await store.set(`upload/${id}`, img.bytes, { metadata: { type: img.type } });
  return json({ id });
};
export const config = { path: "/api/upload" };
