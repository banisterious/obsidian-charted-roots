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

## 5. Action items

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

## 5. References

- [Obsidian Community automated review platform (blog post)](https://obsidian.md/blog/future-of-plugins/)
- [obsidianmd/eslint-plugin](https://github.com/obsidianmd/eslint-plugin) — the rule source.
- [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases) — the manual-review queue (separate from the auto-scan).
- [sentence-case-review.md](sentence-case-review.md) — categorized list of historical sentence-case findings.
- [eslint-setup.md](eslint-setup.md) — local lint setup.
