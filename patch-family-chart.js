/**
 * Postinstall patches for family-chart library
 *
 * Patch 1 — calculateEnterAndExitPositions null guards:
 *   Fixes translate(undefined, undefined) on card <g> elements during D3
 *   enter transitions by adding `?? 0` null guards to all _x/_y assignments.
 *   See https://github.com/banisterious/obsidian-charted-roots/issues/257.
 *
 * Patch 2 — SVG cardUpdate opacity inline-style cleanup:
 *   The library's SVG-mode `cardUpdate` runs a D3 transition that ends with
 *   `.style("opacity", 1)`, leaving an inline `style="opacity: 1"` on each
 *   card <g> after the transition completes. Inline styles have specificity
 *   1,0,0,0, so any CSS rule that tries to dim or hide a card (e.g., our
 *   `.cr-hl-dim` highlight-dim opacity override) needs `!important` to win.
 *   This patch appends `.on("end", function() { d3.select(this).style("opacity", null); })`
 *   to the transition so the inline opacity is removed once the transition
 *   ends, restoring CSS controllability.
 *
 * Patch 3 — HTML cardUpdate opacity inline-style cleanup:
 *   Same patch as Patch 2 but for the HTML-mode `cardUpdate` function. The
 *   library has parallel SVG and HTML rendering paths with structurally
 *   identical transitions; both need the cleanup.
 *
 * Patches 2 + 3 together let `styles/family-chart-view.css` drop the
 * `!important` from `.card_cont.cr-hl-dim { opacity: 0.3 }`. Same fix
 * proposed upstream at the user's filed issue; this patch applies it
 * locally until the upstream change lands.
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

// --- Patch 1: null guards in calculateEnterAndExitPositions ---

const POS_ORIGINAL = `function calculateEnterAndExitPositions(d, entering, exiting) {
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

const POS_PATCHED = `function calculateEnterAndExitPositions(d, entering, exiting) {
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

const POS_MARKER = 'd._x = d.x ?? 0;';

// --- Patch 2: SVG cardUpdate opacity inline-style cleanup ---

const SVG_CARD_UPDATE_ORIGINAL = `    function cardUpdate(d) {
        Card.call(this, d);
        const delay = props.initial ? calculateDelay(tree, d, props.transition_time) : 0;
        d3.select(this).transition().duration(props.transition_time).delay(delay).attr("transform", \`translate(\${d.x}, \${d.y})\`).style("opacity", 1);
    }`;

const SVG_CARD_UPDATE_PATCHED = `    function cardUpdate(d) {
        Card.call(this, d);
        const delay = props.initial ? calculateDelay(tree, d, props.transition_time) : 0;
        // PATCHED (charted-roots): .on("end", ...) clears the inline
        // opacity once the transition finishes so CSS rules can control
        // card opacity without needing !important.
        d3.select(this).transition().duration(props.transition_time).delay(delay).attr("transform", \`translate(\${d.x}, \${d.y})\`).style("opacity", 1).on("end", function () { d3.select(this).style("opacity", null); });
    }`;

const SVG_CARD_UPDATE_MARKER = 'PATCHED (charted-roots): .on("end", ...) clears the inline';

// --- Patch 3: HTML cardUpdate opacity inline-style cleanup ---

const HTML_CARD_UPDATE_ORIGINAL = `    function cardUpdate(d) {
        Card.call(this, d);
        const delay = props.initial ? calculateDelay(tree, d, props.transition_time) : 0;
        d3.select(this).transition().duration(props.transition_time).delay(delay).style("transform", \`translate(\${d.x}px, \${d.y}px)\`).style("opacity", 1);
    }`;

const HTML_CARD_UPDATE_PATCHED = `    function cardUpdate(d) {
        Card.call(this, d);
        const delay = props.initial ? calculateDelay(tree, d, props.transition_time) : 0;
        // PATCHED (charted-roots, HTML mode): same opacity cleanup as the SVG cardUpdate.
        d3.select(this).transition().duration(props.transition_time).delay(delay).style("transform", \`translate(\${d.x}px, \${d.y}px)\`).style("opacity", 1).on("end", function () { d3.select(this).style("opacity", null); });
    }`;

const HTML_CARD_UPDATE_MARKER = 'PATCHED (charted-roots, HTML mode): same opacity cleanup';

// --- Apply patches ---

if (!fs.existsSync(DIST_FILE)) {
	console.log('[patch-family-chart] Dist file not found, skipping patches.');
	process.exit(0);
}

let source = fs.readFileSync(DIST_FILE, 'utf8');
let changed = false;

// Patch 1
if (source.includes(POS_MARKER)) {
	console.log('[patch-family-chart] calculateEnterAndExitPositions already patched, skipping.');
} else if (!source.includes(POS_ORIGINAL)) {
	console.warn(
		'[patch-family-chart] Could not find expected calculateEnterAndExitPositions body. ' +
		'The library may have been updated. Skipping null-guard patch.'
	);
} else {
	source = source.replace(POS_ORIGINAL, POS_PATCHED);
	changed = true;
	console.log('[patch-family-chart] Patched calculateEnterAndExitPositions() with null guards.');
}

// Patch 2
if (source.includes(SVG_CARD_UPDATE_MARKER)) {
	console.log('[patch-family-chart] SVG cardUpdate opacity cleanup already patched, skipping.');
} else if (!source.includes(SVG_CARD_UPDATE_ORIGINAL)) {
	console.warn(
		'[patch-family-chart] Could not find expected SVG cardUpdate body. ' +
		'The library may have been updated. Skipping SVG cardUpdate opacity-cleanup patch.'
	);
} else {
	source = source.replace(SVG_CARD_UPDATE_ORIGINAL, SVG_CARD_UPDATE_PATCHED);
	changed = true;
	console.log('[patch-family-chart] Added opacity-cleanup .on("end", ...) to SVG cardUpdate.');
}

// Patch 3
if (source.includes(HTML_CARD_UPDATE_MARKER)) {
	console.log('[patch-family-chart] HTML cardUpdate opacity cleanup already patched, skipping.');
} else if (!source.includes(HTML_CARD_UPDATE_ORIGINAL)) {
	console.warn(
		'[patch-family-chart] Could not find expected HTML cardUpdate body. ' +
		'The library may have been updated. Skipping HTML cardUpdate opacity-cleanup patch.'
	);
} else {
	source = source.replace(HTML_CARD_UPDATE_ORIGINAL, HTML_CARD_UPDATE_PATCHED);
	changed = true;
	console.log('[patch-family-chart] Added opacity-cleanup .on("end", ...) to HTML cardUpdate.');
}

if (changed) {
	fs.writeFileSync(DIST_FILE, source, 'utf8');
}
