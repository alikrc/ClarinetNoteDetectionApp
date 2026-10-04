// Öğrenme özellikleri için saf mantık: makam dizileri, usuller, parmak testi, uzun ton puanı,
// entonasyon istatistiği, nota bölütleme, vibrato/glissando, taklit ve eser takibi, ilerleme.
// Tarayıcıda core.js'ten sonra <script src="learn.js"> ile, Node'da require("./learn.js") ile yüklenir.

const CORE = typeof module !== "undefined" ? require("./core.js")
  : { PERDES, nearestPerde, noteName, LOW_NOTE, HIGH_NOTE, fingeringsFor };

// ---- Makamlar ----
// Perdeler Rast'a (yazılı Sol4) göre koma cinsinden, AEU 53 koma sistemi.
// Diziler çeşni birleşimlerinden kuruldu (ör. Uşşak = Uşşak dörtlüsü + Bûselik beşlisi Nevâ'da);
// asc çıkıcı, desc inici (pesten tize yazılı, inerken tersten çalınır). Bir hocaya kontrol ettirilmeli.
const MAKAMS = [
  { id:"rast", name:"Rast", durak:0, guclu:31, yeden:-5,
    asc:[0,9,17,22,31,40,48,53], desc:[0,9,17,22,31,40,44,53],
    seyir:"Çıkıcı. Rast beşlisi + Nevâ'da Rast dörtlüsü. İnerken Evç yerine Acem basılır; Nevâ'da yarım, Rast'ta tam karar." },
  { id:"ussak", name:"Uşşak", durak:9, guclu:31, yeden:0,
    asc:[9,17,22,31,40,44,53,62], desc:[9,17,22,31,40,44,53,62],
    seyir:"Çıkıcı. Dügâh'ta Uşşak dörtlüsü + Nevâ'da Bûselik beşlisi. Nevâ civarında gezinip Dügâh'ta karar verir." },
  { id:"huseyni", name:"Hüseynî", durak:9, guclu:40, yeden:0,
    asc:[9,17,22,31,40,48,53,62], desc:[9,17,22,31,40,44,53,62],
    seyir:"İnici-çıkıcı. Dügâh'ta Hüseynî beşlisi + Hüseynî'de Uşşak dörtlüsü. Güçlü Hüseynî; inerken Acem." },
  { id:"hicaz", name:"Hicaz", durak:9, guclu:31, yeden:0,
    asc:[9,14,26,31,40,48,53,62], desc:[9,14,26,31,40,44,53,62],
    seyir:"Çıkıcı. Dügâh'ta Hicaz dörtlüsü (Dik Kürdî, Nim Hicaz) + Nevâ'da Rast beşlisi; inerken Acem." },
  { id:"huzzam", name:"Hüzzam", durak:17, guclu:31, yeden:9,
    asc:[17,22,31,36,48,53,62,70], desc:[17,22,31,36,48,53,62,70],
    seyir:"Çıkıcı. Segâh'ta Hüzzam beşlisi; Nevâ'da Hicaz çeşnisi (Hisar, Evç) belirgin. Hisar uygulamada biraz tiz basılır." },
  { id:"segah", name:"Segâh", durak:17, guclu:31, yeden:9,
    asc:[17,22,31,40,48,53,62,70], desc:[17,22,31,40,48,53,62,70],
    seyir:"Çıkıcı. Segâh'ta Segâh beşlisi; Nevâ ve Evç çevresinde gezinip Segâh'ta karar." },
  { id:"saba", name:"Saba", durak:9, guclu:22, yeden:0,
    asc:[9,17,22,27,40,44,53,58], desc:[9,17,22,27,40,44,53,58],
    seyir:"Çıkıcı. Dügâh'ta Saba dörtlüsü (Segâh, Çargâh, Hicaz); Çargâh'ta Hicaz çeşnisi. Diziyi oktavda tekrar etmez." },
  { id:"kurdi", name:"Kürdî", durak:9, guclu:31, yeden:0,
    asc:[9,13,22,31,40,44,53,62], desc:[9,13,22,31,40,44,53,62],
    seyir:"Çıkıcı. Dügâh'ta Kürdî dörtlüsü + Nevâ'da Bûselik beşlisi." },
  { id:"nihavend", name:"Nihâvend", durak:0, guclu:31, yeden:-5,
    asc:[0,9,13,22,31,35,48,53], desc:[0,9,13,22,31,35,44,53],
    seyir:"Çıkıcı. Rast'ta Bûselik beşlisi + Nevâ'da Kürdî ya da (çıkarken) Hicaz dörtlüsü." }
];
const makamById = id => MAKAMS.find(m => m.id === id) || null;

// Koma değerinin AEU perde adı (tam eşleşme yoksa en yakını)
function perdeName(c){
  const exact = CORE.PERDES.find(p => p[0] === c);
  if(exact) return exact[1];
  const n = CORE.nearestPerde(c);
  return n ? n.name : null;
}
// Koma değerine en yakın yazılı nota (MIDI)
const commaToWritten = c => Math.round(67 + c*12/53);
// Yazılı notadan çıkan ses için frekans katsayısı yok; koma → yazılı kesirli MIDI
const commaToMidi = c => 67 + c*12/53;

// Dizi alıştırmasındaki bir perdenin değerlendirmesi.
// played: çalınan koma, target: hedef koma, scale: dizideki komalar.
// Çalınan perde hedef yerine dizinin dışındaki başka bir perdeye daha yakınsa onu da söyler.
function judgePerde(played, target, scale){
  const dev = played - target;
  let other = null;
  const near = CORE.nearestPerde(played);
  if(near && near.comma !== target && !scale.includes(near.comma) &&
     Math.abs(near.delta) < Math.abs(dev)) other = near.name;
  return { dev, ok: Math.abs(dev) <= 1, other };
}

// ---- Usuller ----
// strokes: [vuruş, birim] — D düm, T tek; birim usulün `unit` değerinde.
const USULS = [
  { id:"semai",   name:"Semâî",      meter:"3/4",  strokes:[["D",1],["T",1],["T",1]] },
  { id:"sofyan",  name:"Sofyan",     meter:"4/4",  strokes:[["D",2],["T",1],["T",1]] },
  { id:"duyek",   name:"Düyek",      meter:"8/8",  strokes:[["T",1],["D",2],["T",1],["D",2],["T",2]] },
  { id:"aksak",   name:"Aksak",      meter:"9/8",  strokes:[["D",2],["T",1],["T",1],["D",2],["T",3]] },
  { id:"agiraksak", name:"Ağır Aksak", meter:"9/4", strokes:[["D",2],["T",1],["T",1],["D",2],["T",3]] },
  { id:"curcuna", name:"Curcuna",    meter:"10/8", strokes:[["D",2],["T",1],["T",1],["D",2],["T",2],["T",2]] }
];
// Usulü birim zaman dilimlerine açar: her dilim "D", "T" ya da "" (vuruşun devamı)
function usulSlots(u){
  const out = [];
  for(const [s, d] of u.strokes){ out.push(s); for(let i=1;i<d;i++) out.push(""); }
  return out;
}

// ---- Parmak ezberi testi ----
const LEVELS = [
  { id:"chalumeau", name:"Chalumeau", lo:52, hi:70 },
  { id:"klarino",   name:"Klarino",   lo:71, hi:84 },
  { id:"altissimo", name:"Altissimo", lo:85, hi:99 }
];
const UNLOCK_WINDOW = 20, UNLOCK_RATE = 0.8;

// stats: { [written]: {n, wrong, ms} } — ms ortalama cevap süresi.
// Yanlış ya da yavaş cevaplanan notanın ağırlığı artar; hiç sorulmamış nota orta ağırlıktadır.
function quizWeight(s){
  if(!s || !s.n) return 2;
  let w = (s.wrong + 1) / (s.n - s.wrong + 1) * 2;
  if(s.ms > 4000) w *= 1.5;
  return Math.min(6, Math.max(0.3, w));
}
function quizPick(levels, stats, rng = Math.random, last = null){
  const pool = [];
  for(const lv of levels) for(let w = lv.lo; w <= lv.hi; w++) if(w !== last) pool.push(w);
  const weights = pool.map(w => quizWeight(stats[w]));
  let r = rng() * weights.reduce((a,b) => a+b, 0);
  for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r <= 0) return pool[i]; }
  return pool[pool.length-1];
}
function quizRecord(stats, written, right, ms){
  const s = stats[written] || (stats[written] = { n:0, wrong:0, ms:0 });
  s.ms = (s.ms * s.n + ms) / (s.n + 1);
  s.n++; if(!right) s.wrong++;
  return s;
}
// Çalınan ile istenen nota: aynı, oktav hatası ya da yanlış
function compareNote(expected, played){
  if(played === expected) return "ok";
  if(((played - expected) % 12 + 12) % 12 === 0) return "octave";
  return "wrong";
}
// recent: seviye başına son cevaplar (true/false). Bir sonraki seviye, öncekinde son 20 cevabın %80'i doğruysa açılır.
function unlockedLevels(recent){
  let n = 1;
  for(let i=0;i<LEVELS.length-1;i++){
    const r = recent[LEVELS[i].id] || [];
    if(r.length >= UNLOCK_WINDOW && r.filter(Boolean).length / r.length >= UNLOCK_RATE) n = i+2;
    else break;
  }
  return n;
}
// "Bul" modu için 4 seçenek: doğru nota + aynı seviyeden yakın notalar
function quizChoices(written, lv, rng = Math.random){
  const near = [];
  for(let w = Math.max(lv.lo, written-4); w <= Math.min(lv.hi, written+4); w++) if(w !== written) near.push(w);
  const pick = [];
  while(pick.length < 3 && near.length) pick.push(near.splice(Math.floor(rng()*near.length), 1)[0]);
  pick.push(written);
  return pick.sort((a,b) => a-b);
}

// ---- Uzun ton ----
// devs: hedef perdeden koma sapmaları; durMs tutulan süre; targetMs hedef süre.
function mean(a){ return a.length ? a.reduce((x,y) => x+y, 0) / a.length : 0; }
function sd(a){ const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x-m)*(x-m)))) : 0; }
function longToneScore(devs, durMs, targetMs){
  const m = mean(devs), s = sd(devs);
  const stability = Math.max(0, 1 - s/1.0);       // 1 koma yayılım = 0 puan
  const accuracy  = Math.max(0, 1 - Math.abs(m)/1.5);
  const completion = Math.min(1, durMs/targetMs);
  return { mean:m, sd:s, durMs,
           score: Math.round(100*(0.4*stability + 0.35*accuracy + 0.25*completion)) };
}

// ---- Nota başına entonasyon istatistiği ----
// Aynı nota en az minMs tutulursa o bölümün ortalama sapması istatistiğe eklenir; kısa geçiş notaları sayılmaz.
class NoteStatCollector{
  constructor(onCommit, minMs = 300){ this.onCommit = onCommit; this.minMs = minMs; this.cur = null; }
  push(written, delta, t){
    if(this.cur && this.cur.written === written){ this.cur.devs.push(delta); this.cur.end = t; return; }
    this.flush();
    this.cur = { written, devs:[delta], start:t, end:t };
  }
  flush(){
    const c = this.cur; this.cur = null;
    if(c && c.end - c.start >= this.minMs) this.onCommit(c.written, mean(c.devs), c.end - c.start);
  }
}
function statAdd(stats, written, m){
  const s = stats[written] || (stats[written] = { n:0, sum:0, sumSq:0 });
  s.n++; s.sum += m; s.sumSq += m*m;
  return s;
}
// Isı haritası sınıfı: en az 3 ölçüm, ortalama ±0,5 komadan büyükse tiz/pes
function heatClass(s){
  if(!s || s.n < 3) return null;
  const m = s.sum / s.n;
  return m > 0.5 ? "sharp" : m < -0.5 ? "flat" : "clean";
}

// ---- Nota bölütleme (kayıt, taklit) ----
// frames: [{t, written, comma}] ya da sessizlikte {t, written:null}. Aynı notanın art arda gelen
// karelerini birleştirir; minMs'den kısa olanları atar.
function segmentNotes(frames, minMs = 120){
  const out = []; let cur = null;
  const close = () => {
    if(cur && cur.end - cur.start >= minMs)
      out.push({ written:cur.written, start:cur.start, end:cur.end, comma:mean(cur.commas) });
    cur = null;
  };
  for(const f of frames){
    if(f.written == null){ close(); continue; }
    if(cur && cur.written === f.written){ cur.end = f.t; cur.commas.push(f.comma); continue; }
    close();
    cur = { written:f.written, start:f.t, end:f.t, commas:[f.comma] };
  }
  close();
  return out;
}

// ---- Vibrato ve glissando ----
// frames: [{t (ms), comma}] aynı notada. Doğrusal eğilim çıkarılır, kalan salınımın
// sıfır geçişlerinden hız (Hz), etkin değerinden derinlik (± koma) bulunur.
// winSec: perde bulucunun ölçüm penceresi; pencere salınımı yumuşattığı için derinlik buna göre düzeltilir.
function vibrato(frames, winSec = 0){
  if(frames.length < 12) return null;
  const t0 = frames[0].t, T = frames[frames.length-1].t - t0;
  if(T < 700) return null;
  const xs = frames.map(f => (f.t - t0)/1000), ys = frames.map(f => f.comma);
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for(let i=0;i<xs.length;i++){ num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)*(xs[i]-mx); }
  const b = den ? num/den : 0;
  const res = ys.map((y,i) => y - (my + b*(xs[i]-mx)));
  const depth = Math.sqrt(mean(res.map(r => r*r))) * Math.SQRT2;
  const hyst = depth * 0.25;
  let sign = 0, cross = 0;
  for(const r of res){
    const s = r > hyst ? 1 : r < -hyst ? -1 : 0;
    if(s && sign && s !== sign) cross++;
    if(s) sign = s;
  }
  const rate = cross / 2 / (T/1000);
  if(cross < 4 || depth < 0.15 || rate < 3 || rate > 9) return null;
  const x = Math.PI * rate * winSec, sinc = x ? Math.sin(x)/x : 1;
  return { rate, depth: depth / Math.max(0.3, sinc) };
}
// İki kararlı nota arasındaki kareler sürekli ve tek yönlü en az 3 koma kayıyorsa glissando
function isGlide(frames, minSpan = 3, minMs = 100){
  if(frames.length < 3) return false;
  const dur = frames[frames.length-1].t - frames[0].t;
  const span = frames[frames.length-1].comma - frames[0].comma;
  if(dur < minMs || Math.abs(span) < minSpan) return false;
  let along = 0;
  for(let i=1;i<frames.length;i++) if(Math.sign(frames[i].comma - frames[i-1].comma) === Math.sign(span)) along++;
  return along / (frames.length-1) >= 0.6;
}

// ---- Taklit oyunu ----
// Makam dizisinden çoğunlukla adım adım ilerleyen bir motif üretir (komalar).
function makeMotif(scale, len, rng = Math.random){
  const s = [...new Set(scale)].sort((a,b) => a-b);
  let i = Math.floor(rng() * Math.ceil(s.length/2));
  const out = [s[i]];
  while(out.length < len){
    const r = rng();
    const step = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : -2;
    i = Math.max(0, Math.min(s.length-1, i + step));
    if(s[i] === out[out.length-1]) i = i > 0 ? i-1 : i+1;
    out.push(s[i]);
  }
  return out;
}

// ---- Eser takibi ----
// "Sol4 La4 Si♭4 Do5" gibi yazılı nota listesini MIDI numaralarına çevirir.
const LETTER_PC = { do:0, re:2, mi:4, fa:5, sol:7, la:9, si:11 };
function parseMelody(text){
  const notes = [], errors = [];
  for(const tok of text.split(/[\s,;|]+/).filter(Boolean)){
    const m = /^(do|re|mi|fa|sol|la|si)([♯#]|[♭b])?(\d)$/i.exec(tok.toLocaleLowerCase("tr").replace("ı","i"));
    if(!m){ errors.push(tok); continue; }
    const acc = !m[2] ? 0 : /[♯#]/.test(m[2]) ? 1 : -1;
    notes.push(LETTER_PC[m[1]] + acc + (+m[3] + 1) * 12);
  }
  return { notes, errors };
}
// Makam dizisinden alıştırma ezgileri (yazılı notalar)
function makamExercises(mk){
  const up = mk.asc.map(commaToWritten), down = [...mk.desc].reverse().map(commaToWritten);
  const thirds = [];
  for(let i=0;i+2<up.length;i++) thirds.push(up[i], up[i+2]);
  thirds.push(up[up.length-1]);
  return [
    { name: mk.name + " — çıkış ve iniş", notes: [...up, ...down.slice(1)] },
    { name: mk.name + " — üçlü atlamalar", notes: thirds }
  ];
}

// ---- İlerleme ----
function dayKey(d){
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate());
}
// days: { "YYYY-MM-DD": saniye }. En az 60 sn çalışılan art arda günler; bugün henüz yoksa dünden sayılır.
function streak(days, today = new Date()){
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if(!((days[dayKey(d)] || 0) >= 60)) d.setDate(d.getDate()-1);
  let n = 0;
  while((days[dayKey(d)] || 0) >= 60){ n++; d.setDate(d.getDate()-1); }
  return n;
}

if(typeof module !== "undefined") module.exports = {
  MAKAMS, makamById, perdeName, commaToWritten, commaToMidi, judgePerde,
  USULS, usulSlots, LEVELS, UNLOCK_WINDOW, quizWeight, quizPick, quizRecord, compareNote, unlockedLevels, quizChoices,
  mean, sd, longToneScore, NoteStatCollector, statAdd, heatClass, segmentNotes, vibrato, isGlide,
  makeMotif, parseMelody, makamExercises, dayKey, streak
};
