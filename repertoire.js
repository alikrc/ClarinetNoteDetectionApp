// Repertuvar: süreli nota biçimi, MusicXML (.xml/.musicxml/.mxl) içe aktarma, AEU koma işaretleri,
// tempolu çalma değerlendirmesi ve uygulama için yazılmış özgün makam etütleri.
// Tarayıcıda skills.js'ten sonra <script src="repertoire.js"> ile, Node'da require("./repertoire.js") ile yüklenir.

const RCORE = typeof module !== "undefined" ? require("./core.js") : { PERDES, nearestPerde, noteName, LOW_NOTE, HIGH_NOTE };

// ---- Nota metni ----
// Her öge "Ad:süre" (süre dörtlük cinsinden, verilmezse 1). Ad yazılı nota (Sol4, Si♭4, G4, Bb4) ya da AEU
// perde adı olabilir (boşluk yerine alt çizgi: Dik_Kürdî). "-" ya da "Es" sus işaretidir. "|" ölçü çizgisi, yok sayılır.
// Dönen: { notes:[{ w, c, d, rest }], errors:[] }  (w yazılı MIDI, c Rast'a göre koma ya da null)
const PERDE_BY_NAME = new Map(RCORE.PERDES.map(([c, n]) => [n.toLocaleLowerCase("tr"), c]));
const LETTER_PC2 = { do:0, re:2, mi:4, fa:5, sol:7, la:9, si:11, c:0, d:2, e:4, f:5, g:7, a:9, b:11 };
function writtenToken(tok){
  const low = tok.toLocaleLowerCase("tr").replace("ı", "i");
  const m = /^(do|re|mi|fa|sol|la|si)([♯#]|[♭b])?(\d)$/.exec(low) || /^([a-g])([♯#]|[♭b])?(\d)$/.exec(low);
  if(!m) return null;
  const acc = !m[2] ? 0 : /[♯#]/.test(m[2]) ? 1 : -1;
  return LETTER_PC2[m[1]] + acc + (+m[3] + 1) * 12;
}
function parseScoreText(text){
  const notes = [], errors = [];
  for(const raw of text.split(/[\s;]+/).filter(Boolean)){
    if(raw === "|") continue;
    const [name, ds] = raw.split(":");
    const d = ds === undefined ? 1 : parseFloat(ds.replace(",", "."));
    if(!(d > 0 && d <= 16)){ errors.push(raw); continue; }
    if(name === "-" || /^es$/i.test(name)){ notes.push({ w:null, c:null, d, rest:true }); continue; }
    const pc = PERDE_BY_NAME.get(name.replace(/_/g, " ").toLocaleLowerCase("tr"));
    if(pc !== undefined){ notes.push({ w: Math.round(67 + pc*12/53), c: pc, d, rest:false }); continue; }
    const w = writtenToken(name);
    if(w === null){ errors.push(raw); continue; }
    const p = RCORE.nearestPerde((w - 67)*53/12);
    notes.push({ w, c: p ? p.comma : null, d, rest:false });
  }
  return { notes, errors };
}
// Notaları metne çevirir (perde adı varsa perde adıyla)
function scoreToText(notes){
  return notes.map(n => (n.rest ? "-" : n.c !== null ? RCORE.PERDES.find(p => p[0] === n.c)[1].replace(/ /g, "_") : RCORE.noteName(n.w).tr) + (n.d === 1 ? "" : ":" + n.d)).join(" ");
}

// ---- AEU koma işaretleri ----
// Doğal notaların AEU'daki yeri (Rast = Sol = 0): La 9, Si 18 (Bûselik), Do 22, Re 31, Mi 40, Fa 44.
// Perde, yazılı notanın harfine göre doğaldan kaç koma uzaksa işaret o kadardır: ±1 koma, ±4 bakiye,
// ±5 küçük mücenneb, ±8 büyük mücenneb. Örnek: Segâh = Si'nin 1 koma pesi; Evç = Fa'nın 4 koma (bakiye) tizi.
// Yazılı notanın dizekteki harfi (staffPos ile aynı: Do♯ Do'nun, Mi♭ Mi'nin, Si♭ Si'nin üstünde)
const LETTER_OF_PC = [0,0,1,2,2,3,3,4,4,5,6,6];                    // Do Re Mi Fa Sol La Si
const NAT_PC = [0,2,4,5,7,9,11];
// Doğal notanın Sol4'ten yarım ses uzaklığı (oktav içinde) → AEU koması
const NAT_COMMA = { 0:0, 2:9, 4:18, 5:22, 7:31, 9:40, 10:44 };
function turkishAccidental(c, w){
  if(c === null || c === undefined) return null;
  const pc = ((w % 12) + 12) % 12, natW = w - pc + NAT_PC[LETTER_OF_PC[pc]];
  const sdist = natW - 67, o = Math.floor(sdist/12), natC = NAT_COMMA[sdist - 12*o] + 53*o;
  const k = Math.round(c - natC);
  if(k === 0) return { k:0, sym:"", name:"" };
  const NAMES = { 1:"koma", 4:"bakiye", 5:"küçük mücenneb", 8:"büyük mücenneb" };
  return { k, sym: k > 0 ? "♯" : "♭", name: NAMES[Math.abs(k)] || (Math.abs(k) + " koma") };
}

// ---- MusicXML ----
// Yalnızca ilk bölüm (part) okunur; akor notalarının ilki alınır, bağlı (tie) notalar birleştirilir.
// Koma değeri <alter>'den (kesirli yarım ses) bulunur: SymbTr gibi Türk müziği dosyalarında perdeler böyle yazılır.
function xmlTag(s, tag){ const m = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">").exec(s); return m ? m[1].trim() : null; }
function parseMusicXML(xml){
  const title = xmlTag(xml, "work-title") || xmlTag(xml, "movement-title") || null;
  const part = (/<part\s[^>]*>([\s\S]*?)<\/part>/.exec(xml) || [, xml])[1];
  const STEP = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  let divisions = 1, beats = 4, beatType = 4, tempo = null;
  const notes = [];
  for(const mm of part.matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)){
    const meas = mm[1];
    const dv = xmlTag(meas, "divisions"); if(dv) divisions = +dv;
    const tm = xmlTag(meas, "time"); if(tm){ beats = +xmlTag(tm, "beats") || beats; beatType = +xmlTag(tm, "beat-type") || beatType; }
    const sp = /<sound[^>]*\btempo="([\d.]+)"/.exec(meas); if(sp && tempo === null) tempo = +sp[1];
    for(const nm of meas.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/g)){
      const n = nm[1];
      if(/<chord\s*\/>/.test(n) || /<grace\b/.test(n)) continue;
      const dur = +(xmlTag(n, "duration") || 0) / divisions;     // dörtlük cinsinden
      if(!(dur > 0)) continue;
      if(/<rest\b/.test(n)){ notes.push({ w:null, c:null, d:dur, rest:true }); continue; }
      const p = xmlTag(n, "pitch"); if(!p) continue;
      const midi = STEP[xmlTag(p, "step")] + (+(xmlTag(p, "alter") || 0)) + (+xmlTag(p, "octave") + 1)*12;
      const comma = (midi - 67)*53/12, near = RCORE.nearestPerde(comma);
      const c = near && Math.abs(near.delta) <= 0.6 ? near.comma : null;
      const w = c !== null ? Math.round(67 + c*12/53) : Math.round(midi);
      const tieStop = /<tie[^>]*type="stop"/.test(n), prev = notes[notes.length-1];
      if(tieStop && prev && !prev.rest && prev.w === w){ prev.d += dur; continue; }
      notes.push({ w, c, d:dur, rest:false });
    }
  }
  return { title, notes, beats, beatType, tempo };
}
// .mxl (sıkıştırılmış MusicXML): zip içinden kök dosyayı çıkarır. DecompressionStream gerekir (tarayıcı, Node 18+).
async function unzipFirstScore(buf){
  const u8 = new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const files = new Map();
  let eocd = -1;
  for(let i=u8.length-22;i>=0 && i>=u8.length-70000;i--) if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if(eocd < 0) throw new Error("zip değil");
  const n = dv.getUint16(eocd+10, true); let p = dv.getUint32(eocd+16, true);
  const dec = new TextDecoder();
  for(let k=0;k<n;k++){
    const method = dv.getUint16(p+10, true), csize = dv.getUint32(p+20, true);
    const nlen = dv.getUint16(p+28, true), xlen = dv.getUint16(p+30, true), clen = dv.getUint16(p+32, true), off = dv.getUint32(p+42, true);
    const name = dec.decode(u8.subarray(p+46, p+46+nlen));
    files.set(name, { method, csize, off });
    p += 46 + nlen + xlen + clen;
  }
  const read = async name => {
    const f = files.get(name); if(!f) return null;
    const lnl = dv.getUint16(f.off+26, true), lxl = dv.getUint16(f.off+28, true), start = f.off + 30 + lnl + lxl;
    const data = u8.subarray(start, start + f.csize);
    if(f.method === 0) return dec.decode(data);
    const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return dec.decode(await new Response(ds).arrayBuffer());
  };
  const cont = await read("META-INF/container.xml");
  const root = cont && (/full-path="([^"]+)"/.exec(cont) || [])[1];
  const name = root || [...files.keys()].find(k => !k.startsWith("META-INF") && /\.(xml|musicxml)$/i.test(k));
  if(!name) throw new Error("zip içinde nota yok");
  return read(name);
}

// ---- Tempolu çalma değerlendirmesi ----
// expected: [{ t (ms), w, i (nota sırası) }] sus işaretleri hariç; onsets: nota başı zamanları;
// pitchAt(t): o andan sonraki ilk kararlı yazılı nota (ya da null). tol: zaman toleransı (ms).
// Dönen: her nota için { i, state: "ok"|"pitch"|"miss", dev (ms), got (yazılı) } ve özet.
function alignPerformance(expected, onsets, pitchAt, tol){
  const used = new Set(), res = [];
  for(const e of expected){
    let best = -1, bd = Infinity;
    onsets.forEach((o, k) => { if(!used.has(k) && Math.abs(o - e.t) < bd){ bd = Math.abs(o - e.t); best = k; } });
    if(best < 0 || bd > (e.tol || tol)){ res.push({ i:e.i, state:"miss" }); continue; }
    used.add(best);
    const got = pitchAt(onsets[best]);
    res.push({ i:e.i, state: got === e.w ? "ok" : "pitch", dev: onsets[best] - e.t, got });
  }
  const ok = res.filter(r => r.state === "ok");
  const devs = ok.map(r => r.dev), mean = devs.length ? devs.reduce((a,b) => a+b, 0)/devs.length : 0;
  const sd = devs.length ? Math.sqrt(devs.reduce((a,b) => a + (b-mean)**2, 0)/devs.length) : 0;
  return { notes: res, pitchRate: expected.length ? ok.length/expected.length : 0,
           missed: res.filter(r => r.state === "miss").length, wrong: res.filter(r => r.state === "pitch").length, mean, sd };
}
// Notaların beklenen zamanları: start (ms), beatMs (dörtlük), notalar
function noteTimes(notes, start, beatMs){
  const out = []; let b = 0;
  notes.forEach((n, i) => { if(!n.rest) out.push({ t: start + b*beatMs, w: n.w, i, tol: Math.min(250, Math.max(90, n.d*beatMs*0.45)) }); b += n.d; });
  return { times: out, beats: b };
}

// ---- Özgün etütler ----
// Uygulama için yazıldı (telif yok). Her biri makamın seyrini izler: açılış, güçlüde yarım karar, durakta karar.
// Süreler dörtlük cinsinden; tempo dörtlük/dk.
const ETUDES = [
  { id:"e-sol-el", name:{ tr:"İlk ezgi (sol el)", en:"First tune (left hand)" }, level:1, makam:null, tempo:72, meter:[4,4],
    text:"Sol4 Sol4 Fa♯4 Mi4 | Re4:2 Mi4:2 | Fa♯4 Sol4 Fa♯4 Mi4 | Re4:4 | Mi4 Fa♯4 Sol4 Mi4 | Fa♯4:2 Re4:2 | Mi4 Re4 Mi4 Fa♯4 | Sol4:4" },
  { id:"e-iki-el", name:{ tr:"İki el ezgisi", en:"Two-hand tune" }, level:1, makam:null, tempo:76, meter:[4,4],
    text:"Do4 Re4 Mi4 Fa4 | Sol4:2 Sol4:2 | La4 Sol4 Fa4 Mi4 | Re4:4 | Sol3 La3 Si3 Do4 | Re4:2 Mi4:2 | Re4 Do4 Si3 La3 | Sol3:4" },
  { id:"e-register", name:{ tr:"Register köprüsü", en:"Register bridge" }, level:2, makam:null, tempo:66, meter:[4,4],
    text:"Sol4:2 La4:2 | Si♭4:2 Si4:2 | Do5:2 Re5:2 | Do5:4 | Si4 La4 Sol4 La4 | Si4:2 Do5:2 | Re5 Do5 Si4 La4 | Sol4:4" },
  { id:"e-rast", name:{ tr:"Rast etüdü", en:"Rast étude" }, level:3, makam:"rast", tempo:80, meter:[4,4],
    text:"Rast Dügâh Segâh Çargâh | Nevâ:2 Hüseynî Nevâ | Çargâh Segâh Dügâh Segâh | Nevâ:4 | Hüseynî Evç Gerdâniye:2 | Acem Hüseynî Nevâ:2 | Çargâh Segâh Dügâh Irak | Rast:4" },
  { id:"e-ussak", name:{ tr:"Uşşak etüdü", en:"Uşşak étude" }, level:3, makam:"ussak", tempo:80, meter:[4,4],
    text:"Dügâh Segâh Çargâh Nevâ | Nevâ:2 Çargâh Segâh | Çargâh:1.5 Segâh:0.5 Dügâh Segâh | Çargâh Nevâ Hüseynî Nevâ | Acem Hüseynî Nevâ Çargâh | Segâh:2 Çargâh Segâh | Dügâh Rast Dügâh Segâh | Dügâh:4" },
  { id:"e-huseyni", name:{ tr:"Hüseynî etüdü", en:"Hüseynî étude" }, level:3, makam:"huseyni", tempo:80, meter:[4,4],
    text:"Hüseynî:2 Nevâ Hüseynî | Evç Gerdâniye Evç Hüseynî | Nevâ:2 Çargâh Segâh | Nevâ:2 Hüseynî:2 | Acem Hüseynî Nevâ Çargâh | Segâh Çargâh Nevâ:2 | Çargâh Segâh Dügâh Rast | Dügâh:4" },
  { id:"e-hicaz", name:{ tr:"Hicaz etüdü", en:"Hicaz étude" }, level:3, makam:"hicaz", tempo:76, meter:[4,4],
    text:"Dügâh Dik_Kürdî Nim_Hicaz Nevâ | Nevâ:2 Nim_Hicaz Dik_Kürdî | Dügâh:2 Dik_Kürdî Nim_Hicaz | Nevâ:4 | Hüseynî Acem Hüseynî Nevâ | Nim_Hicaz:1.5 Dik_Kürdî:0.5 Nim_Hicaz Nevâ | Nim_Hicaz Dik_Kürdî Dügâh Rast | Dügâh:4" },
  { id:"e-nihavend", name:{ tr:"Nihâvend etüdü", en:"Nihâvend étude" }, level:3, makam:"nihavend", tempo:80, meter:[4,4],
    text:"Rast Dügâh Kürdî Çargâh | Nevâ:2 Nim_Hisar Nevâ | Çargâh Kürdî Dügâh Kürdî | Çargâh:4 | Nevâ Nim_Hisar Evç Gerdâniye | Acem Nim_Hisar Nevâ:2 | Çargâh Kürdî Dügâh Irak | Rast:4" },
  { id:"e-kurdi", name:{ tr:"Kürdî etüdü", en:"Kürdî étude" }, level:3, makam:"kurdi", tempo:80, meter:[4,4],
    text:"Dügâh Kürdî Çargâh Nevâ | Hüseynî:2 Nevâ:2 | Çargâh Kürdî Çargâh Nevâ | Kürdî:2 Dügâh:2 | Nevâ Hüseynî Acem Hüseynî | Nevâ Çargâh Kürdî Çargâh | Kürdî:1.5 Çargâh:0.5 Kürdî Rast | Dügâh:4" },
  { id:"e-saba", name:{ tr:"Saba etüdü", en:"Saba étude" }, level:4, makam:"saba", tempo:72, meter:[4,4],
    text:"Dügâh Segâh Çargâh Hicaz | Çargâh:2 Segâh:2 | Segâh Çargâh Hicaz Hüseynî | Hicaz:2 Çargâh:2 | Hüseynî Acem Hüseynî Hicaz | Çargâh Segâh Çargâh:2 | Segâh Dügâh Rast Dügâh | Dügâh:4" },
  { id:"e-segah", name:{ tr:"Segâh etüdü", en:"Segâh étude" }, level:4, makam:"segah", tempo:72, meter:[4,4],
    text:"Segâh Çargâh Nevâ Hüseynî | Evç:2 Hüseynî Nevâ | Çargâh Nevâ Hüseynî Evç | Gerdâniye:2 Evç:2 | Hüseynî Nevâ Çargâh Segâh | Çargâh:2 Segâh:2 | Dügâh Segâh Çargâh Segâh | Segâh:4" },
  { id:"e-huzzam", name:{ tr:"Hüzzam etüdü", en:"Hüzzam étude" }, level:4, makam:"huzzam", tempo:72, meter:[4,4],
    text:"Segâh Çargâh Nevâ Hisar | Evç:2 Hisar Nevâ | Çargâh Nevâ Hisar Evç | Gerdâniye:2 Evç:2 | Hisar Nevâ Çargâh Segâh | Çargâh Nevâ Hisar Nevâ | Çargâh Segâh Dügâh Segâh | Segâh:4" },
  { id:"e-semai", name:{ tr:"Semâî ezgisi (Rast, 3/4)", en:"Semâî tune (Rast, 3/4)" }, level:4, makam:"rast", tempo:96, meter:[3,4], usul:"semai",
    text:"Rast:2 Dügâh | Segâh:2 Çargâh | Nevâ:3 | Hüseynî Nevâ Çargâh | Segâh:2 Dügâh | Segâh Çargâh Nevâ | Çargâh Segâh Dügâh | Rast:3" },
  // 9/8: süreler dörtlük cinsinden (sekizlik = 0.5); ölçü 2+2+2+3 sekizlik
  { id:"e-aksak", name:{ tr:"Aksak oyun havası (Hicaz, 9/8)", en:"Aksak dance (Hicaz, 9/8)" }, level:5, makam:"hicaz", tempo:100, meter:[9,8], usul:"aksak",
    text:"Dügâh:0.5 Dik_Kürdî:0.5 Nim_Hicaz:0.5 Nevâ:0.5 Nevâ:0.5 Nim_Hicaz:0.5 Dik_Kürdî:0.5 Dügâh:1 | Nevâ:0.5 Hüseynî:0.5 Nevâ:0.5 Nim_Hicaz:0.5 Nevâ:1 Dik_Kürdî:0.5 Dügâh:1 | Dügâh:0.5 Dik_Kürdî:0.5 Nim_Hicaz:0.5 Nevâ:0.5 Hüseynî:1 Nevâ:1.5 | Nim_Hicaz:0.5 Dik_Kürdî:0.5 Nim_Hicaz:0.5 Rast:0.5 Dügâh:2.5" }
];
// Etüdün notaları (bir kez ayrıştırılır)
const etudeCache = new Map();
function etudeNotes(e){
  if(!etudeCache.has(e.id)) etudeCache.set(e.id, parseScoreText(e.text).notes);
  return etudeCache.get(e.id);
}
const etudeById = id => ETUDES.find(e => e.id === id) || null;

if(typeof module !== "undefined") module.exports = {
  parseScoreText, scoreToText, writtenToken, turkishAccidental, parseMusicXML, unzipFirstScore,
  alignPerformance, noteTimes, ETUDES, etudeNotes, etudeById
};
