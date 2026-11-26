# B2a — Arte de lugares de Barranco

**Archivo:** `juego/js/barranco/arte-lugares.js` (único escritor: B2a). **Prueba:** `juego/preview-br-lugares.html` (`?sec=tiles|props|fondos|morro|lotes|escena|todo &z=3 &pz=2 &only=clave &hora=0..1`; escenas: `?sec=escena&esc=playa|bajada|puente|parque &noche=1`).
Todo vive en `ACH.sprites.br.lugar` (`L`) + `ACH.sprites.lotArch.br_biblioteca / br_iglesia`. Requiere solo `js/sprites/base.js` (`ACH.px`). Script clásico, un IIFE, sin dependencias de otros archivos de arte.
Se hornea todo una vez al cargar (~180–300 ms en una máquina libre; el cielo con skyline se hornea al primer uso). Sin `getImageData` en bucles (solo `px.shadowSE` al hornear, como Costa Verde), sin `shadowBlur`/`filter`/degradados por cuadro. Luz NO, sombras SE horneadas dentro del sprite (`shadowIn = true`: el motor no debe proyectar otra).
Utilidades: `L.check()` (claves del contrato que falten, hoy `[]`), `L.meta[clave] = {n,w,h,ax,ay,fw,fh}`, `L.provided`, `L.timing`, `L.bakeMs`, `L.errores` (fallos de horneado, vacío si todo bien).
Probado dentro de `barranco.html` (B1a ya lo usa): playa, Bajada, Ermita de noche, todo carga sin errores.

## 1. Convenciones (las de Costa Verde)
Canvas con `ax,ay` = pies y `fw,fh` = huella. `tall` = se dibuja delante de Alexander. `tree`+`canopy {x,y,w,h}` (relativo al ancla). `lamp {x,y}` relativo al ancla. `emit[] {x,y,kind:'ventana'|'brasa',r,col}` (relativo al ancla). `.broken` variante rota. **`.noche`** = variante horneada con ventanas/focos encendidos (el `emit` va en la base y en la `.noche`). `solid:true` = el arte sugiere pared (la colisión la pone el mapa). Los canvas incluyen su sombra: dibujar siempre en `(x - ax, y - ay)`. Arreglos animados llevan `.fps` y/o `.frames`.

## 2. Tiles 16×16 (arreglos; elegir por hash de (col, fila)). También en `L.tiles.<clave>`
| Clave | n | Notas |
|---|---|---|
| `canto` | 6 | canto rodado/guijarro (piedras con luz arriba-izquierda); 3 y 4 piedras grandes. Encajan (toroidal) |
| `arena` | 4 | arena gruesa gris-beige (franja entre playa y pista) |
| `orilla` / `orilla2` | 3+3 | **mar a la izquierda** (agua \| espuma \| piedras mojadas); son los **3 cuadros de la animación** (`.fps = 3`: `v = floor(t*3)%3`); `orilla2` es la otra forma de línea de costa |
| `adoquin` | 8 | ladrillo rojizo de la Bajada, aparejo trabado 8×4; 0–3 liso, 2/5 con hierbitas, 3 mancha, **6–7 adoquín gris** |
| `escalon` | 8 | peldaños de piedra: **0–1 suben al N, 2–3 al E, 4–5 al O, 6–7 al S** (la contrahuella oscura es la cara visible); impares con desgaste y musgo |
| `tierraQuebrada` | 4 | tierra seca con piedritas y matitas |
| `pasto` | 6 | 2 con margaritas, 4 con flores amarillas, 5 pasto seco |
| `vereda` | 6 | cemento claro cálido; 4 con pétalos de buganvilia, 5 con hierbitas |
| `pista` | 6 | asfalto del Circuito de Playas (corre N-S): 0–1 liso (1 con grieta), **2 línea central amarilla vertical, 3 la misma horizontal, 4 borde blanco izq., 5 borde blanco der.** |
| `losetaParque` | 6 | granito claro 8×8; 2 = rombo de color (centro de la fuente), 3 desgaste, 4–5 juntas en diagonal |
| `tablasPuente` | 6 | tablas rojizas del Puente: 0–3 verticales, 4–5 horizontales |
| `pisoErmita` | 4 | lajas ocres gastadas con hierbitas |
| extra `mar` | 3 | agua para el mapa (la animación la pone `L.mar`) |
| extra `muro` | 4 | muro pastel de la Bajada (crema, salmón, agua, mostaza) con zócalo y desconchones |
| extra `muroPlaya` | 2 | muro de concreto de la playa |
| extra `tablasPeatonal` | 4 | losa de concreto del puente peatonal |
| extra `pistaCircuito` | 6 | = `pista` |

## 3. Fondos animados
**Hora:** `L.getHora()` → 0 atardecer dorado, 0.5 crepúsculo morado, 1 noche cerrada. Orden de fuentes: `L.setHora(h)` (fija; `setHora(null)` la suelta) > `ACH.br.hora` (función o número; B1a ya lo expone) > `ACH.noche.t` > 0. `nivel.js` además escribe `L.hora`. Todo lo de abajo se mezcla con alfa entre 3 horneados (0, 0.5, 1); nada por píxel en cada cuadro.

- **`L.mar.draw(ctx, camX, camY, t, W)`** (coordenadas de pantalla, mundo fijo). Pinta el mar **al oeste** dentro de `L.mar.rect = {x0:0, y0:0, x1:160, y1:1600}` (= las columnas 0–9 del mapa de B1a; cambiar con `L.mar.setRect(x0,y0,x1,y1)`). Degradado lejos→cerca, dos capas de ondas que corren en sentidos contrarios, **reflejo del sol** (atardecer) / de la luna y luces de la costa (noche) centrado en `L.mar.glintY` (mundo, por defecto 1180), **espuma que sube y baja** en la orilla (x1), gaviotas al atardecer. El borde de la espuma cae dentro de `x1` para que el recorte del mapa no la corte. Coste por cuadro: ~12 `drawImage` + `fillRect` recortados.
- **`L.morro.draw(ctx, camX, camY, t, W)`**: el **Morro Solar visto desde arriba** como cabo de tierra lejana y brumosa al pie del mapa, **mundo x 0..640, y 1488..1600** (se mueve con `L.morro.setPos(x0,y0)`), con camino en zigzag, casitas de Chorrillos, orilla con espuma y **la cruz blanca (Cristo) en la cumbre en `L.morro.cruz = {x,y}` (mundo)**; de noche **se enciende** (halo y 6 luces de colores que cambian) y aparecen las luces de Chorrillos. Lo pinta el mapa dentro del recorte de la banda de mar sur (filas 97–99) y de la banda oeste.
- **`L.cielo.draw(ctx, camX, camY, t, W)`** (extra, se hornea al primer uso): banda panorámica 1280×184 con **cielo panza de burro** (capa gris violácea rota cerca del sol), **sol de atardecer** que rompe a la izquierda (oeste), silueta del Morro con la cruz, mar a la altura del horizonte y acantilado de 12 px como borde; noche con estrellas, luna, luces. `L.cielo.y0` (por defecto 0), `setY0(y)`, `setMundo(ancho)` (paralaje = 1280 vs ancho del mundo). Sirve si B1a quiere un cielo/skyline en el tope del mapa; hoy no se usa.

## 4. Props (canvas con sombra · ancla · huella)
| Clave | n | Canvas | `ax,ay` | `fw×fh` | Notas |
|---|---|---|---|---|---|
| `torreSalvavidas` | | 76×129 | 28,91 | 44×10 | torre de madera con cabina blanca y franja roja, bandera, cruz roja, salvavidas. `tall` |
| `sombrillaPlaya` | | 63×77 | 26,56 | 8×5 | a rayas coral/crema, desteñida. `.broken` = tela caída (`breakable`). `tall tree canopy` |
| `restoPlaya` | 2 | 164×145 | 72,106 | 132×26 | 0 «CEVICHERÍA» azul con toldo, 1 «PARRILLAS» mostaza con techo de palma. Mesas plásticas en la cubierta. **`.noche`** (ventanas encendidas, focos) y `emit[]` |
| `puentePeatonal` | | 392×173 | 186,134 | 300×20 | sobre la pista (~20 m): dos columnas, viga, barandas verdes con malla, rampas a ambos lados. `.deck` (cubierta+rampas, `air`) y `.pilares` (suelo) con **las mismas medidas y ancla** para dibujarlos en dos capas; `air:true tall` |
| `autoAbandonado` | 2 | 54×117 / 61×139 | 18,82 / 20,98 | 28×76 / 32×92 | visto desde atrás (la pista corre N-S): 0 sedán rojo, 1 combi crema. `.broken` = capó abierto/humo |
| `parapenteTirado` | | 137×86 | 64,70 | 112×30 | **rosado y amarillo**, celdas, líneas, arnés rojo-azul y casco |
| `farolBR` | | 55×114 | 20,86 | 8×5 | farol de fierro forjado con volutas y linterna ámbar. `lamp`, `.dark` = apagado |
| `bancaBR` | | 51×40 | 22,28 | 38×8 | listones de madera, fierro |
| `basureroBR` | | 41×42 | 16,29 | 18×8 | tacho azul. `.broken` = caído con basura |
| `buganvilia` | 3 | 72×62 | 36,56 | 40×6 | 0 magenta, 1 fucsia, 2 morada; masa de follaje y flores con cortinas colgantes, **para ponerla sobre el borde de un `muroBajada`** (ancla = borde inferior de lo que cuelga; poner `ay` unos 14 px bajo el borde superior del muro). `tall` |
| `muroBajada` | 8 | 32×54 | 16,52 | 32×8 | **segmento de 32 px que se repite sin costura**: 0 crema, 1 salmón, 2 agua (con ventanita de reja), 3 mostaza, 4 celeste, 5 rosa viejo, 6 crema con portón de madera en arco, 7 ladrillo desnudo. Cornisa de 8 px, zócalo, desconchones. `tileable`, `solid` |
| `palmeraBR` | 2 | 156×207 | 64,152 | 8×6 | 0 canaria (tronco de rombos), 1 washingtonia con falda seca. `tall tree canopy` |
| `ficusBR` | 2 | 159×164 | 68,120 | 22×10 | copa de racimos con contrafuertes. `tall tree canopy` |
| `casitaBajada` | 3 | 118×140 | 50,106 | 84×16 | 0 rancho salmón de 2 pisos con balcón de cajón y teja; 1 restaurante agua con terraza y letrero «BAJADA»; 2 mostaza con balcón y calamina. **`.noche`** + `emit[]` |
| `puente` | | ver §5 | | | **Puente de los Suspiros**, objeto con piezas modulares de 16 px |
| `ermita` | | 295×273 | 132,212 | 216×22 | **fachada ocre de dos torres y cúpula** (la cúpula está desfondada: se ven las vigas), cerrada con reja y candado, ventanas tapiadas con tablones, desconchones, **andamio con malla verde** (obra jun-2026), gallinazos. `lamps[2]` y `emit[2]` para dos faroles junto a la puerta. `tall` |
| `barandaMirador` | | 16×40 | 8,36 | 16×6 | segmento de 16 px: murete de cal con reja. `.pilastra` (y `.variants[0]`) = pilar cada 4 tramos. `solid` |
| `fuenteParque` | | 195×160 | 90,132 | 150×58 | **Danaide de mármol** sobre espejo de agua, dos pedestales con putti. **3 cuadros** (`.frames`, `.fps = 3`; el canvas base = cuadro 0). `.pedestal {x,y,w,h}` = la fuente completa (sólida) relativa al ancla. `solid` |
| `estatuaCantora` | | 73×139 | 26,98 | 44×12 | monumento de piedra de una cantante criolla (genérico, sin placa ni rostro real); flores en el zócalo. `tall solid` |
| `kioscoParque` | | 91×114 | 38,86 | 62×10 | quiosco crema con toldo verde a rayas «REFRESCOS». **`.noche`** + `emit` |
| `carritoAnticuchos` | | 111×116 | 48,88 | 84×16 | carreta de madera con parrilla, brasas, humo, toldo a rayas y letrero «ANTICUCHOS». `.noche` (brasas vivas y focos), `.broken` (volcado con brasas regadas), `emit` de `brasa` ×3. `tall breakable` |
| `pergola` | | 125×114 | 56,90 | 92×12 | pérgola de madera cubierta de buganvilia. `tall tree canopy` (se vuelve translúcida) |
| `cajaCervezas` | | 48×52 | 18,37 | 32×10 | dos cajones rojos con botellas (sin marca). `.broken` = cajón de lado y vidrios. `breakable`, `drops: 'botella'` |
| `munecoPractica` | | 56×95 | 22,72 | 30×8 | poste con brazos, torso de paja, **diana**, cabeza de costal y sombrerito rojo. `.frames[3]` = quieto / se inclina izq. / se inclina der. (`.hitFrames = [1,2]`, `.fps`), `.broken` = tumbado. `tall` |

## 5. El Puente de los Suspiros: `L.puente`
Pasarela de madera E-O, modular de **16 px (1 m)**. Altura 8,5 m real → `pilarH` = 104 px (comprimida). Madera rojiza `#8A4B32`.
- **`piso`** = **tile 16×16 repetible en ambos ejes** (tablas de 4 px a lo largo, juntas escalonadas); `pisos[4]` variantes. (B1a ya lo teselea así en `bakeDeck`.)
- **`baranda`** 16×22, ay=22: tramo con poste a la izquierda, pasamanos, balaustres, zócalo. Sirve para el norte y el sur. `barandaN` 16×16 = vista por dentro, más baja y oscura (opcional).
- **`farol`** 36×64, ax=14, ay=50: farol de fierro del puente (LED cálido); `lamp`.
- **`pilar`** 75×150, ax=28, ay=114: caballete de dos postes con cruces y travesaños sobre bloques de concreto; mide ~104 px de alto desde la base hasta la fascia. `tall`.
- **`sombra`** 16×64, `ay=0` = borde superior del lienzo: franja de sombra periódica (alfa) con huecos de los balaustres; la banda oscura cae en y 6..58 (48 px = 3 m).
- **`pisoAlto` / `pisosAlto[4]`** 16×52, ay=52: la cubierta **elevada** vista en 3/4 con su fascia de cercha (12 px), para dibujar el puente en la capa `air` por encima de Alexander cuando pasa por debajo.
- **`armar(n, {faroles})`** → junta `n` tramos y devuelve `{w, piso, baranda, barandaN, sombra (lienzos de n*16 px de ancho), faroles:[{x,y}], pilares:[x], farolSpr, pilarSpr, deckH:40, fascia:12, pilarH:104}`. Cómo componer (Y = borde norte de la cubierta): `barandaN` en `(X, Y+6-16)`; `piso` en `(X, Y)`; `baranda` en `(X, Y+42-22)`; faroles con su base en `(X+f.x, Y+42)`; pilares con su borde superior en `Y+50`; `sombra` en el suelo. Ver `?sec=escena&esc=puente`.

## 6. Lotes (`ACH.sprites.lotArch`, formato de `render.js`)
`br_biblioteca` (Biblioteca Municipal: fachada neoclásica de adobe crema con pórtico de 4 columnas, frontón con escudo, **friso con «BIBLIOTECA MUNICIPAL»** (o `ficha.name`), ventanas de arco altas, **torre de 1911 con reloj** y remate piramidal) y `br_iglesia` (Iglesia de la Santísima Cruz: frontis blanco-crema con gablete y cruz de piedra, **rosetón de vitral**, portal con arco y puerta doble, ventanas azules, campanario esbelto con teja y cruz dorada). Ambas cumplen `side:'N'` (azotea + cara sur) y `side:'S'` (azotea vista desde arriba: nave en cruz y pirámide de la torre). Leen `c0 c1 r0 r1 seed face name`; probadas con 14 tiles de ancho y 12/15 de alto (`face` 8/10). `lights[]` en px del lienzo (`kind: 'local'` ventanas y puerta, `'foco'` rosetón y campanario).

## 7. Notas para integración / lo que falta
- Orden real respetado (la investigación manda): playa al oeste, escalones de la Bajada subiendo, Ermita al oeste del puente, Parque al este. Sin cambios al contrato de §10.1.
- **Ficus más chicos:** se redujo la copa (≈ 96×64 px) para no tapar el camino de la Bajada.
- **Lo que NO hay (por el contrato no era obligatorio):** `.noche` en `torreSalvavidas`, `ermita` (cerrada: solo faroles `lamps`/`emit`) y `farolBR`; `estatuaCantora` es un monumento genérico (la investigación menciona la estatua de Chabuca Granda: no se copió su cara ni placa); no hay `quiosco` de música ni `pergola` con banca.
- `puentePeatonal` y `autoAbandonado`: los autos son «de arriba y atrás» porque la pista corre N-S; si el mapa los quiere de perfil hace falta otra variante.
- Hora: si el motor de noche (`ACH.noche`) ya oscurece tiles y props, `mar`/`morro`/`cielo` se oscurecen solos con `getHora()`; no hay que tintarlos aparte.
- El nombre `L.mar` es del objeto del mar; el tile de agua está en `L.tiles.mar`.
- `arte-lugares.js` se armó concatenando bloques de trabajo; **de aquí en adelante se edita el archivo directo**.
