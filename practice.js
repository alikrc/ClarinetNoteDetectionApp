// Çalışma bölümü: parmak testi, uzun ton, makam, taklit, eser takibi, kayıt, ilerleme;
// usullü metronom ve durak sesi. Mantık learn.js'te; mikrofon ve ses index.html'deki window.SK üzerinden.
(function(){
  const SK = window.SK;
  if(!SK) return;
  const $ = id => document.getElementById(id);
  const store = SK.store, T = SK.T;
  const nn = w => LANG === "en" ? noteName(w).en : noteName(w).tr;
  const num = (v, d=1) => v.toFixed(d).replace(".", ",");
  const sgn = (v, d=1) => { const r = Math.round(v*10**d)/10**d; return (r>0 ? "+" : r<0 ? "−" : "±") + num(Math.abs(r), d); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const commaFreq = c => midiToFreq(commaToMidi(c) - T);
  // Seçili akortta (AEU / icra) bir makam perdesinin hedefi ve sesi
  const tgt = (mk, c) => perdeTarget(mk, c, SK.tuningMode());
  const mkFreq = (mk, c) => commaFreq(tgt(mk, c));
  const perdeOf = w => { const p = nearestPerde((w-67)*53/12); return p ? p.name : ""; };
  const label = w => nn(w) + (perdeOf(w) ? " · " + perdeOf(w) : "");
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---- İskelet ----
  // Dersler ilk sekmedir; mantığı ve verisi lessons.js'te
  const TABS = [["lessons","Dersler"],["quiz","Parmak testi"],["long","Uzun ton"],["makam","Makam"],["mimic","Taklit"],
                ["rhythm",L("Ritim", "Rhythm")],["ear",L("Kulak", "Ear")],["seyir",L("Seyir", "Seyir")],
                ["piece",L("Eserler", "Pieces")],["rec","Kayıt"],["progress","İlerleme"]];
  const root = $("practice");
  root.innerHTML = `
    <div class="phead">
      <div class="label">Çalışma</div>
      <span class="reg"><span id="pgoal"></span> · <span id="pmic"></span></span>
    </div>
    <div class="tools">
      <div class="tool">
        <span class="label">Usullü metronom</span>
        <div class="trow">
          <select id="usul" aria-label="Usul">${USULS.map(u => `<option value="${u.id}">${u.name} ${u.meter}</option>`).join("")}</select>
          <label class="tnum"><input id="tempo" type="number" min="30" max="300" step="2" value="120" aria-label="Tempo"> <em>vuruş/dk</em></label>
          <button class="stopbtn" id="metbtn" type="button">Başlat</button>
        </div>
        <div class="slots" id="slots" aria-hidden="true"></div>
      </div>
      <div class="tool">
        <span class="label">Durak sesi (dron)</span>
        <div class="trow">
          <select id="dronep" aria-label="Dron perdesi"></select>
          <input id="dronevol" type="range" min="1" max="10" value="4" aria-label="Dron ses düzeyi">
          <button class="stopbtn" id="dronebtn" type="button">Aç</button>
        </div>
        <div class="reg">Kulaklık önerilir. Dron açıkken dron perdesiyle aynı ses (oktavı dahil) algılanmaz.</div>
      </div>
    </div>
    <div class="ptabs" role="tablist" aria-label="Çalışma türü">
      ${TABS.map(([id, name]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="pp-${id}" data-tab="${id}">${name}</button>`).join("")}
    </div>
    ${TABS.map(([id]) => `<div class="ppanel" role="tabpanel" id="pp-${id}" aria-labelledby="tab-${id}" hidden></div>`).join("")}
  `;

  const micNote = $("pmic");
  function micHint(){ micNote.textContent = SK.isListening() ? "mikrofon açık" : "çoğu alıştırma mikrofon ister"; }
  SK.on("mic", micHint); micHint();
  async function needMic(){ if(!SK.isListening()) await SK.startMic(); return SK.isListening(); }

  // Etkin modül kararlı nota/sessizlik olaylarını alır
  const modules = {};
  let active = null;
  function selectTab(id){
    if(active && modules[active].leave) modules[active].leave();
    active = id; store.set("ptab", id);
    TABS.forEach(([t]) => {
      $("tab-"+t).setAttribute("aria-selected", t===id ? "true" : "false");
      $("tab-"+t).tabIndex = t===id ? 0 : -1;
      $("pp-"+t).hidden = t!==id;
    });
    if(modules[id].enter) modules[id].enter();
  }
  root.querySelector(".ptabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if(b) selectTab(b.dataset.tab); });
  root.querySelector(".ptabs").addEventListener("keydown", e => {
    const step = {ArrowRight:1, ArrowLeft:-1}[e.key];
    if(!step) return;
    e.preventDefault();
    const i = (TABS.findIndex(([t]) => t===active) + step + TABS.length) % TABS.length;
    selectTab(TABS[i][0]); $("tab-"+TABS[i][0]).focus();
  });
  SK.on("note", d => { const m = modules[active]; if(m && m.note) m.note(d.r, d.t); });
  SK.on("silence", d => { const m = modules[active]; if(m && m.silence) m.silence(d.t); });
  SK.on("raw", d => { const m = modules[active]; if(m && m.raw) m.raw(d); });

  // Aynı notanın ne kadar süredir tutulduğunu izler (yanlış notalar ve sessizlik sıfırlar)
  function holder(){
    let w = null, since = 0, fired = false;
    return {
      push(written, t){ if(written !== w){ w = written; since = t; fired = false; } return { w, ms: t - since, fired }; },
      fire(){ fired = true; },
      reset(){ w = null; fired = false; }
    };
  }

  // ---- Ses: metronom ve dron (ana sentezleyicinin ses bağlamı) ----
  const slotsEl = $("slots");
  let met = null;
  function drawSlots(u, cur = -1){
    slotsEl.innerHTML = usulSlots(u).map((s, i) =>
      `<i class="${s==="D" ? "dum" : s==="T" ? "tek" : "rest"}${i===cur ? " now" : ""}">${s==="D" ? "Düm" : s==="T" ? "Tek" : "·"}</i>`).join("");
  }
  function hit(a, kind, t, vol = 1){
    const g = a.createGain();
    g.connect(a.destination);
    if(kind === "D"){
      // Düm: perde bulucunun alt sınırının (100 Hz) altında kalır, nota sanılmaz
      const o = a.createOscillator();
      o.frequency.setValueAtTime(85, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
      g.gain.setValueAtTime(0.6*vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); o.start(t); o.stop(t + 0.32);
    }else{
      // Tek: süzülmüş gürültü, perdesiz
      const len = Math.round(a.sampleRate*0.06), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
      for(let i=0;i<len;i++) ch[i] = (Math.random()*2-1) * (1 - i/len);
      const src = a.createBufferSource(), f = a.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = 1.2;
      src.buffer = buf; src.connect(f).connect(g);
      g.gain.setValueAtTime(0.5*vol, t);
      src.start(t);
    }
  }
  function startMet(){
    const a = SK.audioCtx(), u = USULS.find(x => x.id === $("usul").value), slots = usulSlots(u);
    let i = 0, next = a.currentTime + 0.1;
    met = { timer: setInterval(() => {
      const per = 60 / Math.max(30, Math.min(300, +$("tempo").value || 120));
      while(next < a.currentTime + 0.12){
        const k = i % slots.length, at = next;
        if(slots[k]) hit(a, slots[k], at);
        setTimeout(() => { if(met) drawSlots(u, k); }, Math.max(0, (at - a.currentTime)*1000));
        next += per; i++;
      }
    }, 25) };
    $("metbtn").textContent = "Durdur";
  }
  function stopMet(){
    if(met){ clearInterval(met.timer); met = null; }
    $("metbtn").textContent = "Başlat";
    drawSlots(USULS.find(x => x.id === $("usul").value));
  }
  $("usul").value = store.get("usul", "sofyan");
  $("tempo").value = store.get("tempo", 120);
  $("usul").addEventListener("change", () => { store.set("usul", $("usul").value); if(met){ stopMet(); startMet(); } else stopMet(); });
  $("tempo").addEventListener("change", () => store.set("tempo", +$("tempo").value));
  $("metbtn").addEventListener("click", () => met ? stopMet() : startMet());
  stopMet();

  const dronSel = $("dronep");
  PERDES.filter(([c]) => c >= -22 && c <= 62).forEach(([c, n]) => {
    const o = document.createElement("option"); o.value = c; o.textContent = n + " (yazılı " + nn(commaToWritten(c)) + ")";
    dronSel.appendChild(o);
  });
  dronSel.value = store.get("drone", 0);
  let drone = null;
  function startDrone(){
    const a = SK.audioCtx(), c = +dronSel.value, f = commaFreq(c);
    const g = a.createGain(), lp = a.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1200;
    g.gain.setValueAtTime(0.0001, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.02 * +$("dronevol").value, a.currentTime + 0.4);
    const oscs = [f, f/2].map(fr => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(lp); o.start(); return o; });
    lp.connect(g).connect(a.destination);
    drone = { g, oscs, f }; droneLv = []; SK.droneActive = true;
    $("dronebtn").textContent = "Kapat";
  }
  function stopDrone(){
    if(drone){
      const a = SK.audioCtx(), t = a.currentTime;
      drone.g.gain.cancelScheduledValues(t);
      drone.g.gain.setValueAtTime(Math.max(drone.g.gain.value, 0.0001), t);
      drone.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      drone.oscs.forEach(o => o.stop(t + 0.35));
      drone = null; SK.droneActive = false;
    }
    $("dronebtn").textContent = "Aç";
  }
  function setDrone(c){ dronSel.value = c; store.set("drone", c); if(drone){ stopDrone(); startDrone(); } }
  dronSel.addEventListener("change", () => setDrone(+dronSel.value));
  $("dronevol").addEventListener("input", () => { if(drone) drone.g.gain.setTargetAtTime(0.02 * +$("dronevol").value, SK.audioCtx().currentTime, 0.05); });
  $("dronebtn").addEventListener("click", () => drone ? stopDrone() : startDrone());

  // Kayıt dinletilirken ya da dron çalarken mikrofon o sesi nota saymasın.
  // Dronun hoparlörden mikrofona sızan seviyesi son 10 saniyenin alt %10'luk dilimiyle (nefes aralarından) izlenir; bunun iki katından
  // güçlü ses öğrencinin sesidir (durağı dronla birlikte çalmak da ölçülür). Sızıntı düzeyindeki her ölçüm yok sayılır.
  let playbackMute = false, droneLv = [];
  SK.on("level", d => {
    if(!drone) return;
    droneLv.push(d.rms); if(droneLv.length > 220) droneLv.shift();
  });
  const droneFloor = () => droneLv.length < 10 ? Infinity : [...droneLv].sort((a,b) => a-b)[Math.floor(droneLv.length*0.1)];
  SK.ignore = (f, rms) => {
    if(playbackMute) return true;
    if(!drone) return false;
    const floor = droneFloor();
    if(rms < floor*1.3) return true;
    const c = 1200*Math.log2(f/drone.f), r = ((c % 1200) + 1200) % 1200;
    return Math.min(r, 1200 - r) < 25 && !(rms > floor*2);
  };
  document.addEventListener("visibilitychange", () => { if(document.hidden){ stopMet(); stopDrone(); } });

  // Günlük hedef: bugünkü sesli çalma süresi / hedef (dakika)
  function goalText(){
    const goal = store.get("goal.min", 15), today = Math.floor((days[dayKey(new Date())] || 0)/60);
    const el = $("pgoal"); if(!el) return;
    el.textContent = L("Bugün ", "Today ") + today + "/" + goal + L(" dk", " min") + (today >= goal ? " ✓" : "");
    el.classList.toggle("goalok", today >= goal);
  }
  setInterval(goalText, 5000);

  // ---- Her zaman çalışanlar: entonasyon istatistiği, pratik süresi, vibrato, glissando ----
  const intStats = store.get("int.stats", {});
  let intDirty = false;
  const collector = new NoteStatCollector((w, m) => { statAdd(intStats, w, m); intDirty = true; paintHeat(); });
  SK.on("note", d => { if(d.r.inRange && d.r.perde) collector.push(d.r.written, d.r.perde.delta, d.t); });
  SK.on("silence", () => collector.flush());

  const days = store.get("days", {});
  goalText();
  let lastRaw = 0, unsaved = 0;
  SK.on("raw", d => {
    const dt = d.t - lastRaw; lastRaw = d.t;
    if(dt > 0 && dt < 250){
      const k = dayKey(new Date());
      days[k] = (days[k] || 0) + dt/1000; unsaved += dt;
    }
    if(unsaved > 5000){ unsaved = 0; store.set("days", days); }
    if(intDirty){ intDirty = false; store.set("int.stats", intStats); }
  });
  let resetting = false;
  window.addEventListener("pagehide", () => { if(!resetting && !window.SK_RESETTING){ store.set("days", days); store.set("int.stats", intStats); } });

  // Vibrato: kararlı notanın son 1,5 saniyesindeki ham ölçümler
  const vibEl = $("vib");
  let vibFrames = [], vibNote = null, vibT = 0;
  SK.on("raw", d => {
    if(vibNote === null) return;
    vibFrames.push({ t:d.t, comma:d.comma });
    while(vibFrames.length && d.t - vibFrames[0].t > 1500) vibFrames.shift();
    if(d.t - vibT > 250){
      vibT = d.t;
      const v = vibrato(vibFrames, SK.windowSec());
      vibEl.innerHTML = v ? num(v.rate) + " <em>Hz</em> ±" + num(v.depth) + " <em>koma</em>" : "— <em>düz</em>";
    }
  });
  // Glissando: iki kararlı nota arasındaki geçiş kareleri
  let lastStable = null, between = [];
  SK.on("raw", d => between.push({ t:d.t, comma:d.comma }));
  SK.on("note", d => {
    if(d.r.written !== vibNote){ vibNote = d.r.written; vibFrames = []; }
    if(lastStable && lastStable.written !== d.r.written && isGlide([lastStable, ...between])) SK.markGlide(d.t);
    lastStable = { t:d.t, comma:d.r.comma, written:d.r.written };
    between = [];
  });
  SK.on("silence", () => {
    lastStable = null; between = []; vibNote = null; vibFrames = [];
    vibEl.innerHTML = "—";
  });

  // ---- Nota şeridi: entonasyon ısı haritası ve makam işaretleri ----
  const heatBtn = $("heatbtn");
  let heatOn = store.get("heat", false);
  function paintHeat(){
    SK.cells.forEach((el, w) => {
      const cls = heatOn ? heatClass(intStats[w]) : null;
      el.classList.remove("heat-sharp", "heat-flat", "heat-clean");
      if(cls) el.classList.add("heat-" + cls);
      const s = intStats[w];
      el.title = heatOn && s && s.n >= 3 ? "ortalama " + sgn(s.sum/s.n) + " koma (" + s.n + " ölçüm)" : "";
    });
    heatBtn.setAttribute("aria-pressed", heatOn ? "true" : "false");
    $("heatlg").hidden = !heatOn;
  }
  heatBtn.addEventListener("click", () => { heatOn = !heatOn; store.set("heat", heatOn); paintHeat(); });
  paintHeat();
  const markScale = mk => SK.markScale(mk);

  // Parmak şemasının küçük kopyası (test için; notanın adı gizli kalır)
  function miniChart(){
    const c = document.querySelector("svg.chart").cloneNode(true);
    c.querySelectorAll("[id]").forEach(n => { n.id = "q-" + n.id; n.removeAttribute("tabindex"); n.removeAttribute("role"); n.removeAttribute("aria-label"); n.removeAttribute("aria-pressed"); });
    c.classList.add("minichart"); c.setAttribute("aria-label", "Sorulan parmak pozisyonu");
    return c;
  }
  function paintMini(svg, code){
    const on = new Set(fingeringIds(code).map(i => "q-" + i));
    svg.querySelectorAll(".hole, .key").forEach(n => n.classList.toggle("on", on.has(n.id)));
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function staffSvg(){ const s = document.createElementNS(SVGNS, "svg"); s.setAttribute("viewBox", "0 0 150 108"); s.setAttribute("class", "staff"); s.setAttribute("role", "img"); return s; }

  // Ses kalitesi: netlik ve ses gücü dengesi (skills.js toneQuality)
  const toneKv = tq => tq ? `<div><span class="label">${L("Ses temizliği", "Tone clarity")}</span>%${tq.clarity}</div><div><span class="label">${L("Ses gücü dengesi", "Volume steadiness")}</span>%${tq.steadiness}</div>` : "";
  const toneTips = tq => tq ? tq.tips.map(t => pick(t, LANG)).join(" ") : "";

  // ======== 1. Parmak ezberi testi ========
  modules.quiz = (() => {
    const P = $("pp-quiz");
    P.innerHTML = `
      <p class="pdesc">Ezberini sına: <strong>Çal</strong> modunda istenen notayı klarnette çal, <strong>Bul</strong> modunda şemadaki parmağın hangi nota olduğunu seç (ya da çal). ${L("<strong>Oku</strong> modunda dizekteki notayı adını görmeden çal. ", "In <strong>Read</strong> mode play the note on the staff without seeing its name. ")}Zorlandığın notalar daha sık gelir. Bir bölgede son 20 cevabın %80'i doğruysa sonraki bölge açılır.</p>
      <div class="pbar">
        <div class="seg" role="radiogroup" aria-label="Test modu" id="qmode">
          <button type="button" role="radio" data-m="play">Çal</button>
          <button type="button" role="radio" data-m="find">Bul</button>
          <button type="button" role="radio" data-m="staff">${L("Oku", "Read")}</button>
        </div>
        <select id="qlevel" aria-label="Bölge"></select>
        <label class="chk" id="qaltwrap"><input type="checkbox" id="qalt"> alternatif parmaklar da</label>
        <button class="primary small" id="qstart" type="button">20 soruluk tur başlat</button>
      </div>
      <div class="stage" id="qstage"><div class="muted">Mod ve bölge seç, sonra turu başlat.</div></div>`;
    const stage = $("qstage");
    let mode = store.get("quiz.mode", "play");
    const stats = store.get("quiz.stats", {});
    const recent = store.get("quiz.recent", {});
    let round = null;
    const hold = holder();

    function levels(){
      const n = unlockedLevels(recent), sel = $("qlevel"), keep = sel.value || store.get("quiz.level", "chalumeau");
      sel.innerHTML = LEVELS.map((lv, i) => `<option value="${lv.id}"${i>=n ? " disabled" : ""}>${lv.name} (${nn(lv.lo)}–${nn(lv.hi)})${i>=n ? " — kilitli" : ""}</option>`).join("") +
        (n > 1 ? `<option value="all">Açık bölgelerin hepsi</option>` : "");
      sel.value = [...sel.options].some(o => o.value === keep && !o.disabled) ? keep : "chalumeau";
    }
    function setMode(m){
      mode = m; store.set("quiz.mode", m);
      $("qmode").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", b.dataset.m===m ? "true" : "false"));
      $("qaltwrap").hidden = m !== "find";
    }
    $("qmode").addEventListener("click", e => { const b = e.target.closest("button"); if(b) setMode(b.dataset.m); });
    $("qlevel").addEventListener("change", () => store.set("quiz.level", $("qlevel").value));
    $("qalt").checked = store.get("quiz.alt", false);
    $("qalt").addEventListener("change", () => store.set("quiz.alt", $("qalt").checked));
    setMode(mode); levels();

    const chosenLevels = () => {
      const v = $("qlevel").value, n = unlockedLevels(recent);
      return v === "all" ? LEVELS.slice(0, n) : [LEVELS.find(l => l.id === v)];
    };
    $("qstart").addEventListener("click", async () => {
      if((mode === "play" || mode === "staff") && !(await needMic())) return;
      round = { i:0, right:0, total:20, levels:chosenLevels(), mode, wrongs:{}, last:null };
      ask();
    });

    function levelOf(w){ return LEVELS.find(l => w >= l.lo && w <= l.hi); }
    function ask(){
      if(round.i >= round.total) return finish();
      const w = quizPick(round.levels, stats, Math.random, round.last);
      round.last = w; round.q = { w, t0: performance.now(), done:false };
      hold.reset();
      stage.innerHTML = `<div class="qcount">Soru ${round.i+1}/${round.total} · ${round.right} doğru</div>`;
      if(round.mode === "play" || round.mode === "staff"){
        const box = document.createElement("div"); box.className = "qplay";
        const st = staffSvg(); SK.drawStaffInto(st, w);
        // Oku modunda nota adı gizli: dizekten okuyup çal
        box.innerHTML = round.mode === "staff" ? `<div><div class="label">${L("Dizekteki notayı çal", "Play the note on the staff")}</div><div class="qname">?</div></div>`
          : `<div><div class="label">Bu notayı çal</div><div class="qname">${nn(w)} <em>yazılı</em></div><div class="muted">${perdeOf(w)}</div></div>`;
        box.appendChild(st);
        stage.appendChild(box);
      }else{
        const list = fingeringsFor(w);
        const pickAlt = $("qalt").checked && list.length > 1 && Math.random() < 0.5;
        const fi = pickAlt ? 1 + Math.floor(Math.random()*(list.length-1)) : 0;
        const box = document.createElement("div"); box.className = "qfind";
        const ch = miniChart(); paintMini(ch, list[fi].code);
        box.appendChild(ch);
        const right = document.createElement("div");
        right.innerHTML = `<div class="label">Bu parmak hangi nota?${fi ? " (alternatif parmak)" : ""}</div>`;
        const opts = document.createElement("div"); opts.className = "qopts";
        quizChoices(w, levelOf(w)).forEach(c => {
          const b = document.createElement("button"); b.type = "button"; b.className = "opt"; b.dataset.w = c;
          b.textContent = nn(c); b.addEventListener("click", () => answer(c));
          opts.appendChild(b);
        });
        right.appendChild(opts);
        right.insertAdjacentHTML("beforeend", `<div class="muted">Mikrofon açıksa çalarak da cevaplayabilirsin.</div>`);
        box.appendChild(right);
        stage.appendChild(box);
      }
      stage.insertAdjacentHTML("beforeend", `<div class="fb" id="qfb" aria-live="polite"></div>`);
    }
    function answer(played){
      const q = round && round.q;
      if(!q || q.done) return;
      q.done = true;
      const res = compareNote(q.w, played), ok = res === "ok", ms = performance.now() - q.t0;
      quizRecord(stats, q.w, ok, ms);
      const lv = levelOf(q.w).id;
      (recent[lv] = recent[lv] || []).push(ok);
      if(recent[lv].length > UNLOCK_WINDOW) recent[lv].shift();
      store.set("quiz.stats", stats); store.set("quiz.recent", recent);
      if(ok) round.right++; else round.wrongs[q.w] = (round.wrongs[q.w] || 0) + 1;
      stage.querySelectorAll(".opt").forEach(b => {
        if(+b.dataset.w === q.w) b.classList.add("right");
        else if(+b.dataset.w === played) b.classList.add("wrong");
      });
      const fb = $("qfb");
      fb.className = "fb " + (ok ? "good" : "bad");
      fb.textContent = ok ? "Doğru! (" + num(ms/1000) + " sn)"
        : res === "octave" ? "Oktav hatası: " + nn(played) + " çaldın, istenen " + nn(q.w) + ". Doğru parmak yukarıdaki şemada."
        : "Yanlış: " + nn(played) + ". Doğrusu " + nn(q.w) + " — parmağı yukarıdaki şemada.";
      if(!ok) SK.showNote(q.w);
      round.i++;
      setTimeout(() => { if(round && round.q === q) ask(); }, ok ? 1100 : 2600);
    }
    function finish(){
      const hard = Object.entries(round.wrongs).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([w]) => nn(+w));
      const rounds = store.get("quiz.rounds", []);
      rounds.push({ d: dayKey(new Date()), mode: round.mode, right: round.right, total: round.total });
      store.set("quiz.rounds", rounds.slice(-50));
      stage.innerHTML = `<div class="result"><div class="big">${round.right}/${round.total}</div>
        <div>doğru${hard.length ? " · zorlandıkların: <strong>" + hard.join(", ") + "</strong>" : ""}</div></div>`;
      round = null; levels();
    }
    return {
      note(r, t){
        if(!round || !round.q || round.q.done || !r.inRange) return;
        const h = hold.push(r.written, t);
        if(!h.fired && h.ms >= 500){ hold.fire(); answer(r.written); }
      },
      silence(){ hold.reset(); },
      leave(){ round = null; stage.innerHTML = `<div class="muted">Mod ve bölge seç, sonra turu başlat.</div>`; },
      enter(){ levels(); }
    };
  })();

  // ======== 2. Uzun ton ========
  modules.long = (() => {
    const P = $("pp-long");
    const opts = []; for(let w = LOW_NOTE; w <= HIGH_NOTE; w++) opts.push(`<option value="${w}">${label(w)}</option>`);
    P.innerHTML = `
      <p class="pdesc">Bir notayı hedef süre boyunca sabit tut. Puan; sapmanın ne kadar dağıldığına (%40), perdeye ne kadar yakın olduğuna (%35) ve süreyi tamamlamaya (%25) göre hesaplanır.</p>
      <div class="pbar">
        <select id="ltnote" aria-label="Hedef nota"><option value="auto">İlk çaldığım nota</option>${opts.join("")}</select>
        <div class="seg" role="radiogroup" aria-label="Hedef süre" id="ltdur">
          ${[4,8,12,16].map(s => `<button type="button" role="radio" data-s="${s}">${s} sn</button>`).join("")}
        </div>
        <button class="stopbtn" id="ltlisten" type="button">Dinle</button>
        <button class="primary small" id="ltstart" type="button">Başlat</button>
      </div>
      <div class="stage" id="ltstage"><div class="muted">Notayı seç (ya da “ilk çaldığım nota”), süreyi seç ve başlat.</div></div>`;
    const stage = $("ltstage");
    let dur = store.get("long.dur", 8), run = null;
    const best = store.get("long.best", {});
    $("ltnote").value = store.get("long.note", "auto");
    $("ltnote").addEventListener("change", () => store.set("long.note", $("ltnote").value));
    function setDur(s){ dur = s; store.set("long.dur", s); $("ltdur").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", +b.dataset.s===s ? "true" : "false")); }
    $("ltdur").addEventListener("click", e => { const b = e.target.closest("button"); if(b) setDur(+b.dataset.s); });
    setDur(dur);
    $("ltlisten").addEventListener("click", async () => {
      const v = $("ltnote").value; if(v === "auto") return;
      SK.play(+v); await sleep(1500); if(SK.playing() === +v) SK.stopSound();
    });
    $("ltstart").addEventListener("click", async () => {
      if(!(await needMic())) return;
      const v = $("ltnote").value;
      run = { w: v === "auto" ? null : +v, start:null, devs:[], lastOk:0, tq:[] };
      stage.innerHTML = `<div class="ltlive">
        <div class="label" id="ltwhat">${run.w ? "Çal: " + label(run.w) : "Bir nota çal ve tut"}</div>
        <div class="ltclock" id="ltclock">0,0 <em>/ ${dur} sn</em></div>
        <div class="pbarfill"><i id="ltfill"></i></div>
        <div class="muted" id="ltdev">sapma: —</div></div>`;
    });
    function end(t){
      const durMs = run.start ? t - run.start : 0;
      const w = run.w;
      if(!run.start || run.devs.length < 5){ run = null; stage.innerHTML = `<div class="muted">Nota tutulamadı, yeniden dene.</div>`; return; }
      const s = longToneScore(run.devs, durMs, dur*1000), tq = toneQuality(run.tq);
      const prev = best[w];
      if(!prev || s.score > prev.score) best[w] = { score:s.score, d: dayKey(new Date()) };
      store.set("long.best", best);
      const hist = store.get("long.hist", []); hist.push({ d: dayKey(new Date()), w, score:s.score }); store.set("long.hist", hist.slice(-100));
      stage.innerHTML = `<div class="result"><div class="big">${s.score}</div><div>puan · ${label(w)}${prev && s.score > prev.score ? " · <strong>yeni rekor</strong>" : prev ? " · rekor " + prev.score : ""}</div></div>
        <div class="kv"><div><span class="label">Süre</span>${num(durMs/1000)} sn</div>
        <div><span class="label">Ortalama sapma</span>${sgn(s.mean)} koma</div>
        <div><span class="label">Yayılım</span>${num(s.sd, 2)} koma</div>${toneKv(tq)}</div>
        <div class="muted">${Math.abs(s.mean) > 0.5 ? (s.mean > 0 ? "Tiz çalıyorsun; dudak baskısını azalt ya da biraz daha pes düşün." : "Pes çalıyorsun; hava desteğini artır.") : "Perdeye yakın."} ${s.sd > 0.5 ? "Ses dalgalanıyor: hava akışını sabitle." : ""} ${toneTips(tq)}</div>`;
      run = null;
    }
    return {
      note(r, t){
        if(!run || !r.inRange) return;
        if(run.w === null) run.w = r.written;
        if(r.written !== run.w){ if(run.start && t - run.lastOk > 400) end(t); return; }
        if(!run.start){
          run.start = t; $("ltwhat").textContent = "Tut: " + label(run.w);
          // Hedef akort bağlamına göre (Akort ekranında makam seçiliyse o makamın perdesi)
          const p = analyze(perdeFreq(run.w, T), T).perde; run.target = p ? p.comma : (run.w-67)*53/12;
        }
        run.lastOk = t;
        const dev = r.comma - run.target;
        run.devs.push(dev);
        const el = (t - run.start)/1000;
        $("ltclock").innerHTML = num(el) + ` <em>/ ${dur} sn</em>`;
        $("ltfill").style.width = Math.min(100, el/dur*100) + "%";
        $("ltdev").textContent = "sapma: " + sgn(dev) + " koma";
        if(el >= dur) end(t);
      },
      raw(d){ if(run && run.start) run.tq.push({ rms:d.rms, clarity:d.clarity }); },
      silence(t){ if(run && run.start && t - run.lastOk > 400) end(t); },
      leave(){ run = null; }
    };
  })();

  // ======== 3. Makam modu ========
  let currentMakam = makamById(store.get("makam", "rast")) || MAKAMS[0];
  const makamDone = store.get("makam.done", {});
  modules.makam = (() => {
    const P = $("pp-makam");
    P.innerHTML = `
      <p class="pdesc">Makamı seç; dizisi nota şeridinde işaretlenir (çerçeveli: dizi, dolu: durak, noktalı: güçlü). Alıştırmada diziyi önce çık sonra in; her perdenin koma sapması gösterilir.</p>
      <div class="mklist" id="mklist" role="radiogroup" aria-label="Makam">${MAKAMS.map(m => `<button type="button" role="radio" data-id="${m.id}">${m.name}</button>`).join("")}</div>
      <div id="mkinfo"></div>
      <div class="pbar">
        <button class="stopbtn" id="mklisten" type="button">Diziyi dinle</button>
        <button class="stopbtn" id="mkdrone" type="button">Durağı dron yap</button>
        <button class="primary small" id="mkstart" type="button">Alıştırma: çık ve in</button>
      </div>
      <div class="stage" id="mkstage"></div>
      <div class="muted small">Diziler AEU çeşni tanımlarından kuruldu; bir hocaya ya da Sol klarnetçiye kontrol ettirilmeli.</div>`;
    const stage = $("mkstage");
    let ex = null;
    const hold = holder();
    const seq = mk => [...mk.asc, ...[...mk.desc].reverse().slice(1)];
    function chips(list, idPrefix){
      return list.map((c, i) => `<span class="pchip${c===currentMakam.durak ? " durak" : ""}${c===currentMakam.guclu ? " guclu" : ""}" id="${idPrefix}${i}">
        <b>${perdeName(c)}</b><small>${nn(commaToWritten(c))} · ${c} k</small><i></i></span>`).join("");
    }
    function render(){
      const mk = currentMakam;
      $("mklist").querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", b.dataset.id===mk.id ? "true" : "false"));
      $("mkinfo").innerHTML = `
        <div class="kv"><div><span class="label">Durak</span>${perdeName(mk.durak)}</div>
        <div><span class="label">Güçlü</span>${perdeName(mk.guclu)}</div>
        <div><span class="label">Yeden</span>${perdeName(mk.yeden)}</div>
        <div><span class="label">Çalışıldı</span>${makamDone[mk.id] ? makamDone[mk.id].n + " kez · en iyi ort. " + num(makamDone[mk.id].best) + " k" : "henüz yok"}</div></div>
        <p class="seyir">${esc(seyirText(mk, LANG))}</p>
        <div class="label">Çıkış</div><div class="chiprow">${chips(mk.asc, "mka")}</div>
        <div class="label">İniş</div><div class="chiprow">${chips([...mk.desc].reverse(), "mkd")}</div>`;
      markScale(mk);
    }
    $("mklist").addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      currentMakam = makamById(b.dataset.id); store.set("makam", currentMakam.id);
      ex = null; stage.innerHTML = ""; SK.setTempContext(currentMakam.id); render();
    });
    $("mklisten").addEventListener("click", async () => {
      const mk = currentMakam, token = {}; listenToken = token;
      for(const c of seq(mk)){
        if(listenToken !== token) return;
        SK.play(commaToWritten(c), mkFreq(mk, c)); await sleep(520);
      }
      if(listenToken === token) SK.stopSound();
    });
    let listenToken = null;
    $("mkdrone").addEventListener("click", () => { setDrone(currentMakam.durak); if(!drone) startDrone(); });
    $("mkstart").addEventListener("click", async () => {
      if(!(await needMic())) return;
      listenToken = null; SK.stopSound();
      const mk = currentMakam, s = seq(mk);
      ex = { mk, s, i:0, res:[], frames:[] };
      render();
      stage.innerHTML = `<div class="label">Sıradaki perde</div><div class="qname" id="mknext"></div><div class="fb" id="mkfb" aria-live="polite"></div>`;
      next();
    });
    function chipFor(i){
      const n = ex.mk.asc.length;
      return i < n ? $("mka"+i) : $("mkd"+(i - n + 1));
    }
    function next(){
      hold.reset(); ex.frames = [];
      const c = ex.s[ex.i];
      document.querySelectorAll("#mkinfo .pchip").forEach(el => el.classList.remove("cur"));
      const el = chipFor(ex.i); if(el) el.classList.add("cur");
      $("mknext").innerHTML = perdeName(c) + ` <em>yazılı ${nn(commaToWritten(c))} · ${ex.i < ex.mk.asc.length ? "çıkış" : "iniş"}</em>`;
    }
    function judge(t){
      const c = ex.s[ex.i], played = mean(ex.frames);
      const j = judgePerde(played, tgt(ex.mk, c), [...ex.mk.asc, ...ex.mk.desc]);
      ex.res.push(j);
      const el = chipFor(ex.i);
      if(el){ el.classList.remove("cur"); el.classList.add(j.ok ? "good" : "off"); el.querySelector("i").textContent = sgn(j.dev); }
      $("mkfb").className = "fb " + (j.ok ? "good" : "bad");
      $("mkfb").textContent = perdeName(c) + ": " + sgn(j.dev) + " koma" + (j.ok ? " — temiz" : j.dev > 0 ? " — tiz" : " — pes") +
        (j.other ? ". " + j.other + " perdesine daha yakın çaldın." : "");
      ex.i++;
      if(ex.i >= ex.s.length) return finish();
      next();
    }
    function finish(){
      const avg = mean(ex.res.map(r => Math.abs(r.dev))), clean = ex.res.filter(r => r.ok).length;
      const d = makamDone[ex.mk.id] || { n:0, best: 99 };
      d.n++; d.best = Math.min(d.best, avg); makamDone[ex.mk.id] = d; store.set("makam.done", makamDone);
      stage.innerHTML = `<div class="result"><div class="big">${clean}/${ex.res.length}</div><div>perde temiz (±1 koma) · ortalama sapma ${num(avg)} koma</div></div>`;
      ex = null;
      setTimeout(render, 0);
    }
    return {
      enter(){ SK.setTempContext(currentMakam.id); render(); },
      leave(){ SK.setTempContext(null); },
      note(r, t){
        if(!ex) return;
        const want = commaToWritten(ex.s[ex.i]);
        const h = hold.push(r.written, t);
        if(r.written === want){
          ex.frames.push(r.comma);
          if(!h.fired && h.ms >= 400){ hold.fire(); judge(t); }
        }else if(!h.fired && h.ms >= 700){
          hold.fire();
          $("mkfb").className = "fb bad";
          $("mkfb").textContent = nn(r.written) + " çalıyorsun; beklenen " + perdeName(ex.s[ex.i]) + " (yazılı " + nn(want) + ").";
        }
      },
      silence(){ hold.reset(); if(ex) ex.frames = []; }
    };
  })();

  // ======== 4. Taklit oyunu ========
  modules.mimic = (() => {
    const P = $("pp-mimic");
    P.innerHTML = `
      <p class="pdesc">Uygulama seçili makamın dizisinden kısa bir ezgi çalar; sen klarnetle aynısını çal. Doğru çalınca ezgi bir nota uzar, yanlışta kısalır.</p>
      <div class="pbar">
        <span class="muted" id="mmmk"></span>
        <button class="primary small" id="mmstart" type="button">Başlat</button>
        <button class="stopbtn" id="mmagain" type="button" disabled>Tekrar dinle</button>
      </div>
      <div class="stage" id="mmstage"><div class="muted">Başlat'a bas, ezgiyi dinle, sonra çal.</div></div>`;
    const stage = $("mmstage");
    let len = 3, motif = null, idx = 0, listening = false, best = store.get("mimic.best", 0), score = 0;
    const hold = holder();
    async function playMotif(){
      listening = false;
      for(const c of motif){ SK.play(commaToWritten(c), mkFreq(currentMakam, c)); await sleep(560); }
      SK.stopSound(); await sleep(350);
      listening = true; idx = 0; hold.reset();
      $("mmfb").className = "fb"; $("mmfb").textContent = "Şimdi sen çal.";
    }
    function draw(){
      stage.innerHTML = `<div class="qcount">Uzunluk ${len} · seri ${score} · rekor ${best}</div>
        <div class="chiprow">${motif.map((c, i) => `<span class="pchip blank" id="mm${i}"><b>?</b></span>`).join("")}</div>
        <div class="fb" id="mmfb" aria-live="polite">Dinle…</div>`;
    }
    async function round(){
      motif = makeMotif([...currentMakam.asc], len);
      draw(); $("mmagain").disabled = false;
      await playMotif();
    }
    $("mmstart").addEventListener("click", async () => { if(!(await needMic())) return; len = 3; score = 0; round(); });
    $("mmagain").addEventListener("click", () => { if(motif){ draw(); playMotif(); } });
    function reveal(i, ok){
      const el = $("mm"+i); if(!el) return;
      el.classList.remove("blank"); el.classList.add(ok ? "good" : "off");
      el.querySelector("b").textContent = perdeName(motif[i]);
    }
    return {
      enter(){ SK.setTempContext(currentMakam.id); $("mmmk").textContent = "Makam: " + currentMakam.name + " (Makam sekmesinden değiştir)"; },
      note(r, t){
        if(!listening || !r.inRange) return;
        const h = hold.push(r.written, t);
        if(h.fired || h.ms < 150) return;
        hold.fire();
        const want = commaToWritten(motif[idx]);
        if(r.written === want){
          reveal(idx, true); idx++;
          if(idx >= motif.length){
            listening = false; score++; best = Math.max(best, score); store.set("mimic.best", best);
            $("mmfb").className = "fb good"; $("mmfb").textContent = "Doğru! Bir nota daha ekleniyor.";
            len = Math.min(10, len+1);
            setTimeout(round, 1300);
          }
        }else{
          listening = false;
          motif.forEach((_, i) => { if(i >= idx) reveal(i, i !== idx); });
          reveal(idx, false);
          $("mmfb").className = "fb bad";
          $("mmfb").textContent = nn(r.written) + " çaldın; beklenen " + perdeName(motif[idx]) + " (yazılı " + nn(want) + "). Yeni ezgi geliyor.";
          score = 0; len = Math.max(3, len-1);
          setTimeout(round, 2600);
        }
      },
      silence(){ hold.reset(); },
      leave(){ SK.setTempContext(null); listening = false; motif = null; stage.innerHTML = `<div class="muted">Başlat'a bas, ezgiyi dinle, sonra çal.</div>`; $("mmagain").disabled = true; }
    };
  })();

  // ======== 6. Kayıt ve nota dökümü ========
  modules.rec = (() => {
    const P = $("pp-rec");
    P.innerHTML = `
      <p class="pdesc">Çaldığını kaydet; sonra dinle ve çalınan notaları koma sapmalarıyla gör. Kayıt yalnızca bu sekmede, cihazda tutulur; sayfa kapanınca silinir.</p>
      <div class="pbar">
        <button class="primary small" id="rcbtn" type="button">Kaydı başlat</button>
        <span class="ltclock small" id="rctime"></span>
      </div>
      <div class="stage" id="rcstage"><div class="muted">Kayıt yok.</div></div>`;
    const stage = $("rcstage");
    let rec = null, notes = [], url = null;
    $("rcbtn").addEventListener("click", async () => rec ? stopRec() : startRec());
    async function startRec(){
      if(!(await needMic())) return;
      const stream = SK.getStream(); if(!stream) return;
      if(url){ URL.revokeObjectURL(url); url = null; }
      const chunks = [];
      let mr = null;
      try{ mr = new MediaRecorder(stream); }catch(e){ mr = null; }
      rec = { mr, chunks, frames:[], glides:[], t0: performance.now(), timer: setInterval(() => {
        $("rctime").textContent = num((performance.now() - rec.t0)/1000) + " sn";
      }, 200) };
      if(mr){
        mr.ondataavailable = e => chunks.push(e.data);
        try{ mr.start(); }catch(e){ rec.mr = null; }   // kayıt başlamazsa yalnızca notalar listelenir
      }
      $("rcbtn").textContent = "Kaydı durdur";
      stage.innerHTML = `<div class="muted">Kaydediliyor… çal.</div>`;
    }
    function stopRec(){
      const r = rec; rec = null;
      clearInterval(r.timer);
      $("rcbtn").textContent = "Kaydı başlat";
      notes = segmentNotes(r.frames, 150).map(n => ({ ...n, start: n.start - r.t0, end: n.end - r.t0 }));
      const glideN = r.glides.length;
      const finish = () => {
        stage.innerHTML = (url ? `<audio controls src="${url}" id="rcaudio"></audio>` : `<div class="muted">Bu tarayıcı ses kaydını desteklemiyor; yalnızca notalar listelendi.</div>`) +
          `<div class="qcount">${notes.length} nota · ${glideN} glissando · ${num((performance.now() - r.t0)/1000, 0)} sn</div>
          <div class="tablewrap"><table class="rtable"><thead><tr><th>Zaman</th><th>Perde</th><th>Yazılı</th><th>Süre</th><th>Sapma</th></tr></thead><tbody>
          ${notes.map((n, i) => { const p = nearestPerde(n.comma); return `<tr id="rn${i}"><td>${num(n.start/1000)}</td><td>${p ? p.name : "—"}</td><td>${nn(n.written)}</td><td>${num((n.end-n.start)/1000)} sn</td><td>${p ? sgn(p.delta) + " k" : "—"}</td></tr>`; }).join("")}
          </tbody></table></div>
          <div class="pbar"><button class="stopbtn" id="rccopy" type="button">Notaları kopyala</button>
          <button class="stopbtn" id="rcpiece" type="button">Eser takibine ekle</button><span class="muted" id="rcmsg"></span></div>`;
        const audio = $("rcaudio");
        if(audio){
          audio.addEventListener("play", () => { playbackMute = true; });
          audio.addEventListener("pause", () => { playbackMute = false; });
          audio.addEventListener("ended", () => { playbackMute = false; });
          audio.addEventListener("timeupdate", () => {
            const ms = audio.currentTime*1000;
            notes.forEach((n, i) => $("rn"+i).classList.toggle("now", ms >= n.start && ms < n.end + 80));
          });
        }
        const text = notes.map(n => nn(n.written)).join(" ");
        $("rccopy").addEventListener("click", async () => {
          try{ await navigator.clipboard.writeText(text); $("rcmsg").textContent = "Kopyalandı."; }
          catch(e){ $("rcmsg").textContent = text; }
        });
        $("rcpiece").addEventListener("click", () => {
          const inRange = notes.map(n => n.written).filter(w => w >= LOW_NOTE && w <= HIGH_NOTE);
          if(!inRange.length){ $("rcmsg").textContent = "Eklenecek nota yok."; return; }
          SK.addPiece(_t("Kayıt " + new Date().toLocaleTimeString("tr", { hour:"2-digit", minute:"2-digit" })), inRange);
          $("rcmsg").textContent = "Eser takibine eklendi (★).";
        });
      };
      if(r.mr && r.mr.state !== "inactive"){
        r.mr.onstop = () => { url = URL.createObjectURL(new Blob(r.chunks, { type: r.mr.mimeType || "audio/webm" })); finish(); };
        r.mr.stop();
      }else finish();
    }
    let prevW = null, gap = [];
    SK.on("raw", d => { if(rec) gap.push({ t:d.t, comma:d.comma }); });
    SK.on("note", d => {
      if(!rec) return;
      rec.frames.push({ t:d.t, written:d.r.written, comma:d.r.comma });
      if(prevW !== null && prevW.written !== d.r.written && isGlide([prevW, ...gap])) rec.glides.push(d.t);
      prevW = { t:d.t, comma:d.r.comma, written:d.r.written }; gap = [];
    });
    SK.on("silence", d => { if(rec){ rec.frames.push({ t:d.t, written:null }); prevW = null; gap = []; } });
    return {};
  })();

  // İlerleme sayfası: ritim, kulak, seyir ve eser sonuçları
  function moreStats(){
    const rh = store.get("rhythm.hist", []), ear = store.get("ear.best", {}), sy = store.get("seyir.hist", []), pb = store.get("piece.best", {});
    const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0)/a.length) : null;
    const last10 = rh.slice(-10).map(x => x.score), sy10 = sy.slice(-10).map(x => x.score);
    const syBy = {}; sy.forEach(x => { syBy[x.mk] = Math.max(syBy[x.mk] || 0, x.score); });
    const goal = store.get("goal.min", 15);
    const week = (() => { let n = 0; for(let k=0;k<7;k++){ const d = new Date(); d.setDate(d.getDate()-k); if((days[dayKey(d)] || 0) >= goal*60) n++; } return n; })();
    return `<div class="label">${L("Günlük hedef", "Daily goal")}</div>
      <p>${goal} ${L("dk · son 7 günün ", "min · reached on ")}${week}${L("'sinde tuttu", " of the last 7 days")} <button class="stopbtn" type="button" id="pggoal">${L("Değiştir", "Change")}</button></p>
      <div class="label">${L("Ritim", "Rhythm")}</div><p>${rh.length ? L("son 10 tur ortalaması ", "last 10 rounds average ") + "<strong>" + avg(last10) + "</strong> · " + L("en iyi ", "best ") + store.get("rhythm.best", 0) + " · " + rh.length + L(" tur", " rounds") : "—"}</p>
      <div class="label">${L("Kulak", "Ear")}</div><p>${ear.pitch != null ? L("ayırt edebildiğin en küçük fark ", "smallest difference you can hear ") + "<strong>" + num(ear.pitch) + L(" koma</strong>", " commas</strong>") : "—"}${ear.makam ? " · " + L("makam tanıma rekoru ", "makam ID record ") + ear.makam : ""}</p>
      <div class="label">${L("Seyir (taksim)", "Seyir (taksim)")}</div><p>${sy.length ? L("son 10 ortalama ", "last 10 average ") + "<strong>" + avg(sy10) + "</strong> · " + Object.entries(syBy).map(([id, v]) => makamById(id).name + " " + v).join(" · ") : "—"}</p>
      <div class="label">${L("Eserler (tempolu, en iyi)", "Pieces (in tempo, best)")}</div><p>${Object.entries(pb).map(([id, v]) => { const e = etudeById(id); return (e ? pick(e.name, LANG) : id) + " %" + v; }).join(" · ") || "—"}</p>`;
  }

  // ======== 7. İlerleme ========
  modules.progress = (() => {
    const P = $("pp-progress");
    function render(){
      store.set("days", days);
      const today = dayKey(new Date());
      const last = [];
      for(let i=13;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); last.push([dayKey(d), days[dayKey(d)] || 0, d]); }
      const maxS = Math.max(600, ...last.map(x => x[1]));
      const total = Object.values(days).reduce((a,b) => a+b, 0);
      const qs = store.get("quiz.stats", {}), rec = store.get("quiz.recent", {}), unl = unlockedLevels(rec);
      const lvRows = LEVELS.map((lv, i) => {
        let n = 0, wr = 0; for(let w = lv.lo; w <= lv.hi; w++) if(qs[w]){ n += qs[w].n; wr += qs[w].wrong; }
        const r = rec[lv.id] || [];
        return `<tr><td>${lv.name}</td><td>${i < unl ? "açık" : "kilitli"}</td><td>${n}</td><td>${n ? Math.round((n-wr)/n*100) + "%" : "—"}</td><td>${r.length ? r.filter(Boolean).length + "/" + r.length : "—"}</td></tr>`;
      }).join("");
      const lb = store.get("long.best", {});
      const longTop = Object.entries(lb).sort((a,b) => b[1].score - a[1].score).slice(0, 6).map(([w, b]) => `${label(+w)}: <strong>${b.score}</strong>`);
      const ints = Object.entries(intStats).filter(([, s]) => s.n >= 3).map(([w, s]) => [+w, s.sum/s.n, s.n]);
      const sharp = ints.filter(x => x[1] > 0.5).sort((a,b) => b[1]-a[1]).slice(0, 5);
      const flat = ints.filter(x => x[1] < -0.5).sort((a,b) => a[1]-b[1]).slice(0, 5);
      const fmtI = l => l.length ? l.map(([w, m, n]) => `${label(w)} <strong>${sgn(m)}</strong> <em>(${n})</em>`).join(" · ") : "—";
      const mk = MAKAMS.filter(m => makamDone[m.id]).map(m => `${m.name}: ${makamDone[m.id].n} kez, en iyi ort. ${num(makamDone[m.id].best)} k`);
      P.innerHTML = `
        <div class="kv">
          <div><span class="label">Seri</span><span class="big2">${streak(days)}</span> gün</div>
          <div><span class="label">Bugün</span><span class="big2">${Math.round((days[today]||0)/60)}</span> dk</div>
          <div><span class="label">Toplam</span><span class="big2">${num(total/3600)}</span> saat</div>
          <div><span class="label">Taklit rekoru</span><span class="big2">${store.get("mimic.best", 0)}</span></div>
          <div><span class="label">Biten ezgi</span><span class="big2">${store.get("piece.done", 0)}</span></div>
          <div><span class="label">Biten ders</span><span class="big2">${LESSONS.filter(l => lessonDone(l, store.get("lesson.prog", {}))).length}</span>/ ${LESSONS.length}</div>
          <div><span class="label">Günlük çalışma</span><span class="big2">${store.get("lesson.dailyDone", []).length}</span> gün</div>
        </div>
        <div class="label">Son 14 gün (sesli çalma süresi, dakika)</div>
        <div class="bars" role="img" aria-label="Son 14 günün çalışma süreleri">${last.map(([k, s, d]) =>
          `<div class="barcol" title="${k}: ${Math.round(s/60)} dk"><i style="height:${Math.round(s/maxS*100)}%"></i><small>${d.getDate()}</small></div>`).join("")}</div>
        <div class="muted small">Seri için günde en az 1 dakika ses algılanmalı.</div>
        <div class="label">Parmak testi</div>
        <div class="tablewrap"><table class="rtable"><thead><tr><th>Bölge</th><th>Durum</th><th>Soru</th><th>Doğru</th><th>Son 20</th></tr></thead><tbody>${lvRows}</tbody></table></div>
        <div class="label">Uzun ton rekorları</div><p>${longTop.join(" · ") || "—"}</p>
        <div class="label">Entonasyon (en az 0,3 sn tutulan notalar)</div>
        <p>Tiz çaldıkların: ${fmtI(sharp)}</p><p>Pes çaldıkların: ${fmtI(flat)}</p>
        <div class="label">Makam alıştırmaları</div><p>${mk.join(" · ") || "—"}</p>
        ${moreStats()}
        <div class="pbar"><button class="stopbtn" id="rsint" type="button">Entonasyon istatistiğini sıfırla</button>
        <button class="stopbtn" id="rsall" type="button">Tüm ilerlemeyi sıfırla</button></div>
        <div class="muted small">Tüm veriler yalnızca bu cihazda, tarayıcıda saklanır.</div>`;
      $("rsint").addEventListener("click", () => {
        if(!confirm(_t("Entonasyon istatistiği silinsin mi?"))) return;
        for(const k in intStats) delete intStats[k];
        store.set("int.stats", intStats); paintHeat(); render();
      });
      $("rsall").addEventListener("click", () => {
        if(!confirm(_t("Seri, ders, test, uzun ton, makam, taklit ve entonasyon verilerinin hepsi silinsin mi? Kendi ezgilerin kalır."))) return;
        ["lesson.prog","lesson.daily","lesson.dailyDone","lesson.cur","quiz.stats","quiz.recent","quiz.rounds","long.best","long.hist","makam.done","mimic.best","piece.done","days","int.stats"]
          .forEach(k => { try{ localStorage.removeItem("sk." + k); }catch(e){} });
        resetting = true;
        location.reload();
      });
    }
    P.addEventListener("click", e => {
      if(!e.target.closest("#pggoal")) return;
      const v = prompt(L("Günlük hedef (dakika):", "Daily goal (minutes):"), store.get("goal.min", 15));
      const n = Math.round(+v); if(n >= 1 && n <= 240){ store.set("goal.min", n); render(); goalText(); }
    });
    return { enter: render };
  })();

  // ======== Ritim, Kulak, Seyir (trainers.js) ========
  const tctx = { SK, $, store, nn, num, sgn, esc, sleep, hit, commaFreq, mkFreq, needMic,
    droneOn: c => { setDrone(c); if(!drone) startDrone(); } };
  modules.rhythm = TRAINERS.rhythm(tctx);
  modules.ear = TRAINERS.ear(tctx);
  modules.seyir = TRAINERS.seyir(tctx);
  modules.piece = TRAINERS.piece(tctx);

  // ======== 0. Dersler ========
  modules.lessons = (() => {
    const P = $("pp-lessons");
    P.innerHTML = `
      <p class="pdesc">Adım adım ilerleyen dersler: her derste kısa bir anlatım ve mikrofonla değerlendirilen alıştırmalar var. Bir dersin bütün adımlarını geçince sonraki ders açılır. Bugünün çalışması, bitirdiğin derslerden her gün yeniden kurulur.</p>
      <div class="lsgrid">
        <div class="lsside">
          <nav class="lslist" id="lslist" aria-label="Dersler"></nav>
          <label class="chk small"><input type="checkbox" id="lsall"> tüm dersleri aç</label>
        </div>
        <div class="lsbody" id="lsbody"></div>
      </div>`;
    const tx = x => pick(x, LANG);
    const prog = store.get("lesson.prog", {});
    let daily = store.get("lesson.daily", null);   // { day, plan, p:{s, d} } — plan gün içinde sabit kalır
    let allOpen = store.get("lesson.all", false);
    let cur = null, run = null;

    function dailyLesson(){
      const day = dayKey(new Date());
      // Gün içinde hiçbir adıma başlanmadıysa plan yeniden kurulur (o arada bitirilen dersler de girsin)
      if(!daily || daily.day !== day || !Object.keys(daily.p.s).length){
        const plan = dailyPlan({ prog, intStats, quizStats: store.get("quiz.stats", {}), day });
        daily = { day, plan: plan.steps, p:{ s:{} } };
        store.set("lesson.daily", daily);
      }
      const l = dailyPlan({ prog:{}, intStats:{}, quizStats:{}, day });
      l.steps = daily.plan;
      return l;
    }
    const progFor = l => l.daily ? { daily: daily.p } : prog;
    const save = () => { store.set("lesson.prog", prog); store.set("lesson.daily", daily); };

    // ---- Liste ----
    function renderList(){
      const dl = dailyLesson(), dp = lessonProgress(dl, progFor(dl));
      let html = `<button type="button" class="lsitem daily${cur && cur.daily ? " cur" : ""}" data-id="daily">
        <span>${esc(tx(dl.title))}</span><small>${dp.done === dp.total ? "✓" : dp.done + "/" + dp.total}</small></button>`;
      for(const u of UNITS){
        html += `<div class="lsunit">${esc(tx(u.name))}</div>`;
        for(const l of LESSONS.filter(x => x.unit === u.id)){
          const open = unlocked(l, prog, allOpen), done = lessonDone(l, prog), lp = lessonProgress(l, prog);
          html += `<button type="button" class="lsitem${done ? " done" : ""}${cur === l ? " cur" : ""}" data-id="${l.id}"${open ? "" : " disabled"}>
            <span>${esc(tx(l.title))}</span><small>${!open ? "kilitli" : done ? "✓" : lp.done ? lp.done + "/" + lp.total : ""}</small></button>`;
        }
      }
      $("lslist").innerHTML = html;
    }
    $("lslist").addEventListener("click", e => {
      const b = e.target.closest("[data-id]"); if(!b || b.disabled) return;
      open(b.dataset.id === "daily" ? dailyLesson() : lessonById(b.dataset.id));
      if(window.matchMedia("(max-width:700px)").matches) $("lsbody").scrollIntoView({ block:"start" });
    });
    $("lsall").checked = allOpen;
    $("lsall").addEventListener("change", () => { allOpen = $("lsall").checked; store.set("lesson.all", allOpen); renderList(); renderNext(); });

    // ---- Ders sayfası ----
    function resText(st, r){
      switch(st.type){
        case "listen": return "dinlendi";
        case "hold": return r.v + " puan";
        case "notes": return r.v + " hata";
        case "quiz": case "glide": return r.v + "/" + st.n;
        case "scale": return "%" + Math.round(r.v*100);
        case "mimic": return r.v + " nota";
        case "vibrato": return num(r.v) + " sn";
        case "read": return L("okundu", "read");
        case "rhythm": case "seyir": return r.v + L(" puan", " points");
        case "dynamics": return r.v ? L("geçti", "passed") : L("tekrar", "retry");
        case "ear": return r.v + "/" + st.n;
        case "piece": return st.mode === "free" ? r.v + L(" hata", " mistakes") : "%" + r.v;
      }
      return "";
    }
    const canHear = st => ["notes", "scale", "hold", "vibrato"].includes(st.type);
    function stepHead(st, i, r){
      return `<span class="lsnum">${r && r.ok ? "✓" : i+1}</span><span class="lsname">${esc(stepTitle(st, LANG))}</span>` +
        (r ? `<span class="lsres">${r.ok ? resText(st, r) : "en iyi: " + resText(st, r)}</span>` : "");
    }
    function stepButtons(st, i, r, running){
      if(st.type === "listen") return `<button class="primary small" type="button" data-act="start" data-i="${i}">${running ? "Durdur" : "Dinle"}</button>`;
      return (canHear(st) ? `<button class="stopbtn" type="button" data-act="hear" data-i="${i}">Örneği dinle</button>` : "") +
        `<button class="primary small" type="button" data-act="start" data-i="${i}">${running ? "Durdur" : r ? "Tekrar" : "Başla"}</button>`;
    }
    function refreshStep(i){
      const st = cur.steps[i], p = progFor(cur)[cur.id], r = p && p.s[i], li = $("lst"+i);
      if(!li) return;
      li.classList.toggle("ok", !!(r && r.ok));
      li.classList.toggle("active", !!(run && run.i === i));
      li.querySelector(".lshead").innerHTML = stepHead(st, i, r);
      li.querySelector(".lsbtns").innerHTML = stepButtons(st, i, r, run && run.i === i);
    }
    function open(l){
      stopRun();
      cur = l; store.set("lesson.cur", l.id);
      const p = progFor(l), u = UNITS.find(x => x.id === l.unit);
      $("lsbody").innerHTML = `
        <div class="eyebrow">${u ? esc(tx(u.name)) : esc(dayKey(new Date()))}</div>
        <h3 class="lstitle">${esc(tx(l.title))}</h3>
        ${l.text.map(t => `<p>${esc(tx(t))}</p>`).join("")}
        ${l.tips.length ? `<ul class="lstips">${l.tips.map(t => `<li>${esc(tx(t))}</li>`).join("")}</ul>` : ""}
        ${l.makam ? `<div class="pbar"><button class="stopbtn" type="button" data-act="drone">Durağı dron yap</button></div>` : ""}
        <ol class="lssteps">${l.steps.map((st, i) => { const r = p[l.id] && p[l.id].s[i]; return `
          <li class="lsstep${r && r.ok ? " ok" : ""}" id="lst${i}">
            <div class="lshead">${stepHead(st, i, r)}</div>
            <div class="pbar lsbtns">${stepButtons(st, i, r, false)}</div>
            <div class="stage lsstage" id="lss${i}" hidden></div>
          </li>`; }).join("")}</ol>
        <div id="lsnext"></div>`;
      SK.setTempContext(l.makam || null);
      markScale(l.makam ? makamById(l.makam) : null);
      renderList(); renderNext();
    }
    function renderNext(){
      const el = $("lsnext"); if(!el || !cur) return;
      if(!lessonDone(cur, progFor(cur))){ el.innerHTML = ""; return; }
      if(cur.daily){ el.innerHTML = `<div class="lsdone"><strong>Bugünün çalışması tamam.</strong> Seri: ${streak(days)} gün.</div>`; return; }
      const nx = nextLesson(prog, allOpen);
      el.innerHTML = `<div class="lsdone"><strong>Ders tamamlandı.</strong> ${nx ? `<button class="primary small" type="button" data-act="goto" data-id="${nx.id}">Sonraki ders: ${esc(tx(nx.title))} →</button>` : "Bütün dersleri bitirdin!"}</div>`;
    }
    $("lsbody").addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if(!b) return;
      const act = b.dataset.act, i = +b.dataset.i;
      if(act === "goto") return open(lessonById(b.dataset.id));
      if(act === "drone"){ setDrone(makamById(cur.makam).durak); if(!drone) startDrone(); return; }
      if(act === "hear") return hear(cur.steps[i]);
      if(act === "start"){ if(run && run.i === i) stopRun(); else startStep(i); }
    });

    // ---- Örnek çalma ----
    let playToken = null;
    async function playSeq(items, onIdx){
      const token = {}; playToken = token;
      for(let k=0;k<items.length;k++){
        if(playToken !== token) return false;
        const [w, f] = items[k];
        if(onIdx) onIdx(k);
        SK.play(w, f); await sleep(560);
      }
      if(playToken !== token) return false;
      SK.stopSound(); await sleep(300);
      return playToken === token;
    }
    const fromNotes = ws => ws.map(w => [w, undefined]);
    // Ders ya da adım bir makama aitse perde sesleri seçili akorda (AEU / icra) göre çalar
    const lessonMk = st => makamById((st && st.makam) || (cur && cur.makam) || "");
    const fromCommas = (cs, st) => cs.map(c => [commaToWritten(c), mkFreq(lessonMk(st), c)]);
    function itemsOf(st){
      if(st.type === "scale"){ const mk = makamById(st.makam); return fromCommas([...mk.asc, ...[...mk.desc].reverse().slice(1)], st); }
      if(st.type === "hold" || st.type === "vibrato") return st.comma != null ? [[st.note, mkFreq(lessonMk(st), st.comma)]] : fromNotes([st.note]);
      return st.commas ? fromCommas(st.commas, st) : fromNotes(st.notes);
    }
    async function hear(st){
      const items = itemsOf(st);
      if(items.length > 1) return playSeq(items);
      const token = {}; playToken = token;
      SK.play(items[0][0], items[0][1]); await sleep(1500);
      if(playToken === token) SK.stopSound();
    }

    // ---- Adım çalıştırma ----
    async function startStep(i){
      stopRun();
      const st = cur.steps[i], lesson = cur;
      if(st.type === "quiz" && st.mode === "find") needMic();   // tıklayarak da cevaplanır, mikrofon şart değil
      else if(st.type !== "listen" && !(await needMic())) return;
      if(cur !== lesson) return;
      const stage = $("lss"+i); stage.hidden = false; stage.innerHTML = "";
      if(st.makam) SK.setTempContext(st.makam);           // günlük plandaki makam adımları
      const me = run = { i, lesson };
      me.h = RUN[st.type](st, stage, res => { if(run === me) finish(me, res); });
      refreshStep(i);
    }
    function stopRun(){
      if(!run) return;
      const r = run; run = null;
      playToken = null;
      if(r.h && r.h.stop) r.h.stop();
      if(cur === r.lesson) refreshStep(r.i);
    }
    function finish(me, res){
      const { i, lesson, h } = me;
      run = null;
      if(h && h.stop) h.stop();
      const p = progFor(lesson), wasDone = lessonDone(lesson, p);
      const r = recordStep(p, lesson, i, res, dayKey(new Date()));
      if(lesson.daily && !wasDone && r.done){
        const dd = store.get("lesson.dailyDone", []);
        if(!dd.includes(daily.day)){ dd.push(daily.day); store.set("lesson.dailyDone", dd.slice(-400)); }
      }
      save();
      if(lesson.steps[i].type !== "listen")
        $("lss"+i).insertAdjacentHTML("beforeend", `<div class="fb ${r.ok ? "good" : "bad"}">${r.ok ? "Geçtin!" : "Geçme koşulu sağlanmadı; tekrar dene."}</div>`);
      if(cur === lesson){ refreshStep(i); renderList(); renderNext(); }
    }

    const q = (stage, s) => stage.querySelector(s);
    const RUN = {
      ...Object.fromEntries(Object.entries(TRAINER_STEPS).map(([k, fn]) => [k, (st, stage, done) => fn(st, stage, done, tctx)])),
      listen(st, stage, done){
        const items = itemsOf(st);
        stage.innerHTML = `<div class="chiprow">${items.map(([w], k) => `<span class="pchip"><b>${st.commas ? perdeName(st.commas[k]) : nn(w)}</b><small>${st.commas ? nn(w) : perdeOf(w)}</small></span>`).join("")}</div>`;
        const chips = stage.querySelectorAll(".pchip");
        playSeq(items, k => chips.forEach((c, j) => { c.classList.toggle("cur", j === k); c.classList.toggle("good", j < k); }))
          .then(ok => { if(ok){ chips.forEach(c => { c.classList.remove("cur"); c.classList.add("good"); }); done({ v:1 }); } });
        return { stop(){ playToken = null; SK.stopSound(); } };
      },

      hold(st, stage, done){
        const w = st.note, tp = nearestPerde((w-67)*53/12);
        const target = st.comma != null ? tgt(lessonMk(st), st.comma) : tp ? tp.comma : (w-67)*53/12;
        const name = nn(w) + " · " + perdeName(target);
        let start = null, devs = [], lastOk = 0, tqf = [];
        stage.innerHTML = `<div class="label">Çal ve tut: ${esc(name)}</div>
          <div class="ltclock lhc">0,0 <em>/ ${st.sec} sn</em></div>
          <div class="pbarfill"><i class="lhf"></i></div><div class="muted lhd">sapma: —</div>`;
        SK.showNote(w);
        function end(t){
          const durMs = start ? t - start : 0;
          if(!start || devs.length < 5){ start = null; devs = []; tqf = []; q(stage, ".lhd").textContent = "Nota tutulamadı, yeniden dene."; return; }
          const s = longToneScore(devs, durMs, st.sec*1000), tq = toneQuality(tqf);
          stage.innerHTML = `<div class="result"><div class="big">${s.score}</div><div>puan · ${esc(name)}</div></div>
            <div class="kv"><div><span class="label">Süre</span>${num(durMs/1000)} sn</div>
            <div><span class="label">Ortalama sapma</span>${sgn(s.mean)} koma</div>
            <div><span class="label">Yayılım</span>${num(s.sd, 2)} koma</div>${toneKv(tq)}</div>
            <div class="muted">${Math.abs(s.mean) > 0.5 ? (s.mean > 0 ? "Tiz çalıyorsun; dudak baskısını azalt ya da biraz daha pes düşün." : "Pes çalıyorsun; hava desteğini artır.") : "Perdeye yakın."} ${s.sd > 0.5 ? "Ses dalgalanıyor: hava akışını sabitle." : ""} ${toneTips(tq)}</div>
            ${st.quality && tq && tq.clarity < st.quality ? `<div class="fb bad">${L("Ses temizliği en az %", "Tone clarity must be at least ")}${st.quality}${L(" olmalı.", "%.")}</div>` : ""}`;
          done({ v:s.score, q: tq ? tq.clarity : 0 });
        }
        return {
          note(r, t){
            if(!r.inRange) return;
            if(r.written !== w){ if(start && t - lastOk > 400) end(t); return; }
            if(!start){ start = t; devs = []; tqf = []; }
            lastOk = t;
            const dev = r.comma - target; devs.push(dev);
            const el = (t - start)/1000;
            q(stage, ".lhc").innerHTML = num(el) + ` <em>/ ${st.sec} sn</em>`;
            q(stage, ".lhf").style.width = Math.min(100, el/st.sec*100) + "%";
            q(stage, ".lhd").textContent = "sapma: " + sgn(dev) + " koma";
            if(el >= st.sec) end(t);
          },
          raw(d){ if(start) tqf.push({ rms:d.rms, clarity:d.clarity }); },
          silence(t){ if(start && t - lastOk > 400) end(t); }
        };
      },

      notes(st, stage, done){
        const seq = stepNotes(st), tg = st.commas || null, hold = holder(), devs = [];
        let i = 0, miss = 0, release = false, frames = [];
        stage.innerHTML = `<div class="qcount lnc"></div><div class="chiprow scroll">${seq.map((w, k) =>
          `<span class="pchip"><b>${tg ? perdeName(tg[k]) : nn(w)}</b><small>${tg ? nn(w) : perdeOf(w)}</small><i></i></span>`).join("")}</div>
          <div class="fb lnf" aria-live="polite"></div>`;
        const chips = stage.querySelectorAll(".pchip"), fb = q(stage, ".lnf");
        function focus(){
          chips.forEach((c, k) => { c.classList.toggle("cur", k === i); if(k < i && !c.classList.contains("off")) c.classList.add("good"); });
          if(chips[i]) chips[i].scrollIntoView({ block:"nearest", inline:"center" });
          q(stage, ".lnc").textContent = "Nota " + Math.min(i+1, seq.length) + "/" + seq.length + " · " + miss + " hata";
          if(i < seq.length && !SK.playing()) SK.showNote(seq[i]);
        }
        focus();
        return {
          note(r, t){
            if(i >= seq.length || !r.inRange) return;
            const h = hold.push(r.written, t), want = seq[i];
            // Aynı nota tekrar ediyorsa önce bırakılması (sessizlik ya da başka nota) beklenir
            if(release){ if(r.written !== seq[i-1]) release = false; else return; }
            if(r.written === want) frames.push(r.comma);
            if(h.fired) return;
            if(r.written === want && h.ms >= 200){
              hold.fire();
              if(tg){
                const dev = mean(frames) - tgt(lessonMk(st), tg[i]); devs.push(dev);
                chips[i].querySelector("i").textContent = sgn(dev);
                if(Math.abs(dev) > 1) chips[i].classList.add("off");
              }
              frames = []; i++;
              release = i < seq.length && seq[i] === want;
              fb.className = "fb lnf"; fb.textContent = "";
              focus();
              if(i >= seq.length){
                fb.className = "fb lnf good";
                fb.textContent = "Bitti! " + miss + " hata" + (devs.length ? " · ortalama sapma " + num(mean(devs.map(Math.abs))) + " koma" : "");
                done({ v:miss });
              }
            }else if(r.written !== want && h.ms >= 400){
              hold.fire(); miss++; frames = [];
              fb.className = "fb lnf bad"; fb.textContent = nn(r.written) + " çaldın; sıradaki " + nn(want) + ".";
              focus();
            }
          },
          silence(){ hold.reset(); release = false; frames = []; }
        };
      },

      quiz(st, stage, done){
        const stats = store.get("quiz.stats", {}), hold = holder();
        let k = 0, right = 0, last = null, cq = null, timer = null;
        function ask(){
          if(k >= st.n){
            stage.innerHTML = `<div class="result"><div class="big">${right}/${st.n}</div><div>doğru</div></div>`;
            cq = null;
            return done({ v:right });
          }
          const w = quizPickFrom(st.notes, stats, Math.random, last);
          last = w; cq = { w, t0: performance.now(), done:false }; hold.reset();
          stage.innerHTML = `<div class="qcount">Soru ${k+1}/${st.n} · ${right} doğru</div>`;
          if(st.mode === "play" || st.mode === "staff"){
            const box = document.createElement("div"); box.className = "qplay";
            const sv = staffSvg(); SK.drawStaffInto(sv, w);
            box.innerHTML = st.mode === "staff" ? `<div><div class="label">${L("Dizekteki notayı çal", "Play the note on the staff")}</div><div class="qname">?</div></div>`
              : `<div><div class="label">Bu notayı çal</div><div class="qname">${nn(w)} <em>yazılı</em></div><div class="muted">${perdeOf(w)}</div></div>`;
            box.appendChild(sv); stage.appendChild(box);
          }else{
            const box = document.createElement("div"); box.className = "qfind";
            const ch = miniChart(); paintMini(ch, fingeringsFor(w)[0].code); box.appendChild(ch);
            const side = document.createElement("div");
            side.innerHTML = `<div class="label">Bu parmak hangi nota?</div>`;
            const opts = document.createElement("div"); opts.className = "qopts";
            choicesFrom(st.notes, w).forEach(c => {
              const b = document.createElement("button"); b.type = "button"; b.className = "opt"; b.dataset.w = c;
              b.textContent = nn(c); b.addEventListener("click", () => answer(c)); opts.appendChild(b);
            });
            side.appendChild(opts);
            side.insertAdjacentHTML("beforeend", `<div class="muted">Mikrofon açıksa çalarak da cevaplayabilirsin.</div>`);
            box.appendChild(side); stage.appendChild(box);
          }
          stage.insertAdjacentHTML("beforeend", `<div class="fb lqf" aria-live="polite"></div>`);
        }
        function answer(played){
          if(!cq || cq.done) return;
          cq.done = true;
          const res = compareNote(cq.w, played), ok = res === "ok", ms = performance.now() - cq.t0;
          quizRecord(stats, cq.w, ok, ms); store.set("quiz.stats", stats);
          if(ok) right++;
          stage.querySelectorAll(".opt").forEach(b => {
            if(+b.dataset.w === cq.w) b.classList.add("right"); else if(+b.dataset.w === played) b.classList.add("wrong");
          });
          const fb = q(stage, ".lqf");
          fb.className = "fb lqf " + (ok ? "good" : "bad");
          fb.textContent = ok ? "Doğru! (" + num(ms/1000) + " sn)"
            : res === "octave" ? "Oktav hatası: " + nn(played) + " çaldın, istenen " + nn(cq.w) + ". Doğru parmak yukarıdaki şemada."
            : "Yanlış: " + nn(played) + ". Doğrusu " + nn(cq.w) + " — parmağı yukarıdaki şemada.";
          if(!ok) SK.showNote(cq.w);
          k++;
          timer = setTimeout(ask, ok ? 1000 : 2400);
        }
        ask();
        return {
          note(r, t){
            if(!cq || cq.done || !r.inRange) return;
            const h = hold.push(r.written, t);
            if(!h.fired && h.ms >= 500){ hold.fire(); answer(r.written); }
          },
          silence(){ hold.reset(); },
          stop(){ clearTimeout(timer); cq = null; }
        };
      },

      scale(st, stage, done){
        const mk = makamById(st.makam), s = [...mk.asc, ...[...mk.desc].reverse().slice(1)], all = [...mk.asc, ...mk.desc];
        const hold = holder(), res = [];
        let i = 0, frames = [];
        markScale(mk);
        stage.innerHTML = `<div class="chiprow">${s.map(c => `<span class="pchip${c===mk.durak ? " durak" : ""}${c===mk.guclu ? " guclu" : ""}">
            <b>${perdeName(c)}</b><small>${nn(commaToWritten(c))}</small><i></i></span>`).join("")}</div>
          <div class="label">Sıradaki perde</div><div class="qname lsn"></div><div class="fb lsf" aria-live="polite"></div>`;
        const chips = stage.querySelectorAll(".pchip"), fb = q(stage, ".lsf");
        function next(){
          hold.reset(); frames = [];
          chips.forEach((c, k) => c.classList.toggle("cur", k === i));
          q(stage, ".lsn").innerHTML = perdeName(s[i]) + ` <em>yazılı ${nn(commaToWritten(s[i]))} · ${i < mk.asc.length ? "çıkış" : "iniş"}</em>`;
        }
        function judge(){
          const c = s[i], j = judgePerde(mean(frames), tgt(mk, c), all);
          res.push(j);
          chips[i].classList.remove("cur"); chips[i].classList.add(j.ok ? "good" : "off");
          chips[i].querySelector("i").textContent = sgn(j.dev);
          fb.className = "fb lsf " + (j.ok ? "good" : "bad");
          fb.textContent = perdeName(c) + ": " + sgn(j.dev) + " koma" + (j.ok ? " — temiz" : j.dev > 0 ? " — tiz" : " — pes") +
            (j.other ? ". " + j.other + " perdesine daha yakın çaldın." : "");
          i++;
          if(i < s.length) return next();
          const avg = mean(res.map(r => Math.abs(r.dev))), clean = res.filter(r => r.ok).length;
          const d = makamDone[mk.id] || { n:0, best:99 };
          d.n++; d.best = Math.min(d.best, avg); makamDone[mk.id] = d; store.set("makam.done", makamDone);
          q(stage, ".lsn").innerHTML = `${clean}/${res.length} <em>perde temiz (±1 koma) · ortalama sapma ${num(avg)} koma</em>`;
          done({ v: clean / res.length });
        }
        next();
        return {
          note(r, t){
            if(i >= s.length) return;
            const want = commaToWritten(s[i]), h = hold.push(r.written, t);
            if(r.written === want){
              frames.push(r.comma);
              if(!h.fired && h.ms >= 400){ hold.fire(); judge(); }
            }else if(!h.fired && h.ms >= 700){
              hold.fire();
              fb.className = "fb lsf bad";
              fb.textContent = nn(r.written) + " çalıyorsun; beklenen " + perdeName(s[i]) + " (yazılı " + nn(want) + ").";
            }
          },
          silence(){ hold.reset(); frames = []; }
        };
      },

      mimic(st, stage, done){
        const pool = st.makam ? [...makamById(st.makam).asc] : st.commas, hold = holder();
        let len = 3, motif = null, idx = 0, listening = false, alive = true, timer = null;
        function draw(){
          stage.innerHTML = `<div class="qcount">Uzunluk ${len} · hedef ${st.len}</div>
            <div class="chiprow">${motif.map(() => `<span class="pchip blank"><b>?</b></span>`).join("")}</div>
            <div class="pbar"><button class="stopbtn lma" type="button">Tekrar dinle</button></div>
            <div class="fb lmf" aria-live="polite">Dinle…</div>`;
          q(stage, ".lma").addEventListener("click", () => { if(alive && motif){ draw(); playMotif(); } });
        }
        async function playMotif(){
          listening = false;
          const ok = await playSeq(fromCommas(motif, st));
          if(!ok || !alive) return;
          listening = true; idx = 0; hold.reset();
          const fb = q(stage, ".lmf"); fb.className = "fb lmf"; fb.textContent = "Şimdi sen çal.";
        }
        function round(){
          if(!alive) return;
          motif = makeMotif(pool, len); draw(); playMotif();
        }
        function reveal(k, ok){
          const el = stage.querySelectorAll(".pchip")[k]; if(!el) return;
          el.classList.remove("blank"); el.classList.add(ok ? "good" : "off");
          el.querySelector("b").textContent = perdeName(motif[k]);
        }
        round();
        return {
          note(r, t){
            if(!listening || !r.inRange) return;
            const h = hold.push(r.written, t);
            if(h.fired || h.ms < 150) return;
            hold.fire();
            const want = commaToWritten(motif[idx]), fb = q(stage, ".lmf");
            if(r.written === want){
              reveal(idx, true); idx++;
              if(idx < motif.length) return;
              listening = false;
              fb.className = "fb lmf good";
              if(len >= st.len){ fb.textContent = len + " notalık ezgiyi doğru çaldın!"; return done({ v:len }); }
              fb.textContent = "Doğru! Bir nota daha ekleniyor.";
              len++; timer = setTimeout(round, 1300);
            }else{
              listening = false;
              motif.forEach((_, k) => { if(k > idx) reveal(k, true); });
              reveal(idx, false);
              fb.className = "fb lmf bad";
              fb.textContent = nn(r.written) + " çaldın; beklenen " + perdeName(motif[idx]) + " (yazılı " + nn(want) + "). Yeni ezgi geliyor.";
              len = Math.max(3, len-1); timer = setTimeout(round, 2600);
            }
          },
          silence(){ hold.reset(); },
          stop(){ alive = false; listening = false; clearTimeout(timer); }
        };
      },

      vibrato(st, stage, done){
        let on = false, frames = [], acc = 0, lastEval = 0, best = null;
        stage.innerHTML = `<div class="label">Çal: ${nn(st.note)} · vibrato yap</div>
          <div class="ltclock lvc">0,0 <em>/ ${st.sec} sn</em></div>
          <div class="pbarfill"><i class="lvf"></i></div><div class="muted lvd">vibrato: —</div>`;
        SK.showNote(st.note);
        return {
          note(r){ const was = on; on = r.written === st.note; if(!on || !was){ frames = []; lastEval = 0; } },
          raw(d){
            if(!on) return;
            frames.push({ t:d.t, comma:d.comma });
            while(frames.length && d.t - frames[0].t > 1500) frames.shift();
            if(lastEval && d.t - lastEval < 200) return;
            const dt = lastEval ? d.t - lastEval : 0; lastEval = d.t;
            const v = vibrato(frames, SK.windowSec());
            const good = v && v.rate >= 4 && v.rate <= 8;
            if(good){ acc += dt; best = v; }
            q(stage, ".lvd").innerHTML = v ? num(v.rate) + " Hz ±" + num(v.depth) + " koma" + (good ? "" : " — 4–8 Hz arası olmalı") : "vibrato: — <em>düz</em>";
            q(stage, ".lvc").innerHTML = num(acc/1000) + ` <em>/ ${st.sec} sn</em>`;
            q(stage, ".lvf").style.width = Math.min(100, acc/(st.sec*10)) + "%";
            if(acc >= st.sec*1000){
              on = false;
              q(stage, ".lvd").textContent = "Düzenli vibrato: " + num(best.rate) + " Hz ±" + num(best.depth) + " koma";
              done({ v:st.sec });
            }
          },
          silence(){ on = false; frames = []; lastEval = 0; }
        };
      },

      glide(st, stage, done){
        // Kalkış notasında son görülen an (anchor) ile varış notası arasındaki ham ölçümler sürekli kayıyorsa sayılır;
        // aradaki kısa duraklar (ara notalar) kaymayı bozmaz.
        let count = 0, anchor = null, path = [];
        stage.innerHTML = `<div class="label">${nn(st.from)} → ${nn(st.to)}: parmakları kaydırarak çık</div>
          <div class="ltclock lgc">0 <em>/ ${st.n}</em></div><div class="fb lgf" aria-live="polite"></div>`;
        SK.showNote(st.from);
        return {
          raw(d){ if(anchor) path.push({ t:d.t, comma:d.comma }); },
          note(r, t){
            if(r.written === st.from){ anchor = { t, comma:r.comma }; path = []; return; }
            if(!anchor) return;
            if(t - anchor.t > 3000){ anchor = null; path = []; return; }
            if(r.written !== st.to) return;
            const fb = q(stage, ".lgf");
            if(glideBetween([anchor, ...path, { t, comma:r.comma }])){
              count++; SK.markGlide(t);
              q(stage, ".lgc").innerHTML = count + ` <em>/ ${st.n}</em>`;
              fb.className = "fb lgf good"; fb.textContent = "Güzel kayış!";
              if(count >= st.n){ anchor = null; return done({ v:count }); }
            }else{
              fb.className = "fb lgf bad"; fb.textContent = "Atladın; parmakları deliklerden yavaşça sıyırarak kaydır.";
            }
            anchor = null; path = [];
          },
          silence(){ anchor = null; path = []; }
        };
      }
    };

    const saved = store.get("lesson.cur", ""), savedL = lessonById(saved);
    open(saved === "daily" ? dailyLesson() : savedL && unlocked(savedL, prog, allOpen) ? savedL : (nextLesson(prog, allOpen) || LESSONS[0]));
    return {
      enter(){ renderList(); if(cur){ SK.setTempContext(cur.makam || null); markScale(cur.makam ? makamById(cur.makam) : null); } },
      leave(){ stopRun(); SK.setTempContext(null); },
      note(r, t){ if(run && run.h && run.h.note) run.h.note(r, t); },
      silence(t){ if(run && run.h && run.h.silence) run.h.silence(t); },
      raw(d){ if(run && run.h && run.h.raw) run.h.raw(d); }
    };
  })();

  selectTab(TABS.some(([t]) => t === store.get("ptab")) ? store.get("ptab") : "lessons");
})();
