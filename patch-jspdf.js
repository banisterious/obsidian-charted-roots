/**
 * Postinstall patch: strip the `pdfobjectnewwindow` output mode from
 * jspdf's bundled ES build. That branch dynamically loads
 * `pdfobject.min.js` from a CloudFlare CDN by creating a `<script>`
 * element and appending it to a new-window document — the only
 * `document.createElement("script")` call in jspdf's source.
 *
 * Obsidian's Community automated review flags the bundled main.js for
 * dynamic script element creation when the unreachable branch survives
 * the bundle. Charted Roots only calls jspdf's `save()` (Family Chart
 * export, Tree wizard PDF output); the `pdfobjectnewwindow` and
 * `pdfjsnewwindow` output modes are never reached.
 *
 * Replacing the case body with a throw preserves the switch shape so
 * jspdf still parses cleanly, drops the dynamic script element creation
 * from the bundle, and surfaces a clear error if a future call site
 * does request the removed mode.
 *
 * The bundler uses `dist/jspdf.es.min.js` per jspdf's `browser` and
 * `module` package.json entries, so the minified file is the primary
 * target. The unminified `dist/jspdf.es.js` is patched in parallel so
 * source-map debugging stays consistent with runtime.
 *
 * Each substitution carries an idempotency marker so re-running the
 * patch is a no-op. If an ORIGINAL string isn't found (vendor update),
 * the patch logs a warning and skips that substitution; it never
 * silently mis-edits.
 */

const fs = require('fs');
const path = require('path');

const MARKER = 'charted-roots-postinstall-patch';

const TARGETS = [
	{
		name: 'jspdf.es.min.js (minified browser entry)',
		path: path.join(__dirname, 'node_modules', 'jspdf', 'dist', 'jspdf.es.min.js'),
		original:
			'case"pdfobjectnewwindow":if("[object Window]"===Object.prototype.toString.call(i)){var a="https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js",s=!e.pdfObjectUrl;s||(a=e.pdfObjectUrl);var u=i.open();if(null!==u){var c=Ie(u),l=c.document.createElement("script"),h=this;l.src=a,s&&(l.integrity="sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g==",l.crossOrigin="anonymous"),l.onload=function(){u.PDFObject.embed(h.output("dataurlstring"),e)},c.body.appendChild(l)}return u}throw new Error("The option pdfobjectnewwindow just works in a browser-environment.");',
		patched:
			'case"pdfobjectnewwindow":throw new Error("pdfobjectnewwindow output mode removed by ' +
			MARKER +
			' (dynamic script loading not supported in this build)");',
	},
	{
		name: 'jspdf.es.js (unminified ES module)',
		path: path.join(__dirname, 'node_modules', 'jspdf', 'dist', 'jspdf.es.js'),
		original: `      case "pdfobjectnewwindow":
        if (Object.prototype.toString.call(globalObject) === "[object Window]") {
          var pdfObjectUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js";
          var useDefaultPdfObjectUrl = !options.pdfObjectUrl;
          if (!useDefaultPdfObjectUrl) {
            pdfObjectUrl = options.pdfObjectUrl;
          }
          var nW = globalObject.open();
          if (nW !== null) {
            var initializedPdfObjectWindow = initializeNewWindow(nW);
            var pdfObjectScript = initializedPdfObjectWindow.document.createElement("script");
            var scope = this;
            pdfObjectScript.src = pdfObjectUrl;
            if (useDefaultPdfObjectUrl) {
              pdfObjectScript.integrity = "sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g==";
              pdfObjectScript.crossOrigin = "anonymous";
            }
            pdfObjectScript.onload = function () {
              nW.PDFObject.embed(scope.output("dataurlstring"), options);
            };
            initializedPdfObjectWindow.body.appendChild(pdfObjectScript);
          }
          return nW;
        } else {
          throw new Error("The option pdfobjectnewwindow just works in a browser-environment.");
        }`,
		patched: `      case "pdfobjectnewwindow":
        // pdfobjectnewwindow output mode removed by ${MARKER}
        // (dynamic script loading not supported in this build)
        throw new Error("pdfobjectnewwindow output mode removed by ${MARKER}");`,
	},
];

let totalWarnings = 0;

for (const t of TARGETS) {
	if (!fs.existsSync(t.path)) {
		console.log(`[patch-jspdf] ${t.name}: file not found; skipping.`);
		continue;
	}

	let source = fs.readFileSync(t.path, 'utf8');

	if (source.includes(t.patched)) {
		console.log(`[patch-jspdf] ${t.name}: already patched.`);
		continue;
	}

	if (!source.includes(t.original)) {
		console.warn(
			`[patch-jspdf] ${t.name}: ORIGINAL string not found. ` +
				'Vendor may have updated; skipping this substitution.'
		);
		totalWarnings += 1;
		continue;
	}

	source = source.replace(t.original, t.patched);
	fs.writeFileSync(t.path, source, 'utf8');
	console.log(`[patch-jspdf] ${t.name}: patched.`);
}

if (totalWarnings > 0) {
	console.warn(
		`[patch-jspdf] ${totalWarnings} substitution(s) skipped; review jspdf's release notes.`
	);
}
