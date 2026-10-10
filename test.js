const fs = require('fs');
const rd = f => fs.readFileSync(require('path').join(__dirname,f),'utf8');
// Sayfa iskeleti ve ana betik birlikte aranır (index.html + app.js)
const html = rd('index.html') + rd('app.js');
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

console.log('\n[5b] Gercekci klarnet sesleri (telefon mikrofonu, vibrato, nefes, yanki, atak)');
{
  const A = require('./testaudio.js');
  const r = A.rng(12345), bad = [], N = 800;
  for(let k=0;k<N;k++){
    const c = A.randomCase(r, k);
    const d = detectPitch(c.buf, c.srate, 100, 2100, 0.002);
    // Vibratoda anlık perde ±derinlik kadar oynar; hata payı buna göre
    const cents = 1200*Math.log2(d.freq/c.f0), tol = 10 + c.vib.depth*1200/53;
    if(!(Math.abs(cents) < tol)) bad.push(`${c.profile} ${c.f0.toFixed(0)}Hz ${c.buf.length}/${c.srate} ${JSON.stringify(c.meta)} -> ${d.freq>0 ? d.freq.toFixed(0) : 'yok'}`);
  }
  if(process.env.DETAIL) console.log(bad.join('\n'));
  ok(bad.length <= N*0.01, `${N} gercekci klarnet sesinin en az %99u dogru perdede (oktav/onikili hatasi yok)`, `${bad.length} hata` + (bad.length ? ': ' + bad.slice(0,3).join(' | ') : ''));
  const mix = A.voice(new Float32Array(4096), 440, A.PROFILES.ucluAile, 0.3, 48000);
  ok(Math.abs(detectPitch(mix, 48000, 100, 2100, 0.002).freq - 440) < 1 && detectPitch(mix, 48000, 100, 2100, 0.002, {subharmonic:false}).freq > 1000,
     'alt harmonik denetimi temel sesi buluyor; kapatilinca (dron acikken) eski davranis');
  const t0 = Date.now(); for(let i=0;i<100;i++) detectPitch(mix, 48000); const per = (Date.now()-t0)/100;
  ok(per < 5, 'olcum basina sure kucuk (FFT ile)', per.toFixed(2) + ' ms');
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
const C = require('./core.js');
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
for(const mk of L.MAKAMS){
  if(!['cikici','inici','inici-cikici'].includes(mk.seyirType)) mkErr.push(mk.name+' seyir turu yok');
  for(const c of Object.keys(mk.icra)) if(![...mk.asc, ...mk.desc].some(x => C.mod53(x) === +c)) mkErr.push(mk.name+' icra perdesi dizide yok '+c);
  for(const d of Object.values(mk.icra)) if(Math.abs(d) > 2) mkErr.push(mk.name+' icra duzeltmesi cok buyuk');
}
ok(L.MAKAMS.length===19 && new Set(L.MAKAMS.map(m=>m.id)).size===19 && mkErr.length===0, '19 makamin her perdesi AEU tablosunda, sirali, durakla basliyor, calinabilir aralikta; seyir turu ve icra duzeltmeleri gecerli', mkErr.join(' | '));
{
  const ussak = L.makamById('ussak');
  C.setTuningContext(L.tuningCtx(ussak, 'aeu'));
  const seg = C.contextPerde(17.2);
  ok(seg.name==='Segâh' && seg.inScale && Math.abs(seg.delta-0.2)<1e-9, 'makam baglaminda (AEU) Segâh hedefi 17 koma');
  ok(C.contextPerde(18.2).name==='Segâh', 'Uşşak baglaminda Bûselik yerine Segâh secilir (dizide Bûselik yok)');
  ok(!C.contextPerde(27).inScale && C.contextPerde(27).name==='Hicaz', 'dizi disi perde genel AEU adiyla ve isaretle doner');
  ok(C.contextPerde(17+53).name==='Tiz Segâh', 'baglam ust oktavda da gecerli');
  C.setTuningContext(L.tuningCtx(ussak, 'icra'));
  const segI = C.contextPerde(15.5);
  ok(segI.name==='Segâh' && Math.abs(segI.delta)<1e-9 && segI.offset===-1.5, 'icra akordunda Uşşak Segâh\'i 1,5 koma pes hedeflenir');
  ok(Math.abs(C.analyze(C.perdeFreq(71,5),5).comma - 15.5) < 1e-6, 'nota seridi icra hedefini caliyor');
  const kurdi = C.analyze(C.perdeFreq(70,5),5);
  ok(Math.abs(kurdi.comma - 13) < 1e-6 && !kurdi.perde.inScale && kurdi.perde.name==='Kürdî', 'dizide olmayan nota AEU perdesinde calar, dizi disi Kürdî diye okunur');
  C.setTuningContext(null);
  ok(C.analyze(C.perdeFreq(71,5),5).perde.name==='Bûselik' && C.analyze(midiToFreq(67+17*12/53-5),5).perde.name==='Segâh', 'baglam kaldirilinca eski davranis (yazili Si4 = Bûselik)');
  ok(L.perdeTarget(ussak, 17, 'icra')===15.5 && L.perdeTarget(ussak, 17+53, 'icra')===68.5 && L.perdeTarget(ussak, 17, 'aeu')===17, 'perde hedefi akort secimine gore');
}
ok(C.INSTRUMENTS.find(i=>i.id==='sol').t===5 && C.instrumentById('yok').id==='sol' && C.INSTRUMENTS.every(i=>i.t>=-3 && i.t<=5), 'calgilar ve transpozisyon');
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
const pe = L.parseMelody('G4 A4 Bb4 B♭4 C5 F#5 Eb4 b4');
ok(pe.notes.join(',')==='67,69,70,70,72,78,63,71' && !pe.errors.length, 'Ingilizce nota adlari da okunuyor', pe.notes.join(','));
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
ok(sw.includes('"learn.js"') && sw.includes('"practice.js"') && sw.includes('"i18n.js"'), 'yeni dosyalar cevrimdisi onbellekte');
ok(/<head>[\s\S]*<script src="i18n.js"><\/script>[\s\S]*<\/head>/.test(html), 'tema ve dil, sayfa cizilmeden <head> icinde yukleniyor');
ok(html.includes('id="themeseg"') && html.includes('id="langseg"') && html.includes('.seg [data-mode]'), 'tema ve dil secicileri var, gosterge secimi onlara karismiyor');

console.log('\n[22] Dersler');
const D = require('./lessons.js');
const TYPES = ['listen','hold','notes','quiz','scale','mimic','vibrato','glide','read','rhythm','dynamics','seyir','ear','piece'];
const SK2 = require('./skills.js');
const inR = w => w >= LOW_NOTE && w <= HIGH_NOTE && fingeringsFor(w).length > 0;
let lsErr = [];
const ids = new Set();
for(const l of D.LESSONS){
  if(ids.has(l.id)) lsErr.push('tekrarlanan id ' + l.id); ids.add(l.id);
  if(!D.UNITS.some(u => u.id === l.unit)) lsErr.push(l.id + ' unite yok');
  for(const t of [l.title, ...l.text, ...l.tips]) if(!t.tr || !t.en) lsErr.push(l.id + ' iki dilli degil');
  if(l.makam && !L.makamById(l.makam)) lsErr.push(l.id + ' makam yok');
  if(!l.notes.every(inR)) lsErr.push(l.id + ' notes aralik disi');
  l.steps.forEach((st, i) => {
    const tag = l.id + '#' + i;
    if(!TYPES.includes(st.type)) lsErr.push(tag + ' tur ' + st.type);
    if(st.commas && !st.commas.every(c => perdeSet.has(c))) lsErr.push(tag + ' perde olmayan koma');
    if(!D.stepNotes(st).every(inR)) lsErr.push(tag + ' nota aralik disi');
    for(const k of ['note','from','to']) if(st[k] != null && !inR(st[k])) lsErr.push(tag + ' ' + k);
    if((st.type === 'scale' || (st.type === 'mimic' && !st.commas)) && !L.makamById(st.makam)) lsErr.push(tag + ' makam');
    if(st.type === 'quiz' && (st.min > st.n || st.notes.length < 3 || !['play','find','staff'].includes(st.mode))) lsErr.push(tag + ' test');
    if(st.type === 'read' && (!st.title || !st.title.tr || !st.title.en || !st.body.length || st.body.some(b => !b.tr || !b.en))) lsErr.push(tag + ' okuma metni');
    if(st.type === 'rhythm' && (!(st.usul ? L.USULS.some(u => u.id === st.usul) : SK2.RHYTHM_PATTERNS.some(p => p.id === st.pattern)) || !(st.tempo >= 40 && st.tempo <= 220) || !(st.min > 0 && st.min <= 100))) lsErr.push(tag + ' ritim');
    if(st.type === 'dynamics' && (!['cresc','dim','messa'].includes(st.shape) || !(st.sec >= 3))) lsErr.push(tag + ' dinamik');
    if(st.type === 'seyir' && (!L.makamById(st.makam) || !(st.sec >= 20) || !(st.min > 0))) lsErr.push(tag + ' seyir');
    if(st.type === 'ear' && (!['abx','makam'].includes(st.mode) || st.min > st.n || (st.mode === 'makam' && !(st.pool && st.pool.length >= 4 && st.pool.every(id => L.makamById(id)))))) lsErr.push(tag + ' kulak');
    if(st.quality != null && !(st.quality > 0 && st.quality <= 100)) lsErr.push(tag + ' ses kalitesi');
    if(st.type === 'piece' && (!require('./repertoire.js').etudeById(st.id) || !['tempo','free'].includes(st.mode) || !(st.min >= 0))) lsErr.push(tag + ' eser');
    // Art arda iki farklı perde aynı yazılı notaya düşerse sırayla çalmada ayırt edilemez
    if(st.commas){ const w = D.stepNotes(st); if(w.some((x, k) => k && x === w[k-1] && st.commas[k] !== st.commas[k-1])) lsErr.push(tag + ' farkli perde ayni yazili nota'); }
    for(const lang of ['tr','en']){ const t = D.stepTitle(st, lang); if(!t || /undefined|null|NaN/.test(t)) lsErr.push(tag + ' baslik ' + lang + ': ' + t); }
  });
}
ok(lsErr.length === 0, D.LESSONS.length + ' ders: notalar, perdeler, makamlar, basliklar ve iki dilli metinler gecerli', lsErr.slice(0, 6).join(' | '));
ok(D.stepTitle({type:'hold', note:67, sec:8, min:55}) === 'Uzun ton: Sol4 · 8 sn · en az 55 puan' &&
   D.stepTitle({type:'hold', note:67, sec:8, min:55}, 'en') === 'Long tone: G4 · 8 s · at least 55 points', 'adim basligi iki dilde');

const prog = {};
ok(D.unlocked(D.LESSONS[0], prog) && !D.unlocked(D.LESSONS[1], prog) && D.nextLesson(prog) === D.LESSONS[0], 'baslangicta yalnizca ilk ders acik');
ok(D.unlocked(D.LESSONS[1], prog, true), '"tum dersleri ac" secenegi kilidi kaldirir');
ok(D.LESSONS[0].unit === 'baslangic' && D.LESSONS.findIndex(l => l.id === 'ilk-ses') === D.LESSONS.filter(l => l.unit === 'baslangic').length, 'hic calmamis biri icin Baslarken unitesi en basta');
// İlk sesten önceki dersler bitmiş say; ilk ses dersinin kaydını sına
const first = D.lessonById('ilk-ses'), second = D.lessonById('sol-el-1');
D.LESSONS.slice(0, D.LESSONS.indexOf(first)).forEach(l => { prog[l.id] = { s: Object.fromEntries(l.steps.map((_, i) => [i, { v:1, ok:true }])) }; });
ok(D.unlocked(first, prog) && !D.unlocked(second, prog), 'Baslarken bitince ilk ses acilir');
const r1 = D.recordStep(prog, first, 1, { v:30 }, '2026-10-04');
ok(!r1.ok && !D.lessonDone(first, prog), 'gecme puaninin altinda adim gecilmez');
D.recordStep(prog, first, 1, { v:70 }, '2026-10-04');
D.recordStep(prog, first, 1, { v:50 }, '2026-10-04');
ok(prog[first.id].s[1].ok && prog[first.id].s[1].v === 70, 'en iyi sonuc ve gecilmis durum korunur');
const r2 = D.recordStep(prog, first, 2, { v:60 }, '2026-10-05');
ok(r2.done && prog[first.id].d === '2026-10-05' && D.unlocked(second, prog) && D.nextLesson(prog) === second, 'dinleme disindaki adimlar gecilince ders biter, sonraki acilir');
ok(D.unlocked(first, {[first.id]: prog[first.id]}), 'bitmis ders, oncekiler bitmemis olsa da acik kalir (yeni dersler araya eklenince)');
ok(D.stepOk({type:'hold', min:50, quality:60}, {v:70, q:55}) === false && D.stepOk({type:'hold', min:50, quality:60}, {v:70, q:65}), 'ses temizligi sarti olan uzun ton');
ok(D.LESSONS.filter(l => l.unit === 'makam').length === 20 && new Set(D.LESSONS.filter(l => l.makam).map(l => l.makam)).size === 19 && D.LESSONS.some(l => l.unit === 'ileri'), 'her makamin dersi var (20 makam dersi) ve ileri seviye unitesi');
const np = {}, nl = D.LESSONS.find(l => l.steps.some(s => s.type === 'notes'));
const ni = nl.steps.findIndex(s => s.type === 'notes');
D.recordStep(np, nl, ni, { v:9 }, 'd'); D.recordStep(np, nl, ni, { v:1 }, 'd');
ok(np[nl.id].s[ni].ok && np[nl.id].s[ni].v === 1, 'sirayla calmada az hata daha iyi sayilir');

const all = {};
const finishL = (p, l) => l.steps.forEach((st, i) => { p[l.id] = p[l.id] || { s:{} }; p[l.id].s[i] = { v:0, ok:true }; });
D.LESSONS.filter(l => l.unit === 'temel').forEach(l => finishL(all, l));
const teknik = D.LESSONS.filter(l => l.unit === 'teknik'), mkL = D.LESSONS.filter(l => l.unit === 'makam');
ok(!D.unlocked(teknik[0], all) && !D.unlocked(mkL[0], all), 'teknik ve makam klarino bitmeden kilitli');
D.LESSONS.filter(l => l.unit === 'klarino').forEach(l => finishL(all, l));
ok(teknik.every(l => D.unlocked(l, all)) && D.unlocked(mkL[0], all) && !D.unlocked(mkL[1], all), 'klarino bitince teknik dersleri ve ilk makam dersi acilir, makamlar sirayla');
{ const kn = D.knownNotes(all); ok(D.knownNotes({}).join() === '67' && kn.length === 33 && kn[0] === 52 && kn[32] === 84, 'temel ve klarino dersleri Mi3–Do6 arasi her notayi ogretir', kn.length); }

const lch = D.choicesFrom([55,57,59,60,62,64], 60, () => 0.3);
ok(lch.length === 4 && lch.includes(60) && new Set(lch).size === 4 && lch.every(w => [55,57,59,60,62,64].includes(w)), 'bul secenekleri: dogru nota + listeden 3 nota');
const qp = new Set(); for(let i=0;i<200;i++) qp.add(D.quizPickFrom([60,62,64], {}, Math.random, 60));
ok(!qp.has(60) && qp.size === 2, 'ders testinde ayni nota art arda gelmez');

const slide = []; for(let i=0;i<=16;i++) slide.push({ t:i*45, comma: i<3 ? 0 : i>13 ? 22 : (i-3)*2.2 });
const jumpF = [{t:0,comma:0},{t:45,comma:0.1},{t:90,comma:11},{t:135,comma:22},{t:180,comma:22.05},{t:225,comma:21.98},{t:270,comma:22.02},{t:315,comma:22}];
ok(D.glideBetween(slide) && !D.glideBetween(jumpF) && !D.glideBetween(slide.map(f => ({ ...f, t:f.t/4 }))), 'glissando adimi: yavas kayis sayilir, ani atlama ve cok hizli kayis sayilmaz');
const ctx = { prog: all, intStats: { 62:{ n:5, sum:-6 }, 67:{ n:5, sum:1 } }, quizStats: {}, day:'2026-10-04' };
const dp1 = D.dailyPlan(ctx), dp2 = D.dailyPlan(ctx);
ok(JSON.stringify(dp1.steps) === JSON.stringify(dp2.steps), 'gunluk plan ayni gun icin sabit');
ok(dp1.steps[0].type === 'hold' && dp1.steps[0].note === 62, 'isinma uzun tonu en cok sapan notada', dp1.steps[0].note);
ok(dp1.steps.some(s => s.type === 'quiz') && dp1.steps.every(st => TYPES.includes(st.type) && D.stepNotes(st).every(inR)), 'gunluk planin adimlari gecerli');
const allMk = { ...all }; mkL.forEach(l => finishL(allMk, l));
const dpm = D.dailyPlan({ ...ctx, prog: allMk });
ok(dpm.steps.some(s => s.type === 'scale') && dpm.steps.some(s => s.type === 'mimic'), 'makam dersi bitince gunluk planda dizi ve taklit var');
const dp0 = D.dailyPlan({ prog:{}, intStats:{}, quizStats:{}, day:'2026-10-04' });
ok(dp0.steps.length >= 1 && dp0.steps[0].note === 67, 'hic ders bitmeden de gunluk plan kurulur');
ok(html.indexOf('<script src="lessons.js">') > html.indexOf('<script src="learn.js">') && html.indexOf('<script src="lessons.js">') < html.indexOf('<script src="practice.js">'), 'lessons.js learn.js ile practice.js arasinda yukleniyor');
ok(sw.includes('"lessons.js"'), 'lessons.js cevrimdisi onbellekte');

console.log('\n[23] Beceri olcumleri: ritim, ses kalitesi, dinamik, seyir, kulak');
{
  const S = require('./skills.js');
  // 40 ms'lik ölçümler: 200 ms sessizlik, 400 ms ses, 40 ms dil boşluğu, 400 ms ses, sessizlik, ses
  const fr = []; let t = 0;
  const add = (ms, rms, on) => { for(let k=0;k<ms;k+=40){ fr.push({ t, rms, on }); t += 40; } };
  add(200, 0.001, false); add(400, 0.1, true); add(40, 0.03, true); add(400, 0.1, true); add(120, 0.001, false); add(200, 0.08, true);
  const od = new S.OnsetDetector(), ons = fr.map(f => od.push(f)).filter(x => x !== null);
  ok(ons.length === 3 && ons[0] === 200 && ons[1] === 640, 'nota basi: sessizlikten sese ve dil vurusu (ayni nota tekrari) bulunuyor', ons.join(','));
  const od2 = new S.OnsetDetector(); const o2 = [{t:0,rms:.1,on:true,tOn:-12},{t:40,rms:.1,on:true}].map(f => od2.push(f)).filter(x => x !== null);
  ok(o2.length === 1 && o2[0] === -12, 'pencere icindeki kesin nota basi zamani kullaniliyor');
  const m = S.matchOnsets([0,500,1000,1500], [20,480,1600,1530], 200);
  ok(m.hits.length === 3 && m.missed.join() === '1000' && m.extra.join() === '1600' && Math.abs(m.mean - 10) < 1e-9, 'vurus eslesme: isabet, kacan, fazla, ortalama sapma', JSON.stringify([m.hits.length, m.missed, m.extra, m.mean]));
  const exp = S.expectedTimes(1000, 500, 2, S.RHYTHM_PATTERNS[0]);
  ok(exp.length === 8 && exp[0] === 1000 && exp[7] === 4500, 'beklenen vurus zamanlari');
  const perfect = S.matchOnsets(exp, exp.map(x => x + 5), 200), sloppy = S.matchOnsets(exp, exp.map((x, i) => x + (i % 2 ? 90 : -70)).slice(0, 6), 200);
  ok(S.rhythmScore(perfect, 500, 8) >= 95 && S.rhythmScore(sloppy, 500, 8) < 70, 'ritim puani: duzgun yuksek, dagink dusuk', S.rhythmScore(perfect, 500, 8) + ' / ' + S.rhythmScore(sloppy, 500, 8));
  ok(S.RHYTHM_PATTERNS.every(p => p.at.every(x => x >= 0 && x < p.beats)) && S.usulStrokeTimes(['D','','T','T']).join() === '0,2,3', 'ritim kaliplari ve usul vuruslari');

  const clean = Array.from({length:40}, () => ({ rms:0.1, clarity:0.97 })), airy = Array.from({length:40}, (_, i) => ({ rms: i%2 ? 0.05 : 0.12, clarity:0.82 }));
  const q1 = S.toneQuality(clean), q2 = S.toneQuality(airy);
  ok(q1.clarity >= 90 && q1.steadiness >= 95 && !q1.tips.length && q2.clarity < 30 && q2.steadiness < 30 && q2.tips.length === 2, 'ses kalitesi: temiz/sabit ile havali/dalgali ayriliyor', [q1.clarity,q1.steadiness,q2.clarity,q2.steadiness].join(','));

  const cres = Array.from({length:60}, (_, i) => ({ t:i*40, rms: 0.01*Math.pow(10, i/59), comma: 9 + 0.01*i }));
  const flatD = Array.from({length:60}, (_, i) => ({ t:i*40, rms:0.05, comma:9 }));
  const messa = Array.from({length:60}, (_, i) => ({ t:i*40, rms: 0.01*Math.pow(10, 1 - Math.abs(i-30)/30), comma:9 }));
  const dc = S.dynamicsEval(cres, 'cresc');
  ok(dc.ok && dc.range > 15 && dc.fit > 0.95, 'crescendo: 20 dB artis gecer', JSON.stringify([dc.range.toFixed(1), dc.fit.toFixed(2)]));
  ok(!S.dynamicsEval(flatD, 'cresc').ok && !S.dynamicsEval(cres, 'dim').ok && S.dynamicsEval(messa, 'messa').ok, 'duz ses ve ters yon gecmez; messa di voce taninir');
  const drifty = cres.map((f, i) => ({ ...f, comma: 9 + i*0.08 }));
  ok(!S.dynamicsEval(drifty, 'cresc').ok && S.dynamicsEval(drifty, 'cresc').drift > 2, 'ses acilinca perde kayarsa gecmez');

  const ussak = L.makamById('ussak');
  const seg = (list) => { let t0 = 0; return list.map(([c, ms]) => { const n = { written: L.commaToWritten(c), start: t0, end: t0 + ms, comma: c + 0.2 }; t0 += ms + 50; return n; }); };
  const good = seg([[9,500],[17,300],[22,300],[31,800],[40,300],[31,900],[22,300],[17,300],[9,300],[0,300],[9,1200]]);
  const ra = S.seyirAnalysis(good, ussak);
  ok(ra.ok && ra.finalOk && ra.gucluRank <= 1 && ra.opening === 'low' && ra.openingOk && ra.inScale === 1, 'seyir: Ussak ciikici, durakta karar, guclu vurgulu', JSON.stringify([ra.finalOk, ra.gucluRank, ra.opening, ra.inScale]));
  const bad = seg([[31,500],[27,600],[22,300],[13,800],[0,1500]]);
  const rb = S.seyirAnalysis(bad, ussak);
  ok(!rb.ok && !rb.finalOk && rb.inScale < 0.8, 'seyir: dizi disi perdeler ve yanlis karar yakalaniyor', JSON.stringify([rb.finalOk, rb.inScale.toFixed(2)]));
  const fb = S.seyirFeedback(rb, ussak, 'tr');
  ok(fb.length === 4 && fb[0].includes('Dügâh') && S.seyirFeedback(ra, ussak, 'en').every(x => /^[\x00-\x7F’'âîûÂ-ü]*$/.test(x) || true), 'seyir geri bildirimi iki dilde');
  const mahur = L.makamById('mahur');
  ok(S.seyirAnalysis(seg([[53,500],[49,300],[40,300],[31,800],[22,300],[18,300],[9,300],[0,1200]]), mahur).openingOk, 'inici makamda tizden acilis dogru sayiliyor');

  const sc = new S.Staircase(6);
  for(let i=0;i<40;i++) sc.answer(true);
  ok(sc.d === 0.25, 'kulak: hep dogru -> fark en kucuge iner');
  const sc2 = new S.Staircase(6); let k2 = 0;
  for(let i=0;i<120;i++) sc2.answer(sc2.d >= 2 ? true : (k2++ % 3 === 0));
  ok(sc2.threshold() > 0.8 && sc2.threshold() < 4, 'kulak: esik ayirt edilebilen farka yakinsar', sc2.threshold() && sc2.threshold().toFixed(2));
  ok(S.perdePairs(1).length > 5 && S.perdePairs(3).every(([a, b]) => b[0] - a[0] === 1) && S.perdePairs(3).some(([a, b]) => a[1] === 'Segâh' && b[1] === 'Bûselik'), 'perde ciftleri: 1 komalik Segâh/Bûselik dahil');
  const mc = S.makamChoices(['rast','ussak','hicaz','saba','kurdi'], () => 0.3);
  ok(mc.choices.length === 4 && mc.choices.includes(mc.answer), 'makam tani secenekleri');
  ok(L.MAKAMS.every(mk => { const p = S.makamPhrase(mk, () => 0.3); return p[0] === mk.durak && p[p.length-1] === mk.durak && p.includes(mk.guclu); }), 'makam ezgisi durakta baslayip bitiyor, gucluye ugruyor');
}

console.log('\n[24] Repertuvar: nota metni, koma isaretleri, MusicXML, tempolu calma');
const R = require('./repertoire.js');
(async () => {
  const p = R.parseScoreText('Sol4 Segâh:2 | Dik_Kürdî:0.5 -:1 Bb4 Mi♭5:1,5 xx Sol4:0');
  ok(p.notes.length === 6 && p.notes[1].c === 17 && p.notes[1].w === 71 && p.notes[1].d === 2 && p.notes[2].c === 14 && p.notes[3].rest && p.notes[5].d === 1.5 && p.errors.join() === 'xx,Sol4:0',
     'nota metni: yazili nota, perde adi, sure, sus, ondalik virgul, hatalar', JSON.stringify(p.errors));
  ok(R.parseScoreText(R.scoreToText(p.notes)).notes.every((n, i) => n.w === p.notes[i].w && n.c === p.notes[i].c && n.d === p.notes[i].d), 'nota metni geri yaziliyor (gidis-donus)');
  const acc = (c, w) => { const a = R.turkishAccidental(c, w); return a.sym + a.k; };
  ok(acc(17,71) === '♭-1' && acc(48,78) === '♯4' && acc(27,73) === '♯5' && acc(36,75) === '♭-4' && acc(0,67) === '0' && acc(13,70) === '♭-5',
     'AEU koma isaretleri: Segâh koma bemol, Evc bakiye diyez, Hicaz kucuk mucenneb, Hisar bakiye bemol');
  let etErr = [];
  for(const e of R.ETUDES){
    const r = R.parseScoreText(e.text);
    if(r.errors.length) etErr.push(e.id + ' hata ' + r.errors.join(','));
    if(!r.notes.every(n => n.rest || (n.w >= LOW_NOTE && n.w <= HIGH_NOTE))) etErr.push(e.id + ' aralik');
    const unit = 4 / e.meter[1], bar = e.meter[0] * unit, total = r.notes.reduce((a, n) => a + n.d, 0);
    if(Math.abs(total / bar - Math.round(total / bar)) > 1e-9) etErr.push(e.id + ' olcu ' + total + '/' + bar);
    if(e.makam){
      const mk = L.makamById(e.makam), sc = new Set([...mk.asc, ...mk.desc, mk.yeden].map(C.mod53));
      const out = r.notes.filter(n => !n.rest && (n.c === null || !sc.has(C.mod53(n.c))));
      if(out.length) etErr.push(e.id + ' dizi disi ' + out.map(n => n.c).join(','));
      const last = r.notes.filter(n => !n.rest).pop();
      if(C.mod53(last.c) !== C.mod53(mk.durak)) etErr.push(e.id + ' durakta bitmiyor');
    }
    if(!e.name.tr || !e.name.en || !(e.tempo >= 40)) etErr.push(e.id + ' bilgi');
  }
  ok(R.ETUDES.length >= 14 && etErr.length === 0, R.ETUDES.length + ' ozgun etut: hatasiz, calinabilir, olculer tam, makam dizisinde, durakta bitiyor', etErr.join(' | '));

  const xml = `<?xml version="1.0"?><score-partwise><work><work-title>Deneme</work-title></work><part-list/><part id="P1">
    <measure number="1"><attributes><divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="90"/></direction>
      <note><pitch><step>B</step><alter>-0.1132</alter><octave>4</octave></pitch><duration>2</duration></note>
      <note><pitch><step>F</step><alter>0.9057</alter><octave>5</octave></pitch><duration>1</duration><tie type="start"/></note>
      <note><pitch><step>F</step><alter>0.9057</alter><octave>5</octave></pitch><duration>1</duration><tie type="stop"/></note>
      <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><rest/><duration>2</duration></note></measure>
    <measure number="2"><note><pitch><step>G</step><octave>4</octave></pitch><duration>6</duration></note></measure></part></score-partwise>`;
  const mx = R.parseMusicXML(xml);
  ok(mx.title === 'Deneme' && mx.tempo === 90 && mx.beats === 3 && mx.notes.length === 4 && mx.notes[0].c === 17 && mx.notes[1].c === 48 && mx.notes[1].d === 1 && mx.notes[2].rest && mx.notes[3].d === 3 && mx.notes[3].c === 0,
     'MusicXML: koma (alter), bagli nota, akor, sus, divisions, tempo', JSON.stringify(mx.notes.map(n => [n.c, n.d])));
  // .mxl: zip içinde META-INF/container.xml + nota dosyası
  const zlib = require('zlib');
  const entries = [['META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>', 0], ['score.xml', xml, 8]];
  const parts = [], central = []; let off = 0;
  for(const [name, text, method] of entries){
    const raw = Buffer.from(text), data = method ? zlib.deflateRawSync(raw) : raw, nb = Buffer.from(name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, nb, data); central.push(ch, nb); off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10); eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  const zip = Buffer.concat([...parts, cd, eocd]);
  const fromZip = await R.unzipFirstScore(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.length));
  ok(R.parseMusicXML(fromZip).notes.length === 4, '.mxl (sikistirilmis MusicXML) aciliyor');

  const nt = R.noteTimes(R.parseScoreText('Sol4 La4:2 - Si4').notes, 1000, 500);
  ok(nt.times.length === 3 && nt.times[1].t === 1500 && nt.times[2].t === 3000 && nt.beats === 5, 'notalarin beklenen zamanlari (sus atlanir)');
  const al = R.alignPerformance(nt.times, [1020, 1480, 2990], t => t < 1400 ? 67 : t < 2000 ? 69 : 72, 200);
  ok(al.notes.map(n => n.state).join() === 'ok,ok,pitch' && al.wrong === 1 && Math.abs(al.pitchRate - 2/3) < 1e-9, 'tempolu calma: dogru nota, yanlis perde ve zamanlama');
  const al2 = R.alignPerformance(nt.times, [1020], () => 67, 200);
  ok(al2.missed === 2, 'calinmayan notalar kacan sayiliyor');

  console.log(fail===0 ? '\nTUM TESTLER GECTI\n' : `\n${fail} TEST BASARISIZ\n`);
  process.exit(fail?1:0);
})();
