# Obsidian Community Automated Review — Notes

Captured 2026-05-13 while triaging scan results. Records what we know about how
the Obsidian Community automated review platform (launched 2026-05-12 at
community.obsidian.md) interacts with plugin source — particularly the bits
that are NOT documented in the public eslint-plugin README and that we had to
discover empirically.

---

## 1. Scanner architecture (inferred)

The scanner is a hosted service. Submitting a release (or running a preview
scan from the developer dashboard) clones the repo and runs an analysis pass.
Output is grouped into:

- **Errors** — gating; a release with any error shows "review failed".
- **Warnings** — non-gating; reported but don't block.
- **Release findings** — packaging-level (>5MB bundle, missing attestation, etc.).
- **Suspicious behaviors** — heuristic flags (e.g., `setInterval` + network calls).

What runs under the hood appears to be `eslint-plugin-obsidianmd` against the
recommended ruleset, plus a wrapper layer that adds checks the eslint-plugin
itself doesn't perform (e.g., "this rule cannot be disabled").

### Empirical observations

| Observation | Source | Implication |
|---|---|---|
| Scanner does NOT read project `eslint.config.mjs` | Plugin-dev Discord (veteran developer): "FYI, Obsidian ignores the per-plugin eslint config, to prevent people bypassing the system by disabling rules." | Local rule configuration (off/warn/error) does not propagate. |
| Inline disable directives in source ARE respected | When we silenced `@typescript-eslint/no-unsafe-*` via file-level disables, the underlying warnings stopped appearing in scan output. | Inline `eslint-disable` is the one channel we have. |
| Some rules cannot be disabled at all | Today's scan: `Disabling 'obsidianmd/ui/sentence-case' is not allowed` reported as error. | Scanner wrapper enforces a list of "Required" rules. The rule itself has no disable-restriction in its source ([sentenceCase.ts](https://github.com/obsidianmd/eslint-plugin/blob/master/lib/rules/ui/sentenceCase.ts)). |
| File-level disables require matching `eslint-enable` | Today's scan: `Requires 'eslint-enable' directive` errors for every `no-unsafe-*` family disable. | Scanner enforces scope hygiene. Add `/* eslint-enable <rules> */` at EOF. |
| Sentence-case underlying violations don't appear in scan output | Historical scans (v0.22.29, v0.22.33) showed no `obsidianmd/ui/sentence-case` warnings even when 400+ violations existed locally. | The scanner either runs the rule at a severity that isn't surfaced, or runs the rule narrowly. Underlying violations are NOT scan-gating; the disable-directive itself IS. |

---

## 2. Rule options we cannot use against the scanner

The `obsidianmd/ui/sentence-case` rule accepts these options in
`eslint.config.mjs`:

```js
'obsidianmd/ui/sentence-case': ['warn', {
  brands: ['YourBrand'],
  acronyms: ['XYZ'],
  ignoreWords: ['rest'],
  ignoreRegex: ['^sk-'],
  mode: 'loose',          // or 'strict'
  enforceCamelCaseLower: true,
}]
```

These DO work for `npm run lint` locally but **do not reach the scanner**.

The scanner uses the published `DEFAULT_BRANDS` ([brands.ts](https://github.com/obsidianmd/eslint-plugin/blob/master/lib/rules/ui/brands.ts))
and `DEFAULT_ACRONYMS` ([acronyms.ts](https://github.com/obsidianmd/eslint-plugin/blob/master/lib/rules/ui/acronyms.ts))
lists baked into the eslint-plugin recommended config.

### Proper nouns currently NOT in default lists

These appear in our UI text and would be flagged if the scanner ever surfaces
underlying sentence-case violations:

| Term | Type | Notes |
|---|---|---|
| Charted Roots | brand | Plugin name |
| GEDCOM | acronym | Genealogical Data Communication; appears in importer / exporter UI |
| ODT | acronym | OpenDocument Text; appears in report-generator UI |
| Gramps | brand | Open-source genealogy app we import from |
| GrampsXML / GPKG | acronym | Gramps export formats |
| Sosa | proper noun | Sosa–Stradonitz ancestor-numbering convention |
| Mapbox | brand | Map tile provider option |
| MapTiler | brand | Map tile provider option |
| Stamen | brand | Map tile provider option |
| BBY / ABY / EF / DE / PEF | acronym | Fictional-universe era abbreviations (Star Wars, custom, etc.) — appear in example strings |
| Leaflet | brand | Map library |

### Workarounds, in order of durability

1. **Upstream PR to add to `DEFAULT_BRANDS` / `DEFAULT_ACRONYMS`** ([obsidianmd/eslint-plugin](https://github.com/obsidianmd/eslint-plugin)).
   Precedent: [issue #103](https://github.com/obsidianmd/eslint-plugin/issues/103)
   (CalDAV addition) was resolved this way. Durable but depends on maintainer
   responsiveness.
2. **Change the user-facing string.** Last-resort for legitimate proper nouns —
   the product naming and accurate technical terms shouldn't be sacrificed to a
   linter.
3. **Configure locally + accept scanner residue.** Use `brands` / `acronyms` /
   `ignoreWords` / `ignoreRegex` in our `eslint.config.mjs` to keep `npm run lint`
   clean, and accept that the scanner will surface the violations independently
   (currently it does not appear to).

---

## 3. Inline disable conventions

Based on what we've seen accepted vs. rejected by the scanner:

| Rule family | Inline disable allowed? | Pattern |
|---|---|---|
| `@typescript-eslint/no-unsafe-*` | Yes, must be paired | File-level `/* eslint-disable @typescript-eslint/no-unsafe-assignment, ... */` at top + matching `/* eslint-enable ... */` at EOF |
| `obsidianmd/ui/sentence-case` | **No** | Disable triggers `Disabling not allowed` error. Fix the underlying string or change UI text. |
| Other `obsidianmd/*` rules | Mostly yes | Behavior of "Required" wrapper for individual rules is undocumented; sentence-case is the only one we've hit. |
| Stylelint warnings | Per-line catch-all preferred | `/* stylelint-disable-next-line */` (no rule name) avoids the unknown-rule risk if the scanner uses non-standard rule identifiers. |

### `eslint-plugin-obsidianmd` upgrade notes

The 0.2.x → 0.3.0 upgrade reversed `prefer-active-window-timers` (renamed to
`prefer-window-timers`, recommendation flipped from `activeWindow.X` to
`window.X`) and dropped `prefer-create-el` from the recommended set entirely.
The scanner installs its own copy of the plugin, so a release built against an
older version will still be scanned against the latest published rules — pin
intentionally and re-test after upgrading.

### Description requirement applies to ALL inline directives

As of the scan against v0.22.35, the scanner reports `Unexpected undescribed
directive comment` for any `eslint-disable` or `eslint-enable` lacking a
`-- reason` after the rule list. This applies to BOTH disables and enables.
v0.22.35's EOF `eslint-enable` directives didn't carry descriptions; v0.22.36
added `-- Match scope of file-level disable at top.` to all 125 of them.
Pattern: `/* eslint-enable @typescript-eslint/no-unsafe-* -- reason. */`.

---

## 4. Vendored-library findings (benign FPs)

The scan against v0.22.36 reported **9 dynamic `<script>` element creations**
as a suspicious-pattern warning. All 9 are in vendored library code:

- **~5 sites in `core-js`** — pulled in transitively via `jspdf` → `canvg`
  (an `optionalDependency`). Legacy IE-era `setImmediate` polyfills using
  `script.onreadystatechange` as a microtask trick. Dead-code paths in
  Obsidian's Electron runtime.
- **~3 sites in `jspdf`** — own bundled deferral helpers using the same pattern.
- **1 site in `leaflet-distortableimage`** — webpack chunk-loader. We bundle to
  a single esbuild output; chunk-loading never fires.

None load external scripts. None of these patterns is reachable in our use of
the libraries (we don't use jspdf's SVG features that would import canvg, and
we don't dynamically load chunks). The scanner has no way to distinguish dead
vendored code from live code.

**Possible mitigations (deferred, moderate risk):**
- Drop `canvg` via npm `overrides` (jspdf's `canvg` import is optional/lazy).
  Would eliminate ~5 of the 9 sites. Risk: PDF export breakage if jspdf
  eagerly imports canvg at module init. Worth probing if the warning becomes
  blocking.
- Replace `leaflet-distortableimage` with a lighter alternative. Eliminates
  the webpack-chunk-loader site plus a chunk of bundle size. Risk: distortable
  image overlay feature breaks.
- Replace `jspdf` with a smaller PDF library. Substantial refactor.

For now: accept all 9 as documented vendored-polyfill FPs.

---

## 5. CSS-specific known-and-accepted findings

The scan reports several CSS warnings that we've audited as either
irreducible or legitimate defensive use. Future scan iterations should
reference this section rather than re-investigating.

### 5.1 `!important` on `.card_cont.cr-hl-dim`

[styles/family-chart-view.css:1372](../../styles/family-chart-view.css#L1372)

The family-chart library writes inline `style="opacity: 1"` on `.card_cont`
elements during animation transitions. Inline styles have specificity
1,0,0,0 — only `!important` can override them. **Required by library
design; no alternative without forking family-chart.**

Other previously-flagged `!important` sites have been removed (the
leaflet-container descendants in `map-view.css` and the `.cr-hidden` utility
in `base.css` were dropped in v0.22.38 after DevTools cascade inspection
confirmed they weren't needed in practice).

### 5.2 `multicolumn` partial-support (closed in v0.22.46, with v0.22.47 follow-up)

Status: **closed in v0.22.46** via a CSS Grid migration, with one residual
site missed and closed in v0.22.47.

Three CSS multicolumn properties (`column-width`, `column-gap`,
`column-rule`) had been used on timeline event lists under
`.callout[data-callout="cr-timeline"] .callout-content > ul`. The scanner
flagged multicolumn as "partially supported by Obsidian 1.11.x"; the
feature is fully supported in modern Chromium (Obsidian's renderer), but
the scanner uses a static support-matrix lookup that doesn't reflect that.
The rules now use `display: grid` with `repeat(auto-fill, minmax(...))`,
which is universally supported and flagged-clean. Reading order shifts
from column-major to row-major; for typical timeline lengths this reads
naturally in either pattern. The `--cr-list-column-rule-*` variables
(deprecated 0-width separator) were dropped in the same change.

**v0.22.47 follow-up.** The v0.22.46 migration left one residual
`break-inside: avoid` declaration on the list-item descendant selector
(`styles/timeline-callouts.css:249`). The scanner's lookup table classifies
`break-inside` as part of the multicolumn property family, so even after
the `column-*` properties were removed the v0.22.46 post-release scan still
surfaced a single `multicolumn` warning on this property. The rule was
vestigial after the Grid migration anyway — Grid cells are discrete and
don't break across columns or pages, so `break-inside: avoid` did no useful
work in the new layout. Removed in v0.22.47. Worth noting because the
scanner's `multicolumn` umbrella includes properties beyond the obvious
`column-*` set; future audits should grep for `break-inside`, `break-before`,
`break-after`, and the `page-break-*` legacy aliases as well.

### 5.3 Sibling-aware `:has()` (timeline callouts)

[styles/timeline-callouts.css](../../styles/timeline-callouts.css#L169-L177) — two `div:has()` rules

Detect siblings that contain (or don't contain) a timeline callout to set
spacing between stacked timelines and following content. **Structurally
required — there's no class-based equivalent for sibling-aware selectors,
since classes are set on the elements themselves, not based on what they're
adjacent to.** Annotated in source with `stylelint-disable-next-line`
comments. Other non-modal `:has()` sites (textarea form-fields, checkbox
state, body-level wizard state) were converted to TypeScript-managed
classes in v0.22.38.

### 5.4 `leaflet-distortable` vendored CSS duplicates

25+ duplicate-selector warnings inside the bundled `leaflet-distortable`
library CSS (`.ldi-icon`, `a.leaflet-toolbar-icon.X`, `#toggle-keymapper`,
etc.). The library ships with internal duplicates in its own stylesheet;
we vendor it as-is for the distortable image-overlay feature. **Fixable
only by forking the library or replacing it.** Same library is the source
of the webpack chunk-loader `<script>` site documented in section 4.

### 5.5 Release-level findings (recurring)

| Finding | Status |
|---|---|
| `main.js` larger than 5 MB | Documented Sync Standard limitation per the #411 amendment; bundle reduction reframed as 1.x polish. v0.22.45 enabled production minify, dropping `main.js` from 14.7 MB to 8.27 MB (~50% reduction). Remaining ~3.4 MB gap to the threshold requires structural moves (jspdf consolidation, family-chart-premium evaluation, leaflet plugin audit) that stay post-1.0 scope. Precedent: Excalidraw ships at 8.4 MB in the directory with no apparent sync-related reports. CR has 6,140 downloads with zero sync-related reports across plugin history. |
| `setInterval` + network calls (suspicious pattern) | False positive. The three `setInterval` sites (journey playback ticker, animation ticker, count-up text) and the network call site (`geocoding-service.ts`) are in disjoint call paths; the patterns coexist in the bundle but don't combine. |
| Bitcoin wallet address (funding) | False positive. The wallet address is in the funding/donation section of plugin metadata, not in plugin code. |

---

## 6. Behavior-section recommendations (capability disclosures)

The scan reports three Behavior-section findings as **Recommendations** —
informational disclosures rather than Warnings or Errors. They don't block
promotion or affect scoring like errors do, but each is reviewed below so
future maintainers know these are reviewed-and-accepted.

### 6.1 Vault Enumeration (legitimate, required)

183 call sites of `vault.getFiles` / `vault.getMarkdownFiles` /
`vault.getAllLoadedFiles` across `src/`. Required for:

- Indexing notes by `cr_type` frontmatter (person / place / event / source /
  organization) to build the family graph, Control Center lists, and
  entity-aware features.
- Data Quality scans that walk all entity notes.
- Cleanup wizards and merge tools.

**Cannot be avoided.** Entity discovery is core to the plugin's value
proposition. The recommendation is "disclose this capability to users"
which is covered by the plugin's documentation and feature descriptions.

### 6.2 Clipboard Access (legitimate, user-initiated)

`navigator.clipboard.writeText` sites:

- [citation-service.ts:372](../../src/sources/services/citation-service.ts#L372)
  — copy formatted citation text.
- [citation-generator.ts:137](../../src/sources/ui/citation-generator.ts#L137)
  — copy all citation formats.
- [map-view.ts:1245](../../src/maps/map-view.ts#L1245) — copy place
  coordinates.
- [transfers-renderer.ts:260](../../src/dynamic-content/renderers/transfers-renderer.ts#L260)
  — copy transfer history as plain text.

All sites are user-initiated by click handlers; no `readText` calls (the
plugin never reads from the clipboard). **Standard plugin behavior** for
the "copy to clipboard" affordances genealogy users expect on citations,
coordinates, and exportable text.

### 6.3 Dynamic Code Execution (closed in v0.22.45)

Status: **closed in v0.22.45** via a new `patch-pdfmake.js` postinstall.

Two `new Function("return this")()` sites had been flagged in bundled
`main.js`. Both came from `pdfmake`'s bundled core-js globalThis polyfill
body and the webpack runtime's `__webpack_require__.g` initializer:

```js
g2 = this || new Function("return this")();
```

`grep "new Function\|eval(" src/` confirms zero matches in plugin source —
the pattern was vendored-library feature-detection that uses
dangerous-looking API surfaces in safe ways (hardcoded string constant
returning the global object; the `typeof globalThis === "object"`
early-return always fires in Electron, so the `new Function` branch was
dead code). Static analysis couldn't distinguish `"return this"` (safe)
from `<user-controlled value>` (unsafe), so the scanner flagged it
conservatively.

The v0.22.45 fix mirrors the `patch-core-js-polyfill.js` shape:
exact-string locate + idempotency marker + fail-loud warning when the
ORIGINAL string isn't found (vendor update protection). Both branches
are removed at the source so neither reaches `main.js`. Post-release scan
returned clean of the Recommendation; the IE5-8 setImmediate site stays
handled by the existing `patch-core-js-polyfill.js` (separate code path,
no overlap).

This was the third instance of the **same flavor of false positive** that
`createElement('script')` (resolved v0.22.40–v0.22.41) and the
setInterval+network Behavior Warning (resolved v0.22.42) represented:
vendored library feature-detection code that uses dangerous-looking API
surfaces in safe, dead-code-branch ways. Pattern playbook is established:
identify the literal sites via bundle grep, write a postinstall patch
that strips the dead branches at source.

---

## 7. Action items

- [ ] Upstream PR: add `Charted Roots` to `DEFAULT_BRANDS` in
      [obsidianmd/eslint-plugin/lib/rules/ui/brands.ts](https://github.com/obsidianmd/eslint-plugin/blob/master/lib/rules/ui/brands.ts).
- [ ] Upstream PR: add `GEDCOM`, `ODT`, `GPKG` to `DEFAULT_ACRONYMS` in
      [obsidianmd/eslint-plugin/lib/rules/ui/acronyms.ts](https://github.com/obsidianmd/eslint-plugin/blob/master/lib/rules/ui/acronyms.ts).
- [ ] Upstream PR: add `Gramps`, `Mapbox`, `MapTiler`, `Stamen`, `Leaflet`
      (and possibly `Sosa`) to `DEFAULT_BRANDS`. Some of these may belong in
      acronyms; check each entry's casing.
- [ ] Configure `brands` / `acronyms` arrays in our `eslint.config.mjs` to keep
      `npm run lint` clean independently of upstream timelines.

---

## 8. References

- [Obsidian Community automated review platform (blog post)](https://obsidian.md/blog/future-of-plugins/)
- [obsidianmd/eslint-plugin](https://github.com/obsidianmd/eslint-plugin) — the rule source.
- [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) — the manual-review queue (separate from the auto-scan).
- [sentence-case-review.md](sentence-case-review.md) — categorized list of historical sentence-case findings.
- [eslint-setup.md](eslint-setup.md) — local lint setup.
