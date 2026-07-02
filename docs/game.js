// ─── Yazı Tura — Seri & Kasa ──────────────────────────────────────────────────
// Yeni tura başlamak (seri 0'dan ilk tahmin) kasadan $1 GİRİŞ ücreti alır.
// Doğru bildikçe seri (streak) büyür ve pot İKİYE KATLANIR: pot = 2^seri.
//   seri 1 → $2, seri 2 → $4, ... seri 8 → $256, seri 9 → $512
// İstediğin an ÇEKİL ile pot'u kasaya aktarırsın; yanılırsan pot gider.
// Başlangıç kasası $1'dır; kasa biterse otomatik $1'a tazelenir (kilitlenme yok).

// ─── TEMA ────────────────────────────────────────────────────────────────────
const THEME = {
  bg1:    '#0b1020',
  bg2:    '#131a33',
  gold:   '#f4c430',
  goldHi: '#ffe98a',
  goldLo: '#b8860b',
  edge:   '#8a6508',
  text:   '#f5f7ff',
  dim:    '#8b93b5',
  yazi:   '#4dabf7',
  tura:   '#ff6b6b',
  cash:   '#51cf66',   // Çekil
  ad:     '#ffa94d',   // bilgi/uyarı (turuncu)
  win:    '#51cf66',
  lose:   '#ff6b6b',
  potc:   '#ffd43b',   // pot rengi
};

// ─── EKONOMİ ─────────────────────────────────────────────────────────────────
const FLIP_COST = 1.00;   // yeni tura giriş ücreti (kasadan düşer)
// Pot her doğru tahminde ikiye katlanır: seri n → 2^n dolar.
function potAt(streak) { return streak <= 0 ? 0 : Math.pow(2, streak); }

// ─── DURUM ───────────────────────────────────────────────────────────────────
const KEY = 'yazitura_v2';

function defaultState() {
  return {
    kasa: 1,        // banka (USD) — kalıcı; başlangıçta $1 (ilk giriş ücreti)
    pot: 0,         // güncel tur birikimi
    streak: 0,      // güncel seri
    best: 0,        // en iyi seri
    total: 0,       // toplam atış
    wins: 0,        // doğru tahmin
    cashedOut: 0,   // ömür boyu çekilen toplam
  };
}

let S = load() || defaultState();
// kasa bittiyse tazele — giriş ücreti ödenemezse oyun kilitlenmesin
if (S.kasa < FLIP_COST && S.pot <= 0) S.kasa = FLIP_COST;
window.S = S; // menü (menu.js) durumu okuyabilsin

function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

// ─── CANVAS ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ─── OYUN AKIŞI ──────────────────────────────────────────────────────────────
let flip = null;   // { active, t, dur, chosen, result, won }
let toast = { msg: '', color: '', until: 0 };

function money(n) {
  n = Math.round(n);
  // binlik ayraç olarak nokta, $ sona: 32.746.736$
  const grouped = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + grouped + '$';
}
function showToast(msg, color) { toast = { msg, color, until: performance.now() + 1600 }; }

function startFlip(chosen) {
  if (flip && flip.active) return;
  // yeni tura başlıyorsa (seri 0) kasadan giriş ücreti al
  if (S.streak === 0) {
    if (S.kasa < FLIP_COST) {
      showToast('Kasa yetersiz!', THEME.lose);
      return;
    }
    S.kasa -= FLIP_COST;
    save();
    showToast('Giriş: -' + money(FLIP_COST) + ' kasadan', THEME.ad);
  }
  const result = Math.random() < 0.5 ? 'yazi' : 'tura';
  flip = { active: true, t: 0, dur: 500, chosen, result, won: chosen === result };
}

function finishFlip() {
  const f = flip;
  S.total++;
  if (f.won) {
    S.wins++;
    S.streak++;
    S.pot = potAt(S.streak);            // pot ikiye katlanır
    if (S.streak > S.best) S.best = S.streak;
    showToast('Doğru! Pot ' + money(S.pot), THEME.win);
  } else {
    S.streak = 0;
    S.pot = 0;
    if (S.kasa < FLIP_COST) {
      S.kasa = FLIP_COST; // batma yok: kasa tazelenir
      showToast('Yandın! Pot gitti • kasa tazelendi', THEME.lose);
    } else {
      showToast('Yandın! Pot gitti', THEME.lose);
    }
  }
  save();
  flip.active = false;
}

function cashOut() {
  if (flip && flip.active) return;
  if (S.pot <= 0) { showToast('Çekilecek pot yok', THEME.dim); return; }
  const amount = S.pot;
  S.kasa += amount;
  S.cashedOut += amount;
  S.pot = 0;
  S.streak = 0;
  save();
  // liderlik servisine skoru bildir (şimdilik dummy, fire-and-forget)
  if (window.Leaderboard) window.Leaderboard.submitScore({ best: S.best, kasa: S.kasa });
  showToast('Çekildin: +' + money(amount) + ' kasaya', THEME.cash);
}

// ─── DÜZEN ───────────────────────────────────────────────────────────────────
function layout() {
  const cx = W / 2;
  const sideM = 22;
  const colGap = 14;
  const btnH = Math.min(60, H * 0.075);
  const rowGap = 12;
  const bottomM = Math.max(26, H * 0.045);

  const btnW = (W - sideM * 2 - colGap) / 2;
  const leftX = sideM;
  const rightX = sideM + btnW + colGap;

  const row2Y = H - bottomM - btnH;          // Çekil (tam genişlik)
  const row1Y = row2Y - rowGap - btnH;       // Yazı / Tura

  const coinY = H * 0.44;
  const coinR = Math.min(W * 0.25, (row1Y - H * 0.26) * 0.5, 115);

  return { cx, sideM, btnW, btnH, leftX, rightX, row1Y, row2Y, coinY, coinR };
}

// ─── ÇİZİM ───────────────────────────────────────────────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCoin(cx, cy, r, scaleX, faceLabel) {
  ctx.save();
  ctx.translate(cx, cy);
  const w = Math.max(2, r * scaleX);

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, r + 24, w * 0.9, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const grad = ctx.createLinearGradient(-w, -r, w, r);
  grad.addColorStop(0, THEME.goldLo);
  grad.addColorStop(0.5, THEME.gold);
  grad.addColorStop(1, THEME.goldHi);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = THEME.edge;
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.82, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();

  if (scaleX > 0.35) {
    ctx.globalAlpha = Math.min(1, (scaleX - 0.35) / 0.3);
    ctx.fillStyle = '#5a4200';
    ctx.font = `700 ${Math.floor(r * 0.42)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(faceLabel, 0, 0);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawButton(x, y, w, h, label, sub, color, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  roundRect(x, y, w, h, 14);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.textAlign = 'center';
  if (sub) {
    ctx.font = `700 ${Math.floor(h * 0.30)}px 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x + w / 2, y + h * 0.44);
    ctx.font = `600 ${Math.floor(h * 0.22)}px 'Segoe UI', sans-serif`;
    ctx.fillText(sub, x + w / 2, y + h * 0.74);
  } else {
    ctx.font = `700 ${Math.floor(h * 0.34)}px 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  }
  ctx.restore();
}

function draw(now) {
  const L = layout();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, THEME.bg1);
  bg.addColorStop(1, THEME.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // başlık
  ctx.fillStyle = THEME.text;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.075, 32))}px 'Segoe UI', sans-serif`;
  ctx.fillText('YAZI TURA', L.cx, H * 0.075);

  // KASA (banka)
  ctx.fillStyle = THEME.dim;
  ctx.font = `600 ${Math.floor(Math.min(W * 0.034, 14))}px 'Segoe UI', sans-serif`;
  ctx.fillText('KASA', L.cx, H * 0.125);
  ctx.fillStyle = THEME.cash;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.10, 44))}px 'Segoe UI', sans-serif`;
  ctx.fillText(money(S.kasa), L.cx, H * 0.165);

  // seri / pot / kazanırsan pot
  const nextPot = potAt(S.streak + 1);
  ctx.font = `700 ${Math.floor(Math.min(W * 0.042, 17))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.potc;
  ctx.fillText(`Seri ${S.streak}   •   Pot ${money(S.pot)}`, L.cx, H * 0.215);
  ctx.font = `600 ${Math.floor(Math.min(W * 0.036, 14))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`Kazanırsan pot: ${money(nextPot)}   (Rekor seri: ${S.best})`, L.cx, H * 0.215 + 26);

  // para animasyonu
  let scaleX = 1, faceLabel = 'YAZI', bob = 0;
  if (flip) {
    const p = Math.min(flip.t / flip.dur, 1);
    const ang = p * Math.PI * 4;
    scaleX = Math.abs(Math.cos(ang));
    faceLabel = (Math.floor(ang / Math.PI) % 2 === 0) ? 'YAZI' : 'TURA';
    if (p >= 1) faceLabel = flip.result === 'tura' ? 'TURA' : 'YAZI';
    bob = -Math.sin(p * Math.PI) * (H * 0.10);
  }
  drawCoin(L.cx, L.coinY + bob, L.coinR, scaleX, faceLabel);

  // yönerge / durum
  const busy = flip && flip.active;
  ctx.font = `600 ${Math.floor(Math.min(W * 0.038, 15))}px 'Segoe UI', sans-serif`;
  const hintY = L.row1Y - 20;
  if (busy) {
    ctx.fillStyle = THEME.dim;
    ctx.fillText('Para havada...', L.cx, hintY);
  } else if (flip) {
    ctx.fillStyle = flip.won ? THEME.win : THEME.lose;
    const rName = flip.result === 'tura' ? 'TURA' : 'YAZI';
    ctx.fillText(`${rName} geldi — ${flip.won ? 'doğru!' : 'yandın'}`, L.cx, hintY);
  } else {
    ctx.fillStyle = THEME.dim;
    const hint = S.streak === 0
      ? `Bir taraf seç (giriş: ${money(FLIP_COST)} kasadan) • pot büyüdükçe çekilmeyi düşün`
      : 'Bir taraf seç • pot büyüdükçe çekilmeyi düşün';
    ctx.fillText(hint, L.cx, hintY);
  }

  // butonlar — satır 1: Yazı / Tura (yeni turda giriş ücreti göster)
  const newRound = S.streak === 0;
  const canFlip = !busy && (!newRound || S.kasa >= FLIP_COST);
  const flipSub = newRound ? '-' + money(FLIP_COST) : null;
  drawButton(L.leftX, L.row1Y, L.btnW, L.btnH, 'YAZI', flipSub, THEME.yazi, !canFlip);
  drawButton(L.rightX, L.row1Y, L.btnW, L.btnH, 'TURA', flipSub, THEME.tura, !canFlip);

  // butonlar — satır 2: Çekil (tam genişlik)
  const canCash = !busy && S.pot > 0;
  drawButton(L.leftX, L.row2Y, W - L.sideM * 2, L.btnH, 'ÇEKİL', money(S.pot), THEME.cash, !canCash);

  // toast
  if (toast.until > now) {
    const a = Math.min(1, (toast.until - now) / 400);
    ctx.globalAlpha = a;
    ctx.fillStyle = toast.color || THEME.text;
    ctx.font = `800 ${Math.floor(Math.min(W * 0.06, 26))}px 'Segoe UI', sans-serif`;
    ctx.fillText(toast.msg, L.cx, L.coinY - L.coinR - 34);
    ctx.globalAlpha = 1;
  }
}

// ─── DÖNGÜ ───────────────────────────────────────────────────────────────────
let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  if (flip && flip.active) {
    flip.t += dt;
    if (flip.t >= flip.dur) { flip.t = flip.dur; finishFlip(); }
  }
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─── GİRİŞ ───────────────────────────────────────────────────────────────────
function inRect(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }

function onTap(px, py) {
  const L = layout();
  if (inRect(px, py, L.leftX,  L.row1Y, L.btnW, L.btnH)) return startFlip('yazi');
  if (inRect(px, py, L.rightX, L.row1Y, L.btnW, L.btnH)) return startFlip('tura');
  if (inRect(px, py, L.leftX,  L.row2Y, W - L.sideM * 2, L.btnH)) return cashOut();
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  onTap(e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// klavye kısayolları (masaüstü): Y=yazı, T=tura, C=çekil
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'y') startFlip('yazi');
  else if (k === 't') startFlip('tura');
  else if (k === 'c') cashOut();
});
