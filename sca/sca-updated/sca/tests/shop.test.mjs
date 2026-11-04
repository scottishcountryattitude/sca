import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { priceLine, postageFor, DEFAULT_PRICES, DEFAULT_CATALOG, DEFAULT_GIFT_SETS, giftSetName, normalizeGiftSets } from "../netlify/lib/shop.mjs";

const ctx = { prices: DEFAULT_PRICES, catalog: DEFAULT_CATALOG };
const L = (s, extra = {}) => priceLine(s, { ...ctx, ...extra });

test("gift set list matches the website", () => {
  const src = fs.readFileSync("public/app.js", "utf8");
  const block = /const defaultGiftSets = (\[[\s\S]*?\n\]);/.exec(src)[1];
  const site = eval(block);
  assert.deepEqual(site, DEFAULT_GIFT_SETS);
});

test("standard gift sets: 9 + 5 + 2 + 1, each combination once", () => {
  const by = (n) => DEFAULT_GIFT_SETS.filter((g) => g.pieces.length === n).length;
  assert.deepEqual([by(2), by(3), by(4), by(5)], [9, 5, 2, 1]);
  const combos = DEFAULT_GIFT_SETS.map((g) => [...g.pieces].sort().join("+"));
  assert.equal(new Set(combos).size, combos.length);
  assert.equal(new Set(DEFAULT_GIFT_SETS.map((g) => g.id)).size, DEFAULT_GIFT_SETS.length);
});

test("gift set names are built from the pieces", () => {
  assert.equal(giftSetName(["cap", "mug"]), "Mug + Cap");
  assert.equal(giftSetName(["tee", "bag", "mug"]), "Mug, Bag + T-shirt");
  assert.equal(giftSetName(["mug", "bag", "cap", "tee", "hoodie"]), "Mug, Bag, Cap, T-shirt + Hoodie");
});

test("the owner's gift set list is checked", () => {
  const ok = normalizeGiftSets([{ id: "2-1", pieces: ["cap", "mug"] }, { pieces: ["bag", "tee", "hoodie"] }]);
  assert.deepEqual(ok[0], { id: "2-1", pieces: ["mug", "cap"] });
  assert.match(ok[1].id, /^[a-z0-9-]+$/);
  assert.notEqual(ok[0].id, ok[1].id);
  assert.throws(() => normalizeGiftSets([{ pieces: ["mug"] }]));                                   // too few
  assert.throws(() => normalizeGiftSets([{ pieces: ["mug", "mug"] }]));                            // same piece twice
  assert.throws(() => normalizeGiftSets([{ pieces: ["mug", "poster"] }]));                         // unknown piece
  assert.throws(() => normalizeGiftSets([{ pieces: ["mug", "cap"] }, { pieces: ["cap", "mug"] }])); // same combination twice
  assert.throws(() => normalizeGiftSets("nope"));
});

test("item prices come from the server table", () => {
  assert.equal(L({ k: "item", type: "mug", designId: "p1", size: "Large (15oz)" }).pence, 1500);
  assert.equal(L({ k: "item", type: "cap", designId: "p1", color: "Navy" }).pence, 2499);
  assert.equal(L({ k: "item", type: "tee", designId: "p1", style: "plain", size: "Large", color: "White", logo: true }).pence, 1000);
  assert.equal(L({ k: "item", type: "hoodie", designId: "p1", style: "imaged", size: "Small", color: "Black" }).pence, 3500);
});
test("tampering is rejected", () => {
  assert.throws(() => L({ k: "item", type: "mug", designId: "nope", size: "Large (15oz)" }));
  assert.throws(() => L({ k: "item", type: "hoodie", designId: "p1", style: "imaged", size: "Huge", color: "Black" }));
  assert.throws(() => L({ k: "item", type: "tee", designId: "p1", style: "free", size: "Large", color: "Black" }));
  assert.throws(() => L({ k: "gift", setId: "nope", collection: "pets", designId: "p1", pieces: {} }));
  assert.throws(() => L({ k: "gift", setId: "2-2", collection: "born", designId: "p1", pieces: { mug: { size: "Large (15oz)" } } })); // p1 is a pets design
  assert.throws(() => L({ k: "gift", setId: "2-2", collection: "elsewhere", designId: "p1", pieces: { mug: { size: "Large (15oz)" } } }));
  assert.throws(() => L({ k: "whatever", price: 0.01 }));
  assert.throws(() => L({ k: "bagcustom" }));                       // custom items need an uploaded image
  assert.throws(() => L({ k: "studio", product: "tee", size: "Small" }));
  // a price sent by the browser is ignored
  assert.equal(L({ k: "item", type: "mug", designId: "p1", size: "Standard (11oz)", price: 0.01 }).pence, 1000);
});
test("bags, studio and gift sets", () => {
  assert.equal(L({ k: "bag", designId: "p1" }).pence, 1899);
  assert.equal(L({ k: "bagcustom", uploadId: "a".repeat(32) }).pence, 1899);
  assert.equal(L({ k: "studio", product: "hoodie", size: "Medium", logo: true, uploadId: "b".repeat(32) }).pence, 3500);
  assert.equal(L({ k: "studio", product: "cowboy", uploadId: "c".repeat(32) }).pence, 2499);
  const g = L({ k: "gift", setId: "2-4", collection: "pets", designId: "p1", pieces: { mug: { size: "Standard (11oz)" }, hoodie: { style: "plain", size: "Large", color: "Grey" } } });
  assert.equal(g.pence, 1000 + 2000); assert.ok(g.hoodie); assert.equal(g.pieces, 2);
  assert.equal(g.name, "Mug + Hoodie gift set (Sassy Scottie)");
});
test("gift sets with a bag, and the full set", () => {
  const mugBag = L({ k: "gift", setId: "2-2", collection: "pets", designId: "p2", pieces: { mug: { size: "Large (15oz)" }, bag: {} } });
  assert.equal(mugBag.pence, 1500 + 1599); assert.ok(!mugBag.hoodie); assert.match(mugBag.description, /Bag/);
  const full = L({ k: "gift", setId: "5-1", collection: "pets", designId: "p1", pieces: {
    mug: { size: "Standard (11oz)" }, bag: {}, cap: { color: "Navy" },
    tee: { style: "imaged", size: "Medium", color: "White" }, hoodie: { style: "imaged", size: "Medium", color: "Black" } } });
  assert.equal(full.pence, 1000 + 1599 + 2499 + 1500 + 3500); assert.equal(full.pieces, 5); assert.ok(full.hoodie);
  assert.throws(() => L({ k: "gift", setId: "2-2", collection: "pets", designId: "p1", pieces: { bag: {} } })); // mug size missing
  // a price sent by the browser is ignored
  assert.equal(L({ k: "gift", setId: "2-2", collection: "pets", designId: "p1", price: 0.01, pieces: { mug: { size: "Standard (11oz)" }, bag: {} } }).pence, 1000 + 1599);
});
test("a gift set the owner has removed cannot be bought", () => {
  const custom = normalizeGiftSets([{ id: "only-one", pieces: ["mug", "bag"] }]);
  assert.equal(L({ k: "gift", setId: "only-one", collection: "pets", designId: "p1", pieces: { mug: { size: "Standard (11oz)" } } }, { giftSets: custom }).pence, 1000 + 1599);
  assert.throws(() => L({ k: "gift", setId: "2-1", collection: "pets", designId: "p1", pieces: { mug: { size: "Standard (11oz)" }, cap: { color: "Navy" } } }, { giftSets: custom }));
});
test("postage rules", () => {
  const mug = L({ k: "item", type: "mug", designId: "p1", size: "Standard (11oz)" });
  const hoodie = L({ k: "item", type: "hoodie", designId: "p1", style: "imaged", size: "Small", color: "Black" });
  assert.equal(postageFor([mug]).postage, 495);
  assert.equal(postageFor([mug, mug]).postage, 495);
  assert.equal(postageFor([mug, mug, mug]).postage, 695);        // 3+ items
  assert.equal(postageFor([hoodie]).postage, 695);               // any hoodie
  assert.equal(postageFor([hoodie, hoodie, hoodie]).postage, 0); // £105 -> free
  assert.equal(postageFor([{ pence: 7999, pieces: 1 }]).postage, 495);
  assert.equal(postageFor([{ pence: 8000, pieces: 1 }]).postage, 0);
});
