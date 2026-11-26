/* ACHORADO - js/sprites/objetos.js  (v0.6, F3)
 * Dueño: sprites (objetos). Se carga despues de sprites.js, vehiculos.js y mobiliario.js.
 * Entrega (todo con ancla ax/ay):
 *   ACH.sprites.npc.gato = {sit:[2], lick:[3], walk:{left:[4],right:[4]}, run:{left:[4],right:[4]}, hide:[2]}   ~14x10, ancla (7,9) (izq: 6,9)
 *   ACH.sprites.npc.gatoVar[3]  (gris atigrado, negro, naranja), misma forma que gato
 *   ACH.sprites.items[id]  12x12 con contorno, ancla (6,11); items[id].big = 24x24 (ancla 12,23). ids: piedras resortera panChicharron anticucho
 *                           emoliente gaseosa curitas sencillo cuerdas llavesCombi estampita
 *   ACH.sprites.fx.piedra (4x4), fx.piedraSombra (6x3), fx.cantanteVentana[4] y fx.siluetaVentana[4] (18x16)
 *   ACH.sprites.zombie.musico = {timbal, conga, trompeta, bajo, cantante}  cada uno [4]; zombie.baile [4]
 *   ACH.sprites.props.tarima (jabas con foco; lamp = punto del foco)
 *   v0.9 (H5a, nivel 2): items taper agua botella trapo gasolina molotov escoba (12x12 ancla (6,11) + .big 24x24 ancla (12,22));
 *   fx.molotov[2] 14x20 @7,15 · fx.fuego = [chicas[4] 12x14, medianas[4] 20x22, grandes[4] 28x30] (tambien .s .m .l; ancla = centro de la base) ·
 *   fx.quemadura[4] 16x18 @8,16 (encima de un zombie) · fx.humo[4] (bocanadas translucidas, ancla centro; se respeta si ya existe) · fx.teleVuelo[4] 16x16 @8,8 ·
 *   fx.escobaRota 30x12 @15,10 · fx.restosTele 26x14 @13,11 · fx.rangedIcon = {resortera, molotov} 12x12 (+ .big 24x24)
 * Usa ACH.px (base.js) y ACH.px.chars (sprites.js). Script clasico, funciona desde file://.
 */
(function () {
"use strict";
var ACH = window.ACH = window.ACH || {};
var px = ACH.px, S = ACH.sprites;
if (!px || !S || !px.chars) return;
var G = px.G, RC = px.RAMPS, mix = px.mix, rng = px.rng, CH = px.chars, P = CH.P;
var K = '#1c1a22', OUT = '#16141a';
S.npc = S.npc || {};
S.fx = S.fx || {};
S.items = S.items || {};
S.zombie = S.zombie || {};
S.props = S.props || {};

/* ================================== GATOS ================================== */
/* Dibujados mirando a la derecha (izquierda = espejo). Paleta {b base, d rayas, l claro, e ojo, n nariz}. */
var COATS = [
  { b: '#8a8c92', d: '#4a4c54', l: '#c9c9c2', e: '#d8e060', n: '#d98a9e', stripes: true },     // gris atigrado
  { b: '#2b2830', d: '#37343e', l: '#4a4656', e: '#e6e060', n: '#6a4a5a', stripes: false },    // negro
  { b: '#d98a3c', d: '#a8571f', l: '#f0c890', e: '#8ab850', n: '#e0808a', stripes: true }      // naranja
];
function catSide(f, c, run) {
  var g = new G(14, 10), ph = f % 4, S_ = (x, y, col) => g.set(x, y, col), R_ = (x, y, w, h, col) => g.rect(x, y, w, h, col);
  if (!run) {
    // patas: [trasera cercana, trasera lejana, delantera cercana, delantera lejana]; en cada fase una avanza, otra va atras y una se levanta
    var off = [[1, -1, -1, 1], [0, 0, 0, 0], [-1, 1, 1, -1], [0, 0, 0, 0]][ph], lift = [[0, 0, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0]][ph];
    var legs = [[3, c.b], [5, c.d], [10, c.b], [8, c.d]];
    legs.forEach(function (lg, k) { var h = 3 - lift[k], x = lg[0] + off[k] + (lift[k] ? 1 : 0); R_(x, 6, 1, h, lg[1]); S_(x, 5 + h, c.l); });
    R_(3, 3, 8, 3, c.b); S_(3, 3, null); S_(3, 5, null); S_(10, 3, c.b);
    R_(4, 5, 6, 1, c.l);
    if (c.stripes) { [4, 6, 8].forEach(function (x) { S_(x, 3, c.d); }); S_(5, 4, c.d); S_(7, 4, c.d); S_(9, 4, c.d); }
    R_(10, 2, 4, 4, c.b); S_(10, 1, c.b); S_(13, 1, c.b); S_(11, 1, c.d); S_(13, 3, c.e); S_(13, 4, c.n); S_(12, 5, c.l); S_(10, 5, c.l); S_(13, 5, null);
    if (c.stripes) { S_(12, 2, c.d); S_(11, 3, c.d); }
    var tt = [[2, 3, 2, 1], [1, 2, 0], [1, 2, 0]][0], ty = [1, 2, 1, 0][ph];             // cola levantada en S que se mece
    S_(2, 3, c.b); S_(2, 2, c.b); S_(1, 1 + (ph % 2), c.b); S_(1 + (ph === 2 ? 1 : 0), ty, c.d); S_(2, 4, c.b);
  } else {
    var ext = ph % 2;                                                          // 0 = recogido, 1 = estirado
    if (ext) {
      R_(3, 4, 7, 3, c.b); S_(3, 4, null); S_(9, 6, null); R_(4, 6, 5, 1, c.l);
      g.line(4, 6, 1, 7, c.d); g.line(3, 6, 0, 8, c.b); S_(0, 9, c.l); S_(1, 8, c.l);                    // patas traseras estiradas atras
      g.line(9, 6, 12, 7, c.d); g.line(10, 6, 13, 8, c.b); S_(13, 9, c.l); S_(12, 8, c.l);                // delanteras adelante
      R_(10, 3, 4, 3, c.b); S_(10, 2, c.b); S_(13, 2, c.b); S_(11, 2, c.d); S_(13, 4, c.e); S_(13, 5, c.n);
      g.line(3, 4, 0, 3, c.b); S_(0, 2, c.d);
    } else {
      R_(3, 3, 7, 3, c.b); S_(3, 3, null); S_(9, 5, null); S_(5, 2, c.b); S_(6, 2, c.b); S_(7, 2, c.b); R_(4, 5, 5, 1, c.l);       // lomo arqueado
      R_(3, 6, 1, 3, c.b); S_(4, 7, c.d); S_(4, 8, c.d); R_(9, 6, 1, 3, c.b); S_(8, 7, c.d); S_(8, 8, c.d); S_(2, 9, c.l); S_(3, 9, c.l); S_(9, 9, c.l); S_(10, 9, c.l);
      R_(10, 3, 4, 3, c.b); S_(10, 2, c.b); S_(13, 2, c.b); S_(11, 2, c.d); S_(13, 4, c.e); S_(13, 5, c.n);
      g.line(3, 3, 0, 2, c.b); S_(0, 1, c.d);
    }
    if (c.stripes) { [4, 6, 8].forEach(function (x) { S_(x, ext ? 4 : 3, c.d); }); S_(10, ext ? 3 : 4, c.d); }
  }
  CH.outlineRim(g);
  return g;
}
function catFront(f, c, lick) {
  var g = new G(14, 10), S_ = (x, y, col) => g.set(x, y, col), R_ = (x, y, w, h, col) => g.rect(x, y, w, h, col);
  var blink = !lick && f === 1;
  var hy = lick ? [2, 3, 4][f % 3] : 2;
  // cuerpo sentado: ovalo con ancas
  g.ell(6.5, 7, 3.2, 2.6, c.b); R_(3, 7, 8, 3, c.b); S_(3, 9, null); S_(10, 9, null);
  R_(5, 6, 3, 3, c.l); S_(5, 6, c.b); S_(7, 6, c.b);                                  // pecho claro
  if (c.stripes) { S_(3, 7, c.d); S_(3, 8, c.d); S_(10, 7, c.d); S_(10, 8, c.d); }
  R_(4, 9, 2, 1, c.l); R_(7, 9, 2, 1, c.l);                                          // patas delanteras
  // cabeza
  R_(4, hy, 6, 4, c.b); S_(4, hy, null); S_(9, hy, null);
  S_(4, hy - 1, c.b); S_(9, hy - 1, c.b); S_(4, hy - 2 < 0 ? 0 : hy - 2, c.b); S_(9, hy - 2 < 0 ? 0 : hy - 2, c.b); S_(5, hy - 1, c.d); S_(8, hy - 1, c.d);   // orejas
  if (c.stripes) { S_(6, hy, c.d); S_(7, hy, c.d); S_(6, hy + 1, c.b); }
  if (lick) { S_(5, hy + 1, c.d); S_(8, hy + 1, c.d); S_(6, hy + 3, c.n); S_(7, hy + 3, f === 1 ? '#e0808a' : c.l); }           // ojos cerrados, lengua
  else if (blink) { S_(5, hy + 1, c.d); S_(8, hy + 1, c.d); S_(6, hy + 2, c.n); S_(7, hy + 3, c.l); }
  else { S_(5, hy + 1, c.e); S_(8, hy + 1, c.e); S_(6, hy + 2, c.l); S_(7, hy + 2, c.l); S_(6, hy + 3, c.n); }
  if (lick) { R_(3, 5 + (f === 1 ? 1 : 0), 2, 2, c.l); }                             // pata levantada hacia la cara
  var ty = (f === 1 && !lick) ? 5 : 7;                                                // cola que se enrosca a un lado
  S_(11, 9, c.b); S_(12, 9, c.b); S_(12, 8, c.b); S_(13, ty + 1, c.b); S_(13, ty, c.d); if (ty === 5) S_(12, 6, c.b);
  CH.outlineRim(g);
  return g;
}
function catHide(f, c) {                                                               // solo ojos brillantes y la punta de la cola, en lo oscuro
  var g = new G(14, 10), ex = f === 1 ? 1 : 0;
  g.set(5 + ex, 4, c.e); g.set(8 + ex, 4, c.e); g.set(5 + ex, 3, '#3a4a20'); g.set(8 + ex, 3, '#3a4a20');                // halo suave
  g.set(4 + ex, 4, '#3a4a20'); g.set(9 + ex, 4, '#3a4a20'); g.set(5 + ex, 5, '#3a4a20'); g.set(8 + ex, 5, '#3a4a20');
  if (f === 0) { g.set(5, 4, '#f4ffc0'); g.set(8, 4, '#f4ffc0'); }
  var tx = f === 1 ? 11 : 12;
  g.set(tx, 8, '#4a4656'); g.set(tx, 9, '#2b2830'); g.set(tx - 1, 9, '#3a3644'); g.set(tx + 1, 8, '#2b2830');            // punta de cola apenas insinuada
  return g;
}
function buildCat(c) {
  var A = [7, 9], AL = [6, 9];
  function mk(g, a) { return CH.mkC(g, a[0], a[1]); }
  function mkL(g, a) { return CH.flipC(g, a[0], a[1]); }
  var gs = {
    sit: [catFront(0, c), catFront(1, c)],
    lick: [0, 1, 2].map(function (f) { return catFront(f, c, true); }),
    walk: [0, 1, 2, 3].map(function (f) { return catSide(f, c, false); }),
    run: [0, 1, 2, 3].map(function (f) { return catSide(f, c, true); }),
    hide: [catHide(0, c), catHide(1, c)]
  };
  return {
    sit: gs.sit.map(function (g) { return mk(g, A); }), lick: gs.lick.map(function (g) { return mk(g, A); }),
    walk: { right: gs.walk.map(function (g) { return mk(g, A); }), left: gs.walk.map(function (g) { return mkL(g, A); }) },
    run: { right: gs.run.map(function (g) { return mk(g, A); }), left: gs.run.map(function (g) { return mkL(g, A); }) },
    hide: gs.hide.map(function (g) { return mk(g, A); })
  };
}
S.npc.gatoVar = COATS.map(buildCat);
S.npc.gato = buildCat(COATS[0]);

/* ================================== ITEMS ================================== */
/* Dibujados en una rejilla de 10x10 con un margen de 1 celda, a escala 1 (12x12) o 2 (24x24, .big). Las formas se calculan a la resolucion final,
   asi la version grande no es un agrandado de pixeles sino el mismo dibujo con mas detalle. */
function D(g, s) {
  var o = s;
  var d = {
    g: g, s: s,
    R: function (x, y, w, h, c) { g.rect(Math.round(o + x * s), Math.round(o + y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c); },
    P: function (x, y, c) { g.set(Math.round(o + x * s), Math.round(o + y * s), c); },
    px: function (x, y, c) { g.set(o + Math.round(x * s), o + Math.round(y * s), c); },
    L: function (x0, y0, x1, y1, c, t) {
      t = Math.max(1, Math.round((t || 1) * s));
      for (var k = 0; k < t; k++) g.line(o + x0 * s, o + y0 * s + k - (t >> 1), o + x1 * s, o + y1 * s + k - (t >> 1), c);
    },
    E: function (cx, cy, rx, ry, c) { g.ell(o + cx * s, o + cy * s, rx * s, ry * s, c); },
    blob: function (cx, cy, rx, ry, ramp, hard) {
      var X = o + cx * s, Y = o + cy * s, RX = rx * s, RY = ry * s, n = ramp.length - 1;
      for (var y = Math.floor(Y - RY - 1); y <= Math.ceil(Y + RY + 1); y++) for (var x = Math.floor(X - RX - 1); x <= Math.ceil(X + RX + 1); x++) {
        var dx = (x - X) / RX, dy = (y - Y) / RY;
        if (dx * dx + dy * dy > 1) continue;
        var lit = -(dx * 0.6 + dy * 0.85), i = lit > 0.62 ? n : (lit > 0.12 ? n - 1 : (lit > -0.45 ? n - 2 : (n >= 4 ? 1 : 0)));
        if (hard && lit < -0.7) i = 0;
        g.set(x, y, ramp[Math.max(0, i)]);
      }
    },
    rrect: function (cx, cy, len, wid, ang, fn) {                 // rectangulo girado; fn(u, v) devuelve color o null (u a lo largo, v a lo ancho, en celdas)
      var X = o + cx * s, Y = o + cy * s, ca = Math.cos(ang), sa = Math.sin(ang), L = len * s / 2, Wd = wid * s / 2;
      for (var y = Math.floor(Y - L - Wd - 1); y <= Math.ceil(Y + L + Wd + 1); y++) for (var x = Math.floor(X - L - Wd - 1); x <= Math.ceil(X + L + Wd + 1); x++) {
        var u = (x - X) * ca + (y - Y) * sa, v = -(x - X) * sa + (y - Y) * ca;
        if (Math.abs(u) <= L && Math.abs(v) <= Wd) { var c = fn(u / s, v / s); if (c) g.set(x, y, c); }
      }
    }
  };
  return d;
}
function mkItem(fn) {
  var cs = [1, 2].map(function (s) {
    var g = new G(12 * s, 12 * s);
    fn(D(g, s), s);
    g.outline(OUT);
    return g.toCanvas(6 * s, 11 * s);
  });
  cs[0].big = cs[1];
  return cs[0];
}
var CC = RC.concrete, WOOD = RC.wood;
function colorsOf(id) {                                                         // colores de marca si existe el catalogo (marcas.js); si no, null
  try {
    var m = px.marca && px.marca(id); if (!m) return null;
    var c = m.colores || m.colors || m.paleta; if (!c) return null;
    var vals = Array.isArray(c) ? c : Object.keys(c).map(function (k) { return c[k]; });
    vals = vals.filter(function (v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v); });
    return vals.length ? vals : null;
  } catch (e) { return null; }
}
/* ---- COMO AGREGAR UN ITEM (p. ej. los del nivel 2, «El Cerro»: escoba, pila, tuberia...) ----
   Basta una entrada nueva en ITEMS: `id: function (d, s) { ... }`. El dibujo se escribe una sola vez en una rejilla de 10x10 celdas (d.R rectangulos,
   d.L lineas, d.E elipses, d.blob esferas con luz arriba-izquierda, d.rrect rectangulos girados, d.px pixeles sueltos) y mkItem() lo hornea a 12x12 (s=1)
   y a 24x24 (s=2, .big); los detalles extra de la version grande van bajo `if (s === 2)`. Si lleva marca, pide los colores con colorsOf(id) / px.marca(id).
   Despues solo hay que dar de alta el id en inventario.js (el motor lo dibuja con S.items[id]). */
var ITEMS = {
  piedras: function (d, s) {
    d.blob(3, 3.6, 2.7, 2.2, CC); d.blob(6.9, 5.1, 2.6, 2.1, CC); d.blob(4.3, 7.4, 2.8, 1.9, CC);
    if (s === 2) { d.px(2.4, 3.2, CC[1]); d.px(2.8, 3.8, CC[1]); d.px(6.3, 5.0, CC[1]); d.px(7.8, 5.6, CC[0]); d.px(4.0, 7.2, CC[1]); d.px(5.0, 7.9, CC[0]); }
  },
  resortera: function (d, s) {
    var W1 = WOOD[2], W2 = WOOD[1], WL = WOOD[3], BAND = '#a8453a';
    d.L(5, 9.4, 5, 5.2, W1, 1.6); d.L(5.9, 9.4, 5.9, 5.2, W2, 0.8);                 // mango
    d.L(4.8, 5.4, 2.0, 0.9, W1, 1.4); d.L(5.9, 5.4, 8.1, 0.9, W2, 1.4);           // brazos de la horquilla
    d.R(4.4, 4.6, 2.4, 1.2, W1);
    d.L(2.1, 1.3, 5.1, 3.2, BAND, 0.7); d.L(8.0, 1.3, 5.6, 3.2, BAND, 0.7); d.R(4.3, 2.8, 2.2, 1.5, '#7a5a3a');
    if (s === 2) { d.px(3.6, 3.0, WL); d.px(3.8, 3.6, WL); d.px(4.4, 6.2, WL); d.px(4.4, 7.4, WL); d.px(4.4, 8.6, WL); d.px(5.0, 3.0, '#d86a52'); }
  },
  panChicharron: function (d, s) {
    var B = ['#8c5a1f', '#b9853a', '#d9a63c', '#f0c860'];
    d.blob(5, 7, 4.5, 2.0, B);                                                      // base del pan
    d.R(1.2, 5.2, 7.7, 1.8, '#4a2a1c');                                             // hueco con relleno
    d.blob(2.8, 5.8, 1.1, 0.9, ['#5a2a1c', '#8a4b38', '#b06a3e']); d.blob(5.0, 5.7, 1.2, 0.9, ['#5a2a1c', '#8a4b38', '#b06a3e']);
    d.blob(7.6, 5.5, 1.0, 1.0, ['#a8571f', '#e8742a', '#f0a050']);                  // rodaja de camote
    d.R(1.8, 5.0, 2.2, 0.6, '#c0508a'); d.R(5.5, 5.0, 2, 0.6, '#c0508a');            // salsa criolla
    d.blob(5, 3.7, 4.4, 2.6, B, true);                                              // tapa del pan
    d.R(3.5, 2.0, 1.5, 0.8, B[3]);
    if (s === 2) { for (var i = 0; i < 6; i++) d.px(2.5 + i * 1.0, 2.6 + (i % 2) * 0.8, B[1]); d.px(3.2, 2.4, '#fff0b0'); }
  },
  anticucho: function (d, s) {
    d.L(0.8, 9.2, 9.3, 0.8, '#c9b890', 0.7);
    var M = ['#3a2014', '#6b3f2a', '#8a5a3a', '#a8714c'];
    d.blob(2.6, 7.3, 1.6, 1.3, ['#a8956e', '#c9b88a', '#e0c58d', '#efe0b0']);        // papa
    d.blob(4.3, 5.8, 1.7, 1.4, M); d.blob(6.2, 3.9, 1.7, 1.4, M); d.blob(7.9, 2.3, 1.4, 1.2, M);
    d.R(8.3, 0.4, 1.4, 1.0, '#d2562a');                                              // aji en la punta
    if (s === 2) { d.L(3.4, 5.4, 5.1, 6.2, '#2a140c', 0.4); d.L(5.4, 3.5, 7.0, 4.3, '#2a140c', 0.4); d.px(4.2, 5.2, '#c9885a'); d.px(6.1, 3.3, '#c9885a'); }
  },
  emoliente: function (d, s) {
    var GL = '#cfe3e6';
    d.R(2.4, 2.6, 5.4, 6.8, '#b9853a');                                              // liquido caramelo
    d.R(2.4, 2.6, 5.4, 1.3, '#d9a63c'); d.R(2.4, 2.2, 5.4, 0.8, '#f0e8cc');           // espuma
    d.R(2.4, 6.8, 5.4, 2.6, '#8a6228');
    d.R(1.8, 2.2, 0.8, 7.2, GL); d.R(7.8, 2.2, 0.7, 7.2, '#8fb0b8');                // paredes de vidrio
    d.R(2.4, 9.4, 5.4, 0.7, '#8fb0b8');
    d.R(5.0, 0.2, 1.2, 1.2, '#d8e060'); d.R(4.4, 0.8, 1.2, 0.8, '#a8b840');           // limon en el borde
    d.R(6.5, 0.4, 0.7, 2.0, '#e8483a');                                              // cañita
    if (s === 2) { d.px(3.0, 5.0, '#e0b45a'); d.px(3.0, 6.2, '#e0b45a'); d.px(4.6, 0.6, '#ffffff'); d.px(2.2, 8.0, '#ffffff'); d.px(5.5, 8.6, '#6b4a1c'); }
  },
  gaseosa: function (d, s) {
    var m = colorsOf('gaseosa_amarilla'), lab = m ? m[0] : '#d9b82a', band = m && m[1] ? m[1] : '#c0392b', Y = ['#a88a1c', '#d4b020', '#f0d040', '#f8e880'];
    d.R(4.0, 0.2, 2.2, 1.0, '#c0392b');                                              // chapa
    d.R(4.3, 1.2, 1.6, 1.8, Y[1]);                                                   // cuello
    d.blob(5.1, 6.4, 2.9, 3.2, Y, true);                                             // cuerpo
    d.R(2.2, 4.9, 5.8, 2.9, lab); d.R(2.2, 4.9, 5.8, 0.6, mix(lab, '#ffffff', 0.4)); d.R(2.2, 7.2, 5.8, 0.6, band);
    d.R(3.0, 5.9, 4.0, 0.7, band === lab ? '#7a2a26' : mix(band, '#000000', 0.2));
    d.R(3.4, 3.0, 0.6, 1.8, Y[3]);
    if (s === 2) { d.px(3.0, 5.3, '#ffffff'); d.px(3.3, 3.6, '#ffffff'); d.px(6.2, 6.0, mix(lab, '#000000', 0.25)); d.px(4.6, 2.0, Y[3]); }
  },
  curitas: function (d, s) {
    d.rrect(5, 5, 9.8, 3.2, -0.62, function (u, v) {
      var edge = Math.abs(v) > 1.25;
      if (Math.abs(u) < 1.5) return Math.abs(v) > 1.1 ? '#c9a58a' : '#f3efe2';        // almohadilla
      return edge ? '#c9a58a' : ((Math.abs(u) + Math.abs(v)) % 1.4 < 0.35 ? '#e8c4a8' : '#e0b79a');
    });
    d.px(4.7, 4.7, '#d98a9e'); d.px(5.4, 5.4, '#d98a9e');
    if (s === 2) { d.px(3.6, 6.4, '#c9a58a'); d.px(7.0, 3.6, '#c9a58a'); d.px(6.1, 3.6, '#f7e8cf'); d.px(3.9, 6.8, '#f7e8cf'); d.px(5.0, 4.3, '#ffffff'); }
  },
  sencillo: function (d, s) {
    var Gd = RC.curbYellow;
    d.E(5, 5, 4.3, 4.3, Gd[0]); d.E(4.8, 4.8, 3.9, 3.9, Gd[2]); d.E(4.6, 4.6, 3.1, 3.1, Gd[3]);
    d.E(5.1, 5.1, 2.7, 2.7, Gd[1]); d.E(5, 5, 2.4, 2.4, Gd[2]);
    px.text(d.g, 'S', Math.round(s + 5 * s - 1.5 * s), Math.round(s + 5 * s - 2.5 * s), { font: 'a5', ink: Gd[0], scale: s });
    if (s === 2) { d.px(2.2, 3.0, '#fff6c8'); d.px(2.8, 2.4, '#fff6c8'); d.px(3.6, 2.0, '#fff6c8'); }
  },
  cuerdas: function (d, s) {
    var M = RC.metal;
    d.E(4.8, 5.4, 4.0, 3.9, M[1]); d.E(4.6, 5.0, 3.7, 3.6, M[3]); d.E(4.8, 5.4, 2.6, 2.5, '#3b4250'); d.E(4.8, 5.6, 1.6, 1.4, '#1c1a22');
    d.E(4.6, 4.8, 3.2, 3.0, M[2]); d.E(4.8, 5.2, 2.2, 2.0, '#2d3340');
    d.L(8.0, 7.6, 9.4, 9.2, M[3], 0.6); d.E(9.2, 9.0, 0.8, 0.8, '#d2b24a');
    d.L(2.2, 3.2, 3.6, 2.2, M[4], 0.5);
    if (s === 2) { d.px(3.4, 2.6, '#ffffff'); d.px(6.6, 3.2, M[4]); d.px(2.0, 5.8, M[0]); }
  },
  llavesCombi: function (d, s) {
    var M = RC.metal, Gd = RC.curbYellow;
    d.L(4.4, 3.8, 8.6, 8.6, Gd[2], 0.9); d.R(7.6, 7.4, 0.8, 1.4, Gd[2]); d.R(8.8, 8.0, 0.8, 1.0, Gd[2]);                  // llave dorada
    d.E(4.2, 3.6, 1.1, 1.1, Gd[3]);
    d.L(3.6, 4.4, 1.8, 8.8, M[3], 0.9); d.R(1.2, 7.6, 0.8, 1.0, M[3]); d.R(2.2, 8.4, 0.8, 1.0, M[3]);                    // llave plateada
    d.E(5.2, 2.6, 2.2, 2.2, M[3]); d.E(5.2, 2.6, 1.3, 1.3, '#1c1a22');                                                     // argolla
    d.R(6.6, 0.2, 2.8, 2.6, '#c0392b'); d.R(6.6, 0.2, 2.8, 0.6, '#dc6a52'); d.R(7.2, 1.2, 1.6, 0.6, '#f3efe2');              // chapita roja
    if (s === 2) { d.px(4.0, 3.2, '#fff6c8'); d.px(3.2, 5.0, M[4]); d.px(4.4, 1.6, M[4]); d.px(7.0, 1.0, '#f3efe2'); d.px(8.0, 1.0, '#f3efe2'); }
  },
  /* ---- v0.8 (G4) ---- */
  colaInglesa: function (d, s) {                                                  // refresco peruano rojo: liquido rosado rojizo en botella clara, etiqueta roja, blanca y dorada (marcas.js: cola_inglesa)
    var m = px.marca && px.marca('cola_inglesa'), C = m ? m.colors : { bg: '#c42b34', fg: '#f3efe2', accent: '#d9a441', dk: '#6b141c', lt: '#e8708a' };
    var LQ = ['#5a1224', '#8e1c3a', '#c8344f', '#ec6f86'], GLS = ['#6f8e96', '#a9c8cc', '#dcecec'], GOLD = RC.curbYellow;
    d.R(4.1, 0.1, 2.0, 1.1, GOLD[2]); d.R(4.1, 0.1, 2.0, 0.5, GOLD[3]); d.R(5.7, 0.7, 0.5, 0.5, GOLD[0]);              // chapa corona
    d.R(4.3, 1.2, 1.5, 2.6, GLS[1]); d.R(5.4, 1.2, 0.5, 2.6, GLS[0]); d.R(4.3, 2.2, 1.5, 1.6, LQ[2]); d.R(5.4, 2.2, 0.5, 1.6, LQ[1]);   // cuello: vidrio y liquido
    d.blob(5.1, 6.3, 2.7, 3.7, LQ, true);                                                                              // cuerpo
    d.R(2.5, 4.7, 5.2, 2.7, C.bg); d.R(2.5, 4.7, 5.2, 0.7, C.fg); d.R(2.5, 6.8, 5.2, 0.6, C.fg);                      // etiqueta: franja blanca arriba y abajo, centro rojo
    d.R(2.5, 5.4, 5.2, 0.5, C.accent); d.R(3.3, 5.9, 3.7, 0.8, mix(C.bg, '#000000', 0.15));                            // filete dorado y cinta oscura
    d.R(3.5, 6.0, 1.0, 0.5, C.fg); d.R(5.2, 6.0, 1.4, 0.5, C.fg);                                                      // texto en bloques
    d.R(3.2, 2.9, 0.6, 1.7, '#ffe8ee');                                                                                // brillo del hombro
    if (s === 2) { d.px(3.0, 7.9, '#ffe8ee'); d.px(3.0, 8.4, LQ[3]); d.px(6.7, 8.4, LQ[0]); d.px(5.0, 0.4, '#fff0b0'); d.px(5.0, 3.4, LQ[3]); d.px(4.6, 6.5, C.accent); d.px(6.0, 4.9, GOLD[3]); }
  },
  papaHuevo: function (d, s) {                                                   // papa amarilla sancochada con huevo duro y aji amarillo sobre un platito
    var PL = ['#7e8a92', '#b4c0c4', '#e4ece8', '#fbfaf2'], PA = ['#7a5a22', '#a8832e', '#d8b24c', '#f4d878'], EG = ['#9a9784', '#cfcdb8', '#f2f0dc', '#fffef4'], AJ = '#f0a41c', AJ2 = '#c87a10';
    d.blob(5, 7.6, 4.8, 2.2, PL, true); d.E(5, 7.5, 3.7, 1.45, '#c4cecc'); d.E(5, 7.3, 3.5, 1.2, '#dfe7e2');         // platito esmaltado de bordes claros y fondo hundido
    d.blob(3.0, 5.7, 2.5, 2.1, PA, true);                                                                             // papa amarilla
    d.R(1.5, 5.5, 3.2, 0.8, '#fde6a0'); d.R(1.9, 6.3, 2.4, 0.4, '#d8b24c');                                           // grieta: la pulpa cremosa
    d.E(7.2, 7.0, 2.6, 0.9, PL[0]);                                                                                   // QA v0.8: sombra bajo el huevo, para que no se pierda en el plato
    d.blob(7.1, 5.0, 2.3, 2.9, EG, true);                                                                             // huevo duro partido (mas grande)
    d.E(7.1, 5.6, 1.4, 1.3, '#f0b21c'); d.E(6.8, 5.3, 0.7, 0.6, '#ffe27a');                                           // yema
    d.L(1.8, 3.9, 4.4, 5.0, AJ, 1.0); d.R(4.2, 4.6, 0.9, 1.3, AJ);                                                    // aji amarillo chorreando sobre la papa
    d.E(5.2, 8.1, 2.0, 0.65, AJ); d.E(4.8, 7.9, 1.0, 0.3, '#ffd05a');                                                 // y el charquito en el plato
    if (s === 2) { d.px(2.0, 4.8, PA[3]); d.px(2.8, 3.8, PA[3]); d.px(3.4, 7.2, PA[0]); d.px(6.0, 3.4, '#ffffff'); d.px(8.3, 6.1, EG[0]); d.px(1.6, 8.1, '#ffffff'); d.px(8.6, 8.4, PL[1]); d.px(6.8, 8.1, AJ2); d.px(3.6, 4.6, AJ2); d.px(7.9, 3.9, EG[1]); }
  },
  chocloQueso: function (d, s) {                                                 // choclo (maiz de grano gigante) con una tajada de queso fresco
    var K1 = '#f2e8a8', K2 = '#e2d078', K3 = '#bca856', HK = ['#3a5a24', '#58862e', '#86b448'];
    d.rrect(4.8, 4.8, 9.2, 3.7, -0.68, function (u, v) {
      var L = 4.6, au = Math.abs(v), tip = u > L - 1.3 ? (u - (L - 1.3)) : 0;
      if (au > 1.85 - tip * tip * 1.1) return null;                                                                      // punta redondeada
      if (u < -L + 2.3) {                                                                                                // hojas verdes (tuza) en la base
        var fold = (Math.floor((v + 2) * 1.5) + (u < -L + 1.0 ? 1 : 0)) % 2;
        return v > 0.9 ? HK[0] : (fold ? HK[1] : HK[2]);
      }
      var row = Math.floor((u + L) * 1.0), col = Math.floor((v + 2) * 1.0 + (row % 2) * 0.5);
      var c = (row + col) % 2 ? K1 : K2;
      if (v > 0.95) c = (row + col) % 2 ? K2 : K3;                                                                       // lado de la sombra
      else if (v < -1.1) c = K1;
      if (((u + L) * 1.0) % 1 < 0.22) c = v > 0.5 ? K3 : K2;                                                             // surco entre filas
      return c;
    });
    d.R(0.6, 8.2, 1.3, 1.1, '#7a5a2a');                                                                              // rabito
    d.R(4.9, 6.3, 4.7, 1.3, '#fffaea'); d.R(4.9, 7.6, 4.7, 2.2, '#eee4be'); d.R(9.0, 6.9, 0.8, 2.9, '#bfb48a'); d.R(4.9, 9.6, 4.7, 0.5, '#bfb48a');   // queso: cara superior, frente y lado
    d.R(5.9, 8.3, 0.8, 0.7, '#b8ac82'); d.R(7.5, 8.8, 0.8, 0.7, '#b8ac82'); d.R(6.6, 7.7, 0.6, 0.5, '#c9bd94');          // ojitos del queso
    if (s === 2) { d.px(3.5, 3.1, '#fffbd0'); d.px(5.0, 2.0, '#fffbd0'); d.px(6.6, 1.2, '#fffbd0'); d.px(2.2, 6.6, HK[2]); d.px(1.5, 8.0, HK[0]); d.px(5.4, 6.6, '#ffffff'); d.px(8.2, 7.2, '#ffffff'); d.px(6.1, 5.5, K3); d.px(4.1, 4.9, K3); }
  },
  /* ---- v0.9 (H5a): nivel 2, El Cerro ---- */
  taper: function (d, s) {                                                        // taper de arroz con pollo recalentado, con la tapa azul abierta detras
    var CL = ['#7e8a90', '#b4c0c4', '#dfe8e8', '#f6faf8'], RICE = ['#a8a63a', '#c9c862', '#e6e49a'], CK = ['#7a3a16', '#b0602a', '#d98a46'];
    d.R(1.2, 0.5, 7.6, 2.4, '#2f5a9a'); d.R(1.2, 0.5, 7.6, 0.7, '#5b8ad0'); d.R(1.2, 2.3, 7.6, 0.6, '#1f3a6a');            // tapa levantada
    d.R(1.3, 4.6, 7.4, 4.6, CL[2]); d.R(1.3, 4.6, 0.9, 4.6, CL[3]); d.R(7.8, 4.6, 0.9, 4.6, CL[1]); d.R(1.3, 8.6, 7.4, 0.8, CL[1]);    // cuerpo de plastico claro
    d.E(5, 4.8, 4.4, 1.9, CL[3]); d.E(5, 4.9, 3.9, 1.5, RICE[1]);                                                          // borde y arroz
    d.blob(5.5, 4.2, 2.3, 1.2, RICE, true);
    d.blob(3.6, 4.0, 1.5, 1.0, CK, true); d.blob(6.4, 4.3, 1.5, 0.9, CK, true);                                           // presas de pollo
    d.px(2.4, 4.6, '#4a9a3a'); d.px(7.6, 4.0, '#4a9a3a'); d.px(5.0, 3.6, '#e8822a'); d.px(4.6, 5.2, '#4a9a3a');
    d.R(1.8, 6.2, 6.4, 0.5, CL[1]);                                                                                         // costilla del tupper
    if (s === 2) { d.px(3.2, 3.4, '#f4d8a0'); d.px(6.8, 3.7, '#f4d8a0'); d.px(5.6, 3.8, RICE[2]); d.px(8.2, 5.2, '#4a9a3a'); d.px(2.0, 7.6, '#ffffff'); d.px(2.0, 5.4, '#ffffff'); d.px(8.2, 8.2, CL[0]); d.px(3.4, 1.4, '#9ab8ec'); d.px(4.4, 1.4, '#9ab8ec'); }
  },
  agua: function (d, s) {                                                         // botella de agua de plastico, tapa celeste y etiqueta blanca con franja azul
    var W = ['#5a86a8', '#86b2cc', '#b8dcea', '#e8f6fa'];
    d.R(3.9, 0.2, 2.2, 1.1, '#2f78c8'); d.R(3.9, 0.2, 2.2, 0.4, '#68a8ec');                                               // tapa
    d.R(4.1, 1.3, 1.8, 1.5, W[2]); d.R(5.4, 1.3, 0.5, 1.5, W[1]);                                                          // cuello
    d.blob(5.0, 6.3, 2.9, 3.4, W, true);                                                                                    // cuerpo
    d.R(2.2, 5.0, 5.6, 2.4, '#eef4f4'); d.R(2.2, 5.0, 5.6, 0.5, '#ffffff'); d.R(2.2, 6.2, 5.6, 0.9, '#2f78c8'); d.R(2.2, 7.1, 5.6, 0.3, '#1f4a8a');   // etiqueta
    d.R(3.0, 5.6, 2.2, 0.4, '#8aa8c0');
    d.R(2.4, 3.4, 0.6, 1.4, W[3]); d.R(2.2, 8.4, 5.6, 0.7, W[0]);
    if (s === 2) { d.px(3.2, 2.0, W[3]); d.px(2.4, 4.0, '#ffffff'); d.px(7.0, 8.6, W[0]); d.px(4.6, 0.4, '#9ac8f4'); d.px(3.0, 7.8, W[3]); d.px(5.0, 4.2, W[1]); }
  },
  botella: function (d, s) {                                                      // botella vacia de vidrio verde (cerveza), sin tapa
    var V = ['#1b3a2a', '#2c5a3c', '#44804e', '#7cb87c'];
    d.R(3.9, 0.2, 2.2, 0.8, V[3]); d.R(4.2, 0.6, 1.6, 0.6, '#101a14');                                                       // boca abierta, adentro oscuro
    d.R(4.2, 1.0, 1.7, 3.0, V[2]); d.R(5.2, 1.0, 0.7, 3.0, V[1]); d.R(4.2, 1.0, 0.5, 3.0, V[3]);                              // cuello largo
    d.blob(5.0, 6.7, 2.7, 2.9, V, true);                                                                                    // cuerpo
    d.R(2.4, 6.0, 5.2, 2.2, '#cbbf98'); d.R(2.4, 6.0, 5.2, 0.5, '#e6dcb8'); d.R(2.4, 7.8, 5.2, 0.4, '#8f845e');                 // resto de etiqueta
    d.R(3.4, 6.7, 3.2, 0.5, '#8a3a2a');
    if (s === 2) { d.px(3.0, 4.8, V[3]); d.px(3.2, 5.2, V[3]); d.px(4.6, 2.2, '#c8ecc4'); d.px(6.8, 8.8, V[0]); d.px(4.8, 0.8, '#3a5a46'); }
  },
  trapo: function (d, s) {                                                        // trapo de tela gastada, doblado, con franjas rojas desteñidas y un pico caido
    var T = ['#7a7566', '#a29d8a', '#c9c4b0', '#e2dec9'];
    d.R(1.2, 2.6, 7.6, 5.4, T[2]); d.R(1.2, 2.6, 7.6, 0.9, T[3]); d.R(1.2, 7.1, 7.6, 0.9, T[1]); d.R(8.2, 2.6, 0.6, 5.4, T[1]);
    d.px(1.2, 2.6, null); d.px(8.6, 2.6, null);
    d.R(2.6, 2.6, 1.0, 5.4, '#a24a3c'); d.R(5.2, 2.6, 1.0, 5.4, '#a24a3c'); d.R(2.6, 2.6, 1.0, 0.9, '#c6705e'); d.R(5.2, 2.6, 1.0, 0.9, '#c6705e');       // franjas
    d.L(1.4, 6.2, 8.4, 4.6, T[0], 0.4);                                                                                       // dobles
    d.R(5.8, 7.9, 2.6, 1.0, T[1]); d.R(6.6, 8.8, 1.6, 0.8, T[0]); d.px(7.8, 9.6, T[0]);                                       // pico caido
    d.px(9.0, 3.4, T[1]); d.px(9.2, 5.0, T[0]); d.px(9.0, 6.6, T[1]); d.px(0.8, 4.6, T[1]); d.px(0.8, 6.6, T[0]);             // hilachas
    if (s === 2) { d.px(1.8, 3.0, '#ffffff'); d.px(4.2, 3.2, T[3]); d.px(7.0, 3.2, T[3]); d.px(3.2, 5.6, '#7a3028'); d.px(5.8, 6.4, '#7a3028'); d.px(3.0, 7.4, T[0]); d.px(4.4, 4.0, T[1]); }
  },
  gasolina: function (d, s) {                                                     // bidoncito de gasolina: rojo, asa arriba y pico amarillo
    var R = ['#5a1812', '#8e2a20', '#c4402e', '#e8705a'];
    d.R(1.6, 2.6, 6.8, 7.0, R[2]); d.R(1.6, 2.6, 1.0, 7.0, R[3]); d.R(7.4, 2.6, 1.0, 7.0, R[1]); d.R(1.6, 8.8, 6.8, 0.8, R[0]); d.R(1.6, 2.6, 6.8, 0.8, R[3]);
    d.R(2.6, 0.5, 3.0, 2.2, '#6a6a72'); d.R(3.4, 1.2, 1.4, 0.9, '#1c1a22'); d.R(2.6, 0.5, 3.0, 0.5, '#9a9aa4');                   // asa con hueco
    d.R(6.0, 1.0, 1.6, 1.8, '#e0b82a'); d.R(6.0, 1.0, 1.6, 0.5, '#f4de6a'); d.R(7.0, 1.0, 0.6, 1.8, '#a88414');                 // tapa-pico amarilla
    d.L(2.8, 4.0, 7.0, 8.2, R[1], 0.4); d.L(7.0, 4.0, 2.8, 8.2, R[1], 0.4);                                                  // aspa en relieve
    d.R(3.4, 5.4, 3.2, 2.2, '#efe6c8'); d.px(4.8, 6.6, '#e8481a'); d.px(5.2, 5.8, '#ffb81c');                                  // etiqueta con una llamita
    if (s === 2) { d.px(2.0, 3.2, '#ffffff'); d.px(2.0, 4.4, R[3]); d.px(5.0, 6.6, '#e8481a'); d.px(5.0, 6.0, '#ff8a1a'); d.px(3.8, 5.8, '#c8bfa0'); d.px(6.2, 7.2, '#c8bfa0'); d.px(7.0, 9.0, R[0]); d.px(6.4, 1.2, '#fff0a0'); }
  },
  molotov: function (d, s) {                                                      // botella verde con gasolina y un trapo metido en el cuello (apagado)
    var V = ['#1b3a2a', '#2c5a3c', '#44804e', '#7cb87c'];
    d.R(4.2, 1.2, 1.7, 3.0, V[2]); d.R(5.2, 1.2, 0.7, 3.0, V[1]); d.R(4.2, 1.2, 0.5, 3.0, V[3]);
    d.blob(5.0, 6.8, 2.7, 2.9, V, true);
    d.R(2.5, 5.8, 5.0, 3.2, '#d8c46a'); d.R(2.5, 5.8, 5.0, 0.6, '#f0e098'); d.R(2.5, 8.4, 5.0, 0.6, '#a8903a');                  // la gasolina se ve por el vidrio
    d.R(2.5, 5.0, 5.0, 0.7, V[2]);
    d.R(3.7, 0.6, 2.4, 0.9, '#dedad0'); d.L(4.8, 0.8, 7.4, 0.2, '#e6e2d4', 0.7); d.L(4.4, 1.0, 3.0, 2.2, '#bfbaa8', 0.6);          // trapo asomando y colgando
    d.px(7.6, 0.0, '#a8a392'); d.px(2.8, 2.4, '#a8a392');
    if (s === 2) { d.px(3.0, 4.2, V[3]); d.px(3.2, 5.8, '#fff4c0'); d.px(6.6, 7.6, '#8a7228'); d.px(5.0, 3.0, V[3]); d.px(4.0, 0.5, '#ffffff'); }
  },
  escoba: function (d, s) {                                                       // escoba de paja en diagonal: cerdas abajo a la izquierda, mango arriba a la derecha
    var WD = RC.wood;
    d.L(9.4, 0.8, 4.4, 5.8, WD[2], 0.9); d.L(9.0, 0.8, 4.0, 5.8, WD[3], 0.3);
    d.rrect(3.1, 6.9, 4.8, 3.9, 2.356, function (u, v) {
      if (Math.abs(v) > 0.9 + (u + 2.4) * 0.26) return null;
      if (u < -1.9) return (v > 0) ? '#8a6038' : '#5e3f27';                                                                  // atadura
      var k = Math.floor((v + 2.2) * 1.2) % 2;
      return v < -0.9 ? '#f0d27a' : (v > 1.0 ? '#a8832e' : (k ? '#d8b24c' : '#c29a3a'));
    });
    d.px(0.8, 9.4, '#a8832e'); d.px(1.6, 9.8, '#d8b24c'); d.px(0.4, 8.6, '#d8b24c');
    if (s === 2) { d.px(4.6, 6.2, '#fff0a8'); d.px(3.2, 7.4, '#fff0a8'); d.px(2.6, 8.6, '#7a5a22'); d.px(8.2, 1.6, WD[3]); d.px(6.6, 3.2, WD[3]); }
  },
  estampita: function (d, s) {
    d.R(2.0, 0.4, 6.2, 9.4, '#ecb1b5'); d.R(2.4, 0.8, 5.4, 8.6, '#f3efe2');         // tarjeta con borde rosado
    d.E(5.1, 2.9, 2.0, 1.7, '#e6d27a'); d.E(5.1, 3.0, 1.3, 1.1, '#f3efe2');         // aureola
    d.E(5.1, 3.1, 0.9, 0.9, '#f0d0b0');                                              // cara sin rasgos
    d.R(3.1, 4.7, 4.0, 3.2, '#9fb9d6'); d.R(3.7, 4.7, 2.8, 0.7, '#c8d6e8'); d.R(3.1, 7.2, 4.0, 0.7, '#7a92c0');   // manto pastel
    d.R(4.5, 5.6, 1.2, 1.2, '#ecb1b5');
    d.R(3.0, 8.5, 4.2, 0.5, '#ecb1b5');
    if (s === 2) { d.px(1.0, 0.0, '#e6d27a'); d.px(3.2, 1.6, '#fff6c8'); d.px(6.8, 1.9, '#fff6c8'); d.px(4.2, 4.0, '#ffffff'); d.px(6.0, 6.6, '#7a92c0'); }
  }
};
Object.keys(ITEMS).forEach(function (id) { S.items[id] = mkItem(ITEMS[id]); });

/* ================================== PIEDRA (fx) ================================== */
(function () {
  var g = new G(4, 4);
  var rows = [[null, '#c9c5b5', '#a9a79b', null], ['#a9a79b', '#8a8884', '#8a8884', '#66656b'], ['#8a8884', '#8a8884', '#66656b', '#45434f'], [null, '#66656b', '#45434f', null]];
  rows.forEach(function (r, y) { r.forEach(function (c, x) { if (c) g.set(x, y, c); }); });
  S.fx.piedra = g.toCanvas(2, 2);
  var sh = new G(6, 3);
  [[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [1, 2], [2, 2], [3, 2], [4, 2]].forEach(function (p) { sh.set(p[0], p[1], (p[1] === 1 && p[0] > 0 && p[0] < 5) ? '#2a244073' : '#2a24404d'); });
  S.fx.piedraSombra = sh.toCanvas(3, 1);
})();

/* ============================ ORQUESTA ZOMBIE Y BAILARIN ============================ */
/* Cuerpos de zombie de sprites.js (zFront) + el instrumento a escala (1,7 m = 28 px) + brazos propios. Cuatro cuadros: el pulso baja el cuerpo
   en los impares, la cabeza asiente y los pies marcan el compas (las fases de pierna de zFront). Pies en la fila 26 del cuerpo. */
var ZS = P.zs, ZSD = P.zsD, ZSL = P.zsL;
function limb(g, sx, sy, hx, hy, sleeve) {                       // brazo: manga 2x2 en el hombro, antebrazo en piel zombie, mano
  g.line(sx, sy + 1, hx, hy, ZS); g.line(sx + 1, sy + 1, hx + 1, hy, ZSD); g.rect(sx, sy, 2, 2, sleeve);
  g.rect(hx, hy, 2, 2, ZS); g.set(hx, hy, ZSL);
}
var METAL = RC.metal, GOLD = RC.curbYellow;
/* Orquesta: la luz de borde fria (cielo) se vuelve crema calido: el foco de la tarima es lo que los alumbra, y el blanco puro se quemaba. */
function warmRim(g) {
  for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.get(x, y); if (c === P.rimHi) g.set(x, y, '#e2c898'); else if (c === P.rimLo) g.set(x, y, '#b0926c'); }
  return g;
}
function drumTop(g, cx, cy, rx, ry, head, rim) { g.ell(cx, cy, rx, ry, rim); g.ell(cx, cy, rx - 1, Math.max(0.6, ry - 0.8), head); g.set(Math.round(cx - rx * 0.4), Math.round(cy - 0.5), '#ffffff'); }
function musFrame(kind, fr) {
  var OX = 6, OY = 3, W = 34, H = 36, g = new G(W, H), bob = fr % 2, y0 = 1 + bob, tilt = fr % 2;
  var OPT = {
    timbal:   { shirt: '#a8453a', pants: '#3d4149', hair: '#2c2826', shoe: '#2b2622', cap: '#b59a62' },
    conga:    { shirt: '#d9b84a', pants: '#4a4036', hair: '#3a322c', shoe: '#33291f', straps: '#8a5a3a' },
    trompeta: { shirt: '#4f8a62', pants: '#2d3340', hair: '#2a2420', shoe: '#2b2622', straps: '#2f5a42', collar: '#a8d0a8' },
    bajo:     { shirt: '#3f5f8a', pants: '#3d4149', hair: '#34261f', shoe: '#2b2622', bald: true },
    cantante: { shirt: '#8a3a7a', pants: '#2d2a33', hair: '#2a1a22', shoe: '#4a2a3a', shout: true, fringe: true }
  }[kind];
  var body = CH.zFront(Object.assign({ arms: 'none', raw: true, yoff: [0, 1, 0, 1] }, OPT), fr);
  var sx1 = OX + 3, sx2 = OX + 15, sy = OY + 13 + y0, sl = OPT.shirt, hx = OX + 5 + tilt;
  var mouthY = OY + 9 + y0;
  if (kind === 'conga') {                                         // tres congas de pie delante, la mano golpea el parche
    var drums = [{ x: 11, c: ['#4a1a22', '#8a2a2c', '#c0392b', '#dc6a52'] }, { x: 17, c: ['#4a3028', '#6b4223', '#a86e38', '#c99458'] }, { x: 23, c: ['#1d2a48', '#2f4470', '#4a6498', '#7a92c0'] }];
    g.blit(body, OX, OY);
    drums.forEach(function (d) {
      var top = OY + 20, bot = OY + 26;
      for (var y = top; y <= bot; y++) { var t = (y - top) / (bot - top), hw = 3.4 - t * 1.0; for (var x = Math.round(d.x - hw); x <= Math.round(d.x + hw); x++) { var u = (x - (d.x - hw)) / (2 * hw); g.set(x, y, u < 0.25 ? d.c[3] : (u < 0.6 ? d.c[2] : (u < 0.85 ? d.c[1] : d.c[0]))); } }
      g.rect(d.x - 3, OY + 23, 7, 1, METAL[2]); g.rect(d.x - 3, OY + 23, 7, 1, mix(METAL[2], '#000000', 0.15));        // aro metalico
      drumTop(g, d.x + 0.5, top, 3.6, 1.5, '#e8e2d2', METAL[1]);
    });
    var lh = fr % 2 === 0, rh = fr % 2 === 1;
    limb(g, sx1, sy, 10, OY + (lh ? 14 : 18) + bob, sl); limb(g, sx2, sy, 22, OY + (rh ? 14 : 18) + bob, sl);
    if (lh) { g.set(8, OY + 13, '#fff6c8'); g.set(12, OY + 12, '#fff6c8'); } else { g.set(26, OY + 13, '#fff6c8'); g.set(22, OY + 12, '#fff6c8'); }
  } else if (kind === 'timbal') {                                 // dos timbales plateados con un cencerro, baquetas alternadas
    g.blit(body, OX, OY);
    var cy = OY + 21;
    [[12], [20]].forEach(function (d, i) {
      var cx = d[0];
      g.line(cx - 1, cy + 5, cx - 4, OY + 29, METAL[1]); g.line(cx + 2, cy + 5, cx + 5, OY + 29, METAL[0]);                   // tripode
      for (var y = cy + 1; y <= cy + 5; y++) for (var x = cx - 3; x <= cx + 3; x++) g.set(x, y, x < cx - 1 ? METAL[4] : (x < cx + 1 ? METAL[3] : (x < cx + 3 ? METAL[2] : METAL[1])));
      g.rect(cx - 3, cy + 5, 7, 1, METAL[0]);
      drumTop(g, cx + 0.5, cy, 3.8, 1.6, '#efe3a8', METAL[3]);
    });
    g.line(16, cy - 3, 16, cy); g.rect(15, cy - 5, 3, 3, '#d9a63c'); g.rect(15, cy - 5, 3, 1, '#f0d060'); g.set(17, cy - 3, '#8a6a20');       // cencerro
    var up = [[1, 0], [0, 1], [1, 0], [0, 1]][fr];
    limb(g, sx1, sy, 12, cy - (up[0] ? 6 : 2), sl); limb(g, sx2, sy, 19, cy - (up[1] ? 6 : 2), sl);
    g.line(13, cy - (up[0] ? 6 : 2), 15, cy - (up[0] ? 10 : 5), '#e0c58d'); g.set(15, cy - (up[0] ? 10 : 5), '#ffffff');
    g.line(20, cy - (up[1] ? 6 : 2), 22, cy - (up[1] ? 10 : 5), '#e0c58d'); g.set(22, cy - (up[1] ? 10 : 5), '#ffffff');
  } else if (kind === 'trompeta') {                               // trompeta de 0,5 m (8 px de tubo + campana) hacia la derecha; la campana sube y baja con el pulso
    g.blit(body, OX, OY);
    var ty = mouthY + 1 - (fr === 1 || fr === 3 ? 1 : 0), tx0 = hx + 8;
    limb(g, sx1, sy, tx0 + 1, ty + 4, sl);
    g.rect(tx0, ty, 8, 1, GOLD[3]); g.rect(tx0, ty + 1, 8, 1, GOLD[1]);                                                                       // tubo
    g.rect(tx0 + 2, ty + 3, 6, 1, GOLD[2]); g.rect(tx0 + 2, ty + 4, 6, 1, GOLD[0]); g.set(tx0 + 2, ty + 2, GOLD[2]); g.set(tx0 + 7, ty + 2, GOLD[2]);   // bucle
    for (var v = 0; v < 3; v++) { var vx = tx0 + 2 + v * 2, press = (fr + v) % 3 === 0; g.set(vx, ty - 1 + (press ? 1 : 0), METAL[4]); g.set(vx, ty - 2 + (press ? 1 : 0), '#ffffff'); }   // valvulas
    for (var b = 0; b < 6; b++) {                                                                                                             // campana que se abre
      var bh = 2 + b, by0 = ty - Math.floor((bh - 2) / 2), cx_ = tx0 + 8 + b;
      g.rect(cx_, by0, 1, bh, b < 3 ? GOLD[2] : GOLD[3]); g.set(cx_, by0, GOLD[3]); g.set(cx_, by0 + bh - 1, GOLD[1]);
      if (b === 5) g.rect(cx_, by0 + 1, 1, bh - 2, '#3a2a10');
    }
    g.set(tx0 + 12, ty - 2, '#fff6c8'); g.set(tx0 + 15, ty - 1, '#f2e63c');
    limb(g, sx2, sy, tx0 + 2, ty - 1 + (fr % 2), sl);
    g.rect(tx0 - 1, ty, 1, 2, METAL[3]);                                                                                                      // boquilla
  } else if (kind === 'bajo') {                                   // bajo electrico en bandolera: cuerpo abajo, mastil hacia arriba a la derecha
    g.blit(body, OX, OY);
    var py = (fr % 2) ? 1 : 0, slide = [0, 1, 2, 1][fr];
    g.line(OX + 15, sy + 1, OX + 8, OY + 26, '#2b2622');                                                                                      // correa
    g.line(OX + 14, OY + 22, 31, OY + 11, '#3a2a1e'); g.line(OX + 14, OY + 23, 31, OY + 12, '#6b4223'); g.line(OX + 14, OY + 21, 31, OY + 10, '#a86e38');
    g.rect(31, OY + 7, 3, 4, '#2b2622'); g.set(33, OY + 8, '#c9c9be'); g.set(33, OY + 10, '#c9c9be');                                         // clavijero
    g.ell(OX + 9, OY + 23, 6.2, 4.8, '#3a1c10'); g.ell(OX + 9, OY + 23, 5.4, 4.0, '#c9601a'); g.ell(OX + 8, OY + 22, 3.2, 2.4, '#e9822f'); g.ell(OX + 10, OY + 25, 3.4, 2.2, '#a84a22');
    g.rect(OX + 10, OY + 22, 3, 3, '#1c1a22'); g.rect(OX + 6, OY + 24, 2, 1, '#c9c9be'); g.set(OX + 7, OY + 21, '#ffffff');                       // pastilla, clavijas
    limb(g, sx2, sy, 24 + slide, OY + 15 - slide + 0, sl);
    limb(g, sx1, sy, OX + 10, OY + 22 + py, sl);
  } else if (kind === 'cantante') {                               // microfono en la mano derecha, la otra brazo gesticula; vestido con lentejuelas
    g.blit(body, OX, OY);
    g.rect(hx - 1, OY + y0 + 4, 1, 9, '#2a1a22'); g.rect(hx + 8, OY + y0 + 4, 1, 9, '#2a1a22');                                                 // pelo largo a los lados
    g.rect(hx - 1, OY + y0 + 12, 1, 1, '#4a2a3a'); g.rect(hx + 8, OY + y0 + 12, 1, 1, '#4a2a3a');
    var arm2 = [[3, OY + 9], [5, OY + 17], [3, OY + 8], [6, OY + 15]][fr];
    limb(g, sx1, sy, arm2[0], arm2[1] + bob, sl);
    limb(g, sx2, sy, 23, OY + 9 + bob - (fr === 2 ? 1 : 0), sl);
    g.line(24, OY + 9 + bob, 25, OY + 6 + bob, '#2d2a33'); g.rect(24, OY + 4 + bob, 3, 3, '#8c93a0'); g.set(24, OY + 4 + bob, '#ffffff'); g.set(26, OY + 6 + bob, '#5c6570');   // microfono
    [[OX + 7, OY + 17], [OX + 11, OY + 19], [OX + 9, OY + 21], [OX + 12, OY + 16]].forEach(function (p, i) { g.set(p[0], p[1] + y0 - 1, (i + fr) % 3 === 0 ? '#ffffff' : '#e8a6d6'); });     // lentejuelas
    g.set(29, OY + 5 + (fr % 2) * -2, '#f2e63c'); g.set(30, OY + 4 + (fr % 2) * -2, '#f2e63c'); g.set(30, OY + 5 + (fr % 2) * -2, '#e8388a');     // notitas
  }
  CH.outlineRim(g); warmRim(g);
  return g;
}
S.zombie.musico = {};
['timbal', 'conga', 'trompeta', 'bajo', 'cantante'].forEach(function (k) {
  S.zombie.musico[k] = [0, 1, 2, 3].map(function (fr) { return CH.mkC(musFrame(k, fr), 6 + 10, 3 + 26); });
});
/* bailarin: camisa floreada, un brazo arriba y el otro en la cintura, cambia de brazo cada dos cuadros; la cadera y los pies marcan el paso */
function danceFrame(fr) {
  var OX = 2, g = new G(24, 32), dx = [0, 1, 0, -1][fr], bob = fr % 2, y0 = 1 + bob, up = fr < 2;
  var body = CH.zFront({ arms: 'none', raw: true, yoff: [0, 1, 0, 1], dx: dx, shirt: '#c9501a', pants: '#3a5478', hair: '#241f1c', shoe: '#5a3a22', fringe: true }, fr);
  g.blit(body, OX, 0);
  [[8, 15], [11, 16], [13, 14], [9, 18], [12, 18], [7, 17]].forEach(function (p, i) { g.set(OX + p[0] + dx, p[1] + y0, i % 2 ? '#f2e63c' : '#f3efe2'); });   // flores
  var sl = '#c9501a', sxA = OX + 3 + dx, sxB = OX + 15 + dx, sy = 13 + y0;
  var hi = up ? sxB : sxA, lo = up ? sxA : sxB;
  limb(g, hi, sy, hi + (up ? 3 : -3), 3 + y0 + (bob ? 1 : 0), sl);                                    // brazo en alto, palma abierta
  g.rect(hi + (up ? 3 : -3) - 1, 1 + y0 + (bob ? 1 : 0), 4, 2, ZS); g.set(hi + (up ? 3 : -3) - 1, 1 + y0 + (bob ? 1 : 0), ZSL);
  g.line(lo + (up ? 0 : 1), sy + 1, lo + (up ? -2 : 3), sy + 4, ZS); g.line(lo + (up ? -2 : 3), sy + 4, lo + (up ? 2 : 0), sy + 6, ZSD); g.rect(lo, sy, 2, 2, sl);   // mano en la cintura
  CH.outlineRim(g); warmRim(g);
  return g;
}
S.zombie.baile = [0, 1, 2, 3].map(function (fr) { return CH.mkC(danceFrame(fr), 2 + 10, 26); });

/* ============================ TARIMA DE JABAS ============================ */
function propTarima() {
  var W = 72, H = 42, AY = 37, g = new G(W, H), r = rng(7011), x, y, i;
  var WD = RC.wood;
  // postes traseros (los cables y la bombilla se pintan al final, sin contorno)
  [4, 66].forEach(function (px_) { for (y = 3; y <= 17; y++) { g.set(px_, y, WD[3]); g.set(px_ + 1, y, WD[1]); } g.set(px_, 2, WD[3]); g.set(px_ + 1, 2, WD[2]); });
  // superficie: tablones de madera, 14 px de fondo
  for (y = 16; y <= 29; y++) for (x = 3; x <= 68; x++) {
    var row = (y - 16), c = row === 0 ? WD[3] : (row === 13 ? WD[0] : ((row % 3 === 0) ? WD[1] : (row < 5 ? WD[3] : WD[2])));
    if (row > 0 && row < 13 && ((x + Math.floor(row / 3) * 7) % 17 === 0)) c = WD[1];                // juntas de tablon
    g.set(x, y, c);
  }
  g.rect(3, 16, 66, 1, mix(WD[3], '#ffffff', 0.25));
  for (i = 0; i < 40; i++) { x = 4 + Math.floor(r() * 64); y = 17 + Math.floor(r() * 11); g.set(x, y, r() < 0.5 ? WD[3] : WD[1]); }
  g.rect(18, 20, 2, 2, '#4a3028'); g.rect(50, 23, 3, 1, '#4a3028');                                    // manchas
  // cantos: frente de jabas apiladas
  var CR = [['#7a6430', '#b8921f', '#d9b440', '#f0d060'], ['#4a1a22', '#8a2a2c', '#b0392f', '#d86a52'], ['#1f3a36', '#2f5a52', '#3f7266', '#5a8f80']];
  for (i = 0; i < 11; i++) {
    var C = CR[(i * 2 + (i > 5 ? 1 : 0)) % 3], cx = 3 + i * 6;
    g.rect(cx, 30, 6, 8, C[1]); g.rect(cx, 30, 6, 1, C[3]); g.rect(cx, 31, 6, 1, C[2]); g.rect(cx + 5, 30, 1, 8, C[0]); g.rect(cx, 37, 6, 1, C[0]);
    g.rect(cx + 1, 33, 2, 2, '#14121a'); g.rect(cx + 3, 33, 2, 2, '#14121a'); g.rect(cx + 1, 35, 2, 1, '#201c24'); g.rect(cx + 3, 35, 2, 1, '#201c24');           // aberturas de la jaba
    if (i % 3 === 1) { g.set(cx + 2, 32, '#3f7266'); g.set(cx + 3, 32, '#5a8f80'); }                                                                            // cuello de botella
  }
  speckTar(g, r);
  g.outline(K);
  // cables con comba, foquitos de colores y la bombilla al centro: encima del contorno para que no engorden
  function cable(x0, y0, x1, y1, sag, col) { var n = 80; for (var k = 0; k <= n; k++) { var t = k / n; g.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag), col); } }
  cable(5, 2, 35, 7, 3, '#2a2730'); cable(66, 2, 37, 7, 3, '#2a2730');
  [[12, '#e8388a'], [20, '#f2e63c'], [28, '#5fe04a'], [44, '#38c8e8'], [52, '#ff8a2a'], [60, '#e8388a']].forEach(function (b) {
    var t = b[0] < 36 ? (b[0] - 5) / 30 : (66 - b[0]) / 29, by = Math.round(2 + t * 5 + Math.sin(t * Math.PI) * 3);
    g.set(b[0], by + 1, b[1]); g.set(b[0], by + 2, b[1]); g.set(b[0], by + 3, mix(b[1], '#2a2440', 0.5));
  });
  g.line(36, 7, 36, 9, '#2a2730'); g.rect(35, 9, 3, 2, '#3a3844'); g.set(35, 9, '#5c6570');
  g.rect(35, 11, 3, 3, '#fff2b0'); g.set(36, 12, '#ffffff'); g.set(35, 11, '#ffffff'); g.set(36, 14, '#e8c870'); g.set(35, 14, null); g.set(37, 14, null);
  g.set(34, 12, '#8a6a20'); g.set(38, 12, '#8a6a20'); g.set(35, 15, '#8a6a20'); g.set(36, 15, '#8a6a20'); g.set(37, 15, '#8a6a20'); g.set(34, 11, '#8a6a20'); g.set(38, 11, '#8a6a20'); g.set(34, 13, '#8a6a20'); g.set(38, 13, '#8a6a20');
  // sombra SE bajo el escenario
  for (y = 38; y <= 40; y++) for (x = 4 + (y - 38); x <= 72 - 2; x++) if (!g.get(x, y)) g.set(x, y, '#2a2440' + (y === 38 ? '66' : (y === 39 ? '44' : '28')));
  var c = g.toCanvas(36, AY, 66, 14);
  c.lamp = { x: 0, y: 12 - AY };                                                                           // el foco cuelga al centro
  c.tall = true; c.shadowIn = true;
  c.deck = { x0: -30, x1: 30, y0: -20, y1: -9, feet: -14 };                                                // plano donde se paran los musicos: pies a feet px sobre el ancla
  return c;
}
function speckTar(g, r) { for (var i = 0; i < 26; i++) { var x = 3 + Math.floor(r() * 66), y = 30 + Math.floor(r() * 8), c = g.get(x, y); if (c && c.length === 7) g.set(x, y, mix(c, '#2a2440', 0.25)); } }
S.props.tarima = propTarima();

/* ============================ VENTANAS: CANTANTE Y SILUETAS ============================ */
function winBase(g, mood) {                                      // ventana de 18x16: marco oscuro, vidrio calido, cortinas recogidas a los lados
  g.rect(0, 0, 18, 16, '#22212b');
  for (var y = 1; y <= 14; y++) for (var x = 1; x <= 16; x++) g.set(x, y, y < 5 ? '#d08c3c' : (y < 10 ? '#eeb050' : '#e0a040'));
  for (y = 1; y <= 14; y++) for (x = 1; x <= 16; x++) { var d = Math.abs(x - 8.5) / 8; if (d > 0.7 && (x + y) % 2) g.set(x, y, '#b87a34'); }
  [[1, 2], [15, 16]].forEach(function (c, k) { for (var yy = 1; yy <= 14; yy++) for (var xx = c[0]; xx <= c[1]; xx++) g.set(xx, yy, (xx + (k ? 1 : 0)) % 2 ? '#a8453a' : '#7d2f2c'); });
  g.rect(0, 15, 18, 1, '#4a4756'); g.rect(1, 15, 16, 1, '#6a6876');                      // alfeizar
}
function singerFrame(fr) {
  var g = new G(18, 16);
  winBase(g);
  var open = [1, 0, 2, 0][fr], sway = [0, 1, 0, -1][fr];
  // vestido oscuro con hombros
  for (var y = 11; y <= 14; y++) for (var x = 4 + sway; x <= 13 + sway; x++) g.set(x, y, y === 11 ? '#9a4a8a' : (x > 11 + sway ? '#4a1a42' : '#7a2f6a'));
  g.set(6 + sway, 12, '#e8a6d6'); g.set(10 + sway, 13, '#ffffff'); g.set(8 + sway, 12, '#e8a6d6');
  g.rect(8 + sway, 10, 2, 1, ZSD);                                                       // cuello
  // pelo largo y cabeza
  g.rect(5 + sway, 3, 8, 3, '#2c2326'); g.rect(5 + sway, 3, 2, 9, '#2c2326'); g.rect(12 + sway, 3, 2, 9, '#2c2326'); g.rect(6 + sway, 2, 6, 1, '#2c2326');
  g.rect(7 + sway, 5, 5, 5, ZS); g.rect(7 + sway, 5, 1, 4, ZSL); g.rect(11 + sway, 6, 1, 3, ZSD); g.rect(7 + sway, 5, 5, 1, '#2c2326');
  g.set(8 + sway, 7, '#e9ecd5'); g.set(10 + sway, 7, '#e9ecd5');                         // ojos
  if (open === 2) { g.rect(8 + sway, 8, 3, 2, '#2a1515'); g.set(9 + sway, 9, '#7a2a26'); }
  else if (open === 1) { g.rect(9 + sway, 8, 2, 2, '#2a1515'); }
  else { g.rect(9 + sway, 9, 2, 1, '#2a1515'); }
  // brazos: sube uno, el otro marca el ritmo
  if (fr === 1) { g.rect(14, 7, 1, 4, ZS); g.rect(14, 5, 2, 2, ZS); g.set(15, 4, ZSL); }
  else if (fr === 3) { g.rect(3, 7, 1, 4, ZS); g.rect(2, 5, 2, 2, ZS); g.set(2, 4, ZSL); }
  else if (fr === 2) { g.rect(3, 9, 2, 2, ZS); g.rect(13, 9, 2, 2, ZS); }
  else { g.rect(13, 11, 2, 3, ZS); }
  // notas
  if (fr === 1) { g.set(14, 2, '#f2e63c'); g.set(15, 2, '#f2e63c'); g.set(14, 3, '#f2e63c'); g.set(13, 3, '#e8388a'); }
  if (fr === 2) { g.set(3, 3, '#e8388a'); g.set(4, 3, '#e8388a'); g.set(3, 4, '#e8388a'); g.set(2, 4, '#f2e63c'); }
  if (fr === 3) { g.set(15, 4, '#f2e63c'); g.set(16, 3, '#f2e63c'); }
  return g;
}
S.fx.cantanteVentana = [0, 1, 2, 3].map(function (fr) { return singerFrame(fr).toCanvas(9, 15); });
function silFrame(fr, bg) {
  var g = new G(18, 16);
  if (bg) winBase(g);
  var DK = '#241c2c', RIM = '#4a3a4a';
  function fig(cx, base, tall, bobY) {                           // cabeza + hombros, de lado a lado
    var top = base - tall + bobY;
    g.ell(cx, top + 2, 2.1, 2.4, DK); g.rect(Math.round(cx - 2.5), top + 4, 5, tall - 4 - bobY, DK);
    g.set(Math.round(cx - 2.5), top + 4, null); g.set(Math.round(cx + 2), top + 4, null);
    g.set(Math.round(cx - 2), top, RIM); g.set(Math.round(cx - 1), top, RIM);                                              // luz de borde
  }
  fig(4 + [0, 1, 1.5, 1][fr], 14, 11, [0, 1, 0, 1][fr]);                                                               // uno camina arrastrando los pies
  fig(13.5 - [0, 1, 1.5, 1][fr], 14, 9, [1, 0, 1, 0][fr]);                                                                    // el otro se balancea
  if (bg) { g.rect(1, 1, 1, 14, '#a8453a'); g.rect(16, 1, 1, 14, '#a8453a'); }
  return g;
}
S.fx.siluetaVentana = [0, 1, 2, 3].map(function (fr) { var c = silFrame(fr, true).toCanvas(9, 15); c.sil = silFrame(fr, false).toCanvas(9, 15); return c; });


/* ============================ v0.8 (G4): GUITARRA ROTA, SKATE PARTIDO, ICONO DE GUITARRA ============================ */
var VC8 = {
  rojo:     ['#4a1210', '#862018', '#c8382e', '#ee6c58'],
  celeste:  ['#14484c', '#217a7e', '#38b0ac', '#82dcd2'],
  amarillo: ['#6a4c06', '#b88a0e', '#eec424', '#fff078']
};
var GW = { w: '#a86e38', W: '#c99458', d: '#6b4223', D: '#3f2616', h: '#3a2a1e', m: '#c9c9be', M: '#8c93a0', t: '#cbbf98', k: '#1c1a22', x: '#2c160c', c: '#ecd098', s: '#2a1a12', r: '#d8483a' };
function soft(g, cx, cy, rx, ry, col) { for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { var dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1 && !g.get(x, y)) g.set(x, y, col); } }

/* ---- fx.guitarIcon[4]: 9x9, mastil arriba a la derecha, caja abajo a la izquierda. 0 sana, 1 rajada, 2 muy rajada, 3 rota. Solo la caja lleva contorno; el mastil y el clavijero son de color oscuro. ---- */
function guitarIcon(state) {
  var g = new G(9, 9), P = GW;
  function box(g2) { g2.disc(4.6, 4.5, 1.55, P.w); g2.disc(3.0, 5.9, 2.05, P.w); }
  function neckHead(ox, oy, bend) {
    g.line(5 + ox, 3 + oy, 7 + ox, 1 + oy, P.W); g.line(5 + ox, 4 + oy, 7 + ox, 2 + oy, P.d);                          // mastil: cara clara y canto oscuro
    g.set(6 + ox, 2 + oy, P.t); g.set(7 + ox, 1 + oy, P.t);                                                              // trastes
    g.set(8 + ox, 0 + oy, P.h); g.set(7 + ox, 0 + oy, P.h); g.set(8 + ox, 1 + oy, P.h); g.set(6 + ox, 0 + oy, P.m);      // clavijero y clavija
  }
  if (state < 3) {
    box(g); g.outline(P.k);
    neckHead(0, 0);
    g.set(3, 5, P.s); g.set(2, 6, P.s); g.set(2, 5, P.D); g.set(3, 6, P.D);                                              // boca
    g.set(1, 7, P.t); g.set(2, 7, P.d);                                                                                  // puente
    g.set(2, 4, P.W); g.set(3, 3, P.W); g.set(4, 3, P.W); g.set(1, 5, P.W); g.set(5, 4, P.w);                            // luz arriba-izquierda
    g.set(5, 5, P.d); g.set(4, 7, P.d); g.set(3, 7, P.d); g.set(4, 6, P.d);                                              // sombra abajo-derecha
  }
  if (state === 1) {                                                                                                     // una raja larga con astilla clara
    g.line(2, 3, 4, 6, P.x); g.set(4, 7, P.x); g.set(3, 3, P.c); g.set(2, 6, P.c); g.set(1, 6, P.x); g.set(5, 4, P.x);
  }
  if (state === 2) {                                                                                                     // rajas en cruz, cinta, un mordisco de menos y el mastil doblado
    g.line(2, 3, 4, 7, P.x); g.line(1, 5, 5, 4, P.x); g.set(2, 4, P.c);
    g.set(5, 6, null); g.set(5, 5, P.k); g.set(4, 8, null); g.set(1, 7, null); g.set(0, 6, P.k);
    g.line(1, 6, 3, 8, P.t); g.set(2, 6, P.t); g.set(2, 8, P.c);                                                         // cinta de embalar
    g.set(6, 3, P.c); g.set(6, 2, P.x); g.set(7, 3, P.d);                                                                // mastil con una quebradura
  }
  if (state === 3) {                                                                                                     // rota: caja en dos, mastil suelto, cuerdas colgando
    var a = new G(9, 9), b = new G(9, 9);
    a.disc(4.4, 3.9, 1.5, P.w); a.set(3, 5, P.w); a.set(5, 5, P.w);
    b.disc(2.2, 7.0, 1.55, P.w); b.set(4, 7, P.w); b.set(4, 8, P.d); b.set(3, 5, P.w);
    a.outline(P.k); b.outline(P.k);
    g.blit(b, 0, 0); g.blit(a, 1, -1);
    g.set(3, 4, P.W); g.set(4, 3, P.W); g.set(1, 7, P.W); g.set(2, 6, P.W); g.set(2, 8, P.D); g.set(3, 8, P.d); g.set(4, 5, P.s);
    g.set(5, 5, P.c); g.set(3, 6, P.c); g.set(6, 7, P.c); g.set(4, 6, P.x);                                              // astillas y madera clara de la rotura
    neckHead(1, -1);
    g.set(7, 3, P.M); g.set(7, 4, P.m); g.set(6, 5, P.M); g.set(7, 6, P.m); g.set(8, 5, P.M);                            // cuerdas sueltas
  }
  return g.toCanvas(4, 8);
}
S.fx.guitarIcon = [0, 1, 2, 3].map(guitarIcon);

/* ---- fx.guitarraRota: decal en el piso, 26x12, ancla (13,10). El mastil se partio de la caja; la caja, en dos; las cuerdas, enroscadas. ---- */
(function () {
  var g = new G(26, 13), P = GW, r = rng(8801), x, y;
  // mastil con clavijero, a la izquierda, torcido hacia abajo
  g.line(4, 2, 12, 4, P.d); g.line(4, 3, 12, 5, P.w); g.line(5, 4, 12, 6, P.D);
  [6, 8, 10].forEach(function (xx) { g.set(xx, 3 + Math.floor((xx - 4) / 4), P.t); });
  g.rect(1, 0, 4, 3, P.h); g.set(1, 0, P.d); g.set(1, 1, P.m); g.set(2, 3, P.m); g.set(4, 3, P.M);                      // clavijero y clavijas
  g.set(12, 3, P.c); g.set(13, 4, P.c); g.set(12, 6, P.c); g.set(13, 6, P.d); g.set(13, 5, P.x);                          // la rotura del mastil: madera clara astillada
  // la caja, tapa de arriba: mitad A (la del cuello)
  g.disc(18, 4, 3.3, P.w); g.disc(16, 7, 2.2, P.w); g.rect(14, 5, 3, 3, P.w);
  g.disc(17, 4, 1.4, P.s); g.set(16, 3, P.D); g.set(17, 2, P.D);                                                         // media boca
  g.set(16, 2, P.W); g.set(17, 1, P.W); g.set(15, 3, P.W); g.set(18, 1, P.W);                                              // luz
  // mitad B, desplazada y girada
  g.disc(21, 9, 3.1, P.w); g.disc(24, 10, 1.8, P.w); g.disc(19, 8, 1.6, P.d);
  g.set(20, 7, P.W); g.set(21, 7, P.W); g.set(19, 9, P.W); g.set(22, 11, P.d); g.set(23, 11, P.d); g.set(24, 11, P.d);
  g.rect(20, 9, 3, 1, P.d); g.set(22, 9, P.t); g.set(23, 9, P.t);                                                         // puente despegado
  // grietas y bordes astillados
  g.line(18, 7, 21, 6, P.x); g.set(19, 6, P.c); g.set(20, 6, P.x); g.set(16, 9, P.x); g.set(17, 9, P.c);
  [[14, 8], [22, 5], [25, 8], [13, 10], [19, 12]].forEach(function (p) { g.set(p[0], p[1], P.c); g.set(p[0] + 1, p[1] - ((p[0] & 1) ? 1 : 0), P.w); });
  // cuerdas enroscadas
  g.line(13, 2, 16, 0, P.M); g.set(17, 0, P.m); g.set(15, 1, P.m); g.set(16, 1, P.M);
  g.line(14, 9, 12, 11, P.m); g.set(11, 11, P.M); g.set(12, 12, P.m); g.set(13, 12, P.M);
  var rim = [];
  for (y = 0; y < 13; y++) for (x = 0; x < 26; x++) if (g.get(x, y) === P.w && x > 13 && (!g.get(x + 1, y + 1) || !g.get(x + 1, y))) rim.push([x, y]);      // la caja: canto inferior-derecho en sombra
  rim.forEach(function (q) { g.set(q[0], q[1], P.d); });
  g.outline(P.k);
  soft(g, 13, 11, 12, 1.6, '#2a244050');
  S.fx.guitarraRota = g.toCanvas(13, 10, 24, 10);
})();

/* ---- fx.skateMitad: las dos mitades de una tabla partida, 32x15, ancla (16,12). Tres colores (.alt) como skateSuelto. Vista 3/4 desde arriba: grip negro, canto de color, ruedas crema asomando, capas de maple en la rotura. ---- */
function skateHalf(vc, jag, trk) {                              // mitad horizontal 14x10: punta levantada a la izquierda y rotura dentada a la derecha
  var g = new G(15, 10), x, y, MA = '#ecd8a4', MB = '#b89860';
  for (y = 2; y <= 6; y++) {
    var end = 13 - jag[y - 2];
    for (x = 0; x <= end; x++) {
      if ((x === 0 && (y === 2 || y === 6)) || (x === 0 && y === 3 && false)) continue;
      var c = y === 2 ? '#3c3c54' : (y === 6 ? '#1c1c26' : '#272733');
      if (y > 2 && y < 6 && (x * 5 + y * 3) % 7 === 0) c = '#3a3a50';                                        // grano del grip
      g.set(x, y, c);
    }
    g.set(end, y, MA); if (end - 1 >= 0) g.set(end - 1, y, MB);                                              // capas de maple en el canto roto
    if (jag[y - 2] > 1) g.set(end + 1, y, MA);                                                                // y una astilla al borde
  }
  for (x = 1; x <= 13 - jag[4]; x++) g.set(x, 7, x < 3 ? vc[3] : vc[2]);                                       // canto de la tabla, de color (cara cercana)
  for (x = 2; x <= 13 - jag[4] - 1; x++) g.set(x, 8, vc[0]);                                                  // y su sombra
  g.set(0, 3, vc[3]); g.set(0, 4, vc[2]); g.set(0, 5, vc[2]);                                                // la punta levantada se ve por abajo
  g.rect(trk, 0, 3, 1, '#d8d2bc'); g.rect(trk, 1, 3, 1, '#9a957f'); g.set(trk, 0, '#f2eedc');               // ruedas de atras (lejanas)
  g.rect(trk - 1, 8, 5, 1, '#6a7078'); g.rect(trk, 9, 3, 1, '#d8d2bc'); g.set(trk, 9, '#f2eedc'); g.set(trk + 2, 9, '#9a957f');   // eje y ruedas cercanas
  return g;
}
function turn(src, ang) {                                      // gira una G (vecino mas cercano) y devuelve otra, con holgura
  var n = new G(src.w + 6, src.h + 8), cx = src.w / 2, cy = src.h / 2, ca = Math.cos(-ang), sa = Math.sin(-ang);
  for (var y = 0; y < n.h; y++) for (var x = 0; x < n.w; x++) {
    var dx = x - n.w / 2, dy = y - n.h / 2, sx = Math.round(cx + dx * ca - dy * sa - 0.5), sy = Math.round(cy + dx * sa + dy * ca - 0.5);
    var c = src.get(sx, sy); if (c) n.set(x, y, c);
  }
  return n;
}
function skateMitad(color) {
  var vc = VC8[color], g = new G(34, 17), a = skateHalf(vc, [0, 2, 1, 3, 1], 2), b = skateHalf(vc, [1, 0, 3, 1, 2], 2).flip();
  g.blit(turn(a, -0.1), 0, 0);
  g.blit(turn(b, 0.42), 15, 3);
  [[14, 6, 'c'], [15, 9, 'w'], [13, 10, 'w'], [17, 4, 'c']].forEach(function (p) { g.set(p[0], p[1], p[2] === 'c' ? '#ecd8a4' : '#b89860'); });        // astillas entre las dos
  g.outline('#1c1a22');
  soft(g, 17, 14, 15, 1.7, '#2a244050');
  return g.toCanvas(17, 13, 28, 10);
}
S.fx.skateMitad = skateMitad('rojo');
S.fx.skateMitad.alt = ['rojo', 'celeste', 'amarillo'].map(skateMitad);


/* ============================ v0.9 (H5a): MOLOTOV, FUEGO, TELE VOLANDO, ICONOS ============================ */
/* Rampa del fuego: lo mas saturado de toda la pantalla. 0 borde rojo oscuro, 1 rojo-naranja, 2 naranja, 3 amarillo, 4 nucleo casi blanco. */
var FIRE = ['#a81e10', '#f2481a', '#ff9a1a', '#ffd83a', '#fff6c0'];
/* Una lengua de fuego: base en (cx, by), alto th, medio ancho tw, inclinada `lean` px en la punta, fase `ph`. `layer` 0..4 la encoge hacia el nucleo. */
function tongue(g, cx, by, th, tw, lean, ph, layer) {
  var H = th * [1, 0.92, 0.78, 0.6, 0.4][layer], ws = [1, 0.8, 0.6, 0.42, 0.24][layer];
  for (var y = 0; y <= H; y++) {
    var t = y / H, prof = t < 0.2 ? (0.6 + t * 2.0) : Math.pow(1 - (t - 0.2) / 0.8, 0.85);
    var hw = tw * ws * prof, c0 = cx + lean * Math.pow(t, 1.6) + Math.sin(t * 3.4 + ph) * 0.9 * t;
    if (hw < 0.55) { g.set(c0, by - y, FIRE[layer]); continue; }
    for (var x = Math.round(c0 - hw); x <= Math.round(c0 + hw - 0.01); x++) g.set(x, by - y, FIRE[layer]);
  }
}
/* Racimo de n lenguas de ancho total W y alto H (con chispas). Cada cuadro usa otra semilla: alturas, inclinaciones y hasta el numero de lenguas cambian. */
function flameCluster(g, cx, by, W, H, n, seed, o) {
  o = o || {};
  var r = rng(seed), tg = [], i;
  for (i = 0; i < n; i++) {
    var mid = (i - (n - 1) / 2), c = Math.abs(mid) < 0.6 ? 1 : 0;
    tg.push({ x: cx + mid * (W / (n + 0.4)) + (r() - 0.5) * 2.4, th: H * (c ? 0.82 + r() * 0.18 : 0.46 + r() * 0.34), tw: (W / (n + 0.2)) * (c ? 0.62 : 0.5) + r() * 0.6, lean: (r() - 0.5) * 5 + (o.wind || 0), ph: r() * 6.3 });
  }
  for (var layer = 0; layer < 5; layer++) tg.forEach(function (t) { tongue(g, t.x, by, t.th, t.tw, t.lean, t.ph, layer); });
  var ember = o.embers === undefined ? Math.ceil(n * 0.7) : o.embers;
  for (i = 0; i < ember; i++) g.set(cx + (r() - 0.5) * W * 0.9, by - H - 1 - Math.floor(r() * (o.rise || 3)), r() < 0.5 ? FIRE[3] : FIRE[2]);
}
/* ---- fx.molotov: botella en vuelo, 2 cuadros 14x20, ancla (7,15) = centro de la botella. Cuello arriba, la llamita arriba del trapo (se mece de un cuadro a otro). ---- */
S.fx.molotov = [0, 1].map(function (f) {
  var g = new G(14, 20), V = ['#1b3a2a', '#2c5a3c', '#44804e', '#7cb87c'];
  var b = new G(14, 20);
  b.rect(6, 6, 3, 4, V[2]); b.rect(8, 6, 1, 4, V[1]); b.rect(6, 6, 1, 4, V[3]);                                           // cuello
  b.ell(7, 13.2, 3.6, 3.6, V[2]); b.rect(10, 11, 1, 5, V[1]); b.rect(4, 11, 1, 3, V[3]); b.set(5, 10, V[3]);                // cuerpo, sombra a la derecha
  b.rect(4, 12, 6, 4, '#d8c46a'); b.rect(4, 12, 6, 1, '#f0e098'); b.rect(4, 15, 6, 1, '#a8903a');                         // gasolina
  b.rect(5, 5, 3, 1, V[3]); b.set(4, 12, V[3]);
  b.outline('#16141a');
  g.blit(b, 0, 0);
  g.rect(6, 4, 3, 2, '#dedad0'); g.set(f ? 9 : 5, 4, '#bfbaa8'); g.set(f ? 9 : 5, 5, '#a8a392');                            // trapo
  flameCluster(g, 7.5 + (f ? 0.5 : -0.5), 4, 6, 8, 2, 910 + f * 37, { wind: f ? 1.5 : -1.5, embers: 2, rise: 2 });
  return g.toCanvas(7, 15);
});
/* ---- fx.fuego: llamas del suelo. fx.fuego = [chicas[4], medianas[4], grandes[4]]; tambien .s .m .l. Ancla = centro de la base (w/2, ultima fila - 1).
   Chica 12x14 (1 lengua + 1), mediana 20x22 (3), grande 28x30 (4). Los cuatro cuadros de cada tamaño tienen alturas e inclinaciones distintas. ---- */
function fireSet(W, H, n, seed) {
  var cw = W + 2, ch = H + 6;
  return [0, 1, 2, 3].map(function (f) {
    var g = new G(cw, ch), by = ch - 2;
    for (var x = 0; x < cw; x++) { var dx = (x - cw / 2) / (cw / 2); if (Math.abs(dx) < 0.9 && ((x + f) % 3)) g.set(x, by + 1, '#7a1810'); }                       // brasas y carbon al ras
    flameCluster(g, cw / 2, by, W - 2, H, n + (f === 2 ? 1 : 0) - (f === 3 && n > 3 ? 1 : 0), seed + f * 131, { wind: [-1.2, 1.4, -0.4, 0.9][f] * (W / 12), rise: 1 + (W > 14 ? 2 : 0) });
    return g.toCanvas(cw >> 1, ch - 2);
  });
}
S.fx.fuego = [fireSet(10, 12, 2, 3301), fireSet(18, 20, 3, 4401), fireSet(26, 28, 4, 5501)];
S.fx.fuego.s = S.fx.fuego[0]; S.fx.fuego.m = S.fx.fuego[1]; S.fx.fuego.l = S.fx.fuego[2];
/* ---- fx.quemadura: llamitas para dibujar ENCIMA de un zombie (4 cuadros 16x18, ancla (8,16) = pies del zombie; las llamas cubren hombros y pecho: suben de y=16 a y=0). Mas amarillas y mas inquietas que las del suelo. ---- */
S.fx.quemadura = [0, 1, 2, 3].map(function (f) {
  var g = new G(16, 18);
  flameCluster(g, 8, 16, 14, 12, 3 + (f & 1), 7001 + f * 53, { wind: [-1.5, 1.2, -0.5, 1.6][f], embers: 3, rise: 2 });
  flameCluster(g, 4 + (f % 2) * 8, 10, 6, 7, 1, 7100 + f * 29, { wind: f % 2 ? 1 : -1, embers: 0 });                         // una llamita suelta mas arriba
  return g.toCanvas(8, 16);
});
/* ---- fx.humo: bocanadas de humo, 4 tamaños (8, 12, 18, 26 px), translucidas, ancla = centro. Si otro archivo ya la definio, se respeta. ---- */
if (!S.fx.humo) {
  S.fx.humo = [4, 6, 9, 13].map(function (r, k) {
    var sz = r * 2 + 4, g = new G(sz, sz), rr = rng(6100 + k), c = sz / 2, cols = ['#55555acc', '#6e6e72b3', '#8a8a8e99', '#a8a8aa80'];
    for (var i = 0; i < 3 + k; i++) { var a = rr() * 6.28, d = rr() * r * 0.5, rad = r * (0.45 + rr() * 0.3); g.disc(c + Math.cos(a) * d, c + Math.sin(a) * d * 0.8, rad, cols[Math.min(3, i % 4)]); }
    g.disc(c - r * 0.2, c - r * 0.25, r * 0.5, cols[3]);
    return g.toCanvas(sz >> 1, sz >> 1);
  });
}
/* ---- fx.teleVuelo: un televisor de tubo girando en el aire, 4 cuadros 16x16, ancla (8,8) = centro. De frente, de lado, de espalda, del otro lado (giros de 90 grados exactos). ---- */
function tvPix(g, x, y, back) {
  var B = '#9b9a8c', L = '#c0bfb0', D = '#6a6a60', SC = '#2c3a3c';
  if (!back) {
    g.rect(x, y, 14, 11, B); g.rect(x, y, 14, 1, L); g.rect(x, y, 1, 11, L); g.rect(x, y + 10, 14, 1, D); g.rect(x + 13, y, 1, 11, D);
    g.rect(x + 2, y + 2, 9, 7, SC); [[2, 2], [10, 2], [2, 8], [10, 8]].forEach(function (q) { g.set(x + q[0], y + q[1], B); });
    g.set(x + 3, y + 3, '#9cbcb4'); g.set(x + 4, y + 3, '#5c7a76'); g.set(x + 3, y + 4, '#5c7a76');
    g.rect(x + 11, y + 3, 2, 2, '#33333a'); g.rect(x + 11, y + 6, 2, 1, '#55554e'); g.rect(x + 11, y + 8, 2, 1, '#55554e');
  } else {
    g.rect(x, y, 14, 11, '#6e6e66'); g.rect(x, y, 14, 1, '#8a8a80'); g.rect(x, y + 10, 14, 1, '#54544e'); g.rect(x + 13, y, 1, 11, '#54544e');
    g.rect(x + 3, y + 2, 8, 7, '#54544e'); g.rect(x + 4, y + 3, 6, 5, '#5e5e58'); g.rect(x + 5, y + 4, 4, 1, '#4a4a44'); g.rect(x + 5, y + 6, 4, 1, '#4a4a44');
  }
}
function rotCW(g) { var n = new G(g.w, g.h); for (var y = 0; y < g.h; y++) for (var x = 0; x < g.w; x++) { var c = g.get(x, y); if (c) n.set(g.h - 1 - y, x, c); } return n; }
function rot180(g) { return rotCW(rotCW(g)); }
S.fx.teleVuelo = (function () {
  var f = new G(16, 16), bk = new G(16, 16);
  tvPix(f, 1, 2, false); tvPix(bk, 1, 3, true);
  var fr = [f, rotCW(f), rot180(bk), rotCW(rotCW(rotCW(bk)))];
  return fr.map(function (g, i) {
    g.outline('#16141a');
    if (i === 0) { g.set(2, 1, '#ffe36b'); g.set(14, 14, '#fff6c8'); }                                                  // chispita de tubo roto
    if (i === 2) { g.set(13, 1, '#ffe36b'); }
    return g.toCanvas(8, 8);
  });
})();
/* ---- fx.escobaRota: decal en el piso, 30x12, ancla (15,10): mango partido en dos (la punta astillada), el cabezal de cerdas suelto y pajas sueltas. ---- */
S.fx.escobaRota = (function () {
  var g = new G(30, 12), WD = RC.wood, r = rng(9231), B = { s: '#d8b24c', sL: '#f0d27a', sD: '#a8832e', sDD: '#7a5a22', tie: '#5e3f27' }, x, y;
  g.line(1, 3, 11, 1, WD[2]); g.line(1, 4, 11, 2, WD[1]); g.set(12, 1, '#e8cc98'); g.set(12, 2, '#e8cc98'); g.set(13, 1, WD[2]); g.set(11, 0, '#e8cc98');       // mango, parte larga, con punta astillada
  g.line(15, 7, 21, 6, WD[2]); g.line(15, 8, 21, 7, WD[1]); g.set(14, 7, '#e8cc98'); g.set(14, 8, '#e8cc98'); g.set(13, 8, '#e8cc98');                         // el otro pedazo
  for (x = 20; x <= 28; x++) {                                                                                                                                    // cabezal de cerdas, tirado
    var hw = 1.2 + (x - 20) * 0.28;
    for (y = Math.round(8.2 - hw); y <= Math.round(8.2 + hw); y++) g.set(x, y, (x === 20 || x === 21) ? B.tie : ((y - 8) < -hw * 0.4 ? B.sL : ((y - 8) > hw * 0.45 ? B.sDD : ((x + y) % 2 ? B.s : B.sD))));
  }
  g.set(28, 5, B.sD); g.set(29, 7, B.s); g.set(29, 9, B.sD); g.set(28, 11, B.sD);
  for (var i = 0; i < 9; i++) g.set(Math.floor(r() * 28), 4 + Math.floor(r() * 8), r() < 0.5 ? B.s : B.sD);                                                         // pajas sueltas
  g.outline('#16141a');
  for (x = 4; x < 27; x++) if (!g.get(x, 11)) g.set(x, 11, '#2a244040');
  return g.toCanvas(15, 10);
})();
/* ---- fx.restosTele: decal en el piso, 26x14, ancla (13,11): carcasa abierta, tubo roto, vidrios, placa verde con cables y marcas de quemado. ---- */
S.fx.restosTele = (function () {
  var g = new G(26, 14), r = rng(7733), x, y;
  g.rect(2, 6, 12, 6, '#6e6e66'); g.rect(2, 6, 12, 1, '#8a8a80'); g.rect(2, 11, 12, 1, '#54544e'); g.rect(4, 8, 8, 3, '#2a2a28');                          // carcasa trasera, hueca
  g.rect(14, 3, 8, 6, '#9b9a8c'); g.rect(14, 3, 8, 1, '#c0bfb0'); g.rect(14, 8, 8, 1, '#6a6a60'); g.rect(16, 4, 4, 4, '#1a1e1e');                         // el frente tirado, sin vidrio
  g.set(21, 5, '#33333a'); g.set(21, 7, '#55554e');
  g.rect(5, 1, 6, 4, '#2e8a52'); g.rect(5, 1, 6, 1, '#4cb070'); [6, 8, 10].forEach(function (xx) { g.set(xx, 3, '#c9c9be'); g.set(xx - 1, 2, '#1a3a24'); });  // placa electronica
  g.line(11, 3, 14, 1, '#c0504a'); g.line(11, 4, 13, 5, '#d8b24c');                                                                                    // cables
  [[0, 2], [1, 3], [23, 1], [24, 4], [22, 11], [17, 11], [9, 12], [1, 9]].forEach(function (p) {                                                       // vidrios rotos
    g.set(p[0], p[1], '#bfe0ee'); g.set(p[0] + 1, p[1], '#8fb8c8'); g.set(p[0], p[1] + 1, '#e8f6fa');
  });
  g.line(18, 10, 24, 9, '#8fb8c8'); g.set(19, 10, '#e8f6fa'); g.set(22, 9, '#e8f6fa');
  g.outline('#16141a');
  for (y = 0; y < 14; y++) for (x = 0; x < 26; x++) if (!g.get(x, y) && y > 10 && x > 1 && x < 24) g.set(x, y, '#1c1a2230');                           // sombra
  for (var i = 0; i < 7; i++) { x = 3 + Math.floor(r() * 18); y = 4 + Math.floor(r() * 8); if (!g.get(x, y)) g.set(x, y, '#1c1a2260'); }                // hollin
  return g.toCanvas(13, 11);
})();
/* ---- fx.rangedIcon = { resortera, molotov }: iconos de HUD 12x12 (y .big 24x24) del arma a distancia activa. Misma ancla que los items (6,11). ---- */
var RANGED = {
  resortera: function (d, s) {
    var W1 = WOOD[2], W2 = WOOD[1], WL = WOOD[3];
    d.L(5.2, 9.6, 5.2, 5.0, W1, 1.7); d.L(6.1, 9.6, 6.1, 5.0, W2, 0.8);                                                  // mango
    d.L(4.8, 5.2, 1.6, 0.8, W1, 1.5); d.L(6.2, 5.2, 9.2, 0.8, W2, 1.5); d.R(4.2, 4.4, 2.8, 1.4, W1);                      // horquilla
    d.L(1.8, 1.4, 5.0, 3.6, '#e04a3a', 0.8); d.L(9.0, 1.4, 5.8, 3.6, '#c8382e', 0.8);                                     // ligas rojas
    d.blob(5.4, 3.7, 1.5, 1.4, CC, true);                                                                                 // piedra en la bolsa
    if (s === 2) { d.px(3.4, 2.6, '#f59a80'); d.px(8.0, 2.2, '#f59a80'); d.px(4.6, 6.4, WL); d.px(4.6, 7.8, WL); d.px(5.4, 3.2, '#ffffff'); }
  },
  molotov: function (d, s) {
    var V = ['#1b3a2a', '#2c5a3c', '#44804e', '#7cb87c'];
    d.R(4.2, 3.4, 1.7, 2.6, V[2]); d.R(5.2, 3.4, 0.7, 2.6, V[1]); d.R(4.2, 3.4, 0.5, 2.6, V[3]);
    d.blob(5.0, 7.8, 2.6, 2.4, V, true);
    d.R(2.6, 7.0, 4.8, 2.4, '#d8c46a'); d.R(2.6, 7.0, 4.8, 0.5, '#f0e098');
    d.R(4.0, 2.8, 2.2, 0.8, '#dedad0');
    d.E(5.0, 2.0, 1.6, 1.5, '#e83a14'); d.R(4.4, 0.3, 1.2, 1.6, '#e83a14'); d.px(5.3, 0.0, '#ff9a1a');                       // llama en gota, lo unico saturado del icono
    d.E(5.0, 2.2, 1.0, 1.1, '#ff9a1a'); d.R(4.6, 0.9, 0.8, 1.2, '#ff9a1a');
    d.E(5.0, 2.5, 0.55, 0.7, '#fff0a0');
    if (s === 2) { d.px(3.0, 6.4, V[3]); d.px(6.6, 0.8, '#ffd83a'); d.px(3.4, 1.4, '#ff9a1a'); d.px(3.0, 9.2, V[0]); }
  }
};
S.fx.rangedIcon = { resortera: mkItem(RANGED.resortera), molotov: mkItem(RANGED.molotov) };

})();
