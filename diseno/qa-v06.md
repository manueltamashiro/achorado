# QA de integración — ACHORADO v0.6 / v0.6b

Probado en navegador real (1440×810) sobre `dist/achorado.html`, con eventos reales de teclado y mouse y con `ACH.debug.*`. Los números salen de la consola; el oído final es del dueño.

## Arranque y rendimiento
- Consola limpia (sin errores ni avisos en toda la sesión).
- `gfx.missing()` = `[]`, `routeCheck()` ok (534 pasos, también con radio 12), `spawnCheck()` = `[]`.
- Título, intro y arranque (Enter) funcionan; ganar → Enter reinicia mundo, mochila y zombies.
- Costo por cuadro con 42 zombies amontonados junto a Alexander: `update` p50 0,40 ms / p95 1,0 ms; `render` (lado JS) p50 0,30 ms / p95 0,8 ms. Picos aislados de 6 y 12 ms (recolección de basura o horneado). Sobra margen para 60 fps.

## Errores encontrados y corregidos
| # | Gravedad | Dónde | Problema | Arreglo |
|---|---|---|---|---|
| 1 | Alta | `zombies.js` `moveVehicle` | La silla de ruedas (y el skate) se quedaba pegada para siempre contra un poste o una palma: la rapidez se apagaba con cada choque. | Si choca más de 0,3 s seguidos, gira 75° a un lado (alternando) y recupera impulso. Verificado: ya llega a Alexander. |
| 2 | Media | `render.js` `curSpr` | El arte `.dark` de los postes nunca se usaba: al apagarse la luz se dibujaba una copia teñida. | Un prop `broken` usa `s.broken`, luego `s.dark` y solo al final la copia teñida. |
| 3 | Media | `entities.js` | El cobrador zombie nunca decía «¡Al fondo hay sitio!» (la frase existía en `voces.js`, pero nadie la llamaba). | Al gritar, llama `ACH.audio.say('cobrador', {who:'cobrador', x, y})`. Verificado: globo `vbub cobrador`. |

## Verificado sin fallas
- **Zombies variados:** 10 `loco` se mueven y persiguen. Hay 45 skins horneadas con alturas bajo/normal/alto y atuendos claramente distintos (lámina de sprites revisada). El sprite `zvar` se usa en el dibujo, en las siluetas y en los cadáveres. La carretilla bloquea el golpe de frente («shield.clang», sin daño) y recibe daño por detrás. Silla, skate y bici sueltan su prop; la silla deja `gusano`, los otros `camina`. El cantor jala a otros zombies (`investigar`). Loops de audio topados en 4 (`zvar.loops`).
- **Interacción:** el tico se rompe en 4 golpes con estados 1→1→2→3 y arte de chatarra; hay alarma (suena y se apaga sola a los 6 s, luces intermitentes en el mapa de luz); basura y carretillas pasan a `.broken` y sueltan botín; postes apagan el foco; crujido de vidrio; el perro chilla, huye y queda `wary`; los gatos usan su sprite real, se esconden bajo autos y salen a los 7–13 s.
- **Resortera:** carga con mouse real, la trayectoria prevista cae en el mismo punto que la piedra real (401,401 en ambas), el chanfle se acumula (spin 0,65), aturde y empuja, distrae (zombi pasa a `investigar`), recupera piedras, y el sonido de estirar se corta al soltar. Pose `sling` de Alexander en las dos variantes, mismo tamaño que `attack`.
- **Botín y mochila:** las tablas de botín coinciden con la spec (incluida resortera + piedras ×10); texto «+1 pan con chicharrón»; I/Tab abre y cierra y congela el juego; Esc cierra sin pausar; 1–4 curan; mochila llena avisa «¡Ya no entra nada, causa!»; la mochila se conserva al respawn. La caja del HUD no tapa las flechas de Q.
- **Voces:** el globo sigue la cámara y está sobre quien habla; el límite de 2,5 s funciona; slider «Voces» presente en la pausa (90).
- **Vida social:** la orquesta toca sobre la tarima, un golpe corta la música, los músicos se vuelven hostiles y los bailarines pelean, y los sobrevivientes vuelven a tocar a los 20 s. Se revisaron las 7 ventanas (cantante y siluetas): todas caen dentro de una ventana encendida, ninguna flota sobre la pared.
- **Letreros:** se recorrió la avenida norte y sur. Pilsen rojo/crema/dorado, Cristal azul marino/dorado, Inca Kola azul/amarillo. `marcas(false)` cambia a parodias («PILSÓN», «INTI KOLA», «CRISTÓN») en caliente y `marcas(true)` vuelve, sin errores y sin romper rutas.
- **Regresión:** guitarrazo, Q con Titina, M silencio, pausa con sliders, niebla y luz nocturna, perros que ladran, combis (son props), muerte y respawn, y victoria en la escalera.

## Abiertos (baja gravedad)
1. **Baja:** la placa azul de calle («AV. GAMBETTA / JR. …») tapa en parte el aviso de la chifa y el de «ATENCIÓN» de la botica en dos esquinas.
2. **Baja:** una segunda resortera ocupa otra casilla de la mochila (apila 1), aunque ya se tenga una.
3. **Baja:** la silla recién creada puede arrancar mirando al lado contrario hasta que gira (inercia).
4. **Informativo:** el reparto es ~64 % `camina` en el nivel inicial (la spec pide ~40 %) y no aparece ninguna `silla` ni `carretilla`; salen solo por `assign` aleatorio. Conviene ajustar `caminaShare` o fijar posiciones.
5. **Informativo:** no se pudo oír el audio (el contexto queda `locked` hasta un gesto real); la verificación fue por eventos y estado.
6. Las alarmas de auto se probaron por estado y mapa de luz; el parpadeo en pantalla no se capturó con captura de imagen.

## Archivos tocados
`js/engine/zombies.js`, `js/engine/render.js`, `js/engine/entities.js`.

## Fix pass (post-QA)
- **Variedad (abierto 4):** nuevo `ACH.zvar.balance(G)` en `zombies.js`, llamado al final de `spawnInitial` (`entities.js`). Deja a todos en `camina` y reparte: 14 de 34 `camina` (41 %) y mínimos por estilo (bici 2, skate 2, carretilla 2, cantor 2, gusano 2, silla 2, cuatro 2, muletas 2, cojo 2) más sobrantes ponderados. El lugar solo ordena candidatos (carril, mercado, vehículos/pasaje, cantores repartidos por cuadra), no descarta el estilo. Bici se reubica en un carril libre. Sin cuatro/skate/bici a menos de 200 px del inicio. 300 arranques: 0 incumplimientos del mínimo, 0 rápidos cerca del inicio, 0 zombies sobre sólidos. Con la orquesta social (8 `camina` extra) el conteo del debug sale 22 de 42 `camina`.
- **Silla (3):** `moveVehicle` fija `hd` y `flip` hacia la primera dirección pedida por la IA (`hdSet`).
- **Placas (1):** `signBandHit` en `world.js`: el arte opaco de una señal no puede pisar la franja de letreros de la planta baja de un local del lado N; si pisa, se corre de a 8 px (hasta 96) y si no, se omite. La placa «AV. GAMBETTA / JR. COLÓN» pasó de x 628 a 668 y la de «PSJE.» de 1534 a 1558; la de JR. GRAU (antes omitida) ahora aparece en 1374. Verificado con capturas: se leen «CHIFA LA SUERTE / HAY MENÚ» y «ATENCIÓN / AYUDA».
- **Resortera (2):** `tryPickup` en `inventario.js`: si ya se tiene una, la recogida se convierte en piedras ×5 con «+5 piedras». Verificado (resortera 1, piedras 5→10).
- **Alarma (6):** `lightsInto` alterna faro izquierdo/derecho y el brillo ámbar sube de radio 18 a 30 (`render.js`). Verificado en capturas consecutivas: el brillo salta de un faro al otro.
- `routeCheck().ok` = true (también radio 12), `spawnCheck()` = `[]`, `gfx.missing()` = `[]`, consola limpia.
- Archivos tocados: `zombies.js`, `entities.js`, `world.js`, `inventario.js`, `interaccion.js`, `render.js`.
