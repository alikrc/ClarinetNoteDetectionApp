// Beceri ölçümleri (saf mantık, Node'da test edilir): nota başı (onset) bulma ve ritim değerlendirmesi,
// ses kalitesi, dinamik (crescendo/decrescendo), seyir analizi ve kulak eğitimi soru üreticileri.
// Tarayıcıda lessons.js'ten sonra <script src="skills.js"> ile, Node'da require("./skills.js") ile yüklenir.

const SCORE = typeof module !== "undefined" ? require("./core.js") : { PERDES, nearestPerde, perdeNameAt };
const SLEARN = typeof module !== "undefined" ? require("./learn.js") : { MAKAMS, makamById, mean, sd, commaToWritten, perdeName };

// ---- Nota başı (onset) bulma ----
// Her ölçümde { t (ms), rms, on (perde bulundu mu), tOn? (pencere içinde enerjinin yükseldiği an) } gelir.
// İki tür nota başı: sessizlikten sese geçiş ve ses sürerken dil vuruşu (seviye tepe değerin yarısının
// altına düşüp yeniden yükselir). Aynı notayı dille tekrarlamak da sayılır.
class OnsetDetector{
  constructor(opts = {}){
    this.minGap = opts.minGap || 90;        // iki nota başı arası en az (ms)
    this.dip = opts.dip || 0.45;            // tepe değerin bu oranının altı "dil vuruşu boşluğu"
    this.rise = opts.rise || 0.7;           // yeniden bu orana çıkınca yeni nota başı
    this.reset();
  }
  reset(){ this.sounding = false; this.peak = 0; this.dipped = false; this.last = -1e9; }
  // Bir ölçüm işler; nota başı varsa zamanını (ms) döndürür
  push(f){
    let onset = null;
    if(!f.on){
      if(this.sounding){ this.sounding = false; this.peak = 0; this.dipped = false; }
      return null;
    }
    const t = f.tOn != null ? f.tOn : f.t;
    if(!this.sounding){
      this.sounding = true; this.peak = f.rms; this.dipped = false;
      if(t - this.last >= this.minGap) onset = t;
    }else{
      if(f.rms < this.peak*this.dip) this.dipped = true;
      else if(this.dipped && f.rms >= this.peak*this.rise){
        this.dipped = false;
        if(t - this.last >= this.minGap) onset = t;
        this.peak = f.rms;
      }
      // tepe yavaşça izlenir (uzun notada ses azalınca yeni vuruş yine yakalansın)
      this.peak = Math.max(f.rms, this.peak*0.97);
    }
    if(onset !== null) this.last = onset;
    return onset;
  }
}

// Beklenen vuruş zamanlarıyla çalınan nota başlarını eşler. tol: en çok sapma (ms).
// Dönen: { hits:[{exp, got, dev}], missed:[exp], extra:[got], mean, sd, absMean }
function matchOnsets(expected, played, tol){
  const used = new Set(), hits = [], missed = [];
  for(const e of expected){
    let best = -1, bd = Infinity;
    played.forEach((p, i) => { if(!used.has(i) && Math.abs(p - e) < bd){ bd = Math.abs(p - e); best = i; } });
    if(best >= 0 && bd <= tol){ used.add(best); hits.push({ exp:e, got:played[best], dev:played[best] - e }); }
    else missed.push(e);
  }
  const extra = played.filter((_, i) => !used.has(i));
  const devs = hits.map(h => h.dev);
  return { hits, missed, extra, mean: SLEARN.mean(devs), sd: SLEARN.sd(devs), absMean: SLEARN.mean(devs.map(Math.abs)) };
}
// Ritim puanı (0–100): isabet oranı %50, zamanlama tutarlılığı (yayılım) %30, ortalama erken/geç %20.
// Sapma ölçütleri vuruş aralığına göre ölçeklenir (yavaş tempoda aynı ms daha az hatadır).
function rhythmScore(m, beatMs, expectedN){
  const hitRate = expectedN ? m.hits.length / expectedN : 0;
  const extraPen = Math.min(0.3, m.extra.length / Math.max(1, expectedN) * 0.5);
  const rel = x => Math.min(1, x / (beatMs*0.25));
  const consistency = m.hits.length > 1 ? 1 - rel(m.sd) : hitRate;
  const center = m.hits.length ? 1 - rel(Math.abs(m.mean)) : 0;
  return Math.max(0, Math.round(100*(0.5*hitRate + 0.3*consistency + 0.2*center - extraPen)));
}
// Ritim kalıpları: her biri bir ölçüdeki vuruş noktaları (vuruş birimi cinsinden)
const RHYTHM_PATTERNS = [
  { id:"quarter", name:{ tr:"Her vuruşta bir nota", en:"One note per beat" }, beats:4, at:[0,1,2,3] },
  { id:"half",    name:{ tr:"İki vuruşta bir (ikilik)", en:"Every other beat (half notes)" }, beats:4, at:[0,2] },
  { id:"eighth",  name:{ tr:"Vuruş başına iki (sekizlik)", en:"Two per beat (eighths)" }, beats:4, at:[0,0.5,1,1.5,2,2.5,3,3.5] },
  { id:"dotted",  name:{ tr:"Noktalı dörtlük + sekizlik", en:"Dotted quarter + eighth" }, beats:4, at:[0,1.5,2,3.5] },
  { id:"offbeat", name:{ tr:"Vuruş arası (ters vuruş)", en:"Off-beats" }, beats:4, at:[0.5,1.5,2.5,3.5] }
];
// Usulün düm ve tek vuruşları (usulSlots dilimlerinden)
function usulStrokeTimes(slots){ return slots.map((s, i) => s ? i : null).filter(x => x !== null); }
// count-in sonrası beklenen zamanlar: start (ms), beatMs, ölçü sayısı, kalıp
function expectedTimes(start, beatMs, bars, pattern){
  const out = [];
  for(let b=0;b<bars;b++) for(const x of pattern.at) out.push(start + (b*pattern.beats + x)*beatMs);
  return out;
}

// ---- Ses kalitesi ----
// frames: [{ rms, clarity }] tutulan nota boyunca. Netlik (NSDF tepe değeri) havalı/gürültülü sesi ayırır;
// ses gücü dengesi seviyenin oynaklığıdır (değişim katsayısı).
function toneQuality(frames){
  if(frames.length < 5) return null;
  const cl = SLEARN.mean(frames.map(f => f.clarity));
  const rms = frames.map(f => f.rms), m = SLEARN.mean(rms), cv = m > 0 ? SLEARN.sd(rms)/m : 1;
  const clarity = Math.round(100*Math.max(0, Math.min(1, (cl - 0.80)/0.18)));
  const steadiness = Math.round(100*Math.max(0, Math.min(1, 1 - cv/0.25)));
  const tips = [];
  if(clarity < 60) tips.push({ tr:"Ses havalı ya da cızırtılı: ağızlığı biraz daha az al, dudak köşelerini sar, kamışı kontrol et.",
                               en:"The tone is airy or buzzy: take a little less mouthpiece, seal the corners, check the reed." });
  if(steadiness < 60) tips.push({ tr:"Ses gücü dalgalanıyor: karından sabit bir hava akışı ver, nefesin sonuna kadar desteği bırakma.",
                                  en:"The volume wavers: keep a steady air stream from the belly and support to the end of the breath." });
  return { clarity, steadiness, cv, meanClarity: cl, tips };
}

// ---- Dinamik ----
// frames: [{ t, rms, comma }]. shape: "cresc" (artan), "dim" (azalan), "messa" (artıp azalan).
// Ses düzeyi dB'ye çevrilir; aralık (dB), şekle uyum (korelasyon) ve perdenin kayması (koma) ölçülür.
function dynamicsEval(frames, shape){
  if(frames.length < 10) return null;
  const db = frames.map(f => 20*Math.log10(Math.max(f.rms, 1e-6)));
  const t0 = frames[0].t, T = frames[frames.length-1].t - t0 || 1;
  const x = frames.map(f => (f.t - t0)/T);
  const ideal = x.map(v => shape === "cresc" ? v : shape === "dim" ? 1 - v : 1 - Math.abs(2*v - 1));
  const corr = (a, b) => {
    const ma = SLEARN.mean(a), mb = SLEARN.mean(b);
    let n = 0, da = 0, dbb = 0;
    for(let i=0;i<a.length;i++){ n += (a[i]-ma)*(b[i]-mb); da += (a[i]-ma)**2; dbb += (b[i]-mb)**2; }
    return da && dbb ? n/Math.sqrt(da*dbb) : 0;
  };
  const sorted = [...db].sort((a,b) => a-b);
  const range = sorted[Math.floor(sorted.length*0.95)] - sorted[Math.floor(sorted.length*0.05)];
  const commas = frames.map(f => f.comma).filter(c => c != null);
  const drift = commas.length ? Math.max(...commas) - Math.min(...commas) : 0;
  const fit = corr(db, ideal);
  // Perdenin ses gücüyle birlikte kayması (klarnette ses açılınca perde tizleşir/pesleşir)
  const pitchCorr = commas.length === db.length ? corr(db, commas) : 0;
  return { range, fit, drift, pitchCorr, ok: range >= 10 && fit >= 0.7 && drift <= 2 };
}

// ---- Seyir analizi ----
// notes: segmentNotes çıktısı [{ written, start, end, comma }]. Her nota makamın en yakın perdesine (oktavlar dahil)
// eşlenir; perdelerde geçen süre, dizi dışı süre, karar perdesi, güçlüye uğrama ve açılış bölgesi bulunur.
function mapToScale(comma, mk){
  const scale = [...new Set([...mk.asc, ...mk.desc].map(c => ((c % 53) + 53) % 53))];
  let best = null, bd = 1e9;
  for(const c of scale) for(let k=-2;k<=3;k++){
    const v = c + 53*k, d = Math.abs(comma - v);
    if(d < bd){ bd = d; best = v; }
  }
  return bd <= 2 ? best : null;
}
function seyirAnalysis(notes, mk){
  const long = notes.filter(n => n.end - n.start >= 120);
  if(long.length < 4) return null;
  const time = {}; let total = 0, outT = 0;
  const mapped = long.map(n => ({ ...n, p: mapToScale(n.comma, mk), dur: n.end - n.start }));
  for(const n of mapped){
    total += n.dur;
    if(n.p === null){ outT += n.dur; continue; }
    time[n.p] = (time[n.p] || 0) + n.dur;
  }
  const same = (a, b) => a !== null && ((a - b) % 53 + 53) % 53 === 0;
  // Karar: son uzun nota (en az 400 ms ya da son nota) durak perdesinde mi
  const lastLong = [...mapped].reverse().find(n => n.dur >= 400) || mapped[mapped.length-1];
  const finalOk = same(lastLong.p, mk.durak);
  const durakTime = Object.entries(time).filter(([p]) => same(+p, mk.durak)).reduce((a, [, v]) => a + v, 0);
  const gucluTime = Object.entries(time).filter(([p]) => same(+p, mk.guclu)).reduce((a, [, v]) => a + v, 0);
  const ranked = Object.entries(time).sort((a, b) => b[1] - a[1]).map(([p]) => +p);
  const gucluRank = ranked.findIndex(p => same(p, mk.guclu));
  // Açılış: ilk %25'lik bölümün ortalama perdesi; durak ile tiz durak arasında nerede?
  const head = mapped.slice(0, Math.max(2, Math.ceil(mapped.length*0.25)));
  const headMean = SLEARN.mean(head.map(n => n.comma));
  const pos = (headMean - mk.durak) / 53;           // 0: durak, 1: tiz durak
  const opening = pos < 0.3 ? "low" : pos > 0.6 ? "high" : "mid";
  const want = { cikici:"low", inici:"high", "inici-cikici":"mid" }[mk.seyirType];
  const commas = mapped.map(n => n.comma);
  const res = {
    total, inScale: total ? 1 - outT/total : 0, finalOk, finalPerde: lastLong.p, durakShare: total ? durakTime/total : 0,
    gucluShare: total ? gucluTime/total : 0, gucluRank, opening, openingOk: opening === want || (want === "mid" && opening !== "low"),
    low: Math.min(...commas), high: Math.max(...commas), time
  };
  res.score = Math.round(100*(0.3*res.inScale + 0.3*(finalOk ? 1 : 0) + 0.2*(gucluRank >= 0 && gucluRank <= 2 ? 1 : gucluRank >= 0 ? 0.5 : 0) + 0.2*(res.openingOk ? 1 : 0)));
  res.ok = res.inScale >= 0.8 && finalOk && gucluRank >= 0;
  return res;
}
// Seyir analizinin okunur geri bildirimi
function seyirFeedback(res, mk, lang = "tr"){
  const en = lang === "en", out = [];
  const pn = c => SLEARN.perdeName(c) || "?";
  out.push(res.finalOk ? (en ? "You resolved on the final (" + pn(mk.durak) + ")." : "Durakta (" + pn(mk.durak) + ") karar verdin.")
    : (en ? "The last long note was " + (res.finalPerde !== null ? pn(res.finalPerde) : "outside the scale") + "; resolve on " + pn(mk.durak) + "."
          : "Son uzun nota " + (res.finalPerde !== null ? pn(res.finalPerde) : "dizi dışı") + "; kararı " + pn(mk.durak) + " perdesinde ver."));
  out.push(res.gucluRank >= 0 && res.gucluRank <= 2 ? (en ? "The dominant (" + pn(mk.guclu) + ") was emphasised." : "Güçlü (" + pn(mk.guclu) + ") vurgulandı.")
    : (en ? "Linger more on the dominant (" + pn(mk.guclu) + "); it shapes the makam." : "Güçlüde (" + pn(mk.guclu) + ") daha çok dur; makamın rengini o verir."));
  const inPct = Math.round(res.inScale*100);
  out.push(inPct >= 90 ? (en ? "Almost everything stayed in the scale (" + inPct + "%)." : "Neredeyse her şey dizide kaldı (%" + inPct + ").")
    : (en ? inPct + "% in the scale; notes outside may be a modulation or a mistake." : "Sürenin %" + inPct + "'i dizide; dışarıdaki notalar geçki ya da hata olabilir."));
  const typeTr = { cikici:"çıkıcı", inici:"inici", "inici-cikici":"inici-çıkıcı" }[mk.seyirType];
  const typeEn = { cikici:"ascending", inici:"descending", "inici-cikici":"descending-ascending" }[mk.seyirType];
  if(!res.openingOk) out.push(en ? mk.name + " has a " + typeEn + " seyir: " + (mk.seyirType === "cikici" ? "start around the final and climb." : mk.seyirType === "inici" ? "start in the upper register and come down." : "start around the dominant.")
                               : mk.name + " " + typeTr + " bir makam: " + (mk.seyirType === "cikici" ? "durak civarından başlayıp yüksel." : mk.seyirType === "inici" ? "tiz bölgeden başlayıp in." : "güçlü civarından başla."));
  else out.push(en ? "The opening fits the " + typeEn + " seyir." : "Açılış " + typeTr + " seyre uygun.");
  return out;
}

// ---- Kulak eğitimi ----
// Tiz mi pes mi: iki ses arasındaki fark (koma) uyarlanır; 2 doğru arka arkaya → fark küçülür, yanlış → büyür.
// Eşik ≈ %70,7 doğru oranına yakınsar (2-yukarı 1-aşağı merdiven).
class Staircase{
  constructor(start = 6, min = 0.25, max = 12){ this.d = start; this.min = min; this.max = max; this.streak = 0; this.reversals = []; this.dir = 0; }
  answer(right){
    let nd = this.d;
    if(right){ this.streak++; if(this.streak >= 2){ this.streak = 0; nd = Math.max(this.min, this.d/1.4); } }
    else { this.streak = 0; nd = Math.min(this.max, this.d*1.4); }
    const dir = Math.sign(nd - this.d);
    if(dir && this.dir && dir !== this.dir) this.reversals.push(this.d);
    if(dir) this.dir = dir;
    this.d = nd;
    return nd;
  }
  // Son 6 dönüşün ortalaması: ayırt edebildiğin en küçük fark (koma)
  threshold(){ const r = this.reversals.slice(-6); return r.length >= 2 ? SLEARN.mean(r) : null; }
}
// Perde ayırt: aynı yazılı notaya düşen iki AEU perdesi (ör. Segâh / Bûselik, Kürdî / Dik Kürdî) ya da
// verilen en küçük farka göre perde çiftleri. level: 1 (≥4 koma), 2 (≥2), 3 (1 koma)
function perdePairs(level){
  const P = SCORE.PERDES.filter(([c]) => c >= -22 && c <= 62);
  const minD = level >= 3 ? 1 : level === 2 ? 2 : 4, maxD = level >= 3 ? 1 : level === 2 ? 3 : 5;
  const out = [];
  for(let i=0;i<P.length;i++) for(let j=i+1;j<P.length;j++){
    const d = P[j][0] - P[i][0];
    if(d >= minD && d <= maxD) out.push([P[i], P[j]]);
  }
  return out;
}
// Makam tanı: çalınacak makam ve seçenekler (doğru + rastgele 3)
function makamChoices(pool, rng = Math.random){
  const ids = [...pool];
  const pick = ids[Math.floor(rng()*ids.length)];
  const others = ids.filter(x => x !== pick);
  const ch = [pick];
  while(ch.length < Math.min(4, ids.length) && others.length) ch.push(others.splice(Math.floor(rng()*others.length), 1)[0]);
  return { answer: pick, choices: ch.sort() };
}
// Makamı tanıtan kısa ezgi: durakta başlar, güçlüye uğrar, makamın renk perdeleriyle durakta biter
function makamPhrase(mk, rng = Math.random){
  const s = [...mk.asc];
  const gi = s.indexOf(mk.guclu) >= 0 ? s.indexOf(mk.guclu) : 4;
  const up = s.slice(0, gi + 1), down = [...s.slice(0, gi)].reverse();
  const mid = rng() < 0.5 ? [s[Math.min(s.length-1, gi+1)], mk.guclu] : [mk.guclu];
  return [...up, ...mid, ...down];
}

if(typeof module !== "undefined") module.exports = {
  OnsetDetector, matchOnsets, rhythmScore, RHYTHM_PATTERNS, usulStrokeTimes, expectedTimes,
  toneQuality, dynamicsEval, mapToScale, seyirAnalysis, seyirFeedback, Staircase, perdePairs, makamChoices, makamPhrase
};
