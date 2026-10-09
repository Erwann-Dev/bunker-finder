import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from '../data/categories';
import { LANGUAGES } from '../i18n';
import type { ThemeMode } from '../hooks/useTheme';
import { formatNumber } from '../lib/text';
import { CategoryGlyph, CloseIcon, InfoIcon, Logo, MonitorIcon, MoonIcon, SunIcon } from './icons';

const iconBtn =
	'flex size-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white';

export function SettingsButtons({
	theme,
	onTheme,
	onAbout,
}: {
	theme: ThemeMode;
	onTheme: (mode: ThemeMode) => void;
	onAbout: () => void;
}) {
	const { t, i18n } = useTranslation();
	const nextTheme: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
	const ThemeIcon = theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon;
	const lang = i18n.language.slice(0, 2);
	const nextLang = LANGUAGES[(LANGUAGES.findIndex(l => l.code === lang) + 1) % LANGUAGES.length];
	return (
		<div className="flex items-center gap-0.5">
			<button
				type="button"
				className={`${iconBtn} w-auto px-2 text-xs font-bold`}
				onClick={() => i18n.changeLanguage(nextLang.code)}
				title={`${t('menu.language')} : ${nextLang.label}`}
				aria-label={`${t('menu.language')} : ${nextLang.label}`}
			>
				{lang.toUpperCase()}
			</button>
			<button
				type="button"
				className={iconBtn}
				onClick={() => onTheme(nextTheme)}
				title={`${t('menu.theme')} : ${t(`menu.${theme}`)}`}
				aria-label={`${t('menu.theme')} : ${t(`menu.${theme}`)}`}
			>
				<ThemeIcon size={18} />
			</button>
			<button
				type="button"
				className={iconBtn}
				onClick={onAbout}
				title={t('menu.about')}
				aria-label={t('menu.about')}
			>
				<InfoIcon size={18} />
			</button>
		</div>
	);
}

export function Brand({ compact = false }: { compact?: boolean }) {
	const { t } = useTranslation();
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<Logo size={compact ? 32 : 36} />
			<div className="min-w-0 leading-tight">
				<div className="flex items-center gap-1.5">
					<span className="font-display text-lg font-bold tracking-tight">{t('app.name')}</span>
					<span className="rounded-md bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">
						{t('app.version')}
					</span>
				</div>
				{!compact && (
					<div className="truncate text-xs text-stone-500 dark:text-stone-400">{t('app.tagline')}</div>
				)}
			</div>
		</div>
	);
}

interface AboutDialogProps {
	onClose: () => void;
	total: number;
	countries: number;
	counts: Record<CategoryId, number>;
	source: string | null;
}

export function AboutDialog({ onClose, total, countries, counts, source }: AboutDialogProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);
	const max = Math.max(...CATEGORY_IDS.map(c => counts[c]));
	const news = t('about.news', { returnObjects: true }) as unknown as string[];
	const kbd =
		'rounded border border-stone-300 bg-stone-50 px-1.5 py-px font-mono text-xs dark:border-white/15 dark:bg-white/5';

	return (
		<div
			className="fixed inset-0 z-[1500] flex animate-fade-in items-end justify-center bg-stone-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="about-title"
				className="max-h-[92dvh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-2xl bg-white shadow-2xl scrollbar-thin sm:rounded-2xl dark:bg-stone-900"
				onClick={e => e.stopPropagation()}
			>
				<div className="sticky top-0 flex items-center justify-between border-b border-stone-200 bg-white/90 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-stone-900/90">
					<Brand />
					<button type="button" onClick={onClose} className={iconBtn} aria-label={t('about.close')}>
						<CloseIcon size={18} />
					</button>
				</div>
				<div className="space-y-6 px-5 py-5 text-sm leading-relaxed">
					<p id="about-title" className="text-stone-700 dark:text-stone-300">
						{t('about.intro', { n: formatNumber(total, lang) })}
					</p>

					<section>
						<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('about.whatsNew')}
						</h3>
						<ul className="space-y-1.5">
							{news.map(item => (
								<li key={item} className="flex gap-2">
									<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
									<span>{item}</span>
								</li>
							))}
						</ul>
					</section>

					<section>
						<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('about.stats')}
						</h3>
						<ul className="space-y-2">
							{CATEGORY_IDS.map(cat => (
								<li key={cat} className="flex items-center gap-2.5">
									<CategoryGlyph cat={cat} size={24} />
									<span className="w-36 shrink-0 truncate">{t(`categoriesPlural.${cat}`)}</span>
									<span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-white/5">
										<span
											className="block h-full rounded-full"
											style={{
												width: `${Math.max(1, (counts[cat] / max) * 100)}%`,
												background: CATEGORIES[cat].color,
											}}
										/>
									</span>
									<span className="w-14 text-right text-xs text-stone-500 tabular-nums">
										{formatNumber(counts[cat], lang)}
									</span>
								</li>
							))}
						</ul>
						<p className="mt-3 text-xs text-stone-500">
							{t('about.countries', { count: countries })}
							{source ? ` · ${t('about.dataDate', { date: new Date(source).toLocaleDateString(lang) })}` : ''}
						</p>
					</section>

					<section className="hidden sm:block">
						<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('about.shortcuts')}
						</h3>
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
							<dt>
								<kbd className={kbd}>/</kbd>
							</dt>
							<dd>{t('about.kSearch')}</dd>
							<dt>
								<kbd className={kbd}>Esc</kbd>
							</dt>
							<dd>{t('about.kEsc')}</dd>
							<dt>
								<kbd className={kbd}>R</kbd>
							</dt>
							<dd>{t('about.kRandom')}</dd>
							<dt>
								<kbd className={kbd}>F</kbd>
							</dt>
							<dd>{t('about.kFav')}</dd>
						</dl>
					</section>

					<section>
						<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('about.credits')}
						</h3>
						<p className="text-xs text-stone-500">{t('about.creditsText')}</p>
					</section>
				</div>
			</div>
		</div>
	);
}
