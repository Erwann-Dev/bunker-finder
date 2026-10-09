import {
	CATEGORY_IDS,
	FLAG_HERITAGE,
	FLAG_IMAGE,
	FLAG_VISIT,
	FLAG_WIKI,
	type CategoryId,
} from '../data/categories';
import { normalize } from './text';
import type { Dataset, Fort, OsmType } from './types';

interface RawDataset {
	version: number;
	generated: string;
	source: string | null;
	count: number;
	categories: string[];
	countries: string[];
	castleTypes: string[];
	cities: string[];
	id: string[];
	lat: number[];
	lon: number[];
	cat: number[];
	flags: number[];
	country: number[];
	name: string[];
	nameFr: string[];
	nameEn: string[];
	alt: string[];
	city: number[];
	year: number[];
	date: string[];
	ct: number[];
	wd: string[];
	wp: string[];
	img: string[];
	web: string[];
}

const OSM_TYPES: Record<string, OsmType> = { n: 'node', w: 'way', r: 'relation' };

export const DATA_URL = `${import.meta.env.BASE_URL}data/fortifications.json.gz`;

async function readBody(res: Response, onProgress: (ratio: number | null) => void): Promise<Uint8Array> {
	const total = Number(res.headers.get('Content-Length')) || 0;
	// When the server already applied Content-Encoding the length is the
	// compressed size, so the ratio is only an indication.
	if (!res.body) return new Uint8Array(await res.arrayBuffer());
	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		received += value.length;
		onProgress(total ? Math.min(1, received / total) : null);
	}
	const out = new Uint8Array(received);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.length;
	}
	return out;
}

async function gunzipIfNeeded(bytes: Uint8Array): Promise<string> {
	// Servers may or may not decompress `.gz` files transparently: sniff the
	// gzip magic number instead of trusting the extension.
	if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
		const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
		return await new Response(stream).text();
	}
	return new TextDecoder().decode(bytes);
}

export async function loadDataset(onProgress: (ratio: number | null) => void): Promise<Dataset> {
	const res = await fetch(DATA_URL);
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
	const text = await gunzipIfNeeded(await readBody(res, onProgress));
	const raw = JSON.parse(text) as RawDataset;
	return decode(raw);
}

function decode(raw: RawDataset): Dataset {
	const forts: Fort[] = new Array(raw.count);
	const byId = new Map<string, Fort>();
	const cats = raw.categories.map(c =>
		(CATEGORY_IDS as readonly string[]).includes(c) ? (c as CategoryId) : 'other',
	);

	for (let i = 0; i < raw.count; i++) {
		const id = raw.id[i];
		const name = raw.name[i];
		const altNames = raw.alt[i] ? raw.alt[i].split('|') : [];
		const city = raw.cities[raw.city[i]] ?? '';
		const flags = raw.flags[i];
		const fort: Fort = {
			idx: i,
			id,
			osmType: OSM_TYPES[id[0]] ?? 'node',
			osmId: Number(id.slice(1)),
			lat: raw.lat[i] / 1e5,
			lon: raw.lon[i] / 1e5,
			cat: cats[raw.cat[i]] ?? 'other',
			flags,
			name,
			names: { fr: raw.nameFr[i] || undefined, en: raw.nameEn[i] || undefined },
			altNames,
			city,
			country: raw.country[i] >= 0 ? raw.countries[raw.country[i]] : '',
			year: raw.year[i],
			date: raw.date[i],
			castleType: raw.castleTypes[raw.ct[i]] ?? '',
			wikidata: raw.wd[i],
			wikipedia: raw.wp[i],
			image: raw.img[i],
			website: raw.web[i],
			nameNorm: normalize(name),
			namesNorm: [name, raw.nameFr[i], raw.nameEn[i]].filter(Boolean).map(normalize),
			search: normalize([name, ...altNames, city].join(' ')),
			rank:
				(name ? 10 : 0) +
				(flags & FLAG_WIKI ? 20 : 0) +
				(flags & FLAG_HERITAGE ? 8 : 0) +
				(flags & FLAG_IMAGE ? 6 : 0) +
				(flags & FLAG_VISIT ? 6 : 0) +
				(raw.wd[i] ? 4 : 0),
		};
		forts[i] = fort;
		byId.set(id, fort);
	}

	return {
		forts,
		byId,
		source: raw.source,
		generated: raw.generated,
		countries: raw.countries,
	};
}
