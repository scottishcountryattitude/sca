import { shopStore, getCatalog, getPrices, getGiftSets, getReviews, json, shopSettings, OCCASIONS } from "../lib/shop.mjs";

export default async () => {
  const store = shopStore();
  const [catalogs, prices, giftSets, reviews] = await Promise.all([getCatalog(store), getPrices(store), getGiftSets(store), getReviews(store)]);
  const st = shopSettings();
  const settings = { town: st.town, collectionMiles: st.collectionMiles, collectionOn: st.collectionOn, email: st.email, complaintsEmail: st.complaintsEmail, whatsapp: st.whatsapp };
  return json({ catalogs, prices, giftSets, reviews: reviews.slice(0, 200), settings, occasions: OCCASIONS });
};
export const config = { path: "/api/catalog" };
