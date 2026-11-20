/* Scottish Country Attitude: product mock-ups.
   Draws a T-shirt, hoodie, cap, mug or tote bag in the chosen colour, puts the design on the print area,
   and (for proofs) adds a watermark across the whole picture. Everything is drawn in the browser. */

const MOCK_COLOURS = { White: '#ffffff', Grey: '#a3a8ab', Navy: '#1f2b47', Black: '#1c1c1c' };
const MOCK_DEFAULT = { mug: '#ffffff', bag: '#efe6d2' };

/* print area for each product, in a 400 x 400 drawing: x, y, width, height */
const MOCK_AREA = {
  tee:    { x: 138, y: 110, w: 124, h: 160 },
  hoodie: { x: 140, y: 118, w: 120, h: 125 },
  cap:    { x: 156, y: 152, w: 110, h: 80 },
  mug:    { x: 128, y: 150, w: 124, h: 130 },
  bag:    { x: 125, y: 185, w: 150, h: 150 },
};

function shade(hex, amt){
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function productSvg(product, hex){
  const dark = shade(hex, -38), darker = shade(hex, -70), line = hex === '#ffffff' ? '#c9c9c9' : shade(hex, -55);
  const defs = `<defs>
    <linearGradient id="lt" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".16"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <linearGradient id="vt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <radialGradient id="mg" cx=".35" cy=".4" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
  </defs>`;
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">${defs}<rect width="400" height="400" fill="#ffffff"/>${body}</svg>`;

  if(product === 'tee'){
    const body = 'M128 38 L62 66 L18 150 L74 178 L100 140 L100 372 Q200 382 300 372 L300 140 L326 178 L382 150 L338 66 L272 38 Q252 74 200 76 Q148 74 128 38 Z';
    return wrap(`
      <path d="${body}" fill="${hex}" stroke="${line}" stroke-width="2"/>
      <path d="${body}" fill="url(#lt)"/><path d="${body}" fill="url(#vt)"/>
      <path d="M128 38 Q148 74 200 76 Q252 74 272 38 Q256 58 200 62 Q144 58 128 38 Z" fill="${dark}"/>
      <path d="M128 38 Q148 74 200 76 Q252 74 272 38" fill="none" stroke="${darker}" stroke-width="3"/>
      <path d="M74 178 L100 140 M326 178 L300 140" stroke="${line}" stroke-width="2"/>
      <path d="M100 150 Q120 230 104 330 M300 150 Q280 230 296 330" stroke="#000" stroke-opacity=".06" stroke-width="10" fill="none"/>`);
  }
  if(product === 'hoodie'){
    const body = 'M138 46 L70 74 L28 252 L76 266 L106 158 L106 372 Q200 382 294 372 L294 158 L324 266 L372 252 L330 74 L262 46 Q236 98 200 98 Q164 98 138 46 Z';
    return wrap(`
      <path d="M134 50 Q138 2 200 2 Q262 2 266 50 Q246 100 200 100 Q154 100 134 50 Z" fill="${dark}" stroke="${line}" stroke-width="2"/>
      <path d="M152 52 Q160 22 200 22 Q240 22 248 52 Q232 88 200 88 Q168 88 152 52 Z" fill="${darker}"/>
      <path d="${body}" fill="${hex}" stroke="${line}" stroke-width="2"/>
      <path d="${body}" fill="url(#lt)"/><path d="${body}" fill="url(#vt)"/>
      <path d="M186 98 L184 150 M214 98 L216 150" stroke="${darker}" stroke-width="3" stroke-linecap="round"/>
      <path d="M134 270 L266 270 L282 346 L118 346 Z" fill="${dark}" fill-opacity=".35" stroke="${line}" stroke-width="2"/>
      <path d="M106 356 L294 356 M28 252 L76 266 M372 252 L324 266" stroke="${line}" stroke-width="3"/>`);
  }
  if(product === 'cap'){
    /* three-quarter view of a baseball cap, peak to the left */
    const crown = 'M96 262 Q92 120 212 112 Q328 116 334 262 Q214 248 96 262 Z';
    return wrap(`
      <path d="M110 250 Q52 248 16 282 Q22 300 70 298 Q120 292 170 270 Z" fill="${dark}" stroke="${line}" stroke-width="2"/>
      <path d="M26 286 Q70 270 150 262" stroke="${darker}" stroke-width="2" fill="none" stroke-dasharray="5 5"/>
      <path d="${crown}" fill="${hex}" stroke="${line}" stroke-width="2"/>
      <path d="${crown}" fill="url(#lt)"/><path d="${crown}" fill="url(#vt)"/>
      <path d="M212 112 Q160 150 140 256 M212 112 Q262 150 284 252 M212 112 Q230 180 226 250" stroke="${line}" stroke-width="2" fill="none"/>
      <circle cx="212" cy="114" r="9" fill="${dark}"/>
      <path d="M96 262 Q214 248 334 262" stroke="${darker}" stroke-width="5" fill="none"/>`);
  }
  if(product === 'mug'){
    return wrap(`
      <path d="M282 140 Q362 140 362 215 Q362 290 282 290" fill="none" stroke="${line}" stroke-width="26"/>
      <path d="M282 140 Q362 140 362 215 Q362 290 282 290" fill="none" stroke="${hex}" stroke-width="20"/>
      <path d="M108 110 L292 110 L292 330 Q292 352 270 352 L130 352 Q108 352 108 330 Z" fill="${hex}" stroke="${line}" stroke-width="2"/>
      <path d="M108 110 L292 110 L292 330 Q292 352 270 352 L130 352 Q108 352 108 330 Z" fill="url(#mg)"/>
      <ellipse cx="200" cy="110" rx="92" ry="14" fill="${shade(hex, -20)}" stroke="${line}" stroke-width="2"/>
      <ellipse cx="200" cy="112" rx="80" ry="9" fill="#5a3b25" fill-opacity=".85"/>`);
  }
  // tote bag
  return wrap(`
    <path d="M150 150 Q150 54 200 54 Q250 54 250 150" fill="none" stroke="${dark}" stroke-width="12"/>
    <path d="M86 140 L314 140 L326 370 L74 370 Z" fill="${hex}" stroke="${line}" stroke-width="2"/>
    <path d="M86 140 L314 140 L326 370 L74 370 Z" fill="url(#lt)"/>
    <path d="M88 156 L312 156" stroke="${line}" stroke-width="2" stroke-dasharray="6 5"/>
    <rect x="144" y="140" width="12" height="40" fill="${dark}"/><rect x="244" y="140" width="12" height="40" fill="${dark}"/>`);
}

function mockColourHex(product, colour){
  if(product === 'mug' || product === 'bag') return MOCK_DEFAULT[product];
  return MOCK_COLOURS[colour] || '#ffffff';
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawWatermark(ctx, size){
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.font = `bold ${Math.round(size / 26)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  const text = 'SCOTTISH COUNTRY ATTITUDE · PROOF ·';
  for(let y = -size; y <= size; y += size / 7){
    for(let x = -size; x <= size; x += size * 0.85){
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeText(text, x + (y / 3) % (size * 0.4), y);
      ctx.fillStyle = 'rgba(70,70,70,0.33)';
      ctx.fillText(text, x + (y / 3) % (size * 0.4), y);
    }
  }
  ctx.restore();
}

/* Draws a mock-up into a canvas (800 x 800). designSrc may be null (shows a "your design here" box). */
async function drawMockup(canvas, product, colour, designSrc, watermark){
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const svg = productSvg(product, mockColourHex(product, colour));
  const base = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(base, 0, 0, size, size);
  const k = size / 400, a = MOCK_AREA[product];
  if(designSrc){
    const img = await loadImage(designSrc);
    const scale = Math.min((a.w * k) / img.width, (a.h * k) / img.height);
    const w = img.width * scale, h = img.height * scale;
    const x = a.x * k + (a.w * k - w) / 2, y = a.y * k + (a.h * k - h) / 2;
    ctx.save();
    if(product === 'mug' || product === 'bag'){ ctx.globalAlpha = 0.96; }
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  } else {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 3;
    const hex = mockColourHex(product, colour);
    ctx.strokeStyle = (hex === '#1c1c1c' || hex === '#1f2b47') ? 'rgba(255,255,255,0.6)' : 'rgba(23,35,29,0.45)';
    ctx.strokeRect(a.x * k, a.y * k, a.w * k, a.h * k);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = `600 ${Math.round(size / 34)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Your design', (a.x + a.w / 2) * k, (a.y + a.h / 2) * k);
    ctx.restore();
  }
  if(watermark) drawWatermark(ctx, size);
  return canvas;
}

/* Makes a watermarked proof as a JPEG data URL (for emailing). */
async function makeProof(product, colour, designSrc){
  const c = document.createElement('canvas');
  c.width = c.height = 900;
  await drawMockup(c, product, colour, designSrc, true);
  return c.toDataURL('image/jpeg', 0.85);
}
