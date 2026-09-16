// Carnet Piscine Go : rendu des pages, recherche, mode entraînement et quiz.
(() => {
  const EX = DATA.exercises, QUESTS = DATA.quests;
  // Site multi-pages (body[data-page]) ou page unique avec des routes en hash
  const MULTI = document.body.hasAttribute("data-page");
  const PAGE_FILE = {"": "index.html", quiz: "quiz-jury.html"};
  const L = r => {
    if (!MULTI) return "#/" + r;
    const [page, ex] = r.split("/");
    const file = PAGE_FILE[page] || page + ".html";
    return ex ? file + "#" + ex : file;
  };
  const currentRoute = () => {
    if (location.hash.startsWith("#/")) return location.hash.slice(2);
    if (!MULTI) return "";
    const page = document.body.dataset.page, ex = decodeURIComponent(location.hash.slice(1));
    return ex ? page + "/" + ex : page;
  };
  const byId = Object.fromEntries(EX.map(e => [e.id, e]));
  const app = document.getElementById("app");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const store = {
    get(k, d){ try { const v = localStorage.getItem("carnetgo." + k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
    set(k, v){ try { localStorage.setItem("carnetgo." + k, JSON.stringify(v)); } catch(e){} }
  };
  let done = store.get("done", {});
  let train = store.get("train", false);
  let stats = store.get("quiz", {});
  const revealed = new Set();
  let drafts = store.get("drafts", {});
  const ICON = {
    left: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    pause: '<path d="M8 4v16"/><path d="M16 4v16"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  const live = msg => { const l = document.getElementById("live"); l.textContent = ""; setTimeout(() => l.textContent = msg, 30); };
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // hauteur réelle de la barre du haut (elle passe sur 2 lignes sur mobile)
  const topbar = document.querySelector(".top");
  const setTop = () => document.documentElement.style.setProperty("--top-h", topbar.offsetHeight + "px");
  setTop();
  if ("ResizeObserver" in window) new ResizeObserver(setTop).observe(topbar); else window.addEventListener("resize", setTop);

  /* ---------- coloration Go ---------- */
  const KW = new Set("break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var".split(" "));
  const TY = new Set("int int8 int16 int32 int64 uint uint8 byte rune string bool float32 float64 error".split(" "));
  const BI = new Set("append make len cap new panic copy delete true false nil iota".split(" "));
  function hl(line){
    const re = /(\/\/.*$)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])+')|(`[^`]*`)|(\b\d+\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;
    let out = "", m;
    while ((m = re.exec(line))){
      const [t, com, str, rn, raw, num, id] = m;
      if (com) out += `<span class="c">${esc(com)}</span>`;
      else if (str || raw) out += `<span class="s">${esc(t)}</span>`;
      else if (rn) out += `<span class="s">${esc(rn)}</span>`;
      else if (num) out += `<span class="n">${num}</span>`;
      else if (id){
        const next = line.slice(re.lastIndex).match(/^\s*(.)/);
        const prev = line.slice(0, m.index);
        if (KW.has(id)) out += `<span class="k">${id}</span>`;
        else if (TY.has(id)) out += `<span class="t">${id}</span>`;
        else if (BI.has(id)) out += `<span class="n">${id}</span>`;
        else if (next && next[1] === "." && /^(z01|piscine|fmt)$/.test(id)) out += `<span class="p">${id}</span>`;
        else if ((next && next[1] === "(") || /func\s+$/.test(prev)) out += `<span class="f">${id}</span>`;
        else out += esc(id);
      } else out += esc(t);
    }
    return out;
  }
  const codeLines = (src, prefix) => src.replace(/\n+$/,"").split("\n").map((l, i) =>
    `<span class="ln" data-n="${i+1}" id="${prefix}-L${i+1}">${hl(l) || " "}</span>`).join("");
  const inline = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  /* ---------- navigation ---------- */
  const NAV = [["","Accueil"],["quete-1","Quête 1"],["quete-2","Quête 2"],["quete-3","Quête 3"],["quete-4","Quête 4"],["antiseche","Antisèche"],["quiz","Quiz jury"]];
  const nav = document.getElementById("nav");
  function renderNav(route){
    nav.innerHTML = NAV.map(([h, l]) => {
      const cur = h === "" ? route === "" : route.startsWith(h);
      return `<a href="${L(h)}"${cur ? ' aria-current="page"' : ""}>${l}</a>`;
    }).join("");
  }
  const tt = document.getElementById("train-toggle");
  tt.checked = train;
  tt.addEventListener("change", () => { train = tt.checked; store.set("train", train); revealed.clear(); applyTrain(); live(train ? "Mode entraînement activé : code masqué" : "Code affiché"); });
  function applyTrain(){
    document.querySelectorAll(".ex").forEach(el => {
      const hide = train && !revealed.has(el.dataset.id);
      el.classList.toggle("hidden-ex", hide);
      el.querySelectorAll(".codegrid > .codebox, .codegrid > .notes").forEach(n => { n.inert = hide; });
    });
  }

  /* ---------- accueil ---------- */
  function home(){
    const total = EX.length, nd = EX.filter(e => done[e.id]).length;
    app.innerHTML = `
      <section class="hero">
        <div>
          <div class="eyebrow">Paco Cleret · Piscine Golang · Ynov Campus Rouen B1</div>
          <h1>Les ${total} épreuves à savoir <span>recoder devant le jury</span>.</h1>
          <p>Un document par quête : la consigne en français, ton code complet, ce qu'il fait ligne par ligne, et le test qui prouve qu'il marche. Seul import autorisé : <code>github.com/01-edu/z01</code>.</p>
          <button type="button" class="herosearch" data-open-search>${ic("search")}<span>Le jury te donne une épreuve ? Trouve-la…</span><kbd class="k2">/</kbd></button>
          <div class="progress" style="margin-top:18px;max-width:560px"><div class="bar"><i style="width:${nd/total*100}%"></i></div>${nd}/${total} maîtrisées</div>
        </div>
        <ol class="howto">
          <li><kbd>Lire</kbd><span>Ouvre une quête, lis la consigne puis la logique en bref. Survole ou touche une explication pour surligner ses lignes dans le code.</span></li>
          <li><kbd>Cacher</kbd><span>Active le <b>Mode entraînement</b> : le code disparaît. Réécris-le de mémoire, puis révèle-le pour comparer.</span></li>
          <li><kbd>Simuler</kbd><span>Le <b>Quiz jury</b> tire une épreuve au hasard avec un chrono, puis vérifie ton code : compilation, règles de la consigne et cas de test, avec un verdict oui ou non.</span></li>
        </ol>
      </section>
      <div class="quests">
        ${[1,2,3,4].map(q => {
          const list = EX.filter(e => e.quest === q), d = list.filter(e => done[e.id]).length;
          return `<article class="qcard">
            <header><div><div class="eyebrow">${list.length} exercices</div><h2><a href="${L(`quete-${q}`)}">${esc(QUESTS[q].title)}</a></h2></div><span class="qnum">Q${q}</span></header>
            <p>${esc(QUESTS[q].intro)}</p>
            <div class="chips">${list.map(e => `<a class="chip${done[e.id] ? " done" : ""}" href="${L(`quete-${q}/${e.id}`)}">${e.id}</a>`).join("")}</div>
            <div class="progress"><div class="bar"><i style="width:${d/list.length*100}%"></i></div>${d}/${list.length}</div>
          </article>`;
        }).join("")}
      </div>
      <div class="homecta">
        <a class="cta" href="${L(`antiseche`)}"><div><strong>Antisèche</strong><span>ASCII, conversions, boucles, slices, récursion, modèles récurrents</span></div><em>${ic("right")}</em></a>
        <a class="cta" href="${L(`quiz`)}"><div><strong>Quiz jury</strong><span>Tirage au sort, chrono, vérification automatique du code</span></div><em>${ic("right")}</em></a>
      </div>`;
  }

  /* ---------- quête ---------- */
  function exHTML(e){
    const p = e.id;
    const notes = e.lines.map(([a, b, t]) =>
      `<li tabindex="0" role="button" aria-pressed="false" data-a="${a}" data-b="${b}"><b>${a === b ? "L" + a : "L" + a + "–" + b}</b><span>${inline(t)}</span></li>`).join("");
    const test = e.test
      ? `<div class="codebox"><div class="codebar"><span class="fname">main.go <span style="color:var(--code-dim)">· test</span></span></div><div class="code">${codeLines(e.test, p + "-t")}</div></div>`
      : `<div class="codebox"><div class="codebar"><span class="fname">Lancement</span></div><div class="code" style="padding:14px 16px;white-space:normal;font-size:14px;line-height:1.6"><span style="color:var(--code-dim)">C'est un programme (package main) : pas de fichier de test, on l'exécute directement depuis son dossier.</span></div></div>`;
    return `<article class="ex" id="${p}" data-id="${p}">
      <div class="exhead">
        <div><h2>${p}<small>${e.kind}</small></h2><code class="sig">${esc(e.sig)}</code></div>
        <label class="mastered"><input type="checkbox" data-done="${p}" ${done[p] ? "checked" : ""}> Je sais le refaire</label>
      </div>
      <div class="brief">
        <div><h3>Consigne</h3><p>${inline(e.consigne)}</p></div>
        <div class="explain"><h3>Ce que fait le code</h3><p>${inline(e.bref)}</p><div class="tools">${e.tools.map(t => `<span class="tool">${esc(t)}</span>`).join("")}</div></div>
      </div>
      <div class="codegrid">
        <div class="codebox">
          <div class="codebar"><span class="fname">${esc(e.file)}</span><button type="button" data-copy="${p}" aria-label="Copier le code de ${p}">Copier</button></div>
          <div class="code" id="${p}-code">${codeLines(e.code, p)}</div>
        </div>
        <ol class="notes" aria-label="Explication ligne par ligne">${notes}</ol>
        <div class="veil"><p>Code masqué</p><span>Réécris ${p} de mémoire (sur papier ou dans ton éditeur), puis compare.</span><button type="button" class="btn primary" data-reveal="${p}">${ic("eye")} Révéler le code</button></div>
      </div>
      ${e.note ? `<div class="warnbox"><strong>À savoir</strong><p>${inline(e.note)}</p></div>` : ""}
      <h3 class="sub">Test et sortie attendue</h3>
      <div class="testgrid">
        ${test}
        <div class="term"><div class="codebar"><span class="fname">Terminal</span></div>
          <pre><span class="prompt">$ go run .</span>\n${esc(e.output)}</pre>
          ${e.outputNote ? `<div class="onote">${inline(e.outputNote)}</div>` : ""}
        </div>
      </div>
      ${exNav(e)}
    </article>`;
  }
  function exNav(e){
    const i = EX.indexOf(e), prev = EX[i - 1], next = EX[i + 1];
    const a = (x, cls, label, icon) => x ? `<a class="${cls}" href="${L(`quete-${x.quest}/${x.id}`)}"><span>${label}${x.quest !== e.quest ? " · Quête " + x.quest : ""}</span><b>${cls === "prev" ? ic(icon) + x.id : x.id + ic(icon)}</b></a>` : "";
    return `<nav class="exnav" aria-label="Exercice précédent ou suivant">${a(prev, "prev", "Précédent", "left")}${a(next, "next", "Suivant", "right")}</nav>`;
  }
  let shownQuest = 0, lastAutoScroll = 0;
  function quest(q, target){
    if (shownQuest === q && document.querySelector(".exlist")){
      const el = target && document.getElementById(target);
      if (el) el.scrollIntoView({behavior: reduced() ? "auto" : "smooth"}); else window.scrollTo({top: 0, behavior: reduced() ? "auto" : "smooth"});
      return;
    }
    shownQuest = q;
    const list = EX.filter(e => e.quest === q);
    app.innerHTML = `
      <section class="qhead">
        <div><div class="eyebrow">Quête ${q} · ${list.length} exercices</div><h1>${esc(QUESTS[q].title)}</h1><p>${esc(QUESTS[q].intro)}</p></div>
        <div class="qpager">${q > 1 ? `<a class="btn" href="${L(`quete-${q-1}`)}">${ic("left")} Quête ${q-1}</a>` : ""}${q < 4 ? `<a class="btn" href="${L(`quete-${q+1}`)}">Quête ${q+1} ${ic("right")}</a>` : ""}</div>
      </section>
      <div class="layout">
        <nav class="toc" aria-label="Exercices"><div class="eyebrow">Exercices</div>${list.map(e => `<a href="${L(`quete-${q}/${e.id}`)}" data-toc="${e.id}"><span>${e.id}</span><i class="tick${done[e.id] ? " on" : ""}"></i></a>`).join("")}</nav>
        <div class="exlist">${list.map(exHTML).join("")}</div>
      </div>`;
    applyTrain();
    if (target && byId[target]){
      const go = () => { const el = document.getElementById(target); el && el.scrollIntoView(); };
      requestAnimationFrame(go);
      // les polices chargées après coup décalent la page : on recale une fois
      if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(() => { if (Math.abs(window.scrollY - lastAutoScroll) < 4) go(); });
      requestAnimationFrame(() => { lastAutoScroll = window.scrollY; });
    }
    else window.scrollTo(0, 0);
    watchToc();
  }
  let io;
  function watchToc(){
    io && io.disconnect();
    if (!("IntersectionObserver" in window)) return;
    io = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting){
        document.querySelectorAll("[data-toc]").forEach(a => {
          const on = a.dataset.toc === en.target.id;
          a.classList.toggle("active", on);
          if (on && a.parentElement.scrollWidth > a.parentElement.clientWidth) a.parentElement.scrollTo({left: a.offsetLeft - 40, behavior: reduced() ? "auto" : "smooth"});
        });
      }});
    }, {rootMargin: "-30% 0px -60% 0px"});
    document.querySelectorAll(".ex").forEach(el => io.observe(el));
  }

  /* ---------- antisèche ---------- */
  function sheet(){
    const asc = (from, to) => { let h = ""; for (let i = from; i <= to; i++) h += `<div><b>${String.fromCharCode(i)}</b><span>${i}</span></div>`; return h; };
    const snip = s => `<div class="snip">${s.split("\n").map(hl).join("\n")}</div>`;
    const link = id => `<a class="chip" href="${L(`quete-${byId[id].quest}/${id}`)}">${id}</a>`;
    app.innerHTML = `
      <section class="qhead"><div><div class="eyebrow">À connaître par cœur</div><h1>Antisèche</h1><p>Les bases qui reviennent dans toutes les épreuves, sans fmt : uniquement z01, les opérateurs et les fonctions intégrées de Go.</p></div></section>
      <div class="sheet">
        <section>
          <h2>Squelette d'un exercice</h2>
          <p><b>Fonction</b> : fichier <code>nom.go</code> à la racine, testé par un main séparé.</p>
          ${snip('package piscine\n\nimport "github.com/01-edu/z01"\n\nfunc IsNegative(nb int) {\n\t// ...\n}')}
          <p><b>Programme</b> : dossier <code>nom/main.go</code>, lancé avec <code>go run .</code></p>
          ${snip('package main\n\nimport "github.com/01-edu/z01"\n\nfunc main() {\n\tz01.PrintRune(\'a\')\n\tz01.PrintRune(\'\\n\')\n}')}
          <p class="muted">N'importe z01 que si tu t'en sers : un import inutilisé ne compile pas.</p>
        </section>
        <section>
          <h2>Codes ASCII utiles</h2>
          <p class="muted">Une rune est un nombre : <code>'a' == 97</code>, donc <code>'a' + 1 == 'b'</code>.</p>
          <div class="ascii">${asc(48,57)}</div>
          <div class="ascii"><div><b>A</b><span>65</span></div><div><b>Z</b><span>90</span></div><div><b>a</b><span>97</span></div><div><b>z</b><span>122</span></div><div><b>␠</b><span>32</span></div><div><b>\\n</b><span>10</span></div><div><b>\\t</b><span>9</span></div><div><b>~</b><span>126</span></div></div>
          <div class="tblwrap" style="margin-top:12px"><table class="tbl">
            <tr><th>Plage</th><th>Signification</th></tr>
            <tr><td>48 – 57</td><td>chiffres '0'..'9'</td></tr>
            <tr><td>65 – 90</td><td>majuscules 'A'..'Z'</td></tr>
            <tr><td>97 – 122</td><td>minuscules 'a'..'z'</td></tr>
            <tr><td>32 – 126</td><td>caractères imprimables</td></tr>
            <tr><td>± 32</td><td>écart majuscule ↔ minuscule</td></tr>
          </table></div>
        </section>
        <section>
          <h2>Conversions</h2>
          ${snip('r := []rune(s)      // string → runes (modifiable)\ns = string(r)       // runes → string\ns += string(c)      // ajouter une rune à une string\nd := int(c - \'0\')   // \'7\' → 7\nc := rune(d) + \'0\'  // 7 → \'7\'\nc = c - 32          // \'a\' → \'A\'')}
          <p class="muted"><code>s[i]</code> et <code>len(s)</code> travaillent en <b>octets</b>. Avec des accents, convertis d'abord en <code>[]rune</code>.</p>
        </section>
        <section>
          <h2>Les 4 formes de for</h2>
          ${snip('for i := 0; i < n; i++ { }   // classique\nfor n > 0 { }                // « tant que »\nfor { }                      // infini, sortie par return/break\nfor i, c := range s { }      // i = indice, c = rune\nfor _, c := range s { }      // _ ignore l\'indice')}
          <p class="muted"><code>continue</code> passe au tour suivant, <code>break</code> quitte la boucle.</p>
        </section>
        <section>
          <h2>Slices</h2>
          ${snip('var s []int                  // slice nil\ns := []int(nil)              // idem\ns = append(s, 5)             // ajoute à la fin\ns := make([]int, n)          // n cases à 0\ns[i] = v                     // écrire une case\nlen(s)                       // taille')}
          <p class="muted">AppendRange interdit <code>make</code>, MakeRange interdit <code>append</code>.</p>
        </section>
        <section>
          <h2>Récursion (quand for est interdit)</h2>
          ${snip('func F(n int) int {\n\tif n < 0 {\n\t\treturn 0 // cas d\'erreur\n\t}\n\tif n == 0 {\n\t\treturn 1 // cas de base : STOP\n\t}\n\treturn n * F(n-1) // se rapproche du cas de base\n}')}
          <p class="muted">Toujours : 1) les erreurs, 2) le cas de base, 3) l'appel avec un problème plus petit.</p>
        </section>
        <section>
          <h2>Arithmétique</h2>
          ${snip('n % 10        // dernier chiffre : 321 → 1\nn /= 10       // retire le dernier : 321 → 32\nx = x*10 + d  // ajoute un chiffre : 32, 1 → 321\nn%i == 0      // i divise n\ni*i <= n      // borne pour tester un nombre premier')}
          <p class="muted">Un int fait 64 bits : 20! est la plus grande factorielle qui tient.</p>
        </section>
        <section>
          <h2>Modèles qui reviennent</h2>
          <div class="patterns">
            <div class="pattern"><h3>Chercher l'intrus</h3><p class="muted">Boucle, <code>return false</code> dès qu'un caractère est hors de la plage, <code>return true</code> après la boucle.</p><div class="chips">${["isupper","islower","isnumeric","isprintable","isalpha"].map(link).join("")}</div></div>
            <div class="pattern"><h3>Décaler de ±32</h3><p class="muted">Passer une lettre de minuscule à majuscule (ou l'inverse) dans un <code>[]rune</code>.</p><div class="chips">${["toupper","tolower","capitalize"].map(link).join("")}</div></div>
            <div class="pattern"><h3>Séparateur sauf le dernier</h3><p class="muted">Ajouter <code>", "</code> ou <code>"\\n"</code> entre les éléments, jamais après le dernier.</p><div class="chips">${["printcomb","printcomb2","concatparams"].map(link).join("")}</div></div>
            <div class="pattern"><h3>Mot en cours</h3><p class="muted">Accumuler dans <code>word</code>, ranger au séparateur, ne pas oublier le dernier mot après la boucle.</p><div class="chips">${["splitwhitespaces","split"].map(link).join("")}</div></div>
            <div class="pattern"><h3>Chiffres d'un nombre</h3><p class="muted">Découper avec <code>%10</code> et <code>/10</code>, ou construire avec <code>x*10 + d</code>.</p><div class="chips">${["printnbrinorder","trimatoi"].map(link).join("")}</div></div>
            <div class="pattern"><h3>Itératif ↔ récursif</h3><p class="muted">Même calcul : la boucle devient un appel à soi-même avec n-1.</p><div class="chips">${["iterativefactorial","recursivefactorial","iterativepower","recursivepower","fibonacci"].map(link).join("")}</div></div>
          </div>
        </section>
        <section>
          <h2>Outil clé par épreuve</h2>
          <div class="tblwrap"><table class="tbl"><tr><th>Épreuve</th><th>À retenir</th></tr>
            ${EX.map(e => `<tr><td><a href="${L(`quete-${e.quest}/${e.id}`)}">${e.id}</a></td><td>${e.tools.map(esc).join(" · ")}</td></tr>`).join("")}
          </table></div>
        </section>
      </div>`;
    window.scrollTo(0, 0);
  }

  /* ---------- quiz ---------- */
  let qs = { quests: store.get("quizq", [1,2,3,4]), cur: null, start: null, acc: 0, tick: null, shown: false, confirmReset: false, checks: {} };

  /* Vérificateur : Go compilé en WebAssembly, exécuté dans un Web Worker.
     Tout se passe dans le navigateur ; la page coupe le worker si un cas ne répond pas. */
  const Verif = (() => {
    const BASE = "assets/verif/";
    const CASE_MS = 4000, PREP_MS = 6000, LOAD_MS = 90000;
    let worker = null, seq = 0, loading = null;
    const pending = new Map();
    const api = {state: MULTI && location.protocol !== "file:" && "Worker" in window && "WebAssembly" in window ? "idle" : "unavailable", error: ""};
    const notify = () => renderVerifCard();
    function spawn(){
      worker = new Worker(BASE + "worker.js");
      worker.onmessage = e => {
        const p = pending.get(e.data.id);
        if (p){ pending.delete(e.data.id); clearTimeout(p.to); p.resolve(e.data); }
        // le programme Go s'est arrêté (récursion sans fin…) : ce worker est inutilisable, on en recrée un au prochain appel
        if (!e.data.ok) kill("le vérificateur s'est arrêté");
      };
      worker.onerror = e => { e.preventDefault && e.preventDefault(); kill(e.message || "erreur du vérificateur"); };
    }
    function kill(reason){
      if (worker) worker.terminate();
      worker = null; loading = null;
      for (const p of pending.values()){ clearTimeout(p.to); p.resolve({ok: false, crash: reason}); }
      pending.clear();
    }
    function call(op, args, timeout){
      return new Promise(resolve => {
        if (!worker) spawn();
        const id = ++seq, p = {resolve};
        if (timeout) p.to = setTimeout(() => { pending.delete(id); kill("temps dépassé"); resolve({ok: false, timedOut: true}); }, timeout);
        pending.set(id, p);
        worker.postMessage({id, op, args});
      });
    }
    function load(){
      if (api.state === "unavailable") return Promise.reject(new Error("Vérification disponible uniquement sur le site."));
      if (!loading){
        if (api.state !== "ready"){ api.state = "loading"; notify(); }
        loading = call("analyze", ["printalphabet", ""], LOAD_MS).then(r => {
          if (!r.ok){ loading = null; api.state = "error"; api.error = r.timedOut ? "le chargement a pris trop de temps" : (r.crash || "chargement impossible"); notify(); throw new Error(api.error); }
          api.state = "ready"; notify(); return true;
        });
      }
      return loading;
    }
    const failed = r => r.timedOut ? {timedOut: true, out: "", ms: CASE_MS} : {crash: r.crash || "arrêt du vérificateur", out: ""};
    api.load = load;
    api.check = async (id, code, onStep) => {
      onStep("Chargement du vérificateur…");
      await load();
      onStep("Analyse et compilation…");
      const a = await call("analyze", [id, code], 20000);
      if (!a.ok || a.data.error) throw new Error((a.data && a.data.error) || "analyse impossible");
      let prep = {}, runs = [];
      if (a.data.runnable){
        onStep(a.data.kind === "prog" ? "Exécution du programme…" : "Chargement de ton code…");
        let p = await call("prepare", [id, code], PREP_MS);
        prep = p.ok ? p.data : failed(p);
        if (a.data.kind !== "prog" && p.ok && !prep.err){
          let timeouts = 0;
          for (let k = 0; k < a.data.total; k++){
            onStep(`Cas de test ${k + 1}/${a.data.total}…`);
            const r = await call("run", [k], CASE_MS);
            if (r.ok){ runs.push(r.data); continue; }
            runs.push(failed(r));
            if (r.timedOut && ++timeouts >= 2) break;   // boucle infinie probable : inutile d'attendre chaque cas
            if (k + 1 < a.data.total){
              await load();
              p = await call("prepare", [id, code], PREP_MS);
              if (!p.ok || p.data.err) break;
            }
          }
        }
      }
      await load();
      onStep("Verdict…");
      const rep = await call("report", [id, code, JSON.stringify(prep), JSON.stringify(runs)], 20000);
      if (!rep.ok || rep.data.error) throw new Error((rep.data && rep.data.error) || rep.crash || "rapport impossible");
      return rep.data;
    };
    return api;
  })();

  function renderVerifCard(){
    const el = document.getElementById("verif-card");
    if (!el) return;
    const st = Verif.state;
    const intro = `<p>Ton code est analysé (imports, signature, règles de la consigne), compilé, puis exécuté sur plusieurs cas de test et comparé aux résultats du vrai Go. Tout se passe dans ton navigateur.</p>`;
    if (st === "ready") el.innerHTML = `<div class="state"><i class="dot on"></i>Vérificateur prêt</div>${intro}`;
    else if (st === "loading") el.innerHTML = `<div class="state"><span class="spin" style="width:14px;height:14px;border-width:2px" aria-hidden="true"></span>Chargement du vérificateur…</div><p>Environ 3 Mo, une seule fois : il reste ensuite en cache.</p>`;
    else if (st === "error") el.innerHTML = `<div class="state"><i class="dot off"></i>Vérificateur indisponible</div><p>${esc(Verif.error)}. Recharge la page pour réessayer.</p>`;
    else if (st === "unavailable") el.innerHTML = location.protocol === "file:"
      ? `<div class="state"><i class="dot off"></i>Vérification indisponible en fichier local</div><p>Les navigateurs bloquent le vérificateur sur une page ouverte par double-clic. Ouvre le site en ligne, ou lance un petit serveur dans le dossier du site :</p><pre>python3 -m http.server 8000</pre>`
      : `<div class="state"><i class="dot off"></i>Vérification indisponible ici</div><p>Ouvre le quiz depuis le site du carnet pour vérifier ton code : elle a besoin des fichiers du vérificateur (WebAssembly).</p>`;
    else el.innerHTML = `<div class="state"><i class="dot"></i>Vérificateur intégré</div>${intro}<p>Il se charge dès que tu commences à écrire.</p>`;
  }
  const PILL = {ok: "check", ko: "x", warn: "warn", skip: "skip"};
  ICON.warn = '<path d="M12 8v5"/><path d="M12 17h.01"/>';
  ICON.skip = '<path d="M5 12h14"/>';
  const showVal = s => s === "" ? "(rien)" : s;
  function checkHTML(c){
    if (c.loading) return `<div class="verdict wait"><span class="spin" aria-hidden="true"></span><strong>Vérification en cours…</strong><span>${esc(c.step || "Analyse, compilation puis exécution des cas de test.")}</span></div>`;
    if (c.error) return `<div class="verdict ko"><b>?</b><strong>La vérification n'a pas pu se faire</strong><span>${esc(c.error)}</span></div>`;
    const r = c.result, ok = r.verdict === "ok";
    const failed = r.cases.filter(x => x.status !== "ok"), passed = r.cases.filter(x => x.status === "ok");
    const row = x => `<tr class="${x.status}"><td class="lbl"><code>${esc(x.label)}</code></td><td><code>${esc(showVal(x.expected))}</code></td><td class="got"><code>${esc(showVal(x.got))}</code></td><td class="ms">${x.status === "ok" ? ic("check") : ic("x")} ${x.ms} ms</td></tr>${x.hint ? `<tr class="hintrow"><td colspan="4">${esc(x.hint)}</td></tr>` : ""}`;
    const table = rows => `<div class="casewrap"><table class="cases"><thead><tr><th>Cas</th><th>Attendu</th><th>Obtenu</th><th></th></tr></thead><tbody>${rows.map(row).join("")}</tbody></table></div>`;
    return `
      <div class="verdict ${ok ? "ok" : "ko"}" role="status"><b>${ok ? "OUI" : "NON"}</b><strong>${ok ? "Ton code est valide" : "Ton code n'est pas encore valide"}</strong><span>${esc(r.summary)}${c.time ? " · écrit en " + c.time : ""}</span></div>
      ${r.hints.length ? `<div class="missing"><h4>Ce qu'il manque</h4><ul>${r.hints.map(h => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
      <div><h4>Étapes</h4><ul class="steps">${r.steps.map(s => `<li class="${s.status}"><div><span class="pill ${s.status}">${ic(PILL[s.status])}</span>${esc(s.name)}</div>${(s.details || []).map(d => `<p>${esc(d)}</p>`).join("")}</li>`).join("")}</ul></div>
      ${failed.length ? `<div><h4>Cas échoués (${failed.length})</h4>${table(failed)}</div>` : ""}
      ${passed.length ? `<details class="passed"${failed.length ? "" : " open"}><summary>Cas réussis (${passed.length}/${r.total})</summary>${table(passed)}</details>` : ""}`;
  }
  function renderCheck(id){
    const box = document.getElementById("q-check");
    if (!box || !qs.cur || qs.cur.id !== id) return;
    const c = qs.checks[id];
    box.hidden = !c;
    if (c) box.innerHTML = checkHTML(c);
  }
  async function runCheck(){
    const e = qs.cur, draft = document.getElementById("q-draft");
    const btn = document.getElementById("q-verify");
    if (qs.checks[e.id] && qs.checks[e.id].loading) return;
    if (btn) btn.disabled = true;
    const c = {loading: true, step: ""};
    qs.checks[e.id] = c; renderCheck(e.id);
    const code = draft.value;
    try {
      const data = await Verif.check(e.id, code, step => {
        c.step = step;
        const span = document.querySelector("#q-check .verdict.wait span:last-child");
        if (span && qs.cur && qs.cur.id === e.id) span.textContent = step;
      });
      const done = {result: data};
      if (data.verdict === "ok" && elapsed() >= 1000){
        done.time = fmtT(elapsed());
        if (qs.start){ qs.acc = elapsed(); qs.start = null; clearInterval(qs.tick); }
      }
      qs.checks[e.id] = done;
      live(data.verdict === "ok" ? "Oui : code valide" : "Non : " + data.summary);
    } catch (err){
      qs.checks[e.id] = {error: err.message || String(err)};
    }
    if (qs.cur && qs.cur.id === e.id){
      if (qs.checks[e.id].time){ quiz(); }
      else {
        renderCheck(e.id);
        const b = document.getElementById("q-verify"); if (b) b.disabled = false;
      }
      document.getElementById("q-check")?.scrollIntoView({block: "nearest", behavior: reduced() ? "auto" : "smooth"});
    }
  }
  const elapsed = () => qs.acc + (qs.start ? Date.now() - qs.start : 0);
  function pick(){
    const pool = EX.filter(e => qs.quests.includes(e.quest) && (!qs.cur || e.id !== qs.cur.id));
    const src = pool.length ? pool : EX.filter(e => qs.quests.includes(e.quest));
    // les épreuves ratées sortent deux fois plus souvent
    const weighted = src.flatMap(e => (stats[e.id] && (stats[e.id].ko || 0) > (stats[e.id].ok || 0)) ? [e, e] : [e]);
    qs.cur = weighted[Math.floor(Math.random() * weighted.length)];
    qs.start = null; qs.acc = 0; qs.shown = false; clearInterval(qs.tick);
    delete qs.checks[qs.cur.id];
  }
  const fmtT = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };
  function quiz(){
    if (!qs.cur || !qs.quests.includes(qs.cur.quest)) pick();
    const e = qs.cur;
    const ok = Object.values(stats).reduce((a, s) => a + (s.ok || 0), 0);
    const ko = Object.values(stats).reduce((a, s) => a + (s.ko || 0), 0);
    const toReview = EX.filter(x => stats[x.id] && (stats[x.id].ko || 0) > (stats[x.id].ok || 0));
    const running = !!qs.start, started = running || qs.acc > 0;
    app.innerHTML = `
      <section class="qhead"><div><div class="eyebrow">Simulation</div><h1>Quiz jury</h1><p>Une épreuve tirée au hasard. Lance le chrono, écris la solution sans regarder, puis fais-la vérifier : compilation, règles de la consigne et cas de test, avec un verdict oui ou non.</p></div></section>
      <div class="quiz">
        <div class="qpanel">
          <div class="draw">
            <div><div class="eyebrow">Quête ${e.quest} · ${e.kind}</div><h2>${e.id}</h2><code class="sig">${esc(e.sig)}</code></div>
            <div class="timerbox"><div class="eyebrow">Chrono · objectif 5 min</div><div class="timer${elapsed() > 300000 ? " late" : ""}" id="timer" role="timer" aria-live="off">${fmtT(elapsed())}</div>
              <div class="timerctl">
                <button type="button" class="iconbtn" id="q-pause" aria-label="${running ? "Mettre en pause" : "Démarrer le chrono"}">${ic(running ? "pause" : "play")}</button>
                <button type="button" class="iconbtn" id="q-reset" aria-label="Remettre le chrono à zéro" ${started ? "" : "disabled"}>${ic("reset")}</button>
              </div>
            </div>
          </div>
          <p class="consigne">${inline(e.consigne)}</p>
          <div class="qactions">
            ${started ? "" : `<button type="button" class="btn primary" id="q-start">${ic("play")} Démarrer l'épreuve</button>`}
            <button type="button" class="btn${started ? " primary" : ""}" id="q-show">${ic("eye")} Voir la correction</button>
            <button type="button" class="btn" id="q-next">${ic("shuffle")} Autre épreuve</button>
          </div>
          <label class="sub" for="q-draft" style="display:block">Brouillon</label>
          <textarea class="draft" id="q-draft" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="${e.kind === "Programme" ? "package main" : "package piscine"}&#10;&#10;// Écris ta solution ici (Tab pour indenter)…">${esc(drafts[e.id] || "")}</textarea>
          <div class="checkbar">
            <button type="button" class="btn primary" id="q-verify" ${qs.checks[e.id] && qs.checks[e.id].loading ? "disabled" : ""}>${ic("check")} Vérifier mon code</button>
            <span class="muted"><kbd class="k2">${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}</kbd> + <kbd class="k2">Entrée</kbd> depuis le brouillon</span>
          </div>
          <div class="checkres" id="q-check" aria-live="polite" ${qs.checks[e.id] ? "" : "hidden"}>${qs.checks[e.id] ? checkHTML(qs.checks[e.id]) : ""}</div>
          <div class="reveal" id="q-reveal" ${qs.shown ? "" : "hidden"}>
            <h3 class="sub" style="margin-top:0">Comparaison</h3>
            <div class="compare">
              <div><h4>Ton brouillon</h4><pre class="draftview" id="q-draftview"></pre></div>
              <div><h4>Ton code · ${esc(e.file)}</h4><div class="codebox"><div class="code">${codeLines(e.code, "quiz")}</div></div></div>
            </div>
            ${e.note ? `<div class="warnbox"><strong>À savoir</strong><p>${inline(e.note)}</p></div>` : ""}
            <div class="qactions">
              <button type="button" class="btn ok" id="q-ok">${ic("check")} Réussi</button>
              <button type="button" class="btn bad" id="q-ko">${ic("x")} À revoir</button>
              <a class="btn" href="${L(`quete-${e.quest}/${e.id}`)}">Ouvrir la fiche ${ic("right")}</a>
            </div>
          </div>
        </div>
        <aside class="side">
          <div class="qpanel verifcard" id="verif-card"></div>
          <div class="qpanel"><h3>Choisir l'épreuve</h3>
            <label class="sr" for="q-choose">Épreuve</label>
            <select class="choose" id="q-choose">
              ${[1,2,3,4].map(q => `<optgroup label="Quête ${q}">${EX.filter(x => x.quest === q).map(x => `<option value="${x.id}"${x.id === e.id ? " selected" : ""}>${x.id}</option>`).join("")}</optgroup>`).join("")}
            </select>
          </div>
          <div class="qpanel"><h3>Quêtes dans le tirage</h3>
            <div class="filters">${[1,2,3,4].map(q => `<label><input type="checkbox" data-q="${q}" ${qs.quests.includes(q) ? "checked" : ""}> Q${q}</label>`).join("")}</div>
          </div>
          <div class="qpanel"><h3>Bilan</h3>
            <div class="stats"><div class="stat ok"><b>${ok}</b><span>réussies</span></div><div class="stat bad"><b>${ko}</b><span>à revoir</span></div></div>
            ${ok + ko ? `<button type="button" class="btn danger" id="q-wipe" style="margin-top:12px;width:100%;justify-content:center">${ic("reset")} ${qs.confirmReset ? "Confirmer la remise à zéro" : "Remettre le bilan à zéro"}</button>` : ""}
          </div>
          <div class="qpanel"><h3>À retravailler</h3>
            ${toReview.length ? `<div class="review">${toReview.map(x => `<a class="chip" href="${L(`quete-${x.quest}/${x.id}`)}">${x.id}</a>`).join("")}</div>` : `<p class="empty">Rien pour l'instant. Les épreuves notées « À revoir » apparaîtront ici et sortiront plus souvent.</p>`}
          </div>
        </aside>
      </div>`;
    window.scrollTo(0, 0);
    if (running) runTimer();
    const $ = id => document.getElementById(id);
    const draft = $("q-draft");
    const syncView = () => { const v = $("q-draftview"); if (v) v.textContent = draft.value.trim() ? draft.value : "(brouillon vide)"; };
    syncView();
    const startT = () => { if (!qs.start){ qs.start = Date.now(); runTimer(); const pb = $("q-pause"); pb.innerHTML = ic("pause"); pb.setAttribute("aria-label", "Mettre en pause"); $("q-reset").disabled = false; } };
    if ($("q-start")) $("q-start").onclick = () => { startT(); quiz(); requestAnimationFrame(() => $("q-draft").focus()); };
    $("q-pause").onclick = () => {
      if (qs.start){ qs.acc = elapsed(); qs.start = null; clearInterval(qs.tick); live("Chrono en pause"); }
      else { startT(); live("Chrono lancé"); }
      quiz();
    };
    $("q-reset").onclick = () => { qs.start = null; qs.acc = 0; clearInterval(qs.tick); live("Chrono remis à zéro"); quiz(); };
    $("q-show").onclick = () => {
      if (qs.start){ qs.acc = elapsed(); qs.start = null; clearInterval(qs.tick); }
      qs.shown = true; syncView();
      const r = $("q-reveal"); r.hidden = false;
      r.scrollIntoView({block: "start", behavior: reduced() ? "auto" : "smooth"});
    };
    $("q-next").onclick = () => { pick(); quiz(); };
    $("q-verify").onclick = runCheck;
    $("q-choose").onchange = ev => {
      const x = byId[ev.target.value]; if (!x || x === qs.cur) return;
      qs.cur = x; qs.start = null; qs.acc = 0; qs.shown = false; clearInterval(qs.tick);
      if (!qs.quests.includes(x.quest)){ qs.quests.push(x.quest); qs.quests.sort(); store.set("quizq", qs.quests); }
      quiz();
    };
    renderVerifCard();
    const grade = k => { const s = stats[e.id] || {ok: 0, ko: 0}; s[k] = (s[k] || 0) + 1; stats[e.id] = s; store.set("quiz", stats); delete drafts[e.id]; store.set("drafts", drafts); live(k === "ok" ? "Noté réussi" : "Noté à revoir"); pick(); quiz(); };
    $("q-ok").onclick = () => grade("ok");
    $("q-ko").onclick = () => grade("ko");
    if ($("q-wipe")) $("q-wipe").onclick = () => {
      if (!qs.confirmReset){ qs.confirmReset = true; quiz(); return; }
      stats = {}; store.set("quiz", stats); qs.confirmReset = false; live("Bilan remis à zéro"); quiz();
    };
    document.querySelectorAll("[data-q]").forEach(cb => cb.onchange = () => {
      qs.quests = [...document.querySelectorAll("[data-q]:checked")].map(x => +x.dataset.q);
      if (!qs.quests.length){ qs.quests = [+cb.dataset.q]; cb.checked = true; }
      store.set("quizq", qs.quests);
      if (!qs.quests.includes(qs.cur.quest)){ pick(); quiz(); }
    });
    draft.addEventListener("input", () => { if (Verif.state === "idle") Verif.load().catch(() => {}); startT(); drafts[e.id] = draft.value; store.set("drafts", drafts); if (qs.shown) syncView(); });
    draft.addEventListener("keydown", ev => {
      if (ev.key === "Tab" && !ev.shiftKey){ ev.preventDefault(); const a = draft.selectionStart; draft.setRangeText("\t", a, draft.selectionEnd, "end"); draft.dispatchEvent(new Event("input")); }
      if (ev.key === "Escape") draft.blur();
      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)){ ev.preventDefault(); runCheck(); }
    });
  }
  function runTimer(){
    clearInterval(qs.tick);
    const upd = () => {
      const el = document.getElementById("timer");
      if (!el){ clearInterval(qs.tick); return; }
      const d = elapsed(); el.textContent = fmtT(d); el.classList.toggle("late", d > 300000);
    };
    upd(); qs.tick = setInterval(upd, 500);
  }

  /* ---------- recherche ---------- */
  const pal = document.getElementById("pal"), palQ = document.getElementById("pal-q"), palRes = document.getElementById("pal-res");
  let palSel = 0, palItems = [];
  const hay = EX.map(e => ({e, id: norm(e.id), txt: norm([e.sig, e.consigne, e.tools.join(" "), e.bref].join(" "))}));
  function palRender(){
    const q = norm(palQ.value.trim());
    if (!q) palItems = EX.slice();
    else {
      const words = q.split(/\s+/);
      palItems = hay.map(h => {
        let score = 0;
        for (const w of words){
          if (h.id === w) score += 100;
          else if (h.id.startsWith(w)) score += 60;
          else if (h.id.includes(w)) score += 40;
          else if (h.txt.includes(w)) score += 10;
          else return null;
        }
        return {e: h.e, score};
      }).filter(Boolean).sort((a, b) => b.score - a.score).map(x => x.e);
    }
    palSel = Math.min(palSel, Math.max(palItems.length - 1, 0));
    const mark = s => { const w = palQ.value.trim(); if (!w) return esc(s); const i = norm(s).indexOf(norm(w)); return i < 0 ? esc(s) : esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + w.length)) + "</mark>" + esc(s.slice(i + w.length)); };
    palRes.innerHTML = palItems.length
      ? palItems.map((e, i) => `<li role="presentation"><a role="option" id="pal-${e.id}" href="${L(`quete-${e.quest}/${e.id}`)}" aria-selected="${i === palSel}"><b>${mark(e.id)}</b><em>Q${e.quest} · ${e.kind}</em><small>${esc(e.consigne)}</small></a></li>`).join("")
      : `<li class="palempty">Aucune épreuve ne correspond à « ${esc(palQ.value)} ». Essaie un nom (split, atoi…) ou un outil (append, récursion, rune).</li>`;
    palQ.setAttribute("aria-activedescendant", palItems[palSel] ? "pal-" + palItems[palSel].id : "");
  }
  function openPal(){
    if (pal.open) return;
    palQ.value = ""; palSel = 0; palRender();
    pal.showModal();
    palQ.focus();
  }
  const closePal = () => pal.open && pal.close();
  document.getElementById("open-search").addEventListener("click", openPal);
  document.getElementById("pal-close").addEventListener("click", closePal);
  pal.addEventListener("click", ev => { if (ev.target === pal) closePal(); if (ev.target.closest("a[role=option]")) closePal(); });
  palQ.addEventListener("input", () => { palSel = 0; palRender(); });
  palQ.addEventListener("keydown", ev => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp"){
      ev.preventDefault();
      if (!palItems.length) return;
      palSel = (palSel + (ev.key === "ArrowDown" ? 1 : -1) + palItems.length) % palItems.length;
      palRender();
      document.getElementById("pal-" + palItems[palSel].id).scrollIntoView({block: "nearest"});
    } else if (ev.key === "Enter" && palItems[palSel]){
      ev.preventDefault();
      const e = palItems[palSel]; closePal(); location.href = L(`quete-${e.quest}/${e.id}`);
    }
  });
  document.addEventListener("keydown", ev => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((ev.key === "/" && !typing) || ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k")){ ev.preventDefault(); openPal(); }
  });

  /* ---------- interactions communes ---------- */
  app.addEventListener("change", ev => {
    const id = ev.target.dataset && ev.target.dataset.done;
    if (!id) return;
    done[id] = ev.target.checked; if (!done[id]) delete done[id];
    live(done[id] ? id + " marqué comme maîtrisé" : id + " à retravailler");
    store.set("done", done);
    const tick = document.querySelector(`[data-toc="${id}"] .tick`);
    tick && tick.classList.toggle("on", !!done[id]);
  });
  app.addEventListener("click", ev => {
    const rv = ev.target.closest("[data-reveal]");
    if (rv){ revealed.add(rv.dataset.reveal); applyTrain(); document.getElementById(rv.dataset.reveal + "-code").focus?.(); live("Code révélé"); return; }
    if (ev.target.closest("[data-open-search]")){ openPal(); return; }
    const li = ev.target.closest(".notes li");
    if (li){ togglePin(li); return; }
    const cp = ev.target.closest("[data-copy]");
    if (cp){
      const txt = byId[cp.dataset.copy].code;
      const done = () => { cp.textContent = "Copié"; live("Code copié"); setTimeout(() => cp.textContent = "Copier", 1400); };
      try { navigator.clipboard.writeText(txt).then(done, () => { cp.textContent = "Sélectionne le code"; }); } catch(e){ cp.textContent = "Sélectionne le code"; }
    }
  });
  const lite = (li, on) => {
    const ex = li.closest(".ex"); if (!ex) return;
    for (let i = +li.dataset.a; i <= +li.dataset.b; i++){
      const l = document.getElementById(`${ex.dataset.id}-L${i}`); l && l.classList.toggle("hl", on);
    }
  };
  function togglePin(li){
    const on = li.getAttribute("aria-pressed") !== "true";
    li.parentElement.querySelectorAll("li[aria-pressed='true']").forEach(o => { if (o !== li){ o.setAttribute("aria-pressed", "false"); pinLines(o, false); } });
    li.setAttribute("aria-pressed", String(on));
    pinLines(li, on);
  }
  function pinLines(li, on){
    const ex = li.closest(".ex"); if (!ex) return;
    for (let i = +li.dataset.a; i <= +li.dataset.b; i++){ const l = document.getElementById(`${ex.dataset.id}-L${i}`); l && l.classList.toggle("pin", on); }
  }
  app.addEventListener("keydown", ev => {
    const li = ev.target.closest && ev.target.closest(".notes li");
    if (li && (ev.key === "Enter" || ev.key === " ")){ ev.preventDefault(); togglePin(li); }
  });
  ["mouseover", "focusin"].forEach(t => app.addEventListener(t, ev => { const li = ev.target.closest && ev.target.closest(".notes li"); li && lite(li, true); }));
  ["mouseout", "focusout"].forEach(t => app.addEventListener(t, ev => { const li = ev.target.closest && ev.target.closest(".notes li"); li && lite(li, false); }));

  /* ---------- routeur ---------- */
  function route(){
    const r = currentRoute();
    renderNav(r);
    clearInterval(qs.tick);
    closePal();
    let m;
    if ((m = r.match(/^quete-([1-4])(?:\/(\w+))?$/))){ quest(+m[1], m[2]); return; }
    shownQuest = 0;
    if (r === "antiseche") sheet();
    else if (r === "quiz") quiz();
    else home();
  }
  window.addEventListener("hashchange", route);
  route();

  // Hors ligne : le site reste consultable une fois visité (hébergé en https ou en local)
  if (MULTI && "serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))){
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
