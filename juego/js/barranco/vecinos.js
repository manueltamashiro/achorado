/* ACHORADO — js/barranco/vecinos.js (B1c, BARRANCO.md §5): los cinco sobrevivientes de Barranco, sus datos reales, el diario, la mini-tarea
   de Lucía, Don Celedonio (enseña el LANDÓ DEL CONTRAPUNTO y abre la peña) y el muñeco de práctica.
   Patrón de js/costaverde/sobrevivientes.js (sin editarlo).
   - Tomás (playa) · Rosa (junto al puente) · Lucía, la poeta (mirador) · Lucho (calles bohemias) · Don Celedonio (zaguán junto a la peña).
     Cada uno tiene 6 datos REALES de ../diseno/investigacion-barranco.md §5 (Don Celedonio: música criolla y peñas), con su voz.
   - E: la primera vez, presentación (diálogo con retrato; Alexander con su retrato, el vecino por nombre). Después, menú chicha
     CUÉNTAME DE BARRANCO / COMPRAR (si vende) / CHAU (↑↓ o W/S + ENTER/E, 1–3, ESC = chau, clic/toque). «Cuéntame» da el siguiente dato.
   - Cada dato nuevo: +5 XP (ACH.hab.addXP) y una entrada del DIARIO (ACH.objetivo.diario 'br-dato-<id>-<n>', título «DATOS DE BARRANCO · X/30»).
     Los 6 de un mismo vecino: un regalito. Banderas de partida (ACH.partida.flag): barranco.met.<id>, barranco.datos.<id> (0–6),
     barranco.regalo.<id>, barranco.lucia, barranco.cuaderno, barranco.celedonio (= LA PEÑA ABIERTA), barranco.practica.
   - Pistas de la cura: cura-7 (Lucía, al devolverle el cuaderno), cura-8 (Don Celedonio, al enseñar la melodía). cura-9 la da B5.
   - Lucía: el poeta zombie de sombrero rojo (skin br_poetaRojo) anda por el Parque Municipal; al matarlo suelta el `cuaderno`; E con él → gracias,
     cura-7 y 2 botellas doradas.
   - Don Celedonio: 8 láminas → ACH.hab.teach('contrapunto', 'Don Celedonio') (rango 1, gratis) y la bandera barranco.celedonio. Al lado queda el
     muñeco de práctica: 4 golpes A TIEMPO (guitarra, puñete, lo de la mano o el cajón) con el metrónomo encima → +20 XP (una vez).
   Ubicaciones: ACH.world.places (B1a): playa · puenteB (o puenteA / bajadaCima) · mirador (o ermita) · bohemia2 (o bohemia1) · celedonio (o penaPuerta)
   · parque (el poeta). Sin mapa: en fila junto al inicio.
   API: ACH.br.vecinos = { list(), datos() → {n, total}, celedonio() → bool, talk(id), state() }   Debug: ACH.debug.br.vecinos */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var BR = ACH.br = ACH.br || {}; BR.systems = BR.systems || [];
  if (!BR.register) BR.register = function (s) { if (BR.systems.indexOf(s) < 0) BR.systems.push(s); return s; };
  var T = 16, NEAR_R = 26, TOTAL = 30, XP_DATO = 5, XP_PRACTICA = 20, PRACTICA_N = 4;

  /* ---------------- utilidades ---------------- */
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); }
  function sfx(n, d) { if (typeof BR.sfx === 'function') { try { BR.sfx(n, d); return; } catch (e) { /* nada */ } } var a = ACH.audio; if (a && a.emit) { try { a.emit(n, d); } catch (e2) { /* nada */ } } }
  function toast(t) { if (typeof BR.toast === 'function') { try { BR.toast(t); return; } catch (e) { /* nada */ } } if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(t); } catch (e2) { /* nada */ } } }
  function ftext(x, y, s, c) { if (ACH.fx && typeof ACH.fx.text === 'function') { try { ACH.fx.text(x, y, s, c); } catch (e) { /* nada */ } } }
  function W() { return ACH.world || {}; }
  function solidAt(x, y, r) { var w = W(); if (typeof w.collideCircle === 'function') { try { return w.collideCircle(x, y, r || 4); } catch (e) { return false; } } return false; }
  function flag(k, v) { var P = ACH.partida; if (!P || typeof P.flag !== 'function') return v === undefined ? undefined : v; try { return v === undefined ? P.flag('barranco.' + k) : P.flag('barranco.' + k, v); } catch (e) { return undefined; } }
  function has(id) { var I = ACH.inv; return !!(I && I.count && I.count(id) > 0); }
  function take(id, n) { var I = ACH.inv; return !!(I && I.take && I.take(id, n || 1)); }
  function giveItems(x, y, items) {
    var I = ACH.inv; if (!I) return;
    items.forEach(function (it) {
      var left = it.n; try { left = I.add ? I.add(it.id, it.n) : it.n; } catch (e) { left = it.n; }
      if (left > 0 && I.drop) { try { I.drop(x, y, [{ id: it.id, n: left }], false); } catch (e2) { /* nada */ } }
    });
  }
  function dlgOn() { try { return !!(ACH.dialogo && ACH.dialogo.active && ACH.dialogo.active()); } catch (e) { return false; } }
  function shopOn() { try { return !!(ACH.tienda && ACH.tienda.isOpen && ACH.tienda.isOpen()); } catch (e) { return false; } }
  function talk(lines, cb) {
    var fn = BR.talk || (ACH.cv && ACH.cv.talk);
    if (typeof fn === 'function') { try { return fn(lines, cb); } catch (e) { /* respaldo */ } }
    var D = ACH.dialogo, done = function () { if (cb) { try { cb(); } catch (e2) { console.warn('[ACHORADO br] vecinos.talk', e2); } } };
    if (!D || typeof D.play !== 'function') { done(); return false; }
    var ok = false; try { ok = D.play(lines, { onDone: done }); } catch (e3) { ok = false; }
    if (!ok) done();
    return ok;
  }
  function onTime(tol) { var O = BR.objetos; if (O && typeof O.onTime === 'function') return O.onTime(tol); try { return !!(ACH.hab && ACH.hab.onBeat && ACH.hab.onBeat(tol)); } catch (e) { return false; } }
  function beat() {
    try { if (typeof BR.beat === 'function') { var b = BR.beat(); if (b && b.bpm > 0) return b; } } catch (e) { /* respaldo */ }
    try { if (ACH.hab && ACH.hab.beat) return ACH.hab.beat(); } catch (e2) { /* nada */ }
    return { bpm: 100, phase: 0, toNext: 0.6 };
  }
  function metroTol() { var tol = 0.12; try { var M = ACH.hab && ACH.hab.metro && ACH.hab.metro(); if (M && M.on) tol = Math.max(tol, M.tol); } catch (e) { /* nada */ } return tol; }
  function addXP(n, motivo) { try { if (ACH.hab && typeof ACH.hab.addXP === 'function') return ACH.hab.addXP(n, motivo); } catch (e) { /* nada */ } return 0; }

  /* =====================================================================================
     LOS VECINOS Y SUS DATOS (todos de ../diseno/investigacion-barranco.md §5 y §6.1; [voz del personaje, texto del diario])
     ===================================================================================== */
  function L(quien, nombre, cara, texto) { return { quien: quien, nombre: nombre, cara: cara || 'habla', texto: texto }; }
  function AX(cara, texto) { return { quien: 'alexander', cara: cara, texto: texto }; }
  var V = [
    { id: 'tomas', name: 'DON TOMÁS', shop: 'tomas', at: ['tomas', 'playa', 'orilla'], off: [0, 0], col: { a: '#3a5a7a', b: '#e8dcc0', hat: '#d8c48f', skin: '#a8724e' },
      intro: [
        L('tomas', 'DON TOMÁS', 'sorpresa', '¡Eh, joven! Cuidado con mis redes. ¿Bajaste del cielo con esa paloma de tela?'),
        AX('risa', 'Parapente, don. Y aterricé como un campeón… casi.'),
        L('tomas', 'DON TOMÁS', 'feliz', 'Tomás, pescador de toda la vida. Si quieres saber de esta playa, pregúntame. Y si tienes hambre, también.')],
      datos: [
        ['En los años 30 las casonas de arriba, pegaditas al acantilado, tapaban la vista del mar. Por eso hicieron este sitio público pa\' que todos pudieran mirarlo: la playa Baños de Barranco.',
          'En los años 30 las casonas junto al acantilado tapaban la vista al mar: por eso se hizo un lugar público para mirarlo, la playa Baños de Barranco.'],
        ['Los Baños de Barranco se pusieron de moda en los años 20, joven, en el gobierno de Leguía.',
          'Los Baños de Barranco se pusieron de moda en los años 20, durante el gobierno de Leguía.'],
        ['¿Sabes por qué la playa Las Sombrillas se llama así? Por unas sombrillas de bambú con hojas de palmera que pusieron al comienzo.',
          'La playa Las Sombrillas se llama así por unas sombrillas de bambú con hojas de palmera que se pusieron al comienzo.'],
        ['En el verano de 2025 la Municipalidad declaró «intangibles» Las Sombrillas y Los Yuyos: ahí no se entra con comida, mascotas ni trago.',
          'En el verano de 2025 la Municipalidad declaró «intangibles» las playas Las Sombrillas y Los Yuyos: sin comida, mascotas ni alcohol.'],
        ['Esta playa de aquí es de piedritas y canto rodado, no de arena. La arena la encuentras más al sur, en Los Yuyos y Las Sombrillas.',
          'La playa al pie de la Bajada de Baños es de piedra y guijarro; las playas de arena de Barranco están más al sur: Los Yuyos y Las Sombrillas.'],
        ['¿Ves ese cerro allá al sur? Es el Morro Solar, en Chorrillos: unos 251 metros. Arriba está el Cristo del Pacífico, blanco, de 37 metros, desde 2011. De noche se prende.',
          'Desde la playa se ve el Morro Solar (Chorrillos), de unos 251 m, con el Cristo del Pacífico: blanco, de 37 m, instalado en 2011, se ilumina de noche.']],
      react: { 5: [AX('serio', 'El Morro Solar… Para allá apuntan todas las pistas de la cura.')] },
      fin: 'Ya te conté todo, joven. Ahora anda y vívelo.', gift: [{ id: 'pescadoFrito', n: 1 }], giftTxt: 'Don Tomás te regaló un pescado frito.' },
    { id: 'rosa', name: 'DOÑA ROSA', shop: 'rosa_br', at: ['rosa', 'puenteB', 'puenteA', 'bajadaCima'], off: [0, 0], col: { a: '#c4202c', b: '#f2e9d0', hat: '#f2e9d0', skin: '#9a6a48' },
      intro: [
        L('rosa', 'DOÑA ROSA', 'feliz', '¡Caserito! ¿Vivo y con hambre? Rosa, anticuchera de esta esquina desde que tengo memoria.'),
        AX('feliz', '¡Doña Rosa! Su carbón se huele desde la playa.'),
        L('rosa', 'DOÑA ROSA', 'habla', 'Pregúntame lo que quieras de la Bajada y del puente, hijito. Lo que sé, lo sé de verdad.')],
      datos: [
        ['Esta Bajada antes era una quebrada, hijito: por aquí bajaban los pescadores desde Surco hasta el mar.',
          'La Bajada de Baños era una quebrada por donde los pescadores bajaban desde Surco hasta el mar.'],
        ['Hasta mediados del siglo pasado corría por aquí un arroyito hacia el mar. Después lo taparon.',
          'Hasta mediados del siglo XX corría por la Bajada un arroyito hacia el mar; después lo cubrieron.'],
        ['Hoy la Bajada tiene sus ficus, sus buganvilias, casitas en los cerros que ahora son restaurantes y un mirador al mar.',
          'La Bajada de Baños tiene ficus, buganvilias, ranchos en los acantilados que hoy son restaurantes y un mirador al mar.'],
        ['El paseo de la Bajada es de ladrillo, caserito, con sus casas de colores pastel a los lados.',
          'El paseo de la Bajada de Baños es de ladrillo, con casas de colores pastel.'],
        ['El Puente de los Suspiros se inauguró el 14 de febrero de 1876. ¡El día de San Valentín, imagínate!',
          'El Puente de los Suspiros se inauguró el 14 de febrero de 1876, día de San Valentín.'],
        ['El puente es de madera: mide unos 44 metros de largo, 3 de ancho y está a 8 metros y medio de altura. Y por debajo pasa la Bajada de Baños.',
          'El Puente de los Suspiros es de madera, mide unos 44 m de largo y 3 m de ancho, está a 8,5 m de altura y por debajo pasa la Bajada de Baños.']],
      react: { 4: [AX('picaro', 'Un puente inaugurado en San Valentín… Con razón está lleno de parejas. Muertas, pero parejas.')] },
      fin: 'Ya te conté todo, hijito. Ahora anda y vívelo.', gift: [{ id: 'picarones', n: 1 }], giftTxt: 'Doña Rosa te regaló unos picarones.' },
    { id: 'lucia', name: 'LUCÍA', shop: null, at: ['mirador', 'ermita'], off: [0, 0], col: { a: '#5b3f7a', b: '#e0457b', hat: '#2b2b30', skin: '#c98a6a' },
      intro: [
        L('lucia', 'LUCÍA, LA POETA', 'sorpresa', '¡Ay, un vivo! ¿Sabes de versos? Un poeta muerto me robó mi cuaderno de poemas.'),
        L('lucia', 'LUCÍA, LA POETA', 'triste', '¡Ahí están todos mis versos, y algunos son buenos! Lleva sombrero rojo. Se fue para el Parque Municipal.'),
        AX('picaro', 'Un poeta que roba poemas… Ya se lo traigo, señorita.')],
      datos: [
        ['Dice la leyenda que si cruzas el Puente de los Suspiros sin respirar y pides un deseo de amor, se cumple. Yo lo intenté. Me ahogué en el segundo tablón.',
          'La leyenda dice que si cruzas el Puente de los Suspiros sin respirar y pides un deseo (de amor), se cumple.'],
        ['Dicen que se llama «de los suspiros» porque era donde se encontraban los enamorados. Hay otro rumor, solo rumor: una hija de comerciante rico suspiraba mirando el puente por su enamorado, un barrendero.',
          'Se dice que el Puente de los Suspiros se llama así porque era el punto de encuentro de los enamorados (otro rumor habla de una hija de comerciante rico enamorada de un barrendero).'],
        ['La Ermita nació como una capillita, hacia mediados del siglo XVIII. La leyenda cuenta que dos pescadores perdidos llegaron a la orilla guiados por la luz de una cruz.',
          'La Ermita nació como capillita hacia mediados del siglo XVIII; según la leyenda, dos pescadores perdidos llegaron a la orilla guiados por la luz de una cruz.'],
        ['La Ermita fue capital del distrito en 1874. La quemaron en 1881, la reconstruyeron en 1882, y está cerrada desde el terremoto de 1974.',
          'La Ermita fue capital del distrito en 1874, fue quemada en 1881, reconstruida en 1882 y está cerrada desde el terremoto de 1974.'],
        ['En Barranco vivieron poetas de verdad: José María Eguren, con su casa en la esquina de Colón 202, y Abraham Valdelomar, en el pasaje Ábregú.',
          'En Barranco vivieron los poetas José María Eguren (casa en la esquina de Colón 202) y Abraham Valdelomar (casa en el pasaje Ábregú).'],
        ['El joven Martín Adán iba a las tertulias de los domingos en la casa de Eguren. De muy joven escribió «La casa de cartón», sobre sus andanzas por Barranco.',
          'El joven Martín Adán iba a las tertulias de los domingos en casa de Eguren; escribió «La casa de cartón» sobre sus andanzas en Barranco.']],
      react: { 0: [AX('risa', '¿Sin respirar? Con los muertos atrás, ni respirando llego.')] },
      fin: 'Ya te conté todo, muchacho. Ahora anda y vívelo… y si puedes, escríbelo.', gift: [{ id: 'sencillo', n: 2 }], giftTxt: 'Lucía te regaló 2 sencillos.' },
    { id: 'lucho', name: 'LUCHO', shop: 'lucho', at: ['lucho', 'bohemia2', 'bohemia1'], off: [0, 0], col: { a: '#1e2236', b: '#f1eee4', hat: '#131015', skin: '#b88660' },
      intro: [
        L('lucho', 'LUCHO', 'feliz', '¡Compadre! Pasa rápido, que los de la jarana no avisan. Lucho, el de la barra de esta casona.'),
        AX('sorpresa', '¿Y todavía atiendes, causa?'),
        L('lucho', 'LUCHO', 'habla', 'La barra nunca cierra, compadre. Botellas, cajones, lo que necesites. Y si quieres, te cuento del barrio.')],
      datos: [
        ['El Parque Municipal se inauguró el 13 de febrero de 1898, compadre, con el alcalde Pedro Solari. Otra fuente dice 1899, pero la cosa es así: es viejito.',
          'El Parque Municipal de Barranco se inauguró el 13 de febrero de 1898 (otra fuente dice 1899), siendo alcalde Pedro Solari.'],
        ['En el centro del parque hay una escultura de mármol de una Danaide sobre un espejo de agua, de 1906. Al parque lo remodelaron en 1943.',
          'En el centro del Parque Municipal hay una escultura de mármol de una Danaide sobre un espejo de agua (1906); el parque se remodeló en 1943.'],
        ['Barranco tiene una Zona Monumental declarada el 28 de diciembre de 1972, con unas 256 casonas registradas. Esta barra está en una de ellas.',
          'Barranco tiene una Zona Monumental declarada el 28 de diciembre de 1972, con unas 256 casonas registradas.'],
        ['Barranco fue balneario de moda, compadre: familias limeñas con plata y extranjeros se hicieron casonas y ranchos al estilo europeo.',
          'Barranco fue un balneario de moda para familias limeñas ricas y extranjeros, que construyeron casonas y ranchos al estilo europeo.'],
        ['El tren de Lima a Chorrillos llegó a Barranco en 1858. Los tranvías eléctricos empezaron en 1906 y dejaron de pasar en 1965.',
          'El tren Lima–Chorrillos llegó a Barranco en 1858; los tranvías eléctricos empezaron en 1906 y dejaron de circular en 1965.'],
        ['Desde los años 60 muchos artistas se mudaron a Barranco con sus talleres. Por eso aquí todo el mundo pinta, canta o escribe… o dice que lo hace.',
          'Desde los años 60 muchos artistas se mudaron a Barranco con sus talleres.']],
      react: { 4: [AX('serio', 'Un tren hasta Chorrillos… Ojalá todavía pasara. Me ahorraba la caminata.')] },
      fin: 'Ya te conté todo, compadre. Ahora anda y vívelo.', gift: [{ id: 'sencillo', n: 2 }], giftTxt: 'Lucho te regaló 2 sencillos.' },
    { id: 'celedonio', name: 'DON CELEDONIO', shop: 'celedonio', at: ['celedonio', 'penaPuerta'], off: [0, 0], col: { a: '#f1eee4', b: '#1e2236', hat: '#d8c48f', skin: '#8a5a3a' },
      intro: null,   // su presentación es la enseñanza (TEACH)
      datos: [
        ['En 1960 Chabuca Granda le dedicó un vals, «El puente de los suspiros», y desde ahí el nombre del puente se hizo famoso en todo el Perú.',
          'En 1960 Chabuca Granda le dedicó al puente el vals «El puente de los suspiros», y por eso el nombre se hizo famoso.'],
        ['La obra de Chabuca fue declarada Patrimonio Cultural de la Nación en 2017, y desde 2021 está en el billete de 10 soles. Respeto, compadre.',
          'La obra de Chabuca Granda fue declarada Patrimonio Cultural de la Nación en 2017 y aparece en el billete de 10 soles desde 2021.'],
        ['El Día de la Canción Criolla es el 31 de octubre: lo decidió el presidente Manuel Prado con una resolución del 18 de octubre de 1944. Ese día las peñas revientan.',
          'El Día de la Canción Criolla es el 31 de octubre, por resolución del presidente Manuel Prado del 18 de octubre de 1944.'],
        ['La Peña Don Porfirio lleva unos 40 años y La Oficina 32. En La Oficina caben unas 80 personas. Yo he tocado en peñas más chiquitas y con más gente, la cosa es así.',
          'La Peña Don Porfirio lleva unos 40 años y La Oficina 32; en La Oficina caben unas 80 personas.'],
        ['El cajón es de origen afroperuano, muchacho. En 1977 Paco de Lucía lo conoció en Lima y se lo llevó al flamenco.',
          'El cajón es de origen afroperuano; en 1977 Paco de Lucía lo conoció en Lima y lo llevó al flamenco.'],
        ['Antes el vals criollo se tocaba con guitarras, palmas y voz nomás. El cajón se le añadió recién a mediados del siglo XX.',
          'Antes el vals criollo se tocaba con guitarras, palmas y voz; el cajón se le añadió a mediados del siglo XX.']],
      react: { 4: [AX('feliz', 'El cajón dio la vuelta al mundo y yo con miedo de salir del Callao.')] },
      fin: 'Ya te conté todo, compadre. Ahora anda y vívelo.', gift: [{ id: 'emoliente', n: 1 }], giftTxt: 'Don Celedonio te regaló un emoliente.' }
  ];
  var BYID = {}; V.forEach(function (v) { BYID[v.id] = v; });
  function CL(cara, texto) { return L('celedonio', 'DON CELEDONIO', cara, texto); }
  var TEACH = [
    CL('sorpresa', '¡Psst! ¡Muchacho, por aquí, al zaguán! ¿Esa guitarra es tuya?'),
    AX('sorpresa', '¿Usted está vivo? ¡Ni un rasguño, maestro!'),
    CL('habla', 'Celedonio, para servirle. Treinta años fui la guitarra de Jaranón, la Voz de Oro de Barranco.'),
    CL('triste', 'Cuando llegó la plaga, él se quedó cantando. No para, compadre. Canta y canta ahí en la peña, y el que se le acerca…'),
    AX('triste', 'Mi abuela lo escuchaba en la radio todos los domingos…'),
    CL('serio', 'Entonces escucha bien: a Jaranón no se le gana gritando, se le gana respondiendo a tiempo.'),
    CL('habla', 'Él canta, tú respondes. Un golpe a tiempo vale por tres a destiempo. Toma: este es el Landó del Contrapunto.'),
    AX('risa', '¡Ya está, maestro! Con la T le respondo. Al compás, como debe ser.')];
  var PISTA8 = [
    CL('serio', 'Y otra cosa: antes de que Jaranón se quedara cantando, unos de bata blanca preguntaron en la peña por el camino al Morro Solar. Dijeron «Agua Dulce» y bajaron a la playa.'),
    AX('serio', 'Agua Dulce… Lo mismo que repetía la radio del club de pesca. Todo apunta a Chorrillos.'),
    CL('feliz', 'Ahí tienes mi muñeco de práctica: dale cuatro golpes a tiempo, que el metrónomo no miente. La peña ya está abierta.')];
  var LUCIA_OK = [
    L('lucia', 'LUCÍA, LA POETA', 'feliz', '¡Mis versos! ¡Y sin una mancha nueva! Gracias, muchacho.'),
    L('lucia', 'LUCÍA, LA POETA', 'serio', 'Te pago con un secreto: desde el mirador, de noche, veo una lucecita que se prende y se apaga en el Morro Solar. Siempre a la misma hora.'),
    AX('serio', '¿En el Morro? Igualito a lo que vio Chalo volando. Alguien está trabajando allá arriba.'),
    L('lucia', 'LUCÍA, LA POETA', 'habla', 'Y toma estas dos botellas doradas. Las guardaba pa\' un brindis, pero la poesía puede esperar.')];
  var CURA7 = ['cura-7', 'La lucecita del Morro', 'Lucía, la poeta de Barranco: «Desde el mirador, de noche, veo una lucecita que se prende y se apaga en el Morro Solar. Siempre a la misma hora.»'];
  var CURA8 = ['cura-8', 'Bata blanca rumbo al Morro', 'Don Celedonio, guitarrista de Barranco: «Unos de bata blanca preguntaron en la peña por el camino al Morro Solar. Dijeron "Agua Dulce" y bajaron a la playa.»'];

  /* ---------------- estado ---------------- */
  var poet = { z: null, dropped: false, spawned: false, retryT: 0 };
  var dummy = { x: 0, y: 0, on: false, hits: 0, done: false, lastT: -9, flashT: 0, txt: null };
  var near = null, menu = null, busy = false, placed = false;
  function n0(v) { var f = +flag('datos.' + v.id) || 0; return Math.max(f, diaryCount(v.id)); }
  function diaryEntries() { try { var O = ACH.objetivo; return O && O.entradas ? O.entradas() : []; } catch (e) { return []; } }
  function diaryCount(id) { var pre = 'br-dato-' + id + '-', n = 0; diaryEntries().forEach(function (e) { if (e.id.indexOf(pre) === 0) n++; }); return Math.min(6, n); }
  function totalHeard() { var n = 0; diaryEntries().forEach(function (e) { if (e.id.indexOf('br-dato-') === 0) n++; }); return n; }
  function taught() { try { if (flag('celedonio')) return true; } catch (e) { /* nada */ } return false; }

  /* ---------------- ubicaciones ---------------- */
  function pt(q) {
    if (!q) return null;
    if (Array.isArray(q)) return { x: +q[0], y: +q[1] };
    if (q.x !== undefined) return { x: +q.x, y: +q.y };
    if (q.c !== undefined) return { x: (+q.c + 0.5) * T, y: (+q.r + 0.5) * T };
    return null;
  }
  function place(n) { var P = W().places; return P ? pt(P[n]) : null; }
  function freeNear(x, y, r) {
    if (!solidAt(x, y, r || 5)) return { x: x, y: y };
    for (var d = 4; d <= 96; d += 4) for (var a = 0; a < 12; a++) { var nx = x + Math.cos(a / 12 * 6.283) * d, ny = y + Math.sin(a / 12 * 6.283) * d; if (!solidAt(nx, ny, r || 5)) return { x: nx, y: ny }; }
    return { x: x, y: y };
  }
  function startXY() { var w = W(), G = ACH.G, p = G && G.player; if (w.start && w.start.x !== undefined) return { x: w.start.x, y: w.start.y }; return p ? { x: p.x, y: p.y } : { x: 20 * T, y: 20 * T }; }
  function placeAll() {
    var s = startXY(), prov = [];
    V.forEach(function (v, i) {
      var q = null; for (var k = 0; k < v.at.length && !q; k++) q = place(v.at[k]);
      if (!q) { q = { x: s.x + (4 + i * 3) * T, y: s.y + 2 * T }; prov.push(v.id); v.prov = true; } else v.prov = false;
      var f = freeNear(q.x + v.off[0] * T, q.y + v.off[1] * T, 5); v.x = f.x; v.y = f.y;
    });
    var c = BYID.celedonio, dq = freeNear(c.x + 2.2 * T, c.y + 0.4 * T, 5); dummy.x = dq.x; dummy.y = dq.y;
    if (prov.length && !placeAll.warned) { placeAll.warned = true; console.warn('[ACHORADO br] vecinos: sin ACH.world.places para ' + prov.join(', ') + ' (posición provisoria junto al inicio)'); }
    placed = true;
  }

  /* =====================================================================================
     MENÚ CHICHA: CUÉNTAME / COMPRAR / CHAU
     ===================================================================================== */
  var CSS = '#brMenu{position:absolute;left:50%;bottom:calc(var(--u,2px)*58);transform:translateX(-50%) rotate(-.6deg);z-index:7;display:none;flex-direction:column;gap:calc(var(--u,2px)*2);' +
    'min-width:calc(var(--u,2px)*150);max-width:92%;padding:calc(var(--u,2px)*4) calc(var(--u,2px)*6);background:#0b0a0d;border:calc(var(--u,2px)*1) solid #ff2e88;box-shadow:calc(var(--u,2px)*2) calc(var(--u,2px)*2) 0 #ffe500;font-family:var(--display,"Arial Black",sans-serif)}' +
    '#brMenu.on{display:flex}#brMenu .bk{margin:0;font-size:calc(var(--u,2px)*4.5);letter-spacing:.14em;color:#1fe07a;font-family:var(--pixel,monospace)}' +
    '#brMenu h3{margin:0 0 calc(var(--u,2px)*1);font-weight:400;font-size:calc(var(--u,2px)*9);line-height:1;color:#ffe500;text-shadow:calc(var(--u,2px)*1) calc(var(--u,2px)*1) 0 #ff2e88}' +
    '#brMenu button{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--u,2px)*4);font-family:inherit;font-size:calc(var(--u,2px)*6.5);padding:calc(var(--u,2px)*2) calc(var(--u,2px)*4);background:#131015;color:#f2f2f2;border:calc(var(--u,2px)*1) solid #2a2630;cursor:pointer;outline:none;text-align:left;min-height:32px}' +
    '#brMenu button.sel{border-color:#3ad6ff;color:#3ad6ff;background:rgba(58,214,255,.12)}#brMenu button small{font-family:var(--pixel,monospace);font-size:calc(var(--u,2px)*4.5);color:#9a96a2}' +
    '#brMenu button b{color:#ffe500;font-weight:400;margin-right:calc(var(--u,2px)*2)}#brMenu .brm-ft{position:static;margin:0;font-family:var(--pixel,monospace);font-size:calc(var(--u,2px)*4);color:#8a8692;text-align:center}' +
    'body.touch #brMenu .brm-ft{position:static;display:none}body.touch #brMenu button{min-height:44px;font-size:max(13px,calc(var(--u,2px)*6.5))}';
  var EL = null;
  function buildMenu() {
    if (EL) return EL;
    var st = document.getElementById('stage') || document.body;
    var sty = document.createElement('style'); sty.textContent = CSS; document.head.appendChild(sty);
    EL = document.createElement('div'); EL.id = 'brMenu'; EL.setAttribute('data-ui', '');
    EL.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    EL.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null; if (!b || !menu) return;
      e.preventDefault(); e.stopPropagation(); choose(+b.getAttribute('data-i'));
    });
    st.appendChild(EL);
    return EL;
  }
  function optsFor(v) {
    var o = [], n = n0(v);
    o.push({ k: 'cuenta', t: 'CUÉNTAME DE BARRANCO', s: n >= 6 ? 'YA TE LO CONTÓ TODO' : n + '/6' });
    if (v.shop) o.push({ k: 'compra', t: 'COMPRAR', s: '' });
    o.push({ k: 'chau', t: 'CHAU', s: '' });
    return o;
  }
  function renderMenu() {
    if (!menu) return;
    var v = menu.v, h = '<p class="bk">DATOS DE BARRANCO ' + totalHeard() + '/' + TOTAL + '</p><h3>' + v.name + '</h3>';
    menu.opts.forEach(function (o, i) { h += '<button type="button" tabindex="-1" data-i="' + i + '" class="' + (i === menu.sel ? 'sel' : '') + '"><span><b>' + (i + 1) + '</b>' + o.t + '</span><small>' + o.s + '</small></button>'; });
    h += '<p class="brm-ft">↑↓ + ENTER · 1–' + menu.opts.length + ' · ESC = CHAU</p>';
    buildMenu().innerHTML = h;
  }
  // el juego queda en pausa mientras el menú está abierto (game.js congela la simulación con ACH.inv.isOpen, como la tienda)
  // UNA sola vez por página (wrapIsOpen.done), nunca en cada reset. Otros envoltorios (inflables.js `_mira`, tienda.js `_tienda`)
  // miran solo su marca en la CIMA de la cadena y, si no la ven, se vuelven a envolver reasignando su `orig` → recursión infinita.
  // Por eso la envoltura copia las marcas `_xxx` de la función anterior: quien ya estaba en la cadena sigue viéndose "envuelto".
  function wrapIsOpen() {
    var I = ACH.inv; if (wrapIsOpen.done || !I || typeof I.isOpen !== 'function') return;
    for (var f = I.isOpen, guard = 0; f && guard < 32; f = f._brPrev, guard++) if (f._brMenu) { wrapIsOpen.done = true; return; }
    var prev = I.isOpen, w = function () { return !!menu || prev.apply(this, arguments); };
    for (var k in prev) if (Object.prototype.hasOwnProperty.call(prev, k) && k.charAt(0) === '_') w[k] = prev[k];
    w._brMenu = true; w._brPrev = prev;
    I.isOpen = w; wrapIsOpen.done = true;
  }
  function openMenu(v) {
    if (menu || busy) return false;
    wrapIsOpen();
    menu = { v: v, opts: optsFor(v), sel: 0 };
    renderMenu(); EL.classList.add('on');
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    sfx('ui.ok');
    return true;
  }
  function closeMenu(silent) {
    if (!menu) return;
    menu = null; if (EL) EL.classList.remove('on');
    try { if (ACH.input && ACH.input.reset) ACH.input.reset(); } catch (e) { /* nada */ }
    if (!silent) sfx('ui.back');
  }
  function choose(i) {
    if (!menu) return;
    var o = menu.opts[i], v = menu.v; if (!o) return;
    closeMenu(true);
    if (o.k === 'cuenta') tell(v);
    else if (o.k === 'compra') { var O = BR.objetos, ok = O && O.openShop ? O.openShop(v.shop, { x: v.x, y: v.y }) : false; if (!ok) toast(v.name + ': «Ahorita no tengo nada, compadre.»'); }
    else { sfx('ui.back'); }
  }
  try {
    if (ACH.input && ACH.input.addKeyFilter) ACH.input.addKeyFilter(function (e) {
      if (!menu) return false;
      var c = e.code || e.key;
      if (c === 'KeyM' || c === 'F3' || e.ctrlKey || e.metaKey) return false;
      if (e.repeat) return true;
      if (c === 'ArrowUp' || c === 'KeyW') { menu.sel = (menu.sel + menu.opts.length - 1) % menu.opts.length; renderMenu(); sfx('ui.move'); }
      else if (c === 'ArrowDown' || c === 'KeyS') { menu.sel = (menu.sel + 1) % menu.opts.length; renderMenu(); sfx('ui.move'); }
      else if (c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyE') choose(menu.sel);
      else if (c === 'Escape' || c === 'KeyQ') closeMenu(false);
      else { var m = /^(Digit|Numpad)([1-9])$/.exec(c); if (m) choose(+m[2] - 1); }
      return true;
    });
  } catch (e) { console.warn('[ACHORADO br] vecinos keyFilter', e); }
  // si el juego sale de 'playing' (muerte, pausa por foco), el menú se cierra
  setInterval(function () { var G = ACH.G; if (menu && G && G.state !== 'playing') closeMenu(true); }, 250);

  /* =====================================================================================
     HABLAR: presentación, datos, regalos, tarea de Lucía y Don Celedonio
     ===================================================================================== */
  function tell(v) {
    var n = n0(v);
    if (n >= 6) { busy = true; talk([L(v.id, v.name, 'feliz', v.fin)], function () { busy = false; }); return; }
    var d = v.datos[n], lines = [L(v.id, v.name, 'habla', d[0])].concat(v.react && v.react[n] ? v.react[n] : []);
    busy = true;
    talk(lines, function () {
      busy = false;
      flag('datos.' + v.id, n + 1);
      var isNew = false;
      try { var O = ACH.objetivo; if (O && O.diario) isNew = O.diario('br-dato-' + v.id + '-' + (n + 1), 'DATOS DE BARRANCO · ' + (totalHeard() + 1) + '/' + TOTAL, v.name + ': ' + d[1], { quiet: true }); } catch (e) { isNew = false; }
      var tot = totalHeard();
      if (isNew) { addXP(XP_DATO, true); toast('DATOS DE BARRANCO ' + tot + '/' + TOTAL + ' · +' + XP_DATO + ' XP'); sfx('br.dato', { n: tot }); ftext(v.x, v.y - 40, '+' + XP_DATO + ' XP', '#3ad6ff'); }
      else toast('DATOS DE BARRANCO ' + tot + '/' + TOTAL + ' · ya lo tenías en el diario');
      if (n + 1 >= 6 && isNew && !flag('regalo.' + v.id)) {
        flag('regalo.' + v.id, true);
        giveItems(v.x + 10, v.y + 8, v.gift);
        setTimeout(function () { toast(v.giftTxt + ' · ¡te contó los 6 datos!'); sfx('ui.ok'); }, 900);
      }
      if (tot >= TOTAL && isNew) setTimeout(function () { toast('¡DATOS DE BARRANCO 30/30! Ya eres barranquino de corazón.'); }, 1800);
      // vuelve el menú para seguir preguntando
      setTimeout(function () { var G = ACH.G; if (G && G.state === 'playing' && !dlgOn() && !shopOn() && near === v) openMenu(v); }, 60);
    });
  }
  function interact(G, v) {
    if (busy || menu) return;
    if (v.id === 'lucia' && !flag('lucia') && has('cuaderno')) { luciaThanks(G, v); return; }
    if (v.id === 'celedonio' && !taught()) { teach(G, v); return; }
    if (!flag('met.' + v.id) && v.intro) {
      busy = true; flag('met.' + v.id, true);
      talk(v.intro, function () {
        busy = false;
        if (v.id === 'lucia' && !flag('lucia')) toast('Busca al poeta de sombrero rojo en el Parque Municipal: tiene el cuaderno de Lucía');
        setTimeout(function () { if (ACH.G && ACH.G.state === 'playing' && !dlgOn() && near === v) openMenu(v); }, 60);
      });
      return;
    }
    openMenu(v);
  }
  function luciaThanks(G, v) {
    busy = true; flag('met.lucia', true);
    take('cuaderno');
    talk(LUCIA_OK, function () {
      busy = false; flag('lucia', true);
      try { if (ACH.objetivo && ACH.objetivo.diario) ACH.objetivo.diario(CURA7[0], CURA7[1], CURA7[2]); } catch (e) { /* nada */ }
      giveItems(v.x + 10, v.y + 8, [{ id: 'botellaDorada', n: 2 }]);
      toast('Lucía te regaló 2 botellas doradas · Pista de la cura en el DIARIO');
      sfx('ui.ok'); ftext(v.x, v.y - 40, '¡GRACIAS!', '#1fe07a');
    });
  }
  function teach(G, v) {
    busy = true; flag('met.celedonio', true);
    talk(TEACH, function () {
      var r = 'no';
      try { if (ACH.hab && typeof ACH.hab.teach === 'function') r = ACH.hab.teach('contrapunto', 'Don Celedonio'); } catch (e) { r = 'no'; }
      if (r === 'no') toast('Don Celedonio te enseñó el LANDÓ DEL CONTRAPUNTO · tecla T');
      flag('celedonio', true);
      try { if (typeof BR.abrirPena === 'function') BR.abrirPena('celedonio'); } catch (e2) { /* nada */ }
      sfx('hab.contrapunto', { x: v.x, y: v.y });
      setTimeout(function () {
        talk(PISTA8, function () {
          busy = false;
          try { if (ACH.objetivo && ACH.objetivo.diario) ACH.objetivo.diario(CURA8[0], CURA8[1], CURA8[2]); } catch (e3) { /* nada */ }
          try { if (ACH.objetivo && ACH.objetivo.set) ACH.objetivo.set('Entra a la Peña La Última Jarana · T = Landó del Contrapunto'); } catch (e4) { /* nada */ }
          toast('¡La peña está abierta! · Practica con el muñeco: 4 golpes a tiempo');
        });
      }, 250);
    });
  }

  /* =====================================================================================
     EL POETA DEL SOMBRERO ROJO (mini-tarea de Lucía)
     ===================================================================================== */
  function zTypeOk(t) { var E = ACH.ent; return !!(E && E.ZT && E.ZT[t]); }
  function spawnPoet(G) {
    var E = ACH.ent; if (!E || !E.makeZombie || !G || !G.zombies) return;
    var q = place('parque') || place('biblioteca'); if (!q) { var s = startXY(); q = { x: s.x + 30 * T, y: s.y }; }
    var f = freeNear(q.x + 3 * T, q.y + 2 * T, 6), type = zTypeOk('br_poeta') ? 'br_poeta' : 'caminante';
    var z = E.makeZombie(type, f.x, f.y);
    z.brCuaderno = true; z.hp = z.hpMax = Math.max(z.hp || 3, 3);
    try { var Z = ACH.sprites && ACH.sprites.zvar; if (Z && Z.br_poetaRojo) z.skin = 'br_poetaRojo'; else z.brMark = true; } catch (e) { z.brMark = true; }
    G.zombies.push(z); poet.z = z; poet.spawned = true;
  }
  function updatePoet(G, dt) {
    if (flag('lucia') || poet.dropped || flag('cuaderno')) return;
    if (!poet.spawned) { spawnPoet(G); return; }
    var z = poet.z;
    if (z && z.state === 'muerto') {
      poet.dropped = true; flag('cuaderno', true);
      try { if (ACH.inv && ACH.inv.drop) ACH.inv.drop(z.x, z.y, [{ id: 'cuaderno', n: 1 }], false); } catch (e) { /* nada */ }
      ftext(z.x, z.y - 30, '¡EL CUADERNO!', '#ff5a6a'); toast('¡El poeta soltó el cuaderno de Lucía! Recógelo y llévaselo al mirador.');
      return;
    }
    // si desapareció de la lista (reinicio de zombies), vuelve a aparecer cuando Alexander esté lejos
    if (z && G.zombies.indexOf(z) < 0) {
      poet.retryT -= dt; if (poet.retryT > 0) return; poet.retryT = 3;
      var q = place('parque'), p = G.player; if (!q || !p || dist(p.x, p.y, q.x, q.y) > 360) spawnPoet(G);
    }
  }

  /* =====================================================================================
     MUÑECO DE PRÁCTICA (junto a Don Celedonio, cuando ya enseñó)
     ===================================================================================== */
  function dummyHit(G, kind) {
    if (!dummy.on || dummy.done) return;
    var now = G.clock || 0; if (now - dummy.lastT < 0.25) return; dummy.lastT = now;
    dummy.flashT = 0.25;
    if (onTime(metroTol())) {
      dummy.hits++;
      ftext(dummy.x, dummy.y - 36, '¡A TIEMPO! ' + dummy.hits + '/' + PRACTICA_N, '#3ad6ff');
      sfx('hab.contrapunto.atiempo', { x: dummy.x, y: dummy.y });
      if (dummy.hits >= PRACTICA_N) {
        dummy.done = true; flag('practica', true);
        addXP(XP_PRACTICA, 'práctica con Don Celedonio');
        setTimeout(function () { toast('Don Celedonio: «¡Eso es jarana, compadre! Así se le responde a Jaranón.»'); }, 700);
      }
    } else { ftext(dummy.x, dummy.y - 36, '¡A DESTIEMPO!', '#ff8a5a'); sfx('punch.hit', { x: dummy.x, y: dummy.y }); }
  }
  function swingReaches(sw) {
    var dx = dummy.x - sw.x, dy = dummy.y - sw.y, d = Math.sqrt(dx * dx + dy * dy), R = (sw.range || 20) + 7;
    if (d > R) return false;
    if (d > 4 && sw.arc && sw.arc < 6) { var a = Math.atan2(dy, dx) - (sw.ang || 0); while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; if (Math.abs(a) > sw.arc / 2 + 0.2) return false; }
    return true;
  }

  /* =====================================================================================
     E: envolver ACH.armas.update (el vecino gana a lo demás) · contexto táctil
     ===================================================================================== */
  function computeNear(G) {
    var p = G.player; near = null; if (!p || p.hp <= 0 || !placed) return;
    var bd = NEAR_R;
    for (var i = 0; i < V.length; i++) { var d = dist(p.x, p.y, V[i].x, V[i].y); if (d < bd) { bd = d; near = V[i]; } }
  }
  function mask(In, codes, fn) { var op = In.pressed; In.pressed = function (c) { return codes.indexOf(c) >= 0 ? false : op.apply(this, arguments); }; try { return fn(); } finally { In.pressed = op; } }
  function wrapArmas() {
    var A = ACH.armas; if (!A || typeof A.update !== 'function' || A.update._brv) return;
    var origU = A.update, origC = A.context;
    A.update = function (G, dt) {
      var In = ACH.input, self = this, args = arguments;
      try {
        if (G && G.state === 'playing' && G.player && G.player.hp > 0 && In && typeof In.pressed === 'function') {
          computeNear(G);
          if (near && !busy && !menu && !dlgOn() && In.pressed('KeyE')) { var v = near; interact(G, v); return mask(In, ['KeyE'], function () { return origU.apply(self, args); }); }
        } else near = null;
      } catch (e) { if (!wrapArmas.warned) { wrapArmas.warned = true; console.warn('[ACHORADO br] vecinos E', e); } }
      return origU.apply(this, arguments);
    };
    A.update._brv = true;
    if (typeof origC === 'function') {
      A.context = function () { if (near && !busy) return { label: 'HABLAR', code: 'KeyE' }; return origC.apply(this, arguments); };
      A.context._brv = true;
    }
  }

  /* =====================================================================================
     DIBUJO
     ===================================================================================== */
  var PH = {};
  function mk(w, h) { var c = ACH.px && typeof ACH.px.canvas === 'function' ? ACH.px.canvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function phNpc(v, f) {
    var k = v.id + f; if (PH[k]) return PH[k];
    var c = mk(22, 38), g = c.getContext('2d'), K = '#131015', L0 = v.col, bob = f % 2;
    function r(x, y, w, h, col) { g.fillStyle = K; g.fillRect(x - 1, y - 1 + bob, w + 2, h + 2); g.fillStyle = col; g.fillRect(x, y + bob, w, h); }
    r(6, 26, 4, 11, '#3a3a48'); r(12, 26, 4, 11, '#3a3a48'); r(4, 13, 14, 14, L0.a); r(2, 15, 2, 9, L0.a); r(18, 15, 2, 9, L0.a);
    g.fillStyle = L0.b; g.fillRect(6, 16 + bob, 10, 2);
    r(7, 4, 8, 9, L0.skin); g.fillStyle = K; g.fillRect(9, 7 + bob, 1, 1); g.fillRect(12, 7 + bob, 1, 1); g.fillRect(10, 10 + bob, 2, f >= 4 ? 2 : 1);
    r(6, 2, 10, 3, L0.hat);
    if (v.id === 'celedonio') { r(19, 12, 2, 14, '#b07a45'); }            // la guitarra al costado
    if (v.id === 'lucia') { g.fillStyle = '#e0457b'; g.fillRect(4, 13 + bob, 14, 2); }
    if (v.id === 'rosa') { g.fillStyle = '#f2e9d0'; g.fillRect(6, 19 + bob, 10, 8); }
    c.ax = 11; c.ay = 37; PH[k] = c; return c;
  }
  function npcSpr(v, G) {
    var S = ACH.sprites, N = S && S.br && S.br.pj && S.br.pj.npc && S.br.pj.npc[v.id], t = G.clock || 0, talking = (busy && near === v) || (menu && menu.v === v);
    if (N) {
      var arr = talking && Array.isArray(N.habla) && N.habla.length ? N.habla : N.idle, s = Array.isArray(arr) ? arr[Math.floor(t * (talking ? 6 : 3)) % arr.length] : arr;
      if (s && s.width) return s;
    }
    return phNpc(v, talking ? 4 + (Math.floor(t * 6) % 2) : Math.floor(t * 2) % 2);
  }
  function dummySpr() {
    var S = ACH.sprites, D = S && S.br && S.br.lugar && S.br.lugar.munecoPractica; if (Array.isArray(D)) D = D[0];
    if (D && D.width) return D;
    if (PH.dummy) return PH.dummy;
    var c = mk(16, 30), g = c.getContext('2d'), K = '#131015';
    g.fillStyle = K; g.fillRect(7, 8, 3, 22); g.fillRect(1, 11, 15, 4); g.fillRect(3, 0, 10, 10);
    g.fillStyle = '#8a5a32'; g.fillRect(8, 9, 1, 20); g.fillStyle = '#d8c48f'; g.fillRect(2, 12, 13, 2); g.fillRect(4, 1, 8, 8);
    g.fillStyle = '#c4202c'; g.fillRect(6, 4, 4, 2);
    c.ax = 8; c.ay = 29; PH.dummy = c; return c;
  }
  // letrero «E hablar con …» horneado con ACH.px (a5, mayúsculas con Á É Í Ó Ú Ñ); null si no hay fuente de píxeles
  var PROMPTS = {};
  function promptPx(label) {
    if (PROMPTS[label] !== undefined) return PROMPTS[label];
    var X = ACH.px, res = null;
    try {
      if (X && X.G && X.text && X.measure) {
        var s = String(label).toUpperCase(), rest = s.slice(1), w0 = X.measure('E', 'a5'), w = X.measure(s, 'a5') + 6, pg = new X.G(w, 12);
        X.text(pg, 'E', 3, 4, { font: 'a5', ink: '#ffe500' });
        X.text(pg, rest, 3 + w0, 4, { font: 'a5', ink: '#f2f2f2' });
        res = pg.toCanvas();
      }
    } catch (e) { res = null; }
    PROMPTS[label] = res; return res;
  }
  function blit(g, s, x, y, flip) {
    var ax = s.ax !== undefined ? s.ax : s.width >> 1, ay = s.ay !== undefined ? s.ay : s.height - 1;
    if (!flip) { g.drawImage(s, Math.round(x - ax), Math.round(y - ay)); return; }
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(-1, 1); g.drawImage(s, -ax, -ay); g.restore();
  }
  function inView(G, x, y, pad) { var Vw = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, c = G.cam || { x: 0, y: 0 }; return x > c.x - pad && x < c.x + Vw.w + pad && y > c.y - pad && y < c.y + Vw.h + pad; }
  function drawables(G, out) {
    if (!placed) return;
    var p = G.player;
    V.forEach(function (v) {
      if (!inView(G, v.x, v.y, 50)) return;
      out.push({ y: v.y, x: v.x, draw: function (g, cx, cy) {
        g.fillStyle = 'rgba(28,26,34,.35)'; g.fillRect(Math.round(v.x - cx - 8), Math.round(v.y - cy - 1), 16, 3);
        blit(g, npcSpr(v, G), v.x - cx, v.y - cy, !!(p && p.x < v.x - 2));
      } });
    });
    if (dummy.on && inView(G, dummy.x, dummy.y, 40)) out.push({ y: dummy.y, x: dummy.x, draw: function (g, cx, cy) {
      var sh = dummy.flashT > 0 ? Math.round(Math.sin(dummy.flashT * 60) * 1.5) : 0;
      g.fillStyle = 'rgba(28,26,34,.35)'; g.fillRect(Math.round(dummy.x - cx - 7), Math.round(dummy.y - cy - 1), 14, 3);
      blit(g, dummySpr(), dummy.x - cx + sh, dummy.y - cy);
    } });
  }
  function bubble(g, x, y, ch, col, t) {
    var bx = Math.round(x), by = Math.round(y + Math.sin(t * 4) * 1.5);
    g.fillStyle = '#131015'; g.fillRect(bx - 4, by - 5, 9, 11); g.fillStyle = col; g.fillRect(bx - 3, by - 4, 7, 9);
    g.fillStyle = '#131015';
    if (ch === '!') { g.fillRect(bx, by - 3, 1, 4); g.fillRect(bx, by + 2, 1, 1); }
    else { g.fillRect(bx - 2, by + 1, 1, 1); g.fillRect(bx, by + 1, 1, 1); g.fillRect(bx + 2, by + 1, 1, 1); }
  }
  function drawTop(g, G, cx, cy) {
    if (!placed) return;
    var t = G.clock || 0, p = G.player, touch = ACH.touch && ACH.touch.on;
    V.forEach(function (v) {
      if (!inView(G, v.x, v.y, 30)) return;
      var tx = v.x - cx, ty = v.y - cy - 46;
      if (v.id === 'celedonio' && !taught()) bubble(g, tx, ty, '!', '#3ad6ff', t);
      else if (v.id === 'lucia' && !flag('lucia') && (has('cuaderno') || !flag('met.lucia'))) bubble(g, tx, ty, '!', '#ffe500', t);
      else if (!flag('met.' + v.id)) bubble(g, tx, ty, '!', '#ffe500', t);
      else if (n0(v) < 6) bubble(g, tx, ty, '…', '#f2f2f2', t);
    });
    // el poeta marcado (si no hay sprite de sombrero rojo): flechita roja
    var z = poet.z;
    if (z && z.brMark && z.state !== 'muerto' && inView(G, z.x, z.y, 20)) { var zx = Math.round(z.x - cx), zy = Math.round(z.y - cy) - 34 + Math.round(Math.sin(t * 5)); g.fillStyle = '#131015'; g.fillRect(zx - 3, zy - 1, 7, 4); g.fillStyle = '#ff2e3a'; g.fillRect(zx - 2, zy, 5, 2); g.fillRect(zx - 1, zy + 2, 3, 1); }
    // muñeco: metrónomo encima mientras Alexander está cerca
    if (dummy.on && !dummy.done && p && dist(p.x, p.y, dummy.x, dummy.y) < 120 && inView(G, dummy.x, dummy.y, 20)) {
      var b = beat(), ph = b.phase || 0, k = 1 - ph, on = onTime(metroTol()), mx = Math.round(dummy.x - cx), my = Math.round(dummy.y - cy) - 40;
      g.globalAlpha = 0.4 + 0.6 * k; g.strokeStyle = on ? '#ffffff' : '#3ad6ff'; g.lineWidth = on ? 2 : 1;
      g.beginPath(); g.ellipse(mx, my, 6 + 5 * k * k, 4 + 3 * k * k, 0, 0, 6.283); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1;
      for (var i = 0; i < PRACTICA_N; i++) { g.fillStyle = '#131015'; g.fillRect(mx - 9 + i * 5, my + 8, 4, 4); g.fillStyle = i < dummy.hits ? '#3ad6ff' : '#3a3644'; g.fillRect(mx - 8 + i * 5, my + 9, 2, 2); }
    }
    if (touch || !near || busy || menu || G.state !== 'playing' || shopOn()) return;
    var label = near.id === 'lucia' && has('cuaderno') && !flag('lucia') ? 'E devolver el cuaderno' : 'E hablar con ' + near.name.toLowerCase().replace(/(^| )(\S)/g, function (m, a, c) { return a + c.toUpperCase(); });
    var lx = Math.round(near.x - cx), ly = Math.round(near.y - cy - 58), pc = promptPx(label);
    if (pc) {                                                              // fuente de píxeles con tildes (ajustes 2026-11-21: Silkscreen 8 px se comía la tilde de «Lucía»)
      g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(lx - (pc.width >> 1), ly - 6, pc.width, 12);
      g.globalAlpha = 1; g.fillStyle = '#3ad6ff'; g.fillRect(lx - (pc.width >> 1), ly + 6, pc.width, 1);
      g.drawImage(pc, lx - (pc.width >> 1), ly - 6);
      return;
    }
    g.font = '8px Silkscreen, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var w = Math.ceil(g.measureText(label).width) + 6;
    g.globalAlpha = 0.82; g.fillStyle = '#131015'; g.fillRect(lx - (w >> 1), ly - 5, w, 10);
    g.globalAlpha = 1; g.fillStyle = '#3ad6ff'; g.fillRect(lx - (w >> 1), ly + 5, w, 1);
    g.fillStyle = '#f2f2f2'; g.fillText(label, lx, ly);
    g.fillStyle = '#ffe500'; g.fillText('E', lx - (w >> 1) + 3 + Math.ceil(g.measureText('E').width / 2) - 0.5, ly);
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }

  /* =====================================================================================
     SISTEMA
     ===================================================================================== */
  function reset(G) {
    wrapArmas(); wrapIsOpen(); closeMenu(true); busy = false; near = null;
    placeAll();
    poet.z = null; poet.spawned = false; poet.retryT = 0;
    poet.dropped = !!flag('cuaderno') && !flag('lucia');   // al CONTINUAR con el cuaderno ya suelto, no vuelve el poeta
    dummy.hits = 0; dummy.done = !!flag('practica'); dummy.lastT = -9; dummy.on = taught();
  }
  BR.register({
    name: 'vecinos',
    reset: function (G) { try { reset(G); } catch (e) { console.warn('[ACHORADO br] vecinos.reset', e); } },
    onRespawn: function () { closeMenu(true); busy = false; },
    update: function (G, dt) {
      if (!placed) placeAll();
      updatePoet(G, dt);
      if (!dummy.on && taught()) dummy.on = true;
      if (dummy.flashT > 0) dummy.flashT -= dt;
    },
    onSwing: function (G, sw) {
      if (!sw || !dummy.on || dummy.done || sw.kind === 'held:cajon' || /held:botella/.test(sw.kind || '')) return 0;
      if (swingReaches(sw)) dummyHit(G, sw.kind);
      return 0;
    },
    onProjectile: function (G, pr) {
      if (!pr || !dummy.on || dummy.done || pr.kind !== 'cajon') return false;
      var dx = dummy.x - pr.x, dy = (dummy.y - pr.y) * 1.25;
      if (Math.sqrt(dx * dx + dy * dy) <= (pr.r || 56)) dummyHit(G, 'cajon');
      return false;
    },
    drawables: drawables,
    drawTop: drawTop
  });

  /* ---------------- API ---------------- */
  BR.vecinos = {
    list: function () { return V.map(function (v) { return { id: v.id, name: v.name, x: Math.round(v.x), y: Math.round(v.y), datos: n0(v), met: !!flag('met.' + v.id), shop: v.shop, prov: !!v.prov }; }); },
    datos: function () { return { n: totalHeard(), total: TOTAL }; },
    celedonio: taught,
    talk: function (id) { var v = BYID[id], G = ACH.G; if (v && G) interact(G, v); return !!v; },
    state: function () { return { menu: menu ? { v: menu.v.id, sel: menu.sel, opts: menu.opts.map(function (o) { return o.k; }) } : null, busy: busy, near: near ? near.id : null, datos: BR.vecinos.datos(), celedonio: taught(), lucia: !!flag('lucia'),
      poeta: poet.z ? { x: Math.round(poet.z.x), y: Math.round(poet.z.y), state: poet.z.state, type: poet.z.type, skin: poet.z.skin || null, inList: !!(ACH.G && ACH.G.zombies.indexOf(poet.z) >= 0) } : null, cuaderno: poet.dropped,
      muneco: { on: dummy.on, hits: dummy.hits, done: dummy.done, x: Math.round(dummy.x), y: Math.round(dummy.y) } }; },
    DATA: V
  };

  /* ---------------- Debug: ACH.debug.br.vecinos ---------------- */
  var DB = ACH.debug = ACH.debug || {}, DBR = DB.br = DB.br || {};
  DBR.vecinos = {
    tp: function (id) { var v = BYID[id] || V[0]; if (DB.teleport) DB.teleport(v.x - 18, v.y + 4); return BR.vecinos.state(); },
    talk: function (id) { return BR.vecinos.talk(id || 'tomas'); },
    choose: function (i) { choose(i | 0); return BR.vecinos.state(); },
    teach: function () { var G = ACH.G; if (G) teach(G, BYID.celedonio); return 'teach'; },
    poeta: function () { var G = ACH.G, z = poet.z, p = G && G.player; if (z && p) { z.x = p.x + 30; z.y = p.y; } return BR.vecinos.state().poeta; },
    killPoeta: function () { var z = poet.z; if (z && ACH.G) { try { ACH.ent.hitZombie(ACH.G, z, 1, 0, { dmg: 99, src: 'debug' }); } catch (e) { /* nada */ } } return BR.vecinos.state(); },
    muneco: function () { var p = ACH.G && ACH.G.player; if (DB.teleport) DB.teleport(dummy.x - 16, dummy.y + 2); return BR.vecinos.state().muneco; },
    state: function () { return BR.vecinos.state(); }
  };
})();
