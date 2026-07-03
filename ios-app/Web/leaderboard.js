// ─── Liderlik Tablosu — YEREL haftalık simülasyon ────────────────────────────
// Backend YOK. Tamamen cihazda (localStorage) çalışır. Her hafta Pazar gece
// yarısı (Pazar→Pazartesi 00:00, yerel saat) sıfırlanır. Rakipler sahtedir ama
// skorları hafta boyunca ilerler ve farklı "tempolarda" birbirini geçer; böylece
// gerçek insanlarla yarışıyormuş hissi verir. Oyuncunun haftalık kazancı
// (çekilen tutarların toplamı) rakiplerle aynı listede sıralanır.
//
// API: Leaderboard.addWinnings(amount)  → çekiliş kazancını haftalık skora ekle
//      Leaderboard.getBoard()           → { periodEnd, msLeft, rows, you }

const Leaderboard = (() => {
  const KEY = 'yt_lb_v1';
  const ROSTER = 22;   // sahte rakip sayısı

  const NAMES = [
    'Zeynep', 'Emre', 'Ayşe', 'Mert', 'Can', 'Elif', 'Burak', 'Deniz', 'Selin',
    'Kaan', 'Ada', 'Efe', 'Ece', 'Arda', 'Yusuf', 'Defne', 'Baran', 'İpek',
    'Kerem', 'Mira', 'Ozan', 'Naz', 'Berk', 'Sude', 'Tuna', 'Lara', 'Umut',
    'Ela', 'Sarp', 'Nil', 'Doruk', 'Melis', 'Cem', 'Bade', 'Alp', 'Derin',
    'Poyraz', 'Yağmur', 'Kuzey', 'İrem', 'Toprak', 'Zehra',
  ];
  const INITIALS = 'ABCÇDEFGHİKLMNOÖPRSŞTUÜVYZ';

  // Deterministik PRNG (mulberry32) — aynı tohum → aynı diziler.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Bu haftanın sınırları: Pazartesi 00:00 → gelecek Pazartesi 00:00 (yerel).
  // Sıfırlama anı = Pazar gece yarısı.
  function periodBounds(now) {
    const d = new Date(now);
    const day = d.getDay();                 // 0=Paz, 1=Pzt, ... 6=Cmt
    const backToMonday = (day === 0 ? 6 : day - 1);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - backToMonday, 0, 0, 0, 0).getTime();
    const end = start + 7 * 24 * 3600 * 1000;
    return { start, end };
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  // Geçerli haftanın kaydını getir; hafta değiştiyse oyuncu skorunu sıfırla.
  function record(now) {
    const { start, end } = periodBounds(now);
    let r = load();
    if (!r || r.start !== start) { r = { start, end, player: 0 }; save(r); }
    return r;
  }

  // Bu haftanın sahte rakiplerini üret (tohum = hafta başlangıcı).
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
      // hedef haftalık kazanç: çoğu düşük/orta, birkaç yüksek ($40 – ~$10.000)
      const target = Math.round(Math.pow(10, 1.6 + Math.pow(skill, 1.5) * 2.4));
      const pace = 0.6 + rnd() * 0.8;        // 0.6–1.4: hafta içi büyüme temposu
      list.push({ name: name + ' ' + ini + '.', target, pace });
    }
    return list;
  }

  // Bir rakibin ŞU ANKİ skoru: hafta ilerledikçe hedefe doğru büyür.
  // Farklı tempolar (pace) rakiplerin hafta boyunca birbirini geçmesini sağlar.
  function opponentScore(o, progress) {
    const grow = 0.05 + 0.95 * Math.pow(progress, o.pace);  // %5 baz + büyüme
    return Math.max(1, Math.round(o.target * grow));
  }

  // ── Genel API ──

  // Oyuncunun bu haftaki çekiliş kazancını ekle.
  function addWinnings(amount) {
    if (!(amount > 0)) return;
    const r = record(Date.now());
    r.player += amount;
    save(r);
  }

  // Sıralı tabloyu döndür (rakipler + oyuncu), süre bilgisiyle.
  function getBoard() {
    const now = Date.now();
    const r = record(now);
    const progress = Math.min(1, Math.max(0, (now - r.start) / (r.end - r.start)));
    const rows = roster(r.start).map((o) => ({ name: o.name, score: opponentScore(o, progress), you: false }));
    rows.push({ name: 'Sen', score: Math.round(r.player), you: true });
    rows.sort((a, b) => b.score - a.score || (a.you ? 1 : 0) - (b.you ? 1 : 0));
    rows.forEach((row, i) => { row.rank = i + 1; });
    const you = rows.find((row) => row.you);
    return { periodEnd: r.end, msLeft: Math.max(0, r.end - now), total: rows.length, rows, you };
  }

  return { addWinnings, getBoard };
})();

window.Leaderboard = Leaderboard;
