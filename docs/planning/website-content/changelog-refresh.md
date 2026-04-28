# Changelog Page Refresh — draft

**Target page:** `/changelog/_index.md` on chartedroots.com
**Status:** Ported to chartedroots.com 2026-04-24, refreshed 2026-04-25 with v0.22.6 + v0.22.7 spotlights, refreshed 2026-04-26 with v0.22.8 spotlights (#448 and #450 reframed from post-release into the 0.22.8 release; #442 follow-up added as inline addendum), refreshed 2026-04-26 (evening) with v0.22.9 spotlights (era-aware time slider closing the DateService cluster at eight sites; pixel-coord rendering follow-ups; older-sibling reality-window; place-graph diagnostic), refreshed 2026-04-28 with v0.22.10 + v0.22.11 spotlights (#485 closes the lat/lng-only-on-pixel-CRS cluster as the third site after #448 / #474; #442 follow-up effectively closes #478 by removing its broken-wikilink trigger; first contributions from @Lemmeron via #489 and @doctorwodka via #476). All four clusters (0.22.x, 0.21.x, 0.20.x, 0.19.x forward) live on `/changelog/`.
**Source material:** [CHANGELOG.md](../../../CHANGELOG.md), [wiki-content/Release-History.md](../../../wiki-content/Release-History.md).

---

## Authoring notes

Goal of this refresh: close the ~4-month gap between the live page (ends at v0.19.1, January 2026) and the current state (v0.22.5, April 2026). That's roughly 25 releases covering the bulk of the world-building work, evidence tracking, and the 1.0 stability run.

Rather than a per-release bullet list, this draft uses **cluster spotlights**: one section per minor-version cluster (0.20.x, 0.21.x, 0.22.x), each with a theme paragraph + 5–7 headline features getting 2–3 sentences apiece. Full release lists link out to GitHub.

Shape is modeled loosely on the existing Release-History.md narrative but trimmed for an external-facing audience.

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

# Changelog

For the full per-release log, see [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases). This page groups headline changes by release cluster.

---

## v0.22.x: Stability run before 1.0

Twelve releases across this cluster. Four same-day hotfixes (0.22.1 through 0.22.4) closed critical data-loss bugs surfaced by community testing. 0.22.5 through 0.22.11 brought the fictional-calendar work into shape, landed Phase 1 of the universe → calendar link, closed eight distinct surfaces where era-naive year extraction silently broke fictional dates, fully closed the lat/lng-only-on-pixel-CRS cluster across three journey-mode sites, and hardened person-delete cleanup against broken wikilinks and single-relationship scalar serializations. Regression tests grew from 189 to 422 across the twelve releases. Stability window has held since 0.22.4 (seven patches without a reset).

### Map time slider becomes era-aware (and closes the DateService cluster) ([#453](https://github.com/banisterious/obsidian-charted-roots/issues/453))

The map view's "who was alive at year X" time slider was hardcoded to a 1800–2000 real-world span, so on fictional-era universes (Star Wars BBY/ABY, Middle-earth TA/SA, etc.) the slider's range never intersected the data and the feature was effectively unusable. The slider now derives its min/max from the map's computed year range and renders labels via a new `formatCanonicalYear` helper that inverts canonical years back to era strings ("82 BBY", "5 ABY"). Real-world dates fall back to the plain numeric label. **Eighth and final site of the DateService-bypass cluster** that ran across 0.22.5 → 0.22.9 — every era-naive year-extraction subsystem flagged during the cluster is now era-aware.

[More in Features →](/features/#geographic-features)

### Pixel-coord cluster fully closes across three journey-mode sites ([#448](https://github.com/banisterious/obsidian-charted-roots/issues/448), [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474), [#485](https://github.com/banisterious/obsidian-charted-roots/issues/485))

Three map-mode code paths shared the same lat/lng-only assumption that broke silently on `CRS.Simple` image maps where every place uses pixel coordinates and lat/lng defaults to `(0, 0)`. v0.22.7 fixed the journey-path build dedup that was collapsing every pixel-coord waypoint onto a single phantom (#448). v0.22.10 fixed the camera fly-to and popup placement that landed at the bottom-left corner instead of the actual waypoint (#474). v0.22.11 closes the third site — the initial framing rectangle that ran on entering journey mode and briefly framed the bottom-left corner before the camera flew away (#485). Each site now detects `CRS.Simple` and uses `[pixelY, pixelX]` instead of `[lat, lng]`. Geographic maps unaffected. With all three closed, journey playback opens, frames, and steps through pixel-coord image maps end-to-end without the misframings that surfaced once #448 unblocked the visibility chain.

### Map path labels render upright on multi-waypoint paths ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472))

Path labels (place names rendered along migration and journey paths) flipped inconsistently — some upright, some upside-down on the same map — because leaflet-textpath repeats the label along the entire polyline path and applies a single global 180° rotation when its `flip` mode is on. Any path that bends in different screen-space directions can't be made upright everywhere by one rotation; at least one segment will always render the label backward. Three iterations of fix tried the chord direction (v0.22.9), then the longest-segment direction (v0.22.10), each closing more cases but not all. v0.22.11 lands the structural fix: labels now ride on a separate invisible polyline covering only the longest screen-space segment of the source path, so leaflet-textpath has a single segment to render along and the flip decision is correct for that segment alone. The visible polyline keeps its full multi-waypoint shape; overlapping segments from different polylines each get their own correctly-oriented label.

[More in Features →](/features/#geographic-features)

### Person delete cleanup sweeps wikilinks and single-relationship scalars ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up, [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478))

Two gaps in v0.22.7's person-delete cleanup, both surfaced once @DigitalDreamn verified the original `_id` sweep on the Lars / Star Wars fixture. The cleanup planner swept the canonical `*_id` arrays (`father_id`, `children_id`, etc.) but not the parallel wikilink-bearing fields (`father`, `children`, `step_child`, etc.) — the original implementation delegated wikilink cleanup to Obsidian's native rewriting, but Obsidian only rewrites wikilinks on rename, not on delete. Deleted persons left broken `[[placeholder]]` links visible in the properties pane and a contributor to a separate save-time bug (#478) that injected empty strings into the parallel `_id` array on the next save. v0.22.11 extends the planner with a parallel wikilink-sweep branch and converts every "array" field handler to accept both array and scalar shapes — turns out the plugin's own writer serializes single-relationship fields as scalars rather than single-element arrays, so deleting an only-child / only-step-child / only-spouse had been silently leaving the dead reference behind. **Closes #478 by removing its trigger:** with wikilinks cleaned up at delete time, no broken wikilink survives to the next save.

### Universe dropdown reflects renamed and newly-created Universe notes ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 1)

Renaming a Universe note (e.g. "Star Wars" → "Star Wars (AU)") via the Edit Universe modal left the new name absent from the Edit Person modal's Universe dropdown — even after restarting Obsidian. Cause: the dropdown was sourced from the distinct `universe:` field values found across person notes and place notes, not from the actual Universe notes in the universes folder. Renaming a Universe note changed its `name`, but no person/place file had been updated to reference the new name yet, so the dropdown extracted the old value. Freshly-created Universe notes hit the same gap. v0.22.11 unions `UniverseService.getAllUniverses()` (the universe-notes folder) into the cached list alongside the existing graph extractions, so renamed and newly-created Universe notes appear in the dropdown immediately. The deeper rename-cascade question — propagating the new name across referencing notes' `universe:` fields — is tracked as Part 2.

### Custom non-person `cr_type` notes filtered out of Person notes view ([#489](https://github.com/banisterious/obsidian-charted-roots/issues/489))

A note with `cr_type: hex` (or any user-defined custom type the plugin doesn't know about) was being treated as a person and listed in the control center's Person notes browser alongside actual character notes — first surfaced on a hex-grid worldbuilding vault. The family-graph extractor used an exclusion list, screening out the known non-person types (source, event, place, organization, proof_summary, universe, citation) and treating any `cr_id`-bearing note that didn't match as a person. User-defined custom types fell through every exclusion and got coerced into people. v0.22.11 adds an explicit inclusion check via the centralized `isPersonNote` helper, which already handled the unknown-`cr_type` case correctly while preserving the legacy "cr_id with no `cr_type` → treat as person" behavior for older vaults. First contribution from @Lemmeron.

### Negative birth years preserve sign through suffixed forms and custom-era prefixes ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476))

Custom-era date strings with explicit negative signs (`DE -5740`, `Year -1234 of the Reign`) were rendering on the timeline as positive numbers because the year-extraction regex used a word boundary that ate the leading minus sign on 4-digit numbers. v0.22.10 added a standalone-negative branch that captures digits preceded by a minus sign that isn't part of an ISO date separator. v0.22.11 follows up after @doctorwodka's verification — the `-90` short-form worked but the original `DE -5740ish` repro still failed because the trailing word boundary doesn't fire between digits and letters (both are word chars). Replaced with a `(?=$|[^0-9])` lookahead so suffixed forms now match. Also removed a duplicate `extractYear` implementation in the relationships renderer (a pre-existing bare 4-digit regex that pre-dated #476 entirely — same class of bug on a different surface). First contribution from @doctorwodka.

### Calendar View accepts era-suffixed years and round-trips them ([#480](https://github.com/banisterious/obsidian-charted-roots/issues/480))

The Calendar View's year-navigation widget rendered `String(currentYear)` directly, with no era awareness, and constrained input to `0 < year < 10000`. So fictional-calendar vaults using descending eras (Star Wars BBY, Middle-earth TA, etc.) saw "1499" instead of "1499 ABY" and couldn't enter "82 BBY" at all. The year input is now `type="text"`, the change handler routes through `DateService.parseDate` (accepting era-suffixed strings, ISO dates, and bare signed integers), and the resolved universe is recorded alongside the canonical year so subsequent renders format via `formatCanonicalYear` for round-trip era display. Persisted state gains a `yearUniverse` field so era context survives view reopens. **Ninth and final site of the year-rendering cluster** that ran across the v0.22.x stability run.

### Console-error regression from `'auto'` orientation caught and fixed within 24 hours ([#477](https://github.com/banisterious/obsidian-charted-roots/issues/477))

v0.22.9's path-label fix passed `orientation: 'auto'` to leaflet-textpath as the no-flip branch, on the assumption it meant "follow path direction naturally." But leaflet-textpath@1.3.0 only recognizes `'flip'` (180°), `'perpendicular'` (90°), and numeric rotations — anything else falls through and gets injected literally into the SVG `transform` attribute. The browser saw `transform="rotate(auto cx cy)"` and rejected each one as invalid, flooding the DevTools console with red on dense maps. v0.22.10 omits the `orientation` key entirely when no flip is needed; leaflet-textpath then skips its rotation block and the text follows the path naturally. Caught + fixed within 24 hours of 0.22.9 shipping, thanks to @DigitalDreamn surfacing it during console-debugging on a separate issue.

[More in Features →](/features/#geographic-features)

### Older siblings' births no longer appear before the focal person's birth ([#469](https://github.com/banisterious/obsidian-charted-roots/issues/469))

The sibling-births block on a person's timeline had no reality-window guard for events predating the focal person's birth. An older sibling's birth would render as the first entry on the focal person's own timeline — Padmé Naberrie's timeline showed her older sister Sola's birth (50 BBY) above Padmé's own birth (46 BBY). A new symmetric guard mirrors the v0.22.8 after-focal-death guard: events before the focal person's birth are filtered, but same-year siblings (twins, close births) still surface — the guard fires only on unambiguous before-focal-birth via canonical-year comparison, so fictional descending eras compare correctly. Third site of the reality-window cluster alongside step-siblings (#456) and after-focal-death (#457).

[More in Features →](/features/#dynamic-content-blocks)

### Place graph silent-skip becomes a discoverable warning ([#471](https://github.com/banisterious/obsidian-charted-roots/issues/471))

Place-shaped notes that lack a `cr_id` are excluded from the place graph, which means by-name lookups, modal dropdowns, and map markers can't see them. The exclusion was completely silent — no console log, no UI surface, no data-quality flag — making the failure mode hard to diagnose. A `warn`-level log on the skip with the file path now makes the exclusion discoverable from the dev console. A follow-up data-quality wizard check that surfaces and offers to fix missing-`cr_id` places is queued for a later cycle. Surfaced from the #464 investigation as one of the candidate root causes for "by-name lookup returned undefined for a place that exists in the vault."

[More in Features →](/features/#geographic-features)

### Statistics Dashboard date-inconsistency counter respects fictional eras ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) follow-up)

The Statistics Dashboard has a "Date inconsistencies" counter that lives on a separate code path from the data-quality validator fixed in v0.22.6. For BBY-style descending eras, its own year-extraction logic read digit runs as positive numbers, so coherent BBY lifespans (1045 BBY → 1042 BBY) tripped the naive `birthYear > deathYear` check and left a red error bar in place after upgrading. The counter now consults the date service first. Seventh fictional-date code path closed since the cluster started.

[More in Features →](/features/#statistics-and-reports)

### Map year extraction and pixel-coord journey paths ([#454](https://github.com/banisterious/obsidian-charted-roots/issues/454), [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448))

Two related fixes that together make journey playback work end-to-end on fictional-calendar maps. The map's own year-extraction (separate from the date service) required a 4-digit numeric year, so fictional-era timestamps under 1000 like `82 BBY` parsed as `undefined`, breaking chronological sort and dropping events from year-range filters (#454). And on custom image maps, every place uses pixel coordinates with no lat/lng, but the journey-path builder deduplicated waypoints by lat/lng only, so all pixel-coord waypoints collided on `(0, 0)` and collapsed to a single entry. Cliegg Lars's Tatooine → Ator → Alderaan → Naboo arc had no journey at all (#448). Both paths now resolve correctly: the map extractor consults the date service for fictional dates, and the dedup key prefers `placeId` and falls back to a composite that doesn't collide across coordinate systems. This was the actual root cause behind the entire #434 thread. The v0.22.7 placeholder diagnosed the symptom; #448 was the underlying cause.

[More in Features →](/features/#geographic-features)

### Marriage statistics respect fictional dates ([#458](https://github.com/banisterious/obsidian-charted-roots/issues/458))

Two marriage-stat surfaces (age at first marriage, longest-marriage duration) had a hardcoded `<= 80` upper bound that bypassed the configurable `maxAge` getter the rest of the engine uses. With fictional dates enabled, that cap was supposed to lift to infinity so long-lived characters could contribute; instead it stayed at 80, silently dropping any marriage age over that threshold. Both sites now defer to `maxAge`. The real-world cap also widens from 80 to 120 to match the lifespan cap used elsewhere — a marriage at 86 (Hugh Hefner's last) now counts in real-world stats too. First contribution from @doctorwodka.

[More in Features →](/features/#statistics-and-reports)

### Timeline filters relative events outside the focal person's reality window ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456), [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457))

Two related leaks where a person's timeline surfaced events that didn't fit their lived experience. Step-siblings' births appeared on each other's timelines because the sibling-iteration walked each parent's `childrenCrIds` without distinguishing biological from step-children. Anakin Skywalker's timeline showed Owen Lars's birth even though they share only a stepparent (#456). Spouse deaths surfaced on the survivor's timeline even when the survivor pre-deceased the spouse: Shmi's timeline showed Cliegg's death even though Shmi died first (#457). Same class of bug, paired fix: a step-sibling filter mirroring the v0.22.7 stepchild treatment, plus a focal-death reality-window guard that uses the date service's canonical year so descending eras compare correctly. Audit covered parent deaths in the same pass.

[More in Features →](/features/#dynamic-content-blocks)

### Create Place modal polish ([#459](https://github.com/banisterious/obsidian-charted-roots/issues/459), [#463](https://github.com/banisterious/obsidian-charted-roots/issues/463), [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464))

Three modal-area fixes from the same #459 split. Universe and Parent place text inputs were noticeably narrower than Name, Aliases, and Collection in the same modal because long descriptions on those rows pushed the info column wider. All rows now render at a fixed 220px input width (#459). Newly-created place notes weren't visible to subsequent Create Place modal invocations in the same session, so typing an existing parent's name produced a spurious "doesn't exist" auto-create prompt (#464), and saving anyway wrote only the `parent_place` wikilink without the companion `parent_place_id`, leaving a half-write that only resolved after a subsequent Edit + Save round trip (#463). The cache now refreshes when the modal opens, and a typed parent name resolves to its cr_id before the auto-create branch fires. Same class as the create/edit asymmetry pattern that's been recurring across the cluster.

[More in Features →](/features/#data-entry-and-management)

### Map marker polish ([#465](https://github.com/banisterious/obsidian-charted-roots/issues/465), [#466](https://github.com/banisterious/obsidian-charted-roots/issues/466))

Two marker-related fixes from the same #438 verification window. Custom event markers (`cr_type: event` notes that aren't a built-in birth / death / marriage type) used a pink default that sat visually too close to death-event red on dense maps. The default is now yellow, clearly outside the warm-red cluster (#465). And popups for custom events used to render the literal "Custom:" label, dropping the category context the user had authored. Popups now surface the original event type (e.g., "Backstory:", "Migration:") when the resolved type collapses to custom and a label is available, falling back to "Custom:" only when neither is set (#466).

[More in Features →](/features/#geographic-features)

### Custom-relationships overlay arcs paint above family links ([#450](https://github.com/banisterious/obsidian-charted-roots/issues/450))

The Custom Relationships Overlay's downward arcs route through the children-row link bundle on multi-generational trees, and were silently hidden behind it. The original "always paint under family links" decision was meant to protect structural lines from being occluded by heavy overlay stacks (3+ arcs on a single endpoint pair), but it also hid the typical case where only one or two non-stacked arcs exist. The renderer now paints the overlay group on top of family links by default and falls back to the original "under" behavior only when at least one endpoint pair has 3+ overlay arcs stacked on it. Surfaced during a Custom Relationships Overlay motion-capture demo setup that exposed the visual on a real Anderson family fixture.

[More in Features →](/features/#custom-relationships)

### Wikipedia clipper template fix ([#440](https://github.com/banisterious/obsidian-charted-roots/issues/440))

The `wikipedia-biography-basic.json` clipper template preserved infobox HTML with protocol-relative image URLs (`//upload.wikimedia.org/...`), which Obsidian's renderer can't follow. Infobox photos rendered as broken-image icons in reading mode. The template now rewrites those URLs to absolute HTTPS so the preserved HTML carries valid links. Re-import the template in Web Clipper to pick up the fix. Clipper templates ship via `docs/clipper-templates/` and aren't part of a versioned plugin release.

[More in Features →](/features/#evidence-and-sources)

### Universe → calendar wiring ([#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) Phase 1)

The Universe wizard's step 2 now offers a three-way calendar picker (None, Built-in, Custom) replacing the earlier binary "create custom calendar?" toggle. When the universe name slug-matches a built-in calendar's universe field, that built-in is preselected — a "Star Wars" universe auto-selects Galactic Standard, "Middle-earth" auto-selects Middle-earth Calendar, and so on. The Edit Universe modal gains a matching Calendar field, and the Universes tab shows the linked default calendar as a sub-line under entity counts. Phase 2 (parser-side reading of the link, bare-year inference) is deferred to a separate issue.

[More in Features →](/features/#world-building)

### Spouse deaths now appear on timelines by default ([#447](https://github.com/banisterious/obsidian-charted-roots/issues/447))

`timelineShowSpouseDeaths` flipped from `false` to `true`, so widow / widower context surfaces on the timeline dynamic block without users having to discover the setting first. The toggle is unchanged — anyone who'd rather hide spouse deaths can still opt out from Settings → Charted Roots → Timeline.

[More in Features →](/features/#dynamic-content-blocks)

### Person-delete cleans up orphan cr_ids ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442))

When a person note is removed, Charted Roots now scans every other person note's `*_id` fields and removes the deleted cr_id from any matches. Previously Obsidian rewrote the wikilink references but left the parallel `*_id` arrays carrying orphaned strings, which downstream code (timeline gathering, family chart, exports) would silently mishandle. Covers all canonical fields and user-aliased equivalents. Existing vault-wide orphans from prior deletes can still be cleaned via the existing data-quality "Remove orphaned cr_id references" tool. A 0.22.8 follow-up corrected a field-name mismatch (`stepchild_id` → `step_child_id`) so cleanup also sweeps the stepchild slot the bidirectional-linker actually writes.

[More in Features →](/features/#data-quality-tools)

### Stepchildren on stepparent timelines and in the profile view ([#441](https://github.com/banisterious/obsidian-charted-roots/issues/441), [#443](https://github.com/banisterious/obsidian-charted-roots/issues/443))

Stepchildren's birth events no longer appear on stepparents' timelines. Vault data commonly lists both biological and step children in `childrenCrIds`, so Cliegg Lars's timeline used to show "Birth of Anakin Skywalker" even though Cliegg married Anakin's mother after Anakin was born. The family-graph now derives `stepchildrenCrIds` on each parent by inverting the children's `stepfatherCrIds` / `stepmotherCrIds`, and the timeline's children-births block skips any id present in the new array. The Entity Profile View's Children block uses the same data to label stepchildren and adopted children with their specific category instead of the generic "Child" fallback.

[More in Features →](/features/#entity-profile-view)

### Map popups show ages and full date ranges ([#444](https://github.com/banisterious/obsidian-charted-roots/issues/444))

Marker popups on the geographic map now append `(age N)` for non-birth events and render full `from – to` ranges for events with a `date_to`. For Shmi Skywalker Lars dying at 22 BBY, the popup now reads `Death: 22 BBY (age 50)`. For a residence at Ator from 64 BBY to 22 BBY, it shows the full duration instead of just the start date. Birth events suppress the redundant age 0 annotation. Sibling fix to v0.22.5's #434 on a different code path (static markers vs. journey waypoints).

[More in Features →](/features/#geographic-features)

### Map journey mode says why playback isn't available ([#445](https://github.com/banisterious/obsidian-charted-roots/issues/445))

Entering journey mode for a person with fewer than two resolvable waypoints used to leave the marker filter applied with no explanation, no playback panel, and no notice. The map now renders an inline placeholder where the playback panel would have appeared, naming the person and stating that they need at least 2 places with valid coordinates. Reuses the same teardown path as the playback controls so exiting journey mode clears it cleanly.

[More in Features →](/features/#geographic-features)

### Fictional-era support extended across data quality, journey, and timeline ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), [#438](https://github.com/banisterious/obsidian-charted-roots/issues/438), [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439))

Three sibling fixes in v0.22.6 building on v0.22.5's `DateService` plumbing. Date-inconsistency checks (`DEATH_BEFORE_BIRTH`, `UNREASONABLE_AGE`, etc.) now respect descending eras like BBY and stop firing FUTURE_BIRTH / FUTURE_DEATH on fictional dates. Map journey playback merges life events from `cr_type: event` notes alongside the inline `events:` array, fixing journeys that previously collapsed to two or three waypoints in event-note-style schemas. The timeline dynamic block routes age computation through `DateService.calculateAge` across all eight call sites, fixing missing age annotations on BBY-spanning lifespans.

[More in Features →](/features/#data-quality-tools)

### Cross-entity Collections ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426))

Collections defined on a place note are now visible in the Edit Person dropdown, the Control Center Collections tab, and the dockable Collections sidebar. Before 0.22.3 those surfaces only read from a person-focused aggregator, so a place-only Collection appeared to vanish. The aggregator was rewritten to merge person and place counts, and the UI shows membership badges like "5 people, 3 places" where the split matters.

[More in Features →](/features/#collections)

### Step-parent persistence ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429))

Setting a step-father or step-mother in Edit Person now writes to the file. Before 0.22.4, three separate gaps in the edit path caused the save to silently drop the step-parent fields: the frontmatter loader never extracted them, the plumbing between loader and modal didn't carry them, and the writer had no branch to persist them. Each gap existed in a path where adoptive parents already worked correctly. The fix copies that pattern into all three places. Six new regression tests cover the load side.

### IDs-only relationship array recovery ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415))

Edit Person handles notes whose frontmatter carries `children_id` / `spouse_id` / `parents_id` arrays but no paired wikilink arrays. Before 0.22.2, those notes loaded as empty relationship blocks and saving wiped the IDs. The load path now falls back to the ID array when the wikilink array is missing. An empty `[]` still counts as an intentional clear, so the fallback doesn't kick in when the user actually meant "no relationships here." The writer restores both shapes on save. Orphan IDs that don't resolve to any person in the vault are preserved as-is.

### Data-quality validator understands fictional dates ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433))

Dates like `22 BBY` or `ABY 1042` stop getting flagged as non-standard for persons in a fictional-calendar universe. The validator used to accept only real-world formats (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`). It now consults the fictional date parser first, so anything that resolves through a registered era abbreviation is recognized.

[More in Features →](/features/#data-quality-tools)

### Map popup ages respect fictional calendars ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434))

Ages and durations in map waypoint popups now match the fictional calendar for universe-scoped entities. The code used to do plain numeric year subtraction, which falls apart for descending eras like BBY and fails outright on era boundaries like BBY-to-ABY. The popup now calls into the date service with the person's universe as context.

[More in Features →](/features/#geographic-features)

### Spouse format migration hardening ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423), [#420](https://github.com/banisterious/obsidian-charted-roots/issues/420), [#417](https://github.com/banisterious/obsidian-charted-roots/issues/417))

Three lingering issues from the 0.21 spouse-format migration are fixed. The phantom-deletion cascade that could fire during a migration no longer triggers. Cross-note indexed-spouse corruption on older notes is corrected on next load. Adoptive siblings render correctly in the relationships dynamic block.

**Full cluster:** [0.22.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.0) · [0.22.1](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.1) · [0.22.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.2) · [0.22.3](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.3) · [0.22.4](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.4) · [0.22.5](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.5) · [0.22.6](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.6) · [0.22.7](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.7) · [0.22.8](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.8) · [0.22.9](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.9) · [0.22.10](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.10) · [0.22.11](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.11)

---

## v0.21.x: Edit Person Round-Up

v0.21.0 was a focused stability release centered on the Edit Person modal. Four round-trip bugs were fixed and the testing infrastructure was formalized.

### Relationships preserved through partial ID and basename mismatches ([#410](https://github.com/banisterious/obsidian-charted-roots/issues/410))

Relationships were being dropped on edit when the wikilink array held items whose target notes had basenames differing from the `name` field, or when only IDs were present without the paired wikilinks. The fix extended the v0.20.62 resolver to also match on a note's basename and made the array-field fallback run per-entry instead of all-or-nothing. Unresolvable wikilinks are now preserved through the round trip rather than silently dropped.

### Clearing optional fields actually clears frontmatter ([#406](https://github.com/banisterious/obsidian-charted-roots/issues/406))

Eleven optional person fields didn't actually clear when emptied through the modal. Affected fields included universe, collection, personType, sex, givenName, maidenName, pronouns, and the four DNA-related properties. All now use the `?? ''` (or `?? []`) pattern so the writer's clear path fires correctly. A sibling fix landed for the nickname field's three-way gap ([#412](https://github.com/banisterious/obsidian-charted-roots/issues/412)) and for the endogamy flag's toggle-off value getting converted to undefined ([#413](https://github.com/banisterious/obsidian-charted-roots/issues/413)).

### Testing infrastructure

A Vitest test harness landed alongside the fixes, with 31 regression tests for the relationship load path. The project's public API was formalized in a new [VERSIONING.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/VERSIONING.md) file documenting plugin-specific SemVer rules and the criteria for 1.0.

**Full cluster:** [v0.21.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.21.0).

---

## v0.20.x: World-building, sources, and narrative

The 0.20.x cluster ran several months and landed the bulk of the worldbuilding toolkit, the sources-and-evidence subsystem, and the narrative-compilation track. The headline additions are below. The [GitHub releases](https://github.com/banisterious/obsidian-charted-roots/releases) page has the per-release detail.

### Entity Profile View ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251))

A dockable view that auto-syncs to the active note and displays all related data for any entity type (Person, Place, Event, Source, Organization) in collapsible sections. Replaces the tab-hopping that deep research used to require. Phase 1 shipped read-only in v0.20.18; later phases added inline editing on identity fields, lazy rendering of section content, keyboard navigation, and an embedded map preview for place profiles.

[More in Features →](/features/#entity-profile-view)

### Book and Narrative Compilation ([#294](https://github.com/banisterious/obsidian-charted-roots/issues/294))

A book builder that compiles generated reports, visual trees, and user-written vault notes into a single sequenced document. Output is PDF or ODT with a cover page, table of contents, and optional name index. Three preset templates (Family history book, Research compilation, Blank) derive chapter structure from the family graph. Book definitions save as `.book.json` files, so a book can be regenerated as the underlying vault data changes. Shipped in v0.20.26.

[More in Features →](/features/#book-builder)

### Evidence and sources matured across the cluster

Mills-aligned source classification ([#276](https://github.com/banisterious/obsidian-charted-roots/issues/276), v0.20.17) added three optional axes drawn from Elizabeth Shown Mills' *Evidence Explained*: source type, information type, and evidence type. Citation metadata support ([#316](https://github.com/banisterious/obsidian-charted-roots/issues/316), v0.20.34) introduced citation as a first-class entity with page references and quality assessments, with full GEDCOM roundtrip. Citation integration ([#324](https://github.com/banisterious/obsidian-charted-roots/issues/324), v0.20.38) wired bidirectional sync between citation notes and `sourced_*` fields. Source hierarchies ([#337](https://github.com/banisterious/obsidian-charted-roots/issues/337), [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338), v0.20.46) added `source_parent` and `source_parent_id` properties so multi-document record groups like probate packets, census pages, and multi-volume collections can be modeled as linked parent-child structures.

[More in Features →](/features/#evidence-and-sources)

### Comprehensive GEDCOM field coverage ([#317](https://github.com/banisterious/obsidian-charted-roots/issues/317))

v0.20.33 closed most of the roundtrip fidelity gaps with full import and export support for 16+ additional GEDCOM 5.5.1 fields: name components (NPFX, NSFX, SPFX, NICK), person attributes (TITL, RELI, NATI, IDNO, PROP, CAST, NCHI, NMR, SSN), burial date and place, death cause, and age-at-event. FROM / TO date ranges now parse and export alongside the existing BET / AND format. Fixes on the export side eliminated duplicate BIRT / DEAT / BURI records and moved family events onto FAM records where they belong.

[More in Features →](/features/#import-and-export)

### Calendar View ([#299](https://github.com/banisterious/obsidian-charted-roots/issues/299))

v0.20.47 added a workspace view with a monthly calendar grid of significant dates across the vault: birthdays, death anniversaries, marriage dates, and other life events. Color-coded event dots per day, a text-label toggle for person names, a day detail panel with events and years-ago, filters by event type or living status. An "imprecise dates" section catches entries with a month but no day. Right-click a day cell to create an event pre-filled with that date.

[More in Features →](/features/#calendar-view)

### Map evolution

Three distinct map capabilities landed during the cluster. Person-focused map journey ([#295](https://github.com/banisterious/obsidian-charted-roots/issues/295), v0.20.45) isolated a single person's geographic path with animated step-through playback, rich waypoint popups, and a family-journey overlay color-coded by relationship. Child map markers with on-map region editing ([#362](https://github.com/banisterious/obsidian-charted-roots/issues/362), v0.20.56) put draggable markers on parent maps for every child map, with an inline overlay that saves `parent_region_x/y/w/h` back to frontmatter. Linked map drill-down navigation ([#361](https://github.com/banisterious/obsidian-charted-roots/issues/361), v0.20.56) added `linked_map` and `parent_map` properties for multi-scale worldbuilding, with breadcrumb navigation between maps.

[More in Features →](/features/#geographic-features)

### Universe tooling ([#359](https://github.com/banisterious/obsidian-charted-roots/issues/359), [#360](https://github.com/banisterious/obsidian-charted-roots/issues/360))

Universe notes picked up auto-generated content blocks in v0.20.56. `charted-roots-universe-people`, `-places`, `-events`, and `-organizations` render tables of every entity scoped to the current universe, with sorting and limits. A companion `charted-roots-universe-maps` block renders clickable thumbnail grids for every custom map belonging to the universe. All blocks refresh automatically when vault data changes.

[More in Features →](/features/#world-building)

### Feature round-up release (v0.20.57)

A consolidated release aggregating smaller enhancements from community feedback. Multiple person picker in the event modal ([#366](https://github.com/banisterious/obsidian-charted-roots/issues/366)), marriage data in the Family Group Sheet report ([#370](https://github.com/banisterious/obsidian-charted-roots/issues/370)), targeted schema validation against notes matching a specific schema ([#367](https://github.com/banisterious/obsidian-charted-roots/issues/367)), organization membership statistics ([#368](https://github.com/banisterious/obsidian-charted-roots/issues/368)), universe and collection fuzzy pickers in the Report Wizard ([#369](https://github.com/banisterious/obsidian-charted-roots/issues/369)), and Web Clipper discoverability info-boxes in Places, Sources, and People tabs ([#364](https://github.com/banisterious/obsidian-charted-roots/issues/364)).

**Full cluster:** 62 releases spanning [v0.20.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.0) through [v0.20.62](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.62).

---

## v0.19.2–v0.19.x: Transition

The 0.19.x cluster continued after the v0.19.0 rename from Canvas Roots. Headline additions from v0.19.2 onward:

### Research workflow foundations ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145))

v0.19.11 introduced five GPS-aligned research entity types: `research_project`, `research_report`, `individual_research_note`, `research_journal`, and `research_log_entry`. Each has its own status tracking: projects use open / in-progress / on-hold / completed, reports use draft / review / final / published. A new research section in the Statistics view surfaces entity counts and status breakdowns. Tag detection recognizes `#irn` shorthand for individual research notes. This subsystem was the scaffolding the 0.20.x sources and citations work built on top of.

[More in Features →](/features/#research-workflow)

### Organizations, roles, and inheritance (v0.19.16)

Three related capabilities shipped in v0.19.16. Organization Member Management added first-class membership modeling with roles and date ranges. Person Roles in Sources extended the same role-linking pattern to source notes, so informants, enumerators, clerks, and other source-side roles can be tracked as structured data. Inheritance & Succession Tracking added `inherited_from` and `successor` properties for title, estate, and office succession.

[More in Features →](/features/#organizations)

### DNA Match Tracking ([#126](https://github.com/banisterious/obsidian-charted-roots/issues/126))

v0.19.9 added opt-in DNA match tracking for genetic genealogists, off by default. When enabled, person notes can be flagged as a DNA Match and tracked with shared cM, testing company, kit ID, match type (BKM / BMM / confirmed / unconfirmed), endogamy flag, and notes. A `dna_match` relationship type handles bidirectional linking. Scope is intentionally narrow: track key matches, not full chromosome analysis. Tools like DNAPainter handle that better and this feature is designed to live alongside them.

[More in Features →](/features/#dna-tracking)

**Full cluster:** [v0.19.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.2) through [v0.19.17](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.17).

---

## Open questions for this draft

1. ~~**Scope bound** — do we catch up from 0.19.2 onward (matches where the live page stops), or go back further and re-do 0.19.x too?~~ **Resolved 2026-04-24: v0.19.2 forward, as originally planned.** Pre-v0.19.2 content was user-approved at the time; retroactive rewriting adds no user value.
2. ~~**Cross-links to features page** — worth linking changelog spotlights to their corresponding features-page section?~~ **Resolved 2026-04-24: yes.** Pattern added under "Linking changelog spotlights to the features page" in the orchestration doc's style conventions; cross-links added to applicable spotlights below. Anchors assume Hugo default slugging from whatever headings features-refresh drafting ultimately uses.
3. **Per-cluster vs per-release** — are cluster spotlights the right shape, or would per-release summaries be preferable? The 0.22.x section above is the shape sample. User approved on 2026-04-24.
4. **Release-tag links** — currently linking `/releases/tag/0.22.0` etc. Worth checking those URLs resolve correctly (release tags have no `v` prefix in the repo).
5. **Length budget** — current total content body is approximately 1650 words across four clusters. Reasonable for a catch-up page spanning ~25 releases.

## Anchor list referenced by cross-links

These anchors are assumed to exist on `/features/` once features-refresh.md drafting lands. During features drafting, write section headings that generate these anchors (Hugo default: lowercase, spaces become hyphens, `&` dropped). Anchors called out here:

- `#entity-profile-view`
- `#book-builder`
- `#evidence-and-sources`
- `#import-and-export`
- `#calendar-view`
- `#geographic-features`
- `#world-building`
- `#collections`
- `#data-quality-tools`
- `#organizations`
- `#dna-tracking`
- `#research-workflow`
