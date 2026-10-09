/** Lower-cases and strips accents so that "Château" matches "chateau". */
export function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’'`´]/g, "'")
		.replace(/[-_]/g, ' ')
		.toLowerCase()
		.trim();
}

const displayNamesCache = new Map<string, Intl.DisplayNames | null>();

export function countryName(code: string, lang: string): string {
	if (!code) return '';
	let dn = displayNamesCache.get(lang);
	if (dn === undefined) {
		try {
			dn = new Intl.DisplayNames([lang], { type: 'region' });
		} catch {
			dn = null;
		}
		displayNamesCache.set(lang, dn);
	}
	try {
		return dn?.of(code) ?? code;
	} catch {
		return code;
	}
}

export function flagEmoji(code: string): string {
	if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
	return String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0)));
}

export function formatNumber(n: number, lang: string): string {
	return new Intl.NumberFormat(lang).format(n);
}

export function formatYear(year: number, lang: string): string {
	if (!year) return '';
	if (year < 0) return lang.startsWith('fr') ? `${-year} av. J.-C.` : `${-year} BC`;
	return String(year);
}

/** Strips HTML from Commons metadata strings. */
export function stripHtml(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
