# ACHORADO — Revisión estética y plan de dirección de arte

**Para:** equipo de sprites, equipo de motor y arquitecto del SPEC.
**Alcance:** diagnóstico del build actual (`juego/dist/achorado.html`, v0.3) y plan para llevarlo a un nivel de pixel art de primera línea. Este documento no cambia código: es la guía para quienes lo van a construir.
**Meta de calidad:** que una captura cualquiera del juego se pueda confundir con la de un juego de pixel art comercial de primer nivel. Otros juegos se usan solo como vara de calidad; no se copia el estilo ni los assets de ninguno.

> **Pendiente de la investigación con fotos.** Al cerrar esta revisión todavía no existían `diseno/investigacion-callao-fotos.md` ni `diseno/callao-referencias.html`. Todo lo que dependa de fotos reales está marcado con **[FOTO]**. Cuando lleguen esos archivos, se revisan solo esas celdas (medidas de la tabla de escala y rampas de color); las decisiones de base no cambian.

---

## 0. Resumen en una página

**Qué está mal, en orden de gravedad**

1. **La proyección de las fachadas es imposible.** La avenida va de sur a norte, así que los frentes dan al este y al oeste, y en una vista 3/4 esos muros se ven de canto. El build los "abate" en una columna de 1 tile con puertas de 16 px (Alexander mide 28). Por eso las casas no se distinguen y los letreros no se leen: no hay superficie donde dibujarlos.
2. **No hay una escala única.** La persona está a ~16 px por metro, la combi a ~13, el tráiler a ~8, la puerta a ~8 y el poste a ~7. El contenedor del tráiler le llega a la cabeza a un zombie.
3. **Todo vive en el mismo gris medio.** Asfalto, vereda, techo y muro están entre 35 % y 60 % de luminosidad, y la neblina aplana aún más. No hay luz, no hay sombras proyectadas, no hay oclusión en la base de los muros.
4. **El texto se dibuja sin regla.** Fuente de 3×5 con píxeles borrados al azar, sobre franjas de bajo contraste, en superficies de 16 px.
5. **El detalle es ruido, no información.** Los techos son un tile repetido; la pista (el 60 % de la pantalla) casi no cuenta nada.

**Decisiones de base**

| Tema | Decisión |
|---|---|
| Resolución | Se queda en **480×270** con tiles de **16 px**. Alexander y los zombies no cambian de tamaño. |
| Escala | **1 m = 16 px** en el suelo (largo y ancho). Alturas: 16 px/m hasta 2,2 m; por encima se comprime a ~12 px/m. |
| Fachadas | Solo se dibujan de frente las **caras sur**. Planta baja = **3 tiles** (48 px), cada piso alto = **2 tiles** (32 px). **Todo edificio se dibuja dentro de su huella**: no tapa nada y la colisión no cambia. |
| Frente a la avenida | Se expresa con un **canto de 6 px**, toldos, **letreros bandera** perpendiculares, gradas y mercadería en la vereda. Nada de texto girado. |
| Texto | Fuente bitmap compartida: **ACH5** (3×5) como mínimo absoluto, **ACH7** (5×7) para nombres de tienda, **ACH12** para murales. Siempre sobre plano frontal, con contraste mínimo y sin píxeles borrados. |
| Luz | Hora fija: **tarde de garúa, casi al anochecer**. Mapa de luz por multiplicación, postes que ya prendieron, sombras violáceas horneadas en el suelo. |

**Paquetes de trabajo, por retorno visual sobre esfuerzo**

| # | Paquete | Esfuerzo | Retorno |
|---|---|---|---|
| P0 | Contrato v0.4, constantes de escala, fuente, hoja de previsualización | 1 día | habilita todo |
| P1 | Luz y atmósfera (mapa de luz, sombras, AO, niebla por profundidad) | 2 días | muy alto |
| P2 | Suelo: rampas, valores y pista con historia | 2 días | alto |
| P3 | Vehículos a escala y con el ángulo correcto | 3–4 días | muy alto |
| P4 | Kit de edificios (motor de lotes + 9 arquetipos + rotulación) | 8–10 días, 3 personas | el más alto |
| P5 | Postes, cables, afiches y mobiliario | 2–3 días | alto |
| P6 | Vida animada (cables, basura al viento, parpadeos, charcos) | 2 días | medio-alto |
| P7 | Rastros del apocalipsis y siluetas tras los objetos altos | 2 días | medio |
| P8 | Personajes: sombras, luz de borde, pulido; pase final de rendimiento | 2 días | medio |

---

## 1. Diagnóstico

Se revisó el build en siete puntos: inicio (col 18, fila 84), mural CALLAO (fila 71, este), franja de bodegas oeste (filas 31–60), berma, bocacalle de la fila 58, tráiler de la fila 40 y tramo norte. Además se leyó `sprites.js`, `world.js` y `render.js`.

### 1.1 Escala y proporciones

Medidas tomadas del código, comparadas con el tamaño real:

| Objeto | Tamaño actual | Tamaño real | px por metro que resulta |
|---|---|---|---|
| Alexander | 20×28 (cuerpo ~27 de alto) | 1,70 m | ~16 |
| Puerta (`door`) | 12×16 | 0,9×2,1 m | ~8 |
| Fachada | 1 tile (16 px) | 2,8 m por piso | ~6 |
| Combi de costado | 64×38 | 4,9 m de largo | ~13 |
| Custer | 96×40 | 7,0 m | ~14 |
| Auto | 32×48 | 4,3 m | ~11 |
| Tráiler | 128×48 | 16 m con contenedor de 40 pies | ~8 |
| Poste | 4 px de ancho, 55 de alto | 0,3 m × 9 m | 13 de ancho, 6 de alto |
| Palmera | 48 de alto | 6–8 m | ~7 |

Conclusión: cada asset se dibujó "a ojo" dentro de un lienzo cómodo. El jugador lo percibe sin poder nombrarlo: los vehículos parecen juguetes y las casas, maquetas. En la captura del tráiler, el techo del contenedor queda a la altura de la cabeza del zombie que camina delante; en la calle real le saca más del doble.

### 1.2 Edificios y fachadas

- **El problema de fondo es de proyección, no de dibujo.** En `world.js` la columna 9 (oeste) y la 38 (este) llevan capas `bodegaSign`, `bodegaShutter`, `window`, `door` apiladas de norte a sur. Cada tile es una mini fachada de 16 px vista de frente, pero colocada sobre un muro que en esta cámara se ve de canto. El ojo no lo acepta como edificio: lo lee como una tira de estampillas.
- **Las manzanas son un techo continuo.** Las columnas 0–8 repiten `roof[h % 7]` con las mismas manchas. No hay linderos, alturas ni parapetos, así que no existen "casas", solo una textura. Los `tank` y `rebar` flotan sobre esa textura sin un edificio al que pertenezcan.
- **La manzana este se lee peor.** `roofWarehouse` tiene un patrón que parece una grilla de ventanitas; en la captura del mural da la impresión de un edificio visto de frente y acostado.
- **Las únicas fachadas bien orientadas** (filas 27, 57, 71 y 89, que miran al sur) miden 1 tile de alto: una puerta que le llega a la cintura a Alexander.
- **Sin altura no hay sombra.** Como nada se eleva, nada proyecta sombra sobre la vereda y el techo queda en el mismo plano que el piso.

### 1.3 Letreros y texto

- `bodegaSign` escribe «ROSA», «DON*», «LUZ» con la fuente 3×5 dentro de 16 px, y además borra un 6 % de los píxeles (`r() > .06`). En una fuente de 15 píxeles por letra, perder uno cambia la letra.
- Las franjas (`#a8453a`, `#34466e`, `#3f6f68`) con tinta crema sí tienen contraste, pero la neblina y el velo gris lo reducen, y el letrero ocupa 16×8 px en una pantalla de 480.
- El **mural CALLAO** mide 64×16: rosado `#D98A9E` sobre muro gris claro, casi el mismo valor. Es el hito del nivel y pesa menos que el rompemuelles.
- El mejor texto del juego hoy son las placas de los mototaxis («FLACA», «ZULY»): 5 px de alto, tinta clara sobre placa oscura, plano frontal, sin desgaste. Esa es la regla que hay que generalizar.
- El contenedor del tráiler lleva texto con píxeles faltantes: se lee como ruido.

### 1.4 Postes, cables y afiches

- El poste mide **4 px de ancho**; los dos cables de 1 px corren casi verticales pegados a él (la avenida y los cables van en la misma dirección). Resultado: el poste se confunde con los cables y se ve como una raya negra larga sobre la vereda.
- Los afiches `chicha` miden 8×10 y van apilados de a tres sobre el poste. A ese tamaño son tres manchas de colores; parecen un semáforo de juguete. No hay nada que leer en ellos.
- El poste no tiene luminaria, así que no aporta nada a la luz.
- El poste mide menos de tres personas de alto; uno real mide cinco.

### 1.5 Vehículos

- Todos son chicos frente a Alexander (ver 1.1).
- **Sentido del tránsito:** `combiN` (apuntando al norte) aparece en la pista oeste, que es la que baja al sur. En el Perú se maneja por la derecha: pista este hacia el norte, pista oeste hacia el sur.
- Los vehículos apuntando al norte muestran techo y cola: es la vista con menos información. Falta la vista hacia el sur, que enseña parabrisas y cartel de ruta de frente a la cámara.
- Les falta volumen: no hay sombra propia bajo el chasis, ni reflejo de cielo en las lunas, ni diferencia clara entre techo (más claro) y costado (más oscuro).
- La combi volcada del inicio es buena idea narrativa, pero mide 80×32 y se lee como una caja blanca.

### 1.6 Superficie de la calle

- Con la cámara centrada en la pista, **cerca del 60 % de la pantalla es asfalto** y otro 15 % berma. Hoy esa superficie solo tiene grietas en "Y" repetidas y la raya discontinua.
- Asfalto, berma y vereda usan variantes por tile de 16 px: el ruido es de alta frecuencia y no hay manchas grandes (parches, charcos, huellas de frenada) que rompan la grilla.
- El rompemuelles amarillo y negro es el elemento más contrastado y saturado de la pantalla; se roba la atención que debería ir a los zombies.
- El sardinel no tiene altura: es una franja clara, sin cara vertical ni sombra.

### 1.7 Personajes

- Son lo mejor del build: Alexander y los zombies se leen, las siluetas son claras y el verde de la piel zombie funciona como código.
- Les falta anclarse al suelo (sombra de contacto apenas visible) y recibir la luz del ambiente.
- Zombies y fondo comparten rango de valor: un caminante sobre la berma o sobre la vereda pierde contraste.

### 1.8 Color y contraste de valor

- La paleta de la investigación está bien elegida, pero se usa a media saturación y al mismo valor. Si se pasa una captura a escala de grises, casi todo cae entre 40 % y 60 %.
- Las sombras se hacen con `shade(color, .7)`: mismo matiz, más oscuro. Eso da el aspecto "sucio plano". Las rampas buenas giran el matiz: sombras hacia el violeta azulado, luces hacia el amarillo cálido.
- El velo `rgba(150,150,145,0.07)` más dos capas de neblina clara suben los negros: se pierde el extremo oscuro del rango.

### 1.9 Luz y atmósfera

- No hay dirección de luz. No hay sombras proyectadas de edificios, postes ni árboles.
- La neblina es una sola familia de manchas claras a pantalla completa; no distingue lejos de cerca.
- La garúa existe pero no moja nada: no hay charcos ni brillo en el asfalto.

### 1.10 Legibilidad del juego contra el fondo

- El peligro (zombies) y el fondo compiten: amarillo del rompemuelles, rosado del sardinel y afiches fosforescentes están más saturados que cualquier enemigo.
- Los 90 tiles de avenida son uniformes: no hay hitos para saber cuánto falta. El jugador no puede decir "voy por el chifa".
- Los vehículos altos van a tapar zombies cuando crezcan; hoy no hay ningún tratamiento para lo que queda detrás.

---

## 2. Decisiones de base

### 2.1 Resolución: se queda en 480×270, tiles de 16 px

**Decisión:** no se toca la resolución interna, el tile ni el tamaño de los personajes.

**Por qué:**

- El problema de legibilidad no es de resolución sino de superficie: los letreros viven en 16×8 px porque la fachada mide un tile. Con fachadas de 48 px de alto y 160 de ancho hay sitio para letras de 7 px sin cambiar nada más.
- 480×270 escala entero a 1080p (×4), 1440p (×5) y 4K (×8). Una letra de 5 px queda en 20 px reales a 1080p: se lee sin esfuerzo.
- La pantalla muestra 30×17 m de calle. Es un encuadre cerrado, bueno para un juego de pelea cuerpo a cuerpo con alcance de 24 px.
- Todas las constantes de juego del SPEC (velocidades, radios de ruido, alcance) están en píxeles. Cambiar la resolución obliga a reajustar y volver a probar todo el combate, que ya se siente bien.

**Alternativa descartada:** 640×360. Daría un 78 % más de área, pero a 1080p escala ×3 (letra de 5 px = 15 px reales), obliga a rehacer el balance y no resuelve la proyección.

**Efecto secundario que hay que asumir:** con la cámara en medio de la pista solo se ve 1 tile de manzana a cada lado. Los edificios se lucen cuando el jugador va por la vereda. Por eso la pista recibe tanto trabajo como las fachadas (P2) y se propone un sesgo de cámara opcional (ver 7, P1).

### 2.2 Tabla de escala

**Regla:** en el plano del suelo, **1 m = 16 px = 1 tile**, tanto a lo ancho como a lo largo. En vertical, 16 px/m hasta 2,2 m (personas, puertas, autos); por encima se comprime a unos 12 px/m para que los objetos altos no se coman la pantalla.

**Cómo se dibuja una caja en esta cámara** (vale para vehículos, contenedores, carretillas):

- **De costado** (mirando al este o al oeste): ancho = largo real × 16. Alto = franja de techo (ancho real × 8) + costado (alto real × 14).
- **De punta** (mirando al norte o al sur): ancho = ancho real × 16. Alto = techo (largo real × 13) + cara visible (alto real × 8). La cara visible es la cola si apunta al norte y el frente con parabrisas si apunta al sur.
- **Huella de colisión:** de costado, `fw` = largo en px − 6 y `fh` = ancho real × 10. De punta, `fw` = ancho en px − 2 y `fh` = largo real × 13 − 6.

| Elemento | Medida real (ancho × alto, o largo × ancho × alto) | Tamaño en px | Notas |
|---|---|---|---|
| Persona adulta | 0,5 × 1,70 m | 14 × 27 (lienzo 20×28) | No cambia. Es la regla de todo lo demás. |
| Escolar | 1,35 m | ~21 de alto | No cambia. |
| Puerta de casa | 0,9 × 2,1 m | 16 × 34 | Deja 7 px sobre la cabeza de Alexander. |
| Persiana de tienda (santamaría) | 2,5–3,0 × 2,5 m | 40–48 × 38 | Más la caja del rollo, 6 px. |
| Portón de almacén | 5 × 4,5 m | 80 × 56 | Corredizo, con riel. |
| Ventana | 1,2 × 1,2 m | 18 × 16 | Alféizar a 16 px del piso del nivel. |
| Casa de 1 piso | 3 m + parapeto | 48 + 6 | 3 tiles de fachada. |
| Casa de 2 pisos | 5,6 m | 80 + 6 | 5 tiles. |
| Casa de 3 pisos | 8,2 m | 112 + 6 | 7 tiles. |
| Muro de almacén | 6–8 m | 64–80 | 4–5 tiles. **[FOTO]** altura real en la Gambetta. |
| Combi (furgoneta de techo alto) | 4,9 × 1,75 × 2,2 m | costado 80 × 46 · punta 28 × 80 | Hoy 64×38 y 32×56. |
| Custer | 7,0 × 2,1 × 2,7 m | costado 112 × 56 · punta 34 × 112 | Hoy 96×40. |
| Auto sedán o station wagon | 4,3 × 1,7 × 1,45 m | costado 68 × 34 · punta 28 × 66 | Hoy 32×48. |
| Tico | 3,4 × 1,4 × 1,4 m | costado 54 × 32 · punta 24 × 54 | Nuevo. |
| Mototaxi | 2,7 × 1,3 × 1,8 m | costado 44 × 36 · punta 22 × 46 | Hoy 32×32. |
| Tráiler con contenedor de 20 pies | 10,5 × 2,5 × 4,0 m | costado 168 × 76 | Variante jugable. Hoy 128×48. |
| Tráiler con contenedor de 40 pies | 16 × 2,5 × 4,0 m | costado 256 × 76 | Solo como hito, una vez. |
| Contenedor suelto de 20 pies | 6,1 × 2,44 × 2,6 m | 98 × 56 | Para el patio de contenedores. |
| Poste de concreto | 0,3 × 9 m | 6 (base) a 4 (punta) × 96 | Comprimido. Hoy 4×55. **[FOTO]** |
| Árbol de berma | copa 3–4 m, alto 5 m | 52 × 68 | Tronco de 5 px. Hoy 28×44. |
| Palmera | 7 m | 44 × 88 | Hoy 32×48. |
| Tanque de azotea | 1,1 × 1,4 m | 18 × 24 | No cambia. |
| Paradero | 4 × 1,5 × 2,5 m | 64 × 52 | Hoy 48×44. |
| Carretilla de emoliente | 1,6 × 0,8 × 2,0 m con sombrilla | 30 × 40 | |
| Afiche chicha | 0,7 × 1,0 m | 12 × 16 | Hoy 8×10. |
| Letra de letrero de tienda | 25–40 cm | 7 px (ACH7) | |
| Letra secundaria (precio, ruta) | 15–20 cm | 5 px (ACH5) | Mínimo absoluto. |
| Letra de mural | 1,2–1,8 m | 12 a 24 px (ACH12, ×2) | |
| Sardinel | 0,15 m de alto | cara vertical de 3 px | |
| Carril | 3,5–4 m | 64 px | La pista de 8 tiles ya equivale a dos carriles. |

**[FOTO]** Revisar con las referencias: alto real de los muros de almacén, altura y separación de postes, ancho de vereda, proporción de las combis del Callao.

### 2.3 Altura de fachadas y proyección 3/4

**Problema:** en una vista 3/4 solo se ven de frente los muros que miran al sur. Los frentes que dan a una avenida norte–sur se ven de canto. Girar la avenida rompería el mapa, el SPEC y el recorrido; abatir las fachadas (lo que hay hoy) no se sostiene.

**Decisión: "la cuadra en peine".** La manzana se parte en **lotes**. Cada lote es un edificio con tres partes:

1. **Cara sur.** Es lo único que se dibuja de frente. Ocupa los 10 tiles de fondo del lote (160 px de ancho). Es **fachada completa** si delante hay un callejón o un retiro, y **medianera** si el lote se apoya en el vecino del sur.
2. **Azotea.** Vista desde arriba, encima de la cara sur. Lleva la identidad del edificio: material, parapeto, tanque, fierros, tendal.
3. **Canto de avenida.** Franja de 6 px en el borde que da a la vereda, más todo lo que sobresale hacia ella.

**Regla de oro: todo edificio se dibuja dentro de su huella.** Si el lote ocupa las filas `r0..r1` y la cara visible mide `v` tiles, la cara va en las filas `r1−v+1..r1` y la azotea en `r0..r1−v`. El techo no se desplaza hacia el norte ni tapa el callejón de atrás. Consecuencias:

- **La colisión no cambia.** Toda la huella ya es sólida en `grid`.
- **Los edificios no tapan a nadie.** No hace falta transparencia para ellos.
- **Cuesta cero por cuadro:** todo se hornea en el lienzo del suelo.
- El techo sale más corto de lo que sería en proyección estricta. Es la convención habitual del género y el ojo la acepta.

**Alturas:**

| Tramo | Alto | Contenido |
|---|---|---|
| Planta baja | 3 tiles (48 px) | zócalo 6 px · puerta 34 px · dintel 2 px · **banda de letrero 10 px** · cornisa 2 px |
| Piso alto | 2 tiles (32 px) | antepecho 10 px · ventana 16 px · dintel y losa 6 px |
| Parapeto | 6 px, tomados de la azotea | ladrillo o tarrajeo, con la cara superior más clara |
| Muro de almacén | 4 o 5 tiles | sin pisos; una sola superficie grande |

**Cuánto muro se ve:**

- Lote con **callejón o retiro al sur:** fachada completa hasta el suelo.
- Lote **pegado a un vecino más bajo:** se ve la diferencia de pisos como medianera (ladrillo sin tarrajear, columnas de concreto a la vista, aviso pintado, ventanitas altas).
- Lote **pegado a un vecino igual o más alto:** solo azotea y una línea de parapeto.

De ahí la receta de cada cuadra: grupos de 2 o 3 lotes que **suben de sur a norte** (1, 2, 3 pisos), separados por un **retiro**. El retiro es un patio, cochera o lote vacío de 3 a 6 filas, cercado con reja o calamina en la línea de la vereda. Sigue siendo sólido: no agrega zona caminable ni escondites.

**Cómo se apilan las piezas en una cara sur** (de abajo hacia arriba): zócalo con salitre → vanos de planta baja (puerta, persiana, portón) → banda de letrero → losa → ventanas del segundo piso, con balcón que vuela 4 px y proyecta sombra de 2 px → losa → tercer piso, muchas veces sin tarrajear o a medio levantar → parapeto → sobre la azotea, tanque, fierros y tendal.

**El frente que da a la avenida** (lo que el jugador tiene al lado cuando camina por la vereda):

- **Canto de 6 px**, dentro del tile de borde (columna 9 al oeste, 38 al este). Es el muro visto en escorzo: color de la fachada, en sombra al oeste y en luz al este. Las puertas son muescas oscuras de 6×14 px; las persianas, rayas horizontales.
- **Grada:** 16×4 px de cemento más claro sobre la vereda, frente a cada puerta.
- **Toldo:** vuela 10 px sobre la vereda, visto desde arriba, a rayas, con su sombra debajo.
- **Letrero bandera:** panel de 26×12 px perpendicular al muro, colgado a 40 px del suelo. Como es perpendicular a la fachada, **queda de frente a la cámara**: es el letrero legible de la avenida.
- **Mercadería y objetos:** balones de gas, jabas, congeladora, sillas de plástico, mototaxi estacionada.

**Orden de dibujo:**

1. Suelo horneado: tiles, calcomanías de piso, sombras proyectadas, lotes completos.
2. Cadáveres y charcos animados.
3. Props y entidades ordenados por `y` (como hoy).
4. **Capa alta** horneada: toldos, letreros bandera, cables, copas de árbol que vuelan sobre zona caminable.
5. Gallinazos y Titina.
6. Niebla, garúa, mapa de luz, emisivos, viñeta.

**Oclusión.** Como los edificios no tapan, solo quedan tres casos:

- **Objetos altos** (tráiler, custer, combi, paradero, copas de árbol): si una entidad queda detrás (su `y` es menor que la del objeto y cae dentro del rectángulo del sprite), después del orden por `y` se vuelve a dibujar su **silueta** encima, con alfa 0,30. Para los zombies se reusa el cuadro `hurt`, que ya es una silueta blanca; para Alexander se genera una igual al cargar. No se desvanece el vehículo: así no "parpadea" la cobertura.
- **Capa alta sobre la vereda** (toldos, letreros): miden 10–12 px de vuelo; tapan como mucho la cabeza. No necesitan tratamiento.
- **Copas de árbol:** si Alexander está debajo, la copa baja a alfa 0,55 en 0,15 s.

### 2.4 Regla de texto y letreros

**Una sola familia de fuentes bitmap, compartida por todo el arte**, expuesta en `ACH.sprites.font`:

| Fuente | Celda | Paso | Uso | Contorno |
|---|---|---|---|---|
| **ACH5** | 3×5 | 4 px | precios, rutas, placas, letrero bandera, afiches | no; exige fondo liso |
| **ACH7** | 5×7, trazo de 1 px con remates de brocha | 6 px | nombre de tienda en la banda de letrero | sombra de 1 px abajo a la derecha |
| **ACH12** | 9×12, trazo de 2 px, estilo chicha | 11 px | murales, costado de custer, contenedores. Se puede dibujar a ×2 | contorno de 1 px más sombra |

La ACH5 es la `FONT` que ya existe; hay que completarle el alfabeto (Ñ, tildes como punto alto, signos `¡ ! ? / $ . , -`). ACH7 y ACH12 son nuevas.

**Reglas, sin excepción:**

1. **Nunca menos de 5 px de alto.** Si no cabe, no lleva texto: lleva un ícono (botella, pollo, llave, cruz de botica).
2. **Solo sobre planos frontales:** caras sur, letreros bandera, frente o cola de vehículos, costados de vehículos vistos de costado, afiches. Nunca girado, nunca sobre un canto.
3. **Contraste:** la tinta y el fondo deben diferir al menos **40 puntos de luminosidad** (de 100). Combinaciones aprobadas: crema `#f3efe2` sobre rojo óxido `#8f3a32`, azul `#2f4470` o verde botella `#2f5a52`; amarillo `#e6c85a` sobre azul o negro; negro `#1c1a22` sobre amarillo o blanco.
4. **El desgaste no borra píxeles** en ACH5 ni en ACH7. El desgaste se pinta en el fondo (chorreras, salitre, manchas) y bajando la tinta un paso de la rampa en algunas letras. En ACH12 sí se pueden morder bordes.
5. **Largo máximo:** en ACH7, 8 caracteres por cada 3 tiles de banda; una fachada de 160 px admite hasta 24. En el letrero bandera, 6 caracteres en ACH5.
6. **Jerarquía:** un nombre grande por local (ACH7) y como mucho dos textos chicos (ACH5). Tres tamaños en una misma fachada es el máximo.
7. **Margen:** 2 px libres alrededor de todo texto.
8. **Banda de letrero:** 10 px de alto, con filete claro arriba y oscuro abajo, pintada a mano (borde inferior irregular de 1 px).

**Nombres inventados aprobados** (ninguno es marca, club ni empresa real): BODEGA DOÑA LUZ · BODEGA ROSITA · BOTICA LA CHALACA · CHIFA LA SUERTE · TALLER EL TUERCAS · LLANTERÍA EL PARCHE · FERRETERÍA EL PERNO · POLLERÍA EL BRAVO · VIDRIERÍA GARÚA · DEPÓSITO 12 · ALMACÉN NORTE 3 · FRIGORÍFICO LA BAHÍA · RUTA 77 PUERTO-NORTE · LÍNEA CHALACA EXPRESS. Textos chicos: SE VENDE HIELO · GAS · HAY MENÚ · SE ALQUILA · NO ESTACIONAR · FIADO NO · ABIERTO.

Antes de sumar un nombre nuevo, buscarlo en internet junto con "Callao" para confirmar que no existe.

### 2.5 Dirección y hora de la luz

- **Hora fija: tarde de garúa, casi al anochecer.** El SPEC dice "solo de día"; esto sigue siendo de día, pero con el ambiente frío y bajo, y con algunos postes y locales ya prendidos. Es lo que permite charcos con reflejo y focos de luz cálida sin hacer un ciclo de día y noche.
- **La luz viene del noroeste, alta.** Las sombras caen hacia el **sureste**: 1 px a la derecha por cada 2 px hacia abajo.
- **La manzana oeste da sombra sobre su vereda** (canto oscuro, sombra larga). **La manzana este recibe la luz** (canto claro, sin sombra sobre su vereda). Las dos aceras se sienten distintas.
- Las caras sur quedan en media luz, con valor medio: es donde mejor se lee el color y el texto.

---

## 3. Kit de edificios

### 3.1 Estructura de un lote

Un lote se describe con una ficha y lo dibuja una sola función, `buildLot(ficha)`, que devuelve el lienzo de suelo (cara sur, azotea, canto) y, aparte, sus piezas de capa alta (toldos, letrero bandera).

```
{ id:'W2-b', lado:'W', r0:73, r1:78, arq:'bodega', pisos:1, cara:'fachada',
  color:'celeste', nombre:'DOÑA LUZ', semilla:7302,
  azotea:['tanque','tendal'], frente:['toldo','bandera','gas'] }
```

**Piezas del kit** (módulos que cada arquetipo combina; todos alineados a una grilla de 8 px):

| Pieza | Tamaño | Variantes |
|---|---|---|
| Paño de muro | relleno | ladrillo sin tarrajear · tarrajeo sin pintar · pintado (6 colores) · calamina · bloqueta |
| Columna y viga de concreto a la vista | 4 px de ancho | cada 3 tiles en ladrillo sin tarrajear |
| Zócalo | 6 px | pintado más oscuro · cemento · mayólica |
| Puerta | 16×34 | fierro con visor · madera · reja doble |
| Persiana | 40×44 o 48×44 | cerrada · a medias (se ve el interior oscuro) · reventada |
| Portón | 80×56 | corredizo de chapa · dos hojas · entreabierto |
| Ventana | 18×16 | con reja · con cortina · rota · tapiada con ladrillo · con maceta |
| Balcón | 40×14, vuela 4 px | baranda de fierro · de cemento · con ropa tendida |
| Banda de letrero | n×10 | 5 combinaciones de color |
| Medidor y cajas de luz | 6×8 | con cables bajando |
| Bajada de agua | 2 px | recta · con codo |
| Parapeto | 6 px | ladrillo · tarrajeado · con botellas rotas · con alambre |
| Azotea | relleno | cemento · ladrillo pastelero · calamina · tierra con escombros |
| Objetos de azotea | varios | tanque negro · fierros con botellas encima · tendal · bidones azules · perro · antena · ruma de ladrillos · silla |

### 3.2 Arquetipos

Todos miden 10 tiles de ancho en su cara sur (el fondo del lote). "Filas" es el frente sobre la avenida.

**A1 · Bodega de barrio** — 1 piso · 6 filas (3 de fachada + 3 de azotea)
- Piezas: muro pintado en color fuerte, persiana de 48 px a medias, puerta de reja, banda de letrero a todo lo ancho, ventana enrejada con vitrina.
- Lo que la vende: nombre grande en ACH7; pared lateral pintada con productos genéricos (botella, pan, balón de gas) y «SE VENDE HIELO»; congeladora y jabas apiladas en la grada; toldo a rayas hacia la avenida; un foco prendido adentro.

**A2 · Casa de ladrillo sin tarrajear** — 2 o 3 pisos · 6 a 8 filas
- Piezas: ladrillo con columnas y vigas grises, ventanas sin marco (algunas tapadas con plástico azul), puerta de fierro, medidor con maraña de cables.
- Lo que la vende: último piso a medio levantar, con muros de 1 m y sin techo (se ve el piso desde arriba); fierros con botellas de plástico en la punta; tanque negro sobre cuatro ladrillos; escalera de cemento exterior; ruma de ladrillos y bolsa de cemento en la azotea.

**A3 · Casa pintada con balcón** — 2 pisos · 7 u 8 filas
- Piezas: tarrajeo pintado (durazno, celeste, menta u ocre), zócalo más oscuro, puerta de madera, dos ventanas con reja, balcón con baranda de fierro.
- Lo que la vende: pintura descascarada que deja ver tarrajeo; salitre en el primer medio metro; macetas en latas; bandera peruana en el balcón; ropa tendida; número de casa pintado.

**A4 · Almacén con portón** — muro de 4 o 5 tiles · 7 filas
- Piezas: muro largo de bloqueta tarrajeada, portón corredizo de 80×56, caseta de vigilante de 16×34, techo de calamina con claraboyas.
- Lo que lo vende: nombre pintado en letras de molde enormes y desteñidas (ACH12); franja de color a media altura; alambre de púas; reflectores; chorreras de óxido bajo cada perno; cono de tránsito y tranquera.

**A5 · Taller mecánico** — 1 piso · 6 filas
- Piezas: portón de dos hojas entreabierto, muro manchado de grasa, letrero pintado con una llave dibujada.
- Lo que lo vende: auto sobre gatas sin ruedas en el retiro; llantas apiladas; mancha de aceite que sale hasta la vereda; cilindro de aceite; cadena con candado.

**A6 · Chifa o pollería** — 2 pisos (local abajo, casa arriba) · 7 filas
- Piezas: frente de mayólica hasta 1 m, mampara de vidrio con marco de aluminio, banda de letrero roja con tinta amarilla, segundo piso de A3.
- Lo que lo vende: letrero bandera con ícono (tazón o pollo); mesas de plástico volcadas vistas por la mampara; pizarra «HAY MENÚ»; campana extractora con mancha de hollín; luz cálida adentro.

**A7 · Botica** — 1 piso con azotea · 6 filas
- Piezas: frente blanco con franja verde, reja plegable cerrada, cruz verde en el letrero bandera.
- Lo que la vende: es el único frente casi blanco de la cuadra; vitrina saqueada; cruz que parpadea (emisivo).

**A8 · Lote a medio construir** — retiro de 3 a 6 filas
- Piezas: cerco de calamina o de palos con malla raschel, portón de madera con cadena, columnas con fierros, montículo de arena y piedra.
- Lo que lo vende: fila de afiches chicha repetidos sobre el cerco (el "muro de afiches"); «SE VENDE» pintado; carretilla, mezcladora; perro.

**A9 · Patio de contenedores** — retiro grande de 6 a 8 filas, solo al este
- Piezas: cerco de malla con postes, contenedores apilados de a 2 y 3 (98×56 cada uno, en azul, rojo óxido, verde, ocre), piso de tierra afirmada.
- Lo que lo vende: códigos inventados en ACH5 (por ejemplo `ACHU 301 7`); un contenedor abierto con cajas caídas; tracto estacionado.

**A10 · Casas del pie del cerro** — 1 piso · fila 0–2, a los lados de la escalera
- Piezas: mezcla de ladrillo, triplay y calamina; puertas pintadas de colores.
- Lo que las vende: enmarcan la **escalera pintada** de la salida, que pasa a ser pieza única: 4 tiles de ancho, contrahuellas de colores desteñidos, baranda de fierro, macetas, ropa tendida de lado a lado. Con dignidad: plantas y color, no basural.

### 3.3 Reglas de variación

1. **Dos vecinos nunca comparten** arquetipo, ni color de muro, ni número de pisos.
2. **Color de muro:** se elige de seis familias (celeste, menta, durazno, ocre, rosado, blanco hueso) más ladrillo y cemento. En una misma cuadra, cada familia aparece una sola vez.
3. **Un acento por lote:** puerta, reja o banda de letrero en un color contrario al del muro.
4. **Desgaste por semilla**, en tres niveles: (1) salitre y chorreras, (2) pintura descascarada y grietas, (3) ventanas rotas y tapiado. Cada cuadra tiene un lote en nivel 3 y uno en nivel 1.
5. **Ventanas:** en cada fachada, al menos una distinta de las demás (tapiada, con cortina, rota, con luz).
6. **Azotea:** cada lote elige 2 o 3 objetos de la lista; el tanque no se repite en la misma posición.
7. **Un detalle único por lote** que no aparece en ningún otro del nivel (el auto sobre gatas, la cruz que parpadea, la escalera exterior).
8. **Un hito cada 15–20 filas:** paradero y combi volcada (84) · patio de contenedores (78, este) · mural CALLAO (71, este) · chifa de esquina (57, oeste) · tráiler de 40 pies cruzado (40) · botica (27, oeste) · escalera pintada (0–2).

### 3.4 Tabla de lotes propuesta

Filas en tiles. "Cara" indica cuántos tiles de muro se ven y de qué tipo. Los retiros siguen siendo sólidos. Es una propuesta completa; el equipo de motor la ajusta si alguna cuadra no cuadra.

**Manzana oeste (columnas 0–9), barrio de autoconstrucción**

| Lote | Filas | Arquetipo | Pisos | Cara visible | Color y nombre |
|---|---|---|---|---|---|
| W0-a | 3–6 | A2 ladrillo | 3 | medianera, 2 tiles (5–6) | ladrillo |
| W0-b | 7–13 | A1 bodega con casa arriba | 2 | fachada, 5 tiles (9–13) | rosado · BODEGA ROSITA |
| W0-r | 14–16 | retiro: cochera con reja | — | — | mototaxi estacionada |
| W0-c | 17–21 | A3 casa con balcón | 2 | medianera, 2 tiles (20–21) | celeste |
| W0-d | 22–27 | A7 botica | 1 | fachada al callejón, 3 tiles (25–27) | blanco · BOTICA LA CHALACA |
| W1-a | 31–35 | A2 ladrillo | 3 | medianera, 2 tiles (34–35) | ladrillo, piso alto a medias |
| W1-b | 36–41 | A3 casa pintada | 2 | medianera, 2 tiles (40–41) | menta |
| W1-c | 42–47 | A5 taller | 1 | fachada al retiro, 3 tiles (45–47) | cemento · TALLER EL TUERCAS |
| W1-r | 48–50 | A8 lote a medio construir | — | — | cerco con afiches |
| W1-d | 51–57 | A6 chifa | 2 | fachada al callejón, 5 tiles (53–57) | rojo y ocre · CHIFA LA SUERTE |
| W2-a | 61–66 | A2 ladrillo | 3 | medianera, 2 tiles (65–66) | ladrillo, aviso pintado |
| W2-b | 67–72 | A2 ladrillo tarrajeado | 2 | medianera, 2 tiles (71–72) | cemento |
| W2-c | 73–78 | A1 bodega | 1 | fachada al retiro, 3 tiles (76–78) | celeste · BODEGA DOÑA LUZ |
| W2-r | 79–81 | retiro: patio con tendal | — | — | |
| W2-d | 82–89 | A3 casa con balcón | 2 | fachada, 5 tiles (85–89) | durazno |

**Manzana este (columnas 38–47), almacenes de la Gambetta**

| Lote | Filas | Arquetipo | Alto | Cara visible | Color y nombre |
|---|---|---|---|---|---|
| E0-a | 3–8 | oficinas viejas | 3 pisos | medianera, 3 tiles (6–8) | ocre |
| E0-b | 9–14 | A4 almacén | 4 tiles | fachada al retiro, 4 tiles (11–14) | gris · ALMACÉN NORTE 3 |
| E0-r | 15–20 | A8 lote con cerco de calamina | — | — | muro de afiches |
| E0-c | 21–27 | A4 frigorífico | 4 tiles | fachada al callejón (24–27) | blanco y azul · FRIGORÍFICO LA BAHÍA |
| E1-a | 31–37 | A4 almacén alto | 5 tiles | medianera, 1 tile (37) | gris |
| E1-b | 38–44 | fábrica con techo en diente de sierra | 4 tiles | fachada al retiro (41–44) | ladrillo y vidrio |
| E1-r | 45–50 | patio de maniobras | — | — | tracto estacionado |
| E1-c | 51–57 | A4 almacén | 4 tiles | fachada al callejón (54–57) | verde botella · DEPÓSITO 12 |
| E2-a | 61–63 | caseta y oficina | 1 piso | solo azotea | |
| E2-b | 64–71 | A4 almacén grande | 5 tiles | fachada al callejón (67–71) | **mural CALLAO** |
| E3-r | 75–82 | A9 patio de contenedores | — | — | |
| E3-a | 83–89 | A4 almacén | 4 tiles | fachada (86–89) | ocre |

**El mural CALLAO** pasa de 64×16 a **144×48**, centrado en un muro de 160×80: letras ACH12 a ×2 (24 px), rosado `#D98A9E` con contorno `#2a1f26` de 2 px y luz `#f7d6cf`, sobre un fondo pintado de azul noche `#2f4470` para que el rosado destaque. A los lados, formas abstractas (olas, una gaviota). Sin rostros ni escudos.

---

## 4. Especificación por asset

### 4.1 Vehículos

**Reglas comunes**

- **Volumen en tres valores:** techo (el más claro, recibe el cielo), costado (medio), bajos y pasos de rueda (el más oscuro).
- **Lunas:** rampa de vidrio con una franja diagonal de reflejo de cielo de 2 px. Algunas rotas, con telaraña de 5 px.
- **Sombra propia horneada** en el sprite: mancha `#2a2440` al 30 % bajo el chasis, que asoma 4 px al sureste.
- **Ruedas:** costado, disco de 12 px (combi), 14 px (custer) o 16 px (tráiler); aro gris, dos píxeles de luz.
- **Sentido:** en la pista oeste apuntan al sur o están cruzados; en la este, al norte. Mínimo de variantes por vehículo: costado este, costado oeste (espejo con el texto redibujado, nunca volteado) y una de punta.
- **Un solo foco de color por vehículo;** el resto, blanco sucio y óxido.
- **Texto:** ruta en el parabrisas (ACH5 negro sobre cartel amarillo o blanco de 20×7) y nombre en el costado (ACH7 o ACH12).

| Asset | Tamaño nuevo | Huella (`fw`×`fh`) | Detalles clave | Cómo se lee a 1× |
|---|---|---|---|---|
| **Combi, costado** (`combiE`) | 80×46 | 74×18 | techo alto con parrilla y bultos amarrados; puerta corrediza abierta con el interior oscuro y un asiento; dos franjas de color; espejo; parachoques abollado; «77» en la luna | caja blanca alta con hueco negro en el medio y franja de color |
| **Combi hacia el sur** (`combiS`, nueva) | 28×80 | 26×58 | parabrisas de frente con cartel de ruta legible, limpiaparabrisas, faros (uno roto), techo largo con parrilla | cara con "ojos" y cartel amarillo |
| **Combi hacia el norte** (`combiN`) | 28×80 | 26×58 | puerta trasera con escalerilla, calcomanías, placa, luces rojas | techo largo y cola con dos puntos rojos |
| **Combi volcada** (`combi`) | 88×40 | 82×22 | se ve la panza: cardán, tubo de escape, tanque; ruedas al aire; vidrios en el piso; mancha de aceite | objeto oscuro y mecánico, distinto de las demás combis |
| **Custer, costado** (`custerE`) | 112×56 | 106×22 | seis ventanas cuadradas con cortinillas (dos abiertas); franja azul ancha con «LÍNEA CHALACA EXPRESS»; puerta plegable delantera abierta; rueda de repuesto atrás | bus corto, claramente más largo y alto que la combi |
| **Auto, costado y de punta** (`car`, ampliar a `carVar:[3]`) | 68×34 · 28×66 | 62×16 · 26×48 | station wagon o sedán; casquete de taxi sin texto de empresa; puerta abierta en una variante; capó levantado en otra | más bajo que Alexander: le llega al pecho |
| **Tico** (`tico`, nuevo) | 54×32 · 24×54 | 48×14 · 22×40 | amarillo desteñido, parrilla en el techo, calcomanía de taxi en la luna | el vehículo más chico de cuatro ruedas |
| **Mototaxi** (`mototaxiVar`) | 44×36 · 22×46 | 38×14 · 20×32 | techo de lona con caída; cabina de fierro; faldón trasero con nombre en ACH5 («FLACA», «ZULY», «CHOLO»); flecos; rueda delantera de moto | triángulo de color con techo |
| **Tráiler de 20 pies** (`trailer`) | 168×76 | 160×26 | tracto de cabina plana con tubos de escape verticales; contenedor corrugado (rayas verticales cada 4 px en dos valores); código en ACH5; puertas con barras; cinco ruedas visibles; patas de apoyo | muro de color que duplica la altura de Alexander |
| **Tráiler de 40 pies** (`trailerLargo`, nuevo, una sola vez) | 256×76 | 248×26 | igual, con el contenedor abierto por atrás y carga caída | la barricada del nivel |

**Riesgo de juego:** con estas huellas, un tráiler de 168 px cruzado tapa una pista entera (128 px) y parte de la berma. Hay que recolocar todos los vehículos (ver P3).

### 4.2 Postes, cables y afiches

**Poste de concreto** (`posteCables`, `posteAfiche`, y nuevo `posteLuz`)

- **Tamaño:** lienzo 40×100. Fuste de **6 px** en la base que baja a 4 px arriba, de 96 px de alto. Tres valores: luz a la izquierda, medio, sombra a la derecha. Anillos de encofrado cada 12 px y número de poste pintado en ACH5 negro sobre recuadro amarillo, a 30 px del suelo.
- **Base:** dado de concreto de 10×6 con mancha de humedad y sombra de contacto.
- **Cruceta:** 28 px de ancho, con 4 aisladores. Segunda cruceta más corta 10 px abajo.
- **Transformador** (uno de cada dos): 12×16, gris azulado, con aletas, a 60 px del suelo.
- **Luminaria:** brazo de 14 px hacia la pista, a 84 px del suelo, con pastilla de 6×3. Propiedad nueva `lamp:{x,y}` relativa al ancla, igual que `top`.
- **Maraña:** bucle de cable enrollado colgando, caja de empalme negra, dos acometidas que bajan en diagonal hacia las casas.
- **Sombra proyectada:** franja de 3 px hacia el sureste, de 40 px de largo, al 20 %. Va horneada en el suelo, no en el sprite.
- **Huella:** 6×4 (hoy 4×4).

**Cables**

- De 2 hilos pasan a **4 por tramo**, con combas distintas: dos gruesos arriba (color `#1c1a22`) y dos finos de telecomunicaciones más abajo (`#33303a`), uno de ellos con un bucle de sobra.
- Se separan del poste: salen de las puntas de la cruceta (±12 px), no del eje. Así el poste se lee como poste y los cables como cables.
- **Sombra de cables en el suelo:** la misma curva, desplazada 10 px al este y 20 al sur, al 12 %. Es el truco más barato para dar altura.
- **Acometidas** de cada poste a la azotea más cercana, en diagonal.
- Cada 3 tramos, **zapatillas colgadas** o una cometa enredada.
- **Cruce de calle:** un cable que cruza la avenida en cada bocacalle, con un pasacalle de tela desteñida (texto inventado en ACH7: «BIENVENIDOS AL BARRIO»).

**Afiches**

- **Tamaño real: 12×16 px.** Tres plantillas chicha: fondo fosforescente plano, una palabra en ACH5 (GRAN, FIESTA, HOY, BAILE, SÁBADO), una franja negra con otra palabra y una estrella o nota musical. Nombres de grupos inventados y cortos.
- **Dónde van:** en serie de 4 a 6 iguales sobre cercos y muros de almacén (caras sur), en el paradero y en el canto de los retiros. Es donde de verdad se leen.
- **En el poste:** un solo **cartel amarrado** de 12×16, más ancho que el fuste, sujeto con dos alambres, a 22–38 px del suelo y mirando al sur («SE ALQUILA», «GASFITERO», «COMPRO FIERRO»). Debajo, restos de afiches arrancados (manchas de papel blanco de 6×4).
- **Regla de color:** los fosforescentes solo existen en afiches y murales. En cada pantalla, como mucho dos grupos de afiches.

### 4.3 Mobiliario y vegetación

| Asset | Tamaño | Huella | Detalles clave |
|---|---|---|---|
| **Paradero** | 64×52 | 58×8 | techo de calamina visto desde arriba con hojas secas; dos parantes; banca; panel lateral con afiches; tacho amarrado; nombre del paradero en ACH5 |
| **Semáforo** (nuevo, en bocacalles) | 12×72 | 4×4 | poste negro y amarillo, caja de tres luces; **ámbar intermitente** (emisivo) |
| **Tacho y bolsas** (`trash`, `bags`) | 20×22 · 22×16 | como hoy | bolsas negras con brillo de 2 px, una rota con basura; moscas |
| **Carretilla de emoliente** | 30×40 | 26×8 | botellas de vidrio en rampa roja, ámbar y verde; termo; sombrilla vista en 3/4; vasos tirados |
| **Carrito de anticuchos** | 30×36 | 26×8 | parrilla con brasas (emisivo naranja de 4 px), palitos, olla, banquito volcado |
| **Árbol de berma** (`treeWhite`) | 52×68 | 6×4 | tronco de 5 px con cal blanca hasta 20 px; copa en tres masas con huecos; hojas secas en la base. La copa va en la capa alta |
| **Palmera** (`palm`) | 44×88 | 4×4 | tronco anillado, 7 hojas, 2 secas colgando |
| **Buzón de alcantarilla** (calcomanía) | 14×10 | — | tapa de fierro; una sin tapa, tapada con una llanta |
| **Quiosco de periódicos** (nuevo) | 40×48 | 34×10 | caja de metal verde cerrada, revistas en el piso |
| **Triciclo de carga** (nuevo) | 40×30 | 34×10 | plataforma con jabas |
| **Barrera y conos** (nuevo) | 32×20 · 8×10 | 28×4 · sin huella | restos de un control: tranquera, conos, cinta amarilla |
| **Sardinel** | tile | — | cara vertical de 3 px en dos valores, borde superior claro de 1 px, sombra de 1 px sobre el asfalto |

---

## 5. Lista de pulido

### 5.1 Qué separa hoy a ACHORADO de un pixel art de primera línea

| Rasgo | Estado | Paso concreto |
|---|---|---|
| Estructura de valor en tres planos | todo en gris medio | 5.3 y P2 |
| Rampas con giro de matiz | sombras por multiplicación | 5.2 |
| Una dirección de luz y sombras coherentes | no hay | 2.5, 5.4, P1 |
| Luz local (focos, emisivos) | no hay | 5.5, P1 |
| Profundidad por capas | suelo y sprites | capa alta, sombras de cables, niebla por profundidad |
| Fachadas hechas a mano | tiles repetidos | sección 3 y P4 |
| Vida animada | humo y gallinazos | 5.9 y P6 |
| Detalle con jerarquía | ruido uniforme | 5.8: zonas de descanso y zonas densas |

**Límite honesto.** Todo el arte es código en `sprites.js`. Eso tiene techo: dibujar con `rect` y `line` produce formas rígidas. Para las piezas principales se recomienda **dibujar con mapas de píxeles en texto** (una lista de cadenas y una paleta, con un ayudante `G.fromRows(filas, paleta)`), que da control píxel a píxel sin herramientas de build. Regla: lo estructural (muros, rellenos, desgaste) es procedural; lo que el ojo mira (puertas, letreros, vehículos, objetos únicos) va en mapas de píxeles.

### 5.2 Rampas de color

Regla general: de oscuro a claro, el matiz gira de **violeta azulado** a **amarillo cálido**, y la saturación sube en los tonos medios. Prohibido oscurecer con `shade(color, f)` sobre superficies grandes: se elige el paso anterior de la rampa.

| Material | Sombra profunda | Sombra | Base | Luz | Brillo |
|---|---|---|---|---|---|
| Ladrillo | `#4a2c33` | `#6e3f3a` | `#8f5544` | `#a86a50` | `#c08a68` |
| Concreto y cemento | `#45434f` | `#66656b` | `#8a8884` | `#a9a79b` | `#c9c5b5` |
| Asfalto mojado | `#24252e` | `#33353d` | `#44474d` | `#575a5c` | `#6f7170` |
| Pintura de pista (blanca) | `#6b6c70` | `#8f8f8a` | `#b9b49c` | `#d6d1b8` | — |
| Amarillo de sardinel | `#7a6430` | `#a88a3c` | `#d2b24a` | `#e6d27a` | — |
| Tierra de berma | `#4a3f3c` | `#6b5a48` | `#8a7658` | `#a8956e` | — |
| Pared celeste | `#4c6478` | `#6b8c9c` | `#8fb3be` | `#b4d0d0` | `#dbe6da` |
| Pared menta | `#4f6a66` | `#74917f` | `#9db59e` | `#c0d1b4` | `#e0e6cc` |
| Pared durazno | `#8c5f5c` | `#b88670` | `#e0b79a` | `#efd3b4` | `#f7e8cf` |
| Pared ocre | `#7a5a45` | `#a5814f` | `#c9a66b` | `#e0c58d` | — |
| Rosado de barrio | `#7d4a66` | `#b06a85` | `#d98a9e` | `#ecb1b5` | `#f7d6cf` |
| Calamina y metal | `#3b4250` | `#5c6570` | `#7e868a` | `#a4abaa` | `#cfd3cc` |
| Óxido | `#4a2a2a` | `#6f3b2e` | `#8a4b38` | `#b06a3e` | — |
| Madera | `#4a3028` | `#6b4223` | `#a86e38` | `#c99458` | — |
| Vidrio | `#1c2530` | `#2d3d4a` | `#4d6676` | `#8fb0b8` | — |
| Vegetación mustia | `#2f3d3a` | `#4a5a44` | `#6b7a4f` | `#94975e` | — |
| Piel de Alexander | `#5c3a36` | `#80523a` | `#a8714c` | `#c48f63` | `#dcae80` |
| Piel zombie | `#3f4a44` | `#5f6b55` | `#7f8c71` | `#a3ad8a` | — |
| Sangre seca | `#3a1518` | `#5b1d1d` | `#7a2a26` | — | — |
| Salitre | — | `#a8a59c` | `#c9c5b5` | `#e2dfd2` | — |

Acentos reservados: fosforescentes de afiche (`#e8388a`, `#f2e63c`, `#5fe04a`, `#ff8a2a`, `#38c8e8`), luz cálida de poste `#ffcf8a`, luz fría de fluorescente `#cfe8e0`, contorno general `#1c1a22`.

**[FOTO]** Calibrar con las referencias: base de ladrillo, las seis paredes pintadas, el asfalto y el cielo.

### 5.3 Estructura de valor

Luminosidad objetivo (de 0 a 100), antes de aplicar la luz:

| Plano | Rango | Qué entra |
|---|---|---|
| Suelo oscuro | 18–32 | asfalto, callejón, sombras |
| Suelo claro | 50–62 | vereda, grada, berma (45–52) |
| Azoteas | 30–42, poca saturación | deben retroceder |
| Caras sur | 45–75, con color | son el decorado principal |
| Personajes | contorno a 10 y luces a 80 o más | el contraste interno más alto de la pantalla |

Reglas para que el juego se lea:

- **El verde enfermo es de los zombies.** Ningún asset del escenario usa verdes amarillentos con saturación mayor de 25 %.
- **El azul intenso y la madera cálida son de Alexander.**
- **El rosado vivo es de Titina** (marcadores de Q) **y del barrio** (murales, sardinel), este último un paso más apagado.
- El rompemuelles baja de contraste: amarillo `#a88a3c` y gris `#33353d`, gastado.
- **Prueba obligatoria:** pasar la captura a grises y entrecerrar los ojos. Alexander y los zombies tienen que seguir siendo lo primero que se ve.

### 5.4 Sombras

- **Dirección:** al sureste, pendiente de 1 a la derecha por 2 hacia abajo.
- **Color:** nunca negro. `#2a2440` (violeta oscuro) con alfa.
- **Sombra de edificio sobre la vereda oeste:** horneada. Largo igual a la mitad de la altura del edificio (24 px para 1 piso, 40 para 2, 56 para 3), alfa 0,28, con borde en diente de 2 px. El escalonado entre lotes de distinta altura dibuja el perfil de la cuadra sobre la vereda.
- **Sombra de contacto de entidades:** elipse de 12×5 al 30 % bajo los pies, antes del sprite.
- **Sombra proyectada de postes, árboles, semáforos y paradero:** silueta sesgada horneada en el suelo, alfa 0,20.
- **Vehículos:** dentro del sprite (4.1).
- **Bajo toldos y balcones:** franja de 2 a 4 px al 25 %.

### 5.5 Luz y atmósfera (todo en canvas 2D, sin filtros)

1. **Mapa de luz.** Lienzo fuera de pantalla de 480×270. En cada cuadro: se rellena con el color de ambiente `#9aa0b8`; se dibujan los focos con `globalCompositeOperation = 'lighter'`; se vuelca sobre la escena con `'multiply'`. Costo: un relleno, entre 6 y 12 `drawImage` y un volcado a pantalla completa.
2. **Sprites de foco.** Degradados radiales **hechos a mano en 4 bandas**, con borde tramado (dithering ordenado de 2×2), para que la luz también sea pixel art. Tres tamaños: poste (elipse de 110×70, cálida `#ffcf8a`), local (abanico de 60×40 desde una puerta o persiana abierta), brasa (30×20, naranja).
3. **Pase de emisivos**, después del mapa de luz y con `'lighter'`: pastilla de la luminaria, cruz de la botica, ámbar del semáforo, brasas, ventana encendida. Así no quedan apagados por la multiplicación.
4. **Qué se prende:** uno de cada dos postes; uno de ellos **falla** (parpadea con un patrón irregular). Dos o tres locales con luz interior.
5. **Niebla por profundidad.** Degradado vertical fijo: de 0 % abajo a 12 % arriba, color `#b9bec0`. Lo que está al norte (lejos) se lava un poco. Se suma a las dos capas móviles actuales, que bajan su alfa a la mitad.
6. **Niebla baja** en los callejones: una tercera capa solo sobre tiles `a`, más densa y más lenta.
7. **Asfalto mojado.** Charcos como calcomanías (20–40 px, bordes irregulares) con el color del cielo `#6f7c8a`; bajo cada poste prendido, una estela vertical cálida de 4×30 px al 12 % sobre el asfalto.
8. **Viñeta fija** muy suave (esquinas al 15 %), separada de la viñeta roja de daño.
9. **Quitar el velo gris** `rgba(150,150,145,0.07)`: lo reemplaza el color de ambiente del mapa de luz.

### 5.6 Contornos

- **Personajes y props sueltos:** contorno completo de 1 px en `#1c1a22`, como hoy.
- **Contorno selectivo en lo nuevo:** en el lado de la luz (arriba y a la izquierda) el contorno se cambia por el tono de sombra del propio material. El objeto se integra sin perder silueta.
- **Edificios:** sin contorno negro. Se separan por valor: parapeto con filo claro arriba y línea oscura abajo; los vanos, con marco.
- **Texto:** ver 2.4.
- **Luz de borde en personajes:** 1 px de `#c9c5b5` en el lado noroeste de cabeza y hombros.

### 5.7 Oclusión ambiental, tramado y desgaste

- **Oclusión en la base de los muros:** dos franjas horneadas sobre el suelo, pegadas a cada muro y a cada canto: 2 px al 35 % y 2 px al 15 %. También bajo sardineles, postes y vehículos.
- **Esquinas interiores** (encuentro de dos muros): 1 px extra de sombra.
- **Tramado:** solo en tres sitios: transición de manchas grandes (humedad, salitre, aceite), borde de los focos de luz y borde de las sombras de edificio. Nunca en personajes ni en texto. Patrón ordenado de 2×2; nada de ruido al azar.
- **Desgaste con causa:** el salitre sube desde el suelo (30–50 cm); las chorreras bajan de alféizares, pernos y parapetos; el hollín sube de las campanas; la grasa está a la altura de la mano junto a las puertas; el óxido nace en los pernos y en los bordes inferiores de la chapa.
- **Manchas grandes en la pista:** parches de asfalto más oscuros (40–80 px), huellas de frenada, manchas de aceite, el desgaste más claro por donde pasan las ruedas. Rompen la grilla de 16 px.

### 5.8 Jerarquía del detalle

- **Regla 70/30:** el 70 % de cada superficie descansa (dos valores, textura mínima) y el 30 % concentra el detalle (vanos, letrero, base del muro, objetos).
- **La densidad sube hacia donde hay historia:** puertas, esquinas, hitos. La pista abierta entre hitos queda limpia para que el combate se lea.
- **Tres escalas de lectura por objeto:** silueta (a 1×), masas de color (qué es) y detalle fino (premio al que mira).

### 5.9 Vida animada

Todo con sprites de 2 a 4 cuadros o partículas. Presupuesto: 40 partículas de ambiente como máximo en pantalla.

| Elemento | Cómo | Costo |
|---|---|---|
| Cables que se mecen | la comba varía ±1 px con un seno lento; se dibujan en vivo solo los tramos visibles | medio |
| Basura al viento | 6 a 10 partículas (papel, bolsa) que cruzan en ráfagas cada 8–15 s, con su sombra | bajo |
| Poste que falla | patrón de encendido irregular en su foco y su emisivo | muy bajo |
| Fluorescente de la bodega | parpadeo corto cada pocos segundos | muy bajo |
| Semáforo en ámbar | medio segundo prendido, medio apagado | muy bajo |
| Ropa tendida, banderas, pasacalle, toldos | 3 cuadros | bajo |
| Copas de árbol y palmeras | 2 cuadros, desfasadas | bajo |
| Charcos con gotas | anillos de 2 cuadros en posiciones al azar | bajo |
| Moscas sobre la basura | 3 puntos que orbitan | muy bajo |
| Humo (anticuchos, un tacho quemado, una chimenea) | ya existe; reusar | — |
| Goteo de un toldo o de una bajada rota | 1 partícula y salpicadura | muy bajo |
| Sombra de gallinazos en vuelo | elipse en el suelo bajo cada uno | muy bajo |
| Vapor de un buzón | reusar el humo, en blanco | muy bajo |

### 5.10 Rastros del apocalipsis

El tono es el del cuaderno: humor, barrio y cariño. La calle cuenta que la gente salió apurada, no que hubo una masacre.

- **Abandono:** puertas de vehículo abiertas, una carretilla volcada con las botellas rotas, zapatos sueltos, una mochila escolar, carritos de mercado, un coche de bebé vacío (con cuidado: uno solo, sin sangre).
- **Defensa vecinal:** barricadas de muebles y llantas en la boca de un callejón, persianas reforzadas con tablas, pintas a brocha «AQUÍ HAY GENTE», «NO ENTRAR», «CUIDADO CON EL PERRO».
- **Vidrio roto:** destellos de 1 px en abanico bajo cada luna o vitrina rota.
- **Sangre, con medida:** como mucho tres manchas por pantalla, siempre seca (rampa de sangre seca), en arrastre o en huella de mano; nunca charcos brillantes. Ninguna sobre símbolos religiosos ni banderas.
- **Humor:** afiche de concierto «HOY» que ya no fue; pizarra del menú a medio borrar; una radio prendida en una azotea (emisivo chiquito).
- **Cautelas de la investigación, vigentes:** nada de logos, marcas, escudos ni nombres reales; nada de combis quemadas como chiste; nada de miseria como estética; vendedores y vecinos con dignidad.

---

## 6. Riesgos

| Riesgo | Dónde | Cómo se controla |
|---|---|---|
| **Huellas de vehículos más grandes cierran la ruta** | `world.js`, `PROPS` | Tras recolocar, comprobar con una búsqueda de camino (círculo de radio 5) que se llega del inicio a la salida, y que queda un paso de 24 px o más a cada lado de todo vehículo cruzado. Dejarlo como prueba en `ACH.debug`. |
| **Los cobradores aparecen dentro de un vehículo** | `placeCobradores` | Usa `fw` y `fh`: revisar las posiciones candidatas con las huellas nuevas. |
| **Zombies que aparecen dentro de una huella** | marcadores y `EXTRA` | Validar cada punto de aparición con `collideCircle`. |
| **Objetos altos tapan enemigos** | `render.js` | Siluetas (2.3). Sin esto, el tráiler de 76 px esconde lo que tenga detrás. |
| **Línea de vista** | `los()` | Usa las huellas: vehículos más grandes tapan más visión. Es deseable (cobertura), pero hay que volver a probar al zombie ciego y a los escolares. |
| **Contrato del SPEC** | `SPEC.md` | Todo es aditivo. Las claves actuales (`tiles.wallBrick`, `props.combiE`, etc.) se mantienen con su forma. Los tamaños del contrato están escritos como aproximados («~64×36»); igual, el arquitecto debe publicar la sección v0.4 antes de empezar (P0). |
| **Un solo archivo de sprites para varias personas** | `sprites.js` | P0 lo parte en archivos por tema. El orden de carga y el script de empaquetado cambian una sola vez. |
| **Tiempo de carga** | `G.draw` pinta píxel por píxel con `fillRect` | Los lotes suman cerca de 700 000 píxeles. Para lienzos de más de 64×64, pintar con `ImageData`. Meta: construir todo el arte en menos de 400 ms. |
| **Cuadros por segundo** | `render.js` | El mapa de luz agrega un volcado a pantalla completa en un lienzo de 480×270: es barato. Prohibido en el bucle: `getImageData`, `shadowBlur`, `filter` y crear degradados. Todo foco es un sprite hecho al cargar. |
| **Memoria** | lienzos horneados | Suelo y capa alta, 768×1440 cada uno: unos 9 MB en total. Sin problema. |
| **Tamaño del archivo único** | `dist/achorado.html` | El arte es código; se estima que pasa de unos 150 KB a 350 KB. Sin problema. |
| **Legibilidad con el mapa de luz** | combate | El ambiente no baja de 60 % de luminosidad. Probar que un caminante fuera de todo foco se distingue a 90 px. |
| **Sesgo de cámara** (opcional) | `game.js` | Cambia lo que el jugador ve venir. Se prueba aparte y se puede apagar. |

---

## 7. Plan de implementación

Orden por retorno visual sobre esfuerzo. P1, P2, P3 y P5 pueden ir en paralelo después de P0. P4 es el más grande y se reparte entre tres personas.

### P0 · Contrato, escala y herramientas — 1 día — arquitecto

**Archivos:** `SPEC.md` (sección v0.4), `index.html`, script de empaquetado, `js/sprites.js`.

**Qué se construye:**
- Sección «Arte v0.4» en el SPEC con: tabla de escala (2.2), regla de proyección (2.3), claves nuevas (abajo), y permiso para cambiar tamaño y huella de los props existentes.
- Partir el arte en archivos que extienden `ACH.sprites`, cargados después de `sprites.js`: `js/sprites/base.js` (clase `G`, rampas, fuente, ayudantes), `calle.js`, `edificios.js`, `vehiculos.js`, `mobiliario.js`, `luz.js`.
- Ayudantes en `base.js`: `RAMPAS` (5.2), `G.fromRows`, `G.toCanvasFast` (con `ImageData`), `txt5`, `txt7`, `txt12`, `sombraSE`.
- Hoja de previsualización (`sprite-preview.html`) que muestra todos los sprites a ×4 junto a Alexander, sobre una regla de metros.

**Claves nuevas del contrato (todas aditivas):**
```
ACH.sprites.font   = { a5, a7, a12 }                 // funciones de texto
ACH.sprites.lots   = { [id]: { ground, over, x, y } } // lienzos horneados por lote
ACH.sprites.light  = { poste, local, brasa, glow:[n] }
ACH.sprites.props += { combiS:[3], tico:[2], carVar:[3], trailerLargo, posteLuz,
                       semaforo, quiosco, triciclo, barrera, cono, contenedor:[4] }
ACH.sprites.decals += { charco:[4], parche:[3], aceite:[2], frenada:[2], buzon:[2],
                        vidrio:[2], sangre:[3], afiche:[6], cartel:[4], pinta:[4] }
ACH.sprites.fx     = { papel:[3], bolsa:[3], gota:[2], mosca }
// propiedad extra en postes con luz: lamp:{x,y} relativa al ancla
```

**Aceptación:** el juego carga igual que antes con los archivos partidos; la hoja de previsualización abre desde `file://`; el build de un solo archivo sigue funcionando.

### P1 · Luz y atmósfera — 2 días — motor

**Archivos:** `js/engine/render.js`, `js/sprites/luz.js`, `js/engine/entities.js` (constantes en `CFG.fx`).

**Qué se construye:** mapa de luz por multiplicación con color de ambiente; sprites de foco en 4 bandas; pase de emisivos; niebla por profundidad y niebla baja de callejón; viñeta fija; sombra de contacto bajo entidades; quitar el velo gris; opción de **sesgo de cámara** (la cámara se adelanta 24 px hacia donde mira Alexander y 16 px hacia la vereda más cercana), detrás de una constante.

**Aceptación:**
- Con los sprites actuales, la captura ya tiene un extremo oscuro (menos de 20 de luminosidad) y uno claro (más de 80).
- 60 cuadros por segundo estables con 34 zombies.
- Todas las constantes están en `CFG.fx` y se pueden apagar una por una.
- Un caminante fuera de todo foco se distingue del asfalto a 90 px.

**Nota:** los focos se colocan primero en posiciones fijas; cuando P5 entregue `lamp`, pasan a los postes.

### P2 · Suelo: valores y pista con historia — 2 días — sprites

**Archivos:** `js/sprites/calle.js`, `js/engine/render.js` (`buildGround`), `js/engine/world.js` (lista de calcomanías).

**Qué se construye:** asfalto, vereda, berma, callejón y sardinel con las rampas nuevas; sardinel con cara vertical; rompemuelles y cebra gastados; calcomanías grandes (parches, charcos, aceite, frenadas, buzones, flechas y «DESPACIO» pintados en la pista este); oclusión en la base de muros y sardineles; unas 60 calcomanías repartidas con semilla, más densas cerca de los hitos.

**Aceptación:**
- A pantalla completa sobre la pista no se percibe la grilla de 16 px.
- En grises, el asfalto queda entre 18 y 32 y la vereda entre 50 y 62.
- Ninguna calcomanía tiene colisión; el recorrido no cambia.

### P3 · Vehículos a escala — 3 a 4 días — sprites + motor

**Archivos:** `js/sprites/vehiculos.js`, `js/engine/world.js` (`PROPS`, `placeCobradores`), `js/engine/render.js` (siluetas).

**Qué se construye:** todos los vehículos de 4.1 con mapas de píxeles para cabinas, ruedas y lunas; variantes hacia el sur; recolocación completa según el sentido del tránsito; siluetas de entidades detrás de objetos altos; prueba de ruta en `ACH.debug`.

**Aceptación:**
- En la hoja de previsualización, junto a Alexander: el auto le llega al pecho, la combi le saca media cabeza de costado, el tráiler lo duplica.
- La prueba de ruta pasa del inicio a la salida.
- Ningún zombie ni cobrador aparece dentro de una huella.
- Un zombie detrás del tráiler se ve como silueta.
- Todo texto de vehículo cumple 2.4.

**Riesgo:** es el paquete que más toca el juego. Hacer una pasada de juego completa antes de darlo por cerrado.

### P4 · Kit de edificios — 8 a 10 días — tres personas

**P4a · Motor de lotes — 2 días — motor**
- **Archivos:** `js/engine/world.js` (tabla `LOTS` de 3.4, que reemplaza las capas `over` de las columnas 9 y 38), `js/engine/render.js` (hornear `ground` y `over` de cada lote; capa alta; sombras de edificio sobre la vereda).
- **Aceptación:** con lotes de prueba (rectángulos de color con la altura correcta), `grid` es idéntico al actual tile por tile; la sombra escalonada cae sobre la vereda oeste; los callejones se ven completos.

**P4b · Piezas y arquetipos — 5 a 6 días — dos de sprites**
- **Archivos:** `js/sprites/edificios.js`.
- **Reparto:** una persona hace las piezas comunes y A1, A2, A3, A10; la otra, A4 a A9 y las azoteas.
- **Aceptación:** cada arquetipo se reconoce en la hoja de previsualización sin leer el texto; se cumplen las reglas de variación de 3.3; ninguna puerta mide menos de 34 px de alto; cada lote tiene su detalle único.

**P4c · Rotulación — 1 a 2 días — sprites**
- **Archivos:** `js/sprites/base.js` (fuentes), `js/sprites/edificios.js` (bandas, letreros bandera, avisos pintados, mural).
- **Aceptación:** todos los nombres de 2.4 se leen en una captura a ×3; el mural mide 144×48 y se reconoce desde la pista este; ningún texto mide menos de 5 px ni está girado; se verificó que ningún nombre es real.

### P5 · Postes, cables, afiches y mobiliario — 2 a 3 días — sprites + motor

**Archivos:** `js/sprites/mobiliario.js`, `js/engine/render.js` (`buildCables`, sombras de cables), `js/engine/world.js`.

**Qué se construye:** postes de 4.2 con `lamp`; cuatro cables por tramo, acometidas y cruces de calle; sombras de cable; afiches de 12×16 en serie; carteles amarrados; paradero, semáforo, árboles y palmeras nuevos; copas en la capa alta.

**Aceptación:**
- El poste se distingue de los cables en una captura a 1×.
- Se puede leer al menos una palabra en cada grupo de afiches.
- Los gallinazos siguen posándose bien (`top` actualizado).
- Los focos de P1 salen de `lamp`.

### P6 · Vida animada — 2 días — motor + sprites

**Archivos:** `js/engine/fx.js`, `js/engine/render.js`, `js/sprites/luz.js`, `js/sprites/mobiliario.js`.

**Qué se construye:** la tabla de 5.9, en ese orden de prioridad: parpadeos y semáforo, basura al viento, cables que se mecen, ropa y banderas, charcos, moscas, goteos.

**Aceptación:** en cualquier pantalla quieta hay al menos tres cosas moviéndose además de los personajes; nunca más de 40 partículas de ambiente; 60 cuadros por segundo.

### P7 · Rastros del apocalipsis — 2 días — sprites + motor

**Archivos:** `js/sprites/calle.js`, `js/sprites/mobiliario.js`, `js/engine/world.js`.

**Qué se construye:** la lista de 5.10, colocada a mano alrededor de los siete hitos; barricadas (solo dibujo sobre tiles ya sólidos).

**Aceptación:** cada hito cuenta una escena pequeña que se entiende sin texto; como mucho tres manchas de sangre por pantalla; se respetan todas las cautelas.

### P8 · Personajes y pase final — 2 días — sprites + motor

**Archivos:** `js/sprites.js` (personajes), `js/engine/render.js`.

**Qué se construye:** luz de borde en Alexander y zombies; revisión de sus rampas con 5.2; cadáveres con sombra; cuadros `hurt` revisados para las siluetas; pase de rendimiento (tiempo de carga y cuadros) y de contraste (prueba en grises en los siete puntos de revisión).

**Aceptación:** los criterios «Hecho cuando» del SPEC siguen cumpliéndose; carga del arte en menos de 400 ms; la prueba en grises pasa en los siete puntos.

---

## 8. Lista de control para revisar cada entrega

1. ¿Está a escala? Se compara con Alexander en la hoja de previsualización.
2. ¿Respeta la proyección? Solo caras sur de frente; nada abatido ni girado.
3. ¿El texto cumple la regla? 5 px o más, plano frontal, contraste, sin píxeles borrados, nombre inventado.
4. ¿Usa las rampas? Ninguna sombra hecha por multiplicación en superficies grandes.
5. ¿Las sombras caen al sureste y son violáceas?
6. ¿Pasa la prueba en grises? Personajes primero.
7. ¿Tiene zonas de descanso? Regla 70/30.
8. ¿Cambió alguna huella? Si cambió, se corrió la prueba de ruta.
9. ¿Sigue a 60 cuadros por segundo y abre desde `file://` sin errores?
10. ¿Respeta las cautelas? Sin marcas, sin escudos, sin rostros reales, con dignidad.
