// Eserler: koma işaretli dizek çizimi, eser kitaplığı (özgün etütler + kendi eserlerin + MusicXML içe aktarma),
// serbest takip (doğru nota gelince ilerler), tempolu çalma (metronomla; perde ve zamanlama değerlendirilir) ve dinleme.
// Mantık repertoire.js'te; practice.js TRAINERS.piece ve TRAINER_STEPS.piece'i kendi yardımcılarıyla çağırır.

// ---- Dizek ----
// notes: [{ w, c, d, rest }]; opts: { meter:[n, birim], cur, marks:{ i: "ok"|"bad"|"miss" }, names (perde adları) }
const SCORE_SVGNS = "http://www.w3.org/2000/svg";
function scoreEl(tag, attrs, text){
  const e = document.createElementNS(SCORE_SVGNS, tag);
  for(const k in attrs) e.setAttribute(k, attrs[k]);
  if(text != null) e.textContent = text;
  return e;
}
function drawScore(holder, notes, opts = {}){
  const STEP = 4, BASE = 84, sy = s => BASE - s*STEP, H = opts.names ? 142 : 124;
  const bar = opts.meter ? opts.meter[0] * 4 / opts.meter[1] : 4;
  // Yerleşim: süreye göre aralık, işaretli notaya ek yer
  const xs = []; let x = 46, beats = 0;
  const bars = [];
  notes.forEach((n, i) => {
    const acc = !n.rest && (n.c !== null ? (turkishAccidental(n.c, n.w) || {}).k : staffPos(n.w).acc);
    x += acc ? 12 : 0;
    xs.push(x);
    x += 16 + 15*Math.sqrt(n.d);
    beats += n.d;
    if(Math.abs(beats/bar - Math.round(beats/bar)) < 1e-6 && i < notes.length - 1){ bars.push(x - 6); x += 6; }
  });
  const W = x + 14;
  const svg = scoreEl("svg", { viewBox:`0 0 ${W} ${H}`, width:W, height:H, class:"score", role:"img",
    "aria-label": L("Nota: ", "Score: ") + notes.length + L(" nota", " notes") });
  for(let s=0;s<=8;s+=2) svg.appendChild(scoreEl("line", { class:"sl", x1:4, x2:W-4, y1:sy(s), y2:sy(s) }));
  svg.appendChild(scoreEl("text", { class:"clef", x:6, y:sy(-1.5) }, "𝄞"));
  if(opts.meter){
    svg.appendChild(scoreEl("text", { class:"meter", x:34, y:sy(5.2) }, String(opts.meter[0])));
    svg.appendChild(scoreEl("text", { class:"meter", x:34, y:sy(1.2) }, String(opts.meter[1])));
  }
  bars.forEach(bx => svg.appendChild(scoreEl("line", { class:"barl", x1:bx, x2:bx, y1:sy(8), y2:sy(0) })));
  svg.appendChild(scoreEl("line", { class:"barl end", x1:W-6, x2:W-6, y1:sy(8), y2:sy(0) }));
  const dotted = d => [3, 1.5, 0.75, 0.375].some(v => Math.abs(d - v) < 1e-6);
  notes.forEach((n, i) => {
    const g = scoreEl("g", { class:"sn" + (i === opts.cur ? " cur" : "") + (opts.marks && opts.marks[i] ? " " + opts.marks[i] : ""), "data-i": i });
    const nx = xs[i];
    if(n.rest){
      // Sus işaretleri (basit çizimler)
      if(n.d >= 4) g.appendChild(scoreEl("rect", { x:nx-6, y:sy(6), width:12, height:4 }));
      else if(n.d >= 2) g.appendChild(scoreEl("rect", { x:nx-6, y:sy(4)-4, width:12, height:4 }));
      else if(n.d >= 1) g.appendChild(scoreEl("path", { class:"rest", d:`M${nx-2} ${sy(7)} l5 6 l-5 5 l5 6 l-3 0 q-5 2 -1 6` }));
      else g.appendChild(scoreEl("path", { class:"rest", d:`M${nx+3} ${sy(5)} l-5 12 M${nx-3} ${sy(5)} q3 3 6 0` }));
      svg.appendChild(g); return;
    }
    const p = staffPos(n.w), y = sy(p.step), up = p.step < 4;
    for(let s=-2; s>=p.step; s-=2) g.appendChild(scoreEl("line", { class:"ledger", x1:nx-9, x2:nx+9, y1:sy(s), y2:sy(s) }));
    for(let s=10; s<=p.step; s+=2) g.appendChild(scoreEl("line", { class:"ledger", x1:nx-9, x2:nx+9, y1:sy(s), y2:sy(s) }));
    const hollow = n.d >= 2;
    g.appendChild(scoreEl("ellipse", { class: hollow ? "head hollow" : "head", cx:nx, cy:y, rx:5.2, ry:3.8, transform:`rotate(-20 ${nx} ${y})` }));
    if(n.d < 4){
      const sx = up ? nx + 4.6 : nx - 4.6, ey = up ? y - 27 : y + 27;
      g.appendChild(scoreEl("line", { class:"stem", x1:sx, x2:sx, y1:y, y2:ey }));
      const flags = n.d <= 0.375 ? 2 : n.d <= 0.75 ? 1 : 0;
      for(let k=0;k<flags;k++){
        const fy = ey + (up ? k*6 : -k*6);
        g.appendChild(scoreEl("path", { class:"flag", d: up ? `M${sx} ${fy} q8 6 6 15` : `M${sx} ${fy} q8 -6 6 -15` }));
      }
    }
    if(dotted(n.d)) g.appendChild(scoreEl("circle", { class:"head", cx:nx+9, cy:y - (p.step % 2 === 0 ? 2 : 0), r:1.6 }));
    // İşaret: AEU koma işareti (♭ + koma sayısı) ya da tampere ♯/♭
    const ta = n.c !== null ? turkishAccidental(n.c, n.w) : null;
    if(ta && ta.k){
      g.appendChild(scoreEl("text", { class:"acc", x:nx-13, y:y+5 }, ta.sym));
      g.appendChild(scoreEl("text", { class:"acck", x:nx-8, y:y+9 }, String(Math.abs(ta.k))));
    }else if(!ta && p.acc) g.appendChild(scoreEl("text", { class:"acc", x:nx-12, y:y+5 }, p.acc));
    if(p.ottava) g.appendChild(scoreEl("text", { class:"va", x:nx-8, y:Math.min(y, sy(10)) - 10 }, "8va"));
    if(opts.names){
      const pn = n.c !== null ? (PERDES.find(q => q[0] === n.c) || [, ""])[1] : noteName(n.w).tr;
      g.appendChild(scoreEl("text", { class:"pname", x:nx, y:H - 4 }, pn.replace(/^(Tiz|Kaba) /, "")));
    }
    svg.appendChild(g);
  });
  holder.replaceChildren(svg);
  holder._xs = xs;
  return { svg, xs };
}
function markScore(svg, i, cls){ const g = svg.querySelector(`.sn[data-i="${i}"]`); if(g) g.classList.add(cls); }
function curScore(svg, i, holder){
  svg.querySelectorAll(".sn.cur").forEach(g => g.classList.remove("cur"));
  const g = svg.querySelector(`.sn[data-i="${i}"]`);
  if(g){
    g.classList.add("cur");
    // Etkin notayı görünür tut: kutunun üçte birine kaydır
    if(holder && holder._xs) holder.scrollTo({ left: Math.max(0, holder._xs[i] - holder.clientWidth/3), behavior:"smooth" });
  }
}

// ---- Eser çalar: serbest takip, tempolu çalma, dinleme ----
// piece: { name, notes, tempo, meter, makam }; holder: dizeğin konacağı kaydırılabilir kutu; info: geri bildirim öğesi
function piecePlayer(ctx, piece, holder, info, onDone){
  const { SK } = ctx;
  const notes = piece.notes, mk = piece.makam ? makamById(piece.makam) : null;
  const playable = notes.map((n, i) => n.rest ? null : i).filter(i => i !== null);
  let names = ctx.store.get("piece.names", true);
  let sc = drawScore(holder, notes, { meter: piece.meter, names });
  let mode = null, k = 0, miss = 0, release = false, hold = null, t0 = null, run = null, playToken = null;
  const say = (cls, t) => { info.className = "fb " + cls; info.textContent = t; };
  const freqOf = n => n.c !== null && mk ? ctx.mkFreq(mk, n.c) : n.c !== null ? ctx.commaFreq(n.c) : undefined;
  function redraw(){ sc = drawScore(holder, notes, { meter: piece.meter, names }); }

  // Serbest takip: sıradaki notayı doğru çalınca ilerler
  function startFree(){
    stop(); mode = "free"; k = 0; miss = 0; release = false; t0 = null; hold = { w:null, since:0, fired:false };
    redraw(); curScore(sc.svg, playable[0], holder);
    say("", L("Sıradaki notayı çal; doğru çalınca ilerler.", "Play the next note; it moves on when correct."));
    if(ctx.store.get("piece.fing", true)) SK.showNote(notes[playable[0]].w);
  }
  function freeNote(r, t){
    if(k >= playable.length || !r.inRange) return;
    if(r.written !== hold.w){ hold.w = r.written; hold.since = t; hold.fired = false; }
    const ms = t - hold.since, idx = playable[k], want = notes[idx].w;
    if(release){ if(r.written !== notes[playable[k-1]].w) release = false; else return; }
    if(hold.fired) return;
    if(r.written === want && ms >= 180){
      hold.fired = true; if(t0 === null) t0 = t;
      markScore(sc.svg, idx, "ok"); k++;
      release = k < playable.length && notes[playable[k]].w === want;
      if(k >= playable.length){
        say("good", L("Bitti! ", "Done! ") + miss + L(" hata · ", " mistakes · ") + ctx.num((t - t0)/1000) + L(" sn", " s"));
        ctx.store.set("piece.done", ctx.store.get("piece.done", 0) + 1);
        mode = null; if(onDone) onDone({ v: miss, mode:"free" }); return;
      }
      curScore(sc.svg, playable[k], holder); say("", "");
      if(ctx.store.get("piece.fing", true) && !SK.playing()) SK.showNote(notes[playable[k]].w);
    }else if(r.written !== want && ms >= 400){
      hold.fired = true; miss++;
      say("bad", ctx.nn(r.written) + L(" çaldın; sıradaki ", " played; next is ") + ctx.nn(want) + ".");
    }
  }

  // Tempolu çalma: bir ölçü sayım, sonra notalar zamanında; bitince perde ve zamanlama değerlendirilir
  async function startTempo(pct = 1){
    stop();
    if(!(await ctx.needMic())) return;
    mode = "tempo"; redraw();
    const a = SK.audioCtx(), beatMs = 60000/(piece.tempo*pct);
    const unit = 4/(piece.meter ? piece.meter[1] : 4), clickMs = beatMs*unit, perBar = piece.meter ? piece.meter[0] : 4;
    const lead = 0.3, start = a.currentTime + lead, startPerf = ctxToPerf(a, start);
    const { times, beats } = noteTimes(notes, startPerf + perBar*clickMs, beatMs);
    const totalClicks = perBar + Math.ceil(beats/unit), metOn = ctx.store.get("piece.met", true);
    for(let i=0;i<totalClicks;i++) if(i < perBar || metOn) ctx.hit(a, i % perBar === 0 ? "D" : "T", start + i*clickMs/1000, i < perBar ? 1 : 0.55);
    const det = new OnsetDetector(), onsets = [], stable = [];
    const off = SK.level(f => { const o = det.push(f); if(o !== null) onsets.push(o); });
    const timers = [];
    times.forEach(e => timers.push(setTimeout(() => { if(mode === "tempo") curScore(sc.svg, e.i, holder); }, Math.max(0, e.t - performance.now()))));
    say("", L("Sayım… ", "Count-in… ") + perBar + L(" vuruş dinle, sonra çal.", " beats, then play."));
    timers.push(setTimeout(() => { if(mode === "tempo") say("", L("Çal!", "Play!")); }, Math.max(0, startPerf + perBar*clickMs - performance.now())));
    run = { stable, stop(){ timers.forEach(clearTimeout); off(); } };
    const endAt = startPerf + perBar*clickMs + beats*beatMs + 700;
    timers.push(setTimeout(() => {
      off(); if(mode !== "tempo") return;
      const lat = ctx.store.get("rhythm.lat", 0);
      const pitchAt = t => { const s = stable.find(x => x.t >= t - 30 && x.t <= t + 300); return s ? s.w : null; };
      const res = alignPerformance(times, onsets.map(o => o - lat), t => pitchAt(t + lat), 200);
      res.notes.forEach(r => markScore(sc.svg, r.i, r.state === "ok" ? "ok" : r.state === "pitch" ? "bad" : "miss"));
      const pct2 = Math.round(res.pitchRate*100);
      say(pct2 >= 80 ? "good" : "bad", L("Doğru nota %", "Correct notes ") + pct2 + (LANG === "en" ? "%" : "") + " · " + res.wrong + L(" yanlış · ", " wrong · ") + res.missed + L(" kaçan", " missed") +
        (res.notes.some(r => r.state === "ok") ? " · " + (Math.abs(res.mean) < 25 ? L("zamanlama yerinde", "timing on the beat") : Math.round(Math.abs(res.mean)) + (res.mean < 0 ? L(" ms erken", " ms early") : L(" ms geç", " ms late"))) + " ±" + Math.round(res.sd) + " ms" : ""));
      const best = ctx.store.get("piece.best", {}), id = piece.id || piece.name;
      if(!best[id] || pct2 > best[id]){ best[id] = pct2; ctx.store.set("piece.best", best); }
      mode = null; run = null;
      if(onDone) onDone({ v: pct2, mode:"tempo" });
    }, Math.max(0, endAt - performance.now())));
  }
  // Dinle: notaları tempoda çalar
  async function listen(pct = 1){
    stop(); redraw();
    const token = {}; playToken = token;
    const beatMs = 60000/(piece.tempo*pct);
    for(let i=0;i<notes.length;i++){
      if(playToken !== token) return;
      const n = notes[i];
      if(n.rest) SK.stopSound(); else { curScore(sc.svg, i, holder); SK.play(n.w, freqOf(n)); }
      await new Promise(r => setTimeout(r, n.d*beatMs*0.92));
      if(playToken !== token) return;
      SK.stopSound(); await new Promise(r => setTimeout(r, n.d*beatMs*0.08));
    }
    if(playToken === token){ SK.stopSound(); playToken = null; }
  }
  function stop(){ playToken = null; if(run){ run.stop(); run = null; } mode = null; }
  return {
    startFree, startTempo, listen, stop,
    toggleNames(){ names = !names; ctx.store.set("piece.names", names); redraw(); },
    note(r, t){
      if(mode === "free") freeNote(r, t);
      else if(mode === "tempo" && run) run.stable.push({ t, w:r.written });
    },
    silence(){ if(hold){ hold.fired = false; hold.w = null; } release = false; }
  };
}

// Eski biçimdeki kendi ezgileri ({name, notes:[w]}) yeni biçime çevir
function normPiece(p){
  if(p.notes.length && typeof p.notes[0] === "number")
    return { ...p, notes: p.notes.map(w => { const q = nearestPerde((w-67)*53/12); return { w, c: q ? q.comma : null, d:1, rest:false }; }), tempo: p.tempo || 80, meter: p.meter || [4,4] };
  return { tempo:80, meter:[4,4], ...p };
}

TRAINERS.piece = function(ctx){
  const { SK, $, store } = ctx;
  const P = $("pp-piece");
  P.innerHTML = `
    <p class="pdesc">${L("Etütler ve kendi eserlerin. Serbest takipte notalar sırayla gelir, doğru notayı çalınca ilerler. Tempolu çalmada bir ölçü sayımdan sonra metronomla çalarsın; bitince her notanın perdesi ve zamanlaması işaretlenir. Notada koma işaretleri AEU'ya göredir (♭1 koma, ♯4 bakiye, ♯5 küçük mücenneb, ♯8 büyük mücenneb).",
      "Études and your own pieces. In follow mode the notes come one by one and advance when you play the right one. In tempo mode you play with the metronome after a one-bar count-in; afterwards every note is marked for pitch and timing. Accidentals follow AEU (♭1 koma, ♯4 bakiye, ♯5 küçük mücenneb, ♯8 büyük mücenneb).")}</p>
    <div class="pbar">
      <select id="pcsel" aria-label="${L("Eser", "Piece")}"></select>
      <span class="muted" id="pcmeta"></span>
    </div>
    <div class="scorewrap" id="pcscore"></div>
    <div class="fb" id="pcfb" aria-live="polite"></div>
    <div class="pbar">
      <button class="primary small" id="pctempo" type="button">${L("Tempolu çal", "Play in tempo")}</button>
      <button class="stopbtn" id="pcfree" type="button">${L("Serbest takip", "Follow mode")}</button>
      <button class="stopbtn" id="pclisten" type="button">${L("Dinle", "Listen")}</button>
      <button class="stopbtn" id="pcstop" type="button">${L("Durdur", "Stop")}</button>
      <label class="tnum">${L("Hız", "Speed")} <input id="pcpct" type="range" min="50" max="120" step="5" value="100" aria-label="${L("Hız yüzdesi", "Speed percent")}"> <em id="pcpctv">100%</em></label>
    </div>
    <div class="pbar">
      <label class="chk"><input type="checkbox" id="pcfing"> ${L("parmağı göster", "show fingering")}</label>
      <label class="chk"><input type="checkbox" id="pcmet"> ${L("metronom", "metronome")}</label>
      <label class="chk"><input type="checkbox" id="pcnames"> ${L("perde adları", "perde names")}</label>
    </div>
    <details class="pcadd"><summary>${L("Eser ekle: yaz ya da MusicXML içe aktar", "Add a piece: type it or import MusicXML")}</summary>
      <p class="muted">${L("Notaları süreleriyle yaz: <code>Sol4:1 La4:0.5 Segâh:2 -:1</code> (süre dörtlük cinsinden; perde adı da yazabilirsin, boşluk yerine alt çizgi: <code>Dik_Kürdî</code>; <code>-</code> sus). MusicXML dosyaları (MuseScore, Finale, SymbTr) koma değerleriyle birlikte içe aktarılır.",
        "Type notes with durations: <code>G4:1 A4:0.5 Segâh:2 -:1</code> (duration in quarter notes; perde names work too, with underscores for spaces: <code>Dik_Kürdî</code>; <code>-</code> is a rest). MusicXML files (MuseScore, Finale, SymbTr) are imported with their comma values.")}</p>
      <div class="pbar"><input id="pcname" type="text" placeholder="${L("Eserin adı", "Name of the piece")}" aria-label="${L("Eserin adı", "Name of the piece")}">
        <label class="tnum"><input id="pctmp" type="number" min="30" max="240" value="80" aria-label="Tempo"> <em>${L("dörtlük/dk", "quarter/min")}</em></label>
        <select id="pcmk" aria-label="Makam"><option value="">${L("Makam yok", "No makam")}</option>${MAKAMS.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}</select></div>
      <textarea id="pctext" rows="3" placeholder="Sol4 La4:0.5 Si4:0.5 Do5:2" aria-label="${L("Notalar", "Notes")}"></textarea>
      <div class="pbar"><button class="stopbtn" id="pcsave" type="button">${L("Kaydet", "Save")}</button>
        <button class="stopbtn" id="pcimport" type="button">${L("MusicXML içe aktar", "Import MusicXML")}</button>
        <input type="file" id="pcfile" accept=".xml,.musicxml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml" hidden>
        <button class="stopbtn" id="pcdel" type="button">${L("Seçili kendi eserimi sil", "Delete the selected own piece")}</button>
        <span class="muted" id="pcmsg"></span></div>
    </details>`;
  let user = store.get("piece.user", []).map(normPiece);
  let player = null;
  const LEVEL = { 1: L("Başlangıç", "Beginner"), 2: L("Temel", "Basic"), 3: L("Makam", "Makam"), 4: L("Makam (ileri)", "Makam (advanced)"), 5: L("Usul", "Usul") };
  function all(){
    return [...ETUDES.map(e => ({ key:e.id, id:e.id, name: pick(e.name, LANG), notes: etudeNotes(e), tempo:e.tempo, meter:e.meter, makam:e.makam, group: LEVEL[e.level] })),
            ...user.map((p, i) => ({ ...p, key:"u"+i, own:true, group: L("Kendi eserlerim", "My pieces") }))];
  }
  function fillSel(keep){
    const groups = {};
    all().forEach(p => (groups[p.group] = groups[p.group] || []).push(p));
    $("pcsel").innerHTML = Object.entries(groups).map(([g, list]) => `<optgroup label="${ctx.esc(g)}">${list.map(p => `<option value="${p.key}">${ctx.esc(p.name)}</option>`).join("")}</optgroup>`).join("");
    if(keep && [...$("pcsel").options].some(o => o.value === keep)) $("pcsel").value = keep;
  }
  function load(){
    if(player) player.stop();
    const p = all().find(x => x.key === $("pcsel").value) || all()[0];
    const best = store.get("piece.best", {})[p.id || p.name];
    $("pcmeta").textContent = [p.makam ? makamById(p.makam).name : null, (p.meter || [4,4]).join("/"), "♩ = " + p.tempo, p.notes.length + L(" nota", " notes"), best != null ? L("en iyi %", "best ") + best + (LANG === "en" ? "%" : "") : null].filter(Boolean).join(" · ");
    if(p.makam) SK.setTempContext(p.makam); else SK.setTempContext(null);
    player = piecePlayer(ctx, p, $("pcscore"), $("pcfb"));
    $("pcfb").className = "fb"; $("pcfb").textContent = "";
  }
  fillSel(store.get("piece.sel", null));
  $("pcsel").addEventListener("change", () => { store.set("piece.sel", $("pcsel").value); load(); });
  $("pcfing").checked = store.get("piece.fing", true);
  $("pcfing").addEventListener("change", () => store.set("piece.fing", $("pcfing").checked));
  $("pcmet").checked = store.get("piece.met", true);
  $("pcmet").addEventListener("change", () => store.set("piece.met", $("pcmet").checked));
  $("pcnames").checked = store.get("piece.names", true);
  $("pcnames").addEventListener("change", () => player && player.toggleNames());
  const pct = () => +$("pcpct").value/100;
  $("pcpct").addEventListener("input", () => { $("pcpctv").textContent = $("pcpct").value + "%"; });
  $("pctempo").addEventListener("click", () => player.startTempo(pct()));
  $("pcfree").addEventListener("click", async () => { await ctx.needMic(); player.startFree(); });
  $("pclisten").addEventListener("click", () => player.listen(pct()));
  $("pcstop").addEventListener("click", () => { player.stop(); SK.stopSound(); });
  const msg = t => { $("pcmsg").textContent = t; };
  function addUser(p){
    user.push(p); store.set("piece.user", user);
    fillSel("u" + (user.length-1)); store.set("piece.sel", $("pcsel").value); load();
  }
  $("pcsave").addEventListener("click", () => {
    const { notes, errors } = parseScoreText($("pctext").value);
    const bad = notes.filter(n => !n.rest && (n.w < LOW_NOTE || n.w > HIGH_NOTE));
    if(errors.length || bad.length || !notes.some(n => !n.rest)){
      msg(errors.length ? L("Okunamadı: ", "Could not read: ") + errors.join(" ") : bad.length ? L("Aralık dışı: ", "Out of range: ") + bad.map(n => ctx.nn(n.w)).join(" ") + " (Mi3–Mi♭7)" : L("Nota yok.", "No notes."));
      return;
    }
    addUser({ name: $("pcname").value.trim() || L("Eserim ", "My piece ") + (user.length+1), notes, tempo: Math.max(30, Math.min(240, +$("pctmp").value || 80)), meter:[4,4], makam: $("pcmk").value || null });
    msg(notes.length + L(" nota kaydedildi.", " notes saved."));
  });
  $("pcimport").addEventListener("click", () => $("pcfile").click());
  $("pcfile").addEventListener("change", async () => {
    const f = $("pcfile").files[0]; $("pcfile").value = "";
    if(!f) return;
    try{
      const xml = /\.mxl$/i.test(f.name) ? await unzipFirstScore(await f.arrayBuffer()) : await f.text();
      const mx = parseMusicXML(xml);
      const inR = mx.notes.filter(n => n.rest || (n.w >= LOW_NOTE && n.w <= HIGH_NOTE));
      if(!inR.some(n => !n.rest)){ msg(L("Dosyada çalınabilir nota bulunamadı.", "No playable notes in the file.")); return; }
      const out = mx.notes.length - inR.length;
      addUser({ name: mx.title || f.name.replace(/\.(mxl|musicxml|xml)$/i, ""), notes: inR, tempo: Math.round(mx.tempo || 80), meter:[mx.beats, mx.beatType], makam: $("pcmk").value || null });
      msg(inR.length + L(" nota içe aktarıldı", " notes imported") + (out ? L(" (aralık dışındaki " + out + " nota atlandı)", " (" + out + " out-of-range notes skipped)") : "") + ".");
    }catch(e){ msg(L("Dosya okunamadı: ", "Couldn't read the file: ") + (e.message || e)); }
  });
  $("pcdel").addEventListener("click", () => {
    const k = $("pcsel").value;
    if(!k.startsWith("u")){ msg(L("Yalnızca kendi eserlerin silinir.", "Only your own pieces can be deleted.")); return; }
    if(!confirm(L("Bu eser silinsin mi?", "Delete this piece?"))) return;
    user.splice(+k.slice(1), 1); store.set("piece.user", user); fillSel(); load();
  });
  // Kayıt sekmesinden gelen notalar
  SK.addPiece = (name, ws) => addUser({ name, notes: ws.map(w => { const q = nearestPerde((w-67)*53/12); return { w, c: q ? q.comma : null, d:1, rest:false }; }), tempo:80, meter:[4,4], makam:null });
  return {
    enter(){ if(!player) load(); else { const p = all().find(x => x.key === $("pcsel").value); SK.setTempContext(p && p.makam || null); } },
    leave(){ if(player) player.stop(); SK.setTempContext(null); },
    note(r, t){ if(player) player.note(r, t); },
    silence(t){ if(player) player.silence(t); }
  };
};

// Ders adımı: { type:"piece", id, mode:"tempo"|"free", min } — tempoda en az min % doğru nota; serbestte en çok min hata
TRAINER_STEPS.piece = function(st, stage, done, ctx){
  const e = etudeById(st.id);
  stage.innerHTML = `<div class="scorewrap"></div><div class="fb"></div>
    <div class="pbar"><button class="stopbtn" type="button" data-l>${L("Dinle", "Listen")}</button><button class="primary small" type="button" data-go>${st.mode === "free" ? L("Başla", "Start") : L("Sayımla başla", "Start with count-in")}</button></div>`;
  const p = { id:e.id, name: pick(e.name, LANG), notes: etudeNotes(e), tempo: st.tempo || e.tempo, meter: e.meter, makam: e.makam };
  const pl = piecePlayer(ctx, p, stage.querySelector(".scorewrap"), stage.querySelector(".fb"), res => done({ v: res.v }));
  stage.querySelector("[data-l]").addEventListener("click", () => pl.listen());
  stage.querySelector("[data-go]").addEventListener("click", () => st.mode === "free" ? pl.startFree() : pl.startTempo());
  return { note: (r, t) => pl.note(r, t), silence: t => pl.silence(t), stop(){ pl.stop(); } };
};
