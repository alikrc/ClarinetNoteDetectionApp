# Sol Klarnet Dinleyici — Backlog

2 Ekim 2026 · Asıl doküman: [Claude Docs](https://claude.ai/code/artifact/f9c1b6aa-5fdc-475c-914d-1701a7b8a2b9)

## Alternatif parmak pozisyonları

Her nota için şu an yalnızca temel (ilk) parmak gösteriliyor; amaç, Albert sistemde çalınabilen alternatif parmakları da göstermek.

**Kaynak:** WFG alternatif parmak sayfaları ([chalumeau](https://www.wfg.woodwind.org/clarinet/ocl_alt_1.html), [klarino](https://www.wfg.woodwind.org/clarinet/ocl_alt_2.html)). Yazılı Mi3–Do6 aralığında temel parmaklar dahil yaklaşık 76 parmak var.

**Kapsam:**

- [ ] Alternatif parmakları WFG'den derle, her biri için kaynağın açıklamasını (ör. "basit havalandırma parmağı") sakla.
- [ ] Yalnızca Oehler'de olan mandalları kullananları ayıkla (ör. sol serçe Sol♯/Si♭, sol Fa ince mandalı); mevcut `keyInfo` kontrolü bunları zaten reddediyor.
- [ ] Veri yapısını nota başına parmak listesine çevir; ilk eleman temel parmak kalsın.
- [ ] Arayüz: parmak kartında "Temel / Alt. 1 / Alt. 2…" seçimi; çizim ve adım adım talimat seçilene göre güncellensin.
- [ ] Her alternatifin yanında ne için kullanıldığı (tril, temiz ses, perde düzeltme) kısa notla yazsın.
- [ ] Testler: tüm alternatifler ayrıştırılabiliyor, Albert mandallarıyla çalınabiliyor ve şemada çiziliyor.

**Kabul kriterleri:** Alternatifi olan her notada seçim görünür; temel parmak varsayılan kalır; listedeki her parmak WFG ile birebir aynıdır.

**Doğrulama:** Alternatifler WFG'nin Oehler/Albert ortak tablosundan geliyor. Bir Türk Sol klarnetçisinin gerçek çalgı üzerinde kontrol etmesi gerekir.

**Sonraki adım fikri:** WFG'nin [çeyrek ses sayfası](https://www.wfg.woodwind.org/clarinet/ocl_qt_1.html) nim perdeler için parmak önerileri içeriyor; AEU koma perdeleriyle eşleştirilebilir.
