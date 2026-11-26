/* ACHORADO v0.13 — js/engine/objetivo.js → ACH.objetivo (contrato V013-T2.md §1, agente U · G4).
     set(texto)                 la línea de objetivo del HUD (arriba al centro, discreta). '' / null la esconde.
     get()                      el texto actual.
     diario(id, titulo, texto)  agrega una entrada al DIARIO de la pausa, una sola vez por id (true si es nueva). Pistas de la cura: ids 'cura-*'.
     entradas()                 copia de las entradas [{id, titulo, texto, ts, cura}] en orden de llegada.
     nivel(id)                  pone el objetivo por defecto de ese nivel (game.js lo llama en resetWorld, ANTES de ACH.nivel.reset y de los
                                levelHooks: lo que pongan los agentes de nivel en su reset / levelHook gana).
     nuevaPartida()             PARTIDA NUEVA: diario vacío.
   Persiste en localStorage['achorado.diario.v1'] = {v:1, e:[...], obj:{nivel: texto}} (respaldo en memoria). Se carga antes que hud.js:
   el DOM se crea cuando hace falta. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var KEY = 'achorado.diario.v1';
  var DEFAULTS = {
    gambetta: 'Llega al cerro: al este por la Gambetta, hasta la escalera',
    cerro: 'Sube el cerro hasta la cruz de arriba',
    miraflores: 'Cruza el Parque Kennedy hasta la Calle de las Pizzas',
    costaverde: 'Baja por la Costa Verde: del faro a Larcomar'
  };
  var mem = null, cur = '', el = null, flashTO = 0;

  function read() {
    if (mem) return mem;
    var o = null;
    try { var s = window.localStorage.getItem(KEY); o = s ? JSON.parse(s) : null; } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || !Array.isArray(o.e)) o = { v: 1, e: [] };
    mem = o; return mem;
  }
  function write() { try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* queda en memoria */ } }

  function dom() {
    if (el) return el;
    var st = document.getElementById('stage'); if (!st) return null;
    el = document.createElement('div');
    el.id = 'objLine'; el.className = 'objline'; el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<b>OBJETIVO</b><span></span>';
    st.appendChild(el);
    return el;
  }
  function paint(flash) {
    var d = dom(); if (!d) return;
    d.lastChild.textContent = cur;
    d.classList.toggle('has', !!cur);
    if (flash && cur) {
      d.classList.remove('nuevo'); void d.offsetWidth; d.classList.add('nuevo');
      clearTimeout(flashTO); flashTO = setTimeout(function () { if (el) el.classList.remove('nuevo'); }, 2600);
    }
  }

  function set(texto) {
    var t = texto == null ? '' : String(texto);
    if (t === cur) return false;
    cur = t; paint(true);
    return true;
  }
  function nivel(id) { var t = DEFAULTS[id]; if (t) { cur = ''; set(t); } return t || null; }

  function diario(id, titulo, texto, opts) {
    if (!id) return false;
    var o = read(); id = String(id);
    for (var i = 0; i < o.e.length; i++) if (o.e[i].id === id) return false;
    var cura = id.indexOf('cura-') === 0;
    o.e.push({ id: id, titulo: String(titulo || ''), texto: String(texto || ''), ts: Date.now() });
    write();
    if (!(opts && opts.quiet)) try { if (ACH.hud && ACH.hud.toast) ACH.hud.toast(cura ? 'DIARIO · pista de la cura: ' + (titulo || '') : 'DIARIO · ' + (titulo || '')); } catch (e) { /* nada */ }
    return true;
  }
  function entradas() {
    return read().e.map(function (x) { return { id: x.id, titulo: x.titulo, texto: x.texto, ts: x.ts, cura: x.id.indexOf('cura-') === 0 }; });
  }
  function nuevaPartida() { mem = { v: 1, e: [] }; write(); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { paint(false); }); else setTimeout(function () { paint(false); }, 0);

  ACH.objetivo = { set: set, get: function () { return cur; }, diario: diario, entradas: entradas, nivel: nivel, nuevaPartida: nuevaPartida, DEFAULTS: DEFAULTS, KEY: KEY };
})();
