#! /bin/bash

curl -X POST https://overpass-api.de/api/interpreter \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode 'data=
    [out:json][timeout:6000];
    (
      node["historic"~"fort|castle|bunker|fortification"];
      way["historic"~"fort|castle|bunker|fortification"];
      relation["historic"~"fort|castle|bunker|fortification"];
    );
    (._;>;);
    out geom;' > public/assets/export2.geojson