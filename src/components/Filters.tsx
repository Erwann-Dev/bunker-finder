import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, CATEGORY_IDS, ERA_IDS, type CategoryId } from '../data/categories';
import { activeFilterCount } from '../lib/search';
import { countryName, flagEmoji, formatNumber } from '../lib/text';
import type { Filters, RuinsFilter } from '../lib/types';
import { ChevronDown, FilterIcon } from './icons';

interface CategoryChipsProps {
	filters: Filters;
	counts: Record<CategoryId, number>;
	onChange: (filters: Filters) => void;
}

export function CategoryChips({ filters, counts, onChange }: CategoryChipsProps) {
	const { t, i18n } = useTranslation();
	const toggle = (cat: CategoryId) => {
		const has = filters.categories.includes(cat);
		onChange({
			...filters,
			categories: has ? filters.categories.filter(c => c !== cat) : [...filters.categories, cat],
		});
	};
	const all = filters.categories.length === 0;
	return (
		<div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
			<button
				type="button"
				onClick={() => onChange({ ...filters, categories: [] })}
				className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
					all
						? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
						: 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-white/10 dark:bg-stone-800 dark:text-stone-200'
				}`}
			>
				{t('filters.allTypes')}
			</button>
			{CATEGORY_IDS.filter(c => counts[c] > 0 || filters.categories.includes(c)).map(cat => {
				const on = filters.categories.includes(cat);
				const color = CATEGORIES[cat].color;
				return (
					<button
						key={cat}
						type="button"
						onClick={() => toggle(cat)}
						aria-pressed={on}
						className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1.5 pr-3 pl-2 text-xs font-semibold transition-colors ${
							on
								? 'text-white'
								: 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 dark:border-white/10 dark:bg-stone-800 dark:text-stone-200'
						}`}
						style={on ? { background: color, borderColor: color } : undefined}
					>
						<span
							className="size-2.5 rounded-full ring-2 ring-white/70"
							style={{ background: on ? '#fff' : color }}
						/>
						{t(`categoriesPlural.${cat}`)}
						<span className={`font-normal tabular-nums ${on ? 'text-white/80' : 'text-stone-400'}`}>
							{formatNumber(counts[cat], i18n.language)}
						</span>
					</button>
				);
			})}
		</div>
	);
}

interface FilterPanelProps {
	filters: Filters;
	onChange: (filters: Filters) => void;
	countryCounts: Map<string, number>;
}

function Toggle({
	checked,
	onChange,
	label,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	label: string;
}) {
	return (
		<label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm">
			<span>{label}</span>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
					checked ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-600'
				}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
						checked ? 'translate-x-4' : ''
					}`}
				/>
			</button>
		</label>
	);
}

export function FilterPanel({ filters, onChange, countryCounts }: FilterPanelProps) {
	const { t, i18n } = useTranslation();
	const [open, setOpen] = useState(false);
	const active = activeFilterCount({ ...filters, categories: [] });

	const countries = useMemo(() => {
		const collator = new Intl.Collator(i18n.language);
		return [...countryCounts.entries()]
			.map(([code, count]) => ({ code, count, name: countryName(code, i18n.language) }))
			.sort((a, b) => collator.compare(a.name, b.name));
	}, [countryCounts, i18n.language]);

	const setRuins = (ruins: RuinsFilter) => onChange({ ...filters, ruins });
	const toggleEra = (era: string) =>
		onChange({
			...filters,
			eras: filters.eras.includes(era) ? filters.eras.filter(e => e !== era) : [...filters.eras, era],
		});

	return (
		<div className="rounded-xl border border-stone-200 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]">
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				aria-expanded={open}
				className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold"
			>
				<FilterIcon size={18} className="text-stone-500" />
				{t('filters.title')}
				{active > 0 && (
					<span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
						{t('filters.active', { count: active })}
					</span>
				)}
				<span className="flex-1" />
				{active > 0 && (
					<span
						role="button"
						tabIndex={0}
						onClick={e => {
							e.stopPropagation();
							onChange({
								...filters,
								eras: [],
								country: '',
								ruins: 'any',
								heritage: false,
								wiki: false,
								visit: false,
								named: false,
							});
						}}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								e.stopPropagation();
								onChange({
									...filters,
									eras: [],
									country: '',
									ruins: 'any',
									heritage: false,
									wiki: false,
									visit: false,
									named: false,
								});
							}
						}}
						className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
					>
						{t('filters.reset')}
					</span>
				)}
				<ChevronDown
					size={18}
					className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className="animate-fade-in space-y-4 border-t border-stone-200 px-3 pt-3 pb-3 dark:border-white/10">
					<div>
						<label
							className="mb-1.5 block text-xs font-semibold tracking-wide text-stone-500 uppercase"
							htmlFor="bf-country"
						>
							{t('filters.country')}
						</label>
						<select
							id="bf-country"
							value={filters.country}
							onChange={e => onChange({ ...filters, country: e.target.value })}
							className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-stone-800"
						>
							<option value="">{t('filters.allCountries')}</option>
							{countries.map(c => (
								<option key={c.code} value={c.code}>
									{flagEmoji(c.code)} {c.name} ({formatNumber(c.count, i18n.language)})
								</option>
							))}
						</select>
					</div>

					<div>
						<div className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
							{t('filters.era')}
						</div>
						<div className="flex flex-wrap gap-1.5">
							{ERA_IDS.map(era => {
								const on = filters.eras.includes(era);
								return (
									<button
										key={era}
										type="button"
										aria-pressed={on}
										onClick={() => toggleEra(era)}
										className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
											on
												? 'border-brand-600 bg-brand-600 text-white'
												: 'border-stone-200 hover:border-stone-300 dark:border-white/10 dark:hover:border-white/20'
										}`}
									>
										{t(`eras.${era}`)}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<div className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">
							{t('filters.ruins')}
						</div>
						<div className="grid grid-cols-3 rounded-lg bg-stone-100 p-0.5 dark:bg-stone-800">
							{(['any', 'exclude', 'only'] as const).map(v => (
								<button
									key={v}
									type="button"
									aria-pressed={filters.ruins === v}
									onClick={() => setRuins(v)}
									className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
										filters.ruins === v
											? 'bg-white shadow-sm dark:bg-stone-600'
											: 'text-stone-600 dark:text-stone-300'
									}`}
								>
									{t(
										v === 'any'
											? 'filters.ruinsAny'
											: v === 'only'
												? 'filters.ruinsOnly'
												: 'filters.ruinsExclude',
									)}
								</button>
							))}
						</div>
					</div>

					<div className="divide-y divide-stone-100 dark:divide-white/5">
						<Toggle
							checked={filters.heritage}
							onChange={v => onChange({ ...filters, heritage: v })}
							label={t('filters.heritage')}
						/>
						<Toggle
							checked={filters.wiki}
							onChange={v => onChange({ ...filters, wiki: v })}
							label={t('filters.wiki')}
						/>
						<Toggle
							checked={filters.visit}
							onChange={v => onChange({ ...filters, visit: v })}
							label={t('filters.visit')}
						/>
						<Toggle
							checked={filters.named}
							onChange={v => onChange({ ...filters, named: v })}
							label={t('filters.named')}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
