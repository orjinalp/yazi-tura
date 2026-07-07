# Yazı Tura

Canvas tabanlı hızlı bir yazı-tura tahmin oyunu. Bir taraf seç, sonucu bekle,
doğru bildikçe üst üste serini büyüt. Tüm ilerleme `localStorage` ile cihazda
saklanır.

## Nasıl oynanır

- **Yazı** ya da **Tura** seç.
- Doğru bilirsen **üst üste** sayacın artar.
- İlk doğru tahminden sonra **reklam izleyerek kalkan** alabilirsin.
- Kalkan, aynı seri içinde bir kez çalışır: yanılırsan serin bozulmaz ve kalkan
  tükenir.
- Kalkan hakkı aynı seri içinde yalnızca bir kez alınır. Seri sıfırlanınca yeni
  seri için tekrar açılır.

## Özellikler

- Animasyonlu yazı-tura sahnesi (canvas)
- Üst üste bilme, rekor seri ve kalkan istatistikleri (`localStorage`)
- Hamburger menü: Liderlik Tablosu, Ayarlar, Gizlilik Politikası, Kullanım
  Koşulları, Destek, Hakkında
- Liderlik tablosu için servis katmanı (`leaderboard.js`) — şimdilik yerel
  simülasyon, gerçek backend'e geçmeye hazır
- Mobil dokunmatik + masaüstü klavye (`Y` Yazı, `T` Tura, `K`/`R` Kalkan)
- PWA: ana ekrana ekleyip tam ekran oynanabilir
- iOS native sarmalayıcı (`ios-app/`) — yerel `WKWebView` oyun + AdMob ödüllü reklam

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
├── leaderboard.js      # liderlik servisi (yerel simülasyon)
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
