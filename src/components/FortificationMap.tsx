import { useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	useMap,
	Polygon,
	AttributionControl,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useTranslation } from 'react-i18next';
import {
	Icon,
	LatLngExpression,
	LatLngTuple,
	Map as LeafletMap,
} from 'leaflet';
import L from 'leaflet';
import {
	FortificationType,
} from '../types/fortification';

// Import Leaflet styles directly in component
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Create our own custom icon
const fortIcon = new Icon({
	iconUrl: icon,
	iconRetinaUrl: iconRetina,
	shadowUrl: iconShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

// Map resize handler component
const MapResizeHandler = () => {
	const map = useMap();

	useEffect(() => {
		// Function to handle resize and invalidate map size
		const handleResize = () => {
			if (map) {
				map.invalidateSize({ animate: false, pan: false });
			}
		};

		// Sequence of resize operations with increasing delays
		// Cette approche garantit que la carte se redimensionne correctement
		// même si certains éléments du DOM sont encore en cours de rendu
		const resizeSequence = [0, 100, 500, 1000, 2000];

		const timers = resizeSequence.map(delay => setTimeout(handleResize, delay));

		// Add event listener for window resize
		window.addEventListener('resize', handleResize);

		// Add listener for sidebar changes which might affect layout
		const observer = new MutationObserver(handleResize);

		// Observer for the entire app container to catch any layout changes
		const appContainer = document.querySelector('#root');
		if (appContainer) {
			observer.observe(appContainer, {
				attributes: true,
				childList: true,
				subtree: true,
				attributeFilter: ['class', 'style'],
			});
		}

		// Clean up
		return () => {
			timers.forEach(clearTimeout);
			window.removeEventListener('resize', handleResize);
			observer.disconnect();
		};
	}, [map]);

	return null;
};

// Map initialization and ready handler
const MapReadyHandler = () => {
	const map = useMap();

	useEffect(() => {
		// Force immediate resize when map is available
		setTimeout(() => {
			map.invalidateSize();
		}, 0);
	}, [map]);

	return null;
};

// Composant pour forcer le centrage sur la vue mondiale
const CenterMapOnWorld = () => {
	const map = useMap();
	const worldCenter: LatLngTuple = [20, 0]; // Centered near the equator
	const defaultZoom = 3; // Zoomed out to see more of the world

	useEffect(() => {
		// Force le centrage sur la vue mondiale après que la carte soit prête
		// et après plusieurs délais pour s'assurer que cela fonctionne même en cas de chargement lent
		const centerTimers = [0, 500, 1500].map(delay =>
			setTimeout(() => {
				map.setView(worldCenter, defaultZoom, { animate: false });
			}, delay),
		);

		return () => {
			centerTimers.forEach(clearTimeout);
		};
	}, [map]);

	return null;
};

// Composant pour stocker la référence à la carte
const StoreMapReference = ({
	setMapRef,
}: {
	setMapRef: (map: LeafletMap) => void;
}) => {
	const map = useMap();

	useEffect(() => {
		setMapRef(map);
	}, [map, setMapRef]);

	return null;
};

// Debugging component to show data on map
const MapDebugger = ({
	fortifications,
}: {
	fortifications: FortificationType[];
}) => {
	const map = useMap();

	useEffect(() => {
		// Force a map refresh after a short delay
		setTimeout(() => {
			map.invalidateSize();
		}, 100);
	}, [map, fortifications]);

	return null;
};

// Composant pour le bouton "Centrer sur la vue mondiale"
const RecenterButton = () => {
	const { t } = useTranslation();
	const map = useMap();
	const worldCenter: LatLngTuple = [20, 0]; // Centered near the equator
	const defaultZoom = 3; // Zoomed out to see more of the world

	const handleRecenter = useCallback(() => {
		map.flyTo(worldCenter, defaultZoom, {
			animate: true,
			duration: 1.5,
		});
	}, [map]);

	return (
		<div className="leaflet-control-recenter leaflet-bar leaflet-control">
			<button
				onClick={handleRecenter}
				className="recenter-button"
				title={t('map.recenterWorld')}
				aria-label={t('map.recenterWorld')}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			</button>
		</div>
	);
};

// Composant pour les boutons de zoom personnalisés
const CustomZoomControls = () => {
	const map = useMap();

	const handleZoomIn = useCallback(() => {
		map.zoomIn(1);
	}, [map]);

	const handleZoomOut = useCallback(() => {
		map.zoomOut(1);
	}, [map]);

	return (
		<div className="leaflet-control-zoom leaflet-bar leaflet-control">
			<button
				className="leaflet-control-zoom-in"
				title="Zoom in"
				role="button"
				aria-label="Zoom in"
				onClick={handleZoomIn}
			>
				+
			</button>
			<button
				className="leaflet-control-zoom-out"
				title="Zoom out"
				role="button"
				aria-label="Zoom out"
				onClick={handleZoomOut}
			>
				−
			</button>
		</div>
	);
};

// Composant pour regrouper les contrôles de la carte
const MapControls = () => {
	return (
		<div
			className="leaflet-top leaflet-right"
			style={{ zIndex: 1000, marginTop: '0.5rem', marginRight: '0.5rem' }}
		>
			<div className="flex flex-col space-y-2">
				<RecenterButton />
				<CustomZoomControls />
			</div>
		</div>
	);
};

interface FortificationMapProps {
	fortifications: FortificationType[];
	activeFilters: Record<string, string | null>;
	searchTerm: string;
	onEnrichFortification?: (fortId: string) => void;
}

// Helper function to find center of a polygon
const getPolygonCenter = (coordinates: number[][][]): LatLngTuple => {
	// For simplicity, use the first point of the first ring
	if (coordinates && coordinates.length > 0 && coordinates[0].length > 0) {
		return [coordinates[0][0][1], coordinates[0][0][0]];
	}
	// Default to center of world if we can't determine center
	return [20, 0];
};

const FortificationMap: React.FC<FortificationMapProps> = ({
	fortifications,
	activeFilters,
	searchTerm,
}) => {
	const { t } = useTranslation();
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<LeafletMap | null>(null);

	// Center of the world (near the equator)
	const defaultCenter: LatLngExpression = [20, 0];
	const defaultZoom = 3;

	// Fonction pour normaliser le texte (retirer les accents)
	const normalizeText = (text: string): string => {
		return text
			.normalize('NFD') // Décompose les caractères accentués
			.replace(/[\u0300-\u036f]/g, '') // Supprime les marques diacritiques
			.toLowerCase()
			.trim();
	};

	// Fonction pour stocker la référence à la carte
	const setMapRef = useCallback((map: LeafletMap) => {
		mapRef.current = map;
	}, []);

	// Update the filter function for fortifications
	const filteredFortifications = useMemo(() => {
		if (!searchTerm && Object.keys(activeFilters).length === 0) {
			// Even with no filters, exclude unnamed structures
			return fortifications.filter(fort => {
				const name = fort.properties.name || fort.properties.chpdeno || '';
				return name.trim() !== '';
			});
		}

		return fortifications.filter(fort => {
			// Filter out structures without names first
			const name = fort.properties.name || fort.properties.chpdeno || '';
			if (name.trim() === '') {
				return false;
			}

			// Search filter
			if (searchTerm) {
				const address =
					fort.properties.chpadrs || fort.properties.chplieu || '';
				const normalizedName = normalizeText(name);
				const normalizedAddress = normalizeText(address);
				const normalizedSearch = normalizeText(searchTerm);

				// If the fort doesn't match the search term, filter it out
				if (
					!normalizedName.includes(normalizedSearch) &&
					!normalizedAddress.includes(normalizedSearch)
				) {
					return false;
				}
			}

			// Type filter
			if (activeFilters.type) {
				const fortType = fort.properties.chptico || fort.properties.historic;
				if (fortType !== activeFilters.type) {
					return false;
				}
			}

			// Period filter
			if (
				activeFilters.period &&
				fort.properties.period !== activeFilters.period
			) {
				return false;
			}

			// Region filter
			if (
				activeFilters.region &&
				fort.properties.chpreg !== activeFilters.region
			) {
				return false;
			}

			// If we've made it here, the fort passes all filters
			return true;
		});
	}, [fortifications, activeFilters, searchTerm, normalizeText]);

	// Force map refresh when component mounts and on any prop changes
	useEffect(() => {
		// Force window resize event to trigger map recalculation
		const triggerResize = () => {
			window.dispatchEvent(new Event('resize'));
		};

		// Multiple attempts with increasing delays
		const resizeTriggers = [100, 500, 1000].map(delay =>
			setTimeout(triggerResize, delay),
		);

		return () => {
			resizeTriggers.forEach(clearTimeout);
		};
	}, [fortifications, activeFilters, searchTerm]);

	// Fonction pour gérer le double-clic sur un marqueur
	const handleMarkerDoubleClick = (coordinates: LatLngExpression) => {
		// Utiliser la référence à la carte stockée lors de la création
		if (mapRef.current) {
			mapRef.current.flyTo(coordinates, 20, {
				animate: true,
				duration: 1, // durée en secondes
			});
		}
	};

	// Function to search for a fortification on Google
	const openGoogleSearch = (fort: FortificationType) => {
		// Get coordinates if available
		let coordinates = '';
		if (fort.geometry && fort.geometry.type === 'Point') {
			coordinates = `${fort.geometry.coordinates[1].toFixed(
				6,
			)}, ${fort.geometry.coordinates[0].toFixed(6)}`;
		} else if (
			fort.geometry &&
			fort.geometry.type === 'Polygon' &&
			fort.geometry.coordinates[0].length > 0
		) {
			const center = getPolygonCenter(fort.geometry.coordinates);
			coordinates = `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`;
		}

		// Get the name or a reasonable identifier for the structure
		const nameElements = [
			fort.properties.name,
			fort.properties.alt_name,
			fort.properties.wikipedia?.split(':').slice(1).join(':'),
			fort.properties.denomination,
			fort.properties.chpnom,
		].filter(Boolean);

		// Combine with available type information
		const typeInfo =
			fort.properties.display_type ||
			fort.properties.historic ||
			fort.properties.building ||
			fort.properties.military ||
			'';

		// Build search query with name, type, and coordinates for precision
		const searchTerm =
			nameElements.length > 0
				? `${nameElements[0]} ${typeInfo}`.trim()
				: typeInfo;

		// Create search URL with name, type, and coordinates
		const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
			searchTerm + (coordinates ? ` ${coordinates}` : ''),
		)}`;

		// Open in a new tab
		window.open(searchUrl, '_blank', 'noopener,noreferrer');
	};

	const renderFeature = (fort: FortificationType, index: number) => {
		if (!fort.geometry) {
			return null;
		}

		// For Point geometries
		if (fort.geometry.type === 'Point') {
			const coordinates: LatLngExpression = [
				fort.geometry.coordinates[1],
				fort.geometry.coordinates[0],
			];

			// Generate a truly unique key using index and coordinates
			const markerKey = `point-${fort.id || index}-${coordinates[0]}-${
				coordinates[1]
			}`;

			return (
				<Marker
					key={markerKey}
					position={coordinates}
					icon={fortIcon}
					eventHandlers={{
						dblclick: () => handleMarkerDoubleClick(coordinates),
					}}
				>
					<Popup>{renderPopupContent(fort)}</Popup>
				</Marker>
			);
		}

		// For Polygon geometries
		else if (fort.geometry.type === 'Polygon') {
			// Convert coordinates to Leaflet format
			const polygonCoords = fort.geometry.coordinates[0].map(
				coord => [coord[1], coord[0]] as LatLngTuple,
			);

			// Find center point for popup
			const center = getPolygonCenter(fort.geometry.coordinates);

			// Generate unique keys using id or index plus coordinates
			const polygonKey = `polygon-${fort.id || index}-${center[0]}-${
				center[1]
			}`;
			const markerKey = `marker-${fort.id || index}-${center[0]}-${center[1]}`;

			return (
				<>
					<Polygon
						key={polygonKey}
						positions={polygonCoords}
						pathOptions={{ color: 'blue', weight: 2 }}
						eventHandlers={{
							dblclick: () => handleMarkerDoubleClick(center),
						}}
					>
						<Popup position={center}>{renderPopupContent(fort)}</Popup>
					</Polygon>
					<Marker
						key={markerKey}
						position={center}
						icon={fortIcon}
						eventHandlers={{
							dblclick: () => handleMarkerDoubleClick(center),
						}}
					>
						<Popup>{renderPopupContent(fort)}</Popup>
					</Marker>
				</>
			);
		}

		// For other geometry types - fix type error by ensuring 'type' is validated
		else if (
			fort.geometry &&
			typeof fort.geometry === 'object' &&
			'type' in fort.geometry
		) {
			return null;
		} else {
			return null;
		}
	};

	const renderPopupContent = (fort: FortificationType) => {
		const properties = fort.properties;
		const name = properties.name || t('map.unknownFortification');

		// Use display_type if available, otherwise fall back to other type fields
		const type =
			properties.display_type ||
			properties.historic ||
			properties.chptico ||
			properties.building ||
			t('map.notSpecified');
		const address = properties.chpadrs || properties.chplieu || '';
		const region = properties.chpreg || '';

		// Enhanced data
		const description = properties.description || properties.chphist || '';
		const period = properties.period || properties.chpdate || '';
		const constructionStyle = properties.constructionStyle || '';
		const externalLinks = properties.externalLinks || [];

		// Extract all OSM tags for detailed display
		// Common tags that most users would find informative
		const commonTags = [
			{ key: 'name', label: 'Name' },
			{ key: 'alt_name', label: 'Alternative Name' },
			{ key: 'historic', label: 'Historic Type' },
			{ key: 'building', label: 'Building Type' },
			{ key: 'military', label: 'Military Type' },
			{ key: 'tourism', label: 'Tourism' },
			{ key: 'architect', label: 'Architect' },
			{ key: 'height', label: 'Height' },
			{ key: 'start_date', label: 'Built Date' },
			{ key: 'year_built', label: 'Year Built' },
			{ key: 'operator', label: 'Operator' },
			{ key: 'opening_hours', label: 'Opening Hours' },
			{ key: 'phone', label: 'Phone' },
			{ key: 'website', label: 'Website' },
			{ key: 'wikipedia', label: 'Wikipedia' },
			{ key: 'wikidata', label: 'Wikidata' },
		];

		// Extract all relevant details
		const details: Array<{ label: string; value: string }> = [];

		// Add common tags that are present
		commonTags.forEach(tag => {
			if (
				properties[tag.key] &&
				!['name', 'historic', 'building'].includes(tag.key)
			) {
				// Format Wikipedia links
				if (tag.key === 'wikipedia' && properties[tag.key]) {
					const parts = properties[tag.key]?.split(':') || [];
					if (parts.length >= 2) {
						const lang = parts[0];
						const article = parts.slice(1).join(':');
						details.push({
							label: tag.label,
							value: `<a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
								article,
							)}" 
							        target="_blank" rel="noopener noreferrer" 
							        class="text-blue-600 dark:text-blue-400 hover:underline">
							        ${properties[tag.key]}</a>`,
						});
					} else {
						details.push({
							label: tag.label,
							value: properties[tag.key] || '',
						});
					}
				}
				// Format Wikidata links
				else if (tag.key === 'wikidata' && properties[tag.key]) {
					details.push({
						label: tag.label,
						value: `<a href="https://www.wikidata.org/wiki/${encodeURIComponent(
							properties[tag.key] || '',
						)}" 
						        target="_blank" rel="noopener noreferrer" 
						        class="text-blue-600 dark:text-blue-400 hover:underline">
						        ${properties[tag.key]}</a>`,
					});
				}
				// Format website links
				else if (tag.key === 'website' && properties[tag.key]) {
					details.push({
						label: tag.label,
						value: `<a href="${properties[tag.key]}" 
						        target="_blank" rel="noopener noreferrer" 
						        class="text-blue-600 dark:text-blue-400 hover:underline">
						        ${properties[tag.key]}</a>`,
					});
				}
				// Regular values
				else {
					details.push({ label: tag.label, value: properties[tag.key] });
				}
			}
		});

		// Get coordinates for display
		let coordinatesText = '';
		if (fort.geometry && fort.geometry.type === 'Point') {
			coordinatesText = `${fort.geometry.coordinates[1].toFixed(
				6,
			)}, ${fort.geometry.coordinates[0].toFixed(6)}`;
		} else if (
			fort.geometry &&
			fort.geometry.type === 'Polygon' &&
			fort.geometry.coordinates[0].length > 0
		) {
			const center = getPolygonCenter(fort.geometry.coordinates);
			coordinatesText = `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`;
		}

		if (coordinatesText) {
			details.push({ label: 'Coordinates', value: coordinatesText });
		}

		// Function to handle image search on Google
		const handleGoogleImageSearch = (
			e: React.MouseEvent<HTMLButtonElement>,
		) => {
			e.stopPropagation();

			// Get coordinates with higher precision
			let coordinates = '';
			if (fort.geometry && fort.geometry.type === 'Point') {
				coordinates = `${fort.geometry.coordinates[1].toFixed(
					6,
				)}, ${fort.geometry.coordinates[0].toFixed(6)}`;
			} else if (
				fort.geometry &&
				fort.geometry.type === 'Polygon' &&
				fort.geometry.coordinates[0].length > 0
			) {
				const center = getPolygonCenter(fort.geometry.coordinates);
				coordinates = `${center[0].toFixed(6)}, ${center[1].toFixed(6)}`;
			}

			// Get the most accurate name and type information
			const nameElements = [
				properties.name,
				properties.alt_name,
				properties.wikipedia?.split(':').slice(1).join(':'),
				properties.denomination,
				properties.chpnom,
			].filter(Boolean);

			// Include specific type information if available
			const typeInfo =
				properties.display_type ||
				properties.historic ||
				properties.building ||
				properties.military ||
				'';

			// Prioritize exact name with type for better image results
			const searchTerm =
				nameElements.length > 0
					? `${nameElements[0]} ${typeInfo}`.trim()
					: typeInfo;

			// Create search URL with name, type, and coordinates
			const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
				searchTerm + (coordinates ? ` ${coordinates}` : ''),
			)}&tbm=isch`;

			// Open in a new tab
			window.open(searchUrl, '_blank', 'noopener,noreferrer');
		};

		return (
			<div
				className="popup-content max-w-sm overflow-y-auto"
				style={{ maxHeight: '60vh' }}
			>
				<h3 className="text-lg font-semibold mb-2">{name}</h3>

				{/* Primary Type */}
				<div className="inline-block px-2 py-1 mb-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-md text-sm font-medium">
					{type}
				</div>

				{/* Replace image gallery with quick links */}
				<div className="mb-3 flex flex-col gap-2">
					<button
						onClick={handleGoogleImageSearch}
						className="w-full py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-md text-sm font-medium flex items-center justify-center"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						{t('fortification.viewImages')}
					</button>
				</div>

				{/* Enhanced Details Section */}
				{details.length > 0 && (
					<div className="mb-3">
						<h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
							{t('map.details')}
						</h4>
						<div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-sm">
							{details.map((detail, index) => (
								<Fragment key={`detail-${index}`}>
									<div className="font-medium">{detail.label}:</div>
									<div dangerouslySetInnerHTML={{ __html: detail.value }}></div>
								</Fragment>
							))}
						</div>
					</div>
				)}

				{/* Basic Info - only show if not already in details */}
				<div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-sm">
					{type && !details.some(d => d.value === type) && (
						<>
							<div className="font-medium">{t('map.type')}:</div>
							<div>{type}</div>
						</>
					)}

					{period && !details.some(d => d.value === period) && (
						<>
							<div className="font-medium">{t('map.period')}:</div>
							<div>{period}</div>
						</>
					)}

					{constructionStyle &&
						!details.some(d => d.value === constructionStyle) && (
							<>
								<div className="font-medium">{t('map.style')}:</div>
								<div>{constructionStyle}</div>
							</>
						)}

					{/* Only show address if it's not empty and not already in details */}
					{address && !details.some(d => d.value === address) && (
						<>
							<div className="font-medium">{t('map.address')}:</div>
							<div>{address}</div>
						</>
					)}

					{/* Only show region if it's not empty and not already in details */}
					{region && !details.some(d => d.value === region) && (
						<>
							<div className="font-medium">{t('map.region')}:</div>
							<div>{region}</div>
						</>
					)}
				</div>

				{/* Description */}
				{description && (
					<div className="mb-3">
						<h4 className="font-medium mb-1">{t('map.description')}:</h4>
						<p className="text-sm text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto">
							{description.length > 300
								? `${description.substring(0, 300)}...`
								: description}
						</p>
					</div>
				)}

				{/* External links */}
				{externalLinks.length > 0 && (
					<div className="mb-3">
						<h4 className="font-medium mb-1">{t('map.externalLinks')}:</h4>
						<div className="flex flex-wrap gap-2">
							{externalLinks.map((link, idx) => (
								<a
									key={idx}
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
								>
									{link.title}
								</a>
							))}
						</div>
					</div>
				)}

				{/* If data has been enriched, show when */}
				{properties.lastFetched && (
					<div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
						{t('map.dataUpdated', {
							date: new Date(properties.lastFetched).toLocaleDateString(),
						})}
					</div>
				)}

				{/* Add near the end of the popup content */}
				<div className="mt-4 flex flex-wrap gap-2">
					{fort.properties.externalLinks &&
						fort.properties.externalLinks.length > 0 &&
						fort.properties.externalLinks.map((link, i) => (
							<a
								key={`link-${i}`}
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded 
										  bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
							>
								{link.title}
							</a>
						))}

					<button
						onClick={e => {
							e.stopPropagation();
							openGoogleSearch(fort);
						}}
						className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded 
								  bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-1"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
							/>
						</svg>
						{t('fortification.searchMore')}
					</button>
				</div>
			</div>
		);
	};

	return (
		<div
			className="h-full w-full relative flex-1"
			style={{ height: '100%', width: '100%', position: 'relative' }}
			ref={mapContainerRef}
		>
			<MapContainer
				center={defaultCenter}
				zoom={defaultZoom}
				scrollWheelZoom={true}
				style={{
					height: '100%',
					width: '100%',
					position: 'absolute',
					top: 0,
					left: 0,
					zIndex: 1,
				}}
				zoomControl={false}
				attributionControl={false}
				className="leaflet-map-container"
				doubleClickZoom={false}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>

				<MapResizeHandler />
				<MapReadyHandler />
				<CenterMapOnWorld />
				<StoreMapReference setMapRef={setMapRef} />
				<MapDebugger fortifications={filteredFortifications} />
				<MapControls />

				<AttributionControl position="bottomleft" />

				<MapDebugger fortifications={filteredFortifications} />

				{searchTerm && (
					<div className="bg-white p-2 rounded shadow z-[1000] absolute top-2 right-2 max-w-xs">
						<div className="text-sm font-medium">
							{t('map.searchingFor')}:{' '}
							<span className="font-bold">{searchTerm}</span>
						</div>
						<div className="text-xs">
							{filteredFortifications.length} {t('map.resultsFound')}
							{filteredFortifications.length > 0 &&
								filteredFortifications.length <= 3 && (
									<div className="mt-1 text-xs text-gray-600">
										{filteredFortifications.map((fort, index) => (
											<div key={index} className="truncate">
												•{' '}
												{fort.properties.name ||
													fort.properties.chpdeno ||
													t('map.unknownFortification')}
											</div>
										))}
									</div>
								)}
						</div>
						<div className="text-xs text-gray-500 mt-1 italic">
							{t('map.ignoresAccents')}
						</div>
					</div>
				)}

				<MarkerClusterGroup
					key={`cluster-${searchTerm}-${JSON.stringify(activeFilters)}`}
					chunkedLoading={true}
					disableClusteringAtZoom={13}
					spiderfyOnMaxZoom={true}
					showCoverageOnHover={false}
					removeOutsideVisibleBounds={true}
					maxClusterRadius={50}
					// @ts-ignore - Le type MarkerCluster n'est pas exporté correctement
					iconCreateFunction={(cluster: any) => {
						// Personnaliser l'icône de cluster pour un meilleur affichage sur mobile
						const count = cluster.getChildCount();
						const size = count < 10 ? 30 : count < 100 ? 40 : 50;
						const className = `marker-cluster-custom marker-cluster-${
							count < 10 ? 'small' : count < 100 ? 'medium' : 'large'
						}`;

						// On utilise une fonction pour créer un div HTML personnalisé
						return L.divIcon({
							html: `<div style="width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; background-color: rgba(49, 130, 206, 0.8); border-radius: 50%; color: white; font-weight: bold; box-shadow: 0 0 0 3px white;">${count}</div>`,
							className: className,
							iconSize: L.point(size, size),
						});
					}}
				>
					{filteredFortifications.length > 0 ? (
						filteredFortifications.map((fort, index) =>
							renderFeature(fort, index),
						)
					) : (
						<div className="bg-white p-2 rounded shadow z-[1000] absolute top-2 left-2">
							{t('map.noFortificationsFound')}
						</div>
					)}
				</MarkerClusterGroup>
			</MapContainer>
		</div>
	);
};

export default FortificationMap;
