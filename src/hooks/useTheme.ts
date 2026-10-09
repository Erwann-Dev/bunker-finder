import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const KEY = 'bf-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readMode(): ThemeMode {
	try {
		const v = localStorage.getItem(KEY);
		if (v === 'light' || v === 'dark' || v === 'system') return v;
	} catch {
		/* ignore */
	}
	return 'system';
}

export function useTheme() {
	const [mode, setMode] = useState<ThemeMode>(readMode);
	const [systemDark, setSystemDark] = useState(() => media().matches);

	useEffect(() => {
		const mq = media();
		const onChange = () => setSystemDark(mq.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	const isDark = mode === 'dark' || (mode === 'system' && systemDark);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', isDark);
		try {
			localStorage.setItem(KEY, mode);
		} catch {
			/* ignore */
		}
	}, [isDark, mode]);

	return { mode, setMode, isDark };
}
