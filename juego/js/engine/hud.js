/* ACHORADO — hud.js: HUD y pantallas HTML (título, intro, pausa, muerte, victoria), avisos y overlay F3. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var $ = function (id) { return document.getElementById(id); };

  var el = {}, last = {}, titinaIcon = null;
  var HINT_LIFE = 10;   // s de juego que se ve la franja de controles; después se oculta sola
  var hintT = 0, hintDone = false, curState = 'title';
  var TOAST_LIFE = 2.2; // segundos de juego (igual que la animación CSS)
  var toasts = [];
  var SCREENS = ['title', 'intro', 'pause', 'death', 'win'];
  // v0.8: E agarrar · F lanzar (antes de que tactil.js guarde los textos de escritorio)
  (function () {
    var h = $('hint');
    if (h && h.textContent.indexOf('E agarrar') < 0) h.textContent = h.textContent.replace(' · Q Titina', ' · Q Titina · E agarrar · F lanzar');
    var r = document.querySelector('#title .row');
    if (r && r.innerHTML.indexOf('E agarrar') < 0) { var q = r.querySelector('span:nth-child(4)'); var s = document.createElement('span'); s.textContent = 'E agarrar · F lanzar'; if (q && q.nextSibling) r.insertBefore(s, q.nextSibling); else r.appendChild(s); }
  })();

  function init() {
    ['hud', 'hp', 'st', 'fans', 'titinaBox', 'titinaLbl', 'titinaCv', 'hint', 'toasts', 'hurt', 'dbg',
      'hpIcon', 'stIcon', 'title', 'intro', 'introText', 'pause', 'death', 'win', 'winTime', 'winFans', 'winDeaths', 'winTitle', 'winGo', 'winGallRow', 'winGall', 'winCartRow', 'winCart'].forEach(function (k) { el[k] = $(k); });
    // ícono de Titina: el primer cuadro de vuelo, escalado pixelado por CSS
    var spr = ACH.gfx.titina(0), cv = el.titinaCv;
    cv.width = spr.width; cv.height = spr.height;
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(spr, 0, 0);
    titinaIcon = cv;
    if (ACH.inv && ACH.inv.init) ACH.inv.init();   // v0.6: casillas de la mochila y de la barra rápida
    drawIcon(el.hpIcon, ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'], '#ff2e88', '#ffd0e4');   // corazón: vida
    drawIcon(el.stIcon, ['...XXX.', '..XXX..', '.XXX...', 'XXXXXX.', '..XXX..', '.XX....', 'X......'], '#1fe07a', '#d6ffe8');  // rayo: aliento
    buildGuitarRow();
  }

  /* ---- v0.8: guitarra (ícono de 4 estados + barrita de durabilidad) (las cuentas atrás de subidón, invisible y empacho las pone inventario.js) ---- */
  var GT_COL = ['#1fe07a', '#ffe500', '#ff3b3b', '#5a5662'];
  function buildGuitarRow() {
    var hud = el.hud; if (!hud || el.gtRow) return;
    var row = document.createElement('div');
    row.className = 'barrow'; row.id = 'gtRow';
    row.innerHTML = '<canvas id="gtIcon" width="7" height="7"></canvas><div class="bar gt"><i id="gt"></i></div>';
    var first = hud.querySelector('.barrow');
    if (first && first.nextSibling) hud.insertBefore(row, first.nextSibling); else hud.appendChild(row);
    ['gtRow', 'gtIcon', 'gt'].forEach(function (k) { el[k] = $(k); });
  }
  function syncGuitar(p) {
    if (!el.gt || !p.guitar) return;
    var g = p.guitar, A = ACH.armas, st = A ? A.guitarState(p) : 0, pct = Math.round(g.dur / g.max * 100);
    var held = p.held ? p.held.id + (p.held.id === 'skate' ? ':' + p.held.dur : '') : '';
    if (last.gt !== pct) { el.gt.style.width = pct + '%'; last.gt = pct; }
    if (last.gtSt !== st) {
      last.gtSt = st;
      el.gt.style.background = GT_COL[st];
      var ic = A && A.guitarIcon ? A.guitarIcon(st) : null, cv = el.gtIcon;
      if (ic && cv) {
        cv.width = ic.width; cv.height = ic.height;
        var cg = cv.getContext('2d'); cg.imageSmoothingEnabled = false; cg.clearRect(0, 0, cv.width, cv.height); cg.drawImage(ic, 0, 0);
        cv.style.width = 'calc(var(--u) * ' + Math.min(10, ic.width) + ')'; cv.style.height = 'calc(var(--u) * ' + Math.min(10, ic.height) + ')';
      }
      el.gtRow.title = ['Guitarra sana', 'Guitarra rajada', 'Guitarra muy rajada', 'Guitarra rota: a puñetes'][st];
    }
    if (last.held !== held) { last.held = held; el.gtRow.style.opacity = p.held ? '0.55' : '1'; }   // con el skate en la mano, la guitarra no se gasta
  }
  // Ícono de 7×7 px lógicos: máscara de texto (X = relleno, el primer cuadro de cada fila de arriba lleva un brillo) pintada en un canvas
  // que el CSS escala por la misma unidad entera del juego (--u).
  function drawIcon(cv, rows, col, hi) {
    if (!cv) return;
    var g = cv.getContext('2d'); cv.width = 7; cv.height = 7; g.clearRect(0, 0, 7, 7);
    for (var y = 0; y < rows.length; y++) for (var x = 0; x < rows[y].length; x++) {
      if (rows[y][x] !== 'X') continue;
      g.fillStyle = (y === 0 || (y === 1 && x < 3)) ? hi : col; g.fillRect(x, y, 1, 1);
    }
  }

  function show(id, on) { if (el[id]) el[id].classList.toggle('on', !!on); }

  function setState(state) {
    show('title', state === 'title');
    show('intro', state === 'intro' && !(ACH.dialogo && ACH.dialogo.play));   // v0.10: con dialogo.js la intro es el diálogo con retrato
    show('pause', state === 'paused');
    show('death', state === 'dead');
    show('win', state === 'won');
    var inGame = state === 'playing' || state === 'paused' || state === 'dead' || state === 'intro';
    show('hud', inGame); show('hint', false);   // v0.13 (G5): la franja de 10 s la reemplaza ACH.tuto (pistas contextuales)
    curState = state;
    document.body.setAttribute('data-state', state);
  }

  function setIntroLine(text) { if (el.introText) el.introText.textContent = text; }

  var noAirTO = 0;
  function update(G) {
    var p = G.player, C = ACH.ent.CFG;
    var hp = Math.round(p.hp / C.hpMax * 100), st = Math.round(p.stamina / C.staminaMax * 100);
    if (last.hp !== hp) { el.hp.style.width = hp + '%'; last.hp = hp; }
    // barra de aliento: gris si no alcanza para un guitarrazo (< atkCost); naranja parpadeante mientras dura el agotamiento (no corre hasta
    // soltar Shift y llegar a la marca de exhaustResume)
    if (last.st !== st) { el.st.style.width = st + '%'; last.st = st; el.st.parentNode.classList.toggle('low', st < C.atkCost); }
    if (G.noAirAt !== undefined && last.noAir !== G.noAirAt) {   // intentó golpear sin aliento: la barra parpadea gris con «¡sin aire!»
      last.noAir = G.noAirAt; var sb = el.st.parentNode;
      sb.classList.remove('noair'); void sb.offsetWidth; sb.classList.add('noair');
      clearTimeout(noAirTO); noAirTO = setTimeout(function () { sb.classList.remove('noair'); }, 700);
    }
    if (last.exh !== !!p.exhausted) { last.exh = !!p.exhausted; el.st.parentNode.classList.toggle('exh', last.exh); }
    if (last.fans !== G.fans) { el.fans.textContent = G.fans; last.fans = G.fans; }
    syncGuitar(p);
    if (ACH.hab && ACH.hab.syncHud) { try { ACH.hab.syncHud(G, el.hud); } catch (eH) { if (!update.habErr) { update.habErr = 1; console.warn('[ACHORADO] hab.syncHud', eH); } } }   // v0.11: NV, XP, SABOR y melodías
    if (ACH.inv && ACH.inv.sync) ACH.inv.sync(G);   // v0.6: barra rápida, sencillos y texto flotante del botín
    var invOn = !!(ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen()); if (last.invOn !== invOn) { last.invOn = invOn; document.body.classList.toggle('inv-on', invOn); }   // v0.13: objetivo y pistas se esconden con la mochila
    var tState, lbl;
    if (!p.bird) { tState = 'volando'; lbl = ''; }
    else if (G.qT > 0) { tState = 'activa'; lbl = 'Q'; }
    else if (G.qCD > 0) { tState = 'cd'; lbl = 'Q ' + Math.ceil(G.qCD); }
    else { tState = 'lista'; lbl = 'Q'; }
    if (last.tState !== tState) { el.titinaBox.setAttribute('data-t', tState); last.tState = tState; }
    if (last.tLbl !== lbl) { el.titinaLbl.textContent = lbl; last.tLbl = lbl; }
  }

  function toast(text) {
    if (!el.toasts) return;
    var d = document.createElement('div');
    d.className = 'toast'; d.textContent = text;
    el.toasts.appendChild(d);
    toasts.push({ el: d, t: 0 });
    while (toasts.length > 3) { var old = toasts.shift(); if (old.el.parentNode) old.el.parentNode.removeChild(old.el); }
  }
  // Avanza la vida de los avisos con el tiempo de juego (no corre en pausa).
  function tick(dt) {
    if (ACH.tuto && ACH.tuto.tick) { try { ACH.tuto.tick(ACH.G, dt); } catch (eT) { /* nada */ } }   // v0.13 (G5)
    if (!hintDone && curState === 'playing') {
      hintT += dt;
      if (hintT >= HINT_LIFE) { hintDone = true; show('hint', false); }
    }
    for (var i = toasts.length - 1; i >= 0; i--) {
      toasts[i].t += dt;
      if (toasts[i].t >= TOAST_LIFE) { var e = toasts[i].el; if (e.parentNode) e.parentNode.removeChild(e); toasts.splice(i, 1); }
    }
  }
  function resetHint() { hintT = 0; hintDone = false; }
  // Caja del HUD en px lógicos (ACH.render.VIEW), con su sombra: x1/y1 = borde derecho/inferior. Lo usa render.js para que las flechas de Q no queden debajo.
  function rect(viewW) {
    if (!el.hud || !el.hud.classList.contains('on')) return { x1: 0, y1: 0 };
    var r = el.hud.getBoundingClientRect(), st = el.hud.parentNode.getBoundingClientRect(), k = st.width / viewW || 1;
    return { x1: Math.ceil((r.right - st.left) / k) + 2, y1: Math.ceil((r.bottom - st.top) / k) + 2 };
  }
  function clearToasts() {
    while (toasts.length) { var e = toasts.pop().el; if (e.parentNode) e.parentNode.removeChild(e); }
  }

  function flashHurt() {
    if (!el.hurt) return;
    el.hurt.classList.remove('go'); void el.hurt.offsetWidth; el.hurt.classList.add('go');
  }

  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  // v0.9: info = {title, go, rows:{gallinazos, carretillas}} según el nivel (game.js); sin info, la de siempre
  function showWin(G, info) {
    el.winTime.textContent = fmtTime(G.time);
    el.winFans.textContent = G.fans;
    el.winDeaths.textContent = G.deaths;
    info = info || {};
    if (el.winTitle) el.winTitle.textContent = info.title || 'LLEGASTE AL CERRO';
    if (el.winGo) el.winGo.textContent = (info.go || 'ENTER para empezar de nuevo').replace(/^ENTER/, ACH.touch && ACH.touch.on ? 'TOCA' : 'ENTER');   // v0.13: en el celu, TOCA
    var R = info.rows;
    if (el.winGallRow) el.winGallRow.classList.toggle('hide', !R);
    if (el.winCartRow) el.winCartRow.classList.toggle('hide', !R);
    if (R) { if (el.winGall) el.winGall.textContent = R.gallinazos | 0; if (el.winCart) el.winCart.textContent = R.carretillas | 0; }
  }

  function debug(on, text) {
    show('dbg', on);
    if (on) el.dbg.textContent = text;
  }

  /* ---- v0.13 (A2): flecha a la bolsa de la muerte (ACH.inv.deathBag) en el borde de la pantalla; encima de la bolsa si ya se ve ---- */
  function bagArrow(ctx, G, cx, cy) {
    var iv = ACH.inv, b = iv && iv.deathBag ? iv.deathBag() : null;
    if (!b || !G || (G.state !== 'playing' && G.state !== 'dead' && G.state !== 'paused')) return;
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, bob = Math.round(Math.sin((G.clock || 0) * 6) * 1.5);
    var bx = b.x - cx, by = b.y - 8 - cy, M = 10;
    var col = '#ffe500', dark = '#131015';
    if (bx >= M && bx <= V.w - M && by >= M && by <= V.h - M) {   // se ve: flechita hacia abajo sobre el costal
      var ax = Math.round(bx), ay = Math.round(by - 12 + bob);
      tri(ctx, ax, ay + 4, 0, 1, 4, dark, col);
      return;
    }
    var px = V.w / 2, py = V.h / 2, dx = bx - px, dy = by - py, k = Math.min((V.w / 2 - M) / (Math.abs(dx) || 1e-6), (V.h / 2 - M) / (Math.abs(dy) || 1e-6));
    var ex = px + dx * k, ey = py + dy * k, r = rect(V.w);
    if (ex < r.x1 && ey < r.y1) { if (r.y1 + M < V.h - M) ey = r.y1 + M; }   // no tapar el HUD de arriba a la izquierda
    var l = Math.sqrt(dx * dx + dy * dy) || 1;
    tri(ctx, Math.round(ex - dx / l * bob), Math.round(ey - dy / l * bob), dx / l, dy / l, 5, dark, col);
  }
  function tri(ctx, x, y, ux, uy, s, dark, col) {   // punta en (x, y) apuntando a (ux, uy)
    var bx = x - ux * s * 1.6, by = y - uy * s * 1.6, nx = -uy * s, ny = ux * s;
    ctx.beginPath(); ctx.moveTo(x + ux * 1.5, y + uy * 1.5); ctx.lineTo(bx + nx * 1.25 - ux, by + ny * 1.25 - uy); ctx.lineTo(bx - nx * 1.25 - ux, by - ny * 1.25 - uy); ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  (function () {
    var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
    if (!Array.isArray(DH.screen)) DH.screen = [];
    DH.screen.push(bagArrow);
  })();

  ACH.hud = { resetHint: resetHint, rect: rect, init: init, setState: setState, setIntroLine: setIntroLine, update: update, toast: toast, tick: tick, clearToasts: clearToasts,
    flashHurt: flashHurt, showWin: showWin, debug: debug, fmtTime: fmtTime };
})();
