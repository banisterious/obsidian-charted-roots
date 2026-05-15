/**
 * Postinstall patches for leaflet-distortableimage library
 *
 * Patch 1 — webpack-dev-server WebSocketClient:
 *   The library's bundled dist file accidentally includes webpack-dev-server's
 *   hot-reload client. On module load, the client tries to open a WebSocket to
 *   ws://localhost:8081/ws (the dev server that doesn't exist in production),
 *   fails, and logs a "WebSocket connection failed" error to the user's
 *   DevTools console.
 *
 * Patch 2 — webpack runtime chunk loader (__webpack_require__.l):
 *   The library also bundles webpack's lazy-chunk loader, which creates a
 *   `<script>` element dynamically to fetch chunks. The plugin doesn't use
 *   webpack chunking — everything is in a single bundle — so this code path
 *   never executes. The dynamic `document.createElement('script')` was
 *   flagged by Obsidian's Community automated review at error severity as a
 *   "dynamic <script> element creation" violation. Stubbing the loader
 *   removes that surface from the bundle.
 *
 * Both patches no-op the offending code while preserving the function
 * signatures so any caller doesn't error. The library's normal functionality
 * is unaffected.
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

// --- Patch 1: WebSocketClient ---

const WS_ORIGINAL = `  function WebSocketClient(url) {
    _classCallCheck(this, WebSocketClient);

    this.client = new WebSocket(url);

    this.client.onerror = function (error) {
      _utils_log_js__WEBPACK_IMPORTED_MODULE_0__.log.error(error);
    };
  }`;

const WS_PATCHED = `  function WebSocketClient(url) {
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

const WS_MARKER = 'PATCHED (charted-roots): skip dev-server WebSocket';

// --- Patch 2: webpack chunk loader (__webpack_require__.l) ---
//
// Replaced via regex so we tolerate whitespace drift in the surrounding
// /******/ webpack runtime comments. Matches the `/* webpack/runtime/load
// script */` block through its closing `}();` and substitutes a no-op
// version of `__webpack_require__.l`.

const CHUNK_REGEX = /\/\*+\/[ \t]*\/\* webpack\/runtime\/load script \*\/[\s\S]*?\/\*+\/[ \t]*\}\(\);/;

// NOTE: comments inside the replacement use `//` line-comments rather than
// /* */ blocks because each /******/ token in the surrounding webpack runtime
// contains an embedded `*/`, which would prematurely terminate a multi-line
// comment and break esbuild bundling.
const CHUNK_PATCHED = `/******/ 	// webpack/runtime/load script — PATCHED (charted-roots): chunk loader stubbed.
/******/ 	// The library bundles webpack's lazy-chunk loader, which is never invoked
/******/ 	// because the plugin emits a single bundle (no code splitting). The
/******/ 	// loader's dynamic document.createElement('script') was flagged at error
/******/ 	// severity by Obsidian's Community automated review. Stubbed to a no-op
/******/ 	// that calls done() immediately to keep any caller happy.
/******/ 	!function() {
/******/ 		__webpack_require__.l = function(url, done) {
/******/ 			void url;
/******/ 			done && done({ type: "stub" });
/******/ 		};
/******/ 	}();`;

const CHUNK_MARKER = 'PATCHED (charted-roots): chunk loader stubbed';

// --- Apply patches ---

if (!fs.existsSync(DIST_FILE)) {
	console.log('[patch-leaflet-distortable] Dist file not found, skipping patches.');
	process.exit(0);
}

let source = fs.readFileSync(DIST_FILE, 'utf8');
let changed = false;

// Patch 1
if (source.includes(WS_MARKER)) {
	console.log('[patch-leaflet-distortable] WebSocketClient already patched, skipping.');
} else if (!source.includes(WS_ORIGINAL)) {
	console.warn(
		'[patch-leaflet-distortable] Could not find expected WebSocketClient body. ' +
		'The library may have been updated. Skipping WebSocketClient patch.'
	);
} else {
	source = source.replace(WS_ORIGINAL, WS_PATCHED);
	changed = true;
	console.log('[patch-leaflet-distortable] Stubbed webpack-dev-server WebSocketClient to a no-op.');
}

// Patch 2
if (source.includes(CHUNK_MARKER)) {
	console.log('[patch-leaflet-distortable] Chunk loader already patched, skipping.');
} else if (!CHUNK_REGEX.test(source)) {
	console.warn(
		'[patch-leaflet-distortable] Could not find expected __webpack_require__.l body. ' +
		'The library may have been updated. Skipping chunk-loader patch.'
	);
} else {
	source = source.replace(CHUNK_REGEX, CHUNK_PATCHED);
	changed = true;
	console.log('[patch-leaflet-distortable] Stubbed webpack chunk loader to a no-op.');
}

if (changed) {
	fs.writeFileSync(DIST_FILE, source, 'utf8');
}
