/* ---------------- product data ---------------- */
const defaultProducts = {
  quotes: [
  ],
  born: [
    {id:'b5', name:'Ride Here Bag', price:15.99, color:'var(--moss)'},
  ],
  pets: [
    {id:'p1', name:'Sassy Scottie', price:18.99, color:'var(--heather)'},
    {id:'p2', name:'Highland Coo Pup', price:18.99, color:'var(--moss)'},
  ],
  daily: [],
  military: [],
  ufo: [],
};
const COLLECTION_KEYS = ['quotes','born','pets','daily','military','ufo'];
const catalogs = {};
COLLECTION_KEYS.forEach(key=>{ catalogs[key] = defaultProducts[key].slice(); });
let shopSettings = {town:'', collectionMiles:10, collectionOn:false, email:'scottishcountryattitude@outlook.com', complaintsEmail:'scottishcountryattitude@gmail.com', whatsapp:''};
let OCCASIONS = ['Just for me','Gift','Hen do','Stag do','Night out with the girls','Night out with the boys','Christmas party','Office party','Birthday','Wedding','Military / regiment','Club or team','Other'];

/* item types available once a design image is clicked, and the sizes each one takes */
/* base sizes per item type (fixed) */
const productTypes = {
  mug:    {label:'Mug',      sizes:['Standard (11oz)','Large (15oz)']},
  cap:    {label:'Cap',      colors:true},
  tee:    {label:'T-Shirt',  sizes:['Small','Medium','Large','X-Large','2X-Large'], colors:true},
  hoodie: {label:'Hoodie',   sizes:['Small','Medium','Large','X-Large','2X-Large'], colors:true},
  hat:    {label:'Hat',      sizes:['Small','Large']},
};

/* colour choices for T-shirts, Hoodies and Caps */
const productColors = ['White','Grey','Navy','Black'];

/* fixed mug prices */
const mugPrices = {'Standard (11oz)': 10.00, 'Large (15oz)': 15.00};

/* base price for a bag on the Pets page; uploading your own image adds a flat £3 charge */
const BAG_BASE_PRICE = 15.99;
const BAG_CUSTOM_CHARGE = 3.00;

/* fixed prices per item — editable any time via the "Edit item prices" button,
   saved to this browser so the choice sticks for next time */
const defaultPrices = {mugSmall:10.00, mugLarge:15.00, cap:24.99, teePlain:10.00, teeImaged:15.00, hoodiePlain:20.00, hoodieImaged:35.00};
let prices = Object.assign({}, defaultPrices);
mugPrices['Standard (11oz)'] = prices.mugSmall;
mugPrices['Large (15oz)'] = prices.mugLarge;

function openPricePanel(){
  document.getElementById('priceMugSmall').value = prices.mugSmall;
  document.getElementById('priceMugLarge').value = prices.mugLarge;
  document.getElementById('priceCap').value = prices.cap;
  document.getElementById('priceTeePlain').value = prices.teePlain;
  document.getElementById('priceTeeImaged').value = prices.teeImaged;
  document.getElementById('priceHoodiePlain').value = prices.hoodiePlain;
  document.getElementById('priceHoodieImaged').value = prices.hoodieImaged;
  document.getElementById('priceModal').classList.add('open');
}
function closePricePanel(){
  document.getElementById('priceModal').classList.remove('open');
}
async function savePricePanel(){
  const ids = {mugSmall:'priceMugSmall', mugLarge:'priceMugLarge', cap:'priceCap', teePlain:'priceTeePlain', teeImaged:'priceTeeImaged', hoodiePlain:'priceHoodiePlain', hoodieImaged:'priceHoodieImaged'};
  const out = {};
  Object.keys(ids).forEach(key=>{
    const v = parseFloat(document.getElementById(ids[key]).value);
    if(!isNaN(v)) out[key] = v;
  });
  try{
    await adminCall({action:'set-prices', prices: out});
    closePricePanel();
    await loadShop();
  }catch(e){ alert(e.message || 'Prices could not be saved.'); }
}

/* alt text read by Google and screen readers: the design name, plus its description if there is one */
function designAlt(p){ return p.desc ? p.name + ' – ' + p.desc : p.name; }
function productCard(p, collectionKey){
  const safeId = p.id.replace(/'/g,'');
  const safeName = p.name.replace(/'/g,'');
  const safeImg = (p.img||'').replace(/'/g,'');
  const delBtn = collectionKey
    ? `<button class="del-btn" title="Remove this image" onclick="event.stopPropagation();deleteDesign('${collectionKey}','${safeId}','${safeName}')">&times;</button>
       <button class="del-btn edit-btn" title="Edit name, price and description" onclick="event.stopPropagation();editDesign('${collectionKey}','${safeId}')">✎</button>`
    : '';
  const swatch = p.img
    ? `<div class="swatch img design" style="cursor:zoom-in;" onclick="openLightbox('${collectionKey||''}','${safeId}')"><img class="design-img" src="${escHtml(p.img)}" alt="${escHtml(designAlt(p))}" loading="lazy" decoding="async">${delBtn}<span class="tag">Tap to see it bigger</span></div>`
    : `<div class="swatch" style="background:${p.color};cursor:pointer;" onclick="onImageClick('${safeId}')">${delBtn}<span class="mark">${p.name}</span><span class="tag">Tap to order</span></div>`;
  return `<div class="card">
    ${swatch}
    <div class="card-body">
      <h3>${escHtml(p.name)}</h3>
      ${p.desc ? `<p class="card-desc">${escHtml(p.desc)}</p>` : ''}
      <span class="price">from £${p.price.toFixed(2)}</span>
      <button class="add-btn order-btn" onclick="onImageClick('${safeId}')">Order this design</button>
      <div class="order-flow" id="flow-${safeId}" data-base="${p.price}" data-name="${safeName}" data-img="${safeImg}"></div>
    </div>
  </div>`;
}

async function deleteDesign(collectionKey, id, name){
  if(!confirm('Remove "' + name + '" from this page? This cannot be undone.')) return;
  try{
    await adminCall({action:'delete-design', collection: collectionKey, id});
    await loadShop();
  }catch(e){ alert(e.message || 'Could not remove that design.'); }
}

function onImageClick(id){
  const flow = document.getElementById('flow-'+id);
  flow.innerHTML = `
    <label style="display:block;font-size:0.78rem;font-weight:600;margin:8px 0 4px;">Choose item</label>
    <select onchange="onTypeChosen('${id}', this.value)">
      <option value="">Select…</option>
      <option value="mug">Mug — from £${prices.mugSmall.toFixed(2)}</option>
      <option value="cap">Cap — £${prices.cap.toFixed(2)}</option>
      <option value="tee">T-Shirt — plain £${prices.teePlain.toFixed(2)} / imaged £${prices.teeImaged.toFixed(2)}</option>
      <option value="hoodie">Hoodie — plain £${prices.hoodiePlain.toFixed(2)} / imaged £${prices.hoodieImaged.toFixed(2)}</option>
    </select>`;
}

function onTypeChosen(id, type){
  const flow = document.getElementById('flow-'+id);
  if(!type){ onImageClick(id); return; }
  flow.dataset.type = type;
  delete flow.dataset.size; delete flow.dataset.color; delete flow.dataset.style; delete flow.dataset.logo;
  const t = productTypes[type];
  if(type === 'cap'){
    /* Cap: fixed price — no size step, straight to colour */
    const colorOpts = productColors.map(c=>`<option>${c}</option>`).join('');
    flow.innerHTML = `
      <div style="font-size:0.82rem;font-weight:600;margin-top:2px;">${t.label} — £${prices.cap.toFixed(2)}</div>
      <label style="display:block;font-size:0.78rem;font-weight:600;margin:6px 0 4px;">Choose colour</label>
      <select onchange="onColorChosen('${id}', this.value)">
        <option value="">Select…</option>
        ${colorOpts}
      </select>`;
    return;
  }
  if(type === 'mug'){
    const opts = t.sizes.map(s=>`<option>${s} — £${mugPrices[s].toFixed(2)}</option>`).join('');
    flow.innerHTML = `
      <div style="font-size:0.82rem;font-weight:600;margin-top:2px;">${t.label} selected</div>
      <label style="display:block;font-size:0.78rem;font-weight:600;margin:6px 0 4px;">Choose size</label>
      <select onchange="onSizeChosen('${id}', this.value.split(' — £')[0])">
        <option value="">Select…</option>
        ${opts}
      </select>`;
    return;
  }
  /* T-Shirt / Hoodie: choose plain or imaged (with this design) first */
  const plainP = prices[type+'Plain'], imagedP = prices[type+'Imaged'];
  flow.innerHTML = `
    <div style="font-size:0.82rem;font-weight:600;margin-top:2px;">${t.label} selected</div>
    <label style="display:block;font-size:0.78rem;font-weight:600;margin:6px 0 4px;">Choose style</label>
    <select onchange="onStyleChosen('${id}', this.value)">
      <option value="">Select…</option>
      <option value="imaged">Imaged (with this design) — £${imagedP.toFixed(2)}</option>
      <option value="plain">Plain (no print) — £${plainP.toFixed(2)}</option>
    </select>`;
}

function onStyleChosen(id, style){
  const flow = document.getElementById('flow-'+id);
  if(!style) return;
  flow.dataset.style = style;
  const type = flow.dataset.type;
  const t = productTypes[type];
  const opts = t.sizes.map(s=>`<option>${s}</option>`).join('');
  flow.innerHTML += `
    <div style="font-size:0.82rem;font-weight:600;margin-top:6px;">${style==='plain'?'Plain':'Imaged'} selected</div>
    <label style="display:block;font-size:0.78rem;font-weight:600;margin:6px 0 4px;">Choose size</label>
    <select onchange="onSizeChosen('${id}', this.value)">
      <option value="">Select…</option>
      ${opts}
    </select>`;
}

function onSizeChosen(id, size){
  const flow = document.getElementById('flow-'+id);
  if(!size) return;
  const type = flow.dataset.type;
  const t = productTypes[type];
  flow.dataset.size = size;
  if(type === 'mug'){
    const price = mugPrices[size];
    flow.dataset.price = price;
    flow.innerHTML += `
      <div style="font-size:0.82rem;margin-top:6px;">${t.label}, ${size} — £${price.toFixed(2)}</div>
      <button class="add-btn" style="width:100%;padding:10px;margin-top:8px;" onclick="buyItNow('${id}')">Add to cart</button>`;
    return;
  }
  /* T-Shirt / Hoodie: size chosen, now choose colour */
  const colorOpts = productColors.map(c=>`<option>${c}</option>`).join('');
  flow.innerHTML += `
    <div style="font-size:0.82rem;font-weight:600;margin-top:6px;">${size} selected</div>
    <label style="display:block;font-size:0.78rem;font-weight:600;margin:6px 0 4px;">Choose colour</label>
    <select onchange="onColorChosen('${id}', this.value)">
      <option value="">Select…</option>
      ${colorOpts}
    </select>`;
}

function onColorChosen(id, color){
  const flow = document.getElementById('flow-'+id);
  if(!color) return;
  const type = flow.dataset.type;
  const t = productTypes[type];
  flow.dataset.color = color;
  const price = type === 'cap' ? prices.cap : prices[type + (flow.dataset.style==='plain' ? 'Plain' : 'Imaged')];
  flow.dataset.price = price;
  const sizeBit = flow.dataset.size ? flow.dataset.size + ', ' : '';
  const styleBit = flow.dataset.style ? (flow.dataset.style==='plain'?'Plain, ':'Imaged, ') : '';
  const logoField = (type==='tee'||type==='hoodie') && flow.dataset.style==='plain'
    ? `<label style="display:block;font-size:0.76rem;margin-top:6px;"><input type="checkbox" onchange="flow_logoToggle('${id}', this.checked)"> Add our company logo</label>`
    : '';
  flow.innerHTML += `
    <div style="font-size:0.82rem;margin-top:6px;">${t.label}, ${styleBit}${sizeBit}${color} — £${price.toFixed(2)}</div>
    ${logoField}
    <button class="add-btn" style="width:100%;padding:10px;margin-top:8px;" onclick="buyItNow('${id}')">Add to cart</button>`;
}

function flow_logoToggle(id, checked){
  document.getElementById('flow-'+id).dataset.logo = checked ? '1' : '';
}

function buyItNow(id){
  const flow = document.getElementById('flow-'+id);
  const type = flow.dataset.type;
  const t = productTypes[type];
  const styleLabel = flow.dataset.style ? (flow.dataset.style==='plain'?'Plain':'Imaged') : '';
  const logoLabel = flow.dataset.logo ? ' + company logo' : '';
  const name = flow.dataset.name + ' — ' + t.label + (styleLabel?' ('+styleLabel+logoLabel+')':'');
  const price = parseFloat(flow.dataset.price);
  const size = flow.dataset.size;
  const color = flow.dataset.color;
  const img = flow.dataset.img;
  const sizeLabel = [size, color].filter(Boolean).join(', ');
  addToCart(id+'-'+Date.now(), name, price, sizeLabel, {k:'item', type, designId:id, style:flow.dataset.style||'', size:size||'', color:color||'', logo:!!flow.dataset.logo});
  flow.innerHTML = '<div style="font-size:0.78rem;color:var(--rust);font-weight:600;">Added to basket ✓</div>';
  showOrderPreview(img, flow.dataset.name, t.label, sizeLabel, price);
}

function showOrderPreview(img, name, typeLabel, size, price){
  const body = document.getElementById('previewBody');
  const imgHtml = img
    ? `<div style="width:100%;aspect-ratio:1/1;background-size:cover;background-position:center;border-radius:6px;background-image:url('${img}');margin-bottom:12px;"></div>`
    : '';
  body.innerHTML = `
    ${imgHtml}
    <div style="font-weight:700;font-size:1rem;margin-bottom:4px;">${name}</div>
    <div style="font-size:0.9rem;color:rgba(23,35,29,0.7);">${typeLabel}, size ${size}</div>
    <div style="font-size:1.1rem;font-weight:700;margin-top:8px;">£${price.toFixed(2)}</div>
    <div style="font-size:0.82rem;color:var(--rust);font-weight:600;margin-top:10px;">Added to your basket ✓</div>`;
  document.getElementById('previewModal').classList.add('open');
}
function closeOrderPreview(){
  document.getElementById('previewModal').classList.remove('open');
  openCart();
}

function renderGrids(){
  const grid = (id, key, empty) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.innerHTML = catalogs[key].length ? catalogs[key].map(p=>productCard(p,key)).join('') : `<p class="empty-note">${empty}</p>`;
  };
  grid('quotesGrid','quotes','New designs coming soon.');
  grid('bornGrid','born','New designs coming soon.');
  grid('petsGrid','pets','New designs coming soon.');
  grid('dailyGrid','daily','New sarcastic quotes coming soon.');
  grid('militaryGrid','military','New military designs coming soon. Got your own photo or artwork? Upload it below.');
  grid('ufoGrid','ufo','New UFO designs coming soon.');
  renderPetsBag();
}

/* ---------------- lightbox: tap a design to see it bigger ---------------- */
function findDesignAnywhere(id){
  for(const k of COLLECTION_KEYS){ const d = (catalogs[k]||[]).find(p=>p.id===id); if(d) return d; }
  return null;
}
function openLightbox(key, id){
  const d = findDesignAnywhere(id);
  if(!d || !d.img) return;
  document.getElementById('lbImg').src = d.img;
  document.getElementById('lbImg').alt = designAlt(d);
  document.getElementById('lbName').textContent = d.name;
  document.getElementById('lbDesc').textContent = d.desc || '';
  document.getElementById('lbPrice').textContent = 'from £' + d.price.toFixed(2);
  const btn = document.getElementById('lbOrder');
  btn.style.display = '';
  btn.onclick = ()=>{ closeLightbox(); onImageClick(id); const f = document.getElementById('flow-'+id); if(f) f.scrollIntoView({behavior:'smooth', block:'center'}); };
  document.getElementById('lightbox').classList.add('open');
}
function openLightboxImage(src, name){
  document.getElementById('lbImg').src = src;
  document.getElementById('lbName').textContent = name || '';
  document.getElementById('lbDesc').textContent = '';
  document.getElementById('lbPrice').textContent = '';
  document.getElementById('lbOrder').style.display = 'none';
  document.getElementById('lightbox').classList.add('open');
}
function openLightboxCanvas(){
  const c = document.getElementById('mockCanvas');
  if(c) openLightboxImage(c.toDataURL('image/jpeg', 0.9), 'Your mock-up');
}
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }
document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeLightbox(); });

async function editDesign(key, id){
  const d = (catalogs[key]||[]).find(p=>p.id===id);
  if(!d) return;
  const name = prompt('Name of this design:', d.name);
  if(name === null) return;
  const price = prompt('Price (£):', d.price.toFixed(2));
  if(price === null) return;
  const desc = prompt('Description (shown under the design, optional):', d.desc || '');
  if(desc === null) return;
  try{
    await adminCall({action:'edit-design', collection:key, id, name, price: parseFloat(price), desc});
    await loadShop();
  }catch(e){ alert(e.message || 'Could not save those changes.'); }
}

/* ---------------- pets: bag card ---------------- */
let bagSelectedDesignId = null;
let bagCustomImage = null;

function renderPetsBag(){
  const container = document.getElementById('petsBagGrid');
  if(!container) return;
  const designOpts = catalogs.pets.map(p=>`<option value="${p.id}">${p.name.replace(/"/g,'&quot;')} — £${p.price.toFixed(2)}</option>`).join('');
  container.innerHTML = `
    <div class="card">
      <div class="swatch" style="background:var(--moss);">
        <span class="mark">Bag</span>
      </div>
      <div class="card-body">
        <h3>Tote Bag</h3>
        <span class="price">from £${BAG_BASE_PRICE.toFixed(2)}</span>
        <div id="bagFlow">
          <label style="display:block;font-size:0.78rem;font-weight:600;margin:8px 0 4px;">Choose a design</label>
          <select onchange="onBagDesignChosen(this.value)">
            <option value="">Select…</option>
            ${designOpts}
            <option value="__upload">Upload my own image (+£${BAG_CUSTOM_CHARGE.toFixed(2)})</option>
          </select>
        </div>
      </div>
    </div>`;
  bagSelectedDesignId = null;
  bagCustomImage = null;
}

function onBagDesignChosen(value){
  const flow = document.getElementById('bagFlow');
  if(!value) return;
  if(value === '__upload'){
    flow.innerHTML += `
      <div class="upload-drop" style="margin-top:10px;" onclick="document.getElementById('bagImageUpload').click()" id="bagDropText">
        Tap to choose your own image
      </div>
      <input type="file" id="bagImageUpload" accept="image/*" style="display:none" onchange="handleBagImageUpload(event)">`;
    return;
  }
  const design = catalogs.pets.find(p=>p.id===value);
  if(!design) return;
  bagSelectedDesignId = value;
  flow.innerHTML += `
    <div style="font-size:0.82rem;margin-top:8px;">${design.name} bag — £${design.price.toFixed(2)}</div>
    <button class="add-btn" style="width:100%;padding:10px;margin-top:8px;" onclick="confirmBagDesignAdd()">Add to cart</button>`;
}

function handleBagImageUpload(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    bagCustomImage = e.target.result;
    const dropText = document.getElementById('bagDropText');
    if(dropText) dropText.textContent = file.name + ' — tap to change';
    let result = document.getElementById('bagUploadResult');
    const price = BAG_BASE_PRICE + BAG_CUSTOM_CHARGE;
    const html = `
      <div style="font-size:0.82rem;margin-top:8px;">Custom image bag — £${price.toFixed(2)} <span style="color:rgba(23,35,29,0.55);">(includes +£${BAG_CUSTOM_CHARGE.toFixed(2)} custom image charge)</span></div>
      <button class="add-btn" style="width:100%;padding:10px;margin-top:8px;" onclick="confirmBagCustomAdd()">Add to cart</button>`;
    if(result){
      result.innerHTML = html;
    } else {
      result = document.createElement('div');
      result.id = 'bagUploadResult';
      result.innerHTML = html;
      document.getElementById('bagFlow').appendChild(result);
    }
  };
  reader.readAsDataURL(file);
  evt.target.value = '';
}

function confirmBagDesignAdd(){
  const design = catalogs.pets.find(p=>p.id===bagSelectedDesignId);
  if(!design) return;
  addToCart('bag-'+design.id+'-'+Date.now(), design.name+' Bag', design.price, '', {k:'bag', designId:design.id});
  document.getElementById('bagFlow').innerHTML = '<div style="font-size:0.78rem;color:var(--rust);font-weight:600;">Added to basket ✓</div>';
  showOrderPreview(design.img, design.name+' Bag', 'Bag', '', design.price);
}

function confirmBagCustomAdd(){
  if(!bagCustomImage) return;
  const price = BAG_BASE_PRICE + BAG_CUSTOM_CHARGE;
  addToCart('bag-custom-'+Date.now(), 'Custom Image Bag', price, '', {k:'bagcustom'}, bagCustomImage);
  document.getElementById('bagFlow').innerHTML = '<div style="font-size:0.78rem;color:var(--rust);font-weight:600;">Added to basket ✓</div>';
  showOrderPreview(bagCustomImage, 'Custom Image Bag', 'Bag', '', price);
}

function addDesign(collectionKey, evt){
  const file = evt.target.files[0];
  if(!file) return;
  const name = prompt('Name this design:', 'New Design') || 'New Design';
  const priceStr = prompt('Price for this item (£):', '19.99') || '19.99';
  const price = parseFloat(priceStr) || 19.99;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      const maxW = 700;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';   /* white background, so see-through images don't turn black */
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      adminCall({action:'add-design', collection: collectionKey, name, price, dataUrl})
        .then(()=>loadShop())
        .catch(err=>alert(err.message || 'Could not add that design.'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  evt.target.value = '';
}


/* ---------------- gift sets ----------------
   A "Gift sets" box sits on each of the three design pages. The customer picks how many pieces (2 to 5),
   then a combination, then one of THAT page's designs, then the size / colour for each piece.
   The standard list below must match the server (tests/shop.test.mjs checks it). The owner can change the
   list from Admin > "Edit gift sets"; the changed list comes from the server in applyShop(). */
const GIFT_PAGES = ['quotes','born','pets','daily','military','ufo'];
const GIFT_ORDER = ['mug','bag','cap','tee','hoodie'];
const giftPieceLabel = p => ({mug:'Mug', bag:'Bag', cap:'Cap', tee:'T-Shirt', hoodie:'Hoodie'})[p];
const giftNameLabel = p => ({mug:'Mug', bag:'Bag', cap:'Cap', tee:'T-shirt', hoodie:'Hoodie'})[p];
function giftSetName(pieces){
  const n = GIFT_ORDER.filter(p=>pieces.includes(p)).map(giftNameLabel);
  return n.length < 2 ? n.join('') : n.slice(0,-1).join(', ') + ' + ' + n[n.length-1];
}
const defaultGiftSets = [
  {id:'2-1', pieces:['mug','cap']},
  {id:'2-2', pieces:['mug','bag']},
  {id:'2-3', pieces:['mug','tee']},
  {id:'2-4', pieces:['mug','hoodie']},
  {id:'2-5', pieces:['bag','tee']},
  {id:'2-6', pieces:['bag','cap']},
  {id:'2-7', pieces:['bag','hoodie']},
  {id:'2-8', pieces:['cap','tee']},
  {id:'2-9', pieces:['cap','hoodie']},
  {id:'3-1', pieces:['mug','bag','tee']},
  {id:'3-2', pieces:['mug','bag','cap']},
  {id:'3-3', pieces:['mug','bag','hoodie']},
  {id:'3-4', pieces:['bag','cap','tee']},
  {id:'3-5', pieces:['bag','cap','hoodie']},
  {id:'4-1', pieces:['mug','bag','cap','hoodie']},
  {id:'4-2', pieces:['mug','bag','cap','tee']},
  {id:'5-1', pieces:['mug','bag','cap','tee','hoodie']},
];
let giftSets = defaultGiftSets.map(g=>({id:g.id, pieces:g.pieces.slice()}));
/* what each page's box is currently showing: {count, setId, design, pieces:{mug:{...}, ...}} */
const giftUI = {quotes:{}, born:{}, pets:{}, daily:{}, military:{}, ufo:{}};
const GIFT_COUNT_LABELS = {2:'2 item gift set', 3:'3 item gift set', 4:'4 item gift set', 5:'5 item gift set (full set)'};

function currentGiftSet(key){
  const ui = giftUI[key];
  return giftSets.find(g=>g.id===ui.setId) || null;
}
function giftPiecePrice(key, piece){
  const st = (giftUI[key].pieces && giftUI[key].pieces[piece]) || {};
  if(piece==='mug') return st.size ? mugPrices[st.size] : 0;
  if(piece==='bag') return BAG_BASE_PRICE;
  if(piece==='cap') return prices.cap;
  if(piece==='tee' || piece==='hoodie') return st.style ? prices[piece + (st.style==='plain'?'Plain':'Imaged')] : 0;
  return 0;
}
function giftSetTotal(key){
  const g = currentGiftSet(key);
  return g ? g.pieces.reduce((s,p)=>s+giftPiecePrice(key,p),0) : 0;
}
function giftPieceComplete(key, piece){
  const st = (giftUI[key].pieces && giftUI[key].pieces[piece]) || {};
  if(piece==='bag') return true;
  if(piece==='mug') return !!st.size;
  if(piece==='cap') return !!st.color;
  if(piece==='tee' || piece==='hoodie') return !!st.style && !!st.size && !!st.color;
  return false;
}
function giftChooseCount(key, value){
  giftUI[key] = {count: value ? Number(value) : 0, setId:'', design: giftUI[key].design || '', pieces:{}};
  renderGiftBox(key);
}
function giftChooseSet(key, id){
  const ui = giftUI[key];
  ui.setId = id; ui.pieces = {};
  renderGiftBox(key);
}
function giftChooseDesign(key, id){
  giftUI[key].design = id;
  renderGiftBox(key);
}
function giftSetField(key, piece, field, value){
  const ui = giftUI[key];
  if(!ui.pieces[piece]) ui.pieces[piece] = {};
  ui.pieces[piece][field] = value;
  renderGiftBox(key);
}
function renderGiftPieceFields(key, piece){
  const st = giftUI[key].pieces[piece] || (giftUI[key].pieces[piece] = {});
  let html = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line);"><strong style="font-size:0.8rem;">${giftPieceLabel(piece)}</strong>`;
  if(piece==='mug'){
    html += `<select onchange="giftSetField('${key}','mug','size',this.value)">
      <option value="">Choose size…</option>
      <option value="Standard (11oz)" ${st.size==='Standard (11oz)'?'selected':''}>Standard (11oz) — £${mugPrices['Standard (11oz)'].toFixed(2)}</option>
      <option value="Large (15oz)" ${st.size==='Large (15oz)'?'selected':''}>Large (15oz) — £${mugPrices['Large (15oz)'].toFixed(2)}</option>
    </select>`;
  } else if(piece==='bag'){
    html += `<span style="font-size:0.78rem;display:block;margin:6px 0 0;">£${BAG_BASE_PRICE.toFixed(2)}</span>`;
  } else if(piece==='cap'){
    const colorOpts = productColors.map(c=>`<option ${st.color===c?'selected':''}>${c}</option>`).join('');
    html += `<span style="font-size:0.78rem;display:block;margin:6px 0 4px;">£${prices.cap.toFixed(2)}</span>
      <select onchange="giftSetField('${key}','cap','color',this.value)"><option value="">Choose colour…</option>${colorOpts}</select>`;
  } else {
    const plainP = prices[piece+'Plain'], imagedP = prices[piece+'Imaged'];
    html += `<select onchange="giftSetField('${key}','${piece}','style',this.value)">
      <option value="">Choose style…</option>
      <option value="imaged" ${st.style==='imaged'?'selected':''}>Imaged (with this design) — £${imagedP.toFixed(2)}</option>
      <option value="plain" ${st.style==='plain'?'selected':''}>Plain (no print) — £${plainP.toFixed(2)}</option>
    </select>`;
    if(st.style){
      const colorOpts = productColors.map(c=>`<option ${st.color===c?'selected':''}>${c}</option>`).join('');
      const sizeOpts = productTypes[piece].sizes.map(sz=>`<option ${st.size===sz?'selected':''}>${sz}</option>`).join('');
      html += `<label style="display:block;font-size:0.76rem;font-weight:600;margin:6px 0 2px;">Colour</label>
        <select onchange="giftSetField('${key}','${piece}','color',this.value)"><option value="">Choose colour…</option>${colorOpts}</select>
        <label style="display:block;font-size:0.76rem;font-weight:600;margin:6px 0 2px;">Size</label>
        <select onchange="giftSetField('${key}','${piece}','size',this.value)"><option value="">Choose size…</option>${sizeOpts}</select>`;
      if(st.style==='plain'){
        html += `<label style="display:block;font-size:0.76rem;margin-top:6px;"><input type="checkbox" ${st.logo?'checked':''} onchange="giftSetField('${key}','${piece}','logo',this.checked)"> Add our company logo</label>`;
      }
    }
  }
  html += `</div>`;
  return html;
}
function renderGiftBox(key){
  const el = document.getElementById('giftBox-'+key);
  if(!el) return;
  const ui = giftUI[key];
  /* if the owner has changed the list, drop a choice that no longer exists */
  if(ui.setId && !giftSets.some(g=>g.id===ui.setId)){ ui.setId = ''; ui.pieces = {}; }
  const designs = catalogs[key] || [];
  if(ui.design && !designs.some(d=>d.id===ui.design)) ui.design = '';
  const counts = [2,3,4,5].filter(n=>giftSets.some(g=>g.pieces.length===n));
  if(ui.count && !counts.includes(ui.count)){ ui.count = 0; ui.setId = ''; ui.pieces = {}; }

  let html = `<h3>Gift sets</h3>
    <span class="pieces">Mix and match pieces in one of this page's designs.</span>
    <select aria-label="Gift sets" onchange="giftChooseCount('${key}',this.value)">
      <option value="">Gift sets — choose…</option>
      ${counts.map(n=>`<option value="${n}" ${ui.count===n?'selected':''}>${GIFT_COUNT_LABELS[n]}</option>`).join('')}
    </select>`;
  if(ui.count){
    const options = giftSets.filter(g=>g.pieces.length===ui.count);
    html += `<select aria-label="Choose a combination" onchange="giftChooseSet('${key}',this.value)">
      <option value="">Choose a combination…</option>
      ${options.map(g=>`<option value="${g.id}" ${ui.setId===g.id?'selected':''}>${giftSetName(g.pieces)}</option>`).join('')}
    </select>`;
  }
  const g = currentGiftSet(key);
  if(g){
    if(!designs.length){
      html += `<p class="pieces">No designs on this page yet, so gift sets can't be ordered from here just now.</p>`;
    } else {
      const total = giftSetTotal(key);
      const allDone = !!ui.design && g.pieces.every(p=>giftPieceComplete(key,p));
      html += `<label style="display:block;font-size:0.78rem;font-weight:600;margin:8px 0 4px;">Design</label>
        <select aria-label="Design" onchange="giftChooseDesign('${key}',this.value)">
          <option value="">Choose a design…</option>
          ${designs.map(d=>`<option value="${d.id}" ${ui.design===d.id?'selected':''}>${escHtml(d.name)}</option>`).join('')}
        </select>
        ${g.pieces.map(p=>renderGiftPieceFields(key,p)).join('')}
        <button class="add-btn" style="width:100%;margin-top:10px;" ${allDone?'':'disabled'} onclick="addGiftSetToCart('${key}')">Add set — £${total.toFixed(2)}</button>`;
    }
  }
  el.innerHTML = html;
}
function addGiftSetToCart(key){
  const ui = giftUI[key];
  const g = currentGiftSet(key);
  const design = (catalogs[key]||[]).find(d=>d.id===ui.design);
  if(!g || !design || !g.pieces.every(p=>giftPieceComplete(key,p))) return;
  const total = giftSetTotal(key);
  const parts = g.pieces.map(p=>{
    const st = ui.pieces[p] || {};
    if(p==='bag') return 'Bag';
    if(p==='mug') return 'Mug ('+st.size+')';
    if(p==='cap') return 'Cap ('+st.color+')';
    const style = st.style==='plain' ? 'Plain'+(st.logo?' + logo':'') : 'Imaged';
    return giftPieceLabel(p)+' ('+style+', '+st.size+', '+st.color+')';
  }).join(', ');
  addToCart('g'+g.id+'-'+Date.now(), giftSetName(g.pieces)+' gift set ('+design.name+') — '+parts, total, '',
    {k:'gift', setId:g.id, collection:key, designId:design.id, pieces: JSON.parse(JSON.stringify(ui.pieces))}, design.img || null);
  giftUI[key] = {count: ui.count, setId:'', design: ui.design, pieces:{}};
  renderGiftBox(key);
}
function renderGiftSets(){
  GIFT_PAGES.forEach(renderGiftBox);
}

/* ---- admin: edit the list of gift sets ---- */
let giftDraft = [];
function openGiftEditor(){
  giftDraft = giftSets.map(g=>({id:g.id, pieces:g.pieces.slice()}));
  renderGiftEditor();
  document.getElementById('giftModal').classList.add('open');
}
function closeGiftEditor(){
  document.getElementById('giftModal').classList.remove('open');
}
function renderGiftEditor(){
  let html = '';
  [2,3,4,5].forEach(n=>{
    const rows = giftDraft.map((g,i)=>({g,i})).filter(x=>x.g.pieces.length===n);
    html += `<div style="margin:12px 0 4px;font-weight:700;font-size:0.85rem;">${GIFT_COUNT_LABELS[n]}</div>`;
    if(!rows.length) html += `<div style="font-size:0.82rem;opacity:0.6;">None — this size won't show on the site.</div>`;
    html += rows.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--line);font-size:0.88rem;">
      <span>${giftSetName(x.g.pieces)}</span>
      <button type="button" class="cancel-btn" style="width:auto;padding:6px 10px;" onclick="giftEditorRemove(${x.i})">Remove</button>
    </div>`).join('');
  });
  html += `<div style="margin-top:16px;font-weight:700;font-size:0.85rem;">Add a combination</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin:8px 0;">
      ${GIFT_ORDER.map(p=>`<label style="font-size:0.88rem;"><input type="checkbox" class="giftNewPiece" value="${p}"> ${giftPieceLabel(p)}</label>`).join('')}
    </div>
    <button type="button" class="btn" onclick="giftEditorAdd()">Add combination</button>
    <div id="giftEditorMsg" style="font-size:0.82rem;margin-top:6px;min-height:1.2em;"></div>`;
  document.getElementById('giftEditorBody').innerHTML = html;
}
function giftEditorRemove(i){
  giftDraft.splice(i,1);
  renderGiftEditor();
}
function giftEditorAdd(){
  const picked = Array.from(document.querySelectorAll('.giftNewPiece')).filter(c=>c.checked).map(c=>c.value);
  const msg = document.getElementById('giftEditorMsg');
  if(picked.length < 2){ msg.textContent = 'Tick at least 2 items.'; return; }
  const pieces = GIFT_ORDER.filter(p=>picked.includes(p));
  if(giftDraft.some(g=>g.pieces.join('+')===pieces.join('+'))){ msg.textContent = giftSetName(pieces)+' is already in the list.'; return; }
  giftDraft.push({id:'', pieces});
  renderGiftEditor();
}
async function saveGiftEditor(){
  try{
    await adminCall({action:'set-giftsets', giftSets: giftDraft.map(g=>({id:g.id, pieces:g.pieces}))});
    closeGiftEditor();
    await loadShop();
  }catch(e){ alert(e.message || 'Gift sets could not be saved.'); }
}
async function resetGiftEditor(){
  if(!confirm('Put the standard gift set list back? Your changes to the list will be lost.')) return;
  try{
    await adminCall({action:'reset-giftsets'});
    closeGiftEditor();
    await loadShop();
  }catch(e){ alert(e.message || 'Gift sets could not be reset.'); }
}

/* ---------------- Design Your Own: custom request with proof ----------------
   Customer describes what they want, optionally uploads an image, picks items (size, then colour),
   and sends the request. With an image, watermarked proofs are made here and emailed to approve.
   Payment only happens after they approve. Prices are checked again on the server. */
const STUDIO_PRODUCTS = {
  tee:    {label:'T-shirt',  sizes:['Small','Medium','Large','X-Large','2X-Large'], colours:true},
  hoodie: {label:'Hoodie',   sizes:['Small','Medium','Large','X-Large','2X-Large'], colours:true},
  cap:    {label:'Cap',      sizes:null, colours:true},
  mug:    {label:'Mug',      sizes:['Standard (11oz)','Large (15oz)'], colours:false},
  bag:    {label:'Tote bag', sizes:null, colours:false},
};
const studio = {image:null, items:[], source:'studio', ready:false};

function studioItemPrice(it){
  if(it.product==='mug') return mugPrices[it.size] || prices.mugSmall;
  if(it.product==='cap') return prices.cap;
  if(it.product==='bag') return BAG_BASE_PRICE + BAG_CUSTOM_CHARGE;
  return prices[it.product+'Imaged'];
}
function studioCurrent(){
  const product = document.getElementById('cdProduct').value;
  const size = document.getElementById('cdSize').value;
  const color = document.getElementById('cdColour').value;
  return {product, size: STUDIO_PRODUCTS[product].sizes ? size : '', color: STUDIO_PRODUCTS[product].colours ? color : ''};
}
function studioInit(){
  const occ = document.getElementById('cdOccasion');
  if(occ && !occ.options.length){
    occ.innerHTML = '<option value="">Choose…</option>' + OCCASIONS.map(o=>`<option>${escHtml(o)}</option>`).join('');
  }
  const prod = document.getElementById('cdProduct');
  if(prod){
    const keep = prod.value || 'tee';
    prod.innerHTML = Object.keys(STUDIO_PRODUCTS).map(k=>{
      const t = STUDIO_PRODUCTS[k];
      const from = k==='mug' ? 'from £'+prices.mugSmall.toFixed(2) : '£'+studioItemPrice({product:k}).toFixed(2);
      return `<option value="${k}">${t.label} — ${from}</option>`;
    }).join('');
    prod.value = keep;
  }
  placeStudioPreview();
  if(!studio.ready){ studio.ready = true; studioProductChanged(); }
  else { studioRenderPrice(); renderStudioMock(); }
  renderDeliveryChoice('cdDelivery', 'cd');
  renderStudioItems();
}
/* on phones the preview sits right under the item choices, so customers see it while they choose */
function placeStudioPreview(){
  const wrap = document.getElementById('mockWrap');
  const mobile = window.matchMedia('(max-width: 759px)').matches;
  const target = mobile ? document.getElementById('cdMobilePreview') : document.querySelector('.studio-preview h3');
  if(!wrap || !target) return;
  if(mobile && wrap.parentElement !== target) target.appendChild(wrap);
  if(!mobile && wrap.previousElementSibling !== target) target.after(wrap);
}
window.addEventListener('resize', placeStudioPreview);

function studioProductChanged(){
  const product = document.getElementById('cdProduct').value;
  const t = STUDIO_PRODUCTS[product];
  const sizeField = document.getElementById('cdSizeField');
  const sizeSel = document.getElementById('cdSize');
  if(t.sizes){
    sizeField.style.display = '';
    sizeSel.innerHTML = '<option value="">Choose size…</option>' + t.sizes.map(z=>`<option>${z}</option>`).join('');
  } else {
    sizeField.style.display = 'none';
    sizeSel.innerHTML = '';
  }
  document.getElementById('cdColour').innerHTML = '';
  studioSizeChanged();
}
/* colour is only offered once the size has been chosen (caps have no size, so colour shows straight away) */
function studioSizeChanged(){
  const product = document.getElementById('cdProduct').value;
  const t = STUDIO_PRODUCTS[product];
  const colourField = document.getElementById('cdColourField');
  const colourSel = document.getElementById('cdColour');
  const sizeChosen = !t.sizes || !!document.getElementById('cdSize').value;
  if(t.colours && sizeChosen){
    const keep = colourSel.value;
    colourField.style.display = '';
    colourSel.innerHTML = '<option value="">Choose colour…</option>' + productColors.map(c=>`<option ${c===keep?'selected':''}>${c}</option>`).join('');
  } else {
    colourField.style.display = 'none';
    colourSel.innerHTML = '';
  }
  studioRenderPrice();
  renderStudioMock();
}
function studioColourChanged(){ studioRenderPrice(); renderStudioMock(); }
function studioRenderPrice(){
  const it = studioCurrent();
  const el = document.getElementById('cdPrice');
  if(it.product==='mug' && !it.size){ el.textContent = 'From £' + prices.mugSmall.toFixed(2); return; }
  el.textContent = STUDIO_PRODUCTS[it.product].label + ' — £' + studioItemPrice(it).toFixed(2);
}
let studioMockBusy = Promise.resolve();
function renderStudioMock(){
  const c = document.getElementById('mockCanvas');
  if(!c || typeof drawMockup !== 'function') return;
  const it = studioCurrent();
  studioMockBusy = studioMockBusy.then(()=>drawMockup(c, it.product, it.color || 'White', studio.image, true)).catch(()=>{});
}
function studioImageChosen(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    studio.image = await shrinkImage(e.target.result);
    document.getElementById('cdDrop').textContent = file.name + ' — tap to change';
    renderStudioMock();
  };
  reader.readAsDataURL(file);
  evt.target.value = '';
}
function studioAddItem(){
  const it = studioCurrent();
  const t = STUDIO_PRODUCTS[it.product];
  if(t.sizes && !it.size){ studioMsg('Please choose a size first.', 'err'); return; }
  if(t.colours && !it.color){ studioMsg('Please choose a colour.', 'err'); return; }
  studio.items.push(it);
  studioMsg('', '');
  renderStudioItems();
}
function studioRemoveItem(i){ studio.items.splice(i,1); renderStudioItems(); }
function renderStudioItems(){
  const el = document.getElementById('cdItems');
  if(!el) return;
  if(!studio.items.length){ el.innerHTML = '<p class="hint">No items added yet. Choose an item above and tap "Add this item". Add as many as you like.</p>'; return; }
  const total = studio.items.reduce((s,it)=>s+studioItemPrice(it),0);
  el.innerHTML = studio.items.map((it,i)=>`<div class="cd-item">
      <span>${STUDIO_PRODUCTS[it.product].label}${it.size?', '+it.size:''}${it.color?', '+it.color:''}</span>
      <span>£${studioItemPrice(it).toFixed(2)} <button onclick="studioRemoveItem(${i})">Remove</button></span>
    </div>`).join('') + `<div class="cd-item total"><span>Items total</span><span>£${total.toFixed(2)}</span></div>
    <p class="hint">Postage is added when you pay (free on orders of £80 or more${shopSettings.collectionOn ? ', or free collection' : ''}).</p>`;
}
function studioMsg(text, kind){
  const m = document.getElementById('cdMsg');
  m.textContent = text; m.className = 'rev-msg ' + (kind||'');
}
function startStudio(source){
  studio.source = source === 'military' ? 'military' : 'studio';
  showPage('studio');
  if(source === 'military'){
    const occ = document.getElementById('cdOccasion');
    if(occ) occ.value = 'Military / regiment';
  }
}
let studioSending = false;
async function studioSend(){
  if(studioSending) return;
  const val = id => document.getElementById(id).value.trim();
  const customer = {name: val('cdName'), email: val('cdEmail'), phone: val('cdPhone')};
  const brief = {occasion: val('cdOccasion'), kind: val('cdKind'), quoteText: val('cdQuote'), style: val('cdStyle'), colours: val('cdColours'), description: val('cdDesc')};
  if(!studio.items.length){
    /* if they've chosen an item but not pressed "Add this item", add it for them */
    const it = studioCurrent(), t = STUDIO_PRODUCTS[it.product];
    if((!t.sizes || it.size) && (!t.colours || it.color)) studio.items.push(it);
    else { studioMsg('Please add at least one item (choose the size and colour, then "Add this item").', 'err'); return; }
    renderStudioItems();
  }
  if(!studio.image && brief.description.length < 5 && !brief.quoteText){ studioMsg('Please describe what you would like, or upload an image.', 'err'); return; }
  if(!customer.name){ studioMsg('Please add your name.', 'err'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)){ studioMsg('Please add a valid email address, so we can send your proof.', 'err'); return; }
  const delivery = readDeliveryChoice('cd');
  if(delivery.collect && delivery.postcode.replace(/\s/g,'').length < 5){ studioMsg('Please enter your postcode for collection.', 'err'); return; }

  studioSending = true;
  const btn = document.getElementById('cdSend');
  btn.disabled = true; btn.textContent = 'Sending…';
  try{
    let uploadId = null, proofs = [];
    if(studio.image){
      studioMsg('Uploading your image…', '');
      uploadId = (await postJSON('/api/upload', {dataUrl: studio.image})).id;
      studioMsg('Making your proofs…', '');
      for(const it of studio.items) proofs.push(await makeProof(it.product, it.color || 'White', studio.image));
    }
    const data = await postJSON('/api/custom', {customer, brief, items: studio.items, uploadId, proofs, delivery, source: studio.source, website: document.getElementById('cdWebsite').value});
    studio.items = []; studio.image = null;
    renderStudioItems(); renderStudioMock();
    document.getElementById('cdDrop').textContent = 'Tap to choose a photo, logo or drawing';
    ['cdQuote','cdStyle','cdColours','cdDesc'].forEach(id=>document.getElementById(id).value='');
    const title = data.status === 'awaiting-approval' ? 'Check your email!' : 'Request sent!';
    const text = data.status === 'awaiting-approval'
      ? `We've emailed your watermarked proof to ${customer.email}. Tap "I approve this design" in the email and we'll send your payment link. Nothing is printed until it's paid. Your reference: ${data.id}.`
      : `Thanks ${customer.name}! We'll design it and email a watermarked proof to ${customer.email} for you to approve. Nothing is printed until you've approved it and paid. Your reference: ${data.id}.`;
    document.getElementById('payTitle').textContent = title;
    document.getElementById('payText').textContent = text + (data.emailOn === false ? ' (If the email does not arrive, contact us with your reference.)' : '');
    document.getElementById('payModal').classList.add('open');
    studioMsg('Sent ✓', 'ok');
  }catch(e){
    studioMsg(e.message || 'Sorry, that could not be sent. Please try again.', 'err');
  }
  studioSending = false;
  btn.disabled = false; btn.textContent = 'Send for my proof';
}

/* ---------------- delivery or free collection ---------------- */
const deliveryState = {};
function renderDeliveryChoice(elId, key){
  const el = document.getElementById(elId);
  if(!el) return;
  if(!shopSettings.collectionOn){ el.innerHTML = ''; deliveryState[key] = {collect:false, postcode:''}; return; }
  const st = deliveryState[key] || (deliveryState[key] = {collect:false, postcode:''});
  const where = shopSettings.town ? ' of ' + escHtml(shopSettings.town) : '';
  el.innerHTML = `<label class="radio"><input type="radio" name="dl-${key}" ${!st.collect?'checked':''} onchange="setDelivery('${key}',false)"> Post it to me</label>
    <label class="radio"><input type="radio" name="dl-${key}" ${st.collect?'checked':''} onchange="setDelivery('${key}',true)"> Free collection (within ${shopSettings.collectionMiles} miles${where})</label>
    <input type="text" id="pc-${key}" placeholder="Your postcode" maxlength="9" value="${escHtml(st.postcode)}" style="display:${st.collect?'block':'none'}" oninput="deliveryState['${key}'].postcode=this.value">`;
}
function setDelivery(key, collect){
  deliveryState[key].collect = collect;
  const pc = document.getElementById('pc-'+key);
  if(pc) pc.style.display = collect ? 'block' : 'none';
  if(key === 'cart') updateCartUI();
}
function readDeliveryChoice(key){
  const st = deliveryState[key] || {collect:false, postcode:''};
  return {collect: !!(shopSettings.collectionOn && st.collect), postcode: (st.postcode||'').trim()};
}

/* ---------------- contact ---------------- */
function renderContact(){
  const el = document.getElementById('contactInfo');
  if(!el) return;
  const s = shopSettings;
  const wa = String(s.whatsapp||'').replace(/[^0-9]/g,'').replace(/^0/,'44');
  el.innerHTML = `
    <p><strong>Email</strong><br><a href="mailto:${escHtml(s.email)}">${escHtml(s.email)}</a></p>
    <p><strong>WhatsApp</strong><br>${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">Message us on WhatsApp</a>` : 'Coming soon. Email us for now.'}</p>
    ${s.town ? `<p><strong>Where we are</strong><br>${escHtml(s.town)}</p>` : ''}
    ${s.collectionOn ? `<p><strong>Free collection</strong><br>Live within ${s.collectionMiles} miles${s.town?' of '+escHtml(s.town):''}? Choose free collection when you order.</p>` : ''}
    <p><strong>Complaints</strong><br>Sorry if something's not right. Please email <a href="mailto:${escHtml(s.complaintsEmail)}">${escHtml(s.complaintsEmail)}</a> with your order details and we'll put it right.</p>
    <p class="hint">Everything is made to order and only printed once payment has cleared.</p>`;
}
async function sendContact(){
  const val = id => document.getElementById(id).value.trim();
  const m = document.getElementById('ctMsg');
  const body = {name: val('ctName'), email: val('ctEmail'), phone: val('ctPhone'), topic: val('ctTopic'), message: val('ctMessage'), website: val('ctWebsite')};
  if(!body.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)){ m.textContent = 'Please add your name and a valid email address.'; m.className='rev-msg err'; return; }
  if(body.message.length < 5){ m.textContent = 'Please write a short message.'; m.className='rev-msg err'; return; }
  try{
    await postJSON('/api/contact', body);
    ['ctMessage','ctPhone'].forEach(id=>document.getElementById(id).value='');
    m.textContent = "Thanks, we've got your message and will be in touch soon."; m.className = 'rev-msg ok';
  }catch(e){ m.textContent = e.message || 'Sorry, that could not be sent.'; m.className = 'rev-msg err'; }
}

/* ---------------- admin: custom requests and messages ---------------- */
let adminRequests = [];
async function openRequests(){
  document.getElementById('reqTitle').textContent = 'Custom requests';
  document.getElementById('reqBody').innerHTML = '<p>Loading…</p>';
  document.getElementById('reqModal').classList.add('open');
  try{
    const data = await adminCall({action:'list-requests'});
    adminRequests = data.requests || [];
    renderRequests();
  }catch(e){ document.getElementById('reqBody').innerHTML = `<p class="rev-msg err">${escHtml(e.message||'Could not load requests.')}</p>`; }
}
function renderRequests(){
  const body = document.getElementById('reqBody');
  if(!adminRequests.length){ body.innerHTML = '<p>No custom requests yet.</p>'; return; }
  body.innerHTML = adminRequests.map(r=>{
    const b = r.brief || {};
    const line = (k,v)=> v ? `<div><span class="k">${k}</span> ${escHtml(v)}</div>` : '';
    const when = new Date(r.created).toLocaleString('en-GB', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
    return `<div class="req req-${r.status}">
      <div class="req-top"><strong>${escHtml(r.customer.name)}</strong> <span class="badge">${escHtml(r.statusLabel)}</span></div>
      <div class="hint">${when} · ref ${r.id}${r.source==='military'?' · Military page':''}</div>
      <div><a href="mailto:${escHtml(r.customer.email)}">${escHtml(r.customer.email)}</a> ${escHtml(r.customer.phone||'')}</div>
      ${line('Occasion', b.occasion)}${line('Wants', b.kind)}${line('Words', b.quoteText)}${line('Style', b.style)}${line('Colours', b.colours)}${line('Idea', b.description)}
      ${line('Items', r.items.join(' | '))}
      ${line('Delivery', r.delivery && r.delivery.collect ? 'Free collection, postcode ' + r.delivery.postcode : 'Post')}
      ${r.total!=null ? `<div><span class="k">Total</span> £${(r.total/100).toFixed(2)}</div>` : ''}
      ${r.upload ? `<div><a href="${r.upload}" target="_blank" rel="noopener">Customer's original image (full size)</a></div>` : ''}
      ${r.proofs.length ? `<div class="req-proofs">${r.proofs.map(u=>`<img src="${u}" alt="proof" onclick="openLightboxImage('${u}','Proof')">`).join('')}</div>` : ''}
      <div class="req-btns">
        ${['needs-design','awaiting-approval'].includes(r.status) ? `<label class="add-btn">${r.proofs.length?'Make a new proof':'Make &amp; send proof'}<input type="file" accept="image/*" style="display:none" onchange="adminMakeProof('${r.id}', event)"></label>` : ''}
        ${r.status==='approved' ? `<button class="add-btn" onclick="adminSetStatus('${r.id}','paid')">Mark as paid</button>` : ''}
        ${r.status==='paid' ? `<button class="add-btn" onclick="adminSetStatus('${r.id}','printed')">Mark as sent to print</button>` : ''}
        ${!['printed','cancelled'].includes(r.status) ? `<button class="cancel-btn" onclick="adminSetStatus('${r.id}','cancelled')">Cancel</button>` : ''}
        <button class="cancel-btn" onclick="adminDeleteRequest('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}
/* Admin uploads the finished design: a watermarked proof is made for each item the customer chose, then emailed. */
async function adminMakeProof(id, evt){
  const file = evt.target.files[0];
  evt.target.value = '';
  const r = adminRequests.find(x=>x.id===id);
  if(!file || !r) return;
  const dataUrl = await new Promise(res=>{ const fr = new FileReader(); fr.onload = e=>res(e.target.result); fr.readAsDataURL(file); });
  const design = await shrinkImage(dataUrl);
  const proofs = [];
  for(const it of r.rawItems) proofs.push(await makeProof(it.product, it.color || 'White', design));
  if(!confirm(`Email ${proofs.length} watermarked proof${proofs.length>1?'s':''} to ${r.customer.email} to approve?`)) return;
  try{
    const out = await adminCall({action:'send-proof', id, proofs});
    alert(out.emailed ? 'Proof emailed to the customer.' : 'Proof saved, but email is not set up yet, so it was NOT emailed. Send the customer this link to approve:\n\n' + out.approveLink);
    openRequests();
  }catch(e){ alert(e.message || 'Could not send the proof.'); }
}
async function adminSetStatus(id, status){
  const words = {paid:'Mark this as paid? (Only if you have checked the payment in Stripe.)', printed:'Mark as sent to print?', cancelled:'Cancel this request?'};
  if(!confirm(words[status])) return;
  try{ await adminCall({action:'set-request-status', id, status}); openRequests(); }
  catch(e){ alert(e.message || 'Could not update.'); }
}
async function adminDeleteRequest(id){
  if(!confirm('Delete this request and its proofs? This cannot be undone.')) return;
  try{ await adminCall({action:'delete-request', id}); openRequests(); }
  catch(e){ alert(e.message || 'Could not delete.'); }
}
async function openMessages(){
  document.getElementById('reqTitle').textContent = 'Messages';
  const body = document.getElementById('reqBody');
  body.innerHTML = '<p>Loading…</p>';
  document.getElementById('reqModal').classList.add('open');
  try{
    const data = await adminCall({action:'list-messages'});
    const list = data.messages || [];
    body.innerHTML = !list.length ? '<p>No messages yet.</p>' : list.map(m=>`<div class="req">
      <div class="req-top"><strong>${escHtml(m.name)}</strong> <span class="badge">${escHtml(m.topic)}</span></div>
      <div class="hint">${new Date(m.date).toLocaleString('en-GB')}</div>
      <div><a href="mailto:${escHtml(m.email)}">${escHtml(m.email)}</a> ${escHtml(m.phone||'')}</div>
      <p style="white-space:pre-wrap;margin:8px 0;">${escHtml(m.message)}</p>
      <div class="req-btns"><button class="cancel-btn" onclick="adminDeleteMessage('${m.id}')">Delete</button></div>
    </div>`).join('');
  }catch(e){ body.innerHTML = `<p class="rev-msg err">${escHtml(e.message||'Could not load messages.')}</p>`; }
}
async function adminDeleteMessage(id){
  if(!confirm('Delete this message?')) return;
  try{ await adminCall({action:'delete-message', id}); openMessages(); }catch(e){ alert(e.message||'Could not delete.'); }
}

/* ---------------- cart ---------------- */
let cart = [];
try{ cart = JSON.parse(sessionStorage.getItem('sca_cart') || '[]') || []; }catch(e){ cart = []; }
function addToCart(id, name, price, size, spec, image){
  cart.push({id, name, price, size, spec, image: image || null});
  updateCartUI();
}
function removeFromCart(idx){
  cart.splice(idx,1);
  updateCartUI();
}
function updateCartUI(){
  document.getElementById('cartCount').textContent = cart.length;
  const list = document.getElementById('drawerItems');
  if(cart.length === 0){
    list.innerHTML = '<div class="empty-note">Your cart is empty — add something from a collection.</div>';
  } else {
    list.innerHTML = cart.map((item,i)=>`
      <div class="cart-item">
        <div>
          <div>${item.name}</div>
          <div class="meta">${item.size ? 'Size: '+item.size : ''}</div>
        </div>
        <div style="text-align:right">
          <div>£${item.price.toFixed(2)}</div>
          <button onclick="removeFromCart(${i})">Remove</button>
        </div>
      </div>`).join('');
  }
  const subtotal = cart.reduce((s,i)=>s+i.price,0);
  const collecting = readDeliveryChoice('cart').collect;
  const post = cart.length && !collecting ? cartPostage(subtotal) : 0;
  const note = document.getElementById('ppNote');
  if(!document.getElementById('pc-cart')) renderDeliveryChoice('cartDelivery','cart');
  if(note){
    note.textContent = !cart.length ? 'Free postage on orders of £80 or more'
      : collecting ? 'Free collection: we\'ll be in touch to arrange it'
      : post === 0 ? 'Postage & packaging: FREE'
      : 'Postage & packaging: £' + post.toFixed(2) + ' (free on orders of £80 or more)';
  }
  document.getElementById('cartTotal').textContent = '£' + (subtotal + post).toFixed(2);
  saveCart();
}
/* postage shown here is only a preview: the server works out the real figure at checkout */
const POSTAGE_STANDARD = 4.95, POSTAGE_BULKY = 6.95, POSTAGE_FREE_FROM = 80;
function cartPostage(subtotal){
  if(subtotal >= POSTAGE_FREE_FROM) return 0;
  let items = 0, hoodie = false;
  cart.forEach(i=>{
    const sp = i.spec || {};
    if(sp.k === 'gift'){ const g = giftSets.find(x=>x.id===sp.setId); const ps = g ? g.pieces : Object.keys(sp.pieces||{}); items += ps.length || 1; if(ps.includes('hoodie')) hoodie = true; }
    else { items += 1; if(sp.type === 'hoodie' || sp.product === 'hoodie') hoodie = true; }
  });
  return (hoodie || items >= 3) ? POSTAGE_BULKY : POSTAGE_STANDARD;
}
function saveCart(){
  try{ sessionStorage.setItem('sca_cart', JSON.stringify(cart)); }catch(e){}
}
function openCart(){ document.getElementById('overlay').classList.add('open'); document.getElementById('drawer').classList.add('open'); }
function closeCart(){ document.getElementById('overlay').classList.remove('open'); document.getElementById('drawer').classList.remove('open'); }
async function postJSON(url, body, headers){
  const res = await fetch(url, {method:'POST', headers: Object.assign({'content-type':'application/json'}, headers||{}), body: JSON.stringify(body)});
  let data = {};
  try{ data = await res.json(); }catch(e){}
  if(!res.ok) throw new Error(data.error || ('Something went wrong (code ' + res.status + '). Please try again.'));
  return data;
}
/* big photos are shrunk before upload so they arrive quickly on mobile data */
function shrinkImage(dataUrl){
  return new Promise(resolve=>{
    if(dataUrl.length < 4000000){ resolve(dataUrl); return; }
    const img = new Image();
    img.onload = ()=>{
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*scale); c.height = Math.round(img.height*scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = ()=>resolve(dataUrl);
    img.src = dataUrl;
  });
}
let checkingOut = false;
async function buyNow(){
  if(cart.length === 0){ alert('Add something to your cart first.'); return; }
  if(checkingOut) return;
  checkingOut = true;
  const btn = document.querySelector('.checkout-btn');
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'One moment…';
  try{
    const items = [];
    for(const it of cart){
      const spec = Object.assign({}, it.spec);
      if(it.image){
        if(!it.uploadId){
          const up = await postJSON('/api/upload', {dataUrl: await shrinkImage(it.image)});
          it.uploadId = up.id;
        }
        spec.uploadId = it.uploadId;
      }
      items.push(spec);
    }
    const dl = readDeliveryChoice('cart');
    if(dl.collect && dl.postcode.replace(/\s/g,'').length < 5) throw new Error('Please enter your postcode for collection.');
    const data = await postJSON('/api/checkout', {items, collect: dl.collect, postcode: dl.postcode});
    window.location.href = data.url;
    return;
  }catch(e){
    alert(e.message || 'Sorry, checkout could not start. Please try again.');
  }
  checkingOut = false;
  btn.disabled = false; btn.textContent = label;
}

/* ---------------- nav ---------------- */

/* ---------------- reviews ---------------- */
let reviews = [];

function escHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function starsHtml(n){
  n = Math.round(n);
  let out = '';
  for(let i=1;i<=5;i++) out += i<=n ? '★' : '<span class="off">★</span>';
  return '<span class="stars-static" aria-label="' + n + ' out of 5 stars">' + out + '</span>';
}
function buildStarInput(elId){
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for(let i=1;i<=5;i++){
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = '★';
    b.setAttribute('aria-label', i + ' star' + (i>1?'s':''));
    b.onclick = () => { el.dataset.value = i; paintStars(elId); };
    el.appendChild(b);
  }
  paintStars(elId);
}
function paintStars(elId){
  const el = document.getElementById(elId);
  const v = parseInt(el.dataset.value || '0', 10);
  [...el.children].forEach((b, idx) => b.classList.toggle('on', idx < v));
}
function revMsg(text, kind){
  const m = document.getElementById('revMsg');
  m.textContent = text; m.className = 'rev-msg ' + (kind||'');
}
async function submitReview(){
  const name = document.getElementById('revName').value.trim();
  const product = document.getElementById('revProduct').value;
  const exp = parseInt(document.getElementById('starsExperience').dataset.value || '0', 10);
  const prod = parseInt(document.getElementById('starsProduct').dataset.value || '0', 10);
  const text = document.getElementById('revText').value.trim();
  if(!name){ revMsg('Please add your name.', 'err'); return; }
  if(!product){ revMsg('Please choose what you bought.', 'err'); return; }
  if(!exp || !prod){ revMsg('Please give both star ratings.', 'err'); return; }
  if(text.length < 5){ revMsg('Please write a few words about your order.', 'err'); return; }
  const hp = document.getElementById('revWebsite');
  try{
    await postJSON('/api/review', {name, product, exp, prod, text, website: hp ? hp.value : ''});
  }catch(e){ revMsg(e.message || 'Your review could not be sent. Please try again.', 'err'); return; }
  document.getElementById('revName').value = '';
  document.getElementById('revProduct').value = '';
  document.getElementById('revText').value = '';
  document.getElementById('starsExperience').dataset.value = '0';
  document.getElementById('starsProduct').dataset.value = '0';
  paintStars('starsExperience'); paintStars('starsProduct');
  revMsg('Thank you — your review is up!', 'ok');
  await loadShop();
}
async function deleteReview(id){
  if(!confirm('Remove this review? This cannot be undone.')) return;
  try{ await adminCall({action:'delete-review', id}); await loadShop(); }
  catch(e){ alert(e.message || 'Could not remove that review.'); }
}
function renderReviews(){
  const sum = document.getElementById('revSummary');
  const list = document.getElementById('revList');
  if(!sum || !list) return;
  if(!reviews.length){
    sum.innerHTML = '';
    list.innerHTML = '<p class="empty-note">No reviews yet — be the first to leave one.</p>';
    return;
  }
  const avgExp = reviews.reduce((a,r)=>a+r.exp,0) / reviews.length;
  const avgProd = reviews.reduce((a,r)=>a+r.prod,0) / reviews.length;
  sum.innerHTML =
    '<div><div class="rev-avg">' + avgProd.toFixed(1) + '</div>' + starsHtml(avgProd) +
    '<div style="font-size:0.75rem;color:rgba(23,35,29,0.55);margin-top:2px;">Products</div></div>' +
    '<div><div class="rev-avg">' + avgExp.toFixed(1) + '</div>' + starsHtml(avgExp) +
    '<div style="font-size:0.75rem;color:rgba(23,35,29,0.55);margin-top:2px;">Buying experience</div></div>' +
    '<div style="font-size:0.85rem;color:rgba(23,35,29,0.6);">' + reviews.length + ' review' + (reviews.length>1?'s':'') + '</div>';
  list.innerHTML = reviews.map(r => {
    const d = new Date(r.date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
    return '<div class="rev-item">' +
      '<div class="top"><div><div class="who">' + escHtml(r.name) + '</div><div class="when">' + d + '</div></div>' +
      (ADMIN_KEY ? '<button class="rev-del" onclick="deleteReview(\'' + r.id + '\')">Remove</button>' : '') + '</div>' +
      '<div class="ratings"><span>Buying experience' + starsHtml(r.exp) + '</span><span>Product' + starsHtml(r.prod) + '</span></div>' +
      '<p>' + escHtml(r.text) + '</p>' +
      '<span class="prod-tag">' + escHtml(r.product) + '</span>' +
    '</div>';
  }).join('');
}
buildStarInput('starsExperience');
buildStarInput('starsProduct');

/* ---------------- one web address per page (helps Google) ----------------
   Must match PAGE_ROUTES in netlify/lib/seo.mjs and the [[redirects]] in netlify.toml. */
const PAGE_ROUTES = [
  { page: "home", path: "/" },
  { page: "quotes", path: "/country-quotes", collection: "quotes" },
  { page: "borncollection", path: "/born-here-live-here-ride-here", collection: "born" },
  { page: "pets", path: "/scottish-pets", collection: "pets" },
  { page: "dailyquotes", path: "/sarcastic-quotes", collection: "daily" },
  { page: "military", path: "/military", collection: "military" },
  { page: "ufo", path: "/ufo", collection: "ufo" },
  { page: "studio", path: "/design-your-own" },
  { page: "reviews", path: "/reviews" },
  { page: "contact", path: "/contact" },
];
const PAGE_META = {
  home: ["Scottish Country Attitude | Scottish T-shirts, Hoodies, Mugs & Gifts",
    "Scottish country quotes, biker, pet, sarcastic and military designs on T-shirts, hoodies, caps, mugs and bags. Made to order in Scotland, with gift sets and your own designs."],
  quotes: ["Country Quote T-shirts, Hoodies & Mugs | Scottish Country Attitude",
    "Country music and country living quotes on T-shirts, hoodies, caps and mugs. Made to order in Scotland. Gift sets available."],
  borncollection: ["Born Here, Live Here, Ride Here | Scottish Biker T-shirts & Gifts",
    "Scottish biker designs on T-shirts, hoodies, caps and mugs. Highland roads, Saltire pride and sport bikes, made to order in Scotland."],
  pets: ["Scottish Pets Wae Country Attitude | Pet T-shirts, Mugs & Bags",
    "Sassy Scottish pet designs on T-shirts, hoodies, mugs and bags. Highland coos, Scotties, spaniels and more, made to order."],
  dailyquotes: ["Sarcastic Quote T-shirts & Mugs | Scottish Country Attitude",
    "Cheeky Scottish one-liners on T-shirts, hoodies, caps and mugs for folk with attitude. Made to order in Scotland."],
  military: ["Military & Veteran T-shirts and Mugs | Scottish Country Attitude",
    "Designs for serving and former soldiers and their families on mugs, T-shirts and hoodies, or upload your own photo. Made to order in Scotland."],
  ufo: ["UFO & UAP T-shirts, Hoodies and Mugs | Scottish Country Attitude",
    "Flying saucers, strange lights and UAP designs on T-shirts, hoodies, caps, mugs and bags for sky watchers. Made to order in Scotland."],
  studio: ["Design Your Own T-shirt, Hoodie or Mug | Hen & Stag Dos | Scottish Country Attitude",
    "Custom T-shirts, hoodies, mugs, caps and bags for hen dos, stag dos, parties and gifts. Upload your image, approve a free proof, then pay."],
  reviews: ["Customer Reviews | Scottish Country Attitude", "What customers say about their Scottish Country Attitude orders."],
  contact: ["Contact Us | Scottish Country Attitude", "Questions, bulk orders or custom ideas? Get in touch with Scottish Country Attitude."],
};
const routeFor = (page) => PAGE_ROUTES.find(r => r.page === page) || PAGE_ROUTES[0];
function pageFromPath(path){
  const clean = (path || '/').replace(/\/+$/, '') || '/';
  const r = PAGE_ROUTES.find(r => r.path === clean);
  return r ? r.page : null;
}
function setMeta(sel, attr, val){ const el = document.querySelector(sel); if(el) el.setAttribute(attr, val); }
function applyPageMeta(page){
  const [title, desc] = PAGE_META[page] || PAGE_META.home;
  const url = 'https://scottishcountryattitude.co.uk' + routeFor(page).path;
  document.title = title;
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('link[rel="canonical"]', 'href', url);
}

function showPage(page, opts){
  if(!document.getElementById('page-'+page)) page = 'home';
  document.querySelectorAll('section.page').forEach(s=>s.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  window.scrollTo({top:0, behavior:'instant'});
  if(page === 'studio'){ studioInit(); }
  if(page === 'reviews'){ renderReviews(); }
  if(page === 'contact'){ renderContact(); }
  applyPageMeta(page);
  const path = routeFor(page).path;
  if(!(opts && opts.noHistory) && history.pushState && location.pathname !== path) history.pushState({page}, '', path);
}
window.addEventListener('popstate', ()=>{ showPage(pageFromPath(location.pathname) || 'home', {noHistory:true}); });

/* ---------------- shop data lives on the server ---------------- */
let ADMIN_KEY = null;
try{ ADMIN_KEY = sessionStorage.getItem('sca_admin') || null; }catch(e){}
function setAdminUI(){ document.body.classList.toggle('is-admin', !!ADMIN_KEY); }
function adminCall(body){ return postJSON('/api/admin', body, {'x-admin-key': ADMIN_KEY || ''}); }
function adminLogin(){
  if(ADMIN_KEY){
    if(confirm('Log out of admin mode?')){
      ADMIN_KEY = null;
      try{ sessionStorage.removeItem('sca_admin'); }catch(e){}
      setAdminUI(); renderReviews();
    }
    return;
  }
  const pw = prompt('Admin password:');
  if(!pw) return;
  ADMIN_KEY = pw;
  adminCall({action:'check'}).then(()=>{
    try{ sessionStorage.setItem('sca_admin', pw); }catch(e){}
    setAdminUI(); renderReviews();
  }).catch(err=>{
    ADMIN_KEY = null;
    const m = (err && err.message) || '';
    alert(m === 'Wrong password' ? 'That password was not accepted. Check capital letters and spaces, then try again.' : m || 'Could not reach the shop server.');
  });
}
function applyShop(data){
  if(!data || !data.catalogs) return;
  COLLECTION_KEYS.forEach(k=>{ catalogs[k] = data.catalogs[k] || []; });
  if(data.settings) shopSettings = Object.assign({}, shopSettings, data.settings);
  if(Array.isArray(data.occasions) && data.occasions.length) OCCASIONS = data.occasions;
  if(data.prices) Object.assign(prices, data.prices);
  if(Array.isArray(data.giftSets) && data.giftSets.length) giftSets = data.giftSets;
  mugPrices['Standard (11oz)'] = prices.mugSmall;
  mugPrices['Large (15oz)'] = prices.mugLarge;
  reviews = data.reviews || [];
}
async function loadShop(){
  try{
    const res = await fetch('/api/catalog', {cache:'no-store'});
    if(!res.ok) throw new Error('catalog');
    const data = await res.json();
    applyShop(data);
    try{ localStorage.setItem('sca_shop_cache', JSON.stringify(data)); }catch(e){}
  }catch(e){ /* offline or not set up yet: keep what is already showing */ }
  renderGrids(); renderGiftSets(); renderReviews();
  renderDeliveryChoice('cartDelivery','cart'); updateCartUI(); renderContact();
  if(document.getElementById('page-studio').classList.contains('active')) studioInit();
  if(typeof openPendingDesign === 'function') openPendingDesign();
}

/* show the last copy of the shop straight away (works offline), then refresh from the server */
try{ applyShop(JSON.parse(localStorage.getItem('sca_shop_cache') || 'null')); }catch(e){}
renderGrids();
renderGiftSets();
updateCartUI();
renderReviews();
renderContact();
setAdminUI();
loadShop();
/* open the page named in the address, e.g. scottishcountryattitude.co.uk/design-your-own
   (old links like /#studio still work and are moved to the new address) */
(function(){
  const h = location.hash.replace('#','');
  if(h && document.getElementById('page-'+h)){
    history.replaceState(null, '', routeFor(h).path + location.search);
    showPage(h, {noHistory:true});
  } else {
    showPage(pageFromPath(location.pathname) || 'home', {noHistory:true});
  }
})();

/* a link to one design, e.g. /country-quotes?design=q123 (used by Google Shopping and for sharing) */
let pendingDesign = new URLSearchParams(location.search).get('design');
function openPendingDesign(){
  if(!pendingDesign) return;
  for(const r of PAGE_ROUTES){
    if(r.collection && (catalogs[r.collection]||[]).some(d=>d.id===pendingDesign)){
      showPage(r.page, {noHistory:true});
      openLightbox(r.collection, pendingDesign);
      pendingDesign = null;
      return;
    }
  }
}
openPendingDesign();

/* coming back from Stripe */
(function(){
  const q = new URLSearchParams(location.search);
  if(q.get('paid') === '1' && q.get('custom')){
    document.getElementById('payTitle').textContent = 'Thank you, payment received!';
    document.getElementById('payText').textContent = 'Your custom order (ref ' + q.get('custom') + ') is paid and is now going to print. Stripe will email your receipt.';
    document.getElementById('payModal').classList.add('open');
  } else if(q.get('paid') === '1'){
    cart = []; saveCart(); updateCartUI();
    document.getElementById('payTitle').textContent = 'Thank you — order received!';
    document.getElementById('payText').textContent = 'Your payment went through and your order is with us. We make every item to order, so please allow a little time before it is posted. Stripe will email your receipt.';
    document.getElementById('payModal').classList.add('open');
  } else if(q.get('cancelled') === '1'){
    openCart();
  }
  if(q.has('paid') || q.has('cancelled')) history.replaceState(null, '', location.pathname);
})();
