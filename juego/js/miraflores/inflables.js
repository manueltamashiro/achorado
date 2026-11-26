/* ACHORADO — js/miraflores/inflables.js (M1a): comidas de marca, monedas de las piletas, vendedores de inflables y su tienda,
   los tres inflables en la mano, las burbujas y el señuelo con F (MIRAFLORES.md §4.2–4.3).
   - Objetos nuevos en ACH.inv.defs. Los que necesitan efecto propio (inflables, café, cinta, picarones) usan `use.fn` (gancho de inventario.js).
   - Inflables = objetos «en la mano» de ACH.armas.define(): el golpe pasa por entities.swingHit → ACH.nivel.onSwing (kind 'held:<id>', `bees`).
   - Pistola de burbujas: el «golpe» dispara 3 burbujas (proyectiles de este archivo) que pasan por ACH.nivel.onProjectile; a los zombies
     no les hacen daño: los dejan embobados 1,5 s.
   - F = lanzar el inflable: rebota sin daño; los zombies a menos de 80 px van a mirarlo 3 s (señuelo silencioso). Se vuelve a agarrar con E.
   - E cerca de Don Tito / Don Pepe abre el panel «PUESTO DE INFLABLES» (el juego queda en pausa); E en una pileta saca 3 sencillos (una vez). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {}; M.systems = M.systems || [];
  if (!M.register) M.register = function (s) { M.systems.push(s); return s; };
  var D2R = Math.PI / 180;
  function sfx(n, d) { if (M.sfx) M.sfx(n, d); }
  function toast(t) { if (M.toast) M.toast(t); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function bn(id) { return M.brandName ? M.brandName(id) : id.toUpperCase(); }

  /* ---------------- Los tres inflables ---------------- */
  var TOYS = {
    martilloInflable: { name: 'MARTILLO INFLABLE', short: 'martillo', price: 4, col: '#e8402c', col2: '#ffe500', stun: 0.6,
      desc: 'Daño 0.5, empuja fuerte y aturde. ¡Piii! en cada golpe. Contra abejas, 2.',
      hold: { dmg: 0.5, range: 24, arc: 130 * D2R, knock: 90, cd: 0.28, cost: 5, noise: 50, dur: 0.26, frame: 0.08, hits: 30, bees: 2,
        swingSfx: 'inflable.swing', hitSfx: 'inflable.hit', hitText: [['¡PIII!'], ['¡PIII!', '¡PUM!']] } },
    espadaInflable: { name: 'ESPADA DE GLOBO', short: 'espada', price: 3, col: '#3a8ae8', col2: '#f3efe2',
      desc: 'Rápida y de largo alcance. Suena a globo frotado. Contra abejas, 1.5.',
      hold: { dmg: 0.4, range: 30, arc: 110 * D2R, knock: 50, cd: 0.16, cost: 3, noise: 35, dur: 0.18, frame: 0.06, hits: 35, bees: 1.5,
        swingSfx: 'inflable.swing', hitSfx: 'inflable.hit', hitText: [['¡FRIIC!'], ['¡FRIIC!', '¡PLOP!']] } },
    pistolaBurbujas: { name: 'PISTOLA DE BURBUJAS', short: 'pistola', price: 6, col: '#1fe07a', col2: '#ff2e88', shots: true,
      desc: '3 burbujas en abanico. No hace daño: los muertos se quedan embobados. Atrapa abejas.',
      hold: { dmg: 0, range: 0.01, arc: 0.01, knock: 0, cd: 0.35, cost: 2, noise: 10, dur: 0.2, frame: 0.05, hits: 40, bees: 0,
        swingSfx: 'burbujas.shot', hitSfx: 'burbujas.pop' } },
    // v0.11 (B): guante de box inflable (lo vende Don Pepe; la durabilidad ×2 la pone armas.js con ACH.cfg.durMul)
    guanteInflable: { name: 'GUANTE DE BOX INFLABLE', short: 'guante', price: 5, col: '#e8402c', col2: '#f3efe2', stack: 1,
      desc: '¡Uno-dos, uno-dos! Daño 0.45, rapidísimo y empuja fuerte. Contra abejas, 1.',
      hold: { dmg: 0.45, range: 18, arc: 90 * D2R, knock: 140, cd: 0.14, cost: 3, noise: 30, dur: 0.14, frame: 0.05, hits: 40, bees: 1,
        swingSfx: 'inflable.swing', hitSfx: 'inflable.hit', hitText: [['¡PAF!'], ['¡PAF!', '¡PUM!']] } }
  };
  var TOY_IDS = ['martilloInflable', 'espadaInflable', 'pistolaBurbujas', 'guanteInflable'];
  var DECOY = { r: 80, t: 3 }, BUB = { sp: 140, range: 110, fan: 10 * D2R, r: 5, bobo: 1.5 };

  function toyProp(id) {   // sprite del inflable suelto o en la mano: props.inflable_<id> → ícono de M2c → provisorio
    var P = ACH.sprites && (ACH.sprites.props = ACH.sprites.props || {}), key = 'inflable_' + id;
    if (P[key] && P[key].width) return key;
    var it = ACH.sprites.items && ACH.sprites.items[id], c;
    if (it && it.width) { c = document.createElement('canvas'); c.width = it.width; c.height = it.height; c.getContext('2d').drawImage(it, 0, 0); }
    else {
      var T0 = TOYS[id]; c = document.createElement('canvas'); c.width = 14; c.height = 12;
      var g = c.getContext('2d');
      g.fillStyle = '#131015'; g.fillRect(5, 4, 3, 8);
      if (id === 'martilloInflable') { g.fillRect(0, 0, 14, 6); g.fillStyle = T0.col; g.fillRect(1, 1, 12, 4); g.fillStyle = T0.col2; g.fillRect(6, 5, 1, 6); }
      else if (id === 'espadaInflable') { g.fillRect(5, 0, 4, 9); g.fillStyle = T0.col; g.fillRect(6, 0, 2, 8); g.fillStyle = T0.col2; g.fillRect(3, 8, 8, 2); }
      else if (id === 'guanteInflable') { g.fillRect(2, 0, 10, 8); g.fillRect(10, 2, 4, 5); g.fillStyle = T0.col; g.fillRect(3, 1, 8, 6); g.fillRect(11, 3, 2, 3); g.fillStyle = T0.col2; g.fillRect(4, 8, 6, 3); g.fillStyle = '#ff9a8a'; g.fillRect(4, 2, 3, 1); }
      else { g.fillRect(1, 2, 11, 6); g.fillStyle = T0.col; g.fillRect(2, 3, 9, 4); g.fillStyle = T0.col2; g.fillRect(5, 6, 3, 5); g.fillStyle = '#bfe8ff'; g.fillRect(11, 1, 3, 3); }
    }
    c.ax = c.width >> 1; c.ay = c.height - 1; c.placeholder = true;
    P[key] = c;
    return key;
  }
  function defineToys() {
    var A = ACH.armas; if (!A || !A.define) return;
    TOY_IDS.forEach(function (id) {
      var T0 = TOYS[id], h = {}; for (var k in T0.hold) h[k] = T0.hold[k];
      h.kind = id;
      if (A.defs[id] && A.defs[id]._mira) { A.defs[id].spr = toyProp(id); return; }
      var d = A.define(id, {
        name: T0.short + (id === 'pistolaBurbujas' ? ' de burbujas' : ' inflable'), spr: toyProp(id), mode: 'hand', lift: 6, hold: h,
        poses: { hold: 'inf_' + id + '_walk', swing: 'inf_' + id + '_swing' },
        fly: { sp: 170, fric: 2.4, dmg: 0, knock: 0, slow: 1, pierce: 0, lob: 80 },
        onBreak: function (G) { var p = G.player; sfx('inflable.pop', { x: p.x, y: p.y, toy: id }); toast('¡PUM! Se reventó tu ' + T0.short + '.'); popFx(p.x, p.y - 10, T0.col); }
      });
      d._mira = true;
    });
  }
  // Alexander con inflable (M2c): ACH.sprites.alexInflable[id][bird|nobird] = { walk: {dir: [4]}, swing: {dir: [3]} } → poses de render.js
  // perezoso (M2c hornea cada inflable recién al pedirlo): se llama al agarrar ese inflable
  function aliasPoses(only) {
    var S = ACH.sprites, AI = S && S.alexInflable, AL = S && S.alex, V11 = S && S.v011 && S.v011.inflables; if ((!AI && !V11) || !AL) return;
    TOY_IDS.forEach(function (id) {
      if (only && id !== only) return;
      ['bird', 'nobird'].forEach(function (v) {
        var src = (AI && AI[id] && AI[id][v]) || (V11 && V11[id] && V11[id][v]); if (!src || !AL[v]) return;   // v0.11: el guante viene de items-v011.js
        if (src.walk) AL[v]['inf_' + id + '_walk'] = src.walk;
        if (src.swing) AL[v]['inf_' + id + '_swing'] = src.swing;
      });
    });
  }
  function wrapPoseFrame() {
    var A = ACH.armas; if (!A || !A.poseFrame || A.poseFrame._mira) return;
    var orig = A.poseFrame;
    A.poseFrame = function (p) {
      p = p || (ACH.G && ACH.G.player);
      var ps = A.pose ? A.pose(p) : null;
      if (p && typeof ps === 'string' && /^inf_.*_walk$/.test(ps)) return p.moving ? ((Math.floor(p.animT) % 4) + 4) % 4 : 0;
      return orig.apply(this, arguments);
    };
    A.poseFrame._mira = true;
  }

  /* ---------------- Objetos del inventario (§4.2) ---------------- */
  var ITEMS = {
    hamburguesaBembos: function () { return { name: 'HAMBURGUESA ' + bn('bembos'), unit: 'hamburguesa', plural: 'hamburguesas', stack: 3, fx: '+20 VIDA', tint: '#ffb500',
      desc: 'Con su papita al hilo y todas las cremas. Fría, pero de marca.', use: { hp: 20, sick: 0.10 } }; },
    cafeStarbucks: function () { return { name: 'CAFÉ DE ' + bn('starbucks'), unit: 'café', plural: 'cafés', stack: 3, fx: 'ALIENTO LLENO · SUBIDÓN 15 s', tint: '#00704a',
      desc: 'Vaso grande con un nombre mal escrito. Aliento lleno y 15 s de subidón.', use: { drink: true, fn: useCafe } }; },
    sangucheLucha: function () { return { name: 'SÁNGUCHE DE ' + bn('lalucha'), unit: 'sánguche', plural: 'sánguches', stack: 3, fx: '+25 VIDA', tint: '#c98a3a',
      desc: 'Chicharrón con camote en pan francés. Un clásico, aunque el fin del mundo no ayude.', use: { hp: 25, sick: 0.10 } }; },
    polloBelisario: function () { return { name: 'POLLO A LA BRASA ' + bn('belisario'), unit: 'cuarto de pollo', plural: 'cuartos de pollo', stack: 3, fx: '+30 VIDA', tint: '#e5133a',
      desc: 'Un cuarto con papas y ensalada. Las cremas, a tu riesgo.', use: { hp: 30, sick: 0.10 } }; },
    chaufaWok: function () { return { name: 'ARROZ CHAUFA ' + bn('chinawok'), unit: 'chaufa', plural: 'chaufas', stack: 3, fx: '+20 VIDA', tint: '#e30613',
      desc: 'En su cajita, con sillao. El wok sigue tibio… o eso parece.', use: { hp: 20, sick: 0.15 } }; },
    cintaTailoy: function () { return { name: 'CINTA DE EMBALAJE ' + bn('tailoy'), unit: 'cinta', plural: 'cintas', stack: 5, fx: '+10 GUITARRA', tint: '#00a160',
      desc: 'Cinta ancha de la librería. A la viola le queda un poco más de aguante (si no está rota).', use: { fn: useCinta } }; },
    picarones: function () { return { name: 'PICARONES CON MIEL', unit: 'picarón', plural: 'picarones', stack: 8, fx: '+25 VIDA', tint: '#c9772a',
      desc: 'De la carretilla de Doña Chancaca. Calientitos, con su miel de chancaca… y quién sabe qué más.', use: { fn: usePicarones } }; }
  };
  TOY_IDS.forEach(function (id) {
    ITEMS[id] = function () { var T0 = TOYS[id]; return { name: T0.name, unit: T0.short, plural: T0.short + 's', stack: T0.stack || 3, fx: 'EN LA MANO · USAR = AGARRAR', tint: T0.col,
      desc: T0.desc + ' F: lanzarlo (señuelo).', use: { fn: useToy } }; };
  });
  function registerItems() {
    var I = ACH.inv, D = I && I.defs; if (!D) return;
    for (var id in ITEMS) { var d = ITEMS[id](); if (D[id] && !D[id]._mira && !D[id]._soft) continue; d._mira = true; D[id] = d; }   // v0.11: _soft = provisorio de inventario.js
    ensureIcons();
  }
  function ensureIcons() {
    var S = ACH.sprites = ACH.sprites || {}, IT = S.items = S.items || {};
    Object.keys(ITEMS).forEach(function (id) {
      if (IT[id] && IT[id].width) return;
      var d = ACH.inv && ACH.inv.defs && ACH.inv.defs[id], col = (d && d.tint) || '#888';
      var c = document.createElement('canvas'); c.width = 12; c.height = 12;
      var g = c.getContext('2d'); g.fillStyle = '#131015'; g.fillRect(1, 1, 10, 10); g.fillStyle = col; g.fillRect(2, 2, 8, 8);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(2, 2, 8, 2);
      var big = document.createElement('canvas'); big.width = 24; big.height = 24;
      var bg = big.getContext('2d'); bg.imageSmoothingEnabled = false; bg.drawImage(c, 0, 0, 24, 24);
      if (M.label) M.label(bg, (d && d.unit) || id, 24, 24, '#f3efe2', 16);
      c.big = big; c.prov = true;
      IT[id] = c;
    });
  }
  function take(id) { return ACH.inv && ACH.inv.take ? ACH.inv.take(id, 1) : false; }
  function float(p, s) { toast(s); }
  function useToy(id, p, G) {
    var A = ACH.armas; if (!A || !A.defs[id]) { toast('Eso se lleva en la mano… cuando haya manos.'); return false; }
    if (p.held && p.held.id === id) { toast('Ya lo tienes en la mano, causa.'); return false; }
    if (p.held) A.drop();
    if (!take(id)) return false;
    try { aliasPoses(id); } catch (e) { /* sin pose: se ve el juguete suelto en la mano */ }
    var L = A.spawnLoose(id, p.x, p.y + 1, 0, 0); if (!L) return false;
    A.grab(L);
    sfx('grab', { x: p.x, y: p.y, id: id });
    toast('¡' + TOYS[id].name + ' en la mano! · F lanzar · E soltar');
    return true;
  }
  function useCafe(id, p) {
    var C = ACH.ent.CFG;
    if (!take(id)) return false;
    p.stamina = C.staminaMax; p.exhausted = false; p.boostT = 15;
    sfx('item.drink', { x: p.x, y: p.y });
    float(p, '¡Café pituco! Aliento lleno y 15 s de subidón');
    return true;
  }
  function useCinta(id, p) {
    var A = ACH.armas, gu = p.guitar;
    if (!A || !A.repairGuitar) { toast('Cinta para después, causa.'); return false; }
    if (gu && gu.dur <= 0) { toast('Una guitarra partida ya no se emparcha.'); return false; }
    if (gu && gu.dur >= gu.max) { toast('La viola está al cien, causa. Guárdala.'); return false; }
    var r; try { r = A.repairGuitar(10); } catch (e) { r = false; }
    if (r === false) return false;
    take(id); sfx('grab', { x: p.x, y: p.y });
    toast('La emparchaste, causa (+10 guitarra)');
    return true;
  }
  function usePicarones(id, p) {
    var C = ACH.ent.CFG, I = ACH.inv, cfg = (I && I.cfg) || {};
    if (p.hp >= C.hpMax) { toast('Estás sano, causa. Guárdalos.'); return false; }
    if (!take(id)) return false;
    sfx('item.eat', { x: p.x, y: p.y });
    var sick = cfg.forceSick === true ? true : cfg.forceSick === false ? false : Math.random() < 0.15;
    if (sick) {
      p.hp = Math.max(1, p.hp - (cfg.sickHp || 8)); p.sickT = cfg.sickT || 4;
      sfx('item.sick', { x: p.x, y: p.y });
      if (M.say) M.say('picaronSick', { who: 'alex', x: p.x, y: p.y, always: true }, '¡Esa miel tenía abeja adentro!');
      toast('¡Esa miel tenía abeja adentro!');
    } else { var b = p.hp; p.hp = Math.min(C.hpMax, p.hp + 25); toast('+' + Math.round(p.hp - b) + ' vida · ¡qué ricos!'); }
    return true;
  }

  /* ---------------- Vendedores ---------------- */
  var vendors = [];
  function setupVendors() {
    vendors.length = 0;
    var W = ACH.world, V = W.vendors || [];
    if (!W.dynSolids) W.dynSolids = [];
    for (var i = W.dynSolids.length - 1; i >= 0; i--) if (W.dynSolids[i].vendor) W.dynSolids.splice(i, 1);
    V.forEach(function (v) {
      var ds = { x0: v.x - 5, y0: v.y - 4, x1: v.x + 5, y1: v.y, vendor: v.id };
      W.dynSolids.push(ds); v._ds = ds;
      vendors.push({ id: v.id, name: v.name, x: v.x, y: v.y, v: v.v || 0, t: Math.random() * 4, callT: 3 + Math.random() * 5 });
    });
  }
  function vendorFrames(vi, vid) {
    var VS = ACH.sprites && ACH.sprites.mira && ACH.sprites.mira.vendedor, o = null;
    if (VS && vid && VS[vid] && Array.isArray(VS[vid].idle)) o = VS[vid].idle; else
    if (Array.isArray(VS)) o = VS[vi % VS.length] && (VS[vi % VS.length].idle || VS[vi % VS.length]);
    else if (VS) o = (vi && (VS.idle2 || (VS.variants && VS.variants[vi] && VS.variants[vi].idle))) || VS.idle;
    if (Array.isArray(o) && o.length && o[0] && o[0].width) return o;
    return null;
  }
  var vendPH = [];
  function vendorPH(vi) {
    if (vendPH[vi]) return vendPH[vi];
    var c = document.createElement('canvas'); c.width = 26; c.height = 40;
    var g = c.getContext('2d'), K = '#131015', shirt = vi ? '#3a6ab8' : '#b84a3a';
    function r(x, y, w, h, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y, w, h); }
    r(19, 0, 2, 40, '#c9b08a');                                                       // el palo
    [['#e8402c', 15, 1], ['#ffe500', 21, 4], ['#3a8ae8', 14, 9], ['#1fe07a', 21, 12], ['#ff2e88', 16, 16]].forEach(function (b) { r(b[1], b[2], 5, 5, b[0]); });
    r(5, 26, 4, 13, '#3a3a48'); r(10, 26, 4, 13, '#3a3a48');                       // piernas
    r(4, 14, 11, 13, shirt); r(6, 6, 7, 8, '#c98a6a'); r(5, 4, 9, 3, vi ? '#e8b830' : '#2a4a8a');   // cuerpo, cara, gorra
    c.ax = 10; c.ay = 39;
    vendPH[vi] = c; return c;
  }

  /* ---------------- Tienda: v0.11 (B) la atiende la tienda genérica ACH.tienda (js/engine/tienda.js) con ACH.VENDEDORES_DATA.pepe/tito.
     Lo de abajo (panel propio de v0.10) queda solo de respaldo si tienda.js no está cargado. */
  function tiendaOpen() { var Ti = ACH.tienda; return !!(Ti && typeof Ti.isOpen === 'function' && Ti.isOpen()); }
  var shop = { open: false, v: null, el: null, items: [], msg: null, coins: null, title: null };
  function buildShop() {
    if (shop.el) return shop.el;
    var stage = document.getElementById('stage'); if (!stage) return null;
    var el = document.createElement('div'); el.id = 'mshop'; el.className = 'mshop'; el.setAttribute('data-ui', '');
    el.innerHTML = '<div class="mshop-poster"><p class="mshop-k">PUESTO DE INFLABLES</p><h2 class="mshop-t"></h2>' +
      '<p class="mshop-pregon">¡Martillos, espadas, burbujas! ¡Pa’ los chiquitos y pa’ reventar muertos!</p>' +
      '<div class="mshop-items"></div><p class="mshop-msg"></p>' +
      '<div class="mshop-foot"><span class="mshop-coins"></span><span><b>1-3</b> comprar · <b>E</b> / <b>ESC</b> cerrar</span>' +
      '<button type="button" tabindex="-1" class="mshop-close">CERRAR</button></div></div>';
    stage.appendChild(el);
    var host = el.querySelector('.mshop-items');
    TOY_IDS.forEach(function (id, i) {
      var b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.className = 'mshop-it';
      b.innerHTML = '<b class="k">' + (i + 1) + '</b><canvas width="24" height="24"></canvas><span class="n"></span><span class="p"></span><span class="d"></span>';
      b.addEventListener('click', function (e) { e.preventDefault(); buy(i); b.blur(); });
      host.appendChild(b);
      shop.items.push(b);
    });
    el.querySelector('.mshop-close').addEventListener('click', function (e) { e.preventDefault(); closeShop(); });
    shop.el = el; shop.msg = el.querySelector('.mshop-msg'); shop.coins = el.querySelector('.mshop-coins'); shop.title = el.querySelector('.mshop-t');
    return el;
  }
  function coins() { return ACH.inv && ACH.inv.count ? ACH.inv.count('sencillo') : 0; }
  function refreshShop() {
    if (!shop.el) return;
    TOY_IDS.forEach(function (id, i) {
      var b = shop.items[i], T0 = TOYS[id], cv = b.querySelector('canvas'), g = cv.getContext('2d');
      g.imageSmoothingEnabled = false; g.clearRect(0, 0, 24, 24);
      var ic = ACH.sprites && ACH.sprites.items && ACH.sprites.items[id], big = ic && ic.big && ic.big.width ? ic.big : ic;
      if (big && big.width) g.drawImage(big, 0, 0, 24, 24);
      b.querySelector('.n').textContent = T0.name;
      b.querySelector('.p').textContent = 'S/ ' + T0.price + ' sencillos';
      b.querySelector('.d').textContent = T0.desc;
      b.classList.toggle('poor', coins() < T0.price);
    });
    shop.coins.textContent = 'Tienes ' + coins() + ' sencillos';
  }
  function say(s) { if (!shop.msg) return; shop.msg.textContent = s; shop.msg.classList.remove('flash'); void shop.msg.offsetWidth; shop.msg.classList.add('flash'); }
  function openShop(v) {
    var Ti = ACH.tienda;
    if (Ti && typeof Ti.open === 'function' && ACH.VENDEDORES_DATA && ACH.VENDEDORES_DATA[v.id]) {
      var ok = false; try { ok = Ti.open(v.id, { x: v.x, y: v.y }); } catch (e) { ok = false; }
      if (ok && M.say) M.say('vendedor.pregon', { who: 'vendedor', x: v.x, y: v.y }, '¡Martillos, espadas, burbujas! ¡Pa’ los chiquitos y pa’ reventar muertos!');
      return ok;
    }
    if (!buildShop()) return false;
    if (ACH.inv && ACH.inv.isOpen && origInvOpen && origInvOpen()) return false;
    shop.open = true; shop.v = v;
    shop.title.textContent = '— ' + v.name;
    shop.el.classList.add('on');
    refreshShop(); say('');
    sfx('shop.open', { x: v.x, y: v.y });
    if (M.say) M.say('vendedor.pregon', { who: 'vendedor', x: v.x, y: v.y }, '¡Martillos, espadas, burbujas! ¡Pa’ los chiquitos y pa’ reventar muertos!');
    return true;
  }
  function closeShop() {
    if (tiendaOpen()) { try { ACH.tienda.close(); } catch (e) { /* nada */ } }
    if (!shop.open) return;
    shop.open = false;
    if (shop.el) shop.el.classList.remove('on');
    if (ACH.input && ACH.input.reset) ACH.input.reset();   // nada queda apretado al volver al juego
    sfx('ui.back');
  }
  function buy(i) {
    var id = TOY_IDS[i]; if (!id || !shop.open) return false;
    var T0 = TOYS[id], I = ACH.inv;
    if (!I) return false;
    if (coins() < T0.price) { say('Aquí es precio Miraflores, joven.'); sfx('shop.nomoney'); return false; }
    I.take('sencillo', T0.price);
    var left = I.add(id, 1);
    if (left > 0) { I.add('sencillo', T0.price); say('Tu mochila está llena, joven.'); sfx('shop.nomoney'); refreshShop(); return false; }
    sfx('shop.buy', { id: id });
    say('¡Gracias, joven, vuelva pronto! (' + T0.name.toLowerCase() + ' en la mochila)');
    if (M.say && shop.v) M.say('vendedor.gracias', { who: 'vendedor', x: shop.v.x, y: shop.v.y }, '¡Gracias, joven, vuelva pronto!');
    if (I.sync) { try { I.sync(); } catch (e) { /* nada */ } }
    refreshShop();
    return true;
  }
  // teclas con la tienda abierta: se atrapan antes que input.js (fase de captura), así ESC no pausa ni E agarra
  // QA: este oyente iba en window/captura DESPUÉS del de inventario.js, que ya había usado el objeto rápido 1-3 y abierto la mochila con I/Tab.
  // Ahora se registra en M.keyGate (nivel.js, primero en cargar) y corre antes que el inventario.
  function shopKey(e) {
    if (!shop.open || (ACH.G && ACH.G.state !== 'playing')) return false;   // en pausa (p. ej. se perdió el foco) ESC llega a game.js y reanuda
    var c = e.code || e.key, n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[c];
    if (n !== undefined) { if (!e.repeat) buy(n); }
    else if (c === 'Escape' || c === 'KeyE') closeShop();
    else if (!/^(KeyI|Tab|Space|KeyQ|KeyF|Digit4|Numpad4)$/.test(c)) return false;
    return true;
  }
  if (M.keyGate) M.keyGate.push(shopKey);
  else window.addEventListener('keydown', function (e) { if (shopKey(e) === true) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  // el juego queda en pausa: game.js congela la simulación mientras ACH.inv.isOpen() es verdadero
  var origInvOpen = null;
  function wrapInvOpen() {
    var I = ACH.inv; if (!I || !I.isOpen || I.isOpen._mira) return;
    origInvOpen = I.isOpen;
    I.isOpen = function () { return shop.open || origInvOpen.apply(this, arguments); };
    I.isOpen._mira = true;
  }

  /* ---------------- Piletas: monedas ---------------- */
  var coinsTaken = {};
  function nearWater(p, pad) {
    var Wt = ACH.world.water || [];
    for (var i = 0; i < Wt.length; i++) {
      var w = Wt[i], dx = (p.x - w.x) / (w.r + pad), dy = (p.y - w.y) / ((w.ry || w.r * 0.4) + pad);
      if (dx * dx + dy * dy < 1) return w;
    }
    return null;
  }

  /* ---------------- E: vendedor o pileta antes que agarrar/soltar (envuelve ACH.armas.update) ---------------- */
  var near = { v: null, w: null };
  function computeNear(G) {
    var p = G.player; near.v = null; near.w = null;
    if (!p || p.hp <= 0) return;
    for (var i = 0; i < vendors.length; i++) if (dist(p.x, p.y, vendors[i].x, vendors[i].y) < 24) { near.v = vendors[i]; return; }
    var w = nearWater(p, 10); if (w && !coinsTaken[w.id]) near.w = w;
  }
  function interact(G) {
    var p = G.player;
    if (near.v) return openShop(near.v);
    if (near.w) {
      coinsTaken[near.w.id] = true;
      if (ACH.inv && ACH.inv.add) ACH.inv.add('sencillo', 3);
      sfx('pileta.coins', { x: p.x, y: p.y });
      toast('+3 sencillos · ¿Quién tira plata a una pileta en pleno fin del mundo?');
      if (M.say) M.say('piletaCoins', { who: 'alex', x: p.x, y: p.y }, '¿Quién tira plata a una pileta en pleno fin del mundo?');
      return true;
    }
    return false;
  }
  function wrapArmas() {
    var A = ACH.armas; if (!A || A.update._mira) return;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input;
      if (G && G.state === 'playing' && G.player) {
        computeNear(G);
        for (var i = 0; i < A.loose.length; i++) { var L = A.loose[i]; if (TOYS[L.id] && L.thrown) { L.thrown = false; startDecoy(L); } }   // inflable lanzado: rebota sin hacer daño
        if (In && In.pressed('KeyE') && (near.v || near.w) && interact(G)) {
          var op = In.pressed;
          In.pressed = function (c) { return c === 'KeyE' ? false : op(c); };
          try { return origU.apply(this, arguments); } finally { In.pressed = op; }
        }
      }
      return origU.apply(this, arguments);
    };
    A.update._mira = true;
    if (origC) A.context = function () { if (near.v) return { label: 'COMPRAR', code: 'KeyE' }; if (near.w) return { label: 'MONEDAS', code: 'KeyE' }; return origC.apply(this, arguments); };
  }

  /* ---------------- Señuelo: el inflable lanzado ---------------- */
  var decoys = [];
  function startDecoy(L) { decoys.push({ L: L, t: DECOY.t }); }
  function updateDecoys(G, dt) {
    for (var i = decoys.length - 1; i >= 0; i--) {
      var d = decoys[i]; d.t -= dt;
      if (d.t <= 0 || ACH.armas.loose.indexOf(d.L) < 0 || d.L.state === 'held') { decoys.splice(i, 1); continue; }
      for (var k = 0; k < G.zombies.length; k++) {
        var z = G.zombies[k];
        if (z.state === 'muerto' || z.social || z.state === 'perseguir' || z.state === 'atacar' || z.state === 'golpeado') continue;
        if (dist(z.x, z.y, d.L.x, d.L.y) > DECOY.r) continue;
        z.state = 'investigar'; z.tx = d.L.x; z.ty = d.L.y + 6;
      }
    }
  }

  /* ---------------- Burbujas ---------------- */
  var bubbles = [], pops = [];
  function shoot(G, sw) {
    var p = G.player;
    for (var k = -1; k <= 1; k++) {
      var a = sw.ang + k * BUB.fan;
      bubbles.push({ x: p.x + Math.cos(a) * 8, y: p.y - 2 + Math.sin(a) * 5, vx: Math.cos(a) * BUB.sp * rnd(0.9, 1.1), vy: Math.sin(a) * BUB.sp * rnd(0.9, 1.1),
        z: 10, d: 0, t: 0, ph: Math.random() * 6.28 });
    }
    var h = p.held;
    if (h) {
      h.dur -= 1;
      if (h.dur <= 0) {   // se acabó el jabón
        var L = h.L; p.held = null; if (L) ACH.armas.removeLoose(L);
        sfx('inflable.pop', { x: p.x, y: p.y, toy: 'pistolaBurbujas' }); toast('Se acabó el jabón de la pistola, causa.');
      }
    }
  }
  function popBubble(b, why) { pops.push({ x: b.x, y: b.y - b.z, t: 0 }); if (pops.length > 12) pops.shift(); sfx('burbujas.pop', { x: b.x, y: b.y, why: why }); }
  function updateBubbles(G, dt) {
    var W = ACH.world, N = ACH.nivel;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i], sx = b.vx * dt, sy = b.vy * dt, gone = null;
      b.t += dt; b.d += Math.sqrt(sx * sx + sy * sy); b.x += sx; b.y += sy; b.z = 10 + Math.sin(b.t * 6 + b.ph) * 2;
      if (b.d >= BUB.range) gone = 'air';
      else if (W.isSolidTile(Math.floor(b.x / W.T), Math.floor(b.y / W.T))) gone = 'wall';
      else if (N && N.onProjectile && N.onProjectile(G, { x: b.x, y: b.y, z: b.z, r: BUB.r, dmg: 0, kind: 'bubble', bees: 1 })) gone = 'bees';
      else {
        for (var k = 0; k < G.zombies.length; k++) {
          var z = G.zombies[k];
          if (z.state === 'muerto' || dist(z.x, z.y - 8, b.x, b.y) > BUB.r + 4) continue;
          bobo(z); gone = 'zombie'; break;
        }
      }
      if (gone) { popBubble(b, gone); bubbles.splice(i, 1); }
    }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.3) pops.splice(i, 1); }
  }
  function bobo(z) { z.boboT = BUB.bobo; z.boboX = z.x; z.boboY = z.y; z.lungeT = 0; }
  function updateBobos(G, dt) {
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i]; if (!(z.boboT > 0)) continue;
      if (z.state === 'muerto') { z.boboT = 0; continue; }
      z.boboT -= dt; z.x = z.boboX; z.y = z.boboY; z.moving = false; z.lungeT = 0;
      if (z.atkCD < 0.3) z.atkCD = 0.3;
    }
  }
  function bubbleSpr(f) {
    var B = ACH.sprites && ACH.sprites.mira && ACH.sprites.mira.burbuja;
    if (Array.isArray(B) && B[f] && B[f].width) return B[f];
    return null;
  }
  var popParts = [];
  function popFx(x, y, col) { for (var i = 0; i < 10; i++) { var a = Math.random() * 6.28, s = rnd(30, 80); popParts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, col: i % 2 ? col : '#f3efe2' }); } }

  // hint de controles: «E agarrar» → «E comprar/agarrar» (MIRAFLORES.md §8)
  function fixHint() {
    var h = document.getElementById('hint'); if (!h || /E comprar/.test(h.textContent)) return;
    if (/E agarrar/.test(h.textContent)) h.textContent = h.textContent.replace('E agarrar', 'E comprar/agarrar');
    else h.textContent += ' · E comprar/agarrar';
  }

  /* ---------------- Sistema ---------------- */
  var startCoins = false;
  // v0.13 (F1): los 3 sencillos de arranque solo si la página empieza SIN carry de mochila (antes se regalaban en cada llegada: farmeable).
  // Se sabe porque ACH.viaje.take() (lo llama game.js en Miraflores y nivel.js en Costa Verde, siempre después de cargar este archivo) devolvió un viaje con carry;
  // y, por si la partida se retoma en la misma página (CONTINUAR), tampoco si la mochila ya trae algo al primer paso.
  var arrivedCarry = false;
  (function () {
    var V = ACH.viaje; if (!V || typeof V.take !== 'function' || V.take._carry) return;
    var o = V.take;
    V.take = function () { var r = o.apply(this, arguments); try { if (r && r.carry) arrivedCarry = true; } catch (e) { /* nada */ } return r; };
    V.take._carry = true;
  })();
  function bagHasItems() {
    try { var sn = ACH.inv && ACH.inv.snapshot && ACH.inv.snapshot(); if (sn && sn.slots) for (var i = 0; i < sn.slots.length; i++) if (sn.slots[i]) return true; } catch (e) { /* nada */ }
    return false;
  }
  M.register({
    name: 'inflables',
    reset: function (G) {
      registerItems(); defineToys(); wrapPoseFrame(); wrapArmas(); wrapInvOpen(); setupVendors();
      coinsTaken = {}; bubbles.length = 0; pops.length = 0; decoys.length = 0; popParts.length = 0;
      if (shop.open || tiendaOpen()) closeShop();
      // QA: inventario.js vacía la mochila al entrar al estado 'intro' (después de este reset): los 3 sencillos se dan en el primer paso de juego
      startCoins = !arrivedCarry;
      fixHint();
    },
    onRespawn: function () { bubbles.length = 0; decoys.length = 0; if (shop.open || tiendaOpen()) closeShop(); },
    update: function (G, dt) {
      if (startCoins) { startCoins = false; if (!arrivedCarry && !bagHasItems() && ACH.inv && ACH.inv.add) ACH.inv.add('sencillo', 3); }   // Alexander empieza con 3 sencillos (solo sin carry: F1)
      updateDecoys(G, dt); updateBubbles(G, dt); updateBobos(G, dt);
      for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i]; v.t += dt; v.callT -= dt;
        if (v.callT <= 0) {
          v.callT = rnd(9, 16);
          var p = G.player; if (p && dist(p.x, p.y, v.x, v.y) < 170 && M.say) M.say('vendedor.pregon', { who: 'vendedor', x: v.x, y: v.y }, '¡Martillos, espadas, burbujas! ¡Pa’ los chiquitos y pa’ reventar muertos!');
        }
      }
      for (i = popParts.length - 1; i >= 0; i--) { var q = popParts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; if (q.t > 0.45) popParts.splice(i, 1); }
    },
    // martillo: aturde 0,6 s a los que golpeó · pistola: dispara burbujas (no golpea)
    onSwing: function (G, sw) {
      var id = sw.kind && sw.kind.indexOf('held:') === 0 ? sw.kind.slice(5) : null, T0 = id && TOYS[id];
      if (!T0) return 0;
      if (T0.shots) { shoot(G, sw); return 0; }
      if (T0.stun) {
        // QA: antes solo aturdía a los que YA estaban 'golpeado' (los marca entities.hitZombie justo antes de llamar aquí). Una llamada directa
        // a ACH.nivel.onSwing (o un golpe que el motor no marcó) no aturdía a nadie. Ahora se escoge por el arco del golpe (el mismo que usa
        // entities.swingHit: alcance + media huella, ángulo ± arco/2, a menos de 4 px no cuenta el ángulo) y se deja a cada vivo en 'golpeado' 0,6 s.
        var zr = ((ACH.ent && ACH.ent.CFG && ACH.ent.CFG.zRadius) || 5) * 0.5;
        for (var i = 0; i < G.zombies.length; i++) {
          var z = G.zombies[i]; if (z.state === 'muerto' || z.social) continue;
          var dx = z.x - sw.x, dy = z.y - sw.y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd > sw.range + zr) continue;
          if (dd > 4) { var a = Math.atan2(dy, dx) - sw.ang; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (Math.abs(a) > sw.arc / 2) continue; }
          if (z.state !== 'golpeado') z.state = 'golpeado';
          z.stunT = Math.max(z.stunT || 0, T0.stun);
        }
      }
      return 0;
    },
    drawables: function (G, out) {
      var cam = G.cam, V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
      vendors.forEach(function (v, vi) {
        if (v.x < cam.x - 40 || v.x > cam.x + V.w + 40 || v.y < cam.y - 20 || v.y > cam.y + V.h + 60) return;
        out.push({ y: v.y, x: v.x, draw: function (g, cx, cy) {
          var fr = vendorFrames(v.v, v.id), s = fr ? fr[Math.floor(v.t * 4) % fr.length] : vendorPH(v.v);
          var ax = s.ax !== undefined ? s.ax : s.width >> 1, ay = s.ay !== undefined ? s.ay : s.height - 1, bob = fr ? 0 : (Math.floor(v.t * 2) % 2);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(Math.round(v.x) - cx - 6, Math.round(v.y) - cy - 1, 12, 3);
          g.drawImage(s, Math.round(v.x) - cx - ax, Math.round(v.y) - cy - ay - bob);
        } });
      });
    },
    drawTop: function (g, G, cx, cy) {
      var i, b;
      for (i = 0; i < bubbles.length; i++) {
        b = bubbles[i];
        var x = Math.round(b.x) - cx, y = Math.round(b.y - b.z) - cy, s = bubbleSpr(Math.floor(b.t * 6) % 2);
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(Math.round(b.x) - cx - 2, Math.round(b.y) - cy, 4, 1);
        if (s) g.drawImage(s, x - (s.width >> 1), y - (s.height >> 1));
        else {
          g.strokeStyle = 'rgba(200,240,255,.9)'; g.lineWidth = 1; g.beginPath(); g.arc(x + 0.5, y + 0.5, 3.5, 0, 6.3); g.stroke();
          g.fillStyle = 'rgba(255,170,230,.35)'; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = '#ffffff'; g.fillRect(x - 2, y - 2, 1, 1);
        }
      }
      for (i = 0; i < pops.length; i++) {
        var pp = pops[i], ps = bubbleSpr(2), px0 = Math.round(pp.x) - cx, py0 = Math.round(pp.y) - cy;
        if (ps) g.drawImage(ps, px0 - (ps.width >> 1), py0 - (ps.height >> 1));
        else { g.fillStyle = 'rgba(220,245,255,' + (1 - pp.t / 0.3) + ')'; var rr = 2 + pp.t * 20; g.fillRect(px0 - rr, py0, 1, 1); g.fillRect(px0 + rr, py0, 1, 1); g.fillRect(px0, py0 - rr, 1, 1); g.fillRect(px0, py0 + rr, 1, 1); }
      }
      for (i = 0; i < popParts.length; i++) { var q = popParts[i]; g.fillStyle = q.col; g.fillRect(Math.round(q.x) - cx, Math.round(q.y) - cy, 1, 1); }
      // embobados: estrellitas sobre la cabeza
      for (i = 0; i < G.zombies.length; i++) {
        var z = G.zombies[i]; if (!(z.boboT > 0)) continue;
        var a = G.clock * 6, zx = Math.round(z.x) - cx, zy = Math.round(z.y) - cy - 32;
        g.fillStyle = '#ffe500'; g.fillRect(zx + Math.round(Math.cos(a) * 6), zy + Math.round(Math.sin(a) * 2), 2, 2);
        g.fillStyle = '#bfe8ff'; g.fillRect(zx + Math.round(Math.cos(a + 3.1) * 6), zy + Math.round(Math.sin(a + 3.1) * 2), 2, 2);
      }
      // aviso flotante «E comprar inflables» / «E sacar monedas»
      if (G.state !== 'playing' || shop.open || tiendaOpen() || (ACH.touch && ACH.touch.on)) return;
      var tgt = near.v ? { x: near.v.x, y: near.v.y - 46, s: 'E comprar inflables' } : near.w ? { x: G.player.x, y: G.player.y - 40, s: 'E sacar monedas' } : null;
      if (!tgt) return;
      g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var w = Math.ceil(g.measureText(tgt.s).width) + 6, bx = Math.round(tgt.x) - cx, by = Math.round(tgt.y) - cy;
      g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(bx - (w >> 1), by - 5, w, 10);
      g.globalAlpha = 1; g.fillStyle = '#ff2e88'; g.fillRect(bx - (w >> 1), by + 5, w, 1);
      g.fillStyle = '#f2f2f2'; g.fillText(tgt.s, bx, by);
      g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }
  });

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  var DM = ACH.debug.mira = ACH.debug.mira || {};
  DM.shop = function (which) {
    var G = ACH.G; if (!G) return null;
    if (which === false) { closeShop(); return { open: false }; }
    if (!vendors.length) setupVendors();
    var v = vendors.filter(function (q) { return q.id === which; })[0] || vendors[vendors.length - 1];
    if (G.state !== 'playing' && ACH.debug.start) ACH.debug.start();
    if (v && !shop.open && !tiendaOpen()) openShop(v);
    return { open: shop.open || tiendaOpen(), vendor: v && v.name, coins: coins(), items: ACH.tienda && ACH.tienda.rows ? ACH.tienda.rows() : TOY_IDS.map(function (id) { return { id: id, price: TOYS[id].price, have: ACH.inv ? ACH.inv.count(id) : 0 }; }) };
  };
  DM.buy = function (i) { if (tiendaOpen()) return ACH.tienda.buy(i); return buy(i); };
  DM.bubbles = function () { return bubbles.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), d: Math.round(b.d) }; }); };
  DM.equip = function (id) { var G = ACH.G; id = id || 'martilloInflable'; if (ACH.inv) ACH.inv.add(id, 1); return G ? useToy(id, G.player, G) : false; };
  DM.tp = function (name) {
    var W = ACH.world, P = W.places || {}, q = P[name];
    if (!q) return { error: 'lugares: ' + Object.keys(P).join(', ') };
    if (ACH.debug.teleport) ACH.debug.teleport(q.x, q.y);
    return { x: q.x, y: q.y };
  };
  DM.trabajadores = function () { return M.trabajadores ? M.trabajadores() : []; };
  DM.water = function () { return (ACH.world.water || []).map(function (w) { return { id: w.id, x: w.x, y: w.y, r: w.r, ry: w.ry, coins: !coinsTaken[w.id] }; }); };
  DM.state = function () { return { shop: shop.open || tiendaOpen(), near: near.v ? near.v.id : near.w ? 'pileta ' + near.w.id : null, decoys: decoys.length, bubbles: bubbles.length }; };
})();
