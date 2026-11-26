# Barranco · fase B2b · casonas, fachadas de bares/peñas y la peña por dentro

Archivos escritos: `juego/js/barranco/arte-casonas.js` (~970 líneas), `juego/preview-br-casonas.html`, este documento.
Contrato: `BARRANCO.md` §10.2. Investigación: `investigacion-barranco.md` (§2.7 casonas, §3 locales y parodias, §6.5 y §8 peña y noche).
Probado en el Browser pane (puerto 8735, ya apagado). Sin errores de consola; cargado también dentro de `barranco.html` (el módulo y los 6 lotes se registran bien). Horneado: fachadas ~1 ms cada una (día+noche), tiles+props ~5 ms.
Solo depende de `ACH.px` (base.js). Sin `getImageData`/`shadowBlur`/`filter`. Letras solo a5/a7/a12.

## API real (`ACH.sprites.br.casona`)
| Clave | Qué es |
|---|---|
| `fachada(brand, wTiles)` | `{ cv, ax, ay, lights, noche }`. `cv` = lienzo de día; `noche` (y `cv.noche`) = mismo local con ventanas, letrero y focos encendidos (misma estructura). `ax = ancho/2`, `ay = alto` (la base pisa el suelo). Alto: **64** (una planta), **96** (dos plantas), **112** (`ultimaJarana`). `wTiles` se acota a 4–16 (`ultimaJarana` mínimo 9). Cache por marca+ancho+modo. `lights = [{x,y,w,h,kind:'local'\|'foco',col}]` en px del lienzo (igual que los lotes). |
| `brands`, `brandName(id)`, `defaultTiles` | ids, nombre según el modo, ancho recomendado en tiles por id. |
| `tiles` / `props` | todo repetido plano (`casona.mesaPena`, `casona.pisoPena`…). |
| `bake()`, `bakeMs`, `epoch` | `epoch` sube con cada `ACH.px.setMarcas`. |
Modo real/parodia: lee `ACH.cfg.marcasReales`; el cache lleva el modo en la clave, así que tras `ACH.debug.marcas()` / `render.rebake()` quien hornea vuelve a pedir `fachada()` y recibe el otro modo. Las 3 inventadas no cambian.

## Fachadas (25). Real → parodia (alto × ancho recomendado)
Las marcas son aproximaciones de color/forma (la investigación no tiene fotos); los rótulos de los reales son texto pintado, **no** logos oficiales.
| id | Real | Parodia | Alto × ancho (tiles) | Notas de arte |
|---|---|---|---|---|
| `cala` | CALA | CALAVERA | 64 × 7 | terraza abierta, toldo azul-blanco, tabla azul, pez |
| `javier` | JAVIER / RESTAURANTE | JABIEL EL BAJADERO / FRENTE AL MAR | 64 × 7 | terraza, rótulo pintado, buganvilia |
| `posadaMirador` | LA POSADA DEL MIRADOR | + DE MUERTOS | 96 × 7 | balcón abierto, postigos verdes, faroles |
| `tioMario` | EL TÍO MARIO / ANTICUCHOS | + CARBONIZADO | 64 × 5 | ventana de parrilla con brasas, toldo rojo, llama |
| `picas` | PICAS | PICAS DEL MÁS ALLÁ | 64 × 5 | (sin confirmar en la investigación) |
| `cantaRana` | CANTA RANA | CANTA RANA PODRIDA | 64 × 5 | placa verde con rana, vitrina de pescado |
| `ayahuasca` | AYAHUASCA / RESTOBAR | CASONA TUÉTANO / RESTOBAR | 96 × 8 | casona oscura, letras blancas pintadas, balcón con barra. Parodia evita la planta, como pide §9 |
| `isolina` | ISOLINA / TABERNA PERUANA | ISOQUINA / TABERNA (ZOMBI) | 64 × 6 | ladrillo, tabla de madera |
| `juanito` | JUANITO / DE BARRANCO | JUANITO / DE BARRANCA MUERTA | 64 × 5 | ex farmacia: afiches, luz fría fluorescente |
| `oitaNoma` | OITA NOMÁ / PEÑA RESTAURANTE | OITA NO MATA | 96 × 8 | peña, balcón cajón, portón |
| `barrancoBeer` | BARRANCO BEER COMPANY | BARRANCO BIRRA MUERTA CO. | 64 × 6 | tanques de acero, jarra |
| `piselli` | BODEGA PISELLI | BODEGA PISOTELI | 64 × 6 | adobe muy descascarado, vitrinas de botellas |
| `estacion` | LA ESTACIÓN / DE BARRANCO | … DE BARRANCA-MUERTA | 64 × 6 | placa esmaltada tipo estación |
| `victoria` | VICTORIA BAR | VICTORIA MUERTA BAR | 64 × 5 | neón rosa |
| `donPorfirio` | PEÑA DON PORFIRIO | PEÑA DON PODRIDO | 96 × 8 | peña |
| `laOficina` | LA OFICINA / PEÑA CRIOLLA | LA OFICINA / DEL MÁS ALLÁ | 96 × 7 | peña, balcón abierto |
| `penaCarajo` | LA PEÑA DEL CARAJO | LA PEÑA DEL CEMENTERIO | 64 × 6 | peña de una planta (parodia sin la grosería) |
| `sargento` | SARGENTO PIMIENTA / ROCK BAR | SARGENTO PIMIENTO ZOMBI | 64 × 6 | negro, neón cian, afiches |
| `laNoche` | LA NOCHE | LA NOCHE ETERNA | 96 × 6 | casona azul noche, neón |
| `candelaria` | LA CANDELARIA | LA CANDELABRA | 96 × 7 | art déco: estrías y parapeto |
| `santos` | SANTOS / CAFÉ & ESPIRITUOSOS | SANTOS CADÁVER | 64 × 8 | |
| `floCanela` | LA FLOR DE LA CANELA | LA FLOR DE LA CANILLA | 64 × 6 | (sin confirmar) |
| `ultimaJarana` | PEÑA LA ÚLTIMA JARANA / VALS - FESTEJO - LANDÓ | (fija) | **112 × 11** | portón de 44 px con arco, 3 balcones de cajón, 2 guirnaldas de focos, farol doble, afiches. Siempre encendida de noche |
| `barLucho` | BAR LUCHO / TRAGOS Y JARANA | (fija) | 96 × 7 | puerta abierta con la barra a la vista, neón ámbar (nombre **inventado**) |
| `zaguanCeledonio` | ZAGUÁN / GUITARRAS | (fija) | 96 × 6 | casona ocre descascarada, zaguán en arco con lámpara, guitarra y banquito |
`wTiles` menor al recomendado recorta subtítulos largos (si no cabe en dos niveles, el rótulo pasa el nombre completo a 2 renglones en a5).

## Lotes (`ACH.sprites.lotArch.br_casona1..6`)
`function (ficha) → { canvas, over:null, overX:0, overY:0, lights, noche }`; la versión de noche cuelga también de **`canvas.noche`** (porque `buildLot` solo copia `canvas/over/overX/overY/lights`). Campos de ficha: `side 'N'|'S'`, `c0 c1 r0 r1`, `seed`, `face` (tiles de cara, por defecto 6, rango 4–7), `color` (opcional: crema, salmon, celeste, blanco, ocre, verde, mostaza, rosa → cambia la pared). Lado N = azotea/techo arriba + cara sur abajo; lado S = solo el techo visto desde arriba. `lights` = ventanas encendidas (`kind:'local'`, con `w,h,col`) y focos de farol.
1 salmón, balcón cajón, teja, portón verde, buganvilia · 2 verde agua, balcón abierto, calamina · 3 mostaza, parapeto, 3 balcones cajón, portón con arco · 4 celeste con rejas y buganvilia cayendo, teja · 5 rosa viejo art déco, parapeto · 6 crema muy descascarada con puerta tapiada, tablones y calamina (abandonada).
Las azoteas traen tanque y ropa tendida; los techos de calamina, llantas y óxido.

## Interior de la peña (arena del jefe)
Tiles 16×16, 4 variantes cada uno: `pisoPena[4]` (tablas oscuras) · `pistaBaile[4]` (parquet pulido) · `pistaBaileOn[4]` (mismas 4 variantes, loseta «quemando»: naranja, centro blanco y borde rojo) · `tabladillo[4]` (**0** superficie, **1** borde frontal con cara vertical de 6 px, **2** borde izquierdo, **3** borde derecho).
Props (todos `ax/ay/fw/fh` + sombra SE horneada):
| Clave | Tamaño @ancla | fw×fh | Notas |
|---|---|---|---|
| `mesaPena` (+`.broken`) | 36×34 @18,29 (broken @18,32) | 30×10 | mantel blanco con camino rojo, vela, copas; rota = volcada |
| `sillaPena` (+`.broken`) | 16×24 @7,23 (broken @8,18) | 10×6 | |
| `barraPena` | 128×76 @64,76 | 116×14 | `tall`; espejo, repisas, azulejos, taburetes |
| `columnaPena` | 20×60 @10,56 | 14×6 | `tall`; adobe encalado con zapata de madera |
| `focoPena` | 18×56 @9,53 | 10×4 | `tall`, `lamp {x:0,y:-44}`; farol de pie |
| `cortinaEscenario` | 128×66 @64,65 | 128×4 | `tall`, sin sombra; telón rojo, fondo azul con guitarra dorada |
| `guirnalda` | 48×18 @24,8 | 48×4 | `air:true`, `lamp {0,-2}`, `lights[{x,y}]` (relativos al ancla); segmento que **encadena** horizontalmente |
| `cuadroCriollo[3]` | 22×30 @11,29 | 20×3 | `wall:true`; guitarrista, cajonero y bailarina de marinera, siluetas **sin cara**; sin personas reales |
Extras de calle (no pedidos): `mesaCalle` (30×28 @15,25, fw22 fh8) y `cartelPizarra` (24×26 @12,24, «HOY PEÑA», fw14 fh4).

## Preview
`juego/preview-br-casonas.html` (servir `juego/` en el puerto propio). Botones: MARCAS reales/parodia, HORA día/noche y «día y noche juntos». Parámetros: `?z=N`, `?solo=fachadas|lotes|tiles|props|arena`, `?b=id1,id2` (filtra fachadas), `?noche=1`, `?ambos=1`, `?parodia=1`. La sección `arena` arma una peña de prueba de 480×270.

## Notas para quien integra
1. `fachada()` va con la base en el piso: se dibuja en `(x - ax, y - ay)`. Las luces pasan a mundo con `x + (X - ax)`, `y + (Y - ay)`. Todas las fachadas tienen contorno oscuro de 1 px y base de vereda de 4 px.
2. `.noche` es opcional: el motor ya enciende ventanas con `lights[]` (los `local` con `w,h,col` brillan como las ventanas de Larcomar). Quien quiera la versión «con luces horneadas» cambia `f.cv` por `f.noche` de noche.
3. La peña por fuera es `fachada('ultimaJarana')` (11 tiles = 176 px; el portón de 44 px queda al centro, tiles 5-7). La arena usa los tiles; `pistaBaileOn[i]` debe pintarse sobre `pistaBaile[i]` con el mismo `i`.
4. Todo se hace una sola vez en `bake()`/primera petición; no se dibuja nada por cuadro.

## Pendiente / límites
- Marcas y fachadas reales son interpretaciones (la investigación no trae fotos). Letreros de «sin confirmar»: Picas y La Flor de la Canela.
- Las fachadas miran de frente al sur; si el nivel pone locales en una pared este/oeste hace falta otra vista.
- No hay `over` (capa alta): balcones y guirnaldas van dentro del lienzo; los zombies pasan por delante.
- `pisoPena[2]` (mancha de bebida) se nota si el mundo lo repite mucho: mezclar con las otras 3 variantes.
