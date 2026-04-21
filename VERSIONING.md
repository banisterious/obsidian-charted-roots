# Versioning Policy

Charted Roots follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (MAJOR.MINOR.PATCH). SemVer's general rules apply, but a genealogy plugin's "public API" includes more than just code interfaces: the `cr_*` frontmatter schema, command IDs, settings keys, folder layout conventions, GEDCOM round-trip behavior, and file outputs are all things users build workflows around. This document spells out what each digit means in that context.

For the actual changelog of what shipped in each version, see [CHANGELOG.md](CHANGELOG.md).

## What counts as Charted Roots' "public API"

- **Frontmatter schema** — `cr_type`, `cr_id`, relationship fields (`father`, `mother`, `spouse`/`spouse_id`, `children`/`children_id`, `parents`/`parents_id`, indexed `spouseN` variants, adoptive_* fields), standard data fields (`born`, `died`, `birth_place`, occupation, residence, etc.), sourced-facts schema (`sourced_*` arrays), event-note schema, source-note schema, organization-note schema, custom-relationships overlay data shape. Default property names are API; user-configured aliases are not.
- **Command IDs** — users bind these to hotkeys.
- **Settings keys** — users back these up or sync them.
- **Default folder layout** — `people/`, `places/`, `events/`, `sources/`, `organizations/` conventions.
- **GEDCOM round-trip behavior** — see the dedicated section below.
- **File outputs** — Canvas files (`.canvas`), tree images, report shapes.

## During 0.x.x (current phase)

- Charted Roots has been shipping 0.x for many versions with an active user base installing via BRAT and direct GitHub install. The operating model throughout has been **additive changes + migrations, not hard breaks** — when the schema evolved (for example, legacy `type` → `cr_type`, or per-spouse metadata moving from nested objects to indexed `spouseN_*` properties), CR shipped a migration path rather than breaking existing vaults.
- `0.MINOR.PATCH` continues to ship new features; `0.MINOR.0` lands features or meaningful behavior changes; `0.MINOR.PATCH` covers bug fixes and smaller improvements.
- Any schema change in this phase is expected to include migration handling on read, consistent with how earlier schema changes shipped.
- The 0.x phase does not guarantee API stability in the SemVer sense, but in practice CR has treated the data model as load-bearing and changes arrive as additions.

## When 1.0.0 ships

Three criteria, all verifiable:

1. **No open critical or data-loss bugs**, and all issues currently labeled `released-testing` have been confirmed by reporters and transitioned to `released` / closed.
2. **Three weeks of BRAT testing** on the candidate release with no new critical or data-loss issues filed.
3. **Regression test coverage** in place for the relationship load/save round trip and for the migration services that run on note load. See [CHANGELOG.md](CHANGELOG.md) for specifics when 1.0 ships.

Feature scope is not a 1.0 gate. Remaining roadmap items (interactive timeline view, custom property definitions, time-varying relationships, inline life-event coverage, structural filters) are all MINOR releases on the 1.x track.

## After 1.0.0

- **MAJOR** (1.x → 2.0): breaking changes to `cr_*` property names, the `cr_id` format, entity-type value names (e.g., `person` / `place` / `event` / `source` / `organization`), default folder layout, GEDCOM custom sub-tag names or field mappings, or any user-vault-modifying behavior change. Retiring accumulated legacy-format support (e.g., dropping legacy `spouse` array in favor of forcing indexed `spouseN`) is a MAJOR trigger — the natural moment to prune compatibility layers that built up during 0.x. Any MAJOR release includes a migration story in the release notes.
- **MINOR** (1.0 → 1.1): new features, new frontmatter fields, new commands, new settings, new GEDCOM field coverage, and backward-compatible schema extensions.
- **PATCH** (1.0.0 → 1.0.1): bug fixes, performance improvements, docs, tests, and dependency bumps that don't surface to users.

No 2.0 is currently planned. It is hypothetical — the triggers above would have to be invoked for a specific reason.

## What does *not* count as breaking

- Adding new optional `cr_*` properties.
- Adding new commands, context-menu items, or settings (with sensible defaults).
- Adding new custom GEDCOM sub-tags, or new coverage of standard GEDCOM tags.
- UI changes that don't alter data on disk.
- Chart rendering changes (overlays, colors, layout), as long as the underlying data is unchanged.
- Dependency or build-tool changes invisible to users.
- Internal refactors that preserve observable behavior.

## GEDCOM round-trip

CR's GEDCOM API is framed as **round-trip integrity plus the mapping of frontmatter fields to GEDCOM tags**, not the exact byte-level output. Specifically:

- **Guaranteed:** importing a CR-produced GEDCOM back into CR produces equivalent notes. The output is valid GEDCOM per the spec CR targets.
- **Not breaking:** adding new standard tag support, adding new custom CR sub-tags (e.g., `source_parent_id`), improving fidelity by exporting more of a note's data than before, whitespace and header comment changes.
- **Breaking (MAJOR):** renaming an existing custom CR sub-tag, changing how a frontmatter field maps to a GEDCOM tag, dropping previously-exported data from output, changing the target GEDCOM spec version, changing date / name / place serialization in a way that loses information.

External-tool compatibility (Gramps, Family Tree Maker, etc.) is **not** an API guarantee. Those tools have their own dialects and interpretations. CR promises valid GEDCOM syntax and CR-to-CR round-trip fidelity; everything beyond that is best-effort.

## Community Plugins submission is independent of versioning

Charted Roots is currently under review for inclusion in Obsidian's Community Plugins directory. Versioning decisions — including 1.0 — do not wait on that review, and the review does not wait on any particular version.

BRAT users and direct-install users get every release as it's tagged on GitHub, regardless of review status. When Community Plugins approval lands, the listed plugin will be on whatever current version exists at the time — could be 1.0.0, could be 1.2.4 if we've shipped features and fixes during the queue wait.

By convention, plugin authors often submit when they'd consider their work production-ready (at or just before 1.0). CR already submitted ahead of 1.0 because the review queue is long; this document's criteria govern when the 1.0 label is attached, not when the listing appears.

## `manifest.json` and `versions.json`

Obsidian uses two files to track plugin versions:

- `manifest.json` carries the current version and plugin metadata.
- `versions.json` maps each plugin version to its required Obsidian `minAppVersion` (for example, "Charted Roots 1.2.0 needs Obsidian >= 1.7.2").

Both files are kept in sync by `npm version X.Y.Z --no-git-tag-version`, which invokes [version-bump.mjs](version-bump.mjs). Bump `minAppVersion` in `manifest.json` first if a release requires a newer Obsidian; the version-bump script preserves whatever's there.
