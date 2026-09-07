const CARTO_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

/** Build the CARTO URL without encoding Leaflet's tile placeholders. */
export function getCartoTileUrl(apiKey?: string): string {
	const key = apiKey?.trim();
	return key ? CARTO_TILE_URL + '?key=' + encodeURIComponent(key) : CARTO_TILE_URL;
}
