// ─── API katmanı ─────────────────────────────────────────────────────────────
// window.YT_API_BASE ayarlıysa sunucu-otoriter (dereceli) modda backend ile
// konuşur; boşsa ya da sunucuya ulaşılamıyorsa oyun OFFLINE modda çalışır
// (yerel, sıralamaya girmeden). Atış/ekonomi kararlarını sunucu verir; client
// hiçbir tutar göndermez.
const YTApi = (() => {
  const BASE = (window.YT_API_BASE || '').replace(/\/+$/, '');
  const TKEY = 'yt_token';
  let online = false;
  let token = null;

  function getToken() { try { return localStorage.getItem(TKEY); } catch (e) { return null; } }
  function setToken(t) { token = t; try { localStorage.setItem(TKEY, t); } catch (e) {} }

  async function req(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    const r = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || ('http_' + r.status)); e.status = r.status; e.data = j; throw e; }
    return j;
  }

  // Başlat: token varsa /me ile doğrula, yoksa /register. Hata olursa offline.
  async function init() {
    if (!BASE) { online = false; return { online: false }; }
    try {
      token = getToken();
      let state;
      if (token) {
        try { state = (await req('/api/me')).state; }
        catch (e) { if (e.status === 401) token = null; else throw e; }
      }
      if (!token) {
        const reg = await req('/api/register', { method: 'POST' });
        setToken(reg.token); state = reg.state;
      }
      online = true;
      return { online: true, state };
    } catch (e) {
      online = false;
      return { online: false, error: String(e && e.message || e) };
    }
  }

  const flip        = (choice) => req('/api/flip',    { method: 'POST', body: { choice } });
  const cashout     = ()       => req('/api/cashout', { method: 'POST' });
  const ad          = ()       => req('/api/ad',      { method: 'POST' });
  const setName     = (name)   => req('/api/name',    { method: 'POST', body: { name } });
  const leaderboard = (limit)  => req('/api/leaderboard?limit=' + (limit || 20));

  return {
    init, flip, cashout, ad, setName, leaderboard,
    get online() { return online; },
    get base() { return BASE; },
  };
})();
window.YTApi = YTApi;
