/* ACHORADO v0.11 — js/engine/pausa.js → ACH.pausa: el menú de pausa chicha (ESC), en las dos páginas (index.html y miraflores.html).
   ACH.pausa = { open(), close(), isOpen(), addItem({id, label, onClick, order, enabled, note}), removeItem(id), addControl(teclas, texto),
                 fade(texto), unfade(ms), onState(s, prev) }   (ver V011.md §4)
   El menú vive dentro del afiche #pause de siempre (hud.js lo muestra con el estado 'paused'): a la izquierda la lista, a la derecha el volumen.
   game.js llama ACH.pausa.onState(s, prev) en cada setState. Teclado (↑/↓/W/S + ENTER/ESPACIO), mouse y toque.
   ESC en el menú lo deja pasar a game.js (reanuda); en una sub-pantalla (CONTROLES, ¿SALIR?) vuelve al menú.
   Todo lo de afuera (ACH.inv, ACH.base, ACH.game, ACH.cima, ACH.viaje) se llama protegido. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var items = [], controls = [], built = false, host = null, box = null, view = 'menu', sel = 0, rows = [];

  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function state() { var g = G(); return g ? g.state : null; }
  function isMira() { return !!(ACH.nivel && ACH.nivel.id === 'miraflores'); }
  function fnOk(o, f) { return !!(o && typeof o[f] === 'function'); }
  function call(o, f, a, b) { if (!fnOk(o, f)) return undefined; try { return o[f](a, b); } catch (e) { try { console.warn('[pausa] ' + f, e); } catch (x) { /* nada */ } return undefined; } }
  function sfx(n) { call(ACH.audio, 'emit', n); }
  function toast(t) { call(ACH.hud, 'toast', t); }
  // ¿se vuelve a jugar al cerrar? (la pausa automática también llega desde la intro o la muerte)
  function backPlaying() { var g = G(); return !!g && (!g.resumeTo || g.resumeTo === 'playing'); }
  function progress() { var p = call(ACH.viaje, 'progress'); return p || {}; }

  /* ---------------- Entradas ---------------- */
  function addItem(it) {
    if (!it || !it.id) return false;
    removeItem(it.id, true);
    items.push({ id: it.id, label: it.label || it.id, onClick: it.onClick, order: it.order == null ? 80 : +it.order, enabled: it.enabled, note: it.note, keep: it.keep });
    items.sort(function (a, b) { return a.order - b.order; });
    if (isOpen()) render();
    return true;
  }
  function removeItem(id, quiet) { for (var i = items.length - 1; i >= 0; i--) if (items[i].id === id) items.splice(i, 1); if (!quiet && isOpen()) render(); }
  function addControl(keys, text) { controls.push([keys, text]); }
  function evalEnabled(it) {
    if (it.enabled === undefined) return true;
    if (typeof it.enabled === 'function') { try { return !!it.enabled(); } catch (e) { return false; } }
    return !!it.enabled;
  }
  function evalNote(it) { return typeof it.note === 'function' ? (function () { try { return it.note() || ''; } catch (e) { return ''; } })() : (it.note || ''); }

  // Cierra la pausa y después hace fn (la mochila y el recetario solo abren con el juego en 'playing')
  function resumeThen(fn) { close(); if (state() === 'playing') { try { fn(); } catch (e) { try { console.warn('[pausa]', e); } catch (x) { /* nada */ } } } }

  addItem({ id: 'seguir', label: 'SEGUIR', order: 10, onClick: function () { close(); } });
  addItem({ id: 'mochila', label: 'MOCHILA (I)', order: 20,
    enabled: function () { return fnOk(ACH.inv, 'open') && backPlaying(); }, note: 'Ahorita no se puede, causa.',
    onClick: function () { resumeThen(function () { ACH.inv.open(); }); } });
  addItem({ id: 'recetario', label: 'RECETARIO (L)', order: 30,
    enabled: function () { return fnOk(ACH.inv, 'openRecipes') && backPlaying(); },
    note: function () { return fnOk(ACH.inv, 'openRecipes') ? 'Ahorita no se puede, causa.' : 'El recetario todavía no llega, causa.'; },
    onClick: function () { resumeThen(function () { ACH.inv.openRecipes(); }); } });
  addItem({ id: 'cuarto', label: 'MI CUARTO (H)', order: 40,
    enabled: function () { return fnOk(ACH.base, 'enter') && fnOk(ACH.game, 'goBase') && backPlaying(); },
    note: function () { return fnOk(ACH.base, 'enter') ? 'Ahorita no se puede, causa.' : 'Todavía no tienes cuarto, causa.'; },
    onClick: function () { var g = G(); if (g) g.baseMsg = null; if (ACH.game.goBase() === false) msg((g && g.baseMsg) || 'Ahorita no se puede, causa.'); } });   // v0.13: el motivo de ACH.dif.canEnterBase
  addItem({ id: 'mapa', label: 'MAPA DE LIMA', order: 50,
    enabled: function () { return mapOk(); },
    note: function () { return !(ACH.cima && ACH.cima.showMap) ? 'El mapa no está en esta página.' : !mapProg() ? 'Primero sal de la Gambetta, causa.' : 'Ahorita no se puede, causa.'; },
    onClick: function () { call(ACH.game, 'openMapPause'); } });
  addItem({ id: 'diario', label: 'DIARIO', order: 55, onClick: function () { go('diario'); } });   // v0.13 T2 (U · G4)
  addItem({ id: 'controles', label: 'CONTROLES', order: 60, onClick: function () { go('controles'); } });
  addItem({ id: 'opciones', label: 'OPCIONES', order: 65, onClick: function () { go('opciones'); } });   // v0.13 T2 (U · G5)
  addItem({ id: 'salir', label: 'SALIR AL TÍTULO', order: 90, onClick: function () { go('salir'); } });

  function mapProg() { return isMira() || !!progress().gambetta; }
  function mapOk() { return !!(ACH.cima && ACH.cima.showMap) && fnOk(ACH.game, 'openMapPause') && mapProg() && backPlaying(); }

  var CONTROLES = [   // v0.13: en el menú, ←/→ cambian la dificultad
    ['WASD / FLECHAS', 'moverse'], ['SHIFT', 'correr'], ['ESPACIO / CLIC', 'guitarrazo'], ['C', 'saltar'], ['Q', 'mandar a Titina'],
    ['E', 'agarrar · usar · hablar'], ['F', 'tirar (mantén F para tirar lejos)'], ['R', 'resortera / molotov'], ['1-4', 'objetos rápidos'],
    ['I / TAB', 'mochila'], ['L', 'recetario'], ['H', 'mi cuarto (y volver)'], ['M', 'silencio'], ['ESC / P', 'pausa · este menú'], ['◀ / ▶ (pausa)', 'dificultad']];

  /* ---------------- DOM ---------------- */
  function el(tag, cls, parent, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; }
  function build() {
    if (built) return !!box;
    var pz = document.getElementById('pause');
    if (!pz) {   // sin el afiche de hud.js: uno propio
      var st = document.getElementById('stage') || document.body; if (!st) return false;
      pz = el('div', 'screen dim', st); pz.id = 'pzOver';
      el('div', 'poster small', pz).appendChild(el('h2', null, null, 'PAUSA'));
    }
    host = pz.querySelector('.poster') || pz;
    host.classList.add('pz-host');
    box = el('div', 'pz', null); box.setAttribute('data-ui', '');
    var h2 = host.querySelector('h2');
    if (h2 && h2.nextSibling) host.insertBefore(box, h2.nextSibling); else host.appendChild(box);
    box.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    built = true;
    return true;
  }
  /* ---------------- v0.13: selector DIFICULTAD ◀ ACHORADO ▶ (panel lateral, con ACH.dif; respaldo ACH.difUI de partida.js) ---------------- */
  var difEl = null;
  function DU() { return ACH.difUI || null; }
  function difModes() { var m = ACH.dif && ACH.dif.MODOS; if (m && m.length) return m; var u = DU(); return u ? u.modos() : ['tranqui', 'achorado', 'bravazo']; }
  function difCur() { var m = call(ACH.dif, 'get'); if (difModes().indexOf(m) < 0) { var u = DU(); m = u ? u.get() : 'achorado'; } return difModes().indexOf(m) >= 0 ? m : 'achorado'; }
  function difName(m) { return call(ACH.dif, 'nombre', m) || (DU() ? DU().nombre(m) : String(m).toUpperCase()); }
  function difDesc(m) { return call(ACH.dif, 'desc', m) || (DU() ? DU().desc(m) : ''); }
  function difStep(d) {
    var L = difModes(), i = L.indexOf(difCur()), m = L[(i + d + L.length) % L.length];
    if (fnOk(ACH.dif, 'set')) call(ACH.dif, 'set', m); else if (DU()) DU().set(m);
    sfx('ui.ok'); difSync();
    var D = difEl && difEl.querySelector('.pz-dname'); if (D) { D.classList.remove('flash'); void D.offsetWidth; D.classList.add('flash'); }
  }
  function difBuild() {
    if (difEl || !host) return;
    difEl = el('div', 'pz-dif', null); difEl.setAttribute('data-ui', '');
    el('p', 'pz-dlbl', difEl, 'DIFICULTAD');
    var r = el('div', 'pz-drow', difEl);
    function arrow(t, d) {
      var b = el('button', 'pz-darr', r, t); b.type = 'button'; b.tabIndex = -1; b.setAttribute('data-ui', ''); b.setAttribute('aria-label', d < 0 ? 'Dificultad anterior' : 'Dificultad siguiente');
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); difStep(d); b.blur(); });
    }
    arrow('◀', -1); el('b', 'pz-dname', r, ''); arrow('▶', 1);
    el('p', 'pz-ddesc', difEl, '');
    difEl.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    var vols = host.querySelector('.vols');
    if (vols && vols.nextSibling) host.insertBefore(difEl, vols.nextSibling); else host.appendChild(difEl);
  }
  function difSync() {
    difBuild(); if (!difEl) return;
    var m = difCur();
    difEl.querySelector('.pz-dname').textContent = difName(m);
    difEl.querySelector('.pz-ddesc').textContent = difDesc(m);
  }


  /* ---------------- v0.13 T2 (U · G4): DIARIO — objetivo, piezas del concierto, pistas de la cura y lo vivido ---------------- */
  function backSel() { var id = view === 'diario' ? 'diario' : view === 'opciones' ? 'opciones' : view === 'controles' ? 'controles' : null, k = 0; items.forEach(function (it, i) { if (it.id === id) k = i; }); return k; }
  var diarioBox = null;
  function renderDiario() {
    el('p', 'pz-kick', box, 'DIARIO');
    var O = ACH.objetivo, C = ACH.concierto;
    var obj = O && O.get ? O.get() : '';
    if (obj) { var o = el('p', 'pz-dobj', box); el('b', null, o, 'AHORA: '); el('span', null, o, obj); }
    var lst = (O && O.entradas ? O.entradas() : []).filter(function (x) { return x.id.indexOf('pieza-') !== 0; });
    diarioBox = el('div', 'pz-diario', box); diarioBox.setAttribute('data-ui', ''); diarioBox.tabIndex = -1;
    if (C && C.todas) {
      var tt = C.todas(), n = tt.filter(function (p) { return p.tiene; }).length;
      el('p', 'pz-dsec', diarioBox, 'EL GRAN CONCIERTO · ' + (ACH.t ? ACH.t('{n} de 4 piezas', { n: n }) : n + ' de 4 piezas'));
      var pr = el('div', 'pz-piezas', diarioBox);
      tt.forEach(function (p) {
        var c = el('div', 'pz-pieza' + (p.tiene ? ' on' : ''), pr);
        if (C.icono) c.appendChild(C.icono(p.id, 2));
        el('b', null, c, p.tiene ? p.nombre : '???'); el('small', null, c, p.nivel);
      });
    }
    var cura = lst.filter(function (x) { return x.cura; }), resto = lst.filter(function (x) { return !x.cura; });
    if (cura.length) { el('p', 'pz-dsec cura', diarioBox, 'PISTAS DE LA CURA'); cura.forEach(function (x) { entry(x, 'cura'); }); }
    el('p', 'pz-dsec', diarioBox, 'LO VIVIDO');
    if (!resto.length) el('p', 'pz-dvacio', diarioBox, 'Todavía nada, causa. Sal a la calle y algo pasará.');
    resto.forEach(function (x) { entry(x, ''); });
    btn('◀ VOLVER', function () { go('menu', backSel()); }, true, 'alt');
  }
  function entry(x, cls) { var d = el('div', 'pz-dent ' + cls, diarioBox); el('b', null, d, x.titulo); if (x.texto) el('p', null, d, x.texto); }
  function scrollDiario(d) { if (diarioBox) diarioBox.scrollTop += d * Math.max(24, diarioBox.clientHeight * 0.4); }

  /* ---------------- v0.13 T2 (U · G5): OPCIONES y TECLAS ---------------- */
  function OP() { return ACH.opciones || null; }
  function optP() { var o = OP(); return !o || o.get('pausaP') !== false; }
  function remapped() { var o = OP(); if (!o) return false; var r = false; o.ACCIONES.forEach(function (a) { if (o.tecla(a.id) !== a.def) r = true; }); return r; }
  function kName(c) { return ACH.tuto && ACH.tuto.keyLabel ? ACH.tuto.keyLabel(c).replace('ESPACIO', 'ESPACIO') : c; }
  function keysTxt(t) {   // 'E' → la tecla física de hoy
    var o = OP(); if (!o || !remapped()) return t;
    var M = { 'SHIFT': 'ShiftLeft', 'C': 'KeyC', 'Q': 'KeyQ', 'E': 'KeyE', 'F': 'KeyF', 'R': 'KeyR' };
    if (M[t]) return kName(o.physFor(M[t]));
    if (t === 'ESPACIO / CLIC') return kName(o.physFor('Space')) + ' / CLIC';
    if (t === 'WASD / FLECHAS') return ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(function (k) { return kName(o.physFor(k)); }).join('') + ' / FLECHAS';
    return t;
  }
  function optRow(label, val, fn, side) {
    var b = btn(label + ': ' + val, fn, true, 'opt');
    rows[rows.length - 1].side = side || function () { fn(); };
    return b;
  }
  function renderOpciones() {
    el('p', 'pz-kick', box, 'OPCIONES');
    var o = OP();
    if (!o) { el('p', 'pz-note', box, 'Las opciones no cargaron, causa.'); btn('◀ VOLVER', function () { go('menu', backSel()); }, true, 'alt'); return; }
    function tog(k, a, b) { return function () { o.set(k, o.get(k) === a ? b : a); render(); }; }
    optRow('PAUSA CON P', o.get('pausaP') !== false ? 'SÍ' : 'NO', tog('pausaP', true, false)).classList.add('kb-only');   // v0.13 verificación: en táctil no se muestran (no hay teclado y no cabía VOLVER a 390 px)
    optRow('SACUDIDA Y DESTELLOS', o.get('calma') ? 'REDUCIDOS' : 'NORMALES', tog('calma', true, false));
    optRow('TEXTO', o.get('texto') === 'grande' ? 'GRANDE' : 'NORMAL', tog('texto', 'grande', 'normal'));
    optRow('CONTRASTE', o.get('contraste') ? 'ALTO' : 'NORMAL', tog('contraste', true, false));
    optRow('DIFICULTAD', difName(difCur()), function () { difStep(1); render(); }, function (d) { difStep(d); render(); });
    btn('TECLAS ▸', function () { go('teclas'); }, true, 'kb-only');
    // v0.14 (A): lente WebGL (postfx.js). Va después de TECLAS para no mover los índices de sel que ya usa este menú.
    var PF = ACH.postfx, gfxOk = !!(PF && PF.available && PF.available());
    optRow('GRÁFICOS', !PF ? 'CLÁSICO' : gfxOk ? PF.name() : 'CLÁSICO (SIN WEBGL)', function () { if (gfxOk) { PF.cycle(1); render(); } },
      function (d) { if (gfxOk) { PF.cycle(d); render(); } });
    // v0.15 (A): personajes HD (motor a K=2, render.js). Sin el arte HD (ACH.hd) queda en CLÁSICO. Va después de GRÁFICOS (índice 7).
    var RH = ACH.render && ACH.render.hd, hdOk = !!(RH && RH.available());
    optRow('PERSONAJES', !hdOk ? 'CLÁSICO' : RH.on() ? 'HD' : 'CLÁSICO', function () { if (hdOk) { RH.set(!RH.on()); render(); } },
      function () { if (hdOk) { RH.set(!RH.on()); render(); } });
    // v0.16: idioma (idioma.js). Va después de PERSONAJES (índice 8). La etiqueta y el valor los traduce ACH.i18n en el DOM.
    var I18 = ACH.i18n;
    if (I18) optRow('IDIOMA', I18.nombre(), function () { I18.cycle(1); render(); }, function (d) { I18.cycle(d); render(); });
    btn('◀ VOLVER', function () { go('menu', backSel()); }, true, 'alt');
    var f = rows[sel] && rows[sel].b; el('p', 'pz-note pz-msg', box, '');
    if (sel === 4) msgSoft(difDesc(difCur()));
    if (sel === 6 && PF) msgSoft({ alto: 'Suave, con profundidad y brillos.', medio: 'Suave y más liviano.', clasico: 'El píxel de siempre.' }[PF.level()] || '');
    if (sel === 7) msgSoft(!hdOk ? 'Sin el arte HD: el píxel de siempre.' : RH.on() ? 'Caras y ropa con el doble de detalle.' : 'El píxel de siempre (más liviano).');
    if (sel === 8 && I18) msgSoft('Idioma · Language · 言語');
    void f;
  }
  function msgSoft(t) { var m = box && box.querySelector('.pz-msg'); if (m) m.textContent = t || ''; }
  var waitKey = null;
  function renderTeclas() {
    el('p', 'pz-kick', box, 'TECLAS');
    var o = OP();
    if (ACH.touch && ACH.touch.on) el('p', 'pz-note', box, 'En el celu se juega con los botones; esto es para el teclado.');
    var grid = el('div', 'pz-tgrid', box);
    (o ? o.ACCIONES : []).forEach(function (a) {
      var b = btn(a.nombre, function () { waitKey = a.id; render(); }, true, 'tkey', grid);
      var k = el('kbd', waitKey === a.id ? 'wait' : '', b, waitKey === a.id ? '¿…?' : kName(o.tecla(a.id)));
      void k;
    });
    btn('RESTABLECER', function () { o.resetTeclas(); render(); msg('Teclas de fábrica, causa.'); }, !!o && remapped(), '', null, 'Ya están las de fábrica.');
    btn('◀ VOLVER', function () { go('opciones', 5); }, true, 'alt');
    el('p', 'pz-note pz-msg', box, waitKey ? 'Aprieta la tecla nueva… (ESC cancela)' : 'ENTER en una acción y luego la tecla nueva. Las del menú, la mochila y las melodías quedan fijas.');
  }
  function gotKey(c) {
    var id = waitKey; waitKey = null;
    if (c === 'Escape') { sfx('ui.back'); render(); return; }
    var r = OP() ? OP().remap(id, c) : { ok: false, motivo: '' };
    sfx(r.ok ? 'ui.ok' : 'ui.back'); render();
    if (!r.ok) msg(r.motivo || 'Esa no, causa.');
  }

  function go(v, s) { view = v; sel = s != null ? s : v === 'salir' ? 1 : 0; waitKey = null; render(); sfx('ui.ok'); }
  function render() {
    if (!build()) return;
    host.setAttribute('data-pz', view);
    try { difSync(); } catch (e) { /* nada */ }
    box.innerHTML = ''; rows = [];
    if (view === 'controles') {
      el('p', 'pz-kick', box, 'CONTROLES');
      var ul = el('div', 'pz-keys', box);
      CONTROLES.concat(controls).forEach(function (c) { var r = el('div', 'pz-key', ul); el('b', null, r, keysTxt(c[0])); el('span', null, r, c[1]); });
      if (remapped()) el('p', 'pz-note', box, 'Tienes teclas cambiadas: mira OPCIONES ▸ TECLAS.');
      if (ACH.touch && ACH.touch.on) el('p', 'pz-note', box, 'En el celu: joystick a la izquierda, botones a la derecha, ❚❚ para este menú.');
      btn('◀ VOLVER', function () { go('menu'); }, true, 'alt');
    } else if (view === 'diario') { renderDiario();
    } else if (view === 'opciones') { renderOpciones();
    } else if (view === 'teclas') { renderTeclas();
    } else if (view === 'salir') {
      el('p', 'pz-kick', box, 'SALIR AL TÍTULO');
      el('p', 'pz-ask', box, 'Tu partida queda guardada. Desde el título: CONTINUAR.');   // v0.13 (G1): game.toTitle guarda antes de salir
      var r2 = el('div', 'pz-row', box);
      btn('SÍ, SALIR', function () { view = 'menu'; if (call(ACH.game, 'toTitle') === undefined && !fnOk(ACH.game, 'toTitle')) toast('No se puede salir desde aquí.'); }, true, '', r2);
      btn('NO', function () { go('menu'); }, true, 'alt', r2);
      sel = Math.min(sel, rows.length - 1);
    } else {
      items.forEach(function (it) {
        var on = evalEnabled(it);
        btn(it.label, function () { if (typeof it.onClick === 'function') { try { it.onClick(); } catch (e) { try { console.warn('[pausa] ' + it.id, e); } catch (x) { /* nada */ } } } }, on, '', null, on ? '' : evalNote(it), it.id);
      });
      el('p', 'pz-note pz-msg', box, '');
    }
    if (sel >= rows.length) sel = 0;
    if (rows[sel] && !rows[sel].on) { var k = rows.findIndex ? rows.findIndex(function (r) { return r.on; }) : 0; sel = k < 0 ? 0 : k; }
    focus(sel);
  }
  function btn(label, fn, on, cls, parent, note, id) {
    var b = el('button', 'pz-btn' + (cls ? ' ' + cls : '') + (on ? '' : ' off'), parent || box, label);
    b.type = 'button'; b.tabIndex = -1; b.setAttribute('data-ui', '');
    if (id) b.setAttribute('data-id', id);
    if (!on) b.setAttribute('aria-disabled', 'true');
    var i = rows.length; rows.push({ b: b, fn: fn, on: on, note: note || '' });
    b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); focus(i); activate(i); b.blur(); });
    b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') focus(i); });
    return b;
  }
  function msg(t) { var m = box && box.querySelector('.pz-msg'); if (!m) { toast(t); return; } m.textContent = t; m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash'); }
  function focus(i) {
    if (!rows.length) return;
    sel = (i + rows.length) % rows.length;
    rows.forEach(function (r, k) { r.b.classList.toggle('f', k === sel); });
    var m = box.querySelector('.pz-msg'); if (m) m.textContent = rows[sel].on ? '' : rows[sel].note;
  }
  function activate(i) {
    var r = rows[i]; if (!r) return;
    if (!r.on) { sfx('ui.back'); msg(r.note || 'Ahorita no se puede, causa.'); r.b.classList.remove('shake'); void r.b.offsetWidth; r.b.classList.add('shake'); return; }
    sfx('ui.ok'); r.fn();
  }

  /* ---------------- Teclado (en captura: con el menú abierto, input.js no ve ↑/↓/ENTER) ---------------- */
  function onKey(e) {
    if (!isOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
    if (ACH.cima && ACH.cima.active && ACH.cima.active()) return;
    var c = e.code || e.key, used = true;
    if (waitKey) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) gotKey(c); return; }
    if (c === 'KeyP' && view !== 'menu' && optP()) c = 'Escape';   // v0.13: P también vuelve
    if (view === 'diario' && (c === 'ArrowUp' || c === 'ArrowDown' || c === 'KeyW' || c === 'KeyS')) { scrollDiario(c === 'ArrowUp' || c === 'KeyW' ? -1 : 1); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (view === 'opciones' && (c === 'ArrowLeft' || c === 'ArrowRight' || c === 'KeyA' || c === 'KeyD')) { if (!e.repeat && rows[sel] && rows[sel].side) { sfx('ui.ok'); rows[sel].side(c === 'ArrowLeft' || c === 'KeyA' ? -1 : 1); } e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (c === 'ArrowUp' || c === 'KeyW') focus(sel - 1);
    else if (c === 'ArrowDown' || c === 'KeyS') focus(sel + 1);
    else if ((c === 'ArrowLeft' || c === 'ArrowRight' || c === 'KeyA' || c === 'KeyD') && view === 'salir') focus(sel + (c === 'ArrowLeft' || c === 'KeyA' ? -1 : 1));
    else if ((c === 'ArrowLeft' || c === 'ArrowRight') && view === 'menu') { if (!e.repeat) difStep(c === 'ArrowLeft' ? -1 : 1); }   // v0.13: ←/→ cambian la dificultad
    else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space') { if (!e.repeat) activate(sel); }
    else if (c === 'Escape' && view !== 'menu') { if (!e.repeat) { if (view === 'teclas') go('opciones', 5); else go('menu', backSel()); sfx('ui.back'); } }
    else used = false;
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  window.addEventListener('keydown', onKey, true);

  /* ---------------- Abrir / cerrar ---------------- */
  function isOpen() { return state() === 'paused' && built && !!box; }
  function open() {
    var s = state();
    if (s === 'paused') { view = 'menu'; render(); return true; }
    if (s !== 'playing' && s !== 'intro' && s !== 'dead') return false;
    if (ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active() && s === 'playing') return false;
    call(ACH.game, 'autoPause');
    return state() === 'paused';
  }
  function close() {
    if (state() !== 'paused') return false;
    if (fnOk(ACH.game, 'resume')) ACH.game.resume();
    return state() !== 'paused';
  }
  // game.js: en cada cambio de estado
  function onState(s, prev) {
    if (s === 'paused') { if (prev !== 'paused') { view = 'menu'; sel = 0; } render(); }
    else if (built && host) { view = 'menu'; host.setAttribute('data-pz', 'menu'); }
  }

  /* ---------------- Fundido chicha (el viaje al cuarto) ---------------- */
  var fadeEl = null, fadeTO = 0;
  function fade(text) {
    try {
      var st = document.getElementById('stage') || document.body;
      if (!fadeEl) { fadeEl = el('div', 'pz-fade', st); fadeEl.setAttribute('role', 'status'); el('div', 'pz-fadet', fadeEl); }
      clearTimeout(fadeTO);
      fadeEl.firstChild.textContent = text || '';
      fadeEl.classList.toggle('notext', !text);
      fadeEl.classList.remove('out'); fadeEl.classList.add('on');
    } catch (e) { /* nada */ }
  }
  function unfade(ms) {
    if (!fadeEl) return;
    clearTimeout(fadeTO);
    fadeEl.classList.add('out');
    fadeTO = setTimeout(function () { if (fadeEl) fadeEl.classList.remove('on', 'out'); }, ms == null ? 260 : ms);
  }

  ACH.pausa = { open: open, close: close, isOpen: isOpen, addItem: addItem, removeItem: removeItem, addControl: addControl, onState: onState,
    fade: fade, unfade: unfade, items: function () { return items.map(function (it) { return { id: it.id, label: it.label, order: it.order, on: evalEnabled(it) }; }); },
    view: function () { return isOpen() ? view : null; } };

  /* ---------------- Debug (V011 §4.5) ---------------- */
  ACH.debug = ACH.debug || {};
  var D = ACH.debug.v011 = ACH.debug.v011 || {};
  D.pausa = function () { open(); return { state: state(), open: isOpen(), view: isOpen() ? view : null, items: ACH.pausa.items() }; };
  D.ir = function (id) { var g = ACH.game; if (!fnOk(g, 'travel')) return 'sin game.travel'; var r = g.travel(id); return { ok: r, state: state(), level: call(g, 'levelId') }; };
  D.progreso = function () { return { niveles: progress(), distritos: call(ACH.cima, 'progress') || null }; };
})();
