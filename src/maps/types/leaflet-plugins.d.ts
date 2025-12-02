/**
 * Type declarations for Leaflet plugins without their own types
 */

declare module 'leaflet-polylinedecorator';
declare module 'leaflet.heat';
declare module 'leaflet-fullscreen';
declare module 'leaflet-minimap';
declare module 'leaflet-search';
declare module 'leaflet-textpath';

/**
 * Extend Leaflet Polyline with setText method from leaflet-textpath
 */
declare namespace L {
	interface Polyline {
		/**
		 * Set text along the polyline path
		 * @param text - Text to display along the path, or null to remove
		 * @param options - Text display options
		 */
		setText(text: string | null, options?: TextPathOptions): this;
	}

	interface TextPathOptions {
		/** Repeat text along the entire polyline (default: false) */
		repeat?: boolean;
		/** Center text relative to the polyline's bounding box (default: false) */
		center?: boolean;
		/** Position text below the path (default: false) */
		below?: boolean;
		/** Offset from the path in pixels (default: 0) */
		offset?: number;
		/** Text orientation: angle in degrees, 'flip', or 'perpendicular' */
		orientation?: number | 'flip' | 'perpendicular';
		/** SVG text element attributes */
		attributes?: {
			fill?: string;
			'font-size'?: string;
			'font-family'?: string;
			'font-weight'?: string;
			'text-anchor'?: string;
			dy?: string;
			[key: string]: string | undefined;
		};
	}
}
