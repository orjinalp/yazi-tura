# Yazı Tura

Canvas tabanlı basit ve şık bir yazı-tura (coin flip) oyunu. Bir taraf seç,
parayı at, dönerek düşsün. Seri ve rekor takibi `localStorage` ile saklanır.

## Nasıl oynanır

- **Yazı** ya da **Tura** seç. Doğru bilirsen **seri** büyür ve **pot ikiye
  katlanır**: `pot = 2^seri` → seri 8'de $256, seri 9'da $512.
- **ÇEKİL**: biriken pot'u **kasaya** aktarır (güvenli kâr), seri sıfırlanır.
- Yanlış bilirsen **pot gider**, seri sıfırlanır.
- **REKLAM İZLE** (dummy): kasaya **+$1** ekler.

## Özellikler

- Animasyonlu para dönüşü (canvas)
- Seri bazlı katlanan ödül, kasa ve rekor takibi (`localStorage`)
- Mobil dokunmatik + masaüstü klavye (`Y` Yazı, `T` Tura, `C` Çekil, `R` Reklam)
- PWA: ana ekrana ekleyip tam ekran oynanabilir

## Çalıştırma

Statik dosyalardan ibarettir; kurulum gerektirmez.

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

`index.html` dosyasını doğrudan tarayıcıda da açabilirsin.

## Yayın

GitHub Pages yayın dosyaları `docs/` klasöründedir.
