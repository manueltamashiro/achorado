# ACHORADO v0.16 — Idiomas (contrato)

Pedido del usuario (2026-11-28): selección de idioma en las opciones. **ESPAÑOL** (por defecto) · **ENGLISH** · **日本語**.
El español peruano/chalaco sigue siendo el idioma del juego: los otros dos son traducciones encima.

## Dónde se escoge
- **Título**: fila `IDIOMA: ESPAÑOL` debajo de PARTIDA NUEVA / MAPA (`partida.js`, `#ttlLang`). ENTER o ←/→ la cambian.
  El subtítulo dice «idioma» en los otros dos idiomas (`LANGUAGE · 言語`) para que se encuentre sin leer español.
- **Pausa ▸ OPCIONES ▸ IDIOMA** (`pausa.js`, índice 8, después de PERSONAJES). ENTER o ←/→.
- Se guarda en `localStorage['achorado.opciones.v1'].idioma` (`'es' | 'en' | 'ja'`), vía `ACH.opciones.set` si ya cargó.
- `?lang=en` / `?lang=ja` / `?lang=es` en la URL lo fuerza sin guardarlo (QA).

## Cómo funciona (`js/engine/idioma.js` → `ACH.i18n`)
- La **clave es el texto en español tal cual** sale en pantalla. `js/idiomas/en.js` y `js/idiomas/ja.js` son
  diccionarios `'texto en español': 'traducción'`, registrados con `ACH.i18n.add('en', {...})`.
- Lo que **no** está en el diccionario se queda en español: nunca se rompe nada, solo falta traducir.
- **Automático en el DOM**: un `MutationObserver` sobre `<body>` traduce cada nodo de texto (y `aria-label`, `title`,
  `placeholder`) cuyo texto entero esté en el diccionario. Si no está entero, prueba:
  1. por trozos separados con ` · ` (la franja de controles, `↑ ↓ escoger · ENTER aceptar · ESC volver`);
  2. `ETIQUETA: VALOR` si la etiqueta está (`PAUSA CON P: SÍ` → `PAUSE WITH P: YES`).
  Por eso el HTML estático de las 4 páginas, los menús que arman los `.js`, los toasts y los textos táctiles se traducen sin tocarlos.
- **En código**, solo para textos armados con números: `ACH.t('hace {n} min', { n: 5 })` → `5 min ago`.
- No traducir algo: `translate="no"` (o `data-no-i18n`) en el elemento o un ancestro.
- Al cambiar de idioma se re-traduce todo el `<body>` desde los originales guardados en cada nodo y se avisa a `ACH.i18n.on(fn)`.
- `<html lang>` cambia con el idioma. `css/idioma.css`: para `ja` agrega fuentes japonesas **detrás** en `--display`, `--hand`
  y `--ui-sans` (Bungee/Patrick Hand/Rubik no tienen kana ni kanji); `Dela Gothic One` y `M PLUS Rounded 1c` se piden a
  Google Fonts solo al escoger 日本語. Sin red, la fuente japonesa del sistema.

API: `ACH.i18n = { LANGS, get(), set(id), cycle(d), nombre(id?), t(s, vars), tr(s), add(id, dict), on(fn), refresh(), has(s), dict(id?) }`, `ACH.t = ACH.i18n.t`.
Debug: `ACH.debug.idioma('ja')`.

## Qué está traducido (v0.16, primera pasada)
Toda la «carcasa» del juego: título y su menú (continuar, partida nueva, dificultad, confirmación), franja y fila de controles,
HUD, mochila (rótulos fijos), pausa (menú, volumen, diario: encabezados, controles, opciones, teclas, salir), dificultad (nombres,
descripciones, avisos del cuarto), muerte, victoria (títulos y estadísticas de los 4 niveles) y los textos táctiles.

## Qué falta (siguientes pasadas)
Todo el **contenido**: diálogos (`dialogo.js` y los de cada nivel), nombres y descripciones de objetos (`inventario.js`, `catalogo.js`),
tienda, recetario, árbol de melodías, tutorial (`tutorial.js`), objetivos y entradas del diario (`objetivo.js`), avisos al tumbar
zombis, cinemáticas, letreros y textos dibujados en canvas (esos no pasan por el DOM: necesitan `ACH.t` en el código).
Para traducir más: agregar las frases en español exactas a `en.js` y `ja.js`. Si un texto se arma con variables, envolverlo con
`ACH.t('... {n} ...', {n})` en su `.js` y poner esa plantilla como clave.

Notas de tono: «causa» → *pal* en inglés; en japonés, 相棒 o la terminación 〜ぜ. Nombres de lugares y personajes no se traducen
(en japonés van en katakana cuando se leen como texto corrido). `ACHORADO` (título y dificultad) no se traduce.
