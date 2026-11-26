# br-B1a: página, mapa, nivel y zombies de Barranco

## What I did
- **Page and build**
  - `juego/barranco.html` is a copy of costaverde.html with the §1/§1.2 swaps.
    - Win screen rows: `winDatosRow/winDatos` (facts heard X/30) and `winDeseoRow/winDeseo`.
    - The hint mentions T (melody 6).
  - `juego/build-barranco.sh` produces `dist/barranco.html` without errors (≈4.97 MB).
- **`js/barranco/mundo.js`**: map 250×100 tiles, with the sea to the west.
  - Order: beach of stones → pedestrian bridge over the Circuito → Bajada de Baños going up diagonally (passing UNDER the bridge) → Plazuela Gardel → Pasaje Zepita → Parque Municipal → Av. Grau → Av. Bolognesi / Jr. Manuel Segura / Jr. Unión → Peña La Última Jarana.
  - The Ermita and its mirador are reached **only through the Puente de los Suspiros**, from Zepita westward.
  - The Puente de los Suspiros has **two layers**, per entity (`ent.brUp`).
- **`js/barranco/nivel.js`**: `ACH.nivel` (id 'barranco'), with dispatchers to `ACH.br.systems`.
  - `ACH.br = ACH.cv = ACH.mira`, the same object.
  - Beat clock, the hour (dusk → night), the bridge legend, the win screen and travel, the arrival via viaje, debug, and runtime patches to game.js/partida/cima (no editing).
- **`js/barranco/zombis.js`**: poet, painter (+easel), street musician (3 skins, +25 % aura), couple → heartbroken, jaranero.
  - About 50 at the start, plus 10 at night in the bohemian streets. Respawn ahead, max 16 alive.

**Tested (port 8731):**
- `routeCheck().ok` = true. It covers beach→peña (4320 px, through playa/bajada/puente/parque/bohemia/pena), under the bridge, across the bridge to the Ermita, and into the peña. `spawnCheck()` = [].
- Intro with portrait.
- Night falls on reaching the bridge.
- Legend: running across → wish + portrait line.
- Survivor dialogue without a portrait (name only).
- Gate: warning, then opens.
- `skip('final')` → death dialogue → B5 cinematic → win screen → ENTER → index.html with the map open. `setDone('barranco')` OK and the save is «Mapa de Lima».
- Arrival from index with carry (hp/fans arrive, intro plays).
- Poet letters, painter brushstroke and stain, musician aura, couples holding hands, heartbroken.

## Real API
- **`ACH.br`** (= `ACH.cv` = `ACH.mira`):
  - Systems: `systems`, `register`.
  - Helpers: `sfx`, `toast`, `say`, `brandName` (delegates to `sprites.br.casona.brandName`), `brandColors`, `BRANDS`, `prov`, `label`, `mk`, `dist`, `safe`, `U=10`.
  - Flow: `freeze/frozen`, `talk(lines, onDone)`, `finish(stats)`, `runFinale()`.
  - Checkpoints: `setCheckpoint(id)`, `checkpoint()`.
  - Flags: `flag(k[,v])` (prefix `barranco.`).
  - Peña: `abrirPena(quien)`, `penaGate {open(silent,msg), close(), isOpen(), hold, rect, x, y}`.
  - Events: `on(ev,fn)` / `emit(ev,data)`. zombis.js emits `'poetaRojo.muerto'` for a zombie with `brCuaderno`.
  - Hour: `hora()`, `setHora(t, keep)`.
  - Other: `deseo()`, `stats`, `winTravel()`, `saveAsMapa`.
- **Beat clock**
  - `beat() → {bpm, meter, beat, phase, bar, beatInBar, toNext, src:'audio'|'interno', pulse}`. It uses `ACH.audio.br.beat()` and stays phase-aligned when audio is missing.
  - `onTime(tol=0.12)`, `setTempo(bpm, meter)` (default 100, 3).
- **`ACH.world`**: every key of the CV world, plus:
  - `id`, `zona(x,y)` → playa|bajada|puente|ermita|parque|bohemia|pena.
  - `tramoAt` (+mirador, gardel, zepita, grau).
  - `places`, `checkpoints` (playa, bajadaCima, parque, penaPuerta), `progress(p)`.
  - Bridge: `deck`, `overlap`, `onDeck(ent)`, `fixLayer(ent)`, `collideLayer(x,y,r,up)`, `layerAt`.
  - `pena {c0:216,r0:12,c1:244,r1:39 + x0..y1, escenario:{c0:223,r0:12,c1:237,r1:16}, pista:{c0:223,r0:21,c1:237,r1:31}, puerta}`, `inPena`.
  - `bajada {pts, half, wall, dist}`, `vendorSpots`, `regions`, `sea`, `corral`.
  - Ground hooks: `groundTile` (render), `bakeExtra`.
  - `respawnPick` (set by zombis.js).
- **`ACH.br.zombis`**: `TYPES`, `XP`, `state()`, `popText`, `curarLento(p)`, `spawn(type|'pareja', x, y, up)`, `letras()`, `manchas()`, `caballetes()`. Also `ACH.br.zSpawns()`.
- **Debug `ACH.debug.br`**:
  - Movement and level: `tp(place)`, `skip('jefe'|'final')`, `god`, `give`, `hora(t)`.
  - Checks: `routeCheck`, `spawnCheck`, `state`, `beat`.
  - Other: `deseo(true)`, `finish`, `freeze`.
  - URL: `?br=jefe|final|noche|<place>`.

## Keys
- **Places (px)**:
  - Beach and Bajada: playa, orilla, parapente, tomas, bajadaPie, bajadaMedio, javier, bajoPuente, bajadaCima.
  - Bridge and Ermita: puenteA, puenteB, puenteMedio, ermita, mirador, chabuca, rosa.
  - Park and Grau: parque, fuente, biblioteca, iglesia, muni, grau.
  - Bohemian streets: bohemia1, bohemia2 = lucho, union, celedonio.
  - Peña: penaPuerta, penaAdentro, penaCentro, penaEscenario.
- **Flags**: `barranco.deseo` ('vida'|'sabor'|'monedas'), `barranco.ganado`. The gate reads `barranco.celedonio` or `hab.rank('contrapunto')`.
- **Zombie types**: br_poeta, br_poetaRojo, br_pintor, br_musico (`z.brInst` → skin `br_musico_<inst>`), br_novio, br_novia, br_despechado (skin `br_novio_despe`/`br_novia_despe` from `set.despechado`), br_jaranero.
  - Poses: `declama`, `lanza`, `toca`, `mano`.
  - FX from `sprites.br.pj`: `letra`, `brochazo(.colores)`, `mancha(.v)`, `caballete(.broken)`, `notitas`.
- **Player fields**: slowness `p.brSlowT`/`p.brSlowMul` (letters ×0.6), stain `p.brPaint` (×0.7). Stairs ×0.9 going up.
- **Props**: `br_<key>` from `lugar[k]`/`lugar.props`/`casona`. Breakables: sombrillaPlaya, cajaCervezas (bottles), basureroBR, parapenteTirado.
- **Lots**: `br_fachada` (+brand, uses `casona.fachada`), `br_casona1..6`, `br_iglesia`, `br_biblioteca`.

## Decisions
- **Hour**: tracks progress and never goes back. It is driven by its own tint (multiply + a baked sun) until `noche.t` takes over.
  - Night starts at 0.45 (the bridge) with `ACH.noche.start`.
  - The night `zMul` is wrapped to multiply by `z.brSpd`.
- **Bridge**: deck in the air (player below) or on the ground (player above). Bridge shadow and pillars are in `bakeExtra`.
  - A zombie on a different layer neither bites nor throws.
  - routeCheck also checks the upper layer (puenteB→ermita).
- **CV ice-cream seller and dogs** (`juguetes.js`) are sent to a sealed corral of 'i' tiles inside the sea (c2–8, r2–7). `W.vendors = []`.
- **Gate**: opens if Celedonio has already taught you. If not, the first time there's a warning, and 4 s later it opens anyway with a warning. jaranon.js uses `hold/close/open`.
- **Survivors without a portrait** (tomas, rosa, lucia, lucho, celedonio, vecino, vendedor, bohemio): CSS hides `.dlgx-frame` (name only) and `retratos.draw` is skipped. Whoever adds a portrait sets `ACH.retratos.CON = {tomas:1}`.

## Problems and edits for others (not done)
1. **game.js `IS_SUB`** doesn't include barranco. I patched around it at runtime from nivel.js:
   - title ENTER/click → `startIntro('barranco')`
   - win ENTER/click → `winTravel`
   - `ACH.game.toTitle` → index.html
   - `cima.showMap`: gambetta/cerro → `viaje.go('main',{nivel})`; barranco → «Ya estás aquí»; `here='barranco'`
   - `hereId()` already returns 'barranco' (levelId)
   - `ACH.levels.gambetta` is deliberately **not** defined

   **Exact edit** if the owner prefers: `js/engine/game.js` line 23 → `IS_BR = !!(ACH.nivel && ACH.nivel.id === 'barranco'), IS_SUB = IS_MIRA || IS_CV || IS_BR`, and in `hereId()` (≈line 604) + `continuar()` (≈516) add `IS_BR ? 'barranco'`.
2. **partida.js `PAGEOF`** has no barranco. A record with level 'barranco' is thrown away on load and **would wipe the save**.
   - Workaround: `ACH.partida.save` is wrapped and saves as `{level:'mapa', page:'main'}`. CONTINUAR opens the map, from where you enter Barranco.
   - Fix for the owner: `PAGEOF.barranco = 'barranco'` and in `build()` take `cp` from `ACH.br.checkpoint()`. Then set `ACH.br.saveAsMapa = false`.
3. **Infinite recursion in `ACH.inv.isOpen`** between `miraflores/inflables.js` (marker `_mira`, shared variable `origInvOpen`) and `barranco/vecinos.js` (`_brMenu`). It froze the game ("Maximum call stack").
   - Fixed from nivel.js (`guardIsOpen`: an accessor that carries the markers over to the new wrapper).
   - **B1c**: in `wrapIsOpen` copy `prev._mira` onto the wrapper too.
4. On this page `INTRO` from game.js = my intro. `VUELTA`/`INTROS` don't know barranco (harmless).
5. vendedores.js already has a SPOT `rosa` (Miraflores). B1c used `rosa_br`, OK.
6. `respawnBelow=16`. Respawns are plain caminantes (engine).
7. In the Browser pane, a hidden pane = no rAF and the auto-pause on blur. To test without the pane: `ACH.game.step(n)`.
