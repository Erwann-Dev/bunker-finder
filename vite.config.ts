import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	css: {
		devSourcemap: true,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					leaflet: ['leaflet', 'supercluster'],
					react: ['react', 'react-dom', 'i18next', 'react-i18next', 'i18next-browser-languagedetector'],
				},
			},
		},
	},
});
