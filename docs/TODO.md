# Sol Klarnet — Mobil ve Android TODO

2 Ekim 2026 · Asıl doküman: [Claude Docs](https://claude.ai/code/artifact/a46a8d96-6742-46c6-b1f0-edf82ee6e1c2)

## Kodda yapılacaklar

Bu beş madde alan adı kararından bağımsız; web sürümünü de iyileştirir ve önce bunlar yapılmalı.

- [ ] **PNG simgeler:** 192 ve 512 piksellik PNG simge, ayrıca kenarları kırpılabilen "maskable" sürüm (şu an yalnızca SVG var).
- [ ] **Manifest'i tamamla:** `id` alanı, telefon ekran görüntüleri ve kısayol tanımları.
- [ ] **Mobil görünüm:** Telefonda alt sekme geçişi ("Akort | Parmak"); çentikli ekranlar için güvenli alan boşlukları; aşağı çekince yenilemenin kapatılması. Geniş ekranda iki sütunlu düzen aynı kalır.
- [ ] **Fontları uygulamanın içine al:** Google Fonts yerine dosyaları depoya koy; internetsiz ilk açılışta da doğru fontla açılsın.
- [ ] **Gizlilik politikası sayfası:** "Ses cihazda işlenir, hiçbir yere gönderilmez" diyen basit bir sayfa; mikrofon kullanan uygulamalar için Play Store zorunlu tutuyor.

## Altyapı: alan adı

Android uygulamasının (TWA) adres çubuğunu gizleyebilmesi için alan adının **kök dizininde** `/.well-known/assetlinks.json` doğrulama dosyası olmalı. `alikrc.github.io/SolKlarnet/` gibi bir alt dizin adresinde bu dosya konamaz.

- [ ] **Alan adı kararı:** Kendi alan adı (ör. `solklarnet.com`, yıllık birkaç yüz lira, önerilen) ya da ücretsiz `alikrc.github.io` kullanıcı sitesi deposu.
- [ ] **GitHub Pages'i aç:** Settings → Pages → Deploy from a branch → `main` / root; alan adı seçildiyse ona bağla.
- [ ] **`assetlinks.json` ekle:** Android paketi üretildikten sonra imza parmak iziyle doldurulur.

## Play Store

Android paketi TWA olarak Bubblewrap ya da PWABuilder ile üretilir; site güncellenince uygulama da güncellenir.

- [ ] **Geliştirici hesabı:** Bir kerelik 25 dolar ve kimlik doğrulaması.
- [ ] **Kapalı test:** Yeni kişisel hesaplarda en az 12 test kullanıcısıyla 14 gün (hatırladığım kural; Play Console'da güncelini kontrol et).
- [ ] **Android paketi:** Bubblewrap ile üret; paket adı önerisi `com.alikrc.solklarnet`.
- [ ] **İmzalama anahtarı:** Bubblewrap üretir; kaybolursa güncelleme yayınlanamaz, güvenli yerde yedekle.
- [ ] **Mağaza malzemeleri:** Telefon ekran görüntüleri, 1024×500 tanıtım görseli, kısa ve uzun açıklama.
- [ ] **Formlar:** İçerik derecelendirme anketi ve veri güvenliği formu (mikrofon yalnızca cihazda kullanılır, veri toplanmaz).

## Notlar

- **Sıra:** Önce kod maddeleri, sonra alan adı ve Pages, en son Play Store.
- **Parmak verisi:** [Woodwind Fingering Guide](https://www.wfg.woodwind.org/clarinet/ocl_bas_1.html)'dan geliyor, sayfada telif notu var. Kaynak gösteriliyor; ücretli yayınlanacaksa sahibinden izin istenmeli.
