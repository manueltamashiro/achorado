/* ACHORADO — js/costaverde/dron.js (v0.13 T2, agente CV · E1): «el turista del dron», mini-jefe de media ruta (Intihuatana → Letonia).
   - Al cruzar la col ~206 del malecón sale el turista (cv_dronero, vida 12) con su dron. Diálogo corto (Alexander con retrato).
   - Cada ~4 s alterna: MARCA (el dron se pone encima de Alexander y dispara el flash: 5 s marcado, los zombis a 200 px van por él y cae
     un parapentista encima) y LLAMADO (silbato: caen 2 parapentistas alrededor). Máx. 4 parapentistas suyos vivos.
   - Al morir: canilleras + 3 sencillos, +60 XP (ACH.hab.addXP), bandera de partida costaverde.dron.
   También: CV.eAct — registro de acciones con E del nivel (lo usan locales.js y sobrevivientes.js): {id, near(G)→{label, prompt, x, y}|null, act(G)}.
   Debug: ACH.debug.cv.dron.start() · kill() · state() */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || {}; CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { CV.systems.push(s); return s; };
  var T = 16;
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function sfx(n, d) { if (CV.sfx) CV.sfx(n, d); }
  function toast(t) { if (CV.toast) CV.toast(t); }
  function obj(t) { try { if (ACH.objetivo && typeof ACH.objetivo.set === 'function') ACH.objetivo.set(t); } catch (e) { /* nada */ } }
  function V() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }
  function dlgOn() { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); }

  /* ================= CV.eAct: acciones con E (envuelve ACH.armas.update/context, por fuera de juguetes.js) ================= */
  var EA = CV.eAct = CV.eAct || { list: [], cur: null };
  EA.add = function (a) { for (var i = 0; i < EA.list.length; i++) if (EA.list[i].id === a.id) { EA.list[i] = a; return a; } EA.list.push(a); return a; };
  function pickNear(G) {
    var best = null, bd = 1e9;
    for (var i = 0; i < EA.list.length; i++) {
      var a = EA.list[i], n = null; try { n = a.near(G); } catch (e) { n = null; }
      if (!n) continue;
      var d = n.d !== undefined ? n.d : dist(G.player.x, G.player.y, n.x, n.y);
      if (d < bd) { bd = d; best = { a: a, n: n }; }
    }
    return best;
  }
  function wrapE() {
    var A = ACH.armas; if (!A || typeof A.update !== 'function' || A.update._cvT2) return;
    var oU = A.update, oC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input;
      EA.cur = null;
      try {
        if (G && G.state === 'playing' && G.player && G.player.hp > 0 && In && typeof In.pressed === 'function' && !dlgOn()) {
          EA.cur = pickNear(G);
          if (EA.cur && In.pressed('KeyE')) {
            var c = EA.cur; EA.cur = null;
            try { c.a.act(G, c.n); } catch (e) { console.warn('[ACHORADO cv] eAct ' + c.a.id, e); }
            var op = In.pressed, self = this, args = arguments;
            In.pressed = function (k) { return k === 'KeyE' ? false : op.apply(this, arguments); };
            try { return oU.apply(self, args); } finally { In.pressed = op; }
          }
        }
      } catch (e2) { /* nunca rompe las armas */ }
      return oU.apply(this, arguments);
    };
    A.update._cvT2 = true; A.update._cv = !!oU._cv;   // juguetes.js no vuelve a envolver por fuera
    if (typeof oC === 'function') {
      A.context = function () { if (EA.cur) return { label: EA.cur.n.label || 'USAR', code: 'KeyE' }; return oC.apply(this, arguments); };
      A.context._cvT2 = true; A.context._cv = !!oC._cv;
    }
  }
  function drawPrompt(g, G, cx, cy) {
    var c = EA.cur; if (!c || !c.n.prompt) return;
    var s = String(c.n.prompt).toUpperCase(), x = Math.round(c.n.x - cx), y = Math.round(c.n.y - cy - (c.n.up || 34));
    g.save(); g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = Math.ceil(g.measureText(s).width) + 16;
    g.globalAlpha = 0.85; g.fillStyle = '#131015'; g.fillRect(x - (w >> 1), y - 5, w, 10);
    g.globalAlpha = 1; g.fillStyle = '#1fe07a'; g.fillRect(x - (w >> 1), y + 5, w, 1);
    g.fillStyle = '#ffe500'; g.fillText('E', x - (w >> 1) + 5, y); g.fillStyle = '#f2f2ee'; g.fillText(s, x + 4, y);
    g.restore();
  }
  CV.register({ name: 'eAct', reset: function () { wrapE(); EA.cur = null; }, drawTop: function (g, G, cx, cy) { drawPrompt(g, G, cx, cy); } });

  /* ================= El turista del dron ================= */
  var K = { trigC: 206, trigC1: 224, hp: 12, xp: 60, every: 4.2, markT: 5, markR: 200, maxPara: 4, keep: 70 };
  var B = { on: false, z: null, done: false, t: 0, act: 'marca', markT: 0, dropT: 0, drone: { x: 0, y: 0, ph: 0 }, paras: [], flashT: 0, barT: 0 };
  function flag(k, v) { return CV.flag ? CV.flag(k, v) : false; }
  function spawnBoss(G) {
    var E = ACH.ent, p = G.player, W = ACH.world; if (!E || !E.makeZombie) return null;
    var x = p.x + 120, y = 25.5 * T;
    for (var k = 0; k < 12 && W.collideCircle(x, y, 6); k++) { x += 8; y = (23 + Math.random() * 7) * T; }
    var z = E.makeZombie('cv_dronero', x, y, { loco: 'camina' });
    z.loco = 'camina'; z.shield = false; z.low = false; z.punch3 = false; z.cv = true; z.dronBoss = true; z.noDifHp = true;   // v0.13 fix: mini-jefe, sin +1 de Bravazo
    z.hp = z.hpMax = K.hp; z.state = 'perseguir'; z.lastX = p.x; z.lastY = p.y; z.flip = true;
    var Z = ACH.sprites && ACH.sprites.zvar; try { if (Z && Z.cv_dronero) z.skin = 'cv_dronero'; } catch (e) { /* nada */ }
    G.zombies.push(z);
    B.drone.x = z.x; B.drone.y = z.y - 46;
    return z;
  }
  var DLG = [
    { quien: 'turista', cara: 'risa', texto: '¡Hello, my friend! ¡Smile pa\'l dron! ¡Esto se va a hacer viraaal!' },
    { quien: 'alexander', cara: 'mueca', texto: 'Ese gringo tiene un dron... y los parapentistas zombis lo siguen como polillas al foco.' },
    { quien: 'alexander', cara: 'serio', texto: 'Si me marca con el flash, me caen encima. ¡Hay que bajarle el dron al dueño!' }];
  function start(G, quick) {
    if (B.on || B.done) return false;
    B.on = true; B.t = 0; B.act = 'marca'; B.markT = 0; B.dropT = 0; B.paras.length = 0; B.barT = 0;
    B.z = spawnBoss(G);
    if (!B.z) { B.on = false; return false; }
    obj('Derriba al turista del dron');
    sfx('zombie.alert', { x: B.z.x, y: B.z.y, type: 'cv_turista' });
    if (!quick && CV.talk) CV.talk(DLG);
    return true;
  }
  function paraAlive() { var n = 0; for (var i = B.paras.length - 1; i >= 0; i--) { var z = B.paras[i]; if (z && z.state !== 'muerto') n++; else B.paras.splice(i, 1); } return n; }
  function dropPara(G, x, y) {
    if (paraAlive() + (CV.zombis && CV.zombis.state ? CV.zombis.state().caidas : 0) >= K.maxPara) return;
    var W = ACH.world;
    for (var k = 0; k < 8; k++) { var tx = x + rand(-18, 18) * (k ? 1 : 0), ty = y + rand(-10, 10) * (k ? 1 : 0); if (ty > 19.5 * T && ty < 32.4 * T && !W.collideCircle(tx, ty, 7)) { x = tx; y = ty; break; } }
    if (CV.zombis && CV.zombis.drop) { CV.zombis.drop(x, y); B.pendingDrops = (B.pendingDrops || 0) + 1; sfx('cv.parapente', { x: x, y: y }); }
  }
  // los parapentistas que caen por el dron se cuentan para el tope (se buscan los recién aparecidos cerca)
  function adoptParas(G) {
    if (!B.pendingDrops) return;
    for (var i = G.zombies.length - 1; i >= Math.max(0, G.zombies.length - 4); i--) {
      var z = G.zombies[i]; if (z.type === 'cv_parapentista' && !z._dron && z.state !== 'muerto') { z._dron = true; B.paras.push(z); B.pendingDrops--; if (!B.pendingDrops) break; }
    }
  }
  function onBossDeath(G, z) {
    if (z._noReward || B.done) return;
    B.done = true; B.on = false; B.markT = 0;
    var iv = ACH.inv;
    try { if (iv && iv.drop) iv.drop(z.x, z.y, [{ id: 'canilleras', n: 1 }, { id: 'sencillo', n: 3 }], false); } catch (e) { /* nada */ }
    try { if (ACH.hab && typeof ACH.hab.addXP === 'function') ACH.hab.addXP(K.xp, false); } catch (e2) { /* nada */ }
    flag('dron', true);
    if (CV.zombis && CV.zombis.popText) CV.zombis.popText('¡ATERRIZAJE FORZOSO!', z.x, z.y - 40, '#ffe500');
    sfx('boss.down', { x: z.x, y: z.y });
    toast('+60 XP · El dron se fue al mar. Soltó unas canilleras.');
    obj('Sigue hasta el Parque Salazar y baja a Larcomar');
    B.droneFall = { x: B.drone.x, y: B.drone.y, vy: -40, t: 0 };
    if (CV.talk) CV.talk([{ quien: 'alexander', cara: 'risa', texto: '¡Se le acabó la batería, mister! Sin likes en el más allá.' }]);
  }
  var ZB = ACH.zbeh = ACH.zbeh || {};
  ZB.cv_dronero = {
    update: function (G, z, dt) {
      var p = G.player, d = dist(z.x, z.y, p.x, p.y);
      z.state = z.state === 'atacar' ? 'atacar' : 'perseguir'; z.lastX = p.x; z.lastY = p.y; z.lostT = 0;
      // se queda a distancia: si estás muy cerca, retrocede (pero se lo puede acorralar)
      if (d < K.keep && z.atkCD > 0.2) {
        var ux = (z.x - p.x) / (d || 1), uy = (z.y - p.y) / (d || 1);
        ACH.world.moveCircle(z, ux * 30 * dt, uy * 30 * dt, (ACH.ent.CFG.zRadius) || 5);
        z.moving = true; z.flip = p.x < z.x; return true;
      }
      return false;
    },
    onDeath: function (G, z) { onBossDeath(G, z); }
  };
  function update(G, dt) {
    var p = G.player; if (!p) return;
    if (!B.on && !B.done && G.state === 'playing' && p.y < 33 * T && p.x > K.trigC * T && p.x < K.trigC1 * T) start(G);
    if (B.droneFall) { var f = B.droneFall; f.t += dt; f.vy += 260 * dt; f.y += f.vy * dt; f.x += 30 * dt; if (f.t > 1.6) B.droneFall = null; }
    if (!B.on) return;
    var z = B.z;
    if (!z || G.zombies.indexOf(z) < 0) { B.on = false; B.z = null; return; }   // lo sacó un reinicio
    if (z.state === 'muerto') return;
    adoptParas(G);
    z.zpose = B.markT > 0 ? 'windup' : null; z.zposeF = Math.floor(B.t * 6) % 2;   // v0.13 T3 (S): control remoto en alto mientras marca (cuadro windup del skin propio)
    if (G.state !== 'playing') return;
    B.t += dt; B.barT = Math.min(1, B.barT + dt * 2);
    var dr = B.drone; dr.ph += dt;
    var tx, ty;
    if (B.markT > 0) { tx = p.x + Math.cos(dr.ph * 2) * 10; ty = p.y - 50; }
    else { tx = z.x + Math.cos(dr.ph * 1.3) * 26; ty = z.y - 48 + Math.sin(dr.ph * 2.1) * 6; }
    var k = Math.min(1, dt * (B.markT > 0 ? 4 : 2.5)); dr.x += (tx - dr.x) * k; dr.y += (ty - dr.y) * k;
    if (B.flashT > 0) B.flashT -= dt;
    if (B.markT > 0) {
      B.markT -= dt; B.dropT -= dt;
      for (var i = 0; i < G.zombies.length; i++) {
        var o = G.zombies[i]; if (o === z || o.state === 'muerto' || o.social) continue;
        if (dist(o.x, o.y, p.x, p.y) < K.markR) { if (o.state === 'deambular' || o.state === 'investigar') o.state = 'perseguir'; o.lastX = p.x; o.lastY = p.y; o.lostT = 0; }
      }
      if (B.dropT <= 0) { B.dropT = 2.4; dropPara(G, p.x + rand(-14, 14), p.y + rand(-6, 6)); }
    }
    if (B.t >= K.every && !dlgOn()) {
      B.t = 0;
      if (B.act === 'marca') {
        B.markT = K.markT; B.dropT = 0.9; B.flashT = 0.18; dr.x = p.x; dr.y = p.y - 50;
        sfx('cv.selfie', { x: p.x, y: p.y });
        if (CV.zombis && CV.zombis.flash) CV.zombis.flash(p.x, p.y - 30);
        if (CV.zombis && CV.zombis.popText) CV.zombis.popText('¡TE MARCÓ EL DRON!', p.x, p.y - 36, '#ff2e88');
        B.act = 'llamar';
      } else {
        if (CV.say) CV.say('cv.turista', { who: 'turista', x: z.x, y: z.y }, '¡Come on, amigos voladores!');
        sfx('zombie.alert', { x: z.x, y: z.y, type: 'cv_parapentista' });
        dropPara(G, p.x + rand(40, 70) * (Math.random() < 0.5 ? -1 : 1), p.y + rand(-20, 20));
        dropPara(G, p.x + rand(-30, 30), p.y + rand(30, 50) * (Math.random() < 0.5 ? -1 : 1));
        B.act = 'marca';
      }
    }
  }
  function drawDrone(g, x, y, t, lit) {
    x = Math.round(x); y = Math.round(y);
    var S = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.t2, spr = S && S.dron && S.dron[Math.floor(t * 16) % 2];
    if (spr) { g.drawImage(spr, x - (spr.width >> 1), y - (spr.height >> 1)); }
    else {
      g.fillStyle = '#131015'; g.fillRect(x - 9, y - 2, 18, 5); g.fillStyle = '#d8d8d0'; g.fillRect(x - 4, y - 1, 8, 3);
      g.fillStyle = '#131015'; g.fillRect(x - 11, y - 4, 6, 1); g.fillRect(x + 5, y - 4, 6, 1);
    }
    g.fillStyle = lit ? '#ff2e2e' : '#3a1010'; g.fillRect(x - 1, y + 2, 2, 1);
  }
  function drawTop(g, G, cx, cy) {
    var p = G.player;
    if (B.droneFall) { drawDrone(g, B.droneFall.x - cx, B.droneFall.y - cy, B.droneFall.t, false); }
    if (!B.on || !B.z || B.z.state === 'muerto') return;
    var dr = B.drone;
    // sombra del dron + rayito cuando marca
    if (B.markT > 0 && p) {
      var px = Math.round(p.x - cx), py = Math.round(p.y - cy), r = 9 + Math.sin(G.clock * 10) * 1.5;
      g.strokeStyle = '#ff2e88'; g.lineWidth = 1; g.globalAlpha = 0.9;
      g.strokeRect(px - r, py - 30 - r, r * 2, r * 2); g.fillStyle = '#ff2e88'; g.fillRect(px - 1, py - 30 - r - 3, 2, 4); g.fillRect(px - 1, py - 30 + r - 1, 2, 4); g.fillRect(px - r - 3, py - 31, 4, 2); g.fillRect(px + r - 1, py - 31, 4, 2);
      g.globalAlpha = 0.18; g.fillStyle = '#ff2e2e'; g.beginPath(); g.moveTo(dr.x - cx, dr.y - cy + 3); g.lineTo(px - 10, py); g.lineTo(px + 10, py); g.closePath(); g.fill();
      g.globalAlpha = 1;
    }
    drawDrone(g, dr.x - cx, dr.y - cy, G.clock || 0, Math.floor((G.clock || 0) * 4) % 2 === 0);
    if (B.flashT > 0) { var Vw = V(); g.globalAlpha = Math.min(0.8, B.flashT / 0.18 * 0.8) * (ACH.fx && ACH.fx.calma && ACH.fx.calma() ? 0.14 : 1); g.fillStyle = '#fff'; g.fillRect(0, 0, Vw.w, Vw.h); g.globalAlpha = 1; }
    // barra de mini-jefe arriba
    var Vw2 = V(), w = 140, x0 = Math.round((Vw2.w - w) / 2), y0 = 30, hp = Math.max(0, B.z.hp) / (B.z.hpMax || K.hp);
    g.globalAlpha = B.barT;
    g.fillStyle = '#131015'; g.fillRect(x0 - 2, y0 - 9, w + 4, 16);
    g.fillStyle = '#3a2a30'; g.fillRect(x0, y0, w, 4); g.fillStyle = '#ff7a1a'; g.fillRect(x0, y0, Math.round(w * hp), 4);
    g.font = '7px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffe500'; g.fillText('EL TURISTA DEL DRON', x0 + w / 2, y0 - 4);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
  }
  function reset() {
    var cont = !!CV.continuando;
    B.on = false; B.z = null; B.t = 0; B.markT = 0; B.paras.length = 0; B.droneFall = null; B.pendingDrops = 0; B.flashT = 0;
    B.done = cont && !!flag('dron');
  }
  function onRespawn(G) {
    // morir en la pelea: el turista se va (sin premio) y vuelve a salir al regresar a la zona
    if (B.on && B.z) { B.z._noReward = true; var i = G.zombies.indexOf(B.z); if (i >= 0) G.zombies.splice(i, 1); }
    B.on = false; B.z = null; B.markT = 0;
  }
  CV.register({ name: 'dron', reset: reset, update: update, onRespawn: onRespawn, drawTop: drawTop,
    mood: function () { return B.on && B.z && B.z.state !== 'muerto' ? { m: 'horde', i: 0.7 } : null; } });
  CV.dron = B;

  ACH.debug = ACH.debug || {}; ACH.debug.cv = ACH.debug.cv || {};
  function dbg() {
    ACH.debug.cv.dron = {
      start: function () { var G = ACH.G; if (ACH.debug.cv.tp) ACH.debug.cv.tp('intihuatana'); B.done = false; if (G) { var q = { x: 207 * T, y: 26 * T }; ACH.debug.teleport(q.x, q.y); start(G, true); } return ACH.debug.cv.dron.state(); },
      kill: function () { if (B.z && B.z.state !== 'muerto' && ACH.ent && ACH.ent.hitZombie) { B.z.hp = 0.01; try { ACH.ent.hitZombie(ACH.G, B.z, 1, 0, { dmg: 5, src: 'guitar' }); } catch (e) { B.z.hp = 0; B.z.state = 'muerto'; } } return ACH.debug.cv.dron.state(); },
      state: function () { return { on: B.on, done: B.done, hp: B.z ? +B.z.hp.toFixed(2) : null, act: B.act, marcado: +B.markT.toFixed(1), paras: paraAlive(), alive: B.z ? B.z.state : null }; }
    };
  }
  dbg();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(dbg, 0); }); else setTimeout(dbg, 0);
})();
