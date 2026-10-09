import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, FLAG_HERITAGE, FLAG_RUINS, FLAG_VISIT } from '../data/categories';
import { enrichFort, fetchOsmDetails, type Enrichment, type OsmDetails } from '../lib/enrich';
import { formatCoords, formatDistance } from '../lib/geo';
import { nearestForts } from '../lib/search';
import { countryName, flagEmoji, formatYear } from '../lib/text';
import type { Fort } from '../lib/types';
import { fortUrl } from '../lib/urlState';
import {
	CategoryGlyph,
	ChevronLeft,
	CloseIcon,
	CopyIcon,
	DirectionsIcon,
	ExternalIcon,
	ShareIcon,
	StarFilledIcon,
	StarIcon,
	StreetViewIcon,
	TargetIcon,
} from './icons';
import PhotoHero, { Lightbox } from './PhotoHero';

const CASTLE_TYPES_FR: Record<string, string> = {
	defensive: 'défensif',
	stately: 'de plaisance',
	manor: 'manoir',
	palace: 'palais',
	fortress: 'forteresse',
	castrum: 'castrum',
	shiro: 'château japonais (shiro)',
	burg: 'burg',
	kremlin: 'kremlin',
	motte: 'motte castrale',
	citadel: 'citadelle',
	fortified_manor: 'manoir fortifié',
	tower_house: 'maison-tour',
	pillbox: 'casemate',
	gun_emplacement: 'emplacement de canon',
	personnel_shelter: 'abri du personnel',
	munitions: 'dépôt de munitions',
	technical: 'technique',
	hardened_aircraft_shelter: 'abri pour avions',
};

function humanize(value: string, lang: string): string {
	const v = value.toLowerCase();
	if (lang.startsWith('fr') && CASTLE_TYPES_FR[v]) return CASTLE_TYPES_FR[v];
	return v.replace(/_/g, ' ');
}

interface FortDetailProps {
	fort: Fort;
	forts: Fort[];
	isFavorite: boolean;
	fortTitle: (fort: Fort) => string;
	onToggleFavorite: () => void;
	onClose: () => void;
	onBack?: () => void;
	onSelect: (fort: Fort) => void;
	onZoomTo: () => void;
	onOutline: (shapes: [number, number][][] | null) => void;
	onHover: (fort: Fort | null) => void;
}

export default function FortDetail({
	fort,
	forts,
	isFavorite,
	fortTitle,
	onToggleFavorite,
	onClose,
	onBack,
	onSelect,
	onZoomTo,
	onOutline,
	onHover,
}: FortDetailProps) {
	const { t, i18n } = useTranslation();
	const lang = i18n.language;
	const [enrichment, setEnrichment] = useState<{ id: string; data: Enrichment | null } | null>(null);
	const [osm, setOsm] = useState<{ id: string; data: OsmDetails | null } | null>(null);
	const [lightbox, setLightbox] = useState<number | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setExpanded(false);
		setLightbox(null);
		enrichFort(fort, lang)
			.then(data => !cancelled && setEnrichment({ id: fort.id, data }))
			.catch(() => !cancelled && setEnrichment({ id: fort.id, data: null }));
		fetchOsmDetails(fort)
			.then(data => {
				if (cancelled) return;
				setOsm({ id: fort.id, data });
				onOutline(data.shapes.length ? data.shapes : null);
			})
			.catch(() => !cancelled && setOsm({ id: fort.id, data: null }));
		return () => {
			cancelled = true;
			onOutline(null);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fort.id, lang]);

	const info = enrichment?.id === fort.id ? enrichment : null;
	const details = osm?.id === fort.id ? osm : null;
	const tags = details?.data?.tags ?? {};
	const photos = info ? (info.data?.photos ?? []) : null;

	const nearby = useMemo(() => nearestForts(forts, fort, 6, fort.idx), [forts, fort]);

	const title = fortTitle(fort);
	const localName = tags[`name:${lang}`];
	const subtitle = [
		localName && localName !== title ? localName : '',
		fort.name && title !== fort.name ? fort.name : '',
	]
		.filter(Boolean)
		.join(' · ');

	const flash = (msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 1800);
	};

	const share = async () => {
		const url = fortUrl(fort.id);
		if (navigator.share) {
			try {
				await navigator.share({ title, url });
				return;
			} catch {
				/* cancelled: fall back to copying */
			}
		}
		await navigator.clipboard?.writeText(url);
		flash(t('detail.copied'));
	};

	const built =
		fort.date ||
		tags.start_date ||
		(info?.data?.inception ? formatYear(info.data.inception, lang) : '') ||
		(fort.year ? formatYear(fort.year, lang) : '');

	const facts: { label: string; value: React.ReactNode }[] = [];
	const push = (label: string, value: React.ReactNode | undefined | null | false) => {
		if (value) facts.push({ label, value });
	};
	push(t('detail.built'), built);
	push(
		t('detail.castleType'),
		fort.castleType
			? humanize(fort.castleType, lang)
			: tags.bunker_type
				? humanize(tags.bunker_type, lang)
				: '',
	);
	push(t('detail.architect'), tags.architect);
	push(t('detail.condition'), fort.flags & FLAG_RUINS ? t('detail.ruins') : '');
	push(
		t('detail.heritage'),
		tags.protection_title ||
			tags['heritage:operator']?.toUpperCase() ||
			(tags.heritage ? `${t('detail.yes')} (${tags.heritage})` : ''),
	);
	push(t('detail.openingHours'), tags.opening_hours);
	push(t('detail.fee'), tags.fee === 'yes' ? t('detail.yes') : tags.fee === 'no' ? t('detail.no') : tags.fee);
	push(t('detail.operator'), tags.operator);
	push(
		t('detail.height'),
		tags.height ? `${tags.height}${/^\d+(\.\d+)?$/.test(tags.height) ? ' m' : ''}` : '',
	);
	push(t('detail.elevation'), tags.ele ? `${tags.ele}${/^\d+(\.\d+)?$/.test(tags.ele) ? ' m' : ''}` : '');
	push(t('detail.phone'), tags.phone || tags['contact:phone']);
	const website = fort.website || tags.website || tags['contact:website'];

	const searchName = [fort.name || t(`categories.${fort.cat}`), fort.city || countryName(fort.country, 'en')]
		.filter(Boolean)
		.join(' ');
	const links = [
		{ label: 'OpenStreetMap', url: `https://www.openstreetmap.org/${fort.osmType}/${fort.osmId}` },
		info?.data?.summary ? { label: 'Wikipédia', url: info.data.summary.url } : null,
		fort.wikidata ? { label: 'Wikidata', url: `https://www.wikidata.org/wiki/${fort.wikidata}` } : null,
		website ? { label: t('detail.website'), url: website } : null,
		{
			label: t('detail.googleImages'),
			url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchName)}`,
		},
		{
			label: t('detail.googleSearch'),
			url: `https://www.google.com/search?q=${encodeURIComponent(searchName)}`,
		},
	].filter((l): l is { label: string; url: string } => Boolean(l));

	const actionClass =
		'flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/5';
	const iconWrap = 'flex size-10 items-center justify-center rounded-full';

	return (
		<article className="relative flex min-h-0 flex-1 animate-fade-in flex-col">
			<div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
				<div className="relative">
					<PhotoHero fort={fort} photos={photos} onOpen={i => setLightbox(i)} />
					<div className="absolute top-3 right-3 flex gap-1.5">
						{onBack && (
							<button
								type="button"
								onClick={onBack}
								className="rounded-full bg-black/45 p-1.5 text-white backdrop-blur hover:bg-black/65"
								aria-label={t('detail.back')}
								title={t('detail.back')}
							>
								<ChevronLeft size={18} />
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="rounded-full bg-black/45 p-1.5 text-white backdrop-blur hover:bg-black/65"
							aria-label={t('detail.close')}
							title={t('detail.close')}
						>
							<CloseIcon size={18} />
						</button>
					</div>
				</div>

				<div className="px-4 pt-4 pb-2">
					<div className="flex items-start gap-3">
						<CategoryGlyph cat={fort.cat} size={40} className="mt-0.5" />
						<div className="min-w-0 flex-1">
							<h2
								className={`font-display text-[22px] leading-tight font-semibold text-balance ${fort.name ? '' : 'italic'}`}
							>
								{title}
							</h2>
							{subtitle && (
								<p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
							)}
						</div>
					</div>

					<div className="mt-3 flex flex-wrap gap-1.5">
						<span
							className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
							style={{ background: CATEGORIES[fort.cat].color }}
						>
							{t(`categories.${fort.cat}`)}
						</span>
						{fort.flags & FLAG_RUINS ? (
							<span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-200">
								{t('detail.ruins')}
							</span>
						) : null}
						{fort.flags & FLAG_HERITAGE ? (
							<span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
								★ {t('detail.protected')}
							</span>
						) : null}
						{fort.flags & FLAG_VISIT ? (
							<span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
								{t('detail.visitable')}
							</span>
						) : null}
					</div>

					{(fort.country || fort.city) && (
						<p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
							{fort.country && (
								<>
									{flagEmoji(fort.country)} {countryName(fort.country, lang)}
								</>
							)}
							{fort.city ? ` · ${fort.city}` : ''}
						</p>
					)}
				</div>

				{/* Quick actions */}
				<div className="mx-2 flex border-y border-stone-200/80 py-1 dark:border-white/10">
					<a
						className={actionClass}
						href={`https://www.google.com/maps/dir/?api=1&destination=${fort.lat},${fort.lon}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className={`${iconWrap} bg-brand-600 text-white`}>
							<DirectionsIcon size={18} />
						</span>
						{t('detail.directions')}
					</a>
					<a
						className={actionClass}
						href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${fort.lat},${fort.lon}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className={`${iconWrap} bg-stone-100 text-brand-700 dark:bg-white/10 dark:text-brand-300`}>
							<StreetViewIcon size={18} />
						</span>
						{t('detail.streetView')}
					</a>
					<button type="button" className={actionClass} onClick={onToggleFavorite} aria-pressed={isFavorite}>
						<span
							className={`${iconWrap} bg-stone-100 dark:bg-white/10 ${isFavorite ? 'text-amber-500' : 'text-brand-700 dark:text-brand-300'}`}
						>
							{isFavorite ? <StarFilledIcon size={18} /> : <StarIcon size={18} />}
						</span>
						{isFavorite ? t('detail.saved') : t('detail.save')}
					</button>
					<button type="button" className={actionClass} onClick={share}>
						<span className={`${iconWrap} bg-stone-100 text-brand-700 dark:bg-white/10 dark:text-brand-300`}>
							<ShareIcon size={18} />
						</span>
						{t('detail.share')}
					</button>
				</div>

				{/* About */}
				<section className="px-4 pt-4">
					{!info ? (
						<div className="space-y-2 text-stone-400">
							<div className="skeleton h-3.5 w-full rounded" />
							<div className="skeleton h-3.5 w-11/12 rounded" />
							<div className="skeleton h-3.5 w-4/5 rounded" />
						</div>
					) : info.data?.summary ? (
						<div>
							<h3 className="mb-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase">
								{t('detail.about')}
							</h3>
							<p
								className={`text-[14px] leading-relaxed text-stone-700 dark:text-stone-300 ${expanded ? '' : 'line-clamp-6'}`}
							>
								{info.data.summary.extract}
							</p>
							<div className="mt-1.5 flex items-center gap-3 text-sm">
								{!expanded && info.data.summary.extract.length > 320 && (
									<button
										type="button"
										onClick={() => setExpanded(true)}
										className="font-medium text-stone-700 hover:underline dark:text-stone-200"
									>
										{t('detail.showMore')}
									</button>
								)}
								<a
									href={info.data.summary.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-300"
								>
									{t('detail.readMore')}
									{info.data.summary.lang !== lang.slice(0, 2) ? ` (${info.data.summary.lang})` : ''}
									<ExternalIcon size={14} />
								</a>
							</div>
						</div>
					) : info.data?.wikidataDescription ? (
						<p className="text-sm text-stone-600 italic dark:text-stone-300">
							{info.data.wikidataDescription}
						</p>
					) : null}
				</section>

				{/* Facts */}
				{(facts.length > 0 || website) && (
					<section className="px-4 pt-5">
						<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('detail.facts')}
						</h3>
						<dl className="divide-y divide-stone-100 rounded-xl border border-stone-200 text-sm dark:divide-white/5 dark:border-white/10">
							{facts.map(f => (
								<div key={f.label} className="flex gap-3 px-3 py-2">
									<dt className="w-32 shrink-0 text-stone-500 dark:text-stone-400">{f.label}</dt>
									<dd className="min-w-0 flex-1 break-words">{f.value}</dd>
								</div>
							))}
							{website && (
								<div className="flex gap-3 px-3 py-2">
									<dt className="w-32 shrink-0 text-stone-500 dark:text-stone-400">{t('detail.website')}</dt>
									<dd className="min-w-0 flex-1 truncate">
										<a
											href={website}
											target="_blank"
											rel="noopener noreferrer"
											className="text-brand-700 hover:underline dark:text-brand-300"
										>
											{website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
										</a>
									</dd>
								</div>
							)}
						</dl>
						{!details && <p className="mt-2 text-xs text-stone-400">{t('detail.loadingInfo')}</p>}
						{details?.data?.shapes.length ? (
							<p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
								<span className="inline-block h-2 w-4 rounded-sm border-2 border-brand-500 bg-brand-500/20" />
								{t('detail.outline')}
							</p>
						) : null}
					</section>
				)}

				{/* Links */}
				<section className="px-4 pt-5">
					<h3 className="mb-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
						{t('detail.links')}
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{links.map(l => (
							<a
								key={l.label}
								href={l.url}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:hover:bg-white/5"
							>
								{l.label}
								<ExternalIcon size={12} className="text-stone-400" />
							</a>
						))}
					</div>
				</section>

				{/* Nearby */}
				{nearby.length > 0 && (
					<section className="px-2 pt-5">
						<h3 className="mb-1 px-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
							{t('detail.nearby')}
						</h3>
						<ul onMouseLeave={() => onHover(null)}>
							{nearby.map(({ fort: f, km }) => (
								<li key={f.idx}>
									<button
										type="button"
										onClick={() => onSelect(f)}
										onMouseEnter={() => onHover(f)}
										className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-stone-100 dark:hover:bg-white/5"
									>
										<CategoryGlyph cat={f.cat} size={30} />
										<span className="min-w-0 flex-1">
											<span
												className={`block truncate text-sm font-medium ${f.name ? '' : 'text-stone-500 italic'}`}
											>
												{fortTitle(f)}
											</span>
											<span className="block truncate text-xs text-stone-500">
												{t(`categories.${f.cat}`)}
											</span>
										</span>
										<span className="text-xs font-medium text-stone-500 tabular-nums">
											{formatDistance(km, lang)}
										</span>
									</button>
								</li>
							))}
						</ul>
					</section>
				)}

				<footer className="mt-4 flex items-center justify-between gap-2 border-t border-stone-200/80 px-4 py-3 text-xs text-stone-500 dark:border-white/10">
					<button
						type="button"
						onClick={async () => {
							await navigator.clipboard?.writeText(`${fort.lat.toFixed(5)}, ${fort.lon.toFixed(5)}`);
							flash(t('detail.coordsCopied'));
						}}
						className="inline-flex items-center gap-1.5 hover:text-stone-800 dark:hover:text-stone-200"
						title={t('detail.copyCoords')}
					>
						<CopyIcon size={14} />
						<span className="tabular-nums">{formatCoords(fort.lat, fort.lon)}</span>
					</button>
					<button
						type="button"
						onClick={onZoomTo}
						className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline dark:text-brand-300"
					>
						<TargetIcon size={14} />
						{t('detail.zoomTo')}
					</button>
				</footer>
			</div>

			{toast && (
				<div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 animate-slide-up rounded-full bg-stone-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-stone-900">
					{toast}
				</div>
			)}
			{lightbox !== null && photos && photos.length > 0 && (
				<Lightbox photos={photos} index={lightbox} onClose={() => setLightbox(null)} />
			)}
		</article>
	);
}
