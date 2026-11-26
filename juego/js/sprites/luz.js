/* ACHORADO - js/sprites/luz.js  (v0.4, P1 luz y atmósfera)
 * Dueño: motor (luz). Todo se hornea UNA vez al cargar (ImageData y degradados aquí están permitidos: no es el bucle).
 * Registra ACH.sprites.light:
 *   poste, local, cruz, foco, brasa, alex   focos para el mapa de luz (se suman con 'lighter' sobre el ambiente).
 *                                           4 bandas duras con borde tramado 2×2; .cx/.cy = punto que va sobre la luz.
 *   glow(r, '#rrggbb')                      halo emisivo de 3 bandas (cacheado por r+color).
 *   head                                    pastilla de luminaria de sodio (3×2 px ardientes + halo).
 *   cross                                   cruz verde de botica, emisiva, 9×9 con halo.
 *   contact.{std, small, dog, bird}         sombras de contacto (elipses violeta #2a2440 a alfa 1; el motor pone la fuerza).
 *   vignette(w,h), depthFog(w,h)            máscaras de pantalla completa (alfa 0–1 en escalones tramados).
 *   fogMask(w,h,mouth)                      máscara de niebla baja para un callejón: 'S' = boca al sur, 'N' = boca al norte.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var S = ACH.sprites = ACH.sprites || {};

function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
var BAYER = [0, 2, 3, 1];                                  // 2×2 ordenado: (x&1) + 2*(y&1)
function dith(x, y) { return (BAYER[(x & 1) + 2 * (y & 1)] + 0.5) / 4 - 0.5; }   // -0,375 … +0,375

/* Foco en bandas. shape 'ell' = elipse centrada; 'fan' = abanico que nace arriba al centro y se abre hacia abajo.
   col = color que se SUMA al ambiente en la banda central. lv = intensidad de cada banda (de adentro hacia afuera). */
var TH = [0.30, 0.55, 0.78, 1.0], LV = [1, 0.7, 0.44, 0.2];
function pool(w, h, col, shape, lv, spread) {
  var c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), b = img.data, k = rgb(col);
  lv = lv || LV; spread = spread || 0.07;
  var cx = (w - 1) / 2, cy = shape === 'fan' ? 0 : (h - 1) / 2, rx = w / 2, ry = shape === 'fan' ? h : h / 2;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.sqrt(dx * dx + dy * dy);
    if (shape === 'fan') d = Math.max(d, Math.abs(dx) * 1.15 - dy * 0.25);   // el abanico se cierra contra el muro
    d += dith(x, y) * (1.4 / Math.min(rx, ry));   // v0.4 #6: el tramado ocupa solo ~1 px en el cambio de banda (antes 3-6 px)
    var band = -1;
    for (var i = 0; i < TH.length; i++) if (d < TH[i]) { band = i; break; }
    if (band < 0) continue;
    var o = (y * w + x) * 4, f = lv[band];
    b[o] = Math.round(k[0] * f); b[o + 1] = Math.round(k[1] * f); b[o + 2] = Math.round(k[2] * f); b[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  c.cx = Math.floor(w / 2); c.cy = shape === 'fan' ? 0 : Math.floor(h / 2);
  return c;
}

/* Halo emisivo: 3 bandas (núcleo, medio, borde tramado). */
var glowCache = {};
function glow(r, col) {
  var key = r + col;
  if (glowCache[key]) return glowCache[key];
  var c = pool(r * 2, r * 2, col, 'ell', [1, 0.55, 0.28, 0.1], 0.09);
  glowCache[key] = c; return c;
}

/* Pastilla de luminaria: halo + 4×2 px casi blancos. */
function head() {
  var h = glow(9, '#ffb060'), c = mk(h.width, h.height), g = c.getContext('2d');
  g.drawImage(h, 0, 0);
  g.fillStyle = '#ffe9b8'; g.fillRect(c.cx - 2, c.cy - 1, 4, 2);
  g.fillStyle = '#fff6dc'; g.fillRect(c.cx - 1, c.cy - 1, 2, 1);
  c.cx = h.cx; c.cy = h.cy; return c;
}

/* Cruz de botica: 9×9 con borde, sobre un halo verde. */
function cross() {
  var h = glow(14, '#2fd27a'), c = mk(h.width, h.height), g = c.getContext('2d'), x0 = h.cx - 4, y0 = h.cy - 4;
  g.drawImage(h, 0, 0);
  g.fillStyle = '#1f8a4c'; g.fillRect(x0 + 2, y0, 5, 9); g.fillRect(x0, y0 + 2, 9, 5);
  g.fillStyle = '#7dffb0'; g.fillRect(x0 + 3, y0 + 1, 3, 7); g.fillRect(x0 + 1, y0 + 3, 7, 3);
  g.fillStyle = '#d8ffe8'; g.fillRect(x0 + 4, y0 + 2, 1, 5); g.fillRect(x0 + 2, y0 + 4, 5, 1);
  c.cx = h.cx; c.cy = h.cy; return c;
}

/* Sombra de contacto: elipse dura de 2 tonos (borde tramado), violeta. El ancla (cx, cy) es el centro. */
function contact(w, h) {
  var c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), b = img.data, k = rgb('#2a2440');
  var cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var dx = (x - cx) / (w / 2), dy = (y - cy) / (h / 2), d = dx * dx + dy * dy + dith(x, y) * 0.25;
    if (d >= 1) continue;
    var o = (y * w + x) * 4;
    b[o] = k[0]; b[o + 1] = k[1]; b[o + 2] = k[2]; b[o + 3] = d < 0.45 ? 255 : 150;
  }
  g.putImageData(img, 0, 0);
  c.cx = Math.floor(w / 2); c.cy = Math.floor(h / 2); return c;
}

/* v0.14 (B): mancha de contacto suave para ACH.volumen: degradé radial 32×32 (negro, alfa 1 → 0). Se escala al dibujar. */
function softContact() {
  var c = mk(32, 32), g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return c;
}

/* Máscaras de pantalla completa: alfa en escalones de 1/6 con tramado 2×2 entre escalones. */
function stepped(w, h, fn, col, steps) {
  var c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), b = img.data, k = rgb(col || '#000000');
  steps = steps || 6;
  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
    var a = fn(x, y);
    if (a <= 0) continue;
    var q = Math.max(0, Math.min(steps, Math.floor(a * steps + 0.5 + dith(x, y))));
    if (!q) continue;
    var o = (y * w + x) * 4;
    b[o] = k[0]; b[o + 1] = k[1]; b[o + 2] = k[2]; b[o + 3] = Math.round(255 * q / steps);
  }
  g.putImageData(img, 0, 0);
  return c;
}
function vignette(w, h) { // 0 en el centro, 1 en las esquinas; empieza a 55 % del radio
  return stepped(w, h, function (x, y) {
    var dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.2) / Math.sqrt(2);
    return Math.max(0, (d - 0.42) / 0.58);
  }, '#1c1a26', 8);
}
function depthFog(w, h) { // 1 arriba, 0 desde el 62 % de la altura hacia abajo
  return stepped(w, h, function (x, y) { return Math.max(0, 1 - y / (h * 0.62)); }, '#b9bec0', 6);
}
function fogMask(w, h, mouth) { // 1 adentro; bordes laterales en 6 px; boca hacia la avenida en 28 px
  return stepped(w, h, function (x, y) {
    var side = Math.min(x, w - 1 - x) / 6, end = mouth === 'S' ? (h - 1 - y) / 28 : y / 28;
    var back = mouth === 'S' ? y / 6 : (h - 1 - y) / 6;
    return Math.min(1, side, end, back + 0.5);
  }, '#ffffff', 4);
}

S.light = {
  poste: pool(112, 72, '#9a6c28'),           // sodio: 110×70, cálido
  local: pool(68, 44, '#8c5e2c', 'fan'),     // abanico desde una puerta o persiana abierta
  ventana: pool(40, 28, '#7a5428'),          // halo sobre la fachada alrededor de una luz de local
  cruz: pool(56, 36, '#145f34'),             // verde de botica sobre la vereda
  foco: pool(72, 52, '#56564a'),             // reflector blanco sobre un muro (mural, almacén, escalera)
  brasa: pool(34, 22, '#a04a10'),            // anticuchos
  alex: pool(132, 84, '#2a2824', null, [1, 0.75, 0.5, 0.25]),   // halo suave para que Alexander no se pierda
  glow: glow, head: head(), cross: cross(),
  contact: { std: contact(12, 5), small: contact(10, 4), dog: contact(14, 4), bird: contact(8, 3) },
  softContact: softContact(),             // v0.14 (B): mancha de contacto suave (degradé radial, alfa 0–1; volumen.js le pone color y tamaño)
  vignette: vignette, depthFog: depthFog, fogMask: fogMask
};
})();
