import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FLAG_RUINS } from '../data/categories';
import { distanceKm, formatDistance } from '../lib/geo';
import { countryName, flagEmoji, formatYear } from '../lib/text';
import type { Fort, LatLon } from '../lib/types';
import { CategoryGlyph, StarFilledIcon } from './icons';

const ROW = 64;
const OVERSCAN = 6;

interface FortListProps {
	forts: Fort[];
	origin: LatLon | null;
	favorites: Set<string>;
	selectedIdx: number | null;
	fortTitle: (fort: Fort) => string;
	onSelect: (fort: Fort) => void;
	onHover: (fort: Fort | null) => void;
	/** Changing this key scrolls the list back to the top. */
	resetKey?: string;
	empty?: React.ReactNode;
}

export default function FortList({
	forts,
	origin,
	favorites,
	selectedIdx,
	fortTitle,
	onSelect,
	onHover,
	resetKey,
	empty,
}: FortListProps) {
	const { t, i18n } = useTranslation();
	const ref = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [height, setHeight] = useState(600);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setHeight(el.clientHeight));
		ro.observe(el);
		setHeight(el.clientHeight);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		ref.current?.scrollTo({ top: 0 });
		setScrollTop(0);
	}, [resetKey]);

	if (forts.length === 0) {
		return (
			<div className="flex-1 px-6 py-10 text-center text-sm text-stone-500">{empty ?? t('list.empty')}</div>
		);
	}

	const start = Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN);
	const end = Math.min(forts.length, Math.ceil((scrollTop + height) / ROW) + OVERSCAN);

	return (
		<div
			ref={ref}
			className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin"
			onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
			onMouseLeave={() => onHover(null)}
		>
			<ul style={{ height: forts.length * ROW }} className="relative">
				{forts.slice(start, end).map((fort, k) => {
					const i = start + k;
					const meta = [
						fort.city ||
							(fort.country ? `${flagEmoji(fort.country)} ${countryName(fort.country, i18n.language)}` : ''),
						fort.year ? formatYear(fort.year, i18n.language) : '',
					].filter(Boolean);
					const isSelected = fort.idx === selectedIdx;
					return (
						<li key={fort.idx} className="absolute right-0 left-0 px-2" style={{ top: i * ROW, height: ROW }}>
							<button
								type="button"
								onClick={() => onSelect(fort)}
								onMouseEnter={() => onHover(fort)}
								onFocus={() => onHover(fort)}
								className={`group flex h-[60px] w-full items-center gap-3 rounded-xl px-2.5 text-left transition-colors ${
									isSelected
										? 'bg-brand-50 ring-1 ring-brand-200 dark:bg-brand-900/30 dark:ring-brand-800'
										: 'hover:bg-stone-100 dark:hover:bg-white/5'
								}`}
							>
								<CategoryGlyph
									cat={fort.cat}
									size={36}
									className={fort.flags & FLAG_RUINS ? 'opacity-80' : ''}
								/>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-1.5">
										<span
											className={`truncate text-sm font-medium ${fort.name ? '' : 'text-stone-500 italic dark:text-stone-400'}`}
										>
											{fortTitle(fort)}
										</span>
										{favorites.has(fort.id) && (
											<StarFilledIcon size={13} className="shrink-0 text-amber-500" />
										)}
									</span>
									<span className="block truncate text-xs text-stone-500 dark:text-stone-400">
										{t(`categories.${fort.cat}`)}
										{fort.flags & FLAG_RUINS ? ` · ${t('detail.ruins')}` : ''}
										{meta.length ? ` · ${meta.join(' · ')}` : ''}
									</span>
								</span>
								<span className="flex shrink-0 flex-col items-end gap-1">
									{origin && (
										<span className="text-xs font-medium text-stone-600 tabular-nums dark:text-stone-300">
											{formatDistance(distanceKm(origin, fort), i18n.language)}
										</span>
									)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
