// Shared shop logic: storage helpers, price table, postage rules and basket pricing.
// Everything that decides what a customer pays lives here, on the server.
import { getStore } from "@netlify/blobs";
import { timingSafeEqual, randomBytes } from "node:crypto";

/* ================= EDIT THESE ================= */
export const POSTAGE = {
  standardPence: 495,   // mugs, caps, T-shirts, bags (small orders)
  bulkyPence: 695,      // any hoodie, or 3+ items in the order
  freeFromPence: 8000,  // order total of £80.00 or more gets free postage
};
export const DEFAULT_PRICES = {
  mugSmall: 10.0, mugLarge: 15.0, cap: 24.99,
  teePlain: 10.0, teeImaged: 15.0, hoodiePlain: 20.0, hoodieImaged: 35.0,
};
export const BAG_BASE_PRICE = 15.99;
export const BAG_CUSTOM_CHARGE = 3.0;
export const STUDIO_OTHER_PRICE = 24.99; // custom bag / cowboy hat in Design Your Own
/* ============================================== */

export const DEFAULT_CATALOG = {
  quotes: [],
  born: [{ id: "b5", name: "Ride Here Bag", price: 15.99, color: "var(--moss)" }],
  pets: [
    { id: "p1", name: "Sassy Scottie", price: 18.99, color: "var(--heather)" },
    { id: "p2", name: "Highland Coo Pup", price: 18.99, color: "var(--moss)" },
  ],
};

export const MUG_SIZES = ["Standard (11oz)", "Large (15oz)"];
export const CLOTHING_SIZES = ["Small", "Medium", "Large", "X-Large", "2X-Large"];
export const COLOURS = ["White", "Grey", "Navy", "Black"];
/* ---------- gift sets ----------
   A gift set is a list of pieces (2 to 5 of: mug, bag, cap, tee, hoodie), all in one design from one page.
   The list below is the standard list; the owner can change it from Admin > "Edit gift sets"
   and the changed list is saved on the server. Names are always built from the pieces. */
export const GIFT_COLLECTIONS = ["quotes", "born", "pets"];
export const GIFT_PIECES = ["mug", "bag", "cap", "tee", "hoodie"]; // this is also the order names are written in
const GIFT_NAME_LABEL = { mug: "Mug", bag: "Bag", cap: "Cap", tee: "T-shirt", hoodie: "Hoodie" };
export function giftSetName(pieces) {
  const names = GIFT_PIECES.filter((p) => pieces.includes(p)).map((p) => GIFT_NAME_LABEL[p]);
  return names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + " + " + names[names.length - 1];
}
// Must match defaultGiftSets in public/app.js (tests/shop.test.mjs checks this).
export const DEFAULT_GIFT_SETS = [
  { id: "2-1", pieces: ["mug", "cap"] },
  { id: "2-2", pieces: ["mug", "bag"] },
  { id: "2-3", pieces: ["mug", "tee"] },
  { id: "2-4", pieces: ["mug", "hoodie"] },
  { id: "2-5", pieces: ["bag", "tee"] },
  { id: "2-6", pieces: ["bag", "cap"] },
  { id: "2-7", pieces: ["bag", "hoodie"] },
  { id: "2-8", pieces: ["cap", "tee"] },
  { id: "2-9", pieces: ["cap", "hoodie"] },
  { id: "3-1", pieces: ["mug", "bag", "tee"] },
  { id: "3-2", pieces: ["mug", "bag", "cap"] },
  { id: "3-3", pieces: ["mug", "bag", "hoodie"] },
  { id: "3-4", pieces: ["bag", "cap", "tee"] },
  { id: "3-5", pieces: ["bag", "cap", "hoodie"] },
  { id: "4-1", pieces: ["mug", "bag", "cap", "hoodie"] },
  { id: "4-2", pieces: ["mug", "bag", "cap", "tee"] },
  { id: "5-1", pieces: ["mug", "bag", "cap", "tee", "hoodie"] },
];
const LABEL = { mug: "Mug", cap: "Cap", tee: "T-Shirt", hoodie: "Hoodie" };

/* ---------- storage ---------- */
export const shopStore = () => getStore({ name: "shop", consistency: "strong" });

export async function getCatalog(store = shopStore()) {
  const c = await store.get("catalog", { type: "json" });
  return c || structuredClone(DEFAULT_CATALOG);
}
export async function getPrices(store = shopStore()) {
  const p = await store.get("prices", { type: "json" });
  return { ...DEFAULT_PRICES, ...(p || {}) };
}
export async function getGiftSets(store = shopStore()) {
  const g = await store.get("giftsets", { type: "json" });
  return Array.isArray(g) && g.length ? g : structuredClone(DEFAULT_GIFT_SETS);
}
export async function getReviews(store = shopStore()) {
  return (await store.get("reviews", { type: "json" })) || [];
}

/* ---------- small helpers ---------- */
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
export const toPence = (n) => Math.round(Number(n) * 100);
export const cleanText = (s, max) =>
  String(s ?? "").replace(/[<>"'`\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export async function rateLimit(store, ip, bucket, limit) {
  const key = `rl/${bucket}/${String(ip).replace(/[^a-zA-Z0-9.:_-]/g, "_")}-${Math.floor(Date.now() / 3600000)}`;
  const n = Number((await store.get(key)) || 0);
  if (n >= limit) return false;
  await store.set(key, String(n + 1));
  return true;
}

export function parseImageDataUrl(dataUrl, maxBytes) {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > maxBytes) return null;
  return { type: m[1], bytes };
}

// Stray spaces at either end (easy to add when pasting on a phone) are ignored. Capitals still matter.
export function adminConfigured() {
  return String(process.env.ADMIN_PASSWORD || "").trim().length > 0;
}
export function isAdmin(req) {
  const given = Buffer.from(String(req.headers.get("x-admin-key") || "").trim());
  const real = Buffer.from(String(process.env.ADMIN_PASSWORD || "").trim());
  if (!real.length || given.length !== real.length) return false;
  return timingSafeEqual(given, real);
}

/* ---------- pricing ---------- */
const bad = (msg) => { const e = new Error(msg); e.userFacing = true; return e; };

// Checks a gift set list sent by the admin page and returns a clean one.
// Each set needs 2 to 5 different pieces; the same combination can only appear once.
export function normalizeGiftSets(input) {
  if (!Array.isArray(input) || input.length > 60) throw bad("Invalid gift set list.");
  const seenIds = new Set(), seenCombos = new Set(), out = [];
  for (const g of input) {
    const pieces = GIFT_PIECES.filter((p) => Array.isArray(g?.pieces) && g.pieces.includes(p));
    if (!Array.isArray(g?.pieces) || g.pieces.some((p) => !GIFT_PIECES.includes(p)) || new Set(g.pieces).size !== g.pieces.length)
      throw bad("Each gift set can only use a mug, bag, cap, T-shirt or hoodie, each once.");
    if (pieces.length < 2 || pieces.length > 5) throw bad("Each gift set needs 2 to 5 pieces.");
    const combo = pieces.join("+");
    if (seenCombos.has(combo)) throw bad(`${giftSetName(pieces)} is in the list twice.`);
    seenCombos.add(combo);
    let id = /^[a-z0-9-]{1,24}$/.test(String(g.id || "")) ? String(g.id) : "";
    while (!id || seenIds.has(id)) id = "x" + randomBytes(4).toString("hex");
    seenIds.add(id);
    out.push({ id, pieces });
  }
  return out;
}

function clothingPrice(type, style, prices) {
  if (type === "cap") return prices.cap;
  if (!["plain", "imaged"].includes(style)) throw bad("Please choose a style for every T-shirt and hoodie.");
  return prices[type + (style === "plain" ? "Plain" : "Imaged")];
}
function checkSize(type, size) {
  if (type === "mug" && !MUG_SIZES.includes(size)) throw bad("Invalid mug size.");
  if ((type === "tee" || type === "hoodie") && !CLOTHING_SIZES.includes(size)) throw bad("Invalid size.");
}
function checkColour(type, colour) {
  if (["cap", "tee", "hoodie"].includes(type) && !COLOURS.includes(colour)) throw bad("Invalid colour.");
}
function findDesign(catalog, id) {
  for (const k of ["quotes", "born", "pets"]) {
    const d = catalog[k].find((p) => p.id === id);
    if (d) return d;
  }
  return null;
}

// Turns one basket line from the browser into a trusted line: the browser only says WHAT
// was chosen; the price is always worked out here.
export function priceLine(spec, { prices, catalog, giftSets = DEFAULT_GIFT_SETS }) {
  if (!spec || typeof spec !== "object") throw bad("Invalid basket item.");
  const mugPrice = (size) => (size === MUG_SIZES[0] ? prices.mugSmall : prices.mugLarge);

  if (spec.k === "item") {
    const type = spec.type;
    if (!LABEL[type]) throw bad("Invalid item.");
    const design = findDesign(catalog, String(spec.designId));
    if (!design) throw bad("Sorry, one of the designs in your basket is no longer available.");
    checkSize(type, spec.size); checkColour(type, spec.color);
    const price = type === "mug" ? mugPrice(spec.size) : clothingPrice(type, spec.style, prices);
    const style = type === "tee" || type === "hoodie" ? (spec.style === "plain" ? "Plain" : "Imaged") : "";
    const logo = spec.style === "plain" && spec.logo && (type === "tee" || type === "hoodie");
    const detail = [style && style + (logo ? " + company logo" : ""), spec.size, spec.color].filter(Boolean).join(", ");
    return { pence: toPence(price), name: `${design.name} — ${LABEL[type]}`, description: detail, hoodie: type === "hoodie", pieces: 1 };
  }

  if (spec.k === "bag") {
    const design = (catalog.pets || []).find((p) => p.id === String(spec.designId));
    if (!design) throw bad("Sorry, one of the bag designs in your basket is no longer available.");
    return { pence: toPence(design.price), name: `${design.name} Bag`, description: "", hoodie: false, pieces: 1 };
  }

  const needUpload = () => { if (!/^[a-f0-9]{32}$/.test(String(spec.uploadId || ""))) throw bad("Please upload your image again."); };

  if (spec.k === "bagcustom") {
    needUpload();
    return { pence: toPence(BAG_BASE_PRICE + BAG_CUSTOM_CHARGE), name: "Custom Image Bag", description: "Customer's own image", hoodie: false, pieces: 1, uploadId: spec.uploadId };
  }

  if (spec.k === "studio") {
    const p = spec.product;
    const names = { tee: "Custom T-shirt", cap: "Custom Cap", cowboy: "Custom Cowboy Hat", hoodie: "Custom Hoodie", bag: "Custom Bag", mug: "Custom Mug" };
    if (!names[p]) throw bad("Invalid custom item.");
    needUpload();
    let price, size = "";
    if (p === "mug") { checkSize("mug", spec.size); price = mugPrice(spec.size); size = spec.size; }
    else if (p === "cap") price = prices.cap;
    else if (p === "tee" || p === "hoodie") { checkSize(p, spec.size); price = prices[p + "Imaged"]; size = spec.size; }
    else price = STUDIO_OTHER_PRICE;
    const logo = spec.logo && (p === "tee" || p === "hoodie");
    return { pence: toPence(price), name: names[p] + (logo ? " + company logo" : ""), description: size ? `Size: ${size}` : "", hoodie: p === "hoodie", pieces: 1, uploadId: spec.uploadId };
  }

  if (spec.k === "gift") {
    const set = giftSets.find((g) => g.id === String(spec.setId));
    if (!set) throw bad("Sorry, that gift set is no longer available. Please choose it again.");
    if (!GIFT_COLLECTIONS.includes(spec.collection)) throw bad("Invalid gift set page.");
    const design = (catalog[spec.collection] || []).find((p) => p.id === String(spec.designId));
    if (!design) throw bad("Sorry, the design for that gift set is no longer available.");
    let total = 0; const parts = [];
    for (const piece of set.pieces) {
      const st = (spec.pieces && spec.pieces[piece]) || {};
      if (piece === "mug") { checkSize("mug", st.size); total += mugPrice(st.size); parts.push(`Mug (${st.size})`); }
      else if (piece === "bag") { total += BAG_BASE_PRICE; parts.push("Bag"); }
      else if (piece === "cap") { checkColour("cap", st.color); total += prices.cap; parts.push(`Cap (${st.color})`); }
      else {
        checkSize(piece, st.size); checkColour(piece, st.color);
        total += clothingPrice(piece, st.style, prices);
        const style = st.style === "plain" ? "Plain" + (st.logo ? " + logo" : "") : "Imaged";
        parts.push(`${LABEL[piece]} (${style}, ${st.size}, ${st.color})`);
      }
    }
    return { pence: toPence(total), name: `${giftSetName(set.pieces)} gift set (${design.name})`, description: parts.join(", "), hoodie: set.pieces.includes("hoodie"), pieces: set.pieces.length };
  }

  throw bad("Invalid basket item.");
}

export function postageFor(lines) {
  const subtotal = lines.reduce((s, l) => s + l.pence, 0);
  const items = lines.reduce((s, l) => s + l.pieces, 0);
  const bulky = lines.some((l) => l.hoodie) || items >= 3;
  if (subtotal >= POSTAGE.freeFromPence) return { subtotal, postage: 0, label: "Free postage" };
  return { subtotal, postage: bulky ? POSTAGE.bulkyPence : POSTAGE.standardPence, label: "Postage & packaging (UK)" };
}
