/* ACHORADO — js/miraflores/nivel.js (M1a): nivel 3, Parque Kennedy (Miraflores). Se carga PRIMERO en miraflores.html.
   Define ACH.nivel (los ganchos del motor, MIRAFLORES.md §2) y ACH.mira = { systems: [] }.
   Cada sistema (mundo, trabajadores, inflables, jefa…) se registra con ACH.mira.register({ name, update, reset, onRespawn, mood,
   drawables, drawTop, onSwing, onProjectile, speedMul }) y trae solo las funciones que necesita. Los despachadores los recorren
   en orden de registro; un error en un sistema se avisa una vez en la consola y nunca rompe el juego.
   Además: marcas (real/parodia) de los nueve negocios, avisos, voz, sonido y sprites provisorios (bloque de color con su nombre en ACH5). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {};
  M.systems = M.systems || [];
  M.register = function (sys) { if (sys && M.systems.indexOf(sys) < 0) M.systems.push(sys); return sys; };

  /* ---------------- Marcas de los nueve negocios (MIRAFLORES.md §7.2) ---------------- */
  var BRANDS = {
    bembos:    { real: 'BEMBOS', parodia: 'BOMBOS', bg: '#1100CF', fg: '#FFB500', color: 'azul' },
    starbucks: { real: 'STARBUCKS', parodia: 'ESTARBAKS', bg: '#00704A', fg: '#FFFFFF', color: 'verde' },
    lalucha:   { real: 'LA LUCHA', parodia: 'LA LUCHITA', bg: '#2A2A2E', fg: '#FFFFFF', color: 'gris' },
    chinawok:  { real: 'CHINA WOK', parodia: 'CHINA WAK', bg: '#E30613', fg: '#FFFFFF', accent: '#1F862C', color: 'rojo' },
    belisario: { real: 'DON BELISARIO', parodia: 'DON BELICOSO', bg: '#E5133A', fg: '#FFFFFF', color: 'rojo' },
    wong:      { real: 'WONG', parodia: 'WANG', bg: '#EC1C24', fg: '#FFFFFF', color: 'blanco' },
    ripley:    { real: 'RIPLEY', parodia: 'RIPLAY', bg: '#333333', fg: '#F3EFE2', color: 'gris' },
    saga:      { real: 'SAGA FALABELLA', parodia: 'SAGA FALABOLA', bg: '#8DC63F', fg: '#FFFFFF', color: 'menta' },
    tailoy:    { real: 'TAI LOY', parodia: 'TAI LOI', bg: '#00A160', fg: '#FFFFFF', color: 'menta' }
  };
  M.BRANDS = BRANDS;
  function realMode() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }
  // Nombre a mostrar: primero la tabla de M2b (ACH.mira.marcas), si trae algo legible; si no, la de aquí.
  M.brandName = function (id) {
    if (M.marcas && typeof M.marcas.name === 'function') { try { var nm = M.marcas.name(id); if (typeof nm === 'string' && nm) return nm.toUpperCase(); } catch (e) { /* cae a la tabla */ } }
    var t = M.marcas && M.marcas[id], real = realMode();
    if (t) {
      var s = real ? (t.real || t.text || t.texto) : (t.parodia || t.parody || t.text || t.texto);
      if (typeof s === 'string' && s) return s.toUpperCase();
    }
    var b = BRANDS[id]; return b ? (real ? b.real : b.parodia) : String(id || '').toUpperCase();
  };
  M.brandColors = function (id) { var b = BRANDS[id] || {}; return { bg: b.bg || '#555', fg: b.fg || '#fff', accent: b.accent || b.fg || '#fff' }; };

  /* ---------------- Utilidades compartidas ---------------- */
  M.sfx = function (name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* el sonido nunca rompe el juego */ } } };
  M.toast = function (t) { if (ACH.hud && ACH.hud.toast) ACH.hud.toast(t); };
  // Voz: id de frase si existe (voces-mira.js), si no el texto. Devuelve true si se dijo.
  M.say = function (idOrText, o, fallbackText) {
    var a = ACH.audio; if (!a || !a.say) return false;
    try {
      if (a.phrases && a.phrases[idOrText]) return !!a.say(idOrText, o || {}) || true;
      var d = {}; for (var k in (o || {})) d[k] = o[k]; d.force = true;
      return !!a.say(fallbackText || idOrText, d) || true;
    } catch (e) { return false; }
  };
  M.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };

  /* ---------------- v0.13 T2 (KE): banderas de partida, objetivo/diario, diálogo con el juego congelado ---------------- */
  M.cont = false;   // esta visita es un CONTINUAR (se fija en ACH.nivel.reset)
  // banderas del nivel (ACH.partida.flag con prefijo miraflores.): M.flag('jefa') lee, M.flag('jefa', true) marca
  M.flag = function (k, v) {
    var P = ACH.partida; if (!P || typeof P.flag !== 'function') return v === undefined ? false : v;
    try { if (v === undefined) return !!P.flag('miraflores.' + k); return P.flag('miraflores.' + k, v); } catch (e) { return false; }
  };
  M.objetivo = function (t) { try { if (ACH.objetivo && typeof ACH.objetivo.set === 'function') ACH.objetivo.set(t); } catch (e) { /* nada */ } };
  M.diario = function (id, titulo, texto) { try { if (ACH.objetivo && typeof ACH.objetivo.diario === 'function') ACH.objetivo.diario(id, titulo, texto); } catch (e) { /* nada */ } };
  M.concierto = function (id) { try { if (ACH.concierto && typeof ACH.concierto.dar === 'function') ACH.concierto.dar(id); } catch (e) { /* nada */ } };
  // congela el juego (estado 'cine', como hace Costa Verde) mientras habla un diálogo con retrato; on=false lo devuelve a 'playing'
  var frozenByMe = false;
  M.freeze = function (on) {
    var G = ACH.G; if (!G) return;
    if (on) { if (G.state === 'playing') { G.state = 'cine'; try { ACH.hud.setState('cine'); } catch (e) { /* nada */ } frozenByMe = true; } }
    else if (frozenByMe) {
      frozenByMe = false;
      if (G.state === 'cine') { G.state = 'playing'; try { ACH.hud.setState('playing'); } catch (e2) { /* nada */ } }
      try { ACH.input.reset(); } catch (e3) { /* nada */ }
    }
  };
  // línea de diálogo: Alexander y Titina con su retrato; los demás (aún sin cara en retratos.js) salen solo con su nombre en el texto
  M.line = function (quien, texto, cara, nombre) {
    if (quien === 'alexander' || quien === 'titina') return { quien: quien, cara: cara || 'habla', texto: texto };
    var RN = ACH.retratos && ACH.retratos.NOMBRES;   // v0.13 T3 (R): con retrato en retratos-v013.js → cara que habla y rótulo con el nombre
    if (RN && RN[quien]) return { quien: quien, cara: cara || 'habla', texto: texto, nombre: nombre || RN[quien] };
    return { quien: null, cara: 'habla', texto: (nombre || String(quien).toUpperCase()) + ': ' + texto };
  };
  // M.talk(lines, onDone): diálogo línea por línea con el juego congelado; sin dialogo.js, los textos van como avisos y onDone corre igual
  M.talk = function (lines, onDone) {
    var G = ACH.G, done = false;
    function fin() { if (done) return; done = true; M.freeze(false); if (typeof onDone === 'function') { try { onDone(); } catch (e) { console.warn('[ACHORADO mira] talk.onDone', e); } } }
    if (!(ACH.dialogo && typeof ACH.dialogo.play === 'function')) { lines.forEach(function (l) { M.toast(l.texto); }); fin(); return false; }
    M.freeze(true);
    try { ACH.dialogo.play(lines, { onDone: fin }); } catch (e4) { console.warn('[ACHORADO mira] dialogo.play', e4); fin(); return false; }
    return true;
  };
  // texto de objetivo según el estado de la partida (se publica solo cuando cambia, y siempre después de lo que ponga el motor al empezar)
  var lastObj = null;
  function objetivoAuto(G) {
    var J = M.jefa, t;
    if (J && J.dead) t = 'Baja por la Calle de las Pizzas hasta la Costa Verde';
    else if (J && (J.state === 'pelea' || J.state === 'dialogo')) t = 'Vence a Doña Chancaca';
    else if (M.objetivoExtra) t = M.objetivoExtra(G);
    if (!t) t = 'Cruza el parque Kennedy hasta la Calle de las Pizzas';
    if (t !== lastObj) { lastObj = t; M.objetivo(t); }
  }

  // Sprite provisorio legible: bloque de color con contorno oscuro y su nombre en ACH5 (si cabe). Ancla = centro inferior.
  var provCache = {};
  M.prov = function (key, w, h, col, label, opt) {
    opt = opt || {};
    var ck = key + '|' + w + '|' + h + '|' + col;
    if (provCache[ck]) return provCache[ck];
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (opt.draw) opt.draw(g, w, h);
    else {
      g.fillStyle = '#1c1a22'; g.fillRect(0, 0, w, h);
      g.fillStyle = col; g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(1, 1, w - 2, 1);
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(1, h - 3, w - 2, 2);
    }
    if (label) M.label(g, label, w, h, opt.ink);
    c.ax = opt.ax !== undefined ? opt.ax : Math.floor(w / 2); c.ay = opt.ay !== undefined ? opt.ay : h - 1;
    if (opt.fw !== undefined) c.fw = opt.fw;
    if (opt.fh !== undefined) c.fh = opt.fh;
    c.prov = true;
    provCache[ck] = c;
    return c;
  };
  // Texto ACH5 centrado en un lienzo (con px.text de base.js; sin base.js, letra de sistema chiquita).
  M.label = function (g, label, w, h, ink, y) {
    var px = ACH.px, s = String(label).toUpperCase();
    try {
      if (px && px.G && px.text && px.measure) {
        while (s.length > 1 && px.measure(s, 'a5') > w - 2) s = s.slice(0, -1);
        if (px.measure(s, 'a5') > w - 2) return;
        var tg = new px.G(w, 7);
        px.text(tg, s, Math.floor(w / 2), 1, { font: 'a5', ink: ink || '#f3efe2', align: 'c' });
        var tc = tg.toCanvas();
        var yy = y !== undefined ? y : Math.max(0, Math.floor(h / 2) - 4);
        g.fillStyle = 'rgba(19,16,21,.55)'; g.fillRect(0, yy, w, 7);
        g.drawImage(tc, 0, yy);
        return;
      }
    } catch (e) { /* cae a la letra de sistema */ }
    g.font = '5px monospace'; g.fillStyle = ink || '#f3efe2'; g.textAlign = 'center'; g.fillText(s, w / 2, h / 2 + 2); g.textAlign = 'start';
  };

  /* ---------------- Despachadores ---------------- */
  var warned = {};
  function call(s, fn, a, b, c, d) {
    try { return s[fn](a, b, c, d); }
    catch (e) { var k = (s.name || '?') + '.' + fn; if (!warned[k]) { warned[k] = 1; console.warn('[ACHORADO mira] ' + k, e); } return undefined; }
  }
  function each(fn, a, b, c, d) { var L = M.systems; for (var i = 0; i < L.length; i++) if (typeof L[i][fn] === 'function') call(L[i], fn, a, b, c, d); }

  // La noche de Miraflores: a los 6 min, sin disparador por x (noche.js publica su CFG en ACH.noche.cfg).
  // v0.13 (D5): ya no anochece a los 6 min: la noche cae al entrar la jefa en su fase 3 (jefa.js llama a ACH.noche.start)
  var NOCHE = { atTime: 99999, atX: null };
  function applyNoche() {
    var cfg = ACH.noche && ACH.noche.cfg; if (!cfg) return;
    cfg.atTime = NOCHE.atTime; cfg.triggerX = NOCHE.atX === null ? null : NOCHE.atX;
    cfg.kicker = 'PARQUE KENNEDY · 7:00 P.M.';
  }

  // game.js arma el cartel de victoria con su winInfo() (Gambetta/Cerro): aquí se pone el de Miraflores, sin tocar el motor
  function wrapWin() {
    var H = ACH.hud; if (!H || !H.showWin || H.showWin._mira) return;
    var orig = H.showWin;
    H.showWin = function (G, info) {
      var o = {}; for (var k in (info || {})) o[k] = info[k]; o.title = ACH.nivel.win.title; o.go = ACH.nivel.win.go; o.rows = null;
      var r = orig.call(this, G, o);
      each('onShowWin', G);   // v0.13 (D4): el contador de gatos en el cartel
      return r;
    };
    H.showWin._mira = true;
  }

  // QA: en el título, game.js arranca el Cerro con la tecla 2 (loadLevel('cerro') falla aquí, avisa en consola y regala el kit de prueba).
  // Esta página no tiene el Cerro: se come la tecla 2 en la fase de captura, antes de que input.js la vea. Solo en el título (en juego 2 es un objeto rápido).
  // QA: tras ganar, game.js hace loadLevel('gambetta') y vuelve al título; aquí no existe ese nivel (avisaba «nivel desconocido» y no reiniciaba nada).
  // Este «nivel» devuelve el mismo mundo de Miraflores: loadLevel lo vuelve a hornear y resetea la partida, y la pantalla de título queda limpia.
  ACH.levels = ACH.levels || {};
  if (!ACH.levels.gambetta) ACH.levels.gambetta = { id: 'gambetta', name: 'Miraflores', build: function () { return ACH.world; } };

  // M.keyGate: lista de funciones fn(e) → true si se tragan la tecla. Este archivo se carga PRIMERO, así que su oyente en captura corre antes que el de
  // inventario.js (que usa 1-4 como objetos rápidos e I/Tab para la mochila): la tienda de inflables se registra aquí para que sus teclas no se filtren.
  M.keyGate = [function (e) { return (e.code === 'Digit2' || e.code === 'Numpad2') && ACH.G && ACH.G.state === 'title'; }];
  window.addEventListener('keydown', function (e) {
    for (var i = 0; i < M.keyGate.length; i++) {
      var r = false; try { r = M.keyGate[i](e); } catch (err) { /* un filtro roto nunca rompe el teclado */ }
      if (r === true) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    }
  }, true);

  /* ---------------- QA: ACH.debug.mira.bot({max, smart}) — un bot simple que pelea con la jefa (esquiva la embestida y pega de cerca) ----------------
     Devuelve {res: 'win'|'dead'|'timeout', secs (tiempo de juego), jhp (vida que le queda a la jefa), php, minhp, charges, crashes, phase, dmg (daño recibido por fuente)}.
     skill (0–1): «humano medio»; con 0,6 se distrae el 40 % del tiempo. smart: durante el aviso de la embestida se coloca detrás de un obstáculo cercano (para que ella choque y quede aturdida). Antes: teleport a la boca de la calle y debug.v011.jefaFight(). */
  (function () {
    var D = ACH.debug = ACH.debug || {}, DM = D.mira = D.mira || {};
    DM.bot = function (o) {
      o = o || {};
      var G = ACH.G, J = M.jefa, I = ACH.input, P = G && G.player; if (!G || !J || !I) return { res: 'sin juego' };
      var mv = { x: 0, y: 0 }, atk = false, run = false, oa = I.axis, od = I.down, op = I.pressed, oany = I.any;
      I.axis = function () { return { x: mv.x, y: mv.y }; };
      I.down = function (c) { return c === 'Space' ? atk : od(c); };
      I.pressed = function (c) { return c === 'Space' ? atk : op(c); };
      I.any = function (keys) { if (keys.indexOf('ShiftLeft') >= 0) return run; return oany(keys); };
      var ch0 = J.charges, cr0 = J.crashes, t0 = G.time, res = 'timeout', minhp = P.hp, W = ACH.world, hide = null, idle = false;
      try {
        for (var i = 0; i < (o.max || 7200); i++) {
          var dx = J.x - P.x, dy = J.y - P.y, d = Math.sqrt(dx * dx + dy * dy), dodging = false;
          mv = { x: 0, y: 0 }; atk = false; run = false;
          var holding = o.smart && hide && J.charge && hide.k === J.charge && hide.p;
          if (J.charge && (J.charge.ph === 'warn' || J.charge.ph === 'run') && !holding) {
            var f = J.face, nx = -Math.sin(f), ny = Math.cos(f), rel = (P.x - J.x) * nx + (P.y - J.y) * ny, along = (P.x - J.x) * Math.cos(f) + (P.y - J.y) * Math.sin(f);
            if (along > -25 && Math.abs(rel) < 70) { var side = rel >= 0 ? 1 : -1; if (Math.abs(rel) < 40) { mv = { x: nx * side, y: ny * side }; run = true; } dodging = true; }   // sale del carril y espera a que pase
          }
          if (o.smart && J.charge && (J.charge.ph === 'warn' || J.charge.ph === 'run') && !dodging) {   // se coloca detrás de un auto/obstáculo en la línea de ella para que choque
            if (!hide || hide.k !== J.charge) {
              var bp = null, bdd = 1e9;
              for (var pi = 0; pi < W.props.length; pi++) { var pr = W.props[pi]; if (!(pr.fw > 8 && pr.fh > 3) || !/car|tico|custer|combi|mototaxi|basurero|macetero/i.test(pr.k)) continue; var pdx = pr.x - J.x, pdy = pr.y - J.y, pdd = Math.sqrt(pdx * pdx + pdy * pdy); if (pdd > 40 && pdd < 140 && pdd < bdd) { bdd = pdd; bp = pr; } }
              hide = { k: J.charge, p: bp };
            }
            if (hide.p) {
              var hx = hide.p.x - J.x, hy = hide.p.y - J.y, hl = Math.sqrt(hx * hx + hy * hy), tx = hide.p.x + hx / hl * 30, ty = hide.p.y + hy / hl * 30 - 4, tdx = tx - P.x, tdy = ty - P.y, td = Math.sqrt(tdx * tdx + tdy * tdy);
              if (td > 3) mv = { x: tdx / td, y: tdy / td }; run = true; dodging = true;
            }
          }
          if (!dodging && J.state === "pelea" && (J.fryWarnT > 0 || J.fryLeft > 0) && !o.dumb) {   // mientras fríe, pega por el costado (el aceite cae al frente)
            var fx = J.x + (P.x < J.x ? -24 : 24), fy = J.y + 4, fdx = fx - P.x, fdy = fy - P.y, fd = Math.sqrt(fdx * fdx + fdy * fdy);
            if (fd > 4) { mv = { x: fdx / fd, y: fdy / fd }; run = fd > 40; } if (d <= 32 && fd < 14) atk = true; dodging = true;
          }
          if (!dodging && !o.dumb && J.swarms) {   // si un enjambre está encima, primero se le pega a él (como haría cualquiera)
            var sw = J.swarms(), bs = null, bd = 70;
            for (var q = 0; q < sw.length; q++) { var sd = Math.sqrt((sw[q].x - P.x) * (sw[q].x - P.x) + (sw[q].y - P.y) * (sw[q].y - P.y)); if (sd < bd) { bd = sd; bs = sw[q]; } }
            if (bs) { var bx = bs.x - P.x, by = bs.y - P.y; if (bd > 16) { mv = { x: bx / bd, y: by / bd }; } else { mv = { x: bx / (bd || 1) * 0.05, y: by / (bd || 1) * 0.05 }; } atk = bd < 22; dodging = true; }
          }
          if (!dodging) {
            if (d > 24) { mv = { x: dx / d, y: dy / d }; run = d > 70; }
            if (d <= 32) atk = true;
          }
          if (o.skill && o.skill < 1) {   // humano medio: cada ~0,7 s se distrae (no pega ni se mueve) con probabilidad 1 − skill
            if (i % 40 === 0) idle = Math.random() > o.skill;
            if (idle && !(J.charge && (J.charge.ph === 'warn' || J.charge.ph === 'run') && Math.abs(J.x - P.x) < 60)) { mv = { x: 0, y: 0 }; atk = false; run = false; }
          }
          ACH.game.step(1);
          if (P.hp < minhp) minhp = P.hp;
          if (J.dead) { res = 'win'; break; }
          if (G.state === 'dead') { res = 'dead'; break; }
          if (G.state !== 'playing') { res = 'state:' + G.state; break; }
        }
      } finally { I.axis = oa; I.down = od; I.pressed = op; I.any = oany; }
      return { res: res, secs: +(G.time - t0).toFixed(1), jhp: +(+J.hp).toFixed(1), php: Math.round(P.hp), minhp: Math.round(minhp), charges: J.charges - ch0, crashes: J.crashes - cr0, phase: J.phase,
        dmg: D.v011 && D.v011.jefaDmg ? D.v011.jefaDmg(true) : null };
    };
    // BFS en celdas de 6 px desde (sx, sy) hasta (tx, ty) con un círculo de radio 6; devuelve el punto a ~36 px por el camino (o null)
    function bfsNext(sx, sy, tx, ty) {
      var W = ACH.world, S = 6, gw = Math.ceil(W.W / S), gh = Math.ceil(W.H / S), seen = new Uint8Array(gw * gh), prev = new Int32Array(gw * gh).fill(-1), q = new Int32Array(gw * gh), head = 0, tail = 0, free = new Int8Array(gw * gh);
      function ok(ix, iy) { var id = iy * gw + ix, v = free[id]; if (v) return v === 1; var b = W.collideCircle(ix * S + S / 2, iy * S + S / 2, 6); free[id] = b ? 2 : 1; return !b; }
      var a = Math.floor(sx / S) + Math.floor(sy / S) * gw, g = -1, gx = Math.floor(tx / S), gy = Math.floor(ty / S);
      seen[a] = 1; q[tail++] = a;
      while (head < tail) {
        var id = q[head++], ix = id % gw, iy = (id - ix) / gw;
        if (Math.abs(ix - gx) + Math.abs(iy - gy) <= 2) { g = id; break; }
        var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (var k2 = 0; k2 < 4; k2++) { var nx = ix + nb[k2][0], ny = iy + nb[k2][1]; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; var nid = ny * gw + nx; if (seen[nid] || !ok(nx, ny)) continue; seen[nid] = 1; prev[nid] = id; q[tail++] = nid; }
      }
      if (g < 0) return null;
      var path = []; for (var c = g; c >= 0; c = prev[c]) path.push(c); path.reverse();
      var pt = path[Math.min(path.length - 1, 6)], px2 = pt % gw, py2 = (pt - px2) / gw;
      return { x: px2 * S + S / 2, y: py2 * S + S / 2, len: path.length };
    }
    // DM.route({max, fight}): (fight: true = se queda a pelear con todo lo que encuentra; por defecto corre) recorrido completo con un bot: del Óvalo por los caminos hasta la boca de la Calle de las Pizzas (cierra los diálogos), pelea con la jefa
    // (DM.bot) y camina a la salida hasta que sale el cartel de victoria. Devuelve {res, secs, deaths, kills, emb, stuck…}.
    DM.route = function (o) {
      o = o || {};
      var G = ACH.G, P = G.player, W = ACH.world, I = ACH.input, J = M.jefa, t0 = G.time, deaths0 = G.deaths, res = 'timeout', stuck = 0, lx = P.x, ly = P.y, i;
      var nav = null, WP = [[18, 26.5], [34, 29], [46, 31], [53.5, 34.5], [61.5, 36.5], [72, 37.5], [88, 38.5], [95.5, 39.5], [100, 44.5]], k = 0;
      var mv = { x: 0, y: 0 }, atk = false, run = false, oa = I.axis, od = I.down, op = I.pressed, oany = I.any, killsAt = 0;
      I.axis = function () { return { x: mv.x, y: mv.y }; };
      I.down = function (c) { return c === 'Space' ? atk : od(c); };
      I.pressed = function (c) { return c === 'Space' ? atk : op(c); };
      I.any = function (keys) { if (keys.indexOf('ShiftLeft') >= 0) return run; return oany(keys); };
      try {
        for (i = 0; i < (o.max || 36000); i++) {
          if (ACH.dialogo && ACH.dialogo.active()) { ACH.dialogo.advance(); ACH.dialogo.advance(); ACH.game.step(1); continue; }
          if (G.state === 'won') { res = 'win'; break; }
          if (G.state === 'dead') { res = 'dead'; break; }
          if (G.state !== 'playing') { ACH.game.step(1); if (G.state === 'cine' && i > 5) continue; res = 'state:' + G.state; break; }
          mv = { x: 0, y: 0 }; atk = false; run = false;
          // enemigos cerca: pegar
          var near = null, nd = 40;
          for (var z = 0; z < G.zombies.length; z++) { var q = G.zombies[z]; if (q.state === 'muerto') continue; var dd = Math.sqrt((q.x - P.x) * (q.x - P.x) + (q.y - P.y) * (q.y - P.y)); if (dd < nd) { nd = dd; near = q; } }
          var jd = Math.sqrt((J.x - P.x) * (J.x - P.x) + (J.y - P.y) * (J.y - P.y));
          if (J.state === 'pelea' && !J.dead) { var r = DM.bot({ max: 6000 }); if (r.res === 'dead') { res = 'dead'; break; } continue; }
          var tx, ty;
          if (J.dead) { tx = 101 * 16; ty = 76 * 16; } else if (k < WP.length) { tx = WP[k][0] * 16; ty = WP[k][1] * 16; if (Math.abs(P.x - tx) + Math.abs(P.y - ty) < 14) k++; } else { tx = 101 * 16; ty = 54 * 16; }
          if (i % 45 === 0 || !nav) { try { nav = bfsNext(P.x, P.y, tx, ty); } catch (eB) { nav = null; } }
          var dx = (nav ? nav.x : tx) - P.x, dy = (nav ? nav.y : ty) - P.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
          mv = { x: dx / dl, y: dy / dl }; run = dl > 20;
          if (near && o.fight) { if (nd < 30) { atk = true; mv = { x: (near.x - P.x) / (nd || 1) * 0.1, y: (near.y - P.y) / (nd || 1) * 0.1 }; } else { mv = { x: (near.x - P.x) / nd, y: (near.y - P.y) / nd }; } }
          ACH.game.step(1);
          if (i % 120 === 0) { if (Math.abs(P.x - lx) + Math.abs(P.y - ly) < 6 && !near && !atk) stuck++; lx = P.x; ly = P.y; }
          if (stuck > 12) { res = 'atascado en ' + Math.round(P.x / 16) + ',' + Math.round(P.y / 16); break; }
        }
      } finally { I.axis = oa; I.down = od; I.pressed = op; I.any = oany; }
      var kills = 0; for (var zz = 0; zz < G.zombies.length; zz++) if (G.zombies[zz].state === 'muerto') kills++;
      return { res: res, secs: +(G.time - t0).toFixed(1), deaths: G.deaths - deaths0, kills: kills, emb: DM.emb ? DM.emb().filter(function (e) { return e.done; }).length : null, jefa: J.dead ? 'vencida' : J.state, pos: [Math.round(P.x / 16), Math.round(P.y / 16)], waypoint: k };
    };
    // DM.trial(n, opts): n peleas seguidas (reinicia el nivel entre cada una; vuelve el atardecer). Devuelve una línea por pelea.
    DM.trial = function (n, o) {
      var out = [];
      for (var k = 0; k < (n || 1); k++) {
        var G = ACH.G, J = M.jefa;
        if (G.state === 'title' || G.state === 'won') D.start();
        var guard = 0; while (G.state === 'dead' && guard++ < 1000) ACH.game.step(30);
        if (ACH.dialogo && ACH.dialogo.active()) ACH.dialogo.close();   // el diálogo de después de vencerla
        M.freeze(false); if (G.state === 'cine') { G.state = 'playing'; try { ACH.hud.setState('playing'); } catch (e0) { /* nada */ } }
        ACH.nivel.reset(G); try { ACH.noche.force(false); } catch (e) { /* nada */ }
        J.dlgSeen = true; G.player.hp = ACH.ent.CFG.hpMax; G.player.stamina = ACH.ent.CFG.staminaMax;
        D.teleport(1616, 800); ACH.game.step(2);
        if (J.state !== 'pelea') D.v011.jefaFight();
        var r = DM.bot(o || {});
        out.push([r.res, r.secs + 's', 'jefa ' + r.jhp, 'vida ' + r.php + ' (min ' + r.minhp + ')', 'emb ' + r.charges + '/' + r.crashes + ' choques', JSON.stringify(r.dmg)].join(' · '));
      }
      return out;
    };
  })();

  ACH.nivel = {
    id: 'miraflores',
    // v0.10: la llegada a Miraflores (con retrato que habla, ACH.dialogo). La misma si vienes del mapa o si abres la página directo.
    intro: [
      { quien: 'alexander', cara: 'sorpresa', texto: '¿Esto es Miraflores? Hasta los zombies se ven pitucos, compadre.' },
      { quien: 'alexander', cara: 'risa', texto: 'Mira, Titina: gatos en el parque, palmeras... ¡y nadie vendiendo caramelos en la combi!' },
      { quien: 'titina', cara: 'molesta', texto: 'Grrú.' },
      { quien: 'alexander', cara: 'serio', texto: 'Dicen que por aquí hay una cura. Primero, a la Calle de las Pizzas.' },
      { quien: 'alexander', cara: 'picaro', texto: 'A ver si a los pitucos también les gusta mi música.' }],
    camPeek: false,
    noche: NOCHE,
    update: function (G, dt) { if (!M.objOn) { M.objOn = true; lastObj = null; } objetivoAuto(G); each('update', G, dt); },
    // v0.10: al ganar, game.js marca el progreso (ACH.viaje.setDone + distritos) y ENTER / toque vuelve al mapa de index.html
    win: { title: '¡LLEGASTE A LA CALLE DE LAS PIZZAS!', go: 'ENTER — BAJAR AL MALECÓN' },   // COSTAVERDE.md: game.js winGo viaja a costaverde
    reset: function (G) {
      applyNoche(); wrapWin(); M.objOn = false; lastObj = null;
      // v0.13 T2: visita nueva → se borran las banderas miraflores.*; al CONTINUAR, los sistemas las leen en su reset
      var P = ACH.partida, cont = false;
      try { cont = !!(P && P.continuando && P.continuando()); } catch (e) { cont = false; }
      if (!cont) { try { if (P && P.freshLevel) P.freshLevel('miraflores'); } catch (e2) { /* nada */ } }
      M.cont = cont;
      each('reset', G);
    },
    onRespawn: function (G) { each('onRespawn', G); },
    mood: function (G) {
      var L = M.systems;
      for (var i = 0; i < L.length; i++) if (typeof L[i].mood === 'function') { var r = call(L[i], 'mood', G); if (r && r.m) return r; }
      return null;
    },
    drawables: function (G, out) { each('drawables', G, out); },
    drawTop: function (ctx, G, cx, cy) { each('drawTop', ctx, G, cx, cy); },
    // n > 0: cuántas cosas golpeó · 0: nada · −1: rebotó contra la carretilla (prop duro)
    onSwing: function (G, sw) {
      var L = M.systems, tot = 0, blocked = false;
      if (sw && sw.bees === undefined) sw.bees = sw.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onSwing === 'function') {
        var r = +call(L[i], 'onSwing', G, sw) || 0;
        if (r > 0) tot += r; else if (r < 0) blocked = true;
      }
      return tot > 0 ? tot : (blocked ? -1 : 0);
    },
    // true = el proyectil se consumió (el motor lo quita)
    onProjectile: function (G, pr) {
      var L = M.systems;
      if (pr && pr.bees === undefined) pr.bees = pr.dmg;
      for (var i = 0; i < L.length; i++) if (typeof L[i].onProjectile === 'function' && call(L[i], 'onProjectile', G, pr) === true) return true;
      return false;
    },
    speedMul: function (G) {
      var L = M.systems, k = 1;
      for (var i = 0; i < L.length; i++) if (typeof L[i].speedMul === 'function') { var r = +call(L[i], 'speedMul', G); if (r > 0 && isFinite(r)) k *= r; }
      return k;
    }
  };
})();
