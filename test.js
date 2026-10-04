const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'index.html'),'utf8');
const { analyze, parseFingering, detectPitch, midiToFreq, FINGERINGS, ALT_FINGERINGS, LOW_NOTE, HIGH_NOTE,
        fingeringsFor, fingeringIds, findFingering, nearestPerde, perdeFreq,
        keyInfo, describeFingering, setA4, getA4, sensitivityToRms, NoteStabilizer, noteKey, staffPos } = require('./core.js');

let fail = 0;
const ok = (c,msg,extra='') => { console.log((c?'  OK  ':'  FAIL') + ' ' + msg + (extra?'   '+extra:'')); if(!c) fail++; };
// Temel ve alternatif tüm parmaklar: [nota, kod]
const ALL_CODES = [];
for(let w=LOW_NOTE; w<=HIGH_NOTE; w++) for(const f of fingeringsFor(w)) ALL_CODES.push([w, f.code]);
const NOTES = HIGH_NOTE - LOW_NOTE + 1;

console.log('\n[1] Tum parmak kodlari parse ediliyor mu (3+3 delik, bilinen perdeler)');
// Albert sistem (Türk Sol klarneti) mandalları — WFG: "RT AG#12Eb3C# E F#|1341a2Bb3G# F"
const KNOWN_LH_PRE=['A','G#'], KNOWN_LH_POST=['Eb','E','F#','C#'];
const KNOWN_RH_PRE=['1','3','4'], KNOWN_RH_POST=['F','G#','Bb'];
let parseErr=0, keyErr=[];
for (const [m,code] of ALL_CODES){
  try{
    const f = parseFingering(code);
    for(const k of f.keys){
      const list = k.hand==='lh' ? (k.pre?KNOWN_LH_PRE:KNOWN_LH_POST) : (k.pre?KNOWN_RH_PRE:KNOWN_RH_POST);
      if(!list.includes(k.name)) keyErr.push(m+' '+code+' -> '+k.hand+(k.pre?'/pre':'/post')+' '+k.name);
    }
  }catch(e){ parseErr++; console.log('   parse hatasi:', m, code, e.message); }
}
ok(parseErr===0, `${ALL_CODES.length} kodun (temel + alternatif) tamami parse edildi`);
ok(keyErr.length===0, 'tum mandallar Albert sistemde var', keyErr.join(' | '));

console.log('\n[2] Ornek parmaklar dogru cozumleniyor mu');
const g4 = parseFingering(FINGERINGS[67]);
ok(!g4.R && !g4.T && g4.holes.lh.every(x=>!x) && g4.holes.rh.every(x=>!x) && g4.keys.length===0, 'G4 (bos sol) = hepsi acik');
const e3 = parseFingering(FINGERINGS[52]);
ok(e3.T && !e3.R && e3.holes.lh.every(x=>x) && e3.holes.rh.every(x=>x) &&
   e3.keys.some(k=>k.hand==='lh'&&k.name==='E') && e3.keys.some(k=>k.hand==='rh'&&k.name==='F'), 'E3 = T + 6 delik + E/F maniveları');
const bb4 = parseFingering(FINGERINGS[70]);
ok(bb4.R && !bb4.T && bb4.keys.some(k=>k.hand==='lh'&&k.pre&&k.name==='A'), 'Bb4 = register + bogaz La perdesi');
const f4 = parseFingering(FINGERINGS[65]);
ok(f4.keys.some(k=>k.hand==='rh'&&k.pre&&k.name==='3') && f4.holes.rh.every(x=>!x), 'F4 = sag el 3 numarali yan tetik, delikler acik');
const b4 = parseFingering(FINGERINGS[71]);
ok(b4.R && b4.T, 'B4 (klarino) = register + basparmak');
const s1 = parseFingering('RT 12-|1---');                      // Fa♯6 alternatifi
ok(s1.keys.some(k=>k.hand==='rh'&&k.pre&&k.name==='1') && s1.holes.rh.every(x=>!x), '"|1---" = sag 1. yan mandal, delikler acik');
const h1 = parseFingering('RT 1--|1-Bb-F');                    // Sol6 alternatifi
ok(h1.holes.rh[0] && !h1.keys.some(k=>k.name==='1'), '"|1-Bb-F" = sag isaret deligi kapali (yan mandal degil)');

console.log('\n[2b] Alternatif parmaklar');
ok(Object.keys(ALT_FINGERINGS).every(w=>FINGERINGS[w]), 'alternatifi olan her notanin temel parmagi var');
let dupErr = [];
for(let w=LOW_NOTE; w<=HIGH_NOTE; w++){
  const codes = fingeringsFor(w).map(f=>f.code.replace(/\s+/g,''));
  if(new Set(codes).size !== codes.length) dupErr.push(w);
}
ok(dupErr.length===0, 'hicbir notada ayni parmak iki kez yok', dupErr.join(','));
ok(fingeringsFor(91)[0].code===FINGERINGS[91] && fingeringsFor(91).length===7, 'Sol6: temel parmak ilk sirada + 6 alternatif');
ok(fingeringsFor(92).length===8 && fingeringsFor(99).length===1, 'Sol♯6: temel + 7 alternatif; Mi♭7 tek parmak');
ok(analyze(midiToFreq(62),5).fingerings.length===2, 'analyze() alternatifleri de donduruyor (Sol4: temel + havalandirma)');

console.log('\n[3] Frekans -> yazili nota / duyulan / perde (transpoze 5 yariton)');
const cases = [
  [midiToFreq(62), 'G4',  'D4',  'Rast'],            // duyulan Re4 -> yazili Sol4
  [midiToFreq(47), 'E3',  'B2',  null],              // en pest temel parmak
  [midiToFreq(55), 'C4',  'G3',  'Kaba Çargâh'],
  [midiToFreq(69), 'D5',  'A4',  'Nevâ'],
  [midiToFreq(79), 'C6',  'G5',  'Tiz Çargâh'],
];
for(const [f,w,s,p] of cases){
  const r = analyze(f, 5);
  ok(r.writtenName.en===w && r.soundingName.en===s && (r.perde?r.perde.name:null)===p,
     `${f.toFixed(1)} Hz -> yazili ${w} / duyulan ${s} / ${p}`,
     `(gelen: ${r.writtenName.en} / ${r.soundingName.en} / ${r.perde?r.perde.name:'—'})`);
}

console.log('\n[4] Koma perdeleri (AEU) dogru isimleniyor mu');
const komaCase = (commas, expectPerde, expectNote) => {
  const writtenMidi = 67 + commas*12/53;      // Rast = yazili G4
  const r = analyze(midiToFreq(writtenMidi-5), 5);
  ok(r.perde.name===expectPerde && r.writtenName.en===expectNote,
     `${commas} koma -> ${expectPerde} (en yakin tampere ${expectNote})`,
     `(gelen: ${r.perde.name} / ${r.writtenName.en} / ${r.cents} sent)`);
};
komaCase(17,'Segâh','B4');
komaCase(18,'Bûselik','B4');
komaCase(27,'Hicaz','C♯5');
komaCase(48,'Evç','F♯5');
komaCase(-13,'Hüseynî Aşîran','E4');
komaCase(-22,'Yegâh','D4');

console.log('\n[5] Perde bulucu: sentetik klarnet sesi (tek harmonikler)');
const sr = 48000;
for(const f0 of [123.47, 146.83, 220.0, 293.66, 440.0, 587.33, 783.99, 987.77, 1174.66, 1567.98, 1864.66]){
  const n = 4096, buf = new Float32Array(n);
  for(let i=0;i<n;i++){
    const t = i/sr;
    buf[i] = 0.5*Math.sin(2*Math.PI*f0*t) + 0.30*Math.sin(2*Math.PI*3*f0*t+0.7)
           + 0.15*Math.sin(2*Math.PI*5*f0*t+1.3) + 0.06*Math.sin(2*Math.PI*7*f0*t)
           + 0.004*(Math.random()-0.5);
  }
  const d = detectPitch(buf, sr);
  const cents = 1200*Math.log2(d.freq/f0);
  ok(Math.abs(cents) < 5, `${f0} Hz -> ${d.freq.toFixed(2)} Hz`, `(${cents.toFixed(2)} sent sapma, clarity ${d.clarity.toFixed(2)})`);
}

console.log('\n[6] Sessizlik ve gurultu reddi');
const quiet = new Float32Array(4096); for(let i=0;i<4096;i++) quiet[i]=0.0005*(Math.random()-0.5);
ok(detectPitch(quiet, sr).freq === -1, 'sessizlikte nota gostermiyor');
const noise = new Float32Array(4096); for(let i=0;i<4096;i++) noise[i]=0.3*(Math.random()-0.5);
ok(detectPitch(noise, sr).freq === -1, 'beyaz gurultuyu reddediyor');

console.log('\n[7] Altissimo ve aralik disi');
const g6 = analyze(midiToFreq(86),5);
ok(g6.inRange && g6.written===91 && g6.register==='Altissimo' && g6.fingering==='RT -2-|4---G#',
   'duyulan Re6 = yazili Sol6, altissimo parmagi var', JSON.stringify([g6.written,g6.register,g6.fingering]));
ok(analyze(midiToFreq(79),5).register==='Klarino', 'yazili Do6 hala klarino');
const eb7 = analyze(midiToFreq(94),5);
ok(eb7.inRange && eb7.written===99 && eb7.fingering==='RT -2-|123', 'duyulan Si♭6 = yazili Mi♭7, en tiz parmak');
ok(analyze(midiToFreq(95),5).inRange===false, 'cok tiz ses -> aralik disi');

console.log('\n[8] Nota seridi: AEU koma frekanslari ve klavye eslemesi');
let stripErr = [];
for(let w=LOW_NOTE; w<=HIGH_NOTE; w++){
  const f = perdeFreq(w, 5);
  const r = analyze(f, 5);
  const p = nearestPerde((w-67)*53/12);
  if(r.written !== w) stripErr.push(`${w}: geri okumada ${r.written}`);
  if((r.perde?r.perde.name:null) !== (p?p.name:null)) stripErr.push(`${w}: perde adi tutmadi`);
  if(p && Math.abs(r.perde.delta) > 0.01) stripErr.push(`${w}: ${p.name} komasindan sapma ${r.perde.delta.toFixed(2)}`);
  if(!FINGERINGS[w]) stripErr.push(`${w}: parmak kodu yok`);
}
ok(stripErr.length===0, `${NOTES} notanin tamami: dogru perde, tam koma yuksekligi, parmak kodu var`, stripErr.join(' | '));
ok(Math.abs(perdeFreq(67,5) - midiToFreq(62)) < 1e-9, 'Rast (yazili Sol4) = duyulan Re4 = 293,66 Hz', perdeFreq(67,5).toFixed(2)+' Hz');
ok(Math.abs(perdeFreq(52,5) - midiToFreq(47)) < 1e-9, 'perde adi olmayan kaba bolge (Mi3) tampere kaliyor');
ok(Math.abs(1200*Math.log2(perdeFreq(76,5)/midiToFreq(71))) > 5, 'Huseyni (yazili La5) tampereden duyulur sekilde ayri', (1200*Math.log2(perdeFreq(76,5)/midiToFreq(71))).toFixed(1)+' sent');
ok(Math.abs(perdeFreq(67,0) - midiToFreq(67)) < 1e-9, 'transpozisyon kapaliyken yazili = duyulan');

const uiSrc = html.split('const KEYCODES = [')[1];
const codes = uiSrc.split('];')[0].match(/"[^"]+"/g).map(x=>x.slice(1,-1));
const labels = uiSrc.split('const KEYLABEL = [')[1].split('];')[0].match(/"[^"]+"/g).map(x=>x.slice(1,-1));
ok(codes.length===labels.length && codes.length>=40 && codes.length<=NOTES, `klavye eslemesi ${codes.length} nota (Mi3'ten itibaren)`, `${codes.length} kod / ${labels.length} etiket`);
ok(new Set(codes).size===codes.length, 'ayni tus iki notaya baglanmamis');

console.log('\n[9] Parmak semasi: her mandal SVG\'de cizili, talimat uretiliyor');
let svgErr = [];
for(const [m,code] of ALL_CODES){
  for(const k of parseFingering(code).keys){
    const info = keyInfo(k);
    if(!info) svgErr.push(m+' '+k.hand+' '+k.name+' esleme yok');
    else if(!html.includes('id="'+info.id+'"')) svgErr.push(m+' '+info.id+' SVG\'de yok');
  }
  try{ describeFingering(code); }catch(e){ svgErr.push(m+' talimat: '+e.message); }
}
for(const id of ['k-R','h-T','h-lh1','h-lh2','h-lh3','h-rh1','h-rh2','h-rh3'])
  if(!html.includes('id="'+id+'"')) svgErr.push(id+' SVG\'de yok');
ok(svgErr.length===0, `${ALL_CODES.length} parmagin tum mandal ve delikleri semada var`, svgErr.join(' | '));
const dE3 = describeFingering(FINGERINGS[52]);
ok(dE3[0].text.includes('kapat') && dE3[2].text==='Mi mandalı' && dE3[4].text==='Fa mandalı' && dE3[1].text==='üç delik kapalı',
   'Mi3 talimati: basparmak kapali, sol serce Mi, sag serce Fa', JSON.stringify(dE3.map(r=>r.text)));
const dBb = describeFingering(FINGERINGS[70]);
ok(dBb[0].text.includes('register') && !dBb[0].text.includes('kapat') && dBb[1].text.includes('La mandalı'),
   'Si♭4 talimati: sadece register + La mandali', JSON.stringify(dBb.map(r=>r.text)));
const dF4 = describeFingering(FINGERINGS[65]);
ok(dF4[3].text.includes('2. yan mandal') && dF4[3].text.includes('tüm delikler açık'), 'Fa4 talimati: sag 2. yan mandal (WFG 3 = ortadaki)');
ok(describeFingering(FINGERINGS[63])[1].text.includes('Mi♭ ince mandalı (yüzük'), 'Mi♭4: ince mandala yuzuk parmagi basiyor');
ok(describeFingering(FINGERINGS[58])[3].text.includes('Si♭ ince mandalı (yüzük'), 'Si♭3: sag ince mandala yuzuk parmagi basiyor');
ok(describeFingering(FINGERINGS[61])[2].text==='Sol♯ mandalı', 'Do♯4: sol serce mandali Sol♯ diye yaziyor');
ok(/id="k-Cs-lp"[^]*?>Sol♯</.test(html), 'semada sol serce Do♯ mandalinin etiketi Sol♯');
ok(describeFingering(FINGERINGS[67]).every(r=>!r.active), 'Sol4 (bos parmak): hicbir sey basili degil');
let oehlerErr = 0;
for(const code of ['T 1F--|---', 'T 123G#|123', 'T 123Bb|12-']){   // WFG'deki Oehler'e ozgu alternatifler
  try{ describeFingering(code); }catch(e){ oehlerErr++; }
}
ok(oehlerErr===3, 'Albert\'te olmayan Oehler mandallari (sol Fa, sol serce Sol♯/Si♭) reddediliyor');
for(const id of ['k-F-sl','k-Gs-lp','k-Bb-lp','k-s2'])
  ok(!html.includes('id="'+id+'"'), 'semada Oehler\'e ozgu '+id+' yok');

console.log('\n[9b] Klarnetten cal: semadaki basili delik/mandaldan nota bulma');
let roundErr = [];
for(const [w,code] of ALL_CODES){
  const m = findFingering(fingeringIds(code));
  if(!m) roundErr.push(`${w} ${code}: bulunamadi`);
  else if(![m, ...m.also].some(x => x.written===w)) roundErr.push(`${w} ${code}: ${m.written} dondu`);
}
ok(roundErr.length===0, 'her parmak semadan geri bulunuyor', roundErr.join(' | '));
ok(findFingering([])?.written===67, 'hicbir sey basili degil -> Sol4 (Rast)');
ok(findFingering(['h-T','h-lh1','h-lh2','h-lh3'])?.written===60, 'basparmak + sol 3 delik -> Do4');
const g4alt = findFingering(['h-rh1','h-rh2','h-rh3']);
ok(g4alt?.written===67 && g4alt.index===1, 'yalniz sag 3 delik -> Sol4 havalandirma alternatifi');
const e5 = findFingering(fingeringIds(FINGERINGS[76]));
ok(e5.written===76 && e5.also.some(a=>a.written===85), 'Mi5 temel parmagi Mi5 secilir, Do♯6 da ayni parmak diye bildirilir');
ok(findFingering(['h-lh2'])===null, 'tabloda olmayan parmak -> null');
ok(findFingering(['h-lh1','h-T','k-R'])?.written===83, 'basma sirasi onemsiz (R+T+sol isaret -> Si5)');
const chartIds = new Set(ALL_CODES.flatMap(([,c]) => fingeringIds(c)));
const svgIds = [...html.matchAll(/class="(?:hole|key)" id="([^"]+)"/g)].map(x=>x[1]);
ok(svgIds.every(id => chartIds.has(id)), 'semadaki her delik/mandal en az bir parmakta kullaniliyor', svgIds.filter(id=>!chartIds.has(id)).join(','));

console.log('\n[10] Diyapazon ayari');
setA4(442);
ok(Math.abs(midiToFreq(69)-442)<1e-9, 'La = 442 Hz ayarlaninca A4 = 442 Hz');
const r442 = analyze(perdeFreq(67,5), 5);
ok(r442.perde.name==='Rast' && Math.abs(r442.perde.delta)<0.01, '442 Hz\'de Rast yine tam Rast okunuyor');
const r440at442 = analyze(293.66, 5);
ok(r440at442.perde.delta < -0.2, '440 akortlu Re4, 442 diyapazonda pes gorunuyor', r440at442.perde.delta.toFixed(2)+' koma');
let threw=false; try{ setA4(1000); }catch(e){ threw=true; }
ok(threw && getA4()===442, 'gecersiz diyapazon reddediliyor');
setA4(440);

console.log('\n[11] Hassasiyet esigi');
ok(sensitivityToRms(1) > sensitivityToRms(5) && sensitivityToRms(5) > sensitivityToRms(10), 'hassasiyet arttikca esik dusuyor');
const soft = new Float32Array(4096); for(let i=0;i<4096;i++) soft[i]=0.006*Math.sin(2*Math.PI*293.66*i/sr);
ok(detectPitch(soft, sr, 100, 950, sensitivityToRms(1)).freq===-1, 'kisik ses dusuk hassasiyette yok sayiliyor');
ok(Math.abs(detectPitch(soft, sr, 100, 950, sensitivityToRms(10)).freq-293.66)<1, 'ayni ses yuksek hassasiyette algilaniyor');

console.log('\n[12] Nota titremesi onleyici');
const st = new NoteStabilizer(3);
ok(!st.push('a') && !st.push('a') && st.push('a'), 'yeni nota 3 olcumden sonra kabul ediliyor');
ok(!st.push('b') && st.push('a'), 'tek olcumluk sicrama gosterilen notayi degistirmiyor');
ok(!st.push('b') && !st.push('b') && st.push('b') && st.shown==='b', 'kalici degisim 3 olcumde geciyor');
ok(noteKey(analyze(perdeFreq(76,5),5)) !== noteKey(analyze(perdeFreq(75,5),5)), 'komsu perdeler farkli anahtar uretiyor');

console.log('\n[13] Dizekteki yer');
ok(staffPos(64).step===0 && staffPos(77).step===8, 'Mi4 alt cizgi, Fa5 ust cizgi');
ok(staffPos(67).step===2 && staffPos(60).step===-2, 'Sol4 ikinci cizgi, Do4 bir ek cizgi');
ok(staffPos(52).step===-7, 'en pes yazili Mi3 uc ek cizginin altinda');
ok(staffPos(70).acc==='♭' && staffPos(70).step===staffPos(71).step && staffPos(66).acc==='♯' && staffPos(66).step===staffPos(65).step,
   'Si♭ Si ile, Fa♯ Fa ile ayni yerde; isaret dogru');
ok(!staffPos(91).ottava && staffPos(91).step===16 && staffPos(92).ottava && staffPos(92).step===9, 'Sol♯6 ve ustu 8va ile bir oktav asagi');
let maxStep=-99, minStep=99;
for(let w=LOW_NOTE; w<=HIGH_NOTE; w++){ const s=staffPos(w).step; maxStep=Math.max(maxStep,s); minStep=Math.min(minStep,s); }
ok(minStep===-7 && maxStep===16, 'tum aralik -7…16 adim icinde (sabit yukseklikli dizek)', minStep+'…'+maxStep);

const L = require('./learn.js');
const { PERDES } = require('./core.js');

console.log('\n[14] Makam dizileri');
const perdeSet = new Set(PERDES.map(p=>p[0]));
let mkErr = [];
for(const mk of L.MAKAMS){
  for(const c of [...mk.asc, ...mk.desc, mk.durak, mk.guclu, mk.yeden]) if(!perdeSet.has(c)) mkErr.push(mk.name+' '+c);
  for(const list of [mk.asc, mk.desc]){
    if(list.length!==8) mkErr.push(mk.name+' 8 perde degil');
    for(let i=1;i<list.length;i++) if(list[i]<=list[i-1]) mkErr.push(mk.name+' sirasiz');
  }
  if(mk.asc[0]!==mk.durak || mk.desc[0]!==mk.durak) mkErr.push(mk.name+' durakla baslamiyor');
  if(![...mk.asc, ...mk.desc].includes(mk.guclu)) mkErr.push(mk.name+' guclu dizide yok');
  for(const c of [...mk.asc, ...mk.desc]){ const w=L.commaToWritten(c); if(w<LOW_NOTE||w>HIGH_NOTE) mkErr.push(mk.name+' aralik disi '+c); }
}
ok(L.MAKAMS.length===9 && mkErr.length===0, '9 makamin her perdesi AEU tablosunda, sirali, durakla basliyor, calinabilir aralikta', mkErr.join(' | '));
const rast = L.makamById('rast');
ok(rast.asc[6]===48 && rast.desc[6]===44, 'Rast: cikarken Evc, inerken Acem');
ok(L.perdeName(17)==='Segâh' && L.commaToWritten(17)===71 && L.commaToWritten(9)===69 && L.commaToWritten(14)===70, 'koma -> perde adi ve yazili nota (Segâh = Si4, Dügâh = La4)');
const jSeg = L.judgePerde(18.1, 17, L.makamById('ussak').asc);
ok(!jSeg.ok || jSeg.other==='Bûselik', 'Uşşak: Segâh yerine Bûselik calininca uyarir', JSON.stringify(jSeg));
ok(L.judgePerde(17.4, 17, rast.asc).ok && !L.judgePerde(19, 17, rast.asc).ok, '±1 koma icinde temiz sayilir');

console.log('\n[15] Usuller');
ok(L.USULS.every(u => L.usulSlots(u).length === +u.meter.split('/')[0]), 'her usulun vurus toplami olcu sayisina esit');
ok(L.usulSlots(L.USULS.find(u=>u.id==='sofyan')).join(',')==='D,,T,T', 'Sofyan = Düm . Tek Tek');

console.log('\n[16] Parmak ezberi testi');
const qs = {};
L.quizRecord(qs, 60, false, 5000); L.quizRecord(qs, 60, false, 5000); L.quizRecord(qs, 62, true, 900); L.quizRecord(qs, 62, true, 900);
ok(L.quizWeight(qs[60]) > L.quizWeight(qs[62]) && L.quizWeight(undefined) > L.quizWeight(qs[62]), 'yanlis/yavas notalar daha agir, dogrular hafif');
let seq=0.0; const rng = () => (seq = (seq*9301+49297)%233280)/233280;
const counts = {}; for(let i=0;i<3000;i++){ const w=L.quizPick([L.LEVELS[0]], qs, rng); counts[w]=(counts[w]||0)+1; }
ok(Object.keys(counts).every(w=>w>=52&&w<=70) && counts[60] > counts[62]*3, 'secim bolge icinde ve zor nota daha sik soruluyor', counts[60]+' / '+counts[62]);
let rep = 0; for(let i=0;i<200;i++) if(L.quizPick([{lo:60,hi:61}], {}, Math.random, 60)===60) rep++;
ok(rep===0, 'ayni nota art arda sorulmuyor');
ok(L.compareNote(67,67)==='ok' && L.compareNote(67,79)==='octave' && L.compareNote(67,68)==='wrong', 'dogru / oktav hatasi / yanlis');
ok(L.unlockedLevels({})===1 && L.unlockedLevels({chalumeau:Array(20).fill(true)})===2 &&
   L.unlockedLevels({chalumeau:[...Array(16).fill(true),...Array(4).fill(false)], klarino:Array(20).fill(true)})===3 &&
   L.unlockedLevels({chalumeau:[...Array(14).fill(true),...Array(6).fill(false)]})===1, 'son 20 cevabin %80i dogruysa sonraki bolge acilir');
const ch = L.quizChoices(60, L.LEVELS[0]);
ok(ch.length===4 && ch.includes(60) && new Set(ch).size===4 && ch.every(w=>w>=52&&w<=70), 'Bul modu: 4 farkli secenek, dogrusu dahil');

console.log('\n[17] Uzun ton ve entonasyon istatistigi');
const steady = L.longToneScore(Array(100).fill(0.1), 8000, 8000), wobbly = L.longToneScore(Array.from({length:100},(_,i)=>i%2?1.2:-0.8), 8000, 8000);
ok(steady.score>=95 && wobbly.score<steady.score-30, 'sabit ses yuksek, dalgali ses dusuk puan', steady.score+' / '+wobbly.score);
ok(L.longToneScore(Array(50).fill(0), 4000, 8000).score===88, 'surenin yarisi: tamamlama puaninin yarisi');
const commits=[]; const col = new L.NoteStatCollector((w,m,d)=>commits.push([w,m,d]));
col.push(67,1,0); col.push(67,1.2,200); col.push(67,0.8,400); col.push(69,0,450); col.push(69,0,500); col.push(67,0.5,600); col.flush();
ok(commits.length===1 && commits[0][0]===67 && Math.abs(commits[0][1]-1)<1e-9, '0,3 sn altindaki gecis notalari sayilmiyor');
const ist = {}; [0.9,0.7,0.8].forEach(m=>L.statAdd(ist,67,m)); L.statAdd(ist,69,-1); L.statAdd(ist,69,-1);
ok(L.heatClass(ist[67])==='sharp' && L.heatClass(ist[69])===null && L.heatClass({n:3,sum:-2,sumSq:0})==='flat' && L.heatClass({n:3,sum:0.3,sumSq:0})==='clean', 'isi haritasi: tiz / pes / temiz, en az 3 olcum');

console.log('\n[18] Nota bolutleme, vibrato, glissando');
const fr = []; for(let t=0;t<500;t+=45) fr.push({t, written:67, comma:0.2}); fr.push({t:520, written:null});
for(let t=600;t<660;t+=45) fr.push({t, written:72, comma:22}); for(let t=700;t<1100;t+=45) fr.push({t, written:69, comma:9});
const seg = L.segmentNotes(fr, 120);
ok(seg.length===2 && seg[0].written===67 && seg[1].written===69 && Math.abs(seg[0].comma-0.2)<1e-9, 'kisa notalar atiliyor, sessizlik bolutu ayiriyor');
const vf = []; for(let t=0;t<1500;t+=45) vf.push({t, comma: 31 + 0.5*Math.sin(2*Math.PI*5.5*t/1000)});
const vb = L.vibrato(vf);
ok(vb && Math.abs(vb.rate-5.5)<0.8 && Math.abs(vb.depth-0.5)<0.15, 'vibrato 5,5 Hz ±0,5 koma bulunuyor', vb && (vb.rate.toFixed(2)+' Hz ±'+vb.depth.toFixed(2)));
const flatF = vf.map(f=>({t:f.t, comma:31+0.02*Math.random()}));
ok(L.vibrato(flatF)===null, 'duz seste vibrato yok');
const smooth = vf.map(f=>({t:f.t, comma:31 + 0.5*0.68*Math.sin(2*Math.PI*5.5*f.t/1000)}));   // 85 ms pencerenin yumusattigi
const vbw = L.vibrato(smooth, 4096/48000);
ok(vbw && Math.abs(vbw.depth-0.5)<0.12, 'olcum penceresinin yumusattigi derinlik duzeltiliyor', vbw && vbw.depth.toFixed(2));
const gl = []; for(let i=0;i<8;i++) gl.push({t:i*45, comma:9+i*3});
const jump = [{t:0,comma:9},{t:45,comma:9.2},{t:90,comma:31}];
ok(L.isGlide(gl) && !L.isGlide(jump.slice(0,2)) && !L.isGlide([{t:0,comma:9},{t:40,comma:20},{t:60,comma:31}]), 'surekli kayis glissando, ani atlama degil');

console.log('\n[19] Taklit ve eser takibi');
const scale = L.makamById('hicaz').asc;
let motifOk = true; for(let i=0;i<50;i++){ const m=L.makeMotif(scale, 6); if(m.length!==6 || !m.every(c=>scale.includes(c)) || m.some((c,k)=>k&&c===m[k-1])) motifOk=false; }
ok(motifOk, 'motif dizinin perdelerinden, ayni nota art arda yok');
const pm = L.parseMelody('Sol4 La4 Si♭4 do5, Fa#5 Mib4 xx');
ok(pm.notes.join(',')==='67,69,70,72,78,63' && pm.errors.join()==='xx', 'yazili nota adlari MIDIye ceviriliyor', pm.notes.join(','));
const exs = L.makamExercises(rast);
ok(exs.length===2 && exs[0].notes[0]===67 && exs[0].notes[7]===79 && exs[0].notes[exs[0].notes.length-1]===67 && exs[0].notes.length===15, 'Rast cikis-inis: Sol4…Sol5…Sol4');

console.log('\n[20] Ilerleme');
const today = new Date(2026, 9, 4);
const dk = d => L.dayKey(new Date(2026, 9, d));
ok(L.dayKey(today)==='2026-10-04', 'gun anahtari');
ok(L.streak({[dk(4)]:120,[dk(3)]:90,[dk(2)]:61,[dk(1)]:10}, today)===3, 'art arda 3 gun (1 dakikanin altindaki gun sayilmaz)');
ok(L.streak({[dk(3)]:90,[dk(2)]:90}, today)===2, 'bugun henuz calismadiysan seri dunden sayilir');
ok(L.streak({}, today)===0, 'bos seri');

console.log('\n[21] Calisma bolumu arayuzu');
ok(html.includes('<script src="learn.js">') && html.includes('<script src="practice.js">') && html.includes('id="practice"'), 'learn.js ve practice.js yukleniyor, calisma bolumu var');
ok(['vib','heatbtn','heatlg'].every(id => html.includes('id="'+id+'"')), 'vibrato, isi haritasi dugmesi ve aciklamasi var');
const sw = fs.readFileSync(require('path').join(__dirname,'sw.js'),'utf8');
ok(sw.includes('"learn.js"') && sw.includes('"practice.js"'), 'yeni dosyalar cevrimdisi onbellekte');

console.log(fail===0 ? '\nTUM TESTLER GECTI\n' : `\n${fail} TEST BASARISIZ\n`);
process.exit(fail?1:0);
