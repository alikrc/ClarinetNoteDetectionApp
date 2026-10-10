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
  83:"RT 1--|---",  84:"RT -2-|---",
  // Alt altissimo (Do♯6–Sol6), WFG Oehler/Albert temel tablosundaki birincil parmaklar:
  // https://www.wfg.woodwind.org/clarinet/ocl_bas_3.html
  85:"RT -23|123G#", 86:"RT -23|1-3G#", 87:"RT -23|1--G#", 88:"RT -23|---G#",
  89:"RT -23C#|---G#", 90:"RT -2-|---G#", 91:"RT -2-|4---G#",
  // Üst altissimo (Sol♯6–Mi♭7): bu sayfada temel tablo yok, alternatif tablosunun ilk parmağı.
  // https://www.wfg.woodwind.org/clarinet/ocl_alt_4.html
  92:"RT 1-3|1-3F", 93:"RT -23|---F", 94:"RT -23C#|123F", 95:"RT 12-|12-F",
  96:"RT 1--|12Bb-F", 97:"RT 1-3|-23F", 98:"RT 1--F#|31--F", 99:"RT -2-|123"
};

// Alternatif parmaklar: [kod, ne işe yaradığı]. WFG Oehler/Albert alternatif tabloları:
// ocl_alt_1 (chalumeau), ocl_alt_2 (klarino), ocl_alt_3 (alt altissimo), ocl_alt_4 (üst altissimo).
// Albert'te olmayan mandalları (sol Fa ince mandalı, sol serçe Sol♯/Si♭, sağ 2. yan mandal) kullananlar alınmadı.
const SOME = "Her modelde çıkmaz";
const ALT_FINGERINGS = {
  54:[["T 123E|123",""]],
  58:[["T 123|1-3",""]],
  63:[["T 12-|4---",""],["T 1-3|12Bb-",""],["T 1-3|1-3",""]],
  64:[["T 123|3---",""]],
  65:[["T -2-|---","Avusturya modelleri için; diğerlerinde tiz çıkar"],
      ["T -23|1--","Avusturya dışı modellerde perde düzeltmesi"]],
  67:[["---|123","Basit havalandırma parmağı"]],
  68:[["G#---|1-3F","Basit havalandırma parmağı"]],
  69:[["A--3|1-3F","Basit havalandırma parmağı"]],
  70:[["R A--3E|1--F","Basit havalandırma parmağı"],["R A--3E|12Bb-F","Basit havalandırma parmağı"]],
  71:[["T G#123E|123F",""],["RT G#123E|123F",""]],
  72:[["T G#123|123F",""],["RT G#123|123F",""]],
  73:[["RT 123E|123",""],["T G#123F#|123F",""],["T G#123E|123",""],
      ["RT G#123F#|123F",""],["RT G#123E|123",""]],
  77:[["RT 123|1-3",""]],
  80:[["RT 123C#E|123F",""],["RT 123E|-23F","Basset horn gibi pes çalgılarda işe yarar"]],
  81:[["RT 123C#|123F",""]],
  82:[["RT 12-|4---",""],["RT 1-3|---",""],["RT 123C#F#|123F",""],["RT 123C#E|123",""]],
  83:[["RT 123C#|123",""],["RT 123|4123",""]],
  84:[["RT 1--|3---",""],["T 1-3|123G#",""],["T -23F#|123F",""],["T 123|4123G#",""],["T 123|123G#",""]],
  85:[["RT ---|---",""],["RT 123|312-",""],["RT 123|12-",""]],
  86:[["RT G#---|---",SOME],["RT 123|312Bb-",""],
      ["RT 123|12Bb-","Fa5'e kaçmaması için dudak kontrolü ister"]],
  87:[["RT AG#---|---","Bazı modellerde sol yan Sol♯ mandalına basmak gerekmez"]],
  88:[["R 123|---G#",""],["RT 123|---G#",""],
      ["RT AG#---|1---",SOME + "; bazı modellerde sol yan Sol♯ mandalına basmak gerekmez"]],
  89:[["RT 123C#|123",""]],
  90:[["RT 12-|123G#",""],["RT 123C#|12-",""],["RT 12-|1---",""],
      ["RT -23|123G#","Do♯6'ya kaçmaması için dudak kontrolü ister"]],
  91:[["RT -2Eb-|---G#",""],["RT 1--|123G#",""],["RT 1--|1-Bb-F",""],["RT 1-3C#|12-",""],
      ["RT -2-|123G#","Genelde tiz çıkar; pes çalgılar ve ince kenarlı kamışlar için"],["RT 1--|1---G#",""]],
  92:[["RT ---|123G#",""],["RT --3C#|12-",""],["RT -2Eb-|1--G#",""],["RT -2-|41--G#",""],
      ["RT 123C#|41-3F",""],["RT -23|--3G#",""],
      ["RT --3|1-3F","Çok daha tiz; pes çalgılar ve ince kenarlı kamışlar için"]],
  93:[["RT -23C#|123",""],["RT -2-|1-Bb-G#",""],
      ["RT -23|-23","Daha tiz; pes çalgılar ve ince kenarlı kamışlar için"]],
  94:[["RT -23C#|12-G#",""],["R 123C#|123G#",""]],
  96:[["RT 12Eb-|412Bb-F",""],["RT 1-Eb-|1-3F",""]],
  97:[["RT 1--E|1-3F",""],["RT 1-3|123G#",""]],
  98:[["RT -2-F#|12-F",""],["RT 1-3E|3-2Bb-F",""]]
};
const LOW_NOTE = 52, HIGH_NOTE = 99;   // yazılı Mi3 – Mi♭7

// Notanın tüm parmakları; ilki temel parmak.
function fingeringsFor(written){
  if(!FINGERINGS[written]) return [];
  return [{ code: FINGERINGS[written], note: "" },
          ...(ALT_FINGERINGS[written] || []).map(([code, note]) => ({ code, note }))];
}

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
  [67,"Dik Sünbüle"],[70,"Tiz Segâh"],[71,"Tiz Bûselik"],[74,"Tiz Dik Bûselik"],[75,"Tiz Çargâh"],
  [79,"Tiz Nim Hicaz"],[80,"Tiz Hicaz"],[83,"Tiz Dik Hicaz"],[84,"Tiz Nevâ"],[88,"Tiz Nim Hisar"],
  [89,"Tiz Hisar"],[92,"Tiz Dik Hisar"],[93,"Tiz Hüseynî"],[97,"Tiz Acem"],[98,"Tiz Dik Acem"],
  [101,"Tiz Evç"],[102,"Tiz Mâhûr"],[105,"Tiz Dik Mâhûr"],[106,"Tiz Gerdâniye"],
  [110,"Tiz Nim Şehnâz"],[111,"Tiz Şehnâz"],[114,"Tiz Dik Şehnâz"],[115,"Tiz Muhayyer"],
  [119,"Tiz Sünbüle"],[120,"Tiz Dik Sünbüle"]
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
// Sol anahtarlı dizekte yazılı notanın yeri. step: alt çizgi (Mi4) 0, her çizgi/aralık 1 adım;
// 0, 2, 4, 6, 8 dizek çizgileri, eksi ve 8'den büyük çift adımlar ek çizgi.
// Sol♯6 ve üstü (5'ten fazla ek çizgi) bir oktav aşağı yazılıp üstüne 8va konur.
const STAFF_LETTER = [0,0,1,2,2,3,3,4,4,5,6,6];            // Do Re Mi Fa Sol La Si
const STAFF_ACC    = ["","♯","","♭","","","♯","","♯","","♭",""];
const OTTAVA_FROM = 92;
function staffPos(written){
  const ottava = written >= OTTAVA_FROM;
  const m = ottava ? written - 12 : written;
  const pc = ((m%12)+12)%12, oct = Math.floor(m/12)-1;
  return { step: oct*7 + STAFF_LETTER[pc] - 30, acc: STAFF_ACC[pc], ottava };
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
        // "1---": deliklerden önce gelen 1, arkasında hâlâ üç delik varsa 1. yan mandaldır
        const sideFirst = hole===0 && (s.slice(i+1).match(/[-1-9]/g) || []).length >= 3;
        if(hole<3 && d===hole+1 && !sideFirst){ out.holes[hand][hole]=true; hole++; i++; continue; }
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
// Sol serçedeki Do♯ mandalı (WFG "C#") Türk Sol klarnetinde Sol♯ diye bilinir: aynı mandal
// chalumeau'da Do♯, klarinoda Sol♯ verir. Kodda C# kalır, ekranda Sol♯ yazar.
const KEY_TR = {"A":"La","G#":"Sol♯","F":"Fa","Eb":"Mi♭","E":"Mi","F#":"Fa♯","C#":"Sol♯","Bb":"Si♭"};
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

// Parmağın şemadaki karşılığı: basılı delik ve mandal kimlikleri (sıralı).
// Aynı parmağın farklı yazılışları aynı listeyi verir.
function fingeringIds(code){
  const f = parseFingering(code), ids = [];
  if(f.R) ids.push("k-R");
  if(f.T) ids.push("h-T");
  f.holes.lh.forEach((v,i) => { if(v) ids.push("h-lh"+(i+1)); });
  f.holes.rh.forEach((v,i) => { if(v) ids.push("h-rh"+(i+1)); });
  for(const k of f.keys){
    const info = keyInfo(k);
    if(!info) throw new Error("bilinmeyen mandal: " + k.hand + " " + k.name + " (" + code + ")");
    ids.push(info.id);
  }
  return ids.sort();
}

// Şemada basılı delik/mandal kümesinden notayı bulur: { written, index, also } ya da null.
// Aynı parmak birden çok notada geçiyorsa (ör. Mi5 = Do♯6 alternatifi, dudakla ayrılır)
// temel parmak alternatife, sonra pes nota tize üstün gelir; diğerleri `also` listesinde.
let fingerIndex = null;
function findFingering(ids){
  if(!fingerIndex){
    fingerIndex = new Map();
    for(const basic of [true, false])
      for(let w=LOW_NOTE; w<=HIGH_NOTE; w++)
        fingeringsFor(w).forEach((f, i) => {
          if((i===0) !== basic) return;
          const key = fingeringIds(f.code).join(" ");
          if(!fingerIndex.has(key)) fingerIndex.set(key, []);
          fingerIndex.get(key).push({ written: w, index: i });
        });
  }
  const hits = fingerIndex.get([...ids].sort().join(" "));
  return hits ? { ...hits[0], also: hits.slice(1) } : null;
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
    fingerings: fingeringsFor(written),
    register: written<=70 ? "Chalumeau" : written<=84 ? "Klarino" : "Altissimo",
    inRange: written>=LOW_NOTE && written<=HIGH_NOTE
  };
}

// Hassasiyet 1 (en az) – 10 (en çok) → sessizlik eşiği (RMS).
function sensitivityToRms(s){ return 0.03 * Math.pow(0.002/0.03, (s-1)/9); }

// ---- Perde bulucu: McLeod (NSDF) + alt harmonik denetimi ----
// Yerinde karmaşık FFT (radix-2). re, im aynı uzunlukta, uzunluk 2'nin kuvveti.
function fft(re, im){
  const n = re.length;
  for(let i=1, j=0; i<n; i++){
    let bit = n >> 1;
    for(; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if(i < j){ let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for(let len=2; len<=n; len<<=1){
    const ang = -2*Math.PI/len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for(let i=0; i<n; i+=len){
      let cr = 1, ci = 0;
      for(let k=0; k<half; k++){
        const a = i+k, b = a+half;
        const tr = re[b]*cr - im[b]*ci, ti = re[b]*ci + im[b]*cr;
        re[b] = re[a]-tr; im[b] = im[a]-ti; re[a] += tr; im[a] += ti;
        const nr = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nr;
      }
    }
  }
}
const fftBufs = new Map();
// NSDF(τ) = 2·r(τ) / m(τ); r öz ilinti (FFT ile), m iki parçanın enerjisi (önek toplamlarıyla).
// Doğrudan toplama göre ~50 kat hızlı: telefonda her ölçüm 1 ms'nin altında kalır.
function nsdfOf(buf, tauMax){
  const n = buf.length;
  let N = 1; while(N < n + tauMax + 1) N <<= 1;
  if(!fftBufs.has(N)) fftBufs.set(N, { re: new Float64Array(N), im: new Float64Array(N) });
  const { re, im } = fftBufs.get(N);
  re.fill(0); im.fill(0);
  for(let i=0;i<n;i++) re[i] = buf[i];
  fft(re, im);
  for(let i=0;i<N;i++){ re[i] = re[i]*re[i] + im[i]*im[i]; im[i] = 0; }
  fft(re, im);                                   // güç spektrumu gerçek ve simetrik: ters FFT = FFT / N
  const sq = new Float64Array(n+1);
  for(let i=0;i<n;i++) sq[i+1] = sq[i] + buf[i]*buf[i];
  const out = new Float32Array(tauMax+2);
  for(let tau=0; tau<=tauMax+1 && tau<n; tau++){
    const m = sq[n-tau] + (sq[n] - sq[tau]);
    out[tau] = m > 0 ? 2*(re[tau]/N)/m : 0;
  }
  return out;
}
// Hann pencereli tek frekans genliği (Goertzel)
function toneMag(buf, f, sampleRate){
  const n = buf.length, w = 2*Math.PI*f/sampleRate, c = 2*Math.cos(w);
  let s1 = 0, s2 = 0;
  for(let i=0;i<n;i++){
    const s = buf[i]*(0.5 - 0.5*Math.cos(2*Math.PI*i/(n-1))) + c*s1 - s2;
    s2 = s1; s1 = s;
  }
  return Math.sqrt(Math.max(0, s1*s1 + s2*s2 - c*s1*s2));
}
// Telefon mikrofonları pes sesleri kırpar; temel ses zayıflayıp 3. harmonik baskın olunca
// NSDF onikili (ya da beşli) yukarıyı seçebilir. Seçilen periyottan uzun ve neredeyse aynı
// ölçüde periyodik bir aday varsa ve o frekansta gerçekten enerji varsa (−26 dB'den güçlü)
// asıl perde odur. Gerçek temel seste alt harmonik frekansında enerji olmadığı için yanılmaz.
const SUB_MIN_RATIO = 0.025;
function detectPitch(buf, sampleRate, minHz=100, maxHz=2100, minRms=0.008, opts={}){
  const n = buf.length;
  let sum=0; for(let i=0;i<n;i++) sum+=buf[i]*buf[i];
  const rms = Math.sqrt(sum/n);
  if(rms < minRms) return { freq:-1, rms, clarity:0 };
  const tauMin = Math.max(2, Math.floor(sampleRate/maxHz));
  const tauMax = Math.min(Math.floor(sampleRate/minHz), Math.floor(n/2));
  const nsdf = nsdfOf(buf, tauMax);
  const isPeak = t => nsdf[t]>nsdf[t-1] && nsdf[t]>=nsdf[t+1];
  const refine = t => {
    const a=nsdf[t-1], b=nsdf[t], c=nsdf[t+1], den = a - 2*b + c;
    return t + (den!==0 ? 0.5*(a-c)/den : 0);
  };
  // Tepenin ara değerli yüksekliği: tiz notalarda periyot tam sayı gecikmeye düşmez, ham değer düşük kalır
  const height = t => {
    const a=nsdf[t-1], b=nsdf[t], c=nsdf[t+1], den = a - 2*b + c;
    return den < 0 ? Math.min(1, b - (a-c)*(a-c)/(8*den)) : b;
  };
  let gmax=0;
  for(let t=tauMin+1;t<tauMax;t++) if(isPeak(t)) gmax = Math.max(gmax, height(t));
  if(gmax < 0.45) return { freq:-1, rms, clarity:gmax };
  const thr = 0.9*gmax;
  let pick=-1;
  for(let t=tauMin+1;t<tauMax;t++) if(isPeak(t) && height(t)>=thr){ pick=t; break; }
  if(pick<0) return { freq:-1, rms, clarity:gmax };
  let tau = refine(pick), sub = false;
  if(opts.subharmonic !== false){
    // Referans: seçilen sesin ilk üç harmoniğinin en güçlüsü (seçim bir harmonik ya da harmonikler arası olabilir)
    const f = sampleRate/tau, nyq = sampleRate/2;
    const base = Math.max(...[1,2,3].filter(k => k*f < nyq).map(k => toneMag(buf, k*f, sampleRate)));
    for(let t=tauMax-1; t>pick; t--){
      if(!isPeak(t) || height(t) < 0.8*gmax) continue;
      const tt = refine(t), ratio = tt/tau;
      // Yalnızca harmonik yanılgısının üretebileceği oranlar: 2, 3, 4, 5, 6 ya da 3/2
      if(![1.5, 2, 3, 4, 5, 6].some(r => Math.abs(ratio/r - 1) < 0.015)) continue;
      // Aday frekansta gerçek bir spektral tepe olmalı: yarım kutu yanındaki frekanslardan güçlü
      // (önceki notanın yakındaki yankısı sızıntıyla eşiği geçemesin)
      const fc = sampleRate/tt, hb = 0.5*sampleRate/n, mc = toneMag(buf, fc, sampleRate);
      if(mc >= SUB_MIN_RATIO*base && mc >= 0.8*toneMag(buf, fc-hb, sampleRate) && mc >= 0.8*toneMag(buf, fc+hb, sampleRate)){
        tau = tt; sub = true; break;
      }
    }
  }
  return { freq: sampleRate/tau, rms, clarity:gmax, sub };
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
  SOL_TRANSPOSE, FINGERINGS, ALT_FINGERINGS, LOW_NOTE, HIGH_NOTE, fingeringsFor, PERDES, setA4, getA4, midiToFreq, freqToMidi, noteName, staffPos,
  nearestPerde, perdeFreq, parseFingering, keyInfo, fingeringIds, findFingering, describeFingering, analyze,
  sensitivityToRms, detectPitch, NoteStabilizer, noteKey
};
