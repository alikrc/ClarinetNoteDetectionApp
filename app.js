// Ana uygulama: ayarlar, parmak şeması, gösterge, nota şeridi, ses, mikrofon ve görünümler.
// Çalışma bölümü (practice.js) window.SK üzerinden buraya bağlanır.
(function(){
  const $ = id => document.getElementById(id);
  const listeners = {};                                 // SK.on olay dinleyicileri (aşağıda)
  const btn=$("btn"), btnLab=$("btnlab"), chip=$("chip");
  const perdeEl=$("perde"), komaEl=$("koma"), needle=$("needle"), centtxt=$("centtxt"), track=$("track");
  const writtenEl=$("written"), soundEl=$("sounding"), hzEl=$("hz"),
        fcode=$("fcode"), regEl=$("reg"), fnote=$("fnote"), stepsEl=$("steps"), announce=$("announce");

  const tr1 = x => x.toFixed(1).replace(".", ",");
  // Önce yuvarla, sonra işaret koy: −0,0 yerine ±0,0 yazsın
  const fmtKoma = d => { const v = Math.round(d*10)/10; return (v>0 ? "+" : v<0 ? "−" : "±") + tr1(Math.abs(v)); };

  // ---- Ayarlar (tarayıcıda saklanır) ----
  const store = {
    get(k, d){ try{ const v = localStorage.getItem("sk."+k); return v===null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ try{ localStorage.setItem("sk."+k, JSON.stringify(v)); }catch(e){} }
  };
  const settings = {
    a4: store.get("a4", 440),
    mode: store.get("mode", "koma"),
    sens: store.get("sens", 5)
  };
  if(!(settings.a4>=430 && settings.a4<=450)) settings.a4 = 440;
  if(settings.mode!=="koma" && settings.mode!=="sent") settings.mode = "koma";
  if(!(settings.sens>=1 && settings.sens<=10)) settings.sens = 5;
  setA4(settings.a4);
  // Çalgı: yazılı nota = duyulan + T yarım ses (Sol klarnet 5). Değişince sayfa yeniden yüklenir.
  const inst = instrumentById(store.get("inst", "sol"));
  const T = inst.t;

  const a4In=$("a4"), sensIn=$("sens");
  a4In.value = settings.a4; sensIn.value = settings.sens;

  function applyA4(v){
    v = Math.round(Math.min(450, Math.max(430, v))*2)/2;
    if(!isFinite(v)) v = 440;
    settings.a4 = v; a4In.value = v; setA4(v); store.set("a4", v);
    hist.length = 0; stab.reset(); trace.length = 0;
    if(!running) show(lastShown ? analyze(perdeFreq(lastShown.written, T), T) : sample());
  }
  a4In.addEventListener("change", () => applyA4(parseFloat(a4In.value)));
  $("a4dn").addEventListener("click", () => applyA4(settings.a4 - 0.5));
  $("a4up").addEventListener("click", () => applyA4(settings.a4 + 0.5));

  const segBtns = document.querySelectorAll(".seg [data-mode]");
  function applyMode(m){
    settings.mode = m; store.set("mode", m);
    segBtns.forEach(b => b.setAttribute("aria-checked", b.dataset.mode===m ? "true" : "false"));
    drawScale();
    if(lastShown) show(lastShown);
  }
  segBtns.forEach(b => b.addEventListener("click", () => applyMode(b.dataset.mode)));

  // Tema anında değişir (i18n.js); dil değişince sayfa yeniden yüklenir
  const themeBtns = document.querySelectorAll("#themeseg button"), langBtns = document.querySelectorAll("#langseg button");
  function markSeg(btns, key, v){ btns.forEach(b => b.setAttribute("aria-checked", b.dataset[key]===v ? "true" : "false")); }
  markSeg(themeBtns, "theme", store.get("theme", "auto"));
  markSeg(langBtns, "lang", LANG);
  themeBtns.forEach(b => b.addEventListener("click", () => {
    store.set("theme", b.dataset.theme); applyTheme(b.dataset.theme); markSeg(themeBtns, "theme", b.dataset.theme); drawTrace();
  }));
  langBtns.forEach(b => b.addEventListener("click", () => {
    if(b.dataset.lang === LANG) return;
    store.set("lang", b.dataset.lang); location.reload();
  }));

  // Seviye çubuğu -60…0 dBFS
  const dbPos = rms => Math.max(0, Math.min(100, (20*Math.log10(Math.max(rms,1e-6)) + 60) / 60 * 100));
  function applySens(s){
    settings.sens = s; store.set("sens", s);
    $("lvthr").style.left = dbPos(sensitivityToRms(s)) + "%";
  }
  sensIn.addEventListener("input", () => applySens(+sensIn.value));
  applySens(settings.sens);

  // Çalgı seçimi
  const instSel = $("inst");
  INSTRUMENTS.forEach(i => instSel.add(new Option(i.name + " (" + L("yazılı = duyulan ", "written = sounding ") + (i.t >= 0 ? "+" : "−") + Math.abs(i.t) + L(" yarım ses", " semitones") + ")", i.id)));
  instSel.value = inst.id;
  instSel.addEventListener("change", () => { store.set("inst", instSel.value); location.reload(); });

  // Hoparlör modu: tarayıcının yankı gidericisi uygulamanın kendi sesini (dron, metronom) mikrofondan çıkarır
  const aecIn = $("aec");
  aecIn.checked = !!store.get("aec", false);
  aecIn.addEventListener("change", async () => {
    store.set("aec", aecIn.checked);
    if(running){ stop(); await start(); }
  });

  // Ortam gürültüsüne göre hassasiyet: 3 sn sessizliğin RMS'inin ~8 dB üstü eşik olur
  $("calib").addEventListener("click", async () => {
    const msg = $("calibmsg");
    if(!running) await start();
    if(!running){ msg.textContent = L("Mikrofon açılamadı.", "Couldn't open the microphone."); return; }
    const vals = [];
    const on = d => vals.push(d.rms);
    levelTaps.add(on);
    msg.textContent = L("Ölçülüyor… çalma.", "Measuring… don't play.");
    $("calib").disabled = true;
    await new Promise(r => setTimeout(r, 3000));
    levelTaps.delete(on); $("calib").disabled = false;
    if(vals.length < 10){ msg.textContent = L("Ölçüm alınamadı, yeniden dene.", "No measurement, try again."); return; }
    vals.sort((a,b) => a-b);
    const noise = vals[Math.floor(vals.length*0.9)], thr = Math.max(0.0015, noise*2.5);
    const sv = Math.round(Math.min(10, Math.max(1, 1 + 9*Math.log(thr/0.03)/Math.log(0.002/0.03))));
    sensIn.value = sv; applySens(sv);
    msg.textContent = L("Oda gürültüsü ", "Room noise ") + Math.round(20*Math.log10(Math.max(noise,1e-6))) + L(" dBFS · hassasiyet ", " dBFS · sensitivity ") + sv + (sv <= 2 ? L(" (gürültülü oda; mümkünse sessiz bir yer seç)", " (noisy room; find a quieter place if you can)") : "");
  });
  const levelTaps = new Set();

  // ---- Makam bağlamı (akort ekranı) ----
  // Kullanıcının seçtiği makam kalıcıdır; çalışma bölümündeki bir makam dersi/alıştırması geçici bağlam kurar.
  const tMakam = $("tmakam"), tuneBtns = document.querySelectorAll("#tuneseg [data-tune]"), ctxHint = $("ctxhint");
  MAKAMS.forEach(m => tMakam.add(new Option("Makam: " + m.name, m.id)));
  let userCtx = { mk: store.get("tune.makam", ""), mode: store.get("tune.mode", "aeu") };
  if(!makamById(userCtx.mk)) userCtx.mk = "";
  if(userCtx.mode !== "icra") userCtx.mode = "aeu";
  let tempCtx = null;
  // Geçici bağlam yalnızca çalışma görünümünde geçerli; akort ekranına dönünce kullanıcının seçimi geri gelir
  const tempOn = () => !!tempCtx && document.body.dataset.view === "practice";
  const ctxNow = () => tempOn() ? { mk: tempCtx.mk, mode: userCtx.mode } : userCtx;
  function applyCtx(){
    const c = ctxNow(), mk = c.mk ? makamById(c.mk) : null;
    setTuningContext(tuningCtx(mk, c.mode));
    tMakam.value = c.mk || ""; tMakam.disabled = tempOn();
    markSeg(tuneBtns, "tune", c.mode);
    $("perdelab").textContent = mk ? mk.name + " · " + (c.mode === "icra" ? L("icra", "practice") : "AEU") : L("AEU perdesi", "AEU perde");
    if(mk){
      const fix = Object.entries(mk.icra).map(([k, d]) => perdeNameAt(+k) + " " + fmtKoma(d));
      ctxHint.textContent = L("Durak ", "Final ") + perdeName(mk.durak) + " · " + L("güçlü ", "dominant ") + perdeName(mk.guclu) +
        (c.mode === "icra" ? (fix.length ? " · " + L("icra düzeltmesi: ", "practice tuning: ") + fix.join(", ") + L(" koma (yaklaşık)", " commas (approximate)") : " · " + L("bu makamda icra düzeltmesi yok", "no practice adjustment in this makam")) : "") +
        (tempOn() ? " · " + L("çalışma bölümünden", "set by the practice section") : "");
      ctxHint.hidden = false;
    }else ctxHint.hidden = true;
    markRailScale(mk);
    relabelRail();
    hist.length = 0; stab.reset();
    if(!running) show(lastShown ? analyze(perdeFreq(lastShown.written, T), T) : sample());
  }
  tMakam.addEventListener("change", () => { userCtx.mk = tMakam.value; store.set("tune.makam", userCtx.mk); applyCtx(); });
  tuneBtns.forEach(b => b.addEventListener("click", () => { userCtx.mode = b.dataset.tune; store.set("tune.mode", userCtx.mode); applyCtx(); }));

  // ---- Gösterge ölçeği ----
  // Koma modu: en yakın AEU perdesinden sapma (±2 koma). Sent modu: tampere notadan sapma (±50 sent).
  const SCALE = { koma:{ max:2, ticks:[-2,-1,0,1,2], ok:0.25 }, sent:{ max:50, ticks:[-50,-25,0,25,50], ok:5 } };
  function drawScale(){
    track.querySelectorAll(".tick,.ticklab,.zone").forEach(n => n.remove());
    const sc = SCALE[settings.mode];
    const zone = document.createElement("div");
    zone.className = "zone";
    zone.style.left = (50 - sc.ok/sc.max*50) + "%"; zone.style.width = (sc.ok/sc.max*100) + "%";
    track.insertBefore(zone, needle);
    sc.ticks.forEach(v => {
      const pos = 50 + v/sc.max*50;
      const t = document.createElement("div");
      t.className = "tick" + (v===0 ? " mid" : ""); t.style.left = pos + "%";
      const l = document.createElement("div");
      l.className = "ticklab"; l.style.left = Math.min(94, Math.max(6, pos)) + "%";
      l.textContent = (v>0 ? "+" : v<0 ? "−" : "") + Math.abs(v);
      track.insertBefore(t, needle); track.insertBefore(l, needle);
    });
  }

  // ---- Parmak şeması ----
  const ALL = [...document.querySelectorAll("svg.chart .hole, svg.chart .key")];
  const FINGER_DOTS = h => h.map(x => x ? "●" : "○").join("");
  const HOLE_NAME = { "h-T":"başparmak deliği", "k-R":"register mandalı",
    "h-lh1":"sol işaret deliği", "h-lh2":"sol orta deliği", "h-lh3":"sol yüzük deliği",
    "h-rh1":"sağ işaret deliği", "h-rh2":"sağ orta deliği", "h-rh3":"sağ yüzük deliği",
    "k-E-lp":"sol serçe Mi mandalı", "k-Fs-lp":"sol serçe Fa♯ mandalı", "k-Cs-lp":"sol serçe Sol♯ mandalı",
    "k-A":"La mandalı", "k-Gs-side":"Sol♯ yan mandalı", "k-Eb-sl":"Mi♭ ince mandalı", "k-Bb-sl":"Si♭ ince mandalı",
    "k-s1":"sağ 1. yan mandal", "k-s3":"sağ 2. yan mandal", "k-s4":"sağ 3. yan mandal",
    "k-Gs-rp":"sağ serçe Sol♯ mandalı", "k-F-rp":"sağ serçe Fa mandalı" };
  // Şemayı basılı kimlik listesine göre boya; ekran okuyucu için basılı/değil durumunu da yaz
  function paint(ids){
    const on = new Set(ids);
    ALL.forEach(n => {
      n.classList.toggle("on", on.has(n.id));
      n.setAttribute("aria-pressed", on.has(n.id) ? "true" : "false");
    });
  }
  ALL.forEach(n => {
    n.setAttribute("role", "button"); n.setAttribute("tabindex", "0");
    n.setAttribute("aria-label", HOLE_NAME[n.id] || n.id);
    n.addEventListener("click", () => chartPress(n.id));
    n.addEventListener("keydown", e => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); chartPress(n.id); }
    });
  });

  // ---- Klarnetten çal: delik/mandala basarak parmak kur ----
  // Şemadaki basılı durum değiştirilir; tablodaki bir parmağa uyuyorsa o nota gösterilir ve çalar.
  const manualMsg = $("manualmsg"), MANUAL_HINT = manualMsg.textContent;
  function chartPress(id){
    const ids = ALL.filter(n => n.classList.contains("on")).map(n => n.id);
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    const m = findFingering(next);
    if(!m){
      stopSound();
      lastFingerKey = null; fingerList = []; altsEl.innerHTML = ""; altCountEl.textContent = "";
      paint(next);
      fcode.textContent = "—";
      fnote.textContent = "—";
      drawStaff(null);
      altNoteEl.textContent = "";
      stepsEl.innerHTML = '<li class="idle"><span class="part">—</span><span>Bu parmak tabloda yok. Bir delik ya da mandal daha değiştir.</span></li>';
      manualMsg.textContent = "Tabloda olmayan parmak — ses yok.";
      markActive(null);
      return;
    }
    play(m.written);
    show(analyze(perdeFreq(m.written, T), T));
    selectFingering(m.index);
    manualMsg.textContent = m.also.length
      ? "Aynı parmakla " + m.also.map(a => noteName(a.written).tr).join(", ") + " de çıkar (dudakla ayrılır)."
      : MANUAL_HINT;
  }

  // Notanın parmakları arasında seçim: Temel / Alt. 1 / Alt. 2 …
  const altsEl = $("alts"), altNoteEl = $("altnote");
  let fingerList = [], fingerIdx = 0, fingerWritten = null;
  // Talimat bölümü açılıp kapanabilir; tercih tarayıcıda saklanır
  const detailEl = $("fingerdetail"), altCountEl = $("altcount");
  detailEl.open = store.get("detailOpen", true);
  detailEl.addEventListener("toggle", () => store.set("detailOpen", detailEl.open));

  function showFingerings(list, written){
    fingerList = list; fingerWritten = written; fingerIdx = 0;
    altCountEl.textContent = list.length > 1 ? "· " + (list.length-1) + " alternatif" : "";
    manualMsg.textContent = MANUAL_HINT;
    altsEl.innerHTML = "";
    if(list.length > 1) list.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio");
      b.textContent = i===0 ? "Temel" : "Alt. " + i;
      b.addEventListener("click", () => selectFingering(i));
      altsEl.appendChild(b);
    });
    selectFingering(0);
  }
  function selectFingering(i){
    fingerIdx = i;
    [...altsEl.children].forEach((b, k) => {
      b.setAttribute("aria-checked", k===i ? "true" : "false");
      b.tabIndex = k===i ? 0 : -1;
    });
    const f = fingerList[i];
    altNoteEl.textContent = f ? f.note : "";
    drawFingering(f ? f.code : null, fingerWritten);
  }
  // Ok tuşlarıyla seçenekler arasında gezin (radyo grubu davranışı)
  altsEl.addEventListener("keydown", e => {
    const n = fingerList.length, step = {ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1}[e.key];
    if(!step || n < 2) return;
    e.preventDefault(); e.stopPropagation();
    selectFingering((fingerIdx + step + n) % n);
    altsEl.children[fingerIdx].focus();
  });

  // ---- Dizek: yazılı notanın sol anahtarlı porte üzerindeki yeri ----
  // Yükseklik sabit (Mi3'ün altından Sol6'ya kadar yer var) ki nota değişince şema oynamasın.
  const staffEl = $("staff"), SVGNS = "http://www.w3.org/2000/svg";
  const STEP = 4, BASE = 72, NOTE_X = 104;          // alt çizgi (Mi4) y=72, adım başına 4 birim
  const sy = s => BASE - s*STEP;
  function svgEl(tag, attrs, text){
    const e = document.createElementNS(SVGNS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    if(text) e.textContent = text;
    return e;
  }
  function drawStaff(written){ drawStaffInto(staffEl, written); }
  function drawStaffInto(staffEl, written){
    staffEl.replaceChildren();
    for(let s = 0; s <= 8; s += 2) staffEl.appendChild(svgEl("line", {class:"sl", x1:4, x2:146, y1:sy(s), y2:sy(s)}));
    staffEl.appendChild(svgEl("text", {class:"clef", x:6, y:sy(-1.5)}, "𝄞"));
    if(written == null){ staffEl.setAttribute("aria-label", "Dizek: nota yok"); return; }
    const p = staffPos(written);
    for(let s = -2; s >= p.step; s -= 2)
      staffEl.appendChild(svgEl("line", {class:"ledger", x1:NOTE_X-11, x2:NOTE_X+11, y1:sy(s), y2:sy(s)}));
    for(let s = 10; s <= p.step; s += 2)
      staffEl.appendChild(svgEl("line", {class:"ledger", x1:NOTE_X-11, x2:NOTE_X+11, y1:sy(s), y2:sy(s)}));
    staffEl.appendChild(svgEl("ellipse", {class:"head", cx:NOTE_X, cy:sy(p.step), rx:5.6, ry:4,
      transform:"rotate(-20 " + NOTE_X + " " + sy(p.step) + ")"}));
    if(p.acc) staffEl.appendChild(svgEl("text", {class:"acc", x:NOTE_X-17, y:sy(p.step)+5}, p.acc));
    if(p.ottava) staffEl.appendChild(svgEl("text", {class:"va", x:NOTE_X-12, y:Math.min(sy(p.step), sy(10))-10}, "8va"));
    staffEl.setAttribute("aria-label", "Dizekte yazılı " + noteName(written).tr + (p.ottava ? ", 8va ile bir oktav aşağı yazılmış" : ""));
  }

  function drawFingering(code, written){
    paint([]);
    drawStaff(written);
    stepsEl.innerHTML = "";
    fcode.textContent = code || "—";
    fnote.innerHTML = written!=null ? noteName(written).tr + " <em>yazılı</em>" : "—";
    if(!code){
      const li = document.createElement("li"); li.className = "idle";
      li.innerHTML = '<span class="part">—</span><span>Bu nota için parmak şeması yok (yazılı Mi3–Mi♭7 arası).</span>';
      stepsEl.appendChild(li);
      return;
    }
    let rows;
    try{ paint(fingeringIds(code)); rows = describeFingering(code); }
    catch(e){ fcode.textContent = code + "  (okunamadı)"; return; }
    for(const r of rows){
      const li = document.createElement("li");
      if(!r.active) li.className = "idle";
      const part = document.createElement("span"); part.className = "part"; part.textContent = r.part;
      const body = document.createElement("span");
      if(r.holes){
        const d = document.createElement("span"); d.className = "dots"; d.textContent = FINGER_DOTS(r.holes);
        d.setAttribute("aria-hidden","true"); body.appendChild(d);
      }
      body.appendChild(document.createTextNode(r.text));
      li.append(part, body);
      stepsEl.appendChild(li);
    }
  }

  // ---- Gösterim ----
  let lastShown = null, lastFingerKey = null;
  const miniTune=$("minitune"), mtPerde=$("mtperde"), mtKoma=$("mtkoma"), mtNeedle=$("mtneedle"), mtZone=$("mtzone"), mtChip=$("mtchip");
  // Büyük göstergenin durumunu (dinliyor/sessiz, soluk perde) küçüğe yansıt
  function syncMini(){
    mtChip.textContent = chip.textContent;
    miniTune.classList.toggle("live", chip.classList.contains("live"));
    miniTune.classList.toggle("resting", perdeEl.classList.contains("resting"));
    mtPerde.style.opacity = perdeEl.style.opacity || 1;
  }
  new MutationObserver(syncMini).observe(chip, {childList:true, characterData:true, subtree:true, attributes:true});
  new MutationObserver(syncMini).observe(perdeEl, {attributes:true, attributeFilter:["class","style"]});
  function show(r){
    lastShown = r;
    const komaMode = settings.mode==="koma" && r.inRange && r.perde;
    if(!r.inRange){
      perdeEl.textContent = "Aralık dışı";
      komaEl.textContent = "yazılı " + r.writtenName.tr + " — parmak şeması Mi3–Mi♭7 arası";
    }else{
      perdeEl.textContent = r.perde ? r.perde.name : r.writtenName.tr;
      komaEl.textContent = r.perde
        ? fmtKoma(r.perde.delta) + " koma sapma" + (r.perde.inScale === false ? " · " + L("dizi dışı", "outside the scale") : "")
        : "bu kaba bölge için AEU perde adı yok";
    }
    // Türkçede yanına uluslararası adı (G4) yazılır; İngilizcede tek ad yeter
    const both = n => LANG === "en" ? n.en : n.tr + " <em>" + n.en + "</em>";
    writtenEl.innerHTML = both(r.writtenName);
    soundEl.innerHTML  = both(r.soundingName);
    hzEl.innerHTML     = tr1(r.freq) + " <em>Hz</em>";

    if(komaMode){
      const c = Math.round(r.perde.delta*1200/53);
      centtxt.textContent = "perdeden sapma: " + fmtKoma(r.perde.delta) + " koma (≈ " + (c>0?"+":"") + c + " sent)" +
        (r.perde.offset ? " · " + L("icra hedefi AEU'dan ", "practice target ") + fmtKoma(r.perde.offset) + L(" koma", " commas from AEU") : "");
    }else{
      centtxt.textContent = "tampere notadan sapma: " + (r.cents>0?"+":"") + r.cents + " sent" +
        (settings.mode==="koma" ? " — burada perde adı yok" : "");
    }
    // Ölçek seçili moda göre çizili; koma modunda perde yoksa sent değeri komaya çevrilir.
    const shownSc = SCALE[settings.mode];
    const v = komaMode ? r.perde.delta : settings.mode==="sent" ? r.cents : r.cents*53/1200;
    needle.style.left = Math.max(0, Math.min(100, 50 + v/shownSc.max*50)) + "%";
    needle.classList.toggle("good", Math.abs(v) <= shownSc.ok);
    // Küçük gösterge (parmak kartı)
    const npos = Math.max(0, Math.min(100, 50 + v/shownSc.max*50));
    mtNeedle.style.left = npos + "%";
    mtNeedle.classList.toggle("good", Math.abs(v) <= shownSc.ok);
    mtZone.style.left = (50 - shownSc.ok/shownSc.max*50) + "%"; mtZone.style.width = (shownSc.ok/shownSc.max*100) + "%";
    mtPerde.textContent = perdeEl.textContent;
    mtKoma.textContent = !r.inRange ? "—" : komaMode ? fmtKoma(r.perde.delta) + " koma"
      : (r.cents>0?"+":"") + r.cents + " sent";

    // Henüz iz yokken grafik ızgarasını gösterilen notaya ortala
    if(!trace.length){ traceCenter = r.comma; drawTrace(); }

    regEl.textContent = r.inRange ? r.register : "";
    const fk = r.inRange ? r.written : null;
    if(fk !== lastFingerKey){
      lastFingerKey = fk;
      showFingerings(r.inRange ? r.fingerings : [], r.inRange ? r.written : null);
    }
    markActive(fk);
  }
  function sample(){ return analyze(perdeFreq(67, T), T); }   // Rast = yazılı Sol4

  // ---- Nota şeridi: tıkla / klavyeden çal ----
  const LOW = LOW_NOTE;
  const KEYCODES = [
    "KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Comma","Period","Slash",
    "KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL","Semicolon","Quote",
    "KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP","BracketLeft","BracketRight",
    "Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0","Minus","Equal"];
  const KEYLABEL = [
    "Z","X","C","V","B","N","M","Ö","Ç",".",
    "A","S","D","F","G","H","J","K","L","Ş","İ",
    "Q","W","E","R","T","Y","U","I","O","P","Ğ","Ü",
    "1","2","3","4","5","6","7","8","9","0","*","-"];
  const cells = new Map();

  // Şerit tüm aralığı kapsar; en tiz birkaç notanın klavye tuşu yok, yalnızca tıklanır.
  for(let i = 0; i <= HIGH_NOTE - LOW; i++){
    const w = LOW + i, p = nearestPerde((w-67)*53/12);
    const el = document.createElement("button");
    el.className = "note"; el.type = "button";
    el.setAttribute("aria-label", (p ? p.name + ", " : "") + "yazılı " + noteName(w).tr + " çal");
    el.innerHTML = '<span class="pn">' + (p ? p.name : "—") + '</span>' +
                   '<span class="nn">' + noteName(w).tr + '</span>' +
                   (KEYLABEL[i] ? '<span class="kk">' + KEYLABEL[i] + '</span>' : '');
    el.setAttribute("aria-pressed", "false");
    el.addEventListener("click", () => toggleNote(w));
    $("rail").appendChild(el);
    cells.set(w, el);
  }

  // Klavye düzeni Chrome'da okunabiliyorsa etiketleri gerçek harflerle değiştir
  if(navigator.keyboard && navigator.keyboard.getLayoutMap){
    navigator.keyboard.getLayoutMap().then(map => {
      KEYCODES.forEach((code, i) => {
        const lab = map.get(code);
        if(lab) cells.get(LOW+i).querySelector(".kk").textContent = lab.toLocaleUpperCase("tr");
      });
    }).catch(() => {});
  }

  // Etkin notayı şeritte ortala; yalnızca yatay kaydırır (sayfa dikeyde zıplamasın)
  const rail = $("rail");
  let railActive = null;
  function centerInRail(w, smooth){
    const el = cells.get(w);
    if(!el || !rail.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.offsetWidth)/2, behavior: smooth && !reduce ? "smooth" : "auto" });
  }
  // Makam dizisini şeritte işaretle: çerçeveli dizi, dolu durak, kesik güçlü
  function markRailScale(mk){
    cells.forEach(el => el.classList.remove("inscale", "durak", "guclu"));
    if(!mk) return;
    for(const c of new Set([...mk.asc, ...mk.desc])){ const el = cells.get(commaToWritten(c)); if(el) el.classList.add("inscale"); }
    const d = cells.get(commaToWritten(mk.durak)), g = cells.get(commaToWritten(mk.guclu));
    if(d) d.classList.add("durak");
    if(g) g.classList.add("guclu");
  }
  // Şeritteki perde adları bağlama göre (ör. Uşşak'ta yazılı Si4 = Segâh)
  function relabelRail(){
    cells.forEach((el, w) => {
      const p = analyze(perdeFreq(w, T), T).perde;
      el.querySelector(".pn").textContent = p ? p.name : "—";
      el.setAttribute("aria-label", (p ? p.name + ", " : "") + "yazılı " + noteName(w).tr + " çal");
    });
  }
  function markActive(w){
    cells.forEach((el,k) => el.classList.toggle("on", k===w));
    if(w !== railActive){ railActive = w; centerInRail(w, true); }
  }

  // ---- Ses: aynı anda tek nota, aç/kapa ----
  let current = null;                               // çalan yazılı nota
  const stopBtn = $("stopbtn");
  function markPlaying(){
    cells.forEach((el,k) => {
      el.classList.toggle("playing", k===current);
      el.setAttribute("aria-pressed", k===current ? "true" : "false");
    });
    stopBtn.disabled = current === null;
  }
  // freq verilirse nota şeridinin akordu yerine o frekans çalar (ör. makam perdesi)
  function play(w, freq){
    if(current === w && !freq) return;
    if(current !== null) noteOff(current);
    noteOn(w, freq); current = w; markPlaying();
  }
  function stopSound(){
    if(current === null) return;
    noteOff(current); current = null; markPlaying();
  }
  // Şeritten: çalmıyorsa başlat ve göster, aynı nota çalıyorsa durdur
  function toggleNote(w){
    if(current === w){ stopSound(); return; }
    play(w);
    show(analyze(perdeFreq(w, T), T));
  }
  stopBtn.addEventListener("click", stopSound);

  let actx = null, wave = null, synthUntil = 0;
  const voices = new Map();

  function audioCtx(){
    if(!actx){
      actx = new (window.AudioContext || window.webkitAudioContext)();
      // klarnet tınısı: tek sayılı harmonikler
      wave = actx.createPeriodicWave(new Float32Array([0,0,0,0,0,0,0,0]),
                                     new Float32Array([0,1,0,.42,0,.20,0,.10]));
    }
    if(actx.state === "suspended") actx.resume();
    return actx;
  }
  function noteOn(w, exact){
    if(voices.has(w)) return;
    const freq = exact || perdeFreq(w, T);
    const a = audioCtx(), t = a.currentTime;
    const osc = a.createOscillator(), g = a.createGain();
    osc.setPeriodicWave(wave);
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
    osc.connect(g).connect(a.destination);
    osc.start();
    voices.set(w, {osc, g});
    hist.length = 0; stab.reset();
  }
  function noteOff(w){
    const v = voices.get(w);
    if(!v) return;
    voices.delete(w);
    const t = actx.currentTime;
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setValueAtTime(Math.max(v.g.gain.value, 0.0001), t);
    v.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    v.osc.stop(t + 0.18);
    synthUntil = performance.now() + 300;   // yankı/kuyruk bitene kadar mikrofonu dinleme
  }

  window.addEventListener("keydown", e => {
    if(e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if(tag === "select" || tag === "input" || tag === "textarea") return;
    if(e.key === "Escape"){ stopSound(); return; }
    const i = KEYCODES.indexOf(e.code);
    if(i < 0) return;
    e.preventDefault();
    toggleNote(LOW + i);
  });
  // Sekme arka plana geçince unutulan ses çalmaya devam etmesin
  document.addEventListener("visibilitychange", () => { if(document.hidden) stopSound(); });

  // ---- Entonasyon izi ----
  const canvas = $("trace"), TRACE_MS = 8000;
  const trace = [];          // {t, comma} ya da {t, comma:null} (sessizlik)
  const traceMarks = [];     // glissando işaretleri {t}
  let traceCenter = 0;
  function drawTrace(){
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if(!W || !H) return;
    if(canvas.width !== Math.round(W*dpr) || canvas.height !== Math.round(H*dpr)){
      canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
    }
    const g = canvas.getContext("2d");
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,W,H);
    const cs = getComputedStyle(document.documentElement);
    const col = n => cs.getPropertyValue(n).trim();
    const now = performance.now();
    while(trace.length && now - trace[0].t > TRACE_MS) trace.shift();
    const last = [...trace].reverse().find(p => p.comma!==null);
    if(last) traceCenter += (last.comma - traceCenter) * 0.25;
    const span = 6;                                   // görünen aralık: ±6 koma
    const y = c => H/2 - (c - traceCenter)/span * (H/2 - 10);
    const LEFT = 92;
    g.font = "500 10px " + col("--ui");
    g.textBaseline = "middle";
    let lastLabelY = -1e9;
    for(const [c,name] of [...PERDES].reverse()){          // tizden pese: üstten aşağı
      if(Math.abs(c - traceCenter) > span) continue;
      const yy = y(c);
      g.strokeStyle = col("--line"); g.lineWidth = 1;
      g.beginPath(); g.moveTo(LEFT, yy); g.lineTo(W, yy); g.stroke();
      if(yy - lastLabelY < 13) continue;                   // 1 koma aralıklı perdelerde yazılar üst üste binmesin
      g.fillStyle = col("--muted");
      g.fillText(name, 8, yy);
      lastLabelY = yy;
    }
    g.strokeStyle = col("--accent"); g.lineWidth = 2; g.lineJoin = "round";
    g.beginPath();
    let pen = false;
    for(const p of trace){
      if(p.comma===null){ pen = false; continue; }
      const x = LEFT + (1 - (now - p.t)/TRACE_MS) * (W - LEFT);
      const yy = Math.max(2, Math.min(H-2, y(p.comma)));
      if(pen) g.lineTo(x, yy); else { g.moveTo(x, yy); pen = true; }
    }
    g.stroke();
    while(traceMarks.length && now - traceMarks[0].t > TRACE_MS) traceMarks.shift();
    g.fillStyle = col("--teal"); g.strokeStyle = col("--teal"); g.lineWidth = 1;
    g.setLineDash([3,3]);
    for(const m of traceMarks){
      const x = LEFT + (1 - (now - m.t)/TRACE_MS) * (W - LEFT);
      g.beginPath(); g.moveTo(x, 4); g.lineTo(x, H-4); g.stroke();
      g.fillText("gliss.", x + 3, 10);
    }
    g.setLineDash([]);
  }
  window.addEventListener("resize", drawTrace);

  // Sayfa açılışında örnek: duyulan Re4 = yazılı Sol4 = Rast
  // Bağlantıyla belirli bir notayı aç: #nota=52 (yazılı MIDI numarası, 52–99)
  function fromHash(){
    const m = /nota=(\d+)/.exec(location.hash);
    const w = m ? +m[1] : NaN;
    return w>=LOW && w<=HIGH_NOTE ? analyze(perdeFreq(w, T), T) : null;
  }
  window.addEventListener("hashchange", () => { const r = fromHash(); if(r && !running) show(r); });
  drawScale();
  show(fromHash() || sample());
  drawTrace();

  let ctx=null, stream=null, analyser=null, buf=null, running=false, starting=false, timer=null, drawPending=false, lastT=0, lastFreq=-1, winLen=4096;
  const hist=[];
  const stab = new NoteStabilizer(3);
  applyCtx();

  // Dinlerken ekranın uykuya geçmesini engelle (Screen Wake Lock API).
  // Sekme arka plana gidince tarayıcı kilidi otomatik bırakır; geri gelince yeniden alınır.
  let wakeLock=null;
  async function keepAwake(){
    if(!("wakeLock" in navigator) || wakeLock) return;
    try{
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }catch(e){ wakeLock = null; }
  }
  function letSleep(){
    if(wakeLock){ wakeLock.release(); wakeLock = null; }
  }
  document.addEventListener("visibilitychange", () => {
    if(running && document.visibilityState === "visible") keepAwake();
    // Android uygulamasında arka plana geçince mikrofonu bırak (izin göstergesi açık kalmasın)
    if(running && document.hidden && window.Capacitor) stop();
  });

  async function start(){
    if(running || starting) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      chip.textContent = "bu ortamda mikrofon açılamıyor (https gerekli)"; return;
    }
    starting = true; btn.disabled = true; chip.textContent = "izin bekleniyor";
    try{
      stream = await navigator.mediaDevices.getUserMedia({ audio:{
        echoCancellation: !!store.get("aec", false), noiseSuppression:false, autoGainControl:false }});
    }catch(e){
      chip.textContent = "mikrofon açılamadı (" + e.name + ")";
      starting = false; btn.disabled = false;
      return;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    ctx.createMediaStreamSource(stream).connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    hist.length = 0; stab.reset();
    running = true; starting = false; btn.disabled = false;
    btnLab.textContent = "Durdur"; btn.classList.add("listening");
    chip.textContent = "dinliyor"; chip.classList.add("live");
    perdeEl.classList.remove("resting");
    keepAwake();
    timer = setInterval(tick, 40);
    emit("mic", { on:true });
  }
  function stop(){
    running=false;
    letSleep();
    clearInterval(timer); timer = null;
    if(stream) stream.getTracks().forEach(t=>t.stop());
    if(ctx) ctx.close();
    stream = ctx = analyser = null;
    hist.length = 0; stab.reset();
    perdeEl.style.opacity = 1;
    perdeEl.classList.add("resting");
    $("lvbar").style.width = "0"; $("lvbar").classList.remove("hot");
    btnLab.textContent = "Mikrofon"; btn.classList.remove("listening");
    chip.textContent = "durdu"; chip.classList.remove("live");
    emit("mic", { on:false });
  }
  function silent(){
    hist.length = 0;
    perdeEl.style.opacity = .45;
    chip.textContent = "sessiz";
    if(trace.length && trace[trace.length-1].comma!==null) trace.push({t:performance.now(), comma:null});
  }
  // Ritim için nota başının kesin zamanı: son ~80 ms'yi 128 örneklik bloklara bölüp enerjinin
  // en son hızla yükseldiği bloğu bulur (40 ms'lik ölçüm aralığından bağımsız, ~3 ms çözünürlük).
  const RISE_BLK = 128;
  function riseTime(now){
    const sr = ctx.sampleRate, nb = Math.min(Math.floor(buf.length/RISE_BLK), Math.ceil(0.08*sr/RISE_BLK));
    const e = new Float32Array(nb);
    for(let b=0;b<nb;b++){
      let s = 0; const o = buf.length - (nb-b)*RISE_BLK;
      for(let i=0;i<RISE_BLK;i++) s += buf[o+i]*buf[o+i];
      e[b] = Math.sqrt(s/RISE_BLK);
    }
    const top = Math.max(...e);
    if(top < 1e-4) return null;
    for(let b=nb-1;b>0;b--)
      if(e[b] >= 0.5*top && e[b-1] < 0.3*top) return now - (nb-b)*RISE_BLK/sr*1000;
    return null;
  }
  // Analiz ekran yenilemesinden bağımsız, 40 ms'de bir çalışır (zaman damgaları düzenli kalsın);
  // iz çizimi ekran yenilemesine bırakılır.
  function drawSoon(){
    if(drawPending) return;
    drawPending = true;
    requestAnimationFrame(() => { drawPending = false; drawTrace(); });
  }
  function tick(){
    if(!running) return;
    const now = performance.now();
    lastT = now;
    analyser.getFloatTimeDomainData(buf);
    // Şeritten çalınan ses hoparlörden mikrofona girmesin
    if(voices.size || now < synthUntil){
      chip.textContent = "örnek ses çalıyor";
      drawSoon();
      return;
    }
    const minRms = sensitivityToRms(settings.sens);
    // Tiz notalarda son 2048 örnek yeter (≈43 ms): pencere kısalınca gösterge daha çabuk tepki verir.
    // Pes notalar için 4096 örnek (≈85 ms) kullanılır. Dron açıkken karışımın kendisi alt harmonik
    // içerdiğinden alt harmonik denetimi kapanır.
    const win = lastFreq > 250 ? buf.subarray(buf.length - 2048) : buf;
    winLen = win.length;
    const d = detectPitch(win, ctx.sampleRate, 100, 2100, minRms, { subharmonic: !(window.SK && SK.droneActive) });
    // Dron ya da kayıt dinletilirken o ses nota sayılmasın (practice.js)
    if(d.freq > 0 && window.SK && window.SK.ignore && window.SK.ignore(d.freq, d.rms)) d.freq = -1;
    lastFreq = d.freq;
    const lv = $("lvbar");
    lv.style.width = dbPos(d.rms) + "%";
    lv.classList.toggle("hot", d.rms >= minRms);
    // Her ölçümde seviye ve ses netliği (ritim, ses kalitesi ve dinamik alıştırmaları için)
    const lev = { t:now, rms:d.rms, on: d.freq > 0, clarity:d.clarity, freq:d.freq, tOn: riseTime(now) };
    levelTaps.forEach(fn => fn(lev));
    emit("level", lev);
    if(d.freq > 0){
      emit("raw", { t:now, freq:d.freq, comma:(freqToMidi(d.freq) + T - 67)*53/12, rms:d.rms, clarity:d.clarity });
      hist.push(d.freq); if(hist.length>5) hist.shift();
      const med = [...hist].sort((a,b)=>a-b)[Math.floor(hist.length/2)];
      const r = analyze(med, T);
      const prev = stab.shown;
      if(stab.push(noteKey(r))){
        show(r);
        perdeEl.style.opacity = 1;
        chip.textContent = "dinliyor";
        trace.push({t:now, comma:r.comma});
        if(stab.shown !== prev)
          announce.textContent = (r.perde ? r.perde.name + ", " : "") + "yazılı " + r.writtenName.tr;
        emit("note", { t:now, r });
      }
    }else{
      stab.reset();
      silent();
      emit("silence", { t:now });
    }
    drawSoon();
  }
  btn.addEventListener("click", () => running ? stop() : start());

  // ---- Görünümler: Akort / Parmak / Çalışma / Ayarlar ----
  // Ana görünüm Akort'tur. Başka görünüme geçiş geçmişe bir kayıt ekler; böylece Android geri tuşu
  // (ve tarayıcı geri tuşu) önce Akort'a döner, sonra uygulamadan çıkar. Görünümler arası geçişte
  // her görünümün kaydırma konumu korunur.
  const VIEWS = ["tune", "finger", "practice", "settings", "review"];
  const navBtns = document.querySelectorAll(".nav [data-view]");
  const wide = window.matchMedia("(min-width:1100px)");   // geniş ekranda parmak şeması akortla yan yana
  const scrollPos = {};
  let view = "tune";
  function setView(v){
    if(!VIEWS.includes(v)) v = "tune";
    if(v === "finger" && wide.matches) v = "tune";
    if(v === view) return;
    scrollPos[view] = window.scrollY;
    view = v;
    document.body.dataset.view = v;
    const navV = v === "review" ? "settings" : v;      // uzman kontrolü Ayarlar'ın alt sayfası
    navBtns.forEach(b => b.dataset.view === navV ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
    if(v !== "settings" && v !== "review") store.set("view", v);
    applyCtx();
    emit("view", { v });
    window.scrollTo(0, scrollPos[v] || 0);
    drawTrace();                                         // gizliyken boyutu 0'dı
    if(v === "finger" || v === "tune") centerInRail(railActive, false);
  }
  function go(v){
    if(v === view || (v === "finger" && wide.matches)) return;
    if(v === "tune"){
      if(history.state && history.state.view && history.state.view !== "tune") history.back();
      else setView("tune");
      return;
    }
    if(view === "tune") history.pushState({view:v}, "");
    else history.replaceState({view:v}, "");
    setView(v);
  }
  window.addEventListener("popstate", e => setView(e.state && e.state.view || "tune"));
  navBtns.forEach(b => b.addEventListener("click", () => {
    if(b.dataset.view === view) window.scrollTo({top:0, behavior:"smooth"});   // aynı sekmeye dokununca başa dön
    else go(b.dataset.view);
  }));
  document.addEventListener("click", e => { const g = e.target.closest("[data-goto]"); if(g) go(g.dataset.goto); });
  wide.addEventListener("change", () => { if(wide.matches && view === "finger") go("tune"); else drawTrace(); });
  // Açılışta son kullanılan görünüme dön (#nota= bağlantısı akortu açar)
  history.replaceState({view:"tune"}, "");
  const startView = /nota=/.test(location.hash) ? "tune" : store.get("view", "tune");
  if(startView !== "tune") go(startView);

  // ---- Çalışma modülleri (practice.js) için arayüz ----
  // Olaylar: "raw" her ölçüm {t, freq, comma}; "note" kararlı nota {t, r}; "silence" {t};
  // "mic" mikrofon açıldı/kapandı {on}.
  function emit(ev, data){ (listeners[ev] || []).forEach(fn => { try{ fn(data); }catch(e){ console.error(e); } }); }
  window.SK = {
    on(ev, fn){ (listeners[ev] = listeners[ev] || []).push(fn); },
    store, cells,
    startMic: start,
    isListening: () => running,
    getStream: () => stream,
    play, stopSound,
    playing: () => current,
    showNote: w => show(analyze(perdeFreq(w, T), T)),
    drawStaffInto,
    markGlide: t => traceMarks.push({ t }),
    windowSec: () => analyser && ctx ? winLen / ctx.sampleRate : 0,
    audioCtx,
    T, inst,
    go,
    // Çalışma bölümü makam dersi/alıştırması sürerken akort bağlamını geçici olarak o makama kurar
    setTempContext(mkId){ tempCtx = mkId ? { mk: mkId } : null; applyCtx(); },
    tuningMode: () => ctxNow().mode,
    markScale: mk => { if(!mk && !tempOn() && userCtx.mk) mk = makamById(userCtx.mk); markRailScale(mk); },
    level: fn => { levelTaps.add(fn); return () => levelTaps.delete(fn); }
  };

  // ---- Yedekleme: sk.* anahtarlarının hepsi tek JSON dosyasına ----
  function backupData(){
    const data = {};
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith("sk.")) try{ data[k.slice(3)] = JSON.parse(localStorage.getItem(k)); }catch(e){}
    }
    return { app:"sol-klarnet", v:1, date:new Date().toISOString(), data };
  }
  const bkMsg = $("bkmsg"), BK_HINT = bkMsg.textContent;
  $("bkexport").addEventListener("click", async () => {
    const json = JSON.stringify(backupData()), name = "sol-klarnet-" + dayKey(new Date()) + ".json";
    const P = window.Capacitor && window.Capacitor.Plugins;
    try{
      if(P && P.Filesystem && P.Share){
        // Android: önbelleğe yaz, paylaşım menüsüyle Drive'a, e-postaya ya da Dosyalar'a kaydet
        const w = await P.Filesystem.writeFile({ path:name, data:json, directory:"CACHE", encoding:"utf8" });
        await P.Share.share({ title:name, url:w.uri, dialogTitle:L("Yedeği kaydet", "Save backup") });
      }else{
        const file = new File([json], name, { type:"application/json" });
        if(navigator.canShare && navigator.canShare({ files:[file] }) && matchMedia("(pointer:coarse)").matches)
          await navigator.share({ files:[file], title:name });
        else{
          const a = document.createElement("a");
          a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
      }
      bkMsg.textContent = L("Yedek hazır: ", "Backup ready: ") + name + " (" + Math.round(json.length/1024) + " KB)";
    }catch(e){
      if(e && e.name === "AbortError") return;
      bkMsg.textContent = L("Yedek kaydedilemedi: ", "Couldn't save the backup: ") + (e && e.message || e);
    }
  });
  $("bkimport").addEventListener("click", () => $("bkfile").click());
  $("bkfile").addEventListener("change", async () => {
    const file = $("bkfile").files[0]; $("bkfile").value = "";
    if(!file) return;
    let bk;
    try{ bk = JSON.parse(await file.text()); }catch(e){ bkMsg.textContent = L("Dosya okunamadı.", "Couldn't read the file."); return; }
    if(!bk || bk.app !== "sol-klarnet" || typeof bk.data !== "object"){ bkMsg.textContent = L("Bu bir Sol Klarnet yedeği değil.", "This is not a Sol Klarnet backup."); return; }
    const when = bk.date ? new Date(bk.date).toLocaleString(LANG === "en" ? "en" : "tr") : "?";
    if(!confirm(L("Bu cihazdaki ilerleme silinip yedekteki (" + when + ") yüklensin mi?", "Replace the progress on this device with the backup from " + when + "?"))) return;
    for(let i=localStorage.length-1;i>=0;i--){ const k = localStorage.key(i); if(k && k.startsWith("sk.")) localStorage.removeItem(k); }
    for(const [k, v] of Object.entries(bk.data)) try{ localStorage.setItem("sk." + k, JSON.stringify(v)); }catch(e){}
    window.SK_RESETTING = true;
    location.reload();
  });
  bkMsg.textContent = BK_HINT;
  // Tarayıcı depolama alanı sıkışınca verileri silmesin (yalnızca web; Android uygulamasında gerekmez)
  if(navigator.storage && navigator.storage.persist && !window.Capacitor)
    navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(() => {});

  // Çevrimdışı kullanım (http/https üzerinden açıldığında; Android uygulamasında dosyalar zaten pakette)
  if("serviceWorker" in navigator && location.protocol.startsWith("http") && !window.Capacitor){
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
