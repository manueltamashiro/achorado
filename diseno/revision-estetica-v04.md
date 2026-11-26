# ACHORADO — Revisión de arte del build v0.4

**Para:** dueño del proyecto, arquitecto y equipos de sprites y motor.
**Qué se revisó:** `juego/dist/achorado.html` y `dist/preview.html`, recién construidos con `sh build.sh`, a 1440×810 (escala ×3). Se compara contra la lista de control de `revision-estetica.md` (sección 8) y contra la meta: que una captura cualquiera pase por pixel art comercial de primera línea.
**Puntos visitados:** inicio, bodega, ferretería y chifa, primer jirón, mural CALLAO, tráiler de 40 pies, botica, segundo jirón, patio de contenedores, pie del cerro y escalera. Además, la hoja de sprites junto a Alexander, tres ampliaciones a ×4 y una captura en grises.

---

## 1. Veredicto

**Todavía no es primera línea. Es un 7 sobre 10; la meta es 9.**

El salto desde v0.3 es enorme y la decisión de girar la avenida fue correcta: las fachadas se leen enteras, los vehículos están a escala y la calle ya es Callao sin leer un solo letrero. La cuadra de la bodega y la esquina del chifa, vistas solas, están cerca del nivel buscado.

Lo que separa al build de la meta ya no es de dibujo sino de **dirección de la imagen**:

1. **Los personajes no mandan.** En la captura en grises lo primero que se ve es el contenedor blanco, la cabina blanca y la ventana encendida. Alexander y los zombies se funden con el asfalto y con los props de la vereda.
2. **No hay jerarquía de foco.** Todos los locales y uno de cada dos postes están prendidos con la misma fuerza. Ninguna pantalla tiene un punto que mande.
3. **El suelo no descansa.** Moteado, tramado de la luz, franjas rosadas tramadas y niebla suman ruido en la superficie que más pantalla ocupa.
4. **Hay errores visibles que un juego comercial no deja pasar:** texto de pista de cabeza, el mural que se lee «CALLAQ», la palabra ACHU cinco veces en dos pantallas.

Ninguno de estos puntos exige rehacer arte. Los cinco primeros arreglos de la sección 4 suman unos dos días de trabajo y son los que más suben la nota.

---

## 2. Lista de control (sección 8 de la revisión anterior)

| # | Punto | Resultado | Evidencia |
|---|---|---|---|
| 1 | Escala frente a Alexander | **Pasa** | En la hoja: el auto le llega al pecho, la combi le saca media cabeza, el contenedor lo duplica, el poste mide unas cinco personas. Las puertas dejan aire sobre su cabeza. |
| 2 | Proyección | **Pasa** | Caras sur de frente, azoteas arriba, manzana sur vista desde atrás. Nada abatido. |
| 3 | Regla de texto | **Falla en dos sitios** | (a) La pintura vial del carril hacia el oeste se gira 180° (`render.js:422`): «DESPACIO», «PARE» y «BUS» salen de cabeza. (b) El mural se lee «CALLAQ»: una chorrera de pintura cae justo de la O. El resto cumple: ACH7 en bandas, ACH5 en carteles, buen contraste. |
| 4 | Rampas | **Pasa en lo nuevo** | Los archivos de `js/sprites/` no usan `shade()`. Quedan 35 usos en `sprites.js` (personajes y arte viejo) y 8 en `render.js`; no revisé uno por uno sobre qué superficie caen. |
| 5 | Sombras al sureste y violáceas | **Pasa** | `#2a2440` en motor y sprites; sombra de poste y de árbol sesgada al sureste; sombra de manzana y oclusión en la base de los muros. Solo quedan negros `rgba(0,0,0,…)` en el dibujo provisorio de lotes de `render.js` (líneas 139–313). |
| 6 | Prueba en grises | **Falla** | Ver veredicto, punto 1. |
| 7 | Descanso 70/30 | **Falla en el suelo, pasa en fachadas** | Los muros descansan bien. Pista, vereda y berma no. |
| 8 | Huellas y ruta | **Pasa** | `routeCheck()` da `ok` (534 pasos); `spawnCheck()` devuelve lista vacía. |
| 9 | 60 cuadros por segundo | **No verificado** | El horneado tarda 61 ms (meta: 400) y un paso de simulación cuesta 0,04 ms. Los cuadros por segundo no se pudieron medir: la pestaña de revisión corría en segundo plano y el navegador la frena. Hay que medirlo con F3 en una ventana en primer plano. Sin errores en consola. |
| 10 | Cautelas | **Pasa con tres dudas** | No vi logos, escudos ni rostros reales. Dudas: (a) no comprobé en internet que los nombres sean inventados; (b) «ACHU», «TABL» y otros prefijos de contenedor tienen el formato de los códigos reales de propietario (cuatro letras terminadas en U): confirmar que no existen; (c) la camiseta de Alexander, a rayas verticales azules y blancas, se puede leer como la de un club de fútbol real. Lo decide el dueño. |

No observé las animaciones de ambiente (cables, basura, parpadeos): la revisión se hizo con capturas fijas.

---

## 3. Puntaje por área

| Área | Nota | Comentario |
|---|---|---|
| Escala y proporción | 9 | Resuelto. |
| Proyección y lectura de edificios | 9 | El giro de la avenida funcionó. |
| Identidad Callao | 8,5 | Ladrillo sin tarrajear, fierros, tanques, combis, mototaxis, afiches, contenedores, escalera pintada. Se reconoce el barrio. |
| Luz y sombras | 8 | Focos cálidos sobre ambiente frío, sombras violáceas, oclusión. Falta jerarquía. |
| Rotulación y texto | 7,5 | Fuentes limpias y legibles a 1×. Bajan la nota la pintura vial de cabeza y «CALLAQ». |
| Color y acentos chicha | 7 | Armonía correcta pero apagada: el ambiente multiplica todo hacia el gris azulado y los acentos solo viven en los afiches. |
| Consistencia entre artistas | 7 | Edificios y vehículos comparten densidad y contorno. Desentonan el suelo (procedural, moteado), los personajes (menos pasos de rampa) y el HUD (otra grilla). |
| Estructura de valor (grises) | 6 | Hay claros y oscuros, pero los claros están en el lugar equivocado: vehículos blancos, no personajes. |
| Composición y foco | 6 | Densidad pareja de props y de luces; ningún hito domina su pantalla. |
| Ruido frente a información | 6 | El suelo tiene demasiada textura fina. |
| Personajes en combate | 5,5 | Alexander pegado a dos zombies es una mancha. Sobre asfalto, fuera de un foco, cuesta ubicarlo. |
| **Global** | **7** | Meta: 9. |

---

## 4. Los 10 arreglos, por retorno visual sobre esfuerzo

### 1. Que los personajes sean lo primero que se ve — medio día
- **Archivos:** `js/sprites.js` (`rimHi`, `rimLo`, `outlineRim`), `js/engine/entities.js` (`CFG.fx`), `js/engine/render.js`.
- **Cambio:**
  - Luz de borde más clara: `rimHi` de `#8fa6c2` a `#d5dbe0`, `rimLo` a `#9fb0c4`. Hoy es un gris medio que no separa.
  - `contactShadow` de 0,3 a 0,45.
  - `alexLight` de 0,55 a 0,8, y un halo chico equivalente (fuerza 0,35) bajo cada zombie a menos de 140 px de Alexander.
  - Si no alcanza: dibujar las entidades después del mapa de luz, con un tinte propio al 85 %, para que el ambiente no las oscurezca igual que al piso.
- **Aceptación:** en la captura en grises de los nueve puntos de revisión, Alexander y todo zombie a menos de 120 px se ubican en menos de un segundo. La luz de la cabeza de cada personaje supera en 25 puntos de luminosidad (de 100) al suelo que pisa.

### 2. Quitar el texto de pista de cabeza — 15 minutos
- **Archivos:** `js/engine/world.js` (líneas 293, 296, 298 y 300: `legend(…, true)`), `js/engine/render.js:422`.
- **Cambio:** en el carril hacia el oeste, reemplazar las leyendas por la flecha ← (`legend` 4) o por rombos y líneas de pare. El giro de 180° queda solo para flechas.
- **Aceptación:** ninguna palabra aparece de cabeza ni en espejo en todo el nivel. `rot: 2` se usa únicamente con calcomanías sin letras.

### 3. Mural: que diga CALLAO y que nada lo tape — 30 minutos
- **Archivos:** `js/sprites/edificios-industria.js` (chorreras, líneas 719–727), `js/engine/world.js` (postes de las columnas 50–59).
- **Cambio:** las chorreras miden como mucho 4 px y nunca salen de la mitad derecha de una letra cerrada (O, A). Sacar del frente del mural el poste y los cables que hoy cruzan las letras: ningún poste entre las columnas 52 y 57.
- **Aceptación:** a 1×, cinco personas que no conocen el juego leen «CALLAO». Ningún prop ni cable cruza las letras.

### 4. Bajar el valor de los vehículos blancos — 2 horas
- **Archivos:** `js/sprites/vehiculos.js`.
- **Cambio:** techos de combis vistas desde arriba, cabinas de tracto y contenedor blanco bajan un paso de rampa (tope `#a4abaa`, no `#cfd3cc`), con suciedad, parrilla o carga encima. Hoy son las manchas más claras de la pantalla.
- **Aceptación:** ningún vehículo tiene más del 10 % de su área por encima de 75 de luminosidad. En grises, un vehículo nunca es lo primero que se ve.

### 5. Un foco que mande por pantalla — 2 horas
- **Archivos:** `js/engine/entities.js` (`lampEvery`, `lotLight`), `js/engine/world.js` (luces de lote).
- **Cambio:** `lampEvery` de 2 a 3. Luz de local a fuerza completa solo en los hitos (bodega, chifa, mural, botica, escalera); el resto de locales, a 0,4 o apagados.
- **Aceptación:** en cada una de las ocho capturas de hito, con los ojos entrecerrados, la zona más clara es el hito. Como mucho tres focos cálidos por pantalla.

### 6. Limpiar el suelo — 1 día
- **Archivos:** `js/sprites/calle.js` (moteado de asfalto y vereda, `pinkStripes`), `js/sprites/luz.js` (borde tramado de los focos).
- **Cambio:**
  - Mitad de moteado en el asfalto; juntas de la vereda con menos contraste.
  - Las franjas rosadas del sardinel se redibujan como pintura sólida en dos valores. Tramadas al 50 %, hoy parecen un error gráfico.
  - El tramado de la luz se limita a 1 px en el cambio de banda.
- **Aceptación:** en un recorte de pista de 160×90 sin props, cuatro valores cubren el 90 % de los píxeles. El sardinel rosado se lee como pintura a 1×.

### 7. Romper la repetición — medio día
- **Archivos:** `js/sprites/vehiculos.js`, `js/sprites/edificios-industria.js` (contenedores), `js/engine/world.js` (`PROPS`).
- **Cambio:** cuatro nombres de naviera inventados en vez de «ACHU» en todos; una sola palabra grande por pantalla, los demás contenedores solo con código chico. Un solo tracto por pantalla. Los postes con afiches alternan dos órdenes distintos.
- **Aceptación:** en ningún punto del nivel se ve dos veces la misma palabra grande ni dos vehículos idénticos del mismo color.

### 8. Devolver color a las fachadas — 2 horas, con prueba
- **Archivos:** `js/engine/entities.js` (`lightAmbient`), `js/sprites/edificios-casas.js`.
- **Cambio:** probar `lightAmbient` de `#a8adc3` a `#b6b4c4` (menos azul, un poco más claro). Pasar por el pase de emisivos la banda de letrero de los locales hito. Un acento saturado por lote (puerta o reja) en el paso «luz» de su rampa.
- **Aceptación:** en cada pantalla hay al menos una fachada con saturación de 45 % o más después de la luz. El rosado del mural se distingue del gris del muro a 1×. No lo probé: si aplana las sombras, se revierte.

### 9. Un final que se vea venir — 1 día
- **Archivos:** `js/sprites/edificios-casas.js` (`cerro`, `escalera`), `js/engine/world.js`.
- **Cambio:** el suelo del cerro es hoy un plano beige claro, sin pasos de valor: darle terrazas en tres valores de la rampa de tierra, con sombra. La escalera pintada gana una guirnalda de focos (emisivo) y se ensancha o se adelanta para que no la corte el borde superior de la pantalla.
- **Aceptación:** la salida se reconoce a 1× desde la columna 112. El suelo del cerro queda entre 45 y 52 de luminosidad, con tres pasos de valor visibles.

### 10. HUD en la misma grilla que el juego — medio día
- **Archivos:** `css/game.css`, `js/engine/hud.js`.
- **Cambio:** la caja de arriba a la izquierda tapa cerca de un quinto del ancho y del alto, y sus barras no tienen ícono. Reducirla un 30 %, alinear todos sus bordes a la grilla de 480×270, poner ícono a cada barra y ocultar la franja de controles a los 10 segundos.
- **Aceptación:** el HUD ocupa menos del 6 % de la pantalla; ningún borde cae fuera de la grilla; la ayuda de controles desaparece sola.

---

## 5. Lo que ya está excelente y no se toca

- **La avenida de oeste a este** y la regla «todo edificio dentro de su huella».
- **La tabla de escala.** Vehículos, postes, puertas y árboles están bien frente a Alexander.
- **La bodega Doña Luz:** toldo a rayas, vitrina encendida, letrero bandera, balones de gas. Es la pieza de referencia para el resto.
- **La esquina del chifa:** ladrillo rojo, banda negra con tinta crema, mampara con luz cálida, semáforo.
- **Las fuentes ACH5 y ACH7** y las bandas de letrero. Se leen a 1× sin esfuerzo.
- **Las combis y la custer de costado:** franjas, cartel de ruta, parrilla con bultos.
- **Postes, crucetas, transformadores y marañas de cables**, con su sombra al sureste.
- **El mapa de luz:** ambiente frío con focos cálidos y sombras violáceas. Se ajusta la fuerza, no el sistema.
- **Las azoteas:** tanques, tendales, bidones y sillas le dan vida a la manzana sin competir con la calle.
- **La botica** con su cruz verde: único frente blanco de la cuadra, hito claro.
- **El horneado en 61 ms** y las pruebas `routeCheck` y `spawnCheck` en verde.

---

## 6. Notas sueltas

- Hay un archivo vacío, `juego/js/engine/orld.js` (0 bytes), que `index.html` no carga. Parece un error de tipeo; conviene borrarlo.
- Para abrir una pestaña propia tuve que cerrar una pestaña vieja del navegador integrado (`127.0.0.1:8765`, cuyo servidor ya no respondía): el panel había llegado al tope. El servidor de revisión (puerto 8811) quedó apagado.
