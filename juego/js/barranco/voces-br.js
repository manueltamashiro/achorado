/* ACHORADO - js/barranco/voces-br.js  (B3, nivel Barranco)
 * Frases nuevas del nivel. Se registran en la tabla ACH.audio.phrases de voces.js SIN editarlo (voces.js dice «extender aquí»: es una tabla pública), igual que js/costaverde/voces-cv.js.
 * Cómo se dicen:  ACH.audio.say(id, {x, y, who?, always?, force?})  →  habla speechSynthesis + globo de texto. Una frase cada 2,5 s como mínimo (salvo las marcadas always: esas solo guardan 0,45 s).
 * Con id se sortea con su probabilidad `p`; `always:true` en la llamada se la salta. Tono chalaco y barranquino, con humor y sin groserías fuertes. Los versos de Jaranón son inventados (ninguno es de una canción real).
 *
 * Voces (who): voces.js solo conoce alex, zombie, cobrador, vecino, senora y pasajero (tabla privada, no se puede agregar sin editarlo). Se reusan:
 *   zombis (poeta, pintor, músico, novios, jaranero) = 'zombie' (grave y lento; las líneas suben r/p para que se entienda) · Don Jaranón = 'zombie' más grave y pausado ·
 *   Don Tomás, Lucho, Don Celedonio = 'pasajero' (voz de hombre) · Doña Rosa y Lucía = 'senora' (voz de mujer) · Alexander = 'alex'.
 *   Además se envuelve ACH.audio.say para que { who: 'poeta' | 'pintor' | 'musico' | 'novio' | 'novia' | 'pareja' | 'jaranero' | 'jaranon' | 'bohemio' } → zombie,
 *   { who: 'tomas' | 'lucho' | 'celedonio' | 'vendedor' } → pasajero y { who: 'rosa' | 'lucia' } → senora.
 *
 * IDS (nombre exacto para say(id, …); cada uno acepta también la forma con punto: br.<id>)
 *   Zombis      br_poeta «¡Oh, luna de Barranco!» «¡Escucha mis versos!» · br_poetaRojo (el que robó el cuaderno) · br_pintor «¡No te muevas, que te pinto!» · br_musico «¡Una monedita pa'l artista!»
 *               br_pareja «¡Mi amor!» · br_despechado (siempre) «¡¿Por quéee?!» · br_jaranero «¡Jarana, jarana!»
 *   Jaranón     br_jaranonEntrada (siempre) «¡Silencio en la sala! ¡Que aquí canta la Voz de Oro!» · br_jaranonEntrada2 (siempre) «¿Un muchacho con guitarra? ¡A ver si me respondes, compadre!»
 *               br_jaranonPregon (sortea un verso inventado) · br_jaranonResponde (siempre) «¡Responde, compadre!» · br_jaranonLuce «¡Escuchen la Voz de Oro!» (Alexander no respondió)
 *               br_jaranonAire (siempre) «¡Aire, aire, compadre!» · br_jaranonEso «¡Eso es jarana!» · br_jaranonHerido «¡Ay, mi garganta!» · br_jaranonFase2 (siempre) «¡Ahora sí, a bailar!» · br_jaranonFase3 (siempre) «¡Que se oiga el landó!»
 *               br_jaranonMuerte (siempre) «Qué buena jarana, muchacho…»
 *   Vendedores  br_tomas · br_rosa · br_lucho · br_celedonio (presentación) · br_noAlcanza (siempre) «Fiado no hay, compadre, que la jarana se paga» · br_gracias (siempre)
 *   Alexander   br_barranco «¡Barranco, causa!…» · br_cajon «¡A tiempo, causa!» · br_atiempo · br_contrapunto «¡Contrapunto!» · br_resbala «¡Aaay!» · br_botella «¡Salud, compadre!» · br_botellaRota
 *               br_deseo «¡Deseo concedido!…» · br_sinRespirar · br_puente · br_cuaderno «¡Aquí está su cuaderno, Lucía!» · br_peña «¡Qué jarana!» · br_jaranonMuere «Ya, maestro. Ya terminó la función.»
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};

  var Z = { r: 1.1, p: 1.15 };       // los zombis cuyas líneas hay que entender: un poco más rápidos y agudos que la voz base
  function zl(t, s) { var o = { t: t, r: Z.r, p: Z.p }; if (s) o.s = s; return o; }
  function jl(t, s, r, p) { var o = { t: t, r: r || 0.9, p: p || 0.82 }; if (s) o.s = s; return o; }          // Jaranón: grave y pausado, de gigante
  function vl(t, s, r, p) { var o = { t: t, r: r || 1.02 }; if (p) o.p = p; if (s) o.s = s; return o; }       // vendedores vivos
  function al(t, s, r) { var o = { t: t, r: r || 1.05 }; if (s) o.s = s; return o; }                          // Alexander

  var DEFS = {
    // --- zombis bohemios
    br_poeta:      { who: 'zombie', p: 1, lines: [zl('¡Oh, luna de Barranco!', '¡Oh... luna de Barranco!'), zl('¡Escucha mis versos!', '¡Escucha... mis versos!'), zl('Rima, rima, rima…', 'Rima... rima... rima...'), zl('¡Soy poeta, soy poeta!', '¡Soy poeta... soy poeta!')] },
    br_poetaRojo:  { who: 'zombie', p: 1, lines: [zl('¡Mi cuaderno es mío!', '¡Mi cuaderno... es mío!'), zl('¡Versos ajenos, qué sabrosos!', '¡Versos ajenos... qué sabrosos!'), zl('¡Más versos, más versos!', '¡Más versos... más versos!')] },
    br_pintor:     { who: 'zombie', p: 1, lines: [zl('¡No te muevas, que te pinto!', '¡No te muevas... que te pinto!'), zl('¡Un retrato, un retratito!', '¡Un retrato... un retratito!'), zl('¡Qué paleta, qué paleta!', '¡Qué paleta... qué paleta!')] },
    br_musico:     { who: 'zombie', p: 1, lines: [zl('¡Una monedita pa\'l artista!', '¡Una monedita... pal artista!'), zl('¡Gracias, gracias, público!', '¡Gracias... gracias, público!'), zl('¡Una más, una más!', '¡Una más... una más!')] },
    br_pareja:     { who: 'zombie', p: 1, lines: [zl('¡Mi amor!', '¡Mi... amor!'), zl('¡Juntitos, juntitos!', '¡Juntitos... juntitos!'), zl('No me sueltes…', 'No me... sueltes...'), zl('¡Suspiros, suspiros!', '¡Suspiros... suspiros!')] },
    br_despechado: { who: 'zombie', p: 1, always: true, lines: [{ t: '¡¿Por quéee?!', s: '¡¿Por qué?!', r: 1.1, p: 1.25 }, { t: '¡Me dejó plantado!', s: '¡Me dejó... plantado!', r: 1.1, p: 1.25 }, { t: '¡Mi amoooor!', s: '¡Mi... amor!', r: 1.05, p: 1.3 }] },
    br_jaranero:   { who: 'zombie', p: 1, lines: [zl('¡Jarana, jarana!', '¡Jarana... jarana!'), zl('¡A zapatear, a zapatear!', '¡A zapatear... a zapatear!'), zl('¡Que siga la fiesta!', '¡Que siga... la fiesta!')] },

    // --- Don Jaranón, la Voz de Oro de Barranco (zombie cantante, grave y pausado; los versos son inventados)
    br_jaranonEntrada:  { who: 'zombie', p: 1, always: true, lines: [jl('¡Silencio en la sala! ¡Que aquí canta la Voz de Oro!', '¡Silencio en la sala! ... ¡Que aquí canta... la Voz de Oro!')] },
    br_jaranonEntrada2: { who: 'zombie', p: 1, always: true, lines: [jl('¿Un muchacho con guitarra? ¡A ver si me respondes, compadre!', '¿Un muchacho... con guitarra? ¡A ver si me respondes... compadre!')] },
    br_jaranonPregon:   { who: 'zombie', p: 1, lines: [
      jl('¡De la bajada a la peña, todo el barrio me escuchó!', '¡De la bajada... a la peña... todo el barrio me escuchó!'),
      jl('Si el corazón se te muere, que la guitarra te cante.', 'Si el corazón... se te muere... que la guitarra te cante.'),
      jl('Un vals pa\' la luna llena, un festejo pa\' el que baila.', 'Un vals pa la luna llena... un festejo pal que baila.'),
      jl('Ay, que la noche es muy larga y el pisco se me acabó.', 'Ay... que la noche es muy larga... y el pisco se me acabó.'),
      jl('Suspira, puente querido, que aquí nadie se ha callado.', 'Suspira... puente querido... que aquí nadie se ha callado.'),
      jl('¡Mi garganta de oro viejo, nadie me la va a callar!', '¡Mi garganta de oro viejo... nadie me la va a callar!')] },
    br_jaranonResponde: { who: 'zombie', p: 1, always: true, lines: [jl('¡Responde, compadre!', '¡Responde... compadre!', 0.95, 0.9)] },
    br_jaranonLuce:     { who: 'zombie', p: 1, always: true, lines: [jl('¡Escuchen la Voz de Oro!', '¡Escuchen... la Voz de Oro!', 0.95, 0.9)] },
    br_jaranonAire:     { who: 'zombie', p: 1, always: true, lines: [jl('¡Aire, aire, compadre!', '¡Aire... aire, compadre!', 0.85, 0.85)] },
    br_jaranonEso:      { who: 'zombie', p: 0.9, lines: [jl('¡Eso es jarana!', '¡Eso es... jarana!', 0.95, 0.9)] },
    br_jaranonHerido:   { who: 'zombie', p: 0.8, lines: [jl('¡Ay, mi garganta!', '¡Ay... mi garganta!', 0.95, 0.88), jl('¡Esa me dolió, muchacho!', '¡Esa me dolió... muchacho!', 0.95, 0.88)] },
    br_jaranonFase2:    { who: 'zombie', p: 1, always: true, lines: [jl('¡Ahora sí, a bailar!', '¡Ahora sí... a bailar!', 0.95, 0.9)] },
    br_jaranonFase3:    { who: 'zombie', p: 1, always: true, lines: [jl('¡Que se oiga el landó!', '¡Que se oiga... el landó!', 0.85, 0.85)] },
    br_jaranonMuerte:   { who: 'zombie', p: 1, always: true, lines: [jl('Qué buena jarana, muchacho…', 'Qué buena jarana... muchacho...', 0.8, 0.85)] },

    // --- vendedores y sobrevivientes con tienda (presentación, «no alcanza», gracias)
    br_tomas:       { who: 'pasajero', p: 1, lines: [vl('¡Pescadito fresco, recién salido del mar!', '¡Pescadito fresco... recién salido del mar!'), vl('¡Un emolientito pa\' el frío, joven!', '¡Un emolientito pal frío, joven!')] },
    br_rosa:        { who: 'senora', p: 1, lines: [vl('¡Anticuchos, anticuchos calientitos!', null, 1.05), vl('¡Picarones con miel, casero!', null, 1.05), vl('¡Pruebe mi sazón, joven!', null, 1.05)] },
    br_lucho:       { who: 'pasajero', p: 1, lines: [vl('¡Botellas, que la noche es larga!', '¡Botellas... que la noche es larga!'), vl('¡Aquí hay de todo pa\' la jarana!', '¡Aquí hay de todo... pa la jarana!')] },
    br_celedonio:   { who: 'pasajero', p: 1, lines: [vl('Cuerdas y cajones, jóvenes.', 'Cuerdas... y cajones, jóvenes.', 0.95, 0.9)] },
    br_noAlcanza:   { who: 'pasajero', p: 1, always: true, lines: [vl('Fiado no hay, compadre, que la jarana se paga.', 'Fiado no hay... compadre... que la jarana se paga.')] },
    br_gracias:     { who: 'pasajero', p: 1, always: true, lines: [vl('¡Gracias, compadre, que siga la jarana!', '¡Gracias, compadre... que siga la jarana!')] },

    // --- Alexander
    br_barranco:    { who: 'alex', p: 1, always: true, lines: [al('¡Barranco, causa! Aterricé en la playa con todo y paloma.', null, 1.05)] },
    br_cajon:       { who: 'alex', p: 0.7, lines: [al('¡Ritmo, causa!', null, 1.1), al('¡A ver si me siguen!', null, 1.1), al('¡Toma cajón!', null, 1.15)] },
    br_atiempo:     { who: 'alex', p: 0.8, lines: [al('¡A tiempo!', null, 1.15), al('¡Justo en el pulso!', null, 1.15)] },
    br_contrapunto: { who: 'alex', p: 1, always: true, lines: [al('¡Contrapunto!', null, 1.15), al('¡Respondido!', null, 1.15)] },
    br_resbala:     { who: 'alex', p: 0.9, lines: [al('¡Aaay!', null, 1.15), al('¡Qué resbaloso!', null, 1.1), al('¡Uy, patiné!', null, 1.15)] },
    br_botella:     { who: 'alex', p: 0.7, lines: [al('¡Salud, compadre!', null, 1.1), al('¡Va la ronda!', null, 1.1), al('¡Brindo por ti!', null, 1.1)] },
    br_botellaRota: { who: 'alex', p: 0.6, lines: [al('¡Cuidado con los vidrios!', null, 1.05), al('¡Esa se rompió bonito!', null, 1.1)] },
    br_deseo:       { who: 'alex', p: 1, always: true, lines: [al('¡Deseo concedido! Pedí que la cura exista… y que me paguen por cantar.', '¡Deseo concedido! Pedí que la cura exista... y que me paguen por cantar.', 1.05)] },
    br_sinRespirar: { who: 'alex', p: 0.9, lines: [al('Sin respirar, sin respirar…', 'Sin respirar... sin respirar...', 1.0), al('Aguanta el aire, causa.', null, 1.0)] },
    br_puente:      { who: 'alex', p: 0.8, lines: [al('El Puente de los Suspiros, ¡qué bonito!', null, 1.0), al('Aquí todos suspiran, hasta los muertos.', null, 1.0)] },
    br_cuaderno:    { who: 'alex', p: 1, always: true, lines: [al('¡Aquí está su cuaderno, Lucía!', null, 1.05)] },
    br_peña:        { who: 'alex', p: 0.8, lines: [al('¡Qué jarana!', null, 1.1), al('Aquí se arma la fiesta, causa.', null, 1.05)] },
    br_jaranonMuere: { who: 'alex', p: 1, always: true, lines: [al('Ya, maestro. Ya terminó la función.', null, 0.95)] }
  };

  // alias con punto (br.poeta, br.jaranonEntrada…)
  Object.keys(DEFS).forEach(function (k) { DEFS['br.' + k.slice(3)] = DEFS[k]; });
  DEFS.br_pena = DEFS.br_peña; DEFS['br.pena'] = DEFS.br_peña;                           // sin eñe, por comodidad
  DEFS.br_vendedorNoAlcanza = DEFS.br_noAlcanza; DEFS['br.vendedorNoAlcanza'] = DEFS.br_noAlcanza;

  // voces.js solo conoce alex, zombie, cobrador, vecino, senora y pasajero: cualquier otro `who` cae a la voz de Alexander. Se traducen aquí, envolviendo ACH.audio.say (propiedad pública).
  var WHO_MAP = { poeta: 'zombie', pintor: 'zombie', musico: 'zombie', novio: 'zombie', novia: 'zombie', pareja: 'zombie', jaranero: 'zombie', jaranon: 'zombie', bohemio: 'zombie',
    tomas: 'pasajero', lucho: 'pasajero', celedonio: 'pasajero', vendedorBR: 'pasajero', rosa: 'senora', lucia: 'senora' };
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
  A.br = A.br || {};
  A.br.phraseIds = Object.keys(DEFS).filter(function (k) { return k.indexOf('br_') === 0 && k !== 'br_pena' && k !== 'br_vendedorNoAlcanza'; });
})();
