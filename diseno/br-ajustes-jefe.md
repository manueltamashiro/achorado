# Ajuste del jefe de Barranco (Don Jaranón) — nota

Archivo tocado: **solo** `juego/js/barranco/jaranon.js` (respaldo del original: scratchpad `jaranon.orig.js`). Sin tocar `dist/`.

## Problema (QA)
Un bot que solo machacaba ESPACIO y esquivaba ganaba en 36 s sin buscar contrapuntos. El compás no se notaba: el golpe a destiempo pegaba lo mismo que el golpe a tiempo, y como la ventana es de ±0,12 s en un pulso de 0,6 s, **machacando se acierta el pulso ~40 % de las veces**, así que se ganaban contrapuntos sin querer.

## Cambios (viejo → nuevo)

| Qué | Antes | Ahora |
|---|---|---|
| Vida de Jaranón `K.hp` | 48 | **96** (la marca de 60 % y de 25 % no cambia) |
| Golpe cuerpo a cuerpo (guitarra, puñete, arma en la mano) **a tiempo** | ×1 | **×1,25** (`K.onMul`; se suma al ×1,5–2 del Landó) |
| Golpe cuerpo a cuerpo **a destiempo** | ×1 | **×0,7** (`K.offMul`; texto gris «DESTIEMPO ×0,7») |
| Golpe a destiempo durante ¡RESPONDE! | daño normal; la ventana seguía abierta | **la respuesta falla** (`K.respMissFails`): «¡DESTIEMPO!», se cierra la ventana y al final del compás «se luce». Las melodías siguen contando como respuesta |
| «Se luce» (respuesta sin contestar) | solo el siguiente ataque más grande | además, **coraza de la Voz de Oro: ×0,6 a todo el daño** (`K.vozMul`) hasta el próximo **contrapunto** o un **resbalón en charco** (botella). No aplica mientras está aturdido o resbalando. HUD: «SE LUCE ×0.6» sobre el metrónomo, borde dorado en la barra, toast explicativo la 1.ª vez, «¡SE LE BAJARON LOS HUMOS!» al romperla |
| Aturdido por contrapunto `K.stunT` | 2 s | **2,5 s** (ventana de castigo ×2) |
| Jaraneros (fase 2) | una pareja cada ciclo si no queda ninguno | una pareja al entrar en fase 2; después **solo si no le respondiste** y como mucho cada 12 s (`K.summonEvery`) |
| Losetas `K.tileDmg` | 1 U (10) | **0,8 U** (la fase 2 dura más) |
| Fase 3 — zapateo `K.stompDmg` | 0,8 U | **1 U** |
| Fase 3 — compás de zapateo | pisotón en el pulso 1 (y 3) | además, **abanico de 3 notas en el pulso 2** (con su aviso de siempre, un pulso antes) |
| Texto de la 1.ª respuesta | «…pégale A TIEMPO…» | se añade «(a destiempo, la respuesta falla)» |

Los avisos (destello en el piso, brillo del micrófono, líneas de las notas, losetas que parpadean) no cambiaron: todo sigue saliendo en un pulso y avisado un pulso antes.
Debug: `info()` ahora da también `voz`, `onHits` y `offHits`; `bot(true, {contrapunto: true, ritmo: true})` = bot que solo pega en el pulso.

### Comparación con el chef (Costa Verde)
El chef tiene 40 de vida y toda la guitarra le entra ×1 (70–110 s). Jaranón tiene 96, pero el que lleva el compás le pega en promedio ~2,4 veces más por vida (×1,25 a tiempo, ×1,5–2 con el Landó, ×2 aturdido, tope ×3) y el que machaca le pega ~0,5 (×0,6 de coraza × mezcla de ×1,25 / ×0,7). Por eso la vida dobla y los tiempos quedan en la misma escala que el chef.

## Mediciones
Bot del jefe (`ACH.debug.br.jefe.bot`) con guitarra al 100 %, 100 de vida, 2 comidas (+30), dificultad ACHORADO (la que estaba puesta), arrancando en fase 1. Simulado con `ACH.game.step` a 60 Hz (el panel estaba oculto y el juego se pausa solo); el compás va con el tiempo del juego (reloj interno; 3 corridas de control con el formato de `ACH.br.beat()` de `nivel.js` dieron lo mismo). Página recargada en cada corrida.

- **m — machacar** (`contrapunto: false`): pega siempre que está cerca y no esquiva; a veces acierta el pulso sin querer.
- **r — ritmo + Landó**: pega solo en el pulso, responde en ¡RESPONDE! y toca **T** (Landó del Contrapunto, rango 1) cada vez que se puede.
- b — intermedio: responde a tiempo en ¡RESPONDE! y toca T, pero fuera de esa ventana machaca.
- a — caso extremo (`contrapunto: 'no'`): evita a propósito pegar cerca del pulso (nunca acierta).

| Bot | Antes (48 de vida, sin ajustes) | Ahora |
|---|---|---|
| **m machacar** | **38,3 / 47,7 / 50,7 / 38,4 s**, todas ganadas, termina con 42–55 de vida (QA: 36 s, 48 de vida) | **117,5 / 97,0 / 122,7 / 91,6 / 110,9 / 116,6 / 114,3 / 87,7 s** ganadas (termina con 21–82 de vida; en la mitad de las corridas se comió las 2 comidas); **1 de 9 muere** (84,9 s, jefe con 17 de vida). Saca 4–6 contrapuntos sin querer, ~45 % de golpes a tiempo |
| **r ritmo + T** | (no había bot de ritmo; ver b) | **64,9 / 67,9 / 65,8 / 64,3 s**, todas ganadas, termina con 46–61 (mín. 43) de vida; 5–6 contrapuntos, 3–4 Landós, ~97 % de golpes a tiempo |
| b intermedio | 49,5 / 41,8 / 49,1 / 66,7 / 67,3 s, ganadas (43–66 de vida) | 82,5 / 82,5 / 89,1 s, ganadas (31–55 de vida) |
| a nunca a tiempo | 68,6 / 69,1 / 77,4 s | muere (116,4 s; el jefe todavía en fase 1 con 67 de vida) |

Lectura: machacar ahora toma ~1,6 veces lo que toma jugar al compás (95–120 s contra ~65 s) y se llega al final con la vida justa (en la corrida en que se murió había recibido 150 de daño, más que 100 de vida + 60 de las comidas); quien responde y usa el Landó gana en ~65 s con la mitad de la vida. El bot «a» es un caso patológico (esquiva a propósito el pulso; machacando de verdad se acierta ~40 %), lo dejo anotado: no gana en < 3 min.

## Pendiente / supuestos
- No se pudo medir en tiempo real con el audio de B3 (`src: 'audio'`): el panel del navegador estaba oculto y lo usaba otra sesión. Conviene una partida a mano con música para sentir la ventana de ±0,12 s y el «¡DESTIEMPO!» que cierra la respuesta.
- En «tranqui» la ventana sigue ×1,5 (no tocado); no medí esa dificultad.
- El daño de los jaraneros (`br_jaranero`) es de `zombies.js`/dificultad; solo cambié cuándo los llama.
- La guitarra del que machaca termina en 21–41 de 120 de durabilidad (con riesgo real de romperse si la pelea se alarga).
