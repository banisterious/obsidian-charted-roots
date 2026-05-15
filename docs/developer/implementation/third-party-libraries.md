# Third-Party Libraries

Charted Roots depends on several external libraries for specialized functionality. This section documents how each is used.

## Table of Contents

- [pdfmake](#pdfmake)
- [family-chart](#family-chart)
- [Leaflet](#leaflet)
- [D3](#d3)
- [jsPDF](#jspdf)
- [fflate (ZIP archives)](#fflate-zip-archives)
- [Dependency Management](#dependency-management)

---

## pdfmake

**Purpose:** PDF document generation for reports.

**Version:** ^0.2.20

**Location:** `src/reports/services/pdf-report-renderer.ts`

**Usage pattern:**

```typescript
// Dynamic import (deferred until first PDF generation)
const pdfMakeModule = await import('pdfmake/build/pdfmake');
const vfsFonts = await import('pdfmake/build/vfs_fonts');
this.pdfMake = pdfMakeModule.default || pdfMakeModule;
this.pdfMake.vfs = vfsModule.pdfMake?.vfs || vfsModule.default?.pdfMake?.vfs || vfsModule.vfs;

// Font configuration
this.pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

// Document generation
this.pdfMake.createPdf(docDefinition).download(filename);
```

**Key concepts:**

| Concept | Description |
|---------|-------------|
| `docDefinition` | Object describing PDF content, styles, and metadata |
| `content` | Array of content blocks (text, tables, columns, etc.) |
| `styles` | Named style definitions (fontSize, color, margins, etc.) |
| `defaultStyle` | Base styles applied to all content |
| `pageMargins` | Document margins `[left, top, right, bottom]` |
| `vfs` | Virtual file system containing embedded fonts |

**Document definition structure:**

```typescript
const docDefinition: TDocumentDefinitions = {
  pageSize: 'LETTER',
  pageMargins: [40, 60, 40, 60],
  defaultStyle: { font: 'Roboto', fontSize: 10 },
  styles: {
    header: { fontSize: 14, bold: true },
    subheader: { fontSize: 12, bold: true },
    // ...
  },
  content: [
    { text: 'Title', style: 'header' },
    { table: { body: [...] } },
    // ...
  ],
  footer: (currentPage, pageCount) => ({ text: `Page ${currentPage} of ${pageCount}` })
};
```

**Notes:**
- Dynamic import keeps initial bundle size smaller — pdfmake core (~400-500 KB) loads on first PDF export, not plugin startup
- Custom VFS font bundle via `build-fonts.js`: Roboto (body) + DejaVu Sans Mono (for Unicode box-drawing characters in pedigree reports). Total ~1.2 MB raw font data across six TTF variants (4 Roboto + 2 DejaVu Sans Mono), bundled as base64 into `vfs_fonts_all.ts` at ~1.55 MB on disk — larger than pdfmake's default `vfs_fonts.js` (~830 KB, Roboto-only) because DejaVu Sans Mono is added on top
- Font strategy diverged from the original ADR (which chose standard PDF fonts). Reason: Unicode box-drawing characters rendered blank with Helvetica. See [2026-04-23 addendum in design-decisions.md](../design-decisions.md#addendum-2026-04-23-font-bundling-drift--re-affirmation-of-dual-library-choice)
- Types from `@types/pdfmake` (dev dependency)
- **`patch-core-js-polyfill.js` is a postinstall patch** (chained from `patch-leaflet-distortable.js` in `package.json:scripts.postinstall`) that strips the IE5-8 setImmediate polyfill branch from `node_modules/pdfmake/build/pdfmake.js`. pdfmake bundles its own copy of `core-js`, and core-js's `internals/task.js` contains an `if (ONREADYSTATECHANGE in createElement('script'))` fallback used only by IE5-8. The branch is unreachable in Obsidian's Electron runtime (an earlier `MessageChannel` branch in the same `if/else if` chain always succeeds), but the dynamic `createElement('script')` was flagged at error severity by the Community automated review. The patch removes the branch from both pdfmake's bundled copy and the direct `core-js` dependency. Added in v0.22.41. See `patch-core-js-polyfill.js` for the full pattern.

---

## family-chart

**Purpose:** D3-based family tree layout algorithm and interactive chart rendering.

**Version:** ^0.9.0

**Locations:**
- `src/core/family-chart-layout.ts` - Layout calculations for canvas generation
- `src/ui/views/family-chart-view.ts` - Interactive family chart view

**Usage pattern:**

```typescript
import f3 from 'family-chart';

// Create chart instance
const chart = f3.createChart(container, chartData)
  .setTransitionTime(800)
  .setCardXSpacing(250)
  .setCardYSpacing(150);

// Configure card renderer (SVG or HTML)
const card = chart.setCardSvg()  // or .setCardHtml()
  .setCardDisplay([['first name', 'last name'], ['birthday']])
  .setCardDim({ w: 200, h: 70, text_x: 75, text_y: 15, img_w: 60, img_h: 60, img_x: 5, img_y: 5 })
  .setOnCardClick((e, d) => handleCardClick(e, d))
  .setOnCardUpdate((d) => handleCardUpdate(d));

// Set root person and render
chart.updateMainId(rootPersonId);
chart.updateTree({ initial: true });
```

**Card renderers:**

| Renderer | Method | Use Case |
|----------|--------|----------|
| SVG | `setCardSvg()` | Default, Rectangle/Compact/Mini styles |
| HTML | `setCardHtml()` | Circle style with custom DOM structure |

**Card styles (Charted Roots):**

| Style | Renderer | Card Dimensions |
|-------|----------|-----------------|
| Rectangle | SVG | 200×70, avatar 60×60 |
| Circle | HTML | Custom DOM, circular avatar |
| Compact | SVG | 180×50, no avatar |
| Mini | SVG | 120×35, no avatar |

**Data format:**

```typescript
interface FamilyChartPerson {
  id: string;
  data: {
    'first name': string;
    'last name': string;
    gender: 'M' | 'F' | '';
    birthday?: string;
    deathday?: string;
    avatar?: string;
  };
  rels: {
    father?: string;
    mother?: string;
    spouses?: string[];
    children?: string[];
  };
}
```

**Key features used:**
- Spouse positioning and grouping
- Multi-generational layout
- Zoom and pan navigation
- Node selection and highlighting
- SVG and HTML card renderers
- `setOnCardUpdate()` callback for custom UI (open note button)
- Edit mode via `editTree()` API

---

## Leaflet

**Purpose:** Interactive map rendering for geographic visualization.

**Version:** ^1.9.4

**Location:** `src/maps/` module

**Core files:**
- `map-controller.ts` - Main Leaflet map management; cluster groups, layers, plugin initialization
- `map-view.ts` - Obsidian view wrapper; toolbar, breadcrumb, time slider
- `map-data-service.ts` - Data loading and filtering for markers / paths / journeys
- `image-map-manager.ts` - Custom image map support; leaflet-distortable plugin loading

**Leaflet plugins used:**

| Plugin | Version | Purpose |
|--------|---------|---------|
| `leaflet.markercluster` | ^1.5.3 | Clusters markers at various zoom levels |
| `leaflet.heat` | ^0.2.0 | Density heat maps |
| `leaflet-polylinedecorator` | ^1.6.0 | Arrow decorations on paths |
| `leaflet-textpath` | ^1.3.0 | Labels along paths |
| `leaflet-fullscreen` | ^1.0.2 | Fullscreen mode |
| `leaflet-minimap` | ^3.6.1 | Overview map |
| `leaflet-search` | ^4.0.0 | Place name search |
| `leaflet-distortableimage` | ^0.21.9 | Custom image map overlays |

**Usage pattern:**

```typescript
import L from 'leaflet';
import 'leaflet.markercluster';

// Create map
const map = L.map(container, {
  center: [0, 0],
  zoom: 2,
  zoomControl: true
});

// Add tile layer (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add marker cluster group
const markers = L.markerClusterGroup();
markers.addLayer(L.marker([lat, lng]));
map.addLayer(markers);
```

**CRS notes:**
- OpenStreetMap uses `L.CRS.EPSG3857` (Web Mercator)
- Custom image maps use `L.CRS.Simple` (pixel coordinates)
- CRS cannot be changed dynamically; map must be destroyed and recreated

**Known issues and workarounds:**

The leaflet plugin ecosystem has some long-standing quirks that we work around defensively. None of these are documented in the upstream libraries; if you remove a workaround, expect issues to resurface.

- **`window.L = L` is reattached on every plugin-loader call** in both `map-controller.ts:initializeLeafletPlugins()` and `image-map-manager.ts:initDistortableImagePlugins()`, not just on first init. Across repeated map open / close cycles in the same plugin session, the global L reference can drift (root cause unclear — possibly Obsidian's view-lifecycle interacting with esbuild's `__commonJS` shim caching, or another plugin clobbering `window.L`). Without the reattach, post-load registration checks fail from the 2nd or 3rd cycle.
- **`MapController.destroy()` wraps every cleanup step in independent try-catches** with warning logs. The `leaflet.markercluster` library has a load-order bug where `_generateInitialClusters` (invoked from `clearLayers` during destroy) can throw `TypeError: L.DistanceGrid is not a constructor`. Without the try-catches, this throw cascaded — leaving cluster groups in a partial-cleanup state that broke subsequent `map.remove()` calls and the next map's plugin registration check. Root cause is tracked at [issue #574](https://github.com/banisterious/obsidian-charted-roots/issues/574); the workaround can be removed once that's resolved.
- **`patch-leaflet-distortable.js` is a postinstall patch** (chained from `patch-family-chart.js` in `package.json:scripts.postinstall`) that applies two stubs to `leaflet-distortableimage`'s bundled dist file:
  1. **Webpack-dev-server `WebSocketClient`** is stubbed to a no-op object. The library's dist file accidentally includes a webpack-dev-server hot-reload client that tries to open `ws://localhost:8081/ws` on module load and logs a "WebSocket connection failed" error to DevTools. The library's normal functionality is unaffected by the stub; only the dev-server hot-reload plumbing is neutralized.
  2. **Webpack runtime chunk loader** (`__webpack_require__.l`) is stubbed because the library bundles webpack's lazy-chunk loader that dynamically creates a `<script>` element to fetch chunks. The plugin emits a single bundle (no code splitting), so this loader is never invoked — but the dynamic `createElement('script')` was flagged at error severity by the Community automated review. Stubbing it to a no-op that immediately calls `done({ type: "stub" })` removes the surface without affecting library behavior. Added in v0.22.40.
- **`suppressToolbar: true` is passed to `L.distortableImageOverlay`** in `image-map-manager.ts` to suppress the library's default popup toolbar (rotate / scale / distort / lock buttons) and the keymapper panel. Charted Roots provides its own edit-mode controls instead (Save alignment / Undo / Reset / Cancel). Most of the rules in `styles/leaflet-distortable.css` cover this suppressed UI; they're theme-aligned for defensive reasons in case the flag is ever flipped off, but they don't currently render.
- **Vendored CSS in `styles/leaflet-distortable.css` is `.cr-map-view`-scoped.** The library writes some absurdly broad selectors (e.g., `input[type="text"]::-webkit-input-placeholder`, `li.disabled`, `#cancel` as a bare ID) that would otherwise leak to general Obsidian UI and to any other plugin using leaflet-distortable in the same vault. Every rule is prefixed with `.cr-map-view` to contain the styling to our map view.

---

## D3

**Purpose:** Data visualization primitives, tree algorithms, and SVG manipulation.

**Version:** ^7.9.0

**Related packages:**
- `d3-hierarchy` (^3.1.2) - Tree and hierarchy layouts
- `d3-dag` (^1.1.0) - Directed acyclic graph layouts
- `d3-selection` (^3.0.0) - DOM manipulation

**Usage locations:**
- `src/core/layout-engines/` - Tree layout calculations
- `src/ui/views/family-chart-view.ts` - SVG rendering (via family-chart)

**Key functions used:**

| Function | Purpose |
|----------|---------|
| `d3.hierarchy()` | Convert data to hierarchy structure |
| `d3.tree()` | Calculate tree layout positions |
| `d3.stratify()` | Convert flat data to hierarchy |
| `d3.select()` | DOM element selection |

---

## jsPDF

**Purpose:** Canvas-based PDF export for the Family Chart view. Handles image-rendered output where pdfmake's declarative model would introduce image-resampling artifacts.

**Version:** ^3.0.4

**Location:** `src/ui/views/family-chart-export.ts` (primary), with minor fallback usage in `src/ui/tree-preview.ts`.

**Usage pattern:**

```typescript
import { jsPDF } from 'jspdf';

// Create a PDF with page dimensions matched to chart content (no resampling)
const pdf = new jsPDF({
  orientation: 'landscape',
  unit: 'pt',
  format: [pageWidth, pageHeight]
});

// Register bundled Roboto fonts for cover-page typography
registerRobotoFonts(pdf, fonts);

// Render SVG family chart to high-res canvas, embed as PNG at 1:1 scale
const canvas = await renderSvgToCanvas(svgElement, { scale: 2 });
const pngDataUrl = canvas.toDataURL('image/png');
pdf.addImage(pngDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);

// Optional cover page with title / subtitle typography
addPdfCoverPage(pdf, title, subtitle, options);

pdf.save(filename);
```

**Key capabilities used:**

| Capability | Purpose |
|------------|---------|
| Custom page sizing | Page dimensions matched to chart content — avoids resampling artifacts |
| Canvas-to-PDF embedding | `addImage()` accepts PNG data URLs from the SVG-to-Canvas pipeline |
| Font registration via VFS | Roboto family registered for cover-page text rendering |
| Manual text placement | Cover page title / subtitle drawn at exact coordinates |
| Multi-page documents | Cover page + chart pages in a single export |

**SVG → Canvas → PNG → PDF pipeline:**

The Family Chart is an interactive SVG. For PDF export, it's rendered to a Canvas at 2× scale (for high DPI), converted to a PNG data URL, and embedded in the PDF at its logical size. This preserves visual fidelity — lines stay crisp, text stays sharp, and there's no resampling degradation that a fixed-page-size approach would introduce.

**Why both jsPDF and pdfmake are bundled:**

pdfmake handles text-structured documents (reports, books) with declarative layout, automatic pagination, and complex tables. jsPDF handles image-based visual exports (charts) with dynamic page sizing and pixel-perfect placement. Consolidating on either library would sacrifice quality on the other side of the split:

- Consolidating on jsPDF would require reimplementing pdfmake's auto-pagination, flowing tables, TOC generation, and footnote placement.
- Consolidating on pdfmake would force fixed page sizes for chart export, introducing image resampling artifacts.

See [PDF Library and Font Strategy](../design-decisions.md#pdf-library-and-font-strategy-2025-12-19) in design-decisions.md for the full ADR, including options considered, bundle-size impact, and the 2026-04-23 addendum on font-bundling and dual-library re-affirmation.

---

## fflate (ZIP archives)

**Purpose:** ZIP archive handling for Gramps Package (.gpkg) import and ODT document generation.

**Version:** ^0.8.2

**Locations:**
- `src/utils/zip.ts` — `ZipBuilder` / `ZipReader` adapter (JSZip-shaped API over `fflate`)
- `src/gramps/gpkg-extractor.ts` — Gramps Package extraction (via `ZipReader`)
- `src/reports/services/odt-generator.ts` — Reports ODT writer (via `ZipBuilder`)
- `src/ui/views/odt-generator.ts` — Family Chart ODT export (via `ZipBuilder`)
- `src/book/services/odt-book-renderer.ts` — Book renderer ODT writer (via `ZipBuilder`)

**Adapter rationale.** Plugin call sites use a JSZip-shaped builder/reader API exposed by [`src/utils/zip.ts`](../../../src/utils/zip.ts) rather than calling `fflate` directly. `fflate`'s functional `zip({...}, cb)` shape would distribute Uint8Array conversion, base64 decoding, Blob wrapping, and STORE-level handling across every call site. The thin adapter centralizes those quirks in one file, so call sites stay readable as stateful builders and a future `fflate` version bump or library swap is a one-file change.

**Migrated from `jszip` in v0.22.40.** `jszip`'s bundled output contained four UMD module-detection guards using `document.createElement('script')`, all flagged at error severity by the Community automated review. `fflate` has none of those patterns and is smaller (~8 KB minified vs `jszip`'s ~90 KB).

**Usage pattern (reading, via `ZipReader`):**

```typescript
import { ZipReader, type ZipReaderFile } from '../utils/zip';

// Load ZIP from ArrayBuffer or Uint8Array
const zip = await ZipReader.loadAsync(data);

// Iterate over files
for (const [path, file] of Object.entries(zip.files)) {
  if (file.dir) continue;

  // Extract as Uint8Array or ArrayBuffer
  const bytes = await file.async('uint8array');
  const buffer = await file.async('arraybuffer');
}
```

**Usage pattern (writing, via `ZipBuilder`):**

```typescript
import { ZipBuilder } from '../utils/zip';

const zip = new ZipBuilder();

// Add files with content (mimetype must be first + uncompressed for ODT)
zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
zip.file('content.xml', contentXml);
zip.file('styles.xml', stylesXml);
zip.file('META-INF/manifest.xml', manifestXml);
zip.file('Pictures/chart.png', imageBytes); // Uint8Array
zip.file('Pictures/cover.png', coverBase64, { base64: true }); // base64-encoded string

// Generate as Blob for download
const blob = await zip.generateAsync({
  mimeType: 'application/vnd.oasis.opendocument.text'
});
```

**ZipBuilder options:**

| Option | Effect |
|--------|--------|
| `compression: 'STORE'` | Uncompressed (level 0). Required for ODT `mimetype` entry. Default is DEFLATE level 6. |
| `base64: true` | Content is a base64-encoded string; decoded to bytes before zipping. |
| `binary: true` | JSZip-compat no-op for `Uint8Array` input. |

**ODT structure requirement:** ODT files require the `mimetype` entry to be **first and uncompressed**. `ZipBuilder` preserves insertion order (entries are stored in a `Map`), so calling `zip.file('mimetype', ..., { compression: 'STORE' })` first is sufficient.

**Gramps Package structure:**
- `.gpkg` files come in three formats:
  - **tar.gz** — Gramps' export wizard default. Decompressed and parsed by a built-in tar reader (no ZIP handling).
  - **gzip-compressed XML** — Plain `data.gramps` without bundled media. Decompressed via the browser's `DecompressionStream` API.
  - **ZIP** — Defensive support for archives produced by third-party tools or older Gramps versions. Read via `ZipReader.loadAsync()`.
- Test fixtures for all three live in `tests/fixtures/gramps/`. The ZIP-format fixture is generated by `repack-to-zip.js` since Gramps does not produce ZIP-format `.gpkg` directly.

**Notes:**
- Functional API in `fflate` (`zip()` / `unzip()` callbacks) is wrapped in Promises by the adapter.
- No worker pool needed for plugin-scale archives; synchronous internals via the callback shape are sufficient.
- Adapter is documented at [`src/utils/zip.ts`](../../../src/utils/zip.ts) and applies to all four ODT writers + the Gramps reader.

---

## Dependency Management

**Bundle considerations:**

| Library | Approximate Size | Loading |
|---------|------------------|---------|
| pdfmake core | ~400-500 KB | Dynamic import (first PDF report export) |
| Bundled fonts (Roboto + DejaVu Sans Mono) | ~1.55 MB base64-embedded (~1.2 MB raw) | Static, via `vfs_fonts_all.ts` from `build-fonts.js` |
| jsPDF | ~229 KB | Static import (Family Chart export) |
| Leaflet + plugins | ~500 KB | Dynamic import |
| family-chart | ~200 KB | Static import |
| D3 | ~300 KB | Static import |
| JSZip | ~90 KB | Static import |

**PDF libraries — why both:** Charted Roots bundles pdfmake and jsPDF for complementary roles. pdfmake handles text-structured documents (reports, books) with declarative layout; jsPDF handles image-based visual exports (Family Chart) with dynamic page sizing. Full rationale and bundle-size analysis in [PDF Library and Font Strategy](../design-decisions.md#pdf-library-and-font-strategy-2025-12-19).

**Type definitions (devDependencies):**
- `@types/leaflet`
- `@types/leaflet.markercluster`
- `@types/pdfmake`
- `@types/d3`
- `@types/d3-hierarchy`
- `@types/d3-selection`
