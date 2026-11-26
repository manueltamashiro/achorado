/* ACHORADO v0.13 (T3, agente S) — js/engine/pulido-v013.js: pulido de cabos sueltos que cruzan niveles. Se carga en las 3 páginas justo antes de game.js; todo va con guardas
   (si un nivel no tiene el sistema, no pasa nada).
   1. BARRAS DE JEFE vs LÍNEA DE OBJETIVO. La línea de objetivo (#objLine, arriba al centro, DOM) se pisaba con las barras de la Presidenta, El Chofer, el Maestro Wantán y el
      turista del dron (las de Doña Chancaca ya la escondían con la clase jefa-on). Ahora, mientras haya una barra de jefe en pantalla, el body lleva la clase `boss-on`
      y #objLine se esconde (en táctil no hace falta: allí va abajo). Al terminar la pelea vuelve sola. API: ACH.pulido.bossOn() → nombre del jefe con barra o null.
   2. LA E DE HISTORIA GANA A AGARRAR ARMAS (Gambetta). ACH.armas.eBlock(G) devuelve true cuando Alexander está a ≤24 px de un sobreviviente (Charo, Eusebio, Fosforito,
      la vecina) o dentro del cuadro de la combi cerrada, o junto al perro/la lata con su propio alcance: armas.js entonces ignora esa pulsación de E y esconde su cartel
      «E agarrar…», y es gambetta.js quien la usa. Fuera de ese radio, todo sigue igual.
   3. SOMBRA DEL DRON (Costa Verde): una sombra suave sobre el piso para que se lea que el dron vuela (ACH.sprites.zv13.dronShadow()). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var P = ACH.pulido = ACH.pulido || {};
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }

  /* ---------------- 1. barras de jefe ---------------- */
  (function () {
    var css = 'body:not(.touch).boss-on #objLine{display:none!important}';
    function inject() {
      if (document.getElementById('pulidoStyle')) return;
      var st = document.createElement('style'); st.id = 'pulidoStyle'; st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    }
    var cur = null, lastT = -1e9;
    function whichBoss() {
      var el, J, g, d;
      // Presidenta (Cerro): barra de canvas mientras st === 'pelea'
      try { J = ACH.presidenta && ACH.presidenta.state && ACH.presidenta.state(); if (J && J.st === 'pelea' && !J.dead) return 'presidenta'; } catch (e) { /* nada */ }
      // El Chofer (Gambetta)
      try { g = ACH.gambetta && ACH.gambetta.info && ACH.gambetta.info(); if (g && g.choferOn && !g.choferDone && g.chofer && g.chofer.state !== 'muerto') return 'chofer'; } catch (e2) { /* nada */ }
      // Doña Chancaca y el Maestro Wantán: barras HTML
      el = document.getElementById('jefaBar'); if (el && el.classList.contains('on')) return 'chancaca';
      el = document.getElementById('chefBar'); if (el && el.classList.contains('on')) return 'chef';
      // turista del dron
      try { d = ACH.cv && ACH.cv.dron; if (d && d.on && d.z && d.z.state !== 'muerto') return 'dron'; } catch (e3) { /* nada */ }
      return null;
    }
    function tick() {
      var t = now(); if (t - lastT < 200) return; lastT = t;
      var b = whichBoss();
      if (b !== cur) { cur = b; if (document.body) document.body.classList.toggle('boss-on', !!b); }
    }
    P.bossOn = function () { tick(); return cur; };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
    try {
      var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
      if (!Array.isArray(DH.screen)) DH.screen = [];
      DH.screen.push(function () { tick(); });
    } catch (e) { /* nada */ }
    // el HUD de pausa/título también cuenta: si el juego sale de «playing» el CSS de objetivo ya lo esconde; aquí solo evitamos que la clase se quede puesta
    document.addEventListener('visibilitychange', function () { lastT = -1e9; });
  })();

  /* ---------------- 2. la E de historia gana a agarrar armas ---------------- */
  (function () {
    var cache = { t: -1e9, v: false };
    function storyE(G) {
      var gam = ACH.gambetta, W = ACH.world;
      if (!gam || !gam.info || !W || W.id !== 'gambetta' || !W.GB || !G || !G.player || G.state !== 'playing') return false;
      var I = gam.info(); if (!I || !I.on || !I.near) return false;
      var gb = W.GB, p = G.player, n = I.near, q;
      if (n === 'combi') {
        if (I.combi) return false;                                           // ya vacía: no hay nada que abrir
        return Math.abs(p.x - gb.combi.x) <= 54 && Math.abs(p.y - (gb.combi.y - 8)) <= 34;
      }
      if (n === 'perro') return I.perro === 'herido';
      if (n === 'lata') return true;
      q = gb[n]; if (!q) return false;
      return dist(p.x, p.y, q.x, q.y) <= 24;
    }
    function eBlock(G) {
      var t = G && G.time !== undefined ? G.time : now();   // una vez por paso de juego (update y dibujo lo piden varias veces)
      if (t === cache.t) return cache.v;
      var v = false; try { v = storyE(G); } catch (e) { v = false; }
      cache.t = t; cache.v = v; return v;
    }
    P.eBlock = eBlock;
    function wire() { if (ACH.armas) { ACH.armas.eBlock = eBlock; return true; } return false; }
    if (!wire()) { var n = 0, iv = setInterval(function () { if (wire() || ++n > 40) clearInterval(iv); }, 250); }
  })();

  /* ---------------- 3. sombra del dron ---------------- */
  (function () {
    try {
      var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
      if (!Array.isArray(DH.ground)) DH.ground = [];
      DH.ground.push(function (g, G, cx, cy) {
        var d = ACH.cv && ACH.cv.dron; if (!d || !d.on || !d.z || d.z.state === 'muerto' || !d.drone) return;
        var Z = ACH.sprites && ACH.sprites.zv13, sh = Z && Z.dronShadow && Z.dronShadow(); if (!sh) return;
        var p = G.player, gy = d.markT > 0 && p ? p.y + 2 : d.z.y + 2, k = Math.max(0.5, Math.min(1, 1 - Math.abs(gy - d.drone.y) / 160 + 0.45));
        g.globalAlpha = k; g.drawImage(sh, Math.round(d.drone.x - cx - sh.ax), Math.round(gy - cy - sh.ay)); g.globalAlpha = 1;
      });
    } catch (e) { /* nada */ }
  })();
})();
