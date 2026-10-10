# iOS sürümü (App Store)

iOS uygulaması da Android gibi [Capacitor](https://capacitorjs.com) ile paketlenir. Proje `ios/` klasöründedir
(Swift Package Manager; CocoaPods gerekmez). Derleme ve yayın için **macOS ve Xcode** gerekir; proje Windows'ta
oluşturuldu ama orada derlenemez.

- Paket kimliği: `com.alikrc.solklarnet` (`capacitor.config.json` → `appId`)
- En düşük iOS sürümü: Capacitor 8 varsayılanı (Xcode projesinde *Deployment Target*)
- İzin: mikrofon (`NSMicrophoneUsageDescription`, `ios/App/App/Info.plist`)
- Eklentiler: `@capacitor/filesystem`, `@capacitor/share` (yedeği kaydetmek ve uzman raporunu paylaşmak için)
- Uygulama arka plana geçince mikrofon kapanır; internet bağlantısı kullanılmaz

## Geliştirme (Mac)

Gerekenler: Node, Xcode (App Store'dan), bir Apple geliştirici hesabı (cihazda denemek için ücretsiz hesap yeter).

```bash
npm install
npm run ios:sync      # web dosyalarını www/'ye kopyala, iOS projesine aktar
npm run ios:open      # Xcode'da aç
```

Xcode'da *Signing & Capabilities* sekmesinde takımını seç, bir iPhone bağla ve Çalıştır'a bas.
Web kodunda her değişiklikten sonra `npm run ios:sync` çalıştırılmalı.

## Uygulama simgesi ve açılış ekranı

`ios/App/App/Assets.xcassets/AppIcon.appiconset` içinde Capacitor'ın varsayılan simgesi var. 1024×1024 simgeyi
`store/play-icon-512.png` ile aynı tasarımdan (icon.svg) üretip buraya koy; Xcode tek 1024 px simgeden diğer
boyutları kendisi türetir.

## App Store

1. App Store Connect'te uygulamayı oluştur (paket kimliği yukarıdaki).
2. Xcode → *Product → Archive* → *Distribute App* → App Store Connect.
3. TestFlight ile önce kendin ve birkaç deneyiciyle dene.
4. Mağaza bilgileri: ekran görüntüleri (6,7" ve 5,5" iPhone, isteğe bağlı iPad), açıklama, gizlilik politikası URL'si
   (`privacy.html`), *App Privacy* formunda "Veri toplanmıyor".
5. İnceleme notu: "Uygulama mikrofonu yalnızca kullanıcının çaldığı notanın perdesini ölçmek için kullanır;
   ses cihazda işlenir ve kaydedilmez/gönderilmez."
