const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(require('path').join(__dirname,'index.html'),'utf8');
const core = html.split('// ===== CORE START =====')[1].split('// ===== CORE END =====')[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(core + '\nthis.API={analyze,parseFingering,detectPitch,midiToFreq,FINGERINGS,PERDES,nearestPerde};', ctx);
const { analyze, parseFingering, detectPitch, midiToFreq, FINGERINGS } = ctx.API;

let fail = 0;
const ok = (c,msg,extra='') => { console.log((c?'  OK  ':'  FAIL') + ' ' + msg + (extra?'   '+extra:'')); if(!c) fail++; };

console.log('\n[1] Tum parmak kodlari parse ediliyor mu (3+3 delik, bilinen perdeler)');
const KNOWN_LH_PRE=['A','G#'], KNOWN_LH_POST=['F','Eb','E','F#','G#','Bb','C#'];
const KNOWN_RH_PRE=['3','4'], KNOWN_RH_POST=['F','G#','Bb'];
let parseErr=0, keyErr=[];
for (const [m,code] of Object.entries(FINGERINGS)){
  try{
    const f = parseFingering(code);
    for(const k of f.keys){
      const list = k.hand==='lh' ? (k.pre?KNOWN_LH_PRE:KNOWN_LH_POST) : (k.pre?KNOWN_RH_PRE:KNOWN_RH_POST);
      if(!list.includes(k.name)) keyErr.push(m+' '+code+' -> '+k.hand+(k.pre?'/pre':'/post')+' '+k.name);
    }
  }catch(e){ parseErr++; console.log('   parse hatasi:', m, code, e.message); }
}
ok(parseErr===0, '33 kodun tamami parse edildi');
ok(keyErr.length===0, 'tum perde adlari diyagramda tanimli', keyErr.join(' | '));

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
for(const f0 of [123.47, 146.83, 220.0, 293.66, 440.0, 587.33, 783.99]){
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

console.log('\n[7] Aralik disi');
ok(analyze(midiToFreq(90),5).inRange===false, 'cok tiz ses -> aralik disi');

console.log(fail===0 ? '\nTUM TESTLER GECTI\n' : `\n${fail} TEST BASARISIZ\n`);
process.exit(fail?1:0);
