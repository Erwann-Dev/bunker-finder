import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FortificationType,
	FilterGroup,
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
	const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
		{},
	);

	// Initialize expanded state for all filter groups
	useEffect(() => {
		const initialExpandedState: Record<string, boolean> = {};
		filterGroups.forEach(group => {
			initialExpandedState[group.id] = true; // All expanded by default
		});
		setExpandedGroups(initialExpandedState);
	}, [filterGroups]);

	// Handle search input changes
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchTerm(value);
		onSearch(value);
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

	// Toggle a filter group's expanded state
	const toggleGroup = (groupId: string) => {
		setExpandedGroups(prev => ({
			...prev,
			[groupId]: !prev[groupId],
		}));
	};

	// Clear all filters
	const clearAllFilters = () => {
		setActiveFilters({});
		onFilterChange({});
	};

	return (
		<div className="p-4 bg-white dark:bg-gray-800 h-full overflow-y-auto">
			{/* Header with close button for mobile */}
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold text-gray-800 dark:text-white">
					{t('sidebar.title')}
				</h2>
				{isMobile && onClose && (
					<button
						onClick={onClose}
						className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						aria-label="Close sidebar"
					>
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
					</button>
				)}
			</div>

			{/* Search */}
			<div className="mb-6">
				<label
					htmlFor="search"
					className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
				>
					{t('sidebar.search')}
				</label>
				<div className="relative">
					<input
						type="text"
						id="search"
						value={searchTerm}
						onChange={handleSearchChange}
						placeholder={t('sidebar.searchPlaceholder')}
						className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
					/>
					<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<svg
							className="h-5 w-5 text-gray-400"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					{searchTerm && (
						<button
							className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
							onClick={() => {
								setSearchTerm('');
								onSearch('');
							}}
						>
							<svg
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					)}
				</div>
			</div>

			{/* Status message about fortifications count */}
			<div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
				{fortifications.length} {t('sidebar.fortificationsFound')}
			</div>

			{/* Filters section with active filters */}
			<div className="mb-4">
				<div className="flex justify-between items-center mb-2">
					<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
						{t('sidebar.filters')}
					</h3>

					{/* Clear all filters button - only show if there are active filters */}
					{Object.keys(activeFilters).length > 0 && (
						<button
							onClick={clearAllFilters}
							className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
						>
							{t('sidebar.clearAll')}
						</button>
					)}
				</div>

				{/* Active filters display */}
				{Object.keys(activeFilters).length > 0 && (
					<div className="mb-4 flex flex-wrap gap-2">
						{Object.entries(activeFilters).map(([groupId, value]) => {
							if (!value) return null;

							// Find the filter group and option
							const group = filterGroups.find(g => g.id === groupId);
							const option = group?.options.find(o => o.value === value);

							if (!group || !option) return null;

							return (
								<div
									key={`${groupId}-${value}`}
									className="inline-flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-sm"
								>
									<span className="font-medium mr-1">{group.name}:</span>
									<span>{option.label}</span>
									<button
										onClick={() => handleFilterChange(groupId, null)}
										className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800"
										aria-label={`Remove ${group.name} filter`}
									>
										<svg
											className="h-4 w-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clipRule="evenodd"
											/>
										</svg>
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Filter Groups */}
			<div className="space-y-4">
				{filterGroups.map(group => (
					<div key={group.id} className="border-b pb-4 dark:border-gray-700">
						<button
							onClick={() => toggleGroup(group.id)}
							className="flex justify-between items-center w-full text-left mb-2"
						>
							<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
								{t(`sidebar.${group.id}`) || group.name}
							</h3>
							<svg
								className={`h-5 w-5 text-gray-500 transform transition-transform ${
									expandedGroups[group.id] ? 'rotate-180' : ''
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
						</button>

						{expandedGroups[group.id] && (
							<div className="space-y-2 mt-2 pl-1">
								{/* Option to show all (clears this filter) */}
								<div className="flex items-center">
									<button
										onClick={() => handleFilterChange(group.id, null)}
										className={`w-full text-left p-2 rounded-md transition-colors ${
											!activeFilters[group.id]
												? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
												: 'hover:bg-gray-100 dark:hover:bg-gray-700'
										}`}
									>
										{t('sidebar.allTypes')}
									</button>
								</div>

								{/* Filter options */}
								{group.options.slice(0, 10).map(option => (
									<div
										key={option.id}
										className="flex items-center justify-between"
									>
										<button
											onClick={() => handleFilterChange(group.id, option.value)}
											className={`flex-1 text-left p-2 rounded-md transition-colors ${
												activeFilters[group.id] === option.value
													? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
													: 'hover:bg-gray-100 dark:hover:bg-gray-700'
											}`}
										>
											{option.label}
										</button>
										<span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
											{option.count}
										</span>
									</div>
								))}

								{/* Show more if there are more than 10 options */}
								{group.options.length > 10 && (
									<button
										className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
										onClick={() => {
											// Logic to show more would go here
											// For simplicity, we're just toggling the visibility
											toggleGroup(group.id);
										}}
									>
										{expandedGroups[group.id]
											? t('sidebar.showLess')
											: t('sidebar.showMore', {
													count: group.options.length - 10,
											  })}
									</button>
								)}
							</div>
						)}
					</div>
				))}
			</div>

			{/* Data enrichment status */}
			{isDataEnriched && (
				<div className="mt-4 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-md text-sm">
					{t('sidebar.enrichedData')}
				</div>
			)}
		</div>
	);
};

export default Sidebar;
