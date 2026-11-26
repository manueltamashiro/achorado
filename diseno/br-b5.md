# B5 — «La última jarana» (cinemática final de Barranco)

Archivos: `juego/js/barranco/final.js` (≈1 500 líneas, autocontenido) y `juego/preview-br-final.html`. No se editó ningún archivo ajeno.

## API real
```
ACH.br.final = { play(opts), stop(), isOn(), debug }
play({ onEnd, t, freeze, dialogo, skippable, ownMusic, keepFrozen, line })   → true/false (false si no pudo hornear)
```
- `onEnd()` se llama al terminar el diálogo (fundido a negro de 0,7 s), después de `ACH.objetivo.diario('cura-9', …)` y de guardar `achorado.cine.barranco.v1`.
- `stop()` corta todo sin llamar a `onEnd` ni escribir la pista.
- Congelar el mundo: usa `ACH.br.freeze` (o los alias `ACH.cv.freeze` / `ACH.mira.freeze`); si no hay ninguno, pone `G.state = 'cine'` él mismo. **No descongela lo que ya estaba congelado al llegar** (`jaranon.js` congela antes de llamar a `play` y descongela en su `finish`) ni si se pasa `keepFrozen`.
- Debug: `debug.render(t, linea)`, `state()`, `resetSeen()`, `cost(t, n)`, `bake()`, `art()`, `portrait()`, `jar()`, `alex()`, `walk()`, `pig()`, `zp()`, `zb()`, `pause()`. Parámetros de la preview: `?t=&freeze=1&nodlg=1&line=0..5&skippable=1&own=1&auto=1`.

## Montaje (21,6 s, vals a 75 bpm: compás 2,4 s, los cortes caen en compás) + diálogo
| Plano | t (s) | Qué se ve |
|---|---|---|
| 1 general | 0–4,8 | Peña a oscuras, un solo foco con polvo; Don Jaranón sentado en el borde del tabladillo, cabeza gacha; mesas y sillas volteadas, público en penumbra con ojos brillantes; entra Alexander caminando (guitarra a la espalda) y Titina volando; cartel «BARRANCO, DE NOCHE» |
| 2 dos figuras | 4,8–9,6 | Plano cerrado: Alexander afina, Titina se posa en el cajón, Jaranón levanta la cara; a los 7,2 empieza el vals y Alexander rasguea; Jaranón tararea («mmm», notas flotantes) |
| 3 público | 9,6–16,8 | General con paneo hacia la derecha: los zombis dejan de temblar y se mecen al compás; la ventana se enciende (luz de luna, halo) y aparece la cruz del Morro Solar con sus luces de colores |
| 4 señala | 16,8–21,6 → diálogo | Cuadro con Alexander y Jaranón a la izquierda y la ventana a la derecha; Jaranón mira la ventana y señala; el cuadro queda de fondo del diálogo (la escena sigue animada, y la pose de ambos cambia con cada línea) |

Primera vez no se salta (ni el montaje ni el diálogo, `id: 'barranco.final'`). Después ESC/ENTER saltan el montaje (va al último plano) y ESC/SALTAR el diálogo. ESC/P pausan el montaje.

## Diálogo (6 líneas)
Jaranón (con retrato) ×3: bata blanca con neveras · Morro Solar/Chorrillos · «Anda, y cántales a todos». Alexander ×3: triste («Mi abuela lo quería un montón…»), serio («Chorrillos…»), risa («¡Allá voy!»). Cada línea del contrato se respetó; «serio → risa» quedó en dos líneas.

## Pista de la cura
`ACH.objetivo.diario('cura-9', 'Bata blanca rumbo al Morro Solar', '…Iban para el Morro Solar, allá arriba, en Chorrillos.')` (una sola vez por id, lo garantiza `objetivo.js`).

## Retrato de Don Jaranón
`ACH.retratos` permite agregarlo sin editar nada ajeno: `final.js` encadena `ACH.retratos.draw` (cuando `quien === 'jaranon'` dibuja su cabeza 96×96 con boca 0/1/2, ojos abiertos/medio/cerrados y caras `habla`/`triste`/`feliz`) y pone `ACH.retratos.NOMBRES.jaranon = 'DON JARANÓN'`. Se instala al cargar el archivo y otra vez en `play()`. Líneas: `{quien:'jaranon', cara, texto, nombre:'Don Jaranón'}`. **Otros archivos pueden usarlo** (p. ej. `jaranon.js` para su entrada) si se carga después de `final.js` o llaman a `play()`. Si no se pudo instalar, el texto sale con `DON JARANÓN:` y sin retrato.

## Música
1. Si existe `ACH.audio.br.play`, pide `'final'` (B3) y al terminar llama `ACH.audio.br.stop()` (no hace nada más; si B3 no incluye el «mmm» de Jaranón, no se oye).
2. Si no (o con `ownMusic`): vals lento original dentro de `final.js` (Web Audio, planificador con bucle para que dure lo que dure el diálogo): bordón y gruñidos lejanos → afinación → bajo/acordes/melodía de guitarra de nylon en la menor (Am–E7–Am–Dm–E7–Am–Dm–E7) → «mmm» de Jaranón (voz de nariz con vibrato, sin letra) a los 8,8 s → cajón suave y coro de zombis a los 9,6 s. Los meceos usan su propio reloj de 75 bpm (no leen `ACH.br.beat()`), por eso si B3 usa otro tempo no coinciden exactamente.

## Arte (todo hornado en `final.js`, lienzo de 960×540 sobre una grilla 480×270)
- Sala de 720×310 (pared, cortina, boca de escena, cartel «LA ÚLTIMA JARANA», cuadros, repisa de botellas, barra, mesas/sillas volteadas, guirnaldas apagadas) + fondo aparte para el plano cerrado; ventana en arco con rejas, luna, mar, Morro Solar y el Cristo del Pacífico con los brazos abiertos (se lee como una cruz) y 26 luces de colores que titilan (en la investigación es el Cristo del Pacífico, de 37 m; el contrato lo llama «la cruz»).
- Luz: capa de oscuridad horneada con huecos (foco, ventana), brillo cálido y luz de luna con `lighter`; nada por píxel por cuadro (≈1 ms por cuadro, horneado inicial ≈ 50 ms, cuerpos a pedido y cacheados).
- Don Jaranón: **diseño propio grande** coherente con el del contrato (guayabera blanca con pliegues y bolsillos, pañuelo blanco en la mano y en el bolsillo, bigote fino, pelo engominado, piel #8FA088, ojos turbios con brillo, hueso en el codo, micrófono antiguo de pedestal a su lado, sombrero de paja en el tabladillo). Poses: `bow`, `look`, `hum` (3 mecidas), `point`. No usa `ACH.sprites.br.pj.jaranon` de B2c (autocontenido).
- Alexander claro (cabeza de la cinemática de la cima) sentado con guitarra (rasgueo ×2, mecida ×3, mira a la guitarra/Jaranón/ventana, caras sonrisa/triste/alegre) y caminando de perfil (4 cuadros); Titina (paloma de Chorrillos).
- Público zombi: 6 variantes de perfil y 6 de espaldas, 5 cuadros de mecida cada una; banda zombi (guitarrista y cajonero) en la penumbra del tabladillo.

## Probado
Preview en Browser pane (puerto 8739): cuadros en t = 0,6 / 3,3 / 5,7 / 6,4 / 11,4 / 14,2 / 20,5 / 22,5 (con diálogo, línea 0 y 2), recorrido completo con `ACH.dialogo.advance()` → `onEnd` llamado, `cura-9` guardada, clave `achorado.cine.barranco.v1` = 1, sin errores en la consola, `stop()` y re-`play()` limpios. Con la pestaña oculta se pausa sola (igual que Chorrillos).

## Qué falta / notas
- No probado oyendo (el navegador de pruebas no suena): la música propia se comprobó solo que programa sin errores (`music: 'propia'`).
- No se probó dentro de `barranco.html` completo (en el momento de entregar las demás piezas eran stubs); `jaranon.js` ya llama `ACH.br.final.play({onEnd})` y congela antes.
- Si B1a/B3 definen `ACH.br.beat()` con un tempo distinto, bastaría con cambiar `T.bpm` / `T.bar` y los tiempos `s2..s4` si se quiere que los cortes caigan en su compás.
