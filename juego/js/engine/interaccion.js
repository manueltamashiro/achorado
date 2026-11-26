/* ACHORADO — js/engine/interaccion.js (v0.6, F1): objetos rompibles (autos, basura, carretillas, postes), alarmas de auto,
   vidrio que cruje, gatos que huyen y se esconden, perros golpeados y la resortera (piedras con arco, sombra y chanfle).
   API: ACH.inter = { hitProps, hitAnimals, updateSling, slingActive, slingPose, molotovPose(G)→-1|0|1|2, cycleRanged(G), rangedInfo(G), update, reset, drawGround, drawFx, drawAim, drawCat,
                      lightsInto, simulate, cats, props, SL } */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var STEP = 1 / 60;

  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) au.emit(name, data); }
  function say(id, x, y) { var au = ACH.audio; if (au && au.say) { try { au.say(id, { who: 'alex', x: x, y: y }); } catch (e) { /* nada */ } } }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function noise(G, x, y, r) { if (ACH.ent && ACH.ent.emitNoise) ACH.ent.emitNoise(G, x, y, r); }
  function invDrop(x, y, items) { var I = ACH.inv; if (I && I.drop && items.length) { try { I.drop(x, y, items); } catch (e) { console.warn('[ACHORADO] inv.drop', e); } } }
  function invHas(id) { var I = ACH.inv; return !!(I && I.has && I.has(id)); }
  function toast(t) { if (ACH.hud && ACH.hud.toast) ACH.hud.toast(t); }

  /* ---------------- Tabla de props que reaccionan (SPEC v0.6) ----------------
     cls: car (estados 0→3, alarma, guantera) · metal (indestructible: chapa y ruido) · trash (se vuelca) · cart (se rompe una vez,
     suelta comida) · pole (chispas, el foco se apaga). h = alto en px hasta donde una piedra en vuelo lo choca. */
  var KINDS = {
    car: { cls: 'car', hp: 4, h: 22 }, carVar: { cls: 'car', hp: 4, h: 22 }, tico: { cls: 'car', hp: 4, h: 22 },
    mototaxi: { cls: 'car', hp: 3, h: 24 }, mototaxiVar: { cls: 'car', hp: 3, h: 24 },
    combi: { cls: 'car', hp: 6, h: 34 }, combiE: { cls: 'car', hp: 6, h: 34 }, combiN: { cls: 'car', hp: 6, h: 34 }, combiS: { cls: 'car', hp: 6, h: 34 },
    custer: { cls: 'car', hp: 8, h: 38 }, custerE: { cls: 'car', hp: 8, h: 38 },
    trailer: { cls: 'metal', h: 44 }, trailerLargo: { cls: 'metal', h: 44 }, contenedor: { cls: 'metal', h: 40 }, tracto: { cls: 'metal', h: 40 },
    paradero: { cls: 'metal', h: 34 },
    trash: { cls: 'trash', hp: 2, h: 14 }, bags: { cls: 'trash', hp: 1, h: 9 }, bolsas: { cls: 'trash', hp: 1, h: 9 },
    emoliente: { cls: 'cart', hp: 3, h: 24 }, anticuchos: { cls: 'cart', hp: 3, h: 24 }, quiosco: { cls: 'cart', hp: 3, h: 30 }, triciclo: { cls: 'cart', hp: 3, h: 20 },
    poste: { cls: 'pole', hp: 2, h: 90 }, posteCables: { cls: 'pole', hp: 2, h: 90 }, posteAfiche: { cls: 'pole', hp: 2, h: 90 },
    posteAfiches: { cls: 'pole', hp: 2, h: 90 }, posteLuz: { cls: 'pole', hp: 2, h: 90 }, semaforo: { cls: 'pole', hp: 2, h: 70 },
    // v0.9 (H3, SPEC §8): basura rompible del Cerro. cls 'junk': estados .dmg[] por golpe y .broken al romperse, botín según `loot`.
    refri: { cls: 'junk', hp: 4, h: 28, loot: 'refri', mat: 'metal', hard: true, hitSfx: 'fridge.hit', breakSfx: 'fridge.open', noise: 100 },
    refriTirada: { cls: 'junk', hp: 4, h: 12, loot: 'refri', mat: 'metal', hard: true, hitSfx: 'fridge.hit', breakSfx: 'fridge.open', noise: 100 },
    tele: { cls: 'junk', hp: 2, h: 18, loot: 'tele', mat: 'glass', hitSfx: 'prop.hit.glass', breakSfx: 'tele.crash', noise: 90, sparks: true },
    sillaRota: { cls: 'junk', hp: 1, h: 16, loot: 'silla', mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 60 },
    mesaVolteada: { cls: 'junk', hp: 2, h: 14, loot: 'mesa', mat: 'wood', hitSfx: 'prop.hit.wood', breakSfx: 'prop.break.cart', noise: 60 },
    cilindroAzul: { cls: 'junk', hp: 3, h: 22, loot: null, mat: 'water', hitSfx: 'prop.hit.metal', breakSfx: 'balde.splash', noise: 80, water: true },
    bolsasCerro: { cls: 'trash', hp: 1, h: 12, loot: 'bolsas' },
    colchon: { cls: 'soft', h: 10, hitSfx: 'prop.hit.soft' }, llanta: { cls: 'soft', h: 10, hitSfx: 'prop.hit.rubber' }
  };
  var GAS = /^(mototaxi|tico)/;   // v0.9: mototaxis y Tico sueltan gasolina (1–2) al destruirse
  // variantes hacia el oeste (combiW, ticoW, carVarW, mototaxiVarW, custerW…) = la misma ficha
  function kindOf(k) { return KINDS[k] || KINDS[String(k).replace(/W$/, '')] || null; }

  var CFG = {
    carNoise: 120, poleNoise: 140, metalNoise: 120, alarmChance: 0.4, alarmT: 6, alarmNoise: 280, alarmEvery: 1,
    trashLoot: 0.3, glassNoise: 60, glassR: 9, glassCD: 0.5, lampFlickT: 1.2
  };
  // botín (ids de inventario, SPEC v0.6)
  function gloveLoot() {
    var out = [{ id: 'sencillo', n: 3 + Math.floor(Math.random() * 10) }], r = Math.random();
    if (r < 0.35) out.push({ id: 'curitas', n: 1 }); else if (r < 0.65) out.push({ id: 'gaseosa', n: 1 }); else if (r < 0.8) out.push({ id: 'estampita', n: 1 });
    return out;
  }
  function trashLoot() {
    var r = Math.random();
    if (r < 0.6) return [{ id: 'piedras', n: 2 + Math.floor(Math.random() * 3) }];
    if (r < 0.85) return [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }];
    return [{ id: 'gaseosa', n: 1 }];
  }
  // v0.9 (H3): botín de la basura del Cerro (SPEC §8)
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function junkLoot(kind) {
    var r = Math.random(), out = [];
    if (kind === 'refri') {
      if (r < 0.8) out.push(pick([{ id: 'taper', n: 1 }, { id: 'gaseosa', n: 1 }, { id: 'agua', n: 1 }, { id: 'taper', n: 1 }, { id: 'agua', n: 1 }]));
      if (Math.random() < 0.04) out.push({ id: 'colaInglesa', n: 1 });
    } else if (kind === 'tele') {
      if (r < 0.4) out.push(pick([{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }, { id: 'cuerdas', n: 1 }, { id: 'trapo', n: 1 }]));
    } else if (kind === 'silla') {
      if (r < 0.3) out.push(pick([{ id: 'piedras', n: 2 + Math.floor(Math.random() * 3) }, { id: 'trapo', n: 1 }]));
    } else if (kind === 'mesa') {
      if (r < 0.4) out.push(pick([{ id: 'botella', n: 1 }, { id: 'trapo', n: 1 }, { id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }]));
    } else if (kind === 'bolsas') {
      if (r < 0.6) out.push(pick([{ id: 'botella', n: 1 }, { id: 'trapo', n: 1 }, { id: 'piedras', n: 2 + Math.floor(Math.random() * 3) },
        { id: Math.random() < 0.5 ? 'taper' : 'anticucho', n: 1 }]));
      if (Math.random() < 0.06) out.push({ id: 'gasolina', n: 1 });   // algún bidón en el basural
      if (Math.random() < 0.03) out.push({ id: 'molotov', n: 1 });    // botín raro: ya armado
    }
    return out;
  }
  var CART_LOOT = {
    emoliente: [{ id: 'emoliente', n: 2 }], anticuchos: [{ id: 'anticucho', n: 3 }],
    quiosco: [{ id: 'gaseosa', n: 2 }, { id: 'panChicharron', n: 1 }], triciclo: [{ id: 'gaseosa', n: 2 }]
  };

  /* ---------------- Estado vivo (se reinicia con el mundo) ---------------- */
  var parts = [], texts = [], alarms = [], glass = [], stones = [];
  function initProp(pr) {
    if (pr._ik !== undefined) return pr._ik;
    var K = kindOf(pr.k);
    pr._ik = K; if (!K) return null;
    pr.ihp = K.hp || 0; pr.dstate = 0; pr.broken = false; pr.alarmT = 0; pr.hitOnce = false;
    return K;
  }

  /* ---------------- Partículas y texto (propios: fx.js no expone los suyos) ---------------- */
  var COLS = { spark: ['#fff6b0', '#ffe500', '#ffffff', '#ffb020'], glass: ['#cfe8f0', '#9fc4d0', '#ffffff'], trash: ['#4a4f3e', '#6a5b45', '#2c2e2a', '#8a7f6a'],
    wood: ['#8a4b1d', '#5a3314', '#b9783a'], metal: ['#b8bcc4', '#8a8f98'], dust: ['#a8a59a', '#86837a'],
    water: ['#4aa8ff', '#9fd4f0', '#2a6a9a', '#ffffff'], fire: ['#ffd23a', '#ff8a1a', '#d8401a', '#fff6c0'] };
  function burst(x, y, z, n, kind, spd, up) {
    var cols = COLS[kind] || COLS.spark;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = rand(spd * 0.4, spd);
      parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(up * 0.4, up), t: 0, life: rand(0.35, 0.7),
        col: cols[i % cols.length], sz: kind === 'trash' || kind === 'wood' ? 2 : 1, g: kind === 'spark' ? 160 : 260 });
    }
    if (parts.length > 160) parts.splice(0, parts.length - 160);
  }
  function floatText(x, y, s) { texts.push({ x: x, y: y, s: s, t: 0 }); if (texts.length > 6) texts.shift(); }

  /* ---------------- Daño a props ---------------- */
  function stateFor(K, hp) {
    if (hp <= 0) return 3;
    var lost = (K.hp - hp) / K.hp;
    return lost <= 0 ? 0 : (lost <= 0.5 ? 1 : 2);
  }
  function startAlarm(G, pr) {
    pr.alarmT = CFG.alarmT;
    if (ACH.armas && ACH.armas.breakInvis) ACH.armas.breakInvis(G, 'alarm');   // v0.8: la alarma descubre al invisible
    alarms.push({ pr: pr, t: CFG.alarmT, nT: 0 });
    sfx('car.alarm', { x: pr.x, y: pr.y - 10, dur: CFG.alarmT });
    say('carAlarm', G.player.x, G.player.y);
  }
  // v0.9 (H3): refri, tele, silla, mesa y cilindro. Estado visible por golpe (render.js: .dmg[estado-1]) y .broken al final.
  function damageJunk(G, pr, K, dmg, src) {
    var hx = pr.x, stone = src === 'stone', mc = K.mat === 'water' ? 'water' : (COLS[K.mat] ? K.mat : 'metal');
    if (src === 'fire') return true;   // el fuego no rompe refris ni teles
    if (pr.broken) { burst(hx, pr.y, 8, 3, mc === 'water' ? 'metal' : mc, 40, 30); sfx(K.hitSfx || 'prop.hit.metal', { x: hx, y: pr.y }); return true; }
    pr.ihp -= dmg;
    sfx(stone && K.mat === 'metal' ? 'stone.hit.metal' : (K.hitSfx || 'prop.hit.metal'), { x: hx, y: pr.y });
    if (K.noise && !stone) noise(G, pr.x, pr.y, K.noise);
    burst(hx, pr.y, Math.min(K.h, 20) * 0.6, 5, mc, 60, 50);
    if (K.sparks) burst(hx, pr.y, 12, 6, 'spark', 70, 40);
    if (pr.ihp > 0) { pr.dstate = Math.max(1, Math.min(3, Math.floor(K.hp - pr.ihp + 1e-6))); return true; }
    pr.ihp = 0; pr.broken = true; pr.dstate = 3;
    sfx(K.breakSfx || 'prop.break.trash', { x: hx, y: pr.y });
    burst(hx, pr.y, 12, 12, mc, 90, 70);
    if (K.sparks && ACH.fx && ACH.fx.sparks) { ACH.fx.sparks(hx, pr.y - 10, 14, 90); ACH.fx.glass(hx, pr.y - 8, 10, 60); }
    if (K.water) {   // el cilindro roto deja un charco grande que apaga el fuego
      burst(hx, pr.y, 6, 16, 'water', 90, 50);
      if (ACH.fuego && ACH.fuego.puddle) { try { ACH.fuego.puddle(pr.x, pr.y + 5, 26, 25); } catch (e) { /* nada */ } }
      if (ACH.fx && ACH.fx.text) ACH.fx.text(pr.x, pr.y - 26, '¡SPLASH!', '#9fd4f0');
    }
    if (K.loot) { var L = junkLoot(K.loot); if (L.length) { invDrop(pr.x, pr.y + 8, L); if (K.loot === 'refri') say('loot', G.player.x, G.player.y); } }
    return true;
  }
  /* v0.11 (B): ACH.propHooks = [fn(G, prop, {dmg, broke, stage, src, known})] después de cada daño a un prop (protegido).
     broke = se rompió en ESTE golpe (autos: llegó al estado 3). Los props sin ficha en KINDS (toldos, kioscos de Miraflores…) también
     avisan (known: false, broke: false); si un gancho devuelve true, el golpe cuenta como conectado. */
  if (!Array.isArray(ACH.propHooks)) ACH.propHooks = [];
  var hookErr = {};
  function hooksOn() { var H = ACH.propHooks; return !!(H && H.length); }
  function runPropHooks(G, pr, info) {
    var H = ACH.propHooks, any = false;
    if (!H || !H.length) return false;
    for (var i = 0; i < H.length; i++) {
      if (typeof H[i] !== 'function') continue;
      try { if (H[i](G, pr, info) === true) any = true; } catch (e) { if (!hookErr[i]) { hookErr[i] = 1; console.warn('[ACHORADO] propHooks', e); } }
    }
    return any;
  }
  function damageProp(G, pr, dmg, src) {
    if (!pr) return false;
    var K = initProp(pr), wasBroken = !!pr.broken || (K && K.cls === 'car' && pr.dstate >= 3), r = false;
    if (K) r = damagePropCore(G, pr, dmg, src);
    if (!hooksOn()) return r;
    var nowBroken = !!pr.broken || (K && K.cls === 'car' && pr.dstate >= 3);
    var h = runPropHooks(G, pr, { dmg: dmg, broke: !!(K && nowBroken && !wasBroken), stage: pr.dstate || 0, src: src || 'swing', known: !!K, cls: K ? K.cls : null });
    return r || h;
  }
  function damagePropCore(G, pr, dmg, src) {
    var K = initProp(pr); if (!K) return false;
    var stone = src === 'stone', hx = pr.x, hy = pr.y - Math.min(K.h, 20) * 0.6;
    if (K.cls === 'metal') {
      sfx(stone ? 'stone.hit.metal' : 'prop.hit.metal', { x: hx, y: pr.y });
      burst(hx, pr.y, 10, 4, 'spark', 60, 40);
      if (!stone) noise(G, pr.x, pr.y, CFG.metalNoise);
      return true;
    }
    if (K.cls === 'car') {
      sfx(stone ? 'stone.hit.metal' : 'prop.hit.metal', { x: hx, y: pr.y });
      if (pr.dstate >= 3) { burst(hx, pr.y, 10, 3, 'metal', 50, 40); return true; }
      if (!pr.hitOnce) { pr.hitOnce = true; if (Math.random() < CFG.alarmChance) startAlarm(G, pr); }
      var before = pr.dstate;
      pr.ihp -= dmg;
      pr.dstate = stateFor(K, pr.ihp);
      noise(G, pr.x, pr.y, CFG.carNoise);
      burst(hx, pr.y, 12, 4, 'metal', 60, 50);
      if (pr.dstate > before && pr.dstate < 3) {
        sfx('prop.hit.glass', { x: hx, y: pr.y });
        burst(hx, pr.y, 14, 8, 'glass', 70, 60);
      }
      if (pr.dstate >= 3 && before < 3) {
        pr.ihp = 0;
        sfx('prop.break.car', { x: hx, y: pr.y });
        burst(hx, pr.y, 14, 14, 'glass', 90, 80);
        pr.smoke = { x: pr.x + Math.round(rand(-6, 6)), y: pr.y - Math.round(K.h * 0.7) };   // chatarra humeante (fx.js humea todo prop con smoke)
        glass.push({ x: pr.x - pr.fw * 0.3, y: pr.y + 5, cd: 0 }, { x: pr.x + pr.fw * 0.25, y: pr.y + 4, cd: 0 });
        var gl = gloveLoot();
        if (GAS.test(pr.k)) gl.push({ id: 'gasolina', n: 1 + (Math.random() < 0.5 ? 1 : 0) });   // v0.9: el tanque de la mototaxi o del Tico
        invDrop(pr.x, pr.y + 8, gl);
        say('carBreak', G.player.x, G.player.y);
      }
      return true;
    }
    if (K.cls === 'trash') {
      if (pr.broken) { burst(pr.x, pr.y, 4, 3, 'trash', 50, 30); return true; }
      pr.ihp -= dmg;
      burst(pr.x, pr.y, 6, 5, 'trash', 60, 50);
      if (pr.ihp <= 0) {
        pr.broken = true; pr.dstate = 1;
        sfx('prop.break.trash', { x: pr.x, y: pr.y });
        burst(pr.x, pr.y, 6, 10, 'trash', 80, 70);
        if (src === 'fire') { /* se quemó: no queda nada que rescatar (fuego.js echa la columna de humo) */ }
        else if (K.loot) invDrop(pr.x, pr.y + 6, junkLoot(K.loot));
        else if (Math.random() < CFG.trashLoot) invDrop(pr.x, pr.y + 6, trashLoot());
      } else sfx('prop.hit.metal', { x: pr.x, y: pr.y });
      return true;
    }
    if (K.cls === 'soft') {   // v0.9: colchón y llanta: decorado que suena (la llanta, a goma)
      sfx(K.hitSfx || 'prop.hit.soft', { x: pr.x, y: pr.y });
      burst(pr.x, pr.y, 6, 3, 'dust', 40, 30);
      return true;
    }
    if (K.cls === 'junk') return damageJunk(G, pr, K, dmg, src);
    if (K.cls === 'cart') {
      if (pr.broken) { burst(pr.x, pr.y, 8, 3, 'wood', 50, 30); sfx('prop.hit.metal', { x: pr.x, y: pr.y }); return true; }
      pr.ihp -= dmg;
      burst(pr.x, pr.y, 10, 5, 'wood', 60, 50);
      if (pr.ihp <= 0) {
        pr.broken = true; pr.dstate = 1;
        sfx('prop.break.cart', { x: pr.x, y: pr.y });
        burst(pr.x, pr.y, 10, 12, 'wood', 90, 70);
        if (pr.smoke) { pr.smoke = null; pr.lampOut = true; }      // los anticuchos dejan de humear (y se apagan las brasas)
        var base = String(pr.k).replace(/W$/, '');
        invDrop(pr.x, pr.y + 8, (CART_LOOT[base] || [{ id: 'gaseosa', n: 1 }]).map(function (o) { return { id: o.id, n: o.n }; }));
        say('loot', G.player.x, G.player.y);
      } else sfx('prop.hit.metal', { x: pr.x, y: pr.y });
      return true;
    }
    if (K.cls === 'pole') {
      var tx = pr.top ? pr.top.x : pr.x, ty = pr.top ? pr.top.y : pr.y - 50;
      sfx(stone ? 'stone.hit.metal' : 'pole.spark', { x: pr.x, y: pr.y });
      burst(pr.x, pr.y, 18, 4, 'metal', 40, 30);
      if (pr.broken) return true;
      pr.ihp -= dmg;
      noise(G, pr.x, pr.y, CFG.poleNoise);
      burst(tx, pr.y, pr.y - ty, 10, 'spark', 70, 30);
      if (stone) sfx('pole.spark', { x: pr.x, y: pr.y });
      if (pr.ihp <= 0) {
        pr.broken = true; pr.dstate = 1;
        pr.lampOut = true; pr.lampFlickUntil = G.clock + CFG.lampFlickT;   // el foco parpadea y se apaga (render.js lo saca del mapa de luz)
        burst(tx, pr.y, pr.y - ty, 16, 'spark', 90, 20);
        if (ACH.inter.onLampOut) ACH.inter.onLampOut(pr);
      }
      return true;
    }
    return false;
  }

  // Golpea los props cuya huella (o fuste, si no tiene huella) cae a menos de r de (x, y). arc = {ang, half} opcional (guitarrazo).
  function hitProps(G, x, y, r, dmg, src, arc) {
    var props = ACH.world.props, n = 0, hk = hooksOn();
    for (var i = 0; i < props.length; i++) {
      var pr = props[i], K = initProp(pr);
      if (!K && !hk) continue;   // v0.11: sin ficha solo interesa si hay ganchos (ACH.propHooks)
      var x0 = pr.fw > 0 ? pr.x0 : pr.x - 2, x1 = pr.fw > 0 ? pr.x1 : pr.x + 2, y0 = pr.fh > 0 ? pr.y0 : pr.y - 3, y1 = pr.y;
      if (x < x0 - r - 1 || x > x1 + r + 1 || y < y0 - r - 1 || y > y1 + r + 1) continue;
      var cx = x < x0 ? x0 : (x > x1 ? x1 : x), cy = y < y0 ? y0 : (y > y1 ? y1 : y);
      var d = dist(x, y, cx, cy);
      if (d > r) continue;
      if (arc && d > 4) {
        var a = Math.atan2(cy - y, cx - x) - arc.ang;
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        if (Math.abs(a) > arc.half) continue;
      }
      if (damageProp(G, pr, dmg, src || 'swing')) { n++; if (K && (K.cls === 'car' || K.cls === 'metal' || K.cls === 'pole' || K.hard)) ACH.inter.lastHard = (ACH.inter.lastHard || 0) + 1; }   // v0.8: chapa y postes gastan la guitarra el doble
    }
    return n;
  }

  /* ---------------- Animales: perros (en entities.js) y gatos ---------------- */
  function hitAnimals(G, x, y, r, src, arc) {
    var n = 0, i;
    function inArc(ax, ay) {
      var d = dist(x, y, ax, ay);
      if (d > r) return false;
      if (!arc || d < 4) return true;
      var a = Math.atan2(ay - y, ax - x) - arc.ang;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      return Math.abs(a) <= arc.half;
    }
    var dogs = G.npcs ? G.npcs.dogs : [];
    for (i = 0; i < dogs.length; i++) if (inArc(dogs[i].x, dogs[i].y)) { ACH.ent.hitDog(G, dogs[i], G.player.x, G.player.y); n++; }
    var cats = G.cats || [];
    for (i = 0; i < cats.length; i++) {
      var c = cats[i];
      if (c.state === 'hide' || c.state === 'run') continue;
      if (inArc(c.x, c.y)) { catFlee(G, c, 'hiss'); n++; }
    }
    return n;
  }

  /* ---------------- Gatos ---------------- */
  var CAT = { walk: 22, run: 115, runNear: 40, zombieNear: 55, comeOutMin: 7, comeOutMax: 13, safeDist: 110, radius: 3, hopT: 0.35 };
  var hideSpots = [];
  function buildHideSpots() {
    var W = ACH.world, T = W.T, i;
    hideSpots.length = 0;
    // bajo autos (vehículos de pista; se mira la huella)
    for (i = 0; i < W.props.length; i++) {
      var pr = W.props[i], K = kindOf(pr.k);
      if (!K || K.cls !== 'car' || !(pr.fw > 0)) continue;
      var under = pr.y < 25 * T ? pr.y + 8 : pr.y + 8;
      hideSpots.push({ kind: 'car', pr: pr, ax: pr.x, ay: under, x: pr.x + Math.round(rand(-pr.fw * 0.2, pr.fw * 0.2)), y: pr.y - 2, sortY: pr.y + 0.5 });
    }
    // fondo de los pasajes
    (W.PASAJES || []).forEach(function (p) {
      hideSpots.push({ kind: 'pasaje', ax: (p.c0 + 1) * T + 8, ay: (p.r1 + 1) * T + 6, x: (p.c0 + 1) * T + 8, y: p.r0 * T + 10 });
    });
    if (W.catRoofs) {   // v0.9 (H3): el nivel puede traer sus techos para gatos: [{x, y, ax, ay}] (px de mundo)
      W.catRoofs.forEach(function (r) { hideSpots.push({ kind: 'roof', ax: r.ax, ay: r.ay, x: r.x, y: r.y }); });
    } else if (isCerro(W)) {
      // v0.9 (H3): en el Cerro los gatos suben a los techos de calamina de las casitas (esteras, triplay, mixtas)
      (W.LOTS || []).forEach(function (f, i) {
        if (!(f.arch === 'estera' || f.arch === 'triplay' || f.arch === 'mixta') || i % 2) return;
        var x = Math.round((f.c0 + f.c1 + 1) / 2 * T), yb = (f.r1 + 1) * T;
        if (W.collideCircle(x, yb + 10, CAT.radius)) return;
        hideSpots.push({ kind: 'roof', ax: x, ay: yb + 10, x: x, y: yb - 4 });
      });
    } else {
      // bordes de azotea baja (manzana sur del nivel 1): se salta desde la vereda sur
      [3, 13, 22, 31, 48, 58, 68, 78, 92, 112].forEach(function (c) {
        hideSpots.push({ kind: 'roof', ax: c * T + 8, ay: 38 * T + 12, x: c * T + 8, y: 39 * T + 6 });
      });
    }
  }
  function isCerro(W) { W = W || ACH.world; return !!(W && (W.id === 'cerro' || (W.lanes && W.lanes.length))); }
  function gatoPH(anim, f) {   // placeholder 14×10 hasta que objetos.js entregue npc.gato
    var key = anim + f, cache = gatoPH.c || (gatoPH.c = {});
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas'); c.width = 14; c.height = 10;
    var g = c.getContext('2d');
    if (anim === 'hide') {
      g.fillStyle = '#ffe14a'; g.fillRect(4, 5, 1, 1); g.fillRect(7, 5, 1, 1);
      if (f % 2) { g.fillStyle = '#3a3634'; g.fillRect(10, 7, 3, 1); }
    } else {
      var low = anim === 'run' || anim === 'walk';
      g.fillStyle = '#1c1a1a'; g.fillRect(2, low ? 3 : 2, 9, low ? 5 : 7);
      g.fillStyle = '#c98a4a'; g.fillRect(3, low ? 4 : 3, 7, low ? 3 : 5);
      g.fillStyle = '#c98a4a'; g.fillRect(9, low ? 2 : 1, 4, 3);                // cabeza
      g.fillStyle = '#1c1a1a'; g.fillRect(9, low ? 1 : 0, 1, 1); g.fillRect(12, low ? 1 : 0, 1, 1); // orejas
      g.fillStyle = '#7a5530'; g.fillRect(0, low ? 3 : 5 - (f % 2), 2, 1);       // cola
      if (low) { g.fillStyle = '#1c1a1a'; g.fillRect(3 + (f % 2) * 2, 8, 1, 2); g.fillRect(8 - (f % 2) * 2, 8, 1, 2); }
      if (anim === 'lick' && f % 2) { g.fillStyle = '#d98a9e'; g.fillRect(11, 4, 1, 1); }
    }
    c.ax = 7; c.ay = 9; c.placeholder = true;
    cache[key] = c; return c;
  }
  function gatoSpr(anim, dirn, f) {
    var S = ACH.sprites && ACH.sprites.npc && ACH.sprites.npc.gato, o = S && S[anim];
    if (o && (anim === 'walk' || anim === 'run') && !Array.isArray(o)) o = o[dirn];
    if (Array.isArray(o) && o.length) {
      var c = o[((f % o.length) + o.length) % o.length];
      if (c && c.width) { if (c.ax === undefined) { c.ax = Math.floor(c.width / 2); c.ay = c.height - 1; } return c; }
    }
    return gatoPH(anim, f);
  }
  function makeCats(G) {
    var W = ACH.world, sp = W.catSpawns || [], cats = [];
    buildHideSpots();
    for (var i = 0; i < sp.length; i++) {
      var s = sp[i], z = 0, sortY;
      if (s.onProp) {   // encima de un contenedor: z ≈ alto de la caja
        for (var j = 0; j < W.props.length; j++) {
          var pr = W.props[j];
          if (pr.k === s.onProp && Math.abs(pr.x - s.x) < 40 && Math.abs(pr.y - s.y) < 30) {
            var spr = ACH.gfx.prop(pr.k, pr.v, pr.dir, pr.fb);
            z = Math.round(spr.ay * 0.6); sortY = pr.y + 0.5; s = { x: pr.x, y: pr.y - 2, mode: s.mode };
            break;
          }
        }
      }
      cats.push({ id: i, hx: s.x, hy: s.y, hz: z, hsort: sortY, x: s.x, y: s.y, z: z, sortY: sortY, mode: s.mode,
        state: s.mode, t: rand(2, 6), anim: rand(0, 3), face: Math.random() < 0.5 ? -1 : 1, path: null, spot: null, stuck: 0 });
    }
    G.cats = cats;
  }
  var lastCatSay = -1e9;
  function catFlee(G, c, how) {
    var p = G.player, best = null, bs = 1e9;
    for (var i = 0; i < hideSpots.length; i++) {
      var h = hideSpots[i];
      if (h.taken && h.taken !== c) continue;
      if (h.pr && h.pr.dstate >= 3) continue;   // chatarra: ahí no
      var d = dist(c.x, c.y, h.ax, h.ay) + dist(h.ax, h.ay, h.x, h.y);
      if (dist(h.ax, h.ay, p.x, p.y) < 50) d += 220;            // no corre hacia Alexander
      if (d < bs) { bs = d; best = h; }
    }
    sfx(how === 'hiss' ? 'cat.hiss' : 'cat.meow', { x: c.x, y: c.y });
    sfx('cat.run', { x: c.x, y: c.y });
    if (G.time - lastCatSay > 4) { lastCatSay = G.time; say('catFlee', p.x, p.y); }
    if (c.spot) c.spot.taken = null;
    c.spot = best; if (best) best.taken = c;
    // trayecto: 1) bajar del techo/contenedor (salto) 2) al punto de acceso con colisión 3) entrar (sin colisión: bajo el auto, salto a la azotea)
    c.path = [];
    if (c.z > 0 || c.onRoof) c.path.push({ x: c.x, y: c.onRoof ? c.y - 14 : c.y + 10, free: true, hop: true });
    if (best) { c.path.push({ x: best.ax, y: best.ay }); c.path.push({ x: best.x, y: best.y, free: true, hop: best.kind === 'roof' }); }
    else c.path.push({ x: c.x + (c.x - p.x > 0 ? 60 : -60), y: c.y });
    c.state = 'run'; c.anim = 0; c.stuck = 0; c.hop = null; c.sortY = undefined; c.onRoof = false;
  }
  function zombieNear(G, x, y, r) {
    for (var i = 0; i < G.zombies.length; i++) { var z = G.zombies[i]; if (z.state !== 'muerto' && Math.abs(z.x - x) < r && dist(x, y, z.x, z.y) < r) return true; }
    return false;
  }
  function stepTo(G, c, wp, spd, dt) {   // true cuando llegó al punto
    var dx = wp.x - c.x, dy = wp.y - c.y, d = Math.sqrt(dx * dx + dy * dy), st = spd * dt;
    if (Math.abs(dx) > 0.5) c.face = dx < 0 ? -1 : 1;
    if (wp.hop) {   // salto: arco en z con duración fija
      if (!c.hop) c.hop = { t: 0, x0: c.x, y0: c.y, z0: c.z };
      c.hop.t += dt;
      var s = Math.min(1, c.hop.t / CAT.hopT);
      c.x = c.hop.x0 + (wp.x - c.hop.x0) * s; c.y = c.hop.y0 + (wp.y - c.hop.y0) * s;
      c.z = c.hop.z0 * (1 - s) + 14 * Math.sin(s * Math.PI);
      if (s >= 1) { c.hop = null; c.z = 0; return true; }
      return false;
    }
    if (d <= st + 0.5) { c.x = wp.x; c.y = wp.y; return true; }
    var vx = dx / d * st, vy = dy / d * st;
    if (wp.free || c.stuck > 0.6) { c.x += vx; c.y += vy; return false; }
    var hit = ACH.world.moveCircle(c, vx, vy, CAT.radius);
    if (hit) {   // desliza: prueba el eje libre con todo el paso
      if (Math.abs(vx) > Math.abs(vy)) ACH.world.moveCircle(c, 0, (dy >= 0 ? 1 : -1) * st, CAT.radius);
      else ACH.world.moveCircle(c, (dx >= 0 ? 1 : -1) * st, 0, CAT.radius);
      c.stuck += dt;
    } else c.stuck = Math.max(0, c.stuck - dt);
    return false;
  }
  function updateCats(G, dt) {
    var cats = G.cats; if (!cats) return;
    var p = G.player, alive = p.hp > 0;
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      c.anim += dt; c.t -= dt;
      var pd = dist(c.x, c.y, p.x, p.y);
      if (c.state === 'sleep' || c.state === 'sit' || c.state === 'lick' || c.state === 'walk') {
        if (alive && ((p.running && pd < CAT.runNear) || pd < 14)) { catFlee(G, c, pd < 20 ? 'hiss' : 'meow'); continue; }
        if (zombieNear(G, c.x, c.y, CAT.zombieNear)) { catFlee(G, c, 'hiss'); continue; }
      }
      if (c.state === 'run') {
        var wp = c.path && c.path[0];
        if (!wp) { c.state = c.spot ? 'hide' : 'sit'; c.t = rand(CAT.comeOutMin, CAT.comeOutMax); c.anim = 0; continue; }
        if (stepTo(G, c, wp, CAT.run, dt)) { c.path.shift(); c.stuck = 0; }
        if (!c.path.length) {
          c.state = c.spot ? 'hide' : 'sit'; c.t = rand(CAT.comeOutMin, CAT.comeOutMax); c.anim = 0;
          if (c.spot) { c.sortY = c.spot.sortY; c.onRoof = c.spot.kind === 'roof'; }
        }
      } else if (c.state === 'hide') {
        if (c.t <= 0) {
          if (pd < CAT.safeDist || zombieNear(G, c.x, c.y, 80)) { c.t = 2; continue; }
          // sale y vuelve a su sitio
          c.path = [];
          if (c.onRoof) c.path.push({ x: c.x, y: c.y - 14, free: true, hop: true });
          else if (c.spot && c.spot.kind === 'car') c.path.push({ x: c.spot.ax, y: c.spot.ay, free: true });
          if (c.hz > 0) { c.path.push({ x: c.hx, y: c.hy + 10 }); c.path.push({ x: c.hx, y: c.hy, free: true, hop: true, back: true }); }
          else c.path.push({ x: c.hx, y: c.hy, back: true });
          if (c.spot) c.spot.taken = null;
          c.spot = null; c.sortY = undefined; c.onRoof = false;
          c.state = 'home'; c.anim = 0; c.stuck = 0;
        }
      } else if (c.state === 'home') {
        var hp = c.path[0];
        if (!hp) { c.state = c.mode; c.t = rand(3, 7); continue; }
        if (stepTo(G, c, hp, CAT.walk * 1.4, dt)) {
          c.path.shift(); c.stuck = 0;
          if (hp.back) { c.z = c.hz; c.sortY = c.hsort; c.state = c.mode; c.t = rand(3, 7); c.anim = 0; c.onRoof = c.mode === 'sleep' && c.hz === 0 && !isCerro() && c.hy > 38 * 16; }
        }
        if (alive && p.running && pd < CAT.runNear) catFlee(G, c, 'meow');
      } else if (c.state === 'walk') {
        if (stepTo(G, c, c.wp, CAT.walk, dt) || c.t <= 0 || c.stuck > 0.5) { c.state = 'sit'; c.t = rand(3, 6); c.anim = 0; }
      } else if (c.t <= 0) {   // sleep / sit / lick: alterna; a veces da unos pasos cerca de su sitio (solo si está en el piso)
        var r = Math.random();
        if (c.state === 'sleep' && r < 0.7) { c.t = rand(4, 9); continue; }
        if (c.z === 0 && !c.onRoof && r < 0.3) {
          c.state = 'walk'; c.t = 3; c.stuck = 0;
          c.wp = { x: c.hx + rand(-20, 20), y: c.hy + rand(-4, 4) }; c.anim = 0;
        } else { c.state = r < 0.65 ? 'lick' : 'sit'; c.t = rand(2.5, 6); c.anim = 0; }
      }
    }
  }
  function drawCat(g, c, cx, cy) {
    var spr, flip = false, f;
    if (c.state === 'hide') spr = gatoSpr('hide', null, Math.floor(c.anim / 1.6) % 4 === 3 ? 1 : 0);
    else if (c.state === 'run') spr = gatoSpr('run', c.face < 0 ? 'left' : 'right', Math.floor(c.anim * 14));
    else if (c.state === 'walk' || c.state === 'home') spr = gatoSpr('walk', c.face < 0 ? 'left' : 'right', Math.floor(c.anim * 8));
    else if (c.state === 'lick') { f = Math.floor(c.anim * 5); spr = gatoSpr('lick', null, f); flip = c.face < 0; }
    else { spr = gatoSpr('sit', null, c.state === 'sleep' ? 0 : Math.floor(c.anim * 1.2)); flip = c.face < 0; }
    var x = Math.round(c.x) - cx, y = Math.round(c.y - c.z) - cy;
    if (!flip) { g.drawImage(spr, x - spr.ax, y - spr.ay); return; }
    g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(spr, -spr.ax, -spr.ay); g.restore();
  }

  /* ---------------- Vidrio que cruje ---------------- */
  function buildGlass() {
    glass.length = 0;
    var D = ACH.world.decals;
    for (var i = 0; i < D.length; i++) if (D[i].k === 'vidrio') glass.push({ x: D[i].x, y: D[i].y - 3, cd: 0, baked: true });
  }
  function updateGlass(G, dt) {
    var p = G.player;
    for (var i = 0; i < glass.length; i++) {
      var g = glass[i];
      if (g.cd > 0) { g.cd -= dt; continue; }
      if (!p.running || p.hp <= 0) continue;
      if (Math.abs(g.x - p.x) > CFG.glassR + 6 || dist(g.x, g.y, p.x, p.y) > CFG.glassR) continue;
      g.cd = CFG.glassCD;
      sfx('glass.crunch', { x: p.x, y: p.y });
      noise(G, p.x, p.y, CFG.glassNoise);
      burst(p.x, p.y, 1, 3, 'glass', 30, 30);
    }
  }

  /* ---------------- Alarmas ---------------- */
  function updateAlarms(G, dt) {
    for (var i = alarms.length - 1; i >= 0; i--) {
      var a = alarms[i];
      a.t -= dt; a.pr.alarmT = Math.max(0, a.t);
      a.nT -= dt;
      if (a.nT <= 0 && a.t > 0) { a.nT = CFG.alarmEvery; noise(G, a.pr.x, a.pr.y, CFG.alarmNoise); }
      if (a.t <= 0) { a.pr.alarmT = 0; alarms.splice(i, 1); }
    }
  }
  // Luces dinámicas para render.js: intermitentes de alarma. push(x, y, r, col, a) en px de mundo.
  function lightsInto(push, clock) {
    for (var i = 0; i < alarms.length; i++) {
      var pr = alarms[i].pr;
      var half = (pr.fw || 40) / 2 - 3, y = pr.y - Math.min(14, (kindOf(pr.k) || { h: 20 }).h * 0.4);
      push(pr.x + (((clock * 2.5) % 1 > 0.5) ? half : -half), y, 'alarm');   // QA v0.6: faros ámbar alternados (izq. / der.) en vez de un parpadeo conjunto
    }
  }

  /* ---------------- Resortera y molotov (arma a distancia del clic) ----------------
     v0.9 (H3): p.ranged = 'resortera' | 'molotov'; R cambia entre las que tengas. El molotov se tira igual que la piedra (mantener, soltar,
     chanfle por el movimiento perpendicular del mouse), pero: al empezar prende la mecha (0,35 s), carga en 0,9 s, alcance 50–200 px,
     arco más alto y más lento, y la trayectoria prevista termina en un círculo naranja del radio del incendio. En el aire no se empieza ni se dispara:
     si se suelta en pleno salto, el tiro sale al caer. */
  var SL = {
    chargeT: 0.8, rMin: 60, rMax: 280, rFloor: 12, vMin: 170, vMax: 300, apexMin: 10, apexK: 0.12, z0: 12,
    curveA: 320, spinK: 60, hitZ: 14, crawlZ: 5, zR: 7, cd: 0.35, buffer: 0.25, walkMul: 0.6, noise: 70, recover: 0.5, relT: 0.18,
    knock: 12, stun: 0.25, maxSteps: 240, birdTol: 10
  };
  var ML = {
    chargeT: 0.9, lightT: 0.35, rMin: 50, rMax: 200, rFloor: 20, vMin: 110, vMax: 175, apexMin: 22, apexK: 0.2, z0: 14,
    curveA: 240, spinK: 60, hitZ: 14, crawlZ: 5, zR: 8, cd: 0.6, relT: 0.3, maxSteps: 300, birdTol: 10,
    dmg: 2, knock: 20, fireR: 34, fireT: 5, cartR: 13, cartZ: 26
  };
  // v0.11 (B): globos con agua (inventario 'globosAgua'): tiro corto en arco (40–140 px), mojan (z.wetT = 3 s: lentos) y dispersan enjambres
  var GL = {
    chargeT: 0.6, rMin: 40, rMax: 140, rFloor: 16, vMin: 110, vMax: 165, apexMin: 18, apexK: 0.2, z0: 12,
    curveA: 240, spinK: 60, hitZ: 16, crawlZ: 6, zR: 8, cd: 0.45, relT: 0.25, maxSteps: 260, birdTol: 10,
    splashR: 26, wetT: 3, wetMul: 0.5, bees: 3
  };
  function PR(kind) { return kind === 'molotov' ? ML : kind === 'globosAgua' ? GL : SL; }
  function ammoId(kind) { return kind === 'molotov' ? 'molotov' : kind === 'globosAgua' ? 'globosAgua' : 'piedras'; }
  function rangedName(kind) { return kind === 'molotov' ? 'MOLOTOV' : kind === 'globosAgua' ? 'GLOBOS' : 'RESORTERA'; }
  function rangedCol(kind) { return kind === 'molotov' ? '#ff8a30' : kind === 'globosAgua' ? '#4aa8ff' : '#ffe500'; }
  function sling(G) { return G.sling || (G.sling = { charging: false, c: 0, spin: 0, cd: 0, relT: 0, lmx: 0, lmy: 0, noAmmoT: 0, hadSling: false, kind: 'resortera', light: 0, pend: false, relKind: '' }); }
  function slingActive(G) { var s = G.sling; return !!(s && s.charging); }
  function hasMolotovPose() { var A = ACH.sprites && ACH.sprites.alex; return !!(A && A.bird && A.bird.throwMolotov); }
  // 'charge' | 'release' | null: la pose de la resortera (render.js). Con el molotov y su arte (throwMolotov), null: la pone armas.pose().
  function slingPose(G) {
    var s = G.sling; if (!s) return null;
    var mk = s.charging ? s.kind : (s.relT > 0 ? s.relKind : '');
    if (mk === 'molotov' && hasMolotovPose()) return null;
    return s.charging ? 'charge' : (s.relT > 0 ? 'release' : null);
  }
  // −1 = no; 0 prender la mecha · 1 estirar · 2 soltar (alex.<v>.throwMolotov[dir][f])
  function molotovPose(G) {
    var s = G && G.sling; if (!s) return -1;
    if (s.charging && s.kind === 'molotov') return s.light > 0 ? 0 : 1;
    if (s.relT > 0 && s.relKind === 'molotov') return 2;
    return -1;
  }
  function available(id) { return id === 'molotov' ? invHas('molotov') : id === 'globosAgua' ? invHas('globosAgua') : invHas('resortera'); }
  function ensureRanged(p) {
    if (p.ranged && available(p.ranged)) return p.ranged;
    if (available('resortera')) p.ranged = 'resortera';
    else if (available('molotov')) p.ranged = 'molotov';
    else if (available('globosAgua')) p.ranged = 'globosAgua';
    else if (!p.ranged) p.ranged = 'resortera';
    return p.ranged;
  }
  function cycleRanged(G) {
    var p = G && G.player; if (!p) return null;
    var s = sling(G); if (s.charging) return p.ranged;
    var list = ['resortera', 'molotov', 'globosAgua'].filter(available);
    if (!list.length) { if (s.noAmmoT <= 0) { toast('No tienes con qué tirar, causa.'); s.noAmmoT = 1.5; } return p.ranged; }
    var i = list.indexOf(p.ranged), nx = list[(i + 1) % list.length];
    if (nx === p.ranged && list.length === 1) { if (ACH.fx && ACH.fx.text) ACH.fx.text(p.x, p.y - 36, 'SOLO ' + rangedName(list[0]), '#f2f2f2'); }
    else { p.ranged = nx; sfx('ui.move'); if (ACH.fx && ACH.fx.text) ACH.fx.text(p.x, p.y - 36, rangedName(nx), rangedCol(nx)); }
    hudDirty = true;
    return p.ranged;
  }
  function hand(p) { return { x: p.x, y: p.y - 1 }; }
  // Parámetros de lanzamiento: mismos para la trayectoria prevista y para el tiro real.
  function launch(G) {
    var p = G.player, s = G.sling, m = ACH.input.mouse, h = hand(p), C = PR(s.kind);
    var dx = m.wx - h.x, dy = m.wy - h.y, dm = Math.sqrt(dx * dx + dy * dy);
    if (dm < 0.01) { var dv = ACH.ent.DIRV[p.dir]; dx = dv[0]; dy = dv[1]; dm = 1; }
    var ux = dx / dm, uy = dy / dm, nx = -uy, ny = ux;
    var R = Math.max(C.rFloor, Math.min(C.rMin + (C.rMax - C.rMin) * s.c, dm));
    var v = C.vMin + (C.vMax - C.vMin) * s.c, T = R / v, a = s.spin * C.curveA;
    // chanfle: aceleración lateral a; la velocidad lateral inicial (−a·T/2) hace que caiga en el punto apuntado con la panza hacia un lado
    return { x: h.x, y: h.y, px: h.x, py: h.y, z: C.z0, vx: ux * v - nx * a * T / 2, vy: uy * v - ny * a * T / 2, ax: nx * a, ay: ny * a,
      T: T, t: 0, H: C.apexMin + R * C.apexK, z0: C.z0, R: R, kind: s.kind };
  }
  // Un paso de vuelo. Devuelve null (sigue), 'land', 'wall' o el prop chocado.
  function stoneStep(st, dt) {
    st.px = st.x; st.py = st.y;
    st.t += dt;
    st.vx += st.ax * dt; st.vy += st.ay * dt;
    st.x += st.vx * dt; st.y += st.vy * dt;
    var s = Math.min(1, st.t / st.T);
    st.z = st.z0 * (1 - s) + 4 * st.H * s * (1 - s);
    var W = ACH.world, T = W.T;
    if (W.isSolidTile(Math.floor(st.x / T), Math.floor(st.y / T))) return 'wall';
    var pr = W.propAt(st.x, st.y);
    if (pr) { var K = kindOf(pr.k), h = K ? K.h : (pr.tall ? 36 : 16); if (st.z < h) return pr; }
    return s >= 1 ? 'land' : null;
  }
  // Trayectoria prevista (sin zombies: son lo único que se mueve). Devuelve [{x, y, z}] y el final.
  function simulate(G) {
    var st = launch(G), out = [{ x: st.x, y: st.y, z: st.z }], end = null, C = PR(st.kind);
    for (var i = 0; i < C.maxSteps && !end; i++) { end = stoneStep(st, STEP); out.push({ x: st.x, y: st.y, z: st.z }); }
    var ex = st.x, ey = st.y; if (end && end !== 'land') { ex = st.px; ey = st.py; }
    return { pts: out, end: end, x: ex, y: ey, kind: st.kind };
  }
  function updateSling(G, dt) {
    var s = sling(G), I = ACH.input, m = I.mouse, p = G.player;
    if (s.cd > 0) s.cd -= dt;
    if (s.relT > 0) s.relT -= dt;
    if (s.noAmmoT > 0) s.noAmmoT -= dt;
    var air = (p.z || 0) > 0;
    if (I.pressed('KeyR') && p.hp > 0) cycleRanged(G);
    var kind = s.charging ? s.kind : ensureRanged(p), C = PR(kind);
    var has = available(kind);
    var hasSl = invHas('resortera');
    if (hasSl && !s.hadSling) say('slingFound', p.x, p.y);
    s.hadSling = hasSl;
    if (s.charging) {
      if (!has || p.hp <= 0) { stopCharge(s); return; }
      if (s.light > 0) { s.light -= dt; if (s.light <= 0 && ACH.render && ACH.render.addLight) ACH.render.addLight(p.x, p.y - 14, 14, '#ffb040', 0.2, 0.6); }
      if (m.released) s.pend = true;
      if (s.pend) {
        if (!air && !(s.light > 0)) { fire(G, s); return; }   // en el aire (o con la mecha sin prender) espera
      } else if (!m.down) { stopCharge(s); return; }   // se perdió el botón (foco): se cancela sin disparar
      s.c = Math.min(1, s.c + dt / C.chargeT);
      var h = hand(p), dx = m.wx - h.x, dy = m.wy - h.y, dm = Math.sqrt(dx * dx + dy * dy) || 1;
      var mdx = m.x - s.lmx, mdy = m.y - s.lmy;    // en pantalla: mover la cámara no cuenta como efecto
      s.spin = Math.max(-1, Math.min(1, s.spin + (mdx * -dy / dm + mdy * dx / dm) / C.spinK));
      s.lmx = m.x; s.lmy = m.y;
      if (p.atkT < 0) p.dir = ACH.ent.dirFromVec(dx, dy);
      if (kind === 'molotov' && ACH.render && ACH.render.addLight && !(s.light > 0)) ACH.render.addLight(p.x, p.y - 14, 12, '#ffb040', 0.05, 0.45);
      return;
    }
    // un toque durante el enfriamiento (o en pleno salto) se recuerda SL.buffer s: si el botón sigue apretado empieza a tensar, si ya se soltó dispara
    if (m.clicked && has && (s.cd > 0 || air)) { s.buf = SL.buffer; s.bufRel = false; }
    if (s.buf > 0) { if (m.released) s.bufRel = true; else if (!m.down && !s.bufRel) s.buf = 0; s.buf -= dt; }   // soltado sin flanco = cancelado
    var want = m.clicked || (s.buf > 0 && (m.down || s.bufRel));
    if (want && has && s.cd <= 0 && !air) {
      var quick = (m.released && !m.down) || (!m.clicked && s.bufRel && !m.down);   // bajada y subida antes de este paso
      s.buf = 0; s.bufRel = false;
      if (kind === 'resortera' && !invHas('piedras')) { if (s.noAmmoT <= 0) { toast('¡Sin piedras, causa!'); s.noAmmoT = 2; } return; }
      s.charging = true; s.c = 0; s.spin = 0; s.lmx = m.x; s.lmy = m.y; s.kind = kind; s.pend = false;
      p.dir = ACH.ent.dirFromVec(m.wx - p.x, m.wy - p.y);
      if (kind === 'molotov') { s.light = ML.lightT; sfx('molotov.light', { x: p.x, y: p.y }); }
      else { s.light = 0; sfx('sling.stretch', { x: p.x, y: p.y, dur: SL.chargeT }); }
      if (quick) { if (kind === 'molotov') s.pend = true; else fire(G, s); }   // toque rapidísimo: el flanco de subida no se pierde
    }
  }
  function stopCharge(s) {
    s.charging = false; s.c = 0; s.spin = 0; s.pend = false; s.light = 0;
    var au = ACH.audio; if (au && au.stop) { try { au.stop('sling.stretch'); } catch (e) { /* nada */ } }
  }
  function fire(G, s) {
    var p = G.player, I = ACH.inv, kind = s.kind, C = PR(kind);
    var ok = I && I.take ? I.take(ammoId(kind), 1) : false;
    if (!ok) { stopCharge(s); toast(kind === 'molotov' ? '¡Se acabaron los molotov!' : kind === 'globosAgua' ? '¡Se acabaron los globos!' : '¡Sin piedras, causa!'); return; }
    var st = launch(G);
    st.trace = [{ x: st.x, y: st.y, z: st.z }];
    if (G.debugOn || ACH.inter.keepTrace) G.lastPreview = simulate(G);
    stones.push(st);
    stopCharge(s);
    s.cd = C.cd; s.relT = C.relT; s.relKind = kind;
    hudDirty = true;
    if (kind === 'molotov') { sfx('molotov.throw', { x: p.x, y: p.y }); say('molotov', p.x, p.y); }
    else if (kind === 'globosAgua') sfx('molotov.throw', { x: p.x, y: p.y, globo: true });
    else { sfx('sling.release', { x: p.x, y: p.y }); say('shoot', p.x, p.y); }
  }
  function stoneEnd(G, st, x, y, text) {
    sfx('stone.land', { x: x, y: y });
    noise(G, x, y, SL.noise);                                    // distrae zombies
    burst(x, y, 0, 3, 'dust', 25, 20);
    if (text) floatText(x, y - 10, text);
    if (Math.random() < SL.recover) invDrop(x, y, [{ id: 'piedras', n: 1 }]);
    G.lastStone = { x: x, y: y, trace: st.trace, t: G.time };
  }
  // v0.9: la botella se rompe: vidrio, llamarada y una zona de fuego de radio 34 px durante 5 s (fuego.js)
  function molotovBreak(G, st, x, y, z) {
    sfx('molotov.break', { x: x, y: y });
    burst(x, y, z || 2, 10, 'glass', 80, 60);
    burst(x, y, z || 2, 12, 'fire', 90, 70);
    var FX = ACH.fx;
    if (FX && FX.glass) { FX.glass(x, y - (z || 2), 10, 70); FX.shake(2, 0.15); }
    var zone = null;
    if (ACH.fuego && ACH.fuego.ignite) { try { zone = ACH.fuego.ignite(x, y, ML.fireR, ML.fireT); } catch (e) { console.warn('[ACHORADO] fuego.ignite', e); } }
    else noise(G, x, y, 160);
    if (zone && FX && FX.text) FX.text(x, y - 22, '¡FUEGO!', '#ff8a30');
    if (ACH.armas && ACH.armas.breakInvis) ACH.armas.breakInvis(G, 'molotov');
    G.lastStone = { x: x, y: y, trace: st.trace, t: G.time, kind: 'molotov' };
  }
  // v0.11 (B): el globo revienta: salpicón, charco que apaga el fuego, zombies cercanos mojados (lentos GL.wetT s) y enjambres dispersados
  function globoSplash(G, st, x, y, z) {
    sfx('balde.splash', { x: x, y: y, globo: true });
    burst(x, y, z || 2, 16, 'water', 90, 60);
    if (ACH.fx && ACH.fx.text) ACH.fx.text(x, y - 20, '¡PLASH!', '#9fd4f0');
    if (ACH.fuego && ACH.fuego.puddle) { try { ACH.fuego.puddle(x, y + 2, 18, 8); } catch (e) { /* nada */ } }
    var n = 0, R2 = GL.splashR * GL.splashR;
    for (var k = 0; k < G.zombies.length; k++) {
      var zz = G.zombies[k]; if (zz.state === 'muerto') continue;
      var dx = zz.x - x, dy = zz.y - y; if (dx * dx + dy * dy > R2) continue;
      zz.wetT = GL.wetT; zz.burnT = 0; n++;
      if (zz.state === 'deambular' || zz.state === 'idle') { zz.state = 'investigar'; zz.tx = x; zz.ty = y; }
    }
    if (ACH.nivel && ACH.nivel.onProjectile) { try { ACH.nivel.onProjectile(G, { x: x, y: y, z: 4, r: GL.splashR, dmg: 0, kind: 'water', bees: GL.bees }); } catch (e2) { /* nada */ } }
    noise(G, x, y, 50);
    G.lastStone = { x: x, y: y, trace: st.trace, t: G.time, kind: 'globosAgua' };
    return n;
  }
  // v0.11 (B): mojados: caminan a la mitad (se recorta lo que avanzaron en este paso) y gotean
  function updateWet(G, dt) {
    var Z = G.zombies, W = ACH.world;
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i];
      if (!(z.wetT > 0)) { if (z._wx !== undefined) { z._wx = undefined; z._wy = undefined; } continue; }
      if (z.state === 'muerto') { z.wetT = 0; continue; }
      z.wetT = Math.max(0, z.wetT - dt);
      if (z._wx !== undefined) {
        var dx = z.x - z._wx, dy = z.y - z._wy;
        if (dx * dx + dy * dy < 64) {
          var nx = z._wx + dx * GL.wetMul, ny = z._wy + dy * GL.wetMul;
          if (!(W && W.collideCircle && W.collideCircle(nx, ny, 4))) { z.x = nx; z.y = ny; }
        }
      }
      z._wx = z.x; z._wy = z.y;
      if (Math.random() < dt * 6) parts.push({ x: z.x + rand(-3, 3), y: z.y, z: rand(10, 24), vx: 0, vy: 0, vz: -10, t: 0, life: 0.4, col: '#9fd4f0', sz: 1, g: 200 });
    }
  }
  // v0.11 (B): tiro directo sin cargar (globos desde la barra rápida): hacia el mouse, con la fuerza c (0–1). Devuelve true si salió.
  function throwNow(G, kind, c) {
    G = G || ACH.G; var p = G && G.player; if (!p || p.hp <= 0) return false;
    if (!available(kind)) return false;
    var s = sling(G); if (s.charging || s.cd > 0 || (p.z || 0) > 0) return false;
    p.ranged = kind; s.kind = kind; s.c = c === undefined ? 0.7 : Math.max(0, Math.min(1, c)); s.spin = 0;
    fire(G, s);
    return true;
  }
  function updateStones(G, dt) {
    for (var i = stones.length - 1; i >= 0; i--) {
      var st = stones[i], M = st.kind === 'molotov', Gb = st.kind === 'globosAgua', C = PR(st.kind), res = stoneStep(st, dt), hitZ = null, k;
      if (!res && !M && !Gb && ACH.nivel && ACH.nivel.onProjectile && ACH.nivel.onProjectile(G, { x: st.x, y: st.y, z: st.z, r: 4, dmg: 1, kind: 'stone', bees: 1 })) res = 'animal';   // Miraflores: jefa y abejas
      if (!res && Gb && ACH.nivel && ACH.nivel.onProjectile) { var gpr = false; try { gpr = ACH.nivel.onProjectile(G, { x: st.x, y: st.y, z: st.z, r: 6, dmg: 0, kind: 'water', bees: GL.bees }); } catch (eG) { gpr = false; } if (gpr) res = 'animal'; }   // v0.11: el globo dispersa el enjambre
      st.trace.push({ x: st.x, y: st.y, z: st.z });
      if (M && ACH.render && ACH.render.addLight && (st.trace.length & 3) === 0) ACH.render.addLight(st.x, st.y - st.z, 14, '#ffb040', 0.08, 0.5);
      // zombies: solo cerca del suelo
      if (!res) {
        for (k = 0; k < G.zombies.length; k++) {
          var z = G.zombies[k];
          if (z.state === 'muerto') continue;
          var lim = z.loco === 'gusano' ? C.crawlZ : C.hitZ;
          if (st.z >= lim || Math.abs(z.x - st.x) > C.zR || dist(z.x, z.y - 2, st.x, st.y) > C.zR) continue;
          if (Gb) { hitZ = z; res = 'zombie'; break; }   // v0.11: el globo no hace daño: revienta y moja
          var d = dist(st.px, st.py, z.x, z.y) || 1;
          var killed = ACH.ent.hitZombie(G, z, (z.x - st.px) / d, (z.y - st.py) / d, { from: { x: st.px, y: st.py }, dmg: M ? ML.dmg : 1, knock: M ? ML.knock : SL.knock, src: M ? 'molotov' : 'stone' });
          if (killed === undefined) { if (!M) sfx('stone.hit.metal', { x: st.x, y: st.y }); res = 'blocked'; break; }
          z.stunT = SL.stun; z.hurtT = 0.12;
          if (M) { hitZ = z; sfx('hit.generic', { x: z.x, y: z.y, type: z.type, killed: killed }); }
          else { sfx('stone.hit.zombie', { x: z.x, y: z.y, type: z.type, killed: killed }); burst(z.x, z.y, 12, 5, 'dust', 40, 40); floatText(z.x, z.y - 26, '¡TOC!'); }
          if (killed) { sfx('kill', { x: z.x, y: z.y, type: z.type }); say('kill', G.player.x, G.player.y); }
          res = 'zombie'; break;
        }
      }
      // v0.9: gallinazos en el aire (a ±10 de su z), aves.js de H2
      if (!res && ACH.aves && typeof ACH.aves.hitPoint === 'function') {
        var av = null; try { av = ACH.aves.hitPoint(G, st.x, st.y, st.z, C.birdTol, M ? ML.dmg : 1, M ? 'molotov' : 'stone'); } catch (eA) { av = null; }
        if (av) { res = 'bird'; if (M && ACH.aves.burn) { try { ACH.aves.burn(av); } catch (eB) { /* nada */ } } }
      }
      // v0.9: el molotov tumba la carretilla que baja (el pasajero cae antes)
      if (!res && M && ACH.cerro && ACH.cerro.carts && ACH.cerro.knock && st.z < ML.cartZ) {
        for (k = 0; k < ACH.cerro.carts.length; k++) {
          var ct = ACH.cerro.carts[k];
          if (ct && ct.state !== 'crash' && dist(ct.x, ct.y, st.x, st.y) < ML.cartR) { try { ACH.cerro.knock(ct); } catch (eC) { /* nada */ } res = 'cart'; break; }
        }
      }
      if (!res && !M && !Gb) {   // animales (sin daño)
        var dogs = G.npcs ? G.npcs.dogs : [];
        for (k = 0; k < dogs.length && !res; k++) if (st.z < 10 && dist(dogs[k].x, dogs[k].y, st.x, st.y) < 7) { ACH.ent.hitDog(G, dogs[k], st.px, st.py); res = 'animal'; }
        var cats = G.cats || [];
        for (k = 0; k < cats.length && !res; k++) {
          var c = cats[k];
          if (c.state !== 'hide' && c.state !== 'run' && Math.abs(st.z - c.z) < 10 && dist(c.x, c.y, st.x, st.y) < 7) { catFlee(G, c, 'hiss'); res = 'animal'; }
        }
      }
      if (!res) continue;
      stones.splice(i, 1);
      if (Gb) {
        var gx = st.x, gy = st.y;
        if (res === 'wall' || (typeof res === 'object' && res && !res.state)) { gx = st.px; gy = st.py; }
        if (hitZ) { gx = hitZ.x; gy = hitZ.y + 1; }
        globoSplash(G, st, gx, gy, res === 'bird' ? st.z : 0);
        continue;
      }
      if (M) {
        var bx = st.x, by = st.y;
        if (res === 'wall' || (typeof res === 'object' && res)) { bx = st.px; by = st.py; if (typeof res === 'object') damageProp(G, res, 0.5, 'stone'); }
        if (hitZ) { bx = hitZ.x; by = hitZ.y + 1; }
        molotovBreak(G, st, bx, by, res === 'bird' ? st.z : 0);
        if (hitZ && ACH.fuego && ACH.fuego.burnZombie) ACH.fuego.burnZombie(hitZ);
        continue;
      }
      if (res === 'land') stoneEnd(G, st, st.x, st.y, '¡PLAF!');
      else if (res === 'wall') stoneEnd(G, st, st.px, st.py, '¡TOC!');
      else if (res === 'bird') stoneEnd(G, st, st.x, st.y, '¡TOC!');
      else if (typeof res === 'object') {   // prop
        damageProp(G, res, 0.5, 'stone');
        stoneEnd(G, st, st.px, st.py, '¡TOC!');
      } else stoneEnd(G, st, st.x, st.y, null);
    }
  }

  /* ---------------- v0.9: HUD del arma a distancia (elemento propio, junto a la caja del HUD) ---------------- */
  var hudEl = null, hudCv = null, hudN = null, hudK = null, hudName = null, hudKey = '', hudDirty = true, hudPos = 0;
  function initRangedHud() {
    if (hudEl) return true;
    var stage = document.getElementById('stage'); if (!stage) return false;
    var st = document.createElement('style');
    st.textContent =
      '#achRanged{position:absolute;display:none;align-items:center;gap:calc(var(--u)*2);pointer-events:none;z-index:3;' +
      'background:var(--ink,#131015);border:var(--u) solid #ffe500;box-shadow:calc(var(--u)*2) calc(var(--u)*2) 0 #ff2e88;padding:calc(var(--u)*2) calc(var(--u)*3)}' +
      '#achRanged.on{display:flex}#achRanged.mol{border-color:#ff8a30}' +
      '#achRanged canvas{width:calc(var(--u)*12);height:calc(var(--u)*12);image-rendering:pixelated}' +
      '#achRanged .t{display:flex;flex-direction:column;gap:var(--u)}' +
      '#achRanged .t span{font-family:var(--pixel);font-size:calc(var(--u)*5);line-height:1;color:#f2f2f2;white-space:nowrap}' +
      '#achRanged .t b{font-family:var(--display);font-weight:400;font-size:calc(var(--u)*8);line-height:1;color:#ffe500}' +
      '#achRanged.mol .t b{color:#ff8a30}#achRanged.zero .t b{color:#7a7480}' +
      '#achRanged i{font-style:normal;font-family:var(--pixel);font-size:calc(var(--u)*5);color:#131015;background:#ffe500;padding:0 var(--u);margin-left:var(--u)}' +
      'body:not([data-state="playing"]):not([data-state="paused"]) #achRanged{display:none}';
    document.head.appendChild(st);
    hudEl = document.createElement('div'); hudEl.id = 'achRanged';
    hudEl.innerHTML = '<canvas width="24" height="24"></canvas><div class="t"><span></span><b>0</b></div><i>R</i>';
    hudCv = hudEl.querySelector('canvas'); hudName = hudEl.querySelector('span'); hudN = hudEl.querySelector('b'); hudK = hudEl.querySelector('i');
    stage.appendChild(hudEl);
    return true;
  }
  function rangedIcon(kind) {
    var RI = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.rangedIcon, c = RI && RI[kind];
    if (c && c.big && c.big.width) return c.big;
    if (c && c.width) return c;
    return ACH.inv && ACH.inv.icon ? ACH.inv.icon(kind) : null;
  }
  function syncRangedHud(G) {
    var p = G.player; if (!p || !initRangedHud()) return;
    var hs = invHas('resortera'), hm = invHas('molotov'), hg = invHas('globosAgua'), kind = ensureRanged(p);
    var n = ACH.inv && ACH.inv.count ? ACH.inv.count(ammoId(kind)) : 0, many = (hs ? 1 : 0) + (hm ? 1 : 0) + (hg ? 1 : 0) > 1;
    var show = hs || hm || hg, key = show + ':' + kind + ':' + n + ':' + many;
    if (--hudPos <= 0) {   // junto a la caja del HUD (se remide de vez en cuando: el HUD cambia con la escala)
      hudPos = 30;
      var hud = document.getElementById('hud'), u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 2;
      if (hud) { hudEl.style.left = (hud.offsetLeft + hud.offsetWidth + u * 5) + 'px'; hudEl.style.top = hud.offsetTop + 'px'; }
    }
    if (key === hudKey && !hudDirty) return;
    hudKey = key; hudDirty = false;
    hudEl.classList.toggle('on', show);
    if (!show) return;
    hudEl.classList.toggle('mol', kind === 'molotov');
    hudEl.classList.toggle('zero', !n);
    hudName.textContent = rangedName(kind);
    hudN.textContent = n;
    hudK.style.display = many ? '' : 'none';
    var ic = rangedIcon(kind), g = hudCv.getContext('2d');
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, 24, 24);
    if (ic) g.drawImage(ic, 0, 0, ic.width, ic.height, Math.round((24 - Math.min(24, ic.width * (ic.width <= 12 ? 2 : 1))) / 2), Math.round((24 - Math.min(24, ic.height * (ic.height <= 12 ? 2 : 1))) / 2),
      Math.min(24, ic.width * (ic.width <= 12 ? 2 : 1)), Math.min(24, ic.height * (ic.height <= 12 ? 2 : 1)));
  }

  /* ---------------- Ciclo ---------------- */
  function reset(G) {
    parts.length = 0; texts.length = 0; alarms.length = 0; stones.length = 0;
    var props = ACH.world.props;
    for (var i = 0; i < props.length; i++) {
      var pr = props[i];
      if (pr._ik === undefined) continue;
      if (pr._ik && pr._ik.cls === 'car' && pr.dstate >= 3) pr.smoke = null;
      if (pr._ik && pr._ik.cls === 'cart' && /anticucho/.test(pr.k) && pr._smoke0) pr.smoke = pr._smoke0;
      delete pr._ik; pr.dstate = 0; pr.broken = false; pr.alarmT = 0; pr.lampOut = false; pr.lampFlickUntil = 0;
    }
    for (i = 0; i < props.length; i++) if (props[i].smoke && !props[i]._smoke0) props[i]._smoke0 = props[i].smoke;
    if (ACH.inter.onLampOut) ACH.inter.onLampOut(null);
    G.sling = null; sling(G); hudDirty = true; hudKey = '';
    G.lastStone = null; G.lastPreview = null;
    buildGlass();
    makeCats(G);
  }
  function update(G, dt) {
    try { updateWet(G, dt); } catch (eW) { /* nada */ }
    updateAlarms(G, dt);
    updateGlass(G, dt);
    updateStones(G, dt);
    updateCats(G, dt);
    try { syncRangedHud(G); } catch (eH) { /* el HUD propio no debe tumbar el juego */ }
    for (var i = parts.length - 1; i >= 0; i--) {
      var q = parts[i];
      q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      var k = Math.exp(-3 * dt);
      q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt;
      q.vz -= q.g * dt; q.z += q.vz * dt;
      if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.5; q.vy *= 0.5; }
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.6) texts.splice(i, 1); }
  }

  /* ---------------- Dibujo ---------------- */
  // En el piso, antes del orden por y: vidrio de autos destrozados y sombras de las piedras.
  function drawGround(ctx, cx, cy) {
    var i;
    if (ACH.armas && ACH.armas.drawGround) ACH.armas.drawGround(ctx, cx, cy);   // v0.8: guitarra rota y mitades de skate en el piso
    ctx.fillStyle = '#bfe0ea';
    for (i = 0; i < glass.length; i++) {
      var g = glass[i]; if (g.baked) continue;
      var gx = Math.round(g.x) - cx, gy = Math.round(g.y) - cy;
      if (gx < -10 || gx > 490 || gy < -10 || gy > 280) continue;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(gx - 4, gy, 1, 1); ctx.fillRect(gx - 1, gy - 1, 2, 1); ctx.fillRect(gx + 2, gy + 1, 1, 1); ctx.fillRect(gx + 4, gy - 1, 1, 1); ctx.fillRect(gx, gy + 2, 1, 1);
    }
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#141216';
    for (i = 0; i < stones.length; i++) { var s = stones[i]; ctx.fillRect(Math.round(s.x) - cx - 2, Math.round(s.y) - cy - 1, 4, 2); }
    ctx.globalAlpha = 1;
  }
  var stoneSpr = null;
  function piedra() {
    var f = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.piedra;
    if (Array.isArray(f)) f = f[0];
    if (f && f.width) return f;
    if (!stoneSpr) {
      stoneSpr = document.createElement('canvas'); stoneSpr.width = 4; stoneSpr.height = 4;
      var g = stoneSpr.getContext('2d');
      g.fillStyle = '#2a2628'; g.fillRect(1, 0, 2, 4); g.fillRect(0, 1, 4, 2);
      g.fillStyle = '#9a96a2'; g.fillRect(1, 1, 2, 2); g.fillStyle = '#d0ccd6'; g.fillRect(1, 1, 1, 1);
    }
    return stoneSpr;
  }
  // Después de la luz: piedras en vuelo, partículas, textos y los ojos de los gatos escondidos.
  function drawFx(ctx, G, cx, cy) {
    var i, sp = piedra();
    if (ACH.armas && ACH.armas.drawFx) ACH.armas.drawFx(ctx, G, cx, cy);   // v0.8: astillas, chispas de la moto y el aviso «E agarrar skate»
    var ms = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx.molotov;
    for (i = 0; i < stones.length; i++) {
      var s = stones[i];
      if (s.kind === 'molotov') {
        var mf = ms && ms.length ? ms[Math.floor(s.t * 12) % ms.length] : null;
        if (mf && mf.width) ctx.drawImage(mf, Math.round(s.x) - cx - 7, Math.round(s.y - s.z) - cy - 15);
        else { ctx.fillStyle = '#3a8a4a'; ctx.fillRect(Math.round(s.x) - cx - 1, Math.round(s.y - s.z) - cy - 4, 3, 5); ctx.fillStyle = '#ffb040'; ctx.fillRect(Math.round(s.x) - cx, Math.round(s.y - s.z) - cy - 6, 1, 2); }
        continue;
      }
      if (s.kind === 'globosAgua') {   // v0.11: globito celeste con su nudo
        var gx0 = Math.round(s.x) - cx, gy0 = Math.round(s.y - s.z) - cy;
        ctx.fillStyle = '#131015'; ctx.fillRect(gx0 - 2, gy0 - 3, 5, 5);
        ctx.fillStyle = '#4aa8ff'; ctx.fillRect(gx0 - 1, gy0 - 2, 3, 3);
        ctx.fillStyle = '#bfe8ff'; ctx.fillRect(gx0 - 1, gy0 - 2, 1, 1);
        ctx.fillStyle = '#ff2e88'; ctx.fillRect(gx0, gy0 + 2, 1, 1);
        continue;
      }
      ctx.drawImage(sp, Math.round(s.x) - cx - (sp.width >> 1), Math.round(s.y - s.z) - cy - (sp.height >> 1));
    }
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], life = q.t / q.life;
      ctx.globalAlpha = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      ctx.fillStyle = q.col;
      ctx.fillRect(Math.round(q.x) - cx, Math.round(q.y - q.z) - cy, q.sz, q.sz);
    }
    ctx.globalAlpha = 1;
    var cats = G.cats || [];
    ctx.fillStyle = '#ffe14a';
    for (i = 0; i < cats.length; i++) {
      var c = cats[i];
      if (c.state !== 'hide' || Math.floor(c.anim / 1.6) % 4 === 3) continue;   // parpadea
      var ex = Math.round(c.x) - cx, ey = Math.round(c.y - c.z) - cy - 4;
      ctx.globalAlpha = 0.85; ctx.fillRect(ex - 3, ey, 1, 1); ctx.fillRect(ex, ey, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (texts.length) {
      ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (i = 0; i < texts.length; i++) {
        var t = texts[i], tx = Math.round(t.x) - cx, ty = Math.round(t.y - t.t * 18) - cy;
        ctx.globalAlpha = t.t > 0.4 ? 1 - (t.t - 0.4) / 0.2 : 1;
        ctx.fillStyle = '#ffe500'; ctx.fillText(t.s, tx + 1, ty + 1);
        ctx.fillStyle = '#ff2e88'; ctx.fillText(t.s, tx, ty);
      }
      ctx.globalAlpha = 1; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
  }
  // Trayectoria prevista mientras se tensa: puntos en el arco, sombra punteada en el piso y la marca de caída.
  function drawAim(ctx, G, cx, cy) {
    if (!slingActive(G)) return;
    var sim = simulate(G), pts = sim.pts, i;
    ctx.fillStyle = '#141216'; ctx.globalAlpha = 0.35;
    for (i = 0; i < pts.length; i += 6) ctx.fillRect(Math.round(pts[i].x) - cx, Math.round(pts[i].y) - cy, 1, 1);
    ctx.globalAlpha = 0.9;
    for (i = 3; i < pts.length; i += 4) {
      var q = pts[i], x = Math.round(q.x) - cx, y = Math.round(q.y - q.z) - cy;
      ctx.fillStyle = '#141216'; ctx.fillRect(x, y + 1, 2, 1);
      ctx.fillStyle = i % 8 === 3 ? '#ffe500' : '#fff6b0'; ctx.fillRect(x, y, 1, 1);
    }
    var ex = Math.round(sim.x) - cx, ey = Math.round(sim.y) - cy;
    ctx.globalAlpha = 1; ctx.fillStyle = sim.end === 'land' ? '#ff2e88' : '#ffb020';
    ctx.fillRect(ex - 3, ey, 2, 1); ctx.fillRect(ex + 2, ey, 2, 1); ctx.fillRect(ex, ey - 2, 1, 1); ctx.fillRect(ex, ey + 2, 1, 1);
    if (sim.kind === 'molotov') {   // v0.9: radio del incendio (círculo naranja punteado; tabla precalculada, sin arc)
      ctx.fillStyle = '#ff8a30'; ctx.globalAlpha = 0.85;
      for (i = 0; i < RING.length; i += 2) ctx.fillRect(ex + RING[i], ey + RING[i + 1], 1, 1);
      ctx.globalAlpha = 1;
    }
    // barra de carga junto a Alexander
    var s = G.sling, p = G.player, bx = Math.round(p.x) - cx - 7, by = Math.round(p.y) - cy + 4;
    ctx.fillStyle = '#141216'; ctx.fillRect(bx, by, 14, 3);
    ctx.fillStyle = '#1fe07a'; ctx.fillRect(bx + 1, by + 1, Math.round(12 * s.c), 1);
    if (Math.abs(s.spin) > 0.05) { ctx.fillStyle = '#ff2e88'; ctx.fillRect(bx + 7, by + 2, Math.round(6 * s.spin), 1); }
  }
  var RING = (function () { var o = [], n = 28; for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2; o.push(Math.round(Math.cos(a) * ML.fireR), Math.round(Math.sin(a) * ML.fireR)); } return o; })();
  // F3: piedras, traza real del último tiro contra la prevista al soltar.
  function drawDebug(ctx, G, cx, cy) {
    var i, L = G.lastStone, P = G.lastPreview;
    if (P) { ctx.fillStyle = 'rgba(255,229,0,.7)'; for (i = 0; i < P.pts.length; i += 2) ctx.fillRect(Math.round(P.pts[i].x) - cx, Math.round(P.pts[i].y - P.pts[i].z) - cy, 1, 1); }
    if (L && L.trace) { ctx.fillStyle = 'rgba(31,224,122,.9)'; for (i = 1; i < L.trace.length; i += 2) ctx.fillRect(Math.round(L.trace[i].x) - cx, Math.round(L.trace[i].y - L.trace[i].z) - cy + 1, 1, 1); }
    for (i = 0; i < stones.length; i++) { ctx.strokeStyle = '#1fe07a'; ctx.strokeRect(Math.round(stones[i].x) - cx - 3.5, Math.round(stones[i].y) - cy - 3.5, 7, 7); }
    var props = ACH.world.props;
    ctx.font = '8px monospace'; ctx.fillStyle = '#ff2e88';
    for (i = 0; i < props.length; i++) {
      var pr = props[i];
      if (!pr._ik || pr.dstate === 0 && pr.ihp === pr._ik.hp) continue;
      ctx.fillText(Math.max(0, pr.ihp) + '/' + pr._ik.hp, Math.round(pr.x) - cx - 8, Math.round(pr.y) - cy + 9);
    }
  }

  ACH.inter = {
    SL: SL, CFG: CFG, KINDS: KINDS, kindOf: kindOf,
    hitProps: hitProps, hitAnimals: hitAnimals, damageProp: damageProp,
    updateSling: updateSling, slingActive: slingActive, slingPose: slingPose, simulate: simulate, ML: ML,
    molotovPose: molotovPose, cycleRanged: cycleRanged,
    rangedInfo: function (G) { G = G || ACH.G; var p = G && G.player; if (!p) return null; var k = ensureRanged(p), I = ACH.inv; return { kind: k, ammo: I && I.count ? I.count(ammoId(k)) : 0, sling: invHas('resortera'), molotov: invHas('molotov'), globos: invHas('globosAgua'), charging: slingActive(G) }; },
    throwNow: throwNow, globoSplash: function (G, x, y) { return globoSplash(G || ACH.G, { trace: [] }, x, y, 0); }, GL: GL,
    update: update, reset: reset, drawGround: drawGround, drawFx: drawFx, drawAim: drawAim, drawCat: drawCat, drawDebug: drawDebug,
    lightsInto: lightsInto, onLampOut: null, keepTrace: false, lastHard: 0,
    stones: function () { return stones; }, alarms: function () { return alarms; }, hideSpots: function () { return hideSpots; },
    cats: function (G) { return (G.cats || []).map(function (c) { return { id: c.id, x: Math.round(c.x), y: Math.round(c.y), z: Math.round(c.z), state: c.state, spot: c.spot ? c.spot.kind : null }; }); },
    props: function () {
      var out = [];
      ACH.world.props.forEach(function (pr, i) {
        var K = initProp(pr); if (!K) return;
        out.push({ i: i, k: pr.k, x: pr.x, y: pr.y, cls: K.cls, hp: K.hp === undefined ? null : Math.max(0, pr.ihp), hpMax: K.hp || null,
          state: pr.dstate, broken: !!pr.broken, alarm: +(pr.alarmT || 0).toFixed(2), lampOut: !!pr.lampOut });
      });
      return out;
    }
  };
})();
