import type { SVGProps } from 'react';
import { CATEGORIES, type CategoryId } from '../data/categories';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: string[], { fill = false }: { fill?: boolean } = {}) {
	return function Icon({ size = 20, ...props }: IconProps) {
		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill={fill ? 'currentColor' : 'none'}
				stroke={fill ? 'none' : 'currentColor'}
				strokeWidth={1.8}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
				{...props}
			>
				{paths.map((d, i) => (
					<path key={i} d={d} />
				))}
			</svg>
		);
	};
}

export const SearchIcon = make(['M21 21l-4.3-4.3', 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z']);
export const CloseIcon = make(['M18 6 6 18', 'M6 6l12 12']);
export const ChevronLeft = make(['M15 18l-6-6 6-6']);
export const ChevronRight = make(['M9 18l6-6-6-6']);
export const ChevronDown = make(['M6 9l6 6 6-6']);
export const PlusIcon = make(['M12 5v14', 'M5 12h14']);
export const MinusIcon = make(['M5 12h14']);
export const LocateIcon = make([
	'M12 2v3',
	'M12 19v3',
	'M2 12h3',
	'M19 12h3',
	'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
	'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
]);
export const LayersIcon = make(['M12 2 2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']);
export const DiceIcon = make([
	'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
	'M8 8h.01',
	'M16 8h.01',
	'M12 12h.01',
	'M8 16h.01',
	'M16 16h.01',
]);
export const GlobeIcon = make([
	'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
	'M2 12h20',
	'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
]);
export const SunIcon = make([
	'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
	'M12 1v2',
	'M12 21v2',
	'M4.2 4.2l1.4 1.4',
	'M18.4 18.4l1.4 1.4',
	'M1 12h2',
	'M21 12h2',
	'M4.2 19.8l1.4-1.4',
	'M18.4 5.6l1.4-1.4',
]);
export const MoonIcon = make(['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z']);
export const MonitorIcon = make(['M3 4h18v12H3z', 'M8 20h8', 'M12 16v4']);
export const InfoIcon = make(['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01']);
export const StarIcon = make(['M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z']);
export const StarFilledIcon = make(
	['M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'],
	{
		fill: true,
	},
);
export const DirectionsIcon = make(['M3 11l19-9-9 19-2-8-8-2z']);
export const ShareIcon = make([
	'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	'M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	'M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
	'M8.6 13.5l6.8 4',
	'M15.4 6.5l-6.8 4',
]);
export const StreetViewIcon = make([
	'M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	'M9 21v-6H7.5v-4a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v4H15v6',
	'M4 18.5c-1.2.5-2 1.1-2 1.8C2 21.8 6.5 23 12 23s10-1.2 10-2.7c0-.7-.8-1.3-2-1.8',
]);
export const ExternalIcon = make([
	'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
	'M15 3h6v6',
	'M10 14 21 3',
]);
export const CopyIcon = make(['M9 9h11v11H9z', 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1']);
export const FilterIcon = make(['M3 5h18', 'M6 12h12', 'M10 19h4']);
export const PinIcon = make([
	'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z',
	'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
]);
export const TargetIcon = make([
	'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
	'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
]);
export const ImageIcon = make(['M3 5h18v14H3z', 'M3 16l5-5 4 4 3-3 6 6', 'M15.5 9.5h.01']);
export const SatelliteIcon = make([
	'M13 7 9 3 5 7l4 4',
	'M17 11l4 4-4 4-4-4',
	'M8 12l4 4 6-6-4-4-6 6z',
	'M16 8l3-3',
	'M9 21a6 6 0 0 0-6-6',
]);
export const CalendarIcon = make(['M4 5h16v16H4z', 'M16 3v4', 'M8 3v4', 'M4 11h16']);
export const ClockIcon = make(['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2']);
export const LinkIcon = make([
	'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7',
	'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
]);
export const ListIcon = make(['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']);

export function Logo({ size = 36 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
			<rect width="64" height="64" rx="16" className="fill-brand-700 dark:fill-brand-500" />
			<path
				className="fill-white"
				d="M14 52V26l-3-3V12h6v5h5v-5h6v5h8v-5h6v5h5v-5h6v11l-3 3v26H38V42a6 6 0 0 0-12 0v10z"
			/>
		</svg>
	);
}

export function CategoryGlyph({
	cat,
	size = 32,
	className = '',
}: {
	cat: CategoryId;
	size?: number;
	className?: string;
}) {
	const meta = CATEGORIES[cat];
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center rounded-full shadow-sm ring-2 ring-white/80 dark:ring-white/10 ${className}`}
			style={{ width: size, height: size, background: meta.color }}
			aria-hidden="true"
		>
			<svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24">
				<path d={meta.icon} fill="#fff" fillRule="evenodd" />
			</svg>
		</span>
	);
}
