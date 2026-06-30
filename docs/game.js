// ─── THEME / CONFIG ────────────────────────────────────────────────────────
const THEME = {
  color: '#ff9f43',      // parlak turuncu (vurgu)
  accent: '#ffd166',     // sarı (para birimi)
  text: '#fff7ec',       // krem beyaz (ana metin)
  textDim: '#c9b8a3',    // soluk krem (açıklama)
  bg: '#1a0d00',
  panel: '#241400',
  clickVerb: 'Pizza Pişir',
  // cps = tam sayı dilim/saniye
  buildings: [
    { id:'b0', icon:'chef',     name:'Çırak Aşçı',     desc:'Saniyede 1 dilim üretir.',   base:15,     cps:1    },
    { id:'b1', icon:'tomato',   name:'Domates Tarlası', desc:'Saniyede 5 dilim üretir.',    base:120,    cps:5    },
    { id:'b2', icon:'oven',     name:'Taş Fırın',       desc:'Saniyede 25 dilim üretir.',   base:700,    cps:25   },
    { id:'b3', icon:'delivery', name:'Dağıtım Ağı',     desc:'Saniyede 120 dilim üretir.',  base:3500,   cps:120  },
    { id:'b4', icon:'store',    name:'Şube',             desc:'Saniyede 600 dilim üretir.', base:18000,  cps:600  },
    { id:'b5', icon:'globe',    name:'Global Zincir',   desc:'Saniyede 3000 dilim üretir.', base:90000,  cps:3000 },
  ],
};

// ─── UTILS ─────────────────────────────────────────────────────────────────
const KEY = 'pizzaempire2024';
function xorEncrypt(str) {
  let out = '';
  for (let i = 0; i < str.length; i++)
    out += String.fromCharCode(str.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
  return btoa(unescape(encodeURIComponent(out)));
}
function xorDecrypt(enc) {
  try {
    const str = decodeURIComponent(escape(atob(enc)));
    let out = '';
    for (let i = 0; i < str.length; i++)
      out += String.fromCharCode(str.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
    return out;
  } catch { return null; }
}
function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return n.toString();
  const s = ['','K','M','B','T','Q'];
  const i = Math.min(Math.floor(Math.log10(n) / 3), s.length - 1);
  // 2 ondalık ile göster (1.01K, 1.02K gibi) — okunması kolay, zıplamaz
  return (n / Math.pow(1000, i)).toFixed(2) + s[i];
}
function lerp(a, b, t) { return a + (b - a) * t; }

let toast = { msg:'', until:0 };
function showToast(msg) {
  toast.msg = msg;
  toast.until = performance.now() + 2200;
}

// ─── GAME STATE ────────────────────────────────────────────────────────────
let G = null;
let cpsBuffer = 0; // kesirli üretim burada birikir, tam sayı olunca cookies'e aktarılır

function defaultState() {
  return {
    cookies: 0,        // her zaman tam sayı
    totalEarned: 0,    // her zaman tam sayı
    clickPower: 1,
    buildings: THEME.buildings.map(b => ({ id: b.id, count: 0 })),
    upgrades: {},
    lastSave: Date.now(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem('pizzaEmpireSave');
    if (!raw) return null;
    const dec = xorDecrypt(raw);
    if (!dec) return null;
    const obj = JSON.parse(dec);
    obj.cookies = Math.floor(obj.cookies);
    obj.totalEarned = Math.floor(obj.totalEarned || 0);
    return obj;
  } catch { return null; }
}

function saveState() {
  if (!G) return;
  G.lastSave = Date.now();
  localStorage.setItem('pizzaEmpireSave', xorEncrypt(JSON.stringify(G)));
}

function exportSave() { return xorEncrypt(JSON.stringify(G)); }

function importSave(code) {
  const dec = xorDecrypt(code.trim());
  if (!dec) return false;
  try {
    const obj = JSON.parse(dec);
    if (typeof obj.cookies !== 'number') return false;
    obj.cookies = Math.floor(obj.cookies);
    obj.totalEarned = Math.floor(obj.totalEarned || 0);
    G = obj;
    cpsBuffer = 0;
    saveState();
    return true;
  } catch { return false; }
}

// ─── UPGRADES ──────────────────────────────────────────────────────────────
function buildUpgrades() {
  const ups = [];
  THEME.buildings.forEach((b, bi) => {
    [10, 50, 200].forEach((req, ri) => {
      ups.push({
        id: `b${bi}_${req}`,
        name: `${b.name} Ustası ${ri + 1}`,
        desc: `${b.name} üretimini 2x artırır (${req} adet gerekli)`,
        icon: b.icon,
        cost: Math.ceil(b.base * req * 1.5),
        req: () => (G.buildings[bi]?.count ?? 0) >= req,
        apply: () => { bldgMulti[bi] = (bldgMulti[bi] || 1) * 2; },
      });
    });
  });
  [
    { id:'click_0', name:'Hızlı El',       desc:'Tıklama gücünü 2x artırır.', icon:'handFinger', cost:100,   multi:2 },
    { id:'click_1', name:'Usta Tıkçı',     desc:'Tıklama gücünü 3x artırır.', icon:'handFinger', cost:1000,  multi:3 },
    { id:'click_2', name:'Pizza Efsanesi', desc:'Tıklama gücünü 5x artırır.', icon:'stars',      cost:10000, multi:5 },
  ].forEach(u => {
    ups.push({ ...u, req: () => true, apply: () => { G.clickPower *= u.multi; } });
  });
  return ups;
}

let bldgMulti = [1,1,1,1,1,1];
let allUpgrades = [];

function rebuildUpgrades() {
  bldgMulti = [1,1,1,1,1,1];
  G.clickPower = 1; // baz değere döndür, sahip olunan yükseltmeler aşağıda yeniden uygulanır
  allUpgrades = buildUpgrades();
  allUpgrades.forEach(u => { if (G.upgrades[u.id]) u.apply(); });
}

function getCPS() {
  if (!G) return 0;
  return G.buildings.reduce((sum, b, i) =>
    sum + b.count * THEME.buildings[i].cps * (bldgMulti[i] || 1), 0);
}

function getBuildingCost(bi, extra=0) {
  return Math.ceil(THEME.buildings[bi].base * Math.pow(1.15, G.buildings[bi].count + extra));
}

// Mevcut dilimle kaç adet alınabilir + toplam fiyatı
function getMaxAffordable(bi) {
  let count = 0, total = 0, cookies = G.cookies;
  // %15 artışla fiyat hızla büyür, döngü logaritmik biter
  while (count < 100000) {
    const c = getBuildingCost(bi, count);
    if (cookies < c) break;
    cookies -= c; total += c; count++;
  }
  return { count, total };
}

// ─── CANVAS ────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('selectstart',e=>e.preventDefault());
canvas.addEventListener('dragstart',e=>e.preventDefault());
let W = 0, H = 0, DPR = 1, isMobile = false;
let safeTop = 0, safeBottom = 0;
// Probe element to read iOS safe-area insets (notch / Dynamic Island / home indicator).
const _safeProbe = document.createElement('div');
_safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;'
  + 'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
document.body.appendChild(_safeProbe);
function readSafeInsets() {
  const cs = getComputedStyle(_safeProbe);
  safeTop = parseFloat(cs.paddingTop) || 0;
  safeBottom = parseFloat(cs.paddingBottom) || 0;
}
let shopScrollY = 0, shopMaxScroll = 0;
let R = {};
let objScale = 1, objTargetScale = 1;
let floaters = [];
let shopItems = [], shopUpgradeItems = [], headerBtns = [];
let appMenu = { open:false, view:'home', buttons:[] };
const PIZZA_ICON_ROTATION = -0.08;

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  readSafeInsets();
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  isMobile = W < 640;
  if (isMobile) {
    R.header   = { x:0, y:0, w:W, h:54 + safeTop };
    R.game     = { x:0, y:0, w:W, h:H };
    R.shop     = { x:0, y:Math.round(H*0.52), w:W, h:Math.round(H*0.48) - safeBottom };
    R.clickArea= { x:W/2-60, y:70 + safeTop, w:120, h:120 };
    R.statsY   = 254 + safeTop;
  } else {
    const lw = Math.min(400, Math.round(W * 0.4));
    const top = 54 + safeTop;
    R.header   = { x:0, y:0, w:W, h:top };
    R.game     = { x:0, y:top, w:lw, h:H-top };
    R.shop     = { x:lw, y:top, w:W-lw, h:H-top-safeBottom };
    R.clickArea= { x:lw/2-75, y:top+60, w:150, h:150 };
    R.statsY   = top+290;
  }
}

function roundedRectPath(x,y,w,h,r) {
  const radii = Array.isArray(r) ? r : [r,r,r,r];
  const max = Math.min(Math.abs(w), Math.abs(h)) / 2;
  const tl = Math.min(Math.max(radii[0] || 0, 0), max);
  const tr = Math.min(Math.max(radii[1] || 0, 0), max);
  const br = Math.min(Math.max(radii[2] || 0, 0), max);
  const bl = Math.min(Math.max(radii[3] || 0, 0), max);
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}
function rr(x,y,w,h,r,fill,stroke) {
  roundedRectPath(x,y,w,h,r);
  if (fill)  { ctx.fillStyle=fill; ctx.fill(); }
  if (stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=1; ctx.stroke(); }
}
function dt(text,x,y,size,color,align='center',weight='normal') {
  ctx.font=`${weight} ${size}px 'Segoe UI',sans-serif`;
  ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.fillText(text,x,y);
}

function dtFit(text,x,y,maxWidth,size,color,align='center',weight='normal') {
  let fs = size;
  ctx.font=`${weight} ${fs}px 'Segoe UI',sans-serif`;
  while (fs > 9 && ctx.measureText(text).width > maxWidth) {
    fs -= 1;
    ctx.font=`${weight} ${fs}px 'Segoe UI',sans-serif`;
  }
  ctx.fillStyle=color; ctx.textAlign=align; ctx.textBaseline='middle';
  ctx.fillText(text,x,y);
}

function dtIconCentered(icon,label,cx,y,size,color,accent=THEME.accent) {
  const iconSize=size+2, gap=8;
  ctx.font=`800 ${size}px 'Segoe UI',sans-serif`;
  const textW=ctx.measureText(label).width;
  const totalW=iconSize+gap+textW;
  const start=cx-totalW/2;
  drawVectorIcon(icon,start+iconSize/2,y,iconSize,color,accent);
  dt(label,start+iconSize+gap,y,size,color,'left','800');
}

function drawVectorIcon(name,cx,cy,size,color='#fff7ec',accent=THEME.accent) {
  const s=size/24;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.scale(s,s);
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.lineWidth=2.4;
  ctx.strokeStyle=color;
  ctx.fillStyle=color;

  if(name==='save'){
    ctx.strokeRect(-8,-8,16,16);
    ctx.fillRect(-4,-8,7,5);
    ctx.beginPath(); ctx.moveTo(-4,4); ctx.lineTo(4,4); ctx.stroke();
  } else if(name==='export'){
    ctx.beginPath(); ctx.moveTo(0,8); ctx.lineTo(0,-6); ctx.moveTo(-5,-1); ctx.lineTo(0,-6); ctx.lineTo(5,-1); ctx.stroke();
    ctx.strokeRect(-8,2,16,8);
  } else if(name==='import'){
    ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(0,5); ctx.moveTo(-5,0); ctx.lineTo(0,5); ctx.lineTo(5,0); ctx.stroke();
    ctx.strokeRect(-8,2,16,8);
  } else if(name==='warning'){
    ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(9,8); ctx.lineTo(-9,8); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(0,3); ctx.moveTo(0,6); ctx.lineTo(0,6); ctx.stroke();
  } else if(name==='bolt'){
    ctx.beginPath(); ctx.moveTo(3,-10); ctx.lineTo(-5,2); ctx.lineTo(1,2); ctx.lineTo(-3,10); ctx.lineTo(7,-3); ctx.lineTo(1,-3); ctx.closePath();
    ctx.fillStyle=accent; ctx.fill();
  } else if(name==='pointer'){
    ctx.beginPath(); ctx.moveTo(-3,8); ctx.lineTo(-3,-6); ctx.quadraticCurveTo(-3,-10,1,-10); ctx.quadraticCurveTo(4,-10,4,-6); ctx.lineTo(4,-2); ctx.lineTo(9,1); ctx.lineTo(7,9); ctx.lineTo(-1,9); ctx.closePath(); ctx.stroke();
  } else if(name==='pinch'){
    ctx.beginPath(); ctx.arc(-4,-2,4,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3,-8); ctx.quadraticCurveTo(9,-3,5,5); ctx.stroke();
  } else if(name==='star'){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5, r=i%2?4:9;
      const x=Math.cos(a)*r, y=Math.sin(a)*r;
      if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fillStyle=accent; ctx.fill();
  } else if(name==='chef'){
    ctx.beginPath(); ctx.arc(0,-5,6,Math.PI,0); ctx.arc(-6,-3,3,Math.PI*0.7,Math.PI*1.8); ctx.arc(6,-3,3,Math.PI*1.2,Math.PI*0.3); ctx.fillStyle='#fff7ec'; ctx.fill();
    ctx.fillStyle=color; ctx.fillRect(-7,0,14,6);
    ctx.beginPath(); ctx.arc(0,8,4,0,Math.PI*2); ctx.fillStyle=accent; ctx.fill();
  } else if(name==='tomato'){
    ctx.beginPath(); ctx.arc(0,2,8,0,Math.PI*2); ctx.fillStyle='#e63946'; ctx.fill();
    ctx.strokeStyle='#7a120c'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(-5,-11); ctx.moveTo(0,-7); ctx.lineTo(5,-11); ctx.moveTo(0,-7); ctx.lineTo(0,-12); ctx.strokeStyle='#7bd88f'; ctx.stroke();
  } else if(name==='oven'){
    rr(-10,-6,20,15,3,'#5b2d0b','#ffd166');
    ctx.beginPath(); ctx.arc(0,4,6,Math.PI,0); ctx.lineTo(6,8); ctx.lineTo(-6,8); ctx.closePath(); ctx.fillStyle='#ff6b00'; ctx.fill();
  } else if(name==='delivery'){
    ctx.beginPath(); ctx.moveTo(-10,3); ctx.lineTo(3,3); ctx.lineTo(8,-2); ctx.lineTo(11,3); ctx.stroke();
    ctx.beginPath(); ctx.arc(-5,6,3,0,Math.PI*2); ctx.arc(7,6,3,0,Math.PI*2); ctx.stroke();
    ctx.fillRect(-9,-4,9,6);
  } else if(name==='store'){
    ctx.fillRect(-9,-1,18,10);
    ctx.strokeRect(-9,-1,18,10);
    ctx.beginPath(); ctx.moveTo(-10,-1); ctx.lineTo(-7,-8); ctx.lineTo(7,-8); ctx.lineTo(10,-1); ctx.stroke();
    ctx.strokeStyle=accent; ctx.beginPath(); ctx.moveTo(-3,9); ctx.lineTo(-3,2); ctx.lineTo(3,2); ctx.lineTo(3,9); ctx.stroke();
  } else if(name==='globe'){
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0,0,4,10,0,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(9,0); ctx.moveTo(-7,-5); ctx.lineTo(7,-5); ctx.moveTo(-7,5); ctx.lineTo(7,5); ctx.stroke();
  } else if(name==='build'){
    ctx.strokeRect(-8,-8,16,16);
    ctx.beginPath(); ctx.moveTo(-4,-8); ctx.lineTo(-4,8); ctx.moveTo(2,-8); ctx.lineTo(2,8); ctx.moveTo(-8,-2); ctx.lineTo(8,-2); ctx.stroke();
  } else if(name==='spark'){
    ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(2,-2); ctx.lineTo(9,0); ctx.lineTo(2,2); ctx.lineTo(0,10); ctx.lineTo(-2,2); ctx.lineTo(-9,0); ctx.lineTo(-2,-2); ctx.closePath(); ctx.fillStyle=accent; ctx.fill();
  }

  ctx.restore();
}

const SVG_ICON_MARKUP = {
  chef: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c1.918 0 3.52 1.35 3.91 3.151a4 4 0 0 1 2.09 7.723l0 7.126h-12v-7.126a4 4 0 1 1 2.092 -7.723a4 4 0 0 1 3.908 -3.151"/><path d="M6.161 17.009l11.839 -.009"/></svg>',
  tomato: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 7.4c4.7 0 8 3.1 8 7.2c0 4.3 -3.5 7.4 -8 7.4s-8 -3.1 -8 -7.4c0 -4.1 3.3 -7.2 8 -7.2z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8.2c-1.9 -2.4 -4.1 -3.1 -6.5 -2.1c2.4 .3 4.3 1.2 5.5 2.8" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.2c1.9 -2.4 4.1 -3.1 6.5 -2.1c-2.4 .3 -4.3 1.2 -5.5 2.8" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.4c-.5 -2.4 .1 -4.1 1.8 -5.4c-.1 2.1 -.5 3.9 -1.1 5.4" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  oven: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235"/></svg>',
  delivery: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M4 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M8 17h5a6 6 0 0 1 5 -5v-5a2 2 0 0 0 -2 -2h-1"/></svg>',
  store: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l18 0"/><path d="M3 7v1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1m0 1a3 3 0 0 0 6 0v-1h-18l2 -4h14l2 4"/><path d="M5 21l0 -10.15"/><path d="M19 21l0 -10.15"/><path d="M9 21v-4a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v4"/></svg>',
  globe: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M3.6 9h16.8"/><path d="M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18"/><path d="M12.5 3a17 17 0 0 1 0 18"/></svg>',
  handClick: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1 3 -2.5v2.5a1.5 1.5 0 0 1 3 -1.5v1.5a1.5 1.5 0 0 1 3 -.5v4.5a6 6 0 0 1 -6 6h-1.8a6 6 0 0 1 -5 -2.7l-.2 -.3c-.31 -.48 -1.41 -2.39 -3.29 -5.73a1.5 1.5 0 0 1 .54 -2.02a1.87 1.87 0 0 1 2.28 .28l1.47 1.47z" fill="#ffe8a3" stroke="#6b2b0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 11.5v-2" stroke="#d9941c" stroke-width="1.4" stroke-linecap="round"/><path d="M14 12v-1.5" stroke="#d9941c" stroke-width="1.4" stroke-linecap="round"/><path d="M17 12v-.5" stroke="#d9941c" stroke-width="1.4" stroke-linecap="round"/></svg>',
  handFinger: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5"/><path d="M11 11.5v-2a1.5 1.5 0 1 1 3 0v2.5"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"/></svg>',
  stars: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M17.8 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138"/><path d="M6.2 19.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138"/><path d="M12 9.817l-2.172 1.138a.392 .392 0 0 1 -.568 -.41l.415 -2.411l-1.757 -1.707a.389 .389 0 0 1 .217 -.665l2.428 -.352l1.086 -2.193a.392 .392 0 0 1 .702 0l1.086 2.193l2.428 .352a.39 .39 0 0 1 .217 .665l-1.757 1.707l.414 2.41a.39 .39 0 0 1 -.567 .411l-2.172 -1.138"/></svg>',
};
const svgIconCache = new Map();

function getSvgIconImage(name,color) {
  const key=name+'|'+color;
  if(svgIconCache.has(key))return svgIconCache.get(key);
  const raw=SVG_ICON_MARKUP[name];
  if(!raw)return null;
  const svg=raw.replaceAll('currentColor',color);
  const img=new Image();
  img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  svgIconCache.set(key,img);
  return img;
}

function drawSvgIcon(name,cx,cy,size,color='#fff7ec') {
  const img=getSvgIconImage(name,color);
  if(img&&img.complete&&img.naturalWidth){
    ctx.drawImage(img,cx-size/2,cy-size/2,size,size);
  } else {
    drawVectorIcon(name,cx,cy,size,color,THEME.accent);
  }
}

function drawIconBadge(icon,cx,cy,r,bg=THEME.color) {
  const offsetY = icon === 'stars' ? -2 : 0;
  ctx.save();
  ctx.globalAlpha=1;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle='#120700';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx,cy,r-3,0,Math.PI*2);
  ctx.fillStyle=bg;
  ctx.fill();
  ctx.strokeStyle='#fff1c2';
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx,cy,r-5,0,Math.PI*2);
  ctx.clip();
  drawSvgIcon(icon,cx,cy+offsetY,r*1.35,'#fff7ec');
  ctx.restore();
}

function drawBuildingBadge(bi,cx,cy,r) {
  drawIconBadge(THEME.buildings[bi].icon,cx,cy,r,THEME.color);
}

function drawUpgradeBadge(u,cx,cy,r) {
  drawIconBadge(u.icon,cx,cy,r,'#ffd166');
}

function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = THEME.bg; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = THEME.color + '14';
  for (let xi=0;xi<W;xi+=22) for (let yi=0;yi<H;yi+=22) ctx.fillRect(xi,yi,2,2);

  drawHeader();
  drawGamePanel();
  drawShopPanel();
  drawFloaters();
  drawAppMenu();
  drawToast();
}

function drawHeader() {
  rr(0,0,W,R.header.h,0,THEME.panel,null);
  ctx.fillStyle = THEME.color+'33'; ctx.fillRect(0,R.header.h-1,W,1);
  const my = safeTop + 27;

  headerBtns = [];
  const menuSize = 30;
  const menuX = 14;
  rr(menuX, my-menuSize/2, menuSize, menuSize, 7, THEME.color+'2e', THEME.color);
  ctx.strokeStyle = THEME.color;
  ctx.lineWidth = 2;
  for (let i=0;i<3;i++) {
    const y = my - 7 + i * 7;
    ctx.beginPath();
    ctx.moveTo(menuX + 8, y);
    ctx.lineTo(menuX + menuSize - 8, y);
    ctx.stroke();
  }
  headerBtns.push({x:menuX,y:my-menuSize/2,w:menuSize,h:menuSize,action:'menu'});

  ctx.save();
  ctx.translate(menuX+menuSize+18, my);
  ctx.rotate(PIZZA_ICON_ROTATION);
  drawPizzaSliceParticle(24);
  ctx.restore();
  dt('Pizza Empire', menuX+menuSize+34, my, 19, THEME.color,'left','800');

  const btns = isMobile
    ? [{icon:'save',label:'',a:'save'},{icon:'export',label:'',a:'export'},{icon:'import',label:'',a:'import'},{icon:'warning',label:'',a:'reset'}]
    : [{icon:'save',label:'Kaydet',a:'save'},{icon:'export',label:'Dışa Aktar',a:'export'},{icon:'import',label:'İçe Aktar',a:'import'},{icon:'warning',label:'Sıfırla',a:'reset'}];
  let bx = W-10;
  btns.slice().reverse().forEach(b => {
    const fs = isMobile?14:14;
    ctx.font=`700 ${fs}px 'Segoe UI',sans-serif`;
    const tw = isMobile ? 32 : ctx.measureText(b.label).width+42;
    bx -= tw;
    const isReset = b.a==='reset';
    rr(bx, my-15, tw, 30, 7, isReset?'#e74c3c33':THEME.color+'2e', isReset?'#ff6b5d':THEME.color);
    const iconColor = isReset?'#ff8a7d':THEME.text;
    if (isMobile) {
      drawVectorIcon(b.icon,bx+tw/2,my,18,iconColor,THEME.accent);
    } else {
      drawVectorIcon(b.icon,bx+16,my,17,iconColor,THEME.accent);
      dt(b.label, bx+30, my, fs, iconColor,'left','700');
    }
    headerBtns.push({x:bx,y:my-15,w:tw,h:30,action:b.a});
    bx -= 8;
  });
}

function drawGamePanel() {
  const g = R.game, ca = R.clickArea;
  const cx = g.x + g.w/2;

  const grd = ctx.createRadialGradient(ca.x+ca.w/2,ca.y+ca.h/2,8,ca.x+ca.w/2,ca.y+ca.h/2,95);
  grd.addColorStop(0, THEME.color+'55'); grd.addColorStop(1,'transparent');
  ctx.fillStyle=grd; ctx.beginPath();
  ctx.arc(ca.x+ca.w/2,ca.y+ca.h/2,95,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.translate(ca.x+ca.w/2, ca.y+ca.h/2);
  ctx.scale(objScale, objScale);
  ctx.rotate(PIZZA_ICON_ROTATION);
  drawPizzaSliceParticle(ca.w*0.72);
  ctx.restore();

  dt(THEME.clickVerb+'!', cx, ca.y+ca.h+18, 14, THEME.color,'center','700');

  const sy = R.statsY;
  dt(fmt(G.cookies), cx, sy, isMobile?40:50, THEME.text,'center','800');
  dt('dilim', cx, sy+(isMobile?34:42), isMobile?16:18, THEME.accent,'center','700');
  const statY=sy+(isMobile?62:74), statFs=isMobile?14:16;
  const cpsText=fmt(getCPS())+'/sn', clickText=fmt(G.clickPower);
  ctx.font=`600 ${statFs}px 'Segoe UI',sans-serif`;
  const totalW=18+6+ctx.measureText(cpsText).width+24+18+6+ctx.measureText(clickText).width;
  let sx=cx-totalW/2;
  ctx.save();
  ctx.translate(sx+9,statY);
  ctx.rotate(PIZZA_ICON_ROTATION);
  drawPizzaSliceParticle(16);
  ctx.restore();
  sx+=24;
  dt(cpsText,sx,statY,statFs,THEME.textDim,'left','600'); sx+=ctx.measureText(cpsText).width+24;
  drawSvgIcon('handClick',sx+9,statY,18,THEME.textDim); sx+=24;
  dt(clickText,sx,statY,statFs,THEME.textDim,'left','600');
}

function drawShopPanel() {
  const sp = R.shop;
  rr(sp.x,sp.y,sp.w,sp.h, isMobile?[14,14,0,0]:0, THEME.panel, null);
  ctx.fillStyle=THEME.color+'22';
  if (isMobile) ctx.fillRect(sp.x,sp.y,sp.w,1);
  else ctx.fillRect(sp.x,sp.y,1,sp.h);

  ctx.save();
  ctx.beginPath(); ctx.rect(sp.x,sp.y,sp.w,sp.h); ctx.clip();

  const pad=12, iw=sp.w-pad*2;
  const buttonInset=10;
  let iy = sp.y+pad-shopScrollY;
  shopItems=[]; shopUpgradeItems=[];

  dtIconCentered('build','ÜRETİCİLER', sp.x+sp.w/2, iy+10, 16, THEME.color, THEME.accent);
  iy+=30;

  const bh = isMobile?72:76;
  THEME.buildings.forEach((b,bi)=>{
    const cost=getBuildingCost(bi), canBuy=G.cookies>=cost, cnt=G.buildings[bi].count;
    const max=getMaxAffordable(bi);
    rr(sp.x+pad,iy,iw,bh-4,10, canBuy?THEME.color+'33':'#ffffff12', canBuy?THEME.color:'#ffffff33');
    const icx=sp.x+pad+28, icy=iy+bh/2-2;
    drawBuildingBadge(bi,icx,icy,22);
    dt(b.name, sp.x+pad+58, iy+18, isMobile?15:16,THEME.text,'left','700');
    dt(b.desc, sp.x+pad+58, iy+35, isMobile?12:13,THEME.textDim,'left');
    if (cnt>0) {
      const cw=34;
      rr(sp.x+pad+58, iy+bh-26, cw,18,5,THEME.accent,null);
      dt('x'+cnt, sp.x+pad+58+cw/2, iy+bh-17, 11,THEME.bg,'center','800');
    }
    // iki buton: BUY ve BUY MAX
    const gap=6, bw=isMobile?78:86, bhh=48;
    const bx2=sp.x+pad+iw-(bw*2+gap)-buttonInset, byBtn=iy+(bh-4-bhh)/2;
    // BUY
    rr(bx2, byBtn, bw, bhh, 7, canBuy?THEME.color:'#3a2c1a', null);
    dtFit('BUY '+fmt(cost), bx2+bw/2, byBtn+bhh/2, bw-8, 12, canBuy?'#2a1500':'#7a6a55','center','800');
    shopItems.push({x:bx2,y:byBtn+shopScrollY,w:bw,h:bhh,bi,mode:'one'});
    // BUY MAX
    const canMax=max.count>0;
    const bxMax=bx2+bw+gap;
    rr(bxMax, byBtn, bw, bhh, 7, canMax?THEME.accent:'#3a2c1a', null);
    dtFit('BUY MAX', bxMax+bw/2, byBtn+bhh/2, bw-8, 12, canMax?'#2a1500':'#7a6a55','center','800');
    shopItems.push({x:bxMax,y:byBtn+shopScrollY,w:bw,h:bhh,bi,mode:'max'});
    iy+=bh;
  });

  const avail = allUpgrades.filter(u=>!G.upgrades[u.id]&&u.req());
  if (avail.length) {
    iy+=10;
    dtIconCentered('spark','YÜKSELTMELER', sp.x+sp.w/2, iy+10, 16, THEME.accent, THEME.accent);
    iy+=30;
    avail.forEach(u=>{
      const canBuy=G.cookies>=u.cost;
      rr(sp.x+pad,iy,iw,54,10, canBuy?'#ffd16633':'#ffffff12', canBuy?'#ffd166':'#ffffff33');
      const uicx=sp.x+pad+26, uicy=iy+27;
      drawUpgradeBadge(u,uicx,uicy,20);
      dt(u.name, sp.x+pad+52, iy+17, isMobile?15:16,THEME.text,'left','700');
      dt(u.desc, sp.x+pad+48, iy+33, isMobile?12:13,THEME.textDim,'left');
      const bw=64, bx=sp.x+pad+iw-bw-buttonInset, by=iy+13;
      rr(bx,by,bw,28,8, canBuy?THEME.accent:'#3a2c1a', null);
      dt(fmt(u.cost), bx+bw/2, by+14, 12, canBuy?'#2a1500':'#7a6a55','center','800');
      shopUpgradeItems.push({x:bx,y:by+shopScrollY,w:bw,h:28,uid:u.id});
      iy+=60;
    });
  }

  shopMaxScroll = Math.max(0, iy+shopScrollY-sp.y-sp.h+16);
  ctx.restore();

  if (shopMaxScroll>0) {
    const th=sp.h-8, tbh=Math.max(28,th*(sp.h/(sp.h+shopMaxScroll)));
    const ty=sp.y+4+(shopScrollY/shopMaxScroll)*(th-tbh);
    rr(sp.x+sp.w-5,ty,3,tbh,2,THEME.color+'55',null);
  }
}

function drawPizzaSliceParticle(size) {
  const s = size;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.52);
  ctx.lineTo(-s * 0.42, s * 0.32);
  ctx.lineTo(s * 0.42, s * 0.32);
  ctx.closePath();
  ctx.fillStyle = '#3a1300';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.44);
  ctx.lineTo(-s * 0.31, s * 0.22);
  ctx.lineTo(s * 0.31, s * 0.22);
  ctx.closePath();
  ctx.fillStyle = '#ffd34f';
  ctx.fill();
  ctx.strokeStyle = '#7a2600';
  ctx.lineWidth = s * 0.08;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-s * 0.36, s * 0.26);
  ctx.quadraticCurveTo(0, s * 0.43, s * 0.36, s * 0.26);
  ctx.strokeStyle = '#7a2600';
  ctx.lineWidth = s * 0.22;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-s * 0.34, s * 0.25);
  ctx.quadraticCurveTo(0, s * 0.38, s * 0.34, s * 0.25);
  ctx.strokeStyle = '#d97918';
  ctx.lineWidth = s * 0.15;
  ctx.stroke();

  const toppings = [
    [-0.12, -0.1],
    [0.13, 0.04],
    [-0.02, 0.16],
  ];
  toppings.forEach(([tx, ty]) => {
    ctx.beginPath();
    ctx.arc(tx * s, ty * s, s * 0.085, 0, Math.PI * 2);
    ctx.fillStyle = '#d62828';
    ctx.fill();
    ctx.strokeStyle = '#7a120c';
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
  });
}

function drawFloaters() {
  floaters=floaters.filter(f=>f.life>0);
  floaters.forEach(f=>{
    ctx.save();
    ctx.globalAlpha=1;
    ctx.translate(f.x,f.y);
    ctx.rotate(f.rot);
    drawPizzaSliceParticle(f.size);
    ctx.restore();
    f.x+=f.vx; f.y+=f.vy; f.vy+=0.16; f.rot+=f.vr; f.life-=0.008;
  });
}

// ─── GAME LOOP ─────────────────────────────────────────────────────────────
function drawMenuButton(label, action, x, y, w, h, fill, textColor) {
  rr(x,y,w,h,8,fill,null);
  dt(label,x+w/2,y+h/2,14,textColor,'center','800');
  appMenu.buttons.push({x,y,w,h,action});
}

function drawWrappedText(text, x, y, maxWidth, size, color, lineHeight) {
  ctx.font=`400 ${size}px 'Segoe UI',sans-serif`;
  ctx.fillStyle=color; ctx.textAlign='left'; ctx.textBaseline='top';
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line,x,y);
      y += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    ctx.fillText(line,x,y);
    y += lineHeight;
  }
  return y;
}

function drawLegalMenu(title, paragraphs) {
  const pw=Math.min(W-28,460), ph=Math.min(H-70,430);
  const px=(W-pw)/2, py=Math.max(R.header.h+8,(H-ph)/2);
  appMenu.panel={x:px,y:py,w:pw,h:ph};
  rr(px,py,pw,ph,12,THEME.panel,THEME.color);
  dt(title,px+18,py+28,20,THEME.color,'left','800');
  let y=py+58;
  paragraphs.forEach(p=>{
    y=drawWrappedText(p,px+18,y,pw-36,isMobile?12:13,THEME.textDim,isMobile?17:18)+10;
  });
  drawMenuButton('Menü', 'home', px+18, py+ph-50, (pw-48)/2, 34, THEME.color, '#2a1500');
  drawMenuButton('Kapat', 'close', px+30+(pw-48)/2, py+ph-50, (pw-48)/2, 34, '#444', '#fff');
}

function drawAppMenu() {
  appMenu.buttons=[];
  appMenu.panel=null;
  if(!appMenu.open)return;

  ctx.fillStyle='#120700';
  ctx.fillRect(0,0,W,H);

  if(appMenu.view==='terms'){
    drawLegalMenu('Kullanım Şartları', [
      'Pizza Empire eğlence amaçlı bir tıklama oyunudur. Oyundaki ilerleme, üretim değerleri ve kayıtlar gerçek para ya da gerçek mal veya hizmet anlamına gelmez.',
      'Oyunu kullanarak kurallara uygun şekilde oynamayı, hatalardan yararlanarak sistemi kötüye kullanmamayı ve kendi cihazınızdaki kayıt kodlarını korumayı kabul edersiniz.',
      'Oyun olduğu gibi sunulur. Güncellemeler denge, görsel tasarım veya kayıt biçiminde değişiklik yapabilir.'
    ]);
    return;
  }
  if(appMenu.view==='privacy'){
    drawLegalMenu('Gizlilik Politikası', [
      'Pizza Empire bu sürümde hesap, konum, reklam takibi veya kişisel profil verisi toplamaz.',
      'Oyun ilerlemeniz cihaz depolamasında yerel olarak saklanır. Dışa aktardığınız kayıt kodunu paylaşmanız halinde kayıt içeriğini gören kişi oyundaki ilerlemenizi içe aktarabilir.',
      'App Store dağıtımı için bu metin gerçek destek bağlantısı ve App Store Connect gizlilik beyanıyla aynı tutulmalıdır.'
    ]);
    return;
  }
  if(appMenu.view==='support'){
    drawLegalMenu('Destek', [
      'Yardım, hata bildirimi veya kayıt sorunu için destek bağlantısı ya da e-posta adresi buraya yerleştirilmeli.',
      'App Store’a göndermeden önce bu bölüm gerçek ve çalışan bir destek adresiyle güncellenmelidir.'
    ]);
    return;
  }

  const pw=Math.min(W-28,390), ph=300;
  const px=(W-pw)/2, py=Math.max(R.header.h+12,(H-ph)/2);
  appMenu.panel={x:px,y:py,w:pw,h:ph};
  rr(px,py,pw,ph,12,THEME.panel,THEME.color);
  dt('Pizza Empire',px+20,py+30,22,THEME.color,'left','800');
  dt('Sürüm 1.0',px+20,py+56,12,THEME.textDim,'left','600');

  const bw=pw-40, bh=36;
  let by=py+82;
  drawMenuButton('Oyuna Başla', 'close', px+20, by, bw, bh, THEME.color, '#2a1500'); by+=46;
  drawMenuButton('Kullanım Şartları', 'terms', px+20, by, bw, bh, '#3a2c1a', THEME.text); by+=46;
  drawMenuButton('Gizlilik Politikası', 'privacy', px+20, by, bw, bh, '#3a2c1a', THEME.text); by+=46;
  drawMenuButton('Destek', 'support', px+20, by, bw, bh, '#3a2c1a', THEME.text);
  dt('Kayıtlar cihazınızda yerel olarak tutulur.',px+20,py+ph-22,12,THEME.textDim,'left','600');
}

function drawToast() {
  if(!toast.msg || performance.now() > toast.until)return;

  const padX=18, h=38, maxW=Math.min(W-24,420);
  let fs=14;
  ctx.font=`700 ${fs}px 'Segoe UI',sans-serif`;
  while(fs>10 && ctx.measureText(toast.msg).width > maxW-padX*2){
    fs-=1;
    ctx.font=`700 ${fs}px 'Segoe UI',sans-serif`;
  }
  const textW=ctx.measureText(toast.msg).width;
  const w=Math.round(Math.min(maxW,textW+padX*2));
  const x=Math.round(W/2-w/2);
  const y=Math.round(H-24-h);

  ctx.save();
  ctx.globalAlpha=1;
  rr(x,y,w,h,18,'#2c1500','#e67e22');
  dt(toast.msg,Math.round(x+w/2),Math.round(y+h/2),fs,'#f39c12','center','700');
  ctx.restore();
}

let lastTime=0;
function gameLoop(ts) {
  const dt2=Math.min((ts-lastTime)/1000,0.1); lastTime=ts;

  // kesirli üretimi tampona biriktir, sadece tam sayıyı cookies'e aktar
  cpsBuffer += getCPS() * dt2;
  if (cpsBuffer >= 1) {
    const whole = Math.floor(cpsBuffer);
    G.cookies += whole;
    G.totalEarned += whole;
    cpsBuffer -= whole;
  }

  objScale=lerp(objScale,objTargetScale,0.2);
  if (Math.abs(objScale-objTargetScale)<0.001){objScale=objTargetScale;if(objTargetScale>1)objTargetScale=1;}
  draw();
  requestAnimationFrame(gameLoop);
}

// ─── INPUT ─────────────────────────────────────────────────────────────────
function hitTest(r,x,y){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}

function handleAppMenuClick(cx,cy) {
  for(const b of appMenu.buttons) {
    if(hitTest(b,cx,cy)){
      if(b.action==='close') appMenu.open=false;
      else if(b.action==='home') appMenu.view='home';
      else appMenu.view=b.action;
      return true;
    }
  }
  if(appMenu.panel && !hitTest(appMenu.panel,cx,cy)){
    appMenu.open=false;
    return true;
  }
  return true;
}

function handleClick(cx,cy) {
  if(appMenu.open){handleAppMenuClick(cx,cy);return;}
  for(const b of headerBtns) if(hitTest(b,cx,cy)){handleAction(b.action);return;}
  const sp=R.shop;
  if(cx>=sp.x&&cx<=sp.x+sp.w&&cy>=sp.y&&cy<=sp.y+sp.h){
    handleShopClick(cx,cy);return;
  }
  const ca=R.clickArea;
  const dx=cx-(ca.x+ca.w/2), dy=cy-(ca.y+ca.h/2);
  if(Math.sqrt(dx*dx+dy*dy)<75) doClick(cx,cy);
}

function handleShopClick(cx,cy) {
  const sy=cy+shopScrollY;
  for(const item of shopItems)
    if(cx>=item.x&&cx<=item.x+item.w&&sy>=item.y&&sy<=item.y+item.h){
      if(item.mode==='max') buyMaxBuilding(item.bi); else buyBuilding(item.bi);
      return;
    }
  for(const item of shopUpgradeItems)
    if(cx>=item.x&&cx<=item.x+item.w&&sy>=item.y&&sy<=item.y+item.h){buyUpgrade(item.uid);return;}
}

function doClick(x,y){
  G.cookies+=G.clickPower; G.totalEarned+=G.clickPower;
  const side = Math.random()<0.5 ? -1 : 1;
  floaters.push({
    x, y,
    vx:side*(4+Math.random()*2),
    vy:-4-Math.random()*1.5,
    rot:side*0.4,
    vr:side*(0.018+Math.random()*0.025),
    size:44+Math.random()*8,
    life:1.45,
  });
  objTargetScale=0.78;
  setTimeout(()=>{objTargetScale=1.12;},80);
}
function buyBuilding(bi){
  const cost=getBuildingCost(bi);
  if(G.cookies<cost){showToast('Yeterli dilim yok!');return;}
  G.cookies-=cost; G.buildings[bi].count++;
  showToast(THEME.buildings[bi].name+' kiralandı!');
}
function buyMaxBuilding(bi){
  const {count,total}=getMaxAffordable(bi);
  if(count<1){showToast('Yeterli dilim yok!');return;}
  G.cookies-=total; G.buildings[bi].count+=count;
  showToast(count+' adet '+THEME.buildings[bi].name+' alındı!');
}
function buyUpgrade(uid){
  const u=allUpgrades.find(x=>x.id===uid);
  if(!u||G.upgrades[uid])return;
  if(G.cookies<u.cost){showToast('Yeterli dilim yok!');return;}
  G.cookies-=u.cost; G.upgrades[uid]=true; u.apply();
  showToast(u.name+' aktif!');
}

// scroll
canvas.addEventListener('wheel',e=>{
  const sp=R.shop;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left,my=e.clientY-rect.top;
  if(mx>=sp.x&&mx<=sp.x+sp.w&&my>=sp.y&&my<=sp.y+sp.h){
    shopScrollY=Math.max(0,Math.min(shopMaxScroll,shopScrollY+e.deltaY*0.5));
    e.preventDefault();
  }
},{passive:false});

let touchStartY=null,touchStartScroll=0,touchDragging=false,suppressNextClick=false;
canvas.addEventListener('touchstart',e=>{
  const t=e.touches[0];
  const rect=canvas.getBoundingClientRect();
  const tx=t.clientX-rect.left,ty=t.clientY-rect.top;
  const sp=R.shop;
  touchDragging=!appMenu.open&&tx>=sp.x&&tx<=sp.x+sp.w&&ty>=sp.y&&ty<=sp.y+sp.h;
  touchStartY=ty; touchStartScroll=shopScrollY;
},{passive:true});
canvas.addEventListener('touchmove',e=>{
  if(!touchDragging)return;
  const ty=e.touches[0].clientY-canvas.getBoundingClientRect().top;
  shopScrollY=Math.max(0,Math.min(shopMaxScroll,touchStartScroll+(touchStartY-ty)));
  e.preventDefault();
},{passive:false});
canvas.addEventListener('touchend',e=>{
  const t=e.changedTouches[0];
  const rect=canvas.getBoundingClientRect();
  const tx=t.clientX-rect.left,ty=t.clientY-rect.top;
  if(Math.abs(ty-touchStartY)<8){handleClick(tx,ty);suppressNextClick=true;}
  touchDragging=false;
});
canvas.addEventListener('click',e=>{
  if(suppressNextClick){suppressNextClick=false;return;}
  const rect=canvas.getBoundingClientRect();
  handleClick(e.clientX-rect.left,e.clientY-rect.top);
});

// ─── MODALS ────────────────────────────────────────────────────────────────
const overlay=document.getElementById('overlay');
const modalContent=document.getElementById('modalContent');
function showModal(html){modalContent.innerHTML=html;overlay.classList.remove('hidden');}
function closeModal(){overlay.classList.add('hidden');}
overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});

function handleAction(a){
  if(a==='menu'){appMenu.open=true;appMenu.view='home';}
  else if(a==='save'){saveState();showToast('Kaydedildi!');}
  else if(a==='export'){
    const code=exportSave();
    showModal(`<h2>Kayıt Kodu</h2>
      <p style="color:#aaa;font-size:.82rem;margin-bottom:10px">Kodu kopyalayıp saklayın:</p>
      <textarea id="etx" readonly>${code}</textarea>
      <div class="btn-row">
        <button class="mbtn green" onclick="doCopy()">Kopyala</button>
        <button class="mbtn gray" onclick="closeModal()">Kapat</button>
      </div>`);
    setTimeout(()=>{const ta=document.getElementById('etx');if(ta)ta.select();},80);
  }
  else if(a==='import'){
    showModal(`<h2>Kayıt Yükle</h2>
      <p style="color:#aaa;font-size:.82rem;margin-bottom:10px">Kayıt kodunu yapıştırın:</p>
      <textarea id="itx" placeholder="Kodu buraya yapıştırın..."></textarea>
      <div class="btn-row">
        <button class="mbtn blue" onclick="doImport()">Yükle</button>
        <button class="mbtn gray" onclick="closeModal()">İptal</button>
      </div>`);
  }
  else if(a==='reset'){
    showModal(`<h2 style="color:#e74c3c">Sıfırla</h2>
      <p style="color:#aaa;margin:12px 0">Tüm ilerlemeniz silinecek. Emin misiniz?</p>
      <div class="btn-row">
        <button class="mbtn red" onclick="doReset()">Evet, Sıfırla</button>
        <button class="mbtn gray" onclick="closeModal()">İptal</button>
      </div>`);
  }
}

window.doCopy=function(){
  const ta=document.getElementById('etx');if(!ta)return;
  navigator.clipboard.writeText(ta.value).then(()=>showToast('Kopyalandı!')).catch(()=>{
    ta.select();document.execCommand('copy');showToast('Kopyalandı!');
  });
};
window.doImport=function(){
  const ta=document.getElementById('itx');if(!ta)return;
  if(importSave(ta.value)){rebuildUpgrades();shopScrollY=0;closeModal();showToast('Kayıt yüklendi!');}
  else showToast('Geçersiz kayıt kodu!');
};
window.doReset=function(){
  G=defaultState();cpsBuffer=0;rebuildUpgrades();shopScrollY=0;saveState();closeModal();showToast('Sıfırlandı!');
};
window.closeModal=closeModal;

// ─── INIT ──────────────────────────────────────────────────────────────────
function init(){
  G = loadState() || defaultState();
  rebuildUpgrades();
  resize();
  window.addEventListener('resize',resize);
  // her saniye otomatik kayıt (rAF kısıtlamasından bağımsız)
  setInterval(saveState, 1000);
  // sekme kapanırken/gizlenirken de kaydet
  window.addEventListener('beforeunload', saveState);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
  requestAnimationFrame(ts=>{lastTime=ts;gameLoop(ts);});
}
init();
