/* ACHORADO — audio/voces.js (v0.6, F4): frases chalacas.
   ACH.audio.say(id | texto, {who:'alex'|'zombie'|'cobrador'|'vecino', x, y, always, force, rare, h}) → true si se dijo
     · id: clave de ACH.audio.phrases (hit, kill, hurt, lowhp, loot, carBreak, carAlarm, catFlee, dogHit, slingFound, shoot, win, cobrador, zombie, vecino;
       v0.8: sick, guitarLow, guitarBreak, grab, throw, night, invis, incakola).
       v0.8: una frase con `always: true` en su tabla (sick, guitarBreak) se dice siempre: sin sorteo y sin esperar los 2,5 s (solo guarda 0,45 s para no pisarse).
       `incakola` tiene dos listas: `real` (ACH.cfg.marcasReales !== false: «Inca Kola») y `generic` (parodia: sin marca).
       Con un texto cualquiera se dice siempre (sin sorteo). Con id se sortea con su probabilidad (35 % golpe… 70 % muerte, auto roto, botín raro, resortera, ganar).
       `rare:true` usa la probabilidad alta de la frase (loot raro). `always:true` se salta el sorteo; `force:true` se salta además el límite de tiempo.
     · límite global: una frase cada 2,5 s como mínimo (solo `win` y `force` lo atraviesan).
     · voz: speechSynthesis, en este orden: es-PE, es-MX / es-US / es-419 / demás latinas, es-ES, cualquier `es`; se espera a `voiceschanged`.
       Cada `who` tiene su rate y pitch (alex joven y rápido; zombie y cobrador graves y lentos; el cobrador, además, cortado y roto; vecino más agudo).
     · globo de texto 1,5 s sobre quien habla (HTML sobre #stage, calculado con la cámara y la escala entera del juego). Si x,y no vienen y es alex, sigue a Alexander.
     · grabaciones: si ACH.audio.voiceClips[id] existe (AudioBuffer, data URL o un arreglo de ellos) se reproduce por el bus `voces` en vez de la voz sintética.
     · música −4 dB mientras suena (A.duckMusic). Volumen: A.setVolume('voces', v); interruptor: A.setVoicesOn(on) (con M o silencio total tampoco habla).
     · v0.9 (nivel 2): ids senoraBalde, senoraOlla (who 'senora': más aguda y regañona), carretilla (who 'pasajero': el que baja gritando en la carretilla), ole, gallinazo, molotov, tele, escoba.
       senoraBalde, senoraOlla, carretilla y ole se dicen siempre (son avisos de juego: solo guardan 0,45 s para no pisarse); el resto se sortea como los demás.
   ACH.audio.cancelSpeech() corta lo que se esté diciendo.  ACH.debug.say(id) la dice ya (sin sorteo, con el límite de tiempo).

   TABLA DE FRASES: ACH.audio.phrases — extender aquí abajo (marcada). Cada línea es un texto o {t:'texto del globo', s:'texto que lee la voz' | ['trozo','trozo'], r:rate×, p:pitch×}.
   No hay groserías fuertes. Frases y pistas de voz salen de ../diseno/letreros-y-frases-callao.md (§5, §6). */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var A = ACH.audio = ACH.audio || {};

  var MIN_GAP = 2500, BUBBLE_MS = 1500;
  A.voiceClips = A.voiceClips || {};

  /* ===================================================================================================
     TABLA DE FRASES — EXTENDER AQUÍ  (id → {who por defecto, p: probabilidad, pRare, lines: […]})
     =================================================================================================== */
  // Fuente: ../diseno/letreros-y-frases-callao.md §5 y §6 (solo líneas [V]/[C] y sin groserías; «mi llave» y «misho» quedaron fuera por no verificadas).
  // `s` = pista para la voz (§6: «pe» abierta con coma antes, Callao → «cayáo», tilde en la tónica); sin `s` se lee el texto del globo.
  var P = A.phrases = A.phrases || {
    hit:        { who: 'alex', p: 0.35, lines: ['¡Ya pe!', '¡No te pases!', '¡Toma, causa!', '¡Al toque!', '¡Chancado!', '¡Fuera, causa!', '¡Chalaco nomás!', '¡Fuera de acá!',
                  { t: '¡Ahí va, compare!', s: '¡Ahí va, compáre!' }, { t: '¡Manya eso, pe!', s: '¡Mánya eso, pé!' }, { t: '¡Achorado nomás!', s: '¡Achorádo nomás!' }] },
    kill:       { who: 'alex', p: 0.70, lines: [{ t: '¡Chimpún Callao!', s: '¡Chimpún cayáo!' }, { t: '¡Chalaco de pura sepa!', s: '¡Chaláco de pura cepa!' }, { t: '¡Pa\' que aprendas, pe!', s: '¡Pa que aprendas, pé!' },
                  '¡Habla, barrio!', '¡Chancado!', { t: '¡Me achoré, pe!', s: '¡Me achoré, pé!' }, '¡Descansa, causa!'] },
    hurt:       { who: 'alex', p: 0.35, lines: ['¡Qué piña!', '¡Asu!', { t: '¡La pucha!', s: '¡La pútcha!' }, '¡Ay, mi madre!', '¡Ay, mamita!', '¡Auch, causa!'] },
    lowhp:      { who: 'alex', p: 0.60, lines: ['¡Qué piña!', '¡Me dejaron misio!', '¡Ya fuiste!', '¡Mosca, mosca!', { t: '¡Ya no doy más, pe!', s: '¡Ya no doy más, pé!' }, '¡Ayúdame, Diosito!'] },
    loot:       { who: 'alex', p: 0.35, pRare: 0.70, lines: ['¡Yapa!', '¡Esto sí es chamba!', '¡Esto es mío, compare!', '¡Bacán!', '¡Qué paja!', '¡Chévere!', '¡Gracias, pe!'] },
    carBreak:   { who: 'alex', p: 0.70, lines: ['¡Uy, la luna!', { t: '¡Pa\' que no estaciones aquí!', s: '¡Pa que no estaciones aquí!' }, '¡Chatarra nomás!', '¡Ya no arranca, pe!'] },
    carAlarm:   { who: 'alex', p: 0.35, lines: ['¡Cállate, pe!', '¡Qué bulla, causa!', '¡Mosca, mosca!', '¡Ya, ya, ya!'] },
    catFlee:    { who: 'alex', p: 0.35, lines: ['¡Ya, gato, ya!', '¡Ingrato, pe!', '¡No te hago nada, pe!', '¡Perdón, michi!'] },
    dogHit:     { who: 'alex', p: 0.35, lines: ['¡Perdón, perrito!', '¡No muerdas, pe!', '¡Ay, perdón, causa!', '¡Fuera, chusco!'] },
    slingFound: { who: 'alex', p: 0.70, lines: ['¡Bacán, una resortera!', '¡Qué paja, una resortera!', '¡Esto sí es arma, compare!', { t: '¡Manya eso, pe!', s: '¡Mánya eso, pé!' }] },
    shoot:      { who: 'alex', p: 0.25, lines: ['¡Toma, pe!', '¡Ahí va, compare!', '¡Al toque!', '¡Con jebe, causa!'] },
    win:        { who: 'alex', p: 0.70, lines: [{ t: '¡Chimpún Callao!', s: '¡Chimpún cayáo!' }, '¡Chalaco nomás!', { t: '¡Mi barrio, pe!', s: '¡Mi bárrio, pé!' }, '¡Se salvó el barrio!', '¡Compare, esto se celebra con una chelita!'] },
    // el cobrador: «¡Al fondo hay sitio!» a trozos, más grave y lento; si la línea no trae trozos se parte en palabras
    cobrador:   { who: 'cobrador', p: 1.0, lines: [
      { t: '¡Al fondo hay sitio!', s: ['¡Al...', 'fon... fondo...', 'hay... si... tio!'] },
      { t: '¡Al fon... do hay sitio!', s: ['¡Al fon...', 'fon... do...', 'hay sitio...!'] },
      { t: '¡Sube, sube, sube!', s: ['¡Sube...', 'sube...', 'sube!'] },
      { t: '¡Hay sitio al fondo!', s: ['¡Hay...', 'si... sitio...', 'al fon... do!'] },
      '¡Pasaje, pasaje!', '¡Jefe, un sol nomás!' ] },
    zombie:     { who: 'zombie', p: 0.35, lines: [{ t: '¡Jamaaa...!', s: 'Jamaaa...' }, { t: '¡Chelaaa...!', s: 'Chelaaa...' }, { t: '¡Causaaa... ayúdame!', s: 'Causaaa... ayúdame' },
                  { t: '¡Misiooo...!', s: 'Misiooo...' }, '¡Me quedé jato...!', 'Al fondo... hay sitio...'] },
    vecino:     { who: 'vecino', p: 0.35, lines: ['¡No dispares, pata!', '¡Sal de mi jato!', '¡La mancha no se toca!', { t: '¡Aquí hay gente, pe!', s: '¡Aquí hay gente, pé!' }, '¡Llamen al serenazgo!', '¡Mi carrito, no!'] }
  };

  /* ---- v0.8: armas de la calle, la noche y la comida ----
     sick: le cayó mal la comida (SIEMPRE se dice); guitarLow: la guitarra se rajó; guitarBreak: se rompió (SIEMPRE); grab: agarra un arma de la calle; throw: la lanza;
     night: se hizo de noche; invis: Cola Inglesa; incakola: toma Inca Kola (con el interruptor de marcas reales) o una gaseosa genérica.
     Fuente: ../diseno/letreros-y-frases-callao.md §5 y §6: causa, mosca, asu, pe, manyar, achorarse, ya fuiste, piña = mala suerte (no «puñetazo»), pata = amigo. Sin groserías;
     el humor de baño es suave («corro al baño»). «pe» lleva coma y tilde (pé) para que la voz abra la e. */
  var NEWP = {
    sick: { who: 'alex', p: 1, always: true, lines: [
      '¡Ese anticucho era de gato, causa!', '¡Me cayó pesado!', '¡Uy, el huevo estaba de la semana pasada!', '¡Fuiste, estómago!', '¡Me jaló la panza!', '¡Ya me agarró la chamba de la panza!',
      { t: '¡Mi estómago se achoró, pe!', s: '¡Mi estómago se achoró, pé!' }, { t: '¡Uy, ahorita corro al baño, pe!', s: '¡Uy, ahorita corro al baño, pé!' },
      { t: '¡Qué piña de comida, pe!', s: '¡Qué piña de comida, pé!' }] },
    guitarLow: { who: 'alex', p: 0.8, lines: [
      '¡La viola ya no aguanta!', '¡Aguanta, viola, aguanta!', '¡Mi guitarra está que se parte!', { t: '¡Se me rajó la viola, pe!', s: '¡Se me rajó la viola, pé!' },
      '¡Un golpe más y se parte!', '¡Ay, mi guitarrita, resiste!', '¡Cuerdas, no me fallen!'] },
    guitarBreak: { who: 'alex', p: 1, always: true, lines: [
      { t: '¡Nooo, mi guitarra!', s: '¡Nooo... mi guitarra!', r: 0.9, p: 0.95 }, { t: '¡Mi viola, causa!', s: '¡Mi viola... cáusa!', r: 0.92 },
      { t: '¡Nooo, mi viola!', s: '¡Nooo... mi viola!', r: 0.9, p: 0.95 }, { t: '¡Se rompió mi guitarra!', r: 0.95 }, { t: '¡Se fue mi pata fiel!', r: 0.92 },
      { t: '¡Ay, mi guitarra, mi compañera!', r: 0.9 }, { t: '¡Ya fuiste, viola!', r: 0.95 }, { t: '¡Ahora sí, a puñetes nomás!', r: 1.05 }] },
    grab: { who: 'alex', p: 0.35, lines: [
      '¡Esto sí es arma!', '¡Esto me sirve, causa!', '¡Al toque!', '¡Mío, pe!', '¡Prestado nomás!', { t: '¡Manya lo que encontré, pe!', s: '¡Mánya lo que encontré, pé!' }, '¡Ya lo agarré!'] },
    throw: { who: 'alex', p: 0.35, lines: [
      { t: '¡Toma, pe!', s: '¡Toma, pé!' }, '¡Ahí va, compare!', { t: '¡Chancado, pe!', s: '¡Chancádo, pé!' }, '¡Vuela, vuela!', '¡Pa\' que aprendas!', '¡Ábranse, que va!', '¡Con cariño, causa!', '¡Fuera de acá!'] },
    night: { who: 'alex', p: 0.9, lines: [
      '¡Ya se hizo de noche, mosca!', '¡Mosca, mosca, se hizo de noche!', { t: '¡Uy, qué oscuro, pe!', s: '¡Uy, qué oscuro, pé!' }, '¡Ahora sí se pusieron achorados!',
      '¡Los muertos se ponen achorados!', '¡Asu, ya es de noche!', '¡Chalaco, a cuidarse que oscureció!', { t: '¡Se apagó la Gambetta, pe!', s: '¡Se apagó la Gambeta, pé!' }] },
    invis: { who: 'alex', p: 0.6, lines: [
      { t: '¡Ahora no me ven, pe!', s: '¡Ahora no me ven, pé!' }, '¡Soy un fantasma, causa!', { t: '¡Me volví aire, pe!', s: '¡Me volví aire, pé!' }, '¡Invisible nomás!',
      { t: '¡Ni me manyan, pe!', s: '¡Ni me mányan, pé!' }, '¡Burbujitas, ayúdenme!', '¡Ni la mancha me ve!', '¡Con la cola roja, nadie me ve!'] },
    incakola: { who: 'alex', p: 0.7, lines: [], real: [
      '¡Con mi Inca Kola, al toque!', { t: '¡Una Inca Kola y a seguir, pe!', s: '¡Una Inca Kola y a seguir, pé!' }, '¡Inca Kola, la de siempre!', '¡Ahora sí, con Inca Kola!',
      '¡Qué paja la Inca Kola!', '¡Con Inca Kola no me para nadie!'], generic: [
      '¡Con mi gaseosa amarilla, al toque!', { t: '¡Esta gaseosa me da cuerda, pe!', s: '¡Esta gaseosa me da cuerda, pé!' }, '¡Qué paja la gaseosa dorada!', '¡Burbujas pa\' la pelea, causa!',
      '¡Con la gaseosa no me para nadie!', { t: '¡Gaseosa fría y a seguir, pe!', s: '¡Gaseosa fría y a seguir, pé!' }] }
  };
  Object.keys(NEWP).forEach(function (k) { if (!P[k]) P[k] = NEWP[k]; });

  /* ---- v0.9: nivel 2, EL CERRO ----
     senoraBalde / senoraOlla: las señoras zombie (who 'senora') avisan su ataque; carretilla: el pasajero que baja del cerro (who 'pasajero'); ole: Alexander salta la carretilla;
     gallinazo: lo picotean; molotov / tele / escoba: lanza o usa el arma. Sin groserías fuertes: regaño de barrio («sinvergüenza», «malcriado», «atrevido»).
     Fuente: ../diseno/letreros-y-frases-callao.md §5 y §6 y SPEC v0.9 §11. «pe» lleva coma y tilde (pé) para que la voz abra la e. */
  var CERRO = {
    senoraBalde: { who: 'senora', p: 1, always: true, lines: [
      '¡Fuera de mi puerta!', '¡Ahí te va, malcriado!', '¡A ver si te bañas!', '¡Largo de mi casa, sinvergüenza!', { t: '¡Para que te refresques, pe!', s: '¡Para que te refresques, pé!' },
      '¡Toma agüita, atorrante!', '¡Aquí no se pasa, oye!', '¡Anda a ensuciar a otro lado!' ] },
    senoraOlla: { who: 'senora', p: 1, always: true, lines: [
      '¡Toma, sinvergüenza!', '¡Para que aprendas!', '¡Con la olla no se juega!', '¡Te voy a dar con el cucharón!', '¡Aquí se respeta la olla común!',
      '¡Mi olla, mi olla!', { t: '¡Ven pa\' acá, atrevido!', s: '¡Ven pa acá, atrevido!' }, '¡Se me quema el almuerzo por tu culpa!' ] },
    carretilla: { who: 'pasajero', p: 1, always: true, lines: [
      { t: '¡Ahí voooy!', s: '¡Ahí voooooy!', r: 0.85 }, '¡Abran cancha!', '¡Sin frenos, causa!', '¡Cuidado, que bajo!', '¡Ábranse, que no paro!',
      '¡Quítate, quítate!', '¡Aaay, mamita!', '¡Me llevo a todos!' ] },
    ole: { who: 'alex', p: 1, always: true, lines: [
      '¡Olé!', '¡Ni me tocaste!', { t: '¡Casi, pe!', s: '¡Casi, pé!' }, '¡Pasa, pasa!', '¡Cómo no!', '¡Salté como gato!', '¡Esquivando como los buenos!', '¡Ni cosquillas, compare!' ] },
    gallinazo: { who: 'alex', p: 0.4, lines: [
      '¡Fuera, pajarraco!', '¡Todavía no estoy muerto, oe!', '¡No soy tu almuerzo!', '¡Shu, shu, a otro lado!', '¡Pajarraco carroñero!',
      { t: '¡Aquí no hay carne, pe!', s: '¡Aquí no hay carne, pé!' }, '¡Vete a comer basura!' ] },
    molotov: { who: 'alex', p: 0.7, lines: [
      '¡Ahí te va calientito!', { t: '¡A calentarse, pe!', s: '¡A calentarse, pé!' }, '¡Arde, causa!', '¡Fuego, fuego!', '¡Con cariño, y bien calientito!',
      '¡Para que se les pase el frío!', '¡Cuidado, que quema!' ] },
    tele: { who: 'alex', p: 0.7, lines: [
      { t: '¡Mira la tele, pe!', s: '¡Mira la tele, pé!' }, '¡A ver el noticiero!', '¡Toma, tu novela!', '¡Se acabó la programación!', '¡Pa\' que veas el partido!',
      '¡Cambio de canal!', '¡Tele nueva, a ver cómo se ve!', '¡Apagón!' ] },
    escoba: { who: 'alex', p: 0.35, lines: [
      '¡A barrer con ustedes!', '¡Limpieza general!', '¡Fuera, fuera, que barro!', '¡Mi mamá me enseñó a barrer!', '¡Escoba nueva, barre bien!',
      '¡Sacudida, nomás!', '¡A limpiar el barrio, causa!' ] }
  };
  Object.keys(CERRO).forEach(function (k) { if (!P[k]) P[k] = CERRO[k]; });
  function marcasReales() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }
  function poolOf(entry) { return entry.real && entry.generic ? (marcasReales() ? entry.real : entry.generic) : entry.lines; }

  /* ---------------- ajustes por personaje ---------------- */
  var WHO = {
    alex:     { rate: 1.14, pitch: 1.12, g: 'm' },     // joven, algo apurado
    zombie:   { rate: 0.72, pitch: 0.55, g: 'm' },     // grave y lento
    cobrador: { rate: 0.66, pitch: 0.50, g: 'm', broken: true },
    vecino:   { rate: 1.0,  pitch: 1.30, g: 'f' },
    senora:   { rate: 1.04, pitch: 1.45, g: 'f' },     // v0.9: señora zombie del cerro: voz de mujer, aguda, enérgica y regañona
    pasajero: { rate: 0.92, pitch: 0.95, g: 'm' }      // v0.9: grita desde la carretilla, vocales largas
  };
  var LATAM = ['mx', 'us', '419', 'co', 'ar', 'cl', 've', 'ec', 'bo', 'uy', 'py', 'cr', 'pa', 'gt', 'hn', 'ni', 'sv', 'do', 'pr', 'cu'];
  var M_NAMES = /\b(diego|jorge|juan|eddy|reed|rocko|grandpa|carlos|pablo|miguel|alex|andres|andrés|jorge|raul|raúl|enrique|tomas|tomás|pedro|alvaro|álvaro)\b/i;
  var F_NAMES = /\b(paulina|monica|mónica|sandy|shelley|flo|grandma|soledad|francisca|angelica|angélica|isabela|marisol|carlota|camila|lupe|elena|dalia|sabina|valentina|lucia|lucía|maria|maría|paloma|catalina)\b/i;

  var voiceCache = {};
  function langScore(l) {
    l = String(l || '').toLowerCase().replace('_', '-');
    if (l === 'es-pe') return 100;
    if (l.indexOf('es-') === 0) {
      var r = l.slice(3), i = LATAM.indexOf(r);
      if (i >= 0) return 90 - Math.min(i, 8) * 1 - (i > 8 ? 2 : 0);
      if (l === 'es-es') return 60;
      return 70;
    }
    if (l === 'es') return 50;
    return 0;
  }
  function pickVoice(g) {
    if (voiceCache[g] !== undefined) return voiceCache[g];
    var vs = [], best = null, bs = 0, i;
    try { vs = window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch (e) { vs = []; }
    if (!vs || !vs.length) return null;                                  // todavía no cargan: no cachear
    for (i = 0; i < vs.length; i++) {
      var v = vs[i], s = langScore(v.lang);
      if (!s) continue;
      if (v.localService) s += 2;
      if (/premium|enhanced|natural|neural/i.test(v.name)) s += 1.5;
      if (/compact/i.test(v.name)) s -= 1;
      if (g === 'm' && M_NAMES.test(v.name)) s += 5; else if (g === 'f' && F_NAMES.test(v.name)) s += 5;
      else if (g === 'm' && F_NAMES.test(v.name)) s -= 4; else if (g === 'f' && M_NAMES.test(v.name)) s -= 4;
      if (s > bs) { bs = s; best = v; }
    }
    voiceCache[g] = best;
    return best;
  }
  function resetVoices() { voiceCache = {}; }
  try {
    var ss = window.speechSynthesis;
    if (ss) {
      if (ss.addEventListener) ss.addEventListener('voiceschanged', resetVoices); else ss.onvoiceschanged = resetVoices;
      ss.getVoices();                                                      // dispara la carga en Chrome
    }
  } catch (e) { /* sin síntesis de voz */ }
  A.speechVoice = function (who) { var w = WHO[who] || WHO.alex, v = pickVoice(w.g); return v ? { name: v.name, lang: v.lang, local: v.localService } : null; };

  /* ---------------- estado ---------------- */
  var lastAt = -1e9, live = [], bubble = null, bubbleRaf = 0, speakEnd = 0, duckTimer = 0, ducked = false, clipBuf = {}, curSrc = null;

  function rr(a, b) { return a + (b - a) * Math.random(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function G() { return ACH.G || (ACH.game && ACH.game.G) || null; }
  function setDuck(on) {
    if (on === ducked) return;
    ducked = on;
    if (A.duckMusic) { try { A.duckMusic(on, 4); } catch (e) { /* nada */ } }
  }
  function releaseSoon(ms) {
    clearTimeout(duckTimer);
    duckTimer = setTimeout(function () { setDuck(false); }, ms);
  }

  /* ---------------- globo de texto ---------------- */
  var CSS = '.vbub{position:absolute;z-index:40;pointer-events:none;left:0;top:0;width:max-content;max-width:calc(var(--u,2px)*110);text-align:center;' +
    'font-family:var(--pixel,"Silkscreen","Courier New",monospace);font-size:calc(var(--u,2px)*5);line-height:1.2;letter-spacing:.02em;' +
    'color:var(--ink,#131015);background:var(--yellow,#ffe500);border:var(--u,2px) solid var(--ink,#131015);box-shadow:calc(var(--u,2px)*1) calc(var(--u,2px)*1) 0 var(--pink,#ff2e88);' +
    'padding:calc(var(--u,2px)*2) calc(var(--u,2px)*3);transition:opacity .18s linear;will-change:transform}' +
    '.vbub::after{content:"";position:absolute;left:50%;bottom:calc(var(--u,2px)*-4);margin-left:calc(var(--u,2px)*-2);border:calc(var(--u,2px)*2) solid transparent;border-top-color:var(--ink,#131015);border-bottom:0}' +
    '.vbub.zombie{background:#b9e8c0}.vbub.cobrador{background:#ffb400}.vbub.vecino{background:#fff}.vbub.senora{background:#ffc6dd}.vbub.pasajero{background:#ffd9a0}.vbub.out{opacity:0}';
  function ensureCss() {
    if (document.getElementById('voces-css')) return;
    var st = document.createElement('style'); st.id = 'voces-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  function removeBubble() {
    if (bubble && bubble.el && bubble.el.parentNode) bubble.el.parentNode.removeChild(bubble.el);
    bubble = null;
  }
  function placeBubble() {
    if (!bubble) { bubbleRaf = 0; return; }
    var now = performance.now();
    if (now >= bubble.until) { removeBubble(); bubbleRaf = 0; return; }
    if (now >= bubble.until - 180) bubble.el.classList.add('out');
    var g = G(), V = (ACH.render && ACH.render.VIEW) || { w: 480, h: 270 }, stage = document.getElementById('stage');
    if (g && g.cam && stage) {
      if (bubble.follow && bubble.follow.x != null) { bubble.x = bubble.follow.x; bubble.y = bubble.follow.y; }
      var sc = (stage.clientWidth || V.w * 2) / V.w, cx = Math.round(g.cam.x) + (g.shakeX || 0), cy = Math.round(g.cam.y) + (g.shakeY || 0);
      var w = bubble.el.offsetWidth, h = bubble.el.offsetHeight, m = 3 * sc;
      var px = (bubble.x - cx) * sc, py = (bubble.y - bubble.h - cy) * sc - 5 * sc - h;
      var off = px < -w || px > stage.clientWidth + w;                       // el que habla quedó fuera de pantalla: sin globo
      bubble.el.style.visibility = off ? 'hidden' : 'visible';
      px = clamp(px - w / 2, m, Math.max(m, stage.clientWidth - w - m)); py = clamp(py, m, Math.max(m, stage.clientHeight - h - m));
      bubble.el.style.transform = 'translate(' + Math.round(px) + 'px,' + Math.round(py) + 'px)';
    }
    bubbleRaf = requestAnimationFrame(placeBubble);
  }
  function showBubble(text, who, x, y, follow, h, ms) {
    var stage = document.getElementById('stage');
    if (!stage) return;
    ensureCss(); removeBubble();
    var el = document.createElement('div');
    el.className = 'vbub ' + who; el.textContent = text; el.style.visibility = 'hidden';
    stage.appendChild(el);
    bubble = { el: el, x: x, y: y, h: h, follow: follow, until: performance.now() + ms };
    if (!bubbleRaf) bubbleRaf = requestAnimationFrame(placeBubble);
    placeBubble();
    if (bubbleRaf === 0) bubbleRaf = requestAnimationFrame(placeBubble);
  }

  /* ---------------- grabaciones ---------------- */
  function dataToBuffer(ctx, url, key) {
    function done(b) { clipBuf[key] = b; }
    try {
      fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return ctx.decodeAudioData(ab); }).then(done, function () { clipBuf[key] = false; });
    } catch (e) { clipBuf[key] = false; }
  }
  function playClip(id, sp) {
    var c = A.voiceClips && A.voiceClips[id], ctx = A.ctx;
    if (!c || !ctx || ctx.state !== 'running' || !A.bus || !A.bus.voces) return 0;
    if (Array.isArray(c)) c = c[Math.floor(Math.random() * c.length)];
    var buf = null;
    if (typeof c === 'string') {
      if (clipBuf[c] === undefined) { clipBuf[c] = null; dataToBuffer(ctx, c, c); return 0; }       // decodificando: esta vez va la voz sintética
      buf = clipBuf[c] || null;
    } else if (c && typeof c.duration === 'number') buf = c;
    if (!buf) return 0;
    var src = ctx.createBufferSource(), g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    src.buffer = buf; src.playbackRate.value = rr(0.97, 1.03); g.gain.value = sp.gain;
    src.connect(g); if (pan) { pan.pan.value = sp.pan; g.connect(pan); pan.connect(A.bus.voces); } else g.connect(A.bus.voces);
    src.start(); curSrc = src;
    return buf.duration / src.playbackRate.value;
  }

  /* ---------------- síntesis de voz ---------------- */
  function speak(chunks, who, vol) {
    var ss = window.speechSynthesis;
    if (!ss || typeof SpeechSynthesisUtterance === 'undefined') return false;
    var w = WHO[who] || WHO.alex, v = pickVoice(w.g), n = chunks.length, i;
    try { if (ss.speaking || ss.pending) ss.cancel(); } catch (e) { /* nada */ }
    live = [];
    for (i = 0; i < n; i++) {
      var c = chunks[i], u = new SpeechSynthesisUtterance(c.s);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-PE';
      u.rate = clamp(w.rate * (c.r || 1) * rr(0.95, 1.05), 0.1, 3);
      u.pitch = clamp(w.pitch * (c.p || 1) * rr(0.94, 1.06), 0, 2);
      u.volume = vol;
      if (i === 0) u.onstart = function () { setDuck(true); };
      if (i === n - 1) { u.onend = u.onerror = function () { releaseSoon(150); }; }
      live.push(u);
    }
    setDuck(true); releaseSoon(7000);                                    // red de seguridad: Chrome a veces no dispara onend
    for (i = 0; i < n; i++) { try { ss.speak(live[i]); } catch (e) { return false; } }
    return true;
  }
  A.cancelSpeech = function () {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* nada */ }
    try { if (curSrc) curSrc.stop(); } catch (e) { /* nada */ }
    curSrc = null; setDuck(false); removeBubble();
  };

  // el cobrador y los zombies salen cortados: si la línea no trae trozos, se parten en palabras con ritmo y tono que tiemblan
  function chunksOf(line, who) {
    var spoken = typeof line === 'string' ? line : (line.s != null ? line.s : line.t), r = line.r || 1, p = line.p || 1, arr;
    if (Array.isArray(spoken)) arr = spoken.map(function (s) { return { s: s, r: r * rr(0.85, 1.1), p: p * rr(0.85, 1.12) }; });
    else if ((WHO[who] || {}).broken) arr = String(spoken).split(/\s+/).map(function (s) { return { s: s, r: r * rr(0.8, 1.1), p: p * rr(0.8, 1.15) }; });
    else arr = [{ s: String(spoken), r: r, p: p }];
    return arr;
  }

  /* ---------------- API ---------------- */
  A.say = function (what, o) {
    o = o || {};
    try {
      var id = null, entry = null, line, who = o.who, text;
      if (typeof what === 'string' && P[what]) { id = what; entry = P[what]; }
      else if (what == null || what === '') return false;
      if (entry) {
        who = who || entry.who || 'alex';
        var pr = o.rare && entry.pRare != null ? entry.pRare : entry.p;
        if (!o.always && !o.force && !entry.always && Math.random() > pr) return false;
      }
      who = WHO[who] ? who : 'alex';
      var now = performance.now();
      if (!o.force && id !== 'win' && now - lastAt < ((entry && entry.always) || (o.always && id) ? 450 : MIN_GAP)) return false;   // always (sick, guitarBreak, o.always con id): ignora los 2,5 s
      if (entry) { var pool = poolOf(entry); line = pool[Math.floor(Math.random() * pool.length)]; } else line = what;
      text = typeof line === 'string' ? line : line.t;

      // posición: la pasada, o (alex) la de Alexander, que se sigue mientras habla
      var g = G(), follow = null, x = o.x, y = o.y;
      if ((typeof x !== 'number' || typeof y !== 'number') && g && g.player) { follow = g.player; x = g.player.x; y = g.player.y; }
      else if (who === 'alex' && g && g.player && Math.abs(g.player.x - x) < 2 && Math.abs(g.player.y - y) < 2) follow = g.player;
      var hgt = typeof o.h === 'number' ? o.h : (who === 'vecino' ? 44 : (who === 'senora' || who === 'pasajero') ? 36 : 34);
      var sp = A.spatial ? A.spatial({ x: x, y: y }) : { gain: 1, pan: 0, dist: 0 };
      var hasPos = typeof x === 'number' && typeof y === 'number';
      if (hasPos && sp.gain <= 0.001) return false;                              // demasiado lejos para oírse

      lastAt = now;
      var ms = BUBBLE_MS, voiceOk = (!A.voicesOn || A.voicesOn()) && !(A.muted && A.muted());
      var vv = A.getVolume ? A.getVolume('voces') : 0.9, mv = A.getVolume ? A.getVolume('master') / 0.8 : 1;
      if (voiceOk && vv > 0.01) {
        var clipDur = id ? playClip(id, sp) : 0;
        if (clipDur) { ms = Math.max(ms, clipDur * 1000 + 200); setDuck(true); releaseSoon(clipDur * 1000 + 250); }
        else speak(chunksOf(line, who), who, clamp(vv * mv * sp.gain, 0, 1));
      }
      if (hasPos) showBubble(text, who, x, y, follow, hgt, ms);
      return true;
    } catch (e) { return false; }                                            // la voz nunca rompe el juego
  };
  A.sayChance = function (id) { return P[id] ? (P[id].always ? 1 : P[id].p) : 0; };

  /* ---------------- debug ---------------- */
  function installDebug() {
    ACH.debug = ACH.debug || {};
    ACH.debug.say = function (id, o) {
      o = o || {}; o.always = true; if (!o.who && P[id]) o.who = P[id].who;
      var ok = A.say(id || 'hit', o);
      var ss = window.speechSynthesis;
      return { said: ok, speaking: !!(ss && ss.speaking), voice: A.speechVoice(o.who), voices: ss ? ss.getVoices().length : 0, volume: A.getVolume ? A.getVolume('voces') : null, on: A.voicesOn ? A.voicesOn() : true };
    };
  }
  installDebug();
  window.addEventListener('load', function () { if (!ACH.debug || !ACH.debug.say) installDebug(); });   // game.js crea ACH.debug después y la pisa: se reinstala al cargar
})();
