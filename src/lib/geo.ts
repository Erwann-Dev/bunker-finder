import type { LatLon } from './types';

const R = 6371; // km

export function distanceKm(a: LatLon, b: LatLon): number {
	const toRad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * toRad;
	const dLon = (b.lon - a.lon) * toRad;
	const s =
		Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function formatDistance(km: number, lang: string): string {
	const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: km < 10 ? 1 : 0 });
	if (km < 1) return `${Math.round(km * 1000)} m`;
	return `${nf.format(km)} km`;
}

export function formatCoords(lat: number, lon: number): string {
	const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
	return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

/** Slippy-map tile coordinates (fractional) for a point. */
export function tileXY(lat: number, lon: number, z: number): { x: number; y: number } {
	const n = 2 ** z;
	const x = ((lon + 180) / 360) * n;
	const latRad = (lat * Math.PI) / 180;
	const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
	return { x, y };
}
