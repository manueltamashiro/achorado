/* ACHORADO v0.11 — js/miraflores/cargables.js (agente A, V011.md §2.4): cosas de Miraflores que se cargan con E y se tiran lejos con F.
   Mantener F carga el tiro (0,2 s = corto · 0,8 s = alcance máximo) y soltar lo tira en arco hacia el mouse (si se movió en los últimos 2 s;
   si no, o en táctil, hacia donde mira). Mientras carga se dibuja un arco punteado con el punto de caída.

   CARGABLES (ACH.armas.define en modo 'carry', como la tele de v0.9, con tiro largo):
     llanta    sale de un auto al 2.º golpe (o al romperse), una por auto · rueda 40 px al caer · se agarra otra vez UNA vez; a la 2.ª se revienta (jebe)
     tablon    al golpear un toldoFeria, kioscoGolosinas o mesaPizzeria (una vez por prop) · al caer se parte (1–2 tablas)
     basurero  E directo en un basureroMira (lo arranca) · al caer se abolla (chatarra 30 %) y suelta basura
     macetero  E o golpe en un maceteroMira (mundo.js) · al caer se rompe en tierra y pedazos
   Contra la jefa y los enjambres el impacto pasa por ACH.nivel.onProjectile(G, {x, y, r: 8, kind: 'heavy:<id>', dmg, bees: 3}).

   Detección de golpes a props: ACH.propHooks si existe (B, interaccion.js); además, siempre, el golpe cuerpo a cuerpo (onSwing de este sistema),
   la caída de un cargable y, para los autos, la vida del prop (pr.ihp / pr.dstate de interaccion.js) leída en update. Un mismo golpe no cuenta dos veces.
   Sprites: ACH.sprites.v011.loose[id].{suelo, cargado, vuelo[], roto} (agente E); si faltan, reemplazos horneados aquí.
   DEBUG: ACH.debug.v011.spawn(id) · ACH.debug.v011.cargables() (fuentes y estado). Sin getImageData/shadowBlur/filter/degradados en el bucle. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  ACH.mira = ACH.mira || {};
  if (!ACH.mira.systems) ACH.mira.systems = [];
  var MIRA = ACH.mira;

  /* ---------------- Afinación (V011.md §2.4) ---------------- */
  var DEFS = {
    llanta:   { name: 'llanta',   speed: 0.75, range: [70, 200], jefa: 4,   zdmg: 2,   push: 120, mat: 'rubber' },
    tablon:   { name: 'tablón',   speed: 0.8,  range: [60, 180], jefa: 4,   zdmg: 2,   push: 90,  mat: 'wood' },
    basurero: { name: 'basurero', speed: 0.85, range: [60, 170], jefa: 3,   zdmg: 1.5, push: 80,  mat: 'trash' },
    macetero: { name: 'macetero', speed: 0.8,  range: [60, 160], jefa: 3,   zdmg: 1.5, push: 60,  mat: 'dirt' }
  };
  var K = { chargeT: 0.8, chargeMin: 0.2, lob: 150, z0: 22, high: 12, landR: 16, beesDmg: 3, rollPx: 40, rollFric: 2.2, dedupe: 0.2,
    jefaZ: 28, zombieZ: 14, zombieR: 9, swingPad: 4, grabToastR: 26 };
  var CAR_RE = /^(carVar|car|tico|mototaxiVar|mototaxi|combi|custer)(E|W|N|S)?$/;
  var CAT = { toldoFeria: 'tablon', kioscoGolosinas: 'tablon', mesaPizzeria: 'tablon', maceteroMira: 'macetero', basureroMira: 'basurero' };
  var TXT = { grab: 'E agarra · mantén F y suelta para tirarlo lejos', tire: '¡Se le salió la llanta!', board: '¡Un tablón suelto!' };

  /* ---------------- Utilidades ---------------- */
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function sfx(name, data) { var A = ACH.audio; if (A && typeof A.emit === 'function') { try { A.emit(name, data); } catch (e) { /* nada */ } } }
  function toast(s) { if (ACH.hud && typeof ACH.hud.toast === 'function') { try { ACH.hud.toast(s); } catch (e) { /* nada */ } } }
  function W() { return ACH.world; }
  function A() { return ACH.armas; }
  function now(G) { return (G && (G.time || G.clock)) || 0; }
  function invHas(id) { var iv = ACH.inv, d = iv && iv.defs; return !!(iv && typeof iv.drop === 'function' && (!d || d[id])); }
  function drop(x, y, items) {
    var ok = []; for (var i = 0; i < items.length; i++) if (items[i].n > 0 && invHas(items[i].id)) ok.push(items[i]);
    if (!ok.length) return;
    try { ACH.inv.drop(x, y, ok); } catch (e) { /* nada */ }
  }

  /* ---------------- Sprites (los de E o reemplazos horneados) ---------------- */
  function mk(w, h, ax, ay, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;   // se hornea una vez por sprite (pocos lienzos)
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); c.ax = ax; c.ay = ay; c.placeholder = true; return c;
  }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  var PH = {
    llanta: function () { return mk(14, 14, 7, 13, function (g) {
      g.fillStyle = '#131015'; g.beginPath(); g.arc(7, 7, 6.6, 0, 6.3); g.fill();
      g.fillStyle = '#2a2a2e'; g.beginPath(); g.arc(7, 7, 5.4, 0, 6.3); g.fill();
      g.fillStyle = '#8a8f98'; g.beginPath(); g.arc(7, 7, 2.8, 0, 6.3); g.fill();
      R(g, '#c9ccd0', 6, 6, 2, 2); R(g, '#3a3a40', 2, 6, 1, 2); R(g, '#3a3a40', 11, 6, 1, 2);
    }); },
    tablon: function () { return mk(24, 7, 12, 6, function (g) {
      R(g, '#131015', 0, 0, 24, 7); R(g, '#b9783a', 1, 1, 22, 5);
      for (var x = 1; x < 23; x += 6) R(g, '#d8402c', x, 1, 3, 5);
      R(g, '#8a4b1d', 1, 5, 22, 1); R(g, '#f3efe2', 4, 2, 1, 1); R(g, '#f3efe2', 16, 3, 1, 1);
    }); },
    basurero: function () { return mk(11, 15, 5, 14, function (g) {
      R(g, '#131015', 0, 1, 11, 14); R(g, '#3a6a3a', 1, 2, 9, 12); R(g, '#2c5230', 1, 2, 9, 2);
      R(g, '#4f8a4a', 2, 5, 1, 8); R(g, '#4f8a4a', 5, 5, 1, 8); R(g, '#4f8a4a', 8, 5, 1, 8); R(g, '#131015', 3, 0, 5, 1); R(g, '#e8e0cf', 4, 7, 3, 2);
    }); },
    macetero: function () { return mk(14, 16, 7, 15, function (g) {
      R(g, '#2f6a2a', 3, 0, 8, 6); R(g, '#4f9a3a', 4, 1, 3, 3); R(g, '#d8402c', 8, 1, 2, 2); R(g, '#e8b830', 5, 2, 1, 1);
      R(g, '#131015', 1, 5, 12, 11); R(g, '#b8744a', 2, 6, 10, 9); R(g, '#8a4f2a', 2, 6, 10, 2); R(g, '#d08a5a', 3, 9, 1, 5);
    }); }
  };
  function firstCanvas(o) { if (Array.isArray(o)) o = o[0]; return o && o.getContext ? o : null; }
  function anch(c, cx) { if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = cx ? c.height >> 1 : c.height - 1; } return c; }
  function rotFrames(src) {   // 4 cuadros de giro horneados (solo al hornear)
    var out = [], s = Math.max(src.width, src.height) + 2;
    for (var f = 0; f < 4; f++) {
      out.push(mk(s, s, s >> 1, s >> 1, function (g) { g.translate(s / 2, s / 2); g.rotate(f * Math.PI / 2); g.drawImage(src, -src.width / 2, -src.height / 2); }));
    }
    return out;
  }
  var sprOK = {};
  function ensureSprites() {
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {}, FX = S.fx = S.fx || {};
    var V = S.v011 && S.v011.loose;
    for (var id in DEFS) {
      var E = V && V[id], suelo = E ? firstCanvas(E.suelo || E.idle || E) : null, real = !!suelo;
      if (sprOK[id] === 'real' || (sprOK[id] === 'ph' && !real)) continue;
      if (!suelo) suelo = PH[id]();
      anch(suelo);
      P['v011_' + id] = suelo;
      var roto = E ? firstCanvas(E.roto) : null; if (roto) { anch(roto); suelo.broken = roto; }
      var vu = E && Array.isArray(E.vuelo) && E.vuelo.length && E.vuelo[0] && E.vuelo[0].getContext ? E.vuelo : null;
      if (vu) vu.forEach(function (c) { anch(c, true); }); else vu = rotFrames(suelo);
      FX['v011_' + id + 'Vuelo'] = vu;
      sprOK[id] = real ? 'real' : 'ph';
    }
  }

  /* ---------------- Definición en armas.js ---------------- */
  var defined = false;
  function defineAll() {
    var AR = A(); if (!AR || typeof AR.define !== 'function') return false;
    if (defined && AR.defs.llanta && AR.defs.llanta.cargable) return true;
    Object.keys(DEFS).forEach(function (id) {
      var c = DEFS[id];
      AR.define(id, {
        name: c.name, spr: 'v011_' + id, mode: 'carry', heavy: true, cargable: true, speedMul: c.speed, carrySpeed: c.speed, lift: 18,
        chargeT: K.chargeT, chargeMin: K.chargeMin, aimRecent: true, aimClamp: true,   // arreglos v0.11: con mouse cae donde apunta (tope: el alcance cargado)
        throwRange: c.range, z0: K.z0, flySpr: 'v011_' + id + 'Vuelo',
        poses: { hold: 'carga_' + id, swing: 'cargaTiro_' + id },   // sin pose en sprites.js: Alexander normal y el cargable encima (no la tele)
        fly: { sp: 0, fric: K.rollFric, dmg: c.zdmg, knock: c.push, slow: 1, pierce: 99, lob: K.lob, splash: K.landR, high: K.high },
        onLand: function (G, L) { land(G, L, false); }
      });
    });
    // E directo: basureros (y maceteros) del parque se arrancan enteros (armas.reset los devuelve a su sitio)
    if (AR.grabProps) { AR.grabProps.basureroMira = 'basurero'; AR.grabProps.maceteroMira = 'macetero'; }
    defined = true;
    return true;
  }

  /* ---------------- Partículas propias ---------------- */
  var parts = [], texts = [];
  var COLS = { rubber: ['#131015', '#2a2a2e', '#8a8f98'], wood: ['#8a4b1d', '#b9783a', '#d8402c', '#e0a050'], trash: ['#4a4f3e', '#6a5b45', '#3a6a3a', '#e8e0cf'],
    dirt: ['#6a4a2a', '#8a5a32', '#b8744a', '#4f9a3a'], metal: ['#b8bcc4', '#8a8f98'] };
  function burst(x, y, z, n, kind, spd, up) {
    var cols = COLS[kind] || COLS.wood;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = rand(spd * 0.35, spd);
      parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(up * 0.4, up), t: 0, life: rand(0.35, 0.8), c: cols[i % cols.length], sz: i % 3 ? 1 : 2 });
    }
    if (parts.length > 120) parts.splice(0, parts.length - 120);
  }
  function text(x, y, s, col) { texts.push({ x: x, y: y, s: s, t: 0, c: col || '#ffe500' }); if (texts.length > 5) texts.shift(); }

  /* ---------------- Fuentes: golpes a props ---------------- */
  function catOf(pr) {
    if (pr._v011c !== undefined) return pr._v011c;
    var c = CAT[pr.k] || (CAR_RE.test(pr.k) ? 'car' : null);
    pr._v011c = c; return c;
  }
  function stOf(pr) { if (!pr._v011) pr._v011 = { hits: 0, lastT: -1e9, ihp: null, done: false }; return pr._v011; }
  // Un golpe a un prop fuente (sale de onSwing, propHooks, la caída de un cargable o la vida del auto). fromX/fromY: de dónde vino.
  function hitSource(G, pr, fromX, fromY, broke) {
    var c = catOf(pr); if (!c || c === 'basurero') return false;
    var st = stOf(pr), t = now(G);
    if (st.done) return false;
    if (t - st.lastT < K.dedupe && !broke) return false;
    st.lastT = t; st.hits++;
    if (c === 'car') { if (st.hits >= 2 || broke || pr.dstate >= 3) { st.done = true; popTire(G, pr, fromX, fromY); } return true; }
    if (c === 'tablon') { st.done = true; popBoard(G, pr, fromX, fromY); return true; }
    if (c === 'macetero') { st.done = true; knockPot(G, pr, fromX, fromY); return true; }
    return false;
  }
  function freeSpot(x, y) { var Wd = W(); return !(Wd && Wd.collideCircle && Wd.collideCircle(x, y, 4)); }
  function spawnNear(G, id, pr, fromX, fromY, sp) {
    var AR = A(); if (!AR || !defineAll()) return null;
    var side = fromX === undefined ? (Math.random() < 0.5 ? -1 : 1) : (fromX < pr.x ? -1 : 1);
    var half = (pr.fw || 16) / 2, cands = [[pr.x + side * (half * 0.6), pr.y + 7], [pr.x, pr.y + 8], [pr.x + side * (half + 7), pr.y], [pr.x - side * (half * 0.6), pr.y + 7], [pr.x, pr.y + 14]];
    var x = cands[0][0], y = cands[0][1];
    for (var i = 0; i < cands.length; i++) if (freeSpot(cands[i][0], cands[i][1])) { x = cands[i][0]; y = cands[i][1]; break; }
    var vx = side * (sp || 0), vy = (sp || 0) * 0.3;
    var L = AR.spawnLoose(id, x, y, vx, vy);
    if (L) { L.v011 = { uses: 0 }; hintSoon(); }
    return L;
  }
  function popTire(G, pr, fx, fy) {
    var L = spawnNear(G, 'llanta', pr, fx, fy, K.rollPx * K.rollFric);
    if (!L) return;
    sfx('tire.pop', { x: L.x, y: L.y }); sfx('prop.hit.rubber', { x: L.x, y: L.y });
    burst(L.x, L.y, 6, 6, 'rubber', 60, 40); text(pr.x, pr.y - 30, '¡PLONK!');
    if (!flags.tire) { flags.tire = true; toast(TXT.tire); }
  }
  function popBoard(G, pr, fx, fy) {
    var L = spawnNear(G, 'tablon', pr, fx, fy, 30);
    if (!L) return;
    sfx('prop.hit.wood', { x: L.x, y: L.y }); burst(pr.x, pr.y, 14, 8, 'wood', 60, 50); text(pr.x, pr.y - 30, '¡CRAC!');
    if (!flags.board) { flags.board = true; toast(TXT.board); }
  }
  var removed = [];   // maceteros arrancados del mundo (vuelven en reset)
  function knockPot(G, pr, fx, fy) {
    var Wd = W(), P = Wd && Wd.props, i = P ? P.indexOf(pr) : -1;
    if (i < 0) return;
    P.splice(i, 1); removed.push({ W: Wd, pr: pr, i: i });
    var L = spawnNear(G, 'macetero', pr, fx, fy, 20);
    if (L) { L.x = pr.x + (fx < pr.x ? 4 : -4); L.y = pr.y + 2; }
    sfx('prop.hit.wood', { x: pr.x, y: pr.y }); burst(pr.x, pr.y, 6, 5, 'dirt', 50, 40);
  }
  // Golpe cuerpo a cuerpo: ¿tocó un toldo, kiosko, mesa o macetero? (interaccion.js no los conoce como props rompibles)
  function onSwing(G, sw) {
    var Wd = W(); if (!sw || !Wd || !Wd.props) return 0;
    var P = Wd.props, n = 0, rng = (sw.range || 20) + K.swingPad, arc = sw.arc || Math.PI / 2;
    for (var i = P.length - 1; i >= 0; i--) {
      var pr = P[i], c = catOf(pr); if (c !== 'tablon' && c !== 'macetero') continue;
      if (pr._v011 && pr._v011.done) continue;
      var x0 = pr.x0 !== undefined ? pr.x0 : pr.x - 8, x1 = pr.x1 !== undefined ? pr.x1 : pr.x + 8, y0 = (pr.y0 !== undefined ? pr.y0 : pr.y - 6) - 6, y1 = pr.y1 !== undefined ? pr.y1 : pr.y;
      var qx = Math.max(x0, Math.min(sw.x, x1)), qy = Math.max(y0, Math.min(sw.y, y1)), d = dist(sw.x, sw.y, qx, qy);
      if (d > rng) continue;
      if (d > 6 && arc < 6 && Math.abs(wrap(Math.atan2(qy - sw.y, qx - sw.x) - (sw.ang || 0))) > arc / 2 + 0.35) continue;
      if (hitSource(G, pr, sw.x, sw.y, false)) n++;
    }
    return n;
  }
  // Autos: lee la vida del prop (interaccion.js: pr.ihp, pr.dstate) para contar golpes de cualquier origen
  function pollCars(G) {
    var Wd = W(), P = Wd && Wd.props; if (!P) return;
    var p = G.player;
    for (var i = 0; i < P.length; i++) {
      var pr = P[i]; if (catOf(pr) !== 'car') continue;
      var st = stOf(pr); if (st.done) continue;
      if (typeof pr.ihp !== 'number') continue;
      if (st.ihp === null) { st.ihp = pr.ihp; if (pr._ik && pr._ik.hp && pr.ihp < pr._ik.hp - 1e-6) hitSource(G, pr, p.x, p.y, false); }
      else if (pr.ihp < st.ihp - 1e-6) { st.ihp = pr.ihp; hitSource(G, pr, p.x, p.y, pr.dstate >= 3); }
      if (!st.done && pr.dstate >= 3) hitSource(G, pr, p.x, p.y, true);
    }
  }
  var hookFn = function (G, pr, info) {
    try { if (pr && catOf(pr)) hitSource(G || ACH.G, pr, ACH.G && ACH.G.player ? ACH.G.player.x : undefined, ACH.G && ACH.G.player ? ACH.G.player.y : undefined, !!(info && info.broke)); } catch (e) { /* nada */ }
  };
  function wireHooks() { var H = ACH.propHooks; if (Array.isArray(H) && H.indexOf(hookFn) < 0) H.push(hookFn); }

  /* ---------------- Vuelo y caída ---------------- */
  function cargable(L) { return L && L.def && L.def.cargable && DEFS[L.id]; }
  function airborneHits(G) {
    var AR = A(); if (!AR || !AR.loose) return;
    var LL = AR.loose, N = ACH.nivel;
    for (var i = LL.length - 1; i >= 0; i--) {
      var L = LL[i]; if (!L.thrown || !cargable(L) || !(L.z > 0) || !(L.vz < 0)) continue;
      var c = DEFS[L.id], hit = false;
      if (L.z < K.jefaZ && N && typeof N.onProjectile === 'function') {
        try { hit = N.onProjectile(G, { x: L.x, y: L.y, r: 8, kind: 'heavy:' + L.id, dmg: c.jefa, bees: K.beesDmg, vx: L.vx, vy: L.vy }) === true; } catch (e) { hit = false; }
        if (hit) { landNow(G, L, true); continue; }
      }
      if (L.z < K.zombieZ) {
        var zs = G.zombies || [];
        for (var k = 0; k < zs.length; k++) { var z = zs[k]; if (z.state === 'muerto') continue; if (Math.abs(z.x - L.x) < K.zombieR && Math.abs(z.y - L.y) < K.zombieR) { landNow(G, L, false); break; } }
      }
    }
  }
  function landNow(G, L, preHit) { L.z = 0; L.vz = 0; land(G, L, preHit); }
  function land(G, L, preHit) {
    var c = DEFS[L.id], x = L.x, y = L.y, AR = A(), N = ACH.nivel, i, nz = 0;
    if (!c || !AR) return;
    var sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy) || 1, ux = L.vx / sp, uy = L.vy / sp;
    L.thrown = false; L.z = 0; L.vz = 0;
    // 1) jefa y abejas (si no las tocó ya bajando)
    if (!preHit && N && typeof N.onProjectile === 'function') {
      try { N.onProjectile(G, { x: x, y: y, r: 10, kind: 'heavy:' + L.id, dmg: c.jefa, bees: K.beesDmg, vx: L.vx, vy: L.vy }); } catch (e) { /* nada */ }
    }
    // 2) zombies en el radio de caída
    var zs = G.zombies || [], E = ACH.ent;
    for (i = 0; i < zs.length; i++) {
      var z = zs[i]; if (z.state === 'muerto') continue;
      var dd = dist(x, y, z.x, z.y); if (dd > K.landR) continue;
      var nx = dd > 0.5 ? (z.x - x) / dd : ux, ny = dd > 0.5 ? (z.y - y) / dd : uy, killed;
      if (!E || typeof E.hitZombie !== 'function') continue;
      try { killed = E.hitZombie(G, z, nx, ny, { from: { x: x, y: y }, dmg: c.zdmg, knock: c.push, src: L.id }); } catch (e2) { killed = undefined; }
      if (killed === undefined) continue;
      if (!killed) z.stunT = Math.max(z.stunT || 0, 0.5);
      if (ACH.fx && typeof ACH.fx.hit === 'function') { try { ACH.fx.hit(G, z, nx, ny, killed, nz === 0); } catch (e3) { /* nada */ } }
      sfx('hit.' + L.id, { x: z.x, y: z.y, type: z.type, killed: killed });
      if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type });
      nz++;
    }
    // 3) props: autos (interaccion.js) y las fuentes de este archivo
    if (ACH.inter && typeof ACH.inter.hitProps === 'function') { try { ACH.inter.hitProps(G, x, y, 10, 2, 'swing'); } catch (e4) { /* nada */ } }
    var Wd = W(), P = Wd && Wd.props;
    if (P) for (i = P.length - 1; i >= 0; i--) { var pr = P[i], ct = catOf(pr); if ((ct === 'tablon' || ct === 'macetero') && dist(x, y, pr.x, pr.y) < (pr.fw || 16) / 2 + 8) hitSource(G, pr, x - ux * 10, y - uy * 10, false); }
    if (E && typeof E.emitNoise === 'function') { try { E.emitNoise(G, x, y, 130); } catch (e5) { /* nada */ } }
    if (AR.breakInvis) AR.breakInvis(G, L.id);
    sfx('heavy.land', { x: x, y: y, id: L.id }); sfx(L.id + '.crash', { x: x, y: y });
    if (ACH.fx && typeof ACH.fx.shake === 'function') { try { ACH.fx.shake(2, 0.15); } catch (e6) { /* nada */ } }
    // 4) qué queda en el piso
    var st = L.v011 = L.v011 || { uses: 0 };
    st.uses++;
    if (L.id === 'llanta' && st.uses < 2) {   // rueda 40 px más y se puede volver a agarrar una vez
      L.vx = ux * K.rollPx * K.rollFric; L.vy = uy * K.rollPx * K.rollFric;
      burst(x, y, 2, 4, 'rubber', 40, 30); text(x, y - 18, '¡BOING!');
      return;
    }
    L.vx = L.vy = 0;
    if (L.id === 'llanta') { burst(x, y, 4, 12, 'rubber', 90, 60); text(x, y - 18, '¡PAM! se reventó'); sfx('tire.burst', { x: x, y: y }); drop(x, y + 3, [{ id: 'jebe', n: 1 }]); }
    else if (L.id === 'tablon') { burst(x, y, 6, 12, 'wood', 90, 60); text(x, y - 18, '¡CRAC!'); drop(x, y + 3, [{ id: 'tablas', n: 1 + (Math.random() < 0.5 ? 1 : 0) }]); }
    else if (L.id === 'basurero') {
      burst(x, y, 6, 14, 'trash', 90, 60); burst(x, y, 6, 4, 'metal', 60, 40); text(x, y - 18, '¡CLONC!');
      if (Math.random() < 0.3) drop(x, y + 3, [{ id: 'chatarra', n: 1 }]);
    } else { burst(x, y, 4, 14, 'dirt', 80, 50); text(x, y - 18, '¡CRASH!'); }
    AR.removeLoose(L);
  }

  /* ---------------- Aviso la primera vez ---------------- */
  var flags = { grab: false, tire: false, board: false }, hintT = -1;
  function hintSoon() { if (!flags.grab && hintT < 0) hintT = 0.4; }
  function checkHint(G, dt) {
    if (flags.grab) return;
    if (hintT >= 0) { hintT -= dt; if (hintT < 0) { flags.grab = true; toast(TXT.grab); } return; }
    var p = G.player, AR = A(); if (!p || !AR || p.held) return;
    var LL = AR.loose || [];
    for (var i = 0; i < LL.length; i++) if (cargable(LL[i]) && LL[i].state === 'idle' && !LL[i].thrown && dist(p.x, p.y, LL[i].x, LL[i].y) < K.grabToastR) { flags.grab = true; toast(TXT.grab); return; }
    var P = W() && W().props; if (!P) return;
    for (i = 0; i < P.length; i++) { var c = catOf(P[i]); if ((c === 'basurero' || c === 'macetero') && dist(p.x, p.y, P[i].x, P[i].y) < K.grabToastR) { flags.grab = true; toast(TXT.grab); return; } }
  }

  /* ---------------- Dibujo: arco punteado de puntería, partículas y textos ---------------- */
  var mark = null;
  function markSpr() {
    if (mark) return mark;
    mark = mk(13, 7, 6, 3, function (g) {
      g.fillStyle = '#131015'; g.fillRect(1, 2, 11, 3); g.fillRect(3, 1, 7, 5);
      g.fillStyle = '#ff2e88'; g.fillRect(2, 3, 9, 1); g.fillRect(4, 2, 5, 3);
      g.fillStyle = '#ffe500'; g.fillRect(6, 3, 1, 1);
    });
    return mark;
  }
  function drawAim(g, G, cx, cy) {
    var p = G.player, h = p && p.held, AR = A();
    if (!h || !p.carryCharging || !DEFS[h.id] || !AR || typeof AR.aimHeavy !== 'function') return;
    var a = AR.aimHeavy(); if (!a) return;
    var z0 = a.z0, vz = a.vz, grav = (AR.K && AR.K.grav) || 420, T = (vz + Math.sqrt(vz * vz + 2 * grav * z0)) / grav, sp = a.R / T;
    var sx = p.x + a.ux * 3, sy = p.y + a.uy * 2, n = 14, i;
    for (i = 1; i < n; i++) {
      var t = T * i / n, x = sx + a.ux * sp * t, y = sy + a.uy * sp * t, z = z0 + vz * t - 0.5 * grav * t * t;
      var X = Math.round(x) - cx, Y = Math.round(y - z) - cy;
      g.fillStyle = '#131015'; g.fillRect(X - 1, Y - 1, 3, 3);
      g.fillStyle = i % 2 ? '#ffe500' : '#f2f2f2'; g.fillRect(X, Y, 1 + (i % 2), 1 + (i % 2));
    }
    var m = markSpr(), lx = Math.round(sx + a.ux * a.R) - cx, ly = Math.round(sy + a.uy * a.R) - cy;
    g.drawImage(m, lx - m.ax, ly - m.ay);
    // barra de carga (sobre la cabeza)
    var bx = Math.round(p.x) - cx - 10, by = Math.round(p.y) - cy - 44;
    g.fillStyle = '#131015'; g.fillRect(bx, by, 20, 4);
    g.fillStyle = '#1fe07a'; g.fillRect(bx + 1, by + 1, Math.max(1, Math.round(18 * a.c)), 2);
  }
  function drawTop(g, G, cx, cy) {
    if (!G || !G.player) return;
    for (var i = 0; i < parts.length; i++) {
      var q = parts[i], life = q.t / q.life;
      g.globalAlpha = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      g.fillStyle = q.c; g.fillRect(Math.round(q.x) - cx, Math.round(q.y - q.z) - cy, q.sz, q.sz);
    }
    g.globalAlpha = 1;
    if (texts.length) {
      g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (i = 0; i < texts.length; i++) {
        var t = texts[i], tx = Math.round(t.x) - cx, ty = Math.round(t.y - t.t * 16) - cy;
        g.globalAlpha = t.t > 0.5 ? Math.max(0, 1 - (t.t - 0.5) / 0.2) : 1;
        g.fillStyle = '#131015'; g.fillText(t.s, tx + 1, ty + 1); g.fillStyle = t.c; g.fillText(t.s, tx, ty);
      }
      g.globalAlpha = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }
    drawAim(g, G, cx, cy);
  }

  /* ---------------- Sistema ---------------- */
  function update(G, dt) {
    if (!G || !G.player) return;
    if (!defined) { ensureSprites(); defineAll(); }
    wireHooks();
    pollCars(G);
    airborneHits(G);
    checkHint(G, dt);
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      var k = Math.exp(-3 * dt); q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt; q.vz -= 260 * dt; q.z += q.vz * dt;
      if (q.z < 0) { q.z = 0; q.vz *= -0.3; }
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.7) texts.splice(i, 1); }
  }
  function reset(G) {
    ensureSprites(); defineAll(); wireHooks();
    for (var i = 0; i < removed.length; i++) { var r = removed[i], P = r.W && r.W.props; if (P && r.W === W() && P.indexOf(r.pr) < 0) P.splice(Math.min(r.i, P.length), 0, r.pr); }
    removed.length = 0;
    var PP = W() && W().props; if (PP) for (i = 0; i < PP.length; i++) { if (PP[i]._v011) PP[i]._v011 = null; }
    parts.length = 0; texts.length = 0; hintT = -1;
    installDebug();
  }

  /* ---------------- Debug (V011.md §2.5) ---------------- */
  function installDebug() {
    var D = ACH.debug = ACH.debug || {}, DV = D.v011 = D.v011 || {};
    DV.spawn = function (id) {
      var G = ACH.G, p = G && G.player, AR = A(); if (!p || !AR) return null;
      ensureSprites(); defineAll();
      id = id || 'llanta'; if (!DEFS[id]) return { error: 'ids: ' + Object.keys(DEFS).join(', ') };
      var v = (ACH.ent && ACH.ent.DIRV && ACH.ent.DIRV[p.dir]) || [1, 0];
      var L = AR.spawnLoose(id, p.x + v[0] * 12, p.y + v[1] * 8 + 2, 0, 0); if (!L) return null;
      L.v011 = { uses: 0 };
      return { id: L.id, x: Math.round(L.x), y: Math.round(L.y) };
    };
    DV.cargables = function () {
      var P = (W() && W().props) || [], out = { sources: [], loose: [] }, AR = A();
      P.forEach(function (pr) { var c = catOf(pr); if (c) out.sources.push({ k: pr.k, cat: c, c: +(pr.x / 16).toFixed(1), r: +(pr.y / 16).toFixed(1), hits: pr._v011 ? pr._v011.hits : 0, done: !!(pr._v011 && pr._v011.done) }); });
      if (AR && AR.loose) AR.loose.forEach(function (L) { if (cargable(L)) out.loose.push({ id: L.id, x: Math.round(L.x), y: Math.round(L.y), z: Math.round(L.z || 0), state: L.state, thrown: L.thrown, uses: L.v011 ? L.v011.uses : 0 }); });
      out.sprites = sprOK; out.propHooks = Array.isArray(ACH.propHooks) && ACH.propHooks.indexOf(hookFn) >= 0;
      return out;
    };
  }
  installDebug();

  var SYS = { id: 'cargables', name: 'cargables', update: update, reset: reset, drawTop: drawTop, onSwing: onSwing };
  if (typeof MIRA.register === 'function') MIRA.register(SYS); else if (MIRA.systems.indexOf(SYS) < 0) MIRA.systems.push(SYS);
  MIRA.cargables = { K: K, DEFS: DEFS, land: function (L) { if (ACH.G && L) land(ACH.G, L, false); } };
})();
