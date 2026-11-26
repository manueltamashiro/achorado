/* ACHORADO — js/barranco/objetos.js (B1c, BARRANCO.md §4): cajón peruano, botellas de bar y sus charcos, comidas nuevas y los datos de las
   tiendas de Barranco. Patrón de js/costaverde/juguetes.js (sin editarlo).
   - Sistema de ACH.br (register): reset / onRespawn / update / onSwing / speedMul / drawTop. Funciona aunque falten nivel.js, el arte o el audio.
   - CAJÓN (`cajon`): ACH.armas.define('cajon') en la mano (hold.kind 'cajon', cd 1,1 s, 15 golpes × ACH.cfg.durMul). ESPACIO = onda 360°:
     radio 56, daño 0,5, empujón 160, aturde 0,5 s. A TIEMPO (ACH.br.onTime(0.12); fuera de Barranco ACH.hab.onBeat): radio 72, aturde 1 s,
     anillo dorado «¡A TIEMPO!» (y con el Landó del Contrapunto prendido, daño ×mul y +4 sabor). Manda a ACH.nivel.onProjectile
     {kind:'cajon', area:true, x, y, r, dmg, stun, onTime}. Rompe props livianos cerca. F = lanzarlo (lo de siempre de armas.js).
   - BOTELLAS (`botella`, `botellaDorada`): USAR = a la mano. ESPACIO = tiro rápido; F mantener/soltar = tiro cargado en arco hacia el mouse
     (o hacia donde mira; táctil: el botón LANZAR del contexto). Al romperse: daño 1 (dorada 2) al muerto que toca, vidrios y un CHARCO de 40 px
     que dura 4 s: los zombies que lo pisan patinan 0,4 s y caen 1 s; Alexander, si corre encima, patina un poquito. Proyectil {kind:'botella'}.
     `botella` ya existía (molotov): aquí además se tira; las recetas siguen igual. `packBotellas` = +3 botellas.
   - Cajas de cerveza (props `cajaCervezas*` del mundo): por ACH.propHooks, al romperlas sueltan 1–3 botellas.
   - Comidas: anticucho +30, picarones +20 vida y +15 sabor, pescadoFrito +40, emoliente +15 vida (aliento lleno) y cura la lentitud,
     `chicha` (chicha morada, ya existe en juguetes.js) y `gaseosa`. `cuaderno` (la mini-tarea de Lucía, vecinos.js).
   - Tiendas: ACH.VENDEDORES_DATA tomas · rosa_br · lucho · celedonio (nivel 'barranco'). NO van en ACH.vendedores.SPOTS: las abre vecinos.js
     desde el menú de charla (ACH.br.objetos.openShop(id)). «No alcanza» = «Fiado no hay, compadre, que la jarana se paga».
   API: ACH.br.objetos = { charcos(), shots(), lastWave(), openShop(id, at), VDATA, ITEMS, onTime(tol) }   Debug: ACH.debug.br.obj */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var BR = ACH.br = ACH.br || {}; BR.systems = BR.systems || [];
  if (!BR.register) BR.register = function (s) { if (BR.systems.indexOf(s) < 0) BR.systems.push(s); return s; };
  var D2R = Math.PI / 180, T = 16;

  /* ---------------- utilidades ---------------- */
  function sfx(n, d) {
    if (typeof BR.sfx === 'function') { try { BR.sfx(n, d); return; } catch (e) { /* nada */ } }
    var a = ACH.audio; if (a && typeof a.emit === 'function') { try { a.emit(n, d); } catch (e2) { /* el sonido nunca rompe el juego */ } }
  }
  function toast(t) {
    if (typeof BR.toast === 'function') { try { BR.toast(t); return; } catch (e) { /* nada */ } }
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
  function hitZ(G, z, ux, uy, o) { var E = ACH.ent; if (!E || typeof E.hitZombie !== 'function') return undefined; try { return E.hitZombie(G, z, ux, uy, o); } catch (e) { return undefined; } }
  function fxHit(G, z, ux, uy, killed, first) { if (ACH.fx && typeof ACH.fx.hit === 'function') { try { ACH.fx.hit(G, z, ux, uy, killed, first); } catch (e) { /* nada */ } } }
  function noise(G, x, y, r) { var E = ACH.ent; if (E && typeof E.emitNoise === 'function') { try { E.emitNoise(G, x, y, r); } catch (e) { /* nada */ } } }
  function onProj(G, pr) { var N = ACH.nivel; if (N && typeof N.onProjectile === 'function') { try { return N.onProjectile(G, pr) === true; } catch (e) { return false; } } return false; }
  function view() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }
  function inView(G, x, y, pad) { var V = view(), c = G.cam || { x: 0, y: 0 }; return x > c.x - pad && x < c.x + V.w + pad && y > c.y - pad && y < c.y + V.h + pad; }
  function pj() { var S = ACH.sprites; return S && S.br && S.br.pj ? S.br.pj : null; }
  function canv(s) { if (Array.isArray(s)) s = s[0]; return s && s.width ? s : null; }
  function blit(g, s, x, y, flip) {
    var ax = s.ax !== undefined ? s.ax : s.width >> 1, ay = s.ay !== undefined ? s.ay : s.height - 1;
    if (!flip) { g.drawImage(s, Math.round(x - ax), Math.round(y - ay)); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.drawImage(s, -ax, -ay); g.restore();
  }
  function facing(p) { var v = (ACH.ent && ACH.ent.DIRV && ACH.ent.DIRV[p.dir]) || [1, 0]; return { x: v[0], y: v[1] }; }
  function aimOf(p) { if (p.moving && (p.mx || p.my)) { var l = Math.sqrt(p.mx * p.mx + p.my * p.my) || 1; return { x: p.mx / l, y: p.my / l }; } return facing(p); }
  function CFG() { return (ACH.ent && ACH.ent.CFG) || { hpMax: 100, staminaMax: 100 }; }
  function hpUp(p, n) { var b = p.hp; p.hp = Math.min(CFG().hpMax, p.hp + n); return Math.round(p.hp - b); }
  function heldId(p) { return p && p.held ? p.held.id : null; }
  // ¿a tiempo? En Barranco, el reloj del compás de nivel.js; si no está, el de ACH.hab (100 bpm propios). tol en s.
  function onTime(tol) {
    tol = tol > 0 ? tol : 0.12;
    try { var B = ACH.br; if (B && typeof B.onTime === 'function') return !!B.onTime(tol); } catch (e) { /* respaldo */ }
    try { var H = ACH.hab; if (H && typeof H.onBeat === 'function') return !!H.onBeat(tol); } catch (e2) { /* nada */ }
    return false;
  }
  function metro() { try { var H = ACH.hab; return H && typeof H.metro === 'function' ? H.metro() : null; } catch (e) { return null; } }

  /* ---------------- estado ---------------- */
  var shots = [], charcos = [], sparks = [], waves = [], lastWave = null, near = null, chargeF = null;
  var skid = { t: 0, vx: 0, vy: 0, said: false };
  var zPrev = typeof WeakMap === 'function' ? new WeakMap() : null;

  /* =====================================================================================
     SPRITES PROVISORIOS (manda el arte de B2c en ACH.sprites.br.pj)
     ===================================================================================== */
  var PH = {};
  function r1(g, x, y, w, h, col) { g.fillStyle = '#131015'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, w, h); }
  function phCajon() {
    if (PH.cajon) return PH.cajon;
    var c = mk(12, 13), g = c.getContext('2d');
    r1(g, 1, 1, 10, 11, '#b07a45'); g.fillStyle = '#d9a86a'; g.fillRect(1, 1, 10, 2); g.fillStyle = '#5b3a29'; g.fillRect(4, 6, 4, 4); g.fillStyle = '#131015'; g.fillRect(5, 7, 2, 2);
    c.ax = 6; c.ay = 12; PH.cajon = c; return c;
  }
  function phBotella(dor) {
    var k = 'bot' + (dor ? 'D' : ''); if (PH[k]) return PH[k];
    var c = mk(5, 11), g = c.getContext('2d'), col = dor ? '#f2c81c' : '#3a8a4a';
    g.fillStyle = '#131015'; g.fillRect(1, 0, 3, 11); g.fillRect(0, 4, 5, 7);
    g.fillStyle = col; g.fillRect(2, 1, 1, 3); g.fillRect(1, 5, 3, 5); g.fillStyle = dor ? '#fff6b0' : '#8ad89a'; g.fillRect(1, 5, 1, 3);
    c.ax = 2; c.ay = 10; PH[k] = c; return c;
  }
  function cajonSpr() { var P = pj(); return canv(P && (P.cajon && (P.cajon.big ? P.cajon : P.cajon))) || phCajon(); }
  function botellaSpr(dor) { var P = pj(), s = P && (dor ? P.botellaDorada : P.botella); return canv(s) || phBotella(dor); }
  function phCharco(dor) {
    var k = 'ch' + (dor ? 'D' : ''); if (PH[k]) return PH[k];
    var c = mk(40, 18), g = c.getContext('2d'), col = dor ? 'rgba(242,200,28,.55)' : 'rgba(150,120,60,.55)', hi = dor ? 'rgba(255,246,176,.7)' : 'rgba(230,220,180,.6)';
    g.fillStyle = col; g.beginPath(); g.ellipse(20, 9, 19, 8, 0, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(9, 6, 6, 3, 0, 0, 6.283); g.fill(); g.beginPath(); g.ellipse(31, 12, 6, 3, 0, 0, 6.283); g.fill();
    g.fillStyle = hi; g.fillRect(13, 6, 6, 1); g.fillRect(25, 10, 4, 1);
    g.fillStyle = '#e8f4f0'; [[8, 9], [17, 12], [27, 6], [33, 9], [21, 4]].forEach(function (q) { g.fillRect(q[0], q[1], 2, 1); });   // vidrios
    c.ax = 20; c.ay = 9; PH[k] = c; return c;
  }
  function charcoSpr(dor) { var P = pj(), s = P && P.charco; return (!dor && canv(s)) || phCharco(dor); }
  // íconos de la mochila (12×12 + .big 24×24): ACH.sprites.br.pj[id] (B2c) o provisorio
  var ICON_COL = { cajon: '#b07a45', botella: '#3a8a4a', botellaDorada: '#f2c81c', packBotellas: '#3a8a4a', anticucho: '#a2522f', picarones: '#c9772a',
    pescadoFrito: '#e0b060', emoliente: '#c98a3a', cuaderno: '#b8202c' };
  function ensureIcons() {
    var S = ACH.sprites = ACH.sprites || {}, IT = S.items = S.items || {}, P = pj();
    Object.keys(ICON_COL).forEach(function (id) {
      var art = P && (P[id] || (P.items && P.items[id]));
      if (Array.isArray(art)) art = art[0];
      if (canv(art)) { if (IT[id] !== art && (!IT[id] || IT[id].prov || IT[id]._br || IT[id]._cv)) { IT[id] = art; if (!art.big) art.big = art; } return; }
      if (IT[id] && IT[id].width && !IT[id]._br && id !== 'packBotellas' && id !== 'botellaDorada') return;
      if (IT[id] && IT[id]._br) return;
      var c = mk(12, 12), g = c.getContext('2d'), col = ICON_COL[id];
      if (id === 'cajon') { g.drawImage(phCajon(), 0, 0); }
      else if (id === 'botella' || id === 'botellaDorada') { g.drawImage(phBotella(id === 'botellaDorada'), 4, 1); }
      else if (id === 'packBotellas') { g.drawImage(phBotella(false), 1, 1); g.drawImage(phBotella(false), 4, 1); g.drawImage(phBotella(false), 7, 1); g.fillStyle = '#131015'; g.fillRect(0, 8, 12, 4); g.fillStyle = '#c8a060'; g.fillRect(1, 9, 10, 2); }
      else if (id === 'anticucho') { g.fillStyle = '#131015'; g.fillRect(0, 5, 12, 2); g.fillStyle = '#d8c8a0'; g.fillRect(0, 5, 12, 1); [1, 5, 9].forEach(function (x) { r1(g, x, 3, 2, 5, col); }); }
      else if (id === 'picarones') { [[2, 3], [6, 5], [3, 7]].forEach(function (q) { g.fillStyle = '#131015'; g.beginPath(); g.arc(q[0] + 2, q[1] + 2, 3, 0, 6.283); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(q[0] + 2, q[1] + 2, 2, 0, 6.283); g.fill(); }); g.fillStyle = '#5a2a10'; g.fillRect(4, 5, 4, 1); }
      else if (id === 'cuaderno') { r1(g, 2, 1, 8, 10, col); g.fillStyle = '#f2e9d0'; g.fillRect(4, 3, 5, 1); g.fillRect(4, 5, 5, 1); g.fillRect(4, 7, 3, 1); }
      else { r1(g, 2, 2, 8, 8, col); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(2, 2, 8, 2); }
      var big = mk(24, 24), bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 24, 24);
      c.big = big; c.prov = true; c._br = true; IT[id] = c;
    });
  }
  function looseProp(key, src) {   // sprite del suelto en la mano (armas.js lo busca en ACH.sprites.props)
    var S = ACH.sprites = ACH.sprites || {}, P = S.props = S.props || {};
    if (P[key] && P[key].width && !P[key]._brph) return key;
    P[key] = src; if (src.ax === undefined) { src.ax = src.width >> 1; src.ay = src.height - 1; }
    return key;
  }

  /* =====================================================================================
     ARMAS EN LA MANO (ACH.armas.define)
     ===================================================================================== */
  var CAJON = { r: 56, rT: 72, dmg: 0.5, push: 160, stun: 0.5, stunT: 1, tol: 0.12, propR: 30 };
  var CAJON_HOLD = { kind: 'cajon', dmg: 0, range: 0.01, arc: 0.01, knock: 0, cd: 1.1, cost: 4, noise: 70, dur: 0.3, frame: 0.1, hits: 15, bees: 0,
    swingSfx: 'br.cajon.alza', hitSfx: 'br.cajon' };
  var BOT_HOLD = { kind: 'botella', dmg: 0, range: 0.01, arc: 0.01, knock: 0, cd: 0.4, cost: 2, noise: 10, dur: 0.12, frame: 0.04, hits: 0, bees: 0, swingSfx: 'br.botella.tiro' };
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function defineHeld() {
    var A = ACH.armas; if (!A || typeof A.define !== 'function') return;
    if (!(A.defs.cajon && A.defs.cajon._br)) {
      var dc = A.define('cajon', { name: 'cajón', spr: looseProp('br_cajon', cajonSpr()), mode: 'hand', lift: 3, hold: copy(CAJON_HOLD),
        poses: { hold: 'brh_cajon_walk', swing: 'brh_cajon_swing' }, fly: { sp: 150, fric: 2.6, dmg: 0.5, knock: 60, slow: 0.5, pierce: 0 },
        onBreak: function (G) { var p = G.player; sfx('br.cajon.roto', { x: p.x, y: p.y }); toast('¡Se rajó el cajón, compadre! Ya no suena.'); } });
      dc._br = true;
    }
    ['botella', 'botellaDorada'].forEach(function (id) {
      if (A.defs[id] && A.defs[id]._br) return;
      var h = copy(BOT_HOLD); h.kind = id;
      var d = A.define(id, { name: id === 'botella' ? 'botella' : 'botella dorada', spr: looseProp('br_' + id, botellaSpr(id === 'botellaDorada')), mode: 'hand', lift: 6, hold: h,
        fly: { sp: 140, fric: 3, dmg: 0, knock: 0, slow: 1, pierce: 0 } });
      d._br = true;
    });
  }
  // Alexander con el cajón (B2c): ACH.sprites.br.pj.alex.cajon = { carga: {dir:[4]}, golpe: [3] o {dir:[3]} } (o por variante bird/nobird)
  function aliasPoses() {
    var S = ACH.sprites, P = pj(), AL = S && S.alex, src0 = P && P.alex && P.alex.cajon; if (!src0 || !AL) return;
    ['bird', 'nobird'].forEach(function (v) {
      var src = src0[v] || src0; if (!AL[v] || !src) return;
      if (src.carga) AL[v].brh_cajon_walk = src.carga;
      var gl = src.golpe;
      if (Array.isArray(gl)) gl = { down: gl, up: gl, left: gl, right: gl };
      if (gl) AL[v].brh_cajon_swing = gl;
    });
  }
  function wrapPoseFrame() {
    var A = ACH.armas; if (!A || typeof A.poseFrame !== 'function' || A.poseFrame._br) return;
    var orig = A.poseFrame;
    A.poseFrame = function (p) {
      p = p || (ACH.G && ACH.G.player);
      var ps = A.pose ? A.pose(p) : null;
      if (p && ps === 'brh_cajon_walk') return p.moving ? ((Math.floor(p.animT) % 4) + 4) % 4 : 0;
      return orig.apply(this, arguments);
    };
    A.poseFrame._br = true;
  }
  function equipHeld(id) {
    var A = ACH.armas, G = ACH.G; if (!A || !G || !A.defs[id]) return false;
    if (id === 'cajon') { try { aliasPoses(); } catch (e) { /* sin pose: se ve el cajón suelto en la mano */ } }
    if (typeof A.equip === 'function') { try { return A.equip(id) !== false; } catch (e2) { return false; } }
    return false;
  }
  function stowHeld() {
    var A = ACH.armas, G = ACH.G, p = G && G.player; if (!p || !p.held) return null;
    if (A && typeof A.stow === 'function') { try { return A.stow(); } catch (e) { /* nada */ } }
    return null;
  }

  /* =====================================================================================
     OBJETOS (ACH.inv.defs)
     ===================================================================================== */
  function useCajon(id, p) {
    if (heldId(p) === 'cajon') { toast('Ya tienes el cajón en la mano · ESPACIO tocar (a tiempo suena más)'); return false; }
    if (!take('cajon')) return false;
    if (!equipHeld('cajon')) { addItem('cajon', 1); toast('No se pudo agarrar el cajón, compadre.'); return false; }
    sfx('grab', { x: p.x, y: p.y });
    toast('Cajón en la mano · ESPACIO = onda que empuja · ¡A TIEMPO suena más fuerte!');
    return true;
  }
  function useBotella(id, p) {
    if (heldId(p) === id) { toast('Ya la tienes en la mano · ESPACIO tirar · mantén F para tirar lejos'); return false; }
    if (!take(id)) return false;
    if (!equipHeld(id)) { addItem(id, 1); return false; }
    sfx('grab', { x: p.x, y: p.y });
    toast((id === 'botellaDorada' ? 'Botella dorada' : 'Botella') + ' en la mano · ESPACIO tirar · mantén F y suelta para tirar lejos');
    return true;
  }
  function usePack(id, p) {
    var I = inv(); if (!I) return false;
    if (!take('packBotellas')) return false;
    var left = I.add('botella', 3);
    if (left > 0) { if (left < 3) I.take('botella', 3 - left); I.add('packBotellas', 1); toast('No te entran tres botellas más en la mochila, compadre.'); return false; }
    sfx('grab', { x: p.x, y: p.y }); toast('+3 botellas de bar · USAR = a la mano');
    return true;
  }
  function eat(id, p, n, extra) {
    if (p.hp >= CFG().hpMax && !extra) { toast('Estás sano, compadre. Guárdalo pa\' la jarana.'); return false; }
    if (!take(id)) return false;
    sfx('item.eat', { x: p.x, y: p.y });
    var got = hpUp(p, n), msg = '+' + got + ' vida';
    if (extra) { var e = extra(p); if (e) msg += ' · ' + e; }
    toast(msg);
    return true;
  }
  function usePicarones(id, p) {
    return eat(id, p, 20, function () { try { if (ACH.hab && typeof ACH.hab.addSabor === 'function') { ACH.hab.addSabor(15); return '+15 sabor · ¡con su miel!'; } } catch (e) { /* nada */ } return '¡con su miel!'; });
  }
  function cureSlow(p) {
    var had = (p.brSlowT > 0) || (p.slowT > 0) || (p.lentoT > 0);
    p.brSlowT = 0; p.slowT = 0; p.lentoT = 0; p.brSlowMul = 1;
    try { var Z = BR.zombis; if (Z && typeof Z.curarLento === 'function') { if (Z.curarLento(p)) had = true; } } catch (e) { /* nada */ }
    return had;
  }
  function useEmoliente(id, p) {
    var slow = (p.brSlowT > 0) || (p.slowT > 0) || (p.lentoT > 0), C = CFG();
    if (p.hp >= C.hpMax && !slow && p.stamina >= C.staminaMax - 0.5) { toast('Estás al cien, compadre. Guárdalo.'); return false; }
    return eat(id, p, 15, function (q) { q.stamina = C.staminaMax; q.exhausted = false; return cureSlow(q) ? 'aliento lleno · ¡se te quitó lo lento!' : 'aliento lleno'; });
  }
  var ITEMS = {
    cajon: { name: 'CAJÓN PERUANO', unit: 'cajón', plural: 'cajones', stack: 2, fx: 'EN LA MANO · ONDA QUE EMPUJA', tint: '#b07a45',
      desc: 'Madera que suena. ESPACIO lo golpea: una onda que empuja y aturde a los muertos de alrededor. Golpéalo A TIEMPO y suena más fuerte.', use: { fn: useCajon } },
    botella: { name: 'BOTELLA DE BAR', unit: 'botella', plural: 'botellas', stack: 8, fx: 'SE TIRA · CHARCO QUE RESBALA', tint: '#3a8a4a',
      desc: 'Vacía y bien barranquina. Se tira: se rompe, hace daño y deja un charco donde los muertos resbalan. También sirve para el molotov.', use: { fn: useBotella } },
    botellaDorada: { name: 'BOTELLA DORADA', unit: 'botella dorada', plural: 'botellas doradas', stack: 4, fx: 'SE TIRA · DAÑO ×2', tint: '#f2c81c', rare: true,
      desc: 'La del estante de arriba, la que nadie destapa. Pega el doble y deja su charquito.', use: { fn: useBotella } },
    packBotellas: { name: 'PACK DE 3 BOTELLAS', unit: 'pack de botellas', plural: 'packs de botellas', stack: 3, fx: '+3 BOTELLAS', tint: '#3a8a4a',
      desc: 'Tres botellas en su jaba. Pa\' la jarana o pa\' los muertos.', use: { fn: usePack } },
    anticucho: { name: 'ANTICUCHO', unit: 'anticucho', plural: 'anticuchos', stack: 5, fx: '+30 VIDA', tint: '#a2522f',
      desc: 'Corazón a la parrilla con su papita y su choclo, de la carretilla de la esquina del puente.', use: { hp: 30 } },
    picarones: { name: 'PICARONES', unit: 'picarón', plural: 'picarones', stack: 8, fx: '+20 VIDA · +15 SABOR', tint: '#c9772a',
      desc: 'Calientitos, con miel de chancaca. Te dejan con sabor pa\' cantar.', use: { fn: usePicarones } },
    pescadoFrito: { name: 'PESCADO FRITO', unit: 'pescado frito', plural: 'pescados fritos', stack: 3, fx: '+40 VIDA', tint: '#e0b060',
      desc: 'Del mar de enfrente, con su yuquita y su sarza. Plato de pescador.', use: { hp: 40 } },
    emoliente: { name: 'EMOLIENTE', unit: 'emoliente', plural: 'emolientes', stack: 4, fx: '+15 VIDA · CURA LO LENTO', tint: '#c98a3a',
      desc: 'Calientito, con linaza y limón. Aliento lleno y se te quita lo lento de los versos del poeta.', use: { fn: useEmoliente } },
    cuaderno: { name: 'CUADERNO DE POEMAS', unit: 'cuaderno', plural: 'cuadernos', stack: 1, fx: 'OBJETO DE HISTORIA', tint: '#b8202c', rare: true,
      desc: 'Tapa roja, versos a mano y alguna mancha de vino. Es de Lucía, la poeta del mirador.', msg: 'Es de Lucía, la poeta. Llévaselo al mirador (E).' }
  };
  function registerItems() {
    var I = inv(), D = I && I.defs; if (!D) return;
    for (var id in ITEMS) {
      var d = {}; for (var k in ITEMS[id]) d[k] = ITEMS[id][k];
      if (id === 'botella' && D.botella && !D.botella._br) { d.recipe = D.botella.recipe; }   // lo que traiga la botella del molotov se conserva
      d._br = true; D[id] = d;
    }
    ensureIcons();
  }

  /* =====================================================================================
     TIENDAS (ACH.VENDEDORES_DATA) — los vendedores son sobrevivientes: las abre vecinos.js
     ===================================================================================== */
  var NOPLATA = 'Fiado no hay, compadre, que la jarana se paga.';
  var VDATA = {
    tomas: { name: 'DON TOMÁS', titulo: 'LA CANASTA DE DON TOMÁS', nivel: 'barranco', frase: 'Pescadito del día, joven. Bueno, del día que se pudo.',
      stock: [{ id: 'pescadoFrito', precio: 4 }, { id: 'emoliente', precio: 2 }, { id: 'botella', precio: 1 }] },
    rosa_br: { name: 'DOÑA ROSA', titulo: 'ANTICUCHOS DOÑA ROSA', nivel: 'barranco', frase: 'Caserito, anticucho bien jugosito, picarón con su miel.',
      stock: [{ id: 'anticucho', precio: 3 }, { id: 'picarones', precio: 3 }, { id: 'chicha', precio: 2 }] },
    lucho: { name: 'LUCHO', titulo: 'LA BARRA DE LUCHO', nivel: 'barranco', frase: '¿Qué te sirvo, compadre? Aquí la barra nunca cierra.',
      stock: [{ id: 'botella', precio: 1 }, { id: 'packBotellas', precio: 3 }, { id: 'botellaDorada', precio: 5 }, { id: 'cajon', precio: 8 }, { id: 'gaseosa', precio: 2 }, { id: 'cuerdas', precio: 2 }] },
    celedonio: { name: 'DON CELEDONIO', titulo: 'EL ZAGUÁN DE DON CELEDONIO', nivel: 'barranco', frase: 'Cuerdas y cajón, compadre: lo que necesita un criollo.',
      stock: [{ id: 'cuerdas', precio: 2 }, { id: 'cajon', precio: 7 }, { id: 'emoliente', precio: 2 }] }
  };
  function registerVendors() {
    var VD = ACH.VENDEDORES_DATA = ACH.VENDEDORES_DATA || {};
    for (var id in VDATA) if (!VD[id] || VD[id]._br) { var d = JSON.parse(JSON.stringify(VDATA[id])); d._br = true; VD[id] = d; }
  }
  var msgObs = null;
  function watchNoMoney() {
    if (msgObs || typeof MutationObserver !== 'function') return;
    var el = document.querySelector('#tienda .tienda-msg'); if (!el) return;
    msgObs = new MutationObserver(function () {
      var Ti = ACH.tienda, v = Ti && Ti.vendor ? Ti.vendor() : null;
      if (v && VDATA[v] && /alcanza/i.test(el.textContent) && el.textContent !== NOPLATA) el.textContent = NOPLATA;
    });
    msgObs.observe(el, { childList: true, characterData: true, subtree: true });
  }
  function openShop(id, at) {
    var Ti = ACH.tienda; if (!Ti || typeof Ti.open !== 'function') return false;
    registerVendors();
    var ok = false; try { ok = Ti.open(id, at || null); } catch (e) { ok = false; }
    if (ok) watchNoMoney();
    return ok;
  }

  /* =====================================================================================
     CAJÓN: la onda
     ===================================================================================== */
  function cajonWave(G) {
    var p = G.player; if (!p) return;
    var M = metro(), tol = Math.max(CAJON.tol, M && M.on ? M.tol : 0), atT = onTime(tol);
    var r = atT ? CAJON.rT : CAJON.r, stun = atT ? CAJON.stunT : CAJON.stun, dmg = CAJON.dmg * (atT && M && M.on ? M.mul : 1), n = 0;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (!alive(z)) continue;
      var dx = z.x - p.x, dy = (z.y - p.y) * 1.25, d = Math.sqrt(dx * dx + dy * dy); if (d > r) continue;
      var nx = d > 0.5 ? (z.x - p.x) / d : facing(p).x, ny = d > 0.5 ? (z.y - p.y) / d : facing(p).y;
      var killed = hitZ(G, z, nx, ny, { from: { x: p.x, y: p.y }, dmg: dmg, knock: CAJON.push, src: 'cajon' });
      if (killed === undefined) continue;
      fxHit(G, z, nx, ny, killed, n === 0); n++;
      if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type });
      else { z.stunT = Math.max(z.stunT || 0, stun); z.state = 'golpeado'; z.lungeT = 0; }
    }
    // props livianos pegados a Alexander
    try { var In = ACH.inter; if (In && typeof In.hitProps === 'function') In.hitProps(G, p.x, p.y, CAJON.propR, 1, 'swing'); } catch (e) { /* nada */ }
    // el jefe y los demás sistemas reciben la onda como área
    onProj(G, { x: p.x, y: p.y, z: 0, r: r, dmg: dmg, kind: 'cajon', area: true, stun: stun, onTime: atT, bees: dmg });
    noise(G, p.x, p.y, atT ? 160 : 120);
    waves.push({ x: p.x, y: p.y, t: 0, dur: atT ? 0.5 : 0.4, r: r, gold: atT }); if (waves.length > 6) waves.shift();
    lastWave = { t: G.clock || 0, x: p.x, y: p.y, r: r, onTime: atT, n: n };
    sfx('br.cajon', { x: p.x, y: p.y, atiempo: atT, n: n });
    if (atT) {
      ftext(p.x, p.y - 34, '¡A TIEMPO!', '#ffd24a');
      sfx('hab.contrapunto.atiempo', { x: p.x, y: p.y });
      if (M && M.on && ACH.hab && typeof ACH.hab.addSabor === 'function') { try { ACH.hab.addSabor(4); } catch (e2) { /* nada */ } }
    }
    try { if (ACH.fx && ACH.fx.shake && atT) ACH.fx.shake(G, 2, 0.15); } catch (e3) { /* nada */ }
    // se gasta: 15 golpes × durMul (armas.js no lo gasta porque el golpe propio no «conecta»)
    var h = p.held;
    if (h && h.id === 'cajon') {
      h.dur = (h.dur === undefined ? 30 : h.dur) - 1;
      if (h.L && h.L.dur !== undefined) h.L.dur = h.dur;
      if (h.dur <= 0) { stowHeld(); sfx('br.cajon.roto', { x: p.x, y: p.y }); toast('¡Se rajó el cajón, compadre! Ya no suena.'); }
      else if (h.dur === 3) toast('El cajón ya está rajado, compadre: le quedan 3 golpes.');
    }
  }

  /* =====================================================================================
     BOTELLAS: tiro, rotura y charcos
     ===================================================================================== */
  var BOT = { g: 420, vz: 110, z0: 14, r0: 50, r1: 150, dmg: 1, dmgD: 2, charcoR: 20, charcoT: 4, slipT: 0.4, fallT: 1, slipCD: 2.2 };
  var mouseSeen = { x: null, y: null, t: -1e9 };
  function trackMouse() { var m = ACH.input && ACH.input.mouse; if (!m) return; if (m.x !== mouseSeen.x || m.y !== mouseSeen.y) { if (mouseSeen.x !== null) mouseSeen.t = Date.now(); mouseSeen.x = m.x; mouseSeen.y = m.y; } }
  function mouseRecent() { return Date.now() - mouseSeen.t < 2000; }
  function throwBottle(G, c) {
    var p = G.player, id = heldId(p); if (id !== 'botella' && id !== 'botellaDorada') return false;
    var a = aimOf(p), m = ACH.input && ACH.input.mouse, R = BOT.r0 + (BOT.r1 - BOT.r0) * c;
    if (m && !(ACH.touch && ACH.touch.on) && m.wx !== undefined && mouseRecent()) { var dx = m.wx - p.x, dy = m.wy - p.y, l = Math.sqrt(dx * dx + dy * dy); if (l > 6) { a = { x: dx / l, y: dy / l }; R = Math.min(R, Math.max(30, l)); } }
    stowHeld();
    var Tf = (BOT.vz + Math.sqrt(BOT.vz * BOT.vz + 2 * BOT.g * BOT.z0)) / BOT.g, sp = R / Tf;
    shots.push({ id: id, dor: id === 'botellaDorada', x: p.x + a.x * 4, y: p.y + a.y * 3, z: BOT.z0, vx: a.x * sp, vy: a.y * sp, vz: BOT.vz, t: 0 });
    p.throwT = 0.2; p.lastThrow = id;
    if (ACH.ent && ACH.ent.dirFromVec) { try { p.dir = ACH.ent.dirFromVec(a.x, a.y); } catch (e) { /* nada */ } }
    sfx('br.botella.tiro', { x: p.x, y: p.y, charge: c, dorada: id === 'botellaDorada' });
    if (count(id) > 0 && take(id)) { if (!equipHeld(id)) addItem(id, 1); }   // la pila: la siguiente a la mano
    return true;
  }
  function glassBurst(x, y, dor) {
    for (var i = 0; i < 12; i++) { var a = Math.random() * 6.283, v = rnd(25, 80); sparks.push({ x: x, y: y - 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 10, t: 0, life: rnd(0.35, 0.6), col: i % 3 ? (dor ? '#f2c81c' : '#8ad89a') : '#e8f4f0' }); }
    if (sparks.length > 80) sparks.splice(0, sparks.length - 80);
  }
  function breakBottle(G, s, hitZombie) {
    var dmg = s.dor ? BOT.dmgD : BOT.dmg, bossHit = false;
    // el jefe (o lo que se registre) primero: recibe la botella y el charco
    if (onProj(G, { x: s.x, y: s.y, z: Math.max(0, s.z), r: 10, dmg: dmg, kind: 'botella', dorada: s.dor, bees: dmg, charco: { x: s.x, y: s.y, r: BOT.charcoR, life: BOT.charcoT } })) bossHit = true;
    if (!bossHit) {
      var z = hitZombie, bd = 12;
      if (!z) for (var k = 0; k < G.zombies.length; k++) { var q = G.zombies[k]; if (!alive(q)) continue; var d = dist(q.x, q.y, s.x, s.y); if (d < bd) { bd = d; z = q; } }
      if (z && alive(z)) {
        var ux = z.x - s.x, uy = z.y - s.y, l = Math.sqrt(ux * ux + uy * uy) || 1;
        if (l < 0.5) { ux = s.vx; uy = s.vy; l = Math.sqrt(ux * ux + uy * uy) || 1; }
        var killed = hitZ(G, z, ux / l, uy / l, { from: { x: s.x - ux / l * 6, y: s.y - uy / l * 6 }, dmg: dmg, knock: 30, src: 'botella' });
        if (killed !== undefined) { fxHit(G, z, ux / l, uy / l, killed, true); if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type }); ftext(z.x, z.y - 30, s.dor ? '¡CLINK DORADO!' : '¡CRASH!', s.dor ? '#ffd24a' : '#e8f4f0'); }
      }
    }
    glassBurst(s.x, s.y, s.dor);
    var q2 = { x: s.x, y: s.y, r: BOT.charcoR, t: 0, life: BOT.charcoT, dor: s.dor };
    if (!solidAt(s.x, s.y, 2)) { charcos.push(q2); if (charcos.length > 10) charcos.shift(); }
    sfx('br.botella.rompe', { x: s.x, y: s.y, dorada: s.dor });
    noise(G, s.x, s.y, 90);
  }
  function updateShots(G, dt) {
    for (var i = shots.length - 1; i >= 0; i--) {
      var s = shots[i]; s.t += dt;
      s.vz -= BOT.g * dt; s.z += s.vz * dt;
      var nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (solidAt(nx, ny, 2) && s.z < 16) { breakBottle(G, s, null); shots.splice(i, 1); continue; }
      s.x = nx; s.y = ny;
      var zHit = null;
      if (s.z < 16) for (var k = 0; k < G.zombies.length; k++) { var z = G.zombies[k]; if (alive(z) && dist(z.x, z.y - 4, s.x, s.y) < 9) { zHit = z; break; } }
      if (!zHit && s.z < 22 && s.z > 2 && onProjPeek(G, s)) { shots.splice(i, 1); continue; }
      if (s.z <= 0 || zHit) { breakBottle(G, s, zHit); shots.splice(i, 1); }
    }
  }
  // en vuelo: si el jefe (u otro sistema) dice que la tocó, se rompe ahí mismo
  function onProjPeek(G, s) {
    var dmg = s.dor ? BOT.dmgD : BOT.dmg;
    if (!onProj(G, { x: s.x, y: s.y, z: s.z, r: 6, dmg: dmg, kind: 'botella', dorada: s.dor, bees: dmg, flying: true, charco: { x: s.x, y: s.y, r: BOT.charcoR, life: BOT.charcoT } })) return false;
    glassBurst(s.x, s.y, s.dor);
    if (!solidAt(s.x, s.y, 2)) { charcos.push({ x: s.x, y: s.y, r: BOT.charcoR, t: 0, life: BOT.charcoT, dor: s.dor }); if (charcos.length > 10) charcos.shift(); }
    sfx('br.botella.rompe', { x: s.x, y: s.y, dorada: s.dor });
    return true;
  }
  function inCharco(q, x, y) { var dx = x - q.x, dy = (y - q.y) * 2; return dx * dx + dy * dy <= q.r * q.r; }
  function updateCharcos(G, dt) {
    var i, k;
    for (i = charcos.length - 1; i >= 0; i--) { charcos[i].t += dt; if (charcos[i].t >= charcos[i].life) charcos.splice(i, 1); }
    for (k = 0; k < G.zombies.length; k++) {
      var z = G.zombies[k], pv = zPrev ? zPrev.get(z) : z._brPrev;
      if (z.brSlipCD > 0) z.brSlipCD -= dt;
      if (z.brSlipT > 0) z.brSlipT -= dt;
      if (z.brFallT > 0) z.brFallT -= dt;
      if (alive(z) && !(z.brSlipCD > 0) && charcos.length) {
        for (i = 0; i < charcos.length; i++) {
          if (!inCharco(charcos[i], z.x, z.y)) continue;
          var vx = pv ? (z.x - pv.x) / Math.max(dt, 1e-3) : 0, vy = pv ? (z.y - pv.y) / Math.max(dt, 1e-3) : 0, sp = Math.sqrt(vx * vx + vy * vy);
          if (sp < 20) { var P = G.player, ddx = P ? P.x - z.x : 1, ddy = P ? P.y - z.y : 0, dl = Math.sqrt(ddx * ddx + ddy * ddy) || 1; vx = ddx / dl * 50; vy = ddy / dl * 50; sp = 50; }
          var m = Math.min(1, 90 / sp);
          z.kbx = vx * m * 1.4; z.kby = vy * m * 1.4;
          z.state = 'golpeado'; z.stunT = Math.max(z.stunT || 0, BOT.slipT + BOT.fallT); z.lungeT = 0; if (z.atkCD < 0.5) z.atkCD = 0.5;
          z.brSlipT = BOT.slipT; z.brFallT = BOT.slipT + BOT.fallT; z.brSlipCD = BOT.slipCD;
          ftext(z.x, z.y - 28, '¡PLAF!', '#e8f4f0');
          sfx('br.resbalon', { x: z.x, y: z.y });
          break;
        }
      }
      var rec = { x: z.x, y: z.y }; if (zPrev) zPrev.set(z, rec); else z._brPrev = rec;
    }
    // Alexander: si corre encima, patina un poquito (sin caer ni dañarse)
    var p = G.player;
    if (p && p.hp > 0) {
      if (skid.t > 0) {
        skid.t -= dt;
        var sx = p.x + skid.vx * dt, sy = p.y + skid.vy * dt;
        if (!solidAt(sx, p.y, 4)) p.x = sx;
        if (!solidAt(p.x, sy, 4)) p.y = sy;
        skid.vx *= Math.exp(-4 * dt); skid.vy *= Math.exp(-4 * dt);
      } else if (p.running && p.moving && (p.mx || p.my)) {
        for (i = 0; i < charcos.length; i++) if (inCharco(charcos[i], p.x, p.y)) {
          var l = Math.sqrt(p.mx * p.mx + p.my * p.my) || 1; skid.t = 0.35; skid.vx = p.mx / l * 55; skid.vy = p.my / l * 55;
          sfx('br.resbalon', { x: p.x, y: p.y, alex: true });
          if (!skid.said) { skid.said = true; say('¡Uy, uy! ¡Resbala, causa!', p.x, p.y); toast('¡Uy, resbala! No corras encima del charco.'); }
          break;
        }
      }
    }
    for (i = sparks.length - 1; i >= 0; i--) { var q = sparks[i]; q.t += dt; if (q.t > q.life) { sparks.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy = q.vy * 0.9 + 60 * dt; }
    for (i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t >= waves[i].dur) waves.splice(i, 1); }
  }

  /* =====================================================================================
     CAJAS DE CERVEZA (props del mundo): sueltan 1–3 botellas al romperse
     ===================================================================================== */
  function propHook(G, pr, info) {
    if (!pr || !/^cajaCervezas/.test(String(pr.k || '')) || pr.brLoot) return false;
    if (info && info.known && !info.broke && !pr.broken) return false;   // tiene ficha en interaccion.js: espera a que se rompa
    if (!(info && info.known)) { pr.brHp = (pr.brHp === undefined ? 1 : pr.brHp) - ((info && info.dmg) || 1); if (pr.brHp > 0) { glassBurst(pr.x, pr.y - 4, false); sfx('prop.hit.glass', { x: pr.x, y: pr.y }); return true; } }
    pr.broken = true; pr.brLoot = true; pr.solid = false;
    var n = 1 + Math.floor(Math.random() * 3);
    try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(pr.x, pr.y + 6, [{ id: 'botella', n: n }], false); else addItem('botella', n); } catch (e) { addItem('botella', n); }
    glassBurst(pr.x, pr.y - 4, false);
    sfx('br.caja.rompe', { x: pr.x, y: pr.y }); sfx('prop.hit.glass', { x: pr.x, y: pr.y });
    ftext(pr.x, pr.y - 20, '+' + n + ' BOTELLA' + (n > 1 ? 'S' : ''), '#8ad89a');
    return true;
  }
  var hookedProps = false;
  function hookProps() { if (hookedProps) return; var H = ACH.propHooks = Array.isArray(ACH.propHooks) ? ACH.propHooks : []; H.push(propHook); hookedProps = true; }

  /* =====================================================================================
     F y E: envolver ACH.armas.update (como juguetes.js). F con botella = tiro cargado.
     ===================================================================================== */
  function mask(In, codes, fn) {
    var op = In.pressed;
    In.pressed = function (c) { return codes.indexOf(c) >= 0 ? false : op.apply(this, arguments); };
    try { return fn(); } finally { In.pressed = op; }
  }
  function isBottle(id) { return id === 'botella' || id === 'botellaDorada'; }
  function wrapArmas() {
    var A = ACH.armas; if (!A || typeof A.update !== 'function' || A.update._br) return;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input, self = this, args = arguments, masked = [];
      try {
        if (G && G.state === 'playing' && G.player && G.player.hp > 0 && In && typeof In.pressed === 'function') {
          var p = G.player; trackMouse();
          if (chargeF) {
            masked.push('KeyF');
            if (In.down('KeyF')) chargeF.c = Math.min(1, chargeF.c + dt / 0.8);
            else { var cf = chargeF; chargeF = null; if (isBottle(heldId(p))) throwBottle(G, cf.c); }
          } else if (In.pressed('KeyF') && !(p.z > 0) && isBottle(heldId(p))) { chargeF = { c: 0 }; masked.push('KeyF'); }
        } else chargeF = null;
      } catch (e) { if (!wrapArmas.warned) { wrapArmas.warned = true; console.warn('[ACHORADO br] objetos F', e); } }
      if (masked.length) return mask(In, masked, function () { return origU.apply(self, args); });
      return origU.apply(this, arguments);
    };
    A.update._br = true;
    if (typeof origC === 'function') {
      A.context = function () {
        var G = ACH.G, p = G && G.player;
        if (p && isBottle(heldId(p))) return { label: 'TIRAR', code: 'KeyF' };
        return origC.apply(this, arguments);
      };
      A.context._br = true;
    }
  }

  /* =====================================================================================
     DIBUJO
     ===================================================================================== */
  function drawTop(g, G, cx, cy) {
    var i;
    for (i = 0; i < charcos.length; i++) {
      var q = charcos[i]; if (!inView(G, q.x, q.y, 30)) continue;
      g.globalAlpha = q.t > q.life - 1 ? Math.max(0, q.life - q.t) : 1; blit(g, charcoSpr(q.dor), q.x - cx, q.y - cy + 1);
    }
    g.globalAlpha = 1;
    for (i = 0; i < waves.length; i++) {   // ondas del cajón (anillos que se abren; dorados si fue a tiempo)
      var w = waves[i], u = w.t / w.dur, rr = 6 + (w.r - 6) * (1 - (1 - u) * (1 - u));
      g.globalAlpha = Math.max(0, 1 - u); g.lineWidth = w.gold ? 2 : 1; g.strokeStyle = w.gold ? '#ffd24a' : '#f3e2c0';
      g.beginPath(); g.ellipse(Math.round(w.x - cx), Math.round(w.y - cy - 2), rr, rr * 0.62, 0, 0, 6.283); g.stroke();
      g.globalAlpha *= 0.55; g.strokeStyle = w.gold ? '#fff6b0' : '#b07a45';
      g.beginPath(); g.ellipse(Math.round(w.x - cx), Math.round(w.y - cy - 2), rr * 0.75, rr * 0.47, 0, 0, 6.283); g.stroke();
    }
    g.globalAlpha = 1; g.lineWidth = 1;
    for (i = 0; i < shots.length; i++) {
      var s = shots[i], x = s.x - cx, y = s.y - cy;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(Math.round(x - 2), Math.round(y), 5, 2);
      var sp = botellaSpr(s.dor);
      g.save(); g.translate(Math.round(x), Math.round(y - s.z)); g.rotate(s.t * 14); g.drawImage(sp, -(sp.ax || 2), -((sp.ay || 10) >> 1)); g.restore();
    }
    for (i = 0; i < sparks.length; i++) { var k = sparks[i]; g.fillStyle = k.col; g.fillRect(Math.round(k.x - cx), Math.round(k.y - cy), 1, 1); }
    // los que resbalaron: estrellitas mientras están en el piso
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (!(z.brFallT > 0) || z.state === 'muerto') continue;
      if (!inView(G, z.x, z.y, 20)) continue;
      var zx = Math.round(z.x - cx), zy = Math.round(z.y - cy) - 26, ph = (G.clock || 0) * 6;
      g.fillStyle = '#ffe500'; g.fillRect(zx - 5 + Math.round(Math.cos(ph) * 4), zy + Math.round(Math.sin(ph) * 2), 2, 2);
      g.fillStyle = '#ffffff'; g.fillRect(zx + 3 + Math.round(Math.cos(ph + 3) * 4), zy + Math.round(Math.sin(ph + 3) * 2), 2, 2);
    }
    // carga del tiro de botella
    if (chargeF && G.player) {
      var p = G.player, bx = Math.round(p.x - cx) - 10, by = Math.round(p.y - cy) - 40;
      g.fillStyle = '#131015'; g.fillRect(bx - 1, by - 1, 22, 4); g.fillStyle = '#8ad89a'; g.fillRect(bx, by, Math.round(20 * chargeF.c), 2);
    }
  }

  /* =====================================================================================
     SISTEMA
     ===================================================================================== */
  function continuing() { try { var P = ACH.partida; return !!(P && P.continuando && P.continuando()); } catch (e) { return false; } }
  function place(n) {
    var P = W().places, q = P && P[n]; if (!q) return null;
    if (Array.isArray(q)) return { x: +q[0], y: +q[1] };
    if (q.x !== undefined) return { x: +q.x, y: +q.y };
    if (q.c !== undefined) return { x: (+q.c + 0.5) * T, y: (+q.r + 0.5) * T };
    return null;
  }
  function freeNear(x, y, r) {
    if (!solidAt(x, y, r || 4)) return { x: x, y: y };
    for (var d = 4; d <= 80; d += 4) for (var a = 0; a < 12; a++) { var nx = x + Math.cos(a / 12 * 6.283) * d, ny = y + Math.sin(a / 12 * 6.283) * d; if (!solidAt(nx, ny, r || 4)) return { x: nx, y: ny }; }
    return { x: x, y: y };
  }
  function setupLevel(G) {
    registerItems(); defineHeld(); wrapPoseFrame(); wrapArmas(); registerVendors(); hookProps();
    try { aliasPoses(); } catch (e) { /* nada */ }
    shots.length = 0; charcos.length = 0; sparks.length = 0; waves.length = 0; chargeF = null; skid.t = 0; lastWave = null;
    // el cajón del músico zombie de la playa (una vez por visita: al CONTINUAR, si ya lo recogió, no vuelve)
    var flagOn = false; try { flagOn = !!(ACH.partida && ACH.partida.flag && ACH.partida.flag('barranco.cajonPlaya')); } catch (e2) { flagOn = false; }
    if (!(continuing() && flagOn)) {
      var pl = place('playa') || place('orilla');
      if (pl && ACH.inv && ACH.inv.drop) { var q = freeNear(pl.x + 4 * T, pl.y + T, 4); try { ACH.inv.drop(q.x, q.y, [{ id: 'cajon', n: 1 }], false); } catch (e3) { /* nada */ } }
      try { if (ACH.partida && ACH.partida.flag) ACH.partida.flag('barranco.cajonPlaya', true); } catch (e4) { /* nada */ }
    }
  }
  BR.register({
    name: 'objetos',
    reset: function (G) { try { setupLevel(G); } catch (e) { console.warn('[ACHORADO br] objetos.reset', e); } },
    onRespawn: function () { shots.length = 0; chargeF = null; skid.t = 0; },
    update: function (G, dt) { updateShots(G, dt); updateCharcos(G, dt); },
    onSwing: function (G, sw) {
      if (!sw) return 0;
      if (sw.kind === 'held:cajon') { cajonWave(G); return 0; }
      if (sw.kind === 'held:botella' || sw.kind === 'held:botellaDorada') { throwBottle(G, 0.3); return 0; }
      return 0;
    },
    speedMul: function () { return skid.t > 0 ? 0.85 : 1; },
    drawTop: drawTop
  });
  // por si ACH.inv / armas.js ya están: también al cargar (en reset se repite)
  try { registerItems(); registerVendors(); } catch (e) { /* se reintenta en reset */ }

  /* ---------------- API pública ---------------- */
  BR.objetos = {
    charcos: function () { return charcos.map(function (q) { return { x: Math.round(q.x), y: Math.round(q.y), r: q.r, t: +q.t.toFixed(2), life: q.life, dorada: !!q.dor }; }); },
    inCharco: function (x, y) { for (var i = 0; i < charcos.length; i++) if (inCharco(charcos[i], x, y)) return charcos[i]; return null; },
    shots: function () { return shots.map(function (s) { return { id: s.id, x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z) }; }); },
    lastWave: function () { return lastWave; },
    openShop: openShop, onTime: onTime, VDATA: VDATA, ITEMS: ITEMS, NOPLATA: NOPLATA, CAJON: CAJON, BOT: BOT
  };

  /* ---------------- Debug: ACH.debug.br.obj ---------------- */
  var DB = ACH.debug = ACH.debug || {}, DBR = DB.br = DB.br || {};
  function G0() { return ACH.G; }
  DBR.obj = {
    give: function () { ['cajon', 'botella', 'botellaDorada', 'packBotellas', 'anticucho', 'picarones', 'pescadoFrito', 'emoliente'].forEach(function (k) { addItem(k, 2); }); addItem('sencillo', 30); return 'ok'; },
    equip: function (id) { var G = G0(); if (!G) return false; id = id || 'cajon'; addItem(id, 1); var d = inv().defs[id]; return d && d.use && d.use.fn ? d.use.fn(id, G.player, G) : false; },
    wave: function () { var G = G0(); if (heldId(G.player) !== 'cajon') DBR.obj.equip('cajon'); cajonWave(G); return lastWave; },
    throwBottle: function (c, dor) { var G = G0(), id = dor ? 'botellaDorada' : 'botella'; if (heldId(G.player) !== id) DBR.obj.equip(id); throwBottle(G, c === undefined ? 0.5 : c); return shots.length; },
    charco: function (x, y) { var G = G0(), p = G && G.player; charcos.push({ x: x !== undefined ? x : p.x + 30, y: y !== undefined ? y : p.y, r: BOT.charcoR, t: 0, life: BOT.charcoT, dor: false }); return BR.objetos.charcos(); },
    shop: function (id) { return openShop(id || 'lucho'); },
    state: function () { var G = G0(), p = G && G.player; return { held: p && p.held ? { id: p.held.id, dur: p.held.dur } : null, shots: shots.length, charcos: charcos.length, waves: waves.length, lastWave: lastWave, charge: chargeF ? +chargeF.c.toFixed(2) : null, skid: +skid.t.toFixed(2), onTime: onTime(0.12) }; }
  };
})();
