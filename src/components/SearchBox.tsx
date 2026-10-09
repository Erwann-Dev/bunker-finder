import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScoredFort } from '../lib/search';
import { countryName, flagEmoji } from '../lib/text';
import type { Fort } from '../lib/types';
import { CategoryGlyph, CloseIcon, PinIcon, SearchIcon, TargetIcon } from './icons';

export interface Place {
	label: string;
	detail: string;
	lat: number;
	lon: number;
	bbox?: [number, number, number, number]; // south, north, west, east
}

interface SearchBoxProps {
	query: string;
	onQueryChange: (q: string) => void;
	results: ScoredFort[];
	onSelectFort: (fort: Fort) => void;
	onSelectPlace: (place: Place) => void;
	onShowAll?: () => void;
	fortTitle: (fort: Fort) => string;
	className?: string;
	placeholder?: string;
	autoFocusShortcut?: boolean;
}

interface NominatimResult {
	display_name: string;
	name?: string;
	lat: string;
	lon: string;
	boundingbox?: [string, string, string, string];
	type?: string;
	addresstype?: string;
}

const COORDS_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export default function SearchBox({
	query,
	onQueryChange,
	results,
	onSelectFort,
	onSelectPlace,
	onShowAll,
	fortTitle,
	className = '',
	placeholder,
	autoFocusShortcut = true,
}: SearchBoxProps) {
	const { t, i18n } = useTranslation();
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [places, setPlaces] = useState<Place[]>([]);
	const [loadingPlaces, setLoadingPlaces] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const listId = useId();

	// "/" focuses the search, like on many map sites.
	useEffect(() => {
		if (!autoFocusShortcut) return;
		const onKey = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (e.key === '/' && !/input|textarea|select/i.test(target.tagName)) {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [autoFocusShortcut]);

	// Geocode places with Nominatim (debounced, cancellable).
	useEffect(() => {
		const q = query.trim();
		setPlaces([]);
		if (q.length < 3 || COORDS_RE.test(q)) {
			setLoadingPlaces(false);
			return;
		}
		const ctrl = new AbortController();
		setLoadingPlaces(true);
		const timer = setTimeout(async () => {
			try {
				const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=${i18n.language}&q=${encodeURIComponent(q)}`;
				const res = await fetch(url, { signal: ctrl.signal });
				const data = (await res.json()) as NominatimResult[];
				setPlaces(
					data.map(r => {
						const parts = r.display_name.split(', ');
						return {
							label: r.name || parts[0],
							detail: parts.slice(1).join(', '),
							lat: Number(r.lat),
							lon: Number(r.lon),
							bbox: r.boundingbox
								? (r.boundingbox.map(Number) as [number, number, number, number])
								: undefined,
						};
					}),
				);
			} catch {
				/* aborted or offline */
			} finally {
				if (!ctrl.signal.aborted) setLoadingPlaces(false);
			}
		}, 450);
		return () => {
			clearTimeout(timer);
			ctrl.abort();
		};
	}, [query, i18n.language]);

	const coords = useMemo(() => {
		const m = query.match(COORDS_RE);
		if (!m) return null;
		const lat = Number(m[1]);
		const lon = Number(m[2]);
		return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
	}, [query]);

	const top = results.slice(0, 7);
	type Item =
		{ kind: 'fort'; fort: Fort } | { kind: 'place'; place: Place } | { kind: 'coords' } | { kind: 'all' };
	const items: Item[] = [
		...(coords ? [{ kind: 'coords' as const }] : []),
		...top.map(r => ({ kind: 'fort' as const, fort: r.fort })),
		...(results.length > top.length ? [{ kind: 'all' as const }] : []),
		...places.map(place => ({ kind: 'place' as const, place })),
	];

	useEffect(() => setActive(0), [query]);

	const choose = (item: Item | undefined) => {
		if (!item) return;
		if (item.kind === 'fort') onSelectFort(item.fort);
		if (item.kind === 'place') onSelectPlace(item.place);
		if (item.kind === 'all') onShowAll?.();
		if (item.kind === 'coords' && coords)
			onSelectPlace({ label: query, detail: '', lat: coords.lat, lon: coords.lon });
		setOpen(false);
		inputRef.current?.blur();
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setOpen(true);
			setActive(a => Math.min(items.length - 1, a + 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActive(a => Math.max(0, a - 1));
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(items[active]);
		} else if (e.key === 'Escape') {
			if (open) setOpen(false);
			else onQueryChange('');
			inputRef.current?.blur();
		}
	};

	const showDropdown = open && query.trim().length > 0;
	let itemIndex = -1;
	const optionClass = (i: number) =>
		`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
			i === active ? 'bg-brand-50 dark:bg-white/10' : 'hover:bg-stone-100 dark:hover:bg-white/5'
		}`;

	return (
		<div className={`relative ${className}`}>
			<div className="flex h-12 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 shadow-sm transition-shadow focus-within:border-brand-400 focus-within:shadow-md focus-within:ring-4 focus-within:ring-brand-500/15 dark:border-white/10 dark:bg-stone-800">
				<SearchIcon className="shrink-0 text-stone-400" />
				<input
					ref={inputRef}
					type="search"
					role="combobox"
					aria-expanded={showDropdown}
					aria-controls={listId}
					aria-autocomplete="list"
					value={query}
					onChange={e => {
						onQueryChange(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => setTimeout(() => setOpen(false), 150)}
					onKeyDown={onKeyDown}
					placeholder={placeholder ?? t('search.placeholder')}
					className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400 [&::-webkit-search-cancel-button]:hidden"
					style={{ outline: 'none' }}
				/>
				{query ? (
					<button
						type="button"
						onClick={() => {
							onQueryChange('');
							inputRef.current?.focus();
						}}
						className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
						aria-label={t('search.clear')}
					>
						<CloseIcon size={18} />
					</button>
				) : (
					<kbd className="hidden rounded border border-stone-200 px-1.5 text-xs text-stone-400 sm:block dark:border-white/10">
						/
					</kbd>
				)}
			</div>

			{showDropdown && (
				<div
					id={listId}
					role="listbox"
					className="glass absolute top-full right-0 left-0 z-50 mt-2 max-h-[min(70vh,520px)] animate-slide-up overflow-y-auto rounded-xl p-1.5 scrollbar-thin"
				>
					{coords && (
						<button
							type="button"
							role="option"
							aria-selected={active === ++itemIndex}
							className={optionClass(itemIndex)}
							onMouseDown={e => e.preventDefault()}
							onClick={() => choose({ kind: 'coords' })}
						>
							<span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
								<TargetIcon size={18} />
							</span>
							<span className="text-sm font-medium">
								{t('search.coordinates')} <span className="text-stone-500">{query}</span>
							</span>
						</button>
					)}

					{top.length > 0 && (
						<div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
							{t('search.fortifications')}
						</div>
					)}
					{top.map(({ fort }) => {
						const i = ++itemIndex;
						return (
							<button
								key={fort.idx}
								type="button"
								role="option"
								aria-selected={active === i}
								className={optionClass(i)}
								onMouseEnter={() => setActive(i)}
								onMouseDown={e => e.preventDefault()}
								onClick={() => choose({ kind: 'fort', fort })}
							>
								<CategoryGlyph cat={fort.cat} size={30} />
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">{fortTitle(fort)}</span>
									<span className="block truncate text-xs text-stone-500 dark:text-stone-400">
										{t(`categories.${fort.cat}`)}
										{fort.city ? ` · ${fort.city}` : ''}
										{fort.country
											? ` · ${flagEmoji(fort.country)} ${countryName(fort.country, i18n.language)}`
											: ''}
									</span>
								</span>
							</button>
						);
					})}
					{results.length > top.length && (
						<button
							type="button"
							role="option"
							aria-selected={active === ++itemIndex}
							className={`${optionClass(itemIndex)} justify-center text-sm font-medium text-brand-700 dark:text-brand-300`}
							onMouseDown={e => e.preventDefault()}
							onClick={() => choose({ kind: 'all' })}
						>
							{t('search.seeAll', { count: results.length })}
						</button>
					)}

					{(places.length > 0 || loadingPlaces) && (
						<div className="mt-1 border-t border-stone-200/70 px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase dark:border-white/10">
							{t('search.places')}
						</div>
					)}
					{loadingPlaces && places.length === 0 && (
						<div className="px-2.5 py-2 text-sm text-stone-500">{t('search.searchingPlaces')}</div>
					)}
					{places.map((place, k) => {
						const i = ++itemIndex;
						return (
							<button
								key={`${place.lat},${place.lon},${k}`}
								type="button"
								role="option"
								aria-selected={active === i}
								className={optionClass(i)}
								onMouseEnter={() => setActive(i)}
								onMouseDown={e => e.preventDefault()}
								onClick={() => choose({ kind: 'place', place })}
							>
								<span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
									<PinIcon size={16} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-medium">{place.label}</span>
									<span className="block truncate text-xs text-stone-500 dark:text-stone-400">
										{place.detail}
									</span>
								</span>
							</button>
						);
					})}

					{items.length === 0 && !loadingPlaces && (
						<div className="px-3 py-4 text-center text-sm text-stone-500">
							{t('search.noResults', { q: query })}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
