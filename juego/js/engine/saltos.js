/* ACHORADO — js/engine/saltos.js → ACH.saltos: «PROBAR NIVEL» (TEMPORAL, para que la dueña pruebe cada distrito rápido).
   Un selector chico: CALLAO · MIRAFLORES (Parque Kennedy) · COSTA VERDE (Malecón) · BARRANCO · VOLVER.
   Sale en el menú de pausa (ACH.pausa.addItem, order 57) en las 4 páginas y en el título de index.html (partida.js lo pide con ACH.saltos.open).
   El salto es un viaje normal (ACH.viaje.go): la mochila / vida / árbol viajan como siempre; no marca niveles ganados ni abre el mapa.
     Callao  → index.html con extra.nivel = 'gambetta' (game.js init → revisit: la Gambetta desde su inicio, sin título ni mapa).
     Otros   → su página con extra.from = 'salto' (llegada normal del nivel, desde su inicio).
   Escoger el nivel de esta misma página lo reinicia (misma página: el viaje deja el #hash y se recarga).
   Desde el título no hay partida en juego: se lleva la mochila de la partida guardada (si hay).
   APAGAR: ACH.cfg.saltos = false (abajo, línea DEFAULT) — o quitar los <script src="js/engine/saltos.js"> de las 4 páginas. Ver diseno/saltos.md.
   Se carga ANTES de partida.js: su teclado (en captura) va primero que el del título y el de la pausa. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.cfg = ACH.cfg || {};
  if (ACH.cfg.saltos === undefined) ACH.cfg.saltos = true;   // DEFAULT: false = sin «PROBAR NIVEL» en ningún lado

  var LEVELS = [
    { id: 'main', label: 'CALLAO', sub: 'La Gambetta' },
    { id: 'miraflores', label: 'MIRAFLORES', sub: 'Parque Kennedy' },
    { id: 'costaverde', label: 'COSTA VERDE', sub: 'Malecón' },
    { id: 'barranco', label: 'BARRANCO', sub: null }
  ];
  var over = null, rows = [], sel = 0, from = null, busy = false;

  function on() { return !!(ACH.cfg && ACH.cfg.saltos); }
  function fnOk(o, f) { return !!(o && typeof o[f] === 'function'); }
  function call(o, f, a, b) { if (!fnOk(o, f)) return undefined; try { return o[f](a, b); } catch (e) { try { console.warn('[saltos] ' + f, e); } catch (x) { /* nada */ } return undefined; } }
  function sfx(n) { call(ACH.audio, 'emit', n); }
  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function here() { return call(ACH.viaje, 'here') || 'main'; }
  function el(tag, cls, parent, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function stop(e) { e.stopPropagation(); }

  /* ---------------- El salto ---------------- */
  function basename() { var p = ''; try { p = location.pathname || ''; } catch (e) { p = ''; } return p.slice(p.lastIndexOf('/') + 1); }
  function carry() {
    var g = G(), s = g && g.state;
    if (s && s !== 'title') { var k = call(ACH.game, 'carryState'); if (k) return k; }
    var r = call(ACH.partida, 'load');   // desde el título: la mochila de la partida guardada
    return (r && r.carry) || null;
  }
  function jump(to) {
    var V = ACH.viaje;
    if (busy || !V || !fnOk(V, 'go') || !(V.PAGES && V.PAGES[to])) return false;
    var k = carry();
    var ex = to === 'main' ? { nivel: 'gambetta', from: 'salto', salto: true } : { from: 'salto', salto: true };
    try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (e) { /* nada */ }
    busy = true;
    if (V.go(to, k, ex) === false) { busy = false; return false; }
    close(true);
    // misma página: location.href solo cambia el #hash (no recarga) → recargar con el #viaje= puesto
    if (basename() === V.PAGES[to]) setTimeout(function () { try { location.reload(); } catch (e) { /* nada */ } }, 750);
    return true;
  }

  /* ---------------- El selector ---------------- */
  function render() {
    var box = over.querySelector('.pz');
    box.innerHTML = ''; rows = [];
    var me = here();
    LEVELS.forEach(function (L) {
      var t = L.label + (L.sub ? ' · ' + L.sub : '') + (L.id === me && from !== 'titulo' ? '  (reiniciar)' : '');
      btn(t, function () { jump(L.id); }, '', 'sl-' + L.id);
    });
    btn('◀ VOLVER', function () { sfx('ui.back'); close(); }, 'alt', 'sl-volver');
    focus(0);
  }
  function btn(label, fn, cls, id) {
    var b = el('button', 'pz-btn' + (cls ? ' ' + cls : ''), over.querySelector('.pz'), label);
    b.type = 'button'; b.tabIndex = -1; b.setAttribute('data-ui', ''); b.id = id;
    var i = rows.length; rows.push({ b: b, fn: fn });
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); focus(i); act(i); b.blur(); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') focus(i); });
  }
  function focus(i) { if (!rows.length) return; sel = (i + rows.length) % rows.length; rows.forEach(function (r, k) { r.b.classList.toggle('f', k === sel); }); }
  function act(i) { var r = rows[i]; if (!r) return; if (i < rows.length - 1) sfx('ui.ok'); try { r.fn(); } catch (e) { try { console.warn('[saltos]', e); } catch (x) { /* nada */ } } }
  function build() {
    if (over) return over;
    var st = document.getElementById('stage') || document.body;
    over = el('div', 'screen dim sl-over', st); over.id = 'slOver'; over.setAttribute('data-ui', '');
    over.style.zIndex = '60';
    var p = el('div', 'poster small', over);
    el('h2', null, p, 'PROBAR NIVEL');
    el('p', 'pz-note', p, 'Solo para probar: salta al inicio del nivel con tu mochila.');
    var box = el('div', 'pz', p); box.style.marginTop = 'calc(var(--u) * 4)';
    ['mousedown', 'pointerdown', 'touchstart', 'click', 'contextmenu'].forEach(function (t) { over.addEventListener(t, stop, t === 'touchstart' ? { passive: true } : false); });
    return over;
  }
  function isOpen() { return !!(over && over.classList.contains('on')); }
  function open(src) {
    if (!on() || busy) return false;
    from = src || 'pausa';
    build(); render();
    over.classList.add('on');
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    return true;
  }
  function close(keepBusy) {
    if (!over) return false;
    over.classList.remove('on');
    if (!keepBusy) busy = false;
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    return true;
  }

  /* ---------------- Teclado (en captura, registrado antes que partida.js / pausa.js / input.js) ---------------- */
  window.addEventListener('keydown', function (e) {
    if (!isOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    var c = e.code || e.key;
    if (c === 'ArrowUp' || c === 'KeyW' || c === 'ArrowLeft' || c === 'KeyA') focus(sel - 1);
    else if (c === 'ArrowDown' || c === 'KeyS' || c === 'Tab' || c === 'ArrowRight' || c === 'KeyD') focus(sel + 1);
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { if (!e.repeat) act(sel); }
    else if (c === 'Escape' || c === 'Backspace' || c === 'KeyP') { if (!e.repeat) { sfx('ui.back'); close(); } }
    if (/^F\d+$/.test(c)) return;   // F3 (debug), F11…
    e.preventDefault(); e.stopImmediatePropagation();   // con el selector abierto nadie más ve el teclado
  }, true);

  /* ---------------- Pausa: «PROBAR NIVEL» ---------------- */
  function hook() {
    if (!on() || !fnOk(ACH.pausa, 'addItem')) return;
    ACH.pausa.addItem({ id: 'saltos', label: 'PROBAR NIVEL', order: 57, onClick: function () { open('pausa'); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else setTimeout(hook, 0);

  ACH.saltos = { on: on, open: open, close: close, isOpen: isOpen, jump: jump, LEVELS: LEVELS, from: function () { return from; } };
})();
