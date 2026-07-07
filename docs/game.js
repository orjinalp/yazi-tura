// ─── Yazı Tura — Üst Üste Bilme ──────────────────────────────────────────────
// Amaç mümkün olduğunca uzun doğru tahmin serisi yapmak.
// İlk doğru tahminden sonra reklam izleyerek tek kullanımlık kalkan alınabilir.
// Kalkan, o seri içindeki ilk yanılmada seriyi korur ve sonra tükenir.

// ─── TEMA ────────────────────────────────────────────────────────────────────
const THEME = {
  bg1:    '#1a2444',
  bg2:    '#2b3765',
  coinFace:   '#ffd15c',
  coinFaceHi: '#ffe08a',
  coinInner:  '#f2bd45',
  coinSide:   '#e08a2e',
  coinNotch:  '#c06a1a',
  coinRim:    '#d99a26',
  text:   '#f5f7ff',
  dim:    '#8b93b5',
  yazi:   '#4dabf7',
  tura:   '#ff6b6b',
  shield: '#74c0fc',
  shieldDark: '#1971c2',
  win:    '#51cf66',
  lose:   '#ff6b6b',
  accent: '#ffd43b',
};

// ─── DURUM ───────────────────────────────────────────────────────────────────
const KEY = 'yazitura_v3';
const LEGACY_KEY = 'yazitura_v2';

function defaultState() {
  return {
    streak: 0,
    best: 0,
    total: 0,
    wins: 0,
    shieldsBought: 0,
    shieldsUsed: 0,
    shieldReady: false,
    shieldOfferUsed: false,
  };
}

function asCount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalize(data) {
  const d = data || {};
  const s = defaultState();
  s.streak = asCount(d.streak);
  s.best = Math.max(asCount(d.best), s.streak);
  s.total = asCount(d.total);
  s.wins = asCount(d.wins);
  s.shieldsBought = asCount(d.shieldsBought);
  s.shieldsUsed = asCount(d.shieldsUsed);
  s.shieldReady = Boolean(d.shieldReady) && s.streak > 0;
  s.shieldOfferUsed = Boolean(d.shieldOfferUsed) || s.shieldReady;
  return s;
}

function load() {
  try {
    const current = JSON.parse(localStorage.getItem(KEY));
    if (current) return normalize(current);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (legacy) {
      return normalize({
        streak: legacy.streak,
        best: legacy.best,
        total: legacy.total,
        wins: legacy.wins,
      });
    }
  } catch (e) {}
  return null;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

let S = normalize(load());
window.S = S;
save();

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
let flip = null;
let toast = { msg: '', color: '', mode: 'plain', start: 0, until: 0 };
let shieldAdPending = false;

function showToast(msg, color, mode, dur) {
  const t0 = performance.now();
  toast = { msg, color, mode: mode || 'plain', start: t0, until: t0 + (dur || 1600) };
}

function canClaimShield() {
  return !shieldAdPending && S.streak > 0 && !S.shieldReady && !S.shieldOfferUsed;
}

function hasNativeRewardedAd() {
  return Boolean(
    window.webkit &&
    window.webkit.messageHandlers &&
    window.webkit.messageHandlers.rewardedAd
  );
}

function grantShieldReward() {
  if (!canClaimShield()) return;

  S.shieldReady = true;
  S.shieldOfferUsed = true;
  S.shieldsBought++;
  save();
  showToast('KALKAN HAZIR', THEME.shield, 'plain', 1400);
}

function requestRewardedShield() {
  if (!hasNativeRewardedAd()) {
    grantShieldReward();
    return;
  }

  shieldAdPending = true;
  showToast('REKLAM AÇILIYOR', THEME.shield, 'plain', 1200);

  try {
    window.webkit.messageHandlers.rewardedAd.postMessage({ action: 'claimShield' });
  } catch (e) {
    shieldAdPending = false;
    showToast('REKLAM AÇILAMADI', THEME.dim);
  }
}

window.ytRewardedAdResult = function (success, reason) {
  if (!shieldAdPending) return;

  shieldAdPending = false;

  if (success) {
    grantShieldReward();
    return;
  }

  const messages = {
    notReady: 'REKLAM HAZIR DEĞİL',
    dismissed: 'REKLAM TAMAMLANMADI',
    failed: 'REKLAM AÇILAMADI',
  };
  showToast(messages[reason] || 'REKLAM AÇILAMADI', THEME.dim);
};

function startFlip(chosen) {
  if (flip && flip.active) return;
  const result = Math.random() < 0.5 ? 'yazi' : 'tura';
  flip = {
    active: true, t: 0, dur: 500, chosen, result, won: chosen === result,
    driftX: (Math.random() * 2 - 1),
    spins:  1 + Math.floor(Math.random() * 2),
    dir:    Math.random() < 0.5 ? -1 : 1,
    wobble: (Math.random() * 2 - 1) * 0.6,
  };
}

function finishFlip() {
  const f = flip;
  S.total++;

  if (f.won) {
    S.wins++;
    S.streak++;
    if (S.streak > S.best) S.best = S.streak;
    if (window.Leaderboard) window.Leaderboard.recordStreak(S.streak);
    showToast('DOĞRU!', THEME.win, 'grow', 1000);
  } else if (S.shieldReady) {
    S.shieldReady = false;
    S.shieldsUsed++;
    showToast('KALKAN KORUDU', THEME.shield, 'grow', 1100);
  } else {
    S.streak = 0;
    S.shieldReady = false;
    S.shieldOfferUsed = false;
    showToast('YANILDIN', THEME.lose, 'fade', 1000);
  }

  save();
  flip.active = false;
}

function claimShield() {
  if (flip && flip.active) return;
  if (shieldAdPending) {
    showToast('REKLAM AÇILIYOR', THEME.shield);
    return;
  }
  if (S.shieldReady) {
    showToast('KALKAN HAZIR', THEME.shield);
    return;
  }
  if (S.shieldOfferUsed) {
    showToast('BU SERİDE KULLANILDI', THEME.dim);
    return;
  }
  if (S.streak <= 0) {
    showToast('ÖNCE 1 KEZ BİL', THEME.dim);
    return;
  }
  requestRewardedShield();
}

// ─── DÜZEN ───────────────────────────────────────────────────────────────────
function layout() {
  const cx = W / 2;
  const bottomM = Math.max(24, H * 0.04);

  const btnR = Math.min(W * 0.16, H * 0.10, 84);
  const shieldR = btnR * 0.62;
  const gap = Math.max(10, W * 0.03);
  const btnY = H - bottomM - btnR;
  const yaziX = cx - shieldR - gap - btnR;
  const turaX = cx + shieldR + gap + btnR;

  const btnTop = btnY - btnR;
  const coinY = H * 0.46;
  const coinR = Math.min(W * 0.25, (btnTop - H * 0.28) * 0.5, 115);

  return { cx, btnR, btnY, yaziX, turaX, shieldX: cx, shieldY: btnY, shieldR, coinY, coinR };
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

function drawCoin(cx, cy, r, sy, faceLabel, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot || 0);
  const h = Math.max(2, r * sy);
  const T = r * 0.30;

  ctx.fillStyle = THEME.coinSide;
  ctx.beginPath();
  ctx.ellipse(0, T, r, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-r, 0, r * 2, T);
  ctx.fill();

  ctx.strokeStyle = THEME.coinNotch;
  ctx.lineWidth = Math.max(2, r * 0.055);
  const N = 9;
  for (let i = 1; i < N; i++) {
    const t = (i / N) * Math.PI;
    const x = r * Math.cos(t);
    const y = h * Math.sin(t);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + T);
    ctx.stroke();
  }

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

  ctx.fillStyle = THEME.coinInner;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, h * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  if (sy > 0.30) {
    ctx.globalAlpha = Math.min(1, (sy - 0.30) / 0.3);
    ctx.fillStyle = '#a5690a';
    ctx.font = `700 ${Math.floor(r * 0.40)}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.scale(1, sy);
    ctx.fillText(faceLabel, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCoinButton(x, y, r, label, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

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

  ctx.fillStyle = THEME.coinInner;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = THEME.coinRim;
  ctx.stroke();

  ctx.fillStyle = '#a5690a';
  ctx.font = `700 ${Math.floor(r * 0.42)}px 'Segoe UI', sans-serif`;
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawShieldIcon(x, y, r, disabled) {
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  const grad = ctx.createLinearGradient(x, y - r, x, y + r);
  grad.addColorStop(0, '#a5d8ff');
  grad.addColorStop(1, THEME.shield);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.strokeStyle = THEME.shieldDark;
  ctx.stroke();

  ctx.fillStyle = '#0b1020';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.55);
  ctx.lineTo(x + r * 0.42, y - r * 0.34);
  ctx.lineTo(x + r * 0.34, y + r * 0.22);
  ctx.quadraticCurveTo(x, y + r * 0.62, x - r * 0.34, y + r * 0.22);
  ctx.lineTo(x - r * 0.42, y - r * 0.34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = THEME.shield;
  ctx.font = `800 ${Math.floor(r * 0.55)}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', x, y + r * 0.03);
  ctx.restore();
}

function drawShieldButton(x, y, r, label, disabled) {
  drawShieldIcon(x, y, r, disabled);
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.4;
  ctx.fillStyle = THEME.shield;
  ctx.font = `700 ${Math.floor(Math.min(W * 0.030, 12))}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + r + 15);
  ctx.restore();
}

function shieldLabel() {
  if (shieldAdPending) return 'REKLAM...';
  if (S.shieldReady) return 'KALKAN HAZIR';
  if (S.shieldOfferUsed) return 'KALKAN KULLANILDI';
  if (S.streak > 0) return 'REKLAMLA KALKAN';
  return '1 DOĞRU SONRA';
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

  ctx.fillStyle = THEME.text;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.075, 32))}px 'Segoe UI', sans-serif`;
  ctx.fillText('YAZI TURA', L.cx, H * 0.075);

  const busy = flip && flip.active;
  ctx.fillStyle = THEME.dim;
  ctx.font = `600 ${Math.floor(Math.min(W * 0.034, 14))}px 'Segoe UI', sans-serif`;
  ctx.fillText('ÜST ÜSTE', L.cx, H * 0.125);
  ctx.fillStyle = THEME.accent;
  ctx.font = `800 ${Math.floor(Math.min(W * 0.15, 64))}px 'Segoe UI', sans-serif`;
  ctx.fillText(String(S.streak), L.cx, H * 0.175);

  ctx.fillStyle = S.shieldReady ? THEME.shield : THEME.dim;
  ctx.font = `700 ${Math.floor(Math.min(W * 0.040, 16))}px 'Segoe UI', sans-serif`;
  const shieldState = S.shieldReady ? 'Kalkan hazır' : 'Rekor ' + S.best;
  ctx.fillText(shieldState, L.cx, H * 0.235);

  const TILT = 0.74;
  let sy = TILT, faceLabel = 'YAZI', bob = 0, dx = 0, rot = 0, air = 0;
  if (flip) {
    const p = Math.min(flip.t / flip.dur, 1);
    const ang = p * Math.PI * 4;
    faceLabel = (Math.floor(ang / Math.PI) % 2 === 0) ? 'YAZI' : 'TURA';
    if (p >= 1) faceLabel = flip.result === 'tura' ? 'TURA' : 'YAZI';
    air = Math.sin(p * Math.PI);
    sy = (TILT + (1 - TILT) * air) * Math.abs(Math.cos(ang));
    bob = -air * (H * 0.12);
    dx = air * flip.driftX * Math.min(18, W * 0.05);
    rot = flip.dir * p * Math.PI * 2 * flip.spins + air * flip.wobble;
  }

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

  drawCoinButton(L.yaziX, L.btnY, L.btnR, 'YAZI', busy);
  drawCoinButton(L.turaX, L.btnY, L.btnR, 'TURA', busy);
  drawShieldButton(L.shieldX, L.shieldY, L.shieldR, shieldLabel(), busy || !canClaimShield());

  if (toast.until > now) {
    const p = Math.min(1, (now - toast.start) / (toast.until - toast.start));
    let a = 1, scale = 1;
    if (toast.mode === 'in')        a = Math.min(1, (now - toast.start) / 300);
    else if (toast.mode === 'grow') { a = 1 - p; scale = 1 + p * 0.9; }
    else if (toast.mode === 'fade') a = 1 - p;
    else                            a = Math.min(1, (toast.until - now) / 400);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(L.cx, H * 0.275);
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
function inCircle(px, py, x, y, r) {
  const dx = px - x, dy = py - y;
  return dx * dx + dy * dy <= r * r;
}

function onTap(px, py) {
  const L = layout();
  if (inCircle(px, py, L.yaziX, L.btnY, L.btnR * 1.10)) return startFlip('yazi');
  if (inCircle(px, py, L.turaX, L.btnY, L.btnR * 1.10)) return startFlip('tura');
  if (inCircle(px, py, L.shieldX, L.shieldY, L.shieldR * 1.35)) return claimShield();
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  onTap(e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// Klavye kısayolları: Y=yazı, T=tura, K/R=kalkan.
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'y') startFlip('yazi');
  else if (k === 't') startFlip('tura');
  else if (k === 'k' || k === 'r') claimShield();
});
