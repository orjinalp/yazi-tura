// ─── Menü ────────────────────────────────────────────────────────────────────
// Hamburger menü + App Store için zorunlu sayfalar (Gizlilik, Koşullar, Destek)
// ve Liderlik Tablosu (dummy UI, leaderboard.js servisini kullanır).

(function () {
  const APP_NAME = 'Yazı Tura';
  const APP_VERSION = '1.0.0';

  const overlay = document.getElementById('menuOverlay');
  const panel   = document.getElementById('menuPanel');
  const body    = document.getElementById('menuBody');
  const titleEl = document.getElementById('menuTitle');
  const backBtn = document.getElementById('menuBack');
  const closeBtn = document.getElementById('menuClose');
  const menuBtn = document.getElementById('menuBtn');

  // para biçimi (game.js'teki money varsa onu kullan, yoksa yerel)
  function fmtMoney(n) {
    if (typeof window.money === 'function') return window.money(n);
    const g = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return g + '$';
  }
  function state() { return (typeof window.S === 'object' && window.S) ? window.S : null; }

  // ─── Aç / Kapat ─────────────────────────────────────────────────────────────
  function open() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    showRoot();
  }
  function close() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }

  menuBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backBtn.addEventListener('click', showRoot);
  // panel dışına (karartma) tıklayınca kapat
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  // ─── Kök menü ───────────────────────────────────────────────────────────────
  const ROOT_ITEMS = [
    { key: 'profile',     ico: '👤', label: 'Ben' },
    { key: 'leaderboard', ico: '🏆', label: 'Liderlik Tablosu' },
    { key: 'settings',    ico: '⚙️', label: 'Ayarlar' },
    { key: 'privacy',     ico: '🔒', label: 'Gizlilik Politikası' },
    { key: 'terms',       ico: '📄', label: 'Kullanım Koşulları' },
    { key: 'support',     ico: '✉️', label: 'Destek & İletişim' },
    { key: 'about',       ico: 'ℹ️', label: 'Hakkında' },
  ];

  function showRoot() {
    titleEl.textContent = 'Menü';
    backBtn.classList.add('hidden');
    body.scrollTop = 0;
    body.innerHTML = '';
    ROOT_ITEMS.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'menu-item';
      b.innerHTML = `<span class="ico">${it.ico}</span><span>${it.label}</span><span class="chev">›</span>`;
      b.addEventListener('click', () => showPage(it.key, it.label));
      body.appendChild(b);
    });
  }

  function showPage(key, label) {
    titleEl.textContent = label;
    backBtn.classList.remove('hidden');
    body.scrollTop = 0;
    if (key === 'profile')     return renderProfile();
    if (key === 'leaderboard') return renderLeaderboard();
    if (key === 'settings')    return renderSettings();
    body.innerHTML = PAGES[key] || '<div class="page"><p>Bulunamadı.</p></div>';
  }

  // ─── Ben (istatistikler) ────────────────────────────────────────────────────
  function renderProfile() {
    const s = state() || {};
    const total = s.total || 0;
    const wins = s.wins || 0;
    const hitRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const stats = [
      { ico: '💰', label: 'Rekor çekiliş',  value: fmtMoney(s.bestCashout || 0), accent: true },
      { ico: '🏦', label: 'Toplam çekilen', value: fmtMoney(s.cashedOut || 0) },
      { ico: '✋', label: 'Çekiliş sayısı',  value: (s.cashOutCount || 0) + ' kez' },
      { ico: '📺', label: 'İzlenen reklam',  value: (s.adsWatched || 0) + ' kez' },
      { ico: '🔥', label: 'Rekor seri',      value: (s.best || 0) },
      { ico: '🎯', label: 'İsabet (strike)', value: wins + ' / ' + total },
      { ico: '📈', label: 'İsabet oranı',    value: '%' + hitRate },
      { ico: '💵', label: 'Kasa',            value: fmtMoney(s.kasa || 0) },
    ];

    const cards = stats.map((st) => `
      <div class="stat-card${st.accent ? ' accent' : ''}">
        <span class="stat-ico">${st.ico}</span>
        <span class="stat-val">${st.value}</span>
        <span class="stat-lbl">${st.label}</span>
      </div>`).join('');

    body.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar">👤</div>
        <div class="profile-name">Sen</div>
        <div class="profile-sub">${total} atış • rekor seri ${s.best || 0}</div>
      </div>
      <div class="stat-grid">${cards}</div>
      <div class="page"><p class="muted">İstatistikler bu cihazda yerel olarak tutulur.</p></div>`;
  }

  // ─── Liderlik Tablosu (yerel haftalık yarış) ────────────────────────────────
  let lbTimer = null;

  function fmtCountdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}g ${h}s`;
    if (h > 0) return `${h}s ${m}dk`;
    return `${m}dk`;
  }

  function renderLeaderboard() {
    const board = window.Leaderboard.getBoard();
    const you = board.you || { rank: board.total, score: 0 };
    const TOPN = 20;
    const top = board.rows.slice(0, TOPN);

    const rowHtml = (e) => {
      const cls = e.rank <= 3 ? ` top${e.rank}` : '';
      return `<li class="lb-row${e.you ? ' lb-you' : ''}">
        <span class="lb-rank${cls}">${e.rank}</span>
        <span class="lb-name">${escapeHtml(e.name)}</span>
        <span class="lb-score">${fmtMoney(e.score)}</span>
      </li>`;
    };
    const rows = top.map(rowHtml).join('');
    // Oyuncu ilk 20'de değilse ayrıca alta ekle
    const youExtra = you.rank > TOPN ? `<li class="lb-sep">···</li>` + rowHtml(you) : '';

    body.innerHTML = `
      <div class="lb-head">
        <div class="lb-title">🏆 Haftalık Yarış</div>
        <div class="lb-timer">Sıfırlanmasına <b id="lbCd">${fmtCountdown(board.msLeft)}</b></div>
        <div class="lb-you-line">Sıran: <b>${you.rank}</b> / ${board.total}
          &nbsp;•&nbsp; Bu hafta: <b>${fmtMoney(you.score)}</b></div>
      </div>
      <ul class="lb-list">${rows}${youExtra}</ul>
      <div class="page"><p class="muted">Sıralama bu haftaki kazancına göredir ve
      her Pazar gece yarısı sıfırlanır.</p></div>`;

    // geri sayımı canlı tut (menü açık kaldıkça)
    if (lbTimer) clearInterval(lbTimer);
    lbTimer = setInterval(() => {
      const cd = document.getElementById('lbCd');
      if (!cd) { clearInterval(lbTimer); lbTimer = null; return; }
      cd.textContent = fmtCountdown(window.Leaderboard.getBoard().msLeft);
    }, 30000);
  }

  // ─── Ayarlar ────────────────────────────────────────────────────────────────
  function renderSettings() {
    const soundOn = localStorage.getItem('yt_sound') !== 'off';
    body.innerHTML = `
      <div class="setting-row">
        <span>Ses efektleri</span>
        <button class="toggle ${soundOn ? 'on' : ''}" id="soundToggle" aria-label="Ses"><span class="knob"></span></button>
      </div>
      <div class="setting-row">
        <span>İlerlemeyi sıfırla</span>
        <button class="btn red" id="resetBtn">Sıfırla</button>
      </div>
      <div class="page"><p class="muted">Sıfırlama kasanı, serini ve rekorunu siler; geri alınamaz.</p></div>`;

    const t = document.getElementById('soundToggle');
    t.addEventListener('click', () => {
      const on = t.classList.toggle('on');
      localStorage.setItem('yt_sound', on ? 'on' : 'off'); // dummy: ses motoru henüz yok
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('Tüm ilerlemen silinsin mi? Bu işlem geri alınamaz.')) {
        localStorage.removeItem('yazitura_v2');
        location.reload();
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // ─── Statik sayfalar (App Store için zorunlu) ───────────────────────────────
  const PAGES = {
    privacy: `<div class="page">
      <p class="muted">Son güncelleme: 2026</p>
      <h3>Gizlilik Politikası</h3>
      <p>${APP_NAME}, kişisel verilerini toplamaz. Oyun ilerlemen (kasa, seri,
      rekor) yalnızca cihazının yerel depolamasında (localStorage) tutulur ve
      hiçbir sunucuya gönderilmez.</p>
      <h3>Reklamlar</h3>
      <p>Uygulamadaki “Reklam İzle” özelliği şu an bir gösterimdir (dummy) ve
      üçüncü taraf reklam ağı çalıştırmaz. İleride gerçek reklam ağı entegre
      edilirse, ilgili ağın veri işleme koşulları bu politikada belirtilecektir.</p>
      <h3>Çocukların Gizliliği</h3>
      <p>Uygulama, 13 yaş altı çocuklardan bilerek veri toplamaz.</p>
      <h3>İletişim</h3>
      <p>Sorularınız için App Store'daki uygulama sayfası üzerinden bize
      ulaşabilirsiniz.</p>
    </div>`,

    terms: `<div class="page">
      <p class="muted">Son güncelleme: 2026</p>
      <h3>Kullanım Koşulları</h3>
      <p>Bu uygulamayı kullanarak aşağıdaki koşulları kabul etmiş olursunuz.</p>
      <h3>Eğlence Amaçlıdır</h3>
      <p>${APP_NAME} yalnızca bir eğlence oyunudur. Oyun içindeki “kasa”, “pot”
      ve para birimleri sanaldır; gerçek para değeri taşımaz, gerçek parayla
      alınıp satılamaz ve gerçek kumar değildir.</p>
      <h3>Sorumluluk</h3>
      <p>Uygulama “olduğu gibi” sunulur. Kullanımdan doğabilecek dolaylı
      zararlardan geliştirici sorumlu tutulamaz.</p>
      <h3>Değişiklikler</h3>
      <p>Bu koşullar zaman zaman güncellenebilir. Güncel sürüm uygulama içinde
      yayımlanır.</p>
    </div>`,

    support: `<div class="page">
      <h3>Destek & İletişim</h3>
      <p>Bir sorun mu yaşıyorsun ya da öneri mi vermek istiyorsun? Geri
      bildirimini App Store'daki uygulama sayfası üzerinden iletebilirsin.</p>
      <h3>Sürüm</h3>
      <p class="muted">${APP_NAME} v${APP_VERSION}</p>
    </div>`,

    about: `<div class="page">
      <h3>${APP_NAME}</h3>
      <p>Seri yaptıkça pot ikiye katlanan bir yazı-tura şans oyunu.
      Doğru bildikçe kasanı büyüt, istediğin an çekil.</p>
      <p class="muted">Sürüm ${APP_VERSION}</p>
    </div>`,
  };
})();
