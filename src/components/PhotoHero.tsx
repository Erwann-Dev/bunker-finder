import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../data/categories';
import type { Photo } from '../lib/enrich';
import { tileXY } from '../lib/geo';
import type { Fort } from '../lib/types';
import { ChevronLeft, ChevronRight, CloseIcon, ImageIcon, SatelliteIcon } from './icons';

const SAT_ZOOM = 17;

/** Aerial imagery built from a 3×3 block of Esri tiles centred on the fort. */
export function SatellitePreview({ fort, className = '' }: { fort: Fort; className?: string }) {
	const { x, y } = tileXY(fort.lat, fort.lon, SAT_ZOOM);
	const tx = Math.floor(x);
	const ty = Math.floor(y);
	const fx = x - tx;
	const fy = y - ty;
	const tiles = [];
	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			tiles.push(
				<img
					key={`${dx},${dy}`}
					src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${SAT_ZOOM}/${ty + dy}/${tx + dx}`}
					alt=""
					draggable={false}
					className="absolute size-64 max-w-none select-none"
					style={{ left: (dx + 1) * 256, top: (dy + 1) * 256 }}
				/>,
			);
		}
	}
	return (
		<div className={`overflow-hidden bg-stone-800 ${className || 'relative'}`}>
			<div
				className="absolute top-1/2 left-1/2"
				style={{
					width: 768,
					height: 768,
					transform: `translate(${-(256 + fx * 256)}px, ${-(256 + fy * 256)}px)`,
				}}
			>
				{tiles}
			</div>
			<div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
				<div className="size-16 rounded-full border-2 border-white/90 shadow-[0_0_0_2px_rgba(0,0,0,0.25)]" />
			</div>
			<div className="absolute right-1.5 bottom-1 text-[10px] text-white/80 drop-shadow">© Esri, Maxar</div>
		</div>
	);
}

interface PhotoHeroProps {
	fort: Fort;
	photos: Photo[] | null;
	onOpen: (index: number) => void;
}

export default function PhotoHero({ fort, photos, onOpen }: PhotoHeroProps) {
	const { t } = useTranslation();
	const [mode, setMode] = useState<'photo' | 'aerial'>('photo');
	const [index, setIndex] = useState(0);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		setIndex(0);
		setMode('photo');
	}, [fort.idx]);
	useEffect(() => setLoaded(false), [fort.idx, index]);

	const hasPhotos = Boolean(photos && photos.length);
	const showAerial = mode === 'aerial' || (photos !== null && !hasPhotos);
	const photo = hasPhotos ? photos![Math.min(index, photos!.length - 1)] : null;

	return (
		<div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-200 dark:bg-stone-800">
			{showAerial ? (
				<SatellitePreview fort={fort} className="absolute inset-0" />
			) : photos === null ? (
				<div className="skeleton absolute inset-0 text-stone-500" />
			) : (
				photo && (
					<button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => onOpen(index)}>
						{!loaded && <div className="skeleton absolute inset-0 text-stone-500" />}
						<img
							key={photo.thumb}
							src={photo.thumb}
							alt={fort.name}
							onLoad={() => setLoaded(true)}
							className={`size-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
						/>
					</button>
				)
			)}

			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />

			{/* Photo / aerial switch */}
			<div className="absolute top-3 left-3 flex rounded-full bg-black/45 p-0.5 text-xs font-medium text-white backdrop-blur">
				<button
					type="button"
					onClick={() => setMode('photo')}
					disabled={photos !== null && !hasPhotos}
					className={`flex items-center gap-1 rounded-full px-2.5 py-1 disabled:opacity-50 ${!showAerial ? 'bg-white text-stone-900' : ''}`}
				>
					<ImageIcon size={14} />
					{t('detail.photo')}
					{hasPhotos && photos!.length > 1 ? ` ${photos!.length}` : ''}
				</button>
				<button
					type="button"
					onClick={() => setMode('aerial')}
					className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${showAerial ? 'bg-white text-stone-900' : ''}`}
				>
					<SatelliteIcon size={14} />
					{t('detail.aerial')}
				</button>
			</div>

			{!showAerial && hasPhotos && photos!.length > 1 && (
				<>
					<button
						type="button"
						aria-label="‹"
						onClick={() => setIndex(i => (i - 1 + photos!.length) % photos!.length)}
						className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur hover:bg-black/60"
					>
						<ChevronLeft size={18} />
					</button>
					<button
						type="button"
						aria-label="›"
						onClick={() => setIndex(i => (i + 1) % photos!.length)}
						className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur hover:bg-black/60"
					>
						<ChevronRight size={18} />
					</button>
					<div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
						{photos!.slice(0, 12).map((p, i) => (
							<span
								key={p.page}
								className={`size-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/45'}`}
							/>
						))}
					</div>
				</>
			)}

			{!showAerial && photo && (
				<a
					href={photo.page}
					target="_blank"
					rel="noopener noreferrer"
					className="absolute right-2 bottom-1.5 max-w-[60%] truncate text-[10px] text-white/85 drop-shadow hover:underline"
				>
					{photo.nearby ? `${t('detail.nearbyPhotos')} · ` : ''}
					{photo.author ? t('detail.credit', { author: photo.author }) : 'Wikimedia Commons'}
					{photo.license ? ` · ${photo.license}` : ''}
				</a>
			)}

			{photos !== null && !hasPhotos && (
				<div
					className="absolute bottom-2 left-3 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
					style={{ background: CATEGORIES[fort.cat].color }}
				>
					{t('detail.noPhoto')}
				</div>
			)}
		</div>
	);
}

export function Lightbox({
	photos,
	index,
	onClose,
}: {
	photos: Photo[];
	index: number;
	onClose: () => void;
}) {
	const [i, setI] = useState(index);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// Captured first so Escape doesn't also close the details panel.
			e.stopPropagation();
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowRight') setI(v => (v + 1) % photos.length);
			if (e.key === 'ArrowLeft') setI(v => (v - 1 + photos.length) % photos.length);
		};
		window.addEventListener('keydown', onKey, true);
		return () => window.removeEventListener('keydown', onKey, true);
	}, [photos.length, onClose]);
	const photo = photos[i];
	// Portal: the panels use backdrop-filter, which would trap a fixed overlay.
	return createPortal(
		<div
			className="fixed inset-0 z-[2000] flex animate-fade-in flex-col bg-black/90 backdrop-blur"
			onClick={onClose}
		>
			<div className="flex items-center justify-between p-3 text-sm text-white/80">
				<span>
					{i + 1} / {photos.length}
				</span>
				<button
					type="button"
					onClick={onClose}
					className="rounded-full p-2 hover:bg-white/10"
					aria-label="Close"
				>
					<CloseIcon />
				</button>
			</div>
			<div
				className="relative flex min-h-0 flex-1 items-center justify-center px-4"
				onClick={e => e.stopPropagation()}
			>
				<img
					src={photo.thumb}
					alt=""
					className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
				/>
				{photos.length > 1 && (
					<>
						<button
							type="button"
							onClick={() => setI(v => (v - 1 + photos.length) % photos.length)}
							className="absolute left-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
							aria-label="‹"
						>
							<ChevronLeft />
						</button>
						<button
							type="button"
							onClick={() => setI(v => (v + 1) % photos.length)}
							className="absolute right-3 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
							aria-label="›"
						>
							<ChevronRight />
						</button>
					</>
				)}
			</div>
			<div className="p-3 text-center text-xs text-white/70" onClick={e => e.stopPropagation()}>
				<a href={photo.page} target="_blank" rel="noopener noreferrer" className="hover:underline">
					{photo.author || 'Wikimedia Commons'}
					{photo.license ? ` · ${photo.license}` : ''} ↗
				</a>
			</div>
		</div>,
		document.body,
	);
}
