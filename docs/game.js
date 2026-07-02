// ─── Yazı Tura — Seri & Kasa ──────────────────────────────────────────────────
// Yeni tura başlamak (seri 0'dan ilk tahmin) kasadan $1 GİRİŞ ücreti alır.
// Doğru bildikçe seri (streak) büyür ve pot İKİYE KATLANIR: pot = 2^seri.
//   seri 1 → $2, seri 2 → $4, ... seri 8 → $256, seri 9 → $512
// İstediğin an ÇEKİL ile pot'u kasaya aktarırsın; yanılırsan pot gider.
// REKLAM İZLE (dummy) kasaya +$1 ekler. Başlangıç kasası $1'dır.

// ─── TEMA ────────────────────────────────────────────────────────────────────
const THEME = {
  bg1:    '#1a2444',
  bg2:    '#2b3765',
  coinFace:   '#ffd15c',   // üst yüz — sarı altın
  coinFaceHi: '#ffe08a',   // üst yüz parlak kısım
  coinInner:  '#f2bd45',   // içteki çukur daire
  coinSide:   '#e08a2e',   // yan yüzey (silindir gövde) — turuncu
  coinNotch:  '#c06a1a',   // kenar çentikleri
  coinRim:    '#d99a26',   // dış çizgi / kabartma çerçeve
  text:   '#f5f7ff',
  dim:    '#8b93b5',
  yazi:   '#4dabf7',
  tura:   '#ff6b6b',
  cash:   '#51cf66',   // Çekil
  ad:     '#ffa94d',   // Reklam izle
  win:    '#51cf66',
  lose:   '#ff6b6b',
  potc:   '#ffd43b',   // pot rengi
};

// ─── EKONOMİ ─────────────────────────────────────────────────────────────────
const AD_REWARD = 1.00;   // reklam ödülü (dummy)
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
let toast = { msg: '', color: '', mode: 'plain', start: 0, until: 0 };
let adBtn = null;  // kasanın yanındaki reklam çipi (draw içinde hesaplanır)

function money(n) {
  n = Math.round(n);
  // binlik ayraç olarak nokta, $ sona: 32.746.736$
  const grouped = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + grouped + '$';
}
// mode: 'plain' = sonda kısa fade-out (varsayılan)
//       'in'    = fade-in ile gelir, süresi bitene/yenisi gelene dek kalır
//       'grow'  = büyüyerek fade-out (kazanma)
//       'fade'  = yerinde fade-out, büyümez (kaybetme)
function showToast(msg, color, mode, dur) {
  const t0 = performance.now();
  toast = { msg, color, mode: mode || 'plain', start: t0, until: t0 + (dur || 1600) };
}

function startFlip(chosen) {
  if (flip && flip.active) return;
  // yeni tura başlıyorsa (seri 0) kasadan giriş ücreti al
  if (S.streak === 0) {
    if (S.kasa < FLIP_COST) {
      showToast('Kasa yetersiz! Reklam izle: +' + money(AD_REWARD), THEME.lose);
      return;
    }
    S.kasa -= FLIP_COST;
    save();
    showToast('-' + money(FLIP_COST), THEME.ad, 'in', 2000);
  }
  const result = Math.random() < 0.5 ? 'yazi' : 'tura';
  flip = {
    active: true, t: 0, dur: 500, chosen, result, won: chosen === result,
    // 3B savrulma parametreleri — her atışta rastgele
    driftX: (Math.random() * 2 - 1),              // yatay savrulma oranı (-1..1)
    spins:  1 + Math.floor(Math.random() * 2),    // havada takla sayısı (1-2)
    dir:    Math.random() < 0.5 ? -1 : 1,         // takla yönü
    wobble: (Math.random() * 2 - 1) * 0.6,        // eksen yalpası (radyan)
  };
}

function finishFlip() {
  const f = flip;
  S.total++;
  if (f.won) {
    S.wins++;
    S.streak++;
    S.pot = potAt(S.streak);            // pot ikiye katlanır
    if (S.streak > S.best) S.best = S.streak;
    showToast('KAZANDIN!', THEME.win, 'grow', 1000);
  } else {
    S.streak = 0;
    S.pot = 0;
    showToast('KAYBETTİN', THEME.lose, 'fade', 1000);
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
  showToast('+' + money(amount), THEME.cash, 'grow', 1000);
}

function watchAd() {
  if (flip && flip.active) return;
  S.kasa += AD_REWARD;
  save();
  showToast('Reklam ödülü: +' + money(AD_REWARD), THEME.ad);
}

// ─── DÜZEN ───────────────────────────────────────────────────────────────────
function layout() {
  const cx = W / 2;
  const bottomM = Math.max(24, H * 0.04);

  // alt sıra: iki coin buton (YAZI / TURA), ortalarında $ (ÇEKİL)
  const btnR = Math.min(W * 0.16, H * 0.10, 84);   // coin buton yarıçapı
  const cashR = btnR * 0.62;                        // $ butonu yarıçapı
  const gap = Math.max(10, W * 0.03);
  const btnY = H - bottomM - btnR;
  const yaziX = cx - cashR - gap - btnR;
  const turaX = cx + cashR + gap + btnR;

  const btnTop = btnY - btnR;
  const coinY = H * 0.44;
  const coinR = Math.min(W * 0.25, (btnTop - H * 0.26) * 0.5, 115);

  return { cx, btnR, btnY, yaziX, turaX, cashX: cx, cashY: btnY, cashR, coinY, coinR };
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

// sy: dikey basıklık (perspektif) — 1 = tam yüz, küçüldükçe yatık/yan görünüm.
// Para kalın bir silindir: sarı üst yüz + turuncu gövde + kenar çentikleri.
function drawCoin(cx, cy, r, sy, faceLabel, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  const h = Math.max(2, r * sy);   // üst yüz elipsinin dikey yarıçapı
  const T = r * 0.30;              // paranın kalınlığı (gövde yüksekliği)

  // ── yan yüzey: alt kapak + gövde ──
  ctx.fillStyle = THEME.coinSide;
  ctx.beginPath();
  ctx.ellipse(0, T, r, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-r, 0, r * 2, T);
  ctx.fill();

  // çentikler — gövde üzerinde dikey çizgiler
  ctx.strokeStyle = THEME.coinNotch;
  ctx.lineWidth = Math.max(2, r * 0.055);
  const N = 9;
  for (let i = 1; i < N; i++) {
    const t = (i / N) * Math.PI;         // ön (alt) yarım elips boyunca
    const x = r * Math.cos(t);
    const y = h * Math.sin(t);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + T);
    ctx.stroke();
  }

  // ── üst yüz ──
  const grad = ctx.createLinearGradient(0, -h, 0, h);
  grad.addColorStop(0, THEME.coinFaceHi);
  grad.addColorStop(1, THEME.coinFace);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  // içteki çukur daire (kabartma çerçeve)
  ctx.fillStyle = THEME.coinInner;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, h * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  // yüz yazısı
  if (sy > 0.30) {
    ctx.globalAlpha = Math.min(1, (sy - 0.30) / 0.3);
    ctx.fillStyle = '#a5690a';
    ctx.font = `700 ${Math.floor(r * 0.40)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.scale(1, sy); // yazı da perspektifle bassın
    ctx.fillText(faceLabel, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Tam ekrana bakan (90°, perspektifsiz) coin şeklinde buton.
// Ortadaki 3B para ile aynı malzeme: sarı yüz, çukur daire, kabartma çerçeve.
function drawCoinButton(x, y, r, label, sub, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // sarı yüz
  const grad = ctx.createLinearGradient(x, y - r, x, y + r);
  grad.addColorStop(0, THEME.coinFaceHi);
  grad.addColorStop(1, THEME.coinFace);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  // içteki çukur daire
  ctx.fillStyle = THEME.coinInner;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  // yüz yazısı (+ yeni turda giriş ücreti)
  ctx.fillStyle = '#a5690a';
  if (sub) {
    ctx.font = `700 ${Math.floor(r * 0.38)}px 'Segoe UI', sans-serif`;
    ctx.fillText(label, x, y - r * 0.12);
    ctx.fillStyle = '#c06a1a';
    ctx.font = `700 ${Math.floor(r * 0.26)}px 'Segoe UI', sans-serif`;
    ctx.fillText(sub, x, y + r * 0.32);
  } else {
    ctx.font = `700 ${Math.floor(r * 0.42)}px 'Segoe UI', sans-serif`;
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

// Yuvarlak yeşil $ butonu — ÇEKİL.
function drawCashButton(x, y, r, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  ctx.fillStyle = THEME.cash;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.strokeStyle = '#2f9e44';
  ctx.stroke();
  ctx.fillStyle = '#0b1020';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.floor(r * 1.15)}px 'Segoe UI', sans-serif`;
  ctx.fillText('$', x, y + r * 0.04);
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
  const busy = flip && flip.active;
  ctx.fillStyle = THEME.dim;
  ctx.font = `600 ${Math.floor(Math.min(W * 0.034, 14))}px 'Segoe UI', sans-serif`;
  ctx.fillText('KASA', L.cx, H * 0.125);
  ctx.fillStyle = THEME.cash;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.10, 44))}px 'Segoe UI', sans-serif`;
  ctx.fillText(money(S.kasa), L.cx, H * 0.165);

  // reklam çipi — kasanın hemen yanında, +1$ ekler
  const kasaW = ctx.measureText(money(S.kasa)).width;
  const chipH = Math.min(34, H * 0.045);
  const chipW = chipH * 2.2;
  adBtn = { x: L.cx + kasaW / 2 + 12, y: H * 0.165 - chipH / 2, w: chipW, h: chipH };
  drawButton(adBtn.x, adBtn.y, adBtn.w, adBtn.h, '📺 +1$', null, THEME.ad, busy);

  // pot
  ctx.font = `700 ${Math.floor(Math.min(W * 0.042, 17))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.potc;
  ctx.fillText(`Pot ${money(S.pot)}`, L.cx, H * 0.215);

  // para animasyonu — yukarı fırlar, yatay eksende takla atar; sağa-sola en
  // fazla azıcık kayar. Yerdeyken perspektifli (yatık) durur.
  const TILT = 0.74;   // yerde duran paranın dikey basıklığı (1 = tam yüz)
  let sy = TILT, faceLabel = 'YAZI', bob = 0, dx = 0, rot = 0, air = 0;
  if (flip) {
    const p = Math.min(flip.t / flip.dur, 1);
    const ang = p * Math.PI * 4;
    faceLabel = (Math.floor(ang / Math.PI) % 2 === 0) ? 'YAZI' : 'TURA';
    if (p >= 1) faceLabel = flip.result === 'tura' ? 'TURA' : 'YAZI';
    air = Math.sin(p * Math.PI);                    // 0 → 1 → 0 (havadalık)
    // yatay eksen etrafında takla (dikey basıklık); sonda yine yatık oturur
    sy = (TILT + (1 - TILT) * air) * Math.abs(Math.cos(ang));
    bob = -air * (H * 0.12);
    dx = air * flip.driftX * Math.min(18, W * 0.05); // azıcık sağ / azıcık sol
    rot = flip.dir * p * Math.PI * 2 * flip.spins   // takla: sonda tam tur = düz
        + air * flip.wobble;                        // havadayken eksen yalpası
  }

  // gölge — yerde sabit; para yükseldikçe küçülür ve solar (derinlik hissi)
  ctx.save();
  ctx.globalAlpha = 0.38 * (1 - air * 0.6);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(L.cx + dx, L.coinY + L.coinR * (TILT + 0.30) + 12,
              L.coinR * (0.9 - air * 0.35), L.coinR * 0.15 * (1 - air * 0.4),
              0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawCoin(L.cx + dx, L.coinY + bob, L.coinR, sy, faceLabel, rot);

  // butonlar — iki coin: YAZI / TURA (yeni turda giriş ücreti göster)
  const newRound = S.streak === 0;
  const canFlip = !busy && (!newRound || S.kasa >= FLIP_COST);
  const flipSub = newRound ? '-' + money(FLIP_COST) : null;
  drawCoinButton(L.yaziX, L.btnY, L.btnR, 'YAZI', flipSub, !canFlip);
  drawCoinButton(L.turaX, L.btnY, L.btnR, 'TURA', flipSub, !canFlip);

  // ortada $ butonu: ÇEKİL — altında pot tutarı
  const canCash = !busy && S.pot > 0;
  drawCashButton(L.cashX, L.cashY, L.cashR, !canCash);
  ctx.save();
  if (!canCash) ctx.globalAlpha = 0.4;
  ctx.fillStyle = THEME.cash;
  ctx.font = `700 ${Math.floor(Math.min(W * 0.032, 13))}px 'Segoe UI', sans-serif`;
  ctx.fillText(canCash ? 'ÇEKİL ' + money(S.pot) : 'ÇEKİL', L.cashX, L.cashY + L.cashR + 15);
  ctx.restore();

  // toast / duyuru — pot yazısının hemen altında
  if (toast.until > now) {
    const p = Math.min(1, (now - toast.start) / (toast.until - toast.start));
    let a = 1, scale = 1;
    if (toast.mode === 'in')        a = Math.min(1, (now - toast.start) / 300);
    else if (toast.mode === 'grow') { a = 1 - p; scale = 1 + p * 0.9; }
    else if (toast.mode === 'fade') a = 1 - p;
    else                            a = Math.min(1, (toast.until - now) / 400);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(L.cx, H * 0.215 + 34);
    ctx.scale(scale, scale);
    ctx.fillStyle = toast.color || THEME.text;
    ctx.font = `800 ${Math.floor(Math.min(W * 0.06, 26))}px 'Segoe UI', sans-serif`;
    ctx.fillText(toast.msg, 0, 0);
    ctx.restore();
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
function inCircle(px, py, x, y, r) { const dx = px - x, dy = py - y; return dx * dx + dy * dy <= r * r; }

function onTap(px, py) {
  const L = layout();
  if (inCircle(px, py, L.yaziX, L.btnY, L.btnR * 1.10)) return startFlip('yazi');
  if (inCircle(px, py, L.turaX, L.btnY, L.btnR * 1.10)) return startFlip('tura');
  if (inCircle(px, py, L.cashX, L.cashY, L.cashR * 1.25)) return cashOut();
  if (adBtn && inRect(px, py, adBtn.x, adBtn.y, adBtn.w, adBtn.h)) return watchAd();
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  onTap(e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// klavye kısayolları (masaüstü): Y=yazı, T=tura, C=çekil, R=reklam
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'y') startFlip('yazi');
  else if (k === 't') startFlip('tura');
  else if (k === 'c') cashOut();
  else if (k === 'r') watchAd();
});
