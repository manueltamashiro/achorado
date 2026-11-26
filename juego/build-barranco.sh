#!/bin/sh
# Junta barranco.html + css + js en un solo archivo: dist/barranco.html (nivel Barranco).
# Sirve para jugarlo con doble clic, subirlo a itch.io o publicarlo como página.
# Uso: sh build-barranco.sh
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
inline barranco.html dist/barranco.html
echo "OK: dist/barranco.html ($(wc -c < dist/barranco.html | tr -d " ") bytes)"
