import type { CategoryId } from '../data/categories';

export type OsmType = 'node' | 'way' | 'relation';

export interface Fort {
	/** Position in the dataset array, used as a compact key everywhere. */
	idx: number;
	/** Short OSM id, e.g. `w3580387`. */
	id: string;
	osmType: OsmType;
	osmId: number;
	lat: number;
	lon: number;
	cat: CategoryId;
	flags: number;
	name: string;
	/** Names in the UI languages, when they differ from `name`. */
	names: { fr?: string; en?: string };
	altNames: string[];
	city: string;
	/** ISO 3166-1 alpha-2 code (or territory code), empty when unknown. */
	country: string;
	/** Construction year (negative for BC), 0 when unknown. */
	year: number;
	date: string;
	castleType: string;
	wikidata: string;
	wikipedia: string;
	image: string;
	website: string;
	/** Normalised primary name. */
	nameNorm: string;
	/** Normalised primary + French + English names. */
	namesNorm: string[];
	/** Normalised names + city, for search. */
	search: string;
	/** Rough notability score used to rank results. */
	rank: number;
}

export interface Dataset {
	forts: Fort[];
	byId: Map<string, Fort>;
	source: string | null;
	generated: string;
	countries: string[];
}

export type RuinsFilter = 'any' | 'only' | 'exclude';

export interface Filters {
	categories: CategoryId[];
	eras: string[];
	country: string;
	ruins: RuinsFilter;
	heritage: boolean;
	wiki: boolean;
	visit: boolean;
	named: boolean;
}

export const DEFAULT_FILTERS: Filters = {
	categories: [],
	eras: [],
	country: '',
	ruins: 'any',
	heritage: false,
	wiki: false,
	visit: false,
	named: false,
};

export type SortMode = 'relevance' | 'distance' | 'name' | 'age';

export interface MapViewState {
	south: number;
	west: number;
	north: number;
	east: number;
	centerLat: number;
	centerLon: number;
	zoom: number;
}

export interface LatLon {
	lat: number;
	lon: number;
}
