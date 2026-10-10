# Sol Klarnet — Backlog

## Kapsamlı iyileştirme — tamamlandı (10 Ekim 2026)

- Perde bulucu: FFT ile NSDF, telefon mikrofonunun pes sesi kırpmasına karşı alt harmonik denetimi, tizde kısa pencere;
  800 gerçekçi sentetik seste eski bulucu 190, yeni bulucu 3 hata. Gerçek kayıtlar için `npm run audio-check`
- Makam bağlamı ve icra akordu; 10 yeni makam (toplam 19), her birinin seyir türü
- Ritim (kalıplar, usuller, iç tempo, gecikme ayarı), kulak eğitimi (koma eşiği, ABX, makam tanı), seyir/taksim analizi,
  ses kalitesi (netlik, ses gücü dengesi), dinamik (crescendo/decrescendo/messa di voce)
- Eserler: koma işaretli dizek, 14 özgün etüt, MusicXML/.mxl içe aktarma, tempolu çalma değerlendirmesi
- Müfredat 21 → 46 ders (Başlarken ve İleri seviye üniteleri dahil); günlük plan yeni becerileri de içeriyor
- Karşılama akışı, günlük hedef ve hatırlatma, yedekleme/geri yükleme, kaydı paylaşma, uzman kontrolü ekranı
- Çalgı seçimi (Sol, Si♭, La, Do, Mi♭), hoparlör modu (yankı giderme), ortam gürültüsüne göre hassasiyet
- Fontlar uygulamanın içinde, internet izni yok; iOS projesi; İngilizce arayüzde eksik çeviri kalmadı

## İnsan gerektiren işler (kodla çözülemez)

1. **Uzman doğrulaması:** Bir Sol klarnet hocası Ayarlar → Uzman kontrolü ekranından 124 parmağı, 19 makamın dizisini,
   seyir türünü ve icra düzeltmelerini işaretleyip raporu göndermeli. Ders metinleri ve 14 etüt de gözden geçirilmeli.
   Yanlış bulunanlar `core.js` (FINGERINGS, ALT_FINGERINGS), `learn.js` (MAKAMS, SEYIR_TYPE, ICRA) ve
   `repertoire.js` (ETUDES) içinde düzeltilir; testler tutarlılığı denetler.
2. **Gerçek kayıtlar:** `testdata/README.md` içindeki listeye göre telefonla kayıt toplanıp `npm run audio-check` çalıştırılmalı.
3. **WFG izni:** Parmak verisi Woodwind Fingering Guide'dan; ücretli yayınlanacaksa sahibinden izin istenmeli.
4. **Mağaza:** Play geliştirici hesabı, yükleme anahtarı, kapalı test; iOS için Mac + Xcode + Apple geliştirici hesabı;
   mağaza ekran görüntüleri ve tanıtım görseli.
5. **Repertuvar:** Telifli eserler eklenmedi; kullanıcı MusicXML içe aktarabiliyor. SymbTr gibi açık lisanslı arşivlerden
   seçki eklenecekse lisans koşulları kontrol edilmeli.

## Sonraki adım fikirleri

- Nim perdeler için çeyrek ses parmakları (WFG `ocl_qt_1`)
- Hocanın öğrenciye ödev ve etüt gönderebileceği paylaşım bağlantıları
- Kayıt üzerinde perde eğrisi (zaman–koma grafiği) ve hocanın işaret koyabilmesi


2 Ekim 2026 · Asıl doküman: [Claude Docs](https://claude.ai/code/artifact/f9c1b6aa-5fdc-475c-914d-1701a7b8a2b9)

## Dersler — tamamlandı (4 Ekim 2026)

Çalışma bölümüne ilk sekme olarak "Dersler" eklendi: 4 ünitede 21 ders (temeller, register ve klarino, teknik ve
üslup, makamlar), geçme koşullu adımlar, sıralı kilit ve günlük çalışma planı. Ders metinleri ve makam etütleri
uygulama için yazıldı; parmak anlatımları ve makam ezgileri bir hocaya ya da Sol klarnetçiye kontrol ettirilmeli.

Sonraki adım fikirleri: usullü ritim alıştırması (vuruşa göre zamanlama ölçümü), nim perdeler için çeyrek ses
parmakları, gerçek eserlerden kısa bölümler (lisans netleşince).

## Öğrenme özellikleri — tamamlandı (4 Ekim 2026)

Ayrıntılı kapsam ve kabul kriterleri: [Öğrenme Özellikleri Backlog](https://claude.ai/code/artifact/9aff5b8b-6e52-41e3-879b-4a5a2fde6749)

1. Parmak ezberi testi
2. Uzun ton ve entonasyon raporu (nota şeridinde ısı haritası)
3. Makam modu ve dizi alıştırması
4. Usullü metronom
5. Durak sesi (dron)
6. Taklit oyunu
7. Kayıt ve nota dökümü
8. Vibrato ve glissando ölçümü
9. İlerleme ve seri takibi
10. Eser takip modu

Onuncu madde hariç hepsi tasarlandığı gibi yapıldı. Eser takibinde SymbTr yerine makam alıştırmaları ve
kullanıcının kendi yazdığı ezgiler var (lisans sorusu açık kaldığı için). Makam dizileri ve usul vuruşları
çeşni tanımlarından kuruldu; bir hocaya ya da Sol klarnetçiye kontrol ettirilmeli.

## Alternatif parmak pozisyonları — tamamlandı (3 Ekim 2026)

Yazılı Mi3–Mi♭7 aralığında 48 temel parmak ve 76 alternatif eklendi ([ocl_alt_3](https://www.wfg.woodwind.org/clarinet/ocl_alt_3.html) ve [ocl_alt_4](https://www.wfg.woodwind.org/clarinet/ocl_alt_4.html) dahil). Alternatiflerin bir Türk Sol klarnetçisi tarafından gerçek çalgıda kontrol edilmesi hâlâ gerekiyor.

Amaç: her nota için temel parmağın yanında Albert sistemde çalınabilen alternatif parmakları da göstermek.

**Kaynak:** WFG alternatif parmak sayfaları ([chalumeau](https://www.wfg.woodwind.org/clarinet/ocl_alt_1.html), [klarino](https://www.wfg.woodwind.org/clarinet/ocl_alt_2.html)). Yazılı Mi3–Do6 aralığında temel parmaklar dahil yaklaşık 76 parmak var.

**Kapsam:**

- [x] Alternatif parmakları WFG'den derle, her biri için kaynağın açıklamasını (ör. "basit havalandırma parmağı") sakla.
- [x] Yalnızca Oehler'de olan mandalları kullananları ayıkla (ör. sol serçe Sol♯/Si♭, sol Fa ince mandalı); mevcut `keyInfo` kontrolü bunları zaten reddediyor.
- [x] Veri yapısını nota başına parmak listesine çevir; ilk eleman temel parmak kalsın.
- [x] Arayüz: parmak kartında "Temel / Alt. 1 / Alt. 2…" seçimi; çizim ve adım adım talimat seçilene göre güncellensin.
- [x] Her alternatifin yanında ne için kullanıldığı (tril, temiz ses, perde düzeltme) kısa notla yazsın.
- [x] Testler: tüm alternatifler ayrıştırılabiliyor, Albert mandallarıyla çalınabiliyor ve şemada çiziliyor.

**Kabul kriterleri:** Alternatifi olan her notada seçim görünür; temel parmak varsayılan kalır; listedeki her parmak WFG ile birebir aynıdır.

**Doğrulama:** Alternatifler WFG'nin Oehler/Albert ortak tablosundan geliyor. Bir Türk Sol klarnetçisinin gerçek çalgı üzerinde kontrol etmesi gerekir.

**Sonraki adım fikri:** WFG'nin [çeyrek ses sayfası](https://www.wfg.woodwind.org/clarinet/ocl_qt_1.html) nim perdeler için parmak önerileri içeriyor; AEU koma perdeleriyle eşleştirilebilir.
