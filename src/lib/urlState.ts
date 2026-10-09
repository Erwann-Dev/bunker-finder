// Shareable state lives in the URL hash: #f=w123&m=48.85,2.35,12

export interface UrlState {
	fortId: string | null;
	view: { lat: number; lon: number; zoom: number } | null;
}

export function readUrlState(): UrlState {
	const params = new URLSearchParams(window.location.hash.slice(1));
	const fortId = params.get('f');
	const m = params.get('m')?.split(',').map(Number);
	const view = m && m.length === 3 && m.every(Number.isFinite) ? { lat: m[0], lon: m[1], zoom: m[2] } : null;
	return { fortId: fortId && /^[nwr]\d+$/.test(fortId) ? fortId : null, view };
}

export function writeUrlState(state: UrlState) {
	const params = new URLSearchParams();
	if (state.fortId) params.set('f', state.fortId);
	if (state.view)
		params.set(
			'm',
			`${state.view.lat.toFixed(5)},${state.view.lon.toFixed(5)},${Math.round(state.view.zoom)}`,
		);
	const hash = params.toString().replace(/%2C/g, ',');
	const url = `${window.location.pathname}${window.location.search}${hash ? '#' + hash : ''}`;
	window.history.replaceState(null, '', url);
}

export function fortUrl(fortId: string): string {
	return `${window.location.origin}${window.location.pathname}#f=${fortId}`;
}
