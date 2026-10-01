// Çekirdek mantık: perde/nota hesabı, parmak kodu çözümleme, perde bulucu.
// Tarayıcıda <script src="core.js"> ile, Node'da require("./core.js") ile yüklenir.

const SOL_TRANSPOSE = 5;          // Sol klarnet: yazılı = duyulan + tam 4'lü
let A4_HZ = 440;
const NOTE_EN = ["C","C♯","D","E♭","E","F","F♯","G","G♯","A","B♭","B"];
const NOTE_TR = ["Do","Do♯","Re","Mi♭","Mi","Fa","Fa♯","Sol","Sol♯","La","Si♭","Si"];

// Woodwind Fingering Guide gösterimi: sol el | sağ el.
// R register, T başparmak deliği, 1-2-3 delikler, '-' açık delik.
// Harfler mandal: deliklerden önce gelenler üst (boğaz/yan) mandal,
// bir delikten sonra gelenler o deliğin yanındaki ince mandal, 3. delikten sonrakiler serçe parmak mandalı.
const FINGERINGS = {
  52:"T 123E|123F", 53:"T 123|123F",  54:"T 123F#|123F", 55:"T 123|123",
  56:"T 123|123G#", 57:"T 123|12-",   58:"T 123|12Bb-",  59:"T 123|1--",
  60:"T 123|---",   61:"T 123C#|---", 62:"T 12-|---",    63:"T 12Eb-|---",
  64:"T 1--|---",   65:"T 1--|3---",  66:"T ---|---",    67:"---|---",
  68:"G#---|---",   69:"A---|---",    70:"R A---|---",
  71:"RT 123E|123F",72:"RT 123|123F", 73:"RT 123F#|123F",74:"RT 123|123",
  75:"RT 123|123G#",76:"RT 123|12-",  77:"RT 123|12Bb-", 78:"RT 123|1--",
  79:"RT 123|---",  80:"RT 123C#|---",81:"RT 12-|---",   82:"RT 12Eb-|---",
  83:"RT 1--|---",  84:"RT -2-|---"
};

const PERDES = [
  [-53,"Kaba Rast"],[-49,"Kaba Nim Zirgüle"],[-48,"Kaba Zirgüle"],[-45,"Kaba Dik Zirgüle"],
  [-44,"Kaba Dügâh"],[-40,"Kaba Kürdî"],[-39,"Kaba Dik Kürdî"],[-36,"Kaba Segâh"],
  [-35,"Kaba Bûselik"],[-32,"Kaba Dik Bûselik"],[-31,"Kaba Çargâh"],[-27,"Kaba Nim Hicaz"],
  [-26,"Kaba Hicaz"],[-23,"Kaba Dik Hicaz"],[-22,"Yegâh"],[-18,"Kaba Nim Hisar"],
  [-17,"Kaba Hisar"],[-14,"Kaba Dik Hisar"],[-13,"Hüseynî Aşîran"],[-9,"Acem Aşîran"],
  [-8,"Dik Acem Aşîran"],[-5,"Irak"],[-4,"Geveşt"],[-1,"Dik Geveşt"],
  [0,"Rast"],[4,"Nim Zirgüle"],[5,"Zirgüle"],[8,"Dik Zirgüle"],[9,"Dügâh"],
  [13,"Kürdî"],[14,"Dik Kürdî"],[17,"Segâh"],[18,"Bûselik"],[21,"Dik Bûselik"],
  [22,"Çargâh"],[26,"Nim Hicaz"],[27,"Hicaz"],[30,"Dik Hicaz"],[31,"Nevâ"],
  [35,"Nim Hisar"],[36,"Hisar"],[39,"Dik Hisar"],[40,"Hüseynî"],[44,"Acem"],
  [45,"Dik Acem"],[48,"Evç"],[49,"Mâhûr"],[52,"Dik Mâhûr"],[53,"Gerdâniye"],
  [57,"Nim Şehnâz"],[58,"Şehnâz"],[61,"Dik Şehnâz"],[62,"Muhayyer"],[66,"Sünbüle"],
  [67,"Dik Sünbüle"],[70,"Tiz Segâh"],[71,"Tiz Bûselik"],[74,"Tiz Dik Bûselik"],[75,"Tiz Çargâh"]
];

function setA4(hz){
  if(!(hz >= 400 && hz <= 480)) throw new Error("diyapazon 400-480 Hz arasında olmalı: " + hz);
  A4_HZ = hz;
}
function getA4(){ return A4_HZ; }
function midiToFreq(m){ return A4_HZ * Math.pow(2,(m-69)/12); }
function freqToMidi(f){ return 69 + 12*Math.log2(f/A4_HZ); }
function noteName(m){
  const pc = ((m%12)+12)%12, oct = Math.floor(m/12)-1;
  return { tr: NOTE_TR[pc]+oct, en: NOTE_EN[pc]+oct };
}
function nearestPerde(comma){
  let best=null, bd=1e9;
  for(const [c,n] of PERDES){ const d=Math.abs(c-comma); if(d<bd){bd=d;best=[c,n];} }
  if(!best || bd>2.5) return null;
  return { name: best[1], comma: best[0], delta: comma-best[0] };
}
function perdeFreq(written, transpose){
  const p = nearestPerde((written-67)*53/12);
  const exact = p ? 67 + p.comma*12/53 : written;   // perde adı olmayan kaba bölge: tampere
  return midiToFreq(exact - transpose);
}
function parseFingering(code){
  const out = { R:false, T:false, holes:{lh:[false,false,false], rh:[false,false,false]}, keys:[] };
  const raw = code.replace(/\s+/g,"");
  const bar = raw.indexOf("|");
  if(bar<0) throw new Error("gecersiz kod: "+code);
  let head = raw.slice(0,bar); const rh = raw.slice(bar+1);
  while(head.length && (head[0]==="R" || head[0]==="T")){
    if(head[0]==="R") out.R=true; else out.T=true;
    head = head.slice(1);
  }
  const scan = (s, hand) => {
    let i=0, hole=0;
    while(i<s.length){
      const ch=s[i];
      if(ch==="-"){ if(hole>=3) throw new Error("fazla delik: "+code); hole++; i++; continue; }
      if(ch>="1" && ch<="9"){
        const d=+ch;
        if(hole<3 && d===hole+1){ out.holes[hand][hole]=true; hole++; i++; continue; }
        out.keys.push({hand, name:ch, pre:hole===0, pos:hole}); i++; continue;
      }
      let name=ch; i++;
      if(i<s.length && (s[i]==="b" || s[i]==="#")){ name+=s[i]; i++; }
      out.keys.push({hand, name, pre:hole===0, pos:hole});
    }
    if(hole!==3) throw new Error("delik sayisi 3 degil: "+code);
  };
  scan(head,"lh"); scan(rh,"rh");
  return out;
}

// Mandalın şemadaki kimliği ve Türkçe adı. pos: mandaldan önce kaç delik geçti.
// Yalnızca Türk Sol klarnetinde kullanılan Albert sistemin (13 mandal, 2 halka) mandalları tanımlı
// (WFG: "RT AG#12Eb3C# E F#|1341a2Bb3G# F"). Oehler'e özgü mandallar (sol Fa ince mandalı,
// sol serçe Sol♯/Si♭, sağ 2. yan mandal) bilinçli olarak yok: kullanan bir parmak kodu hata verir.
const KEY_TR = {"A":"La","G#":"Sol♯","F":"Fa","Eb":"Mi♭","E":"Mi","F#":"Fa♯","C#":"Do♯","Bb":"Si♭"};
function keyInfo(k){
  const tr = KEY_TR[k.name];
  if(k.hand==="lh"){
    if(k.pos===0 && (k.name==="A" || k.name==="G#"))
      return { id: k.name==="A" ? "k-A" : "k-Gs-side", group:"lh-top",
               text: k.name==="A" ? "La mandalı (işaret parmağını yukarı kaydır)"
                                  : "Sol♯ yan mandalı (işaret parmağının iç yüzüyle)" };
    // İnce mandal 2. ile 3. delik arasında; 3. delik açık kaldığı için yüzük parmağı basar.
    if(k.pos===2 && k.name==="Eb") return { id:"k-Eb-sl", group:"lh", text:"Mi♭ ince mandalı (yüzük parmağıyla, 3. deliğin üstünde)" };
    const pinky = {"E":"k-E-lp","F#":"k-Fs-lp","C#":"k-Cs-lp"}[k.name];
    if(k.pos===3 && pinky) return { id:pinky, group:"lp", text: tr + " mandalı" };
    return null;
  }
  // Yan mandallar: WFG Boehm'e göre 1-3-4 diye numaralar; Albert'te 3 tane vardır ve
  // çalgıcılar yukarıdan aşağı 1-2-3 der. Kod WFG numarasını, ekran 1-2-3'ü kullanır.
  const side = {"1":1,"3":2,"4":3}[k.name];
  if(k.pos===0 && side)
    return { id:"k-s"+k.name, group:"rh", text: side + ". yan mandal (işaret parmağının yanıyla)" };
  if(k.pos===2 && k.name==="Bb") return { id:"k-Bb-sl", group:"rh", text:"Si♭ ince mandalı (yüzük parmağıyla, 3. deliğin üstünde)" };
  const pinky = {"F":"k-F-rp","G#":"k-Gs-rp"}[k.name];
  if(k.pos===3 && pinky) return { id:pinky, group:"rp", text: tr + " mandalı" };
  return null;
}

// Parmak kodunu adım adım okunur Türkçe talimata çevirir.
function describeFingering(code){
  const f = parseFingering(code);
  const fingers = ["işaret","orta","yüzük"];
  const holeText = holes => {
    const closed = fingers.filter((_,i)=>holes[i]);
    if(closed.length===3) return "üç delik kapalı";
    if(closed.length===0) return "tüm delikler açık";
    return closed.join(" + ") + " kapalı";
  };
  const extras = {"lh-top":[], lh:[], lp:[], rh:[], rp:[]};
  for(const k of f.keys){
    const info = keyInfo(k);
    if(!info) throw new Error("bilinmeyen mandal: " + k.hand + " " + k.name + " (" + code + ")");
    extras[info.group].push(info.text);
  }
  const thumb = f.T && f.R ? "deliği kapat + register'a bas"
              : f.T ? "deliği kapat"
              : f.R ? "delik açık, sadece register'a bas"
              : "boşta (delik açık)";
  return [
    { part:"Sol başparmak", text: thumb, active: f.T || f.R },
    { part:"Sol el", holes: f.holes.lh, text: [holeText(f.holes.lh), ...extras["lh-top"], ...extras.lh].join(" · "),
      active: f.holes.lh.some(Boolean) || extras["lh-top"].length+extras.lh.length>0 },
    { part:"Sol serçe", text: extras.lp.join(" · ") || "boşta", active: extras.lp.length>0 },
    { part:"Sağ el", holes: f.holes.rh, text: [holeText(f.holes.rh), ...extras.rh].join(" · "),
      active: f.holes.rh.some(Boolean) || extras.rh.length>0 },
    { part:"Sağ serçe", text: extras.rp.join(" · ") || "boşta", active: extras.rp.length>0 }
  ];
}

function analyze(freq, transpose){
  const concertF = freqToMidi(freq);
  const writtenF = concertF + transpose;
  const written = Math.round(writtenF);
  const cents = Math.round((writtenF-written)*100);
  const comma = (writtenF-67)*53/12;
  return {
    freq, cents, written, comma,
    writtenName: noteName(written),
    soundingName: noteName(written-transpose),
    perde: nearestPerde(comma),
    fingering: FINGERINGS[written] || null,
    register: written<=70 ? "Chalumeau" : "Klarino",
    inRange: written>=52 && written<=84
  };
}

// Hassasiyet 1 (en az) – 10 (en çok) → sessizlik eşiği (RMS).
function sensitivityToRms(s){ return 0.03 * Math.pow(0.002/0.03, (s-1)/9); }

function detectPitch(buf, sampleRate, minHz=100, maxHz=950, minRms=0.008){
  const n = buf.length;
  let sum=0; for(let i=0;i<n;i++) sum+=buf[i]*buf[i];
  const rms = Math.sqrt(sum/n);
  if(rms < minRms) return { freq:-1, rms, clarity:0 };
  const tauMin = Math.max(2, Math.floor(sampleRate/maxHz));
  const tauMax = Math.min(Math.floor(sampleRate/minHz), Math.floor(n/2));
  const nsdf = new Float32Array(tauMax+2);
  for(let tau=tauMin; tau<=tauMax; tau++){
    let ac=0, m=0; const lim=n-tau;
    for(let i=0;i<lim;i++){ const a=buf[i], b=buf[i+tau]; ac+=a*b; m+=a*a+b*b; }
    nsdf[tau] = m>0 ? 2*ac/m : 0;
  }
  let gmax=0;
  for(let t=tauMin+1;t<tauMax;t++) if(nsdf[t]>gmax) gmax=nsdf[t];
  if(gmax < 0.45) return { freq:-1, rms, clarity:gmax };
  const thr = 0.9*gmax;
  let pick=-1;
  for(let t=tauMin+1;t<tauMax;t++){
    if(nsdf[t]>nsdf[t-1] && nsdf[t]>=nsdf[t+1] && nsdf[t]>=thr){ pick=t; break; }
  }
  if(pick<0) return { freq:-1, rms, clarity:gmax };
  const a=nsdf[pick-1], b=nsdf[pick], c=nsdf[pick+1];
  const den = a - 2*b + c;
  const shift = den!==0 ? 0.5*(a-c)/den : 0;
  return { freq: sampleRate/(pick+shift), rms, clarity:gmax };
}

// Ekrandaki notanın titrememesi için: yeni nota ancak art arda `hold` ölçümde
// aynı kalırsa kabul edilir. Gösterilen nota sürerken her ölçüm geçer.
class NoteStabilizer{
  constructor(hold=3){ this.hold=hold; this.reset(); }
  reset(){ this.shown=null; this.cand=null; this.count=0; }
  push(key){
    if(key===this.shown){ this.cand=null; this.count=0; return true; }
    if(key===this.cand) this.count++;
    else { this.cand=key; this.count=1; }
    if(this.count>=this.hold){ this.shown=key; this.cand=null; this.count=0; return true; }
    return false;
  }
}
function noteKey(r){ return r.written + ":" + (r.perde ? r.perde.comma : "-"); }

if(typeof module !== "undefined") module.exports = {
  SOL_TRANSPOSE, FINGERINGS, PERDES, setA4, getA4, midiToFreq, freqToMidi, noteName,
  nearestPerde, perdeFreq, parseFingering, keyInfo, describeFingering, analyze,
  sensitivityToRms, detectPitch, NoteStabilizer, noteKey
};
