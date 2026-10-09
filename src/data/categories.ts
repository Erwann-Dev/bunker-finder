// Category order must match scripts/build-data.mjs
export const CATEGORY_IDS = ['castle', 'manor', 'fort', 'bunker', 'wall', 'tower', 'other'] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryMeta {
	id: CategoryId;
	color: string;
	/** 24×24 SVG path, drawn in white on the category colour. */
	icon: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
	castle: {
		id: 'castle',
		color: '#c2410c',
		icon: 'M5 21V10.5L3.5 9V4h3v2.5h2.5V4h3v2.5H15V4h3v2.5h2.5V4H23v5l-1.5 1.5V21h-6v-4.5a3.5 3.5 0 0 0-7 0V21z',
	},
	manor: {
		id: 'manor',
		color: '#9333ea',
		icon: 'M2 21v-9l3-4 3 4v-1.5L12 4l4 6.5V12l3-4 3 4v9h-7.5v-4.5a2.5 2.5 0 0 0-5 0V21z',
	},
	fort: {
		id: 'fort',
		color: '#2563eb',
		icon: 'M12 2.5 22 9.6 18.2 21H5.8L2 9.6zm0 5.2-5 3.6 1.9 5.7h6.2l1.9-5.7z',
	},
	bunker: {
		id: 'bunker',
		color: '#4d7c0f',
		icon: 'M2 20a10 10 0 0 1 20 0zm5.5-5.5v2h9v-2z',
	},
	wall: {
		id: 'wall',
		color: '#78716c',
		icon: 'M2 9h20v12H2zm0-5h4.5v3.5H2zm7.75 0h4.5v3.5h-4.5zM17.5 4H22v3.5h-4.5zM4 11.5V14h7v-2.5zm9 0V14h7v-2.5zM4 16.5V19h3v-2.5zm5 0V19h6v-2.5zm8 0V19h3v-2.5z',
	},
	tower: {
		id: 'tower',
		color: '#0e7490',
		icon: 'M7 22V9L5.5 7.5V2h3v2.5H11V2h2v2.5h2.5V2h3v5.5L17 9v13h-3.5v-4a1.5 1.5 0 0 0-3 0v4z',
	},
	other: {
		id: 'other',
		color: '#be185d',
		icon: 'M12 2 20.5 5v6.2c0 5.3-3.6 9.7-8.5 10.8-4.9-1.1-8.5-5.5-8.5-10.8V5z',
	},
};

export const ERA_IDS = ['antiquity', 'medieval', 'modern', 'c19', 'c20'] as const;
export type EraId = (typeof ERA_IDS)[number];

export function eraOf(year: number): EraId | null {
	if (!year) return null;
	if (year < 500) return 'antiquity';
	if (year < 1500) return 'medieval';
	if (year < 1800) return 'modern';
	if (year < 1900) return 'c19';
	return 'c20';
}

export const FLAG_RUINS = 1;
export const FLAG_HERITAGE = 2;
export const FLAG_WIKI = 4;
export const FLAG_IMAGE = 8;
export const FLAG_VISIT = 16;
