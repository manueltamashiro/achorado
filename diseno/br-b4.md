# Fase B4 — Aterrizaje en Barranco y conexión del mapa (BARRANCO.md §7)

## Qué se hizo
- `js/costaverde/chorrillos.js` (§7.1): mismo archivo, API, tiempos (T), música y estructura de 4 planos. Lugar nuevo = Playa Barranco al atardecer.
  - Alias `ACH.cv.aterrizaje === ACH.cv.chorrillos` (play/stop/isOn/debug). Clave `achorado.cine.aterrizaje.v2`.
  - Arte nuevo (todo horneado una vez, ~150 ms): `drawCliff` (acantilado dorado, casonas pastel, quebrada verde de la Bajada con escalera de ladrillo,
    Puente de los Suspiros de madera rojiza con faroles, La Ermita amarilla con 2 torres, cúpula dañada y andamio, buganvilias, ficus, ranchos-restaurante en la ladera),
    `bakeStrip` (Circuito de Playas con autos abandonados, baranda, playa de canto rodado, restaurantes de playa, torre de salvavidas, sombrillas, puente peatonal),
    `bakeHeadland` (cabo de Barranco al fondo del plano 3), `bakeStones` (canto rodado de primer plano), mar gris verdoso con surfistas, cielo de atardecer
    (panza de burro violeta + hueco dorado + rayo), Morro Solar con cruz y Cristo en bruma violeta, tinte «multiplicar» de atardecer.
  - Plano 1: acantilado desde el mar · Plano 2: sobre la orilla de piedras, restaurantes y puente peatonal; gaviotas · Plano 3: contrapicado sobre el canto rodado (polvo de piedra y piedritas que rebotan) · Plano 4: pose heroica de espaldas al mar con Barranco detrás (Ermita, Puente, Bajada, casonas, faroles, Circuito de Playas).
  - Diálogo: «¡Barranco, causa! ¡Aterricé como un campeón!» / «¡Ay, mis rodillas! Esto no es arena, ¡es puro canto rodado!» (añadida) / línea del ampli (se mantiene: `nivel.js` sigue entregando el ampli) / la frase del dueño intacta / «¡Aguanta, Lima, que ya llego!» / Titina «¡Gurú-gurú!». Rótulo del plano 1: «PLAYA BARRANCO · Bajada de Baños · el Puente · La Ermita · el Morro Solar».
  - Se quitaron muelle, botes y arena de Chorrillos.
- `js/costaverde/nivel.js` (§7.2): `win.title` «¡ATERRIZASTE EN BARRANCO!»; botón «ENTER — A BARRANCO» si `ACH.viaje.PAGES.barranco` existe; `winTravel` hace `setDone('costaverde')` y `viaje.go('barranco', carry, {from:'costaverde'})`, con respaldo a `go('main', carry, {mapa:true})`.
- `js/engine/viaje.js` (§7.3): `PAGES.barranco`, `NAMES.barranco='Barranco'`; `visitDistrict('barranco')` solo abre Chorrillos si `progress().barranco`. `here()/progress()/setDone('barranco')` ya funcionaban por `PAGES`.
- `js/cine/cima.js` (§7.3): `NIVELES.barranco=['barranco']`, `ULTIMO.barranco='barranco'`, `TRAS={costaverde:['barranco'],barranco:['chorrillos']}`; `derive()` marca Barranco visitado cuando `p.barranco`; nueva `goBarranco()` dentro de `pick()`.
- `preview-chorrillos.html`: título y textos de Barranco.

## Verificado (Browser pane, puerto 8738)
- Capturas de los 4 planos OK. Ruta `costaverde.html?cv=chorrillos` → cinemática → diálogo → cartel «¡ATERRIZASTE EN BARRANCO!» / «ENTER — A BARRANCO» → ENTER → overlay «Viajando a Barranco…» → `barranco.html` llega con la mochila (hp, bag, hab, guitarra) y `viaje.last().from==='costaverde'`.
- Mapa: tras Costa Verde: Barranco abierto, Chorrillos cerrado; tras `setDone('barranco')`: Barranco ✓ visitado y Chorrillos abierto («Próximamente»). Desde el mapa, Barranco → `ACH.viaje.go('barranco', carryState, …)`.
- `index.html`, `miraflores.html`, `costaverde.html` cargan sin errores de consola.

## Para el arquitecto / QA
- **`game.js` (v0.14, no tocado) no conoce Barranco**: `chooseDistrict()` (mapa del título) y `travel()` (mapa de pausa) solo manejan miraflores/costaverde, y `hereId()` devuelve `levelId` en `barranco.html`, `IS_SUB` es falso allí. Se resolvió el viaje *a* Barranco interceptándolo en `cima.js` (`goBarranco`, usa `ACH.game.carryState()`). Desde `barranco.html`, la pausa/mapa no sabrá que «aquí» es Barranco (`here`) ni cómo volver a Miraflores/Costa Verde: B1a/QA deben revisarlo (puede necesitar `hereId()` y `travel()` con `ACH.nivel.id`).
- Pruebas headless: la pestaña oculta del Browser pane no dispara `requestAnimationFrame`; para probar el flujo hay que polyfillarlo con `setTimeout`.
- Cómo ver los planos: `preview-chorrillos.html?t=<s>&freeze=1&nodlg=1`.
