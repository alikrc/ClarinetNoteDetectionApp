// İlk açılış: karşılama, dil, çalgı, seviye (nereden başlanacağı), mikrofon ve ortam gürültüsü, günlük hedef.
// Bitince seçimler kaydedilir ve sayfa yeniden yüklenir (dersler ve ayarlar yeni değerlerle açılır).
// Ayarlar'daki "Karşılamayı yeniden aç" ile tekrar gösterilebilir.
(function(){
  const SK = window.SK;
  if(!SK) return;
  const store = SK.store;
  const root = document.getElementById("onboard");
  const steps = ["hello", "inst", "level", "mic", "goal"];
  let i = 0;
  const pickd = { lang: LANG, inst: store.get("inst", "sol"), level: null, goal: store.get("goal.min", 15), sens: null };

  function open(){ i = 0; root.hidden = false; document.body.classList.add("modal"); render(); root.querySelector("button").focus(); }
  function close(){ root.hidden = true; document.body.classList.remove("modal"); }

  const dots = () => `<div class="obdots" aria-hidden="true">${steps.map((_, k) => `<i class="${k === i ? "on" : k < i ? "done" : ""}"></i>`).join("")}</div>`;
  const nav = (next = L("Devam", "Next"), skip = false) => `<div class="obnav">${i ? `<button class="stopbtn" type="button" data-ob="back">${L("Geri", "Back")}</button>` : "<span></span>"}
    ${skip ? `<button class="stopbtn" type="button" data-ob="next">${L("Atla", "Skip")}</button>` : ""}
    <button class="primary small" type="button" data-ob="next" ${steps[i] === "level" && !pickd.level ? "disabled" : ""}>${next}</button></div>`;

  function render(){
    const s = steps[i];
    let body = "";
    if(s === "hello") body = `
      <div class="eyebrow">${L("Hoş geldin", "Welcome")}</div>
      <h2 class="obtitle">${L("Sol klarneti sıfırdan ustalığa", "The G clarinet, from zero to mastery")}</h2>
      <p>${L("Bu uygulama çaldığını mikrofondan dinler: perdeni koma koma ölçer, parmak pozisyonunu gösterir, ritmini, ses kaliteni ve makam seyrini değerlendirir. 46 derslik müfredat klarneti ilk kez eline alan birini taksim yapabilecek seviyeye kadar götürür.",
        "This app listens to you through the microphone: it measures your pitch comma by comma, shows the fingering, and assesses your rhythm, tone and makam seyir. The 46-lesson course takes someone who has never held a clarinet all the way to playing a taksim.")}</p>
      <p class="muted">${L("Ses yalnızca cihazında işlenir, hiçbir yere gönderilmez.", "Audio is processed only on your device and never sent anywhere.")}</p>
      <div class="seg" role="radiogroup" aria-label="${L("Dil", "Language")}">
        <button type="button" role="radio" data-lang="tr" aria-checked="${pickd.lang === "tr"}">Türkçe</button>
        <button type="button" role="radio" data-lang="en" aria-checked="${pickd.lang === "en"}">English</button>
      </div>`;
    if(s === "inst") body = `
      <h2 class="obtitle">${L("Hangi klarneti çalıyorsun?", "Which clarinet do you play?")}</h2>
      <p>${L("Türk müziğinde en yaygını Sol klarnettir. Yazılı nota ve perde adları seçtiğin klarnete göre hesaplanır.", "The G clarinet is the most common in Turkish music. Written notes and perde names are computed for the clarinet you choose.")}</p>
      <div class="oblist">${INSTRUMENTS.map(x => `<button type="button" class="obopt" data-inst="${x.id}" aria-pressed="${pickd.inst === x.id}"><strong>${x.name}</strong><span>${x.t ? L("yazılı nota duyulan sesin ", "written note is ") + Math.abs(x.t) + L(" yarım ses " + (x.t > 0 ? "üstü" : "altı"), " semitones " + (x.t > 0 ? "above" : "below") + " the sound") : L("yazıldığı gibi duyulur", "sounds as written")}</span></button>`).join("")}</div>`;
    if(s === "level") body = `
      <h2 class="obtitle">${L("Nereden başlayalım?", "Where should we start?")}</h2>
      <div class="oblist">
        <button type="button" class="obopt" data-level="new" aria-pressed="${pickd.level === "new"}"><strong>${L("Hiç çalmadım", "I've never played")}</strong><span>${L("Klarneti tanıma, duruş, nefes, nota okuma ve ritimle başla.", "Start with the instrument, posture, breathing, reading music and rhythm.")}</span></button>
        <button type="button" class="obopt" data-level="some" aria-pressed="${pickd.level === "some"}"><strong>${L("Biraz çalabiliyorum", "I can play a little")}</strong><span>${L("Başlangıç bilgilerini geç, ilk notalardan başla; bildiğin dersleri hızla geçersin.", "Skip the introduction and start with the first notes; you'll get through what you know quickly.")}</span></button>
        <button type="button" class="obopt" data-level="makam" aria-pressed="${pickd.level === "makam"}"><strong>${L("Makam çalışıyorum", "I already play makams")}</strong><span>${L("Bütün dersler açılır; akort ekranında makam seçip icra akordunu kullanabilirsin.", "All lessons are unlocked; pick a makam on the tuner and use practice tuning.")}</span></button>
      </div>`;
    if(s === "mic") body = `
      <h2 class="obtitle">${L("Mikrofon ve oda", "Microphone and room")}</h2>
      <p>${L("Mikrofon iznini ver; sonra 3 saniye sessiz kal, oda gürültüsü ölçülsün ve hassasiyet ona göre ayarlansın.", "Allow the microphone; then stay quiet for 3 seconds so the room noise can be measured and the sensitivity set.")}</p>
      <div class="pbar"><button class="primary small" type="button" data-ob="calib">${L("İzin ver ve ölç", "Allow and measure")}</button></div>
      <div class="muted" id="obcal">${pickd.sens ? L("Hassasiyet ", "Sensitivity ") + pickd.sens + L(" olarak ayarlandı.", " set.") : ""}</div>
      <p class="muted">${L("İpucu: telefonu nota sehpasına, klarnetin çanına 50 cm–1 m uzağa koy. Dron ve metronomu kulaklıkla dinlersen ölçüm daha temiz olur.", "Tip: put the phone on a music stand 50 cm–1 m from the bell. Using headphones for the drone and metronome gives cleaner measurements.")}</p>`;
    if(s === "goal") body = `
      <h2 class="obtitle">${L("Günlük hedefin", "Your daily goal")}</h2>
      <p>${L("Kısa ama her gün çalışmak, seyrek uzun çalışmaktan çok daha etkilidir. Seri, en az 1 dakika çaldığın her gün artar.", "Short daily practice beats long, rare sessions. Your streak grows every day you play at least a minute.")}</p>
      <div class="seg" role="radiogroup" aria-label="${L("Günlük hedef", "Daily goal")}">${[10, 15, 20, 30, 45].map(m => `<button type="button" role="radio" data-goal="${m}" aria-checked="${pickd.goal === m}">${m} ${L("dk", "min")}</button>`).join("")}</div>`;
    root.querySelector(".obcard").innerHTML = dots() + body + nav(i === steps.length - 1 ? L("Başla", "Start") : L("Devam", "Next"), s === "mic");
  }

  root.addEventListener("click", async e => {
    const b = e.target.closest("button"); if(!b) return;
    if(b.dataset.lang){ pickd.lang = b.dataset.lang; if(b.dataset.lang !== LANG){ store.set("lang", b.dataset.lang); store.set("onboard.resume", true); location.reload(); } return; }
    if(b.dataset.inst){ pickd.inst = b.dataset.inst; render(); return; }
    if(b.dataset.level){ pickd.level = b.dataset.level; render(); return; }
    if(b.dataset.goal){ pickd.goal = +b.dataset.goal; render(); return; }
    const act = b.dataset.ob;
    if(act === "back"){ i = Math.max(0, i - 1); render(); return; }
    if(act === "calib"){
      const msg = root.querySelector("#obcal");
      await SK.startMic();
      if(!SK.isListening()){ msg.textContent = L("Mikrofon açılamadı. Tarayıcı ya da telefon ayarlarından izin verip yeniden dene.", "Couldn't open the microphone. Allow it in the browser or phone settings and try again."); return; }
      msg.textContent = L("Ölçülüyor… sessiz kal.", "Measuring… stay quiet.");
      const vals = []; const off = SK.level(f => vals.push(f.rms));
      await new Promise(r => setTimeout(r, 3000)); off();
      vals.sort((a, c) => a - c);
      const noise = vals.length ? vals[Math.floor(vals.length*0.9)] : 0.002, thr = Math.max(0.0015, noise*2.5);
      pickd.sens = Math.round(Math.min(10, Math.max(1, 1 + 9*Math.log(thr/0.03)/Math.log(0.002/0.03))));
      msg.textContent = L("Hazır. Hassasiyet ", "Done. Sensitivity ") + pickd.sens + (pickd.sens <= 2 ? L(" (oda gürültülü; daha sessiz bir yer daha iyi olur).", " (noisy room; a quieter place would help).") : ".");
      return;
    }
    if(act === "next"){
      if(i < steps.length - 1){ i++; render(); return; }
      finish();
    }
  });

  // Seviyeye göre ders ilerlemesini kur: başlangıç ünitesi (ve isteğe göre her şey) açılır
  function finish(){
    store.set("inst", pickd.inst);
    store.set("goal.min", pickd.goal);
    if(pickd.sens) store.set("sens", pickd.sens);
    const prog = store.get("lesson.prog", {});
    if(pickd.level === "some" || pickd.level === "makam"){
      for(const l of LESSONS.filter(x => x.unit === "baslangic")){
        const p = prog[l.id] || (prog[l.id] = { s:{} });
        l.steps.forEach((st, k) => { if(st.type === "read" && !(p.s[k] && p.s[k].ok)) p.s[k] = { v:1, ok:true }; });
        // Okuma dışındaki adımlar (ilk ses, ritim) da geçilmiş sayılır: bilen biri bunlarda takılmasın
        l.steps.forEach((st, k) => { if(!(p.s[k] && p.s[k].ok)) p.s[k] = { v: st.type === "notes" ? 0 : (st.min || st.n || 1), ok:true }; });
        p.d = p.d || dayKey(new Date());
      }
      store.set("lesson.prog", prog);
    }
    if(pickd.level === "makam") store.set("lesson.all", true);
    store.set("lesson.cur", "");
    store.set("ptab", "lessons");
    store.set("view", "practice");
    store.set("onboard.done", true);
    store.set("onboard.resume", false);
    window.SK_RESETTING = true;
    location.reload();
  }

  // Ayarlar'dan yeniden açma
  const again = document.getElementById("obagain");
  if(again) again.addEventListener("click", () => { store.set("onboard.done", false); open(); });
  root.addEventListener("keydown", e => { if(e.key === "Escape" && store.get("onboard.done", false)) close(); });

  // İlk açılışta (ya da dil değişince kaldığı yerden) göster. Eski kullanıcılar (ilerlemesi olan) atlanır.
  const played = Object.values(store.get("days", {})).reduce((a, b) => a + b, 0);
  const hasHistory = Object.keys(store.get("lesson.prog", {})).length > 0 || played > 120;
  if(store.get("onboard.resume", false)){ open(); i = 1; render(); }
  else if(!store.get("onboard.done", false) && !hasHistory) open();
  else if(!store.get("onboard.done", false)) store.set("onboard.done", true);
})();
