#!/usr/bin/env node
/**
 * Builds the compact dataset used by the web app from a raw Overpass export.
 *
 *   node scripts/build-data.mjs [input.json(.gz)] [output.json.gz]
 *
 * The raw export (see get_data.sh) can be either `out geom` or `out center`
 * Overpass JSON. Every node, way and relation describing a fortification is
 * kept: ways and relations are reduced to their centre point.
 *
 * The output is a columnar JSON document (one array per field) compressed with
 * gzip, which keeps the download around a few MB instead of ~35 MB.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { iso1A2Code } from '@rapideditor/country-coder';

const input = process.argv[2] ?? 'data/osm-export.json.gz';
const output = process.argv[3] ?? 'public/data/fortifications.json.gz';

// Must stay in sync with src/data/categories.ts
const CATEGORIES = ['castle', 'manor', 'fort', 'bunker', 'wall', 'tower', 'other'];

const FLAG_RUINS = 1;
const FLAG_HERITAGE = 2;
const FLAG_WIKI = 4;
const FLAG_IMAGE = 8;
const FLAG_VISIT = 16;

const t0 = Date.now();
let raw = fs.readFileSync(input);
if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
const osm = JSON.parse(raw.toString('utf8'));
raw = null;
console.log(`Parsed ${osm.elements.length} elements in ${Date.now() - t0} ms`);

const lower = v => (typeof v === 'string' ? v.toLowerCase() : '');

/** Returns the category index for a set of tags, or -1 if not a fortification. */
function categorize(tags) {
	const historic = lower(tags.historic);
	const military = lower(tags.military);
	const building = lower(tags.building);
	const castleType = lower(tags.castle_type);
	const defensive = /castle|fort|bunker|citadel|bastion|battery|wall|redoubt|blockhouse|pillbox|tower/;

	if (!historic && !military && building !== 'bunker' && !tags.defensive_works) return -1;
	if (historic && !defensive.test(historic) && military !== 'bunker' && building !== 'bunker') return -1;
	if (!historic && military && military !== 'bunker' && military !== 'fortress') return -1;

	if (/bunker|pillbox|blockhouse/.test(historic) || military === 'bunker' || building === 'bunker')
		return CATEGORIES.indexOf('bunker');
	// Mappers often tag forts as castles: trust an explicit name.
	const name = lower(tags.name);
	if (/^(bunker|blockhaus|blockhouse|casemate|kasematte)\b/.test(name)) return CATEGORIES.indexOf('bunker');
	if (
		/^(fort|forte|fortin|fortezza|fortaleza|fortress|forteresse|festung|citadel|citadelle|cittadella|ciudadela|zitadelle|batterie|battery|bateria|redoute|redoubt)\b/.test(
			name,
		)
	)
		return CATEGORIES.indexOf('fort');
	if (/wall/.test(historic)) return CATEGORIES.indexOf('wall');
	if (/martello|tower/.test(historic) && !/castle|fort/.test(historic)) return CATEGORIES.indexOf('tower');
	if (/fortified_church/.test(historic)) return CATEGORIES.indexOf('other');
	if (/^fortification$/.test(historic)) return CATEGORIES.indexOf('other');
	if (/fort|citadel|bastion|battery|redoubt/.test(historic) || military === 'fortress')
		return CATEGORIES.indexOf('fort');
	if (/castle/.test(historic)) {
		if (/fortress|castrum|kremlin|citadel|fort/.test(castleType)) return CATEGORIES.indexOf('fort');
		if (/stately|manor|palace|schloss|chateau|château|palais|mansion/.test(castleType))
			return CATEGORIES.indexOf('manor');
		return CATEGORIES.indexOf('castle');
	}
	return CATEGORIES.indexOf('other');
}

/** Extracts a year (negative for BC) from OSM date-ish strings. */
function parseYear(value) {
	if (!value) return 0;
	const v = String(value).trim();
	let m = v.match(/^(?:~|before |after |early |mid |late |\s)*C(\d{1,2})/i);
	if (m) return (Number(m[1]) - 1) * 100 + 50;
	m = v.match(/(\d{1,2})(?:st|nd|rd|th)\s+century/i);
	if (m) return (Number(m[1]) - 1) * 100 + 50;
	m = v.match(/(-?\d{3,4})/);
	if (m) {
		const y = Number(m[1]);
		if (y > -3000 && y <= new Date().getFullYear()) return y === 0 ? 1 : y;
	}
	return 0;
}

function centre(e) {
	if (typeof e.lat === 'number' && typeof e.lon === 'number') return [e.lat, e.lon];
	if (e.center) return [e.center.lat, e.center.lon];
	if (e.bounds) {
		return [(e.bounds.minlat + e.bounds.maxlat) / 2, (e.bounds.minlon + e.bounds.maxlon) / 2];
	}
	const pts = e.geometry ?? e.members?.flatMap(m => m.geometry ?? []) ?? [];
	if (pts.length === 0) return null;
	let la = 0;
	let lo = 0;
	for (const p of pts) {
		la += p.lat;
		lo += p.lon;
	}
	return [la / pts.length, lo / pts.length];
}

const nameKeys = [
	'name:fr',
	'name:en',
	'name:de',
	'name:es',
	'name:it',
	'int_name',
	'official_name',
	'alt_name',
	'old_name',
	'loc_name',
	'short_name',
];

function bestName(tags) {
	return (
		tags.name ||
		tags['name:en'] ||
		tags['name:fr'] ||
		tags.int_name ||
		tags.official_name ||
		''
	).trim();
}

function imageOf(tags) {
	const img = tags.image || '';
	if (/^File:/i.test(img)) return img;
	if (/^https?:\/\/(upload\.wikimedia\.org|commons\.wikimedia\.org)/.test(img)) return img;
	const commons = tags.wikimedia_commons || '';
	if (/^(File|Category):/i.test(commons)) return commons;
	return '';
}

const SITE_RE = /^https?:\/\//i;
const records = [];

for (const e of osm.elements) {
	const tags = e.tags;
	if (!tags) continue;
	const cat = categorize(tags);
	if (cat < 0) continue;
	const c = centre(e);
	if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
	if (c[0] === 0 && c[1] === 0) continue;

	const historic = lower(tags.historic);
	const ruins =
		tags.ruins === 'yes' ||
		/ruin/.test(historic) ||
		/ruin/.test(lower(tags.castle_type)) ||
		tags['ruins:castle'] !== undefined ||
		tags.abandoned === 'yes' ||
		tags.disused === 'yes';
	const heritage = Boolean(
		tags.heritage || tags['heritage:operator'] || tags['ref:mhs'] || tags.protection_title,
	);
	const wiki = Boolean(tags.wikipedia || tags.wikidata);
	const image = imageOf(tags);
	const visit =
		/attraction|museum|viewpoint/.test(lower(tags.tourism)) ||
		Boolean(tags.opening_hours) ||
		tags.access === 'yes' ||
		tags.access === 'permissive';

	const name = bestName(tags);
	const alt = [...new Set(nameKeys.map(k => (tags[k] || '').trim()).filter(n => n && n !== name))].join('|');

	records.push({
		id: e.type[0] + e.id,
		type: e.type,
		lat: c[0],
		lon: c[1],
		cat,
		flags:
			(ruins ? FLAG_RUINS : 0) |
			(heritage ? FLAG_HERITAGE : 0) |
			(wiki ? FLAG_WIKI : 0) |
			(image ? FLAG_IMAGE : 0) |
			(visit ? FLAG_VISIT : 0),
		name,
		nameFr: (tags['name:fr'] || '').trim() !== name ? (tags['name:fr'] || '').trim() : '',
		nameEn: (tags['name:en'] || '').trim() !== name ? (tags['name:en'] || '').trim() : '',
		alt,
		city: (tags['addr:city'] || tags['addr:place'] || tags['is_in:city'] || '').trim(),
		year: parseYear(tags.start_date || tags.construction_date || tags.year_of_construction),
		date: (tags.start_date || '').trim(),
		wd: /^Q\d+$/.test(tags.wikidata || '') ? tags.wikidata : '',
		wp: tags.wikipedia || '',
		img: image,
		web: SITE_RE.test(tags.website || tags['contact:website'] || tags.url || '')
			? tags.website || tags['contact:website'] || tags.url
			: '',
		ct: (tags.castle_type || tags.bunker_type || '').split(';')[0].trim(),
	});
}
console.log(`Kept ${records.length} fortifications`);

// --- Deduplicate: the same castle is often mapped as a node *and* a building
// outline, or split into several ways sharing the same name.
const typeRank = { relation: 3, way: 2, node: 1 };
const score = r => typeRank[r.type] * 10 + (r.wd ? 4 : 0) + (r.wp ? 2 : 0) + (r.img ? 1 : 0);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cell = (lat, lon) => `${Math.floor(lat * 200)}:${Math.floor(lon * 200)}`; // ~500 m cells
const byKey = new Map();
const kept = [];
let merged = 0;
records.sort((a, b) => score(b) - score(a));
for (const r of records) {
	const key = r.wd || (r.name ? norm(r.name) : '');
	if (!key) {
		kept.push(r);
		continue;
	}
	let dup = null;
	const baseLat = Math.floor(r.lat * 200);
	const baseLon = Math.floor(r.lon * 200);
	for (let dy = -1; dy <= 1 && !dup; dy++) {
		for (let dx = -1; dx <= 1 && !dup; dx++) {
			const bucket = byKey.get(`${key}@${baseLat + dy}:${baseLon + dx}`);
			if (bucket) dup = bucket;
		}
	}
	if (dup) {
		merged++;
		// Fill gaps of the kept record with info from the duplicate.
		for (const f of ['wd', 'wp', 'img', 'web', 'city', 'date', 'ct', 'alt', 'nameFr', 'nameEn'])
			if (!dup[f] && r[f]) dup[f] = r[f];
		if (!dup.year && r.year) dup.year = r.year;
		dup.flags |= r.flags & (FLAG_HERITAGE | FLAG_WIKI | FLAG_IMAGE | FLAG_VISIT);
		continue;
	}
	byKey.set(`${key}@${cell(r.lat, r.lon)}`, r);
	kept.push(r);
}
console.log(`Merged ${merged} duplicates -> ${kept.length} records`);

// Stable, spatially coherent order helps gzip.
kept.sort((a, b) => a.lat - b.lat || a.lon - b.lon);

// --- Countries
const countries = [];
const countryIndex = new Map();
const cc = kept.map(r => {
	const code = iso1A2Code([r.lon, r.lat]) || '';
	if (!code) return -1;
	if (!countryIndex.has(code)) {
		countryIndex.set(code, countries.length);
		countries.push(code);
	}
	return countryIndex.get(code);
});

// --- Dictionaries for repetitive short strings
function dict(values) {
	const list = [''];
	const index = new Map([['', 0]]);
	const out = values.map(v => {
		if (!index.has(v)) {
			index.set(v, list.length);
			list.push(v);
		}
		return index.get(v);
	});
	return { list, out };
}
const ctDict = dict(kept.map(r => r.ct.toLowerCase()));
const cityDict = dict(kept.map(r => r.city));

const round = (v, f) => Math.round(v * f);
const doc = {
	version: 6,
	generated: new Date().toISOString(),
	source: osm.osm3s?.timestamp_osm_base ?? null,
	count: kept.length,
	categories: CATEGORIES,
	countries,
	castleTypes: ctDict.list,
	cities: cityDict.list,
	id: kept.map(r => r.id),
	lat: kept.map(r => round(r.lat, 1e5)),
	lon: kept.map(r => round(r.lon, 1e5)),
	cat: kept.map(r => r.cat),
	flags: kept.map(r => r.flags),
	country: cc,
	name: kept.map(r => r.name),
	nameFr: kept.map(r => r.nameFr),
	nameEn: kept.map(r => r.nameEn),
	alt: kept.map(r => r.alt),
	city: cityDict.out,
	year: kept.map(r => r.year),
	date: kept.map(r => r.date),
	ct: ctDict.out,
	wd: kept.map(r => r.wd),
	wp: kept.map(r => r.wp),
	img: kept.map(r => r.img),
	web: kept.map(r => r.web),
};

const json = JSON.stringify(doc);
const gz = zlib.gzipSync(json, { level: 9 });
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, gz);

const catCounts = CATEGORIES.map((c, i) => `${c}=${kept.filter(r => r.cat === i).length}`).join(' ');
console.log(catCounts);
console.log(`Named: ${kept.filter(r => r.name).length}, countries: ${countries.length}`);
console.log(
	`Wrote ${output}: ${(json.length / 1e6).toFixed(1)} MB json, ${(gz.length / 1e6).toFixed(2)} MB gzip (${Date.now() - t0} ms)`,
);
