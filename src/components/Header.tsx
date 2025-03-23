import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
	toggleSidebar: () => void;
	isSidebarOpen: boolean;
	isMobile?: boolean;
}

const Header: React.FC<HeaderProps> = ({
	toggleSidebar,
	isSidebarOpen,
	isMobile = false,
}) => {
	const { t, i18n } = useTranslation();
	const [isDarkMode, setIsDarkMode] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// Detect system dark mode preference
	useEffect(() => {
		const isDark = document.documentElement.classList.contains('dark');
		setIsDarkMode(isDark);
	}, []);

	const toggleDarkMode = () => {
		const newDarkMode = !isDarkMode;
		setIsDarkMode(newDarkMode);

		// Apply dark mode to document
		if (newDarkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	};

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		// Close mobile menu if open
		if (isMobile && isMenuOpen) {
			setIsMenuOpen(false);
		}
	};

	return (
		<header className="bg-white dark:bg-gray-800 shadow-md h-16 flex items-center">
			<div className="container mx-auto px-4 flex justify-between items-center">
				<div className="flex items-center">
					<button
						onClick={toggleSidebar}
						className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 mr-2"
						aria-label={t('header.toggleSidebar')}
					>
						<span className="sr-only">{t('header.toggleSidebar')}</span>
						{isSidebarOpen && !isMobile ? (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
								/>
							</svg>
						)}
					</button>
					<h1
						className={`font-bold text-gray-800 dark:text-white ${
							isMobile ? 'text-lg' : 'text-xl'
						}`}
					>
						{isMobile
							? t('header.titleShort') || t('header.title')
							: t('header.title')}
					</h1>
				</div>

				{/* Desktop menu */}
				{!isMobile && (
					<div className="flex items-center space-x-4">
						{/* Language Switcher */}
						<div className="relative">
							<select
								onChange={e => changeLanguage(e.target.value)}
								value={i18n.language}
								className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-1.5 pr-8 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="en">English</option>
								<option value="fr">Français</option>
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-200">
								<svg
									className="fill-current h-4 w-4"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
								>
									<path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
								</svg>
							</div>
						</div>

						{/* Dark Mode Toggle */}
						<button
							onClick={toggleDarkMode}
							className="p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
							aria-label={t('header.toggleDarkMode')}
						>
							<span className="sr-only">{t('header.toggleDarkMode')}</span>
							{isDarkMode ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
									/>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
									/>
								</svg>
							)}
						</button>
					</div>
				)}

				{/* Mobile menu button */}
				{isMobile && (
					<div className="flex items-center">
						<button
							onClick={toggleDarkMode}
							className="p-2 rounded-md text-gray-700 dark:text-gray-200 mr-2"
							aria-label={t('header.toggleDarkMode')}
						>
							{isDarkMode ? (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
									/>
								</svg>
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
									/>
								</svg>
							)}
						</button>

						<div className="relative ml-2">
							<select
								onChange={e => changeLanguage(e.target.value)}
								value={i18n.language}
								className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded-md p-1 text-gray-700 dark:text-gray-200"
								aria-label="Change language"
							>
								<option value="en">EN</option>
								<option value="fr">FR</option>
							</select>
						</div>
					</div>
				)}
			</div>
		</header>
	);
};

export default Header;
