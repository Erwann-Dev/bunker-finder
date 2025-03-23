import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './App.css';
import FortificationMap from './components/FortificationMap';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import useGeoJSON from './hooks/useGeoJSON';

// Import i18n instance
import './i18n';

function App() {
	const { t } = useTranslation();
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeFilters, setActiveFilters] = useState<
		Record<string, string | null>
	>({});
	const [isMobile, setIsMobile] = useState(false);
	const [appLoaded, setAppLoaded] = useState(false);

	// Force initial resize after app loaded
	useEffect(() => {
		// Mark app as loaded
		setAppLoaded(true);

		// Sequence of resize operations with increasing delays
		const delays = [0, 100, 500, 1000, 2000];

		// Force window resize events
		const timers = delays.map(delay =>
			setTimeout(() => {
				window.dispatchEvent(new Event('resize'));
			}, delay),
		);

		return () => {
			timers.forEach(clearTimeout);
		};
	}, []);

	// Load GeoJSON data with enhanced properties
	const {
		fortifications,
		loading,
		error,
		retry,
		enrichFortification,
		filters,
		isDataEnriched,
	} = useGeoJSON('assets/export2.geojson');

	// Check if we're on mobile
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
			// Auto-close sidebar on mobile
			if (window.innerWidth < 768) {
				setIsSidebarOpen(false);
			} else {
				setIsSidebarOpen(true);
			}
		};

		// Initial check
		checkIfMobile();

		// Listen for window resize
		window.addEventListener('resize', checkIfMobile);

		// Cleanup
		return () => window.removeEventListener('resize', checkIfMobile);
	}, []);

	// Handle sidebar toggle
	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	// Handle search and filter changes
	const handleSearch = (search: string) => {
		setSearchTerm(search);
		// Auto-close sidebar on mobile after search
		if (isMobile) {
			setIsSidebarOpen(false);
		}
	};

	const handleFilterChange = (filters: Record<string, string | null>) => {
		setActiveFilters(filters);
		// Auto-close sidebar on mobile after filter selection
		if (isMobile) {
			setIsSidebarOpen(false);
		}
	};

	// Detect and apply dark mode preference
	useEffect(() => {
		if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
			document.documentElement.classList.add('dark');
		}
	}, []);

	// Show loading state
	if (loading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="text-center">
					<div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
					<h2 className="text-xl font-semibold text-gray-800 dark:text-white">
						{t('loading')} ...
					</h2>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
				<div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-12 w-12 text-red-500 mx-auto mb-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
						{t('errors.loadingData')}
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						{error.message}
					</p>
					<button
						onClick={retry}
						className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
					>
						{t('errors.tryAgain')}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
			<Header
				toggleSidebar={toggleSidebar}
				isSidebarOpen={isSidebarOpen}
				isMobile={isMobile}
			/>

			<div
				className="flex flex-1 overflow-hidden relative h-[calc(100vh-4rem)]"
				style={{ minHeight: 0 }}
			>
				{/* Sidebar avec animation */}
				<div
					className={`sidebar-container flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ease-in-out ${
						isSidebarOpen ? 'md:w-72 w-full opacity-100' : 'w-0 opacity-0'
					} ${isMobile ? 'absolute z-20 h-full' : ''}`}
				>
					<div
						className={`md:w-72 w-full h-[calc(100vh-4rem)] overflow-auto ${
							isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
						} transition-transform duration-300 ease-in-out`}
					>
						<Sidebar
							fortifications={fortifications}
							onSearch={handleSearch}
							onFilterChange={handleFilterChange}
							filterGroups={filters}
							isMobile={isMobile}
							onClose={isMobile ? toggleSidebar : undefined}
							isDataEnriched={isDataEnriched}
						/>
					</div>
				</div>

				{/* Backdrop overlay for mobile when sidebar is open */}
				{isMobile && isSidebarOpen && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 z-10 backdrop-blur-sm"
						onClick={toggleSidebar}
						aria-hidden="true"
					/>
				)}

				{/* Main content */}
				<div
					className="flex-1 h-full w-full overflow-hidden transition-all duration-300 ease-in-out rounded-tl-xl shadow-inner"
					style={{ position: 'relative', minHeight: 0 }}
					data-loaded={appLoaded}
				>
					<FortificationMap
						fortifications={fortifications}
						activeFilters={activeFilters}
						searchTerm={searchTerm}
						onEnrichFortification={enrichFortification}
					/>
				</div>
			</div>
		</div>
	);
}

export default App;
