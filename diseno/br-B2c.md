# Barranco · B2c · arte de personajes y objetos

Archivo: `juego/js/barranco/arte-personajes.js` (script clásico, ~1900 líneas). Prueba: `juego/preview-br-personajes.html`.
Publica **`ACH.sprites.br.pj`** (contrato `BARRANCO.md` §10.3) y registra los zombies también en `ACH.sprites.zvar` (misma clave).

## Cómo carga
- Va **después** de `sprites.js`, `zombies.js` y del arte de Costa Verde (`js/costaverde/arte-personajes.js`; de ahí sale `chichaMorada` = su `chicha`). Solo necesita `base.js` y `px.chars`; si falta algo se omite lo que depende de ello y no lanza error.
- Horneado: **0.6 ms al cargar**, todo lo grande es **perezoso** (al primer acceso). `ACH.sprites.br.bakeAll()` fuerza todo (≈105 ms la primera vez, ~600 lienzos) y devuelve los ms; `ACH.sprites.br.arteMs` = coste inicial. `ACH.sprites.br.zvarKeys` lista los 9 zombies.
- Sin `shadowBlur`, `filter` ni degradados por cuadro. `getImageData` solo se usa (perezoso, una vez por lienzo) para componer a Alexander con el cajón.
- Todo sprite lleva `ax`/`ay`. «Mira a la derecha» = el motor voltea para la izquierda. Sin nada de blackface ni rasgos exagerados: pieles verdosas/grisáceas en zombies, tonos variados y sin caricatura en los vivos.

## Jefe: Don Jaranón (`pj.jaranon`)
~**66 px de alto = 2.3 × Alexander**, de frente. Terno blanco roto (con piel y una costilla asomando), camisa celeste, corbata granate, pañuelo en el bolsillo, bigote fino, pelo engominado despeinado, piel `#8FA088`, ojos con brillo verde-amarillo y **micrófono antiguo de pedestal** (base de disco, cabeza ovalada con rejilla). Todos: lienzo **100×104, ancla (50,98)** = suelo entre los pies.
| clave | cuadros | uso |
|---|---|---|
| `idle[2]` | 2 | respirar (mic en la mano derecha, pañuelo en la izquierda) |
| `canta[3]` | 3 | cantando al micrófono inclinado, brazo izquierdo abierto / al pecho |
| `pregon[2]` | 2 | 0: dedo en alto «¡Silencio en la sala!»; 1: declama con el pañuelo |
| `notas[2]` | 2 | ataque de notas de vals: 0 inhala con los brazos abajo, 1 los abre y grita |
| `panuelo[3]` | 3 | pañuelazo: 0 arma arriba-izquierda, 1 barrido al frente (pañuelo largo horizontal), 2 termina a la derecha |
| `zapateo[3]` | 3 | 0 rodilla arriba, **1 pisotón** (cuerpo agachado, polvo a los lados), 2 recupera |
| `sostenida[2]` | 2 | nota sostenida: cabeza atrás, boca en «O», 1 cuadro por vibrato |
| `sinAire[2]` | 2 | «¡Aire, aire!»: encorvado, manos en las rodillas, sudor, boca abierta |
| `aturdido[2]` | 2 | contrapunto: ojos en X, lengua afuera, estrellitas girando |
| `hurt` | 1 | silueta blanca de `idle[0]` |
| `sentado` | 1 | al vencerlo: sentado en el borde del tabladillo, mirada apagada (ojos «dim»), manos en las rodillas. Ancla (50,98) = suelo de los pies colgando |

Ataques: `nota[3]` (corchea, dos ligadas, negra con destellos; 18×20 @9,10, doradas con contorno), `notitas[2]` (extra, 10×12 @5,6, titilan: para los músicos callejeros), `onda` (anillo dorado 96×96 @48,48, radio 47 px; **`ondaSuelo`** extra = elipse 96×48 @48,24, para el pisotón), `conoSostenida` (cono de 50°, 124×104, **vértice en (0,52)**, mira a la derecha, translúcido con arcos cada 16 px, radio 120 px; el motor lo rota/estira).

## Banda (de frente, sentados, 56×52 @28,48)
- `guitarristaZ = { toca[4] }`: zombi con sombrero de paja y guayabera crema sentado en silla de madera, guitarra criolla sobre el regazo; la mano derecha rasguea (cuadros 0..3), la izquierda al mástil.
- `cajoneroZ = { toca[4], cae }`: sentado sobre el cajón, pañuelo rojo al cuello, boina; golpea los costados (manos alternan arriba/abajo, marquitas de golpe). `cae`: 56×34 @18,31, tendido de espaldas con el cajón volcado y estrellitas.

## Zombies (formato `ACH.zvar`: `{ move[6], hurt[6], dead }`, mira a la derecha, lienzo 36×(alto+8), ancla ≈ (16, alto−2))
Claves: `br_poeta` (chaqueta violeta, bufanda mostaza, libro; murmura), `br_poetaRojo` (el del cuaderno: verde botella, **sombrero rojo**, cuaderno granate en la mano), `br_pintor` (blusón salpicado, boina, pincel con pintura azul y paleta), `br_musico_zampona` (gorro de lana, zampoña de 6 tubos al labio), `br_musico_guitarra` (guayabera, sombrero de paja, guitarra), `br_musico_cajon` (camisa blanca, pañuelo rojo, cajón bajo el brazo), `br_novio` (terno guindo, corbata roja, rosa en la solapa), `br_novia` (vestido lila con falda que se mece, cinta roja, flor en el pelo), `br_jaranero` (camisa blanca de mangas anchas, chaleco, pañuelo rojo a la cintura, sombrero de paja; `move` = **zapateo con un pañuelo en alto**, no un caminar).
Extras (todos `[n]` de lienzos del mismo tamaño y ancla que `move`):
- `br_poeta`/`br_poetaRojo`: **`declama[2]`** (brazo en alto con el libro, boca abierta: los 1.5 s que se para a declamar).
- `br_pintor`: **`lanza[2]`** (0 brazo atrás armando, 1 brazo adelante soltando el brochazo).
- los 3 músicos: **`toca[4]`** (parado, tocando el instrumento).
- `br_novio`/`br_novia`: **`mano[6]`** = caminar **de la mano**: el brazo de atrás del novio y el de adelante de la novia están estirados. `mano.hand = [dx, dy]` (respecto del ancla): novio **[-5,-11]**, novia **[10,-11]**. Con la **novia a 15 px a la izquierda del novio** (ancla a ancla, caminando a la derecha) las manos se tocan. Corazón rosado sobre la cabeza del novio en `mano`.
- `br_novio.despechado` / `br_novia.despechado` = `{ move[6], hurt[6], dead }`: piel enrojecida, **lágrimas** cayendo, boca abierta, los dos brazos al frente.
Los `dead` son cadáveres vistos desde arriba, cabeza a la izquierda (28×13 aprox., como los de Costa Verde).

## Props y proyectiles
| clave | qué | tamaño / ancla |
|---|---|---|
| `caballete` | caballete de madera con un atardecer mal pintado; `.broken` = patas separadas y lienzo rajado en el piso; `.tall = true` | 32×44 @16,41 (`fw`18 `fh`8) |
| `brochazo` | grumo de pintura en vuelo (azul); `.alt` = 2º cuadro; `.colores[4]` (rojo, azul, amarillo, verde, cada uno con `.alt`) | 18×14 @9,7 |
| `mancha` | mancha de pintura en el piso, translúcida, sin contorno (azul); `.v[4]` = variantes de color/forma | 32×18 @16,9 |
| `letra[4]` | las letras **A M O R** flotantes del poeta (lila con brillo) | 13×15 @6,8 |
| `charco` | charco de cerveza translúcido ámbar con burbujas; `.alt` = 2º cuadro (brillo) | 48×26 @24,13 (≈40 px de diámetro útil) |
| `vidrios[3]` | esquirlas de vidrio verde/claro con destellos | 18×12 @9,6 |
| `botellaVuelo` / `botellaDoradaVuelo` | botella girando: `.frames[8]` (cada 45°) | 22×22 @11,11 |
| `cajonSuelo` | cajón en el piso (para recoger) | 26×20 @13,18 |
| `onda`, `ondaSuelo`, `conoSostenida`, `nota[3]`, `notitas[2]` | ver Jefe | |

## Sobrevivientes (`pj.npc.<id> = { idle[4], habla[2] }`, 44×50 @22,46, ~32 px de alto, de frente, vivos)
`tomas` (Don Tomás: gorro de pescador, barba blanca, chompa azul marino, botas de jebe, caña de pescar a la espalda y balde con pescado), `rosa` (Doña Rosa: pañoleta roja con lunares, delantal manchado, abanico de cartón que se mueve en `idle` y brochetas; humo), `lucia` (Lucía: boina verde, pelo largo, lentes redondos, chaleco lila, bufanda mostaza, lápiz; sin cuaderno), `lucho` (Lucho: chaleco negro, corbata de lazo roja, delantal, paño al hombro, coctelera que se agita y botella), `celedonio` (Don Celedonio: sombrero de paja, guayabera crema, bigote canoso, guitarra criolla sobre el pecho; la mano derecha rasguea). `idle`: 0 neutro, 1 parpadeo+bob, 2 saludo/gesto, 3 bob. `habla[2]`: 0 boca abierta con la mano en gesto, 1 boca cerrada (alternar cada 0.15–0.2 s).

## Objetos (íconos 12×12 @6,11 + `.big` 24×24 @12,22; contorno oscuro)
`cajon`, `botella`, `botellaDorada`, `packBotellas`, `anticucho`, `picarones`, `pescadoFrito`, `emoliente`, `cuaderno` (también en `pj.items[id]` y, **si no existía**, copiados a `ACH.sprites.items[id]`; `picarones` ya existe en Miraflores y no se pisa). **`chichaMorada`** = el mismo lienzo de la `chicha` de Costa Verde (si no estuviera cargado, se hornea uno propio).

## Alexander con el cajón (`pj.alex.cajon`)
`{ carga:{right,left,down,up}[4], golpe[3] (con .right/.left/.down/.up), bird:{carga,golpe}, nobird:{carga,golpe} }` — el de arriba es el de **`bird`** (con Titina); usa `.nobird` si Titina no está. Se compone sobre `alex.<k>.g3` (sin guitarra).
- `carga`: igual que `alex.walk` (20×28 @10,26; izquierda @9,26). Perfil: el cajón abrazado contra el pecho; de frente: sobre la panza, manos a los lados; de espaldas: a la espalda con las correas.
- `golpe`: se sienta en el cajón. Cuadro **0 se agacha/baja los brazos, 1 manos arriba (arma el golpe), 2 golpe con marquitas amarillas** (sincronizar el 2 con la onda). Lienzos: **lado 32×34 @13,30 (izq @18,30)** — **4 px más alto que el golpe normal** porque sentado queda más arriba, hay que usar el ancla de cada lienzo — y frente/espaldas **32×48 @16,38**. `golpe` como arreglo = los 3 de frente.
- Para lanzar botellas se usa la pose de lanzar que ya existe (`throwMolotov`).

## Para B1a / B1b / B1c
- Zombies: `ACH.sprites.zvar.br_*` ya listos para registrar skins (sin editar nada ajeno). `declama/lanza/toca/mano/despechado` están como propiedades del mismo objeto.
- El jefe es de frente (volteo horizontal por el motor); todos los cuadros comparten ancla (50,98) salvo `sentado` (mismo ancla). `onda` y `conoSostenida` sirven rotando/escalando.
- Todo con nombre de bloque provisorio si falta el arte: nada lanza error.

## Problemas conocidos / pendientes
- Dibujado «a ojo» en pantalla de 800×600: los zombies y vivos se leen bien a zoom 4–6; Don Jaranón tiene la cara muy marcada (ojos grandes, a propósito, para que se lea a 66 px).
- `mano.hand` está medido para el cuadro 0..5 con ±0.3 px de vaivén.
- El cono, `onda` y `charco` son translúcidos (sin contorno): en pantalla clara se ven suaves, de noche brillan.
- No hay `dead` propio de Don Jaranón (el contrato no lo pide): usar `sentado`.
- No se tocó ningún archivo ajeno. (Nota de proceso: `/tmp/.../scratchpad` se comparte con otros agentes; mis trozos de trabajo estaban en `scratchpad/b2c/`.)

## Probar
`cd juego && ruby -run -e httpd . -p 8736 -b 127.0.0.1` y abrir `preview-br-personajes.html`. Parámetros: `?z=N` zoom, `?solo=zombis|hoja|jefe|props|vivos|objetos|alex`, `&id=texto` filtra por clave, `&strip=1` cuadros por separado. Botón «fondo» alterna 4 fondos.
