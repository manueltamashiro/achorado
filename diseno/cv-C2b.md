# Costa Verde · fase C2b · arte de Larcomar y del lado tierra

Archivos de esta fase (únicos escritos): `juego/js/costaverde/arte-larcomar.js` (~1520 líneas), `juego/preview-cv-larcomar.html`, este documento.
Contrato: `COSTAVERDE.md` §10.2. Fuente de datos: `investigacion-larcomar.md` y `investigacion-costaverde-malecon.md` §5.
Probado en el navegador del panel (puerto 8715, ya apagado): sin errores de consola. Horneado: fachadas ~10 ms por modo, tiles + props ~6 ms.

## API real (`ACH.sprites.cv.larco`)
Solo necesita `ACH.px` (base.js). Si falta, el archivo no hace nada. Los lienzos salen de `G.toCanvas()`, que `lienzo.js` ya manda a memoria.

| Clave | Qué es |
|---|---|
| `fachada(brand, wTiles)` | `{ cv, ax, ay, lights }`. `cv` mide `wTiles*16 × 64` (el Gran Dragón `× 96`). `ax = ancho/2`, `ay = alto` (la base pisa el suelo de la terraza). `wTiles` se acota a 3–20 (Gran Dragón mínimo 5). `lights = [{x,y,w,h,kind:'local'\|'foco'}]` en px del lienzo (esquina sup. izq.), el mismo formato que los lotes. Con cache por marca + ancho + modo. |
| `brands`, `brandName(id)` | Los 23 ids y su nombre según el modo actual. |
| `tiles` | `pisoLarco[4]`, `deck[4]`, `escalera[3]`, `paredRoca[4]`, `pisoChifa[4]` (16×16). |
| `props` | Ver abajo. |
| (todo plano) | Cada tile y cada prop también cuelga directo de `larco` (`larco.pisoLarco`, `larco.barandaVidrio`…). |
| `bake()`, `bakeMs`, `epoch` | Re-hornea tiles y props. `epoch` sube con cada cambio de modo de marcas. |

- **Ids de fachada (`brand`):** nike, bananarepublic, tanta, mangos, koasian, popular, bonbonniere, fridays, pardos, cinepolis, hm, miniso, adidas, starbucks, freddo, cinnabon, salazar, haagendazs, masterkong, kiosco, deportes, fuente, granDragon. Un id desconocido sale como un kiosco genérico.
- **Anchos recomendados:** 4 a 6 tiles para las tiendas, 8 para Cinépolis y Salazar, 7 o más para el Gran Dragón.
- **Modo real / parodia:** lee `ACH.cfg.marcasReales` al pedir la fachada. El cache lleva el modo en la clave: al alternar con `ACH.px.setMarcas` / `ACH.debug.marcas`, quien hornea el suelo (`render.rebake`) vuelve a pedir `fachada()` y recibe el lienzo del otro modo sin recalcular. `salazar`, `kiosco`, `deportes`, `fuente` y `granDragon` no cambian de nombre.
- **Props** (todos con `ax/ay/fw/fh`, sombra SE horneada con `shadowIn:true`, y `tall:true` los altos):
  - `barandaVidrio` (segmento de 16 px; vidrio traslúcido) · `letreroLarcomar` (184×50; con `lamp`) · `escaleraMecanica` (quieta, con cono de fuera de servicio) · `macetaLarco`;
  - `sombrillaTerraza` (`.broken`, con `canopy` para el fundido) · `mesaSalazar` (`.broken`) · `barCentral` (letrero ISOLA BAR) · `farolRojo` (con `lamp`);
  - `mesaRedonda` (`.broken`) · `pecera` (`.broken`) · `rejaChifa` (cerrada; `.open` abierta con las hojas a los lados) · `casetaTandem` · `vaporeraGrande` (con `smoke`).
- **Lotes del lado tierra:** `ACH.sprites.lotArch.cv_torre`, `cv_casona` y `cv_hotel`. Formato de los de Miraflores, `function (ficha) → { canvas, over:null, overX:0, overY:0, lights }`, probados con `ACH.sprites.buildLot`.
  - Campos de ficha: `side 'N'|'S'`, `c0 c1 r0 r1`, `seed`, `floors`, `face`, `name`, `color`.
  - `cv_torre`: `color` ∈ `teal` (por defecto, vidrio con franjas doradas, lobby con marquesina y macetas), `crema`, `salmon`, `blanco`, `azul`, `gris` (pintadas con balcones). `name` va en una placa sobre la marquesina.
  - `cv_hotel` (JW Marriott): torre curva, `f.name` en placa dorada, podio con porte-cochère y banderas. El lado S trae helipuerto.
  - `cv_casona`: neocolonial con teja, balcón cajón de madera, portal en arco y rejas. `color` ∈ `crema`, `salmon`, `celeste`, `blanco`, `ocre`.
  - Cara visible por defecto: torre y hotel `rows-2` (hotel `rows-1` si `rows≥9`), casona 6 tiles. Con 10 filas se ve la azotea con tanque, aire acondicionado y antena.

## Cómo se ve cada marca (aproximación en píxeles, colores de la investigación)
- **Nike:** swoosh negro + NIKE sobre blanco. **H&M:** rojo grueso con `&` dibujado a mano, porque a12 no lo trae. **Starbucks:** círculo verde con sirenita. **Cinépolis:** letrero azul, marquesina con focos, afiches iluminados y portal de vidrio. **Pardos:** gallo y PARDOS CHICKEN. **T.G.I. Friday's:** rayas rojas y blancas con placa negra. **Häagen-Dazs:** granate y dorado (la Ä se dibuja con dos puntos). **Tanta:** crema y rojo con terraza de madera. **Mangos:** naranja con mango y toldo verde. **Popular:** verde azulado. **KO Asian:** negro con sello rojo y farolitos. **La Bonbonniere:** rosa y crema con vitrina de pasteles. **Banana Republic:** negro y caqui. **Miniso:** rojo con carita. **Adidas Originals:** negro con trébol. **Freddo:** azul con cucurucho. **Cinnabon:** rojo con rollo de canela. **Master Kong:** rojo con cara de chef, farolitos y vaporeras. **Salazar Food & Drinks:** salón abierto con barra central a la vista (ISOLA BAR), lámparas colgantes y mesas.
- **Inventadas:** Kiosco Larcomar (madera y toldo celeste), Deportes Malecón (verde), Fuente de Soda (menta y rosado retro).
- **CHIFA GRAN DRAGÓN** (el local del jefe): tejado de tejas oscuras con borde dorado, ménsulas verdes, letrero negro y rojo («CHIFA» sobre «GRAN DRAGÓN» en dorado), columnas rojas, celosías doradas con farol encima, faroles grandes y un portón de dos hojas con tachuelas y una cabeza de dragón dorada en cada hoja. Los nombres largos pasan a 2 renglones en a5 si no caben.

## Notas para quien integra
1. **Anclaje:** `fachada` va con la base en el piso. Se dibuja en `(x - ax, y - ay)`, con `y` = la fila de la pared norte de la terraza más abajo (donde empieza el suelo).
2. **Pared de terraza:** el sprite cubre todo su alto (64, o 96 el Gran Dragón). Si la pared es más alta, el relleno es `paredRoca`. Bajo el Gran Dragón (96 px = 6 tiles) conviene reservar esas filas.
3. **Luces:** `lights` va en px del lienzo, igual que los lotes. Para el motor de luces conviene pasarlas a mundo con `x + (X - ax)`, `y + (Y - ay)`.
4. **`escalera[3]`:** 0 = peldaños al centro, 1 = baranda de madera a la izquierda, 2 = baranda a la derecha. Es una escalera que baja hacia el sur (pisos de 4 px con la contrahuella oscura).
5. **Carga:** `costaverde.html` debe cargar `arte-larcomar.js` después de `base.js` y `marcas.js`, en el orden de §1.2 (4). No depende de `arte-negocios.js` ni de `arte-malecon.js`: ambos pueden faltar. Si falta `ACH.px.onMarcas`, el modo igual se lee en cada pedido.
6. **`ACH.mira.marcas` (de `arte-negocios.js`) no se usa:** esas son las marcas de la Calle de las Pizzas. Aquí hay una tabla propia (`NAMES`) para no pisar nada.

## Pendiente / límites conocidos
- Las marcas son aproximaciones de silueta y color, no logos oficiales: dejan de ser reconocibles por debajo de ~14 px de alto del letrero.
- `fachada` solo mira de frente. Si el nivel pone tiendas en la pared este o oeste, hace falta otra fachada.
- No hay `over` (capa alta) en las fachadas: los toldos y volados van dentro del propio lienzo, y los zombies pasan por delante.
- Las parodias se prueban en el preview (`?parodia=1` o la sección del modo parodia): todas caben en su letrero. `H&N`, `T.G.I. JUEVES` y `K.O. ASIÁTICO` usan los mismos colores del real.
- La cabeza de dragón es pequeña (23×15): a 1× parece un gato dorado con bigotes. A 3×, con el zoom del juego, se lee como dragón.
- El suelo `pisoLarco` es de losetas de 8×8 en 16×16 y, repetido, se nota la cuadrícula. Se puede mezclar con las 4 variantes al pintar.

## Preview
`juego/preview-cv-larcomar.html` (servir `juego/` en 8715): todas las fachadas en modo real y parodia, tiles y su repetición, props con `.broken` y `.open`, lotes N y S, y una escena de prueba de la terraza A. Parámetros: `?z=N` (zoom), `?solo=fachadas|tiles|props|lotes|escena`, `?b=nike,hm` (filtra fachadas), `?parodia=1`.
