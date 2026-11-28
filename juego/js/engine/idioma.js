/* ACHORADO v0.16 — js/engine/idioma.js → ACH.i18n: idioma del juego (ESPAÑOL por defecto · ENGLISH · 日本語). Contrato: IDIOMAS.md.
   - El texto fuente es el español de siempre: los diccionarios (js/idiomas/*.js) van de «texto en español» → traducción.
     Lo que no está en el diccionario se queda en español (nunca se rompe nada, solo falta traducir).
   - ACH.i18n.t('SEGUIR') → 'RESUME'. Con variables: t('hace {n} min', {n: 5}) → '5 min ago'.
   - Traducción automática del DOM: un MutationObserver sobre <body> traduce cada nodo de texto (y aria-label / title)
     cuyo texto entero esté en el diccionario. Si no está entero, prueba por partes: «A · B · C» (cada trozo) y «ETIQUETA: VALOR».
     Así el HTML estático de las 4 páginas y los menús que arman los .js (pausa, título, toasts, táctil) se traducen sin tocarlos.
     Para no traducir algo: atributo translate="no" (o data-no-i18n) en el elemento o en un ancestro.
   - Guardado: localStorage['achorado.opciones.v1'].idioma (vía ACH.opciones si ya cargó, para no pisar sus otras claves).
     ?lang=en|ja|es en la URL fuerza el idioma (no se guarda): sirve para QA.
   - Japonés: <html lang="ja"> → css/idioma.css agrega fuentes japonesas a las pilas (Bungee/Patrick Hand no tienen kana ni kanji);
     las de Google Fonts se piden solo al escoger 日本語, y sin red cae a la fuente japonesa del sistema.
   API: ACH.i18n = { LANGS, get(), set(id), cycle(d), nombre(id?), t(s, vars), tr(s), add(id, dict), on(fn), refresh(), has(s) } */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var KEY = 'achorado.opciones.v1';
  var LANGS = [{ id: 'es', nombre: 'ESPAÑOL' }, { id: 'en', nombre: 'ENGLISH' }, { id: 'ja', nombre: '日本語' }];
  var DICT = { es: {}, en: {}, ja: {} };
  var fns = [], has = Object.prototype.hasOwnProperty;

  function valid(id) { return id === 'es' || id === 'en' || id === 'ja'; }
  function stored() {
    try { var o = JSON.parse(window.localStorage.getItem(KEY) || 'null'); if (o && valid(o.idioma)) return o.idioma; } catch (e) { /* sin localStorage */ }
    return 'es';
  }
  var forced = (function () { var m = /[?&]lang=(es|en|ja)\b/.exec(location.search || ''); return m ? m[1] : null; })();
  var cur = forced || stored();

  function save(id) {
    if (ACH.opciones && typeof ACH.opciones.set === 'function') { try { ACH.opciones.set('idioma', id); return; } catch (e) { /* abajo */ } }
    try { var o = JSON.parse(window.localStorage.getItem(KEY) || '{}') || {}; o.idioma = id; window.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* memoria */ }
  }

  /* ---------------- Traducción de cadenas ---------------- */
  function look(s) { var d = DICT[cur]; return cur !== 'es' && d && has.call(d, s) ? d[s] : null; }
  function fill(r, v) { return v ? String(r).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }) : r; }
  function t(s, v) { if (s == null) return s; var r = look(s); return fill(r == null ? s : r, v); }
  function labelVal(p) {   // 'PAUSA CON P: SÍ' → 'PAUSE WITH P: YES' (solo si la etiqueta está en el diccionario)
    var k = /^([^:]+?): (.+)$/.exec(p); if (!k) return null;
    var a = look(k[1]); if (a == null) return null;
    var b = look(k[2]);
    return a + (cur === 'ja' ? '：' : ': ') + (b == null ? k[2] : b);
  }
  // tr(texto) → traducción (conserva los espacios de los bordes) o null si no hay nada que traducir
  function tr(s) {
    if (cur === 'es' || s == null) return null;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core) return null;
    var r = look(core);
    if (r == null && core.indexOf('·') >= 0) {
      var hit = false, parts = core.split(/(\s*·\s*)/).map(function (p, i) {
        if (i % 2 || !p) return p;
        var x = look(p); if (x == null) x = labelVal(p);
        if (x != null) { hit = true; return x; }
        return p;
      });
      if (hit) r = parts.join('');
    }
    if (r == null) r = labelVal(core);
    return r == null ? null : m[1] + r + m[3];
  }

  /* ---------------- DOM ---------------- */
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CANVAS: 1 };
  var ATTRS = ['aria-label', 'title', 'placeholder'];
  function skipEl(e) { return !e || SKIP[e.nodeName] || (e.closest && e.closest('[translate="no"],[data-no-i18n]')); }
  // cada nodo recuerda su texto en español (__esSrc) y lo que le pusimos (__esOut): si el juego le cambia el texto, ese es el nuevo original
  function doText(n) {
    if (skipEl(n.parentNode)) return;
    var src = (n.__esOut != null && n.data === n.__esOut) ? n.__esSrc : n.data;
    var out = tr(src);
    n.__esSrc = src;
    if (out == null || out === src) { n.__esOut = null; if (n.data !== src) n.data = src; }
    else { n.__esOut = out; if (n.data !== out) n.data = out; }
  }
  function doAttr(e, a) {
    if (!e.hasAttribute || !e.hasAttribute(a) || skipEl(e)) return;
    var M = e.__esA || (e.__esA = {}), v = e.getAttribute(a), rec = M[a];
    var src = rec && rec.out != null && v === rec.out ? rec.src : v;
    var out = tr(src);
    M[a] = { src: src, out: out };
    var want = out == null ? src : out;
    if (v !== want) e.setAttribute(a, want);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    ATTRS.forEach(function (a) { doAttr(root, a); });
    if (root.closest && root.closest('[translate="no"],[data-no-i18n]')) return;
    var tw = document.createTreeWalker(root, 5 /* ELEMENT | TEXT */, null), n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else if (n.attributes && n.attributes.length) ATTRS.forEach(function (a) { doAttr(n, a); });
    }
  }
  var obs = null;
  function onMut(list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  }
  function startObs() {
    if (obs || !document.body || typeof MutationObserver === 'undefined') return;
    obs = new MutationObserver(onMut);
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------------- Fuentes japonesas (solo si se escoge 日本語) ---------------- */
  var jaFonts = false;
  function loadJaFonts() {
    if (jaFonts || !document.head) return; jaFonts = true;
    try {
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@500;800&display=swap';
      document.head.appendChild(l);
    } catch (e) { /* sin red: fuente del sistema */ }
  }

  var pend = false;
  function refresh() {
    pend = false;
    var h = document.documentElement; if (h) h.lang = cur;
    if (cur === 'ja') loadJaFonts();
    if (document.body) { walk(document.body); if (obs) obs.takeRecords(); startObs(); }
  }
  function later() { if (pend) return; pend = true; (window.queueMicrotask || function (f) { setTimeout(f, 0); })(refresh); }

  function set(id) {
    if (!valid(id)) return cur;
    forced = null;
    var prev = cur; cur = id; save(id);
    if (id !== prev) {
      refresh();
      try { if (ACH.ui && ACH.ui.refresh) ACH.ui.refresh(); } catch (e) { /* ui-v014: la «cara» de los títulos (data-t) copia el texto */ }
      fns.forEach(function (f) { try { f(id, prev); } catch (e) { /* nada */ } });
    }
    return cur;
  }
  function cycle(d) { var i = 0; LANGS.forEach(function (L, k) { if (L.id === cur) i = k; }); return set(LANGS[(i + (d || 1) + LANGS.length) % LANGS.length].id); }
  function nombre(id) { var r = ''; LANGS.forEach(function (L) { if (L.id === (id || cur)) r = L.nombre; }); return r; }
  function add(id, d) {
    if (!DICT[id] || !d) return;
    for (var k in d) if (has.call(d, k)) DICT[id][k] = d[k];
    if (id === cur) later();
  }

  ACH.i18n = { LANGS: LANGS, KEY: KEY, get: function () { return cur; }, set: set, cycle: cycle, nombre: nombre, t: t, tr: tr, add: add,
    on: function (f) { if (typeof f === 'function') fns.push(f); }, refresh: refresh, has: function (s) { return look(s) != null; },
    dict: function (id) { return DICT[id || cur]; } };
  ACH.t = t;

  if (document.body) refresh(); else document.addEventListener('DOMContentLoaded', refresh);

  /* ---------------- Debug (QA) ---------------- */
  ACH.debug = ACH.debug || {};
  ACH.debug.idioma = function (id) { if (id) set(id); return { idioma: cur, claves: Object.keys(DICT[cur] || {}).length }; };
})();
