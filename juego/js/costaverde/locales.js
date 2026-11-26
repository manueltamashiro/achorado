/* ACHORADO — js/costaverde/locales.js (v0.13 T2, agente CV · E2): Larcomar con tiendas por dentro.
   3 interiores (ACH.world.rooms, tallados por mundo.js en la vista, aislados): Cinépolis (terraza B), Estarbaks (B) y Tantita (A).
   - E en la puerta del local (en la terraza) → entras; E en la SALIDA (abajo al centro) → vuelves a la puerta.
   - Cada sala: 2–3 botines con E (una vez), un objeto propio (canchita, frappé, causa limeña), humor y 1–2 zombis encerrados
     (rey del selfie en el cine, barista en el café, mozos en Tantita).
   - Arte: ACH.sprites.cv.t2.room(id) (arte-v013.js). Los muebles son sólidos (ACH.world.dynSolids) y se dibujan por profundidad.
   - Banderas de partida: costaverde.local.<id> (ya entraste: los zombis no vuelven) y costaverde.botin.<id>.<n>.
   Debug: ACH.debug.cv.local.enter('cine'|'cafe'|'tanta') · exit() · state() */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var CV = ACH.cv = ACH.cv || {}; CV.systems = CV.systems || [];
  if (!CV.register) CV.register = function (s) { CV.systems.push(s); return s; };
  var T = 16;
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n, d) { if (CV.sfx) CV.sfx(n, d); }
  function toast(t) { if (CV.toast) CV.toast(t); }
  function flag(k, v) { return CV.flag ? CV.flag(k, v) : false; }
  function pop(s, x, y, c) { if (CV.zombis && CV.zombis.popText) CV.zombis.popText(s, x, y, c); }
  function V() { return (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }; }

  /* ---------------- comida nueva ---------------- */
  var ITEMS = {
    canchita: { name: 'CANCHITA DE CINE', unit: 'canchita', plural: 'canchitas', stack: 4, fx: '+12 VIDA', tint: '#f3e8b0',
      desc: 'Con mantequilla de la sala 4. Fría, pero es canchita.', use: { hp: 12 } },
    frappe: { name: 'FRAPPÉ «ALEKZANDER»', unit: 'frappé', plural: 'frappés', stack: 3, fx: '+35 ALIENTO · +5 VIDA', tint: '#a07a5a',
      desc: 'Escribieron mal tu nombre, pero está heladito. Te devuelve el aliento.', use: { hp: 5, st: 35, drink: true } },
    causa: { name: 'CAUSA LIMEÑA', unit: 'causa', plural: 'causas', stack: 3, fx: '+30 VIDA', tint: '#f0c030',
      desc: 'De la cocina de Tantita: papa amarilla, ají y su palta. Plato de bandera.', use: { hp: 30 } }
  };
  function registerItems() {
    var I = ACH.inv, D = I && I.defs; if (!D) return;
    for (var id in ITEMS) { if (D[id] && !D[id]._cvT2) continue; var d = {}; for (var k in ITEMS[id]) d[k] = ITEMS[id][k]; d._cvT2 = true; D[id] = d; }
    var A = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.t2, IT = (ACH.sprites.items = ACH.sprites.items || {});
    if (A && A.icons) for (var j in A.icons) if (!IT[j] || IT[j]._cvT2 || IT[j].prov) { IT[j] = A.icons[j]; IT[j]._cvT2 = true; }
  }

  /* ---------------- contenido de cada sala (coordenadas locales de la sala, px) ---------------- */
  var DEF = {
    cine: { brand: 'cinepolis', entry: [208, 198], exit: [208, 232],
      hello: 'Cinépolis, sala 4: la función ya empezó... y el público también.',
      zs: [['cv_reySelfie', 208, 115], ['caminante', 130, 150]],
      loot: [{ x: 47, y: 92, name: 'DULCERÍA', items: [['canchita', 2], ['sencillo', 2]], msg: '¡Canchita gratis! El combo agrandado corre por la casa.' },
        { x: 360, y: 186, name: 'BUTACA 3F', items: [['sencillo', 4], ['curitas', 1]], msg: 'Debajo de la butaca: vuelto, curitas y un chicle (el chicle no).' }] },
    cafe: { brand: 'starbucks', entry: [160, 152], exit: [160, 184],
      hello: '«¿A nombre de quién?» Ya nadie contesta, causa.',
      zs: [['cv_barista', 160, 100], ['caminante', 262, 160]],
      loot: [{ x: 84, y: 94, name: 'BARRA', items: [['frappe', 2]], msg: 'Dos frappés listos: «ALEKZANDER» y «TITINNA». Casi.' },
        { x: 250, y: 94, name: 'CAJA', items: [['sencillo', 5]], msg: 'La caja del día. Propina incluida, joven.' }] },
    tanta: { brand: 'tanta', entry: [176, 168], exit: [176, 200],
      hello: 'Tantita: mesa para uno... y para los muertos de la mesa 6.',
      zs: [['cv_trabajador', 140, 130], ['cv_trabajador', 222, 172]],
      loot: [{ x: 176, y: 88, name: 'COCINA', items: [['causa', 2]], msg: 'Dos causas en el pase. ¡Salen, salen!' },
        { x: 42, y: 102, name: 'BAR', items: [['chicha', 2]], msg: 'Chicha morada de la casa. Sin hielo, como en el Callao.' },
        { x: 262, y: 168, name: 'MESA VIP', items: [['sencillo', 3], ['uhu', 1]], msg: 'Mesa VIP: alguien olvidó su vuelto y un Uhu. Raro, pero ya.' }] }
  };
  var S = { rooms: [], inRoom: null, fade: 0, said: false, done: {}, entered: {}, solidsOn: false };
  function W() { return ACH.world; }
  function setup() {
    S.rooms.length = 0;
    var R = (W() && W().rooms) || [], D = (W() && W().doors) || {};
    R.forEach(function (q) {
      var d = DEF[q.id]; if (!d) return;
      var door = D[d.brand] && D[d.brand][0];
      var art = ACH.sprites && ACH.sprites.cv && ACH.sprites.cv.t2 && ACH.sprites.cv.t2.room(q.id, q.x1 - q.x0, q.y1 - q.y0);
      S.rooms.push({ q: q, d: d, door: door ? { x: door.x, y: door.y } : null, art: art,
        name: CV.brandName ? CV.brandName(d.brand) : d.brand.toUpperCase() });
    });
  }
  function solids() {
    if (S.solidsOn) return;
    var L = W() && W().dynSolids; if (!Array.isArray(L)) return;
    S.rooms.forEach(function (r) {
      if (!r.art) return;
      r.art.items.forEach(function (it) { if (it.solid) L.push({ id: 'local.' + r.q.id, cvLocal: true, off: false, x0: r.q.x0 + it.x, y0: r.q.y0 + it.y, x1: r.q.x0 + it.x + it.w, y1: r.q.y0 + it.y + it.h }); });
    });
    S.solidsOn = true;
  }
  function roomOf(p) { for (var i = 0; i < S.rooms.length; i++) { var q = S.rooms[i].q; if (p.x >= q.x0 && p.x < q.x1 && p.y >= q.y0 && p.y < q.y1) return S.rooms[i]; } return null; }
  function abs(r, xy) { return { x: r.q.x0 + xy[0], y: r.q.y0 + xy[1] }; }
  function place(G, x, y) { var p = G.player; p.x = x; p.y = y; p.kbx = 0; p.kby = 0; if (CV.snapCam) CV.snapCam(); else if (ACH.debug && ACH.debug.teleport) ACH.debug.teleport(x, y); }
  function spawnZs(G, r) {
    var E = ACH.ent; if (!E || !E.makeZombie) return;
    r.d.zs.forEach(function (s) {
      var a = abs(r, [s[1], s[2]]), z = E.makeZombie(s[0], a.x, a.y, { loco: 'camina' });
      z.loco = 'camina'; z.shield = false; z.low = false; z.punch3 = false; z.cv = true; z.cvLocal = r.q.id;
      var ZT = E.ZT; if (ZT && ZT[s[0]]) { z.hp = z.hpMax = ZT[s[0]].hp; }
      var Z = ACH.sprites && ACH.sprites.zvar, sk = s[0] === 'cv_trabajador' ? 'cv_trab_' + r.d.brand : s[0];
      try { if (Z && Z[sk] && s[0] !== 'caminante') z.skin = sk; } catch (e) { /* nada */ }
      if (s[0] === 'cv_trabajador') { z.brand = r.d.brand; z.terr = r.q.terr; }
      z.homeX = a.x; z.homeY = a.y;
      G.zombies.push(z);
    });
  }
  function enter(G, r) {
    S.inRoom = r; S.fade = 0.35;
    var a = abs(r, r.d.entry); place(G, a.x, a.y);
    sfx('door', { x: a.x, y: a.y });
    if (!S.entered[r.q.id]) {
      S.entered[r.q.id] = true; flag('local.' + r.q.id, true);
      spawnZs(G, r);
      toast(r.d.hello);
    } else toast(r.name);
  }
  function exit(G, r) {
    S.inRoom = null; S.fade = 0.35;
    if (r.door) place(G, r.door.x, r.door.y + 12);
    sfx('door', { x: G.player.x, y: G.player.y });
  }
  function loot(G, r, n) {
    var L = r.d.loot[n], k = r.q.id + '.' + n; if (S.done[k]) return;
    S.done[k] = true; flag('botin.' + k, true);
    var a = abs(r, [L.x, L.y]), defs = ACH.inv && ACH.inv.defs, items = [];
    L.items.forEach(function (q) { if (!defs || defs[q[0]] || q[0] === 'sencillo') items.push({ id: q[0], n: q[1] }); });
    if (!items.length) items.push({ id: 'sencillo', n: 2 });
    try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(a.x, a.y + 6, items, false); } catch (e) { /* nada */ }
    sfx('grab', { x: a.x, y: a.y }); pop('¡BOTÍN!', a.x, a.y - 24, '#1fe07a'); toast(L.msg);
  }
  function addActs() {
    var EA = CV.eAct; if (!EA || !EA.add) return;
    S.rooms.forEach(function (r) {
      EA.add({ id: 'local.in.' + r.q.id,
        near: function (G) { var p = G.player; if (!r.door || S.inRoom || dist(p.x, p.y, r.door.x, r.door.y) > 22) return null; return { x: r.door.x, y: r.door.y, label: 'ENTRAR', prompt: 'ENTRAR A ' + r.name }; },
        act: function (G) { enter(G, r); } });
      EA.add({ id: 'local.out.' + r.q.id,
        near: function (G) { var p = G.player, a = abs(r, r.d.exit); if (S.inRoom !== r || dist(p.x, p.y, a.x, a.y) > 26) return null; return { x: a.x, y: a.y, label: 'SALIR', prompt: 'SALIR A LA TERRAZA', up: 30 }; },
        act: function (G) { exit(G, r); } });
      r.d.loot.forEach(function (L, n) {
        EA.add({ id: 'local.botin.' + r.q.id + n,
          near: function (G) { var p = G.player, a = abs(r, [L.x, L.y]); if (S.inRoom !== r || S.done[r.q.id + '.' + n] || dist(p.x, p.y, a.x, a.y) > 22) return null; return { x: a.x, y: a.y, label: 'BUSCAR', prompt: 'BUSCAR EN ' + L.name }; },
          act: function (G) { loot(G, r, n); } });
      });
    });
  }
  // brillo en los botines sin abrir (para que se encuentren)
  function drawables(G, out) {
    var r = S.inRoom; if (!r || !r.art) return;
    var q = r.q, bg = r.art.bg;
    r.art.items.forEach(function (it) {
      out.push({ y: q.y0 + it.y + it.h, x: q.x0 + it.x, vol: false, draw: function (g, cx, cy) {
        var top = Math.max(0, it.y - 16), h = it.y + it.h - top + 1;
        g.drawImage(bg, it.x - 1, top, it.w + 2, h, Math.round(q.x0 + it.x - 1 - cx), Math.round(q.y0 + top - cy), it.w + 2, h);
      } });
    });
    r.d.loot.forEach(function (L, n) {
      if (S.done[q.id + '.' + n]) return;
      out.push({ y: q.y0 + L.y - 2, x: q.x0 + L.x, vol: false, draw: function (g, cx, cy) {
        var t = (G.clock || 0) * 3 + n, x = Math.round(q.x0 + L.x - cx), y = Math.round(q.y0 + L.y - cy);
        g.globalAlpha = 0.55 + 0.45 * Math.sin(t); g.fillStyle = '#ffe500'; g.fillRect(x - 1, y - 6, 2, 2); g.fillRect(x - 4, y - 3, 2, 1); g.fillRect(x + 2, y - 3, 2, 1); g.globalAlpha = 1;
      } });
    });
  }
  function ground(ctx, G, cx, cy) {
    if (!W() || W().id !== 'costaverde') return;
    var p = G && G.player; if (!p) return;
    var r = roomOf(p); if (!r || !r.art) return;
    var Vw = V(); ctx.fillStyle = '#08070a'; ctx.fillRect(0, 0, Vw.w, Vw.h);
    ctx.drawImage(r.art.bg, Math.round(r.q.x0 - cx), Math.round(r.q.y0 - cy));
  }
  ACH.drawHooks = ACH.drawHooks || { ground: [], ysort: [], air: [], screen: [] };
  if (!Array.isArray(ACH.drawHooks.ground)) ACH.drawHooks.ground = [];
  ACH.drawHooks.ground.push(ground);

  function update(G, dt) {
    var p = G.player; if (!p) return;
    if (S.fade > 0) S.fade -= dt;
    var r = roomOf(p); if (S.inRoom !== r) S.inRoom = r;   // reaparecer afuera, debug, etc.
    if (!S.said && p.y > 34 * T && !r) { S.said = true; var chefViejo = false; try { chefViejo = !!(ACH.cv && ACH.cv.flag && ACH.cv.flag('chef')); } catch (e0) { /* nada */ }   // QA-2: CONTINUAR con el chef vencido no pisa el objetivo «tírate en parapente»
      if (!chefViejo) try { if (ACH.objetivo && ACH.objetivo.set) ACH.objetivo.set('Baja por Larcomar hasta el chifa · E en los locales abiertos'); } catch (e) { /* nada */ } }
  }
  function drawTop(g) {
    if (S.fade > 0) { var Vw = V(); g.globalAlpha = Math.min(1, S.fade / 0.35); g.fillStyle = '#08070a'; g.fillRect(0, 0, Vw.w, Vw.h); g.globalAlpha = 1; }
  }
  function reset(G) {
    registerItems(); setup(); solids(); addActs();
    S.inRoom = null; S.fade = 0; S.said = false;
    var cont = !!CV.continuando;
    S.done = {}; S.entered = {};
    S.rooms.forEach(function (r) {
      if (cont && flag('local.' + r.q.id)) S.entered[r.q.id] = true;
      r.d.loot.forEach(function (L, n) { var k = r.q.id + '.' + n; if (cont && flag('botin.' + k)) S.done[k] = true; });
    });
  }
  CV.register({ name: 'locales', reset: reset, update: update, drawables: drawables, drawTop: drawTop });
  CV.locales = S;

  ACH.debug = ACH.debug || {}; ACH.debug.cv = ACH.debug.cv || {};
  ACH.debug.cv.local = {
    enter: function (id) { var G = ACH.G; if (ACH.debug.cv.tp) ACH.debug.cv.tp('larcoB'); var r = S.rooms.filter(function (x) { return x.q.id === id; })[0]; if (!r || !G) return { error: 'sala', ids: Object.keys(DEF) }; enter(G, r); return ACH.debug.cv.local.state(); },
    exit: function () { var G = ACH.G; if (S.inRoom && G) exit(G, S.inRoom); return ACH.debug.cv.local.state(); },
    loot: function (n) { var G = ACH.G; if (S.inRoom && G) loot(G, S.inRoom, n | 0); return ACH.debug.cv.local.state(); },
    state: function () {
      var G = ACH.G, zs = {};
      (G ? G.zombies : []).forEach(function (z) { if (z.cvLocal && z.state !== 'muerto') zs[z.cvLocal] = (zs[z.cvLocal] || 0) + 1; });
      return { inRoom: S.inRoom ? S.inRoom.q.id : null, rooms: S.rooms.map(function (r) { return { id: r.q.id, door: r.door, art: !!r.art }; }), entered: S.entered, botin: S.done, zombis: zs,
        p: G ? { x: Math.round(G.player.x), y: Math.round(G.player.y) } : null };
    }
  };
})();
