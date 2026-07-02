# Ayrı Repoya Taşıma Kılavuzu

Bu proje `pizza-empire` reposu içinde geliştirildi ama artık bağımsız bir
**Yazı Tura** uygulaması. Aşağıdaki adımlar onu kendi reposuna taşımak içindir.

## 1. Taşınacak dosyalar

Yeni repoya **şunların hepsini** kopyala (yani depo kökündeki her şey — bu
proje zaten tamamen Yazı Tura'ya dönüştürüldü):

```
index.html          # web oyunu
game.js
menu.js
leaderboard.js
style.css
site.webmanifest
favicon.ico
icons/              # ikonlar (icon-192, icon-512, favicon-*, apple-touch-*)
docs/               # GitHub Pages yayın kopyası
ios-app/            # iOS native uygulama (XcodeGen)
ios/                # ekstra AppIcon seti (aşağıdaki nota bak)
app-store/          # App Store metni + ekran görüntüleri
.gitignore
README.md
TASIMA.md           # (istersen taşıdıktan sonra silebilirsin)
```

> Bu depoda başka bir şey kalmadı; `pizza-empire`e özgü ayrı bir dosya yok.

## 2. Yeni repoyu oluştur ve gönder

GitHub'da boş bir repo aç (örn. `yazi-tura`), sonra:

```bash
# taşınacak dosyaları yeni bir klasöre kopyaladıktan sonra
cd yazi-tura
git init
git add -A
git commit -m "Yazı Tura ilk sürüm"
git branch -M main
git remote add origin https://github.com/<kullanıcıadın>/yazi-tura.git
git push -u origin main
```

## 3. GitHub Pages (web sürümü)

- **Settings → Pages → Branch: `main`, folder: `/docs`**
- Yayın adresi: `https://<kullanıcıadın>.github.io/yazi-tura/`
- Web oyununu değiştirdiğinde kökteki dosyaları `docs/`'a da kopyala; ikisi aynı
  içerik olmalı. (Native app için `ios-app/sync-web.sh` de kökten kopyalar.)

## 4. iOS uygulaması

Ayrıntılar: [`ios-app/README.md`](ios-app/README.md). Özet:

```bash
cd ios-app
./sync-web.sh          # web oyununu bundle'a kopyala (menu.js + leaderboard.js dahil)
xcodegen generate      # YaziTura.xcodeproj üretir
open YaziTura.xcodeproj
```

- **Bundle ID:** `com.orjinalp.yazitura`
- **Görünen ad:** Yazı Tura
- Apple Developer'da `com.orjinalp.yazitura` identifier'ını ve
  **"Yazi Tura App Store"** provisioning profilini oluşturman gerekir.
- App Store yayını: `./archive.sh <TEAM_ID>`

## 5. Temizlik durumu

Eski Pizza Empire kalıntıları temizlendi:

- ✅ **`app-store/screenshots/`** — Yazı Tura ekranlarıyla yenilendi (iPhone
  6.5" 1242×2688, 6.9" 1290×2796, iPad 2048×2732).
- ✅ **`docs/privacy.html`** — Yazı Tura gizlilik politikasına güncellendi
  (oyun içi menüdeki metinle tutarlı).
- ✅ **Web ikonları** — referanssız pizza görselleri (`apple-touch-*`, `splash/`,
  `favicon-16/32`) kaldırıldı; jeton temalı `apple-touch-icon.png` eklendi.
  Kalan ikonlar: `favicon.ico`, `icons/icon-192`, `icons/icon-512`,
  `icons/apple-touch-icon`.
- ✅ **Yinelenen `ios/` klasörü** — kaldırıldı; tek ikon seti
  `ios-app/Resources/Assets.xcassets/AppIcon.appiconset` altında.

## 6. Yayın öncesi tek not (App Store)

- **Yaş sınırı** — oyun sanal parayla yazı-tura mekaniği içeriyor; Apple yaş
  formunda "Simulated Gambling" sorusuna dürüst yanıt ver (genelde 17+).
  Gerçek para söz konusu değil; bu, Kullanım Koşulları'nda belirtilmiştir.
