// Çalışma bölümünün ikinci kısmı: Ritim, Kulak ve Seyir (taksim) sekmeleri ile derslerdeki
// ritim, dinamik, seyir, okuma ve kulak adımları. Ölçüm mantığı skills.js'te.
// practice.js bu dosyadaki TRAINERS ve TRAINER_STEPS'i kendi yardımcılarıyla (ctx) çağırır.

// AudioContext zamanını performance.now() zaman çizgisine çevirir (hoparlör gecikmesi dahil)
function ctxToPerf(a, ctxTime){
  const ts = a.getOutputTimestamp ? a.getOutputTimestamp() : null;
  if(ts && ts.performanceTime) return ts.performanceTime + (ctxTime - ts.contextTime)*1000;
  return performance.now() + (ctxTime - a.currentTime)*1000 + ((a.outputLatency || 0) + (a.baseLatency || 0))*1000;
}

// Metronomlu ritim turu: sayım ölçüsü + bars ölçü. onDone({ expected, onsets }) ham zamanlarla döner.
// opts: { beatMs, pattern {beats, at}, bars, silent (sayımdan sonra metronom susar), accents (usul vuruşları) }
function rhythmRun(ctx, opts, onDone, onTick){
  const { SK } = ctx, a = SK.audioCtx();
  const beatS = opts.beatMs/1000, beats = opts.pattern.beats, total = beats*(opts.bars + 1);
  const t0 = a.currentTime + 0.25;
  const startPerf = ctxToPerf(a, t0);
  const expected = expectedTimes(startPerf + beats*opts.beatMs, opts.beatMs, opts.bars, opts.pattern);
  const timers = [];
  for(let i=0;i<total;i++){
    const inCount = i < beats, at = t0 + i*beatS;
    if(inCount || !opts.silent){
      const kind = opts.accents ? (opts.accents[i % beats] || null) : (i % beats === 0 ? "D" : "T");
      if(kind || inCount) ctx.hit(a, kind || "T", at, inCount ? 1 : 0.7);
    }
    if(onTick) timers.push(setTimeout(() => onTick(i, inCount), Math.max(0, (at - a.currentTime)*1000)));
  }
  const det = new OnsetDetector(), onsets = [];
  const off = SK.level(f => { const o = det.push(f); if(o !== null) onsets.push(o); });
  const endMs = (t0 + total*beatS - a.currentTime)*1000 + opts.beatMs*0.6;
  timers.push(setTimeout(() => { off(); onDone({ expected, onsets }); }, endMs));
  return { stop(){ timers.forEach(clearTimeout); off(); } };
}
// Gecikme düzeltmesi uygulanmış değerlendirme
function rhythmEval(ctx, run, beatMs, pattern){
  const lat = ctx.store.get("rhythm.lat", 0);
  const step = Math.min(...pattern.at.map((x, i) => i ? x - pattern.at[i-1] : pattern.beats).filter(x => x > 0)) * beatMs;
  const m = matchOnsets(run.expected, run.onsets.map(o => o - lat), Math.min(step*0.45, 250));
  return { m, score: rhythmScore(m, beatMs, run.expected.length) };
}
// Sonuç görseli: beklenen vuruşlar çizgi, çalınanlar nokta (sapmaya göre renk)
function rhythmSvg(run, res){
  const ex = run.expected; if(!ex.length) return "";
  const t0 = ex[0] - 300, t1 = ex[ex.length-1] + 300, W = 600, x = t => ((t - t0)/(t1 - t0))*W;
  const lat = 0;
  let s = `<svg class="rhsvg" viewBox="0 0 ${W} 60" role="img" aria-label="${L("Vuruşlar ve çaldıkların", "Beats and your notes")}">`;
  s += `<line x1="0" x2="${W}" y1="30" y2="30" class="rhaxis"/>`;
  ex.forEach(e => s += `<line x1="${x(e)}" x2="${x(e)}" y1="12" y2="48" class="rhexp"/>`);
  res.m.hits.forEach(h => { const c = Math.abs(h.dev) < 30 ? "good" : Math.abs(h.dev) < 70 ? "mid" : "bad"; s += `<circle cx="${x(h.got - lat)}" cy="30" r="5" class="rh${c}"/>`; });
  res.m.extra.forEach(p => s += `<circle cx="${x(p)}" cy="30" r="4" class="rhextra"/>`);
  return s + "</svg>";
}
function rhythmText(res){
  const m = res.m, ms = v => Math.round(Math.abs(v));
  const where = Math.abs(m.mean) < 15 ? L("vuruşun tam üstünde", "right on the beat") : m.mean < 0 ? ms(m.mean) + L(" ms erken", " ms early") : ms(m.mean) + L(" ms geç", " ms late");
  return `<div class="result"><div class="big">${res.score}</div><div>${L("puan", "points")} · ${m.hits.length}/${m.hits.length + m.missed.length} ${L("vuruş", "beats")}${m.extra.length ? " · " + m.extra.length + L(" fazla nota", " extra notes") : ""}</div></div>
    <div class="kv"><div><span class="label">${L("Ortalama", "Average")}</span>${m.hits.length ? where : "—"}</div>
    <div><span class="label">${L("Tutarlılık (yayılım)", "Consistency (spread)")}</span>${m.hits.length > 1 ? "±" + ms(m.sd) + " ms" : "—"}</div></div>`;
}

const TRAINERS = {
  // ======== Ritim ========
  rhythm(ctx){
    const { SK, $, store } = ctx;
    const P = $("pp-rhythm");
    const pats = RHYTHM_PATTERNS.map(p => `<option value="p:${p.id}">${pick(p.name, LANG)}</option>`).join("") +
      USULS.map(u => `<option value="u:${u.id}">${L("Usul: ", "Usul: ")}${u.name} ${u.meter}</option>`).join("");
    P.innerHTML = `
      <p class="pdesc">${L("Metronomla birlikte kısa notalar çal (herhangi bir nota). Bir ölçü sayımdan sonra çaldıkların vuruşlarla karşılaştırılır: isabet, erken/geç ve tutarlılık. Usul seçersen düm ve tek vuruşlarında çalarsın.",
        "Play short notes with the metronome (any note). After a one-bar count-in your notes are compared with the beats: hits, early/late and consistency. Pick an usul to play on its düm and tek strokes.")}</p>
      <div class="pbar">
        <select id="rhpat" aria-label="${L("Kalıp", "Pattern")}">${pats}</select>
        <label class="tnum"><input id="rhtempo" type="number" min="40" max="200" step="2" aria-label="Tempo"> <em>${L("vuruş/dk", "bpm")}</em></label>
        <label class="chk"><input type="checkbox" id="rhsilent"> ${L("sayımdan sonra metronom sussun", "mute the metronome after the count-in")}</label>
        <button class="primary small" id="rhstart" type="button">${L("Başlat", "Start")}</button>
      </div>
      <div class="stage" id="rhstage"><div class="muted">${L("Kalıbı ve tempoyu seç, sonra başlat.", "Pick a pattern and tempo, then start.")}</div></div>
      <details class="pcadd"><summary>${L("Gecikme ayarı", "Latency calibration")} · <span id="rhlat"></span></summary>
        <p class="muted">${L("Telefonun hoparlörü ve mikrofonu sesi birkaç on milisaniye geciktirir. Hoparlörle ölçüm: telefonu masaya koy, sessiz kal; bip sesleri mikrofondan geri dinlenir. Kulaklıkla: bip seslerine tam üstünden kısa notalar çal.",
          "Phone speakers and microphones delay sound by tens of milliseconds. Speaker test: put the phone down and stay quiet; the beeps are heard back through the mic. With headphones: play short notes exactly on the beeps.")}</p>
        <div class="pbar"><button class="stopbtn" id="rhcalsp" type="button">${L("Hoparlörle ölç", "Measure with the speaker")}</button>
          <button class="stopbtn" id="rhcalpl" type="button">${L("Çalarak ölç", "Measure by playing")}</button>
          <button class="stopbtn" id="rhcal0" type="button">${L("Sıfırla", "Reset")}</button></div>
        <div class="muted" id="rhcalmsg"></div>
      </details>`;
    const stage = $("rhstage");
    $("rhpat").value = store.get("rhythm.pat", "p:quarter");
    $("rhtempo").value = store.get("rhythm.tempo", 80);
    $("rhsilent").checked = store.get("rhythm.silent", false);
    $("rhpat").addEventListener("change", () => store.set("rhythm.pat", $("rhpat").value));
    $("rhtempo").addEventListener("change", () => store.set("rhythm.tempo", +$("rhtempo").value));
    $("rhsilent").addEventListener("change", () => store.set("rhythm.silent", $("rhsilent").checked));
    const showLat = () => { $("rhlat").textContent = store.get("rhythm.lat", 0) + " ms"; };
    showLat();
    let run = null;
    function setup(){
      const v = $("rhpat").value, tempo = Math.max(40, Math.min(200, +$("rhtempo").value || 80));
      if(v.startsWith("u:")){
        const u = USULS.find(x => x.id === v.slice(2)), slots = usulSlots(u);
        return { beatMs: 60000/tempo, pattern:{ beats: slots.length, at: usulStrokeTimes(slots) }, accents: slots, name: u.name };
      }
      const p = RHYTHM_PATTERNS.find(x => x.id === v.slice(2));
      return { beatMs: 60000/tempo, pattern: p, name: pick(p.name, LANG) };
    }
    $("rhstart").addEventListener("click", async () => {
      if(run){ run.stop(); run = null; $("rhstart").textContent = L("Başlat", "Start"); stage.innerHTML = ""; return; }
      if(!(await ctx.needMic())) return;
      const o = setup(); o.bars = 4; o.silent = $("rhsilent").checked;
      $("rhstart").textContent = L("Durdur", "Stop");
      stage.innerHTML = `<div class="qname" id="rhcount">…</div><div class="muted">${L("Sayım: ilk ölçüyü dinle, sonra çal.", "Count-in: listen to the first bar, then play.")}</div>`;
      run = rhythmRun(ctx, o, r => {
        run = null; $("rhstart").textContent = L("Başlat", "Start");
        const res = rhythmEval(ctx, r, o.beatMs, o.pattern);
        const hist = store.get("rhythm.hist", []); hist.push({ d: dayKey(new Date()), p: $("rhpat").value, tempo: Math.round(60000/o.beatMs), score: res.score });
        store.set("rhythm.hist", hist.slice(-100));
        const best = store.get("rhythm.best", 0); if(res.score > best) store.set("rhythm.best", res.score);
        stage.innerHTML = rhythmText(res) + rhythmSvg(r, res) + `<div class="muted small">${L("Çizgi: vuruş · yeşil nokta: ±30 ms · sarı: ±70 ms · kırmızı: daha fazla · gri: fazla nota", "Line: beat · green: ±30 ms · yellow: ±70 ms · red: more · grey: extra note")}</div>`;
      }, (i, counting) => {
        const el = $("rhcount"); if(!el) return;
        const b = i % o.pattern.beats;
        el.textContent = counting ? L("Sayım ", "Count ") + (b + 1) : L("Ölçü ", "Bar ") + (Math.floor(i/o.pattern.beats)) + " · " + (b + 1);
      });
    });

    // ---- Gecikme ölçümü ----
    async function calibrate(speaker){
      const msg = $("rhcalmsg");
      if(!(await ctx.needMic())) return;
      const a = SK.audioCtx(), n = 8, gap = 0.6, t0 = a.currentTime + 0.4, sched = [];
      for(let i=0;i<n;i++){
        const at = t0 + i*gap;
        if(speaker){
          const o = a.createOscillator(), g = a.createGain();
          o.frequency.value = 880; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.5, at + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08); o.connect(g).connect(a.destination); o.start(at); o.stop(at + 0.1);
        }else ctx.hit(a, "T", at, 1);
        sched.push(ctxToPerf(a, at));
      }
      msg.textContent = speaker ? L("Ölçülüyor… sessiz kal.", "Measuring… stay quiet.") : L("Her bipte kısa bir nota çal…", "Play a short note on each beep…");
      const got = []; let lastRise = -1e9, floor = 1;
      const det = new OnsetDetector();
      const off = SK.level(f => {
        if(speaker){
          // Bip perdesiz de algılanabilir: seviyenin ani yükselişi
          floor = Math.min(floor, f.rms + 1e-5);
          if(f.rms > floor*6 && f.t - lastRise > 300){ lastRise = f.t; got.push(f.tOn != null ? f.tOn : f.t); }
        }else{ const o = det.push(f); if(o !== null) got.push(o); }
      });
      await new Promise(r => setTimeout(r, (t0 - a.currentTime + n*gap + 0.4)*1000));
      off();
      const devs = sched.map(s => { const g = got.filter(x => Math.abs(x - s) < gap*500).sort((x, y) => Math.abs(x - s) - Math.abs(y - s))[0]; return g == null ? null : g - s; }).filter(x => x !== null);
      if(devs.length < n/2){ msg.textContent = L("Yeterli ölçüm alınamadı (" + devs.length + "/" + n + "). Sesi aç ya da yeniden dene.", "Not enough measurements (" + devs.length + "/" + n + "). Turn the volume up or try again."); return; }
      devs.sort((x, y) => x - y);
      const lat = Math.round(devs[Math.floor(devs.length/2)]);
      store.set("rhythm.lat", lat); showLat();
      msg.textContent = L("Gecikme ", "Latency ") + lat + L(" ms olarak kaydedildi (" + devs.length + " ölçüm, yayılım ±" + Math.round(sd(devs)) + " ms).", " ms saved (" + devs.length + " measurements, spread ±" + Math.round(sd(devs)) + " ms).");
    }
    $("rhcalsp").addEventListener("click", () => calibrate(true));
    $("rhcalpl").addEventListener("click", () => calibrate(false));
    $("rhcal0").addEventListener("click", () => { store.set("rhythm.lat", 0); showLat(); $("rhcalmsg").textContent = ""; });
    return { leave(){ if(run){ run.stop(); run = null; $("rhstart").textContent = L("Başlat", "Start"); } } };
  },

  // ======== Kulak eğitimi ========
  ear(ctx){
    const { SK, $, store, sleep } = ctx;
    const P = $("pp-ear");
    P.innerHTML = `
      <p class="pdesc">${L("Koma farklarını duymayı öğren. Tiz mi pes mi: iki ses arasındaki fark doğru cevapladıkça küçülür; en sonunda ayırt edebildiğin en küçük farkı (koma) gösterir. Perde ayırt: A ve B perdelerini dinle, sonra X hangisiydi? Makam tanı: kısa ezgiyi dinle, makamını seç.",
        "Learn to hear comma differences. Higher or lower: the gap shrinks as you answer correctly and ends with the smallest difference you can hear (in commas). Perde ABX: listen to A and B, then which one was X? Makam ID: listen to a short phrase and name its makam.")}</p>
      <div class="pbar">
        <div class="seg" role="radiogroup" id="eamode" aria-label="${L("Kulak alıştırması", "Ear exercise")}">
          <button type="button" role="radio" data-m="pitch">${L("Tiz mi pes mi", "Higher or lower")}</button>
          <button type="button" role="radio" data-m="abx">${L("Perde ayırt", "Perde ABX")}</button>
          <button type="button" role="radio" data-m="makam">${L("Makam tanı", "Makam ID")}</button>
        </div>
        <select id="ealevel" aria-label="${L("Seviye", "Level")}"></select>
        <button class="primary small" id="eastart" type="button">${L("Başlat", "Start")}</button>
      </div>
      <div class="stage" id="eastage"><div class="muted">${L("Kulaklıkla dinlemek daha iyi sonuç verir.", "Headphones give better results.")}</div></div>`;
    const stage = $("eastage");
    let mode = store.get("ear.mode", "pitch"), game = null;
    const LEVELS = {
      pitch: [],
      abx: [["1", L("Kolay (4–5 koma)", "Easy (4–5 commas)")], ["2", L("Orta (2–3 koma)", "Medium (2–3 commas)")], ["3", L("Zor (1 koma)", "Hard (1 comma)")]],
      makam: [["basic", L("Temel 9 makam", "9 basic makams")], ["all", L("Bütün makamlar", "All makams")]]
    };
    function setMode(m){
      mode = m; store.set("ear.mode", m); game = null;
      $("eamode").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", b.dataset.m === m ? "true" : "false"));
      $("ealevel").innerHTML = LEVELS[m].map(([v, t]) => `<option value="${v}">${t}</option>`).join("");
      $("ealevel").hidden = !LEVELS[m].length;
      $("ealevel").value = store.get("ear.level." + m, LEVELS[m].length ? LEVELS[m][0][0] : "");
      const best = store.get("ear.best", {});
      stage.innerHTML = `<div class="muted">${m === "pitch" && best.pitch ? L("En iyi eşiğin: ", "Your best threshold: ") + ctx.num(best.pitch) + L(" koma", " commas") : m === "makam" && best.makam ? L("Makam tanıma rekoru: ", "Makam ID record: ") + best.makam : L("Başlat'a bas.", "Press Start.")}</div>`;
    }
    $("eamode").addEventListener("click", e => { const b = e.target.closest("button"); if(b) setMode(b.dataset.m); });
    $("ealevel").addEventListener("change", () => store.set("ear.level." + mode, $("ealevel").value));
    setMode(mode);
    const tone = async (c, ms = 700) => { SK.play(commaToWritten(Math.round(c)), ctx.commaFreq(c)); await sleep(ms); SK.stopSound(); await sleep(250); };
    const saveBest = (k, v, lower) => { const b = store.get("ear.best", {}); if(b[k] == null || (lower ? v < b[k] : v > b[k])){ b[k] = v; store.set("ear.best", b); return true; } return false; };

    async function pitchRound(){
      const g = game;
      const base = [0, 9, 17, 22, 31, 40][Math.floor(Math.random()*6)], up = Math.random() < 0.5;
      g.q = { up, done:false };
      stage.innerHTML = `<div class="qcount">${L("Soru ", "Question ")}${g.k + 1}/30 · ${L("fark ", "gap ")}${ctx.num(g.sc.d)} ${L("koma", "commas")}</div>
        <div class="qopts"><button class="opt" type="button" data-a="up" disabled>${L("İkinci daha tiz", "Second is higher")}</button><button class="opt" type="button" data-a="down" disabled>${L("İkinci daha pes", "Second is lower")}</button></div>
        <div class="pbar"><button class="stopbtn" type="button" data-again>${L("Tekrar dinle", "Listen again")}</button></div><div class="fb" aria-live="polite"></div>`;
      g.play = async () => { await tone(base); await tone(base + (up ? g.sc.d : -g.sc.d)); };
      await g.play();
      if(game === g) stage.querySelectorAll(".opt").forEach(b => b.disabled = false);
    }
    async function abxRound(){
      const g = game, pairs = perdePairs(+$("ealevel").value);
      const [A, B] = pairs[Math.floor(Math.random()*pairs.length)], x = Math.random() < 0.5 ? A : B;
      g.q = { ans: x === A ? "A" : "B", done:false, A, B };
      stage.innerHTML = `<div class="qcount">${L("Soru ", "Question ")}${g.k + 1}/12 · ${g.right} ${L("doğru", "correct")}</div>
        <div class="muted">A: ${A[1]} · B: ${B[1]} (${B[0] - A[0]} ${L("koma", "commas")})</div>
        <div class="qopts"><button class="opt" type="button" data-a="A" disabled>X = A</button><button class="opt" type="button" data-a="B" disabled>X = B</button></div>
        <div class="pbar"><button class="stopbtn" type="button" data-again>${L("Tekrar dinle", "Listen again")}</button></div><div class="fb" aria-live="polite"></div>`;
      g.play = async () => { await tone(A[0]); await tone(B[0]); await sleep(300); await tone(x[0], 900); };
      await g.play();
      if(game === g) stage.querySelectorAll(".opt").forEach(b => b.disabled = false);
    }
    async function makamRound(){
      const g = game, pool = $("ealevel").value === "all" ? MAKAMS.map(m => m.id) : MAKAMS.slice(0, 9).map(m => m.id);
      const q = makamChoices(pool), mk = makamById(q.answer), phrase = makamPhrase(mk);
      g.q = { ans: q.answer, done:false };
      stage.innerHTML = `<div class="qcount">${L("Seri ", "Streak ")}${g.right}</div>
        <div class="qopts">${q.choices.map(id => `<button class="opt" type="button" data-a="${id}" disabled>${makamById(id).name}</button>`).join("")}</div>
        <div class="pbar"><button class="stopbtn" type="button" data-again>${L("Tekrar dinle", "Listen again")}</button></div><div class="fb" aria-live="polite"></div>`;
      g.play = async () => { for(const c of phrase){ if(game !== g) return; SK.play(commaToWritten(c), ctx.mkFreq(mk, c)); await sleep(430); } SK.stopSound(); };
      await g.play();
      if(game === g) stage.querySelectorAll(".opt").forEach(b => b.disabled = false);
    }
    const ROUND = { pitch: pitchRound, abx: abxRound, makam: makamRound };
    $("eastart").addEventListener("click", () => {
      game = { k:0, right:0, sc: new Staircase(6, 0.25, 12) };
      ROUND[mode]();
    });
    stage.addEventListener("click", async e => {
      if(!game) return;
      if(e.target.closest("[data-again]")){ if(game.play) game.play(); return; }
      const b = e.target.closest(".opt[data-a]"); if(!b || !game.q || game.q.done) return;
      const g = game, a = b.dataset.a; g.q.done = true;
      const fb = stage.querySelector(".fb");
      let ok;
      if(mode === "pitch"){ ok = (a === "up") === g.q.up; g.sc.answer(ok); }
      else ok = a === g.q.ans;
      if(ok) g.right++;
      b.classList.add(ok ? "right" : "wrong");
      if(!ok) stage.querySelector(`.opt[data-a="${mode === "pitch" ? (g.q.up ? "up" : "down") : g.q.ans}"]`).classList.add("right");
      fb.className = "fb " + (ok ? "good" : "bad");
      fb.textContent = ok ? L("Doğru!", "Correct!") : mode === "makam" ? L("Bu ", "That was ") + makamById(g.q.ans).name + L(" idi.", ".") : L("Yanlış.", "Wrong.");
      g.k++;
      await sleep(ok ? 800 : 1600);
      if(game !== g) return;
      if(mode === "makam" && !ok){
        const rec = saveBest("makam", g.right, false);
        stage.innerHTML = `<div class="result"><div class="big">${g.right}</div><div>${L("art arda doğru", "in a row")}${rec ? " · " + L("yeni rekor", "new record") : ""}</div></div>`;
        game = null; return;
      }
      const N = mode === "pitch" ? 30 : mode === "abx" ? 12 : Infinity;
      if(g.k >= N){
        if(mode === "pitch"){
          const th = g.sc.threshold() || g.sc.d, rec = saveBest("pitch", Math.round(th*100)/100, true);
          stage.innerHTML = `<div class="result"><div class="big">${ctx.num(th)}</div><div>${L("koma: ayırt edebildiğin en küçük fark", "commas: the smallest difference you can hear")}${rec ? " · " + L("yeni rekor", "new record") : ""}</div></div>
            <div class="muted">${th <= 1 ? L("Bir komayı duyabiliyorsun: Segâh ile Bûselik'i ayırmaya hazırsın.", "You can hear one comma: ready to tell Segâh from Bûselik.") : th <= 2.5 ? L("İyi; 1 komaya inmek için her gün birkaç tur yap.", "Good; a few rounds a day will get you to 1 comma.") : L("Kulak eğitimi zamanla gelişir; dronla uzun ton çalışmak çok yardımcı olur.", "Ear training improves over time; long tones over a drone help a lot.")}</div>`;
        }else{
          stage.innerHTML = `<div class="result"><div class="big">${g.right}/${g.k}</div><div>${L("doğru", "correct")}</div></div>`;
        }
        store.set("ear.rounds", (store.get("ear.rounds", 0)) + 1);
        game = null; return;
      }
      ROUND[mode]();
    });
    return { leave(){ game = null; SK.stopSound(); } };
  },

  // ======== Seyir (serbest çalma / taksim) ========
  seyir(ctx){
    const { SK, $, store } = ctx;
    const P = $("pp-seyir");
    P.innerHTML = `
      <p class="pdesc">${L("Seçili makamda serbestçe çal (taksim gibi). Uygulama hangi perdelerde ne kadar durduğunu, dizi dışına çıkıp çıkmadığını, güçlüyü vurgulayıp vurgulamadığını, açılışın makamın seyrine uyup uymadığını ve durakta karar verip vermediğini değerlendirir.",
        "Play freely in the selected makam (like a taksim). The app shows how long you stayed on each perde, whether you left the scale, emphasised the dominant, opened according to the makam's seyir, and resolved on the final.")}</p>
      <div class="pbar">
        <select id="symk" aria-label="Makam">${MAKAMS.map(m => `<option value="${m.id}">${m.name}</option>`).join("")}</select>
        <div class="seg" role="radiogroup" id="sydur" aria-label="${L("Süre", "Duration")}">${[30, 60, 120].map(s => `<button type="button" role="radio" data-s="${s}">${s} ${L("sn", "s")}</button>`).join("")}</div>
        <button class="stopbtn" id="sydrone" type="button">${L("Durağı dron yap", "Final as drone")}</button>
        <button class="primary small" id="systart" type="button">${L("Başlat", "Start")}</button>
      </div>
      <div class="muted" id="syinfo"></div>
      <div class="stage" id="systage"><div class="muted">${L("Makamı seç, başlat ve çal; bitirince durdur ya da süre dolsun.", "Pick the makam, start and play; stop when done or let the timer run out.")}</div></div>`;
    const stage = $("systage");
    let dur = store.get("seyir.dur", 60), rec = null;
    $("symk").value = store.get("seyir.mk", "ussak");
    const mkNow = () => makamById($("symk").value);
    const info = () => { const mk = mkNow(); $("syinfo").textContent = mk.name + " · " + L("durak ", "final ") + perdeName(mk.durak) + " · " + L("güçlü ", "dominant ") + perdeName(mk.guclu) + " · " + seyirText(mk, LANG); SK.setTempContext(mk.id); };
    $("symk").addEventListener("change", () => { store.set("seyir.mk", $("symk").value); info(); });
    const setDur = s => { dur = s; store.set("seyir.dur", s); $("sydur").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", +b.dataset.s === s ? "true" : "false")); };
    $("sydur").addEventListener("click", e => { const b = e.target.closest("button"); if(b) setDur(+b.dataset.s); });
    setDur(dur);
    $("sydrone").addEventListener("click", () => ctx.droneOn(mkNow().durak));
    function finish(){
      const r = rec; rec = null; clearInterval(r.timer);
      $("systart").textContent = L("Başlat", "Start");
      const notes = segmentNotes(r.frames, 150), mk = mkNow(), res = seyirAnalysis(notes, mk);
      if(!res){ stage.innerHTML = `<div class="muted">${L("Yeterince nota yok; en az birkaç uzun nota çal.", "Not enough notes; play at least a few long notes.")}</div>`; return; }
      const hist = store.get("seyir.hist", []); hist.push({ d: dayKey(new Date()), mk: mk.id, score: res.score }); store.set("seyir.hist", hist.slice(-100));
      const perdes = Object.entries(res.time).sort((a, b) => +a[0] - +b[0]), max = Math.max(...perdes.map(([, v]) => v));
      stage.innerHTML = `<div class="result"><div class="big">${res.score}</div><div>${L("puan", "points")} · ${mk.name} · ${notes.length} ${L("nota", "notes")}</div></div>
        <ul class="lstips">${seyirFeedback(res, mk, LANG).map(t => `<li>${ctx.esc(t)}</li>`).join("")}</ul>
        <div class="label">${L("Perdelerde geçen süre", "Time on each perde")}</div>
        <div class="bars sybars">${perdes.map(([p, v]) => `<div class="barcol" title="${perdeName(+p)}: ${ctx.num(v/1000)} s"><i style="height:${Math.round(v/max*100)}%" class="${(+p - mk.durak) % 53 === 0 ? "durak" : (+p - mk.guclu) % 53 === 0 ? "guclu" : ""}"></i><small>${perdeName(+p)}</small></div>`).join("")}</div>
        <div class="muted small">${L("Koyu: durak · turuncu: güçlü", "Dark: final · orange: dominant")}</div>`;
    }
    $("systart").addEventListener("click", async () => {
      if(rec){ finish(); return; }
      if(!(await ctx.needMic())) return;
      rec = { frames:[], t0: performance.now(), timer: setInterval(() => {
        const el = (performance.now() - rec.t0)/1000;
        const c = $("syclock"); if(c) c.innerHTML = ctx.num(el, 0) + ` <em>/ ${dur} ${L("sn", "s")}</em>`;
        if(el >= dur) finish();
      }, 250) };
      $("systart").textContent = L("Bitir", "Finish");
      stage.innerHTML = `<div class="ltclock" id="syclock">0 <em>/ ${dur} ${L("sn", "s")}</em></div><div class="muted">${L("Çal… durakta karar verip bitir.", "Play… resolve on the final and finish.")}</div>`;
    });
    SK.on("note", d => { if(rec) rec.frames.push({ t:d.t, written:d.r.written, comma:d.r.comma }); });
    SK.on("silence", d => { if(rec) rec.frames.push({ t:d.t, written:null }); });
    return { enter: info, leave(){ SK.setTempContext(null); if(rec) finish(); } };
  }
};

// ======== Ders adımları ========
// Her biri (st, stage, done, ctx) alır, { note, silence, raw, stop } döndürür (practice.js'teki RUN ile aynı biçim)
const TRAINER_STEPS = {
  // Okuma adımı: metin dersleri (bakım, duruş, nota okuma); "Okudum" ile geçilir
  read(st, stage, done){
    stage.innerHTML = (st.body || []).map(t => `<p>${pick(t, LANG)}</p>`).join("") +
      `<div class="pbar"><button class="primary small" type="button" data-read>${L("Okudum, anladım", "Read and understood")}</button></div>`;
    stage.querySelector("[data-read]").addEventListener("click", () => done({ v:1 }));
    return {};
  },

  rhythm(st, stage, done, ctx){
    const pattern = st.usul ? (() => { const s = usulSlots(USULS.find(u => u.id === st.usul)); return { beats:s.length, at:usulStrokeTimes(s), accents:s }; })()
                            : RHYTHM_PATTERNS.find(p => p.id === st.pattern);
    const beatMs = 60000/st.tempo;
    stage.innerHTML = `<div class="qname lrc">…</div><div class="muted">${L("Sayım: ilk ölçüyü dinle, sonra çal.", "Count-in: listen to the first bar, then play.")}</div>`;
    const r = rhythmRun(ctx, { beatMs, pattern, bars: st.bars || 4, silent: !!st.silent, accents: pattern.accents }, run => {
      const res = rhythmEval(ctx, run, beatMs, pattern);
      stage.innerHTML = rhythmText(res) + rhythmSvg(run, res);
      done({ v: res.score });
    }, (i, counting) => {
      const el = stage.querySelector(".lrc"); if(!el) return;
      el.textContent = counting ? L("Sayım ", "Count ") + (i % pattern.beats + 1) : String(i % pattern.beats + 1);
    });
    return { stop(){ r.stop(); } };
  },

  dynamics(st, stage, done, ctx){
    const names = { cresc: L("hafiften güçlüye (crescendo)", "soft to loud (crescendo)"), dim: L("güçlüden hafife (decrescendo)", "loud to soft (decrescendo)"), messa: L("hafif → güçlü → hafif", "soft → loud → soft") };
    let frames = [], start = null, lastOk = 0, ended = false;
    stage.innerHTML = `<div class="label">${ctx.nn(st.note)} · ${names[st.shape]} · ${st.sec} ${L("sn", "s")}</div>
      <div class="ltclock ldc">0,0 <em>/ ${st.sec} ${L("sn", "s")}</em></div><div class="pbarfill"><i class="ldf"></i></div>
      <canvas class="dyncv" width="300" height="60"></canvas><div class="muted ldm"></div>`;
    ctx.SK.showNote(st.note);
    const cv = stage.querySelector(".dyncv");
    function draw(){
      const g = cv.getContext("2d"); g.clearRect(0, 0, 300, 60);
      g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent"); g.lineWidth = 2; g.beginPath();
      frames.forEach((f, i) => { const x = (f.t - frames[0].t)/(st.sec*1000)*300, y = 58 - Math.max(0, Math.min(56, (20*Math.log10(Math.max(f.rms, 1e-6)) + 60)/60*56)); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
    function end(t){
      if(ended) return; ended = true;
      const r = dynamicsEval(frames, st.shape);
      if(!r){ ended = false; frames = []; start = null; stage.querySelector(".ldm").textContent = L("Nota tutulamadı, yeniden dene.", "The note wasn't held, try again."); return; }
      stage.querySelector(".ldm").innerHTML = `${L("Ses aralığı ", "Range ")}<strong>${Math.round(r.range)} dB</strong> · ${L("şekle uyum ", "shape fit ")}<strong>%${Math.round(Math.max(0, r.fit)*100)}</strong> · ${L("perde kayması ", "pitch drift ")}<strong>${ctx.num(r.drift)} ${L("koma", "commas")}</strong><br>` +
        (r.range < 10 ? L("Ses gücünü daha geniş değiştir (en az 10 dB). ", "Change the volume more (at least 10 dB). ") : "") +
        (r.fit < 0.7 ? L("Değişim düzgün olsun: yavaş ve sürekli. ", "Make the change smooth: slow and continuous. ") : "") +
        (r.drift > 2 ? L("Ses açılırken perde kaydı: dudak ve hava ile perdeyi sabit tut. ", "The pitch drifted with the volume: keep it steady with lips and air. ") : "") +
        (r.ok ? L("Güzel!", "Nice!") : "");
      done({ v: r.ok ? 1 : 0 });
    }
    return {
      raw(d){
        if(ended || start === null) return;
        frames.push({ t:d.t, rms:d.rms, comma:d.comma });
      },
      note(r, t){
        if(ended || !r.inRange) return;
        if(r.written !== st.note){ if(start && t - lastOk > 400) end(t); return; }
        if(start === null){ start = t; frames = []; }
        lastOk = t;
        const el = (t - start)/1000;
        stage.querySelector(".ldc").innerHTML = ctx.num(el) + ` <em>/ ${st.sec} ${L("sn", "s")}</em>`;
        stage.querySelector(".ldf").style.width = Math.min(100, el/st.sec*100) + "%";
        draw();
        if(el >= st.sec) end(t);
      },
      silence(t){ if(start && !ended && t - lastOk > 400) end(t); }
    };
  },

  seyir(st, stage, done, ctx){
    const mk = makamById(st.makam), frames = [], t0 = performance.now();
    let over = false;
    stage.innerHTML = `<div class="muted">${mk.name}: ${ctx.esc(seyirText(mk, LANG))}</div>
      <div class="ltclock lyc">0 <em>/ ${st.sec} ${L("sn", "s")}</em></div>
      <div class="pbar"><button class="stopbtn" type="button" data-fin>${L("Bitir", "Finish")}</button></div><div class="lyr"></div>`;
    const timer = setInterval(() => {
      const el = (performance.now() - t0)/1000;
      const c = stage.querySelector(".lyc"); if(c) c.innerHTML = ctx.num(el, 0) + ` <em>/ ${st.sec} ${L("sn", "s")}</em>`;
      if(el >= st.sec) fin();
    }, 250);
    function fin(){
      if(over) return; over = true; clearInterval(timer);
      const res = seyirAnalysis(segmentNotes(frames, 150), mk);
      if(!res){ stage.querySelector(".lyr").innerHTML = `<div class="fb bad">${L("Yeterince nota yok.", "Not enough notes.")}</div>`; done({ v:0 }); return; }
      stage.querySelector(".lyr").innerHTML = `<div class="result"><div class="big">${res.score}</div><div>${L("puan", "points")}</div></div><ul class="lstips">${seyirFeedback(res, mk, LANG).map(t => `<li>${ctx.esc(t)}</li>`).join("")}</ul>`;
      done({ v: res.score });
    }
    stage.querySelector("[data-fin]").addEventListener("click", fin);
    return {
      note(r, t){ if(!over) frames.push({ t, written:r.written, comma:r.comma }); },
      silence(t){ if(!over) frames.push({ t, written:null }); },
      stop(){ over = true; clearInterval(timer); }
    };
  },

  // Kulak adımı: n soruluk perde ayırt (abx) ya da makam tanı; en az min doğru
  ear(st, stage, done, ctx){
    const { SK, sleep } = ctx;
    let k = 0, right = 0, q = null, alive = true;
    const tone = async (c, ms = 700) => { SK.play(commaToWritten(Math.round(c)), ctx.commaFreq(c)); await sleep(ms); SK.stopSound(); await sleep(220); };
    async function ask(){
      if(!alive) return;
      if(k >= st.n){ stage.innerHTML = `<div class="result"><div class="big">${right}/${st.n}</div><div>${L("doğru", "correct")}</div></div>`; return done({ v:right }); }
      if(st.mode === "makam"){
        const qq = makamChoices(st.pool), mk = makamById(qq.answer);
        q = { ans: qq.answer, done:false };
        stage.innerHTML = `<div class="qcount">${k + 1}/${st.n}</div><div class="qopts">${qq.choices.map(id => `<button class="opt" type="button" data-a="${id}" disabled>${makamById(id).name}</button>`).join("")}</div><div class="fb"></div>`;
        q.play = async () => { for(const c of makamPhrase(mk)){ if(!alive) return; SK.play(commaToWritten(c), ctx.mkFreq(mk, c)); await sleep(430); } SK.stopSound(); };
      }else{
        const pairs = perdePairs(st.level || 1), [A, B] = pairs[Math.floor(Math.random()*pairs.length)], x = Math.random() < 0.5 ? A : B;
        q = { ans: x === A ? "A" : "B", done:false };
        stage.innerHTML = `<div class="qcount">${k + 1}/${st.n}</div><div class="muted">A: ${A[1]} · B: ${B[1]}</div>
          <div class="qopts"><button class="opt" type="button" data-a="A" disabled>X = A</button><button class="opt" type="button" data-a="B" disabled>X = B</button></div><div class="fb"></div>`;
        q.play = async () => { await tone(A[0]); await tone(B[0]); await sleep(250); await tone(x[0], 900); };
      }
      const my = q; await q.play();
      if(alive && q === my) stage.querySelectorAll(".opt").forEach(b => b.disabled = false);
    }
    stage.addEventListener("click", async e => {
      const b = e.target.closest(".opt[data-a]"); if(!b || !q || q.done) return;
      q.done = true; const ok = b.dataset.a === q.ans; if(ok) right++;
      b.classList.add(ok ? "right" : "wrong");
      stage.querySelector(".fb").textContent = ok ? L("Doğru!", "Correct!") : L("Yanlış.", "Wrong.");
      k++; await sleep(ok ? 700 : 1400); ask();
    });
    ask();
    return { stop(){ alive = false; SK.stopSound(); } };
  }
};
