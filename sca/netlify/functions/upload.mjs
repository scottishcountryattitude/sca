import { shopStore, json, parseImageDataUrl, rateLimit } from "../lib/shop.mjs";
import { randomBytes } from "node:crypto";

// Customer artwork is resized in the browser before it is sent here.
// This endpoint accepts common browser/mobile image encodings and checks the
// decoded bytes again before storing them.
export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const store = shopStore();
  if (!(await rateLimit(store, context.ip || "unknown", "upload", 20))) return json({ error: "Too many uploads. Please try again later." }, 429);
  let body; try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const img = parseImageDataUrl(body.dataUrl, 5 * 1024 * 1024);
  if (!img) return json({ error: "We couldn't read that photo. Please try a JPEG, PNG, WebP or HEIC image, or choose another photo." }, 400);
  const id = randomBytes(16).toString("hex");
  await store.set(`upload/${id}`, img.bytes, { metadata: { type: img.type } });
  return json({ id });
};
export const config = { path: "/api/upload" };
