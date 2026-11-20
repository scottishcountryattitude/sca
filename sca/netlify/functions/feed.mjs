import { shopStore, getCatalog, getPrices, POSTAGE } from "../lib/shop.mjs";
import { feedXml } from "../lib/seo.mjs";

// /merchant-feed.xml: product list for Google Merchant Center (free listings in Google Shopping).
// Builds itself from the shop, so new designs and price changes appear automatically.
export default async () => {
  const store = shopStore();
  const [catalog, prices] = await Promise.all([getCatalog(store), getPrices(store)]);
  return new Response(feedXml(catalog, prices, POSTAGE), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
export const config = { path: "/merchant-feed.xml" };
