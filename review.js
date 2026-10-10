// Uzman kontrolü: bir hoca ya da deneyimli Sol klarnetçi parmak pozisyonlarını, makam dizilerini ve icra
// düzeltmelerini tek tek "doğru / yanlış / emin değilim" diye işaretler, yorum yazar ve rapor paylaşır.
// İşaretler cihazda (sk.review) tutulur; rapor düz metin + JSON olarak paylaşılır.
(function(){
  const SK = window.SK;
  if(!SK) return;
  const $ = id => document.getElementById(id);
  const store = SK.store, T = SK.T;
  const nn = w => LANG === "en" ? noteName(w).en : noteName(w).tr;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const root = $("reviewview");
  const rv = store.get("review", { name:"", items:{} });
  const save = () => store.set("review", rv);
  const VERDICTS = [["ok", L("Doğru", "Correct")], ["bad", L("Yanlış", "Wrong")], ["unsure", L("Emin değilim", "Not sure")]];

  root.innerHTML = `
    <div class="cardhead"><h2 class="vtitle" id="rvlab">${L("Uzman kontrolü", "Expert review")}</h2>
      <button class="stopbtn" type="button" data-goto="settings">${L("← Ayarlar", "← Settings")}</button></div>
    <p class="lede">${L("Uygulamadaki parmak pozisyonları Woodwind Fingering Guide'ın Albert tablolarından, makam dizileri AEU çeşni tanımlarından derlendi; icra düzeltmeleri yaklaşık. Gerçek bir Sol klarnetle kontrol edip her maddeyi işaretle, yanlışlar için doğrusunu yaz. Bitince raporu geliştiriciye gönder.",
      "The fingerings were compiled from the Woodwind Fingering Guide's Albert tables and the makam scales from AEU tetrachord definitions; the practice-tuning adjustments are approximate. Check each item on a real G clarinet, mark it, and write the correct version for anything wrong. Then send the report to the developer.")}</p>
    <div class="settings"><div class="srow">
      <label class="label" for="rvname">${L("Adın ve ünvanın", "Your name and role")}</label>
      <input type="text" id="rvname" placeholder="${L("ör. Ahmet Yılmaz, klarnet öğretmeni", "e.g. Jane Doe, clarinet teacher")}">
    </div></div>
    <div class="kv" id="rvsum"></div>
    <div class="ptabs" role="tablist" aria-label="${L("Kontrol türü", "Review type")}">
      <button type="button" role="tab" data-rt="f" id="rt-f">${L("Parmak pozisyonları", "Fingerings")}</button>
      <button type="button" role="tab" data-rt="m" id="rt-m">${L("Makamlar", "Makams")}</button>
    </div>
    <div id="rvbody"></div>
    <div class="pbar"><button class="primary small" id="rvshare" type="button">${L("Raporu paylaş", "Share the report")}</button>
      <button class="stopbtn" id="rvcopy" type="button">${L("Panoya kopyala", "Copy to clipboard")}</button>
      <span class="muted" id="rvmsg"></span></div>`;

  $("rvname").value = rv.name || "";
  $("rvname").addEventListener("change", () => { rv.name = $("rvname").value.trim(); save(); });

  function summary(){
    const all = allItems(), v = all.map(k => rv.items[k] && rv.items[k].v);
    const n = x => v.filter(y => y === x).length;
    $("rvsum").innerHTML = `<div><span class="label">${L("Kontrol edilen", "Reviewed")}</span><span class="big2">${v.filter(Boolean).length}</span>/ ${all.length}</div>
      <div><span class="label">${L("Doğru", "Correct")}</span><span class="big2">${n("ok")}</span></div>
      <div><span class="label">${L("Yanlış", "Wrong")}</span><span class="big2">${n("bad")}</span></div>
      <div><span class="label">${L("Emin değil", "Unsure")}</span><span class="big2">${n("unsure")}</span></div>`;
  }
  function allItems(){
    const out = [];
    for(let w=LOW_NOTE; w<=HIGH_NOTE; w++) fingeringsFor(w).forEach((_, i) => out.push("f:" + w + ":" + i));
    MAKAMS.forEach(m => out.push("m:" + m.id));
    return out;
  }

  // İşaret düğmeleri ve yorum kutusu
  function verdictBox(key){
    const it = rv.items[key] || {};
    return `<div class="rvv" data-key="${key}">
      <div class="seg" role="radiogroup" aria-label="${L("Değerlendirme", "Verdict")}">${VERDICTS.map(([v, t]) =>
        `<button type="button" role="radio" data-v="${v}" aria-checked="${it.v === v}">${t}</button>`).join("")}</div>
      <input type="text" class="rvc" placeholder="${L("Yorum ya da doğrusu (ör. doğru parmak kodu)", "Comment or correction (e.g. the right fingering)")}" value="${esc(it.c || "")}">
    </div>`;
  }
  root.addEventListener("click", e => {
    const b = e.target.closest(".rvv [data-v]"); if(!b) return;
    const key = b.closest(".rvv").dataset.key, it = rv.items[key] || (rv.items[key] = {});
    it.v = it.v === b.dataset.v ? undefined : b.dataset.v;
    if(!it.v && !it.c) delete rv.items[key];
    b.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-checked", x.dataset.v === (it.v || "") ? "true" : "false"));
    save(); summary(); markHeads();
  });
  root.addEventListener("change", e => {
    if(!e.target.classList.contains("rvc")) return;
    const key = e.target.closest(".rvv").dataset.key, it = rv.items[key] || (rv.items[key] = {});
    it.c = e.target.value.trim();
    if(!it.v && !it.c) delete rv.items[key];
    save(); summary();
  });

  // Küçük parmak şeması (ana şemanın kopyası)
  function chart(code){
    const c = document.querySelector("svg.chart").cloneNode(true);
    c.querySelectorAll("[id]").forEach(n => { n.id = "rv-" + n.id; n.removeAttribute("tabindex"); n.removeAttribute("role"); n.removeAttribute("aria-label"); n.removeAttribute("aria-pressed"); });
    c.classList.add("minichart"); c.setAttribute("aria-hidden", "true");
    const on = new Set(fingeringIds(code).map(i => "rv-" + i));
    c.querySelectorAll(".hole, .key").forEach(n => n.classList.toggle("on", on.has(n.id)));
    return c;
  }

  let tab = store.get("review.tab", "f");
  function markHeads(){
    root.querySelectorAll("details[data-w]").forEach(d => {
      const w = +d.dataset.w, keys = fingeringsFor(w).map((_, i) => "f:" + w + ":" + i);
      const done = keys.filter(k => rv.items[k] && rv.items[k].v).length, bad = keys.some(k => rv.items[k] && rv.items[k].v === "bad");
      d.querySelector(".rvcount").textContent = done + "/" + keys.length + (bad ? " · " + L("yanlış var", "has errors") : "");
      d.classList.toggle("rvbad", bad);
    });
  }
  function renderFingers(){
    const body = $("rvbody");
    let html = "";
    for(let w=LOW_NOTE; w<=HIGH_NOTE; w++){
      const p = nearestPerde((w-67)*53/12);
      html += `<details class="rvnote" data-w="${w}"><summary><strong>${nn(w)}</strong> <span class="muted">${p ? p.name + " · " : ""}${fingeringsFor(w).length} ${L("parmak", "fingering(s)")}</span> <span class="rvcount muted"></span></summary><div class="rvlist"></div></details>`;
    }
    body.innerHTML = html;
    body.querySelectorAll("details[data-w]").forEach(d => d.addEventListener("toggle", () => {
      if(!d.open || d.dataset.built) return;
      d.dataset.built = "1";
      const w = +d.dataset.w, list = d.querySelector(".rvlist");
      fingeringsFor(w).forEach((fg, i) => {
        const item = document.createElement("div"); item.className = "rvitem";
        item.appendChild(chart(fg.code));
        const side = document.createElement("div");
        const steps = describeFingering(fg.code).filter(r => r.active).map(r => `<li><b>${esc(r.part)}</b>: ${esc(r.text)}</li>`).join("");
        side.innerHTML = `<div class="label">${i ? L("Alternatif ", "Alternative ") + i : L("Temel parmak", "Basic fingering")}</div>
          <code class="fcode">${esc(fg.code)}</code>${fg.note ? `<p class="muted">${esc(fg.note)}</p>` : ""}
          <ul class="rvsteps">${steps || `<li>${L("Hiçbir şey basılı değil", "Nothing pressed")}</li>`}</ul>
          <button class="stopbtn" type="button" data-hear="${w}">${L("Notayı duy", "Hear the note")}</button>
          ${verdictBox("f:" + w + ":" + i)}`;
        item.appendChild(side);
        list.appendChild(item);
      });
    }));
    markHeads();
  }
  function renderMakams(){
    $("rvbody").innerHTML = MAKAMS.map(mk => {
      const chips = list => list.map(c => `<span class="pchip"><b>${perdeName(c)}</b><small>${nn(commaToWritten(c))} · ${c} k</small></span>`).join("");
      const fix = Object.entries(mk.icra).map(([k, d]) => perdeNameAt(+k) + " " + (d > 0 ? "+" : "−") + Math.abs(d) + " k").join(", ");
      const st = { cikici: L("çıkıcı", "ascending"), inici: L("inici", "descending"), "inici-cikici": L("inici-çıkıcı", "descending-ascending") }[mk.seyirType];
      return `<div class="rvmk">
        <h3 class="lstitle">${mk.name}</h3>
        <div class="kv"><div><span class="label">${L("Durak", "Final")}</span>${perdeName(mk.durak)}</div>
          <div><span class="label">${L("Güçlü", "Dominant")}</span>${perdeName(mk.guclu)}</div>
          <div><span class="label">${L("Yeden", "Leading tone")}</span>${perdeName(mk.yeden)}</div>
          <div><span class="label">${L("Seyir", "Seyir")}</span>${st}</div>
          <div><span class="label">${L("İcra düzeltmesi", "Practice tuning")}</span>${fix || "—"}</div></div>
        <p class="seyir">${esc(seyirText(mk, LANG))}</p>
        <div class="label">${L("Çıkış", "Ascending")}</div><div class="chiprow">${chips(mk.asc)}</div>
        <div class="label">${L("İniş", "Descending")}</div><div class="chiprow">${chips([...mk.desc].reverse())}</div>
        <div class="pbar"><button class="stopbtn" type="button" data-mkhear="${mk.id}" data-mode="aeu">${L("Diziyi dinle (AEU)", "Hear the scale (AEU)")}</button>
          ${fix ? `<button class="stopbtn" type="button" data-mkhear="${mk.id}" data-mode="icra">${L("Diziyi dinle (icra)", "Hear the scale (practice)")}</button>` : ""}</div>
        ${verdictBox("m:" + mk.id)}
      </div>`;
    }).join("");
  }
  let hearToken = null;
  root.addEventListener("click", async e => {
    const h = e.target.closest("[data-hear]");
    if(h){ const w = +h.dataset.hear; SK.play(w); await sleep(1200); if(SK.playing() === w) SK.stopSound(); return; }
    const m = e.target.closest("[data-mkhear]");
    if(m){
      const mk = makamById(m.dataset.mkhear), token = {}; hearToken = token;
      for(const c of [...mk.asc, ...[...mk.desc].reverse().slice(1)]){
        if(hearToken !== token) return;
        SK.play(commaToWritten(c), midiToFreq(commaToMidi(perdeTarget(mk, c, m.dataset.mode)) - T)); await sleep(520);
      }
      if(hearToken === token) SK.stopSound();
    }
    const tb = e.target.closest("[data-rt]");
    if(tb){ tab = tb.dataset.rt; store.set("review.tab", tab); render(); }
  });
  function render(){
    root.querySelectorAll("[data-rt]").forEach(b => b.setAttribute("aria-selected", b.dataset.rt === tab ? "true" : "false"));
    if(tab === "m") renderMakams(); else renderFingers();
    summary();
  }

  // ---- Rapor ----
  function report(){
    const lines = [L("Sol Klarnet — uzman kontrolü raporu", "Sol Klarnet — expert review report"),
      L("Kontrol eden: ", "Reviewer: ") + (rv.name || "—"), L("Tarih: ", "Date: ") + new Date().toISOString().slice(0, 10), ""];
    const vt = v => ({ ok: L("DOĞRU", "CORRECT"), bad: L("YANLIŞ", "WRONG"), unsure: L("EMİN DEĞİL", "UNSURE") })[v] || "—";
    for(const k of allItems()){
      const it = rv.items[k]; if(!it) continue;
      let what;
      if(k.startsWith("f:")){ const [, w, i] = k.split(":"); what = nn(+w) + (+i ? " " + L("alt. ", "alt. ") + i : " " + L("temel", "basic")) + " [" + fingeringsFor(+w)[+i].code + "]"; }
      else what = "Makam " + makamById(k.slice(2)).name;
      lines.push(vt(it.v) + " · " + what + (it.c ? " — " + it.c : ""));
    }
    const all = allItems(), done = all.filter(k => rv.items[k] && rv.items[k].v).length;
    lines.push("", L("Kontrol edilen: ", "Reviewed: ") + done + "/" + all.length, "", "JSON:", JSON.stringify({ app:"sol-klarnet-review", v:1, name:rv.name, items:rv.items }));
    return lines.join("\n");
  }
  $("rvcopy").addEventListener("click", async () => {
    try{ await navigator.clipboard.writeText(report()); $("rvmsg").textContent = L("Kopyalandı.", "Copied."); }
    catch(e){ $("rvmsg").textContent = L("Kopyalanamadı.", "Couldn't copy."); }
  });
  $("rvshare").addEventListener("click", async () => {
    const text = report(), P = window.Capacitor && window.Capacitor.Plugins;
    try{
      if(P && P.Share) await P.Share.share({ title: L("Sol Klarnet uzman raporu", "Sol Klarnet expert report"), text });
      else if(navigator.share) await navigator.share({ title: L("Sol Klarnet uzman raporu", "Sol Klarnet expert report"), text });
      else { await navigator.clipboard.writeText(text); $("rvmsg").textContent = L("Paylaşım yok; rapor panoya kopyalandı.", "No share option; the report was copied."); }
    }catch(e){ if(!e || e.name !== "AbortError") $("rvmsg").textContent = L("Paylaşılamadı.", "Couldn't share."); }
  });

  let built = false;
  SK.on("view", d => { if(d.v === "review" && !built){ built = true; render(); } });
  if(document.body.dataset.view === "review"){ built = true; render(); }
})();
