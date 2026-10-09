# Android sürümü (Google Play)

Android uygulaması [Capacitor](https://capacitorjs.com) ile paketlenir: web dosyaları APK'nın içine girer, uygulama
internetsiz de açılır ve alan adı ya da `assetlinks.json` gerekmez (TWA yaklaşımının yerine).

- Paket adı: `com.alikrc.solklarnet` (Play'e ilk yüklemeden sonra değiştirilemez)
- `minSdk 24` (Android 7), `targetSdk 36`
- İzinler: `RECORD_AUDIO` (akort), `INTERNET` (yalnızca Google Fonts)
- Uygulamada service worker kullanılmaz; arka plana geçince mikrofon kapanır

## Geliştirme

Gerekenler: Node, JDK 21, Android SDK (`ANDROID_HOME`).

```bash
npm run android:sync     # web dosyalarını www/'ye kopyala, Android projesine aktar
npm run android:apk      # hata ayıklama APK'sı: android/app/build/outputs/apk/debug/
npm run android:open     # Android Studio'da aç (emülatör / cihazda çalıştırma)
npm run icons            # icon.svg değişince PNG simgeleri yeniden üret
```

Web kodunda her değişiklikten sonra `npm run android:sync` çalıştırılmalı.

## Sürüm yayınlama

1. **Yükleme anahtarı (bir kez):** depo dışında üret ve yedekle; kaybolursa Play Console'dan sıfırlatmak gerekir.
   ```bash
   keytool -genkeypair -v -keystore ../sol-klarnet-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   `android/keystore.properties.example` dosyasını `android/keystore.properties` olarak kopyalayıp şifreleri yaz
   (bu dosya depoya girmez).
2. **Sürüm numarası:** `android/app/build.gradle` içinde her yüklemede `versionCode` bir artırılır,
   `versionName` görünen sürümdür.
3. **Paket:** `npm run android:bundle` → `android/app/build/outputs/bundle/release/app-release.aab`
4. **Play Console:** Play App Signing açık kalsın; AAB'yi önce kapalı teste yükle.

## Mağaza için gerekenler

- **Gizlilik politikası URL'si:** `privacy.html` (GitHub Pages açılınca
  `https://alikrc.github.io/Sol-Klarnet/privacy.html`)
- **Uygulama simgesi:** `store/play-icon-512.png`
- **Tanıtım görseli** 1024×500 ve en az 2 telefon ekran görüntüsü (henüz yok)
- **Veri güvenliği formu:** veri toplanmıyor ve paylaşılmıyor; mikrofon sesi yalnızca cihazda işleniyor
- **İçerik derecelendirmesi:** herkes; kategori: Müzik ve Ses ya da Eğitim
- Yeni kişisel geliştirici hesaplarında üretime geçmeden önce kapalı test şartı var (Play Console'da güncelini kontrol et)
