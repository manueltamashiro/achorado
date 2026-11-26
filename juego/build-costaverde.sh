#!/bin/sh
# Junta costaverde.html + css + js en un solo archivo: dist/costaverde.html (Miraflores 2, Costa Verde).
# Sirve para jugarlo con doble clic, subirlo a itch.io o publicarlo como página.
# Uso: sh build-costaverde.sh
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
inline costaverde.html dist/costaverde.html
echo "OK: dist/costaverde.html ($(wc -c < dist/costaverde.html | tr -d " ") bytes)"
