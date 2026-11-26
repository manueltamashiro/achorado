# C4: «El Tablazo», el duelo en caída libre (COSTAVERDE.md §6)

## Archivos (solo míos)
- `juego/js/costaverde/caida.js`: el modo de juego, con su lógica, entrada, HUD y limpieza.
- `juego/js/costaverde/arte-caida.js`: todo el arte, horneado una sola vez (`ACH.sprites.cv.caida.bake()`, unos 35 ms).
- `juego/preview-cv-caida.html`: página de prueba independiente, con un `ACH.G` de mentira, `onWin`/`onLose` falsos y botones de debug.
  - Parámetros: `?auto`, `?skip`, `?hp=63`, `?fosfo=3`, `?touch`, `?god`, `?bot`, `?nopause`.

## API real
```
ACH.cv.caida.start({onWin, onLose})   // el callback recibe {hearts, result}
ACH.cv.caida.stop()   ACH.cv.caida.isOn()   ACH.cv.caida.CFG (ajustes)
ACH.cv.caida.debug = { win(), hp(n), god(b), state(), bot(true|'mid'|'noob'), alt(m), bossHp(n),
                       skipIntro(), sim(seg), bench(n), paint(), fps() }
```

### Cómo se monta
- Un `div.cvc-root` (absolute, inset 0, z-index 5) dentro de `#stage`.
  - Lleva un lienzo de 480×270, marcado con `ACH.lienzo.gpu`, centrado y escalado pixelado.
  - La escala es entera si encaja al menos al 86 %; si no, es fraccional.
- El diálogo con retrato (`.dlgx`, z-index 6) queda encima.
- `#tc` (los controles táctiles del juego) se oculta mientras dura la caída y se restaura al salir.

### Entrada propia
- **Teclado:** un oyente en captura en `window` se traga las teclas, así el juego de abajo no ve nada. Cuando hay diálogo, lo deja pasar.
- **Puntero:** clic o toque.
- **ESC o P:** pausa.
- La caída también se pausa sola si la pestaña se oculta (`CFG.autoPause`).

### Al terminar
- Se quita el DOM, los oyentes, el rAF, el viento y la música. Se llama a `ACH.input.reset()` y a `ACH.cv.freeze(false)`.
- Recién entonces se llama al callback.

### Integración
- **Mundo:** se congela con `ACH.cv.freeze(true)` de C1a (G.state = `'cine'`) mientras corre la caída.
- **Vida:** se lee de `ACH.G.player.hp` (o `ACH.game.G`) sobre `ACH.ent.CFG.hpMax` y se pasa a 10 corazones.
  - Se entra con un mínimo de 4 corazones.
  - Al ganar, se escriben de vuelta los corazones que quedan.
  - Al perder, se escribe `hpMax` (§2.6: vida llena). El `lose()` de `nivel.js` hace lo mismo.
- **Barras fosforescentes:** `ACH.cv.juguetes.fosfoCount()` da +10 % de daño por barra (tope +50 %), con el cartel «¡LUCES DE FIESTA!» y el porcentaje.
- **Sonido:**
  - Música: `ACH.audio.cv.play('cv.caida')` al empezar y `ACH.audio.cv.stop()` al salir.
  - Viento: `ACH.audio.loop('cv.viento')`.
  - Efectos: `cv.flecha`, `cv.tabla.gira`, `cv.tabla.golpe` y `cv.splash`, por `ACH.cv.sfx` o `ACH.audio.emit`.
  - Todo protegido: si algo falta, no pasa nada.
- **Intro:** la vela entra y Alexander parte 2 barras (chispas) y carga la resortera.
  - Va con una línea de `ACH.dialogo.play` (cara «picaro», `pausaJuego:false`).
  - Después sale el cartel chicha «EL TABLAZO» con el globo «¡SE VIENE LA OLA, CAUSA!».

## Juego (lo que quedó)
- **Fondo en 4 capas:**
  1. Panza de burro con nubes que suben y garúa.
  2. La costa de Barranco y Chorrillos, y el Morro Solar con la Cruz, el Cristo del Pacífico, botes de colores y el muelle. Crece del 78 % al 128 % mientras se baja.
  3. El acantilado ocre con malla verde y enredaderas, a 58 px/s. Cerca del mar aparecen el Circuito de Playas con autos, la playa de canto rodado y la espuma.
  4. Gaviotas y jirones de neblina por delante.
- **Alexander:** vela rosada y amarilla con «ACHORADO», en el tercio izquierdo.
  - Se mueve con W/S y las flechas, y con A/D ±30 px.
  - Dispara con ESPACIO o clic, con enfriamiento de 0.22 s.
  - Si mantiene 0.8 s y suelta, sale un abanico de 3. La barra de carga aparece bajo él.
  - Las flechitas rotan entre verde, rosado, amarillo y celeste, con estela y halo horneados. Hacen 0.25 de daño cada una.
- **El Tablazo:** 30 de vida, con un «!» de aviso y la pose de sacar la tabla.
  - **F1:** tabla recta apuntada (si no están a la misma altura, va en diagonal). El 35 % de las veces tira una segunda tabla hacia donde uno se escaparía.
  - **F2:** ráfaga de 3 en 4 carriles de 38 px, con un hueco, o un bumerán morado que vuelve por otra altura (no se le puede disparar de vuelta).
  - **F3:** ola de 5 tablas en columna, con un hueco que sube y baja (±38 px), más tablas rectas y pelícanos que solo empujan.
- **Tablas:** se rompen con 2 flechas. Pegan 1 corazón, con 1.1 s de invulnerabilidad.
- **Altura:** baja de 300 m a 30 m en unos 104 s.
  - A los 30 m se queda fija y sale «¡SE PICÓ EL TABLAZO!»: ataca ×0.65 de intervalo y las tablas van ×1.2 más rápido.
  - Visualmente se «queda en la térmica»: el desplazamiento casi se detiene.
- **Muerte del Tablazo:** la vela se parte en 2, él cae girando, la altura baja rápido para que se vea el mar y viene el salpicón con «¡SPLASH!».
  - Luego sale «¡TABLA RASA, COMPADRE!», fundido a negro y `onWin`.
- **Muerte de Alexander:** «¡TE REVOLCÓ LA OLA!», fundido a negro y `onLose`.

## Dificultad
Se midió con un piloto automático (`debug.bot`) y `debug.sim`. Son 10 corridas de cada tipo, y la vida se va arrastrando de una corrida a otra.

| Piloto | Gana | Corazones perdidos |
|---|---|---|
| Esquiva perfecto | 9/10 | 0–4 |
| «mid» (ve tarde y no ve el 22 % de las tablas) | 9/10 | 0–4 |
| «noob» (solo dispara, nunca esquiva) | 4/10 | — |

- **Duración:** 120–150 s, contando la intro y la muerte.
- Una persona intermedia debería ganar en 2 o 3 intentos.
- **Perillas en `CFG`:** `arrowDmg`, `p1`/`p2`/`p3` (`every`, `v`, `dbl`, `boom`), `rage`, `altRate`.

## Rendimiento
- Un cuadro (update + render) cuesta unos 0.08 ms de CPU (`debug.bench`): de sobra para 60 fps.
- Sin `getImageData`, `shadowBlur`, `filter` ni degradados por cuadro.
- La silueta blanca del golpe se hornea con `source-in`.
- Todo son `drawImage` de lienzos horneados. Solo los rotados (tilt, la caída del jefe, la vela rota) usan `ctx.rotate`.
- No pude medir los fps reales: el panel del navegador estaba oculto y rAF iba estrangulado. Se midió el costo por cuadro.

## Problemas conocidos y pendientes
- **El final no se ve en el juego real todavía.** Solo se probó con `preview-cv-caida.html`, no dentro de `costaverde.html`. Lo integra QA: `runFinale('caida')` de `nivel.js` ya llama a `start()`.
- **El final depende de un cuadro de rAF.** El callback se llama dentro del bucle. Con la pestaña oculta, el final queda esperando hasta que vuelva (y la caída queda en pausa).
- **Táctil:** la mitad izquierda es una palanca relativa (tocar y arrastrar). La mitad derecha dispara y, si se mantiene, carga el abanico. El botón «¡PUM!» se dibuja si `ACH.touch.on` o después del primer toque. No se probó en un teléfono real.
- **Voces:** las frases del Tablazo de `voces-cv.js` no se piden (no conozco su API). Sus frases salen como carteles horneados.
- **Fuentes:** la fuente ACH no tiene «·»: en los carteles se usa «-».
