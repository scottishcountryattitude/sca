import { shopStore } from "../lib/shop.mjs";
import { getRequest, tokenOk } from "../lib/requests.mjs";

// Serves a watermarked proof image: /api/proof/<requestId>-<n>?t=<token>
export default async (req) => {
  const url = new URL(req.url);
  const m = /^\/api\/proof\/(q[a-z0-9]{6,20})-(\d{1,2})$/.exec(url.pathname);
  if (!m) return new Response("Not found", { status: 404 });
  const store = shopStore();
  const r = await getRequest(store, m[1]);
  if (!r || !tokenOk(r, url.searchParams.get("t"))) return new Response("Not found", { status: 404 });
  const hit = await store.getWithMetadata(`proof/${m[1]}-${m[2]}`, { type: "arrayBuffer" });
  if (!hit) return new Response("Not found", { status: 404 });
  return new Response(hit.data, { headers: { "content-type": hit.metadata?.type || "image/jpeg", "cache-control": "private, max-age=86400", "x-robots-tag": "noindex" } });
};
export const config = { path: "/api/proof/*" };
