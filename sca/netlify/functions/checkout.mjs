import { shopStore, getCatalog, getPrices, priceLine, postageFor, json } from "../lib/shop.mjs";

// Receives what is in the basket, works out the prices itself, and creates a Stripe Checkout page.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: "Checkout is not switched on yet." }, 503);

  let body; try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > 30) return json({ error: "Your basket is empty or too large." }, 400);

  const store = shopStore();
  const [prices, catalog] = await Promise.all([getPrices(store), getCatalog(store)]);
  const origin = new URL(req.url).origin;

  let lines;
  try {
    lines = items.map((spec) => priceLine(spec, { prices, catalog }));
  } catch (e) {
    return json({ error: e.userFacing ? e.message : "Something in your basket could not be checked." }, 400);
  }
  const { postage, label } = postageFor(lines);

  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("locale", "en-GB");
  f.set("success_url", `${origin}/?paid=1`);
  f.set("cancel_url", `${origin}/?cancelled=1`);
  f.set("shipping_address_collection[allowed_countries][0]", "GB");
  f.set("phone_number_collection[enabled]", "true");
  f.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(postage));
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "gbp");
  f.set("shipping_options[0][shipping_rate_data][display_name]", label);

  const uploads = [];
  lines.forEach((l, i) => {
    let desc = l.description;
    if (l.uploadId && /^[a-f0-9]{32}$/.test(String(l.uploadId))) {
      const url = `${origin}/api/upload/${l.uploadId}`;
      uploads.push(url);
      desc += (desc ? " | " : "") + `Customer artwork: ${url}`;
    }
    f.set(`line_items[${i}][quantity]`, "1");
    f.set(`line_items[${i}][price_data][currency]`, "gbp");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(l.pence));
    f.set(`line_items[${i}][price_data][product_data][name]`, l.name.slice(0, 240));
    if (desc) f.set(`line_items[${i}][price_data][product_data][description]`, desc.slice(0, 900));
  });
  if (uploads.length) f.set("metadata[artwork]", uploads.join(" ").slice(0, 490));

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
    body: f,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    console.error("Stripe error", JSON.stringify(data.error || data));
    return json({ error: "Could not start the payment page. Please try again." }, 502);
  }
  return json({ url: data.url });
};
export const config = { path: "/api/checkout" };
