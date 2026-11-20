import { shopStore } from "../lib/shop.mjs";

// Serves design images (/api/img/<id>) and customers' uploaded artwork (/api/upload/<id>).
export default async (req) => {
  const [, , kind, id] = new URL(req.url).pathname.split("/");
  if (!/^[a-zA-Z0-9_-]{6,64}$/.test(id || "") || !["img", "upload"].includes(kind)) return new Response("Not found", { status: 404 });
  const hit = await shopStore().getWithMetadata(`${kind}/${id}`, { type: "arrayBuffer" });
  if (!hit) return new Response("Not found", { status: 404 });
  const headers = { "content-type": hit.metadata?.type || "image/jpeg" };
  if (kind === "upload") headers["x-robots-tag"] = "noindex"; // customers' own photos stay out of Google; shop designs can show in Google Images
  headers["cache-control"] = kind === "img" ? "public, max-age=31536000, immutable" : "private, max-age=3600";
  return new Response(hit.data, { headers });
};
export const config = { path: ["/api/img/*", "/api/upload/*"] };
