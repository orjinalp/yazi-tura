// ─── Kalıcılık: atomik JSON dosya deposu ─────────────────────────────────────
// Hobi ölçeği için yeterli; native bağımlılık yok, her yere deploy edilir.
// Yazımlar bir promise-kuyruğuyla serileştirilir (Node tek-thread) ve geçici
// dosya + rename ile atomik yazılır (yarım dosya bırakmaz).
// İleride Postgres/SQLite'a geçiş bu modülün arkasında izole kalır.
const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');

let db = { players: {} };          // id -> player
let tokenIndex = {};               // tokenHash -> id  (bellekte; yükleyince kurulur)
let writeChain = Promise.resolve();

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    db = JSON.parse(raw);
    if (!db.players) db.players = {};
  } catch (e) {
    db = { players: {} };          // dosya yoksa boş başla
  }
  tokenIndex = {};
  for (const id of Object.keys(db.players)) {
    const t = db.players[id].tokenHash;
    if (t) tokenIndex[t] = id;
  }
}

function persist() {
  // Sıraya al: her yazım bir öncekinden sonra çalışır.
  writeChain = writeChain.then(() => new Promise((resolve) => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      const tmp = DATA_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(db));
      fs.renameSync(tmp, DATA_FILE);   // atomik
    } catch (e) {
      console.error('persist error:', e.message);
    }
    resolve();
  }));
  return writeChain;
}

function getById(id) { return db.players[id] || null; }
function getByTokenHash(h) { const id = tokenIndex[h]; return id ? db.players[id] : null; }

function put(player) {
  db.players[player.id] = player;
  if (player.tokenHash) tokenIndex[player.tokenHash] = player.id;
  return persist();
}

// cashedOut'a göre azalan ilk `limit` oyuncu (toplam kazanç sıralaması).
function topByCashedOut(limit) {
  return Object.values(db.players)
    .filter((p) => (p.cashedOut || 0) > 0)
    .sort((a, b) => b.cashedOut - a.cashedOut)
    .slice(0, limit);
}

// Bir oyuncunun cashedOut sıralamasındaki yeri (1-tabanlı) ve toplam oyuncu.
function rankOf(id) {
  const me = db.players[id];
  if (!me) return null;
  let rank = 1;
  for (const p of Object.values(db.players)) {
    if ((p.cashedOut || 0) > (me.cashedOut || 0)) rank++;
  }
  return rank;
}

module.exports = { load, persist, getById, getByTokenHash, put, topByCashedOut, rankOf, DATA_FILE };
