// This file provides type declarations for libraries loaded via CDN
declare module 'react-leaflet-markercluster' {
	import { ComponentType } from 'react';

	interface MarkerClusterGroupProps {
		children?: React.ReactNode;
		chunkedLoading?: boolean;
		spiderfyOnMaxZoom?: boolean;
		showCoverageOnHover?: boolean;
		zoomToBoundsOnClick?: boolean;
		maxClusterRadius?: number;
		iconCreateFunction?: (cluster: any) => L.DivIcon;
		chunkProgress?: (processed: number, total: number) => void;
		[key: string]: any;
	}

	const MarkerClusterGroup: ComponentType<MarkerClusterGroupProps>;
	export default MarkerClusterGroup;
}

// Extend Window interface to include Leaflet
declare global {
	interface Window {
		L: any;
	}
}

// Ensure L.MarkerCluster is available
declare namespace L {
	class MarkerCluster {
		getChildCount(): number;
	}
}
