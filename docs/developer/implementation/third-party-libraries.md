# Third-Party Libraries

Canvas Roots depends on several external libraries for specialized functionality. This section documents how each is used.

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
- Dynamic import keeps initial bundle size smaller
- VFS fonts are embedded in the bundle (adds ~1MB)
- Types from `@types/pdfmake` (dev dependency)

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

// Layout calculation
const store = f3.createStore({
  data: chartData,
  node_separation: 200,
  level_separation: 150
});
f3.CalculateTree({ store });

// Interactive chart (in FamilyChartView)
const chart = f3({
  id: 'family-chart-container',
  transition_time: 1000,
  card: {
    w: 220,
    h: 70,
    // ...
  }
});
chart.updateTree({ data: chartData });
```

**Data format:**

```typescript
interface FamilyChartPerson {
  id: string;
  data: {
    first_name: string;
    last_name: string;
    birthday?: string;
    // ...
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

---

## Leaflet

**Purpose:** Interactive map rendering for geographic visualization.

**Version:** ^1.9.4

**Location:** `src/maps/` module

**Core files:**
- `map-controller.ts` - Main Leaflet map management
- `map-view.ts` - Obsidian view wrapper
- `marker-manager.ts` - Marker creation and clustering

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

**Purpose:** Additional PDF generation support.

**Version:** ^3.0.4

**Notes:** Currently installed but pdfmake handles primary PDF generation. May be used for specific PDF features or as a fallback.

---

## Dependency Management

**Bundle considerations:**

| Library | Approximate Size | Loading |
|---------|------------------|---------|
| pdfmake + fonts | ~1.5 MB | Dynamic import |
| Leaflet + plugins | ~500 KB | Dynamic import |
| family-chart | ~200 KB | Static import |
| D3 | ~300 KB | Static import |

**Type definitions (devDependencies):**
- `@types/leaflet`
- `@types/leaflet.markercluster`
- `@types/pdfmake`
- `@types/d3`
- `@types/d3-hierarchy`
- `@types/d3-selection`
