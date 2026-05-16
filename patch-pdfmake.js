/**
 * Postinstall patch: strip `new Function("return this")()` dead-code
 * branches from pdfmake's bundled core-js globalThis polyfill and
 * webpack runtime.
 *
 * Both sites are unreachable in Obsidian's Electron runtime:
 *   - The core-js globalThis polyfill returns early via
 *     `typeof globalThis === "object"`, which always fires in modern V8.
 *     The fallback body containing `new Function("return this")()` is
 *     dead code.
 *   - The webpack runtime's `__webpack_require__.g` initializer follows
 *     the same shape and never reaches the `new Function(...)` fallback
 *     in Electron.
 *
 * Obsidian's Community automated review flags both sites under its
 * "Dynamic Code Execution" Behavior recommendation. Removing the
 * unreachable bodies eliminates the flagged literals from the bundled
 * main.js without changing runtime behavior.
 *
 * Note: the IE5-8 setImmediate polyfill in pdfmake's bundled core-js is
 * handled separately by patch-core-js-polyfill.js. This patch only
 * covers the two `new Function(...)` sites.
 *
 * Each substitution carries an idempotency marker so re-running the
 * patch is a no-op. If an ORIGINAL string isn't found (vendor update),
 * the patch logs a warning and skips that substitution; it never
 * silently mis-edits.
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.join(__dirname, 'node_modules', 'pdfmake', 'build', 'pdfmake.js');
const MARKER = 'charted-roots-postinstall-patch';

const REPLACEMENTS = [
	{
		name: 'core-js globalThis polyfill',
		original: `  if (typeof globalThis === "object") {
    return globalThis;
  }
  var g;
  try {
    // This works if eval is allowed (see CSP)
    // eslint-disable-next-line no-new-func
    g = this || new Function("return this")();
  } catch (e) {
    // This works if the window reference is available
    if (typeof window === "object") {
      return window;
    }

    // This works if the self reference is available
    if (typeof self === "object") {
      return self;
    }

    // This works if the global reference is available
    if (typeof __webpack_require__.g !== "undefined") {
      return __webpack_require__.g;
    }
  }
  return g;`,
		patched: `  // Dead-code fallbacks removed (${MARKER}: globalThis early-return always fires in Electron)
  return globalThis;`,
	},
	{
		name: 'webpack runtime/global',
		original: `/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();`,
		patched: `/******/ 		__webpack_require__.g = globalThis; /* ${MARKER}: globalThis fallback only */`,
	},
];

if (!fs.existsSync(TARGET)) {
	console.log('[patch-pdfmake] pdfmake.js not found; skipping.');
	process.exit(0);
}

let source = fs.readFileSync(TARGET, 'utf8');
let mutated = false;
let warnings = 0;

for (const r of REPLACEMENTS) {
	if (source.includes(r.patched)) {
		console.log(`[patch-pdfmake] ${r.name}: already patched.`);
		continue;
	}
	if (!source.includes(r.original)) {
		console.warn(
			`[patch-pdfmake] ${r.name}: ORIGINAL string not found. ` +
				'Vendor may have updated; skipping this substitution.'
		);
		warnings += 1;
		continue;
	}
	source = source.replace(r.original, r.patched);
	mutated = true;
	console.log(`[patch-pdfmake] ${r.name}: patched.`);
}

if (mutated) {
	fs.writeFileSync(TARGET, source, 'utf8');
}

if (warnings > 0) {
	console.warn(`[patch-pdfmake] ${warnings} substitution(s) skipped; review pdfmake's release notes.`);
}
