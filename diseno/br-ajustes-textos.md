# Barranco: ajustes de textos, objetivo, mezcla y el disco negro (2026-11-21)

Respaldos de los archivos tal como estaban antes de editarlos: en el scratchpad de la sesión, carpeta `bak/` (temporal).
Sintaxis: `new Function(src)` en JavaScriptCore (`osascript -l JavaScript`) → los 5 JS editados dan OK. Todo se probó en `barranco.html` servido desde la fuente (puerto 8733), con el Browser pane.
No se tocaron `jaranon.js`, los archivos v0.14 (`render/input/pausa/tactil/game/entities/luz/postfx/volumen/ui-v014.js`, `pulido-v014.css`) ni `dist/`. **Falta reconstruir `dist/`** (lo hace el dueño).

## 1. Faltaban tildes (Á É Í Ó Ú Ñ)
La fuente de píxeles `ACH.px` (`js/sprites/base.js`) ya tiene las tildes: las pinta 2 filas **encima** de la letra. Se perdían por cuatro causas:
- **«HABLAR CON LUCIA»**: el letrero de `vecinos.js` se escribía con Silkscreen de 8 px en el lienzo de 400×300 y la tilde no se veía. Ahora se hornea con `ACH.px` a5 (mayúsculas con tildes) y se guarda en caché por texto: `js/barranco/vecinos.js:512` (`promptPx`) y `:577` (dibujo; si falta `ACH.px`, sigue con Silkscreen). En el juego ahora se lee «E HABLAR CON LUCÍA».
- **«PEÑA LA ULTIMA JARANA»** (fachada): la guirnalda de focos se dibujaba encima de la fila de la tilde de la Ú. Ahora cuelga 1 px más arriba y con menos comba: `js/barranco/arte-casonas.js:677`.
- **Rótulos con subtítulo** (`signText`, `arte-casonas.js:137`): con tilde en el nombre y en el subtítulo a la vez (OITA NOMÁ / PEÑA RESTAURANTE), la virgulilla de la Ñ caía sobre la última fila del nombre. Con tilde solo en el nombre (ZAGUÁN / GUITARRAS, LA ESTACIÓN / DE BARRANCA-MUERTA), nombre y subtítulo quedaban pegados. Ahora el nombre baja según el subtítulo: `ty = by + (sm ? 1 : 2)`.
- **`BR.label`** (letrero del techo de la peña en `mundo.js:664` y los sprites provisionales): era una banda de 7 px con el texto en y=1, así que la tilde quedaba fuera. Si el texto lleva tilde, ahora la banda mide 9 px y el texto va en y=3: `js/barranco/nivel.js:88`.
- Cómo lo verifiqué: volqué píxel a píxel los lienzos horneados de las 25 fachadas, en modo real y en parodia (OITA NOMÁ, PEÑA LA ÚLTIMA JARANA + LANDÓ, ZAGUÁN, LA ESTACIÓN, SANTOS CADÁVER / CAFÉ, DEL MÁS ALLÁ, EL TÍO MARIO, PEÑA DON PORFIRIO). Cada tilde aparece separada de su letra, y hay 1 fila libre entre el nombre y el subtítulo. También volqué `BR.label('PEÑA LA ÚLTIMA JARANA')` y `BR.label('ZAGUÁN')`, e hice una captura del letrero junto a Lucía. El letrero de Jaranón (`jaranon.js`, no editado) ya usaba `ACH.px` con espacio arriba.

## 2. El objetivo sigue el recorrido
`js/barranco/nivel.js:174–197` (`OBJ_TXT`, `updateObjetivo`). Se llama desde `update` (`:517`) y se inicia en `reset` (`:532`). Usa `ACH.world.tramoAt`. El objetivo solo avanza y se revisa cada 0,4 s:
playa «Sube por la Bajada de Baños y busca la jarana» → bajada «Sube la Bajada de Baños hasta el puente» → puente, Ermita y mirador «Cruza el Puente de los Suspiros y sigue al Parque Municipal» → parque y Grau «Sigue por la Av. Grau hasta las calles bohemias» → bohemia y peña «Busca a Don Celedonio en su zaguán, cerca de la peña» → bandera `celedonio` «Entra a la Peña La Última Jarana · T = Landó del Contrapunto» (el mismo texto que pone `vecinos.js`, así no parpadea).
No hace nada si Jaranón no está en `espera` o si ya existe la bandera `jefe`, para no pisar lo que ponen el jefe y el final.
Cómo lo verifiqué: con `ACH.debug.br.tp` por playa, bajadaMedio, puenteMedio, ermita, parque, grau, bohemia1 y celedonio, más `ACH.game.step` y la bandera. Cada paso mostró su texto, y al volver a la bajada no retrocedió. Después borré la bandera de prueba.

## 3. Tecla T en las ayudas
`index.html:38,48`, `miraflores.html:66,76`, `costaverde.html:66,76`: «Z X V B G **T** melodías», igual que en `barranco.html`. Lo comprobé con grep: 2 apariciones en cada página.

## 4. Mensaje del jefe en `dificultad.js`
`js/engine/dificultad.js:28` agrega `MSG.jaranon` «¡Con Don Jaranón cantando encima no hay cuarto que valga!». En `:65–71`, `bossKind()` mira primero `ACH.br.jaranon` (o un `ACH.cv.chef` con `.jaranon`) en los estados `entrada`, `pelea` y `muriendo`, y devuelve `'jaranon'`. Además anula `K`, así que la comprobación del chef ya no salta con Jaranón. `:97` usa ese mensaje.
Cómo lo verifiqué en `barranco.html`: `ACH.cv.chef === ACH.br.jaranon` → true. Con `state = 'pelea'`, `canEnterBase` devuelve el mensaje de Jaranón; con `espera`, ya no habla de ningún jefe.

## 5. Mezcla de «bohemia»
La causa no era la ganancia. Al **arrancar** la música directamente en bohemia o en la peña (CONTINUAR en la puerta de la peña, `?br=noche`, el arnés offline), `applyFx` se programaba dos veces en el mismo instante (`setNight` y el tema). Ganaba la automatización vieja, así que la capa `far` (la peña lejana, la más fuerte del tema) quedaba en silencio: −26,5 dB RMS. Llegando desde el parque sonaba a −21,9.
- `js/barranco/criolla.js:856–858`: `applyFx` cancela lo programado desde `t` en sus 5 parámetros antes de volver a programarlos.
- `js/barranco/criolla.js:310`: la capa `far` baja de 2.1 a 1.8 para quedar a la par de las demás.
- Medido con OfflineAudioContext y `_offlineBegin`, RMS desde el segundo 8: playa −23,7 · bajada −23,0 · parque de noche −23,8 · **bohemia (arranque) −22,5** (antes −26,8) · bohemia llegando desde el parque −22,5 · peña −21,3 (crece al acercarse, como se diseñó). Pico máximo −4,0 dBFS, 0 recortes, 0 NaN. «CORRER PRUEBAS» de `preview-br-audio.html` pasa entero (21 ok, sin OJO ni FALLA).

## 6. El disco negro sobre CUÉNTAME
Lo reproduje: hablar con Lucía, avanzar el diálogo y aparece un iris negro de pantalla completa justo cuando abre el menú. Es el **iris de transición de `ui-v014.js` (v0.14.1, `transCheck`)**, que se dispara cuando `body[data-state]` pasa de `cine` a `playing`. `BR.talk` congela el juego con `cine` en cada charla, así que al cerrarla salía el iris. El límite `irisGap` de 1,2 s explica por qué parecía «transitorio» y no se repetía.
Arreglo del lado de Barranco: `js/barranco/nivel.js:432` (`unfreezeQuiet`). Al terminar una charla (`M.talk`), pone `ACH.ui.P.iris = 0`, descongela, llama a `ACH.ui.transCheck()` para que ui-v014 registre el cambio sin animarlo y restaura el valor.
Cómo lo verifiqué: con una charla completa con Rosa, `ACH.ui.stats().iris` sigue en 0 y el menú queda `on`. Congelar y descongelar a mano (el camino viejo) sube el contador a 1.
**Aviso para la sesión v0.14:** Costa Verde también congela con `cine` en sus charlas (`cv.talk`), así que probablemente tiene el mismo iris. Sería mejor que `transCheck` ignore `cine → playing` cuando no cambia `ACH.world`.

## Visto de paso (no arreglado)
- En la presentación de Lucía, sus líneas salen sin retrato a la izquierda (lo mismo que la captura QA 05d).
