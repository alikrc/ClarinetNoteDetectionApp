# Sol Klarnet Dinleyici

Türk Sol klarneti (Albert sistem, 13 mandal, 2 halka) için tarayıcıda çalışan akort ve parmak pozisyonu aracı.
Mikrofondan çalınan sesi dinler ve şunları gösterir:

- **AEU perdesi** (53 koma sistemi, Rast = yazılı Sol) ve perdeden **kaç koma** saptığı
- Yazılı nota, duyulan ses ve frekans
- O notanın **parmak pozisyonu**: klarnet çizimi ve adım adım Türkçe talimat
  (hangi delikler kapalı, hangi mandala hangi parmakla basılır)
- Son 8 saniyenin **entonasyon izi** (perde çizgileri üzerinde)
- **Nota şeridi**: yazılı Mi3–Do6 arası 33 notayı AEU koma akordunda çalar (tıkla ya da klavyeden)

Ayarlar (tarayıcıda saklanır): diyapazon (La = 430–450 Hz), gösterge ölçeği (koma / sent),
mikrofon hassasiyeti ve seviye çubuğu.

## Çalıştırma

Mikrofon yalnızca `https://` ya da `localhost` üzerinden açılır:

```bash
npm start
```

Sonra http://localhost:8080 adresini aç. Uygulama bir kez açıldıktan sonra çevrimdışı da çalışır
ve telefonda “Ana ekrana ekle” ile uygulama gibi kurulabilir.

Belirli bir notayı bağlantıyla açmak için: `index.html#nota=52` (yazılı MIDI numarası, 52 = Mi3 … 84 = Do6).

## Yayınlama (GitHub Pages)

Depo ayarlarında **Settings → Pages → Deploy from a branch → `main` / root** seçilmesi yeterli;
derleme adımı yoktur.

## Test

```bash
npm test
```

Testler `core.js` içindeki mantığı (perde bulucu, koma eşlemesi, parmak kodları, talimatlar,
diyapazon, hassasiyet, titreme önleyici) ve parmak şemasındaki her mandalın `index.html`'de
çizili olduğunu doğrular. GitHub Actions her push'ta testleri çalıştırır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Arayüz, parmak şeması (SVG), mikrofon döngüsü |
| `core.js` | Perde/nota hesabı, parmak kodu çözümleme, perde bulucu (tarayıcı + Node) |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Çevrimdışı kullanım ve ana ekrana ekleme |
| `test.js` | Testler |

## Kaynaklar

Parmak verisi ve mandal adları: [Woodwind Fingering Guide — Oehler/Albert](https://www.wfg.woodwind.org/clarinet/ocl_bas_1.html),
[mandal açıklaması](https://www.wfg.woodwind.org/clarinet/cl_fing.html). Her nota için temel (ilk) parmak gösterilir.
