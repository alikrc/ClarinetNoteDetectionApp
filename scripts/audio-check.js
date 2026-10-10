// Gerçek klarnet kayıtlarıyla perde bulucu denetimi.
// Klasördeki her WAV dosyası uygulamadaki zincirle (40 ms adım, tizde 2048 / peste 4096 örneklik pencere,
// 5 ölçümlük medyan, 3 ölçümlük kararlılaştırıcı) analiz edilir ve dosya adındaki yazılı notayla karşılaştırılır.
//
// Dosya adı: <yazılı nota>_<açıklama>.wav, örn. "La4_uzun-ton.wav", "Segâh_vibrato.wav", "C5_telefon.wav".
// Perde adı verilirse koma sapması o perdeye göre ölçülür. Nota adı yoksa (örn. "taksim.wav") yalnızca
// algılanan notaların dökümü verilir.
//
// Kullanım: npm run audio-check -- [klasör] [--a4 440] [--inst sol]   (varsayılan klasör: testdata/)
const fs = require("fs");
const path = require("path");
const C = require("../core.js");
const R = require("../repertoire.js");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i+1] : d; };
const dir = args.find(a => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--")) || path.join(__dirname, "..", "testdata");
C.setA4(+opt("--a4", 440));
const T = C.instrumentById(opt("--inst", "sol")).t;

// 16/24/32 bit PCM ya da 32 bit float WAV → mono Float32Array
function readWav(file){
  const b = fs.readFileSync(file);
  if(b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WAVE") throw new Error("WAV değil");
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

// Dosya adından beklenen nota: yazılı nota ya da perde adı
function expected(name){
  const tok = path.basename(name, path.extname(name)).split(/[_\s]/)[0];
  const r = R.parseScoreText(tok);
  return !r.errors.length && r.notes.length === 1 && !r.notes[0].rest ? r.notes[0] : null;
}

function analyzeFile(file){
  const { x, sr } = readWav(file), hop = Math.round(0.04*sr), frames = [];
  const hist = [], stab = new C.NoteStabilizer(3);
  let lastFreq = -1;
  for(let end = 4096; end <= x.length; end += hop){
    const win = lastFreq > 250 ? x.subarray(end - 2048, end) : x.subarray(end - 4096, end);
    const d = C.detectPitch(win, sr, 100, 2100, 0.004);
    lastFreq = d.freq;
    if(d.freq <= 0){ stab.reset(); hist.length = 0; continue; }
    hist.push(d.freq); if(hist.length > 5) hist.shift();
    const med = [...hist].sort((a,b) => a-b)[Math.floor(hist.length/2)];
    const r = C.analyze(med, T);
    if(stab.push(C.noteKey(r))) frames.push({ t: end/sr, written: r.written, comma: r.comma, clarity: d.clarity });
  }
  return frames;
}

if(!fs.existsSync(dir)){ console.log(`Klasör yok: ${dir}\nKayıtları buraya koy: <yazılı nota>_<açıklama>.wav (örn. La4_uzun-ton.wav)`); process.exit(0); }
const files = fs.readdirSync(dir).filter(f => /\.wav$/i.test(f)).sort();
if(!files.length){ console.log(`${dir} içinde WAV yok.`); process.exit(0); }
let totalOk = 0, totalN = 0;
for(const f of files){
  let frames;
  try{ frames = analyzeFile(path.join(dir, f)); }catch(e){ console.log(`  ?    ${f}: ${e.message}`); continue; }
  const exp = expected(f);
  if(!exp){
    const seg = {}; frames.forEach(fr => { const k = C.noteName(fr.written).tr; seg[k] = (seg[k] || 0) + 1; });
    console.log(`  -    ${f}: ${frames.length} ölçüm · ` + Object.entries(seg).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([k, n]) => `${k} ${Math.round(n/frames.length*100)}%`).join(", "));
    continue;
  }
  const okF = frames.filter(fr => fr.written === exp.w), octave = frames.filter(fr => fr.written !== exp.w && (fr.written - exp.w) % 12 === 0);
  const twelfth = frames.filter(fr => Math.abs(fr.written - exp.w) === 19);
  const target = exp.c !== null ? exp.c : (exp.w - 67)*53/12;
  const devs = okF.map(fr => fr.comma - target), mean = devs.length ? devs.reduce((a,b) => a+b, 0)/devs.length : 0;
  const rate = frames.length ? okF.length/frames.length : 0;
  totalOk += okF.length; totalN += frames.length;
  console.log(`  ${rate >= 0.95 ? "OK  " : "FAIL"} ${f}: %${Math.round(rate*100)} doğru nota (${okF.length}/${frames.length})` +
    (octave.length ? ` · oktav hatası ${octave.length}` : "") + (twelfth.length ? ` · onikili hatası ${twelfth.length}` : "") +
    ` · ortalama ${mean >= 0 ? "+" : ""}${mean.toFixed(2)} koma`);
}
if(totalN) console.log(`\nToplam: %${(totalOk/totalN*100).toFixed(1)} doğru nota (${totalOk}/${totalN} kararlı ölçüm)`);
