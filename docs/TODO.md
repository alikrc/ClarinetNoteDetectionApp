# Sol Klarnet — Mobil ve Android TODO

2 Ekim 2026 · Asıl doküman: [Claude Docs](https://claude.ai/code/artifact/a46a8d96-6742-46c6-b1f0-edf82ee6e1c2)

## Kodda yapılacaklar

Bu beş madde alan adı kararından bağımsız; web sürümünü de iyileştirir ve önce bunlar yapılmalı.

- [x] **PNG simgeler:** 192 ve 512 piksellik PNG simge, ayrıca kenarları kırpılabilen "maskable" sürüm (şu an yalnızca SVG var).
- [ ] **Manifest'i tamamla:** `id` ve kısayollar (Akort, Dersler, Ritim, Eserler) eklendi; kalan: telefon ekran görüntüleri.
- [x] **Mobil görünüm:** Telefonda alt sekme geçişi ("Akort | Parmak"); çentikli ekranlar için güvenli alan boşlukları; aşağı çekince yenilemenin kapatılması. Geniş ekranda iki sütunlu düzen aynı kalır.
- [x] **Fontları uygulamanın içine al:** `fonts/` (`npm run fonts`); internet izni kaldırıldı.
- [x] **Gizlilik politikası sayfası:** (privacy.html) "Ses cihazda işlenir, hiçbir yere gönderilmez" diyen basit bir sayfa; mikrofon kullanan uygulamalar için Play Store zorunlu tutuyor.

## Android paketi — Capacitor (6 Ekim 2026)

TWA yerine Capacitor seçildi: dosyalar APK'nın içinde, alan adı ve `assetlinks.json` gerekmiyor, internetsiz açılıyor.
Ayrıntılar ve yayın adımları: [ANDROID.md](ANDROID.md).

- [x] Android projesi, simgeler, açılış ekranı, mikrofon izni, imzalama ayarı
- [ ] **Geliştirici hesabı:** Bir kerelik 25 dolar ve kimlik doğrulaması.
- [ ] **Yükleme anahtarı:** `keytool` ile üret, depo dışında yedekle (ANDROID.md).
- [ ] **GitHub Pages:** Gizlilik politikası URL'si için (Settings → Pages → `main` / root).
- [ ] **Kapalı test:** Yeni kişisel hesaplarda üretimden önce zorunlu; Play Console'da güncel şartı kontrol et.
- [ ] **Mağaza malzemeleri:** Telefon ekran görüntüleri, 1024×500 tanıtım görseli, kısa ve uzun açıklama.
- [ ] **Formlar:** İçerik derecelendirme anketi ve veri güvenliği formu (veri toplanmaz).

## iOS (10 Ekim 2026)

- [x] Capacitor iOS projesi, mikrofon izni açıklaması, simge ve açılış ekranı ([IOS.md](IOS.md))
- [ ] Mac + Xcode ile derleme, Apple geliştirici hesabı, TestFlight, App Store

## Notlar

- **Sıra:** Önce kod maddeleri, sonra alan adı ve Pages, en son Play Store.
- **Parmak verisi:** [Woodwind Fingering Guide](https://www.wfg.woodwind.org/clarinet/ocl_bas_1.html)'dan geliyor, sayfada telif notu var. Kaynak gösteriliyor; ücretli yayınlanacaksa sahibinden izin istenmeli.
