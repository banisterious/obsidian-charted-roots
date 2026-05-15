/**
 * Postinstall patch: remove the IE5-8 setImmediate polyfill branch from
 * core-js (and pdfmake's bundled copy of core-js).
 *
 * core-js's `internals/task.js` contains a feature-detection fallback for
 * IE5-8 that uses `document.createElement('script')` with `onreadystatechange`
 * to schedule microtasks. The branch is unreachable in Obsidian's Electron
 * runtime (`MessageChannel` is always available, satisfying an earlier
 * branch in the same chain), so the `createElement('script')` line is
 * dead code in our bundle.
 *
 * Obsidian's Community automated review flags this `<script>` element
 * creation at error severity under its "dynamic `<script>` element
 * creations" rule. The same polyfill code is also bundled inside pdfmake's
 * dist file (pdfmake ships its own copy of core-js), producing two
 * additional flagged sites.
 *
 * Removing the unreachable IE8- branch at the source eliminates the four
 * sites from the bundled main.js. The remaining setImmediate behavior is
 * unchanged: the earlier MessageChannel branch handles all Electron paths,
 * and the trailing `setTimeout` fallback handles anything that misses.
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
	path.join(__dirname, 'node_modules', 'core-js', 'internals', 'task.js'),
	path.join(__dirname, 'node_modules', 'pdfmake', 'build', 'pdfmake.js'),
];

const ORIGINAL = `  // IE8-
  } else if (ONREADYSTATECHANGE in createElement('script')) {
    defer = function (id) {
      html.appendChild(createElement('script'))[ONREADYSTATECHANGE] = function () {
        html.removeChild(this);
        run(id);
      };
    };
  // Rest old browsers
  } else {`;

const PATCHED = `  // IE8- polyfill branch removed by Charted Roots postinstall patch:
  // unreachable in Obsidian's Electron runtime (MessageChannel hits an
  // earlier branch) and flagged by the Community automated review's
  // "dynamic <script> element creations" rule.
  // Rest old browsers
  } else {`;

const MARKER = 'IE8- polyfill branch removed by Charted Roots postinstall patch';

for (const target of TARGETS) {
	const label = `[patch-core-js-polyfill] ${path.relative(__dirname, target)}`;

	if (!fs.existsSync(target)) {
		console.log(`${label}: File not found, skipping.`);
		continue;
	}

	let source = fs.readFileSync(target, 'utf8');

	if (source.includes(MARKER)) {
		console.log(`${label}: Already patched, skipping.`);
		continue;
	}

	if (!source.includes(ORIGINAL)) {
		console.warn(
			`${label}: Could not find expected IE8- polyfill block. ` +
				'The bundled library may have been updated. Skipping patch.'
		);
		continue;
	}

	source = source.replace(ORIGINAL, PATCHED);
	fs.writeFileSync(target, source, 'utf8');
	console.log(`${label}: Removed IE8- setImmediate polyfill branch.`);
}
