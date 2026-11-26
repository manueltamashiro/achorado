#!/bin/sh
# Junta cima.html + css + js en un solo archivo: dist/cima.html (vista previa de la cima del cerro).
# Uso: sh build-cima.sh
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
inline cima.html dist/cima.html
echo "OK: dist/cima.html ($(wc -c < dist/cima.html | tr -d " ") bytes)"
