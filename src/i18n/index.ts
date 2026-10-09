import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en';
import fr from './locales/fr';

export const LANGUAGES = [
	{ code: 'fr', label: 'Français' },
	{ code: 'en', label: 'English' },
] as const;

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			en: { translation: en },
			fr: { translation: fr },
		},
		supportedLngs: ['fr', 'en'],
		nonExplicitSupportedLngs: true,
		fallbackLng: 'en',
		returnObjects: true,
		detection: {
			order: ['querystring', 'localStorage', 'navigator'],
			lookupLocalStorage: 'bf-lang',
			caches: ['localStorage'],
			// Browsers may report tags such as "en-US@posix": keep the base language.
			convertDetectedLanguage: (lng: string) => {
				const base = lng.split(/[-_@.]/)[0].toLowerCase();
				return LANGUAGES.some(l => l.code === base) ? base : 'en';
			},
		},
		interpolation: { escapeValue: false },
	});

i18n.on('languageChanged', lng => {
	document.documentElement.lang = lng;
});

export default i18n;
