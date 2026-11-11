#!/usr/bin/env bash
# Re-pull the Namche layers from OpenStreetMap via Overpass. Needs network access.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
BBOX="27.7930,86.6900,27.8220,86.7360"   # south,west,north,east: Namche + Syangboche ridge
cat > /tmp/namche.ql <<EOF
[out:json][timeout:90];
( way["building"]($BBOX); relation["building"]($BBOX);
  way["highway"]($BBOX); way["waterway"]($BBOX);
  way["barrier"="wall"]($BBOX); way["natural"]($BBOX);
  nwr["aeroway"]($BBOX); node["amenity"]($BBOX);
  node["tourism"]($BBOX); node["shop"]($BBOX); node["historic"]($BBOX); );
out body geom;
EOF
curl -s -X POST --data-binary @/tmp/namche.ql https://overpass-api.de/api/interpreter \
  -o "$HERE/../data/raw/namche-osm.geojson"
echo "written to data/raw/namche-osm.geojson"
