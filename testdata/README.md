# Gerçek klarnet kayıtları

Perde bulucuyu gerçek Sol klarnet sesiyle denetlemek için kayıtları bu klasöre koy, sonra:

```bash
npm run audio-check
```

## Dosya adı

`<yazılı nota>_<açıklama>.wav`. Örnekler:

- `Mi3_pes.wav`, `La4_uzun-ton.wav`, `Do6_tiz.wav`: yazılı nota (Sol klarnette yazılı Sol4 = duyulan Re4)
- `Segâh_uzun.wav`, `Dik_Kürdî_vibrato.wav`: AEU perde adı (boşluk yerine alt çizgi); koma sapması o perdeye göre ölçülür
- `taksim-ussak.wav`: nota adı yoksa yalnızca algılanan notaların dökümü verilir

## Neler kaydedilmeli

En değerli set, her register'dan ve farklı koşullardan kısa kayıtlar:

1. Yazılı Mi3'ten Do6'ya her nota, 2–3 saniye düz uzun ton (telefon mikrofonuyla, 50 cm–1 m uzaktan)
2. Aynı notaların birkaçı vibratolu ve hafif (piano) çalınmış hâli
3. Altissimo: Do♯6–Sol6
4. Makam perdeleri: Segâh, Bûselik, Kürdî, Dik Kürdî, Nim Hicaz, Hicaz, Evç, Acem (doğru basıldığından emin olunan)
5. Gürültülü oda ve yankılı oda örnekleri

WAV (16/24 bit PCM ya da 32 bit float, mono ya da stereo) okunur. Telefonun ses kaydedicisi genellikle m4a verir;
`ffmpeg -i kayit.m4a kayit.wav` ile çevrilebilir.

Bir kaydın sonucu FAIL ise (doğru nota oranı %95'in altında) dosyayı ve çıktıyı geliştiriciye ilet.
