# br-B1c: objetos, vecinos y melodía 6 (Barranco)

## What I did
- **`juego/js/barranco/objetos.js`** (§4) replaces the B1a stub.
  - **Cajón (held item, ESPACIO)**: a wave of r 56 (72 when on time) that pushes, stuns and does 0.5 damage (× metro.mul when on time with the metronome on). It has 15 hits × durMul.
  - **Bar bottles and gold bottles**: thrown with ESPACIO or a charged F. They leave a puddle r20/4 s where zombies slip; Alexander skids if he runs through one.
  - **Foods**: anticucho, picarones (+sabor), pescadoFrito, emoliente (cures slowness), plus the story item `cuaderno`.
  - **Beer crates** (`cajaCervezas*`) drop bottles.
  - The 4 vendors are in `ACH.VENDEDORES_DATA`.
- **`juego/js/barranco/vecinos.js`** (§5) replaces the stub.
  - **5 survivors × 6 REAL facts** (research §5/§6.1). I skipped fact 5 (the accident) for sensitivity. The Lucía «suspiros» version is marked as a rumor.
  - Menu CUÉNTAME DE BARRANCO / COMPRAR / CHAU, a DOM overlay that freezes the game the way tienda does.
  - Diary «DATOS DE BARRANCO · n/30», +5 XP per NEW fact (can't be farmed). Hearing all 6 from one survivor gives a gift.
  - Lucía's mini-task: poet `br_poetaRojo` → `cuaderno` → `cura-7` + 2 gold bottles.
  - Celedonio: 8 lines → `ACH.hab.teach('contrapunto','Don Celedonio')` → flag + `cura-8`.
  - Practice dummy: 4 on-time hits → +20 XP.
- **Melody 6 «LANDÓ DEL CONTRAPUNTO» (KeyT)**, Edit only, backups in the scratchpad:
  - In `js/engine/habilidades.js`:
    - Locked until taught.
    - Metronome for 6/8/10 s. Guitar hits on the beat do ×1.5/1.75/2 (window 0.12/0.16/0.2 s) and give +4 sabor.
    - Tree cell [1,1].
    - Old saves OK (tested: old save → rank 0, no errors).
  - In `js/audio/melodias.js`: recipes `hab.contrapunto` (original 6/8 landó) and `hab.contrapunto.atiempo`.
  - KeyT was free.

## Real API
- `ACH.hab`:
  - `onCast(fn(id,rank)) → unsub`
  - `teach(id,quien) → 'rango'|'punto'|'ya'|'no'`
  - `taught(id)`
  - `metro() → {on,left,rank,tol,mul,hits,beat}`
  - `beat()` (`ACH.br.beat` if present, otherwise its own 100 bpm clock on G.clock, src 'interno')
  - `onBeat(tol)`, `offBeat(b)`, `addSabor(n)`
- `ACH.br.objetos`:
  - `charcos()`, `inCharco(x,y)`, `shots()`, `lastWave()`
  - `openShop(id,{x,y})`, `onTime(tol)`
  - `VDATA`, `ITEMS`
- `ACH.br.vecinos`: `list()`, `datos() → {n,total:30}`, `celedonio()`, `talk(id)`, `state()`, `DATA`.
- Debug:
  - `ACH.debug.br.obj`: `give`, `equip`, `wave`, `throwBottle`, `charco`, `shop`, `state`
  - `ACH.debug.br.vecinos`: `tp(id)`, `talk`, `choose`, `teach`, `poeta`, `killPoeta`, `muneco`, `state`
- onProjectile emitted to the other systems:
  - `{kind:'cajon', area:true, r, dmg, stun, onTime}`
  - `{kind:'botella', dorada, dmg, charco:{x,y,r,life}}`; while in flight it also sends `flying:true`.

## Real keys
- **Flags** (`ACH.partida.flag`):
  - `barranco.celedonio` (= THE PEÑA OPEN / melody taught)
  - `barranco.lucia`, `barranco.cuaderno`, `barranco.practica`, `barranco.cajonPlaya`
  - `barranco.met.<id>`, `barranco.datos.<id>`, `barranco.regalo.<id>`
- **Diary entries**: `br-dato-<id>-<1..6>`, `cura-7`, `cura-8`.
- **Survivor ids**: tomas, rosa, lucia, lucho, celedonio. Shops: `tomas`, `rosa_br` (`rosa` is taken by Miraflores), `lucho`, `celedonio`.
- **Items**:
  - New: cajon, botellaDorada, packBotellas, pescadoFrito, cuaderno.
  - Overridden on this page: botella (keeps its molotov recipe), anticucho, picarones, emoliente.
  - Reused: chicha, gaseosa, cuerdas.
- **sfx (B3)**: br.cajon{atiempo}, br.cajon.alza, br.cajon.roto, br.botella.tiro, br.botella.rompe, br.resbalon, br.caja.rompe, br.dato{n}, hab.contrapunto, hab.contrapunto.atiempo.
- **Places used**:
  - tomas, rosa, mirador (Lucía), lucho, celedonio, parque (poet).
  - Fallbacks: playa, puenteB, ermita, bohemia2, penaPuerta.
  - Dummy = celedonio + 2.2 tiles.
  - Without places they go in a row near the start (prov).

## Tested (port 8733, Browser pane)
- **barranco.html**:
  - Tomás: intro → menu → 6 facts → 6 diary entries + gift. COMPRAR opens his shop.
  - Celedonio teaches (rank 1, flag, cura-8, objective).
  - T casts the metronome; dummy 4/4 → flag practica.
  - The poet dies → cuaderno → Lucía → cura-7 + 2 gold bottles.
  - Cajón wave and bottle → puddle work.
- **Tree and HUD with 6 melodies**: well aligned in both barranco.html and index.html.
- No console errors.
- To test I had to use a shim in the console for `ACH.nivel`, because `nivel.js` (B1a) is still a stub. Same with `zombis.js`.

## What's missing / problems
- **B1a: `nivel.js` is a stub.**
  - It needs to dispatch `ACH.br.systems` (reset/update/onSwing/onProjectile/drawables/drawTop/speedMul/onRespawn), like `costaverde/nivel.js`.
  - `ACH.br.flag` doesn't exist. mundo.js `celedonioListo()` opens the peña anyway through `ACH.hab.rank('contrapunto')>0`.
  - Slowness: use `p.brSlowT` (emoliente clears it) or expose `ACH.br.zombis.curarLento(p)`.
- **B1b / zombis.js**:
  - Zombie type `br_poeta` doesn't exist, so the poet is a caminante with skin `br_poetaRojo` (the skin does exist).
  - Read `ACH.hab.metro().tol` / `onCast` and the onProjectile kinds `cajon`/`botella`.
  - The contrapunto damage bonus only applies to guitar hits and the cajón.
- **Portraits**: `ACH.retratos` has no art for tomas/rosa/lucia/lucho/celedonio. The dialogue shows the right name but Alexander's face. The owner of retratos/B2c should add them.
- **Survivor sprites**: if `ACH.sprites.br.pj.npc[id]` exists it gets used; otherwise a provisional block is drawn. The dummy uses `ACH.sprites.br.lugar.munecoPractica` (it showed up).
- **tactil.js** (NOT edited) does read `ACH.hab.learned()`/`H.DEF` dynamically. But 6 buttons × 60 px starting from right:128 px ≈ 488 px overflows a 375 px phone. That's for whoever owns tactil.
- Concurrency: another agent's tab (8737) took the front of the Browser pane. Always use an explicit `tabId`.

## Fix: recursion in ACH.inv.isOpen (reported by B1b)
- **Cause.** `vecinos.js` wrapped `ACH.inv.isOpen` on every reset, putting its own `_brMenu` mark on top of the chain. `miraflores/inflables.js` (`wrapInvOpen`) only checks its `_mira` mark on top. When it doesn't see it, it wraps again and reassigns `origInvOpen` → a loop between the two wrappers → «Maximum call stack size exceeded».
- **Fix, in `vecinos.js` only:**
  - `wrapIsOpen()` wraps ONCE per page (`wrapIsOpen.done`).
  - It walks the chain looking for `_brMenu` via `_brPrev`.
  - It **copies the previous function's `_xxx` marks** (`_mira`, `_tienda`…) onto its wrapper, so inflables/tienda still see themselves as wrapped and never wrap again.
  - `inflables.js` was not edited.
- **Tested** on barranco.html (8733), with the real B1a `nivel.js`:
  - 6× `nivel.reset` + `onRespawn` and 3 re-entries (`debug.start`) with no console errors. Final chain marks: `_mira, _brMenu, _brPrev`.
  - The talk menu still freezes the game (`inv.isOpen()` true; Alexander doesn't move with D) and ESC closes it.
- **Note.** If the menu is opened right after `ACH.debug.start()` in-game, an old prologue listener (`prologo.js`, `P.skippable`) can swallow ESC. That's a debug artifact, not from vecinos; in normal play ESC closes the menu.
