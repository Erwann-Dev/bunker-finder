import {
	CATEGORY_IDS,
	eraOf,
	FLAG_HERITAGE,
	FLAG_RUINS,
	FLAG_VISIT,
	FLAG_WIKI,
	type CategoryId,
} from '../data/categories';
import en from '../i18n/locales/en';
import fr from '../i18n/locales/fr';
import { distanceKm } from './geo';
import { countryName, normalize } from './text';
import type { Filters, Fort, LatLon, SortMode } from './types';

const CATEGORY_SYNONYMS: Record<CategoryId, string> = {
	castle: 'chateau fort castle castillo castello burg zamek hrad kasteel borg',
	manor: 'chateau manoir manor palace palais schloss stately',
	fort: 'fort forteresse fortress citadelle citadel bastion batterie battery redoute',
	bunker: 'bunker blockhaus casemate pillbox abri atlantikwall westwall maginot',
	wall: 'rempart remparts muraille enceinte wall walls',
	tower: 'tour tower martello',
	other: 'fortification ouvrage eglise fortifiee',
};

const categoryText = Object.fromEntries(
	CATEGORY_IDS.map(c => [
		c,
		normalize(
			[
				fr.categories[c],
				fr.categoriesPlural[c],
				en.categories[c],
				en.categoriesPlural[c],
				CATEGORY_SYNONYMS[c],
			].join(' '),
		),
	]),
) as Record<CategoryId, string>;

const countryTextCache = new Map<string, string>();
function countryText(code: string): string {
	if (!code) return '';
	let text = countryTextCache.get(code);
	if (text === undefined) {
		text = normalize(`${countryName(code, 'fr')} ${countryName(code, 'en')} ${code}`);
		countryTextCache.set(code, text);
	}
	return text;
}

export interface Query {
	raw: string;
	tokens: string[];
}

export function parseQuery(q: string): Query | null {
	const raw = normalize(q);
	if (!raw) return null;
	return { raw, tokens: raw.split(/\s+/).filter(Boolean) };
}

/** Returns 0 when the fort doesn't match, a positive relevance score otherwise. */
export function scoreFort(f: Fort, q: Query): number {
	let score = 0;
	for (const name of f.namesNorm) {
		if (name === q.raw) score = Math.max(score, 1000);
		else if (name.startsWith(q.raw)) score = Math.max(score, 600);
		else if ((' ' + name).includes(' ' + q.raw)) score = Math.max(score, 400);
		else if (name.includes(q.raw)) score = Math.max(score, 250);
	}
	if (!score) {
		if (f.search.includes(q.raw)) score = 150;
		else if (f.wikidata && f.wikidata.toLowerCase() === q.raw) score = 900;
		else if (f.id === q.raw) score = 900;
		else {
			// Every token must match the names, the town, the country or the type.
			const haystack = `${f.search} ${countryText(f.country)} ${categoryText[f.cat]}`;
			for (const token of q.tokens) if (!haystack.includes(token)) return 0;
			score = 60;
			for (const token of q.tokens) if (f.search.includes(token)) score += 20;
		}
	}
	return score + f.rank - Math.min(f.nameNorm.length, 60) * 0.2;
}

export function matchesFilters(f: Fort, filters: Filters): boolean {
	if (filters.categories.length && !filters.categories.includes(f.cat)) return false;
	if (filters.country && f.country !== filters.country) return false;
	if (filters.eras.length) {
		const era = eraOf(f.year);
		if (!era || !filters.eras.includes(era)) return false;
	}
	if (filters.ruins === 'only' && !(f.flags & FLAG_RUINS)) return false;
	if (filters.ruins === 'exclude' && f.flags & FLAG_RUINS) return false;
	if (filters.heritage && !(f.flags & FLAG_HERITAGE)) return false;
	if (filters.wiki && !(f.flags & FLAG_WIKI)) return false;
	if (filters.visit && !(f.flags & FLAG_VISIT)) return false;
	if (filters.named && !f.name) return false;
	return true;
}

export function activeFilterCount(filters: Filters): number {
	return (
		(filters.categories.length ? 1 : 0) +
		(filters.eras.length ? 1 : 0) +
		(filters.country ? 1 : 0) +
		(filters.ruins !== 'any' ? 1 : 0) +
		(filters.heritage ? 1 : 0) +
		(filters.wiki ? 1 : 0) +
		(filters.visit ? 1 : 0) +
		(filters.named ? 1 : 0)
	);
}

export interface ScoredFort {
	fort: Fort;
	score: number;
}

export function searchForts(forts: Fort[], q: Query): ScoredFort[] {
	const out: ScoredFort[] = [];
	for (const fort of forts) {
		const score = scoreFort(fort, q);
		if (score > 0) out.push({ fort, score });
	}
	out.sort((a, b) => b.score - a.score);
	return out;
}

export function sortForts(items: ScoredFort[], mode: SortMode, origin: LatLon | null, lang: string): Fort[] {
	const collator = new Intl.Collator(lang, { sensitivity: 'base' });
	const arr = items.slice();
	switch (mode) {
		case 'distance':
			if (origin) {
				const d = new Map(arr.map(i => [i.fort.idx, distanceKm(origin, i.fort)]));
				arr.sort((a, b) => d.get(a.fort.idx)! - d.get(b.fort.idx)!);
			}
			break;
		case 'name':
			arr.sort((a, b) => {
				if (!a.fort.name !== !b.fort.name) return a.fort.name ? -1 : 1;
				return collator.compare(a.fort.name, b.fort.name);
			});
			break;
		case 'age':
			arr.sort((a, b) => {
				if (!a.fort.year !== !b.fort.year) return a.fort.year ? -1 : 1;
				return a.fort.year - b.fort.year;
			});
			break;
		default:
			arr.sort((a, b) => b.score - a.score);
	}
	return arr.map(i => i.fort);
}

/** The `count` closest forts to a point (excluding `exclude`). */
export function nearestForts(
	forts: Fort[],
	origin: LatLon,
	count: number,
	exclude?: number,
): { fort: Fort; km: number }[] {
	// Cheap equirectangular pre-filter keeps this fast over 65k points.
	const best: { fort: Fort; d2: number }[] = [];
	const cos = Math.cos((origin.lat * Math.PI) / 180);
	for (const f of forts) {
		if (f.idx === exclude) continue;
		const dx = (f.lon - origin.lon) * cos;
		const dy = f.lat - origin.lat;
		const d2 = dx * dx + dy * dy;
		if (best.length < count || d2 < best[best.length - 1].d2) {
			best.push({ fort: f, d2 });
			best.sort((a, b) => a.d2 - b.d2);
			if (best.length > count) best.pop();
		}
	}
	return best.map(b => ({ fort: b.fort, km: distanceKm(origin, b.fort) }));
}
