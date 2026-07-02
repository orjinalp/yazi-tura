// ─── Liderlik Tablosu Servisi ────────────────────────────────────────────────
// ŞİMDİLİK DUMMY. Gerçek backend'e geçince yalnızca fetch() satırlarını açın;
// arayüz (menu.js) bu API'yi olduğu gibi kullanmaya devam eder.
//
// Beklenen kayıt şekli:
//   { rank: number, name: string, best: number, kasa: number, you?: boolean }
//
// Gerçek uç noktalar (öneri):
//   GET  {API_BASE}/leaderboard?limit=10   -> [{name,best,kasa}, ...]
//   POST {API_BASE}/leaderboard            -> { name, best, kasa }

const Leaderboard = (() => {
  const API_BASE = ''; // TODO: gerçek API adresi, örn. 'https://api.oyun.com'

  // Dummy veri (sıralı). Gerçek serviste sunucudan gelir.
  const DUMMY = [
    { name: 'Zeynep K.',  best: 15, kasa: 4194304 },
    { name: 'Emre T.',    best: 14, kasa: 2097152 },
    { name: 'Ayşe D.',    best: 13, kasa: 1048576 },
    { name: 'Mert Y.',    best: 12, kasa: 786432  },
    { name: 'Can B.',     best: 11, kasa: 524288  },
    { name: 'Elif S.',    best: 10, kasa: 262144  },
    { name: 'Burak A.',   best: 9,  kasa: 131072  },
    { name: 'Deniz O.',   best: 8,  kasa: 65536   },
    { name: 'Selin V.',   best: 7,  kasa: 32768   },
    { name: 'Kaan M.',    best: 6,  kasa: 16384   },
  ];

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // En iyi `limit` oyuncuyu getirir.
  async function getTop(limit = 10) {
    // GERÇEK:
    // const r = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
    // if (!r.ok) throw new Error('leaderboard fetch failed');
    // return await r.json();
    await delay(650); // ağ gecikmesi taklidi
    return DUMMY.slice(0, limit).map((e, i) => ({ rank: i + 1, ...e }));
  }

  // Oyuncunun skorunu gönderir (kasa/rekor). Şimdilik no-op döner.
  async function submitScore(entry) {
    // GERÇEK:
    // const r = await fetch(`${API_BASE}/leaderboard`, {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(entry),
    // });
    // return await r.json();
    await delay(300);
    return { ok: true, ...entry };
  }

  return { getTop, submitScore };
})();

window.Leaderboard = Leaderboard;
