/* ACHORADO v0.15 — js/sprites/hd.js (Agente B): personajes en HD (K = 2) sin cambiar su huella.
 * Contrato: juego/V015-HD.md («2. Arte HD»). Notas: diseno/v015-b.md.
 *
 *   ACH.hd = { K:2, on(), setOn(b),
 *     src(img[, v]) -> {img, sx, sy, k} | null   HD perezosa en atlas (v = ranura: variante 0..VARIANTS-1 + VARIANTS×tipo; ver slot())
 *     tag(canvas, key, info)                     marca un lienzo 1× como personaje ('alex.bird.walk.down.1', 'zombie.cobrador.walk.0', …)
 *     tagTree(root, prefix, info)                marca un árbol (arrays/objetos) sin disparar las propiedades perezosas: las envuelve
 *     family(name, {match(key, info) -> bool, paint(g, src1x, info, ctxHD), face?:false})   pintor de detalle (la última registrada gana)
 *     upscale(src1x) -> canvas 2×                base genérica (EPX + contorno fino de color + sombreado), sin familia
 *     stats(), has(img, v), warm(lista, ms) -> quedan, slot(n, tipo), variantPainter(name, spec), VARIANTS, toolkit }
 *
 * Pipeline por lienzo: leer 1× -> clasificar contorno -> EPX/Scale2x sobre el relleno (la silueta HD = la 1× al doble, exacta)
 *   -> contorno de 1 px HD con el tono oscuro del relleno (la luz de borde fría arriba/izq. se conserva) -> bisel de 3 tonos (luz NO,
 *   sombra SE) + oclusión bajo cabeza/brazos -> familia (o cara automática) -> página de atlas 1024².
 * src() es O(1): lee una propiedad del lienzo (__hd); lienzos sin marca -> null inmediato.
 * Las páginas del atlas se marcan con ACH.lienzo.noSnap y se vacían en ACH.lienzo.onRebake (se rehacen al pedirlas).
 */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  if (ACH.hd && ACH.hd.__v) return;
  var K = 2, PAGE = 1024, PAD = 2;
  // v0.15 (F3/F8): variantes por instancia. «Ranura» = variante + VARIANTS × índice de tipo (KINDS). La ranura 0 es la figura base.
  // El motor pide src(img, ACH.hd.slot(n, z.type)); con un número suelto < VARIANTS sigue valiendo (id % VARIANTS).
  var VARIANTS = 6, KINDS = ['', 'cobrador', 'ciego', 'escolar'], NSLOT = VARIANTS * KINDS.length;
  function slot(n, type) { var v = ((n | 0) % VARIANTS + VARIANTS) % VARIANTS, k = type ? KINDS.indexOf(type) : 0; return v + VARIANTS * (k > 0 ? k : 0); }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* ---------------- encendido ---------------- */
  var ON = true;
  (function () {
    try { if (/[?&]hd=0\b/.test(location.search || '')) { ON = false; return; } } catch (e) { /* nada */ }
    try { if (/[?&]hd=1\b/.test(location.search || '')) { ON = true; return; } } catch (e) { /* nada */ }
    try { var v = window.localStorage && localStorage.getItem('ach.hd'); if (v === '0') ON = false; else if (v === '1') ON = true; } catch (e) { /* sin storage */ }
  })();

  /* ---------------- color (uint32 ABGR little-endian, como Uint32Array sobre ImageData) ---------------- */
  var CC = {};
  function col(h) {
    var v = CC[h]; if (v !== undefined) return v;
    var r, g, b;
    if (h.length === 4) { r = parseInt(h[1] + h[1], 16); g = parseInt(h[2] + h[2], 16); b = parseInt(h[3] + h[3], 16); }
    else { r = parseInt(h.substr(1, 2), 16); g = parseInt(h.substr(3, 2), 16); b = parseInt(h.substr(5, 2), 16); }
    return (CC[h] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0);
  }
  function R(c) { return c & 255; } function Gc(c) { return (c >>> 8) & 255; } function B(c) { return (c >>> 16) & 255; } function A(c) { return c >>> 24; }
  function pack(r, g, b, a) {
    r = r < 0 ? 0 : r > 255 ? 255 : r | 0; g = g < 0 ? 0 : g > 255 ? 255 : g | 0; b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    return (((a === undefined ? 255 : a) << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }
  function hex(c) { return '#' + [R(c), Gc(c), B(c)].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function shade(c, f) { return pack(R(c) * f, Gc(c) * f, B(c) * f, A(c)); }
  function lighten(c, t) { return pack(R(c) + (255 - R(c)) * t, Gc(c) + (255 - Gc(c)) * t, B(c) + (255 - B(c)) * t, A(c)); }
  function mixc(a, b, t) { return pack(R(a) + (R(b) - R(a)) * t, Gc(a) + (Gc(b) - Gc(a)) * t, B(a) + (B(b) - B(a)) * t, A(a)); }
  function lum(c) { return (R(c) * 299 + Gc(c) * 587 + B(c) * 114) / 1000; }
  function dist(a, b) { var dr = R(a) - R(b), dg = Gc(a) - Gc(b), db = B(a) - B(b); return dr * dr + dg * dg + db * db; }
  // sombra «de garúa»: oscurece y empuja un poco al violeta frío (no negro)
  function deep(c) { return pack(R(c) * 0.5 + 10, Gc(c) * 0.46 + 8, B(c) * 0.52 + 16); }
  function shadowOf(c, f) { f = f || 0.8; return pack(R(c) * f, Gc(c) * f, B(c) * (f + 0.06) + 4); }
  function lightOf(c, t) { t = t || 0.14; return pack(R(c) + (255 - R(c)) * t + 2, Gc(c) + (255 - Gc(c)) * t + 2, B(c) + (255 - B(c)) * t * 0.8); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hash3(x, y, s) { var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  var INK = col('#141216'), INKS = [col('#141216'), col('#1c1a22'), col('#2a2228')];
  var RIMS = [col('#d5dbe0'), col('#9fb0c4'), col('#e2c898'), col('#b0926c')];
  function isInk(c) { if (!c || A(c) < 128) return false; for (var i = 0; i < INKS.length; i++) if (c === INKS[i]) return true; return lum(c) < 24; }
  function isRim(c) { for (var i = 0; i < RIMS.length; i++) if (c === RIMS[i]) return true; return false; }

  /* ---------------- lectura 1× ---------------- */
  var scratch = null, sctx = null;
  function read(c) {
    var w = c.width, h = c.height, g = null;
    try { g = c.getContext('2d'); } catch (e) { g = null; }
    if (!g) {                                         // lienzo sin 2d (raro): se copia a uno de trabajo
      if (!scratch) { scratch = document.createElement('canvas'); sctx = scratch.getContext('2d', { willReadFrequently: true }); }
      if (scratch.width < w) scratch.width = w; if (scratch.height < h) scratch.height = h;
      sctx.clearRect(0, 0, w, h); sctx.drawImage(c, 0, 0); g = sctx;
    }
    var id = g.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }

  /* ---------------- toolkit: análisis 1× + búfer HD ---------------- */
  function Tk(src1, w, h) {
    var n = w * h, i, x, y;
    this.w = w; this.h = h; this.W = w * K; this.H = h * K; this.K = K;
    this.s = src1;                                          // colores 1× originales
    var m = this.m = new Uint8Array(n);                     // 1 = opaco
    for (i = 0; i < n; i++) m[i] = A(src1[i]) >= 128 ? 1 : 0;
    // contorno: tinta o luz de borde tocando el vacío
    var o = this.o = new Uint8Array(n);                     // 1 contorno tinta, 2 contorno luz de borde
    var self = this;
    function empty(xx, yy) { return xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx]; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!m[i]) continue;
      var c = src1[i];
      if (!(isInk(c) || isRim(c))) continue;
      if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) o[i] = isRim(c) ? 2 : 1;
    }
    // relleno: el contorno toma el color del vecino interior
    var f = this.f = new Uint32Array(src1);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!o[i]) continue;
      var best = 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (var k = 0; k < 8 && !best; k++) {
        var xx = x + nb[k][0], yy = y + nb[k][1];
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var j = yy * w + xx; if (m[j] && !o[j] && !isInk(src1[j])) best = src1[j];
      }
      if (best) f[i] = best;
      else o[i] = o[i] === 2 ? 2 : 3;                       // 3 = línea fina de tinta sin interior (cuerdas, ligas): se conserva
    }
    this.d = new Uint32Array(this.W * this.H);
    this.fam = null; this.eyes = null; this.seed = 1;
    void self;
  }
  Tk.prototype = {
    at: function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.s[y * this.w + x]; },
    op: function (x, y) { return !(x < 0 || y < 0 || x >= this.w || y >= this.h) && this.m[y * this.w + x] === 1; },
    fillAt: function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h || !this.m[y * this.w + x]) ? 0 : this.f[y * this.w + x]; },
    edge: function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.o[y * this.w + x]; },
    in: function (X, Y) { return X >= 0 && Y >= 0 && X < this.W && Y < this.H && this.m[(Y >> 1) * this.w + (X >> 1)] === 1; },
    get: function (X, Y) { return (X < 0 || Y < 0 || X >= this.W || Y >= this.H) ? 0 : this.d[Y * this.W + X]; },
    // solo pinta DENTRO de la silueta: la huella nunca cambia
    set: function (X, Y, c) { X |= 0; Y |= 0; if (this.in(X, Y) && c) this.d[Y * this.W + X] = c; },
    blk: function (x, y, c) { this.set(2 * x, 2 * y, c); this.set(2 * x + 1, 2 * y, c); this.set(2 * x, 2 * y + 1, c); this.set(2 * x + 1, 2 * y + 1, c); },
    line: function (x0, y0, x1, y1, c, test) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      var dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
      for (var n = 0; n < 600; n++) {
        if (!test || test(x0, y0)) this.set(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
      }
    },
    // ¿el píxel HD viene de un píxel 1× de estos colores?
    from: function (X, Y, set) { var c = this.at(X >> 1, Y >> 1); return !!(c && set[c]); },
    find: function (set) { var out = []; for (var i = 0; i < this.s.length; i++) if (this.m[i] && set[this.s[i]]) out.push([i % this.w, (i / this.w) | 0]); return out; },
    bbox: function () {
      var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (var i = 0; i < this.m.length; i++) if (this.m[i]) { var x = i % this.w, y = (i / this.w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { x0: x0, y0: y0, x1: x1, y1: y1 };
    },
    rnd: function (salt) { return rng((this.seed ^ Math.imul(salt | 0, 2654435761)) | 0); },
    h3: function (x, y, salt) { return hash3(x, y, this.seed + (salt | 0)); },
    // contorno HD de un píxel HD interior (para que un pintor redibuje tinta fina)
    isOutline: function (X, Y) { return this.edge(X >> 1, Y >> 1) && (!this.in(X - 1, Y) || !this.in(X + 1, Y) || !this.in(X, Y - 1) || !this.in(X, Y + 1)); }
  };
  var TK = { col: col, hex: hex, shade: shade, lighten: lighten, mix: mixc, lum: lum, dist: dist, deep: deep, shadowOf: shadowOf, lightOf: lightOf, rng: rng, hash: hashStr, hash3: hash3, pack: pack, R: R, G: Gc, B: B, A: A, isInk: isInk, isRim: isRim };
  function set(list) { var o = {}; for (var i = 0; i < list.length; i++) o[typeof list[i] === 'string' ? col(list[i]) : list[i]] = 1; return o; }
  TK.set = set;

  /* ---------------- base genérica ---------------- */
  // piel (humana o de zombi) por color, para la oclusión bajo la cabeza/brazos
  function skinish(c) {
    if (!c) return false;
    var r = R(c), g = Gc(c), b = B(c), L = lum(c);
    if (L < 60 || L > 235) return false;
    if (r > g && g > b && r - b > 30 && r - b < 140) return true;                // humana
    if (g >= r && g > b && g - b > 8 && r - b > -4 && L > 80) return true;        // verdosa de zombi
    return false;
  }
  TK.skinish = skinish;

  function base(tk) {
    var w = tk.w, h = tk.h, W = tk.W, f = tk.f, m = tk.m, o = tk.o, s = tk.s, d = tk.d, x, y, i;
    function F(xx, yy) { return (xx < 0 || yy < 0 || xx >= w || yy >= h || !m[yy * w + xx]) ? 0 : f[yy * w + xx]; }
    // 1) EPX / Scale2x sobre el relleno; la silueta HD es la 1× al doble (exacta)
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!m[i]) continue;
      var P = f[i], a = F(x, y - 1), b = F(x + 1, y), c = F(x - 1, y), dd = F(x, y + 1);
      var e0 = (c === a && c !== dd && a !== b && a) ? a : P;
      var e1 = (a === b && a !== c && b !== dd && b) ? b : P;
      var e2 = (dd === c && dd !== b && c !== a && c) ? c : P;
      var e3 = (b === dd && b !== a && dd !== c && dd) ? dd : P;
      var X = 2 * x, Y = 2 * y;
      d[Y * W + X] = e0; d[Y * W + X + 1] = e1; d[(Y + 1) * W + X] = e2; d[(Y + 1) * W + X + 1] = e3;
    }
    // 1b) tinta interior (líneas de #141216 entre dos piezas) a 1 px HD: la mitad que da a una pieza toma su color
    function solid(xx, yy) { var c = F(xx, yy); return c && c !== INK && !(xx >= 0 && yy >= 0 && xx < w && yy < h && o[yy * w + xx]) ? c : 0; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!m[i] || o[i] || s[i] !== INK) continue;
      var lw = solid(x - 1, y), le = solid(x + 1, y), ln = solid(x, y - 1), ls = solid(x, y + 1), X1 = 2 * x, Y1 = 2 * y;
      if (lw && !le) { d[Y1 * W + X1] = lw; d[(Y1 + 1) * W + X1] = lw; }
      else if (le && !lw) { d[Y1 * W + X1 + 1] = le; d[(Y1 + 1) * W + X1 + 1] = le; }
      else if (lw && le) { d[Y1 * W + X1] = lw; d[(Y1 + 1) * W + X1] = lw; }
      if (ln && !ls) { d[Y1 * W + X1] = ln; d[Y1 * W + X1 + 1] = ln; }
      else if (ls && !ln) { d[(Y1 + 1) * W + X1] = ls; d[(Y1 + 1) * W + X1 + 1] = ls; }
    }
    // 2) bisel de 3 tonos por parche de color (luz NO, sombra SE) + oclusión
    var dk = tk.dk = new Uint32Array(W * tk.H);   // copia del relleno antes del bisel (los pintores la consultan)
    dk.set(d);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!m[i] || o[i]) continue;
      var C = f[i]; if (A(C) < 128) continue;
      var L = lum(C); if (L < 58) continue;
      var n = F(x, y - 1), so = F(x, y + 1), we = F(x - 1, y), ea = F(x + 1, y);
      var X2 = 2 * x, Y2 = 2 * y, sh = shadowOf(C, 0.84), li = lightOf(C, 0.12);
      // sombra: lado SE del parche, si el parche sigue hacia NO (no en píxeles sueltos: ojos, botones)
      if (so !== C && n === C) { d[(Y2 + 1) * W + X2] = sh; d[(Y2 + 1) * W + X2 + 1] = sh; }
      if (ea !== C && we === C) { d[Y2 * W + X2 + 1] = d[Y2 * W + X2 + 1] === C ? sh : d[Y2 * W + X2 + 1]; d[(Y2 + 1) * W + X2 + 1] = shadowOf(C, 0.8); }
      // luz: lado NO contra el vacío / contorno
      var nE = !n || (y > 0 && o[i - w]), wE = !we || (x > 0 && o[i - 1]);
      if (nE && so === C) { d[Y2 * W + X2] = li; d[Y2 * W + X2 + 1] = li; }
      if (wE && ea === C) { d[Y2 * W + X2] = li; d[(Y2 + 1) * W + X2] = lightOf(C, 0.07); }
      // oclusión: bajo la cabeza (piel/pelo arriba, ropa abajo) y junto a los brazos
      if (n && n !== C && !skinish(C) && (skinish(n) || lum(n) < 60) && L > 40 && y > h * 0.25) {
        d[Y2 * W + X2] = shadowOf(d[Y2 * W + X2], 0.78); d[Y2 * W + X2 + 1] = shadowOf(d[Y2 * W + X2 + 1], 0.78);
      }
      if (!skinish(C) && ((we && skinish(we) && x > 0 && !o[i - 1]) )) d[Y2 * W + X2] = shadowOf(d[Y2 * W + X2], 0.82), d[(Y2 + 1) * W + X2] = shadowOf(d[(Y2 + 1) * W + X2], 0.82);
      if (!skinish(C) && ((ea && skinish(ea) && x < w - 1 && !o[i + 1]))) d[Y2 * W + X2 + 1] = shadowOf(d[Y2 * W + X2 + 1], 0.82), d[(Y2 + 1) * W + X2 + 1] = shadowOf(d[(Y2 + 1) * W + X2 + 1], 0.82);
    }
    // 3) contorno de 1 px HD: tono oscuro del relleno (o la luz de borde fría donde estaba)
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!o[i]) continue;
      var ox = 2 * x, oy = 2 * y;
      for (var q = 0; q < 4; q++) {
        var XX = ox + (q & 1), YY = oy + (q >> 1);
        var out = !tk.in(XX - 1, YY) || !tk.in(XX + 1, YY) || !tk.in(XX, YY - 1) || !tk.in(XX, YY + 1);
        if (o[i] === 3) { d[YY * W + XX] = s[i]; continue; }
        if (!out) continue;
        if (o[i] === 2) d[YY * W + XX] = s[i];
        else d[YY * W + XX] = deep(f[i]);
      }
    }
  }

  /* ---------------- cara automática (personajes sin familia) ---------------- */
  // ojos: píxel muy oscuro o muy claro y aislado, rodeado de piel, en la mitad superior; boca: oscuro rojizo debajo
  function autoFace(tk, opt) {
    opt = opt || {};
    var bb = tk.bbox(), top = bb.y0, mid = bb.y0 + Math.max(4, Math.round((bb.y1 - bb.y0) * (opt.frac || 0.5))), found = [];
    for (var y = top; y <= mid; y++) for (var x = bb.x0; x <= bb.x1; x++) {
      if (!tk.op(x, y) || tk.edge(x, y)) continue;
      var c = tk.at(x, y), L = lum(c), sk = 0, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var k = 0; k < 4; k++) { var cc = tk.at(x + nb[k][0], y + nb[k][1]); if (skinish(cc)) sk++; }
      if (sk < 2) continue;
      if (L < 40 && !skinish(c)) found.push({ x: x, y: y, dark: true });
      else if (L > 190 && !skinish(c) && tk.at(x + 1, y) !== c && tk.at(x - 1, y) !== c) found.push({ x: x, y: y, dark: false });
    }
    if (!found.length || found.length > 4) return 0;
    var cx = (bb.x0 + bb.x1 + 1) / 2;
    found.forEach(function (e) {
      var X = 2 * e.x, Y = 2 * e.y, skin = tk.at(e.x, e.y + 1) || tk.at(e.x - 1, e.y), outward = (e.x + 0.5 < cx) ? -1 : 1;
      if (e.dark) eyeHuman(tk, X, Y, skin, outward, opt.iris);
      else eyeZombie(tk, X, Y, skin, 'milky');
    });
    // boca
    for (var yy = found[0].y + 1; yy <= Math.min(bb.y1, found[0].y + 4); yy++) for (var xx = bb.x0; xx <= bb.x1; xx++) {
      var m = tk.at(xx, yy); if (!m || tk.edge(xx, yy)) continue;
      if (lum(m) < 60 && R(m) > B(m) && !skinish(m)) {
        var MX = 2 * xx, MY = 2 * yy;
        tk.set(MX, MY, lighten(m, 0.08)); tk.set(MX + 1, MY, m);
        tk.set(MX, MY + 1, shade(m, 0.8)); tk.set(MX + 1, MY + 1, pack(R(m) + 50, Gc(m) + 22, B(m) + 22));
      }
    }
    return found.length;
  }
  // ojo humano en el bloque 2×2 (X,Y): iris 2×2 con brillo, blanco hacia afuera, párpado arriba
  function eyeHuman(tk, X, Y, skin, outward, iris) {
    var IR = iris || col('#3a2418'), PU = col('#120c0c'), WH = col('#ebe5d6'), HL = col('#fbf7ea');
    var lid = skin ? deep(skin) : col('#3a2620');
    tk.set(X, Y, IR); tk.set(X + 1, Y, IR); tk.set(X, Y + 1, PU); tk.set(X + 1, Y + 1, PU);
    tk.set(outward < 0 ? X + 1 : X, Y, HL);
    var sx = outward < 0 ? X - 1 : X + 2;
    if (skinish(tk.get(sx, Y + 1))) tk.set(sx, Y + 1, WH);
    if (skinish(tk.get(sx, Y))) tk.set(sx, Y, mixc(WH, skin || WH, 0.35));
    for (var i = -1; i <= 2; i++) if (skinish(tk.get(X + i, Y - 1))) tk.set(X + i, Y - 1, i === (outward < 0 ? -1 : 2) ? mixc(lid, skin, 0.4) : lid);
  }
  // ojo de zombi: cuenca hundida + ojo (lechoso, rojo, punta, amarillo)
  function eyeZombie(tk, X, Y, skin, kind, far) {
    var sk = skin && skinish(skin) ? skin : col('#7f8c71'), sock = shadowOf(sk, 0.6), sock2 = shadowOf(sk, 0.74);
    for (var i = -1; i <= 2; i++) {
      if (tk.in(X + i, Y - 1) && skinish(tk.get(X + i, Y - 1))) tk.set(X + i, Y - 1, sock);
      if (tk.in(X + i, Y + 2) && skinish(tk.get(X + i, Y + 2))) tk.set(X + i, Y + 2, sock2);
    }
    if (skinish(tk.get(X - 1, Y))) tk.set(X - 1, Y, sock2); if (skinish(tk.get(X + 2, Y + 1))) tk.set(X + 2, Y + 1, sock2);
    var WH = far ? col('#b8bc9e') : col('#e6e8cf'), WS = far ? col('#9a9e84') : col('#c4c7ae');
    if (kind === 'red') { tk.set(X, Y, WH); tk.set(X + 1, Y, WH); tk.set(X, Y + 1, WS); tk.set(X + 1, Y + 1, col('#9a2a22')); }
    else if (kind === 'pin') { tk.set(X, Y, sock); tk.set(X + 1, Y, sock2); tk.set(X, Y + 1, sock2); tk.set(X + 1, Y + 1, col('#f2f0c8')); }
    else if (kind === 'yellow') { tk.set(X, Y, col('#ddd49a')); tk.set(X + 1, Y, col('#c9bf7c')); tk.set(X, Y + 1, col('#141012')); tk.set(X + 1, Y + 1, col('#a89a5c')); }
    else { tk.set(X, Y, WH); tk.set(X + 1, Y, WH); tk.set(X, Y + 1, WS); tk.set(X + 1, Y + 1, col('#a6ab98')); }   // lechoso
  }
  TK.autoFace = autoFace; TK.eyeHuman = eyeHuman; TK.eyeZombie = eyeZombie;

  /* ---------------- familias ---------------- */
  var FAM = [];
  function family(name, spec) {
    for (var i = 0; i < FAM.length; i++) if (FAM[i].name === name) { FAM.splice(i, 1); break; }
    FAM.push({ name: name, match: spec.match, paint: spec.paint, face: spec.face });
    GEN++;                                            // una familia nueva rehace lo ya generado
  }
  function famFor(key, info) {
    for (var i = FAM.length - 1; i >= 0; i--) { try { if (FAM[i].match(key, info)) return FAM[i]; } catch (e) { /* nada */ } }
    return null;
  }

  /* ---------------- atlas ---------------- */
  var GEN = 1, pages = [], cur = null, nBuilt = 0, msTot = 0, msMax = 0, maxKey = '', nTag = 0, failN = 0;
  function newPage() {
    var c = document.createElement('canvas'); c.width = PAGE; c.height = PAGE;
    if (ACH.lienzo && ACH.lienzo.noSnap) ACH.lienzo.noSnap(c);
    var g = c.getContext('2d');
    var p = { c: c, g: g, x: PAD, y: PAD, rowH: 0, used: 0 };
    pages.push(p); return p;
  }
  function place(W, H) {
    if (W + 2 * PAD > PAGE || H + 2 * PAD > PAGE) return null;
    if (!cur) cur = newPage();
    if (cur.x + W + PAD > PAGE) { cur.x = PAD; cur.y += cur.rowH + PAD; cur.rowH = 0; }
    if (cur.y + H + PAD > PAGE) { cur = newPage(); }
    var r = { p: cur, x: cur.x, y: cur.y };
    cur.x += W + PAD; if (H > cur.rowH) cur.rowH = H; cur.used += W * H;
    return r;
  }
  function clearAtlas() { pages = []; cur = null; GEN++; }
  if (ACH.lienzo && ACH.lienzo.onRebake) ACH.lienzo.onRebake(clearAtlas);

  function render(c, t, v) {
    var w = c.width, h = c.height;
    if (!w || !h) return null;
    var tk = new Tk(read(c), w, h);
    var key = t.key || '';
    v = v | 0;
    tk.key = key; tk.info = t.info || {}; tk.slot = v; tk.v = v % VARIANTS; tk.kind = KINDS[(v / VARIANTS) | 0] || '';
    tk.seed = (t.info && t.info.seed !== undefined ? t.info.seed : hashStr(seedKey(key))) + tk.v * 7919;
    base(tk);
    // silueta de un solo color (el blanco del golpe, sombras): solo la base, sin cara ni detalle
    var seen = {}, nc = 0;
    for (var i = 0; i < tk.s.length && nc < 4; i++) if (tk.m[i] && !tk.o[i] && !seen[tk.s[i]]) { seen[tk.s[i]] = 1; nc++; }
    if (nc >= 3) {
      var fam = famFor(key, t.info || {});
      if (fam) { try { fam.paint(tk, c, t.info || {}, null); } catch (e) { failN++; if (window.console && failN < 6) console.warn('[hd] familia ' + fam.name + ' ' + key, e); } }
      if (!fam || fam.face === true) autoFace(tk);
      // variante / tipo (después de la familia: recolorea lo ya pintado y agrega accesorios)
      if (tk.v || tk.kind) for (var j = VARP.length - 1; j >= 0; j--) {
        var vp = VARP[j]; var ok = false; try { ok = vp.match(key, tk); } catch (e2) { ok = false; }
        if (!ok) continue;
        try { vp.paint(tk, tk.v, tk.kind); } catch (e3) { failN++; if (window.console && failN < 6) console.warn('[hd] variante ' + vp.name + ' ' + key, e3); }
        break;
      }
    }
    // F7: píxeles semitransparentes del 1× (sombras suaves, p. ej. bajo la bici) se copian tal cual: la huella HD = la 1×
    var s1 = tk.s, d1 = tk.d, W1 = tk.W;
    for (var q = 0; q < s1.length; q++) {
      if (tk.m[q] || !A(s1[q])) continue;
      var qx = 2 * (q % w), qy = 2 * ((q / w) | 0);
      d1[qy * W1 + qx] = d1[qy * W1 + qx + 1] = d1[(qy + 1) * W1 + qx] = d1[(qy + 1) * W1 + qx + 1] = s1[q];
    }
    return tk;
  }
  /* pintores de variante (F3): {match(key, tk), paint(tk, v, kind)}; la última registrada que haga match gana */
  var VARP = [];
  function variantPainter(name, spec) {
    for (var i = 0; i < VARP.length; i++) if (VARP[i].name === name) { VARP.splice(i, 1); break; }
    VARP.push({ name: name, match: spec.match, paint: spec.paint });
    GEN++;
  }
  // semilla estable: sin índice de cuadro ni dirección (el detalle no cambia entre cuadros)
  function seedKey(key) { return key.replace(/\.(\d+)$/, '').replace(/\.(down|up|left|right)\b/g, '').replace(/\.(walk|move|idle|hurt|windup|attack|dead)\b/g, ''); }

  function build(c, t, v) {
    var t0 = now(), tk = render(c, t, v);
    if (!tk) return null;
    var r = place(tk.W, tk.H);
    if (!r) return null;
    var id = r.p.g.createImageData(tk.W, tk.H);
    new Uint32Array(id.data.buffer).set(tk.d);
    r.p.g.putImageData(id, r.x, r.y);
    var e = { img: r.p.c, sx: r.x, sy: r.y, k: K, w: tk.W, h: tk.H, gen: GEN };
    var dt = now() - t0; nBuilt++; msTot += dt; if (dt > msMax) { msMax = dt; maxKey = t.key; }
    return e;
  }

  /* ---------------- API ---------------- */
  function src(img, v) {
    var t = img && img.__hd;
    if (!t || !ON) return null;
    v = v ? (v >= NSLOT || v < 0 ? ((v | 0) % NSLOT + NSLOT) % NSLOT : v | 0) : 0;
    var e = t.e[v];
    if (e && e.gen === GEN) return e;
    if (t.bad === GEN) return null;
    try { e = build(img, t, v); } catch (er) { e = null; failN++; if (window.console && failN < 6) console.warn('[hd] ' + t.key, er); }
    if (!e) { t.bad = GEN; return null; }
    t.e[v] = e;
    return e;
  }
  function tag(c, key, info) {
    if (!c || !(c.width > 0)) return c;
    if (c.__hd) { if (key && c.__hd.key !== key && c.__hd.weak) { c.__hd.key = key; c.__hd.info = info || c.__hd.info; c.__hd.e = []; } return c; }
    try { Object.defineProperty(c, '__hd', { value: { key: key || '', info: info || null, e: [], bad: 0 }, writable: true, configurable: true, enumerable: false }); }
    catch (e) { c.__hd = { key: key || '', info: info || null, e: [], bad: 0 }; }
    nTag++;
    return c;
  }
  var isCanvas = function (o) { return o && typeof o === 'object' && o.getContext && typeof o.width === 'number'; };
  // marca recursiva; las propiedades perezosas (getter) se envuelven: al hornearse se marcan solas
  function tagTree(root, prefix, info, depth, seen) {
    depth = depth || 0; seen = seen || [];
    if (!root || typeof root !== 'object' || depth > 7) return 0;
    if (isCanvas(root)) { tag(root, prefix, info); return 1; }
    if (seen.indexOf(root) >= 0) return 0;
    seen.push(root);
    var n = 0, keys = Object.getOwnPropertyNames(root);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]; if (k === 'length' && Array.isArray(root)) continue;
      var d = Object.getOwnPropertyDescriptor(root, k);
      if (!d) continue;
      var p = prefix ? prefix + '.' + k : k;
      if (d.get) { wrapLazy(root, k, d, p, info); continue; }
      var v = d.value;
      if (isCanvas(v)) { tag(v, p, info); n++; }
      else if (v && typeof v === 'object' && !(v instanceof Element) && !ArrayBuffer.isView(v)) n += tagTree(v, p, info, depth + 1, seen);
    }
    return n;
  }
  function wrapLazy(obj, k, d, p, info) {
    if (d.get.__hdWrap || !d.configurable) return;
    var og = d.get, os = d.set;
    var ng = function () {
      var v = og.call(this);
      try { if (v && typeof v === 'object') tagTree(v, p, info); } catch (e) { /* nada */ }
      return v;
    };
    ng.__hdWrap = true;
    try { Object.defineProperty(obj, k, { get: ng, set: os, enumerable: d.enumerable, configurable: true }); } catch (e) { /* congelado */ }
  }
  // envuelve una función fábrica (p. ej. ACH.sprites.gb.npc(id, f)) para marcar lo que devuelve
  function wrapFn(obj, name, keyFn, info) {
    var f = obj && obj[name];
    if (typeof f !== 'function' || f.__hdWrap) return;
    var w = function () {
      var r = f.apply(this, arguments);
      try { if (r && typeof r === 'object') tagTree(r, keyFn.apply(null, arguments), info); } catch (e) { /* nada */ }
      return r;
    };
    w.__hdWrap = true; w.__hdOrig = f;
    for (var k in f) if (Object.prototype.hasOwnProperty.call(f, k)) w[k] = f[k];
    obj[name] = w;
  }
  function upscale(c) {
    var tk = new Tk(read(c), c.width, c.height); base(tk);
    var o = document.createElement('canvas'); o.width = tk.W; o.height = tk.H;
    var g = o.getContext('2d'), id = g.createImageData(tk.W, tk.H);
    new Uint32Array(id.data.buffer).set(tk.d); g.putImageData(id, 0, 0);
    if (c.ax !== undefined) { o.ax = c.ax * K; o.ay = c.ay * K; }
    return o;
  }
  // HD de un lienzo marcado como lienzo suelto (preview / derivados): copia desde el atlas
  function canvasOf(c, v) {
    var e = src(c, v); if (!e) return null;
    var o = document.createElement('canvas'); o.width = e.w; o.height = e.h;
    o.getContext('2d').drawImage(e.img, e.sx, e.sy, e.w, e.h, 0, 0, e.w, e.h);
    return o;
  }
  // ¿la HD de (img, ranura) ya está en el atlas vigente? O(1), no genera nada.
  function has(img, v) {
    var t = img && img.__hd; if (!t) return false;
    v = v ? ((v | 0) % NSLOT + NSLOT) % NSLOT : 0;
    var e = t.e[v]; return !!(e && e.gen === GEN);
  }
  // F4: genera (síncrono) la HD de una lista hasta gastar budgetMs. Elementos: lienzo suelto (ranura 0) o [lienzo, ranura].
  // Devuelve cuántos quedan por generar. La misma lista se puede volver a pasar cada cuadro: se sigue desde donde quedó
  // (cursor guardado en la lista); los ya hechos, sin marca o fallidos se saltan en O(1). Con HD apagada no hace nada (devuelve 0).
  function warm(list, budgetMs) {
    if (!list || !list.length || !ON) return 0;
    var ms = budgetMs === undefined ? 4 : +budgetMs, t0 = now(), i = list.__hdWi | 0;
    if (i > list.length) i = 0;
    for (; i < list.length; i++) {
      var it = list[i], img = it, v = 0;
      if (Array.isArray(it)) { img = it[0]; v = it[1] | 0; }
      var t = img && img.__hd;
      if (!t || t.bad === GEN || has(img, v)) continue;
      if (now() - t0 >= ms) break;
      src(img, v);
    }
    try { Object.defineProperty(list, '__hdWi', { value: i, writable: true, configurable: true, enumerable: false }); } catch (e) { /* lista congelada */ }
    var left = 0;
    for (var j = i; j < list.length; j++) {
      var it2 = list[j], im2 = Array.isArray(it2) ? it2[0] : it2, t2 = im2 && im2.__hd;
      if (t2 && t2.bad !== GEN && !has(im2, Array.isArray(it2) ? it2[1] | 0 : 0)) left++;
    }
    return left;
  }
  function stats() {
    var used = 0; pages.forEach(function (p) { used += p.used; });
    return { on: ON, K: K, tagged: nTag, built: nBuilt, pages: pages.length, pageSize: PAGE, atlasMB: Math.round(pages.length * PAGE * PAGE * 4 / 1048576 * 10) / 10,
      fill: pages.length ? Math.round(used / (pages.length * PAGE * PAGE) * 100) + '%' : '0%',
      msAvg: nBuilt ? Math.round(msTot / nBuilt * 1000) / 1000 : 0, msMax: Math.round(msMax * 1000) / 1000, msMaxKey: maxKey, msTotal: Math.round(msTot * 10) / 10,
      families: FAM.map(function (f) { return f.name; }), gen: GEN, fails: failN };
  }

  ACH.hd = {
    __v: 1, K: K, VARIANTS: VARIANTS, KINDS: KINDS.slice(), SLOTS: NSLOT, slot: slot,
    on: function () { return ON; },
    // F10: setOn(b) solo cambia el estado; setOn(b, {save:true}) además guarda la elección del jugador (solo desde OPCIONES)
    setOn: function (b, opt) { ON = !!b; if (opt && opt.save) { try { localStorage.setItem('ach.hd', ON ? '1' : '0'); } catch (e) { /* nada */ } } return ON; },
    src: src, has: has, tag: tag, tagTree: tagTree, family: family, variantPainter: variantPainter, upscale: upscale, stats: stats,
    wrapFn: wrapFn, canvasOf: canvasOf, warm: warm, clear: clearAtlas, famFor: famFor, seedKey: seedKey,
    toolkit: TK
  };
})();
