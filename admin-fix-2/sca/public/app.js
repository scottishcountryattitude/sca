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
};
const catalogs = {};
['quotes','born','pets'].forEach(key=>{ catalogs[key] = defaultProducts[key].slice(); });

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

function productCard(p, collectionKey){
  const safeId = p.id.replace(/'/g,'');
  const safeName = p.name.replace(/'/g,'');
  const safeImg = (p.img||'').replace(/'/g,'');
  const delBtn = collectionKey
    ? `<button class="del-btn" title="Remove this image" onclick="event.stopPropagation();deleteDesign('${collectionKey}','${safeId}','${safeName}')">&times;</button>`
    : '';
  const swatch = p.img
    ? `<div class="swatch img" style="background-image:url('${p.img}');cursor:pointer;" onclick="onImageClick('${safeId}')">${delBtn}<span class="tag">Click image to order</span></div>`
    : `<div class="swatch" style="background:${p.color};cursor:pointer;" onclick="onImageClick('${safeId}')">${delBtn}<span class="mark">${p.name}</span><span class="tag">Click image to order</span></div>`;
  return `<div class="card">
    ${swatch}
    <div class="card-body">
      <h3>${p.name}</h3>
      <span class="price">from £${p.price.toFixed(2)}</span>
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
  document.getElementById('quotesGrid').innerHTML = catalogs.quotes.map(p=>productCard(p,'quotes')).join('');
  document.getElementById('bornGrid').innerHTML = catalogs.born.map(p=>productCard(p,'born')).join('');
  document.getElementById('petsGrid').innerHTML = catalogs.pets.map(p=>productCard(p,'pets')).join('');
  renderPetsBag();
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


/* ---------------- gift sets ---------------- */
const giftSets = [
  {name:'Mug + Cap', pieces:['mug','cap']},
  {name:'Cap + T-shirt', pieces:['cap','tee']},
  {name:'Mug + T-shirt', pieces:['mug','tee']},
  {name:'Cap + Mug + T-shirt', pieces:['cap','mug','tee']},
  {name:'Mug + Hoodie', pieces:['mug','hoodie']},
  {name:'Cap + Hoodie', pieces:['cap','hoodie']},
  {name:'Mug + Cap + T-Shirt + Hoodie', pieces:['mug','cap','tee','hoodie']},
  {name:'Cap + Mug + Hoodie', pieces:['cap','mug','hoodie']},
];
let giftState = {};
const giftPieceLabel = p => ({mug:'Mug', cap:'Cap', tee:'T-Shirt', hoodie:'Hoodie'})[p];

function giftPiecePrice(setIdx, piece){
  const st = (giftState[setIdx] && giftState[setIdx][piece]) || {};
  if(piece==='mug') return st.size ? mugPrices[st.size] : 0;
  if(piece==='cap') return prices.cap;
  if(piece==='tee' || piece==='hoodie') return st.style ? prices[piece + (st.style==='plain'?'Plain':'Imaged')] : 0;
  return 0;
}
function giftSetTotal(setIdx){
  return giftSets[setIdx].pieces.reduce((s,p)=>s+giftPiecePrice(setIdx,p),0);
}
function giftPieceComplete(setIdx, piece){
  const st = (giftState[setIdx] && giftState[setIdx][piece]) || {};
  if(piece==='mug') return !!st.size;
  if(piece==='cap') return !!st.color;
  if(piece==='tee' || piece==='hoodie') return !!st.style && !!st.size && !!st.color;
  return false;
}
function giftSetField(setIdx, piece, field, value){
  giftState[setIdx][piece][field] = value;
  renderOneGiftSet(setIdx);
}
function renderGiftPieceFields(setIdx, piece){
  const st = giftState[setIdx][piece] || (giftState[setIdx][piece] = {});
  let html = `<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--line);"><strong style="font-size:0.8rem;">${giftPieceLabel(piece)}</strong>`;
  if(piece==='mug'){
    html += `<select onchange="giftSetField(${setIdx},'mug','size',this.value)">
      <option value="">Choose size…</option>
      <option value="Standard (11oz)" ${st.size==='Standard (11oz)'?'selected':''}>Standard (11oz) — £${mugPrices['Standard (11oz)'].toFixed(2)}</option>
      <option value="Large (15oz)" ${st.size==='Large (15oz)'?'selected':''}>Large (15oz) — £${mugPrices['Large (15oz)'].toFixed(2)}</option>
    </select>`;
  } else if(piece==='cap'){
    const colorOpts = productColors.map(c=>`<option ${st.color===c?'selected':''}>${c}</option>`).join('');
    html += `<span style="font-size:0.78rem;display:block;margin:6px 0 4px;">£${prices.cap.toFixed(2)}</span>
      <select onchange="giftSetField(${setIdx},'cap','color',this.value)"><option value="">Choose colour…</option>${colorOpts}</select>`;
  } else {
    const plainP = prices[piece+'Plain'], imagedP = prices[piece+'Imaged'];
    html += `<select onchange="giftSetField(${setIdx},'${piece}','style',this.value)">
      <option value="">Choose style…</option>
      <option value="imaged" ${st.style==='imaged'?'selected':''}>Imaged (with this design) — £${imagedP.toFixed(2)}</option>
      <option value="plain" ${st.style==='plain'?'selected':''}>Plain (no print) — £${plainP.toFixed(2)}</option>
    </select>`;
    if(st.style){
      const colorOpts = productColors.map(c=>`<option ${st.color===c?'selected':''}>${c}</option>`).join('');
      const sizeOpts = productTypes[piece].sizes.map(s=>`<option ${st.size===s?'selected':''}>${s}</option>`).join('');
      html += `<label style="display:block;font-size:0.76rem;font-weight:600;margin:6px 0 2px;">Colour</label>
        <select onchange="giftSetField(${setIdx},'${piece}','color',this.value)"><option value="">Choose colour…</option>${colorOpts}</select>
        <label style="display:block;font-size:0.76rem;font-weight:600;margin:6px 0 2px;">Size</label>
        <select onchange="giftSetField(${setIdx},'${piece}','size',this.value)"><option value="">Choose size…</option>${sizeOpts}</select>`;
      if(st.style==='plain'){
        html += `<label style="display:block;font-size:0.76rem;margin-top:6px;"><input type="checkbox" ${st.logo?'checked':''} onchange="giftSetField(${setIdx},'${piece}','logo',this.checked)"> Add our company logo</label>`;
      }
    }
  }
  html += `</div>`;
  return html;
}
function renderOneGiftSet(setIdx){
  const g = giftSets[setIdx];
  const el = document.getElementById('giftCard'+setIdx);
  if(!el) return;
  const total = giftSetTotal(setIdx);
  const allDone = g.pieces.every(p=>giftPieceComplete(setIdx,p));
  el.innerHTML = `
    <h3>${g.name}</h3>
    <span class="pieces">${g.pieces.map(giftPieceLabel).join(' & ')}</span>
    <span class="price">£${total.toFixed(2)}</span>
    <label style="display:block;font-size:0.78rem;font-weight:600;margin:8px 0 4px;">Design</label>
    <select id="giftDesign${setIdx}">
      <option>Country Quote design</option>
      <option>Born Here Live Here Ride Here</option>
      <option>Scottish Pets design</option>
    </select>
    ${g.pieces.map(p=>renderGiftPieceFields(setIdx,p)).join('')}
    <button class="add-btn" style="width:100%;margin-top:10px;" ${allDone?'':'disabled'} onclick="addGiftSetToCart(${setIdx})">Add set — £${total.toFixed(2)}</button>`;
}
function addGiftSetToCart(setIdx){
  const g = giftSets[setIdx];
  const design = document.getElementById('giftDesign'+setIdx).value;
  const total = giftSetTotal(setIdx);
  const parts = g.pieces.map(p=>{
    const st = giftState[setIdx][p];
    if(p==='mug') return 'Mug ('+st.size+')';
    if(p==='cap') return 'Cap ('+st.color+')';
    const style = st.style==='plain' ? 'Plain'+(st.logo?' + logo':'') : 'Imaged';
    return giftPieceLabel(p)+' ('+style+', '+st.size+', '+st.color+')';
  }).join(', ');
  addToCart('g'+setIdx+'-'+Date.now(), g.name+' ('+design+') — '+parts, total, '', {k:'gift', setIdx, design, pieces: JSON.parse(JSON.stringify(giftState[setIdx]))});
  giftState[setIdx] = {};
  renderOneGiftSet(setIdx);
}
function renderGiftSets(){
  document.getElementById('giftGrid').innerHTML = giftSets.map((g,i)=>`<div class="giftset" id="giftCard${i}"></div>`).join('');
  giftSets.forEach((g,i)=>{ giftState[i] = {}; renderOneGiftSet(i); });
}

/* ---------------- studio / mock-up ---------------- */
let studioImage = null;
const productSVGs = {
  tee: `<svg viewBox="0 0 200 220"><path d="M60 10 L20 40 L35 65 L55 55 L55 200 L145 200 L145 55 L165 65 L180 40 L140 10 L120 25 L80 25 Z" fill="#fff" stroke="#17231d" stroke-width="3"/></svg>`,
  cap: `<svg viewBox="0 0 200 140"><path d="M30 90 Q100 30 170 90 L170 110 Q100 70 30 110 Z" fill="#fff" stroke="#17231d" stroke-width="3"/><path d="M20 100 L60 95 L58 115 L15 118 Z" fill="#fff" stroke="#17231d" stroke-width="3"/></svg>`,
  cowboy: `<svg viewBox="0 0 200 150"><ellipse cx="100" cy="110" rx="90" ry="18" fill="#fff" stroke="#17231d" stroke-width="3"/><path d="M55 105 Q60 30 100 30 Q140 30 145 105" fill="#fff" stroke="#17231d" stroke-width="3"/></svg>`,
  hoodie: `<svg viewBox="0 0 200 230"><path d="M60 20 L20 50 L35 75 L55 65 L55 210 L145 210 L145 65 L165 75 L180 50 L140 20 Q100 45 60 20 Z" fill="#fff" stroke="#17231d" stroke-width="3"/><circle cx="100" cy="35" r="14" fill="none" stroke="#17231d" stroke-width="3"/></svg>`,
  bag: `<svg viewBox="0 0 200 200"><rect x="35" y="60" width="130" height="120" rx="6" fill="#fff" stroke="#17231d" stroke-width="3"/><path d="M70 60 Q70 20 100 20 Q130 20 130 60" fill="none" stroke="#17231d" stroke-width="3"/></svg>`,
  mug: `<svg viewBox="0 0 200 180"><rect x="45" y="30" width="100" height="120" rx="8" fill="#fff" stroke="#17231d" stroke-width="3"/><path d="M145 60 Q185 60 185 95 Q185 130 145 130" fill="none" stroke="#17231d" stroke-width="3"/></svg>`,
};
function handleStudioUpload(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => { studioImage = e.target.result; renderMockStage(); document.getElementById('dropText').textContent = file.name + ' — tap to change'; };
  reader.readAsDataURL(file);
}
function renderMockStage(){
  const product = document.getElementById('studioProduct').value;
  const stage = document.getElementById('mockStage');
  stage.innerHTML = productSVGs[product];
  if(studioImage){
    const img = document.createElement('img');
    img.src = studioImage;
    img.className = 'placed-design';
    img.style.top = '38%';
    img.style.left = '50%';
    img.style.transform = 'translate(-50%,-50%)';
    stage.appendChild(img);
  }
}
function studioPrice(){
  const product = document.getElementById('studioProduct').value;
  const size = document.getElementById('studioSize').value;
  if(product==='mug') return mugPrices[size] || prices.mugSmall;
  if(product==='cap') return prices.cap;
  if(product==='tee') return prices.teeImaged;
  if(product==='hoodie') return prices.hoodieImaged;
  return 24.99;
}
function updateStudioFields(){
  const product = document.getElementById('studioProduct').value;
  const sizeField = document.getElementById('studioSizeField');
  const sizeSelect = document.getElementById('studioSize');
  if(product==='mug'){
    sizeField.style.display = '';
    sizeSelect.innerHTML = `<option>Standard (11oz)</option><option>Large (15oz)</option>`;
  } else if(product==='cap'){
    sizeField.style.display = 'none';
  } else {
    sizeField.style.display = '';
    sizeSelect.innerHTML = `<option>Small</option><option selected>Medium</option><option>Large</option><option>X-Large</option><option>2X-Large</option>`;
  }
  document.getElementById('studioLogoField').style.display = (product==='tee'||product==='hoodie') ? '' : 'none';
  document.getElementById('studioPriceLine').textContent = '£' + studioPrice().toFixed(2);
}
function addStudioToCart(){
  if(!studioImage){ alert('Upload a design first so we can show you the mock-up.'); return; }
  const product = document.getElementById('studioProduct').value;
  const size = document.getElementById('studioSize').value;
  const logo = document.getElementById('studioLogo').checked && (product==='tee'||product==='hoodie');
  const names = {tee:'Custom T-shirt', cap:'Custom Cap', cowboy:'Custom Cowboy Hat', hoodie:'Custom Hoodie', bag:'Custom Bag', mug:'Custom Mug'};
  const name = names[product] + (logo ? ' + company logo' : '');
  addToCart('custom-'+Date.now(), name, studioPrice(), product==='cap' ? '' : size, {k:'studio', product, size: product==='cap' ? '' : size, logo}, studioImage);
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
  const post = cart.length ? cartPostage(subtotal) : 0;
  const note = document.getElementById('ppNote');
  if(note){
    note.textContent = !cart.length ? 'Free postage on orders of £80 or more'
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
    if(sp.k === 'gift'){ const g = giftSets[sp.setIdx]; items += g ? g.pieces.length : 1; if(g && g.pieces.includes('hoodie')) hoodie = true; }
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
    const data = await postJSON('/api/checkout', {items});
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

function showPage(page){
  document.querySelectorAll('section.page').forEach(s=>s.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.page===page));
  window.scrollTo({top:0, behavior:'instant'});
  if(page === 'studio'){ renderMockStage(); updateStudioFields(); }
  if(page === 'reviews'){ renderReviews(); }
}

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
  ['quotes','born','pets'].forEach(k=>{ catalogs[k] = data.catalogs[k] || []; });
  if(data.prices) Object.assign(prices, data.prices);
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
  renderGrids(); renderGiftSets(); renderReviews(); updateStudioFields();
}

/* show the last copy of the shop straight away (works offline), then refresh from the server */
try{ applyShop(JSON.parse(localStorage.getItem('sca_shop_cache') || 'null')); }catch(e){}
renderGrids();
renderGiftSets();
updateCartUI();
renderReviews();
updateStudioFields();
setAdminUI();
loadShop();

/* coming back from Stripe */
(function(){
  const q = new URLSearchParams(location.search);
  if(q.get('paid') === '1'){
    cart = []; saveCart(); updateCartUI();
    document.getElementById('payTitle').textContent = 'Thank you — order received!';
    document.getElementById('payText').textContent = 'Your payment went through and your order is with us. We make every item to order, so please allow a little time before it is posted. Stripe will email your receipt.';
    document.getElementById('payModal').classList.add('open');
  } else if(q.get('cancelled') === '1'){
    openCart();
  }
  if(q.has('paid') || q.has('cancelled')) history.replaceState(null, '', location.pathname);
})();
