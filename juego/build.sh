#!/bin/sh
# Junta index.html + css + js en un solo archivo: dist/achorado.html
# y la hoja de previsualizacion de sprites preview.html en dist/preview.html.
# Sirve para jugarlo con doble clic, subirlo a itch.io o publicarlo como página.
# Uso: sh build.sh
set -e
cd "$(dirname "$0")"
mkdir -p dist
inline() {   # inline <entrada.html> <salida.html>
awk '
  /<link rel="stylesheet" href="css\/[^"]*">/ {
    match($0, /href="[^"]*"/); f = substr($0, RSTART + 6, RLENGTH - 7)
    print "<style>"; while ((getline line < f) > 0) print line; close(f); print "</style>"; next
  }
  /<script src="js\/[^"]*"><\/script>/ {
    match($0, /src="[^"]*"/); f = substr($0, RSTART + 5, RLENGTH - 6)
    print "<script>/* " f " */"; while ((getline line < f) > 0) print line; close(f); print "</script>"; next
  }
  { print }
' "$1" > "$2"
}
inline index.html dist/achorado.html
echo "OK: dist/achorado.html ($(wc -c < dist/achorado.html | tr -d " ") bytes)"
# v0.10: miraflores.html navega a «index.html» (ruta relativa): la misma página principal también como dist/index.html
cp dist/achorado.html dist/index.html
echo "OK: dist/index.html (copia de dist/achorado.html)"
inline preview.html dist/preview.html
echo "OK: dist/preview.html ($(wc -c < dist/preview.html | tr -d " ") bytes)"
