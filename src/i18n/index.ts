import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en';
import frTranslation from './locales/fr';

i18n
	// detect user language
	.use(LanguageDetector)
	// pass the i18n instance to react-i18next
	.use(initReactI18next)
	// init i18next
	.init({
		resources: {
			en: {
				translation: enTranslation,
			},
			fr: {
				translation: frTranslation,
			},
		},
		fallbackLng: 'en',
		interpolation: {
			escapeValue: false, // not needed for React
		},
	});

export default i18n;
