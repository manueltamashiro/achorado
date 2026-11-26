# v0.13 · cierre (agente único)

Fuente en `juego/` (sin build ni publicación). Servidor 8794 apagado, pestaña cerrada, localStorage de prueba limpio. Sintaxis `new Function` OK en cerro.js, entities.js, chef.js, locales.js.

## 1. B6 — toasts + cartel de zona del Cerro
- `js/engine/cerro.js`: el cartel de zona se **encola** mientras haya toasts en `#toasts` (`ZN.pend`, se muestra en el primer cuadro sin toasts). Si el cartel ya está a la vista y llegan toasts, `#stage.zc-on #toasts { right: 72u }` los corre a la izquierda del cartel.
- Verificado forzando `hab.addXP(300)` y luego teletransporte a la zona nueva: toasts 2 → 0 a los ~4,7 s y recién ahí `on`. Caso inverso (cartel a la vista + 3 toasts): rects sin cruce (cartel 690–830, toasts 234–506 px a 844 px).

## 2. Objetivo largo
- `css/game.css`: `.objline` con `max-width: min(230u, 100% - 150u)` (también con texto grande), el span pasa a **2 líneas** con elipsis (`-webkit-line-clamp: 2`); el texto completo sigue en el DIARIO. En táctil la pista del tutorial sube a `bottom: +58px` para no chocar con el objetivo de 2 líneas.
- `js/costaverde/locales.js`: «Baja por Larcomar hasta el chifa · E en los locales abiertos» (antes 72 caracteres, ahora 59).
- Medido a 800×600 con los 6 objetivos más largos (CV, Doña Meche, Miraflores…), normal y texto grande: la caja del HUD llega a x=148 y el objetivo empieza en x≥176. A 844×390 táctil: objetivo abajo-centro 220–624, sin choque.

## 3. B7 — arranque de la Gambetta
- `js/engine/entities.js`: `gentleStart(G)` al final de `spawnInitial` (solo mundo `gambetta`): a ≤ 400 px (25 tiles) del inicio como máximo **2** zombis y de forma **lenta** (muletas/gusano/carretilla/cantor; Don Lucho —cobrador `camina`, 0,3 de velocidad de Alexander— se queda). Los sobrantes se mudan hacia el este, pasados los 400 px, en su fila (o se quitan si no hay sitio).
- Antes: 3 zombis a ≤ 400 px en 12/12 partidas, 8/12 con un estilo rápido (skate/bici/moto/cuatro).
  Ahora: 2 en 20/20, 0 rápidos.
- Bot quieto que blande la guitarra cada 1 s, 60 s, ACHORADO: antes 5/10 recibieron daño (2/10 murieron, daño medio 41); ahora 7/20 (3/20 murieron, daño medio 21,5). Un solo muletazo mata a un bot que no apunta (13 por golpe), así que sigue siendo castigo por no pelear, pero ya no es el enjambre de 5.

## 4. Jefes con ACHORADO (×1,3)
Bots por teclas sintéticas (esquivador de palitos/lluvia/wok, ataca al chef con estamina). Se añadió `ACH.debug.cv.chef.field()` (solo lectura) en chef.js.
**Chef.** El 90–95 % del daño son dumplings. Ningún bot gana sin god ni en Tranqui antiguo (muere a ~20–30 s con el chef en 15–25 de 40), así que no sirve para afirmar «ganable»: sirve para comparar.
| Config | Muerte media del bot (16 pruebas) |
|---|---|
| mordida 10 (antes) | 18,8 s |
| mordida 7,5 | 23,2 s |
| mordida 5 | 29,2 s |
- Cambio: `biteDmg 1·U → 0,75·U`, `stickDmg` y `rainDmg 1·U → 0,85·U` (en ACHORADO una mordida pasa de 13 a 9,75, como era Tranqui; palitos 11). Wok (15) sin cambios.
- Duración (bot con god, cura a 100 al bajar de 30): 68–92 s con los valores nuevos (antes 60–129 s) → dentro de 70–110.
**Caída / Tablazo** (no usa `hurtPlayer`, no le afecta ×1,3; sin cambios): bot `fan` 5/5 gana en 86–103 s; `mid` 4/5 gana en 122–139 s (1 derrota a 129 s con el Tablazo en 2,75); `noob` 3/5 gana (115–149 s). No hay espiral (furioso solo aparece pasados los ~110 s). >50 s en todos los casos: no se toca la vida del Tablazo.
Recomendación: playtest humano del chef; si aún es duro, bajar `K.summonN` o subir `K.biteCD` en `ACH.cv.chefK`.

## 5. Regresión
Partida nueva (ACHORADO) → prólogo (saltado con `debug.prologo.skip`) → intro de la Gambetta → `playing`, 42 zombis, 0 errores. Miraflores y Costa Verde arrancan y corren 300–600 pasos; objetivo de Larcomar con el texto nuevo. 0 mensajes de consola en las 3 páginas.

Archivos tocados: `js/engine/cerro.js`, `js/engine/entities.js`, `css/game.css`, `js/costaverde/locales.js`, `js/costaverde/chef.js`. Requiere correr build*.sh para publicar.
