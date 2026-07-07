// ─── Liderlik Tablosu — YEREL haftalık simülasyon ────────────────────────────
// Backend YOK. Tamamen cihazda (localStorage) çalışır. Her hafta Pazar gece
// yarısı (Pazar→Pazartesi 00:00, yerel saat) sıfırlanır. Rakipler sahtedir ama
// skorları hafta boyunca ilerler ve farklı "tempolarda" birbirini geçer; böylece
// gerçek insanlarla yarışıyormuş hissi verir. Oyuncunun haftalık skoru, o hafta
// ulaştığı en iyi üst üste bilme rekorudur.
//
// API: Leaderboard.recordStreak(streak) → haftalık rekoru güncelle
//      Leaderboard.getBoard()           → { periodEnd, msLeft, rows, you }

const Leaderboard = (() => {
  const KEY = 'yt_lb_v2';
  const ROSTER = 22;

  const NAMES = [
    'Zeynep', 'Emre', 'Ayşe', 'Mert', 'Can', 'Elif', 'Burak', 'Deniz', 'Selin',
    'Kaan', 'Ada', 'Efe', 'Ece', 'Arda', 'Yusuf', 'Defne', 'Baran', 'İpek',
    'Kerem', 'Mira', 'Ozan', 'Naz', 'Berk', 'Sude', 'Tuna', 'Lara', 'Umut',
    'Ela', 'Sarp', 'Nil', 'Doruk', 'Melis', 'Cem', 'Bade', 'Alp', 'Derin',
    'Poyraz', 'Yağmur', 'Kuzey', 'İrem', 'Toprak', 'Zehra',
  ];
  const INITIALS = 'ABCÇDEFGHİKLMNOÖPRSŞTUÜVYZ';

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function periodBounds(now) {
    const d = new Date(now);
    const day = d.getDay();
    const backToMonday = (day === 0 ? 6 : day - 1);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - backToMonday, 0, 0, 0, 0).getTime();
    const end = start + 7 * 24 * 3600 * 1000;
    return { start, end };
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  function record(now) {
    const { start, end } = periodBounds(now);
    let r = load();
    if (!r || r.start !== start) { r = { start, end, playerBest: 0 }; save(r); }
    if (typeof r.playerBest !== 'number') r.playerBest = 0;
    return r;
  }

  function roster(start) {
    const rnd = rng(Math.floor(start / 1000));
    const used = new Set();
    const list = [];
    for (let i = 0; i < ROSTER; i++) {
      let name;
      do { name = NAMES[Math.floor(rnd() * NAMES.length)]; } while (used.has(name) && used.size < NAMES.length);
      used.add(name);
      const ini = INITIALS[Math.floor(rnd() * INITIALS.length)];
      const skill = rnd();
      const target = Math.max(2, Math.round(3 + Math.pow(skill, 1.45) * 20 + rnd() * 3));
      const pace = 0.55 + rnd() * 0.9;
      list.push({ name: name + ' ' + ini + '.', target, pace });
    }
    return list;
  }

  function opponentScore(o, progress) {
    const grow = 0.10 + 0.90 * Math.pow(progress, o.pace);
    return Math.max(1, Math.round(o.target * grow));
  }

  function recordStreak(streak) {
    const value = Math.floor(Number(streak) || 0);
    if (value <= 0) return;
    const r = record(Date.now());
    if (value > r.playerBest) {
      r.playerBest = value;
      save(r);
    }
  }

  function getBoard() {
    const now = Date.now();
    const r = record(now);
    const progress = Math.min(1, Math.max(0, (now - r.start) / (r.end - r.start)));
    const rows = roster(r.start).map((o) => ({ name: o.name, score: opponentScore(o, progress), you: false }));
    rows.push({ name: 'Sen', score: Math.round(r.playerBest || 0), you: true });
    rows.sort((a, b) => b.score - a.score || (a.you ? 1 : 0) - (b.you ? 1 : 0));
    rows.forEach((row, i) => { row.rank = i + 1; });
    const you = rows.find((row) => row.you);
    return { periodEnd: r.end, msLeft: Math.max(0, r.end - now), total: rows.length, rows, you };
  }

  return { recordStreak, getBoard };
})();

window.Leaderboard = Leaderboard;
