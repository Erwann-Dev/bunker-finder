import { useState, useEffect, useCallback } from 'react';
import {
	FortificationType,
	FilterGroup,
	PointGeometry,
	PolygonGeometry,
} from '../types/fortification';
import useExternalData from './useExternalData';

interface UseGeoJSONResult {
	fortifications: FortificationType[];
	loading: boolean;
	error: Error | null;
	retry: () => void;
	enrichFortification: (fortId: string) => Promise<void>;
	filters: FilterGroup[];
	isDataEnriched: boolean;
}

// New interface for the OSM overpass format
interface OSMResponse {
	version: number;
	generator: string;
	osm3s: {
		timestamp_osm_base: string;
		copyright: string;
	};
	elements: Array<{
		type: string; // "node", "way", or "relation"
		id: number;
		lat?: number;
		lon?: number;
		nodes?: number[];
		members?: Array<{ type: string; ref: number; role: string }>;
		tags?: Record<string, string>;
	}>;
}

const useGeoJSON = (jsonPath: string): UseGeoJSONResult => {
	const [fortifications, setFortifications] = useState<FortificationType[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);
	const [filters, setFilters] = useState<FilterGroup[]>([]);
	const [isDataEnriched, setIsDataEnriched] = useState<boolean>(false);
	const { enrichFortification: enrichFort } = useExternalData();

	// Generate filter groups from fortification data
	const generateFilters = useCallback(
		(forts: FortificationType[]): FilterGroup[] => {
			// Initialize filter objects
			const typeFilter: FilterGroup = {
				id: 'type',
				name: 'Type',
				options: [],
			};

			const periodFilter: FilterGroup = {
				id: 'period',
				name: 'Period',
				options: [],
			};

			const regionFilter: FilterGroup = {
				id: 'region',
				name: 'Region',
				options: [],
			};

			// Collect all types, periods, and regions with counts
			const typeMap = new Map<string, number>();
			const periodMap = new Map<string, number>();
			const regionMap = new Map<string, number>();

			forts.forEach(fort => {
				// Get type (try different possible fields)
				const type =
					fort.properties.chptico || fort.properties.historic || 'Unknown';

				if (type) {
					typeMap.set(type, (typeMap.get(type) || 0) + 1);
				}

				// Get period if available
				if (fort.properties.period) {
					periodMap.set(
						fort.properties.period,
						(periodMap.get(fort.properties.period) || 0) + 1,
					);
				}

				// Get region
				const region = fort.properties.chpreg;
				if (region) {
					regionMap.set(region, (regionMap.get(region) || 0) + 1);
				}
			});

			// Convert maps to filter options
			typeFilter.options = Array.from(typeMap.entries()).map(
				([value, count]) => ({
					id: `type-${value}`,
					label: value,
					value,
					count,
				}),
			);

			periodFilter.options = Array.from(periodMap.entries()).map(
				([value, count]) => ({
					id: `period-${value}`,
					label: value,
					value,
					count,
				}),
			);

			regionFilter.options = Array.from(regionMap.entries()).map(
				([value, count]) => ({
					id: `region-${value}`,
					label: value,
					value,
					count,
				}),
			);

			// Sort options by count (descending)
			typeFilter.options.sort((a, b) => b.count - a.count);
			periodFilter.options.sort((a, b) => b.count - a.count);
			regionFilter.options.sort((a, b) => b.count - a.count);

			// Return array of filter groups (only include non-empty ones)
			return [
				typeFilter,
				...(periodFilter.options.length > 0 ? [periodFilter] : []),
				...(regionFilter.options.length > 0 ? [regionFilter] : []),
			];
		},
		[],
	);

	// Convert OSM format to GeoJSON format
	const convertOSMToGeoJSON = useCallback(
		(osmData: OSMResponse): FortificationType[] => {
			const fortificationTags = [
				'castle',
				'fort',
				'bunker',
				'fortification',
				'fortress',
				'citadel',
				'bastion',
				'battery',
				'palace',
				'chateau',
				'tower',
				'mansion',
			];

			// Map historic tags to display names for better readability
			const typeMapping: Record<string, string> = {
				castle: 'Castle',
				fort: 'Fort',
				fortress: 'Fortress',
				bunker: 'Bunker',
				fortification: 'Fortification',
				citadel: 'Citadel',
				bastion: 'Bastion',
				battery: 'Battery',
				palace: 'Palace',
				chateau: 'Château',
				tower: 'Tower',
				mansion: 'Mansion',
			};

			return (
				osmData.elements
					.filter(element => {
						// Only include elements with historic tags related to fortifications
						if (!element.tags) return false;

						// Check if this is a fortification
						const isHistoric =
							element.tags?.historic &&
							fortificationTags.some(tag =>
								element.tags?.historic
									.toLowerCase()
									.includes(tag.toLowerCase()),
							);

						const isMilitary =
							element.tags?.military &&
							['bunker', 'fortress'].includes(
								element.tags.military.toLowerCase(),
							);

						const hasDefenceTag =
							element.tags?.defence || element.tags?.defense;

						// Include if it matches any of our fortification criteria
						return isHistoric || isMilitary || hasDefenceTag;
					})
					.map(element => {
						let geometry: PointGeometry | PolygonGeometry;

						// For nodes, create Point geometry
						if (element.type === 'node' && element.lat && element.lon) {
							geometry = {
								type: 'Point',
								coordinates: [element.lon, element.lat],
							};
						}
						// For now, treat ways and relations as Points using their first node
						// In a more complete implementation, we would handle these properly as Polygons
						else {
							// Default to a point at 0,0 (we'll filter these out later)
							geometry = {
								type: 'Point',
								coordinates: [0, 0],
							};
						}

						// Create properties from tags
						const properties: Record<string, any> = {
							...element.tags,
							'@id': `${element.type}/${element.id}`,
						};

						// Try to map the historic tag to a better display name
						if (element.tags?.historic) {
							const historicLower = element.tags.historic.toLowerCase();
							// Look for a matching tag in our mapping
							for (const [key, displayName] of Object.entries(typeMapping)) {
								if (historicLower.includes(key)) {
									properties.display_type = displayName;
									break;
								}
							}
						}

						// If no display type was found, use the original historic tag
						if (!properties.display_type && element.tags?.historic) {
							properties.display_type = element.tags.historic;
						}

						// For military structures
						if (!properties.display_type && element.tags?.military) {
							if (element.tags.military.toLowerCase() === 'bunker') {
								properties.display_type = 'Bunker';
							} else if (element.tags.military.toLowerCase() === 'fortress') {
								properties.display_type = 'Fortress';
							}
						}

						return {
							type: 'Feature',
							id: element.id.toString(),
							geometry,
							properties,
						};
					})
					// Filter out invalid geometries
					.filter(
						feature =>
							!(
								feature.geometry.type === 'Point' &&
								feature.geometry.coordinates[0] === 0 &&
								feature.geometry.coordinates[1] === 0
							),
					)
			);
		},
		[],
	);

	// Load GeoJSON data
	useEffect(() => {
		const loadGeoJSON = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(jsonPath);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch GeoJSON: ${response.statusText} (${response.status})`,
					);
				}

				const data = await response.json();

				// Check if this is standard GeoJSON or OSM format
				if (data.type === 'FeatureCollection' && data.features) {
					// Standard GeoJSON format
					setFortifications(data.features);
					setFilters(generateFilters(data.features));
				} else if (data.elements) {
					// OSM format from Overpass API
					const convertedFeatures = convertOSMToGeoJSON(data as OSMResponse);
					setFortifications(convertedFeatures);
					setFilters(generateFilters(convertedFeatures));
				} else {
					throw new Error('Unrecognized data format in GeoJSON file');
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Unknown error loading GeoJSON'),
				);
				console.error('Error loading GeoJSON:', err);
			} finally {
				setLoading(false);
			}
		};

		loadGeoJSON();
	}, [jsonPath, generateFilters, convertOSMToGeoJSON]);

	// Function to enrich a specific fortification with external data
	const enrichSingleFortification = useCallback(
		async (fortId: string) => {
			try {
				// Find the fortification
				const index = fortifications.findIndex(
					f => f.id === fortId || f.properties['@id'] === fortId,
				);
				if (index === -1) return;

				// Enrich it with external data
				const enrichedFort = await enrichFort(fortifications[index]);

				// Update the fortifications array
				const updatedForts = [...fortifications];
				updatedForts[index] = enrichedFort;

				setFortifications(updatedForts);

				// Update filters if needed
				setFilters(generateFilters(updatedForts));

				// Mark data as enriched for at least one fort
				setIsDataEnriched(true);
			} catch (error) {
				console.error('Failed to enrich fortification:', error);
			}
		},
		[fortifications, enrichFort, generateFilters],
	);

	// Reset function
	const retry = useCallback(() => {
		setLoading(true);
		setError(null);
		// The useEffect will trigger the reload
	}, []);

	return {
		fortifications,
		loading,
		error,
		retry,
		enrichFortification: enrichSingleFortification,
		filters,
		isDataEnriched,
	};
};

export default useGeoJSON;
