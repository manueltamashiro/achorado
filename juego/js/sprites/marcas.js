/* ACHORADO - js/sprites/marcas.js  (v0.6, fase F6)
 * Dueño: letreros.  Registro de marcas con INTERRUPTOR real <-> parodia.
 *
 *   ACH.cfg.marcasReales            true por defecto.  true = nombres reales de la calle chalaca; false = parodias de la tabla del
 *                                   informe diseno/letreros-y-frases-callao.md (PILSEN -> PILSÓN, INCA KOLA -> INTI KOLA...).
 *   ACH.px.marca(id)                -> { id, real, text, texto, text2, lines, colors:{bg,fg,accent,...}, colores, style, draw(ctx,x,y,w,h) }
 *                                      `text` es el nombre (en mayusculas); `text2` el segundo renglon del aviso (CALLAO / CHALAO);
 *                                      `colors` solo lleva hex de 6 digitos (bg = fondo del aviso, fg = tinta, accent = tercer color de la marca).
 *                                      Los colores son iguales en los dos modos (la parodia conserva paleta; cambian el nombre y el emblema).
 *                                      `draw` pinta el aviso de la marca en un lienzo 2D (usa ACH.letreros.ad, que carga despues).
 *   ACH.px.marcaIds()               -> lista de ids.
 *   ACH.px.setMarcas(on)            cambia el interruptor y avisa a los que escuchan (ACH.px.onMarcas(fn)); devuelve el valor.
 *   ACH.px.marcasEpoch              contador: sube en cada cambio (para invalidar caches propias).
 *   ACH.debug.marcas(on)            = setMarcas + re-hornear los lotes (ACH.render.rebake()) + redibujar las senales en sitio.
 *                                      Sin argumento alterna.  Se puede cambiar en cualquier momento de la partida.
 *
 * COMO SE CAMBIA EN CALIENTE: los lotes se hornean una sola vez al cargar (render.js buildGround) y llaman a ACH.px.marca() en ese momento,
 * asi que el modo queda "pegado" al horneado.  setMarcas() no pinta nada por si solo: los que dibujan se suscriben con onMarcas()
 * (letreros.js redibuja EN SITIO los lienzos de ACH.sprites.props.* para que las referencias del motor sigan validas) y debug.marcas()
 * ademas vuelve a hornear el suelo.  Para dejar un modo fijo desde el arranque basta con poner ACH.cfg.marcasReales antes de cargar los sprites.
 * Se carga justo despues de base.js (y antes de js/sprites.js).  Sin dependencias.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
ACH.cfg = ACH.cfg || {};
if (ACH.cfg.marcasReales === undefined) ACH.cfg.marcasReales = true;
ACH.px = ACH.px || {};

/* Colores de marca.  Fuente: informe de letreros, etiquetas [L] (leidos del logo) o [M] (propuestos).
   bg / fg / accent son los tres que ve quien consulte el catalogo; el resto (dk, lt, c4) los usa letreros.js. */
var C = {
  pilsen:   { bg: '#F1E8D2', fg: '#DC2F34', accent: '#9F7E45', dk: '#6B1A1D', green: '#2E5E3E', crate: '#C42B26' },   // [L] rojo y dorado de Pilsen Callao; crema; botella verde
  cristal:  { bg: '#003081', fg: '#FBBA47', accent: '#FFFFFF', dk: '#001A4A' },                                          // [L] azul marino y dorado (NO rojo)
  incakola: { bg: '#FDD701', fg: '#2B3990', accent: '#FFFFFF', dk: '#16204F', lt: '#FFEC6A' },                           // [L] amarillo y azul
  cocacola: { bg: '#E02020', fg: '#F3EFE2', accent: '#F3EFE2', dk: '#7A1010' },                                          // [L] rojo y blanco
  kolareal: { bg: '#E0301E', fg: '#F3EFE2', accent: '#009040', dk: '#7A1A10' },                                          // [L] rojo, verde y blanco
  colainglesa: { bg: '#C42B34', fg: '#F3EFE2', accent: '#D9A441', dk: '#6B141C', lt: '#E8708A' },                       // [M] v0.8: refresco peruano rojo; liquido rosado rojizo en botella clara, etiqueta roja, blanca y dorada (lt = el liquido)
  bigcola:  { bg: '#FAE202', fg: '#F1011E', accent: '#FFFFFF', dk: '#8A1010' },                                          // [L] amarillo y rojo
  guarana:  { bg: '#006E40', fg: '#F3EFE2', accent: '#D8171D', dk: '#00391F' },                                          // [L] verde y rojo
  cusquena: { bg: '#1F4D2E', fg: '#D9A441', accent: '#B3261E', dk: '#0F2A19' },                                          // [M] dorado, verde oscuro, rojo
  yape:     { bg: '#9117A0', fg: '#FFFFFF', accent: '#00CCB4', dk: '#4E0C57' },                                          // [L] morado y turquesa
  plin:     { bg: '#00B3E6', fg: '#FFFFFF', accent: '#00D1B2', dk: '#006A8A' },                                          // [M]
  bcp:      { bg: '#002A8D', fg: '#FFFFFF', accent: '#FF7800', dk: '#00155A' },                                          // [M]
  kasnet:   { bg: '#D32F2F', fg: '#FFFFFF', accent: '#F3EFE2', dk: '#7A1A1A' },                                          // [?]
  tinka:    { bg: '#2E8B3A', fg: '#FFD600', accent: '#D32F2F', dk: '#154A1C' },                                          // [?]
  apuesto:  { bg: '#1F2A44', fg: '#FFD600', accent: '#E8388A', dk: '#0D1424' },                                          // [?]
  inkafarma:{ bg: '#FFF000', fg: '#008040', accent: '#FFFFFF', dk: '#7A6C00' },                                          // [L]
  fasa:     { bg: '#F02020', fg: '#FFFFFF', accent: '#3040A0', dk: '#7A1010' },                                          // [L]
  tambo:    { bg: '#E8731A', fg: '#FFFFFF', accent: '#2F4470', dk: '#7A3A0A' },                                          // [M]
  norkys:   { bg: '#F2C100', fg: '#C42B26', accent: '#1C1A22', dk: '#7A5A00' },                                          // [M]
  sportboys:{ bg: '#F6AFCE', fg: '#202020', accent: '#FFFFFF', dk: '#8A4A66' },                                          // [L] rosado y negro
  muni:     { bg: '#F3EFE2', fg: '#C8102E', accent: '#1C1A22', dk: '#7A0A1C' },                                          // [M]
  policia:  { bg: '#3B5B3A', fg: '#F3EFE2', accent: '#F2C100', dk: '#1F301E' },                                          // [M]
  /* sin marca (iguales en los dos modos) */
  recargas: { bg: '#F3EFE2', fg: '#C42B26', accent: '#3FA535', dk: '#7A1A1A', lt: '#FFD600' },
  chela:    { bg: '#F3EFE2', fg: '#C42B26', accent: '#2F4470', dk: '#7A1A1A' },
  hielo:    { bg: '#F3EFE2', fg: '#2F4470', accent: '#6FA8DC', dk: '#1D2A48' },
  menu:     { bg: '#1C1A22', fg: '#F3EFE2', accent: '#E6C85A', dk: '#0D0C12' },
  gas:      { bg: '#E8731A', fg: '#FFFFFF', accent: '#2F4470', dk: '#7A3A0A' },
  loteria:  { bg: '#2E8B3A', fg: '#FFD600', accent: '#D32F2F', dk: '#154A1C' },
  agente:   { bg: '#2F4470', fg: '#FFFFFF', accent: '#FF7800', dk: '#1D2A48' },
  fiado:    { bg: '#E6C85A', fg: '#1C1A22', accent: '#C42B26', dk: '#7A6420' }
};

/* Registro.  real/fake: [texto, texto2].  Las marcas con `same:true` no cambian con el interruptor.
   Parodias: tabla del informe (seccion 1).  La parodia nunca excede en mas de 1 caracter al real. */
var REG = {
  pilsen:        { c: 'pilsen',    real: ['PILSEN', 'CALLAO'],       fake: ['PILSÓN', 'CHALAO'],     style: 'script', alcohol: true },
  cristal:       { c: 'cristal',   real: ['CRISTAL', 'CERVEZA'],     fake: ['CRISTÓN', 'CERVEZA'],   style: 'romana', alcohol: true },
  cusquena:      { c: 'cusquena',  real: ['CUSQUEÑA', ''],           fake: ['KUSKEÑA', ''],          style: 'romana', alcohol: true },
  incakola:      { c: 'incakola',  real: ['INCA KOLA', ''],          fake: ['INTI KOLA', ''],        style: 'gruesa' },
  gaseosa_amarilla: { c: 'incakola', real: ['INCA KOLA', ''],       fake: ['INTI KOLA', ''],        style: 'gruesa' },     // alias del anterior: el de los items y las botellas
  cocacola:      { c: 'cocacola',  real: ['COCA-COLA', ''],          fake: ['COCO-COLA', ''],        style: 'cursiva' },
  kolareal:      { c: 'kolareal',  real: ['KOLA REAL', ''],          fake: ['KOLA REY', ''],         style: 'bloque' },
  cola_inglesa:  { c: 'colainglesa', real: ['COLA INGLESA', ''],    fake: ['COLA GRINGA', ''],      style: 'cursiva' },
  bigcola:       { c: 'bigcola',   real: ['BIG COLA', ''],           fake: ['GRAN COLA', ''],        style: 'cursiva' },
  guarana:       { c: 'guarana',   real: ['GUARANÁ', ''],            fake: ['GUARAMÁ', ''],          style: 'bloque' },
  yape:          { c: 'yape',      real: ['YAPE', ''],               fake: ['YAPA', ''],             style: 'redonda' },
  plin:          { c: 'plin',      real: ['PLIN', ''],               fake: ['PLON', ''],             style: 'redonda' },
  agente_bcp:    { c: 'bcp',       real: ['AGENTE BCP', ''],         fake: ['AGENTE BDP', ''],       style: 'bloque' },
  kasnet:        { c: 'kasnet',    real: ['KASNET', ''],             fake: ['KAJANET', ''],          style: 'bloque' },
  tinka:         { c: 'tinka',     real: ['LA TINKA', ''],           fake: ['LA CHANCA', ''],        style: 'bloque', alcohol: true },
  apuesto:       { c: 'apuesto',   real: ['TE APUESTO', ''],         fake: ['TE JUEGO', ''],         style: 'bloque', alcohol: true },
  inkafarma:     { c: 'inkafarma', real: ['INKAFARMA', ''],          fake: ['INTIFARMA', ''],        style: 'redonda' },
  fasa:          { c: 'fasa',      real: ['FASA', 'MIFARMA'],        fake: ['FARMA', 'FASE'],        style: 'bloque' },
  tambo:         { c: 'tambo',     real: ['TAMBO', ''],              fake: ['TAMBITO', ''],          style: 'bloque' },
  norkys:        { c: 'norkys',    real: ["NORKY'S", ''],            fake: ["NORKITO'S", ''],        style: 'bloque' },
  sportboys:     { c: 'sportboys', real: ['SPORT BOYS', 'ASSOCIATION'], fake: ['SPORT CHIBOLOS', 'ASSOC.'], style: 'college' },
  muni:          { c: 'muni',      real: ['MUNICIPALIDAD', 'PROVINCIAL DEL CALLAO'], fake: ['MUNICIPALIDAD', 'DEL PUERTO'], style: 'bloque' },
  policia:       { c: 'policia',   real: ['POLICÍA', 'NACIONAL'],    fake: ['POLICÍA', ''],          style: 'bloque' },
  /* Genericos: el informe no pudo verificar logo ni colores (loterias, agentes de pago): iguales en los dos modos. */
  loteria:       { c: 'loteria',   real: ['LOTERÍA', ''],            same: true, style: 'bloque', alcohol: true },
  agente:        { c: 'agente',    real: ['AGENTE', ''],             same: true, style: 'bloque' },
  /* Rotulos de barrio (no cambian) */
  recargas:      { c: 'recargas',  real: ['RECARGAS', ''],           same: true, style: 'bloque' },
  chela_helada:  { c: 'chela',     real: ['SE VENDE', 'CHELA HELADA'], same: true, style: 'brocha' },
  hay_hielo:     { c: 'hielo',     real: ['HAY HIELO', ''],          same: true, style: 'brocha' },
  hay_menu:      { c: 'menu',      real: ['HAY MENÚ', ''],           same: true, style: 'tiza' },
  menu_s10:      { c: 'menu',      real: ['MENÚ', 'S/ 10'],          same: true, style: 'tiza' },
  gas:           { c: 'gas',       real: ['GAS', ''],                same: true, style: 'bloque' },
  fiado_no:      { c: 'fiado',     real: ['FIADO NO', ''],           same: true, style: 'bloque' }
};

var listeners = [];
function copyColors(c) { var o = {}; for (var k in c) o[k] = c[k]; return o; }

function marca(id) {
  var r = REG[id];
  if (!r) return null;
  var real = ACH.cfg.marcasReales !== false || r.same === true;
  var t = real ? r.real : (r.fake || r.real);
  var col = copyColors(C[r.c]);
  var m = {
    id: id, real: real, style: r.style, alcohol: !!r.alcohol,
    text: t[0], texto: t[0], text2: t[1] || '', lines: t[1] ? [t[0], t[1]] : [t[0]],
    colors: col, colores: col,
    draw: function (ctx, x, y, w, h) {
      var L = ACH.letreros;
      if (!L || !L.ad) return false;
      var g = new ACH.px.G(w, h);
      L.ad(g, id, 0, 0, w, h, {});
      ctx.drawImage(g.toCanvas(), x, y);
      return true;
    }
  };
  return m;
}
ACH.px.marca = marca;
ACH.px.marcaIds = function () { return Object.keys(REG); };
ACH.px.marcasEpoch = 0;
ACH.px.onMarcas = function (fn) { if (typeof fn === 'function') listeners.push(fn); };
ACH.px.setMarcas = function (on) {
  on = on === undefined ? !ACH.cfg.marcasReales : !!on;
  var changed = ACH.cfg.marcasReales !== on;
  ACH.cfg.marcasReales = on;
  if (changed) {
    ACH.px.marcasEpoch++;
    for (var i = 0; i < listeners.length; i++) { try { listeners[i](on); } catch (e) { if (window.console) console.warn('[marcas]', e); } }
  }
  return on;
};

/* Debug: alterna o fija el interruptor y re-hornea.  Devuelve { real, rebaked, epoch }. */
ACH.debug = ACH.debug || {};
ACH.debug.marcas = function (on) {
  var v = ACH.px.setMarcas(on), baked = false;
  try { if (ACH.render && ACH.render.rebake) { ACH.render.rebake(); baked = true; } } catch (e) { if (window.console) console.warn('[marcas] rebake', e); }
  return { real: v, rebaked: baked, epoch: ACH.px.marcasEpoch };
};
})();
