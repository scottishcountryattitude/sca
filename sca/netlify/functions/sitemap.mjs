import { shopStore, getCatalog } from "../lib/shop.mjs";
import { sitemapXml } from "../lib/seo.mjs";

// /sitemap.xml: every page plus the design images on it, so Google can find them. Builds itself from the shop.
export default async () => {
  const xml = sitemapXml(await getCatalog(shopStore()));
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
};
export const config = { path: "/sitemap.xml" };
