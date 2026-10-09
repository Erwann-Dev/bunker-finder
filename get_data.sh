#!/usr/bin/env bash
# Downloads every fortification from OpenStreetMap (Overpass API), then builds
# the compact dataset served by the app (public/data/fortifications.json.gz).
#
#   ./get_data.sh            # download + build
#   ./get_data.sh --build    # only rebuild from the existing export
set -euo pipefail
cd "$(dirname "$0")"

RAW=data/osm-export.json.gz

if [[ "${1:-}" != "--build" ]]; then
	mkdir -p data
	# `out center tags` returns one point per way/relation instead of every
	# node of the outline, which keeps the export small.
	curl -fsS -X POST https://overpass-api.de/api/interpreter \
		-H "Content-Type: application/x-www-form-urlencoded" \
		--data-urlencode 'data=
			[out:json][timeout:6000];
			(
				nwr["historic"~"fort|castle|bunker|fortification|citadel"];
				nwr["military"="bunker"];
				nwr["building"="bunker"];
			);
			out center tags;' |
		gzip -9 >"$RAW.tmp"
	mv "$RAW.tmp" "$RAW"
fi

node --max-old-space-size=8000 scripts/build-data.mjs "$RAW" public/data/fortifications.json.gz
