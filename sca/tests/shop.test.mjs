import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { priceLine, postageFor, DEFAULT_PRICES, DEFAULT_CATALOG, GIFT_SETS, GIFT_DESIGNS } from "../netlify/lib/shop.mjs";

const ctx = { prices: DEFAULT_PRICES, catalog: DEFAULT_CATALOG };
const L = (s) => priceLine(s, ctx);

test("gift set list matches the website", () => {
  const src = fs.readFileSync("public/app.js", "utf8");
  const block = /const giftSets = (\[[\s\S]*?\n\]);/.exec(src)[1];
  const site = eval(block);
  assert.deepEqual(site.map(g => ({ name: g.name, pieces: g.pieces })), GIFT_SETS);
  for (const d of GIFT_DESIGNS) assert.ok(src.includes(d), "design option missing on site: " + d);
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
  assert.throws(() => L({ k: "gift", setIdx: 99, design: GIFT_DESIGNS[0], pieces: {} }));
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
  const g = L({ k: "gift", setIdx: 4, design: GIFT_DESIGNS[0], pieces: { mug: { size: "Standard (11oz)" }, hoodie: { style: "plain", size: "Large", color: "Grey" } } });
  assert.equal(g.pence, 1000 + 2000); assert.ok(g.hoodie); assert.equal(g.pieces, 2);
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
