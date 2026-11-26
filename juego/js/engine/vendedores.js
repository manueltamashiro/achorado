/* ACHORADO v0.11 — js/engine/vendedores.js (B): los vendedores vivos de cada nivel y sus puestos (V011.md §3.4).
   API: ACH.vendedores = { list() → [{id, name, nivel, x, y}], near(x, y) → vendor|null, open(id) → bool, setup(), level() → id }
   - Don Pocho, el cachinero (Gambetta, manta de cachina en la vereda sur junto al paradero del inicio) · Doña Meche (Cerro, la ventana
     enrejada de su bodeguita junto a la cisterna de la terraza 70) · el pintor (Miraflores, anfiteatro de la rotonda) · Doña Rosa
     (Miraflores, toldo del Mercado de Pulgas). Don Pepe y Don Tito los sigue atendiendo inflables.js (con ACH.tienda).
   - Personas vivas: no están en G.zombies (los zombies los ignoran y los golpes pasan de largo). E a ≤ 22 px abre ACH.tienda.open(id);
     burbuja «E» encima. La primera vez que abres cada uno dice una línea de presentación (toast + globo si hay ACH.audio.say).
   - Dibujo: ACH.extraDrawables (render.js) para el orden por y; la manta en ACH.drawHooks.ground; la burbuja en ACH.drawHooks.air.
     Sprites: ACH.sprites.v011.npc[id] y ACH.sprites.v011.puesto[cachina|bodeguita|caballetes] (agente E); sin ellos, provisorios horneados. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var T = 16, NEAR_R = 22;

  // dónde va cada uno: punto deseado (px de mundo) según el mundo cargado; luego se busca el hueco libre más cercano
  var SPOTS = {
    cachinero: { nivel: 'gambetta', puesto: 'cachina', at: function () { return { x: 12.5 * T, y: 36.4 * T }; } },
    meche: { nivel: 'cerro', puesto: 'bodeguita', at: function (W) {
      var c = W.cisterna; if (c && c.x) return { x: c.x + 6.5 * T, y: c.y + 2 };
      return { x: 30 * T, y: 72 * T };
    } },
    pintor: { nivel: 'miraflores', puesto: 'caballetes', at: function (W) {
      var R0 = W.rotonda; if (R0 && R0.c) return { x: (R0.c + 4.2) * T, y: (R0.r + 3.6) * T };
      return { x: 61.7 * T, y: 39.1 * T };
    } },
    rosa: { nivel: 'miraflores', puesto: null, at: function (W) {
      var Mk = W.mercado; if (Mk && Mk.c) return { x: (Mk.c + 3.9) * T, y: (Mk.r + 3.0) * T };
      return { x: 103.9 * T, y: 47.5 * T };
    } }
  };
  var INTRO = {
    cachinero: '¡Joven! Pase, pase. Cachina fina del Callao: lo que busque, Don Pocho lo tiene.',
    meche: '¿Subiste hasta aquí con los muertos atrás, hijito? Pasa, que la bodeguita sigue abierta.',
    pintor: 'Pase, joven. El arte no se detiene por un apocalipsis.',
    rosa: 'Caserito, todo hecho a mano, como antes. Llévese algo para su casita.'
  };
  var LOOK = {   // colores del provisorio: piel, ropa, ropa2, cabeza, pantalón
    cachinero: { skin: '#b88660', a: '#8a7a4a', b: '#5a4a2a', hat: '#5a5a62', leg: '#3a3a48', kind: 'gorra' },
    meche: { skin: '#a8724e', a: '#d8263a', b: '#f2f2f2', hat: '#1c1a22', leg: '#4a3a5a', kind: 'mandil' },
    pintor: { skin: '#c98a6a', a: '#f2eee2', b: '#1fe07a', hat: '#1c1a22', leg: '#2a3a5a', kind: 'boina' },
    rosa: { skin: '#9a6a48', a: '#ff2e88', b: '#1fe07a', hat: '#d8b870', leg: '#3a2a3a', kind: 'sombrero' }
  };

  function sfx(n, d) { var a = ACH.audio; if (a && a.emit) { try { a.emit(n, d); } catch (e) { /* nada */ } } }
  function toast(t) { if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(t); } catch (e) { /* nada */ } } }
  function getG() { return ACH.game && ACH.game.G || ACH.G || null; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function level() {
    if (ACH.nivel && ACH.nivel.id) return ACH.nivel.id;
    if (ACH.game && typeof ACH.game.levelId === 'function') { try { var l = ACH.game.levelId(); if (l) return l; } catch (e) { /* nada */ } }
    var W = ACH.world; return (W && (W.level || W.id)) || 'gambetta';
  }

  /* ---------------- Sprites (E) o provisorios horneados ---------------- */
  var phNpc = {}, phPuesto = {};
  function bakeNpc(id) {
    if (phNpc[id]) return phNpc[id];
    var L = LOOK[id] || LOOK.cachinero, fr = [];
    for (var f = 0; f < 3; f++) {
      var c = mk(22, 38), g = c.getContext('2d'), K = '#131015', bob = f === 1 ? 1 : 0;
      var r = function (x, y, w, h, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1 + bob, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y + bob, w, h); };
      r(6, 26, 4, 11, L.leg); r(12, 26, 4, 11, L.leg);                        // piernas
      g.fillStyle = '#1c1a22'; g.fillRect(5, 36, 5, 2); g.fillRect(12, 36, 5, 2);
      r(4, 13, 14, 14, L.a);                                                  // cuerpo
      if (L.kind === 'mandil') { g.fillStyle = L.b; for (var yy = 0; yy < 12; yy += 2) for (var xx = 0; xx < 10; xx += 2) if (((xx + yy) >> 1) % 2) g.fillRect(6 + xx, 15 + yy + bob, 2, 2); }
      else if (L.kind === 'gorra') { g.fillStyle = L.b; g.fillRect(5, 15 + bob, 4, 3); g.fillRect(13, 15 + bob, 4, 3); g.fillRect(5, 20 + bob, 4, 3); g.fillRect(13, 20 + bob, 4, 3); }
      else if (L.kind === 'boina') { g.fillStyle = '#ff2e88'; g.fillRect(6, 17 + bob, 2, 2); g.fillStyle = '#3a8ae8'; g.fillRect(13, 20 + bob, 2, 1); g.fillStyle = '#ffe500'; g.fillRect(9, 23 + bob, 2, 2); }
      else { g.fillStyle = L.b; g.fillRect(4, 16 + bob, 14, 2); g.fillRect(4, 21 + bob, 14, 2); }
      r(2, 15, 2, 9, L.a); r(18, 15, 2, 9, L.a);                              // brazos
      g.fillStyle = L.skin; g.fillRect(2, 24 + bob, 2, 2); g.fillRect(18, 24 + bob, 2, 2);
      r(7, 4, 8, 9, L.skin);                                                  // cara
      g.fillStyle = K; g.fillRect(9, 7 + bob, 1, 1); g.fillRect(12, 7 + bob, 1, 1);
      if (f === 2) { g.fillRect(10, 10 + bob, 2, 2); } else g.fillRect(10, 10 + bob, 2, 1);   // boca (cuadro «hablando»)
      if (L.kind === 'gorra') { r(6, 2, 10, 3, L.hat); g.fillStyle = L.hat; g.fillRect(14, 4 + bob, 4, 1); g.fillStyle = '#d8d8d0'; g.fillRect(7, 9 + bob, 1, 1); g.fillRect(14, 9 + bob, 1, 1); }
      else if (L.kind === 'mandil') { r(6, 2, 10, 3, L.hat); r(9, 0, 4, 2, L.hat); }
      else if (L.kind === 'boina') { r(5, 2, 12, 3, L.hat); g.fillStyle = '#5a3a2a'; g.fillRect(7, 10 + bob, 8, 3); g.fillStyle = L.skin; g.fillRect(10, 10 + bob, 2, 1); }
      else { r(3, 2, 16, 2, L.hat); r(7, 0, 8, 2, L.hat); g.fillStyle = '#1c1a22'; g.fillRect(5, 5 + bob, 2, 12); g.fillRect(15, 5 + bob, 2, 12); g.fillStyle = '#ff2e88'; g.fillRect(5, 16 + bob, 2, 1); g.fillRect(15, 16 + bob, 2, 1); }
      c.ax = 11; c.ay = 37;
      fr.push(c);
    }
    phNpc[id] = { idle: [fr[0], fr[1]], talk: fr[2], ph: true };
    return phNpc[id];
  }
  function npcFrames(id) {
    var V = ACH.sprites && ACH.sprites.v011, N = V && V.npc, s = N && N[id];
    if (s) {
      if (Array.isArray(s) && s.length && s[0] && s[0].width) return { idle: s.slice(0, Math.min(2, s.length)), talk: s[2] || s[0] };
      if (s.idle && Array.isArray(s.idle) && s.idle[0] && s.idle[0].width) return { idle: s.idle, talk: (s.talk && (s.talk.width ? s.talk : s.talk[0])) || s.idle[0] };
      if (s.frames && s.frames[0] && s.frames[0].width) return { idle: s.frames.slice(0, 2), talk: s.frames[2] || s.frames[0] };
      if (s.width) return { idle: [s], talk: s };
    }
    return bakeNpc(id);
  }
  function bakePuesto(k) {
    if (phPuesto[k]) return phPuesto[k];
    var c, g, K = '#131015';
    if (k === 'cachina') {   // manta en el piso con cachivaches (radio, plancha, fierros, zapatos)
      c = mk(44, 16); g = c.getContext('2d');
      g.fillStyle = K; g.fillRect(0, 3, 44, 13); g.fillStyle = '#3a6ab8'; g.fillRect(1, 4, 42, 11);
      g.fillStyle = '#d8263a'; for (var x = 3; x < 42; x += 6) g.fillRect(x, 4, 2, 11);
      g.fillStyle = K; g.fillRect(4, 1, 9, 7); g.fillStyle = '#3a3a42'; g.fillRect(5, 2, 7, 5); g.fillStyle = '#c8ccd4'; g.fillRect(6, 3, 2, 2); g.fillRect(9, 3, 2, 1);   // radio
      g.fillStyle = K; g.fillRect(16, 5, 8, 5); g.fillStyle = '#d0d6dd'; g.fillRect(17, 6, 6, 3); g.fillStyle = '#e8402c'; g.fillRect(17, 8, 2, 1);                       // plancha
      g.fillStyle = '#8a8f98'; g.fillRect(27, 6, 9, 1); g.fillRect(28, 9, 7, 1); g.fillStyle = '#b84a2a'; g.fillRect(30, 7, 1, 2);                                          // fierros
      g.fillStyle = K; g.fillRect(37, 9, 6, 4); g.fillStyle = '#8a4b1d'; g.fillRect(38, 10, 4, 2);                                                                          // zapato
      c.ax = 22; c.ay = 15;
    } else if (k === 'bodeguita') {   // ventana enrejada con productos y letrero pintado a mano
      c = mk(40, 40); g = c.getContext('2d');
      g.fillStyle = K; g.fillRect(0, 0, 40, 40); g.fillStyle = '#e8c840'; g.fillRect(1, 1, 38, 38);
      g.fillStyle = '#1fe07a'; g.fillRect(2, 2, 36, 9); g.fillStyle = K; g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BODEGA MECHE', 20, 7);
      g.fillStyle = K; g.fillRect(5, 13, 30, 22); g.fillStyle = '#4a3a2a'; g.fillRect(6, 14, 28, 20);
      var prod = ['#ffe500', '#d8263a', '#4aa8ff', '#f2f2f2', '#ff8a30'];
      for (var i = 0; i < 6; i++) { g.fillStyle = prod[i % prod.length]; g.fillRect(8 + i * 4, 16, 3, 5); g.fillStyle = prod[(i + 2) % prod.length]; g.fillRect(8 + i * 4, 25, 3, 4); }
      g.fillStyle = '#c8b89a'; g.fillRect(5, 34, 30, 3);
      c.ax = 20; c.ay = 39;
    } else {   // caballetes: dos, con un gato y el mar
      c = mk(16, 28); g = c.getContext('2d');
      g.fillStyle = '#6a4a2a'; g.fillRect(3, 6, 2, 22); g.fillRect(11, 6, 2, 22); g.fillRect(7, 2, 2, 24);
      g.fillStyle = K; g.fillRect(1, 3, 14, 13); g.fillStyle = '#f3efe2'; g.fillRect(2, 4, 12, 11);
      c.ax = 8; c.ay = 27;
      var a = mk(16, 28), ga = a.getContext('2d'); ga.drawImage(c, 0, 0);
      ga.fillStyle = '#6a8ab8'; ga.fillRect(2, 4, 12, 6); ga.fillStyle = '#4a5a6a'; ga.fillRect(2, 10, 12, 5); ga.fillStyle = '#f2f2f2'; ga.fillRect(4, 11, 3, 1);   // el mar gris
      a.ax = 8; a.ay = 27;
      var b = mk(16, 28), gb = b.getContext('2d'); gb.drawImage(c, 0, 0);
      gb.fillStyle = '#e8b830'; gb.fillRect(2, 4, 12, 11); gb.fillStyle = '#3a3a42'; gb.fillRect(5, 8, 6, 5); gb.fillRect(5, 6, 2, 2); gb.fillRect(9, 6, 2, 2); gb.fillStyle = '#1fe07a'; gb.fillRect(6, 9, 1, 1); gb.fillRect(9, 9, 1, 1);   // un gato
      b.ax = 8; b.ay = 27;
      c = [a, b];
    }
    phPuesto[k] = c;
    return c;
  }
  function puestoSpr(k) {
    var V = ACH.sprites && ACH.sprites.v011, P = V && V.puesto, s = P && P[k];
    if (s && s.width) return s;
    if (Array.isArray(s) && s.length && s[0] && s[0].width) return s;
    return bakePuesto(k);
  }
  function anchorOf(s) { return { ax: s.ax !== undefined ? s.ax : s.width >> 1, ay: s.ay !== undefined ? s.ay : s.height - 1 }; }
  function blit(g, s, x, y) { var a = anchorOf(s); g.drawImage(s, Math.round(x - a.ax), Math.round(y - a.ay)); }

  /* ---------------- Colocación ---------------- */
  var vendors = [], placedFor = null, placedKey = '', solids = [];
  function free(W, x, y, r) {
    if (!W || !W.collideCircle) return true;
    try { return !W.collideCircle(x, y, r) && !W.collideCircle(x, y + 10, r) && !W.collideCircle(x - 12, y + 8, 3) && !W.collideCircle(x + 12, y + 8, 3); } catch (e) { return true; }
  }
  function snap(W, x, y) {
    if (free(W, x, y, 6)) return { x: Math.round(x), y: Math.round(y) };
    for (var d = 4; d <= 120; d += 4) for (var a = 0; a < 16; a++) {
      var ang = a / 16 * Math.PI * 2, nx = x + Math.cos(ang) * d, ny = y + Math.sin(ang) * d * 0.6;
      if (free(W, nx, ny, 6)) return { x: Math.round(nx), y: Math.round(ny) };
    }
    return { x: Math.round(x), y: Math.round(y) };
  }
  function setup() {
    var W = ACH.world, lv = level(), D = ACH.VENDEDORES_DATA || {};
    removeSolids();
    vendors.length = 0; placedFor = W; placedKey = lv + ':' + (W && W.props ? W.props.length : 0);
    if (!W) return vendors;
    Object.keys(SPOTS).forEach(function (id) {
      var sp = SPOTS[id], d = D[id];
      if (!d || (d.nivel || sp.nivel) !== lv) return;
      var want = null; try { want = sp.at(W); } catch (e) { want = null; }
      if (!want) return;
      var q = snap(W, want.x, want.y);
      vendors.push({ id: id, name: d.name, nivel: lv, x: q.x, y: q.y, puesto: sp.puesto, t: Math.random() * 3, talkT: 0, said: !!saidOnce[id] });
    });
    addSolids(W);
    return vendors;
  }
  var saidOnce = {};
  // Miraflores: sólidos dinámicos (no se atraviesan); en las otras páginas el mundo no los trae y se pasa al lado
  function addSolids(W) {
    if (!W || !Array.isArray(W.dynSolids)) return;
    vendors.forEach(function (v) {
      var ds = { x0: v.x - 5, y0: v.y - 4, x1: v.x + 5, y1: v.y, v011: v.id };
      W.dynSolids.push(ds); solids.push(ds);
    });
  }
  function removeSolids() {
    var W = placedFor;
    if (W && Array.isArray(W.dynSolids)) for (var i = W.dynSolids.length - 1; i >= 0; i--) if (W.dynSolids[i] && W.dynSolids[i].v011) W.dynSolids.splice(i, 1);
    solids.length = 0;
  }
  function ensure() {
    var W = ACH.world; if (!W) return;
    var key = level() + ':' + (W.props ? W.props.length : 0);
    if (W !== placedFor || key !== placedKey) setup();
    else if (solids.length && Array.isArray(W.dynSolids) && W.dynSolids.indexOf(solids[0]) < 0) { solids.length = 0; addSolids(W); }   // alguien vació los sólidos
  }

  /* ---------------- Interacción ---------------- */
  var nearV = null;
  function near(x, y) {
    var best = null, bd = NEAR_R + 0.01;
    for (var i = 0; i < vendors.length; i++) { var v = vendors[i], d = dist(x, y, v.x, v.y) - (v.puesto === 'cachina' ? 12 : 0); if (d < bd) { bd = d; best = v; } }   // la manta de Don Pocho: se le habla desde la manta
    return best;
  }
  function computeNear(G) {
    var p = G && G.player; nearV = null;
    if (!p || p.hp <= 0 || G.state !== 'playing') return null;
    nearV = near(p.x, p.y);
    return nearV;
  }
  function openV(v) {
    if (!v || !ACH.tienda || typeof ACH.tienda.open !== 'function') return false;
    var ok = false; try { ok = ACH.tienda.open(v.id, { x: v.x, y: v.y }); } catch (e) { ok = false; }
    if (!ok) return false;
    v.talkT = 2.5;
    if (!v.said) {
      v.said = true; saidOnce[v.id] = true;
      var line = INTRO[v.id];
      if (line) {
        // arreglos v0.11: la línea va dentro del panel (ya no un globo encima que tapaba el título); toast solo si la tienda no la puede mostrar
        var inPanel = false; try { inPanel = !!(ACH.tienda.line && ACH.tienda.line(line, v.name)); } catch (e2) { inPanel = false; }
        if (!inPanel) toast(v.name + ': «' + line + '»');
        var a = ACH.audio; if (a && a.emit) { try { a.emit('vendor.hello', { vendor: v.id, x: v.x, y: v.y }); } catch (e3) { /* nada */ } }
      }
    }
    return true;
  }
  function wrapArmas() {
    var A = ACH.armas; if (!A || typeof A.update !== 'function' || A.update._v011v) return !!(A && A.update && A.update._v011v);
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      try { ensure(); computeNear(G); } catch (e) { nearV = null; }
      var In = ACH.input;
      if (nearV && In && In.pressed && In.pressed('KeyE') && openV(nearV)) {
        var op = In.pressed;
        In.pressed = function (c) { return c === 'KeyE' ? false : op(c); };
        try { return origU.apply(this, arguments); } finally { In.pressed = op; }
      }
      return origU.apply(this, arguments);
    };
    A.update._v011v = true;
    if (typeof origC === 'function' && !origC._v011v) {
      A.context = function () { if (nearV) return { label: 'COMPRAR', code: 'KeyE' }; return origC.apply(this, arguments); };
      A.context._v011v = true;
    }
    return true;
  }
  wrapArmas();
  // respaldo sin armas.js (o si alguien reemplazó update): E por teclado
  window.addEventListener('keydown', function (e) {
    if (e.code !== 'KeyE' || e.repeat) return;
    var A = ACH.armas; if (A && A.update && A.update._v011v) return;
    var G = getG(); if (!G || G.state !== 'playing') return;
    if (ACH.inv && ACH.inv.isOpen && ACH.inv.isOpen()) return;
    ensure(); var v = computeNear(G);
    if (v && openV(v)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ---------------- Dibujo ---------------- */
  function inView(G, x, y, pad) {
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, c = G.cam || { x: 0, y: 0 };
    return x > c.x - pad && x < c.x + V.w + pad && y > c.y - pad && y < c.y + V.h + pad + 40;
  }
  function drawNpc(g, v, cx, cy, G) {
    var F = npcFrames(v.id), clock = (G && G.clock) || 0;
    var s = v.talkT > 0 && Math.floor(clock * 6) % 2 === 0 ? F.talk : F.idle[Math.floor((clock + v.t) * 2) % F.idle.length];
    if (!s || !s.width) return;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(v.x) - cx - 6, Math.round(v.y) - cy - 1, 12, 3);
    blit(g, s, v.x - cx, v.y - cy);
    if (v.puesto === 'bodeguita' && F.ph && isPH('bodeguita')) {   // la reja delante de Doña Meche (solo con el provisorio)
      var x0 = Math.round(v.x) - cx - 13, y0 = Math.round(v.y) - cy - 30;
      g.fillStyle = '#1c1a22'; for (var k = 0; k < 7; k++) g.fillRect(x0 + 1 + k * 4, y0, 1, 22);
      g.fillRect(x0, y0, 27, 1); g.fillRect(x0, y0 + 11, 27, 1);
      g.fillStyle = '#c8b89a'; g.fillRect(x0 - 1, y0 + 20, 29, 3);
    }
  }
  function bodeguitaE() {
    var V = ACH.sprites && ACH.sprites.v011, P = V && V.puesto, B = P && P.bodeguita, N = V && V.npc, M = N && N.meche, bu = M && M.busto;
    if (!B || !B.fondo || !B.fondo.width || !B.frente || !B.frente.width || !bu || !Array.isArray(bu.idle) || !bu.idle[0]) return null;
    var d = B.mecheBusto || { dx: 0, dy: -20 };
    return { fondo: B.fondo, frente: B.frente, busto: bu, dxy: { dx: d.dx || 0, dy: d.dy === undefined ? -20 : d.dy } };
  }
  function isPH(k) { var V = ACH.sprites && ACH.sprites.v011, P = V && V.puesto; return !(P && P[k] && (P[k].width || (P[k][0] && P[k][0].width))); }
  function drawables(G) {
    if (!vendors.length) return null;
    var out = [];
    vendors.forEach(function (v) {
      if (!inView(G, v.x, v.y, 50)) return;
      var BQ = v.puesto === 'bodeguita' ? bodeguitaE() : null;
      if (BQ) {   // arte de E: fondo → Meche asomada (busto) → reja y mostrador, todo con la misma ancla
        out.push({ y: v.y, x: v.x, draw: function (g, cx, cy) {
          var x = v.x - cx, y = v.y - cy, clock = (G && G.clock) || 0, b = BQ.busto, d = BQ.dxy;
          blit(g, BQ.fondo, x, y);
          var s = v.talkT > 0 && Math.floor(clock * 6) % 2 === 0 ? (b.hablando || b.talk || b.idle[0]) : b.idle[Math.floor((clock + v.t) * 2) % b.idle.length];
          if (s && s.width) blit(g, s, x + d.dx, y + d.dy);
          blit(g, BQ.frente, x, y);
        } });
        return;
      }
      out.push({ y: v.y, x: v.x, draw: function (g, cx, cy) { drawNpc(g, v, cx, cy, G); } });
      if (v.puesto === 'bodeguita') out.push({ y: v.y - 3, x: v.x, draw: function (g, cx, cy) { var s = puestoSpr('bodeguita'); blit(g, Array.isArray(s) ? s[0] : s, v.x - cx, v.y - 3 - cy); } });
      else if (v.puesto === 'caballetes') {
        var s = puestoSpr('caballetes');
        if (s && s.width && !Array.isArray(s)) out.push({ y: v.y - 1, x: v.x - 42, draw: function (g, cx, cy) { blit(g, s, v.x - 42 - cx, v.y - 1 - cy); } });   // arte de E: el pintor a la derecha
        else if (Array.isArray(s)) {
          out.push({ y: v.y - 1, x: v.x - 17, draw: function (g, cx, cy) { blit(g, s[0], v.x - 17 - cx, v.y - 1 - cy); } });
          out.push({ y: v.y + 1, x: v.x + 16, draw: function (g, cx, cy) { blit(g, s[1] || s[0], v.x + 16 - cx, v.y + 1 - cy); } });
        }
      }
    });
    return out;
  }
  function drawGround(g, G, cx, cy) {
    try { ensure(); } catch (e) { /* nada */ }
    var dt = 1 / 60;
    for (var i = 0; i < vendors.length; i++) {
      var v = vendors[i]; if (v.talkT > 0 && G.state === 'playing') v.talkT -= dt;
      if (v.puesto !== 'cachina' || !inView(G, v.x, v.y, 50)) continue;
      var s = puestoSpr('cachina'); s = Array.isArray(s) ? s[0] : s;
      if (isPH('cachina')) blit(g, s, v.x + 22 - cx, v.y + 4 - cy);
      else blit(g, s, v.x - cx, v.y + 24 - cy);   // arte de E: Don Pocho de pie detrás de la manta (pies 24 px arriba de su ancla)
    }
  }
  function drawAir(g, G, cx, cy) {
    if (!nearV || G.state !== 'playing' || (ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen())) return;
    var v = nearV, bx = Math.round(v.x) - cx, by = Math.round(v.y) - cy - 46, bob = Math.floor(((G.clock || 0) * 3)) % 2;
    // burbuja «E»
    g.fillStyle = '#131015'; g.fillRect(bx - 6, by - 6 - bob, 13, 12); g.fillRect(bx - 1, by + 6 - bob, 3, 2);
    g.fillStyle = '#ffe500'; g.fillRect(bx - 5, by - 5 - bob, 11, 10);
    g.fillStyle = '#131015'; g.fillRect(bx - 2, by - 3 - bob, 5, 1); g.fillRect(bx - 2, by - 3 - bob, 1, 7); g.fillRect(bx - 2, by - bob, 4, 1); g.fillRect(bx - 2, by + 3 - bob, 5, 1);
    if (ACH.touch && ACH.touch.on) return;
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var s = 'comprar · ' + v.name, w = Math.ceil(g.measureText(s).width) + 6, ty = by - 14;
    g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(bx - (w >> 1), ty - 5, w, 10);
    g.globalAlpha = 1; g.fillStyle = '#ff2e88'; g.fillRect(bx - (w >> 1), ty + 5, w, 1);
    g.fillStyle = '#f2f2f2'; g.fillText(s, bx, ty);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }
  if (!Array.isArray(ACH.extraDrawables)) ACH.extraDrawables = [];
  ACH.extraDrawables.push(function (G) { return drawables(G); });
  var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  ['ground', 'air'].forEach(function (k) { if (!Array.isArray(DH[k])) DH[k] = []; });
  DH.ground.push(drawGround);
  DH.air.push(drawAir);
  (ACH.levelHooks = ACH.levelHooks || []).push(function () { try { setup(); } catch (e) { /* nada */ } });
  // armas.js podría reemplazar su update después (otro agente): se vuelve a envolver si hace falta
  var wrapTries = 0, wrapTimer = setInterval(function () { wrapArmas(); if (++wrapTries > 40) clearInterval(wrapTimer); }, 500);

  ACH.vendedores = {
    list: function () { ensure(); return vendors.map(function (v) { return { id: v.id, name: v.name, nivel: v.nivel, x: v.x, y: v.y, c: +(v.x / T).toFixed(2), r: +(v.y / T).toFixed(2), puesto: v.puesto }; }); },
    near: function (x, y) { ensure(); return near(x, y); },
    open: function (id) { ensure(); for (var i = 0; i < vendors.length; i++) if (vendors[i].id === id) return openV(vendors[i]); return false; },
    setup: setup, level: level, SPOTS: SPOTS, drawables: drawables
  };

  /* ---------------- Debug ---------------- */
  var D = ACH.debug = ACH.debug || {}, V = D.v011 = D.v011 || {};
  V.vendedores = function () {
    var out = ACH.vendedores.list(), inf = ACH.world && ACH.world.vendors;   // + Don Pepe y Don Tito (inflables.js)
    if (Array.isArray(inf)) inf.forEach(function (v) { out.push({ id: v.id, name: v.name, nivel: 'miraflores', x: v.x, y: v.y, c: +(v.x / T).toFixed(2), r: +(v.y / T).toFixed(2), puesto: 'inflables' }); });
    return out;
  };
  V.irVendedor = function (id) {
    var L = V.vendedores(), v = null; for (var i = 0; i < L.length; i++) if (L[i].id === id) v = L[i];
    if (!v) return { error: 'aquí hay: ' + L.map(function (q) { return q.id; }).join(', ') };
    if (D.teleport) D.teleport(v.x, v.y + 14);
    return v;
  };
})();
