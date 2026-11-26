# Costa Verde · C2c · arte de personajes y objetos

Archivo: `juego/js/costaverde/arte-personajes.js` (script clásico, ~2000 líneas). Prueba: `juego/preview-cv-personajes.html`.
Publica **`ACH.sprites.cv.pj`** con las claves de `COSTAVERDE.md` §10.3, más algunos extras (marcados «extra»).

## Cómo carga
- Va **después** de `sprites.js`, `zombies.js` y `miraflores/arte-personajes.js` (§1.2 punto 4). Solo necesita `base.js`; si faltan `sprites.js` / `px.chars` se omite lo que depende de ellos (alexHeld, alexKick, frentes de la pareja) y nada lanza error.
- Horneado: **2–3 ms al cargar**; todo lo grande es **perezoso** (se hornea al primer acceso). `ACH.sprites.cv.bakeAll()` fuerza todo (≈130 ms en total, ~1100 lienzos) y devuelve los ms. `ACH.sprites.cv.arteMs` = coste inicial.
- Lienzos con `ACH.px.canvas` (que `lienzo.js` manda a memoria). Sin `shadowBlur`, `filter`, degradados por cuadro. `getImageData` solo se usa, perezoso y una vez por lienzo, para componer a Alexander con el objeto (igual que `alexInflable`); el resto se dibuja desde rejillas.
- Todo sprite lleva `ax`/`ay` (ancla). Cuando dice «mira a la derecha» el motor voltea para la izquierda.

## Jefe: Maestro Wantán (`pj.chef`)
Cocinero de chifa gordo, **~66 px de alto = 2.4 × Alexander (28 px)**, de frente. Toque alto, chaquetilla blanca con ribete rojo, mandil crema manchado, bigote, cucharón al cinto, wok a la espalda, palitos en las manos, pantalón de cuadritos, zuecos. Sin rasgos étnicos exagerados.

| clave | cuadros | uso sugerido |
|---|---|---|
| `idle[2]` | 2 | respirar (alternar 0.5 s) |
| `alza[2]` | 2 | aviso del abanico/lluvia (0: sube brazos, 1: brazos arriba con palitos abiertos) |
| `lanza[3]` | 3 | tirar palitos (0 armar, 1 lanzar, 2 seguimiento, manos vacías) |
| `llama[3]` | 3 | llamar dumplings: cucharón arriba, golpe, brazos abiertos |
| `salta[3]` | 3 | salto de wok: 0 agacharse, 1 en el aire (ya viene **16 px más arriba** dentro del lienzo), 2 aterrizaje |
| `cae` | 1 | cae de espaldas (cuerpo girado, toque volando) |
| `sentado[2]` | 2 | cansado, con tacita y sudor («¡Un tecito!»), recibe doble daño |
| `hurt` | 1 | silueta blanca de `idle[0]` |
| `dead` | 1 | tendido boca arriba **visto desde arriba, cabeza a la izquierda** (como los zombies) |
| `wok` (extra) | 1 | wok suelto, 40×34 @17,17 |
| `wokRoll[4]` (extra) | 4 | wok rodando (mango girando 90° por cuadro) |

Todos menos `dead`/`wok`: lienzo **100×104, ancla (50,98)** = suelo entre los pies (`cae` ancla 53,98). `dead` 96×52 @48,30.

### Ataques
- `palito.vuela`: 20×7 @10,3, apunta a la derecha (rotar). `palito.clavado`: 12×20 @6,18 (punta clavada).
- `dumpling` = `{ hop[3], muerde[2], dead }`: bola de masa con pliegues arriba, boca enorme con dientitos y **ojitos cerrados en media luna**. 26×28 @12,25 (ancla = piso), `dead` 30×16 @15,11. `hop`: 0 aplastado en el piso, 1 estirado en el aire (sube 5 px dentro del lienzo), 2 bajando.
- `baozi` = lo mismo, grande: 36×40 @17,37, `dead` 40×16 @20,11.
- `sombra[3]` (aviso de caída, translúcida, sin contorno): 19×12, 27×16, 35×20 (centro = ancla), crece y se oscurece; la última lleva anillo rojo. `sombraGrande[3]` (extra, para la onda del wok): 57×31, 81×43, 105×55.

## Perros (`pj.perro[raza]`, raza = chusco salchicha golden pug singpelo husky)
`{ walk:{down,up,left,right}[4], run:{…}[4], bite[2], sit }`. Lienzos **38×26**, ancla **(19,22)** = patas en el suelo, centro del cuerpo (los `left` salen con ancla 18,22 porque son el espejo). `bite[2]` mira a la **derecha** (el motor voltea); `sit` es de frente. Ojos y hocicos grandes, colas y orejas por raza (salchicha larga, pug de máscara negra, sin pelo con copete y orejas grandes, husky con lengua y ojos celestes).

## Heladero (`pj.heladero = { ride[4], stop }`)
Triciclo amarillo con sombrilla roja/amarilla y caja con el logo, de perfil a la derecha. 70×66, ancla **(30,62)**. `ride`: ruedas y pedales giran, sombrilla se mece. `stop`: parado, con el brazo en alto. El logo lee `ACH.cfg.marcasReales`: real **D'ONO/FRIO**, parodia **D'ONO/FRÍO**; si cambia (`ACH.px.onMarcas`) se **repinta en los mismos lienzos** (las referencias del motor siguen válidas).

## Vendedores (`pj.npc.<id> = { idle[4] }`)
`fosfo` (Don Fosfo: gorra negra, bigote, ramo de barras de colores y collares), `kioscoLarco` (polo turquesa, delantal amarillo, bolsa de snack), `deportes` (campera azul, pelota bajo el brazo, silbato), `fuente` (gorrito de papel, delantal, batido y heladito). Personas vivas, piel sana, de frente. 44×50, ancla **(22,46)**, ~30 px de alto. Cuadros: 0 neutro, 1 parpadeo+bob, 2 saludo/habla, 3 bob.

## Zombies (formato `ACH.zvar`: `{ move[6], hurt[6], dead }`, mira a la derecha, ancla = pies)
Claves en `pj` **y** en `ACH.sprites.zvar` (mismo nombre, perezoso): `cv_corredor` (top neón sin mangas, auriculares, **carrera** de 6 cuadros), `cv_turista` (camisa hawaiana, sombrero de pescador, **palo de selfie** con celular), `cv_surfista` (neopreno roto, **tabla bajo el brazo**, descalzo), `cv_parapentista` (casco naranja, arnés, mochila con la vela doblada), `cv_seguridad` (chaleco reflectante, gorra, porra y radio), y `cv_trab_<marca>` con colores de marca:
nike, bananarepublic, tanta, mangos, koasian, popular, bonbonniere, fridays, pardos, cinepolis, hm, miniso, adidas, starbucks, freddo, cinnabon, salazar, haagendazs, masterkong, y las inventadas kiosco, deportes, fuente, granDragon (23 en total; `ACH.sprites.cv.trabKeys` los lista, `ACH.sprites.cv.zvarKeys` lista los 28).
Mismo generador de cuerpos que `trabajadores.js` (copiado): piel verdosa/gris/pálida desaturada, contorno de 1 px con luz de borde. Tamaños: lienzo 36×(hpx+8), anclas ≈ (16, alto-2). La marca va solo en colores y un detalle (el nombre real no se lee: la tienda ya lo dice).

### Pareja (`pj.pareja`)
`{ walk:{right,left,down,up}[4], hurt:{right,left,down,up}[4] }` — **`hurt` tiene la misma forma que `walk`** (siluetas blancas). Es UN enemigo de dos abrazados (él de camisa azul, ella de vestido rosado, corazón sobre las cabezas en el perfil). right/left 46×38, ancla (20,35) / (25,35); down/up 38×34 @19,33 (de espaldas, el pelo tapa las caras). Al partirse el motor usa dos zombies normales.

## Objetos
Íconos 12×12 ancla (6,11) con `.big` 24×24 ancla (12,22), contorno oscuro. Claves en `pj` (y en `pj.items`; además se copian a `ACH.sprites.items[id]` si no existía): `pelota`, `pelotaCuero`, `barraFosfo_verde|rosado|amarillo|celeste` (+ `barraFosfo` = verde), `packFosfo`, `helado`, `paleta`, `chaufa`, `wantan`, `chicha`, `canilleras`.
En el mundo:
- `pelotaSuelta[4]` 12×12 @6,10: rueda (cuadro a cuadro, ciclo cerrado).
- `barraSuelta[color]` 28×16 @14,9, con halo horneado; `.alt` = cuadro más brillante (parpadear cada 0.4 s). **Extra:** `barraHalo[color]` 96×96 @48,48, halo radial para la noche (`drawTop`).
- `heladoVuelo` 18×18 @9,9 con `.frames[4]` (giros de 90°).
- `charcoHelado[2]` 24×12 @12,6, sin contorno negro (es una mancha).

## Alexander
- `alexHeld[id][bird|nobird] = { walk:{dir:[4]}, swing:{dir:[3]}, idle:{dir} }`, `id` = `barraFosfo_<color>` (barra fosforescente que sube con el brazo; en `swing` es el batazo) y `helado` (cono con bola rosada y cereza; en `swing` es el lanzamiento: armar / soltar / mano vacía). Mismos lienzos y anclas que `alexInflable`: walk 20×28 @10,26 (izq @9,26), swing lado 32×30 @13,26 (izq @18,26), frente/espaldas 32×48 @16,38. Se componen sobre los cuadros **sin guitarra** (`alex.<k>.g3`). Perezoso por id×k.
- `alexKick[bird|nobird] = { right, left, down, up }` (cada una `[2]`: rodilla arriba, patada) — **son los mismos lienzos** de `alex.<k>.kick` de `sprites.js` (32×30 @13,26 / izq @18,26; 32×48 @16,38). También `.g1/.g2/.g3` con la guitarra dañada/sin guitarra. Sirve para la pelota y para los perros.

## Para C1a / C1b / C1c
- Los zvar de Costa Verde ya están en `ACH.sprites.zvar['cv_…']`: `zombis.js` puede registrar skins con esas claves sin más.
- El chef necesita volteo horizontal; sus ataques usan siempre las mismas anclas (suelo entre los pies), basta cambiar de cuadro.
- Colores de marca en `cv_trab_*` e icono de helado/paleta no leen `marcasReales` (no llevan logo).

## Problemas conocidos / pendientes
- En el perfil de la pareja las cabezas se pisan un poco; de frente se leen mejor.
- `cv_corredor` mantiene piel verdosa para no confundirse con un vivo; los vendedores vivos usan piel sana.
- No hay `bite` hacia arriba/abajo ni `sit` de perfil (el contrato no los pide).
- `alexHeld` de `helado` en `swing.up/down` tiene el cono corto; se puede afinar con el arte final de C1c.
- Servidor de prueba (puerto 8716) apagado al terminar.

## Probar
`cd juego && ruby -run -e httpd . -p 8716 -b 127.0.0.1` y abrir `preview-cv-personajes.html`. Parámetros: `?z=N` zoom, `?solo=zombis|chef|perros|heladero|vendedores|pareja|objetos|alex`, `&id=texto` filtra por clave, `&strip=1` cuadros por separado, `&sheet=1` hoja de contacto (zombis, perros), `?parodia=1` / botón «marca real / parodia».
