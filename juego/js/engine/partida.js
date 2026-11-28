/* ACHORADO v0.13 — js/engine/partida.js → ACH.partida (G1, contrato V013.md §2): la partida guardada y el menú del título.
   Ranura única localStorage['achorado.partida.v1'] = {v:1, page:'main'|'miraflores'|'costaverde', level, restIdx, cp, carry, dif, difState, ts, prog, dist}
     level: 'gambetta' | 'cerro' | 'mapa' (página principal) · 'miraflores' · 'costaverde'.  cp: punto de control de Costa Verde (ACH.cv.checkpoint().id).
   API: save(G, o) · load() · has() · clear() · info() → {name, ago, label} · canSave(G) · tick(G, dt) (autoguardado cada 30 s)
        o = {force, level, page, restIdx, carry, fresh}: force guarda aunque no se pueda ahora (al ganar, con el siguiente nivel como destino;
        fresh = ese nivel todavía no empezó: CONTINUAR lo abre con su intro / llegada de siempre).
   Nunca guarda en 'dead', en 'cine', con la pelea de un jefe ni sin vida: se queda el último bueno.
   Sin almacenamiento, todo vive en memoria (la partida dura lo que dure la pestaña).
   Título (solo si la página trae #ttlMenu, o sea index.html): CONTINUAR · PARTIDA NUEVA (confirmación + 3 tarjetas de dificultad) · MAPA DE LIMA.
   Lo de afuera (ACH.game, ACH.dif, ACH.viaje, ACH.cima, ACH.cv, ACH.mira) se llama siempre protegido. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var KEY = 'achorado.partida.v1', AUTO_EVERY = 30;
  var NAMES = { gambetta: 'La Gambetta', cerro: 'El Cerro', mapa: 'Mapa de Lima', miraflores: 'Parque Kennedy', costaverde: 'Costa Verde', barranco: 'Barranco' };
  var PAGEOF = { gambetta: 'main', cerro: 'main', mapa: 'main', miraflores: 'miraflores', costaverde: 'costaverde', barranco: 'barranco' };   // Barranco (QA): CONTINUAR vuelve a barranco.html, en su punto de control
  var mem = null, autoT = 0;

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* nada */ } }
  function parse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function fnOk(o, f) { return !!(o && typeof o[f] === 'function'); }
  function call(o, f, a, b) { if (!fnOk(o, f)) return undefined; try { return o[f](a, b); } catch (e) { try { console.warn('[partida] ' + f, e); } catch (x) { /* nada */ } return undefined; } }
  function G0() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function sfx(n) { call(ACH.audio, 'emit', n); }

  /* ---------------- ¿se puede guardar ahora? ---------------- */
  // Pelea de jefe: la jefa de Miraflores (ACH.mira.jefa.state 'pelea'/'muriendo') o el chef de Costa Verde (ACH.cv.chef 'entrada'/'pelea'/'muriendo').
  // Si dificultad.js publica bossFight(G), también cuenta.
  function bossActive(G) {
    if (call(ACH.dif, 'bossFight', G) === true) return true;
    try {
      var J = ACH.mira && ACH.mira.jefa;
      if (J && !J.dead && (J.state === 'pelea' || J.state === 'muriendo')) return true;
      var C = ACH.cv && ACH.cv.chef;
      if (C && !C.dead && (C.state === 'entrada' || C.state === 'pelea' || C.state === 'muriendo')) return true;
    } catch (e) { /* nada */ }
    return false;
  }
  function canSave(G) {
    G = G || G0();
    if (!G || !G.player) return false;
    var s = G.state;
    if (s === 'paused') { if (G.resumeTo && G.resumeTo !== 'playing') return false; }
    else if (s !== 'playing' && s !== 'base') return false;
    if (!(G.player.hp > 0)) return false;
    try { if (ACH.cv && fnOk(ACH.cv, 'frozen') && ACH.cv.frozen()) return false; } catch (e) { /* nada */ }
    if (bossActive(G)) return false;
    return true;
  }

  /* ---------------- Guardar / leer ---------------- */
  function hereLevel() {
    var h = call(ACH.game, 'hereId');
    if (h) return h;
    var id = ACH.nivel && ACH.nivel.id;
    return (id && PAGEOF[id]) ? id : 'gambetta';
  }
  function distSnap() { var c = call(ACH.cima, 'progress', true); return c ? { visited: c.visited, unlocked: c.unlocked } : null; }
  function build(G, o) {
    var level = o.level || hereLevel(), cp = null;
    if (level === 'costaverde' && !o.level) {
      var c = call(ACH.cv, 'checkpoint'); cp = c && c.id ? c.id : null;
      if (cp === 'borde' && !flag('costaverde.chef')) cp = 'arena';   // el borde lo pone el chef al morir: sin la bandera (T2), al volver el chef está de nuevo
    }
    if (level === 'barranco' && !o.level) { var cb = call(ACH.br, 'checkpoint'); cp = cb && cb.id ? cb.id : null; }   // punto de control de Barranco (ACH.br.checkpoint().id)
    var carry = o.carry !== undefined ? o.carry : call(ACH.game, 'carryState');
    return {
      v: 1, page: o.page || PAGEOF[level] || 'main', level: level, restIdx: o.restIdx != null ? o.restIdx | 0 : (G && G.restIdx) | 0, cp: cp,
      carry: carry || null, dif: call(ACH.dif, 'get') || 'achorado', difState: call(ACH.dif, 'state') || null,
      fresh: !!o.fresh, ts: Date.now(), prog: call(ACH.viaje, 'progress') || null, dist: distSnap(),
      flags: flagsFor(level)
    };
  }
  /* ---- v0.13 T2 (arquitecto): banderas de progreso dentro de un nivel (jefe vencido, sobreviviente rescatado…) ----
     flag('cv.chef', true) marca; flag('cv.chef') lee. Solo valen al CONTINUAR (continuando()): en una visita nueva al nivel
     (partida nueva, rejugar desde el mapa) arrancan vacías. Claves con prefijo del nivel: gambetta.* cerro.* miraflores.* costaverde.* */
  var FL = null, cont = false;
  function continuando() {
    if (cont) return true;
    var lv = call(ACH.viaje, 'last');
    return !!(lv && lv.extra && lv.extra.continuar);
  }
  var FLc = false;   // QA-2 v0.13: FL se armó ya sabiendo que se CONTINÚA. game.js init() hace resetWorld() ANTES de viaje.take(): en Kennedy el 1.er reset veía continuando()=false y dejaba FL={} (la jefa vencida revivía al CONTINUAR)
  function flagsInit() { var c = continuando(); if (FL && (FLc || !c)) return; var r = c ? load() : null; FL = (r && r.flags) ? JSON.parse(JSON.stringify(r.flags)) : {}; FLc = c; }
  function flag(k, v) { flagsInit(); if (v === undefined) return FL[k]; FL[k] = v; return v; }
  function flagsFor(level) { flagsInit(); var o = {}, pre = String(level) + '.'; for (var k in FL) if (k.indexOf(pre) === 0) o[k] = FL[k]; return o; }
  function markContinue() { cont = true; FL = null; flagsInit(); }   // game.continuar() en la misma página
  function freshLevel(level) { flagsInit(); var pre = String(level) + '.'; for (var k in FL) if (k.indexOf(pre) === 0) delete FL[k]; cont = false; }
  function write(rec) {
    var json = '';
    try { json = JSON.stringify(rec); } catch (e) { json = ''; }
    if (!json) return false;
    mem = parse(json);   // copia limpia en memoria (por si no hay almacenamiento)
    lsSet(KEY, json);
    return true;
  }
  function save(G, o) {
    G = G || G0(); o = o || {};
    if (!o.force && !canSave(G)) return false;
    var rec; try { rec = build(G, o); } catch (e) { try { console.warn('[partida] build', e); } catch (x) { /* nada */ } return false; }
    autoT = 0;
    return write(rec);
  }
  function valid(r) { return !!(r && typeof r === 'object' && r.v === 1 && PAGEOF[r.level] && typeof r.ts === 'number'); }
  function load() {
    var r = parse(lsGet(KEY));
    if (!valid(r)) r = null;
    if (valid(mem) && (!r || mem.ts > r.ts)) r = mem;   // si el almacenamiento falló al escribir, la de memoria es más nueva
    if (r && !PAGEOF[r.page]) r.page = PAGEOF[r.level];
    return r;
  }
  function has() { return !!load(); }
  function clear() { mem = null; lsDel(KEY); autoT = 0; FL = {}; cont = false; }
  // El progreso guardado vuelve al mapa (si se perdió aparte)
  function mergeProg(r) {
    if (!r) return;
    try {
      var cur = call(ACH.viaje, 'progress') || {};
      if (r.prog) for (var k in r.prog) if (r.prog[k] === true && !cur[k]) call(ACH.viaje, 'setDone', k);
      if (r.dist) call(ACH.cima, 'merge', r.dist);
    } catch (e) { /* nada */ }
  }
  function ago(ts) {
    var m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return T('recién');
    if (m < 60) return T('hace {n} min', { n: m });
    var h = Math.round(m / 60); if (h < 24) return T('hace {n} h', { n: h });
    var d = Math.round(h / 24); return T(d === 1 ? 'hace {n} día' : 'hace {n} días', { n: d });
  }
  function T(s, v) { return ACH.t ? ACH.t(s, v) : String(s).replace(/\{(\w+)\}/g, function (x, k) { return v && v[k] != null ? v[k] : x; }); }   // v0.16: idioma.js
  function info() { var r = load(); if (!r) return null; var n = T(NAMES[r.level] || r.level), a = ago(r.ts); return { name: n, ago: a, label: n + ' · ' + a, level: r.level, page: r.page }; }

  // Autoguardado cada 30 s de juego (game.js lo llama en 'playing')
  function tick(G, dt) { autoT += dt || 0; if (autoT >= AUTO_EVERY) { autoT = 0; save(G); } }
  function onHide() { try { save(G0()); } catch (e) { /* nada */ } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) onHide(); });
  window.addEventListener('pagehide', onHide);

  /* ---------------- Dificultad: con respaldo si dificultad.js todavía no está ---------------- */
  var DMODOS = ['tranqui', 'achorado', 'bravazo'];
  var DNOM = { tranqui: 'TRANQUI', achorado: 'ACHORADO', bravazo: 'BRAVAZO' };
  var DDESC = { tranqui: 'Para pasear: los zombis pegan menos y no pierdes nada al morir.',
    achorado: 'Como manda el barrio: al morir se te cae la mitad de la bolsa.',
    bravazo: 'Pa\' los duros: pegan más fuerte, aguantan más y al morir lo pierdes todo.' };
  function modos() { var m = ACH.dif && ACH.dif.MODOS; return (m && m.length) ? m : DMODOS; }
  function difGet() { var m = call(ACH.dif, 'get'); return modos().indexOf(m) >= 0 ? m : 'achorado'; }
  function difSet(m) { if (fnOk(ACH.dif, 'set')) call(ACH.dif, 'set', m); else difMem = m; }
  var difMem = 'achorado';
  function difName(m) { return call(ACH.dif, 'nombre', m) || DNOM[m] || String(m).toUpperCase(); }
  function difDesc(m) { return call(ACH.dif, 'desc', m) || DDESC[m] || ''; }
  ACH.difUI = { modos: modos, get: function () { return fnOk(ACH.dif, 'get') ? difGet() : difMem; }, set: difSet, nombre: difName, desc: difDesc };

  /* ---------------- Menú del título (index.html: #ttlMenu) ---------------- */
  var T = { built: false, host: null, poster: null, view: 'menu', sel: 0, rows: [], difSel: 1 };
  function el(tag, cls, parent, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function debugOn() { var g = G0(); return !!(g && g.debugOn) || /[?&]debug=1\b/.test(location.search || ''); }
  function menuOn() { return !!document.getElementById('ttlMenu'); }
  function titleState() { var g = G0(); return !!g && g.state === 'title'; }
  function tBtn(label, sub, fn, cls, parent, id) {
    var b = el('button', 'ttl-btn' + (cls ? ' ' + cls : ''), parent || T.host, null);
    b.type = 'button'; b.tabIndex = -1; b.setAttribute('data-ui', '');
    if (id) b.id = id;
    el('span', 'ttl-l', b, label);
    if (sub) el('small', 'ttl-s', b, sub);
    var i = T.rows.length; T.rows.push({ b: b, fn: fn });
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); tFocus(i); tAct(i); b.blur(); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') tFocus(i); });
    b.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    return b;
  }
  function keyHint(b) { var s = b && b.querySelector ? b.querySelector('.ttl-s') : null; if (s) s.classList.add('ttl-keyhint'); return b; }   // v0.13 fix: «tecla 3» no sale en el celu (css: body.touch .ttl-keyhint)
  function tFocus(i) {
    if (!T.rows.length) return;
    T.sel = (i + T.rows.length) % T.rows.length;
    T.rows.forEach(function (r, k) { r.b.classList.toggle('f', k === T.sel); });
    if (T.view === 'dif') { var m = T.rows[T.sel].mode; if (m) { T.difSel = modos().indexOf(m); var d = T.host.querySelector('.ttl-ddesc'); if (d) d.textContent = difDesc(m); } }
  }
  function tAct(i) { var r = T.rows[i]; if (!r || typeof r.fn !== 'function') return; sfx('ui.ok'); try { r.fn(); } catch (e) { try { console.warn('[partida] título', e); } catch (x) { /* nada */ } } }
  function tGo(v) { T.view = v; T.sel = 0; renderTitle(); }
  function renderTitle() {
    var host = document.getElementById('ttlMenu'); if (!host) return;
    T.host = host; T.poster = host.closest ? host.closest('.poster') : host.parentNode;
    if (T.poster) T.poster.setAttribute('data-ttl', T.view);
    host.innerHTML = ''; T.rows = [];
    var GM = ACH.game;
    if (T.view === 'confirm') {
      el('p', 'ttl-ask', host, '¿Empezar de cero? Se borra tu mochila y en qué nivel ibas. Tu árbol de melodías y tu cuarto se quedan.');
      var r = el('div', 'ttl-row', host);
      tBtn('SÍ, DE CERO', null, function () { tGo('dif'); }, '', r);
      tBtn('NO', null, function () { tGo('menu'); }, 'alt', r);
      T.sel = 1;   // por si acaso, el foco arranca en NO
    } else if (T.view === 'dif') {
      el('p', 'ttl-kick', host, 'ESCOGE TU DIFICULTAD');
      var cards = el('div', 'ttl-cards', host), cur = 'achorado';
      modos().forEach(function (m) {
        var b = tBtn(difName(m), m === 'achorado' ? 'recomendado' : null, function () { newGame(m); }, 'ttl-card', cards);
        b.setAttribute('data-mode', m); T.rows[T.rows.length - 1].mode = m;
      });
      el('p', 'ttl-ddesc', host, '');
      tBtn('◀ VOLVER', null, function () { tGo('menu'); }, 'alt ttl-back', host);
      T.sel = Math.max(0, modos().indexOf(cur));
    } else {
      var inf = info();
      if (inf) tBtn('CONTINUAR', inf.label, function () { if (!call(GM, 'continuar')) { renderTitle(); } }, 'ttl-main', host, 'ttlCont');
      tBtn('PARTIDA NUEVA', null, function () { if (has()) tGo('confirm'); else tGo('dif'); }, inf ? '' : 'ttl-main', host, 'ttlNew');
      if (call(GM, 'mapReady')) keyHint(tBtn('MAPA DE LIMA', 'tecla 3', function () { call(GM, 'titleMap'); }, '', host, 'ttlMap'));
      if (ACH.saltos && fnOk(ACH.saltos, 'on') && ACH.saltos.on()) tBtn('PROBAR NIVEL', 'prueba', function () { call(ACH.saltos, 'open', 'titulo'); }, 'alt', host, 'ttlSaltos');   // TEMPORAL: saltos.js (ACH.cfg.saltos)
      if (debugOn() && ACH.levels && ACH.levels.cerro) keyHint(tBtn('NIVEL 2: EL CERRO', 'tecla 2 · prueba', function () { call(GM, 'titleLevel', 'cerro'); }, 'alt', host, 'ttlLvl2'));
      langBtn(host);
      T.sel = 0;
    }
    tFocus(T.sel);
  }
  /* v0.16: IDIOMA en el título (ENTER o ←/→ lo cambian). El subtítulo nombra «idioma» en los otros dos idiomas, para que se encuentre sin leer español. */
  var LANG_WORD = { es: 'IDIOMA', en: 'LANGUAGE', ja: '言語' };
  function langBtn(host) {
    var I = ACH.i18n; if (!I) return;
    var cur = I.get(), sub = I.LANGS.filter(function (L) { return L.id !== cur; }).map(function (L) { return LANG_WORD[L.id]; }).join(' · ');
    var b = tBtn(LANG_WORD[cur] + ': ' + I.nombre(), sub, function () { langStep(1); }, 'alt ttl-lang', host, 'ttlLang');
    b.setAttribute('translate', 'no');
    T.rows[T.rows.length - 1].lang = true;
  }
  function langStep(d) {
    if (!ACH.i18n) return;
    ACH.i18n.cycle(d); renderTitle();
    for (var i = 0; i < T.rows.length; i++) if (T.rows[i].lang) { tFocus(i); break; }
  }
  function newGame(m) { difSet(m); clear(); T.view = 'menu'; call(ACH.game, 'newGame', m); }
  function onTitleKey(e) {
    if (!menuOn() || !titleState() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.code === 'F3') { setTimeout(function () { if (titleState() && T.view === 'menu') renderTitle(); }, 60); return; }
    if (ACH.cima && fnOk(ACH.cima, 'active') && ACH.cima.active()) return;
    if (!T.rows.length) renderTitle();
    var c = e.code || e.key, used = true, horiz = T.view !== 'menu';
    if (!horiz && T.rows[T.sel] && T.rows[T.sel].lang && (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'KeyA' || c === 'KeyD')) {   // v0.16: ←/→ en IDIOMA
      if (!e.repeat) { sfx('ui.ok'); langStep(c === 'ArrowLeft' || c === 'KeyA' ? -1 : 1); }
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (c === 'ArrowUp' || c === 'KeyW' || (horiz && (c === 'ArrowLeft' || c === 'KeyA'))) tFocus(T.sel - 1);
    else if (c === 'ArrowDown' || c === 'KeyS' || c === 'Tab' || (horiz && (c === 'ArrowRight' || c === 'KeyD'))) tFocus(T.sel + 1);
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { if (!e.repeat) { try { if (ACH.audio && ACH.audio.unlock) ACH.audio.unlock(); } catch (x) { /* nada */ } tAct(T.sel); } }
    else if (c === 'Escape' && T.view !== 'menu') { if (!e.repeat) { sfx('ui.back'); tGo('menu'); } }
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  window.addEventListener('keydown', onTitleKey, true);
  // game.js: en cada cambio de estado
  function onState(s) { if (s === 'title' && menuOn()) { T.view = 'menu'; renderTitle(); } }

  ACH.partida = { KEY: KEY, save: save, load: load, has: has, clear: clear, info: info, canSave: canSave, tick: tick, mergeProg: mergeProg,
    bossActive: bossActive, onState: onState, menuOn: menuOn, renderTitle: renderTitle, titleView: function () { return T.view; },
    NAMES: NAMES, PAGEOF: PAGEOF, flag: flag, continuando: continuando, markContinue: markContinue, freshLevel: freshLevel };

  /* ---------------- Debug (QA) ---------------- */
  ACH.debug = ACH.debug || {};
  ACH.debug.partida = {
    load: load, has: has, clear: clear, info: info, canSave: function () { return canSave(G0()); },
    save: function (force) { return save(G0(), { force: !!force }); },
    raw: function () { return lsGet(KEY); }, mem: function () { return mem; },
    title: function () { return { view: T.view, rows: T.rows.map(function (r) { return r.b.textContent; }), sel: T.sel }; }
  };
})();
