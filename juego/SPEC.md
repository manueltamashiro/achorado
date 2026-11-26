# ACHORADO — Prototipo 0.1 (spec)

**Objetivo del prototipo:** Alexander camina por la Av. Gambetta (Callao) de sur a norte, a guitarrazos entre zombies, hasta llegar a la escalera del cerro. Sirve para probar si moverse y pelear se siente bien.

Diseño completo del juego: `../diseno/cuaderno-achorado.html` (léelo para el tono y el arte). Todo el texto del juego va en **español peruano/chalaco**, sin lisuras fuertes.

## Reglas técnicas

- **JavaScript plano, sin build, sin npm, sin módulos ES.** Scripts clásicos (`<script src>`) que comparten el global `window.ACH`. El juego tiene que funcionar abriendo `index.html` desde `file://` (en esta Mac no hay node ni python, no hay servidor).
- Sin librerías externas. Única dependencia externa permitida: Google Fonts (`Bungee`, `Patrick Hand`, `Silkscreen`) por `<link>` en `index.html`, con fallbacks.
- Orden de carga en `index.html`: `js/sprites.js`, luego `js/engine/*.js` (input, world, entities, render, hud, game), con `js/engine/game.js` al final arrancando todo.
- Canvas del mundo: resolución lógica **480 × 270**, escalado entero a la ventana con CSS (`image-rendering: pixelated`). Tiles de **16 px**.
- HUD, título, diálogos y pantallas van como **HTML/CSS encima del canvas** (no texto dibujado en el canvas), estilo afiche chicha.
- Exponer `window.ACH.debug` para QA (ver abajo).

## Archivos y dueños

| Archivo | Dueño |
|---|---|
| `js/sprites.js` | agente de sprites |
| `index.html`, `css/game.css`, `js/engine/*.js` | agente de motor |
| `SPEC.md` | arquitecto (no editar) |

Nadie edita archivos de otro dueño. Si el contrato no alcanza, se reporta al final en vez de cambiarlo.

## Contrato de sprites (`js/sprites.js`)

Al cargar, `sprites.js` construye todo de una vez y deja:

```js
window.ACH = window.ACH || {};
ACH.sprites = {
  alex: {
    bird:   { idle:{down,up,left,right}, walk:{down:[4],up:[4],left:[4],right:[4]}, attack:{down:[3],up:[3],left:[3],right:[3]} },
    nobird: { ...misma forma, sin Titina en el hombro... }
  },
  zombie: {
    caminante: { walk:[4], hurt:[4], dead: canvas },
    escolar:   { walk:[4], hurt:[4], dead: canvas },
    ciego:     { walk:[4], hurt:[4], dead: canvas }
  },
  titina: { fly:[2] },                      // paloma chiquita volando (~9×7)
  tiles: { asphalt:[n], asphaltCrack, laneDash, sidewalk:[n], curbW, curbE, berma:[n],
           alley:[n], roof:[n], wallBrick, wallPaint:[3], door, window, stairs },
  props: { combi, car, mototaxi, trash, poste, paradero, bags }
};
```

- `idle[dir]` es **un** canvas; `walk[dir]` y `attack[dir]` son arrays de canvas.
- **Cada canvas de personaje o prop** lleva propiedades `ax`, `ay`: el píxel del canvas que va en la posición del mundo (los pies, centrados). El motor dibuja en `(x - ax, y - ay)`.
- **Cada prop** además lleva `fw`, `fh`: huella de colisión en px, un rectángulo centrado horizontalmente en el ancla que sube `fh` px desde el ancla.
- **Tiles**: canvas 16×16 sin ancla. `laneDash` es asfalto con la raya discontinua **vertical** (la avenida va de norte a sur). `curbW`/`curbE`: borde del sardinel con la vereda al oeste/este. `stairs`: escalera de cemento hacia el cerro (la salida).
- `hurt` = las mismas poses en silueta blanca (destello al recibir golpe). `dead` = cadáver tirado en el piso (vista de arriba, horizontal).
- Zombies solo tienen vista de frente; el motor los voltea en horizontal si caminan a la izquierda.
- Estilo: pixel art sucio y desaturado (cielo panza de burro, ladrillo sin tarrajear), contorno oscuro de 1 px en personajes y props. Alexander, Titina y la guitarra son lo único con algo de color. Reusar el código de pixel art del cuaderno.

## Mapa (`js/engine/world.js`)

48 columnas × 90 filas de tiles (768 × 1440 px), definido como filas ASCII en el código. La avenida va de **sur (abajo, inicio) a norte (arriba, salida)**.

| Columnas | Contenido |
|---|---|
| 0–9 | Manzana oeste: edificios (sólidos) cortados por callejones este-oeste de 3 tiles en las filas ~28 y ~58 |
| 10–12 | Vereda oeste (postes cada ~8 filas) |
| 13 | Sardinel oeste (`curbW`) |
| 14–21 | Pista oeste |
| 22–25 | Berma central (tierra seca) |
| 26–33 | Pista este (raya `laneDash` en las columnas 17–18 y 29–30) |
| 34 | Sardinel este (`curbE`) |
| 35–37 | Vereda este (paradero en la fila ~80) |
| 38–47 | Manzana este, igual que la oeste |

- Edificios: la fila sur de cada bloque es fachada (`wallBrick`/`wallPaint`, con `door` y `window`); el resto es techo (`roof`). Son sólidos.
- Callejones: piso `alley`, terminan en pared al borde del mapa (sin salida). Ahí se esconden zombies.
- **Inicio**: Alexander aparece en la columna 18, fila 84. Hay una combi volcada en las columnas 15–19, filas 79–80 (prop `combi`).
- Vehículos abandonados (`combi`, `car`, `mototaxi`) repartidos en la pista como cobertura. Basura (`trash`, `bags`) en veredas y callejones. Todos sólidos.
- **Salida**: filas 0–2, columnas 22–25 con tiles `stairs` ("escalera al cerro"). Llegar ahí es ganar.
- Bordes del mapa: sólidos.
- Marcadores de spawn en el mapa: `Z` caminante, `E` grupo de 3 escolares, `C` ciego. Unos 18 zombies al inicio, más densos hacia el norte.

## Gameplay

### Alexander
- Moverse: **WASD o flechas**, 8 direcciones (velocidad diagonal normalizada). Sprite en 4 direcciones (la dominante).
- Caminar: **80 px/s**. Correr (**Shift**): **135 px/s**, gasta 25 de aliento por segundo y hace ruido.
- **Vida** 100. **Aliento** 100, se recupera 15/s si no corre ni ataca durante 0.5 s.
- Colisión: círculo de radio 5 en los pies, movimiento separado por eje contra tiles sólidos y huellas de props.

### Guitarrazo
- **Espacio o clic izquierdo.** Con clic, Alexander voltea hacia el mouse (4 direcciones).
- Dura 0.27 s (3 cuadros de 0.09 s). Solo el **cuadro 2** golpea: arco de 90° hacia donde mira, alcance 24 px desde los pies.
- Daño 1, empuje 40 px, cooldown 0.30 s, cuesta 8 de aliento (sin aliento no hay guitarrazo).
- Cada guitarrazo hace ruido de radio 90.

### Ruido
- Evento `{x, y, radio}`. Correr emite radio 80 cada 0.3 s. Los zombies dentro del radio van a investigar ese punto.

### Zombies

| Tipo | Vida | Velocidad | Detecta | Daño | Notas |
|---|---|---|---|---|---|
| Caminante | 2 | 32 px/s | vista 90 px + ruido | 10 | El común |
| Escolar | 1 | 68 px/s | vista 80 px + ruido | 6 | Sale en grupos de 3 |
| Ciego | 3 | 38 px/s | **solo ruido** (+ contacto a 20 px) | 15 | No te ve aunque pases al lado caminando |

- Estados: **deambular** (al 40 % de velocidad, cambia de rumbo cada 2–4 s) → **perseguir** (te ve) → **investigar** (fue un ruido; llega al punto y vuelve a deambular) → **atacar** (a 10 px: daño, cooldown 1 s) → **golpeado** (0.25 s aturdido, destello blanco, empuje) → **muerto** (cadáver 10 s y se desvanece).
- Si te pierde de vista más allá de vista × 1.8 por 3 s, va a investigar el último punto donde te vio.
- Se empujan entre ellos para no apilarse. Chocan con sólidos igual que Alexander.
- Reaparición: cada 20 s, si hay menos de 14 vivos, aparece un caminante en una vereda o callejón a más de 200 px y fuera de cámara.

### Titina
- Va en el hombro (sprites `bird`). Si a Alexander le pegan y Titina está, **sale volando**: entidad propia que se aleja y da vueltas a 40–60 px durante 6 s, y luego vuelve (sprites `nobird` mientras no está).
- **Q = vista de paloma**: 4 s marcando con flechitas rosadas a todos los zombies a menos de 400 px (también en el borde de pantalla si están fuera). Cooldown 15 s. No se puede si Titina no está.

### Muerte, victoria, estados
- **Título** (HTML chicha): «ACHORADO», «Canciones para el fin del mundo», controles, «ENTER para empezar».
- **Intro** al empezar (caja de diálogo chicha, se cierra con Enter/clic o sola en 7 s): Alexander: «Con su permiso, señor conductor... ah, ya no hay conductor.» → «Hay que llegar al cerro. Al norte, por Gambetta.»
- **Esc** pausa.
- Vida 0 → «¡TE COMIERON, CAUSA!» 2.5 s → reaparece en el inicio con vida y aliento llenos (el mundo sigue igual). Cuenta muertes.
- Llegar a la salida → «LLEGASTE AL CERRO» con tiempo, fans tumbados (zombies) y muertes. Enter reinicia todo.
- Al tumbar un zombie sale un aviso corto al azar: «¡Gracias por su atención!», «Que Dios lo bendiga», «Por fin alguien se queda hasta el final», «Su colaboración es voluntaria».

### HUD (HTML chicha, arriba a la izquierda)
Barra de vida (rosado), barra de aliento (verde), 6 rayitas de cuerdas (decorativas), ícono de Titina (en el hombro / volando / Q en cooldown), contador «FANS: n». Pista abajo: «WASD moverse · SHIFT correr · ESPACIO guitarrazo · Q Titina».

### Cámara y ambiente
- Sigue a Alexander con suavizado, limitada al mapa, posiciones enteras.
- Orden de dibujo: suelo (pre-renderizado una vez a un canvas offscreen) → props y entidades ordenados por `y` → neblina (capas semitransparentes que se desplazan) → marcadores de Q.
- Solo de día en este prototipo.

## Debug para QA

```js
ACH.debug = {
  state(),            // 'title' | 'intro' | 'playing' | 'paused' | 'dead' | 'won'
  player(),           // {x, y, hp, stamina, dir, bird}
  zombies(),          // [{type, x, y, hp, state}]
  teleport(x, y),     // mover a Alexander
  setHp(n),
  start()             // saltar título e intro
};
```
**F3** muestra hitboxes, huellas de colisión, radios de ruido y FPS.

## Arte Callao (v0.3): extensión del contrato de sprites

Basado en `../diseno/investigacion-callao.md` (paleta y lista de assets). Todo es **adicional**: no cambiar el tipo ni la forma de ninguna clave existente. Sin logos, escudos, marcas ni nombres reales de empresas; los letreros usan nombres inventados.

```js
ACH.sprites.tiles += {
  warehouseWall:[2], warehouseGate, roofWarehouse:[2],   // manzana este: almacenes de la Gambetta
  bodegaShutter, bodegaSign:[3],                        // fachada de bodega (persiana, letrero pintado a mano)
  zebra, hump,                                          // cebra gastada (rayas verticales), rompemuelles amarillo (banda horizontal)
  curbWYellow, curbEYellow                              // sardinel pintado de amarillo, pelado
};
ACH.sprites.decals = {                                  // se dibujan encima de un tile de fachada o de vereda, sin colisión
  muralCallao,        // 64×16: «CALLAO» en letras de grafiti rosadas (#D98A9E) con contorno
  chicha:[3],         // afiches chicha fosforescentes, ~8×10
  flag,               // bandera peruana colgada (rojo-blanco-rojo vertical), ~10×8
  pinkStripes,        // 16×16 transparente, franjas rosadas de barrio (sardinel o muro)
  graffiti:[2]        // pintas genéricas de pared, 16×16
};
ACH.sprites.props += {
  combiE:[3],   // combi de costado (horizontal), base blanca/crema, 2 franjas por variante (rojo+amarillo, azul+verde, rojo+azul), puerta corrediza abierta, cartel de ruta inventado en el parabrisas. ~64×36
  combiN:[3],   // combi apuntando al norte (techo y parte trasera), mismas variantes. ~32×56
  custerE,      // custer de costado, franja azul, ventanas cuadradas con cortinillas. ~96×40
  trailer:[2],  // tráiler con contenedor de costado (azul o rojo oxidado). ~128×48
  treeWhite,    // árbol de berma con tronco pintado de blanco, copa mustia. huella ~6×4
  palm,         // palmera. huella ~4×4
  tank,         // tanque de agua negro de azotea (decoración, fw=fh=0)
  rebar,        // fierros saliendo del techo (decoración, fw=fh=0)
  emoliente,    // carretilla de emoliente con botellas rojizas y verdes y una sombrillita
  anticuchos,   // carrito de anticuchos con parrilla; propiedad extra smoke:{x,y} relativa al ancla
  posteCables,  // poste de concreto con travesaño y transformador; propiedad extra top:{x,y} relativa al ancla (de ahí salen los cables)
  posteAfiche,  // igual, con afiches chicha pegados; también top:{x,y}
  mototaxiVar:[3] // mototaxis con techo de lona naranja #C9733A, rojo y azul, con calcomanías
};
ACH.sprites.zombie.cobrador = { walk:[4], hurt:[4], dead };  // gorra, canguro, boca abierta gritando
ACH.sprites.npc = {
  gallinazo: { perch:[2], fly:[2] },                       // buitre negro, cabeza gris arrugada, ~16×14
  perro:     { idle:[2], walk:{left:[4], right:[4]}, bark:[2] }  // perro callejero beige flaco, ~18×12
};
```
Mismas reglas de siempre: `ax`/`ay` en todo lo que no es tile (los decals también llevan ancla: el centro inferior), `fw`/`fh` en props, contorno oscuro de 1 px, paleta sucia y desaturada (salvo los afiches chicha y el mural, que son el toque de color).

## Hecho cuando
- Abre desde `file://` sin errores en consola, 60 fps estables.
- Se puede jugar de inicio a salida: moverse, correr, guitarrazo, tumbar los 3 tipos, morir y reaparecer, Titina sale volando y vuelve, Q funciona, se llega a la salida y se reinicia.

## Cambios de v0.2 (impacto y velocidad)
Los números de arriba ya están actualizados. Además: 34 zombies al inicio, reaparición cada 12 s si hay menos de 26, embestida (×1.8 por 0.35 s a menos de 28 px, cooldown 1.5 s), latch de agotamiento, aviso «¡Se viene la mancha!», pausa automática al perder el foco. Efectos del golpe en `js/engine/fx.js` (hitstop, temblor de cámara, estela, partículas, texto flotante); todas las constantes viven en `CFG` y `CFG.fx` de `entities.js`.

## v0.3: la Gambetta se ve como el Callao

**Escenario** (`world.js`, `render.js`), usando el arte de «Arte Callao»:
- **Manzana oeste = barrio de autoconstrucción:** fachadas de `wallBrick` y `wallPaint` con bodegas (`bodegaShutter`, `bodegaSign`), decals de `flag`, `chicha`, `graffiti` y `pinkStripes`; en los techos, `tank` y `rebar`.
- **Manzana este = almacenes de la Gambetta:** `warehouseWall`, `warehouseGate` y `roofWarehouse`. El `muralCallao` va en el primer muro de almacén que se ve desde el inicio.
- **Berma:** `treeWhite` y `palm` alternados.
- **Vehículos:** la combi volcada del inicio se queda. El resto se reemplaza por `combiE`/`combiN` (variantes mezcladas), una `custerE`, 2 `trailer` cruzados en la pista y `mototaxiVar`. La ruta a la salida sigue abierta.
- **Mobiliario:** `hump` cruzando las pistas cada ~20 filas; `zebra` en las bocacalles de los callejones; tramos de `curbWYellow`/`curbEYellow`; postes `posteCables`/`posteAfiche` con cables colgantes dibujados entre postes consecutivos (desde `top`, con comba).
- **Vendedores abandonados:** 2 `emoliente` y 2 `anticuchos` en veredas; los anticuchos echan humo (partículas desde `smoke`).
- **Garúa:** llovizna fina muy sutil sobre la neblina.

**Gameplay nuevo** (`entities.js`):
- **Zombie cobrador:** stats de caminante. Cuando te ve, grita «¡AL FONDO HAY SITIO!» (toast) y emite ruido de radio 140, con cooldown de 8 s. Hay 3–4 cerca de combis, y también puede reaparecer.
- **Gallinazos:** decoración viva posada en los `top` de postes y en techos. Si Alexander pasa a menos de 48 px, salen volando (`fly`) y se van de la pantalla. No hacen daño.
- **Perros callejeros:** 3–4 deambulan por veredas y berma. Si Alexander corre a menos de 70 px, o hay un zombie persiguiendo cerca, ladran (`bark`) y emiten ruido de radio 100, con cooldown de 6 s. **El guitarrazo no les hace nada y los zombies no los atacan.** Huyen si Alexander se les acerca a menos de 24 px.

---

# v0.4 — Pixel art de primera línea (contrato del arquitecto)

Guía de arte completa: `../diseno/revision-estetica.md` (Fable). Medidas y paletas de fotos reales: `../diseno/investigacion-callao-fotos.md` (cuando exista). **Esta sección manda sobre las anteriores donde choquen.** En particular, **reemplaza la sección «Mapa»** y la orientación de tiles de «Contrato de sprites».

## Decisión del arquitecto: la avenida gira a **oeste → este**

La revisión propone la «cuadra en peine» porque, con la avenida norte–sur, los frentes de las casas quedan de canto. Se decide otra cosa: **girar el nivel**. La Gambetta va ahora de **oeste (izquierda, inicio) a este (derecha, salida al cerro)**. Motivos:
1. Las fachadas de la manzana norte **miran al sur, de frente a la cámara**: casas, tiendas y letreros se leen enteros, que es la queja principal.
2. Los vehículos van por la pista **de costado**: se ve la combi entera (franjas, ventanas, cobrador, cartel de ruta) y el tamaño frente a una persona es evidente.
3. La pantalla es 16:9: avanzando en horizontal se ven 240 px por delante en vez de 135. Mejor para ver venir a los zombies.

El resto de la revisión se mantiene: resolución 480×270, tiles de 16 px, personajes del mismo tamaño, **1 m = 16 px** en el suelo, alturas comprimidas a ~12 px/m por encima de 2,2 m, tabla de escala de la sección 2.2, regla «todo edificio se dibuja dentro de su huella», fuentes ACH5/ACH7/ACH12 y sus reglas (2.4), luz de tarde de garúa con sombras al sureste (2.5), rampas (5.2), arquetipos (3.2) y reglas de variación (3.3). Donde la revisión dice «filas» de un lote, ahora son **columnas** (ancho del lote a lo largo de la avenida).

## Mapa v0.4 (`world.js`)

**128 columnas × 46 filas** (2048 × 736 px). Corte de norte a sur:

| Filas | Contenido |
|---|---|
| 0–10 | **Manzana norte** (vitrina del nivel): lotes con fachada sur visible. Cara de 3 tiles (1 piso), 5 (2 pisos), 7 (3 pisos), 4–5 (almacén); el resto del lote, azotea. Todo sólido. |
| 11–13 | Vereda norte (postes en la fila 13, cada ~8 columnas) |
| 14 | Sardinel norte (`curbN`) |
| 15–22 | Pista norte (tránsito hacia el oeste), raya discontinua entre las filas 18–19 |
| 23–26 | Berma central (árboles de tronco blanco, palmeras) |
| 27–34 | Pista sur (tránsito hacia el este), raya entre las filas 30–31 |
| 35 | Sardinel sur (`curbS`) |
| 36–38 | Vereda sur (postes en la fila 36, desfasados 4 columnas) |
| 39–45 | **Manzana sur**: se ve desde atrás, es decir, azoteas con parapeto en su borde norte, tanques, tendales y paneles pintados sobre la azotea que miran al sur. Lotes más bajos (1–2 pisos) y algún retiro abierto (patio de contenedores). |

- **Jirones** (calles norte–sur de 4 tiles) cortan las dos manzanas en las columnas ~40–43 y ~84–87. Terminan en el borde del mapa contra una barricada (sólida). Hay cebra en cada cruce.
- **Pasajes**: 2 o 3 callejones sin salida de 3 tiles de ancho que entran a la manzana norte. Ahí se esconden zombies.
- **Inicio**: oeste, columna ~6, pista sur, junto a la combi volcada y el paradero.
- **Salida**: el extremo este (columnas ~120–127) es el pie del cerro con la **escalera pintada** (arquetipo A10, revisión 3.2). Llegar a sus tiles `stairs` es ganar.
- Los hitos de la revisión (3.3.8) se reparten de oeste a este, uno cada 15–20 columnas: paradero y combi volcada, bodega, chifa de esquina en el primer jirón, mural CALLAO (muro de almacén de 160×80 en la manzana norte), tráiler de 40 pies cruzado, botica, patio de contenedores (manzana sur), escalera pintada.
- La cantidad de zombies, sus tipos, la reaparición, los cobradores, los perros y los gallinazos se mantienen (v0.2 y v0.3), recolocados en el mapa nuevo y más densos hacia el este.
- Tiles con orientación nueva: `laneDashH` (raya horizontal), `curbN`/`curbS`, `zebraH` y `humpV` (cruzan la pista de norte a sur). Mientras `calle.js` no los entregue, el motor rota los tiles viejos con un ayudante local.

## Lotes (`world.js`, motor) y `buildLot` (sprites)

`world.js` define `LOTS`: una ficha por edificio. El motor hornea cada lote una sola vez, al cargar.

```js
{ id:'N3', side:'N'|'S', c0:30, c1:39, r0:0, r1:10,   // huella en tiles, inclusive; toda la huella es sólida
  arch:'bodega', floors:1, color:'celeste', name:'BODEGA DOÑA LUZ', seed:7302,
  damage:1|2|3, roof:['tanque','tendal'], front:['toldo','bandera','gas'] }
```

Arquetipos (`arch`): `bodega`, `ladrillo`, `pintada`, `almacen`, `taller`, `chifa`, `polleria`, `botica`, `ferreteria`, `loteObra`, `contenedores`, `oficina`, `fabrica`, `cerro`, `escalera`.

```js
ACH.sprites.buildLot(ficha) → {
  canvas,                // (c1-c0+1)*16 × (r1-r0+1)*16: azotea arriba y cara sur abajo (lado N); solo azotea con parapeto (lado S)
  over:   canvas|null,   // capa alta: toldos, letreros bandera, macetas que vuelan sobre la vereda
  overX, overY,          // px, relativos a la esquina superior izquierda del lote; over puede bajar hasta 24 px por debajo de r1
  lights: [{ x, y, kind:'local'|'cruz'|'foco' }]  // px relativos al lote: luces cálidas para el mapa de luz
}
```

- Si `ACH.sprites.buildLot` no existe, o no conoce el `arch`, el motor dibuja un bloque provisorio con la altura correcta: azotea gris más cara sur en el color de la ficha, con su nombre en ACH5 si `ACH.px` existe.
- `buildLot` es puro: no lee el mapa. Lo que necesite saber (vecino más bajo, esquina) viene en la ficha.
- Varios archivos de sprites registran arquetipos con `ACH.sprites.lotArch[arch] = function (ficha, px) {...}`. `buildLot` (en `base.js`) despacha según `arch` y envuelve el resultado.

## Archivos de sprites partidos (todos extienden `ACH.sprites`)

Orden de carga: `js/sprites/base.js` → `js/sprites.js` (personajes y arte v0.3, tal como está) → `js/sprites/calle.js` → `edificios-casas.js` → `edificios-industria.js` → `vehiculos.js` → `mobiliario.js` → `luz.js` → motor.

| Archivo | Contenido | Dueño |
|---|---|---|
| `js/sprites/base.js` | `ACH.px`: clase `G` (la de `sprites.js`, movida), `toCanvas` rápido con `ImageData` para lienzos > 64×64, `RAMPS` (hex de la revisión 5.2, más las de fotos), fuentes `a5`/`a7`/`a12` con `text(g, str, x, y, {font, ink, shadow, outline})` y `measure`, `rot90(canvas)`, `shadowSE(canvas)` (sombra proyectada violácea, 1 px a la derecha por cada 2 hacia abajo), `rng(seed)`. Además `ACH.sprites.buildLot` y `ACH.sprites.lotArch = {}`. | sprites (base) |
| `js/sprites.js` | Personajes, zombies, NPC y arte v0.3. Usa `ACH.px.G`. | sprites (personajes) |
| `js/sprites/calle.js` | Tiles de suelo nuevos y rotados, calcomanías de suelo | sprites (calle) |
| `js/sprites/edificios-casas.js` | `bodega`, `ladrillo`, `pintada`, `chifa`, `polleria`, `botica`, `ferreteria`, `cerro`, `escalera` | sprites (casas) |
| `js/sprites/edificios-industria.js` | `almacen` (con mural), `taller`, `loteObra`, `contenedores`, `oficina`, `fabrica` | sprites (industria) |
| `js/sprites/vehiculos.js` | Vehículos de la revisión 4.1, de costado, con variante `W` explícita cuando llevan texto (nunca se voltea texto), y de punta (`N`/`S`) | sprites (vehículos) |
| `js/sprites/mobiliario.js` | Postes con `lamp` y `top`, cables, afiches, paradero, semáforo, árboles, vendedores, rastros del apocalipsis | sprites (mobiliario) |
| `js/sprites/luz.js` | Sprites de foco y halo, emisivos | motor (luz) |

Las claves nuevas del contrato son las de la revisión (P0, «Claves nuevas»), más `tiles.{laneDashH, curbN, curbS, zebraH, humpV}`. Todas las claves de v0.3 siguen existiendo con su misma forma; pueden cambiar de tamaño y huella. Toda prop lleva `ax`/`ay`/`fw`/`fh`; las altas llevan además `tall:true`, para las siluetas.

## Motor

- **Capas de dibujo:** suelo horneado (tiles, calcomanías, sombras, lotes) → cadáveres → props y entidades ordenados por `y` → siluetas (alfa 0,30) de entidades tapadas por props `tall` → capa alta horneada (`over` de lotes, cables, copas) → gallinazos y Titina → niebla, garúa, mapa de luz, emisivos y viñeta → marcadores.
- **Copas de árbol** sobre Alexander: bajan a alfa 0,55 en 0,15 s.
- `ACH.debug.routeCheck()` → `{ok, steps}`: búsqueda de camino con un círculo de radio 5 desde el inicio hasta la salida. `ACH.debug.spawnCheck()` → lista de spawns, cobradores, perros y props que caen dentro de una huella. Las dos tienen que dar ok/vacío en cada entrega.
- `ACH.debug.lots()` → la tabla `LOTS`. `ACH.debug.look(x, y)` → mueve la cámara sin mover a Alexander (para capturas).
- Rendimiento: hornear todo el arte en menos de 400 ms y mantener 60 fps con 34 zombies. Prohibido dentro del bucle: `getImageData`, `shadowBlur`, `filter` y crear degradados.
- `build.sh` además genera `dist/preview.html`: la hoja de previsualización de sprites, todo a ×4 junto a Alexander y sobre una regla en metros.

## Fases y dueños de esta versión

| Fase | Trabajo | Archivos | Modelo |
|---|---|---|---|
| A1 | `base.js` (toolkit, fuentes, rampas, `buildLot`), mover `G`, archivos vacíos, `index.html`, `build.sh`, `preview.html` | `js/sprites/*`, `js/sprites.js`, `index.html`, `build.sh`, `preview.html` | Sonnet high |
| A2 | Mapa girado, `LOTS` con bloques provisorios, recolocación completa, capas, siluetas, `routeCheck`, `spawnCheck`, `look` | `js/engine/*` | Opus medium |
| B | Arte en paralelo: calle · casas · industria · vehículos · mobiliario; luz y atmósfera (P1) | un archivo por agente; luz: `render.js` + `luz.js` | Sonnet high; luz: Opus medium |
| C | Colocación final en el mundo, vida animada (P6), rastros (P7), pulido de personajes (P8) | `world.js`, `fx.js`, `sprites.js` | Sonnet high |
| D | QA completo y revisión de arte final | — | Sonnet high + Fable |

### Aclaraciones del arquitecto (después de A1)
- **Cada arquetipo dibuja sus dos lados.** El archivo dueño del `arch` resuelve `side:'N'` (cara sur completa + azotea) y `side:'S'` (solo azotea con parapeto en el borde norte, paneles pintados que miran al sur). Las piezas comunes de azotea (tanque, fierros con botellas, tendal, bidones, antena, ruma de ladrillos) se publican en `ACH.px.roofKit` desde `edificios-casas.js` y las usa también `edificios-industria.js` (si aún no existe, cada uno dibuja las suyas).
- **Los vehículos y el mobiliario nuevos reemplazan las claves viejas** en `ACH.sprites.props` (sus archivos cargan después de `sprites.js`), con su misma forma (lienzo o arreglo de lienzos con `ax/ay/fw/fh`), al tamaño nuevo y con `tall:true` cuando corresponda.
- **Medidas:** manda la tabla 2.2 de la revisión (con la compresión de alturas por encima de 2,2 m). Las fotos (`investigacion-callao-fotos.md`) mandan en colores, materiales, siluetas y detalles. Si una medida de las fotos difiere más de 20 % de la tabla, se usa el promedio y se anota.
- **Verificación visual:** la hoja `dist/preview.html` (generada por `sh build.sh`). Si el navegador integrado se niega a abrir `file://`, se levanta un servidor estático local en 127.0.0.1 con lo que haya en la Mac y se apaga al terminar.

---

# v0.5 — Música y sonido (contrato del arquitecto)

**Decisión del dueño:** música **mezcla según la acción**: **chicha/cumbia psicodélica** mientras se explora, **salsa brava chalaca** cuando te persiguen y en la horda. Todo **sintetizado en el navegador** con Web Audio, buscando un sonido realista (guitarras punteadas tipo Karplus-Strong, percusión modelada, voces de zombie con formantes). Sin archivos de audio, sin librerías, sin canciones ni melodías reales: todo es composición original. Sigue siendo un solo archivo.

## Archivos y dueños

| Archivo | Contenido | Dueño |
|---|---|---|
| `js/audio/motor.js` | `AudioContext`, desbloqueo con la primera tecla o clic, buses, limitador, reverb, paneo y atenuación por distancia, límite de voces, `emit`, volumen, silencio, guardado de preferencias | motor de audio |
| `js/audio/sfx.js` | `ACH.audio.lib` (sintes compartidos) y `ACH.audio.recipes` (un sonido por evento) y `ACH.audio.amb` (capas de ambiente) | diseño de sonido |
| `js/audio/musica.js` | `ACH.audio.musicEngine`: secuenciador con programación anticipada, instrumentos y composiciones | compositor |
| ganchos en `js/engine/*.js`, `index.html`, `css/game.css` | llamadas a `emit`, intensidad de la música, controles de volumen en la pausa | motor de audio |

Orden de carga: después de los sprites y antes del motor del juego: `js/audio/sfx.js` → `js/audio/musica.js` → `js/audio/motor.js`. Cada archivo arranca con `var A = ACH.audio = ACH.audio || {};` y no asume a los otros al cargar (solo al sonar).

## API

```js
ACH.audio = {
  ctx,                         // AudioContext; null hasta el desbloqueo
  bus: { master, music, sfx, amb },   // GainNode; master → compresor/limitador → destination
  reverbSend,                  // GainNode que entra a un ConvolverNode (IR generado: calle húmeda, ~1,2 s)
  emit(name, data),            // data opcional: {x, y (mundo px), ...extras}. Sin ctx → no hace nada.
  setListener(x, y),           // centro de la cámara, cada cuadro
  setVolume(bus, v), mute(on), muted(),
  music: { setMood(m), setIntensity(v), stinger(name) },  // reenvía a musicEngine
  lib: {...}, recipes: {...}, amb: {...}, musicEngine: {...}
};

// sfx.js
ACH.audio.recipes[name] = function (ctx, out, data, lib) { ... return optionalStopFn; };
//   out: nodo ya paneado y atenuado por el motor; conectar ahí. Programar desde ctx.currentTime.
ACH.audio.amb = { start(ctx, out, lib) → { setRain(v), setWind(v), lampBuzz(x,y,on) ..., stop() } };

// musica.js
ACH.audio.musicEngine = {
  start(ctx, out, reverbSend), // arranca el secuenciador (lookahead ~0,1 s, setInterval 25 ms)
  setMood(m),        // 'title' | 'explore' | 'chase' | 'horde' | 'paused' | 'dead' | 'won'
  setIntensity(v),   // 0..1 dentro del ánimo: suma o quita capas
  stinger(name),     // 'kill' | 'hurt' | 'horde' | 'death' | 'win' | 'cobrador' (frase corta encima de la música)
  stop()
};
```

**Posición:** el motor convierte `x, y` en paneo estéreo (−1 a 1 en ±260 px del centro) y ganancia (1 hasta 120 px, 0 a 420 px, curva suave). Sin `x, y` el sonido es centrado y a ganancia 1.
**Voces:** máximo 24 a la vez; si se pasa, se descarta la más vieja de menor prioridad. Un mismo evento no se repite antes de su `cooldown` (lo define la receta con `recipes[name].cooldown` en segundos, por defecto 0,03).

## Eventos (los emite el motor del juego)

| Evento | Cuándo | Datos |
|---|---|---|
| `ui.move`, `ui.ok`, `ui.back` | menús | — |
| `game.start`, `game.pause`, `game.resume` | estados | — |
| `step` | cada paso de Alexander (2 por ciclo de caminar) | `x,y, surface:'asfalto'|'vereda'|'berma'|'tierra'|'escalera', run` |
| `swing` | inicio del guitarrazo | `x,y, dir` |
| `hit` | el golpe conecta | `x,y, type, killed, combo` (combo = golpes en el mismo swing) |
| `whiff` | swing sin conectar | `x,y` |
| `kill` | zombie muere | `x,y, type` |
| `zombie.idle` | gemido ocasional (el motor del juego sortea, máx. 1 cada 0,7 s en pantalla) | `x,y, type` |
| `zombie.alert` | pasa a perseguir | `x,y, type` |
| `zombie.lunge`, `zombie.bite` | embestida, mordida | `x,y, type` |
| `player.hurt` | recibe daño | `x,y, hp` |
| `player.exhausted`, `player.recovered` | latch de agotamiento | — |
| `player.death`, `player.respawn` | | |
| `titina.launch`, `titina.coo`, `titina.return`, `titina.grabbed` | | `x,y` |
| `cobrador.shout` | «¡AL FONDO HAY SITIO!» (voz sintética que balbucea con entonación de grito, no texto hablado) | `x,y` |
| `dog.bark`, `dog.whine` | | `x,y` |
| `birds.fly` | gallinazos salen volando | `x,y, n` |
| `horde` | «¡Se viene la mancha!» | — |
| `noise` | ruido de juego (radio) — solo para mezcla, sin sonido propio | `x,y, r` |
| `win` | llega a la escalera | — |

**Ambiente** (`amb`): garúa (siempre, suave), viento en ráfagas (sincronizado con `CFG.fx.ambGust` si se puede), ciudad muerta lejana (alarma de auto lejana muy de vez en cuando, perro lejano, chapa que golpea), zumbido de los postes de sodio cercanos y de la cruz de la botica, moscas cerca de basura. El ambiente baja 6 dB en `chase` y `horde`.

**Música:**
- `title`: tema chicha lento con guitarra con trémolo y eco, ~90 bpm.
- `explore`: cumbia chicha ~96 bpm. Capas por intensidad: (0) güiro + bajo + guitarra rítmica apagada; (0,5) + melodía de guitarra punteada con wah; (1) + timbal y campana.
- `chase`: **salsa brava** ~190 bpm (clave 2-3): tumbao de bajo, montuno de piano, congas, cencerro; con intensidad, mambo de trompetas y trombón.
- `horde`: el `chase` a fondo con coro de metales y timbal en fill.
- Transiciones **en el siguiente compás**, con fill de timbal; la tonalidad se comparte (o se modula con una frase puente) para que el cambio cumbia ↔ salsa suene musical, no a corte.
- `paused`: filtro paso bajo y −10 dB. `dead`: frase triste de guitarra sola y silencio. `won`: cierre en fiesta, mezcla de ambos estilos.
- Melodías chalacas originales y pegajosas, con identidad propia: no copiar melodías ni riffs reconocibles.

**Intensidad** (lo calcula el motor del juego cada 0,5 s): `chasing` = zombies en `perseguir` o `atacar` a menos de 300 px. 0 → `explore`; 1–3 → `chase` con intensidad `chasing/4`; 4+ o toast de horda en los últimos 8 s → `horde`. Para volver a `explore`, 4 s sin perseguidores (histéresis).

**Mezcla y límites:** la música va 6 dB por debajo de los efectos de combate; el `hit` es lo más presente de la mezcla. Nada satura el limitador más de 3 dB. CPU de audio por debajo de lo que baje los 60 fps; las capas de ambiente usan buffers de ruido precalculados.

**Controles:** tecla **M** = silencio total. En la pantalla de pausa: tres deslizadores (Música, Efectos, Ambiente) con estilo chicha, guardados en `localStorage` dentro de `try/catch`. Pausa automática por foco → `game.pause`. Volúmenes por defecto: master 0,8, música 0,55, efectos 0,9, ambiente 0,6.

**Debug:** `ACH.debug.audio()` → `{state, mood, intensity, voices, muted}`; `ACH.debug.sfx(name, data)` y `ACH.debug.mood(m, intensity)` para escuchar cualquier cosa sin jugar.

**Verificación sin oídos:** cada receta y cada ánimo musical se puede renderizar con `OfflineAudioContext`; se comprueba que no hay NaN, que el pico no pasa de −1 dBFS, que el RMS está en rango y que la duración es la esperada. El oído final es el del dueño.

---

# v0.6 — El barrio reacciona: objetos, botín, resortera, letreros reales, frases y vida social

Decisiones del dueño (2026-11-18):
- **Marcas reales con interruptor.** Cristal, Pilsen Callao, Inca Kola, etc., pintadas a mano como en las bodegas. Un solo ajuste las cambia por parodias.
- **Voces con la voz del navegador** (`speechSynthesis`, en español), con todo listo para cambiarlas después por grabaciones.
- **Resortera con el mouse:** se apunta, se mantiene el clic para tensar y se suelta. El tiro va en arco y se curva si mueves el mouse mientras cargas.
- **Reaccionan:** gatos (huyen y se esconden), autos (se destruyen), basura y bolsas, carretillas de vendedores, perros (chillan y huyen, sin daño), vidrios, postes y semáforos.
- **Vida social:** una orquesta de salsa de zombies tocando en vivo en una esquina, alguien cantando en una ventana y siluetas de zombies que se mueven dentro de las casas.

Investigación de letreros y frases: `../diseno/letreros-y-frases-callao.md` (en curso).

## Archivos nuevos y dueños

| Archivo | Contenido | Dueño |
|---|---|---|
| `js/engine/interaccion.js` | Objetos rompibles, daño a props, gatos, perros golpeados, proyectiles (piedras) | jugabilidad |
| `js/engine/inventario.js` | Botín, objetos en el suelo, mochila, barra rápida, uso de objetos, interfaz de inventario | inventario |
| `js/engine/social.js` | Orquesta zombie, cantante en la ventana, siluetas en ventanas | vida social |
| `js/sprites/marcas.js` | Interruptor `ACH.cfg.marcasReales` y catálogo `ACH.px.marca(id)` → `{texto, colores, estilo}` | letreros |
| `js/sprites/letreros.js` | Letreros, avisos pintados, placas y stickers, usando `marcas.js` | letreros |
| `js/sprites/objetos.js` | Íconos de ítems, piedras, resortera, gatos, orquesta, estados rotos de basura y carretillas | sprites de objetos |
| `js/audio/voces.js` | Frases: `ACH.audio.say(id \| texto, {who, x, y})` con `speechSynthesis` y reemplazo por grabaciones | voces |

Los archivos existentes reciben cambios **solo de su dueño de esta fase**, según la tabla de fases del final.

## Objetos que reaccionan (`interaccion.js`)

El guitarrazo y las piedras golpean **props**, no solo zombies. Se agrega `ACH.inter.hitProps(G, x, y, r, dmg, src)`, que `swingHit` llama con el mismo arco del golpe.

| Prop | Golpes | Qué pasa |
|---|---|---|
| `carVar`, `tico`, `mototaxiVar`, `combiE/W/N/S`, `custer` | 4 / 4 / 3 / 6 / 8 | Estados de daño 0→3: abolladura y luna rajada → lunas rotas y faro colgando → chatarra humeante. Cada golpe hace ruido de radio 120. El primer golpe tiene 40 % de probabilidad de **alarma** (ruido de radio 280 durante 6 s, luces intermitentes): atrae zombies. Al destruirse suelta botín de guantera. La huella **no cambia**. |
| tráiler, contenedor, tracto | — | Indestructibles: suenan a chapa y solo hacen ruido. |
| `trash`, `bags`, `bolsas` | 1–2 | Se vuelcan o se rompen (estado `broken`), con basura regada. 30 % de probabilidad de botín. La huella puede achicarse. |
| `emoliente`, `anticuchos`, `quiosco`, `triciclo` | 3 | Se rompen una sola vez y sueltan comida o bebida (curación). |
| postes, `posteLuz`, `semaforo` | 2 | Chispas, el foco parpadea y se apaga (se quita la luz del mapa de luz). Ruido de radio 140. |
| vidrios sueltos (calcomanía `vidrio`) | — | Si Alexander corre encima, crujen: ruido de radio 60. |

**Perros:** si les pegas, no reciben daño. Chillan (`dog.yelp`), huyen corriendo 2 s y quedan **desconfiados**: ya no ladran para avisar y se alejan de Alexander.

**Gatos** (`npc.gato`, nuevo, de 3 a 6 en el nivel): duermen en azoteas bajas, en el borde de la vereda, bajo autos o sobre contenedores. Animaciones: sentado, lamerse, caminar y correr, más un estado `escondido` en el que solo se ven los ojos brillando bajo un auto o en un pasaje. Si Alexander les pega, corre a menos de 40 px o hay un zombie cerca, maúllan o bufan y **corren al escondite más cercano** (debajo de un auto, al fondo de un pasaje o saltando a una azotea). Salen al rato. Nunca reciben daño.

## Botín y mochila (`inventario.js`)

- Al morir, un zombie suelta objetos según su tabla. Quedan en el suelo como íconos que rebotan, brillan y llevan sombra. **Se recogen al pasar por encima** (después de 0,3 s), con un texto flotante «+1 piedras».
- **Mochila:** 12 casillas con apilado. La tecla **I** o **Tab** abre la mochila (pausa el juego). Panel estilo afiche chicha con la cuadrícula, nombre, descripción en jerga chalaca y botón «Usar». **1–4** usan las casillas rápidas (barra pequeña en el HUD).
- Con la mochila llena, toast «¡Ya no entra nada, causa!».

| Ítem | Apila | Efecto |
|---|---|---|
| `piedras` | 40 | Munición de la resortera. También salen de la berma y de la basura. |
| `resortera` | 1 | Arma. Desbloquea el clic. |
| `panChicharron` | 3 | +30 vida |
| `anticucho` | 5 | +15 vida |
| `emoliente` | 3 | +10 vida y llena el aliento |
| `gaseosa` | 5 | Llena el aliento. Su texto y su etiqueta vienen de `marcas.js` (amarilla tipo Inca Kola). |
| `curitas` | 5 | +20 vida |
| `sencillo` | 999 | Monedas. Sirven para el futuro: se ven en el HUD |
| `cuerdas` | 10 | Cuerdas de guitarra. Se juntan para el taller (futuro) |
| `llavesCombi` | 1 | Objeto de historia con chiste («¿Y la combi, causa?») |
| `estampita` | 1 | Objeto de historia |

**Tablas de botín:**
- caminante: sencillo 60 %, piedras 30 %, anticucho 10 %.
- escolar: piedras 60 %, gaseosa 20 %, curitas 15 %.
- ciego: sencillo y cuerdas.
- cobrador: sencillo 100 % (×5–15) y llavesCombi 10 %.
- **escolar con resortera** (2 en el nivel, la llevan visible en la mano): resortera 100 % más piedras ×10.

## Resortera (`interaccion.js` + `game.js`)

- Requiere la resortera en la mochila y al menos 1 piedra. **El espacio sigue siendo el guitarrazo.** El **clic izquierdo** carga y dispara (si no hay resortera, el clic no hace nada).
- **Apuntar:** la posición del mouse en el mundo. Mientras cargas, Alexander mira hacia el mouse y usa la pose `alex.<v>.sling[dir][2]` (estirar y soltar). Al cargar camina a 60 % de velocidad.
- **Carga:** 0 → 1 en 0,8 s. El alcance va de 60 a 280 px según la carga, sin pasar del punto del mouse si está más cerca.
- **Arco:** la piedra tiene altura `z` con parábola (sube y baja) y su sombra en el suelo. Solo golpea cerca del suelo (z < 14).
- **Curva:** el movimiento del mouse **perpendicular** a la mira durante la carga se acumula como efecto (límite ±1). En vuelo, la piedra recibe una aceleración lateral proporcional al efecto, como un tiro con chanfle: puede rodear un auto.
- Mientras cargas se dibuja la **trayectoria prevista** con puntos (un arco curvo).
- **Impacto en zombie:** 1 de daño, aturde 0,25 s y empuja un poco. **Impacto en prop:** daño de prop 0,5 (rompe vidrios). **Al caer:** ruido de radio 70, que sirve para **distraer zombies**. La piedra queda en el suelo y se puede recoger con 50 % de probabilidad.
- Recarga entre tiros: 0,35 s. Texto flotante en el impacto: «¡TOC!» o «¡PLAF!».

## Vida social (`social.js`)

1. **La orquesta zombie:** 5 zombies «de oficio» tocan salsa en vivo frente al chifa o en el primer jirón, sobre una tarima de jabas con un foco colgando: timbalero, conguero, trompetista, bajista y cantante. Tocan en loop y animados (2–4 cuadros por músico).
   - **Música diegética:** desde ahí suena un arreglo de salsa con fuente posicional (más fuerte al acercarse). Cerca de la orquesta, la banda sonora baja y se mezcla con ellos. Lo pide `musica.js` vía `ACH.audio.musicEngine.diegetic(x, y, on)`.
   - **Son pacíficos mientras nadie los toque.** Si les pegas (o les cae una piedra), dejan de tocar y pasan a perseguir. La música se corta con un acorde desafinado.
   - Si sobreviven y te alejas, vuelven a tocar después de 20 s.
2. **Cantante en la ventana:** en un segundo piso, una zombie canta un bolero o una salsa lenta con un foco cálido. Es un sprite animado en la ventana de un lote (ventana elegida por `lotsBaked`). Se oye una voz con formantes y vibrato, sin palabras reales, con fuente posicional.
3. **Siluetas en ventanas iluminadas:** sombras de zombies que caminan o se balancean detrás de 3 a 5 ventanas encendidas. Solo dibujo, en la capa de los lotes, recortadas al rectángulo de la ventana.
4. Dos o tres zombies **bailando** frente a la orquesta: un caminante con cuadros de baile. Si los atacas, pelean.

## Letreros reales (`marcas.js`, `letreros.js`)

- `ACH.cfg.marcasReales = true` por defecto. **Todo** texto de marca se pide a `ACH.px.marca(id)`: nadie escribe una marca directo en otro archivo.
- Estilo **pintado a mano y pixelado**, como los avisos de bodega, no una copia exacta del logo oficial: los colores y la tipografía evocan la marca.
- Los letreros cubren las fachadas según la guía de colocación de la investigación. Se dibujan en los lotes (bandas, paredes laterales pintadas, toldos con marca, cajas de luz de pollería) y en los props (postes con avisos y stickers, paraderos, combis con stickers en la luna y placa de ruta). En las esquinas van placas azules con nombre de calle.
- Las fachadas actuales se rehacen en las bandas de letrero y las paredes pintadas: bodega con «CRISTAL» o «PILSEN CALLAO», pollería con caja de luz, chifa, cevichería, avisos de «HAY CHELA HELADA», «YAPE AQUÍ», «RECARGAS», «MENÚ S/ 10».
- **Señales:** PARE, ZONA RÍGIDA, NO ESTACIONAR, PARADERO y PROHIBIDO ARROJAR BASURA, como props de poste con su propio sprite.

## Frases chalacas (`voces.js`)

- `ACH.audio.say(id, {who:'alex'|'zombie'|'cobrador'|'vecino', x, y})`.
  - Elige una variante y la dice con `speechSynthesis`: busca una voz `es-PE`, luego cualquier `es-*` latina, luego cualquier voz en español. Ajusta `rate` y `pitch` por personaje.
  - Al mismo tiempo **muestra la frase como globo de texto** (fuente pixel) sobre quien habla, durante 1,5 s.
- **Grabaciones:** si existe `ACH.audio.voiceClips[id]` (un AudioBuffer o una data URL), se usa en vez de la voz sintética.
- Límite: una frase cada 2,5 s como mínimo. Probabilidad de 35 % por golpe y de 70 % por muerte, auto destruido o botín raro.
- Durante una frase, la música baja 4 dB. Nuevo deslizador «Voces» en la pausa, con su propio interruptor.
- **Eventos con frase:** golpe, matar, recibir daño, poca vida, recoger botín, romper un auto, alarma de auto, gato que huye, perro golpeado, encontrar la resortera, disparar, ganar.
- El cobrador zombie dice «¡Al fondo hay sitio!» con voz sintética rota (más grave y lenta), además de su balbuceo.
- La lista de frases sale de la investigación; mientras no llegue, se usan: «¡Ya pe!», «¡No te pases!», «¡Fuera, causa!», «¡Chalaco nomás!», «¡Al toque!», «¡Ay, mamita!», «¡Esto es mío, compare!».

## Eventos de audio nuevos (`sfx.js`)

`prop.hit.metal`, `prop.hit.glass`, `prop.break.car`, `car.alarm` (en loop mientras dura), `prop.break.trash`, `prop.break.cart`, `pole.spark`, `glass.crunch`, `dog.yelp`, `cat.meow`, `cat.hiss`, `cat.run`, `sling.stretch` (loop mientras carga), `sling.release`, `stone.hit.zombie`, `stone.hit.metal`, `stone.land`, `loot.drop`, `loot.pickup`, `loot.coins`, `inv.open`, `inv.close`, `item.eat`, `item.drink`, `bag.full`, `singer.window` (voz posicional en loop).

## Debug

- `ACH.debug.give(item, n)`
- `ACH.debug.inv()`
- `ACH.debug.cats()`
- `ACH.debug.props()`: estado de daño de cada prop
- `ACH.debug.marcas(on)`: cambia el interruptor y vuelve a hornear
- `ACH.debug.say(id)`

## Fases y dueños de v0.6

| Fase | Trabajo | Archivos | Modelo |
|---|---|---|---|
| F1 | Interacción, proyectiles, gatos, perros, alarmas, ganchos de golpe | `interaccion.js` (nuevo), `entities.js`, `game.js`, `render.js`, `world.js` | Opus medium |
| F2 | Botín, mochila, barra rápida, interfaz, ítems | `inventario.js` (nuevo), `hud.js`, `css/game.css`, `index.html` | Sonnet high |
| F3 | Sprites de objetos, gatos, ítems, resortera, pose `sling`, estados de daño de vehículos (`dmg`) y de basura y carretillas (`broken`), músicos y bailarines zombie | `objetos.js` (nuevo), `sprites.js`, `vehiculos.js`, `mobiliario.js` | Sonnet high |
| F4 | Audio: efectos nuevos y voces | `sfx.js`, `voces.js` (nuevo), `motor.js` | Sonnet high |
| F5 | Música diegética de la orquesta, cantante | `musica.js` | Opus medium |
| F6 | Letreros reales y señales (después de la investigación) | `marcas.js`, `letreros.js` (nuevos), `edificios-casas.js`, `edificios-industria.js` | Sonnet high |
| F7 | Vida social y colocación final de todo | `social.js` (nuevo), `world.js` | Sonnet high (después de F1–F6) |

**Contrato de sprites nuevo (F3):**
- **Vehículos:** cada lienzo de vehículo rompible lleva `.dmg = [c1, c2, c3]`, del mismo tamaño y ancla.
- **Basura y carretillas:** llevan `.broken`.
- **Gatos:** `ACH.sprites.npc.gato = {sit:[2], lick:[3], walk:{left:[4],right:[4]}, run:{left:[4],right:[4]}, hide:[2]}` (~14×10; `hide` son solo ojos y una cola).
- **Ítems:** `ACH.sprites.items[id]` = ícono de 12×12 (para el suelo y la mochila) más `items[id].big` de 24×24 para la interfaz.
- `ACH.sprites.fx.piedra` (4×4) y su sombra.
- **Alexander:** `ACH.sprites.alex.<v>.sling[dir] = [estirar, soltar]`, con el mismo tamaño de lienzo que `attack`.
- **Zombie escolar con resortera visible:** `ACH.sprites.zombie.escolarSling`, con la misma forma que `escolar`.
- **Orquesta:** `ACH.sprites.zombie.musico = {timbal:[4], conga:[4], trompeta:[4], bajo:[4], cantante:[4]}` y `zombie.baile:[4]`.
- **Escenario:** `props.tarima` (jabas con foco).
- **Ventanas:** `ACH.sprites.fx.cantanteVentana:[4]` y `fx.siluetaVentana:[4]`.
- **Señales** (las dibuja F6): `props.senal[n]`.

## v0.6b — Zombies variados (pedido del dueño)

Hoy los zombies se ven y se mueven todos igual. Desde ahora cada zombie tiene **cuerpo**, **atuendo** y **forma de moverse** propios.

**Alturas:** bajo (~24 px), normal (~28) y alto (~34). Se dibujan con otra proporción, nunca escalando el pixel art.

**Atuendos** (paleta más llamativa, contra el gris): chaleco reflectivo verde fosforescente, uniforme blanco de enfermera o cocinero, buzo de colegio, polo amarillo de delivery (sin marca), casaca roja, camisa floreada, overol azul de estibador del puerto, terno viejo, short y bividí. Cada zombie combina un cuerpo, un atuendo y la variación de piel y pelo.

**Formas de moverse:**

| `loco` | Cómo se mueve | Juego |
|---|---|---|
| `camina` | Arrastra los pies, como hoy | Base |
| `cojo` | Salta en un pie: impulso y pausa | Rápido en el impulso, vulnerable en la pausa |
| `muletas` | Lento y constante, con el «toc» de las muletas | Las muletas dan alcance extra al morder |
| `silla` | Silla de ruedas: acelera en recta, gira amplio, tiene inercia | Rápido en la pista. Si lo golpeas, la silla sale rodando y el zombie queda `gusano` |
| `gusano` | Se arrastra por el suelo | Muy lento y bajo: se mete bajo los autos. El arco de la piedra lo esquiva salvo que caiga cerca |
| `cuatro` | En cuatro patas, a saltos | Muy rápido, con embestida larga, poca vida |
| `skate` | En skateboard: inercia alta y giros amplios | Rapidísimo en recta. Golpeado, sale despedido y la tabla sigue sola (prop que rueda) |
| `bici` | En bicicleta: solo por la pista, en línea | Rapidísimo, choca con los props. Golpeado, cae y queda `camina` |
| `carretilla` | Empuja una carretilla de mercado | La carretilla es un **escudo**: los golpes de frente rebotan («¡CLANG!»). Hay que flanquearlo o atacar por detrás. Suelta botín de mercado |
| `cantor` | Camina cantando (voz posicional) | Cada 4 s emite ruido de radio 90: atrae y agrupa a otros zombies. Si lo matas, la mancha se dispersa |

**Reparto en el nivel:** unos 40 % `camina` y el resto mezclado. Los `bici` y `skate` en la pista, los `carretilla` cerca del mercado y las bodegas, los `gusano` bajo los autos y en los pasajes, y uno o dos `cantor` por cuadra. Los tipos actuales (caminante, escolar, ciego, cobrador) se mantienen como **comportamiento**; el cuerpo, el atuendo y el `loco` se suman encima.

**Contrato:**
- **Sprites:** el nuevo archivo `js/sprites/zombies.js` (dueño F8s) genera los cuerpos de forma modular y publica `ACH.sprites.zvar[skin]`. La clave es `skin = loco + '_' + cuerpo + '_' + atuendo`, o un subconjunto horneado (unas 40 combinaciones). Cada una tiene la forma `{ move:[n], hurt:[n], dead, extra? }`, con `ax/ay` en los pies.
  - `skate` y `bici` incluyen el vehículo en el sprite y publican el vehículo suelto (`props.skateSuelto`, `props.biciCaida`).
  - `carretilla` incluye la carretilla.
  - `silla` publica la silla vacía (`props.sillaRuedas`).
  - Además, `zombie.escolarSling` (escolar con resortera visible) pasa a este archivo.
- **Motor:** el nuevo archivo `js/engine/zombies.js` (dueño F8e) publica `ACH.zvar`:
  - `assign(z, rng)`: elige `skin`, `loco` y `height` al crear un zombie.
  - `move(G, z, dt, want)`: aplica la forma de moverse a la velocidad y dirección que pide la IA (`want = {vx, vy}`).
  - `onHit(G, z, fromX, fromY)`: devuelve `'block'` si la carretilla protege; si no, cambia el estado (cae de la bici o del skate y suelta el vehículo).
  - `update(G, dt)`: el ruido del cantor.
  - `frame(z)`: devuelve el lienzo que toca.
- **Ganchos que F1 agrega en `entities.js` y `render.js`** (solo estas líneas):
  - Al crear un zombie: `if (ACH.zvar) ACH.zvar.assign(z, rng)`.
  - En el movimiento: `if (ACH.zvar && ACH.zvar.move(G, z, dt, want)) { /* zvar movió */ } else { /* movimiento normal */ }`.
  - En `hitZombie`: `if (ACH.zvar && ACH.zvar.onHit(G, z, p.x, p.y) === 'block') { /* rebote, sin daño */ return; }`.
  - En la actualización general: `if (ACH.zvar) ACH.zvar.update(G, dt)`.
  - En `render.js`, el lienzo de un zombie es `(ACH.zvar && ACH.zvar.frame(z)) || <lo de hoy>`.
- **Audio** (F4): `zombie.hop`, `zombie.crutch`, `zombie.wheel` (rodando en loop), `zombie.crawl`, `zombie.skate` (rodando en loop), `zombie.bike` (cadena y timbre), `zombie.cart` (ruedas y chirrido), `shield.clang`, `zombie.sing` (voz posicional en loop) y `vehicle.fall`.

| Fase | Trabajo | Archivos | Modelo |
|---|---|---|---|
| F8s | Sprites de zombies variados | `js/sprites/zombies.js` (nuevo) | Sonnet high |
| F8e | Formas de moverse y escudos | `js/engine/zombies.js` (nuevo) | Opus medium |

---

# v0.8 — Armas de la calle, la noche y la comida (pedido del dueño)

El dueño pidió, en sus palabras: la guitarra se gasta y se rompe, y después solo quedan puñetes débiles; agarrar el skate de un zombie para pegar y lanzarlo; lanzar la bici o la moto a toda velocidad contra los zombies; patear la carretilla; que en algún momento anochezca y los zombies vayan al doble; la Inca Kola da más aliento; la **Cola Inglesa** te hace invisible 10 s; carretillas de comida (anticucho, papa con huevo, choclo con queso) que curan o a veces caen mal, con una frase peruana.

## 1. La guitarra se gasta (`armas.js`, nuevo)
- `p.guitar = { dur: 60, max: 60 }`. Cada guitarrazo que **conecta** cuesta 1 de durabilidad. Contra el escudo de la carretilla o contra un auto o poste cuesta 2. Un swing al aire no cuesta nada.
- **Estados visibles:** sana (> 66 %), rajada (> 33 %), muy rajada (> 0) y rota. En el HUD, junto a la vida, va un ícono de guitarra con una barrita de durabilidad (verde, amarilla, roja).
- **Avisos:**
  - Al bajar a 33 % y a 10 %, un toast y una frase: «¡La viola ya no aguanta!».
  - Al romperse: crujido (`guitar.break`), astillas, la frase «¡Nooo, mi guitarra!», y la guitarra rota queda tirada en el piso como decal.
- **Sin guitarra se pelea a puñetes.** Usa la misma tecla o botón:
  - daño 0.34, así que un caminante de 2 de vida necesita 6 puñetes;
  - alcance 14 px, arco 70°;
  - empuje 12;
  - enfriamiento 0.22 s, cuesta 4 de aliento, ruido 40.
  - Los zombies `cuatro`, `skate` y `bici`, que tienen 1 de vida, caen en 3 puñetes.
- **Reparar:** el objeto `cuerdas` (ya existe) devuelve +15 de durabilidad si la guitarra no está rota. Si está rota, no sirve: «Ya no hay cuerda que la salve».
- Al **morir** y despertar en la base, la guitarra vuelve sana (Alexander tiene repuesto en el cuarto de la azotea).
- **Debug:** `ACH.debug.guitar(n)` fija la durabilidad.

## 2. Armas de la calle: agarrar, pegar, lanzar (`armas.js`)
Hay dos teclas nuevas: **E** = agarrar / usar lo que está cerca, y **F** = lanzar o patear lo que llevas. En táctil aparece un botón contextual (**AGARRAR**, **LANZAR** o **PATEAR**) encima de GUITARRAZO, solo cuando hay algo cerca o en la mano. Cuando hay algo a menos de 18 px, sale un aviso flotante pequeño («E agarrar skate»).

Alexander lleva **una sola cosa en la mano** (`p.held = {id, dur}`). Mientras la lleva, el golpe usa esa cosa en vez de la guitarra (la guitarra no se gasta). Para soltarla sin lanzar: E de nuevo.

| Objeto | Cómo aparece | En la mano (golpe) | Lanzar o patear (F) |
|---|---|---|---|
| `skate` | Tabla suelta (`props.skateSuelto`) cuando un zombie skater cae o muere | Daño 1, alcance 22, arco 100°, durabilidad 15 golpes. Al acabarse se parte en dos | Sale rodando por el suelo a 260 px/s en la dirección que miras, con fricción. Golpea a **todos** los zombies en la línea (daño 2, empuje 60). Queda en el suelo y se puede volver a agarrar |
| `bici` | Bici caída (`props.biciCaida`) | No se lleva en la mano: E + F = la empujas | Sale disparada a 300 px/s. Daño 2 y empuje 80 a cada zombie que toca, y se frena con cada choque. Al pararse queda tirada, y se puede volver a lanzar |
| `moto` | Moto caída (`props.motoCaida`) de un zombie **repartidor en moto** (nuevo `loco: 'moto'`, ver 6) | No se lleva | E + F = la sueltas acelerando: 380 px/s con sonido de motor. Daño 3 y empuje 120, atraviesa hasta 5 zombies, y al chocar contra algo sólido hace un **choque grande**: chispas, ruido 200 que atrae zombies, y queda destrozada (no se reutiliza) |
| `carretilla` | Carretilla suelta (`props.carretillaSuelta`) cuando muere un zombie de carretilla | No se lleva | **Patada:** sale a 240 px/s, daño 2, empuje 70, y al frenar riega su carga como botín (fruta, `sencillo`). Se puede patear 3 veces y luego se voltea (`.broken`) |

- Los lanzamientos usan el sistema de proyectiles en el suelo (como la piedra, pero con `z = 0`). Respetan los sólidos y rebotan apenas contra las paredes. Emiten `throw.<id>` al lanzar y `hit.<id>` al golpear.
- Todos los objetos sueltos son **props móviles** registrados en `ACH.armas.loose[]`: `{id, x, y, vx, vy, dur, state}`. Se dibujan en el y-sort. El motor de zombies (`zombies.js`) ya suelta skate, bici y silla: `ACH.armas.spawnLoose(id, x, y, vx, vy)` es la API única para crearlos. `zombies.js` llama ahí en vez de llevar su lista propia; si `ACH.armas` no existe, sigue con la suya.
- **Debug:** `ACH.debug.spawnLoose(id)` crea un objeto suelto a los pies de Alexander.

## 3. La noche (`noche.js`, nuevo)
- El nivel empieza al atardecer, como hoy. **Anochece** a los 5 minutos de juego, o al cruzar el segundo jirón (`x > 84*16`), lo que pase primero. Es una sola vez por partida y se reinicia al morir. Si mueres de noche, despiertas de noche, pero con 10 s de gracia antes de que los zombies vuelvan a la doble velocidad.
- **Transición de 20 s:** el ambiente del mapa de luz baja hasta oscuro (los postes y letreros encendidos destacan más), la niebla toma tinte azul, se encienden más ventanas, y la música pasa a una variante nocturna (`musicEngine.setNight(true)`).
- Aviso grande al empezar, estilo afiche chicha: «SE HIZO DE NOCHE… ¡LOS MUERTOS SE PONEN ACHORADOS!», con el sonido `night.fall`.
- **De noche:**
  - los zombies van al **doble**: `ACH.noche.zMul()` vale 2.0 al perseguir y 1.5 al deambular;
  - ven 20 % menos, pero oyen 30 % más.
  - Lo aplican dos ganchos de una línea, que pone el dueño de `entities.js` y `zombies.js`.
  - Alexander no cambia.
- **Debug:** `ACH.debug.night(true|false)` hace la transición al instante, y `ACH.noche.t` va de 0 a 1.

## 4. Bebidas (`inventario.js`)
- **Inca Kola** (el objeto `gaseosa`; el texto de la marca sale de `marcas.js`: INCA KOLA, o INTI KOLA en modo parodia): llena el aliento **y** da «subidón» durante 25 s, con regeneración de aliento ×2.5 y correr que gasta 40 % menos. Hay más en neveras y bodegas, y es más común de noche. En el HUD, el subidón se ve con un ícono amarillo y una cuenta atrás.
- **Cola Inglesa** (nuevo `colaInglesa`): es una gaseosa peruana real, roja. En `marcas.js`: `cola_inglesa`, texto real «COLA INGLESA», parodia «COLA GRINGA».
  - Hace a Alexander **invisible 10 s** (`p.invisT = 10`). Los zombies pierden el objetivo, no lo ven ni lo huelen y deambulan.
  - Solo lo descubre si los toca o si hace ruido fuerte: un golpe que conecta, una alarma o una moto rompen la invisibilidad. Correr no la rompe.
  - Alexander se dibuja a 25 % de opacidad con un brillo tembloroso y Titina también. Suena `invis.on` / `invis.off`, y en el HUD una cuenta atrás.
  - Es rara: 5 % de botín, y 1–2 en neveras escondidas.
- **Debug:** `give('colaInglesa', 1)`.

## 5. Carretillas de comida (`world.js` + `inventario.js` + `armas.js` para la interacción con E)
- Hay 5–7 carretillas de vendedor abandonadas en las veredas: `anticuchos` (ya existe), nueva `papaHuevo` (papa con huevo) y nueva `choclo` (choclo con queso). Cada una tiene 2–4 porciones. Las de emoliente siguen siendo solo decorado.
- **E en la carretilla** = sacas una porción a la mochila, y la carretilla muestra cuántas quedan. Si deja 1 o 2 `sencillo`, es una broma: «dejaste la plata en la latita». No hay comercio.
- **Comer:** se usa desde la mochila o la barra rápida.

| Objeto | Cura | Le cae mal |
|---|---|---|
| `anticucho` | +15 | 25 % |
| `papaHuevo` | +20 | 20 % |
| `chocloQueso` | +12 | 10 % |
| `panChicharron` | +30 | 15 % |

- **Si le cae mal:**
  - en vez de curar, quita **−8 de vida**;
  - 4 s de «empacho»: camina al 70 % y sin correr, con una tinta verde en la cara;
  - sonidos `item.sick` (gruñido de panza y eructo);
  - y **siempre** dice una frase peruana de que le cayó mal (`say('sick')` con `always: true`), en globo y en voz. Ejemplos: «¡Ese anticucho era de gato, causa!», «¡Me cayó pesado!», «¡Ya me agarró la chamba de la panza!», «¡Uy, el huevo estaba de la semana pasada!», «¡Fuiste, estómago!». Sin groserías fuertes; ver la investigación en `diseno/letreros-y-frases-callao.md`.

## 6. Repartidor en moto (`loco: 'moto'`)
- Es un zombie en una moto lineal de reparto, con caja trasera sin marca. Se comporta como la `bici` (solo en la pista, en línea), pero más rápido: velocidad máxima 160. Tiene 1 de vida y anticipa su arranque con un rugido.
- Golpeado o muerto, la moto cae (`props.motoCaida`) y el zombie queda `camina` o muere. Hay 1 o 2 por partida.
- **Sprites:** `zvar` añade 3 skins `moto_*`, cada uno con `move` de 3 cuadros más `hurt` y `dead`, y el prop `props.motoCaida`.
- **Audio:** `zombie.moto` (motor en bucle con ronroneo de dos tiempos).

## 7. Arte nuevo (contrato)
- **Alexander** (`sprites.js`), para `bird` y `nobird`, con las 4 direcciones:
  - `guitarDmg`: los cuadros `walk`/`attack`/`idle` existentes se hornean en 3 versiones de daño de la guitarra a la espalda o en la mano (`alex.<v>.g1/.g2/.g3`, mismas formas). La versión `g3` es «sin guitarra»;
  - `punch[dir]`: 3 cuadros, del mismo tamaño y ancla que `attack`;
  - `skateHold` (caminar, 4 cuadros) y `skateSwing` (3 cuadros);
  - `kick[dir]`: 2 cuadros;
  - `sick`: 2 cuadros, la mano en la panza;
  - el efecto de invisibilidad lo pone el motor (alfa + brillo), no hace falta sprite.
- **Objetos** (`objetos.js`):
  - `items` nuevos `colaInglesa`, `papaHuevo` y `chocloQueso`, cada uno con su `.big`;
  - `fx.guitarraRota` (decal);
  - `fx.skateMitad`;
  - un ícono de HUD para la guitarra con 4 estados (`fx.guitarIcon[4]`).
- **Mobiliario** (`mobiliario.js`): `props.papaHuevo` y `props.choclo` (carretillas de vendedor del mismo tamaño que `anticuchos`, con `.broken`), `props.carretillaSuelta` (de mercado, vacía o con carga, con `.broken`) y `props.motoCaida`.
- **Zombies** (`js/sprites/zombies.js`): los 3 skins `moto_*`.

## 8. Audio nuevo
- **Sonidos** (`sfx.js`): `guitar.crack`, `guitar.break`, `punch.swing`, `punch.hit`, `skate.swing`, `skate.hit`, `skate.break`, `throw.skate` / `roll.skate` (bucle), `throw.bici`, `throw.moto` (motor que acelera en bucle), `moto.crash`, `kick.cart`, `cart.roll` (bucle), `cart.spill`, `grab`, `night.fall` (stinger), `invis.on`, `invis.off`, `item.sick` (panza y eructo), `cart.take` y `zombie.moto` (bucle).
- **Música** (`musica.js`): `setNight(on)` es una variante nocturna. Explore más lento, más oscuro, con más eco y un bajo grave. La persecución de noche es más tensa.
- **Voces** (`voces.js`): ids nuevos `sick` (siempre se dice), `guitarLow`, `guitarBreak`, `grab`, `throw`, `night`, `invis` y `incakola`.

## Fases y dueños de v0.8

| Fase | Trabajo | Archivos | Modelo |
|---|---|---|---|
| G1 | Guitarra que se gasta, puñetes, objetos en la mano, lanzar y patear, E/F, invisibilidad en la IA, ganchos de la noche en la velocidad, botón contextual táctil | `js/engine/armas.js` (nuevo), `entities.js`, `zombies.js`, `interaccion.js`, `input.js`, `tactil.js`, `hud.js`, `game.js` | Opus medium |
| G2 | La noche, bebidas y efectos, carretillas de comida (colocación y porciones), dibujo de la invisibilidad | `js/engine/noche.js` (nuevo), `inventario.js`, `world.js`, `render.js`, `fx.js`, `social.js` | Opus medium |
| G3 | Arte de Alexander: guitarra dañada, puñete, skate, patada, empacho | `js/sprites.js` | Sonnet high |
| G4 | Arte de objetos, carretillas, moto y Cola Inglesa | `objetos.js`, `mobiliario.js`, `js/sprites/zombies.js`, `marcas.js` | Sonnet high |
| G5 | Sonidos, música nocturna y voces | `sfx.js`, `musica.js`, `voces.js`, `motor.js` | Sonnet high |

Después: QA (Sonnet high), build y publicar. Nada se publica sin QA.

---

# v0.9 — Nivel 2: EL CERRO (contrato del arquitecto)

Pedido del dueño (2026-11-19), en resumen: Alexander **sube un cerro** de un asentamiento humano de Lima. Casas en mal estado, de **esteras**, triplay y ladrillo sin tarrajear; **basurales**; cerro **terral, sin pasto ni hierba**; **postes y columnas** con cables; **animales callejeros**, **mototaxis** y **taxis**. Enemigas nuevas: **señoras zombie** con **baldazos de agua** y **ollas** para golpear. **Gallinazos** que bajan en picada a picotear: hay que defenderse con la guitarra o el arma. Armas nuevas: **escoba** (golpe en giro alrededor de Alexander, sobre todo contra los gallinazos) y **bombas molotov** (se prenden y se tiran en curva con el mouse, como la resortera; incendian un radio y dejan a los zombies quemándose). Alexander puede **saltar**, para esquivar **carretillas con gente sentada** que bajan del cerro (de vez en cuando, no muy seguido). En la basura hay **refrigeradoras, televisores rotos, sillas sin una pata, mesas boca arriba y bolsas**, todos rompibles y con botín. **La tele se puede cargar y tirar** a corta distancia en curva.

Investigación con fotos: `../diseno/investigacion-cerro.md` (paletas en hex, tabla de escala y corte por franjas: **los artistas la leen entera**). **Esta sección manda en el nivel 2.** Dos decisiones sobre la investigación: (1) **sin lomas verdes**: el dueño pidió el cerro terral, sin pasto ni hierba, así que se usa solo la paleta seca; (2) **las esteras van más presentes que en las fotos** (que muestran más módulos de triplay arriba) porque el dueño las pidió: en la ladera alta, mitad esteras y mitad módulos. Todo lo de v0.1–v0.8 sigue valiendo salvo donde se diga.

Decisiones del dueño: misma vista cenital 3/4 que el nivel 1; el cerro **sube hacia el norte** (hacia arriba de la pantalla). Se hace sobre la v0.8 completa.

## 1. Varios niveles (`ACH.levels`)

- `ACH.levels = { gambetta: {...}, cerro: {...} }`. Cada nivel publica `build()`, que devuelve un objeto **con la misma interfaz que hoy tiene `ACH.world`** (`T, COLS, ROWS, W, H, MAP, grid, tileAt, isSolidTile, LOTS, props, spawns, start, inExit, lights, decals, over, decor, poles, dogSpawns, birdSpawns, catSpawns, FOOD_CARTS, hiddenLoot, buildProps, collideCircle, moveCircle, los, routeCheck, spawnCheck, ...`), más los campos nuevos del Cerro (§3) que el nivel 1 deja vacíos.
- `world.js` (nivel 1) se registra como `ACH.levels.gambetta`. El nivel 2 va en el archivo nuevo `js/engine/world-cerro.js` → `ACH.levels.cerro`.
- `ACH.game.loadLevel(id)`: reemplaza `ACH.world`, vacía zombies, botín en el suelo, objetos sueltos, proyectiles, fuego y NPC, y llama a cada gancho de `ACH.levelHooks` (arreglo de `function (id, world)`). **Cada módulo que hornea o guarda estado del mapa se registra ahí** (render vuelve a hornear el suelo y los lotes; social, interacción, inventario, noche, audio de ambiente, etc.). Hornear un nivel: < 600 ms.
- **Se conserva entre niveles:** mochila, vida, durabilidad de la guitarra, lo que llevas en la mano, muertes y fans. **No se conserva:** la noche (cada nivel empieza al atardecer y tiene su propio disparador: `ACH.noche.cfg` lo pone el nivel).
- **Flujo:** al ganar el nivel 1 la pantalla «LLEGASTE AL CERRO» ofrece «ENTER — SUBIR EL CERRO» → `loadLevel('cerro')` con una intro corta. En el título, la tecla **2** (o un botón «NIVEL 2: EL CERRO» en la pantalla de título) empieza directo en el Cerro con la mochila inicial de prueba (resortera, 20 piedras, 1 molotov, 2 botellas, 2 trapos). `?nivel=cerro` en la URL hace lo mismo.
- **Morir en el Cerro:** despiertas en el último **punto de descanso** del Cerro (§3), no en la azotea, y pierdes parte de lo que llevabas (como hoy).
- **Ganar el Cerro:** llegar a la **cruz de la cima** → pantalla «LLEGASTE A LA CIMA» con tiempo, fans, muertes, gallinazos espantados y carretillas esquivadas. Enter vuelve al título.
- **Debug:** `ACH.debug.level(id)`, `ACH.debug.level()` → id actual.

## 2. Subir y saltar (jugador)

- **Pendiente:** cada tile del Cerro tiene `slope` (0 plano, 1 ladera, 2 empinado). Moverse hacia el norte multiplica la velocidad por `1 − 0.12·slope`; hacia el sur, por `1 + 0.10·slope`. En escaleras (`stairs`) el factor es 0.85 subiendo y 1.05 bajando. Correr cuesta arriba gasta 30 % más aliento. `ACH.world.slopeAt(x, y)` → 0|1|2.
- Pasos con superficie nueva: `step.surface = 'tierra' | 'escalera' | 'piedra' | 'estera' | 'basura'`.
- **Saltar: tecla C** (táctil: botón **SALTAR** encima de GUITARRAZO, a la izquierda del contextual). Dura 0.55 s, altura máxima 14 px (`p.z`), la sombra se queda en el suelo, cuesta 10 de aliento, enfriamiento 0.25 s. Mientras `p.z > 6`: te salvas de las carretillas, del fuego en el suelo y del charco del baldazo; no puedes atacar. No se salta por encima de sólidos ni de pircas. Sprite: `alex.<v>.jump[dir]` = [agacharse, aire, caer]; sin el sprite, el motor dibuja `idle` levantado `p.z` px.
- Eventos de audio: `jump`, `land` (`x,y,surface`).

## 3. El mapa del Cerro (`world-cerro.js`)

**64 columnas × 150 filas** (1024 × 2400 px). Inicio al sur (abajo), salida en la cima (arriba). La avenida/calle de tierra del pie va de oeste a este; arriba todo es ladera. Las casas se apoyan en **terrazas** (bandas este–oeste) separadas por **pircas o muros de contención** cuya cara se ve (sólidas, 1–2 tiles de cara). Los lotes miran al sur, a la cámara, como en el nivel 1, y usan el mismo sistema `LOTS` + `buildLot` con arquetipos nuevos (§7).

Franjas de sur a norte (afinar con el «Corte del cerro» de la investigación):

| Filas | Franja | Qué hay |
|---|---|---|
| 136–149 | **Pie del cerro** | Calle de tierra con un tramo de asfalto roto, **paradero de mototaxis** (3–4 mototaxis estacionadas, una volcada), un **Tico** y un station wagon abandonados, bodega, casas de ladrillo de 2–3 pisos con columnas y fierros arriba, postes de concreto, perros. **Inicio** en la columna ~10, fila ~145. |
| 100–135 | **Ladera baja** | Escalera de cemento **pintada de amarillo con baranda de tubo** que sube recta (la ruta principal), casas de ladrillo de 2–3 pisos pegadas con fierros, banderas y ropa tendida, pircas de 2–3 m, **olla común** en una plataforma de cemento (§4.3), **losa deportiva** con baranda amarilla (punto de descanso 1). |
| 50–99 | **Ladera media** | **Camino de tierra en zigzag** (por donde bajan las carretillas), ladrillo de 1–2 pisos sin tarrajear mezclado con **módulos pintados azul, verde, turquesa y naranja** con calamina, escaleras grises sin baranda, **camión cisterna** (tanque azul, cabina amarilla, mangueras gruesas) con hileras de **cilindros azules con lonas** y la cola de señoras (§4.3), **basural grande** en una quebrada (refris, teles, sillas, mesas, bolsas, colchones, llantas; nido de gallinazos), **muros de llantas rellenas de tierra**, postes de madera inclinados mezclados con los de concreto, tendales, gallinas sueltas. Punto de descanso 2 en una placita de tierra. |
| 10–49 | **Ladera alta (invasión)** | Casitas de **esteras** con marco de palos y **módulos de tablas/triplay** con calamina a un agua sobre terrazas de pirca, lonas y plásticos, lotes aplanados marcados con hileras de piedras pintadas con cal, cables sueltos sin postes formales, banderas peruanas, letrero pintado en la roca con el nombre inventado del asentamiento, escaleras de tierra con tablones, trochas angostas, más viento y polvo, más gallinazos en las rocas. |
| 0–9 | **Cima** | Roca gris parda descubierta, la **cruz blanca** y una bandera en un palo largo, torre de antenas, reservorio azul, vista de la ciudad en garúa (mar de techos planos y el mar en bruma, decorado en la capa alta). Tocar la base de la cruz = ganar. |

- Rutas: por lo menos **dos** caminos a la cima (escaleras y zigzag) que se cruzan en 3–4 rellanos. `routeCheck()` ok de inicio a cruz y de cada punto de descanso a la cruz.
- **Carriles de bajada** (`world.lanes = [{id, pts:[{x,y},...]}]`): 2–3 polilíneas de norte a sur sobre el zigzag y una escalera ancha, por donde bajan las carretillas (§5).
- Campos nuevos del mundo: `slopeAt`, `lanes`, `restPoints:[{x,y,label}]`, `perches:[{x,y,kind:'poste'|'techo'|'basural'}]` (gallinazos), `waterSources:[{x,y}]` (cilindros, cisterna: las señoras recargan ahí), `trashPiles:[{x,y,r}]` (basurales), `chickenSpawns`, `ollaComun:{x,y}`, `cfgNoche:{triggerY}` (anochece al subir por encima de la fila 70 o a los 5 min).
- Marcadores de spawn nuevos: `O` señora de la olla, `W` señora del balde, `V` gallinazo hostil posado, `K` grupo de 3 señoras. Unos **30 zombies** al inicio: 55 % señoras (mitad y mitad), el resto caminantes del barrio, escolares y algún `cuatro`/`gusano`; más densos hacia arriba. Reaparición como en el nivel 1.
- **Sin pasto, sin árboles, sin hierba.** Suelo de tierra y arena ocre, piedras, roca gris parda, polvo. Algún cactus o maceta con geranios en latas, nada más verde.
- Postes con cables entre postes consecutivos (mismo sistema que el nivel 1, con más comba y más cables) y **columnas de fierro** sin terminar en los techos.
- Ambiente: menos garúa, más viento con polvo (partículas ocres), ropa tendida que se mueve, radio lejana con cumbia, perros lejanos, rumor de la ciudad abajo.

## 4. Enemigas: las señoras zombie (`senoras.js`, nuevo)

Las señoras son zombies «de oficio» del barrio. Según las fotos (investigación §10): las de la olla común llevan **chaleco verde lima, cofia y mandil verde petróleo**, chancletas, olla y cucharón; las del agua, **manta o chompa**, falda o buzo, sandalias, moño o trenzas y balde de plástico de color. Se ven con el sistema `zvar` (cuerpos y atuendos de señora, §7). Comportamiento nuevo por tipo, con un gancho genérico en `entities.js`:

```js
// en el update de cada zombie, antes de la IA normal:
if (ACH.zbeh && ACH.zbeh[z.type] && ACH.zbeh[z.type].update(G, z, dt)) continue;   // true = ya lo manejó
// al crear: ACH.zbeh[z.type].init(G, z) si existe; al recibir golpe: .onHit(G, z, src) → 'block' | 'parry' | undefined
```

### 4.1 Señora del balde (`senoraBalde`)
- Vida 3, velocidad 30, vista 100, oído normal. Daño de contacto 6.
- **Baldazo:** a 40–75 px y con línea de vista, se planta, carga 0.6 s (balde atrás, grita «¡FUERA DE MI PUERTA!» o similar) y lanza agua en **cono de 60° y 75 px**. Si te alcanza: 6 de daño, empuje 35, **mojado 4 s** (`p.wetT`: 80 % de velocidad, gotas en el sprite). Saltar o salir del cono lo esquiva.
- El agua **apaga** el fuego del suelo y a los zombies que se queman, y deja un charco (decal 6 s) que apaga molotovs que caigan encima.
- Después del baldazo el balde queda vacío: va a la fuente de agua más cercana (`waterSources`) si está a menos de 160 px, o pelea con el balde vacío (contacto) durante 6 s. Es la ventana para pegarle.

### 4.2 Señora de la olla (`senoraOlla`)
- Vida 4, velocidad 34, vista 90. Ataque: a 16 px levanta la olla 0.45 s (aviso claro: olla arriba, brillo, «¡TOMA, SINVERGÜENZA!») y la baja: **14 de daño**, empuje 60, aturde 0.3 s a Alexander, «¡CLONG!».
- **Contragolpe:** si le pegas durante el levantamiento, la interrumpes: «¡CLONG!» en la olla, ella queda aturdida 1 s y recibe daño doble. Premia el tiempo.
- La olla es un **escudo de frente** contra las piedras (rebotan), no contra el guitarrazo ni el fuego.

### 4.3 Encuentros de señoras
- **La cola del cisterna** (ladera media): 5–6 señoras con baldes esperando junto al camión cisterna y los cilindros. Pacíficas mientras no te vean a menos de 50 px o no hagas ruido fuerte; entonces van todas.
- **La olla común** (ladera baja): 4 señoras de la olla cocinando en ollas negras grandes sobre fogones de leña, con humo, bajo carpas rojas en una plataforma de cemento, con el letrero pintado «OLLA COMÚN» y un nombre inventado. Pacíficas como la orquesta del nivel 1 (`social.js`): si las molestas, pelean; si sobreviven y te vas, vuelven a cocinar a los 20 s. Si las tumbas, queda comida (`taper`) en el fogón.
- Botín de señoras: `sencillo` 50 %, `taper` 20 %, `trapo` 20 %, `botella` 15 %, `escoba` 8 % (la deja caer en el suelo como objeto agarrable).

## 5. Carretillas que bajan (`cerro.js`, nuevo)

- Cada **25–40 s**, solo si Alexander está a menos de 40 px de un carril de bajada (`world.lanes`) y no hay otra en curso, aparece una **carretilla con un zombie sentado** (señor, señora o escolar) en lo alto del carril, fuera de cámara, y baja por la polilínea acelerando hasta 170 px/s. El dueño pidió que sea **de vez en cuando, no muy seguido**: nunca más de una a la vez y nunca dos en menos de 25 s.
- **Aviso 1.5 s antes:** traqueteo que crece (`carretilla.warn`), grito del pasajero («¡AHÍ VOOOY!», «¡ABRAN CANCHA!»), y una flecha amarilla con «¡!» en el borde superior de la pantalla, en la columna del carril.
- **Choque con Alexander** (`p.z < 8`, radio 12): 18 de daño, empuje 90 cuesta abajo, Titina sale volando. **Si la saltas:** texto «¡OLÉ!» y cuenta en las estadísticas.
- Atropella zombies en su camino (daño 2, empuje 70): se puede usar a favor.
- Al final del carril choca contra una pirca o un montón de basura: se voltea (`props.carretillaSuelta.broken`), el pasajero queda `gusano` y suelta botín de mercado.
- La guitarra no la para (Alexander recibe el golpe igual). Un molotov o la tele sí: el pasajero cae antes.
- Eventos: `carretilla.warn`, `carretilla.roll` (bucle posicional), `carretilla.crash`, `carretilla.jumped`.
- Debug: `ACH.debug.carretilla(laneId?)`.

## 6. Gallinazos que atacan (`aves.js`, nuevo)

En el Cerro los gallinazos son **enemigos**. Los posados del nivel 1 siguen igual (decoración) en la Gambetta.

- **Estados:** `posado` (en `perches`, se ven) → `vuela` (dan vueltas en círculo a 60–90 px de altura `z`, con su **sombra en el suelo** debajo; el sprite se dibuja en `y − z`) → `picada` → `picotea` → `sube` → `golpeado` / `cae`.
- **Picada:** cuando uno lleva 3–6 s volando a menos de 160 px de Alexander, chilla (`gallinazo.screech`), su sombra crece y se oscurece durante **0.6 s** (el aviso), y baja en picada hacia donde está Alexander, corrigiendo un poco la puntería (200 px/s). Si llega con `z < 10` a menos de 10 px: **picotea**, 5 de daño por picotazo, hasta 2 picotazos en 0.6 s, y sube. Titina se asusta y sale volando con el primer picotazo.
- **Defenderse:** el guitarrazo le pega si está dentro del arco y con `z < 24`; la escoba en giro, con radio 30 y `z < 36` (la mejor defensa); la piedra y el molotov, en el aire, si pasan a ±10 de su `z`. Vida 2. Golpeado: plumas, sube espantado y se aleja 8 s; muerto: cae dando vueltas. Texto flotante: «¡FUERA, PAJARRACO!».
- **Cuántos:** máximo 4 hostiles a la vez; más cerca de los basurales y en la ladera alta. Reaparecen desde fuera de cámara cada 30 s si hay menos de 2. De noche, la mitad (duermen posados).
- **Comen muertos:** si hay un cadáver cerca, un gallinazo que vuela puede bajar a comer 6 s y en ese rato no ataca. Sirve para distraerlos.
- La vista de paloma (Q) también los marca, con otro color.
- Debug: `ACH.debug.gallinazos()` → lista, `ACH.debug.gallinazo()` → fuerza una picada.

## 7. Armas nuevas

### 7.1 Escoba (objeto en la mano, `ACH.armas.defs.escoba`)
- Aparece apoyada en paredes de casas (`props.escobaPared`, E agarrar), en el botín de señoras y en 2–3 lugares fijos. Se lleva en la mano (v0.8 `p.held`), y el golpe es el **giro**.
- **Giro (Espacio):** golpe de **360°** alrededor de Alexander, radio 26 px, 0.40 s, daño 1, empuje 55, golpea a lo que está en el suelo y a los gallinazos con `z < 36`. Enfriamiento 0.55 s, 12 de aliento.
- **Ventilador (mantener Espacio):** sigue girando hasta 1.5 s: golpea a cada enemigo cada 0.25 s, gasta 22 de aliento por segundo y caminas a 55 %. Te protege de una picada.
- Durabilidad: 30 golpes que conectan. Al acabarse, se parte (`fx.escobaRota`).
- Sprites: `alex.<v>.escobaHold[dir]` (caminar, 4) y `alex.<v>.escobaSpin` (8 cuadros del giro, sin dirección). Estela circular de polvo en `fx.js`.
- Audio: `escoba.swing` (silbido de cerdas), `escoba.hit`, `escoba.break`.

### 7.2 Molotov (`fuego.js`, nuevo)
- **Ítems:** `molotov` (apila 5), `botella` (vacía, apila 6), `trapo` (apila 6), `gasolina` (apila 3). En la mochila, el botón **ARMAR** junta 1 botella + 1 trapo + 1 gasolina → 1 molotov. La gasolina sale de las mototaxis y del Tico al destruirlos (1–2) y de algún bidón en el basural. A veces el molotov ya viene armado (botín raro).
- **Arma a distancia:** la tecla **R** cambia el arma del clic entre **resortera** y **molotov** (solo las que tengas). El HUD muestra la que está activa y su munición. (Táctil: el botón RESORTERA cambia de ícono; mantenerlo apretado 0.5 s cambia de arma.)
- **Tirar:** igual que la resortera (mouse, mantener, soltar, con curva por el movimiento perpendicular del mouse), pero: al empezar la carga Alexander **prende la mecha** (0.35 s, chispa y llamita en la botella, `molotov.light`); la carga va de 0 a 1 en 0.9 s; alcance 50–200 px; arco más alto y más lento que la piedra. La trayectoria prevista termina en un **círculo naranja** del radio del incendio.
- **Al caer** (o al tocar un zombie con `z < 14`, o a un gallinazo en el aire a ±10 de su `z`): la botella se rompe (`molotov.break`, `fire.whoosh`), **impacto directo 2 de daño**, y deja una **zona de fuego de radio 34 px durante 5 s**: llamas animadas, humo, luz en el mapa de luz, ruido de radio 160 (atrae zombies).
- **Quemadura** (`z.burnT`): un zombie que toca la zona recibe 1 de daño por segundo mientras está dentro y queda **quemándose 4 s** después de salir: 0.6 de daño por segundo, llamas sobre el sprite, y corre desorientado al 120 % en direcciones al azar. Un zombie que se quema **contagia** a otro que toca (30 % por segundo de contacto). Los gallinazos que cruzan el fuego con `z < 30` se queman y caen.
- **Alexander** en la zona: 4 de daño por segundo y queda quemándose 1.5 s (salvo que salte por encima). Mojado (`p.wetT > 0`) no se quema.
- El agua (baldazo, charco, cilindro roto) apaga el fuego y las quemaduras. Las bolsas de basura dentro de la zona se queman (se rompen y echan una columna de humo 15 s). **Las casas no se queman** (el fuego solo vive en el suelo de tierra).
- Debug: `ACH.debug.fire(x, y)`, `ACH.debug.give('molotov', 5)`.
- Sprites: `ACH.sprites.fx.molotov` (botella en vuelo, 2 cuadros con llamita), `fx.fuego` (llamas: 4 cuadros, en 3 tamaños), `fx.quemadura` (llamitas para encima de un zombie, 4 cuadros), `fx.humo` (si no existe ya), `alex.<v>.throwMolotov[dir]` = [prender, estirar, soltar] (si no existe, usa `sling`).
- Audio: `molotov.light`, `molotov.throw`, `molotov.break`, `fire.whoosh`, `fire.loop` (bucle posicional por zona), `zombie.burn` (alarido), `fire.out` (siseo de agua).

### 7.3 Cargar y tirar la tele (`ACH.armas.defs.tele`, pesado)
- Los televisores de tubo del basural se pueden **romper** (botín) o **agarrar con E** si están enteros. Alexander la carga **sobre la cabeza**: camina al 65 %, no corre, no ataca, no salta.
- **F (mantener hasta 0.6 s y soltar) = tirarla** hacia el mouse (o hacia donde mira, en táctil), en **arco corto**: 30–90 px según la carga, con altura `z` como la piedra.
- **Al caer:** radio 20 px, daño 3, empuje 80, aturde 0.6 s; se hace añicos (vidrio, chispas, `tele.crash`, ruido 150) y deja restos (decal) más una tirada de botín de tele.
- Mismo sistema para objetos pesados futuros: `defs[id].heavy = true` con `carrySpeed`, `throwRange:[min,max]`, `impact:{r, dmg, push, stun}`.
- Sprites: `alex.<v>.carry[dir]` (caminar con la tele arriba, 4) y `alex.<v>.carryThrow[dir]` (2); `props.tele` (entera, `.broken`), `fx.teleVuelo` (la tele girando en el aire, 4 cuadros).
- Audio: `grab` (ya existe), `throw.tele`, `tele.crash`.

## 8. Basura rompible y botín (`interaccion.js`, `inventario.js`)

| Prop | Golpes | Qué pasa | Botín |
|---|---|---|---|
| `refri` (refrigeradora tirada o parada) | 4 | Se abolla; al romperse la puerta se abre y cuelga | 80 %: `taper`, `gaseosa`, `agua`, `colaInglesa` 4 % |
| `tele` (de tubo) | 2 | Pantalla rota, chispas | 40 %: `sencillo`, `cuerdas`, `trapo` |
| `sillaRota` (sin una pata) | 1 | Se desarma en palos | 30 %: `piedras`, `trapo` |
| `mesaVolteada` (boca arriba) | 2 | Se parte una pata, luego el tablero | 40 %: `botella`, `trapo`, `sencillo` |
| `bolsas` (de basura, negras y de colores) | 1 | Se rompen y riegan basura | 60 %: `botella`, `trapo`, `piedras`, comida |
| `colchon`, `llanta` | — | Decorado; la llanta suena a goma | — |
| `cilindroAzul` (agua) | 3 | Se rompe y deja un charco grande (apaga el fuego) | — |
| `mototaxiVar`, `tico` | como v0.6 | Además sueltan `gasolina` 1–2 al destruirse | + `gasolina` |

- Todos tienen `.broken` (y `.dmg` los que tienen estados), `ax/ay/fw/fh`, y ruido al golpearlos como en v0.6.
- **Ítems nuevos:** `taper` (táper de arroz con pollo recalentado: +25 de vida, **le cae mal 25 %**, frase de empacho), `agua` (botella de agua: +20 de aliento y apaga tu quemadura), `botella`, `trapo`, `gasolina`, `molotov`. Íconos 12×12 + `.big` 24×24 en `objetos.js`.

## 9. Otros habitantes

- **Perros** (los de v0.3/v0.6), en jaurías de 2–3 en la ladera baja y media: ladran a coro.
- **Gatos** en techos de calamina.
- **Gallinas sueltas** (`npc.gallina`, nuevo, 5–8): picotean el suelo, huyen cacareando si corres cerca (ruido 60), nunca reciben daño.
- **Mototaxis y taxis** abandonados como props rompibles (gasolina). Una mototaxi **con un zombie mototaxista** sentado que no se mueve (decorado vivo, gruñe) en el paradero.

## 10. Arte nuevo (contrato de sprites)

Todo a escala (1 m = 16 px, persona 28 px), contorno oscuro de 1 px, paleta de la investigación (ocres, ladrillo, estera amarillo paja apagado, triplay, calamina oxidada, cilindros azules, cielo panza de burro). **Dignidad:** macetas en latas, puertas pintadas, ropa tendida, banderas; nada de burla de la pobreza.

| Archivo (nuevo) | Contenido |
|---|---|
| `js/sprites/cerro-suelo.js` | Tiles: `tierra:[n]`, `tierraPiedras:[n]`, `roca:[n]`, `arena:[n]`, `trocha:[n]`, `escaleraCerro:[n]` (gris y pintada), `losa` (cemento de losa deportiva con líneas), `pircaFace:[n]` (cara de muro de piedra, sólida), `muroContencion:[n]` (cemento), `bordeTerraza` (transición). Calcomanías: `cal` (piedras pintadas de blanco que marcan lotes), `charco:[2]`, `basuraSuelta:[n]`, `polvo`. |
| `js/sprites/cerro-casas.js` | Arquetipos de `buildLot`: `estera` (casa de esteras con palos y techo de estera o plástico), `triplay` (módulo de triplay/madera con calamina), `ladrilloCerro` (ladrillo sin tarrajear de 1–3 pisos con columnas y fierros, ventanas con plástico), `mixta` (ladrillo abajo, triplay arriba), `bodegaCerro`, `ollaComun` (toldo, fogones, letrero pintado), `losaDeportiva` (arcos y tribuna de cemento), `cruzCima` (la cruz grande, sólida en su base), y las piezas de techo: calamina con piedras encima, tanque, bidones, ropa tendida, antenas de TV, banderas. Cada uno con `side:'N'` y `'S'` como en v0.4. |
| `js/sprites/cerro-props.js` | `props.refri`, `tele`, `sillaRota`, `mesaVolteada`, `bolsas` (variantes de colores), `colchon`, `llanta`, `cilindroAzul`, `cisterna` (camión cisterna, de costado), `posteMadera` (con `top`), `columnaFierro`, `escobaPared`, `fogon`, `toldo`, `cruzChica`, `letreroRoca`; todos con `ax/ay/fw/fh`, `.broken`/`.dmg` donde toque. |
| `js/sprites/zombies.js` (existente) | Cuerpos y atuendos de **señora** para `zvar` (mandil a cuadros, falda o buzo, chompa, sandalias, moño o trenzas; 2 alturas): skins `senoraBalde_*` y `senoraOlla_*` con `move:[4]`, `windup:[2]` (balde atrás / olla arriba), `attack:[2]` (baldazo / ollazo), `hurt`, `dead`; `zombie.pasajero` (sentado en carretilla, 2 cuadros, se dibuja encima de `props.carretillaSuelta`). Unas 10 combinaciones. |
| `js/sprites/aves.js` (nuevo) | `npc.gallinazoHostil = { glide:[4], dive:[2], peck:[3], hurt:[2], fall:[3], eat:[2] }` (alas de 22 px abiertas), `fx.sombraAve:[3]` (sombra en tres tamaños), `fx.plumas`; `npc.gallina = { idle:[2], peck:[2], run:{left:[4], right:[4]} }`. |
| `js/sprites.js` (existente) | Alexander: `jump[dir]` (3), `escobaHold[dir]` (4), `escobaSpin` (8), `carry[dir]` (4), `carryThrow[dir]` (2), `throwMolotov[dir]` (3), `wet` (gotitas encima, overlay de 2 cuadros). |
| `js/sprites/objetos.js` (existente) | Ítems `taper`, `agua`, `botella`, `trapo`, `gasolina`, `molotov`, `escoba` (12×12 + `.big`); `fx.molotov`, `fx.fuego`, `fx.quemadura`, `fx.teleVuelo`, `fx.escobaRota`, `fx.restosTele`, ícono de HUD de arma a distancia (`fx.rangedIcon.resortera/molotov`). |

## 11. Audio nuevo (`js/audio/*`)

- **Efectos:** `jump`, `land`, `carretilla.warn`, `carretilla.roll`, `carretilla.crash`, `carretilla.jumped`, `gallinazo.screech`, `gallinazo.flap`, `gallinazo.peck`, `gallinazo.hit`, `gallinazo.fall`, `senora.yell` (grito con formantes, sin palabras reales), `balde.windup`, `balde.splash`, `olla.windup`, `olla.clong`, `olla.parry`, `escoba.swing`, `escoba.hit`, `escoba.break`, `molotov.light`, `molotov.throw`, `molotov.break`, `fire.whoosh`, `fire.loop`, `fire.out`, `zombie.burn`, `tele.crash`, `throw.tele`, `fridge.hit`, `fridge.open`, `chicken.cluck`, `chicken.flee`, `wind.dust` (ambiente), `radio.cumbia` (radio lejana posicional, en bucle).
- **Ambiente del Cerro** (`amb.setLevel('cerro')`): menos garúa, más viento, perros lejanos a coro, rumor de la ciudad abajo, radio lejana.
- **Música:** `musicEngine.setLevel('cerro')`: el `explore` del Cerro es una **chicha con aire de huayno** (guitarra punteada con eco, bajo saltarín, güiro, algo de quena sintetizada), original. La salsa brava de persecución se mantiene, con un mambo distinto.
- **Voces** (`voces.js`): `senoraBalde` («¡Fuera de mi puerta!», «¡Ahí te va, malcriado!», «¡A ver si te bañas!»), `senoraOlla` («¡Toma, sinvergüenza!», «¡Para que aprendas!», «¡Con la olla no se juega!»), `carretilla` («¡Ahí voooy!», «¡Abran cancha!», «¡Sin frenos, causa!»), `ole` (Alexander: «¡Olé!», «¡Ni me tocaste!»), `gallinazo` («¡Fuera, pajarraco!», «¡Todavía no estoy muerto, oe!»), `molotov` («¡Ahí te va calientito!»), `tele` («¡Mira la tele, pe!»), `escoba`. Sin groserías fuertes.

## 12. APIs entre fases (para que trabajen en paralelo)

Todas con guardas: si el módulo del otro aún no existe, no se rompe nada.

| Quién la publica | API | Quién la usa |
|---|---|---|
| H1 `game.js` | `ACH.levels`, `ACH.levelHooks.push(fn(id, world))`, `ACH.game.loadLevel(id)`, `ACH.game.levelId()` | todos |
| H1 `entities.js` | `p.z`, `p.jumpT`, `p.airborne()` (o `p.z > 6`); gancho `ACH.zbeh[type].{init, update, onHit}` (§4); gancho de estados `ACH.zstatus = []` de `fn(G, z, dt, want)` que puede cambiar la velocidad o el rumbo pedidos (lo usa la quemadura); `ACH.ent.hurtPlayer(G, dmg, opts)` acepta `opts = {push:{x,y,f}, stun, src, ignoreAir}`. Un golpe del jugador no sale si `p.z > 0`. | H2, H3 |
| H1 `render.js` | `ACH.drawHooks = { ground:[], ysort:[], air:[], screen:[] }`. `ground`: `fn(ctx, G, cx, cy)` sobre el suelo (fuego, charcos, sombras de aves). `ysort`: `fn(G) → [{y, draw(ctx, cx, cy)}]` (zombies en llamas, carretillas, gallinas). `air`: por encima de todo lo del suelo (gallinazos en vuelo, molotov en el aire). `screen`: avisos en pantalla (la flecha de la carretilla). Más `ACH.render.addLight(x, y, r, color, t)` para luces de fuego temporales. | H2, H3 |
| H1 `world-cerro.js` | `world.slopeAt, lanes, restPoints, perches, waterSources, trashPiles, chickenSpawns, ollaComun, cisterna, cfgNoche` y los marcadores `O W V K` en `spawns` | H2, H3, H7 |
| H1 `cerro.js` | `ACH.cerro = { carts:[], spawnCart(laneId), update(G, dt), stats:{jumped, hit} }` | H6 (audio), debug |
| H2 `aves.js` | `ACH.aves = { list, hitCircle(G, x, y, r, zMax, dmg, src) → n, hitPoint(G, x, y, z, tol, dmg, src) → ave|null, burn(ave), update, reset }` | H3 (escoba, guitarra, piedra, molotov, fuego) |
| H2 `senoras.js` | `ACH.zbeh.senoraBalde`, `ACH.zbeh.senoraOlla`; pone `p.wetT` y llama `ACH.fuego.extinguish(x, y, r)` con el agua | H3 |
| H3 `fuego.js` | `ACH.fuego = { zones, ignite(x, y, r, t), extinguish(x, y, r), burnZombie(z, t), inFire(x, y) → bool, update, reset }` | H2 (agua, gallinazos que cruzan el fuego), H1 (carretilla) |
| H3 `armas.js` | `defs.escoba` (`mode:'hand'`, giro 360°), `defs.tele` (`mode:'carry'`); `playerMods(p)` suma `p.wetT` (×0.8) y la quemadura del jugador; el giro y el guitarrazo llaman a `ACH.aves.hitCircle` | H1, H2 |
| H3 `interaccion.js` | arma activa a distancia `p.ranged = 'resortera'|'molotov'` con **R**; la piedra y el molotov llaman a `ACH.aves.hitPoint` en vuelo | H1 (HUD táctil) |

## 13. Fases y dueños de v0.9

Después de que la v0.8 esté integrada y revisada.

| Fase | Trabajo | Archivos | Modelo |
|---|---|---|---|
| H1 | Varios niveles, `loadLevel` y `levelHooks`, mapa del Cerro (grilla, terrazas, pendiente, rutas, carriles, LOTS con arquetipos nuevos y bloques provisorios si faltan sprites), salto, carretillas, flujo título/victoria, puntos de descanso, gancho `ACH.zbeh` | `world.js`, `world-cerro.js` (nuevo), `cerro.js` (nuevo), `game.js`, `entities.js`, `render.js`, `input.js`, `tactil.js`, `hud.js` | Opus medium |
| H2 | Señoras (balde, olla, cola del cisterna, olla común) y gallinazos hostiles | `senoras.js` (nuevo), `aves.js` del motor (nuevo, `js/engine/aves.js`), `zombies.js` del motor, `social.js` | Opus medium |
| H3 | Escoba, tele, molotov y fuego, basura rompible, ítems nuevos, ARMAR, cambio de arma con R | `armas.js`, `fuego.js` (nuevo), `interaccion.js`, `inventario.js`, `fx.js`, `noche.js` (solo `cfg` por nivel) | Opus medium |
| H4 | Suelo, casas y props del Cerro | `cerro-suelo.js`, `cerro-casas.js`, `cerro-props.js` (nuevos) | Sonnet high (2 agentes: suelo+props / casas) |
| H5 | Personajes y objetos | `sprites.js`, `zombies.js` de sprites, `aves.js` de sprites (nuevo), `objetos.js` | Sonnet high (2 agentes: Alexander+objetos / señoras+aves) |
| H6 | Sonidos, ambiente y música del Cerro, voces | `js/audio/*` | Sonnet high |
| H7 | Colocación final con el arte real, vida (gallinas, perros, tendales), pulido del recorrido | `world-cerro.js`, `social.js` | Sonnet high (después de H1–H6) |

`index.html` (orden de carga de los archivos nuevos) y `build.sh` los toca solo H1: sprites nuevos después de `objetos.js` y antes de `zombies.js` de sprites; `world-cerro.js` después de `world.js`; `cerro.js`, `senoras.js`, `aves.js`, `fuego.js` después de `armas.js`. Los archivos que todavía no existan se crean como stub de una línea (como en v0.8) para que nadie rompa la carga.

**Hecho cuando:** se juega del pie a la cima sin errores en consola, a 60 fps con 30 zombies y 4 gallinazos; `routeCheck()` ok y `spawnCheck()` vacío en los dos niveles; se pasa del nivel 1 al 2 y se vuelve al título; cada mecánica nueva se probó con su debug. Después: QA (Sonnet high), build y publicar.
