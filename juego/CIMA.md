# ACHORADO — La cima del cerro: cinemática y mapa de distritos (contrato del arquitecto)

Pedido del dueño, en resumen:
- Al terminar la parte 2, Alexander llega a la cima del cerro y se asoma.
- Una cinemática corta, de **15 a 20 s**, muestra los distritos que se ven desde arriba.
- En el montaje, la cara de Alexander sale en **contrapicado** (la cámara abajo, él mirando arriba), como un héroe que busca salvar a Lima. Su expresión es **cómica y heroica a la vez**.
- Aparece lo que piensa: cree haber escuchado que en un **distrito pituco** hay una **cura**, y quiere ir a investigar a **Miraflores**.
- Suena una canción limeña **entre criolla y andina** que suena heroica.
- Después sale el **mapa** para escoger el distrito. Solo **Miraflores** está disponible. Barranco, Lince, Magdalena y los demás se ven, pero están bloqueados; se desbloquean a medida que avanzas.
- El arte de la cinemática es **más grande y más detallado** que el del juego (que tiene personajes de unos 24 px).

Este módulo está **aparte del juego**: otra sesión trabaja ahora mismo en la parte 2 (el cerro) y en la v0.8, así que **nadie de este trabajo toca** `index.html`, `game.js`, `hud.js`, `render.js`, `build.sh`, `SPEC.md` ni ningún archivo que no figure abajo. Se prueba con su propia página `cima.html`. La parte 2 lo enganchará después con una sola llamada (ver «Integración»).

## Reglas técnicas
- Scripts clásicos (sin módulos ni build), `'use strict'`, todo cuelga de `window.ACH`. Sin librerías externas. No hay python ni node en esta Mac: no se pueden correr scripts para probar; se prueba en el navegador.
- Lienzo propio de **960×540** píxeles lógicos (el doble del juego), con `image-rendering: pixelated`, escalado al tamaño de la ventana manteniendo 16:9.
- Los textos van en HTML encima del lienzo, con las fuentes del juego (`Bungee`, `Patrick Hand`, `Silkscreen` de Google Fonts). El lienzo no dibuja letras.
- Sin marcas reales, sin logos ni letreros legibles de empresas. Los monumentos públicos (la cruz del San Cristóbal, la del Morro Solar, un faro, la Isla San Lorenzo) sí pueden salir.
- Música original: nada de melodías existentes.

## Archivos y dueños

| Archivo | Qué es | Dueño |
|---|---|---|
| `js/sprites/cine.js` | Todo el arte grande: panorama, Alexander de espaldas, primer plano heroico, mapa | Arte (Opus medium) |
| `js/audio/himno.js` | El tema heroico criollo-andino de 18 s y el bucle del mapa | Música (Sonnet high) |
| `js/cine/cima.js` | Línea de tiempo, cámara, textos, saltar, mapa interactivo, progreso de distritos | Motor (Sonnet high) |
| `css/cima.css`, `cima.html`, `build-cima.sh` | Página de vista previa propia y su build a `dist/cima.html` | Motor |

Cada archivo se puede cargar sin los otros sin lanzar errores (si falta el arte, el motor pinta rectángulos de reemplazo; si falta la música, hay silencio).

## Línea de tiempo (18 s; compás de vals 3/4 a 120 bpm = 1,5 s por compás, 12 compases)

| Tiempo | Compases | Toma | Qué pasa |
|---|---|---|---|
| 0–3 s | 1–2 | **T1 La cima** | Sale de negro. Bandas de cine negras arriba y abajo. Alexander, de espaldas y grande (unos 220 px de alto), sube el último escalón y se planta en la cima, con Titina en el hombro. Viento: el pelo y la camiseta se mueven. Abajo y al fondo, la ciudad gris en la garúa. |
| 3–9 s | 3–6 | **T2 El panorama** | Paneo lento de izquierda a derecha por Lima con paralaje (4 capas). A medida que entra cada distrito, aparece su etiqueta chicha pequeña. El paneo se frena y termina en **Miraflores**, que queda un poco a la derecha del centro. Ahí, en lo alto de una torre, **parpadea una luz verde**: la pista de la cura. |
| 9–16,5 s | 7–11 | **T3 El héroe** | Primer plano en contrapicado de Alexander, que mira arriba a la izquierda. Acercamiento lento (escala 1,00→1,08). El pelo y la camiseta van al viento. Un rayo de luz rompe el cielo panza de burro (la ironía: en Lima nunca sale el sol). Gallinazos dan vueltas en el cielo. Titina, en el hombro, **copia la pose heroica** e infla el pecho. Los pensamientos (ver abajo) se escriben letra por letra. |
| 16,5–18 s | 12 | **T4 Transición** | Destello blanco, y entra el título «¿A DÓNDE, CAUSA?». Luego, el mapa. |
| 18 s → | — | **Mapa** | El mapa de distritos (ver abajo), con el bucle de música del mapa. |

**Pensamientos** (globo de pensamiento: letra `Patrick Hand` blanca con sombra rosada, abajo a la izquierda, sin tapar la cara):
- 9,3 s: «Creo que escuché que en un distrito pituco... hay una cura.»
- 12,0 s (primer tiempo del compás 9, con el acento de la música): «**MIRAFLORES.**» en `Bungee`, grande y amarillo.
- 13,5 s: «Aguanta, Lima. Ahí voy, causa.»

**Golpes cómicos de T3:**
- A los 13,0 s, una bolsa de plástico cruza volando con el viento.
- A los 14,8 s, una gota de garúa cae en la nariz de Alexander: parpadea, arruga la nariz, y vuelve a la pose heroica.
- A los 15,6 s, Titina dice «¡Grrú!» (texto pequeño junto a ella).

**Saltar:** después de 1 s aparece abajo a la derecha «ENTER / CLIC PARA SALTAR». Saltar lleva al mapa con un fundido de 0,4 s, y la música pasa al bucle del mapa.

## Arte: `js/sprites/cine.js` → `ACH.cine`

```
ACH.cine = {
  W: 960, H: 540,
  ready(),                       // arma las cachés una sola vez (idempotente, < 800 ms). El motor la llama antes de empezar.
  pano: {
    w: 2400,                     // ancho de la capa media (la de referencia de la cámara)
    labels: [{id, x, y}],        // dónde poner la etiqueta HTML de cada distrito, en coordenadas de la capa media
    cure: {x, y}                 // la luz verde de Miraflores, en coordenadas de la capa media
  },
  drawBack(ctx, t, climb),       // T1, cuadro completo. climb va de 0 a 1 (sube el último escalón → de pie)
  drawPano(ctx, camX, t),        // T2, cuadro completo. camX va de 0 a pano.w − 960. Paralaje: cielo 0,1 · lejos 0,35 · media 1 · cerca 1,6. Anima la garúa, las aves, el brillo del mar, el humo y la luz verde.
  drawHero(ctx, t, s),           // T3, cuadro completo. s = {push 0..1, eyes:'heroic'|'blink'|'wide', mouth:'serious'|'smirk'|'scrunch', drop 0..1, bag 0..1, titina:'puff'|'blink'|'look', ray 0..1}
  map: {
    districts: { id: {name, poly: [[x,y],...], label: [x,y]} },   // en coordenadas de 960×540
    start: [x, y]                // el cerro del Callao, donde está Alexander
  },
  drawMap(ctx, t, states, hoverId)   // states = {id: 'locked'|'open'|'visited'}. Dibuja el mapa completo: mar, distritos según su estado, la ruta punteada desde start hasta hoverId (o hasta el distrito 'open'), y Alexander con Titina pequeños en start.
};
```

**Estilo:**
- Pixel art de alta resolución: 1 píxel lógico = 1 píxel del lienzo de 960×540.
- Técnica recomendada: dibujar con formas vectoriales en un lienzo aparte y luego **pixelar**. El pixelado tiene tres pasos: umbral de alfa (todo píxel queda 0 % o 100 %), acercar cada color al más cercano de una paleta limitada por escena (24–40 colores), y un contorno oscuro de 1 px de color, no negro puro (*selout*). Las sombras van por bandas, con algo de tramado (*dither*) en los degradados grandes (cielo, niebla). Así se ve pixel art detallado, no un dibujo borroso.
- La ciudad sigue la paleta gris y desaturada del juego, con garúa y cielo panza de burro.
- **Alexander** se ve igual que en el juego (sacar los colores de `js/sprites.js`): 20–23 años, piel morena, pelo negro, short, sandalias, camiseta de rayas azules y blancas **sin escudo**, la guitarra a la espalda en T1 y asomando por el hombro en T3.
- **Titina** es una paloma gris común, con el cuello tornasolado verde y morado.
- **Expresión en T3:** cejas fruncidas, heroicas, mentón arriba, la mirada a lo lejos. Lo cómico va en los detalles: las fosas de la nariz un poco abiertas, media sonrisa de lado, un diente algo chueco, la camiseta grande que flamea. La cabeza ocupa unos 230 px de alto. El encuadre va de la cintura para arriba, con la cámara baja, así que la mandíbula y el mentón se ven grandes y el cielo queda detrás.

**Panorama, de izquierda a derecha:**
- El cerro San Cristóbal con su cruz, y el Rímac.
- El Cercado (cúpulas y torres antiguas).
- Breña y Pueblo Libre, bajos y grises.
- Jesús María, con un parque grande.
- Lince.
- San Isidro, con torres de vidrio.
- Miraflores: torres sobre el acantilado de la Costa Verde, un faro, dos parapentes y la luz verde.
- Barranco, con casonas bajas.
- Chorrillos y el Morro Solar con su cruz.
- A la derecha del todo, el mar y la Isla San Lorenzo.
- **En la capa cercana:** el borde del cerro, techos de calamina, cables, ropa tendida.
- **Señales del apocalipsis:** columnas de humo, un par de incendios lejanos y la Vía Expresa vacía con autos abandonados. Miraflores se ve más limpio y tiene esa luz.

**Mapa:** es UI, así que va en **estilo afiche chicha**: fondo negro y bordes fluorescentes (rosado `#ff2e88`, amarillo `#ffe500` y verde `#1fe07a`), con trazo grueso y algo de textura de afiche impreso.
- **Bloqueado:** gris oscuro con tramado, un candado y una cinta.
- **Disponible:** relleno amarillo que late suave, borde rosado, la luz verde y un sticker de «¿cura?» como dibujo, sin letras.
- **Visitado:** verde, con un check.
- El mar va a la izquierda (al oeste). Las posiciones relativas son las reales, simplificadas:
  - `callao` (start, no se escoge) está al oeste, junto al mar.
  - Bajando por la costa: `san-miguel`, `magdalena`, `san-isidro` (que toca un poco la costa), `miraflores`, `barranco` y `chorrillos`.
  - Tierra adentro: `pueblo-libre` (al este de Magdalena), `jesus-maria`, `lince` (al este de Jesús María), `la-victoria` (al este de Lince), `surquillo` (al este de Miraflores), `brena`, `cercado` (al noreste) y `rimac` (al norte del Cercado, cruzando el río).
- El río Rímac es una línea que baja al mar.

Ids y nombres: `san-miguel` San Miguel · `magdalena` Magdalena · `pueblo-libre` Pueblo Libre · `jesus-maria` Jesús María · `lince` Lince · `san-isidro` San Isidro · `miraflores` Miraflores · `barranco` Barranco · `chorrillos` Chorrillos · `surquillo` Surquillo · `la-victoria` La Victoria · `brena` Breña · `cercado` Cercado de Lima · `rimac` Rímac · `callao` Callao.

## Música: `js/audio/himno.js` → `ACH.audio.himno`

```
ACH.audio.himno = {
  start(),        // empieza el tema en t = 0. Usa ACH.audio.ctx y el bus de música (ACH.audio.bus.music) si existen; si no, su propio AudioContext hacia el destino.
  t(),            // segundos desde start (la línea de tiempo del motor se sincroniza con esto si hay audio)
  toMap(fade),    // pasa al bucle del mapa con un fundido cruzado de fade s (por defecto 1)
  stop(fade),     // silencio con fundido
  unlock()        // reanuda el contexto (llamar desde un gesto del usuario)
};
```

**El tema (18 s, compases según la tabla de arriba):**
- **Comp. 1–2, T1:** viento. Una **quena** sola toca una frase pentatónica menor de aire andino, libre y con aliento. Lleva soplo de ruido, vibrato y un portamento corto. Debajo, el trémolo de un **charango**.
- **Comp. 3–6, T2:** entra el **vals criollo**:
  - guitarra con bordones (las corridas de bajo típicas del vals) y rasgueo en 2 y 3;
  - cajón peruano;
  - la quena y una segunda guitarra hacen la melodía.
  - Va creciendo.
- **Comp. 7–11, T3:** **modula a mayor** y se vuelve heroico:
  - cuerdas de pad;
  - metales sintetizados (trompeta y trombón);
  - redoble de timbal;
  - la melodía en unísono de quena y guitarra;
  - un acento fuerte en el **primer tiempo del comp. 9 (12,0 s)**, para «MIRAFLORES».
  - Un guiño cómico: en el comp. 11 (≈15,6 s) un pequeño arrullo de paloma sintetizado («grrú»).
- **Comp. 12, T4:** cadencia final y golpe de cajón con platillo en 16,5 s, y la resonancia se apaga.
- **Bucle del mapa:** un vals suave de guitarra y charango, sin percusión fuerte, de 8 compases que se repiten sin costura.

La síntesis debe sonar realista, como en `js/audio/musica.js` (leerlo para reusar ideas: cuerdas pulsadas tipo Karplus-Strong, envolventes, reverb). Composición original. El nivel tiene que estar parejo con la música del juego: el pico a −3 dBFS y sin recortes.

## Motor: `js/cine/cima.js` → `ACH.cima`

```
ACH.cima = {
  play(opts),          // opts = {parent: elemento (por defecto #stage o body), onChoose(id), onDone(), skipIntro: false}
                       // Crea su capa encima de todo (lienzo de 960×540 + capa HTML), corre la línea de tiempo y luego el mapa.
  showMap(opts),       // directo al mapa (por ejemplo, al volver a la cima más adelante)
  close(),
  progress(),          // {visited: [...], unlocked: [...]} guardado en localStorage 'achorado.distritos.v1' (con try/catch; sin almacenamiento, funciona en memoria)
  markVisited(id),     // marca un distrito como visitado y desbloquea el siguiente de ORDEN
  ORDEN: ['miraflores','barranco','chorrillos','surquillo','san-isidro','lince','magdalena','san-miguel','jesus-maria','pueblo-libre','brena','la-victoria','cercado','rimac'],
  debug: { unlockAll(), reset(), at(t), freeze(bool) }
};
```

**Estado inicial:** solo `miraflores` está desbloqueado. El orden de `ORDEN` es provisional; el dueño lo decide después.

**Línea de tiempo y cámara:**
- **Reloj:** la toma sale de `ACH.audio.himno.t()` si está sonando; si no, de `performance.now()`.
- **Fundidos:** de 0,3 s entre tomas.
- **T2:** la cámara usa `camX` con aceleración y frenado, y termina con Miraflores a un 58 % del ancho.
- **Etiquetas de distrito:** son HTML y siguen a `pano.labels` con la cámara. Aparecen con un pequeño rebote y salen por el borde.
- **T3:** el motor calcula `s`:
  - `push` va de 0 a 1 entre 9 y 16,5 s;
  - `bag` va de 0 a 1 entre 13 y 14,6 s;
  - `drop` va de 0 a 1 entre 14,4 y 14,8 s;
  - `eyes` es `blink` y `mouth` es `scrunch` entre 14,8 y 15,3 s;
  - `titina` es `puff` desde los 10 s y `look` a los 15,6 s;
  - `ray` va de 0 a 1 entre 9 y 11 s.
- **Pensamientos:** se escriben letra por letra a unas 28 letras/s con un pequeño «tic» opcional, y se borran con fundido.

**Mapa (a partir de los 18 s):**
- **Título:** «¿A DÓNDE, CAUSA?» arriba, en `Bungee` amarillo con sombra rosada.
- **Nombres:** van en HTML, sobre `map.districts[id].label`.
- **Mouse y toque:**
  - pasar por encima resalta el distrito;
  - clic o toque lo escoge.
- **Teclado:**
  - las flechas o WASD van al distrito vecino más cercano en esa dirección (buscando entre los centros de las etiquetas);
  - Enter escoge.
- **Distrito bloqueado:**
  - el distrito tiembla y suena un «tunc»;
  - sale un aviso con una frase al azar: «Ahí todavía no, causa.», «Primero lo primero, compare.», «Tranquilo, que Lima no se acaba hoy.»
- **Miraflores disponible:** sale una tarjeta chicha con:
  - «MIRAFLORES»;
  - «Distrito pituco. Dicen que ahí está la cura.»;
  - los botones [¡VAMOS!] y [Todavía no].
  - ¡VAMOS! llama a `onChoose('miraflores')`.
- **Arreglo visual:** es pantalla de juego, no de web, así que va con bordes de cinta adhesiva y estilo afiche como el resto de la UI de `css/game.css` (leerlo y reusar las variables).

**Vista previa (`cima.html`):** carga `css/cima.css`, `js/sprites/cine.js`, `js/audio/himno.js` y `js/cine/cima.js`. Hace esto:
- Muestra una portada chicha «ACHORADO — La cima (vista previa)» con un botón grande «▶ VER LA CINEMÁTICA». Ese clic desbloquea el audio.
- Corre la cinemática y el mapa.
- `onChoose` muestra «MIRAFLORES — próximamente» con los botones [Repetir] y [Volver al mapa].
- **Parámetros de URL para QA:**
  - `?t=12`: empieza en ese segundo;
  - `?map=1`: directo al mapa;
  - `?freeze=1`: congela el cuadro (con `?t=` sirve para capturas);
  - `?unlock=all`: todo desbloqueado.
- Funciona en el teléfono en horizontal.

`build-cima.sh` hace lo mismo que `build.sh` (copiar su función `inline`), pero con `cima.html` → `dist/cima.html`, un solo archivo.

## Integración (después, cuando la parte 2 tenga su cima)
El nivel del cerro, al llegar a la cima, hará esto:
1. Pausar el juego y bajar su música.
2. Llamar a `ACH.cima.play({onChoose: id => cargar el distrito})`.

Lo único que hay que tocar es una línea en `index.html` (los 3 scripts) y el disparo en el código del nivel. Eso se hará cuando la otra sesión termine, no ahora.

## Hecho cuando
- `dist/cima.html` se abre en el navegador sin errores en la consola. La cinemática dura 18 s ± 0,3, con las 4 tomas, los textos en su momento, la bolsa, la gota, el «¡Grrú!» y la música en sincronía.
- En el mapa, solo Miraflores se puede escoger, los demás muestran su aviso, y el teclado, el mouse y el toque funcionan.
- El arte grande se ve como pixel art nítido y detallado, sin borrosidad ni antialias en los bordes.
