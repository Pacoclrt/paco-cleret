/*
 * Moteur de recherche de Gopédia, entièrement côté client.
 *
 * Chaque page est découpée en plusieurs documents indexés :
 *  - la page elle-même (titre, alias, résumé, explication rapide),
 *  - chaque question à laquelle elle répond,
 *  - chaque section de l'explication détaillée.
 * Une requête est découpée en termes (sans mots vides), enrichie de synonymes
 * français, puis comparée au vocabulaire (égalité, racine, préfixe, faute de
 * frappe). Les résultats sont regroupés par page, avec la meilleure section.
 */
(function () {
  'use strict';

  var G = (window.GoDoc = window.GoDoc || {});
  var md = G.md;

  var STOP = new Set((
    'le la les l un une des de du d a au aux et ou en dans par pour sur avec sans ' +
    'ce cet cette ces c ca cela ceci qui que qu quoi quel quelle quels quelles comment pourquoi quand ' +
    'est sont etre suis es ai as avons avez ont avoir fait faire faut il elle on je j tu nous vous ils elles ' +
    'me m te t se s mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs y ne n pas plus moins ' +
    'tres bien si mais donc ni car entre vers chez peut peux puis dois doit veux veut utiliser utilise ' +
    'go golang langage the of to is are how what why do does can with and an in on my i it'
  ).split(' '));

  var QUESTION_WORDS = /\b(comment|pourquoi|quand|quel|quelle|quels|quelles|difference|faut|peut|how|why|what|que signifie)\b/;

  // Synonymes et traductions : terme de la requête (sans accents) → termes de la doc
  var SYN = {
    chaine: ['string'], chaines: ['string'], texte: ['string'], caractere: ['rune', 'string'], caracteres: ['rune', 'string'],
    char: ['rune'], lettre: ['rune'], lettres: ['rune'], octet: ['byte'], octets: ['byte'],
    tableau: ['array', 'slice'], tableaux: ['array', 'slice'], liste: ['slice'], listes: ['slice'], vecteur: ['slice'], list: ['slice'],
    dictionnaire: ['map'], dico: ['map'], dict: ['map'], hashmap: ['map'], associatif: ['map'], hash: ['map'],
    boucle: ['for', 'range'], boucles: ['for', 'range'], iterer: ['range', 'for'], parcourir: ['range', 'for'],
    repeter: ['for'], while: ['for'], foreach: ['range'], loop: ['for'],
    condition: ['if'], conditions: ['if'], sinon: ['else', 'if'],
    fonction: ['func'], fonctions: ['func'], function: ['func'], lambda: ['closure', 'anonyme'], callback: ['closure'],
    methode: ['receiver'], methodes: ['receiver'], method: ['methode'],
    erreur: ['error', 'err'], erreurs: ['error'], exception: ['error', 'panic'], exceptions: ['error', 'panic'],
    try: ['error', 'recover'], catch: ['recover', 'error'],
    thread: ['goroutine'], threads: ['goroutine'], parallele: ['goroutine', 'concurrence'], parallelisme: ['goroutine', 'concurrence'],
    concurrent: ['goroutine'], asynchrone: ['goroutine'], async: ['goroutine'], await: ['waitgroup'], simultane: ['goroutine'],
    canal: ['channel', 'chan'], canaux: ['channel'], chan: ['channel'],
    verrou: ['mutex'], verrouiller: ['mutex'], lock: ['mutex'],
    entier: ['int'], entiers: ['int'], integer: ['int'], nombre: ['int', 'float64'], nombres: ['int'],
    decimal: ['float64'], flottant: ['float64'], virgule: ['float64'], float: ['float64'],
    booleen: ['bool'], boolean: ['bool'], vrai: ['true', 'bool'], faux: ['false', 'bool'],
    structure: ['struct'], structures: ['struct'], objet: ['struct'], objets: ['struct'],
    classe: ['struct', 'heritage'], classes: ['struct', 'heritage'], poo: ['heritage', 'interface'], oop: ['heritage'],
    heritage: ['embedding'], heriter: ['embedding'], extends: ['embedding'], inheritance: ['heritage'],
    pointeur: ['pointer'], pointeurs: ['pointer'], adresse: ['pointeur'], reference: ['pointeur'],
    paquet: ['package'], paquets: ['package'], bibliotheque: ['package', 'module'], librairie: ['package', 'module'],
    dependance: ['module'], dependances: ['module'], lib: ['package'],
    fichier: ['file', 'os'], fichiers: ['file'], dossier: ['readdir', 'mkdir'], repertoire: ['readdir', 'mkdir'], file: ['fichier'],
    lire: ['read', 'lecture'], lecture: ['read'], ecrire: ['write', 'ecriture'], ecriture: ['write'],
    afficher: ['fmt', 'println', 'printf'], imprimer: ['fmt', 'println'], print: ['fmt', 'println'], affichage: ['fmt'], console: ['fmt'],
    convertir: ['conversion', 'strconv'], conversion: ['strconv'], transformer: ['conversion'], cast: ['conversion'], caster: ['conversion'],
    trier: ['tri', 'sort'], tri: ['sort'], ordonner: ['tri'], classer: ['tri'], sort: ['tri'],
    inverser: ['reverse'], renverser: ['inverser'], reverse: ['inverser'],
    supprimer: ['delete', 'supprimer'], retirer: ['delete', 'supprimer'], enlever: ['supprimer'], effacer: ['supprimer'], remove: ['delete', 'supprimer'],
    ajouter: ['append'], inserer: ['insert'], longueur: ['len'], taille: ['len'], length: ['len'],
    serveur: ['http', 'server'], web: ['http'], api: ['http', 'rest'], requete: ['http', 'request'], route: ['http'], routes: ['http'],
    temps: ['time'], date: ['time'], dates: ['time'], heure: ['time'], duree: ['time', 'duration'],
    attendre: ['sleep', 'wait', 'waitgroup'], pause: ['sleep'], chrono: ['time'],
    aleatoire: ['rand', 'random'], hasard: ['rand'], random: ['rand'],
    generique: ['generics', 'generiques'], generiques: ['generics'], generic: ['generiques'],
    test: ['testing', 'tests'], tester: ['testing', 'tests'], unitaire: ['testing'],
    constante: ['const'], constantes: ['const'], enum: ['iota', 'const'], enumeration: ['iota'],
    annuler: ['context', 'cancel'], annulation: ['context', 'cancel'], delai: ['timeout', 'context'], expiration: ['timeout'],
    argument: ['args', 'flag'], arguments: ['args', 'flag'], parametre: ['args', 'flag'], option: ['flag'], options: ['flag'], cli: ['args', 'flag'],
    clavier: ['stdin', 'scanner', 'saisie'], saisie: ['stdin', 'scanner'], entree: ['stdin', 'scanner'], input: ['stdin', 'saisie'],
    nul: ['nil'], null: ['nil'], none: ['nil'], vide: ['nil', 'empty'],
    panique: ['panic'], plantage: ['panic'], crash: ['panic'],
    installer: ['installation'], install: ['installation'], telecharger: ['installation'],
    compiler: ['build', 'compilation'], compilation: ['build'], executer: ['run'], lancer: ['run'],
    majuscule: ['toupper', 'exporte'], minuscule: ['tolower', 'exporte'], public: ['exporte'], prive: ['exporte'],
    copier: ['copy', 'clone'], copie: ['copy', 'clone'],
    concatener: ['concatenation', 'builder'], concat: ['concatenation'], assembler: ['join'],
    decouper: ['split'], separer: ['split'], couper: ['split', 'cut'],
    chercher: ['contains', 'index'], rechercher: ['contains', 'recherche'], trouver: ['contains', 'index'],
    contient: ['contains'], existe: ['contains', 'ok'],
    pile: ['stack'], tas: ['heap'], memoire: ['memory', 'heap'], performance: ['benchmark', 'pprof'], optimiser: ['performance'],
    race: ['mutex'], interblocage: ['deadlock'], bloque: ['deadlock'],
    bonjour: ['hello'], debuter: ['premier', 'introduction'], commencer: ['premier', 'introduction']
  };

  var POPULAR = ['string', 'slices', 'maps', 'structs', 'interfaces', 'erreurs', 'goroutines', 'channels'];

  // Index des champs et poids associés
  var F = { title: 0, alias: 1, question: 2, heading: 3, summary: 4, quick: 5, body: 6, code: 7, context: 8 };
  var FW = [10, 9, 7, 6, 3.5, 1.6, 1, 0.5, 1.4];
  var LONG_FIELDS = [false, false, false, false, false, true, true, true, false];

  var docs = [];
  var vocab = new Map();     // terme → { df, post: [doc, champ, tf, …] }
  var stems = new Map();     // terme → racine
  var avgLen = [];
  var matchCache = new Map();
  var pages = new Map();

  /* ---------- Analyse du texte ---------- */

  function tokens(text) {
    return md.fold(String(text || '')).split(/[^a-z0-9]+/).filter(function (t) {
      return t.length > 1 || /\d/.test(t);
    });
  }

  function stem(t) {
    if (t.length > 5 && /eaux$/.test(t)) return t.slice(0, -1);
    if (t.length > 4 && /aux$/.test(t)) return t.slice(0, -3) + 'al';
    if (t.length > 3 && /[^s]s$/.test(t)) return t.slice(0, -1);
    return t;
  }

  function lcp(a, b) {
    var n = Math.min(a.length, b.length);
    var i = 0;
    while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
    return i;
  }

  function levenshtein(a, b, max) {
    var prev = [];
    var cur = [];
    var j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur[0] = i;
      var rowMin = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[b.length];
  }

  /* ---------- Construction de l'index ---------- */

  function addDoc(doc, fields) {
    var idx = docs.length;
    docs.push(doc);
    doc.len = [];
    var counted = new Set();
    Object.keys(fields).forEach(function (key) {
      var f = F[key];
      var toks = tokens(fields[key]);
      doc.len[f] = toks.length;
      var counts = new Map();
      toks.forEach(function (t) { counts.set(t, (counts.get(t) || 0) + 1); });
      counts.forEach(function (tf, t) {
        var e = vocab.get(t);
        if (!e) {
          e = { df: 0, post: [] };
          vocab.set(t, e);
        }
        e.post.push(idx, f, tf);
        if (!counted.has(t)) {
          counted.add(t);
          e.df++;
        }
      });
    });
  }

  function init(data) {
    data.pages.forEach(function (p) { pages.set(p.slug, p); });

    data.pages.forEach(function (page) {
      var seen = md.newSeen();
      md.sections(page.quick, seen); // réserve les identifiants éventuels du bloc rapide
      var secs = md.sections(page.detail, seen);
      var secById = new Map();
      secs.forEach(function (s) { if (s.id) secById.set(s.id, s); });

      var quick = md.plainText(page.quick, pages);
      var context = page.title + ' ' + page.aliases.join(' ');

      addDoc({
        type: 'page', page: page, anchor: '', title: page.title,
        text: page.summary + ' ' + quick.text,
        titleFold: md.fold(page.title),
        aliasSet: new Set(page.aliases.map(function (a) { return normalize(a); }).concat([normalize(page.title), page.slug.replace(/-/g, ' ')])),
        aliasList: page.aliases.map(function (a) { return normalize(a); }),
        titleTerms: tokens(page.title).filter(function (t) { return !STOP.has(t); })
      }, { title: page.title, alias: page.aliases.join(' '), summary: page.summary, quick: quick.text, code: quick.code });

      page.questions.forEach(function (q) {
        var sec = q.anchor ? secById.get(q.anchor) : null;
        addDoc({
          type: 'question', page: page, anchor: q.anchor && q.anchor !== 'rapide' ? q.anchor : '',
          title: q.text, section: sec || null,
          text: sec ? md.plainText(sec.own, pages).text : page.summary,
          titleFold: md.fold(q.text)
        }, { question: q.text, context: context });
      });

      secs.forEach(function (s) {
        var body = md.plainText(s.own, pages);
        var title = s.id ? s.title : 'Explication détaillée';
        addDoc({
          type: 'section', page: page, anchor: s.id || 'detail', title: title, section: s,
          text: body.text, titleFold: md.fold(title)
        }, { heading: title, body: body.text, code: body.code, context: context });
      });
    });

    // Longueur moyenne des champs longs
    var sums = [];
    var counts = [];
    docs.forEach(function (d) {
      d.len.forEach(function (l, f) {
        if (l === undefined) return;
        sums[f] = (sums[f] || 0) + l;
        counts[f] = (counts[f] || 0) + 1;
      });
    });
    FW.forEach(function (_, f) { avgLen[f] = counts[f] ? sums[f] / counts[f] : 1; });

    vocab.forEach(function (_, t) { stems.set(t, stem(t)); });
  }

  /** Normalise une expression complète pour les comparaisons exactes (alias, titres). */
  function normalize(s) {
    return md.fold(s).replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* ---------- Requêtes ---------- */

  function analyze(q) {
    var raw = tokens(q);
    var terms = raw.filter(function (t) { return !STOP.has(t); });
    if (!terms.length) terms = raw.slice();
    terms = Array.from(new Set(terms));
    var folded = normalize(q);
    return {
      query: q,
      raw: raw,
      terms: terms,
      folded: folded,
      joined: terms.join(' '),
      isQuestion: QUESTION_WORDS.test(folded) || /\?\s*$/.test(q)
    };
  }

  function matchWeight(q, sq, t) {
    if (t === q) return 1;
    if (stems.get(t) === sq) return 0.9;
    if (q.length >= 2 && t.lastIndexOf(q, 0) === 0) return 0.72 * Math.pow(q.length / t.length, 0.3);
    if (q.length >= 5 && t.length >= 5 && lcp(q, t) >= Math.max(5, Math.min(q.length, t.length) - 3)) return 0.55;
    if (q.length >= 4) {
      var maxd = q.length >= 8 ? 2 : 1;
      if (Math.abs(q.length - t.length) <= maxd) {
        var d = levenshtein(q, t, maxd);
        if (d <= maxd) return d === 1 ? 0.5 : 0.35;
      }
    }
    return 0;
  }

  /** Termes du vocabulaire correspondant à q, avec leur poids. strict : égalité ou racine seulement. */
  function matches(q, strict) {
    var key = (strict ? '!' : '') + q;
    if (matchCache.has(key)) return matchCache.get(key);
    var res = [];
    var sq = stem(q);
    if (strict) {
      vocab.forEach(function (_, t) {
        if (t === q) res.push([t, 1]);
        else if (stems.get(t) === sq) res.push([t, 0.9]);
      });
    } else {
      vocab.forEach(function (_, t) {
        var w = matchWeight(q, sq, t);
        if (w > 0) res.push([t, w]);
      });
    }
    if (matchCache.size > 800) matchCache.clear();
    matchCache.set(key, res);
    return res;
  }

  function expansions(t) {
    var list = [{ term: t, w: 1, strict: false }];
    var syn = SYN[t] || SYN[stem(t)];
    if (syn) {
      syn.forEach(function (s) {
        tokens(s).forEach(function (x) {
          if (x !== t) list.push({ term: x, w: 0.6, strict: true });
        });
      });
    }
    return list;
  }

  /**
   * Vrai si chaque terme de la requête apparaît dans la liste (égalité, racine,
   * préfixe, ou synonyme pour une requête d'un seul mot).
   */
  function covers(list, terms) {
    if (!list || !list.length) return false;
    var allowSyn = terms.length === 1;
    return terms.every(function (qt) {
      var syn = allowSyn ? (SYN[qt] || SYN[stem(qt)] || []) : [];
      var cands = [qt].concat(syn.reduce(function (acc, x) { return acc.concat(tokens(x)); }, []));
      return cands.some(function (c) {
        var sc = stem(c);
        return list.some(function (t) {
          if (t === c || stem(t) === sc) return true;
          if (c !== qt || c.length < 3) return false;
          if (t.lastIndexOf(c, 0) === 0) return true; // mot en cours de frappe
          var maxd = c.length >= 8 ? 2 : 1;           // faute de frappe
          return c.length >= 5 && Math.abs(t.length - c.length) <= maxd && levenshtein(c, t, maxd) <= maxd;
        });
      });
    });
  }

  function saturate(tf, f, d) {
    var norm = 1;
    if (LONG_FIELDS[f]) norm = 0.4 + 0.6 * ((docs[d].len[f] || 0) / (avgLen[f] || 1));
    return (tf * 2.2) / (tf + 1.2 * norm);
  }

  /** Recherche par symbole (« := », « <- », « && »…) dans les alias bruts. */
  function symbolSearch(q) {
    var s = q.trim();
    if (!s) return [];
    var out = [];
    pages.forEach(function (p) {
      if (p.aliases.indexOf(s) !== -1) out.push({ page: p, doc: null, score: 50, terms: new Set() });
    });
    return out;
  }

  function search(q, limit) {
    limit = limit || 20;
    var a = analyze(q);
    if (!a.terms.length) {
      var sym = symbolSearch(q);
      sym.forEach(function (r) { r.doc = docs.find(function (d) { return d.page === r.page && d.type === 'page'; }); });
      return { results: sym.slice(0, limit), analysis: a, terms: new Set() };
    }

    var N = docs.length;
    var perDoc = new Map();
    var highlight = new Set();
    var strong = 0; // termes reconnus autrement que par une faute de frappe

    a.terms.forEach(function (qt, qi) {
      var isStrong = false;
      expansions(qt).forEach(function (ex) {
        matches(ex.term, ex.strict).forEach(function (mt) {
          if (mt[1] >= 0.55) isStrong = true;
          var term = mt[0];
          var e = vocab.get(term);
          var mw = mt[1] * ex.w * Math.log(1 + N / e.df);
          if (mt[1] >= 0.5) highlight.add(term);
          var post = e.post;
          var k = 0;
          while (k < post.length) {
            var d = post[k];
            var best = 0;
            var sum = 0;
            while (k < post.length && post[k] === d) {
              var s = FW[post[k + 1]] * saturate(post[k + 2], post[k + 1], d);
              sum += s;
              if (s > best) best = s;
              k += 3;
            }
            var score = mw * (best + 0.25 * (sum - best));
            var arr = perDoc.get(d);
            if (!arr) {
              arr = new Float64Array(a.terms.length);
              perDoc.set(d, arr);
            }
            if (score > arr[qi]) arr[qi] = score;
          }
        });
      });
      if (isStrong) strong++;
    });

    // Requête de plusieurs mots surtout incompréhensible : pas de résultat approximatif
    if (a.terms.length >= 2 && strong / a.terms.length < 0.5) {
      return { results: [], total: 0, analysis: a, terms: highlight };
    }

    var byPage = new Map();
    perDoc.forEach(function (arr, d) {
      var doc = docs[d];
      var sum = 0;
      var covered = 0;
      for (var i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (arr[i] > 0) covered++;
      }
      var cov = covered / arr.length;
      var score = sum * (0.25 + 0.75 * cov * cov);

      if (doc.aliasSet) {
        if (doc.aliasSet.has(a.folded)) score += 40;
        else if (a.joined && doc.aliasSet.has(a.joined)) score += 30;
        else if (a.terms.length === 1 && a.joined.length >= 3 && doc.aliasList.some(function (x) {
          return x.lastIndexOf(a.joined, 0) === 0;
        })) score += 12; // mot en cours de frappe (« goroutin »)
      }
      if (doc.type === 'page' && covers(doc.titleTerms, a.terms)) {
        score += 20 / Math.max(1, doc.titleTerms.length);
      }
      if (doc.titleFold) {
        var tf = normalize(doc.titleFold);
        if (doc.type === 'page' && a.joined.length >= 3 && tf.indexOf(a.joined) !== -1) score += 10;
        if (doc.type === 'question' && a.folded.length >= 6 && tf.indexOf(a.folded) !== -1) score += 15;
        if (doc.type === 'section' && a.joined.length >= 4 && tf.indexOf(a.joined) !== -1) score += 8;
      }
      if (a.isQuestion && doc.type === 'question') score *= 1.25;
      if (a.isQuestion && doc.page.category === 'faq') score *= 1.1;

      var slug = doc.page.slug;
      var entry = byPage.get(slug);
      if (!entry) {
        entry = { page: doc.page, hits: [] };
        byPage.set(slug, entry);
      }
      entry.hits.push({ doc: doc, score: score, cov: cov });
    });

    var results = [];
    byPage.forEach(function (e) {
      e.hits.sort(function (x, y) { return y.score - x.score; });
      var best = e.hits[0];
      // Pour une requête précise, on préfère pointer vers la section ou la
      // question qui y répond, si elle est presque aussi pertinente que la page.
      var rep = best;
      if (best.doc.type === 'page' && !covers(best.doc.titleTerms, a.terms)) {
        var threshold = a.terms.length >= 2 ? 0.6 : 0.3;
        for (var i = 1; i < e.hits.length; i++) {
          var h = e.hits[i];
          if (h.doc.type !== 'page' && h.cov === 1 && h.score >= best.score * threshold) {
            rep = h;
            break;
          }
        }
      }
      var s = best.score + 0.12 * (e.hits[1] ? e.hits[1].score : 0) + 0.06 * (e.hits[2] ? e.hits[2].score : 0);
      results.push({ page: e.page, doc: rep.doc, score: s, cov: best.cov });
    });
    results.sort(function (x, y) { return y.score - x.score; });

    if (results.length) {
      var top = results[0].score;
      var minCov = a.terms.length >= 3 ? 0.5 : 0;
      // Assez de résultats contenant tous les termes : on écarte les autres
      var complete = results.filter(function (r) { return r.cov === 1; }).length;
      if (a.terms.length >= 2 && complete >= 3) minCov = 1;
      results = results.filter(function (r, i) {
        return i === 0 || (r.score >= top * 0.1 && r.cov >= minCov);
      });
    }
    results.forEach(function (r) { r.terms = highlight; });
    return { results: results.slice(0, limit), total: results.length, analysis: a, terms: highlight };
  }

  /* ---------- Présentation ---------- */

  var WORD = /[A-Za-z0-9_À-ɏ]+/g;

  function snippet(text, terms, len) {
    len = len || 170;
    text = text || '';
    var pos = -1;
    var m;
    WORD.lastIndex = 0;
    while ((m = WORD.exec(text))) {
      if (terms.has(md.fold(m[0]))) {
        pos = m.index;
        break;
      }
    }
    var start = pos < 0 ? 0 : Math.max(0, pos - 60);
    if (start > 0) {
      var sp = text.indexOf(' ', start);
      if (sp !== -1 && sp < pos) start = sp + 1;
    }
    var cut = text.slice(start, start + len);
    if (start + len < text.length) {
      var last = cut.lastIndexOf(' ');
      if (last > len * 0.6) cut = cut.slice(0, last);
      cut += '…';
    }
    if (start > 0) cut = '…' + cut;
    return md.escapeHTML(cut).replace(WORD, function (w) {
      return terms.has(md.fold(w)) ? '<mark>' + w + '</mark>' : w;
    });
  }

  function href(r) {
    var doc = r.doc;
    if (!doc || !doc.anchor) return '#/' + r.page.slug;
    return '#/' + r.page.slug + '/' + doc.anchor;
  }

  /** Contenu de la « réponse rapide » affichée au-dessus des résultats. */
  function featured(r) {
    var doc = r.doc;
    var page = r.page;
    var section = doc && doc.section;
    if (section && section.full) {
      return {
        kind: 'section',
        title: doc.type === 'question' ? doc.title : section.title,
        md: section.full,
        href: href(r)
      };
    }
    return {
      kind: 'quick',
      title: doc && doc.type === 'question' ? doc.title : page.title,
      md: page.quick,
      href: '#/' + page.slug
    };
  }

  /** Propose une orthographe corrigée de la requête, ou null. */
  function didYouMean(q) {
    var a = analyze(q);
    var changed = false;
    var out = a.terms.map(function (t) {
      if (vocab.has(t) || t.length < 3) return t;
      var best = null;
      var bestD = 3;
      var bestDf = 0;
      vocab.forEach(function (e, v) {
        if (Math.abs(v.length - t.length) > 2 || /^\d+$/.test(v)) return;
        var d = levenshtein(t, v, 2);
        if (d < bestD || (d === bestD && e.df > bestDf)) {
          best = v;
          bestD = d;
          bestDf = e.df;
        }
      });
      if (best && bestD <= 2) {
        changed = true;
        return best;
      }
      return t;
    });
    return changed ? out.join(' ') : null;
  }

  G.search = {
    init: init,
    query: search,
    snippet: snippet,
    href: href,
    featured: featured,
    didYouMean: didYouMean,
    popular: function () {
      return POPULAR.map(function (s) { return pages.get(s); }).filter(Boolean);
    },
    stats: function () {
      var questions = 0;
      pages.forEach(function (p) { questions += p.questions.length; });
      return { docs: docs.length, terms: vocab.size, questions: questions };
    }
  };
})();
