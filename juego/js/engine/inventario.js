/* ACHORADO — inventario.js (v0.6): botín en el suelo, mochila de 12 casillas, barra rápida (1–4), uso de objetos e interfaz de inventario.
   API: ACH.inv = { add, has, take, count, drop, dropFor, groundItems, drawGround, update, isOpen, open, close, use, ... }.
   F1 llama a update(G, dt) en cada paso y a drawGround(ctx, camX, camY) después del suelo; si nadie llama a update, un rAF de respaldo lo hace.
   v0.8 (G2): bebidas con efecto (gaseosa = Inca Kola: aliento lleno + subidón p.boostT 25 s; colaInglesa: invisible p.invisT 10 s),
   comida que cura (v0.14: ya no cae mal; CFG.forceSick=null devuelve el sorteo de −8 vida y empacho), cuerdas que reparan la guitarra (ACH.armas.repairGuitar(15)),
   carretillas de comida con porciones: ACH.inv.cartAt(x, y, r) → carretilla con porciones o null · ACH.inv.takeFromCart(cart) → bool,
   y chips con la cuenta atrás de subidón / invisible / empacho debajo del HUD. Los tiempos los descuenta este archivo (si otro ya los
   descuenta, se da cuenta y no los descuenta dos veces).
   v0.9 (H3, Cerro): taper, agua (apaga si te quemas), botella, trapo, gasolina y molotov; ARMAR (F en la mochila) = botella + trapo +
   gasolina → molotov: ACH.inv.craft() → bool · ACH.inv.canCraft() → bool. ACH.inv.clearGround() vacía el botín del suelo (levelHook al
   cambiar de nivel; la mochila se conserva). assignQuick(n, id) público ya no alterna (fija). Chips MOJADO (p.wetT) y ¡TE QUEMAS! (p.burnT). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};

  var CFG = {
    slots: 12, quick: 4,
    pickR: 14, pickDelay: 0.3,          // radio de recogida (px) y demora desde que cae (s)
    life: 60, blinkAt: 8, fastBlinkAt: 3, // el botín desaparece a los 60 s y parpadea al final
    maxGround: 70,
    gravity: 300, bounceK: 0.45, drag: 3.2,
    textLife: 1.1, textRise: 12, mergeT: 0.9, fullCD: 2, useCD: 0.2,
    // v0.8
    boostT: 25, boostRegen: 2.5, boostRunCost: 0.6,   // subidón: regeneración ×2.5 y correr gasta 40 % menos
    invisT: 10, sickT: 4, sickHp: 8, sickWalk: 0.7,     // invisible 10 s; empacho: −8 vida, 4 s caminando al 70 % y sin correr
    colaLoot: 0.05, nightGaseosa: 0.15,                // Cola Inglesa: 5 % de botín; de noche, +15 % de gaseosa en cualquier zombie
    cartR: 18, cartMin: 2, cartMax: 4,                  // radio de E sobre la huella de la carretilla; porciones por carretilla
    forceSick: false                                    // v0.14: la comida YA NO cae mal ni quita vida (pedido del usuario). debug: true = siempre cae mal, null = sorteo como antes
  };

  /* ---------------- Datos de los ítems ---------------- */
  // stack: apilado · use: { hp, st, drink } si se consume · msg: lo que pasa si no se puede consumir · rare: dice una frase al recogerlo
  var DEFS = {
    piedras:      { name: 'PIEDRAS', unit: 'piedra', plural: 'piedras', stack: 40, fx: 'MUNICIÓN · RESORTERA',
      desc: 'De la berma, bien redondas. Para la resortera… o para hacerte el loco.', msg: 'Las piedras se tiran con la resortera, causa.', tint: '#9a96a2' },
    resortera:    { name: 'RESORTERA', unit: 'resortera', plural: 'resorteras', stack: 1, fx: 'ARMA · CLIC IZQUIERDO', rare: true,
      desc: 'Palo, jebe y mala intención. Clic izquierdo, mantén para tensar y suelta.', msg: 'Se usa con el clic izquierdo, no con la boca.', tint: '#8a5a2b' },
    panChicharron:{ name: 'PAN CON CHICHARRÓN', unit: 'pan con chicharrón', plural: 'panes con chicharrón', stack: 3, fx: '+30 VIDA',
      desc: 'Con camote y salsa criolla. Cura más que la posta médica… si el chicharrón es de esta semana.', use: { hp: 30, sick: 0.15 }, tint: '#d9a05b' },
    anticucho:    { name: 'ANTICUCHO', unit: 'anticucho', plural: 'anticuchos', stack: 5, fx: '+15 VIDA',
      desc: 'Corazoncito a la parrilla con su papita. ¿De res? Eso juró la señora. Nadie ha visto al gato desde el martes.', use: { hp: 15, sick: 0.25 }, tint: '#a2522f' },
    papaHuevo:    { name: 'PAPA CON HUEVO', unit: 'papa con huevo', plural: 'papas con huevo', stack: 5, fx: '+20 VIDA',
      desc: 'Papa sancochada, huevo duro y su ajicito. El huevo es de la semana pasada, pero bien sancochadito, ¿ya?', use: { hp: 20, sick: 0.20 }, tint: '#f2d27a' },
    chocloQueso:  { name: 'CHOCLO CON QUESO', unit: 'choclo con queso', plural: 'choclos con queso', stack: 5, fx: '+12 VIDA',
      desc: 'Choclo de grano gordo con su tajadita de queso fresco. Lo más sano de la Gambetta, que no es mucho decir.', use: { hp: 12, sick: 0.10 }, tint: '#f2d200' },
    emoliente:    { name: 'EMOLIENTE', unit: 'emoliente', plural: 'emolientes', stack: 3, fx: '+10 VIDA · ALIENTO LLENO',
      desc: 'Calientito, de la señora de la esquina. Con limón y todo.', use: { hp: 10, st: true, drink: true }, tint: '#c98a3a' },
    gaseosa:      { name: 'GASEOSA', unit: 'gaseosa', plural: 'gaseosas', stack: 5, fx: 'ALIENTO LLENO · SUBIDÓN 25 s',
      desc: 'La amarilla, bien helada (mentira). Aliento lleno y 25 s de subidón: corres sin cansarte y te recuperas al toque.', use: { st: true, drink: true, boost: 25 }, tint: '#ffe500' },
    colaInglesa:  { name: 'COLA INGLESA', unit: 'cola inglesa', plural: 'colas inglesas', stack: 3, fx: 'INVISIBLE 10 s', rare: true,
      desc: 'La roja de toda la vida. Un trago y los muertos ya no te ven ni te huelen… mientras no metas bulla ni les pegues.', use: { drink: true, invis: 10 }, tint: '#d8263a' },
    curitas:      { name: 'CURITAS', unit: 'curitas', plural: 'curitas', stack: 5, fx: '+20 VIDA',
      desc: 'Para los rasguños. Para los mordiscos también, pero con fe.', use: { hp: 20 }, tint: '#f0c9a0' },
    sencillo:     { name: 'SENCILLOS', unit: 'sencillo', plural: 'sencillos', stack: 999, fx: 'MONEDAS · PARA DESPUÉS', coin: true,
      desc: 'Monedas sueltas. Ni para el pasaje alcanza, pero algo es algo.', msg: 'Guárdalos: algún día habrá bodega abierta.', tint: '#ffe500' },
    cuerdas:      { name: 'CUERDAS', unit: 'cuerda', plural: 'cuerdas', stack: 10, fx: '+15 GUITARRA',
      desc: 'Cuerdas de guitarra. Un cantante sin cuerdas es solo un señor gritando. Le devuelven aguante a la viola (si no está rota).', use: { repair: 15 }, msg: 'Para el taller… cuando haya taller.', tint: '#d0d6dd' },
    llavesCombi:  { name: 'LLAVES DE COMBI', unit: 'llaves de combi', plural: 'llaves de combi', stack: 1, fx: 'OBJETO DE HISTORIA', rare: true,
      desc: '¿Y la combi, causa? Tengo las llaves, pero la combi se fue de paseo.', msg: '¿Y la combi, causa?', tint: '#ffe500' },
    // v0.9 (H3): El Cerro
    taper:        { name: 'TAPER', unit: 'táper', plural: 'tápers', stack: 3, fx: '+25 VIDA',
      desc: 'Arroz con pollo de ayer, en su táper de helado. Llena… si la refri todavía enfriaba.', use: { hp: 25, sick: 0.25 }, tint: '#e8e0c8' },
    agua:         { name: 'AGUA', unit: 'agua', plural: 'aguas', stack: 5, fx: '+20 ALIENTO · APAGA EL FUEGO',
      desc: 'Botella de agua del caño, hervida (dicen). Recupera aliento y, si te estás quemando, te la echas encima.', use: { st: 20, drink: true, douse: true }, tint: '#4aa8ff' },
    botella:      { name: 'BOTELLA', unit: 'botella', plural: 'botellas', stack: 6, fx: 'PARA ARMAR · MOLOTOV',
      desc: 'Botella de vidrio vacía. Con un trapo y gasolina se vuelve otra cosa.', msg: 'Vacía. Ármala con trapo y gasolina (F).', tint: '#3a8a4a' },
    trapo:        { name: 'TRAPO', unit: 'trapo', plural: 'trapos', stack: 6, fx: 'PARA ARMAR · MOLOTOV',
      desc: 'Un trapo de cocina con historia. Sirve de mecha.', msg: 'Es la mecha del molotov. Ármalo con botella y gasolina (F).', tint: '#d8c8a0' },
    gasolina:     { name: 'GASOLINA', unit: 'gasolina', plural: 'gasolinas', stack: 3, fx: 'PARA ARMAR · MOLOTOV',
      desc: 'Un culito de gasolina sacado del mototaxi. No se toma, causa.', msg: '¡No se toma! Ármala con botella y trapo (F).', tint: '#e0a020' },
    molotov:      { name: 'MOLOTOV', unit: 'molotov', plural: 'molotovs', stack: 5, fx: 'ARMA · R PARA ELEGIR · CLIC', rare: true,
      desc: 'Botella, trapo y gasolina. R cambia de resortera a molotov; mantén el clic para prender y estirar, suelta para tirar. Fuego 5 s.', msg: 'Se tira con el clic (R para elegirlo).', tint: '#ff8a30' },
    estampita:    { name: 'ESTAMPITA', unit: 'estampita', plural: 'estampitas', stack: 1, fx: 'OBJETO DE HISTORIA', rare: true,
      desc: 'Un santito de bolsillo. Te salva una vez de la muerte: te deja con 1 de vida.', msg: 'Que te cuide, causa. Rápido, que viene la mancha.', tint: '#4aa8ff' },
    // v0.11 (B): Uhu, materiales para armar, guante inflable (lo redefine inflables.js en Miraflores) y globos con agua
    uhu:          { name: 'UHU', unit: 'uhu', plural: 'uhus', stack: 5, fx: 'REPARA LA GUITARRA Y LO DE LA MANO', rare: true,
      desc: 'El chisguete amarillo que pega todo: guitarras, espadas, matrimonios. Arregla lo que tienes en la mano y hasta revive una viola rota.', use: { fn: useUhu }, tint: '#ffd400' },
    tablas:       { name: 'TABLAS', unit: 'tabla', plural: 'tablas', stack: 20, fx: 'PARA ARMAR · RECETARIO (L)',
      desc: 'De muebles, toldos y cajas rotas. Con clavos y fe se vuelven otra cosa.', msg: 'Son para armar, causa. Mira el recetario (L).', tint: '#b9783a' },
    chatarra:     { name: 'CHATARRA', unit: 'chatarra', plural: 'chatarras', stack: 20, fx: 'PARA ARMAR · RECETARIO (L)',
      desc: 'De autos, refris y teles. Fierro viejo que todavía sirve.', msg: 'Es para armar, causa. Mira el recetario (L).', tint: '#9aa0aa' },
    jebe:         { name: 'JEBE', unit: 'jebe', plural: 'jebes', stack: 20, fx: 'PARA ARMAR · RECETARIO (L)',
      desc: 'De llantas y bicis. Estira, aguanta y huele a taller.', msg: 'Es para armar, causa. Mira el recetario (L).', tint: '#3a3a42' },
    guanteInflable: { name: 'GUANTE DE BOX INFLABLE', unit: 'guante', plural: 'guantes', stack: 1, fx: 'EN LA MANO · USAR = AGARRAR', _soft: true,
      desc: '¡Uno-dos, uno-dos! Daño 0.45, rápido y empuja fuerte.', msg: 'Este guante se usa en Miraflores, causa.', tint: '#e8402c' },
    globosAgua:   { name: 'GLOBOS CON AGUA', unit: 'globo', plural: 'globos', stack: 6, fx: 'SE TIRA · R PARA ELEGIR · CLIC',
      desc: 'Carnaval todo el año. Moja a los muertos (quedan lentos 3 s) y dispersa las abejas. Desde la barra rápida sale volando al toque.', use: { fn: useGlobos }, tint: '#4aa8ff' }
  };

  function marcasReales() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }
  function defName(id) {
    var d = DEFS[id]; if (!d) return String(id);
    if (id === 'uhu') return marcasReales() ? 'UHU' : 'UJÚ';   // v0.11: el interruptor de marcas de siempre
    if (id === 'gaseosa') {   // el texto de marca sale de marcas.js
      var m = ACH.px && ACH.px.marca && ACH.px.marca('gaseosa_amarilla');
      var t = m && (m.texto || m.text);
      if (t) return String(t).toUpperCase();
    }
    if (id === 'colaInglesa') {   // v0.8: real «COLA INGLESA», parodia «COLA GRINGA» (marcas.js de G4); si falta, el literal
      var mc = null; try { mc = ACH.px && ACH.px.marca && ACH.px.marca('cola_inglesa'); } catch (e) { mc = null; }
      var tc = mc && (mc.texto || mc.text);
      if (tc) return String(tc).toUpperCase();
    }
    return d.name;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function getG() { return ACH.game && ACH.game.G; }
  function sfx(name, data) { var a = ACH.audio; if (a && a.emit) { try { a.emit(name, data); } catch (e) { /* el audio nunca rompe el juego */ } } }

  /* ---------------- Estado ---------------- */
  var bag = [], quick = [null, null, null, null];
  var ground = [], texts = [];
  var isOpenFlag = false, selIdx = 0, dirty = true, inited = false;
  var lastExt = 0, rafT = 0, fullT = 0, useT = 0, lastState = 'title', introPaused = false;
  var el = {}, slotEls = [], qHud = [], qOv = [];
  for (var bi = 0; bi < CFG.slots; bi++) bag.push(null);

  /* ---------------- Mochila ---------------- */
  function count(id) { var n = 0; for (var i = 0; i < bag.length; i++) if (bag[i] && bag[i].id === id) n += bag[i].n; return n; }
  function has(id, n) { return count(id) >= (n === undefined ? 1 : n); }
  function quickIndex(id) { return quick.indexOf(id); }

  function add(id, n) {
    var d = DEFS[id]; n = Math.floor(n === undefined ? 1 : n);
    if (n <= 0) return 0;
    if (!d) return n;
    var before = count(id), i, k;
    for (i = 0; i < bag.length && n > 0; i++) {
      if (bag[i] && bag[i].id === id && bag[i].n < d.stack) { k = Math.min(d.stack - bag[i].n, n); bag[i].n += k; n -= k; }
    }
    for (i = 0; i < bag.length && n > 0; i++) {
      if (!bag[i]) { k = Math.min(d.stack, n); bag[i] = { id: id, n: k }; n -= k; }
    }
    if (count(id) > before) {
      dirty = true;
      if (before === 0 && d.use && quickIndex(id) < 0) {   // el primer consumible nuevo se asigna solo a la primera casilla rápida libre
        var f = quick.indexOf(null); if (f >= 0) quick[f] = id;
      }
    }
    return n;
  }
  function take(id, n) {
    n = Math.floor(n === undefined ? 1 : n);
    if (n <= 0) return true;
    if (count(id) < n) return false;
    for (var i = bag.length - 1; i >= 0 && n > 0; i--) {
      if (bag[i] && bag[i].id === id) { var k = Math.min(bag[i].n, n); bag[i].n -= k; n -= k; if (bag[i].n <= 0) bag[i] = null; }
    }
    dirty = true;
    return true;
  }
  function reset() {
    introPaused = false;
    for (var i = 0; i < bag.length; i++) bag[i] = null;
    quick = [null, null, null, null]; ground.length = 0; clearTexts(); selIdx = 0; dirty = true; dbag = null;
    if (isOpenFlag) close(true);
    carts.length = 0; cartsBuilt = false;   // v0.8: carretillas llenas otra vez
    placeHidden();                          // v0.8: neveras escondidas con Cola Inglesa
    var G = getG(), p = G && G.player;
    if (p) { p.boostT = 0; p.invisT = 0; p.sickT = 0; }
    mine = {}; prev = null;
    clearPropFlags(); recIcons = {};
  }

  /* ---------------- Íconos (reales de F3 o de relleno) ---------------- */
  var phCache = {}, bigCache = {};
  function blk(g, x, y, w, h, c) { g.fillStyle = '#131015'; g.fillRect(x - 1, y - 1, w + 2, h + 2); g.fillStyle = c; g.fillRect(x, y, w, h); }
  function fr(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  var PH = {
    piedras: function (g) { blk(g, 1, 6, 5, 4, '#9a96a2'); blk(g, 6, 4, 5, 5, '#7d7a86'); blk(g, 4, 8, 4, 3, '#b4b0bc'); },
    resortera: function (g) { blk(g, 5, 6, 2, 5, '#8a5a2b'); blk(g, 2, 1, 2, 6, '#8a5a2b'); blk(g, 8, 1, 2, 6, '#8a5a2b'); fr(g, 3, 3, 6, 1, '#ff2e88'); },
    panChicharron: function (g) { blk(g, 1, 4, 10, 6, '#d9a05b'); fr(g, 2, 6, 8, 2, '#7a3b24'); fr(g, 3, 5, 3, 1, '#ff2e88'); fr(g, 2, 4, 8, 1, '#f0c07a'); },
    anticucho: function (g) { blk(g, 0, 5, 12, 1, '#c9a26b'); blk(g, 2, 3, 3, 5, '#7a3b24'); blk(g, 5, 3, 3, 5, '#a2522f'); blk(g, 8, 3, 3, 5, '#7a3b24'); fr(g, 3, 9, 3, 2, '#ffe500'); },
    emoliente: function (g) { blk(g, 3, 4, 6, 7, '#f2f2f2'); fr(g, 4, 6, 4, 4, '#c98a3a'); fr(g, 5, 0, 1, 3, '#d6ffe8'); fr(g, 7, 1, 1, 2, '#d6ffe8'); },
    gaseosa: function (g) { blk(g, 4, 4, 4, 7, '#ffe500'); blk(g, 5, 1, 2, 3, '#ffe500'); fr(g, 4, 7, 4, 2, '#e0262a'); fr(g, 5, 0, 2, 1, '#1fe07a'); },
    curitas: function (g) { blk(g, 1, 4, 10, 4, '#f0c9a0'); fr(g, 4, 5, 4, 2, '#ffffff'); fr(g, 2, 5, 1, 1, '#c98a6a'); fr(g, 9, 6, 1, 1, '#c98a6a'); },
    sencillo: function (g) { blk(g, 2, 2, 8, 8, '#ffe500'); fr(g, 3, 3, 6, 6, '#e0b800'); fr(g, 5, 4, 2, 4, '#ffe500'); g.clearRect(1, 1, 1, 1); g.clearRect(10, 1, 1, 1); g.clearRect(1, 10, 1, 1); g.clearRect(10, 10, 1, 1); },
    cuerdas: function (g) { fr(g, 1, 2, 10, 1, '#131015'); fr(g, 1, 3, 10, 1, '#d0d6dd'); fr(g, 1, 5, 10, 1, '#131015'); fr(g, 1, 6, 10, 1, '#b4bcc6'); blk(g, 0, 8, 4, 3, '#8a5a2b'); fr(g, 5, 9, 6, 1, '#d0d6dd'); },
    llavesCombi: function (g) { blk(g, 1, 3, 5, 5, '#ffe500'); fr(g, 3, 5, 1, 1, '#131015'); blk(g, 6, 5, 5, 2, '#ffe500'); fr(g, 9, 7, 1, 2, '#ffe500'); fr(g, 7, 8, 1, 2, '#ffe500'); },
    colaInglesa: function (g) { blk(g, 4, 4, 4, 7, '#d8263a'); blk(g, 5, 1, 2, 3, '#d8263a'); fr(g, 4, 6, 4, 2, '#f2f2f2'); fr(g, 5, 0, 2, 1, '#ffe500'); fr(g, 5, 5, 1, 4, '#ff8a8a'); },
    papaHuevo: function (g) { blk(g, 0, 7, 12, 3, '#f2f2f2'); blk(g, 1, 4, 5, 4, '#e8c86a'); blk(g, 6, 4, 5, 4, '#f6f2e6'); fr(g, 8, 5, 2, 2, '#ffd23a'); fr(g, 2, 6, 4, 1, '#ffb000'); },
    chocloQueso: function (g) { blk(g, 1, 2, 5, 9, '#f2d200'); fr(g, 2, 3, 1, 7, '#d8b400'); fr(g, 4, 3, 1, 7, '#d8b400'); blk(g, 1, 0, 2, 2, '#6a9a3a'); blk(g, 7, 6, 4, 4, '#f6f2e0'); },
    taper: function (g) { blk(g, 1, 4, 10, 6, '#e8e0c8'); fr(g, 1, 3, 10, 2, '#4aa8ff'); fr(g, 3, 6, 6, 3, '#f2d27a'); fr(g, 4, 7, 2, 1, '#d9a05b'); },
    agua: function (g) { blk(g, 4, 3, 4, 8, '#9fd4f0'); blk(g, 5, 1, 2, 2, '#4aa8ff'); fr(g, 4, 6, 4, 4, '#4aa8ff'); fr(g, 5, 4, 1, 2, '#ffffff'); },
    botella: function (g) { blk(g, 4, 4, 4, 7, '#3a8a4a'); blk(g, 5, 1, 2, 3, '#3a8a4a'); fr(g, 5, 5, 1, 4, '#8ad09a'); },
    trapo: function (g) { blk(g, 2, 3, 8, 7, '#d8c8a0'); fr(g, 2, 5, 8, 1, '#d8263a'); fr(g, 2, 8, 8, 1, '#d8263a'); fr(g, 9, 9, 2, 2, '#b8a880'); },
    gasolina: function (g) { blk(g, 2, 3, 8, 8, '#d8263a'); blk(g, 7, 1, 2, 2, '#131015'); fr(g, 3, 5, 6, 2, '#e0a020'); fr(g, 3, 9, 6, 1, '#a01a28'); },
    molotov: function (g) { blk(g, 4, 5, 4, 6, '#3a8a4a'); blk(g, 5, 3, 2, 2, '#3a8a4a'); fr(g, 5, 1, 2, 2, '#d8c8a0'); fr(g, 5, 0, 1, 1, '#ffb040'); fr(g, 4, 8, 4, 2, '#e0a020'); },
    estampita: function (g) { blk(g, 2, 1, 8, 10, '#f2e8c8'); fr(g, 3, 2, 6, 8, '#ff2e88'); fr(g, 5, 3, 2, 1, '#ffe500'); fr(g, 4, 5, 4, 4, '#4aa8ff'); },
    // v0.11 (provisorios hasta items-v011.js): tubo amarillo con tapa negra y culo plateado
    uhu: function (g) { blk(g, 1, 4, 8, 5, '#ffd400'); fr(g, 2, 6, 6, 1, '#131015'); fr(g, 1, 8, 8, 1, '#d8263a'); blk(g, 9, 5, 1, 3, '#2a2a30'); fr(g, 10, 6, 2, 1, '#2a2a30'); blk(g, 0, 4, 1, 5, '#c8ccd4'); },
    tablas: function (g) { blk(g, 1, 3, 10, 2, '#b9783a'); blk(g, 0, 6, 11, 2, '#8a4b1d'); blk(g, 2, 9, 9, 2, '#b9783a'); fr(g, 3, 3, 1, 1, '#5a3314'); fr(g, 8, 6, 1, 1, '#3a2010'); },
    chatarra: function (g) { blk(g, 1, 6, 6, 4, '#9aa0aa'); blk(g, 6, 3, 5, 4, '#7a808a'); fr(g, 2, 7, 2, 1, '#c8ccd4'); blk(g, 4, 2, 1, 4, '#b84a2a'); },
    jebe: function (g) { blk(g, 2, 2, 8, 8, '#2a2a30'); fr(g, 4, 4, 4, 4, '#131015'); fr(g, 3, 3, 2, 1, '#5a5a66'); fr(g, 8, 8, 1, 1, '#5a5a66'); },
    guanteInflable: function (g) { blk(g, 2, 1, 7, 7, '#e8402c'); blk(g, 8, 3, 3, 3, '#e8402c'); blk(g, 3, 8, 5, 3, '#f3efe2'); fr(g, 3, 2, 2, 1, '#ff9a8a'); },
    globosAgua: function (g) { blk(g, 1, 3, 4, 5, '#4aa8ff'); blk(g, 6, 1, 4, 5, '#ff2e88'); blk(g, 5, 6, 4, 4, '#1fe07a'); fr(g, 2, 4, 1, 1, '#bfe8ff'); fr(g, 7, 2, 1, 1, '#ffc0e0'); }
  };
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function placeholder(id, big) {
    var cache = big ? bigCache : phCache, c = cache[id];
    if (c) return c;
    c = mkCanvas(big ? 24 : 12, big ? 24 : 12);
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (big) g.scale(2, 2);
    (PH[id] || function (q) { blk(q, 2, 2, 8, 8, '#ff2e88'); })(g);
    cache[id] = c;
    return c;
  }
  function realIcon(id) { var s = ACH.sprites && ACH.sprites.items && ACH.sprites.items[id]; return s && s.width ? s : null; }
  function icon(id) { return realIcon(id) || placeholder(id, false); }
  var scaledCache = {};
  function iconBig(id) {
    var s = realIcon(id);
    if (!s) return placeholder(id, true);
    if (s.big && s.big.width) return s.big;
    var c = scaledCache[id];
    if (!c || c.src !== s) {
      var cv = mkCanvas(s.width * 2, s.height * 2), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(s, 0, 0, cv.width, cv.height); c = scaledCache[id] = { src: s, cv: cv };
    }
    return c.cv;
  }
  function paint(cv, src, alpha) {
    var g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    if (!src) return;
    g.globalAlpha = alpha === undefined ? 1 : alpha;
    var w = Math.min(src.width, cv.width), h = Math.min(src.height, cv.height);
    g.drawImage(src, Math.round((cv.width - w) / 2), Math.round((cv.height - h) / 2), w, h);
    g.globalAlpha = 1;
  }

  /* ---------------- Texto flotante (DOM, sobre todo lo demás) ---------------- */
  function floatText(x, y, str, cls, key, got) {
    var host = el.ftx; if (!host) return;
    var i, f;
    if (key) {
      for (i = 0; i < texts.length; i++) {
        f = texts[i];
        if (f.key === key && f.t < CFG.mergeT) { f.got += got; f.str = f.fmt(f.got); f.el.textContent = f.str; f.t = 0.12; f.x = x; f.y = y; return; }
      }
    }
    f = { x: x, y: y, t: 0, str: str, key: key, got: got || 0, fmt: null, el: document.createElement('div') };
    f.el.className = 'ft ' + (cls || ''); f.el.textContent = str;
    host.appendChild(f.el);
    texts.push(f);
    while (texts.length > 5) { var o = texts.shift(); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); }
    return f;
  }
  function pickText(id, n) {
    var d = DEFS[id], fmt = function (k) { return '+' + k + ' ' + (k === 1 ? d.unit : d.plural); };
    var G = getG(), p = G && G.player; if (!p) return;
    var f = floatText(p.x, p.y - 20, fmt(n), d.coin ? 'coin' : (d.rare ? 'rare' : ''), 'pk:' + id, n);
    if (f && !f.fmt) f.fmt = fmt;
  }
  function clearTexts() { while (texts.length) { var o = texts.pop(); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); } }
  function placeTexts(G) {
    if (!texts.length || !el.stage) return;
    var u = el.stage.clientWidth / ((ACH.render && ACH.render.VIEW.w) || 480) || 2;
    var cx = Math.round(G.cam.x) + (G.shakeX || 0), cy = Math.round(G.cam.y) + (G.shakeY || 0);
    for (var i = 0; i < texts.length; i++) {
      var f = texts[i], k = f.t / CFG.textLife, a = k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4);
      var pop = f.t < 0.12 ? 1 + (1 - f.t / 0.12) * 0.35 : 1;
      f.el.style.left = Math.round((f.x - cx) * u) + 'px';
      f.el.style.top = Math.round((f.y - cy - CFG.textRise * Math.min(1, k * 1.4)) * u) + 'px';
      f.el.style.opacity = a;
      f.el.style.transform = 'translate(-50%, -100%) scale(' + pop + ')';
    }
  }

  /* ---------------- Botín en el suelo ---------------- */
  function spawnGround(id, n, x, y, ang, speed, perm) {
    if (!DEFS[id] || n <= 0) return;
    var g = { id: id, n: n, x: x, y: y, z: speed ? 3 : 0, vz: speed ? rnd(95, 150) : 0, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed * 0.6,
      t: 0, phase: rnd(0, 6.28), bounces: 0, full: 0, perm: !!perm };
    ground.push(g);
    while (ground.length > CFG.maxGround) { var k = 0; while (k < ground.length - 1 && ground[k].perm) k++; ground.splice(k, 1); }
  }
  // v0.8: Cola Inglesa escondida al fondo de los pasajes (ACH.world.hiddenLoot: {id, x, y, p}); no se desvanece.
  function placeHidden() {
    var L = ACH.world && ACH.world.hiddenLoot; if (!L) return;
    for (var i = 0; i < L.length; i++) if (Math.random() < (L[i].p === undefined ? 1 : L[i].p)) spawnGround(L[i].id, 1, L[i].x, L[i].y, 0, 0, true);
  }
  // v0.13 (A2): cada comida o curación del botín se queda con probabilidad ACH.dif.foodMul() (1 / 1 / 0.6)
  function isFood(id) { var d = DEFS[id]; return !!(d && d.use && d.use.hp > 0); }
  function foodFilter(items) {
    var D = ACH.dif, m = 1;
    if (D && typeof D.foodMul === 'function') { try { m = +D.foodMul(); } catch (e) { m = 1; } }
    if (!(m >= 0) || m >= 1) return items;
    return items.filter(function (it) { return !it || !isFood(it.id) || Math.random() < m; });
  }

  /* ---------------- v0.13 (A2): la bolsa que se cae al morir ---------------- */
  // Una sola bolsa por nivel: {x, y, items:[{id, n}], t}. La pone ACH.dif.onDeath; al pasar encima se recoge sola.
  var dbag = null, BAG_R = 14;
  function setDeathBag(x, y, items) {
    var L = []; (items || []).forEach(function (it) { if (it && DEFS[it.id] && it.n > 0) L.push({ id: it.id, n: Math.floor(it.n) }); });
    dbag = L.length ? { x: x, y: y, items: L, t: 0 } : null;
    return !!dbag;
  }
  function deathBag() { return dbag ? { x: dbag.x, y: dbag.y, items: dbag.items.map(function (it) { return { id: it.id, n: it.n }; }) } : null; }
  function clearDeathBag() { dbag = null; }
  function stepBag(G, dt, p) {
    if (!dbag) return;
    dbag.t += dt;
    if (!p || p.hp <= 0 || (p.z || 0) > 7 || G.state !== 'playing') return;
    var dx = dbag.x - p.x, dy = dbag.y - p.y;
    if (dx * dx + dy * dy > BAG_R * BAG_R) return;
    var keep = [], got = 0;
    for (var i = 0; i < dbag.items.length; i++) {
      var it = dbag.items[i], left = add(it.id, it.n);
      got += it.n - left;
      if (left > 0) keep.push({ id: it.id, n: left });
    }
    if (!keep.length) {
      dbag = null;
      if (ACH.hud && ACH.hud.toast) ACH.hud.toast('¡Tu bolsa, causa! Todo de vuelta.');
      sfx('loot.coins', { x: p.x, y: p.y }); sfx('loot.pickup', { x: p.x, y: p.y });
      floatText(p.x, p.y - 22, '¡LA BOLSA!', 'heal');
    } else {
      dbag.items = keep;
      if (got > 0) sfx('loot.pickup', { x: p.x, y: p.y });
      if (fullT <= 0) { fullT = CFG.fullCD; if (ACH.hud && ACH.hud.toast) ACH.hud.toast('¡Ya no entra nada, causa! Lo demás sigue en la bolsa.'); sfx('bag.full', { x: p.x, y: p.y }); }
    }
  }
  var bagSpr = null;
  function bagSprite() {   // costalito de yute amarrado, 12×12
    if (bagSpr) return bagSpr;
    var c = mkCanvas(12, 12), g = c.getContext('2d');
    blk(g, 2, 4, 8, 7, '#b98a4e'); fr(g, 3, 5, 6, 5, '#d4a866'); fr(g, 3, 9, 6, 1, '#9a6e38');
    blk(g, 4, 1, 4, 2, '#b98a4e'); fr(g, 3, 3, 6, 1, '#ff2e88');   // el nudo y la pita rosada
    fr(g, 5, 6, 2, 2, '#ffe500');                                  // la monedita que asoma
    bagSpr = c; return c;
  }
  function drawBag(ctx, camX, camY) {
    if (!dbag) return;
    var VW = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    var sx = Math.round(dbag.x - camX), sy = Math.round(dbag.y - camY);
    if (sx < -24 || sx > VW.w + 24 || sy < -24 || sy > VW.h + 24) return;
    var t = dbag.t, pul = 0.5 + 0.5 * Math.sin(t * 4.2), s = bagSprite(), bob = Math.sin(t * 3) > 0.3 ? 1 : 0;
    // brillo pulsante en el piso
    ctx.globalAlpha = 0.18 + 0.22 * pul; ctx.fillStyle = '#ffe500';
    ctx.fillRect(sx - 8, sy - 2, 16, 4); ctx.fillRect(sx - 6, sy - 3, 12, 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx - 4, sy - 1, 8, 2);
    ctx.drawImage(s, sx - 6, sy - 11 - bob);
    // chispas que giran
    ctx.globalAlpha = 0.5 + 0.5 * pul; ctx.fillStyle = '#ffffff';
    var q = t * 2.4;
    ctx.fillRect(Math.round(sx + Math.cos(q) * 9), Math.round(sy - 6 + Math.sin(q) * 5), 1, 1);
    ctx.fillStyle = '#ffe500';
    ctx.fillRect(Math.round(sx + Math.cos(q + 3.14) * 9), Math.round(sy - 6 + Math.sin(q + 3.14) * 5), 1, 1);
    ctx.globalAlpha = 1;
  }

  function nightOn() { var N = ACH.noche; return !!(N && N.t > 0.5); }
  // Suelta objetos en (x, y): salen rebotando y se esparcen un poco.
  function drop(x, y, items, fromZombie) {
    if (!items || !items.length) return;
    items = foodFilter(items);   // v0.13 (A2): Bravazo, menos comida en el botín
    if (!items.length) return;
    if (fromZombie && Math.random() < 0.15 && isTailoyAt(x, y)) items = items.concat([{ id: 'uhu', n: 1 }]);   // v0.11: Tai Loy también suelta Uhu (15 %)
    if (!fromZombie) {   // v0.8: botín de props (neveras de quiosco, triciclo, guantera): de noche hay más gaseosa y a veces una Cola Inglesa
      var gas = null; for (var q = 0; q < items.length; q++) if (items[q] && items[q].id === 'gaseosa') gas = items[q];
      if (gas && nightOn()) gas.n = (gas.n === undefined ? 1 : gas.n) + 1;
      if (gas && Math.random() < 0.12) items = items.concat([{ id: 'colaInglesa', n: 1 }]);
    }
    var base = rnd(0, 6.28), m = items.length;
    for (var i = 0; i < m; i++) {
      var it = items[i]; if (!it) continue;
      var a = base + i * (6.2832 / m) + rnd(-0.4, 0.4), sp = m === 1 ? rnd(10, 26) : rnd(26, 52);
      spawnGround(it.id, it.n === undefined ? 1 : it.n, x, y, a, sp);
    }
    var coins = false; for (var j = 0; j < items.length; j++) if (items[j] && items[j].id === 'sencillo') coins = true;
    sfx(coins ? 'loot.coins' : 'loot.drop', { x: x, y: y });
  }
  function isTailoyAt(x, y) {   // el trabajador de Tai Loy que acaba de caer (trabajadores.js suelta en z.x, z.y)
    var G = getG(), Z = G && G.zombies; if (!Z) return false;
    for (var i = 0; i < Z.length; i++) if (Z[i] && Z[i].trab && Z[i].brand === 'tailoy' && Z[i].x === x && Z[i].y === y) return true;
    return false;
  }
  function owned(id) {
    if (has(id)) return true;
    for (var i = 0; i < ground.length; i++) if (ground[i].id === id) return true;
    return false;
  }
  // Tablas de botín por tipo de zombie (SPEC v0.6). Devuelve lo que soltó.
  function roll(z) {
    var out = [], r = Math.random(), t = z.type;
    if (/^senora/.test(t || '') || z.noLoot) return out;   // v0.9: senoraBalde / senoraOlla: lo suelta senoras.js (H2)
    if (z.sling) { out.push({ id: 'resortera', n: 1 }, { id: 'piedras', n: 10 }); return out; }
    if (t === 'caminante') {
      if (r < 0.60) out.push({ id: 'sencillo', n: irnd(1, 4) }); else if (r < 0.90) out.push({ id: 'piedras', n: irnd(1, 3) }); else out.push({ id: 'anticucho', n: 1 });
    } else if (t === 'escolar') {
      if (r < 0.60) out.push({ id: 'piedras', n: irnd(2, 5) }); else if (r < 0.80) out.push({ id: 'gaseosa', n: 1 }); else if (r < 0.95) out.push({ id: 'curitas', n: 1 });
    } else if (t === 'ciego') {
      if (Math.random() < 0.7) out.push({ id: 'sencillo', n: irnd(1, 3) });
      if (Math.random() < 0.4) out.push({ id: 'cuerdas', n: irnd(1, 2) });
    } else if (t === 'cobrador') {
      out.push({ id: 'sencillo', n: irnd(5, 15) });
      if (Math.random() < 0.10 && !owned('llavesCombi')) out.push({ id: 'llavesCombi', n: 1 });
    }
    if (z.loco === 'carretilla' || z.lootCart) {   // carretilla de mercado: se suma a la tabla del tipo
      if (Math.random() < 0.60) out.push({ id: Math.random() < 0.5 ? 'panChicharron' : 'anticucho', n: irnd(1, 2) });
      if (Math.random() < 0.40) out.push({ id: 'gaseosa', n: 1 });
      if (Math.random() < 0.25) out.push({ id: 'sencillo', n: irnd(3, 8) });
      if (Math.random() < 0.40) out.push({ id: 'tablas', n: 1 });   // v0.11: la carretilla de madera se parte
    } else if ((z.loco === 'bici' || z.loco === 'skate') && Math.random() < 0.30) {   // repartidores sobre ruedas
      out.push({ id: 'sencillo', n: irnd(1, 3) });
    }
    if (z.loco === 'bici' && Math.random() < 0.30) out.push({ id: 'jebe', n: 1 });   // v0.11: la cámara de la bici
    // v0.8: de noche la Inca Kola es más común; la Cola Inglesa es rara (5 %)
    if (nightOn() && Math.random() < CFG.nightGaseosa && !out.some(function (o) { return o.id === 'gaseosa'; })) out.push({ id: 'gaseosa', n: 1 });
    if (Math.random() < CFG.colaLoot) out.push({ id: 'colaInglesa', n: 1 });
    return out;
  }
  function dropFor(z) {
    if (!z) return [];
    var items = roll(z);
    if (items.length) drop(z.x, z.y, items, true);
    return items;
  }
  function groundItems() { return ground.map(function (g) { return { id: g.id, n: g.n, x: g.x, y: g.y, z: g.z, t: g.t }; }); }

  /* ---------------- Recoger ---------------- */
  function notice(str, cls) {
    var G = getG(), p = G && G.player;
    if (isOpenFlag && el.msg) { el.msg.textContent = str; el.msg.classList.remove('flash'); void el.msg.offsetWidth; el.msg.classList.add('flash'); }
    else if (p) floatText(p.x, p.y - 22, str, cls || 'dim');
  }
  function tryPickup(g, G) {
    if (g.id === 'resortera' && has('resortera')) { g.id = 'piedras'; g.n = 5; }   // QA v0.6: la segunda resortera no ocupa casilla: se vuelve «+5 piedras»
    var left = add(g.id, g.n), got = g.n - left, p = G.player;
    if (got > 0) {
      g.n = left;
      pickText(g.id, got);
      sfx(DEFS[g.id].coin ? 'loot.coins' : 'loot.pickup', { x: g.x, y: g.y });
      if (DEFS[g.id].rare && ACH.audio && ACH.audio.say) { try { ACH.audio.say('loot', { who: 'alex', x: p.x, y: p.y }); } catch (e) { /* sin voz */ } }
    }
    if (left > 0 && g.full <= 0) {
      g.full = CFG.fullCD;
      if (fullT <= 0) {
        fullT = CFG.fullCD;
        if (ACH.hud && ACH.hud.toast) ACH.hud.toast('¡Ya no entra nada, causa!');
        sfx('bag.full', { x: p.x, y: p.y });
      }
    }
    return left === 0;
  }

  function step(G, dt) {
    var i, g, p = G.player, W = ACH.world, R2 = CFG.pickR * CFG.pickR;
    if (fullT > 0) fullT -= dt;
    if (p) effects(G, p, dt);
    stepBag(G, dt, p);   // v0.13 (A2)
    for (i = 0; i < carts.length; i++) if (carts[i].flashT > 0) carts[i].flashT -= dt;
    for (i = ground.length - 1; i >= 0; i--) {
      g = ground[i];
      g.t += dt; if (g.full > 0) g.full -= dt;
      if (g.perm) g.t = Math.min(g.t, 1); else if (g.t >= CFG.life) { ground.splice(i, 1); continue; }
      if (g.z > 0 || g.vz > 0) {
        g.vz -= CFG.gravity * dt; g.z += g.vz * dt;
        if (g.z <= 0) {
          g.z = 0;
          if (g.vz < -30) { g.vz = -g.vz * CFG.bounceK; g.bounces++; g.vx *= 0.6; g.vy *= 0.6; } else g.vz = 0;
        }
      }
      if (g.vx || g.vy) {
        var nx = g.x + g.vx * dt, ny = g.y + g.vy * dt;
        if (W && W.collideCircle) {
          if (W.collideCircle(nx, g.y, 2)) { g.vx = 0; nx = g.x; }
          if (W.collideCircle(nx, ny, 2)) { g.vy = 0; ny = g.y; }
        }
        g.x = nx; g.y = ny;
        var k = Math.exp(-CFG.drag * dt * (g.z > 0 ? 0.35 : 1));
        g.vx *= k; g.vy *= k;
        if (Math.abs(g.vx) < 1 && Math.abs(g.vy) < 1) { g.vx = 0; g.vy = 0; }
      }
      if (g.t >= CFG.pickDelay && p && p.hp > 0 && g.z < 7) {
        var dx = g.x - p.x, dy = g.y - p.y;
        if (dx * dx + dy * dy <= R2 && tryPickup(g, G)) ground.splice(i, 1);
      }
    }
    for (i = texts.length - 1; i >= 0; i--) {
      texts[i].t += dt;
      if (texts[i].t >= CFG.textLife) { var e = texts[i].el; if (e.parentNode) e.parentNode.removeChild(e); texts.splice(i, 1); }
    }
  }
  function update(G, dt) {
    lastExt = performance.now();
    G = G || getG(); if (!G) return;
    if (!inited) init();
    if (isOpenFlag) return;   // la mochila abierta congela el botín
    step(G, dt);
  }
  function fallbackLoop(now) {
    requestAnimationFrame(fallbackLoop);
    var dt = rafT ? Math.min(0.1, (now - rafT) / 1000) : 0; rafT = now;
    var G = getG(); if (!G || !G.player) return;
    if (performance.now() - lastExt < 400) return;   // F1 ya nos llama
    if (G.state === 'playing' && !isOpenFlag) step(G, dt);
  }

  /* ---------------- Dibujo del botín ---------------- */
  var PHASEMOD = 1.7;
  function drawGround(ctx, camX, camY) {
    drawBag(ctx, camX, camY);   // v0.13 (A2): la bolsa de la muerte, debajo del botín
    if (!ground.length) return;
    var i, g, s, w, h, sx, sy, vis, rem, lift, shA, VW = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    for (i = 0; i < ground.length; i++) {
      g = ground[i];
      rem = CFG.life - g.t;
      if (rem < CFG.blinkAt) { vis = Math.floor(g.t * (rem < CFG.fastBlinkAt ? 11 : 5)) % 2 === 0; if (!vis) continue; }
      sx = Math.round(g.x - camX); sy = Math.round(g.y - camY);
      if (sx < -16 || sx > VW.w + 16 || sy < -16 || sy > VW.h + 20) continue;
      // sombra (se achica y aclara mientras sube)
      shA = 0.38 * Math.max(0.35, 1 - g.z / 40);
      ctx.fillStyle = 'rgba(0,0,0,' + shA.toFixed(2) + ')';
      var sw = g.z > 14 ? 2 : 3;
      ctx.fillRect(sx - sw, sy - 1, sw * 2, 3); ctx.fillRect(sx - sw - 1, sy, sw * 2 + 2, 1);
      s = icon(g.id); w = s.width; h = s.height;
      lift = g.z + (g.z === 0 ? (Math.sin(g.t * 3.4 + g.phase) > 0.2 ? 2 : 1) : 0);
      var ix = Math.round(sx - w / 2), iy = Math.round(sy - h + 1 - lift);
      ctx.drawImage(s, ix, iy);
      // destello: una cruz blanca que aparece de vez en cuando en una esquina del ícono
      var gp = (g.t * 0.9 + g.phase * 0.23) % PHASEMOD;
      if (g.z === 0 && gp < 0.2) {
        var gx = ix + w - 3, gy = iy + 2, a = gp < 0.1 ? 1 : 0.5;
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3);
        ctx.globalAlpha = 1;
      }
      if (DEFS[g.id].rare && g.z === 0) {   // los objetos raros brillan con chispas amarillas
        var q = g.t * 2.6 + g.phase;
        ctx.fillStyle = '#ffe500';
        ctx.fillRect(Math.round(sx + Math.cos(q) * 8), Math.round(iy + h / 2 + Math.sin(q) * 6), 1, 1);
        ctx.fillRect(Math.round(sx + Math.cos(q + 3.14) * 8), Math.round(iy + h / 2 + Math.sin(q + 3.14) * 6), 1, 1);
      }
    }
  }

  /* ---------------- Usar objetos ---------------- */
  function use(id) {
    var d = DEFS[id], G = getG(), p = G && G.player;
    if (!d || !p || !has(id)) return false;
    if (!d.use) { notice(d.msg || 'No se usa así, causa.'); return false; }
    var C = ACH.ent && ACH.ent.CFG || { hpMax: 100, staminaMax: 100 }, u = d.use;
    var now = performance.now() / 1000;
    if (now - useT < CFG.useCD) return false;
    if (typeof u.fn === 'function') { var fr = u.fn(id, p, G); if (fr !== undefined) { if (fr) { useT = now; dirty = true; chipsDirty = true; } return !!fr; } }   // Miraflores: efecto propio (inflables, café, cinta)
    // v0.8: cuerdas → reparar la guitarra (armas.js de G1)
    if (u.repair) return useRepair(id, p, u, now);
    var needHp = u.hp && p.hp < C.hpMax, needSt = u.st && (p.stamina < C.staminaMax - 0.5 || p.exhausted);
    var douse = !!(u.douse && p.burnT > 0);   // v0.9: agua encima si te estás quemando
    var special = !!(u.boost || u.invis || douse);   // las bebidas con efecto siempre se pueden tomar
    if (!needHp && !needSt && !special) { notice(u.hp && !u.st ? 'Estás sano, causa. Guárdalo.' : 'Estás al cien, guárdalo.'); return false; }
    useT = now;
    take(id, 1);
    var msg = [], cls = needHp ? 'heal' : 'st';
    sfx(u.drink ? 'item.drink' : 'item.eat', { x: p.x, y: p.y });
    var sick = false;
    if (u.sick) sick = CFG.forceSick === true ? true : CFG.forceSick === false ? false : Math.random() < u.sick;
    if (sick) {
      // le cayó mal: en vez de curar, quita vida y da empacho
      p.hp = Math.max(1, p.hp - CFG.sickHp); p.sickT = CFG.sickT;
      msg.push('−' + CFG.sickHp + ' vida', '¡empacho!'); cls = 'sick';
      sfx('item.sick', { x: p.x, y: p.y });
      saySick(p);
    } else if (needHp) { var before = p.hp; p.hp = Math.min(C.hpMax, p.hp + u.hp); msg.push('+' + Math.round(p.hp - before) + ' vida'); }
    if (typeof u.st === 'number') { if (needSt) { var s0 = p.stamina; p.stamina = Math.min(C.staminaMax, p.stamina + u.st); if (p.stamina > C.staminaMax * 0.25) p.exhausted = false; msg.push('+' + Math.round(p.stamina - s0) + ' aliento'); } }
    else if (needSt || (u.st && u.boost)) { p.stamina = C.staminaMax; p.exhausted = false; if (needSt) msg.push('aliento lleno'); }
    if (douse) { p.burnT = 0; msg.push('¡apagado!'); cls = 'st'; sfx('fire.out', { x: p.x, y: p.y }); }
    if (u.boost) {
      p.boostT = CFG.boostT; msg.push('¡subidón!'); cls = 'st';
      sayMaybe('incakola', p);
    }
    if (u.invis) {
      p.invisT = CFG.invisT; msg.push('¡invisible!'); cls = 'invis';
      sfx('invis.on', { x: p.x, y: p.y });
      sayMaybe('invis', p);
    }
    floatText(p.x, p.y - 24, msg.join(' · '), cls);
    if (isOpenFlag && el.msg) {
      el.msg.textContent = sick ? 'TE CAYÓ MAL, CAUSA. −' + CFG.sickHp + ' VIDA Y EMPACHO.' : msg.join(' · ').toUpperCase() + (u.invis ? '. ¡Shhh!' : '. ¡Qué rico!');
      el.msg.classList.remove('flash'); void el.msg.offsetWidth; el.msg.classList.add('flash');
    }
    dirty = true; chipsDirty = true;
    return true;
  }
  function useRepair(id, p, u, now) {
    var A = ACH.armas, gu = p.guitar;
    if (!A || typeof A.repairGuitar !== 'function') { notice(DEFS[id].msg || 'Para el taller… cuando haya taller.'); return false; }
    if (gu && gu.dur <= 0) { notice('Ya no hay cuerda que la salve.'); return false; }
    if (gu && gu.max && gu.dur >= gu.max) { notice('La viola está al cien, causa. Guárdalas.'); return false; }
    var r; try { r = A.repairGuitar(u.repair); } catch (e) { r = false; }
    if (r === false || r === 0) { if (!gu) notice('Ya no hay cuerda que la salve.'); return false; }
    useT = now;
    take(id, 1);
    sfx('grab', { x: p.x, y: p.y });
    floatText(p.x, p.y - 24, '+' + u.repair + ' guitarra', 'st');
    if (isOpenFlag && el.msg) { el.msg.textContent = 'CUERDAS NUEVAS. LA VIOLA AGUANTA UN POCO MÁS.'; el.msg.classList.remove('flash'); void el.msg.offsetWidth; el.msg.classList.add('flash'); }
    dirty = true;
    return true;
  }
  // Frases: con el id de voces.js si G5 ya lo trae; si no, una variante propia (texto suelto: siempre se dice y sale en globo).
  var SICK_LINES = ['¡Ese anticucho era de gato, causa!', '¡Me cayó pesado!', '¡Ya me agarró la chamba de la panza!',
    '¡Uy, el huevo estaba de la semana pasada!', '¡Fuiste, estómago!', '¡Ay, mi panza! ¿Quién me manda?', '¡Esto ya estaba pasado, compadre!'];
  function hasPhrase(id) { var a = ACH.audio; return !!(a && a.phrases && a.phrases[id]); }
  function saySick(p) {
    var a = ACH.audio, ok = false;
    if (a && a.say) {
      try {
        ok = hasPhrase('sick') ? a.say('sick', { who: 'alex', x: p.x, y: p.y, always: true, force: true })
          : a.say(SICK_LINES[Math.floor(Math.random() * SICK_LINES.length)], { who: 'alex', x: p.x, y: p.y, force: true });
      } catch (e) { ok = false; }
    }
    if (!ok) floatText(p.x, p.y - 34, SICK_LINES[Math.floor(Math.random() * SICK_LINES.length)], 'sick');
  }
  function sayMaybe(id, p) {
    var a = ACH.audio;
    if (a && a.say && hasPhrase(id)) { try { a.say(id, { who: 'alex', x: p.x, y: p.y, always: true }); } catch (e) { /* sin voz */ } }
  }

  /* ---------------- v0.8: efectos con tiempo (subidón, invisible, empacho) ---------------- */
  // Los descuenta este archivo después de que entities.js mueve a Alexander. Si otro módulo ya los descuenta (el valor bajó solo
  // desde el paso anterior), no los toca. invisT que llega a 0 por tiempo → invis.off; si lo rompió otro (golpe, alarma), no.
  var mine = {}, prev = null;
  function tick(p, k, dt) {
    var v = p[k] || 0;
    if (!(v > 0)) { mine[k] = 0; return false; }
    if (mine[k] > 0 && v < mine[k] - 1e-4) { mine[k] = v; return false; }   // alguien más lo está descontando
    v = Math.max(0, v - dt); p[k] = v; mine[k] = v;
    return v === 0;
  }
  function effects(G, p, dt) {
    var C = ACH.ent && ACH.ent.CFG || { staminaMax: 100, runCost: 25, radius: 5 }, A = ACH.armas || {};
    var hadInvis = p.invisT > 0;
    tick(p, 'boostT', dt);
    tick(p, 'sickT', dt);
    if (tick(p, 'invisT', dt) && hadInvis) { sfx('invis.off', { x: p.x, y: p.y }); floatText(p.x, p.y - 24, 'ya te ven', 'dim'); }
    if (hadInvis !== (p.invisT > 0) || (p.boostT > 0) || (p.sickT > 0) || (p.wetT > 0) || (p.burnT > 0)) chipsDirty = true;
    if (prev && p.hp > 0) {
      var dx = p.x - prev.x, dy = p.y - prev.y, jump = dx * dx + dy * dy > 64;
      // subidón: regeneración ×2.5 y correr gasta 40 % menos (sobre lo que ya hizo entities.js en este paso)
      if (p.boostT > 0 && !A.handlesBoost && !jump) {
        var ds = p.stamina - prev.st;
        if (p.running && ds < 0) p.stamina = Math.min(C.staminaMax, p.stamina + Math.min(-ds, C.runCost * dt * 1.05) * (1 - CFG.boostRunCost));
        else if (!p.running && ds > 0 && ds < 2) p.stamina = Math.min(C.staminaMax, p.stamina + ds * (CFG.boostRegen - 1));
      }
      // empacho: camina al 70 % y sin correr (lo que avanzó en este paso se recorta; el punto queda en el tramo ya recorrido)
      if (p.sickT > 0 && !A.handlesSick && !jump && (dx || dy)) {
        var k = p.running ? CFG.sickWalk * (C.walk || 80) / (C.run || 135) : CFG.sickWalk;
        var nx = prev.x + dx * k, ny = prev.y + dy * k, W = ACH.world;
        if (!(W && W.collideCircle && W.collideCircle(nx, ny, C.radius || 5))) { p.x = nx; p.y = ny; }
        if (p.running) p.stamina = Math.min(C.staminaMax, p.stamina + (C.runCost || 25) * dt);   // correr no sirve: tampoco cansa
      }
    }
    if (!prev) prev = {};
    prev.x = p.x; prev.y = p.y; prev.st = p.stamina;
  }
  // Al morir se acaban los efectos (la invisibilidad suena al apagarse)
  function clearEffects(p) {
    if (p.invisT > 0) sfx('invis.off', { x: p.x, y: p.y });
    p.invisT = 0; p.boostT = 0; p.sickT = 0; mine = {}; prev = null; chipsDirty = true;
  }

  /* ---------------- v0.8: carretillas de comida ---------------- */
  var carts = [], cartsBuilt = false;
  function buildCarts() {
    var W = ACH.world; if (!W || !W.props || !W.props.length) return;
    var FC = W.FOOD_CARTS || { anticuchos: 'anticucho', papaHuevo: 'papaHuevo', choclo: 'chocloQueso' }, old = carts.slice();
    carts.length = 0;
    for (var i = 0; i < W.props.length; i++) {
      var pr = W.props[i], food = FC[pr.k];
      if (!food) continue;
      var was = null; for (var j = 0; j < old.length; j++) if (old[j].x === pr.x && old[j].y === pr.y) was = old[j];   // tras un rebake se conservan las porciones
      var max = was ? was.max : irnd(CFG.cartMin, CFG.cartMax);
      var n0 = was ? was.n : max;
      carts.push({ k: pr.k, kind: pr.k, food: food, n: n0, portions: n0, max: max, x: pr.x, y: pr.y, prop: pr, flashT: 0, coins: was ? was.coins : Math.random() < 0.5 });
    }
    cartsBuilt = true;
    W.foodCarts = carts;   // API pública: ACH.world.foodCarts[] = {x, y, kind, portions, max, food, prop}; E → ACH.inv.takePortion(cart | prop)
  }
  function ensureCarts() {
    var W = ACH.world;
    if (!cartsBuilt || (carts.length && W && W.props.indexOf(carts[0].prop) < 0)) buildCarts();
  }
  function cartOpen(c) { return c.n > 0 && !(c.prop && c.prop.broken); }
  // La carretilla con porciones más cercana a (x, y) a menos de r px de su huella; null si no hay (o si está vacía o rota).
  function cartAt(x, y, r) {
    ensureCarts();
    r = r === undefined ? CFG.cartR : r;
    var best = null, bd = 1e9;
    for (var i = 0; i < carts.length; i++) {
      var c = carts[i], pr = c.prop;
      if (!cartOpen(c)) continue;
      var x0 = pr.x0 !== undefined ? pr.x0 : pr.x - 10, x1 = pr.x1 !== undefined ? pr.x1 : pr.x + 10, y0 = pr.y0 !== undefined ? pr.y0 : pr.y - 8, y1 = pr.y1 !== undefined ? pr.y1 : pr.y;
      var qx = Math.max(x0, Math.min(x, x1)), qy = Math.max(y0, Math.min(y, y1)), d = Math.sqrt((x - qx) * (x - qx) + (y - qy) * (y - qy));
      if (d <= r && d < bd) { bd = d; best = c; }
    }
    return best;
  }
  // La carretilla de un prop del mundo (W.props[i]); armas.js (G1) llama a cartTake(pr) con el prop.
  function cartOfProp(pr) {
    ensureCarts();
    for (var i = 0; i < carts.length; i++) if (carts[i].prop === pr || (carts[i].x === pr.x && carts[i].y === pr.y)) return carts[i];
    return null;
  }
  function cartTake(pr) { if (!pr) return false; return takeFromCart(pr.food && pr.max !== undefined ? pr : cartOfProp(pr)); }
  function takeFromCart(c) {
    var G = getG(), p = G && G.player;
    if (c && !(c.food && c.max !== undefined)) c = cartOfProp(c);   // también acepta el prop
    if (!c || !p) return false;
    if (!cartOpen(c)) { notice('Ya no queda nada, causa.'); return false; }
    var d = DEFS[c.food];
    if (add(c.food, 1) > 0) {
      if (fullT <= 0) { fullT = CFG.fullCD; if (ACH.hud && ACH.hud.toast) ACH.hud.toast('¡Ya no entra nada, causa!'); sfx('bag.full', { x: p.x, y: p.y }); }
      return false;
    }
    c.n--; c.portions = c.n; c.flashT = 3;
    sfx('cart.take', { x: c.x, y: c.y, left: c.n, food: c.food });
    floatText(c.x, c.y - 30, '+1 ' + d.unit + (c.n > 0 ? ' · quedan ' + c.n : ' · ¡se acabó!'), 'heal');
    if (c.coins && has('sencillo')) {   // la broma: no hay comercio, pero Alexander es honrado
      c.coins = false;
      var paid = Math.min(count('sencillo'), irnd(1, 2));
      take('sencillo', paid);
      setTimeout(function () { var q = getG(); if (q && q.player) floatText(c.x, c.y - 40, 'dejaste la plata en la latita', 'coin'); }, 350);
      sfx('loot.coins', { x: c.x, y: c.y });
    }
    dirty = true;
    return true;
  }
  // Pips de porciones sobre la carretilla: se ven cuando Alexander está cerca o justo después de sacar una.
  function drawCarts(ctx, camX, camY, G) {
    G = G || getG(); var p = G && G.player;
    if (!p || !carts.length && !(ensureCarts(), carts.length)) return;
    var VW = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 };
    for (var i = 0; i < carts.length; i++) {
      var c = carts[i], pr = c.prop;
      var dx = c.x - p.x, dy = c.y - p.y, near = dx * dx + dy * dy < 72 * 72;
      if (!near && !(c.flashT > 0)) continue;
      if (pr && pr.broken) continue;
      var top = c.y + 3;   // debajo de la base (arriba va el aviso «E sacar comida» de armas.js)
      var sx = Math.round(c.x - camX), sy = Math.round(top - camY);
      if (sx < -20 || sx > VW.w + 20 || sy < -10 || sy > VW.h + 10) continue;
      var w = c.max * 4 + 1, x0 = sx - (w >> 1);
      var a = c.flashT > 0 ? 1 : Math.min(1, (72 - Math.sqrt(dx * dx + dy * dy)) / 20);
      if (!(a > 0)) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#131015'; ctx.fillRect(x0 - 1, sy - 1, w + 2, 6);
      for (var k = 0; k < c.max; k++) {
        ctx.fillStyle = k < c.n ? '#ffe500' : '#4a4452';
        ctx.fillRect(x0 + 1 + k * 4, sy + 1, 3, 3);
        if (k < c.n) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(x0 + 1 + k * 4, sy + 1, 1, 1); }
      }
      ctx.globalAlpha = 1;
    }
  }
  function cartList() { ensureCarts(); return carts.map(function (c) { return { k: c.k, food: c.food, n: c.n, max: c.max, x: c.x, y: c.y, c: +(c.x / 16).toFixed(2), r: +(c.y / 16).toFixed(2), broken: !!(c.prop && c.prop.broken) }; }); }

  /* ---------------- v0.8: chips de cuenta atrás (debajo del HUD) ---------------- */
  var chipsEl = null, chipEls = {}, chipsDirty = true, chipsPos = 0;
  var CHIPS = [['boostT', 'boost', 'SUBIDÓN'], ['invisT', 'invis', 'INVISIBLE'], ['sickT', 'sick', 'EMPACHO'], ['wetT', 'wet', 'MOJADO'], ['burnT', 'burn', '¡TE QUEMAS!']];
  function initChips() {
    if (chipsEl) return true;
    var stage = document.getElementById('stage'); if (!stage) return false;
    var st = document.createElement('style');
    st.textContent =
      '#achChips{position:absolute;display:flex;flex-direction:column;gap:calc(var(--u)*1);pointer-events:none;z-index:3}' +
      '#achChips .chip{display:none;align-items:center;gap:calc(var(--u)*2);font-family:var(--pixel);font-size:calc(var(--u)*5);line-height:1;color:#f2f2f2;' +
      'background:rgba(19,16,21,.82);border:var(--u) solid #ffe500;padding:calc(var(--u)*1) calc(var(--u)*2);white-space:nowrap;width:max-content}' +
      '#achChips .chip.on{display:flex}#achChips .chip i{display:block;width:calc(var(--u)*4);height:calc(var(--u)*4);background:#ffe500;box-shadow:0 0 0 var(--u) #131015}' +
      '#achChips .chip b{font-family:var(--display);font-weight:400;color:#ffe500}' +
      '#achChips .chip.invis{border-color:#d8263a}#achChips .chip.invis i{background:#d8263a;animation:chipShim .5s steps(2) infinite}#achChips .chip.invis b{color:#ff8a8a}' +
      '#achChips .chip.sick{border-color:#6ad640}#achChips .chip.sick i{background:#6ad640}#achChips .chip.sick b{color:#9af070}' +
      '#achChips .chip.wet{border-color:#4aa8ff}#achChips .chip.wet i{background:#4aa8ff}#achChips .chip.wet b{color:#9fd4f0}' +
      '#achChips .chip.burn{border-color:#ff8a30}#achChips .chip.burn i{background:#ff8a30;animation:chipShim .25s steps(2) infinite}#achChips .chip.burn b{color:#ffd23a}' +
      '#invCraft{background:#ff8a30}#invCraft[disabled]{opacity:.4}#invCraft.hide{display:none}' +
      '#achChips .chip.low{animation:chipBlink .4s steps(2) infinite}' +
      '@keyframes chipShim{50%{opacity:.35}}@keyframes chipBlink{50%{opacity:.45}}' +
      '.ft.sick{color:#9af070}.ft.invis{color:#ff8a8a}' +
      'body:not([data-state="playing"]):not([data-state="paused"]) #achChips{display:none}';
    document.head.appendChild(st);
    chipsEl = document.createElement('div'); chipsEl.id = 'achChips';
    CHIPS.forEach(function (c) {
      var d = document.createElement('div'); d.className = 'chip ' + c[1];
      d.innerHTML = '<i></i><span>' + c[2] + '</span><b>0</b>';
      chipsEl.appendChild(d);
      chipEls[c[0]] = { el: d, num: d.querySelector('b'), lbl: d.querySelector('span'), last: -1, low: false };
    });
    stage.appendChild(chipsEl);
    return true;
  }
  function syncChips(G) {
    var p = G.player; if (!p || !initChips()) return;
    if (--chipsPos <= 0) {   // debajo de la caja del HUD (se remide de vez en cuando: el HUD cambia de tamaño con la escala)
      chipsPos = 30;
      var hud = document.getElementById('hud'), u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 2;
      if (hud) { chipsEl.style.left = hud.offsetLeft + 'px'; chipsEl.style.top = (hud.offsetTop + hud.offsetHeight + u * 2) + 'px'; }
    }
    for (var i = 0; i < CHIPS.length; i++) {
      var k = CHIPS[i][0], c = chipEls[k], v = p[k] > 0 ? Math.ceil(p[k]) : 0;
      if (v === c.last) continue;
      c.last = v;
      c.el.classList.toggle('on', v > 0);
      c.num.textContent = v;
      var low = v > 0 && v <= 3; if (low !== c.low) { c.low = low; c.el.classList.toggle('low', low); }
    }
    if (chipEls.boostT && !chipEls.boostT.named) {   // la marca de la gaseosa (INCA KOLA / INTI KOLA)
      chipEls.boostT.named = true;
      var m = null; try { m = ACH.px && ACH.px.marca && ACH.px.marca('gaseosa_amarilla'); } catch (e) { m = null; }
      if (m && (m.texto || m.text)) chipEls.boostT.lbl.textContent = String(m.texto || m.text).toUpperCase();
    }
  }
  function useQuick(n) {
    var id = quick[n]; if (!id) return false;
    var cell = qHud[n];
    if (!has(id)) { notice('Ya no te queda, causa.'); return false; }
    var ok = use(id);
    if (ok && cell) { cell.el.classList.remove('use'); void cell.el.offsetWidth; cell.el.classList.add('use'); }
    return ok;
  }
  // v0.9: la API pública fija (no alterna): game.js la usa al restaurar la mochila y add() ya pudo haber puesto el ítem ahí
  function setQuick(n, id) {
    if (!id || !DEFS[id] || !DEFS[id].use || n < 0 || n >= CFG.quick) return false;
    if (quick[n] === id) return true;
    var o = quick.indexOf(id); if (o >= 0) quick[o] = null;
    quick[n] = id; dirty = true;
    return true;
  }
  function assignQuick(n, id) {
    if (!id || !DEFS[id]) return;
    if (!DEFS[id].use) { notice('Eso no va en la barra rápida.'); return; }
    if (quick[n] === id) { quick[n] = null; }
    else { var o = quick.indexOf(id); if (o >= 0) quick[o] = null; quick[n] = id; }
    dirty = true;
    sfx('ui.move');
  }

  /* ---------------- v0.11 (B): Uhu y globos con agua ---------------- */
  function flashMsg(s) { if (isOpenFlag && el.msg) { el.msg.textContent = s; el.msg.classList.remove('flash'); void el.msg.offsetWidth; el.msg.classList.add('flash'); } }
  function useUhu(id, p) {
    var A = ACH.armas, gu = p.guitar, wasBroken = !!(gu && gu.dur <= 0), r = false;
    try {
      if (A && typeof A.repairAll === 'function') r = A.repairAll({ guitar: 40, heldFrac: 0.6 });
      else if (A && typeof A.repairGuitar === 'function' && gu && gu.dur > 0 && !(gu.max && gu.dur >= gu.max)) { var q = A.repairGuitar(40); r = q === false || q === 0 ? false : { guitar: 40, held: 0 }; }
    } catch (e) { r = false; }
    if (!r) { notice('Todo está al cien, causa. Guarda el ' + (marcasReales() ? 'Uhu' : 'Ujú') + '.'); return false; }
    take(id, 1);
    sfx('grab', { x: p.x, y: p.y, id: 'uhu' }); sfx('uhu.use', { x: p.x, y: p.y });
    var bits = [];
    if (r.guitar) bits.push(wasBroken ? '¡la viola revivió!' : '+' + Math.round(r.guitar) + ' guitarra');
    if (r.held) bits.push('+' + Math.round(r.held) + ' a lo de la mano');
    if (!bits.length) bits.push('¡pegadito!');
    floatText(p.x, p.y - 24, bits.join(' · '), 'st');
    flashMsg((marcasReales() ? 'UHU' : 'UJÚ') + ': ' + bits.join(' · ').toUpperCase() + '. ¡PEGA TODO!');
    dirty = true;
    return true;
  }
  function useGlobos(id, p, G) {
    if (isOpenFlag || !(ACH.inter && typeof ACH.inter.throwNow === 'function')) {   // desde la mochila: queda elegido para el clic
      p.ranged = 'globosAgua'; notice('Globos listos: clic para tirar (R cambia).'); return false;
    }
    var ok = false; try { ok = ACH.inter.throwNow(G, 'globosAgua', 0.75); } catch (e) { ok = false; }
    if (!ok) { p.ranged = 'globosAgua'; return false; }
    dirty = true;
    return true;
  }

  /* ---------------- v0.11 (B): RECETARIO (ACH.RECETAS de catalogo.js; reemplaza la receta única del molotov) ----------------
     Cada receta: { id, out: {id, n}, need: [[id, n]], desc }. Si out.id es un mueble (ACH.base.CATALOGO), va al cuarto: ACH.base.give. */
  var FALLBACK_REC = [{ id: 'molotov', out: { id: 'molotov', n: 1 }, need: [['botella', 1], ['trapo', 1], ['gasolina', 1]], desc: 'Fuego en botella.' }];
  function recipes() { var R0 = ACH.RECETAS; return Array.isArray(R0) && R0.length ? R0 : FALLBACK_REC; }
  function furniture(id) { var B = ACH.base, C = B && B.CATALOGO; return !DEFS[id] && C && C[id] ? C[id] : null; }
  function outName(id) { var f = furniture(id); return f ? f.name : (DEFS[id] ? defName(id) : String(id).toUpperCase()); }
  function unitOf(id, n) { var d = DEFS[id]; if (!d) return String(id); return n === 1 ? d.unit : d.plural; }
  function recStatus(r) {
    var parts = [], miss = [], ok = true;
    for (var i = 0; i < r.need.length; i++) {
      var id = r.need[i][0], need = r.need[i][1], hv = count(id), enough = hv >= need;
      if (!enough) { ok = false; miss.push((need - hv) + ' ' + unitOf(id, need - hv)); }
      parts.push({ id: id, need: need, have: hv, ok: enough, name: DEFS[id] ? defName(id) : String(id).toUpperCase() });
    }
    var furn = !!furniture(r.out.id);
    if (furn && !(ACH.base && typeof ACH.base.give === 'function')) ok = false;
    return { id: r.id, out: r.out.id, n: r.out.n || 1, name: outName(r.out.id), furniture: furn, canCraft: ok, parts: parts, missing: miss,
      missText: miss.length ? 'TE FALTA: ' + miss.join(', ') : (furn && !(ACH.base && ACH.base.give) ? 'Primero consigue un cuarto' : '') };
  }
  function recById(rid) { var L = recipes(); for (var i = 0; i < L.length; i++) if (L[i].id === rid) return L[i]; return null; }
  function canCraft(rid) {
    if (rid) { var r = recById(rid); return !!(r && recStatus(r).canCraft); }
    var L = recipes(); for (var i = 0; i < L.length; i++) if (recStatus(L[i]).canCraft) return true;
    return false;
  }
  function anyPart() {
    var L = recipes(); for (var i = 0; i < L.length; i++) for (var k = 0; k < L[i].need.length; k++) if (has(L[i].need[k][0])) return true;
    return false;
  }
  function craftRecipe(r) {
    var G = getG(), p = G && G.player, i, st = recStatus(r), n = r.out.n || 1;
    if (st.furniture && !(ACH.base && typeof ACH.base.give === 'function')) { notice('Primero consigue un cuarto, causa.'); sfx('shop.nomoney'); return false; }
    if (!st.canCraft) { notice((st.missText || 'Te falta algo, causa.') + '.'); sfx('shop.nomoney'); return false; }
    var d = DEFS[r.out.id];
    if (!st.furniture && d && d.stack === 1 && has(r.out.id)) { notice('Ya tienes tu ' + d.unit + ', causa.'); return false; }
    for (i = 0; i < r.need.length; i++) take(r.need[i][0], r.need[i][1]);
    if (st.furniture) {
      var okB = false; try { okB = ACH.base.give(r.out.id, n) !== false; } catch (e) { okB = false; }
      if (!okB) { for (i = 0; i < r.need.length; i++) add(r.need[i][0], r.need[i][1]); notice('No se pudo llevar al cuarto, causa.'); return false; }
      sfx('grab', p ? { x: p.x, y: p.y } : undefined); sfx('craft', { id: r.out.id });
      if (p) floatText(p.x, p.y - 24, '¡' + st.name.toLowerCase() + ' al cuarto!', 'rare');
      flashMsg('¡LISTO! TE LO LLEVASTE A TU CUARTO (H): ' + st.name + '.');
      dirty = true;
      return true;
    }
    var left = add(r.out.id, n);
    if (left > 0) {   // no entra: se devuelve todo
      if (left < n) take(r.out.id, n - left);
      for (i = 0; i < r.need.length; i++) add(r.need[i][0], r.need[i][1]);
      notice('¡Ya no entra nada, causa!'); return false;
    }
    sfx('grab', p ? { x: p.x, y: p.y } : undefined); sfx('craft', { id: r.out.id });
    if (p) floatText(p.x, p.y - 24, '+' + n + ' ' + unitOf(r.out.id, n), 'rare');
    flashMsg(r.out.id === 'molotov' ? 'MOLOTOV ARMADO. R PARA ELEGIRLO, CLIC PARA TIRAR.' : '¡ARMADO! ' + st.name + ' EN LA MOCHILA.');
    dirty = true;
    return true;
  }
  // F en la mochila (y ARMAR): la receta elegida en el recetario si se puede; si no, la primera que se pueda armar.
  function craft(rid) {
    var L = recipes(), r = null, i;
    if (typeof rid === 'string') r = recById(rid);
    else if (tab === 'rec' && recSel) r = recById(recSel);
    if (r) return craftRecipe(r);
    for (i = 0; i < L.length; i++) if (recStatus(L[i]).canCraft) return craftRecipe(L[i]);
    // nada alcanza: dice lo que falta de la más cercana
    var best = null, bm = 1e9;
    for (i = 0; i < L.length; i++) { var s = recStatus(L[i]), m = 0; for (var k = 0; k < s.parts.length; k++) m += Math.max(0, s.parts[k].need - s.parts[k].have); if (m < bm) { bm = m; best = L[i]; } }
    if (best) return craftRecipe(best);
    return false;
  }
  function syncCraft() {
    if (!el.invCraft) return;
    var first = null, L = recipes();
    for (var i = 0; i < L.length && !first; i++) if (recStatus(L[i]).canCraft) first = L[i];
    el.invCraft.classList.toggle('hide', !anyPart());
    el.invCraft.disabled = !first;
    el.invCraft.title = first ? 'Arma: ' + outName(first.out.id) : 'Mira el recetario (L)';
  }

  /* ---------------- v0.11 (B): pestañas MOCHILA / RECETARIO ---------------- */
  var tab = 'bag', recSel = null, recRows = {}, recOrder = '', recIcons = {};
  function recIcon(id) {
    if (recIcons[id]) return recIcons[id];
    if (!furniture(id)) return iconBig(id);
    var B = ACH.base, c = null;
    if (B && typeof B.icon === 'function') { try { c = B.icon(id, 24); } catch (e) { c = null; } }
    if (c && c.width) { recIcons[id] = c; return c; }
    c = mkCanvas(24, 24); var g = c.getContext('2d'), f = furniture(id);
    g.fillStyle = '#131015'; g.fillRect(2, 4, 20, 18); g.fillStyle = '#8a5a32'; g.fillRect(3, 5, 18, 16);
    g.fillStyle = '#ffe500'; g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(((f && f.name) || id).replace(/[^A-ZÁÉÍÓÚÑ]/g, '').slice(0, 2), 12, 13);
    return c;   // provisorio: no se guarda (base.js puede llegar después)
  }
  function buildRecipes() {
    if (el.invRec || !el.invPanel) return;
    var body = el.invPanel.querySelector('.invbody'), head = el.invPanel.querySelector('.invhead');
    var tabs = document.createElement('div'); tabs.className = 'invtabs';
    tabs.innerHTML = '<button type="button" tabindex="-1" data-tab="bag">MOCHILA' + (ACH.touch && ACH.touch.on ? '' : ' <b>I</b>') + '</button><button type="button" tabindex="-1" data-tab="rec">RECETARIO' + (ACH.touch && ACH.touch.on ? '' : ' <b>L</b>') + '</button>';
    if (head && head.nextSibling) el.invPanel.insertBefore(tabs, head.nextSibling); else el.invPanel.insertBefore(tabs, el.invPanel.firstChild);
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
    });
    el.invTabs = tabs;
    var rec = document.createElement('div'); rec.id = 'invRec'; rec.className = 'invrec';
    rec.innerHTML = '<div class="rlist"></div><div class="rbar"><p class="rdesc"></p><p class="invmsg rmsg"></p></div>' +
      '<div class="invfoot rfoot"><span><b>↑↓</b> elegir</span><span><b>ENTER</b> · <b>F</b> armar</span><span><b>I</b> mochila</span><span><b>L</b> · <b>ESC</b> cerrar</span></div>';
    if (body && body.parentNode) body.parentNode.insertBefore(rec, body.nextSibling); else el.invPanel.appendChild(rec);
    el.invRec = rec; el.recList = rec.querySelector('.rlist'); el.recDesc = rec.querySelector('.rdesc'); el.recMsg = rec.querySelector('.rmsg');
    recipes().forEach(function (r) {
      var row = document.createElement('div'); row.className = 'rrow';
      row.innerHTML = '<canvas width="24" height="24"></canvas><div class="rmain"><div class="rtop"><span class="rn"></span><span class="rtag">VA A TU CUARTO</span></div>' +
        '<div class="ring"></div><div class="rmiss"></div></div><button type="button" tabindex="-1" class="rgo">ARMAR</button>';
      row.addEventListener('mouseenter', function () { selectRec(r.id, true); });
      row.addEventListener('click', function () { selectRec(r.id); });
      row.addEventListener('dblclick', function () { selectRec(r.id); craftRecipe(r); });
      var go = row.querySelector('.rgo');
      go.addEventListener('mousedown', function (e) { e.preventDefault(); });
      go.addEventListener('click', function (e) { e.stopPropagation(); selectRec(r.id, true); craftRecipe(r); });
      recRows[r.id] = { el: row, cv: row.querySelector('canvas'), n: row.querySelector('.rn'), tag: row.querySelector('.rtag'), ing: row.querySelector('.ring'), miss: row.querySelector('.rmiss'), go: go, key: '' };
      el.recList.appendChild(row);
    });
  }
  function sortedRecipes() {
    var L = recipes(), a = [], b = [];
    for (var i = 0; i < L.length; i++) { var s = recStatus(L[i]); (s.canCraft ? a : b).push({ r: L[i], s: s }); }
    return a.concat(b);
  }
  function renderRecipes() {
    if (!el.invRec) return;
    var list = sortedRecipes(), order = list.map(function (q) { return q.r.id; }).join(',');
    if (order !== recOrder) { recOrder = order; list.forEach(function (q) { var rr = recRows[q.r.id]; if (rr) el.recList.appendChild(rr.el); }); }
    if (!recSel || !recRows[recSel]) recSel = list.length ? list[0].r.id : null;
    list.forEach(function (q) {
      var rr = recRows[q.r.id]; if (!rr) return;
      var s = q.s, key = s.canCraft + '|' + s.parts.map(function (p) { return p.have; }).join(',') + '|' + (recIcons[s.out] ? 1 : 0);
      rr.el.classList.toggle('sel', q.r.id === recSel);
      if (rr.key === key) return;
      rr.key = key;
      paint(rr.cv, recIcon(s.out));
      rr.n.textContent = (s.n > 1 ? s.n + ' ' : '') + s.name;
      rr.tag.style.display = s.furniture ? '' : 'none';
      rr.ing.innerHTML = '';
      s.parts.forEach(function (p) {
        var c = document.createElement('span'); c.className = p.ok ? 'ok' : 'no';
        c.textContent = p.name + ' ' + Math.min(p.have, 99) + '/' + p.need;
        rr.ing.appendChild(c);
      });
      rr.miss.textContent = s.canCraft ? '¡LISTO PARA ARMAR!' : s.missText;
      rr.miss.classList.toggle('ok', s.canCraft);
      rr.el.classList.toggle('can', s.canCraft);
      rr.go.disabled = !s.canCraft;
    });
    var cur = recById(recSel);
    if (el.recDesc) el.recDesc.textContent = cur ? outName(cur.out.id) + ': ' + (cur.desc || '') : '';
  }
  function selectRec(rid, quiet) {
    if (!recRows[rid] || rid === recSel) return;
    recSel = rid; if (!quiet) sfx('ui.move');
    renderRecipes();
    var rr = recRows[rid]; if (rr && rr.el.scrollIntoView) { try { rr.el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* nada */ } }
  }
  function moveRec(d) {
    var list = sortedRecipes().map(function (q) { return q.r.id; }), i = list.indexOf(recSel);
    var j = Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + d));
    selectRec(list[j]);
  }
  function setTab(t, quiet) {
    if (!el.invPanel) return;
    buildRecipes();
    tab = t === 'rec' ? 'rec' : 'bag';
    el.invPanel.classList.toggle('rec', tab === 'rec');
    if (el.invTabs) Array.prototype.forEach.call(el.invTabs.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === tab); });
    el.msg = tab === 'rec' && el.recMsg ? el.recMsg : el.invMsg;
    if (el.msg) el.msg.textContent = '';
    if (tab === 'rec') renderRecipes(); else renderDetail();
    if (!quiet) sfx('ui.move');
  }
  function openRecipes() {
    if (isOpenFlag) { setTab('rec'); return true; }
    if (!open()) return false;
    setTab('rec');
    return true;
  }
  function recipeList() {
    return recipes().map(function (r) { var s = recStatus(r); return { id: r.id, out: s.out, n: s.n, name: s.name, furniture: s.furniture, canCraft: s.canCraft, missing: s.missing, missText: s.missText, need: s.parts.map(function (p) { return { id: p.id, need: p.need, have: p.have, ok: p.ok }; }) }; });
  }

  /* ---------------- v0.11 (B): materiales al romper props (ACH.propHooks de interaccion.js) ---------------- */
  var WOODK = { mesaPizzeria: 1, cajaGatos: 1, atrilMenu: 1, banca: 1 };   // madera de Miraflores sin ficha en KINDS: 3 golpes = 1 tabla (una vez)
  function matHook(G, pr, info) {
    if (!pr || !info || info.src === 'fire') return;
    var out = [], k = String(pr.k || '');
    if (info.broke) {
      var K = ACH.inter && ACH.inter.kindOf ? ACH.inter.kindOf(pr.k) : null;
      if (info.cls === 'car') { out.push({ id: 'chatarra', n: irnd(1, 2) }); if (/^mototaxi/.test(k) || Math.random() < 0.4) out.push({ id: 'jebe', n: 1 }); }
      else if (info.cls === 'junk') {
        var lo = K && K.loot;
        if (lo === 'refri' || lo === 'tele') out.push({ id: 'chatarra', n: irnd(1, 2) });
        else if (lo === 'silla' || lo === 'mesa') out.push({ id: 'tablas', n: irnd(1, 2) });
        else if (Math.random() < 0.5) out.push({ id: 'chatarra', n: 1 });
      } else if (info.cls === 'cart') { out.push({ id: 'tablas', n: irnd(1, 2) }); if (/^triciclo/.test(k)) out.push({ id: 'jebe', n: 1 }); }
      else if (info.cls === 'pole' && Math.random() < 0.5) out.push({ id: 'chatarra', n: 1 });
      if (out.length && Math.random() < 0.05) out.push({ id: 'uhu', n: 1 });   // de vez en cuando, un Uhu entre los cachivaches
    } else if (info.cls === 'soft' && /llanta/.test(k) && !pr._jebeV011) { pr._jebeV011 = true; out.push({ id: 'jebe', n: 1 }); }
    else if (!info.known && WOODK[k] && !pr._tabV011) {
      pr._bhV011 = (pr._bhV011 || 0) + 1;
      if (pr._bhV011 >= 3) { pr._tabV011 = true; out.push({ id: 'tablas', n: 1 }); }
      if (out.length) drop(pr.x, pr.y + 8, out);
      sfx('prop.hit.wood', { x: pr.x, y: pr.y });
      return true;
    }
    if (out.length) drop(pr.x, pr.y + 8, out);
  }
  (ACH.propHooks = Array.isArray(ACH.propHooks) ? ACH.propHooks : []).push(matHook);
  function clearPropFlags() { var W = ACH.world, P = W && W.props; if (!P) return; for (var i = 0; i < P.length; i++) { var q = P[i]; if (q._jebeV011 || q._tabV011 || q._bhV011) { q._jebeV011 = false; q._tabV011 = false; q._bhV011 = 0; } } }

  /* ---------------- Interfaz: HUD y overlay ---------------- */
  function buildQuick(host, store, cls) {
    host.innerHTML = '';
    for (var n = 0; n < CFG.quick; n++) {
      var d = document.createElement('div'); d.className = cls;
      var cv = mkCanvas(12, 12), k = document.createElement('i'), c = document.createElement('b');
      k.textContent = n + 1;
      d.appendChild(cv); d.appendChild(k); d.appendChild(c);
      host.appendChild(d);
      store.push({ el: d, cv: cv, cnt: c, id: undefined, n: -1 });
    }
  }
  function drawCoin(cv) {
    var g = cv.getContext('2d'); g.clearRect(0, 0, 7, 7);
    var rows = ['.XXXXX.', 'XYYYYYX', 'XYXXXYX', 'XYXYYYX', 'XYXXXYX', 'XYYYYYX', '.XXXXX.'];
    for (var y = 0; y < 7; y++) for (var x = 0; x < 7; x++) {
      var c = rows[y][x]; if (c === '.') continue;
      g.fillStyle = c === 'X' ? '#b38f00' : '#ffe500'; g.fillRect(x, y, 1, 1);
    }
  }
  function addSlotEl(i) {
    var d = document.createElement('div'); d.className = 'islot';
    var cv = mkCanvas(24, 24), nn = document.createElement('b'), q = document.createElement('i');
    d.appendChild(cv); d.appendChild(nn); d.appendChild(q);
    d.addEventListener('mouseenter', function () { select(i, true); });
    d.addEventListener('click', function () { select(i); });
    d.addEventListener('dblclick', function () { select(i); useSelected(); });
    el.invGrid.appendChild(d);
    slotEls.push({ el: d, cv: cv, cnt: nn, q: q });
  }
  // v0.13 T2 (P · taller del cuarto): la mochila crece (12 → 16 → 20). Nunca se achica (no se pierde nada).
  function setSlots(n) {
    n = Math.min(24, Math.floor(+n || 0));
    if (!(n > CFG.slots)) return CFG.slots;
    while (bag.length < n) bag.push(null);
    CFG.slots = n;
    if (inited) { for (var i = slotEls.length; i < n; i++) addSlotEl(i); el.invGrid.classList.toggle('big5', n > 16); }
    dirty = true;
    return n;
  }
  function init() {
    if (inited) return;
    var $ = function (id) { return document.getElementById(id); };
    ['stage', 'ftx', 'qbar', 'coinN', 'coinIcon', 'inv', 'invPanel', 'invGrid', 'invQuick', 'invBig', 'invName', 'invDesc', 'invFx', 'invStack', 'invUse', 'invClose', 'invMsg', 'invCoin', 'invCoinN']
      .forEach(function (k) { el[k] = $(k); });
    el.msg = el.invMsg;
    if (!el.qbar || !el.invGrid) return;       // aún no hay HTML
    inited = true;
    buildQuick(el.qbar, qHud, 'qs');
    buildQuick(el.invQuick, qOv, 'qs qo');
    if (el.coinIcon) drawCoin(el.coinIcon);
    if (el.invCoin) { el.invCoin.width = 12; el.invCoin.height = 12; paint(el.invCoin, icon('sencillo')); }
    // casillas de la mochila
    for (var i = 0; i < CFG.slots; i++) addSlotEl(i);
    el.invGrid.classList.toggle('big5', CFG.slots > 16);
    for (var n = 0; n < CFG.quick; n++) (function (n) {
      qOv[n].el.addEventListener('click', function () { assignQuick(n, bag[selIdx] && bag[selIdx].id); });
    })(n);
    function noFocus(e) { e.preventDefault(); }
    if (el.invUse) { el.invUse.addEventListener('mousedown', noFocus); el.invUse.addEventListener('click', useSelected); }
    if (el.invUse && el.invUse.parentNode && !document.getElementById('invCraft')) {   // v0.9: ARMAR junto a USAR
      var cb = document.createElement('button'); cb.id = 'invCraft'; cb.type = 'button'; cb.tabIndex = -1; cb.textContent = 'ARMAR (F)'; cb.className = 'hide';
      cb.title = 'Mira el recetario (L)';
      el.invUse.parentNode.insertBefore(cb, el.invUse.nextSibling); el.invCraft = cb;
      cb.addEventListener('mousedown', noFocus); cb.addEventListener('click', function () { craft(); });
    }
    if (el.invClose) { el.invClose.addEventListener('mousedown', noFocus); el.invClose.addEventListener('click', function () { close(); }); }
    // que el clic dentro de la mochila no llegue a input.js (no dispara la resortera)
    el.inv.addEventListener('mousedown', function (e) { e.stopPropagation(); if (e.target === el.inv) close(); });
    el.inv.addEventListener('mouseup', function (e) { e.stopPropagation(); });
    el.invPanel.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    try { buildRecipes(); } catch (eR) { console.warn('[ACHORADO] recetario', eR); }   // v0.11: pestañas MOCHILA / RECETARIO
    dirty = true;
    refresh();
  }

  function refresh() {
    if (!inited || !dirty) return;
    dirty = false;
    var i, c, id, n, cnt;
    for (i = 0; i < CFG.quick; i++) {
      id = quick[i]; cnt = id ? count(id) : 0;
      [qHud[i], qOv[i]].forEach(function (cell) {
        if (cell.id !== id || cell.n !== cnt) {
          cell.id = id; cell.n = cnt;
          paint(cell.cv, id ? icon(id) : null, cnt ? 1 : 0.3);
          cell.cnt.textContent = id && cnt !== 1 ? cnt : '';
          cell.el.classList.toggle('empty', !id); cell.el.classList.toggle('zero', !!id && !cnt);
        }
      });
    }
    var coins = count('sencillo');
    if (el.coinN) el.coinN.textContent = coins;
    if (el.invCoinN) el.invCoinN.textContent = coins;
    for (i = 0; i < CFG.slots; i++) {
      c = slotEls[i]; var s = bag[i];
      var key = s ? s.id + ':' + s.n + ':' + quickIndex(s.id) : '';
      if (c.key !== key) {
        c.key = key;
        paint(c.cv, s ? iconBig(s.id) : null);
        c.cnt.textContent = s && DEFS[s.id].stack > 1 ? s.n : '';
        var qi = s ? quickIndex(s.id) : -1;
        c.q.textContent = qi >= 0 ? qi + 1 : ''; c.q.style.display = qi >= 0 ? '' : 'none';
        c.el.classList.toggle('full', !!s);
      }
    }
    renderDetail();
    syncCraft();
    if (tab === 'rec' && isOpenFlag) renderRecipes();
  }
  function renderDetail() {
    if (!inited) return;
    for (var i = 0; i < slotEls.length; i++) slotEls[i].el.classList.toggle('sel', i === selIdx);
    var s = bag[selIdx];
    if (!s) {
      paint(el.invBig, null);
      el.invName.textContent = 'CASILLA VACÍA';
      el.invDesc.textContent = 'Aquí no hay nada, causa. Sal a tumbar fans, que algo cae.';
      el.invFx.textContent = ''; el.invStack.textContent = '';
      el.invUse.disabled = true; el.invUse.textContent = 'USAR';
      return;
    }
    var d = DEFS[s.id];
    paint(el.invBig, iconBig(s.id));
    el.invName.textContent = defName(s.id);
    el.invDesc.textContent = d.desc;
    el.invFx.textContent = d.fx;
    el.invStack.textContent = d.stack > 1 ? 'x' + s.n + ' / ' + d.stack : '';
    el.invUse.disabled = false; el.invUse.textContent = d.use ? 'USAR' : 'REVISAR';
  }
  function select(i, fromMouse) {
    i = Math.max(0, Math.min(CFG.slots - 1, i));
    if (i === selIdx) return;
    selIdx = i;
    if (!fromMouse) sfx('ui.move');
    renderDetail();
  }
  function useSelected() { var s = bag[selIdx]; if (s) { use(s.id); } else notice('Casilla vacía, causa.'); }

  /* ---------------- Abrir / cerrar ---------------- */
  function isOpen() { return isOpenFlag; }
  function open() {
    var G = getG();
    if (isOpenFlag || !G || (G.state !== 'playing' && G.state !== 'base') || (G.player && G.player.hp <= 0)) return false;   // v0.11: también en el cuarto
    if (ACH.tienda && typeof ACH.tienda.isOpen === 'function' && ACH.tienda.isOpen()) return false;
    if (!inited) init();
    if (!inited) return false;
    isOpenFlag = true; G.invOpen = true;
    if (tab !== 'bag') setTab('bag', true);
    if (!bag[selIdx]) { for (var i = 0; i < CFG.slots; i++) if (bag[i]) { selIdx = i; break; } }
    dirty = true; refresh(); renderDetail();
    el.msg.textContent = '';
    el.inv.classList.add('on');
    sfx('inv.open');
    return true;
  }
  function close(silent) {
    if (!isOpenFlag) return false;
    isOpenFlag = false;
    var G = getG(); if (G) G.invOpen = false;
    if (el.inv) el.inv.classList.remove('on');
    if (!silent) sfx('inv.close');
    return true;
  }

  /* ---------------- Teclado ---------------- */
  var DIG = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 };
  // v0.14.1: si input.js ya vio esta ESC (evento despachado sobre window: ahí el orden de captura no protege), se borra su flanco:
  // si no, la misma ESC que cerró el recetario abría la pausa y la ESC siguiente la cerraba («la segunda ESC se ignora»).
  function escUsed(c) { if (c === 'Escape' && ACH.input && ACH.input.consume) ACH.input.consume('Escape'); }
  function onKey(e) {
    var G = getG(); if (!G) return;
    if (G.state !== 'playing' && !(isOpenFlag && G.state === 'base')) return;
    if (ACH.tienda && typeof ACH.tienda.isOpen === 'function' && ACH.tienda.isOpen()) return;   // v0.11: la tienda maneja sus teclas
    var c = e.code;
    if (isOpenFlag && tab === 'rec') {   // v0.11: recetario
      var st2 = true;
      switch (c) {
        case 'Escape': case 'Tab': case 'KeyL': if (!e.repeat) close(); escUsed(c); break;   // v0.14.1: la ESC que cierra no llega a la pausa
        case 'KeyI': case 'ArrowLeft': case 'KeyA': if (!e.repeat) setTab('bag'); break;
        case 'ArrowUp': case 'KeyW': moveRec(-1); break;
        case 'ArrowDown': case 'KeyS': moveRec(1); break;
        case 'PageUp': moveRec(-4); break;
        case 'PageDown': moveRec(4); break;
        case 'Enter': case 'NumpadEnter': case 'KeyE': case 'Space': case 'KeyF': if (!e.repeat) craft(); break;
        case 'ArrowRight': case 'KeyD': break;
        default: st2 = /^(Digit|Numpad)[0-9]$/.test(c);
      }
      if (st2) { e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (isOpenFlag) {
      var stop = true;
      switch (c) {
        case 'KeyL': if (!e.repeat) setTab('rec'); break;   // v0.11
        case 'KeyI': case 'Tab': case 'Escape': if (!e.repeat) close(); escUsed(c); break;
        case 'ArrowLeft': case 'KeyA': select(selIdx % 4 === 0 ? selIdx : selIdx - 1); break;
        case 'ArrowRight': case 'KeyD': select(selIdx % 4 === 3 ? selIdx : selIdx + 1); break;
        case 'ArrowUp': case 'KeyW': select(selIdx < 4 ? selIdx : selIdx - 4); break;
        case 'ArrowDown': case 'KeyS': select(selIdx >= CFG.slots - 4 ? selIdx : selIdx + 4); break;
        case 'Enter': case 'NumpadEnter': case 'KeyE': case 'Space': if (!e.repeat) useSelected(); break;
        case 'KeyF': if (!e.repeat) craft(); break;   // v0.9: ARMAR
        case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Numpad1': case 'Numpad2': case 'Numpad3': case 'Numpad4':
          if (!e.repeat) assignQuick(DIG[c], bag[selIdx] && bag[selIdx].id);
          break;
        default: stop = false;
      }
      if (stop) { e.preventDefault(); e.stopImmediatePropagation(); }
      return;
    }
    if (c === 'KeyI' || c === 'Tab') { e.preventDefault(); if (!e.repeat) open(); return; }
    if (c === 'KeyL' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openRecipes(); return; }   // v0.11: L = recetario directo
    if (DIG[c] !== undefined && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) useQuick(DIG[c]);
  }
  window.addEventListener('keydown', onKey, true);   // en captura: con la mochila abierta, input.js no ve esas teclas

  /* ---------------- Sincronía con el HUD (se llama cada paso desde hud.update) ---------------- */
  function sync(G) {
    if (!inited) init();
    if (G.state !== lastState) {
      // v0.12 (QA): pausar (ESC o auto-pausa al perder el foco) durante un diálogo de llegada y seguir NO es partida nueva: no vaciar la mochila que llegó en el carry
      if (G.state === 'paused' && lastState === 'intro') introPaused = true;
      else if (G.state === 'intro' && lastState !== 'intro') { if (!(lastState === 'paused' && introPaused)) reset(); introPaused = false; }   // partida nueva: mochila vacía
      else if (G.state !== 'paused') introPaused = false;
      if (isOpenFlag && G.state !== 'playing' && G.state !== 'paused') close(true);
      lastState = G.state;
    }
    var pl = G.player;
    if (pl && pl.hp <= 0 && (pl.invisT > 0 || pl.boostT > 0 || pl.sickT > 0)) clearEffects(pl);   // v0.8: al morir se acaban
    if (pl) syncChips(G);
    if (!cartsBuilt) ensureCarts();   // v0.8: ACH.world.foodCarts siempre poblado
    if (dirty) refresh();
    placeTexts(G);
  }

  /* ---------------- v0.9: cambio de nivel ---------------- */
  function clearGround() { ground.length = 0; clearTexts(); dbag = null; }   // v0.13: la bolsa vive solo en el nivel actual
  // fn(id, W) después de resetWorld: suelo limpio, carretillas y escondidos del mundo nuevo (la mochila la restaura game.js)
  (ACH.levelHooks = ACH.levelHooks || []).push(function () { clearGround(); carts.length = 0; cartsBuilt = false; placeHidden(); chipsDirty = true; clearPropFlags(); });

  /* ---------------- Debug ---------------- */
  function snapshot() {
    return { open: isOpenFlag, slots: bag.map(function (s) { return s ? { id: s.id, n: s.n } : null; }), quick: quick.slice(), coins: count('sencillo'),
      ground: ground.length, free: bag.filter(function (s) { return !s; }).length };
  }
  function installDebug() {
    if (!ACH.debug || ACH.debug.give) return;
    ACH.debug.give = function (id, n) { var left = add(id, n === undefined ? 1 : n); return { id: id, given: (n === undefined ? 1 : n) - left, leftover: left }; };
    ACH.debug.inv = snapshot;
  }
  function installDebug8() {   // v0.8 (G2)
    if (!ACH.debug) return;
    if (!ACH.debug.carts) ACH.debug.carts = cartList;
    if (!ACH.debug.sick) ACH.debug.sick = function (on) { CFG.forceSick = on === undefined ? true : on; return CFG.forceSick; };
    if (!ACH.debug.effects) ACH.debug.effects = function () { var G = getG(), p = G && G.player; return p ? { boostT: +(p.boostT || 0).toFixed(2), invisT: +(p.invisT || 0).toFixed(2), sickT: +(p.sickT || 0).toFixed(2), stamina: +p.stamina.toFixed(1), hp: p.hp } : null; };
  }
  function installDebug11() {   // v0.11 (B)
    var D = ACH.debug = ACH.debug || {}, V = D.v011 = D.v011 || {};
    if (!V.give) V.give = function (id, n) { var k = n === undefined ? 1 : n, f = furniture(id); if (f && ACH.base && ACH.base.give) { ACH.base.give(id, k); return { id: id, given: k, cuarto: true }; } var left = add(id, k); return { id: id, given: k - left, leftover: left }; };
    if (!V.recetas) V.recetas = recipeList;
    if (!V.craft) V.craft = function (rid) { return craft(rid); };
    if (!V.recetario) V.recetario = function () { return openRecipes(); };
  }
  installDebug11();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installDebug); else installDebug();
  window.addEventListener('load', installDebug8);

  ACH.inv = {
    add: add, has: has, take: take, count: count, drop: drop, dropFor: dropFor,
    groundItems: groundItems, drawGround: drawGround, update: update,
    isOpen: isOpen, open: open, close: close, use: use,
    // extras
    init: init, sync: sync, reset: reset, useQuick: useQuick, assignQuick: setQuick, toggleQuick: assignQuick, craft: craft, canCraft: canCraft, clearGround: clearGround, snapshot: snapshot, defs: DEFS, name: defName, icon: icon, cfg: CFG,
    installDebug: installDebug,
    // v0.11 (B)
    openRecipes: openRecipes, recipes: recipeList, craftRecipe: function (rid) { var r = recById(rid); return r ? craftRecipe(r) : false; }, tab: function () { return tab; }, setTab: setTab,
    iconBig: iconBig, furniture: furniture,
    // v0.13 (A2): bolsa de muerte
    setDeathBag: setDeathBag, deathBag: deathBag, clearDeathBag: clearDeathBag, isFood: isFood,
    // v0.13 T2 (P): casillas de la mochila (taller del cuarto)
    setSlots: setSlots, slots: function () { return CFG.slots; },
    // v0.8 (G2)
    cartAt: cartAt, takeFromCart: takeFromCart, cartTake: cartTake, takePortion: cartTake, foodCarts: function () { ensureCarts(); return carts; }, cartOfProp: cartOfProp, drawCarts: drawCarts, carts: cartList
  };
  requestAnimationFrame(fallbackLoop);
  // por si game.js reemplaza ACH.debug después de cargar
  var dbgTries = 0, dbgTimer = setInterval(function () { installDebug(); installDebug8(); installDebug11(); if ((ACH.debug && ACH.debug.give && ACH.debug.inv === snapshot) || ++dbgTries > 40) clearInterval(dbgTimer); }, 250);
})();
