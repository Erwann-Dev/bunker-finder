import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FortificationType,
	FilterGroup,
	FilterOption,
} from '../types/fortification';

interface SidebarProps {
	fortifications: FortificationType[];
	onSearch: (search: string) => void;
	onFilterChange: (filters: Record<string, string | null>) => void;
	filterGroups: FilterGroup[];
	isMobile?: boolean;
	onClose?: () => void;
	isDataEnriched?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
	fortifications,
	onSearch,
	onFilterChange,
	filterGroups,
	isMobile = false,
	onClose,
	isDataEnriched = false,
}) => {
	const { t } = useTranslation();
	const [searchTerm, setSearchTerm] = useState('');
	const [activeFilters, setActiveFilters] = useState<
		Record<string, string | null>
	>({});
	const [expandedSections, setExpandedSections] = useState<
		Record<string, boolean>
	>({});

	// Fonction pour normaliser le texte (retirer les accents)
	const normalizeText = (text: string): string => {
		return text
			.normalize('NFD') // Décompose les caractères accentués
			.replace(/[\u0300-\u036f]/g, '') // Supprime les marques diacritiques
			.toLowerCase()
			.trim();
	};

	// Initialize expanded state for all filter groups
	useEffect(() => {
		const initialExpandedState: Record<string, boolean> = {};
		filterGroups.forEach(group => {
			initialExpandedState[group.id] = true; // All expanded by default
		});
		setExpandedSections(initialExpandedState);
	}, [filterGroups]);

	// Handle search input changes
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
		onSearch(e.target.value);
	};

	// Handle filter selection
	const handleFilterChange = (groupId: string, value: string | null) => {
		const newFilters = {
			...activeFilters,
			[groupId]: value,
		};

		// If value is null, remove this filter
		if (value === null) {
			delete newFilters[groupId];
		}

		setActiveFilters(newFilters);
		onFilterChange(newFilters);

		// Auto-close sidebar on mobile after filter selection
		if (isMobile) {
			onClose?.();
		}
	};

	// Toggle expansion of filter groups
	const toggleFilterSection = (groupId: string, isExpanded: boolean) => {
		setExpandedSections(prev => ({
			...prev,
			[groupId]: isExpanded,
		}));
	};

	// Clear all filters
	const clearAllFilters = () => {
		setActiveFilters({});
		onFilterChange({});
	};

	// Filter and sort fortifications based on search and filters
	const filteredFortifications = useMemo(() => {
		// First filter out unnamed structures
		const namedFortifications = fortifications.filter(fort => {
			const name = fort.properties.name || fort.properties.chpdeno || '';
			return name.trim() !== '';
		});

		// Then apply search term and filters
		let filtered = namedFortifications;

		if (searchTerm) {
			filtered = filtered.filter(fort => {
				const name = fort.properties.name || fort.properties.chpdeno || '';
				const address =
					fort.properties.chpadrs || fort.properties.chplieu || '';
				const normalizedName = normalizeText(name);
				const normalizedAddress = normalizeText(address);
				const normalizedSearch = normalizeText(searchTerm);
				return (
					normalizedName.includes(normalizedSearch) ||
					normalizedAddress.includes(normalizedSearch)
				);
			});
		}

		// Apply active filters
		Object.entries(activeFilters).forEach(([key, value]) => {
			if (value) {
				filtered = filtered.filter(fort => {
					if (key === 'type') {
						const fortType =
							fort.properties.chptico || fort.properties.historic;
						return fortType === value;
					} else if (key === 'region') {
						return fort.properties.chpreg === value;
					}
					return true;
				});
			}
		});

		// Sort by name
		return filtered.sort((a, b) => {
			const nameA = a.properties.name || a.properties.chpdeno || '';
			const nameB = b.properties.name || b.properties.chpdeno || '';
			return nameA.localeCompare(nameB);
		});
	}, [fortifications, searchTerm, activeFilters, normalizeText]);

	return (
		<div className="h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
			<div className="p-4">
				<div className="mb-4">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
						{t('sidebar.title')}
					</h2>
					<div className="relative">
						<input
							type="text"
							className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
							placeholder={t('sidebar.searchPlaceholder')}
							value={searchTerm}
							onChange={handleSearchChange}
						/>
						{searchTerm && (
							<button
								className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
								onClick={() => {
									setSearchTerm('');
									onSearch('');
								}}
							>
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
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						)}
					</div>
				</div>

				{filterGroups.length > 0 && (
					<div className="mb-4">
						<div className="flex justify-between items-center mb-2">
							<h3 className="text-lg font-medium text-gray-900 dark:text-white">
								{t('sidebar.filters')}
							</h3>
							{Object.keys(activeFilters).length > 0 && (
								<button
									className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
									onClick={clearAllFilters}
								>
									{t('sidebar.clearAll')}
								</button>
							)}
						</div>

						{filterGroups
							.filter(group => group.id !== 'period')
							.map(group => (
								<div key={group.id} className="mb-3">
									<div
										className="flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-2 py-1 rounded-md"
										onClick={() =>
											toggleFilterSection(group.id, !expandedSections[group.id])
										}
									>
										<h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
											{t(`sidebar.${group.id}`) || group.name}
										</h4>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className={`h-5 w-5 transform transition-transform ${
												expandedSections[group.id] ? 'rotate-180' : ''
											}`}
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									</div>

									{expandedSections[group.id] && (
										<div className="ml-2 mt-1 space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto">
											<div
												className={`flex items-center px-2 py-1 rounded-md cursor-pointer ${
													!activeFilters[group.id]
														? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
														: 'hover:bg-gray-100 dark:hover:bg-gray-700'
												}`}
												onClick={() => handleFilterChange(group.id, null)}
											>
												<span
													className={
														!activeFilters[group.id]
															? 'font-medium'
															: 'text-gray-600 dark:text-gray-300'
													}
												>
													{t('sidebar.allTypes')}
												</span>
											</div>
											{group.options.map(option => (
												<div
													key={option.id}
													className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer ${
														activeFilters[group.id] === option.value
															? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
															: 'hover:bg-gray-100 dark:hover:bg-gray-700'
													}`}
													onClick={() =>
														handleFilterChange(group.id, option.value)
													}
												>
													<span
														className={
															activeFilters[group.id] === option.value
																? 'font-medium'
																: 'text-gray-600 dark:text-gray-300'
														}
													>
														{option.label}{' '}
													</span>
													<span className="text-xs text-gray-500 dark:text-gray-400">
														{option.count}
													</span>
												</div>
											))}
										</div>
									)}
								</div>
							))}
					</div>
				)}

				{/* Filtered count display */}
				<div className="px-4 py-2 mb-4 text-sm text-gray-600 dark:text-gray-300 rounded-md bg-gray-50 dark:bg-gray-700">
					<strong>{filteredFortifications.length}</strong>{' '}
					{t('sidebar.fortificationsFound')}
					{isDataEnriched && (
						<div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
							<span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
							{t('sidebar.enrichedData')}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Sidebar;
