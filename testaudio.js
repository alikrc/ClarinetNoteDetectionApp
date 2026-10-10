// Testler için gerçekçi sentetik klarnet sesleri: tını profilleri, telefon mikrofonu (yüksek geçiren),
// vibrato, nefes gürültüsü, önceki notanın yankısı ve atak. Yalnızca Node'da (test.js) kullanılır.
const { midiToFreq, LOW_NOTE, HIGH_NOTE } = require("./core.js");

// Tekrarlanabilir rastgele sayı üreteci
function rng(seed){ let s = seed; return () => (s = (s*16807) % 2147483647) / 2147483647; }

// Harmonik genlikleri (1., 2., 3. …): klarnette tek harmonikler baskındır.
// zayifTemel: telefon mikrofonu pes sesi kırpmış; ucluAile: 3. harmonik ailesi baskın (onikili yanılgısını kışkırtır)
const PROFILES = {
  chalumeau:[1,0.05,0.7,0.04,0.45,0.03,0.25,0.02,0.12],
  klarino:[1,0.2,0.35,0.15,0.2,0.1,0.08],
  zayifTemel:[0.12,0.04,1,0.05,0.55,0.03,0.3],
  ucluAile:[0.1,0,1,0,0,0.5,0,0,0.3]
};

// 2. dereceden yüksek geçiren süzgeç (RBJ biquad), yerinde
function highpass(x, fc, srate){
  const w = 2*Math.PI*fc/srate, al = Math.sin(w)/(2*Math.SQRT1_2), c = Math.cos(w), a0 = 1+al;
  const b0 = (1+c)/2/a0, b1 = -(1+c)/a0, b2 = b0, a1 = -2*c/a0, a2 = (1-al)/a0;
  let x1=0, x2=0, y1=0, y2=0;
  for(let i=0;i<x.length;i++){ const y = b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2; x2=x1; x1=x[i]; y2=y1; y1=y; x[i]=y; }
  return x;
}

// out'a f0 sesini ekler. vib: {rate Hz, depth koma}; from: başlangıç örneği; decay: sönüm (örnek)
function voice(out, f0, amps, a, srate, vib = {rate:0, depth:0}, from = 0, decay = 0){
  let ph = 0;
  for(let i=from;i<out.length;i++){
    const f = f0 * Math.pow(2, vib.depth/53*Math.sin(2*Math.PI*vib.rate*i/srate));
    ph += 2*Math.PI*f/srate;
    const env = (decay ? Math.exp(-(i-from)/decay) : 1) * Math.min(1, (i-from)/(0.01*srate));
    let v = 0; for(let k=0;k<amps.length;k++) v += amps[k]*Math.sin((k+1)*ph + k*0.7);
    out[i] += a*env*v;
  }
  return out;
}

// Rastgele bir ölçüm penceresi: { buf, srate, f0, written, profile, vib, meta }
function randomCase(r, k){
  const names = Object.keys(PROFILES);
  const srate = r() < 0.5 ? 44100 : 48000;
  const n = r() < 0.5 ? 2048 : 4096;
  const written = LOW_NOTE + Math.floor(r()*(HIGH_NOTE-LOW_NOTE+1));
  const f0 = midiToFreq(written - 5) * Math.pow(2, (r()-0.5)*2/53);   // perdeden ±1 koma
  const profile = names[k % names.length];
  const buf = new Float32Array(n);
  const vib = r() < 0.4 ? { rate: 4 + r()*3, depth: 0.3 + r()*0.6 } : { rate:0, depth:0 };
  const meta = {};
  if(r() < 0.4){                                  // önceki notanın sönen yankısı
    meta.echo = (Math.floor(r()*9)-4) || 7;
    voice(buf, f0*Math.pow(2, meta.echo/12), PROFILES.chalumeau, 0.03+r()*0.05, srate, undefined, 0, 0.02*srate);
  }
  meta.attack = r() < 0.3;
  voice(buf, f0, PROFILES[profile], 0.3, srate, vib, meta.attack ? Math.floor(n*0.15) : 0);
  meta.breath = r()*0.08;
  for(let i=0;i<n;i++) buf[i] += meta.breath*(r()-0.5);
  if(r() < 0.6){ meta.hp = Math.round(150 + r()*150); highpass(buf, meta.hp, srate); }
  return { buf, srate, f0, written, profile, vib, meta };
}

module.exports = { rng, PROFILES, highpass, voice, randomCase };
