# Iowa Üniversitesi Si♭ klarnet kayıtları

Kaynak: University of Iowa Electronic Music Studios, *Musical Instrument Samples* —
https://theremin.music.uiowa.edu/MISBbclarinet.html

Site, kayıtların 1997'den beri ücretsiz olduğunu ve "herhangi bir projede kısıtlamasız" indirilip kullanılabileceğini
belirtir (https://theremin.music.uiowa.edu/MIS.html). Ayrı bir lisans belgesi yoktur. Teşekkür: Lawrence Fritts ve
University of Iowa Electronic Music Studios.

- Boehm sistem Si♭ klarnet, yankısız oda, 16 bit / 44,1 kHz mono AIFF
- Her dosya bir kromatik dizi: `BbClar.<dinamik>.<ilk><son>.aiff` (adlar **duyulan** sestir), dinamikler pp, mf, ff
- Toplam 13 dosya, Re3–Do7 (139 nota)

## Sonuç (10 Ekim 2026)

`npm run audio-check -- testdata/iowa`: 139 notanın 138'i doğru okunuyor. Kalan `BbClar.ff.C6B6.aiff` içindeki Sol♯6,
çalıcı tarafından yaklaşık 50 sent pes çalınmış (bağımsız FFT ölçümü 1617 Hz, −47 sent); bulucu hatası değil.

Bu kayıtlar Türk Sol klarnetinin tınısını, koma perdelerini, glissando ve vibratosunu temsil etmez; klarnet tınısında
oktav/onikili hatası ve pes/tiz/hafif/güçlü seslerde doğruluk için kullanılır. Sol klarnet kayıtları üst klasöre
(`testdata/`) eklenmeli.
