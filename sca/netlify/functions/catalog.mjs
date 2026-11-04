import { shopStore, getCatalog, getPrices, getGiftSets, getReviews, json } from "../lib/shop.mjs";

export default async () => {
  const store = shopStore();
  const [catalogs, prices, giftSets, reviews] = await Promise.all([getCatalog(store), getPrices(store), getGiftSets(store), getReviews(store)]);
  return json({ catalogs, prices, giftSets, reviews: reviews.slice(0, 200) });
};
export const config = { path: "/api/catalog" };
