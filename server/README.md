# Yazı Tura — Backend (sunucu-otoriter)

Leaderboard'u **client manipülasyonuna kapalı** tutmak için oyunun atışı ve
ekonomisi (kasa, pot, seri, kazanç) tamamen bu sunucuda döner. Client yalnızca
"yazı/tura seç" ve "çekil" **isteği** gönderir; sonucu ve tüm para matematiğini
sunucu belirler. Sıralama, sunucunun hesapladığı **toplam kazanç** (`cashedOut`)
üzerindendir.

## Neden güvenli
- Atış sonucu sunucuda `crypto.randomInt` ile üretilir — client sonucu ne belirler
  ne de tahmin eder (seed göndermez).
- Client hiçbir zaman tutar/skor göndermez; tüm mutasyonlar sunucuda yapılır.
- Kimlik = anonim cihaz anahtarı (256-bit sır). Sunucuda yalnızca **SHA-256 hash'i**
  saklanır.
- Sıralama `kasa` değil `cashedOut` üzerinden → reklam parası (dummy) sıralamayı
  şişirmez; atışlar adil 50/50 olduğu için sahte kazanç üretilemez.
- Rate-limit (aksiyon + kayıt), reklam cooldown, CORS allowlist, 8kb gövde limiti.

### Bilinen artık riskler (ileri sertleştirme)
- Anonim kimlikte `/api/register` tekrarıyla çoklu hesap açılabilir (IP rate-limit
  ile hafifletilir). Kalıcı kimlik için hesap (e-posta/OAuth) gerekir.
- "Reklam İzle" dummy'dir; gerçek üründe ödül, reklam ağının **sunucu tarafı**
  doğrulama callback'i ile verilmelidir (şu an yalnızca cooldown var).

## Çalıştırma
```bash
cd server
npm install
npm start           # http://localhost:3000
```

## Ortam değişkenleri
| Değişken          | Varsayılan            | Açıklama                                   |
|-------------------|-----------------------|--------------------------------------------|
| `PORT`            | `3000`                | Dinlenecek port                            |
| `ALLOWED_ORIGINS` | `*`                   | Virgülle ayrık CORS allowlist (prod'da doldur) |
| `DATA_FILE`       | `server/data/db.json` | JSON veritabanı dosyası                     |

Prod örneği:
```bash
ALLOWED_ORIGINS="https://<kullanici>.github.io,https://oyun-alan-adiniz.com" \
DATA_FILE=/var/data/yazitura.json PORT=8080 npm start
```

## Uç noktalar
| Metot + yol             | Açıklama                                             |
|-------------------------|------------------------------------------------------|
| `POST /api/register`    | Anonim oyuncu oluşturur → `{ playerId, token, state }` |
| `GET  /api/me`          | (auth) güncel durum                                  |
| `POST /api/flip`        | (auth) `{ choice }` → `{ result, won, state }`       |
| `POST /api/cashout`     | (auth) potu kasaya çeker → `{ amount, state }`       |
| `POST /api/ad`          | (auth) reklam ödülü (cooldownlu)                     |
| `POST /api/name`        | (auth) `{ name }` görünen adı değiştirir             |
| `GET  /api/leaderboard` | `?limit=20` toplam kazanca göre → `{ top, you }`     |
| `GET  /api/health`      | Sağlık kontrolü                                      |

Auth: `Authorization: Bearer <token>` (register'dan gelen token).

## Frontend bağlama
Statik site (GitHub Pages) ayrı host edilen bu backend'e `window.YT_API_BASE` ile
bakar. `index.html` içindeki `YT_API_BASE` değerini deploy URL'inle doldur:
```html
<script>window.YT_API_BASE = 'https://api.oyun-alan-adiniz.com';</script>
```
Boş bırakılırsa oyun **offline modda** (yerel, sıralamaya girmeden) çalışır.

## Deploy
Node destekleyen herhangi bir yerde çalışır (Render / Railway / Fly.io / VPS).
Kalıcı bir disk bağla ve `DATA_FILE`'ı oraya yönlendir (yoksa yeniden deploy'da
veri silinir).
