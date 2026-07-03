// ─── Yazı Tura — Sunucu-otoriter API ─────────────────────────────────────────
// Oyunun atışı ve ekonomisi BURADA döner; client hiçbir tutar/skor göndermez.
// Böylece leaderboard client manipülasyonuna kapalıdır (bkz. README.md).
const express = require('express');
const crypto = require('crypto');
const store = require('./store');
const game = require('./game');

const PORT = process.env.PORT || 3000;
// Virgülle ayrık izinli origin listesi; '*' = herkes (yalnızca geliştirmede).
const ALLOWED = (process.env.ALLOWED_ORIGINS || '*')
  .split(',').map((s) => s.trim()).filter(Boolean);

store.load();

const app = express();
app.use(express.json({ limit: '8kb' }));   // küçük gövde limiti

// ── CORS (harici bağımlılık yok) ──
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Basit token-kova hız sınırı (bellekte) ──
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  return b.count <= max;
}
setInterval(() => {                              // eski kovaları temizle
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 60 * 1000).unref();

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'ip';
}
function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

// Bearer token'dan oyuncuyu çöz; yoksa 401.
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ error: 'no_token' });
  const p = store.getByTokenHash(sha256(m[1]));
  if (!p) return res.status(401).json({ error: 'bad_token' });
  if (!rateLimit('act:' + p.id, 60, 10 * 1000)) {   // 10 sn'de en fazla 60 aksiyon
    return res.status(429).json({ error: 'rate_limited' });
  }
  p.lastSeen = Date.now();
  req.player = p;
  next();
}

// ── Kayıt: anonim cihaz anahtarı üretir ──
app.post('/api/register', (req, res) => {
  if (!rateLimit('reg:' + clientIp(req), 20, 60 * 60 * 1000)) {  // IP başına saatte 20
    return res.status(429).json({ error: 'rate_limited' });
  }
  const token = crypto.randomBytes(32).toString('hex');   // 256-bit sır
  const id = crypto.randomBytes(9).toString('hex');
  const player = Object.assign(game.newPlayerState(), {
    id,
    tokenHash: sha256(token),
    name: 'Oyuncu-' + id.slice(0, 4),
    createdAt: Date.now(),
    lastSeen: Date.now(),
    lastAdAt: 0,
  });
  store.put(player);
  res.json({ playerId: id, token, state: game.publicState(player) });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ state: game.publicState(req.player) });
});

app.post('/api/flip', auth, (req, res) => {
  const out = game.applyFlip(req.player, (req.body || {}).choice);
  if (out.error) return res.status(400).json({ error: out.error });
  store.put(req.player);
  res.json({ result: out.result, won: out.won, state: game.publicState(req.player) });
});

app.post('/api/cashout', auth, (req, res) => {
  const out = game.applyCashout(req.player);
  if (out.error) return res.status(400).json({ error: out.error });
  store.put(req.player);
  res.json({ amount: out.amount, state: game.publicState(req.player) });
});

app.post('/api/ad', auth, (req, res) => {
  const out = game.applyAd(req.player, Date.now());
  if (out.error) return res.status(429).json({ error: out.error, retryInMs: out.retryInMs });
  store.put(req.player);
  res.json({ reward: out.reward, state: game.publicState(req.player) });
});

app.post('/api/name', auth, (req, res) => {
  let name = String((req.body || {}).name || '').replace(/[<>]/g, '').trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: 'empty_name' });
  req.player.name = name;
  store.put(req.player);
  res.json({ state: game.publicState(req.player) });
});

// ── Leaderboard: toplam kazanca (cashedOut) göre ──
app.get('/api/leaderboard', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const top = store.topByCashedOut(limit).map((p, i) => ({
    rank: i + 1, name: p.name, total: p.cashedOut,
  }));
  // İstek authlı ise çağıranın kendi sırasını da ekle
  let you = null;
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const p = store.getByTokenHash(sha256(m[1]));
    if (p) you = { rank: store.rankOf(p.id), name: p.name, total: p.cashedOut };
  }
  res.json({ top, you });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Yazı Tura API http://localhost:${PORT}  (origins: ${ALLOWED.join(', ')})`);
});
