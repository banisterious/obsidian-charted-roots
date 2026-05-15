/**
 * Postinstall patch for leaflet-distortableimage library
 *
 * The library's bundled dist file (leaflet.distortableimage.js) accidentally
 * includes webpack-dev-server's hot-reload client. On module load, the client
 * tries to open a WebSocket to ws://localhost:8081/ws (the dev server that
 * doesn't exist in production), fails, and logs a "WebSocket connection failed"
 * error to the user's DevTools console. The error is harmless but alarming.
 *
 * This patch replaces the WebSocket constructor call in the bundled
 * webpack-dev-server WebSocketClient with a no-op stub. The library's normal
 * functionality is unaffected — only the dev-server hot-reload plumbing is
 * neutralized.
 */

const fs = require('fs');
const path = require('path');

const DIST_FILE = path.join(
	__dirname,
	'node_modules',
	'leaflet-distortableimage',
	'dist',
	'leaflet.distortableimage.js'
);

const ORIGINAL = `  function WebSocketClient(url) {
    _classCallCheck(this, WebSocketClient);

    this.client = new WebSocket(url);

    this.client.onerror = function (error) {
      _utils_log_js__WEBPACK_IMPORTED_MODULE_0__.log.error(error);
    };
  }`;

const PATCHED = `  function WebSocketClient(url) {
    _classCallCheck(this, WebSocketClient);

    // PATCHED (charted-roots): skip dev-server WebSocket in production.
    // The library accidentally bundles webpack-dev-server's hot-reload client,
    // which tries to open ws://localhost:8081/ws on load and logs a scary
    // "WebSocket connection failed" error. Stubbing this.client with a plain
    // object makes downstream .onopen / .onclose / .onmessage / .onerror
    // assignments harmless no-ops.
    void url;
    this.client = {
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
      close: function () {},
      send: function () {},
      addEventListener: function () {},
      removeEventListener: function () {}
    };
  }`;

if (!fs.existsSync(DIST_FILE)) {
	console.log('[patch-leaflet-distortable] Dist file not found, skipping patch.');
	process.exit(0);
}

const source = fs.readFileSync(DIST_FILE, 'utf8');

if (source.includes('PATCHED (charted-roots): skip dev-server WebSocket')) {
	console.log('[patch-leaflet-distortable] Already patched, skipping.');
	process.exit(0);
}

if (!source.includes(ORIGINAL)) {
	console.warn(
		'[patch-leaflet-distortable] Could not find expected WebSocketClient body. ' +
		'The library may have been updated. Skipping patch.'
	);
	process.exit(0);
}

const patched = source.replace(ORIGINAL, PATCHED);
fs.writeFileSync(DIST_FILE, patched, 'utf8');
console.log('[patch-leaflet-distortable] Stubbed webpack-dev-server WebSocketClient to a no-op.');
