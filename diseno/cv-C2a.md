# C2a — Arte del malecón de Costa Verde

**Archivo:** `juego/js/costaverde/arte-malecon.js` (único escritor: C2a). **Prueba:** `juego/preview-cv-malecon.html` (`?sec=tiles|props|vista|quebrada|todo&pz=2&only=beso,faro&camX=…`).
Todo vive en `ACH.sprites.cv.malecon` (`M`). Requiere `js/sprites/base.js` (usa `ACH.px`); funciona sin `sprites.js`. Script clásico, un IIFE, sin dependencias de otros archivos de arte.
Se hornea todo una vez al cargar: **~250 ms** en total (la vista es la mitad: ~115 ms). Sin `getImageData` en el bucle, sin `shadowBlur`/`filter`, sin degradados por cuadro. Los lienzos se crean con `px.canvas` (que `lienzo.js` ya parcha a memoria).
Luz NO, sombras SE (`shadowSE` ya viene dentro de cada sprite con `shadowIn = true`: **el motor no debe proyectar otra sombra**).

Utilidades: `M.check()` devuelve las claves del contrato que falten (hoy `[]`). `M.meta[clave] = {n, w, h, ax, ay, fw, fh}`. `M.provided` lista contrato y extras. `M.timing`, `M.bakeMs`.

## 1. Convenciones de los props (las mismas de `arte-parque.js`)
- Canvas con `ax, ay` = punto de los pies (centro de la base) y `fw, fh` = huella en px (ancho y profundidad hacia arriba desde `ay`). Todos con contorno oscuro de 1 px.
- `tall: true` = se dibuja delante de Alexander cuando él está detrás (ordenar por `ay`). `tree: true` + `canopy {x,y,w,h}` (relativo al ancla) = copa que se vuelve translúcida sobre Alexander.
- `lamp {x,y}` (relativo al ancla) = punto de luz; `.dark` = poste apagado/roto. `emit[]` = fuentes de luz de noche (faro, chimeneas).
- `.broken` = variante rota (`basureroCV`, `cartelMiraflores`, `parapenteCaido`).
- `solid: true` = el arte sugiere pared sólida (`parapeto`, `parapetoPilastra`, `barandaPuente`, `muroMosaico`, `solMosaico`); la colisión la pone el mapa.
- Los canvas incluyen la sombra: el ancho/alto del canvas es mayor que el del dibujo. Siempre dibujar en `(x - ax, y - ay)`.
- Los arreglos animados llevan `.fps` (`cabezaCondor` 3, `mangaViento.frames`): `v = floor(t * fps) % 3`.

## 2. Tiles (16×16, arreglos de variantes; elegir con hash de (col, fila))
| Clave | n | Notas |
|---|---|---|
| `pasto` | 6 | encajan entre sí |
| `pastoFlor` | 6 | flores rojas/rosadas/amarillas/violetas; el 5 es una cuadrícula de margaritas |
| `caminoLadrillo` | 4 | senderos rojizos, aparejo trabado de 8×4; el 2 tiene hierbitas |
| `ciclovia` | 4 | pavimento rojizo-rosado. 0, 1 lisos; **2 = pictograma de bici; 3 = flecha**. Poner lisos casi siempre |
| `veredaCV` | 6 | 0 liso, 1 aparejo trabado, 2 mancha de humedad, 3 grieta, 4 hojitas, 5 chicle |
| `adoquinLetonia` | 8 | **0–3 amarillo, 4–5 rojo (el círculo del tótem), 6–7 gris oscuro (borde)** |
| `losa` | 4 | cemento pintado verde azulado; 0 y 1 lisas (usar mucho), 2 grieta, 3 pintura gastada |
| `losaLinea` | 10 | 0 línea horizontal, 1 vertical, 2/3/4/5 esquinas **TL/TR/BL/BR**; **6/7/8/9 = cuartos del círculo central TL/TR/BL/BR** (bloque 2×2; radio 16 px, el centro es el vértice común) |
| `mosaicoPiso` | 4 | trencadís de piso; encaja por los 4 lados |
| `pedestalBeso` | 4 | azulejo oscuro 8×8 con brillo |
| *extra* `tierraAmor` | 3 | tierra apisonada ocre de la plaza de las bancas |
| *extra* `losetaTerracota` | 3 | loseta rosada alrededor de El Beso y las gradas |
| *extra* `pastoCorazon` | 4 | **bloque 2×2 en orden [TL, TR, BL, BR]**: el parterre en forma de corazón (flores rojas y rosadas) |
| *extra* `bordilloAmarillo` | 1 | bordillo amarillo de la Bajada Balta, borde norte |

También disponibles como `M.tiles.<clave>`.

## 3. Props (tamaño del canvas con sombra · ancla · huella)
| Clave | n | Canvas | Ancla `ax,ay` | Huella `fw×fh` | Notas |
|---|---|---|---|---|---|
| `faro` | | 95×229 | 32,168 | 50×16 | torre azul marino casi negro con 2 franjas blancas, galería y linterna; `emit` en la lámpara. ~150 px de alto (comprimida) |
| `parapeto` | | 22×33 | 8,22 | 16×16 | segmento de ladrillo rojo de 16 px con tapa de concreto de 6 px. `.variants[3]` = tres tonos de ladrillo para no repetir |
| `parapetoPilastra` | | 29×54 | 10,37 | 18×16 | pilastra con capitel y bola; **ponerla cada 3 segmentos** (el `parapeto` es liso, sin pilastra, para poder repetirlo) |
| `farolCV` | | 52×95 | 20,72 | 6×4 | verde oscuro, globo blanco, 2 canastas de flores rojas. `lamp`, `.dark` |
| `bancaCV` | | 40×36 | 17,25 | 30×7 | listones verdes, fierro negro |
| `basureroCV` | | 30×34 | 11,23 | 12×8 | verde, pegatina con hoja. `.broken` = caído con basura |
| `bebedero` | | 30×47 | 11,32 | 12×6 | pilar de concreto con cubeta de acero |
| `cartelMiraflores` | | 78×62 | 35,48 | 56×4 | cartel verde con la hoja azul/verde/naranja y «MIRAFLORES / MALECON». `.broken` = partido y torcido |
| `palmeraCV` | 3 | 130×175, 118×145, 111×176 | 52,124 / 48,102 / 42,126 | 5×5 | 0 y 1 canarias (tronco de rombos, penacho ancho), 2 washingtonia. `tree`+`canopy` |
| `ficusCV` | 2 | 127×125 | 54,88 | 14×6 | copa redonda, tronco retorcido. `tree`+`canopy` |
| `setoCV` | | 39×26 | 17,17 | 30×6 | seto recortado |
| `flores` | 3 | 45×29 | 20,21 | 34×8 | cantero ovalado: 0 coleo vino/rosa, 1 amarillas, 2 blancas y rosadas |
| `beso` | | **267×219** | **116,150** | 214×36 | **12 m × 3 m a escala (192 px de largo)**. Cantero con seto y flores violeta/rosa, baranda de tubos óxido, plinto y columna de azulejo oscuro, losa en cruz y la pareja terracota tumbada (pies descalzos con las plantas hacia arriba a la derecha). Mira al mar (el sur). `.pedestal {x,y,w,h}` = la columna (sólida) relativa al ancla |
| `muroMosaico` | 5 | 102×95 | 44,69 | 84×9 | muro-banca ondulante de trencadís con asiento al frente y placa con frase. Frases (ACH5, con borde): 0 «ESTUPENDO AMOR / AMAR EL MAR» (Eielson), 1 «AMOR GRAN / LABERINTO» (Salazar Bondy), 2 «CANTA AMOR / DESNÚDATE» (Hinostroza), 3 «MI RECUERDO ES / MÁS FUERTE QUE / TU OLVIDO» (Salaverry), 4 «A TI COMO LA LUZ / DEL MUNDO A / LAS VENTANAS» (Rose). Cada canvas lleva `.phrase` y `.author`; `M.frases[i] = {lines, autor}` |
| `solMosaico` | | 102×95 | 44,69 | 84×9 | mismo muro con el sol de rayos rojo-naranja sobre disco azul |
| `cupido` | | 81×111 | 28,78 | 48×20 | escultura roja brillante (cabeza regordeta, arco con flecha y corazón) sobre disco de metal en cantero circular |
| `gradaAnfi` | | 151×121 | 68,92 | 124×66 | anfiteatro: 5 gradas en media luna que suben hacia el **norte**; escenario de losetas terracota al sur. Ancla en el centro del escenario |
| `casetaParapente` | | 115×102 | 44,74 | 84×12 | caseta de tablas con letrero «PARAPENTE», cartela «VUELOS TANDEM», toldo a rayas, carpa verde y banca |
| `mangaViento` | | 56×95 | 8,72 | 6×4 | roja y blanca; `.frames[3]` y `.fps = 3` (el canvas base = cuadro 1) |
| `parapenteCaido` | | 83×54 | 38,42 | 60×24 | vela desparramada con arnés y casco. `.broken` = rasgada |
| `maquinaGym` | 4 | 54×65 | 22,47 | 36×8 | 0 elíptica, 1 press de pecho, 2 jalón, 3 remo; verde y amarillo |
| `arcoFulbito` | | 73×67 | 32,50 | 48×8 | arco de 3 m×2 m **de frente (boca al sur)**: se coloca en el extremo **norte** de la cancha |
| *extra* `arcoFulbitoS` | | 73×67 | 32,50 | 48×8 | el mismo arco **visto por detrás** (red al frente): extremo **sur** |
| *extra* `arcoFulbitoE` / `arcoFulbitoO` | | 43×119 | 12,94 / 30,94 | 28×80 | arco **de perfil**: `E` tiene la boca al este (extremo **oeste** de la cancha), `O` la boca al oeste (extremo este) |
| `rejaCancha` | | 24×54 | 8,40 | 16×3 | segmento de reja olímpica de 16 px, de frente |
| *extra* `rejaCanchaV` | | 20×77 | 4,58 | 6×16 | tramo norte–sur de la reja (de canto) |
| `gradaDeporte` | | 122×75 | 56,56 | 104×14 | graderías azules y blancas de 4 escalones con letrero «CLUB» |
| `intihuatana` | | 145×188 | 54,124 | 100×16 | concreto gris con huecos cuadrados, redondo y en U, cantero con coleos y agaves, placa azul con QR |
| `totemEspejo` | | 58×147 | 17,100 | 22×10 | 4 cubos facetados de acero pulido (cielo gris arriba, reflejo cálido abajo) sobre pedestal negro con QR |
| `pergolaOndulada` | 2 | 136×131 / 172×131 | 62,108 / 80,108 | 108×38 / 144×38 | techo de lamas de madera ondulante, postes de acero. El 1 es más largo y trae una banca. `tree`+`canopy` (el techo se vuelve translúcido) |
| `chimeneaVidrio` | | 90×191 | 28,140 | 48×10 | vela de vidrio azul con parantes blancos. **Usar 3 en fila.** `emit` azul de noche |
| `cabezaCondor` | 3 | 152×194 | 64,148 | 112×40 | pileta rectangular con agua en **3 cuadros (`.fps = 3`)**, monolito de bloques y cabeza de cóndor |
| `barandaPuente` | | 23×51 | 8,38 | 16×6 | segmento de 16 px: zócalo de concreto y panel de policarbonato translúcido |
| *extra* `cartelPeatones` | | 70×67 | 31,52 | 6×4 | cartel azul «PEATONES / RUTA ACCESO / 28 DE JULIO» |
| *extra* `puenteFaz` | | 361×72 | 176,56 | 352×8 | **cara sur del puente Villena Rey** (viga y tres arcos con pilares) para pegar al borde sur del tablero, columnas 150–171 |
| `parapenteCielo` | 4 | 56×44 | 28,37 (pies del piloto) | — | parapentes vistos desde atrás: celeste/naranja, menta, naranja/rojo, rosado/amarillo chicha |

## 4. Vista al mar: `M.vista`
```
M.vista.draw(ctx, camX, camY, t, W)
```
- **ctx sin traslación de cámara** (coordenadas de pantalla; `W` = ancho de la vista, 480 por defecto; el alto 270 va fijo adentro). `t` en segundos. `camX/camY` en px del mundo.
- Empieza en el **mundo y = 544 (fila 34)**, o sea, pegada bajo el parapeto, y mide **736 px** (hasta la fila 79). Si `camY + 270 <= 544` no dibuja nada.
- **Solo x tiene paralaje (0.85)**; y va fijo al mundo para que la unión con el parapeto no se separe. Tiras de 512 px que se repiten.
- Capas (v = px bajo el borde): 0–184 **acantilado** (tierra clara en estratos, enredadera verde que baja, **tres parches de malla verde**, palmeritas al pie, muro de contención) · 184–248 **Circuito de Playas** con 11 autos quietos (embotellamiento, uno es una combi blanca) · 248–304 **playa de canto rodado** con espigones de rocas · 296–736 **mar** en **3 cuadros** (a 3 cuadros/s, el ciclo cierra) con espuma, olas y bruma al fondo · una banda de **espuma de orilla** animada.
- Animados baratos (≈20 `drawImage` por cuadro): 8 surfistas que suben y bajan, 7 gaviotas (2 cuadros de aleteo), 2 pelícanos, 4 parapentes lejanos (`parapenteCielo`), y **La Rosa Náutica** de lejos (muelle blanco con techos cónicos lavanda, a x de vista ≈ 2790, o sea, cuando la cámara está frente a Intihuatana).
- `M.vista.clipOut(x0, x1)` oculta la vista en el rango de x **del mundo** (por ejemplo, donde Larcomar es caminable y el arte de C2b ocupa el lugar). `clearClip()` lo quita. Usa un `clip('evenodd')` solo si hay rangos.
- Propiedades: `y0, h, parallax, period`.
- **Orden de dibujo para C1a:** vista y quebrada son **fondo**: se dibujan **antes** de los tiles (los tiles de pasto no cubren las filas 34+, que no tienen tiles; en la quebrada no hay tiles salvo los del puente). Luego tiles, props y personajes.

## 5. La quebrada: `M.quebradaBalta`
```
M.quebradaBalta.draw(ctx, camX, camY, t, W)   // fija en el mundo (2400, 304): 352×424 px
```
- `x0, y0, w, h, cols [150,171], rows [19,45]`. Cubre las filas 19 a 45: arriba toca el sardinel de la fila 18 (muro de contención con baranda negra) y abajo **empalma exactamente con el Circuito de Playas de la vista (y = 728)**. Se dibuja después de `vista.draw` (la tapa) y antes de los tiles.
- Contenido: **Club Tennis Las Terrazas** en 3 terrazas con **6 canchas de arcilla** (líneas blancas, red, reja verde), muros turquesa, gradas azules, postes de luz, casa club con letrero «CLUB TENNIS» y piscina; **Bajada Balta** de adoquín con **bordillo amarillo** y faroles dobles, que baja y se abre hacia la playa; taludes con enredadera y flores naranjas, **escaleras diagonales** de concreto y palmeritas. **Dos tenistas y una pelota** se mueven (animación barata, con `t`). La banda de sombra de los puentes cae en y = 112–180 del lienzo (filas 26–29 del mundo): si C1a pone los puentes en otras filas, mover filas o avisar.
- **Los tiles de los puentes** (tablero) los pone el mapa encima; usar `veredaCV`/`ciclovia`/asfalto + `barandaPuente` a los lados + `puenteFaz` pegado al borde sur del tablero.

## 6. Lo que cumple del contrato (`COSTAVERDE.md` 10.1)
Todas las claves de tiles, props, `vista`, `quebradaBalta` y `parapenteCielo[4]` existen (`M.check()` = `[]`). Diferencias y decisiones:
- `parapeto` es el segmento **liso**; la pilastra va aparte (`parapetoPilastra`).
- `muroMosaico` y `solMosaico` llevan `.solid`; el asiento sale al frente (huella de 84×9).
- Los arcos de fulbito son 3 (frente, atrás y perfil E/O) porque el ángulo 3/4 no deja dibujar una boca de lado igual que de frente.
- `beso` es enorme (267×219 con sombra). Si cuesta cámara, la ruta pasa al sur de él (mar), no tiene que subirse.

## 7. Problemas conocidos / pendientes
- La vista no tiene paralaje vertical, a propósito (la unión con la fila 33 tiene que quedar fija). Con `camY` muy bajo se ven las tiras entera: no hay cielo ni horizonte (el mar termina en bruma).
- El horneado total es ~250 ms; si molesta, la vista y la quebrada se pueden hornear perezosamente (hoy son lo único pesado).
- Las palmeras canarias podrían tener un penacho más tupido; el tótem y el sol reflejan colores aproximados de las fotos.
- `ACH.sprites.cv.malecon` expone claves de más (`tiles`, `frases`, `meta`…): el motor debe ignorarlas.
- No probé la integración en el motor (`costaverde.html` aún no existe); solo la página de prueba.
