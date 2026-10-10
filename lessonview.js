// Çalışma bölümünün Dersler sekmesi: ders listesi, ders sayfası, örnek çalma ve adım çalıştırıcıları.
// Ders verisi lessons.js'te, ilerleme mantığı learn.js'te; trainers.js ve pieces.js'teki adımlar TRAINER_STEPS'ten gelir.

TRAINERS.lessons = function(ctx){
  const { SK, $, store, nn, num, sgn, esc, sleep, needMic, holder, perdeOf, tgt, mkFreq, markScale, droneOn, staffSvg, miniChart, paintMini, toneKv, toneTips, days, intStats, makamState: ms } = ctx;
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
    if(act === "drone"){ droneOn(makamById(cur.makam).durak); return; }
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
    ...Object.fromEntries(Object.entries(TRAINER_STEPS).map(([k, fn]) => [k, (st, stage, done) => fn(st, stage, done, ctx)])),
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
        const d = ms.done[mk.id] || { n:0, best:99 };
        d.n++; d.best = Math.min(d.best, avg); ms.done[mk.id] = d; store.set("makam.done", ms.done);
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
};
