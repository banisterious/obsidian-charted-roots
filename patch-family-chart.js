/**
 * Postinstall patch for family-chart library
 *
 * Fixes translate(undefined, undefined) on card <g> elements during D3
 * enter transitions by adding ?? 0 null guards to all _x/_y assignments
 * in calculateEnterAndExitPositions().
 *
 * See: https://github.com/banisterious/obsidian-charted-roots/issues/257
 */

const fs = require('fs');
const path = require('path');

const DIST_FILE = path.join(
	__dirname,
	'node_modules',
	'family-chart',
	'dist',
	'family-chart.esm.js'
);

const ORIGINAL = `function calculateEnterAndExitPositions(d, entering, exiting) {
    d.exiting = exiting;
    if (entering) {
        if (d.depth === 0 && !d.spouse) {
            d._x = d.x;
            d._y = d.y;
        }
        else if (d.spouse) {
            d._x = d.spouse.x;
            d._y = d.spouse.y;
        }
        else if (d.is_ancestry) {
            if (!d.parent)
                throw new Error('no parent');
            d._x = d.parent.x;
            d._y = d.parent.y;
        }
        else {
            d._x = d.psx;
            d._y = d.psy;
        }
    }
    else if (exiting) {
        const x = d.x > 0 ? 1 : -1, y = d.y > 0 ? 1 : -1;
        {
            d._x = d.x + 400 * x;
            d._y = d.y + 400 * y;
        }
    }
}`;

const PATCHED = `function calculateEnterAndExitPositions(d, entering, exiting) {
    d.exiting = exiting;
    if (entering) {
        if (d.depth === 0 && !d.spouse) {
            d._x = d.x ?? 0;
            d._y = d.y ?? 0;
        }
        else if (d.spouse) {
            d._x = d.spouse.x ?? 0;
            d._y = d.spouse.y ?? 0;
        }
        else if (d.is_ancestry) {
            if (!d.parent)
                throw new Error('no parent');
            d._x = d.parent.x ?? 0;
            d._y = d.parent.y ?? 0;
        }
        else {
            d._x = d.psx ?? 0;
            d._y = d.psy ?? 0;
        }
    }
    else if (exiting) {
        const x = d.x > 0 ? 1 : -1, y = d.y > 0 ? 1 : -1;
        {
            d._x = d.x + 400 * x;
            d._y = d.y + 400 * y;
        }
    }
}`;

if (!fs.existsSync(DIST_FILE)) {
	console.log('[patch-family-chart] Dist file not found, skipping patch.');
	process.exit(0);
}

const source = fs.readFileSync(DIST_FILE, 'utf8');

if (source.includes('d._x = d.x ?? 0;')) {
	console.log('[patch-family-chart] Already patched, skipping.');
	process.exit(0);
}

if (!source.includes(ORIGINAL)) {
	console.warn(
		'[patch-family-chart] Could not find expected function text. ' +
		'The library may have been updated. Skipping patch.'
	);
	process.exit(0);
}

const patched = source.replace(ORIGINAL, PATCHED);
fs.writeFileSync(DIST_FILE, patched, 'utf8');
console.log('[patch-family-chart] Patched calculateEnterAndExitPositions() with null guards.');
