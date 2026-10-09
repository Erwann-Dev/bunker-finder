import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { CATEGORIES, CATEGORY_IDS, FLAG_RUINS, type CategoryId } from '../data/categories';
import type { Fort, LatLon, MapViewState } from '../lib/types';

export type BaseLayerId = 'plan' | 'canvas' | 'satellite' | 'topo';

interface LayerDef {
	url: string;
	attribution: string;
	subdomains?: string;
	maxNativeZoom: number;
	overlay?: string;
	className?: string;
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

function layerDef(id: BaseLayerId, dark: boolean): LayerDef {
	const osm = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
	switch (id) {
		case 'canvas':
			return {
				url: `${ESRI}/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
				overlay: `${ESRI}/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
				attribution: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap',
				maxNativeZoom: 16,
			};
		case 'satellite':
			return {
				url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
				overlay: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
				attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
				maxNativeZoom: 19,
			};
		case 'topo':
			return {
				url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
				subdomains: 'abc',
				attribution: `${osm}, © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
				maxNativeZoom: 17,
				className: 'tiles-topo',
			};
		default:
			// OSM's standard style, toned down (and inverted in dark mode) via CSS.
			return {
				url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
				attribution: osm,
				maxNativeZoom: 19,
				className: 'tiles-plan',
			};
	}
}

const CLUSTER_MAX_ZOOM = 15;

type PointProps = { i: number; c: number };
type ClusterProps = Record<string, number>;

const escapeHtml = (s: string) =>
	s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const glyph = (cat: CategoryId) =>
	`<svg viewBox="0 0 24 24"><path d="${CATEGORIES[cat].icon}" fill="#fff" fill-rule="evenodd"/></svg>`;

const iconCache = new Map<string, L.DivIcon>();
function pointIcon(cat: CategoryId, ruin: boolean): L.DivIcon {
	const key = `${cat}${ruin ? 'r' : ''}`;
	let icon = iconCache.get(key);
	if (!icon) {
		icon = L.divIcon({
			className: 'fm-icon',
			html: `<div class="fm${ruin ? ' ruin' : ''}" style="background:${CATEGORIES[cat].color}">${glyph(cat)}</div>`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
		});
		iconCache.set(key, icon);
	}
	return icon;
}

function clusterIcon(props: ClusterProps, count: number): L.DivIcon {
	const size = count < 10 ? 34 : count < 100 ? 40 : count < 1000 ? 48 : 56;
	let acc = 0;
	const stops: string[] = [];
	CATEGORY_IDS.forEach((cat, i) => {
		const n = props[`c${i}`] ?? 0;
		if (!n) return;
		const from = (acc / count) * 360;
		acc += n;
		const to = (acc / count) * 360;
		stops.push(`${CATEGORIES[cat].color} ${from.toFixed(1)}deg ${to.toFixed(1)}deg`);
	});
	const label =
		count >= 10000
			? `${Math.round(count / 1000)}k`
			: count >= 1000
				? `${(count / 1000).toFixed(1)}k`
				: String(count);
	return L.divIcon({
		className: 'fm-icon',
		html: `<div class="fc" style="background:conic-gradient(${stops.join(',')})"><span>${label}</span></div>`,
		iconSize: [size, size],
		iconAnchor: [size / 2, size / 2],
	});
}

function highlightIcon(fort: Fort, hover: boolean): L.DivIcon {
	return L.divIcon({
		className: `fm-icon ${hover ? 'fm-hover' : 'fm-highlight'}`,
		html: `${hover ? '' : '<div class="ring"></div>'}<div class="fm${fort.flags & FLAG_RUINS ? ' ruin' : ''}" style="background:${CATEGORIES[fort.cat].color}">${glyph(fort.cat)}</div>`,
		iconSize: [28, 28],
		iconAnchor: [14, 14],
	});
}

export interface MapHandle {
	flyTo: (lat: number, lon: number, zoom?: number) => void;
	fitBounds: (south: number, west: number, north: number, east: number) => void;
	zoomBy: (delta: number) => void;
	resetView: () => void;
	invalidate: () => void;
}

interface MapViewProps {
	forts: Fort[];
	visible: Fort[];
	selected: Fort | null;
	hovered: Fort | null;
	outline: [number, number][][] | null;
	userLocation: LatLon | null;
	layer: BaseLayerId;
	isDark: boolean;
	initialView: { lat: number; lon: number; zoom: number } | null;
	/** Screen space covered by panels, so flyTo centres in the visible area. */
	padding: { left: number; bottom: number };
	labelFor: (fort: Fort) => { title: string; subtitle: string };
	onSelect: (fort: Fort) => void;
	onViewChange: (view: MapViewState) => void;
	samePlaceLabel: (count: number) => string;
}

const MapView = forwardRef<MapHandle, MapViewProps>(function MapView(props, ref) {
	const { visible, selected, hovered, outline, userLocation, layer, isDark, padding } = props;
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<L.Map | null>(null);
	const layersRef = useRef<{
		markers: L.LayerGroup;
		highlight: L.LayerGroup;
		outline: L.LayerGroup;
		user: L.LayerGroup;
	} | null>(null);
	const markerCache = useRef(new Map<string, L.Marker>());
	const renderRef = useRef<() => void>(() => {});
	// Keep the latest props reachable from Leaflet event handlers.
	const propsRef = useRef(props);
	propsRef.current = props;

	// ------------------------------------------------------------ init
	useEffect(() => {
		const el = containerRef.current!;
		const initial = propsRef.current.initialView;
		const map = L.map(el, {
			zoomControl: false,
			worldCopyJump: true,
			minZoom: 2,
			maxZoom: 19,
			zoomSnap: 0.5,
			wheelPxPerZoomLevel: 90,
			preferCanvas: true,
		});
		map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
		if (initial) map.setView([initial.lat, initial.lon], initial.zoom);
		else map.setView([46.5, 6], window.innerWidth < 768 ? 4 : 5);

		layersRef.current = {
			outline: L.layerGroup().addTo(map),
			markers: L.layerGroup().addTo(map),
			highlight: L.layerGroup().addTo(map),
			user: L.layerGroup().addTo(map),
		};

		const emit = () => {
			const b = map.getBounds();
			const c = map.getCenter();
			propsRef.current.onViewChange({
				south: b.getSouth(),
				west: b.getWest(),
				north: b.getNorth(),
				east: b.getEast(),
				centerLat: c.lat,
				centerLon: c.lng,
				zoom: map.getZoom(),
			});
		};
		map.on('moveend', () => {
			renderRef.current();
			emit();
		});
		mapRef.current = map;
		emit();

		const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
		ro.observe(el);
		const markers = markerCache.current;
		return () => {
			ro.disconnect();
			map.remove();
			mapRef.current = null;
			markers.clear();
		};
	}, []);

	// ------------------------------------------------------- base layer
	useEffect(() => {
		const map = mapRef.current;
		if (!map) return;
		const def = layerDef(layer, isDark);
		const opts: L.TileLayerOptions = {
			attribution: def.attribution,
			maxNativeZoom: def.maxNativeZoom,
			maxZoom: 19,
			detectRetina: false,
			crossOrigin: true,
		};
		if (def.subdomains) opts.subdomains = def.subdomains;
		if (def.className) opts.className = def.className;
		const base = L.tileLayer(def.url, opts).addTo(map);
		base.bringToBack();
		const overlay = def.overlay
			? L.tileLayer(def.overlay, { maxNativeZoom: def.maxNativeZoom, maxZoom: 19 }).addTo(map)
			: null;
		return () => {
			base.remove();
			overlay?.remove();
		};
	}, [layer, isDark]);

	// --------------------------------------------------------- clusters
	const index = useMemo(() => {
		const sc = new Supercluster<PointProps, ClusterProps>({
			radius: 60,
			extent: 256,
			maxZoom: CLUSTER_MAX_ZOOM,
			minPoints: 3,
			map: p => {
				const o: ClusterProps = {};
				for (let i = 0; i < CATEGORY_IDS.length; i++) o[`c${i}`] = p.c === i ? 1 : 0;
				return o;
			},
			reduce: (acc, p) => {
				for (let i = 0; i < CATEGORY_IDS.length; i++) acc[`c${i}`] += p[`c${i}`];
			},
		});
		sc.load(
			visible.map(f => ({
				type: 'Feature' as const,
				properties: { i: f.idx, c: CATEGORY_IDS.indexOf(f.cat) },
				geometry: { type: 'Point' as const, coordinates: [f.lon, f.lat] },
			})),
		);
		return sc;
	}, [visible]);

	useEffect(() => {
		const render = () => {
			const map = mapRef.current;
			const layers = layersRef.current;
			if (!map || !layers) return;
			const b = map.getBounds().pad(0.3);
			let west = b.getWest();
			let east = b.getEast();
			if (east - west >= 360) {
				west = -180;
				east = 180;
			} else {
				west = ((((west + 180) % 360) + 360) % 360) - 180;
				east = ((((east + 180) % 360) + 360) % 360) - 180;
			}
			const zoom = Math.floor(map.getZoom());
			const items = index.getClusters(
				[west, Math.max(-85, b.getSouth()), east, Math.min(85, b.getNorth())],
				zoom,
			);
			const cache = markerCache.current;
			const next = new Set<string>();
			for (const item of items) {
				const [lon, lat] = item.geometry.coordinates;
				const p = item.properties as PointProps &
					ClusterProps & { cluster?: boolean; cluster_id?: number; point_count?: number };
				if (p.cluster) {
					const key = `c${p.cluster_id}`;
					next.add(key);
					if (cache.has(key)) continue;
					const count = p.point_count!;
					const clusterId = p.cluster_id!;
					const marker = L.marker([lat, lon], { icon: clusterIcon(p, count), keyboard: false });
					marker.on('click', () => {
						const expansion = index.getClusterExpansionZoom(clusterId);
						if (map.getZoom() >= CLUSTER_MAX_ZOOM || expansion > CLUSTER_MAX_ZOOM + 2) {
							// Same spot: list the fortifications instead of zooming forever.
							const leaves = index.getLeaves(clusterId, 50);
							const div = document.createElement('div');
							div.className = 'cluster-list max-h-64 overflow-auto';
							const h = document.createElement('div');
							h.className = 'px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-500';
							h.textContent = propsRef.current.samePlaceLabel(count);
							div.appendChild(h);
							for (const leaf of leaves) {
								const fort = propsRef.current.forts[leaf.properties.i];
								const btn = document.createElement('button');
								btn.innerHTML = `<i style="background:${CATEGORIES[fort.cat].color}"></i><span>${escapeHtml(propsRef.current.labelFor(fort).title)}</span>`;
								btn.onclick = () => {
									map.closePopup();
									propsRef.current.onSelect(fort);
								};
								div.appendChild(btn);
							}
							L.popup({ maxWidth: 280, minWidth: 220 }).setLatLng([lat, lon]).setContent(div).openOn(map);
						} else {
							map.flyTo([lat, lon], Math.min(expansion, 18), { duration: 0.6 });
						}
					});
					cache.set(key, marker);
					layers.markers.addLayer(marker);
				} else {
					const key = `p${p.i}`;
					next.add(key);
					if (cache.has(key)) continue;
					const fort = propsRef.current.forts[p.i];
					const marker = L.marker([lat, lon], {
						icon: pointIcon(fort.cat, Boolean(fort.flags & FLAG_RUINS)),
						keyboard: false,
						riseOnHover: true,
					});
					const label = propsRef.current.labelFor(fort);
					marker.bindTooltip(`${escapeHtml(label.title)}<small>${escapeHtml(label.subtitle)}</small>`, {
						direction: 'top',
						offset: [0, -14],
						className: 'fm-tooltip',
						opacity: 1,
					});
					marker.on('click', () => propsRef.current.onSelect(fort));
					cache.set(key, marker);
					layers.markers.addLayer(marker);
				}
			}
			for (const [key, marker] of cache) {
				if (!next.has(key)) {
					layers.markers.removeLayer(marker);
					cache.delete(key);
				}
			}
		};

		// The index changed: start from a clean slate.
		layersRef.current?.markers.clearLayers();
		markerCache.current.clear();
		renderRef.current = render;
		render();
	}, [index, props.labelFor]);

	// -------------------------------------------------------- highlight
	useEffect(() => {
		const layers = layersRef.current;
		if (!layers) return;
		layers.highlight.clearLayers();
		if (hovered && hovered !== selected) {
			L.marker([hovered.lat, hovered.lon], {
				icon: highlightIcon(hovered, true),
				interactive: false,
				zIndexOffset: 900,
			}).addTo(layers.highlight);
		}
		if (selected) {
			L.marker([selected.lat, selected.lon], {
				icon: highlightIcon(selected, false),
				interactive: false,
				zIndexOffset: 1000,
			}).addTo(layers.highlight);
		}
	}, [selected, hovered]);

	useEffect(() => {
		const layers = layersRef.current;
		if (!layers) return;
		layers.outline.clearLayers();
		if (!outline) return;
		const style = {
			color: '#d26a2b',
			weight: 3,
			opacity: 0.95,
			fillColor: '#d26a2b',
			fillOpacity: 0.15,
			interactive: false,
		};
		for (const shape of outline) {
			const closed =
				shape.length > 3 &&
				shape[0][0] === shape[shape.length - 1][0] &&
				shape[0][1] === shape[shape.length - 1][1];
			(closed ? L.polygon(shape, style) : L.polyline(shape, style)).addTo(layers.outline);
		}
	}, [outline]);

	useEffect(() => {
		const layers = layersRef.current;
		if (!layers) return;
		layers.user.clearLayers();
		if (userLocation) {
			L.marker([userLocation.lat, userLocation.lon], {
				icon: L.divIcon({
					className: 'fm-icon',
					html: '<div class="user-dot"></div>',
					iconSize: [18, 18],
					iconAnchor: [9, 9],
				}),
				interactive: false,
				zIndexOffset: 800,
			}).addTo(layers.user);
		}
	}, [userLocation]);

	// ------------------------------------------------------- imperative
	const paddingRef = useRef(padding);
	paddingRef.current = padding;

	useImperativeHandle(
		ref,
		() => ({
			flyTo(lat, lon, zoom) {
				const map = mapRef.current;
				if (!map) return;
				const z = zoom ?? Math.max(map.getZoom(), 15);
				const { left, bottom } = paddingRef.current;
				const point = map.project([lat, lon], z).subtract([left / 2, -bottom / 2]);
				const target = map.unproject(point, z);
				const far = map.getCenter().distanceTo(target) > 2_000_000;
				if (far) map.setView(target, z, { animate: false });
				else map.flyTo(target, z, { duration: 1 });
			},
			fitBounds(south, west, north, east) {
				const { left, bottom } = paddingRef.current;
				mapRef.current?.flyToBounds(
					[
						[south, west],
						[north, east],
					],
					{
						paddingTopLeft: [left + 24, 24],
						paddingBottomRight: [24, bottom + 24],
						maxZoom: 16,
						duration: 1,
					},
				);
			},
			zoomBy(delta) {
				const map = mapRef.current;
				if (map) map.setZoom(map.getZoom() + delta);
			},
			resetView() {
				mapRef.current?.flyTo([35, 10], 3, { duration: 1.2 });
			},
			invalidate() {
				mapRef.current?.invalidateSize();
			},
		}),
		[],
	);

	return <div ref={containerRef} className="absolute inset-0 z-0" />;
});

export default MapView;
