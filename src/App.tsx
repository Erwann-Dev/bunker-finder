import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BottomSheet, { type SheetState } from './components/BottomSheet';
import { CategoryChips, FilterPanel } from './components/Filters';
import FortDetail from './components/FortDetail';
import FortList from './components/FortList';
import { ChevronLeft, ChevronRight, ListIcon, StarIcon } from './components/icons';
import MapControls from './components/MapControls';
import MapView, { type BaseLayerId, type MapHandle } from './components/MapView';
import SearchBox, { type Place } from './components/SearchBox';
import { AboutDialog, Brand, SettingsButtons } from './components/Settings';
import { CATEGORY_IDS, FLAG_WIKI, type CategoryId } from './data/categories';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useTheme } from './hooks/useTheme';
import { loadDataset } from './lib/data';
import { matchesFilters, parseQuery, searchForts, sortForts, type ScoredFort } from './lib/search';
import { countryName, formatNumber } from './lib/text';
import {
	DEFAULT_FILTERS,
	type Dataset,
	type Filters,
	type Fort,
	type LatLon,
	type MapViewState,
	type SortMode,
} from './lib/types';
import { readUrlState, writeUrlState } from './lib/urlState';

const PANEL_WIDTH = 400;
const MOBILE_TOP = 116; // search bar + category chips
const PEEK = 84;

type LoadState =
	{ status: 'loading'; progress: number | null } | { status: 'error'; message: string } | { status: 'ready' };

export default function App() {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const theme = useTheme();
	const isMobile = useMediaQuery('(max-width: 767px)');
	const initialUrl = useRef(readUrlState());

	// ---------------------------------------------------------------- data
	const [data, setData] = useState<Dataset | null>(null);
	const [load, setLoad] = useState<LoadState>({ status: 'loading', progress: null });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setLoad({ status: 'loading', progress: null });
		loadDataset(progress => !cancelled && setLoad({ status: 'loading', progress }))
			.then(ds => {
				if (cancelled) return;
				setData(ds);
				setLoad({ status: 'ready' });
			})
			.catch(err => !cancelled && setLoad({ status: 'error', message: String(err?.message ?? err) }));
		return () => {
			cancelled = true;
		};
	}, [attempt]);

	const forts = useMemo(() => data?.forts ?? [], [data]);

	// --------------------------------------------------------------- state
	const [storedFilters, setFilters] = useLocalStorage<Filters>('bf-filters', DEFAULT_FILTERS);
	const filters = useMemo(() => ({ ...DEFAULT_FILTERS, ...storedFilters }), [storedFilters]);
	const [query, setQuery] = useState('');
	const deferredQuery = useDeferredValue(query);
	const [selectedId, setSelectedId] = useState<string | null>(initialUrl.current.fortId);
	const [history, setHistory] = useState<string[]>([]);
	const [hovered, setHovered] = useState<Fort | null>(null);
	const [outline, setOutline] = useState<[number, number][][] | null>(null);
	const [view, setView] = useState<MapViewState | null>(null);
	const [userLocation, setUserLocation] = useState<LatLon | null>(null);
	const [locating, setLocating] = useState(false);
	const [favoriteIds, setFavoriteIds] = useLocalStorage<string[]>('bf-favorites', []);
	const [sort, setSort] = useState<SortMode>('relevance');
	const [tab, setTab] = useState<'explore' | 'favorites'>('explore');
	const [layer, setLayer] = useLocalStorage<BaseLayerId>('bf-layer', 'plan');
	const [panelOpen, setPanelOpen] = useState(true);
	const [sheet, setSheet] = useState<SheetState>('peek');
	const [sheetHeight, setSheetHeight] = useState(PEEK);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const mapRef = useRef<MapHandle>(null);

	const favorites = useMemo(() => new Set(favoriteIds), [favoriteIds]);
	const selected = (selectedId && data?.byId.get(selectedId)) || null;

	const fortTitle = useCallback(
		(f: Fort) => {
			const title =
				f.names[lang as 'fr' | 'en'] ||
				f.name ||
				t('list.unnamed', { type: t(`categories.${f.cat}`).toLowerCase() });
			return title.charAt(0).toUpperCase() + title.slice(1);
		},
		[t, lang],
	);
	const labelFor = useCallback(
		(f: Fort) => ({
			title: fortTitle(f),
			subtitle: [t(`categories.${f.cat}`), f.city || countryName(f.country, lang)]
				.filter(Boolean)
				.join(' · '),
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[fortTitle, lang],
	);

	// ------------------------------------------------------------ derived
	const q = useMemo(() => parseQuery(deferredQuery), [deferredQuery]);
	const allResults = useMemo<ScoredFort[] | null>(() => (q ? searchForts(forts, q) : null), [forts, q]);
	const filtered = useMemo(() => forts.filter(f => matchesFilters(f, filters)), [forts, filters]);
	const searchFiltered = useMemo(
		() => (allResults ? allResults.filter(r => matchesFilters(r.fort, filters)) : null),
		[allResults, filters],
	);
	const mapForts = useMemo(
		() => (searchFiltered ? searchFiltered.map(r => r.fort) : filtered),
		[searchFiltered, filtered],
	);

	const base = useMemo(() => (allResults ? allResults.map(r => r.fort) : forts), [allResults, forts]);
	const categoryCounts = useMemo(() => {
		const counts = Object.fromEntries(CATEGORY_IDS.map(c => [c, 0])) as Record<CategoryId, number>;
		const f = { ...filters, categories: [] };
		for (const fort of base) if (matchesFilters(fort, f)) counts[fort.cat]++;
		return counts;
	}, [base, filters]);
	const countryCounts = useMemo(() => {
		const counts = new Map<string, number>();
		const f = { ...filters, country: '' };
		for (const fort of base)
			if (fort.country && matchesFilters(fort, f))
				counts.set(fort.country, (counts.get(fort.country) ?? 0) + 1);
		if (filters.country && !counts.has(filters.country)) counts.set(filters.country, 0);
		return counts;
	}, [base, filters]);
	const totalCounts = useMemo(() => {
		const counts = Object.fromEntries(CATEGORY_IDS.map(c => [c, 0])) as Record<CategoryId, number>;
		for (const fort of forts) counts[fort.cat]++;
		return counts;
	}, [forts]);

	const origin: LatLon | null = userLocation ?? (view ? { lat: view.centerLat, lon: view.centerLon } : null);

	const inView = useMemo<ScoredFort[]>(() => {
		if (searchFiltered || !view) return [];
		const { south, north } = view;
		let { west, east } = view;
		const wrap = east - west >= 360;
		if (!wrap) {
			west = ((((west + 180) % 360) + 360) % 360) - 180;
			east = ((((east + 180) % 360) + 360) % 360) - 180;
		}
		const out: ScoredFort[] = [];
		// Notable places first, then the closest to the centre of the view.
		const cos = Math.cos((view.centerLat * Math.PI) / 180);
		const span = Math.max(1e-6, Math.hypot((view.east - view.west) * cos, north - south));
		for (const fort of filtered) {
			if (fort.lat < south || fort.lat > north) continue;
			if (!wrap && (west <= east ? fort.lon < west || fort.lon > east : fort.lon < west && fort.lon > east))
				continue;
			const d = Math.hypot((fort.lon - view.centerLon) * cos, fort.lat - view.centerLat) / span;
			out.push({ fort, score: fort.rank - d * 12 });
		}
		return out;
	}, [filtered, searchFiltered, view]);

	const listItems = useMemo(
		() => sortForts(searchFiltered ?? inView, sort, sort === 'distance' ? origin : null, lang),
		// origin only matters for distance sorting; avoid re-sorting on every pan otherwise.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[searchFiltered, inView, sort, lang, sort === 'distance' ? origin : null],
	);
	const favoriteForts = useMemo(
		() => favoriteIds.map(id => data?.byId.get(id)).filter((f): f is Fort => Boolean(f)),
		[favoriteIds, data],
	);

	// ------------------------------------------------------------ actions
	const flash = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 2200);
	}, []);

	const selectFort = useCallback(
		(fort: Fort, opts: { zoom?: number; fly?: boolean } = {}) => {
			if (selectedId && selectedId !== fort.id) setHistory(h => [...h.slice(-20), selectedId]);
			setSelectedId(fort.id);
			setHovered(null);
			if (isMobile) setSheet(s => (s === 'full' ? 'full' : 'half'));
			else setPanelOpen(true);
			if (opts.fly !== false) mapRef.current?.flyTo(fort.lat, fort.lon, opts.zoom);
		},
		[isMobile, selectedId],
	);

	const closeDetail = useCallback(() => {
		setSelectedId(null);
		setHistory([]);
		setOutline(null);
		if (isMobile) setSheet('peek');
	}, [isMobile]);

	const goBack = useCallback(() => {
		const prev = history[history.length - 1];
		const fort = prev ? data?.byId.get(prev) : null;
		if (!fort) return closeDetail();
		setHistory(h => h.slice(0, -1));
		setSelectedId(fort.id);
		mapRef.current?.flyTo(fort.lat, fort.lon, view?.zoom);
	}, [history, data, closeDetail, view]);

	const toggleFavorite = useCallback(
		(fort: Fort) =>
			setFavoriteIds(ids => (ids.includes(fort.id) ? ids.filter(id => id !== fort.id) : [fort.id, ...ids])),
		[setFavoriteIds],
	);

	const selectPlace = useCallback(
		(place: Place) => {
			setQuery('');
			if (place.bbox) mapRef.current?.fitBounds(place.bbox[0], place.bbox[2], place.bbox[1], place.bbox[3]);
			else mapRef.current?.flyTo(place.lat, place.lon, 14);
			if (isMobile) setSheet('peek');
		},
		[isMobile],
	);

	const randomFort = useCallback(() => {
		const pool = mapForts.length ? mapForts : forts;
		if (!pool.length) return;
		// Prefer well-documented places, they make better discoveries.
		const notable = pool.filter(f => f.flags & FLAG_WIKI);
		const from = notable.length > 20 ? notable : pool;
		selectFort(from[Math.floor(Math.random() * from.length)], { zoom: 16 });
	}, [mapForts, forts, selectFort]);

	const locate = useCallback(() => {
		if (!navigator.geolocation) return flash(t('map.locateError'));
		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			pos => {
				setLocating(false);
				const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
				setUserLocation(loc);
				setSort('distance');
				mapRef.current?.flyTo(loc.lat, loc.lon, 11);
			},
			() => {
				setLocating(false);
				flash(t('map.locateError'));
			},
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	}, [flash, t]);

	// When a search is typed, frame its results on the map.
	const lastFramed = useRef<string>('');
	useEffect(() => {
		if (!searchFiltered || !q || searchFiltered.length === 0 || searchFiltered.length > 400) return;
		if (lastFramed.current === q.raw) return;
		const timer = setTimeout(() => {
			lastFramed.current = q.raw;
			const pts = searchFiltered.slice(0, 200).map(r => r.fort);
			let s = 90,
				w = 180,
				n = -90,
				e = -180;
			for (const p of pts) {
				s = Math.min(s, p.lat);
				n = Math.max(n, p.lat);
				w = Math.min(w, p.lon);
				e = Math.max(e, p.lon);
			}
			mapRef.current?.fitBounds(s, w, n, e);
		}, 900);
		return () => clearTimeout(timer);
	}, [searchFiltered, q]);

	// Open the fort from the URL once data is there.
	const openedFromUrl = useRef(false);
	useEffect(() => {
		if (!data || openedFromUrl.current) return;
		openedFromUrl.current = true;
		const id = initialUrl.current.fortId;
		const fort = id ? data.byId.get(id) : null;
		if (fort) {
			if (isMobile) setSheet('half');
			setTimeout(() => mapRef.current?.flyTo(fort.lat, fort.lon, initialUrl.current.view?.zoom ?? 16), 50);
		} else if (id) setSelectedId(null);
	}, [data, isMobile]);

	// A pasted link or the back button may change the hash without a reload.
	useEffect(() => {
		const onHash = () => {
			const { fortId } = readUrlState();
			const fort = fortId ? data?.byId.get(fortId) : null;
			if (fort && fort.id !== selectedId) selectFort(fort, { zoom: 16 });
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, [data, selectedId, selectFort]);

	// Keep the URL in sync for sharing.
	useEffect(() => {
		if (!data) return;
		writeUrlState({
			fortId: selectedId,
			view: view ? { lat: view.centerLat, lon: view.centerLon, zoom: view.zoom } : null,
		});
	}, [selectedId, view, data]);

	// Keyboard shortcuts.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (/input|textarea|select/i.test(target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === 'Escape' && selected && !aboutOpen) closeDetail();
			else if (e.key.toLowerCase() === 'r') randomFort();
			else if (e.key.toLowerCase() === 'f' && selected) toggleFavorite(selected);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [selected, aboutOpen, closeDetail, randomFort, toggleFavorite]);

	const padding = useMemo(
		() =>
			isMobile ? { left: 0, bottom: sheetHeight } : { left: panelOpen ? PANEL_WIDTH + 24 : 0, bottom: 0 },
		[isMobile, sheetHeight, panelOpen],
	);

	// ---------------------------------------------------------------- UI
	const searchBox = (
		<SearchBox
			query={query}
			onQueryChange={v => {
				setQuery(v);
				if (v && tab !== 'explore') setTab('explore');
			}}
			results={allResults ?? []}
			onSelectFort={f => {
				// Picking a suggestion is a navigation, not a filter.
				setQuery('');
				selectFort(f, { zoom: 16 });
			}}
			onSelectPlace={selectPlace}
			onShowAll={() => {
				setSelectedId(null);
				if (isMobile) setSheet('full');
			}}
			fortTitle={fortTitle}
			placeholder={isMobile ? t('search.placeholderShort') : undefined}
			className={isMobile ? 'flex-1' : ''}
		/>
	);

	const chips = <CategoryChips filters={filters} counts={categoryCounts} onChange={setFilters} />;

	const countLabel = searchFiltered
		? t('list.results', {
				count: searchFiltered.length,
				n: formatNumber(searchFiltered.length, lang),
				q: deferredQuery.trim(),
			})
		: t('list.inView', { count: inView.length, n: formatNumber(inView.length, lang) });

	const tabs = (
		<div className="flex gap-1 px-3">
			{(['explore', 'favorites'] as const).map(id => (
				<button
					key={id}
					type="button"
					onClick={() => setTab(id)}
					className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
						tab === id
							? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
							: 'text-stone-600 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-white/5'
					}`}
				>
					{id === 'explore' ? <ListIcon size={16} /> : <StarIcon size={16} />}
					{t(`tabs.${id}`)}
					{id === 'favorites' && favoriteIds.length > 0 && (
						<span className="rounded-full bg-amber-400 px-1.5 text-[11px] text-stone-900">
							{favoriteIds.length}
						</span>
					)}
				</button>
			))}
		</div>
	);

	const listHeader = (
		<div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
			<div className="min-w-0 text-xs text-stone-500 dark:text-stone-400">
				{!isMobile && (
					<div className="truncate font-semibold text-stone-800 dark:text-stone-100">{countLabel}</div>
				)}
				{!searchFiltered && data && <div>{t('list.total', { n: formatNumber(mapForts.length, lang) })}</div>}
			</div>
			<label className="flex shrink-0 items-center gap-1 text-xs text-stone-500">
				<span className="sr-only">{t('list.sort')}</span>
				<select
					value={sort}
					onChange={e => setSort(e.target.value as SortMode)}
					className="rounded-lg border border-stone-200 bg-white py-1 pr-1 pl-2 text-xs font-medium text-stone-700 dark:border-white/10 dark:bg-stone-800 dark:text-stone-200"
				>
					<option value="relevance">{t('list.sortRelevance')}</option>
					<option value="distance">{t('list.sortDistance')}</option>
					<option value="name">{t('list.sortName')}</option>
					<option value="age">{t('list.sortAge')}</option>
				</select>
			</label>
		</div>
	);

	const loadingList = (
		<div className="space-y-2 px-4 py-3 text-stone-400">
			{Array.from({ length: 8 }, (_, i) => (
				<div key={i} className="flex items-center gap-3">
					<div className="skeleton size-9 rounded-full" />
					<div className="flex-1 space-y-1.5">
						<div className="skeleton h-3 w-3/4 rounded" />
						<div className="skeleton h-2.5 w-1/2 rounded" />
					</div>
				</div>
			))}
		</div>
	);

	const exploreContent =
		tab === 'explore' ? (
			<>
				<div className="px-3 pt-3">
					<FilterPanel filters={filters} onChange={setFilters} countryCounts={countryCounts} />
				</div>
				{listHeader}
				{data ? (
					<FortList
						forts={listItems}
						origin={userLocation}
						favorites={favorites}
						selectedIdx={selected?.idx ?? null}
						fortTitle={fortTitle}
						onSelect={f => selectFort(f, { zoom: Math.max(view?.zoom ?? 0, 15) })}
						onHover={setHovered}
						resetKey={`${deferredQuery}|${sort}|${JSON.stringify(filters)}`}
					/>
				) : (
					loadingList
				)}
			</>
		) : (
			<>
				<div className="flex items-center justify-between px-4 pt-3 pb-2 text-xs">
					<span className="font-semibold">{t('favorites.count', { count: favoriteForts.length })}</span>
					{favoriteForts.length > 0 && (
						<button
							type="button"
							className="text-brand-700 hover:underline dark:text-brand-300"
							onClick={() => window.confirm(t('favorites.confirmClear')) && setFavoriteIds([])}
						>
							{t('favorites.clear')}
						</button>
					)}
				</div>
				<FortList
					forts={favoriteForts}
					origin={userLocation}
					favorites={favorites}
					selectedIdx={selected?.idx ?? null}
					fortTitle={fortTitle}
					onSelect={f => selectFort(f, { zoom: 16 })}
					onHover={setHovered}
					empty={t('favorites.empty')}
				/>
			</>
		);

	const detail = selected && (
		<FortDetail
			key={selected.id}
			fort={selected}
			forts={forts}
			isFavorite={favorites.has(selected.id)}
			fortTitle={fortTitle}
			onToggleFavorite={() => toggleFavorite(selected)}
			onClose={closeDetail}
			onBack={history.length ? goBack : undefined}
			onSelect={f => selectFort(f, { zoom: view?.zoom })}
			onZoomTo={() => mapRef.current?.flyTo(selected.lat, selected.lon, 17)}
			onOutline={setOutline}
			onHover={setHovered}
		/>
	);

	const status =
		load.status === 'loading' ? (
			<div className="glass pointer-events-auto flex items-center gap-3 rounded-full py-2 pr-4 pl-3 text-sm font-medium">
				<span className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
				{t('loading.title')}
				{load.progress !== null && (
					<span className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
						<span
							className="block h-full rounded-full bg-brand-500 transition-[width]"
							style={{ width: `${Math.round(load.progress * 100)}%` }}
						/>
					</span>
				)}
			</div>
		) : load.status === 'error' ? (
			<div className="glass pointer-events-auto flex items-center gap-3 rounded-full py-2 pr-2 pl-4 text-sm font-medium text-red-700 dark:text-red-300">
				{t('loading.error')}
				<button
					type="button"
					onClick={() => setAttempt(a => a + 1)}
					className="rounded-full bg-brand-600 px-3 py-1 text-white hover:bg-brand-700"
				>
					{t('loading.retry')}
				</button>
			</div>
		) : null;

	return (
		<div className="relative h-full w-full overflow-hidden">
			<MapView
				ref={mapRef}
				forts={forts}
				visible={mapForts}
				selected={selected}
				hovered={hovered}
				outline={outline}
				userLocation={userLocation}
				layer={layer}
				isDark={theme.isDark}
				initialView={initialUrl.current.view}
				padding={padding}
				labelFor={labelFor}
				onSelect={f => selectFort(f, { zoom: view?.zoom })}
				onViewChange={setView}
				samePlaceLabel={count => t('map.samePlace', { count })}
			/>

			{isMobile ? (
				<>
					<div className="pointer-events-none absolute inset-x-0 top-0 z-[800] space-y-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
						<div className="pointer-events-auto flex items-center gap-2">
							{searchBox}
							<button
								type="button"
								onClick={() => setAboutOpen(true)}
								className="glass flex size-12 shrink-0 items-center justify-center rounded-xl"
								aria-label={t('menu.about')}
							>
								<img src="/favicon.svg" alt="" className="size-8" />
							</button>
						</div>
						<div className="pointer-events-auto">{chips}</div>
					</div>
					<MapControls
						className="absolute top-[124px] right-3 z-[600]"
						compact
						layer={layer}
						onLayer={setLayer}
						onZoom={d => mapRef.current?.zoomBy(d)}
						onLocate={locate}
						locating={locating}
						onRandom={randomFort}
						onWorld={() => mapRef.current?.resetView()}
					/>
					<BottomSheet
						state={sheet}
						onStateChange={setSheet}
						topOffset={MOBILE_TOP}
						peekHeight={PEEK}
						onHeightChange={setSheetHeight}
						header={
							!selected && (
								<div className="flex items-center justify-between px-4 pb-2">
									<div className="min-w-0">
										<div className="truncate text-sm font-semibold">
											{data ? countLabel : t('loading.title')}
										</div>
										<div className="text-xs text-stone-500">{t('app.tagline')}</div>
									</div>
									<div onPointerDown={e => e.stopPropagation()}>
										<SettingsButtons
											theme={theme.mode}
											onTheme={theme.setMode}
											onAbout={() => setAboutOpen(true)}
										/>
									</div>
								</div>
							)
						}
					>
						{detail || (
							<>
								{tabs}
								{exploreContent}
							</>
						)}
					</BottomSheet>
				</>
			) : (
				<>
					<aside
						className="glass absolute top-3 bottom-3 left-3 z-[800] flex flex-col overflow-hidden rounded-2xl transition-transform duration-300 ease-out"
						style={{
							width: PANEL_WIDTH,
							transform: panelOpen ? 'none' : `translateX(-${PANEL_WIDTH + 24}px)`,
						}}
						aria-hidden={!panelOpen}
					>
						<header className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3.5 pb-3">
							<Brand />
							<SettingsButtons
								theme={theme.mode}
								onTheme={theme.setMode}
								onAbout={() => setAboutOpen(true)}
							/>
						</header>
						<div className="shrink-0 space-y-2.5 px-3 pb-3">
							{searchBox}
							{!selected && chips}
						</div>
						<div className="flex min-h-0 flex-1 flex-col border-t border-stone-200/70 dark:border-white/10">
							{detail || (
								<>
									<div className="pt-3">{tabs}</div>
									{exploreContent}
								</>
							)}
						</div>
					</aside>
					<button
						type="button"
						onClick={() => setPanelOpen(o => !o)}
						className="glass absolute top-1/2 z-[790] flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border-l-0 text-stone-500 transition-[left] duration-300 hover:text-stone-900 dark:hover:text-white"
						style={{ left: panelOpen ? PANEL_WIDTH + 12 : 0 }}
						aria-label={panelOpen ? t('menu.collapse') : t('menu.expand')}
						title={panelOpen ? t('menu.collapse') : t('menu.expand')}
					>
						{panelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
					</button>
					<MapControls
						className="absolute top-3 right-3 z-[600]"
						layer={layer}
						onLayer={setLayer}
						onZoom={d => mapRef.current?.zoomBy(d)}
						onLocate={locate}
						locating={locating}
						onRandom={randomFort}
						onWorld={() => mapRef.current?.resetView()}
					/>
				</>
			)}

			<div
				className="pointer-events-none absolute inset-x-0 z-[900] flex justify-center px-4"
				style={{
					top: isMobile ? MOBILE_TOP + 8 : 16,
					paddingLeft: !isMobile && panelOpen ? PANEL_WIDTH + 24 : undefined,
				}}
			>
				{status}
				{toast && (
					<div className="animate-slide-up rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-stone-900">
						{toast}
					</div>
				)}
			</div>

			{aboutOpen && data && (
				<AboutDialog
					onClose={() => setAboutOpen(false)}
					total={forts.length}
					countries={data.countries.length}
					counts={totalCounts}
					source={data.source}
				/>
			)}
		</div>
	);
}
