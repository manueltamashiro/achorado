/* ACHORADO v0.13 — js/engine/tutorial.js → ACH.tuto (contrato V013-T2.md §1, agente U · G5): aprender jugando.
     vez(id, texto, tecla)  muestra la pista la primera vez y la repite cada 20 s (de juego) hasta hecho(id).
                            Si la llamas en cada cuadro mientras aplica (p. ej. «estás cerca del carrito»), se repite sin límite;
                            si la llamas una sola vez, se repite 2 veces más (a los 20 y 40 s) y descansa hasta la próxima llamada.
                            tecla: código ('KeyE', 'Space', 'ShiftLeft', 'Digit1'…) o rótulo libre ('1-4', 'E/F'). Con remapeo (opciones) se
                            muestra la tecla del jugador; en el celu, el nombre del botón. Devuelve true si se mostró ahora.
     hecho(id)              la acción ya se aprendió: no vuelve a salir (y se esconde si estaba en pantalla).
     es(id)                 ¿ya está hecha?
     reset()                todo de nuevo (debug).
     tick(G, dt)            lo llama hud.tick en cada paso (tiempo de juego): repeticiones y disparos genéricos (abajo).
   Disparos genéricos (los detecta este archivo leyendo el estado del juego) — ids reservados:
     mover · golpe · correr · titina · agarrar · lanzar · patear · comprar · carrito · resortera · arbol · comer · mochila · noche
   Los agentes de nivel usan sus propios ids con prefijo de nivel (p. ej. 'gambetta.cantar').
   Vive en localStorage['achorado.tuto.v1'] = {v:1, h:{id: 1}} (respaldo en memoria). Reemplaza la franja de controles de 10 s. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var KEY = 'achorado.tuto.v1', REP = 20, SHOW = 5, AUTO_REPS = 2;
  var mem = null, E = {}, clock = 0, cur = null, queue = [], el = null;

  function read() {
    if (mem) return mem;
    var o = null;
    try { var s = window.localStorage.getItem(KEY); o = s ? JSON.parse(s) : null; } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || !o.h) o = { v: 1, h: {} };
    mem = o; return mem;
  }
  function write() { try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* queda en memoria */ } }
  function es(id) { return !!read().h[id]; }

  /* ---- rótulo de la tecla ---- */
  var LBL = { Space: 'ESPACIO', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  var TOUCH = { Space: 'GUITARRAZO', KeyQ: 'TITINA', KeyC: 'SALTAR', KeyE: 'AGARRAR', KeyF: 'LANZAR', KeyR: 'RESORTERA', KeyK: 'ÁRBOL', KeyI: 'MOCHILA', Tab: 'MOCHILA',
    ShiftLeft: 'JOYSTICK A FONDO', ShiftRight: 'JOYSTICK A FONDO', Escape: '❚❚', KeyP: '❚❚', WASD: 'JOYSTICK', KeyL: 'RECETARIO', KeyH: 'CUARTO', '1-4': 'BARRA RÁPIDA' };
  function codeLabel(c) {
    if (!c) return '';
    if (LBL[c]) return LBL[c];
    var m = /^Key([A-Z])$/.exec(c) || /^Digit(\d)$/.exec(c) || /^Numpad(\d)$/.exec(c);
    return m ? m[1] : String(c);
  }
  function keyLabel(t) {
    if (!t) return '';
    var touch = !!(ACH.touch && ACH.touch.on);
    if (touch && TOUCH[t]) return TOUCH[t];
    var O = ACH.opciones;
    if (/^(Key|Digit|Space|Shift|Arrow)/.test(t)) {
      var phys = O && O.physFor ? O.physFor(t) : t;
      return codeLabel(phys);
    }
    return String(t);
  }

  /* ---- DOM ---- */
  function dom() {
    if (el) return el;
    var st = document.getElementById('stage'); if (!st) return null;
    el = document.createElement('div'); el.id = 'tutoHint'; el.className = 'tuto'; el.setAttribute('role', 'status');
    el.innerHTML = '<kbd></kbd><span></span>';
    st.appendChild(el);
    return el;
  }
  function paint() {
    var d = dom(); if (!d) return;
    if (!cur) { d.classList.remove('on'); return; }
    var k = keyLabel(cur.tecla);
    d.firstChild.textContent = k; d.firstChild.style.display = k ? '' : 'none';
    d.lastChild.textContent = cur.texto;
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
  }
  function show(id) {
    var e = E[id]; if (!e) return;
    e.last = clock; e.shown++;
    if (cur && cur.id !== id && clock - cur.at < 1.5) { if (!queue.some(function (q) { return q === id; })) queue.push(id); return; }
    cur = { id: id, texto: e.texto, tecla: e.tecla, at: clock }; paint();
  }

  /* ---- API ---- */
  function vez(id, texto, tecla, _gen) {
    if (!id || es(id)) return false;
    var e = E[id];
    if (!e) e = E[id] = { last: -1e9, shown: 0, auto: 0, texto: '', tecla: '' };
    if (_gen) e.noAuto = true;
    e.texto = String(texto || e.texto || ''); e.tecla = tecla || e.tecla || ''; e.call = clock; e.auto = 0;
    if (clock - e.last < REP) return false;
    show(id); return true;
  }
  function hecho(id) {
    if (!id) return;
    var h = read().h; if (!h[id]) { h[id] = 1; write(); }
    if (cur && cur.id === id) { cur = null; paint(); }
    queue = queue.filter(function (q) { return q !== id; });
  }
  function reset() { mem = { v: 1, h: {} }; write(); E = {}; cur = null; queue = []; paint(); }

  /* ---- disparos genéricos ---- */
  var S = { moveT: 0, night: false, nightShown: 0, hp0: null, prevAct: null };
  function I() { return ACH.input; }
  function pressedAny(codes) { var In = I(); if (!In) return false; for (var i = 0; i < codes.length; i++) if (In.pressed(codes[i])) return true; return false; }
  function nearZ(G, r, chasing) {
    var p = G.player, n = 0, zs = G.zombies || [];
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i]; if (z.dead || z.hp <= 0) continue;
      if (chasing && z.state !== 'perseguir' && z.state !== 'atacar') continue;
      var dx = z.x - p.x, dy = z.y - p.y; if (dx * dx + dy * dy < r * r) n++;
    }
    return n;
  }
  function invHas(id) { try { return !!(ACH.inv && ACH.inv.has && ACH.inv.has(id)); } catch (e) { return false; } }
  function quickFood() {
    try {
      var iv = ACH.inv, sn = iv && iv.snapshot ? iv.snapshot() : null, q = sn && (sn.quick || sn.q);
      if (!q || !iv.isFood) return false;
      for (var i = 0; i < q.length; i++) { var id = q[i] && (q[i].id || q[i]); if (id && iv.isFood(id) && iv.count(id) > 0) return true; }
    } catch (e) { /* nada */ }
    return false;
  }
  function anyFood() {
    try { var iv = ACH.inv, sn = iv.snapshot(), sl = sn && (sn.slots || sn.s) || []; for (var i = 0; i < sl.length; i++) if (sl[i] && iv.isFood(sl[i].id)) return true; } catch (e) { /* nada */ }
    return false;
  }
  function gv(id, t, k) { return vez(id, t, k, true); }
  function generic(G, dt) {
    var p = G.player; if (!p || p.hp <= 0) return;
    var In = I(); if (!In) return;
    var ax = In.axis ? In.axis() : { x: 0, y: 0 }, moving = !!(ax.x || ax.y);
    // moverse: al empezar a jugar
    if (!es('mover')) { S.moveT += dt; if (moving) hecho('mover'); else if (S.moveT > 1.2) gv('mover', 'Muévete', 'WASD'); }
    // guitarrazo: el primer zombi cerca
    if (In.pressed('Space') || (In.mouse && In.mouse.clicked)) hecho('golpe');
    else if (!es('golpe') && nearZ(G, 110)) gv('golpe', 'Guitarrazo al zombi', 'Space');
    // correr: te persiguen
    var shift = In.any && In.any(['ShiftLeft', 'ShiftRight', 'Shift']);
    if (shift && moving) hecho('correr');
    else if (!es('correr') && es('golpe') && nearZ(G, 170, true) >= 2) gv('correr', 'Corre (gasta aliento)', 'ShiftLeft');
    // Titina: varios encima
    if (In.pressed('KeyQ')) hecho('titina');
    else if (!es('titina') && p.bird && !(G.qCD > 0) && nearZ(G, 200) >= 3) gv('titina', 'Manda a Titina: los marea', 'KeyQ');
    // contextual (armas.js y los que lo envuelven: vendedores, cargables…)
    var act = null; try { act = ACH.armas && ACH.armas.context ? ACH.armas.context() : null; } catch (e) { act = null; }
    var cart = false; try { cart = !p.held && !!(ACH.inv && ACH.inv.cartAt && ACH.inv.cartAt(p.x, p.y, 40)); } catch (e) { cart = false; }
    if (S.prevAct && In.pressed(S.prevAct.code)) hecho(S.prevAct.id);
    S.prevAct = null;
    if (act && act.code) {
      var L = act.label, id = null, tx = '';
      if (cart && act.code === 'KeyE') { id = 'carrito'; tx = 'Saca comida del carrito'; }
      else if (L === 'AGARRAR') { id = 'agarrar'; tx = 'Agarra eso (con algo en la mano, F lo lanza)'; }
      else if (L === 'LANZAR') { id = 'lanzar'; tx = 'Lánzalo (mantén para tirar más lejos)'; }
      else if (L === 'PATEAR') { id = 'patear'; tx = 'Patéalo'; }
      else if (L === 'COMPRAR') { id = 'comprar'; tx = 'Compra con tus sencillos'; }
      if (id) { S.prevAct = { id: id, code: act.code }; if (!es(id)) gv(id, tx, act.code); }
    }
    // resortera en la mochila
    if (In.pressed('KeyR')) hecho('resortera');
    else if (!es('resortera') && invHas('resortera')) gv('resortera', ACH.touch && ACH.touch.on ? 'Saca la resortera: arrastra el botón para apuntar' : 'Saca la resortera (apunta con el mouse)', 'KeyR');
    // mochila: algo adentro
    if (In.pressed('KeyI') || In.pressed('Tab') || (ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen())) hecho('mochila');
    else if (!es('mochila') && G.time > 20 && anyFood()) gv('mochila', 'Abre la mochila', 'KeyI');
    // árbol: puntos sin gastar
    var pts = 0; try { pts = ACH.hab && ACH.hab.info ? (ACH.hab.info().points | 0) : 0; } catch (e) { pts = 0; }
    var tree = false; try { tree = !!(ACH.hab && ACH.hab.treeOpen && ACH.hab.treeOpen()); } catch (e) { tree = false; }
    if (tree || In.pressed('KeyK')) hecho('arbol');
    else if (!es('arbol') && pts > 0) gv('arbol', '¡Subiste de nivel! Abre el árbol de melodías', 'KeyK');
    // comer con poca vida
    var C = ACH.ent && ACH.ent.CFG, low = C ? p.hp < C.hpMax * 0.35 : false;
    if (S.lowSeen && pressedAny(['Digit1', 'Digit2', 'Digit3', 'Digit4'])) hecho('comer');
    if (S.hp0 !== null && p.hp > S.hp0 + 0.5 && !(G.safeT > 0)) { if (S.lowSeen) hecho('comer'); }
    S.hp0 = p.hp;
    if (low && !es('comer')) { S.lowSeen = true; if (quickFood()) gv('comer', 'Poca vida: come algo de la barra rápida', '1-4'); else if (anyFood()) gv('comer', 'Poca vida: come algo (mochila o barra 1-4)', 'KeyI'); }
    // noche
    var night = false; try { night = !!(ACH.noche && ACH.noche.isNight && ACH.noche.isNight()); } catch (e) { night = false; }
    if (night && !S.night && !es('noche')) {
      E.noche = null; gv('noche', 'De noche salen más y ven mejor: escóndete o corre', '');
      S.nightShown++; if (S.nightShown >= 2) hecho('noche');
    }
    S.night = night;
  }

  function tick(G, dt) {
    if (!G || G.state !== 'playing') return;
    clock += dt;
    var dlg = !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active());
    if (!dlg) { try { generic(G, dt); } catch (e) { if (!tick.err) { tick.err = 1; try { console.warn('[tuto]', e); } catch (x) { /* nada */ } } } }
    // repeticiones automáticas de las llamadas sueltas
    for (var id in E) {
      var e = E[id]; if (!e || es(id)) continue;
      if (clock - e.last >= REP && clock - e.call > 1 && e.auto < AUTO_REPS && !e.noAuto) { e.auto++; show(id); e.call = e.last; }
    }
    if (cur && clock - cur.at >= SHOW) { cur = null; if (queue.length) { var nx = queue.shift(); if (E[nx] && !es(nx)) { cur = { id: nx, texto: E[nx].texto, tecla: E[nx].tecla, at: clock }; } } paint(); }
  }
  function onState(s) { if (s === 'title') { S.moveT = 0; S.night = false; } }

  ACH.tuto = { vez: vez, hecho: hecho, es: es, reset: reset, tick: tick, onState: onState, keyLabel: keyLabel, KEY: KEY,
    actual: function () { return cur ? { id: cur.id, texto: cur.texto, tecla: keyLabel(cur.tecla) } : null; } };
})();
