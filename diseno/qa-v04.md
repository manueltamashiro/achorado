# QA v0.4 — ACHORADO (avenida oeste → este)

Fecha: 2026-11-18. Build: `sh build.sh` → `dist/achorado.html`, servido en `127.0.0.1:8810` y probado en el navegador integrado a 1440×810.
No se editó ningún archivo del proyecto. Las capturas de trabajo (canvas a ×2–×9, con tiles sólidos y huellas superpuestos) están en el scratchpad de la sesión, no en el repo.

Método: partidas completas con entrada real (`ACH.input.press/release`, clics reales `mousedown` sobre el canvas, `ACH.game.step`), recorridos automáticos sobre una ruta calculada con BFS (radio 9), pruebas dirigidas por mecánica, fuzz de colisiones (400 teletransportes aleatorios × 120 pasos con teclas al azar), lectura del código para localizar causas, y revisión visual de 15 vistas del mapa completo más ~40 recortes ampliados.

## Resumen

| Severidad | Cantidad |
|---|---|
| Crítica (bloquea jugar) | 0 |
| Alta | 0 |
| Media | 4 |
| Baja | 10 |

No se encontró ningún bloqueo de progreso, caída de fps, error de consola ni salida del mapa. Los problemas son visuales (orden de dibujo, siluetas, legibilidad) y una huella de colisión que falta.

---

## Bugs, ordenados por severidad

### M1 — Siluetas «detrás de prop alto» con falsos positivos: Alexander y los zombies se ven blanqueados y con halo en media vereda norte
- **Qué pasa:** `behind()` decide si una entidad está tapada comparando contra el **rectángulo completo del sprite** del prop alto (no contra sus píxeles). Los postes miden 88×197 px (ancla 32,150: cubre cables, brazos y afiches), así que cualquier personaje que esté al norte de un poste, a menos de ~44 px en x y dentro de ~150 px hacia arriba, recibe encima la silueta blanca a alfa 0,30 aunque el poste no lo tape. Como los 8 postes norte están todos en y=221 (fila 13,8), **toda la vereda norte, los pasajes y los jirones** quedan marcados casi todo el tiempo. Lo mismo pasa junto a árboles y vehículos altos (el rectángulo es mayor que la copa o el techo).
- **Efecto visible:** Alexander aparece pálido con contorno blanco doble (se ve como «fantasma»); los caminantes cercanos a un poste se ven translúcidos, mientras los escolares (camisa blanca) no cambian, lo que además confunde la lectura de tipos.
- **Pasos:** `ACH.debug.start(); ACH.debug.teleport(300,200)` (poste en x=272, y=221). Captura del canvas: Alexander con silueta aunque el poste no lo cubre. Se repite en (990,181) (pollería), (560,181) (chifa), (404,200). Para un zombie: colocar un caminante quieto en (420,185) → se ve gris pálido; el mismo tipo en (389,143) se ve normal.
- **Mundo:** vereda norte y = 176–223 en todas las columnas con poste (x = 128, 288, 432, 528, 634, 800, 960, 1104, 1248, 1344, 1536, 1712, 1824); pasajes 1–3; jirones.
- **Sospechoso:** `js/engine/render.js` línea 919 (`behind`) y bloque «4. siluetas» (líneas 986–1000). Sugerencia: probar contra el alfa real del sprite en ese píxel, o recortar el rectángulo a la franja del tronco/copa. Aparte, la silueta del zombie usa `zombie(type,'hurt', floor(animT*anim))` aunque el zombie esté quieto (el sprite normal usa el cuadro 0 si no se mueve): posible desfase de pose (sospecha, no verificado cuadro a cuadro).

### M2 — El destello blanco del golpe se dibuja sin orden de profundidad, encima de vehículos, postes y capa alta
- **Qué pasa:** al final del paso 7 (después del mapa de luz) se redibuja todo zombie en estado `golpeado` (0,25 s) y todo cadáver recién tumbado (`ghost`, 0,05 s) con su sprite `hurt`, sin pasar por la cola ordenada por y. Un zombie golpeado que está **detrás** de un prop se ve blanco **delante** del prop.
- **Pasos:** pausar, crear un caminante en (300,466) con `state='golpeado'; stunT=99` (queda detrás de la combi `combiE` de (320,490), huella y 472–490). El blob blanco aparece sobre el parabrisas y el poste lámpara; un caminante normal en (340,466) sí queda tapado. En juego pasa al pegarle a un zombie que está al norte de un vehículo, un árbol, un toldo o un poste.
- **Sospechoso:** `render.js` líneas 1027–1035. Sugerencia: aplicar el destello solo si el zombie no está tapado (reusar `behind`/orden), o dibujar el destello dentro de la cola ordenada con `globalCompositeOperation` apropiado.

### M3 — Las barricadas de los jirones no tienen huella: se camina dentro del arte y Alexander desaparece
- **Qué pasa:** `props.barricada` se entrega con `fw=fh=0` y `FOOT` en `world.js` no la define; la solidez depende solo del tile `X` (fila 0 y fila 45), pero el arte baja hasta y≈28 (norte) y sube hasta y≈698 (sur).
- **Pasos:** `teleport(650,100)` y mantener `ArrowUp` 200 pasos → Alexander llega a (650,21). En el centro (672) se detiene en (672,32) por unas bolsas. Al sur: `teleport(650,640)` + `ArrowDown` → (650,715); en x=672 se detiene en y=696 (la lata). Lo mismo en el segundo jirón (x=1376 y bordes 1354/1398).
- **Efecto:** en el extremo norte Alexander queda **oculto** detrás de las láminas (no se ve ni su silueta); al sur se mete detrás del tractorcito/mesa de la barricada con silueta fantasma. Permite «pasar» 7–19 px hacia dentro de la barricada.
- **Mundo:** barricadas en (672,28), (672,734), (1376,28), (1376,734) (c42/c86, filas 1,75 y 45,9).
- **Sospechoso:** `js/engine/world.js` (tabla `FOOT`, línea ~130, y `PROPS` línea 205–206); `js/sprites/mobiliario.js` línea 1007 (`propBarricada`, `fw=0, fh=0`). Sugerencia: huella de unos 56×14 px centrada en el ancla, o bajar los tiles `X` a 2 filas de grosor.

### M4 — Legibilidad: en pasajes y en el borde norte del mapa personajes y zombies se lavan casi hasta desaparecer
- **Qué pasa:** la niebla baja de pasaje/jirón (`groundFog` 0,55 bajo los personajes + `groundFogOver` 0,14 encima), la niebla por profundidad (`depthFog` 0,14, más fuerte en lo alto de la pantalla) y las siluetas falsas de M1 se suman. Con la cámara pegada al borde norte, el personaje queda en la parte alta del encuadre, justo donde la niebla de profundidad pesa más.
- **Pasos:** `teleport(1560,90)` (pasaje 3): Alexander se ve como un contorno pálido azulado, casi del color del suelo. Cuatro zombies colocados en (1536..1584,110) se leen apenas. En (408,172) (boca del pasaje 1) un caminante se ve grisáceo y translúcido. En el jirón 2, (1376,300), Alexander sobre la cebra pierde contraste (el pelo se confunde con las franjas).
- **Mundo:** pasajes 1–3 (x 384–432, 1056–1104, 1536–1584; y 64–176), jirones (x 640–704, 1344–1408), franja y<200.
- **Sospechoso:** `render.js` (pasos de atmósfera: `drawGroundFog`, `drawScreenMask('d')`) y parámetros `groundFog`, `depthFog` en `CFG.fx` (`entities.js`). Los pasajes son donde «se esconden zombies» y deberían leerse, no desaparecer.

---

### B1 — Alexander no cae al morir
Durante «¡TE COMIERON, CAUSA!» (2,5 s) sigue de pie con la guitarra levantada; solo se apaga el HUD y se tiñe la pantalla. No hay sprite de muerte de Alexander. Repro: `ACH.debug.setHp(0)`; captura en (104,472). Archivos: `js/sprites.js` (falta pose), `render.js` (`playerSprite`).

### B2 — Huellas más chicas que el arte en bultos de basura y carretillas
`trash` fw=14 vs sprite de 36 px; `emoliente`/`anticuchos` fw=24 vs ~38 px (diferencia de 5–8 px a cada lado); `triciclo` y `barrera` 5 px. Alexander atraviesa los costales negros y la sombrilla. Ejemplos: trash en (720,395), (912,602), (224,605), (1456,200); anticuchos en (752,202) y (1664,202). Sospechoso: `FOOT`/huellas en `world.js` y `sprites/mobiliario.js`. Los vehículos, postes y árboles coinciden con el arte (revisado con el análisis de píxeles opacos y las capturas con F3).

### B3 — Flechas de Q pueden quedar tapadas por el HUD
`QX=13`/`QB=29` reservan margen a los lados y abajo, pero no la caja del HUD arriba a la izquierda (~6–99 × 6–60 px lógicos). Un zombie hacia el noroeste dibuja su flecha bajo el panel HTML. Repro: Q con un zombie al noroeste a >250 px. `render.js` línea 1056.

### B4 — El latch de agotamiento no tiene indicador
Tras llegar a 0, Alexander no corre hasta recuperar 20 de aliento, pero la barra solo se pone gris por debajo de 8 (`hud.js`, `st < atkCost`). Entre 8 y 20 el jugador aprieta Shift sin respuesta y sin pista. Repro: correr hasta agotar (≈4 s), soltar Shift y apretarlo de nuevo a los 0,5 s.

### B5 — La pausa por perder foco no cubre `intro` ni `dead`
`autoPause` solo actúa en `playing`. Si se cambia de pestaña durante la muerte, la cuenta de 2,5 s sigue y reaparece sin que el jugador mire; en la intro el temporizador de 7 s también corre. `game.js` (`autoPause`).

### B6 — Cartel de afiches con solo 4 variantes para 6 postes
`posteAfiches` v4 y v5 se resuelven por módulo y repiten los afiches de v0 y v1. Los postes de (864,590) y (1728,590) se ven iguales a otros dos. Cosmético.

### B7 — Combi y tracto casi se superponen en el patio de contenedores
`tracto` en (1576,522) y `combiE` en (1600,472): sus huellas no chocan pero la cabina del tracto tapa más de la mitad de la combi (66×15 px de rectángulos de sprite solapados). Se ve como un amontonamiento ilegible. `world.js` PROPS (líneas ~163–166).

### B8 — Archivo vacío residual `js/engine/orld.js`
0 bytes, no se carga (no aparece en `index.html`), pero se coló en el repo. Borrarlo.

### B9 — F3 no dibuja los tiles sólidos
Muestra huellas de props, radios, hitboxes y ruido, pero no el contorno de los lotes/tiles `L`/`X`, que es justo lo que hay que cotejar con el arte. Se usó una superposición propia para esta QA. `render.js` `drawDebug` (línea 1079).

### B10 — Alexander se ve apagado sobre la escalera de salida
Con la capa `over` completa del lote `ESC` (64×176) por encima, Alexander baja de contraste y las banderitas pasan por delante. Se lee, pero el momento de la victoria queda opaco. Repro: `teleport(1944,120)` y capturar. Sospechoso: `edificios-casas.js` (lote `escalera`, `over`).

---

## Lo que pasó

**Partida completa (entrada real)**
- Título → Enter → intro (avanza con Enter y sola a los 3,5/7 s) → jugar → escalera → «LLEGASTE AL CERRO» (tiempo, fans, muertes) → Enter reinicia (mundo, 34 zombies, hp, Titina, cámara y contadores restablecidos). 5 recorridos automáticos con teclas y clic reales (corriendo y caminando; uno largo con peleas y 4 repetidos): ruta de 535 pasos (≈2136 px), sin atascos antes de la salida, 1–4 zombies tumbados por pasada. La ruta con círculo de radio 12 también existe.
- Movimiento 80 px/s, correr 135 px/s (+67,5 px en 30 pasos), diagonal normalizada, aliento −25/s al correr, recuperación 15/s tras 0,5 s.
- Latch de agotamiento: no corre con Shift apretado hasta soltar y llegar a 20.
- Guitarrazo con Espacio y con clic (gira hacia el mouse): cuadro 2 golpea, arco 90° y alcance 24 (+2,5), coste 8, ruido 90. Verificado el arco: golpea a ±44° y no a ±50°, no golpea por la espalda ni a 30 px. Hitstop 0,07 s al golpear, empuje ≈40 px, destello blanco.
- Tumbar: caminante 2, escolar 1, ciego 3, cobrador 2 golpes; aviso de frase al azar; cadáver 10 s y se desvanece.
- Embestida: ×1,8 (≈58 px/s) a ≤28 px; ataque a 10 px con retardo 0,3 s y 10 de daño.
- Ciego: no detecta a 40 px, sí a 19 px (contacto).
- Daño y muerte: Titina sale volando en el primer golpe, vida 0 → «¡TE COMIERON, CAUSA!», reaparición a los 2,5 s en (104,472) con vida/aliento llenos y Titina en el hombro; cuenta de muertes.
- Titina: vuelve a los 6 s a ≈40–60 px; Q activa 4 s, cooldown 15 s; no se puede sin Titina; se corta si Titina sale.
- Cobrador: grita «¡AL FONDO HAY SITIO!», radio 140, cooldown 8 s, jala a escolares en el radio.
- Perros: ladran al correr cerca (<70 px) y con zombie persiguiendo cerca, ruido radio 100, cooldown 6 s, jalan zombies; huyen a <24 px. No chocan con sólidos en 3200 muestras.
- Gallinazos: salen volando a <48 px (11 en total: 7 en postes, 5 en techos) y vuelven.
- «¡Se viene la mancha!» con 3+ jalados.
- Reaparición: cada 12 s si hay menos de 26 vivos, en tile `s`/`a`, fuera de cámara y a más de 200 px (aparecieron 4 en 48 s).
- Pausa: Esc alterna, y el blur/visibilidad pausan y sueltan las teclas; el mundo no avanza en pausa.
- 34 zombies al inicio: 19 caminantes, 4 cobradores, 5 ciegos, 6 escolares.

**Colisión**
- `routeCheck()` ok (535 pasos), `spawnCheck()` vacío, `lotsBaked` con los 32 lotes horneados.
- Mapa completamente conectado para radios 1–5 px: 0 bolsillos inalcanzables, 0 muros invisibles que aíslen zonas.
- Fuzz: 400 ensayos aleatorios (andar, correr, guitarrazo) sin una sola posición dentro de un sólido ni fuera del mapa. Zombies: 19 200 muestras sin ninguno en sólido ni fuera.
- Huellas vs. arte: análisis de píxeles opacos de las 119 props (101 con huella); salvo B2 y M3, el arte de base cabe en la huella (±4 px). Capturas con superposición de tiles sólidos: el borde sur de las manzanas norte (y=176), el borde norte de las sur (y=624), el pie del cerro (x=1920), la boca de los pasajes y los bordes de mapa coinciden con el arte.
- No se puede entrar a lotes ni salir del mapa; la escalera (columnas 120–123, filas ≤9) es alcanzable y dispara la victoria a y<160.

**Render**
- `ACH.gfx.missing()` = `[]`; ningún prop usa placeholder ni sprite de reemplazo; todos con `ax/ay/fw/fh`.
- Orden de dibujo correcto para Alexander delante/detrás de mototaxis, combis, árboles, bodegas y toldos; copa de árbol baja a 0,55; los letreros y toldos de la capa alta pasan por encima de los personajes como se espera; textos de letreros sin solapes (BODEGA DOÑA LUZ, CHIFA LA SUERTE, BOTICA LA CHALACA, POLLERÍA EL BRAVO, TALLER EL TUERCAS, DEPÓSITO 12, ACHU, CALLAO).
- Vehículos con texto legible en ambos sentidos (versiones W), cabinas de tráiler en el lado correcto, jirones con cebra y barricada, mural CALLAO, escalera pintada, vereda con adoquín sin costuras visibles.
- Basura, moscas y anillos de charco son pequeños y tenues; no se confunden con zombies, Titina ni marcadores de ruido. Humo de anticuchos visible solo cerca (10 partículas).
- Pantallas de título, intro, pausa, muerte y victoria sin solapes a 1440×810 y a 640×360; avisos (hasta 3) no pisan HUD ni F3.

**Rendimiento y errores**
- 60 fps constantes en 6 puntos (inicio, centro, jirón 1, patio de contenedores, este, pasaje 3) con los ~27 zombies del entorno persiguiendo a la vez; peor frame 18–19 ms; costo de `render` 0,13–0,24 ms de CPU y de `update` 0,14–0,19 ms por paso.
- Horneado de todo el arte: 69 ms (límite 400).
- Consola limpia al cargar y durante ≈5 min de simulación + 4 min de caos aleatorio (clics, Q, Esc, correr, guitarrazos): 0 errores, 0 advertencias, 0 excepciones.
- Archivo único `dist/achorado.html` sin `<script src>` externos.

**API de depuración**
- `ACH.debug.look(x,y)` **sí mueve la cámara** (devuelve `{x,y}` clamped, se mantiene en `playing`/`paused`/`title` y se cancela con cualquier input o con `teleport`), sin mover a Alexander. La nota que decía lo contrario es falsa; verificado con valores de `G.cam` y con capturas del canvas en 15 puntos.
- `start/state/player/zombies/teleport/setHp/routeCheck/spawnCheck/lots/lights/dogs/birds/bakeMs` responden bien. Nota: `start()` no reinicia el mundo si el estado es `playing`/`paused`/`intro`; solo desde `title` o `won`.

## Limitaciones de esta QA
- No se probó `file://` (el navegador integrado lo rechaza): se verificó que `dist/achorado.html` no depende de rutas relativas. Las fuentes de Google no cargaron en este entorno (sin red); se vieron los respaldos.
- La ráfaga de teclas reales del navegador integrado se entrega en lotes y el rAF de la pestaña se acelera/frena según la interacción; las pruebas de entrada se hicieron con eventos sintéticos y pasos manuales (`ACH.game.step`). La entrada real de teclado (Enter, Espacio) y de mouse se comprobó caso por caso.
- No se probó audio (no existe) ni tamaños menores a 640×360.
