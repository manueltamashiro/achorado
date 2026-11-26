/* ACHORADO — js/miraflores/trabajadores.js (M1a): los zombies trabajadores de los negocios (MIRAFLORES.md §4.1).
   v0.13 (D1): 9 de los 12 ya no esperan en su puerta: salen en grupo por las EMBOSCADAS de emboscadas.js (M.trabMake los crea al dispararse la zona); los 3 del
   extremo este (Belisario, Wong, Ripley) siguen en su puerta, fuera de la ruta.
   12 zombies y ninguna reaparición. Tipo nuevo ACH.ent.ZT.trabajador (30 % más lento que un caminante). «Siguen en su chamba»: deambulan a
   menos de ~40 px de la puerta de su local hasta que ven u oyen a Alexander; al verlo dicen su frase. Al morir sueltan la comida de su marca
   (60 %) o 1–2 sencillos; Wong, Ripley y Saga sueltan gaseosa (a veces Cola Inglesa) y el «vuelto».
   Skins: ACH.sprites.zvar['trab_<marca>'] (M2c). Si falta, se hornea uno provisorio: un caminante con mandil del color de la marca. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var M = ACH.mira = ACH.mira || {}; M.systems = M.systems || [];
  if (!M.register) M.register = function (s) { M.systems.push(s); return s; };

  var ZT = ACH.ent && ACH.ent.ZT;
  if (ZT && !ZT.trabajador) ZT.trabajador = { hp: 2, speed: 22, anim: 6, sight: 75, dmg: 8, blind: false, lunge: false };
  if (ACH.ent && ACH.ent.CFG) ACH.ent.CFG.respawnBelow = 0;   // ninguna reaparición (solo en esta página: el nivel 1 no carga este archivo)

  // v0.13 (D1): solo los de la puerta (los demás salen en emboscadas: ver ENC en emboscadas.js; en total siguen siendo 12)
  var REPARTO = [['belisario', 0], ['wong', 0], ['ripley', 0]];
  var LEASH = 40;
  var FOOD = { bembos: 'hamburguesaBembos', starbucks: 'cafeStarbucks', lalucha: 'sangucheLucha', belisario: 'polloBelisario', chinawok: 'chaufaWok', tailoy: 'cintaTailoy' };
  var LINES = {
    bembos: ['¿Lo agrandamos?'], starbucks: ['¿Su nombre para el vaso?'], lalucha: ['¿Chicharrón o lechón, casero?'],
    chinawok: ['¿Para llevar o para comer aquí?'], belisario: ['¿Un cuarto con papas?'], wong: ['¿Tiene su tarjeta de puntos?'],
    ripley: ['¿Desea sacar la tarjeta?', 'Tenemos ofertas…'], saga: ['¿Desea sacar la tarjeta?', 'Tenemos ofertas…'], tailoy: ['Útiles escolares, joven']
  };
  function irnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* ---------------- Skins provisorios: caminante + mandil de la marca ---------------- */
  function baseSkin() {
    var S = ACH.sprites, L = S && S.zvarList, Z = S && S.zvar;
    if (!Z) return null;
    if (Array.isArray(L)) for (var i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin] && /normal/.test(L[i].skin)) return Z[L[i].skin];
    if (Array.isArray(L)) for (i = 0; i < L.length; i++) if (L[i].loco === 'camina' && Z[L[i].skin]) return Z[L[i].skin];
    for (var k in Z) if (/^camina_/.test(k)) return Z[k];
    return null;
  }
  function apron(src, bg, fg, dead) {
    if (!src || !src.width) return src;
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    var g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    var w = src.width, h = src.height;
    if (dead) { g.fillStyle = bg; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.25), Math.ceil(w * 0.35), Math.ceil(h * 0.5)); }
    else {
      var y0 = Math.floor(h * 0.42), y1 = Math.floor(h * 0.8), x0 = Math.floor(w * 0.3), x1 = Math.ceil(w * 0.7);
      g.fillStyle = bg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = fg; g.fillRect(x0, y0, x1 - x0, 1);
      g.fillStyle = bg; g.fillRect(Math.floor(w * 0.3), Math.floor(h * 0.08), Math.ceil(w * 0.4), 2);   // gorra / visera
    }
    g.globalCompositeOperation = 'source-over';
    c.ax = src.ax; c.ay = src.ay; c.prov = true;
    return c;
  }
  function mapFrames(o, fn) { if (Array.isArray(o)) return o.map(fn); return o && o.width ? fn(o) : o; }
  function ensureSkins() {
    var S = ACH.sprites; if (!S) return;
    S.zvar = S.zvar || {};
    var base = baseSkin(); if (!base) return;
    Object.keys(M.BRANDS || FOOD).forEach(function (b) {
      var key = 'trab_' + b; if (S.zvar[key]) return;
      var C = M.brandColors ? M.brandColors(b) : { bg: '#888', fg: '#fff' };
      var e = { move: mapFrames(base.move, function (f) { return apron(f, C.bg, C.fg); }), hurt: mapFrames(base.hurt, function (f) { return f; }),
        dead: mapFrames(base.dead, function (f) { return apron(f, C.bg, C.fg, true); }), prov: true };
      if (base.extra) e.extra = base.extra;
      S.zvar[key] = e;
    });
  }

  /* ---------------- Aparición ---------------- */
  var crew = [];
  // crea un trabajador de la marca b en (x, y) (en deambular, con su skin trab_<marca>), lo agrega a G.zombies y a la cuadrilla; hx, hy = su «puesto» (adonde vuelve)
  function make(G, b, x, y, hx, hy) {
    var mk = ACH.ent && ACH.ent.makeZombie;
    if (!mk || !ACH.ent.ZT.trabajador) return null;
    ensureSkins();
    var z = mk('trabajador', x, y);
    if (ACH.zvar && ACH.zvar.setLoco) { try { ACH.zvar.setLoco(z, 'camina', Math.random); } catch (e) { /* nada */ } }
    z.loco = 'camina'; z.shield = false; z.low = false; z.punch3 = false;
    z.hp = ACH.ent.ZT.trabajador.hp; z.hpMax = z.hp;
    var sk = ACH.sprites && ACH.sprites.zvar && ACH.sprites.zvar['trab_' + b];
    if (sk) z.skin = 'trab_' + b;
    z.brand = b; z.trab = true; z.homeX = hx === undefined ? x : hx; z.homeY = hy === undefined ? y : hy; z.said = false;
    z.flip = Math.random() < 0.5;
    G.zombies.push(z);
    crew.push(z);
    return z;
  }
  M.trabMake = make;
  function spawn(G) {
    crew.length = 0;
    var W = ACH.world, doors = W.doors || {};
    if (!ACH.ent || !ACH.ent.makeZombie || !ACH.ent.ZT.trabajador) return;
    ensureSkins();
    var used = {};
    REPARTO.forEach(function (rp, n) {
      var b = rp[0], list = doors[b] || []; if (!list.length) return;
      var d = list[Math.min(rp[1], list.length - 1)], k = (used[b + rp[1]] = (used[b + rp[1]] || 0) + 1) - 1;
      var x = d.x + (k ? (k % 2 ? 14 : -14) : 0), y = d.y;
      if (W.collideCircle(x, y, ACH.ent.CFG.zRadius || 5)) { x = d.x; }
      make(G, b, x, y, d.x, d.y);
    });
  }

  /* ---------------- Botín de marca ---------------- */
  function lootOf(z) {
    var b = z.brand, out = [];
    if (b === 'wong' || b === 'ripley' || b === 'saga') {
      if (Math.random() < 0.6) out.push({ id: Math.random() < 0.15 ? 'colaInglesa' : 'gaseosa', n: 1 });
      out.push({ id: 'sencillo', n: irnd(1, 3) });   // el vuelto
      return out;
    }
    var food = FOOD[b], defs = ACH.inv && ACH.inv.defs;
    if (food && defs && defs[food] && Math.random() < 0.6) out.push({ id: food, n: 1 });
    else out.push({ id: 'sencillo', n: irnd(1, 2) });
    return out;
  }
  function wrapDrop() {
    var I = ACH.inv; if (!I || !I.dropFor || I.dropFor._mira) return;
    var orig = I.dropFor;
    I.dropFor = function (z) {
      if (z && z.trab) { var items = lootOf(z); if (items.length && I.drop) I.drop(z.x, z.y, items, true); return items; }
      return orig.apply(this, arguments);
    };
    I.dropFor._mira = true;
  }

  /* ---------------- Globo con la frase ---------------- */
  var bubbles = [];
  function speak(z) {
    var L = LINES[z.brand] || ['¡Bienvenido!'], t = L[Math.floor(Math.random() * L.length)];
    bubbles.push({ z: z, t: 0, s: t });
    if (bubbles.length > 3) bubbles.shift();
    if (M.say) M.say('trab.' + z.brand, { who: 'trabajador', x: z.x, y: z.y, brand: z.brand }, t);
  }

  M.register({
    name: 'trabajadores',
    reset: function (G) { wrapDrop(); bubbles.length = 0; spawn(G); },
    update: function (G, dt) {
      for (var i = 0; i < crew.length; i++) {
        var z = crew[i];
        if (z.state === 'muerto') continue;
        if (!z.said && (z.state === 'perseguir' || z.state === 'atacar')) { z.said = true; speak(z); }
        if (z.state === 'deambular') {
          // siguen en su chamba: si se alejan de la puerta, vuelven
          var dx = z.homeX - z.x, dy = z.homeY - z.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d > LEASH) { z.wx = dx / d; z.wy = dy / d; z.wT = Math.max(z.wT, 0.6); }
          if (d < 8 && z.said && Math.random() < dt * 0.05) z.said = false;   // de vuelta en el local, otra vez atienden
        }
      }
      for (i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t > 2.6 || bubbles[i].z.state === 'muerto') bubbles.splice(i, 1); }
    },
    drawTop: function (g, G, cx, cy) {
      if (!bubbles.length) return;
      g.font = '7px Silkscreen, monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i], z = b.z, x = Math.round(z.x) - cx, y = Math.round(z.y) - cy - 38;
        var w = Math.ceil(g.measureText(b.s).width) + 8, a = b.t > 2.2 ? Math.max(0, (2.6 - b.t) / 0.4) : 1;
        g.globalAlpha = a;
        g.fillStyle = '#131015'; g.fillRect(x - (w >> 1) - 1, y - 6, w + 2, 12);
        g.fillStyle = '#f3efe2'; g.fillRect(x - (w >> 1), y - 5, w, 10); g.fillRect(x - 1, y + 5, 3, 3);
        g.fillStyle = '#131015'; g.fillText(b.s, x, y + 0.5);
      }
      g.globalAlpha = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    }
  });
  M.trabajadores = function () { return crew.map(function (z) { return { brand: z.brand, x: Math.round(z.x), y: Math.round(z.y), hp: z.hp, state: z.state, skin: z.skin || null }; }); };
})();
