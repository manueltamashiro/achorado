/* ACHORADO v0.11 — js/sprites/items-v011.js  (agente E: arte de objetos, vendedores y puestos)
 * Script clasico (window.ACH), sin imagenes ni librerias; funciona desde file://. Todo se hornea UNA vez al cargar (~10 ms), salvo el guante en la mano (perezoso).
 * Necesita base.js, marcas.js, sprites.js (px.chars) y objetos.js ya cargados; si falta algo no hace nada y avisa en consola. Cada bloque va protegido (safe).
 * Cada lienzo lleva .ax/.ay = ANCLA (pixel del lienzo que va sobre el punto del mundo). Escala del juego: 1 m = 16 px, vista 3/4, luz noroeste. Sin marcas ni personajes con licencia.
 *
 * ICONOS DE MOCHILA — ACH.sprites.items[id]  (12x12, ancla (6,11)) + .big (24x24, ancla (12,23)).  No pisa los que ya existan.
 *   uhu  tablas  chatarra  jebe  guanteInflable  globosAgua
 *   El UHU: tubo amarillo intenso, «UHU» negro y gordo, franja roja con filo negro, tapa negra con puntita conica y pomo plateado doblado y engrapado.
 *   Marca: se hornean las dos versiones («UHU» real y «UJÚ» parodia: ACH.sprites.v011.uhuVariantes.{real,parodia}.{icon,big,suelo}); lo que cuelga de
 *   ACH.sprites.items.uhu / v011.uhuSuelo es la version segun ACH.cfg.marcasReales al cargar, y se REPINTA EN SITIO (mismos lienzos, mismas referencias)
 *   cuando alguien llama ACH.px.setMarcas(on) (se engancha con ACH.px.onMarcas). Nadie tiene que hacer nada.
 *   ACH.sprites.v011.uhuSuelo   34x20 @(17,15)  el tubo tirado con sombra, para el botin del piso (ancla = base del tubo, centrada).
 *
 * CARGABLES — ACH.sprites.v011.loose[id], id = llanta | tablon | basurero | macetero.   Todos con contorno negro de 1 px y luz noroeste.
 *   .suelo     como queda en el piso                       ancla = base/contacto, centrada en x
 *   .cargado   sobre la cabeza, en las manos               ancla = abajo-centro (donde van las manos)
 *   .vuelo[]   4 cuadros de giro en el aire                ancla = CENTRO del objeto  (usar uno por ~0.08 s; la sombra va en el piso con .sombra)
 *   .roto      restos en el piso                           ancla = abajo-centro
 *   .sombra    elipse translucida para el piso            ancla = centro  (se dibuja en el suelo, bajo el objeto en vuelo; escalar si se quiere)
 *   llanta tiene ademas .rueda[4] (14x18 @(7,16): rodando de canto, tacos girando, mirando a la derecha; espejar para la izquierda).
 *   tamanos:  llanta   suelo 22x18 @11,15 · cargado 18x18 @9,16 · vuelo 20x20 @10,10 · roto 26x16 @13,13 · sombra 15x9
 *             tablon   suelo 36x12 @18,9 · cargado 36x14 @18,12 (inclinado) · vuelo 38x38 @19,19 · roto 36x16 @18,13 (partido en dos) · sombra 27x9
 *             basurero suelo 16x20 @7,15 · cargado 16x20 @7,15 (con abolladuras) · vuelo 30x30 @14,14 · roto 28x16 @14,13 (tumbado, con basura) · sombra 15x9   (colores de props.basureroMira)
 *             macetero suelo 18x22 @9,18 · cargado 18x22 @9,18 · vuelo 36x36 @17,17 · roto 28x14 @14,12 (cascotes, tierra y la plantita) · sombra 13x7
 *
 * VENDEDORES — ACH.sprites.v011.npc[id], id = cachinero (Don Pocho) | meche (Dona Meche) | pintor | rosa (Dona Rosa).   Personas vivas, de frente, a la camara.
 *   cada id = { idle:[2], hablando }   (hablando tiene el alias .talk)
 *     idle[0] reposo · idle[1] reposo con parpadeo y el pecho 1 px abajo (alternar cada ~0.5 s) · hablando = boca abierta, cejas arriba y una mano alzada.
 *   lienzo 40x46, ANCLA = PIES centrados (20,43); figura de ~28 px de alto, igual que Don Tito / Don Pepe de Miraflores. Dibujar con y = pies.
 *   npc.meche.busto = { idle:[2], hablando }  igual pero de la cintura para arriba (40x46 @(20,36), la ancla es la CINTURA): para asomarla por la ventana de la bodeguita.
 *
 * PUESTOS — ACH.sprites.v011.puesto[id], id = cachina | bodeguita | caballetes
 *   cachina     96x58 @(48,52)  manta andina en el piso con radio, plancha, fierros, reloj despertador, zapatos y letrero de carton «TODO S/5». Ancla = centro del borde de abajo de la manta
 *               (la manta ocupa x -46..+46, y -26..0 respecto a la ancla). Don Pocho de pie DETRAS: pies en (ancla.x, ancla.y - 24).
 *   bodeguita   76x66 @(38,64)  pared de barrio con ventana enrejada, letrero pintado «BODEGA MECHE», cartel «FIADO NO», mostrador y productos genericos (sin marcas).
 *               Es el conjunto SIN Meche.  Para asomar a Meche, dibujar en orden (todos con la MISMA ancla):
 *                    1) bodeguita.fondo   2) npc.meche.busto.idle[i] con su ancla en (ancla.x + bodeguita.mecheBusto.dx, ancla.y + bodeguita.mecheBusto.dy) = (+0, -20)   3) bodeguita.frente (reja y mostrador).
 *               bodeguita.fondo y bodeguita.frente son lienzos 76x66 @(38,64) con transparencia; el vano de la ventana esta en x 14..61, y 18..46 del lienzo.
 *   caballetes  92x50 @(46,47)  tres caballetes (gato naranja, mar con sol y velero, gato blanquinegro), banquito, lata de pintura y pinceles. El pintor de pie a la derecha: pies en (ancla.x + 42, ancla.y).
 *
 * INFLABLE EN LA MANO — ACH.sprites.v011.inflables.guanteInflable[bird|nobird] = { walk:{right,left,down,up:[4]}, swing:{right,left,down,up:[3]}, idle:{right,left,down,up} }
 *   EXACTAMENTE el formato de ACH.sprites.alexInflable[toyId] (arte-personajes.js): walk 20x28 @(10,26) (izq @9,26); swing de lado 32x30 @(13,26) (izq @18,26); frente/espaldas 32x48 @(16,38).
 *   Es Alexander sin guitarra con el guante rojo en la mano (golpe: jab de tres cuadros). Perezoso (se hornea al primer acceso, ~20 ms); ACH.sprites.v011.bakeAll() lo fuerza.
 *   Al terminar de cargar el documento se copia a ACH.sprites.alexInflable.guanteInflable si esa tabla existe y no lo tiene (asi inflables.js lo halla igual que a los otros tres).
 *
 * ACH.sprites.v011.arteMs = milisegundos del horneado inicial.   Vista previa: preview-v011.html  (?solo=items|loose|npc|puesto|inflables|comp  &z=zoom  &id=...  &parodia=1)
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !px.G || !S) { if (window.console) console.warn('[items-v011] falta ACH.px / ACH.sprites'); return; }
var G = px.G, RC = px.RAMPS || {}, mix = px.mix, shade = px.shade, CH = px.chars || null;
var T0 = (window.performance && performance.now) ? performance.now() : Date.now();
var V = S.v011 = S.v011 || {};
V.loose = V.loose || {}; V.npc = V.npc || {}; V.puesto = V.puesto || {}; V.inflables = V.inflables || {};
S.items = S.items || {};
function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn('[items-v011] ' + name + ':', e); } }

var K = '#141216', OUT = '#16141a';
function mkC(g, ax, ay, fw, fh) { return (CH && CH.mkC) ? CH.mkC(g, ax, ay, fw, fh) : g.toCanvas(ax, ay, fw, fh); }
function outlineRim(g) { if (CH && CH.outlineRim) CH.outlineRim(g); else g.outline(K); return g; }
function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ramp(c) { return [shade(c, 0.5), shade(c, 0.75), c, mix(c, '#ffffff', 0.4)]; }
function blobR(g, cx, cy, rx, ry, r) {                       // elipse con luz arriba-izquierda (rampa de 4 colores)
  for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 1) continue;
    var lit = -(dx * 0.6 + dy * 0.85);
    g.set(x, y, r[lit > 0.55 ? r.length - 1 : (lit > 0.0 ? r.length - 2 : (lit > -0.55 ? 1 : 0))]);
  }
}
function span(g, y, x0, x1, r) {                             // fila con bisel: luz a la izquierda, sombra a la derecha
  x0 = Math.round(x0); x1 = Math.round(x1);
  for (var x = x0; x <= x1; x++) g.set(x, y, x === x0 ? r[3] : (x === x1 ? r[0] : (x === x1 - 1 && x1 - x0 > 2 ? r[1] : r[2])));
}
function bevel(g, x0, y0, w, h, r) {                         // caja con luz arriba/izquierda y sombra abajo/derecha
  g.rect(x0, y0, w, h, r[2]);
  g.rect(x0, y0, w, 1, r[3]); g.rect(x0, y0, 1, h, r[3]);
  g.rect(x0, y0 + h - 1, w, 1, r[1]); g.rect(x0 + w - 1, y0, 1, h, r[1]);
  g.set(x0, y0 + h - 1, r[2]); g.set(x0 + w - 1, y0, r[2]);
}
function shadowEll(g, cx, cy, rx, ry, c) { g.ell(cx, cy, rx, ry, c || '#2a244066'); }
function realMode() { return !(ACH.cfg && ACH.cfg.marcasReales === false); }

/* ======================== ICONOS DE MOCHILA: 12x12 @(6,11) + .big 24x24 @(12,23) ======================== */
/* Misma regla de objetos.js: se dibuja en una rejilla de 10x10 celdas con un margen de 1 celda; a s=2 se recalcula y se agregan detalles. */
function D(g, s) {
  var o = s, d = {
    g: g, s: s,
    R: function (x, y, w, h, c) { g.rect(Math.round(o + x * s), Math.round(o + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c); },
    px: function (x, y, c) { g.set(o + Math.round(x * s), o + Math.round(y * s), c); },
    L: function (x0, y0, x1, y1, c, t) { t = Math.max(1, Math.round((t || 1) * s)); for (var k = 0; k < t; k++) g.line(o + x0 * s, o + y0 * s + k - (t >> 1), o + x1 * s, o + y1 * s + k - (t >> 1), c); },
    E: function (cx, cy, rx, ry, c) { g.ell(o + cx * s, o + cy * s, rx * s, ry * s, c); },
    blob: function (cx, cy, rx, ry, r) { blobR(g, o + cx * s, o + cy * s, rx * s, ry * s, r); },
    rrect: function (cx, cy, len, wid, ang, fn) {
      var X = o + cx * s, Y = o + cy * s, ca = Math.cos(ang), sa = Math.sin(ang), L = len * s / 2, Wd = wid * s / 2;
      for (var y = Math.floor(Y - L - Wd - 1); y <= Math.ceil(Y + L + Wd + 1); y++) for (var x = Math.floor(X - L - Wd - 1); x <= Math.ceil(X + L + Wd + 1); x++) {
        var u = (x - X) * ca + (y - Y) * sa, v = -(x - X) * sa + (y - Y) * ca;
        if (Math.abs(u) <= L && Math.abs(v) <= Wd) { var c = fn(u / s, v / s); if (c) g.set(x, y, c); }
      }
    }
  };
  return d;
}
function mkIcon(fn) {
  var cs = [1, 2].map(function (s) { var g = new G(12 * s, 12 * s); fn(D(g, s), s, g); g.outline(OUT); return mkC(g, 6 * s, 11 * s); });
  cs[0].big = cs[1];
  return cs[0];
}

/* ---- El UHU ---- */
var UY = ['#b07a00', '#e0a800', '#ffd400', '#fff06a'];        // amarillo intenso (oscuro -> luz)
var USILV = ['#5a6068', '#8a9098', '#c4c9cc', '#f0f2f0'];     // aluminio del pomo
var UCAP = ['#0c0c10', '#1a1a20', '#2c2c34', '#4a4a56'];      // tapa negra
var URED = '#e02020', UBLK = '#141216';
/* Tubo horizontal, tapa a la derecha. (ox, oy) = esquina sup. izq. de una caja de 22x13 px (cuerpo 13 px de largo x 9 de alto). */
function uhuBig(g, ox, oy, txt) {
  var y, parodia = txt !== 'UHU';
  // cuerpo (x 2..14, filas 2..10): luz arriba/izquierda, sombra abajo/derecha
  for (y = 2; y <= 10; y++) g.rect(ox + 2, oy + y, 13, 1, UY[2]);
  g.rect(ox + 2, oy + 2, 13, 1, UY[3]); g.rect(ox + 2, oy + 3, 13, 1, UY[3]);
  g.rect(ox + 2, oy + 2, 1, 9, UY[3]); g.rect(ox + 14, oy + 2, 1, 9, UY[1]);
  // franja fina roja y negra, al pie del cuerpo
  g.rect(ox + 3, oy + 9, 11, 1, URED); g.rect(ox + 3, oy + 10, 11, 1, UBLK);
  g.rect(ox + 2, oy + 9, 1, 2, UY[3]); g.rect(ox + 14, oy + 9, 1, 2, UY[1]);
  // hombro y cuello (se angosta hacia la tapa)
  g.rect(ox + 15, oy + 3, 1, 7, UY[1]); g.rect(ox + 15, oy + 3, 1, 2, UY[2]); g.set(ox + 15, oy + 3, UY[3]);
  g.rect(ox + 16, oy + 4, 1, 5, UY[0]); g.set(ox + 16, oy + 4, UY[1]);
  // tapa de rosca negra con estrias y puntita conica
  g.rect(ox + 17, oy + 4, 3, 5, UCAP[1]); g.rect(ox + 17, oy + 4, 3, 1, UCAP[3]); g.rect(ox + 17, oy + 8, 3, 1, UCAP[0]);
  g.set(ox + 18, oy + 5, UCAP[2]); g.set(ox + 18, oy + 6, UCAP[3]); g.set(ox + 18, oy + 7, UCAP[2]); g.set(ox + 17, oy + 5, UCAP[3]);
  g.rect(ox + 20, oy + 5, 1, 3, UCAP[2]); g.set(ox + 20, oy + 5, UCAP[3]); g.set(ox + 21, oy + 6, UCAP[2]);
  // pomo plateado doblado y engrapado (izquierda): aleta plana con dentado, doblez y 2 grapas
  for (y = 2; y <= 10; y++) { g.set(ox, oy + y, USILV[1]); g.set(ox + 1, oy + y, y % 2 ? USILV[3] : USILV[2]); }
  g.set(ox, oy + 2, null); g.set(ox, oy + 4, null); g.set(ox, oy + 6, null); g.set(ox, oy + 8, null); g.set(ox, oy + 10, null);
  g.rect(ox + 1, oy + 3, 1, 1, UBLK); g.rect(ox + 1, oy + 9, 1, 1, UBLK);
  g.rect(ox + 2, oy + 2, 1, 9, USILV[0]);                                     // linea del doblez
  // letras negras y gordas
  px.text(g, txt, ox + 3, oy + 4, { font: 'a5', ink: UBLK, scale: 1 });
  g.set(ox + 3, oy + 3, '#ffffff'); g.set(ox + 4, oy + 3, '#ffffff');       // brillo
}
/* 1x: tubo en diagonal (sube a la derecha) con el pomo plateado abajo-izquierda y la tapa negra arriba-derecha. 10x10 celdas, margen 1. */
function uhuSmall(d) {
  d.rrect(4.9, 5.1, 10.4, 4.3, -0.7, function (u, v) {
    if (u < -4.1) return Math.abs(v) < 1.7 ? (u < -4.6 ? USILV[1] : USILV[3]) : null;   // pomo plateado doblado
    if (u < -3.6) return USILV[0];                                                    // doblez
    if (u > 4.0) return Math.abs(v) < 0.8 ? UCAP[2] : null;                          // puntita conica
    if (u > 3.0) return Math.abs(v) < 1.5 ? UCAP[3 - (v > 0.2 ? 2 : 0)] : null;      // tapa negra
    if (u > 2.1) return Math.abs(v) < 1.9 ? UY[1] : null;                            // cuello
    if (v > 1.45) return UBLK;                                                       // franja negra
    if (v > 0.95) return URED;                                                       // franja roja
    if (v < -1.2) return UY[3];                                                      // luz
    if (v < -0.2 && (Math.round(u * 1.1) % 3 !== 0) && u > -3.2 && u < 1.6) return UBLK;   // letras: tres trazos negros
    return UY[2];
  });
}
function makeUhu(txt) {
  var g1 = new G(12, 12); uhuSmall(D(g1, 1)); g1.outline(OUT);
  var g2 = new G(24, 24); uhuBig(g2, 1, 5, txt); g2.outline(OUT);
  var c1 = mkC(g1, 6, 11), c2 = mkC(g2, 12, 23); c1.big = c2;
  // suelo (botin): el tubo tirado, algo inclinado, con sombra
  var g3 = new G(34, 20); shadowEll(g3, 17, 15, 14, 3);
  uhuBig(g3, 5, 1, txt); g3.outline(OUT);
  for (var i = 0; i < 6; i++) g3.set(8 + i * 2, 15, '#2a244066');
  var c3 = mkC(g3, 17, 15);
  return { icon: c1, big: c2, suelo: c3 };
}
safe('uhu', function () {
  var real = makeUhu('UHU'), fake = makeUhu('UJÚ');
  V.uhuVariantes = { real: real, parodia: fake };
  var cur = realMode() ? real : fake;
  var icon = cv(12, 12), big = cv(24, 24), suelo = cv(34, 20);
  function paint(dst, src) { var c = dst.getContext('2d'); c.clearRect(0, 0, dst.width, dst.height); c.drawImage(src, 0, 0); dst.ax = src.ax; dst.ay = src.ay; }
  function fill(m) { paint(icon, m.icon); paint(big, m.big); paint(suelo, m.suelo); }
  fill(cur); icon.big = big;
  if (!S.items.uhu) S.items.uhu = icon;
  V.uhuSuelo = suelo;
  if (px.onMarcas) px.onMarcas(function (on) { fill(on === false || !on ? fake : real); });
});

/* ---- materiales y armas nuevas ---- */
var WD = RC.wood || ['#4a3028', '#6b4223', '#a86e38', '#c99458'], MT = RC.metal || ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'], RU = RC.rust || ['#4a2a2a', '#6f3b2e', '#8a4b38', '#b06a3e'];
var BLU = ['#1c4a78', '#2f78b8', '#5aa8e0', '#b4e4fa'], PNK = ['#8a2a5e', '#d44a8a', '#f27ab0', '#ffd0e4'], YLW = ['#a87a08', '#d8a410', '#f2c81c', '#ffe870'];
var ICONS = {
  tablas: function (d, s) {                                     // tres tablones sueltos y cruzados, con clavos oxidados y un resto de pintura de toldo
    function plank(cx, cy, ang, len, hi, mid, lo) {
      d.rrect(cx, cy, len, 1.9, ang, function (u, v) { return Math.abs(u) > len / 2 - 0.7 ? '#e0b878' : (v < -0.45 ? hi : (v > 0.5 ? lo : mid)); });
    }
    plank(5.0, 7.5, 0.04, 9.0, WD[2], WD[1], WD[0]);
    plank(5.1, 4.8, -0.5, 8.8, WD[3], WD[2], WD[1]);
    plank(4.8, 4.4, 0.42, 8.2, '#c0a074', '#9a7e56', '#6e563a');
    d.rrect(2.6, 6.2, 1.6, 1.9, -0.5, function (u, v) { return Math.abs(u) < 0.4 ? '#f0ecdc' : '#d4382e'; });
    d.px(7.8, 7.3, '#2a2a30'); d.px(3.0, 7.5, '#2a2a30'); d.px(6.6, 3.6, '#2a2a30'); d.px(2.4, 2.4, RU[3]);
    if (s === 2) { d.px(5.6, 7.8, WD[0]); d.px(4.4, 7.2, WD[3]); d.px(8.0, 8.0, WD[3]); d.px(6.8, 3.0, WD[0]); d.px(4.0, 5.6, '#e8d8b0'); d.px(7.6, 6.2, '#e8d8b0'); d.px(1.6, 7.6, '#f0d8a0'); }
  },
  chatarra: function (d, s) {                                   // engranaje grande, lamina oxidada y un fierro doblado
    d.rrect(5.6, 7.4, 8.6, 3.0, -0.12, function (u, v) { return Math.abs(u) > 4 ? RU[0] : (v < -0.5 ? RU[3] : (v > 0.6 ? RU[1] : RU[2])); });
    d.L(0.8, 3.2, 3.2, 3.2, MT[2], 1.1); d.L(3.2, 3.2, 3.2, 6.6, MT[2], 1.1); d.L(0.8, 2.7, 3.2, 2.7, MT[4], 0.4);
    var cx = 6.4, cy = 4.4, i, a;
    d.E(cx, cy, 3.0, 3.0, MT[1]); d.E(cx - 0.2, cy - 0.2, 2.7, 2.7, MT[3]); d.E(cx + 0.3, cy + 0.3, 2.0, 2.0, MT[2]);
    for (i = 0; i < 8; i++) { a = i * Math.PI / 4 + 0.2; d.E(cx + Math.cos(a) * 3.3, cy + Math.sin(a) * 3.3, 0.75, 0.75, i % 2 ? MT[2] : MT[3]); }
    d.E(cx, cy, 1.0, 1.0, '#1c1a22'); d.px(cx - 0.4, cy - 0.4, '#3b4250');
    d.px(2.0, 8.4, RU[3]); d.px(7.4, 8.6, RU[3]);
    if (s === 2) { d.px(5.2, 3.2, '#ffffff'); d.px(5.6, 3.0, '#ffffff'); d.px(8.6, 5.6, MT[0]); d.px(4.4, 6.4, MT[0]); d.px(3.0, 7.0, RU[3]); d.px(6.2, 7.2, RU[3]); d.px(1.4, 2.4, '#ffffff'); }
  },
  jebe: function (d, s) {                                       // pedazo de llanta rota: aro de jebe negro con huellas y la punta rasgada
    var R1 = ['#1a1a20', '#34343c', '#4a4a54', '#7a7a88'], i, a;
    for (i = 0; i < 44; i++) {
      a = 0.5 + i * (Math.PI * 1.5 / 43);                                // 270 grados; sobra un hueco abajo a la derecha
      var ex = 5.0 + Math.cos(a) * 3.4, ey = 5.2 + Math.sin(a) * 3.0, f = Math.max(0, Math.min(1, (i - 38) / 5));
      d.E(ex, ey, 1.9 - f * 0.7, 1.9 - f * 0.7, a > 3.2 && a < 5.0 ? R1[3] : R1[2]);
    }
    for (i = 0; i < 40; i++) {
      a = 0.5 + i * (Math.PI * 1.5 / 43);
      d.px(5.0 + Math.cos(a) * 3.4, 5.2 + Math.sin(a) * 3.0, (i % 3 === 0) ? R1[0] : R1[1]);       // huellas
      if (a > 3.6 && a < 5.2) d.px(5.0 + Math.cos(a) * 2.2, 5.2 + Math.sin(a) * 1.9, R1[3]);
    }
    d.E(5.0, 5.2, 1.4, 1.2, null);
    d.px(8.2, 7.6, R1[0]); d.px(8.8, 8.2, R1[1]); d.px(7.4, 8.4, R1[2]);
    if (s === 2) { d.px(2.2, 4.0, '#8a8a96'); d.px(3.0, 2.8, '#8a8a96'); d.px(4.4, 2.2, '#6a6a76'); d.px(8.0, 3.8, R1[0]); d.px(2.4, 7.2, R1[0]); d.px(6.2, 8.4, R1[0]); }
  },
  guanteInflable: function (d, s) {                             // guante de box inflable: rojo gordo, pulgar y manguito blanco con franja amarilla
    d.R(0.6, 6.4, 2.6, 3.4, '#f8f4e4'); d.R(0.6, 6.4, 0.7, 3.4, '#ffffff'); d.R(2.4, 6.4, 0.8, 3.4, '#c8c4b0'); d.R(1.2, 6.4, 1.0, 3.4, '#f2c81c');
    d.blob(5.9, 5.1, 3.9, 3.5, ['#7a1a14', '#b82a22', '#e8382c', '#ff7a62']);
    d.blob(7.7, 2.2, 1.7, 1.3, ['#7a1a14', '#b82a22', '#e8382c', '#ff7a62']);
    d.px(5.0, 3.6, '#ffffff'); d.px(4.4, 4.2, '#ffffff');
    d.R(3.3, 7.0, 2.6, 0.4, '#7a1a14');
    if (s === 2) { d.px(5.6, 3.2, '#ffd0c8'); d.px(3.8, 5.0, '#ff9a88'); d.px(8.2, 6.2, '#7a1a14'); d.px(6.0, 8.0, '#7a1a14'); d.px(8.0, 1.6, '#ff7a62'); d.px(1.0, 9.4, '#8a887e'); }
  },
  globosAgua: function (d, s) {                                 // dos globos llenos de agua con nudo
    d.blob(3.4, 5.2, 2.9, 3.1, BLU); d.R(3.0, 8.2, 0.9, 1.0, BLU[1]); d.px(3.4, 9.4, BLU[0]); d.px(2.7, 9.4, BLU[1]);
    d.blob(7.0, 3.9, 2.5, 2.7, PNK); d.R(6.7, 6.4, 0.8, 0.9, PNK[1]); d.px(7.0, 7.5, PNK[0]); d.px(6.4, 7.5, PNK[1]);
    d.px(2.0, 3.6, '#ffffff'); d.px(2.4, 3.2, '#ffffff'); d.px(6.0, 2.6, '#ffffff');
    if (s === 2) { d.px(1.6, 4.2, '#e8f8ff'); d.px(2.8, 2.8, '#e8f8ff'); d.px(5.6, 3.2, '#fff0f8'); d.px(8.6, 8.2, BLU[3]); d.px(9.0, 8.8, BLU[2]); d.px(0.8, 8.6, BLU[3]); d.px(8.0, 5.0, PNK[0]); d.px(4.6, 6.6, BLU[0]); }
  }
};
safe('items', function () {
  Object.keys(ICONS).forEach(function (id) { if (!S.items[id]) S.items[id] = mkIcon(ICONS[id]); });
});


/* ======================== CARGABLES: ACH.sprites.v011.loose[id] ======================== */
/* Cada cuadro es un lienzo con .ax/.ay.  suelo = tal como queda en el piso; cargado = en las manos sobre la cabeza (ancla = abajo-centro, donde van las manos);
   vuelo[0..3] = giro en el aire (ancla = CENTRO del objeto; la sombra la pone el motor: loose[id].sombra = elipse translucida para usarla);
   roto = restos en el piso (ancla = abajo-centro).  Sin contornos duplicados: todo lleva contorno negro de 1 px como el resto. */
function rotG(g, ang, tol) {                                    // gira una rejilla por vecino mas cercano (sin suavizar)
  var n = Math.ceil(Math.sqrt(g.w * g.w + g.h * g.h)) + 2, o = new G(n, n), ca = Math.cos(ang), sa = Math.sin(ang);
  var cx = (g.w - 1) / 2, cy = (g.h - 1) / 2, ox = (n - 1) / 2, oy = (n - 1) / 2;
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    var dx = x - ox, dy = y - oy, sx = Math.round(cx + dx * ca + dy * sa), sy = Math.round(cy - dx * sa + dy * ca);
    var c = g.get(sx, sy); if (c) o.set(x, y, c);
  }
  return o;
}
function trim(g) {                                              // recorta a la caja ocupada; devuelve {g, ox, oy} (ox/oy = donde estaba el origen)
  var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, x, y;
  for (y = 0; y < g.h; y++) for (x = 0; x < g.w; x++) if (g.get(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { g: new G(1, 1), ox: 0, oy: 0 };
  var o = new G(x1 - x0 + 1, y1 - y0 + 1);
  for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) o.set(x - x0, y - y0, g.get(x, y));
  return { g: o, ox: x0, oy: y0 };
}
function pad(g, m, bgc) { var o = new G(g.w + 2 * m, g.h + 2 * m); for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.get(x, y); if (c) o.set(x + m, y + m, c); } return o; }
function shadowC(rx, ry) { var g = new G(rx * 2 + 3, ry * 2 + 3); g.ell(rx + 1, ry + 1, rx, ry, '#2a244066'); return mkC(g, rx + 1, ry + 1); }
/* un cuadro final: g sin contorno -> contorno + luz de borde -> lienzo con ancla (ax, ay) dados en el espacio de g */
function frameC(g, ax, ay) { var m = 1, p = pad(g, m); outlineRim(p); return mkC(p, ax + m, ay + m); }

safe('loose', function () {
  var TIRE = ['#101014', '#1e1e24', '#2e2e36', '#4a4a54'], RIM = ['#4a525c', '#7a828a', '#a8afb2', '#d8dcdc'];
  /* llanta: de frente (elipse rx, ry) con aro gris y tacos; ang = giro de los tacos (radianes) */
  function tireFace(g, cx, cy, rx, ry, ang) {
    for (var y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (var x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry, r = Math.sqrt(dx * dx + dy * dy); if (r > 1) continue;
      var a = Math.atan2(dy, dx) - ang, lit = -(dx * 0.6 + dy * 0.8), c;
      if (r > 0.6) {
        var lug = Math.floor(((a % (Math.PI * 2)) + Math.PI * 4) / (Math.PI / 6)) % 2;
        c = r > 0.86 ? (lug ? TIRE[0] : (lit > 0.2 ? TIRE[3] : TIRE[2])) : (r > 0.74 ? (lit > 0 ? TIRE[2] : TIRE[1]) : (lit > 0.2 ? TIRE[1] : TIRE[0]));
      } else if (r > 0.28) {
        c = lit > 0.35 ? RIM[3] : (lit > -0.1 ? RIM[2] : (lit > -0.5 ? RIM[1] : RIM[0]));
        var bolt = Math.abs(((a * 5 / (Math.PI * 2)) % 1 + 1) % 1 - 0.5) > 0.4 && r > 0.4 && r < 0.56;
        if (bolt) c = RIM[0];
      } else c = lit > 0 ? RIM[1] : '#2a2d34';
      g.set(x, y, c);
    }
  }
  function tireFlat(g, cx, cy, rx, ry, th) {                    // echada en el piso (3/4): cara de arriba + pared lateral de th px
    var y, x;
    for (var k = th; k >= 0; k--) {
      for (y = Math.floor(cy + k - ry - 1); y <= Math.ceil(cy + k + ry + 1); y++) for (x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        var dx = (x - cx) / rx, dy = (y - cy - k) / ry; if (dx * dx + dy * dy > 1) continue;
        g.set(x, y, k > 0 ? (dx > 0.2 ? TIRE[0] : TIRE[1]) : TIRE[2]);
      }
    }
    for (y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      var ex = (x - cx) / rx, ey = (y - cy) / ry, r = Math.sqrt(ex * ex + ey * ey); if (r > 1) continue;
      var lit = -(ex * 0.5 + ey * 0.9), c;
      if (r > 0.58) c = (r > 0.86 && Math.floor((Math.atan2(ey, ex) + 7) / (Math.PI / 6)) % 2) ? TIRE[0] : (lit > 0.1 ? TIRE[3] : TIRE[2]);
      else if (r > 0.3) c = lit > 0.3 ? RIM[3] : (lit > -0.2 ? RIM[2] : RIM[1]);
      else c = '#23262c';
      g.set(x, y, c);
    }
  }
  var LL = V.loose.llanta = {};
  (function () {
    var g = new G(20, 16); tireFlat(g, 9.5, 7, 8, 5, 3); LL.suelo = frameC(g, 10, 14);
    g = new G(16, 16); tireFace(g, 7.5, 7.5, 7, 7, 0.3); LL.cargado = frameC(g, 8, 15);
    LL.vuelo = [0.1, 0.9, 1.7, 2.5].map(function (a, i) {
      var q = new G(18, 18), rx = [7, 5.2, 3.2, 5.2][i];
      tireFace(q, 8.5, 8.5, rx, 7, a); return frameC(q, 9, 9);
    });
    LL.rueda = [0, 1, 2, 3].map(function (i) { var q = new G(12, 16); tireFace(q, 5.5, 8, 3.6, 7, i * 0.52); return frameC(q, 6, 15); });   // rodando de lado: de canto, tacos girando
    g = new G(24, 14);                                           // reventada: aro abierto, la goma rasgada y dos tiras sueltas
    tireFlat(g, 8.5, 6, 7, 4.2, 2);
    for (var i = 0; i < 6; i++) g.set(10 + i, 3 + (i % 3), null);   // el rasgon
    g.rect(14, 5, 8, 2, TIRE[2]); g.rect(14, 5, 8, 1, TIRE[3]); g.rect(16, 8, 6, 2, TIRE[1]); g.set(21, 7, TIRE[0]); g.rect(18, 10, 4, 1, TIRE[3]);
    g.rect(4, 11, 3, 1, TIRE[3]); g.rect(1, 9, 2, 1, TIRE[2]);
    LL.roto = frameC(g, 12, 12);
    LL.sombra = shadowC(6, 3);
  })();

  /* tablon: tabla de toldo con franjas rojas y blancas de la lona y clavos */
  var WP = ['#4a3220', '#7a5230', '#a87a48', '#d8b078'];
  function plank(g, cx, cy, len, wid, ang, stripe) {              // rectangulo girado con luz arriba; stripe = tiras de lona en un extremo
    var ca = Math.cos(ang), sa = Math.sin(ang), L = len / 2, Wd = wid / 2, R = Math.ceil(L + Wd + 2);
    for (var y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (var x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      var u = (x - cx) * ca + (y - cy) * sa, v = -(x - cx) * sa + (y - cy) * ca;
      if (Math.abs(u) > L || Math.abs(v) > Wd) continue;
      var c = v < -Wd * 0.45 ? WP[3] : (v > Wd * 0.5 ? WP[1] : WP[2]);
      if (Math.abs(u) > L - 1) c = v > 0 ? '#c09a68' : '#e8cc98';                // testa clara
      else if (((u * 1.7 + v * 3) | 0) % 9 === 0 && Math.abs(v) < Wd - 0.5) c = WP[1];  // veta
      if (stripe && u > L - 9 && u < L - 1) { var k = Math.floor((u - (L - 9)) / 2) % 2; c = k ? '#f0ecdc' : '#d4382e'; if (v > Wd * 0.5) c = k ? '#b8b4a2' : '#9a2a22'; }
      g.set(x, y, c);
    }
    var nx = cx + ca * (L - 3), ny = cy + sa * (L - 3); g.set(Math.round(nx), Math.round(ny), '#2a2a30');
    nx = cx - ca * (L - 4); ny = cy - sa * (L - 4); g.set(Math.round(nx), Math.round(ny), '#2a2a30');
  }
  var TB = V.loose.tablon = {};
  (function () {
    var g = new G(34, 10); plank(g, 16.5, 4.2, 30, 4.4, 0.03, true);
    g.rect(4, 7, 26, 1, WP[0]); g.rect(5, 8, 24, 1, '#2a2a3055'); TB.suelo = frameC(g, 17, 8);
    g = new G(34, 12); plank(g, 16.5, 5.5, 30, 4.4, -0.2, true); g.rect(15, 9, 3, 2, '#c99a74'); g.rect(15, 9, 3, 1, '#e8c098'); TB.cargado = frameC(g, 17, 11);
    TB.vuelo = [0.2, 0.95, 1.7, 2.45].map(function (a) { var q = new G(36, 36); plank(q, 17.5, 17.5, 30, 4.4, a, true); return frameC(q, 18, 18); });
    g = new G(34, 14);                                              // partido en dos, astillas
    plank(g, 8, 8, 13, 4.2, 0.35, true); plank(g, 24, 6.5, 14, 4.2, -0.3, false);
    g.set(15, 6, '#e8cc98'); g.set(16, 9, '#e8cc98'); g.set(17, 6, WP[2]); g.set(14, 10, WP[3]); g.set(18, 10, '#e8cc98'); g.set(13, 5, '#e8cc98');
    g.rect(14, 8, 3, 1, '#c09a68'); g.rect(1, 12, 3, 1, WP[1]); g.rect(30, 11, 2, 1, WP[3]);
    TB.roto = frameC(g, 17, 12);
    TB.sombra = shadowC(12, 3);
  })();

  /* basurero verde de Miraflores (mismos colores que props.basureroMira: cuerpo #5a9a6a/#3f7a52/#2a5a3c, aro gris y tapa) */
  function binG(dent) {
    var g = new G(14, 18), x, y;
    for (y = 3; y < 15; y++) for (x = 1; x < 9; x++) {
      var c = x < 3 ? '#5a9a6a' : (x < 6 ? '#3f7a52' : '#2a5a3c'); if (x === 1 && y > 5) c = '#7ab88a'; g.set(x + 2, y, c);
      if (y % 3 === 1 && x > 2 && x < 8) g.set(x + 2, y, '#1c3a28');
    }
    g.rect(3, 14, 8, 1, '#1c3a28'); g.rect(2, 2, 10, 2, '#a8a8b0'); g.rect(2, 2, 10, 1, '#d8d8de'); g.rect(4, 0, 6, 2, '#8a8f96'); g.rect(4, 0, 6, 1, '#cfd3cc'); g.rect(5, 3, 4, 1, '#2d2b36');
    if (dent) { g.set(6, 8, '#2a5a3c'); g.set(7, 8, '#1c3a28'); g.set(6, 9, '#1c3a28'); g.set(10, 6, '#7ab88a'); g.set(9, 11, '#1c3a28'); }
    return g;
  }
  function trashBits(g, pts) { pts.forEach(function (p) { g.rect(p[0], p[1], 2, 2, p[2]); }); }
  var BN = V.loose.basurero = {};
  (function () {
    var g = binG(false); BN.suelo = frameC(g, 6, 14);
    BN.cargado = frameC(binG(true), 6, 14);
    BN.vuelo = [0, 1.57, 3.14, 4.71].map(function (a, i) {
      var q = binG(i > 0); if (i === 1) trashBits(q, [[1, 4, '#e8382a'], [0, 8, '#d8d4c4']]); if (i === 2) trashBits(q, [[3, 15, '#f2d24a'], [10, 14, '#cfe8d8']]); if (i === 3) trashBits(q, [[13, 6, '#d8d4c4'], [14, 10, '#e8382a']]);
      var r = rotG(pad(q, 1), a); return frameC(r, (r.w - 1) / 2 | 0, (r.h - 1) / 2 | 0);
    });
    var h = new G(26, 14), x, y;                                     // abollado y tumbado: cuerpo acostado, tapa aparte y basura
    for (x = 3; x < 17; x++) for (y = 3; y < 11; y++) { var c2 = y < 5 ? '#5a9a6a' : (y < 8 ? '#3f7a52' : '#2a5a3c'); h.set(x, y, c2); if (x % 3 === 1 && y > 4 && y < 10) h.set(x, y, '#1c3a28'); }
    h.rect(16, 4, 2, 6, '#a8a8b0'); h.rect(18, 11, 4, 2, '#8a8f96'); h.set(19, 11, '#cfd3cc'); h.set(8, 5, '#1c3a28'); h.set(9, 6, '#1c3a28'); h.set(9, 5, '#2a5a3c'); h.set(6, 9, '#1c3a28');
    trashBits(h, [[1, 9, '#d8d4c4'], [19, 7, '#e8382a'], [21, 9, '#f2d24a'], [0, 11, '#8a6a42'], [22, 5, '#cfe8d8'], [4, 12, '#8a8f96']]);
    BN.roto = frameC(h, 13, 12);
    BN.sombra = shadowC(6, 3);
  })();

  /* macetero: maceta de barro con planta y flor */
  var CLAY = ['#5a2a1c', '#8a4228', '#b8603a', '#d88a58'], SOIL = ['#2a1a14', '#4a3228'], LEAF = ['#1f4a31', '#2e6a3c', '#4a9a48', '#7cc468'];
  function potG(f) {
    var g = new G(16, 20), x, y;
    for (y = 8; y <= 17; y++) { var hw = 6 - Math.floor((y - 8) * 0.22); for (x = 8 - hw; x <= 8 + hw - 1; x++) g.set(x, y, x < 8 - hw + 2 ? CLAY[3] : (x > 8 + hw - 3 ? CLAY[1] : CLAY[2])); }
    g.rect(1, 7, 14, 3, CLAY[2]); g.rect(1, 7, 14, 1, CLAY[3]); g.rect(1, 9, 14, 1, CLAY[1]); g.rect(14, 8, 1, 2, CLAY[0]);
    g.rect(2, 7, 12, 1, SOIL[1]); g.rect(4, 6, 8, 1, SOIL[0]);
    g.rect(4, 14, 8, 1, CLAY[1]);
    g.rect(5, 17, 6, 1, CLAY[0]);
    // planta: tallos y hojas, una flor rosada
    g.line(8, 7, 8, 2, LEAF[1]); g.line(6, 7, 3, 4, LEAF[1]); g.line(10, 7, 13, 3, LEAF[1]);
    blobR(g, 4, 3.5, 2.6, 1.8, LEAF); blobR(g, 12.5, 3, 2.6, 1.8, LEAF); blobR(g, 8, 2.5, 2, 1.7, LEAF);
    g.rect(7, 0, 3, 2, '#e8388a'); g.set(8, 0, '#fff0f6'); g.set(6, 1, '#e8388a'); g.set(10, 1, '#e8388a'); g.set(8, 1, '#f2c81c');
    if (f) { g.set(6, 2, LEAF[0]); g.set(11, 4, LEAF[0]); }
    return g;
  }
  var MC = V.loose.macetero = {};
  (function () {
    MC.suelo = frameC(potG(0), 8, 17);
    MC.cargado = frameC(potG(1), 8, 17);
    MC.vuelo = [0, 1.57, 3.14, 4.71].map(function (a, i) {
      var q = potG(i); if (i === 2) { q.set(8, 9, SOIL[1]); } var r = rotG(pad(q, 2), a);
      if (i === 2 || i === 3) { var m = (r.w / 2) | 0; r.set(m - 3, 3, SOIL[1]); r.set(m + 2, 5, SOIL[0]); r.set(m, r.h - 5, SOIL[1]); }
      return frameC(r, (r.w - 1) / 2 | 0, (r.h - 1) / 2 | 0);
    });
    var g = new G(26, 12), x, y;                                     // hecha pedazos: cascotes de barro, tierra y la plantita tumbada
    function shard(x0, y0, w, h, c) { for (y = 0; y < h; y++) for (x = 0; x < w - Math.floor(y * w / (h * 1.6)); x++) g.set(x0 + x, y0 + y, y === 0 ? CLAY[3] : (x === 0 ? CLAY[3] : c)); }
    blobR(g, 12, 9, 7, 2.4, [SOIL[0], SOIL[1], '#6a4a38', '#7a5a46']);
    shard(2, 5, 6, 5, CLAY[2]); shard(17, 4, 5, 6, CLAY[1]); shard(8, 3, 4, 4, CLAY[2]); shard(20, 8, 4, 3, CLAY[0]); shard(0, 9, 3, 2, CLAY[1]);
    g.line(11, 8, 15, 5, LEAF[1]); blobR(g, 15.5, 4.5, 2.6, 1.7, LEAF); blobR(g, 9.5, 7, 2, 1.4, LEAF); g.rect(14, 3, 2, 2, '#e8388a'); g.set(14, 3, '#fff0f6');
    MC.roto = frameC(g, 13, 11);
    MC.sombra = shadowC(5, 2);
  })();
});


/* ======================== VENDEDORES: ACH.sprites.v011.npc[id] ======================== */
/* Personas VIVAS de frente (mirando a camara), 40x46, ancla = pies centrados (20,43). Cada id = { idle:[2], hablando (alias talk) }:
   idle[0] = reposo, idle[1] = reposo con parpadeo y el pecho 1 px abajo (alternar cada ~0.5 s), hablando = boca abierta, cejas arriba y una mano alzada.
   Altura de la figura ~28 px (la de Don Tito/Don Pepe de Miraflores). */
var NW = 40, NH = 46, NCX = 20, NFY = 43;
var SKM = ['#5c3a2a', '#80523a', '#a8714c', '#c48f63'];            // piel mestiza
var SKD = ['#4a2e22', '#6e4430', '#94603e', '#b07a50'];            // piel mas oscura
var SKL = ['#6e4630', '#9a6444', '#c48f63', '#e0b484'];            // piel mas clara
var SKA = ['#5a3626', '#7e4e36', '#a46a46', '#c08458'];            // piel andina
function npcHead(g, cx, hy, SK, f, o) {
  o = o || {};
  var y, blink = f === 1 && !o.noBlink, talk = f === 2, ex;
  for (y = hy + 2; y <= hy + 9; y++) span(g, y, cx - 4, cx + 4, SK);
  g.set(cx - 4, hy + 9, null); g.set(cx + 4, hy + 9, null);
  g.rect(cx - 5, hy + 5, 1, 3, SK[1]); g.rect(cx + 5, hy + 5, 1, 3, SK[0]); g.set(cx - 5, hy + 6, SK[2]);   // orejas
  for (var side = -1; side <= 1; side += 2) {
    ex = cx + side * 2;
    if (o.glasses) {
      g.rect(ex - 1, hy + 4, 3, 1, o.glasses); g.rect(ex - 1, hy + 6, 3, 1, o.glasses);
      g.rect(ex - 1, hy + 5, 3, 1, '#d8ecf4'); g.set(ex, hy + 5, blink ? SK[1] : '#141414');
    } else {
      g.set(ex, hy + 5, blink ? SK[0] : '#141414'); if (!blink) g.set(ex + side, hy + 5, '#e8e4d8');
      if (!blink) { g.set(ex - side * 0, hy + 5, '#141414'); }
      g.rect(ex - 1 + (side > 0 ? 0 : 0), talk ? hy + 3 : hy + 4, 2, 1, o.brow || '#26262a');
    }
  }
  if (o.glasses) { g.set(cx, hy + 5, o.glasses); g.set(cx - 4, hy + 5, o.glasses); g.set(cx + 4, hy + 5, o.glasses); g.rect(cx - 3, talk ? hy + 2 : hy + 3, 3, 1, o.brow || '#b8b4a8'); g.rect(cx + 1, talk ? hy + 2 : hy + 3, 3, 1, o.brow || '#b8b4a8'); }
  g.set(cx, hy + 6, SK[1]); g.set(cx, hy + 7, SK[1]); g.set(cx - 1, hy + 7, SK[0]);                           // nariz
  if (o.cheeks) { g.set(cx - 3, hy + 7, o.cheeks); g.set(cx + 3, hy + 7, o.cheeks); g.set(cx - 4, hy + 7, o.cheeks); g.set(cx + 4, hy + 7, o.cheeks); }
  if (o.mustache) { g.rect(cx - 3, hy + 7, 7, 1, o.mustache); g.set(cx - 3, hy + 8, o.mustache); g.set(cx + 3, hy + 8, o.mustache); g.set(cx, hy + 7, SK[1]); }
  if (talk) { g.rect(cx - 1, hy + 8, 3, 2, '#3a1515'); g.set(cx, hy + 9, '#c0506a'); g.set(cx - 1, hy + 8, '#f0ecdc'); g.set(cx + 1, hy + 8, '#f0ecdc'); }
  else { g.rect(cx - 1, hy + 8, 3, 1, '#7a3a30'); g.set(cx - 2, hy + 7, o.mustache ? o.mustache : SK[1]); g.set(cx + 2, hy + 7, o.mustache ? o.mustache : SK[1]); g.set(cx, hy + 9, SK[1]); }
}
function npcHand(g, x, y, SK, open) {                              // mano 3x3 con luz
  g.rect(x - 1, y - 1, 3, 3, SK[2]); g.set(x - 1, y - 1, SK[3]); g.set(x, y - 1, SK[3]); g.set(x + 1, y + 1, SK[1]);
  if (open) { g.set(x - 1, y - 2, SK[2]); g.set(x + 1, y - 2, SK[2]); g.set(x - 2, y, SK[3]); }
}
function npcLegs(g, cx, pants, shoe, shoeHi) {                       // dos piernas de 4 de ancho y zapatos
  [cx - 5, cx + 2].forEach(function (L) {
    for (var y = 36; y <= 41; y++) span(g, y, L, L + 3, pants);
    g.rect(L - 1, 42, 5, 2, shoe); g.rect(L - 1, 42, 5, 1, shoeHi || mix(shoe, '#ffffff', 0.35));
  });
}
function npcTorso(g, cx, hy, r, w) {                                  // torso con bisel; w = semiancho
  for (var y = hy + 10; y <= hy + 18; y++) span(g, y, cx - w, cx + w, r);
}
function npcArm(g, sx, sy, hx, hy2, sleeve, SK, longSl, open) {        // sleeve = rampa; hombro (sx,sy) -> mano (hx,hy2)
  g.rect(sx - 1, sy, 3, 3, sleeve[2]); g.rect(sx - 1, sy, 3, 1, sleeve[3]);
  var x0 = sx, y0 = sy + 3, n = Math.max(Math.abs(hx - x0), Math.abs(hy2 - y0));
  g.line(x0, y0, hx, hy2 - 1, longSl ? sleeve[2] : SK[2]); g.line(x0 + 1, y0, hx + 1, hy2 - 1, longSl ? sleeve[1] : SK[1]); g.line(x0 - 1, y0, hx - 1, hy2 - 1, longSl ? sleeve[3] : SK[3]);
  npcHand(g, hx, hy2, SK, open);
}
function npcMk(g) { outlineRim(g); return mkC(g, NCX, NFY); }
function npcSet(drawFn) {
  var o = { idle: [drawFn(0), drawFn(1)], hablando: drawFn(2) };
  o.talk = o.hablando; return o;
}
safe('npc', function () {
  var cx = NCX;
  /* ---- Don Pocho, el cachinero: gorrita, lentes, bigote canoso, chaleco de muchos bolsillos ---- */
  V.npc.cachinero = npcSet(function (f) {
    var g = new G(NW, NH), hy = 17 + (f === 1 ? 1 : 0), SK = SKM, y, i;
    var PANT = ['#2e2a26', '#4a443c', '#6a6256', '#8a8272'], SHIRT = ['#8a96a0', '#b4bec4', '#dce2e0', '#f4f6f0'], VEST = ['#5a4628', '#7e6638', '#a88a52', '#cbb078'], CAP = ['#26303a', '#38485a', '#52687e', '#7a92a8'];
    npcLegs(g, cx, PANT, '#2a2a30', '#5a5a64'); g.rect(cx - 6, 36, 13, 1, '#1c1a22'); g.set(cx, 36, '#c8a850');
    npcTorso(g, cx, hy, SHIRT, 6);
    // chaleco (dos paneles) con bolsillos y cosas que asoman
    for (y = hy + 10; y <= hy + 18; y++) { span(g, y, cx - 6, cx - 2, VEST); span(g, y, cx + 2, cx + 6, VEST); }
    g.rect(cx - 6, hy + 10, 5, 1, VEST[3]); g.rect(cx + 2, hy + 10, 5, 1, VEST[3]);
    g.set(cx - 1, hy + 10, SHIRT[0]); g.set(cx + 1, hy + 10, SHIRT[0]);
    [[cx - 5, hy + 12], [cx + 2, hy + 12], [cx - 5, hy + 16], [cx + 2, hy + 16]].forEach(function (p) { g.rect(p[0], p[1], 4, 2, VEST[0]); g.rect(p[0], p[1], 4, 1, VEST[1]); g.rect(p[0], p[1] + 1, 4, 1, VEST[2]); });
    g.rect(cx - 4, hy + 11, 1, 2, '#d4382e'); g.rect(cx - 3, hy + 11, 1, 1, '#f0ecdc');     // destornillador de mango rojo
    g.rect(cx + 3, hy + 10, 1, 3, '#f2c81c'); g.set(cx + 3, hy + 10, '#e8742a');           // lapiz
    g.rect(cx - 3, hy + 15, 2, 1, '#c8a850'); g.set(cx + 4, hy + 15, '#c8a850'); g.set(cx + 5, hy + 15, '#9a9a9a');   // llaves y cinta metrica
    g.rect(cx + 3, hy + 15, 2, 1, '#f2c81c');
    g.set(cx - 5, hy + 16, VEST[2]);
    // brazos
    npcArm(g, cx - 8, hy + 10, cx - 9, hy + 18, SHIRT, SK, true, false);
    if (f === 2) npcArm(g, cx + 8, hy + 10, cx + 12, hy + 8, SHIRT, SK, true, true);
    else npcArm(g, cx + 8, hy + 10, cx + 9, hy + 18, SHIRT, SK, true, false);
    // cabeza
    npcHead(g, cx, hy, SK, f, { glasses: '#8a6a3a', mustache: '#c8c4b8', brow: '#a8a498' });
    g.rect(cx - 5, hy + 5, 1, 2, '#c8c4b8'); g.rect(cx + 5, hy + 5, 1, 2, '#c8c4b8');       // patillas canosas
    // gorrita de lana con visera
    for (y = hy - 1; y <= hy + 1; y++) span(g, y, cx - 4 + (y === hy - 1 ? 1 : 0), cx + 4 - (y === hy - 1 ? 1 : 0), CAP);
    g.rect(cx - 5, hy + 2, 11, 1, CAP[0]); g.rect(cx - 4, hy + 2, 9, 1, CAP[1]); g.set(cx - 5, hy + 2, CAP[1]);
    g.set(cx, hy - 2, CAP[3]); g.set(cx - 1, hy - 1, CAP[3]);
    return npcMk(g);
  });

  /* ---- Doña Meche: mandil a cuadros, moño canoso, aretes; (detras de la reja de su bodeguita) ---- */
  function mecheFig(f, crop) {
    var g = new G(NW, NH), hy = 17 + (f === 1 ? 1 : 0), SK = SKL, y, x;
    var SKIRT = ['#26222a', '#3a3440', '#564e5c', '#766e80'], BLOUSE = ['#6e3a52', '#a85a78', '#d4809c', '#f0b0c4'], HAIR = ['#3a3636', '#5a5656', '#8a8686', '#b8b4b0'];
    npcLegs(g, cx, SKIRT, '#3a2a22', '#6a5240');
    for (y = 33; y <= 38; y++) span(g, y, cx - 6, cx + 6, SKIRT);                      // falda por la rodilla
    npcTorso(g, cx, hy, BLOUSE, 5);
    g.rect(cx - 2, hy + 10, 5, 1, SK[1]); g.set(cx - 1, hy + 11, SK[1]); g.set(cx + 1, hy + 11, SK[1]);
    // mandil a cuadros rojo y blanco (pechera + falda)
    for (y = hy + 12; y <= 38; y++) { var w = y < hy + 15 ? 3 : (y < hy + 17 ? 4 : 5); for (x = cx - w; x <= cx + w; x++) g.set(x, y, ((x >> 1) + (y >> 1)) % 2 ? '#d4382e' : '#f0ecdc'); }
    g.set(cx - 3, hy + 11, '#d4382e'); g.set(cx + 3, hy + 11, '#d4382e'); g.set(cx - 2, hy + 11, '#f0ecdc');
    g.rect(cx - 5, hy + 15, 11, 1, '#9a2a22'); g.set(cx - 6, hy + 15, '#d4382e'); g.set(cx + 6, hy + 15, '#d4382e');     // cinta de la cintura
    npcArm(g, cx - 7, hy + 10, cx - 8, hy + 18, BLOUSE, SK, false, false);
    if (f === 2) npcArm(g, cx + 7, hy + 10, cx + 11, hy + 7, BLOUSE, SK, false, true);
    else npcArm(g, cx + 7, hy + 10, cx + 8, hy + 18, BLOUSE, SK, false, false);
    npcHead(g, cx, hy, SK, f, { cheeks: '#d98a7a', brow: '#8a8686' });
    // pelo canoso recogido en un mono arriba, con rayita al medio
    for (y = hy; y <= hy + 2; y++) span(g, y, cx - 4 + (y === hy ? 1 : 0), cx + 4 - (y === hy ? 1 : 0), HAIR);
    g.rect(cx - 5, hy + 2, 1, 3, HAIR[1]); g.rect(cx + 5, hy + 2, 1, 3, HAIR[0]);
    g.set(cx, hy + 1, HAIR[0]); g.set(cx, hy + 2, HAIR[1]);
    blobR(g, cx, hy - 2, 3, 2, HAIR); g.set(cx - 1, hy - 3, HAIR[3]);
    g.set(cx - 5, hy + 7, '#e6c85a'); g.set(cx + 5, hy + 7, '#e6c85a');               // aretes
    if (crop) { for (y = 37; y < NH; y++) for (x = 0; x < NW; x++) g.set(x, y, null); outlineRim(g); return mkC(g, NCX, 36); }
    return npcMk(g);
  }
  V.npc.meche = npcSet(function (f) { return mecheFig(f, false); });
  V.npc.meche.busto = npcSet(function (f) { return mecheFig(f, true); });      // de la cintura para arriba, ancla (20,36) = la cintura: para asomarla por la ventana de la bodeguita

  /* ---- El pintor: boina, barba, camisa con manchas de pintura, paleta y pincel ---- */
  V.npc.pintor = npcSet(function (f) {
    var g = new G(NW, NH), hy = 17 + (f === 1 ? 1 : 0), SK = SKM, y, i;
    var JEAN = ['#1c2a44', '#2c4470', '#42649c', '#6a8cc0'], SMOCK = ['#9a9684', '#c4bfa8', '#e6e2d2', '#f8f6ec'], BER = ['#3a1a1a', '#6a2a2a', '#9a3a3a', '#c25a5a'], BRD = ['#1c1410', '#2e2018', '#46321f', '#5e4630'];
    npcLegs(g, cx, JEAN, '#3a2a22', '#7a5a44');
    g.rect(cx - 4, 38, 2, 1, '#d4382e'); g.set(cx + 3, 40, '#f2c81c'); g.set(cx + 4, 40, '#f2c81c'); g.set(cx - 3, 40, '#38b0ac');   // manchas en el pantalon
    npcTorso(g, cx, hy, SMOCK, 6);
    g.rect(cx - 1, hy + 10, 3, 1, SK[1]);
    // manchas de pintura en la camisa
    [[cx - 4, hy + 13, '#d4382e', 2], [cx + 2, hy + 12, '#2a78b8', 2], [cx - 2, hy + 16, '#f2c81c', 2], [cx + 3, hy + 16, '#38b0ac', 2], [cx - 5, hy + 17, '#e8388a', 1], [cx + 5, hy + 14, '#52b048', 1], [cx, hy + 14, '#e8742a', 1]].forEach(function (p) {
      g.rect(p[0], p[1], p[3], p[3] === 2 ? 2 : 1, p[2]); if (p[3] === 2) g.set(p[0] + 1, p[1] + 2, p[2]);
    });
    // brazo izquierdo (del lado de la camara) sostiene la paleta; el derecho, el pincel
    npcArm(g, cx - 8, hy + 10, cx - 10, hy + 17, SMOCK, SK, true, false);
    // paleta de madera con gotas de color, a la cadera
    var px0 = cx - 17, py0 = hy + 15;
    blobR(g, px0 + 5, py0 + 3.5, 5.5, 3.6, ['#6b4223', '#8a5a30', '#a8743c', '#c99458']); g.set(px0 + 7, py0 + 4, null); g.set(px0 + 6, py0 + 4, null);
    g.set(px0 + 2, py0 + 2, '#d4382e'); g.set(px0 + 4, py0 + 1, '#f2c81c'); g.set(px0 + 7, py0 + 2, '#2a78b8'); g.set(px0 + 9, py0 + 3, '#52b048'); g.set(px0 + 3, py0 + 5, '#ffffff'); g.set(px0 + 8, py0 + 5, '#e8388a');
    npcHand(g, cx - 10, hy + 17, SK, false);
    if (f === 2) {
      npcArm(g, cx + 8, hy + 10, cx + 13, hy + 6, SMOCK, SK, true, true);
      g.line(cx + 13, hy + 4, cx + 15, hy - 2, '#a86e38'); g.rect(cx + 15, hy - 4, 1, 2, '#2a78b8');
    } else {
      npcArm(g, cx + 8, hy + 10, cx + 10, hy + 14, SMOCK, SK, true, false);
      g.line(cx + 10, hy + 13, cx + 13, hy + 7, '#a86e38'); g.line(cx + 11, hy + 13, cx + 14, hy + 7, '#6b4223'); g.rect(cx + 13, hy + 4, 1, 3, '#d4382e'); g.set(cx + 13, hy + 3, '#d4382e');
    }
    npcHead(g, cx, hy, SK, f, { brow: '#2e2018' });
    // barba corta y bigote, pelo oscuro en las patillas
    for (y = hy + 7; y <= hy + 10; y++) { var hw = y === hy + 10 ? 2 : 4; for (var x = cx - hw; x <= cx + hw; x++) g.set(x, y, (x + y) % 3 === 0 ? BRD[3] : BRD[2]); }
    g.rect(cx - 5, hy + 5, 1, 3, BRD[1]); g.rect(cx + 5, hy + 5, 1, 3, BRD[0]);
    if (f === 2) { g.rect(cx - 1, hy + 8, 3, 2, '#3a1515'); g.set(cx, hy + 9, '#c0506a'); } else { g.rect(cx - 1, hy + 8, 3, 1, '#7a3a30'); }
    // boina caida a un lado, con rabito
    for (y = hy - 2; y <= hy + 1; y++) span(g, y, cx - 5 + (y === hy - 2 ? 2 : 0), cx + 5 - (y === hy - 2 ? 1 : 0), BER);
    g.rect(cx - 6, hy + 1, 12, 1, BER[0]); g.rect(cx - 5, hy + 2, 10, 1, BER[1]); g.set(cx + 2, hy - 3, BER[1]); g.set(cx + 2, hy - 4, BER[0]);
    return npcMk(g);
  });

  /* ---- Doña Rosa: sombrero, trenzas, chompa tejida con guardas, pollera ---- */
  V.npc.rosa = npcSet(function (f) {
    var g = new G(NW, NH), hy = 17 + (f === 1 ? 1 : 0), SK = SKA, y, x;
    var POL = ['#4a1a4a', '#7a2a72', '#a84a9a', '#d070c4'], HAT = ['#3a2a1a', '#5a4228', '#7e6038', '#a48458'], KN = ['#7a2a1a', '#b8402a', '#e0643a', '#ff9a68'], BRAID = ['#14121a', '#22202a', '#34303c', '#4a4654'];
    npcLegs(g, cx, ['#3a3040', '#4e4458', '#665a72', '#867a92'], '#2a2024', '#5a4a52');
    // pollera acampanada con dos bandas de colores
    for (y = 31; y <= 40; y++) { var hw = 5 + Math.floor((y - 31) * 0.3); span(g, y, cx - hw, cx + hw, POL); }
    g.rect(cx - 7, 37, 15, 1, '#f2c81c'); g.rect(cx - 7, 38, 15, 1, '#38b0ac'); g.rect(cx - 8, 40, 17, 1, '#e8388a'); g.rect(cx - 8, 41, 17, 1, '#d4382e');
    for (x = cx - 7; x <= cx + 7; x += 3) g.set(x, 35, POL[3]);
    // chompa tejida: base roja con guardas en zigzag
    npcTorso(g, cx, hy, KN, 6);
    for (y = hy + 11; y <= hy + 17; y += 3) for (x = cx - 5; x <= cx + 5; x++) {
      var zz = (x + (y % 2 ? 1 : 0)) % 4;
      g.set(x, y, zz < 2 ? '#f2c81c' : '#1c4a78'); if (zz === 1 || zz === 3) g.set(x, y + 1, '#f0ecdc');
    }
    g.rect(cx - 6, hy + 18, 13, 1, KN[0]); g.rect(cx - 2, hy + 10, 5, 1, KN[1]);          // cuello vuelto
    g.rect(cx - 1, hy + 9, 3, 1, SK[1]);
    // llama bordada en el pecho (guiño): una manchita clara con patas
    g.rect(cx - 1, hy + 13, 3, 2, '#f0ecdc'); g.set(cx + 1, hy + 12, '#f0ecdc'); g.set(cx - 1, hy + 15, '#f0ecdc'); g.set(cx + 1, hy + 15, '#f0ecdc');
    npcArm(g, cx - 8, hy + 10, cx - 9, hy + 18, KN, SK, true, false);
    if (f === 2) npcArm(g, cx + 8, hy + 10, cx + 12, hy + 8, KN, SK, true, true);
    else npcArm(g, cx + 8, hy + 10, cx + 9, hy + 18, KN, SK, true, false);
    // trenzas largas hasta el pecho, con moños rojos
    [-1, 1].forEach(function (sd) {
      var bx = cx + sd * 6;
      for (y = hy + 4; y <= hy + 17; y++) { var wv = (y % 3 === 0) ? 1 : 0; g.set(bx + wv * sd, y, BRAID[2]); g.set(bx + (wv ? 0 : sd), y, BRAID[1]); g.set(bx - sd * 1 + (wv ? sd : 0), y, BRAID[0]); }
      g.rect(bx - 1, hy + 18, 3, 1, '#d4382e'); g.rect(bx - 1, hy + 19, 3, 1, BRAID[1]);
    });
    npcHead(g, cx, hy, SK, f, { cheeks: '#e07a6a', brow: '#14121a' });
    for (y = hy + 1; y <= hy + 2; y++) span(g, y, cx - 4, cx + 4, BRAID);                   // pelo negro con raya
    g.set(cx, hy + 2, BRAID[0]); g.rect(cx - 5, hy + 2, 1, 4, BRAID[1]); g.rect(cx + 5, hy + 2, 1, 4, BRAID[0]);
    // sombrero de ala ancha, con cinta y una florcita
    for (y = hy - 3; y <= hy; y++) span(g, y, cx - 3 - (y === hy - 3 ? 0 : 0), cx + 3, HAT);
    g.rect(cx - 2, hy - 4, 5, 1, HAT[3]); g.rect(cx - 8, hy + 1, 17, 1, HAT[2]); g.rect(cx - 8, hy + 1, 17, 1, HAT[2]); g.rect(cx - 7, hy + 2, 15, 1, HAT[1]); g.set(cx - 8, hy + 2, null); g.set(cx + 8, hy + 2, null);
    g.rect(cx - 8, hy + 1, 3, 1, HAT[3]); g.rect(cx - 3, hy, 7, 1, '#d4382e');
    g.set(cx + 3, hy - 1, '#f2c81c'); g.set(cx + 4, hy - 1, '#e8388a'); g.set(cx + 3, hy - 2, '#e8388a');
    return npcMk(g);
  });
});


/* ======================== PUESTOS: ACH.sprites.v011.puesto[id] ======================== */
function dab(g, x, y, w, h, c) { g.rect(x, y, w, h, c); }
safe('puesto', function () {
  var x, y, i;
  /* ---- la cachina: manta andina en el piso con radio, plancha, fierros, reloj, zapatos y un letrero de carton. 96x58, ancla (48,52) = centro del borde de abajo de la manta ---- */
  (function () {
    var g = new G(96, 58), BANDS = ['#b8323a', '#e8a828', '#2a8a8a', '#c8487e'], WDK = ['#4a2e18', '#6b4223', '#a86e38', '#c99458'], MET = RC.metal || ['#3b4250', '#5c6570', '#7e868a', '#a4abaa', '#cfd3cc'];
    function sh(cx, cy, rx, ry) {                                     // sombra: oscurece lo que ya hay (la manta), sin pixeles translucidos
      for (var yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) for (var xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
        var q = g.get(xx, yy), dx = (xx - cx) / rx, dy = (yy - cy) / ry; if (q && dx * dx + dy * dy <= 1) g.set(xx, yy, mix(q, '#000000', 0.38));
      }
    }
    // manta: trapecio en perspectiva (mas angosta atras), franjas anchas y un borde tejido
    for (y = 26; y <= 52; y++) {
      var t = (y - 26) / 26, x0 = Math.round(10 - t * 8), x1 = Math.round(84 + t * 8);
      for (x = x0; x <= x1; x++) {
        var band = Math.floor((x - x0 + 6) / 8) % BANDS.length, c = BANDS[band];
        if ((x + y) % 4 === 0) c = mix(c, '#000000', 0.12);
        if (y === 26 || y === 27) c = mix(c, '#ffffff', 0.3); else if (y >= 50) c = mix(c, '#000000', 0.28);
        if (x < x0 + 2 || x > x1 - 2) c = '#e8d8b8';
        g.set(x, y, c);
      }
    }
    for (x = 2; x <= 93; x += 2) { g.set(x, 53, '#e8d8b8'); g.set(x, 54, (x % 4 === 0) ? '#b8a888' : '#e8d8b8'); }
    // radio de transistores (izquierda atras)
    sh(21, 37, 10, 2);
    dab(g, 12, 23, 18, 13, WDK[1]); dab(g, 12, 23, 18, 2, WDK[3]); dab(g, 12, 35, 18, 1, WDK[0]); dab(g, 29, 23, 1, 13, WDK[0]);
    dab(g, 14, 27, 8, 7, '#2a2a30'); for (i = 0; i < 4; i++) dab(g, 15, 28 + i * 2 - (i > 2 ? 1 : 0), 6, 1, '#5a5a66');
    dab(g, 23, 27, 5, 3, '#e8e0c0'); dab(g, 23, 27, 5, 1, '#f8f0d8'); g.set(25, 28, '#d4382e'); dab(g, 24, 32, 3, 3, '#c8a850'); g.set(25, 33, '#7a5a1c');
    g.line(26, 23, 33, 11, MET[3]); g.set(33, 10, MET[4]); dab(g, 15, 21, 6, 2, '#2a2a30');
    // plancha (centro)
    sh(42, 45, 9, 2);
    for (y = 0; y < 7; y++) span(g, 37 + y, 34 + (y < 3 ? 0 : Math.floor((y - 2) / 2)), 49 - Math.min(y, 4), [MET[1], MET[2], MET[3], MET[4]]);
    dab(g, 38, 33, 9, 4, '#1c1a22'); dab(g, 39, 33, 7, 1, '#4a4a56'); dab(g, 37, 36, 2, 2, '#1c1a22'); dab(g, 46, 36, 2, 2, '#1c1a22');
    dab(g, 35, 43, 12, 1, MET[1]); g.set(36, 39, MET[4]);
    // fierros cruzados: llave inglesa y martillo
    sh(60, 46, 9, 2);
    g.line(52, 44, 66, 34, MET[3]); g.line(52, 45, 66, 35, MET[1]); dab(g, 50, 42, 4, 5, MET[3]); g.set(51, 43, '#1c1a22'); g.set(51, 44, '#1c1a22'); dab(g, 66, 31, 5, 5, MET[2]); g.set(67, 31, '#1c1a22'); g.set(68, 32, '#1c1a22');
    g.line(53, 38, 68, 44, '#a86e38'); g.line(53, 37, 68, 43, '#c99458'); dab(g, 51, 34, 6, 6, MET[2]); dab(g, 51, 34, 6, 1, MET[4]); dab(g, 51, 34, 1, 6, MET[4]); dab(g, 56, 35, 1, 4, MET[0]);
    // reloj despertador (derecha)
    sh(76, 40, 6, 2);
    blobR(g, 76, 34, 6, 6, ['#8a1a1a', '#b82a22', '#e8382c', '#ff7a62']); blobR(g, 76, 34.5, 4, 4, ['#cfc8b0', '#e8e2cc', '#f4f0e0', '#ffffff']);
    g.line(76, 34, 76, 31, '#141216'); g.line(76, 34, 78, 35, '#141216'); g.rect(71, 28, 2, 2, '#c8a850'); g.rect(80, 28, 2, 2, '#c8a850'); dab(g, 72, 40, 2, 2, '#8a1a1a'); dab(g, 79, 40, 2, 2, '#8a1a1a');
    // zapatos gastados (un par) delante, y una bota negra
    [[12, 45], [25, 46]].forEach(function (p) {
      sh(p[0] + 5, p[1] + 5, 7, 2);
      dab(g, p[0], p[1], 10, 4, '#6b4223'); dab(g, p[0], p[1], 10, 1, '#a86e38'); dab(g, p[0] - 1, p[1] + 3, 12, 2, '#2a1a10'); dab(g, p[0] + 7, p[1] - 2, 3, 3, '#6b4223'); g.set(p[0] + 8, p[1] + 1, '#e8e4d4'); g.set(p[0] + 5, p[1], '#e8e4d4'); g.set(p[0] + 3, p[1] + 1, '#e8e4d4');
    });
    sh(83, 48, 6, 2);
    dab(g, 80, 41, 5, 8, '#2a2a34'); dab(g, 80, 41, 5, 1, '#4a4a56'); dab(g, 79, 47, 9, 2, '#141216'); dab(g, 85, 45, 2, 3, '#2a2a34');
    // letrero de carton en un palo, atras a la derecha
    g.line(78, 11, 78, 26, '#a86e38'); g.line(79, 11, 79, 26, '#6b4223');
    dab(g, 58, 2, 36, 11, '#c8a070'); dab(g, 58, 2, 36, 1, '#e0c090'); dab(g, 58, 12, 36, 1, '#8a6a40'); dab(g, 93, 2, 1, 11, '#8a6a40');
    px.text(g, 'TODO S/5', 61, 5, { font: 'a5', ink: '#b8201c' });
    g.set(59, 3, '#6a4a2a'); g.set(92, 11, '#6a4a2a');
    outlineRim(g);
    V.puesto.cachina = mkC(g, 48, 52);
  })();

  /* ---- bodeguita de Doña Meche: ventana enrejada. 76x66, ancla (38,64) = pie de la pared. Capas (misma ancla): fondo (pared, letrero, interior con productos),
          frente (reja, mostrador y frasco) y el conjunto sin Meche. Meche (npc.meche.busto) va ENTRE fondo y frente, con su ancla en (38 + 0, 64 - 20) ---- */
  (function () {
    var W = 76, H = 66, WALL = ['#8a4a40', '#b86a58', '#d98a78', '#f0b8a2'], g, x, y, i;
    function wall(gg) {                                                                   // pared tarrajeada y pintada, con manchas de humedad y zocalo
      for (y = 0; y < H - 2; y++) for (x = 0; x < W; x++) { var c = y < 3 ? WALL[3] : WALL[2]; if ((x * 7 + y * 13) % 29 === 0) c = WALL[1]; if (y > H - 14 && (x * 5 + y) % 17 < 3) c = WALL[1]; gg.set(x, y, c); }
      for (y = H - 8; y < H - 2; y++) for (x = 0; x < W; x++) gg.set(x, y, y === H - 8 ? '#cfc9b6' : '#8a8878');
      gg.rect(0, 0, 1, H - 2, WALL[3]); gg.rect(W - 1, 0, 1, H - 2, WALL[0]);
    }
    var WX0 = 14, WX1 = 61, WY0 = 18, WY1 = 46;                                          // vano de la ventana
    function interior(gg) {
      gg.rect(WX0, WY0, WX1 - WX0 + 1, WY1 - WY0 + 1, '#2e2622');
      gg.rect(WX0, WY0, WX1 - WX0 + 1, 3, '#1c1612');
      // estantes laterales con productos genericos (sin marcas)
      [[WX0 + 1, 8], [WX1 - 9, 8]].forEach(function (sh, k) {
        gg.rect(sh[0], 27, sh[1], 1, '#6b4223'); gg.rect(sh[0], 35, sh[1], 1, '#6b4223'); gg.rect(sh[0], 43, sh[1], 1, '#6b4223');
        // piso de arriba: latas
        [['#d4382e', 0], ['#f2c81c', 3], ['#2a78b8', 6]].forEach(function (cn, j) { if (cn[1] < sh[1] - 1) { gg.rect(sh[0] + cn[1], 22, 3, 5, cn[0]); gg.rect(sh[0] + cn[1], 22, 3, 1, mix(cn[0], '#ffffff', 0.5)); gg.set(sh[0] + cn[1], 25, mix(cn[0], '#000000', 0.3)); } });
        // piso medio: paquetes de galletas y fideos
        gg.rect(sh[0] + (k ? 1 : 0), 30, 3, 5, '#f2c81c'); gg.rect(sh[0] + 3 + (k ? 1 : 0), 31, 3, 4, '#52b048'); gg.rect(sh[0] + 6 + (k ? 1 : 0), 30, 2, 5, '#e8388a');
        // piso de abajo: botellas verdes y una bolsa de arroz
        gg.rect(sh[0] + (k ? 4 : 0), 38, 2, 5, '#2f7a52'); gg.rect(sh[0] + (k ? 4 : 0), 37, 1, 1, '#2f7a52'); gg.rect(sh[0] + 3 + (k ? 4 : 0), 38, 2, 5, '#a8452a'); gg.rect(sh[0] + 6 - (k ? 6 : 0), 39, 4, 4, '#e8e0c8');
      });
      // sachets colgando de un cordel arriba
      gg.line(WX0 + 2, WY0 + 4, WX1 - 2, WY0 + 4, '#8a6a40');
      for (x = WX0 + 4; x < WX1 - 3; x += 4) { var cc = ['#e8388a', '#38b0ac', '#f2c81c', '#d4382e', '#52b048'][(x >> 2) % 5]; gg.rect(x, WY0 + 5, 2, 3, cc); gg.set(x, WY0 + 5, mix(cc, '#ffffff', 0.5)); }
      // foco desnudo
      gg.set(38, WY0 + 1, '#fff2b0'); gg.rect(37, WY0 + 2, 3, 1, '#ffd84a');
    }
    function letrero(gg) {                                                              // tablon pintado a mano: BODEGA MECHE
      gg.rect(10, 3, 56, 12, '#f0e8c8'); gg.rect(10, 3, 56, 1, '#fff8e0'); gg.rect(10, 14, 56, 1, '#b8a878'); gg.rect(10, 3, 1, 12, '#fff8e0'); gg.rect(65, 3, 1, 12, '#b8a878');
      gg.rect(12, 5, 52, 8, '#f2c81c'); gg.rect(12, 5, 52, 1, '#ffe870'); gg.rect(12, 12, 52, 1, '#c89a10');
      var T = 'BODEGA MECHE', xx = 14;
      for (i = 0; i < T.length; i++) { var ch = T[i]; if (ch === ' ') { xx += 3; continue; } px.text(gg, ch, xx, 6 + (i % 2 ? 0 : 0), { font: 'a5', ink: i % 2 ? '#c42b26' : '#a01c1c' }); xx += 4; }
      gg.set(11, 4, '#8a6a40'); gg.set(64, 4, '#8a6a40'); gg.set(11, 13, '#8a6a40'); gg.set(64, 13, '#8a6a40');
      gg.line(14, 14, 62, 14, '#b8a878');
    }
    function reja(gg) {                                                                 // reja de fierro: barrotes 2 px, riel horizontal y mostrador
      for (x = WX0 + 3; x <= WX1 - 1; x += 7) { gg.rect(x, WY0, 1, WY1 - WY0 - 3, '#5a5a6a'); gg.rect(x + 1, WY0, 1, WY1 - WY0 - 3, '#16141a'); }
      gg.rect(WX0 - 1, WY0 - 1, WX1 - WX0 + 3, 2, '#16141a'); gg.rect(WX0 - 1, WY0 - 1, WX1 - WX0 + 3, 1, '#4a4a58');
      gg.rect(WX0 - 1, 31, WX1 - WX0 + 3, 1, '#4a4a58'); gg.rect(WX0 - 1, 32, WX1 - WX0 + 3, 1, '#16141a');
      gg.rect(WX0 - 1, WY0, 1, WY1 - WY0 + 1, '#16141a'); gg.rect(WX1 + 1, WY0, 1, WY1 - WY0 + 1, '#16141a');
      for (x = WX0 + 3; x <= WX1 - 1; x += 7) gg.set(x, WY0 + 4, '#9a9aa8');                // remaches
      // mostrador de cemento que sobresale
      gg.rect(WX0 - 3, WY1 - 3, WX1 - WX0 + 7, 5, '#a9a79b'); gg.rect(WX0 - 3, WY1 - 3, WX1 - WX0 + 7, 1, '#d8d4c4'); gg.rect(WX0 - 3, WY1 + 1, WX1 - WX0 + 7, 1, '#66656b');
      gg.rect(WX0 - 3, WY1 + 2, WX1 - WX0 + 7, 2, '#45434f');
      // frasco de caramelos y balanza sobre el mostrador (frente)
      gg.rect(WX1 - 8, WY1 - 9, 6, 6, '#cfe6f0'); gg.rect(WX1 - 8, WY1 - 9, 6, 1, '#fbf8ec'); gg.rect(WX1 - 7, WY1 - 7, 4, 3, '#e8388a'); gg.set(WX1 - 6, WY1 - 6, '#f2c81c'); gg.set(WX1 - 4, WY1 - 7, '#52b048'); gg.rect(WX1 - 8, WY1 - 10, 6, 1, '#d4382e');
      gg.rect(WX0 + 2, WY1 - 6, 8, 3, '#d8b078'); gg.rect(WX0 + 2, WY1 - 6, 8, 1, '#f0d098'); gg.rect(WX0 + 3, WY1 - 5, 2, 1, '#8a5a2a'); gg.rect(WX0 + 6, WY1 - 5, 3, 1, '#8a5a2a');       // huevos en bandeja de carton
    }
    function cartel(gg) {                                                               // cartelito de lata abajo
      gg.rect(26, 52, 24, 7, '#f0ecdc'); gg.rect(26, 52, 24, 1, '#ffffff'); gg.rect(26, 58, 24, 1, '#b8b4a2');
      px.text(gg, 'FIADO NO', 28, 53, { font: 'a5', ink: '#c42b26' });
    }
    // fondo = pared + letrero + interior; frente = reja + mostrador;  conjunto = ambos
    function build(layer) {
      var gg = new G(W, H);
      if (layer === 'fondo' || layer === 'todo') { wall(gg); interior(gg); letrero(gg); cartel(gg); gg.rect(WX0 - 2, WY0 - 2, 2, WY1 - WY0 + 4, '#d8d4c4'); gg.rect(WX1 + 1, WY0 - 2, 2, WY1 - WY0 + 4, '#a9a79b'); gg.rect(WX0 - 2, WY0 - 3, WX1 - WX0 + 5, 2, '#d8d4c4'); outlineRim(gg); }
      if (layer === 'frente' || layer === 'todo') reja(gg);                              // la reja va SIN contorno (si no, los barrotes tapan a Meche)
      return mkC(gg, 38, 64);
    }
    var todo = build('todo'); todo.fondo = build('fondo'); todo.frente = build('frente');
    // frente sin contorno de pared: el contorno del frente solo rodea la reja y el mostrador (el resto es transparente)
    todo.mecheBusto = { dx: 0, dy: -20 };                                                // donde poner el ancla de npc.meche.busto respecto al ancla de la bodeguita
    V.puesto.bodeguita = todo;
  })();

  /* ---- caballetes del pintor: tres caballetes (gato naranja, mar con sol, gato blanquinegro), un banquito y un frasco con pinceles. 92x50, ancla (46,47) ---- */
  (function () {
    var g = new G(92, 50), WDK = ['#4a2e18', '#6b4223', '#a86e38', '#c99458'];
    function easel(ox, oy, w, h, paint) {                                                // ox,oy = esquina sup. izq. del lienzo
      var cx2 = ox + (w >> 1), by = oy + h + 14;
      g.line(ox + 1, oy - 2, ox - 4, by, WDK[1]); g.line(ox + 2, oy - 2, ox - 3, by, WDK[2]);                    // patas delanteras abiertas
      g.line(ox + w - 2, oy - 2, ox + w + 3, by, WDK[1]); g.line(ox + w - 3, oy - 2, ox + w + 2, by, WDK[0]);
      g.line(cx2, oy - 3, cx2 + 1, by - 3, WDK[0]);                                                              // pata de atras
      g.rect(ox - 1, oy + h + 1, w + 2, 2, WDK[2]); g.rect(ox - 1, oy + h + 1, w + 2, 1, WDK[3]); g.rect(ox - 1, oy + h + 2, w + 2, 1, WDK[0]);   // repisa
      g.rect(cx2 - 1, oy - 4, 3, 2, WDK[3]);                                                                    // travesano superior
      g.rect(ox - 1, oy - 1, w + 2, h + 2, '#efe8d6'); g.rect(ox - 1, oy - 1, w + 2, 1, '#ffffff'); g.rect(ox + w, oy - 1, 1, h + 2, '#b8b09a'); g.rect(ox - 1, oy + h, w + 2, 1, '#b8b09a');     // marco/lienzo
      paint(ox, oy, w, h);
    }
    easel(4, 6, 20, 18, function (ox, oy, w, h) {                                                               // gato naranja sobre fondo turquesa
      g.rect(ox, oy, w, h, '#58a8a0'); g.rect(ox, oy + h - 4, w, 4, '#3a7a74');
      blobR(g, ox + 10, oy + 13, 6, 4.4, ['#a8571f', '#d27a2a', '#e8944a', '#f4b878']); blobR(g, ox + 10, oy + 7, 4.6, 4, ['#a8571f', '#d27a2a', '#e8944a', '#f4b878']);
      g.set(ox + 6, oy + 3, '#d27a2a'); g.set(ox + 6, oy + 2, '#a8571f'); g.set(ox + 14, oy + 3, '#d27a2a'); g.set(ox + 14, oy + 2, '#a8571f'); g.set(ox + 7, oy + 3, '#e8a0a0'); g.set(ox + 13, oy + 3, '#e8a0a0');
      g.rect(ox + 7, oy + 6, 2, 2, '#f2e63c'); g.rect(ox + 11, oy + 6, 2, 2, '#f2e63c'); g.set(ox + 8, oy + 7, '#141216'); g.set(ox + 12, oy + 7, '#141216'); g.set(ox + 10, oy + 9, '#d98a9e');
      g.line(ox + 7, oy + 4, ox + 8, oy + 3, '#7a3a14'); g.line(ox + 12, oy + 3, ox + 13, oy + 4, '#7a3a14');
      g.line(ox + 16, oy + 15, ox + 19, oy + 11, '#d27a2a'); g.set(ox + 19, oy + 10, '#f4b878');
    });
    easel(34, 3, 24, 20, function (ox, oy, w, h) {                                                              // el mar con sol y un velero
      for (var yy = 0; yy < 11; yy++) g.rect(ox, oy + yy, w, 1, yy < 4 ? '#7ab8e0' : (yy < 8 ? '#a8d4ee' : '#f4d890'));
      g.ell(ox + 16, oy + 7, 3, 3, '#ffd84a'); g.rect(ox, oy + 11, w, h - 11, '#2a78b8'); g.rect(ox, oy + 14, w, 2, '#1c5a96'); g.rect(ox, oy + 18, w, 2, '#164a80');
      for (var wx = 1; wx < w - 2; wx += 5) { g.rect(ox + wx, oy + 12 + (wx % 2), 3, 1, '#e8f4ff'); g.rect(ox + wx + 2, oy + 16, 3, 1, '#a8d4ee'); }
      g.rect(ox + 5, oy + 10, 1, 4, '#4a2e18'); g.rect(ox + 6, oy + 9, 1, 3, '#f0ecdc'); g.rect(ox + 7, oy + 10, 1, 2, '#f0ecdc'); g.rect(ox + 4, oy + 14, 5, 1, '#d4382e');
    });
    easel(66, 8, 18, 16, function (ox, oy, w, h) {                                                              // gato blanquinegro sobre rosado
      g.rect(ox, oy, w, h, '#e0809c'); g.rect(ox, oy + h - 3, w, 3, '#b85a7a');
      blobR(g, ox + 9, oy + 11.5, 5.4, 4, ['#16141a', '#26242c', '#3a3844', '#56525e']); blobR(g, ox + 9, oy + 6, 4.2, 3.7, ['#16141a', '#26242c', '#3a3844', '#56525e']);
      g.rect(ox + 8, oy + 9, 3, 4, '#f0ecdc'); g.set(ox + 5, oy + 3, '#26242c'); g.set(ox + 13, oy + 3, '#26242c'); g.set(ox + 5, oy + 2, '#16141a'); g.set(ox + 13, oy + 2, '#16141a');
      g.rect(ox + 6, oy + 5, 2, 2, '#8ae070'); g.rect(ox + 10, oy + 5, 2, 2, '#8ae070'); g.set(ox + 7, oy + 6, '#141216'); g.set(ox + 11, oy + 6, '#141216'); g.set(ox + 9, oy + 8, '#f0ecdc'); g.set(ox + 8, oy + 7, '#e8a0a0');
    });
    // banquito y frasco con pinceles / lata de pintura, al pie
    g.rect(2, 36, 9, 2, WDK[3]); g.rect(2, 36, 9, 1, '#e0b878'); g.line(3, 38, 2, 45, WDK[1]); g.line(9, 38, 10, 45, WDK[0]); g.rect(3, 41, 7, 1, WDK[0]);
    g.rect(70, 40, 8, 6, '#cfd3cc'); g.rect(70, 40, 8, 1, '#ffffff'); g.rect(70, 45, 8, 1, '#7e868a'); g.rect(70, 41, 8, 2, '#d4382e'); g.rect(72, 43, 4, 1, '#f2c81c');
    g.line(72, 40, 74, 33, '#a86e38'); g.line(75, 40, 77, 34, '#a86e38'); g.rect(73, 31, 2, 3, '#2a78b8'); g.rect(76, 32, 2, 3, '#52b048');
    g.rect(78, 44, 5, 2, '#38b0ac'); g.rect(79, 43, 3, 1, '#e8388a');                           // charquito de pintura derramada
    outlineRim(g);
    V.puesto.caballetes = mkC(g, 46, 47);
  })();
});


/* ======================== GUANTE DE BOX INFLABLE EN LA MANO: ACH.sprites.v011.inflables.guanteInflable ======================== */
/* Mismo formato que ACH.sprites.alexInflable[toyId] (arte-personajes.js): guanteInflable[bird|nobird] = { walk:{right,left,down,up:[4]}, swing:{right,left,down,up:[3]}, idle:{right,left,down,up} }
   mismos lienzos y anclas que alex.walk (20x28 @10,26; izq @9,26) y alex.attack (lado 32x30 @13,26; izq @18,26; frente y espaldas 32x48 @16,38).
   Se compone sobre Alexander SIN guitarra (alex.<bird|nobird>.g3.walk) y se hornea perezoso al primer acceso (necesita que sprites.js ya haya hecho a Alexander).
   Ademas, al terminar de cargar la pagina se copia a ACH.sprites.alexInflable.guanteInflable si esa tabla existe y no lo tiene (para que inflables.js lo encuentre con el mismo codigo que los otros). */
safe('guante', function () {
  var CP = (CH && CH.P) || { skin: '#a8714c', skinD: '#80523a', skinL: '#c48f63', blue: '#1f2f66', white: '#e6e6e0' };
  var colCache = {};
  function col(h) { var v = colCache[h]; if (v === undefined) { var r = px.hex2rgb(h); v = colCache[h] = ((255 << 24) | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0; } return v; }
  var KC = col('#141216'), RIM_HI = col(CP.rimHi || '#d5dbe0'), RIM_LO = col(CP.rimLo || '#9fb0c4'), C_SKIN = col(CP.skin), C_BLUE = col(CP.blue), C_WHITE = col(CP.white);
  function Buf(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  Buf.prototype.set = function (x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { return (x >= 0 && y >= 0 && x < this.w && y < this.h) ? this.d[y * this.w + x] : 0; };
  Buf.prototype.blit = function (o, ox, oy) { for (var y = 0; y < o.h; y++) for (var x = 0; x < o.w; x++) { var c = o.d[y * o.w + x]; if (c) this.set(x + ox, y + oy, c); } };
  Buf.prototype.outlineRim = function () {
    var w = this.w, h = this.h, d = this.d, i, x, y, add = [];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; if (d[i]) continue; if ((x > 0 && d[i - 1]) || (x < w - 1 && d[i + 1]) || (y > 0 && d[i - w]) || (y < h - 1 && d[i + w])) add.push(i); }
    for (i = 0; i < add.length; i++) d[add[i]] = KC;
    var ed = [];
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (d[i] !== KC) continue;
      var up = y > 0 ? d[i - w] : 0, lf = x > 0 ? d[i - 1] : 0, dn = y < h - 1 ? d[i + w] : 0, rt = x < w - 1 ? d[i + 1] : 0;
      if ((!up && dn && dn !== KC) || (!lf && rt && rt !== KC)) ed.push(i, y < h * 0.5 ? RIM_HI : RIM_LO);
    }
    for (i = 0; i < ed.length; i += 2) d[ed[i]] = ed[i + 1];
    return this;
  };
  Buf.prototype.toCanvas = function (ax, ay) {
    var c = cv(this.w, this.h), ctx = c.getContext('2d'), img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.d); ctx.putImageData(img, 0, 0); c.ax = ax; c.ay = ay; return c;
  };
  var scratch = null;
  function fromCanvas(c) {                                       // lectura unica (al hornear) por un lienzo de trabajo marcado para lectura frecuente
    if (!scratch) { scratch = cv(48, 48); scratch.ctx = scratch.getContext('2d', { willReadFrequently: true }); }
    if (scratch.width < c.width || scratch.height < c.height) { scratch.width = Math.max(scratch.width, c.width); scratch.height = Math.max(scratch.height, c.height); scratch.ctx = scratch.getContext('2d', { willReadFrequently: true }); }
    var x = scratch.ctx; x.clearRect(0, 0, scratch.width, scratch.height); x.drawImage(c, 0, 0);
    var b = new Buf(c.width, c.height), img = x.getImageData(0, 0, c.width, c.height), src = new Uint32Array(img.data.buffer);
    b.d.set(src); return b;
  }
  function mirrorBuf(b) { var n = new Buf(b.w, b.h); for (var y = 0; y < b.h; y++) for (var x = 0; x < b.w; x++) n.d[y * b.w + (b.w - 1 - x)] = b.d[y * b.w + x]; return n; }
  function bufFrom(c, W, H, ox, oy) { var b = new Buf(W, H); b.blit(fromCanvas(c), ox, oy); return b; }
  function blitG(b, g) { for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.d[y * g.w + x]; if (c) b.set(x, y, col(c)); } }
  function stripOutline(b) { for (var i = 0; i < b.d.length; i++) { var c = b.d[i]; if (c === KC || c === RIM_HI || c === RIM_LO) b.d[i] = 0; } }
  function stripeCol(xs) { return ((xs >> 1) % 2) ? C_WHITE : C_BLUE; }
  function eraseSideArm(b, ox, u) {
    for (var y = 14 + u; y <= 18 + u; y++) for (var x = 9; x <= 12; x++) { var c = b.get(x + ox, y); if ((c === C_BLUE && x >= 10 && x <= 11 && y <= 15 + u) || (c === C_SKIN && y >= 16 + u)) b.set(x + ox, y, stripeCol(x)); }
  }
  function eraseFrontArm(b, ox, oy, u, side) {
    var x0 = side === 'L' ? 3 : 15;
    for (var y = 13 + u; y <= 19 + u; y++) for (var x = x0; x <= x0 + 1; x++) { var c = b.get(x + ox, y + oy); if (c === C_BLUE || c === C_SKIN) b.set(x + ox, y + oy, 0); }
  }
  function finish(b, ax, ay, mirror) { b.outlineRim(); if (mirror) { var m = mirrorBuf(b); return m.toCanvas(b.w - 1 - ax, ay); } return b.toCanvas(ax, ay); }
  function armG(g, sx, sy, hx, hy, sleeveX, sleeveY) { g.rect(sleeveX, sleeveY, 2, 2, CP.blue); g.line(sx, sy, hx, hy, CP.skin); g.line(sx, sy + 1, hx, hy + 1, CP.skinD); }
  var RD = ['#7a1a14', '#b82a22', '#e8382c', '#ff7a62'];
  /* guante rojo inflado: elipse mas larga en el sentido del golpe, manguito blanco con franja amarilla, pulgar y brillo. T = centro del guante, H = muñeca */
  function gloveG(g, hx, hy, tx, ty, big) {
    var dx = tx - hx, dy = ty - hy, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    var a = (big || 3.5) + 0.2, b = (big || 3.5) - 0.5, x, y, R = Math.ceil(a + b + 2);
    for (y = Math.floor(ty - R); y <= Math.ceil(ty + R); y++) for (x = Math.floor(tx - R); x <= Math.ceil(tx + R); x++) {
      var u = (x - tx) * ux + (y - ty) * uy, v = (x - tx) * nx + (y - ty) * ny, e = (u / a) * (u / a) + (v / b) * (v / b);
      if (e > 1) continue;
      var lit = -((x - tx) * 0.6 + (y - ty) * 0.85) / R;
      g.set(x, y, lit > 0.28 ? RD[3] : (lit > -0.1 ? RD[2] : (lit > -0.4 ? RD[1] : RD[0])));
    }
    var tcx = tx + nx * b * 0.75 - ux * 0.9 * (a / 3.5), tcy = ty + ny * b * 0.75 - uy * 0.9 * (a / 3.5);        // pulgar: bulto pegado al lado de arriba/lado
    if (ny > 0 || (ny === 0 && nx > 0)) { tcx = tx - nx * b * 0.75 - ux * 0.9; tcy = ty - ny * b * 0.75 - uy * 0.9; }
    for (y = Math.floor(tcy - 2); y <= Math.ceil(tcy + 2); y++) for (x = Math.floor(tcx - 2); x <= Math.ceil(tcx + 2); x++) { var q = (x - tcx) * (x - tcx) + (y - tcy) * (y - tcy); if (q <= 1.9) g.set(x, y, RD[q < 0.9 ? 2 : 1]); }
    g.set(Math.round(tx - ux * a * 0.55 - nx * b * 0.35 - 0), Math.round(ty - uy * a * 0.55 - ny * b * 0.35), '#ffffff');
    // manguito (entre la muñeca y el guante)
    var cxm = tx - ux * (a + 0.6), cym = ty - uy * (a + 0.6);
    for (var k = -2; k <= 2; k++) for (var j = 0; j <= 1; j++) g.set(Math.round(cxm + nx * k * 1.0 - ux * j), Math.round(cym + ny * k * 1.0 - uy * j), j === 0 ? '#f8f4e4' : '#c8c4b0');
    g.set(Math.round(cxm + nx * 0 - ux * 0.5), Math.round(cym - uy * 0.5), '#f2c81c');
  }
  var WALK_SIDE = { H: [14, 17], T: [18, 15.5], r: 3.1 }, WALK_FR = { H: [15.5, 17], T: [16.5, 16], r: 3.1 };
  var SW_SIDE = [{ H: [17, 15], T: [20.5, 14.5], r: 3.3 }, { H: [23, 14], T: [28, 13.5], r: 3.6 }, { H: [20, 16], T: [24, 15.5], r: 3.4 }];
  var SW_DOWN = [{ H: [24, 26], T: [25, 24], r: 3.3 }, { H: [22, 33], T: [22, 36.5], r: 4.2 }, { H: [24, 30], T: [25, 32.5], r: 3.6 }];
  var SW_UP = [{ H: [8, 26], T: [7, 24], r: 3.3 }, { H: [10, 21], T: [11, 16], r: 3.9, behind: 1 }, { H: [9, 25], T: [9, 22], r: 3.4 }];
  var BOB = [0, 1, 0, 1];
  function mirX(p, W) { return [W - 1 - p[0], p[1]]; }
  function build(which) {
    var A = S.alex; if (!A || !A[which]) throw new Error('falta ACH.sprites.alex.' + which);
    var set = A[which].g3 || A[which], W = set.walk; if (!W || !W.right || !W.right[0]) throw new Error('falta alex.' + which + '.walk');
    var walk = { right: [], left: [], down: [], up: [] }, swing = { right: [], left: [], down: [], up: [] }, i, g, b;
    for (i = 0; i < 4; i++) {
      var u = BOB[i];
      [false, true].forEach(function (mir) {
        var b2 = bufFrom(W.right[i], 20, 28, 0, 0); stripOutline(b2); eraseSideArm(b2, 0, u);
        var g2 = new G(20, 28);
        armG(g2, 11, 15 + u, WALK_SIDE.H[0] - 1, WALK_SIDE.H[1] - 1 + u, 10, 14 + u);
        gloveG(g2, WALK_SIDE.H[0], WALK_SIDE.H[1] + u, WALK_SIDE.T[0], WALK_SIDE.T[1] + u, WALK_SIDE.r);
        blitG(b2, g2); (mir ? walk.left : walk.right).push(finish(b2, 10, 26, mir));
      });
      var uf = BOB[i] + 1;
      b = bufFrom(W.down[i], 20, 28, 0, 0); g = new G(20, 28);
      gloveG(g, WALK_FR.H[0], WALK_FR.H[1] + uf, WALK_FR.T[0], WALK_FR.T[1] + uf, WALK_FR.r); blitG(b, g); b.outlineRim(); walk.down.push(b.toCanvas(10, 26));
      b = bufFrom(W.up[i], 20, 28, 0, 0); g = new G(20, 28);
      var hm = mirX(WALK_FR.H, 20), tm = mirX(WALK_FR.T, 20);
      gloveG(g, hm[0], hm[1] + uf, tm[0], tm[1] + uf, WALK_FR.r); blitG(b, g); b.outlineRim(); walk.up.push(b.toCanvas(10, 26));
    }
    var IDX = [1, 0, 3];
    for (i = 0; i < 3; i++) {
      var sd = SW_SIDE[i], ub = BOB[IDX[i]];
      [false, true].forEach(function (mir) {
        var b3 = bufFrom(W.right[IDX[i]], 32, 30, 3, 0); stripOutline(b3); eraseSideArm(b3, 3, ub);
        var g3 = new G(32, 30);
        armG(g3, 14, 15 + ub, sd.H[0] - 1, sd.H[1], 13, 14 + ub);
        gloveG(g3, sd.H[0], sd.H[1], sd.T[0], sd.T[1], sd.r); blitG(b3, g3);
        (mir ? swing.left : swing.right).push(finish(b3, 13, 26, mir));
      });
      ['down', 'up'].forEach(function (dir) {
        var s2 = (dir === 'down' ? SW_DOWN : SW_UP)[i], bb = bufFrom(W[dir][i], 32, 48, 6, 12), uu = BOB[i] + 1;
        stripOutline(bb); eraseFrontArm(bb, 6, 12, uu, 'L'); eraseFrontArm(bb, 6, 12, uu, 'R');
        var gg = new G(32, 48), upv = dir === 'up', sy = 12 + 13 + uu, shx = upv ? 10 : 22, hang = upv ? 22 : 9;
        gg.rect(hang, sy, 2, 2, CP.blue); gg.rect(hang, sy + 2, 2, 4, CP.skin); gg.rect(hang + 1, sy + 2, 1, 4, CP.skinD);
        var tmp = new G(32, 48);
        armG(tmp, shx, sy + 1, s2.H[0], s2.H[1], shx - 1, sy); gloveG(tmp, s2.H[0], s2.H[1], s2.T[0], s2.T[1], s2.r);
        if (s2.behind) { var bg = new Buf(32, 48); blitG(bg, tmp); blitG(bg, gg); bg.blit(bb, 0, 0); bb = bg; } else { blitG(bb, gg); blitG(bb, tmp); }
        bb.outlineRim(); swing[dir].push(bb.toCanvas(16, 38));
      });
    }
    return { walk: walk, swing: swing, idle: { right: walk.right[0], left: walk.left[0], down: walk.down[0], up: walk.up[0] } };
  }
  var out = V.inflables.guanteInflable = V.inflables.guanteInflable || {}, tries = {};
  ['bird', 'nobird'].forEach(function (k) {
    if (Object.getOwnPropertyDescriptor(out, k)) return;
    var def = function (v) { Object.defineProperty(out, k, { value: v, writable: true, enumerable: true, configurable: true }); return v; };
    Object.defineProperty(out, k, {
      enumerable: true, configurable: true,
      get: function () { var v = null; try { v = build(k); } catch (e) { if (window.console) console.warn('[items-v011] guante ' + k + ':', e); } if (!v && (tries[k] = (tries[k] || 0) + 1) < 3) return null; return def(v); },
      set: def
    });
  });
  V.bakeAll = function () { var t = Date.now(); out.bird; out.nobird; return Date.now() - t; };
  function link() { try { var T = S.alexInflable; if (T && !T.guanteInflable) T.guanteInflable = out; } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', link); else link();
});

var T1 = (window.performance && performance.now) ? performance.now() : Date.now();
V.arteMs = T1 - T0;
})();
