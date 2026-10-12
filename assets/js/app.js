/*
 * Application Gopédia : routage par hash, rendu des vues, recherche,
 * palette de commandes, thème et petites interactions.
 */
(function () {
  'use strict';

  var G = window.GoDoc;
  var md = G.md;
  var data = window.GODOC_DATA;

  var SITE = {
    name: 'Gopédia',
    author: 'Paco CLERET',
    authorUrl: 'https://paco-cleret.fr',
    authorLabel: 'paco-cleret.fr'
  };

  var LEVELS = {
    'débutant': { label: 'Débutant', cls: 'level-1' },
    'intermédiaire': { label: 'Intermédiaire', cls: 'level-2' },
    'avancé': { label: 'Avancé', cls: 'level-3' }
  };

  var SUGGESTIONS = [
    'string',
    'slice',
    'goroutine',
    'Comment lire un fichier ?',
    'Différence entre array et slice',
    'interface',
    'convertir un int en string',
    'pourquoi mon erreur n\'est pas nil'
  ];

  /* ---------- Icônes (tracés inspirés de Lucide, licence ISC) ---------- */

  var ICONS = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    arrowUp: '<path d="m5 12 7-7 7 7M12 19V5"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01"/>',
    octagon: '<path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2zM12 8v4M12 16h.01"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
    branch: '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    shapes: '<path d="M8.3 10a.7.7 0 0 1-.63-1.08L11.4 3a.7.7 0 0 1 1.2-.04L16.3 8.9a.7.7 0 0 1-.57 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
    cpu: '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    library: '<path d="m16 6 4 14M12 6v14M8 8v12M4 4v16"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2Z"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>';
  }
  G.icon = icon;

  /* ---------- Données ---------- */

  var pages = new Map();
  var categories = new Map();
  var ordered = data.pages;
  data.categories.forEach(function (c) { categories.set(c.id, c); });
  data.pages.forEach(function (p) { pages.set(p.slug, p); });

  function pagesOf(catId) {
    return ordered.filter(function (p) { return p.category === catId; });
  }

  G.search.init(data);

  var esc = md.escapeHTML;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  var main = $('#gd-main');
  var sidebar = $('#gd-sidebar');
  var live = $('#gd-live');
  var state = { view: null, slug: null, openGroups: new Set(), firstRender: true };

  function announce(msg) {
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  function readingTime(p) {
    var words = (p.quick + ' ' + p.detail).split(/\s+/).length;
    return Math.max(1, Math.round(words / 180));
  }

  function levelBadge(level) {
    var l = LEVELS[level] || LEVELS['débutant'];
    return '<span class="level ' + l.cls + '"><span class="level-dot" aria-hidden="true"></span>' + l.label + '</span>';
  }

  /* ---------- Thème ---------- */

  var themeBtn = $('#gd-theme');

  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function syncThemeButton() {
    var dark = currentTheme() === 'dark';
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon');
    themeBtn.setAttribute('aria-label', dark ? 'Passer au thème clair' : 'Passer au thème sombre');
    themeBtn.title = dark ? 'Thème clair' : 'Thème sombre';
  }

  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('gopedia-theme', next); } catch (e) { /* stockage indisponible */ }
    syncThemeButton();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeButton);
  syncThemeButton();

  /* ---------- Barre latérale ---------- */

  function renderSidebar() {
    var html = '<nav class="side-nav" aria-label="Sommaire de la documentation"><ul class="side-groups">';
    data.categories.forEach(function (c) {
      var list = pagesOf(c.id);
      var open = state.openGroups.has(c.id);
      html += '<li class="side-group' + (open ? ' is-open' : '') + '" data-cat="' + c.id + '">' +
        '<button type="button" class="side-group-btn" aria-expanded="' + open + '" aria-controls="sg-' + c.id + '">' +
        icon(c.icon, 'side-icon') + '<span class="side-group-title">' + esc(c.title) + '</span>' +
        '<span class="side-count">' + list.length + '</span>' + icon('chevronDown', 'side-chevron') + '</button>' +
        '<ul class="side-links" id="sg-' + c.id + '"' + (open ? '' : ' hidden') + '>' +
        list.map(function (p) {
          return '<li><a href="#/' + p.slug + '" data-slug="' + p.slug + '">' + esc(p.title) + '</a></li>';
        }).join('') + '</ul></li>';
    });
    html += '</ul></nav>';
    sidebar.innerHTML = html;
  }

  function setGroupOpen(li, open) {
    var btn = $('.side-group-btn', li);
    var ul = $('.side-links', li);
    li.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    ul.hidden = !open;
    if (open) state.openGroups.add(li.dataset.cat);
    else state.openGroups.delete(li.dataset.cat);
  }

  sidebar.addEventListener('click', function (e) {
    var btn = e.target.closest('.side-group-btn');
    if (btn) {
      var li = btn.parentElement;
      setGroupOpen(li, !li.classList.contains('is-open'));
    }
  });

  function syncSidebar(slug, catId) {
    if (catId && !state.openGroups.has(catId)) {
      var li = $('.side-group[data-cat="' + catId + '"]', sidebar);
      if (li) setGroupOpen(li, true);
    }
    $$('.side-links a', sidebar).forEach(function (a) {
      var active = a.dataset.slug === slug;
      if (active) {
        a.setAttribute('aria-current', 'page');
        a.scrollIntoView({ block: 'nearest' });
      } else {
        a.removeAttribute('aria-current');
      }
    });
    $$('.side-group', sidebar).forEach(function (li) {
      li.classList.toggle('has-active', li.dataset.cat === catId);
    });
  }

  /* Tiroir mobile */
  var menuBtn = $('#gd-menu');
  var backdrop = $('#gd-backdrop');

  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menuBtn.innerHTML = icon(open ? 'x' : 'menu');
    backdrop.hidden = !open;
    if (open) {
      var target = $('[aria-current="page"]', sidebar) || $('.side-group-btn', sidebar);
      if (target) target.focus();
    }
  }

  menuBtn.addEventListener('click', function () {
    setNav(!document.body.classList.contains('nav-open'));
  });
  backdrop.addEventListener('click', function () { setNav(false); });
  sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a')) setNav(false);
  });

  /* ---------- Rendu des résultats de recherche ---------- */

  function resultItem(r, terms, id, compact) {
    var doc = r.doc;
    var cat = categories.get(r.page.category);
    var sub = '';
    if (doc && doc.type === 'section') sub = '<span class="res-sub">' + icon('hash') + esc(doc.title) + '</span>';
    else if (doc && doc.type === 'question') sub = '<span class="res-sub">' + icon('help') + esc(doc.title) + '</span>';
    var snippet = compact ? '' : '<span class="res-snippet">' + G.search.snippet(doc ? doc.text : r.page.summary, terms, 170) + '</span>';
    return '<a class="res-item" role="option" id="' + id + '" aria-selected="false" href="' + G.search.href(r) + '">' +
      '<span class="res-icon">' + icon(cat ? cat.icon : 'book') + '</span>' +
      '<span class="res-main"><span class="res-title">' + esc(r.page.title) + '</span>' + sub + snippet + '</span>' +
      '<span class="res-cat">' + esc(cat ? cat.title : '') + '</span>' +
      icon('chevronRight', 'res-go') + '</a>';
  }

  function featuredCard(r) {
    var f = G.search.featured(r);
    var cat = categories.get(r.page.category);
    var body = md.render(f.md, { pages: pages, noIds: true, offset: 1 });
    return '<section class="featured" aria-label="Réponse rapide">' +
      '<div class="featured-head"><span class="featured-badge">' + icon('zap') + 'Réponse rapide</span>' +
      '<span class="featured-cat">' + esc(cat ? cat.title : '') + ' · ' + esc(r.page.title) + '</span></div>' +
      '<h2 class="featured-title"><a href="' + f.href + '">' + esc(f.title) + '</a></h2>' +
      '<div class="featured-body prose">' + body + '</div>' +
      '<a class="featured-more" href="' + f.href + '">' +
      (f.kind === 'section' ? 'Lire cette section en entier' : 'Lire l\'explication détaillée') + icon('arrowRight') + '</a>' +
      '</section>';
  }

  function emptyState(q) {
    var dym = G.search.didYouMean(q);
    var html = '<div class="empty"><p class="empty-title">Aucun résultat pour « ' + esc(q) + ' »</p>';
    if (dym) {
      html += '<p>Vouliez-vous dire <button type="button" class="link-btn" data-query="' + esc(dym) + '">' + esc(dym) + '</button> ?</p>';
    }
    html += '<p class="empty-hint">Essayez un mot-clé plus simple (« slice », « erreur », « fichier ») ou parcourez les thèmes :</p>' +
      '<div class="chips">' + G.search.popular().map(function (p) {
        return '<a class="chip" href="#/' + p.slug + '">' + esc(p.title) + '</a>';
      }).join('') + '</div></div>';
    return html;
  }

  /**
   * Gère un champ de recherche avec une liste de résultats navigable au clavier.
   * opts : input, list (listbox), featured (conteneur optionnel), limit, onRender
   */
  function SearchBox(opts) {
    var input = opts.input;
    var active = -1;
    var current = [];
    var timer = null;
    var prefix = opts.prefix || 'opt';

    function options() {
      return $$('[role="option"]', opts.list).filter(function (el) { return !el.hidden; });
    }

    function setActive(i) {
      var items = options();
      if (!items.length) return;
      active = (i + items.length) % items.length;
      items.forEach(function (el, k) { el.setAttribute('aria-selected', String(k === active)); });
      input.setAttribute('aria-activedescendant', items[active].id);
      items[active].scrollIntoView({ block: 'nearest' });
    }

    function run() {
      var q = input.value.trim();
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (!q) {
        current = [];
        if (opts.onEmpty) opts.onEmpty();
        return;
      }
      var res = G.search.query(q, opts.limit || 8);
      current = res.results;
      if (opts.featured) {
        opts.featured.innerHTML = current.length && opts.showFeatured !== false ? featuredCard(current[0]) : '';
        var fb = $('.featured-body', opts.featured);
        if (fb && fb.scrollHeight > fb.clientHeight + 4) fb.classList.add('is-clipped');
      }
      if (!current.length) {
        opts.list.innerHTML = '';
        if (opts.empty) opts.empty.innerHTML = emptyState(q);
      } else {
        if (opts.empty) opts.empty.innerHTML = '';
        opts.list.innerHTML = current.map(function (r, i) {
          return resultItem(r, res.terms, prefix + '-' + i, opts.compact);
        }).join('');
      }
      if (opts.onRender) opts.onRender(q, res);
      announce(current.length ? current.length + ' résultat' + (current.length > 1 ? 's' : '') : 'Aucun résultat');
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 70);
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(active + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(active - 1);
      } else if (e.key === 'Enter') {
        clearTimeout(timer);
        if (input.value.trim() && !current.length) run();
        var items = options();
        var href = active >= 0 && items[active] ? items[active].getAttribute('href')
          : current.length ? G.search.href(current[0]) : null;
        if (!href && !current.length && opts.list.querySelector('[role="option"]')) {
          href = opts.list.querySelector('[role="option"]').getAttribute('href');
        }
        if (href) {
          e.preventDefault();
          if (opts.onNavigate) opts.onNavigate();
          location.hash = href;
        }
      }
    });

    return { run: run };
  }

  // « Vouliez-vous dire » : relance la recherche avec la correction
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-query]');
    if (!btn) return;
    var box = btn.closest('.search-zone');
    var input = box && $('input[type="search"]', box);
    if (input) {
      input.value = btn.dataset.query;
      input.dispatchEvent(new Event('input'));
      input.focus();
    }
  });

  /* ---------- Vues ---------- */

  function viewHome() {
    var stats = G.search.stats();
    var html = '<div class="home">' +
      '<section class="hero search-zone">' +
      '<div class="hero-glow" aria-hidden="true"></div>' +
      '<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Documentation Go · 100 % en français</p>' +
      '<h1 class="hero-title" tabindex="-1">Comprendre <span class="go-word">Go</span>,<br>simplement.</h1>' +
      '<p class="hero-sub">Chaque notion expliquée en deux temps : <strong>l\'essentiel en 30 secondes</strong>, puis <strong>tous les détails</strong>. Tapez un mot-clé ou posez directement votre question.</p>' +
      '<div class="hero-search" role="search">' +
      '<label for="gd-hero-input" class="sr-only">Rechercher dans la documentation</label>' +
      '<div class="search-box search-box-xl">' + icon('search', 'search-box-icon') +
      '<input id="gd-hero-input" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" ' +
      'placeholder="string, goroutine, comment lire un fichier ?…" role="combobox" aria-expanded="false" ' +
      'aria-controls="gd-hero-list" aria-autocomplete="list">' +
      '<kbd class="kbd search-box-kbd" aria-hidden="true">/</kbd></div>' +
      '<div class="hero-results" id="gd-hero-results" hidden>' +
      '<div class="hero-featured"></div>' +
      '<div class="hero-empty"></div>' +
      '<p class="results-label" id="gd-hero-label">Autres résultats</p>' +
      '<div class="res-list" id="gd-hero-list" role="listbox" aria-labelledby="gd-hero-label"></div>' +
      '<a class="results-all" id="gd-hero-all" href="#/recherche">Voir tous les résultats' + icon('arrowRight') + '</a>' +
      '</div></div>' +
      '<div class="suggestions"><span class="suggestions-label">Essayez :</span>' +
      SUGGESTIONS.map(function (s) {
        return '<button type="button" class="chip" data-suggest="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '</div>' +
      '</section>' +

      '<section class="stats" aria-label="La documentation en chiffres">' +
      stat(data.pages.length, 'pages de documentation') +
      stat(data.categories.length, 'thèmes, des bases à la concurrence') +
      stat(stats.questions, 'questions reconnues par la recherche') +
      stat(2, 'niveaux d\'explication par page') +
      '</section>' +

      '<section class="home-section" aria-labelledby="h-themes">' +
      '<div class="section-head"><h2 id="h-themes">Parcourir par thème</h2>' +
      '<p>Suivez l\'ordre pour apprendre pas à pas, ou allez directement à ce qui vous intéresse.</p></div>' +
      '<div class="cat-grid">' + data.categories.map(function (c, i) {
        var list = pagesOf(c.id);
        return '<a class="cat-card" href="#/categorie/' + c.id + '">' +
          '<span class="cat-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="cat-icon">' + icon(c.icon) + '</span>' +
          '<span class="cat-title">' + esc(c.title) + '</span>' +
          '<span class="cat-desc">' + esc(c.description) + '</span>' +
          '<span class="cat-foot">' + list.length + ' pages' + icon('arrowRight') + '</span></a>';
      }).join('') + '</div></section>' +

      '<section class="home-section two-levels" aria-labelledby="h-levels">' +
      '<div class="section-head"><h2 id="h-levels">Deux niveaux de lecture sur chaque page</h2>' +
      '<p>Pressé ? Lisez l\'explication rapide. Curieux ? Continuez avec l\'explication détaillée.</p></div>' +
      '<div class="levels-grid">' +
      '<div class="level-card level-card-quick"><span class="level-card-icon">' + icon('zap') + '</span>' +
      '<h3>Explication rapide</h3><p>L\'essentiel en quelques lignes, avec un exemple de code prêt à copier. Idéal pour se rafraîchir la mémoire.</p></div>' +
      '<div class="level-card"><span class="level-card-icon">' + icon('book') + '</span>' +
      '<h3>Explication détaillée</h3><p>Le fonctionnement complet, les cas particuliers, les pièges fréquents et les bonnes pratiques, section par section.</p></div>' +
      '</div></section>' +

      '<section class="home-section" aria-labelledby="h-faq">' +
      '<div class="section-head section-head-row"><div><h2 id="h-faq">Questions fréquentes</h2>' +
      '<p>Des réponses directes aux questions qu\'on se pose vraiment en apprenant Go.</p></div>' +
      '<a class="btn-ghost" href="#/categorie/faq">Toutes les questions' + icon('arrowRight') + '</a></div>' +
      '<ul class="faq-list">' + pagesOf('faq').slice(0, 10).map(function (p) {
        return '<li><a href="#/' + p.slug + '">' + icon('help', 'faq-icon') + '<span>' + esc(p.title) + '</span>' + icon('chevronRight', 'faq-go') + '</a></li>';
      }).join('') + '</ul></section>' +

      '<section class="home-section start" aria-labelledby="h-start">' +
      '<div class="start-card"><div><h2 id="h-start">Vous débutez ?</h2>' +
      '<p>Commencez par découvrir le langage, installez-le, puis écrivez votre premier programme. Le reste suivra naturellement.</p></div>' +
      '<ol class="start-steps">' + ['introduction', 'installation', 'premier-programme', 'variables', 'for'].map(function (s, i) {
        var p = pages.get(s);
        return '<li><a href="#/' + s + '"><span class="step-num">' + (i + 1) + '</span><span>' + esc(p.title) + '</span></a></li>';
      }).join('') + '</ol></div></section>' +
      '</div>';

    main.innerHTML = html;
    document.title = SITE.name + ' — La documentation Go en français';

    var input = $('#gd-hero-input');
    var panel = $('#gd-hero-results');
    var all = $('#gd-hero-all');
    var box = SearchBox({
      input: input,
      list: $('#gd-hero-list'),
      featured: $('.hero-featured', panel),
      empty: $('.hero-empty', panel),
      prefix: 'hero',
      limit: 8,
      onEmpty: function () {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      },
      onRender: function (q, res) {
        panel.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        var others = res.results.length > 1;
        $('#gd-hero-label').hidden = !others;
        $('#gd-hero-list').hidden = !others;
        // Le premier résultat est déjà présenté dans la réponse rapide
        var first = $('#hero-0');
        if (first) first.hidden = true;
        all.hidden = !res.results.length;
        all.href = '#/recherche?q=' + encodeURIComponent(q);
        all.firstChild.textContent = 'Voir tous les résultats (' + res.total + ')';
      }
    });

    $$('[data-suggest]').forEach(function (b) {
      b.addEventListener('click', function () {
        input.value = b.dataset.suggest;
        box.run();
        input.focus();
      });
    });
  }

  function stat(n, label) {
    return '<div class="stat"><span class="stat-num">' + n + '</span><span class="stat-label">' + esc(label) + '</span></div>';
  }

  function viewCategory(id) {
    var c = categories.get(id);
    if (!c) return viewNotFound();
    var list = pagesOf(id);
    var idx = data.categories.indexOf(c);
    var prev = data.categories[idx - 1];
    var next = data.categories[idx + 1];
    main.innerHTML = '<div class="page-wrap"><div class="category">' +
      '<nav class="breadcrumb" aria-label="Fil d\'Ariane"><a href="#/">Accueil</a>' + icon('chevronRight') + '<span aria-current="page">' + esc(c.title) + '</span></nav>' +
      '<header class="cat-header"><span class="cat-header-icon">' + icon(c.icon) + '</span>' +
      '<div><p class="eyebrow-small">Thème ' + (idx + 1) + ' sur ' + data.categories.length + '</p>' +
      '<h1 tabindex="-1">' + esc(c.title) + '</h1><p class="doc-lead">' + esc(c.description) + '</p></div></header>' +
      '<ol class="page-list">' + list.map(function (p, i) {
        return '<li><a class="page-card" href="#/' + p.slug + '">' +
          '<span class="page-card-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="page-card-main"><span class="page-card-title">' + esc(p.title) + '</span>' +
          '<span class="page-card-summary">' + esc(p.summary) + '</span>' +
          '<span class="page-card-meta">' + levelBadge(p.level) + '<span class="meta-item">' + icon('clock') + readingTime(p) + ' min</span></span></span>' +
          icon('chevronRight', 'page-card-go') + '</a></li>';
      }).join('') + '</ol>' +
      '<nav class="pager" aria-label="Thèmes voisins">' +
      (prev ? '<a class="pager-link" href="#/categorie/' + prev.id + '"><span class="pager-dir">' + icon('chevronLeft') + 'Thème précédent</span><span class="pager-title">' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="pager-link pager-next" href="#/categorie/' + next.id + '"><span class="pager-dir">Thème suivant' + icon('chevronRight') + '</span><span class="pager-title">' + esc(next.title) + '</span></a>' : '') +
      '</nav></div></div>';
    document.title = c.title + ' — ' + SITE.name;
    syncSidebar(null, id);
  }

  function viewPage(slug) {
    var p = pages.get(slug);
    if (!p) return viewNotFound(slug);
    var c = categories.get(p.category);
    var seen = md.newSeen();
    var quickHTML = md.render(p.quick, { pages: pages, slug: slug, seen: seen, offset: 1 });
    var headings = [];
    var detailHTML = md.render(p.detail, { pages: pages, slug: slug, seen: seen, offset: 1, headings: headings });
    var idx = ordered.indexOf(p);
    var prev = ordered[idx - 1];
    var next = ordered[idx + 1];

    var related = p.related.map(function (s) { return pages.get(s); }).filter(Boolean);
    var questions = p.questions;

    var toc = '<p class="toc-title">' + icon('list') + 'Sur cette page</p><ul class="toc-list">' +
      '<li><a href="#/' + slug + '/rapide" data-target="rapide" class="toc-key">' + icon('zap') + 'Explication rapide</a></li>' +
      '<li><a href="#/' + slug + '/detail" data-target="detail" class="toc-key">' + icon('book') + 'Explication détaillée</a>';
    var h2s = headings.filter(function (h) { return h.level === 2; });
    if (h2s.length) {
      toc += '<ul>' + headings.filter(function (h) { return h.level <= 3; }).map(function (h) {
        return '<li class="toc-l' + h.level + '"><a href="#/' + slug + '/' + h.id + '" data-target="' + h.id + '">' + esc(h.text) + '</a></li>';
      }).join('') + '</ul>';
    }
    toc += '</li></ul>';

    main.innerHTML = '<div class="page-wrap"><div class="doc-layout">' +
      '<article class="doc" aria-labelledby="doc-title">' +
      '<nav class="breadcrumb" aria-label="Fil d\'Ariane"><a href="#/">Accueil</a>' + icon('chevronRight') +
      '<a href="#/categorie/' + c.id + '">' + esc(c.title) + '</a>' + icon('chevronRight') +
      '<span aria-current="page">' + esc(p.title) + '</span></nav>' +
      '<header class="doc-header">' +
      '<h1 id="doc-title" tabindex="-1">' + esc(p.title) + '</h1>' +
      '<p class="doc-lead">' + esc(p.summary) + '</p>' +
      '<div class="doc-meta">' + levelBadge(p.level) +
      '<span class="meta-item">' + icon('clock') + readingTime(p) + ' min de lecture</span>' +
      '<span class="meta-item">' + icon(c.icon) + esc(c.title) + '</span></div>' +
      '<nav class="mode-nav" aria-label="Niveaux d\'explication">' +
      '<a class="mode-pill mode-quick" href="#/' + slug + '/rapide">' + icon('zap') + 'Explication rapide</a>' +
      '<a class="mode-pill" href="#/' + slug + '/detail">' + icon('book') + 'Explication détaillée</a></nav>' +
      '</header>' +

      '<section id="rapide" class="quick" aria-labelledby="rapide-title">' +
      '<div class="quick-head"><span class="quick-icon">' + icon('zap') + '</span>' +
      '<h2 id="rapide-title">Explication rapide</h2><span class="quick-tag">L\'essentiel en 30 secondes</span></div>' +
      '<div class="prose">' + quickHTML + '</div></section>' +

      (questions.length ? '<aside class="answers" aria-labelledby="answers-title"><p class="answers-title" id="answers-title">' + icon('help') + 'Cette page répond à</p><ul>' +
        questions.map(function (q) {
          var target = q.anchor ? '#/' + slug + '/' + q.anchor : '#/' + slug + '/rapide';
          return '<li><a href="' + target + '">' + esc(q.text) + '</a></li>';
        }).join('') + '</ul></aside>' : '') +

      '<section id="detail" class="detail" aria-labelledby="detail-title">' +
      '<div class="detail-head"><span class="detail-icon">' + icon('book') + '</span>' +
      '<h2 id="detail-title">Explication détaillée</h2></div>' +
      '<div class="prose">' + detailHTML + '</div></section>' +

      (related.length ? '<section class="related" aria-labelledby="related-title"><h2 id="related-title">Pour aller plus loin</h2><div class="related-grid">' +
        related.map(function (r) {
          var rc = categories.get(r.category);
          return '<a class="related-card" href="#/' + r.slug + '"><span class="related-cat">' + icon(rc.icon) + esc(rc.title) + '</span>' +
            '<span class="related-title">' + esc(r.title) + '</span><span class="related-summary">' + esc(r.summary) + '</span></a>';
        }).join('') + '</div></section>' : '') +

      '<nav class="pager" aria-label="Pages voisines">' +
      (prev ? '<a class="pager-link" href="#/' + prev.slug + '"><span class="pager-dir">' + icon('chevronLeft') + 'Précédent</span><span class="pager-title">' + esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="pager-link pager-next" href="#/' + next.slug + '"><span class="pager-dir">Suivant' + icon('chevronRight') + '</span><span class="pager-title">' + esc(next.title) + '</span></a>' : '') +
      '</nav></article>' +
      '<aside class="toc" aria-label="Sur cette page">' + toc + '</aside>' +
      '</div></div>';

    document.title = p.title + ' — ' + SITE.name;
    syncSidebar(slug, p.category);
    setupScrollSpy();
  }

  function viewSearch(q) {
    main.innerHTML = '<div class="page-wrap"><div class="search-page search-zone">' +
      '<nav class="breadcrumb" aria-label="Fil d\'Ariane"><a href="#/">Accueil</a>' + icon('chevronRight') + '<span aria-current="page">Recherche</span></nav>' +
      '<h1 tabindex="-1">Recherche</h1>' +
      '<div role="search"><label for="gd-search-input" class="sr-only">Rechercher dans la documentation</label>' +
      '<div class="search-box search-box-lg">' + icon('search', 'search-box-icon') +
      '<input id="gd-search-input" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" ' +
      'placeholder="Un mot-clé ou une question…" role="combobox" aria-expanded="true" aria-controls="gd-search-list" aria-autocomplete="list" value="' + esc(q) + '">' +
      '</div></div>' +
      '<p class="results-count" id="gd-search-count"></p>' +
      '<div class="search-featured"></div><div class="search-empty"></div>' +
      '<div class="res-list res-list-page" id="gd-search-list" role="listbox" aria-label="Résultats"></div>' +
      '</div></div>';
    document.title = (q ? q + ' — ' : '') + 'Recherche — ' + SITE.name;
    var input = $('#gd-search-input');
    var count = $('#gd-search-count');
    var box = SearchBox({
      input: input,
      list: $('#gd-search-list'),
      featured: $('.search-featured'),
      empty: $('.search-empty'),
      prefix: 'sr',
      limit: 40,
      onEmpty: function () {
        $('#gd-search-list').innerHTML = '';
        $('.search-featured').innerHTML = '';
        $('.search-empty').innerHTML = '';
        count.textContent = '';
        history.replaceState(null, '', '#/recherche');
      },
      onRender: function (query, res) {
        count.textContent = res.results.length
          ? res.total + ' résultat' + (res.total > 1 ? 's' : '') + ' pour « ' + query + ' »'
          : '';
        history.replaceState(null, '', '#/recherche?q=' + encodeURIComponent(query));
      }
    });
    syncSidebar(null, null);
    if (q) box.run();
    return input;
  }

  function viewNotFound(slug) {
    main.innerHTML = '<div class="page-wrap"><div class="notfound">' +
      '<p class="notfound-code">404</p><h1 tabindex="-1">Page introuvable</h1>' +
      '<p class="doc-lead">' + (slug ? 'La page « ' + esc(slug) + ' » n\'existe pas.' : 'Cette page n\'existe pas.') +
      ' Essayez la recherche ou revenez à l\'accueil.</p>' +
      '<div class="notfound-actions"><a class="btn-primary" href="#/">Retour à l\'accueil</a>' +
      (slug ? '<a class="btn-ghost" href="#/recherche?q=' + encodeURIComponent(slug.replace(/-/g, ' ')) + '">Rechercher « ' + esc(slug.replace(/-/g, ' ')) + ' »</a>' : '') +
      '</div></div></div>';
    document.title = 'Page introuvable — ' + SITE.name;
  }

  /* ---------- Copie du code ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copie impossible'));
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.copy-btn');
    if (!btn) return;
    e.preventDefault();
    var code = btn.closest('.code-block').querySelector('code').textContent;
    copyText(code).then(function () {
      btn.classList.add('is-copied');
      btn.innerHTML = icon('check') + '<span class="copy-label">Copié</span>';
      announce('Code copié dans le presse-papiers');
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.innerHTML = icon('copy') + '<span class="copy-label">Copier</span>';
      }, 1800);
    }, function () {
      announce('Impossible de copier le code');
    });
  });

  /* ---------- Sommaire et position de lecture ---------- */

  var tocLinks = [];
  var tocTargets = [];

  function setupScrollSpy() {
    tocLinks = $$('.toc a[data-target]');
    tocTargets = tocLinks.map(function (a) { return document.getElementById(a.dataset.target); });
  }

  function updateScrollSpy() {
    if (!tocLinks.length) return;
    var activeId = tocTargets[0] && tocTargets[0].id;
    for (var i = 0; i < tocTargets.length; i++) {
      var t = tocTargets[i];
      if (t && t.getBoundingClientRect().top < 120) activeId = t.id;
    }
    tocLinks.forEach(function (a) { a.classList.toggle('is-active', a.dataset.target === activeId); });
  }

  var progress = $('#gd-progress');
  var toTop = $('#gd-top');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var ratio = state.view === 'page' && max > 0 ? Math.min(1, doc.scrollTop / max) : 0;
      progress.style.transform = 'scaleX(' + ratio + ')';
      toTop.classList.toggle('is-visible', doc.scrollTop > 700);
      updateScrollSpy();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    var h1 = $('h1', main);
    if (h1) h1.focus({ preventScroll: true });
  });

  function scrollToAnchor(id, smooth) {
    var el = id && document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto', block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth; // relance l'animation
    el.classList.add('flash');
    return true;
  }

  /* ---------- Palette de recherche (Ctrl+K) ---------- */

  var palette = $('#gd-palette');
  var palInput = $('#gd-palette-input');
  var palList = $('#gd-palette-list');
  var palAll = $('#gd-palette-all');
  var lastFocus = null;

  function paletteDefaults() {
    palList.innerHTML = '<p class="pal-section">Pages populaires</p>' + G.search.popular().map(function (p, i) {
      var c = categories.get(p.category);
      return '<a class="res-item" role="option" id="pal-' + i + '" aria-selected="false" href="#/' + p.slug + '">' +
        '<span class="res-icon">' + icon(c.icon) + '</span><span class="res-main"><span class="res-title">' + esc(p.title) + '</span></span>' +
        '<span class="res-cat">' + esc(c.title) + '</span>' + icon('chevronRight', 'res-go') + '</a>';
    }).join('');
    palAll.hidden = true;
  }

  var palBox = SearchBox({
    input: palInput,
    list: palList,
    prefix: 'pal',
    limit: 9,
    compact: false,
    onEmpty: paletteDefaults,
    onNavigate: function () { closePalette(false); },
    onRender: function (q, res) {
      palAll.hidden = false;
      palAll.href = '#/recherche?q=' + encodeURIComponent(q);
      if (!res.results.length) palList.innerHTML = emptyState(q);
    }
  });

  function openPalette(initial) {
    if (palette.open) return;
    lastFocus = document.activeElement;
    setNav(false);
    palInput.value = initial || '';
    if (palInput.value) palBox.run();
    else paletteDefaults();
    if (typeof palette.showModal === 'function') palette.showModal();
    else palette.setAttribute('open', '');
    document.body.classList.add('palette-open');
    palInput.focus();
  }

  function closePalette(restoreFocus) {
    if (!palette.open) return;
    if (restoreFocus === false) lastFocus = null;
    palette.close();
  }

  palette.addEventListener('close', function () {
    document.body.classList.remove('palette-open');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  });
  palette.addEventListener('click', function (e) {
    if (e.target === palette) closePalette(); // clic sur le fond
    if (e.target.closest('a[href^="#"]')) closePalette(false);
  });
  $('#gd-palette-close').addEventListener('click', closePalette);
  $('#gd-search-trigger').addEventListener('click', function () { openPalette(); });

  $('#gd-search-trigger kbd').textContent = isMac ? '⌘ K' : 'Ctrl K';

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette.open) closePalette();
      else openPalette();
      return;
    }
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      var hero = $('#gd-hero-input');
      if (hero) hero.focus();
      else openPalette();
      return;
    }
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setNav(false);
      menuBtn.focus();
    }
  });

  /* ---------- Routeur ---------- */

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    try { h = decodeURI(h); } catch (e) { /* hash mal formé : on le garde tel quel */ }
    var query = '';
    var qi = h.indexOf('?');
    if (qi !== -1) {
      query = h.slice(qi + 1);
      h = h.slice(0, qi);
    }
    var parts = h.split('/').filter(Boolean);
    if (!parts.length) return { view: 'home' };
    if (parts[0] === 'recherche') {
      var q = '';
      query.split('&').forEach(function (kv) {
        var pair = kv.split('=');
        if (pair[0] === 'q') q = decodeURIComponent((pair[1] || '').replace(/\+/g, ' '));
      });
      return { view: 'search', q: q };
    }
    if (parts[0] === 'categorie') return { view: 'category', id: parts[1] };
    return { view: 'page', slug: parts[0], anchor: parts[1] };
  }

  function route() {
    var r = parseHash();
    var first = state.firstRender;
    state.firstRender = false;

    // Même page : on se contente de défiler jusqu'à l'ancre
    if (r.view === 'page' && state.view === 'page' && state.slug === r.slug) {
      if (r.anchor) scrollToAnchor(r.anchor, true);
      else window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      return;
    }

    state.view = r.view;
    state.slug = r.slug || null;
    document.body.dataset.view = r.view;
    tocLinks = [];
    tocTargets = [];
    closePalette(false);

    var focusTarget = null;
    if (r.view === 'home') {
      viewHome();
      syncSidebar(null, null);
    } else if (r.view === 'category') {
      viewCategory(r.id);
    } else if (r.view === 'search') {
      focusTarget = viewSearch(r.q);
    } else {
      viewPage(r.slug);
    }

    if (r.view === 'page' && r.anchor && pages.has(r.slug)) {
      requestAnimationFrame(function () { scrollToAnchor(r.anchor, false); });
      // Au premier chargement, les polices peuvent décaler la mise en page
      if (first && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          var el = document.getElementById(r.anchor);
          if (el) el.scrollIntoView({ block: 'start' });
        });
      }
    } else {
      window.scrollTo(0, 0);
    }

    // Accessibilité : on place le focus sur le contenu après une navigation
    if (!first) {
      var target = focusTarget || $('h1', main);
      if (target) target.focus({ preventScroll: true });
    } else if (focusTarget) {
      focusTarget.focus();
    }
    onScroll();
  }

  // Un clic sur le lien de la page courante doit tout de même défiler
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (a.getAttribute('href') === location.hash) {
      var r = parseHash();
      if (r.view === 'page' && r.anchor) {
        e.preventDefault();
        scrollToAnchor(r.anchor, true);
      }
    }
  });

  window.addEventListener('hashchange', route);

  /* ---------- Démarrage ---------- */

  $('#gd-year').textContent = String(new Date().getFullYear());
  menuBtn.innerHTML = icon('menu');
  renderSidebar();
  route();
})();
