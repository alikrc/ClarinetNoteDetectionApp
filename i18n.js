// Tema ve dil. <head> içinde yüklenir: tema sayfa çizilmeden uygulanır.
// Arayüz Türkçe yazılır; İngilizce seçiliyse sayfaya giren her metin (ve aria-label/title/placeholder)
// bu sözlükle çevrilir. Makam ve perde adları iki dilde de Türkçe kalır; yazılı nota adları
// (Sol4 → G4) ve ondalık virgül (0,5 → 0.5) kendiliğinden dönüşür.
// Yeni bir metin eklerken İngilizcesini EXACT'e ya da (değişken içeriyorsa) PATTERNS'e ekle.

const LANG = (() => {
  try{ const v = JSON.parse(localStorage.getItem("sk.lang")); if(v === "tr" || v === "en") return v; }catch(e){}
  return (navigator.language || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
})();
document.documentElement.lang = LANG;

// Tema: "auto" işletim sistemini izler; "light" / "dark" sabitler
function applyTheme(th){
  if(th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th);
  else document.documentElement.removeAttribute("data-theme");
}
const THEME = (() => { try{ const v = JSON.parse(localStorage.getItem("sk.theme")); return v === "light" || v === "dark" ? v : "auto"; }catch(e){ return "auto"; } })();
applyTheme(THEME);

const NOTE_LETTER = { Do:"C", Re:"D", Mi:"E", Fa:"F", Sol:"G", La:"A", Si:"B" };
const noteWord = s => s.replace(/^(Do|Re|Mi|Fa|Sol|La|Si)/, m => NOTE_LETTER[m]);
const REG_EN = { Chalumeau:"Chalumeau", Klarino:"Clarion", Altissimo:"Altissimo" };
const FINGER_EN = { "işaret":"index", "orta":"middle", "yüzük":"ring" };

const EXACT = {
  // Başlık ve ayarlar
  "Sol Klarnet Dinleyici": "G Clarinet Listener",
  "Türk Sol klarneti · Albert sistem · AEU 53 koma": "Turkish G clarinet · Albert system · AEU 53-comma tuning",
  "Çaldığın sesi mikrofondan dinler; perdeyi, perdeden kaç koma saptığını, yazılı ve duyulan notayı ve o notanın parmak pozisyonunu gösterir. Yazılı nota, duyulan sesin tam dörtlü üstüdür (Rast = yazılı Sol).":
    "Listens to your playing through the microphone and shows the perde (pitch degree), how many commas you are off, the written and sounding note, and the fingering for that note. The written note is a perfect fourth above the sounding pitch (Rast = written G).",
  "Mikrofonu başlat": "Start microphone", "Durdur": "Stop", "örnek gösterim": "sample view",
  "dinliyor": "listening", "durdu": "stopped", "sessiz": "silent", "izin bekleniyor": "waiting for permission",
  "örnek ses çalıyor": "playing sample tone", "bu ortamda mikrofon açılamıyor (https gerekli)": "microphone unavailable here (https required)",
  "Diyapazon (La)": "Tuning (A)", "Gösterge": "Display", "Koma": "Commas", "Sent": "Cents", "Hassasiyet": "Sensitivity",
  "Mikrofon seviyesi": "Microphone level", "Tema": "Theme", "Otomatik": "Auto", "Açık": "Light", "Koyu": "Dark", "Dil": "Language",
  "Diyapazonu yarım Hz düşür": "Lower tuning by half a Hz", "Diyapazonu yarım Hz yükselt": "Raise tuning by half a Hz",
  "Turuncu çizgi sessizlik eşiği: çubuk bu çizgiyi geçince dinlenir": "Orange line is the silence threshold: sound is detected once the bar passes it",
  // Akort kartı
  "AEU perdesi": "AEU perde", "Yazılı nota": "Written note", "Duyulan ses": "Sounding pitch", "Frekans": "Frequency",
  "Aralık dışı": "Out of range", "bu kaba bölge için AEU perde adı yok": "no AEU perde name in this low region",
  "Entonasyon izi · son 8 saniye": "Intonation trace · last 8 seconds",
  "yatay çizgiler: AEU perdeleri · kesik çizgi: glissando": "horizontal lines: AEU perdes · dashed line: glissando",
  "Son 8 saniyede çalınan perdenin koma cinsinden grafiği": "Graph of the played pitch in commas over the last 8 seconds",
  "düz": "steady", "koma": "commas",
  // Parmak kartı
  "Parmak pozisyonu": "Fingering", "yazılı": "written", "Chalumeau": "Chalumeau", "Klarino": "Clarion", "Altissimo": "Altissimo",
  "ARKADA": "BACK", "register": "register", "başparmak": "thumb", "SOL EL": "LEFT HAND", "SAĞ EL": "RIGHT HAND",
  "işaret": "index", "parmağı": "finger", "yanı": "side", "orta": "middle", "yüzük": "ring", "SOL SERÇE": "LEFT PINKY",
  "SAĞ": "RIGHT", "SERÇE": "PINKY", "yan": "side", "mandallar": "keys", "(sağ işaret": "(side of right", "parmağı yanı)": "index finger)",
  "La": "A", "Sol♯": "G♯", "Mi♭": "E♭", "Mi": "E", "Fa♯": "F♯", "Si♭": "B♭", "Fa": "F",
  "Deliklere ve mandallara dokunarak parmak kur; uyan nota çalar.": "Tap holes and keys to build a fingering; the matching note plays.",
  "Tabloda olmayan parmak — ses yok.": "Fingering not in the table — no sound.",
  "Bu parmak tabloda yok. Bir delik ya da mandal daha değiştir.": "This fingering is not in the table. Change another hole or key.",
  "Sesi durdur": "Stop sound", "Parmak seçimi ve adım adım talimat": "Fingering choice and step-by-step instructions",
  "Parmak seçimi": "Fingering choice", "Temel": "Basic",
  "Sol başparmak": "Left thumb", "Sol el": "Left hand", "Sol serçe": "Left pinky", "Sağ el": "Right hand", "Sağ serçe": "Right pinky",
  "boşta (delik açık)": "free (hole open)", "boşta": "free", "deliği kapat": "close the hole",
  "deliği kapat + register'a bas": "close the hole + press register", "delik açık, sadece register'a bas": "hole open, press register only",
  "tüm delikler açık": "all holes open", "üç delik kapalı": "all three holes closed",
  "La mandalı (işaret parmağını yukarı kaydır)": "A key (slide the index finger up)",
  "Sol♯ yan mandalı (işaret parmağının iç yüzüyle)": "G♯ side key (with the inside of the index finger)",
  "Mi♭ ince mandalı (yüzük parmağıyla, 3. deliğin üstünde)": "E♭ sliver key (ring finger, above the 3rd hole)",
  "Si♭ ince mandalı (yüzük parmağıyla, 3. deliğin üstünde)": "B♭ sliver key (ring finger, above the 3rd hole)",
  "delik kapalı": "hole closed", "delik açık": "hole open", "mandala bas": "press key", "dokunma": "don't touch",
  "Albert sistem (13 mandal, 2 halka) Türk Sol klarneti. Üst gövde sol el, alt gövde sağ el. Başparmak deliği ve register arkada olduğu için solda ayrıca çizildi. Sağ el orta ve yüzük deliklerindeki halkalar parmakla birlikte kapanır.":
    "Turkish G clarinet, Albert system (13 keys, 2 rings). Upper joint left hand, lower joint right hand. The thumb hole and register key are on the back, so they are drawn separately on the left. The rings on the right-hand middle and ring holes close together with the finger.",
  "Parmak kodu (WFG gösterimi)": "Fingering code (WFG notation)",
  "Dizek: nota yok": "Staff: no note",
  "Her modelde çıkmaz": "Doesn't work on every model",
  "Avusturya modelleri için; diğerlerinde tiz çıkar": "For Austrian models; sharp on others",
  "Avusturya dışı modellerde perde düzeltmesi": "Pitch correction on non-Austrian models",
  "Basit havalandırma parmağı": "Simple vented fingering",
  "Basset horn gibi pes çalgılarda işe yarar": "Useful on low instruments such as basset horn",
  "Fa5'e kaçmaması için dudak kontrolü ister": "Needs embouchure control so it doesn't slip to F5",
  "Bazı modellerde sol yan Sol♯ mandalına basmak gerekmez": "On some models the left G♯ side key is not needed",
  "Do♯6'ya kaçmaması için dudak kontrolü ister": "Needs embouchure control so it doesn't slip to C♯6",
  "Genelde tiz çıkar; pes çalgılar ve ince kenarlı kamışlar için": "Usually sharp; for flat instruments and thin-rail reeds",
  "Çok daha tiz; pes çalgılar ve ince kenarlı kamışlar için": "Much sharper; for flat instruments and thin-rail reeds",
  "Daha tiz; pes çalgılar ve ince kenarlı kamışlar için": "Sharper; for flat instruments and thin-rail reeds",
  "register mandalı": "register key", "başparmak deliği": "thumb hole", "La mandalı": "A key", "Sol♯ yan mandalı": "G♯ side key",
  "sol işaret deliği": "left index hole", "sol orta deliği": "left middle hole", "sol yüzük deliği": "left ring hole",
  "Mi♭ ince mandalı": "E♭ sliver key", "Si♭ ince mandalı": "B♭ sliver key",
  "sol serçe Mi mandalı": "left pinky E key", "sol serçe Fa♯ mandalı": "left pinky F♯ key", "sol serçe Sol♯ mandalı": "left pinky G♯ key",
  "sağ 1. yan mandal": "right side key 1", "sağ 2. yan mandal": "right side key 2", "sağ 3. yan mandal": "right side key 3",
  "sağ işaret deliği": "right index hole", "sağ orta deliği": "right middle hole", "sağ yüzük deliği": "right ring hole",
  "sağ serçe Sol♯ mandalı": "right pinky G♯ key", "sağ serçe Fa mandalı": "right pinky F key",
  "Albert sistem Türk Sol klarneti parmak şeması: çalgıcının gözünden görünüş, başparmak tarafı solda ayrıca çizili. Deliklere ve mandallara basarak parmak kurabilirsin; parmak bir notaya uyunca o nota çalar.":
    "Fingering chart of the Turkish G clarinet (Albert system), seen from the player's view; the thumb side is drawn separately on the left. Press holes and keys to build a fingering; when it matches a note, that note plays.",
  // Nota şeridi
  "Nota şeridi — tıkla ya da klavyeden çal": "Note strip — click or play from the keyboard",
  "AEU koma akordu · tıkla: çal, tekrar tıkla: durdur": "AEU comma tuning · click: play, click again: stop",
  "Entonasyon haritası": "Intonation map", "temiz": "clean",
  "ortalama tiz (> +0,5 koma)": "sharp on average (> +0.5 comma)", "ortalama pes (< −0,5 koma)": "flat on average (< −0.5 comma)",
  "en az 3 ölçüm (0,3 sn tutulan nota) gerekir": "needs at least 3 measurements (notes held 0.3 s)",
  "Alt sıra": "Bottom row", "pes, orta sıra": "low, middle row", "orta, üst sıra": "middle, top row", "tiz bölge, rakam sırası": "high register, number row",
  "altissimo — yazılı Mi3’ten Mi♭7’ye 48 nota (en tiz üçü yalnızca tıklanır). Tuşlar klavyedeki fiziksel konuma göre çalışır; aynı tuş ya da Esc sesi durdurur. Ses çalarken mikrofon kendi sesini dinlemesin diye susar.":
    "altissimo — 48 notes from written E3 to E♭7 (the top three are click-only). Keys follow their physical position on the keyboard; the same key or Esc stops the sound. The microphone pauses while a tone plays so it doesn't hear itself.",
  // Alt bilgi
  "Parmak verisi Woodwind Fingering Guide'ın Oehler/Albert temel (": "Fingering data from the Woodwind Fingering Guide's Oehler/Albert basic (",
  "chalumeau": "chalumeau", "klarino": "clarion", "altissimo": "altissimo", ") ve alternatif (": ") and alternative (",
  ") tablolarından; yalnızca Albert sistemde çalınabilen parmaklar alındı; mandal adları": ") tables; only fingerings playable on the Albert system are included; key names follow the",
  "WFG mandal açıklamasına": "WFG key guide",
  "göre. Perde adları AEU 53 koma sistemine göre, Rast = yazılı Sol. Kapsam: yazılı Mi3 – Mi♭7.": ". Perde names follow the AEU 53-comma system, Rast = written G. Range: written E3 – E♭7.",
  // Çalışma: genel
  "Çalışma": "Practice", "Çalışma türü": "Practice type", "mikrofon açık": "microphone on", "çoğu alıştırma mikrofon ister": "most exercises need the microphone",
  "Parmak testi": "Fingering quiz", "Uzun ton": "Long tone", "Makam": "Makam", "Taklit": "Echo", "Eser takibi": "Melody follow",
  "Kayıt": "Recording", "İlerleme": "Progress",
  "Usullü metronom": "Usul metronome", "Usul": "Usul", "Tempo": "Tempo", "vuruş/dk": "beats/min", "Başlat": "Start",
  "Durak sesi (dron)": "Tonic drone", "Dron perdesi": "Drone perde", "Dron ses düzeyi": "Drone volume", "Aç": "On", "Kapat": "Off",
  "Kulaklık önerilir. Dron açıkken dron perdesiyle aynı ses (oktavı dahil) algılanmaz.": "Headphones recommended. While the drone is on, its own pitch (and octaves) is not detected.",
  // Parmak testi
  "Ezberini sına:": "Test your memory:", "Çal": "Play", "Bul": "Identify",
  "modunda istenen notayı klarnette çal,": "mode: play the requested note on the clarinet;",
  "modunda şemadaki parmağın hangi nota olduğunu seç (ya da çal). Zorlandığın notalar daha sık gelir. Bir bölgede son 20 cevabın %80'i doğruysa sonraki bölge açılır.":
    "mode: choose (or play) the note for the fingering shown. Notes you struggle with come up more often. The next register unlocks when 80% of your last 20 answers in a register are correct.",
  "Test modu": "Quiz mode", "Bölge": "Register", "Açık bölgelerin hepsi": "All unlocked registers",
  "alternatif parmaklar da": "include alternative fingerings", "20 soruluk tur başlat": "Start a 20-question round",
  "Mod ve bölge seç, sonra turu başlat.": "Choose a mode and register, then start the round.",
  "Bu notayı çal": "Play this note", "Bu parmak hangi nota?": "Which note is this fingering?",
  "Bu parmak hangi nota? (alternatif parmak)": "Which note is this fingering? (alternative fingering)",
  "Mikrofon açıksa çalarak da cevaplayabilirsin.": "If the microphone is on, you can also answer by playing.",
  "Sorulan parmak pozisyonu": "Fingering in question", "doğru": "correct", "doğru · zorlandıkların:": "correct · you struggled with:",
  // Uzun ton
  "Bir notayı hedef süre boyunca sabit tut. Puan; sapmanın ne kadar dağıldığına (%40), perdeye ne kadar yakın olduğuna (%35) ve süreyi tamamlamaya (%25) göre hesaplanır.":
    "Hold a note steady for the target time. The score depends on how much the pitch spreads (40%), how close it is to the perde (35%) and completing the time (25%).",
  "Hedef nota": "Target note", "Hedef süre": "Target time", "İlk çaldığım nota": "The first note I play", "Dinle": "Listen",
  "Notayı seç (ya da “ilk çaldığım nota”), süreyi seç ve başlat.": "Pick a note (or “the first note I play”), pick a time and start.",
  "Bir nota çal ve tut": "Play a note and hold it", "sapma: —": "deviation: —", "Nota tutulamadı, yeniden dene.": "The note wasn't held, try again.",
  "puan": "points", "yeni rekor": "new best", "Süre": "Duration", "Ortalama sapma": "Mean deviation", "Yayılım": "Spread",
  "Tiz çalıyorsun; dudak baskısını azalt ya da biraz daha pes düşün.": "You're sharp; ease the embouchure pressure or think a little lower.",
  "Pes çalıyorsun; hava desteğini artır.": "You're flat; give more air support.",
  "Perdeye yakın.": "Close to the perde.", "Ses dalgalanıyor: hava akışını sabitle.": "The tone wavers: keep the air stream steady.",
  // Makam
  "Makamı seç; dizisi nota şeridinde işaretlenir (çerçeveli: dizi, dolu: durak, noktalı: güçlü). Alıştırmada diziyi önce çık sonra in; her perdenin koma sapması gösterilir.":
    "Choose a makam; its scale is marked on the note strip (outlined: scale, filled: tonic/durak, dashed: dominant/güçlü). In the exercise, go up the scale then down; each perde's deviation in commas is shown.",
  "Diziyi dinle": "Listen to the scale", "Durağı dron yap": "Use tonic as drone", "Alıştırma: çık ve in": "Exercise: up and down",
  "Diziler AEU çeşni tanımlarından kuruldu; bir hocaya ya da Sol klarnetçiye kontrol ettirilmeli.":
    "Scales were built from AEU tetrachord/pentachord definitions; have a teacher or G clarinet player check them.",
  "Durak": "Tonic (durak)", "Güçlü": "Dominant (güçlü)", "Yeden": "Leading tone (yeden)", "Çalışıldı": "Practised", "henüz yok": "not yet",
  "Çıkış": "Ascending", "İniş": "Descending", "Sıradaki perde": "Next perde",
  "Çıkıcı. Rast beşlisi + Nevâ'da Rast dörtlüsü. İnerken Evç yerine Acem basılır; Nevâ'da yarım, Rast'ta tam karar.":
    "Ascending. Rast pentachord + Rast tetrachord on Nevâ. Descending, Acem replaces Evç; half cadence on Nevâ, full cadence on Rast.",
  "Çıkıcı. Dügâh'ta Uşşak dörtlüsü + Nevâ'da Bûselik beşlisi. Nevâ civarında gezinip Dügâh'ta karar verir.":
    "Ascending. Uşşak tetrachord on Dügâh + Bûselik pentachord on Nevâ. Moves around Nevâ and cadences on Dügâh.",
  "İnici-çıkıcı. Dügâh'ta Hüseynî beşlisi + Hüseynî'de Uşşak dörtlüsü. Güçlü Hüseynî; inerken Acem.":
    "Descending-ascending. Hüseynî pentachord on Dügâh + Uşşak tetrachord on Hüseynî. Dominant Hüseynî; Acem when descending.",
  "Çıkıcı. Dügâh'ta Hicaz dörtlüsü (Dik Kürdî, Nim Hicaz) + Nevâ'da Rast beşlisi; inerken Acem.":
    "Ascending. Hicaz tetrachord on Dügâh (Dik Kürdî, Nim Hicaz) + Rast pentachord on Nevâ; Acem when descending.",
  "Çıkıcı. Segâh'ta Hüzzam beşlisi; Nevâ'da Hicaz çeşnisi (Hisar, Evç) belirgin. Hisar uygulamada biraz tiz basılır.":
    "Ascending. Hüzzam pentachord on Segâh; a clear Hicaz flavour on Nevâ (Hisar, Evç). In practice Hisar is played slightly sharp.",
  "Çıkıcı. Segâh'ta Segâh beşlisi; Nevâ ve Evç çevresinde gezinip Segâh'ta karar.":
    "Ascending. Segâh pentachord on Segâh; moves around Nevâ and Evç and cadences on Segâh.",
  "Çıkıcı. Dügâh'ta Saba dörtlüsü (Segâh, Çargâh, Hicaz); Çargâh'ta Hicaz çeşnisi. Diziyi oktavda tekrar etmez.":
    "Ascending. Saba tetrachord on Dügâh (Segâh, Çargâh, Hicaz); Hicaz flavour on Çargâh. The scale does not repeat at the octave.",
  "Çıkıcı. Dügâh'ta Kürdî dörtlüsü + Nevâ'da Bûselik beşlisi.": "Ascending. Kürdî tetrachord on Dügâh + Bûselik pentachord on Nevâ.",
  "Çıkıcı. Rast'ta Bûselik beşlisi + Nevâ'da Kürdî ya da (çıkarken) Hicaz dörtlüsü.":
    "Ascending. Bûselik pentachord on Rast + Kürdî (or, ascending, Hicaz) tetrachord on Nevâ.",
  // Taklit
  "Uygulama seçili makamın dizisinden kısa bir ezgi çalar; sen klarnetle aynısını çal. Doğru çalınca ezgi bir nota uzar, yanlışta kısalır.":
    "The app plays a short phrase from the selected makam's scale; play it back on the clarinet. Get it right and the phrase grows by one note; miss and it shrinks.",
  "Tekrar dinle": "Listen again", "Başlat'a bas, ezgiyi dinle, sonra çal.": "Press Start, listen to the phrase, then play it.",
  "Dinle…": "Listen…", "Şimdi sen çal.": "Your turn.", "Doğru! Bir nota daha ekleniyor.": "Correct! Adding one more note.",
  // Eser takibi
  "Notalar sırayla gelir; doğru notayı çalınca bir sonrakine geçer. Tempo yok, acele etme. Kendi ezgini yazılı nota adlarıyla ekleyebilirsin (ör.":
    "Notes come one at a time; play the right note to move on. There is no tempo, take your time. You can add your own melody using written note names (e.g.",
  "; diyez için ♯ ya da #, bemol için ♭ ya da b).": "; use ♯ or # for sharp, ♭ or b for flat; Turkish names like Sol4 also work).",
  "Ezgi": "Melody", "parmağı göster": "show fingering", "Notayı duy": "Hear the note", "Baştan başla": "Start over",
  "Kendi ezgini ekle": "Add your own melody", "Ezginin adı": "Melody name", "Notalar": "Notes", "Kaydet": "Save",
  "Seçili kendi ezgimi sil": "Delete my selected melody", "Nota yok.": "No notes.",
  "Yalnızca ★ işaretli kendi ezgilerin silinir.": "Only your own melodies (marked ★) can be deleted.", "Bu ezgi silinsin mi?": "Delete this melody?",
  // Kayıt
  "Çaldığını kaydet; sonra dinle ve çalınan notaları koma sapmalarıyla gör. Kayıt yalnızca bu sekmede, cihazda tutulur; sayfa kapanınca silinir.":
    "Record your playing, then listen back and see the notes with their deviation in commas. The recording stays on this device in this tab and is deleted when the page closes.",
  "Kaydı başlat": "Start recording", "Kaydı durdur": "Stop recording", "Kayıt yok.": "No recording.", "Kaydediliyor… çal.": "Recording… play.",
  "Bu tarayıcı ses kaydını desteklemiyor; yalnızca notalar listelendi.": "This browser can't record audio; only the notes are listed.",
  "Zaman": "Time", "Perde": "Perde", "Yazılı": "Written", "Sapma": "Deviation", "Notaları kopyala": "Copy notes",
  "Eser takibine ekle": "Add to melody follow", "Kopyalandı.": "Copied.", "Eklenecek nota yok.": "No notes to add.",
  "Eser takibine eklendi (★).": "Added to melody follow (★).",
  // İlerleme
  "Seri": "Streak", "gün": "days", "Bugün": "Today", "dk": "min", "Toplam": "Total", "saat": "hours", "Taklit rekoru": "Echo best",
  "Biten ezgi": "Melodies finished", "Son 14 gün (sesli çalma süresi, dakika)": "Last 14 days (time with sound, minutes)",
  "Son 14 günün çalışma süreleri": "Practice time over the last 14 days",
  "Seri için günde en az 1 dakika ses algılanmalı.": "A day counts toward the streak with at least 1 minute of detected sound.",
  "Durum": "Status", "Soru": "Questions", "Doğru": "Correct", "Son 20": "Last 20", "açık": "unlocked", "kilitli": "locked",
  "Uzun ton rekorları": "Long tone bests", "Entonasyon (en az 0,3 sn tutulan notalar)": "Intonation (notes held at least 0.3 s)",
  "Makam alıştırmaları": "Makam exercises", "Entonasyon istatistiğini sıfırla": "Reset intonation statistics",
  "Tüm ilerlemeyi sıfırla": "Reset all progress", "Tüm veriler yalnızca bu cihazda, tarayıcıda saklanır.": "All data stays on this device, in the browser.",
  "Entonasyon istatistiği silinsin mi?": "Delete intonation statistics?",
  "Seri, test, uzun ton, makam, taklit ve entonasyon verilerinin hepsi silinsin mi? Kendi ezgilerin kalır.":
    "Delete all streak, quiz, long tone, makam, echo and intonation data? Your own melodies are kept."
};

const temp = { "temiz":"clean", "tiz":"sharp", "pes":"flat", "çıkış":"ascending", "iniş":"descending" };
const PATTERNS = [
  [/^([±+−][\d,]+) koma sapma$/, "$1 commas off"],
  [/^yazılı (\S+) — parmak şeması Mi3–Mi♭7 arası$/, "written $1 — fingering chart covers E3–E♭7"],
  [/^perdeden sapma: (\S+) koma \(≈ (\S+) sent\)$/, "off the perde: $1 commas (≈ $2 cents)"],
  [/^tampere notadan sapma: (\S+) sent( — burada perde adı yok)?$/, (m, a, b) => "off the tempered note: " + a + " cents" + (b ? " — no perde name here" : "")],
  [/^Aynı parmakla (.+) de çıkar \(dudakla ayrılır\)\.$/, "The same fingering also gives $1 (separated by embouchure)."],
  [/^· (\d+) alternatif$/, (m, n) => "· " + n + (n === "1" ? " alternative" : " alternatives")],
  [/^Dizekte yazılı (\S+)(, 8va ile bir oktav aşağı yazılmış)?$/, (m, a, b) => "Written " + a + " on the staff" + (b ? ", notated an octave lower with 8va" : "")],
  [/^Bu nota için parmak şeması yok \(yazılı Mi3–Mi♭7 arası\)\.$/, "No fingering chart for this note (written E3–E♭7 only)."],
  [/^(.*) {2}\(okunamadı\)$/, "$1  (unreadable)"],
  [/^(?:(.+), )?yazılı (\S+) çal$/, (m, p, w) => "Play written " + w + (p ? " (" + p + ")" : "")],
  [/^mikrofon açılamadı \((.+)\)$/, "couldn't open microphone ($1)"],
  [/^(.+), yazılı (\S+)$/, "$1, written $2"],
  [/^yazılı (\S+)$/, "written $1"],
  [/^(.+) \(yazılı (\S+)\)$/, "$1 (written $2)"],
  [/^(.+) kapalı$/, (m, a) => a.split(" + ").map(f => FINGER_EN[f] || f).join(" + ") + " closed"],
  [/^(Mi|Fa♯|Sol♯|Fa) mandalı$/, (m, a) => noteWord(a) + " key"],
  [/^(\d)\. yan mandal \(işaret parmağının yanıyla\)$/, "side key $1 (with the side of the index finger)"],
  [/^Her modelde çıkmaz; bazı modellerde sol yan Sol♯ mandalına basmak gerekmez$/, "Doesn't work on every model; on some models the left G♯ side key is not needed"],
  [/^ortalama (\S+) koma \((\d+) ölçüm\)$/, "average $1 commas ($2 measurements)"],
  [/^(Chalumeau|Klarino|Altissimo) \((\S+)–(\S+)\)( — kilitli)?$/, (m, r, a, b, l) => REG_EN[r] + " (" + a + "–" + b + ")" + (l ? " — locked" : "")],
  [/^Soru (\d+)\/(\d+) · (\d+) doğru$/, "Question $1/$2 · $3 correct"],
  [/^Doğru! \((\S+) sn\)$/, "Correct! ($1 s)"],
  [/^Oktav hatası: (\S+) çaldın, istenen (\S+)\. Doğru parmak yukarıdaki şemada\.$/, "Octave error: you played $1, the note was $2. The correct fingering is in the chart above."],
  [/^Yanlış: (\S+)\. Doğrusu (\S+) — parmağı yukarıdaki şemada\.$/, "Wrong: $1. The answer is $2 — its fingering is in the chart above."],
  [/^([\d,]+) sn$/, "$1 s"],
  [/^\/ (\d+) sn$/, "/ $1 s"],
  [/^Çal: (.+)$/, "Play: $1"],
  [/^Tut: (.+)$/, "Hold: $1"],
  [/^sapma: (\S+) koma$/, "deviation: $1 commas"],
  [/^rekor (\d+)$/, "best $1"],
  [/^([±+−]?[\d,]+) koma$/, "$1 commas"],
  [/^(\d+) kez · en iyi ort\. ([\d,]+) k$/, "$1× · best avg. $2 c"],
  [/^(.+): (\d+) kez, en iyi ort\. ([\d,]+) k$/, "$1: $2× · best avg. $3 c"],
  [/^yazılı (\S+) · (çıkış|iniş)$/, (m, w, d) => "written " + w + " · " + temp[d]],
  [/^(.+): (\S+) koma — (temiz|tiz|pes)(?:\. (.+) perdesine daha yakın çaldın\.)?$/,
    (m, p, d, q, o) => p + ": " + d + " commas — " + temp[q] + (o ? ". You played closer to " + o + "." : "")],
  [/^perde temiz \(±1 koma\) · ortalama sapma (\S+) koma$/, "perdes clean (±1 comma) · mean deviation $1 commas"],
  [/^(\S+) çalıyorsun; beklenen (.+) \(yazılı (\S+)\)\.$/, "You're playing $1; expected $2 (written $3)."],
  [/^Makam: (.+) \(Makam sekmesinden değiştir\)$/, "Makam: $1 (change it in the Makam tab)"],
  [/^Uzunluk (\d+) · seri (\d+) · rekor (\d+)$/, "Length $1 · streak $2 · best $3"],
  [/^(\S+) çaldın; beklenen (.+) \(yazılı (\S+)\)\. Yeni ezgi geliyor\.$/, "You played $1; expected $2 (written $3). New phrase coming."],
  [/^(★ )?(.+) — (çıkış ve iniş|üçlü atlamalar) \((\d+) nota\)$/, (m, s, n, k, c) => (s || "") + n + " — " + (k === "üçlü atlamalar" ? "skips in thirds" : "up and down") + " (" + c + " notes)"],
  [/^(.+) — (çıkış ve iniş|üçlü atlamalar)$/, (m, n, k) => n + " — " + (k === "üçlü atlamalar" ? "skips in thirds" : "up and down")],
  [/^(★ )?(.+) \((\d+) nota\)$/, (m, s, n, c) => (s || "") + n + " (" + c + " notes)"],
  [/^Nota (\d+)\/(\d+) · (\d+) hata$/, "Note $1/$2 · $3 mistakes"],
  [/^Bitti! (\d+) hata · (\S+) sn$/, "Done! $1 mistakes · $2 s"],
  [/^(\S+) çaldın; sıradaki (\S+)\.$/, "You played $1; next is $2."],
  [/^Okunamadı: (.+)$/, "Could not read: $1"],
  [/^Aralık dışı: (.+) \(Mi3–Mi♭7\)$/, "Out of range: $1 (E3–E♭7)"],
  [/^(\d+) nota kaydedildi\.$/, "$1 notes saved."],
  [/^Ezgim (\d+)$/, "My melody $1"],
  [/^Kayıt (\d\d:\d\d)$/, "Recording $1"],
  [/^(\d+) nota · (\d+) glissando · (\d+) sn$/, "$1 notes · $2 glissandi · $3 s"],
  [/^(\d{4}-\d\d-\d\d): (\d+) dk$/, "$1: $2 min"],
  [/^Tiz çaldıkların: (.*)$/, "Sharp notes: $1"],
  [/^Pes çaldıkların: (.*)$/, "Flat notes: $1"]
];

const norm = s => s.replace(/\s+/g, " ").trim();
function lookup(s){
  if(Object.prototype.hasOwnProperty.call(EXACT, s)) return EXACT[s];
  for(const [re, rep] of PATTERNS) if(re.test(s)) return s.replace(re, rep);
  return null;
}
// Bir metni İngilizceye çevirir; tam eşleşme yoksa " · " ile ayrılmış parçaları, sonra cümleleri ayrı ayrı dener.
function translate(text){
  const s = norm(text);
  if(!s) return text;
  let out = lookup(s);
  if(out === null && s.includes(" · ")) out = s.split(/( · )/).map(p => p === " · " ? p : (lookup(p) ?? p)).join("");
  if(out === null && /[.!?] \S/.test(s)) out = s.split(/(?<=[.!?]) /).map(p => lookup(p) ?? p).join(" ");
  if(out === null) out = s;
  out = out.replace(/(^|[^\p{L}])(Do|Re|Mi|Fa|Sol|La|Si)([♯♭]?)(\d)(?!\d)/gu, (m, pre, n, acc, o) => pre + NOTE_LETTER[n] + acc + o)
           .replace(/(\d),(\d)/g, "$1.$2")
           .replace(/(^|\s)yazılı(\s|$)/g, "$1written$2");
  if(out === s) return text;
  // Baştaki ve sondaki boşluklar korunur (satır içi öğelerin arası)
  return text.match(/^\s*/)[0] + out + text.match(/\s*$/)[0];
}
// Kod içinde (confirm, pano, kayıtlı adlar) kullanılan metinler için
function _t(s){ return LANG === "en" ? translate(s) : s; }

if(LANG === "en"){
  document.title = EXACT["Sol Klarnet Dinleyici"];
  const ATTRS = ["aria-label", "title", "placeholder"];
  const doText = n => { if(n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) return; const t = translate(n.data); if(t !== n.data) n.data = t; };
  const doAttrs = el => { for(const a of ATTRS){ const v = el.getAttribute && el.getAttribute(a); if(v){ const t = translate(v); if(t !== v) el.setAttribute(a, t); } } };
  const walk = root => {
    if(root.nodeType === 3){ doText(root); return; }
    if(root.nodeType !== 1) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while((n = w.nextNode())){ if(n.nodeType === 3) doText(n); else doAttrs(n); }
  };
  new MutationObserver(list => {
    for(const m of list){
      if(m.type === "characterData") doText(m.target);
      else if(m.type === "attributes") doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:ATTRS });
  document.addEventListener("DOMContentLoaded", () => walk(document.body));
}
