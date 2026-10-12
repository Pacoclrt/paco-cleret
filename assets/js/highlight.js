/*
 * Coloration syntaxique légère pour Go, le terminal et JSON.
 * Produit des <span class="tok-…"> stylés par assets/css/style.css.
 */
(function () {
  'use strict';

  var G = (window.GoDoc = window.GoDoc || {});

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return '<span class="tok-' + cls + '">' + esc(text) + '</span>';
  }

  function words(list) {
    var set = new Set();
    list.split(' ').forEach(function (w) { set.add(w); });
    return set;
  }

  var KEYWORDS = words('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var');
  var TYPES = words('bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16 uint32 uint64 uintptr any comparable');
  var BUILTINS = words('append cap clear close complex copy delete imag len make max min new panic print println real recover');
  var CONSTANTS = words('true false iota nil');

  var GO_TOKEN = new RegExp([
    '\\/\\/[^\\n]*',                                   // commentaire ligne
    '\\/\\*[\\s\\S]*?\\*\\/',                           // commentaire bloc
    '`[^`]*`',                                          // chaîne brute
    '"(?:[^"\\\\\\n]|\\\\.)*"',                         // chaîne interprétée
    "'(?:[^'\\\\\\n]|\\\\.)+'",                         // rune
    '\\b0[xX][0-9a-fA-F_]+\\b',                         // hexadécimal
    '\\b0[bB][01_]+\\b',                                // binaire
    '\\b0[oO][0-7_]+\\b',                               // octal
    '(?:\\b\\d[\\d_]*(?:\\.[\\d_]*)?|\\.\\d[\\d_]*)(?:[eE][+-]?\\d+)?i?\\b', // décimal
    '[A-Za-z_\\u00C0-\\u024F][\\w\\u00C0-\\u024F]*',    // identifiant
    ':=|<-|\\.\\.\\.|&&|\\|\\||\\+\\+|--|&\\^=?|<<=?|>>=?|[-+*/%&|^<>=!]=?', // opérateurs
    '[{}()\\[\\];,.:~]'                                 // ponctuation
  ].join('|'), 'g');

  var STRING_INNER = /(\\(?:[abfnrtv\\'"]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|[0-7]{3})|%[-+# 0]*(?:\*|\d+)?(?:\.(?:\*|\d+))?(?:\[\d+\])?[a-zA-Z%])/g;

  function goString(tok) {
    // Met en valeur les séquences d'échappement et les verbes de formatage
    return '<span class="tok-s">' + esc(tok).replace(STRING_INNER, '<span class="tok-se">$1</span>') + '</span>';
  }

  function highlightGo(src) {
    var out = '';
    var last = 0;
    var m;
    var prevSignificant = '';
    GO_TOKEN.lastIndex = 0;
    while ((m = GO_TOKEN.exec(src))) {
      var tok = m[0];
      var start = m.index;
      if (start > last) out += esc(src.slice(last, start));
      last = GO_TOKEN.lastIndex;
      var c = tok.charAt(0);

      if (tok.indexOf('//') === 0 || tok.indexOf('/*') === 0) {
        out += span('c', tok);
        continue; // un commentaire ne change pas le contexte
      } else if (c === '"') {
        out += goString(tok);
      } else if (c === '`') {
        out += span('s', tok);
      } else if (c === "'") {
        out += goString(tok);
      } else if (/[0-9]/.test(c) || (c === '.' && tok.length > 1)) {
        out += span('n', tok);
      } else if (/[A-Za-z_À-ɏ]/.test(c)) {
        var next = src.charAt(last);
        if (KEYWORDS.has(tok)) out += span('k', tok);
        else if (CONSTANTS.has(tok)) out += span('b', tok);
        else if (TYPES.has(tok) && prevSignificant !== '.') out += span('t', tok);
        else if (BUILTINS.has(tok) && next === '(' && prevSignificant !== '.') out += span('bi', tok);
        else if (next === '(' || (next === '[' && prevSignificant === 'func')) out += span('f', tok);
        else if (prevSignificant === '.') out += span('pr', tok);
        else if (/^[A-Z]/.test(tok)) out += span('ty', tok);
        else out += esc(tok);
      } else if (/[{}()[\];,.:~]/.test(c) && tok.length === 1) {
        out += span('p', tok);
      } else {
        out += span('o', tok);
      }
      prevSignificant = tok;
    }
    if (last < src.length) out += esc(src.slice(last));
    return out;
  }

  /* Terminal : commandes, options, chaînes, variables et commentaires. */
  function highlightShell(src) {
    return src.split('\n').map(function (line) {
      var out = '';
      var expectCommand = true;
      var re = /(\s+)|(#.*$)|("(?:[^"\\]|\\.)*")|('[^']*')|(\|\||&&|[|;&<>])|(\S+)/g;
      var m;
      while ((m = re.exec(line))) {
        if (m[1]) { out += m[1]; continue; }
        if (m[2]) { out += span('c', m[2]); continue; }
        if (m[3] || m[4]) { out += span('s', m[3] || m[4]); expectCommand = false; continue; }
        if (m[5]) { out += span('o', m[5]); expectCommand = true; continue; }
        var w = m[6];
        if (expectCommand && /^[A-Z_][A-Z0-9_]*=/.test(w)) {
          out += span('v', w); // VAR=valeur avant la commande
        } else if (expectCommand) {
          out += span('f', w);
          expectCommand = false;
        } else if (/^--?[\w-]/.test(w)) {
          out += span('k', w);
        } else if (/^\$/.test(w)) {
          out += span('v', w);
        } else {
          out += esc(w);
        }
      }
      return out;
    }).join('\n');
  }

  function highlightJSON(src) {
    var re = /"(?:[^"\\]|\\.)*"(\s*:)?|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:true|false|null)\b/g;
    return esc(src).replace(re, function (tok, colon) {
      if (tok.charAt(0) === '"') {
        if (colon) return '<span class="tok-ty">' + tok.slice(0, tok.length - colon.length) + '</span>' + colon;
        return '<span class="tok-s">' + tok + '</span>';
      }
      if (/^(true|false|null)$/.test(tok)) return '<span class="tok-b">' + tok + '</span>';
      return '<span class="tok-n">' + tok + '</span>';
    });
  }

  G.highlight = function (code, lang) {
    switch (lang) {
      case 'go':
        return highlightGo(code);
      case 'bash':
      case 'sh':
      case 'shell':
        return highlightShell(code);
      case 'json':
        return highlightJSON(code);
      default:
        return esc(code);
    }
  };
})();
