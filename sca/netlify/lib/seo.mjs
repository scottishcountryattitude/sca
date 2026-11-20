// Google set-up: one web address per page, page titles/descriptions, and what goes in the
// sitemap and the Google Merchant Center product feed.
// Must match PAGE_ROUTES in public/app.js and the [[redirects]] in netlify.toml (tests check this).
import { getPrices } from "./shop.mjs";

export const SITE = "https://scottishcountryattitude.co.uk";
export const BRAND = "Scottish Country Attitude";

export const PAGE_ROUTES = [
  { page: "home", path: "/" },
  { page: "quotes", path: "/country-quotes", collection: "quotes" },
  { page: "borncollection", path: "/born-here-live-here-ride-here", collection: "born" },
  { page: "pets", path: "/scottish-pets", collection: "pets" },
  { page: "dailyquotes", path: "/sarcastic-quotes", collection: "daily" },
  { page: "military", path: "/military", collection: "military" },
  { page: "studio", path: "/design-your-own" },
  { page: "reviews", path: "/reviews" },
  { page: "contact", path: "/contact" },
];

const COLLECTION_LABEL = {
  quotes: "Country Quotes", born: "Born Here Live Here Ride Here", pets: "Scottish Pets Wae Country Attitude",
  daily: "Sarcastic Quotes", military: "Military",
};

export const esc = (s) => String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
const abs = (u) => (/^https?:/.test(u) ? u : SITE + u);
export const designLink = (route, id) => `${SITE}${route.path}?design=${encodeURIComponent(id)}`;

export function sitemapXml(catalog, today = new Date().toISOString().slice(0, 10)) {
  const urls = PAGE_ROUTES.map((r) => {
    const imgs = r.collection ? (catalog[r.collection] || []).filter((d) => d.img) : [];
    return `  <url>\n    <loc>${SITE}${r.path}</loc>\n    <lastmod>${today}</lastmod>\n` +
      imgs.map((d) => `    <image:image><image:loc>${esc(abs(d.img))}</image:loc></image:image>\n`).join("") +
      `  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
}

// Each design is listed as a T-shirt, hoodie, mug and cap, each with its real price.
const FEED_PRODUCTS = [
  { key: "tee", label: "T-shirt", price: (p) => p.teeImaged, cat: "212", type: "Apparel & Accessories > Clothing > Shirts & Tops", bulky: false },
  { key: "hoodie", label: "Hoodie", price: (p) => p.hoodieImaged, cat: "5598", type: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets", bulky: true },
  { key: "mug", label: "Mug (11oz)", price: (p) => p.mugSmall, cat: "2169", type: "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs", bulky: false },
  { key: "cap", label: "Cap", price: (p) => p.cap, cat: "173", type: "Apparel & Accessories > Clothing Accessories > Hats", bulky: false },
];

export function feedXml(catalog, prices, postage) {
  const items = [];
  for (const r of PAGE_ROUTES) {
    if (!r.collection) continue;
    for (const d of catalog[r.collection] || []) {
      if (!d.img) continue;
      for (const fp of FEED_PRODUCTS) {
        const price = Number(fp.price(prices));
        if (!(price > 0)) continue;
        const ship = (fp.bulky ? postage.bulkyPence : postage.standardPence) / 100;
        const desc = (d.desc ? d.desc + " " : "") +
          `${d.name} printed on a ${fp.label.toLowerCase()}. From the ${COLLECTION_LABEL[r.collection]} range by ${BRAND}, made to order in Scotland.`;
        items.push(`  <item>
    <g:id>${esc(d.id + "-" + fp.key)}</g:id>
    <g:item_group_id>${esc(d.id)}</g:item_group_id>
    <title>${esc(`${d.name} ${fp.label}`.slice(0, 150))}</title>
    <description>${esc(desc.slice(0, 5000))}</description>
    <link>${esc(designLink(r, d.id))}</link>
    <g:image_link>${esc(abs(d.img))}</g:image_link>
    <g:price>${price.toFixed(2)} GBP</g:price>
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:brand>${esc(BRAND)}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:google_product_category>${fp.cat}</g:google_product_category>
    <g:product_type>${esc(COLLECTION_LABEL[r.collection] + " > " + fp.label)}</g:product_type>
    <g:shipping><g:country>GB</g:country><g:service>Standard</g:service><g:price>${ship.toFixed(2)} GBP</g:price></g:shipping>
  </item>`);
      }
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n  <title>${esc(BRAND)}</title>\n  <link>${SITE}/</link>\n  <description>${esc(BRAND)} designs on T-shirts, hoodies, mugs and caps</description>\n${items.join("\n")}\n</channel>\n</rss>\n`;
}
export { getPrices };
