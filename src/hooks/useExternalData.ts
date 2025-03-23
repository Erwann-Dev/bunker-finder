import { useState } from 'react';
import {
	FortificationType,
	WikipediaApiResponse,
	WikidataApiResponse,
} from '../types/fortification';

interface UseExternalDataResult {
	loading: boolean;
	error: Error | null;
	enrichFortification: (fort: FortificationType) => Promise<FortificationType>;
	fetchGoogleImages: (searchTerm: string) => Promise<string[]>;
}

/**
 * Hook for fetching external data about fortifications
 */
const useExternalData = (): UseExternalDataResult => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	/**
	 * Fetch images from Google Images via a proxy service
	 * This uses a public server-side proxy to avoid CORS issues
	 */
	const fetchGoogleImages = async (searchTerm: string): Promise<string[]> => {
		try {
			// Use reliable sources that don't require CORS proxies
			// Focus on Wikimedia Commons which has good fortification images
			const searchWikimediaCommons = async (): Promise<string[]> => {
				try {
					// Direct Wikimedia Commons API search
					const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
						searchTerm + ' fortification',
					)}&srnamespace=6&srlimit=5&format=json&origin=*`;

					const response = await fetch(url);
					if (!response.ok) return [];

					const data = await response.json();
					if (!data?.query?.search) return [];

					// Process search results to get image URLs
					const imageUrls = await Promise.all(
						data.query.search.slice(0, 5).map(async (item: any) => {
							const filename = item.title.replace('File:', '');
							const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(
								filename,
							)}&prop=imageinfo&iiprop=url&format=json&origin=*`;

							try {
								const imageInfoResp = await fetch(imageInfoUrl);
								const imageData = await imageInfoResp.json();
								const pages = imageData.query?.pages || {};
								const pageId = Object.keys(pages)[0];
								if (
									pageId &&
									pageId !== '-1' &&
									pages[pageId]?.imageinfo?.[0]?.url
								) {
									return pages[pageId].imageinfo[0].url;
								}
								return null;
							} catch (e) {
								console.error('Error fetching image info:', e);
								return null;
							}
						}),
					);

					return imageUrls.filter((url): url is string => url !== null);
				} catch (err) {
					console.error('Error searching Wikimedia Commons:', err);
					return [];
				}
			};

			// Try Wikimedia Commons search first
			const wikimediaImages = await searchWikimediaCommons();
			if (wikimediaImages.length > 0) {
				return wikimediaImages;
			}

			// Fallback to preset fortification images if nothing was found
			console.log('Using fallback fortification images');
			return [
				'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Chateau_de_Bonaguil_vu_du_ciel.jpg/800px-Chateau_de_Bonaguil_vu_du_ciel.jpg',
				'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Maginot_Line_Fort_Hackenberg.jpg/800px-Maginot_Line_Fort_Hackenberg.jpg',
				'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fort_Boyard_Charente_Maritime.jpg/800px-Fort_Boyard_Charente_Maritime.jpg',
				'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tour_Vauban_de_Camaret.jpg/800px-Tour_Vauban_de_Camaret.jpg',
				'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Fortifications_Vauban_Briançon.jpg/800px-Fortifications_Vauban_Briançon.jpg',
			];
		} catch (err) {
			console.error('Error fetching fortification images:', err);
			return [];
		}
	};

	/**
	 * Fetch data from Wikipedia API
	 */
	const fetchWikipediaData = async (
		title: string,
	): Promise<WikipediaApiResponse> => {
		try {
			const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
				title,
			)}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Wikipedia API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (err) {
			console.error('Error fetching from Wikipedia:', err);
			return {};
		}
	};

	/**
	 * Fetch data from Wikidata API
	 */
	const fetchWikidataData = async (
		wikidataId: string,
	): Promise<WikidataApiResponse> => {
		try {
			const url = `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Wikidata API error: ${response.statusText}`);
			}

			return await response.json();
		} catch (err) {
			console.error('Error fetching from Wikidata:', err);
			return {};
		}
	};

	/**
	 * Fetch images from Wikipedia
	 */
	const fetchWikipediaImages = async (title: string): Promise<string[]> => {
		try {
			const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
				title,
			)}&prop=images&format=json&origin=*`;

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`Wikipedia images API error: ${response.statusText}`);
			}

			const data = await response.json();
			const pages = data.query?.pages || {};
			const pageId = Object.keys(pages)[0];

			if (!pageId || !pages[pageId]?.images) {
				return [];
			}

			// Get details for each image
			const imageNames = pages[pageId].images
				.map((img: { title: string }) => img.title)
				.filter(
					(title: string) =>
						!title.includes('Icon') &&
						!title.includes('Logo') &&
						!title.includes('Pictogram') &&
						(title.includes('.jpg') ||
							title.includes('.png') ||
							title.includes('.jpeg')),
				);

			if (imageNames.length === 0) {
				return [];
			}

			// Fetch image URLs for each image name
			const imageUrlsPromises = imageNames
				.slice(0, 5)
				.map(async (title: string) => {
					const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
						title,
					)}&prop=imageinfo&iiprop=url&format=json&origin=*`;

					const imgResponse = await fetch(imgUrl);
					const imgData = await imgResponse.json();
					const imgPages = imgData.query?.pages || {};
					const imgPageId = Object.keys(imgPages)[0];

					if (!imgPageId || !imgPages[imgPageId]?.imageinfo?.[0]?.url) {
						return null;
					}

					return imgPages[imgPageId].imageinfo[0].url;
				});

			const imageUrls = await Promise.all(imageUrlsPromises);
			return imageUrls.filter((url): url is string => url !== null);
		} catch (err) {
			console.error('Error fetching Wikipedia images:', err);
			return [];
		}
	};

	/**
	 * Enrich a fortification with external data
	 */
	const enrichFortification = async (
		fort: FortificationType,
	): Promise<FortificationType> => {
		try {
			setLoading(true);
			setError(null);

			const { properties } = fort;
			const fortCopy = { ...fort };

			// Skip if already fetched data recently (within 1 day)
			if (properties.lastFetched) {
				const lastFetched = new Date(properties.lastFetched);
				const oneDayAgo = new Date();
				oneDayAgo.setDate(oneDayAgo.getDate() - 1);

				if (lastFetched > oneDayAgo) {
					return fortCopy;
				}
			}

			// Changed order: Try to fetch Google Images first for immediate visual feedback
			const searchTerm =
				properties.name ||
				properties.wikipedia?.split(':').slice(1).join(':') ||
				properties.denomination ||
				properties.chpnom ||
				`Fortification at ${fort.geometry.coordinates?.[1]}, ${fort.geometry.coordinates?.[0]}`;

			try {
				const googleImages = await fetchGoogleImages(searchTerm);
				if (googleImages.length > 0) {
					fortCopy.properties.imageUrls = googleImages;
					fortCopy.properties.imageSource = 'google';
				}
			} catch (imgErr) {
				console.error('Error fetching Google Images:', imgErr);
			}

			// Process Wikidata if available
			if (properties.wikidata) {
				const wikidataResponse = await fetchWikidataData(properties.wikidata);

				if (
					wikidataResponse.entities &&
					wikidataResponse.entities[properties.wikidata]
				) {
					const entity = wikidataResponse.entities[properties.wikidata];

					// Extract period if available (P2348 = period)
					if (entity.claims?.P2348) {
						const periodClaim = entity.claims.P2348[0];
						if (periodClaim?.mainsnak?.datavalue?.value) {
							fortCopy.properties.period = String(
								periodClaim.mainsnak.datavalue.value,
							);
						}
					}

					// Extract architectural style if available (P149 = architectural style)
					if (entity.claims?.P149) {
						const styleClaim = entity.claims.P149[0];
						if (styleClaim?.mainsnak?.datavalue?.value) {
							fortCopy.properties.constructionStyle = String(
								styleClaim.mainsnak.datavalue.value,
							);
						}
					}
				}
			}

			// Process Wikipedia if available
			if (properties.wikipedia) {
				// Extract the title from the Wikipedia property (format is usually "lang:Title")
				const wikipediaTitle = properties.wikipedia
					.split(':')
					.slice(1)
					.join(':');

				// Fetch Wikipedia summary
				const wikipediaResponse = await fetchWikipediaData(wikipediaTitle);

				if (wikipediaResponse.query?.pages) {
					const pageId = Object.keys(wikipediaResponse.query.pages)[0];
					const page = wikipediaResponse.query.pages[pageId];

					if (page?.extract) {
						fortCopy.properties.description = page.extract;
					}

					if (page?.thumbnail?.source) {
						fortCopy.properties.imageUrls = fortCopy.properties.imageUrls || [];
						fortCopy.properties.imageUrls.push(page.thumbnail.source);
						fortCopy.properties.imageSource = 'wikipedia';
					}
				}

				// Fetch additional images
				const images = await fetchWikipediaImages(wikipediaTitle);
				if (images.length > 0) {
					fortCopy.properties.imageUrls = images;
					fortCopy.properties.imageSource = 'wikipedia';
				}

				// Add external link to Wikipedia
				const lang = properties.wikipedia.split(':')[0];
				const wikipediaUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
					wikipediaTitle,
				)}`;

				fortCopy.properties.externalLinks =
					fortCopy.properties.externalLinks || [];
				fortCopy.properties.externalLinks.push({
					title: 'Wikipedia',
					url: wikipediaUrl,
				});
			}

			// Add record of when we fetched this data
			fortCopy.properties.lastFetched = new Date().toISOString();

			return fortCopy;
		} catch (err) {
			const error =
				err instanceof Error
					? err
					: new Error('Unknown error enriching fortification');
			setError(error);
			console.error('Error enriching fortification:', error);
			return fort; // Return original fort on error
		} finally {
			setLoading(false);
		}
	};

	return {
		loading,
		error,
		enrichFortification,
		fetchGoogleImages,
	};
};

export default useExternalData;
