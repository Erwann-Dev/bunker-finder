import { useCallback, useState } from 'react';

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function useLocalStorage<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
	const [value, setValue] = useState<T>(() => read(key, fallback));
	const set = useCallback(
		(next: T | ((prev: T) => T)) => {
			setValue(prev => {
				const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
				try {
					localStorage.setItem(key, JSON.stringify(resolved));
				} catch {
					/* storage may be unavailable (private mode) */
				}
				return resolved;
			});
		},
		[key],
	);
	return [value, set];
}
