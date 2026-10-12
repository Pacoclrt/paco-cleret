/*
 * Rendu Markdown minimal pour les pages de Gopédia.
 *
 * Syntaxe prise en charge : titres ## à #### (ancre explicite {#id} possible),
 * paragraphes, listes (imbriquées), tableaux, citations, blocs de code
 * (```go title=main.go), encadrés (:::tip / :::info / :::warning / :::danger),
 * code en ligne, gras, italique, liens [texte](url) et liens internes
 * [[slug]], [[slug|texte]], [[slug#ancre|texte]].
 *
 * L'attribution des identifiants de titres doit rester identique à celle de
 * tools/build/main.go (collectAnchors), qui valide les liens internes.
 */
(function () {
  'use strict';

  var G = (window.GoDoc = window.GoDoc || {});

  var ACCENTS = {
    'à': 'a', 'â': 'a', 'ä': 'a', 'á': 'a', 'ã': 'a', 'å': 'a',
    'ç': 'c', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'î': 'i', 'ï': 'i', 'í': 'i', 'ì': 'i',
    'ô': 'o', 'ö': 'o', 'ó': 'o', 'ò': 'o', 'õ': 'o',
    'ù': 'u', 'û': 'u', 'ü': 'u', 'ú': 'u', 'ÿ': 'y', 'ñ': 'n',
    'œ': 'oe', 'æ': 'ae'
  };

  var RESERVED_IDS = ['rapide', 'detail'];

  var CALLOUT_TITLES = {
    tip: 'Astuce',
    info: 'Bon à savoir',
    note: 'Note',
    warning: 'Attention',
    danger: 'Danger'
  };

  var LANG_LABELS = {
    go: 'Go',
    bash: 'Terminal',
    sh: 'Terminal',
    json: 'JSON',
    text: 'Texte',
    output: 'Sortie'
  };

  /** Met en minuscules et retire les accents (« Élève » → « eleve »). */
  function fold(s) {
    return s.toLowerCase().replace(/[^\x00-\x7f]/g, function (c) {
      return ACCENTS[c] || c;
    });
  }

  function slugify(s) {
    return fold(s.replace(/[`*[\]]/g, ''))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Nouvel ensemble d'identifiants, avec les ancres réservées par la mise en page. */
  function newSeen() {
    var seen = new Map();
    RESERVED_IDS.forEach(function (id) { seen.set(id, 1); });
    return seen;
  }

  /** Rend un identifiant unique, exactement comme collectAnchors côté Go. */
  function uniqueId(seen, id) {
    if (seen.has(id)) {
      var n = seen.get(id) + 1;
      seen.set(id, n);
      id = id + '-' + n;
    }
    seen.set(id, Math.max(seen.get(id) || 0, 1));
    return id;
  }

  var HEADING_RE = /^(#{2,4})\s+(.+?)\s*(?:\{#([\w-]+)\})?\s*$/;
  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

  function isBlockStart(line, next) {
    return /^```/.test(line) ||
      HEADING_RE.test(line) ||
      /^:::/.test(line) ||
      /^>/.test(line) ||
      /^-{3,}\s*$/.test(line) ||
      LIST_RE.test(line) ||
      (/^\|/.test(line) && next !== undefined && /^\|[\s:|-]+\|?\s*$/.test(next));
  }

  /* ---------- Rendu en ligne ---------- */

  function inline(text, ctx) {
    var slots = [];
    function hold(html) {
      slots.push(html);
      return '\u0000' + (slots.length - 1) + '\u0000';
    }

    // Code en ligne (une ou plusieurs backticks)
    text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, function (m, ticks, code) {
      if (/^ .* $/.test(code)) code = code.slice(1, -1);
      return hold('<code>' + escapeHTML(code) + '</code>');
    });

    text = escapeHTML(text);

    // Liens internes [[slug#ancre|texte]]
    text = text.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, function (m, slug, anchor, label) {
      slug = slug.trim();
      var page = ctx.pages && ctx.pages.get(slug);
      var href = '#/' + slug + (anchor ? '/' + anchor.trim() : '');
      var text = label ? label : (page ? escapeHTML(page.title) : slug);
      return hold('<a class="xref" href="' + href + '">' + text + '</a>');
    });

    // Liens [texte](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      if (/^https?:/i.test(url)) {
        return hold('<a class="ext" href="' + url + '" target="_blank" rel="noopener noreferrer">' + label +
          '<span class="sr-only"> (nouvel onglet)</span></a>');
      }
      return hold('<a href="' + url + '">' + label + '</a>');
    });

    text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*\w])\*([^*\s](?:[^*]*?[^*\s])?)\*(?![*\w])/g, '$1<em>$2</em>');

    // Restaure les morceaux mis de côté (plusieurs passes pour les imbrications)
    for (var pass = 0; pass < 3 && text.indexOf('\u0000') !== -1; pass++) {
      text = text.replace(/\u0000(\d+)\u0000/g, function (m, i) { return slots[+i]; });
    }
    return text;
  }

  /* ---------- Blocs ---------- */

  function codeBlock(code, lang, title) {
    lang = (lang || 'text').toLowerCase();
    var label = LANG_LABELS[lang] || lang.toUpperCase();
    var head = title
      ? '<span class="code-file">' + escapeHTML(title) + '</span><span class="code-lang">' + escapeHTML(label) + '</span>'
      : '<span class="code-lang">' + escapeHTML(label) + '</span>';
    var html = G.highlight ? G.highlight(code, lang) : escapeHTML(code);
    return '<div class="code-block code-' + escapeHTML(lang) + '">' +
      '<div class="code-head">' + head +
      '<button type="button" class="copy-btn" aria-label="Copier le code">' +
      (G.icon ? G.icon('copy') : '') + '<span class="copy-label">Copier</span></button></div>' +
      '<pre tabindex="0"><code>' + html + '</code></pre></div>';
  }

  function callout(kind, title, bodyHTML, ctx) {
    var icons = { tip: 'lightbulb', info: 'info', note: 'info', warning: 'alert', danger: 'octagon' };
    var t = title ? inline(title, ctx) : CALLOUT_TITLES[kind];
    return '<div class="callout callout-' + kind + '" role="note">' +
      '<div class="callout-title">' + (G.icon ? G.icon(icons[kind]) : '') + '<span>' + t + '</span></div>' +
      '<div class="callout-body">' + bodyHTML + '</div></div>';
  }

  function splitRow(row) {
    row = row.trim().replace(/^\|/, '').replace(/\|\s*$/, '');
    var cells = [];
    var cur = '';
    var i = 0;
    while (i < row.length) {
      var ch = row[i];
      if (ch === '\\' && row[i + 1] === '|') {
        cur += '|';
        i += 2;
        continue;
      }
      if (ch === '[' && row[i + 1] === '[') {
        // Lien interne [[slug|texte]] : son « | » n'est pas un séparateur de colonnes
        var close = row.indexOf(']]', i + 2);
        if (close !== -1) {
          cur += row.slice(i, close + 2);
          i = close + 2;
          continue;
        }
      }
      if (ch === '`') {
        var n = 0;
        while (row[i + n] === '`') n++;
        var ticks = row.substr(i, n);
        var end = row.indexOf(ticks, i + n);
        if (end !== -1) {
          cur += row.slice(i, end + n).replace(/\\\|/g, '|');
          i = end + n;
          continue;
        }
        cur += ticks;
        i += n;
        continue;
      }
      if (ch === '|') {
        cells.push(cur.trim());
        cur = '';
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
    cells.push(cur.trim());
    return cells;
  }

  function table(rows, ctx) {
    var head = splitRow(rows[0]);
    var aligns = splitRow(rows[1]).map(function (c) {
      if (/^:-+:$/.test(c)) return 'center';
      if (/^-+:$/.test(c)) return 'right';
      return '';
    });
    function cell(tag, content, i) {
      var a = aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '';
      return '<' + tag + a + '>' + inline(content, ctx) + '</' + tag + '>';
    }
    var html = '<div class="table-wrap" role="region" tabindex="0" aria-label="Tableau"><table><thead><tr>' +
      head.map(function (c, i) { return cell('th', c, i); }).join('') + '</tr></thead><tbody>';
    for (var r = 2; r < rows.length; r++) {
      var cells = splitRow(rows[r]);
      html += '<tr>' + head.map(function (_, i) { return cell('td', cells[i] || '', i); }).join('') + '</tr>';
    }
    return html + '</tbody></table></div>';
  }

  function list(lines, i, ctx) {
    var first = lines[i].match(LIST_RE);
    var indent = first[1].length;
    var ordered = /\d/.test(first[2]);
    var start = ordered ? parseInt(first[2], 10) : 1;
    var items = [];

    while (i < lines.length) {
      var l = lines[i];
      var m = l.match(LIST_RE);
      if (m && m[1].length === indent && /\d/.test(m[2]) === ordered) {
        items.push({ text: m[3], sub: '' });
        i++;
        continue;
      }
      if (m && m[1].length > indent && items.length) {
        var nested = list(lines, i, ctx);
        items[items.length - 1].sub += nested.html;
        i = nested.i;
        continue;
      }
      if (/^\s*$/.test(l)) {
        var j = i + 1;
        while (j < lines.length && /^\s*$/.test(lines[j])) j++;
        var n = j < lines.length && lines[j].match(LIST_RE);
        if (n && n[1].length === indent && /\d/.test(n[2]) === ordered) {
          i = j;
          continue;
        }
        break;
      }
      if (!m && items.length && (/^\s+\S/.test(l) || !isBlockStart(l, lines[i + 1]))) {
        items[items.length - 1].text += ' ' + l.trim();
        i++;
        continue;
      }
      break;
    }

    var tag = ordered ? 'ol' : 'ul';
    var html = '<' + tag + (ordered && start !== 1 ? ' start="' + start + '"' : '') + '>' +
      items.map(function (it) { return '<li>' + inline(it.text, ctx) + it.sub + '</li>'; }).join('') +
      '</' + tag + '>';
    return { html: html, i: i };
  }

  /**
   * Rend du Markdown en HTML.
   * ctx : { pages: Map, slug: string, offset: décalage des niveaux de titres,
   *         seen: Map d'identifiants, headings: tableau rempli avec les titres,
   *         noIds: true pour ne pas générer d'identifiants (aperçus) }
   */
  function render(md, ctx) {
    ctx = ctx || {};
    var lines = md.replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    var m;

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) {
        i++;
        continue;
      }

      // Bloc de code
      if ((m = line.match(/^```\s*([\w+#.-]*)\s*(?:title=(\S+))?\s*$/))) {
        var buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(codeBlock(buf.join('\n'), m[1], m[2]));
        continue;
      }

      // Encadré
      if ((m = line.match(/^:::(tip|info|note|warning|danger)\b\s*(.*)$/))) {
        var inner = [];
        var inFence = false;
        i++;
        while (i < lines.length) {
          if (/^```/.test(lines[i])) inFence = !inFence;
          if (!inFence && /^:::\s*$/.test(lines[i])) break;
          inner.push(lines[i++]);
        }
        i++;
        out.push(callout(m[1], m[2].trim(), render(inner.join('\n'), ctx), ctx));
        continue;
      }

      // Titre
      if ((m = line.match(HEADING_RE))) {
        var level = Math.min(m[1].length + (ctx.offset || 0), 6);
        var text = m[2];
        var plain = text.replace(/[`*]/g, '').replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, function (x, s, l) { return l || s; });
        if (ctx.noIds) {
          out.push('<h' + level + '>' + inline(text, ctx) + '</h' + level + '>');
        } else {
          var id = uniqueId(ctx.seen || (ctx.seen = newSeen()), m[3] || slugify(text));
          if (ctx.headings) ctx.headings.push({ level: m[1].length, id: id, text: plain });
          out.push('<h' + level + ' id="' + id + '" class="heading">' + inline(text, ctx) +
            '<a class="heading-anchor" href="#/' + ctx.slug + '/' + id + '" aria-label="Lien direct vers « ' +
            escapeHTML(plain) + ' »">#</a></h' + level + '>');
        }
        i++;
        continue;
      }

      // Séparateur
      if (/^-{3,}\s*$/.test(line)) {
        out.push('<hr>');
        i++;
        continue;
      }

      // Tableau
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        var rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        out.push(table(rows, ctx));
        continue;
      }

      // Citation
      if (/^>/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
        out.push('<blockquote>' + render(quote.join('\n'), ctx) + '</blockquote>');
        continue;
      }

      // Liste
      if (LIST_RE.test(line)) {
        var res = list(lines, i, ctx);
        out.push(res.html);
        i = res.i;
        continue;
      }

      // Paragraphe
      var para = [line.trim()];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i], lines[i + 1])) {
        para.push(lines[i++].trim());
      }
      out.push('<p>' + inline(para.join(' '), ctx) + '</p>');
    }
    return out.join('\n');
  }

  /**
   * Découpe un document en sections (une par titre), en attribuant les mêmes
   * identifiants que render. Utilisé par la recherche.
   */
  function sections(md, seen) {
    var lines = md.replace(/\r\n?/g, '\n').split('\n');
    // Le texte avant le premier titre forme une section sans identifiant
    var cur = { level: 1, id: null, title: '', lines: [], preamble: true };
    var list = [cur];
    var inFence = false;
    lines.forEach(function (line) {
      if (/^```/.test(line)) inFence = !inFence;
      var m = !inFence && line.match(HEADING_RE);
      if (m) {
        cur = {
          level: m[1].length,
          id: uniqueId(seen, m[3] || slugify(m[2])),
          title: m[2].replace(/[`*]/g, '').replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, function (x, s, l) { return l || s; }),
          lines: []
        };
        list.push(cur);
        return;
      }
      cur.lines.push(line);
    });
    // Contenu complet : jusqu'au prochain titre de niveau inférieur ou égal
    list.forEach(function (s, idx) {
      var full = s.lines.slice();
      for (var k = idx + 1; !s.preamble && k < list.length && list[k].level > s.level; k++) {
        full.push('#'.repeat(list[k].level) + ' ' + list[k].title);
        full = full.concat(list[k].lines);
      }
      s.own = s.lines.join('\n').trim();
      s.full = full.join('\n').trim();
      delete s.lines;
    });
    return list.filter(function (s) { return !s.preamble || s.own; });
  }

  /** Texte brut d'un morceau de Markdown (pour l'indexation et les extraits). */
  function plainText(md, pages) {
    var code = [];
    var text = md
      .replace(/^```[^\n]*\n([\s\S]*?)^```\s*$/gm, function (m, c) {
        code.push(c);
        return ' ';
      })
      .replace(/\{#[\w-]+\}/g, '')
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, function (m, slug, label) {
        var p = pages && pages.get(slug.trim());
        return label || (p ? p.title : slug);
      })
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^:::\w*\s*/gm, '')
      .replace(/^#{2,4}\s+/gm, '')
      .replace(/^\|[\s:|-]+\|?\s*$/gm, '')
      .replace(/[`*|>]/g, ' ')
      .replace(/^\s*(?:[-+]|\d+[.)])\s+/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    return { text: text, code: code.join('\n') };
  }

  G.md = {
    render: render,
    inline: inline,
    sections: sections,
    plainText: plainText,
    slugify: slugify,
    fold: fold,
    escapeHTML: escapeHTML,
    newSeen: newSeen,
    uniqueId: uniqueId
  };
})();
