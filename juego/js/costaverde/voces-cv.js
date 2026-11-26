/* ACHORADO - js/costaverde/voces-cv.js  (C3, nivel Costa Verde)
 * Frases nuevas del nivel. Se registran en la tabla ACH.audio.phrases de voces.js SIN editarlo (voces.js dice «extender aquí»: es una tabla pública), igual que js/miraflores/voces-mira.js.
 * Cómo se dicen:  ACH.audio.say(id, {x, y, who?, always?, force?})  →  habla speechSynthesis + globo de texto. Una frase cada 2,5 s como mínimo (salvo las marcadas always: esas solo guardan 0,45 s).
 * Con id se sortea con su probabilidad `p`; `always:true` en la llamada se la salta. Tono chalaco, con humor y sin groserías fuertes. Ni el chef ni nadie imita acentos: habla un maestro cocinero criollo.
 *
 * Voces (who): voces.js solo conoce alex, zombie, cobrador, vecino, senora y pasajero (tabla privada, no se puede agregar sin editarlo). Se reusan:
 *   zombies (corredores, turistas, el Tablazo) = 'zombie' (grave y lento; las líneas suben r/p para que se entienda), heladero, vendedores y chef = 'pasajero' (voz de hombre; el chef con r/p más graves y lentos),
 *   Alexander = 'alex'. Además se envuelve ACH.audio.say para que { who: 'corredor' | 'turista' | 'tablazo' } → zombie y { who: 'heladero' | 'vendedor' | 'chef' } → pasajero.
 *
 * IDS (nombre exacto para say(id, …); cada uno acepta también la forma con punto: cv.<id>)
 *   Zombies     cv_corredor «¡Un kilómetro más!» · cv_turista «¡Selfie, selfie!» · cv_surfista · cv_seguridad · cv_trabajador (cualquier trabajador de Larcomar)
 *   Heladero    cv_heladero «¡Heladooos!»
 *   Vendedores  cv_fosfo · cv_kiosco · cv_deportes · cv_fuente (pregón de presentación) · cv_noAlcanza (siempre) «Aquí es precio Larcomar, joven» · cv_gracias (siempre)
 *   Chef        cv_chefEntrada (siempre) «¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!» · cv_chefEntrada2 (siempre) «En mi cocina nadie toca guitarra, compadre.» · cv_chefLista «¡Pedido listo!»
 *               cv_chefCansado «¡Un tecito, un tecito!» · cv_chefMuerte (siempre) · cv_chefPalitos (aviso del abanico)
 *   Tablazo     cv_tablazoOla «¡Se viene la ola, causa!» · cv_tablazoGrito «¡Tablazo!» · cv_tablazoFurioso (siempre)
 *   Alexander   cv_chefMuere «Ese pedido salió crudo, maestro.» · cv_tablaRasa «¡Tabla rasa, compadre!» · cv_gol · cv_perro · cv_cerebro «¡Cerebro congelado!» · cv_flash · cv_parapente · cv_chorrillos
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};

  var Z = { r: 1.12, p: 1.2 };      // los zombies cuyas líneas hay que entender: un poco más rápidos y agudos que la voz base
  function zl(t, s) { var o = { t: t, r: Z.r, p: Z.p }; if (s) o.s = s; return o; }
  function cl(t, s, r, p) { var o = { t: t, r: r || 0.88, p: p || 0.78 }; if (s) o.s = s; return o; }   // chef: más grave y pausado
  function tl(t, s) { var o = { t: t, r: 1.25, p: 1.35 }; if (s) o.s = s; return o; }                   // el Tablazo: surfista alocado, más agudo y rápido

  var DEFS = {
    // --- zombies del malecón (siguen en lo suyo)
    cv_corredor:    { who: 'zombie', p: 1, lines: [zl('¡Un kilómetro más!', '¡Un kilómetro... más!'), zl('¡Pierna, pierna!', '¡Pierna... pierna!'), zl('¡Sin parar, sin parar!', '¡Sin parar... sin parar!'), zl('Mi reloj marca... cero.', 'Mi reloj marca... cero...')] },
    cv_turista:     { who: 'zombie', p: 1, lines: [zl('¡Selfie, selfie!', '¡Selfie... selfie!'), zl('¡Una foto, una foto!', '¡Una foto... una foto!'), zl('¡Sonríe, por favor!', '¡Sonríe... por favor!'), zl('¿Me toma una foto?', '¿Me toma... una foto?')] },
    cv_surfista:    { who: 'zombie', p: 1, lines: [zl('¡Qué buena ola, causa!', '¡Qué buena ola... causa!'), zl('Hoy no hay mar...', 'Hoy no hay mar...'), zl('¡A la tabla, a la tabla!', '¡A la tabla... a la tabla!')] },
    cv_seguridad:   { who: 'zombie', p: 1, lines: [zl('Por aquí no se pasa.', 'Por aquí... no se pasa...'), zl('Identifíquese, joven.', 'Identifíquese... joven...'), zl('Está prohibido ingresar.', 'Está prohibido... ingresar...')] },
    cv_trabajador:  { who: 'zombie', p: 1, lines: [zl('¿En qué le puedo servir?', '¿En qué le puedo... servir?'), zl('Bienvenido a Larcomar.', 'Bienvenido... a Larcomar...'), zl('Tenemos ofertas...', 'Tenemos ofertas...'), zl('¿Va a pagar con tarjeta?', '¿Va a pagar... con tarjeta?')] },

    // --- el heladero (hombre vivo, voz normal)
    cv_heladero:    { who: 'pasajero', p: 1, lines: [{ t: '¡Heladooos!', r: 0.9 }, { t: '¡Helados, heladitos!', r: 1.0 }, { t: '¡De fresa y de lúcuma!', r: 1.0 }, { t: '¡Heladooos, frescos!', r: 0.95 }] },

    // --- vendedores (presentación la primera vez, «no alcanza», gracias)
    cv_fosfo:       { who: 'pasajero', p: 1, lines: [{ t: '¡Luces de fiesta, barras fosforescentes!', r: 1.05 }, { t: '¡Pa\' que brille la noche, causa!', s: '¡Pa que brille la noche, causa!', r: 1.05 }] },
    cv_kiosco:      { who: 'pasajero', p: 1, lines: [{ t: '¡Pelotas, barras y de todo, joven!', r: 1.05 }] },
    cv_deportes:    { who: 'pasajero', p: 1, lines: [{ t: '¡Pelotas de cuero, canilleras, lo mejor del malecón!', r: 1.05 }] },
    cv_fuente:      { who: 'pasajero', p: 1, lines: [{ t: '¡Arroz chaufa calientito, joven!', r: 1.05 }, { t: '¡Wantán frito y chicha, pase nomás!', r: 1.05 }] },
    cv_noAlcanza:   { who: 'pasajero', p: 1, always: true, lines: [{ t: 'Aquí es precio Larcomar, joven.', r: 1.0 }] },
    cv_gracias:     { who: 'pasajero', p: 1, always: true, lines: [{ t: '¡Gracias, joven, vuelva pronto!', r: 1.05 }] },

    // --- el Maestro Wantán (chef chifa gigante): cocinero criollo, voz grave y pausada, sin imitar acentos
    cv_chefEntrada:  { who: 'pasajero', p: 1, always: true, lines: [cl('¡Mesa cuatro, un cantante al vapor! ¡Y bien cocido!', '¡Mesa cuatro... un cantante al vapor! ¡Y bien cocido!')] },
    cv_chefEntrada2: { who: 'pasajero', p: 1, always: true, lines: [cl('En mi cocina nadie toca guitarra, compadre.', 'En mi cocina... nadie toca guitarra, compadre.')] },
    cv_chefLista:    { who: 'pasajero', p: 1, lines: [cl('¡Pedido listo!'), cl('¡Pedido listo, a la mesa!', '¡Pedido listo... a la mesa!'), cl('¡Salen los wantancitos!')] },
    cv_chefPalitos:  { who: 'pasajero', p: 0.8, lines: [cl('¡Cuidado con los palitos!'), cl('¡A comer, a comer!'), cl('¡Pruebe mi sazón!')] },
    cv_chefCansado:  { who: 'pasajero', p: 1, always: true, lines: [cl('¡Un tecito, un tecito!', '¡Un tecito... un tecito!', 0.8, 0.8)] },
    cv_chefMuerte:   { who: 'pasajero', p: 1, always: true, lines: [cl('¡Se me quemó el arroz...!', '¡Se me quemó... el arroz...!', 0.75, 0.7)] },

    // --- el Tablazo (zombie surfista): grita desde su parapente
    cv_tablazoOla:     { who: 'zombie', p: 1, lines: [tl('¡Se viene la ola, causa!', '¡Se viene la ola... causa!'), tl('¡Ahí viene la ola!', '¡Ahí viene... la ola!'), tl('¡Súbete a la ola!', '¡Súbete... a la ola!')] },
    cv_tablazoGrito:   { who: 'zombie', p: 1, lines: [tl('¡Tablazo!', '¡Tablaaazo!'), tl('¡Tabla va!', '¡Tabla... va!'), tl('¡Cuidado con la tabla!', '¡Cuidado... con la tabla!')] },
    cv_tablazoFurioso: { who: 'zombie', p: 1, always: true, lines: [tl('¡Ahora sí te revuelco!', '¡Ahora sí... te revuelco!'), tl('¡Me hiciste mala ola!', '¡Me hiciste... mala ola!')] },

    // --- Alexander
    cv_chefMuere:   { who: 'alex', p: 1, always: true, lines: [{ t: 'Ese pedido salió crudo, maestro.', r: 1.0 }] },
    cv_tablaRasa:   { who: 'alex', p: 1, always: true, lines: [{ t: '¡Tabla rasa, compadre!', r: 1.05 }] },
    cv_gol:         { who: 'alex', p: 0.9, lines: [{ t: '¡Golazo, pe!', s: '¡Golazo, pé!', r: 1.1 }, { t: '¡Gol de oro, causa!', r: 1.1 }] },
    cv_perro:       { who: 'alex', p: 0.8, lines: [{ t: '¡Sácale, perrito!', r: 1.1 }, { t: '¡Ataca, chusco!', r: 1.1 }, { t: '¡Ve, ve, ve!', r: 1.15 }] },
    cv_cerebro:     { who: 'alex', p: 1, always: true, lines: [{ t: '¡Ay, cerebro congelado!', r: 1.05 }] },
    cv_flash:       { who: 'alex', p: 0.9, lines: [{ t: '¡Mis ojos, mis ojos!', r: 1.15 }, { t: '¡Ese flash me cegó!', r: 1.1 }] },
    cv_parapente:   { who: 'alex', p: 1, lines: [{ t: '¡Titina, agárrate fuerte!', r: 1.1 }, { t: '¡Qué vista, causa!', r: 1.05 }] },
    cv_chorrillos:  { who: 'alex', p: 1, always: true, lines: [{ t: '¡Chorrillos, causa! ¡Aterricé como un campeón!', r: 1.05 }] }
  };

  // alias con punto (cv.corredor, cv.chefEntrada…) y de nombres cortos
  Object.keys(DEFS).forEach(function (k) { DEFS['cv.' + k.slice(3)] = DEFS[k]; });
  DEFS.cv_vendedorNoAlcanza = DEFS.cv_noAlcanza;
  DEFS['cv.vendedorNoAlcanza'] = DEFS.cv_noAlcanza;

  // voces.js solo conoce alex, zombie, cobrador, vecino, senora y pasajero: cualquier otro `who` cae a la voz de Alexander. Se traducen aquí, envolviendo ACH.audio.say (propiedad pública).
  var WHO_MAP = { corredor: 'zombie', turista: 'zombie', surfista: 'zombie', seguridad: 'zombie', tablazo: 'zombie', trabajadorCV: 'zombie', heladero: 'pasajero', vendedor: 'pasajero', chef: 'pasajero' };
  var wrapped = false;
  function wrapSay() {
    if (wrapped || typeof A.say !== 'function') return;
    wrapped = true;
    var orig = A.say;
    A.say = function (what, o) {
      if (o && WHO_MAP[o.who]) { var c = {}; for (var k in o) c[k] = o[k]; c.who = WHO_MAP[o.who]; o = c; }
      return orig.call(A, what, o);
    };
  }

  var done = false;
  function register() {
    var P = A.phrases;
    if (done || !P) return;                         // voces.js aún no cargó: se reintenta al terminar de cargar la página
    done = true;
    Object.keys(DEFS).forEach(function (k) { if (!P[k]) P[k] = DEFS[k]; });
    wrapSay();
  }
  register();
  if (!done) window.addEventListener('load', register);
  A.cv = A.cv || {};
  A.cv.phraseIds = Object.keys(DEFS).filter(function (k) { return k.indexOf('cv_') === 0; });
})();
