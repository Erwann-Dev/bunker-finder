import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DiceIcon, GlobeIcon, LayersIcon, LocateIcon, MinusIcon, PlusIcon } from './icons';
import type { BaseLayerId } from './MapView';

interface MapControlsProps {
	layer: BaseLayerId;
	onLayer: (layer: BaseLayerId) => void;
	onZoom: (delta: number) => void;
	onLocate: () => void;
	locating: boolean;
	onRandom: () => void;
	onWorld: () => void;
	/** Hide zoom buttons (touch devices pinch to zoom). */
	compact?: boolean;
	className?: string;
}

const LAYERS: { id: BaseLayerId; key: string; swatch: string }[] = [
	{
		id: 'plan',
		key: 'map.layerPlan',
		swatch: 'linear-gradient(135deg,#f2efe9 0 40%,#cdebb0 40% 70%,#aad3df 70%)',
	},
	{ id: 'canvas', key: 'map.layerCanvas', swatch: 'linear-gradient(135deg,#e8e8e8 0 50%,#c9c9c9 50%)' },
	{
		id: 'satellite',
		key: 'map.layerSatellite',
		swatch: 'linear-gradient(135deg,#3f4b2f 0 45%,#6b6f4a 45% 70%,#1f3b4d 70%)',
	},
	{
		id: 'topo',
		key: 'map.layerTopo',
		swatch: 'repeating-radial-gradient(circle at 30% 70%,#d8c8a0 0 3px,#c2b07f 3px 5px)',
	},
];

const btn =
	'flex size-10 items-center justify-center text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:text-stone-200 dark:hover:bg-white/10 dark:hover:text-white';
const group =
	'glass flex flex-col overflow-hidden rounded-xl divide-y divide-stone-200/70 dark:divide-white/10';

export default function MapControls({
	layer,
	onLayer,
	onZoom,
	onLocate,
	locating,
	onRandom,
	onWorld,
	compact = false,
	className = '',
}: MapControlsProps) {
	const { t } = useTranslation();
	const [layersOpen, setLayersOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!layersOpen) return;
		const onDown = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) setLayersOpen(false);
		};
		window.addEventListener('pointerdown', onDown);
		return () => window.removeEventListener('pointerdown', onDown);
	}, [layersOpen]);

	return (
		<div ref={ref} className={`flex flex-col gap-2 ${className}`}>
			<div className="relative">
				<div className={group}>
					<button
						type="button"
						className={btn}
						onClick={() => setLayersOpen(o => !o)}
						title={t('map.layers')}
						aria-label={t('map.layers')}
						aria-expanded={layersOpen}
					>
						<LayersIcon />
					</button>
				</div>
				{layersOpen && (
					<div className="glass absolute top-0 right-12 w-44 animate-fade-in rounded-xl p-1.5">
						<div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
							{t('map.layers')}
						</div>
						{LAYERS.map(l => (
							<button
								key={l.id}
								type="button"
								onClick={() => {
									onLayer(l.id);
									setLayersOpen(false);
								}}
								className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
									layer === l.id
										? 'bg-brand-50 font-semibold text-brand-800 dark:bg-white/10 dark:text-white'
										: 'hover:bg-stone-100 dark:hover:bg-white/5'
								}`}
							>
								<span
									className="size-7 shrink-0 rounded-md ring-1 ring-black/10"
									style={{ background: l.swatch }}
								/>
								{t(l.key)}
							</button>
						))}
					</div>
				)}
			</div>
			{!compact && (
				<div className={group}>
					<button
						type="button"
						className={btn}
						onClick={() => onZoom(1)}
						title={t('map.zoomIn')}
						aria-label={t('map.zoomIn')}
					>
						<PlusIcon />
					</button>
					<button
						type="button"
						className={btn}
						onClick={() => onZoom(-1)}
						title={t('map.zoomOut')}
						aria-label={t('map.zoomOut')}
					>
						<MinusIcon />
					</button>
				</div>
			)}
			<div className={group}>
				<button
					type="button"
					className={btn}
					onClick={onLocate}
					disabled={locating}
					title={t('map.locate')}
					aria-label={t('map.locate')}
				>
					<LocateIcon className={locating ? 'animate-spin' : ''} />
				</button>
				<button
					type="button"
					className={btn}
					onClick={onRandom}
					title={`${t('map.random')} (R)`}
					aria-label={t('map.random')}
				>
					<DiceIcon />
				</button>
				<button
					type="button"
					className={btn}
					onClick={onWorld}
					title={t('map.world')}
					aria-label={t('map.world')}
				>
					<GlobeIcon />
				</button>
			</div>
		</div>
	);
}
