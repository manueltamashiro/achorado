/* ACHORADO - js/miraflores/voces-mira.js  (M3, nivel 3: Miraflores)
 * Frases nuevas del nivel. Se registran en la tabla ACH.audio.phrases de voces.js SIN editarlo (voces.js dice «extender aquí»: es una tabla pública).
 * Cómo se dicen:  ACH.audio.say(id, {x, y, who?, always?, force?})  →  habla speechSynthesis + globo de texto. Una frase cada 2,5 s como mínimo
 * (salvo las marcadas always: esas solo guardan 0,45 s). Con id se sortea con su probabilidad `p` (ver abajo); `always:true` en la llamada se la salta.
 * El tono es peruano limeño, con humor y sin groserías; ninguna frase lleva marca registrada.
 *
 * Voces (who): voces.js solo conoce alex, zombie, cobrador, vecino, senora y pasajero (tabla WHO privada). No se puede agregar un `who` nuevo sin editarlo,
 * así que se reusan: la jefa = 'senora' (voz de mujer aguda y enérgica, globo rosa), los trabajadores = 'zombie' (grave y lento, globo verde; las líneas
 * suben r/p para que se entiendan), los vendedores = 'pasajero' (voz de hombre, globo naranja), Alexander = 'alex'.
 *
 * IDS (nombre exacto para say(id, …)):
 *   Jefa        jefaPregon (sortea entre los tres pregones) · jefaUltimo (siempre) · jefaMuerte (siempre)
 *   Trabajadores trab_bembos · trab_starbucks · trab_lalucha · trab_chinawok · trab_belisario · trab_wong · trab_ripley · trab_saga · trab_tailoy
 *               (los mismos <marca> de los skins trab_<marca>) · trabajador (cualquiera, si no se sabe la marca)
 *   Vendedores  vendedorPregon · vendedorGracias · vendedorSinPlata
 *   Alexander   miraInicio · abejas · michi · mielMarca  y, de relleno: piletaMonedas · picaronesMal · cinta
 *   Alias (los nombres que ya usan jefa.js, inflables.js y trabajadores.js): jefaMuere = jefaMuerte · trab.<marca> = trab_<marca> · vendedor.pregon · vendedor.gracias ·
 *   vendedor.sinPlata · picaronSick = picaronesMal · piletaCoins = piletaMonedas.
 * Además se envuelve ACH.audio.say para traducir who 'trabajador' -> zombie, 'vendedor' -> pasajero y 'jefa' -> senora (voces.js los mandaría a la voz de Alexander).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};

  var DEFS = {
    // --- la picaronera (Doña Chancaca): sus pregones
    jefaPregon:  { who: 'senora', p: 1, lines: [
      { t: '¡Picarones, picarones calientitos!', r: 1.05 }, { t: '¡Con su miel de chancaca, caserito!', r: 1.05 },
      { t: '¡Pruebe, pruebe, no sea tímido!', r: 1.05 }] },
    jefaUltimo:  { who: 'senora', p: 1, always: true, lines: [{ t: '¡Último picarón, casero!', r: 1.1, p: 1.05 }] },
    jefaMuerte:  { who: 'senora', p: 1, always: true, lines: [{ t: '¡Se me acabó la masa…!', s: '¡Se me acabó la masa...!', r: 0.78, p: 0.85 }] },

    // --- trabajadores: «siguen en su chamba» (zombies con voz grave y lenta; r/p suben un poco para que se les entienda)
    trab_bembos:    { who: 'zombie', p: 1, lines: [{ t: '¿Lo agrandamos?', s: '¿Lo agrandamos...?', r: 1.15, p: 1.25 }] },
    trab_starbucks: { who: 'zombie', p: 1, lines: [{ t: '¿Su nombre para el vaso?', s: '¿Su nombre para el vaso...?', r: 1.15, p: 1.25 }] },
    trab_lalucha:   { who: 'zombie', p: 1, lines: [{ t: '¿Chicharrón o lechón, casero?', s: '¿Chicharrón... o lechón, casero?', r: 1.15, p: 1.25 }] },
    trab_chinawok:  { who: 'zombie', p: 1, lines: [{ t: '¿Para llevar o para comer aquí?', s: '¿Para llevar... o para comer aquí?', r: 1.15, p: 1.25 }] },
    trab_belisario: { who: 'zombie', p: 1, lines: [{ t: '¿Un cuarto con papas?', s: '¿Un cuarto... con papas?', r: 1.15, p: 1.25 }] },
    trab_wong:      { who: 'zombie', p: 1, lines: [{ t: '¿Tiene su tarjeta de puntos?', s: '¿Tiene su tarjeta... de puntos?', r: 1.15, p: 1.25 }] },
    trab_ripley:    { who: 'zombie', p: 1, lines: [{ t: '¿Desea sacar la tarjeta?', s: '¿Desea sacar... la tarjeta?', r: 1.15, p: 1.25 }, { t: 'Tenemos ofertas…', s: 'Tenemos ofertas...', r: 1.15, p: 1.25 }] },
    trab_saga:      { who: 'zombie', p: 1, lines: [{ t: '¿Desea sacar la tarjeta?', s: '¿Desea sacar... la tarjeta?', r: 1.15, p: 1.25 }, { t: 'Tenemos ofertas…', s: 'Tenemos ofertas...', r: 1.15, p: 1.25 }] },
    trab_tailoy:    { who: 'zombie', p: 1, lines: [{ t: 'Útiles escolares, joven', s: 'Útiles escolares... joven', r: 1.15, p: 1.25 }] },
    trabajador:     { who: 'zombie', p: 1, lines: [] },                // se llena abajo con todas las líneas de los trabajadores

    // --- vendedores de inflables (señores vivos, voz normal de hombre)
    vendedorPregon:   { who: 'pasajero', p: 1, lines: [{ t: '¡Martillos, espadas, burbujas! ¡Pa\' los chiquitos y pa\' reventar muertos!', s: '¡Martillos, espadas, burbujas! ¡Pa los chiquitos y pa reventar muertos!', r: 1.05 }] },
    vendedorGracias:  { who: 'pasajero', p: 1, always: true, lines: [{ t: '¡Gracias, joven, vuelva pronto!', r: 1.05 }] },
    vendedorSinPlata: { who: 'pasajero', p: 1, always: true, lines: [{ t: 'Aquí es precio Miraflores, joven.', r: 1.0 }] },

    // --- v0.13 (T2, KE): la embestida de la jefa, el turista con cámara, el sereno, el jogger, la campana y los gatos
    jefaEmbiste: { who: 'senora', p: 1, always: true, lines: [{ t: '¡Ahí va la carretilla!', r: 1.1, p: 1.05 }, { t: '¡Abran cancha que embisto!', r: 1.1, p: 1.05 }] },
    turista:     { who: 'pasajero', p: 1, always: true, lines: [{ t: '¡Una fotito, causa!', r: 1.05 }, { t: '¡Sonríe, que sales en mi Instagram!', r: 1.05 }] },
    sereno:      { who: 'zombie', p: 1, always: true, lines: [{ t: '¡Alto ahí, no se puede pasar!', s: '¡Alto ahí... no se puede pasar!', r: 1.15, p: 1.2 }] },
    jogger:      { who: 'zombie', p: 1, lines: [{ t: '¡Por la izquierda!', r: 1.2, p: 1.3 }] },
    campana:     { who: 'alex', p: 1, always: true, lines: [{ t: '¡Que repiquen las campanas!', r: 1.05 }, { t: 'Perdón, Virgencita. Era por una buena causa.', r: 1.0 }] },
    gatoQuiere:  { who: 'alex', p: 0.9, lines: [{ t: 'Michi lindo, michi bonito.', r: 1.0 }, { t: 'Qué suavecito eres, causa.', r: 1.0 }] },
    // --- Alexander
    miraInicio: { who: 'alex', p: 1, lines: [{ t: '¿Esto es Miraflores? Hasta los zombies se ven pitucos.', r: 1.0 }] },
    abejas:     { who: 'alex', p: 0.9, lines: [{ t: '¡Abejas no, abejas no!', r: 1.1 }] },
    michi:      { who: 'alex', p: 0.9, lines: [{ t: 'Michi, michi… tú no muerdes, ¿no?', s: 'Michi, michi... tú no muerdes, ¿no?', r: 0.95 }] },
    mielMarca:  { who: 'alex', p: 1, lines: [{ t: 'Aquí hasta la miel es de marca.' }] },
    // relleno (del contrato 4.2 y 4.1): moneda de pileta, picarones con abeja, cinta de embalaje
    piletaMonedas: { who: 'alex', p: 1, lines: [{ t: '¿Quién tira plata a una pileta en pleno fin del mundo?', r: 1.05 }] },
    picaronesMal:  { who: 'alex', p: 1, always: true, lines: [{ t: '¡Esa miel tenía abeja adentro!', r: 1.1 }] },
    cinta:         { who: 'alex', p: 0.8, lines: [{ t: 'La emparchaste, causa.', s: 'La emparchaste, cáusa.' }] }
  };
  ['trab_bembos', 'trab_starbucks', 'trab_lalucha', 'trab_chinawok', 'trab_belisario', 'trab_wong', 'trab_ripley', 'trab_tailoy'].forEach(function (k) { DEFS.trabajador.lines = DEFS.trabajador.lines.concat(DEFS[k].lines); });

  // alias con los nombres que usan jefa.js, inflables.js y trabajadores.js (mismas frases)
  DEFS.jefaMuere = DEFS.jefaMuerte;
  ['bembos', 'starbucks', 'lalucha', 'chinawok', 'belisario', 'wong', 'ripley', 'saga', 'tailoy'].forEach(function (b) { DEFS['trab.' + b] = DEFS['trab_' + b]; });
  DEFS['vendedor.pregon'] = DEFS.vendedorPregon; DEFS['vendedor.gracias'] = DEFS.vendedorGracias; DEFS['vendedor.sinPlata'] = DEFS['vendedor.sinplata'] = DEFS.vendedorSinPlata;
  DEFS.picaronSick = DEFS.picaronesMal; DEFS.piletaCoins = DEFS.piletaMonedas;

  // voces.js solo conoce los `who` alex, zombie, cobrador, vecino, senora y pasajero (tabla privada): cualquier otro cae a la voz de Alexander.
  // Se traducen aquí, envolviendo ACH.audio.say (propiedad pública), para que { who: 'trabajador' | 'vendedor' | 'jefa' } suene como se quiere.
  var WHO_MAP = { trabajador: 'zombie', vendedor: 'pasajero', jefa: 'senora', picaronera: 'senora', turista: 'pasajero', sereno: 'zombie', pintor: 'pasajero' };
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
  A.mira = A.mira || {};
  A.mira.phraseIds = Object.keys(DEFS);
})();
