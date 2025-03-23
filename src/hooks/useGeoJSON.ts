import { useState, useEffect, useCallback } from 'react';
import {
	FortificationType,
	GeoJSONResponse,
	FilterGroup,
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

				const data: GeoJSONResponse = await response.json();

				if (data && data.features && data.features.length > 0) {
					setFortifications(data.features);
					// Generate filters from the data
					setFilters(generateFilters(data.features));
				} else {
					throw new Error('No features found in GeoJSON data');
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Unknown error loading GeoJSON'),
				);
			} finally {
				setLoading(false);
			}
		};

		loadGeoJSON();
	}, [jsonPath, generateFilters]);

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
