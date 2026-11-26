/* ACHORADO — js/engine/armas.js (v0.8, G1): la guitarra que se gasta, los puñetes, lo que Alexander lleva en la mano (skate),
   lo que se lanza o se patea (skate, bici, moto, carretilla), la invisibilidad que rompe el ruido fuerte y los efectos de comida y bebida.
   API (ACH.armas):
     guitarState() → 0 sana · 1 rajada · 2 muy rajada · 3 rota          repairGuitar(n=15) → bool (lo llama inventario.js con `cuerdas`)
     alexSet(v)    → 'g1' | 'g2' | 'g3' | null (juego de cuadros de render.js; null si sprites.js aún no lo trae)
     pose(p)       → 'punch' | 'skateHold' | 'skateSwing' | 'kick' | 'sick' | null        poseFrame(p) → índice de cuadro
     weapon(p)     → parámetros del golpe actual (entities.js)              afterSwing(G, r) → gasta la guitarra o el skate
     loose[]       → {id, x, y, vx, vy, dur, state, ...}  (state: 'idle' | 'held' | 'broken' | 'wrecked'; thrown = vuela golpeando)
     spawnLoose(id, x, y, vx, vy) → la única forma de crear objetos sueltos (ids: skate, bici, moto, carretilla, silla)
     drawLoose(ctx, cx, cy) / ysortItems() → para render.js (si nadie los llama, los objetos se dibujan solos como props del y-sort)
     defs[id] · define(id, def) → tabla extensible de objetos (modos hand · push · carry · kick · static; ver «Tabla de objetos»)
     grab(L) · drop() → agarrar / soltar desde fuera (debug, tutoriales)
     breakInvis(G, why) · context() (botón táctil) · playerMods(p) · update(G, dt) · reset(G) · onDeath(G) · onRespawn(G)
   Los temporizadores p.invisT / p.sickT / p.boostT los pone inventario.js (G2); armas.js los descuenta salvo que otro ya lo haga.
   v0.9 (H3): defs.escoba (mano; giro 360° radio 26, ventilador al mantener ESPACIO, 30 golpes) y defs.tele (carry pesado: F mantener
   y soltar, arco corto 30–90 px, impacto en área, restos y botín, tumba carretillas). E agarra props.escobaPared y props.tele enteras.
   fanning(p) → bool (giro o ventilador de escoba: aves.js no deja entrar la picada) · throwHeavy() · p.wetT (×0.8) y p.burnT en playerMods.
   p.wetT lo pone y lo descuenta senoras.js (H2); aquí solo se lee.
   v0.11 (A, V011.md §2.1–2.2): ACH.cfg.durMul (2) multiplica la guitarra (60 → 120) y todo def.hold.hits (holdMax(d)).
   repairAll({guitar, heldFrac}) · heldInfo() · stow() · equip(id, dur) · guitarInfo() · setGuitar(n | {dur, max}) · aimHeavy() (tiro pesado).
   Defs carry nuevos: aimRecent (mouse solo si se movió en 2 s), chargeMin (s), fly.high (px: por encima de eso pasa sobre los props). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var D2R = Math.PI / 180;
  // v0.11 (A, V011.md §2.1): las armas duran el doble. Un solo multiplicador, aplicado donde se lee la durabilidad.
  ACH.cfg = ACH.cfg || {};
  if (ACH.cfg.durMul === undefined) ACH.cfg.durMul = 2;
  function durMul() { var m = ACH.cfg && +ACH.cfg.durMul; return m > 0 ? m : 1; }

  /* ---------------- Afinación (SPEC v0.8) ---------------- */
  var K = {
    guitarMax: 60, hardCost: 2, repair: 15, warnAt: [0.33, 0.10],
    punch: { kind: 'punch', dmg: 0.34, range: 14, arc: 70 * D2R, knock: 12, cd: 0.22, cost: 4, noise: 40, dur: 0.18, frame: 0.06,
      swingSfx: 'punch.swing', hitSfx: 'punch.hit', hitText: [['¡PAF!'], ['¡PAF!', '¡PUM!', '¡TOMA!']], pose: 'punch' },
    grabR: 18, promptR: 18, eBuf: 0.25,
    hitR: 9, radius: 3, bounce: 0.3, stopSp: 12, looseMax: 14, crashNoise: 200, crashProp: 2,
    pushMul: 0.8, kickT: 0.24, throwT: 0.2, grav: 420,
    sickMul: 0.7, boostRegen: 2.5, boostRun: 0.6,
    wetMul: 0.8   // v0.9 (H3): mojado
  };

  /* ---------------- Tabla de objetos (extensible) ----------------
     ACH.armas.defs[id] = {
       name   texto del aviso («E agarrar <name>»)          spr   clave en ACH.sprites.props (con .broken opcional)
       mode   'hand'  se lleva en la mano y se pega con él (hold = parámetros del golpe, como weapon())
              'push'  E lo agarra y se empuja (sin golpe); F o ESPACIO lo suelta lanzado
              'carry' pesado: se carga sobre la cabeza (sin golpe, camina más lento); F lo lanza en arco (fly.lob = velocidad hacia arriba)
              'kick'  no se agarra: F lo patea
              'static' solo decorado móvil (silla de ruedas): ni se agarra ni se lanza
       hold   {kind, dmg, range, arc (rad; 2π = giro de 360°), knock, cd, cost, noise, dur, frame, hits, swingSfx, hitSfx, hitText, pose}
       poses  {hold, swing}: poses de Alexander para render.js (sprites.js)   lift  px sobre el piso cuando va en la mano
       fly    {sp, fric (1/s), dmg, knock, slow (frenada por choque), pierce (cuántos atraviesa), crash (choque grande al tocar sólido),
               kicks (veces que se patea antes de voltearse), lob (vz inicial: vuela en arco y golpea al caer, radio splash)}
       loop   sonido en bucle mientras rueda          breakSfx / breakDecal / breakText  al gastarse en la mano
       speedMul (mode push/carry) multiplicador de la velocidad de Alexander
       onStop(G, L) / onBreak(G, L) opcionales
     }
     Nivel 2 (ejemplos): escoba = mode 'hand', hold.arc = 2*Math.PI; televisor = mode 'carry', fly.lob = 140, splash 14. */
  var defs = {
    skate: { name: 'skate', spr: 'skateSuelto', mode: 'hand', lift: 7, loop: 'roll.skate',
      hold: { kind: 'skate', dmg: 1, range: 22, arc: 100 * D2R, knock: 40, cd: 0.30, cost: 8, noise: 90, dur: 0.27, frame: 0.09, hits: 15,
        swingSfx: 'skate.swing', hitSfx: 'skate.hit', hitText: [['¡TRAC!'], ['¡TRAC!', '¡PUM!', '¡CRAC!']] },
      poses: { hold: 'skateHold', swing: 'skateSwing' },
      breakSfx: 'skate.break', breakDecal: 'skateMitad', breakText: '¡Se partió el skate!',
      fly: { sp: 260, fric: 0.9, dmg: 2, knock: 60, slow: 0.92, pierce: 99 } },
    bici: { name: 'bici', spr: 'biciCaida', mode: 'push', speedMul: 0.8,
      fly: { sp: 300, fric: 1.5, dmg: 2, knock: 80, slow: 0.62, pierce: 99 } },
    moto: { name: 'moto', spr: 'motoCaida', mode: 'push', speedMul: 0.8, loop: 'throw.moto',
      fly: { sp: 380, fric: 0.35, dmg: 3, knock: 120, slow: 0.95, pierce: 5, crash: true } },
    carretilla: { name: 'carretilla', spr: 'carretillaSuelta', mode: 'kick', loop: 'cart.roll', kickSfx: 'kick.cart',
      fly: { sp: 240, fric: 2.0, dmg: 2, knock: 70, slow: 0.7, pierce: 99, kicks: 3 },
      onStop: function (G, L) { spill(G, L); if (L.kicks >= (L.def.fly.kicks || 3)) L.state = 'broken'; } },
    silla: { name: 'silla', spr: 'sillaRuedas', mode: 'static', fly: { sp: 0, fric: 1.6, dmg: 0, knock: 0, slow: 1, pierce: 0 } },
    // v0.9 (H3, SPEC §7.1): escoba en la mano. ESPACIO = giro de 360° (radio 26); mantener = ventilador hasta 1,5 s (golpe cada 0,25 s).
    escoba: { name: 'escoba', spr: 'escoba', mode: 'hand', lift: 0,
      hold: { kind: 'escoba', dmg: 1, range: 26, arc: 2 * Math.PI, knock: 55, cd: 0.55, cost: 12, noise: 80, dur: 0.40, frame: 0.10, hits: 30,
        swingSfx: 'escoba.swing', hitSfx: 'escoba.hit', hitText: [['¡FUAP!'], ['¡FUAP!', '¡ZAS!', '¡TOMA!']] },
      poses: { hold: 'escobaHold', swing: 'escobaSpin' },
      fan: { max: 1.5, every: 0.25, cost: 22, walk: 0.55, sfxEvery: 0.4 },
      breakSfx: 'escoba.break', breakDecal: 'escobaRota', breakText: '¡Se partió la escoba!',
      onBreak: function (G) {
        var p = G.player, v = ACH.ent.DIRV[p.dir] || [1, 0];
        sfx('escoba.break', { x: p.x, y: p.y });
        burst(p.x + v[0] * 8, p.y, 10, 12, 'wood', 80, 60);
        burst(p.x, p.y, 8, 8, 'straw', 70, 50);
        addDecal('escobaRota', p.x + v[0] * 10, p.y + 3, v[0] < 0);
        toast('¡Se partió la escoba!');
        say('escoba', p);
      },
      fly: { sp: 230, fric: 2.4, dmg: 1, knock: 40, slow: 0.7, pierce: 3 } },
    // v0.9 (H3, SPEC §7.3): la tele, pesada. E la carga sobre la cabeza (65 %, sin correr, sin golpe, sin salto);
    // F mantener (hasta 0,6 s) y soltar = la tira en arco corto (30–90 px) hacia el mouse; al caer revienta en área.
    tele: { name: 'tele', spr: 'tele', mode: 'carry', heavy: true, speedMul: 0.65, carrySpeed: 0.65, lift: 18, chargeT: 0.6,
      throwRange: [30, 90], impact: { r: 20, dmg: 3, push: 80, stun: 0.6, noise: 150 }, flySpr: 'teleVuelo', z0: 22,
      fly: { sp: 0, fric: 3, dmg: 3, knock: 80, slow: 1, pierce: 99, lob: 110, splash: 20 },
      onLand: function (G, L) { heavyCrash(G, L); } }
  };
  // Props del mundo que se agarran con E (se sacan de W.props y pasan a ser objetos sueltos); armas.reset los devuelve al reiniciar el nivel.
  var GRAB_PROPS = { escobaPared: 'escoba', tele: 'tele' };
  var taken = [];
  var ALIAS = { skateSuelto: 'skate', biciCaida: 'bici', motoCaida: 'moto', carretillaSuelta: 'carretilla', sillaRuedas: 'silla' };
  function define(id, d) {
    d = d || {}; d.name = d.name || id; d.spr = d.spr || id; d.mode = d.mode || 'hand'; d.fly = d.fly || { sp: 0, fric: 1.6, dmg: 0, knock: 0, slow: 1, pierce: 0 };
    if (d.hold && !d.hold.kind) d.hold.kind = id;
    defs[id] = d; ALIAS[d.spr] = id; return d;
  }
  function defOf(id) { return defs[id] || null; }
  // v0.11: golpes máximos reales de lo que va en la mano (hits × durMul) y durabilidad máxima de la guitarra (60 × durMul)
  function holdMax(d) { return d && d.hold && d.hold.hits ? Math.max(1, Math.round(d.hold.hits * durMul())) : 0; }
  function gMax() { return Math.round(K.guitarMax * durMul()); }
  function grabbable(d) { return d && (d.mode === 'hand' || d.mode === 'push' || d.mode === 'carry'); }

  /* ---------------- Utilidades ---------------- */
  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) { try { au.emit(name, data); } catch (e) { /* nada */ } } }
  function say(id, p, o) {
    var au = ACH.audio; if (!au || !au.say) return;
    var d = { who: 'alex', x: p ? p.x : 0, y: p ? p.y : 0 }; if (o) for (var k in o) d[k] = o[k];
    try { au.say(id, d); } catch (e) { /* nada */ }
  }
  function toast(t) { if (ACH.hud && ACH.hud.toast) ACH.hud.toast(t); }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function W() { return ACH.world; }
  function CFG() { return ACH.ent.CFG; }
  function I() { return ACH.input; }

  /* ---------------- Sprites (con reemplazo provisorio) ---------------- */
  function mk(w, h, draw, ax, ay) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); draw(g); c.ax = ax; c.ay = ay; c.placeholder = true; return c;
  }
  function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w || 1, h || 1); }
  var PH = {};
  function placeholder(key) {
    if (PH[key]) return PH[key];
    var c;
    if (key === 'skateSuelto') c = mk(14, 6, function (g) { px(g, '#1b1416', 1, 0, 12, 3); px(g, '#c8402c', 2, 1, 10, 1); px(g, '#dcd8cc', 2, 3, 2, 2); px(g, '#dcd8cc', 10, 3, 2, 2); }, 7, 5);
    else if (key === 'biciCaida') c = mk(26, 10, function (g) {
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 1;
      g.beginPath(); g.arc(5.5, 5.5, 4, 0, 6.3); g.stroke(); g.beginPath(); g.arc(20.5, 5.5, 4, 0, 6.3); g.stroke();
      g.strokeStyle = '#b8322a'; g.beginPath(); g.moveTo(5, 5); g.lineTo(12, 3); g.lineTo(20, 5); g.moveTo(12, 3); g.lineTo(10, 7); g.stroke();
    }, 13, 9);
    else if (key === 'motoCaida') c = mk(30, 14, function (g) {
      px(g, '#141216', 2, 6, 26, 6); px(g, '#2a2a2e', 3, 8, 6, 5); px(g, '#2a2a2e', 21, 8, 6, 5); px(g, '#8a8f98', 5, 10, 2, 1); px(g, '#8a8f98', 23, 10, 2, 1);
      px(g, '#c02a2a', 9, 6, 11, 3); px(g, '#e0e0d8', 18, 2, 9, 6); px(g, '#141216', 18, 2, 9, 1); px(g, '#ffe14a', 27, 7, 2, 2);
    }, 15, 13);
    else if (key === 'carretillaSuelta') c = mk(24, 16, function (g) {
      px(g, '#141216', 2, 3, 18, 9); px(g, '#7a5a3a', 3, 4, 16, 7); px(g, '#5a3f26', 3, 4, 16, 1);
      px(g, '#f0a030', 5, 5, 3, 2); px(g, '#d8402a', 9, 5, 3, 2); px(g, '#6fbf3a', 13, 5, 3, 2); px(g, '#8a8f98', 19, 4, 4, 1);
      px(g, '#2a2a2e', 4, 12, 4, 4); px(g, '#2a2a2e', 14, 12, 4, 4);
    }, 11, 15);
    else if (key === 'sillaRuedas') c = mk(16, 16, function (g) {
      g.strokeStyle = '#9aa0a6'; g.lineWidth = 1; g.beginPath(); g.arc(8, 10, 5, 0, 6.3); g.stroke();
      px(g, '#2d4d7a', 4, 4, 8, 3); px(g, '#2d4d7a', 10, 1, 2, 6); px(g, '#c9ccd0', 7, 9, 2, 2);
    }, 8, 15);
    else if (key === 'guitarraRota') c = mk(20, 9, function (g) {
      px(g, '#141216', 1, 2, 9, 6); px(g, '#b9783a', 2, 3, 7, 4); px(g, '#141216', 5, 4, 2, 2);          // caja partida
      px(g, '#8a4b1d', 9, 3, 2, 3); px(g, '#141216', 12, 4, 6, 2); px(g, '#5a3314', 12, 4, 6, 1);       // mango suelto
      px(g, '#d0d6dd', 3, 5, 14, 1); px(g, '#8a4b1d', 17, 3, 2, 3);
    }, 10, 7);
    else if (key === 'skateMitad') c = mk(8, 5, function (g) { px(g, '#1b1416', 0, 0, 7, 3); px(g, '#c8402c', 1, 1, 5, 1); px(g, '#dcd8cc', 1, 3, 2, 2); }, 4, 4);
    else if (key === 'broken') c = null;
    PH[key] = c; return c;
  }
  function anch(c) { if (c && c.ax === undefined) { c.ax = c.width >> 1; c.ay = c.height - 1; } return c; }
  function spriteOf(key) {
    var P = ACH.sprites && ACH.sprites.props, c = P && P[key];
    if (Array.isArray(c)) c = c[0];
    if (c && c.getContext) return anch(c);
    var It = ACH.sprites && ACH.sprites.items, ic = It && It[key];   // v0.9: la escoba tirada usa su ícono (12×12, ancla 6,11)
    if (ic && ic.getContext) { if (ic.ax === undefined) { ic.ax = 6; ic.ay = 11; } return ic; }
    return placeholder(key);
  }
  function fxSprite(key) {
    var F = ACH.sprites && ACH.sprites.fx, c = F && F[key];
    if (Array.isArray(c)) c = c[0];
    if (c && c.getContext) return anch(c);
    return placeholder(key);
  }
  // Ícono de HUD de la guitarra (4 estados): ACH.sprites.fx.guitarIcon[state] o uno provisorio de 7×7.
  var ICON_PH = [];
  function guitarIcon(st) {
    var F = ACH.sprites && ACH.sprites.fx, a = F && F.guitarIcon;
    if (a && a[st] && a[st].getContext) return a[st];
    if (ICON_PH[st]) return ICON_PH[st];
    ICON_PH[st] = mk(7, 7, function (g) {
      var body = st >= 3 ? '#6a5040' : '#e0a050', neck = '#8a4b1d';
      if (st < 3) { px(g, neck, 4, 0, 2, 1); px(g, neck, 3, 1, 1, 1); px(g, neck, 2, 2, 1, 1); }
      else { px(g, neck, 5, 0, 1, 1); px(g, neck, 4, 1, 1, 1); }
      px(g, body, 0, 3, 3, 3); px(g, body, 1, 2, 3, 3); px(g, '#131015', 1, 4, 1, 1);
      if (st >= 1) px(g, '#131015', 2, 3, 1, 1);
      if (st >= 2) { px(g, '#131015', 0, 5, 1, 1); px(g, '#131015', 3, 2, 1, 1); }
      if (st >= 3) { px(g, '#ff2e88', 4, 4, 2, 1); px(g, '#ff2e88', 5, 3, 1, 3); }
    }, 0, 0);
    return ICON_PH[st];
  }

  /* ---------------- Guitarra ---------------- */
  function ensure(p) {
    if (!p) return null;
    if (!p.guitar) p.guitar = { dur: gMax(), max: gMax() };
    else if (p.guitar.max === K.guitarMax && gMax() !== K.guitarMax) {   // v0.11: guitarra de antes (60) → se escala a 120
      p.guitar.dur = Math.round(p.guitar.dur * gMax() / K.guitarMax); p.guitar.max = gMax();
    }
    if (p.held === undefined) p.held = null;
    if (p.invisT === undefined) p.invisT = 0;
    if (p.sickT === undefined) p.sickT = 0;
    if (p.boostT === undefined) p.boostT = 0;
    return p;
  }
  function stateOf(g) {
    if (!g) return 0;
    var f = g.dur / (g.max || gMax());
    return f > 0.66 ? 0 : (f > 0.33 ? 1 : (f > 0 ? 2 : 3));
  }
  function guitarState(p) { p = p || (ACH.G && ACH.G.player); return p && p.guitar ? stateOf(p.guitar) : 0; }
  function setGuitar(G, n) {
    var p = ensure(G.player), g = p.guitar, before = g.dur, s0 = stateOf(g);
    g.dur = Math.max(0, Math.min(g.max, n));
    var s1 = stateOf(g), f0 = before / g.max, f1 = g.dur / g.max;
    if (g.dur < before) {
      if (s1 > s0 && s1 < 3) sfx('guitar.crack', { x: p.x, y: p.y, state: s1 });
      for (var i = 0; i < K.warnAt.length; i++) {
        if (f0 > K.warnAt[i] && f1 <= K.warnAt[i] && g.dur > 0) { toast('¡La viola ya no aguanta!'); say('guitarLow', p); break; }
      }
      if (before > 0 && g.dur <= 0) breakGuitar(G);
    }
    return g.dur;
  }
  function wearGuitar(G, n) { var g = ensure(G.player).guitar; if (n > 0 && g.dur > 0) setGuitar(G, g.dur - n); }
  function breakGuitar(G) {
    var p = G.player, v = ACH.ent.DIRV[p.dir] || [1, 0];
    sfx('guitar.break', { x: p.x, y: p.y });
    burst(p.x + v[0] * 6, p.y, 12, 16, 'wood', 90, 70);
    burst(p.x + v[0] * 6, p.y, 12, 5, 'string', 60, 50);
    addDecal('guitarraRota', p.x + v[0] * 9, p.y + 2 + v[1] * 5, v[0] < 0);
    toast('¡Nooo, mi guitarra!');
    say('guitarBreak', p, { always: true });
    if (G.shake === undefined || !G.shake) G.shake = { amp: 3, t: 0.2, dur: 0.2 };
  }
  function repairGuitar(n) {
    var G = ACH.G, p = G && ensure(G.player); if (!p) return false;
    n = n === undefined ? K.repair : n;
    var g = p.guitar;
    if (g.dur <= 0) { toast('Ya no hay cuerda que la salve'); return false; }
    if (g.dur >= g.max) { toast('La viola está al cien, causa'); return false; }
    g.dur = Math.min(g.max, g.dur + n);   // el sonido y el texto «+15 guitarra» los pone inventario.js
    return true;
  }
  function restoreGuitar(p) { ensure(p); p.guitar.dur = p.guitar.max = gMax(); }

  /* ---------------- Arma del golpe ---------------- */
  var GUITAR = null;
  function guitarParams() {
    var C = CFG();
    if (!GUITAR) GUITAR = { kind: 'guitar' };
    GUITAR.dmg = C.atkDmg; GUITAR.range = C.atkRange; GUITAR.arc = C.atkArc; GUITAR.knock = C.atkKnock; GUITAR.cd = C.atkCD;
    GUITAR.cost = C.atkCost; GUITAR.noise = C.atkNoise; GUITAR.dur = C.atkDur; GUITAR.frame = C.atkFrame;
    return GUITAR;
  }
  // null = no puede golpear (empujando la bici o la moto, o cargando algo pesado)
  function weapon(p) {
    ensure(p);
    if (p.held) { var d = defOf(p.held.id); return d && d.mode === 'hand' && d.hold ? d.hold : null; }
    if (p.guitar.dur <= 0) return K.punch;
    return guitarParams();
  }
  // r = {kind, hits, blocked, props, hard}: el golpe que conecta gasta la guitarra (2 contra escudo, auto o poste) o lo que lleva en la mano.
  function afterSwing(G, r) {
    var p = G.player, any = r.hits > 0 || r.props > 0 || r.blocked > 0;
    if (!any) return;
    breakInvis(G, 'hit');
    var cost = (r.blocked > 0 || r.hard > 0) ? K.hardCost : 1;
    if (r.kind === 'guitar') { wearGuitar(G, cost); return; }
    var h = p.held, d = h && defOf(h.id);
    if (d && d.hold && d.hold.kind === r.kind && d.hold.hits) {
      h.dur -= cost;
      if (h.dur <= 0) breakHeld(G);
    }
  }
  function breakHeld(G) {
    var p = G.player, v = ACH.ent.DIRV[p.dir] || [1, 0], h = p.held, L = h && h.L, d = h && defOf(h.id);
    p.held = null;
    if (L) removeLoose(L);
    if (!d) return;
    if (d.onBreak) { d.onBreak(G, L); return; }
    if (d.breakSfx) sfx(d.breakSfx, { x: p.x, y: p.y });
    burst(p.x + v[0] * 8, p.y, 10, 10, 'wood', 80, 60);
    if (d.breakDecal) {
      addDecal(d.breakDecal, p.x + v[0] * 10 - 3, p.y + 2, false);
      addDecal(d.breakDecal, p.x + v[0] * 12 + 4, p.y + 4, true);
    }
    if (d.breakText) toast(d.breakText);
  }

  /* ---------------- Invisibilidad, empacho, subidón ---------------- */
  var tk = { ext: false, inv: null, sick: null, boost: null, wet: null, wetExt: false };
  // v0.9: p.wetT lo pone y lo descuenta senoras.js (ACH.senoras.tick, H2). Solo si senoras.js no está cargado lo descuenta armas.js.
  function tickWet(p, dt) {
    if (ACH.senoras && typeof ACH.senoras.tick === 'function') return;
    if (p.wetT > 0) p.wetT = Math.max(0, p.wetT - dt);
  }
  function breakInvis(G, why) {
    var p = G && G.player; if (!p || !(p.invisT > 0)) return false;
    p.invisT = 0; tk.inv = 0;
    sfx('invis.off', { x: p.x, y: p.y, why: why || '' });
    return true;
  }
  // Descuenta los temporizadores de G2 salvo que alguien más ya lo haga (se detecta si bajaron solos entre cuadros).
  function tickTimers(G, dt) {
    var p = ensure(G.player);
    if (!tk.ext) {
      if ((tk.inv !== null && p.invisT < tk.inv - 1e-6 && p.invisT > 0) || (tk.sick !== null && p.sickT < tk.sick - 1e-6 && p.sickT > 0) ||
          (tk.boost !== null && p.boostT < tk.boost - 1e-6 && p.boostT > 0)) tk.ext = true;
    }
    if (!tk.ext) {
      if (p.invisT > 0) { p.invisT = Math.max(0, p.invisT - dt); if (p.invisT === 0) sfx('invis.off', { x: p.x, y: p.y, why: 'time' }); }
      if (p.sickT > 0) p.sickT = Math.max(0, p.sickT - dt);
      if (p.boostT > 0) p.boostT = Math.max(0, p.boostT - dt);
    }
    tk.inv = p.invisT; tk.sick = p.sickT; tk.boost = p.boostT;
  }
  var MODS = { spd: 1, run: true, regen: 1, runCost: 1 };
  function playerMods(p) {
    ensure(p);
    MODS.spd = 1; MODS.run = true; MODS.regen = 1; MODS.runCost = 1;
    if (p.sickT > 0) { MODS.spd *= K.sickMul; MODS.run = false; }
    if (p.boostT > 0) { MODS.regen = K.boostRegen; MODS.runCost = K.boostRun; }
    if (p.held && p.held.push) {
      var d = defOf(p.held.id); MODS.spd *= d && d.speedMul ? d.speedMul : K.pushMul;
      if (d && (d.mode === 'carry' || d.heavy)) MODS.run = false;   // v0.9: con la tele encima no se corre
    }
    // v0.9 (H3): mojado (baldazo, p.wetT) camina al 80 %; quemándose casi no recupera aliento; ventilador de escoba al 55 %
    if (p.wetT > 0) MODS.spd *= K.wetMul;
    if (p.burnT > 0) MODS.regen *= 0.3;
    if (p.fanT >= 0 && p.atkT >= 0) { var fd = p.held && defOf(p.held.id); MODS.spd *= (fd && fd.fan ? fd.fan.walk : 0.55) / 0.5; }   // entities.js ya frena a 0,5 en el golpe
    return MODS;
  }
  // ¿Gira la escoba? (giro o ventilador): aves.js lo usa para que la picada no entre.
  function fanning(p) {
    p = p || (ACH.G && ACH.G.player); if (!p) return false;
    return p.atkT >= 0 && !!p.atkW && p.atkW.arc >= 6;
  }

  /* ---------------- Objetos sueltos ---------------- */
  var loose = [], decals = [], parts = [], texts = [];
  var wired = false;   // render.js llama a drawLoose / ysortItems: ya no se meten en W.props
  function mkPr(L) {
    return { k: L.def.spr, v: 0, dir: 'E', x: Math.round(L.x), y: Math.round(L.y), fw: 0, fh: 0, tall: false, tree: false,
      x0: L.x, x1: L.x, y0: L.y, y1: L.y, cob: false, fade: 1, fb: null, lift: 0, sortDy: 0, loose: true, armas: true, dstate: 0, broken: false };
  }
  function spawnLoose(id, x, y, vx, vy) {
    if (!defs[id]) id = ALIAS[id] || String(id).replace(/Suelto$|Caida$|Suelta$/, '');
    var d = defs[id]; if (!d) return null;
    var L = { id: id, def: d, x: x, y: y, z: 0, vz: 0, vx: vx || 0, vy: vy || 0, dur: holdMax(d), state: 'idle', thrown: false, kicks: 0, spills: 0,
      hits: [], pierced: 0, flip: (vx || 0) < 0, loop: null, pr: null, inProps: false, t: 0 };
    L.pr = mkPr(L);
    loose.push(L);
    while (loose.length > K.looseMax) {
      var j = 0; while (j < loose.length && (loose[j].state === 'held' || loose[j].thrown)) j++;
      if (j >= loose.length - 1) break;
      removeLoose(loose[j]);
    }
    syncPr(L);
    return L;
  }
  function removeLoose(L) {
    stopLoop(L);
    if (L.inProps) { var P = W().props, i = P.indexOf(L.pr); if (i >= 0) P.splice(i, 1); L.inProps = false; }
    var k = loose.indexOf(L); if (k >= 0) loose.splice(k, 1);
  }
  function heldPlaceholderVisible(L) {   // lo que va en la mano se dibuja suelto mientras sprites.js no traiga su pose (skateHold…)
    if (L.state !== 'held') return true;
    var d = L.def, ph = (d.poses && d.poses.hold) || (d.mode === 'carry' ? 'carry' : null); if (!ph) return true;
    var A = ACH.sprites && ACH.sprites.alex, G = ACH.G, v = G && G.player && G.player.bird ? 'bird' : 'nobird';
    return !(A && A[v] && A[v][ph]);
  }
  function liftOf(L) { return L.state === 'held' ? (L.def.lift !== undefined ? L.def.lift : (L.def.mode === 'carry' ? 18 : 0)) : Math.round(L.z || 0); }
  function syncPr(L) {
    var pr = L.pr, s = spriteOf(L.def.spr);
    pr.x = Math.round(L.x); pr.y = Math.round(L.y);
    pr.x0 = pr.x1 = pr.x; pr.y0 = pr.y1 = pr.y;
    pr.broken = L.state === 'broken' || L.state === 'wrecked'; pr.dstate = pr.broken ? (L.state === 'wrecked' ? 3 : 1) : 0;
    pr.lift = liftOf(L);
    if (pr._spr !== s) pr._spr = s;
    if (s) { pr.rx0 = pr.x - s.ax; pr.ry0 = pr.y - s.ay - pr.lift; pr.rx1 = pr.rx0 + s.width; pr.ry1 = pr.ry0 + s.height; }
    var want = !wired && !!s && heldPlaceholderVisible(L);
    if (want !== L.inProps) {
      var P = W().props;
      if (want) P.push(pr); else { var i = P.indexOf(pr); if (i >= 0) P.splice(i, 1); }
      L.inProps = want;
    }
  }
  function startLoop(L) {
    var n = L.def.loop, au = ACH.audio; if (!n || L.loop || !au || typeof au.loop !== 'function') return;
    try { L.loop = au.loop(n, { x: L.x, y: L.y, speed: Math.sqrt(L.vx * L.vx + L.vy * L.vy) }); } catch (e) { L.loop = null; }
  }
  function stopLoop(L) { if (L.loop) { try { L.loop.stop(); } catch (e) { /* nada */ } } L.loop = null; }

  function launch(G, L, ux, uy, how) {
    var d = L.def, F = d.fly, p = G.player;
    if (!F || !F.sp) return false;
    var sx = p.x + ux * 9, sy = p.y + uy * 5;
    if (W().collideCircle(sx, sy, K.radius)) { sx = p.x; sy = p.y; }
    L.x = sx; L.y = sy; L.vx = ux * F.sp; L.vy = uy * F.sp; L.flip = ux < 0;
    L.z = F.lob ? liftOf(L) || 14 : 0; L.vz = F.lob || 0;
    L.state = 'idle'; L.thrown = true; L.hits = []; L.pierced = 0; L.t = 0;
    if (how === 'kick') { L.kicks++; p.kickT = K.kickT; sfx(d.kickSfx || ('kick.' + L.id), { x: L.x, y: L.y }); }
    else { p.throwT = K.throwT; sfx('throw.' + L.id, { x: L.x, y: L.y }); say('throw', p); }
    startLoop(L);
    syncPr(L);
    return true;
  }
  function spill(G, L) {
    if (L.spills >= (L.def.fly.kicks || 3)) return;
    L.spills++;
    var idefs = ACH.inv && ACH.inv.defs, fruit = idefs && idefs.fruta ? 'fruta' : (Math.random() < 0.5 ? 'gaseosa' : 'anticucho');
    var items = [{ id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) }];
    if (Math.random() < 0.7) items.push({ id: fruit, n: 1 });
    sfx('cart.spill', { x: L.x, y: L.y });
    burst(L.x, L.y, 6, 8, 'fruit', 60, 50);
    if (ACH.inv && ACH.inv.drop) { try { ACH.inv.drop(L.x, L.y + 4, items); } catch (e) { console.warn('[ACHORADO] inv.drop', e); } }
  }
  function onStop(G, L) {
    var was = L.thrown;
    L.vx = L.vy = 0; L.vz = 0; L.z = 0; L.thrown = false; stopLoop(L);
    if (was && L.def.onStop) L.def.onStop(G, L);
  }
  function crash(G, L) {
    L.vx = L.vy = 0; L.vz = 0; L.z = 0; L.thrown = false; L.state = 'wrecked'; stopLoop(L);
    sfx(L.id + '.crash', { x: L.x, y: L.y });
    burst(L.x, L.y, 8, 22, 'spark', 110, 70);
    burst(L.x, L.y, 8, 10, 'metal', 80, 60);
    floatText(L.x, L.y - 18, '¡CATAPLUM!');
    if (ACH.ent && ACH.ent.emitNoise) ACH.ent.emitNoise(G, L.x, L.y, K.crashNoise);
    if (ACH.inter && ACH.inter.hitProps) { try { ACH.inter.hitProps(G, L.x, L.y, 12, K.crashProp, 'swing'); } catch (e) { /* nada */ } }
    breakInvis(G, L.id);
    G.shake = { amp: 4, t: 0.3, dur: 0.3 };
  }
  // r = radio de impacto (K.hitR rodando; F.splash al caer un objeto lanzado en arco)
  function hitZombies(G, L, F, r) {
    var zs = G.zombies, sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy) || 1, ux = L.vx / sp, uy = L.vy / sp;
    r = r || K.hitR;
    for (var i = 0; i < zs.length; i++) {
      var z = zs[i];
      if (z.state === 'muerto' || L.hits.indexOf(z) >= 0) continue;
      if (Math.abs(z.x - L.x) > r || Math.abs(z.y - L.y) > r || dist(z.x, z.y, L.x, L.y) > r) continue;
      L.hits.push(z);
      var killed = ACH.ent.hitZombie(G, z, ux, uy, { from: { x: L.x - ux * 12, y: L.y - uy * 12 }, dmg: F.dmg, knock: F.knock, src: L.id });
      if (killed === undefined) {   // escudo de carretilla: rebota
        if (F.crash) { crash(G, L); return; }
        L.vx = -L.vx * 0.4; L.vy = -L.vy * 0.4;
        return;
      }
      breakInvis(G, 'hit');
      z.hurtT = 0.15;
      if (ACH.fx && ACH.fx.hit) swapText(['¡PUM!'], ['¡PUM!', '¡PAF!'], function () { ACH.fx.hit(G, z, ux, uy, killed, L.hits.length === 1); });
      sfx('hit.' + L.id, { x: z.x, y: z.y, type: z.type, killed: killed });
      if (killed) { sfx('kill', { x: z.x, y: z.y, type: z.type }); if (ACH.ent.say) ACH.ent.say('kill', G.player.x, G.player.y); }
      L.vx *= F.slow; L.vy *= F.slow;
      L.pierced++;
      if (L.pierced >= F.pierce) { if (F.crash) { crash(G, L); return; } L.vx *= 0.3; L.vy *= 0.3; }
    }
  }
  function collAt(Wd, x, y, hi) { if (hi) { var TT = Wd.T || 16; return Wd.isSolidTile(Math.floor(x / TT), Math.floor(y / TT)); } return Wd.collideCircle(x, y, K.radius); }
  function physics(G, L, dt) {
    var F = L.def.fly, Wd = W();
    var sp = Math.sqrt(L.vx * L.vx + L.vy * L.vy), air = L.z > 0 || L.vz > 0;
    if (sp < K.stopSp && !air) { if (sp > 0 || L.thrown) onStop(G, L); return; }
    L.t += dt;
    if (air) {   // lanzado en arco (mode 'carry'): vuela sin golpear y golpea en área al caer
      L.vz -= K.grav * dt; L.z += L.vz * dt;
      if (L.z <= 0) {
        L.z = 0; L.vz = 0;
        if (L.thrown && L.def.onLand) { L.def.onLand(G, L); return; }   // v0.9: la tele revienta al caer
        if (L.thrown) { hitZombies(G, L, F, F.splash || 14); if (L.state === 'wrecked') return; }
        if (F.crash) { crash(G, L); return; }
        L.vx *= 0.35; L.vy *= 0.35;
      }
    }
    var n = Math.max(1, Math.ceil(sp * dt / 3)), sdx = L.vx * dt / n, sdy = L.vy * dt / n;
    // v0.11: lo que vuela alto (F.high = altura en px) pasa por encima de autos y props; solo lo paran las paredes (tiles sólidos)
    var hiOK = !!(F.high && L.z > F.high && typeof Wd.isSolidTile === 'function');
    for (var s = 0; s < n; s++) {
      var hitX = false, hitY = false;
      if (collAt(Wd, L.x + sdx, L.y, hiOK)) hitX = true; else L.x += sdx;
      if (collAt(Wd, L.x, L.y + sdy, hiOK)) hitY = true; else L.y += sdy;
      if (hitX || hitY) {
        if (L.thrown && F.crash) { crash(G, L); return; }
        if (L.thrown && ACH.inter && ACH.inter.damageProp) {   // el golpe contra un auto, poste o basura también cuenta
          var pr = Wd.propAt(L.x + (hitX ? sdx * 2 : 0), L.y + (hitY ? sdy * 2 : 0));
          if (pr && !pr.armas && L.lastProp !== pr) { L.lastProp = pr; try { ACH.inter.damageProp(G, pr, 1, 'swing'); } catch (e) { /* nada */ } }
        }
        if (hitX) { L.vx = -L.vx * K.bounce; sdx = -sdx * K.bounce; }
        if (hitY) { L.vy = -L.vy * K.bounce; sdy = -sdy * K.bounce; }
      }
      if (L.thrown && !(L.z > 0)) { hitZombies(G, L, F); if (L.state === 'wrecked') return; }
    }
    if (!(L.z > 0)) { var f = Math.exp(-F.fric * dt); L.vx *= f; L.vy *= f; }
    if (L.vx < -1) L.flip = true; else if (L.vx > 1) L.flip = false;
    if (L.loop && L.loop.move) { try { L.loop.move(L.x, L.y); } catch (e) { /* nada */ } }
  }
  function followHeld(G, L) {
    var p = G.player, v = ACH.ent.DIRV[p.dir] || [1, 0], m = L.def.mode;
    if (m === 'hand') { L.x = p.x + (v[0] !== 0 ? v[0] * 5 : 5); L.y = p.y + 0.5 + (v[1] > 0 ? 1 : 0); }
    else if (m === 'carry') { L.x = p.x; L.y = p.y + 0.5; }
    else { L.x = p.x + v[0] * 10; L.y = p.y + v[1] * 6 + 1; }
    L.flip = v[0] < 0;
  }

  /* ---------------- Cerca de Alexander: qué se puede hacer ---------------- */
  var FOOD = /^(anticuchos|papaHuevo|choclo)/;
  function cartTakeFn() { var iv = ACH.inv; return iv && (iv.cartTake || iv.takePortion || iv.takeFromCart) || null; }
  function nearest(G) {
    var p = G.player, best = null, bd = K.grabR;
    for (var i = 0; i < loose.length; i++) {
      var L = loose[i], md = L.def.mode;
      if (L.state !== 'idle' || L.thrown) continue;
      if (!grabbable(L.def) && md !== 'kick') continue;
      if (md === 'kick' && L.def.fly.kicks && L.kicks >= L.def.fly.kicks) continue;
      var d = dist(p.x, p.y, L.x, L.y);
      if (d < bd) { bd = d; best = { L: L, d: d }; }
    }
    // v0.9: escoba apoyada en la pared y tele entera del basural: se agarran con E
    var PP = W().props;
    for (i = 0; i < PP.length; i++) {
      var gp = PP[i], gid = GRAB_PROPS[gp.k];
      if (!gid || gp.broken || (gp.dstate > 0 && gid !== 'tele') || !defs[gid]) continue;   // v0.13 T2 (C5): la tele abollada también se agarra
      var gx = Math.max(gp.x0 - p.x, 0, p.x - gp.x1), gy = Math.max(gp.y0 - p.y, 0, p.y - gp.y1);
      var gd = gp.fw > 0 ? Math.sqrt(gx * gx + gy * gy) : dist(p.x, p.y, gp.x, gp.y);
      if (gd < bd) { bd = gd; best = { prop: gp, id: gid, d: gd }; }
    }
    if (!best && cartTakeFn()) {
      var P = W().props;
      for (i = 0; i < P.length; i++) {
        var pr = P[i]; if (pr.armas || pr.broken || !FOOD.test(pr.k)) continue;
        var cc = ACH.inv && ACH.inv.cartOfProp ? ACH.inv.cartOfProp(pr) : null;
        if (cc && !(cc.n > 0)) continue;   // QA v0.8: la carretilla vacía ya no ofrece «E sacar comida»
        var dx = Math.max(pr.x0 - p.x, 0, p.x - pr.x1), dy = Math.max(pr.y0 - p.y, 0, p.y - pr.y1);
        var dd = pr.fw > 0 ? Math.sqrt(dx * dx + dy * dy) : dist(p.x, p.y, pr.x, pr.y);
        if (dd < bd) { bd = dd; best = { food: pr, d: dd }; }
      }
    }
    return best;
  }
  var ctx = { near: null, label: null, act: null };
  function computeContext(G) {
    var p = G.player;
    ctx.near = null; ctx.label = null; ctx.act = null; ctx.prompt = null;
    if (!p || p.hp <= 0) return;
    if (p.held) {
      var hd = defOf(p.held.id);
      ctx.act = { label: 'LANZAR', code: 'KeyF' };
      if (hd && hd.mode === 'carry') ctx.prompt = p.carryCharging ? null : 'F mantener: tirar ' + hd.name;
      else if (p.held.push) ctx.prompt = 'F lanzar ' + (hd ? hd.name : p.held.id);
      return;
    }
    var n = nearest(G); if (!n) return;
    ctx.near = n;
    if (n.food) { ctx.prompt = 'E sacar comida'; ctx.act = { label: 'AGARRAR', code: 'KeyE' }; return; }
    if (n.prop) { ctx.prompt = 'E agarrar ' + defs[n.id].name; ctx.act = { label: 'AGARRAR', code: 'KeyE' }; return; }
    var L = n.L;
    if (L.def.mode === 'kick') { ctx.prompt = 'F patear ' + L.def.name; ctx.act = { label: 'PATEAR', code: 'KeyF' }; return; }
    ctx.prompt = 'E agarrar ' + L.def.name; ctx.act = { label: 'AGARRAR', code: 'KeyE' };
  }
  function context() { return ctx.act; }

  /* ---------------- E y F ---------------- */
  function aimVec(p) {
    if (p.moving && (p.mx || p.my)) return { x: p.mx, y: p.my };
    var v = ACH.ent.DIRV[p.dir] || [1, 0]; return { x: v[0], y: v[1] };
  }
  function grab(G, L) {
    var p = G.player, d = L.def, hits = holdMax(d);
    L.state = 'held'; L.thrown = false; L.vx = L.vy = 0; L.z = L.vz = 0; stopLoop(L);
    p.held = { id: L.id, dur: hits ? (L.dur > 0 ? L.dur : hits) : 0, L: L, push: d.mode !== 'hand', mode: d.mode };
    sfx('grab', { x: p.x, y: p.y, id: L.id });
    say('grab', p);
    followHeld(G, L); syncPr(L);
  }
  function drop(G) {
    var p = G.player, h = p.held; if (!h) return;
    p.held = null;
    var L = h.L; if (!L) return;
    if (L.def.hold && L.def.hold.hits) L.dur = h.dur;
    L.state = 'idle'; L.vx = L.vy = 0; L.z = L.vz = 0;
    var v = ACH.ent.DIRV[p.dir] || [1, 0], x = p.x + v[0] * 8, y = p.y + v[1] * 5 + 1;
    if (W().collideCircle(x, y, K.radius)) { x = p.x; y = p.y + 1; }
    L.x = x; L.y = y; syncPr(L);
  }
  function pressE(G) {
    var p = G.player;
    if (p.held) { drop(G); return true; }
    var n = ctx.near || nearest(G); if (!n) return false;
    if (n.food) { var f = cartTakeFn(); if (f) { try { f.call(ACH.inv, n.food, G); } catch (e) { console.warn('[ACHORADO] cartTake', e); } } return true; }
    if (n.prop) return takeProp(G, n.prop, n.id);
    if (n.L && grabbable(n.L.def)) { grab(G, n.L); return true; }
    return false;
  }
  // v0.9: saca un prop del mundo (escoba de pared, tele entera) y lo pone en la mano
  function takeProp(G, pr, id) {
    var P = W().props, i = P.indexOf(pr); if (i < 0 || !defs[id]) return false;
    P.splice(i, 1);
    taken.push({ W: W(), pr: pr, i: i });
    var L = spawnLoose(id, pr.x, pr.y + 1, 0, 0); if (!L) return false;
    grab(G, L);
    if (id === 'escoba') say('escoba', G.player);
    return true;
  }
  // v0.9: tirar lo pesado (tele) en arco corto: distancia 30–90 px según la carga, hacia el mouse (táctil: hacia donde mira)
  // v0.11: puntería del tiro pesado. Hacia el mouse (si d.aimRecent, solo si se movió en los últimos 2 s); si no, hacia donde mira.
  // d.chargeMin (s): lo que se cargue por debajo es tiro corto (cargables: 0,2 s corto · 0,8 s máximo). Devuelve {ux, uy, R, c, x, y}.
  var mouseSeen = { x: null, y: null, t: -1e9 };
  function trackMouse() {
    var m = I() && I().mouse; if (!m) return;
    if (m.x !== mouseSeen.x || m.y !== mouseSeen.y) { if (mouseSeen.x !== null) mouseSeen.t = Date.now(); mouseSeen.x = m.x; mouseSeen.y = m.y; }
  }
  function aimHeavy(G) {
    var p = G && G.player, h = p && p.held, d = h && defOf(h.id); if (!d) return null;
    var cT = d.chargeT || 0.6, c = p.carryC || 0;
    if (d.chargeMin) c = Math.max(0, Math.min(1, (c * cT - d.chargeMin) / Math.max(0.01, cT - d.chargeMin)));
    var tr = d.throwRange || [30, 90], R = tr[0] + (tr[1] - tr[0]) * c, ux, uy, m = I().mouse;
    var mouseOk = !(ACH.touch && ACH.touch.on) && m && (!d.aimRecent || Date.now() - mouseSeen.t < 2000);
    if (mouseOk) { var dx = m.wx - p.x, dy = m.wy - p.y, dl = Math.sqrt(dx * dx + dy * dy); if (dl > 4) { ux = dx / dl; uy = dy / dl; if (d.aimClamp) R = Math.min(R, Math.max(tr[0], dl)); } }   // arreglos v0.11 (aimClamp): pasarse de carga ya no hace fallar: cae en el mouse, o al alcance cargado si está más lejos
    if (ux === undefined) { var a = aimVec(p), al = Math.sqrt(a.x * a.x + a.y * a.y) || 1; ux = a.x / al; uy = a.y / al; }
    return { ux: ux, uy: uy, R: R, c: c, x: p.x + ux * R, y: p.y + uy * R, z0: d.z0 || 22, vz: (d.fly && d.fly.lob) || 110 };
  }
  function throwHeavy(G) {
    var p = G.player, h = p.held, L = h && h.L, d = L && L.def;
    var A = L && d ? aimHeavy(G) : null, c = A ? A.c : 0;
    p.carryC = 0; p.carryCharging = false;
    if (!L || !d || !A) return false;
    var R = A.R, ux = A.ux, uy = A.uy;
    p.dir = ACH.ent.dirFromVec(ux, uy);
    p.held = null;
    var z0 = d.z0 || 22, vz = d.fly.lob || 110, T = (vz + Math.sqrt(vz * vz + 2 * K.grav * z0)) / K.grav, sp = R / T;
    L.x = p.x + ux * 3; L.y = p.y + uy * 2 + 0.5; L.z = z0; L.vz = vz; L.vx = ux * sp; L.vy = uy * sp;
    L.state = 'idle'; L.thrown = true; L.hits = []; L.pierced = 0; L.t = 0; L.flip = ux < 0;
    p.throwT = K.throwT * 1.6; p.lastThrow = L.id;
    sfx('throw.' + L.id, { x: L.x, y: L.y, charge: c });
    say(L.id === 'tele' ? 'tele' : 'throw', p);
    syncPr(L);
    return true;
  }
  // v0.9: la tele (o lo pesado) cae: radio 20, daño 3, empuje 80, aturde 0,6 s; vidrio, chispas, restos y botín de tele; tumba carretillas
  function heavyCrash(G, L) {
    var d = L.def, im = d.impact || { r: 20, dmg: 3, push: 80, stun: 0.6, noise: 150 }, x = L.x, y = L.y, zs = G.zombies, i, n = 0;
    for (i = 0; i < zs.length; i++) {
      var z = zs[i]; if (z.state === 'muerto') continue;
      var dd = dist(x, y, z.x, z.y); if (dd > im.r + 2.5) continue;
      var nx = dd > 0.5 ? (z.x - x) / dd : 0, ny = dd > 0.5 ? (z.y - y) / dd : 1;
      var killed = ACH.ent.hitZombie(G, z, nx, ny, { from: { x: x, y: y }, dmg: im.dmg, knock: im.push, src: 'tele' });
      if (killed === undefined) continue;
      if (!killed) z.stunT = Math.max(z.stunT || 0, im.stun);
      if (ACH.fx && ACH.fx.hit) swapText(['¡CRASH!'], ['¡CRASH!', '¡PUM!'], function () { ACH.fx.hit(G, z, nx, ny, killed, n === 0); });
      sfx('hit.' + L.id, { x: z.x, y: z.y, type: z.type, killed: killed });
      if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type });
      n++;
    }
    if (ACH.aves && ACH.aves.hitCircle) { try { n += ACH.aves.hitCircle(G, x, y, im.r, 20, im.dmg, L.id) || 0; } catch (e) { /* nada */ } }
    var C = ACH.cerro;
    if (C && C.carts && C.knock) for (i = C.carts.length - 1; i >= 0; i--) { var ct = C.carts[i]; if (ct && ct.state !== 'crash' && dist(x, y, ct.x, ct.y) < im.r + 12) { try { C.knock(ct); } catch (e2) { /* nada */ } } }
    if (ACH.inter && ACH.inter.hitProps) { try { ACH.inter.hitProps(G, x, y, im.r * 0.6, 2, 'swing'); } catch (e3) { /* nada */ } }
    sfx(L.id + '.crash', { x: x, y: y });
    if (ACH.ent.emitNoise) ACH.ent.emitNoise(G, x, y, im.noise || 150);
    var FX = ACH.fx;
    if (FX && FX.glass) { FX.glass(x, y - 6, 18, 80); FX.sparks(x, y - 6, 12, 90); FX.text(x, y - 22, '¡CRASH!', '#cfe8f0'); FX.shake(3, 0.25); }
    burst(x, y, 6, 8, 'metal', 70, 60);
    if (d.flySpr === 'teleVuelo') addDecal('restosTele', x, y + 2, Math.random() < 0.5);
    if (Math.random() < 0.4 && ACH.inv && ACH.inv.drop) {   // botín de tele: sencillo, cuerdas o trapo
      var r = Math.random(), it = r < 0.4 ? { id: 'sencillo', n: 1 + Math.floor(Math.random() * 3) } : r < 0.7 ? { id: 'cuerdas', n: 1 } : { id: 'trapo', n: 1 };
      try { ACH.inv.drop(x, y + 3, [it]); } catch (e4) { /* nada */ }
    }
    breakInvis(G, L.id);
    removeLoose(L);
  }
  // v0.9: un golpe del ventilador de la escoba (cada 0,25 s mientras se mantiene ESPACIO)
  function spinHit(G, w) {
    var p = G.player, zs = G.zombies, hits = 0, blocked = 0, i;
    swapText(w.hitText[0], w.hitText[1], function () {
      for (i = 0; i < zs.length; i++) {
        var z = zs[i]; if (z.state === 'muerto') continue;
        var dd = dist(p.x, p.y, z.x, z.y); if (dd > w.range + 2.5) continue;
        var nx = dd > 0.5 ? (z.x - p.x) / dd : 1, ny = dd > 0.5 ? (z.y - p.y) / dd : 0;
        var killed = ACH.ent.hitZombie(G, z, nx, ny, { dmg: w.dmg, knock: w.knock, src: 'escoba' });
        if (killed === undefined) { blocked++; continue; }
        if (ACH.fx && ACH.fx.hit) ACH.fx.hit(G, z, nx, ny, killed, hits === 0);
        hits++;
        sfx(w.hitSfx, { x: z.x, y: z.y, type: z.type, killed: killed, combo: hits });
        if (killed) sfx('kill', { x: z.x, y: z.y, type: z.type });
      }
    });
    var props = 0, hard = 0;
    if (ACH.inter) {
      ACH.inter.lastHard = 0;
      if (ACH.inter.hitProps) props = ACH.inter.hitProps(G, p.x, p.y, w.range, w.dmg, 'swing') || 0;
      hard = ACH.inter.lastHard || 0;
      if (ACH.inter.hitAnimals) ACH.inter.hitAnimals(G, p.x, p.y, w.range, 'swing');
    }
    if (ACH.aves && ACH.aves.hitCircle) { try { hits += ACH.aves.hitCircle(G, p.x, p.y, 30, 36, w.dmg, 'escoba') || 0; } catch (e) { /* nada */ } }
    // v0.11: el ventilador de la escoba también le pega a la jefa y a las abejas de Miraflores
    var NV = ACH.nivel;
    if (NV && typeof NV.onSwing === 'function') { try { var nh = +NV.onSwing(G, { x: p.x, y: p.y, ang: 0, range: w.range, arc: 2 * Math.PI, dmg: w.dmg, knock: w.knock, kind: 'held:' + w.kind, bees: w.bees }) || 0; if (nh > 0) hits += nh; } catch (e5) { /* nada */ } }
    afterSwing(G, { kind: w.kind, hits: hits, blocked: blocked, props: props, hard: hard });
    if (hits && ACH.ent.say) ACH.ent.say('hit', p.x, p.y);
  }
  // v0.9: mantener ESPACIO con la escoba = ventilador. Se engancha al final del giro (entities.js lo terminaría) y lo estira hasta 1,5 s.
  function updateFan(G, dt, In) {
    var p = G.player, w = p.atkW, hd = p.held && defOf(p.held.id), F = hd && hd.fan;
    if (p.fanT === undefined) p.fanT = -1;
    if (!F || !w || w !== hd.hold || p.atkT < 0) { p.fanT = -1; return; }
    var held = In.down('Space');
    if (p.fanT < 0) {
      if (held && p.atkT >= w.dur - 0.12 && p.stamina > 2 && !(p.z > 0)) { p.fanT = 0; p.fanHitT = F.every; p.fanSfxT = F.sfxEvery; }
      else return;
    }
    p.fanT += dt; p.fanHitT -= dt; p.fanSfxT -= dt;
    p.stamina = Math.max(0, p.stamina - F.cost * dt); p.restT = 0;
    if (!held || p.fanT >= F.max || p.stamina <= 0 || (p.z > 0) || p.stunT > 0) { p.fanT = -1; p.atkCD = w.cd; return; }
    p.atkT = Math.min(p.atkT, w.dur - 0.02); p.atkHit = true; p.atkCD = w.cd;
    if (p.fanSfxT <= 0) { p.fanSfxT = F.sfxEvery; sfx(w.swingSfx, { x: p.x, y: p.y, fan: true }); if (ACH.fx && ACH.fx.spin) ACH.fx.spin(p, w.range, F.sfxEvery); }
    if (p.fanHitT <= 0) { p.fanHitT += F.every; spinHit(G, w); }
  }
  function pressF(G) {
    var p = G.player, a = aimVec(p), l = Math.sqrt(a.x * a.x + a.y * a.y) || 1, ux = a.x / l, uy = a.y / l;
    if ((p.z || 0) > 0) return false;   // v0.9: en el aire no se lanza ni se patea (la pulsación queda en el búfer)
    if (p.held && p.held.mode === 'carry') return true;   // lo pesado se tira manteniendo F (update)
    if (p.held) {
      var h = p.held, L = h.L; p.held = null;
      if (!L) return false;
      if (L.def.hold && L.def.hold.hits) L.dur = h.dur;
      launch(G, L, ux, uy, 'throw');
      return true;
    }
    var n = ctx.near || nearest(G);
    if (!n || !n.L) return false;
    var T = n.L, td = T.def;
    if (T.state !== 'idle' || !td.fly.sp || td.mode === 'carry') return false;   // lo pesado no se patea: E y luego F
    if (td.fly.kicks && T.kicks >= td.fly.kicks) return false;
    launch(G, T, ux, uy, 'kick');
    return true;
  }

  /* ---------------- Ciclo ---------------- */
  var eBuf = 0, fBuf = 0;
  function eBlocked(G) { var f = ACH.armas && ACH.armas.eBlock; if (typeof f !== 'function') return false; try { return !!f(G); } catch (e) { return false; } }
  function update(G, dt) {
    var p = G.player; if (!p) return;
    ensure(p);
    var playing = G.state === 'playing' && p.hp > 0;
    if (playing) {
      trackMouse();
      tickTimers(G, dt);
      if (p.kickT > 0) p.kickT -= dt;
      if (p.throwT > 0) p.throwT -= dt;
      var In = I();
      if (In.pressed('KeyE') && !eBlocked(G)) eBuf = K.eBuf;   // v0.13 T3: la E de historia (Gambetta) gana a agarrar armas (eBlock lo pone pulido-v013.js)
      if (In.pressed('KeyF') && !(p.held && p.held.mode === 'carry')) fBuf = K.eBuf;
      var carry = !!(p.held && p.held.mode === 'carry');
      if (p.held && p.held.push && !carry && In.pressed('Space')) { fBuf = K.eBuf; p.atkBuf = 0; }   // empujando: el golpe también la suelta
      // v0.9: lo pesado: F mantener carga (0 → 1 en chargeT) y soltar lo tira; en el aire no
      if (carry) {
        fBuf = 0;
        var hdC = defOf(p.held.id);
        if (In.pressed('KeyF') && !(p.z > 0)) { p.carryCharging = true; p.carryC = 0; }
        if (p.carryCharging) {
          if (In.down('KeyF')) p.carryC = Math.min(1, (p.carryC || 0) + dt / ((hdC && hdC.chargeT) || 0.6));
          else throwHeavy(G);
        }
      } else if (p.carryCharging) { p.carryCharging = false; p.carryC = 0; }
      tickWet(p, dt);
      updateFan(G, dt, In);
      computeContext(G);
      if (eBuf > 0) { if (pressE(G)) eBuf = 0; else eBuf -= dt; }
      if (fBuf > 0) { if (p.atkT < 0 && pressF(G)) fBuf = 0; else fBuf -= dt; }
    }
    for (var i = loose.length - 1; i >= 0; i--) {
      var L = loose[i];
      if (L.state === 'held') { if (p.held && p.held.L === L) followHeld(G, L); else L.state = 'idle'; }
      else physics(G, L, dt);
      if (loose[i] === L) syncPr(L);
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var q = parts[i]; q.t += dt;
      if (q.t >= q.life) { parts.splice(i, 1); continue; }
      var k = Math.exp(-3 * dt); q.vx *= k; q.vy *= k; q.x += q.vx * dt; q.y += q.vy * dt;
      q.vz -= q.g * dt; q.z += q.vz * dt;
      if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.5; q.vy *= 0.5; }
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.7) texts.splice(i, 1); }
  }
  // opts (v0.9): {keepGuitar: true} no devuelve la guitarra sana (al pasar de nivel se conserva su durabilidad, SPEC §1).
  // game.js crea un jugador nuevo y después repone la durabilidad que traía (restoreState), así que también funciona sin opts.
  function reset(G, opts) {
    for (var i = loose.length - 1; i >= 0; i--) removeLoose(loose[i]);
    // por si el mundo quedó con props sueltos viejos
    var P = W().props; for (i = P.length - 1; i >= 0; i--) if (P[i].armas) P.splice(i, 1);
    // v0.9: escobas de pared y teles que se agarraron vuelven a su sitio (mismo mundo; un nivel nuevo ya los trae)
    for (i = 0; i < taken.length; i++) if (taken[i].W === W() && P.indexOf(taken[i].pr) < 0) P.splice(Math.min(taken[i].i, P.length), 0, taken[i].pr);
    taken.length = 0;
    decals.length = 0; parts.length = 0; texts.length = 0; eBuf = fBuf = 0;
    var D = W().looseDecor;   // QA v0.8: bici, skate y silla del escenario (world.js) son sueltos de verdad
    if (D) for (i = 0; i < D.length; i++) spawnLoose(D[i].id, D[i].x, D[i].y, 0, 0);
    tk.ext = false; tk.inv = tk.sick = tk.boost = null; tk.wet = null; tk.wetExt = false;
    if (G && G.player) {
      ensure(G.player);
      if (!(opts && opts.keepGuitar)) restoreGuitar(G.player);
      G.player.held = null; G.player.fanT = -1; G.player.carryCharging = false; G.player.carryC = 0;
    }
  }
  function onDeath(G) {
    var p = G.player; if (!p) return;
    if (p.held) drop(G);   // los efectos (invisible, empacho, subidón) los apaga inventario.js al morir
  }
  function onRespawn(G) {
    var p = ensure(G.player);
    restoreGuitar(p);   // repuesto en el cuarto de la azotea
    p.held = null; p.invisT = 0; p.sickT = 0; p.boostT = 0; p.kickT = 0; p.throwT = 0;
    p.fanT = -1; p.carryCharging = false; p.carryC = 0; p.wetT = 0; p.burnT = 0;   // v0.9
    tk.inv = tk.sick = tk.boost = null; tk.wet = null;
  }

  /* ---------------- Pose de Alexander (render.js) ---------------- */
  function pose(p) {
    p = p || (ACH.G && ACH.G.player); if (!p) return null;
    if (p.kickT > 0) return 'kick';
    var w = p.atkW;
    var hd = p.held && defOf(p.held.id);
    // v0.9: prender y tirar el molotov (interaccion.js) → alex.<v>.throwMolotov[dir] = [prender, estirar, soltar]
    var mp = ACH.inter && ACH.inter.molotovPose && ACH.G ? ACH.inter.molotovPose(ACH.G) : -1;
    if (mp >= 0 && p.atkT < 0) return 'throwMolotov';
    if (p.atkT >= 0 && w) { if (w.pose) return w.pose; if (hd && hd.hold === w && hd.poses) return hd.poses.swing || null; return null; }
    var ltd = p.throwT > 0 && p.held === null ? defOf(p.lastThrow) : null;   // v0.11: los cargables traen sus poses (o ninguna): no se dibuja la tele
    if (ltd && ltd.mode === 'carry' && ltd.poses) return ltd.poses.swing || ltd.poses.hold || null;
    if (hd && hd.mode === 'carry' && hd.poses) return (p.carryCharging ? hd.poses.swing : hd.poses.hold) || null;
    if (p.throwT > 0 && p.held === null) return p.lastThrow === 'tele' || (defOf(p.lastThrow) || {}).mode === 'carry' ? 'carryThrow' : 'skateSwing';
    if (hd && hd.mode === 'carry') return p.carryCharging ? 'carryThrow' : 'carry';
    if (hd && hd.poses && hd.poses.hold) return hd.poses.hold;
    if (p.sickT > 0) return 'sick';
    return null;
  }
  function poseFrame(p) {
    p = p || (ACH.G && ACH.G.player); if (!p) return 0;
    var ps = pose(p), w = p.atkW;
    if (ps === 'throwMolotov') return Math.max(0, Math.min(2, ACH.inter.molotovPose(ACH.G)));
    if (ps === 'carryThrow') return p.carryCharging ? 0 : 1;
    if (ps === 'escobaSpin') {   // 8 cuadros sin dirección: el giro en 0,40 s; el ventilador sigue girando
      if (p.fanT >= 0) return Math.floor(((ACH.G && ACH.G.clock) || 0) * 20) % 8;
      return Math.min(7, Math.floor(p.atkT / ((w && w.dur || 0.4) / 8)));
    }
    if (ps === 'escobaHold') return p.moving ? ((Math.floor(p.animT) % 4) + 4) % 4 : 0;
    if (ps === 'punch' || (w && ps && p.atkT >= 0) || ps === 'skateSwing') {
      if (p.atkT >= 0 && w) return Math.min(2, Math.floor(p.atkT / w.frame));
      return 2;
    }
    if (ps === 'kick') return p.kickT > K.kickT / 2 ? 0 : 1;
    if (ps === 'skateHold' || ps === 'carry') return p.moving ? ((Math.floor(p.animT) % 4) + 4) % 4 : 0;
    if (ps === 'sick') return Math.floor(((ACH.G && ACH.G.clock) || 0) * 4) % 2;
    return 0;
  }
  function alexSet(v) {
    var st = guitarState(); if (!st) return null;
    var key = 'g' + st, A = ACH.sprites && ACH.sprites.alex;
    if (v && A && A[v] && !A[v][key]) return null;
    return key;
  }

  /* ---------------- Partículas, decals y textos ---------------- */
  var COLS = { wood: ['#8a4b1d', '#5a3314', '#b9783a', '#e0a050'], string: ['#d0d6dd', '#ffffff'], spark: ['#fff6b0', '#ffe500', '#ffffff', '#ffb020'],
    metal: ['#b8bcc4', '#8a8f98', '#2a2a2e'], straw: ['#d8c070', '#b89a48', '#e8d898'], fruit: ['#f0a030', '#d8402a', '#6fbf3a', '#ffe14a'] };
  function burst(x, y, z, n, kind, spd, up) {
    var cols = COLS[kind] || COLS.wood;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = rand(spd * 0.35, spd);
      parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rand(up * 0.4, up), t: 0, life: rand(0.35, 0.8),
        col: cols[i % cols.length], sz: kind === 'wood' || kind === 'fruit' ? 2 : 1, g: kind === 'spark' ? 150 : 260 });
    }
    if (parts.length > 140) parts.splice(0, parts.length - 140);
  }
  function floatText(x, y, s) { texts.push({ x: x, y: y, s: s, t: 0 }); if (texts.length > 4) texts.shift(); }
  function addDecal(key, x, y, flip) { decals.push({ k: key, x: Math.round(x), y: Math.round(y), flip: !!flip }); if (decals.length > 10) decals.shift(); }
  function swapText(hit, kill, fn) {
    var FX = ACH.fx && ACH.fx.FX; if (!FX) { fn(); return; }
    var h = FX.hitText, k = FX.killText; FX.hitText = hit; FX.killText = kill;
    try { fn(); } finally { FX.hitText = h; FX.killText = k; }
  }
  function blit(g, s, x, y, flip) {
    if (!flip) { g.drawImage(s, x - s.ax, y - s.ay); return; }
    g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(s, -s.ax, -s.ay); g.restore();
  }
  // En el piso (lo llama interaccion.js antes del y-sort): guitarra rota y mitades de skate.
  function drawGround(g, cx, cy) {
    var V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    for (var j = 0; j < loose.length; j++) {   // v0.9: sombra en el piso de lo que va volando en arco (la tele)
      var LL = loose[j]; if (!(LL.z > 0) || !LL.thrown) continue;
      var sw = LL.z > 16 ? 4 : 5;
      g.globalAlpha = 0.4; g.fillStyle = '#141216';
      g.fillRect(Math.round(LL.x) - cx - sw, Math.round(LL.y) - cy - 1, sw * 2, 2); g.fillRect(Math.round(LL.x) - cx - sw + 1, Math.round(LL.y) - cy - 2, sw * 2 - 2, 4);
      g.globalAlpha = 1;
    }
    for (var i = 0; i < decals.length; i++) {
      var d = decals[i], s = fxSprite(d.k); if (!s) continue;
      var x = d.x - cx, y = d.y - cy;
      if (x < -30 || x > V.w + 30 || y < -30 || y > V.h + 30) continue;
      blit(g, s, x, y, d.flip);
    }
  }
  function curSprite(L) {
    var s = spriteOf(L.def.spr); if (!s) return null;
    if (L.state === 'broken' || L.state === 'wrecked') { var b = s.broken; if (b && b.getContext) { if (b.ax === undefined) { b.ax = s.ax; b.ay = s.ay; } return b; } }
    return s;
  }
  function drawOne(g, L, cx, cy) {
    if (L.def.flySpr && L.thrown && L.z > 0) {   // v0.9: la tele girando en el aire (fx.teleVuelo[4])
      var FS = ACH.sprites && ACH.sprites.fx && ACH.sprites.fx[L.def.flySpr], fc = Array.isArray(FS) ? FS[Math.floor(L.t * 12) % FS.length] : null;
      if (fc && fc.getContext) { if (fc.ax === undefined) { fc.ax = fc.width >> 1; fc.ay = fc.height >> 1; } blit(g, fc, Math.round(L.x) - cx, Math.round(L.y - L.z) - cy, false); return; }
    }
    var s = curSprite(L); if (!s) return;
    if (!heldPlaceholderVisible(L)) return;
    var lift = liftOf(L);
    if ((L.state === 'broken' || L.state === 'wrecked') && s.placeholder) g.globalAlpha = 0.7;
    blit(g, s, Math.round(L.x) - cx, Math.round(L.y) - lift - cy, L.flip);
    g.globalAlpha = 1;
  }
  function drawLoose(g, cx, cy) { if (!wired) setWired(); for (var i = 0; i < loose.length; i++) drawOne(g, loose[i], cx, cy); }
  function ysortItems() {
    if (!wired) setWired();
    var out = [];
    for (var i = 0; i < loose.length; i++) {
      (function (L) { out.push({ y: L.y, x: L.x, loose: L, draw: function (g, cx, cy) { drawOne(g, L, cx, cy); } }); })(loose[i]);
    }
    return out;
  }
  function setWired() {
    wired = true;
    var P = W().props;
    for (var i = 0; i < loose.length; i++) if (loose[i].inProps) { var j = P.indexOf(loose[i].pr); if (j >= 0) P.splice(j, 1); loose[i].inProps = false; }
  }
  // Después de la luz (lo llama interaccion.js): astillas, chispas, textos y el aviso flotante «E agarrar skate».
  function drawFx(g, G, cx, cy) {
    var i;
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], life = q.t / q.life;
      g.globalAlpha = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      g.fillStyle = q.col; g.fillRect(Math.round(q.x) - cx, Math.round(q.y - q.z) - cy, q.sz, q.sz);
    }
    g.globalAlpha = 1;
    var showPrompt = ctx.prompt && G.state === 'playing' && !(ACH.touch && ACH.touch.on && ctx.act) && !eBlocked(G);
    if (!texts.length && !showPrompt) return;
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (i = 0; i < texts.length; i++) {
      var t = texts[i], tx = Math.round(t.x) - cx, ty = Math.round(t.y - t.t * 16) - cy;
      g.globalAlpha = t.t > 0.5 ? 1 - (t.t - 0.5) / 0.2 : 1;
      g.fillStyle = '#131015'; g.fillText(t.s, tx + 1, ty + 1);
      g.fillStyle = '#ffe500'; g.fillText(t.s, tx, ty);
    }
    g.globalAlpha = 1;
    if (showPrompt) {
      var n = ctx.near, ax, ay;
      if (n && n.L) { ax = n.L.x; ay = n.L.y - 16; }
      else if (n && n.prop) { ax = n.prop.x; ay = (n.prop.ry0 !== undefined ? n.prop.ry0 : n.prop.y - 24) - 4; }
      else if (n && n.food) { ax = n.food.x; ay = (n.food.ry0 !== undefined ? n.food.ry0 : n.food.y - 26) - 4; }
      else { ax = G.player.x; ay = G.player.y - 34; }
      if (Math.abs(ax - G.player.x) < 34 && ay > G.player.y - 40) ay = G.player.y - 40;   // que no tape la cabeza de Alexander
      var s = ctx.prompt, w = Math.ceil(g.measureText(s).width) + 6, bx = Math.round(ax) - cx, by = Math.round(ay) - cy;
      g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(bx - (w >> 1), by - 5, w, 10);
      g.globalAlpha = 1; g.fillStyle = '#ff2e88'; g.fillRect(bx - (w >> 1), by + 5, w, 1);
      g.fillStyle = '#f2f2f2'; g.fillText(s, bx, by);
      g.fillStyle = '#ffe500'; g.fillText(s.charAt(0), bx - (w >> 1) + 3 + Math.ceil(g.measureText(s.charAt(0)).width / 2) - 0.5, by);
    }
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }

  /* ---------------- Debug ---------------- */
  ACH.debug = ACH.debug || {};
  ACH.debug.guitar = function (n) {
    var G = ACH.G; if (!G || !G.player) return null;
    if (n !== undefined) setGuitar(G, n);
    var g = ensure(G.player).guitar; return { dur: g.dur, max: g.max, state: stateOf(g) };
  };
  ACH.debug.spawnLoose = function (id, dx, dy) {
    var G = ACH.G, p = G && G.player; if (!p) return null;
    var v = ACH.ent.DIRV[p.dir] || [1, 0];
    var L = spawnLoose(id || 'skate', p.x + (dx === undefined ? v[0] * 10 : dx), p.y + (dy === undefined ? v[1] * 6 + 2 : dy), 0, 0);
    return L ? { id: L.id, x: Math.round(L.x), y: Math.round(L.y), i: loose.indexOf(L) } : null;
  };
  ACH.debug.armas = function () {
    var G = ACH.G, p = G && G.player;
    return { guitar: p && p.guitar ? { dur: p.guitar.dur, state: stateOf(p.guitar) } : null, held: p && p.held ? { id: p.held.id, dur: p.held.dur, push: p.held.push } : null,
      pose: p ? pose(p) : null, ctx: ctx.act, prompt: ctx.prompt, wired: wired, extTimers: tk.ext,
      loose: loose.map(function (L) { return { id: L.id, x: Math.round(L.x), y: Math.round(L.y), sp: Math.round(Math.sqrt(L.vx * L.vx + L.vy * L.vy)), state: L.state, thrown: L.thrown, kicks: L.kicks, dur: L.dur, hits: L.hits.length }; }) };
  };

  /* ---------------- v0.11 (A, V011.md §2.2): Uhu, percha y guitarras guardadas ---------------- */
  function curG() { var G = ACH.G; return G && G.player ? G : null; }
  // El Uhu: guitarra +opts.guitar (revive una rota: 0 → 40, vuelve a sonar g1/g2); lo de la mano +heldFrac de su máximo. false si todo estaba al 100 %.
  function repairAll(opts) {
    var G = curG(); if (!G) return false;
    opts = opts || {};
    var p = ensure(G.player), g = p.guitar, gAdd = opts.guitar !== undefined ? +opts.guitar : 40, hf = opts.heldFrac !== undefined ? +opts.heldFrac : 0.6;
    var out = { guitar: 0, held: 0 };
    if (g && g.dur < g.max && gAdd > 0) { var g0 = g.dur; g.dur = Math.min(g.max, g.dur + gAdd); out.guitar = g.dur - g0; }
    var h = p.held, d = h && defOf(h.id), mx = holdMax(d);
    if (h && mx > 0 && h.dur < mx && hf > 0) { var h0 = h.dur; h.dur = Math.min(mx, h.dur + Math.ceil(mx * hf)); out.held = h.dur - h0; if (h.L) h.L.dur = h.dur; }
    if (!out.guitar && !out.held) return false;
    return out;
  }
  function heldInfo() {
    var G = curG(), h = G && G.player.held; if (!h) return null;
    var d = defOf(h.id), mx = holdMax(d);
    return { id: h.id, dur: mx ? h.dur : 0, max: mx };
  }
  // Lo quita de la mano sin soltarlo al suelo (el objeto suelto desaparece) y lo devuelve: {id, dur, max}
  function stow() {
    var G = curG(); if (!G) return null;
    var p = G.player, h = p.held; if (!h) return null;
    var info = heldInfo();
    p.held = null; p.carryCharging = false; p.carryC = 0; p.fanT = -1;
    if (h.L) removeLoose(h.L);
    return info;
  }
  // Lo pone en la mano: crea el suelto y lo agarra (dur opcional). Si ya había algo en la mano, lo deja en el piso (no se pierde).
  function equip(id, dur) {
    var G = curG(); if (!G) return false;
    var p = ensure(G.player);
    if (!defs[id]) id = ALIAS[id] || id;
    if (!defs[id] || !grabbable(defs[id])) return false;
    if (p.held) drop(G);
    var L = spawnLoose(id, p.x, p.y + 1, 0, 0); if (!L) return false;
    var mx = holdMax(L.def);
    if (mx && dur !== undefined && dur !== null && +dur > 0) L.dur = Math.min(mx, Math.round(+dur));
    grab(G, L);
    return true;
  }
  function guitarInfo() {
    var G = curG(); if (!G) return { dur: gMax(), max: gMax(), state: 0 };
    var g = ensure(G.player).guitar; return { dur: g.dur, max: g.max, state: stateOf(g) };
  }
  // setGuitar(n) (como antes: fija la durabilidad, con sonidos y aviso) o setGuitar({dur, max}) (D1: guitarras guardadas, sin efectos)
  function setGuitarApi(v) {
    var G = curG(); if (!G) return 0;
    if (v && typeof v === 'object') {
      var g = ensure(G.player).guitar;
      if (v.max > 0) g.max = +v.max;
      if (v.dur !== undefined) g.dur = Math.max(0, Math.min(g.max, +v.dur));
      return g.dur;
    }
    return setGuitar(G, v);
  }
  ACH.debug.v011 = ACH.debug.v011 || {};
  ACH.debug.v011.dur = function () {
    var gi = guitarInfo(), hi = heldInfo(), tab = {};
    for (var k in defs) if (holdMax(defs[k])) tab[k] = holdMax(defs[k]);
    return { durMul: durMul(), guitar: gi, held: hi, holdMax: tab };
  };

  ACH.armas = {
    repairAll: repairAll, heldInfo: heldInfo, stow: stow, equip: equip, guitarInfo: guitarInfo, holdMax: holdMax, guitarMax: gMax, aimHeavy: function () { return ACH.G ? aimHeavy(ACH.G) : null; },   // v0.11
    K: K, defs: defs, define: define, loose: loose, spawnLoose: spawnLoose, removeLoose: removeLoose, grab: function (L) { if (ACH.G && L) grab(ACH.G, L); }, drop: function () { if (ACH.G) drop(ACH.G); },
    guitarState: guitarState, repairGuitar: repairGuitar, setGuitar: setGuitarApi, guitarIcon: guitarIcon,
    handlesBoost: true, handlesSick: true,   // inventario.js no repite el subidón ni el empacho: los aplica entities.js con playerMods
    weapon: weapon, afterSwing: afterSwing, playerMods: playerMods, breakInvis: breakInvis, context: context,
    fanning: fanning, throwHeavy: function () { return ACH.G ? throwHeavy(ACH.G) : false; }, grabProps: GRAB_PROPS,   // v0.9 (H3)
    pose: pose, poseFrame: poseFrame, alexSet: alexSet,
    update: update, reset: reset, onDeath: onDeath, onRespawn: onRespawn, ensure: ensure,
    drawLoose: drawLoose, ysortItems: ysortItems, drawGround: drawGround, drawFx: drawFx
  };
})();
