/* ACHORADO v0.13 (T2, KE) — js/miraflores/extras.js: D3, contra-abejas que valgan la pena.
   · CAMPANA de la Virgen Milagrosa (junto a la puerta de la iglesia, plazuela): E la toca. Dispersa los enjambres y aturde a los zombis (y a la jefa, si está en la pelea y a tiro) en
     200 px, con enfriamiento de 60 s. Suena iglesia.campanas (sfx-mira.js). Cartelito «E tocar la campana» o los segundos que faltan.
   · KIT ANTI-ABEJAS (ACH.inv.defs; se venden en el pintor y en Doña Rosa, ACH.VENDEDORES_DATA se amplía aquí, sin tocar catalogo.js):
       sprayAbejas  «RAYIT» (parodia de insecticida): nube de 6 s delante de Alexander que revienta enjambres a su paso (S/ 5, el pintor)
       repelente    de citronela: 25 s en los que las abejas pierden el rastro (no pican) (S/ 4, Doña Rosa)
       panuelo      de encaje: 40 s con la picadura al 40 % (S/ 3, Doña Rosa)
     ACH.mira.kit = { stingMul() → 1 | 0.4, repelT() → s que quedan, state() } (jefa.js los lee).
   · Don Pepe mudado a la ruta: está en mundo.js (VENDORS), entre la plazuela y el Mercado de Pulgas.
   · M.objetivoExtra: texto de objetivo según por dónde vas.
   Debug: ACH.debug.mira.campana() · .kit() · .bellCD(0) */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {}; M.systems = M.systems || [];
  if (!M.register) M.register = function (s) { M.systems.push(s); return s; };
  var T = 16;
  function sfx(n, d) { if (M.sfx) M.sfx(n, d); }
  function toast(t) { if (M.toast) M.toast(t); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function mkc(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tuto(id, text, key) { try { if (ACH.tuto && typeof ACH.tuto.vez === 'function') ACH.tuto.vez(id, text, key); } catch (e) { /* nada */ } }
  function tutoDone(id) { try { if (ACH.tuto && typeof ACH.tuto.hecho === 'function') ACH.tuto.hecho(id); } catch (e) { /* nada */ } }

  var BELL = { x: Math.round(99.4 * T), y: Math.round(37.9 * T), R: 200, CD: 60, USE_R: 26, stunZ: 2.5 };
  var kit = { repelT: 0, panT: 0 };
  var S = { cd: 0, ringT: -1, swing: 0, waves: [], near: false, spray: [], said: false };

  /* ---------------- Kit anti-abejas: objetos ---------------- */
  var KIT = {
    sprayAbejas: { name: 'SPRAY «RAYIT»', unit: 'spray', plural: 'sprays', stack: 3, fx: 'NUBE CONTRA ABEJAS · 6 s', tint: '#e8402c', price: 5, vendor: 'pintor',
      desc: 'Insecticida de casa: «mata hormigas, zancudos y cucarachas». Con las abejas de la jefa también funciona, dicen. Rocía delante tuyo (usar).' },
    repelente: { name: 'REPELENTE DE CITRONELA', unit: 'repelente', plural: 'repelentes', stack: 3, fx: 'LAS ABEJAS PIERDEN EL RASTRO · 25 s', tint: '#7fd05a', price: 4, vendor: 'rosa',
      desc: 'Hecho a mano por Doña Rosa, con citronela de su macetero. Huele rico para ti y espantoso para ellas (usar).' },
    panuelo: { name: 'PAÑUELO DE ENCAJE', unit: 'pañuelo', plural: 'pañuelos', stack: 3, fx: 'PICADURAS AL 40 % · 40 s', tint: '#ff8ac0', price: 3, vendor: 'rosa',
      desc: 'Te tapas la cara y el cuello. Las abejas pican la mitad de fuerte y la elegancia sube (usar).' }
  };
  function take(id) { return ACH.inv && ACH.inv.take ? ACH.inv.take(id, 1) : false; }
  function useSpray(id, p, G) {
    if (!take(id)) return false;
    var dv = ACH.ent.DIRV && ACH.ent.DIRV[p.dir] ? ACH.ent.DIRV[p.dir] : [1, 0], l = Math.sqrt(dv[0] * dv[0] + dv[1] * dv[1]) || 1;
    S.spray.push({ x: p.x + dv[0] / l * 24, y: p.y + dv[1] / l * 14, r: 36, t: 0, life: 6, tick: 0 });
    if (S.spray.length > 3) S.spray.shift();
    sfx('mira.rocio', { x: p.x, y: p.y });
    toast('¡Pssshhh! Nube anti-abejas (6 s)');
    return true;
  }
  function useRepelente(id, p) {
    if (kit.repelT > 0) { toast('Ya hueles a citronela, causa.'); return false; }
    if (!take(id)) return false;
    kit.repelT = 25; sfx('mira.rocio', { x: p.x, y: p.y });
    toast('Repelente puesto: las abejas pierden el rastro (25 s)');
    return true;
  }
  function usePanuelo(id, p) {
    if (kit.panT > 0) { toast('Ya llevas el pañuelo puesto.'); return false; }
    if (!take(id)) return false;
    kit.panT = 40; sfx('grab', { x: p.x, y: p.y });
    toast('Pañuelo puesto: las picaduras duelen al 40 % (40 s)');
    return true;
  }
  var USEFN = { sprayAbejas: useSpray, repelente: useRepelente, panuelo: usePanuelo };
  function iconOf(id) {
    var c = mkc(12, 12), g = c.getContext('2d'), K = '#131015';
    function r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    if (id === 'sprayAbejas') { r(3, 3, 6, 8, K); r(4, 4, 4, 6, '#e8402c'); r(4, 7, 4, 2, '#f3efe2'); r(4, 1, 4, 3, K); r(5, 2, 2, 1, '#ffe500'); r(8, 1, 2, 1, '#c8ccd4'); }
    else if (id === 'repelente') { r(3, 4, 6, 8, K); r(4, 5, 4, 6, '#7fd05a'); r(4, 7, 4, 2, '#f3efe2'); r(4, 1, 4, 4, K); r(5, 2, 2, 2, '#c8ccd4'); }
    else { r(1, 2, 10, 8, K); r(2, 3, 8, 6, '#ff8ac0'); r(2, 3, 8, 1, '#ffd0e6'); r(3, 5, 1, 1, '#ffffff'); r(5, 6, 1, 1, '#ffffff'); r(7, 5, 1, 1, '#ffffff'); r(9, 6, 1, 1, '#ffffff'); r(4, 9, 4, 2, K); }
    var big = mkc(24, 24), bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 24, 24);
    c.big = big; c.prov = true;
    return c;
  }
  function registerKit() {
    var I = ACH.inv, D = I && I.defs; if (!D) return;
    var SP = ACH.sprites = ACH.sprites || {}, IT = SP.items = SP.items || {};
    Object.keys(KIT).forEach(function (id) {
      var k = KIT[id];
      if (!D[id] || D[id]._ke) D[id] = { name: k.name, unit: k.unit, plural: k.plural, stack: k.stack, fx: k.fx, tint: k.tint, desc: k.desc, use: { fn: USEFN[id] }, _ke: true };
      if (!(IT[id] && IT[id].width)) IT[id] = iconOf(id);
    });
    // se venden en el pintor (el spray) y en Doña Rosa (repelente y pañuelo): se agregan al stock en tiempo de ejecución
    var V = ACH.VENDEDORES_DATA || {};
    Object.keys(KIT).forEach(function (id) {
      var v = V[KIT[id].vendor]; if (!v || !v.stock) return;
      for (var i = 0; i < v.stock.length; i++) if (v.stock[i].id === id) return;
      v.stock.push({ id: id, precio: KIT[id].price });
    });
  }
  M.kit = {
    stingMul: function () { return kit.panT > 0 ? 0.4 : 1; },
    repelT: function () { return kit.repelT; },
    state: function () { return { repel: +kit.repelT.toFixed(1), panuelo: +kit.panT.toFixed(1), sprays: S.spray.length }; }
  };
  function updateKit(G, dt) {
    var p = G.player, J = M.jefa, i;
    if (kit.repelT > 0) kit.repelT = Math.max(0, kit.repelT - dt);
    if (kit.panT > 0) kit.panT = Math.max(0, kit.panT - dt);
    for (i = S.spray.length - 1; i >= 0; i--) {
      var c = S.spray[i]; c.t += dt; c.tick -= dt;
      if (c.t >= c.life) { S.spray.splice(i, 1); continue; }
      if (c.tick <= 0 && J && J.swarms) {
        c.tick = 0.4;
        var sw = J.swarms();
        for (var k = 0; k < sw.length; k++) if (dist(c.x, c.y, sw[k].x, sw[k].y) < c.r + 6) J.hitSwarm(sw[k], 1.2, c.x, c.y, 'spray');
      }
    }
  }

  /* ---------------- La campana ---------------- */
  function ring(G) {
    var p = G.player, n = { swarms: 0, jefa: false, zs: 0 }, J = M.jefa, i;
    S.cd = BELL.CD; S.ringT = 0; S.swing = 1.6;
    S.waves.push({ t: 0 }); S.waves.push({ t: -0.35 });
    sfx('iglesia.campanas', { x: BELL.x, y: BELL.y - 30, strikes: 3, boost: 1.6 });
    if (M.say) M.say('campana', { who: 'alex', x: p.x, y: p.y, always: true }, '¡Que repiquen las campanas!');
    if (J && J.bell) { try { var r = J.bell(G, BELL.x, BELL.y, BELL.R); n.swarms = r.swarms; n.jefa = r.jefa; } catch (e) { /* nada */ } }
    for (i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto' || z.social || dist(z.x, z.y, BELL.x, BELL.y) > BELL.R) continue;
      z.state = 'golpeado'; z.stunT = Math.max(z.stunT || 0, BELL.stunZ); z.lungeT = 0; n.zs++;
    }
    if (ACH.fx && typeof ACH.fx.shake === 'function') { try { ACH.fx.shake(1.2, 0.3); } catch (e2) { /* nada */ } }
    toast('¡DONG! ' + (n.swarms ? n.swarms + ' enjambre' + (n.swarms > 1 ? 's' : '') + ' disperso' + (n.swarms > 1 ? 's' : '') + ' · ' : '') + n.zs + ' zombi' + (n.zs === 1 ? '' : 's') + ' aturdido' + (n.zs === 1 ? '' : 's') + ' · la campana se enfría 60 s');
    tutoDone('mira.campana');
    return n;
  }
  function bellNear(G) { var p = G.player; return !!p && p.hp > 0 && dist(p.x, p.y, BELL.x, BELL.y) < BELL.USE_R; }
  function interact(G) {
    if (S.cd > 0) { toast('La campana aún vibra: ' + Math.ceil(S.cd) + ' s'); return true; }
    ring(G); return true;
  }
  var installed = false;
  function wrapArmas() {
    var A = ACH.armas; if (!A || installed || typeof A.update !== 'function') return;
    installed = true;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input;
      if (G && G.state === 'playing' && G.player) {
        S.near = bellNear(G);
        if (S.near && In && In.pressed('KeyE') && !(ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen()) && interact(G)) {
          var op = In.pressed;
          In.pressed = function (c) { return c === 'KeyE' ? false : op(c); };
          try { return origU.apply(this, arguments); } finally { In.pressed = op; }
        }
      }
      return origU.apply(this, arguments);
    };
    if (typeof origC === 'function') A.context = function () { if (S.near) return { label: S.cd > 0 ? 'CAMPANA' : 'TOCAR', code: 'KeyE' }; return origC.apply(this, arguments); };
  }

  /* ---------------- Dibujo: la campana en su armazón de madera, ondas y nubes de spray ---------------- */
  var bellSpr = null;
  function bakeBell() {
    var c = mkc(26, 34), g = c.getContext('2d');
    function r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    r(2, 6, 3, 27, '#131015'); r(3, 6, 1, 26, '#8a5a2b'); r(21, 6, 3, 27, '#131015'); r(22, 6, 1, 26, '#8a5a2b');       // postes
    r(1, 4, 24, 4, '#131015'); r(2, 5, 22, 2, '#a8723a'); r(2, 5, 22, 1, '#c8924a');                                      // viga
    r(1, 31, 24, 3, '#131015'); r(2, 31, 22, 2, '#cdbb98');                                                              // base
    c.ax = 13; c.ay = 33;
    return c;
  }
  var clapSpr = null;
  function bakeBellBody() {
    var c = mkc(14, 16), g = c.getContext('2d');
    function r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
    r(5, 0, 4, 3, '#131015'); r(6, 1, 2, 1, '#c8963c');
    r(2, 3, 10, 11, '#131015'); r(3, 3, 8, 10, '#c8963c'); r(3, 3, 3, 10, '#e6bd62'); r(9, 4, 2, 9, '#8a6428');             // cuerpo de bronce
    r(1, 12, 12, 3, '#131015'); r(2, 12, 10, 2, '#b98a38'); r(2, 12, 10, 1, '#e6bd62');                                  // boca
    r(6, 14, 2, 2, '#131015');
    c.ax = 7; c.ay = 1;
    return c;
  }
  function drawables(G, out) {
    var cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    if (BELL.x < cam.x - 40 || BELL.x > cam.x + V.w + 40 || BELL.y < cam.y - 20 || BELL.y > cam.y + V.h + 70) return;
    out.push({ y: BELL.y, x: BELL.x, draw: function (g, cx, cy) {
      if (!bellSpr) { bellSpr = bakeBell(); clapSpr = bakeBellBody(); }
      var x = Math.round(BELL.x - cx), y = Math.round(BELL.y - cy);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 11, y - 1, 22, 3);
      g.drawImage(bellSpr, x - bellSpr.ax, y - bellSpr.ay);
      var sw = S.swing > 0 ? Math.sin(S.ringT * 14) * Math.min(1, S.swing) * 0.7 : 0;   // balanceo (rad) mientras suena
      g.save(); g.translate(x, y - 27); g.rotate(sw); g.drawImage(clapSpr, -clapSpr.ax, 0); g.restore();
    } });
  }
  function drawTop(g, G, cx, cy) {
    var i;
    for (i = 0; i < S.waves.length; i++) {   // ondas de la campana: círculos que se abren hasta 200 px
      var w = S.waves[i]; if (w.t < 0) continue;
      var k = Math.min(1, w.t / 0.9), rr = BELL.R * k;
      g.globalAlpha = Math.max(0, 0.55 * (1 - k)); g.strokeStyle = '#ffe9a0'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(Math.round(BELL.x - cx), Math.round(BELL.y - 18 - cy), rr, rr * 0.55, 0, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
    for (i = 0; i < S.spray.length; i++) {   // nube del spray
      var c = S.spray[i], a = Math.max(0, Math.min(1, (c.life - c.t) / 1.2)), sx = Math.round(c.x - cx), sy = Math.round(c.y - cy);
      g.globalAlpha = 0.28 * a; g.fillStyle = '#d8f0c8'; g.beginPath(); g.ellipse(sx, sy - 6, c.r, c.r * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.5 * a; g.fillStyle = '#ffffff';
      for (var q = 0; q < 8; q++) { var an = c.t * 1.4 + q * 0.785, rad = c.r * (0.3 + (q % 3) * 0.22); g.fillRect(Math.round(sx + Math.cos(an) * rad), Math.round(sy - 6 + Math.sin(an) * rad * 0.55), 2, 1); }
    }
    g.globalAlpha = 1;
    var p = G.player;
    if (p && (kit.repelT > 0 || kit.panT > 0) && G.state === 'playing') {   // chispitas verdes / rosadas sobre Alexander
      for (i = 0; i < 4; i++) {
        var ang = G.clock * 3 + i * 1.57, px = Math.round(p.x - cx + Math.cos(ang) * 9), py = Math.round(p.y - cy - 16 + Math.sin(ang) * 3);
        g.fillStyle = i % 2 && kit.panT > 0 ? '#ff8ac0' : '#7fd05a'; g.fillRect(px, py, 2, 2);
      }
    }
    // aviso flotante junto a la campana
    if (G.state !== 'playing' || !S.near || (ACH.touch && ACH.touch.on)) return;
    var s = S.cd > 0 ? 'Campana: ' + Math.ceil(S.cd) + ' s' : 'E tocar la campana';
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w2 = Math.ceil(g.measureText(s).width) + 6, bx = Math.round(BELL.x - cx), by = Math.round(BELL.y - 44 - cy);
    g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(bx - (w2 >> 1), by - 5, w2, 10);
    g.globalAlpha = 1; g.fillStyle = S.cd > 0 ? '#8a8494' : '#ffe500'; g.fillRect(bx - (w2 >> 1), by + 5, w2, 1);
    g.fillStyle = '#f2f2f2'; g.fillText(s, bx, by);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }

  M.objetivoExtra = function (G) {
    var p = G.player; if (!p) return null;
    if (p.x > 88 * T) return 'Baja a la Calle de las Pizzas: la jefa te espera';
    if (p.x > 50 * T) return 'Sigue por el parque hasta la iglesia de la Virgen Milagrosa';
    return null;
  };

  /* ---------------- Sistema ---------------- */
  var dynSolid = null;
  M.register({
    name: 'extras',
    reset: function (G) {
      kit.repelT = 0; kit.panT = 0; S.cd = 0; S.ringT = -1; S.swing = 0; S.waves.length = 0; S.spray.length = 0; S.near = false;
      registerKit(); wrapArmas();
      var W = ACH.world;
      if (W && Array.isArray(W.dynSolids)) {   // la campana no se atraviesa (el armazón: 2 postes)
        if (dynSolid) { var k = W.dynSolids.indexOf(dynSolid); if (k >= 0) W.dynSolids.splice(k, 1); }
        dynSolid = { x0: BELL.x - 11, y0: BELL.y - 5, x1: BELL.x + 11, y1: BELL.y, bell: true };
        W.dynSolids.push(dynSolid);
      }
    },
    onRespawn: function () { kit.repelT = 0; kit.panT = 0; S.spray.length = 0; },
    update: function (G, dt) {
      updateKit(G, dt);
      if (S.cd > 0) S.cd = Math.max(0, S.cd - dt);
      if (S.swing > 0) { S.swing -= dt; S.ringT += dt; }
      for (var i = S.waves.length - 1; i >= 0; i--) { S.waves[i].t += dt; if (S.waves[i].t > 0.9) S.waves.splice(i, 1); }
      // pista de tutorial (U): con abejas encima y la campana cerca
      var p = G.player, J = M.jefa;
      if (p && S.cd <= 0 && J && J.swarms && dist(p.x, p.y, BELL.x, BELL.y) < BELL.R) { var sw = J.swarms(); for (var k = 0; k < sw.length; k++) if (!sw[k].tut && dist(sw[k].x, sw[k].y, p.x, p.y) < 160) { tuto('mira.campana', 'Las abejas te siguen: la campana de la iglesia las dispersa', 'E'); break; } }
    },
    drawables: drawables,
    drawTop: drawTop
  });

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  var DM = ACH.debug.mira = ACH.debug.mira || {};
  DM.campana = function () { var G = ACH.G; if (!G) return null; if (S.cd > 0) return { cd: +S.cd.toFixed(1) }; return ring(G); };
  DM.bellCD = function (v) { if (v !== undefined) S.cd = v; return S.cd; };
  DM.bell = { x: BELL.x, y: BELL.y, R: BELL.R };
  DM.kit = function () { return M.kit.state(); };
})();
