# Changelog

All notable changes to Charted Roots will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For Charted Roots' plugin-specific versioning rules (what counts as breaking,
when 1.0 ships, GEDCOM round-trip API, BRAT vs. Community Plugins), see
[VERSIONING.md](VERSIONING.md).

---

## [Unreleased]

### Added

- **Universe wizard and Edit Universe modal can link a default calendar** ([#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) Phase 1): The Universe setup wizard's step 2 now offers a three-way calendar picker — **None**, **Built-in calendar** (dropdown of Galactic Standard, Middle-earth, Westeros, Generic Fantasy Ages), and **Custom calendar** (the existing custom-calendar editor) — replacing the old binary "create custom calendar?" toggle. When the universe name slug-matches a built-in's universe field, that built-in is preselected (e.g., "Star Wars" → Galactic Standard, "Middle-earth" → Middle-earth Calendar, "Star Wars Legends" still resolves via slug-superset matching). The Edit Universe modal gains a matching Calendar field listing all built-ins plus any user-defined custom calendars from settings, with `(unset)` clearing the link. The Universes tab table surfaces the linked calendar as a sub-line under the entity counts. Selections write to the universe note's `default_calendar` frontmatter field; the parser is unchanged and continues to use global era-abbreviation matching at parse time (a layered contract per [docs/planning/universe-calendar-linking.md](docs/planning/universe-calendar-linking.md)). Existing universes with no `default_calendar` continue to behave as before — no migration. Phase 2 (parser-side reading of the link, bare-year inference) is deferred to a separate issue.

### Changed

- **Spouse death events now appear on the surviving spouse's timeline by default** ([#447](https://github.com/banisterious/obsidian-charted-roots/issues/447)): Flipped `timelineShowSpouseDeaths` from `false` to `true` so widow/widower context surfaces on the timeline dynamic block without requiring users to discover the setting. A spouse's death is a major life event for the survivor; previously the only place it surfaced automatically was the Properties panel. The setting toggle is unchanged — users who'd prefer to hide spouse deaths can still opt out from Settings → Charted Roots → Timeline. Existing users who haven't customized the setting will start seeing spouse deaths appear on surviving spouses' timelines after upgrading.

### Fixed

- **Map journey mode explains why playback isn't available instead of failing silently** ([#445](https://github.com/banisterious/obsidian-charted-roots/issues/445)): Entering journey mode for a person who didn't have at least 2 places with valid coordinates left the marker filter applied and the toolbar chip showing — but no playback panel appeared at the bottom of the map, with no Notice or message explaining why. `MapDataService.buildJourneyPaths` only includes a person when they have ≥ 2 unique resolvable waypoints, so persons with one resolvable place (or none) were silently skipped by `applyJourneyFilter`. `MapView` now renders an inline placeholder where the playback panel would have appeared, naming the person and stating that they need at least 2 places with valid coordinates. The placeholder reuses the same teardown path as the playback controls, so exiting journey mode clears it cleanly. Surfaced during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification.
- **Map fullscreen control shows correct tooltip** ([#446](https://github.com/banisterious/obsidian-charted-roots/issues/446)): The fullscreen toggle button below the map's zoom controls displayed the literal text "undefined" as its hover tooltip instead of "Enter fullscreen" / "Exit fullscreen." `MapController.initializeFullscreen` was passing `title` as a flat string, but `leaflet-fullscreen@1.0.2` expects an object keyed by fullscreen state (`{ 'false': ..., 'true': ... }`); the plugin's internal `options.title[isFullscreen]` lookup returned `undefined`, which got rendered verbatim. Click behavior was unaffected. Fixed by passing the option in the shape the plugin expects.
- **Map marker popups show ages and full date ranges** ([#444](https://github.com/banisterious/obsidian-charted-roots/issues/444)): Clicking an individual marker on the map view (residence, death, marriage, etc.) opened a popup that showed the person's name, event type, and a single date — but no age annotation, and for events with a `date_to` the end date was silently dropped. For Shmi Skywalker Lars dying at 22 BBY (born 72 BBY), the popup read `Death: 22 BBY` with no indication that she was 50; for a residence at Ator from 64 BBY to 22 BBY it read `Residence: 64 BBY` with the duration cut. `createPopupContent` in `MapController` now formats the date row through a new `formatPopupDateRange` helper that renders true durations as `from – to` and appends `(age N)` for non-birth events when `DateService.calculateAge` resolves a non-negative age — handles real-world ISO dates, BBY/ABY fictional eras, and era crossings via the same path the journey-mode rich popup already uses. Birth events suppress the age annotation since age 0 is redundant alongside the birth date itself. The marker now carries a `birthDate` field populated from `person.born` in both marker construction paths (dedicated-frontmatter and `events:` array entries). Sibling fix to [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434), which fixed the journey-mode rich popup — same fix shape on a separate code path; fifth surface in the DateService-bypass cluster alongside [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433), [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), and [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439).
- **Wikipedia clipper template renders infobox photos correctly in Obsidian** ([#440](https://github.com/banisterious/obsidian-charted-roots/issues/440)): The `wikipedia-biography-basic.json` clipper template preserved infobox HTML with protocol-relative image URLs (`<img src="//upload.wikimedia.org/...">`). Browsers resolve protocol-relative URLs via the page's protocol, but Obsidian's `app://` renderer can't follow them — infobox photos rendered as broken-image icons in reading mode. Added a `replace` filter to the `selectorHtml:.infobox` extraction that rewrites `="//` to `="https://` so the preserved HTML carries valid absolute URLs. Re-import the template in Web Clipper to pick up the fix; not part of a versioned plugin release since clipper templates ship via `docs/clipper-templates/`.

---

## [0.22.6] - 2026-04-25

Three non-data-loss fixes — all in the same DateService-bypass class first surfaced in v0.22.5 (#433, #434). Sixth release in three days. Stability window does **not** reset; continues from 0.22.4 (2026-04-23 → ~2026-05-14).

### Fixed

- **Timeline dynamic block respects fictional eras when annotating ages** ([#439](https://github.com/banisterious/obsidian-charted-roots/issues/439)): The `charted-roots-timeline` block on a person note in a fictional-calendar universe was showing the BBY year for each event but no age annotation alongside it — even though the Born line correctly displayed "age 0," exposing the inconsistency. `TimelineRenderer` calculated age via naive integer subtraction (`entryYear - birthYear`) with an `entryYear >= birthYear` guard that's inverted for descending eras: for Cliegg Lars born 82 BBY, marriage at 26 BBY produced `26 >= 82` (false) so no age rendered. The same broken pattern existed in eight call sites across the renderer (own events, family events, context-note events, marriages, divorces, adoptions). All eight now route through a new `computeEventAge` helper that defers to `DateService.calculateAge` with the person's universe — handles BBY descending, ABY ascending, and BBY → ABY era crossings — and falls back to naive year subtraction only for real-world dates or when DateService isn't available. Sibling fix to [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433), [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434), and [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) — same DateService-bypass class, fourth surface where it surfaced.
- **Map journey now surfaces life events from `cr_type: event` notes** ([#438](https://github.com/banisterious/obsidian-charted-roots/issues/438)): The map view's journey playback (waypoint-by-waypoint walk through a person's life) only picked up life events that were authored as inline `events:` arrays in the person's frontmatter — it ignored events recorded as separate `cr_type: event` notes that referenced the person via `persons: [[...]]`. For vaults built around the dedicated event-note schema (which is the more common authoring shape), journeys collapsed down to whatever the person's birth / marriage / death frontmatter fields supported, often two or three waypoints across an entire life. `MapDataService.getPersonData` now also queries `EventService.getEventsForPerson` for each person, normalizes the returned `EventNote`s into the same `LifeEvent` shape the journey already understands, and merges the two sources with a dedup key (event_type + place + date_from) so a person who has both schemas doesn't get duplicated waypoints. Inline entries win on conflict. Date values that the YAML parser hands back as `Date` objects (unquoted ISO dates like `date_from: 1905-04-05`) are coerced to ISO strings so chronological sorting doesn't drop them. Sibling fix to [#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) and the [#415](https://github.com/banisterious/obsidian-charted-roots/issues/415) / [#426](https://github.com/banisterious/obsidian-charted-roots/issues/426) / [#429](https://github.com/banisterious/obsidian-charted-roots/issues/429) class — surface scaffolded for one schema, rest of the plugin uses another.
- **Date-inconsistency checks respect fictional eras** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437)): `checkDateInconsistencies` in the data-quality service used a local `parseYear` helper that pulled the first four-digit number out of a date string and ignored era context, so for descending calendars (BBY) a coherent lifespan like `1045 BBY` → `1042 BBY` (three years) read as a reversed comparison and tripped `DEATH_BEFORE_BIRTH`. `parseYear` now defers to `DateService.parseDate` when the entity is scoped to a universe, returning the canonical signed year (negative for descending eras, positive for ascending) so cross-era arithmetic stays coherent across `DEATH_BEFORE_BIRTH`, `UNREASONABLE_AGE`, `BORN_BEFORE_PARENT`, `PARENT_TOO_YOUNG`, `PARENT_TOO_OLD`, and `BORN_AFTER_PARENT_DEATH`. `FUTURE_BIRTH` and `FUTURE_DEATH` no longer fire on fictional dates at all, because they only have meaning against the real-world current year. Real-world comparisons are unchanged. Sibling fix to [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433) and [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434), built on the `DateService` plumbing that landed in v0.22.5.

---

## [0.22.5] - 2026-04-24

### Fixed

- **Map popup ages and durations are correct for fictional calendars** ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434)): On the geographic map, the rich popup that appears for each person-journey waypoint computed age-at-event and duration-at-location as plain numeric subtractions of extracted years. That silently produced the wrong answer whenever a fictional calendar was in play — eras that count down (BBY), era transitions (BBY → ABY), and any universe whose dating system the plugin already understood were all ignored. The popup now defers to `DateService.calculateAge` with the person's universe passed in, so fictional birth/death/marriage dates resolve through the same parser the Event modal already uses; real-world journeys keep the existing numeric-subtraction behavior as a fallback. Surfaced as part of [#428](https://github.com/banisterious/obsidian-charted-roots/issues/428) triage.
- **Data-quality validator stops flagging valid fictional dates** ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433)): `isStandardDateFormat` recognized only real-world numeric shapes (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`), so dates like `22 BBY` or `ABY 1042` on persons in a fictional-calendar universe were flagged as `NON_STANDARD_DATE` and the "Fix all" bulk-normalize path tried to rewrite them toward `YYYY-MM-DD`. Both methods now accept an optional universe argument and defer to the date service — a string that parses successfully as a fictional date is treated as a recognized format and left alone. All six callers across the format-issue surfacer and the preview / normalize paths pass the person's universe through. Surfaced as part of [#428](https://github.com/banisterious/obsidian-charted-roots/issues/428) triage.
- **Dynamic content blocks no longer flood the console on stale file references** ([#431](https://github.com/banisterious/obsidian-charted-roots/issues/431)): `DynamicContentService.buildContext` threw `Could not find file: …` whenever `app.vault.getAbstractFileByPath` returned null for `ctx.sourcePath`. In practice this fired every time a registered metadata handler ticked for a container note that had been renamed or deleted before Obsidian cleaned up the `MarkdownRenderChild`; the surrounding try/catch only wraps the initial render, so the exception inside the async metadata/create handlers went uncaught and spammed DevTools on every metadata tick. `buildContext` now returns `null` with a warn log, matching the skip-and-warn pattern `BidirectionalLinker` already uses; every caller — initial renders plus the various re-render closures across media, timeline, relationships, sources, transfers, and extractions processors — bails out cleanly when the context can't be built. Surfaced during [#429](https://github.com/banisterious/obsidian-charted-roots/issues/429) triage.

### Changed

- **Internal:** `DateService` is now instantiated on the plugin and refreshed inside `saveSettings` so consumers see the current fictional-date configuration (previously defined and exported but never constructed). Groundwork for [#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) / [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433) / [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434).

Three non-data-loss fixes; per VERSIONING.md, the 3-week stability window does **not** reset from this release — it continues running from 0.22.4 (2026-04-23 → ~2026-05-14).

---

## [0.22.4] - 2026-04-23

### Fixed

- **Setting a step-parent in Edit Person now actually persists** ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429)): Opening Edit Person on an existing person note, linking a step-father or step-mother, and saving appeared to succeed (no error, success notice shown) — but the step-parent fields were silently dropped from the payload, never reaching the file. A three-way asymmetry between the create and edit paths: the Edit Person modal's save payload did emit `stepfatherCrId` / `stepmotherCrId` fields, and `createPersonNote` handled them correctly, but `updatePersonNote` (the edit-path writer) had no step-parent branch at all — it silently discarded the fields. The load path was also incomplete: `loadRelationships` extracted adoptive-parent singletons but not step-parent singletons, so existing `stepfather` / `stepmother` values in frontmatter never round-tripped into the modal on open. Fix closes both gaps: `relationship-loader.ts` extracts step-parent singletons with the same wikilink-fallback pattern used for adoptive parents, `bulk-operations.ts` plumbs them through `editPersonData`, and `updatePersonNote` gains step-father / step-mother write branches mirroring the adjacent adoptive-parent pattern (with clear-on-unlink support). 6 new regression tests in `relationship-loader.test.ts` cover the load side (no data, explicit IDs, wikilink fallback, basename fallback, stepmother parity, coexistence with adoptive parents). Suite grows from 235 to 241 tests. Critical data-loss bug; per VERSIONING.md, the 3-week stability window resets from this release. Reported by @DigitalDreamn, who also observed Universe and Collection fields being cleared during the same broken save — we could not reproduce that wipe in a post-fix clean environment, and code-tracing found no path from normal step-parent save to unrelated-field clearing, so the observation is most likely a user-state-dependent interaction (unintentional dropdown click triggering the `__custom__` onChange path). If the wipe recurs post-0.22.4, we'll reopen investigation with a new reproducer.

---

## [0.22.3] - 2026-04-23

### Fixed

- **Collections created via Create Place now surface in the Edit Person dropdown and Control Center** ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426)): Creating a Collection through the Create Place modal wrote the value to the place note's frontmatter as expected, but the Collection was invisible everywhere else — Edit Person's Collection dropdown didn't list it, and the Control Center's Collections view (both the modal tab and the dockable sidebar) also didn't show it. The reverse direction worked fine: Collections created via Edit Person appeared in Create Place's dropdown. The asymmetry came from `FamilyGraphService.getUserCollections()` scanning person notes only — and three UI surfaces relied on that aggregator as their sole source of truth. The fix extracts a new pure helper (`src/core/collections-aggregator.ts`) that merges person-side and place-side collection counts into a unified `{ name, personCount, placeCount, totalCount }` list, and the three UI surfaces now call through it. The Control Center badge renders contextually ("5 people", "3 places", or "5 people, 3 places" for mixed collections), empty-state text updated to mention both entity types. `FamilyGraphService.getUserCollections()` itself is unchanged — it stays person-focused for the Canvas Collection Overview and Collection Analytics, which are intentionally person-only. 13 new regression tests in `tests/collections-aggregator.test.ts` cover the merge logic (person-only, place-only, mixed, tie-breaking, duplicate collapse, empty input, zero-count dropping). Suite grows from 222 to 235 tests. Medium-priority UX bug; no data loss, so the stability window does not reset. Reported by @DigitalDreamn.

---

## [0.22.2] - 2026-04-23

### Fixed

- **Edit Person modal no longer wipes IDs-only relationship arrays on save** ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415)): Opening Edit Person on a note whose frontmatter carried `children_id` (or `spouse_id` / `parents_id`) with no paired `children:` / `spouse:` / `parents:` wikilink array showed an empty relationships section, and saving with no changes wiped the `*_id` block — silent data loss on any note in this shape. The inverse of [#410](https://github.com/banisterious/obsidian-charted-roots/issues/410), which covered wikilinks-without-IDs; the #410 fix walked the wikilink array and would exit immediately when the wikilink key was absent, leaving the IDs unread. The load path now falls back to walking the `*_id` array when the wikilink key is genuinely absent (explicitly empty `[]` is still treated as an intentional empty list), resolving each ID back to a display name via a new `resolveCrIdToName` helper so the modal renders the relationships correctly. On save, the writer emits both arrays, healing the frontmatter to the full dual-storage shape. Orphan IDs that don't match any person in the vault are preserved round-trip with the ID string itself as a visible placeholder name (producing `[[id-str]]` in the wikilink array) rather than a silent drop or an empty `[[]]` corruption. 13 new regression tests in `relationship-loader.test.ts` cover the direct resolver, IDs-only fallback for children / spouse / parents, orphan IDs, explicit-empty-array discrimination, and the wikilink-first path staying dormant when both arrays are present. Critical data-loss bug; per VERSIONING.md, the 3-week stability window resets from this release. Reported by @DigitalDreamn.

---

## [0.22.1] - 2026-04-23

### Fixed

- **Editing a spouse to add marriage metadata no longer wipes spouse data on both sides** ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423)): Adding marriage date / location / status to an existing spouse relationship in Edit Person caused the frontmatter to upgrade from flat `spouse:` to indexed `spouse1:` format, which the bidirectional linker's deletion detector misread as "the spouse was removed" — firing a phantom-deletion cascade that wiped spouse fields on both notes, leaving only orphaned `spouse1_marriage_location_id` and `spouse1_marriage_status` residue. Silent data loss on any format-migrating edit. Two compounding bugs in `src/core/bidirectional-linker.ts`: (1) `syncDeletions` now cross-checks every disappearing spouse against the current frontmatter in all possible locations (flat `spouse`, any `spouse{N}` slot) via a new `isSpouseInFrontmatter` pure helper before treating the disappearance as a deletion, so format migrations don't trigger the cascade; (2) `removeSpouseLink`'s cleanup now removes all five `spouse{N}_*` metadata fields (`_marriage_date`, `_marriage_location`, `_marriage_location_id`, `_marriage_status`, `_divorce_date`) in parity with the existing `person-note-writer.ts` clear, so no orphan residue survives a legitimate unlink. The new helper has 20 regression tests covering flat / indexed / mixed / format-migration / empty-value / object-shape inputs. A critical data-loss regression introduced by the 0.22.0 fix for #420; per VERSIONING.md, the 3-week stability window resets from this release. Reported by @doctorwodka.

---

## [0.22.0] - 2026-04-22

### Fixed

- **Person picker no longer crashes when a person note has a bare-year date field**: The picker's card renderer calls `formatDisplayDate` on `born` / `died` values, and Obsidian's Properties panel treats an unquoted year like `born: 1800` as a Number — YAML then parses it as an integer. The previous `.trim()` call threw `TypeError` on non-string input, making the picker unusable for any person with numeric date frontmatter. `formatDisplayDate` now accepts `string | number | undefined | null` and coerces at entry. Same class of bug as [#416](https://github.com/banisterious/obsidian-charted-roots/issues/416); no user-facing issue was filed since the fix is a one-liner of the same shape.
- **Cross-note spouse writes no longer corrupt indexed multi-spouse frontmatter** ([#420](https://github.com/banisterious/obsidian-charted-roots/issues/420)): Adding a spouse from a different note (via the Create Person modal, or via any flow that propagates bidirectionally) used to write flat `spouse:` / `spouse_id:` keys onto the target regardless of whether the target already used indexed `spouseN:` format. In the Create Person flow the writer path additionally clears `spouse1`–`spouse10` before writing the flat arrays, so a target with multiple indexed spouses would have its entire indexed list wiped, leaving only the newest spouse in flat form. Silent data loss on any cross-note spouse write to a multi-spouse person. Both bidirectional write paths (`BidirectionalLinker.syncSpouse` and `addBidirectionalSpouseLink`) now inspect the target's existing frontmatter and append a new `spouseN:` slot when the target uses indexed format, preserving the existing slots and their marriage-date metadata. Mixed states (residue flat keys from earlier bad writes alongside indexed slots) route to indexed so the corruption doesn't compound. Format detection is a new pure helper at `src/core/spouse-format-detector.ts` with 16 regression tests covering empty / flat / indexed / gaps / partial-slot / mixed-state inputs. The "Gap A" unlink-cleanup scenario from the original report turned out to be handled correctly by the existing deletion-detection code; local reproduction confirmed that replacing a spouse relationship with a parent relationship correctly removes the stale spouse entry on the target.
- **Life Events Migration no longer creates duplicate event notes on re-run** ([#414](https://github.com/banisterious/obsidian-charted-roots/issues/414)): Running the Cleanup Wizard's life-events migration twice on the same person note (e.g., after a partial previous run that didn't clean up the inline `events:` array, or after a user manually re-adds inline events) used to mint a fresh event-note file each time, because collision-avoidance only deduped by filename — it didn't recognize that an existing file already encoded the same event. The migration now scans for existing `cr_type: event` notes before creating new ones and reuses any whose `(persons, event_type, date)` tuple matches the inline event being migrated. Within a single run, newly-created event notes are added to the identity map so two inline events that hash to the same identity also collapse to one note. Date matching is strict string equality (so `"1850"` does not match `"1850-01-01"`) — a user refinement of an existing event's date produces a new note rather than a silent merge. The Cleanup Wizard's post-migration notice now reports the reused count alongside the created count when any reuse happened. The identity computation is a new pure helper at `src/events/event-identity.ts` with 23 regression tests covering wikilink / alias / order / numeric-YAML-date normalization, legacy `person` scalar, and missing-field guards.
- **Dynamic relationships block now surfaces adoptive siblings in `extended` / `all` modes** ([#417](https://github.com/banisterious/obsidian-charted-roots/issues/417)): The block's sibling derivation only walked biological `father` / `mother` / `parents` edges, so a person's adoptive siblings (other children of their adoptive parents) never appeared on the list — even with `type: extended` or `type: all`, where all other extended-family derivations run. Adoptive parent edges (`adoptive_father`, `adoptive_mother`, gender-neutral `adoptive_parents`) are now walked alongside biological ones, and the resulting entries are labeled `Adoptive sibling:` to distinguish them from biological siblings (mirroring the existing `Adoptive father` / `Adoptive mother` label pattern for parents). Dedupes against the biological set, so a person present on both edges lists once without a label. The sibling-walking logic moves into a pure helper at `src/dynamic-content/sibling-walker.ts` with 16 regression tests covering biological / adoptive / mixed / missing-parent cases.
- **Symmetric custom relationships now auto-propagate to the target** ([#419](https://github.com/banisterious/obsidian-charted-roots/issues/419)): Adding a custom relationship flagged as symmetric (e.g., "twin") from person A to person B used to leave B's note untouched, requiring the user to manually repeat the add from B's side. The flat-properties write path in the Add Relationship modal never checked the relationship type's `symmetric` flag, so only built-in symmetric types (spouse, biological sibling) — which route through `RelationshipManager` and the bidirectional linker — reciprocated automatically. Custom types skipped that entirely. The modal's write path now mirrors the entry onto the target's note when the type is symmetric, using the same idempotent add logic (duplicate `cr_id` → silent no-op, so adding the same symmetric link from both sides stays safe). A target-side write failure surfaces its own partial-success notice rather than making the whole save look failed. Asymmetric types and the `inverse` relationship pattern (e.g., mentor → disciple) are unchanged and out of scope for this fix.
- **Timeline no longer crashes with a red error bar when a date field is a bare numeric year** ([#416](https://github.com/banisterious/obsidian-charted-roots/issues/416)): Obsidian's Properties panel treats an unquoted year like `died: 1893` as a Number-typed field, and YAML parses it as an integer rather than a string. The service's `formatDate` and `extractYear` helpers call `.trim()` / `.match()` on the input, which throws `TypeError` on numbers — the timeline-renderer surfaced this as Obsidian's red code-block error. The helpers now accept `string | number | undefined | null` and coerce at entry, so any date frontmatter value (including the bare-year case from the Properties panel) passes through safely. Surfaced during #408 burial-timeline testing; affects every date field in the timeline emission path (`born`, `died`, `adoption_date`, `marriage_date`, `divorce_date`, `burial_date`, and event-note dates).

### Added

- **Burial now renders on the person timeline block** ([#408](https://github.com/banisterious/obsidian-charted-roots/issues/408)): `burial_date` and `burial_place` are already established person-note properties (recognized by the GEDCOM importer/exporter, map markers, and cleanup tooling), but the inline `charted-roots-timeline` block was the one place they didn't surface. Burial is now emitted alongside birth, death, adoption, and marriage, matching death's rendering pattern — fixed `"Buried"` label plus `"in {place}"` suffix when `burial_place` is set, with age computed from the person's `born` field. No new schema, no toggle; the field is either set or it isn't. Honors the timeline block's `include: [...]` filter, so users who restrict their timeline to specific event types can include or exclude burial explicitly.

---

## [0.21.0] - 2026-04-21

### Fixed

- **Toggling the Endogamy flag off now persists the off state** ([#413](https://github.com/banisterious/obsidian-charted-roots/issues/413)): The toggle's onChange handler used the string-field idiom `value || undefined`, which converted a toggled-off `false` to `undefined` — and the writer's `!== undefined` guard then read that as "untouched" and silently no-op'd. Users who toggled the flag on and then off couldn't record the off state. Fixed by passing the boolean through directly; the writer's three-state handling (`true` / `false` / `undefined`) already worked correctly for non-`undefined` values. Scope reduced from the original issue: `cr_living` looked similar but on closer inspection is a three-state dropdown with an explicit handler and was unaffected.
- **Nickname field in Edit Person now round-trips correctly** ([#412](https://github.com/banisterious/obsidian-charted-roots/issues/412)): The Nickname input was effectively dead on edit — the existing frontmatter value never loaded into the input, and new input never reached the writer. Three gaps in the path: the load side (`openEditPersonModal` in `bulk-operations.ts`) never read `fm.nickname` into the modal payload; the modal's `editPersonData` type didn't declare the field; and `updatePerson()`'s save payload didn't include it. Fixed in all three places; nickname now behaves like every other optional string field, including clearing the value by emptying the input (same `?? ''` pattern as #406). Create Person was unaffected — it uses a spread of `personData` rather than an explicit payload, so new persons with nicknames always saved correctly.
- **Setting Universe and ten other optional fields to "(None)" / empty in Edit Person now actually clears the frontmatter** ([#406](https://github.com/banisterious/obsidian-charted-roots/issues/406)): The modal's save payload passed `undefined` for fields the user had cleared, which the writer's outer `!== undefined` guard read as "untouched" and silently no-ops; the "saved" notice was misleading. Same class of bug as [#322](https://github.com/banisterious/obsidian-charted-roots/issues/322) (dates / occupation) and [#405](https://github.com/banisterious/obsidian-charted-roots/issues/405) (relationships). Fields fixed: `universe`, `collection`, `personType`, `sex`, `givenName`, `maidenName`, `pronouns`, `dnaTestingCompany`, `dnaKitId`, `dnaMatchType`, `dnaNotes`. All now use the established `?? ''` (or `?? []` for pronouns) pattern in the save payload so the writer's clear path actually fires. The `dnaEndogamyFlag` boolean toggle has the same class of bug at the modal's onChange layer rather than the save payload and is tracked separately (#413). `cr_living` looked similar at first glance but is actually a three-state dropdown with an explicit three-way handler and was unaffected.
- **Edit Person modal no longer drops relationships when IDs are partial or a wikilink's basename differs from the person's `name`** ([#410](https://github.com/banisterious/obsidian-charted-roots/issues/410)): The v0.20.62 fix for [#403](https://github.com/banisterious/obsidian-charted-roots/issues/403) closed the all-wikilinks-no-IDs case but left sibling gaps on the load path for legacy `spouse` / `children` / `parents` array frontmatter. The name-based fallback resolver now also matches against the note's basename, covering cases where the wikilink stem differs from the target's `name` value. The array-field fallback is now per-entry (walking wikilinks paired by index with `*_id` and resolving each independently) instead of all-or-nothing, so mixed-ID states no longer silently drop the entries without IDs. As defense-in-depth, wikilink entries that still can't be resolved (orphaned links whose target isn't in the vault) are preserved through the round trip rather than dropped at save: the writer emits the wikilink in `spouse` / `children` / `parents` and leaves that entry's slot empty in the corresponding `*_id` array to keep alignment. On next open, the load path retries resolution per-entry, so any wikilink that later becomes resolvable (because the target note was added or renamed) heals automatically. Scope: `spouse`/`spouse_id`, `children`/`children_id`, `parents`/`parents_id` in legacy array format. Singleton parent fields and indexed `spouseN` format were already per-entry and unaffected.

---

## [0.20.62] - 2026-04-20

### Changed

- **Custom relationship overlay rendering overhaul** ([#404](https://github.com/banisterious/obsidian-charted-roots/issues/404)): Two coordinated changes, driven by community-testing feedback from @doctorwodka that straight overlay lines on larger trees cut diagonally through cards and could appear to trace along existing parent-child paths.
  - **Overlays now arc under the tree rather than drawing straight across cards.** Each overlay renders as a quadratic bezier curve that sags below the chord between its endpoints, with sag scaled to chord length. Curvature reads as "not a family line" regardless of where the endpoints sit, color and dash pattern still carry the relationship type, and the overlay continues to paint beneath the family-link layer.
  - **Adopted / step / foster overlays restyle the structural parent-child link when one exists, instead of drawing a second line next to it.** When the overlay type maps onto a structural link in the visible tree (and neither endpoint has a duplicate card — f3 chart renders some people twice when they appear in multiple family contexts), the structural link is repainted with the overlay's color and dash pattern and carries the overlay's tooltip. A 14px transparent hit path sits over the restyled link so hover-for-tooltip works without pixel-precise cursor placement. When the structural link isn't present or points to a duplicate card, rendering falls back to an arc anchored on the primary visible cards. Purely custom overlays (sire / childer, mentor, ally, rival, etc.) always arc since they have no structural counterpart.

### Fixed

- **Unlinking a relationship via Edit Person now updates both sides of the link** ([#405](https://github.com/banisterious/obsidian-charted-roots/issues/405)): Two related defects reported in community testing. First, the modal's "clear this field" path set relationship values to `undefined`, which `updatePersonNote`'s outer guard (`!== undefined`) treated as "untouched," so clearing a biological or adoptive parent in the UI never actually cleared the frontmatter — the "saved" notice was misleading. The clear now passes `''`, matching the pattern [#322](https://github.com/banisterious/obsidian-charted-roots/issues/322) already established for date / occupation fields. Second, even with the clear applied, the other side of the relationship kept its reference (the former parent's `children` array still listed the child, or a former spouse's `spouseN_id` still pointed back), and the dynamic relationships block reverse-inferred the link back. `updatePersonNote` now performs a reverse-unlink pass after the frontmatter write for father, mother, adoptive father, adoptive mother, spouses, and children — traversing to the other side's note and removing this person from its corresponding array or singleton field. A `skipReverseUnlink` option terminates the recursion cleanly when the helpers themselves call `updatePersonNote` on the other side.
- **Editing a person no longer clears relationships from notes missing `_id` frontmatter keys** ([#403](https://github.com/banisterious/obsidian-charted-roots/issues/403)): The Edit Person modal's load path read relationships only from the `_id` fields (`children_id`, `spouseN_id`, `father_id`, etc.) and never fell back to the wikilink field (`children`, `spouseN`, `father`). Notes with wikilinks but missing IDs — common in older/imported data — loaded empty relationship fields in the modal, and saving then cleared both the wikilink and ID from frontmatter, producing the reported symptom where parents lost children on save, or a spouse link disappeared after adding to a collection. The load path now resolves wikilink names to crIds via the family graph when the `_id` field is missing, covering children, spouses (indexed + legacy), parents, father, mother, adoptive father, and adoptive mother. Ambiguous names (multiple persons with the same name) are logged and skipped rather than silently resolved to an arbitrary match.
- **Export logs button no longer fails silently on subsequent uses** ([#402](https://github.com/banisterious/obsidian-charted-roots/issues/402)): The handler had no error reporting, so any thrown error (stale folder-exists check, file collision, permission issue) produced no feedback. Wrapped the export in try/catch with a user-visible error notice, and switched the folder-exists check to `vault.adapter.exists()` — the metadata cache can lag behind on hidden folders like `.charted-roots/logs`, causing the previous `getAbstractFileByPath` check to return null and `createFolder` to throw EEXIST.
- **Custom-relationships overlay draws at correct positions on initial render of large trees** ([#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) follow-up): The overlay re-render was previously scheduled on a fixed 1500ms delay, which was enough for small trees but not for larger ones — f3 chart uses staggered entrance delays on initial render, so deeper cards can still be mid-animation at the 1500ms mark. Reading their `transform` at that point yielded intermediate coordinates, causing overlay lines to draw from the wrong cards (the symptom reported in community testing: lines appearing to originate from an ancestor rather than the actual source person). On subsequent re-renders the stagger is skipped and the 1500ms delay was fine, which is why toggling something in the Display menu "fixed" the overlay. The schedule now polls card transforms on successive animation frames and renders once positions have been stable for three frames, with a 4-second fallback as a backstop. Small trees render roughly as fast as before; larger trees correctly wait through the full stagger.
- **"Show children's births" toggle now correctly excludes adopted children** ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396) follow-up): The v0.20.61 dedupe covered the "both toggles on" case but missed the case where a dual-listed adopted child still appeared when only the biological "Show children's births" toggle was enabled. The biological-children pass now filters out anyone also in `adopted_child_id`, making the two toggles fully independent as documented — adopted children's births only surface via the "Show adopted children's births" toggle, regardless of whether they're also listed in `children_id`. The dedupe guard added in v0.20.61 is no longer needed and has been removed.

---

## [0.20.61] - 2026-04-19

### Added

- **Adoption events on adoptive parents' timelines** ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396) follow-up): When an adopted child has `adoption_date` set, the adoptive parent's timeline now renders an "Adopted [[Child]]" entry on that date. Adoption is a shared life event — it appears on both the adoptee's and the adoptive parents' timelines, matching the marriage-on-both-sides pattern. Always on, no toggle.
- **"Show adopted children's births" toggle** (new, under Settings -> Advanced -> Family events on timelines): Independent of the existing "Show children's births" toggle (which covers biological children only). Default off. When enabled, adopted children's birth dates render on the adoptive parent's timeline as family events. Explicit opt-in keeps biological and adoptive child visibility as separate controls.

### Fixed

- **Sibling births now render when siblings share parents via the `parents` array** ([#401](https://github.com/banisterious/obsidian-charted-roots/issues/401)): The sibling-discovery loop for the "Show sibling births" setting was only reading `father` / `mother` when collecting a person's parents, so siblings who share parents declared exclusively in the gender-neutral `parents` array were invisible on the timeline. The collection now also includes `parents`, matching how the parent-deaths pass already worked.
- **Adopted child's birth no longer duplicated when also listed as a biological child** ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396) follow-up): If a person is referenced in both `adopted_child_id` and `children_id` on the same parent, the timeline used to emit two birth entries when both "Show children's births" and "Show adopted children's births" were enabled — one from each toggle's iteration path. The adopted-children pass now skips births already emitted by the biological pass; adoption events themselves still render (they're distinct from births).
- **Marriage and divorce timeline entries no longer render as raw text** ([#399](https://github.com/banisterious/obsidian-charted-roots/issues/399)): The initial v0.20.60 implementation embedded `[[Spouse]]` inside the title string, producing nested wikilinks that Obsidian's markdown parser couldn't resolve. Titles now use plain text for the spouse name with the link provided separately, matching how existing family-event entries are constructed.
- **Custom relationships overlay — four follow-up fixes from community testing** ([#386](https://github.com/banisterious/obsidian-charted-roots/issues/386)):
  - **Wider hover target for tooltips.** The 2px stroke required pixel-precise cursor placement to trigger the tooltip. A transparent 14px hit line now sits behind each visible line, making hover reliable without thickening the visible stroke.
  - **Built-in relationship types honor the overlay flag.** Enabling "Render on family chart as overlay line" on a built-in type (e.g., Master/Apprentice) was saving correctly but silently dropped on read — the customization-merge function wasn't propagating the new flag. Built-in types now render as overlay lines when the flag is on.
  - **Inverse-type pairs no longer double up visually.** When two relationship types are inverses of each other (sire/childer, mentor/disciple, captor/prisoner) and both are overlay-enabled, each side of a declared pair used to produce its own line at identical coordinates. The overlapping strokes reinforced, making dotted look like dashed and dashed look like solid. The dedupe pass now canonicalizes to the alphabetically-earlier type id so the pair collapses to a single line.
  - **Card-position lookup scoped to the current chart.** `d3.selectAll('.card_cont')` previously searched the entire document, so stale or hidden cards from other family chart tabs contributed to the position map — potentially drawing overlay lines from wrong coordinates. The selector is now scoped to the current chart container.

---

## [0.20.60] - 2026-04-19

### Added

- **`adoption_date` frontmatter property for adoptees** ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396)): New recognized person property — parsed into `PersonNode.adoptionDate`, written by `createPersonNote` and `updatePersonNote`, and rendered as an "Adopted" entry on the person timeline block. Always on when the field is set; no toggle (matches the pattern for `born` / `died`). Create/Edit Person modal UI for entering the field is a natural follow-up; users can set the frontmatter field directly in the meantime.
- **Marriages and divorces on the person timeline block** ([#399](https://github.com/banisterious/obsidian-charted-roots/issues/399)): Spouse-relationship metadata (`spouse1_marriage_date`, `spouse1_divorce_date`, `spouse1_marriage_location`, etc.) is now surfaced on the inline timeline. Each marriage emits a "Marriage to [[Spouse]]" entry; each divorce emits "Divorce from [[Spouse]]." Marriages are always on. Divorces default on but respect a new **Show divorces** toggle under Settings → Advanced → Family events on timelines, for users who prefer to hide them.
- **Manually-declared siblings on timeline** ([#398](https://github.com/banisterious/obsidian-charted-roots/issues/398)): The "Show sibling births" setting now also surfaces siblings declared via the built-in `sibling` relationship type, not just siblings derived from shared parents. Covers worldbuilder cases where parents aren't modeled as notes but sibling pairs are defined explicitly. Symmetric inference via RelationshipService picks up siblings who declared us on their own note.

### Fixed

- **Adoptive parents no longer duplicated on child's relationships block** ([#392](https://github.com/banisterious/obsidian-charted-roots/issues/392)): Follow-on to the initial #392 fix in v0.20.59. When an adoptive parent's note listed the child via `adopted_child`, the reverse-inference pass pushed that parent into the child's gender-neutral `adoptive_parent_ids` array without checking whether the parent was already set in the gender-specific `adoptive_father_id` / `adoptive_mother_id`. The child's relationships block then rendered each parent twice — once as "Adoptive father" / "Adoptive mother," once as "Adoptive parent." The gender-neutral array is a fallback, not a universal list; inference now skips when the parent is already in a gender-specific slot.

---

## [0.20.59] - 2026-04-18

### Added

- **Custom relationships overlay on family chart** ([#386](https://github.com/banisterious/obsidian-charted-roots/issues/386)): Custom non-family relationships (liege/vassal, ally/rival, master/apprentice, godparent, etc.) can now render as styled overlay lines on the family chart. Each relationship type has a new **Render on family chart as overlay line** toggle in the relationship-type editor modal, decoupled from the existing tree-structure integration — a type can be tree-only, overlay-only, or both. The Display menu gains a **Show custom relationships** master toggle plus per-type toggles when multiple overlay-enabled types exist. Lines are styled by the type's color and line style, stack with a perpendicular offset when the same pair has multiple overlay relationships, dedupe symmetric pairs, and respect the as-of date filter from [#376](https://github.com/banisterious/obsidian-charted-roots/issues/376). Hover a line for a tooltip showing source, relationship type, target, and date range.
- **Highlight family chart nodes by property value** ([#379](https://github.com/banisterious/obsidian-charted-roots/issues/379)): New **Highlight groups...** entry in the Display menu opens a modal for defining up to three concurrent highlight groups. Each group pairs a person property (sex, occupation, title, religion, caste, nationality, universe, collection) with a value and a palette color; matching cards render with a colored glow while non-matching cards dim to 30% opacity. Twelve palette colors available (gold, orange, red, pink, purple, indigo, blue, cyan, teal, green, lime, brown). Sex-field matching handles common aliases ("male" / "man" / "M"). Custom property support is gated on [#377](https://github.com/banisterious/obsidian-charted-roots/issues/377); built-in fields only in v1.
- **Family timeline badge on People tab** (completes promise from v0.10.0): Person rows in the Control Center People tab now show a second badge with a users icon when the family unit (person + spouses + children) has events. Click to open a modal showing the family timeline — events aggregated across the family, color-coded by member, sorted chronologically. The underlying rendering helpers shipped in v0.10.0 and the wiki has documented this since, but the call site that puts the badge in the UI was never added. Now it is.

### Fixed

- **Adoptive parents now handled correctly across the Edit Person flow** ([#390](https://github.com/banisterious/obsidian-charted-roots/issues/390)): The Edit Person modal silently dropped adoptive parent updates (showed a "saved" notice but didn't actually write `adoptive_father_id` / `adoptive_mother_id` to frontmatter) and didn't display existing adoptive parents when reopened. Both paths fixed: `openEditPersonModal` now passes adoptive parent fields into the modal's data, and `updatePersonNote` writes them back to frontmatter alongside the existing father/mother handling.
- **Adoptive parent relationships now gendered correctly** ([#391](https://github.com/banisterious/obsidian-charted-roots/issues/391)): The Add Relationship modal's adoptive-parent path was lumping both parents into the gender-neutral `adoptive_parent_ids` array. Now writes to the gender-specific `adoptive_father_id` or `adoptive_mother_id` based on the target person's sex, falling back to the array when the matching slot is already occupied (same-sex adoptive parents). Parallels the [#365](https://github.com/banisterious/obsidian-charted-roots/issues/365) fix for step-parents.
- **Adoptive and step parents now appear in the adopted/step child's dynamic relationships block** ([#392](https://github.com/banisterious/obsidian-charted-roots/issues/392), [#395](https://github.com/banisterious/obsidian-charted-roots/issues/395)): The `charted-roots-relationships` dynamic block was reading only `fatherCrId` / `motherCrId` / `parentCrIds` when building the parents section, so adoptive and step parents were invisible on the child's note even though the reverse direction worked. Now also reads `adoptiveFatherCrId` / `adoptiveMotherCrId` / `adoptiveParentCrIds` and step-parent arrays, labeled accordingly.
- **Event modal preserves real-world `date` when `fc-date` is present** ([#393](https://github.com/banisterious/obsidian-charted-roots/issues/393)): With Calendarium integration on, the event modal was overwriting the `date` frontmatter field with the parsed `fc-date` value on save. Events now route edits to `fc-date` / `fc-end` when those fields are present, leaving an independent real-world `date` untouched — so worldbuilders can maintain both fictional-calendar and real-world dates on the same event without collision.

---

## [0.20.58] - 2026-04-17

### Added

- **Report Wizard entry points** ([#372](https://github.com/banisterious/obsidian-charted-roots/issues/372)): The Report Wizard is now accessible from three new locations: command palette ("Open report wizard"), Trees & Reports tab (new card between Book Builder and Reports), and person note context menu ("Generate report" with person pre-selected).
- **Additional in-tree card field toggles** ([#374](https://github.com/banisterious/obsidian-charted-roots/issues/374)): The Family Chart display menu now includes six new toggles — Show title, Show occupation, Show nickname, Show religion, Show caste, Show pronouns — so users can surface built-in person fields on the in-tree card without having to click into the info panel. Card height automatically grows to fit enabled lines, and all card styles (rectangle, compact, mini) adjust accordingly.
- **Sort spouses by marriage date** ([#375](https://github.com/banisterious/obsidian-charted-roots/issues/375)): New Family Chart display toggle renders spouses left-to-right in ascending order of `marriageDate` from each spouse relationship. Useful for serial remarriages and polygamous families where the frontmatter order doesn't reflect chronology. Spouses without a marriage date fall to the end; mirrors the existing "sort children by birth date" pattern.
- **"As of" date filter for family chart** ([#376](https://github.com/banisterious/obsidian-charted-roots/issues/376)): New Time group in the Family Chart toolbar with a date picker and clear button. When a date is set, people born after that date are hidden (combined with the existing living-person privacy filter), deceased people are rendered with a dashed border and reduced opacity (preserving family structure), and marriage lines are shown only when the marriage was active on the selected date. Date comparison uses ISO-date precision when both sides are ISO, with year-level fallback for fuzzy/qualified dates like "ABT 1850." Selected date persists in view state. Custom non-family relationships (liege/vassal, ally/rival, etc.) aren't affected yet — those require the overlay feature tracked in [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386).

### Documentation

- **Expanded custom-relationship type catalog** ([#383](https://github.com/banisterious/obsidian-charted-roots/issues/383)): The [Custom Relationships wiki page](https://github.com/banisterious/obsidian-charted-roots/wiki/Custom-Relationships) previously documented 12 built-in types across 4 categories; the plugin actually ships 25+ types across 6 categories. Added the missing Feudal/World-building (liege/vassal, ally/rival), DNA/Genetic (DNA match, opt-in), and expanded Social (neighbor, companion, betrothed) and Professional (employer/employee) types. Added a new "When to Use Non-Family Relationships" section surfacing FAN-network research, worldbuilding, and household-tracking use cases.

### Fixed

- **Family chart card spacing decoupled from card width** ([#373](https://github.com/banisterious/obsidian-charted-roots/issues/373)): Compact and mini card styles used to look visually identical to rectangle because horizontal sibling spacing was fixed regardless of card width. Each style now carries a matching default spacing (rectangle 250px, compact 200px, mini 140px), with a new Tight (140px) preset in the spacing menu. Spacing is clamped to `card_width + 20px` minimum so a preset can't collapse cards into each other. Compact and mini styles also respect the Show avatars toggle (previously they force-hid avatars regardless of the setting).

---

## [0.20.57] - 2026-04-15

### Added

- **Web Clipper discoverability in Control Center** ([#364](https://github.com/banisterious/obsidian-charted-roots/issues/364)): Info boxes in the Places, Sources, and People tabs link directly to the Web Clipper wiki templates, with relevant examples for each entity type (e.g., Wikidata for Places, FamilySearch/Wikipedia for People).
- **Marriage data in Family Group Sheet** ([#370](https://github.com/banisterious/obsidian-charted-roots/issues/370)): Family Group Sheet reports now include marriage date and place extracted from spouse relationship data, in both markdown and PDF output. Multiple marriages are supported with per-spouse sections.
- **Multiple person picker in event modal** ([#366](https://github.com/banisterious/obsidian-charted-roots/issues/366)): The create/edit event modal now supports adding multiple people to an event (e.g., marriages, group events). Additional persons are saved to the `persons` frontmatter array and persisted across modal state restoration.
- **Targeted schema validation** ([#367](https://github.com/banisterious/obsidian-charted-roots/issues/367)): The "Validate matching notes" context menu action on schemas now runs validation against only notes matching that schema, with progress modal and result summary.
- **Organization membership statistics** ([#368](https://github.com/banisterious/obsidian-charted-roots/issues/368)): The Organizations statistics card now shows real membership counts (people with memberships, total memberships, empty organizations) instead of placeholder zeros.
- **Universe and collection pickers in Report Wizard** ([#369](https://github.com/banisterious/obsidian-charted-roots/issues/369)): Report types that target a universe or collection now have fuzzy-search picker modals instead of "not yet implemented" notices.

### Fixed

- **Step-parent assignment ignores target sex** ([#365](https://github.com/banisterious/obsidian-charted-roots/issues/365)): Step-parent relationships from the `relationships` array were always assigned to `stepfatherCrIds` regardless of the target person's sex. Now checks the person's `sex` property and assigns to `stepmotherCrIds` for female step-parents.

---

## [0.20.56] - 2026-04-12

### Added

- **Book Builder link in Report Wizard**: The report type selection step now includes a link to the Book Builder, making it discoverable from the Report Wizard in addition to the command palette.
- **Linked map drill-down navigation** ([#361](https://github.com/banisterious/obsidian-charted-roots/issues/361)): Full drill-down navigation between custom maps:
  - **Phase 1:** `linked_map` on place notes — clicking a place marker shows an "Open [map name]" button in the popup
  - **Phase 2:** `parent_map` on map notes — breadcrumb navigation in the toolbar (e.g., "The Dying Earth → River Scaum"). Parent map dropdown in Map Creation Wizard.
  - **Phase 3:** `parent_region_x/y/w/h` on child map notes — clickable overlay rectangles on the parent map showing where child maps sit. Dashed blue border, tooltip on hover, click to drill down. Visual region drawing tracked in [#362](https://github.com/banisterious/obsidian-charted-roots/issues/362).
- **Universe entity dynamic blocks** ([#359](https://github.com/banisterious/obsidian-charted-roots/issues/359)): Four new dynamic content blocks for universe notes that automatically list all entities belonging to that universe:
  - `charted-roots-universe-people` — table with name, born, died, occupation
  - `charted-roots-universe-places` — table with name and place type
  - `charted-roots-universe-events` — table with event name, date, type badge, and place
  - `charted-roots-universe-organizations` — table with name and type
  - All entries are clickable wikilinks. Supports `sort` (name/date/type) and `limit` parameters. Auto-refreshes when vault data changes.
- **Universe map thumbnails** ([#360](https://github.com/banisterious/obsidian-charted-roots/issues/360)): New `charted-roots-universe-maps` dynamic block renders clickable map image thumbnails for custom maps belonging to a universe. Click a thumbnail to open it in Map View. Shows place count badge. Supports `size` parameter (small/medium/large).
- **Child map markers and region editing** ([#362](https://github.com/banisterious/obsidian-charted-roots/issues/362)): Visual tools for managing child map regions on parent maps:
  - Gold map-icon markers on parent maps for every child map, with popup showing "Open map" and "Edit/Draw region" buttons
  - On-map region editing: drag the rectangle to reposition, drag corner handles to resize, floating save/cancel toolbar — all at full map zoom for precision
  - Region drawing modal in the Map Creation Wizard for setting the region during map creation
  - "Draw/Edit parent region" context menu item on child map notes
  - "Child maps" layer toggle in the Layers menu

### Fixed

- **Place markers not showing on custom maps**: When a custom map's `universe` field stored the universe cr_id (e.g., `universe-the-dying-earth-mnkte9t5`) instead of the display name, the universe filter failed to match entity notes which store the name (e.g., `The Dying Earth`). The filter now resolves cr_ids to names before comparing.
- **Create place on custom map writes universe cr_id instead of name**: "Create place here" and "Link existing place" on custom maps wrote the universe cr_id to the new place's frontmatter instead of the display name, causing the marker not to appear until manually corrected.
- **Link existing place crashes on custom maps**: Right-clicking a custom map and selecting "Link existing place here" threw a `ReferenceError` because `folderFilter` was referenced but never declared.
- **Universe dropdown in map wizard shows cr_ids**: The universe dropdown in the Create custom map wizard listed both universe names and cr_ids. Now prioritizes universe note names and skips map notes that store cr_ids.
- **Universe map thumbnails show same place count for all maps**: Place counts were computed per-universe and shared across all map thumbnails. Now counts per-map using the `maps` field on place notes.

---

## [0.20.55] - 2026-04-10

### Added

- **Family Chart info panel expansion** ([#351](https://github.com/banisterious/obsidian-charted-roots/issues/351)): The Person details panel now supports editing all major person fields:
  - **Phase 1:** Alt name, pronouns, occupation (text inputs)
  - **Phase 2:** Birth place, death place (PlacePickerModal with Pick/Clear buttons)
  - **Phase 3:** Relationships (+ Add button opens AddRelationshipModal with full bidirectional sync)
  - **Phase 4:** Research level (dropdown, 0-6), collection (text input), sources (+ Link source button)
- **Image region crop for thumbnails** ([#354](https://github.com/banisterious/obsidian-charted-roots/issues/354)): New `media_crop` frontmatter property to define a rectangular crop region on any image. Cropped thumbnails displayed in the media block, Family Chart avatars, and Entity Profile View header. Visual crop selection modal with draggable/resizable rectangle, live preview, and save to frontmatter. Right-click any image in the media block to set, edit, or remove a crop region.
- **Settings tile on Control Center dashboard** ([#357](https://github.com/banisterious/obsidian-charted-roots/issues/357)): New tile in the Utilities row that opens Obsidian Settings directly to the Charted Roots configuration page.
- **Fictional date systems in Settings** ([#358](https://github.com/banisterious/obsidian-charted-roots/issues/358)): Fictional date systems management (enable/disable, built-in systems toggle, add/edit/delete custom systems) now available in Settings > Dates & validation, in addition to the existing Control Center Events tab location.

### Fixed

- **Burial event type not working in events array** ([#355](https://github.com/banisterious/obsidian-charted-roots/issues/355)): `burial` was excluded from the valid event types for the person-level `events` array, preventing burial locations from appearing as map markers when defined inline. Now supported alongside baptism, residence, and other event types.
- **Entity Profile View media thumbnails blank** ([#356](https://github.com/banisterious/obsidian-charted-roots/issues/356)): Image thumbnails in the profile view media section were always blank. `TFile.extension` returns `"png"` without a dot, but `getMediaType()` expected `".png"` — all media was mistyped as `'other'` instead of `'image'`.

---

## [0.20.54] - 2026-04-07

### Added

- **PDF previews in media blocks** ([#350](https://github.com/banisterious/obsidian-charted-roots/issues/350)): PDFs in the `charted-roots-media` dynamic block, Sources tab media gallery, and Entity Profile View media section now show a first-page thumbnail preview instead of a generic file icon. Uses Obsidian's built-in PDF.js with in-memory caching.

---

## [0.20.53] - 2026-04-07

### Added

- **Alt name in Entity Profile View** ([#349](https://github.com/banisterious/obsidian-charted-roots/issues/349)): `alt_name` now displays below the main name in the profile header with muted styling.
- **Alt name in map view popups** ([#347](https://github.com/banisterious/obsidian-charted-roots/issues/347)): `alt_name` now displays below the person name in map marker popups (birth, death, marriage, burial, and event markers).
- **Alt name on tree chart nodes** ([#348](https://github.com/banisterious/obsidian-charted-roots/issues/348)): `alt_name` now displays as an additional text line on SVG tree chart nodes and Excalidraw export nodes.

---

## [0.20.52] - 2026-04-07

### Added

- **Alt name display on Family Chart cards** ([#346](https://github.com/banisterious/obsidian-charted-roots/issues/346)): New `alt_name` frontmatter property for person notes, displayed as a second line below the main name on Family Chart View cards and in the Person details panel. Designed for multilingual genealogy (e.g., Chinese + romanized names). Card height auto-adjusts when any person has an alt name.

---

## [0.20.51] - 2026-04-06

### Fixed

- **"Add essential properties" and "Add cr_id" context menu actions not working** ([#344](https://github.com/banisterious/obsidian-charted-roots/issues/344)): After the context menu refactoring in v0.20.50, 32 helper functions (addEssentialPersonProperties, addCrId, etc.) were no longer in scope for the builder functions. Added explicit imports.

---

## [0.20.50] - 2026-04-05

### Added

- **Heat map intensity toggle and customizable presets** ([#336](https://github.com/banisterious/obsidian-charted-roots/issues/336)): The map Layers menu now has a dedicated heat map section with low/medium/high intensity options. Default intensity configurable in Settings > Places. Each preset's radius, blur, and opacity values are fully customizable in Settings for fine-tuning. Per-point intensity scaling removed in favor of leaflet.heat's native relative density algorithm.

### Changed

- **Layers menu reorganized**: "All places" moved above the heat map section. Data layers (markers, paths, places) grouped together, with heat map as a visual overlay section at the bottom.

### Fixed

- **Birth markers hidden under death markers** ([#343](https://github.com/banisterious/obsidian-charted-roots/issues/343)): Birth and death markers at the same location overlapped in separate cluster groups, hiding one and showing an incorrect count. All event marker types now share a single cluster group so overlapping markers combine into one cluster with the correct total count. Cluster icon color reflects the dominant event type.

---

## [0.20.49] - 2026-04-04

### Added

- **People folder mismatch warning** ([#342](https://github.com/banisterious/obsidian-charted-roots/issues/342)): When the map view finds 0 people in the configured People folder but detects person notes in other folders, a Notice guides the user to check Settings > Folders. Shown once per session.

### Fixed

- **Heat map too intense on custom pixel maps** ([#336](https://github.com/banisterious/obsidian-charted-roots/issues/336)): Dialed back pixel map heat layer settings — reduced radius, blur, and minimum opacity for a more balanced appearance with larger datasets.

---

## [0.20.48] - 2026-04-04

### Fixed

- **Heat map not visible on custom pixel maps** ([#336](https://github.com/banisterious/obsidian-charted-roots/issues/336)): Heat layer was rendering behind the image overlay on custom maps. Fixed z-index ordering, zoom-relative maxZoom for pixel coordinate systems, and increased minimum opacity and intensity scaling for both map types.
- **Stats page miscounting places without coordinates** ([#336](https://github.com/banisterious/obsidian-charted-roots/issues/336)): The "places without coordinates" check was looking for wrong property names and not recognizing pixel coordinates (`custom_coordinates_x`/`custom_coordinates_y`) on custom maps. Updated label to "Places without geographic or pixel coordinates."
- **Custom map image squished when created via Universe Wizard** ([#340](https://github.com/banisterious/obsidian-charted-roots/issues/340)): The Universe Wizard defaulted to `coordinate_system: geographic` with fixed ±100 bounds, causing images to stretch. Now defaults to `pixel` coordinate system, loads actual image dimensions, and writes `image_width`/`image_height` to the map note.

---

## [0.20.47] - 2026-04-03

### Added

- **Calendar view** ([#299](https://github.com/banisterious/obsidian-charted-roots/issues/299)): New workspace view showing a monthly calendar grid of significant dates across the vault. Birth (blue), death (red), and marriage (yellow) dates displayed as color-coded dots with optional text labels. Month dropdown and year input for navigation to any date. Day click detail panel, imprecise dates section, event type and living/deceased filters, right-click to create events with pre-filled date, keyboard navigation (arrows, T for today), and state persistence across reloads. Accessible via command palette, Control Center dashboard tile, Events tab button, and "Show on calendar" context menus on person and event notes.

---

## [0.20.46] - 2026-04-03

### Added

- **Source note hierarchies** ([#337](https://github.com/banisterious/obsidian-charted-roots/issues/337)): New `source_parent` and `source_parent_id` properties for linking child source notes to a parent document (e.g., probate packets, record groups, multi-page census transcriptions). Parent source picker with autocomplete in the create/edit source modal.
- **Source hierarchy display and navigation** ([#338](https://github.com/banisterious/obsidian-charted-roots/issues/338)): Source entity profiles show parent source, child documents, related documents (siblings), and a collapsible source tree visualization. Sources tab in Control Center adds hierarchy filters: "has parent," "no parent (top-level)," and "children of" a specific parent source.
- **"Create source" context menu** on the Sources folder for quick source note creation.

### Changed

- **Collapsible sections in modals** restyled from action-link appearance (blue plus icon) to section-header style (bordered container, chevron icon) for clearer affordance. Applied to create/edit source and create person modals.

### Fixed

- **Heat map barely visible with sparse data** ([#336](https://github.com/banisterious/obsidian-charted-roots/issues/336)): Heat map intensity now scales inversely with point count — sparse datasets (≤5 birth/death markers) render at 3× intensity, medium datasets (≤20) at 2×. Also raised the maxZoom threshold from 10 to 15 so the heat layer stays visible when zoomed in.

---

## [0.20.45] - 2026-04-02

### Added

- **Person-focused map journey** ([#295](https://github.com/banisterious/obsidian-charted-roots/issues/295)): New journey mode in the map view. Click the route button in the toolbar to select a person — the map isolates their markers and journey path, fitting bounds to their locations. Playback controls (prev/play/next) step through waypoints with animated pan/zoom. Speed selector, progress bar, and step counter. Rich waypoint popups show event type, date, place, age, duration at location, and description. Family overlay toggle shows dimmed journey paths for parents (blue), spouses (pink), and children (emerald), with click-to-switch. "Show journey on map" context menu entry on person notes.

### Fixed

- **Map tiles blocked by OpenStreetMap** ([#333](https://github.com/banisterious/obsidian-charted-roots/issues/333)): Map tiles showed "Access blocked — Referer is required" errors due to Obsidian's Electron sending an `app://` referrer that OSM rejects. Tile image elements now set `referrerPolicy='no-referrer'` to prevent this. Also applied to Profile View map preview.
- **Map preview blank after collapse/expand** ([#334](https://github.com/banisterious/obsidian-charted-roots/issues/334)): The embedded map in place profiles went blank when the Map section was collapsed and re-expanded. The Leaflet map was being destroyed on collapse; now it persists and calls `invalidateSize()` on re-expand.
- **World map preview invalid tile requests** ([#335](https://github.com/banisterious/obsidian-charted-roots/issues/335)): The world map preview in the Maps tab requested tiles at negative x coordinates, causing 400 errors in the console. Added bounds constraint to limit tile requests to valid geographic coordinates.
- **GeoNames 401 errors silent**: GeoNames lookup failures due to invalid or unactivated accounts now show a Notice guiding users to check Settings > Places. The setting description now links directly to the GeoNames registration and web services activation pages.

---

## [0.20.44] - 2026-04-01

### Fixed

- **Context lifespan margin includes family events in range** ([#332](https://github.com/banisterious/obsidian-charted-roots/issues/332)): The context lifespan margin calculated the year range from all events including family events (sibling births, spouse deaths, etc.), causing context events far outside the person's own lifespan to appear. Now uses only the person's own events to determine the range.

---

## [0.20.43] - 2026-04-01

### Fixed

- **Historical context events extra spacing** ([#330](https://github.com/banisterious/obsidian-charted-roots/issues/330)): Context events had extra left padding causing misalignment with personal and family events. Same fix as the family event padding from v0.20.42.

---

## [0.20.42] - 2026-03-31

### Fixed

- **Create child assigns wrong parent role** ([#329](https://github.com/banisterious/obsidian-charted-roots/issues/329)): When adding a child via context menu, the parent's sex value (`female`, `male`) wasn't matched correctly against the normalized form (`F`, `M`), causing a female parent to be assigned as father instead of mother. Now handles all formats (lowercase, full word, single letter).
- **Orphaned children_id entries after deleting child notes**: `addToChildrenArray` now validates existing `children_id` entries against actual vault files before appending, removing stale IDs from deleted notes.
- **Timeline spacing and alignment** ([#330](https://github.com/banisterious/obsidian-charted-roots/issues/330)): Entries without event type icons now render a placeholder for consistent alignment. Removed extra padding on family event items that caused misalignment with personal events.
- **Timeline format string missing spaces and icons** ([#331](https://github.com/banisterious/obsidian-charted-roots/issues/331)): Format string values from YAML had surrounding quotes included, causing literal `"` in output. Spaces between placeholders collapsed due to adjacent block elements — now uses non-breaking spaces. Icons were missing on format string entries. Family events sorted after personal events instead of chronologically when no context note was configured.

---

## [0.20.41] - 2026-03-30

### Fixed

- **Gender distribution and citation statistics sections not rendering** ([#326](https://github.com/banisterious/obsidian-charted-roots/issues/326)): The expandable person lists under each sex/gender category and the citation statistics section referenced an undefined service property, causing both sections to silently fail. Also fixed in v0.20.40: lazy-load timing, `sex: unknown` counted as "Other".
- **Adopted children duplicated in Profile View** ([#328](https://github.com/banisterious/obsidian-charted-roots/issues/328)): Adopted children appeared as both "Child" and "Adopted child" in the Profile View relationships section. Now excludes adopted children from the biological children list.

---

## [0.20.39] - 2026-03-29

### Added

- **Expandable person lists per sex/gender category** ([#326](https://github.com/banisterious/obsidian-charted-roots/issues/326)): The Sex & Gender Distribution section now includes expandable person lists under each category (Male, Female, Other, Unknown). "Other" entries show the actual value entered by the user. "Unknown" is split into explicitly stated (`sex: unknown`) vs. not stated (missing property). Each entry is a clickable link to the person note. All lists lazy-loaded on first expand.

### Fixed

- **Record superlatives 120-year age cap** ([#327](https://github.com/banisterious/obsidian-charted-roots/issues/327)): The hardcoded 120-year maximum age in longevity analysis, record superlatives, and data quality checks is now removed when fictional dates are enabled (`enableFictionalDates` setting). Fictional characters with extended lifespans now appear correctly in statistics.

---

## [0.20.38] - 2026-03-28

### Added

- **Customizable timeline display templates** ([#325](https://github.com/banisterious/obsidian-charted-roots/issues/325)): Four new capabilities for controlling how timeline entries are displayed. **Layout modes**: `layout` parameter with `chronological` (default), `grouped` (sections for personal/family/context), and `personal-first` options. **Label customization**: six settings under Advanced > Timeline labels to override birth, death, and family event labels with `{name}` placeholder support. **Format strings**: per-block `format` parameter with `{year}`, `{title}`, `{place}`, `{age}` placeholders. **Template notes**: reference a markdown note via `template: [[Note]]` to define custom sections with independent sort, include, and format.

- **Citation integration — derived sourcing and coverage metrics** ([#324](https://github.com/banisterious/obsidian-charted-roots/issues/324)): Three new commands for bidirectional sync between citation notes and `sourced_*` fields: sync sourced fields from citations (per-person and vault-wide), and generate citation notes from existing sourced fields. Source summary report now includes a Page column when citation notes have page references. New "Citation statistics" section in the statistics dashboard showing total citations, coverage percentage, quality distribution, and most cited sources.

### Fixed

- **Relationship calculator: ancestor couple grouping** ([#321](https://github.com/banisterious/obsidian-charted-roots/issues/321)): Common ancestors who are spouses are now grouped together (e.g., "via John Smith & Jane Doe") instead of appearing as separate results. Additional results now show their full relationship path. Fixed missing space before "via" in the ancestor label.
- **Timeline icons inconsistent with family events** ([#323](https://github.com/banisterious/obsidian-charted-roots/issues/323)): When family events are present on a timeline, personal events now always show their type icons for consistent visual alignment, regardless of the event icon mode setting.

---

## [0.20.37] - 2026-03-27

### Added

- **Family events on timelines** ([#323](https://github.com/banisterious/obsidian-charted-roots/issues/323)): Person timelines can now show children's births, spouse deaths, parent deaths, and sibling births. Controlled by four global toggles in Settings > Advanced (all off by default). Each entry links to the family member's note with age annotations. Use `familyEvents: none` in a code block to suppress on individual timelines.

- **Calculate multiple relationships** ([#321](https://github.com/banisterious/obsidian-charted-roots/issues/321)): The relationship calculator now supports finding multiple relationship paths between two people. After the primary (shortest) result, click "Find more relationships" to search for additional paths through different common ancestors. Each result shows the relationship type, common ancestor name, and blood/marriage indicator. Configurable max search depth in Settings > Advanced (default 10 generations, 0 for unlimited).

---

## [0.20.36] - 2026-03-27

### Added

- **Citation metadata support** ([#316](https://github.com/banisterious/obsidian-charted-roots/issues/316)): New citation entity type for per-citation page references and quality assessments. GEDCOM import generates citation notes from `SOUR` blocks with `PAGE`/`QUAY`. GEDCOM and Gramps exports write citation metadata back as `PAGE`/`QUAY` sub-tags. "Add citation" command and modal for manual citation creation. Citations section in the Entity Profile View showing citations grouped by source with fact labels, page references, and color-coded quality badges. New `citationsFolder` setting (default: `Charted Roots/Citations`).

### Fixed

- **GEDCOM export: place wikilinks not resolved**: Person-level birth, death, burial, and family marriage/divorce places were exported with `[[]]` brackets instead of plain text.
- **GEDCOM export: place hierarchy order reversed**: Hierarchical places were exported top-down (country, region, locality) instead of GEDCOM's most-specific-first order.
- **GEDCOM export: no source references on person-level events**: Birth, death, and burial events written from person frontmatter had no `SOUR` sub-tags. Now writes source references with `PAGE` and `QUAY` from citation notes.
- **Gramps export not wired into export wizard**: The Gramps format was listed as an option but had no handler, showing "not yet supported" on export.
- **Gramps export: duplicate events**: Birth, death, burial, and occupation events appeared twice — once from person-level data and once from event notes.
- **Gramps export: place wikilinks not resolved**: Same bracket issue as GEDCOM export.
- **Gramps export: duplicate places**: Place names from person frontmatter didn't match place graph names, creating duplicate entries.
- **Gramps export: no source references on person-level events**: Same as GEDCOM — now writes `sourceref` elements with `spage` and `confidence` from citation notes.

---

## [0.20.35] - 2026-03-26

### Fixed

- **Custom relationship types writing to wrong property** ([#319](https://github.com/banisterious/obsidian-charted-roots/issues/319)): Adding adopted child, step-child, foster child, or ward via the Add Relationship modal wrote to the `children` property instead of the type-specific property (`adopted_child`, `step_child`, `foster_child`, `ward`).
- **Calculate relationship and other context menu items failing** ([#320](https://github.com/banisterious/obsidian-charted-roots/issues/320)): 16 classes were used but not imported after context menus were extracted from main.ts. These relied on global scope resolution which could fail silently. All now have explicit imports.
- **Clearing date/occupation fields in Edit Person not saving** ([#322](https://github.com/banisterious/obsidian-charted-roots/issues/322)): Clearing a date or occupation field in the Edit Person modal appeared to save but didn't persist. The cleared value was set to `undefined` which caused the update to skip the field entirely.

---

## [0.20.34] - 2026-03-22

### Added

- **Cross-project research queries** ([#303](https://github.com/banisterious/obsidian-charted-roots/issues/303)): Two new ways to see all research activity for a person across projects. A "Research activity" section in person profiles aggregates IRNs, log entries, journals, reports, and projects referencing the person, grouped by project with date ranges and result indicators. A "Find related research" command (also in the command menu) opens a modal with the same grouped view, with a person picker if no person note is active.

### Fixed

- **Built-in relationship additions from context menu** ([#318](https://github.com/banisterious/obsidian-charted-roots/issues/318)): Adding father, mother, spouse, or child from the right-click context menu silently failed. The `RelationshipManager` import was lost when context menus were extracted from main.ts. Also fixed the Add Relationship modal to properly handle built-in family relationship types.

---

## [0.20.33] - 2026-03-20

### Added

- **Comprehensive GEDCOM field coverage** ([#317](https://github.com/banisterious/obsidian-charted-roots/issues/317)): Full import/export support for 16 additional GEDCOM fields. Name components: NPFX (prefix), NSFX (suffix), SPFX (surname prefix), NICK (export). Person attributes: TITL, RELI, NATI, DSCR, IDNO, PROP, CAST, NCHI, NMR, SSN (export added; import already worked). Burial date (BURI.DATE) now imports to `burial_date` and exports. Burial place (BURI.PLAC) now imports to `burial_place` frontmatter. Cause of death (DEAT.CAUS) imports to `death_cause` and exports. Age at event (AGE sub-tag) stored on event notes and re-exported. Six missing event type export mappings added: MARB, MARC, MARL, MARS, DIVF, CHRA.

### Fixed

- **GEDCOM export roundtrip improvements** ([#317](https://github.com/banisterious/obsidian-charted-roots/issues/317)): Family events (marriage, divorce, MARB, MARC, MARL, MARS, DIVF) now export on FAM records instead of as generic EVEN on individual records. FAM records include divorce date from spouse relationships. NAME line uses explicit NPFX/SPFX/NSFX components. Duplicate BIRT/DEAT/BURI/OCCU records eliminated when person-level data already covers them. OCCU exports inline value instead of NOTE sub-tag. FROM/TO date ranges now parsed and exported (previously only BET/AND was supported).

---

## [0.20.32] - 2026-03-18

### Changed

- **Default root person shows picker** ([#308](https://github.com/banisterious/obsidian-charted-roots/issues/308)): The person picker now always opens when selecting a Book Builder template, with the default root person pre-selected in the search field. Previously, the picker was skipped entirely when a default was found.

### Fixed

- **Tree charts scaling down nodes** ([#310](https://github.com/banisterious/obsidian-charted-roots/issues/310)): All four chart layouts (pedigree, descendant, hourglass, fan) now expand the canvas to fit content at full size, so names remain fully readable regardless of tree size. This fix applies to both Book Builder tree chapters and standalone visual tree PDF exports.
- **Record superlatives with fictional negative years** ([#312](https://github.com/banisterious/obsidian-charted-roots/issues/312)): Fictional dates with era prefixes and negative years (e.g., `DE -90`) were parsed as positive.
- **GEDCOM import spouse ID replacement and divorce dates** ([#314](https://github.com/banisterious/obsidian-charted-roots/issues/314)): Indexed `spouse[N]_id` values were not being converted from GEDCOM refs to CR IDs. Divorce dates were silently dropped due to double-conversion. An empty legacy `spouse:` field was written alongside indexed properties.

---

## [0.20.31] - 2026-03-18

### Added

- **Default root person for Book Builder** ([#308](https://github.com/banisterious/obsidian-charted-roots/issues/308)): When applying a Book Builder template, the root person is now resolved automatically from the active note (if it's a person) or the person marked `root_person: true` in the vault. Falls back to the person picker if no default is found.

### Fixed

- **Book Builder button in Control Center** ([#307](https://github.com/banisterious/obsidian-charted-roots/issues/307)): The "Open book builder" button passed incorrect arguments to the modal constructor, causing it to silently fail.
- **Book Builder missing ancestor and family group chapters** ([#309](https://github.com/banisterious/obsidian-charted-roots/issues/309)): `getPerson()` and `getPersonByCrId()` did not ensure the person cache was loaded, causing Book Builder templates to generate empty ancestor and family group sections when fact-level source tracking was disabled.
- **Book Builder saving individual report files** ([#311](https://github.com/banisterious/obsidian-charted-roots/issues/311)): Generating a PDF book also saved each report chapter as a standalone markdown file in the vault.
- **Unreadable tree charts in PDF output** ([#310](https://github.com/banisterious/obsidian-charted-roots/issues/310)): Visual tree charts used white text on light pastel backgrounds, making them unreadable in PDF/book output. Text color now uses dark tones matching the existing report palette. Long names that overflowed card boundaries are now clipped.
- **Record superlatives ignoring years before 1000** ([#312](https://github.com/banisterious/obsidian-charted-roots/issues/312)): The year extraction regex required exactly 4 digits, so years like `800` were ignored and negative years like `-1000` had their sign stripped. Now supports 1+ digit years and negative (BCE) years.
- **GEDCOM import dropping marriage date/place** ([#314](https://github.com/banisterious/obsidian-charted-roots/issues/314)): The GEDCOM parser correctly captured `FAM.MARR.DATE` and `FAM.MARR.PLAC`, but the importer never wrote them to indexed `spouse[N]_marriage_date` / `spouse[N]_marriage_location` frontmatter properties. Now populates `SpouseMetadata` with marriage date, place, and divorce date from the family record.

---

## [0.20.30] - 2026-03-17

### Fixed

- **Gaps report crash in report wizard** ([#306](https://github.com/banisterious/obsidian-charted-roots/issues/306)): The report wizard was missing gaps-specific options (`fieldsToCheck`, `maxItemsPerCategory`, research level filters) that the old report modal had, causing a crash when generating gaps reports. The wizard now includes the full set of gaps report configuration options.
- **Negative findings and research timeline not scanning research reports** ([#305](https://github.com/banisterious/obsidian-charted-roots/issues/305)): The negative findings block and research timeline processors only scanned `research_journal` notes for markdown `→ negative` entries, missing users who log findings in `research_report` or `research_project` notes. Both processors now scan all three note types.

---

## [0.20.29] - 2026-03-16

### Added

- **Historical context overlay and age annotations** ([#296](https://github.com/banisterious/obsidian-charted-roots/issues/296)): Timelines can now overlay historical events from a user-defined context note referenced via `context: [[Note]]` in the code block. Context events are rendered with muted styling and a landmark icon. New `defaultTimelineContext` setting applies a context note to all timelines globally. All timeline events now display age annotations when the person's birth date is known.

### Changed

- **Context lifespan filtering is now configurable** ([#304](https://github.com/banisterious/obsidian-charted-roots/issues/304)): Context events are no longer filtered by default — all events from the context note are shown. A new `contextLifespanMargin` setting (and per-block `contextMargin` parameter) allows users to limit context events to within N years of the person's lifespan. Context note lines no longer require a bullet prefix.

---

## [0.20.27] - 2026-03-15

### Added

- **Book builder entry points** ([#294](https://github.com/banisterious/obsidian-charted-roots/issues/294)): Added book builder tile to the Control Center's Trees & Reports tab and a "Books & compilation" category to the command menu.

### Fixed

- **Book generation error** ([#302](https://github.com/banisterious/obsidian-charted-roots/issues/302)): Fixed `downloadBook is not a function` error when generating a book, and fixed blank content in template-derived chapters (ancestors, family groups, reference pages) caused by the generation service not mapping the chapter's subject ID to the field name each report type expects.

---

## [0.20.26] - 2026-03-15

### Added

- **Book and narrative compilation** ([#294](https://github.com/banisterious/obsidian-charted-roots/issues/294)): A book builder that combines reports, visual trees, vault notes, and section dividers into a single PDF or ODT document. Features a 4-step wizard modal with drag-and-drop chapter ordering, preset templates (family history book, research compilation), consolidated bibliography, name index, chapter numbering (numeric or Roman), and enhanced section dividers. Templates derive chapters from the family graph. Saveable as `.book.json` definitions with a regenerate command and change detection.

---

## [0.20.25] - 2026-03-13

### Added

- **Record superlatives** ([#301](https://github.com/banisterious/obsidian-charted-roots/issues/301)): New "Record superlatives" section in the statistics dashboard showing notable individuals: oldest people, youngest deaths, most children, most marriages, longest marriages, earliest births, most recent deaths, and most documented people. Each entry is a clickable link with dates and the record value. Rendered as a card grid with ranked entries.

- **Research timeline dynamic code block** ([#293](https://github.com/banisterious/obsidian-charted-roots/issues/293)): New `charted-roots-research-timeline` code block with three view modes. Table view shows a chronological activity log with gap detection. Heatmap view renders a GitHub-style contribution grid showing 52 weeks of research activity density. Timeline view displays horizontal bars per person/project with color-coded result markers and highlighted gap regions. Supports filtering by person and project, configurable gap threshold, grouping, and freeze-to-markdown.

### Changed

- **Report generation limit removed** ([#297](https://github.com/banisterious/obsidian-charted-roots/issues/297)): The generations selector in the report wizard is now a free numeric input instead of a fixed dropdown (3–10). Users can enter any value with no upper limit.

- **Kinship max degree limit removed** ([#300](https://github.com/banisterious/obsidian-charted-roots/issues/300)): The max degree selector in the kinship report is now a free numeric input instead of a fixed dropdown (5–30). Users can enter any value with no upper limit.

---

## [0.20.24] - 2026-03-12

### Added

- **Brick wall report** ([#297](https://github.com/banisterious/obsidian-charted-roots/issues/297)): New report type that identifies end-of-line ancestors with no parents defined. Traverses the ancestor tree using Sosa-Stradonitz numbering and lists every terminal node with generation number, Ahnentafel number, lineage path, source count, and research level. Sortable by generation, name, or research level. Includes tree completeness statistics. Available as markdown, PDF (landscape), or ODT via the report wizard.

- **Unconnected people finder** ([#298](https://github.com/banisterious/obsidian-charted-roots/issues/298)): New report that identifies people not linked to a selected person's family network. Uses connected component analysis to find disconnected clusters and completely isolated records. Shows network coverage percentage, groups unconnected people by cluster, and lists isolated people separately. Available as markdown, PDF, or ODT.

- **Kinship report** ([#300](https://github.com/banisterious/obsidian-charted-roots/issues/300)): New report listing all relatives of a person with proper genealogical relationship terms and degree. Uses the existing relationship calculator to compute terms for every reachable person (cousins with removals, in-laws, great-grandparents, etc.). Sortable by degree, name, or relationship type. Includes summary with blood vs. marriage breakdown and category counts.

### Changed

- **Dynamic code blocks use `charted-roots-*` prefix**: New person notes now use `charted-roots-timeline`, `charted-roots-relationships`, and `charted-roots-media` block names instead of the legacy `canvas-roots-*` prefix. Existing notes with the old prefix continue to work via backward-compatible aliases.

---

## [0.20.23] - 2026-03-11

### Added

- **Negative findings dynamic code block** ([#287](https://github.com/banisterious/obsidian-charted-roots/issues/287)): New `charted-roots-negative-findings` code block that surfaces all negative research results across the vault. Parses both frontmatter (`research_log_entry` notes with `result: negative`) and markdown entries in research journals (lines matching `→ negative`). Renders a searchable table with date, source, searched-for text, project, and person columns. Supports grouping by person, project, or source, chronological/reverse sorting, project/person filters, and freeze-to-markdown.

### Fixed

- **Custom relationship types duplicated in Profile View** ([#289](https://github.com/banisterious/obsidian-charted-roots/issues/289)): Custom relationship types with a `familyGraphMapping` (e.g., "Sire" mapped to parent, "Childer" mapped to child) no longer produce duplicate entries. Previously both the custom name (e.g., "Sire" in Other) and the generic label (e.g., "Parent" in Family) appeared for the same person. The Family section now suppresses generic entries when a custom type in Other already covers that relationship.

---

## [0.20.22] - 2026-03-11

### Added

- **Command menu / multi-action launcher** ([#290](https://github.com/banisterious/obsidian-charted-roots/issues/290)): A searchable modal that groups all 56 plugin commands into 6 categories (Create, View, Edit, Trees & numbering, Bases, Tools). Accessible via the "Open command menu" command (assignable to any hotkey) or the new Command Menu tile on the control center dashboard.

- **Sourced facts in Edit Person modal** ([#292](https://github.com/banisterious/obsidian-charted-roots/issues/292)): A new collapsible "Source tracking" section in the Edit Person modal lets users add per-fact source citations for the 10 trackable facts (birth date/place, death date/place, parents, spouse, marriage date/place, occupation, residence). Each fact row shows linked sources as chips with a picker to add more. Only appears when fact-level source tracking is enabled in settings.

---

## [0.20.21] - 2026-03-08

### Added

- **Link to existing event from context menu** ([#288](https://github.com/banisterious/obsidian-charted-roots/issues/288)): Person and source notes now have a "Link to existing event" option in their right-click context menu. Opens the event picker to search and select an event, then adds the person or source to the event's frontmatter.

- **Array pronouns with chip-style input** ([#291](https://github.com/banisterious/obsidian-charted-roots/issues/291)): The edit person modal now reads and writes pronouns as a YAML array. A chip-style input with preset suggestions (she/her, he/him, they/them) and free-text entry replaces the old single text field. All display paths (person picker, reports, PDF export) handle both string and array formats for backward compatibility.

### Fixed

- **Cannot select roles in Manage Members modal** ([#286](https://github.com/banisterious/obsidian-charted-roots/issues/286)): Replaced the autocomplete suggest dropdown (which had z-index issues inside modals) with clickable role chips rendered directly below the role input.

- **Profile View relationship duplication** ([#289](https://github.com/banisterious/obsidian-charted-roots/issues/289)): Relationships with a `familyGraphMapping` (e.g., godparent) no longer appear in both the Family and Other subsections. Additionally, when both sides of a relationship are defined (A→B and B→A), the combined direct + inverse entries are now deduplicated.

---

## [0.20.20] - 2026-03-06

### Fixed

- **Inferred relationship duplicates with gendered family properties** ([#285](https://github.com/banisterious/obsidian-charted-roots/issues/285)): Gendered family properties (`father`, `mother`, `stepfather`, `stepmother`, `adoptive_father`, `adoptive_mother`) are now treated as equivalent to their corresponding relationship types (`parents`, `step_parent`, `adoptive_parent`) during deduplication. Previously, using `father`/`mother` instead of `parents` in frontmatter would still produce a spurious inferred "Parent" entry in the Relationships tab.

- **Role suggest dropdown unclickable in Manage Members modal** ([#286](https://github.com/banisterious/obsidian-charted-roots/issues/286)): Removed CSS `overflow-y: auto` from the member list container which clipped the role autocomplete popover, preventing role selection.

---

## [0.20.19] - 2026-03-03

### Added

- **Entity Profile View — Phase 3 polish** ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)): Lazy section rendering defers DOM population until first expand via optional `contentRenderer` callback. Keyboard navigation follows WAI-ARIA accordion pattern (ArrowUp/Down, Enter/Space, Home/End) with ARIA attributes on section headers. Mobile-responsive layout adds 44px touch targets and a narrow-pane media query. Embedded Leaflet map preview for place profiles replaces text-only coordinates with an interactive map, marker, and "Open in Geo Map" button that passes focus coordinates.

- **Entity Profile View — Phase 2 inline editing** ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)): Click-to-edit for identity header fields across all five entity types. Click any field value to transform it into an input; press Enter or blur to save, Escape to cancel. Supports text, number, and select inputs. Editable fields: name/title, dates (born, died, founded, dissolved), birth place, occupation, sex (dropdown), place category (dropdown), coordinates (number), event/source type, date, place/repository/seat. Only one field edits at a time. Empty fields show clickable placeholders when editing is available. Saves directly to frontmatter via `processFrontMatter()` with property alias support and wikilink requoting. Self-modify guard prevents redundant re-renders after inline edits.

### Fixed

- **Entity Profile View bug fixes** ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)): Fix property name bugs in members and relationships sections, correct private service access patterns, replace dynamic `require()` with static imports, and reconcile all CSS class names to match TypeScript DOM output. Resolve family relationship names from personIndex instead of showing raw cr_ids, and filter duplicate family-category entries from the Other Relationships subsection.

---

## [0.20.18] - 2026-03-01

### Added

- **Entity Profile View — Phase 1 read-only** ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251)): New dockable sidebar view that auto-syncs to the active note, displaying a comprehensive profile for any entity type (person, place, event, source, organization). Features a sticky identity header with entity type badge, avatar, and key metadata; collapsible sections for relationships, events, sources, media, data quality, participants, members, map preview, and referenced facts; pin/unpin toggle for freezing on a specific entity; breadcrumb navigation for in-place entity traversal; and state persistence across sessions. Accessible via command palette ("Open entity profile") and context menu ("Open profile") on all five entity types.

---

## [0.20.17] - 2026-02-28

### Added

- **Structured role lists for organizations** ([#274](https://github.com/banisterious/obsidian-charted-roots/issues/274)): New `roles` property on organization notes defines valid roles and display order. Role picker with autocomplete suggestions in Add Membership and Manage Members modals. Organization types can define default role templates. Members renderer uses 3-level fallback for role ordering: block `role-order` → org `roles` → alphabetical.

- **Mills-aligned source classification** ([#276](https://github.com/banisterious/obsidian-charted-roots/issues/276)): Three optional classification axes from Mills' *Evidence Explained* — `source_classification` (original/derivative/authored narrative), `information_classification` (primary/secondary/undetermined), and `evidence_classification` (direct/indirect/negative). Adds collapsible classification section to Create Source modal, integrates with evidence analysis via `information_classification` precedence, and conditionally displays classification columns in Source Summary, Sources by Role, and PDF reports. Template snippets updated for census, vital record, and full templates.

---

## [0.20.16] - 2026-02-27

### Added

- **Extractions dynamic block for source notes** ([#284](https://github.com/banisterious/obsidian-charted-roots/issues/284)): New `charted-roots-extractions` code block renders a reverse lookup from a source note to all entities that cite it. Shows three grouped sections — Persons (with fact-level citations), Events (with type, date, person, and place), and Places (derived from citing events with event counts). Supports freeze-to-markdown and live updates on metadata changes.

- **Research Bases template** ([#231](https://github.com/banisterious/obsidian-charted-roots/issues/231)): New "Create research base template" command creates a `research.base` file with 12 pre-configured views for managing research workflow entities (projects, reports, IRNs, journals, log entries). Includes per-type views, status grouping, in-progress/completed filters, negative findings view, and private items filter. Also available from the Data Quality tab's base type dropdown and the "Create all base templates" command.

### Fixed

- **Create Family modal sets only one parent on children** ([#277](https://github.com/banisterious/obsidian-charted-roots/issues/277)): The modal made separate `processFrontMatter` calls to set father and mother on each child note. When these fired in rapid succession on the same file, the second call could read stale state and overwrite the first, leaving children with only one parent or none at all. Both parents are now written in a single call per child.

- **Duplicate relationships shown in Defined vs Inferred** ([#285](https://github.com/banisterious/obsidian-charted-roots/issues/285)): When both sides of a relationship were explicitly defined (e.g., mentor on Person A and disciple on Person B), the inverse inference engine didn't check whether the relationship already existed, causing every bidirectionally-defined relationship to appear twice — once as "defined" and once as "inferred." The "Inferred only" filter now correctly shows only relationships that are defined on one side.

---

## [0.20.15] - 2026-02-23

### Changed

- **Rename "Family" dashboard tile to "Create Family"**: Reduces confusion with the adjacent "Family Chart" tile by making the action explicit.

- **Rename "Canvas Trees" dashboard tile to "Generate Canvas Tree"**: Clarifies that this tile generates a visualization from existing data, distinct from the interactive "Family Chart" view.

- **Improve family chart empty state wording** ([#282](https://github.com/banisterious/obsidian-charted-roots/issues/282)): Replaced "Select a person" button with "Choose from list" to avoid confusion with Obsidian's file selection model.

### Fixed

- **Bidirectional linker duplicates indexed spouse entries** ([#283](https://github.com/banisterious/obsidian-charted-roots/issues/283)): When manually adding `spouse1: "[[Name]]"` without the corresponding `spouse1_id`, the bidirectional linker didn't detect the existing link and created a duplicate at the next available slot. The duplicate check now also scans indexed wikilink fields, not just `_id` fields.

- **Family chart fails to resolve wikilink-based relationships** ([#281](https://github.com/banisterious/obsidian-charted-roots/issues/281)): The family chart view constructed its own `FamilyGraphService` without wiring up the `PersonIndexService`, so all wikilink-based relationships (`father: [[Name]]`, `children: [[Name]]`, etc.) silently failed to resolve. People appeared as isolated cards with no connections. Only vaults using `_id` fields were unaffected.

- **Family chart shows non-binary and unknown sex as male** ([#280](https://github.com/banisterious/obsidian-charted-roots/issues/280)): The family chart view forced all non-female sex values to male, so people with non-binary or unknown sex always appeared with the male color. The chart now correctly maps non-binary (`X`) and unknown (`U`) sex codes and renders them with distinct colors (muted gold for non-binary, gray for unknown) across all card styles and exports. The info panel also displays and allows editing of all four sex values. Darkened the default unknown-sex gray from `rgb(211,211,211)` to `rgb(140,140,140)` for better contrast.

- **Sources block shows filename instead of title and missing fact labels** ([#278](https://github.com/banisterious/obsidian-charted-roots/issues/278)): The `charted-roots-sources` block displayed the source note's filename rather than its `title` frontmatter property, and the Facts column was always empty for vaults using the legacy `sourced_facts` nested object. The title column now uses `[[filename|title]]` display syntax, and the processor reads from both flat `sourced_*` properties and the legacy `sourced_facts` format.

---

## [0.20.14] - 2026-02-22

### Added

- **`charted-roots-sources` dynamic block for person notes** ([#278](https://github.com/banisterious/obsidian-charted-roots/issues/278)): New code block that renders a table of sources linked to the current person note. Gathers sources from both the general `sources` array and fact-level `sourced_*` properties, showing type icon, title wikilink, date, and which facts each source supports. Supports `title`, `sort`, `filter`, and `exclude` config options, and freeze-to-markdown.

### Fixed

- **Create Family modal corrupts existing notes when children share names with existing people** ([#277](https://github.com/banisterious/obsidian-charted-roots/issues/277)): When creating children whose names matched existing people in the vault (e.g., adding "James Hardwick" b.1851 when "James Hardwick" b.1770 already existed), the wizard wrote wikilinks that resolved to the wrong file. The bidirectional linker then fired on the partially-written state and overwrote the existing person's father/mother fields, turning grandparents into children. The wizard now suspends the bidirectional linker during batch operations and constructs file-aware wikilinks that correctly target deduplicated filenames.

- **Cannot freeze dynamic blocks on person notes** ([#279](https://github.com/banisterious/obsidian-charted-roots/issues/279)): Freezing a dynamic block to markdown failed with "Could not find block in file" when the code block used the `charted-roots-*` name rather than the legacy `canvas-roots-*` name. The freeze function now matches either prefix. Template snippets also updated to use the current `charted-roots-*` naming convention.

- **Non-binary and unknown sex not rendering distinct colors in charts** ([#280](https://github.com/banisterious/obsidian-charted-roots/issues/280)): The chart color logic checked for pre-normalization strings (e.g., `NONBINARY`) but the sex field is already normalized to canonical values (`M`/`F`/`X`/`U`), so non-binary people always fell through to the unknown color. All three renderers (canvas, tree preview, SVG export) now correctly match the canonical `X` value. The SVG renderer also gains a distinct non-binary color (muted gold).

---

## [0.20.13] - 2026-02-18

### Added

- **Media block inserted for event, place, and source notes** ([#269](https://github.com/banisterious/obsidian-charted-roots/issues/269)): The `charted-roots-media` dynamic block is now inserted into event, place, and source notes that have media attachments — both during Gramps/GEDCOM import (when "Include dynamic blocks" is enabled) and via the "Insert dynamic blocks" command. Previously, media blocks were only added to person notes.

### Fixed

- **Members block `role-order` config option ignored** ([#268](https://github.com/banisterious/obsidian-charted-roots/issues/268)): The `role-order` config value was silently discarded because the config parser splits comma-separated values into arrays, but `parseRoleOrder` only accepted strings. Role groups now display in the user-specified order.

- **Relationship calculator shows "Blood Relation: Yes" for in-law relationships** ([#270](https://github.com/banisterious/obsidian-charted-roots/issues/270)): When a relationship path passed through a spouse link, the blood relation flag was still reported as "Yes" due to an overly broad OR condition that was always true when generations were present. Blood relation is now correctly determined solely by the absence of spouse links in the path.

- **Non-person notes with cr_id appearing in People tab** ([#271](https://github.com/banisterious/obsidian-charted-roots/issues/271)): Notes with unrecognized `cr_type` values (e.g., `hex` for hex map tiles) that also had a `cr_id` were incorrectly detected as person notes because the fallback heuristic only checked for known entity properties. The detection now rejects any note that has an explicit type property set, even if the value isn't in the plugin's recognized type list.

---

## [0.20.12] - 2026-02-17

### Added

- **Members block `show-notes` and `role-order` config options** ([#268](https://github.com/banisterious/obsidian-charted-roots/issues/268)): The `charted-roots-members` block now supports `show-notes: true` to display membership notes alongside each member, and `role-order: Role A, Role B, ...` to control the display order of role groups instead of defaulting to alphabetical.

### Fixed

- **Gramps import place filename mismatch causes missing place notes** ([#259](https://github.com/banisterious/obsidian-charted-roots/issues/259)): The place note writer computed its own filename from the short place name (e.g., "Pennsylvania") instead of using the importer's disambiguated name with parent suffix (e.g., "Pennsylvania USA"), causing wikilinks to point to non-existent files while actual files were created with wrong names and duplicate suffixes.

- **Members dynamic block missing role headings for single-role orgs** ([#264](https://github.com/banisterious/obsidian-charted-roots/issues/264)): When an organization had members in only one role group, the role heading was hidden, making it impossible to see what role members held. Additionally, the membership service read path did not coerce single-value frontmatter strings into arrays, which could cause role data to be lost when a person had only one membership.

- **Edit place modal still corrupts wikilink arrays in frontmatter** ([#263](https://github.com/banisterious/obsidian-charted-roots/issues/263)): Obsidian's `processFrontMatter` re-serializes all YAML and its serializer strips quotes from `[[wikilink]]` values. On the next parse, bare `[[...]]` is interpreted as nested YAML arrays, corrupting user-defined properties like Factions or Districts into `{0: ["value"]}` objects. The place note updater now re-quotes any bare wikilinks in the frontmatter immediately after `processFrontMatter` completes.

---

## [0.20.11] - 2026-02-14

### Added

- **Import Gramps tags as Obsidian tags** ([#267](https://github.com/banisterious/obsidian-charted-roots/issues/267)): Gramps tags (e.g., "notable", "needs review") are now parsed from `<tag>` definitions and `<tagref>` elements and written as standard Obsidian `tags` frontmatter arrays on person, event, place, and source notes.

- **Dynamic block for organization members** ([#268](https://github.com/banisterious/obsidian-charted-roots/issues/268)): Organization notes now support a `charted-roots-members` code block that renders members grouped by role with wikilinks and date ranges. Supports `group-by`, `sort`, `show-dates`, `show-former`, and `title` config options, live updates when membership data changes, and freeze-to-markdown. Available via context menu ("Insert members block") or the "Insert dynamic blocks" command.

### Fixed

- **Family chart cards rendering with broken positions** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): The upstream family-chart library can produce `translate(undefined, undefined)` on card elements when certain node positions haven't been computed during animation. Added a postinstall patch that guards all enter-position assignments with `?? 0` fallbacks, preventing undefined values from reaching D3 transitions. The existing MutationObserver remains as defense-in-depth.

- **Gramps import missing place hierarchy from placeref chains** ([#259](https://github.com/banisterious/obsidian-charted-roots/issues/259)): Places without `<ptitle>` that encode hierarchy via `<placeref>` links (e.g., County → State → Country) were imported as flat single-level notes with no parent relationships. Now follows placeref chains to build full hierarchical names, matching GEDCOM importer behavior.

- **Gramps import creates duplicate state files and broken place links** ([#259](https://github.com/banisterious/obsidian-charted-roots/issues/259)): Multiple place map entries resolving to the same canonical file name (e.g., "IA, USA" and "Iowa, USA" both producing "Iowa USA.md") caused duplicate files like "Iowa USA 1.md" and inconsistent wikilinks. Place entries are now grouped by canonical file name before creation, and a path-tracking set prevents vault index race conditions from producing duplicates.

- **Duplicate person entries in event displays** ([#261](https://github.com/banisterious/obsidian-charted-roots/issues/261)): The event edit modal wrote a `person` property directly to frontmatter instead of using the `persons` array, causing the same person to appear twice in event listings. Fixed the edit modal to write `persons[]` consistently, added deduplication to remaining display paths, and made Gantt timeline grouping resilient to either format.

- **Edit place modal corrupts unmanaged frontmatter arrays** ([#263](https://github.com/banisterious/obsidian-charted-roots/issues/263)): Editing a place note re-serialized all frontmatter through a custom YAML builder, corrupting user-defined array properties (e.g., Factions, Districts) into objects with numeric keys. The update function now uses Obsidian's `processFrontMatter` API, which only modifies managed properties and leaves everything else untouched.

- **Inferred relationships filter shows no results** ([#264](https://github.com/banisterious/obsidian-charted-roots/issues/264)): The relationships tab displayed a count of inferred relationships in the summary but the "Inferred only" filter returned nothing. The list now includes both defined and inferred inverse relationships so all filters work correctly.

- **Organization base template missing managed members** ([#264](https://github.com/banisterious/obsidian-charted-roots/issues/264)): Members added via the Manage Members modal were stored only on person notes, making them invisible to the organization base template. Member lists are now synced to the organization note's frontmatter on each add/remove/edit, and the base template includes a Members column.

- **GEDCOM import assigns wrong spouses/children for duplicate names** ([#258](https://github.com/banisterious/obsidian-charted-roots/issues/258)): When importing people with identical names (e.g., 7 "William Hurst" individuals), wikilinks for spouses, children, and step-parents all pointed to the first person's file instead of the correct deduplicated file. The wikilink fixer now handles both single-value and array YAML formats and matches any wikilink format including piped links. Additionally, the bidirectional relationship sync was not suspended during GEDCOM import, causing the file watcher to add children to the wrong parent based on not-yet-corrected wikilinks. Sync is now always suspended during import, matching the Gramps importer behavior.

- **"Research needed" card and command missing for person notes** ([#266](https://github.com/banisterious/obsidian-charted-roots/issues/266)): The "Add research question" command palette entry didn't appear for person notes with `cr_type: person` (only legacy notes without `cr_type` were recognized). Additionally, the Data Quality card didn't load the person cache before querying, so the "Research needed" card was empty when Data Quality was the first tab visited. Also fixed `needs_research` not being recognized when Obsidian's property type is set to "text" instead of "list". Fixed a crash in the Research needed section caused by accessing `place.file` on PlaceNode objects that only have `filePath`; the section now correctly resolves place file paths before querying metadata.

---

## [0.20.9] - 2026-02-11

### Added

- **Copy birth/death date from event to person note** ([#262](https://github.com/banisterious/obsidian-charted-roots/issues/262)): After creating or editing a birth or death event, a clickable notice offers to copy the event date to the linked person's `born` or `died` property. Skips the prompt if the person already has the matching date.

### Refactored

- **Consolidate US state abbreviation maps** ([#265](https://github.com/banisterious/obsidian-charted-roots/issues/265)): Replaced 4 duplicate `US_STATE_ABBREVIATIONS` maps across GEDCOM importer, Gramps importer, place generator, and merge-duplicates modal with a single import from `place-name-normalizer.ts`.

### Fixed

- **CC click-row edit losing spouse/children data** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): Opening the Edit Person modal from Control Center's People tab (click row) showed raw `cr_id` values instead of names for spouses and children, and corrupted data on save. Now extracts full spouse metadata and children names matching the hotkey edit path.

- **Research level showing "Not assessed" despite value in frontmatter** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): Both the CC click-row and hotkey edit paths failed to pass `research_level` to the Edit Person modal. Now reads from frontmatter and pre-fills correctly.

- **Self-referential father when adding same-name child** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): When a parent and child shared the same name (e.g., "William Hurst Sr." and "William Hurst Jr."), the bidirectional linker could resolve the child's wikilink back to the parent's own file. Added self-reference guards and excluded the current note from person picker results.

- **Person count off-by-one between views** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): VaultStatsService was not excluding proof summary and universe notes from person counts, while FamilyGraphService was. Aligned exclusion logic so counts match across views.

- **Place type customizations not working** ([#263](https://github.com/banisterious/obsidian-charted-roots/issues/263)): The Create Place modal's type dropdown was hardcoded and ignored settings. Township was missing, hiding/renaming types had no effect, and custom types didn't appear. Now reads from settings and respects all customizations.

- **Duplicate person entries in event displays** ([#261](https://github.com/banisterious/obsidian-charted-roots/issues/261)): When an event had the same person in both `person` (singular/principal) and `persons` (array) fields, they could appear twice in timeline displays. Now deduplicates when collecting participants for display.

- **Gramps import creating broken place wikilinks for US states** ([#259](https://github.com/banisterious/obsidian-charted-roots/issues/259)): When Gramps places used state abbreviations (e.g., "IA, USA"), the importer created files like "IA.md" but child places and events generated wikilinks like `[[Iowa USA]]`. Now expands US state abbreviations to full names, matching GEDCOM importer behavior.

### Diagnostics

- **GEDCOM spouse linking investigation** ([#258](https://github.com/banisterious/obsidian-charted-roots/issues/258)): Added console logging to trace spouse relationship building during GEDCOM import. Filter developer console for the affected GEDCOM ID (e.g., `I0091`) to see linking details.

---

## [0.20.8] - 2026-02-09

### Fixed

- **Children array missing names in Family Wizard** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): When creating families via Control Center, the `children` array could have fewer entries than `children_id`. The helper function was reading the wrong property name (`child` instead of `children`).

- **Spouse field preserving corrupt data** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): When spouse/children arrays had mismatched lengths (from prior corruption), the update would only write the `_id` field but preserve the corrupt wikilink field. Now clears both fields when arrays don't match.

- **Edit Person modal not showing existing parent relationships** ([#257](https://github.com/banisterious/obsidian-charted-roots/issues/257)): The "Family relationships" panel showed "Click 'Link' to select father/mother" even when parent relationships existed. The modal was only receiving the `_id` fields but not the names needed for display.

- **GEDCOM import causing parent claim conflicts** ([#258](https://github.com/banisterious/obsidian-charted-roots/issues/258)): When a child appeared in multiple GEDCOM families (e.g., remarriage modeling, adoption records), multiple parents would claim the same child. Changed child population logic to match Gramps importer—now only adds children whose `fatherRef`/`motherRef` matches the current person.

- **Gramps import missing state-level place notes** ([#259](https://github.com/banisterious/obsidian-charted-roots/issues/259)): Place collection only included places with comma-separated names, skipping single-part names like "Illinois" or "USA". Now collects all places and also gathers from person/event records.

- **GEDCOM source notes and properties not importing** ([#260](https://github.com/banisterious/obsidian-charted-roots/issues/260)): Source notes stored as references (`@N001@`) were not resolved to actual text content. Also added `gedcom_id` property for traceability, consistent `repository` property name, and source type inference matching Gramps importer.

---

## [0.20.7] - 2026-02-08

### Fixed

- **Data Quality tools missing from Control Center** ([#256](https://github.com/banisterious/obsidian-charted-roots/issues/256)): Errors in the Research Needed section could prevent the rest of the Data Quality tab from rendering. Added error handling to ensure vault-wide analysis, batch operations, and data tools always appear.

- **Marriage location not saved as wikilink** ([#255](https://github.com/banisterious/obsidian-charted-roots/issues/255)): When selecting a place from the picker for marriage location, now saves both the wikilink format and the `spouse{n}_marriage_location_id` property for reliable resolution.

---

## [0.20.6] - 2026-02-07

### Added

- **Needs-research tagging** ([#230](https://github.com/banisterious/obsidian-charted-roots/issues/230)): Flag person, event, or place notes for additional research using the `needs_research` frontmatter property. Supports multiple research questions per entity.
  - **"Research needed" card** in Data Quality tab shows all entities flagged for research with clickable links and question badges
  - **Command palette command** "Add research question to current note" opens a modal to add questions to the active person/event/place note
  - Part of Phase 2 of the GPS Research Workflow Integration

---

## [0.20.5] - 2026-02-07

### Changed

- **GEDCOM import no longer adds placeholder descriptions** ([#250](https://github.com/banisterious/obsidian-charted-roots/issues/250)): Events imported from GEDCOM without a description now have an empty description field instead of "Imported from GEDCOM", reducing timeline clutter.

- **Wikidata place lookup now uses Obsidian's locale**: Place searches via Wikidata now respect the user's Obsidian language setting instead of hardcoded English. Dutch users will see Dutch place names, German users will see German names, etc. Falls back to English when translations are unavailable.

### Fixed

- **Bidirectional linker adding relationship fields to non-person files** ([#253](https://github.com/banisterious/obsidian-charted-roots/issues/253)): When linking family relationships, the sync methods now verify that target files have a `cr_id` before adding relationship properties. Previously, any file matching the link target could receive unexpected frontmatter fields.

- **Partial matching in relationship removal causing unintended deletions** ([#253](https://github.com/banisterious/obsidian-charted-roots/issues/253)): The `removeFromArrayField` method used substring matching (`includes()`) which could match "John" inside "Johnny". Now uses exact wikilink target/display name matching to prevent accidental removal of similarly-named entries.

---

## [0.20.4] - 2026-02-05

### Changed

- **Standardized border-radius with CSS variables** ([#248](https://github.com/banisterious/obsidian-charted-roots/pull/248), thanks @Julschik): Added `--cr-radius-xs/sm/md/lg` design tokens and replaced 295 hardcoded border-radius values across the codebase. No visual changes; this improves maintainability for future theming.

- **Consolidated duplicate spinner animations** ([#247](https://github.com/banisterious/obsidian-charted-roots/pull/247), thanks @Julschik): Merged 5 duplicate `@keyframes` definitions into a single shared `cr-spin` animation in base.css. No visual changes.

### Fixed

- **GEDCOM event notes causing malformed frontmatter** ([#249](https://github.com/banisterious/obsidian-charted-roots/issues/249)): The previous fix placed note text in the frontmatter description field, which broke YAML parsing for multi-line content and prevented events from appearing on timelines. Notes are now placed in a separate "Notes" section in the body.

---

## [0.20.3] - 2026-02-04

### Changed

- **Visual distinction for place markers on Map View** ([#164](https://github.com/banisterious/obsidian-charted-roots/issues/164)): Place markers now use hollow circles and render below event markers, making it easier to distinguish context (places) from primary data (events) when both layers are enabled.

### Fixed

- **Event notes not imported from GEDCOM** ([#249](https://github.com/banisterious/obsidian-charted-roots/issues/249)): Event-level NOTE tags that referenced shared note records were showing the reference code instead of the actual note text.

---

## [0.20.2] - 2026-02-03

### Added

- **Dockable views section on Dashboard** ([#243](https://github.com/banisterious/obsidian-charted-roots/issues/243)): A new "Dockable views" section on the Dashboard tab provides a tile grid for quick access to all 9 sidebar views (People, Places, Events, Sources, Organizations, Relationships, Universes, Collections, Data Quality).

### Changed

- **Dock buttons always visible** ([#243](https://github.com/banisterious/obsidian-charted-roots/issues/243)): The dock buttons on Control Center card headers are now always visible (subtle 60% opacity) rather than requiring hover to discover them.

- **Removed unused d3-dag dependency** ([#244](https://github.com/banisterious/obsidian-charted-roots/pull/244), thanks @Julschik): The `d3-dag` package was listed in dependencies but never imported. Removing it reduces bundle size.

- **Improved type safety for place lookup** ([#245](https://github.com/banisterious/obsidian-charted-roots/pull/245), thanks @Julschik): Removed an unnecessary `as any` type cast in the place lookup flow.

---

## [0.20.1] - 2026-01-31

### Fixed

- **Sources dockable view stuck on "Loading sources..."** ([#241](https://github.com/banisterious/obsidian-charted-roots/pull/241), thanks @prentissw): The `renderSourcesList` function was passing the wrong arguments to the `SourceService` constructor, preventing the Sources view from loading.

- **Media not rendering for filenames with commas** ([#238](https://github.com/banisterious/obsidian-charted-roots/issues/238), thanks @jeff962): Unquoted wikilinks containing commas (e.g., `[[Marvick, Jeanne.JPG]]`) were silently dropped because YAML splits the filename on the comma into separate array elements. Media parsing now rejoins these fragments to reconstruct the original filename.

---

## [0.20.0] - 2026-01-30

### Added

- **Control Center modularization — Phase 1** ([#239](https://github.com/banisterious/obsidian-charted-roots/discussions/239)): Extracted all embedded tabs from the monolithic `control-center.ts` (13,760 lines) into independent component files, reducing the modal shell to ~1,451 lines (89% reduction). Each tab follows a consistent `render*Tab()` pattern with typed options interfaces.

- **Control Center modularization — Phase 2: Dockable sidebar views** ([#240](https://github.com/banisterious/obsidian-charted-roots/discussions/240)): Nine entity browsing tabs can now be opened as persistent, dockable workspace views in the sidebar. Views include filter/sort/search controls, context menus, and auto-refresh on vault changes. State (filters, search, sort) persists across sessions.
  - **People** — filterable/sortable person list with expandable details
  - **Places** — place notes with category badges and coordinates
  - **Events** — timeline table with type/person/date filters
  - **Sources** — sources list with type and confidence badges
  - **Organizations** — organizations with type badges and member counts
  - **Relationships** — relationship table with type/category filters
  - **Universes** — universe list with status badges and entity counts
  - **Collections** — browse mode switcher (all people / detected families / user collections)
  - **Data quality** — read-only dashboard with research gaps, source conflicts, and auto-running vault-wide analysis with quality score, completeness metrics, and filterable issues

- **Dock buttons on Control Center cards** ([#240](https://github.com/banisterious/obsidian-charted-roots/discussions/240)): Hovering over a dockable card header reveals a sidebar icon that opens (or focuses) the corresponding dockable view. The modal stays open so users can dock multiple views in one session.

- **Relationships tab enhancements** ([#240](https://github.com/banisterious/obsidian-charted-roots/discussions/240)): The Relationships tab now has filter dropdowns (by type, category, person), sort options, pagination with load-more, and context menus on rows.

### Changed

- **Control Center reduced from 17 to 14 tabs**: Removed legacy redirect tabs (Status, Guide, Statistics) that were superseded by the Dashboard tab.

### Fixed

- **Avatars not showing on family chart** ([#238](https://github.com/banisterious/obsidian-charted-roots/issues/238)): Media references in frontmatter that were stored as Obsidian Link objects or nested arrays (from unquoted wikilinks in YAML) were silently dropped when resolving avatars. The family chart, place graph, and organization service now handle all media property formats consistently with the media code block renderer.

---

## [0.19.22] - 2026-01-28

### Fixed

- **Drag-to-reorder broken in editable media blocks** ([#236](https://github.com/banisterious/obsidian-charted-roots/issues/236)): In `canvas-roots-media` blocks with `editable: true`, dragging images to reorder them stopped working after the lightbox fix in v0.19.19. Drag-and-drop now works correctly again.

- **Schema validation including non-person notes** ([#237](https://github.com/banisterious/obsidian-charted-roots/issues/237)): When using the "All people" scope, schema validation was incorrectly including events, sources, places, and other entity types that use `cr_type` instead of the deprecated `type` property. Now uses proper note type detection to validate only person notes.

---

## [0.19.21] - 2026-01-26

### Added

- **Media gallery context menu** ([#234](https://github.com/banisterious/obsidian-charted-roots/issues/234)): Right-click images in `canvas-roots-media` blocks to access "Open in Obsidian" (enables compatibility with plugins like Image Metadata) and "Open in new tab" options.

### Fixed

- **Gramps import using wrong birth/death dates** ([#233](https://github.com/banisterious/obsidian-charted-roots/issues/233)): When importing from Gramps, if a person appeared in multiple birth events (their own birth plus others' births where they were a parent or witness), the wrong date could be imported. Now correctly preserves the person's own birth/death data.

- **Extract events from source creates broken source link** ([#235](https://github.com/banisterious/obsidian-charted-roots/issues/235)): When creating events via "Extract events from source", the source link was using the slugified filename instead of the source's display title, resulting in broken wikilinks.

---

## [0.19.20] - 2026-01-24

### Changed

- **Event icon display mode option names** ([#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)): Renamed setting options for clarity: "Text label", "Icon (with tooltip)", and "Icon with label".

### Fixed

- **Custom organization types not shown in statistics** ([#225](https://github.com/banisterious/obsidian-charted-roots/issues/225)): Organizations with custom types now appear in the Organizations tab statistics breakdown.

- **Icon-only mode removed event verb from timeline sentences** ([#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)): In dynamic block timelines (`charted-roots-timeline`), icon-only mode now correctly keeps the event type verb in the sentence (e.g., "🎂 1850 — Born in Springfield" instead of "🎂 1850 — in Springfield").

- **Members disappearing after edit in Manage Members modal** ([#226](https://github.com/banisterious/obsidian-charted-roots/issues/226)): Improved cache synchronization to properly wait for Obsidian's metadata cache to update before refreshing the member list. Previously used an arbitrary 100ms delay which was insufficient on some systems.

---

## [0.19.19] - 2026-01-24

### Added

- **Edit organization context menu** ([#225](https://github.com/banisterious/obsidian-charted-roots/issues/225)): Added "Edit organization..." action to the right-click context menu in the Organizations tab.

- **PDF table formatting options** ([#228](https://github.com/banisterious/obsidian-charted-roots/issues/228)): Added two new PDF export options to improve table readability across page breaks:
  - "Keep table rows together" prevents rows from breaking across pages
  - "Repeat table headers" shows the header row again when a table continues on a new page

- **Footnote preservation in exports** ([#227](https://github.com/banisterious/obsidian-charted-roots/issues/227)): Obsidian reference-style footnotes (`[^1]` markers with `[^1]: content` definitions) are now preserved when exporting reports:
  - ODT exports render true document footnotes using `<text:note>` elements
  - PDF exports collect footnotes as endnotes in a "Notes" section at the document end

- **Research report export** ([#229](https://github.com/banisterious/obsidian-charted-roots/issues/229)): Export markdown research report notes as formatted PDF or ODT documents. Unlike other reports that generate content from structured data, this takes an existing markdown note (identified by `cr_type: research_report` frontmatter) and renders it with professional formatting:
  - Converts markdown headings, lists, tables, and inline formatting
  - Preserves footnotes (endnotes in PDF, document notes in ODT)
  - Supports cover pages and custom titles
  - Available in Report Wizard under the "Research" category

### Fixed

- **Custom organization types fully fixed** ([#225](https://github.com/banisterious/obsidian-charted-roots/issues/225)): Complete fix for custom organization types. The previous fix only addressed display; this resolves the root cause where custom types were being replaced with "Other" when loading organization data from notes.

- **File explorer Edit organization action** ([#225](https://github.com/banisterious/obsidian-charted-roots/issues/225)): The "Edit organization" context menu action in the file explorer now correctly opens in edit mode instead of create mode.

- **Membership data corruption when editing** ([#226](https://github.com/banisterious/obsidian-charted-roots/issues/226)): Fixed frontmatter corruption that occurred when editing organization memberships. Editing a member's role or dates no longer creates orphaned entries, duplicates, or malformed YAML arrays.

- **Media lightbox causing mode switch** ([#232](https://github.com/banisterious/obsidian-charted-roots/issues/232)): Fixed an issue where clicking images in `canvas-roots-media` code blocks would switch the note from Reading mode to Source/Edit mode. The lightbox now restores Reading mode when closed.

---

## [0.19.18] - 2026-01-23

### Added

- **Map-place universe sync** ([#223](https://github.com/banisterious/obsidian-charted-roots/issues/223)): When linking an existing place to a custom map via context menu, the plugin now automatically assigns the map's universe to that place. If the place already belongs to a different universe, a confirmation dialog offers options to add the new universe (for crossover scenarios), replace the existing one, or cancel.

- **Organization member management** ([#226](https://github.com/banisterious/obsidian-charted-roots/issues/226)): Manage organization memberships directly from the Organizations tab via a new "Manage members" context menu action. Features include:
  - Multi-select person picker for bulk member addition
  - Inline editing of membership details (role, date joined, date left)
  - Remove members with confirmation dialog
  - Real-time list updates after changes

### Fixed

- **Custom organization types not working** ([#225](https://github.com/banisterious/obsidian-charted-roots/issues/225)): Organizations with custom types were not appearing in the Control Center, and custom types were missing from the Edit Organization modal dropdown. Both issues are now fixed.

---

## [0.19.17] - 2026-01-20

### Added

- **Unified place lookup** ([#218](https://github.com/banisterious/obsidian-charted-roots/issues/218)): Look up place information from external geographic databases when creating place notes.
  - Search Wikidata, GeoNames, and OpenStreetMap/Nominatim for place data
  - Auto-populate coordinates, place type, and administrative hierarchy
  - Source selection chips to choose which databases to query
  - "Look up place" button in Create Place modal header
  - Command palette command "Look up place" for standalone searches
  - Rate limiting respects API usage policies (1 req/sec for Nominatim/GeoNames)
  - GeoNames requires free username registration; Wikidata and OpenStreetMap work immediately

### Fixed

- **Crash with nested YAML in frontmatter** ([#221](https://github.com/banisterious/obsidian-charted-roots/issues/221)): Plugin no longer crashes with `value.startsWith is not a function` when frontmatter contains nested objects in relationship fields (e.g., legacy formats with `Father: { Name: "[[...]]", Born: ... }`). Non-string values are now gracefully skipped.

---

## [0.19.16] - 2026-01-19

### Added

- **Person roles in sources** ([#219](https://github.com/banisterious/obsidian-charted-roots/issues/219)): Track the roles people play in source documents (principal, witness, informant, official, etc.) to support FAN network research and information quality assessment.
  - Seven canonical role categories: `principals`, `witnesses`, `informants`, `officials`, `enslaved_individuals`, `family`, `others`
  - Inline YAML notation: `"[[Person|Person (Role details)]]"` for readability
  - Dynamic block `charted-roots-source-roles` renders a role table with person links
  - Right-click context menu on source notes to insert the roles block
  - Modal UI in Create/Edit Source to assign roles when linking people
  - New "Sources by role" report in Control Center showing all sources where a person appears, with grouping by role, source, or chronological order

### Fixed

- **Timeline icon baseline alignment** ([#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)): Event type icons in dynamic timeline blocks now align properly with the text baseline instead of appearing slightly above or below the surrounding text.

---

## [0.19.15] - 2026-01-18

### Added

- **Event type icons for visual views** ([#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)): A new "Event icon display mode" setting lets you show Lucide icons for event types in timelines and map popups. Choose from three modes:
  - **Text only** (default): Current behavior with text labels
  - **Icon only**: Icons with tooltips on hover
  - **Icon and text**: Both icon and text label

  Icons appear in person/family/place timelines (Control Center), dynamic timeline blocks (`canvas-roots-timeline`), and map marker popups. Each event type uses its defined icon and color.

- **Create event context menu action**: Right-clicking the Events folder now shows "Create event" in the Charted Roots submenu, matching the pattern for People and Places folders.

### Changed

- **Statistics label update** ([#216](https://github.com/banisterious/obsidian-charted-roots/issues/216)): Renamed "Sex distribution" to "Sex & gender distribution" in Control Center statistics to better reflect the data being displayed.

### Fixed

- **Universe notes counted as people in statistics** ([#214](https://github.com/banisterious/obsidian-charted-roots/issues/214)): Universe notes with `cr_id` were incorrectly appearing in the People list and statistics. They are now properly excluded like other non-person entity types.

- **gender_identity property not recognized** ([#215](https://github.com/banisterious/obsidian-charted-roots/issues/215)): The `gender_identity` frontmatter property is now recognized in Sex & Gender Distribution statistics, in addition to `sex` and `gender`.

- **Places tab showing error count without listing errors** ([#213](https://github.com/banisterious/obsidian-charted-roots/issues/213)): The Data Quality card in the Places tab could show an issue count (e.g., "3 issues found") without displaying the corresponding issue sections. This occurred when orphan place issues were counted using one set of criteria but displayed using stricter filtering.

- **Media gallery not displaying after GEDCOM import** ([#202](https://github.com/banisterious/obsidian-charted-roots/issues/202)): Media wikilinks imported from GEDCOM were written to YAML without quotes (e.g., `- [[photo.jpg]]`), causing YAML to parse them as nested arrays instead of strings. The GEDCOM importer now properly quotes wikilinks in arrays, and the media renderer handles both properly quoted strings and malformed nested arrays for backward compatibility with existing notes.

- **Kinship labels persisting during chart navigation** ([#195](https://github.com/banisterious/obsidian-charted-roots/issues/195)): Relationship labels (like "Spouse" and "Parent") would remain floating in incorrect positions after any action that caused the family tree to shift or rearrange, including clicking on relatives in the info panel, using the navigation buttons on cards, or adjusting tree spacing. Labels now properly clear before chart movement and reappear in correct positions after animation completes.

- **Data quality not respecting cr_living property** ([#217](https://github.com/banisterious/obsidian-charted-roots/issues/217)): People marked as living with `cr_living: true` were still appearing in the "Missing Death Dates" list in the Data Quality section. The check now correctly respects the living status property.

---

## [0.19.14] - 2026-01-17

### Added

- **Multi-spouse visual cues in family chart** ([#195](https://github.com/banisterious/obsidian-charted-roots/issues/195)): When a person has multiple spouses, circled numbers (①②③...) now appear on spouse connection lines to indicate marriage order. This clarifies who the "hub" person is in complex family structures. Enable via "Show kinship labels" in the chart toolbar. Works in PNG, SVG, and PDF exports.

- **Per-spouse marriage metadata** ([#204](https://github.com/banisterious/obsidian-charted-roots/issues/204)): Edit Person modal now supports per-spouse marriage metadata with progressive disclosure. Click the calendar icon next to any spouse to expand and enter marriage date, location, status (current/divorced/widowed/separated/annulled), and divorce date. When metadata is present, the indexed property format (`spouse1`, `spouse1_marriage_date`, etc.) is used; otherwise the legacy array format is preserved.

### Improved

- **Settings tab UX**: All sections now start collapsed, and toggling settings that trigger a re-render no longer resets section state or scroll position.

- **Create Person modal UX** ([#209](https://github.com/banisterious/obsidian-charted-roots/issues/209)): Reduced modal length with inline expansion for optional sections (DNA, step/adoptive parents, sources), moved birth/death fields higher, and added a sticky footer so action buttons stay visible while scrolling.

### Fixed

- **Bidirectional relationship normalization bugs** ([#210](https://github.com/banisterious/obsidian-charted-roots/issues/210)): The "Fix bidirectional relationship inconsistencies" operation now respects gender-neutral parents, adoptive relationships, and custom relationship types instead of incorrectly normalizing them to mother/father.

- **Media gallery crash on non-string values** ([#202](https://github.com/banisterious/obsidian-charted-roots/issues/202)): The `canvas-roots-media` block no longer crashes with "value.trim is not a function" when the frontmatter `media` property contains non-string values.

---

## [0.19.13] - 2026-01-16

### Added

- **GEDCOM media import** ([#202](https://github.com/banisterious/obsidian-charted-roots/issues/202)): Import media references (OBJE records) from GEDCOM files with full parity to Gramps media handling:
  - Parses top-level OBJE records and inline media on individuals, families, sources, and events
  - Resolves external file paths to vault wikilinks (filename-only by default)
  - Optional path prefix stripping for complex folder structures
  - Live preview in import wizard showing path → wikilink mappings
  - Validates files exist in vault and reports missing media after import
  - Adds `media` property to person and event frontmatter

### Fixed

- **Research coverage badge not showing in People tab** ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145)): When "Enable fact-level source tracking" is enabled in settings, the research coverage badge now appears in the Control Center's People tab, showing what percentage of facts are sourced for each person.

- **Create Family wizard creating duplicates for existing people** ([#208](https://github.com/banisterious/obsidian-charted-roots/issues/208)): When building a family around existing person notes, the wizard now correctly links them instead of creating duplicate notes. The review step now shows separate lists for "New notes to create" and "Existing notes to link", with appropriate button labeling. Also fixed an issue where linking all-existing people would fail with "No people to create".

---

## [0.19.12] - 2026-01-15

### Added

- **Census event type** ([#205](https://github.com/banisterious/obsidian-charted-roots/issues/205)): Added `census` as a built-in event type with proper icon and styling. Gramps census events are now correctly imported as `event_type: census` instead of `custom`.

### Fixed

- **Gramps event description not used as title** ([#206](https://github.com/banisterious/obsidian-charted-roots/issues/206)): When importing events from Gramps, the event's description/designation field is now used as the event title. If no description exists, the title is auto-generated as before (e.g., "Birth of John Smith").

- **Proof summaries appearing in people list** ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145)): Fixed two issues with proof summary notes: (1) Create Proof Summary modal now generates `cr_type: proof_summary` instead of the non-standard `type: proof_summary`, and (2) proof summaries with `cr_id` but no explicit type are no longer incorrectly detected as person notes.

- **Surname drill-down not using explicit surnames** ([#174](https://github.com/banisterious/obsidian-charted-roots/issues/174)): When clicking a surname in the Statistics Dashboard to see matching people, only parsed surnames from names were matched. Now the drill-down uses `extractSurnames()` for consistency with counting, properly matching people with explicit `surnames`, `maiden_name`, or parsed surnames.

- **Birth/death events appearing on wrong person's timeline** ([#183](https://github.com/banisterious/obsidian-charted-roots/issues/183)): When a person appeared in an event's `persons` array (as a participant, witness, or family member), that event incorrectly appeared on their timeline. Now birth, death, baptism, christening, and funeral events only appear on the timeline of the principal (the person in the singular `person` field). This prevents parents from seeing their child's birth as their own, or family members from seeing a relative's death on their timeline.

- **Birth/death event notes not linking from timeline** ([#207](https://github.com/banisterious/obsidian-charted-roots/issues/207)): Gramps-imported birth/death events now properly set the `person` field for the principal, allowing them to appear on the correct person's timeline. For backwards compatibility, events without a `person` field will use the first entry in the `persons` array as the principal.

---

## [0.19.11] - 2026-01-15

### Added

- **Research workflow entity types (Phase 1)** ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145)): Foundation for GPS-aligned research workflow tracking. Adds five new entity types: `research_project`, `research_report`, `individual_research_note`, `research_journal`, and `research_log_entry`. These can be identified via `cr_type` frontmatter or tags like `#research-project` or `#irn`. A new "Research entities" section in the Statistics Dashboard shows counts by type with status breakdowns (e.g., projects in-progress vs completed, reports draft vs published).

---

## [0.19.10] - 2026-01-15

### Added

- **Surnames column in People base** ([#174](https://github.com/banisterious/obsidian-charted-roots/issues/174)): The surnames property is now available as a column in the People base template for sorting and display.

### Fixed

- **Data quality inconsistencies** ([#200](https://github.com/banisterious/obsidian-charted-roots/issues/200)): "Orphaned people" now correctly excludes those with adoptive parents, step parents, gender-neutral parents, or children. Organizations are no longer counted as people. The "non-biological parents only" metric now includes gender-neutral adoptive parents.

- **Duplicate adopted child nodes in family chart** ([#201](https://github.com/banisterious/obsidian-charted-roots/issues/201)): When both directions of an adoptive relationship were specified (parent has `adopted_child` and child has `adoptive_parent`), duplicate child nodes appeared in the family chart view.

- **"Add essential place properties" ignores default category setting** ([#199](https://github.com/banisterious/obsidian-charted-roots/issues/199)): The context menu command now respects the "Default Place Category" setting instead of always defaulting to "real".

---

## [0.19.9] - 2026-01-14

### Added

- **DNA match tracking** ([#126](https://github.com/banisterious/obsidian-charted-roots/issues/126)): Opt-in DNA match tracking for genetic genealogy workflows. Enable via Settings → Advanced → DNA tracking:
  - **DNA Match person type**: Select "DNA Match" when creating persons to mark them as genetic matches
  - **DNA Information fields**: Track shared cM, testing company, kit ID, match type (BKM/BMM/confirmed/unconfirmed), endogamy flag, and notes in Edit Person modal
  - **DNA Match relationship**: New `dna_match` relationship type with bidirectional syncing (adding A→B automatically creates B→A)
  - **DNA badge in person picker**: Shows flask icon and shared cM value for DNA matches
  - All DNA features are invisible when setting is disabled (default: OFF)

- **Repair missing relationship IDs** ([#197](https://github.com/banisterious/obsidian-charted-roots/issues/197)): New batch operation in Control Center → Data Quality to populate missing `_id` fields from resolvable wikilinks. This improves relationship reliability when notes are renamed:
  - Detects wikilinks without corresponding `_id` fields (e.g., `father` without `father_id`)
  - Resolves wikilinks to their `cr_id` values using the person index
  - Preview shows all repairs with warnings for unresolvable wikilinks (broken links, ambiguous targets, or targets missing cr_id)
  - Supports both single-value and array fields (e.g., `children`, `spouse`)

### Fixed

- **Legacy command IDs not working**: Fixed UI buttons in Control Center tabs (People, Places, Events, Organizations, Sources) that were still using the old `canvas-roots:` command prefix instead of `charted-roots:`, causing "Create base" and similar actions to fail silently.

---

## [0.19.8] - 2026-01-14

### Fixed

- **Name components not saving in Edit Person modal** ([#174](https://github.com/banisterious/obsidian-charted-roots/issues/174)): Name component fields (given name, surnames, maiden name, married names) were not being written to frontmatter when editing existing person notes. The fields displayed correctly when reading but changes were not persisted.

- **GEDCOM import freezing on large imports** ([#193](https://github.com/banisterious/obsidian-charted-roots/issues/193)): Added periodic event loop yielding during all import phases (sources, notes, people, relationships, events) to prevent UI freezing. Also added safety limits (max 1000 iterations) to duplicate filename detection loops and optimized place cache building to only scan the places folder instead of all vault files.

- **Source linking via Edit Person uses wrong folder** ([#196](https://github.com/banisterious/obsidian-charted-roots/issues/196)): When linking a source via Edit Person modal, the wikilink now uses the file's basename instead of the frontmatter title. Previously, if the filename differed from the title, clicking the link would create a new file in the vault root instead of opening the existing source.

---

## [0.19.7] - 2026-01-13

### Added

- **Name components support** ([#174](https://github.com/banisterious/obsidian-charted-roots/issues/174), [#192](https://github.com/banisterious/obsidian-charted-roots/issues/192)): Explicit name component properties in frontmatter for multi-surname cultures and maiden/married name tracking:
  - `given_name`: First/given name(s) - populated from GEDCOM GIVN tag
  - `surnames`: Array of surnames - supports Hispanic, Portuguese, and other multi-surname naming conventions
  - `maiden_name`: Birth surname (already existed with aliases)
  - `married_names`: Array of married surnames - supports multiple marriages
  - Statistics Top Surnames now counts all surnames in the array
  - Split Wizard matches against all surname variants (maiden name, married names, explicit surnames)
  - GEDCOM import writes `given_name` and `surnames` from GIVN/SURN tags
  - GEDCOM export writes name components to GIVN/SURN tags
  - Create/Edit Person modal includes fields for all name components

### Fixed

- **Family chart shows wrong person when root is filtered** ([#191](https://github.com/banisterious/obsidian-charted-roots/issues/191)): When opening a family chart for a person excluded by the folder filter, the chart now shows a helpful notice instead of silently displaying an unrelated entity.

---

## [0.19.6] - 2026-01-12

### Added

- **Per-map place filtering** ([#153](https://github.com/banisterious/obsidian-charted-roots/issues/153)): Places can now be restricted to specific custom maps within the same universe. Add a `maps` property to place notes with an array of map IDs to control which maps the place appears on. Places without a `maps` property continue to appear on all maps in their universe (backward compatible). The Create/Edit Place modal includes a "Restrict to maps" section with checkboxes for available maps. When creating a place by right-clicking on a custom map, the current map is auto-selected.

### Fixed

- **Map view not opening from Control Center** ([#188](https://github.com/banisterious/obsidian-charted-roots/issues/188)): Fixed command ID prefix in Control Center that prevented the map view from opening when clicked.

- **Duplicate nodes in canvas trees with pedigree collapse** ([#186](https://github.com/banisterious/obsidian-charted-roots/issues/186)): Persons appearing in multiple ancestry paths (e.g., when siblings marry into the same family) now display as a single node with edges from both paths converging to it.

- **Custom relationship edge colors on canvas trees** ([#185](https://github.com/banisterious/obsidian-charted-roots/issues/185)): Custom relationships that map to standard family tree connections (e.g., a "Godparent" relationship mapped to Parent) now display with their configured color and line style on canvas trees. Previously these relationships appeared correctly but used the default parent or spouse edge color instead of the custom color.

---

## [0.19.5] - 2026-01-12

### Added

- **GEDCOM notes import** ([#179](https://github.com/banisterious/obsidian-charted-roots/issues/179)): GEDCOM NOTE tags attached to individuals are now imported and appended to person notes. Features include:
  - Inline notes (text directly in NOTE tag)
  - Multi-line notes with CONT/CONC continuation
  - Referenced notes (shared NOTE records via @N001@ references)
  - Optional import toggle in import wizard (Step 3 → Entity types → Notes)
  - Notes appear in "## Notes" section with "### GEDCOM note" headers
  - Optional "Create separate note files" toggle creates individual note entity files instead of embedding content, matching Gramps importer behavior

- **Large import mode** ([#180](https://github.com/banisterious/obsidian-charted-roots/issues/180)): New toggle in import wizard (Step 3 → Performance) that suspends relationship syncing during import to prevent file system timeouts on large imports (500+ people). Shows notices when activated and when import completes.

### Changed

- **Flat membership format** ([#181](https://github.com/banisterious/obsidian-charted-roots/issues/181)): Organization memberships now use parallel arrays (`membership_orgs`, `membership_org_ids`, `membership_roles`, `membership_from_dates`, `membership_to_dates`, `membership_notes`) instead of nested objects. This improves compatibility with Obsidian's Properties editor and Dataview queries. Legacy formats are still read but new memberships save in the flat format. A Data Quality check and bulk migration action are available for converting existing notes.

### Fixed

- **Membership YAML array formatting**: Fixed YAML serialization for organization memberships where the hyphen appeared on a separate line from the first property. Now produces standard YAML format with the first property on the same line as the hyphen.

- **Edit Organisation overwrites frontmatter** ([#182](https://github.com/banisterious/obsidian-charted-roots/issues/182)): The Edit Organisation modal now preserves existing frontmatter properties instead of overwriting them. Previously, any custom properties added to organisation notes would be lost when editing.

### Enhanced

- **Timeline description display for all event types** ([#157](https://github.com/banisterious/obsidian-charted-roots/issues/157)): Timeline now shows event descriptions for all event types (census, custom, occupation, residence, etc.) when a description exists, instead of showing the generic event title. For example, a census event displays "Census: 1850 Federal Census" instead of "Census of John Smith". Birth and death events continue to show the full title with the person's name since that's more meaningful for those life events. Related: [#183](https://github.com/banisterious/obsidian-charted-roots/issues/183) for birth event role filtering.

---

## [0.19.4] - 2026-01-11

### Changed

- **Settings consolidated to Plugin Settings** ([#176](https://github.com/banisterious/obsidian-charted-roots/issues/176)): All settings have been moved from Control Center → Preferences to the standard Obsidian plugin settings location (Settings → Charted Roots). The Preferences tab has been removed from Control Center. Settings are now organized into 9 sections: Folders, Data & detection, Canvas & trees, Privacy & export, Dates & validation, Sex & gender, Places, Property & value aliases, and Advanced.

- **Statistics Dashboard reorganization**: The "Visual Trees" tab has been renamed to "Trees & reports" and now consolidates all output generation. Both "Generate Reports" (markdown reports) and "Visual Trees" (PDF tree exports) have been moved from Statistics to this tab. The Statistics view is now purely analytical, addressing user feedback that action wizards felt out of place among statistics.

### Added

- **Romantic relationship label preference** ([#167](https://github.com/banisterious/obsidian-charted-roots/issues/167)): New setting lets users choose between "Spouse" or "Partner" terminology throughout the UI. Located in Settings → Charted Roots → Sex & gender. This is a display preference only — frontmatter property names remain unchanged.

- **Edit current note command**: New command "Edit current note" opens the appropriate edit modal (person, place, or event) for the active note. Assign a hotkey in Settings → Hotkeys to quickly edit notes without navigating through the file menu. Reduces the friction of: 3-dot menu → Charted Roots → Edit.

### Fixed

- **Gramps import place hierarchy** ([#178](https://github.com/banisterious/obsidian-charted-roots/issues/178)): Gramps imports now create the full place hierarchy (country, state, county, city) just like GEDCOM imports. Previously only the leaf places were created. Parent places are now linked via `parent_place` and `parent_place_id` properties.

- **Custom relationship family tree integration**: The "Include on family trees" toggle for custom relationship types now works for all mapping options. Previously only "Parent" and "Step-parent" mappings were implemented. Now "Foster parent", "Adoptive parent", "Guardian", "Spouse", and "Child" mappings all properly add people to generated trees.

---

## [0.19.3] - 2026-01-10

### Added

- **Category-based place organization** ([#163](https://github.com/banisterious/obsidian-charted-roots/issues/163)): Places can now be automatically organized into category-based subfolders (e.g., `Places/Historical/`, `Places/Fictional/`). Enable in Settings → Preferences → "Use category-based subfolders". Features include:
  - **Automatic folder routing**: New places are stored in category-appropriate subfolders
  - **Edit with move prompt**: When changing a place's category, you're prompted to move the file
  - **Custom folder overrides**: Define custom subfolder paths for specific categories
  - **Data Quality check**: Detects places in wrong folders with bulk "Organize places" action
  - **Bulk migration modal**: Move multiple misplaced places at once

- **Timeline event description display** ([#157](https://github.com/banisterious/obsidian-charted-roots/issues/157)): For descriptive event types (occupation, residence, military, education), timelines now show "Type: description" instead of the generic title. Example: "1850 — Occupation: Farmer" instead of "Occupation of John Smith". This makes timeline entries more informative at a glance.

- **External ID preservation for import round-trip** ([#175](https://github.com/banisterious/obsidian-charted-roots/issues/175)): GEDCOM and Gramps imports now store the original source ID (`external_id`) and source type (`external_id_source`) in frontmatter. When exporting back to GEDCOM, original xref IDs (e.g., `@I0001@`) are preserved, enabling cleaner round-trip workflows with other genealogy software.

---

## [0.19.2] - 2026-01-10

### Fixed

- **GEDCOM import preserves partial date precision** ([#172](https://github.com/banisterious/obsidian-charted-roots/issues/172)): GEDCOM dates now preserve their original precision instead of being normalized to full ISO format. Year-only dates (`1850`) stay as `1850` instead of becoming `1850-01-01`. Month+year dates (`MAR 1855`) become `1855-03` instead of `1855-03-01`. Date qualifiers (`ABT`, `BEF`, `AFT`, `CAL`, `EST`) and ranges (`BET 1882 AND 1885`) are now preserved. This maintains source fidelity and prevents false precision in genealogical data.

### Enhanced

- **User-friendly date display formatting** ([#172](https://github.com/banisterious/obsidian-charted-roots/issues/172)): Qualified dates are now prettified throughout the UI. `ABT 1878` displays as "c. 1878", `BEF 1950` as "before 1950", `AFT 1880` as "after 1880", and `BET 1882 AND 1885` as "1882–1885". ISO partial dates like `1855-03` display as "Mar 1855". This formatting applies to person tables, person picker, timelines, tree previews, and visual tree exports.

- **Export round-trip for partial dates** ([#172](https://github.com/banisterious/obsidian-charted-roots/issues/172)): GEDCOM, Gramps, and GedcomX exporters now correctly handle partial dates and qualifiers. Dates like `ABT 1878` or `BET 1882 AND 1885` export in each format's expected structure, ensuring data round-trips cleanly without losing precision.

---

## [0.19.1] - 2026-01-10

### Fixed

- **MyHeritage GEDCOM whitespace-only line handling** ([#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)): Fixed preprocessing of MyHeritage GEDCOM files where tab-only lines between continuation fragments caused parse errors. Whitespace-only lines are now skipped entirely, allowing subsequent continuation content to be properly appended to the previous valid GEDCOM line.

### Enhanced

- **Async GEDCOM parsing for large files** ([#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)): Added async versions of GEDCOM parsing functions (`parseAsync`, `parseContentAsync`, `analyzeFileAsync`) that yield to the event loop periodically. This prevents UI freezing when importing large MyHeritage files (800KB+, 40K+ lines). The import wizard now uses async parsing with progress callbacks.

- **GEDCOM anonymization script**: Improved `tools/anonymize_gedcom.py` to explicitly strip BOM characters and warn about malformed early lines. Updated documentation to clarify that `0 HEAD` and `0 TRLR` records are preserved.

---

## [0.19.0] - 2026-01-09

### Changed

- **Plugin renamed from Canvas Roots to Charted Roots** ([#141](https://github.com/banisterious/obsidian-charted-roots/issues/141)): The plugin has been renamed to better reflect its broader genealogical visualization capabilities beyond Obsidian Canvas. The new name encompasses the Interactive Family Chart, Map View, Statistics Dashboard, PDF exports, and canvas tree generation.

### Added

- **Automatic vault migration**: On first load, the plugin automatically migrates existing vault data:
  - Canvas metadata: `plugin: 'canvas-roots'` → `plugin: 'charted-roots'`
  - Code blocks: `canvas-roots-timeline`, `canvas-roots-relationships`, `canvas-roots-media` → `charted-roots-*`
- **Backward compatibility**: Old protocol handlers (`canvas-roots-map`, `canvas-roots-timeline`) and command IDs continue to work via dual-registration

### Migration

- **BRAT users**: Update your BRAT configuration to use `banisterious/obsidian-charted-roots` instead of `banisterious/obsidian-canvas-roots`
- **Manual install users**: The plugin folder can remain as `canvas-roots` or be renamed to `charted-roots`
- **Settings**: All settings are preserved automatically

---

## [0.18.32] - 2026-01-09

### Added

- **Automatic wikilink resolution** ([#104](https://github.com/banisterious/obsidian-charted-roots/issues/104)): Wikilinks in relationship fields now automatically resolve to `cr_id` values. You can write `father: "[[John Smith]]"` without needing a separate `father_id` field — the plugin resolves the wikilink to the person's `cr_id` at graph-building time. Explicit `_id` fields still take precedence when present. If multiple person notes share the same basename (e.g., two "John Smith.md" files), resolution returns null and the ambiguity is surfaced in the Data Quality report.

- **Wikidata Place Web Clipper template** ([#166](https://github.com/banisterious/obsidian-charted-roots/issues/166)): Added AI-powered Web Clipper template for extracting place data from Wikidata. Auto-triggers on Wikidata Q-pages and extracts coordinates, place type, parent place, alternate names, administrative hierarchy, and Wikipedia links. Works seamlessly with enhanced staging promotion workflow.

### Enhanced

- **Staging promotion workflow** ([#165](https://github.com/banisterious/obsidian-charted-roots/issues/165)): Enhanced the promotion process to automatically assign `cr_id` to notes missing it, route notes to correct folders based on type (places to Places folder, events to Events folder, etc.), and remove clipper metadata on promotion. This ensures Web Clipper notes (like Wikidata places) are fully functional in Charted Roots immediately after promotion.

- **PersonIndexService integration** ([#104](https://github.com/banisterious/obsidian-charted-roots/issues/104)): RelationshipValidator and ProofSummaryService now use the centralized PersonIndexService for cr_id lookups, eliminating duplicate vault scanning and improving performance.

---

## [0.18.31] - 2026-01-08

### Added

- **GEDCOM anonymization tool**: Added `tools/anonymize_gedcom.py` script to help users create shareable test files when reporting GEDCOM import issues without exposing sensitive genealogical data. The script anonymizes names, places, dates, notes, and contact information while preserving GEDCOM structure and relationships for debugging. Supports `--keep-dates` and `--keep-places` flags for targeted debugging scenarios. See [Troubleshooting wiki](https://github.com/banisterious/obsidian-charted-roots/wiki/Troubleshooting#sharing-gedcom-files-for-debugging) for usage instructions.

### Fixed

- **Find a Grave Web Clipper templates** ([#155](https://github.com/banisterious/obsidian-charted-roots/issues/155)): Fixed URL trigger pattern to include HTTPS protocol for auto-selection. Fixed person name extraction to use `.bio-name` CSS selector instead of page title, removing unwanted "Grave - " prefix. Removed hardcoded path configuration to allow user customization.
- **Gramps event names include all participants** ([#156](https://github.com/banisterious/obsidian-charted-roots/issues/156)): Fixed Gramps import creating event titles with all participants instead of just the principal person. Event names were joining all participants with "and" (e.g., "Birth of Baby and Mother"). Now filters for participants with role="Primary", falling back to the first participant if no role is assigned. The frontmatter `persons` field still lists all participants for reference.
- **Create Place modal missing parent dropdown from Dashboard** ([#158](https://github.com/banisterious/obsidian-charted-roots/issues/158)): Fixed inconsistent UI in Create Place modal depending on entry point. When opened from Dashboard, the parent place dropdown was missing and showed only a text input. Now passes the required place graph services to enable the dropdown in both Dashboard and Places tab.
- **Dynamic blocks fail with 'value.startsWith is not a function' error** ([#160](https://github.com/banisterious/obsidian-charted-roots/issues/160)): Fixed timeline and relationships dynamic blocks crashing when config values contain commas inside wikilinks. The config parser was splitting all comma-containing values into arrays, breaking values like `[[Person Name|Alias]]` or `[[Place, City]]`. Now only splits on commas outside wikilink brackets.
- **Import Wizard Preview stuck on 'Parsing file...'** ([#161](https://github.com/banisterious/obsidian-charted-roots/issues/161)): Fixed Preview step getting stuck showing "Parsing file..." indefinitely. The `isParsing` flag was being cleared in the finally block after the UI re-render, causing the render to always see the loading state. Moved the flag reset before the render call so the parsed counts display properly.
- **Create Place modal doesn't recognize existing parent places** ([#162](https://github.com/banisterious/obsidian-charted-roots/issues/162)): Fixed modal prompting to create duplicate parent places even when they already exist. Two scenarios were broken: (1) When typing a parent name that exists as a grandparent, the stale place graph cache didn't reflect the newly created intermediate place, causing it to miss existing grandparents. Now reloads the cache before opening each parent modal. (2) When selecting an existing parent from the dropdown, the modal still prompted for creation because `pendingParentPlace` wasn't cleared. Now clears the pending parent flag in all dropdown selection cases.

### Documentation

- **Web Clipper Integration wiki**: Added section documenting potential future place templates (Wikidata, GOV) and clarifying which place sources are better suited for Web Clipper templates vs native plugin integration. Related to [#128](https://github.com/banisterious/obsidian-charted-roots/issues/128).
- **Unified Place Lookup planning document**: Created comprehensive planning document (`docs/planning/unified-place-lookup.md`) for native multi-source place lookup feature with detailed TypeScript implementation examples for PlaceLookupService, PlaceLookupModal, and integration with Create Place modal. Covers FamilySearch Places API, Wikidata, GeoNames, GOV, and Nominatim with automatic parent place hierarchy creation.
- **Place Data Sources research document**: Added reference document (`docs/research/place-data-sources.md`) comparing 5 genealogical place databases with API endpoints, authentication requirements, rate limits, use case recommendations for different research scenarios, and implementation priority guidance.

---

## [0.18.30] - 2026-01-08

### Added

- **Ambiguous wikilink detection in Data Quality** ([#104](https://github.com/banisterious/obsidian-charted-roots/issues/104)): The Data Quality report now detects when wikilinks in relationship fields (father, mother, spouse, children, etc.) match multiple files with the same basename. When multiple person notes share the same name (e.g., two "John Smith.md" files in different folders), wikilink references become ambiguous and cannot be resolved. The new check generates warnings (code: `AMBIGUOUS_WIKILINK`, category: relationship_inconsistency) suggesting users add `_id` fields (e.g., `father_id`) to disambiguate. This is part of Phase 3 of the wikilink-to-cr_id resolution implementation.

### Fixed

- **Infinite preprocessing loop in GEDCOM import** ([#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)): Fixed infinite loop causing repeated preprocessing during GEDCOM import. The import wizard Step 4 (Preview) was triggering concurrent calls to parseFileForPreview() because renders occurred while async parsing was still in progress. Added isParsing guard flag to prevent concurrent parsing attempts.

---

## [0.18.29] - 2026-01-07

### Fixed

- **Import wizard toggles can't be re-enabled** ([#154](https://github.com/banisterious/obsidian-charted-roots/issues/154)): Fixed bug where entity type toggles (People, Places, Sources, Events, etc.) in the import wizard couldn't be turned back on after being toggled off. The click handler captured the initial value in a closure instead of reading the current DOM state.
- **MyHeritage GEDCOM preprocessing creates invalid lines** ([#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)): Fixed "Invalid GEDCOM line format" parse error when importing large MyHeritage files. The preprocessor was converting `<br>` tags to actual newlines, which created lines without level numbers. Changed to replace `<br>` with spaces instead.

---

## [0.18.28] - 2026-01-07

### Added

- **MyHeritage GEDCOM compatibility** ([#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)): Automatically detect and fix MyHeritage GEDCOM export issues during import. MyHeritage exports contain UTF-8 BOM, double-encoded HTML entities (`&amp;lt;` instead of `<`), and `<br>` tags that prevent parsing. New preprocessing automatically detects MyHeritage files (via `1 SOUR MYHERITAGE` tag) and applies fixes. Three modes available in Settings → Import/Export: Auto (default, detect and fix), MyHeritage (always fix), None (disabled). Import results modal shows what was fixed.

### Fixed

- **Special character sanitization for all importers** ([#139](https://github.com/banisterious/obsidian-charted-roots/issues/139)): Extended relationship name sanitization to Gramps, CSV, and GedcomX importers. Previously only the GEDCOM importer sanitized names containing special characters like `"`, `()`, `[]`, `{}`. Now all importers use a shared `sanitizeName()` utility to ensure wikilinks in relationship fields (father, mother, spouse, stepparents, adoptive parents, children) match sanitized filenames, preventing "linked to person who doesn't exist" warnings.
- **Duplicate person filenames during batch import**: Fixed "File already exists" errors when importing multiple people with identical names (e.g., multiple "Son (stillborn)" entries). The vault index doesn't update fast enough between sequential file creations, causing race conditions. Solution: Track created paths in a Set and add retry logic with counter increment, matching the existing approach used for event notes.
- **Map view "Link existing place" crash** ([#151](https://github.com/banisterious/obsidian-charted-roots/issues/151)): Fixed error "createFolderFilterService is not a function" when using right-click → "Link existing place here" on maps. The code was calling non-existent factory methods on the plugin object. Solution: Import and instantiate `FolderFilterService` and `PlaceGraphService` directly.
- **Edit Place modal styling issues**: Fixed truncated labels (e.g., "Parent place" showing as "P...") and horizontal scrollbar in the Edit Place modal. Added CSS to prevent setting-item labels from shrinking and constrained dropdown widths.

---

## [0.18.27] - 2026-01-07

### Added

- **DMS coordinate format support** ([#121](https://github.com/banisterious/obsidian-charted-roots/issues/121)): Opt-in DMS (degrees, minutes, seconds) parsing for coordinate input in the place creation modal. When enabled via Settings → Data & detection → "Accept DMS coordinate format", users can enter coordinates like `33°51'08"N` or `33 51 08 N` and they automatically convert to decimal degrees. Supports symbol notation, space-separated, hyphen-separated, and direction prefix formats.
- **Create place context menu for folders** ([#152](https://github.com/banisterious/obsidian-charted-roots/issues/152)): Added "Create place" option to right-click context menu when clicking on the Places folder or any subfolder within it. Opens the Create Place modal with the target folder pre-selected as destination.
- **Link existing place to map location** ([#151](https://github.com/banisterious/obsidian-charted-roots/issues/151)): Added "Link existing place here" option to map right-click context menu. Opens a place picker to select an existing place note and updates its coordinates to the clicked location, then refreshes the map to show the marker.
- **Optional person names** ([#140](https://github.com/banisterious/obsidian-charted-roots/issues/140)): The name field is now optional when creating person notes, allowing placeholder persons to be created and filled in later. Useful for genealogy research where relationships are known before identities (e.g., "John's father" before learning his name). Unnamed persons display as "Unnamed" in the UI and trigger a data quality warning.
- **DNA match tracking - Phase 1** ([#126](https://github.com/banisterious/obsidian-charted-roots/issues/126)): Lightweight DNA match tracking for genetic genealogy workflows. Phase 1 adds documentation and templates only—no code changes required to core functionality. Includes: DNA match template snippet in the template snippets modal (with fields for shared cM, testing company, kit ID, match type, endogamy flag, and notes); "DNA Matches" view in the People Bases template (filters by dna_shared_cm, sorts by highest matches first); documented frontmatter properties (dna_shared_cm, dna_testing_company, dna_kit_id, dna_match_type, dna_endogamy_flag, dna_notes) for manual use.

### Fixed

- **Event edit modal deletes custom frontmatter properties** ([#150](https://github.com/banisterious/obsidian-charted-roots/issues/150)): Fixed editing events through the context menu deleting custom properties added via Templater or manually. The edit modal was rebuilding frontmatter from scratch, only preserving known properties. Solution: Switched to Obsidian's `processFrontMatter` API which safely updates only managed properties while preserving all others.
- **BCE date sorting in dynamic timeline blocks** ([#146](https://github.com/banisterious/obsidian-charted-roots/issues/146)): Fixed events spanning BCE/AD boundary sorting incorrectly in timeline codeblocks. The `extractYear` method only matched positive years, so "11 BCE" was extracted as "11" instead of "-11", causing it to appear after "14 AD". Now properly handles BCE/BC suffix, ISO negative years, and AD/CE suffix formats.

---

## [0.18.26] - 2026-01-07

### Fixed

- **BCE/AD date sorting in timelines** ([#146](https://github.com/banisterious/obsidian-charted-roots/issues/146)): Fixed incorrect chronological ordering of events spanning the BCE/AD boundary. Events with BCE dates (e.g., "11 BCE") now properly sort before AD dates (e.g., "14 AD"). Root cause: sort-order-service.ts used lexicographic string comparison which doesn't handle negative years correctly. Solution: Added compareDates() helper that extracts years numerically for proper chronological ordering.
- **Timeline place text whitespace collapse** ([#146](https://github.com/banisterious/obsidian-charted-roots/issues/146)): Fixed missing space between event title and place in dynamic timeline blocks. Browser was collapsing whitespace when MarkdownRenderer created block-level elements for wikilinks, causing "Marriage of Person Ain Place" instead of "Marriage of Person A in Place". Solution: Added non-breaking space (`\u00A0`) before "in" text to prevent whitespace collapse.
- **Wikilink resolution for names with special characters** ([#139](https://github.com/banisterious/obsidian-charted-roots/issues/139)): Fixed wikilink references breaking for relationship names containing quotes and other special characters. When importing from GEDCOM, filenames were sanitized to remove characters like `"()[]{}`, but relationship fields (father, mother, spouse, children, step-parents, adoptive parents) still contained the original unsanitized names. This caused wikilink mismatches where `[[Jane "Jennie" Smith]]` couldn't resolve to file `Jane Jennie Smith.md`. Solution: Extracted sanitization logic into dedicated `sanitizeName()` method and applied it consistently to all relationship name fields during import, ensuring wikilinks match actual filenames.
- **Pedigree chart PDF export artifacts** ([#148](https://github.com/banisterious/obsidian-charted-roots/issues/148)): Fixed raw markdown code block delimiters (` ``` `) appearing in PDF exports of pedigree charts. The fenced code blocks were used to preserve ASCII tree formatting in markdown but rendered as visible backticks in PDF output. Solution: Removed code block markers since Unicode box-drawing characters render properly without them in both markdown and PDF formats.
- **Unicode box-drawing characters invisible in PDF exports** ([#148](https://github.com/banisterious/obsidian-charted-roots/issues/148)): Fixed pedigree tree connectors (├──, └──, │) rendering as blank spaces in PDF exports while displaying correctly in markdown. Root cause: pdfmake doesn't properly handle Unicode glyphs missing from embedded fonts. Solution: Switched from RobotoMono to DejaVu Sans Mono fonts which provide comprehensive Unicode coverage including box-drawing characters. Added build-fonts.js script to bundle fonts into pdfmake's virtual file system.
- **Staging manager shows incorrect entity count** ([#149](https://github.com/banisterious/obsidian-charted-roots/issues/149)): Fixed "All" filter showing 0 total entities when clipped notes are present in staging. Root cause: staging-service.ts was missing `entityCounts.other` from the total calculation, so clipped notes (categorized as "other" type) weren't being counted. Solution: Added `entityCounts.other` to totalEntities calculation. Also removed confusing "Import Batches" terminology from UI and improved entity type breakdown visual alignment.

---

## [0.18.25] - 2026-01-05

### Added

- **Web Clipper Integration - Phase 1** ([#128](https://github.com/banisterious/obsidian-charted-roots/issues/128)):
  - Auto-detect clipped notes in staging folder (files with `clip_source_type`, `clipped_from`, or `clipped_date` properties)
  - Unified Dashboard "Staging" card shows breakdown: "3 clips (1 new), 1 other"
  - Toggle buttons in Staging Manager: [All] [Clipped] [Other] for filtering staging content
  - Multi-level filtering: stats, batches, and files filtered based on clipper metadata
  - Unread clip count resets when Staging Manager opens
  - Works with any user-created Web Clipper templates
  - Comprehensive wiki documentation with setup guide, template examples, workflow instructions, and troubleshooting

### Fixed

- Timeline event location spacing: fixed missing space between event links and location text (e.g., "Murder of Agrippina in Baiae")
- **Filename sanitization for special characters** ([#139](https://github.com/banisterious/obsidian-charted-roots/issues/139)): Strip parentheses and brackets from filenames to prevent wikilink errors (e.g., `Susan (Sue)` → `Susan Sue.md`). Fallback to `Unknown.md` when sanitization results in empty string

---

## [0.18.24] - 2026-01-04

### Added

- **Staging Management UI** ([#137](https://github.com/banisterious/obsidian-charted-roots/issues/137)):
  - New dedicated modal for managing staged imports with batch organization
  - View staging folder statistics: total files, batches, and potential duplicates
  - Expandable batch cards showing entity breakdown (people, places, sources, events, organizations)
  - Click batch headers to preview individual files before promoting
  - Per-batch actions: Check duplicates, Promote to main tree, Delete batch
  - Bulk actions: Promote all, Delete all staging data
  - Cross-import duplicate detection using name similarity (Levenshtein), date proximity, and gender matching
  - Access via Dashboard (yellow indicator when staging has data), Command palette, or Import Wizard success screen

### Changed

- **Staging settings consolidation**:
  - Moved "Staging isolation" toggle from Data settings to Preferences section
  - Renamed "Staging folder" setting label for clarity
- Removed Staging Area from Control Center Tools section navigation (still accessible via Dashboard, Command palette, and Import Wizard)

### Fixed

- **Event edit modal loses person link on save** ([#135](https://github.com/banisterious/obsidian-charted-roots/issues/135)):
  - Fixed bug where editing an event would silently remove the person link
  - The modal only checked the legacy `person:` property but events are now created with `persons:` array
  - Now properly loads person from `persons[0]` first, then falls back to `person` for compatibility

---

## [0.18.23] - 2026-01-04

### Added

- **Auto-exclude template folders from note discovery** ([#136](https://github.com/banisterious/obsidian-charted-roots/issues/136)):
  - Automatically detects and excludes template folders configured in core Templates, Templater, and QuickAdd plugins
  - Template files (containing Templater syntax like `<% tp.file.title %>`) no longer appear in person/place/event lists
  - New settings in Advanced section: toggle for auto-detection, info box showing detected folders, text area for additional folders
  - Changed built-in Templater snippets to leave `cr_id` empty (Charted Roots auto-generates when notes are indexed)

### Fixed

- **Gramps import hangs during gzip decompression** ([#134](https://github.com/banisterious/obsidian-charted-roots/issues/134)):
  - Fixed .gpkg and .gramps file imports hanging indefinitely when decompressing gzip data
  - Added 30-second timeout to `DecompressionStream` operations to prevent indefinite hanging
  - Changed .gramps file handling to use proper decompression utility instead of raw text read
  - Improved logging with progress details for decompression operations

---

## [0.18.22] - 2026-01-04

### Added

- **Privacy-aware canvas generation** ([#102](https://github.com/banisterious/obsidian-charted-roots/issues/102)):
  - New privacy options in Tree Wizard for canvas and Excalidraw generation
  - Living persons can be obfuscated with text nodes showing "Living", "Private", or initials
  - Text nodes include wikilink for navigation to the person's note
  - Choose between 'text' format (no file link) or 'file' format (keeps clickable link)
  - Preview step shows count of privacy-protected persons (e.g., "42 people · 5 privacy-protected")
  - Option follows global privacy setting by default, can be overridden per-generation
  - Supports 'hidden' privacy setting to completely exclude living persons from canvas

### Fixed

- **Adoptive relationships: duplicate nodes and missing children in family chart** ([#129](https://github.com/banisterious/obsidian-charted-roots/issues/129)):
  - Adopted children now appear when viewing family chart from adoptive parent's perspective
  - Fixed duplicate parent nodes when both `adoptive_parent` and `adopted_child` are set
  - Added bidirectional sync: `adopted_child` on parent now syncs to `adoptive_parent` on child
  - Descendant tree views now include adopted children

- **Gramps XML import hangs at "Parsing file..."** ([#130](https://github.com/banisterious/obsidian-charted-roots/issues/130)):
  - Fixed async/await bug in gzip decompression that caused the import wizard to hang indefinitely
  - The decompression stream writer operations were not being awaited, preventing the reader from completing

- **GEDCOM import: wikilinks point to wrong person when names are duplicated** ([#132](https://github.com/banisterious/obsidian-charted-roots/issues/132)):
  - When multiple people share the same name (e.g., father and child both named "George Hall"), wikilinks now correctly point to the right person's file
  - Previously, global string replacement caused all `[[George Hall]]` references to point to the same file
  - Now uses cr_id-targeted replacement to match each wikilink with its corresponding `_id` field

- **Gramps import: wikilinks point to wrong person when names are duplicated** ([#133](https://github.com/banisterious/obsidian-charted-roots/issues/133)):
  - Same fix as #132 applied to the Gramps XML importer
  - Affects .gramps and .gpkg file imports

---

## [0.18.21] - 2026-01-03

### Added

- **Private fields support** ([#98](https://github.com/banisterious/obsidian-charted-roots/issues/98)):
  - New `private_fields` frontmatter property to mark specific fields as private
  - Fields listed in `private_fields` will be excluded from exports (with user confirmation)
  - Common use cases: protecting deadnames (`previous_names`), medical notes, legal information
  - Added utility functions for private field filtering in export contexts

- **Export warnings for private fields** ([#99](https://github.com/banisterious/obsidian-charted-roots/issues/99)):
  - Warning modal shown before export when private fields are detected
  - Displays which fields are marked private and how many people have them
  - Users can choose to include, exclude, or cancel the export
  - Supports deadname protection via `previous_names` + `private_fields` pattern

- **Privacy feature discoverability** ([#100](https://github.com/banisterious/obsidian-charted-roots/issues/100)):
  - First-run notice shown after importing data when living persons are detected and privacy protection is disabled
  - Users can configure privacy settings, dismiss permanently, or be reminded later
  - Export wizard preview now shows info notice when privacy is disabled and living persons will be exported
  - Both notices link directly to privacy configuration settings

### Fixed

- **Control Center and person picker freezes on large vaults** ([#113](https://github.com/banisterious/obsidian-charted-roots/issues/113)):
  - Clicking names in Control Center or using Add Father/Mother/etc. caused 30+ second freezes on macOS with large vaults
  - Added caching for graph services at the modal level to avoid expensive recomputation on every click
  - PersonPickerModal now uses plugin's graph service when available, avoiding redundant cache loading
  - Graph data is computed once and reused, with cache invalidation when data changes

- **Relationship calculator asymmetry with unresolved Gramps handles** ([#109](https://github.com/banisterious/obsidian-charted-roots/issues/109)):
  - Root cause 1: When a referenced person doesn't exist in the Gramps data (e.g., ancestors not in database), the import left Gramps handles (e.g., `_PTHMF88SXO93W8QTDJ`) in `_id` fields instead of cr_ids
  - Root cause 2: When multiple people have the same name, the import's relationship update pass was reading the wrong file due to filename collisions
  - Added cleanup step in Gramps import to remove unresolved handles from `_id` fields after the cr_id replacement pass
  - Changed file lookup to use `findPersonByCrId()` instead of name-derived filenames
  - Also added defensive filtering in family graph to handle existing data with unresolved handles

---

## [0.18.20] - 2026-01-03

### Fixed

- **Timeline block missing space before place name** - Fixed whitespace collapsing in dynamic timeline display ([#122](https://github.com/banisterious/obsidian-charted-roots/issues/122)):
  - Changed place text from separate text node to leading space in span content
  - Fixes "Residencein" appearing instead of "Residence in"

- **Dashboard "data issues" count links to wrong destination** ([#115](https://github.com/banisterious/obsidian-charted-roots/issues/115), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Dashboard now shows the same issue count as Statistics Dashboard
  - Changed dashboard to calculate total issues as: missing birth dates + orphaned people + unsourced events
  - Added `unsourcedEvents` to VaultStatsService for efficient counting

- **Statistics Dashboard total doesn't match visible category sums** ([#116](https://github.com/banisterious/obsidian-charted-roots/issues/116), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Clarified what the "Issues" total represents
  - Changed subtitle from "Items needing attention" to "Missing births + orphans + unsourced events"

- **Data Quality checker flags `male`/`female` as non-standard sex format** ([#117](https://github.com/banisterious/obsidian-charted-roots/issues/117), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Now accepts common synonyms (male/female) in addition to GEDCOM codes (M/F/X/U)
  - Uses existing value alias system for consistent synonym handling

- **"Living people" calculation is inaccurate for historical genealogy data** ([#118](https://github.com/banisterious/obsidian-charted-roots/issues/118), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Living person count now uses `livingPersonAgeThreshold` setting (default 100 years)
  - Only counts people as "potentially living" if birth year is within threshold and no death date

- **Gramps import creates invalid cr_id formats** ([#119](https://github.com/banisterious/obsidian-charted-roots/issues/119), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Fixed cr_id replacement in second pass to respect property aliases
  - Now `father_id`, `mother_id`, `spouse_id`, `children_id`, and other relationship fields are correctly updated

### Added

- **Distinguish actionable errors from informational data gaps** ([#120](https://github.com/banisterious/obsidian-charted-roots/issues/120), part of [#114](https://github.com/banisterious/obsidian-charted-roots/issues/114)):
  - Data quality section now groups issues by severity
  - **Errors** (red): Date inconsistencies and other fixable problems
  - **Data Gaps** (yellow/orange): Missing data that may be unavailable for historical records
  - **Informational** (blue): Neutral metrics like places without coordinates
  - Each group has a header explaining its meaning

---

## [0.18.19] - 2026-01-03

### Fixed

- **Relationship calculator not traversing gender-neutral parents** - BFS pathfinding now correctly traverses `parents`/`parents_id` relationships ([#109](https://github.com/banisterious/obsidian-charted-roots/issues/109)):
  - Added traversal of `parentCrIds` in relationship calculator so paths can go "up" through gender-neutral parents
  - Added reverse child inference from `parentCrIds` in family graph cache so parents using gender-neutral fields have `childrenCrIds` populated
  - Added debug logging to help diagnose asymmetric relationship calculation issues

- **New child notes created with obsolete `child` property** - Fixed legacy property name usage ([#110](https://github.com/banisterious/obsidian-charted-roots/issues/110)):
  - Removed automatic addition of empty `child` property when creating new person notes
  - Updated relationship-history, data-quality, and base-template to use normalized `children` property
  - Read operations still support legacy `child` property for backward compatibility

- **Import completion screen shows wrong entity counts** - Fixed completion screen to show actual imported counts ([#111](https://github.com/banisterious/obsidian-charted-roots/issues/111)):
  - Completion screen now shows counts from import results instead of file preview counts
  - Entity types not selected for import no longer appear in the summary

- **Family Tree canvas separates spouses when grouping siblings** - Spouses now stay adjacent when siblings are grouped by parent pair ([#103](https://github.com/banisterious/obsidian-charted-roots/issues/103)):
  - In-laws are now attached to their blood-relative spouse's parent-pair group
  - Prevents spouses from being "captured" into different sibling groups

- **Custom Relationship uses `parent` instead of `parents` and Family Tree only shows one parent when mixing property types** - Fixed gender-neutral parent property handling ([#112](https://github.com/banisterious/obsidian-charted-roots/issues/112)):
  - Changed built-in relationship type IDs from `parent`/`child` to `parents`/`children` so Custom Relationship writes to correct properties
  - Family Tree view now shows all parents when mixing `father`/`mother` with `parents` property (up to 2 total)
  - Children are now correctly recognized as belonging to a parent using `parentCrIds` even when biological parents exist

- **Person picker search may not work on macOS** - Improved search input focus and event handling ([#113](https://github.com/banisterious/obsidian-charted-roots/issues/113)):
  - Added multiple focus attempts with staggered delays for reliable focus after context menu dismissal
  - Added `keyup` event listener as fallback for `input` events

---

## [0.18.18] - 2026-01-02

### Fixed

- **Couples grouping not detecting all couples** - "By couples" grouping now correctly groups all couples with `spouse_id` set ([#105](https://github.com/banisterious/obsidian-charted-roots/issues/105)):
  - Changed from child-parent inference to direct spouse relationship detection
  - Fixes couples without children not being grouped
  - Fixes couples whose children use gender-neutral `parents` field instead of `father`/`mother`

- **Gender-neutral parents not respected** - Fixed two issues with the gender-neutral `parents`/`parents_id` fields ([#108](https://github.com/banisterious/obsidian-charted-roots/issues/108)):
  - Bidirectional linker no longer auto-adds `father`/`mother` fields when `parents`/`parents_id` already exist and "Enable inclusive/gender-neutral parent fields" is enabled
  - Edit Person modal now correctly displays existing `parents` relationships when opened via file explorer context menu or Control Center

---

## [0.18.17] - 2026-01-02

### Added

- **Rename file when person name changes** - Option to rename the note file when editing a person's name ([#107](https://github.com/banisterious/obsidian-charted-roots/issues/107)):
  - When saving changes in Edit Person modal with a new name, prompts to rename the file
  - Handles duplicate filenames by appending a number (e.g., "John Smith 1.md")
  - Automatically updates relationship wikilinks in related notes (parents, spouses, children)
  - Uses `cr_id` matching to ensure correct relationships are updated

- **Canvas grouping for family units** - Visual groups to organize related nodes on canvases ([#105](https://github.com/banisterious/obsidian-charted-roots/issues/105)):
  - Four grouping strategies: None, By generation, By couples, By collection
  - "By couples" groups parent pairs who share children (not including children)
  - Groups rendered as JSON Canvas 1.0 `type: "group"` nodes
  - Available in global settings (Preferences → Canvas styling) and per-tree in Tree Wizard
  - Works for both Canvas and Excalidraw output

- **Sensitive field redaction utilities** - Centralized utilities for filtering sensitive fields from exports ([#96](https://github.com/banisterious/obsidian-charted-roots/issues/96)):
  - Added `SENSITIVE_FIELDS` constant with SSN and identity number fields
  - Added `isSensitiveField()` function to check if a field is sensitive
  - Added `filterSensitiveFields()` function to remove sensitive fields from frontmatter objects
  - Note: Current exporters already protect these fields implicitly by working with `PersonNode` interface, which excludes sensitive fields by design

### Fixed

- **Children display property not accumulating** - When adding multiple children via "Add child" button, the `children` display property now correctly shows all children instead of just the first ([#106](https://github.com/banisterious/obsidian-charted-roots/issues/106)):
  - Fixed reading from legacy `child` property instead of normalized `children` property
  - Affected both Create Person modal and bidirectional linking

---

## [0.18.16] - 2026-01-02

### Added

- **Pronouns field support** - Add and display pronouns for people ([#101](https://github.com/banisterious/obsidian-charted-roots/issues/101)):
  - New `pronouns` frontmatter property (free-form string, e.g., "she/her", "they/them")
  - `showPronouns` setting in Settings → Display (default: enabled)
  - Pronouns displayed in person pickers after name in parentheses
  - Pronouns field added to Edit Person modal
  - Pronouns included in all report outputs (Markdown, ODT, PDF)
  - PDF reports updated: Individual Summary and Family Group Sheet vital statistics

- **Manual living status override** - Override automatic living/deceased detection for privacy protection ([#97](https://github.com/banisterious/obsidian-charted-roots/issues/97)):
  - New `cr_living` frontmatter property (boolean)
  - `cr_living: true` — Always treat as living (protected in exports)
  - `cr_living: false` — Always treat as deceased (not protected)
  - Absent `cr_living` uses automatic detection (existing behavior)
  - "Living status override" dropdown in Edit Person modal (shown when privacy protection enabled)
  - Supported in all export formats: GEDCOM, GEDCOM X, Gramps XML, CSV

### Fixed

- **Sibling ordering in Family Tree canvas** - Children from different parent pairs are now grouped together instead of being interleaved ([#103](https://github.com/banisterious/obsidian-charted-roots/issues/103)):
  - Added post-processing step to group full-siblings by parent pair
  - Works around upstream family-chart library layout issue with multi-spouse families

- **ESLint compliance for Obsidian plugin review** - Addressed lint issues flagged by Obsidian's plugin review bot:
  - Removed deprecated `substr()` calls in GEDCOM parser, replaced with `substring()`
  - Eliminated `@typescript-eslint/no-explicit-any` violations by adding proper type definitions for pdfmake and family-chart libraries
  - Added description comments to remaining `eslint-disable` directives
  - Refactored `this` aliasing to use `bind()` pattern in Family Chart view
  - Removed ~240 lines of unused `_CrossImportReviewModal` class
  - Removed unused imports (`EventService`, `ReportResult`, `CrossImportDetectionService`)
  - Fixed `no-misused-promises` error in async event handler

---

## [0.18.15] - 2026-01-01

### Added

- **Card Style Options** - Choose from 4 card styles in Family Chart view ([#87](https://github.com/banisterious/obsidian-charted-roots/issues/87)):
  - **Rectangle**: Default style with avatar thumbnails and full details
  - **Circle**: Circular avatar cards with name labels below
  - **Compact**: Text-only cards without avatars for denser layouts
  - **Mini**: Smaller name-only cards for high-level overviews
  - Card style persists across Obsidian restarts
  - PNG/PDF export support for all card styles including circle

- **Separate Note Files (Phase 4)** - Create standalone note entity files during Gramps import ([#79](https://github.com/banisterious/obsidian-charted-roots/issues/79), [#80](https://github.com/banisterious/obsidian-charted-roots/issues/80)):

  **Import Integration**
  - New "Create separate note files" checkbox in Gramps import wizard (opt-in, default off)
  - Notes created as `cr_type: note` entities in configured Notes folder
  - Note names generated from type + first referencing entity (e.g., "Research on John Smith")
  - Entity notes sections use wikilinks instead of embedded content when enabled
  - Source-only notes excluded (already embedded in source notes)

  **Manual Note Creation**
  - Create Note modal with note type, title, privacy toggle, and linked entities
  - Linked entities field with typed entity pickers: dropdown menu (Person, Event, Place, Source) opens corresponding picker modal
  - "Charted Roots: Create note" command in command palette
  - Right-click context menu "New Charted Roots note" in Notes folder
  - Notes tile and 3 templates added to Templater templates modal

  **Infrastructure**
  - `notesFolder` setting (default: "Charted Roots/Notes")
  - Notes base template for Obsidian Bases with 11 views
  - Form state persistence for Create Note modal

### Fixed

- **Export text overflow** - Fixed text spilling outside card bounds in PNG/PDF exports; clip-path attributes now preserved during SVG preparation ([#88](https://github.com/banisterious/obsidian-charted-roots/issues/88))
- **High Contrast theme readability** - Fixed white text on bright cyan/magenta backgrounds in dark mode; High Contrast preset now uses black text for accessibility ([#88](https://github.com/banisterious/obsidian-charted-roots/issues/88))
- **Multi-line date display** - Birth and death dates now display on separate lines when both are enabled; cards automatically resize to accommodate the extra line ([#88](https://github.com/banisterious/obsidian-charted-roots/issues/88))
- **Spacing state persistence** - Node and level spacing settings now persist across Obsidian restarts; added checkmarks to spacing menu items to indicate current selection ([#88](https://github.com/banisterious/obsidian-charted-roots/issues/88))

---

## [0.18.14] - 2025-12-31

### Added

- **Edit Person Events & Sources** - Manage events and sources directly from the Edit Person modal ([#33](https://github.com/banisterious/obsidian-charted-roots/issues/33)):
  - **Sources section**: Multi-value picker to link source notes with Link and Create buttons; stores as `sources` (wikilinks) and `sources_id` (cr_ids) arrays for reliable linking
  - **Events section**: Display events referencing this person with type badges and dates; link/unlink existing events or create new events with person pre-filled
  - **Type badges**: Color-coded type badges for both events and sources matching picker modal styles

### Fixed

- **Context menu Edit Person** - Fixed missing plugin reference causing "Plugin not available" error when clicking Link/Create buttons in Edit Person modal opened via context menu ([#33](https://github.com/banisterious/obsidian-charted-roots/issues/33))
- **Children display in Edit Person** - Fixed children displaying as cr_ids instead of names in Edit Person modal; was reading from deprecated `child` property instead of `children` ([#86](https://github.com/banisterious/obsidian-charted-roots/issues/86))
- **Duplicate children_id during Gramps import** - Fixed duplicate values appearing in `children_id` arrays after importing Gramps .gpkg files; bidirectional sync now suspended during import to prevent file watcher from triggering relationship sync before Phase 2 handle replacement ([#84](https://github.com/banisterious/obsidian-charted-roots/issues/84))
- **Deprecated `child` property in imports** - New person notes now use `children` (plural) property instead of deprecated `child` (singular), matching v0.18.11 property naming normalization ([#85](https://github.com/banisterious/obsidian-charted-roots/issues/85))
- **Lint warnings from Obsidian bot** - Fixed various lint issues flagged during PR review: Object stringification, async/await usage, deprecated method calls, innerHTML usage, and type assertions

---

## [0.18.13] - 2025-12-31

### Added

- **Gramps Notes Import** - Import notes attached to Gramps entities during Gramps XML import ([#36](https://github.com/banisterious/obsidian-charted-roots/issues/36), [#76](https://github.com/banisterious/obsidian-charted-roots/issues/76), [#77](https://github.com/banisterious/obsidian-charted-roots/issues/77)):

  **Person Notes (Phase 1)**
  - Import notes attached to persons as "## Notes" section at bottom of person note
  - Multiple notes organized by type (e.g., "### Research", "### Person Note")
  - Style conversion: bold, italic, strikethrough, underline, superscript, subscript, links
  - Formatted (preformatted) notes wrapped in code fences to preserve whitespace
  - Privacy flag: `private: true` added to frontmatter if any note has privacy flag
  - Import wizard toggle to enable/disable notes import (enabled by default)

  **Family Notes Handling**
  - Family-level notes attached to marriage/family events instead of separate entity
  - Preserves notes without requiring new Family entity type

  **Event & Place Notes (Phase 2)**
  - Import notes attached to events appended to event note content
  - Import notes attached to places appended to place note content

### Fixed

- **Step/adoptive parent canvas positioning** - Fixed step/adoptive parents not rendering on generated canvas trees; positioning pass was missing after layout engine ([#75](https://github.com/banisterious/obsidian-charted-roots/issues/75))
- **Circular relationship freeze** - Added cycle detection to prevent Obsidian from freezing when circular parent-child relationships exist (e.g., A is parent of B and B is parent of A); cycles are now detected and broken with a warning ([#83](https://github.com/banisterious/obsidian-charted-roots/issues/83))

### Changed

- **Person note context menu reorganization** - Restructured the Charted Roots context menu for person notes to be less cluttered and more intuitive ([#82](https://github.com/banisterious/obsidian-charted-roots/issues/82)):
  - Renamed "Add relationship..." to "Relationships" submenu
  - Moved "Validate relationships" and "Calculate relationship..." into Relationships submenu
  - Removed duplicate "More options..." entry (same as "Generate visual tree")
  - Added "More" submenu with less frequently used actions: Find on canvas, Open in map view, Set group name, Set collection, Insert dynamic blocks, Create place notes, Validate against schemas, Add essential properties, Add cr_id

---

## [0.18.12] - 2025-12-31

### Fixed

- **Adoptive parent relationship fixes** - Multiple fixes for adoptive parent relationships ([#75](https://github.com/banisterious/obsidian-charted-roots/issues/75)):
  - Added `adoptive_parent`/`adoptive_parent_id` gender-neutral property support alongside existing `adoptive_father`/`adoptive_mother`
  - Added `adopted_child`/`adopted_child_id` parsing from parent's perspective with automatic reverse relationship
  - Fixed `parents_id` validation false positive ("Child doesn't list this person as parent")
  - Fixed adoptive parents rendering in Family Chart when biological parents also exist
  - Adoptive parents now appear on canvas trees when relationship is defined from either direction
- **Dynamic block metadata timing** - Timeline and relationships blocks now show "Waiting for metadata..." instead of errors when opened on newly created person notes, then auto-refresh when ready ([#74](https://github.com/banisterious/obsidian-charted-roots/issues/74))
- **Timeline event detection** - Timeline block now listens for event note changes and file creation, so new events appear without requiring a page refresh ([#74](https://github.com/banisterious/obsidian-charted-roots/issues/74))
- **Family Chart color dropdown** - Removed non-functional color scheme dropdown from Family Chart toolbar; sex-based coloring remains available via the palette button ([#72](https://github.com/banisterious/obsidian-charted-roots/issues/72))
- **Settings label clarity** - Renamed "Maps folder" setting to "Map notes folder" to clarify it controls where map notes are created, not map images ([#71](https://github.com/banisterious/obsidian-charted-roots/issues/71))
- **ESLint compliance** - Fixed 36 non-sentence-case ESLint errors across 15 files (unused imports, promise handling, style assignments, async/await issues)
- **Event template properties** - Templater event templates now use `persons` array instead of deprecated `person` property ([#69](https://github.com/banisterious/obsidian-charted-roots/issues/69))

---

## [0.18.11] - 2025-12-30

### Added

- **Cleanup Wizard Phase 4** - UX improvements for the Post-Import Cleanup Wizard ([#65](https://github.com/banisterious/obsidian-charted-roots/issues/65)):

  **Batch Progress Indicators**
  - Real-time progress bars during batch operations (Steps 2-6, 10-14)
  - Shows "Processing X of Y notes..." with current filename
  - UI re-renders every 5 items to show progress without excessive updates
  - Progress callbacks added to all batch methods in DataQualityService and migration services

  **Keyboard Navigation**
  - Arrow keys to navigate between tiles on overview screen
  - Enter/Space to activate focused tile
  - Escape to return to overview or close modal
  - ARIA attributes (role, aria-label) for screen reader accessibility
  - Visual focus indicators matching hover styles

- **Property Naming Normalization** - Standardized `child` → `children` property naming ([#65](https://github.com/banisterious/obsidian-charted-roots/issues/65)):

  **Cleanup Wizard Step 14**
  - Batch migrate legacy `child` property to `children` across vault
  - Preview shows notes that will be updated
  - Merges with existing `children` if both properties exist (deduplicates)
  - Removes legacy `child` property after migration

  **Documentation Updates**
  - `children` marked as canonical property in Frontmatter-Reference.md
  - Deprecation notice added for `child` property
  - Updated example person note to use `children`

### Fixed

- **Cleanup Wizard extensibility** - Fixed hardcoded step count (10) to use `WIZARD_STEPS.length`, enabling future step additions without code changes

---

## [0.18.10] - 2025-12-30

### Added

- **Custom Map Authoring** - Streamlined custom map creation and place positioning ([#66](https://github.com/banisterious/obsidian-charted-roots/issues/66)):

  **Map Creation Wizard**
  - 4-step guided wizard: select image → configure map → add initial places → review & create
  - Click on map preview to add places with coordinates auto-filled
  - Inline universe creation (create new universe without leaving wizard)
  - Modal state persistence allows resuming interrupted sessions
  - Entry point: Control Center → Maps → "Create map wizard"

  **Place Management in Map View**
  - Right-click on empty map space → "Create place here" with coordinates pre-filled
  - Right-click place markers → Edit place, Open note, or Copy coordinates
  - Draggable place markers in Move Places mode with undo support
  - Proper coordinate conversion between DOM and Leaflet Simple CRS

  **Map View UX Improvements**
  - Toolbar buttons converted to icons with tooltips for space efficiency
  - Improved toolbar wrapping when sidebar reduces available width
  - "Open map" button in wizard now opens the newly created map

### Fixed

- **Event essential properties** - "Add essential event properties" context menu now adds `persons: []` array instead of deprecated singular `person` property ([#69](https://github.com/banisterious/obsidian-charted-roots/issues/69))

---

## [0.18.9] - 2025-12-30

### Added

- **Nested Properties Redesign** - Flat property format for evidence tracking and life events, fixing Obsidian Properties panel compatibility ([#52](https://github.com/banisterious/obsidian-charted-roots/issues/52)):

  **Evidence Tracking Migration (sourced_facts → sourced_*)**
  - Old nested `sourced_facts` object replaced with individual flat properties
  - 10 supported fact types: `sourced_birth_date`, `sourced_death_date`, `sourced_birth_place`, `sourced_death_place`, `sourced_name`, `sourced_sex`, `sourced_occupation`, `sourced_parents`, `sourced_spouse`, `sourced_children`
  - Each property is a simple list of wikilinks to source notes
  - Evidence Service reads both old and new formats for backward compatibility
  - Cleanup Wizard Step 12 migrates existing `sourced_facts` to flat format

  **Life Events Migration (events → event notes)**
  - Old inline `events` arrays replaced with links to separate event note files
  - New `life_events` property contains wikilinks to event notes
  - Event notes are first-class Obsidian notes with full metadata, tags, and attachments
  - Cleanup Wizard Step 13 creates event notes and updates person notes
  - Event notes created in configurable Events folder with proper frontmatter

  **Cleanup Wizard Enhancements**
  - Expanded from 11 to 13 steps
  - Step 12: Migrate Sourced Facts (sourced_facts → sourced_* properties)
  - Step 13: Migrate Life Events (events arrays → event note files)
  - Migration completion tracking prevents redundant migrations
  - Preview shows exactly what will be created/modified

  **Migration Notice**
  - One-time notice view shows what changed and recommended actions
  - Visual comparison of old vs new formats
  - Checkmarks indicate completed migrations
  - Direct link to Cleanup Wizard

- **Custom Relationships on Canvas Trees** - Custom relationship types with flat properties and family tree integration:
  - **Flat format**: `godparent: ["[[John Smith]]"]`, `godparent_id: ["john_123"]`
  - **Pattern**: Each relationship type uses its ID as the property name
  - **Parallel arrays**: Optional `_id`, `_from`, `_to` suffix properties for metadata
  - **Properties UI compatible**: All properties are simple lists or text values
  - **Backward compatible**: Legacy `relationships` array still read for existing data
  - **Family tree integration**: New `includeOnFamilyTree` and `familyGraphMapping` properties
  - **Custom types**: Can opt-in to family tree display via relationship type editor UI

---

## [0.18.8] - 2025-12-30

### Added

- **Inline media folder configuration** - When uploading media with no folder configured, an inline folder picker now appears instead of just showing an error notice. Set the folder directly in the modal and continue uploading.

### Fixed

- **Context menu relationship actions** - "Add father/mother/spouse/child" now correctly write both wikilink and ID fields (dual storage pattern), fixing bidirectional linking
- **Metadata cache timing** - Pass cr_id directly when selecting newly created people, avoiding cache timing issues that caused "could not find cr_id" errors
- **Family chart view stability** - Chart no longer becomes unusable when returning to the tab after modifying other notes. The view now defers refresh until visible and preserves zoom/pan state during refreshes

---

## [0.18.7] - 2025-12-29

### Added

- **Inclusive Parent Relationships** - Opt-in gender-neutral parent support for diverse family structures ([#63](https://github.com/banisterious/obsidian-charted-roots/issues/63)):

  **Settings (Control Center > Preferences)**
  - Enable Inclusive Parents toggle (default: OFF) - opt-in feature
  - Parent Field Label text setting for customization (default: "Parents")
    - Examples: "Parents", "Guardians", "Progenitors", "Lolos"
    - Label shown in UI only; frontmatter always uses `parents` property
  - Conditional visibility: label setting only shown when toggle enabled

  **Schema Changes**
  - New `parents` property (wikilinks, can be array for multiple parents)
  - New `parents_id` property (Charted Roots IDs, dual storage pattern)
  - Independent of `father`/`mother` - users can use either or both
  - Supports mixed usage for blended families or migration scenarios

  **Create/Edit Person Modal**
  - Parents field appears when setting enabled (above father/mother)
  - Multi-select person picker (same pattern as children field)
  - Inline parent creation via person picker
  - No gender pre-fill (unlike father/mother)
  - Uses custom label from settings

  **Family Graph Integration**
  - FamilyGraphService reads `parents`/`parents_id` relationships
  - Included in ancestor/descendant calculations
  - Same treatment as father/mother for graph traversal
  - Spouse edges between 2 parents (same pattern as father/mother)
  - Priority order for fallback: biological → gender-neutral → adoptive

  **Bidirectional Linking**
  - When person added to `parents` array, automatically adds to each parent's `children` array
  - Uses dual storage: both wikilinks (`parents`) and IDs (`parents_id`)
  - Deduplication prevents duplicate entries
  - Handles removal: when parent removed, child removed from their `children`
  - Supports aliased wikilinks (`[[basename|name]]`) when filename differs from name

  **Relationship Displays**
  - Relationships Block (`canvas-roots-relationships`): Shows parents with "Parent" label
  - Family Chart View: Displays gender-neutral parents in interactive tree
  - Sibling Detection: Checks gender-neutral parents' children for siblings

  **Design Principles**
  - Opt-in, not replacement - father/mother fields remain; this adds alongside
  - Configurable - users customize terminology to their preference
  - Non-disruptive - users with traditional setups see no UI changes
  - Coexistent - can use father, mother, AND parents simultaneously

---

## [0.18.6] - 2025-12-29

### Added

- **Media Upload and Management Enhancement** - Comprehensive file upload system allowing users to upload media directly from Charted Roots and link to entities without manual file management ([#60](https://github.com/banisterious/obsidian-charted-roots/issues/60)):

  **1. Settings Enhancement**
  - Drag-and-drop reordering of media folders in Preferences
  - First folder in list becomes upload destination
  - Visual feedback during drag operations with grip handle

  **2. Expanded Media Manager Dashboard**
  - 6-tile layout (3×2 grid) vs. previous 4-tile layout
  - Row 1 (Browse & Discover): Linked Media Gallery, Find Unlinked, Source Media Linker
  - Row 2 (Add & Link): Upload Media, Link Media, Bulk Link to Entities

  **3. Standalone Upload Modal**
  - Drag-and-drop file upload with browse fallback
  - Upload to first configured media folder
  - Read-only destination display with helpful hint
  - Multiple file selection support
  - Auto-rename collision handling (incremental numbering: `photo.jpg` → `photo 1.jpg`)
  - File type validation
  - Optional entity linking after upload

  **4. Inline Upload in Media Picker**
  - "Upload files..." button in MediaPickerModal
  - Follows PlacePickerModal "Create new place" pattern
  - Auto-selects newly uploaded files
  - Available in both context menu and Dashboard workflows

  **5. Entity Picker Modal**
  - Select entities after choosing media files (media-first workflow)
  - Supports all entity types: Person, Event, Place, Organization, Source
  - **Person-specific filters:**
    - Living status: All / Living only / Deceased only
    - Birth date: All / Has date / Missing date
    - Sex: All / Male / Female
  - **Person-specific sorting:**
    - Name (A-Z / Z-A)
    - Birth year (oldest first / youngest first)
    - Recently modified
  - Shows which entities already have selected media linked
  - Bulk linking with progress modal for ≥5 entities

  **6. Consistent Upload Availability**
  - Context menu flow: Right-click entity → Media → Link media → Upload files
  - Media Manager tile: Link Media → Upload files
  - Both workflows use same enhanced MediaPickerModal

- **"Create new" buttons in picker modals** - Added inline creation to streamline workflows:
  - **Context menu relationship flows**: All relationship context menu options now show "Create new" buttons
    - "Add father" → Shows "Create new father" button with sex pre-filled as male
    - "Add mother" → Shows "Create new mother" button with sex pre-filled as female
    - "Add spouse" → Shows "Create new spouse" button with opposite sex suggested (if known)
    - "Add child" → Shows "Create new child" button
    - "Add custom relationship" → Shows "Create new [relationship type]" button
  - **Event creation flow**:
    - Primary person field now uses a picker modal with "Create new person" button
    - Place field now uses a picker modal with "Create new place" button
    - Replaces plain text inputs with proper Link/Unlink buttons
  - Matches the behavior of the Create Person modal for a consistent user experience
  - Streamlines workflow from 3 steps (close modal, create note, re-open modal) down to 1 step

### Changed

- **Split "Add parent" into "Add father" and "Add mother"** - Context menu now shows separate options instead of prompting with an intermediate modal:
  - Eliminates the extra step of choosing parent type
  - More discoverable and straightforward
  - Consistent with having separate "Create new father" and "Create new mother" buttons

### Fixed

- **Research gaps counting bug** - Fixed inflated unsourced facts count in Control Center Research Gaps widget:
  - Previously counted all facts as "unsourced" for every person note in the vault, even those without GPS tracking enabled
  - Now only counts unsourced facts for people who have the `sourced_facts` property (actively using GPS tracking)
  - Example: With 24 people using GPS tracking and 7 fact types, the count was showing 169 unsourced facts (24×7), even though many people had complete tracking

- **Timeline filter not working with persons array** - Fixed timeline person filter to properly match events using the `persons` array field:
  - Timeline person filter now checks both the singular `person` field and the `persons` array
  - Events with multiple people are now properly included when filtering by any person's name
  - Substring matching now works correctly for aliased person names

- **Events view not showing linked people** - Fixed "Person" column in Events tab to display all linked people:
  - Person column now shows all people from both `person` (singular) and `persons` (array) fields
  - Multiple people are displayed comma-separated in the table
  - Events no longer appear to have no linked people when using the `persons` array

---

## [0.18.5] - 2025-12-29

### Fixed

- **Bidirectional linking for spouse's children** - Fixed critical regression where children added to a parent would not be automatically linked to the parent's spouse:
  - When adding a child to a parent who has a spouse, the child is now automatically linked to both parents, and both parents get the child in their `children_id` arrays
  - Implemented by suspending the background `BidirectionalLinker` service during manual relationship updates to prevent interference
  - Example: Creating Father, adding Mother as spouse, then adding children now correctly links all family members bidirectionally

- **Double bracket issue in child names** - Fixed bug where child names would accumulate multiple layers of brackets (e.g., `[[[[Child Name]]]]`):
  - Added `stripWikilink()` helper function to remove existing brackets before `createSmartWikilink()` adds new ones
  - Prevents bracket duplication when reading existing child names from frontmatter and re-writing them

- **Missing "Link" text on spouse button** - Added "Link" text label to spouse link button in create person modal (was showing only icon)

- **Data quality checker incorrectly flagging schema-defined structures** - Fixed false warnings for intentional nested structures:
  - `sourced_facts` and `evidence` properties are now whitelisted and won't trigger "nested structure" warnings
  - Cleanup wizard will no longer flatten these properties, preventing breakage of the Evidence Service
  - Users can now safely use GPS (Genealogical Proof Standard) research tracking features without getting false data quality warnings

---

## [0.18.4] - 2025-12-29

### Changed

- **CSS Architecture Refactoring** - Improved maintainability and organization of the plugin's CSS codebase:
  - **Split massive modals.css** (12,488 lines) into 6 focused component files organized by functional domain:
    - `control-center.css` (5,675 lines) - Core Control Center UI (tabs, navigation, cards)
    - `import-export-wizard.css` (1,778 lines) - Import/Export wizard modals
    - `cleanup-wizard.css` (2,134 lines) - Cleanup wizard with all 9 steps
    - `media-modals.css` (1,427 lines) - Media picker, manager, gallery, bulk link modals
    - `place-modals.css` (933 lines) - Place creation, standardization, merge, and network modals
    - `entity-create-modals.css` (542 lines) - Person picker and entity creation forms
  - **Removed 5 empty/unused CSS files** - Deleted `canvas.css`, `edges.css`, `theme.css`, `nodes.css`, and `animations.css` that contained no meaningful styles

### Fixed

- **CSS duplicate definitions** - Resolved critical CSS conflicts that could cause unpredictable styling behavior:
  - `.cr-progress-bar` - Removed duplicate definition, now uses modifier classes (--good, --medium, --bad)
  - `.crc-field-list` - Converted to scoped selectors to prevent conflicts between different contexts
  - `.cr-modal-buttons` - Consolidated to single base definition in `base.css`

- **Missing bidirectional parent-child relationship linking** - Fixed critical bug where creating a person with parents or children would only create one-way relationships. Now all relationship creation flows properly maintain bidirectional links:
  - **Person creation**: When you create a person and link them to a father/mother, the parent's `children_id` array is automatically updated. When you add children during creation, each child's `father_id` or `mother_id` is automatically set based on the parent's sex.
  - **Post-create actions**: When using "Add child", "Add spouse", or "Add parent" buttons in the post-creation flow, both sides of the relationship are now properly updated.
  - **Spouse relationships**: Refactored existing spouse linking to use proper dual storage (wikilink + ID) via `updatePersonNote()`.

  This ensures family relationships are always bidirectional across all creation flows, not just for spouse relationships.

---

## [0.18.3] - 2025-12-29

### Fixed

- **Wikilink handling for duplicate names** - The plugin now properly handles entities with duplicate names (e.g., "John Doe 1.md" for a person named "John Doe") throughout the codebase using Obsidian's wikilink alias format `[[filename|display name]]`. This fixes:
  - Bidirectional relationship linking when adding parents, spouses, or children
  - Note creation for persons, events, places, and organizations
  - All importers (GEDCOM, Gramps XML, GedcomX JSON, CSV)
  - All exporters (GEDCOM, Gramps XML, GedcomX JSON)
  - Dynamic content blocks (timeline, relationships, media gallery)
  - Report generators (timeline, place summary, collection overview, media inventory)

- **"Add essential properties" using wrong property name** - Fixed "Add essential source properties" and "Add essential event properties" context menu actions incorrectly setting `type` instead of `cr_type`. Person, place, and universe actions already used the correct property name. Also updated place standardization and organization membership filtering to check both `cr_type` (preferred) and legacy `type` for backward compatibility.

---

## [0.18.2] - 2025-12-28

### Added

- **Timeline Export Consolidation** - All 8 timeline export formats are now available from a single location: **Statistics & Reports → Reports → Timeline**. This consolidates functionality that was previously split between the Events tab Export card and the Reports wizard.

  **Unified formats:**
  - Visual exports: Canvas, Excalidraw (requires Excalidraw plugin)
  - Documents: PDF, ODT
  - Markdown: Vertical timeline (callouts), Table, Simple list, Dataview query

  **Consolidated options:**
  - All filters from both systems (person, event type, group, place, universe, date range)
  - Canvas/Excalidraw styling (layout, color scheme, ordering edges)
  - Excalidraw drawing options (style, font, stroke width)
  - PDF/ODT options (page size, date format, cover page)
  - Grouping options (none, by year, by decade, by person, by place)
  - Data quality insights (timeline gaps, unsourced events, orphan events)

- **Deprecation notice on Events tab Export card** - The Export card in Control Center → Events now displays a notice directing users to the unified Reports wizard. The Export card will be removed in a future release.

### Fixed

- **Excalidraw timeline exports showing raw file paths** - Event nodes in Excalidraw exports now display formatted labels (e.g., "BIRTH of John Smith (1850)") instead of raw file paths like "People/events/birth-john-smith.md".

- **Excalidraw text positioning** - Text labels in Excalidraw exports are now properly centered within their containing rectangles.

- **ODT table column misalignment with wikilinks** - Fixed an issue where wikilinks with aliases (e.g., `[[file|display]]`) would cause table columns to misalign in ODT exports. The pipe character inside wikilinks is no longer incorrectly treated as a cell delimiter.

- **Canvas year markers in timeline exports** - Year marker text nodes now display properly formatted year labels instead of placeholder text.

- **Intermediate canvas file cleanup** - When exporting to Excalidraw format, the intermediate canvas file is now automatically deleted after successful conversion.

- **Restored "Open in family chart" context menu action** - Re-added the missing menu item for person notes under the Charted Roots submenu.

---

## [0.18.1] - 2025-12-28

### Added

- **Family Creation Wizard** - New 5-step wizard for creating interconnected family groups. Start from scratch by creating a central person, or build around an existing person in your vault. Add spouses, children, and parents with automatic bidirectional relationship linking. Access via command palette ("Charted Roots: Create family wizard"), Dashboard tile, People tab actions, or folder context menu.

- **Inline person creation in Edit Modal** - Create new people directly from relationship fields (spouse, father, mother, children) without leaving the Edit Modal. Click the "+" button next to any relationship field to open a mini-form, enter basic details, and the new person is created and linked automatically.

- **Children management in Edit Modal** - New "Children" section in the Edit Modal displays existing children and allows adding new ones via person picker or inline creation. Children are stored using `child` (display names) and `children_id` (cr_id references) array properties.

- **"Add Another" flow for Create Person modal** - After creating a person, choose "Create & Add Another" to immediately create another person in the same folder, or use "Create & Open" to create and navigate to the new note.

- **Nickname property support** - New `nickname` frontmatter property for person notes, displayed in Edit Modal header alongside the formal name. Useful for informal names, pet names, or alternate identities.

- **Folder context menu integration** - Right-click on people folders to access "Create person" and "Create family" actions directly, with the selected folder pre-populated as the destination.

- **State persistence for Family Wizard** - If the Family Creation Wizard is accidentally closed, your progress is saved. When reopening, you'll see a prompt to restore or discard the previous session.

### Changed

- **Edit Modal relationship fields** - Relationship fields (spouse, father, mother) now show inline "Create new" buttons that open a mini-form for creating and linking new people without leaving the modal.

### Fixed

- **Family Wizard relationship merging** - When building a family around an existing person who already has relationships, new relationships are now merged with existing ones instead of overwriting them.

---

## [0.18.0] - 2025-12-28

### Changed

- **Event person property consolidation** - Event notes now use a single `persons` array property for all event types, replacing the previous dual-property approach (`person` for single-participant events, `persons` for multi-participant events). This simplifies data management and enables multi-participant support for all event types.

  **Old format (deprecated):**
  ```yaml
  # Single-participant event
  person: "[[John Smith]]"

  # Multi-participant event
  persons:
    - "[[John Smith]]"
    - "[[Jane Doe]]"
  ```

  **New format (all events):**
  ```yaml
  persons:
    - "[[John Smith]]"
  ```

### Added

- **Event person migration step in Cleanup Wizard** - Step 11 in the Post-Import Cleanup Wizard detects and migrates event notes using the legacy `person` property to the `persons` array format. Includes preview with merge detection for notes that have both properties.

- **Migration notice for v0.18.0** - Users upgrading from v0.17.x see a one-time notice explaining the event person property change with examples and a link to the Cleanup Wizard.

### Migration

The legacy `person` property continues to be read for backward compatibility. To migrate existing notes:

1. Open the Cleanup Wizard (Control Center → Data Quality → Cleanup Wizard, or command palette)
2. Navigate to Step 11: "Migrate Event Person Properties"
3. Review detected notes and click "Apply All" to migrate

---

## [0.17.9] - 2025-12-27

### Added

- **"All places" layer in Map View** - New layer toggle in the Layers menu shows all places with coordinates, not just those referenced by person events. Useful for viewing standalone places on custom maps, especially for fictional worlds where places may not yet have associated person notes.

- **Pixel coordinate support in Create Place modal** - When creating fictional, mythological, or legendary places, the modal now shows pixel coordinate fields (X/Y) instead of geographic coordinates. These coordinates are used for pixel-based custom maps.

- **Wikilink support for custom map images** - Map image paths can now use wikilink syntax (`[[path/to/image.png]]`), allowing Obsidian to automatically update paths when images are moved or renamed. The Create Map modal now stores image paths as wikilinks by default.

- **Map auto-refresh on note changes** - Maps now automatically refresh when place or person notes are modified, using Obsidian's metadata cache events for reliable change detection.

### Fixed

- **Dynamic block order ignored during import** - Fixed issue where the Media block always appeared last in person notes regardless of the configured order. Dynamic blocks now respect the order specified in `dynamicBlockTypes`, placing Media first by default.

- **Custom maps not appearing in gallery after creation** - Fixed issue where newly created custom maps wouldn't appear in the Control Center Maps tab gallery. The gallery now correctly detects maps using the `cr_type: map` frontmatter property in addition to the legacy `type: map` format.

- **Pixel coordinate format mismatch** - Fixed issue where places with pixel coordinates weren't appearing on maps. The map data service now reads multiple property formats (`pixel_x`/`pixel_y`, `custom_coordinates_x`/`custom_coordinates_y`) for compatibility.

---

## [0.17.8] - 2025-12-27

### Fixed

- **Gramps import: multiple events of same type silently skipped** - Fixed issue where multiple events of the same type with the same participants (e.g., several residence events for a married couple) would only import the first event. The filename now includes the event date to ensure uniqueness. (#43)

---

## [0.17.7] - 2025-12-27

### Changed

- **Events base: unified Person(s) column** - The events base template now uses a single "Person(s)" column that displays clickable links for both single-person events (`person` property) and multi-person events (`persons` property). Previously, these were separate columns or the multi-person events didn't display properly.

### Fixed

- **Create Person modal crash with array collection property** - Fixed TypeError when opening the Create Person modal if any person note had a `collection` property stored as an array instead of a string. The modal now safely handles array-type collection values.

- **Gramps import: events at same place incorrectly deduplicated** - Fixed issue where multiple events of the same type, with the same participants, on the same date, but at different places were incorrectly treated as duplicates. The deduplication key now includes place name, ensuring events like multiple residence records are imported correctly.

---

## [0.17.6] - 2025-12-27

### Fixed

- **Gramps import: family events missing Person field** - Events with multiple participants (marriage, divorce, residence, etc.) now correctly populate the Person property when importing from Gramps. These events are attached to families rather than persons in Gramps XML, and are now properly linked to both spouses.

- **"Create person note" command opening retired tab** - The command palette "Charted Roots: Create person note" command now directly opens the Create Person modal instead of attempting to open the retired Data Entry tab in Control Center.

---

## [0.17.5] - 2025-12-27

### Added

- **Research Level property for tracking research progress** - New `research_level` property (0-6) on person notes to track progress toward GPS-compliant documentation, based on Yvette Hoitink's "Six Levels of Ancestral Profiles" system. Levels range from 0 (Unidentified) to 6 (Biography). Select via dropdown in Create/Edit Person modal.

- **Research Level in Gaps Report** - The Gaps Report now includes research level features: filter by research level (e.g., show only Level 0-2), sort by research level, display level in report table, and summary statistics showing count of ancestors at each level range.

- **Research Level export to GEDCOM and Gramps** - The `research_level` property is exported as `_RESEARCH_LEVEL` custom tag in GEDCOM files and as `<attribute type="Research Level">` in Gramps XML exports.

- **Research Level import from GEDCOM and Gramps** - When importing files that contain research level data (from previous Charted Roots exports), the `_RESEARCH_LEVEL` tag (GEDCOM) or "Research Level" attribute (Gramps) is automatically imported back into person notes.

- **Research Level in Bases** - Person bases include "By research level" grouped view, "Needs research" filtered view (Level ≤ 2), and "Not assessed" filtered view for tracking research progress across your tree.

- **Media folder selection for Gramps .gpkg import** - When importing `.gpkg` files with bundled media, a dropdown in the Preview step lets you choose the destination folder: configured media folders from Preferences, the default `Charted Roots/Media`, or a custom path. Option to preserve the original folder structure from the package.

### Changed

- **Control Center Tools icons and order** - Updated icons: Reports now uses `file-text`, Statistics uses `chart-bar-decreasing`. Reordered tools to: Templates, Media Manager, Family Chart, Import/Export, Reports, Statistics.

### Fixed

- **Source Media Linker showing already-linked images** - The Link Media to Sources wizard now excludes images that are already attached to a source note. Previously, images would appear in the list even after being linked, requiring manual tracking of which files had been processed.

- **Townships incorrectly flagged as non-standard place types** - Townships are now recognized as valid administrative divisions and will no longer appear in the "Standardize place types" cleanup wizard. Added `township` as a built-in place type at hierarchy level 6 (below county), appropriate for US Midwest/Northeast civil townships.

---

## [0.17.4] - 2025-12-27

### Added

- **Statistics entry in Control Center Tools** - Added Statistics to the Tools group in Control Center, providing an entry point to the Statistics View. Previously, Statistics View was only accessible via command palette after the old Statistics tab was retired.

- **Configured media folders in Bulk Media Linker** - The Link Media to Sources wizard now offers to use media folders configured in Control Center → Preferences. When folders are configured, users can select from them with checkboxes or switch to custom folder entry. Files from multiple configured folders are combined automatically.

### Fixed

- **Table overflow in Bulk Media Linker** - Fixed table columns spilling outside the modal. Column widths are now fixed with proper proportions, and the Apply button is no longer cut off.

- **Pagination in Bulk Media Linker** - Link step now shows 10 rows at a time with "Show more" and "Show all" buttons, preventing UI sluggishness with large file sets.

- **Focus loss in Media folder field** - Fixed input losing focus on every keystroke. Now only updates when selecting from suggestions or pressing Enter, matching the Control Center preferences behavior.

- **Individual Apply button per row** - Added ability to apply links one at a time from the Link step, with checkmark showing applied status. Review and Execute steps now show only pending (unapplied) links.

- **Confidence dot alignment** - Confidence indicator dots are now vertically aligned with filenames in a styled wrapper div.

---

## [0.17.3] - 2025-12-26

### Fixed

- **Duplicate name wikilinks in GEDCOM import** - When importing GEDCOM files with duplicate names (e.g., two people named "John Smith"), the relationship wikilinks now correctly point to the actual filenames (e.g., `[[John Smith]]` and `[[John Smith-1]]`) instead of all pointing to the same name.

- **Duplicate event note filenames during import** - Fixed "File already exists" errors when importing GEDCOM files with multiple events that generate identical titles (e.g., multiple "Marriage of Unknown and Unknown" events). The importer now tracks created filenames during the import session and includes retry logic to handle race conditions with vault indexing.

- **Missing space in timeline block** - Fixed missing space between event type and "in" preposition (e.g., "Bornin" now correctly displays as "Born in").

- **Bases not created during import** - Bases files (people.base, places.base, etc.) are now created after import even when some errors occur. Previously, any import error would prevent bases creation even though notes were successfully created.

---

## [0.17.2] - 2025-12-26

### Added

- **Resume unsaved work in create entity modals** - All create entity modals (Person, Place, Event, Organization, Source) now persist form state when closed without saving. When reopened, a banner offers to restore the previous session's data or discard it. State expires after 24 hours. Edit mode is excluded from persistence.

### Fixed

- **Base templates not created on import** - Import Wizard now auto-creates base templates (people, places, events, sources, organizations) after successful imports, matching the Control Center behavior.

- **Dynamic blocks not updating on frontmatter changes** - The `canvas-roots-media`, `canvas-roots-timeline`, and `canvas-roots-relationships` code blocks now automatically re-render when frontmatter properties are modified, without requiring the note to be closed and reopened.

### Changed

- **Dynamic block order** - When automatically added to person notes, dynamic code blocks now appear in the order: Media, Timeline, Relationships (previously Timeline, Relationships, Media).

- **Dynamic blocks enabled by default** - The "Include dynamic blocks" option in Create Person modal is now enabled by default, automatically adding Media, Timeline, and Relationships code blocks to new person notes.

---

## [0.17.1] - 2025-12-25

### Added

- **Excalidraw export format** - Generate Tree wizard now supports Excalidraw output. Creates hand-drawn style family tree diagrams using ExcalidrawAutomate API when available, with JSON fallback.
  - Smart connectors that adapt when elements are moved
  - Spouse relationships styled with dashed lines
  - Wiki links on nodes for navigation back to person notes
  - Rich labels with name, dates, and birthplace
  - Dedicated style options step with drawing style, font, fill, and stroke settings
  - Node content options: name only, name + dates, or name + dates + places

### Fixed

- **Text centering in Excalidraw boxes** - Text labels are now properly centered within node rectangles.

- **Duplicate boxes in Excalidraw output** - Fixed issue where using the EA box parameter created visible text containers alongside rectangles.

- **Wiki link brackets in labels** - Wiki link syntax (`[[Link]]`) is now stripped from text labels; links are set via the element's link property instead.

- **Temporary canvas file cleanup** - Excalidraw export no longer leaves behind an intermediate `.canvas` file.

- **Generate button reactivity** - Canvas name input changes now immediately update the Generate button state.

### Internal

- **ESLint compliance** - Fixed all non-sentence-case lint issues across the codebase:
  - Replaced TFile casts with instanceof checks
  - Replaced inline style assignments with CSS classes
  - Fixed floating promises with void operator
  - Fixed case declarations in switch blocks
  - Changed Vault.delete/trash to FileManager.trashFile
  - Removed unused imports and eslint-disable directives
  - Added `crc-clickable` CSS utility class

### Changed

- **Person note context menu** - Simplified to single "Generate visual tree" entry that opens the unified wizard with the person pre-selected.

- **Default canvas name** - Generate Tree wizard step 6 now pre-populates with "Family Tree" instead of requiring manual entry.

---

## [0.17.0] - 2025-12-25

### Added

- **Post-Import Cleanup Wizard** - 10-step guided wizard that consolidates post-import data quality operations into a single sequential workflow. Accessible via command palette ("Charted Roots: Post-Import Cleanup Wizard"), Data Quality tab, or Import Wizard completion screen.
  - Step 1: Quality Report (review-only with collapsible categories)
  - Step 2: Fix Bidirectional Relationships
  - Step 3: Normalize Date Formats
  - Step 4: Normalize Gender Values
  - Step 5: Clear Orphan References
  - Step 6: Migrate Source Properties (indexed to array format)
  - Step 7: Standardize Place Variants (interactive)
  - Step 8: Bulk Geocode (interactive with progress)
  - Step 9: Enrich Place Hierarchy (interactive)
  - Step 10: Flatten Nested Properties

- **Wizard session persistence** - Cleanup wizard state is saved to settings, allowing interrupted sessions to be resumed. Progress, completed steps, and pending issues are preserved.

- **v0.17.0 Migration Notice** - One-time workspace tab displayed when upgrading to v0.17.0, explaining the source format change and providing direct access to the Cleanup Wizard.

- **Sources property alias support** - The `sources` property can now be aliased like other person note properties (Settings > Property Aliases).

### Changed

- **Source property format** - Sources are now stored as a YAML array (`sources: [...]`) instead of indexed properties (`source`, `source_2`, `source_3`). All importers (GEDCOM, Gramps, GEDCOM X, CSV) now write the array format.

### Breaking Changes

- **Indexed source format removed** - The legacy indexed source format (`source`, `source_2`, `source_3`) is no longer parsed. Notes using this format will not have their sources recognized until migrated. Use the Cleanup Wizard Step 6 to convert existing notes to the array format.

---

## [0.16.1] - 2025-12-25

### Added

- **Expandable parse warnings** - Import wizard Step 4 (Preview) now shows a clickable warning section with chevron icon. Click to expand and view up to 10 warning details, with "...and X more" shown if there are additional warnings.

### Fixed

- **Duplicate event detection in Gramps import** - Gramps importer now detects and skips duplicate events (same type + person + date) that may exist in the source file. Duplicate count is displayed in the import summary.

- **Progress reporting for relationships phase** - Gramps import progress indicator now updates during the relationship linking phase, which previously showed no progress while relationships were being established.

- **Media block missing from dynamic blocks** - All importers (GEDCOM, Gramps, CSV, GEDCOM X) now include the media block in person notes by default. Previously only timeline and relationships blocks were created.

---

## [0.16.0] - 2025-12-24

### Added

- **Import/Export Hub** - New modal-based hub accessible from the Tools group, replacing the Import/Export tab in Control Center. Two-card layout for launching Import or Export wizards.

- **Import Wizard** - 7-step wizard for importing genealogical data:
  1. Format selection (GEDCOM, GEDCOM X, Gramps, CSV)
  2. File picker with drag-and-drop support
  3. Options (entity types, target folder, conflict handling)
  4. Preview (entity counts, validation warnings)
  5. Import progress with real-time log
  6. Optional reference numbering (Ahnentafel, d'Aboville, Henry, Generation)
  7. Completion summary

- **Dynamic blocks import option** - Import Wizard Step 3 now includes a toggle for dynamic blocks, which was inadvertently omitted from the initial wizard implementation. Controls whether timeline, relationships, and media renderer blocks are included in imported person notes. Enabled by default.

- **Excalidraw output format** - Generate Tree wizard now includes Excalidraw as an output format, which was inadvertently omitted from the initial unified wizard implementation in an earlier release. Creates hand-drawn style diagrams that can be annotated and exported to SVG or PNG via the Excalidraw plugin.

- **Export Wizard** - 6-step wizard for exporting genealogical data:
  1. Format selection (GEDCOM, GEDCOM X, Gramps, CSV)
  2. Folder selection (preference folders or custom)
  3. Privacy controls (exclude/redact living persons) and entity inclusions
  4. Preview with entity counts and privacy summary
  5. Export progress with real-time log
  6. Completion with download options

- **Living person privacy controls** - Export wizard Step 3 includes privacy options: exclude living persons entirely, redact sensitive details, or include all. Configurable threshold for "born within X years" living determination.

- **Reports Hub** - New hub modal accessible from Tools group. Provides card-based access to both Narrative Reports (Report Wizard) and Visual Charts (Unified Tree Wizard) from a single entry point.

- **Grouped navigation sidebar** - Control Center sidebar reorganized into logical groups with dividers:
  - **Entities**: People, Events, Places, Sources, Organizations, Universes, Collections
  - **Data & Structure**: Data Quality, Schemas, Relationships
  - **Output**: Canvas Trees, Maps
  - **Tools**: Templates, Media Manager, Family Chart, Reports, Import/Export (open modals/views instead of tabs)
  - **Settings**: Preferences

- **Tools group** - New navigation group containing entries that open modals or dedicated views instead of switching tab content. Entries show a ↗ indicator to distinguish from regular tabs.

### Changed

- **Import/Export UI** - Moved from tab-based interface in Control Center to modal-based wizards, improving discoverability and providing step-by-step guidance.

- **Control Center sidebar styling**:
  - Removed "Navigation" header (redundant with grouped layout)
  - Compact styling with optimized spacing for desktop and mobile
  - Tighter padding and improved text sizing (13px)

### Removed

- **Import/Export tab** - Removed from Control Center's Data & Structure group. Import/Export is now accessed via the hub modal in the Tools group.

- **Guide tab** - Removed from Control Center. Getting Started and Essential Properties documentation moved to the wiki.

- **Statistics tab** - Removed from Control Center. Statistics are now accessed via the dedicated Statistics leaf view (View → Open Statistics).

---

## [0.15.3] - 2025-12-24

### Added

- **Report Wizard Modal** - New multi-step wizard for the Report Generator with 5 steps: Report Type, Subject, Content Options, Output & Styling, and Generate. Category filtering, dynamic options based on report type, and streamlined navigation replace the previous single-modal layout.

- **ODT Export for Reports** - Export all 13 report types as OpenDocument Text (.odt) files for editing in LibreOffice Writer or Microsoft Word. Includes optional cover page with title, subtitle, and notes. Uses JSZip for ZIP archive creation with manual XML generation.

- **ODT Export for Visual Trees** - The unified tree wizard now supports ODT output format. Title field in Step 5 is used for document title and filename. Tree image is embedded in the ODT document.

- **Visual Tree PDF Quality Improvements** - Increased canvas scale from 2× to 4× for crisp PDF output. Removed explicit height constraint to preserve aspect ratio. Visual Tree PDFs now match Family Chart PDF sharpness.

### Changed

- **Report Generator UI** - The Report Generator modal has been replaced with a wizard-style interface. Previous single-screen layout is now split into logical steps for better UX.

---

## [0.15.2] - 2025-12-23

### Added

- **Create universe command** - New command palette entry "Charted Roots: Create universe" opens the Universe Wizard directly, making universe creation more discoverable.

- **Universes tab always visible** - The Universes tab is now always shown in the Control Center sidebar, even when no universes exist. Previously it was hidden until the first universe was created.

- **Quick Actions tiles in Universes tab** - The Universes tab now displays a tile-based quick actions bar with three options: Create Universe, Date Systems (links to Events tab), and Custom Maps (links to Places tab). These tiles are always visible for quick access.

- **Canvas settings moved to Canvas Trees tab** - The "Canvas layout" and "Canvas styling" cards have been moved from the Preferences tab to the Canvas Trees tab, placing them in context with tree generation features.

- **Preserve media folder structure on import** - New toggle in Gramps .gpkg import to recreate the original subfolder hierarchy from the source instead of importing all media to a flat folder. Useful for users who organize media by family or category.

- **Link media action in People tab** - New "Link media" action in the People tab Actions card opens the Media Manager modal for browsing, linking, and organizing media files.

### Changed

- **Universe discoverability** - Users can now discover and create universes from three entry points: command palette, Universes tab tiles, or Statistics tab. Previously the only entry was buried in the Statistics tab.

### Fixed

- **Dynamic media gallery block not created during import** - Fixed an issue where the "Include dynamic content blocks" toggle during GEDCOM and Gramps import would create timeline and relationships blocks but not the media gallery block. The `media` block type was missing from the import configuration.

---

## [0.15.1] - 2025-12-23

### Added

- **Family Chart Export Wizard** - Replaced the export dropdown menu with a multi-step wizard modal. Features 5 quick presets (Quick Share, High Quality, Print Ready, Editable, Document), format-specific options, scope selection (full tree or limited depth), and progress tracking with phase indicators.

- **ODT export format** - Export Family Chart as OpenDocument Text (.odt) files for editing in LibreOffice Writer or Microsoft Word. Enables merging visual tree charts with narrative text for comprehensive family history documents. Uses JSZip for ZIP archive creation with manual XML generation.

- **Family Chart Styling Panel** - Added palette button to toolbar for quick theme access. Choose from 5 preset themes (Classic, Pastel, Earth Tones, High Contrast, Monochrome) or customize all 7 chart colors via the Customize modal with live preview.

- **Export progress modal** - Real-time progress tracking during export with phase indicators (Preparing, Embedding avatars, Rendering, Encoding, Saving), progress bar, and cancel button.

- **Export settings memory** - Last-used export format, scale, page size, layout, orientation, and cover page settings are remembered for next export.

- **Dynamic content blocks for Gramps import** - Added "Include dynamic content blocks" toggle to Gramps XML/.gpkg import, matching the existing GEDCOM import option. When enabled, imports include timeline and family relationship blocks in person notes.

### Changed

- **Export button behavior** - The toolbar export button now opens the Export Wizard instead of a dropdown menu, providing better discoverability and preventing accidental exports.

- **Custom colors on chart initialization** - Chart colors are now applied from settings when the chart initializes, not just when changed via the styling panel.

---

## [0.15.0] - 2025-12-22

### Added

- **Universal Media Linking** - The `media` property is now supported on Person, Event, Place, and Organization notes (previously only Source notes). Link photos, documents, and scanned records to any entity type.

- **Gramps Package (.gpkg) media import** - Import `.gpkg` files with bundled media. Media files are extracted to your configured media folder and linked to corresponding Person, Event, Place, and Source notes via the `media` frontmatter property.

- **Dynamic media gallery block** - New `canvas-roots-media` code block renders an inline gallery of linked media files in reading view. Configurable columns (2-6 or auto), thumbnail size (small/medium/large), and custom title.

- **Editable media gallery mode** - Set `editable: true` in the media block to enable drag-and-drop reordering. First item becomes the thumbnail (used for Family Chart avatars). Frontmatter is updated automatically on drop.

- **Freeze media gallery to callout** - Click the freeze button (❄️) to convert a dynamic media gallery to a static `[!info|cr-frozen-gallery]` callout with embedded image links.

- **Media gallery Style Settings** - Gallery appearance (gap, max height/width, border radius, object-fit) customizable via the Style Settings plugin.

- **Media folder filtering** - New settings to specify which folders to scan for media files. Used by Find Unlinked Media, Media Manager stats, and Media Picker.

### Changed

- **Import wizards include media blocks** - When "Include dynamic blocks" is enabled, imported person notes now include all three block types (timeline, relationships, media). Media blocks are included with `editable: true` by default.

- **Insert dynamic blocks includes media** - Context menu action and bulk folder operation now add the media block alongside timeline and relationships blocks.

### Fixed

- **ESLint compliance** - Fixed all non-sentence-case ESLint errors for Obsidian plugin review compliance: async functions without await, misused promises in event handlers, floating promises, unused variables, and TFile cast issues.

---

## [0.14.0] - 2025-12-21

### Added

- **Visual Tree Charts** - Generate printable PDF tree diagrams with positioned boxes and connecting lines. Four chart types available: Pedigree (ancestors), Descendant, Hourglass (both directions), and Fan Chart (semicircular).

- **Recent Files tracks created notes** - Notes created via Dashboard quick-action tiles (Person, Event, Source, Place) now immediately appear in the Recent Files section.

- **Unified Tree Wizard** - Single wizard for both Canvas and PDF tree generation. Dynamic step flow branches based on output format selection. Replaces the previous separate wizards for a streamlined experience.

- **Visual Trees section in Statistics Dashboard** - Dedicated section for visual tree PDF generation, separate from text-based reports. Features card-based UI with custom tree icons for each chart type.

- **Custom tree icons** - Four new SVG icons registered with Obsidian: `cr-pedigree-tree`, `cr-descendant-tree`, `cr-hourglass-tree`, `cr-fan-chart`. Used across Statistics View, Report Generator, and Tree Wizard.

- **Visual Tree PDF options** - Page size (Letter, A4, Legal, Tabloid, A3), orientation (portrait/landscape), node content (name only, with dates, with dates and places), color schemes (default, grayscale, generational), and large tree handling (auto-scale, auto-page-size, limit-generations).

- **Tree type badges in wizard** - Chart type shown as badge in step headers after selection for clear context during wizard navigation.

### Changed

- **Statistics Dashboard reorganized** - Visual Trees now has its own expandable section at the top, separate from the Generate Reports section. Clearer separation between graphical tree outputs and text-based reports.

- **Report categories updated** - Added `visual-trees` category to report metadata. Visual tree reports filtered from main Reports section and moved to dedicated Visual Trees section.

---

## [0.13.6] - 2025-12-20

### Added

- **Control Center Dashboard** - Transformed the Status tab into a Dashboard with quick-action tiles for mobile-friendly access to common operations. Features 9 tiles (Person, Event, Source, Place, Report, Statistics, Import, Tree Output, Map), collapsible Vault Health section, and Recent Files list.

- **Dashboard quick-action tiles** - One-tap access to create entities and open views. 3×3 grid on desktop, 2×2 on mobile for touch-friendly tap targets.

- **Recent Files section** - Shows last 5 accessed genealogical files with entity type badges. Click to open, right-click for context menu with type-specific actions.

- **Recent Files context menu** - Right-click recent items for type-specific actions:
  - All types: "Open note"
  - Place: "Open in Map View" (zooms to coordinates if available)
  - Person: "Open in Family Chart"

- **First-run welcome notice** - Dismissible welcome message for new users orienting them to the renamed Dashboard tab (formerly Status).

- **Recent file tracking service** - New `RecentFilesService` tracks file access via Charted Roots features (People tab "Open" button, create modals). Stores up to 5 recent files in settings.

---

## [0.13.5] - 2025-12-20

### Added

- **Extended report types** - Six new report types expanding beyond traditional genealogical reports: Source Summary (per-person source documentation), Timeline Report (chronological events), Place Summary (location-focused), Media Inventory (media with entity links), Universe Overview (fictional world stats), and Collection Overview (user collection summary).

- **Report category selector** - Reports are now organized into categories (Genealogical, Research, Timeline, Geographic, Summary) for easier discovery in the Generate Report modal.

- **PDF custom title options** - Override default report titles with custom text. Control title scope: cover page only, headers only, or both.

- **PDF custom subtitle** - Add subtitle text below the main title on cover pages.

- **PDF cover notes** - Add extended notes section to cover pages for additional context or instructions.

- **PDF date format option** - Choose between MDY (12/20/2025), DMY (20/12/2025), or YMD (2025-12-20) for dates in generated PDFs. Dropdown shows example dates using today's date for clarity.

---

## [0.13.4] - 2025-12-20

### Added

- **PDF report export** - Export all 7 report types (Ahnentafel, Family Group Sheet, Individual Summary, Gaps Report, Register Report, Pedigree Chart, Descendant Chart) as professionally styled PDF documents. PDFs are generated locally with no internet connection required.

- **PDF page size option** - Choose between A4 and Letter page sizes when exporting to PDF.

- **PDF cover page** - Optional title page with report name, subject name, generation date, and plugin branding. Enable via "Include cover page" toggle in PDF options.

- **PDF logo/crest support** - Add a custom logo or family crest to PDF cover pages. Images are automatically resized to reduce file size while maintaining quality.

---

## [0.13.3] - 2025-12-19

### Added

- **Context-specific person picker titles** - The person picker modal now shows context-aware titles and subtitles based on the action being performed. When assigning reference numbers, users see clear explanations like "This person will be #1; ancestors are numbered upward" for Ahnentafel or "This person will be generation 0" for generation numbering.

### Fixed

- **Source media linker dropdown styling** - Fixed dropdown styling conflict in the "Link media to existing sources" wizard. The dropdown now uses Obsidian's native styling, avoiding conflicts with themes, snippets, and GTK styling on Linux.

### Changed

- **Guide tab card footer links** - Restyled documentation links at the bottom of Guide tab cards to use consistent separator styling matching the "View full statistics" pattern elsewhere.

### Removed

- **Dead GEDCOM v1 importer code** - Removed ~600 lines of dead code from the legacy GEDCOM importer that was superseded by the v2 streaming implementation.

---

## [0.13.2] - 2025-12-19

### Added

- **Place linking for birth/death locations** - The Create Person modal now supports linking birth and death places to existing place notes, using the same pattern as family relationships. Click "Link" to open a place picker that searches all place notes, with options to filter by category. If the place doesn't exist, click "Create new place" to create it on-the-fly. Places are stored with dual fields (birth_place + birth_place_id) for reliable resolution.

---

## [0.13.1] - 2025-12-18

### Added

- **Family Chart horizontal orientation** - New option in Layout menu to switch between vertical (top-to-bottom) and horizontal (left-to-right) tree layouts.

- **Family Chart depth limits** - Control how many generations are displayed with new Depth menu. Set ancestry depth (1-5 generations or unlimited) and descendant depth independently.

- **Family Chart display options** - New Display menu with visibility controls:
  - Show/hide siblings of root person
  - Show unknown parent placeholder cards
  - Sort children by birth date
  - Hide living persons (privacy mode for people without death dates)

- **Family Chart toolbar reorganization** - Split the Layout menu into three focused menus: Layout (orientation, spacing), Display (card options, visibility), and Depth (generation limits).

### Improved

- **Reference numbers modal polish** - Redesigned the "Assign reference numbers" modal with icons, clearer descriptions explaining what each system is best for, person count preview, and Learn more link to documentation.

### Fixed

- **Family Chart info panel not resetting** - Fixed bug where the info panel continued showing the previous person's details when switching root person via context menu.

- **Reference numbers prompt after all imports** - Fixed inconsistency where GEDCOM 5.5.1 and CSV imports did not offer to assign reference numbers after import. All import types (GEDCOM, GEDCOM X, Gramps, CSV) now consistently show the "Assign reference numbers" prompt after successful imports.

---

## [0.13.0] - 2025-12-18

### Added

- **Universe management** - First-class universe notes for organizing fictional worlds. Create universes via the Universe Wizard with optional custom calendars, maps, and validation schemas. Universe notes track metadata (name, author, genre, status) and link related entities.

- **Universe notes card** - New table-based UI in Control Center > Universes tab matching the Person notes pattern. Features filter dropdown (all/active/draft/archived/has-entities/empty), sort dropdown (name/created/entities), search input, and row interactions (click to edit, file icon to open, right-click context menu).

- **Orphan universe detection** - Automatic detection of universe values referenced by entities but lacking corresponding universe notes. Create notes directly from the orphan list with matching cr_id to preserve entity references.

- **Universes base template** - New Universes base template available in Control Center > Guide and Control Center > Bases for spreadsheet-like universe management.

- **Universe folder context menu** - Right-click the configured Universes folder for quick access to create universe, set folder as universes folder, and add essential universe properties to notes.

- **Folder-type specific context menus** - Context menu actions now adapt to folder type. People folder shows GEDCOM import and relationship scan; Places folder shows geocoding actions; Universes folder shows universe-specific actions; etc.

- **Create all bases button** - New "Create all bases" button in Control Center > Guide > Base templates card creates all six base files (people, places, events, organizations, sources, universes) at once.

- **Auto-create bases on import** - Bases are automatically created after GEDCOM, GEDCOM X, and Gramps imports, making imported data immediately viewable in Obsidian's Bases feature.

### Changed

- **ESLint upgrade to v9 flat config** - Migrated from ESLint v8 legacy config to v9 flat config with `eslint-plugin-obsidianmd` for Obsidian-specific linting rules.

- **Statistics tab universes card** - Redesigned with Setting-style layout showing universe names with entity counts on left, Open buttons on right.

### Fixed

- **Edit universe button** - Control Center > Universes tab Edit button now opens EditUniverseModal instead of just opening the file.

- **Delete universe action** - Added delete universe option to file context menus with confirmation dialog.

- **Data quality analysis TypeError** - Fixed crash when analyzing data with non-string date values (e.g., from Gramps XML imports). parseYear and isStandardDateFormat now handle number and unknown types.

- **Code quality improvements** - Fixed 71 ESLint errors/warnings including inline style assignments (now using CSS classes), type safety issues, unused directives, and deprecated API usage.

- **People base filename** - Changed default filename from `family-members.base` to `people.base` to match the button label and be consistent with other base filenames.

---

## [0.12.14] - 2025-12-17

### Changed

- **Family chart info panel** - Replaced the hidden edit mode toggle with a dedicated info panel that opens when clicking any person card. The panel shows person details in read-only mode with an explicit "Edit" button to switch to edit mode. Includes clickable relationship links to navigate between family members.

### Fixed

- **Family chart zoom preserved on card click** - Clicking a person card no longer resets the zoom level and re-centers the view. The current view is preserved when opening the info panel.

---

## [0.12.13] - 2025-12-17

### Added

- **Log export button** - New "Export logs" button in Developer settings allows saving the current session log to a file with optional obfuscation of personal data.

### Fixed

- **Duplicate children_id during Gramps import** - Fixed a race condition where bidirectional sync added relationship IDs while import was still in progress, causing duplicate `children_id` entries. Now all import operations (Gramps, GEDCOM, GEDCOM X, CSV) disable bidirectional sync during the import process.

---

## [0.12.12] - 2025-12-17

### Added

- **Configurable sex normalization** - New setting in Preferences to control how "Normalize sex values" behaves: Standard (GEDCOM M/F), Schema-aware (respects custom sex enum values defined in schemas), or Disabled (never normalize). Schema-aware mode allows worldbuilders to protect custom sex values like "hermaphrodite" or "neuter" from normalization.

- **Universe field in Edit Person modal** - The universe dropdown now appears when editing a person via the file explorer context menu, matching the behavior when editing from the Control Center People tab.

### Changed

- **GEDCOM-standard sex values** - Canonical sex values changed from `male`/`female`/`nonbinary`/`unknown` to GEDCOM-standard `M`/`F`/`X`/`U`. Built-in synonyms automatically map common values (`male`→`M`, `female`→`F`, etc.) without requiring manual configuration.

### Fixed

- **Sex value normalization** - "Normalize sex values" now works out of the box with built-in mappings. Previously required manual value alias configuration to detect any changes.

- **Edit Person modal universe field** - Fixed universe dropdown not appearing when opening Edit Person modal from file explorer context menu. The modal now correctly loads existing universes from both place and person notes.

---

## [0.12.11] - 2025-12-17

### Changed

- **Tree Output tab two-panel layout** - Redesigned Tree Output tab with a two-panel layout: scrollable configuration accordions on the left, sticky preview and generate buttons on the right. Root person picker is now compact with inline radio buttons, names, and dates.

### Fixed

- **Tree Output accordion labels truncating** - Fixed setting labels in accordion sections (like "Tree type") being cut off due to constrained flexbox layout.

- **Statistics tab label wrapping** - Fixed Data completeness card labels wrapping mid-word by adding proper whitespace handling.

---

## [0.12.10] - 2025-12-16

### Added

- **Step & adoptive parent support** - Comprehensive support for non-biological parent relationships, improving GEDCOM import fidelity and enabling accurate representation of blended families.

- **GEDCOM pedigree parsing** - Parse `PEDI` tags (`birth`, `step`, `adop`, `foster`) from GEDCOM files. Step-parents and adoptive parents are imported to dedicated frontmatter fields. Biological parent conflicts are no longer triggered by step/adoptive relationships.

- **Gramps XML pedigree parsing** - Parse `mrel` and `frel` attributes from Gramps `<childref>` elements. Relationship types mapped: `Birth` → biological, `Stepchild` → step-parent, `Adopted` → adoptive parent. Uses the same dedicated frontmatter fields as GEDCOM import.

- **GEDCOM X lineage type parsing** - Parse lineage type facts (`AdoptiveParent`, `StepParent`, `BiologicalParent`, etc.) from GEDCOM X parent-child relationships. Uses the same dedicated frontmatter fields as GEDCOM and Gramps import.

- **Step/adoptive parent export** - Export step-parent and adoptive parent relationships to all three formats. GEDCOM 5.5.1 exports PEDI tags (`step`, `adop`) under FAMC references. Gramps XML exports `mrel`/`frel` attributes (`Stepchild`, `Adopted`) on childref elements. GEDCOM X exports ParentChild relationships with lineage type facts.

- **Canvas tree visualization** - Step-parent relationships shown with dashed lines; adoptive parent relationships shown with dotted lines. New toggles in tree generation: "Include step-parents" and "Include adoptive parents". Relationship labels displayed on non-biological parent edges.

- **Create/Edit Person modal** - New "Step & adoptive parents" section for manual entry of stepfather, stepmother, adoptive father, and adoptive mother.

- **Statistics parent breakdown** - Parent type breakdown in Data Completeness section (biological vs. step vs. adoptive). New quality metrics: "Biologically orphaned" (no biological parents but has step/adoptive) and blended family insights showing count of people with multiple parent types.

- **New frontmatter fields** - `stepfather_id`, `stepmother_id` (arrays for multiple), `adoptive_father_id`, `adoptive_mother_id` with corresponding property aliases.

- **New relationship types** - Built-in `step_parent`, `step_child`, `adoptive_parent`, `adopted_child` relationship types with distinct line styles.

---

## [0.12.9] - 2025-12-16

### Added

- **Family Chart "Open note" button** - Person cards in the Family Chart view now have a small button in the top-right corner that opens the person's note in a new tab. Works in both view and edit modes, providing quick access to notes without changing the card click behavior.

- **Statistics Dashboard** - New workspace view with comprehensive vault metrics including entity counts, data completeness percentages, gender distribution, and date range spanning all entities. Access via Control Center Statistics tab or command palette.

- **Data quality analysis** - Quality section with severity-coded alerts (error/warning/info) for date inconsistencies, missing birth/death dates, orphaned people, incomplete parents, unsourced events, and places without coordinates. All issues are expandable with drill-down to see affected records.

- **Top lists with drill-down** - Interactive lists for top surnames, locations, occupations, and sources. Click any item to expand and see all matching people as clickable chips with right-click context menu and hover preview.

- **Extended statistics** - Demographic analysis including longevity (average lifespan by birth decade and location), family size patterns, marriage patterns (age at marriage by sex, remarriage rates), migration flows (birth-to-death location changes with top routes), source coverage by generation, and timeline density with gap detection.

- **Genealogical reports** - Generate formatted reports from the Statistics Dashboard:
  - **Family Group Sheet** - Single family unit with parents, marriage, and children
  - **Individual Summary** - Complete record of one person with all events and sources
  - **Ahnentafel Report** - Numbered ancestor list (1=subject, 2=father, 3=mother, etc.)
  - **Gaps Report** - Analysis of missing data by category
  - **Register Report** - Descendants with NGSQ-style numbering
  - **Pedigree Chart** - Ancestor tree in markdown format
  - **Descendant Chart** - Descendant tree in markdown format

### Fixed

- **Orphaned people calculation** - Fixed bug where orphaned people count showed negative values due to incorrect subtraction of overlapping sets. Now correctly filters for people with no relationships at all.

---

## [0.12.8] - 2025-12-15

### Added

- **Dynamic content blocks** - New `canvas-roots-timeline` and `canvas-roots-relationships` code blocks that render live, computed content in person notes. Timeline shows chronological events; relationships shows family members with wikilinks. Blocks can be frozen to static markdown via toolbar button.

- **Insert dynamic blocks** - Context menu actions and command palette command to insert dynamic blocks into existing person notes. Includes bulk insert for folders with progress indicator.

- **Dynamic blocks toggle in Create Person modal** - Option to include dynamic blocks when creating new person notes.

- **Dynamic blocks toggle in import wizards** - Option to include dynamic blocks in person notes during GEDCOM/Gramps/CSV import.

### Fixed

- **Family Chart zoom buttons causing NaN%** - Fixed issue where clicking zoom in/out buttons could show "NaN%" and cause the chart to vanish. The `manualZoom` function uses D3's `scaleBy` which multiplies the scale, so zoom in now uses 1.2 (20% larger) and zoom out uses 0.8 (20% smaller) instead of the incorrect additive values. Also added validation to detect invalid zoom state and reset to fit view if needed.

- **Family Chart showing wrong person** - Fixed "Open family chart" command showing a previously loaded person instead of the current note. Now correctly opens with the current note's person, or shows a person picker if no cr_id is found.

- **Family Chart opening in sidebar** - Fixed issue where the chart could open in the sidebar instead of the main workspace. The chart now prefers opening in the main workspace when launched from a person note.

---

## [0.12.7] - 2025-12-15

### Added

- **Gramps source import** - Gramps XML import now creates source notes from `<sources>` and `<citations>` elements. Sources are linked to events via citation references. Includes repository metadata (`repository`, `repository_type`, `source_medium`), media reference handles for manual resolution (`gramps_media_refs`), and Gramps ID preservation (`gramps_handle`, `gramps_id`) for re-import scenarios.

- **Source property aliases** - Added source properties to the property alias system. Users can now customize property names for source notes (e.g., `creator` instead of `author`, `archive` instead of `repository`). Configure in Preferences → Property aliases → Source properties.

- **Gramps import progress indicator** - Gramps XML import now shows a progress modal with phase indicators and running statistics, matching the GEDCOM import experience.

- **Gramps import UI toggles** - Import options now use Obsidian-style toggles for "Create source notes", "Create place notes", and "Create event notes" with descriptions and destination folders.

- **Load testing tools** - Added parameterized GEDCOM generator (`gedcom-testing/generate-loadtest.js`) for creating test files of any size, performance testing documentation, and xxxlarge sample file (7,424 people) for stress testing.

### Changed

- **Unified Age formula in People base template** - Replaced separate `full_lifespan` and `age_now` formulas with a single intelligent `age` formula. Shows current age for living people, lifespan for deceased, and "Unknown" for people exceeding the configurable age threshold (set in Preferences → Privacy & Export). Living/Deceased view filters also use this threshold to categorize people without death dates.

### Fixed

- **Gramps XML import for compressed .gramps files** - Added support for importing gzip-compressed `.gramps` files exported from Gramps 6.x. The importer now automatically detects and decompresses gzip-compressed files. Previously, importing `.gramps` files would fail with "file does not appear to be a valid Gramps XML file" because the compressed binary data was not recognized as XML.

- **Family Chart "child has more than 1 parent" error** - Fixed crash when opening Family Chart after importing data with parent-child relationship inconsistencies. The chart now validates bidirectional relationships, only including children who explicitly reference the parent back. This handles cases where a parent's `child` field lists someone who doesn't list them as father/mother.

- **Family Chart refresh delay** - Removed unnecessary 2-second delay when chart updates from live note changes.

- **Duplicate relationship entries** - Added deduplication for `children_id` and `spouse_id` arrays to handle frontmatter with duplicate entries.

- **Duplicate child/children property after Gramps import** - Fixed inconsistent property naming where Gramps import created `child` property but bidirectional linking and data quality tools used `children`. All components now consistently use the canonical `child` property name for wikilinks (with `children_id` for cr_ids). Also fixed Gramps importer using `child_id` instead of `children_id`.

---

## [0.12.5] - 2025-12-14

### Added

- **Source Image Import Wizard** - New wizard in Sources tab (`Import` button) for bulk-importing source images. Parses filenames to extract metadata (surnames, years, record types, locations), shows confidence indicators, and creates source notes with media wikilinks attached. Supports multi-part document grouping for census pages and other multi-page records.

- **Source Media Linker Wizard** - New wizard in Sources tab (`Link` button) for attaching images to existing source notes that don't have media. Features smart suggestions with confidence scoring based on filename analysis, auto-selection of top matches, "+N more" badges showing alternative suggestions, and row highlighting for files needing manual selection.

- **Filename parser service** - New `ImageFilenameParser` service extracts metadata from common genealogy naming patterns (`surname_year_type`, `surname_given_byear_type`, descriptive names). Recognizes record type keywords (census, birth, death, marriage, military, immigration, obituary, etc.) and multi-part indicators (`_p1`, `_a`, `_page1`).

---

## [0.12.2] - 2025-12-14

### Fixed

- **Bases Lifespan formula error** - Fixed "Cannot find function 'year' on type Date" error in the Lifespan calculated property. Changed formula syntax from `.year()` method to `(date1 - date2).years.floor()` duration syntax which is correct for Obsidian Bases.

- **Bases Living/Deceased members views** - Fixed "Living members" and "Deceased members" views showing incorrect results when the `died` property exists but is empty. Changed filter from negation syntax to `isEmpty()` function which correctly handles both missing and empty property values. Added `name` to the view's `order` field so the Name column displays.

---

## [0.12.1] - 2025-12-14

### Changed

- **Family chart opens in main workspace** - "Open in family chart" now opens as a new tab in the main workspace instead of the sidebar, providing more screen space for viewing complex trees.

- **Context menu reorganization** - Moved "Open in family chart" into the "Generate tree" submenu for person notes, grouping all tree visualization options together. A separator distinguishes the interactive view from file-generating options.

### Fixed

- **cr_id prefix bug in context menu** - Fixed "Add essential place properties" and "Add essential event properties" context menu actions incorrectly adding `place_` or `event_` prefixes to generated cr_id values. The cr_type field already identifies the note type, so cr_id should be a plain UUID format.

- **Tree preview UI freeze on large trees** - Disabled tree preview for trees with more than 200 people to prevent UI freeze. Large trees show a notice with the count and recommendation to generate the canvas directly instead.

- **Canvas generation freeze on large trees** - Trees with more than 200 people now automatically use the D3 hierarchical layout instead of family-chart to prevent UI freeze. Spouse positioning may be less accurate for very large trees, but the canvas will generate successfully.

- **Canvas files not using configured folder** - Generated canvas files now correctly use the "Canvases folder" setting from Preferences. Previously, canvases were created in the vault root instead of the configured folder.

- **Excalidraw files created in wrong folder** - Exported Excalidraw files are now saved to the vault root instead of the source file's parent folder (e.g., People folder). This applies to canvas-to-Excalidraw exports, timeline exports, and person-to-Excalidraw exports.

---

## [0.12.0] - 2025-12-14

### Added

- **Calendarium integration (Phase 1)** - Charted Roots can now import calendar definitions from the [Calendarium](https://github.com/javalent/calendarium) plugin. When Calendarium is installed and enabled, an "Integrations" card appears in Control Center Preferences with a toggle to enable read-only calendar import. Imported calendars appear in the "From Calendarium" section of the Date Systems card and can be selected when creating events with fictional dates. This eliminates the need to manually recreate calendar systems that are already defined in Calendarium.

### Changed

- **Stricter ESLint rules** - Added `await-thenable`, `no-base-to-string`, `no-console`, `no-case-declarations`, and `no-constant-condition` rules. Fixed all violations across the codebase.

---

## [0.11.9] - 2025-12-13

### Fixed

- **GEDCOM import race condition with BidirectionalLinker** - Fixed race condition where the BidirectionalLinker would modify files during Phase 1 of import before Phase 2 could replace GEDCOM IDs with cr_ids. The linker is now suspended during import and resumed after completion.

- **GEDCOM import regex substring matching** - Fixed ID replacement where shorter IDs (e.g., `I2`) would match within longer IDs (e.g., `I27`), causing corrupt cr_id formats like `jvc-874-coq-7457`. Replacements are now sorted by length (descending) with lookahead assertions to prevent partial matches.

- **GEDCOM import children_id not replaced in Phase 2** - Fixed missing children_id replacement during relationship update phase. Child references from family records are now collected and replaced alongside parent/spouse IDs.

- **GEDCOM import duplicate name corruption** - Fixed post-import relationship sync corrupting data when importing files with duplicate names (e.g., two "John Smith" people). The sync matched by filename rather than cr_id, causing relationship data to merge incorrectly. GEDCOM data already contains complete bidirectional relationships, so the sync is now skipped.

- **Data quality: corrupt cr_id detection** - Added validation for cr_id format (xxx-123-xxx-123) in orphan reference checks. Invalid formats are now flagged as errors to catch import corruption.

---

## [0.11.8] - 2025-12-13

### Fixed

- **Base templates: columns not visible by default** - Fixed an issue where Obsidian Bases templates for Events, Sources, Organizations, and Places did not display columns by default. The templates had `sort` (which controls sorting direction) but were missing `order` (which controls visible columns). Added `order` arrays to the first view in each template specifying which columns to display.

- **Descendant tree canvas export missing edges** - Fixed a bug where descendant tree canvas exports had no connecting arrows between person cards. The `buildDescendantTree()` function was creating edges with `type: 'child'` which were filtered out by the canvas generator (which skips child edges to avoid duplicates). Changed edge type to `'parent'` so edges are properly included in the export.

---

## [0.11.7] - 2025-12-12

### Added

- **Context menu for person links in Parent claim conflicts** - Right-click on person names in the Parent claim conflicts table to open in new tab or new window.

---

## [0.11.6] - 2025-12-12

### Fixed

- **GEDCOM import: children_id not replaced with cr_id values** - Fixed missing `children_id` replacement logic in `gedcom-importer.ts` and incorrect field name (`child_id` instead of `children_id`) in `gedcomx-importer.ts`. Now all relationship ID fields are properly replaced during import.

---

## [0.11.5] - 2025-12-12

Obsidian plugin review fixes (Round 12) and GEDCOM import bug fix.

### Fixed

- **GEDCOM import: parent IDs not replaced for duplicate names** - Fixed an issue where `father_id`, `mother_id`, `spouse_id`, and `children_id` properties retained GEDCOM IDs (e.g., `I2060`) instead of being replaced with `cr_id` values when importing people with duplicate names. The issue occurred because the relationship update phase looked for files by regenerating the filename, which didn't account for numeric suffixes added to handle duplicates (e.g., `John Smith 1.md`). Now tracks actual file paths during creation and uses them for relationship updates. Fixed in all three importers: `gedcom-importer.ts`, `gedcom-importer-v2.ts`, and `gedcomx-importer.ts`.

### Changed

- **PR review compliance (Round 12)** - Addressed all required items from Obsidian plugin review:
  - Fixed 27 floating promises by adding `void` or `await` as appropriate
  - Fixed lexical declaration in case block by wrapping in braces
  - Fixed `element.style.visibility` usage to use `setCssStyles()` instead
  - Removed `async` keyword from 4 methods that didn't use `await`
  - Added defensive object handling in YAML serialization to prevent `[object Object]`
  - Analyzed 449 sentence case flags - all determined to be false positives (proper nouns, product names, already sentence case)

- **PR review optional items** - Cleaned up deprecated code:
  - Removed unused template exports (`BASE_TEMPLATE`, `PLACES_BASE_TEMPLATE`, `EVENTS_BASE_TEMPLATE`)
  - Replaced `Vault.delete()` with `FileManager.trashFile()` to respect user preferences
  - Removed unused variables and function definitions

---

## [0.11.4] - 2025-12-12

Obsidian plugin review fixes (Round 11) and bug fixes.

### Changed

- **PR review compliance** - Addressed all required and optional items from Obsidian plugin review:
  - Replaced direct `style.x =` assignments with `style.setProperty()` for CSP compliance
  - Wrapped async event handlers with `void (async () => {...})()` pattern to handle floating promises
  - Removed unused imports across the codebase

### Fixed

- **Person picker showing non-person notes** - Fixed the "Select person" modal (used when linking Father/Mother/Spouse in Create Person) incorrectly listing place, event, and source notes alongside person notes

- **Timeline callout vertical line alignment** - Fixed the vertical line in markdown timeline exports not aligning with the dot markers

- **People base showing non-person notes** - Fixed the "Create People base" template including place, event, and source notes in the family members view

- **Events base template not working** - Rewrote the Events base template to use correct Obsidian Bases syntax (matching the working People base template structure). Added formulas for date formatting and duration calculations

- **Improved "Create base" button descriptions** - Updated descriptions for People, Events, Places, and Sources base buttons to explain that users need to click "Properties" after creating to enable additional columns

### Docs

- **Guide tab cleanup guidance** - Added post-import cleanup content to the Guide tab:
  - New "After importing" card with quick 4-step workflow overview
  - Added "Post-import cleanup" to Key Concepts section
  - Added "Clean up data" to Common Tasks grid

- **Data Quality wiki** - Added "Post-Import Cleanup Workflow" section with recommended 8-step sequence and tool locations

- **Roadmap** - Added "Post-Import Cleanup Wizard" as high-priority planned feature

---

## [0.11.3] - 2025-12-12

GEDCOM Import: Pre-import data quality preview with place name standardization, plus Control Center UI consistency improvements.

### Added

- **GEDCOM import data quality preview** - New pre-import analysis step that catches issues before any files are created:
  - Detects date issues (death before birth, future dates, events before/after death)
  - Identifies relationship issues (gender/role mismatches, parent younger than child)
  - Flags orphan references to non-existent records
  - Shows data completeness issues (missing names, unknown sex, no dates)
  - **Place name variant standardization** during import - choose canonical forms for country names (USA vs United States) and state abbreviations (CA vs California) before files are created
  - Choices affect both file names and frontmatter property values
  - Preview modal with tabbed interface organized by issue category

- **Standardize place name variants** (Places tab) - New data quality tool for post-import standardization of common place name abbreviations and alternate forms
  - Country variants: "United States of America", "United States", "US" → "USA"
  - US state abbreviations: "California" → "CA", "New York" → "NY"
  - Bulk selection of canonical forms with one-click apply

- **Actions cards consistency** - Reorganized control center tabs for consistent Actions-first layout:
  - **Events tab**: Renamed "Event notes" card to "Actions", added "Create Events base" and "Templater templates" actions
  - **People tab**: Added "Create People base" action to existing Actions card
  - **Places tab**: New "Actions" card at top with "Create place note", "Templater templates", and "Create Places base" actions
  - Moved "Normalize place name formatting" from Batch operations to Data quality > Other tools

- **Data Quality wiki page** - New comprehensive documentation covering all data quality tools, batch operations, and best practices

- **Comprehensive GEDCOM edge case test file** - New test file `gedcom-testing/gedcom-sample-medium-edge-cases.ged` with 50+ intentional data quality issues for stress testing:
  - Duplicate names without distinguishing data
  - Multiple parents claiming the same child
  - Impossible dates (death before birth, future dates, parent younger than child)
  - Sex/gender conflicts with family roles
  - Circular ancestry relationships
  - Orphan references to non-existent records
  - Special characters in names (Irish, Spanish, Chinese)
  - Date format variations (ABT, BEF, AFT, ranges, question marks like "1850?")
  - Place name variations, typos, and special characters
  - Source issues (duplicates, missing titles)
  - Family issues (empty families, multiple spouses)

- **Standardize place types modal** (Places tab) - New data quality tool to convert generic place types like "locality" to standard types (city, town, village)
  - Detects places with non-standard types from GEDCOM imports
  - Bulk actions to set all places to the same type
  - Individual type selection with one-click apply
  - Shows parent place context for better decision making

- **Place notes table open buttons** - Added separate buttons to open place notes in new tab or new window

### Changed

- **Places tab reorganization** - Reordered cards to prioritize actionable content: Data quality first, then Place notes table, then Statistics last
- **Place statistics card** - Now shows compact summary with collapsible detailed statistics (categories, top places, migration patterns)
- **Removed Referenced places card** - Consolidated into Data quality card's "Missing place notes" section to reduce redundancy

### Fixed

- **Tree output root person picker showing non-person notes** - Fixed person browser in Control Center > Tree output tab listing events, sources, and places instead of only person notes

- **Remove placeholder values treating empty/null as issues** - The batch operation now only flags actual placeholder text ("Unknown", "N/A", "???", etc.) and no longer treats null/undefined/empty properties as problems

- **Enrich place hierarchy modal preview list** - Modal now shows which places will be enriched before starting

- **Top-level places incorrectly listed as orphans** - Countries and regions without parents (Taiwan, South Korea, etc.) are no longer flagged for hierarchy enrichment

- **Duplicate place detection mismatch** - Data quality card count now matches what the merge modal actually finds

---

## [0.11.2] - 2025-12-11

Data Quality: Parent conflict resolution, settings UX overhaul, and bidirectional relationship fixes.

### Added

- **Parent claim conflicts card** (People tab) - New dedicated card for resolving conflicting parent claims
  - Automatically detects children claimed by multiple parents on tab load
  - Table shows child, conflict type, both claimants with cr_id for disambiguation
  - Per-row "Keep 1" / "Keep 2" buttons for quick resolution
  - Clicking names opens the corresponding note
  - Conflicts removed from bidirectional fix modal (now handled separately)

- **Settings UX overhaul** - Major improvements to both Plugin Settings and Preferences tab
  - **Search**: Filter settings by name or description in Plugin Settings
  - **Collapsible sections**: Plugin Settings organized into expandable groups (Data & Detection, Privacy & Export, Research Tools, Logging, Advanced)
  - **Sliders**: Numeric settings (spacing, node dimensions) now use sliders with reset buttons
  - **Folder autocomplete**: Folder settings suggest existing vault folders as you type
  - **Bidirectional navigation**: Links between Plugin Settings and Preferences tab for easy discovery
  - **Reduced duplication**: Canvas layout and folder settings consolidated in Preferences only
  - **Default change**: `primaryTypeProperty` now defaults to `cr_type` (avoids conflicts with other plugins)

- **GEDCOM import now adds `cr_type: person`** to imported person notes for consistent note type detection

- **`cr_type` now an essential property** - Added to Guide tab documentation, "Insert essential properties" context menu action, and base template filter for consistent note detection

### Fixed

- **Family chart view only showing ancestors** - Fixed issue where the interactive family chart only displayed the direct ancestral line instead of the complete tree
  - Chart now properly shows descendants, siblings, and in-laws
  - Root cause: missing bidirectional children relationships in data transformation

- **Places tab crash with non-string place values** - Fixed TypeError when place properties contain arrays or objects instead of strings

- **GEDCOM import nested arrays for wikilinks** - Fixed YAML serialization writing `[[place]]` as nested arrays; wikilink values are now properly quoted

- **Map view not showing markers** - Fixed map not recognizing flat coordinate properties (`coordinates_lat`, `coordinates_long`) written by geocoding; now supports nested, flat, and legacy coordinate formats

- **Bidirectional relationship validation** - Fixed false positives and persistence issues
  - Now validates parent sex matches expected parent type (male → father, female → mother)
  - Prevents incorrect fixes like setting female as father_id or male as mother_id
  - Resolves issue where spouses with children in their children_id array were incorrectly flagged
  - Fixed issue where automatic bidirectional linker was reverting batch fix changes
  - Batch fix operation now suspends automatic linking during updates to prevent interference

---

## [0.11.1] - 2025-12-10

Data Quality: Enhanced batch operations with relationship validation, value normalization, and improved organization.

### Added

- **Bidirectional relationship validation** (People tab) - Detect and fix one-way relationship inconsistencies
  - Finds missing reciprocal links: parent lists child but child doesn't list parent, spouse A lists B but B doesn't list A
  - Supports both simple (spouse, children) and indexed (spouse1, spouse2) properties
  - Preview modal with search, type filtering, and sorting
  - Apply button to automatically fix inconsistencies
  - Validates parent fields aren't already occupied before adding

- **Impossible dates detection** (People tab) - Preview-only validation to find logical date errors
  - Birth after death
  - Unrealistic lifespans (>120 years)
  - Parent born after child
  - Parent too young at child's birth (<10 years)
  - Posthumous births (>12 months for father, any for mother)
  - Handles various date formats: ISO (YYYY-MM-DD), partial dates (YYYY-MM, YYYY), circa dates, date ranges
  - Preview modal with search, type filtering, and sorting
  - Manual correction workflow to prevent data corruption

### Improved

- **Sex value normalization** - Now uses value alias system instead of hardcoded M/F logic
  - Respects user-configured value aliases (Control Center > Schemas > Value aliases)
  - Supports worldbuilders with custom sex values (e.g., "H" → "hermaphrodite")
  - Only normalizes values that have configured mappings
  - Skips values already in canonical form

- **Data quality organization** - Reorganized tools for better discoverability
  - **Quick Start card** (Data Quality tab): Navigation links to People, Places, and Schemas tabs with clear guidance
  - **Navigation guidance** (People tab, Places tab): Clickable links to Data Quality tab
  - **Section restructuring** (Data Quality tab): "Vault-wide analysis" and "Cross-domain batch operations" for clarity
  - **Removed duplication**: Removed duplicate "Remove orphaned cr_id references" operation from People tab
  - Domain-specific tools (People, Places) kept in respective tabs for convenience

- **Places tab batch operations** - Updated button alignment to match Obsidian settings pattern
  - Converted to Obsidian's `Setting` component for proper right-alignment
  - Consistent with People tab styling

- **Batch operation modals** - Improved user feedback and clarity
  - Modals now close immediately after applying changes (avoiding stale cache display)
  - Shows "Applying changes..." message during execution
  - Success/failure notices appear after completion
  - Applies to: Remove duplicates, Remove placeholders, Normalize names, Remove orphaned references, Add cr_type property, and Bidirectional validation

- **Bidirectional relationship preview** - Enhanced modal descriptions to clearly show what will be changed
  - Action-oriented descriptions: "Will add X to Y's field_name"
  - Explicitly shows which field will be modified (children_id, father_id, mother_id, spouse_id)
  - Includes context about existing relationship
  - Example: "Will add Aaron Seymour to Calvin Seymour's children_id (Aaron Seymour lists them as father)"

### Fixed

- **Remove empty/placeholder values** - Fixed false positives in preview modal
  - Preview was checking non-existent frontmatter fields, causing `isPlaceholder(undefined)` to return true
  - Added field existence checks before placeholder validation for place fields, relationship fields, and parent fields
  - Preview now accurately reflects what will actually be removed

---

## [0.11.0] - 2025-12-10

Export v2: Complete overhaul of export functionality with full entity support and round-trip fidelity.

### Added

- **Batch Operations for Data Cleanup** - New batch operations in People and Places tabs for post-import data quality improvements
  - **Remove duplicate relationships** (People tab): Detects and removes duplicate entries in spouse, spouse_id, children, and children_id arrays
    - Preview modal with search, field filtering, and sorting
    - Shows affected files and counts before applying
    - Async operation with progress notices
  - **Remove empty/placeholder values** (People tab): Cleans up common placeholder values from GEDCOM imports and data entry
    - Removes 15+ placeholder patterns: (unknown), Unknown, N/A, ???, Empty, None, etc.
    - Fixes malformed wikilinks with mismatched brackets: `[[unknown) ]]`
    - Cleans leading commas in place values: `, , , Canada` → `Canada`
    - Removes empty parent/spouse fields
    - Preview modal with use case descriptions, search, filtering, and sorting
    - Backup warning before applying changes
  - **Normalize name formatting** (People tab): Standardizes person names to proper title case
    - Capitalizes first letter of each name part
    - Preserves special cases: "van", "de", "von" prefixes and hyphenated names
    - Preview modal with search and sorting
  - **Remove orphaned cr_id references** (People tab): Removes cr_id references in relationship arrays where the target note no longer exists
    - Checks father_id, mother_id, spouse_id, children_id arrays
    - Preview modal shows which references will be removed
  - **Standardize place names** (Places tab): Normalizes place names to proper title case
    - Handles comma-separated hierarchies (e.g., "london, england" → "London, England")
    - Preserves special formatting for hyphenated place names
    - Preview modal with search and sorting
  - **Validate date formats** (People tab): Checks all date fields for format issues based on configurable validation preferences
    - **Configurable validation standards** (Control Center > Preferences > Date Validation):
      - ISO 8601: Strict YYYY-MM-DD format
      - GEDCOM: DD MMM YYYY format (e.g., 15 JAN 1920)
      - Flexible: Accepts both ISO 8601 and GEDCOM formats (default)
    - **Validation options**: Allow partial dates (YYYY-MM, YYYY), circa dates (c. 1850), date ranges (1850-1920), optional leading zeros
    - **Fictional date support**: Automatically skips notes with fc-calendar property
    - **Preview-only validation**: Reports issues without auto-correction to prevent errors
    - Preview modal with search, field filtering, and sorting

### Fixed

- **Tab navigation highlighting**: Fixed tab highlighting not updating when navigating between Control Center tabs via links
  - Links in Preferences tab now properly highlight destination tab
  - Applies to all cross-tab navigation links

- **Scroll position reset**: Fixed scroll position persisting when switching between Control Center tabs
  - All tabs now start at the top when switching
  - Improves navigation UX and prevents confusion

### Improved

- **Date Validation card**: Added clickable link to Events tab where fictional date systems are defined
  - Improves discoverability of fictional date system configuration
  - Link properly updates tab highlighting and scroll position

---

## [0.11.0] - 2025-12-10

Export v2: Complete overhaul of export functionality with full entity support and round-trip fidelity.

### Added

- **Export v2: Full Entity Export** - Major upgrade to all export formats with complete data fidelity
  - **Event export**: All life events (birth, death, marriage, residence, education, military, etc.) now export to GEDCOM, GEDCOM X, Gramps, and CSV formats
  - **Source export**: Source notes with citations, repositories, and confidence levels
  - **Place export**: Place hierarchy, coordinates, and categories preserved across all formats
  - **Property alias integration**: Exporters now respect user-configured property names and values
  - **Gender identity field**: New `gender_identity` field exported appropriately for each format
  - **Custom relationships**: Export custom relationships (godparent, witness, guardian, legal, professional, social, feudal) as GEDCOM ASSO records with RELA descriptors, date ranges, and notes

- **Enhanced Export UI** - Complete redesign of export interface with real-time feedback
  - **Export statistics preview**: Real-time count of people, events, sources, places to be exported
  - **Format version selector**: Choose GEDCOM 5.5.1 (legacy compatibility) or 7.0 (future-ready)
  - **Entity inclusion toggles**: Granular control over which entity types to include
  - **Output location options**: Download to system or save to vault folder
  - **Export progress modal**: Full-screen progress tracking with detailed phase information
  - **Last export info**: Display information about previous exports from vault
  - **Consolidated UI components**: Shared ExportOptionsBuilder reduces code duplication across formats

- **Round-trip fidelity**: Exports now preserve all data imported via GEDCOM Import v2
  - Event dates with precision modifiers (exact, estimated, before, after, range)
  - Source citations linked to events with page numbers and confidence levels
  - Place hierarchy with coordinates
  - Privacy protection with configurable display formats

---

## [0.10.20] - 2025-12-10

Phase 1 of Sex/Gender Identity Expansion: distinct gender identity field support.

### Added

- **Gender identity field**: Added `gender_identity` property for person notes, distinct from biological `sex`
  - Separate from `sex` field (used for GEDCOM compatibility and historical records)
  - Separate from `gender` field (kept for backwards compatibility)
  - Supports inclusive tracking of gender identity for trans individuals and contemporary use cases
  - Included in property alias system with full metadata
  - Documented in Frontmatter Reference wiki

### Documentation

- **Sex/Gender Identity Expansion Phase 1 complete**: Updated planning docs and roadmap
  - Phase 1 (gender_identity field): Complete (v0.10.20)
  - Phase 2 (Schema-based definitions): Already complete (existing Schema system)
  - Phase 3 (Value Aliases for sex): Already complete (v0.9.4, enhanced v0.10.19)
  - Phase 4 (Configurable normalization): Planned

---

## [0.10.19] - 2025-12-10

Unified property and value alias configuration UI with improved discoverability and usability.

### Added

- **Unified Property Configuration UI**: Complete redesign of property and value alias configuration in Preferences tab
  - **Property aliases**: Shows all 55 aliasable properties (27 Person, 20 Event, 8 Place) in collapsible sections
  - **Value aliases**: Shows all 31 canonical values across 4 fields (Event type: 13, Sex: 4, Place category: 6, Note type: 8)
  - Collapsible sections by entity/field type with lazy rendering for performance
  - Search/filter functionality for property aliases across names, descriptions, and common aliases
  - Inline Obsidian Setting components with auto-save on blur
  - Alias count badges on section headers
  - All sections collapsed by default for cleaner initial view
  - Replaced modal-based workflow with native Obsidian UI patterns

### Fixed

- **Alias validation blocking partial input**: Fixed validation triggering on every keystroke, preventing users from typing values that start with existing names (e.g., "sex2")
  - Validation now only occurs when field loses focus (blur event)
  - Invalid input restores previous valid value instead of blocking typing
  - Applies to both property and value aliases

---

## [0.10.18] - 2025-12-09

Property alias support across all note creation and comprehensive bug fixes.

### Added

- **Property alias support for all note creation modals**: All create/edit modals now respect user-configured property aliases
  - Create Person, Create Place, Create Event, Create Source, Create Organization modals
  - Template-based place notes from Generate Place Notes
  - Event note properties (date, event_type, participants, related_places)
  - Parent place linking in place notes

- **Edit Event context menu action**: Right-click event notes in file explorer to edit via modal

- **Fuzzy name matching for duplicate detection**: Merge Duplicates now catches more variations
  - Handles minor spelling differences and character variations

- **Person picker performance improvements**: Faster loading for large vaults

- **FAQ sections**: Added help documentation for common questions

### Fixed

- **Event statistics not recognizing aliased date properties**: Fixed Control Center showing "0% events have dates" for users with property aliases
  - `calculateEventStatistics` now uses `resolveProperty` helper to check both canonical and aliased property names
  - Applies to both `date` and `event_type` property lookups

- **Fictional dates not recognized by Control Panel statistics**: Fixed date detection for non-standard date formats

- **Event type dropdown category headers selectable**: Fixed headers being selectable as values in event type dropdown

- **Family Chart initialization and viewport positioning**: Fixed chart not centering correctly on initial load

- **Crash when place name frontmatter contains wikilinks**: Fixed error when place name property contained `[[wikilink]]` syntax

- **Bulk geocode writing nested coordinates**: Fixed geocoding service writing legacy nested `coordinates:` format
  - Now writes flat `coordinates_lat` / `coordinates_long` properties

- **Referenced places card showing cr_id instead of place names**: Fixed display to show human-readable place names

- **Place statistics showing cr_id instead of place names**: Fixed "Most common birth/death places" to show names

- **Merge duplicates false positives**: Fixed places with common prefixes being incorrectly grouped

### Documentation

- **Unified Property Configuration roadmap entry**: Added medium-priority feature to Future Considerations
  - Single card in Preferences tab showing all property and value aliases
  - Collapsible sections by note type (Person, Place, Event, Source, Organization, Map)

- **Ghost Nodes roadmap entry**: Added medium-priority feature for visualizing unresolved wikilinks

- **Statistics Dashboard roadmap entry**: Added future feature for data visualization

- **Reports & Print Export roadmap**: Expanded from Print & PDF Export to include reports

---

## [0.10.17] - 2025-12-09

Data Enhancement Pass: Improved place generation workflow.

### Added

- **Generate place notes - Progress indicator**: Real-time progress tracking during bulk place note creation
  - Animated progress bar with phase indicator
  - Current place name displayed during generation
  - Cancel button to stop long-running operations

- **Generate place notes - Paginated results table**: Full-featured table replaces simple list after generation
  - Search filter to find specific places by name
  - Sort by place name or status (created/existing)
  - Pagination controls for navigating large result sets

- **Generate place notes - Edit integration**: Each result row has an edit button
  - Opens Edit Place modal for the selected place
  - Allows immediate refinement of generated place notes

---

## [0.10.16] - 2025-12-09

Place management improvements and Calendarium integration planning.

### Added

- **Place name normalization**: Create Missing Places modal now normalizes abbreviated place names
  - Expands US state abbreviations (e.g., "TX" → "Texas")
  - Converts "Co" to "County" (e.g., "Hunt Co" → "Hunt County")
  - Toggle to enable/disable normalization
  - Shows preview of normalized names before creation
  - Original abbreviated name saved as alias for linking

- **Parent hierarchy auto-linking**: New place notes automatically link to existing parent places
  - Parses hierarchical place names (e.g., "Union Valley, Hunt County, Texas, USA")
  - Finds existing parent places by progressively shorter suffixes
  - Sets both `parent_place` wikilink and `parent_place_id` for reliable resolution

- **Flatten nested properties modal**: New batch operation to migrate legacy nested YAML to flat properties
  - Available in Data Quality tab → Batch operations
  - Scans all Charted Roots notes for nested `coordinates:` and `custom_coordinates:` properties
  - Converts to flat format (e.g., `coordinates_lat`, `coordinates_long`)
  - Shows preview of affected files before applying
  - Progress indicator during migration

### Fixed

- **Bulk geocode modal**: Fixed false "cancelled" message when clicking Done after completion
  - Same fix pattern as Enrich Place Hierarchy modal (v0.10.14)
  - Added `hasCompleted` flag to prevent false cancellation on close

- **Place reference matching**: Fixed GEDCOM-imported places not matching existing place notes
  - Plain text references now matched against existing place names
  - Coordinate lookup now uses multi-strategy approach for hierarchical names

- **Merge Duplicates - Pass 4 false positives**: Fixed places with same parent but different names being grouped as duplicates
  - Previously extracted only first word of name (e.g., "San Mateo" and "San Francisco" both became "san")
  - Now extracts full base name minus state suffixes (e.g., "san mateo" vs "san francisco")
  - Correctly groups "Abbeville" with "Abbeville SC" without matching unrelated places

- **Place statistics showing IDs instead of names**: Fixed "Most common birth/death places" and "Migration patterns" displaying `cr_id` values instead of place names
  - Added `resolvePlaceDisplayName()` helper to convert place IDs to names
  - Statistics now show human-readable place names (e.g., "Texas, USA" instead of "aet-050-abr-564")

- **Referenced places showing IDs instead of names**: Fixed "Referenced places" card displaying `cr_id` values
  - Applied same `resolvePlaceDisplayName()` fix to `getReferencedPlaces()` method

- **Bulk geocode writing nested coordinates**: Fixed geocoding service writing legacy nested `coordinates:` format
  - Now writes flat `coordinates_lat` / `coordinates_long` properties (preferred format)
  - Also removes any legacy nested `coordinates:` property when updating

- **Data Analysis showing person issues for place notes**: Fixed Data Quality analysis incorrectly flagging place notes with person-specific issues like "No parents defined" or "No birth date"
  - Added `isPlaceNote` filter to exclude place notes from person cache

### Documentation

- **Calendarium integration planning**: Added user feedback section to planning document
  - Documented primary use case (calendar definitions over events)
  - Added date range support (`fc-end`) as Phase 2 priority
  - Noted pain points: era handling, per-calendar frontmatter fields
  - Updated roadmap with integration timeline and user feedback

---

## [0.10.15] - 2025-12-08

Improved duplicate place detection and GEDCOM import normalization for US state abbreviations.

### Added

- **Merge Duplicates - Pass 5: State Abbreviation Variants**: New detection pass identifies place notes that differ only in state name format
  - Detects pairs like "Abbeville SC" and "Abbeville South Carolina" as duplicates
  - Checks both frontmatter title and filename for state components
  - Supports various filename formats: spaces, kebab-case (`abbeville-south-carolina`), and snake_case (`abbeville_south_carolina`)

### Changed

- **GEDCOM Import: State Abbreviation Normalization**: US state abbreviations are now automatically expanded to full names during place import
  - Comma-separated: `Abbeville, SC, USA` → `Abbeville, South Carolina, USA`
  - Space-separated: `Abbeville SC` → `Abbeville, South Carolina`
  - Prevents duplicate place notes from being created during import

### Improved

- **Merge Duplicates - Pass 4**: Administrative divisions (County, Parish, etc.) are now separated from settlements before grouping
  - Prevents "Abbeville County" from being incorrectly grouped with "Abbeville" (the city)
  - Each category groups independently by base name

- **GEDCOM Import Type Inference**: Context-aware detection prevents mislabeling cities as counties
  - When importing "Abbeville", checks if "Abbeville County" exists as a sibling
  - If explicit county sibling exists, infers the non-suffixed place as a city/town rather than county

---

## [0.10.14] - 2025-12-08

Control Center UI consistency improvements, Places tab UX overhaul, and new hierarchy enrichment tool.

### Added

- **Enrich Place Hierarchy Modal**: New tool to automatically build place hierarchies using geocoding
  - Geocodes orphan places using Nominatim API with address details
  - Parses structured address components to extract hierarchy (city → county → state → country)
  - Auto-creates missing parent place notes with appropriate place types
  - Links places to their parents, building complete hierarchies
  - Handles country-level places as top-level (no parent needed)
  - Progress indicator with per-place results showing hierarchy created

- **Schema Validation Progress Modal**: Visual progress indicator when validating vault against schemas
  - Shows current file being validated
  - Progress bar with percentage complete
  - Auto-closes on completion

### Changed

- **Places Tab: Unified Data Quality Card**: Combined separate "Actions" and "Data quality issues" cards into a single unified card
  - **Summary bar**: At-a-glance overview showing counts for orphan places, missing place notes, and other issues
  - **Collapsible issue sections**: Each issue type in its own expandable section with issue count badge
  - **Inline action buttons**: Individual "Create", "Edit", "Set parent", or "Review" buttons per issue item
  - **Batch action links**: "Find all duplicates →" and similar links connect to existing modals
  - **Other tools section**: Non-issue actions (Geocode lookup, Standardize place names, Merge duplicates) moved to dedicated section below issues
  - **Progressive disclosure**: First two issue sections expanded by default; others collapsed
  - **Priority ordering**: Missing place notes sorted by reference count (most-referenced first)

- **Places Tab Workflow Order**: Reorganized Data Quality card to present tools in recommended workflow order
  1. Missing place notes → Create missing places
  2. Real places missing coordinates → Bulk geocode
  3. Orphan places → Enrich hierarchy (new)
  4. Duplicate names → Merge duplicates
  5. Name variations → Standardize names (moved from Other Tools)
  - Circular hierarchies, fictional with coords, invalid categories follow

- **Type Manager Cards**: Unified all type manager cards (Events, Sources, Organizations, Relationships, Places) to use Obsidian's Setting component
  - Consistent layout with name, description, and action buttons
  - Standardized spacing and visual hierarchy

- **Control Order Standardization**: Filter, sort, and search controls now follow consistent order across all tabs
  - Order: Filter → Sort → Search (where applicable)
  - Consistent styling and spacing

- **Collections Tab: Families Table**: Converted families list to paginated table format
  - Consistent with other entity tables in Control Center
  - Pagination for large family lists

### Fixed

- **Enrich Place Hierarchy Modal**: Fixed false "Enrichment cancelled" message when clicking Done button after completion
  - Button handler conflict caused both startEnrichment and close to fire simultaneously
  - Added guard to prevent re-entry after completion
- **Enrich Place Hierarchy Modal**: Countries no longer re-processed on subsequent runs
  - Top-level countries (placeType=country) are now excluded from orphan list
- **Enrich Place Hierarchy Modal**: Places with incomplete hierarchies no longer re-processed if already enriched
  - Places that already have coordinates are excluded when "Include incomplete hierarchies" is enabled
- **Data Quality Card**: Orphan place count now matches Enrich Hierarchy modal count
  - Both now exclude countries from orphan calculation

### Improved

- **Data Quality Card Discoverability**: Issues are now prominently displayed at the top of the Places tab instead of buried at the bottom
- **Actionability**: Users can now fix issues directly from the issue list without scrolling to a separate Actions card

---

## [0.10.13] - 2025-12-08

Timeline export improvements with Excalidraw styling options and unified export UI.

### Added

- **Unified Export Timeline Card**: Consolidated Canvas, Excalidraw, and Markdown export into a single card
  - Format selector dropdown to switch between export types
  - Dynamic options that show/hide based on selected format
  - Shared filter controls (person, event type, group) across all formats

- **Excalidraw Export Styling Options**: Full control over hand-drawn diagram appearance
  - Drawing style: Architect (clean), Artist (natural), Cartoonist (rough)
  - Font selection: 7 fonts including Virgil, Excalifont, Comic Shanns, Helvetica, Nunito, Lilita One, Cascadia
  - Font size slider (10-32px)
  - Stroke width slider (1-6px)
  - Fill style: Solid, Hachure (diagonal lines), Cross-hatch
  - Stroke style: Solid, Dashed, Dotted

### Fixed

- **Markdown Table Export**: Escaped pipe characters in wikilink aliases
  - Links like `[[path/to/file|Display Name]]` now render correctly in table cells
  - Prevents table column misalignment from unescaped pipe delimiters

---

## [0.10.12] - 2025-12-07

Duplicate place detection and improved merge modal UX.

### Added

- **Merge Duplicate Place Notes**: New tool to find and merge duplicate place notes
  - Detects place notes with identical names that may represent the same location
  - Suggests the most complete note as canonical (based on parent, coordinates, type, references)
  - Merging updates person notes, re-parents child places, and moves duplicates to trash
  - Accessible via Places tab workflow (step 2) or command palette
  - Particularly useful after GEDCOM import when duplicates are common

- **Full Name Similarity Detection**: Duplicate detection now also groups places by normalized `full_name`
  - Catches duplicates like "Hartford, CT" and "Hartford, CT, USA" with different parents
  - Normalizes full names by removing common country suffixes (USA, United Kingdom, etc.)
  - Shows "similar full name" match reason in the UI

- **Merge Modal Enhancements**:
  - **Help link**: Links to wiki documentation for the merge feature
  - **Context menu for open button**: Right-click to choose "Open in new tab", "Open to the right", or "Open in new window"
  - **Filename rename**: Change the canonical file's name after merge (useful for removing "-2" suffixes)
  - **Sorting options**: Sort by most/fewest duplicates, or alphabetically by name
  - **Filtering options**: Filter to show pending, has metadata, or has coordinates groups
  - **Character count badge**: Shows body content length instead of generic "has content"
  - **Full name display**: Shows the `full_name` GEDCOM property for each place

- **New Command**: `Merge duplicate place notes` to find and merge duplicate place notes

### Improved

- **Standardize Place Names UX**: Enhanced modal with clearer explanations and impact preview
  - Added explanation section showing which frontmatter fields will be updated
  - Dynamic impact display shows exactly what will change when you select an option
  - Button labels now show reference counts (e.g., "Standardize (12)")
  - Tooltips provide additional context about files affected

- **Places Tab Workflow**: Reorganized workflow steps
  - Added "Merge duplicate places" as step 2
  - Renumbered subsequent steps (Create missing → 3, Build hierarchy → 4, Geocode → 5)

---

## [0.10.11] - 2025-12-07

GEDCOM import improvements and enhanced place variation detection.

### Added

- **Guide Tab: Base Templates Card**: New card providing quick access to create Obsidian Bases for all entity types
  - People, Places, Events, Organizations, and Sources templates available
  - One-click creation with descriptive labels for each type
  - Consistent styling with other Guide tab cards

- **Data Quality Tab: Base Type Dropdown**: Create base dropdown now supports all entity types
  - Dropdown selector to choose People, Places, Events, Organizations, or Sources
  - Replaces single-purpose People template button

- **New Commands**: Added commands for Places and Events base templates
  - `Create places base template`: Creates an Obsidian Base for geographic locations
  - `Create events base template`: Creates an Obsidian Base for life events and milestones

- **Geocode Place Context Menu Action**: Right-click any place note to look up coordinates via OpenStreetMap
  - Uses note title and parent place for accurate geocoding
  - Updates frontmatter with lat/long coordinates
  - Works with both `cr_type: place` and `type: place` notes

- **Enhanced Place Variation Detection**: "Find variations" now detects places with same name but different hierarchy
  - Detects variations like "Greene County, Tennessee, USA" vs "Greene County Tennessee"
  - Parses both comma-separated and space-separated place formats
  - Recognizes US states and common countries in space-separated strings
  - Matches places sharing base locality with common hierarchy elements

### Fixed

- **GEDCOM Importer Property Alignment**: Fixed place properties to match Place model
  - Changed `parent` to `parent_place` for wikilink references
  - Added `parent_place_id` with cr_id reference for reliable linking
  - Fixed dedup cache to recognize both `type` and `cr_type` properties

- **Place String Normalization**: GEDCOM importer now normalizes place strings before processing
  - Handles leading commas, extra spaces, and empty hierarchy parts
  - Applied during collection, event creation, and cache building
  - Reduces duplicate place creation from inconsistent GEDCOM data

- **Place Type Detection**: Added heuristics for inferring place types from names
  - Detects counties, states, countries, cities, etc. from naming patterns
  - Falls back gracefully when patterns don't match

---

## [0.10.10] - 2025-12-07

### Fixed

- **Place Hierarchy Not Loading from GEDCOM Import**: Fixed parent-child relationships not being resolved for GEDCOM-imported places
  - Root cause: GEDCOM importer writes `parent: "[[ParentName]]"` but PlaceGraphService only checked `parent_place` and `parent_place_id`
  - Now supports `parent`, `parent_place`, and `parent_place_id` properties
  - Added proper wikilink resolution in a second pass after all places are loaded
  - This should significantly reduce orphan place counts for GEDCOM imports

---

## [0.10.9] - 2025-12-07

Control Center improvements for large vaults.

### Added

- **Status Tab: Events and Sources Cards**: New cards showing event and source note statistics
  - Events card displays total count and breakdown by event type
  - Sources card displays total count and breakdown by source type

- **Custom Maps Card Description**: Clarifies that the built-in interactive map handles most real-world genealogy, with custom maps for historical maps, cemetery plots, land surveys, or fictional worlds

- **Person Notes Table**: Replaced alphabetical letter-grouped list with a compact table format
  - Columns: Name, Born, Died, and actions
  - Click any row to open the person edit modal
  - File icon button opens the note directly; badge icon creates missing place notes
  - Explanatory hint above table describes interactions
  - Filter dropdown: All people, Has dates, Missing dates, Unlinked places, Living
  - Sort dropdown: Name (A–Z/Z–A), Birth (oldest/newest), Death (oldest/newest)
  - Pagination with "Load more" button for large lists

- **Events Tab: Timeline Table Editing**: Click-to-edit events directly from the Timeline card
  - Click any row to open the event edit modal
  - File icon button opens the note directly
  - Explanatory hint above table describes interactions
  - Context menu still available for additional options (open in new tab, delete)

- **Places Tab: Place Notes Table**: Replaced category-grouped list with a compact table format
  - Columns: Name, Category, Type, People, and actions
  - Click any row to open the place edit modal
  - File icon button opens the note directly
  - Explanatory hint above table describes interactions
  - Filter dropdown: All places, by category (Real, Historical, etc.), Has/No coordinates
  - Sort dropdown: Name (A–Z/Z–A), People count (most/least), Category, Type
  - Pagination with "Load more" button for large lists
  - Color-coded category badges for quick visual identification

- **Sources Tab: Filter, Sort, and Open Note Button**: Enhanced sources table with filtering and sorting
  - Filter dropdown: All sources, by type (grouped), by confidence (High/Medium/Low), Has/No media
  - Sort dropdown: Title (A–Z/Z–A), Date (newest/oldest), Type, Confidence
  - Open note button added to actions column next to existing Extract events button
  - Pagination with "Load more" button for large lists

- **Organizations Tab: Filter, Sort, and Click-to-Edit**: Enhanced organizations table with filtering, sorting, and edit modal
  - Filter dropdown: All organizations, by type (grouped), Has/No members
  - Sort dropdown: Name (A–Z/Z–A), Type, Members (most/least), Universe
  - Click any row to open the organization edit modal
  - Open note button in actions column (file icon)
  - Explanatory hint above table describes interactions
  - Pagination with "Load more" button for large lists

- **Maps Tab: World Map Preview**: Interactive Leaflet world map preview in Control Center
  - Shows real world geography using OpenStreetMap tiles
  - Displays place markers at their geographic coordinates
  - Shows count of places with coordinates
  - Click anywhere on the map to open the full interactive map view

### Fixed

- **Person Notes Listing Sources/Events**: Fixed issue where source and event notes appeared in the People tab's person list
  - Root cause: Notes with `cr_id` were included regardless of `cr_type`
  - Now properly filters out notes with `cr_type: source` or `cr_type: event`
  - Also fixed in vault statistics to ensure accurate person count

- **Events Tab Statistics Not Detecting cr_type Notes**: Fixed "Event notes" and "Statistics" cards showing zero counts when notes use `cr_type: event` or `cr_type: person` instead of `type`
  - Root cause: `calculateEventStatistics()` and `calculateDateStatistics()` used hardcoded `type` property check
  - Now uses flexible note type detection (`isEventNote`, `isPersonNote`) supporting `cr_type`, `type`, and tags

---

## [0.10.8] - 2025-12-07

Completes the `cr_type` migration started in v0.10.2.

### Changed

- **cr_type Migration Complete**: All note creation and documentation now uses `cr_type` instead of `type`
  - Updated Essential properties in Control Center Guide tab
  - Updated all Templater template snippets
  - Updated service files that create events, sources, organizations, schemas
  - Updated GEDCOM importer for events, sources, and places
  - Updated create-map-modal and image-map-manager
  - Updated empty state messages in all tabs
  - Note: `type` property still works for backwards compatibility

### Added

- **Wiki Link in Template Snippets Modal**: Added link to Templater Integration wiki guide for advanced user script setup

---

## [0.10.7] - 2025-12-07

Settings consolidation and bug fixes.

### Changed

- **Settings Consolidation**: Reorganized folder settings for clarity
  - Added Events, Organizations, Timelines, and Schemas folders to Plugin Settings
  - Created new "Advanced" section for staging isolation and folder filtering options
  - Added explanatory info boxes in both Plugin Settings and Preferences tab
  - Import/Export tab now shows folder summary with link to Preferences for configuration

### Fixed

- **Status Tab Crash**: Fixed error when opening Control Center Status tab
  - Crash occurred when notes had non-string tags in frontmatter
  - Added type checking to gracefully skip malformed tag data
  - Added error handling to display helpful error messages instead of silent failures

---

## [0.10.6] - 2025-12-07

Bug fix release: Fixed wikilink corruption in frontmatter operations. Added "Add cr_id" context menu action.

### Added

- **Add cr_id Context Menu Action**: Quick way to add just a cr_id to notes
  - Appears alongside "Add essential properties" in all context menus
  - Available for single files, multi-file selection, and folders
  - Detects note type and uses appropriate prefix (`place_`, `event_`, or none for persons)
  - Skips notes that already have a cr_id

### Fixed

- **Wikilink Corruption Bug**: Fixed issue where wikilinks like `[[Person]]` became `[[[Person]]]`
  - Affected "Add essential properties" context menu action
  - Affected bidirectional relationship sync (adding parents, spouses, children)
  - Root cause: Manual YAML manipulation with regex didn't handle wikilinks in arrays properly
  - Solution: Converted all frontmatter operations to use Obsidian's `processFrontMatter` API

---

## [0.10.5] - 2025-12-07

Bug fix release with Templater documentation.

### Added

- **Templater Integration Guide**: Comprehensive wiki documentation for using Templater with Charted Roots
  - Explains `cr_id` format (`abc-123-def-456`)
  - Provides inline template snippets and reusable user script approaches
  - Complete example templates for Person, Place, Event, and Source notes
  - Tips for folder-specific template automation
  - Guide tab in Control Center now links to this documentation

### Fixed

- **"Add essential properties" Frontmatter Corruption**: Fixed bug where existing list properties containing wikilinks were corrupted
  - `[[Gaeleri]]` would incorrectly become `[[[Gaeleri]]]`
  - Now uses Obsidian's `processFrontMatter` API to safely modify only specified properties

---

## [0.10.4] - 2025-12-06

Bug fix release: Fixed Preferences tab crash when valueAliases was undefined.

### Fixed

- **Preferences Tab Crash**: Fixed error when opening Preferences tab
  - Crash occurred when `valueAliases` setting was undefined (new installs or after settings reset)
  - Added null check before accessing `valueAliases` properties

---

## [0.10.3] - 2025-12-06

Type Customization: Full type manager for Events, Sources, Organizations, Relationships, and Places. Create, edit, hide, and customize types and categories with user-defined names.

### Added

- **Type Managers**: Full customization UI for all note type categories
  - Events: Create custom event types, rename built-ins (e.g., "birth" → "nameday"), organize into categories
  - Sources: Add custom source types for specialized research materials
  - Organizations: Define organization types for noble houses, guilds, corporations, etc.
  - Relationships: Customize relationship types with colors and line styles
  - Places: Add custom place types with hierarchy levels, organize into categories

- **Category Management**: Create, edit, and organize type categories
  - Create custom categories to group related types
  - Rename built-in categories to match your terminology
  - Reorder categories with sort order field
  - Hide unused categories (built-in or custom)

- **Type Customization Features**
  - Override built-in types: Change name, description, icon, color
  - Hide types: Remove from dropdowns while preserving existing notes
  - Reset to defaults: Restore customized built-in types
  - Delete custom types: Remove user-created types entirely

- **Place Type Hierarchy**: Place types support both category and hierarchy level
  - Hierarchy levels (0-99) determine valid parent-child relationships
  - Categories (geographic, political, settlement, subdivision, structure) organize the UI
  - Users can assign place types to any category regardless of hierarchy

---

## [0.10.1] - 2025-12-06

GEDCOM Import v2: Full-featured import with event notes, source notes, hierarchical place notes, progress indicator, and filename format options.

### Added

- **GEDCOM Import v2**: Enhanced import creating multiple note types
  - Create event notes from GEDCOM events (births, deaths, marriages, and 30+ other event types)
  - Create source notes from GEDCOM `SOUR` records with `TITL`, `AUTH`, `PUBL`, `REPO` fields
  - Create hierarchical place notes parsing `City, County, State, Country` structure
  - Per-note-type toggle: choose which note types to create (people, events, sources, places)
  - Disable people notes if you already have them in your vault

- **Filename Format Options**: Control how imported note filenames are formatted
  - Three formats: Original (John Smith.md), Kebab-case (john-smith.md), Snake_case (john_smith.md)
  - "Customize per note type" toggle for fine-grained control
  - Set different formats for people, events, sources, and places

- **Import Progress Modal**: Visual feedback during large imports
  - Phase indicator (validating, parsing, places, sources, people, relationships, events)
  - Progress bar with current/total counts
  - Running statistics showing places, sources, people, events created
  - Auto-closes after completion

- **Place Duplicate Detection**: Smart matching for existing place notes
  - Case-insensitive matching on `full_name` property
  - Fallback matching on title + parent combination
  - Updates existing places (adds missing parent links) instead of creating duplicates

- **Import Options UI Improvements**
  - Descriptive text explaining what each toggle does
  - Counts shown in toggle labels (e.g., "Create event notes (6,010 found)")
  - Reorganized options with explanatory paragraph

### Changed

- **Numbering System Modal**: No longer appears automatically after GEDCOM import
  - Added "Skip" button for when accessed from other UI paths
  - Users can assign reference numbers later via Tools menu

### Fixed

- **People Tab Performance**: Fixed crash when viewing People tab with large imports (2k+ people)
  - Added pagination (100 people at a time with "Load more" button)
  - Removed expensive per-person badge calculations that were causing freezes

- **GEDCOM Analysis Performance**: Fixed freeze when selecting large GEDCOM files
  - Optimized connected components algorithm from O(n×m) to O(n+m)
  - Pre-built family lookup index for fast relationship traversal

---

## [0.10.0] - 2025-12-06

Chronological Story Mapping release: Event notes, person timelines, family timelines, source event extraction, and global timeline view.

### Added

- **Timeline Export**: Export event timelines to Canvas or Excalidraw
  - Export card in Events tab with layout and filtering options
  - Three layout styles: horizontal, vertical, and Gantt (by date and person)
  - Color-coding by event type, category, confidence, or monochrome
  - Filter exports by person, event type, or group/faction
  - Include before/after relationship edges as canvas connections
  - Group events by person option
  - Preview shows export statistics before export
  - Export to Excalidraw (when plugin is installed)
  - Events positioned chronologically with dated events arranged by date
  - Per-canvas style overrides preserved during regeneration

- **Groups/Factions Property**: Events can now be tagged with groups for filtering
  - New `groups` property (string array) for categorizing events by nation, faction, organization
  - Filter timeline exports by group
  - "By Group" view in events base template
  - Statistics track events by group

- **Compute Sort Order**: Automatic topological ordering of events
  - "Compute sort order" button in Events tab
  - Calculates `sort_order` values from before/after DAG relationships
  - Respects date-based ordering, then relative constraints
  - Detects and reports cycles in event ordering
  - Uses increments of 10 for manual adjustment flexibility

- **Events Base Template**: Pre-configured Obsidian Base for event management
  - "New events base from template" context menu on folders
  - 20 pre-configured views: By Type, By Person, By Place, By Group, By Confidence, etc.
  - Includes Vital Events, Life Events, Narrative Events filter views
  - High/Low Confidence, With/Missing Sources views
  - By Sort Order view for computed chronological ordering

- **Place Timeline View**: Events at a specific location over time in the Maps tab
  - Place selector dropdown with event counts per place
  - Timeline displays all events at selected location chronologically
  - Family presence analysis with visual bars showing date ranges per person
  - Summary shows event count, date range, and people present
  - Events clickable to navigate to event notes
  - Integrated into Maps tab for geographic context

- **Family Timeline View**: Aggregate timeline for family units in the People tab
  - Users badge on person list items shows total family events count
  - Click badge to expand family timeline showing events for person + spouses + children
  - Color-coded by family member with legend (blue=self, pink=spouse, green/amber/etc=children)
  - Relationship context shown for each event (e.g., "John Smith (child)")
  - All events sorted chronologically across family members
  - Lazy-loaded for performance

- **Timeline Card in Events Tab**: Global timeline view with filtering and gap analysis
  - View all events in chronological order
  - Filter by event type, person, and search text
  - Event table with Date, Event, Type, Person, Place columns
  - Click rows to navigate to event notes
  - Color-coded event type badges with icons
  - Data quality insights: timeline gaps (5+ years), unsourced events, orphan events
  - Right-click context menu on event rows (Open note, Open in new tab, Delete event)

- **Person List Context Menus**: Right-click on person list items in People tab
  - Events submenu with "Create event for this person" and timeline export options
  - Export timeline to Canvas or Excalidraw formats
  - Mobile-friendly: flat menu items on mobile devices, submenus on desktop

- **Person Note File Context Menus**: Right-click on person note files in file explorer
  - Events submenu with "Create event for this person" and timeline export options
  - Export timeline to Canvas or Excalidraw formats
  - Mobile-friendly with "Charted Roots:" prefixes on flat menu items

- **Source Event Extraction**: Extract events from source notes
  - "Extract events" button in Sources tab action column
  - Context menu with "Extract events" option on source rows
  - ExtractEventsModal pre-populates fields from source metadata (date, place, confidence)
  - Suggests event types based on source type (census→residence/occupation, vital_record→birth/death/marriage)
  - Add/remove event suggestions before batch creation
  - Created events automatically link to the source note

- **Person Timeline View**: View chronological events for any person in the People tab
  - Calendar badge on person list items shows event count
  - Click badge to expand timeline showing all linked events
  - Events display chronologically with date, type, place, and source info
  - Color-coded icons match event type (birth=green, death=gray, marriage=pink, etc.)
  - Click event to navigate to event note
  - Confidence and source warnings for data quality awareness
  - Lazy-loaded for performance with large vaults

- **Event Notes**: New note type (`type: event`) for documenting life events
  - 22 built-in event types across 4 categories: core, extended, narrative, custom
  - Core events: birth, death, marriage, divorce
  - Extended events: burial, residence, occupation, education, military, immigration, baptism, confirmation, ordination
  - Narrative events: anecdote, lore_event, plot_point, flashback, foreshadowing, backstory, climax, resolution
  - Date precision support: exact, month, year, decade, estimated, range, unknown
  - Confidence levels: high, medium, low, unknown
  - Person and place linking via wikilinks
  - Timeline membership for grouping events
  - Fictional date system integration for worldbuilders
  - Canonical event marking for worldbuilding

- **Create Event Modal**: Full-featured modal for creating event notes
  - Event type dropdown grouped by category
  - Date precision and date fields with end date for ranges
  - Person picker integration for linking primary person
  - Place and timeline linking fields
  - Confidence level selection
  - Worldbuilding options section for narrative event types

- **Event Service**: Backend service for event note management
  - CRUD operations with caching
  - Query by person, place, or timeline
  - Event statistics

- **Event Templates**: Seven new templates in Template Snippets modal
  - Basic event, Birth, Marriage, Death, Narrative, Relative-ordered, Full event

- **Command**: "Create event note" command in command palette

### Changed

- **Control Center Consolidation**: Merged Canvas Settings tab into Preferences tab
  - Canvas layout settings (horizontal/vertical spacing, node dimensions)
  - Canvas styling settings (color scheme, arrow styles, spouse edge labels)
  - Reduced tab count from 16 to 15 for cleaner navigation
  - Preferences tab description updated to reflect added functionality

### Fixed

- **Create Event Modal**: Fixed person linking UI
  - Link/Unlink button now properly updates icon and text when toggling state
  - Button icons correctly switch between link and unlink states

### Settings Added

- `eventsFolder`: Default folder for event notes (default: `Charted Roots/Events`)
- `customEventTypes`: User-defined event types
- `showBuiltInEventTypes`: Toggle visibility of built-in event types (default: true)

---

## [0.9.4] - 2025-12-05

Value Aliases release: Use custom property values without editing your notes.

### Added

- **Value Aliases**: Map custom property values to Charted Roots canonical values
  - Configure aliases in Control Center → Preferences → Aliases
  - Supports three field types: event types, gender, and place categories
  - Event types: `birth`, `death`, `marriage`, `burial`, `residence`, `occupation`, `education`, `military`, `immigration`, `baptism`, `confirmation`, `ordination`, `custom`
  - Gender: `male`, `female`, `nonbinary`, `unknown`
  - Place categories: `real`, `historical`, `disputed`, `legendary`, `mythological`, `fictional`
  - Graceful fallback: unknown event types resolve to `custom`
  - Read integration: canonical values take precedence, then aliases are checked
  - Write integration: imports create notes with aliased values

- **Bases Folder Setting**: Configure where Obsidian Bases files are created
  - New setting in Plugin Settings → Folder Locations and Preferences → Folder Locations
  - Default: `Charted Roots/Bases`
  - Leave empty to create bases in the context menu folder

- **Nested Property Detection**: Data Quality now detects non-flat frontmatter structures
  - Warns about nested YAML properties that may cause compatibility issues
  - Shows nested keys for each detected property
  - Prepares for future "Flatten" action

### Changed

- Renamed "Property aliases" card to "Aliases" with two sections: property names and property values
- Unified alias configuration in a single card for better discoverability
- **Gender Standardization**: Person modal now uses "Gender" terminology
  - Changed from "Sex" to "Gender" with updated description
  - Added "Non-binary" option alongside Male, Female, and Unknown
  - Non-binary displays as yellow in canvas and tree preview
  - Updated data quality validation to accept all canonical gender values

### Fixed

- Fixed `addClass()` calls in create place modal (was passing incorrect arguments)
- Place note creation and editing now write flat coordinate properties (`coordinates_lat`, `coordinates_long`, `custom_coordinates_x`, etc.) instead of nested objects
- Place graph reads both flat and nested coordinate formats for backwards compatibility

### Documentation

- Updated Settings and Configuration wiki page with Value Aliases section
- Updated Frontmatter Reference wiki page with canonical values tables
- Updated Roadmap to mark Value Aliases as complete

---

## [0.9.3] - 2025-12-05

Property Aliases release: Use custom property names without renaming your frontmatter.

### Added

- **Property Aliases**: Map custom frontmatter property names to Charted Roots fields
  - Configure aliases in Control Center → Preferences → Property Aliases
  - Supports all person note properties: identity, dates, places, relationships
  - Read resolution: canonical property first, then falls back to aliases
  - Write integration: imports create notes with aliased property names
  - Essential Properties card displays aliased property names when configured
  - Bases templates generated with aliased property names
  - Add, edit, and delete aliases through intuitive modal interface

- **Settings & Configuration Wiki Page**: New comprehensive documentation
  - Control Center overview with all tabs documented
  - Folder locations reference
  - Property aliases configuration guide
  - Layout and canvas styling settings
  - Data, privacy, and research tool settings

### Changed

- Essential Properties card now shows aliased property names when aliases are configured
- GEDCOM, GEDCOM X, Gramps, and CSV importers now write to aliased property names
- Person note creation respects property aliases throughout

---

## [0.9.2] - 2025-12-05

Events Tab release: Improved discoverability for Fictional Date Systems.

### Added

- **Events Tab**: New dedicated tab in Control Center for temporal data management
  - **Date systems card**: Moved from Canvas Settings with all existing functionality intact
  - **Statistics card**: Shows date coverage metrics for person notes
    - Birth/death date coverage percentages
    - Fictional date usage count and systems breakdown
- Improves discoverability of Fictional Date Systems feature
- Lays groundwork for future Chronological Story Mapping features

### Changed

- Canvas Settings tab simplified by moving date systems to Events tab
- Control Center tab order updated: Events tab now appears after People tab

---

## [0.9.1] - 2025-12-05

Style Settings integration and code quality improvements.

### Added

- **Style Settings Integration**: Customize Charted Roots colors via the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin
  - **Family Chart View colors**: Female, male, and unknown gender card colors; chart background (light/dark); card text color (light/dark)
  - **Evidence Visualization colors**: Primary/secondary/derivative source colors; research coverage threshold colors (well-researched/moderate/needs research)
  - **Canvas Node Dimensions**: Info panel directing users to plugin settings (not CSS-controlled)
  - Works with Style Settings plugin if installed; no changes required for users without it

### Changed

- Updated wiki documentation for Style Settings feature

### Fixed

- Fixed potential object stringification issues (`[object Object]`) in various services
- Fixed lexical declaration in switch case block (validation service)
- Wrapped unhandled promises with `void` operator
- Removed unnecessary `async` from methods without `await`
- Removed unused imports and variables
- Fixed sentence case violations in UI text

---

## [0.9.0] - 2025-12-05

Evidence Visualization release: GPS-aligned fact tracking, proof summaries, and canvas conflict markers.

### Added

- **Fact-Level Source Tracking**: Track which specific facts have source citations
  - New `sourced_facts` property on person notes for GPS-aligned research
  - Per-fact source arrays: `birth_date`, `birth_place`, `death_date`, `death_place`, `marriage_date`, `occupation`
  - Research coverage percentage calculated from sourced vs total facts
  - Configurable fact coverage threshold in settings

- **Source Quality Classification**: Rate sources by genealogical standards
  - Three quality levels: Primary, Secondary, Derivative (per Evidence Explained methodology)
  - `source_quality` property on source notes
  - Color-coded quality badges throughout the UI

- **Research Gaps Report**: Identify under-researched areas
  - Data Quality tab shows unsourced facts across the tree
  - Filter by fact type or person
  - Priority ranking by number of missing sources
  - Quick actions to add source citations

- **Proof Summary Notes**: Document reasoning for genealogical conclusions
  - New note type `type: proof_summary` with structured frontmatter
  - Track subject person, fact type, conclusion, status, and confidence
  - Evidence array linking sources with support levels (strongly/moderately/weakly/conflicts)
  - Status workflow: draft → complete → needs_review → conflicted
  - Confidence levels: proven, probable, possible, disproven

- **Proof Summary Management**: Full CRUD operations for proof notes
  - Create Proof modal accessible from person detail view
  - Edit existing proof summaries
  - Delete with confirmation (moves to trash)
  - Proof cards displayed in Research Coverage section

- **Source Conflict Detection**: Identify conflicting evidence
  - Source Conflicts section in Data Quality tab
  - Detects proof summaries with `status: conflicted` or conflicting evidence items
  - Shows conflict count per person

- **Canvas Conflict Markers**: Visual indicators for unresolved conflicts
  - `⚠️ N` indicator at top-left of person nodes with conflicts
  - Only visible when `trackFactSourcing` is enabled
  - Red color (canvas color '1') draws attention to research issues
  - Complements existing source indicator (`📎 N · %`) at top-right

- **Enhanced Source Indicators**: Research progress overlay
  - Shows source count and research coverage percentage: `📎 3 · 75%`
  - Color-coded by coverage: green (≥75%), yellow (≥50%), red (<50%)
  - Gated behind `trackFactSourcing` setting for casual users

### Changed

- Control Center person detail view now includes Research Coverage section with fact-level breakdown
- Data Quality tab reorganized with Source Conflicts section
- Source indicators on canvas now optionally show coverage percentage

### Settings Added

- `trackFactSourcing`: Enable fact-level source tracking (default: false)
- `factCoverageThreshold`: Number of facts for 100% coverage (default: 6)
- `showResearchGapsInStatus`: Show research gaps in Status tab (default: true)

---

## [0.8.0] - 2025-12-04

Evidence & Source Management release: Complete source management with media gallery, citation generator, and tree indicators.

### Added

- **Source Indicators on Generated Trees**: Visual badges showing research documentation quality
  - Display badges like "📎 3" on tree nodes indicating how many source notes link to each person
  - **Color coding**: Green badges for 3+ sources (well-documented), yellow for 1-2 sources
  - Only appears on nodes that have at least one linked source
  - Source notes identified by `type: source` frontmatter property
  - Toggle in Settings → Charted Roots → Canvas styling → "Show source indicators"
  - Uses Obsidian's `resolvedLinks` to detect wikilinks from source notes to person notes
  - Helps identify which ancestors need more research at a glance

- **Source Media Gallery**: Thumbnail grid for browsing source media
  - Filter by media type (images, documents)
  - Filter by source type
  - Search by filename or source title
  - Lightbox viewer with keyboard navigation (arrow keys, Escape)
  - Support for images and document placeholders
  - Statistics footer showing media counts

- **Citation Generator**: Generate formatted citations in multiple academic styles
  - Chicago Manual of Style
  - Evidence Explained (Elizabeth Shown Mills) - genealogical standard
  - MLA (Modern Language Association)
  - Turabian
  - Copy single format or all formats to clipboard
  - Missing field warnings for incomplete citations

- **Evidence & Sources Wiki Page**: Comprehensive documentation for source management
  - Source note schema with 13 source types (census, vital_record, photograph, etc.)
  - Source property reference (source_date, source_repository, confidence, etc.)
  - Linking sources to people via wikilinks
  - Sources Bases template with 17 pre-configured views
  - Best practices for organizing source notes and media

### Changed

- Updated Frontmatter-Reference.md with correct source property names (source_date, source_repository, etc.)
- Updated Tree-Generation wiki page with source indicators documentation
- Updated Roadmap to reflect completion of Evidence & Source Management

---

## [0.7.0] - 2025-12-03

World-Building Suite release: Custom Relationships, Fictional Date Systems, and Organization Notes.

### Added

- **Custom Relationships**: Extended relationship types beyond standard family links
  - **Built-in Relationship Types**: 12 pre-defined relationship types across 4 categories:
    - Legal/Guardianship: Guardian/Ward, Adoptive Parent/Child, Foster Parent/Child
    - Religious/Spiritual: Godparent/Godchild, Mentor/Disciple
    - Professional: Master/Apprentice
    - Social: Witness (symmetric)
  - **Relationships Tab**: Dedicated Control Center tab for relationship management
    - Custom relationship types table with color swatches and category grouping
    - Toggle to show/hide built-in relationship types
    - Custom relationships table showing all defined relationships in vault
    - Statistics card with relationship counts by type
  - **Add Relationship Modal**: Add custom relationships from person note context menu
    - Dropdown grouped by category
    - Person picker for target selection
    - Optional notes field
  - **Frontmatter Storage**: Relationships stored in `relationships` array with `type`, `target`, `target_id`, and optional `notes`
  - **Canvas Edge Support**: Custom relationships can be rendered as colored edges on canvas trees
  - **Commands**: "Add custom relationship to current person", "Open relationships tab"
  - **Context Menu**: "Add custom relationship..." option for person notes

- **Fictional Date Systems**: Custom calendars and eras for world-building
  - Era definitions with name, abbreviation, and epoch year
  - Date parsing for `{abbrev} {year}` format (e.g., "TA 2941", "AC 283")
  - Age calculation within a single calendar system
  - Built-in presets: Middle-earth, Westeros, Star Wars, Generic Fantasy calendars
  - Universe-scoped calendar systems
  - Date Systems card in Canvas Settings tab for management
  - Test date parsing input for validation
  - Toggle for enabling/disabling built-in systems
  - Custom date system creation with era table editor

- **Organization Notes**: Define and track non-genealogical hierarchies
  - New note type `type: organization` for houses, guilds, corporations, military units
  - **8 Organization Types**: noble_house, guild, corporation, military, religious, political, educational, custom
    - Each type has unique color and icon
    - Built-in types can be hidden, custom types can be added
  - **Organization Hierarchy**: Parent organization relationships via `parent_org` field
    - Sub-organization tracking
    - Hierarchy navigation
  - **Person Membership System**: Track people's affiliations with organizations
    - `memberships` array in person frontmatter
    - Role, from date, to date, and notes fields
    - Multiple memberships per person supported
  - **Organizations Tab in Control Center**:
    - Organizations list grouped by type with color indicators
    - Statistics card with total organizations, people with memberships, total memberships
    - Type breakdown with counts per organization type
    - Organization types table with toggle for built-in types
    - Data tools card with "Create base template" button
  - **Obsidian Bases Integration**: Pre-configured organizations.base template
    - 17 views: By Type, Noble Houses, Guilds, Corporations, Military Units, Religious Orders, etc.
    - Filter by active/dissolved, universe, top-level vs sub-organizations
    - Formulas for display name, active status, hierarchy path
  - **Context Menu**: "Add organization membership..." option for person notes
  - **Commands**: "Create organization note", "Open organizations tab", "Create organizations base template"

### Changed

- **Status Tab**: Renamed "Relationships" card to "Family links" to distinguish from custom relationships
  - Clarifies that family links (father, mother, spouse) are separate from custom relationships
- **Tab Reorganization**: Merged Staging tab content into Import/Export tab
  - Staging area management now accessible from Import/Export tab
  - Reduced navigation clutter while maintaining functionality

### Removed

- **Advanced Tab**: Retired from Control Center to reduce tab count
  - Logging settings moved to plugin's native Settings tab (Settings → Charted Roots → Logging)
  - "Create base template" button moved to Data Quality tab under "Data tools" section
  - Log export folder and obfuscation settings now accessible in plugin settings

### Code Quality (2025-12-04)

- Moved Leaflet plugin CSS from dynamic injection to static stylesheet
- Replaced browser `fetch()` with Obsidian `requestUrl()` API
- Replaced deprecated `substr()` with `substring()`
- Replaced browser `confirm()` dialogs with Obsidian modals
- Use `Vault#configDir` instead of hardcoded `.obsidian` path
- Replaced `as TFile` casts with proper `instanceof` checks
- Fixed TypeScript union type issue (`string | unknown` → `unknown`)
- Removed unnecessary `async` from methods without `await`

---

## [0.6.3] - 2025-12-03

### Added

- **Schema Validation**: User-defined validation schemas to enforce data consistency
  - **Schema Notes**: New note type (`type: schema`) with JSON code block for schema definition
  - **Schemas Tab**: Dedicated Control Center tab for schema management
    - Create Schema modal with full UI (no manual JSON editing required)
    - Edit existing schemas via modal
    - Schema gallery with scope badges (collection, folder, universe, all)
    - Vault-wide validation with results display
    - Recent violations list with clickable links to affected notes
    - Schema statistics (total schemas, validation counts)
  - **Property Validation**: Type checking for string, number, date, boolean, enum, wikilink, array
    - Enum validation with allowed values list
    - Number range validation (min/max)
    - Wikilink target type validation (verify linked note has correct type)
  - **Required Properties**: Enforce presence of specific frontmatter fields
  - **Conditional Requirements**: `requiredIf` conditions based on other property values
  - **Custom Constraints**: JavaScript expressions for cross-property validation
    - Sandboxed evaluation with access to frontmatter properties
    - Custom error messages for each constraint
  - **Data Quality Integration**: Schema violations section in Data Quality tab
    - Summary stats (validated, passed, failed)
    - Error breakdown by type
    - Re-validate button
  - **Commands**: "Open schemas tab", "Validate vault against schemas"
  - **Context Menu**:
    - Person notes: "Validate against schemas"
    - Schema notes: "Edit schema", "Validate matching notes", "Open schemas tab"

- **Guide Tab Updates**: Schema validation integrated into Control Center Guide
  - Schema notes section in Essential Properties collapsible
  - Schema validation concept in Key Concepts card
  - "Validate schemas" quick action in Common Tasks grid

- **New Icons**: `clipboard-check` (schema validation), `file-check` (schema note)

### Changed

- **Tab Order**: Schemas tab added between Maps and Collections
  - New order: Status → Guide → Import/Export → Staging → People → Places → Maps → **Schemas** → Collections → Data Quality → Tree Output → Canvas Settings → Advanced

---

## [0.6.2] - 2025-12-03

### Added

- **Maps Tab in Control Center**: Dedicated tab for map management and visualization
  - **Open Map View card**: Quick access to Map View with coordinate coverage stats
  - **Custom Maps gallery**: Thumbnail grid showing all custom map images
    - Image previews (~150×100px) with name overlay and universe badge
    - Hover actions: Edit button and context menu button (stacked on right)
    - Click thumbnail to open map in Map View
  - **Visualizations card**: Migration diagrams and place network tools
  - **Map Statistics card**: Coordinate coverage, custom map count, universe list

- **Custom Map Management**: Full CRUD operations for custom map notes
  - **Create Map Modal**: Create new map notes with image picker, bounds, and universe
  - **Edit Map Modal**: Update existing map note properties
  - **Duplicate Map**: Clone a map with auto-generated unique ID (copy, copy 2, etc.)
  - **Export to JSON**: Export map configuration as JSON file
  - **Import from JSON**: Import map configuration with duplicate ID detection
  - **Delete Map**: Remove map with confirmation dialog

- **New UI Components**
  - `createCollapsible()` helper method for reusable accordion sections
  - Task grid CSS component for quick action navigation
  - Guide step badges for visual workflow clarity
  - Map gallery section with thumbnail grid styling
  - New icon types: `lightbulb`, `list-checks`, `map`, `more-vertical`

- **Status Tab Enhancements**: Comprehensive vault overview
  - **Places card**: Total places, places with coordinates, breakdown by category
  - **Custom Maps card**: Total maps count and list of universes
  - **Canvases card**: Total canvas files in vault

### Changed

- **Data Quality Tab Repositioned**: Moved after Collections tab for better workflow
  - New tab order: Status → Guide → Import/Export → Staging → People → Places → Maps → Collections → Data Quality → Tree Output → Canvas Settings → Advanced

- **Guide Tab Overhaul**: Streamlined Control Center Guide tab for better usability
  - Reduced from 19 cards (~976 lines) to 5 focused cards (~254 lines)
  - New collapsible sections for essential properties reference (Person, Place, Map notes)
  - Task grid component for quick navigation to common features
  - Integrated wiki links for detailed documentation
  - Streamlined "Getting Started" with clear 3-step workflow

### Removed

- **Quick Actions Tab**: Removed from Control Center to streamline the interface
  - "Recent Trees" section moved to Tree Output tab
  - "Create base template" button moved to Advanced tab
  - Other actions were redundant (tab navigation buttons) or placeholder (coming soon notices)

---

## [0.6.0] - 2025-12-03

### Added

- **Interactive Map View**: Full Leaflet.js-powered geographic visualization
  - Dedicated Map View (Open via ribbon icon or command palette)
  - OpenStreetMap tiles for real-world locations
  - Color-coded markers: birth (green), death (red), marriage (purple), burial (gray)
  - Marker clustering for dense areas with click-to-zoom
  - Migration paths connecting birth → death locations with directional arrows
  - Path text labels showing person names along migration routes (Leaflet.TextPath)
  - Heat map layer showing geographic concentration
  - Fullscreen mode and mini-map overview
  - Place search with autocomplete and zoom-to-result

- **Custom Image Maps**: Support for fictional world mapping
  - Load custom map images from vault (PNG, JPG, WebP)
  - Universe-based filtering (auto-switch to Westeros map when viewing House Stark)
  - YAML frontmatter configuration for bounds, center, zoom
  - Two coordinate systems: geographic (lat/lng) or pixel (for hand-drawn maps)
  - Pixel coordinate system uses `pixel_x` and `pixel_y` in place notes

- **Map Image Alignment (Edit Mode)**: Interactive georeferencing for custom maps
  - Drag corner handles to position, scale, rotate, and distort map images
  - Align historical or hand-drawn maps to coordinate systems
  - Edit banner with Save/Undo/Reset/Cancel controls
  - Corner positions saved to map note frontmatter (`corner_nw_lat`, etc.)
  - "Reset to default" clears alignment and restores rectangular bounds
  - Powered by Leaflet.DistortableImage library

- **Additional Marker Types**: Extended life event visualization beyond core events
  - New marker types: residence, occupation, education, military, immigration
  - Religious event markers: baptism, confirmation, ordination
  - Custom event type for user-defined life events
  - Events array in person frontmatter for multiple events per person
  - Each event type has configurable color in settings
  - Layer toggles for each marker category (residences, occupations, etc.)
  - Religious events grouped under single "Religious" toggle

- **Journey Paths (Route Visualization)**: Connect all life events chronologically
  - Shows complete life journey from birth through all events to death
  - Dashed violet polylines distinguish journeys from migration paths
  - Arrow decorations show direction of movement between locations
  - Popup displays all waypoints with event types and dates
  - Layer toggle: "Journey paths (all events)" in Layers menu
  - Off by default to avoid visual clutter with many people
  - Complements Time Slider for tracking individual movement over time

- **Map Filtering & Controls**
  - Filter by collection (family branch)
  - Year range filtering with min/max inputs
  - Layer toggles for all marker types and paths/heat map
  - Map selector dropdown for switching between real-world and custom maps

- **Time Slider Animation**: "Who was alive when?" visualization
  - Scrub through years to see who was alive at any point
  - Play/pause animation with adjustable speed
  - Snapshot mode (only alive at year) vs. cumulative mode
  - Person count display during animation

- **Map Comparison**: Side-by-side and multi-instance support
  - Split view horizontally or vertically
  - Open additional map tabs
  - Independent filtering per instance

- **Export Options**
  - Export as GeoJSON Overlay for GIS tools
  - Export as SVG Overlay for embedding in notes
  - Exports include markers, paths, and metadata

- **Edit Person Modal**: Update existing person notes
  - Edit mode for CreatePersonModal
  - Update name, dates, places, relationships
  - Clear relationships by unlinking

- **Context Menu Actions**: Quick editing from any view
  - "Edit person" action opens edit modal for person notes
  - "Edit place" action opens edit modal for place notes

- **Folder Settings**: Configurable default folders in plugin settings
  - People folder setting
  - Places folder setting
  - Maps folder setting (for custom map images)
  - Canvases folder setting

### Changed

- Control Center restructured with folder settings section

---

## [0.5.2] - 2025-12-01

### Added

- **Geographic Features - Place Notes System**: Comprehensive place-based features for genealogical and world-building research
  - Place note schema with hierarchical relationships (city → state → country)
  - Six place categories: real, historical, disputed, legendary, mythological, fictional
  - Universe support for organizing fictional/mythological places
  - Coordinates support for real-world lat/long and custom map systems
  - Historical names tracking for places that changed names over time
  - Person note integration with birth_place, death_place, burial_place fields

- **Place Statistics & Management**: Control Center panel for place analytics
  - Overview metrics: total places, coordinate coverage, orphan detection, max hierarchy depth
  - Category breakdown with associated person counts
  - Most common birth/death places ranking
  - Migration pattern detection (birth → death location flows)
  - Place hierarchy issue detection and warnings
  - Actions: create missing place notes, build hierarchy wizard, standardize place names, view place index

- **Place Visualizations (D3-based)**: Interactive place network and migration diagrams
  - Network/Schematic View: places as nodes sized by associated person count
  - Tree and radial layout options with color coding by category, type, or depth
  - Interactive tooltips with place details
  - Migration Flow Diagram: arc diagram showing movement patterns between places
  - Time period filtering with year range inputs and century presets
  - Collection (family branch) filtering
  - Hierarchy level aggregation for regional analysis

- **Place UX Improvements**: Streamlined place creation and management workflow
  - Searchable parent place picker grouped by place type
  - Manual coordinate entry with validation (lat: -90 to 90, long: -180 to 180)
  - Quick-create places from person notes via context menu
  - Auto-create parent place workflow with type suggestions
  - Custom place types beyond built-in options (e.g., "galaxy", "dimension")
  - Geocoding lookup via Nominatim API with "Look up coordinates" button
  - Places Base template with 14 pre-configured views
  - Default place category rules (folder-based and collection-based)
  - Auto-populate parent place from folder structure

- **Control Center Updates**: Tab restructuring for geographic features
  - Renamed "Data entry" tab to "People" for clarity
  - New Create Person modal with relationship pickers (father, mother, spouse)
  - People tab combines quick actions, statistics, and searchable person list
  - Unlinked place badges with create buttons in person list
  - Dedicated places folder setting
  - Place-based tree filtering (birth, death, marriage, burial locations)

---

## [0.5.0] - 2025-12-01

### Added

- **Staging Workflow**: Safe import processing with isolated staging folder
  - Configure staging folder in Settings → Data section
  - Import destination toggle: choose main tree or staging
  - Staging folder automatically excluded from tree generation, duplicate detection, etc.
  - Staging tab in Control Center for managing import batches

- **Cross-Import Duplicate Detection**: Find duplicates between staging and main tree
  - CrossImportDetectionService compares staging records against main tree
  - Side-by-side comparison modal for reviewing matches
  - Resolution tracking: mark matches as "Same person" or "Different people"
  - Resolutions persist across sessions

- **Merge Wizard**: Field-level conflict resolution for duplicate records
  - MergeWizardModal with side-by-side field comparison
  - Dropdown per field to choose source (Main, Staging, or Both for arrays)
  - Preview merged result before executing
  - Automatic relationship reconciliation updates all references
  - Available from both duplicate detection and cross-import review

- **Data Quality Tools**: Comprehensive data quality analysis and batch operations
  - Quality score (0-100) based on completeness and consistency
  - Issue detection across 5 categories: date inconsistencies, relationship problems, missing data, format issues, orphan references
  - 15+ specific issue types detected (birth after death, circular references, etc.)
  - Filter issues by category and severity (error/warning/info)
  - Batch normalization: standardize date formats to YYYY-MM-DD
  - Batch normalization: standardize gender values to M/F
  - Batch normalization: clear orphan parent references
  - Preview changes before applying any batch operation
  - Data Quality tab in Control Center with visual stats and issue list

- **Staging Tab in Control Center**: Dedicated UI for import management
  - View staging subfolders with person counts and modification dates
  - Promote subfolders or all staging to main tree
  - Delete staging subfolders
  - Review cross-import matches before promoting
  - Quick statistics for staging area

- **Folder Filtering for Person Discovery**: Control which folders are scanned
  - Exclusion list mode: ignore specific folders
  - Inclusion list mode: only scan specified folders
  - Applies to all person note operations

- **Combined Import/Export Tab**: Unified interface for all import/export operations
  - Single tab replaces separate GEDCOM and CSV tabs
  - Format dropdown: choose GEDCOM or CSV
  - Direction dropdown: choose Import or Export
  - Inline folder configuration section for quick setup

- **Split Canvas Wizard**: Multi-step wizard for splitting large family trees
  - Split by generation (configurable generations per canvas)
  - Split by branch (paternal/maternal lines)
  - Single lineage extraction (direct line between two people)
  - Split by collection (one canvas per user-defined collection)
  - Ancestor + descendant canvas pairs
  - **Split by surname** - Extract people by surname even without established connections
    - Scrollable list of surnames sorted by frequency
    - Multi-surname selection
    - Options: include spouses, match maiden names, handle spelling variants
    - Separate canvas per surname or combined output
  - Preview showing expected canvas count and people
  - Access via canvas context menu → Charted Roots → Split canvas wizard

### Changed

- Promote operations now skip files marked as "same person" (duplicates should be merged instead)
- StagingService updated with `PromoteOptions` for skip logic
- DuplicateDetectionModal now accepts settings for merge button integration
- Control Center Import/Export tab now includes collapsible folder configuration
  - Configure people folder, staging folder, and isolation settings without leaving Control Center
  - Shows current folder status at a glance

---

## [0.3.3] - 2025-11-29

### Added

- **CSV Import/Export**: Full CSV support for spreadsheet workflows
  - Import from CSV/TSV files with auto-detected column mapping
  - Export to CSV with configurable columns and privacy protection
  - New CSV tab in Control Center alongside GEDCOM

- **Selective Branch Export**: Export specific portions of your family tree
  - Choose a person and export only their ancestors or descendants
  - Available in both GEDCOM and CSV export tabs
  - Option to include spouses when exporting descendants
  - Works alongside collection filtering

- **Smart Duplicate Detection**: Find and manage potential duplicate records
  - Fuzzy name matching using Levenshtein distance algorithm
  - Date proximity analysis for birth/death dates
  - Confidence scoring (high/medium/low) with configurable thresholds
  - Command: "Find duplicate people" opens detection modal
  - Review matches and dismiss false positives

- **Family Chart View Enhancements**:
  - Kinship labels: Toggle to show relationship labels on links (Parent/Spouse)
  - Multiple views: "Open new family chart" command creates additional tabs
  - Duplicate view: Pane menu option to open same chart in new tab

---

## [0.3.2] - 2025-11-28

### Fixed

- **ESLint Compliance**: Fixed 19 ESLint errors for PR review compliance
  - Removed unnecessary `async` keywords from synchronous methods
  - Fixed floating promises in event handlers with `void` operator
  - Added eslint-disable comments with explanations where required by base class

### Added

- **Bidirectional Name Sync**: Full two-way synchronization between chart edits and file names
  - Editing a name in Family Chart View now renames the markdown file
  - Renaming a file in Obsidian updates the frontmatter `name` property
  - Chart automatically refreshes when person files are renamed
  - Added `sanitizeFilename` helper for safe filename generation

---

## [0.3.1] - 2025-11-27

### Added

- **PDF Export**: Export family charts and tree previews to PDF format
  - Family Chart View: Export menu in toolbar (PNG, SVG, PDF)
  - Tree Preview in Control Center: PDF export option
  - Canvas file context menu: "Export as image" submenu with PNG, SVG, PDF options

- **Customizable Export Filenames**: Configure export filename patterns
  - New setting: Export filename pattern (default: `{name}-family-chart-{date}`)
  - Placeholders: `{name}` for root person name, `{date}` for current date
  - Applied to all image exports (PNG, SVG, PDF)

### Changed

- Added jsPDF dependency for PDF generation

---

## [0.3.0] - 2025-11-26

### Added

- **Interactive Family Chart View**: A new persistent, interactive visualization panel for exploring and editing family trees in real-time
  - Pan, zoom, and navigate large trees (50+ people) with smooth animations
  - Click any person to center the view or open their note
  - Built-in editing: add, modify, and delete relationships directly in the chart
  - Full undo/redo support for confident editing
  - Bidirectional sync: changes automatically update your markdown notes
  - Color schemes: Gender, Generation, Collection, or Monochrome
  - Adjustable layout spacing: Compact, Normal, or Spacious
  - Toggle birth/death date display on person cards
  - Export as high-quality PNG (2x resolution) or SVG
  - Commands: "Open family chart", "Open current note in family chart"
  - State persistence: view settings preserved across sessions

---

## [0.2.9] - 2025-11-26

### Added

- **Privacy Protection for GEDCOM Export**: Optional privacy controls for living persons
  - Configurable birth year threshold (default: 100 years ago)
  - Exclude living persons entirely or anonymize their data
  - Privacy-protected exports maintain family structure while hiding PII
  - Settings: `enableGedcomPrivacy`, `livingPersonThreshold`

- **Lineage Tracking**: Compute and track multi-generational lineages from root persons
  - Support for patrilineal (father's line), matrilineal (mother's line), and all descendants
  - `lineage` array property in frontmatter for multiple lineage membership
  - Commands: "Assign lineage from root person", "Remove lineage tags"
  - Context menu integration on person notes with lineage type submenu
  - Suggested lineage names based on surname (e.g., "Smith Line")

- **Folder Statistics Modal**: Comprehensive folder-level analytics
  - Data completeness metrics (required fields, dates, relationships)
  - Relationship health reports (orphans, incomplete relationships)
  - Family structure analysis (gender distribution, generation depth)
  - Access via right-click folder context menu

- **Relationship History & Undo**: Track and reverse relationship changes
  - History modal showing all relationship changes with timestamps
  - Statistics by change type (add parent, add spouse, add child, etc.)
  - One-click undo for any change
  - Configurable retention period with automatic cleanup
  - Settings: `enableRelationshipHistory`, `historyRetentionDays`
  - Commands: "View relationship history", "Undo last relationship change"

- **Enhanced Bases Template**: Expanded from 16 to 22 pre-configured views
  - New views: By lineage, By generation number, Ahnentafel ordered, d'Aboville ordered, Henry ordered, Without lineage
  - Added visible properties: lineage, generation, ahnentafel, daboville, henry

- **Multi-Vault Deploy Script**: Deploy to multiple Obsidian vaults simultaneously

### Changed

- RelationshipManager now optionally records changes to history service
- Improved error handling for Base template creation with Bases plugin detection

---

## [0.2.8] - 2025-11-26

### Added

- **Reference Numbering Systems**: Assign standard genealogical reference numbers
  - **Ahnentafel**: Ancestor numbering (self=1, father=2, mother=3, paternal grandfather=4, etc.)
  - **d'Aboville**: Descendant numbering with dot notation (1, 1.1, 1.2, 1.1.1, etc.)
  - **Henry System**: Compact descendant numbering without dots (1, 11, 12, 111, etc.)
  - **Generation**: Relative generation depth (0=self, -1=parents, +1=children)
  - Commands for each system via command palette
  - Context menu on person notes with numbering submenu
  - "Clear reference numbers" command to remove specific numbering types
  - Numbers stored in frontmatter: `ahnentafel`, `daboville`, `henry`, `generation`

---

## [0.2.7] - 2025-11-25

### Added

- **Bases Integration Improvements**
  - Enhanced error handling for Base operations
  - Bases plugin detection with confirmation modal
  - Improved Base template with additional visible properties

---

## [0.2.6] - 2025-11-25

### Changed

- Documentation updates for community plugin submission
- Minor UI text improvements for Obsidian style guide compliance

---

## [0.2.5] - 2025-11-25

### Added

- **Relationship Calculator**: Calculate the relationship between any two people
  - BFS pathfinding algorithm finds shortest path through family connections
  - Proper genealogical terms (cousin, uncle, 2nd cousin once removed, etc.)
  - Support for cousins with removal (1st cousin twice removed, etc.)
  - In-law relationship detection (parent-in-law, sibling-in-law)
  - Common ancestor identification for collateral relationships
  - Visual path display showing the chain of relationships
  - Copy result to clipboard functionality
  - Command: "Calculate relationship between people"
  - Context menu entry on person notes

---

## [0.2.4] - 2025-11-24

### Changed

- **Community Plugin Submission**: Prepared plugin for Obsidian community plugin directory
  - Fixed manifest validation issues (removed "Obsidian" from description)
  - Corrected authorUrl format
  - Standardized version numbering (removed -beta suffix)
  - Added GitHub issue templates with privacy guidance
  - Updated security documentation

---

## [0.2.3-beta] - 2025-11-24

### Added

- **Interactive Tree Preview**: Real-time visual preview of family trees before canvas generation
  - SVG-based preview with pan/zoom controls (mouse wheel zoom, drag to pan)
  - Interactive controls: Zoom in/out buttons, zoom-to-fit, label visibility toggle
  - Color scheme options: Gender (green/purple), Generation (multi-color layers), Monochrome (neutral)
  - Hover tooltips: View person details (name, birth/death dates, generation) on hover
  - Export functionality: Save preview as high-resolution PNG or vector SVG
  - Integrated into Tree Output tab for seamless workflow
  - Particularly useful for large trees (50+ people) to verify layout before canvas generation

- **UI Consolidation**: Streamlined tree generation and export workflows
  - Renamed "Tree Generation" tab to "Tree Output" to reflect both generation and export capabilities
  - Added "Export Tree" section with Excalidraw export instructions
  - Created "Generate tree" submenu in person note context menus with two quick actions:
    - "Generate Canvas tree" - Opens Tree Output tab with full control over settings
    - "Generate Excalidraw tree" - Instantly generates Excalidraw tree with sensible defaults
  - Hybrid approach: Canvas generation for full control, Excalidraw for speed

- **Essential Properties Feature**: Bulk-add essential properties to person notes
  - Context menu action "Add essential properties" for single or multiple markdown files
  - Adds all 9 essential properties if missing: `cr_id`, `name`, `born`, `died`, `father`, `mother`, `spouses`, `children`, `group_name`
  - Smart visibility: Only shows for files missing some properties
  - Multi-file selection support with file count indicator
  - Non-destructive: Preserves existing data, only adds missing properties

- **Complete Person Notes by Default**: All person note creation now includes essential properties
  - Person notes created via Data Entry tab include all essential properties
  - GEDCOM imports create complete person notes with all essential properties
  - Properties use empty strings or arrays when data is unavailable
  - Ensures consistency between manually created and imported notes

- **Alternative Layout Algorithms**: Choose from four layout algorithms to visualize family trees in different ways
  - **Standard**: Traditional family-chart layout with proper spouse handling (default)
  - **Compact**: 50% tighter spacing for large trees (ideal for 50+ people)
  - **Timeline**: Chronological positioning by birth year
    - X-axis: Birth year (shows who lived when)
    - Y-axis: Generation number
    - Intelligently estimates positions for missing birth dates from relatives
    - Auto-fallback to generation-based layout when no dates available
  - **Hourglass**: Focus on one person's complete lineage
    - Root person centered at Y=0
    - Ancestors positioned above (negative Y)
    - Descendants positioned below (positive Y)
    - Each generation horizontally centered

- **Enhanced Canvas Naming**: Auto-generated canvas filenames now include layout type
  - Standard: `Family Tree - Name.canvas` (no suffix)
  - Compact: `Family Tree - Name (compact).canvas`
  - Timeline: `Family Tree - Name (timeline).canvas`
  - Hourglass: `Family Tree - Name (hourglass).canvas`

- **Documentation**: Added comprehensive layout documentation
  - New "Layout algorithms" section in Control Center Guide tab
  - Updated user guide with layout descriptions and use cases
  - Layout type stored in canvas metadata for regeneration

---

## [0.2.2-beta] - 2025-11-23

### Added

- **Bidirectional Relationship Sync**: Automatically maintains reciprocal relationships across your family tree
  - Setting someone as a parent automatically adds child relationship in parent's note
  - Deleting a relationship automatically removes reciprocal link
  - Works seamlessly with Bases table edits, direct frontmatter modifications, and external editors
  - Relationship snapshots loaded on plugin initialization for immediate sync

- **Enhanced GEDCOM Support**:
  - Pre-import validation with detailed error reporting
  - Comprehensive import results modal showing success/warning/error counts
  - Improved relationship validation and duplicate detection
  - Better handling of edge cases and malformed data

- **Obsidian Bases Integration**: Six new pre-configured relationship query views
  - Single Parents: People with children but no spouse
  - Childless Couples: Married couples without children
  - Multiple Marriages: People married more than once
  - Sibling Groups: Sets of siblings grouped by parents
  - Root Generation: Ancestor endpoints with children but no parents
  - Marked Root Persons: People marked with `root_person: true`

- **Root Person Marking**: Mark specific people as "root persons" for lineage tracking
  - Crown-icon context menu action: "Mark as root person" / "Unmark as root person"
  - Property: `root_person: true` in YAML frontmatter
  - Documented in Control Center Guide tab with use cases
  - Integrated with Bases "Marked Root Persons" view

- **Property Migration**: Renamed `collection_name` to `group_name` with automatic migration
  - Backward-compatible migration on plugin load
  - Updates both settings and person note properties

### Changed

- Enhanced Control Center Guide tab with root person documentation
- Improved relationship sync reliability and performance
- Updated GEDCOM import workflow with better error handling

---

## [0.2.1-beta] - 2025-11-23

### Fixed

- **Person picker date display**: Fixed person picker and tree generation interface to properly display birth/death dates instead of `cr_id` values. The UI now shows meaningful date information (e.g., "b. 1888" or "1888 – 1952") when available, with `cr_id` as fallback only when dates are missing.
  - Resolved issue where Obsidian's YAML parser converts `born`/`died` date strings to JavaScript Date objects, which weren't being converted back to strings for display
  - Updated person picker modal, Control Center tree generation tab, and root person display
  - Affects both context menu "Generate tree" and Control Center inline person browser

- **Excalidraw export compatibility**: Fixed Excalidraw export feature to generate valid, properly formatted Excalidraw files. Exported family trees now display correctly in Excalidraw with all nodes and connections visible.
  - Corrected opacity values from 0-1 scale to proper 0-100 scale
  - Added missing required fields: `frameId`, `rawText`, `autoResize`, `lineHeight`, `elbowed`
  - Fixed Drawing section JSON structure to be properly enclosed in `%%` comment blocks
  - Added block reference IDs to text elements for proper Excalidraw indexing
  - Implemented coordinate normalization to handle Canvas negative coordinates

---

## [0.2.0-beta] - 2025-11-22

### Added

- **Collections & Groups**: Organize people using auto-detected family groups with customizable names or user-defined collections
  - Browse by detected families, custom collections, or all people
  - Cross-collection connection detection to identify bridge people
  - Filter tree generation by collection
  - Context menu option to set collection names

- **Excalidraw Export**: Export family tree canvases to Excalidraw format for manual annotation and customization
  - Preserves node positioning and colors
  - Enables hand-drawn styling and freeform annotations
  - Maintains family tree structure while allowing artistic enhancement

- **Enhanced spouse support**: Multiple spouse tracking with flat indexed YAML properties
  - Support for unlimited spouses using `spouse1`, `spouse2`, etc.
  - Marriage metadata: dates, locations, divorce dates, marriage status
  - Optional spouse edge display with configurable labels
  - GEDCOM import/export support for marriage events

- **Context menu actions**: Right-click integration throughout Obsidian
  - Person notes: Add relationships, validate data, find canvases
  - Folders: Scan for issues, import/export GEDCOM
  - Canvas files: Regenerate, view statistics
  - Full desktop and mobile support

- **Tree generation improvements**:
  - Inline person browser with birth/death year display
  - Family group sidebar for multi-family vaults
  - Canvas regeneration preserves tree metadata
  - Layout direction switching while preserving other settings

### Changed

- Improved Control Center UI consistency and organization
- Enhanced GEDCOM import to support marriage metadata
- Updated tree preview descriptions for clarity

---

## [0.1.2-alpha] - 2025-11-17

Initial alpha release with core genealogical features.

### Added

- **GEDCOM Import**: Full support for GEDCOM 5.5.1 format
  - Import from Gramps, Ancestry, FamilySearch
  - Preserve `_UUID` tags as `cr_id`
  - Bidirectional relationship linking

- **Automated Layout**: Generate pedigree and descendant charts
  - Non-overlapping genealogical layout algorithms
  - Multiple tree types: ancestors, descendants, full
  - Configurable generation limits and spouse inclusion

- **Canvas Integration**: Native Obsidian Canvas nodes
  - File nodes link to research notes
  - JSON Canvas 1.0 compliance
  - Regenerate canvas to update with current data

- **Styling Options**:
  - Node coloring: gender-based, generation-based, monochrome
  - Arrow styles: directed, bidirectional, undirected
  - Edge colors: 6 preset colors plus theme default
  - Separate parent-child and spouse relationship styling

- **Dual Storage System**: Wikilinks + persistent `cr_id` references
- **YAML-First Data**: Compatible with Dataview and Bases
- **Multi-Family Detection**: Automatically detect disconnected groups
- **Obsidian Bases Compatible**: Ready-to-use Base template included

---

## Release Notes

### Version Status

- **Stable (v0.9.x)**: Evidence Visualization with GPS-aligned fact tracking, proof summaries, canvas conflict markers, and property aliases.
- **Stable (v0.8.x)**: Evidence & Source Management with media gallery, citation generator, and source indicators.
- **Stable (v0.7.x)**: World-Building Suite with custom relationships, fictional date systems, and organization notes.
- **Stable (v0.6.x)**: Interactive Map View with Leaflet.js, custom image maps for fictional worlds, time slider animation, journey paths, and map exports.
- **Stable (v0.5.x)**: Geographic features with place notes, statistics, and visualizations. Import cleanup and merge tools.
- **Stable (v0.4.x)**: Feature-complete for core genealogical workflows with import cleanup and merge tools.
- **Stable (v0.3.x)**: Interactive family chart view, CSV import/export, duplicate detection.
- **Beta (v0.2.x)**: Core genealogical workflows with canvas generation, GEDCOM support, and relationship management.
- **Alpha (v0.1.x)**: Initial testing releases with core functionality.

### Roadmap

See [docs/roadmap.md](docs/roadmap.md) for planned features and development priorities.
