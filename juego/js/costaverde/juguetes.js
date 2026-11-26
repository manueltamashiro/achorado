/* ACHORADO — js/costaverde/juguetes.js (C1c): pelota de fútbol, barra fosforescente, helados y heladeros, perritos,
   vendedores de la Costa Verde y comidas nuevas (COSTAVERDE.md §4).
   - Sistema de ACH.cv (register): update / reset / onRespawn / drawables / drawTop / onSwing / speedMul.
   - E y F se atrapan envolviendo ACH.armas.update (como inflables.js): E = heladero > perro > pelota; F = pelota delante (prioridad)
     > barra o helado en la mano (tiro propio con carga, mantener F). Lo demás pasa a armas.js tal cual.
   - Pelota: entidad propia (no es un suelto de armas.js). Proyectil `kind: 'ball'` a ACH.nivel.onProjectile en cada subpaso peligroso.
   - Barra: ACH.armas.define('barraFosfo_<color>') en la mano (golpe 'held:barraFosfo'); F la tira (`throw:barraFosfo`) y queda de señuelo 20 s.
   - Helado: en la mano (ACH.armas.define('helado')); F mantener/soltar = tiro en arco (`throw:helado`); ESPACIO = comérselo (vía onSwing).
   - Heladero: NPC vivo en triciclo por ACH.world.heladeroPath; E → ACH.tienda.open('heladero'); sin tienda, compra directa.
   - Perritos: 6 por ACH.world.dogZones; E = patadita → compañero 20 s (v0.13): sigue a Alexander, ataca al zombi más cercano a ≤140 px y muerde 1 de daño por segundo; después huye y vuelve a los 30 s.
     Contra el chef: ACH.cv.chef.targets()/hitBy() si existen; si no, ACH.nivel.onProjectile({kind:'dog'}).
   - Vendedores fijos: entradas nuevas en ACH.vendedores.SPOTS + ACH.VENDEDORES_DATA (nivel 'costaverde'); el heladero solo en DATA.
   API: ACH.cv.stats = {perros, helados} · ACH.cv.juguetes = {fosfoCount(), balls(), dogs(), heladero()} · ACH.debug.cv.juguetes. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || {}; CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { if (CV.systems.indexOf(s) < 0) CV.systems.push(s); return s; };
  var D2R = Math.PI / 180, T = 16;
  var COLORS = ['verde', 'rosado', 'amarillo', 'celeste'];
  var COL = { verde: '#3dff6a', rosado: '#ff3fb4', amarillo: '#fff23a', celeste: '#4fe3ff' };

  /* ---------------- utilidades ---------------- */
  function sfx(n, d) {
    if (typeof CV.sfx === 'function') { try { CV.sfx(n, d); return; } catch (e) { /* nada */ } }
    var a = ACH.audio; if (a && typeof a.emit === 'function') { try { a.emit(n, d); } catch (e2) { /* el sonido nunca rompe el juego */ } }
  }
  function toast(t) {
    if (typeof CV.toast === 'function') { try { CV.toast(t); return; } catch (e) { /* nada */ } }
    if (ACH.hud && typeof ACH.hud.toast === 'function') { try { ACH.hud.toast(t); } catch (e2) { /* nada */ } }
  }
  function say(line, x, y, who) { var a = ACH.audio; if (a && typeof a.say === 'function') { try { a.say(line, { who: who || 'alex', x: x, y: y }); } catch (e) { /* nada */ } } }
  function ftext(x, y, s, c) { if (ACH.fx && typeof ACH.fx.text === 'function') { try { ACH.fx.text(x, y, s, c); } catch (e) { /* nada */ } } }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mk(w, h) { var c = ACH.px && typeof ACH.px.canvas === 'function' ? ACH.px.canvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function W() { return ACH.world || {}; }
  function solidAt(x, y, r) { var w = W(); if (typeof w.collideCircle === 'function') { try { return w.collideCircle(x, y, r || 3); } catch (e) { return false; } } return false; }
  function inv() { return ACH.inv || null; }
  function count(id) { var I = inv(); return I && I.count ? I.count(id) : 0; }
  function take(id, n) { var I = inv(); return I && I.take ? I.take(id, n || 1) : false; }
  function addItem(id, n) { var I = inv(); return I && I.add ? I.add(id, n || 1) : n || 1; }
  function alive(z) { return z && z.state !== 'muerto' && !z.social; }
  function hitZ(G, z, ux, uy, o) {
    var E = ACH.ent; if (!E || typeof E.hitZombie !== 'function') return undefined;
    try { return E.hitZombie(G, z, ux, uy, o); } catch (e) { return undefined; }
  }
  function fxHit(G, z, ux, uy, killed, first) { if (ACH.fx && typeof ACH.fx.hit === 'function') { try { ACH.fx.hit(G, z, ux, uy, killed, first); } catch (e) { /* nada */ } } }
  function noise(G, x, y, r) { var E = ACH.ent; if (E && typeof E.emitNoise === 'function') { try { E.emitNoise(G, x, y, r); } catch (e) { /* nada */ } } }
  function onProj(G, pr) { var N = ACH.nivel; if (N && typeof N.onProjectile === 'function') { try { return N.onProjectile(G, pr) === true; } catch (e) { return false; } } return false; }
  function night() { var N = ACH.noche; return N && N.t > 0 ? N.t : 0; }
  function view() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }
  function inView(G, x, y, pad) { var V = view(), c = G.cam || { x: 0, y: 0 }; return x > c.x - pad && x < c.x + V.w + pad && y > c.y - pad && y < c.y + V.h + pad; }
  function cvS() { var S = ACH.sprites; return S && S.cv && S.cv.pj ? S.cv.pj : null; }
  function canv(s) { return s && s.width ? s : null; }
  function blit(g, s, x, y, flip) {
    var ax = s.ax !== undefined ? s.ax : s.width >> 1, ay = s.ay !== undefined ? s.ay : s.height - 1;
    if (!flip) { g.drawImage(s, Math.round(x - ax), Math.round(y - ay)); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.drawImage(s, -ax, -ay); g.restore();
  }
  function dirOf(vx, vy) { return Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down'); }
  function facing(p) { var v = (ACH.ent && ACH.ent.DIRV && ACH.ent.DIRV[p.dir]) || [1, 0]; return { x: v[0], y: v[1] }; }
  function aimOf(p) { if (p.moving && (p.mx || p.my)) { var l = Math.sqrt(p.mx * p.mx + p.my * p.my) || 1; return { x: p.mx / l, y: p.my / l }; } return facing(p); }
  // ACH.world.places[n] en px ({x,y}) o en tiles ({c,r})
  function pt(q) {
    if (!q) return null;
    if (Array.isArray(q)) return { x: +q[0], y: +q[1] };
    if (q.x !== undefined) return { x: +q.x, y: +q.y };
    if (q.c !== undefined) return { x: (+q.c + 0.5) * T, y: (+q.r + 0.5) * T };
    return null;
  }
  function place(n) { var P = W().places; return P ? pt(P[n]) : null; }
  function startXY() { var G = ACH.G, p = G && G.player; return p ? { x: p.x, y: p.y } : { x: 20 * T, y: 25 * T }; }
  function freeNear(x, y, r) {
    if (!solidAt(x, y, r || 4)) return { x: x, y: y };
    for (var d = 4; d <= 80; d += 4) for (var a = 0; a < 12; a++) {
      var nx = x + Math.cos(a / 12 * 6.283) * d, ny = y + Math.sin(a / 12 * 6.283) * d;
      if (!solidAt(nx, ny, r || 4)) return { x: nx, y: ny };
    }
    return { x: x, y: y };
  }

  /* ---------------- estado ---------------- */
  var balls = [], shots = [], ground = [], dogs = [], puddles = [], banners = [], sparks = [];
  var helad = { on: null, waitT: 0, path: null };
  var stats = CV.stats = CV.stats || { perros: 0, helados: 0 };
  if (stats.perros === undefined) stats.perros = 0; if (stats.helados === undefined) stats.helados = 0;
  var pets = 0, goalsDone = {}, near = { kind: null, o: null }, chargeF = null, eff = { wantanT: 0, canillT: 0, lastHp: null };
  var zPrev = typeof WeakMap === 'function' ? new WeakMap() : null;

  /* =====================================================================================
     ÍCONOS Y SPRITES PROVISORIOS (el arte de C2c en ACH.sprites.cv.pj manda)
     ===================================================================================== */
  var PH = {};
  function phBall(leather, f) {
    var k = 'ball' + (leather ? 'L' : '') + f; if (PH[k]) return PH[k];
    var c = mk(7, 7), g = c.getContext('2d');
    g.fillStyle = '#131015'; g.fillRect(1, 0, 5, 7); g.fillRect(0, 1, 7, 5);
    g.fillStyle = leather ? '#b8763a' : '#f3efe2'; g.fillRect(1, 1, 5, 5);
    g.fillStyle = leather ? '#6a3a1a' : '#131015';
    var spots = [[2, 2], [4, 4], [4, 2], [2, 4]]; g.fillRect(spots[f % 4][0], spots[f % 4][1], 2, 1); g.fillRect(3, 3, 1, 1);
    c.ax = 3; c.ay = 6; PH[k] = c; return c;
  }
  function ballSpr(b) {
    var S = cvS(), f = Math.floor(b.roll) & 3;
    if (!b.leather && S && Array.isArray(S.pelotaSuelta) && canv(S.pelotaSuelta[f % S.pelotaSuelta.length])) return S.pelotaSuelta[f % S.pelotaSuelta.length];
    return phBall(b.leather, f);
  }
  function phBarra(col, lit) {
    var k = 'barra' + col + (lit ? 'L' : ''); if (PH[k]) return PH[k];
    var c = mk(12, 4), g = c.getContext('2d');
    g.fillStyle = '#131015'; g.fillRect(0, 0, 12, 4);
    g.fillStyle = COL[col]; g.fillRect(1, 1, 10, 2);
    g.fillStyle = '#ffffff'; g.fillRect(2, 1, 6, 1);
    c.ax = 6; c.ay = 3; c._cvph = true; PH[k] = c; return c;
  }
  function barraSpr(col) { var S = cvS(), B = S && S.barraSuelta; var s = B && (B[col] || B['barraFosfo_' + col]); s = Array.isArray(s) ? s[0] : s; return canv(s) || phBarra(col); }
  function phHalo(col, r) {   // halo horneado una vez por color (anillos de alfa, sin degradados por cuadro)
    var k = 'halo' + col + r; if (PH[k]) return PH[k];
    var c = mk(r * 2, r * 2), g = c.getContext('2d');
    for (var i = r; i > 0; i -= 2) { g.globalAlpha = 0.05 + 0.10 * (1 - i / r); g.fillStyle = COL[col]; g.beginPath(); g.arc(r, r, i, 0, 6.283); g.fill(); }
    g.globalAlpha = 1; c.ax = r; c.ay = r; PH[k] = c; return c;
  }
  function phHelado() {
    if (PH.helado) return PH.helado;
    var c = mk(7, 11), g = c.getContext('2d');
    g.fillStyle = '#131015'; g.fillRect(0, 0, 7, 6); g.fillRect(1, 5, 5, 3); g.fillRect(2, 8, 3, 3);
    g.fillStyle = '#ffb6d8'; g.fillRect(1, 1, 5, 4); g.fillStyle = '#fff2f8'; g.fillRect(2, 1, 2, 1);
    g.fillStyle = '#d8a050'; g.fillRect(2, 6, 3, 2); g.fillRect(3, 8, 1, 2);
    c.ax = 3; c.ay = 10; c._cvph = true; PH.helado = c; return c;
  }
  function heladoSpr() { var S = cvS(), s = S && S.heladoVuelo; s = Array.isArray(s) ? s[0] : s; return canv(s) || phHelado(); }
  function phCharco(f) {
    var k = 'charco' + f; if (PH[k]) return PH[k];
    var c = mk(14, 6), g = c.getContext('2d');
    g.fillStyle = '#ffb6d8'; g.fillRect(2, 1, 10, 4); g.fillRect(0, 2, 14, 2); g.fillStyle = '#fff2f8'; g.fillRect(4, 2, 3, 1);
    if (f) { g.fillStyle = '#d8a050'; g.fillRect(8, 1, 3, 2); }
    c.ax = 7; c.ay = 3; PH[k] = c; return c;
  }
  function charcoSpr(f) { var S = cvS(), C = S && S.charcoHelado; return (Array.isArray(C) && canv(C[f % C.length])) || phCharco(f); }
  var BREEDS = {
    chusco: { body: '#8a5a32', ear: '#5a3a1a', w: 14, h: 8, size: 'medio', name: 'chusco' },
    salchicha: { body: '#7a3a1a', ear: '#4a2010', w: 16, h: 6, size: 'chico', name: 'salchicha' },
    golden: { body: '#e0a848', ear: '#b87a28', w: 16, h: 9, size: 'grande', name: 'golden' },
    pug: { body: '#d8c098', ear: '#2a2220', w: 11, h: 7, size: 'pug', name: 'pug' },
    singpelo: { body: '#3a3236', ear: '#2a2226', w: 13, h: 8, size: 'medio', name: 'peruano sin pelo' },
    husky: { body: '#c8ccd4', ear: '#3a3e48', w: 16, h: 9, size: 'grande', name: 'husky' }
  };
  var BREED_IDS = ['chusco', 'salchicha', 'golden', 'pug', 'singpelo', 'husky'];
  function phDog(br, f, mode) {
    var k = 'dog' + br + f + mode; if (PH[k]) return PH[k];
    var B = BREEDS[br], w = B.w + 6, h = B.h + 7, c = mk(w, h), g = c.getContext('2d'), K = '#131015', by = 3, bx = 1;
    var leg = mode === 'sit' ? 0 : (f % 2);
    function r(x, y, ww, hh, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1, ww + 2, hh + 2); g.fillStyle = col; g.fillRect(x, y, ww, hh); }
    // patas
    if (mode === 'sit') { r(bx + 2, by + B.h - 1, 3, 3, B.body); r(bx + B.w - 5, by + B.h, 3, 2, B.body); }
    else { r(bx + 2 + leg, by + B.h - 1, 2, 4, B.body); r(bx + 5 - leg, by + B.h - 1, 2, 4, B.body); r(bx + B.w - 6 + leg, by + B.h - 1, 2, 4, B.body); r(bx + B.w - 3 - leg, by + B.h - 1, 2, 4, B.body); }
    r(bx + 1, by + 2, B.w - 4, B.h - 3, B.body);                                   // cuerpo
    r(bx + B.w - 5, by - 1, 6, 6, B.body);                                         // cabeza
    g.fillStyle = B.ear; g.fillRect(bx + B.w - 4, by - 2, 2, 3);                    // oreja
    g.fillStyle = K; g.fillRect(bx + B.w - 1, by + 1, 1, 1); g.fillRect(bx + B.w + 1, by + 3, 1, 1);   // ojo y nariz
    if (mode === 'bite') { g.fillStyle = '#f3efe2'; g.fillRect(bx + B.w, by + 4, 2, 1); }
    if (br === 'husky') { g.fillStyle = '#f3efe2'; g.fillRect(bx + B.w - 3, by + 2, 3, 2); g.fillRect(bx + 3, by + B.h - 2, B.w - 8, 1); }
    if (br === 'golden' || br === 'chusco') { g.fillStyle = B.ear; g.fillRect(bx, by + 1 - (f % 2), 2, 3); }   // cola
    else { g.fillStyle = B.body; g.fillRect(bx, by + 1 - (f % 2), 2, 2); }
    if (br === 'husky' && mode !== 'bite') { g.fillStyle = '#ff6a8a'; g.fillRect(bx + B.w, by + 5, 1, 2); }   // jadea
    c.ax = Math.round(w / 2); c.ay = h - 1; PH[k] = c; return c;
  }
  function dogSpr(d) {
    var S = cvS(), P = S && S.perro && S.perro[d.breed], dir = dirOf(d.vx || (d.flip ? -1 : 1), d.vy || 0), f = Math.floor(d.anim * 8) & 3;
    var moving = Math.abs(d.vx) + Math.abs(d.vy) > 4;
    if (P) {
      var s = null;
      if (d.state === 'bite' && Array.isArray(P.bite)) s = P.bite[f % P.bite.length];
      else if (!moving && P.sit) s = Array.isArray(P.sit) ? P.sit[0] : P.sit;
      else { var A = (d.state === 'charge' || d.state === 'flee' || d.state === 'bark' || (d.state === 'comp' && Math.abs(d.vx) + Math.abs(d.vy) > 100)) && P.run ? P.run : P.walk; var dd = A && (A[dir] || A.down); if (Array.isArray(dd)) s = dd[f % dd.length]; }
      if (canv(s)) return { s: s, flip: false };
    }
    return { s: phDog(d.breed, f, d.state === 'bite' ? 'bite' : moving ? 'walk' : 'sit'), flip: d.flip };
  }
  function brandLabel() { return ACH.cfg && ACH.cfg.marcasReales === false ? "D'ONOFRÍO" : "D'ONOFRIO"; }
  function phHeladero(f, stop) {
    var k = 'hel' + f + (stop ? 's' : '') + brandLabel(); if (PH[k]) return PH[k];
    var c = mk(34, 40), g = c.getContext('2d'), K = '#131015';
    function r(x, y, w, h, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, w, h); }
    r(2, 2, 22, 3, '#ffe500'); r(12, 5, 1, 12, '#c8c8c8'); g.fillStyle = '#e8402c'; g.fillRect(4, 2, 4, 3); g.fillRect(16, 2, 4, 3);   // sombrilla
    r(2, 17, 20, 12, '#ffe500'); g.fillStyle = '#2a5ab8'; g.fillRect(3, 21, 18, 4);                                                // caja
    g.fillStyle = '#f3efe2'; g.font = '5px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(brandLabel().slice(0, 9), 12, 23);
    var a = stop ? 0 : f;
    g.fillStyle = K; g.fillRect(2, 30, 7, 7); g.fillRect(17, 30, 7, 7); g.fillRect(28, 32, 5, 5);
    g.fillStyle = '#8a8f98'; g.fillRect(3 + (a & 1), 31, 3, 3); g.fillRect(18 + (a & 1), 31, 3, 3); g.fillRect(29, 33, 2, 2);        // ruedas
    r(24, 18, 2, 12, '#8a8f98');                                                                                                     // barra
    r(25, 11, 6, 9, '#f3efe2'); r(26, 5, 5, 6, '#c98a6a'); r(25, 4, 7, 2, '#ffe500');                                               // heladero
    r(27 - (a % 2), 20, 2, 9, '#2a3a5a');
    c.ax = 16; c.ay = 38; PH[k] = c; return c;
  }
  function heladeroSpr(h) {
    var S = cvS(), H = S && S.heladero;
    if (H) { var s = h.stopT > 0 ? H.stop : (Array.isArray(H.ride) ? H.ride[Math.floor(h.anim * 6) % H.ride.length] : null); s = Array.isArray(s) ? s[0] : s; if (canv(s)) return s; }
    return phHeladero(Math.floor(h.anim * 6) & 3, h.stopT > 0);
  }
  // íconos de la mochila (12×12 + .big 24×24): arte de C2c (ACH.sprites.cv.pj[id] o .items[id]) o provisorio
  var ICON_COL = { pelota: '#f3efe2', pelotaCuero: '#b8763a', barraFosfo: '#3dff6a', packFosfo: '#ff3fb4', helado: '#ffb6d8', paleta: '#ff5a3a',
    chaufa: '#e8b830', wantan: '#e8c890', chicha: '#6a2a8a', canilleras: '#2a5ab8' };
  function ensureIcons() {
    var S = ACH.sprites = ACH.sprites || {}, IT = S.items = S.items || {}, P = cvS();
    Object.keys(ICON_COL).forEach(function (id) {
      var art = P && (P[id] || (P.items && P.items[id]) || (id === 'barraFosfo' && (P.barraFosfo_verde || (P.items && P.items.barraFosfo_verde))));
      if (Array.isArray(art)) art = art[0];
      if (canv(art)) { if (IT[id] !== art && (!IT[id] || IT[id].prov || IT[id]._cv)) { IT[id] = art; if (!art.big) art.big = art; } return; }
      if (IT[id] && IT[id].width) return;
      var c = mk(12, 12), g = c.getContext('2d'), col = ICON_COL[id];
      g.fillStyle = '#131015'; g.fillRect(1, 1, 10, 10); g.fillStyle = col; g.fillRect(2, 2, 8, 8);
      if (id === 'pelota') { g.fillStyle = '#131015'; g.fillRect(5, 5, 2, 2); g.fillRect(3, 3, 1, 1); g.fillRect(8, 8, 1, 1); }
      else if (id === 'barraFosfo' || id === 'packFosfo') { g.clearRect(1, 1, 10, 10); g.fillStyle = '#131015'; g.fillRect(4, 0, 4, 12); g.fillStyle = COL.verde; g.fillRect(5, 1, 2, 10); if (id === 'packFosfo') { g.fillStyle = '#131015'; g.fillRect(0, 2, 4, 9); g.fillRect(8, 2, 4, 9); g.fillStyle = COL.rosado; g.fillRect(1, 3, 2, 7); g.fillStyle = COL.celeste; g.fillRect(9, 3, 2, 7); } }
      else { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(2, 2, 8, 2); }
      var big = mk(24, 24), bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 24, 24);
      c.big = big; c.prov = true; c._cv = true; IT[id] = c;
    });
  }
  function looseProp(key, src) {   // sprite del suelto en la mano (armas.js lo busca en ACH.sprites.props)
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {};
    if (P[key] && P[key].width && !P[key]._cvph) return key;
    P[key] = src; if (src.ax === undefined) { src.ax = src.width >> 1; src.ay = src.height - 1; }
    return key;
  }

  /* =====================================================================================
     OBJETOS (ACH.inv.defs) Y ARMAS EN LA MANO (ACH.armas.define)
     ===================================================================================== */
  var BARRA_HOLD = { kind: 'barraFosfo', dmg: 0.8, range: 26, arc: 120 * D2R, knock: 40, cd: 0.18, cost: 3, noise: 35, dur: 0.16, frame: 0.05, hits: 30, bees: 0.8,
    swingSfx: 'cv.barra.swing', hitSfx: 'cv.barra.hit', hitText: [['¡ZING!'], ['¡ZING!', '¡FLASH!']] };
  // el helado: ESPACIO lo come (onSwing). El «golpe» no alcanza a nadie (como la pistola de burbujas).
  var HELADO_HOLD = { kind: 'helado', dmg: 0, range: 0.01, arc: 0.01, knock: 0, cd: 0.4, cost: 1, noise: 5, dur: 0.18, frame: 0.06, hits: 0, bees: 0,
    swingSfx: 'cv.helado.lamer', hitSfx: 'cv.helado.lamer' };
  function heldId(p) { return p && p.held ? p.held.id : null; }
  function heldBarra(p) { var h = heldId(p); return h && h.indexOf('barraFosfo_') === 0 ? h.slice(11) : null; }
  function defineHeld() {
    var A = ACH.armas; if (!A || typeof A.define !== 'function') return;
    COLORS.forEach(function (col) {
      var id = 'barraFosfo_' + col; if (A.defs[id] && A.defs[id]._cv) return;
      var h = {}; for (var k in BARRA_HOLD) h[k] = BARRA_HOLD[k];
      var d = A.define(id, { name: 'barra ' + col, spr: looseProp('cv_' + id, barraSpr(col)), mode: 'hand', lift: 6, hold: h,
        poses: { hold: 'cvh_' + id + '_walk', swing: 'cvh_' + id + '_swing' },
        fly: { sp: 160, fric: 2.4, dmg: 0, knock: 0, slow: 1, pierce: 0 },
        onBreak: function (G) { var p = G.player; sfx('cv.barra.off', { x: p.x, y: p.y }); toast('Se te apagó la barra, causa. ¡Fin de la fiesta!'); } });
      d._cv = true;
    });
    if (!(A.defs.helado && A.defs.helado._cv)) {
      var hh = {}; for (var k2 in HELADO_HOLD) hh[k2] = HELADO_HOLD[k2];
      var dh = A.define('helado', { name: 'helado', spr: looseProp('cv_helado', heladoSpr()), mode: 'hand', lift: 8, hold: hh,
        poses: { hold: 'cvh_helado_walk', swing: 'cvh_helado_swing' }, fly: { sp: 140, fric: 3, dmg: 0, knock: 0, slow: 1, pierce: 0 } });
      dh._cv = true;
    }
  }
  // Alexander con barra / helado (C2c): ACH.sprites.cv.pj.alexHeld[id][bird|nobird] = {walk:{dir:[4]}, swing:{dir:[3]}}
  function aliasPoses(id) {
    var S = ACH.sprites, P = cvS(), AH = P && P.alexHeld, AL = S && S.alex; if (!AH || !AL) return;
    ['bird', 'nobird'].forEach(function (v) {
      var src = AH[id] && AH[id][v]; if (!src || !AL[v]) return;
      if (src.walk) AL[v]['cvh_' + id + '_walk'] = src.walk;
      if (src.swing) AL[v]['cvh_' + id + '_swing'] = src.swing;
    });
  }
  function wrapPoseFrame() {
    var A = ACH.armas; if (!A || typeof A.poseFrame !== 'function' || A.poseFrame._cv) return;
    var orig = A.poseFrame;
    A.poseFrame = function (p) {
      p = p || (ACH.G && ACH.G.player);
      var ps = A.pose ? A.pose(p) : null;
      if (p && typeof ps === 'string' && /^cvh_.*_walk$/.test(ps)) return p.moving ? ((Math.floor(p.animT) % 4) + 4) % 4 : 0;
      return orig.apply(this, arguments);
    };
    A.poseFrame._cv = true;
  }
  function equipHeld(id) {
    var A = ACH.armas, G = ACH.G; if (!A || !G || !A.defs[id]) return false;
    try { aliasPoses(id); } catch (e) { /* sin pose: se ve el objeto suelto en la mano */ }
    if (typeof A.equip === 'function') { try { return A.equip(id) !== false; } catch (e2) { return false; } }
    var p = G.player; if (p.held) A.drop();
    var L = A.spawnLoose(id, p.x, p.y + 1, 0, 0); if (!L) return false; A.grab(L); return true;
  }
  function stowHeld() {
    var A = ACH.armas, G = ACH.G, p = G && G.player; if (!p || !p.held) return null;
    if (A && typeof A.stow === 'function') { try { return A.stow(); } catch (e) { /* nada */ } }
    var h = p.held; p.held = null; if (h.L && A && A.removeLoose) A.removeLoose(h.L); return { id: h.id, dur: h.dur };
  }

  function useBall(id, p) {
    if (!take(id)) return false;
    var f = facing(p), q = freeNear(p.x + f.x * 10, p.y + f.y * 6 + 2, 3);
    spawnBall(q.x, q.y, id === 'pelotaCuero');
    sfx('cv.pelota.rebote', { x: q.x, y: q.y, soft: true });
    toast(id === 'pelotaCuero' ? '¡Pelota de cuero al piso! F para patearla fuerte.' : '¡Pelota al piso! Camina para conducirla · F patear (mantén para cargar).');
    return true;
  }
  function useBarra(id, p) {
    if (heldBarra(p)) { toast('Ya tienes una barra prendida, causa.'); return false; }
    var col = COLORS[Math.floor(Math.random() * 4)];
    if (!take('barraFosfo')) return false;
    if (!equipHeld('barraFosfo_' + col)) { addItem('barraFosfo', 1); toast('No se pudo agarrar la barra, causa.'); return false; }
    sfx('cv.barra.crack', { x: p.x, y: p.y, color: col });
    toast('¡CRAC! Barra ' + col + ' prendida · ESPACIO pegar · F tirarla');
    return true;
  }
  function usePack(id, p) {
    var I = inv(); if (!I) return false;
    if (!take('packFosfo')) return false;
    var left = I.add('barraFosfo', 3);
    if (left > 0) { if (left < 3) I.take('barraFosfo', 3 - left); I.add('packFosfo', 1); toast('No te entran tres barras más en la mochila, causa.'); return false; }
    sfx('grab', { x: p.x, y: p.y }); toast('+3 barras fosforescentes (verde, rosado, amarillo o celeste: sale al azar)');
    return true;
  }
  function useHelado(id, p) {
    if (heldId(p) === 'helado') { toast('Ya tienes un helado en la mano · ESPACIO comer · F tirar'); return false; }
    if (!take('helado')) return false;
    if (!equipHeld('helado')) { addItem('helado', 1); return false; }
    sfx('grab', { x: p.x, y: p.y });
    toast('Helado en la mano · ESPACIO comértelo · mantén F y suelta para tirarlo');
    return true;
  }
  function hpUp(p, n) { var C = (ACH.ent && ACH.ent.CFG) || { hpMax: 100 }, b = p.hp; p.hp = Math.min(C.hpMax, p.hp + n); return Math.round(p.hp - b); }
  function useWantan(id, p) {
    if (!take(id)) return false;
    sfx('item.eat', { x: p.x, y: p.y });
    var n = hpUp(p, 15); eff.wantanT = 20;
    toast('+' + n + ' vida · ¡Wantán crocante! Corres más por 20 s');
    return true;
  }
  function useCanilleras(id, p) {
    if (!take(id)) return false;
    sfx('grab', { x: p.x, y: p.y }); eff.canillT = 90;
    toast('Canilleras puestas: −25 % de daño por 90 s. ¡Como Cueto, causa!');
    return true;
  }
  var ITEMS = {
    pelota: { name: 'PELOTA DE FÚTBOL', unit: 'pelota', plural: 'pelotas', stack: 3, fx: 'SE PATEA · USAR = AL PISO', tint: '#f3efe2',
      desc: 'De la losa del malecón. Camina contra ella para conducirla, F para patear (mantén para cargar). Rebota en los muertos.', use: { fn: useBall } },
    pelotaCuero: { name: 'PELOTA DE CUERO', unit: 'pelota de cuero', plural: 'pelotas de cuero', stack: 2, fx: 'DAÑO +50 % · USAR = AL PISO', tint: '#b8763a',
      desc: 'Cosida a mano, pesada como las de antes. Pega 50 % más fuerte.', use: { fn: useBall } },
    barraFosfo: { name: 'BARRA FOSFORESCENTE', unit: 'barra', plural: 'barras', stack: 12, fx: 'EN LA MANO · BRILLA DE NOCHE', tint: '#3dff6a',
      desc: 'De fiesta. Daño 0.8, rapidísima, alumbra de noche. F la tira: los muertos se quedan mirándola.', use: { fn: useBarra } },
    packFosfo: { name: 'PACK DE 3 BARRAS', unit: 'pack de barras', plural: 'packs de barras', stack: 3, fx: '+3 BARRAS', tint: '#ff3fb4',
      desc: 'Tres barras de colores en su bolsita. Para la fiesta o para el fin del mundo.', use: { fn: usePack } },
    helado: { name: 'HELADO EN BARQUILLO', unit: 'helado', plural: 'helados', stack: 6, fx: 'SE TIRA (F) · ESPACIO = +8 VIDA', tint: '#ffb6d8',
      desc: 'Fresa y vainilla. Tirado congela al muerto 4,5 s; en el piso se quedan lamiéndolo. O te lo comes.', use: { fn: useHelado } },
    paleta: { name: 'PALETA DE AGUA', unit: 'paleta', plural: 'paletas', stack: 5, fx: '+5 VIDA', tint: '#ff5a3a',
      desc: 'De fresa, más hielo que fruta. Algo es algo.', use: { hp: 5, st: 10 } },
    chaufa: { name: 'ARROZ CHAUFA', unit: 'chaufa', plural: 'chaufas', stack: 3, fx: '+40 VIDA', tint: '#e8b830',
      desc: 'Del Salazar, con su huevito y su cebollita china. Plato de campeón.', use: { hp: 40, sick: 0.05 } },
    wantan: { name: 'WANTÁN FRITO', unit: 'wantán', plural: 'wantanes', stack: 5, fx: '+15 VIDA · CORRES MÁS 20 s', tint: '#e8c890',
      desc: 'Crocante, con salsa tamarindo. Te da cuerda para correr.', use: { fn: useWantan } },
    chicha: { name: 'CHICHA MORADA', unit: 'chicha', plural: 'chichas', stack: 5, fx: '+20 ALIENTO', tint: '#6a2a8a',
      desc: 'Heladita, con su piña y su limón.', use: { st: 20, drink: true } },
    canilleras: { name: 'CANILLERAS', unit: 'canilleras', plural: 'canilleras', stack: 2, fx: '−25 % DAÑO · 90 s', tint: '#2a5ab8',
      desc: 'De Deportes Malecón. Los mordiscos duelen menos por 90 s.', use: { fn: useCanilleras } }
  };
  function registerItems() {
    var I = inv(), D = I && I.defs; if (!D) return;
    for (var id in ITEMS) {
      if (D[id] && !D[id]._cv && !D[id]._soft) continue;
      var d = {}; for (var k in ITEMS[id]) d[k] = ITEMS[id][k]; d._cv = true; D[id] = d;
    }
    ensureIcons();
  }

  /* =====================================================================================
     VENDEDORES (ACH.VENDEDORES_DATA + ACH.vendedores.SPOTS)
     ===================================================================================== */
  var NOPLATA = 'Aquí es precio Larcomar, joven.';
  var VDATA = {
    heladero: { name: 'EL HELADERO', titulo: "TRICICLO " + "D'ONOFRIO", nivel: 'costaverde', frase: '¡Heladooos! ¡Bien heladitos, joven!',
      stock: [{ id: 'helado', precio: 1, n: 1 }, { id: 'paleta', precio: 1 }] },
    fosfo: { name: 'DON FOSFO', titulo: 'LUCES DE FIESTA — DON FOSFO', nivel: 'costaverde', frase: 'Pa’l tono y pa’ los muertos, joven. Todo brilla.',
      stock: [{ id: 'barraFosfo', precio: 2 }, { id: 'packFosfo', precio: 5 }, { id: 'pelota', precio: 4 }, { id: 'cuerdas', precio: 2 }] },
    kioscoLarco: { name: 'KIOSCO LARCOMAR', titulo: 'KIOSCO LARCOMAR', nivel: 'costaverde', frase: NOPLATA,
      stock: [{ id: 'pelota', precio: 4 }, { id: 'barraFosfo', precio: 2 }, { id: 'uhu', precio: 6 }, { id: 'gaseosa', precio: 2 }, { id: 'cuerdas', precio: 2 }] },
    deportes: { name: 'DEPORTES MALECÓN', titulo: 'DEPORTES MALECÓN', nivel: 'costaverde', frase: 'Equípate como selección, joven.',
      stock: [{ id: 'pelota', precio: 3 }, { id: 'pelotaCuero', precio: 8 }, { id: 'canilleras', precio: 6 }] },
    fuente: { name: 'FUENTE DE SODA', titulo: 'FUENTE DE SODA DEL SALAZAR', nivel: 'costaverde', frase: 'Siéntese, joven. Bueno, pare nomás.',
      stock: [{ id: 'chaufa', precio: 5 }, { id: 'wantan', precio: 3 }, { id: 'chicha', precio: 2 }, { id: 'helado', precio: 1 }] }
  };
  var VINTRO = {
    heladero: '¡Heladooos! Pare, joven, que el triciclo no frena solo.',
    fosfo: 'Barritas, barritas de colores. ¡De noche los muertos se quedan bizcos!',
    kioscoLarco: 'Bienvenido a Larcomar, joven. Aquí es precio Larcomar, ya sabe.',
    deportes: 'Pelotas, canilleras, todo original. Bueno, casi original.',
    fuente: '¿Un chaufita, un wantán? Con esta vista todo sabe mejor.'
  };
  var VIDS = ['fosfo', 'kioscoLarco', 'deportes', 'fuente'];
  function terr(id) { var L = W().terr; if (!Array.isArray(L)) return null; for (var i = 0; i < L.length; i++) if (L[i] && String(L[i].id).toUpperCase() === id) return L[i]; return null; }
  function terrSpot(id, fx, fallback) {
    var t = terr(id);
    if (t && t.c0 !== undefined) return { x: (t.c0 + (t.c1 - t.c0) * fx) * T, y: (t.r0 + Math.min(3, (t.r1 - t.r0) * 0.35)) * T };
    return place(fallback);
  }
  // sin mapa de C1a (places/terr): en fila junto al inicio, para que se puedan probar
  function fbSpot(i) { var s = startXY(); return { x: s.x + (5 + i * 3) * T, y: s.y + T }; }
  var SPOTS = {
    fosfo: function () { var a = place('amor'); return a ? { x: a.x + 3 * T, y: a.y + 2 * T } : fbSpot(0); },
    kioscoLarco: function () { return terrSpot('A', 0.5, 'larcoA') || fbSpot(1); },
    deportes: function () { return terrSpot('B', 0.7, 'larcoB') || fbSpot(2); },
    fuente: function () { return terrSpot('C', 0.4, 'larcoC') || fbSpot(3); }
  };
  var LOOKV = { fosfo: { a: '#2a2a3a', b: '#3dff6a', hat: '#ff3fb4' }, kioscoLarco: { a: '#d8263a', b: '#f3efe2', hat: '#d8263a' },
    deportes: { a: '#1a8a4a', b: '#f3efe2', hat: '#131015' }, fuente: { a: '#f3efe2', b: '#e8402c', hat: '#f3efe2' } };
  function phVendor(id) {
    var L = LOOKV[id], fr = [];
    for (var f = 0; f < 3; f++) {
      var c = mk(22, 38), g = c.getContext('2d'), K = '#131015', bob = f === 1 ? 1 : 0;
      var r = function (x, y, w, h, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1 + bob, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y + bob, w, h); };
      r(6, 26, 4, 11, '#3a3a48'); r(12, 26, 4, 11, '#3a3a48'); r(4, 13, 14, 14, L.a); r(2, 15, 2, 9, L.a); r(18, 15, 2, 9, L.a);
      g.fillStyle = L.b; g.fillRect(6, 17 + bob, 10, 2);
      r(7, 4, 8, 9, '#c98a6a'); g.fillStyle = K; g.fillRect(9, 7 + bob, 1, 1); g.fillRect(12, 7 + bob, 1, 1); g.fillRect(10, 10 + bob, 2, f === 2 ? 2 : 1);
      r(6, 2, 10, 3, L.hat);
      if (id === 'fosfo') { ['verde', 'rosado', 'amarillo', 'celeste'].forEach(function (cc, i) { g.fillStyle = COL[cc]; g.fillRect(19, 2 + i * 6 + bob, 2, 5); }); }
      c.ax = 11; c.ay = 37; fr.push(c);
    }
    return { idle: [fr[0], fr[1]], talk: fr[2], ph: true };
  }
  function registerVendors() {
    var VD = ACH.VENDEDORES_DATA = ACH.VENDEDORES_DATA || {};
    for (var id in VDATA) if (!VD[id] || VD[id]._cv) { var d = JSON.parse(JSON.stringify(VDATA[id])); d._cv = true; VD[id] = d; }
    VD.heladero.titulo = 'TRICICLO ' + brandLabel();
    var V = ACH.vendedores, SP = V && V.SPOTS;
    if (SP) VIDS.forEach(function (vid) { if (!SP[vid] || SP[vid]._cv) SP[vid] = { nivel: 'costaverde', puesto: null, at: SPOTS[vid], _cv: true }; });
    // sprites de los vendedores fijos para vendedores.js: ACH.sprites.v011.npc[id] ← ACH.sprites.cv.pj.npc[id] o provisorio
    var S = ACH.sprites = ACH.sprites || {}, V11 = S.v011 = S.v011 || {}, N = V11.npc = V11.npc || {}, P = cvS();
    VIDS.forEach(function (vid) {
      var art = P && P.npc && P.npc[vid];
      if (art && Array.isArray(art.idle) && canv(art.idle[0])) { N[vid] = art; return; }
      if (!N[vid]) N[vid] = phVendor(vid);
    });
  }
  // línea de presentación la primera vez (envuelve ACH.tienda.open) y la frase de «no alcanza» de Larcomar
  var saidV = {};
  function wrapTienda() {
    var Ti = ACH.tienda; if (!Ti || typeof Ti.open !== 'function' || Ti.open._cv) return;
    var o = Ti.open;
    Ti.open = function (id) {
      var ok = o.apply(this, arguments);
      if (ok && VDATA[id]) watchNoMoney();
      if (ok && VDATA[id] && !saidV[id]) {
        saidV[id] = true; var d = ACH.VENDEDORES_DATA[id];
        watchNoMoney(); toast((d ? d.name : id) + ': «' + VINTRO[id] + '»');
        var at = arguments[1] || {}; say(VINTRO[id], at.x, at.y, 'vendedor');
      }
      return ok;
    };
    Ti.open._cv = true;
  }
  // v0.13 (E4): Don Fosfo avisa, al venderlas, que las barras rinden más en la caída libre. (tienda.js no avisa de las compras: se vigila la cuenta mientras su puesto está abierto)
  var FOSFO_AVISO = 'Llévate barras, causa: en el aire brillan y pegan más.', fosfoPrev = null;
  setInterval(function () {
    var Ti = ACH.tienda; if (!Ti || typeof Ti.isOpen !== 'function' || !Ti.isOpen() || Ti.vendor() !== 'fosfo') { fosfoPrev = null; return; }
    var n = count('barraFosfo') + 3 * count('packFosfo');
    if (fosfoPrev !== null && n > fosfoPrev && typeof Ti.line === 'function') { try { Ti.line(FOSFO_AVISO, 'DON FOSFO'); } catch (e) { /* nada */ } }
    fosfoPrev = n;
  }, 120);
  var msgObs = null;
  function watchNoMoney() {
    if (msgObs || typeof MutationObserver !== 'function') return;
    var el = document.querySelector('#tienda .tienda-msg'); if (!el) return;
    msgObs = new MutationObserver(function () {
      var Ti = ACH.tienda, v = Ti && Ti.vendor ? Ti.vendor() : null;
      if (v && VDATA[v] && el.textContent === 'No te alcanza, causa.') el.textContent = NOPLATA;
    });
    msgObs.observe(el, { childList: true, characterData: true, subtree: true });
  }

  /* =====================================================================================
     PELOTA
     ===================================================================================== */
  var BALL = { r: 3, kick0: 240, kick1: 380, dmg0: 1, dmg1: 2, chargeT: 0.6, fric: 1.3, stop: 8, push: 120, maxB: 3, dangerSp: 90, dribble: 1.25, kickR: 20 };
  function spawnBall(x, y, leather) {
    var b = { x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, leather: !!leather, roll: 0, bounces: 0, dmg: 0, hits: [], kicked: false, t: 0 };
    balls.push(b); if (balls.length > 10) balls.shift(); return b;
  }
  function goalBoxes() {
    var P = W().props || [], out = [];
    for (var i = 0; i < P.length; i++) { var q = P[i]; if (q && /arcoFulbito|arco_?fulbito|^arco$/i.test(q.k || '')) out.push({ id: 'g' + Math.round(q.x) + '_' + Math.round(q.y), x0: (q.x0 !== undefined ? q.x0 : q.x - 14) - 4, x1: (q.x1 !== undefined ? q.x1 : q.x + 14) + 4, y0: q.y - 10, y1: q.y + 6 }); }
    if (!out.length) { var L = place('losa'); if (L) { out.push({ id: 'gW', x0: L.x - 7 * T, x1: L.x - 5.5 * T, y0: L.y - 1.2 * T, y1: L.y + 1.2 * T }); out.push({ id: 'gE', x0: L.x + 5.5 * T, x1: L.x + 7 * T, y0: L.y - 1.2 * T, y1: L.y + 1.2 * T }); } }
    return out;
  }
  var GOALS = [];
  function goal(G, b, gl) {
    goalsDone[gl.id] = true; stats.goles = (stats.goles || 0) + 1;
    banners.push({ s: '¡GOOOL!', t: 0, dur: 1.8, col: '#fff23a' });
    sfx('cv.gol', { x: b.x, y: b.y });
    say('¡Gooool, causa! ¡Golazo del Callao!', b.x, b.y);
    if (ACH.inv && ACH.inv.drop) { try { ACH.inv.drop(b.x, b.y + 4, [{ id: 'sencillo', n: 2 }]); } catch (e) { addItem('sencillo', 2); } } else addItem('sencillo', 2);
    toast('¡GOOOL! +2 sencillos');
    b.vx *= 0.1; b.vy *= 0.1;
  }
  function kickBall(G, b, c) {
    var p = G.player, a = aimOf(p), m = b.leather ? 1.5 : 1;
    var sp = BALL.kick0 + (BALL.kick1 - BALL.kick0) * c;
    b.vx = a.x * sp; b.vy = a.y * sp; b.vz = 40 + 70 * c; b.z = 1;
    b.dmg = (BALL.dmg0 + (BALL.dmg1 - BALL.dmg0) * c) * m; b.bounces = 0; b.hits = []; b.kicked = true; b.t = 0;
    p.kickT = 0.24; p.atkBuf = 0;
    sfx('cv.pelota.patada', { x: b.x, y: b.y, charge: c, leather: b.leather });
    if (c > 0.8) ftext(p.x, p.y - 30, '¡CAÑONAZO!', '#fff23a');
  }
  function ballInFront(G) {
    var p = G.player, f = aimOf(p), best = null, bd = BALL.kickR;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i], dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > bd || b.z > 8) continue;
      if (d > 7 && (dx * f.x + dy * f.y) / d < 0.2) continue;   // delante (o pegada a los pies)
      bd = d; best = b;
    }
    return best;
  }
  function updateBalls(G, dt) {
    var p = G.player, wd = W();
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i], sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      // conducir: caminar contra ella la empuja adelante
      if (p && p.hp > 0 && p.moving && (p.mx || p.my) && !(p.z > 4) && b.z < 2 && sp < 120 && !(chargeF && chargeF.b === b)) {
        var dx = b.x - p.x, dy = b.y - p.y, d = Math.sqrt(dx * dx + dy * dy), ml = Math.sqrt(p.mx * p.mx + p.my * p.my) || 1, ux = p.mx / ml, uy = p.my / ml;
        if (d < 8 && (dx * ux + dy * uy) > -1) {
          var ps = ((ACH.ent && ACH.ent.CFG && (p.running ? ACH.ent.CFG.run : ACH.ent.CFG.walk)) || 60) * BALL.dribble;
          b.vx = ux * ps; b.vy = uy * ps; b.kicked = false; b.dmg = 0;
          if (d < 5) { b.x = p.x + ux * 6; b.y = p.y + uy * 4 + 1; }
          sp = ps;
        }
      }
      if (b.z > 0 || b.vz > 0) { b.vz -= 420 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = b.vz < -60 ? -b.vz * 0.35 : 0; if (b.vz) sfx('cv.pelota.bote', { x: b.x, y: b.y }); } }
      if (sp < BALL.stop && !(b.z > 0)) { b.vx = b.vy = 0; b.kicked = false; continue; }
      b.t += dt; b.roll += sp * dt / 5;
      var n = Math.max(1, Math.ceil(sp * dt / 3)), sx = b.vx * dt / n, sy = b.vy * dt / n;
      for (var s = 0; s < n; s++) {
        var hx = solidAt(b.x + sx, b.y, BALL.r), hy = solidAt(b.x, b.y + sy, BALL.r);
        if (hx || hy) {
          if (sp > 150 && ACH.inter && typeof ACH.inter.damageProp === 'function' && typeof wd.propAt === 'function') {
            var pr = null; try { pr = wd.propAt(b.x + sx * 2, b.y + sy * 2); } catch (e) { pr = null; }
            if (pr && !pr.armas && b.lastProp !== pr) { b.lastProp = pr; try { ACH.inter.damageProp(G, pr, 1, 'swing'); } catch (e2) { /* nada */ } }
          }
          if (hx) { b.vx = -b.vx * 0.6; sx = -sx * 0.6; }
          if (hy) { b.vy = -b.vy * 0.6; sy = -sy * 0.6; }
          if (sp > 40) sfx('cv.pelota.rebote', { x: b.x, y: b.y });
        } else { b.x += sx; b.y += sy; }
        for (var g = 0; g < GOALS.length; g++) { var gl = GOALS[g]; if (!goalsDone[gl.id] && b.kicked && b.x > gl.x0 && b.x < gl.x1 && b.y > gl.y0 && b.y < gl.y1) goal(G, b, gl); }
        var csp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (!b.kicked || csp < BALL.dangerSp || b.bounces >= BALL.maxB) continue;
        // contra el chef / dumplings (los recibe nivel.js → chef.js)
        if (onProj(G, { x: b.x, y: b.y, z: b.z + 3, r: 6, dmg: b.dmg, kind: 'ball', bees: b.dmg, vx: b.vx, vy: b.vy })) {
          b.vx = -b.vx * 0.55; b.vy = -b.vy * 0.55 + rnd(-30, 30); b.bounces++; sfx('cv.pelota.rebote', { x: b.x, y: b.y, hit: true }); break;
        }
        for (var k = 0; k < G.zombies.length; k++) {
          var z = G.zombies[k]; if (!alive(z) || b.hits.indexOf(z) >= 0) continue;
          var zx = z.x - b.x, zy = z.y - 3 - b.y, zd = Math.sqrt(zx * zx + zy * zy); if (zd > 8) continue;
          var ux2 = b.vx / csp, uy2 = b.vy / csp;
          var killed = hitZ(G, z, ux2, uy2, { from: { x: b.x - ux2 * 10, y: b.y - uy2 * 10 }, dmg: b.dmg, knock: BALL.push, src: 'pelota' });
          b.hits.push(z); if (b.hits.length > 3) b.hits.shift();
          if (killed !== undefined) { fxHit(G, z, ux2, uy2, killed, true); sfx('cv.pelota.golpe', { x: z.x, y: z.y, killed: killed }); if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type }); }
          // rebote: refleja sobre la normal zombie→pelota
          var nx = zd > 0.1 ? -zx / zd : -ux2, ny = zd > 0.1 ? -zy / zd : -uy2, dot = b.vx * nx + b.vy * ny;
          b.vx = (b.vx - 2 * dot * nx) * 0.7; b.vy = (b.vy - 2 * dot * ny) * 0.7; b.vz = Math.max(b.vz, 50);
          b.bounces++; b.hits = [z];
          break;
        }
      }
      if (!(b.z > 0)) { var f = Math.exp(-BALL.fric * dt); b.vx *= f; b.vy *= f; }
    }
  }

  /* =====================================================================================
     TIROS: barra lanzada y helado en arco · barras en el piso · charcos de helado
     ===================================================================================== */
  function throwBarra(G, col) {
    var p = G.player, a = aimOf(p); stowHeld();
    shots.push({ k: 'barra', col: col, x: p.x + a.x * 6, y: p.y + a.y * 4, z: 12, vx: a.x * 190, vy: a.y * 190, vz: 70, t: 0, done: false, hits: [] });
    p.throwT = 0.2; p.lastThrow = 'barraFosfo_' + col;
    sfx('cv.barra.tiro', { x: p.x, y: p.y, color: col });
  }
  function throwHelado(G, c) {
    var p = G.player, a = aimOf(p), m = ACH.input && ACH.input.mouse, R = 50 + 90 * c;
    if (m && !(ACH.touch && ACH.touch.on) && m.wx !== undefined && mouseRecent()) { var dx = m.wx - p.x, dy = m.wy - p.y, l = Math.sqrt(dx * dx + dy * dy); if (l > 6) { a = { x: dx / l, y: dy / l }; R = Math.min(R, Math.max(30, l)); } }
    stowHeld();
    var vz = 110, z0 = 16, Tf = (vz + Math.sqrt(vz * vz + 2 * 420 * z0)) / 420, sp = R / Tf;
    shots.push({ k: 'helado', x: p.x + a.x * 4, y: p.y + a.y * 3, z: z0, vx: a.x * sp, vy: a.y * sp, vz: vz, t: 0, done: false });
    p.throwT = 0.2; p.lastThrow = 'helado';
    if (ACH.ent && ACH.ent.dirFromVec) { try { p.dir = ACH.ent.dirFromVec(a.x, a.y); } catch (e) { /* nada */ } }
    stats.helados++;
    sfx('cv.helado.tiro', { x: p.x, y: p.y, charge: c });
    if (count('helado') > 0 && take('helado')) { if (!equipHeld('helado')) addItem('helado', 1); }   // la pila: el siguiente a la mano
  }
  var mouseSeen = { x: null, y: null, t: -1e9 };
  function trackMouse() { var m = ACH.input && ACH.input.mouse; if (!m) return; if (m.x !== mouseSeen.x || m.y !== mouseSeen.y) { if (mouseSeen.x !== null) mouseSeen.t = Date.now(); mouseSeen.x = m.x; mouseSeen.y = m.y; } }
  function mouseRecent() { return Date.now() - mouseSeen.t < 2000; }
  var HEL_FREEZE = 4.5;   // v0.13 (E5): congelado del helado 3 s → 4,5 s
  function freeze(z, t) { z.cvFreezeT = Math.max(z.cvFreezeT || 0, t); }
  function landHelado(G, s) {
    var best = null, bd = 13;
    for (var k = 0; k < G.zombies.length; k++) { var z = G.zombies[k]; if (!alive(z)) continue; var d = dist(z.x, z.y, s.x, s.y); if (d < bd) { bd = d; best = z; } }
    if (onProj(G, { x: s.x, y: s.y, z: 0, r: 8, dmg: 0.5, kind: 'throw:helado', bees: 1, slow: 0.4, slowT: HEL_FREEZE })) { splat(s.x, s.y); sfx('cv.helado.splat', { x: s.x, y: s.y }); return; }
    if (best) {
      var ux = best.x - s.x, uy = best.y - s.y, l = Math.sqrt(ux * ux + uy * uy) || 1;
      var killed = hitZ(G, best, ux / l, uy / l, { from: { x: s.x, y: s.y }, dmg: 0.5, knock: 10, src: 'helado' });
      if (killed !== undefined) { fxHit(G, best, ux / l, uy / l, killed, true); if (!killed) freeze(best, HEL_FREEZE); ftext(best.x, best.y - 30, '¡BRRR!', '#bfe8ff'); }
      splat(s.x, s.y); sfx('cv.helado.splat', { x: s.x, y: s.y, hit: true });
      return;
    }
    puddles.push({ x: s.x, y: s.y, t: 0, life: 8, decoy: 3, f: Math.random() < 0.5 ? 1 : 0 });
    if (puddles.length > 8) puddles.shift();
    splat(s.x, s.y); sfx('cv.helado.splat', { x: s.x, y: s.y });
  }
  function splat(x, y) { for (var i = 0; i < 10; i++) { var a = Math.random() * 6.283, v = rnd(20, 70); sparks.push({ x: x, y: y - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, t: 0, life: 0.45, col: i % 3 ? '#ffb6d8' : '#fff2f8' }); } }
  function updateShots(G, dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i]; s.t += dt;
      s.vz -= 420 * dt; s.z += s.vz * dt;
      var nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (solidAt(nx, ny, 2) && s.z < 14) { s.vx *= -0.3; s.vy *= -0.3; } else { s.x = nx; s.y = ny; }
      if (s.k === 'barra') {
        if (!s.hit) {
          if (onProj(G, { x: s.x, y: s.y, z: s.z, r: 6, dmg: 0.5, kind: 'throw:barraFosfo', bees: 0.5 })) { s.hit = true; s.vx *= -0.3; s.vy *= -0.3; }
          else for (var k = 0; k < G.zombies.length; k++) {
            var z = G.zombies[k]; if (!alive(z) || dist(z.x, z.y - 6, s.x, s.y - s.z * 0.3) > 8) continue;
            var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1, killed = hitZ(G, z, s.vx / sp, s.vy / sp, { from: { x: s.x, y: s.y }, dmg: 0.5, knock: 30, src: 'barraFosfo' });
            if (killed !== undefined) fxHit(G, z, s.vx / sp, s.vy / sp, killed, true);
            sfx('cv.barra.hit', { x: z.x, y: z.y }); s.hit = true; s.vx *= -0.25; s.vy *= -0.25; break;
          }
        }
        if (s.z <= 0) { s.z = 0; ground.push({ col: s.col, x: s.x, y: s.y, t: 0, life: 20, rot: Math.random() < 0.5 }); if (ground.length > 10) ground.shift(); shots.splice(i, 1); sfx('cv.barra.cae', { x: s.x, y: s.y }); }
      } else if (s.k === 'helado') {
        if (s.z < 18 && onProj(G, { x: s.x, y: s.y, z: s.z, r: 5, dmg: 0.5, kind: 'throw:helado', bees: 1, slow: 0.4, slowT: 3 })) { splat(s.x, s.y); sfx('cv.helado.splat', { x: s.x, y: s.y }); shots.splice(i, 1); continue; }
        var zHit = false;
        if (s.z < 14) for (var k2 = 0; k2 < G.zombies.length; k2++) { var zh = G.zombies[k2]; if (alive(zh) && dist(zh.x, zh.y, s.x, s.y) < 8) { zHit = true; break; } }
        if (s.z <= 0 || zHit) { landHelado(G, s); shots.splice(i, 1); }
      }
    }
    for (i = ground.length - 1; i >= 0; i--) {
      var gb = ground[i]; gb.t += dt; if (gb.t >= gb.life) { ground.splice(i, 1); continue; }
      decoy(G, gb.x, gb.y, 70, false);
      if (night() > 0.1 && ACH.render && ACH.render.addLight) { try { ACH.render.addLight(gb.x, gb.y - 2, 44 * (gb.t > gb.life - 3 ? (gb.life - gb.t) / 3 : 1), COL[gb.col], 1 / 30, 0.8); } catch (e) { /* nada */ } }
    }
    for (i = puddles.length - 1; i >= 0; i--) {
      var pd = puddles[i]; pd.t += dt; if (pd.t >= pd.life) { puddles.splice(i, 1); continue; }
      if (pd.t < pd.decoy + 2) decoy(G, pd.x, pd.y, 80, pd.t < pd.decoy, pd);
    }
    for (i = sparks.length - 1; i >= 0; i--) { var q = sparks[i]; q.t += dt; if (q.t > q.life) { sparks.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; }
  }
  // señuelo: los zombies tranquilos a r px van a mirarlo; los del charco se quedan lamiendo (pin) mientras dure
  function decoy(G, x, y, r, lick, pd) {
    for (var k = 0; k < G.zombies.length; k++) {
      var z = G.zombies[k]; if (!alive(z) || z.state === 'perseguir' || z.state === 'atacar' || z.state === 'golpeado') continue;
      var d = dist(z.x, z.y, x, y); if (d > r) continue;
      if (d < 11 && lick) { z.cvLickT = 0.2; z.moving = false; if (!pd.licked) { pd.licked = true; sfx('cv.helado.lamer', { x: x, y: y }); } continue; }
      z.state = 'investigar'; z.tx = x + (z.x < x ? -4 : 4); z.ty = y + 1;
    }
  }

  /* =====================================================================================
     HELADERO
     ===================================================================================== */
  var HEL = { sp: 24, r: 24, corneta: [4, 7], respawn: [40, 70] };
  function heladeroPath() {
    var P = W().heladeroPath, out = [];
    if (Array.isArray(P) && P.length) {
      var polys = (P[0] && P[0].pts) || (Array.isArray(P[0]) && (P[0].length > 2 || typeof P[0][0] === "object")) ? P : [P];
      polys.forEach(function (poly) { var L = []; (poly.pts || poly).forEach(function (q) { var a = pt(q); if (a) L.push(a); }); if (L.length >= 2) out.push(L); });
    }
    if (!out.length) { var a = place('amor') || startXY(), b = place('salazar'); out.push([{ x: a.x - 20 * T, y: a.y + 3 * T }, b ? { x: b.x, y: b.y + 3 * T } : { x: a.x + 60 * T, y: a.y + 3 * T }]); }
    return out;
  }
  function spawnHeladero(atStart) {
    var paths = helad.path || (helad.path = heladeroPath()), path = paths[Math.floor(Math.random() * paths.length)];
    var rev = Math.random() < 0.5, pts = rev ? path.slice().reverse() : path.slice();
    var h = { pts: pts, i: 0, x: pts[0].x, y: pts[0].y, anim: 0, stopT: 0, cornT: rnd(1, 3), flip: false, said: false };
    if (!atStart) { /* empieza en la punta */ }
    else {   // al iniciar el nivel aparece ya a media ruta, cerca del Parque del Amor si se puede
      var am = place('amor'), bi = 0, bd = 1e9;
      for (var i = 0; i < pts.length; i++) { var d = am ? dist(pts[i].x, pts[i].y, am.x, am.y) : i; if (d < bd) { bd = d; bi = i; } }
      h.i = Math.min(bi, pts.length - 2); h.x = pts[h.i].x; h.y = pts[h.i].y;
    }
    helad.on = h;
  }
  function updateHeladero(G, dt) {
    var h = helad.on;
    if (!h) { helad.waitT -= dt; if (helad.waitT <= 0) spawnHeladero(false); return; }
    h.anim += dt;
    var shopOpen = ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen() && ACH.tienda.vendor && ACH.tienda.vendor() === 'heladero';
    var p = G.player, close = p && dist(p.x, p.y, h.x, h.y) < HEL.r + 6;
    if (shopOpen) h.stopT = 3;
    if (h.stopT > 0 && !close) h.stopT -= dt;
    if (h.stopT <= 0) {
      var tgt = h.pts[h.i + 1];
      if (!tgt) { helad.on = null; helad.waitT = rnd(HEL.respawn[0], HEL.respawn[1]); return; }
      var dx = tgt.x - h.x, dy = tgt.y - h.y, d = Math.sqrt(dx * dx + dy * dy), st = HEL.sp * dt;
      if (d <= st) { h.x = tgt.x; h.y = tgt.y; h.i++; } else { h.x += dx / d * st; h.y += dy / d * st; }
      if (dx < -0.5) h.flip = true; else if (dx > 0.5) h.flip = false;
    }
    h.cornT -= dt;
    if (h.cornT <= 0) {
      h.cornT = rnd(HEL.corneta[0], HEL.corneta[1]);
      if (p && dist(p.x, p.y, h.x, h.y) < 360) {
        sfx('cv.corneta', { x: h.x, y: h.y });
        if (Math.random() < 0.35) say('¡Heladooos!', h.x, h.y, 'heladero');
        h.honk = 0.5;
      }
    }
    if (h.honk > 0) h.honk -= dt;
  }
  function openHeladero(G) {
    var h = helad.on; if (!h) return false;
    h.stopT = 3;
    var Ti = ACH.tienda;
    if (Ti && typeof Ti.open === 'function' && ACH.VENDEDORES_DATA && ACH.VENDEDORES_DATA.heladero) { var ok = false; try { ok = Ti.open('heladero', { x: h.x, y: h.y }); } catch (e) { ok = false; } if (ok) { watchNoMoney(); return true; } }
    // sin tienda: compra directa de 1 helado por 1 sencillo
    if (count('sencillo') < 1) { toast('Heladero: «' + NOPLATA + '»'); sfx('shop.nomoney'); return true; }
    take('sencillo', 1); if (addItem('helado', 1) > 0) { addItem('sencillo', 1); toast('Tu mochila está llena, joven.'); return true; }
    sfx('shop.buy', { id: 'helado' }); toast('+1 helado · ¡Gracias, joven! (S/ 1)');
    return true;
  }

  /* =====================================================================================
     PERRITOS
     ===================================================================================== */
  var DOG = { n: 6, walk: 22, run: 150, cone: 30 * D2R, reach: 140, biteT: 8, bitesEvery: 1, biteDmg: 1, chefDmg: 0.5, barkT: 2, respawn: 30, cd: 20, nudgeR: 18,
    compT: 20, maxComp: 2, follow: 24, followSp: 72, scan: 0.25, tele: 170 };   // v0.13 (E5): compañero 20 s · mordida 1 por segundo (antes 0,5 × 3 s)
  function zones() {
    var Z = W().dogZones, out = [];
    if (Array.isArray(Z)) Z.forEach(function (q) {
      if (!q) return;
      if (q.x0 !== undefined) out.push({ x0: q.x0, y0: q.y0, x1: q.x1, y1: q.y1 });
      else if (q.c0 !== undefined) out.push({ x0: q.c0 * T, y0: q.r0 * T, x1: (q.c1 + 1) * T, y1: (q.r1 + 1) * T });
      else { var a = pt(q); if (a) { var r = (q.r !== undefined && q.c === undefined ? q.r : 4 * T); out.push({ x0: a.x - r, y0: a.y - r * 0.6, x1: a.x + r, y1: a.y + r * 0.6 }); } }
    });
    if (!out.length) ['letonia', 'intihuatana', 'amor'].forEach(function (n) { var a = place(n); if (a) out.push({ x0: a.x - 5 * T, y0: a.y - 3 * T, x1: a.x + 5 * T, y1: a.y + 3 * T }); });
    if (!out.length) { var s = startXY(); out.push({ x0: s.x + 2 * T, y0: s.y - 3 * T, x1: s.x + 14 * T, y1: s.y + 3 * T }); }
    return out;
  }
  var ZONES = [];
  function zonePoint(zn) { for (var i = 0; i < 12; i++) { var x = rnd(zn.x0, zn.x1), y = rnd(zn.y0, zn.y1); if (!solidAt(x, y, 4)) return { x: x, y: y }; } return freeNear((zn.x0 + zn.x1) / 2, (zn.y0 + zn.y1) / 2, 4); }
  function spawnDogs() {
    dogs.length = 0; ZONES = zones();
    for (var i = 0; i < DOG.n; i++) {
      var zn = ZONES[i % ZONES.length], q = zonePoint(zn);
      dogs.push({ comp: 0, scanT: 0, id: i, breed: BREED_IDS[i % BREED_IDS.length], zone: zn, x: q.x, y: q.y, vx: 0, vy: 0, state: 'walk', t: 0, wT: rnd(0, 2), anim: Math.random(), flip: Math.random() < 0.5, cd: 0, target: null, biteN: 0, gone: 0, pets: 0 });
    }
  }
  function chefTargets() {
    var C = CV.chef; if (!C || typeof C.targets !== 'function') return [];
    var L = null; try { L = C.targets(); } catch (e) { L = null; }
    return Array.isArray(L) ? L.filter(function (t) { return t && t.x !== undefined && !t.dead; }) : [];
  }
  function chefHit(t, d) {
    var C = CV.chef; if (C && typeof C.hitBy === 'function') { try { C.hitBy(t, { dmg: t.kind === 'chef' || t.boss ? DOG.chefDmg : DOG.biteDmg * 1.5, kind: 'dog', x: d.x, y: d.y }); return true; } catch (e) { return false; } }
    return false;
  }
  function findTarget(G, d) {   // v0.13: el más cercano al perro a ≤ DOG.reach (sin cono)
    var best = null, bd = DOG.reach + 1;
    function consider(x, y, o, isChef) {
      var dx = x - d.x, dy = y - d.y, l = Math.sqrt(dx * dx + dy * dy); if (l > DOG.reach) return;
      if (l < bd) { bd = l; best = { o: o, chef: isChef }; }
    }
    for (var k = 0; k < G.zombies.length; k++) { var z = G.zombies[k]; if (alive(z)) consider(z.x, z.y, z, false); }
    chefTargets().forEach(function (t) { consider(t.x, t.y, t, true); });
    return best;
  }
  function nudge(G, d) {
    var p = G.player, f = facing(p);
    var anyZ = false; for (var k = 0; k < G.zombies.length; k++) { var z = G.zombies[k]; if (alive(z) && dist(z.x, z.y, d.x, d.y) < 220) { anyZ = true; break; } }
    if (!anyZ && !chefTargets().length || d.cd > 0) { pet(G, d); return; }
    var nComp = 0; for (var q = 0; q < dogs.length; q++) if (dogs[q].comp > 0) nComp++;
    if (nComp >= DOG.maxComp) { pet(G, d); toast('Ya tienes ' + nComp + ' perritos contigo, causa.'); return; }
    p.kickT = 0.24; p.atkBuf = 0;
    d.cd = DOG.cd; stats.perros++;
    d.comp = DOG.compT; d.state = 'comp'; d.target = null; d.t = 0; d.scanT = 0; d.vx = d.vy = 0; d.ux = f.x; d.uy = f.y;
    bark(G, d, true);
    ftext(d.x, d.y - 16, '¡GUAU!', '#fff23a');
    toast('¡Perrito aliado por ' + DOG.compT + ' s! Muerde al zombi que tenga cerca.');
    sfx('cv.patadita', { x: p.x, y: p.y });
  }
  function afterFight(G, d) {   // terminó con su presa: si sigue de compañero vuelve a Alexander; si no, huye
    if (d.comp > 0) { d.state = 'comp'; d.target = null; d.t = 0; d.scanT = 0.4; d.vx = d.vy = 0; }
    else flee(G, d, false);
  }
  function pet(G, d) {
    pets++; d.pets++; d.state = 'sit'; d.t = 0; d.vx = d.vy = 0; d.wT = 1.5;
    ftext(d.x, d.y - 16, '<3', '#ff3fb4');
    sfx('cv.perro.contento', { x: d.x, y: d.y, size: BREEDS[d.breed].size });
    if (pets === 1 || pets % 5 === 0) toast(pets === 1 ? '¡Buen perro! (' + BREEDS[d.breed].name + ') · acariciados: 1' : 'Perritos acariciados: ' + pets + '. ¡Eres el ídolo del malecón!');
  }
  function bark(G, d, loud) { sfx('cv.ladrido', { x: d.x, y: d.y, size: BREEDS[d.breed].size, breed: d.breed }); if (loud) noise(G, d.x, d.y, 110); }
  function flee(G, d, yelp) {
    d.state = 'flee'; d.t = 0; d.target = null; d.comp = 0;
    var p = G.player, cam = G.cam || { x: 0 }, V = view(), dx = d.x - (p ? p.x : d.x), side = dx >= 0 ? 1 : -1;
    d.fx = side > 0 ? cam.x + V.w + 60 : cam.x - 60; d.fy = d.y + rnd(-20, 20);
    if (yelp) { sfx('cv.perro.gemido', { x: d.x, y: d.y, size: BREEDS[d.breed].size }); ftext(d.x, d.y - 16, '¡CAI CAI!', '#bfe8ff'); }
  }
  function moveDog(d, vx, vy, dt) {
    d.vx = vx; d.vy = vy;
    var nx = d.x + vx * dt, ny = d.y + vy * dt, hit = false;
    if (!solidAt(nx, d.y, 3)) d.x = nx; else hit = true;
    if (!solidAt(d.x, ny, 3)) d.y = ny; else hit = true;
    if (vx < -1) d.flip = true; else if (vx > 1) d.flip = false;
    return hit;
  }
  function updateDogs(G, dt) {
    var p = G.player;
    for (var i = 0; i < dogs.length; i++) {
      var d = dogs[i]; d.anim += dt; d.t += dt; if (d.cd > 0) d.cd -= dt;
      if (d.comp > 0) { d.comp -= dt; if (d.comp <= 0 && d.state !== 'flee' && d.state !== 'gone') { d.comp = 0; flee(G, d, false); } }   // se acabaron los 20 s: se va corriendo
      if (d.state === 'gone') { d.gone -= dt; if (d.gone <= 0) { var q = zonePoint(d.zone); d.x = q.x; d.y = q.y; d.state = 'walk'; d.t = 0; d.vx = d.vy = 0; } continue; }
      if (d.state === 'walk' || d.state === 'sit') {
        d.wT -= dt;
        if (d.wT <= 0) {
          d.wT = rnd(1.5, 4);
          if (Math.random() < 0.3) { d.state = 'sit'; d.vx = d.vy = 0; }
          else { d.state = 'walk'; var tgt = zonePoint(d.zone), dx = tgt.x - d.x, dy = tgt.y - d.y, l = Math.sqrt(dx * dx + dy * dy) || 1; d.wx = dx / l; d.wy = dy / l; }
          if (Math.random() < 0.08 && inView(G, d.x, d.y, 0)) bark(G, d, false);
        }
        if (d.state === 'walk') {
          var out = d.x < d.zone.x0 - 20 || d.x > d.zone.x1 + 20 || d.y < d.zone.y0 - 20 || d.y > d.zone.y1 + 20;
          if (out) { var cx = (d.zone.x0 + d.zone.x1) / 2 - d.x, cy = (d.zone.y0 + d.zone.y1) / 2 - d.y, cl = Math.sqrt(cx * cx + cy * cy) || 1; d.wx = cx / cl; d.wy = cy / cl; }
          if (moveDog(d, (d.wx || 0) * DOG.walk, (d.wy || 0) * DOG.walk, dt)) d.wT = Math.min(d.wT, 0.2);
        } else { d.vx = d.vy = 0; }
        continue;
      }
      if (d.state === 'comp') {   // v0.13: acompaña a Alexander y busca zombis
        if (!p || p.hp <= 0) { flee(G, d, false); continue; }
        d.scanT -= dt;
        if (d.scanT <= 0) {
          d.scanT = DOG.scan;
          var tgc = findTarget(G, d);
          if (tgc) { d.state = 'charge'; d.target = tgc; d.t = 0; if (Math.random() < 0.5) bark(G, d, false); continue; }
        }
        var cdx = p.x - d.x, cdy = p.y - d.y, cdl = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdl > DOG.tele) { var qn = freeNear(p.x - 18 * (p.dir === 'left' ? -1 : 1), p.y + 4, 3); d.x = qn.x; d.y = qn.y; d.vx = d.vy = 0; }
        else if (cdl > DOG.follow) moveDog(d, cdx / cdl * (cdl > 80 ? DOG.run : DOG.followSp), cdy / cdl * (cdl > 80 ? DOG.run : DOG.followSp), dt);
        else { d.vx = d.vy = 0; if (d.flipT === undefined || (d.flipT -= dt) <= 0) { d.flipT = 1.5; d.flip = p.x < d.x; } }
        continue;
      }
      if (d.state === 'charge') {
        var tg = d.target, o = tg && tg.o;
        if (!o || (!tg.chef && !alive(o)) || (tg.chef && o.dead) || d.t > 4) { afterFight(G, d); continue; }
        var ddx = o.x - d.x, ddy = o.y - d.y, dl = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dl < 8) { d.state = 'bite'; d.t = 0; d.biteN = 0; d.biteT = 0; d.vx = d.vy = 0; d.ox = d.x - o.x; d.oy = d.y - o.y; continue; }
        moveDog(d, ddx / dl * DOG.run, ddy / dl * DOG.run, dt);
        continue;
      }
      if (d.state === 'bite') {
        var tb = d.target, ob = tb && tb.o;
        if (!ob || (!tb.chef && !alive(ob)) || (tb.chef && ob.dead) || d.t >= DOG.biteT) { afterFight(G, d); continue; }
        d.x = ob.x + Math.max(-9, Math.min(9, d.ox)); d.y = ob.y + Math.max(-3, Math.min(3, d.oy)); d.vx = d.vy = 0;
        if (!tb.chef) { ob.stunT = Math.max(ob.stunT || 0, 0.3); if (ob.state !== 'golpeado') ob.state = 'golpeado'; ob.lungeT = 0; if (ob.atkCD < 0.3) ob.atkCD = 0.3; }
        d.biteT -= dt;
        if (d.biteT <= 0) {
          d.biteT = DOG.bitesEvery; d.biteN++;
          sfx('cv.perro.mordida', { x: d.x, y: d.y, size: BREEDS[d.breed].size });
          if (tb.chef) { if (!chefHit(ob, d)) onProj(G, { x: ob.x, y: ob.y, z: 4, r: 10, dmg: DOG.chefDmg, kind: 'dog' }); }
          else {
            var ux = ob.x - d.x, uy = ob.y - d.y, ul = Math.sqrt(ux * ux + uy * uy) || 1;
            var killed = hitZ(G, ob, ux / ul, uy / ul, { from: { x: d.x, y: d.y }, dmg: DOG.biteDmg, knock: 4, src: 'perro' });
            if (killed !== undefined) fxHit(G, ob, ux / ul, uy / ul, killed, d.biteN === 1);
            if (killed) { sfx('kill', { x: ob.x, y: ob.y, type: ob.type }); afterFight(G, d); continue; }
            ob.stunT = Math.max(ob.stunT || 0, 1.05);
          }
          // otro zombie al lado lo puede golpear: chilla y huye sin daño
          if (!(d.comp > 0)) for (var k = 0; k < G.zombies.length; k++) { var zz = G.zombies[k]; if (zz !== ob && alive(zz) && zz.state !== 'golpeado' && dist(zz.x, zz.y, d.x, d.y) < 14 && Math.random() < 0.4) { flee(G, d, true); break; } }   // el compañero aguanta
        }
        continue;
      }
      if (d.state === 'flee') {
        var fx = d.fx - d.x, fy = d.fy - d.y, fl = Math.sqrt(fx * fx + fy * fy) || 1;
        var hit = moveDog(d, fx / fl * DOG.run, fy / fl * DOG.run * 0.5, dt);
        if (hit) d.fy += rnd(-30, 30);
        if (fl < 8 || d.t > 5 || (!inView(G, d.x, d.y, 20) && d.t > 0.8)) { d.state = 'gone'; d.gone = DOG.respawn; d.target = null; }
      }
    }
  }

  /* =====================================================================================
     E y F: envolver ACH.armas.update · avisos
     ===================================================================================== */
  function computeNear(G) {
    var p = G.player; near.kind = null; near.o = null;
    if (!p || p.hp <= 0) return;
    var h = helad.on;
    if (h && dist(p.x, p.y, h.x, h.y) < HEL.r) { near.kind = 'heladero'; near.o = h; return; }
    var bd = DOG.nudgeR, bo = null;
    for (var i = 0; i < dogs.length; i++) { var d = dogs[i]; if (d.state !== 'walk' && d.state !== 'sit') continue; var dd = dist(p.x, p.y, d.x, d.y); if (dd < bd) { bd = dd; bo = d; } }
    if (bo) { near.kind = 'dog'; near.o = bo; return; }
    for (i = 0; i < balls.length; i++) { var b = balls[i]; if (b.z < 4 && dist(p.x, p.y, b.x, b.y) < 16 && Math.abs(b.vx) + Math.abs(b.vy) < 60) { near.kind = 'ball'; near.o = b; return; } }
  }
  function pressE(G) {
    if (near.kind === 'heladero') return openHeladero(G);
    if (near.kind === 'dog') { nudge(G, near.o); return true; }
    if (near.kind === 'ball') {
      var b = near.o, id = b.leather ? 'pelotaCuero' : 'pelota';
      if (addItem(id, 1) > 0) { toast('No te entra otra pelota en la mochila, causa.'); return true; }
      var k = balls.indexOf(b); if (k >= 0) balls.splice(k, 1);
      sfx('grab', { x: b.x, y: b.y }); toast('+1 ' + (b.leather ? 'pelota de cuero' : 'pelota') + ' a la mochila');
      return true;
    }
    return false;
  }
  function mask(In, codes, fn) {
    var op = In.pressed;
    In.pressed = function (c) { return codes.indexOf(c) >= 0 ? false : op.apply(this, arguments); };
    try { return fn(); } finally { In.pressed = op; }
  }
  function wrapArmas() {
    var A = ACH.armas; if (!A || typeof A.update !== 'function' || A.update._cv) return;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input, self = this, args = arguments, masked = [];
      try {
        if (G && G.state === 'playing' && G.player && G.player.hp > 0 && In && typeof In.pressed === 'function') {
          var p = G.player;
          trackMouse(); computeNear(G);
          if (In.pressed('KeyE') && near.kind && pressE(G)) masked.push('KeyE');
          // F: pelota delante (prioridad) → cargar patada; barra en la mano → tirarla; helado → cargar tiro
          if (chargeF) {
            masked.push('KeyF');
            if (In.down('KeyF')) chargeF.c = Math.min(1, chargeF.c + dt / (chargeF.k === 'ball' ? BALL.chargeT : 0.8));
            else {
              var cf = chargeF; chargeF = null;
              if (cf.k === 'ball' && balls.indexOf(cf.b) >= 0 && dist(p.x, p.y, cf.b.x, cf.b.y) < BALL.kickR + 10) kickBall(G, cf.b, cf.c < 0.12 ? 0 : cf.c);
              else if (cf.k === 'helado' && heldId(p) === 'helado') throwHelado(G, cf.c);
            }
          } else if (In.pressed('KeyF') && !(p.z > 0)) {
            var b = ballInFront(G), col = heldBarra(p);
            if (b) { chargeF = { k: 'ball', b: b, c: 0 }; masked.push('KeyF'); }
            else if (col) { throwBarra(G, col); masked.push('KeyF'); }
            else if (heldId(p) === 'helado') { chargeF = { k: 'helado', c: 0 }; masked.push('KeyF'); }
          }
        } else chargeF = null;
      } catch (e) { if (!wrapArmas.warned) { wrapArmas.warned = true; console.warn('[ACHORADO] juguetes E/F', e); } }
      if (masked.length) return mask(In, masked, function () { return origU.apply(self, args); });
      return origU.apply(this, arguments);
    };
    A.update._cv = true;
    if (typeof origC === 'function') {
      A.context = function () {
        if (near.kind === 'heladero') return { label: 'COMPRAR', code: 'KeyE' };
        if (near.kind === 'dog') return { label: 'PATADITA', code: 'KeyE' };
        var G = ACH.G; if (G && G.player && ballInFront(G)) return { label: 'PATEAR', code: 'KeyF' };
        if (near.kind === 'ball') return { label: 'AGARRAR', code: 'KeyE' };
        return origC.apply(this, arguments);
      };
      A.context._cv = true;
    }
  }

  /* =====================================================================================
     EFECTOS: congelado, lamiendo, wantán, canilleras
     ===================================================================================== */
  function updateZEffects(G, dt) {
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i], pv = zPrev ? zPrev.get(z) : z._cvPrev;
      if (z.state === 'muerto') { z.cvFreezeT = 0; z.cvLickT = 0; }
      if (pv && z.state !== 'golpeado' && z.state !== 'muerto') {
        if (z.cvLickT > 0) { z.x = pv.x; z.y = pv.y; z.moving = false; if (z.atkCD < 0.3) z.atkCD = 0.3; }
        else if (z.cvFreezeT > 0) { z.x = pv.x + (z.x - pv.x) * 0.4; z.y = pv.y + (z.y - pv.y) * 0.4; }
      }
      if (z.cvFreezeT > 0) z.cvFreezeT -= dt;
      if (z.cvLickT > 0) z.cvLickT -= dt;
      var rec = { x: z.x, y: z.y }; if (zPrev) zPrev.set(z, rec); else z._cvPrev = rec;
    }
  }
  function updateEffects(G, dt) {
    var p = G.player; if (!p) return;
    if (eff.wantanT > 0) eff.wantanT -= dt;
    if (eff.canillT > 0) {
      eff.canillT -= dt;
      if (eff.lastHp !== null && p.hp < eff.lastHp && p.hp > 0) p.hp = Math.min(eff.lastHp, p.hp + (eff.lastHp - p.hp) * 0.25);   // −25 % del golpe
      if (eff.canillT <= 0) toast('Se te cayeron las canilleras, causa.');
    }
    eff.lastHp = p.hp;
    var col = heldBarra(p);
    if (col && night() > 0.1 && ACH.render && ACH.render.addLight) { try { ACH.render.addLight(p.x, p.y - 8, 44, COL[col], 1 / 30, 0.9); } catch (e) { /* nada */ } }
  }

  /* =====================================================================================
     DIBUJO
     ===================================================================================== */
  function shadow(g, x, y, w) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(Math.round(x - w / 2), Math.round(y - 1), Math.round(w), 2); }
  function drawables(G, out) {
    var i;
    for (i = 0; i < balls.length; i++) (function (b) {
      if (!inView(G, b.x, b.y, 20)) return;
      out.push({ y: b.y, x: b.x, draw: function (g, cx, cy) { shadow(g, b.x - cx, b.y - cy + 1, 6); blit(g, ballSpr(b), b.x - cx, b.y - cy - b.z); } });
    })(balls[i]);
    for (i = 0; i < dogs.length; i++) (function (d) {
      if (d.state === 'gone' || !inView(G, d.x, d.y, 30)) return;
      out.push({ y: d.y, x: d.x, draw: function (g, cx, cy) {
        var S = dogSpr(d); shadow(g, d.x - cx, d.y - cy + 1, 10); blit(g, S.s, d.x - cx, d.y - cy, S.flip);
        if (d.comp > 0) {   // compañero: barrita con el tiempo que le queda
          var bx = Math.round(d.x - cx) - 7, by = Math.round(d.y - cy) - 17;
          g.fillStyle = '#131015'; g.fillRect(bx - 1, by - 1, 16, 4); g.fillStyle = d.comp < 4 && Math.floor(d.comp * 5) % 2 ? '#ff3a3a' : '#ff3fb4'; g.fillRect(bx, by, Math.max(1, Math.round(14 * d.comp / DOG.compT)), 2);
        }
      } });
    })(dogs[i]);
    var h = helad.on;
    if (h && inView(G, h.x, h.y, 50)) out.push({ y: h.y, x: h.x, draw: function (g, cx, cy) { shadow(g, h.x - cx, h.y - cy, 30); blit(g, heladeroSpr(h), h.x - cx, h.y - cy, h.flip); } });
  }
  function drawTop(g, G, cx, cy) {
    var i, s;
    for (i = 0; i < puddles.length; i++) { var pd = puddles[i]; if (!inView(G, pd.x, pd.y, 20)) continue; g.globalAlpha = pd.t > pd.life - 1.5 ? Math.max(0, (pd.life - pd.t) / 1.5) : 1; blit(g, charcoSpr(pd.f), pd.x - cx, pd.y - cy + 2); }
    g.globalAlpha = 1;
    var nt = night();
    for (i = 0; i < ground.length; i++) {
      var gb = ground[i]; if (!inView(G, gb.x, gb.y, 50)) continue;
      if (nt > 0.1) { g.globalAlpha = 0.6 * nt; blit(g, phHalo(gb.col, 22), gb.x - cx, gb.y - cy - 1); g.globalAlpha = 1; }
      blit(g, barraSpr(gb.col), gb.x - cx, gb.y - cy + 1);
      if (Math.floor(gb.t * 3) % 2 === 0) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(gb.x - cx) - 1, Math.round(gb.y - cy) - 2, 1, 1); }
    }
    for (i = 0; i < shots.length; i++) {
      var sh = shots[i], x = sh.x - cx, y = sh.y - cy;
      shadow(g, x, y + 1, 5);
      if (sh.k === 'barra') {
        var a = sh.t * 18, c = Math.cos(a), sn = Math.sin(a);
        g.strokeStyle = '#131015'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - c * 5, y - sh.z - sn * 5); g.lineTo(x + c * 5, y - sh.z + sn * 5); g.stroke();
        g.strokeStyle = COL[sh.col]; g.lineWidth = 1; g.beginPath(); g.moveTo(x - c * 5, y - sh.z - sn * 5); g.lineTo(x + c * 5, y - sh.z + sn * 5); g.stroke();
      } else { s = heladoSpr(); blit(g, s, x, y - sh.z); }
    }
    for (i = 0; i < sparks.length; i++) { var q = sparks[i]; g.fillStyle = q.col; g.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), 1, 1); }
    // congelados y lamiendo: cristalitos / corazones
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (!(z.cvFreezeT > 0) && !(z.cvLickT > 0)) continue;
      var zx = Math.round(z.x - cx), zy = Math.round(z.y - cy) - 30, ph = (G.clock || 0) * 4;
      g.fillStyle = z.cvLickT > 0 ? '#ffb6d8' : '#bfe8ff';
      g.fillRect(zx - 4 + Math.round(Math.sin(ph) * 2), zy, 2, 2); g.fillRect(zx + 3, zy - 2 + Math.round(Math.cos(ph) * 2), 2, 2);
      if (z.cvFreezeT > 0) { g.fillStyle = 'rgba(160,220,255,.35)'; g.fillRect(zx - 4, zy + 6, 8, 22); }
    }
    // perros mordiendo: ¡GRR!
    if (G.state !== 'playing' || (ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen())) return;
    var p = G.player, label = null, ax = 0, ay = 0, touch = ACH.touch && ACH.touch.on;
    if (near.kind === 'heladero') { label = 'E comprar helados'; ax = near.o.x; ay = near.o.y - 48; }
    else if (near.kind === 'dog') { var dz = near.o, anyZ = false; for (i = 0; i < G.zombies.length; i++) if (alive(G.zombies[i]) && dist(G.zombies[i].x, G.zombies[i].y, dz.x, dz.y) < 220) { anyZ = true; break; } label = dz.cd <= 0 && anyZ ? 'E patadita (¡aliado 20 s!)' : 'E acariciar'; ax = dz.x; ay = dz.y - 22; }
    else if (ballInFront(G)) { label = 'F patear (mantén = cargar)'; ax = p.x; ay = p.y - 42; }
    else if (near.kind === 'ball') { label = 'E agarrar pelota'; ax = near.o.x; ay = near.o.y - 16; }
    if (chargeF) {   // barra de carga sobre Alexander
      var bx = Math.round(p.x - cx) - 10, by = Math.round(p.y - cy) - 40;
      g.fillStyle = '#131015'; g.fillRect(bx - 1, by - 1, 22, 4); g.fillStyle = '#ff3fb4'; g.fillRect(bx, by, Math.round(20 * chargeF.c), 2);
      return;
    }
    if (!label || touch) return;
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = Math.ceil(g.measureText(label).width) + 6, tx = Math.round(ax - cx), ty = Math.round(ay - cy);
    g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(tx - (w >> 1), ty - 5, w, 10);
    g.globalAlpha = 1; g.fillStyle = '#3dff6a'; g.fillRect(tx - (w >> 1), ty + 5, w, 1);
    g.fillStyle = '#f2f2f2'; g.fillText(label, tx, ty);
    g.fillStyle = '#fff23a'; g.fillText(label.charAt(0), tx - (w >> 1) + 3 + Math.ceil(g.measureText(label.charAt(0)).width / 2) - 0.5, ty);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }
  // después de la luz: el brillo de la barra en la mano (de noche) y los carteles grandes (¡GOOOL!, ¡CEREBRO CONGELADO!)
  function drawScreen(g, G, cx, cy) {
    var p = G.player, nt = night(), col = p && heldBarra(p);
    if (col && nt > 0.1 && G.state === 'playing') { g.globalAlpha = 0.55 * nt; blit(g, phHalo(col, 22), p.x - cx, p.y - cy - 10); g.globalAlpha = 1; }
    if (nt > 0.1) for (var j = 0; j < ground.length; j++) { var gb = ground[j]; if (inView(G, gb.x, gb.y, 30)) { g.globalAlpha = 0.45 * nt; blit(g, phHalo(gb.col, 12), gb.x - cx, gb.y - cy - 1); g.globalAlpha = 1; } }
    for (var i = banners.length - 1; i >= 0; i--) {
      var b = banners[i];
      if (G.state === 'playing') b.t += 1 / 60;
      if (b.t > b.dur) { banners.splice(i, 1); continue; }
      var V = view(), sc = b.t < 0.15 ? b.t / 0.15 : 1, y = Math.round(V.h * 0.32);
      g.save(); g.font = 'bold ' + Math.round(22 * sc + 4) + 'px Bungee, Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1;
      g.fillStyle = '#131015'; g.fillText(b.s, V.w / 2 + 2, y + 2); g.fillStyle = '#ff3fb4'; g.fillText(b.s, V.w / 2 + 1, y + 1); g.fillStyle = b.col; g.fillText(b.s, V.w / 2, y);
      g.restore();
    }
  }
  var hooked = false;
  function hookScreen() {
    if (hooked) return;
    var DH = ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
    if (!Array.isArray(DH.screen)) DH.screen = [];
    DH.screen.push(function (g, G, cx, cy) { if (ACH.world && (ACH.world.id === 'costaverde' || CV._here)) drawScreen(g, G, cx, cy); });
    hooked = true;
  }

  /* =====================================================================================
     SISTEMA
     ===================================================================================== */
  function eatHelado(G) {
    var p = G.player; if (heldId(p) !== 'helado') return 0;
    stowHeld();
    sfx('item.eat', { x: p.x, y: p.y, helado: true });
    var n = hpUp(p, 8);
    banners.push({ s: '¡CEREBRO CONGELADO!', t: 0, dur: 1.4, col: '#bfe8ff' });
    toast('+' + n + ' vida · ¡CEREBRO CONGELADO!');
    if (count('helado') > 0 && take('helado')) { if (!equipHeld('helado')) addItem('helado', 1); }
    return 0;
  }
  function setupLevel(G) {
    registerItems(); defineHeld(); wrapPoseFrame(); wrapArmas(); registerVendors(); wrapTienda(); hookScreen();
    CV._here = true;
    if (ACH.vendedores && typeof ACH.vendedores.setup === 'function') { try { ACH.vendedores.setup(); } catch (e) { /* nada */ } }
    balls.length = 0; shots.length = 0; ground.length = 0; puddles.length = 0; banners.length = 0; sparks.length = 0;
    goalsDone = {}; chargeF = null; eff.wantanT = 0; eff.canillT = 0; eff.lastHp = null; saidV = {};
    GOALS = goalBoxes();
    var L = place('losa') || (function () { var s = startXY(); return { x: s.x + 6 * T, y: s.y + 2 * T }; })();
    [[-2, -0.6], [0, 0.8], [2.2, -0.2]].forEach(function (o) { var q = freeNear(L.x + o[0] * T, L.y + o[1] * T, 3); spawnBall(q.x, q.y, false); });
    helad.path = null; helad.on = null; helad.waitT = 0;
    spawnHeladero(true);
    spawnDogs();
    stats.perros = 0; stats.helados = 0; stats.goles = 0; pets = 0;
  }
  CV.register({
    name: 'juguetes',
    reset: function (G) { try { setupLevel(G); } catch (e) { console.warn('[ACHORADO] juguetes.reset', e); } },
    onRespawn: function (G) {
      shots.length = 0; chargeF = null; eff.lastHp = null;
      dogs.forEach(function (d) { if (d.state !== 'gone') { d.state = 'walk'; d.target = null; d.comp = 0; } });
    },
    update: function (G, dt) {
      updateBalls(G, dt); updateShots(G, dt); updateHeladero(G, dt); updateDogs(G, dt); updateZEffects(G, dt); updateEffects(G, dt);
    },
    speedMul: function () { return eff.wantanT > 0 ? 1.2 : 1; },
    onSwing: function (G, sw) { if (sw && sw.kind === 'held:helado') return eatHelado(G); return 0; },
    drawables: drawables,
    drawTop: drawTop
  });
  // por si el nivel se registró antes de que exista ACH.inv / armas.js en otra página: también al cargar
  try { registerItems(); registerVendors(); } catch (e) { /* se reintenta en reset */ }

  /* ---------------- API pública ---------------- */
  CV.juguetes = {
    fosfoCount: function () { var G = ACH.G, p = G && G.player; return count('barraFosfo') + 3 * count('packFosfo') + (p && heldBarra(p) ? 1 : 0); },
    balls: function () { return balls.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), sp: Math.round(Math.sqrt(b.vx * b.vx + b.vy * b.vy)), leather: b.leather, kicked: b.kicked, bounces: b.bounces }; }); },
    dogs: function () { return dogs.map(function (d) { return { id: d.id, breed: d.breed, state: d.state, x: Math.round(d.x), y: Math.round(d.y), cd: +d.cd.toFixed(1), pets: d.pets, comp: +(d.comp || 0).toFixed(1) }; }); },
    heladero: function () { var h = helad.on; return h ? { x: Math.round(h.x), y: Math.round(h.y), i: h.i, n: h.pts.length, stop: h.stopT > 0 } : { waitT: +helad.waitT.toFixed(1) }; },
    pets: function () { return pets; },
    shots: function () { return shots.map(function (s) { return { k: s.k, x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z) }; }).concat(puddles.map(function (q) { return { k: "charco", x: Math.round(q.x), y: Math.round(q.y), t: +q.t.toFixed(1) }; })); },
    goals: function () { return { boxes: GOALS, done: Object.keys(goalsDone) }; },
    VDATA: VDATA, ITEMS: ITEMS
  };

  /* ---------------- Debug: ACH.debug.cv.juguetes ---------------- */
  var DB = ACH.debug = ACH.debug || {}, DCV = DB.cv = DB.cv || {};
  function G0() { return ACH.G; }
  DCV.juguetes = {
    ball: function (leather) { var G = G0(), p = G && G.player; if (!p) return null; var f = facing(p), q = freeNear(p.x + f.x * 12, p.y + f.y * 8 + 1, 3); spawnBall(q.x, q.y, !!leather); return CV.juguetes.balls(); },
    kick: function (c) { var G = G0(), b = G && ballInFront(G); if (!b) return { error: 'no hay pelota delante' }; kickBall(G, b, c || 0); return CV.juguetes.balls(); },
    dog: function () {   // trae un perro al lado de Alexander
      var G = G0(), p = G && G.player; if (!p || !dogs.length) return null;
      var d = dogs.filter(function (q) { return q.state === 'walk' || q.state === 'sit'; })[0] || dogs[0];
      var f = facing(p); d.x = p.x - f.x * 10 + 6; d.y = p.y + 4; d.state = 'sit'; d.cd = 0; d.wT = 5; return CV.juguetes.dogs();
    },
    nudge: function () { var G = G0(); computeNear(G); if (near.kind !== 'dog') return { error: 'no hay perro cerca' }; nudge(G, near.o); return CV.juguetes.dogs(); },
    heladero: function () { var G = G0(), p = G && G.player; if (!p) return null; if (!helad.on) spawnHeladero(false); var h = helad.on; h.x = p.x + 16; h.y = p.y; h.stopT = 4; return CV.juguetes.heladero(); },
    give: function (id, n) { if (id && ITEMS[id]) return addItem(id, n || 1); ['pelota', 'barraFosfo', 'packFosfo', 'helado', 'chaufa', 'wantan', 'chicha', 'canilleras', 'paleta', 'pelotaCuero'].forEach(function (k) { addItem(k, 2); }); addItem('sencillo', 30); return 'ok'; },
    giveHelados: function (n) { return addItem('helado', n || 6); },
    giveBarras: function (n) { return addItem('barraFosfo', n || 4); },
    equip: function (id) { var G = G0(); if (!G) return false; id = id || 'barraFosfo'; addItem(id, 1); var d = inv().defs[id]; return d && d.use && d.use.fn ? d.use.fn(id, G.player, G) : false; },
    throwHelado: function (c) { var G = G0(); if (heldId(G.player) !== 'helado') DCV.juguetes.equip('helado'); throwHelado(G, c === undefined ? 0.5 : c); return shots.length; },
    throwBarra: function () { var G = G0(), col = heldBarra(G.player); if (!col) { DCV.juguetes.equip('barraFosfo'); col = heldBarra(G.player); } if (col) throwBarra(G, col); return shots.length; },
    eat: function () { var G = G0(); if (heldId(G.player) !== 'helado') DCV.juguetes.equip('helado'); eatHelado(G); return G.player.hp; },
    vendor: function (id) { var Ti = ACH.tienda; if (!Ti) return { error: 'sin tienda' }; return { open: Ti.open(id || 'fosfo'), rows: Ti.rows ? Ti.rows() : null }; },
    vendorsHere: function () { var lv = ACH.vendedores && ACH.vendedores.level ? ACH.vendedores.level() : null; for (var id in VDATA) { ACH.VENDEDORES_DATA[id].nivel = lv; } VIDS.forEach(function (v) { if (ACH.vendedores.SPOTS[v]) ACH.vendedores.SPOTS[v].nivel = lv; }); ACH.vendedores.setup(); return ACH.vendedores.list(); },
    stats: function () { return { perros: stats.perros, helados: stats.helados, pets: pets, fosfo: CV.juguetes.fosfoCount(), wantanT: +eff.wantanT.toFixed(1), canillT: +eff.canillT.toFixed(1), near: near.kind, charge: chargeF ? +chargeF.c.toFixed(2) : null, shots: shots.length, ground: ground.length, puddles: puddles.length }; },
    night: function (on) { if (ACH.noche && ACH.noche.force) ACH.noche.force(on !== false); return night(); }
  };
})();
