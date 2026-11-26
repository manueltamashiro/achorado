# ACHORADO

Browser game (HTML + CSS + JS, no dependencies).

## Layout
- `juego/` — the game: `index.html`, `miraflores.html`, `costaverde.html`, `barranco.html`, `cima.html`, `css/`, `js/`, design contracts (`*.md`)
- `diseno/` — design art and references

## Play locally
Open `juego/index.html` in a browser, or serve the folder:

    cd juego && python3 -m http.server 8000

## Build single-file versions
    cd juego
    sh build.sh              # dist/achorado.html, dist/index.html
    sh build-miraflores.sh
    sh build-costaverde.sh
    sh build-barranco.sh
    sh build-cima.sh

`dist/` is not tracked in git; rebuild it after cloning.

## Get the code on another machine
    git clone <repo-url> achorado
