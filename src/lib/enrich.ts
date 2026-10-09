import { stripHtml } from './text';
import type { Fort } from './types';

export interface Photo {
	thumb: string;
	full: string;
	page: string;
	author: string;
	license: string;
	nearby?: boolean;
}

export interface WikiSummary {
	title: string;
	extract: string;
	description: string;
	url: string;
	lang: string;
}

export interface OsmDetails {
	tags: Record<string, string>;
	/** Outline rings/lines as [lat, lon] pairs. */
	shapes: [number, number][][];
}

export interface Enrichment {
	summary: WikiSummary | null;
	photos: Photo[];
	inception: number | null;
	wikidataDescription: string;
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
	let p = cache.get(key) as Promise<T> | undefined;
	if (!p) {
		p = fn().catch(err => {
			cache.delete(key);
			throw err;
		});
		cache.set(key, p);
	}
	return p;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return (await res.json()) as T;
}

// ---------------------------------------------------------------- Commons

interface CommonsPage {
	title: string;
	imageinfo?: {
		url: string;
		thumburl?: string;
		descriptionurl: string;
		mime?: string;
		extmetadata?: Record<string, { value: string }>;
	}[];
}

const IMAGE_MIME = /^image\/(jpeg|png|webp|tiff)$/;

function toPhotos(pages: CommonsPage[] | undefined, nearby = false): Photo[] {
	if (!pages) return [];
	const photos: Photo[] = [];
	for (const page of pages) {
		const info = page.imageinfo?.[0];
		if (!info || (info.mime && !IMAGE_MIME.test(info.mime))) continue;
		const meta = info.extmetadata ?? {};
		photos.push({
			thumb: info.thumburl ?? info.url,
			full: info.url,
			page: info.descriptionurl,
			author: meta.Artist ? stripHtml(meta.Artist.value).slice(0, 80) : '',
			license: meta.LicenseShortName ? stripHtml(meta.LicenseShortName.value) : '',
			nearby,
		});
	}
	return photos;
}

const IMAGEINFO =
	'prop=imageinfo&iiprop=url|mime|extmetadata&iiextmetadatafilter=Artist|LicenseShortName&iiurlwidth=960&format=json&formatversion=2&origin=*';

function commonsFiles(titles: string[]): Promise<Photo[]> {
	if (!titles.length) return Promise.resolve([]);
	const url = `${COMMONS_API}?action=query&titles=${encodeURIComponent(titles.join('|'))}&${IMAGEINFO}`;
	return cached(`files:${titles.join('|')}`, async () => {
		const data = await getJson<{ query?: { pages?: CommonsPage[] } }>(url);
		// Keep the order requested.
		const pages = data.query?.pages ?? [];
		const norm = (t: string) => t.replace(/_/g, ' ').toLowerCase();
		pages.sort(
			(a, b) =>
				titles.findIndex(t => norm(t) === norm(a.title)) - titles.findIndex(t => norm(t) === norm(b.title)),
		);
		return toPhotos(pages);
	});
}

function commonsCategory(category: string, limit = 10): Promise<Photo[]> {
	const title = category.startsWith('Category:') ? category : `Category:${category}`;
	const url = `${COMMONS_API}?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(title)}&gcmtype=file&gcmlimit=${limit}&${IMAGEINFO}`;
	return cached(`cat:${title}`, async () => {
		const data = await getJson<{ query?: { pages?: CommonsPage[] } }>(url);
		return toPhotos(data.query?.pages);
	});
}

function commonsNearby(lat: number, lon: number, radius = 250, limit = 10): Promise<Photo[]> {
	const url = `${COMMONS_API}?action=query&generator=geosearch&ggscoord=${lat}|${lon}&ggsradius=${radius}&ggsnamespace=6&ggslimit=${limit}&${IMAGEINFO}`;
	return cached(`geo:${lat.toFixed(5)},${lon.toFixed(5)}`, async () => {
		const data = await getJson<{ query?: { pages?: CommonsPage[] } }>(url);
		return toPhotos(data.query?.pages, true);
	});
}

function fileTitleFromValue(value: string): string | null {
	if (!value) return null;
	if (/^File:/i.test(value)) return 'File:' + value.slice(5).trim();
	const m = value.match(
		/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i,
	);
	if (m) return 'File:' + decodeURIComponent(m[1]);
	const m2 = value.match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i);
	if (m2) return decodeURIComponent(m2[1]).replace(/_/g, ' ');
	return null;
}

// --------------------------------------------------------------- Wikidata

interface WikidataEntity {
	claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]>;
	sitelinks?: Record<string, { title: string }>;
	descriptions?: Record<string, { value: string }>;
}

function claimValue(entity: WikidataEntity, prop: string): unknown {
	return entity.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value;
}

function wikidataEntity(id: string): Promise<WikidataEntity | null> {
	const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=claims|sitelinks|descriptions&languages=fr|en|de|es|it&format=json&origin=*`;
	return cached(`wd:${id}`, async () => {
		const data = await getJson<{ entities?: Record<string, WikidataEntity> }>(url);
		return data.entities?.[id] ?? null;
	});
}

// -------------------------------------------------------------- Wikipedia

interface RestSummary {
	title: string;
	extract?: string;
	description?: string;
	type?: string;
	originalimage?: { source: string };
	thumbnail?: { source: string };
	content_urls?: { desktop?: { page: string } };
}

function wikipediaSummary(lang: string, title: string): Promise<RestSummary | null> {
	const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
	return cached(`wp:${lang}:${title}`, async () => {
		try {
			return await getJson<RestSummary>(url);
		} catch {
			return null;
		}
	});
}

function parseWikipediaTag(tag: string): { lang: string; title: string } | null {
	const m = tag.match(/^([a-z-]{2,12}):(.+)$/);
	return m ? { lang: m[1], title: m[2] } : null;
}

// ------------------------------------------------------------- Enrichment

export async function enrichFort(fort: Fort, uiLang: string): Promise<Enrichment> {
	const lang = uiLang.slice(0, 2);
	let entity: WikidataEntity | null = null;
	if (fort.wikidata) {
		try {
			entity = await wikidataEntity(fort.wikidata);
		} catch {
			entity = null;
		}
	}

	// Pick the Wikipedia article in the UI language when possible.
	const candidates: { lang: string; title: string }[] = [];
	const links = entity?.sitelinks ?? {};
	for (const l of [lang, 'en', 'fr', 'de', 'es', 'it']) {
		const link = links[`${l}wiki`];
		if (link) candidates.push({ lang: l, title: link.title });
	}
	const tag = parseWikipediaTag(fort.wikipedia);
	if (tag) candidates.splice(tag.lang === lang ? 0 : candidates.length, 0, tag);

	let summary: WikiSummary | null = null;
	let summaryImage: string | null = null;
	for (const c of candidates.slice(0, 3)) {
		const s = await wikipediaSummary(c.lang, c.title);
		if (s?.extract && s.type !== 'disambiguation') {
			summary = {
				title: s.title,
				extract: s.extract,
				description: s.description ?? '',
				url:
					s.content_urls?.desktop?.page ??
					`https://${c.lang}.wikipedia.org/wiki/${encodeURIComponent(c.title)}`,
				lang: c.lang,
			};
			summaryImage = s.originalimage?.source ?? s.thumbnail?.source ?? null;
			break;
		}
	}

	// Collect photo file titles from the most reliable sources first.
	const fileTitles: string[] = [];
	const addTitle = (t: string | null) => {
		if (t && !fileTitles.some(x => x.toLowerCase() === t.toLowerCase())) fileTitles.push(t);
	};
	if (entity) {
		const p18 = claimValue(entity, 'P18');
		if (typeof p18 === 'string') addTitle(`File:${p18}`);
	}
	addTitle(fileTitleFromValue(fort.image));
	if (summaryImage) addTitle(fileTitleFromValue(summaryImage));

	let photos: Photo[] = [];
	try {
		photos = await commonsFiles(fileTitles.slice(0, 5));
	} catch {
		photos = [];
	}

	const category =
		(entity && typeof claimValue(entity, 'P373') === 'string'
			? (claimValue(entity, 'P373') as string)
			: null) ?? (/^Category:/i.test(fort.image) ? fort.image : null);
	if (category && photos.length < 6) {
		try {
			photos = mergePhotos(photos, await commonsCategory(category));
		} catch {
			/* ignore */
		}
	}
	if (photos.length < 3) {
		try {
			photos = mergePhotos(
				photos,
				await commonsNearby(fort.lat, fort.lon, fort.osmType === 'node' ? 150 : 300),
			);
		} catch {
			/* ignore */
		}
	}

	let inception: number | null = null;
	const p571 = entity ? claimValue(entity, 'P571') : null;
	if (p571 && typeof p571 === 'object' && 'time' in p571) {
		const m = String((p571 as { time: string }).time).match(/^([+-])(\d+)/);
		if (m) inception = Number(m[2]) * (m[1] === '-' ? -1 : 1);
	}

	const descriptions = entity?.descriptions ?? {};
	const wikidataDescription = descriptions[lang]?.value ?? descriptions.en?.value ?? '';

	return { summary, photos: photos.slice(0, 12), inception, wikidataDescription };
}

function mergePhotos(a: Photo[], b: Photo[]): Photo[] {
	const seen = new Set(a.map(p => p.page));
	return [...a, ...b.filter(p => !seen.has(p.page))];
}

// -------------------------------------------------------------------- OSM

interface OsmElement {
	type: 'node' | 'way' | 'relation';
	id: number;
	lat?: number;
	lon?: number;
	nodes?: number[];
	members?: { type: string; ref: number; role: string }[];
	tags?: Record<string, string>;
}

export function fetchOsmDetails(fort: Fort): Promise<OsmDetails> {
	const path = fort.osmType === 'node' ? `node/${fort.osmId}` : `${fort.osmType}/${fort.osmId}/full`;
	return cached(`osm:${fort.id}`, async () => {
		const data = await getJson<{ elements: OsmElement[] }>(
			`https://api.openstreetmap.org/api/0.6/${path}.json`,
		);
		const nodes = new Map<number, [number, number]>();
		const ways = new Map<number, OsmElement>();
		let main: OsmElement | undefined;
		for (const el of data.elements) {
			if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined)
				nodes.set(el.id, [el.lat, el.lon]);
			if (el.type === 'way') ways.set(el.id, el);
			if (el.type === fort.osmType && el.id === fort.osmId) main = el;
		}
		const shapes: [number, number][][] = [];
		const wayShape = (w: OsmElement) =>
			(w.nodes ?? []).map(n => nodes.get(n)).filter((p): p is [number, number] => Boolean(p));
		if (main?.type === 'way') shapes.push(wayShape(main));
		if (main?.type === 'relation') {
			for (const m of main.members ?? []) {
				if (m.type !== 'way' || m.role === 'inner') continue;
				const w = ways.get(m.ref);
				if (w) shapes.push(wayShape(w));
			}
		}
		return { tags: main?.tags ?? {}, shapes: shapes.filter(s => s.length > 1) };
	});
}
