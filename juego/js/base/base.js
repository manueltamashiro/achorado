/* ACHORADO v0.11 — js/base/base.js (agente D1): el cuarto de Alexander en la azotea del Callao (V011.md §5).
   Escena aparte en su propio lienzo encima del juego (#stage), con su bucle (rAF solo mientras está abierta) y sus teclas propias
   (oyentes en captura que solo actúan mientras está abierta; el keyup pasa, para que el juego no se quede con teclas pegadas).
   Mundo: rejilla de 12 columnas × 12 filas de 16 px. Fila 0 = pared del fondo (ahí van los muebles de tipo 'pared'; la ventana ocupa
   las columnas 8–9). Filas 1–7 = piso del cuarto. Entre la fila 7 y la 8 está el murito del frente con la puerta (columnas 5–6).
   Filas 8–11 = la azotea (tanque, cordel, fierros y la escalera «BAJAR A LA CALLE» en la columna 11, fila 11).
   API (extiende ACH.base de catalogo.js, no la reemplaza):
     enter({onExit}) · exit() · isOpen() · give(id, n) → bool · owned(id) → n · icon(id, size) → lienzo · state() → resumen QA
     ACH.debug.v011.base = { state, giveAll(n), clear(), open() }
   Guardado: localStorage['achorado.base.v1'] = { v:1, puestos:[{uid,id,c,r,rot,off?}], almacen:{id:n}, baules:{uid:[{id,n}|null]},
     armeros:{uid:[{id,dur,max}|null ×4]}, radio:bool, visto:bool, uidN } (sin almacenamiento: en memoria).
   Arte: ACH.sprites.base.* (D2, js/base/arte-base.js). Lo que falte se reemplaza con dibujos horneados de aquí (bloques con nombre).
   Sin getImageData, shadowBlur, filter ni degradados por cuadro: el cuarto, la luz (mapa horneado, 2 versiones si hay guirnalda),
   la neblina y los fantasmas verde/rojo se hornean y se recomponen solo cuando algo cambia. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var B = ACH.base = ACH.base || {};
  var KEY = 'achorado.base.v1';
  // Geometría (de arriba abajo, como el arte de D2): azotea (filas 8–11, y −102…−38) · pared del fondo del cuarto (fila −1 = «fila de
  // pared», banda de 38 px: tapa 6 + ladrillo 32, y −38…0) con la puerta en la columna 11 y la ventana en las 1–2 · piso del cuarto
  // (filas 0–7, y 0…128). Los muebles guardan {c, r} en estas filas.
  var T = 16, COLS = 12, ROOM_ROWS = 8, AZ_R0 = 8, AZ_ROWS = 4, WALL_R = -1;
  var BAND_TOP = -38, AZ_TOP = BAND_TOP - AZ_ROWS * T, ROOM_BOT = ROOM_ROWS * T;
  var WIN_C = [1, 2], DOOR_C = 11;
  var SX0 = -16, SY0 = AZ_TOP - 60, SW = COLS * T + 32, SH = ROOM_BOT + 10 - (AZ_TOP - 60);   // límites de lo que se dibuja de la escena
  var STAIR = { c: 0, r: 8, w: 2, h: 2 };
  var TANK = { c: 7, r: 8 };
  var STATIC_BLOCK = { '0,8': 1, '1,8': 1, '0,9': 1, '1,9': 1, '7,8': 1, '8,8': 1, '7,9': 1, '8,9': 1, '11,8': 1, '0,11': 1 };   // escalera, tanque, fierros
  var RESERVED = { '11,0': 1, '10,0': 1, '11,11': 1, '10,11': 1, '2,8': 1, '2,9': 1, '0,10': 1, '1,10': 1 };       // paso de la puerta y de la escalera
  function rowY(r) { return r === WALL_R ? BAND_TOP : r < AZ_R0 ? r * T : AZ_TOP + (r - AZ_R0) * T; }
  function rowOfY(y) {
    if (y >= ROOM_BOT) return 99;
    if (y >= 0) return Math.floor(y / T);
    if (y >= BAND_TOP) return WALL_R;
    if (y >= AZ_TOP) return AZ_R0 + Math.floor((y - AZ_TOP) / T);
    return -99;
  }
  function inRoom(r) { return r >= 0 && r < AZ_R0; }
  function inAz(r) { return r >= AZ_R0 && r < AZ_R0 + AZ_ROWS; }
  var LIFT = { colchon: 4, baulLata: 8, baulMadera: 9, mesa: 10, silla: 12, banquito: 6, estante: 16, radio: 7, cajon: 11, palomar: 18,
    lamparin: 10, baldePlantas: 10, macetaLlanta: 8, retablo: 12, toroPucara: 7, cojines: 4, mesaLuthier: 12 };
  var COL = { colchon: '#7d8aa0', armero: '#6b4a2e', baulLata: '#8f969c', foco: '#e8d9a0', baulMadera: '#8a5a2b', mesa: '#a06a3a', silla: '#d8263a',
    banquito: '#b08048', estante: '#c49a5a', radio: '#5a4a3e', cajon: '#8a4b1d', palomar: '#9a8a6a', guirnalda: '#ff6ad5', lamparin: '#ffb14a',
    aficheChicha: '#ff2e88', banderaBlanquiazul: '#3a6ad8', cuadroGatos: '#e0a050', cuadroMar: '#5a8ab0', cuadroFaro: '#d86a3a',
    baldePlantas: '#4a9a3a', macetaLlanta: '#2a2a2e', retablo: '#e8c040', toroPucara: '#c86a3a', cojines: '#d84a8a', petate: '#c8a870', mantaAndina: '#d8263a', mesaLuthier: "#a07040" };

  /* ---------------- utilidades ---------------- */
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  function ctx2(c) { var g = c.getContext('2d'); g.imageSmoothingEnabled = false; return g; }
  function isCanvas(o) { return !!(o && typeof o === 'object' && typeof o.width === 'number' && o.width > 0 && typeof o.getContext === 'function'); }
  function frameOf(o, i) { if (Array.isArray(o)) { if (!o.length) return null; o = o[((i % o.length) + o.length) % o.length]; } return isCanvas(o) ? o : null; }
  function dig(path) { var o = ACH.sprites, p = path.split('.'); for (var i = 0; i < p.length && o != null; i++) o = o[p[i]]; return o; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return (window.performance && performance.now) ? performance.now() / 1000 : Date.now() / 1000; }
  function sfx(n, d) { try { if (ACH.audio && typeof ACH.audio.emit === 'function') ACH.audio.emit(n, d); } catch (e) { /* el sonido nunca rompe */ } }
  function call(o, f) { try { if (o && typeof o[f] === 'function') return o[f].apply(o, [].slice.call(arguments, 2)); } catch (e) { console.warn('[base] ' + f, e); } return undefined; }
  function CAT() { return B.CATALOGO || {}; }
  function G() { return ACH.G || null; }
  function P() { var g = G(); return g && g.player || null; }
  function hudToast(t) { try { if (ACH.hud && typeof ACH.hud.toast === 'function') ACH.hud.toast(t); } catch (e) { /* nada */ } }
  function plain(s) { return String(s || '').normalize ? String(s).normalize('NFD').replace(/[̀-ͯ]/g, '') : String(s || ''); }
  // arreglos v0.11: las armas sueltas (skate, escoba, inflables) no son objetos de la mochila: su nombre sale de armas.js, no el id en minúscula
  function invKnows(id) { var d = ACH.inv && ACH.inv.defs; return !!(d && d[id]); }
  function itemName(id) {
    var n = invKnows(id) || !(ACH.armas && ACH.armas.defs && ACH.armas.defs[id]) ? call(ACH.inv, 'name', id) : null;
    if (typeof n === 'string' && n && n !== id) return n;
    var d = ACH.armas && ACH.armas.defs && ACH.armas.defs[id]; return (d && d.name ? String(d.name).toUpperCase() : String(id).toUpperCase());
  }
  // arreglos v0.11: ícono real de un arma: sprite de la mochila si existe, si no el sprite del suelto de armas.js; el cuadrado rosa de inventario.js solo como último recurso
  function weaponIcon(id) {
    var it = ACH.sprites && ACH.sprites.items && ACH.sprites.items[id]; if (it && it.width) return it;
    var d = ACH.armas && ACH.armas.defs && ACH.armas.defs[id], s = d && d.spr && frameOf(dig('props.' + d.spr), 0); if (s && s.width) return s;
    if (invKnows(id)) { try { return ACH.inv.icon(id); } catch (e) { /* nada */ } }
    return null;
  }
  function stackOf(id) { var d = ACH.inv && ACH.inv.defs && ACH.inv.defs[id]; return (d && d.stack) || 20; }
  // texto chiquito horneado (fuente a5 de ACH.px; sin ella, fillText)
  function label(g, s, x, y, ink, align) {
    try { if (ACH.px && typeof ACH.px.text === 'function') { ACH.px.text(g, plain(s).toUpperCase(), x, y, { font: 'a5', ink: ink, align: align || 'c' }); return; } } catch (e) { /* abajo */ }
    g.fillStyle = ink; g.font = '6px monospace'; g.textAlign = align === 'l' ? 'left' : 'center'; g.textBaseline = 'top'; g.fillText(plain(s).toUpperCase(), x, y);
  }
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

  /* ---------------- guardado ---------------- */
  var S = null, storeOK = true, memStore = null, saveT = 0;
  function defState() { return { v: 1, puestos: [], almacen: {}, baules: {}, armeros: {}, radio: false, visto: false, uidN: 1 }; }
  function readStore() {
    try { var s = window.localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { storeOK = false; return memStore ? JSON.parse(memStore) : null; }
  }
  function writeStore() {
    if (!S) return;
    var js = JSON.stringify(S);
    try { window.localStorage.setItem(KEY, js); storeOK = true; } catch (e) { storeOK = false; memStore = js; }
  }
  function save() { clearTimeout(saveT); saveT = setTimeout(writeStore, 120); }
  function saveNow() { clearTimeout(saveT); writeStore(); }
  function newUid() { S.uidN = (S.uidN | 0) + 1; return 'm' + S.uidN; }
  function ensure() {
    if (S) return S;
    var raw = readStore();
    S = defState();
    if (raw && raw.v === 1) {
      S.almacen = raw.almacen && typeof raw.almacen === 'object' ? raw.almacen : {};
      S.baules = raw.baules && typeof raw.baules === 'object' ? raw.baules : {};
      S.armeros = raw.armeros && typeof raw.armeros === 'object' ? raw.armeros : {};
      if (Array.isArray(raw.armero) && !Object.keys(S.armeros).length) S.armeros._suelto = raw.armero;   // formato corto del contrato
      S.radio = !!raw.radio; S.visto = !!raw.visto; S.uidN = raw.uidN | 0 || 1;
      var list = Array.isArray(raw.puestos) ? raw.puestos : [];
      rebuildOcc();
      for (var i = 0; i < list.length; i++) {
        var q = list[i]; if (!q || !CAT()[q.id]) continue;
        var chk = canPlace(q.id, q.c | 0, q.r | 0, q.rot ? 1 : 0, null, true);
        if (chk.ok) { S.puestos.push({ uid: q.uid || newUid(), id: q.id, c: q.c | 0, r: q.r | 0, rot: q.rot ? 1 : 0, off: !!q.off }); rebuildOcc(); }
        else addAlmacen(q.id, 1);
      }
    } else {
      placeInitial();
    }
    fixContainers();
    rebuildOcc();
    chooseStage(raw && raw.v === 1 ? raw.escenario : null);   // v0.13 T2: el escenario del concierto
    return S;
  }
  // primera vez: colchón en la esquina, baúl al lado de la cama, percha y foco en la pared
  var INIT_POS = { colchon: [0, 0, 0], baulLata: [2, 0, 0], armero: [4, -1, 0], foco: [7, -1, 0] };
  function placeInitial() {
    rebuildOcc();
    var ini = B.INICIAL || ['colchon', 'armero', 'baulLata', 'foco'];
    for (var i = 0; i < ini.length; i++) {
      var id = ini[i]; if (!CAT()[id]) continue;
      var p = INIT_POS[id], ok = false;
      if (p && canPlace(id, p[0], p[1], p[2], null, true).ok) { S.puestos.push({ uid: newUid(), id: id, c: p[0], r: p[1], rot: p[2] }); ok = true; }
      else { var spot = findSpot(id); if (spot) { S.puestos.push({ uid: newUid(), id: id, c: spot.c, r: spot.r, rot: 0 }); ok = true; } }
      if (!ok) addAlmacen(id, 1);
      rebuildOcc();
    }
  }
  function fixContainers() {
    for (var i = 0; i < S.puestos.length; i++) {
      var q = S.puestos[i], d = CAT()[q.id];
      if (d.baul) { var b = S.baules[q.uid]; if (!Array.isArray(b)) b = S.baules[q.uid] = []; while (b.length < d.baul) b.push(null); }
      if (d.armero) {
        var a = S.armeros[q.uid];
        if (!Array.isArray(a)) { a = S.armeros._suelto || []; delete S.armeros._suelto; S.armeros[q.uid] = a; }
        while (a.length < d.armero) a.push(null);
      }
    }
  }
  function addAlmacen(id, n) { S.almacen[id] = (S.almacen[id] | 0) + n; if (S.almacen[id] <= 0) delete S.almacen[id]; }

  /* ---------------- v0.13 T2 (P · G3): taller del cuarto → ACH.taller ----------------
     La mesa de luthier (CATALOGO.mesaLuthier, taller:true) se compra a Don Pocho; con E en el cuarto abre estas mejoras permanentes.
     Guardado aparte: localStorage['achorado.taller.v1'] = {v:1, m:{id:1}} (sin almacenamiento: en memoria). No se borra con PARTIDA NUEVA (como el cuarto).
     Efectos: mochila → ACH.inv.setSlots(16|20); guitarra/acero/correa → ACH.hab.applyStats() (que lee ACH.taller.has). */
  var TKEY = 'achorado.taller.v1';
  var MEJORAS = [
    { id: 'mochila16', name: 'MOCHILA REMENDADA', precio: 15, desc: 'Bolsillos nuevos cosidos con hilo de pescar. Mochila de 16 casillas.' },
    { id: 'mochila20', name: 'MOCHILA DE COBRADOR', precio: 30, pide: 'mochila16', desc: 'La canguro del cobrador, amarrada al costado. Mochila de 20 casillas.' },
    { id: 'guitarra', name: 'GUITARRA REFORZADA', precio: 20, desc: 'Cinta de embalaje y tablitas por dentro. +30 de durabilidad máxima.' },
    { id: 'acero', name: 'CUERDAS DE ACERO', precio: 35, desc: 'Cuerdas de acero de la cachina. Guitarrazo +0,25 de daño.' },
    { id: 'correa', name: 'CORREA DE CINTURÓN', precio: 25, desc: 'Ya no se resbala del hombro. El guitarrazo se recupera 15 % más rápido.' }
  ];
  var MEJ = {}; MEJORAS.forEach(function (m) { MEJ[m.id] = m; });
  var TS = null, tMem = null;
  function tRead() {
    if (TS) return TS;
    var o = null;
    try { var s = window.localStorage.getItem(TKEY); o = s ? JSON.parse(s) : null; } catch (e) { try { o = tMem ? JSON.parse(tMem) : null; } catch (e2) { o = null; } }
    TS = { v: 1, m: {} };
    if (o && o.m && typeof o.m === 'object') for (var k in o.m) if (MEJ[k] && o.m[k]) TS.m[k] = 1;
    return TS;
  }
  function tWrite() { var js = JSON.stringify(tRead()); try { window.localStorage.setItem(TKEY, js); } catch (e) { tMem = js; } }
  function tHas(id) { return !!tRead().m[id]; }
  function tSlots() { return tHas('mochila20') ? 20 : tHas('mochila16') ? 16 : 12; }
  function tApply() { call(ACH.inv, 'setSlots', tSlots()); call(ACH.hab, 'applyStats'); }
  function coinsNow() { return call(ACH.inv, 'count', 'sencillo') | 0; }
  // → {ok, why}: why = 'no existe' | 'ya' | 'pide' | 'plata' | 'sin mochila'
  function tBuy(id) {
    var m = MEJ[id]; if (!m) return { ok: false, why: 'no existe' };
    if (tHas(id)) return { ok: false, why: 'ya', msg: 'Eso ya lo hiciste, causa.' };
    if (m.pide && !tHas(m.pide)) return { ok: false, why: 'pide', msg: 'Primero la ' + MEJ[m.pide].name.toLowerCase() + '.' };
    if (!ACH.inv || typeof ACH.inv.take !== 'function') return { ok: false, why: 'sin mochila', msg: 'Sin mochila no hay sencillos.' };
    if (coinsNow() < m.precio) return { ok: false, why: 'plata', msg: 'Te faltan ' + (m.precio - coinsNow()) + ' sencillos, causa.' };
    if (!call(ACH.inv, 'take', 'sencillo', m.precio)) return { ok: false, why: 'plata', msg: 'No se pudo sacar la plata.' };
    tRead().m[id] = 1; tWrite(); tApply();
    var G0 = G(); if (G0) call(ACH.inv, 'sync', G0);
    return { ok: true, msg: '¡' + m.name + ' lista! ' + m.desc.replace(/^.*\.\s/, '') };
  }
  ACH.taller = {
    KEY: TKEY, MEJORAS: MEJORAS, has: tHas, buy: tBuy, apply: tApply, slots: tSlots,
    state: function () { return { m: JSON.parse(JSON.stringify(tRead().m)), slots: tSlots(), invSlots: call(ACH.inv, 'slots') || null, mesa: S ? owned('mesaLuthier') : null }; },
    reset: function () { TS = { v: 1, m: {} }; tWrite(); call(ACH.hab, 'applyStats'); return ACH.taller.state(); }   // QA: la mochila no se achica hasta recargar
  };
  try { tApply(); } catch (e) { console.warn('[base] taller', e); }

  /* ---------------- v0.13 T2 (P · G4): el escenario del concierto (esquina del cuarto, 3×1 tiles) ----------------
     Se elige la primera esquina libre y se guarda en S.escenario {c, r}. Bloquea esos tiles (no se ponen muebles ni se camina).
     Las piezas se dibujan si ACH.concierto.tiene(id); las que faltan, como silueta de tiza. */
  var STAGE_W = 3, STAGE_CAND = [[9, 7], [0, 7], [9, 6], [0, 6], [3, 7], [6, 7], [9, 5], [0, 5]];
  var PIEZAS = ['parlante', 'microfono', 'setlist', 'ampli'];
  function stageFree(c, r) {
    for (var x = 0; x < STAGE_W; x++) { var k = (c + x) + ',' + r; if (c + x >= COLS || !inRoom(r) || occ[k] || STATIC_BLOCK[k] || RESERVED[k]) return false; }
    return true;
  }
  function chooseStage(pref) {
    S.escenario = null;
    if (pref && stageFree(pref.c | 0, pref.r | 0)) { S.escenario = { c: pref.c | 0, r: pref.r | 0 }; return; }
    for (var i = 0; i < STAGE_CAND.length; i++) if (stageFree(STAGE_CAND[i][0], STAGE_CAND[i][1])) { S.escenario = { c: STAGE_CAND[i][0], r: STAGE_CAND[i][1] }; return; }
  }
  function stageAt(k) {
    var E = S && S.escenario; if (!E) return false;
    var p = k.split(','), c = +p[0], r = +p[1];
    return r === E.r && c >= E.c && c < E.c + STAGE_W;
  }
  function piezaTiene(id) { try { return !!(ACH.concierto && typeof ACH.concierto.tiene === 'function' && ACH.concierto.tiene(id)); } catch (e) { return false; } }

  /* ---------------- ocupación y reglas para poner ---------------- */
  var occ = null, rug = null, wallOcc = null;
  function dims(id, rot) { var d = CAT()[id] || { w: 1, h: 1 }; return rot && d.w !== d.h && d.tipo !== 'pared' ? { w: d.h, h: d.w } : { w: d.w, h: d.h }; }
  function rebuildOcc() {
    occ = {}; rug = {}; wallOcc = {};
    if (!S) return;
    for (var i = 0; i < S.puestos.length; i++) {
      var q = S.puestos[i], d = CAT()[q.id]; if (!d) continue;
      var m = dims(q.id, q.rot), map = d.tipo === 'pared' ? wallOcc : d.tipo === 'alfombra' ? rug : occ;
      for (var y = 0; y < m.h; y++) for (var x = 0; x < m.w; x++) map[(q.c + x) + ',' + (q.r + y)] = q.uid;
    }
  }
  function playerTiles() {
    if (!bp) return {};
    var o = {}, xs = [bp.x - 4, bp.x + 3], ys = [bp.y - 3, bp.y + 2];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) o[Math.floor(xs[i] / T) + ',' + rowOfY(ys[j])] = 1;
    return o;
  }
  function canPlace(id, c, r, rot, ignoreUid, loading) {
    var d = CAT()[id]; if (!d) return { ok: false, why: 'Eso no es un mueble, causa.' };
    var m = dims(id, rot), x, y, k;
    if (c < 0 || c + m.w > COLS) return { ok: false, why: 'No cabe ahí.' };
    if (d.tipo === 'pared') {
      if (r !== WALL_R) return { ok: false, why: 'Eso va en la pared.' };
      for (x = 0; x < m.w; x++) {
        if (WIN_C.indexOf(c + x) >= 0) return { ok: false, why: 'Ahí está la ventana, causa.' };
        if (c + x === DOOR_C) return { ok: false, why: 'Ahí está la puerta, causa.' };
        k = (c + x) + ',' + WALL_R; if (wallOcc[k] && wallOcc[k] !== ignoreUid) return { ok: false, why: 'Ya hay algo colgado ahí.' };
      }
      return { ok: true };
    }
    if (!((inRoom(r) && inRoom(r + m.h - 1)) || (inAz(r) && inAz(r + m.h - 1)))) return { ok: false, why: r === WALL_R ? 'Eso va en el piso.' : 'No cabe ahí.' };
    var pt = loading ? {} : playerTiles();
    for (y = 0; y < m.h; y++) for (x = 0; x < m.w; x++) {
      k = (c + x) + ',' + (r + y);
      if (STATIC_BLOCK[k]) return { ok: false, why: 'Ahí no se puede.' };
      if (d.tipo === 'alfombra') { if (rug[k] && rug[k] !== ignoreUid) return { ok: false, why: 'Ya hay una alfombra ahí.' }; continue; }
      if (RESERVED[k]) return { ok: false, why: 'Deja libre el paso, causa.' };
      if (stageAt(k)) return { ok: false, why: "Ahí va el escenario del concierto, causa." };
      if (occ[k] && occ[k] !== ignoreUid) return { ok: false, why: 'Ya hay algo ahí.' };
      if (pt[k]) return { ok: false, why: 'Estás parado ahí.' };
    }
    return { ok: true };
  }
  function findSpot(id) {
    var d = CAT()[id]; if (!d) return null;
    if (d.tipo === 'pared') { for (var c = 0; c < COLS; c++) if (canPlace(id, c, WALL_R, 0, null, true).ok) return { c: c, r: WALL_R }; return null; }
    for (var r = 0; r < AZ_R0 + AZ_ROWS; r++) for (var c2 = 0; c2 < COLS; c2++) if (canPlace(id, c2, r, 0, null, true).ok) return { c: c2, r: r };
    return null;
  }
  function puestoAt(tc, tr, wantWall) {
    var best = null;
    for (var i = S.puestos.length - 1; i >= 0; i--) {
      var q = S.puestos[i], d = CAT()[q.id], m = dims(q.id, q.rot);
      if (!d || (wantWall !== undefined && (d.tipo === 'pared') !== wantWall)) continue;
      if (tc >= q.c && tc < q.c + m.w && tr >= q.r && tr < q.r + m.h) { if (!best || CAT()[best.id].tipo === 'alfombra') best = q; }
    }
    return best;
  }

  /* ---------------- sprites de muebles (D2 o reemplazo horneado) ---------------- */
  var phCache = {};
  var VARK = { on: ['on', 'prendida', 'prendido', 'encendida', 'luz'], off: ['off', 'apagada', 'apagado'], play: ['sonando', 'play', 'on', 'prendida'],
    idle: ['idle', 'base', 'quieto', 'off', 'apagada', 'sin', 'vacio'], titina: ['titina', 'con', 'conTitina', 'lleno'] };
  function pickVariant(o, variant, f) {
    if (isCanvas(o)) return o;
    if (Array.isArray(o)) return frameOf(o, variant === 'play' || variant === 'on' || variant === 'titina' ? (o.length > 1 ? 1 + (f | 0) % (o.length - 1) : 0) : (variant === 'b' ? 1 : 0)) || frameOf(o, f | 0);
    if (o && typeof o === 'object') {
      var ks = VARK[variant] || [], i, c;
      for (i = 0; i < ks.length; i++) if (o[ks[i]] != null) { c = frameOf(o[ks[i]], f | 0); if (c) return c; }
      if (o.frames) { c = frameOf(o.frames, f | 0); if (c) return c; }
      var fb = ['idle', 'off', 'apagada', 'base', 'sin', 'on', 'prendida'];
      for (i = 0; i < fb.length; i++) if (o[fb[i]] != null) { c = frameOf(o[fb[i]], f | 0); if (c) return c; }
    }
    return null;
  }
  function d2Mueble(id, rot, variant, f) {
    var M = dig('base.muebles'); if (!M) return null;
    var SB = ACH.sprites.base;
    if (SB && typeof SB.get === 'function') {   // D2: B.get(id, {rot, on, frame, sonando, titina})
      if (rot && !M[id + '_r']) return null;
      var g0 = null;
      try { g0 = SB.get(id, { rot: rot ? 1 : 0, on: variant === 'on', frame: (f | 0) % 2 ? 2 : 1, sonando: variant === 'play', titina: variant === 'titina' }); } catch (e) { g0 = null; }
      if (isCanvas(g0) && !g0.placeholder) return g0;
    }
    var o = rot ? M[id + '_r'] : M[id];
    var c = o != null ? pickVariant(o, variant, f) : null;
    return c && !c.placeholder ? c : null;
  }
  function mueble(id, rot, variant, f) { return d2Mueble(id, rot, variant, f) || phMueble(id, rot, variant, f | 0); }
  function d2HasTitina(id) {
    if (dig('base.muebles.' + id + '_titina')) return true;
    var o = dig('base.muebles.' + id); if (!o || isCanvas(o)) return false;
    if (Array.isArray(o)) return o.length > 1;
    for (var i = 0; i < VARK.titina.length; i++) if (o[VARK.titina[i]] != null) return true;
    return false;
  }
  function d2Ready() { var M = dig('base.muebles'); return !!(M && typeof M === 'object' && Object.keys(M).length); }

  function phMueble(id, rot, variant, f) {
    var d = CAT()[id] || { tipo: 'piso', w: 1, h: 1, name: id };
    var key = id + '|' + (rot ? 1 : 0) + '|' + (variant || '') + '|' + (variant === 'on' && d.parpadea ? f % 2 : 0);
    if (phCache[key]) return phCache[key];
    var m = dims(id, rot), W = m.w * T, col = COL[id] || '#9a8a7a', c, g, lift;
    if (d.tipo === 'alfombra') {
      c = mk(W, m.h * T); g = ctx2(c);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(1, 2, W - 1, m.h * T - 2);
      g.fillStyle = col; g.fillRect(1, 1, W - 2, m.h * T - 3);
      if (id === 'petate') { g.fillStyle = '#a88850'; for (var y = 2; y < m.h * T - 3; y += 3) g.fillRect(2, y, W - 4, 1); for (var x = 3; x < W - 3; x += 4) g.fillRect(x, 2, 1, m.h * T - 6); }
      else { var st = ['#ffe500', '#1fe07a', '#ff2e88', '#3a6ad8', '#ffe500']; for (var k = 0; k < 5; k++) { g.fillStyle = st[k]; if (rot) g.fillRect(3 + k * Math.floor((W - 6) / 5), 1, 2, m.h * T - 3); else g.fillRect(1, 3 + k * Math.floor((m.h * T - 7) / 5), W - 2, 1); } }
      g.fillStyle = '#f2e8c8'; for (var fx = 2; fx < W - 2; fx += 2) { g.fillRect(fx, 0, 1, 1); g.fillRect(fx, m.h * T - 2, 1, 1); }
    } else if (d.tipo === 'pared') {
      c = mk(W, T); g = ctx2(c);
      drawWallPH(g, id, W, col, variant, f);
    } else {
      lift = LIFT[id] || 8;
      var depth = Math.max(6, m.h * T - 5), H = depth + lift;
      c = mk(W, H + 1); g = ctx2(c);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(1, H - 2, W - 1, 3);                    // sombra
      drawFloorPH(g, id, W, depth, lift, col, variant, f, rot);
      var nm = plain(d.name || id).split(/[\s:]+/).filter(function (w) { return w.length > 2; })[0] || id;
      if (!d.palomar && id !== 'colchon') label(g, nm.slice(0, Math.max(3, Math.floor(W / 4))), W / 2, Math.max(1, Math.floor(depth / 2) - 2), '#141216', 'c');
    }
    c.placeholder = true; c.phOf = id;
    phCache[key] = c; return c;
  }
  function box(g, x, y, w, depth, lift, top, front) {
    g.fillStyle = '#141216'; g.fillRect(x, y, w, depth + lift);
    g.fillStyle = top; g.fillRect(x + 1, y + 1, w - 2, depth - 1);
    g.fillStyle = front; g.fillRect(x + 1, y + depth, w - 2, lift - 1);
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    function h2(v) { v = Math.max(0, Math.min(255, Math.round(v * f))); return ('0' + v.toString(16)).slice(-2); }
    return '#' + h2(r) + h2(gg) + h2(b);
  }
  function drawFloorPH(g, id, W, depth, lift, col, variant, f, rot) {
    var top = shade(col, 1.15), front = shade(col, 0.7), H = depth + lift;
    if (id === 'colchon') {
      box(g, 0, 0, W, depth, lift, '#8a96ab', '#5d6678');
      g.fillStyle = '#6f7a8e'; for (var x = 4; x < W - 2; x += 5) g.fillRect(x, 2, 1, depth - 3);
      g.fillStyle = '#e8e0cc'; g.fillRect(rot ? 2 : 2, 2, rot ? W - 4 : 8, rot ? 6 : depth - 3);              // almohada
      g.fillStyle = '#7a5a3a'; g.fillRect(Math.floor(W * 0.55), 4, 4, 3);                                    // mancha de humedad
      return;
    }
    if (id === 'palomar') {
      g.fillStyle = '#5a4430'; g.fillRect(Math.floor(W / 2) - 1, 6, 2, H - 6);                               // palo
      box(g, 2, 0, W - 4, 4, 8, '#b84a3a', '#c8b48a');                                                      // casita
      g.fillStyle = '#141216'; g.fillRect(Math.floor(W / 2) - 2, 6, 4, 4);                                   // huequito
      if (variant === 'titina') { g.fillStyle = '#9aa0a6'; g.fillRect(Math.floor(W / 2) - 2, 5, 4, 4); g.fillStyle = '#ff7a2e'; g.fillRect(Math.floor(W / 2) + 2, 7, 1, 1); g.fillStyle = '#141216'; g.fillRect(Math.floor(W / 2), 6, 1, 1); }
      return;
    }
    if (id === 'lamparin') {
      box(g, 3, depth - 2, W - 6, 2, lift - 2, '#8a6a3a', '#5a4428');
      g.fillStyle = variant === 'off' ? '#8a8578' : '#ffd27a'; g.fillRect(5, depth - 7, W - 10, 6);
      g.fillStyle = '#141216'; g.fillRect(4, depth - 8, W - 8, 1);
      return;
    }
    if (id === 'silla') {
      box(g, 2, 0, W - 4, depth - 4, 4, '#e83a4a', '#b8202e'); g.fillStyle = '#b8202e'; g.fillRect(3, depth, 2, lift - 2); g.fillRect(W - 5, depth, 2, lift - 2);
      return;
    }
    if (id === 'mesa' || id === 'banquito') {
      box(g, 0, 0, W, depth, 3, top, front); g.fillStyle = front; g.fillRect(2, depth + 3, 2, lift - 4); g.fillRect(W - 4, depth + 3, 2, lift - 5);
      return;
    }
    box(g, 0, 0, W, depth, lift, top, front);
    if (id === 'baulLata' || id === 'baulMadera') { g.fillStyle = shade(col, 0.5); g.fillRect(1, depth + 2, W - 2, 1); g.fillStyle = '#ffe500'; g.fillRect(Math.floor(W / 2) - 1, depth + 1, 2, 3); }
    if (id === 'estante') { g.fillStyle = shade(col, 0.5); for (var y = depth + 4; y < H - 1; y += 5) g.fillRect(1, y, W - 2, 1); }
    if (id === 'radio') { g.fillStyle = '#d8c8a0'; g.fillRect(2, depth + 1, 4, lift - 3); g.fillStyle = variant === 'play' ? '#1fe07a' : '#3a3430'; g.fillRect(W - 5, depth + 2, 2, 2); }
    if (id === 'cajon') { g.fillStyle = '#141216'; g.fillRect(Math.floor(W / 2) - 2, depth + 3, 4, 4); if (variant === 'play') { g.fillStyle = '#ffe500'; g.fillRect(1, 1, 2, 2); g.fillRect(W - 3, 1, 2, 2); } }
    if (id === 'baldePlantas' || id === 'macetaLlanta') { g.fillStyle = '#3a8a2e'; g.fillRect(3, 0, W - 6, 4); g.fillStyle = id === 'macetaLlanta' ? '#ff2e88' : '#6fbf3a'; g.fillRect(Math.floor(W / 2) - 1, 0, 3, 2); }
    if (id === 'retablo') { g.fillStyle = '#d8263a'; g.fillRect(3, depth + 2, W - 6, lift - 4); g.fillStyle = '#1fe07a'; g.fillRect(5, depth + 4, 2, 2); g.fillStyle = '#4aa8ff'; g.fillRect(W - 7, depth + 4, 2, 2); }
  }
  function drawWallPH(g, id, W, col, variant, f) {
    var d = CAT()[id] || {};
    if (id === 'foco') {
      g.fillStyle = '#141216'; g.fillRect(Math.floor(W / 2), 0, 1, 8);
      g.fillStyle = variant === 'off' ? '#9a968a' : '#fff4c0'; g.fillRect(Math.floor(W / 2) - 2, 8, 5, 5);
      g.fillStyle = '#5a5650'; g.fillRect(Math.floor(W / 2) - 1, 7, 3, 1);
      return;
    }
    if (id === 'guirnalda') {
      g.fillStyle = '#2a3a2a'; for (var x = 0; x < W; x++) g.fillRect(x, 3 + Math.round(Math.sin(x / W * Math.PI * 3) * 2), 1, 1);
      var cs = ['#ff2e88', '#ffe500', '#1fe07a', '#4aa8ff'];
      for (var i = 0, bx = 3; bx < W - 2; bx += 5, i++) { var on = variant !== 'off' && ((i + f) % 2 === 0); g.fillStyle = variant === 'off' ? '#6a6670' : on ? cs[i % 4] : shade(cs[i % 4], 0.55); g.fillRect(bx, 5 + Math.round(Math.sin(bx / W * Math.PI * 3) * 2), 2, 3); }
      return;
    }
    if (id === 'armero') {
      g.fillStyle = '#141216'; g.fillRect(0, 5, W, 5); g.fillStyle = col; g.fillRect(1, 6, W - 2, 3);
      g.fillStyle = '#c8ccd2'; for (var n = 0; n < 4; n++) g.fillRect(3 + n * Math.floor((W - 6) / 3), 7, 1, 2);
      return;
    }
    if (id === 'banderaBlanquiazul') {
      g.fillStyle = '#5a4430'; g.fillRect(2, 1, 1, 14);
      for (var s = 0; s < 4; s++) { g.fillStyle = s % 2 ? '#f2f2f2' : '#2a5ad8'; g.fillRect(3, 2 + s * 2, 11, 2); }
      return;
    }
    // afiches y cuadros: marco + dibujo
    var cuadro = /^cuadro/.test(id);
    g.fillStyle = '#141216'; g.fillRect(1, 1, W - 2, 13);
    g.fillStyle = cuadro ? '#c89a3a' : '#ffe500'; g.fillRect(2, 2, W - 4, 11);
    g.fillStyle = col; g.fillRect(3, 3, W - 6, 9);
    if (id === 'cuadroMar') { g.fillStyle = '#9aa0a8'; g.fillRect(3, 3, W - 6, 4); g.fillStyle = '#f2f2f2'; g.fillRect(6, 7, 4, 1); }
    if (id === 'cuadroGatos') { g.fillStyle = '#141216'; g.fillRect(6, 7, 4, 4); g.fillRect(6, 6, 1, 1); g.fillRect(9, 6, 1, 1); g.fillStyle = '#f2f2f2'; g.fillRect(18, 7, 4, 4); }
    if (id === 'cuadroFaro') { g.fillStyle = '#f2f2f2'; g.fillRect(7, 4, 2, 8); g.fillStyle = '#ffe500'; g.fillRect(7, 4, 2, 1); }
    if (id === 'aficheChicha') { label(g, 'HOY', W / 2, 4, '#141216', 'c'); }
  }

  /* ---------------- el cuarto horneado (piso, paredes, azotea) ---------------- */
  var roomC = null, roomSig = '', backC = null, backSig = '', fogC = null, fogC2 = null, cordelC = [null, null], tankC = null, ledgeC = null, horizC = null;
  function cuartoSpr(names, f) {
    var C = dig('base.cuarto'); if (!C) return null;
    for (var i = 0; i < names.length; i++) { var o = C[names[i]]; if (o == null) continue; var c = frameOf(o, f | 0) || pickVariant(o, 'idle', f); if (c && !c.placeholder) return c; }
    return null;
  }
  function cuartoList(name) { var o = dig('base.cuarto.' + name); var l = Array.isArray(o) ? o.filter(isCanvas) : (isCanvas(o) ? [o] : []); return l.length ? l : null; }
  function tileRow(g, list, x0, y, n, pick) { for (var i = 0; i < n; i++) g.drawImage(list[pick ? pick(i) % list.length : i % list.length], x0 + i * T, y); }
  function bakeRoom() {
    var C = dig('base.cuarto') || {};
    var sig = Object.keys(C).join(',');
    if (roomC && sig === roomSig) return;
    roomSig = sig;
    roomC = mk(SW, SH);
    var g = ctx2(roomC); g.translate(-SX0, -SY0);
    var r = rng(11), x, y, i, j, l;
    // --- piso del cuarto (filas 0–7) ---
    if ((l = cuartoList('piso'))) {
      for (j = 0; j < ROOM_ROWS; j++) for (i = 0; i < COLS; i++) g.drawImage(l[(i * 7 + j * 3) % l.length], i * T, j * T);
      var gr = cuartoList('pisoGrieta'); if (gr) for (i = 4; i < 7; i++) g.drawImage(gr[i % gr.length], i * T, 5 * T);
      var mn = cuartoList('pisoMancha'); if (mn) { g.drawImage(mn[0], 9 * T, 3 * T); g.drawImage(mn[mn.length - 1], 2 * T, 6 * T); }
    } else {
      g.fillStyle = '#6a6762'; g.fillRect(0, 0, COLS * T, ROOM_BOT);
      for (i = 0; i < 560; i++) { g.fillStyle = r() < 0.5 ? '#625f5a' : '#73706a'; g.fillRect(Math.floor(r() * COLS * T), Math.floor(r() * ROOM_BOT), 1 + (r() < 0.2 ? 1 : 0), 1); }
      for (i = 0; i < 7; i++) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(Math.floor(r() * 180), 6 + Math.floor(r() * 110), 6 + Math.floor(r() * 10), 3); }
      g.fillStyle = '#4a4744'; x = 64; y = 88;
      for (i = 0; i < 46; i++) { g.fillRect(x, y, 1, 1); x += 1; y += r() < 0.33 ? -1 : r() < 0.5 ? 1 : 0; }
      g.fillStyle = 'rgba(0,0,0,.12)'; for (i = 0; i < COLS; i += 3) g.fillRect(i * T, 0, 1, ROOM_BOT);
    }
    var rayo = cuartoSpr(['ventanaRayo']); if (rayo) g.drawImage(rayo, WIN_C[0] * T, 2);
    else { g.fillStyle = 'rgba(220,226,236,.10)'; g.beginPath(); g.moveTo(WIN_C[0] * T + 2, 0); g.lineTo(WIN_C[0] * T + 30, 0); g.lineTo(WIN_C[0] * T + 40, 38); g.lineTo(WIN_C[0] * T + 10, 38); g.fill(); }
    // --- azotea (filas 8–11) ---
    if ((l = cuartoList('azoteaPiso'))) { for (j = 0; j < AZ_ROWS; j++) for (i = 0; i < COLS; i++) g.drawImage(l[(i * 5 + j * 2) % l.length], i * T, AZ_TOP + j * T); }
    else {
      g.fillStyle = '#7b7872'; g.fillRect(0, AZ_TOP, COLS * T, AZ_ROWS * T);
      for (i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? '#6c6963' : '#88857e'; g.fillRect(Math.floor(r() * COLS * T), AZ_TOP + Math.floor(r() * 64), 1, 1); }
      for (i = 0; i < 6; i++) { g.fillStyle = 'rgba(40,44,40,.18)'; g.fillRect(Math.floor(r() * 170), AZ_TOP + 6 + Math.floor(r() * 50), 10 + Math.floor(r() * 16), 4 + Math.floor(r() * 5)); }
    }
    // parapeto del fondo, lados de la azotea
    if ((l = cuartoList('parapeto'))) tileRow(g, l, 0, AZ_TOP - l[0].height, COLS, function (k) { return k === 6 ? 1 : 0; });
    else { g.fillStyle = '#8a857c'; g.fillRect(0, AZ_TOP - 18, COLS * T, 4); g.fillStyle = '#5c5852'; g.fillRect(0, AZ_TOP - 14, COLS * T, 14); }
    if ((l = cuartoList('parapetoLado'))) { for (j = 0; j < AZ_ROWS; j++) { g.drawImage(l[0], -8, AZ_TOP + j * T); g.drawImage(l[l.length - 1], COLS * T, AZ_TOP + j * T); } }
    else { g.fillStyle = '#5c5852'; g.fillRect(-8, AZ_TOP - 18, 8, AZ_ROWS * T + 18); g.fillRect(COLS * T, AZ_TOP - 18, 8, AZ_ROWS * T + 18); }
    // escalera de bajada (2×2, esquina de la azotea)
    var es = cuartoSpr(['escalera']);
    if (es) g.drawImage(es, STAIR.c * T, rowY(STAIR.r) + STAIR.h * T - es.height);
    else {
      x = STAIR.c * T; y = rowY(STAIR.r);
      g.fillStyle = '#141216'; g.fillRect(x + 2, y + 2, 28, 28);
      for (i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#5a5650' : '#6e6a62'; g.fillRect(x + 3, y + 3 + i * 4, 26, 3); }
      g.fillStyle = '#8a4a2a'; g.fillRect(x + 1, y, 1, 30); g.fillRect(x + 30, y, 1, 30);
    }
    // --- pared del fondo del cuarto (banda −38…0): tapa + ladrillo, ventana y puerta ---
    var tapa = cuartoSpr(['tapa']), par = cuartoList('pared');
    for (i = 0; i < COLS; i++) {
      if (tapa) g.drawImage(tapa, i * T, BAND_TOP); else { g.fillStyle = '#2a2624'; g.fillRect(i * T, BAND_TOP, T, 6); }
      if (par) g.drawImage(par[i % par.length], i * T, BAND_TOP + 6);
      else {
        g.fillStyle = '#5e3a2e'; g.fillRect(i * T, BAND_TOP + 6, T, 32);
        for (y = BAND_TOP + 6; y < -4; y += 4) for (x = (((y - BAND_TOP) / 4) % 2 ? -4 : 0); x < T; x += 8) { g.fillStyle = r() < 0.5 ? '#8a4f3a' : '#93583f'; g.fillRect(i * T + Math.max(0, x + 1), y + 1, Math.min(7, T - x - 1), 3); }
        g.fillStyle = '#a39c8f'; g.fillRect(i * T, -14 + Math.round(Math.sin(i) * 3), T, 12);
        g.fillStyle = '#3a3330'; g.fillRect(i * T, -3, T, 3);
      }
    }
    var ven = cuartoSpr(['ventana']);
    if (ven) g.drawImage(ven, WIN_C[0] * T, BAND_TOP + 6);
    else {
      x = WIN_C[0] * T + 2; y = BAND_TOP + 8;
      g.fillStyle = '#2a2a2e'; g.fillRect(x, y, 28, 24); g.fillStyle = '#b9bec5'; g.fillRect(x + 2, y + 2, 24, 20);
      g.fillStyle = '#8a8f97'; g.fillRect(x + 2, y + 15, 8, 7); g.fillRect(x + 12, y + 12, 6, 10);
      g.fillStyle = '#2a2a2e'; g.fillRect(x + 13, y, 2, 24); g.fillRect(x, y + 11, 28, 2);
    }
    var pu = cuartoSpr(['puertaAbierta', 'puerta']);
    if (pu) g.drawImage(pu, DOOR_C * T, BAND_TOP + 6);
    else { g.fillStyle = '#141216'; g.fillRect(DOOR_C * T + 1, BAND_TOP + 6, 14, 32); g.fillStyle = '#9da2aa'; g.fillRect(DOOR_C * T + 3, BAND_TOP + 8, 10, 26); g.fillStyle = '#2a4a6a'; g.fillRect(DOOR_C * T + 1, BAND_TOP + 6, 3, 32); }
    var um = cuartoSpr(['umbral']); if (um) g.drawImage(um, DOOR_C * T, 0);
    // paredes de los lados del cuarto y esquinas
    var pi = cuartoList('paredIzq'), pd = cuartoList('paredDer');
    for (j = 0; j < ROOM_ROWS; j++) {
      if (pi) g.drawImage(pi[j % pi.length], -pi[0].width, j * T); else { g.fillStyle = '#3d3632'; g.fillRect(-10, j * T, 10, T); }
      if (pd) g.drawImage(pd[j % pd.length], COLS * T, j * T); else { g.fillStyle = '#3d3632'; g.fillRect(COLS * T, j * T, 10, T); }
    }
    var ei = cuartoSpr(['esquinaIzq']), ed = cuartoSpr(['esquinaDer']);
    if (ei) g.drawImage(ei, -ei.width, BAND_TOP); else { g.fillStyle = '#2a2624'; g.fillRect(-10, BAND_TOP, 10, 38); }
    if (ed) g.drawImage(ed, COLS * T, BAND_TOP); else { g.fillStyle = '#2a2624'; g.fillRect(COLS * T, BAND_TOP, 10, 38); }
    // borde de abajo del cuarto
    g.fillStyle = '#2a2624'; g.fillRect(-10, ROOM_BOT, COLS * T + 20, 4); g.fillStyle = '#141216'; g.fillRect(-10, ROOM_BOT + 4, COLS * T + 20, 2);
    // fierros de columna (esquinas de la azotea)
    var fl = cuartoList('fierros');
    var spots = [[0, AZ_R0 + 3], [11, AZ_R0]];
    for (i = 0; i < spots.length; i++) {
      x = spots[i][0] * T + 8; y = rowY(spots[i][1]) + T;
      if (fl) { var fs = fl[i % fl.length]; g.drawImage(fs, x - (fs.ax != null ? fs.ax : 8), y - (fs.ay != null ? fs.ay : fs.height)); continue; }
      g.fillStyle = '#9a9690'; g.fillRect(x - 6, y - 6, 12, 6);
      g.fillStyle = '#8a4a2a'; for (var k = 0; k < 3; k++) g.fillRect(x - 4 + k * 4, y - 22 + (k % 2) * 3, 1, 17 - (k % 2) * 3);
    }
    tankC = cuartoSpr(['tanque']) || bakeTank();
    cordelC = [cuartoSpr(['cordel'], 0) || bakeCordel(0), cuartoSpr(['cordel'], 1) || bakeCordel(1)];
    horizC = cuartoSpr(['horizonte']);
    backSig = ''; lightSig = '';
  }
  function bakeTank() {
    var c = mk(32, 54), g = ctx2(c);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(2, 46, 30, 6);
    g.fillStyle = '#141216'; g.fillRect(2, 10, 28, 40);
    g.fillStyle = '#26262a'; g.fillRect(3, 11, 26, 38);
    g.fillStyle = '#34343a'; for (var y = 16; y < 48; y += 6) g.fillRect(3, y, 26, 1);
    g.fillStyle = '#3e3e44'; g.fillRect(6, 11, 3, 37);
    g.fillStyle = '#141216'; g.fillRect(7, 5, 18, 7); g.fillStyle = '#2e2e34'; g.fillRect(8, 6, 16, 5);
    c.ax = 16; c.ay = 54;
    return c;
  }
  function bakeCordel(f) {
    var W = 64, c = mk(W, 32), g = ctx2(c), sway = f ? 1 : 0;
    g.fillStyle = '#5a4430'; g.fillRect(0, 2, 2, 30); g.fillRect(W - 2, 2, 2, 30);
    g.fillStyle = '#c8c8c0'; for (var x = 2; x < W - 2; x++) g.fillRect(x, 4 + Math.round(Math.sin(x / W * Math.PI) * 3), 1, 1);
    var ropa = [[6, '#d8263a', 9, 11], [20, '#f2f2f2', 8, 9], [33, '#3a6ad8', 10, 14], [48, '#ffe500', 8, 9]];
    for (var i = 0; i < ropa.length; i++) {
      var rx = ropa[i][0], ry = 5 + Math.round(Math.sin(rx / W * Math.PI) * 3), w = ropa[i][2], h = ropa[i][3], s = (i % 2 ? sway : 1 - sway);
      g.fillStyle = '#141216'; g.fillRect(rx - 1 + s, ry, w + 2, h + 1);
      g.fillStyle = ropa[i][1]; g.fillRect(rx + s, ry, w, h);
      g.fillStyle = shade(ropa[i][1], 0.75); g.fillRect(rx + s, ry + h - 2, w, 2);
    }
    c.ax = 32; c.ay = 32;
    return c;
  }
  // fondo: cielo panza de burro y techos del Callao (por tamaño de vista; el horizonte de D2 va en la escena)
  function bakeBack(w, h) {
    var sig = w + 'x' + h; if (backC && backSig === sig) return;
    backSig = sig; backC = mk(w, h);
    var g = ctx2(backC), r = rng(31), i;
    var bands = ['#b9b8b0', '#b2b2ab', '#aaaba6', '#a3a5a1', '#9c9e9b'];
    for (i = 0; i < bands.length; i++) { g.fillStyle = bands[i]; g.fillRect(0, Math.floor(h * i / bands.length), w, Math.ceil(h / bands.length) + 1); }
    for (var layer = 0; layer < 2; layer++) {
      var base = Math.floor(h * (0.55 + layer * 0.25)), col = layer ? '#6a6d72' : '#83868a';
      for (var x = 0; x < w;) {
        var bw = 18 + Math.floor(r() * 34), bh = 10 + Math.floor(r() * 40);
        g.fillStyle = col; g.fillRect(x, base - bh, bw, h);
        if (r() < 0.4) { g.fillStyle = layer ? '#3e4044' : '#5a5d62'; g.fillRect(x + 4, base - bh - 7, 7, 7); }
        if (r() < 0.5) { g.fillStyle = '#7a5a4a'; for (var k = 0; k < 3; k++) g.fillRect(x + bw - 3 - k * 3, base - bh - 5, 1, 5); }
        if (layer) { g.fillStyle = '#c9a66b'; for (var wy = base - bh + 4; wy < h - 4; wy += 9) for (var wx = x + 3; wx < x + bw - 4; wx += 8) if (r() < 0.12) g.fillRect(wx, wy, 2, 2); }
        x += bw + Math.floor(r() * 4);
      }
    }
  }
  function bakeFog() {
    var l = cuartoList('neblina');
    if (l) { fogC = l[0]; fogC2 = l[l.length - 1]; return; }
    fogC = mk(160, 56); var g = ctx2(fogC), r = rng(77);
    for (var i = 0; i < 40; i++) {
      var x = Math.floor(r() * 160), y = 6 + Math.floor(r() * 44), rw = 14 + Math.floor(r() * 30), rh = 3 + Math.floor(r() * 5);
      g.fillStyle = 'rgba(225,230,236,' + (0.06 + r() * 0.08).toFixed(3) + ')';
      g.fillRect(x, y, rw, rh); g.fillRect(x - 160, y, rw, rh); g.fillRect(x + 4, y - 2, rw - 8, rh + 4);
    }
    fogC2 = fogC;
  }

  /* ---------------- luz: mapa horneado ---------------- */
  var lightC = [null, null], lightSig = '', haloCache = {};
  function halo(r, color, white) {
    var key = r + '|' + color + '|' + (white ? 1 : 0);
    if (haloCache[key]) return haloCache[key];
    var c = mk(r * 2, r * 2), g = c.getContext('2d');
    var steps = [[1, 0.25], [0.78, 0.45], [0.58, 0.7], [0.38, 1]];                       // anillos (luz «pixelada», sin degradado)
    for (var i = 0; i < steps.length; i++) {
      g.globalAlpha = white ? steps[i][1] * 0.55 + (i === 3 ? 0.4 : 0) : steps[i][1] * 0.5;
      g.fillStyle = white ? '#fff' : color;
      g.beginPath(); g.arc(r, r, r * steps[i][0], 0, Math.PI * 2); g.fill();
    }
    haloCache[key] = c; return c;
  }
  function lightsList() {
    var out = [];
    for (var i = 0; i < S.puestos.length; i++) {
      var q = S.puestos[i], d = CAT()[q.id]; if (!d || !d.luz || q.off) continue;
      var spr = mueble(q.id, q.rot, 'on', 0), p = muebleXY(q, spr), m = dims(q.id, q.rot);
      var lx = spr.luz && spr.luz.x != null ? p.x + spr.luz.x : q.c * T + m.w * T / 2, ly = spr.luz && spr.luz.y != null ? p.y + spr.luz.y : p.y + Math.min(9, spr.height / 2);
      out.push({ id: q.id, x: Math.round(lx), y: Math.round(ly), r: d.luz.r || 48, c: d.luz.c || '#ffe7a8', blink: !!d.parpadea });
    }
    return out;
  }
  function d2Halo(id) { var L = dig('base.luz'); var c = L && frameOf(L[id], 0); return c && !c.placeholder ? c : null; }
  function bakeLight() {
    var L = lightsList(), sig = JSON.stringify(L) + '|' + (dig('base.luz') ? Object.keys(dig('base.luz')).length : 0);
    if (sig === lightSig && lightC[0]) return;
    lightSig = sig;
    var blink = L.some(function (l) { return l.blink; });
    for (var f = 0; f < 2; f++) {
      if (f === 1 && !blink) { lightC[1] = lightC[0]; break; }
      var c = mk(SW, SH), g = c.getContext('2d');
      g.translate(-SX0, -SY0);
      g.fillStyle = 'rgba(16,14,38,0.66)'; g.fillRect(-12, BAND_TOP, COLS * T + 24, ROOM_BOT - BAND_TOP + 6);   // penumbra del cuarto
      g.globalCompositeOperation = 'destination-out';
      var wx = (WIN_C[0] + 1) * T, wh = halo(36, '#fff', true); g.globalAlpha = 0.6; g.drawImage(wh, wx - 36, 10 - 36); g.globalAlpha = 1;   // luz gris de la ventana
      var dh = halo(24, '#fff', true); g.globalAlpha = 0.45; g.drawImage(dh, DOOR_C * T + 8 - 24, -24); g.globalAlpha = 1;            // claridad de la puerta
      var i, l, hs, rr;
      for (i = 0; i < L.length; i++) {
        l = L[i]; rr = l.blink && f === 1 ? Math.round(l.r * 0.85) : l.r;
        hs = d2Halo(l.id) || halo(rr, '#fff', true);
        g.drawImage(hs, l.x - rr, l.y - rr, rr * 2, rr * 2);
      }
      g.globalCompositeOperation = 'lighter';
      for (i = 0; i < L.length; i++) {
        l = L[i]; rr = l.blink && f === 1 ? Math.round(l.r * 0.85) : l.r;
        hs = (l.blink && f === 1 && d2Halo(l.id + '2')) || d2Halo(l.id) || halo(rr, l.c, false);
        g.globalAlpha = 0.25; g.drawImage(hs, l.x - rr, l.y - rr, rr * 2, rr * 2); g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
      lightC[f] = c;
    }
  }

  /* ---------------- Alexander en el cuarto ---------------- */
  var bp = null;   // {x, y, dir, moving, animT, tx, ty, stuck}
  function walkSpeed() { var C = ACH.ent && ACH.ent.CFG; return (C && C.walk) || 80; }
  function solidAt(x, y) {
    if (x < 1 || x >= COLS * T - 1 || y >= ROOM_BOT - 1 || y < AZ_TOP + 3) return true;
    if (y >= BAND_TOP - 2 && y < 3 && !(x >= DOOR_C * T + 3 && x < (DOOR_C + 1) * T - 3)) return true;   // la pared, salvo la puerta
    var k = Math.floor(x / T) + ',' + rowOfY(y);
    return !!(STATIC_BLOCK[k] || occ[k] || stageAt(k));
  }
  function boxFree(x, y) { return !solidAt(x - 4, y - 3) && !solidAt(x + 3, y - 3) && !solidAt(x - 4, y + 2) && !solidAt(x + 3, y + 2); }
  function movePlayer(dt) {
    var mx = 0, my = 0;
    if (keys.left) mx -= 1; if (keys.right) mx += 1; if (keys.up) my -= 1; if (keys.down) my += 1;
    if (mx || my) bp.tx = null;
    else if (bp.tx != null) {
      var dx = bp.tx - bp.x, dy = bp.ty - bp.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < 2) bp.tx = null; else { mx = dx / dd; my = dy / dd; }
    }
    if (!mx && !my) { bp.moving = false; bp.animT = 0; return; }
    var len = Math.sqrt(mx * mx + my * my); mx /= len; my /= len;
    if (Math.abs(mx) > Math.abs(my) + 0.01) bp.dir = mx < 0 ? 'left' : 'right'; else bp.dir = my < 0 ? 'up' : 'down';
    var sp = walkSpeed(), ox = bp.x, oy = bp.y;
    var nx = bp.x + mx * sp * dt; if (boxFree(nx, bp.y)) bp.x = nx;
    var ny = bp.y + my * sp * dt; if (boxFree(bp.x, ny)) bp.y = ny;
    var moved = Math.abs(bp.x - ox) + Math.abs(bp.y - oy);
    bp.moving = moved > 0.01;
    if (bp.tx != null) { if (moved < 0.05) { bp.stuck += dt; if (bp.stuck > 0.3) bp.tx = null; } else bp.stuck = 0; }
    var C = ACH.ent && ACH.ent.CFG, fps = (C && C.animFps) || 8, ref = (C && C.animRefSpeed) || 60;
    if (bp.moving) bp.animT += dt * fps * sp / ref;
  }
  function titinaHere() { var p = P(); return !!(p ? p.bird !== false : true); }
  function palomarQ() { for (var i = 0; i < S.puestos.length; i++) if (CAT()[S.puestos[i].id] && CAT()[S.puestos[i].id].palomar) return S.puestos[i]; return null; }
  function anchored(c) { if (c.ax === undefined) c.ax = Math.floor(c.width / 2); if (c.ay === undefined) c.ay = c.height - 1; return c; }
  function alexFrame(set, gs, anim, dir, f) {
    if (gs) { var o = dig('alex.' + set + '.' + gs + '.' + anim + '.' + dir), c = anim === 'idle' ? (isCanvas(o) ? o : frameOf(o, 0)) : frameOf(o, f); if (c) return anchored(c); }
    var o2 = dig('alex.' + set + '.' + anim + '.' + dir), c2 = anim === 'idle' ? (isCanvas(o2) ? o2 : frameOf(o2, 0)) : frameOf(o2, f);
    if (c2) return anchored(c2);
    if (ACH.gfx && typeof ACH.gfx.alex === 'function') { try { return ACH.gfx.alex(set, anim, dir, f); } catch (e) { /* abajo */ } }
    return phAlex();
  }
  var phAlexC = null;
  function phAlex() {
    if (phAlexC) return phAlexC;
    var c = mk(14, 24), g = ctx2(c); g.fillStyle = '#c0562f'; g.fillRect(1, 1, 12, 22); g.fillStyle = '#e8b48a'; g.fillRect(3, 1, 8, 7); g.fillStyle = '#2b3a67'; g.fillRect(2, 15, 10, 8);
    c.ax = 7; c.ay = 23; phAlexC = c; return c;
  }
  var POSE_FB = { punch: 'attack', skateSwing: 'attack', kick: 'attack', skateHold: 'walk' };
  function alexSprite() {
    var p = P(), set = titinaHere() && !palomarQ() ? 'bird' : 'nobird';
    var gs = null; try { gs = ACH.armas && ACH.armas.alexSet ? ACH.armas.alexSet(set) : null; } catch (e) { gs = null; }
    if (gs !== 'g1' && gs !== 'g2' && gs !== 'g3') gs = null;
    var fake = { dir: bp.dir, moving: bp.moving, animT: bp.animT, atkT: -1, held: p ? p.held : null, kickT: 0, throwT: 0, sickT: 0, carryCharging: false, fanT: -1, bird: set === 'bird' };
    var pose = null, pf = 0;
    try { if (ACH.armas && ACH.armas.pose) { pose = ACH.armas.pose(fake); pf = ACH.armas.poseFrame(fake) | 0; } } catch (e) { pose = null; }
    if (pose && typeof pose === 'string' && pose !== 'sick' && pose !== 'throwMolotov') {
      var o = dig('alex.' + set + '.' + pose), c = null;
      if (o && !Array.isArray(o) && !isCanvas(o)) c = frameOf(o[bp.dir], pf);
      if (!c) c = frameOf(o, pf);
      if (c) return anchored(c);
      if (POSE_FB[pose] !== 'walk' && POSE_FB[pose]) return alexFrame(set, gs, 'idle', bp.dir, 0);
    }
    if (bp.moving) return alexFrame(set, gs, 'walk', bp.dir, Math.floor(bp.animT));
    return alexFrame(set, gs, 'idle', bp.dir, 0);
  }
  function heldSprite() {
    var p = P(); if (!p || !p.held || !p.held.id) return null;
    var d = ACH.armas && ACH.armas.defs && ACH.armas.defs[p.held.id]; if (!d || d.mode === 'push') return null;
    if (d.poses && d.poses.hold && dig('alex.nobird.' + d.poses.hold)) return null;   // la pose ya lo dibuja
    var s = d.spr && dig('props.' + d.spr); s = frameOf(s, 0) || (s && frameOf(s.idle, 0));
    return s || null;
  }

  /* ---------------- interacción ---------------- */
  function distRect(x, y, rx, ry, rw, rh) { var dx = Math.max(rx - x, 0, x - (rx + rw)), dy = Math.max(ry - y, 0, y - (ry + rh)); return Math.sqrt(dx * dx + dy * dy); }
  var DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function nearest() {
    var best = null, bs = 1e9, v = DIRV[bp.dir] || [0, 1];
    var onAz = bp.y < BAND_TOP;   // cada lado de la pared ve lo suyo
    function consider(obj, rx, ry, rw, rh, reach) {
      var d = distRect(bp.x, bp.y - 2, rx, ry, rw, rh); if (d > reach) return;
      var cx = rx + rw / 2 - bp.x, cy = ry + rh / 2 - bp.y, facing = (cx * v[0] + cy * v[1]) > 0 ? -5 : 0;
      var sc = d + facing; if (sc < bs) { bs = sc; best = obj; }
    }
    for (var i = 0; i < S.puestos.length; i++) {
      var q = S.puestos[i], d = CAT()[q.id], m = dims(q.id, q.rot); if (!d) continue;
      if (d.tipo === 'alfombra') continue;   // se pisan: no tapan a lo que está al lado
      if ((d.tipo === 'pared' || inRoom(q.r)) === onAz) continue;
      if (d.tipo === 'pared') consider({ q: q }, q.c * T, BAND_TOP, m.w * T, -BAND_TOP, 12);
      else consider({ q: q }, q.c * T, rowY(q.r), m.w * T, m.h * T, 11);
    }
    if (onAz) consider({ stair: true }, STAIR.c * T, rowY(STAIR.r), STAIR.w * T, STAIR.h * T, 10);
    if (!onAz && S.escenario) consider({ stage: true }, S.escenario.c * T, rowY(S.escenario.r), STAGE_W * T, T, 14);   // v0.13 T2
    return best;
  }
  function actionOf(n) {
    if (!n) return null;
    if (n.stair) return 'BAJAR A LA CALLE';
    if (n.stage) return "MIRAR EL ESCENARIO";
    var d = CAT()[n.q.id];
    if (d.baul) return 'ABRIR ' + d.name;
    if (d.armero) return 'PERCHA DE ARMAS';
    if (d.taller) return "MESA DE LUTHIER: MEJORAS";
    if (d.cama) return 'DORMIR';
    if (d.luz) return n.q.off ? 'PRENDER ' + d.name : 'APAGAR ' + d.name;
    if (d.sonido === 'radio') return S.radio ? 'APAGAR LA RADIO' : 'PRENDER LA RADIO';
    if (d.sonido === 'cajon') return 'TOCAR EL CAJÓN';
    if (d.palomar) return 'TITINA';
    return 'MIRAR ' + d.name;
  }
  var cajonT = 0, notes = [];
  function interact() {
    var n = nearest(); if (!n) return false;
    if (n.stair) { exit(); return true; }
    if (n.stage) { stageTalk(); return true; }
    var q = n.q, d = CAT()[q.id];
    if (d.baul) { openBaul(q); return true; }
    if (d.armero) { openPercha(q); return true; }
    if (d.taller) { openTaller(q); return true; }
    if (d.cama) { sleep(); return true; }
    if (d.luz) { q.off = !q.off; sfx(q.off ? 'ui.back' : 'ui.ok'); save(); return true; }
    if (d.sonido === 'radio') {
      S.radio = !S.radio; save(); sfx('base.radio', { on: S.radio });
      toast(S.radio ? '♪ Radio Callao Mix: «la que más suena en tu barrio»' : 'Silencio en la azotea.'); return true;
    }
    if (d.sonido === 'cajon') { sfx('base.cajon', {}); cajonT = 0.45; var m = dims(q.id, q.rot); burstNotes(q.c * T + m.w * 8, rowY(q.r) - 4, 3); return true; }
    if (d.palomar) {
      if (titinaHere()) { sfx('titina.coo', {}); toast('Titina se acomoda en su palomar. «Cuurrú.»'); }
      else toast('Titina anda volando por la calle. Ya vendrá.');
      return true;
    }
    toast(d.desc || d.name);
    return true;
  }
  function burstNotes(x, y, n) {
    for (var i = 0; i < n; i++) notes.push({ x: x + (Math.random() * 10 - 5), y: y - 4, t: 0, life: 1.2 + Math.random() * 0.5, vx: Math.random() * 8 - 4, k: Math.floor(Math.random() * 3) });
    if (notes.length > 30) notes.splice(0, notes.length - 30);
  }
  var noteSpr = null;
  function noteSprites() {
    if (noteSpr) return noteSpr;
    noteSpr = [];
    var cols = ['#ffe500', '#ff2e88', '#1fe07a'];
    for (var i = 0; i < 3; i++) {
      var c = mk(6, 8), g = ctx2(c);
      g.fillStyle = '#141216'; g.fillRect(0, 4, 4, 4); g.fillRect(3, 0, 2, 6); g.fillRect(3, 0, 3, 2);
      g.fillStyle = cols[i]; g.fillRect(1, 5, 2, 2); g.fillRect(4, 1, 1, 4); g.fillRect(5, 1, 1, 1);
      noteSpr.push(c);
    }
    return noteSpr;
  }
  // v0.13 (A2): la vida la cura ACH.dif.camaCura (Tranqui siempre; Achorado y Bravazo, una vez por nivel). El aliento, siempre.
  function camaOk() { var D = ACH.dif; if (!D || typeof D.camaCura !== 'function') return true; try { return D.camaCura(G()) !== false; } catch (e) { return true; } }
  function sleep() {
    fadeTo(1, 0.45, function () {
      var p = P(), C = ACH.ent && ACH.ent.CFG, cura = camaOk();
      if (p) {
        if (cura) { p.hp = (C && C.hpMax) || p.hpMax || 100; call(ACH.dif, 'usarCama', G()); }
        if (typeof p.stamina === 'number') p.stamina = (C && C.staminaMax) || 100;
      }
      sfx('base.dormir', {});
      fadeTo(0, 0.5, function () { toast(cura ? 'Uff, como nuevo.' : ((ACH.dif && ACH.dif.MSG && ACH.dif.MSG.cama) || 'Ya descansaste aquí. La vida no se regala, causa.')); }, 0.5);
    });
  }

  /* ---------------- DOM ---------------- */
  var D = null;
  function el(tag, cls, parent, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function build() {
    if (D) return D;
    var parent = document.getElementById('stage') || document.body;
    var root = el('div', 'bz', parent);
    root.setAttribute('aria-label', 'Cuarto de Alexander');
    var cv = el('canvas', 'bz-cv', root);
    if (ACH.lienzo && ACH.lienzo.gpu) ACH.lienzo.gpu(cv);   // se redibuja cada cuadro: va por GPU como #world
    var top = el('div', 'bz-top', root);
    el('span', 'bz-title', top, 'MI CUARTO · AZOTEA DEL CALLAO');
    var bDec = el('button', 'bz-btn', top, 'DECORAR (C)'); bDec.type = 'button';
    var bOut = el('button', 'bz-btn bz-out', top, 'BAJAR A LA CALLE (H)'); bOut.type = 'button';
    var hint = el('div', 'bz-hint', root);
    var use = el('button', 'bz-use', root, 'USAR'); use.type = 'button';
    var bar = el('div', 'bz-bar', root);
    var barInfo = el('div', 'bz-binfo', bar);
    var barList = el('div', 'bz-blist', bar);
    var barBtns = el('div', 'bz-bbtns', bar);
    var bRot = el('button', 'bz-btn', barBtns, 'GIRAR (R)'), bPut = el('button', 'bz-btn', barBtns, 'PONER (ENTER)'),
      bDel = el('button', 'bz-btn', barBtns, 'GUARDAR (⌫)'), bOk = el('button', 'bz-btn bz-ok', barBtns, 'LISTO (C)');
    var pnl = el('div', 'bz-pnl', root);
    var toastE = el('div', 'bz-toast', root);
    var fade = el('div', 'bz-fade', root);
    D = { root: root, cv: cv, g: null, top: top, hint: hint, use: use, bar: bar, barInfo: barInfo, barList: barList, pnl: pnl, toast: toastE, fade: fade };
    function btn(b, fn) {
      b.type = 'button';
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { fn(e); } catch (er) { console.warn('[base]', er); } b.blur(); });
    }
    btn(bDec, function () { toggleDecor(); });
    btn(bOut, function () { exit(); });
    btn(use, function () { if (!panel && !busy()) interact(); });
    btn(bRot, function () { rotateGhost(); });
    btn(bPut, function () { placeGhost(); });
    btn(bDel, function () { removeTarget(); });
    btn(bOk, function () { toggleDecor(false); });
    // ratón y toque sobre la escena: no le llegan al juego
    ['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'touchend', 'touchmove', 'wheel', 'pointerdown', 'pointerup'].forEach(function (t) {
      root.addEventListener(t, function (e) { if (!open) return; e.stopPropagation(); if (t === 'contextmenu') e.preventDefault(); }, false);
    });
    cv.addEventListener('pointermove', function (e) { if (!open) return; var w = toWorld(e); mouse.x = w.x; mouse.y = w.y; if (e.pointerType === 'mouse') mouse.t = now(); });
    cv.addEventListener('pointerdown', onCanvasDown);
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return D;
  }
  function toWorld(e) {
    var r = D.cv.getBoundingClientRect(), sx = D.cv.width / Math.max(1, r.width), sy = D.cv.height / Math.max(1, r.height);
    return { x: (e.clientX - r.left) * sx + cam.x, y: (e.clientY - r.top) * sy + cam.y };
  }
  var mouse = { x: 0, y: 0, t: -99 }, toastT = 0;
  function toast(t) {
    if (!D) { hudToast(t); return; }
    D.toast.textContent = t; D.toast.classList.add('on'); toastT = 2.6;
  }
  var fadeS = null;
  function fadeTo(v, dur, done, delay) {
    if (!D) { if (done) done(); return; }
    fadeS = { from: parseFloat(D.fade.style.opacity || '0') || 0, to: v, t: -(delay || 0), dur: dur, done: done };
  }
  function busy() { return !!(fadeS || (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active())); }

  /* ---------------- paneles: baúl, percha, menú ---------------- */
  var panel = null;   // {kind, q, side, i, rows...}
  function closePanel() { panel = null; if (D) { D.pnl.classList.remove('on'); D.pnl.innerHTML = ''; } }
  function pnlFrame(title, help) {
    D.pnl.innerHTML = ''; D.pnl.classList.add('on');
    var box = el('div', 'bz-box', D.pnl);
    el('h2', 'bz-h2', box, title);
    var body = el('div', 'bz-body', box);
    var msg = el('p', 'bz-msg', box);
    if (help) el('p', 'bz-help', box, help);
    var x = el('button', 'bz-x', box, '✕'); x.type = 'button';
    x.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); closePanel(); });
    return { box: box, body: body, msg: msg };
  }
  function iconInto(cv, id) {
    var ic = weaponIcon(id);   // arreglos v0.11
    if (!ic) { try { ic = ACH.inv && ACH.inv.icon ? ACH.inv.icon(id) : null; } catch (e) { ic = null; } }
    cv.width = ic ? ic.width : 12; cv.height = ic ? ic.height : 12;
    var g = ctx2(cv); g.clearRect(0, 0, cv.width, cv.height);
    if (ic) g.drawImage(ic, 0, 0); else { g.fillStyle = '#ff2e88'; g.fillRect(2, 2, 8, 8); }
  }
  // --- baúl: MOCHILA ⇄ BAÚL ---
  function openBaul(q) {
    closePanel();
    fixContainers();
    panel = { kind: 'baul', q: q, side: 0, i: 0 };
    sfx('ui.open', {});
    renderBaul();
  }
  function bagSlots() { var s = call(ACH.inv, 'snapshot'); return s && Array.isArray(s.slots) ? s.slots : []; }
  function renderBaul(msgTxt) {
    var q = panel.q, d = CAT()[q.id], box = S.baules[q.uid];
    var f = pnlFrame(d.name, 'Clic o ENTER: mueve la pila · SHIFT+clic o SHIFT+ENTER: mueve uno · ←→↑↓ elige · TAB cambia de lado · ESC o E cierra');
    var cols = el('div', 'bz-cols', f.body);
    var bag = bagSlots();
    var sides = [{ title: 'MOCHILA', list: bag }, { title: 'BAÚL (' + box.filter(Boolean).length + '/' + box.length + ')', list: box }];
    if (!ACH.inv || !ACH.inv.snapshot) sides[0].title = 'MOCHILA (no llegó)';
    for (var s = 0; s < 2; s++) {
      if (s === 1) el('div', 'bz-swap', cols, '⇄');
      var col = el('div', 'bz-col', cols);
      el('h3', 'bz-h3', col, sides[s].title);
      var grid = el('div', 'bz-grid', col);
      var n = Math.max(sides[s].list.length, s === 0 ? 12 : 0);
      for (var i = 0; i < n; i++) {
        var it = sides[s].list[i];
        var b = el('button', 'bz-slot' + (panel.side === s && panel.i === i ? ' sel' : '') + (it ? '' : ' empty'), grid); b.type = 'button';
        if (it) { var cv = el('canvas', '', b); iconInto(cv, it.id); el('b', '', b, it.n > 1 ? String(it.n) : ''); b.title = itemName(it.id) + ' ×' + it.n; }
        (function (side, idx) {
          b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); panel.side = side; panel.i = idx; moveSlot(side, idx, e.shiftKey); });
        })(s, i);
      }
    }
    var cur = panel.side === 0 ? bag[panel.i] : box[panel.i];
    f.msg.textContent = msgTxt || (cur ? itemName(cur.id) + ' ×' + cur.n + (panel.side === 0 ? '  →  al baúl' : '  →  a la mochila') : '');
  }
  function moveSlot(side, i, one) {
    var q = panel.q, box = S.baules[q.uid], msg = '';
    if (side === 0) {
      var it = bagSlots()[i]; if (!it) { renderBaul(); return; }
      var want = one ? 1 : it.n, st = stackOf(it.id), left = want, j;
      for (j = 0; j < box.length && left > 0; j++) if (box[j] && box[j].id === it.id && box[j].n < st) { var k = Math.min(st - box[j].n, left); box[j].n += k; left -= k; }
      for (j = 0; j < box.length && left > 0; j++) if (!box[j]) { var k2 = Math.min(st, left); box[j] = { id: it.id, n: k2 }; left -= k2; }
      var moved = want - left;
      if (moved > 0 && !call(ACH.inv, 'take', it.id, moved)) {   // no se pudo sacar de la mochila: se deshace
        for (j = box.length - 1; j >= 0 && moved > 0; j--) if (box[j] && box[j].id === it.id) { var r = Math.min(box[j].n, moved); box[j].n -= r; moved -= r; if (box[j].n <= 0) box[j] = null; }
        msg = 'No se pudo sacar de la mochila.';
      } else if (moved <= 0) msg = 'El baúl está lleno, causa.';
      else { msg = itemName(it.id) + ' ×' + moved + ' al baúl.'; sfx('ui.ok', {}); }
    } else {
      var b = box[i]; if (!b) { renderBaul(); return; }
      var w2 = one ? 1 : b.n, lf = call(ACH.inv, 'add', b.id, w2);
      if (typeof lf !== 'number') lf = w2;
      var mv = w2 - lf;
      if (mv > 0) { b.n -= mv; if (b.n <= 0) box[i] = null; msg = itemName(b.id) + ' ×' + mv + ' a la mochila.'; sfx('ui.ok', {}); }
      else msg = 'La mochila está llena, causa.';
    }
    save();
    renderBaul(msg);
  }
  // --- percha de armas ---
  function armas(f) { return ACH.armas && typeof ACH.armas[f] === 'function'; }
  function openPercha(q) { closePanel(); fixContainers(); panel = { kind: 'percha', q: q, i: 0 }; sfx('ui.open', {}); renderPercha(); }
  function heldInfo() { if (!armas('heldInfo')) return null; try { return ACH.armas.heldInfo(); } catch (e) { return null; } }
  function full(o) { return !o || !(o.max > 0) || Math.round(o.dur) >= Math.round(o.max); }
  function durTxt(o) { return o && o.max ? Math.max(0, Math.round(o.dur)) + '/' + Math.round(o.max) : ''; }
  function durBar(parent, o) {
    var bar = el('span', 'bz-dur', parent), i = el('i', '', bar), fr = o && o.max ? clamp(o.dur / o.max, 0, 1) : 0;
    i.style.width = Math.round(fr * 100) + '%'; if (fr < 0.34) bar.classList.add('low');
  }
  function renderPercha(msgTxt) {
    var q = panel.q, hooks = S.armeros[q.uid], hd = heldInfo(), uhu = (call(ACH.inv, 'count', 'uhu') | 0);
    var f = pnlFrame('PERCHA DE ARMAS', '↑↓ elige · ENTER cuelga o agarra · U repara con Uhu · ESC o E cierra');
    var api = armas('stow') && armas('equip');
    var rows = [];
    var hand = el('div', 'bz-row bz-hand' + (panel.i === 0 ? ' sel' : ''), f.body);
    el('span', 'bz-lbl', hand, 'EN LA MANO:');
    if (hd) { var cv = el('canvas', 'bz-ic', hand); iconInto(cv, hd.id); el('span', 'bz-nm', hand, itemName(hd.id)); durBar(hand, hd); el('span', 'bz-dt', hand, durTxt(hd)); }
    else el('span', 'bz-nm dim', hand, 'nada (solo la guitarra)');
    var bh = el('button', 'bz-btn', hand, 'COLGAR LO DE LA MANO'); bh.type = 'button'; bh.disabled = !hd || !api || !hooks.some(function (h) { return !h; });
    bh.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); panel.i = 0; hang(); });
    rows.push(hand);
    for (var i = 0; i < hooks.length; i++) {
      var h = hooks[i], row = el('div', 'bz-row' + (panel.i === i + 1 ? ' sel' : ''), f.body);
      el('span', 'bz-lbl', row, 'CLAVO ' + (i + 1));
      if (h) {
        var c2 = el('canvas', 'bz-ic', row); iconInto(c2, h.id); el('span', 'bz-nm', row, itemName(h.id)); durBar(row, h); el('span', 'bz-dt', row, durTxt(h));
        var ba = el('button', 'bz-btn', row, hd ? 'CAMBIAR' : 'AGARRAR'); ba.type = 'button'; ba.disabled = !api;
        var br = el('button', 'bz-btn bz-uhu', row, 'REPARAR CON UHU (' + uhu + ')'); br.type = 'button'; br.disabled = !uhu || full(h);   // arreglos v0.11: apagado si ya está al 100 % (también 29,6/30, que se ve «30/30»)
        (function (idx) {
          ba.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); panel.i = idx + 1; take(idx); });
          br.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); panel.i = idx + 1; repair(idx); });
        })(i);
      } else el('span', 'bz-nm dim', row, '— clavo libre —');
      rows.push(row);
    }
    f.msg.textContent = msgTxt || (api ? '' : 'La percha todavía no engancha con las armas (falta ACH.armas.stow/equip).');
  }
  function hang(slot) {
    var hooks = S.armeros[panel.q.uid];
    if (!armas('stow')) { renderPercha('Falta ACH.armas.stow.'); return; }
    if (!heldInfo()) { renderPercha('No tienes nada en la mano, causa.'); return; }
    var i = slot != null && !hooks[slot] ? slot : hooks.indexOf(null);
    if (i < 0) { renderPercha('La percha está llena.'); return; }
    var got = null; try { got = ACH.armas.stow(); } catch (e) { got = null; }
    if (!got) { renderPercha('No se pudo colgar.'); return; }
    hooks[i] = { id: got.id, dur: got.dur, max: got.max }; save(); sfx('ui.ok', {});
    renderPercha(itemName(got.id) + ' colgado en el clavo ' + (i + 1) + '.');
  }
  function take(i) {
    var hooks = S.armeros[panel.q.uid], h = hooks[i]; if (!h) { hang(i); return; }
    if (!armas('equip')) { renderPercha('Falta ACH.armas.equip.'); return; }
    var swapped = null;
    if (heldInfo()) { try { swapped = ACH.armas.stow(); } catch (e) { swapped = null; } if (!swapped) { renderPercha('No se pudo soltar lo de la mano.'); return; } }
    var ok = false; try { ok = ACH.armas.equip(h.id, h.dur); } catch (e) { ok = false; }
    if (!ok) {
      if (swapped) { try { ACH.armas.equip(swapped.id, swapped.dur); } catch (e2) { /* nada */ } }
      renderPercha('No se pudo agarrar ' + itemName(h.id) + '.'); return;
    }
    hooks[i] = swapped ? { id: swapped.id, dur: swapped.dur, max: swapped.max } : null;
    save(); sfx('ui.ok', {});
    renderPercha(swapped ? 'Cambiaste: ' + itemName(h.id) + ' a la mano, ' + itemName(swapped.id) + ' al clavo.' : itemName(h.id) + ' a la mano. ¡A la calle!');
  }
  function repair(i) {
    var h = S.armeros[panel.q.uid][i]; if (!h) return;
    if (full(h)) { renderPercha('Está al cien, causa. Guarda el Uhu.'); return; }
    if (!call(ACH.inv, 'take', 'uhu', 1)) { renderPercha('No tienes Uhu en la mochila.'); return; }
    h.dur = Math.min(h.max, h.dur + Math.ceil(h.max * 0.6)); save(); sfx('item.use', { id: 'uhu' });
    renderPercha('¡Chisguetazo de Uhu! ' + itemName(h.id) + ' ' + durTxt(h) + '.');
  }
  // --- v0.13 T2 (P): mesa de luthier (taller) ---
  function openTaller(q) { closePanel(); panel = { kind: 'taller', q: q, i: 0 }; sfx('ui.open', {}); renderTaller(); }
  function tallerFirst() { for (var i = 0; i < MEJORAS.length; i++) if (!tHas(MEJORAS[i].id)) return i; return 0; }
  function renderTaller(msgTxt) {
    var c = coinsNow();
    var f = pnlFrame('MESA DE LUTHIER', '↑↓ elige · ENTER compra · ESC o E cierra · lo que mejoras aquí es para siempre');
    var hd = el('div', 'bz-row bz-hand', f.body);
    el('span', 'bz-lbl', hd, 'TIENES:'); el('span', 'bz-nm', hd, c + (c === 1 ? ' sencillo' : ' sencillos'));
    var st = ACH.hab && ACH.hab.stats ? call(ACH.hab, 'stats') : null;
    if (st) el('span', 'bz-dt', hd, 'mochila ' + tSlots() + ' · guitarra ' + (st.guitarMax || '?') + ' · golpe ' + String(st.atkDmg).replace('.', ','));
    panel.rows = [];
    MEJORAS.forEach(function (m, i) {
      var has = tHas(m.id), lock = m.pide && !tHas(m.pide);
      var row = el('div', 'bz-row' + (panel.i === i ? ' sel' : '') + (has ? ' dim' : ''), f.body);
      el('span', 'bz-lbl', row, has ? '✔ HECHO' : 'S/ ' + m.precio);
      var nm = el('span', 'bz-nm', row, m.name); nm.title = m.desc;
      el('span', 'bz-dt', row, m.desc);
      var b = el('button', 'bz-btn', row, has ? 'LISTO' : lock ? 'PIDE ' + MEJ[m.pide].name : 'MEJORAR'); b.type = 'button';
      b.disabled = has || lock || c < m.precio;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); panel.i = i; tallerBuy(i); });
      panel.rows.push(row);
    });
    f.msg.textContent = msgTxt || (MEJORAS.every(function (m) { return tHas(m.id); }) ? 'Todo mejorado. La viola está lista para el gran concierto.' : '');
  }
  function tallerBuy(i) {
    var m = MEJORAS[i]; if (!m) return;
    var r = tBuy(m.id);
    if (r.ok) { sfx('shop.buy', { id: m.id }); sfx('ui.ok', {}); } else sfx('ui.back', {});
    renderTaller(r.msg || '');
  }
  // --- v0.13 T2 (P): el escenario del concierto ---
  function stageTalk() {
    var C = ACH.concierto, n = 0, falta = [];
    PIEZAS.forEach(function (id) { if (piezaTiene(id)) n++; else falta.push(C && C.nombre ? C.nombre(id).toLowerCase() : id); });
    if (n >= 4) toast('¡El escenario está completo! Setlist, parlante, micro y ampli. Ya casi, causa.');
    else if (!n) toast('Aquí va a ser el gran concierto. Falta todo: ' + falta.join(', ') + '.');
    else toast('Piezas del concierto: ' + n + '/4. Falta ' + falta.join(', ') + '.');
    sfx('ui.ok', {});
  }
  // --- menú de ESC ---
  function openMenu() {
    closePanel(); panel = { kind: 'menu', i: 0 };
    var f = pnlFrame('MI CUARTO', '↑↓ elige · ENTER acepta · ESC vuelve');
    var opts = [['SALIR DEL CUARTO', function () { exit(); }], ['SEGUIR AQUÍ', function () { closePanel(); }], ['DECORAR (C)', function () { closePanel(); toggleDecor(true); }]];
    panel.opts = opts; panel.btns = [];
    for (var i = 0; i < opts.length; i++) {
      var b = el('button', 'bz-btn bz-mi' + (i === 0 ? ' sel' : ''), f.body, opts[i][0]); b.type = 'button';
      (function (fn) { b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }); })(opts[i][1]);
      panel.btns.push(b);
    }
  }
  function panelKey(e, c) {
    var shift = e.shiftKey;
    if (c === 'Escape' || (c === 'KeyE' && panel.kind !== 'menu')) { closePanel(); sfx('ui.back', {}); return; }
    if (panel.kind === 'menu') {
      if (c === 'ArrowUp' || c === 'KeyW') panel.i = (panel.i + panel.opts.length - 1) % panel.opts.length;
      else if (c === 'ArrowDown' || c === 'KeyS') panel.i = (panel.i + 1) % panel.opts.length;
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { panel.opts[panel.i][1](); return; }
      else if (c === 'KeyH') { exit(); return; }
      for (var j = 0; j < panel.btns.length; j++) panel.btns[j].classList.toggle('sel', j === panel.i);
      return;
    }
    if (panel.kind === 'baul') {
      var n = panel.side === 0 ? Math.max(12, bagSlots().length) : S.baules[panel.q.uid].length, cols = 4;
      if (c === 'Tab') { panel.side = 1 - panel.side; panel.i = 0; }
      else if (c === 'ArrowRight' || c === 'KeyD') { if (panel.side === 0 && panel.i % cols === cols - 1) { panel.side = 1; panel.i -= cols - 1; } else panel.i = Math.min(n - 1, panel.i + 1); }
      else if (c === 'ArrowLeft' || c === 'KeyA') { if (panel.side === 1 && panel.i % cols === 0) { panel.side = 0; panel.i += cols - 1; } else panel.i = Math.max(0, panel.i - 1); }
      else if (c === 'ArrowDown' || c === 'KeyS') panel.i = Math.min(n - 1, panel.i + cols);
      else if (c === 'ArrowUp' || c === 'KeyW') panel.i = Math.max(0, panel.i - cols);
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { moveSlot(panel.side, panel.i, shift); return; }
      var n2 = panel.side === 0 ? Math.max(12, bagSlots().length) : S.baules[panel.q.uid].length; panel.i = clamp(panel.i, 0, n2 - 1);
      renderBaul();
      return;
    }
    if (panel.kind === 'taller') {
      var nt = MEJORAS.length;
      if (c === 'ArrowUp' || c === 'KeyW') panel.i = (panel.i + nt - 1) % nt;
      else if (c === 'ArrowDown' || c === 'KeyS') panel.i = (panel.i + 1) % nt;
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { tallerBuy(panel.i); return; }
      renderTaller();
      return;
    }
    if (panel.kind === 'percha') {
      var nh =S.armeros[panel.q.uid].length + 1;
      if (c === 'ArrowUp' || c === 'KeyW') panel.i = (panel.i + nh - 1) % nh;
      else if (c === 'ArrowDown' || c === 'KeyS') panel.i = (panel.i + 1) % nh;
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { if (panel.i === 0) hang(); else take(panel.i - 1); return; }
      else if (c === 'KeyU') { if (panel.i > 0) repair(panel.i - 1); return; }
      renderPercha();
    }
  }

  /* ---------------- DECORAR ---------------- */
  var decor = false, sel = null, ghostRot = 0, ghost = null, ghostLock = null, barSig = '';
  function almacenList() { var a = []; for (var id in S.almacen) if (S.almacen[id] > 0 && CAT()[id]) a.push(id); return a; }
  function toggleDecor(v) {
    decor = v === undefined ? !decor : !!v;
    if (D) D.root.classList.toggle('decor', decor);
    ghostLock = null;
    if (decor) { var l = almacenList(); if (sel && !S.almacen[sel]) sel = null; if (!sel && l.length) sel = l[0]; sfx('ui.open', {}); }
    else sel = null;
    barSig = ''; renderBar();
  }
  function renderBar() {
    if (!D) return;
    var l = almacenList(), sig = l.map(function (id) { return id + ':' + S.almacen[id]; }).join(',') + '|' + sel + '|' + d2Ready();
    if (sig !== barSig) {
      barSig = sig; D.barList.innerHTML = '';
      if (!l.length) el('span', 'bz-empty', D.barList, 'El almacén está vacío. Compra muebles en los puestos o ármalos en el recetario (L).');
      l.forEach(function (id, k) {
        var b = el('button', 'bz-it' + (id === sel ? ' sel' : ''), D.barList); b.type = 'button'; b.title = CAT()[id].name;
        var ic = icon(id, 20), cv = el('canvas', '', b); cv.width = ic.width; cv.height = ic.height; ctx2(cv).drawImage(ic, 0, 0);
        el('b', '', b, '×' + S.almacen[id]);
        if (k < 9) el('i', '', b, String(k + 1));
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); sel = sel === id ? null : id; ghostLock = null; barSig = ''; renderBar(); });
      });
    }
    var info = '';
    if (sel) { var d = CAT()[sel]; info = d.name + ' — ' + d.desc + (ghost && !ghost.ok ? '  ✗ ' + ghost.why : ''); }
    else info = 'Elige un mueble de abajo (1–9) para ponerlo · clic derecho o ⌫ sobre un mueble lo guarda.';
    if (D.barInfo.textContent !== info) D.barInfo.textContent = info;
    D.barInfo.classList.toggle('bad', !!(ghost && !ghost.ok));
  }
  function cycleSel(dir) { var l = almacenList(); if (!l.length) return; var i = l.indexOf(sel); sel = l[(i + dir + l.length) % l.length]; ghostLock = null; renderBar(); }
  function rotateGhost() { if (!sel) { toast('Elige un mueble primero.'); return; } var d = CAT()[sel]; if (d.w === d.h || d.tipo === 'pared') { toast('Ese no se gira, causa.'); return; } ghostRot = ghostRot ? 0 : 1; sfx('ui.move', {}); }
  function mouseActive() { return now() - mouse.t < 2; }
  // esquina de arriba a la izquierda de la huella para un punto del mundo (x, y)
  function rcAt(id, rot, x, y, prefAz) {
    var d = CAT()[id], m = dims(id, rot), c = clamp(Math.floor(x / T - m.w / 2 + 0.5), 0, COLS - m.w), r0 = rowOfY(y), r;
    if (d.tipo === 'pared') return { c: c, r: WALL_R };
    if (r0 === 99) r0 = ROOM_ROWS - 1; else if (r0 === WALL_R) r0 = prefAz ? AZ_R0 + AZ_ROWS - 1 : 0; else if (r0 === -99) r0 = AZ_R0;
    r = r0 - Math.floor((m.h - 1) / 2);
    if (inRoom(r0)) r = clamp(r, 0, ROOM_ROWS - m.h); else r = clamp(r, AZ_R0, AZ_R0 + AZ_ROWS - m.h);
    return { c: c, r: r };
  }
  function computeGhost() {
    if (!decor || !sel) { ghost = null; return; }
    var d = CAT()[sel], rot = d.tipo === 'pared' || d.w === d.h ? 0 : ghostRot, m = dims(sel, rot), at;
    if (ghostLock) at = ghostLock;
    else if (mouseActive()) at = rcAt(sel, rot, mouse.x, mouse.y);
    else { var v = DIRV[bp.dir] || [0, 1]; at = rcAt(sel, rot, bp.x + v[0] * (8 + m.w * 8), bp.y - 4 + v[1] * (8 + m.h * 8), bp.y < BAND_TOP); }
    var chk = canPlace(sel, at.c, at.r, rot, null);
    ghost = { id: sel, c: at.c, r: at.r, rot: rot, ok: chk.ok, why: chk.why || '' };
  }
  function placeGhost() {
    computeGhost();
    if (!ghost) { toast(almacenList().length ? 'Elige un mueble primero.' : 'No tienes muebles guardados.'); return; }
    if (!ghost.ok) { toast(ghost.why || 'No cabe ahí.'); sfx('ui.no', {}); return; }
    var q = { uid: newUid(), id: ghost.id, c: ghost.c, r: ghost.r, rot: ghost.rot };
    S.puestos.push(q); addAlmacen(ghost.id, -1); fixContainers(); rebuildOcc(); save(); sfx('base.poner', { id: q.id }); sfx('ui.ok', {});
    ghostLock = null;
    if (!S.almacen[sel]) { var l = almacenList(); sel = l[0] || null; }
    barSig = ''; renderBar();
  }
  function removePuesto(q) {
    var d = CAT()[q.id];
    if (d.baul && (S.baules[q.uid] || []).some(Boolean)) { toast('Vacíalo primero, causa.'); sfx('ui.no', {}); return false; }
    if (d.armero && (S.armeros[q.uid] || []).some(Boolean)) { toast('Descuelga las armas primero, causa.'); sfx('ui.no', {}); return false; }
    S.puestos.splice(S.puestos.indexOf(q), 1); delete S.baules[q.uid]; delete S.armeros[q.uid];
    addAlmacen(q.id, 1); rebuildOcc(); save(); sfx('base.quitar', { id: q.id }); toast(d.name + ' al almacén.');
    barSig = ''; renderBar();
    return true;
  }
  function removeTarget(wx, wy) {
    var q = null;
    if (wx != null) q = puestoAt(Math.floor(wx / T), rowOfY(wy));
    else if (mouseActive()) q = puestoAt(Math.floor(mouse.x / T), rowOfY(mouse.y));
    if (!q) { var n = nearest(); q = n && n.q; }
    if (!q) { toast('Acércate a un mueble para guardarlo.'); return false; }
    return removePuesto(q);
  }
  function onCanvasDown(e) {
    if (!open || panel || busy()) return;
    var w = toWorld(e); mouse.x = w.x; mouse.y = w.y;
    if (e.pointerType === 'mouse') mouse.t = now();
    if (decor) {
      if (e.button === 2) { removeTarget(w.x, w.y); return; }
      if (!sel) { var q = puestoAt(Math.floor(w.x / T), rowOfY(w.y)); if (q && e.pointerType !== 'mouse') removePuesto(q); return; }
      if (e.pointerType !== 'mouse') {   // toque: el primero mueve el fantasma, el segundo en el mismo sitio lo pone
        var d = CAT()[sel], at = rcAt(sel, d.tipo === 'pared' || d.w === d.h ? 0 : ghostRot, w.x, w.y);
        if (ghostLock && ghostLock.c === at.c && ghostLock.r === at.r) placeGhost(); else ghostLock = at;
        return;
      }
      placeGhost(); return;
    }
    if (e.button === 0) { bp.tx = clamp(w.x, 4, COLS * T - 5); bp.ty = clamp(w.y, AZ_TOP + 6, ROOM_BOT - 3); bp.stuck = 0; }
  }

  /* ---------------- dibujo ---------------- */
  var cam = { x: 0, y: 0 }, tintCache = {};
  function tinted(spr, ok) {
    var k = '__tint' + (ok ? 'G' : 'R');
    if (spr[k]) return spr[k];
    var c = mk(spr.width, spr.height), g = c.getContext('2d');
    g.drawImage(spr, 0, 0); g.globalCompositeOperation = 'source-atop';
    g.fillStyle = ok ? 'rgba(31,224,122,.55)' : 'rgba(255,46,90,.6)'; g.fillRect(0, 0, c.width, c.height);
    spr[k] = c; return c;
  }
  function muebleXY(q, spr) {
    var d = CAT()[q.id], m = dims(q.id, q.rot);
    var x = q.c * T + Math.floor((m.w * T - spr.width) / 2);
    if (d.tipo === 'pared') return { x: x, y: BAND_TOP + (q.id === 'foco' ? 6 : 10) };
    return { x: x, y: rowY(q.r + m.h - 1) + T - spr.height + (spr.placeholder && d.tipo !== 'alfombra' ? 1 : 0) };
  }
  function variantOf(q, t) {
    var d = CAT()[q.id];
    if (d.luz) return q.off ? 'off' : 'on';
    if (d.sonido === 'radio') return S.radio ? 'play' : 'idle';
    if (d.sonido === 'cajon') return cajonT > 0 ? 'play' : 'idle';
    if (d.palomar) return titinaHere() ? 'titina' : 'idle';
    return 'idle';
  }
  function frameNo(q, t) { var d = CAT()[q.id]; return d.parpadea ? Math.floor(t * 2) % 2 : (d.sonido && (S.radio || cajonT > 0) ? Math.floor(t * 4) % 2 : 0); }
  function drawHooks(g, q) {
    var hooks = S.armeros[q.uid]; if (!hooks) return;
    var m = dims(q.id, q.rot), w = m.w * T;
    for (var i = 0; i < hooks.length; i++) {
      var h = hooks[i]; if (!h) continue;
      var s = weaponIcon(h.id); if (!s) continue;   // arreglos v0.11
      var k = Math.min(1, 16 / Math.max(s.width, s.height)), sw = Math.max(1, Math.round(s.width * k)), sh = Math.max(1, Math.round(s.height * k));   // cabe en el clavo
      var hx = q.c * T + 4 + i * Math.floor((w - 8) / Math.max(1, hooks.length - 1)) - Math.floor(sw / 2);
      g.drawImage(s, hx, BAND_TOP + 17, sw, sh);
    }
  }
  // v0.13 T2 (P): tarima + piezas (ACH.sprites.base.concierto de arte-base.js; si falta, los íconos de ACH.concierto). Las que faltan: silueta de tiza.
  var stageFB = {};
  function stageSpr(id) {
    var A = dig("base.concierto"), s = A && A[id];
    if (isCanvas(s)) return s;
    if (stageFB[id]) return stageFB[id];
    var c = null; try { c = ACH.concierto && ACH.concierto.icono ? ACH.concierto.icono(id, 1) : null; } catch (e) { c = null; }
    if (!c) { c = mk(id === "tarima" ? 48 : 12, id === "tarima" ? 12 : 14); var g2 = ctx2(c); g2.fillStyle = id === "tarima" ? "#5a4030" : "#8a8494"; g2.fillRect(0, 0, c.width, c.height); }
    if (c.ax === undefined) { c.ax = Math.floor(c.width / 2); c.ay = c.height; }
    return (stageFB[id] = c);
  }
  var PIEZA_X = { parlante: 7, microfono: 19, setlist: 29, ampli: 40 };
  function drawStage(g, ox, oy, t) {
    var E = S.escenario, x0 = E.c * T + ox, yb = rowY(E.r) + T + oy, tar = stageSpr("tarima");
    g.drawImage(tar, x0, yb - tar.height);
    var top = yb - (tar.top != null ? tar.top : tar.height - 3);
    for (var i = 0; i < PIEZAS.length; i++) {
      var id = PIEZAS[i], has = piezaTiene(id), s = stageSpr(has ? id : id + "_tiza");
      if (!has && !isCanvas(dig("base.concierto." + id + "_tiza"))) { g.globalAlpha = 0.22; s = stageSpr(id); }
      g.drawImage(s, x0 + PIEZA_X[id] - (s.ax != null ? s.ax : s.width / 2), top - (s.ay != null ? s.ay : s.height));
      g.globalAlpha = 1;
    }
  }
  function render(t) {
    var g = D.g, cv = D.cv, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    var vw = (G() && G().view && G().view.w) || V.w || 480, vh = (G() && G().view && G().view.h) || V.h || 270;
    if (cv.width !== vw || cv.height !== vh) { cv.width = vw; cv.height = vh; g = D.g = ctx2(cv); }
    g.imageSmoothingEnabled = false;
    bakeRoom(); bakeBack(vw, vh); if (!fogC) bakeFog(); bakeLight();
    // cámara: centrada en x; en y sigue a Alexander dentro de los bordes de la escena
    var topUI = 18, botUI = decor ? 44 : 6, avail = vh - topUI - botUI;
    cam.x = Math.round(SX0 - (vw - SW) / 2);
    var ty = SH <= avail ? SY0 - topUI - (avail - SH) / 2 : clamp(bp.y - 12 - topUI - avail / 2, SY0 - topUI, SY0 + SH - (vh - botUI));
    if (cam.yf == null) cam.yf = ty; else cam.yf += (ty - cam.yf) * 0.15;
    cam.y = Math.round(cam.yf);
    var ox = -cam.x, oy = -cam.y, xx;
    g.drawImage(backC, 0, 0);
    if (horizC) { var hx0 = ((ox % horizC.width) + horizC.width) % horizC.width - horizC.width; for (xx = hx0; xx < vw; xx += horizC.width) g.drawImage(horizC, xx, AZ_TOP - horizC.height + oy); }
    var fx = -((t * 5) % fogC.width);
    g.globalAlpha = 0.7; for (xx = fx; xx < vw; xx += fogC.width) g.drawImage(fogC, Math.round(xx), AZ_TOP - 50 + oy); g.globalAlpha = 1;
    g.fillStyle = '#16141a'; g.fillRect(0, ROOM_BOT + 6 + oy, vw, vh);                     // debajo del cuarto: el edificio, a oscuras
    g.drawImage(roomC, SX0 + ox, SY0 + oy);
    var i, q, d, spr, p, list = [];
    // alfombras (debajo de todo) y pared
    for (i = 0; i < S.puestos.length; i++) {
      q = S.puestos[i]; d = CAT()[q.id]; if (!d) continue;
      spr = mueble(q.id, q.rot, variantOf(q, t), frameNo(q, t));
      p = muebleXY(q, spr);
      if (d.tipo === 'alfombra') g.drawImage(spr, p.x + ox, p.y + oy);
      else if (d.tipo === 'pared') { g.drawImage(spr, p.x + ox, p.y + oy); if (d.armero) { g.save(); g.translate(ox, oy); drawHooks(g, q); g.restore(); } }
      else list.push({ y: rowY(q.r + dims(q.id, q.rot).h - 1) + T - 1, spr: spr, x: p.x, yy: p.y, q: q });
    }
    // y-sort: muebles de piso, Alexander y el tanque
    list.push({ y: bp.y, alex: true });
    if (S.escenario) list.push({ y: rowY(S.escenario.r) + T - 2, stage: true });   // v0.13 T2: escenario del concierto
    var tb = rowY(TANK.r + 1) + T;
    list.push({ y: tb - 1, spr: tankC, x: TANK.c * T + 16 - (tankC.ax != null ? tankC.ax : 16), yy: tb - (tankC.ay != null ? tankC.ay : tankC.height) });
    list.sort(function (a, b) { return a.y - b.y; });
    var pal = palomarQ();
    for (i = 0; i < list.length; i++) {
      var it = list[i];
      if (it.stage) { drawStage(g, ox, oy, t); continue; }
      if (it.alex) {
        var a = alexSprite();
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(Math.round(bp.x) - 5 + ox, Math.round(bp.y) - 1 + oy, 10, 3);
        g.drawImage(a, Math.round(bp.x) - a.ax + ox, Math.round(bp.y) - a.ay + oy);
        var hs = heldSprite(); if (hs) g.drawImage(hs, Math.round(bp.x) + (bp.dir === 'left' ? -10 : 3) - Math.floor(hs.width / 2) + ox, Math.round(bp.y) - 8 - hs.height + oy);
        continue;
      }
      g.drawImage(it.spr, it.x + ox, it.yy + oy);
      if (it.q && pal === it.q && titinaHere() && it.spr.placeholder !== true && !d2HasTitina(it.q.id)) {   // D2 sin versión con Titina
        var ti = ACH.gfx && ACH.gfx.titina ? ACH.gfx.titina(0) : null; if (ti) g.drawImage(ti, it.x + Math.floor(it.spr.width / 2) - (ti.ax || 4) + ox, it.yy + 4 - (ti.ay || 6) + oy);
      }
    }
    // cordel con ropa (por encima: le tapa la cabeza al pasar)
    var cc = cordelC[Math.floor(t / 0.6) % 2] || cordelC[0];
    if (cc) g.drawImage(cc, 72 - (cc.ax != null ? cc.ax : cc.width / 2) + ox, rowY(AZ_R0 + 2) + 8 - (cc.ay != null ? cc.ay : cc.height) + oy);
    // fantasma de DECORAR
    computeGhost();
    if (ghost) {
      var gs = mueble(ghost.id, ghost.rot, 'on', 0), gp = muebleXY(ghost, gs), m = dims(ghost.id, ghost.rot);
      g.globalAlpha = 0.85; g.drawImage(tinted(gs, ghost.ok), gp.x + ox, gp.y + oy); g.globalAlpha = 1;
      g.fillStyle = ghost.ok ? '#1fe07a' : '#ff2e5a';
      var rx = ghost.c * T + ox, ry = (ghost.r === WALL_R ? BAND_TOP + 6 : rowY(ghost.r)) + oy, rw = m.w * T, rh = ghost.r === WALL_R ? 32 : m.h * T;
      g.fillRect(rx, ry, rw, 1); g.fillRect(rx, ry + rh - 1, rw, 1); g.fillRect(rx, ry, 1, rh); g.fillRect(rx + rw - 1, ry, 1, rh);
    }
    // luz
    var lc = lightC[Math.floor(t * 2) % 2] || lightC[0];
    if (lc) g.drawImage(lc, SX0 + ox, SY0 + oy);
    // neblina sobre la azotea
    var f2 = fogC2 || fogC, fx2 = -((t * 9) % f2.width);
    g.globalAlpha = 0.5; for (xx = fx2; xx < vw; xx += f2.width) g.drawImage(f2, Math.round(xx), AZ_TOP + 4 + oy); g.globalAlpha = 1;
    // notitas (radio y cajón)
    var ns = noteSprites();
    for (i = 0; i < notes.length; i++) { var n = notes[i]; g.globalAlpha = clamp(1.4 - n.t / n.life * 1.4, 0, 1); g.drawImage(ns[n.k], Math.round(n.x) + ox, Math.round(n.y) + oy); }
    g.globalAlpha = 1;
  }

  /* ---------------- bucle ---------------- */
  var open = false, raf = 0, lastT = 0, clock = 0, onExitCb = null, selfState = null, radioNoteT = 0, hintTxt = '';
  function tick() {
    raf = 0; if (!open) return;
    var tn = now(), dt = Math.min(0.05, Math.max(0, tn - (lastT || tn))); lastT = tn; clock += dt;
    try { step(dt); render(clock); } catch (e) { console.warn('[base] cuadro', e); }
    raf = requestAnimationFrame(tick);
  }
  function invOpenNow() { try { return !!(ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen()); } catch (e) { return false; } }
  function step(dt) {
    var under = invOpenNow();
    if (dlgOn()) dlgGuard = now() + DLG_GUARD;   // v0.13 (F5)
    D.root.classList.toggle('under', under);
    if (!panel && !busy() && !under) movePlayer(dt); else { bp.moving = false; bp.animT = 0; }
    if (cajonT > 0) cajonT -= dt;
    if (S.radio) { radioNoteT -= dt; if (radioNoteT <= 0) { radioNoteT = 0.7; for (var i = 0; i < S.puestos.length; i++) if (CAT()[S.puestos[i].id] && CAT()[S.puestos[i].id].sonido === 'radio') { var q = S.puestos[i]; burstNotes(q.c * T + 8, rowY(q.r) - 4, 1); } } }
    for (var j = notes.length - 1; j >= 0; j--) { var n = notes[j]; n.t += dt; n.y -= 14 * dt; n.x += n.vx * dt + Math.sin(n.t * 6) * 0.2; if (n.t > n.life) notes.splice(j, 1); }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) D.toast.classList.remove('on'); }
    if (fadeS) {
      fadeS.t += dt; var k = clamp(fadeS.t / fadeS.dur, 0, 1), v = fadeS.from + (fadeS.to - fadeS.from) * k;
      D.fade.style.opacity = v.toFixed(3); D.fade.style.display = v > 0.001 ? 'block' : 'none';
      if (k >= 1) { var cb = fadeS.done; fadeS = null; if (cb) cb(); }
    }
    // aviso «E · …»
    var h = '';
    if (!panel && !decor) { var nn = nearest(), a = actionOf(nn); if (a) h = 'E · ' + a; }
    if (h !== hintTxt) { hintTxt = h; D.hint.textContent = h; D.hint.classList.toggle('on', !!h); D.use.classList.toggle('on', !!h); }
    if (decor) renderBar();
  }

  /* ---------------- teclado ---------------- */
  var keys = { up: false, down: false, left: false, right: false };
  var KMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  function clearKeys() { keys.up = keys.down = keys.left = keys.right = false; }
  function onKeyDown(e) {
    if (!open) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;                       // atajos del navegador
    var c = e.code || e.key;
    if (/^F\d+$/.test(c)) return;                                       // F1–F12 (consola, recargar)
    if (invOpenNow()) return;                                           // la mochila o el recetario mandan sus teclas
    e.preventDefault(); e.stopImmediatePropagation();
    if (dlgOn()) { dlgGuard = now() + DLG_GUARD; return; }   // el diálogo ya tomó lo suyo (su oyente corre antes)
    if (fadeS && c !== 'KeyH') return;
    if (now() < dlgGuard && (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyE')) return;   // v0.13 (F5): el Enter de más tras el diálogo no usa la escalera           // H siempre baja a la calle
    if (panel) { if (!e.repeat || /Arrow/.test(c)) panelKey(e, c); return; }
    if (KMAP[c]) { keys[KMAP[c]] = true; return; }
    if (e.repeat) return;
    switch (c) {
      case 'KeyE': interact(); break;
      case 'Enter': case 'NumpadEnter': case 'Space': if (decor && sel) placeGhost(); else interact(); break;
      case 'KeyC': toggleDecor(); break;
      case 'KeyR': if (decor) rotateGhost(); break;
      case 'Backspace': case 'Delete': if (decor) removeTarget(); break;
      case 'Tab': if (decor) cycleSel(e.shiftKey ? -1 : 1); break;
      case 'BracketRight': case 'KeyX': if (decor) cycleSel(1); break;
      case 'BracketLeft': case 'KeyZ': if (decor) cycleSel(-1); break;
      case 'KeyH': exit(); break;
      case 'Escape': if (decor) toggleDecor(false); else openMenu(); break;
      case 'KeyI': if (call(ACH.inv, 'open') !== true) toast('La mochila se revisa en el baúl (E), causa.'); clearKeys(); break;
      case 'KeyL': if (ACH.inv && typeof ACH.inv.openRecipes === 'function') { if (call(ACH.inv, 'openRecipes') === false) toast('El recetario no abre aquí.'); } else toast('El recetario todavía no llega.'); clearKeys(); break;
      default:
        var m = /^Digit([1-9])$/.exec(c);
        if (m && decor) { var l = almacenList(), id = l[+m[1] - 1]; if (id) { sel = id; ghostLock = null; barSig = ''; renderBar(); } }
    }
  }
  // v0.13 (F5): mientras hay diálogo (y un ratito después) Enter / Espacio / E no usan nada del cuarto
  var dlgGuard = 0, DLG_GUARD = 0.6;
  function dlgOn() { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); }
  function onKeyUp(e) { var c = e.code || e.key; if (KMAP[c]) keys[KMAP[c]] = false; }   // el keyup pasa al juego (sin teclas pegadas)
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', clearKeys);

  /* ---------------- API ---------------- */
  function enter(opts) {
    if (open) return false;
    opts = opts || {};
    ensure(); build();
    D.g = ctx2(D.cv);
    onExitCb = typeof opts.onExit === 'function' ? opts.onExit : null;
    var gg = G();
    selfState = null;
    if (gg && !onExitCb && (gg.state === 'playing' || gg.state === 'paused')) { selfState = gg.state; gg.state = 'base'; }   // a mano (pruebas): el juego no corre debajo
    bp = { x: (STAIR.c + STAIR.w) * T + 8, y: rowY(STAIR.r) + 12, dir: 'right', moving: false, animT: 0, tx: null, ty: null, stuck: 0 };
    if (!boxFree(bp.x, bp.y)) { bp.x = DOOR_C * T + 8; bp.y = 10; }
    clearKeys(); closePanel(); decor = false; sel = null; ghostLock = null; cam.yf = null; notes.length = 0;
    D.root.classList.remove('decor');
    open = true; lastT = 0;
    D.root.classList.add('on'); document.body.classList.add('base-on');
    D.fade.style.opacity = '1'; D.fade.style.display = 'block'; fadeTo(0, 0.35);
    call(ACH.input, 'reset');
    if (S.radio) sfx('base.radio', { on: true });
    sfx('base.enter', {});
    if (!S.visto) {
      var lines = [
        { quien: 'alexander', cara: 'feliz', texto: 'Mi cuarto de la azotea. Chiquito, pero con vista al Callao.' },
        { quien: 'alexander', cara: 'picaro', texto: 'Si consigo muebles en los puestos, esto queda bacán.' },
        { quien: 'alexander', cara: 'habla', texto: 'E para usar las cosas, C para decorar, H para bajar.' }
      ];
      var played = false;
      if (ACH.dialogo && typeof ACH.dialogo.play === 'function') {
        try { played = ACH.dialogo.play(lines, { onDone: function () { S.visto = true; save(); dlgGuard = now() + DLG_GUARD; }, pausaJuego: false }); } catch (e) { played = false; }
      }
      if (!played) { S.visto = true; save(); toast(lines[2].texto); }
    }
    if (!raf) raf = requestAnimationFrame(tick);
    return true;
  }
  function exit() {
    if (!open) return false;
    if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()) return false;   // el diálogo con retrato no se salta
    closePanel(); toggleDecor(false);
    open = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    fadeS = null;
    saveNow();
    if (D) { D.root.classList.remove('on', 'decor', 'under'); D.hint.classList.remove('on'); D.toast.classList.remove('on'); }
    document.body.classList.remove('base-on');
    clearKeys(); hintTxt = '';
    if (S.radio) sfx('base.radio', { on: false });
    sfx('base.exit', {});
    var gg = G();
    if (selfState && gg && gg.state === 'base') gg.state = selfState;
    selfState = null;
    call(ACH.input, 'reset');
    var cb = onExitCb; onExitCb = null;
    if (cb) { try { cb(); } catch (e) { console.warn('[base] onExit', e); } }
    return true;
  }
  function give(id, n) {
    if (!CAT()[id]) return false;
    ensure(); n = Math.max(1, Math.floor(n == null ? 1 : n));
    addAlmacen(id, n); save();
    if (CAT()[id].taller && autoPlace(id)) { if (!open) hudToast("¡" + CAT()[id].name + " ya está en tu cuarto! (E para usarla)"); else toast("¡" + CAT()[id].name + " puesta en el cuarto!"); return true; }
    if (!open) hudToast('¡' + CAT()[id].name + ' va a tu cuarto!');
    else { toast('¡' + CAT()[id].name + ' al almacén! (C para decorar)'); barSig = ''; renderBar(); }
    return true;
  }
  // v0.13 T2: la mesa de luthier se pone sola en el primer lugar libre (si no cabe, queda en el almacén para DECORAR)
  function autoPlace(id) {
    if (!(S.almacen[id] > 0)) return false;
    rebuildOcc(); var sp = findSpot(id);
    if (!sp || (open && !canPlace(id, sp.c, sp.r, 0, null).ok)) return false;
    S.puestos.push({ uid: newUid(), id: id, c: sp.c, r: sp.r, rot: 0 }); addAlmacen(id, -1); fixContainers(); rebuildOcc(); save();
    return true;
  }
  function owned(id) {
    ensure(); var n = S.almacen[id] | 0;
    for (var i = 0; i < S.puestos.length; i++) if (S.puestos[i].id === id) n++;
    return n;
  }
  var iconCache = {};
  function icon(id, size) {
    size = Math.max(8, (size | 0) || 24);
    var src = mueble(id, 0, CAT()[id] && CAT()[id].luz ? 'on' : 'idle', 0), key = id + '|' + size, c = iconCache[key];
    if (c && c.__src === src) return c;
    c = mk(size, size); var g = ctx2(c);
    var k = Math.min(size / src.width, size / src.height), s = k >= 1 ? Math.floor(k) : k;
    var w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    g.drawImage(src, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
    c.__src = src; iconCache[key] = c;
    return c;
  }
  function state() {
    ensure();
    var bauls = {}, k;
    for (k in S.baules) bauls[k] = S.baules[k].filter(Boolean).map(function (s) { return s.id + '×' + s.n; });
    return {
      open: open, decor: decor, sel: sel, ghost: ghost ? { id: ghost.id, c: ghost.c, r: ghost.r, rot: ghost.rot, ok: ghost.ok, why: ghost.why } : null,
      panel: panel ? panel.kind : null, storage: storeOK ? 'localStorage' : 'memoria',
      puestos: S.puestos.map(function (q) { return q.id + '@' + q.c + ',' + q.r + (q.rot ? 'r' : '') + (q.off ? ' (apagado)' : ''); }),
      almacen: JSON.parse(JSON.stringify(S.almacen)), baules: bauls, armeros: JSON.parse(JSON.stringify(S.armeros)), radio: S.radio, visto: S.visto,
      player: bp ? { x: Math.round(bp.x), y: Math.round(bp.y), dir: bp.dir } : null, near: bp && open ? actionOf(nearest()) : null,
      arteD2: d2Ready(), cuartoD2: !!dig('base.cuarto'), lights: lightsList().length,
      armasApi: { stow: armas('stow'), equip: armas('equip'), heldInfo: armas('heldInfo') }
    };
  }

  B.enter = enter; B.exit = exit; B.isOpen = function () { return open; };
  B.give = give; B.owned = owned; B.icon = icon; B.state = state;
  // extras (QA / otros agentes)
  B.place = function (id, c, r, rot) { ensure(); if (!(S.almacen[id] > 0)) return false; var chk = canPlace(id, c, r, rot ? 1 : 0, null); if (!chk.ok) return chk.why; S.puestos.push({ uid: newUid(), id: id, c: c, r: r, rot: rot ? 1 : 0 }); addAlmacen(id, -1); fixContainers(); rebuildOcc(); save(); return true; };
  B.interact = function () { return open ? interact() : false; };
  B.walkTo = function (x, y) { if (bp) { bp.tx = x; bp.ty = y; bp.stuck = 0; } };

  ACH.debug = ACH.debug || {};
  ACH.debug.v011 = ACH.debug.v011 || {};
  ACH.debug.v011.base = {
    state: state,
    giveAll: function (n) { var c = CAT(); for (var id in c) give(id, n || 1); return state().almacen; },
    clear: function () { try { window.localStorage.removeItem(KEY); } catch (e) { /* nada */ } memStore = null; S = null; ensure(); saveNow(); lightSig = ''; barSig = ''; if (open) renderBar(); return state(); },
    open: function () { if (ACH.game && typeof ACH.game.goBase === 'function') { try { var r = ACH.game.goBase(); if (r !== false) return 'goBase'; } catch (e) { /* abajo */ } } return enter({}); }
  };
})();
