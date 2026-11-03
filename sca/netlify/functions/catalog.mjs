import { shopStore, getCatalog, getPrices, getReviews, json } from "../lib/shop.mjs";

export default async () => {
  const store = shopStore();
  const [catalogs, prices, reviews] = await Promise.all([getCatalog(store), getPrices(store), getReviews(store)]);
  return json({ catalogs, prices, reviews: reviews.slice(0, 200) });
};
export const config = { path: "/api/catalog" };
