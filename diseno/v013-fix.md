# ACHORADO v0.13 · arreglos post-QA

Fuente en /Users/dahliacistam/juegos/achorado/juego (sin build ni publicación; hay que correr build*.sh).

| # | Arreglo | Archivo |
|---|---|---|
| 1 | M1: con la Presidenta vencida (bandera `cerro.presidenta`) el objetivo/DIARIO dice «Toca la cruz de la cima» al CONTINUAR (se fija en `decide()`). Gambetta con Chofer vencido ya daba «Sube la escalera al cerro» (verificado, sin cambio). | engine/presidenta.js |
| 2 | M2: el prólogo ya no pasa `id` a sus diálogos (sin SALTAR propio) y usa `opts.onEsc` (nuevo en dialogo.js) para que ESC llame a `skip()` del prólogo: un ESC / un botón lo salta entero. Primera vez sigue sin saltar. | engine/prologo.js, engine/dialogo.js |
| 3 | Radio del Cerro: bandera `cerro.radio` al prenderla; el levelHook la restaura si `continuando()`. | engine/cerro.js |
| 4 | Póster «CALLE DE LAS PIZZAS ESTÁ LIBRE»: `visibility:hidden` con `data-state=paused`. | miraflores/jefa.js |
| 5 | Cartel de pieza con la victoria: baja al pie, achicado, sin descripción (CSS `body[data-state=won]`). | css/game.css |
| 6 | Turista del dron: `z.noDifHp = true` (+ `dronBoss`/`presi` en `zHpBonus`). Bravazo: hp 12 = 12. | costaverde/dron.js, engine/dificultad.js |
| 7 | `finishAwake(false)` llama `ACH.game.autoSave()` tras el premio de Chancaca (XP guardado: carry.hab xp 65 / jefaPremio true a los 5 s). | engine/habilidades.js |
| 8 | Toast doble al enseñar melodía: gambetta.js ya no lo repite (solo el de `hab.regalar`, con la tecla). | engine/gambetta.js |
| 9 | Toast del huaico: `#toasts` sube de top 20u a 24u (y 30u con texto grande). En escritorio no se pudo reproducir el solape real (había 13 px de aire); el margen es preventivo. | css/game.css |
| 10 | «N PUNTOS PARA GASTAR» ya no roza «CUERPO DE COMBI»: `.habgrid` con margen superior (4u; 8px en táctil). Verificado 844×390 táctil. | css/habilidades.css |
| 11 | «tecla 3» / «tecla 2 · prueba» ocultas en táctil (`.ttl-keyhint`). | engine/partida.js, css/game.css |
| 12 | Retrato de la olla: «LA SEÑORA DE LA OLLA» (cabe en 844×390, rótulo 145 px). | sprites/retratos-v013.js |
| 13 | Recarga de banderas (partida.js ~85-86): verificada en la misma página (Cerro con presidenta+radio → CONTINUAR: objetivo, radio escuchada), tras ir a costaverde.html y «salir al título» → index → CONTINUAR, y de index a costaverde.html (chef vencido → «Tírate en parapente»). Nota: index.html no usa `viaje` con `continuar`, solo Kennedy/CV (QA-2). Sin cambios. | engine/partida.js |

## Regresión
Partida nueva → prólogo (primera vez sin SALTAR; rejugado un ESC lo cierra) → intro → Gambetta jugable (objetivo Charo). CONTINUAR en index, miraflores y costaverde; 0 errores de `window.onerror` y de consola en las 3 páginas. Sintaxis OK en los 11 .js editados.

## Notas
- Aviso: guardar en una página sin estar en título (pagehide/visibility) sobrescribe la ranura con ese nivel; es el comportamiento diseñado.
- Pendiente (no tocado): B6 (toasts de XP + banner de zona al subir de nivel), objetivo largo de CV roza la caja del HUD a 800 px.
