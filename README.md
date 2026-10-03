# Sol Klarnet Dinleyici

Türk Sol klarneti (Albert sistem, 13 mandal, 2 halka) için tarayıcıda çalışan akort ve parmak pozisyonu aracı.
Mikrofondan çalınan sesi dinler ve şunları gösterir:

- **AEU perdesi** (53 koma sistemi, Rast = yazılı Sol) ve perdeden **kaç koma** saptığı
- Yazılı nota, duyulan ses ve frekans
- O notanın **parmak pozisyonu**: klarnet çizimi ve adım adım Türkçe talimat
  (hangi delikler kapalı, hangi mandala hangi parmakla basılır); alternatif parmağı olan notalarda
  "Temel / Alt. 1 / Alt. 2…" seçimi ve alternatifin ne işe yaradığı
- Son 8 saniyenin **entonasyon izi** (perde çizgileri üzerinde)
- **Nota şeridi**: yazılı Mi3–Mi♭7 arası 48 notayı AEU koma akordunda çalar (tıkla ya da klavyeden;
  bir kez bas çalsın, tekrar bas dursun)
- **Klarnetten çal**: şemadaki deliklere ve mandallara dokunarak parmak kur; parmak tablodaki bir
  notaya (temel ya da alternatif) uyunca o nota gösterilir ve çalar

Ayarlar (tarayıcıda saklanır): diyapazon (La = 430–450 Hz), gösterge ölçeği (koma / sent),
mikrofon hassasiyeti ve seviye çubuğu.

## Çalıştırma

Mikrofon yalnızca `https://` ya da `localhost` üzerinden açılır:

```bash
npm start
```

Sonra http://localhost:8080 adresini aç. Uygulama bir kez açıldıktan sonra çevrimdışı da çalışır
ve telefonda “Ana ekrana ekle” ile uygulama gibi kurulabilir.

Belirli bir notayı bağlantıyla açmak için: `index.html#nota=52` (yazılı MIDI numarası, 52 = Mi3 … 99 = Mi♭7).

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
[mandal açıklaması](https://www.wfg.woodwind.org/clarinet/cl_fing.html). Temel parmaklar `ocl_bas_1–3`, alternatifler
`ocl_alt_1–4` sayfalarından; Albert sistemde olmayan mandalları kullanan Oehler parmakları alınmadı.

## Planlama

- [docs/TODO.md](docs/TODO.md): mobil uygulama ve Android (Play Store) için yapılacaklar
- [docs/BACKLOG.md](docs/BACKLOG.md): sıradaki işler
