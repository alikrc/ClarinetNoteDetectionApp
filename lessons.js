// Dersler: sıralı müfredat, her derste kısa anlatım ve geçme koşullu adımlar; günlük çalışma planı.
// Metinler iki dilde ({tr, en}) tutulur; arayüz LANG'a göre seçer. Nota adları adım başlıklarında üretilir.
// Tarayıcıda learn.js'ten sonra <script src="lessons.js"> ile, Node'da require("./lessons.js") ile yüklenir.
//
// Adım türleri (hepsi mikrofonla değerlendirilir, "listen" hariç):
//   listen  { notes | commas }               örnek ezgiyi dinle (geçme koşulu yok)
//   hold    { note, sec, min }               notayı sec saniye tut, en az min puan
//   notes   { notes | commas, maxMiss }      notaları sırayla çal, en çok maxMiss hata
//   quiz    { notes, mode, n, min }          n soruluk parmak testi ("play" çal / "find" bul), en az min doğru
//   scale   { makam, min }                   makam dizisi çıkış-iniş, perdelerin en az min oranı ±1 koma temiz
//   mimic   { makam | commas, len }          taklit oyununda len notalık ezgiye ulaş
//   vibrato { note, sec }                    notada sec saniye düzenli vibrato (4–8 Hz)
//   glide   { from, to, n }                  from'dan to'ya n kez glissando
//   read    { title, body }                   okuma (bilgi) adımı; "Okudum" ile geçilir
//   rhythm  { pattern | usul, tempo, bars, silent, min }  metronomla çal, en az min ritim puanı
//   dynamics{ note, sec, shape }              crescendo / decrescendo / messa di voce
//   seyir   { makam, sec, min }               serbest çalma (taksim), en az min seyir puanı
//   ear     { mode: "abx"|"makam", level | pool, n, min }  kulak: perde ayırt ya da makam tanı
//   hold'a quality eklenirse ses temizliği de en az o kadar olmalı

const LCORE = typeof module !== "undefined" ? require("./core.js") : { noteName, nearestPerde };
const LLEARN = typeof module !== "undefined" ? require("./learn.js")
  : { MAKAMS, makamById, perdeName, commaToWritten, quizWeight, USULS };

const UNITS = [
  { id:"baslangic", name:{ tr:"Başlarken", en:"Getting started" } },
  { id:"temel",  name:{ tr:"Temeller", en:"Basics" } },
  { id:"klarino", name:{ tr:"Register ve klarino", en:"Register and clarion" } },
  { id:"teknik", name:{ tr:"Teknik ve üslup", en:"Technique and style" } },
  { id:"makam",  name:{ tr:"Makamlar", en:"Makams" } },
  { id:"ileri",  name:{ tr:"İleri seviye", en:"Advanced" } }
];

const LESSONS = [
  // ---- Temeller ----
  { id:"ilk-ses", unit:"temel", notes:[67],
    title:{ tr:"İlk ses: açık Sol", en:"First sound: open G" },
    text:[
      { tr:"Sol klarnette yazılı Sol4 hiçbir delik kapatılmadan çalınır ve Rast perdesidir. Klarnet yazıldığından tam dörtlü pes duyulur; uygulama her yerde yazılı notayı gösterir.",
        en:"On the G clarinet, written G4 is played with every hole open and is the Rast perde. The clarinet sounds a perfect fourth lower than written; the app always shows the written note." },
      { tr:"Kamışı ağızda birkaç dakika nemlendir. Üst dişler ağızlığın üstüne hafifçe değsin, alt dudak alt dişleri örtsün; dudak köşeleri ağızlığı her yandan sarsın, çene düz kalsın.",
        en:"Wet the reed in your mouth for a few minutes. Rest the upper teeth lightly on top of the mouthpiece and cover the lower teeth with the lower lip; the corners of the mouth hug the mouthpiece and the chin stays flat." },
      { tr:"Nefesi karından al, sesi “tu” hecesiyle dilinle başlat. Önce kısa sesler, sonra uzun ve düz bir ses hedefle.",
        en:"Breathe from the belly and start the sound with the tongue on a “tu” syllable. Aim for short notes first, then a long, steady one." }
    ],
    tips:[
      { tr:"Ses cızırdıyorsa ağızlığı ağzına biraz az al ya da dudak baskısını azalt.", en:"If it squeaks, take a little less mouthpiece or ease the lip pressure." },
      { tr:"Ses çıkmıyorsa kamış kuru ya da bağ gevşek olabilir.", en:"If there is no sound, the reed may be dry or the ligature loose." }
    ],
    steps:[
      { type:"listen", notes:[67] },
      { type:"hold", note:67, sec:4, min:40 },
      { type:"hold", note:67, sec:8, min:55 }
    ] },

  { id:"sol-el-1", unit:"temel", notes:[66, 64, 62],
    title:{ tr:"Sol el: Fa♯4, Mi4, Re4", en:"Left hand: F♯4, E4, D4" },
    text:[
      { tr:"Sol el üst gövdededir. Başparmak arkadaki deliği kapatınca Fa♯4 çıkar. Buna işaret parmağını eklersen Mi4, orta parmağı da eklersen Re4 olur.",
        en:"The left hand is on the upper joint. Closing the thumb hole on the back gives F♯4. Add the index finger for E4, then the middle finger for D4." },
      { tr:"Delikleri parmak uçlarıyla değil, parmağın yumuşak ve düz yeriyle kapat. Hava kaçarsa ses cızırdar ya da hiç çıkmaz.",
        en:"Cover the holes with the soft, flat pad of the finger, not the tip. A leak makes the note squeak or not speak at all." }
    ],
    tips:[
      { tr:"Çalarken parmak kartında kapalı delikler koyu görünür; kendi parmağınla karşılaştır.", en:"While you play, the fingering card shows closed holes filled in; compare with your own fingers." }
    ],
    steps:[
      { type:"listen", notes:[67, 66, 64, 62] },
      { type:"hold", note:64, sec:4, min:45 },
      { type:"notes", notes:[67, 66, 64, 66, 67, 64, 62, 64, 67], maxMiss:3 },
      { type:"quiz", notes:[62, 64, 66, 67], mode:"play", n:8, min:6 }
    ] },

  { id:"sol-el-2", unit:"temel", notes:[60, 65],
    title:{ tr:"Sol el tamam: Do4 ve Fa4", en:"Full left hand: C4 and F4" },
    text:[
      { tr:"Sol elin üç parmağı ve başparmak kapalıyken Do4 çıkar. Bu, sol elin tam kapalı hâlidir; sağ el ilerleyen derslerde bunun altına eklenir.",
        en:"With the left thumb and three fingers closed you get C4. This is the full left hand; the right hand will be added below it in later lessons." },
      { tr:"Fa4 için Mi4 parmağına sağ elin yan mandalı eklenir (sağ işaret parmağının yanı). Parmak kartında hangi mandal olduğunu gör.",
        en:"F4 is the E4 fingering plus a right-hand side key (side of the right index finger). See which key on the fingering card." }
    ],
    tips:[
      { tr:"Re4 → Do4 geçişinde yüzük parmağını tam kapattığından emin ol; en sık hava kaçağı buradadır.", en:"On D4 → C4 make sure the ring finger seals fully; this is the most common leak." }
    ],
    steps:[
      { type:"listen", notes:[67, 65, 64, 62, 60] },
      { type:"hold", note:60, sec:4, min:45 },
      { type:"notes", notes:[60, 62, 64, 65, 67, 65, 64, 62, 60], maxMiss:3 },
      { type:"quiz", notes:[60, 62, 64, 65, 66, 67], mode:"find", n:8, min:6 }
    ] },

  { id:"sag-el", unit:"temel", notes:[59, 57, 55],
    title:{ tr:"Sağ el: Si3, La3, Sol3", en:"Right hand: B3, A3, G3" },
    text:[
      { tr:"Sol el tam kapalıyken sağ elin işaret parmağını ekle: Si3. Orta parmağı ekle: La3. Yüzük parmağını ekle: Sol3. Sağ el orta ve yüzük deliklerindeki halkalar parmakla birlikte kapanır.",
        en:"With the left hand fully closed, add the right index finger: B3. Add the middle finger: A3. Add the ring finger: G3. The rings on the right middle and ring holes close together with the finger." },
      { tr:"Pes notalar daha çok ve daha yavaş hava ister. Ağız boşluğunu “o” der gibi aç, dudağı sıkma.",
        en:"Low notes want more, slower air. Open the mouth cavity as if saying “o” and don't pinch the lips." }
    ],
    tips:[
      { tr:"Sol3 çıkmıyorsa önce Do4'ü çal, parmakları teker teker ekleyerek in; hangi parmakta bozulduğunu bul.", en:"If G3 won't speak, start on C4 and add fingers one at a time going down; find where it breaks." }
    ],
    steps:[
      { type:"listen", notes:[60, 59, 57, 55] },
      { type:"hold", note:55, sec:6, min:45 },
      { type:"notes", notes:[60, 59, 57, 55, 57, 59, 60, 62, 64, 62, 60, 59, 57, 55], maxMiss:4 },
      { type:"quiz", notes:[55, 57, 59, 60, 62, 64], mode:"play", n:10, min:7 }
    ] },

  { id:"pes", unit:"temel", notes:[53, 52, 58, 54, 56, 61, 63],
    title:{ tr:"Pes bölge ve serçe mandalları", en:"Low register and pinky keys" },
    text:[
      { tr:"Altı delik kapalıyken sağ serçe Fa mandalına basınca Fa3, buna sol serçe Mi mandalını da eklersen Mi3 çıkar. Mi3 Sol klarnetin en pes notasıdır.",
        en:"With all six holes closed, the right pinky F key gives F3; add the left pinky E key for E3, the lowest note on the G clarinet." },
      { tr:"Diyez ve bemoller (Fa♯3, Sol♯3, Si♭3, Do♯4, Mi♭4) serçe ve ince mandallarla çalınır. Her birini parmak kartında incele; bu derste hepsini birer kez tanıyacaksın.",
        en:"The sharps and flats (F♯3, G♯3, B♭3, C♯4, E♭4) use pinky and sliver keys. Study each one on the fingering card; in this lesson you meet them all once." }
    ],
    tips:[
      { tr:"Serçe parmakları gergin değil, mandalların üstünde gevşek dursun.", en:"Keep the pinkies relaxed just above the keys, not tense." }
    ],
    steps:[
      { type:"listen", notes:[55, 53, 52] },
      { type:"hold", note:52, sec:6, min:45 },
      { type:"notes", notes:[52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52], maxMiss:4 },
      { type:"quiz", notes:[52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64], mode:"find", n:10, min:7 }
    ] },

  { id:"bogaz", unit:"temel", notes:[68, 69, 70],
    title:{ tr:"Boğaz notaları: Sol♯4, La4, Si♭4", en:"Throat tones: G♯4, A4, B♭4" },
    text:[
      { tr:"Açık Sol'un üstündeki üç nota mandallarla çalınır: Sol♯4 için sol işaret parmağının iç yüzüyle yan mandal, La4 için işaret parmağını yukarı kaydırıp La mandalı, Si♭4 için La mandalına ek olarak başparmakla register.",
        en:"The three notes above open G use keys: G♯4 the side key with the inside of the left index finger, A4 the A key by sliding the index finger up, and B♭4 the A key plus the register key with the thumb." },
      { tr:"La4 Dügâh perdesidir; Türk müziğinde en çok karar verilen perdelerden biri. Sesin incelmemesi için ağız boşluğunu açık tut.",
        en:"A4 is the Dügâh perde, one of the most common finals in Turkish music. Keep the mouth cavity open so the tone doesn't thin out." }
    ],
    tips:[
      { tr:"Mi4 → La4 gibi geçişlerde parmakları aynı anda oynat; arada başka nota duyulmasın.", en:"On moves like E4 → A4, move the fingers together so no other note sneaks in." }
    ],
    steps:[
      { type:"listen", notes:[67, 68, 69, 70] },
      { type:"hold", note:69, sec:6, min:50 },
      { type:"notes", notes:[64, 67, 69, 67, 64, 62, 64, 67, 69, 70, 69, 67], maxMiss:3 },
      { type:"quiz", notes:[62, 64, 65, 66, 67, 68, 69, 70], mode:"play", n:10, min:7 }
    ] },

  // ---- Register ve klarino ----
  { id:"register", unit:"klarino", notes:[71, 72, 74],
    title:{ tr:"Register: Si4, Do5, Re5", en:"Register: B4, C5, D5" },
    text:[
      { tr:"Başparmak deliği kapalıyken register mandalına da basarsan ses on ikili (oktav + beşli) yükselir: Mi3 parmağı Si4, Fa3 parmağı Do5, Sol3 parmağı Re5 olur.",
        en:"Pressing the register key while the thumb hole stays closed raises the note by a twelfth (octave + fifth): the E3 fingering gives B4, F3 gives C5, and G3 gives D5." },
      { tr:"Klarino bölgesi daha hızlı ve daha sıkı bir hava ister, ama dudakla sıkmak sesi tizleştirir. Havayı hızlandır, dudağı değil.",
        en:"The clarion register wants faster, more focused air, but biting makes it sharp. Speed up the air, not the lips." },
      { tr:"Si4 Segâh/Bûselik perdesine düşer. Bu ders sonunda pes ve tiz bölgeyi birbirine bağlayabileceksin.",
        en:"B4 falls on the Segâh/Bûselik perde. By the end of this lesson you'll connect the low and high registers." }
    ],
    tips:[
      { tr:"Önce Mi3'ü çal, sesi kesmeden başparmakla register'a bas: Si4'e sıçramalı.", en:"Play E3, then press the register with the thumb without stopping the sound: it should jump to B4." }
    ],
    steps:[
      { type:"listen", notes:[52, 71, 53, 72, 55, 74] },
      { type:"notes", notes:[52, 71, 53, 72, 55, 74], maxMiss:3 },
      { type:"hold", note:72, sec:6, min:50 },
      { type:"notes", notes:[67, 69, 70, 71, 72, 74, 72, 71, 69, 67], maxMiss:3 }
    ] },

  { id:"klarino", unit:"klarino", notes:[76, 77, 78, 79, 81, 83, 84, 73, 75, 80, 82],
    title:{ tr:"Klarino bölgesi: Mi5'ten Do6'ya", en:"Clarion register: E5 to C6" },
    text:[
      { tr:"Klarino parmakları pes bölgenin aynısıdır, yalnızca register basılıdır: La3 → Mi5, Si3 → Fa♯5, Do4 → Sol5, Re4 → La5, Mi4 → Si5. Do6 için sol elde yalnızca orta parmak kapalıdır.",
        en:"Clarion fingerings are the low ones with the register pressed: A3 → E5, B3 → F♯5, C4 → G5, D4 → A5, E4 → B5. For C6 only the left middle finger is down." },
      { tr:"Sol5 Gerdâniye, La5 Muhayyer perdesidir; makamların tiz bölgesinde sık kullanılır.",
        en:"G5 is Gerdâniye and A5 is Muhayyer; makams use them often in the upper range." }
    ],
    tips:[
      { tr:"Tiz notalar tizleşmeye eğilimlidir; entonasyon izini izle, gerekirse çeneyi gevşet.", en:"High notes tend to go sharp; watch the intonation trace and loosen the jaw if needed." }
    ],
    steps:[
      { type:"listen", notes:[74, 76, 78, 79, 81, 83, 84] },
      { type:"notes", notes:[72, 74, 76, 77, 79, 81, 83, 84, 83, 81, 79, 77, 76, 74, 72], maxMiss:4 },
      { type:"hold", note:79, sec:8, min:55 },
      { type:"quiz", notes:[71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84], mode:"find", n:10, min:7 },
      { type:"quiz", notes:[71, 72, 74, 76, 77, 78, 79, 81, 83, 84], mode:"play", n:10, min:7 }
    ] },

  // ---- Teknik ve üslup ----
  { id:"uzun-ton", unit:"teknik", notes:[],
    title:{ tr:"Uzun ton ve temiz perde", en:"Long tones and clean pitch" },
    text:[
      { tr:"Uzun ton, klarnetçinin günlük ekmeğidir: sesi sabit, perdeyi temiz ve tonu dolgun tutmayı öğretir. Uygulama sapmanın dağılımını, perdeye yakınlığı ve süreyi puanlar.",
        en:"Long tones are a clarinettist's daily bread: they teach a steady sound, clean pitch and a full tone. The app scores the spread of deviation, closeness to the perde and duration." },
      { tr:"AEU sisteminde bir oktav 53 komadır; bir tam ses 9 koma. ±1 koma içinde kalan ses temiz sayılır. Durak sesini (dron) açıp onunla birlikte çalmak kulağını eğitir.",
        en:"In the AEU system an octave has 53 commas and a whole tone is 9. Staying within ±1 comma counts as clean. Playing along with the drone trains your ear." }
    ],
    tips:[
      { tr:"Sesin sonunu da başı kadar özenle bitir: perde düşmesin.", en:"End the note as carefully as you start it: don't let the pitch sag." },
      { tr:"Entonasyon haritasını aç; hangi notaları tiz ya da pes çaldığını gör.", en:"Turn on the intonation map to see which notes you play sharp or flat." }
    ],
    steps:[
      { type:"hold", note:67, sec:12, min:65 },
      { type:"hold", note:62, sec:12, min:65 },
      { type:"hold", note:69, sec:12, min:65 },
      { type:"hold", note:74, sec:12, min:65 },
      { type:"hold", note:55, sec:12, min:65 }
    ] },

  { id:"glissando", unit:"teknik", notes:[],
    title:{ tr:"Glissando", en:"Glissando" },
    text:[
      { tr:"Türk klarnetinin imzası kayan seslerdir. Glissando'da parmaklar deliklerden yavaşça kayarak açılır, dudak da sesi taşır; iki nota arasında perdeler kesintisiz duyulur.",
        en:"Sliding sounds are the signature of the Turkish clarinet. In a glissando the fingers roll slowly off the holes while the lips carry the sound, so every pitch between two notes is heard." },
      { tr:"Önce Re4'ten Sol4'e kay: parmakları birer birer değil, deliklerin kenarından sıyırarak kaldır. Uygulama kaymayı entonasyon izinde kesik çizgiyle işaretler.",
        en:"Start with D4 to G4: don't lift the fingers one by one, slide them off the edges of the holes. The app marks the slide with a dashed line on the intonation trace." }
    ],
    tips:[
      { tr:"Hızlı bir kayış atlama gibi duyulur; kaymayı en az yarım saniyeye yay.", en:"A fast slide sounds like a jump; stretch it over at least half a second." }
    ],
    steps:[
      { type:"glide", from:62, to:67, n:3 },
      { type:"glide", from:64, to:69, n:3 },
      { type:"glide", from:69, to:72, n:2 }
    ] },

  { id:"vibrato", unit:"teknik", notes:[],
    title:{ tr:"Vibrato", en:"Vibrato" },
    text:[
      { tr:"Türk klarnetinde vibrato çoğunlukla çene ve dudakla yapılır: çeneyi çok az, düzenli aralıklarla oynatarak perde hafifçe aşağı-yukarı dalgalanır.",
        en:"Turkish clarinet vibrato is mostly made with the jaw and lips: moving the jaw very slightly and evenly makes the pitch wave gently up and down." },
      { tr:"Önce yavaş ve geniş başla, sonra saniyede 5–6 dalgaya çık. Uygulama vibratonun hızını (Hz) ve derinliğini (± koma) ölçer; burada 4–8 Hz arası düzenli vibrato aranır.",
        en:"Start slow and wide, then build up to 5–6 waves per second. The app measures the rate (Hz) and depth (± commas); here an even vibrato between 4 and 8 Hz is required." }
    ],
    tips:[
      { tr:"Vibrato perdenin etrafında dalgalanmalı, perdeyi aşağı çekmemeli.", en:"Vibrato should wave around the perde, not drag it down." }
    ],
    steps:[
      { type:"vibrato", note:67, sec:2 },
      { type:"vibrato", note:69, sec:3 },
      { type:"vibrato", note:74, sec:3 }
    ] },

  // ---- Makamlar ----
  { id:"rast-giris", unit:"makam", notes:[], makam:"rast",
    title:{ tr:"Perdeler ve koma: Rast beşlisi", en:"Perdes and commas: the Rast pentachord" },
    text:[
      { tr:"Türk müziğinde notalar perde adıyla anılır. Rast (yazılı Sol4), Dügâh (La4), Segâh (Si4), Çargâh (Do5) ve Nevâ (Re5) Rast beşlisini kurar.",
        en:"In Turkish music notes are called by perde names. Rast (written G4), Dügâh (A4), Segâh (B4), Çargâh (C5) and Nevâ (D5) form the Rast pentachord." },
      { tr:"Segâh, Batı müziğindeki Si'den biraz pestir (Rast'tan 17 koma). Klarnette bunu dudakla hafifçe indirerek bulursun; göstergede koma sapmasını izle.",
        en:"Segâh is a little lower than Western B (17 commas above Rast). On the clarinet you find it by lowering the pitch slightly with the lips; watch the comma deviation on the display." }
    ],
    tips:[
      { tr:"Rast'ı dron yapıp beşliyi onun üstünde çal; Segâh'ın yerini kulağınla da duy.", en:"Set Rast as the drone and play the pentachord over it; hear where Segâh sits." }
    ],
    steps:[
      { type:"listen", commas:[0, 9, 17, 22, 31, 22, 17, 9, 0] },
      { type:"notes", commas:[0, 9, 17, 22, 31, 22, 17, 9, 0], maxMiss:3 },
      { type:"hold", note:71, sec:6, min:50, comma:17 },
      { type:"mimic", commas:[0, 9, 17, 22, 31], len:4 }
    ] },

  { id:"rast", unit:"makam", notes:[], makam:"rast",
    title:{ tr:"Rast makamı", en:"Makam Rast" },
    text:[
      { tr:"Rast, Rast beşlisine Nevâ'da Rast dörtlüsü eklenerek kurulur. Çıkarken Evç, inerken genellikle Acem basılır. Nevâ'da yarım karar, Rast'ta tam karar verilir.",
        en:"Rast is a Rast pentachord with a Rast tetrachord on Nevâ. Evç is used going up and usually Acem coming down. Half cadence on Nevâ, final on Rast." }
    ],
    tips:[
      { tr:"Evç (yazılı Fa♯5) çoğu klarnette biraz tiz çıkar; dudakla indir.", en:"Evç (written F♯5) comes out a bit sharp on most clarinets; lower it with the lips." }
    ],
    steps:[
      { type:"listen", commas:[0, 9, 17, 22, 31, 40, 48, 53, 44, 40, 31, 22, 17, 9, 0] },
      { type:"scale", makam:"rast", min:0.5 },
      { type:"notes", commas:[0, 9, 17, 22, 31, 22, 17, 22, 9, 0, 31, 40, 44, 40, 31, 22, 17, 9, 0], maxMiss:4 },
      { type:"mimic", makam:"rast", len:5 }
    ] },

  { id:"ussak", unit:"makam", notes:[], makam:"ussak",
    title:{ tr:"Uşşak makamı", en:"Makam Uşşak" },
    text:[
      { tr:"Uşşak, Dügâh'ta (yazılı La4) Uşşak dörtlüsü ile Nevâ'da Bûselik beşlisinden oluşur. Durak Dügâh, güçlü Nevâ'dır. Segâh perdesi Uşşak'ın rengini verir.",
        en:"Uşşak is an Uşşak tetrachord on Dügâh (written A4) plus a Bûselik pentachord on Nevâ. The final is Dügâh, the dominant Nevâ. The Segâh perde gives Uşşak its colour." },
      { tr:"Karara giderken sık sık Rast perdesine (yeden) inilip Dügâh'a dönülür.",
        en:"Approaching the final, the melody often dips to Rast (the leading tone) and returns to Dügâh." }
    ],
    tips:[
      { tr:"Durağı dron yap: Dügâh üstünde Segâh'ın pesliğini duymak kolaylaşır.", en:"Use the final as the drone: Segâh's lowness is easier to hear over Dügâh." }
    ],
    steps:[
      { type:"listen", commas:[9, 17, 22, 31, 22, 17, 9, 0, 9] },
      { type:"scale", makam:"ussak", min:0.55 },
      { type:"notes", commas:[9, 17, 22, 31, 40, 31, 22, 17, 22, 17, 9, 0, 9], maxMiss:3 },
      { type:"mimic", makam:"ussak", len:5 }
    ] },

  { id:"huseyni", unit:"makam", notes:[], makam:"huseyni",
    title:{ tr:"Hüseynî makamı", en:"Makam Hüseynî" },
    text:[
      { tr:"Hüseynî, Dügâh'ta Hüseynî beşlisi ile Hüseynî perdesinde (yazılı Mi5) Uşşak dörtlüsünden oluşur. Güçlüsü Hüseynî'dir; ezgi bu perdenin çevresinde dolaşır.",
        en:"Hüseynî is a Hüseynî pentachord on Dügâh plus an Uşşak tetrachord on the Hüseynî perde (written E5). The dominant is Hüseynî; the melody circles around it." },
      { tr:"Çıkarken Evç, inerken Acem kullanılır; Uşşak'tan farkı güçlünün yeridir.",
        en:"Evç going up, Acem coming down; it differs from Uşşak by where the dominant sits." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[9, 17, 22, 31, 40, 48, 40, 44, 40, 31, 22, 17, 9] },
      { type:"scale", makam:"huseyni", min:0.55 },
      { type:"notes", commas:[31, 40, 31, 40, 44, 40, 31, 22, 17, 22, 31, 22, 17, 9], maxMiss:3 },
      { type:"mimic", makam:"huseyni", len:5 }
    ] },

  { id:"hicaz", unit:"makam", notes:[], makam:"hicaz",
    title:{ tr:"Hicaz makamı", en:"Makam Hicaz" },
    text:[
      { tr:"Hicaz, Dügâh'ta Hicaz dörtlüsü (Dügâh, Dik Kürdî, Nim Hicaz, Nevâ) ile Nevâ'da Rast beşlisinden oluşur. Dik Kürdî ile Nim Hicaz arasındaki geniş aralık Hicaz'ın tanınan rengidir.",
        en:"Hicaz is a Hicaz tetrachord on Dügâh (Dügâh, Dik Kürdî, Nim Hicaz, Nevâ) plus a Rast pentachord on Nevâ. The wide step between Dik Kürdî and Nim Hicaz is its familiar colour." },
      { tr:"Dik Kürdî yazılı Si♭4, Nim Hicaz yazılı Do♯5 parmağıyla çalınır.",
        en:"Dik Kürdî uses the written B♭4 fingering and Nim Hicaz the written C♯5 fingering." }
    ],
    tips:[
      { tr:"Nim Hicaz'ı fazla tiz basma; Nevâ'ya yaslanan bir yeden gibi düşün.", en:"Don't push Nim Hicaz too high; think of it leaning towards Nevâ." }
    ],
    steps:[
      { type:"listen", commas:[9, 14, 26, 31, 26, 14, 9] },
      { type:"scale", makam:"hicaz", min:0.55 },
      { type:"notes", commas:[9, 14, 26, 31, 40, 31, 26, 14, 9, 14, 26, 31, 44, 40, 31, 26, 14, 9], maxMiss:4 },
      { type:"mimic", makam:"hicaz", len:5 }
    ] },

  { id:"nihavend", unit:"makam", notes:[], makam:"nihavend",
    title:{ tr:"Nihâvend makamı", en:"Makam Nihâvend" },
    text:[
      { tr:"Nihâvend, Rast'ta Bûselik beşlisi ile Nevâ'da Kürdî dörtlüsünden oluşur; çıkarken Hicaz dörtlüsü (Evç) de kullanılır. Batı minörüne benzer ama Kürdî perdesi ondan biraz farklıdır.",
        en:"Nihâvend is a Bûselik pentachord on Rast plus a Kürdî tetrachord on Nevâ; going up a Hicaz tetrachord (Evç) is also used. It resembles Western minor, but the Kürdî perde differs slightly." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[0, 9, 13, 22, 31, 22, 13, 9, 0] },
      { type:"scale", makam:"nihavend", min:0.55 },
      { type:"notes", commas:[0, 9, 13, 22, 31, 35, 48, 53, 44, 35, 31, 22, 13, 9, 0], maxMiss:4 },
      { type:"mimic", makam:"nihavend", len:5 }
    ] },

  { id:"kurdi", unit:"makam", notes:[], makam:"kurdi",
    title:{ tr:"Kürdî makamı", en:"Makam Kürdî" },
    text:[
      { tr:"Kürdî, Dügâh'ta Kürdî dörtlüsü (Dügâh, Kürdî, Çargâh, Nevâ) ile Nevâ'da Bûselik beşlisinden oluşur. Dügâh ile Kürdî arası küçük (4 koma) bir adımdır.",
        en:"Kürdî is a Kürdî tetrachord on Dügâh (Dügâh, Kürdî, Çargâh, Nevâ) plus a Bûselik pentachord on Nevâ. Dügâh to Kürdî is a small step (4 commas)." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[9, 13, 22, 31, 22, 13, 9] },
      { type:"scale", makam:"kurdi", min:0.55 },
      { type:"notes", commas:[9, 13, 22, 31, 40, 44, 40, 31, 22, 13, 9], maxMiss:3 },
      { type:"mimic", makam:"kurdi", len:5 }
    ] },

  { id:"saba", unit:"makam", notes:[], makam:"saba",
    title:{ tr:"Saba makamı", en:"Makam Saba" },
    text:[
      { tr:"Saba, Dügâh'ta Saba dörtlüsü (Dügâh, Segâh, Çargâh, Hicaz) ile kurulur; Çargâh'ta Hicaz çeşnisi duyulur. Diziyi oktavda tekrar etmez, bu yüzden hüzünlü ve kendine has bir renk taşır.",
        en:"Saba is built on a Saba tetrachord on Dügâh (Dügâh, Segâh, Çargâh, Hicaz), with a Hicaz flavour on Çargâh. Its scale doesn't repeat at the octave, which gives it a mournful, unique colour." },
      { tr:"Hicaz perdesi yazılı Do♯5 parmağıyla çalınır; Çargâh'tan hemen sonra geldiği için temiz basmak zordur.",
        en:"The Hicaz perde uses the written C♯5 fingering; coming right after Çargâh it is hard to place cleanly." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[9, 17, 22, 27, 22, 17, 9] },
      { type:"scale", makam:"saba", min:0.5 },
      { type:"notes", commas:[9, 17, 22, 27, 22, 17, 9, 17, 22, 27, 40, 27, 22, 17, 9], maxMiss:4 },
      { type:"mimic", makam:"saba", len:5 }
    ] },

  { id:"segah", unit:"makam", notes:[], makam:"segah",
    title:{ tr:"Segâh makamı", en:"Makam Segâh" },
    text:[
      { tr:"Segâh makamının durağı Segâh perdesidir (yazılı Si4). Segâh beşlisi üstünde Nevâ ve Evç çevresinde gezinir, Segâh'ta karar verir.",
        en:"Makam Segâh ends on the Segâh perde (written B4). It wanders around Nevâ and Evç over a Segâh pentachord and resolves to Segâh." },
      { tr:"Durak perdesi Batı Si'sinden pes olduğu için bu makamda dudak kontrolü özellikle önemlidir.",
        en:"Because the final is lower than Western B, lip control matters especially in this makam." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[17, 22, 31, 22, 17, 9, 17] },
      { type:"scale", makam:"segah", min:0.5 },
      { type:"notes", commas:[17, 22, 31, 40, 48, 40, 31, 22, 17, 9, 17], maxMiss:3 },
      { type:"mimic", makam:"segah", len:5 }
    ] },

  { id:"huzzam", unit:"makam", notes:[], makam:"huzzam",
    title:{ tr:"Hüzzam makamı", en:"Makam Hüzzam" },
    text:[
      { tr:"Hüzzam da Segâh'ta karar verir, ama Nevâ'da Hicaz çeşnisi (Hisar, Evç) belirgindir. Hisar uygulamada biraz tiz basılır.",
        en:"Hüzzam also ends on Segâh, but has a prominent Hicaz flavour on Nevâ (Hisar, Evç). In practice Hisar is played a little high." }
    ],
    tips:[],
    steps:[
      { type:"listen", commas:[17, 22, 31, 36, 48, 36, 31, 22, 17] },
      { type:"scale", makam:"huzzam", min:0.5 },
      { type:"notes", commas:[17, 22, 31, 36, 48, 53, 48, 36, 31, 22, 17, 9, 17], maxMiss:3 },
      { type:"mimic", makam:"huzzam", len:5 }
    ] }
];

// ---- Başlarken: hiç klarnet çalmamış biri için ----
const BASLANGIC = [
  { id:"klarneti-tani", unit:"baslangic", notes:[],
    title:{ tr:"Klarneti tanı ve kur", en:"Meet and assemble the clarinet" },
    text:[
      { tr:"Sol klarnet, Türk müziğinde en çok kullanılan klarnettir. Albert sistemdir: Batı'daki Boehm klarnetten daha az mandalı vardır, glissando ve kayan seslere çok uygundur.",
        en:"The G clarinet is the most common clarinet in Turkish music. It is an Albert-system instrument: fewer keys than the Western Boehm clarinet and very well suited to glissandi and sliding sounds." }
    ],
    tips:[
      { tr:"Klarneti kurarken mandallara değil, gövdenin tahta kısmına bastır; mandal ve halkalar kolay eğilir.", en:"When assembling, push on the wood, not the keys; keys and rings bend easily." }
    ],
    steps:[
      { type:"read", title:{ tr:"Parçalar", en:"The parts" }, body:[
        { tr:"Yukarıdan aşağı: ağızlık (kamış ve bağ üstündedir), baş (fıçı), üst gövde (sol el), alt gövde (sağ el) ve kalak. Arkadaki başparmak deliği ve register mandalı sol başparmakla kullanılır.",
          en:"From the top: the mouthpiece (with reed and ligature), the barrel, the upper joint (left hand), the lower joint (right hand) and the bell. The thumb hole and register key on the back are for the left thumb." },
        { tr:"Uygulamadaki parmak şeması klarneti senin gözünden gösterir: üstte sol el, altta sağ el; başparmak deliği ve register solda ayrıca çizilidir.",
          en:"The fingering chart in the app shows the clarinet from your point of view: left hand on top, right hand below; the thumb hole and register key are drawn separately on the left." } ] },
      { type:"read", title:{ tr:"Kurma sırası", en:"Assembly order" }, body:[
        { tr:"Mantarlara biraz mantar yağı sür. Kalağı alt gövdeye, alt gövdeyi üst gövdeye takarken köprü mandallarının hizalı olmasına dikkat et; sonra başı ve ağızlığı tak.",
          en:"Put a little cork grease on the corks. Fit the bell to the lower joint and the lower joint to the upper joint, keeping the bridge keys lined up; then add the barrel and the mouthpiece." },
        { tr:"Kamışı ıslat, ağızlığın düz yüzüne yerleştir: kamışın ucu ağızlığın ucuyla aynı hizada ya da kıl payı aşağıda olsun. Bağı kamışın kalın kısmına, fazla sıkmadan tak.",
          en:"Wet the reed and place it on the flat side of the mouthpiece: the tip level with the mouthpiece tip or a hair below. Put the ligature over the thick part of the reed without over-tightening." } ] },
      { type:"read", title:{ tr:"Kamış ve bakım", en:"Reeds and care" }, body:[
        { tr:"Başlangıçta yumuşak kamış (2–2½ numara) kullan; sert kamış hem yorar hem sesi çıkarmayı zorlaştırır. Birkaç kamışı sırayla kullan, kamışları kutusunda sakla.",
          en:"Start with a soft reed (strength 2–2½); a hard reed is tiring and makes the sound harder to produce. Rotate a few reeds and keep them in a case." },
        { tr:"Çaldıktan sonra içini temizleme bezi (swab) ile kurula, kamışı çıkarıp sil. Klarneti güneşte, kaloriferin yanında ya da soğuk arabada bırakma: tahta çatlayabilir.",
          en:"After playing, pull a swab through the bore and wipe the reed. Never leave the clarinet in the sun, by a radiator or in a cold car: the wood can crack." } ] }
    ] },

  { id:"durus-nefes", unit:"baslangic", notes:[67],
    title:{ tr:"Duruş, ağız ve nefes", en:"Posture, embouchure and breath" },
    text:[
      { tr:"İyi bir ses, iyi bir duruş ve nefesle başlar. Bu derste ağız pozisyonunu (embouchure) kurup ilk sesini uzun ve düz tutmayı deneyeceksin.",
        en:"A good sound starts with good posture and breath. In this lesson you set up the embouchure and try to hold your first note long and steady." }
    ],
    tips:[
      { tr:"Omuzların düşük, sırtın dik olsun; klarnet gövdene yaklaşık 40 derece açıyla dursun.", en:"Keep your shoulders low and back straight; hold the clarinet at about 40 degrees from your body." }
    ],
    steps:[
      { type:"read", title:{ tr:"Ağız pozisyonu", en:"Embouchure" }, body:[
        { tr:"Alt dudak alt dişlerin üstünü hafifçe örtsün, kamış alt dudağın üstüne otursun. Üst dişler ağızlığın üstüne hafifçe değsin. Dudak köşeleri ağızlığı her yandan sarsın, çene düz ve aşağıda kalsın.",
          en:"The lower lip lightly covers the lower teeth and the reed rests on it. The upper teeth touch the top of the mouthpiece lightly. The corners of the mouth hug the mouthpiece and the chin stays flat and down." },
        { tr:"Türk klarnetinde dudak biraz daha gevşek tutulur: perdeyi dudakla oynatabilmek (koma, glissando) bu esnekliğe bağlıdır.",
          en:"Turkish clarinet players keep the lips a little looser: bending the pitch with the lips (commas, glissandi) depends on this flexibility." } ] },
      { type:"read", title:{ tr:"Nefes", en:"Breathing" }, body:[
        { tr:"Nefesi göğsünle değil karnınla al: alırken karın öne doğru şişer, omuzlar kalkmaz. Verirken havayı sabit bir akışla, ince bir hortumdan geçirir gibi gönder.",
          en:"Breathe with your belly, not your chest: the belly moves out as you breathe in and the shoulders stay down. Send the air out in a steady stream, as if through a thin hose." },
        { tr:"Sesi “tu” hecesiyle, dilinle kamışa dokunup çekerek başlat. Sesin ortası kadar sonu da önemlidir: havayı birden kesme.",
          en:"Start the note with a “tu”: touch the reed with the tongue and release it. The end of the note matters as much as the middle: don't cut the air suddenly." } ] },
      { type:"listen", notes:[67] },
      { type:"hold", note:67, sec:3, min:30 },
      { type:"hold", note:67, sec:6, min:45 }
    ] },

  { id:"nota-okuma", unit:"baslangic", notes:[64, 65, 67, 69, 71, 72],
    title:{ tr:"Nota okuma: dizek ve nota adları", en:"Reading music: the staff and note names" },
    text:[
      { tr:"Klarnet notası sol anahtarıyla, beş çizgili dizeğe yazılır. Notanın çizgide ya da aralıkta oluşu adını belirler.",
        en:"Clarinet music is written in the treble (G) clef on a five-line staff. Whether a note sits on a line or in a space gives its name." },
      { tr:"Çizgiler aşağıdan yukarı: Mi, Sol, Si, Re, Fa. Aralıklar: Fa, La, Do, Mi. Dizeğin dışındakiler ek çizgilerle yazılır (ör. Do4 bir ek çizgi aşağıda).",
        en:"Lines from the bottom: E, G, B, D, F. Spaces: F, A, C, E. Notes outside the staff use ledger lines (e.g. C4 one ledger line below)." }
    ],
    tips:[
      { tr:"Sol anahtarı ikinci çizgiden başlar: o çizgi Sol'dür ve Türk müziğinde Rast perdesidir.", en:"The treble clef curls around the second line: that line is G, the Rast perde in Turkish music." },
      { tr:"Diyez (♯) yarım ses tizleştirir, bemol (♭) yarım ses pesleştirir.", en:"A sharp (♯) raises a note by a semitone, a flat (♭) lowers it by a semitone." }
    ],
    steps:[
      { type:"read", title:{ tr:"Türk müziği notasındaki koma işaretleri", en:"Comma accidentals in Turkish notation" }, body:[
        { tr:"Türk müziği notasında diyez ve bemoller koma sayısını da gösterir: koma (1 koma), bakiye (4), küçük mücenneb (5) ve büyük mücenneb (8). Örneğin Segâh, Si'nin 1 koma pesi (Si üstünde koma bemolü) olarak yazılır.",
          en:"Turkish notation uses accidentals that show how many commas: koma (1 comma), bakiye (4), küçük mücenneb (5) and büyük mücenneb (8). For example Segâh is written as B lowered by one comma (a koma flat on B)." },
        { tr:"Uygulama her yerde yazılı notayı ve perde adını birlikte gösterir; perde adı hangi koma işaretinin kastedildiğini söyler.",
          en:"The app always shows the written note together with the perde name; the perde name tells you which comma accidental is meant." } ] },
      { type:"quiz", notes:[64, 65, 67, 69, 71, 72], mode:"staff", n:8, min:6 }
    ] },

  { id:"ritim-temel", unit:"baslangic", notes:[],
    title:{ tr:"Ritim: vuruş ve nota değerleri", en:"Rhythm: the beat and note values" },
    text:[
      { tr:"Müzikteki düzenli nabza vuruş denir; tempo, dakikadaki vuruş sayısıdır. Dörtlük nota bir vuruş, ikilik iki, birlik dört vuruş sürer; sekizlik notada bir vuruşa iki nota düşer.",
        en:"The steady pulse in music is the beat; tempo is beats per minute. A quarter note lasts one beat, a half note two and a whole note four; two eighth notes fit in one beat." },
      { tr:"Bu derste herhangi bir notayı (ör. açık Sol) metronomla birlikte kısa kısa çalacaksın. Uygulama her notanın vuruşa göre erken mi geç mi geldiğini ölçer.",
        en:"In this lesson you play short notes (e.g. open G) with the metronome. The app measures whether each note comes early or late against the beat." }
    ],
    tips:[
      { tr:"İlk ölçü sayımdır: dinle, ikinci ölçüde çalmaya başla.", en:"The first bar is a count-in: listen, start playing on the second bar." },
      { tr:"Telefon hoparlörden çalıyorsa Ritim sekmesindeki gecikme ayarını bir kez yap.", en:"If the phone plays through its speaker, run the latency calibration in the Rhythm tab once." }
    ],
    steps:[
      { type:"rhythm", pattern:"quarter", tempo:60, bars:4, min:55 },
      { type:"rhythm", pattern:"half", tempo:70, bars:4, min:55 },
      { type:"rhythm", pattern:"eighth", tempo:60, bars:4, min:50 }
    ] }
];

// ---- Teknik ünitesine eklenen dersler ----
const TEKNIK2 = [
  { id:"register-gecisi", unit:"teknik", notes:[],
    title:{ tr:"Register geçişi (kırılma)", en:"Crossing the break" },
    text:[
      { tr:"Si♭4 (boğaz notası) ile Si4 (klarino) arasında parmaklar neredeyse tamamen değişir; buna kırılma denir. Geçişte arada istenmeyen sesler duyulmaması için sağ el parmaklarını önceden kapatabilirsin.",
        en:"Between B♭4 (throat) and B4 (clarion) almost every finger changes; this is the break. To avoid stray notes in between you can keep the right-hand fingers down in advance." }
    ],
    tips:[
      { tr:"Havayı geçiş boyunca kesme; dudak değil hava hızlansın.", en:"Don't stop the air through the change; speed up the air, not the lips." }
    ],
    steps:[
      { type:"listen", notes:[69, 70, 71, 72, 71, 70, 69] },
      { type:"notes", notes:[69, 70, 71, 70, 69, 71, 72, 71, 70, 69], maxMiss:2 },
      { type:"notes", notes:[67, 71, 67, 72, 67, 74, 72, 71, 70, 69, 67], maxMiss:2 },
      { type:"hold", note:71, sec:8, min:55 }
    ] },

  { id:"artikulasyon", unit:"teknik", notes:[],
    title:{ tr:"Dil vuruşu (artikülasyon)", en:"Tonguing (articulation)" },
    text:[
      { tr:"Notaları dille ayırmak, hızlı pasajlarda ve oyun havalarında temel tekniktir. Dilin ucu kamışın ucuna hafifçe dokunup çekilir; hava hiç kesilmez, yalnızca dil sesi böler.",
        en:"Separating notes with the tongue is essential for fast passages and dance tunes. The tip of the tongue touches the tip of the reed and releases; the air never stops, only the tongue interrupts the sound." },
      { tr:"Uygulama aynı notayı dille tekrarladığını da sayar: ses kısa bir an kısılıp yeniden yükselince yeni nota başı olarak algılanır.",
        en:"The app also counts repeated tongued notes: a short dip and rise in the sound is detected as a new note." }
    ],
    tips:[
      { tr:"“Tu-tu-tu” hecelerini fısıldayarak dilin yerini bul; çene oynamasın.", en:"Whisper “tu-tu-tu” to find the tongue position; keep the jaw still." }
    ],
    steps:[
      { type:"rhythm", pattern:"quarter", tempo:80, bars:4, min:65 },
      { type:"rhythm", pattern:"eighth", tempo:70, bars:4, min:60 },
      { type:"rhythm", pattern:"dotted", tempo:70, bars:4, min:55 },
      { type:"rhythm", pattern:"offbeat", tempo:70, bars:4, min:55 }
    ] },

  { id:"dinamik", unit:"teknik", notes:[],
    title:{ tr:"Dinamik: hafif ve güçlü", en:"Dynamics: soft and loud" },
    text:[
      { tr:"Müziği canlı kılan, sesin gücündeki değişimlerdir. Crescendo sesi giderek güçlendirmek, decrescendo giderek hafifletmektir. Zor olan, ses gücü değişirken perdeyi sabit tutmaktır: klarnette ses açılınca perde kayma eğilimindedir.",
        en:"Changes in volume bring music to life. A crescendo grows louder, a decrescendo softer. The hard part is keeping the pitch steady while the volume changes: on the clarinet the pitch tends to drift as the sound opens up." }
    ],
    tips:[
      { tr:"Ses gücünü dudakla değil hava miktarıyla değiştir; hafif seste de hava desteğini bırakma.", en:"Change the volume with the amount of air, not the lips; keep supporting the air even when soft." }
    ],
    steps:[
      { type:"dynamics", note:67, sec:5, shape:"cresc" },
      { type:"dynamics", note:67, sec:5, shape:"dim" },
      { type:"dynamics", note:69, sec:8, shape:"messa" },
      { type:"dynamics", note:74, sec:8, shape:"messa" }
    ] },

  { id:"ses-kalitesi", unit:"teknik", notes:[],
    title:{ tr:"Ses kalitesi: temiz ve dolgun ton", en:"Tone quality: a clean, full sound" },
    text:[
      { tr:"Temiz bir sesin içinde hava ve cızırtı duyulmaz. Uygulama sesin ne kadar periyodik (net) olduğunu ve ses gücünün ne kadar sabit kaldığını ölçer. Bu dersteki uzun tonları hem perde hem de ses temizliği şartıyla geçeceksin.",
        en:"A clean sound has no air or buzz in it. The app measures how periodic (clear) the sound is and how steady its volume stays. In this lesson the long tones must pass both the pitch and the tone-clarity requirement." }
    ],
    tips:[
      { tr:"Ses havalıysa ağızlığı ağzına biraz daha az al ve dudak köşelerini sıkılaştır.", en:"If the tone is airy, take a little less mouthpiece and firm up the corners." },
      { tr:"Cızırdıyorsa kamışı kontrol et; ucu çatlak ya da çok sert olabilir.", en:"If it buzzes, check the reed; the tip may be chipped or too hard." }
    ],
    steps:[
      { type:"hold", note:67, sec:8, min:60, quality:60 },
      { type:"hold", note:62, sec:8, min:60, quality:60 },
      { type:"hold", note:74, sec:8, min:60, quality:55 },
      { type:"hold", note:55, sec:8, min:55, quality:55 }
    ] },

  { id:"usul", unit:"teknik", notes:[],
    title:{ tr:"Usuller: düm ve tek", en:"Usuls: düm and tek" },
    text:[
      { tr:"Türk müziğinde ritim kalıplarına usul denir. Her usul düm (kalın, vurgulu) ve tek (ince) vuruşlardan oluşur. Sofyan 4/4: Düm · Tek Tek; Semâî 3/4: Düm Tek Tek; Düyek 8/8; Aksak 9/8.",
        en:"Rhythmic cycles in Turkish music are called usuls. Each usul is built from düm (deep, accented) and tek (light) strokes. Sofyan 4/4: Düm · Tek Tek; Semâî 3/4: Düm Tek Tek; Düyek 8/8; Aksak 9/8." },
      { tr:"Bu derste usulün vuruşlarında kısa notalar çalacaksın. Aksak gibi aksak usullerde vuruşlar eşit aralıklı değildir: sayarken 2+2+2+3 diye düşün.",
        en:"In this lesson you play short notes on the usul's strokes. In limping usuls like Aksak the strokes are not evenly spaced: count 2+2+2+3." }
    ],
    tips:[
      { tr:"Önce usulü metronomla dinle (Çalışma bölümündeki usullü metronom), sonra elinle vurarak say.", en:"First listen to the usul on the metronome (the usul metronome in the Practice section), then tap it with your hand." }
    ],
    steps:[
      { type:"rhythm", usul:"sofyan", tempo:100, bars:4, min:60 },
      { type:"rhythm", usul:"semai", tempo:110, bars:4, min:60 },
      { type:"rhythm", usul:"duyek", tempo:160, bars:3, min:55 },
      { type:"rhythm", usul:"aksak", tempo:180, bars:3, min:55 }
    ] },

  { id:"kulak-1", unit:"teknik", notes:[],
    title:{ tr:"Kulak eğitimi: koma farkını duymak", en:"Ear training: hearing commas" },
    text:[
      { tr:"Makam müziğini doğru çalmanın ön şartı, perdeler arasındaki küçük farkları duymaktır. Örneğin Kürdî ile Dik Kürdî arasında yalnızca 1 koma (yaklaşık 23 sent) vardır.",
        en:"Playing makam music in tune starts with hearing the small differences between perdes. For example Kürdî and Dik Kürdî are just 1 comma (about 23 cents) apart." },
      { tr:"Bu derste A ve B perdelerini dinleyip X'in hangisi olduğunu bulacaksın. Kulak sekmesindeki “tiz mi pes mi” alıştırmasıyla da her gün birkaç dakika çalış.",
        en:"In this lesson you listen to perdes A and B and decide which one X was. Also spend a few minutes a day on “higher or lower” in the Ear tab." }
    ],
    tips:[
      { tr:"Kulaklık kullan ve sessiz bir ortam seç.", en:"Use headphones and a quiet room." }
    ],
    steps:[
      { type:"ear", mode:"abx", level:1, n:8, min:6 },
      { type:"ear", mode:"abx", level:2, n:8, min:5 }
    ] }
];

// ---- Makam ünitesine eklenen dersler ----
// Kısa kalıp: listen (çıkış-iniş), scale, notes (seyre uygun bir ezgi), mimic
function makamLesson(id, mk, text, tips, phrase, extra = []){
  const m = LLEARN.makamById(mk);
  const updown = [...m.asc, ...[...m.desc].reverse().slice(1)];
  return { id, unit:"makam", notes:[], makam:mk, title:{ tr: m.name + " makamı", en: "Makam " + m.name }, text, tips,
    steps:[ { type:"listen", commas: updown }, { type:"scale", makam:mk, min:0.55 },
            { type:"notes", commas: phrase, maxMiss:4 }, { type:"mimic", makam:mk, len:5 }, ...extra ] };
}
const MAKAM2 = [
  makamLesson("bayati", "bayati", [
    { tr:"Bayâtî'nin dizisi Uşşak'la aynıdır; farkı seyrindedir: ezgi Nevâ civarından başlar, aşağı inip Dügâh'ta karar verir, sonra yeniden yükselebilir.",
      en:"Bayâtî has the same scale as Uşşak; the difference is in its seyir: the melody starts around Nevâ, comes down to resolve on Dügâh and may rise again." }],
    [{ tr:"Segâh'ı Uşşak'taki gibi pes bas.", en:"Play Segâh low, as in Uşşak." }],
    [31, 40, 31, 22, 17, 22, 31, 22, 17, 9, 0, 9]),
  makamLesson("karcigar", "karcigar", [
    { tr:"Karcığar, Dügâh'ta Uşşak dörtlüsü ile Nevâ'da Hicaz beşlisinden oluşur. Nevâ'nın üstündeki Hisar ve Evç perdeleri ona Hicaz rengini verir.",
      en:"Karcığar is an Uşşak tetrachord on Dügâh plus a Hicaz pentachord on Nevâ. The Hisar and Evç perdes above Nevâ give it a Hicaz colour." }],
    [{ tr:"Hisar (yazılı Mi♭5) ile Evç (Fa♯5) arasındaki geniş aralığı abartmadan çal.", en:"Don't exaggerate the wide step between Hisar (written E♭5) and Evç (F♯5)." }],
    [9, 17, 22, 31, 36, 48, 36, 31, 22, 17, 9]),
  makamLesson("humayun", "humayun", [
    { tr:"Hümâyun, Dügâh'ta Hicaz dörtlüsü ile Nevâ'da Bûselik beşlisinden oluşur. Hicaz'a benzer başlar ama Nevâ üstünde Bûselik rengine döner.",
      en:"Hümâyun is a Hicaz tetrachord on Dügâh plus a Bûselik pentachord on Nevâ. It starts like Hicaz but turns to a Bûselik colour above Nevâ." }],
    [],
    [9, 14, 26, 31, 40, 44, 40, 31, 26, 14, 9]),
  makamLesson("uzzal", "uzzal", [
    { tr:"Uzzâl, Dügâh'ta Hicaz beşlisi ile Hüseynî'de Uşşak dörtlüsünden oluşur. Nevâ ve Hüseynî çevresinde gezinir, Dügâh'ta karar verir.",
      en:"Uzzâl is a Hicaz pentachord on Dügâh plus an Uşşak tetrachord on Hüseynî. It wanders around Nevâ and Hüseynî and resolves on Dügâh." }],
    [],
    [9, 14, 26, 31, 40, 31, 40, 48, 40, 31, 26, 14, 9]),
  makamLesson("zirguleli", "zirguleli", [
    { tr:"Zirgüleli Hicaz'da iki Hicaz çeşnisi üst üste gelir: Dügâh'ta Hicaz beşlisi ve Nevâ'da Hicaz dörtlüsü (Hisar, Evç).",
      en:"Zirgüleli Hicaz stacks two Hicaz flavours: a Hicaz pentachord on Dügâh and a Hicaz tetrachord on Nevâ (Hisar, Evç)." }],
    [],
    [9, 14, 26, 31, 36, 48, 53, 48, 36, 31, 26, 14, 9]),
  makamLesson("suzinak", "suzinak", [
    { tr:"Sûzinak, Rast beşlisinin üstüne Nevâ'da Hicaz dörtlüsü koyar. Rast'ın parlak açılışından sonra Hisar ile Hicaz rengi duyulur.",
      en:"Sûzinak puts a Hicaz tetrachord on Nevâ above a Rast pentachord. After Rast's bright opening the Hicaz colour appears with Hisar." }],
    [],
    [0, 9, 17, 22, 31, 36, 48, 36, 31, 22, 17, 9, 0]),
  makamLesson("hicazkar", "hicazkar", [
    { tr:"Hicazkâr, Zirgüleli Hicaz'ın Rast perdesine göçürülmüş hâlidir: Rast'ta Hicaz beşlisi (Zirgüle, Segâh) ve Nevâ'da Hicaz dörtlüsü.",
      en:"Hicazkâr is Zirgüleli Hicaz transposed to Rast: a Hicaz pentachord on Rast (Zirgüle, Segâh) and a Hicaz tetrachord on Nevâ." }],
    [{ tr:"Zirgüle yazılı Sol♯4 parmağıyla çalınır.", en:"Zirgüle uses the written G♯4 fingering." }],
    [31, 36, 48, 36, 31, 22, 17, 5, 0, 5, 17, 22, 17, 5, 0]),
  makamLesson("kurdilihicazkar", "kurdilihicazkar", [
    { tr:"Kürdîli Hicazkâr inici bir makamdır: ezgi tizden başlar, Çargâh'ta yarım karar verip Rast'a iner. Rast'ta Kürdî dörtlüsü ile Çargâh'ta Bûselik beşlisinden oluşur.",
      en:"Kürdîli Hicazkâr is a descending makam: the melody starts high, makes a half cadence on Çargâh and descends to Rast. It is a Kürdî tetrachord on Rast plus a Bûselik pentachord on Çargâh." }],
    [],
    [53, 44, 35, 31, 22, 31, 22, 13, 4, 0]),
  makamLesson("mahur", "mahur", [
    { tr:"Mâhur inici bir makamdır; ezgi Gerdâniye civarından başlar. Rast'ta Çargâh beşlisi ile Nevâ'da Çargâh dörtlüsünden oluşur; Bûselik ve Mâhur perdeleri ona parlak bir renk verir.",
      en:"Mâhur is a descending makam; the melody starts around Gerdâniye. It is a Çargâh pentachord on Rast plus a Çargâh tetrachord on Nevâ; the Bûselik and Mâhur perdes give it a bright colour." }],
    [{ tr:"Mâhur perdesi yazılı Fa♯5'tir; Evç'ten biraz tiz bas.", en:"The Mâhur perde is written F♯5; play it a little higher than Evç." }],
    [53, 49, 40, 31, 22, 18, 9, 0, 9, 18, 22, 31, 22, 18, 9, 0]),
  makamLesson("acemasiran", "acemasiran", [
    { tr:"Acemaşîran inici bir makamdır ve Acem Aşîran perdesinde (yazılı Fa4) karar verir: Acem Aşîran'da Çargâh beşlisi ile Çargâh'ta Çargâh dörtlüsü.",
      en:"Acemaşîran is a descending makam that resolves on the Acem Aşîran perde (written F4): a Çargâh pentachord on Acem Aşîran plus a Çargâh tetrachord on Çargâh." }],
    [],
    [44, 40, 31, 22, 13, 22, 13, 9, 0, -9])
];

// ---- İleri seviye: taksim (seyir), ileri kulak ve ritim ----
const ILERI = [
  { id:"taksim-giris", unit:"ileri", notes:[], makam:"rast",
    title:{ tr:"Taksime giriş: seyir", en:"Introduction to taksim: seyir" },
    text:[
      { tr:"Taksim, makamı usulsüz ve doğaçlama olarak sergilemektir. Bir makamı tanıtan dizisi değil seyridir: ezginin nereden başladığı, hangi perdelerde dinlendiği (güçlü, yarım karar) ve nerede bittiği (durak).",
        en:"A taksim is an unmetered improvisation that presents the makam. What defines a makam is not its scale but its seyir: where the melody starts, where it rests (dominant, half cadences) and where it ends (the final)." },
      { tr:"Bu adımlarda serbestçe çalacaksın; uygulama perdelerde geçirdiğin süreyi, dizi dışına çıkıp çıkmadığını, güçlüyü vurgulayıp vurgulamadığını ve durakta karar verip vermediğini değerlendirir.",
        en:"In these steps you play freely; the app checks how long you stay on each perde, whether you leave the scale, emphasise the dominant and resolve on the final." }
    ],
    tips:[
      { tr:"Kısa cümleler kur: her cümle bir perdede dinlensin. Güçlüde yarım karar, durakta tam karar ver.", en:"Build short phrases, each resting on a perde. Half cadence on the dominant, full cadence on the final." },
      { tr:"Durağı dron yapmak kulağını makamda tutar.", en:"A drone on the final keeps your ear in the makam." }
    ],
    steps:[
      { type:"seyir", makam:"rast", sec:45, min:55 },
      { type:"seyir", makam:"ussak", sec:45, min:55 },
      { type:"seyir", makam:"hicaz", sec:60, min:60 }
    ] },
  { id:"taksim-2", unit:"ileri", notes:[],
    title:{ tr:"Taksim: inici ve inici-çıkıcı makamlar", en:"Taksim: descending makams" },
    text:[
      { tr:"İnici makamlarda (Mâhur, Acemaşîran, Kürdîli Hicazkâr) taksim tiz bölgeden başlar ve adım adım durağa iner. İnici-çıkıcı makamlarda (Hüseynî, Bayâtî, Karcığar) güçlü civarından başlanır.",
        en:"In descending makams (Mâhur, Acemaşîran, Kürdîli Hicazkâr) the taksim starts high and steps down to the final. In descending-ascending makams (Hüseynî, Bayâtî, Karcığar) it starts around the dominant." }
    ],
    tips:[],
    steps:[
      { type:"seyir", makam:"huseyni", sec:60, min:60 },
      { type:"seyir", makam:"mahur", sec:60, min:60 },
      { type:"seyir", makam:"kurdilihicazkar", sec:60, min:60 }
    ] },
  { id:"kulak-2", unit:"ileri", notes:[],
    title:{ tr:"İleri kulak: makam tanıma ve tek koma", en:"Advanced ear: makam ID and one comma" },
    text:[
      { tr:"Bir makamı birkaç notasından tanımak, usta bir müzisyenin en önemli becerilerinden biridir. Bu derste kısa ezgilerin makamını bulacak ve 1 komalık farkları ayırt edeceksin (ör. Segâh ile Bûselik).",
        en:"Recognising a makam from a few notes is one of a master musician's key skills. In this lesson you name the makam of short phrases and tell apart one-comma differences (e.g. Segâh and Bûselik)." }
    ],
    tips:[],
    steps:[
      { type:"ear", mode:"makam", pool:["rast","ussak","hicaz","kurdi","saba","segah","nihavend","huzzam","huseyni"], n:8, min:5 },
      { type:"ear", mode:"abx", level:3, n:10, min:7 }
    ] },
  { id:"ritim-ileri", unit:"ileri", notes:[],
    title:{ tr:"İç tempo: metronomsuz çalmak", en:"Inner tempo: playing without the click" },
    text:[
      { tr:"İyi bir müzisyen tempoyu içinde taşır. Bu derste metronom yalnızca sayım ölçüsünde çalar; sonra susar ve sen aynı tempoda devam edersin. Uygulama tempodan ne kadar kaydığını ölçer.",
        en:"A good musician carries the tempo inside. In this lesson the metronome plays only the count-in, then stops and you keep the same tempo. The app measures how far you drift." }
    ],
    tips:[
      { tr:"Ayağınla ya da içinden sayarak vuruşu sürdür.", en:"Keep the beat by tapping your foot or counting inside." }
    ],
    steps:[
      { type:"rhythm", pattern:"quarter", tempo:80, bars:4, silent:true, min:55 },
      { type:"rhythm", usul:"aksak", tempo:180, bars:3, silent:true, min:50 },
      { type:"rhythm", usul:"curcuna", tempo:180, bars:3, min:55 }
    ] }
];

// Yeni dersleri müfredattaki yerlerine yerleştir
LESSONS.unshift(...BASLANGIC);
LESSONS.splice(LESSONS.findIndex(l => l.id === "vibrato") + 1, 0, ...TEKNIK2);
LESSONS.splice(LESSONS.findIndex(l => l.id === "huzzam") + 1, 0, ...MAKAM2);
LESSONS.push(...ILERI);

const lessonById = id => LESSONS.find(l => l.id === id) || null;
const pick = (x, lang) => x == null ? "" : typeof x === "string" ? x : (x[lang] || x.tr);

// Adımın yazılı notaları (çalma ya da dinleme için)
function stepNotes(step){
  if(step.notes) return step.notes;
  if(step.commas) return step.commas.map(LLEARN.commaToWritten);
  return [];
}

const RHYTHM_NAMES = {
  quarter:{ tr:"her vuruşta bir nota", en:"one note per beat" }, half:{ tr:"ikilik notalar", en:"half notes" },
  eighth:{ tr:"sekizlik notalar", en:"eighth notes" }, dotted:{ tr:"noktalı dörtlük + sekizlik", en:"dotted quarter + eighth" },
  offbeat:{ tr:"ters vuruşlar", en:"off-beats" } };
const DYN_NAMES = { cresc:{ tr:"crescendo (hafiften güçlüye)", en:"crescendo" }, dim:{ tr:"decrescendo (güçlüden hafife)", en:"decrescendo" },
  messa:{ tr:"messa di voce (hafif-güçlü-hafif)", en:"messa di voce" } };

// Adım başlığı: "Uzun ton: Sol4 · 8 sn · en az 55 puan"
function stepTitle(step, lang = "tr"){
  const en = lang === "en";
  const nn = w => LCORE.noteName(w)[en ? "en" : "tr"];
  // Uzun dizilerin başı yazılır; adım başlayınca bütün notalar çipler hâlinde görünür
  const seq = () => {
    const names = step.commas ? step.commas.map(LLEARN.perdeName) : step.notes.map(nn);
    return names.length <= 9 ? names.join(" ") : names.slice(0, 5).join(" ") + " … (" + names.length + (en ? " notes)" : " nota)");
  };
  const mk = step.makam ? LLEARN.makamById(step.makam).name : null;
  switch(step.type){
    case "listen": return (en ? "Listen: " : "Dinle: ") + seq();
    case "hold": return (en ? "Long tone: " : "Uzun ton: ") + nn(step.note) + (step.comma != null ? " (" + LLEARN.perdeName(step.comma) + ")" : "") +
      " · " + step.sec + (en ? " s · at least " : " sn · en az ") + step.min + (en ? " points" : " puan") +
      (step.quality ? (en ? " · tone clarity ≥ " : " · ses temizliği ≥ %") + step.quality + (en ? "%" : "") : "");
    case "notes": return (en ? "Play in order: " : "Sırayla çal: ") + seq() +
      " · " + (en ? "at most " + step.maxMiss + " mistakes" : "en çok " + step.maxMiss + " hata");
    case "quiz": return (step.mode === "find" ? (en ? "Fingering quiz (find): " : "Parmak testi (bul): ") : step.mode === "staff" ? (en ? "Read from the staff and play: " : "Dizekten oku ve çal: ") : (en ? "Fingering quiz (play): " : "Parmak testi (çal): ")) +
      step.notes.map(nn).join(" ") + " · " + (en ? step.min + "/" + step.n + " correct" : step.min + "/" + step.n + " doğru");
    case "scale": return (en ? "Scale up and down: " : "Dizi çıkış ve iniş: ") + mk + " · " +
      (en ? "at least " + Math.round(step.min*100) + "% of perdes clean" : "perdelerin en az %" + Math.round(step.min*100) + "'i temiz");
    case "mimic": return (en ? "Imitate: " : "Taklit: ") + (mk || step.commas.map(LLEARN.perdeName).join(" ")) +
      " · " + (en ? "reach a " + step.len + "-note phrase" : step.len + " notalık ezgiye ulaş");
    case "vibrato": return (en ? "Vibrato: " : "Vibrato: ") + nn(step.note) + " · " + step.sec + (en ? " s of even vibrato" : " sn düzenli vibrato");
    case "glide": return (en ? "Glissando: " : "Glissando: ") + nn(step.from) + " → " + nn(step.to) + " · " + step.n + (en ? " times" : " kez");
    case "read": return (en ? "Read: " : "Oku: ") + pick(step.title, lang);
    case "rhythm": {
      const what = step.usul ? "Usul " + LLEARN.USULS.find(u => u.id === step.usul).name : pick(RHYTHM_NAMES[step.pattern], lang);
      return (en ? "Rhythm: " : "Ritim: ") + what + " · " + step.tempo + (en ? " bpm" : " vuruş/dk") + (step.silent ? (en ? " · metronome only for the count-in" : " · metronom yalnızca sayımda") : "") +
        " · " + (en ? "at least " + step.min + " points" : "en az " + step.min + " puan");
    }
    case "dynamics": return (en ? "Dynamics: " : "Dinamik: ") + nn(step.note) + " · " + pick(DYN_NAMES[step.shape], lang) + " · " + step.sec + (en ? " s" : " sn");
    case "seyir": return (en ? "Free playing (seyir): " : "Serbest çalma (seyir): ") + LLEARN.makamById(step.makam).name + " · " + step.sec + (en ? " s · at least " : " sn · en az ") + step.min + (en ? " points" : " puan");
    case "ear": return (en ? "Ear: " : "Kulak: ") + (step.mode === "makam" ? (en ? "name the makam" : "makamı tanı") : (en ? "tell the perdes apart (level " : "perde ayırt (seviye ") + (step.level || 1) + ")") +
      " · " + step.min + "/" + step.n + (en ? " correct" : " doğru");
  }
  return step.type;
}

// Bir adımın sonucu geçer mi. res: { v } — puan, doğru sayısı, hata sayısı, oran ya da ulaşılan uzunluk.
function stepOk(step, res){
  if(!res) return false;
  const v = res.v;
  switch(step.type){
    case "listen": return true;
    case "hold": return v >= step.min && (step.quality == null || (res.q || 0) >= step.quality);
    case "read": return v >= 1;
    case "rhythm": case "seyir": case "ear": return v >= step.min;
    case "dynamics": return v >= 1;
    case "notes": return v <= step.maxMiss;
    case "quiz": return v >= step.min;
    case "scale": return v >= step.min;
    case "mimic": return v >= step.len;
    case "vibrato": return v >= step.sec;
    case "glide": return v >= step.n;
  }
  return false;
}
// Sonuçlardan hangisi daha iyi (hata sayısında az olan iyidir)
function better(step, a, b){
  if(!b) return a;
  if(!a) return b;
  return step.type === "notes" ? (a.v <= b.v ? a : b) : (a.v >= b.v ? a : b);
}

// prog: { [lessonId]: { s: { [adım]: {v, ok} }, d: "YYYY-MM-DD" (bitiş günü) } }
function recordStep(prog, lesson, idx, res, day){
  const p = prog[lesson.id] || (prog[lesson.id] = { s:{} });
  const step = lesson.steps[idx];
  const ok = stepOk(step, res);
  const prev = p.s[idx];
  const b = better(step, { v:res.v, ok }, prev);
  p.s[idx] = { v:b.v, ok: ok || !!(prev && prev.ok) };
  if(!p.d && lessonDone(lesson, prog)) p.d = day;
  return { ok, first: !(prev && prev.ok) && ok, done: !!p.d };
}
// Ders, dinleme dışındaki bütün adımlar geçildiyse biter
function lessonDone(lesson, prog){
  const p = prog[lesson.id];
  if(!p) return false;
  return lesson.steps.every((st, i) => st.type === "listen" || (p.s[i] && p.s[i].ok));
}
function lessonProgress(lesson, prog){
  const p = prog[lesson.id] || { s:{} };
  const gated = lesson.steps.map((st, i) => i).filter(i => lesson.steps[i].type !== "listen");
  return { done: gated.filter(i => p.s[i] && p.s[i].ok).length, total: gated.length };
}
// Temeller ve klarino dersleri sırayla açılır. Bunlar bitince teknik derslerinin hepsi ve ilk makam dersi açılır;
// makam dersleri kendi içinde sırayla gider (teknik ünitesini bitirmek gerekmez).
function unlocked(lesson, prog, all = false){
  if(all) return true;
  if(lessonDone(lesson, prog)) return true;          // bitmiş ders hep açık (yeni dersler araya eklense de)
  const i = LESSONS.indexOf(lesson);
  if(i <= 0) return true;
  const base = () => LESSONS.filter(l => l.unit === "temel" || l.unit === "klarino").every(l => lessonDone(l, prog));
  if(lesson.unit === "teknik") return base();
  if(lesson.unit === "makam") return LESSONS[i-1].unit === "makam" ? lessonDone(LESSONS[i-1], prog) : base();
  return lessonDone(LESSONS[i-1], prog);
}
// Kaldığın yer: açık ve bitmemiş ilk ders
function nextLesson(prog, all = false){
  return LESSONS.find(l => unlocked(l, prog, all) && !lessonDone(l, prog)) || null;
}
// Bitirilen derslerde öğrenilen notalar (hiç ders bitmediyse açık Sol)
function knownNotes(prog){
  const s = new Set();
  for(const l of LESSONS) if(lessonDone(l, prog)) l.notes.forEach(w => s.add(w));
  if(!s.size) s.add(67);                               // hiç ders bitmediyse açık Sol (Rast)
  return [...s].sort((a,b) => a-b);
}

// "Bul" modu için seçenekler: doğru nota + verilen listeden en yakın 3 nota
function choicesFrom(notes, w, rng = Math.random){
  const others = notes.filter(x => x !== w).sort((a,b) => Math.abs(a-w) - Math.abs(b-w)).slice(0, 5);
  const pick3 = [];
  while(pick3.length < 3 && others.length) pick3.push(others.splice(Math.floor(rng()*others.length), 1)[0]);
  return [...pick3, w].sort((a,b) => a-b);
}
// Ders testinde soru: zorlanılan nota daha sık gelir (learn.js'teki ağırlık), aynı nota art arda gelmez
function quizPickFrom(notes, stats, rng = Math.random, last = null){
  const pool = notes.length > 1 ? notes.filter(w => w !== last) : notes;
  const weights = pool.map(w => LLEARN.quizWeight(stats[w]));
  let r = rng() * weights.reduce((a,b) => a+b, 0);
  for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r <= 0) return pool[i]; }
  return pool[pool.length-1];
}

// Glissando adımı: frames [{t, comma}] kalkış notasının son karesinden varış notasının ilk kararlı karesine.
// Kalkıştan (±1,5 koma) son ayrılış ile varışa (±1,5 koma) ilk değiş arasında en az minMs geçmeli ve aradaki
// kareler iki nota arasında çoğunlukla tek yönlü ilerlemeli. Ani atlamada arada en fazla bir iki ölçüm penceresi kalır.
function glideBetween(frames, minMs = 200, tol = 1.5){
  if(frames.length < 3) return false;
  const a = frames[0].comma, b = frames[frames.length-1].comma, dir = Math.sign(b - a);
  if(Math.abs(b - a) < 3) return false;
  let i0 = 0;
  for(let i=0;i<frames.length;i++) if(Math.abs(frames[i].comma - a) <= tol) i0 = i; else if(Math.abs(frames[i].comma - b) <= tol) break;
  let i1 = frames.findIndex((f, i) => i > i0 && Math.abs(f.comma - b) <= tol);
  if(i1 < 0) return false;
  if(frames[i1].t - frames[i0].t < minMs) return false;
  const mid = frames.slice(i0, i1 + 1);
  if(mid.length < 4) return false;
  let along = 0;
  for(let i=1;i<mid.length;i++) if(Math.sign(mid[i].comma - mid[i-1].comma) === dir) along++;
  const inside = mid.every(f => (f.comma - a) * dir >= -tol && (b - f.comma) * dir >= -tol);
  return inside && along / (mid.length - 1) >= 0.6;
}

// Tarihten türeyen tekrarlanabilir rastgele sayı (günlük plan gün içinde değişmesin)
function seeded(str){
  let h = 2166136261;
  for(const ch of str){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

// Günlük çalışma: ısınma uzun tonu (en çok sapan nota), zorlanılan notalardan test, bir makam dizisi ve taklit.
// ctx: { prog, intStats: {[w]: {n,sum}}, quizStats: {[w]: {n,wrong,ms}}, day: "YYYY-MM-DD" }
function dailyPlan(ctx){
  const rng = seeded(ctx.day);
  const known = knownNotes(ctx.prog);
  const steps = [];
  // 1. Isınma: entonasyonu en çok sapan bilinen nota, yoksa bilinenlerden biri
  const off = known.map(w => [w, ctx.intStats[w]]).filter(([, s]) => s && s.n >= 3)
    .sort((a,b) => Math.abs(b[1].sum/b[1].n) - Math.abs(a[1].sum/a[1].n));
  const warm = off.length ? off[0][0] : known[Math.floor(rng()*known.length)];
  steps.push({ type:"hold", note:warm, sec:8, min:60 });
  // 2. Parmak testi: bilinen notalardan en zorlanılan 6'sı (en az 3 nota)
  if(known.length >= 3){
    const hard = [...known].sort((a,b) => LLEARN.quizWeight(ctx.quizStats[b]) - LLEARN.quizWeight(ctx.quizStats[a]) || a - b).slice(0, 6);
    steps.push({ type:"quiz", notes: hard.sort((a,b) => a-b), mode: rng() < 0.5 ? "play" : "find", n:8, min:6 });
  }
  // 3–4. Makam: bitirilen makam derslerinden biri; hiç yoksa bilinen notalarla çıkış-iniş ve taklit
  const mks = LESSONS.filter(l => l.makam && l.id !== "rast-giris" && lessonDone(l, ctx.prog)).map(l => l.makam);
  if(mks.length){
    const mk = mks[Math.floor(rng()*mks.length)];
    steps.push({ type:"scale", makam:mk, min:0.6 });
    steps.push({ type:"mimic", makam:mk, len:5 });
  }else if(known.length >= 3){
    steps.push({ type:"notes", notes:[...known, ...[...known].reverse().slice(1)], maxMiss:3 });
  }
  return { id:"daily", unit:null, notes:[], daily:true,
           title:{ tr:"Bugünün çalışması", en:"Today's practice" },
           text:[{ tr:"Bitirdiğin derslerden her gün yeniden kurulan kısa bir program: zorlandığın notalar ve perdeler öne çıkar.",
                   en:"A short routine rebuilt every day from the lessons you've finished: the notes and perdes you struggle with come first." }],
           tips:[], steps };
}

if(typeof module !== "undefined") module.exports = {
  UNITS, LESSONS, lessonById, pick, stepNotes, stepTitle, stepOk, recordStep, lessonDone, lessonProgress,
  unlocked, nextLesson, knownNotes, choicesFrom, quizPickFrom, glideBetween, seeded, dailyPlan
};
