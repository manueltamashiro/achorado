#!/bin/sh
# Junta miraflores.html + css + js en un solo archivo: dist/miraflores.html (nivel 3, Parque Kennedy).
# Sirve para jugarlo con doble clic, subirlo a itch.io o publicarlo como página.
# Uso: sh build-miraflores.sh
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
inline miraflores.html dist/miraflores.html
echo "OK: dist/miraflores.html ($(wc -c < dist/miraflores.html | tr -d " ") bytes)"
