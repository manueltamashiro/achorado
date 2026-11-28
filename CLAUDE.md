# ACHORADO — notes for Claude

Browser game, plain HTML + CSS + JS, no dependencies, no package manager.
Source lives in `juego/`; design contracts are the `*.md` files there (start with `juego/SPEC.md`).

## Build
`dist/` is not tracked. Rebuild all single-file pages with:

    cd juego && for s in build*.sh; do sh "$s"; done

## Test
After building, run the headless smoke test (loads every page, fails on JS errors):

    node juego/tools/smoke-test.js

To play manually: `cd juego && python3 -m http.server 8000`.

## Deploy
Pushing to `main` runs `.github/workflows/pages.yml`, which builds `juego/dist/`
and publishes it to GitHub Pages: https://manueltamashiro.github.io/achorado/
