// ─── Liderlik Tablosu Servisi ────────────────────────────────────────────────
// Sıralama SUNUCUDAN gelir ve TOPLAM KAZANCA (cashedOut) göredir. Sunucu-otoriter
// mimaride skorlar client manipülasyonuna kapalıdır (bkz. server/README.md).
// YT_API_BASE ayarlı değilse ya da sunucuya ulaşılamıyorsa 'offline' döner;
// menü bunu "sıralama için internet gerekir" notuyla gösterir.

const Leaderboard = (() => {
  // En iyi `limit` oyuncuyu getirir → { offline?, top:[{rank,name,total}], you }
  async function getTop(limit = 20) {
    if (!window.YTApi || !YTApi.base || !YTApi.online) {
      return { offline: true, top: [], you: null };
    }
    try {
      const data = await YTApi.leaderboard(limit);   // { top, you }
      return { offline: false, top: data.top || [], you: data.you || null };
    } catch (e) {
      return { offline: true, top: [], you: null, error: String(e && e.message || e) };
    }
  }

  return { getTop };
})();

window.Leaderboard = Leaderboard;
