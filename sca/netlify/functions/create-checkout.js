const CATALOGUE = {
  tshirt: { name: "T-shirt", price: 2000 },
  hoodie: { name: "Hoodie", price: 3500 },
  tote: { name: "Tote bag", price: 1500 },
};
const SIZES = ["S", "M", "L", "XL"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  try {
    const { items } = JSON.parse(event.body || "{}");
    if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
      throw new Error("Invalid cart");
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${process.env.SITE_URL}/thanks.html`);
    params.append("cancel_url", process.env.SITE_URL);
    params.append("shipping_address_collection[allowed_countries][0]", "GB");

    items.forEach((item, i) => {
      const product = CATALOGUE[item.id];
      const qty = Number(item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new Error("Invalid item");
      }
      if (item.size && !SIZES.includes(item.size)) throw new Error("Invalid size");
      const name = item.size ? `${product.name} (${item.size})` : product.name;

      params.append(`line_items[${i}][quantity]`, String(qty));
      params.append(`line_items[${i}][price_data][currency]`, "gbp");
      params.append(`line_items[${i}][price_data][unit_amount]`, String(product.price));
      params.append(`line_items[${i}][price_data][product_data][name]`, name);
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await res.json();
    if (!res.ok) throw new Error(session.error?.message || "Stripe error");

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
  }
};
