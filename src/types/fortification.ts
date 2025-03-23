export interface FortificationProperties {
	// Common OpenStreetMap properties
	'@id'?: string;
	'@timestamp'?: string;
	'@version'?: string;
	'@changeset'?: string;
	'@user'?: string;
	'@uid'?: string;

	// Fort properties
	name?: string;
	alt_name?: string;
	type?: string;
	historic?: string;
	building?: string;
	access?: string;
	start_date?: string;
	wikidata?: string;
	wikipedia?: string;
	heritage?: string;
	'heritage:operator'?: string;

	// Enhanced properties
	imageUrls?: string[]; // Array of image URLs for the fortification
	description?: string; // Detailed description fetched from external sources
	period?: string; // Historical period (medieval, renaissance, etc.)
	constructionStyle?: string; // Architectural style
	externalLinks?: {
		// Additional links to external resources
		title: string;
		url: string;
	}[];
	lastFetched?: string; // Timestamp of when additional data was last fetched

	// Original Merimee properties
	geo_point_2d?: {
		lon: number;
		lat: number;
	};
	chpuser?: string;
	chpdeno?: string;
	chpgenr?: string | null;
	chppden?: string | null;
	chpvoca?: string | null;
	chpappl?: string | null;
	chpactu?: string | null;
	chptico?: string;
	chppart?: string;
	chprefp?: string | null;
	chpcoll?: string | null;
	chpreg?: string;
	chpdpt?: string;
	chpcom?: string;
	chpinsee?: string;
	chpploc?: string | null;
	chpaire?: string;
	chpcant?: string | null;
	chplieu?: string;
	chpadrs?: string;
	chpedif?: string | null;
	chprefe?: string | null;
	chpcada?: string;
	chpzone?: string;
	chpcoor?: string;
	chpcoorm?: string | null;
	chpcoorlb93?: string;
	chpcoormlb93?: string | null;
	chpcoorwgs84?: string;
	chpcoormwgs84?: string | null;
	chpimpl?: string;
	chphydr?: string | null;
	chpscle?: string;
	chpscld?: string | null;
	chpdate?: string | null;
	chpjdat?: string | null;
	chpautr?: string | null;
	chpjatt?: string | null;
	chppers?: string | null;
	chpremp?: string | null;
	chpdepl?: string | null;
	chphist?: string | null;
	chpprot?: string;
	chpdpro?: string | null;
	chpppro?: string | null;
	chpapro?: string | null;
	chpmhpp?: string | null;
	chpsite?: string | null;
	chpinte?: string | null;
	chprema?: string | null;
	chpobs?: string | null;

	// Allow for any other properties
	[key: string]: any;
}

export interface PointGeometry {
	type: 'Point';
	coordinates: [number, number]; // [longitude, latitude]
}

export interface PolygonGeometry {
	type: 'Polygon';
	coordinates: number[][][]; // Array of rings (first is outer, rest are holes)
}

export interface FortificationType {
	type: string;
	geometry: PointGeometry | PolygonGeometry;
	properties: FortificationProperties;
	id?: string;
}

export interface GeoJSONResponse {
	type: string;
	features: FortificationType[];
	generator?: string;
	copyright?: string;
	timestamp?: string;
}

// Extended types for filtering
export interface FilterOption {
	id: string;
	label: string;
	value: string;
	count: number;
}

export interface FilterGroup {
	id: string;
	name: string;
	options: FilterOption[];
}

// Type for the Wikipedia API response
export interface WikipediaApiResponse {
	query?: {
		pages?: Record<
			string,
			{
				pageid: number;
				ns: number;
				title: string;
				extract?: string;
				thumbnail?: {
					source: string;
					width: number;
					height: number;
				};
				pageimage?: string;
				images?: {
					title: string;
				}[];
			}
		>;
	};
}

// Type for the Wikidata API response
export interface WikidataApiResponse {
	entities?: Record<
		string,
		{
			id: string;
			claims?: Record<
				string,
				{
					mainsnak?: {
						datavalue?: {
							value?:
								| string
								| {
										time?: string;
										[key: string]: any;
								  };
							[key: string]: any;
						};
						[key: string]: any;
					};
					[key: string]: any;
				}[]
			>;
			[key: string]: any;
		}
	>;
}
