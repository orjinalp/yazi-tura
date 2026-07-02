# Yazı Tura

Canvas tabanlı basit ve şık bir yazı-tura (coin flip) oyunu. Bir taraf seç,
parayı at, dönerek düşsün. Doğru bildikçe serin büyür, potun katlanır; istediğin
an çekilip kasanı büyütürsün. Tüm ilerleme `localStorage` ile cihazda saklanır.

## Nasıl oynanır

- Yeni tura başlamak (seri 0'dan ilk tahmin) **kasadan 1$ giriş ücreti** alır;
  oyuna **1$** kasayla başlarsın.
- **Yazı** ya da **Tura** seç. Doğru bilirsen **seri** büyür ve **pot ikiye
  katlanır**: `pot = 2^seri` → seri 8'de `256$`, seri 9'da `512$`.
- **ÇEKİL**: biriken potu **kasaya** aktarır (güvenli kâr), seri sıfırlanır.
- Yanlış bilirsen **pot gider**, seri sıfırlanır.
- Kasa biterse otomatik olarak **1$'a tazelenir** — oyun asla kilitlenmez.

## Özellikler

- Animasyonlu para dönüşü (canvas)
- Seri bazlı katlanan ödül, kasa ve rekor takibi (`localStorage`)
- Hamburger menü: Liderlik Tablosu, Ayarlar, Gizlilik Politikası, Kullanım
  Koşulları, Destek, Hakkında
- Liderlik tablosu için servis katmanı (`leaderboard.js`) — şimdilik dummy, gerçek
  backend'e geçmeye hazır
- Mobil dokunmatik + masaüstü klavye (`Y` Yazı, `T` Tura, `C` Çekil)
- PWA: ana ekrana ekleyip tam ekran oynanabilir
- iOS native sarmalayıcı (`ios-app/`) — tamamen çevrimdışı `WKWebView`

## Çalıştırma

Statik dosyalardan ibarettir; kurulum gerektirmez.

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

`index.html` dosyasını doğrudan tarayıcıda da açabilirsin.

## Proje yapısı

```
.
├── index.html          # sayfa iskeleti + menü DOM
├── game.js             # oyun mantığı ve canvas çizimi
├── menu.js             # hamburger menü + sayfalar + liderlik UI
├── leaderboard.js      # liderlik servisi (dummy, backend'e hazır)
├── style.css           # sayfa ve menü stilleri
├── site.webmanifest    # PWA manifesti
├── favicon.ico, icons/ # ikonlar
├── docs/               # GitHub Pages yayın kopyası (kök ile aynı içerik)
├── ios-app/            # iOS native uygulama (XcodeGen + WKWebView)
└── app-store/          # App Store listeleme metni ve ekran görüntüleri
```

## Yayın (GitHub Pages)

Yayın dosyaları `docs/` klasöründedir. Depo ayarlarından **Settings → Pages →
Branch: main / folder: `/docs`** seçilir. Web oyununu değiştirdiğinde kökteki
dosyaları `docs/`'a da kopyala (ikisi aynı olmalı).

## iOS uygulaması

Native iOS derleme ve App Store yayını için: [`ios-app/README.md`](ios-app/README.md).
Web oyununu güncelledikten sonra native bundle'ı senkronla:

```bash
cd ios-app && ./sync-web.sh
```

## Ayrı repoya taşıma

Bu proje ayrı bir repoya taşınmak üzere hazırlandı. Adımlar için:
[`TASIMA.md`](TASIMA.md).
