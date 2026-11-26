# PROBAR NIVEL (saltos) — TEMPORAL

Para que la dueña pruebe cada distrito rápido. Selector: **CALLAO · La Gambetta · MIRAFLORES · Parque Kennedy · COSTA VERDE · Malecón · BARRANCO · ◀ VOLVER**.

## Dónde sale
- **Menú de pausa (ESC)**, en las 4 páginas: entrada «PROBAR NIVEL» (order 57, después de DIARIO / ÁRBOL y antes de CONTROLES), vía `ACH.pausa.addItem` (pausa.js sin tocar).
- **Título de index.html**: botón «PROBAR NIVEL · prueba» en `#ttlMenu` (lo arma partida.js en cada `renderTitle`, así que sobrevive a los cambios de sub-pantalla).
- Teclado: ↑↓ (W/S, ←→, TAB) · ENTER/ESPACIO · ESC (o P / BACKSPACE) = volver. Mouse y toque: clic en la fila.
  Con el selector abierto, su oyente de `keydown` (en captura, registrado antes que partida.js/pausa.js/input.js) se come todas las teclas salvo F1–F12.

## Qué hace el salto
Siempre `ACH.viaje.go(to, carry, extra)` — un viaje normal, así que la mochila, vida, fans, árbol y dificultad viajan como siempre.
- **Callao** → `index.html` con `extra = {nivel:'gambetta', from:'salto', salto:true}`: game.js `init()` → `revisit('gambetta', carry)` = la Gambetta desde su inicio, con la intro corta de vuelta («De vuelta a la Gambetta…»), sin título ni mapa.
- **Miraflores / Costa Verde / Barranco** → su página con `extra = {from:'salto', salto:true}`: la llegada normal de cada nivel (`ACH.game.arrive`), desde su inicio (Faro en Costa Verde, la playa en Barranco), con su diálogo de llegada. Sin `continuar`, así que las banderas del nivel (jefe vencido, etc.) arrancan vacías.
- **Nivel de la misma página** («(reiniciar)» en la fila): el viaje deja `#viaje=` en la URL; como solo cambia el hash, saltos.js recarga la página a los 750 ms y el nivel arranca de nuevo.
- **Desde el título** (no hay partida en juego): se lleva el `carry` de la partida guardada (`ACH.partida.load().carry`) si hay; si no, mochila vacía.
- No llama a `setDone`, `visitDistrict` ni `cima.markVisited`: no marca niveles ganados ni abre distritos. No borra la partida.

## Archivos
- `js/engine/saltos.js` (nuevo, → `ACH.saltos = {on, open, close, isOpen, jump, LEVELS, from}`)
  - l.15 bandera `ACH.cfg.saltos` (DEFAULT true)
  - l.42 `jump(to)` (viaje + recarga si es la misma página)
  - l.107 teclado en captura
  - l.121 `ACH.pausa.addItem({id:'saltos', label:'PROBAR NIVEL', order:57})`
- `js/engine/partida.js` l.209: una línea en `renderTitle()` (vista menú) que agrega el botón `#ttlSaltos` si `ACH.saltos.on()`.
- `<script src="js/engine/saltos.js">` justo después de `viaje.js` (antes de `partida.js`) en: `index.html` l.157, `miraflores.html` l.190, `costaverde.html` l.199, `barranco.html` l.190. Los 4 build-*.sh lo inlinean solos (mismo patrón awk).

## Cómo apagarlo
- Rápido: en `js/engine/saltos.js` l.15 cambiar `ACH.cfg.saltos = true` por `false` (sin botón en el título ni entrada en la pausa). También vale poner `ACH.cfg = {saltos:false}` en un script antes.
- Quitarlo del todo: borrar las 4 líneas `<script src="js/engine/saltos.js">`, la línea de `partida.js` l.209 y el archivo; volver a correr los build-*.sh.

## Ojo
- El guardado sigue funcionando como en un viaje normal: al salir de la página (pagehide) se guarda donde estabas, y al terminar la intro del nivel de destino el autoguardado apunta a ese nivel. O sea, después de probar, CONTINUAR lleva al último nivel probado (con la mochila que llevabas).
- Callao = la Gambetta. El Cerro no está en el selector (se llega ganando la Gambetta o por el MAPA DE LIMA).
