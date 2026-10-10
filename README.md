# Sol Klarnet — Akort, Parmak, Makam

Türk Sol klarneti (Albert sistem, 13 mandal, 2 halka) için akort, parmak pozisyonu, makam, ritim ve kulak eğitimi
uygulaması. Klarneti ilk kez eline alan birini taksim yapabilecek seviyeye kadar götüren 46 derslik bir müfredatı var.
Mikrofondan çalınan sesi dinler; ses yalnızca cihazda işlenir, uygulama internete bağlanmaz.

## Akort ve parmak

- **AEU perdesi** (53 koma, Rast = yazılı Sol) ve perdeden **kaç koma** saptığı; sent göstergesi de var
- **Makam bağlamı:** akort ekranında makam seçilince perde yalnızca o makamın perdeleri arasında aranır
  (Uşşak'ta yazılı Si4 = Segâh), dizi dışı perde işaretlenir
- **İcra akordu:** AEU'nun yanında yaygın uygulamaya göre yaklaşık düzeltmeler (Uşşak Segâh'ı pes, Saba Çargâh'ı pes,
  Hüzzam'da Hisar tiz vb.); dersler, örnek sesler ve değerlendirme seçilen akordu kullanır
- Yazılı nota, duyulan ses, frekans, **vibrato** (hız ve derinlik), son 8 saniyenin **entonasyon izi** ve glissando işaretleri
- **Parmak pozisyonu:** klarnet çizimi, adım adım talimat, 48 notada 124 parmak (temel + alternatif);
  şemaya dokunarak parmak kurup notayı duyma
- **Nota şeridi:** yazılı Mi3–Mi♭7 arası 48 nota; entonasyon ısı haritası
- **Çalgı seçimi:** Sol, Si♭, La, Do, Mi♭ klarnet (parmaklar Albert sisteme göre)
- **Perde bulucu:** McLeod NSDF (FFT ile), telefon mikrofonunun pes sesi kırpmasından doğan onikili/oktav hatasına
  karşı spektral alt harmonik denetimi; tizde kısa pencere

## Çalışma bölümü

Sekmeler beş gruptadır: **Dersler**, **Teknik** (Parmak testi, Uzun ton, Ritim), **Makam** (Dizi, Taklit, Seyir,
Kulak), **Eserler** (Etüt ve eserler, Kayıt) ve **İlerleme**. Menü kaydırınca üstte kalır; her grup son açılan
alt sekmeyi hatırlar. `?tab=seyir` gibi bir adresle doğrudan bir alıştırma açılır.

| Sekme | İçerik |
|---|---|
| Dersler | 6 ünitede 46 ders: Başlarken (klarneti tanı, duruş/nefes, nota okuma, ritim), Temeller, Register ve klarino, Teknik ve üslup (uzun ton, register geçişi, dil vuruşu, dinamik, ses kalitesi, glissando, vibrato, usuller, kulak), 20 makam dersi (19 makam), İleri seviye (taksim, ileri kulak, iç tempo). **Bugünün çalışması** her gün bitirilen derslerden yeniden kurulur |
| Parmak testi | Çal, Bul ve Oku (dizekten okuyup çal) modları; zorlanılan notalar daha sık sorulur |
| Uzun ton | Sapma, yayılım, **ses temizliği** ve **ses gücü dengesi**; nota başına rekor |
| Dizi (Makam) | 19 makamın dizisi, seyri, durak/güçlü/yeden; çıkış-iniş alıştırması |
| Taklit | Makam dizisinden ezgi çalar, aynısını çal; ezgi uzar |
| Ritim | Kalıplar ve usuller (Sofyan, Semâî, Düyek, Aksak, Ağır Aksak, Curcuna); erken/geç ve tutarlılık; metronomsuz iç tempo; hoparlörle ya da çalarak gecikme ayarı |
| Kulak | Tiz mi pes mi (uyarlanır merdivenle koma eşiği), perde ayırt (ABX, 1 komaya kadar), makam tanı |
| Seyir | Serbest çalma / taksim: perdelerde süre, dizi dışı, güçlü vurgusu, açılış, karar |
| Etüt ve eserler | Koma işaretli dizek (AEU: koma, bakiye, küçük/büyük mücenneb); 14 özgün etüt; kendi eserini yazma; **MusicXML / .mxl içe aktarma** (SymbTr dahil, komalar `<alter>`'den); serbest takip ve metronomla tempolu çalma (perde + zamanlama) |
| Kayıt | Kayıt, nota dökümü, kaydı dosya olarak paylaşma |
| İlerleme | Seri, günlük hedef, son 14 gün, test, uzun ton, entonasyon, ritim, kulak eşiği, seyir, eserler |

Usullü metronom ve durak sesi (dron) her sekmede üstteki araç çubuğundan tek dokunuşla açılır; ayarları
(usul, tempo, perde, ses düzeyi) ok düğmesiyle açılan kısımdadır. Dron hoparlörden çalarken sızıntı düzeyi
izlenir; durağı dronla birlikte çalmak da ölçülür.

## Ayarlar

Çalgı, diyapazon (La = 430–450 Hz), gösterge (koma / sent), hassasiyet ve **ortam gürültüsüne göre otomatik ayar**,
**hoparlör modu** (yankı giderme), günlük hedef ve (Android/iOS) **günlük hatırlatma**, tema, dil (Türkçe / İngilizce),
**yedekleme** (bütün ilerleme tek JSON dosyası) ve **uzman kontrolü** (hocaların parmakları ve makamları
doğru/yanlış diye işaretleyip rapor paylaşması). İlk açılışta karşılama akışı seviyeye göre başlangıç noktasını kurar.

## Çalıştırma

Mikrofon yalnızca `https://` ya da `localhost` üzerinden açılır:

```bash
npm start
```

Sonra http://localhost:8080 adresini aç. Uygulama bir kez açıldıktan sonra çevrimdışı da çalışır ve telefonda
“Ana ekrana ekle” ile kurulabilir. Bağlantılar: `index.html#nota=52` (yazılı MIDI, 52 = Mi3 … 99 = Mi♭7),
`?view=practice&tab=rhythm` (doğrudan bir sekme).

## Android ve iOS

Capacitor ile paketlenir: [docs/ANDROID.md](docs/ANDROID.md), [docs/IOS.md](docs/IOS.md).
Yeni sürüm için `npm run release -- 1.1.0` (package.json, service worker önbelleği, Android ve iOS sürüm numaraları).

## Test

```bash
npm test
npm run audio-check     # testdata/ içindeki gerçek klarnet kayıtlarıyla perde bulucu denetimi
```

`npm test` şunları doğrular: perde bulucu (800 gerçekçi sentetik klarnet sesi: telefon mikrofonu, vibrato, nefes,
yankı, atak), koma ve makam bağlamı, parmak kodları ve şema, 19 makamın dizileri, 46 dersin her adımı (iki dilli metin,
çalınabilir notalar, geçme koşulları, kilit sırası), ritim/ses kalitesi/dinamik/seyir/kulak ölçümleri, etütler ve
MusicXML, çevrimdışı önbellek ve Android paketinin tamlığı, bütün tarayıcı betiklerinin derlenmesi.
GitHub Actions her push'ta testleri çalıştırır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html`, `app.css`, `app.js` | Sayfa iskeleti, stiller; ayarlar, gösterge, parmak şeması, nota şeridi, ses, mikrofon, görünümler (`window.SK`) |
| `core.js` | Perde/nota hesabı, makam bağlamı, çalgılar, parmak kodları, perde bulucu (tarayıcı + Node) |
| `learn.js` | Makam ve usul verisi, icra düzeltmeleri, test, puanlama, istatistik (tarayıcı + Node) |
| `lessons.js` | Müfredat (iki dilli), adım başlıkları, geçme koşulları, kilit sırası, günlük plan (tarayıcı + Node) |
| `skills.js` | Nota başı bulma, ritim, ses kalitesi, dinamik, seyir analizi, kulak eğitimi (tarayıcı + Node) |
| `repertoire.js` | Süreli nota biçimi, AEU koma işaretleri, MusicXML, tempolu çalma değerlendirmesi, etütler (tarayıcı + Node) |
| `practice.js` | Çalışma bölümünün kabuğu: sekme menüsü, metronom ve dron, sürekli ölçümler, sekmelere verilen ortak yardımcılar |
| `drills.js` | Parmak testi, Uzun ton, Dizi (makam), Taklit, Kayıt ve İlerleme sekmeleri |
| `lessonview.js` | Dersler sekmesi: ders listesi, ders sayfası ve adım çalıştırıcıları |
| `trainers.js`, `pieces.js` | Ritim, Kulak, Seyir ve Eserler sekmeleri, yeni ders adımları |
| `review.js`, `onboard.js` | Uzman kontrolü, karşılama akışı |
| `i18n.js` | Tema ve dil; yeni metinler `L("Türkçe", "English")` ile, eskiler sözlükte |
| `fonts/` | Uygulamanın içindeki fontlar (`npm run fonts`) |
| `test.js`, `testaudio.js`, `testdata/` | Testler, sentetik klarnet sesleri, gerçek kayıtlar |

## Kaynaklar

Parmak verisi ve mandal adları: [Woodwind Fingering Guide — Oehler/Albert](https://www.wfg.woodwind.org/clarinet/ocl_bas_1.html),
[mandal açıklaması](https://www.wfg.woodwind.org/clarinet/cl_fing.html). Temel parmaklar `ocl_bas_1–3`, alternatifler
`ocl_alt_1–4` sayfalarından; Albert sistemde olmayan mandalları kullanan Oehler parmakları alınmadı.
Fontlar Google Fonts'tan (SIL Open Font License).

## Planlama

- [docs/BACKLOG.md](docs/BACKLOG.md): yapılanlar ve insan gerektiren işler
- [docs/TODO.md](docs/TODO.md): mağaza yayını için yapılacaklar
