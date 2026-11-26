/* ACHORADO — viaje.js → ACH.viaje (v0.10): pasar de una página a otra del mismo artefacto (index.html ↔ miraflores.html).
   Lo que viaja ({to, from, carry, extra, t}) va en localStorage y, de respaldo, en el #hash de la URL (puede que no haya almacenamiento).
   También guarda el progreso de niveles ('achorado.progreso.v1') y, si la cima no está cargada, el de distritos ('achorado.distritos.v1',
   el mismo formato de cima.js). Todo con try/catch: sin almacenamiento funciona en memoria. Ver V010.md. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var KEY = 'achorado.viaje.v1', PKEY = 'achorado.progreso.v1', DKEY = 'achorado.distritos.v1';
  var PAGES = { main: 'index.html', miraflores: 'miraflores.html', costaverde: 'costaverde.html', barranco: 'barranco.html' };   // costaverde: COSTAVERDE.md · barranco: BARRANCO.md (§7.3)
  var MAX_AGE = 10 * 60 * 1000, MAX_HASH = 6000;
  var NAMES = { main: 'el mapa', miraflores: 'Miraflores', costaverde: 'el Malecón', barranco: 'Barranco', gambetta: 'la Gambetta', cerro: 'el Cerro' };
  var memProg = null, going = false, lastRec = null;   // v0.13: lastRec = el viaje que llegó a esta página (game.js lo lee para {continuar})

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* nada */ } }
  function parse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  // Esta página: Miraflores define ACH.nivel.id; la principal no tiene ACH.nivel.
  function here() { var id = ACH.nivel && ACH.nivel.id; return (id && id !== 'main' && PAGES[id]) ? id : 'main'; }

  /* ---- cartel «Viajando a …» (estilo chicha; inline para no depender del CSS) ---- */
  function overlay(to, extra) {
    try {
      var d = document.createElement('div');
      d.className = 'vj-over';
      d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#131015;';
      var dest = (extra && extra.nivel && NAMES[extra.nivel]) || NAMES[to] || to;   // v0.11: extra.nivel = el nivel de la página principal
      var label = extra && extra.mapa ? 'Volviendo al mapa…' : extra && extra.titulo ? 'Volviendo al título…' : extra && extra.continuar ? 'De vuelta a ' + dest + '…' : 'Viajando a ' + dest + '…';   // v0.13
      d.innerHTML = '<div style="font-family:Bungee,\'Arial Black\',Impact,sans-serif;color:#ff2e88;font-size:min(7vw,64px);line-height:1;' +
        'text-shadow:.06em .06em 0 #ffe500,.12em .12em 0 #1fe07a;transform:rotate(-2deg);padding:.4em .6em;border:4px solid #ff2e88;' +
        'box-shadow:8px 8px 0 #ffe500;background:#131015;text-align:center">' + label + '</div>';
      (document.body || document.documentElement).appendChild(d);
    } catch (e) { /* nada */ }
  }

  // go(to, carry, extra): guarda el viaje y navega a PAGES[to] (con el #hash de respaldo si cabe)
  function go(to, carry, extra) {
    if (going) return false;
    var page = PAGES[to]; if (!page) { try { console.warn('[viaje] página desconocida: ' + to); } catch (e) { /* nada */ } return false; }
    going = true;
    var rec = { to: to, from: here(), carry: carry || null, extra: extra || {}, t: Date.now(), prog: progSnap(), dist: distSnap() };   // v0.12: el progreso también viaja (iOS sin almacenamiento)
    var json = '';
    try { json = JSON.stringify(rec); } catch (e) { rec.carry = null; try { json = JSON.stringify(rec); } catch (e2) { json = ''; } }
    if (json) lsSet(KEY, json);
    var url = page;
    try { if (json && json.length <= MAX_HASH) url += '#viaje=' + encodeURIComponent(json); } catch (e) { /* sin hash */ }
    overlay(to, extra);
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    setTimeout(function () {
      try { window.location.href = url; } catch (e) { try { window.location.assign(page); } catch (e2) { going = false; } }
    }, 650);
    return true;
  }

  function valid(r, me) { return r && typeof r === 'object' && r.to === me && typeof r.t === 'number' && Math.abs(Date.now() - r.t) < MAX_AGE; }

  // take(): el viaje que llegó a esta página (primero el hash, después localStorage), o null. Lo borra.
  function take() {
    var me = here(), rec = null, h = '';
    try { h = window.location.hash || ''; } catch (e) { h = ''; }
    var m = /[#&]viaje=([^&]*)/.exec(h);
    if (m) {
      try { rec = parse(decodeURIComponent(m[1])); } catch (e) { rec = null; }
      try { if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + location.search); else location.hash = ''; } catch (e) { /* nada */ }
    }
    var st = parse(lsGet(KEY));
    if (!valid(rec, me)) rec = valid(st, me) ? st : null;
    if (st && (valid(st, me) || !valid(st, st && st.to))) lsDel(KEY);   // el de esta página o uno vencido
    if (!rec) return null;
    mergeProg(rec.prog); mergeDist(rec.dist);   // v0.12
    lastRec = { from: rec.from || null, carry: rec.carry || null, extra: rec.extra || {} };
    return { from: lastRec.from, carry: lastRec.carry, extra: lastRec.extra };
  }

  /* ---- progreso de niveles ---- */
  function loadProg() {
    if (memProg) return memProg;
    var d = parse(lsGet(PKEY));
    memProg = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
    return memProg;
  }
  // v0.11: quien ya jugó el Cerro (o Miraflores) ya salió de la Gambetta
  function progress() { var p = loadProg(), o = {}; for (var k in p) o[k] = p[k]; if (o.cerro || o.miraflores) o.gambetta = true; return o; }
  function setDone(id) {
    if (!id) return progress();
    var p = loadProg(); p[id] = true;
    try { lsSet(PKEY, JSON.stringify(p)); } catch (e) { /* queda en memoria */ }
    return progress();
  }

  /* ---- v0.12: el progreso viaja dentro del registro (el #hash sobrevive aunque no haya almacenamiento) ---- */
  function progSnap() { var p = loadProg(), o = {}; for (var k in p) if (p[k] === true) o[k] = true; return o; }
  function distSnap() {
    try { if (ACH.cima && typeof ACH.cima.progress === 'function') { var c = ACH.cima.progress(true); return { visited: c.visited, unlocked: c.unlocked }; } } catch (e) { /* respaldo */ }
    var d = parse(lsGet(DKEY)); return (d && typeof d === 'object') ? { visited: Array.isArray(d.visited) ? d.visited : [], unlocked: Array.isArray(d.unlocked) ? d.unlocked : [] } : null;
  }
  function mergeProg(o) {
    if (!o || typeof o !== 'object') return;
    var p = loadProg(), ch = false;
    for (var k in o) if (o[k] === true && /^[a-z-]{2,20}$/.test(k) && !p[k]) { p[k] = true; ch = true; }
    if (ch) lsSet(PKEY, JSON.stringify(p));
  }
  function mergeDist(d) {
    if (!d || typeof d !== 'object') return;
    try { if (ACH.cima && typeof ACH.cima.merge === 'function') { ACH.cima.merge(d); return; } } catch (e) { /* respaldo */ }
    var o = parse(lsGet(DKEY)); if (!o || typeof o !== 'object') o = {};
    var v = Array.isArray(o.visited) ? o.visited : [], u = Array.isArray(o.unlocked) ? o.unlocked : ['miraflores'];
    (d.visited || []).forEach(function (id) { if (ORDEN.indexOf(id) >= 0 && v.indexOf(id) < 0) v.push(id); });
    (d.unlocked || []).forEach(function (id) { if (ORDEN.indexOf(id) >= 0 && u.indexOf(id) < 0) u.push(id); });
    lsSet(DKEY, JSON.stringify({ visited: v, unlocked: u }));
  }

  /* ---- distritos (respaldo cuando cima.js no está): visited + unlocked, el siguiente de ORDEN ---- */
  var ORDEN = ['miraflores', 'barranco', 'chorrillos', 'surquillo', 'san-isidro', 'lince', 'magdalena', 'san-miguel', 'jesus-maria', 'pueblo-libre', 'brena', 'la-victoria', 'cercado', 'rimac'];
  function visitDistrict(id) {
    try { if (ACH.cima && typeof ACH.cima.markVisited === 'function') return ACH.cima.markVisited(id); } catch (e) { /* cae al respaldo */ }
    var d = parse(lsGet(DKEY)); if (!d || typeof d !== 'object') d = {};
    var v = Array.isArray(d.visited) ? d.visited.slice() : [], u = Array.isArray(d.unlocked) ? d.unlocked.slice() : ['miraflores'];
    if (v.indexOf(id) < 0) v.push(id);
    if (u.indexOf(id) < 0) u.push(id);
    var nx = ORDEN[ORDEN.indexOf(id) + 1]; if (nx && u.indexOf(nx) < 0 && (id !== 'miraflores' || loadProg().costaverde) && (id !== 'barranco' || loadProg().barranco)) u.push(nx);   // v0.12: Miraflores tiene 2 niveles · BARRANCO.md: Chorrillos se abre recién al ganar Barranco
    try { lsSet(DKEY, JSON.stringify({ visited: v, unlocked: u })); } catch (e) { /* nada */ }
    return { visited: v, unlocked: u };
  }

  ACH.viaje = { KEY: KEY, PAGES: PAGES, go: go, take: take, progress: progress, setDone: setDone, visitDistrict: visitDistrict, here: here,
    last: function () { return lastRec; } };   // v0.13
})();
