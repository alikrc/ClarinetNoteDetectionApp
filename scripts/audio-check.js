// Gerçek klarnet kayıtlarıyla perde bulucu denetimi.
// Her kayıt uygulamadaki zincirle (40 ms adım, tizde 2048 / peste 4096 örneklik pencere, 5 ölçümlük medyan,
// 3 ölçümlük kararlılaştırıcı) analiz edilir ve beklenen notayla karşılaştırılır. WAV ve AIFF okunur, alt klasörler taranır.
//
// İki tür dosya:
// 1. Tek nota: "<yazılı nota>_<açıklama>.wav", örn. "La4_uzun-ton.wav", "Segâh_vibrato.wav". Perde adı verilirse
//    koma sapması o perdeye göre ölçülür. Nota adı yoksa (örn. "taksim.wav") yalnızca algılanan notaların dökümü verilir.
// 2. Kromatik dizi (Iowa Üniversitesi adlandırması): "<ad>.<dinamik>.<ilk><son>.aiff", örn. "BbClar.mf.C4B4.aiff".
//    Notalar sessizliklerden ayrılır; i. nota ilk notadan i yarım ses yukarıdadır. Adlar duyulan sestir.
//
// Kullanım: npm run audio-check -- [klasör] [--a4 440] [--inst sol] [--quiet]   (varsayılan: testdata/)
const fs = require("fs");
const path = require("path");
const C = require("../core.js");
const R = require("../repertoire.js");

// ---- Ses dosyaları ----
// 16/24/32 bit PCM ya da 32 bit float WAV → mono Float32Array
function readWav(b){
  let p = 12, fmt = null, data = null;
  while(p + 8 <= b.length){
    const id = b.toString("ascii", p, p+4), size = b.readUInt32LE(p+4);
    if(id === "fmt ") fmt = { format: b.readUInt16LE(p+8), ch: b.readUInt16LE(p+10), sr: b.readUInt32LE(p+12), bits: b.readUInt16LE(p+22) };
    if(id === "data") data = b.subarray(p+8, p+8+size);
    p += 8 + size + (size % 2);
  }
  if(!fmt || !data) throw new Error("fmt/data yok");
  const bytes = fmt.bits/8, n = Math.floor(data.length/(bytes*fmt.ch)), out = new Float32Array(n);
  for(let i=0;i<n;i++){
    let s = 0;
    for(let c=0;c<fmt.ch;c++){
      const o = (i*fmt.ch + c)*bytes;
      s += fmt.format === 3 ? data.readFloatLE(o) : bytes === 2 ? data.readInt16LE(o)/32768 : bytes === 3 ? data.readIntLE(o, 3)/8388608 : data.readInt32LE(o)/2147483648;
    }
    out[i] = s/fmt.ch;
  }
  return { x: out, sr: fmt.sr };
}
// AIFF (büyük endian PCM; örnekleme hızı 80 bitlik genişletilmiş kayan sayı)
function readAiff(b){
  let p = 12, comm = null, ssnd = null;
  while(p + 8 <= b.length){
    const id = b.toString("ascii", p, p+4), size = b.readUInt32BE(p+4);
    if(id === "COMM"){
      const ch = b.readUInt16BE(p+8), bits = b.readUInt16BE(p+14);
      const exp = b.readUInt16BE(p+16) & 0x7fff, hi = b.readUInt32BE(p+18), lo = b.readUInt32BE(p+22);
      const sr = (hi * 2**32 + lo) * 2**(exp - 16383 - 63);
      comm = { ch, bits, sr: Math.round(sr) };
    }
    if(id === "SSND"){ const off = b.readUInt32BE(p+8); ssnd = b.subarray(p + 16 + off, p + 8 + size); }
    p += 8 + size + (size % 2);
  }
  if(!comm || !ssnd) throw new Error("COMM/SSND yok");
  const bytes = comm.bits/8, n = Math.floor(ssnd.length/(bytes*comm.ch)), out = new Float32Array(n);
  for(let i=0;i<n;i++){
    let s = 0;
    for(let c=0;c<comm.ch;c++){
      const o = (i*comm.ch + c)*bytes;
      s += bytes === 2 ? ssnd.readInt16BE(o)/32768 : bytes === 3 ? ssnd.readIntBE(o, 3)/8388608 : ssnd.readInt32BE(o)/2147483648;
    }
    out[i] = s/comm.ch;
  }
  return { x: out, sr: comm.sr };
}
function readAudio(file){
  const b = fs.readFileSync(file), tag = b.toString("ascii", 0, 4), kind = b.toString("ascii", 8, 12);
  if(tag === "RIFF" && kind === "WAVE") return readWav(b);
  if(tag === "FORM" && (kind === "AIFF" || kind === "AIFC")) return readAiff(b);
  throw new Error("WAV ya da AIFF değil");
}

// ---- Uygulamadaki zincir ----
function chain(x, sr, T){
  const hop = Math.round(0.04*sr), frames = [], hist = [], stab = new C.NoteStabilizer(3), pr = C.pitchRange(T);
  let lastFreq = -1;
  for(let end = 4096; end <= x.length; end += hop){
    const win = lastFreq > 250 ? x.subarray(end - 2048, end) : x.subarray(end - 4096, end);
    const d = C.detectPitch(win, sr, pr.min, pr.max, 0.002);
    lastFreq = d.freq;
    if(d.freq <= 0){ stab.reset(); hist.length = 0; continue; }
    hist.push(d.freq); if(hist.length > 5) hist.shift();
    const med = [...hist].sort((a,b) => a-b)[Math.floor(hist.length/2)];
    const r = C.analyze(med, T);
    if(stab.push(C.noteKey(r))) frames.push({ t: end/sr, written: r.written, cents: r.cents, comma: r.comma });
  }
  return frames;
}

// Sessizliklerle ayrılmış notalar: 10 ms'lik RMS zarfı, en güçlü yerin −40 dB'si ya da gürültünün 4 katı eşik
function segments(x, sr){
  const hop = Math.round(0.01*sr), env = [];
  for(let i=0;i+hop<=x.length;i+=hop){ let s = 0; for(let k=0;k<hop;k++) s += x[i+k]*x[i+k]; env.push(Math.sqrt(s/hop)); }
  const sorted = [...env].sort((a,b) => a-b), noise = sorted[Math.floor(sorted.length*0.1)], top = sorted[Math.floor(sorted.length*0.995)];
  const thr = Math.max(top*0.01, noise*4);
  const segs = []; let start = -1, lastOn = -1;
  env.forEach((v, i) => {
    if(v >= thr){ if(start < 0) start = i; lastOn = i; }
    else if(start >= 0 && i - lastOn > 8){ segs.push([start, lastOn]); start = -1; }
  });
  if(start >= 0) segs.push([start, lastOn]);
  const rms = ([a, b]) => Math.sqrt(env.slice(a, b+1).reduce((t, v) => t + v*v, 0)/(b - a + 1));
  const long = segs.filter(([a, b]) => (b - a) >= 25);
  // Notalar birbirine yakın seviyededir; ortanca seviyenin %15'inden zayıf parçalar nota değildir
  const med = long.map(rms).sort((p, q) => p - q)[Math.floor(long.length/2)] || 0;
  return long.filter(sg => rms(sg) >= med*0.15).map(([a, b]) => x.subarray(a*hop, Math.min(x.length, (b+1)*hop)));
}

const NOTE_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function midiOf(tok){ const m = /^([A-G])(b|#)?(\d)$/.exec(tok); return m ? NOTE_PC[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + (+m[3] + 1)*12 : null; }
// "BbClar.mf.C4B4.aiff" → [60, 71]; "BbClar.mf.C7.aiff" → [96, 96]
function chromaticRange(name){
  const m = /\.([A-G][b#]?\d)([A-G][b#]?\d)?\.(aiff?|aifc|wav)$/i.exec(name);
  if(!m) return null;
  const a = midiOf(m[1]), b = m[2] ? midiOf(m[2]) : a;
  return a !== null && b !== null && b >= a ? [a, b] : null;
}
function expectedSingle(name){
  const tok = path.basename(name, path.extname(name)).split(/[_\s]/)[0];
  const r = R.parseScoreText(tok);
  return !r.errors.length && r.notes.length === 1 && !r.notes[0].rest ? r.notes[0] : null;
}
const nameOf = m => C.noteName(m).tr;

// ---- Bir dosyayı denetle ----
// Dönen: { file, kind, notes:[{ exp, frames, ok, rate, octave, twelfth, cents }], ... }
function checkFile(file, T){
  const { x, sr } = readAudio(file), base = path.basename(file);
  const range = chromaticRange(base);
  if(range){
    const segs = segments(x, sr), want = range[1] - range[0] + 1;
    const notes = segs.slice(0, want).map((seg, i) => {
      const exp = range[0] + i, fr = chain(seg, sr, 0);              // Iowa adları duyulan ses: transpozisyon 0
      const ok = fr.filter(f => f.written === exp);
      return { exp, n: fr.length, ok: ok.length, rate: fr.length ? ok.length/fr.length : 0,
               octave: fr.filter(f => f.written !== exp && (f.written - exp) % 12 === 0).length,
               twelfth: fr.filter(f => Math.abs(f.written - exp) === 19).length,
               other: [...new Set(fr.filter(f => f.written !== exp).map(f => f.written))],
               cents: ok.length ? ok.reduce((a, f) => a + f.cents, 0)/ok.length : null };
    });
    return { file: base, kind:"chromatic", sr, segs: segs.length, want, notes };
  }
  const fr = chain(x, sr, T), exp = expectedSingle(base);
  if(!exp) return { file: base, kind:"free", frames: fr };
  const ok = fr.filter(f => f.written === exp.w), target = exp.c !== null ? exp.c : (exp.w - 67)*53/12;
  return { file: base, kind:"single", notes:[{ exp: exp.w, n: fr.length, ok: ok.length, rate: fr.length ? ok.length/fr.length : 0,
    octave: fr.filter(f => f.written !== exp.w && (f.written - exp.w) % 12 === 0).length,
    twelfth: fr.filter(f => Math.abs(f.written - exp.w) === 19).length, other: [],
    comma: ok.length ? ok.reduce((a, f) => a + f.comma - target, 0)/ok.length : null }] };
}
function listFiles(dir){
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? listFiles(path.join(dir, e.name))
    : /\.(wav|aiff?|aifc)$/i.test(e.name) ? [path.join(dir, e.name)] : []).sort();
}

module.exports = { readAudio, chain, segments, chromaticRange, checkFile, listFiles };

if(require.main === module){
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i+1] : d; };
  const dir = args.find((a, i) => !a.startsWith("--") && !(args[i-1] || "").startsWith("--")) || path.join(__dirname, "..", "testdata");
  const quiet = args.includes("--quiet");
  C.setA4(+opt("--a4", 440));
  const T = C.instrumentById(opt("--inst", "sol")).t;
  if(!fs.existsSync(dir)){ console.log(`Klasör yok: ${dir}`); process.exit(0); }
  const files = listFiles(dir);
  if(!files.length){ console.log(`${dir} içinde ses dosyası yok.`); process.exit(0); }
  let notesOk = 0, notesN = 0, frOk = 0, frN = 0;
  const bad = [];
  for(const f of files){
    let r;
    try{ r = checkFile(f, T); }catch(e){ console.log(`  ?    ${path.relative(dir, f)}: ${e.message}`); continue; }
    const rel = path.relative(dir, f);
    if(r.kind === "free"){
      const seg = {}; r.frames.forEach(fr => { const k = nameOf(fr.written); seg[k] = (seg[k] || 0) + 1; });
      console.log(`  -    ${rel}: ${r.frames.length} ölçüm · ` + Object.entries(seg).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([k, n]) => `${k} ${Math.round(n/r.frames.length*100)}%`).join(", "));
      continue;
    }
    for(const n of r.notes){
      notesN++; frN += n.n; frOk += n.ok;
      if(n.rate >= 0.9) notesOk++; else bad.push(`${rel} ${nameOf(n.exp)}: %${Math.round(n.rate*100)}` + (n.other.length ? " (" + n.other.map(nameOf).join(", ") + ")" : "") + (n.octave ? ` oktav ${n.octave}` : "") + (n.twelfth ? ` onikili ${n.twelfth}` : ""));
    }
    const good = r.notes.filter(n => n.rate >= 0.9).length;
    const cents = r.notes.filter(n => n.cents != null).map(n => n.cents);
    if(!quiet || good < r.notes.length)
      console.log(`  ${good === r.notes.length ? "OK  " : "FAIL"} ${rel}: ${good}/${r.notes.length} nota doğru` +
        (r.kind === "chromatic" && r.segs !== r.want ? ` (beklenen ${r.want} nota, ayrılan ${r.segs})` : "") +
        (cents.length ? ` · ortalama ${(cents.reduce((a,b) => a+b, 0)/cents.length).toFixed(1)} sent` : "") +
        (r.notes[0].comma != null ? ` · ${r.notes[0].comma >= 0 ? "+" : ""}${r.notes[0].comma.toFixed(2)} koma` : ""));
  }
  if(bad.length) console.log("\nSorunlu notalar:\n  " + bad.join("\n  "));
  if(notesN) console.log(`\nToplam: ${notesOk}/${notesN} nota (%${(notesOk/notesN*100).toFixed(1)}) · kararlı ölçümlerin %${(frOk/frN*100).toFixed(1)}'i doğru nota`);
}
