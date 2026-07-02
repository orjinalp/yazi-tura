// ─── Yazı Tura ──────────────────────────────────────────────────────────────
// Canvas tabanlı basit yazı-tura (coin flip) oyunu.
// Oyuncu bir taraf seçer, para havaya atılır ve dönerek düşer.

// ─── TEMA ────────────────────────────────────────────────────────────────────
const THEME = {
  bg1:    '#0b1020',   // arka plan (üst)
  bg2:    '#131a33',   // arka plan (alt)
  gold:   '#f4c430',   // paranın ana rengi
  goldHi: '#ffe98a',   // para parlaklık
  goldLo: '#b8860b',   // para gölge
  edge:   '#8a6508',   // para kenarı
  text:   '#f5f7ff',   // ana metin
  dim:    '#8b93b5',   // soluk metin
  yazi:   '#4dabf7',   // Yazı butonu
  tura:   '#ff6b6b',   // Tura butonu
  win:    '#51cf66',   // kazanma
  lose:   '#ff6b6b',   // kaybetme
};

// ─── DURUM ───────────────────────────────────────────────────────────────────
const KEY = 'yazitura_v1';

function defaultState() {
  return {
    total: 0,       // toplam atış
    yaziCount: 0,   // gelen yazı sayısı
    turaCount: 0,   // gelen tura sayısı
    wins: 0,        // doğru tahmin
    streak: 0,      // güncel seri
    best: 0,        // en iyi seri
  };
}

let S = load() || defaultState();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
}

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
// flip: { active, t, dur, chosen('yazi'|'tura'), result('yazi'|'tura'), won }
let flip = null;
let lastResult = null;    // son sonucu paranın üstünde göstermek için
let toast = { msg: '', color: '', until: 0 };

function showToast(msg, color) {
  toast = { msg, color, until: performance.now() + 1600 };
}

function startFlip(chosen) {
  if (flip && flip.active) return;
  const result = Math.random() < 0.5 ? 'yazi' : 'tura';
  const won = chosen === result;
  flip = {
    active: true,
    t: 0,
    dur: 1500 + Math.random() * 400,
    chosen,
    result,
    won,
  };
}

function finishFlip() {
  const f = flip;
  S.total++;
  if (f.result === 'yazi') S.yaziCount++; else S.turaCount++;
  if (f.won) {
    S.wins++;
    S.streak++;
    if (S.streak > S.best) S.best = S.streak;
    showToast('Kazandın! 🎉', THEME.win);
  } else {
    S.streak = 0;
    showToast('Kaybettin', THEME.lose);
  }
  lastResult = f.result;
  save();
  flip.active = false;
}

// ─── DÜZEN (buton konumları) ─────────────────────────────────────────────────
function layout() {
  const cx = W / 2;
  const coinR = Math.min(W * 0.28, H * 0.19, 130);
  const coinY = H * 0.40;

  const btnW = Math.min((W - 60) / 2, 220);
  const btnH = 64;
  const btnGap = 20;
  const btnY = H - btnH - Math.max(40, H * 0.08);
  const yaziX = cx - btnGap / 2 - btnW;
  const turaX = cx + btnGap / 2;

  return { cx, coinR, coinY, btnW, btnH, btnY, yaziX, turaX };
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

// Parayı belirli bir "scaleX" (0..1) ile çizer — dönme yanılsaması için.
// faceLabel: paranın görünen yüzündeki yazı ('YAZI' / 'TURA')
function drawCoin(cx, cy, r, scaleX, faceLabel) {
  ctx.save();
  ctx.translate(cx, cy);

  const w = Math.max(2, r * scaleX);

  // gölge (yerde)
  const L = layout();
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(0, r + 26, w * 0.9, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // paranın gövdesi (elips = yandan görünüm)
  const grad = ctx.createLinearGradient(-w, -r, w, r);
  grad.addColorStop(0, THEME.goldLo);
  grad.addColorStop(0.5, THEME.gold);
  grad.addColorStop(1, THEME.goldHi);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
  ctx.fill();

  // kenar halkası
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = THEME.edge;
  ctx.stroke();

  // iç halka
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.82, r * 0.82, 0, 0, Math.PI * 2);
  ctx.stroke();

  // yüz yazısı — sadece para yeterince genişse okunur
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

function drawButton(x, y, w, h, label, color, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  roundRect(x, y, w, h, 16);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#0b1020';
  ctx.font = `700 ${Math.floor(h * 0.34)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function draw(now) {
  const L = layout();

  // arka plan
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, THEME.bg1);
  bg.addColorStop(1, THEME.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // başlık
  ctx.fillStyle = THEME.text;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.09, 40))}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YAZI TURA', L.cx, H * 0.10);

  // seri / istatistik satırı
  ctx.font = `600 ${Math.floor(Math.min(W * 0.038, 16))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`Seri: ${S.streak}   •   Rekor: ${S.best}   •   Atış: ${S.total}`, L.cx, H * 0.10 + 34);

  // para animasyonu
  let scaleX = 1, faceLabel = lastResult === 'tura' ? 'TURA' : 'YAZI', bob = 0;
  if (flip) {
    const p = Math.min(flip.t / flip.dur, 1);
    // ~7 yarım tur; scaleX = |cos| ile yassılaşıp genişler
    const turns = 7;
    const ang = p * Math.PI * turns;
    scaleX = Math.abs(Math.cos(ang));
    // hangi yüz görünüyor? çift yarım tur => başlangıç yüzü, tek => diğer
    const half = Math.floor(ang / Math.PI) % 2;
    faceLabel = half === 0 ? 'YAZI' : 'TURA';
    // son karede sonuç yüzünü sabitle
    if (p >= 1) faceLabel = flip.result === 'tura' ? 'TURA' : 'YAZI';
    // zıplama yüksekliği (parabol)
    bob = -Math.sin(p * Math.PI) * (H * 0.12);
  }
  drawCoin(L.cx, L.coinY + bob, L.coinR, scaleX, faceLabel);

  // butonlar
  const busy = flip && flip.active;
  drawButton(L.yaziX, L.btnY, L.btnW, L.btnH, 'YAZI', THEME.yazi, busy);
  drawButton(L.turaX, L.btnY, L.btnW, L.btnH, 'TURA', THEME.tura, busy);

  // yönerge / durum metni
  ctx.font = `600 ${Math.floor(Math.min(W * 0.04, 17))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.dim;
  const hintY = L.btnY - 26;
  if (!flip) {
    ctx.fillText('Bir taraf seç ve parayı at', L.cx, hintY);
  } else if (busy) {
    ctx.fillText('Para havada...', L.cx, hintY);
  } else {
    ctx.fillStyle = flip.won ? THEME.win : THEME.lose;
    const rName = flip.result === 'tura' ? 'TURA' : 'YAZI';
    ctx.fillText(`${rName} geldi — ${flip.won ? 'kazandın!' : 'kaybettin'}`, L.cx, hintY);
  }

  // yazı/tura dağılımı (alt bilgi)
  ctx.font = `500 ${Math.floor(Math.min(W * 0.033, 13))}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = THEME.dim;
  ctx.fillText(`Yazı: ${S.yaziCount}   Tura: ${S.turaCount}   Kazanma: ${S.wins}`, L.cx, H - 18);

  // toast
  if (toast.until > now) {
    const a = Math.min(1, (toast.until - now) / 400);
    ctx.globalAlpha = a;
    ctx.fillStyle = toast.color || THEME.text;
    ctx.font = `800 ${Math.floor(Math.min(W * 0.07, 30))}px 'Segoe UI', sans-serif`;
    ctx.fillText(toast.msg, L.cx, L.coinY - L.coinR - 40);
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
    if (flip.t >= flip.dur) {
      flip.t = flip.dur;
      finishFlip();
    }
  }

  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─── GİRİŞ ───────────────────────────────────────────────────────────────────
function hit(px, py) {
  const L = layout();
  if (px >= L.yaziX && px <= L.yaziX + L.btnW && py >= L.btnY && py <= L.btnY + L.btnH)
    return 'yazi';
  if (px >= L.turaX && px <= L.turaX + L.btnW && py >= L.btnY && py <= L.btnY + L.btnH)
    return 'tura';
  return null;
}

function onTap(px, py) {
  const choice = hit(px, py);
  if (choice) startFlip(choice);
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  onTap(e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// klavye kısayolu (masaüstü): Y = yazı, T = tura
window.addEventListener('keydown', (e) => {
  if (e.key === 'y' || e.key === 'Y') startFlip('yazi');
  if (e.key === 't' || e.key === 'T') startFlip('tura');
});
