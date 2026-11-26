/* ACHORADO v0.13 — js/engine/dificultad.js (contrato V013.md §2, agente A2): la dificultad y lo que pierdes al morir.
   ACH.dif = { MODOS, get, set, nombre, desc, dmgMul, zHpBonus, foodMul, canEnterBase, camaCura, usarCama, onDeath, state, restore, resetRun }.
   - Modo en localStorage['achorado.opciones.v1'].dif (try/catch con respaldo en memoria). Por defecto 'achorado'.
   - dmgMul(): entities.js lo aplica en ACH.ent.hurtPlayer (todo daño que pasa por ahí: zombies, jefes, señoras, gallinazos, fuego).
   - zHpBonus(z): entities.js lo suma una vez al primer paso del zombie (así vale aunque otro módulo fije z.hp después de makeZombie).
   - foodMul(): inventario.js lo usa al soltar botín del mundo (zombies, basura, carretillas): cada comida o curación se queda con esa probabilidad.
   - canEnterBase(G): game.js (goBase) — bloquea con jefe en pelea o zombie persiguiendo a ≤ 140 px, en todos los modos.
   - camaCura(G) / usarCama(G): base.js (la cama) — Tranqui siempre; Achorado y Bravazo, una vez por nivel (página + nivel).
   - onDeath(G): game.js justo al morir — saca sencillos y comida/curación de la mochila a la bolsa (ACH.inv.setDeathBag).
   No depende de otros módulos al cargar: todo se lee al llamar. */
(function () {
  'use strict';
  var ACH = window.ACH = window.ACH || {};
  var KEY = 'achorado.opciones.v1';
  var MODOS = ['tranqui', 'achorado', 'bravazo'];
  var NOMBRE = { tranqui: 'TRANQUI', achorado: 'ACHORADO', bravazo: 'BRAVAZO' };
  var DESC = {
    tranqui: 'Para pasear: el daño normal, la cama siempre cura y al morir no pierdes nada.',
    achorado: 'Como debe ser: los muertos pegan más fuerte y al morir se te cae la mitad de la bolsa.',
    bravazo: 'Solo para bravos: pegan durísimo, aguantan un golpe más, hay menos comida y al morir lo pierdes todo.'
  };
  var DMG = { tranqui: 1.0, achorado: 1.3, bravazo: 1.6 };
  var LOSE = { tranqui: 0, achorado: 0.5, bravazo: 1 };
  var CHASE_R = 140;
  var MSG = {
    jefe: '¡Con la jefa encima no hay cuarto que valga!',
    chef: '¡Con el chef encima no hay cuarto que valga!',
    jaranon: '¡Con Don Jaranón cantando encima no hay cuarto que valga!',
    chofer: '¡Con la combi encima no hay cuarto que valga!',
    sigue: '¡Te están siguiendo, causa! Piérdelos primero.',
    cama: 'Ya descansaste aquí. La vida no se regala, causa.',
    bolsa: 'Se te cayó la bolsa donde caíste. Ve por ella.'
  };

  var mem = { dif: null };   // respaldo si localStorage no está
  var camas = {};            // 'pagina:nivel' → true (la cama ya curó en este nivel)

  function readOpts() {
    try { var s = window.localStorage.getItem(KEY); var o = s ? JSON.parse(s) : null; return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function valid(m) { return MODOS.indexOf(m) >= 0; }
  function get() {
    if (mem.dif && valid(mem.dif)) return mem.dif;
    var o = readOpts();
    mem.dif = valid(o.dif) ? o.dif : 'achorado';
    return mem.dif;
  }
  function set(m) {
    if (!valid(m)) return get();
    mem.dif = m;
    try { var o = readOpts(); o.dif = m; window.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* queda en memoria */ }
    return m;
  }
  function nombre(m) { return NOMBRE[valid(m) ? m : get()]; }
  function desc(m) { return DESC[valid(m) ? m : get()]; }
  function dmgMul() { return DMG[get()] || 1; }
  function foodMul() { return get() === 'bravazo' ? 0.6 : 1; }
  function zHpBonus(z) {
    if (get() !== 'bravazo' || !z) return 0;
    if (z.boss || z.jefe || z.swarm || z.enjambre || z.dumpling || z.social || z.noDifHp || z.dronBoss || z.presi) return 0;
    return 1;
  }

  /* ---------------- El cuarto: ¿se puede entrar? ---------------- */
  var JEFA_ON = { tutorial: 1, yendo: 1, pelea: 1, muriendo: 1 }, CHEF_ON = { entrada: 1, pelea: 1, muriendo: 1 }, JARANON_ON = { entrada: 1, pelea: 1, muriendo: 1 };
  function bossKind() {   // 'jefa' | 'jaranon' | 'chef' | 'caida' | 'cine' | ''
    try {
      var M = ACH.mira, J = M && M.jefa, C = ACH.cv, K = C && C.chef;
      if (J && JEFA_ON[J.state]) return 'jefa';                                                // la picaronera del Kennedy
      var BRo = ACH.br, JR = (BRo && BRo.jaranon) || (K && K.jaranon ? K : null);
      if (JR) { if (JARANON_ON[JR.state]) return 'jaranon'; K = (K === JR) ? null : K; }      // Don Jaranón (Barranco); también va como ACH.cv.chef: no es el chef
      if (K && CHEF_ON[K.state]) return 'chef';                                                // el chef de Larcomar (arena)
      if (C && C.caida && typeof C.caida.isOn === 'function' && C.caida.isOn()) return 'caida';  // la caída en tabla
      if (C && typeof C.frozen === 'function' && C.frozen()) return 'cine';                    // cinemáticas de Costa Verde
      var P = ACH.presidenta, ps = P && typeof P.state === 'function' ? P.state() : null;      // v0.13 T2: la Presidenta del Comité (Cerro)
      if (ps && (ps.st === 'dialogo' || ps.st === 'pelea' || ps.st === 'muriendo')) return 'presidenta';
      var B = ACH.gambetta, gi = B && typeof B.info === 'function' ? B.info() : null;          // v0.13 T2: El Chofer (Gambetta)
      if (gi && gi.choferOn && !gi.choferDone) return 'chofer';
    } catch (e) { /* nada */ }
    return '';
  }
  function bossFight() { return !!bossKind(); }
  function chased(G) {
    var p = G && G.player, Z = G && G.zombies; if (!p || !Z) return false;
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i];
      if (!z || z.social || z.state === 'muerto' || !(z.hp > 0)) continue;
      if (z.state !== 'perseguir' && z.state !== 'atacar') continue;
      var dx = z.x - p.x, dy = z.y - p.y;
      if (dx * dx + dy * dy <= CHASE_R * CHASE_R) return true;
    }
    return false;
  }
  function canEnterBase(G) {
    G = G || (ACH.game && ACH.game.G);
    var k = bossKind();
    if (k) return { ok: false, msg: k === 'jaranon' ? MSG.jaranon : k === 'chef' ? MSG.chef : k === 'chofer' ? MSG.chofer : MSG.jefe };
    if (chased(G)) return { ok: false, msg: MSG.sigue };
    return { ok: true };
  }

  /* ---------------- La cama ---------------- */
  function page() { var N = ACH.nivel; return (N && N.id) || 'main'; }
  function camaKey(G) { var W = ACH.world; return page() + ':' + ((W && W.id) || page()); }
  function camaCura(G) { return get() === 'tranqui' || !camas[camaKey(G)]; }
  function usarCama(G) { if (get() !== 'tranqui') camas[camaKey(G)] = true; }

  /* ---------------- Al morir: la bolsa ---------------- */
  function isLoss(id, d) { return id === 'sencillo' || !!(d && d.use && d.use.hp > 0); }
  function onDeath(G) {
    G = G || (ACH.game && ACH.game.G);
    var iv = ACH.inv, frac = LOSE[get()] || 0, p = G && G.player;
    if (!iv || !p || typeof iv.setDeathBag !== 'function') return null;
    var had = iv.deathBag && iv.deathBag();
    if (frac <= 0) return null;
    var defs = iv.defs || {}, snap = iv.snapshot ? iv.snapshot() : null, tot = {}, out = [], id;
    if (!snap) return null;
    (snap.slots || []).forEach(function (s) { if (s && isLoss(s.id, defs[s.id])) tot[s.id] = (tot[s.id] || 0) + s.n; });
    for (id in tot) {
      var n = Math.floor(tot[id] * frac);
      if (n > 0 && iv.take(id, n)) out.push({ id: id, n: n });
    }
    if (!out.length) return null;   // nada que perder: no hay bolsa (la vieja, si había, sigue donde estaba)
    iv.setDeathBag(p.x, p.y, out);
    if (ACH.hud && ACH.hud.toast) { try { ACH.hud.toast(MSG.bolsa); } catch (e) { /* nada */ } }
    return { items: out, replaced: !!had };
  }

  /* ---------------- Guardado (A1) ---------------- */
  function state() { return { camas: Object.keys(camas) }; }
  function restore(s) {
    camas = {};
    if (s && Array.isArray(s.camas)) s.camas.forEach(function (k) { if (typeof k === 'string') camas[k] = true; });
  }
  function resetRun() { camas = {}; }   // PARTIDA NUEVA: las camas vuelven a curar

  ACH.dif = {
    MODOS: MODOS, get: get, set: set, nombre: nombre, desc: desc,
    dmgMul: dmgMul, zHpBonus: zHpBonus, foodMul: foodMul,
    canEnterBase: canEnterBase, bossFight: bossFight, chased: chased, camaCura: camaCura, usarCama: usarCama, MSG: MSG,
    onDeath: onDeath, state: state, restore: restore, resetRun: resetRun
  };
})();
