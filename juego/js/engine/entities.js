/* ACHORADO — entities.js: Alexander, zombies, Titina, ruido y reapariciones. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    walk: 80, run: 135, runCost: 25, staminaRegen: 15, regenDelay: 0.5,
    hpMax: 100, staminaMax: 100, radius: 5,
    atkDur: 0.27, atkFrame: 0.09, atkRange: 24, atkArc: Math.PI / 2, atkDmg: 1, atkKnock: 40,
    atkCD: 0.30, atkCost: 8, atkNoise: 90, runNoise: 80, runNoiseEvery: 0.3,
    atkBuffer: 0.25, qBuffer: 0.25, noAirEvery: 0.6,     // pulsación recordada (s) si llega en pleno golpe o enfriamiento; aviso «¡sin aire!» máx. cada 0,6 s
    zRadius: 5, zAttackRange: 10, zAttackCD: 1, zWindup: 0.3, zStun: 0.25, corpse: 10,
    respawnEvery: 12, respawnBelow: 26,
    titinaAway: 6, qDur: 4, qCD: 15, qRange: 400,
    exhaustResume: 20,                                   // aliento mínimo para volver a correr tras agotarse
    lungeRange: 28, lungeMult: 1.8, lungeDur: 0.35, lungeCD: 1.5, // salto al perseguir (caminante y escolar)
    hordeMin: 3, hordeToastEvery: 10,                    // ruido que jala a 3+ zombies → aviso (máx. 1 cada 10 s)
    // ---- v0.3: Callao ----
    cobradorNoise: 140, cobradorCD: 8, cobradorChance: 0.25, cobradorText: '¡AL FONDO HAY SITIO!', // cobrador: radio del grito, cooldown (s), prob. al reaparecer
    gallScare: 48, gallSpeed: 85, gallClimb: 30, gallRise: 0.35, gallFlapFps: 10, gallMaxFly: 9, gallReturn: 25, gallReturnDist: 220, // gallinazos: radio de susto, vuelo (px/s), subida, retorno
    dogWalk: 22, dogFlee: 75, dogFleeDist: 24, dogFleeT: 1.2, dogRunDist: 70, dogZombieDist: 90, // perros: andar, huida, distancia de huida, correr cerca, zombie persiguiendo cerca
    dogBarkNoise: 100, dogBarkCD: 6, dogBarkT: 0.9, dogRadius: 4,
    dogHitFleeT: 2, dogWaryDist: 70,                     // v0.6: perro golpeado: huye 2 s; desconfiado: se aleja si Alexander pasa a menos de 70 px
    // ---- sensación de juego (velocidad / empuje / cámara) ----
    lungeStep: 3,                                        // px que Alexander da hacia adelante durante el cuadro activo del guitarrazo
    knockDecay: 18, killKnock: 8, knockStep: 3,          // empuje: caída exponencial /s (≈83 % en 0.1 s), px del cadáver al caer, subpaso de colisión
    lookAhead: 24, lookAheadX: 40, lookAheadY: 16, lookSmooth: 4, // cámara: px que adelanta (avenida oeste→este: más en x) y suavizado (1/s)
    animFps: 8, animRefSpeed: 60,                        // pasos de caminata: 8 cuadros/s a 60 px/s, proporcional a la velocidad
    // ---- jugo del guitarrazo (lo lee fx.js) ----
    fx: {
      hitstopHit: 0.07, hitstopKill: 0.09,          // s: congelar la simulación al conectar / al tumbar
      shakeHit: 2, shakeHitT: 0.12,                  // px y s de sacudida de cámara al conectar
      shakeKill: 4, shakeKillT: 0.2,                 // ídem al tumbar
      trailT: 0.1, trailSweepT: 0.04, trailReach: 24, trailThick: 4, trailY: 6, // estela: duración, barrido, radio, grosor, altura sobre los pies
      flashT: 2 / 60,                                // destello estrella 5×5: 2 cuadros
      sparksHit: 6, splintersHit: 3,                 // partículas por golpe (6 + 3 = 9)
      sparksKill: 6, splintersKill: 2, dustKill: 4,  // partículas extra al tumbar (más el polvo)
      partLifeMin: 0.25, partLifeMax: 0.4, partSpeedMin: 55, partSpeedMax: 135, partDrag: 7, partSpread: 1.2,
      dustLife: 0.45, dustSpeed: 22,
      textT: 0.5, textRise: 14, textScale: 2, textPopScale: 3, textPopT: 0.05, textY: 28, // texto flotante
      squashT: 1,                                    // pasos de simulación con el zombie aplastado (se ve todo el hitstop)
      killFlashT: 0.05,                              // s que el zombie tumbado se ve parado y blanco antes de caer
      hitText: ['¡PLANG!'], killText: ['¡PLANG!', '¡PUM!', '¡TOING!'],
      // ---- ambiente Callao (lo leen render.js y fx.js) ----
      cableSag: 7, cableBow: 4, cableWireDx: 5, cableAlpha: 0.85, // cables: comba en y (px), curva lateral, separación de los 2 hilos, opacidad
      smokeEvery: 0.16, smokeLife: 1.6, smokeRise: 13, smokeDrift: 5, smokeMax: 36, // humo de anticuchos: cada cuántos s, vida, subida px/s, deriva, tope
      // ---- vida animada (P6, fx.js). Cada número es la fuerza; 0 = apagado. ambient apaga todo. ----
      ambient: 1,                     // interruptor general de la vida animada
      ambMax: 40,                     // tope duro de partículas de ambiente (basura + anillos + gotas + salpicaduras + moscas + sombras de ave)
      ambNear: 40,                    // px alrededor de la pantalla donde se simula (todo lo demás se retira)
      ambGust: 1,                     // fuerza de las ráfagas (velocidad de la basura, balanceo de cables, ropa y trapos)
      ambGustEvery: [8, 15],          // s entre ráfagas
      ambLitter: 8,                   // papeles y bolsas cerca de la cámara (0 = apagado; tope 10)
      ambCables: 1,                   // cables sueltos que cuelgan de las cruces (opacidad)
      ambRipples: 1,                  // anillos de lluvia en los charcos (multiplicador de frecuencia)
      ambFlies: 1, ambFliesMax: 9,    // moscas sobre basura y cadáveres (opacidad; tope de puntos)
      ambCloth: 1,                    // banderines, ropa en los cables y trapos en los postes (opacidad)
      ambDrips: 1,                    // goteo de cruces y toldos con salpicadura (multiplicador de frecuencia)
      ambBirds: 1,                    // sombras de gallinazo que cruzan en círculos (opacidad y frecuencia)
      drizzleAlpha: 0.13, drizzleSpeed: 70, drizzleSlant: 0.25,    // garúa: opacidad de las rayitas, caída px/s, inclinación
      // ---- luz y atmósfera (P1, render.js + luz.js). Regla: cada número es la fuerza; 0 = apagado. ----
      // Lo horneado (sombras, AO) se rehace con ACH.render.rebake() después de cambiarlo.
      light: 1,                       // mapa de luz por multiplicación (0 = sin mapa de luz: ni ambiente ni focos)
      lightAmbient: '#b6b4c4',        // ambiente de tarde de garúa (menos azul y un poco más claro que #a8adc3; luminancia ≈ 71 %; no bajar de 60 %)
      lampLight: 1,                   // focos de sodio bajo los postes
      lampEvery: 3,                   // se prende 1 de cada N postes por vereda (la vereda sur va desfasada en 1)
      lampBad: ['N2', 'S5'],          // postes que fallan (vereda + índice de oeste a este entre los de esa vereda)
      lampHead: { x: 6, y: -58 },     // pastilla relativa al ancla del poste, mientras el sprite no traiga `lamp`
      lampPoolDy: 12,                 // el foco cae en la pista: +dy al sur del poste norte, −dy al norte del poste sur
      lampSheen: 0.14,                // brillo cálido del foco sobre el piso mojado (se suma después del mapa de luz)
      lotLight: 1,                    // luces de local (ACH.world.lights: local, cruz, foco)
      emberLight: 1,                  // brasas de los anticuchos
      alexLight: 0.8,                 // halo suave alrededor de Alexander
      zombieHalo: 0.35, zombieHaloR: 140, // halo chico bajo cada zombie a menos de zombieHaloR px de Alexander (0 = apagado)
      entityLift: 0.3,                // tinte propio de personajes y perros después del mapa de luz (0 = apagado): el ambiente no los oscurece igual que al piso
      entityGlow: 0.5,                // suma (lighter) de los personajes sobre sí mismos con esta opacidad: más luz en cara y camisa (0 = apagado)
      lotDim: 0.4,                    // fuerza de la luz de los locales que no son hito (los hitos van a 1)
      lotLandmarks: ['N1', 'N4', 'N6', 'N10', 'ESC'], // bodega, chifa, mural, botica, escalera
      emissive: 1,                    // pase de emisivos (pastillas, ventanas, cruz, semáforo, brasas) con 'lighter'
      flicker: 1,                     // parpadeo de postes malos, cruz y brasas (0 = fijos)
      contactShadow: 0.45,             // elipse bajo personajes, zombies, perros, Titina y gallinazos
      castShadow: 0.2,                // sombra proyectada SE de props (horneada en el suelo)
      buildingShadow: 0.28,           // sombra de la manzana norte sobre su vereda (horneada)
      ao: 1,                          // oclusión ambiental en bases de lotes y sardineles (horneada; 1 = 35 % + 15 %)
      fogAlpha: 0.5,                  // multiplicador de las dos capas móviles de neblina
      depthFog: 0.08,                 // niebla por profundidad: lavado hacia arriba de la pantalla (bajo: pasajes y borde norte deben leerse)
      groundFog: 0.32,                // niebla baja en jirones y pasajes (en el piso, bajo los personajes)
      groundFogOver: 0.04,            // velo de esa niebla por encima de los personajes (bajo para que se lean)
      drops: 0.35,                    // gotas grandes ocasionales de la garúa
      vignette: 0.25,                 // viñeta fija (esquinas)
      veil: 0                         // velo gris viejo rgba(150,150,145,·): lo reemplaza el ambiente
    }
  };
  var ZT = {
    caminante: { hp: 2, speed: 32, anim: 7.4, sight: 90, dmg: 10, blind: false, lunge: true },
    escolar:   { hp: 1, speed: 68, anim: 11.8, sight: 80, dmg: 6, blind: false, lunge: true },
    ciego:     { hp: 3, speed: 38, anim: 7.6, sight: 20, dmg: 15, blind: true },
    cobrador:  { hp: 2, speed: 32, anim: 7.4, sight: 90, dmg: 10, blind: false, lunge: true, shouts: true }, // = caminante, pero grita
    // v0.9 (H1): señoras del Cerro. Su comportamiento propio (baldazo, ollazo) lo pone senoras.js por ACH.zbeh; sin él, pelean de contacto.
    senoraOlla:  { hp: 4, speed: 34, anim: 7, sight: 90, dmg: 10, blind: false, lunge: false, senora: 'olla' },
    senoraBalde: { hp: 3, speed: 30, anim: 7, sight: 100, dmg: 6, blind: false, lunge: false, senora: 'balde' }
  };
  // v0.9: salto (tecla C), pendiente y golpes que empujan o aturden a Alexander
  var JUMP = { dur: 0.55, h: 14, cost: 10, cd: 0.25, safeZ: 6, buffer: 0.15 };
  var SLOPE = { up: 0.12, down: 0.10, stairsUp: 0.85, stairsDown: 1.05, runUpCost: 1.3 };
  var PHRASES = ['¡Gracias por su atención!', 'Que Dios lo bendiga',
    'Por fin alguien se queda hasta el final', 'Su colaboración es voluntaria'];

  var DIRV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  function dirFromVec(x, y) {
    var ax = Math.abs(x), ay = Math.abs(y);
    // en empate exacto (diagonal pura) gana el horizontal
    if (ax > ay || (ax === ay && ax !== 0)) return x < 0 ? 'left' : 'right';
    return y < 0 ? 'up' : 'down';
  }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  // v0.5: sonido. Sin motor de audio no pasa nada.
  function sfx(name, data) { var au = ACH.audio; if (au && au.emit) au.emit(name, data); }
  function stinger(name) { var au = ACH.audio; if (au && au.music) au.music.stinger(name); }
  // v0.6: frases de Alexander (el límite de frecuencia y la probabilidad viven en voces.js)
  function say(id, x, y) { var au = ACH.audio; if (au && au.say) { try { au.say(id, { who: 'alex', x: x, y: y }); } catch (e) { /* nunca rompe el juego */ } } }
  // v0.8: la noche (noche.js, G2). Sin noche.js todo vale 1.
  function nightMul(z) { var n = ACH.noche; if (!n || !n.zMul) return 1; var m = +n.zMul(z); return m > 0 ? m : 1; }
  function sightMul() { var n = ACH.noche; if (!n || !n.sightMul) return 1; var m = +n.sightMul(); return m > 0 ? m : 1; }
  function hearMul() { var n = ACH.noche; if (!n || !n.hearMul) return 1; var m = +n.hearMul(); return m > 0 ? m : 1; }
  function invisible(G) { return G.player && G.player.invisT > 0; }
  var SURF = { s: 'vereda', n: 'vereda', u: 'vereda', '.': 'asfalto', '-': 'asfalto', j: 'asfalto', b: 'berma', a: 'tierra', S: 'escalera', L: 'tierra' };
  function surfaceAt(x, y) {
    var W = ACH.world;
    if (W.surfaceAt) return W.surfaceAt(x, y);   // v0.9: el Cerro dice su propio piso (tierra, escalera, piedra, basura)
    var T = W.T || 16; return SURF[W.tileAt(Math.floor(x / T), Math.floor(y / T))] || 'asfalto';
  }
  // v0.9: ganchos de otros módulos (senoras.js, fuego.js). Siempre con try: un gancho roto no rompe el juego.
  function zbehOf(z) { var B = ACH.zbeh; return B && B[z.type] ? B[z.type] : null; }
  function hookWarn(k, e) { if (!hookWarn[k]) { hookWarn[k] = 1; console.warn('[ACHORADO] gancho ' + k, e); } }
  // v0.11: habilidades.js (ACH.hab). Sin el módulo, o si falla, no pasa nada.
  function habCall(fn, a, b, c, d) { var H = ACH.hab; if (H && typeof H[fn] === 'function') { try { return H[fn](a, b, c, d); } catch (e) { hookWarn('hab.' + fn, e); } } return undefined; }
  // v0.13 (A2): dificultad. Sin dificultad.js todo queda como antes.
  function difCall(fn, a) { var D = ACH.dif; if (D && typeof D[fn] === 'function') { try { return D[fn](a); } catch (e) { hookWarn('dif.' + fn, e); } } return undefined; }
  function difMul() { var m = +difCall('dmgMul'); return m > 0 && isFinite(m) ? m : 1; }
  function difHp(z) {   // +vida de Bravazo, una sola vez y en el primer paso (otros módulos fijan z.hp justo después de makeZombie)
    if (z.difHp) return; z.difHp = 1;
    var b = +difCall('zHpBonus', z); if (b > 0 && isFinite(b) && z.hp > 0) { z.hp += b; if (z.hpMax) z.hpMax += b; }
  }
  var curZ = null;   // v0.11: el zombie que se está actualizando (origen del golpe para el escudo)
  var inZvar = false;   // v0.11: dentro de ACH.zvar.update (el muletazo llega a hurtPlayer sin origen)
  function zvarSrc(G) {   // el zombie con muletas más cercano que acaba de pinchar (pokeT llegó a 0 en este paso)
    var p = G.player, best = null, bd = 22 * 22;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.loco !== 'muletas' || z.state === 'muerto' || z.pokeT !== 0) continue;
      var dx = z.x - p.x, dy = z.y - p.y, d = dx * dx + dy * dy;
      if (d <= bd) { bd = d; best = z; }
    }
    return best;
  }
  function airborne() { return this.z > JUMP.safeZ; }
  function carrying(p) {
    if (!p.held) return false;
    var A = ACH.armas, d = A && A.defs && A.defs[p.held.id];
    return !!(d && (d.mode === 'carry' || d.heavy));
  }

  /* ---------------- Alexander ---------------- */
  function makePlayer() {
    var s = ACH.world.start;
    return {
      x: s.x, y: s.y, dir: 'right', hp: CFG.hpMax, stamina: CFG.staminaMax,
      bird: true, mx: 0, my: 0, moving: false, running: false, exhausted: false, animT: 0,
      atkT: -1, atkHit: false, atkCD: 0, restT: 0, runNoiseT: 0, hurtT: 0, atkBuf: 0, qBuf: 0, noAirT: 0,
      // v0.8: guitarra que se gasta, lo que lleva en la mano y los efectos de comida y bebida (G2 pone invisT, sickT y boostT)
      guitar: { dur: 60, max: 60 }, held: null, atkW: null, invisT: 0, sickT: 0, boostT: 0, kickT: 0, throwT: 0,
      // v0.9: salto (z en px sobre el suelo), empuje y aturdimiento de golpes (ollazo, carretilla)
      z: 0, jumpT: -1, jumpCD: 0, jumpBuf: 0, kbx: 0, kby: 0, stunT: 0, airborne: airborne
    };
  }

  function emitNoise(G, x, y, r) {
    G.noises.push({ x: x, y: y, r: r, t: 0 });
    sfx('noise', { x: x, y: y, r: r });
    var pulled = 0, hr = r * hearMul();   // v0.8: de noche oyen 30 % más
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto' || z.social) continue;   // F7: los músicos y bailarines pacíficos ignoran el ruido
      if (dist(x, y, z.x, z.y) > hr) continue;
      if (z.state === 'perseguir' || z.state === 'atacar' || z.state === 'golpeado') continue;
      z.state = 'investigar'; z.tx = x; z.ty = y;
      pulled++;
    }
    // la mancha: un solo ruido jala a 3 o más a la vez (aviso máx. 1 cada 10 s)
    if (pulled >= CFG.hordeMin && G.time - (G.hordeAt === undefined ? -1e9 : G.hordeAt) >= CFG.hordeToastEvery) {
      G.hordeAt = G.time;
      ACH.hud.toast('¡Se viene la mancha!');
      sfx('horde'); stinger('horde');
    }
  }

  // v0.8: el arma del golpe (guitarra, puñete o skate en la mano) la decide armas.js; sin armas.js, la guitarra de siempre.
  var GUITAR_W = null;
  function curWeapon(p) {
    if (ACH.armas && ACH.armas.weapon) return ACH.armas.weapon(p);
    if (!GUITAR_W) GUITAR_W = { kind: 'guitar', dmg: CFG.atkDmg, range: CFG.atkRange, arc: CFG.atkArc, knock: CFG.atkKnock, cd: CFG.atkCD,
      cost: CFG.atkCost, noise: CFG.atkNoise, dur: CFG.atkDur, frame: CFG.atkFrame };
    GUITAR_W.dmg = CFG.atkDmg; GUITAR_W.cd = CFG.atkCD;   // v0.13 T2 (P): la rama pasiva y el taller cambian CFG en marcha
    return GUITAR_W;
  }
  var SWING_SFX = { guitar: 'swing', punch: 'punch.swing', skate: 'skate.swing' };
  var HIT_SFX = { guitar: 'hit', punch: 'punch.hit', skate: 'skate.hit' };
  var HIT_TXT = { punch: [['¡PAF!'], ['¡PAF!', '¡PUM!', '¡TOMA!']], skate: [['¡TRAC!'], ['¡TRAC!', '¡PUM!', '¡CRAC!']] };

  function startSwing(G, faceX, faceY) {
    var p = G.player, w = curWeapon(p);
    if (!w || p.atkT >= 0 || p.atkCD > 0 || p.stamina < w.cost) return false;
    if (faceX !== undefined) p.dir = dirFromVec(faceX - p.x, faceY - p.y);
    p.atkW = w;
    p.atkT = 0; p.atkHit = false; p.atkCD = w.cd;
    p.stamina -= w.cost; p.restT = 0;
    sfx(w.swingSfx || SWING_SFX[w.kind] || 'swing', { x: p.x, y: p.y, dir: p.dir });
    emitNoise(G, p.x, p.y, w.noise);
    return true;
  }

  function swingHit(G) {
    var p = G.player, v = DIRV[p.dir], facing = Math.atan2(v[1], v[0]), w = p.atkW || curWeapon(p) || {};
    var range = w.range || CFG.atkRange, arcW = w.arc || CFG.atkArc, kind = w.kind || 'guitar';
    var hits = 0, blocked = 0, anyKill = false, txt = w.hitText || HIT_TXT[kind], FXc = ACH.fx.FX, oh, ok;
    if (txt && FXc) { oh = FXc.hitText; ok = FXc.killText; FXc.hitText = txt[0]; FXc.killText = txt[1]; }
    try {
      for (var i = 0; i < G.zombies.length; i++) {
        var z = G.zombies[i];
        if (z.state === 'muerto') continue;
        var dx = z.x - p.x, dy = z.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > range + CFG.zRadius * 0.5) continue;
        if (d > 4) {
          var a = Math.atan2(dy, dx) - facing;
          while (a > Math.PI) a -= 2 * Math.PI;
          while (a < -Math.PI) a += 2 * Math.PI;
          if (Math.abs(a) > arcW / 2) continue;
        }
        var nx = d > 0.01 ? dx / d : v[0], ny = d > 0.01 ? dy / d : v[1];
        var killed = hitZombie(G, z, nx, ny, { dmg: w.dmg, knock: w.knock, src: kind === 'punch' ? 'fist' : kind });
        if (killed === undefined) { blocked++; continue; }   // la carretilla protegió (zvar): rebote sin daño
        if (kind === 'guitar') habCall('onHit', G, z);   // v0.11: sabor por guitarrazo que conecta
        ACH.fx.hit(G, z, nx, ny, killed, hits === 0);
        if (killed) anyKill = true;
        hits++;
        sfx(w.hitSfx || HIT_SFX[kind] || 'hit', { x: z.x, y: z.y, type: z.type, killed: killed, combo: hits });
        if (killed) { sfx('kill', { x: z.x, y: z.y, type: z.type }); stinger('kill'); }
      }
    } finally { if (txt && FXc) { FXc.hitText = oh; FXc.killText = ok; } }
    // v0.6: el mismo arco golpea props (autos, basura, carretillas, postes) y espanta animales
    var propsN = 0, animals = 0, hard = 0;
    if (ACH.inter) {
      var arc = { ang: facing, half: arcW / 2 };
      ACH.inter.lastHard = 0;
      if (ACH.inter.hitProps) propsN = ACH.inter.hitProps(G, p.x, p.y, range, w.dmg !== undefined ? w.dmg : CFG.atkDmg, 'swing', arc) || 0;
      hard = ACH.inter.lastHard || 0;   // autos, postes, chapa: gastan el doble
      if (ACH.inter.hitAnimals) animals = ACH.inter.hitAnimals(G, p.x, p.y, range, 'swing', arc) || 0;
    }
    // v0.9 (H3): gallinazos en el aire. Guitarrazo: el arco por delante con z < 24; escoba en giro: radio 30 con z < 36 (aves.js de H2)
    var AV = ACH.aves;
    if (AV && typeof AV.hitCircle === 'function') {
      var nb = 0;
      try {
        if (arcW >= 6) nb = AV.hitCircle(G, p.x, p.y, 30, 36, w.dmg !== undefined ? w.dmg : 1, kind) || 0;
        else nb = AV.hitCircle(G, p.x + v[0] * range * 0.55, p.y + v[1] * range * 0.55, range * 0.6, 24, w.dmg !== undefined ? w.dmg : CFG.atkDmg, kind) || 0;
      } catch (eA) { hookWarn('aves.hitCircle', eA); }
      if (nb > 0) { hits += nb; sfx(w.hitSfx || HIT_SFX[kind] || 'hit', { x: p.x, y: p.y, combo: hits }); }
    }
    var NV = ACH.nivel, nh = NV && NV.onSwing ? NV.onSwing(G, { x: p.x, y: p.y, ang: facing, range: range, arc: arcW, dmg: w.dmg !== undefined ? w.dmg : CFG.atkDmg, knock: w.knock, kind: kind === 'guitar' || kind === 'punch' ? kind : 'held:' + kind, bees: w.bees !== undefined ? w.bees : (kind === 'punch' ? 0.5 : undefined) }) : 0;   // Miraflores: jefa y abejas
    if (nh > 0) { hits += nh; G.hitstop = Math.max(G.hitstop || 0, CFG.fx.hitstopHit); sfx(w.hitSfx || HIT_SFX[kind] || 'hit', { x: p.x, y: p.y, combo: hits }); } else if (nh < 0) { blocked++; hard++; }
    if (ACH.armas && ACH.armas.afterSwing) ACH.armas.afterSwing(G, { kind: kind, hits: hits, blocked: blocked, props: propsN, hard: hard });
    if (hits) say(anyKill ? 'kill' : 'hit', p.x, p.y);
    if (!hits && !propsN && !animals && !blocked) sfx('whiff', { x: p.x, y: p.y });
    return hits;
  }

  // opts (v0.6, piedras): {from:{x,y} de donde viene el golpe, dmg, knock (px)}. Devuelve true si murió, false si no,
  // y undefined si zvar lo bloqueó (carretilla de frente).
  // cerro.js golpea con from = carretilla − dirección·20 y sin src: se reconoce por la posición
  function cartSrc(f) {
    var C = ACH.cerro && ACH.cerro.carts; if (!C) return false;
    for (var i = 0; i < C.length; i++) {
      var c = C[i]; if (!c) continue;
      var bx = c.x - (c.dx || 0) * 20, by = c.y - (c.dy || 0) * 20;
      if (Math.abs(bx - f.x) < 3 && Math.abs(by - f.y) < 3) return true;
    }
    return false;
  }
  function hitZombie(G, z, nx, ny, opts) {
    var p = (opts && opts.from) || G.player;
    // v0.9: gancho de comportamiento (senoras.js): 'block' = rebote sin daño, 'parry' = la interrumpiste: daño doble
    var zb = zbehOf(z), zr;
    if (zb && zb.onHit) {
      // v0.9 (H3): 4º argumento ho = {from, src, dmg, knock}; sin src se deduce (carretilla de cerro.js, piedra, golpe de Alexander)
      var hsrc = opts && opts.src;
      if (!hsrc && opts && opts.from) hsrc = cartSrc(opts.from) ? 'carretilla' : 'stone';
      if (!hsrc) hsrc = 'guitar';
      var ho = { from: { x: p.x, y: p.y }, src: hsrc, dmg: opts && opts.dmg, knock: opts && opts.knock };
      try { zr = zb.onHit(G, z, hsrc, ho); } catch (eB) { hookWarn('zbeh.onHit', eB); }
    }
    if (zr === 'block') return;
    if (ACH.zvar && ACH.zvar.onHit(G, z, p.x, p.y) === 'block') { /* rebote, sin daño */ return; }
    if (ACH.armas && ACH.armas.breakInvis) ACH.armas.breakInvis(G, 'hit');   // v0.8: un golpe que conecta lo descubre
    if (z.social && ACH.social) ACH.social.onHit(G, z);   // F7: golpear a un músico corta la orquesta y lo vuelve hostil
    var hdmg = (opts && opts.dmg !== undefined) ? opts.dmg : CFG.atkDmg;
    if (hdmg < 0.5 && z.punch3 && z.hpMax) hdmg = Math.max(hdmg, z.hpMax / 3 + 0.001);   // QA v0.8: el puñete mata skate/bici/moto/cuatro en 3
    if (zr === 'parry') hdmg *= 2;
    z.hp -= hdmg; z.lungeT = 0;
    // empuje: velocidad inicial fuerte que decae rápido (la distancia total es atkKnock; el cadáver solo se desliza killKnock)
    var dead = z.hp <= 0, k = CFG.knockDecay, dd = dead ? CFG.killKnock : ((opts && opts.knock !== undefined) ? opts.knock : CFG.atkKnock);
    var v0 = dd * (1 - Math.exp(-k / 60)) * 60; // suma geométrica a 60 Hz = dd px
    z.kbx = nx * v0; z.kby = ny * v0;
    if (dead) {
      z.hp = 0; z.state = 'muerto'; z.deadT = 0; z.stunT = CFG.zStun;
      G.fans++;
      ACH.hud.toast(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
      if (ACH.inv && ACH.inv.dropFor) { try { ACH.inv.dropFor(z); } catch (e) { console.warn('[ACHORADO] inv.dropFor', e); } }
      habCall('onKill', G, z, (opts && opts.src) || (opts && opts.from ? 'stone' : 'guitar'));   // v0.11: XP y sabor
    } else {
      z.state = 'golpeado'; z.stunT = CFG.zStun;
    }
    return dead;
  }

  // Aplica el empuje con subpasos (para no atravesar paredes) y lo hace decaer exponencialmente.
  function applyKnock(z, dt) {
    var sp = Math.sqrt(z.kbx * z.kbx + z.kby * z.kby);
    if (sp < 1) { z.kbx = 0; z.kby = 0; return; }
    var dist = sp * dt, n = Math.max(1, Math.ceil(dist / CFG.knockStep));
    for (var i = 0; i < n; i++) ACH.world.moveCircle(z, z.kbx * dt / n, z.kby * dt / n, CFG.zRadius);
    var f = Math.exp(-CFG.knockDecay * dt);
    z.kbx *= f; z.kby *= f;
  }

  // v0.9: opts = {push:{x, y, f} (dirección y px totales), stun (s), src, ignoreAir}. Con opts y Alexander en el aire (p.z > 6),
  // el golpe no entra (salvo ignoreAir) y devuelve false. Devuelve true si le pegó.
  function hurtPlayer(G, dmg, opts) {
    var p = G.player;
    if (p.hp <= 0) return false;
    if (opts && !opts.ignoreAir && (p.z || 0) > JUMP.safeZ) return false;
    if (ACH.hab) { var fd = habCall('filterHurt', G, dmg, opts, curZ || (inZvar ? zvarSrc(G) : null)); if (typeof fd === 'number' && isFinite(fd)) { if (fd <= 0) return false; dmg = fd; } }   // v0.11: escudo frontal y zombies debilitados
    var dm = difMul(); if (dm !== 1) dmg = Math.round(dmg * dm * 10) / 10;   // v0.13 (A2): dificultad (ACH.dif.dmgMul: 1 / 1.3 / 1.6)
    var before = p.hp;
    p.hp = Math.max(0, p.hp - dmg); p.hurtT = 0.4;
    if (opts && opts.push && opts.push.f) {
      var px = opts.push.x || 0, py = opts.push.y || 0, pl = Math.sqrt(px * px + py * py) || 1;
      var v0 = opts.push.f * (1 - Math.exp(-CFG.knockDecay / 60)) * 60;   // misma suma geométrica que el empuje de los zombies
      p.kbx = px / pl * v0; p.kby = py / pl * v0;
    }
    if (opts && opts.stun > 0) p.stunT = Math.max(p.stunT || 0, opts.stun);
    ACH.hud.flashHurt();
    if (p.hp > 0) say(before >= 30 && p.hp < 30 ? 'lowhp' : 'hurt', p.x, p.y);
    sfx('player.hurt', { x: p.x, y: p.y, hp: p.hp }); if (p.hp > 0) stinger('hurt');
    if (p.bird) launchTitina(G);
    return true;
  }

  // v0.9: factor de pendiente para un paso (nx, ny normalizado). Norte = y negativa = cuesta arriba.
  function slopeMul(x, y, ny) {
    var W = ACH.world;
    if (!W.slopeAt || !ny) return 1;
    var st = W.isStairs && W.isStairs(x, y), s = W.slopeAt(x, y) || 0, a = Math.abs(ny);
    if (st) return 1 + ((ny < 0 ? SLOPE.stairsUp : SLOPE.stairsDown) - 1) * a;
    if (!s) return 1;
    return ny < 0 ? 1 - SLOPE.up * s * a : 1 + SLOPE.down * s * a;
  }
  function updateJump(G, p, dt, I) {
    if (p.jumpCD > 0) p.jumpCD -= dt;
    if (I.pressed('KeyC')) p.jumpBuf = JUMP.buffer;
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.jumpT < 0 && p.jumpBuf > 0 && p.jumpCD <= 0 && p.atkT < 0 && !(p.stunT > 0) && !carrying(p) && p.hp > 0) {
      if (p.stamina >= JUMP.cost) {
        p.jumpBuf = 0; p.jumpT = 0; p.stamina -= JUMP.cost; p.restT = 0;
        sfx('jump', { x: p.x, y: p.y, surface: surfaceAt(p.x, p.y) });
        if (G.stats) G.stats.jumps = (G.stats.jumps || 0) + 1;
      } else if (p.noAirT <= 0) { p.jumpBuf = 0; p.noAirT = CFG.noAirEvery; G.noAirAt = G.clock; sfx('ui.back'); }
    }
    if (p.jumpT >= 0) {
      p.jumpT += dt;
      var t = p.jumpT / JUMP.dur;
      if (t >= 1) { p.jumpT = -1; p.z = 0; p.jumpCD = JUMP.cd; sfx('land', { x: p.x, y: p.y, surface: surfaceAt(p.x, p.y) }); }
      else p.z = JUMP.h * 4 * t * (1 - t);
    } else p.z = 0;
  }
  function applyPlayerKnock(p, dt) {
    var sp = Math.sqrt(p.kbx * p.kbx + p.kby * p.kby);
    if (sp < 1) { p.kbx = 0; p.kby = 0; return; }
    var n = Math.max(1, Math.ceil(sp * dt / CFG.knockStep));
    for (var i = 0; i < n; i++) ACH.world.moveCircle(p, p.kbx * dt / n, p.kby * dt / n, CFG.radius);
    var f = Math.exp(-CFG.knockDecay * dt); p.kbx *= f; p.kby *= f;
  }

  function updatePlayer(G, dt) {
    var p = G.player, I = ACH.input;
    var ax = I.axis(), len = Math.sqrt(ax.x * ax.x + ax.y * ax.y);
    if (p.z === undefined) { p.z = 0; p.jumpT = -1; p.jumpCD = 0; p.jumpBuf = 0; p.kbx = 0; p.kby = 0; p.stunT = 0; p.airborne = airborne; }
    if (p.kbx || p.kby) applyPlayerKnock(p, dt);
    if (p.stunT > 0) { p.stunT -= dt; len = 0; ax = { x: 0, y: 0 }; }   // aturdido (ollazo): no camina ni golpea
    p.moving = len > 0;
    var shift = I.any(['ShiftLeft', 'ShiftRight', 'Shift']);
    // agotado: no vuelve a correr hasta soltar Shift Y recuperar 20 de aliento
    if (p.exhausted && !shift && p.stamina >= CFG.exhaustResume) { p.exhausted = false; sfx('player.recovered'); }
    // v0.8: empacho (camina al 70 % y no corre), subidón (aliento ×2,5, correr gasta 40 % menos), empujando la bici o la moto
    var mods = ACH.armas && ACH.armas.playerMods ? ACH.armas.playerMods(p) : null;
    var wantRun = shift && p.moving && p.stamina > 0 && !p.exhausted && !(mods && !mods.run);
    p.running = wantRun;
    var spd = (wantRun ? CFG.run : CFG.walk) * (mods ? mods.spd : 1) * (ACH.nivel && ACH.nivel.speedMul ? ACH.nivel.speedMul(G) : 1);   // Miraflores: miel
    if (p.atkT >= 0) spd *= 0.5; // se frena un poco al guitarrear
    if (p.habStrumT > 0) spd *= 0.5;   // v0.11: tocando una melodía camina al 50 %
    var slinging = !!(ACH.inter && ACH.inter.slingActive && ACH.inter.slingActive(G));
    if (slinging) spd *= ACH.inter.SL.walkMul;   // tensando la resortera camina al 60 %
    var upRun = false;
    if (p.moving) {
      var sm = slopeMul(p.x, p.y, ax.y / len);   // v0.9: cuesta arriba más lento, cuesta abajo un poco más rápido
      spd *= sm; upRun = wantRun && ax.y < 0 && sm < 1;
      var vx = ax.x / len * spd * dt, vy = ax.y / len * spd * dt;
      ACH.world.moveCircle(p, vx, vy, CFG.radius);
      if (p.atkT < 0 && !slinging) p.dir = dirFromVec(ax.x, ax.y);
      var f0 = Math.floor(p.animT);
      p.animT += dt * CFG.animFps * spd / CFG.animRefSpeed; // en cuadros: los pasos siguen a la velocidad
      var f1 = Math.floor(p.animT);   // paso: al entrar a los cuadros 1 y 3 del ciclo de 4 (2 por ciclo)
      if (f1 !== f0 && (f1 & 1)) sfx('step', { x: p.x, y: p.y, surface: surfaceAt(p.x, p.y), run: wantRun });
      p.mx = ax.x / len; p.my = ax.y / len;
    } else { p.animT = 0; p.mx = 0; p.my = 0; }

    if (wantRun) {
      p.stamina = Math.max(0, p.stamina - CFG.runCost * (mods ? mods.runCost : 1) * (upRun ? SLOPE.runUpCost : 1) * dt); p.restT = 0;
      if (p.stamina <= 0 && !p.exhausted) { p.exhausted = true; sfx('player.exhausted'); }
      p.runNoiseT -= dt;
      // v0.8: invisible, correr no hace ruido de pasos (no rompe la invisibilidad)
      if (p.runNoiseT <= 0) { p.runNoiseT = CFG.runNoiseEvery; if (!(p.invisT > 0)) emitNoise(G, p.x, p.y, CFG.runNoise); }
    } else {
      p.runNoiseT = 0;
    }

    // guitarrazo
    // Una pulsación que llega en pleno golpe o enfriamiento se recuerda atkBuffer s y sale apenas se pueda; mantener ESPACIO
    // (o el botón GUITARRAZO) vuelve a golpear cada vez que termina el enfriamiento. Sin aliento: aviso «¡sin aire!» (G.noAirAt).
    if (p.atkCD > 0) p.atkCD -= dt;
    if (p.noAirT > 0) p.noAirT -= dt;
    var swEdge = I.pressed('Space'), swHeld = I.down('Space');
    if (swEdge) p.atkBuf = CFG.atkBuffer;
    var wNow = curWeapon(p);
    if (!wNow) p.atkBuf = 0;   // empujando la bici o la moto: ESPACIO la lanza (armas.js)
    else if (p.z > 0 || p.stunT > 0 || p.habStrumT > 0) { /* v0.9: en el aire o aturdido no sale el golpe (la pulsación queda en el búfer); v0.11: tampoco tocando una melodía */ }
    else if (p.atkBuf > 0 || swHeld) {
      var busy = p.atkT >= 0 || p.atkCD > 0;
      if (!busy && p.stamina < wNow.cost) {
        p.atkBuf = 0;
        if (swEdge || p.noAirT <= 0) { p.noAirT = CFG.noAirEvery; G.noAirAt = G.clock; sfx('ui.back'); }
      } else if (startSwing(G)) p.atkBuf = 0;
    }
    if (p.atkBuf > 0) p.atkBuf -= dt;
    updateJump(G, p, dt, I);   // v0.9: C = saltar
    // v0.6: el clic izquierdo es la resortera (interaccion.js); sin resortera, el clic no hace nada
    if (ACH.inter && ACH.inter.updateSling) ACH.inter.updateSling(G, dt);
    if (p.atkT >= 0) {
      var aw = p.atkW || wNow || {}, aFrame = aw.frame || CFG.atkFrame, aDur = aw.dur || CFG.atkDur;
      p.atkT += dt; p.restT = 0;
      if (!p.atkHit && p.atkT >= aFrame) { p.atkHit = true; if (aw.kind !== 'punch') ACH.fx.swing(G, p); swingHit(G); }
      // paso al frente durante el cuadro activo
      if (p.atkT >= aFrame && p.atkT < aFrame * 2) {
        var lv = DIRV[p.dir], ls = CFG.lungeStep / aFrame * dt * (aw.kind === 'punch' ? 0.5 : 1);
        ACH.world.moveCircle(p, lv[0] * ls, lv[1] * ls, CFG.radius);
      }
      if (p.atkT >= aDur) p.atkT = -1;
    }

    if (!wantRun && p.atkT < 0) {
      p.restT += dt;
      if (p.restT >= CFG.regenDelay) p.stamina = Math.min(CFG.staminaMax, p.stamina + CFG.staminaRegen * (mods ? mods.regen : 1) * dt);
    }
    if (p.hurtT > 0) p.hurtT -= dt;

    // Q = vista de paloma
    if (G.qCD > 0) G.qCD -= dt;
    if (G.qT > 0) G.qT -= dt;
    if (I.pressed('KeyQ')) p.qBuf = CFG.qBuffer;   // igual que el guitarrazo: la pulsación se recuerda un momento
    if (p.qBuf > 0 && p.bird && G.qCD <= 0) { p.qBuf = 0; G.qT = CFG.qDur; G.qCD = CFG.qCD; sfx('titina.coo', { x: p.x, y: p.y - 12 }); }
    if (p.qBuf > 0) p.qBuf -= dt;
  }

  /* ---------------- Titina ---------------- */
  function launchTitina(G) {
    var p = G.player, t = G.titina;
    p.bird = false;
    t.state = 'volando'; t.t = 0;
    t.x = p.x + 3; t.y = p.y - 1; t.z = 16;
    t.ang = Math.random() * Math.PI * 2;
    t.qLost = G.qT > 0; G.qT = 0; // la vista de paloma se corta
    sfx('titina.launch', { x: t.x, y: t.y });
  }
  function updateTitina(G, dt) {
    var t = G.titina, p = G.player;
    if (t.state === 'hombro') return;
    t.t += dt; t.anim += dt;
    if (t.state === 'volando') {
      t.ang += dt * 2.2;
      var rad = 50 + 10 * Math.sin(t.t * 1.7);
      var tx = p.x + Math.cos(t.ang) * rad, ty = p.y + Math.sin(t.ang) * rad * 0.7;
      var k = 1 - Math.exp(-4 * dt);
      t.x += (tx - t.x) * k; t.y += (ty - t.y) * k;
      t.z += (24 - t.z) * k;
      if (t.t >= CFG.titinaAway) { t.state = 'volviendo'; sfx('titina.return', { x: t.x, y: t.y }); }
    } else if (t.state === 'volviendo') {
      var dx = p.x - t.x, dy = p.y - t.y, d = Math.sqrt(dx * dx + dy * dy);
      var step = 110 * dt;
      t.z += (16 - t.z) * (1 - Math.exp(-4 * dt));
      if (d <= step + 2) { t.state = 'hombro'; p.bird = true; sfx('titina.grabbed', { x: p.x, y: p.y }); }
      else { t.x += dx / d * step; t.y += dy / d * step; }
    }
  }
  function makeTitina() { return { state: 'hombro', x: 0, y: 0, z: 0, t: 0, ang: 0, anim: 0 }; }

  /* ---------------- Zombies ---------------- */
  // v0.9: piel de señora (ACH.sprites.senoraList = {balde:[skins], olla:[skins]}); se ve por zvar.frame con loco 'camina'.
  function senoraSkin(z, kind) {
    var L = ACH.sprites && ACH.sprites.senoraList, list = L && L[kind];
    z.loco = 'camina';
    if (Array.isArray(list) && list.length) { var e = list[Math.floor(Math.random() * list.length)]; z.skin = typeof e === 'string' ? e : (e && e.skin); }
    else z.skin = (kind === 'olla' ? 'senoraOlla' : 'senoraBalde') + '_normal_' + (kind === 'olla' ? 'chaleco' : 'manta');   // clave del contrato; sin sprite → placeholder
  }
  // opts (v0.9): {loco} fuerza la forma de moverse (zvar). En el Cerro no hay bici, moto ni skate (las calles no son pistas).
  var CERRO_LOCOS = [['camina', 6], ['cojo', 1.5], ['muletas', 1], ['cuatro', 1], ['gusano', 1], ['carretilla', 0.6]];
  function cerroLoco(type) {
    var tot = 0, i, r;
    for (i = 0; i < CERRO_LOCOS.length; i++) tot += CERRO_LOCOS[i][1];
    r = Math.random() * tot;
    for (i = 0; i < CERRO_LOCOS.length; i++) { r -= CERRO_LOCOS[i][1]; if (r <= 0) break; }
    var l = CERRO_LOCOS[Math.min(i, CERRO_LOCOS.length - 1)][0];
    return type === 'escolar' && (l === 'muletas' || l === 'carretilla') ? 'camina' : l;
  }
  function makeZombie(type, x, y, opts) {
    var d = ZT[type] || ZT.caminante, rng = Math.random;
    var z = {
      type: ZT[type] ? type : 'caminante', x: x, y: y, hp: d.hp, state: 'deambular',
      wx: 0, wy: 0, wT: rand(0, 2), tx: x, ty: y, lostT: 0, lastX: x, lastY: y,
      atkCD: 0, shoutCD: 0, lungeT: 0, lungeCD: 0, stunT: 0, kbx: 0, kby: 0, deadT: 0, animT: rand(0, 1), flip: false, moving: false, hurtT: 0
    };
    if (d.senora) { senoraSkin(z, d.senora); z.hpMax = z.hp; }
    else if (ACH.zvar) {
      var force = opts && opts.loco;
      if (!force && ACH.world.lanes && ACH.world.lanes.length) force = cerroLoco(z.type);   // el Cerro (mundo con carriles de bajada)
      ACH.zvar.assign(z, rng, force);
    }
    var zb = zbehOf(z);
    if (zb && zb.init) { try { zb.init(ACH.G, z); } catch (e) { hookWarn('zbeh.init', e); } }
    return z;
  }
  function spawnInitial(G) {
    var sp = ACH.world.spawns, nSling = 0, cerro = !!(ACH.world.lanes && ACH.world.lanes.length);
    G.zombies.length = 0;
    for (var i = 0; i < sp.length; i++) {
      var s = sp[i];
      if (s.ch === 'Z') G.zombies.push(makeZombie('caminante', s.x, s.y));
      else if (s.ch === 'C') G.zombies.push(makeZombie('ciego', s.x, s.y));
      else if (s.ch === 'B') G.zombies.push(makeZombie('cobrador', s.x, s.y));
      else if (s.ch === 'O') G.zombies.push(makeZombie('senoraOlla', s.x, s.y));
      else if (s.ch === 'W') G.zombies.push(makeZombie('senoraBalde', s.x, s.y));
      else if (s.ch === 'K') {   // grupo de 3 señoras: 2 del balde y 1 de la olla
        G.zombies.push(makeZombie('senoraBalde', s.x - 7, s.y + 4));
        G.zombies.push(makeZombie('senoraBalde', s.x + 7, s.y + 4));
        G.zombies.push(makeZombie('senoraOlla', s.x, s.y - 6));
      }
      else if (s.ch === 'E') {
        // v0.6: en los 2 primeros grupos, un escolar lleva la resortera visible (su botín: resortera + piedras ×10)
        var zs = makeZombie('escolar', s.x - 7, s.y + 4);
        if (nSling < 2) { zs.sling = true; nSling++; }
        G.zombies.push(zs);
        G.zombies.push(makeZombie('escolar', s.x + 7, s.y + 4));
        G.zombies.push(makeZombie('escolar', s.x, s.y - 6));
      }
      // 'V' (gallinazo hostil posado) es de aves.js: aquí no se crea nada
    }
    if (cerro) {   // al menos un cuatro patas y un gusano entre los caminantes del barrio
      var walkers = G.zombies.filter(function (z) { return z.type === 'caminante' && z.loco === 'camina'; });
      if (ACH.zvar && ACH.zvar.setLoco) ['cuatro', 'gusano'].forEach(function (l) {
        if (G.zombies.some(function (z) { return z.loco === l; }) || !walkers.length) return;
        var z = walkers.splice(Math.floor(Math.random() * walkers.length), 1)[0];
        ACH.zvar.assign(z, Math.random, l);
      });
    } else if (ACH.zvar && ACH.zvar.balance) ACH.zvar.balance(G, Math.random);   // QA v0.6: ~40 % camina y mínimos por estilo
    if (!cerro) { try { gentleStart(G); } catch (eG) { hookWarn('gentleStart', eG); } }
  }
  // v0.13 cierre (B7): el arranque de la Gambetta enseña sin castigar. A ≤ START_R px del inicio: como máximo START_MAX zombis y lentos
  // (muletas, gusano, carretilla o cantor). Los que sobran se mudan hacia el este, pasados los START_R px, en su misma fila (o se quitan si no hay sitio).
  var START_R = 400, START_MAX = 2, START_SLOW = { muletas: 1, gusano: 1, carretilla: 1, cantor: 1 };
  function gentleStart(G) {
    var W = ACH.world, st = W && W.start; if (!st || W.id !== 'gambetta') return;
    var near = G.zombies.filter(function (z) { return dist(z.x, z.y, st.x, st.y) <= START_R; }).sort(function (a, b) { return dist(a.x, a.y, st.x, st.y) - dist(b.x, b.y, st.x, st.y); });
    near.forEach(function (z, i) {
      if (i < START_MAX) {
        if (!START_SLOW[z.loco] && ACH.zvar && ACH.zvar.setLoco) ACH.zvar.setLoco(z, z.type === 'escolar' ? 'gusano' : 'muletas', Math.random);
        return;
      }
      var ok = false, nx;
      for (nx = st.x + START_R + 24; nx < (W.W || 2048) - 40 && !ok; nx += 16) {
        if (W.collideCircle && W.collideCircle(nx, z.y, 6)) continue;
        z.x = z.lastX = z.tx = nx; ok = true;
      }
      if (!ok) { var k = G.zombies.indexOf(z); if (k >= 0) G.zombies.splice(k, 1); }
    });
  }

  function canSee(G, z) {
    var p = G.player, d = ZT[z.type];
    if (p.invisT > 0) return false;   // v0.8: Cola Inglesa: no lo ven ni lo huelen
    var range = ((z.state === 'perseguir' || z.state === 'atacar') ? d.sight * 1.8 : d.sight) * sightMul();   // de noche ven 20 % menos
    var dd = dist(z.x, z.y, p.x, p.y);
    if (dd > range) return false;
    // el ciego solo detecta por contacto, pero tampoco a través de paredes
    if (d.blind) return ACH.world.los(z.x, z.y, p.x, p.y);
    return ACH.world.los(z.x, z.y - 6, p.x, p.y - 6);
  }

  function moveZombie(G, z, vx, vy, dt) {
    var want = { vx: vx, vy: vy }, hit = false, ZS = ACH.zstatus;
    // v0.9: estados (quemadura, mojado…): cada fn(G, z, dt, want) puede cambiar la velocidad o el rumbo pedidos
    if (ZS && ZS.length) {
      for (var si = 0; si < ZS.length; si++) { try { ZS[si](G, z, dt, want); } catch (eS) { hookWarn('zstatus', eS); } }
      vx = want.vx; vy = want.vy;
    }
    // v0.9: la pendiente también frena a los zombies (menos que a Alexander: la mitad)
    if (ACH.world.slopeAt && vy) { var zl = Math.sqrt(vx * vx + vy * vy) || 1, zm = 1 + (slopeMul(z.x, z.y, vy / zl) - 1) * 0.5; vx *= zm; vy *= zm; want.vx = vx; want.vy = vy; }
    // v0.11: Cumbia del Mareo (habilidades.js): más lentos y tambaleándose de lado
    if (z.habSlowT > 0 && z.habSlowMul > 0) { var sw = Math.sin((z.animT || 0) * 7) * 0.35, ox = -vy * sw, oy = vx * sw; vx = (vx + ox) * z.habSlowMul; vy = (vy + oy) * z.habSlowMul; want.vx = vx; want.vy = vy; }
    if (ACH.zvar && ACH.zvar.move(G, z, dt, want)) { /* zvar movió */ hit = !!want.hit; }
    else {
      hit = ACH.world.moveCircle(z, vx * dt, vy * dt, CFG.zRadius);
      z.moving = vx !== 0 || vy !== 0;
      if (vx < -0.5) z.flip = true; else if (vx > 0.5) z.flip = false;
    }
    return hit;
  }

  function updateZombie(G, z, dt) {
    var p = G.player, d = ZT[z.type], pd;
    if (!z.difHp) difHp(z);
    z.animT += dt;
    if (z.hurtT > 0) z.hurtT -= dt;
    if (z.squash > 0) z.squash--;
    if (z.state === 'muerto') {
      z.deadT += dt;
      if (z.stunT > 0) { z.stunT -= dt; applyKnock(z, dt); }
      return;
    }
    if (z.social) return;   // F7: músicos y bailarines pacíficos: los maneja social.js (no deambulan ni persiguen)
    if (z.atkCD > 0) z.atkCD -= dt;
    if (z.lungeT > 0) { z.lungeT -= dt; if (z.lungeT <= 0) { z.lungeT = 0; z.lungeCD = CFG.lungeCD; } }
    else if (z.lungeCD > 0) z.lungeCD -= dt;
    var alive = p.hp > 0 && G.state === 'playing';

    if (z.state === 'golpeado') {
      z.stunT -= dt;
      applyKnock(z, dt);
      z.moving = false;
      if (z.stunT <= 0) { z.state = alive ? 'perseguir' : 'deambular'; z.lostT = 0; z.lastX = p.x; z.lastY = p.y; }
      return;
    }
    // v0.9 (H3): quemándose (fuego.js pone z.burnT): corre desorientado al 120 % en direcciones al azar y no ataca
    if (z.burnT > 0) {
      z.burnDirT = (z.burnDirT || 0) - dt;
      if (!(z.burnDirT > 0)) { z.burnDirT = rand(0.35, 0.8); var ba = Math.random() * Math.PI * 2; z.bwx = Math.cos(ba); z.bwy = Math.sin(ba); }
      var bs = d.speed * 1.2 * nightMul(z);
      if (moveZombie(G, z, z.bwx * bs, z.bwy * bs, dt)) z.burnDirT = 0;
      if (z.state === 'atacar') z.state = 'perseguir';
      return;
    }
    // v0.9: comportamiento propio (senoras.js): true = ya lo manejó este paso
    var zb = zbehOf(z);
    if (zb && zb.update) { try { if (zb.update(G, z, dt)) return; } catch (eU) { hookWarn('zbeh.update', eU); } }

    if (z.shoutCD > 0) z.shoutCD -= dt;
    // v0.8: invisible: sueltan el objetivo y deambulan; si uno lo toca, lo descubre
    if (alive && invisible(G)) {
      if (dist(z.x, z.y, p.x, p.y) <= CFG.zAttackRange && ACH.armas && ACH.armas.breakInvis) ACH.armas.breakInvis(G, 'touch');
      else if (z.state === 'perseguir' || z.state === 'atacar') { z.state = 'deambular'; z.wT = 0; z.lungeT = 0; }
    }
    var sees = alive && canSee(G, z);
    if (sees) {
      z.lastX = p.x; z.lastY = p.y; z.lostT = 0;
      if (z.state === 'deambular' || z.state === 'investigar') {
        z.state = 'perseguir';
        sfx('zombie.alert', { x: z.x, y: z.y, type: z.type });
        // cobrador: al verte grita (toast + ruido que jala a los demás), con cooldown
        if (d.shouts && z.shoutCD <= 0) {
          z.shoutCD = CFG.cobradorCD; z.shoutT = 0.6;
          ACH.hud.toast(CFG.cobradorText);
          sfx('cobrador.shout', { x: z.x, y: z.y }); stinger('cobrador');
          if (ACH.audio && ACH.audio.say) { try { ACH.audio.say('cobrador', { who: 'cobrador', x: z.x, y: z.y }); } catch (e) { /* sin voz */ } }   // QA v0.6: «¡Al fondo hay sitio!»
          emitNoise(G, z.x, z.y, CFG.cobradorNoise);
        }
      }
    }
    pd = dist(z.x, z.y, p.x, p.y);

    if (z.state === 'perseguir' || z.state === 'atacar') {
      if (!alive) { z.state = 'deambular'; return; }
      if (pd <= CFG.zAttackRange) {
        if (z.state !== 'atacar') { z.state = 'atacar'; if (z.atkCD < CFG.zWindup) z.atkCD = CFG.zWindup; }
        z.moving = false;
        if (p.x < z.x - 0.5) z.flip = true; else if (p.x > z.x + 0.5) z.flip = false;
        if (z.atkCD <= 0) { z.atkCD = CFG.zAttackCD; sfx('zombie.bite', { x: z.x, y: z.y, type: z.type }); hurtPlayer(G, d.dmg); }
        return;
      }
      if (z.state === 'atacar' && pd > CFG.zAttackRange + 4) z.state = 'perseguir';
      if (z.state === 'atacar') { z.moving = false; return; }
      if (!sees) {
        z.lostT += dt;
        if (z.lostT >= 3) { z.state = 'investigar'; z.tx = z.lastX; z.ty = z.lastY; return; }
      }
      var gx = sees ? p.x : z.lastX, gy = sees ? p.y : z.lastY;
      var dx = gx - z.x, dy = gy - z.y, l = Math.sqrt(dx * dx + dy * dy);
      // salto: a 28 px de verlo, ×1.8 por 0.35 s y luego 1.5 s de espera
      if (d.lunge && sees && z.lungeT <= 0 && z.lungeCD <= 0 && pd <= CFG.lungeRange) { z.lungeT = CFG.lungeDur; sfx('zombie.lunge', { x: z.x, y: z.y, type: z.type }); }
      var spd = d.speed * (z.lungeT > 0 ? CFG.lungeMult : 1) * nightMul(z);
      if (l > 1) moveZombie(G, z, dx / l * spd, dy / l * spd, dt); else z.moving = false;
      return;
    }

    if (z.state === 'investigar') {
      var ix = z.tx - z.x, iy = z.ty - z.y, il = Math.sqrt(ix * ix + iy * iy);
      if (il < 4) { z.state = 'deambular'; z.wT = rand(1, 2); return; }
      var hit = moveZombie(G, z, ix / il * d.speed * nightMul(z), iy / il * d.speed * nightMul(z), dt);
      if (hit) { z.stuckT = (z.stuckT || 0) + dt; if (z.stuckT > 1.5) { z.stuckT = 0; z.state = 'deambular'; } }
      else z.stuckT = 0;
      return;
    }

    // deambular: 40 % de velocidad, cambia de rumbo cada 2–4 s
    z.wT -= dt;
    if (z.wT <= 0) {
      z.wT = rand(2, 4);
      if (Math.random() < 0.25) { z.wx = 0; z.wy = 0; }
      else { var a = Math.random() * Math.PI * 2; z.wx = Math.cos(a); z.wy = Math.sin(a); }
    }
    if (z.wx || z.wy) {
      var s = d.speed * 0.4 * nightMul(z);
      if (moveZombie(G, z, z.wx * s, z.wy * s, dt)) { z.wT = Math.min(z.wT, 0.3); }
    } else z.moving = false;
  }

  // Empuja a un par de zombies hasta que no se traslapen; si una pared frena a uno, el otro cede el resto.
  function pushApart(a, b, minD) {
    var W = ACH.world, R = CFG.zRadius;
    var dx = b.x - a.x, dy = b.y - a.y, dl = Math.sqrt(dx * dx + dy * dy);
    if (dl >= minD) return;
    var half = (minD - dl) / 2;
    if (dl < 0.01) { var ang = Math.random() * Math.PI * 2; dx = Math.cos(ang); dy = Math.sin(ang); dl = 1; }
    var nx = dx / dl, ny = dy / dl;
    W.moveCircle(a, -nx * half, -ny * half, R);
    W.moveCircle(b, nx * half, ny * half, R);
    var rem = minD - dist(a.x, a.y, b.x, b.y);
    if (rem > 0.01) { // alguno chocó con una pared: el otro toma lo que falta
      W.moveCircle(b, nx * rem, ny * rem, R);
      rem = minD - dist(a.x, a.y, b.x, b.y);
      if (rem > 0.01) W.moveCircle(a, -nx * rem, -ny * rem, R);
    }
  }

  function separate(G) {
    var zs = G.zombies, p = G.player, minD = CFG.zRadius * 2;
    for (var it = 0; it < 2; it++) {
      for (var i = 0; i < zs.length; i++) {
        var a = zs[i]; if (a.state === 'muerto') continue;
        for (var j = i + 1; j < zs.length; j++) {
          var b = zs[j]; if (b.state === 'muerto') continue;
          pushApart(a, b, minD);
        }
        // no se meten dentro de Alexander
        if (p.hp > 0) {
          var px = a.x - p.x, py = a.y - p.y, pdd = px * px + py * py, pm = 8;
          if (pdd < pm * pm) {
            var pl = Math.sqrt(pdd) || 0.01;
            if (pdd === 0) { px = 1; py = 0; }
            ACH.world.moveCircle(a, px / pl * (pm - pl), py / pl * (pm - pl), CFG.zRadius);
          }
        }
      }
    }
  }

  // Cada 12 s, si hay menos de 26 vivos: un caminante en vereda o callejón, lejos y fuera de cámara.
  function updateRespawn(G, dt) {
    G.respawnT += dt;
    if (G.respawnT < CFG.respawnEvery) return;
    G.respawnT = 0;
    var alive = 0;
    for (var i = 0; i < G.zombies.length; i++) if (G.zombies[i].state !== 'muerto') alive++;
    if (alive >= CFG.respawnBelow) return;
    var W = ACH.world, p = G.player, cam = G.cam, V = ACH.render.VIEW;
    for (var tries = 0; tries < 60; tries++) {
      var c = Math.floor(Math.random() * W.COLS), r = 3 + Math.floor(Math.random() * (W.ROWS - 3));
      var rpk = W.respawnPick ? W.respawnPick(p, tries) : null; if (rpk) { c = rpk.c; r = rpk.r; }   // v0.13 T2 (C2): el Cerro prefiere por delante en la ruta
      var ch = W.tileAt(c, r);
      if (W.respawnOk ? !W.respawnOk(ch) : (ch !== 's' && ch !== 'a')) continue;   // v0.9: el Cerro dice dónde (rellanos, calle, quebrada)
      var x = c * W.T + 8, y = r * W.T + 8;
      if (dist(x, y, p.x, p.y) <= 200) continue;
      if (x > cam.x - 16 && x < cam.x + V.w + 16 && y > cam.y - 16 && y < cam.y + V.h + 32) continue;
      if (W.collideCircle(x, y, CFG.zRadius)) continue;
      var rt = Math.random() < CFG.cobradorChance ? 'cobrador' : 'caminante';
      if (W.lanes && W.lanes.length) { var rq = Math.random(); rt = rq < 0.25 ? 'senoraBalde' : rq < 0.45 ? 'senoraOlla' : 'caminante'; }   // en el Cerro: señoras y vecinos
      G.zombies.push(makeZombie(rt, x, y));
      return;
    }
  }

  // Gemidos sueltos: el juego sortea uno a la vez entre los zombies en pantalla que no persiguen (máx. 1 cada 0,7 s).
  function groan(G, dt) {
    G.groanT = (G.groanT === undefined ? 1 : G.groanT) - dt;
    if (G.groanT > 0) return;
    G.groanT = rand(0.7, 2.2);
    var cam = G.cam, V = ACH.render.VIEW, pick = null, n = 0;
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if (z.state === 'muerto' || z.state === 'golpeado' || z.social) continue;   // F7: los músicos no gimen
      if (z.x < cam.x || z.x > cam.x + V.w || z.y < cam.y || z.y > cam.y + V.h + 16) continue;
      if (Math.random() * ++n < 1) pick = z;   // muestreo uniforme
    }
    if (pick) sfx('zombie.idle', { x: pick.x, y: pick.y, type: pick.type });
  }

  function updateZombies(G, dt) {
    for (var i = 0; i < G.zombies.length; i++) { curZ = G.zombies[i]; try { updateZombie(G, curZ, dt); } finally { curZ = null; } }
    if (ACH.zvar) { inZvar = true; try { ACH.zvar.update(G, dt); } finally { inZvar = false; } }   // v0.11: el muletazo pasa aquí (zvarSrc)
    groan(G, dt);
    separate(G);
    // cadáveres: 10 s y se desvanecen
    for (var k = G.zombies.length - 1; k >= 0; k--) {
      var z = G.zombies[k];
      if (z.state === 'muerto' && z.deadT >= CFG.corpse) G.zombies.splice(k, 1);
    }
  }

  /* ---------------- Gallinazos y perros (decoración viva; no hacen daño) ---------------- */
  function makeNPCs(G) {
    var W = ACH.world, birds = [], dogs = [], i;
    var bs = W.birdSpawns();
    for (i = 0; i < bs.length; i++) {
      birds.push({ x: bs[i].x, y: bs[i].y, z: bs[i].z, px: bs[i].x, py: bs[i].y, pz: bs[i].z, pole: bs[i].pole,
        state: 'perch', vx: 0, vy: 0, t: 0, goneT: 0, anim: rand(0, 3), flip: false, look: 0 });
    }
    for (i = 0; i < W.dogSpawns.length; i++) {
      var d = W.dogSpawns[i];
      dogs.push({ x: d.x, y: d.y, zone: d.zone, state: 'idle', face: Math.random() < 0.5 ? 1 : -1, vx: 0, vy: 0,
        t: rand(0.5, 2), barkCD: 0, anim: rand(0, 3), moving: false });
    }
    G.npcs = { birds: birds, dogs: dogs };
  }

  function updateBirds(G, dt) {
    var p = G.player, V = ACH.render.VIEW, cam = G.cam, birds = G.npcs.birds, nFly = 0, fx = 0, fy = 0;
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i];
      b.anim += dt;
      if (b.state === 'perch') {
        if (dist(b.x, b.y, p.x, p.y) < CFG.gallScare) {
          // se espanta: sale volando hacia el lado contrario a Alexander, subiendo
          var ax = b.x - p.x, sgn = ax === 0 ? (Math.random() < 0.5 ? -1 : 1) : (ax < 0 ? -1 : 1);
          b.state = 'fly'; b.t = 0; b.vx = sgn * CFG.gallSpeed * rand(0.8, 1.1); b.vy = -CFG.gallSpeed * rand(0.2, 0.45);
          b.flip = sgn > 0; b.anim = 0;
          nFly++; fx += b.x; fy += b.y - b.z;
        }
      } else if (b.state === 'fly') {
        b.t += dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += (CFG.gallClimb + b.t * 12) * dt;
        var sx = b.x - cam.x, sy = b.y - b.z - cam.y;
        if (sx < -40 || sx > V.w + 40 || sy < -50 || sy > V.h + 60 || b.t > CFG.gallMaxFly) { b.state = 'gone'; b.goneT = 0; }
      } else { // 'gone': vuelve a posarse en su sitio cuando pasó un rato y nadie lo ve
        b.goneT += dt;
        if (b.goneT >= CFG.gallReturn && dist(b.px, b.py, p.x, p.y) > CFG.gallReturnDist) {
          b.state = 'perch'; b.x = b.px; b.y = b.py; b.z = b.pz; b.flip = false;
        }
      }
    }
    if (nFly) sfx('birds.fly', { x: fx / nFly, y: fy / nFly, n: nFly });
  }

  // ¿Algún zombie persiguiendo a menos de r del punto?
  function chaserNear(G, x, y, r) {
    for (var i = 0; i < G.zombies.length; i++) {
      var z = G.zombies[i];
      if ((z.state === 'perseguir' || z.state === 'atacar') && dist(x, y, z.x, z.y) < r) return true;
    }
    return false;
  }

  function updateDogs(G, dt) {
    var p = G.player, dogs = G.npcs.dogs, W = ACH.world;
    var alive = p.hp > 0;
    for (var i = 0; i < dogs.length; i++) {
      var d = dogs[i], z = d.zone;
      d.anim += dt; d.t -= dt;
      if (d.barkCD > 0) d.barkCD -= dt;
      var pd = dist(d.x, d.y, p.x, p.y);

      if (alive && d.state !== 'flee' && (pd < CFG.dogFleeDist || (d.wary && pd < CFG.dogWaryDist))) { // Alexander se les acerca (o el desconfiado lo ve venir): huyen por la vereda
        d.state = 'flee'; d.t = CFG.dogFleeT;
        // v0.4: las veredas van de oeste a este, así que huyen a lo largo de x
        var fy = d.y - p.y, fx = d.x - p.x;
        var sx = fx === 0 ? (Math.random() < 0.5 ? -1 : 1) : (fx < 0 ? -1 : 1);
        if (d.x + sx * 30 < z[0] || d.x + sx * 30 > z[2]) sx = -sx; // no se acorrala contra el borde de su zona
        d.vx = sx * CFG.dogFlee * 0.95; d.vy = (fy === 0 ? 0 : (fy < 0 ? -1 : 1)) * 0.3 * CFG.dogFlee;
        sfx('dog.whine', { x: d.x, y: d.y });
      } else if (alive && !d.wary && d.state !== 'flee' && d.state !== 'bark' && d.barkCD <= 0 &&
          ((p.running && pd < CFG.dogRunDist) || chaserNear(G, d.x, d.y, CFG.dogZombieDist))) {
        d.state = 'bark'; d.t = CFG.dogBarkT; d.barkCD = CFG.dogBarkCD; d.vx = 0; d.vy = 0;
        d.face = p.x < d.x ? -1 : 1; d.anim = 0;
        sfx('dog.bark', { x: d.x, y: d.y });
        emitNoise(G, d.x, d.y, CFG.dogBarkNoise);
      }

      if (d.state === 'bark') {
        d.moving = false;
        if (d.t <= 0) { d.state = 'idle'; d.t = rand(0.6, 1.5); }
      } else if (d.state === 'flee') {
        d.moving = true;
        if (d.vx) d.face = d.vx < 0 ? -1 : 1;
        if (d.t <= 0) { d.state = 'idle'; d.t = rand(0.6, 1.5); d.vx = 0; d.vy = 0; d.moving = false; }
      } else if (d.state === 'walk') {
        d.moving = true;
        if (d.t <= 0) { d.state = 'idle'; d.t = rand(1, 3); d.vx = 0; d.vy = 0; d.moving = false; }
      } else { // idle
        d.moving = false;
        if (d.t <= 0) {
          d.state = 'walk'; d.t = rand(1.5, 3.5);
          var a = Math.random() * Math.PI * 2;
          d.vx = Math.cos(a) * CFG.dogWalk; d.vy = Math.sin(a) * CFG.dogWalk * 0.5;
          // si está pegado al borde de su zona, camina hacia adentro
          if (d.y < z[1] + 8) d.vy = Math.abs(d.vy); else if (d.y > z[3] - 8) d.vy = -Math.abs(d.vy);
          if (d.x < z[0] + 6) d.vx = Math.abs(d.vx); else if (d.x > z[2] - 6) d.vx = -Math.abs(d.vx);
          if (d.vx) d.face = d.vx < 0 ? -1 : 1;
        }
      }

      if (d.moving) {
        var hit = W.moveCircle(d, d.vx * dt, d.vy * dt, CFG.dogRadius);
        if (d.x < z[0]) d.x = z[0]; else if (d.x > z[2]) d.x = z[2];
        if (d.y < z[1]) d.y = z[1]; else if (d.y > z[3]) d.y = z[3];
        if (hit && d.state === 'walk') d.t = Math.min(d.t, 0.1);
      }
    }
  }

  // v0.6: le pegaron (guitarrazo o piedra). Sin daño: chilla, huye 2 s y queda desconfiado (no ladra, se aleja de Alexander).
  function hitDog(G, d, fromX, fromY) {
    var z = d.zone, sx = d.x - fromX;
    sx = sx === 0 ? (Math.random() < 0.5 ? -1 : 1) : (sx < 0 ? -1 : 1);
    if (d.x + sx * 40 < z[0] || d.x + sx * 40 > z[2]) sx = -sx;
    var fy = d.y - fromY;
    d.state = 'flee'; d.t = CFG.dogHitFleeT; d.wary = true; d.anim = 0;
    d.vx = sx * CFG.dogFlee * 1.15; d.vy = (fy === 0 ? 0 : (fy < 0 ? -1 : 1)) * 0.3 * CFG.dogFlee;
    d.face = sx;
    sfx('dog.yelp', { x: d.x, y: d.y });
    say('dogHit', G.player.x, G.player.y);
  }

  function updateNPCs(G, dt) {
    if (!G.npcs) return;
    updateBirds(G, dt);
    updateDogs(G, dt);
  }

  function updateNoises(G, dt) {
    for (var i = G.noises.length - 1; i >= 0; i--) {
      G.noises[i].t += dt;
      if (G.noises[i].t > 0.6) G.noises.splice(i, 1);
    }
  }

  ACH.ent = {
    CFG: CFG, ZT: ZT, PHRASES: PHRASES, DIRV: DIRV,
    makePlayer: makePlayer, makeTitina: makeTitina, makeZombie: makeZombie,
    spawnInitial: spawnInitial, updatePlayer: updatePlayer, updateTitina: updateTitina,
    updateZombies: updateZombies, updateRespawn: updateRespawn, updateNoises: updateNoises,
    makeNPCs: makeNPCs, updateNPCs: updateNPCs,
    startSwing: startSwing, emitNoise: emitNoise, hurtPlayer: hurtPlayer, dirFromVec: dirFromVec,
    hitZombie: hitZombie, hitDog: hitDog, say: say, surfaceAt: surfaceAt,
    nightMul: nightMul, sightMul: sightMul, hearMul: hearMul, curWeapon: curWeapon,
    JUMP: JUMP, SLOPE: SLOPE, slopeMul: slopeMul, carrying: carrying,   // v0.9
    launchTitina: launchTitina   // Miraflores: la jefa la usa contra el enjambre
  };
  ACH.zbeh = ACH.zbeh || {};        // v0.9: senoras.js pone ACH.zbeh.senoraBalde / senoraOlla = {init, update, onHit}
  ACH.zstatus = ACH.zstatus || [];  // v0.9: fn(G, z, dt, want) — fuego.js (quemadura) y otros
})();
