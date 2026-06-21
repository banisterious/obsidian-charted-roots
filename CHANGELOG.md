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

- **Default universe setting** ([#751](https://github.com/banisterious/obsidian-charted-roots/issues/751)): a new "Default universe" setting (Settings → Places) applies a chosen universe to new people, places, events, and organizations when their universe field is left empty — so working in a single universe no longer means typing it on every note. For places it applies only to fictional categories, and you can still change or clear it per note. Defaults to none. Requested by [@doctorwodka](https://github.com/doctorwodka).
- **"Create family" in the person right-click menu** ([#754](https://github.com/banisterious/obsidian-charted-roots/issues/754)): the Relationships submenu on a person note now includes a "Create family..." entry that opens the family-creation wizard pre-anchored on that person — skipping the mode picker so you go straight to adding their spouses, children, and parents. Requested by [@pawel-k1200](https://github.com/pawel-k1200).

### Fixed

- **Map refresh could crash on an event with a non-text type** ([#746](https://github.com/banisterious/obsidian-charted-roots/issues/746)): if a `cr_type: event` note had an `event_type` that wasn't plain text — for example a bare number like `event_type: 1850`, which YAML reads as a number — opening the map failed to load any data ("Failed to refresh map data"). Event type, title, and id values are now read as text wherever they're used, so a stray non-text value is handled gracefully instead of breaking the whole map. Surfaced by the improved error reporting added in 0.22.73; reported by [@tenephor](https://github.com/tenephor).
- **Collections and universes duplicated when entered as wikilinks** ([#755](https://github.com/banisterious/obsidian-charted-roots/issues/755)): a `collection` or `universe` value typed as a wikilink (e.g. `[[Harra]]`) was treated as different from the plain form (`Harra`) or an aliased form (`[[Harra|Harra]]`), so the same collection/universe appeared multiple times in lists, filters, and dropdowns, showed raw `[[ ]]` brackets, and could even produce a collection "connection" to itself. These values are now normalized wherever they're gathered, so each collection/universe is counted once no matter how it was typed. (Plain text labels like `Cook/Server` are left untouched.) Reported by [@lomarcanys](https://github.com/lomarcanys).

## [0.22.73] - 2026-06-20

A worldbuilding-and-maps release: a new marriage type field, friendlier place-type hierarchy editing, and a cluster of map and Entity Profile fixes for mixed real-world/fictional vaults. Also bumps the bundled dompurify to clear a fresh security advisory.

### Added

- **Marriage type field** ([#628](https://github.com/banisterious/obsidian-charted-roots/issues/628)): spouse relationships can now record the type of union (e.g. Common-law marriage, Cohabitation, Domestic (civil) partnership, Putative marriage, Concubinage) alongside the existing marriage date, location, and status. The person modal offers these as quick-pick presets plus a "Custom..." option for any free-text value, and the type is mirrored to both partners. When set, it appears on Dynamic Timeline marriage rows — e.g. "Marriage to Jane Doe (Common-law marriage)" — controlled by a new "Show marriage type" setting (on by default). Requested by [@Vericia](https://github.com/Vericia).
- **Entity Profile memberships are sorted by start date** ([#743](https://github.com/banisterious/obsidian-charted-roots/issues/743)): a person's memberships were shown in insert order (and an edited membership jumped to the bottom), leaving date ranges scattered. They now order by earliest start year — resolved era-aware, so fictional BBY/ABY dates sort by true chronology — with undated memberships last. On a tied start year an ended membership sorts above an ongoing ("Current") one, then ties break alphabetically by organization. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Editing a person now ensures `cr_type: person`** ([#744](https://github.com/banisterious/obsidian-charted-roots/issues/744)): saving in the Edit Person modal fills in a missing `cr_type: person` automatically. A note that gained a `cr_id` but never ran "Add essential person properties" could be edited indefinitely without ever being tagged as a person, which left type detection guessing and caused issues like #742. An existing `cr_type` is never overwritten. Requested by [@doctorwodka](https://github.com/doctorwodka).
- **Place type hierarchy: insert above an occupied level** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734)): creating or re-levelling a place type onto a level another type already holds now offers a choice — keep them tied, or insert above and push the lower types down by one. This makes the previously fiddly "add something above the current top" case (e.g. a galaxy above a region) a single action instead of renumbering the whole category by hand, while leaving intentional ties and gaps intact. The per-row Hide/Show and Reset controls are now compact icons (eye and revert arrow) with tooltips, matching the customize/edit icons. Follow-up from testing by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Fixed

- **Fictional events appeared on the real-world map at 0,0** ([#747](https://github.com/banisterious/obsidian-charted-roots/issues/747)): in a mixed vault, events tied to fictional places (which use pixel coordinates on a custom map) leaked onto the real-world map, clustering at latitude/longitude 0,0 off the coast of Africa, because their lat/long defaulted to zero. Markers, place markers, heat map, and migration paths now render only the locations that belong to the active map's coordinate system, so real-world and fictional maps each show only their own places. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).
- **Entity Profile showed a place's raw category id** ([#745](https://github.com/banisterious/obsidian-charted-roots/issues/745)): the Category in a place's profile heading displayed the internal lowercase id (e.g. `historical`) instead of its display label ("Historical") — the label only appeared once you clicked into the field to edit it. The heading now shows the proper label, while editing still round-trips the underlying id. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).
- **Map data failures now show the actual error** ([#746](https://github.com/banisterious/obsidian-charted-roots/issues/746)): when the map failed to refresh, it showed only a generic "Failed to load map data" and logged the error as an empty object, making platform-specific failures impossible to diagnose. The specific error message now appears in both the notice and the log. Reported by [@tenephor](https://github.com/tenephor).

### Security

- **Updated the bundled dompurify to 3.4.11** (transitive via jspdf) to resolve [GHSA-cmwh-pvxp-8882](https://github.com/advisories/GHSA-cmwh-pvxp-8882) (moderate; affects dompurify `<= 3.4.10`), a newly-disclosed follow-on to the hook-pollution issue addressed by the 3.4.10 bump in 0.22.72.

## [0.22.72] - 2026-06-18

A reporter-driven patch fixing two 0.22.71 regressions and a crash, plus place type refinements and a dependency security update. Organization member lists once again include person notes identified only by `cr_id` (no explicit `cr_type`), which 0.22.71 had silently dropped. The timeline no longer crashes when a note mixes an inline `events:` array with a bare-number date. Place type reordering now preserves intentional ties and gaps (and the Customize/Edit actions are icons), and the parent-place dropdown shows display names for the highest-ranked type. The bundled dompurify (via jspdf) is updated to 3.4.10 to clear a security advisory. **1533 tests passing across 134 suites.**

### Fixed

- **Organization members that are person notes without an explicit `cr_type` are listed again** ([#742](https://github.com/banisterious/obsidian-charted-roots/issues/742)): a regression in 0.22.71 (from the #738 fix) made the org member scan require an explicit `cr_type: person` / `type: person`, so person notes relying on the long-supported "`cr_id` and no explicit type" shape were silently dropped from their organizations' member lists — often leaving only one member visible. The scan now uses the shared person detection (`isPersonNote`), which honours that legacy shape while keeping `cr_type` authoritative (so a foreign `type: character` is still ignored, preserving the #738 fix). Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Parent place dropdown no longer shows the raw type id for the highest-ranked type** ([#739](https://github.com/banisterious/obsidian-charted-roots/issues/739)): when a place's type is the highest in its hierarchy (so nothing can be its parent), the dropdown's "No valid parent types for …" message showed the internal sluggified id. It now shows the type's display name — a spot missed by #732. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Timeline no longer errors with "e.trim is not a function" when a date is a bare year** ([#741](https://github.com/banisterious/obsidian-charted-roots/issues/741)): a person note that combined an inline `events:` array with a date written as a bare number (e.g. `born: 1850`, which YAML parses as a number rather than a string) crashed the whole timeline render during de-duplication. The dedup key now coerces non-string date/place values to text. Reported by [@tenephor](https://github.com/tenephor).

### Changed

- **Place type reordering now preserves intentional ties and gaps** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734) follow-up): the up/down controls in the Place type manager swap a type's hierarchy level with its neighbour's, rather than renumbering the whole category. Default same-rank pairs (State/Province, District/Township, etc.) stay tied, and any custom gaps are left intact. A tied neighbour disables the arrow (tied types can't be ordered relative to each other — adjust one via Customize). The Customize/Edit action is now a gear/pencil icon with a tooltip to keep the row uncluttered. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Security

- **Updated the bundled dompurify to 3.4.10** (a transitive dependency of jspdf, used for PDF export) to resolve advisories [GHSA-vxr8-fq34-vvx9](https://github.com/advisories/GHSA-vxr8-fq34-vvx9) and GHSA-gvmj-g25r-r7wr, both affecting dompurify `<= 3.4.8`.

## [0.22.71] - 2026-06-16

A reporter-driven release focused on place type management and consistent display names. The Place type manager (Control Center → Places) gains up/down reordering for both categories and the types within them, plus a per-category "+ Add type" button with smart hierarchy-level defaults — making non-Earth and deeply nested place hierarchies far less fiddly to build. Several surfaces that showed a raw internal id now show the proper display name: the universe dynamic blocks, the Place Statistics card and place pickers, and the organization/source type in the Entity Profile pane. The Statistics date range splits universe-less fictional dates into their own "Uncategorized" bucket, and adding a member to an organization no longer silently fails when a person note carries a foreign `type` property. **1526 tests passing across 134 suites.**

### Added

- **Smarter hierarchy ranks for place types** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734)): Building a multi-level place hierarchy (e.g. Region (space) → Sector → System for sci-fi worldbuilding) is much less fiddly. Each category in the Place type manager now has a **"+ Add type"** button that pre-selects that category and defaults the new type one hierarchy level deeper than the deepest existing type in it — so successive adds auto-increment instead of all landing at the same level. Each type row also has **up/down arrows** to reorder it within its category; moving renumbers the category's levels (anchored at its current minimum), which both realizes the chosen order and breaks ties between types that previously shared a level. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Reorder place type categories with up/down controls** ([#733](https://github.com/banisterious/obsidian-charted-roots/issues/733)): The Place type manager (Control Center → Places) now has move-up/move-down buttons on each category. Previously a custom category couldn't be sorted above the built-in categories — they occupy fixed sort positions a numeric order couldn't out-rank — so e.g. an "Astrographical" category was stuck below Geographic and Political divisions. Moving a category now renumbers the whole list, so any category (custom or built-in) can be placed anywhere, including at the very top. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Create/edit place type modal: the quick level presets now have breathing room** from the dynamic hierarchy text above them, instead of sitting flush against it. Minor spacing polish raised in discussion #728 by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Fixed

- **Adding a member to an organization no longer silently fails when the person note has a foreign `type` property** ([#738](https://github.com/banisterious/obsidian-charted-roots/issues/738)): If a person note carried a `type` key (e.g. `type: character` from a user's own data model) alongside `cr_type: person`, adding them to an organization updated the person's memberships but the organization's own member list was left empty — with no error. The organization's member scan used an ad-hoc check that excluded any note whose `type` wasn't exactly "person", so a foreign `type` value silently dropped the member (and the rebuild then cleared the org's `members`/`members_id`). The scan now uses the shared note-type detection, where `cr_type` is authoritative and `type` is only a fallback. Reported by [@prayidae](https://github.com/prayidae).

- **Organization and source types now show their display name in the Entity Profile pane** ([#735](https://github.com/banisterious/obsidian-charted-roots/issues/735)): The profile pane's identity header showed the **Organization type** and **Source type** as their raw sluggified id (e.g. `noble_house` for House Organa) rather than the display name. Both now resolve to the proper name — honoring built-in names and customizations — while editing still edits the underlying id. Same class of issue as #665 (which fixed it for event types in the same pane); surfaced in discussion #730 by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Place types now show their display name instead of the internal id across the Control Center and place modals** ([#732](https://github.com/banisterious/obsidian-charted-roots/issues/732)): The Place Statistics card's type breakdown, the Places list's Type column, and the Create/Edit place modal's Parent place dropdown headers all rendered the raw sluggified id (e.g. `space_region`, `astro_system`) instead of the type's display name. Each now resolves to the proper name — honoring built-in names and customizations — so they read "Region (space)", "Astro system", etc.; an unknown id falls back to a humanized form of the slug. Same class of issue as #731, surfaced in discussion #728 by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Universe dynamic blocks now show the type's display name instead of its internal id** ([#731](https://github.com/banisterious/obsidian-charted-roots/issues/731)): The Type column in the `charted-roots-universe-places`, `-events`, and `-organizations` blocks rendered the raw sluggified id (e.g. `astro_sector`, `space_region`, `noble_house`, `plot_point`) rather than a readable label. Each type id now resolves to its proper display name — honoring built-in names and any customizations — so the column reads "Astro sector", "Noble house", etc. An unknown id (such as a since-deleted custom type) falls back to a humanized form of the slug. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Universe-less fictional dates no longer skew the real-world Statistics range** ([#719](https://github.com/banisterious/obsidian-charted-roots/issues/719) follow-up): A person with a BBY/ABY (or other era) date but no universe link still resolves to a signed canonical year, which the per-universe Entity overview pooled into the real-world span — showing a bare `-33 — 9` where Gregorian years belong. Such dates now group under their own **Uncategorized** range instead of dragging the real-world (and Collections / folder-statistics) span into nonsense, signalling that those entities need a universe assigned. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.70] - 2026-06-14

A reporter-driven release focused on fictional-worldbuilding correctness and entity linking. Calendarium calendars now appear throughout Charted Roots rather than on a single screen, and the integration's settings move next to the calendars they control. Linking a person's place no longer spawns a duplicate note when a place's display name differs from its filename; a marriage location can be unlinked; and the place picker shows each place's parent hierarchy so same-named places can be told apart. The Statistics date range is now era-aware and grouped per universe, so fictional BBY/ABY dates no longer pollute the span, and years before a calendar's earliest era read sensibly. Orphan-organization detection also catches parents referenced only by another organization. **1493 tests passing across 129 suites.**

### Changed

- **Calendarium integration settings moved next to the calendars they control**: The "Calendarium integration" and "Sync Calendarium events" options now live in Settings → **Fictional date systems** (previously under Advanced → Integrations), directly above the list where imported Calendarium calendars appear. Toggling the integration now refreshes that list in place. Follow-up to [#725](https://github.com/banisterious/obsidian-charted-roots/issues/725).

### Fixed

- **Fictional years before a calendar's earliest era now read sensibly instead of as a bare negative** ([#729](https://github.com/banisterious/obsidian-charted-roots/issues/729)): A date that falls before every era a calendar defines — common when a calendar has only forward eras and no "before"-style era — used to render as a raw signed number (e.g. a Gaean Reach range showing `-29 — 1538 GR`). It now reads relative to the earliest era, e.g. `29 before GR`. Applies anywhere canonical years are displayed, including the Statistics date range and the map time slider. Surfaced from #719.

- **Statistics date range is now era-aware and grouped per universe** ([#719](https://github.com/banisterious/obsidian-charted-roots/issues/719)): The Entity overview's "Date range" read the leading four digits of each date, so a fictional `8082 BBY` was treated as the year 8082 and pooled with real-world dates into a nonsensical span. Years are now resolved through the same era-aware machinery the timeline uses (signed canonical years), and the range is grouped per universe — real-world dates show a plain Gregorian span, fictional universes show an era-correct one (e.g. `8082 BBY — 23 ABY`), and a mixed vault lists each separately instead of conflating them. A purely real-world vault is unchanged. The same per-universe range now also feeds the Collections and folder-statistics views. Split from #714; raised in discussion #712 by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Orphan organizations now include parents referenced only by another organization** ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)): An organization named as another org's `parent_org` (Settings → "Parent organization") but with no note of its own wasn't listed under Orphan organizations, so it couldn't be created/adopted from there. Parent references are now scanned too, alongside event, person, and membership references. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Calendarium calendars now appear in Charted Roots** ([#725](https://github.com/banisterious/obsidian-charted-roots/issues/725)): With the Calendarium integration set to "read", Calendarium calendars weren't showing in the event modal's date-system dropdown or other menus. The bridge that reads Calendarium only populated its API reference on one code path (the Control Center's Date Systems card), so every other place that asked for calendars saw none. It now reads the Calendarium API wherever it's needed, so calendars appear consistently, and the bridge logs what it finds (or why it found nothing) for easier diagnosis. Note: recognizing Calendarium event dates (`fc-date`) on timelines is a separate switch — enable **Sync Calendarium events** as well. Reported by [@Fatebreak](https://github.com/Fatebreak).

- **Place linking no longer creates a duplicate note when a place's name differs from its filename** ([#724](https://github.com/banisterious/obsidian-charted-roots/issues/724)): Linking a person's birth, death, or marriage place to a note filed under a disambiguating filename — for example `Essex-MA-USA.md` with `name: Essex` — created a new `Essex.md` and linked that instead of the existing note. The wikilink builder resolved place (and source) references by looking only for a *person* with the matching id (a regression from #559), so the place's id never resolved and it fell back to filename matching, which a diverging name can't satisfy. It now resolves by the correct note type, so the link lands on the existing place. Two related gaps are fixed alongside: a linked **marriage location can now be unlinked** from the Person modal (the field was link-only), and the **place picker shows each place's parent hierarchy** (e.g. "Massachusetts, United States") so two same-named places can be told apart. Reported by [@tenephor](https://github.com/tenephor).

## [0.22.69] - 2026-06-12

A reporter-driven release focused on date handling and event ordering. GEDCOM import now understands many common date formats it used to drop silently, flagging anything ambiguous in the import preview. Computing sort order no longer reports false cycles for reciprocal before/after pairs, and a real loop now opens an inspectable result you can click through to fix each culprit. Fictional/era dates keep month and day, the Statistics date range counts death years, and timeline place context uses a place's name rather than its filename. The Person modal's extended name fields fold into a collapsible section, and the Control Center's orphan organization and universe rows lay out correctly. **1476 tests passing across 128 suites.**

### Added

- **Inspectable result after "Compute sort order"** ([#723](https://github.com/banisterious/obsidian-charted-roots/issues/723)): When Compute sort order hit a before/after loop, its only feedback was a transient notice — the named events (added in [#721](https://github.com/banisterious/obsidian-charted-roots/issues/721)) scrolled away and weren't actionable, so fixing a cycle meant hunting down each event by hand. The operation now opens a small result dialog whenever there are cycles or errors: it shows the updated count (or a "nothing to update" state) and lists the events that couldn't be ordered as clickable links that open the note, so you can jump straight to each culprit and fix its "Occurs before/after". A hint notes that opening a note closes the dialog and that re-running Compute shows the list again. The common quick-success case keeps the lightweight toast. Split from [#721](https://github.com/banisterious/obsidian-charted-roots/issues/721) ([@doctorwodka](https://github.com/doctorwodka)).

### Changed

- **Extended name fields tucked into a collapsible "Extended name options" section** ([#717](https://github.com/banisterious/obsidian-charted-roots/issues/717)): After the name-prefix/suffix/surname-particle fields were added, the Add / Edit Person modal felt cramped and pushed the non-name options further down. Those fields — along with nickname, given name, surname(s), and (when editing) maiden and married names — now live in a collapsible **Extended name options** section, collapsed by default, leaving just the baseline **Name** field up top. Mirrors the existing "Step & adoptive parents" container. Requested by [@doctorwodka](https://github.com/doctorwodka).

### Fixed

- **Fictional/era dates keep month and day precision** ([#722](https://github.com/banisterious/obsidian-charted-roots/issues/722)): An era date with month or day precision such as `DE 1264-08-15` was parsed down to just its year, so two events sharing an era-year could only be ordered by a raw-string comparison — which mis-sorts across eras (a December date landing before a March date that shared the same canonical year). The parser now records the month and day, and the event sort orders by them within the same year; negative-era years like `EP -01-12` keep both the negative year and the month. Surfaced while investigating #721 ([@doctorwodka](https://github.com/doctorwodka)).

- **Event sort no longer reports a phantom cycle for reciprocal before/after, and names the events in a real cycle** ([#721](https://github.com/banisterious/obsidian-charted-roots/issues/721)): When two events expressed the same ordering from both sides — one set to "Occurs before" the other, the other set to "Occurs after" the first — **Compute sort order** double-counted that single constraint and wrongly reported the pair as an unorderable cycle, leaving their sort order stale. Reciprocal relationships now order correctly. And when there genuinely is a before/after loop, the notice (and console) now lists the event titles involved instead of only a count — so you can find the culprit — replacing the modal's misleading "see the console for details". Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Timeline place context uses the place's name, not its filename** ([#720](https://github.com/banisterious/obsidian-charted-roots/issues/720)): The Dynamic Timeline Block's place-context hierarchy (e.g. "Born in London, England") built its leaf segment from the place wikilink's target — the file name — rather than the place note's display name. Vaults that disambiguate same-named places with distinct filenames (two "Essex" notes filed as, say, `Essex-EssexCo-MA-USA` and `Essex-EssexCo-Ontario-Canada`) saw the filename in the timeline instead of "Essex", which made the feature unusable for duplicate place names. The leaf now uses the resolved place's name, so distinctly-filed notes that share a name render correctly. Reported by [@tenephor](https://github.com/tenephor).

- **Statistics Dashboard date range now counts death years** ([#714](https://github.com/banisterious/obsidian-charted-roots/issues/714)): The "Date range" line in the Entity overview anchored each person on a single year — their birth, or their death only if no birth was recorded — so death dates were dropped whenever a birth year existed. The range understated the period the collection covers and could collapse to a single point like "1900 — 1900" for someone who lived 1900–1990. It now spans the earliest and latest of all birth *and* death years, so that person reads "1900 — 1990 (90 years)". The shared analytics also feed the Control Center stats tab, reports, and collections view. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Orphan organization and universe rows now lay out correctly** ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)): The rows in the Control Center's **Orphan organizations** and **Orphan universe values** cards relied on layout classes that were never defined, so the name, reference count, and **Create note** button ran together with no spacing and the buttons didn't line up. The rows now use a proper flex layout — name and count spaced out, buttons right-aligned.

- **Data Quality ops no longer mishandle parenthetical name disambiguators** ([#715](https://github.com/banisterious/obsidian-charted-roots/issues/715)): People disambiguated with a balanced parenthetical in the note title — for example `Jon Smith (son of Robert)` — were misread by two batch operations. "Remove placeholder values" flagged such references for deletion (its malformed-link check matched any link ending in `)`), and "Normalize name formatting" suggested re-casing the annotation to `(Son Of Robert)`. Balanced parentheticals are now recognised as valid disambiguators and left untouched by both. Reported by [@Vericia](https://github.com/Vericia).

- **GEDCOM import no longer silently drops common date formats** ([#716](https://github.com/banisterious/obsidian-charted-roots/issues/716)): Several widely-used date formats imported blank with no warning — full month names (`27 June 1885`), month and year (`October 1848`), qualifiers with a trailing period or synonym (`Abt. 1809`, `About 1870`, `Circa`), `DD/MM/YYYY` slash dates, and dates carrying an event label (`Bapt 18 Dec 1690`, `Buried 11 April 1758`). These now parse correctly. Dates that are genuinely ambiguous (`05/06/1990`, read as day/month), recovered from an event label, or unparseable are listed in the import preview's warnings panel so you can review them before importing, instead of disappearing. Reported by [@oliverclock](https://github.com/oliverclock).

## [0.22.68] - 2026-06-10

A feature release centred on Organizations, with a timeline enhancement and an Obsidian 1.13.1 fix alongside. You can now create an organization inline from the Manage memberships modal and adopt orphaned organizations — names referenced by events or people that never got a note — from the Control Center, bringing Organizations to parity with Universes. The Person modal gains optional name-prefix, name-suffix, and surname-particle fields, and the Dynamic Timeline Block's place context becomes depth-configurable, up to the full location hierarchy. The settings tab, which rendered blank on Obsidian 1.13.1, is also restored. **1420 tests passing across 122 suites.**

### Added

- **Timeline place context can show the full location hierarchy** ([#705](https://github.com/banisterious/obsidian-charted-roots/issues/705)): The place-context feature (v0.22.66) appended only the immediate parent, so "London, England" still left "Essex, Essex Co." ambiguous. You can now choose how many parent levels to append — set **Place context depth** under Settings → Timeline → Event display (1 = immediate parent, the default; 0 = full hierarchy up to the root place), or override per block with `place_context: <number>` or `place_context: full`. Long places wrap to the next line so deep hierarchies don't overflow the block. Requested by [@tenephor](https://github.com/tenephor), with the depth-selector and line-wrap suggestions from [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Create an organization from the Manage memberships modal** ([#710](https://github.com/banisterious/obsidian-charted-roots/issues/710)): The organization dropdown in the Add membership modal now offers a **+ New organization** option, so you can create an organization on the spot instead of cancelling out to the Control Center and back. Mirrors the "+ New" options in the place and person modals, and continues [#700](https://github.com/banisterious/obsidian-charted-roots/issues/700). Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Name prefix, suffix, and surname-particle fields in the Person modal** ([#709](https://github.com/banisterious/obsidian-charted-roots/issues/709)): The Add / Edit Person modal now has optional **Name prefix** (Dr., Rev.), **Name suffix** (Jr., III), and **Surname prefix** (von, de la) inputs, next to the existing Given name and Surname(s) fields. They map to the `name_prefix` / `name_suffix` / `surname_prefix` properties used for GEDCOM round-trip — previously these could only be set by hand or populated by an import. Stemmed from discussion [#706](https://github.com/banisterious/obsidian-charted-roots/discussions/706) ([@Vericia](https://github.com/Vericia)).

- **Adopt orphaned organizations from the Control Center** ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)): When you reference an organization that has no note yet — for example by typing one into an event's Organizations field — it becomes an unlinked wikilink that doesn't appear in the Organizations tab. That tab now lists these under **Orphan organizations**, each with a **Create note** button (plus **Create all**). Creating the note links up every existing reference and backfills the new organization's id onto the person notes that referenced it. Mirrors the Orphan universe values feature, bringing the two to parity. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Fixed

- **Settings tab no longer renders blank on Obsidian 1.13.1**: The settings tab hosts its interface through a setting-definition render callback that relied on a container argument Obsidian 1.13.1 stopped providing, so the whole tab came up empty on that version. It now renders into the documented setting element. Obsidian 1.13.0 and earlier (which use the classic settings path) are unchanged.

## [0.22.67] - 2026-06-09

A small reporter-driven patch alongside a codebase-wide type-checking pass. Family Chart highlight dimming no longer lets the connector lines show through dimmed cards, and the relationships filter now labels user-created relationship categories instead of leaving them blank. Under the hood, the TypeScript codebase is now fully type-checked with zero errors and the type-check gates CI — a sweep that also turned up and fixed two latent bugs in the "Find related research" command and the GEDCOM-X export's reported count. **1397 tests passing across 121 suites.**

### Fixed

- **Highlight dimming no longer shows connector lines through dimmed cards** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): The previous fix dimmed non-matching cards by making them translucent, so the full-brightness connector lines behind them showed through. Dimmed cards now stay fully opaque (dimmed with a filter rather than reduced opacity), so the links behind them are hidden again. Follows up the v0.22.66 highlight-dimming change. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Custom relationship categories are labelled in the relationships filter** ([#707](https://github.com/banisterious/obsidian-charted-roots/issues/707)): In the relationships filter's "By category" dropdown, a relationship category you created yourself appeared as a blank entry — clickable and functional, but with no name — because the label came from the built-in category list only. Custom category names now resolve correctly, in both the Relationships pane and the Control Center Relationships tab. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"Find related research" recognizes the open person note** ([#704](https://github.com/banisterious/obsidian-charted-roots/issues/704)): Running the **Find related research** command while viewing a person note didn't detect the note as a person, so it always fell through to the person-picker prompt instead of using the note you were already on. It now uses the active note when it is a person.

- **GEDCOM-X export reports the correct exported count** ([#704](https://github.com/banisterious/obsidian-charted-roots/issues/704)): The completion notice for a GEDCOM-X export always read "0 people exported" (and zero relationships) because it counted from the wrong object; the exported file itself was complete and correct. The notice now reports the actual number of people and relationships written.

## [0.22.66] - 2026-06-08

A reporter-driven release centred on timelines, organizations, and the Family Chart. Timelines gain two new display options — a person's inline `events` list now appears alongside births, deaths, and family events, and rows can show a place's parent location ("Born in London, England") so a bare leaf name isn't ambiguous — while historical-context events are now windowed by a person's whole life rather than only their personal milestones. The Edit person modal gains an always-available living-status control, organization member lists honour `sort: date`, custom relationships mapped to parent or spouse keep their own type, and the Family Chart's highlight dimming no longer washes out the connector lines. **1393 tests passing across 120 suites.**

### Added

- **Personal events now appear on timelines** ([#692](https://github.com/banisterious/obsidian-charted-roots/issues/692)): A person's inline `events` list (residence, occupation, immigration, and the like) showed on Maps but never on the Dynamic Timeline Block. Those events now appear on the timeline too, interleaved with birth, death, and family events in chronological order — era-aware for fictional calendars — and labelled by event type with their place. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Living-status control in the person modal** ([#698](https://github.com/banisterious/obsidian-charted-roots/issues/698)): Marking a person living or deceased previously meant hand-editing the `cr_living` property, or turning on privacy protection to reveal a hidden override. A **Living status** dropdown (Automatic / Living / Deceased) now sits directly under the death fields in both the create and edit person modals, always available. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Timelines can show place context** ([#701](https://github.com/banisterious/obsidian-charted-roots/issues/701)): Dynamic Timeline Block rows can now append a place's parent location, so an event reads "Born in London, England" instead of the ambiguous "Born in London" (there are dozens of places named London). The parent comes from the place note hierarchy (`parent_place`), and entries whose place isn't a place note, or has no parent, are left unchanged. It's off by default; enable **Show place context** under Settings → Timeline → Event display, or override per block with `place_context: true` / `place_context: false`. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Family Chart focus outline width is adjustable** ([#689](https://github.com/banisterious/obsidian-charted-roots/issues/689)): The focus (root person) outline shares the connector-line accent colour, so at a fixed width it could still be easy to miss. Its width is now adjustable from 2 to 10 pixels (default 4) through the Style Settings plugin, under Family Chart View. Follows up the v0.22.64/v0.22.65 focus-indicator changes. Raised by [@tenephor](https://github.com/tenephor) and [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"Manage memberships" on a person with none now prompts you to add one** ([#700](https://github.com/banisterious/obsidian-charted-roots/issues/700)): Choosing **Manage memberships** on a person who belongs to no organizations used to dead-end with a "this person has no organization memberships to manage" notice. It now opens the **Add membership** dialog directly, so you can add their first membership from the available organizations without detouring through the Organizations tab of the Control Center (and if no organizations exist yet, it offers to create one). Requested by [@doctorwodka](https://github.com/doctorwodka).

### Fixed

- **Highlight dimming no longer washes out connector lines** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With Highlight Groups active, the layer that dims non-matching cards also fell across the connector lines routing into those cards, greying them. Dimming is now applied to the card content alone, so the connector lines keep their full colour next to dimmed cards. Follows up the v0.22.63/v0.22.64 highlight-dimming fixes. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Timeline context events now span a person's whole life** ([#699](https://github.com/banisterious/obsidian-charted-roots/issues/699)): The historical-context lifespan margin was measured only against a person's own milestones, so context during a period dominated by family events — or the later life of someone with no recorded death — could be dropped. The margin window now reflects the whole life: family events widen it, a person with no death date extends to their latest family event (or, when marked living, to their latest historical-context event), and a recorded death caps it. Follows up [#695](https://github.com/banisterious/obsidian-charted-roots/issues/695).

- **Organization member lists honour `sort: date`** ([#702](https://github.com/banisterious/obsidian-charted-roots/issues/702)): The `charted-roots-members` block accepted `sort: date` but always fell back to sorting by name. Members now sort by the start date of their membership (`from`) — earliest first, undated members last, name as a tiebreak — and fictional BBY/ABY join dates order by true chronology. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Custom relationships mapped to parent or spouse keep their own type** ([#703](https://github.com/banisterious/obsidian-charted-roots/issues/703)): A custom relationship type mapped to "parent" or "spouse" was written using the built-in `parents`/`spouse` properties, discarding the custom type name. The custom field is now preserved (a "Creator" relationship writes `creator`, for example), and the Family Chart still reads it as a parent or spouse edge. Spouse-mapped types now always write the reciprocal link on both people. Reported by [@doctorwodka](https://github.com/doctorwodka).

## [0.22.65] - 2026-06-07

A reporter-driven release focused on timelines, the Family Chart, and import. Dynamic Timeline Blocks now handle fictional calendars properly — context-note events written in eras like BBY/ABY display, and events that mix eras (BBY and ABY) sort and filter by true chronology instead of the bare year number. Event icons appear consistently across timeline rows and are shown by default. The Family Chart no longer labels unmarried co-parents as spouses, and its focus indicator stands out more clearly. Children added from a parent's Edit person modal now link back to the parent automatically, and the import wizard warns before creating a very large vault. **1361 tests passing across 117 suites.**

### Added

- **Large-import warning and projected note count** ([#688](https://github.com/banisterious/obsidian-charted-roots/issues/688)): The import wizard's preview now shows the total number of notes an import will create and warns when that total is large enough to slow Obsidian down (around 10,000+), suggesting you narrow the file — for example to your direct lines plus a few generations — before proceeding. The warning appears before any notes are written, and applies to every import format (GEDCOM, GEDCOM-X, Gramps, CSV). Raised by [@inerlogic](https://github.com/inerlogic). The import wizard's preview now shows the total number of notes an import will create and warns when that total is large enough to slow Obsidian down (around 10,000+), suggesting you narrow the file — for example to your direct lines plus a few generations — before proceeding. The warning appears before any notes are written, and applies to every import format (GEDCOM, GEDCOM-X, Gramps, CSV). Raised by [@inerlogic](https://github.com/inerlogic).

### Changed

- **Family Chart focus outline is more visible** ([#689](https://github.com/banisterious/obsidian-charted-roots/issues/689)): The focus (root person) outline added last release is now drawn slightly thicker (4px instead of 3px) so it stands apart from the connector lines, which share the accent colour — at the old width the default purple accent in dark mode could be easy to miss. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Timelines show event icons by default** ([#691](https://github.com/banisterious/obsidian-charted-roots/issues/691)): The **Event type display** setting now defaults to **Icon with label** instead of **Text label**, so timelines, canvas event nodes, and maps show their event-type icons out of the box. Existing vaults are migrated once on upgrade (a saved **Text label** becomes **Icon with label**); if you prefer text only, set it back in Settings and your choice sticks.

### Fixed

- **Children added from a parent's Edit person modal now link back to the parent** ([#697](https://github.com/banisterious/obsidian-charted-roots/issues/697)): Creating (or linking) a child through a person's **Edit person** modal listed the child on the parent's note but left the child's own note without a `father`/`mother` link — so the relationship was only half-connected until you ran the Data Quality bidirectional fix. The reverse parent link is now written onto each child when the parent is saved. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Mixed-era timelines now sort and filter by true chronology** ([#695](https://github.com/banisterious/obsidian-charted-roots/issues/695)): The Dynamic Timeline Block ordered events, and applied the context lifespan-margin, by the bare year number while ignoring the era. A timeline mixing BBY and ABY dates therefore ordered them meaninglessly (an `ABY 40` event could sink below a `BBY 10` one), and context-note events were kept or dropped by digit magnitude rather than their real distance from the person's life. Sorting and the margin window now use era-aware canonical years, so timelines read earliest-at-top consistently across eras (matching real-world dates) and context events are windowed by true chronological distance. As part of this, a pure-BBY timeline now also reads birth-at-top, consistent with how Gregorian timelines have always sorted.

- **Event icons now appear consistently on timelines** ([#691](https://github.com/banisterious/obsidian-charted-roots/issues/691)): In **Text label** mode, a person's own events (birth, death, their event notes) showed an icon only when the same timeline also happened to contain a family event, while historical-context and family rows always showed icons — so the same note could render icons on some rows but not others, and an identical event type appeared iconed for one person and bare for another. Event icons are now all-or-nothing per timeline, driven solely by the **Event type display** setting: every row shows an icon in **Icon** or **Icon with label** mode, and no row does in **Text label** mode. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Timeline context notes now work with fictional dating systems** ([#693](https://github.com/banisterious/obsidian-charted-roots/issues/693)): A historical-context note added to a Dynamic Timeline Block (via `context: [[…]]`) only displayed its events when the dates were written as four-digit calendar years. Lines dated in a fictional era — `BBY 32`, `32 BBY`, and the like — were silently skipped, so a fictional context note showed nothing while a real-world one worked. Context dates now recognise era abbreviations (in either order) and short years, including ranges, and resolve through the same date system as the person's own events. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart no longer labels unmarried co-parents as spouses** ([#694](https://github.com/banisterious/obsidian-charted-roots/issues/694)): With **Show kinship labels** on, two people who share a child but have no spouse relationship were labelled "Spouse". The label was inferred from the shape of the connecting line — the chart draws a straight line between co-parents so their child can branch from it, and a straight line was assumed to mean marriage. The label is now checked against the actual relationship data, so only real spouses are labelled "Spouse" and an unmarried co-parent connector carries no label. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Family Chart highlight dimming no longer clips connector lines on Circle cards** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With Highlight Groups active and the Circle card style, the dim layer on non-matching cards was sized to a bounding box, which overhung the round card and faintly dimmed the connector lines passing near it. The dim layer now matches the card's circle, so the lines stay clean. Follows up the v0.22.63 highlight-dimming fix. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.64] - 2026-06-06

A reporter-driven release across Family Chart, migration statistics, and GEDCOM import. The Family Chart's focus indicator is visible again, and highlight groups now work when the chart is in a pop-out window. Migration routes count each move a person made rather than only their net birthplace-to-final journey, so shared family moves and round trips are represented. And GEDCOM import folds variant spellings of the same place into one note instead of creating duplicates, with historical place names now stored as flat properties. **1326 tests passing across 113 suites.**

### Fixed

- **Family Chart focus indicator is visible again** ([#689](https://github.com/banisterious/obsidian-charted-roots/issues/689)): The border drawn around the focus (root) person's card took its colour from the card's text, so the darker card text introduced in v0.22.63 made the focus outline blend into dark cards and effectively disappear. The outline now uses the theme's accent colour, independent of the text colour, so the focused person is clearly marked (in the chart and in exports). Reported by [@tenephor](https://github.com/tenephor).

- **Family Chart highlight groups now work in a pop-out window**: With the Family Chart moved to its own window, Highlight Groups had no effect — cards were neither dimmed nor highlighted — even though selecting a card still worked. The highlight pass was looking for cards in the main window rather than the pop-out, so it found none. It now applies within the chart's own window. Raised in the [#670](https://github.com/banisterious/obsidian-charted-roots/issues/670) discussion by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Migration routes now count each move, not just the net journey** ([#684](https://github.com/banisterious/obsidian-charted-roots/issues/684)): The Statistics Dashboard and Places "Top migration routes" previously modeled each person as a single origin -> destination pair (their first known place to their last), which undercounted shared moves and hid round trips. A family that gathers at one place and moves on now counts every member on the shared leg even when they were born in different places, a round trip (A -> B -> A) contributes both of its legs instead of vanishing, and intermediate stops appear as their own routes. The migration rate and moved/analyzed totals are unchanged (still "did this person move at all"), and the parent/child place collapse still applies per leg so a place and its own sub-place don't read as a move. Follows up [#643](https://github.com/banisterious/obsidian-charted-roots/issues/643). Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **GEDCOM import consolidates variant spellings of the same place** ([#687](https://github.com/banisterious/obsidian-charted-roots/issues/687)): A single place that appeared under several `PLAC` forms across a GEDCOM (for example "Montréal, Québec, Canada", "Montreal, Quebec, Canada", and "Montreal, QC, Canada") used to create a separate place note for each, fragmenting everything attached to that location. Import now folds these together into one note: Canadian province abbreviations are expanded like US states already were (QC -> Quebec, Ont. -> Ontario), and accent / case / spacing / punctuation variants and "same town under a differently-named higher tier" forms consolidate, keeping the richest spelling and preserving the other forms in `historical_names`. The consolidation is deliberately conservative — it never merges two places that only share a leaf name (so Quebec the province and Quebec the city stay separate). Reported by [@inerlogic](https://github.com/inerlogic).

- **Historical place names are stored as flat properties** ([#687](https://github.com/banisterious/obsidian-charted-roots/issues/687)): `historical_names` was a nested YAML array of objects (`- name:` / `period:`), which Obsidian does not fully support (the Data Quality pane flagged it, like the image-crop case in v0.22.63). It is now a flat list of names with an optional index-aligned `historical_name_periods` list. Existing notes still load (the older nested form is read for backward compatibility), and **Flatten nested properties** (Control Center) now offers a "Historical place names" option that converts them in bulk. The Merge Duplicate Places tool and the place template write the flat form too.

## [0.22.63] - 2026-06-05

A reporter-driven follow-up release. GEDCOM and GEDCOM-X imports now keep generational name suffixes (Sr. / Jr. / III) so relatives who share a name stay distinct, clearing a person's birth or death place in the Edit Person modal removes it on save, the event-driven migration analysis gains three accuracy refinements, and Family Chart highlight groups no longer paint dimmed cards under the connector lines. The person modal also gains a burial date field, and image crop regions move to flat properties so they no longer trip the Data Quality nested-property warning. **1289 tests passing across 111 suites.**

### Added

- **Burial date field in the Create/Edit Person modal** ([#682](https://github.com/banisterious/obsidian-charted-roots/issues/682)): The person modal now has a "Burial date" field alongside the birth and death dates, writing the `burial_date` property (previously only set by import or by editing frontmatter by hand). Clearing it removes the property. Requested by [@tenephor](https://github.com/tenephor).

### Fixed

- **GEDCOM and GEDCOM-X import keep generational name suffixes** ([#685](https://github.com/banisterious/obsidian-charted-roots/issues/685)): When an import had relatives who share a given name and surname and differ only by a suffix (Sr. / Jr. / III, stored in GEDCOM's `NSFX` tag or a GEDCOM-X `Suffix` name-part), the suffix was dropped from the note name, so they collided to one base name and were numbered instead (`John Smith`, `John Smith 1`, `John Smith 2`). The suffix is now folded into the name (and therefore the filename), so each person stays distinct (`John Smith Jr.`, `John Smith III`). Reported by [@inerlogic](https://github.com/inerlogic).

- **Unlinking a birth or death place in the Edit Person modal now removes it on save** ([#680](https://github.com/banisterious/obsidian-charted-roots/issues/680)): Clearing a person's birth place or death place and saving without choosing a replacement left the old `birth_place` / `death_place` wikilink (and its `_id`) in the note. The modal now signals a cleared place the same way it signals a cleared parent, so the writer removes both properties. Reported by [@tenephor](https://github.com/tenephor).

- **Migration analysis follow-ups** ([#643](https://github.com/banisterious/obsidian-charted-roots/issues/643)): Three refinements to the event-driven migration analysis from v0.22.61. The **Place statistics** card on the Places tab now uses the same event-driven analysis as the Statistics Dashboard, so the two agree (it previously still inferred moves from birth and death locations). A destination that is a **sub-place** now counts toward the place that contains it when other journeys name that place directly, so a move into a building or district counts toward its city rather than splitting off its own tally. And the **Statistics Dashboard refreshes on its own** after you add or edit a movement event, instead of reading stale until a resave or reboot. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart highlight groups no longer paint dimmed cards under the connector lines** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With highlight groups active, the dimmed (non-matching) cards could render *beneath* the relationship lines on Linux and macOS, so the lines cut across them. Dimming now uses an overlay over each card instead of lowering the card's opacity, which avoids the stacking-context quirk that pushed dimmed cards below the lines. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Image crop regions are stored as flat properties** ([#683](https://github.com/banisterious/obsidian-charted-roots/issues/683)): Crop data for images was stored as a nested YAML array (`media_crop: [{ image, x, y, w, h }]`). Obsidian does not fully support nested properties, so the Data Quality pane flagged a warning on every note that had a crop. Crops now use flat parallel arrays (`media_crop_image`, `media_crop_x`, `media_crop_y`, `media_crop_w`, `media_crop_h`), which the Data Quality pane accepts. Existing notes still render, setting or changing a crop migrates that note automatically, and **Flatten nested properties** (Control Center) converts the rest in bulk. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.62] - 2026-06-04

A small follow-up release polishing three items reported after v0.22.61: the Statistics Dashboard's issues card now names only the data-quality categories that actually have something in them, the Split canvas wizard's completion screen lays out correctly, and Family Chart Circle avatars keep their colored ring after "fit to view". Under the hood, the settings tab and its buttons now use Obsidian 1.13.0's settings and button APIs where the running app provides them, while continuing to support older versions — no visible change on current releases. **1245 tests passing across 105 suites.**

### Fixed

- **Statistics Dashboard issues card lists only the categories with something to fix** ([#676](https://github.com/banisterious/obsidian-charted-roots/issues/676)): The dashboard's summary "Issues" card always spelled out "Missing births + orphans + unsourced events" in its subtitle, even when one of those categories had a zero count — so with birth dates fully complete it still read "Missing births" despite none being missing. The subtitle now names only the categories that actually contribute to the count. Follows up the v0.22.61 fix. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Split canvas wizard's completion screen lays out correctly** ([#673](https://github.com/banisterious/obsidian-charted-roots/issues/673)): The wizard's final "Complete" step rendered its created-files list and configuration summary crammed together and overlapping the step indicator, because that step's content used the wrong container style. It now uses the same column layout as every other step in the wizard. Follows up the v0.22.61 filename fix. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart Circle avatars keep their colored ring after "fit to view"** ([#677](https://github.com/banisterious/obsidian-charted-roots/issues/677)): With the Circle card style, clicking "fit to view" kept the avatars round but dropped the gender-colored ring behind each one. The fit re-render dropped the ring along with the circular clip, and only the clip was being restored afterward; the ring is now re-applied too. Follows up the v0.22.61 pop-out fix. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.61] - 2026-06-04

A reporter-driven cycle centered on two genealogy upgrades plus a run of Family Chart and data-accuracy fixes. Migration analysis on the Statistics Dashboard now reads movement events (Residence / Immigration / Emigration) instead of inferring moves from birth and death locations, and merging duplicate places preserves the older or variant names as historical names instead of discarding them. Alongside those: the Statistics Dashboard's issues notice and completeness section now agree, the Family Chart re-compacts when cards shrink and keeps its Circle avatars round (and no longer blanks) in a pop-out window, deleting a symmetric custom relationship cleans up the other side, and single-lineage canvas exports get distinguishing filenames in the canvases folder. **1240 tests passing across 104 suites.**

### Added

- **Migration analysis on the Statistics Dashboard now uses movement events** ([#643](https://github.com/banisterious/obsidian-charted-roots/issues/643)): The dashboard's migration section previously inferred moves only from birth location → death location, so it missed living people (no death location yet), counted a place and its own sub-place as a "move," and showed lifetime moves as no migration when someone died where they were born. It now reads Residence / Immigration / Emigration events as the primary signal — capturing living migrants and round-trip moves — and is aware of place hierarchy so a place and its parent aren't counted as a migration. Birth → death remains a labeled fallback, and the route counts show an honest denominator. (The Migration Flow Diagram modal still uses birth → death and will move to the event-driven approach in a later pass.) Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Merging duplicate places preserves the discarded names** ([#635](https://github.com/banisterious/obsidian-charted-roots/issues/635)): When you merge duplicate place notes (for example, GEDCOM-imported variants like "Hartford" and "Hartford, Connecticut"), the surviving place now keeps the older or variant name as a historical name instead of trashing it with the duplicate note. The surviving (modern) name stays primary, each discarded name is added to the survivor's `historical_names`, and duplicates are skipped — so a period-appropriate name you'd built up isn't lost on merge. Place notes also now load their existing `historical_names` so the entries survive a round-trip. Requested by [@Darcylynn](https://github.com/Darcylynn).

### Fixed

- **Statistics Dashboard no longer reports missing births when none are missing** ([#676](https://github.com/banisterious/obsidian-charted-roots/issues/676)): The dashboard's issues notice and its "Data completeness" section counted people two different ways — completeness read the family graph, while the missing-births and missing-deaths tallies were computed from a separate vault scan. When those two scans didn't line up exactly, the issues notice could show a phantom "missing births" count even with birth-date completeness at 100%. Both counts now derive from the same family-graph people that drive the completeness percentages, so the two sections always agree (living people remain correctly excluded from missing deaths). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart tree re-compacts when cards get smaller again** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): After cards grew — toggling descriptive fields on, or a long-named Circle card widening to fit — the extra spacing needed to keep cards from overlapping was being baked into your saved spacing setting, so it never relaxed again. Toggling those fields back off left the tree spread out with the connector lines stretched. Spacing now tracks the card size in both directions: it still grows to prevent overlap, but shrinks back toward your chosen spacing when cards get smaller, and your spacing preference (and its menu selection) is no longer silently overwritten. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart Circle avatars stay round in a pop-out window** ([#677](https://github.com/banisterious/obsidian-charted-roots/issues/677)): With the chart moved to a separate window ("Move to new window") and the Circle card style active, clicking "fit to view" turned the round avatars back into squares. The circular clip relied on a reference that a pop-out window's separate document couldn't resolve and that the fit re-render dropped. Avatars now use a self-contained circular clip that survives both the move to a pop-out and subsequent re-renders. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart no longer blanks when refreshed in a pop-out window** ([#678](https://github.com/banisterious/obsidian-charted-roots/issues/678)): With the chart in a separate window, refreshing left the canvas blank — the cards were positioned and clickable, but nothing was drawn. The saved zoom level was being re-applied through an animation that only runs in the main window, so in a pop-out the chart rendered with no zoom applied and the view sat on empty space. The zoom is now restored directly, so the chart paints. (One edge case is still under investigation: a *maximized* pop-out window can still blank on refresh, which appears to be a window-compositing limitation outside the plugin.) Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Single-lineage canvas exports get a distinguishing filename and land in the canvases folder** ([#673](https://github.com/banisterious/obsidian-charted-roots/issues/673)): In the Split wizard, the Single-lineage method named every export a generic `lineage.canvas`, so exporting a second lineage collided with the first. The default filename now folds in the start and end person (for example, `lineage-Aaron-Wilkin-to-Mara-Wilkin.canvas`), matching how the other split methods already include a descriptor. Split exports also now default to your Canvases folder instead of the People folder, so lineage canvases no longer land next to person notes (you can still change the output folder in the wizard). Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Deleting a symmetric custom relationship now removes it from the other person too** ([#675](https://github.com/banisterious/obsidian-charted-roots/issues/675)): Adding a symmetric custom relationship (one that reads the same both ways, like "best friend" or "twin") writes a matching entry onto the other person's note. Deleting it from one note's frontmatter left that companion entry behind on the other note, and because the relationship is symmetric it was then shown right back on the note you deleted it from — so it appeared stuck even after restarting Obsidian. Removing such a relationship from a note's frontmatter now also strips the matching entry from the linked person's note. Asymmetric relationships were unaffected (their reverse side is computed on the fly, not stored). Reported by [@doctorwodka](https://github.com/doctorwodka).

## [0.22.60] - 2026-06-03

A Family Chart card-rendering pass plus follow-ups to the v0.22.59 data-integrity and export work. The Circle, rectangle, compact, and mini card styles now render names and detail fields more legibly: Circle and the rectangular styles size to their content (widening or wrapping) instead of clipping, the default cards are more compact, and the Pastel theme and Highlight Groups read correctly in every theme and on every platform. The "Repair misaligned children" data-quality tool reconciles both parents of a shared child in a single pass, and person-filtered timeline exports no longer overwrite each other. **1176 tests passing across 98 suites**.

### Fixed

- **Family Chart Circle avatars clip without a CSS feature flagged by the Community review**: The round-avatar clip moved from a CSS `clip-path` property — which the Community plugin review flags as only partially supported on the minimum Obsidian version — to an equivalent SVG clip path. No visible change, and it scales more reliably across avatar sizes.

- **"Repair misaligned children" now fixes both parents of a shared child in one pass** ([#666](https://github.com/banisterious/obsidian-charted-roots/issues/666)): When two parents shared the same children, the tool could repair one parent but leave the other — either because the second parent's two lists happened to stay the same length (so the note read as aligned), or because that parent was simply missing a child the first parent recovered. A broken child link can quietly mask a real child too — the link points nowhere while its paired ID belongs to a different person. The detector now treats a broken child link as a repair trigger in its own right, and reconciles the co-parent of every recovered child in the same run — rebuilding a partner that is missing a shared child even when its own lists looked clean. Both parents are fixed together instead of needing a second pass. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart Circle cards widen to fit long names and detail fields** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): The Circle card style used a fixed width, so longer compound names and the optional detail lines (nickname, title, occupation, and so on) ran past the card edge and were clipped. Circle cards now measure their longest line of text and widen to fit it — the label centers on an otherwise empty card, so this costs no layout density — and spacing adjusts so wider cards don't overlap. "Split given/surname" remains a good way to keep names compact. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart rectangle cards are more compact with clearer spacing** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): The default (rectangle) card style used a large avatar and a wide card, so a spouse couple rendered flush as one block and the tree felt crowded. Rectangle cards now use a smaller avatar and tighter dimensions, and the minimum gap between cards is wider, so spouse and sibling cards stay visually distinct. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Person-filtered timeline exports no longer overwrite each other** ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)): A timeline export (Canvas, Excalidraw, or Markdown) took its file name from the title alone, which defaults to "Event Timeline" regardless of the "Filter by person" selection — so exporting a second person prompted to replace the first person's file. The export now folds the filtered person into the title and file name (for example, "Event Timeline - Ahsoka Tano"), so each person gets its own export instead of colliding. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart Highlight Groups keep dimmed cards above the connector lines** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With Highlight Groups active, the dimmed (non-matching) cards could be painted beneath the parent-child and spouse connector lines on some platforms, while the highlighted cards stayed above them — so the lines appeared to run across the dimmed cards. The card layer is now isolated so every card, dimmed or highlighted, stays above the connector lines. Reported by [@tenephor](https://github.com/tenephor).

- **Family Chart rectangle, compact, and mini cards wrap long names** ([#671](https://github.com/banisterious/obsidian-charted-roots/issues/671)): On the SVG-based card styles a name wider than the card was clipped at the right edge instead of wrapping. A name that overflows now wraps at a word boundary onto a second line, and the cards grow in height to fit, so multi-word names stay readable. (A single word longer than the whole card can still be trimmed — the wider Compact style or "Split given/surname" both help there.) The Circle style already widens to fit its longest line (see #669). Reported by [@tenephor](https://github.com/tenephor).

- **Family Chart Pastel theme uses readable card text in dark mode** ([#672](https://github.com/banisterious/obsidian-charted-roots/issues/672)): Under a dark Obsidian theme the Pastel color theme drew white labels on its light pastel cards, which were hard to read. Because the pastel card colors are light in both modes, Pastel now uses dark card text in dark mode too — matching its light-mode text and the High Contrast theme's approach. Reported by [@tenephor](https://github.com/tenephor).

## [0.22.59] - 2026-06-02

A focused follow-up to v0.22.58 addressing a relationship data-integrity bug and two Family Chart rendering issues. A parent's children list could fall out of step with its companion ID list and silently mis-pair or drop relationships on the next edit — this is now prevented at the source and repairable for already-affected notes via a new Data Quality tool. The Family Chart "Circle" card style is rebuilt to show round avatars with their connection bubbles and placeholders intact, and the batch-repair warning callouts are now legible in every theme. **1162 tests passing across 96 suites**.

### Fixed

- **Family Chart "Circle" card style shows connection bubbles and the avatar placeholder again** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): The Circle card style was drawn with a different renderer than the other styles, which never produced the small connection-indicator bubbles (the markers showing a card has more relatives to expand) and rendered the no-photo placeholder oddly. Circle now renders a round avatar — ringed in the gender color, name centered beneath — on the same renderer the other styles use, so the bubbles, the placeholder, and branch expand/collapse all behave consistently across every theme. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Data Quality warning callouts are readable in every theme**: The "back up your vault" notice shown before batch repairs rendered warning-colored text on a warning-colored background, which could disappear entirely in some themes. It now uses the standard text color, so the message and its icon stay legible.

- **Misaligned parent children lists no longer mislabel or drop relationships** ([#666](https://github.com/banisterious/obsidian-charted-roots/issues/666)): A parent note stores its children as two parallel lists — `children` (the links) and `children_id` (the stable IDs) — that must line up one-for-one. If an ID went missing (for example, a child link left in path form during earlier editing), the lists fell out of step, and the next edit silently re-paired each child's name with the wrong child's note, producing links like `[[correct note|wrong name]]` and dropping a reference. The Edit Person load path now pairs each link with its own resolved identity (rather than by position) whenever the two lists disagree in length, and the rename cascade now finds the renamed person by ID instead of array position, so neither can introduce the mismatch. A new **"Repair misaligned children"** Data Quality tool detects affected notes and rebuilds the lists from each child's own parent links — recovering dropped children and clearing the misleading aliases — with a preview before anything is written. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.58] - 2026-06-02

A reporter-driven follow-up to v0.22.57, re-fixing several issues whose first pass missed a parallel render or save path — fictional-date calendar attribution, event participant and place aliases, the timeline export person filter, and the Create/Edit Event modal's Organizations field — alongside a Data Quality refresh fix, an event-profile header label fix, a Family Chart High Contrast line-visibility fix, and a new opt-in "Show sibling's marriages" timeline toggle. **1145 tests passing across 95 suites**.

### Added

- **"Show sibling's marriages" timeline toggle** ([#661](https://github.com/banisterious/obsidian-charted-roots/issues/661)): A new opt-in toggle adds a sibling's marriage to the focal person's Dynamic Timeline block — so you can see the focal person's age at a sibling's wedding — joining the existing relative-event toggles for parents' (#608) and children's (#607) marriages. Marriages are read from the same person-encoded vital-event data, covering biological and adopted siblings (step-siblings are excluded, matching sibling births), with the spouse's name, marriage location, and a customizable label. Off by default. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Fixed

- **Data Quality pane reflects corrected data after an edit** ([#664](https://github.com/banisterious/obsidian-charted-roots/issues/664)): After filling in missing data (e.g. a birth date), the Data Quality view's results — and its Refresh button — could keep reporting the item as missing. The view re-scanned on the file-save event, which fires before Obsidian re-reads the note's frontmatter, so the scan saw the pre-edit version. It now refreshes when the note's metadata has actually been re-read, so corrected values clear from the list on their own shortly after editing. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Event profile header shows the event type's display name, not the raw id** ([#665](https://github.com/banisterious/obsidian-charted-roots/issues/665)): The Entity Profile pane's heading area listed an event's type as its internal slug (e.g. `plot_point`) instead of the catalog name ("Plot point"). The header now resolves the type through the event-type catalog — built-in and custom types alike — while keeping the raw id as the editable value. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Person-filtered Canvas and Excalidraw timeline exports return the selected person's events** ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)): The previous fix normalized the timeline export's "Filter by person" comparison for the on-screen preview and the Markdown export, but the Canvas and Excalidraw exporters (the default format) still compared the bracket-stripped dropdown value against event person fields that keep their wikilink brackets — so exporting a person-filtered timeline to Canvas failed with "No events to export after filtering" even though the preview reacted correctly. Both exporters now share a single person-matcher, so all three formats filter consistently. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **The Create/Edit Event modal now saves the Organizations field** ([#659](https://github.com/banisterious/obsidian-charted-roots/issues/659)): The new "Organizations" field was added to the event modal but never wired into either save path, so entering organizations and clicking save reported success while writing nothing — only hand-editing the note's frontmatter worked. The field now persists on both create and edit, and editing an existing event pre-fills it with the event's current organizations. The organization "Events" section also now shows each event's type with its proper name and icon (e.g. a custom "Lore event") instead of the raw `lore_event` slug. Reported by [@doctorwodka](https://github.com/doctorwodka) and [@DigitalDreamn](https://github.com/DigitalDreamn).

- **A custom calendar now wins over a built-in that shares its era abbreviations** ([#650](https://github.com/banisterious/obsidian-charted-roots/issues/650)): Fictional dates were credited to a built-in date system even when a custom calendar applied — the built-in (e.g. the Galactic Standard Calendar) carries its own universe and is checked first, so a custom calendar reusing the built-in's era abbreviations (`BBY` / `ABY`) was shadowed and the "Systems in use" breakdown credited every date to the built-in. Two changes fix this: fictional-date parsing now **honors a universe's chosen default calendar** — the "Default calendar for fictional dates in this universe" you set on the universe note now actually drives how dates in that universe are read (previously it was unused), so a note assigned to your universe by name resolves to that universe's calendar even though they're stored in different forms internally. And, independently, the parser now prefers a user-defined system over a built-in sharing the same era abbreviation, matching the universe regardless of casing or wikilink wrapping. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Event tables and timelines show participant and place aliases instead of raw wikilinks** ([#658](https://github.com/banisterious/obsidian-charted-roots/issues/658)): The earlier fix corrected the event Entity Profile's Participants section, but the event tables elsewhere — the dockable Events view, the Control Center timeline tables, the person-filter dropdowns, and the place line on the person-profile timeline — still stripped only the wikilink brackets, so a participant or place linked with an alias rendered as `Filename|Alias` (e.g. `Persanare|Test`). These now resolve through the shared display helper, showing just the alias while the underlying link still resolves to the correct note. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Family Chart connector lines stay visible in the High Contrast theme** ([#668](https://github.com/banisterious/obsidian-charted-roots/issues/668)): The High Contrast theme sets its text color to black so card labels read against the bright card fills, but the connector lines between cards were stroked with that same color — so on the theme's black background the lines vanished. The line color is now derived to stay visible against the chart background: each theme keeps its tuned line color when it already contrasts the background, and a visible tone is substituted only when it would not. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.57] - 2026-05-31

A reporter-driven cohort closing eleven issues from the @doctorwodka and @DigitalDreamn threads, spanning fictional-date handling, the Events tab statistics, the Entity Profile views, and organization linking. Three new capabilities — organization↔event links, a "Referenced events" section on source profiles, and a "Dissolved" field on the Organization modal — land alongside fixes for fictional-date counting and parsing (negative years, decade notation, custom-calendar attribution), the timeline export person filter, the cross-tab "Manage media" action, and several Control Center papercuts. **1106 tests passing across 88 suites**.

### Added

- **Link organizations to events** ([#659](https://github.com/banisterious/obsidian-charted-roots/issues/659)): Event notes can now reference organizations through an `organizations` wikilink array, and those events appear in the "Events" section of each linked organization's profile view. The Create/Edit Event modal has a new "Organizations" field (comma-separated) for setting the links, and the organization profile now gathers its events from this property instead of the previous name-matching placeholder. Requested by [@doctorwodka](https://github.com/doctorwodka).

- **"Referenced events" section on the Source profile** ([#654](https://github.com/banisterious/obsidian-charted-roots/issues/654)): The Entity Profile view for a source note now lists the event notes that cite it (via their `sources` array), alongside the existing "Referenced facts" and "Media" sections — so you can see at a glance which events are linked to a source. Each entry links through to the event note. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"Dissolved" field in the Create/Edit Organization modal** ([#649](https://github.com/banisterious/obsidian-charted-roots/issues/649)): The `dissolved` organization property was already supported by the templates, profile view, and frontmatter reference, but the only way to set it was hand-editing YAML. The Create/Edit Organization modal now has a "Dissolved" input directly under "Founded", and both the create and update paths write it to the note's frontmatter. Requested by [@doctorwodka](https://github.com/doctorwodka).

### Fixed

- **Fictional dates with negative years and decade notation now parse and sort correctly** ([#655](https://github.com/banisterious/obsidian-charted-roots/issues/655), [#660](https://github.com/banisterious/obsidian-charted-roots/issues/660)): The fictional-date parser rejected signed/negative years (`EP -18`), and its ISO month/day suffix strip corrupted them — eating `-18` as if it were a month — so negative-dated events fell back to a broken text sort and rendered out of order (`-01-12` before `-200` before `-500`). Negative years now parse to a negative canonical year and sort earliest-first (`-500` before `-200` before `-1`), the suffix strip only fires when a year digit precedes it (so `DE 1222-03` still reduces to `DE 1222`), and decade notation (`EP 30s`, `EP -30s`) parses to the decade's start year flagged approximate. Since every fictional-date surface routes through the parser, this also corrects era display, age annotations, and the Events tab statistics for these shapes. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Event profile shows the participant's alias instead of the raw wikilink** ([#658](https://github.com/banisterious/obsidian-charted-roots/issues/658)): On an event note's profile view, a participant linked with an aliased wikilink (where the displayed name differs from the note's filename — common after correcting a misspelling) rendered the underlying link text rather than the alias. The Participants section now displays the alias, while still resolving to the correct note when clicked. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Events tab statistics recompute once the metadata cache settles** ([#651](https://github.com/banisterious/obsidian-charted-roots/issues/651)): The Statistics card's counts (including "notes use fictional date systems") are computed by walking Obsidian's metadata cache, which can be incompletely populated when the card first renders — shortly after launch, after a plugin update, or while a batch of edits is still re-indexing — so the card could briefly show a low number until a manual tab reopen. The card now recomputes when Obsidian signals the cache has settled, so the displayed counts converge on the true vault state on their own. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"View full statistics" surfaces the dashboard in front of the modal** ([#645](https://github.com/banisterious/obsidian-charted-roots/issues/645)): On the Events, Sources, Organizations, and Places tabs, the "View full statistics →" link at the bottom of the Statistics card appeared to do nothing — it opened the Statistics dashboard in a background workspace leaf while the Control Center modal stayed in front, so the dashboard was only visible after manually closing the modal. These tabs now close the Control Center first, matching the Maps, People, Universes, and Dashboard tabs that already did. Spotted by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"Systems in use" attributes dates to the correct custom calendar** ([#650](https://github.com/banisterious/obsidian-charted-roots/issues/650)): On the Events tab Statistics card, the "Systems in use" breakdown mis-attributed fictional dates to a built-in date system when a custom system reused the same era abbreviations (e.g. a custom Star Wars calendar sharing `BBY` / `ABY` with the built-in Galactic Standard Calendar) — the custom system never appeared. Attribution now resolves through the shared parser using the note's linked universe, so a date on a note assigned to a custom system is credited to that system instead of the colliding built-in, matching how the date is parsed everywhere else. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Timeline export "Filter by person" matches the selected person** ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)): On the Events tab, choosing a specific person in the timeline export's "Filter by person" dropdown collapsed the preview to "0 events" and produced an empty person-filtered export. The filter compared the dropdown value (with wikilink brackets stripped) against event person fields that keep their brackets, so nothing ever matched. The comparison now normalizes both sides, so filtering by a person returns that person's events and the event count and year range update accordingly.

- **"Manage media" action works across all Control Center entity tables** ([#656](https://github.com/banisterious/obsidian-charted-roots/issues/656)): The "Manage media…" action — available as a right-click item and a media-count badge click on the People, Places, Organizations, and Events tabs, plus the "Manage entity media…" item in the Media Gallery modal — did nothing when clicked. The call sites invoked the media-manager as a plugin method that doesn't exist, throwing at runtime. They now call the shared helper correctly, so the manage-media modal opens from every entity surface.

- **Events tab statistics and Timeline Export count fictional dates correctly** ([#648](https://github.com/banisterious/obsidian-charted-roots/issues/648)): Two counters on the Events tab undercounted fictional dates because they used local date helpers stricter than the parser the rest of the plugin uses for timelines and ages. The Statistics card's "notes use fictional date systems" count only recognized simple `era year` shapes, so approximation markers (`DE ~310`), ISO-style month/day suffixes (`DE 1264-08`), and time suffixes were skipped — and a person whose only fictional date was a death (with no birth) was never counted at all. The Timeline Export summary's "N dated" detection only matched a leading four-digit year, so an all-fictional vault reported "0 dated" with no year range even when nearly every event had a date. Both counters now route through the shared date service, so the statistics agree with what the plugin actually parses everywhere else. Reported by [@doctorwodka](https://github.com/doctorwodka) and corroborated by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Migration Flow Diagram modal: "Group by" and "Collection" dropdowns render cleanly** ([#647](https://github.com/banisterious/obsidian-charted-roots/issues/647)): The two filter dropdowns in the Migration Flow Diagram modal showed the native select chevron tiled repeatedly across the full width of each control. Their custom styling set a `background` shorthand on top of Obsidian's `.dropdown` class, which reset `background-repeat` and caused the chevron's background image to repeat instead of sitting once at the right edge. The custom rules now set layout only (`min-width`) and let `.dropdown` own the chrome, matching the convention every other plugin dropdown already follows. CSS-only. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **"Add source…" context menu now writes the canonical source shape** ([#653](https://github.com/banisterious/obsidian-charted-roots/issues/653)): The right-click **Add source…** action on a person note wrote sources into a bespoke `source` / `source_2` / `source_3` indexed-scalar shape that nothing else in the plugin read. As a result, sources added that way didn't appear in the Edit Person modal, and linking the same source again through the modal wrote it a second time under the canonical `sources` / `sources_id` arrays — leaving the person note with the source recorded twice across three different frontmatter fields. The action now reads, dedupes, and appends the same index-aligned `sources` (wikilinks) and `sources_id` (cr_ids) arrays the Edit Person modal uses, so both entry points agree and stay in sync. Deduplication is by source cr_id, so re-adding an already-linked source is a no-op with a notice. The read-modify-write happens inside `processFrontMatter` to act on the live frontmatter rather than a possibly-stale cache snapshot. Notes already carrying the old `source_N` fields from a prior version are left as-is (hand-edit to migrate; a cleanup-wizard rule will follow if the pattern proves widespread). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.56] - 2026-05-29

Small reactive patch closing one reporter-driven Events tab counting bug ([#644](https://github.com/banisterious/obsidian-charted-roots/issues/644)) and stripping a dynamic-script-loading code path out of jspdf's bundled output that the v0.22.55 Community Plugins automated review flagged in error. The fictional-date count on the Events tab Statistics card now reflects event notes alongside person notes rather than person notes only, so a vault of mostly-event fictional dates no longer reads as "0 notes use fictional date systems." A new `patch-jspdf.js` postinstall script removes jspdf's unreachable `pdfobjectnewwindow` output mode (the only `document.createElement('script')` call in the bundled main.js) so the next Community scan should clear the error. **1064 tests passing across 82 suites**.

### Fixed

- **Events tab Statistics card now counts event notes alongside person notes for the fictional-date total** ([#644](https://github.com/banisterious/obsidian-charted-roots/issues/644)): On the Control Center's **Events** tab, the Statistics card's "Fictional dates" subsection said "X notes use fictional date systems" but the X only counted *person* notes with fictional `born` or `died` dates — event notes' `date` field was never inspected, despite the label promising a count of "notes". [@doctorwodka](https://github.com/doctorwodka) caught it on two vaults: in one, the card said 9 when she actually had 19 events with fictional dates; in the other, the card said 0 even though she had 3 events with fictional dates (and 0 fictional-dated persons). The fix extends `calculateDateStatistics` to dispatch to either the person branch or a new event branch in the same pass — event notes' `date` field (resolved through the property-alias service so user-defined aliases like `event_date` are honored) is checked with the same `looksLikeFictionalDate` predicate that the person branches already use, and a match increments `withFictionalDates` and the per-system breakdown one-for-one alongside the person counts. The "Systems in use" line picks up event-detected systems automatically. The label stays accurate now that the count reflects both kinds of notes.

### Security

- **Strip the `pdfobjectnewwindow` output mode from jspdf's bundled ES build** so the v0.22.55 dependency bump doesn't carry dynamic script element creation into Charted Roots' bundled `main.js`. jspdf's `output('pdfobjectnewwindow')` opens a new window and dynamically loads `pdfobject.min.js` from a CloudFlare CDN via `document.createElement('script')`. It's the only `createElement('script')` call in jspdf's source. Obsidian's Community Plugins automated review flags any dynamic script element creation in the bundle, and v0.22.55's bundled jspdf 4.x version surfaced exactly that error. The plugin only ever calls `save()` (Family Chart export, Tree wizard PDF output); the `pdfobjectnewwindow` and `pdfjsnewwindow` output modes are never reached. A new `patch-jspdf.js` postinstall script replaces the unreachable case body with a `throw`, preserving the switch shape so jspdf still parses cleanly while dropping the script element creation from the bundle. The patch is idempotent and skips gracefully if jspdf vendors an updated source. The bundled `main.js` script element creation count drops from four sites to three (the remaining three from pdfmake, canvg, and leaflet-distortableimage have been present across all post-v0.22.48 releases and were never flagged by the scanner). Tests, ESLint, and Stylelint baselines unchanged.

## [0.22.55] - 2026-05-29

Security-only patch addressing all 18 dependency advisories surfaced by the v0.22.54 Community Plugins automated review. `jspdf` upgrades from 3.0.4 to 4.2.1, which transitively brings `dompurify` from 3.3.0 to 3.4.7. No application-code changes; PDF export verified end-to-end in dev-vault on both surfaces (Family Chart export and Tree wizard PDF output). **1064 tests passing across 82 suites**.

### Security

- **Bump `jspdf` to 4.2.1 and `dompurify` to 3.4.7** to clear all 18 dependency advisories surfaced by the v0.22.54 Community Plugins automated review (10 against jspdf direct, 8 against dompurify transitively via jspdf). The jspdf advisories cover Path Traversal in the Node `fs` build, HTML Injection in `output` methods, PDF Injection in the `AcroForm` module, DoS via malformed BMP / GIF dimensions, stored XMP metadata injection, race conditions in `addJS`, and PDF Object Injection via free-text color. The dompurify advisories cover XSS, prototype pollution, `FORBID_TAGS` bypasses via `ADD_TAGS` function predicates, and `SAFE_FOR_TEMPLATES` bypasses in `RETURN_DOM` mode. Upstream confirmed no breaking API changes through the 3.x and 4.x majors: jsPDF 3.0 dropped IE support, and jsPDF 4.0's only behavioral change is `fs` access restriction in the Node build (not applicable to Obsidian's renderer context). The plugin's PDF surfaces — Tree Preview and Family Chart export — use only long-stable public APIs (`new jsPDF`, `addImage`, `addPage`, `save`, `setFontSize`, `setFont`, `setTextColor`, `text`, `addFileToVFS`, `addFont`).

## [0.22.54] - 2026-05-29

Reactive patch closing four reporter-driven UX papercuts from the v0.22.53 fortnight. The Statistics Dashboard's "Events by type", "Sources by type", and "Places by category" sections now route stats keys through their type catalogs so rows render with their configured display names rather than raw lowercase IDs ([#641](https://github.com/banisterious/obsidian-charted-roots/issues/641), reported by [@DigitalDreamn](https://github.com/DigitalDreamn)). The Relationships tab Statistics card's "By type" and "By category" rows now lay out with the label and count visually separated rather than running together as `Child131` / `Spouse22` ([#640](https://github.com/banisterious/obsidian-charted-roots/issues/640), same reporter). On descending-era timelines (BBY / BC-style), same-year events with `before` / `after` constraints now respect the era's old-at-bottom direction, mirroring the era-inversion the rawDate tiebreak gained in v0.22.49 ([#638](https://github.com/banisterious/obsidian-charted-roots/issues/638), same reporter). And a Control Center settings reorg pulls **Event display** out of Canvas & Trees and **Default timeline context** / **Context lifespan margin** out of Advanced into a renamed **Events & timelines** section, so all event- and timeline-related controls live in one place ([#637](https://github.com/banisterious/obsidian-charted-roots/issues/637), reported by [@doctorwodka](https://github.com/doctorwodka)). **1064 tests passing across 82 suites**.

### Fixed

- **Dynamic Timeline Block: `sort_order` tiebreak now respects descending-era timelines** ([#638](https://github.com/banisterious/obsidian-charted-roots/issues/638)): The v0.22.51 [#625](https://github.com/banisterious/obsidian-charted-roots/issues/625) fix added a same-year `sort_order` tiebreak so per-person timelines respect `before` / `after` relationships, but it didn't account for backward-direction eras the way v0.22.49's [#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) had taught the rawDate tiebreak to. In a BBY / BC-style era the year sort correctly puts old-at-bottom, but the `sort_order` pair flipped opposite — so two same-year events with `before` / `after` constraints read in the wrong direction locally. Both tiebreaks now route through a shared `isBackwardEraPair` helper, so they invert together when either entry in the pair parses as a backward-era fictional date and stay in sync if either tiebreak's rules change later. 4 new test cases in `tests/timeline-sort-year-tiebreak.test.ts`. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) — same reporter as the upstream [#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) and [#625](https://github.com/banisterious/obsidian-charted-roots/issues/625).

- **Statistics Dashboard: "Events by type", "Sources by type", and "Places by category" now show display names instead of raw IDs** ([#641](https://github.com/banisterious/obsidian-charted-roots/issues/641)): The three by-type / by-category sections passed each stats key straight through as the row label, so rows that came from slugified event-type IDs (`plot_point`, `backstory`, `immigration`), built-in source-type IDs, or canonical place-category IDs rendered as the raw identifier instead of the configured display name. Each section now routes the key through its catalog (`getEventType` with the user's custom event types and customizations; `getSourceType` with custom source types; `PLACE_CATEGORY_LABELS` for place categories). When an ID has no matching definition (orphan rows from deleted custom types, IDs that are categories rather than types like `legal`, or the `uncategorized` sentinel assigned to notes with no type frontmatter), the row falls back to the capitalized key — `other` → `Other`, `legal` → `Legal`, `uncategorized` → `Uncategorized` — rather than the raw lowercase ID, and the row still appears rather than vanishing. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #639](https://github.com/banisterious/obsidian-charted-roots/discussions/639), with the Sources / Places scope expansion confirmed in [#641](https://github.com/banisterious/obsidian-charted-roots/issues/641).

- **Relationships tab: statistics rows no longer render label and count run-together** ([#640](https://github.com/banisterious/obsidian-charted-roots/issues/640)): The Statistics card's "By type" and "By category" lists relied on five CSS classes (`.crc-stats-list`, `.crc-stats-item`, `.crc-stats-swatch`, `.crc-stats-label`, `.crc-stats-value`) that had never been defined, so each row collapsed into adjacent text — `Child131`, `Spouse22`, and so on. The missing rules are now in place: each item is a flex row with the color swatch (when present) at the left, the label filling the middle, and the count right-aligned and semibold. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #639](https://github.com/banisterious/obsidian-charted-roots/discussions/639).

### Changed

- **Settings reorg: Event display and timeline context now live alongside the Timeline section** ([#637](https://github.com/banisterious/obsidian-charted-roots/issues/637)): The Event display subsection (with the **Event type display** setting that controls how event types appear on timelines, canvas event nodes, and maps) moves from Canvas & Trees to the top of the Timeline section, and **Default timeline context** + **Context lifespan margin** move from Advanced into a new **Context events** subsection within the same section. The section itself is renamed **Events & timelines** to reflect the broader scope. Sync Calendarium events stays in Advanced > Integrations as an integration toggle. No setting names or values change; the internal section identifier stays `timeline` so the open-state restore continues to recognize a previously-open section. Raised by [@doctorwodka](https://github.com/doctorwodka).

## [0.22.53] - 2026-05-27

Reactive patch closing a cluster of community-reported papercuts — and the project's first external code contribution. The Family Chart's custom-relationship overlay now self-heals if it draws before the chart's cards finish animating into place, so the line's endpoint no longer detaches from its card on refresh ([#615](https://github.com/banisterious/obsidian-charted-roots/issues/615), reported by [@doctorwodka](https://github.com/doctorwodka)). Adoption events render with the `heart-handshake` icon across every Dynamic Timeline surface rather than just the focal person's own row ([#632](https://github.com/banisterious/obsidian-charted-roots/issues/632), raised by [@DigitalDreamn](https://github.com/DigitalDreamn)). "Not a duplicate" dismissals in the duplicate-detection modal now persist across sessions instead of reappearing on every scan ([#633](https://github.com/banisterious/obsidian-charted-roots/issues/633)), and the Calendar view filters events by year as well as month so a person born in a later year no longer appears in an earlier year's month ([#634](https://github.com/banisterious/obsidian-charted-roots/issues/634), contributed by [@MohammadYusif](https://github.com/MohammadYusif) in [#636](https://github.com/banisterious/obsidian-charted-roots/pull/636)) — both reported by [@Darcylynn](https://github.com/Darcylynn), who also flagged a stale Merge Duplicate Places help link, now fixed. **1060 tests passing across 82 suites**.

### Changed

- **Adoption events on family timelines now use the adoption icon** ([#632](https://github.com/banisterious/obsidian-charted-roots/issues/632)): v0.22.52 ([#627](https://github.com/banisterious/obsidian-charted-roots/issues/627)) gave the focal person's own `Adopted` row the `heart-handshake` icon in warm orange, but the adoption events on the *family* timeline surfaces — the adoptive parent's `Adopted {name}` row and the adopted-sibling / adopted-grandchild `Adoption of {name}` rows (the latter two made always-on in v0.22.50 via [#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)) — still rendered with the generic `users` family-event icon. They now resolve through the built-in `adoption` event type, so the same icon and color appear across every Dynamic Timeline surface. The adopted child's *birth* row (shown when **Show adopted children's births** is enabled) keeps the generic icon, since it's a birth rather than an adoption. The icon-resolution logic is extracted to a `resolveFamilyEventIcon` helper; 4 new test cases in `tests/timeline-family-adoption-icon.test.ts`. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn) in [#627](https://github.com/banisterious/obsidian-charted-roots/issues/627).

### Fixed

- **Family Chart: custom-relationship overlay now self-heals if it draws before cards settle** ([#615](https://github.com/banisterious/obsidian-charted-roots/issues/615)): On some setups the overlay line's top endpoint could detach from its source card after a refresh, floating partway down toward the next card. The overlay waits for card positions to stabilize before drawing, but if the chart's entrance animation briefly stalls mid-flight, that wait can fire against an intermediate position, anchoring the endpoint where the card was rather than where it lands. The fix adds a backstop: shortly after drawing, it checks whether any card moved since, and if so re-runs the stability wait and redraws once the cards have truly settled — so a premature draw repairs itself. The backstop re-runs the same stability check rather than drawing on a fixed timer, keeping it safe on large trees (where a fixed timer could itself land mid-animation). No effect in the common case where positions are already final. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **"Not a duplicate" dismissals now persist across sessions** ([#633](https://github.com/banisterious/obsidian-charted-roots/issues/633)): In the duplicate-detection modal, marking a pair "Not a duplicate" only removed it from the current scan — nothing was saved, so the same pair reappeared on the next scan, contrary to the wiki's promise that dismissals are remembered. Dismissed pairs are now stored in settings (as an order-independent `crIdA::crIdB` key, so a pair stays dismissed regardless of which side the detector lists first) and filtered out of future scans. The modal's options gain a **Clear dismissed** button — shown only when dismissals exist — to undo a stale dismissal and let the pair resurface on the next scan. 4 new test cases in `tests/duplicate-dismissed-pair-key.test.ts`. Reported by [@Darcylynn](https://github.com/Darcylynn) in [Discussion #631](https://github.com/banisterious/obsidian-charted-roots/discussions/631).

- **Calendar view now filters events by year as well as month** ([#634](https://github.com/banisterious/obsidian-charted-roots/issues/634)): Navigating the Calendar view to a specific month and year (e.g. February 1850) showed events from every year that shared that month — so a person born in February 2010 appeared on Feb 15, 1850, with their actual year and "years ago" count exposing the mismatch. `getEventsForMonth` accepted the displayed year but only compared each event's month, never its year. The fix adds the year to the loop guard so only events matching both the displayed month and year render; signed years (negative for descending custom eras like BBY / BCE) compare cleanly with direct equality. 4 new test cases in `tests/calendar-data-service-year-filter.test.ts`. Reported by [@Darcylynn](https://github.com/Darcylynn) in [Discussion #631](https://github.com/banisterious/obsidian-charted-roots/discussions/631); fixed by [@MohammadYusif](https://github.com/MohammadYusif) in [#636](https://github.com/banisterious/obsidian-charted-roots/pull/636).

- **Merge Duplicate Places: Help link now points at the current wiki**: The Help link in the modal header pointed at a placeholder wiki URL, so clicking it 404'd. The link now uses the current `banisterious/obsidian-charted-roots` wiki path, matching every other help link in the plugin. Reported by [@Darcylynn](https://github.com/Darcylynn) in [Discussion #631](https://github.com/banisterious/obsidian-charted-roots/discussions/631).

## [0.22.52] - 2026-05-26

Small reactive patch closing two reporter-driven UI papercuts. The focal person's own `Adopted` event row on the Dynamic Timeline Block now renders with an icon (the row previously fell through to a placeholder span because no built-in event type with id `adoption` existed); the fix adds `adoption` as a vital built-in event type alongside birth / death / marriage / divorce ([#627](https://github.com/banisterious/obsidian-charted-roots/issues/627), reported by [@doctorwodka](https://github.com/doctorwodka), confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn)). The Edit Person modal now recognizes the single-letter sex markers (`M` / `F` / `X` / `U`) that Profile View writes and emits the same canonical form on save, ending a write-shape divergence that grayed out the dropdown when reopening a marker-form note ([#629](https://github.com/banisterious/obsidian-charted-roots/issues/629), reported by [@doctorwodka](https://github.com/doctorwodka)). **1048 tests passing across 79 suites**.

### Fixed

- **Edit Person modal now recognizes single-letter sex markers and writes the canonical GEDCOM-aligned form** ([#629](https://github.com/banisterious/obsidian-charted-roots/issues/629)): Profile View writes single-letter sex markers (`M` / `F` / `X` / `U`) per `CANONICAL_SEX_VALUES` in the value-alias service. Edit Person previously wrote word forms (`male` / `female` / `nonbinary` / empty), so a person saved via Profile View as `sex: F` opened in Edit Person with the dropdown grayed out as if the value were unrecognized — and the two surfaces wrote divergent shapes for the same logical value. The fix routes the loaded sex value through `ValueAliasService.resolve('sex', ...)` so all known shapes (word forms, GEDCOM markers themselves, aliases like `nb` / `enby` / `intersex`) normalize to the canonical M/F/X/U set before populating the dropdown. The dropdown's options also flip from word values to marker values with display labels (`Male` / `Female` / `Non-binary` / `Unknown`), gaining an explicit `Non-binary` (`X`) option and an explicit `Unknown` (`U`) option that the previous dropdown lacked. Saving an existing word-form note via Edit Person now writes the canonical marker, completing the migration per-note on next edit. Existing data is preserved on read (the value-alias service's case-insensitive resolve handles `MALE` / `Female` / `NonBinary` / custom user-defined aliases). 18 new test cases in `tests/sex-value-normalization.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Dynamic Timeline Block: the focal person's own `Adopted` event now renders with an icon** ([#627](https://github.com/banisterious/obsidian-charted-roots/issues/627)): The adoptive parent's `Adopted {name}` row (a family event) showed the generic `users` icon, but the focal person's own `Adopted` row showed no icon at all. The renderer's icon resolution calls `getEventType('adoption', ...)` for the focal-own row, and the built-in `EVENT_TYPE_DEFINITIONS` array didn't include an entry with that id, so the lookup returned `undefined` and the renderer fell through to a placeholder span. The fix adds `adoption` as a built-in vital event type (id `adoption`, icon `heart-handshake`, color `#fb923c`) alongside birth / death / marriage / divorce. The id also lands in the `CORE_EVENT_TYPES` tuple so the by-id category lookup agrees with the definition's `category` field. Side effect: any other surface that consults the built-in event-type catalog (event timelines, map controller, Create/Edit Event modal, GEDCOM-related event mapping) now picks up the new entry automatically — no call-site changes needed. 7 new test cases in `tests/event-type-adoption.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka), confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn).

## [0.22.51] - 2026-05-24

Reactive patch closing three reporter-driven fictional-date and timeline-ordering papercuts on the heels of v0.22.50, plus one audit Phase 5 cleanup. Two follow-ups address scenarios v0.22.50's fixes didn't fully reach: inline approximation markers between an era and a 3-digit year (`born: DE ~310`) now strip cleanly so the fictional parser succeeds end-to-end ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up, reported by [@doctorwodka](https://github.com/doctorwodka)), and per-person Dynamic Timeline Blocks now consult the v0.22.45 [#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) `sort_order` topological values for same-year `before`/`after` tiebreaks instead of falling through to insertion order ([#625](https://github.com/banisterious/obsidian-charted-roots/issues/625), reported by [@doctorwodka](https://github.com/doctorwodka), confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn)). Independently, fictional-era dates carrying an ISO-style `-MM-DD` suffix (e.g., `adoption_date: DE 1264-08-15`) now preserve the era prefix on display rather than rendering as a plain year ([#626](https://github.com/banisterious/obsidian-charted-roots/issues/626), spotted during the #624 follow-up's dev-vault verification). **1023 tests passing across 77 suites**.

### Changed

- **Internal: Control Center mobile-mode check drops the body-class fallback** (audit Phase 5): `isMobileMode()` in `src/ui/control-center.ts` previously consulted both `Platform.isMobile` and `activeDocument.body.classList.contains('is-mobile')` as a belt-and-suspenders pair. v0.22.49's `MobileClassManager` (Phase 4a) made `Platform.isMobile` authoritative across the plugin, so the body-class check is redundant; the method now just returns `Platform.isMobile`. No user-visible behavior change — the two checks were always synchronized in practice. One Phase 5 cleanup item closes out.

### Fixed

- **Fictional-era dates with an ISO-style month/day suffix now preserve the era prefix on display** ([#626](https://github.com/banisterious/obsidian-charted-roots/issues/626)): A frontmatter value like `adoption_date: DE 1264-08-15` (custom forward-direction calendar with month and day precision) rendered as a plain `1264` on the Dynamic Timeline Block while sibling rows on the same person correctly showed `DE 310` and `DE 1260`. The fictional parser's patterns are all anchored at end-of-string, and only the v0.22.47 [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up's `T HH:MM[:SS]` time suffix was stripped before pattern matching. So `DE 1264-08-15` failed every fictional pattern, fell through to the standard parser's 4-digit substring match, and ended up as a standard-typed date with no era preserved — `formatYearForDisplay` then reached `extractYear` and pulled only the digits. Age math was unaffected because `calculateAge` enters the standard-date fallback path and uses canonical-year arithmetic when one side parses as fictional and the other as standard. The fix extends the suffix-strip in both `parse()` and `looksLikeFictionalDate()` to also handle trailing `-MM-DD` and `-MM` shapes, mirroring how `T HH:MM[:SS]` is handled. Pure ISO dates like `2024-08-15` are still rejected by the explicit ISO-pattern check (now run before the strip in the look-ahead path). 18 new test cases in `tests/fictional-date-parser-date-suffix.test.ts` cover the suffix-strip across `-MM-DD`, `-MM`, backward eras, combined date-plus-time suffixes, and the defensive ISO-passthrough cases. Spotted while verifying the v0.22.51 [#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up.

- **Per-person Dynamic Timeline Block now respects `before`/`after` event ordering** ([#625](https://github.com/banisterious/obsidian-charted-roots/issues/625)): The v0.22.45 [#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) auto-compute service writes `sort_order` topological values onto events when their `before`/`after` frontmatter is set, and the Events timeline view consumes those values correctly. Per-person Dynamic Timeline Blocks were missed in that sweep: the renderer's `TimelineEntry` interface didn't expose the `sortOrder` field, the Event-to-TimelineEntry conversion dropped it, and the same-year tiebreak in the comparator never consulted it. So when @doctorwodka filed a same-year pair where `Event A` had `after: [[Event B]]`, the person's timeline still rendered them in alphabetical insertion order rather than B-then-A. The fix adds the `sortOrder` field to `TimelineEntry`, copies it during the Event-to-Entry conversion, and inserts a sort_order check between the existing year compare and the existing rawDate tiebreak in `compareTimelineEntriesByDate`. The check only fires when BOTH entries have a sort_order value, so events without `before`/`after` constraints (birth from person, marriages from spouse metadata, family events, context entries) continue to fall through to the rawDate / insertion-order behavior. Bug has been latent since v0.22.39 (when `before`/`after` properties first arrived); confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn). 6 new test cases in `tests/timeline-sort-year-tiebreak.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Fictional-era dates with an inline approximation marker now parse correctly** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up): The v0.22.50 fix relaxed the bare-digit fallback for #624's reported "3-digit year" symptom, but the actual data shape was a frontmatter value of `born: DE ~310` (era + inline tilde + 3-digit year). The inline tilde sitting between the era abbreviation and the year broke the fictional parser's pattern matching, because `stripApproximationMarkers` only handled markers at the start of the string with required trailing whitespace. Downstream effect on the Dynamic Timeline Block: the birth date parsed as `null`, the era-prefixed adoption date passed the safety-net check, and the renderer dropped the age annotation rather than risk an era-blind subtraction. The fix extends `stripApproximationMarkers` to also strip inline markers (between whitespace and a digit), covering `~`, `circa`, `c.`, `ca`, `about`, `abt`, and `approx(imately)` uniformly. So `"DE ~310"`, `"DE c. 1264"`, and `"DE circa 310"` all parse cleanly as fictional approximate dates with the era preserved. 8 new test cases in `tests/fictional-date-parser-approximation.test.ts` plus 5 new end-to-end timeline-renderer cases in `tests/timeline-renderer-age.test.ts` fence the inline-marker behavior across `~`, `c.`, `circa`, and the no-marker control. Reported by [@doctorwodka](https://github.com/doctorwodka) after the v0.22.50 fix didn't resolve her actual data shape.

## [0.22.50] - 2026-05-23

Reactive cycle picking up three reporter-driven items plus the first sub-arc of audit Phase 4b. Two Family Chart fixes from [@doctorwodka](https://github.com/doctorwodka): the card display for six free-form text fields now renders aliases instead of raw `[[…]]` markup when those fields contain wikilinks ([#622](https://github.com/banisterious/obsidian-charted-roots/issues/622)), and bare 1-3 digit year strings stored in custom fictional-era calendars no longer drop the age annotation on the adoption event when paired with era-prefixed dates elsewhere on the same person ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624)). A toggle-gate removal on the Dynamic Timeline Block makes adopted-sibling and adopted-grandchild adoption events always-on, mirroring the existing always-on adoptive-parent event ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623), follow-up to v0.22.49's [#621](https://github.com/banisterious/obsidian-charted-roots/issues/621), reported by [@DigitalDreamn](https://github.com/DigitalDreamn)). Internally, audit Phase 4b's first sub-arc closes: three registered-view stylesheets (`map-view.css`, `family-chart-view.css`, `profile-view.css`) migrate from media-query-only to dual-path mobile coverage using v0.22.49's `MobileClassManager` classes, where Obsidian's media queries don't fire reliably on Obsidian Mobile. **986 tests passing across 76 suites**.

### Changed

- **Internal: Phase 4b mobile-migration first batch (`map-view.css`, `family-chart-view.css`, `profile-view.css`)**: First three per-component migrations consuming the v0.22.49 `MobileClassManager` infrastructure. Each migrated stylesheet's narrow-viewport rules now reach via dual paths: the original `@media (max-width: …)` blocks stay in place for narrow desktop / tablet leaves, and parallel `.cr-phone` (or `.cr-mobile`) blocks — using the global classes applied by `MobileClassManager` to each registered view's container — handle phones (and tablets where applicable), where Obsidian's media queries don't fire reliably. **Map View** (originally [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)): toolbar wrap and `world-map-preview` thumbnail rules consolidate the view-local `cr-map-view-phone` class onto the global `.cr-phone`. User-visible side effect: phones whose viewport happens to be wider than 600px (some devices in landscape) now also get the compact `world-map-preview` layout that was previously gated on viewport width alone. **Family Chart View**: toolbar wrap at 600px, info-panel slim sidebar at 800px, and info-panel full-width-below at 600px all gain `.cr-phone` parallel coverage. User-visible side effect: phones now always stack the info panel below the chart (rather than rendering a slim sidebar), even when the phone is in landscape with a viewport wider than 600px — simpler and more predictable than orientation-dependent layout switches. **Entity Profile View**: the view-local `.cr-profile--mobile` class (added via TS on `Platform.isMobile`) consolidates onto the global `.cr-mobile` — same scope, preserves the 44px touch-target compaction on iPad as well as phones. The 400px media query (phone-portrait header padding, header-meta stack, hidden section-summary) gains a `.cr-phone` parallel block, deliberately scoped to phones (not `.cr-mobile`) so iPad-portrait keeps its wider header layout.

- **Dynamic Timeline Block: adopted-sibling and adopted-grandchild adoption events are now always-on** ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)): The two emission blocks added in v0.22.49 ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)) were gated on the `Show adopted children's births` toggle, matching the toggle used for the parallel birth-event coverage. Verification feedback from [@DigitalDreamn](https://github.com/DigitalDreamn) pointed out that the adoption events represent family events the focal canonically experienced — the same shape as the adoptive parent's `Adopted {name}` event ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396)), which has always been emitted unconditionally — and should not depend on whether the user wants the broader adopted-children-births surfacing. The toggle gate is dropped from both blocks; the `kind === 'adopted'` and `adoptionDate`-required guards remain. Four new test cases in `tests/timeline-adoption-events-always-on.test.ts` fence the new always-on behavior for both surfaces and the missing-adoption-date skip. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #621 follow-up.

### Fixed

- **Bare 1-3 digit year strings now parse as years across the date pipeline** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624)): The date parser's final fallback previously required a 4-digit run, so a frontmatter value like `birth_date: 310` (a 3-digit canonical year in @doctorwodka's custom Earthfall calendar) had nowhere to land — the fictional parser rejected it (no era abbreviation) and the standard parser's `\b(\d{4})\b` regex skipped over it. The user-visible symptom surfaced on the Dynamic Timeline Block as a missing age annotation on the adoption event: when one side of the age calculation parsed cleanly as fictional (e.g., `adoption_date: DE 1264`) but the other side parsed as `null`, the renderer's safety-net check (refusing to subtract era-blind across mismatched eras, [#565](https://github.com/banisterious/obsidian-charted-roots/issues/565)) bailed to "no age" rather than risk a silently-wrong number. Other events on the same person rendered correctly when both sides happened to be bare 4-digit values. The fix adds an additional whole-string-anchored numeric branch to the standard-year fallback so bare digit-only inputs of any length parse as years; the existing 4-digit substring matching is preserved for inputs like `"March 12, 1942"`, and the whole-string anchor prevents accidental matches in strings like `"5 Jan"` or `"1900s"`. 25 new test cases across `tests/date-service-bare-year-parse.test.ts` (19) and `tests/timeline-renderer-age.test.ts` (6) fence the bare-year parser behavior and the mixed bare-plus-era timeline scenarios. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Family Chart: wikilink-shaped text fields now render the alias instead of the raw `[[…]]` markup** ([#622](https://github.com/banisterious/obsidian-charted-roots/issues/622)): The card display for `religion`, `alt name`, `nickname`, `title`, `occupation`, and `caste` showed the raw wikilink (brackets + full filename) instead of the user-assigned alias when one of these free-form text fields was set to a wikilink (e.g., `religion: "[[Religions/Catholic|Catholicism]]"` rendered as `[[Religions/Catholic|Catholicism]]` instead of `Catholicism`). The fix routes each field through a guarded `unwrapWikilinkDisplay` helper that strips brackets and collapses pipe-form to the alias only when the input is fully bracket-wrapped — plain text containing legitimate `/` or `|` characters (e.g., `occupation: "Cook/Server"`) passes through unchanged. The info panel's birth-place / death-place display sites already had a hand-rolled version of the same stripping; both consolidate onto the shared helper. 26 new test cases in `tests/unwrap-wikilink-display.test.ts` cover bracketed wikilinks, plain-text passthrough including the `/`-in-free-text regression-prevention case, partially-bracketed input, and idempotency. Reported by [@doctorwodka](https://github.com/doctorwodka).

## [0.22.49] - 2026-05-21

Continuation of the @DigitalDreamn reporter cycle from v0.22.47–v0.22.48 plus a tranche of audit-plan progress. Dynamic Timeline Block adoption-event coverage now extends to the sibling and grandparent surfaces in parallel with the v0.22.48 birth-event coverage ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)), and the same-year twin tiebreak now respects descending-era directions (BBY / BCE / etc.) so firstborn twins land in the slot the reader expects under each era's display direction ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) follow-on). Plus a settings UX improvement (Timeline subsections moved out of Advanced into their own top-level section), a long-deferred sanitizer relaxation (parens and curly braces no longer stripped from filenames per [#506](https://github.com/banisterious/obsidian-charted-roots/issues/506)), and Phase 4a of the audit plan — the `MobileClassManager` infrastructure that Phase 4b's per-component CSS migration will consume to replace the unreliable-on-mobile `@media (max-width: 768px)` selectors. **931 tests passing across 73 suites**.

### Added

- **Dynamic Timeline Block: adoption events on the sibling and grandparent surfaces** ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)): Extension of the v0.22.48 [#618](https://github.com/banisterious/obsidian-charted-roots/issues/618) work that brought birth-event coverage to those surfaces with distinct adopted-relation labels. The adoption event itself — already emitted as `Adopted {name}` on the adoptive parent's timeline since [#396](https://github.com/banisterious/obsidian-charted-roots/issues/396) — now also renders on the focal person's **sibling** timeline (`Adoption of {name}` by default) and the **grandparent** timeline (`Adoption of {name}` by default), so the focal person's experience of "your sibling joined the family" or "your grandchild joined the family" is visible on the right surfaces. Gated on the same `Show adopted children's births` toggle as the birth coverage; adoption and birth are contextually paired. Both new labels are customizable under `Settings -> Timeline -> Timeline labels` (the new top-level Timeline section is also new in this release — see Changed below) and accept the `{name}` placeholder. Distinct from the adoptive parent's `Adopted {name}` label so the reader can tell which surface the event is on at a glance. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #618 follow-up.

### Changed

- **Timeline settings now live in their own top-level section** (was under Advanced): The three Timeline subsections — Timeline layout, Timeline labels, and Family events on timelines — move from `Settings -> Advanced` to a new `Settings -> Timeline` top-level section, placed right after `Dates & validation` so the temporal-display settings cluster together. Matches the v0.22.39 Research / DNA tracking promotion: Timeline-related settings have grown to ~17 toggles and labels over the v0.22.x cycle, and burying them inside Advanced no longer reflects how frequently they're tuned. The Advanced section keeps Folder filtering, Template detection, Integrations, Relationship calculator, and Logging; everything else stays where it was. No setting names or values change — only the location.

- **Filenames preserve parentheses and curly braces** ([#506](https://github.com/banisterious/obsidian-charted-roots/issues/506)): The shared name-sanitization helper that runs on all importers (Gramps / GEDCOM / GEDCOM-X / CSV) and entity-creation flows previously stripped `( ) [ ] { }` from filenames and wikilink targets on the assumption all six were wikilink-breaking. Empirical evidence from the [#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) thread (confirmed end-to-end across file resolution, the rename cascade, and dynamic blocks) showed that parens and curly braces don't break Obsidian's wikilink parser — only square brackets do, because they **are** the wikilink delimiters. The character class now preserves `( ) { }` and continues to strip `[ ]` and the filesystem-illegal set (`\ : * ? " < > |`). User-facing effect: creating a universe named `Star Wars (AU)` via the Create Universe modal now produces a file with parens preserved in the basename, and entity references match end-to-end without falling back to the alias-aware lookup path. Same for person notes via the importers. Two new test cases fence the post-relaxation behavior. Closes [#506](https://github.com/banisterious/obsidian-charted-roots/issues/506) (audit plan Phase 5).

- **Internal: Phase 4a mobile groundwork**: New `MobileClassManager` infrastructure attaches `cr-mobile` / `cr-desktop` / `cr-phone` / `cr-tablet` classes to each registered view's container element based on `Platform.is*` flags. The audit plan's Phase 4b — per-component CSS migration from `@media (max-width: 768px)` to class-scoped selectors — consumes these classes; this release just lays the infrastructure. The v0.22.20 [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) Map View fix established empirically that `@media (max-width: 768px)` doesn't fire reliably on Obsidian Mobile, so class-based selectors driven by `Platform.is*` are the path forward. All 15 registered views call into the manager via a new `registerCRView` factory wrapper; the previous `responsive.css` breakpoint block moves to `variables.css`, and `responsive.css` repurposes for the few cases that genuinely need viewport-driven scoping (print, theme overrides). New **Mobile layout** section in `docs/developer/coding-standards.md` documents the pattern. Seven new tests in `tests/mobile-class-manager.test.ts`.

- **Internal: extract `shouldUseSubmenu()` helper for the platform-detection check used by submenu rendering**: The `Platform.isDesktop && !Platform.isMobile` dual check (deliberately stricter than `Platform.isDesktop` alone, because some hybrid platforms report both flags true) was duplicated across three sites in `people-tab.ts` and `context-menus.ts`. The new helper in `src/utils/platform-utils.ts` consolidates the pattern with a comment explaining why the dual check is load-bearing. No behavior change.

### Fixed

- **Dynamic Timeline Block: same-year twins now order correctly in descending eras** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) follow-on): The v0.22.48 [#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) fix added a raw-date lex-compare tiebreak that put the firstborn at the top of a twin pair — correct for ISO dates (chronological = oldest at top, firstborn = oldest = top) but era-blind for descending eras (BBY, BCE, etc.) where the year sort already produces "newer at top" via era-blind numeric comparison. For a BBY twin pair, the firstborn was landing at the top, contradicting the surrounding "old at bottom" pattern. The comparator now detects descending-era rawDates via the `DateService` and inverts the tiebreak direction for them — secondborn lands at the top of the pair in chronological mode (matching the year sort's new-at-top direction), and firstborn lands at the top in reverse mode (matching the inverted year sort's old-at-top direction). Five new test cases in `tests/timeline-sort-year-tiebreak.test.ts` fence the inversion behavior, ISO back-compat, the `dateService`-omitted path, and the OR-not-AND semantic when only one twin parses as descending-era. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #609 follow-up to the v0.22.48 fix.

## [0.22.48] - 2026-05-19

Reporter-driven release built around @DigitalDreamn's v0.22.47 verification feedback. Two new Dynamic Timeline coverage toggles render children's marriages on the parent's timeline ([#607](https://github.com/banisterious/obsidian-charted-roots/issues/607)) and parent's marriages on the child's timeline ([#608](https://github.com/banisterious/obsidian-charted-roots/issues/608)), both with bio + adopted + step coverage and customizable `{name}` / `{spouse}` label templates. Three timeline correctness fixes: same-year twin sort tiebreak via raw-date suffix ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)); the "Show adopted children's births" toggle now governs sibling + grandparent surfaces with distinct adopted-relation labels ([#618](https://github.com/banisterious/obsidian-charted-roots/issues/618)); custom relationships mapped to Father / Mother now route through the parent scalar write path with the v0.22.47 conflict guard ([#616](https://github.com/banisterious/obsidian-charted-roots/issues/616), surfaced from the [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606) retest). Plus a Family Chart kinship-label fix: labels anchor above each child's card (rather than at the link path midpoint) and render only after card positions stabilize ([#619](https://github.com/banisterious/obsidian-charted-roots/issues/619)). **917 tests passing across 72 suites**.

### Added

- **Parent's marriages on the child's Dynamic Timeline Block** ([#608](https://github.com/banisterious/obsidian-charted-roots/issues/608)): New `Show parent's marriages` toggle (default off) under `Settings -> Advanced -> Family events on timelines` renders parent marriage events on the focal child's Dynamic Timeline Block. Walks the focal child's biological and adoptive parents and iterates each parent's spouses, so stepparent acquisitions (a bio parent's remarriage) and adoptive-couple marriages both appear. **Skips the bio-pairing marriage** (when both partners in a marriage are biological parents of the focal child) — that pairing is already implicit in the parent links, so re-surfacing it just adds clutter; the toggle is meant for remarriages and adoptive couples. Each shared marriage emits once even when both partners are in the parent set (per-pair dedupe). Pre-birth and post-death filters apply for consistency with the other family-event blocks. Customizable via the new `Parent marriage label` setting; supports `{name}` and `{spouse}` placeholders (default `Marriage of {name} to {spouse}`). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Children's marriages on the parent's Dynamic Timeline Block** ([#607](https://github.com/banisterious/obsidian-charted-roots/issues/607)): New `Show children's marriages` toggle (default off) under `Settings -> Advanced -> Family events on timelines` renders a child's marriage as a family event on the parent's Dynamic Timeline Block. Covers biological, adopted, and step-children — anyone the focal person is recorded as a parent or stepparent of. Renders the marriage date, the spouse's name, and (when set) the marriage location. Skips marriages that postdate the focal person's death. The label template is customizable via `Settings -> Advanced -> Timeline labels -> Child marriage label`; supports `{name}` for the child and `{spouse}` for their spouse (default `Marriage of {name} to {spouse}`). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a follow-up to the v0.22.46 timeline-coverage cluster.

### Fixed

- **Family Chart "Show kinship labels": Parent label now aligns with each child's visible riser and renders on stable card positions** ([#619](https://github.com/banisterious/obsidian-charted-roots/issues/619)): Two-part fix. (1) The `Parent` kinship label was positioned at the path's arc-length midpoint, which for f3's `LinkVertical` shape (riser + horizontal trunk + descent) lands somewhere along the horizontal trunk for displaced children — rightmost labels drifted into empty trunk space with no card below them, and Parent labels under couple-parents stacked on top of the same column instead of one per child. The label now anchors to a fixed offset above each child's **card top edge** (or left edge in horizontal mode), positioned at the child's column. Per-child positioning gives each visible branch its own aligned label, and the card-relative anchor avoids the short-riser case where a riser midpoint would overlap the child card (f3 cards translate by `-50%, -50%` so the path endpoint is the card center; the label has to clear half the card height). Reads the live card dimensions so it works across all card styles (rectangle / compact / mini / circle). Handles both vertical (default) and horizontal chart orientations. (2) Initial-render and tree-update label scheduling were using a fixed `setTimeout(1500)` that sometimes snapshotted SVG path coordinates mid-animation, leaving the bottom label overlapping its card until the user hit the chart's refresh button. Both scheduling paths now poll `waitForCardPositionStability` — the same approach the custom-relationship overlay uses (#591). The toggle-on path stays a direct render since the chart is already at rest at that point. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a Discussion #602 follow-up observation, with the mid-animation half surfacing during dev-vault verification of the riser fix.

- **Dynamic Timeline Block: "Show adopted children's births" toggle now governs the sibling + grandparent surfaces** ([#618](https://github.com/banisterious/obsidian-charted-roots/issues/618)): The toggle was honored on the adoptive parent's timeline but the sibling-births walk (#584) and grandchildren-births walk (#585) ignored it — adopted siblings and adopted grandchildren leaked through as plain `Birth of {name}` entries indistinguishable from biological entries. Both walks now respect the toggle: when off, the adopted relation is filtered out; when on, the entry uses a distinct label (`Birth of adopted sibling {name}` and `Birth of adopted grandchild {name}` by default) so the relationship is visible at a glance. Both labels are customizable under `Settings -> Advanced -> Timeline labels` (`Adopted sibling birth label` / `Adopted grandchild birth label`) and accept the `{name}` placeholder. `collectSiblingCrIds` now returns a `Map<crId, 'bio' | 'adopted'>` so callers can discriminate; the sibling-deaths walk is unchanged (a sibling's death is meaningful regardless of adoption status). "Adopted wins" precedence: a sibling or grandchild reachable via both bio and adopted routes is treated as adopted, so the toggle's gating is the conservative call. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) verification cycle.

- **Dynamic Timeline Block: same-year twins / triplets now sort by birth-time suffix** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)): The Dynamic Timeline Block sorted entries by year alone — when twins shared a year, the sort fell through to the surrounding `Array.prototype.sort` insertion order (stable, but undefined relative to genealogical intent). Twins, triplets, and any other same-year events appeared in an arbitrary order that didn't follow the v0.22.46 sibling-sort consolidation. The sort now applies the same year-then-raw-date pattern used by `RelationshipQueryService.getChildren`: when two entries share a year, a lex compare on the raw frontmatter date string breaks the tie. For ISO dates with time (`1985-04-12T03:42` vs `1985-04-12T03:45`) and fictional-era dates with time (`BBY 29 T20:03:04` vs `BBY 29 T20:08:15`), this orders firstborn before secondborn. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up verification. Eleven new unit tests in `tests/timeline-sort-year-tiebreak.test.ts` fence the comparator's contract; the three sort sites in the renderer now share the same extracted helper.

- **Custom relationship `Maps to: Father` / `Maps to: Mother` now writes the gendered parent scalar** ([#616](https://github.com/banisterious/obsidian-charted-roots/issues/616)): The Add Relationship modal's save handler dispatches on the type's `familyGraphMapping` value, but only had explicit branches for `'spouse'`, `'parent'`, the built-in `'child'` id, and the built-in `'adoptive_parent'` id. The `'father'` and `'mother'` mappings — both standalone options in the `Maps to` dropdown alongside `'parent'` — fell through to the catch-all that writes a flat property keyed on the custom type's id, so they never reached the canonical `father:` / `mother:` scalar fields. Downstream consumers that read those scalars (Canvas Family Tree, Family Chart, the Relationship Calculator, the v0.22.47 per-field conflict guard from [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)) never saw the relationship. The save handler now dispatches `'father'` and `'mother'` directly to `RelationshipManager.addParentRelationship` with the matching parent type, so they take the same write path as the built-in Father / Mother relationship types — including the conflict-guard prompt on replace and the sex-mismatch warning notice. Surfaced by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606) retest cycle. The broader audit of which other `Maps to` options should route to family-graph fields (stepparent / foster / guardian / custom-typed child / custom-typed adoptive_parent) is tracked in [Discussion #617](https://github.com/banisterious/obsidian-charted-roots/discussions/617).

## [0.22.47] - 2026-05-18

A focused fix release driven by reporter feedback on the v0.22.46 Discussion #602 thread plus a few quick-win polish items. Per-field conflict guards on the scalar parent fields inoculate against the data-loss surface that reset the prior stability window (#606); the Canvas Family Tree's marriage-date labels now anchor below the left spouse rather than at the geometric midpoint of the connector (#603); the fictional-era date parser accepts ISO 8601 time suffixes for twin disambiguation (#590 follow-up); and the Family Chart custom-relationship overlay gets stable bow direction, endpoint clipping to card edges, and verticality-weighted sag clearance (#591 follow-up). Plus a custom-relationship-type editor visibility fix and the last `multicolumn`-family CSS warning removed. **906 tests passing across 71 suites**.

### Fixed

- **Family Chart custom-relationship overlay: stable bow direction, endpoints at card edges** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591) follow-up): The v0.22.46 fix for overlay clipping addressed the obvious case (a near-vertical chord through stacked cards) but left three smaller issues on a pure vertical adoptive chain reported by [@doctorwodka](https://github.com/doctorwodka). (1) The perpendicular orientation for the bow was derived from the chord's source/target enumeration, which f3 layout can flip across renders for vertical chords — the bow direction would swap between initial draw and refresh, sometimes crossing an intermediate card on one render and clearing it on the next. The chord direction is now derived from a canonical upper-to-lower endpoint sort so the bow is stable. (2) The bezier endpoints were the card centers, so the visible line started inside the source card and ended inside the target. Each endpoint is now clipped to its card's rectangular boundary via ray-rectangle intersection. (3) The sag-scaling formula didn't guarantee the curve's perpendicular apex (≈ sag/2 from the chord) cleared the half-width of intermediate cards on the chord path. A new verticality-weighted clearance term ensures vertical chords through stacked cards get enough sag to bow fully around them; horizontal-spread chords are unchanged. The fourth symptom in the same report (post-refresh top-endpoint drift) was not reproducible in the local dev-vault on the same three-card adoptive chain and is left for a follow-up if it persists after the upgrade.

- **Canvas Family Tree marriage labels no longer appear between non-spouse cards** ([#603](https://github.com/banisterious/obsidian-charted-roots/issues/603)): Marriage metadata (`m. <year>`, plus optional location / divorce / status per the `Spouse edge label format` setting) was rendered as an Obsidian Canvas edge label on the spouse-to-spouse connector. Obsidian Canvas pins edge labels at the geometric midpoint of the line, and the siblings-then-spouses layout default frequently places non-spouse cards (siblings, other spouses) between the spouse pair, so a midpoint label could appear to belong to the wrong relationship. Marriage info now renders as a small text node anchored directly below the **left spouse card** (whichever spouse has the lower x position). When the same card anchors multiple marriages — e.g., a person with two spouses — the labels stack vertically below the card in spouse-index order (spouse1 above spouse2, etc.) rather than overlapping. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

- **Custom relationship type with parent mapping no longer silently overwrites existing father/mother** ([#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)): Adding a relationship via the Add Relationship modal whose custom type has `Maps to: Parent (gender-neutral)` previously routed through `RelationshipManager.addParentRelationship` for male and female targets, which silently replaced any existing `father` / `mother` scalar field on the source note with no recovery path beyond Obsidian's file-recovery snapshot. The write now consults a per-field conflict policy: UI-driven sites (Add Relationship, context menus) surface a confirmation modal that displays which person is being replaced and offers `Cancel` (default on Escape / click-out) or `Replace <name>` (warning-styled). When the user confirms the replace, the previous parent's `children` / `children_id` arrays are also cleaned up so they don't keep claiming a child who has been re-parented elsewhere. Reactive write paths (bidirectional-linker) continue to use their existing skip-on-conflict behavior. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

- **Fictional-era dates with ISO 8601 time suffix now parse correctly** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up): The v0.22.46 sibling-sort time tiebreak was designed against standard ISO 8601 dates (`1985-04-12T03:42`) and didn't account for adding a time component to a fictional-era date (`BBY 29 T20:03:04`). The fictional date parser is anchored at end-of-string, so a trailing `T HH:MM[:SS]` made every pattern fail; parsing fell through to the standard date path, losing the era prefix on display and producing a wildly off age (real-world year minus focal canonical year). The parser now strips an optional `T HH:MM[:SS]` suffix (with or without a leading space) before pattern-matching, so the era and year parse correctly while the raw frontmatter string stays available for the sibling-sort tiebreak. The Profile View header and the Family Chart card display also strip the time component for cleaner rendering; the underlying `born:` / `died:` frontmatter values are untouched, and the Edit Person modal still shows the full raw string when editing. The Edit Person modal's Birth date hint now mentions that appending `T HH:MM` is supported for twin disambiguation. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Custom relationship type editor: `Maps to` dropdown now reveals when "Include on family trees" is toggled on**: The toggle's onChange handler set `style.display = ''` directly, which couldn't override the initially-applied `.crc-hidden` CSS class (`display: none` from `base.css`) — so the row stayed hidden no matter how many times the toggle was flipped. The handler now toggles the `crc-hidden` class to match the initial-hide mechanism. Surfaced while setting up the test fixture for the #606 conflict-guard verification.

### Changed

- **Internal: drop vestigial `break-inside: avoid` from timeline-callout list items**: After the v0.22.46 migration from CSS multicolumn to CSS Grid for the timeline-callout layout, the `break-inside: avoid` rule on `.callout[data-callout="cr-timeline"] .callout-content ul li` no longer does useful work — Grid cells are discrete and don't break across columns or pages. The scanner's lookup table classifies `break-inside` as part of the multicolumn property family, so the leftover rule was the sole reason a `multicolumn` warning kept appearing on the v0.22.46 scan. Removed. Closes the last CSS-lint warning that the scanner was flagging.

## [0.22.46] - 2026-05-17

A bug-fix-heavy release driven by post-v0.22.45 reporter feedback, with two architectural themes folded in. Two distinct rendering bugs in the Family Chart's custom-relationship overlay closed via #591 (curve clipping through cards on near-vertical chords, and the post-refresh shrink to a stub). The Gramps importer's shared-event handling was attributing deaths to non-Primary participants (#601 from Tiberius on the Obsidian Forum). Four new dynamic Timeline block toggles for children's deaths, stepparent deaths, sibling deaths, and grandchild births (#582-#585 from [@DigitalDreamn](https://github.com/DigitalDreamn)). The timeline-callout multi-column layout migrated from CSS multicolumn to CSS Grid to clear the last scanner-flagged CSS warning. Three new filter controls on the Events timeline (#515): universe, place, and date range, gated behind a "More filters" disclosure so the primary filter row stays compact. The sibling sort gained an ISO 8601 time tiebreak (#590) for twins and triplets, applied across all five rendering surfaces (architectural pattern flagged in [Discussion #597](https://github.com/banisterious/obsidian-charted-roots/discussions/597)). [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602) from [@DigitalDreamn](https://github.com/DigitalDreamn) surfaced two Family Chart bugs landed here: the Person details pane's X button was a silent no-op (#604), and the interactive Family Chart's sibling sort was fictional-blind and missing the #590 tiebreak (#605). A follow-up on #569 fixed the sort-order tiebreak for events sharing a start date so point events now sort before range events. **892 tests passing across 69 suites**.

### Added

- **Sibling sort: ISO 8601 time tiebreak for twins and triplets** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590)): When siblings share a birth date, the sibling sort now falls through to a lexicographic compare on the raw `born:` field, so twins and triplets recorded with an ISO 8601 time component (`1985-04-12T03:42`) sort deterministically by birth order. Existing `YYYY-MM-DD` values are unaffected and continue to work as before; time precision is optional and only kicks in when two children share the exact same date. As a side effect, siblings within the same calendar year now also sort by month and day instead of falling through to insertion order. Final fallback is still insertion order for cases where the raw date string matches exactly. The same tiebreak is applied across all four sibling-sort sites: `RelationshipQueryService.getChildren()` (used by reports, visual trees, family timeline view), the Profile View's `sortChildrenByBirthDate` helper, the family-graph layout sort used for Canvas Family Tree rendering, and the Dynamic Relationship Block's local sort in the dynamic-content renderer. Suggested by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Events timeline: universe, place, and date-range filters** ([#515](https://github.com/banisterious/obsidian-charted-roots/issues/515)): The Events tab's Timeline card (Control Center) and the dockable Events sidebar both gain three new filter controls beyond the existing type / person / search trio. **Universe** filter scopes events by their `universe` field; sentinel options `(real-world)` (events with no universe set) and `(any fictional)` (events with any universe) are listed alongside each universe note in the vault. **Place** filter scopes events by their `place` wikilink. **Date range** filter narrows by year via two numeric inputs (from / to); events with no date are excluded when either bound is active. The new controls live under a "More filters" disclosure so the primary filter row stays compact on narrow widths; the disclosure opens automatically when any persisted secondary filter is set. The dockable sidebar persists all six filter values across Obsidian restarts via the existing view-state mechanism. Both implementations share a single `applyTimelineFilters` helper so the predicate stays consistent.

- **Timeline coverage: four new family-event toggles** ([#582](https://github.com/banisterious/obsidian-charted-roots/issues/582), [#583](https://github.com/banisterious/obsidian-charted-roots/issues/583), [#584](https://github.com/banisterious/obsidian-charted-roots/issues/584), [#585](https://github.com/banisterious/obsidian-charted-roots/issues/585)): Four new toggles on the "Family events on timelines" settings panel expand the dynamic Timeline block's coverage of important life events of family members. "Show children's deaths" (#582) renders the death of a biological, adopted, or step-child on the parent's timeline when the parent was still living. "Show stepparent deaths" (#583) renders a stepparent's death on the stepchild's timeline. "Show sibling deaths" (#584) renders a sibling's death on the person's timeline, mirroring the existing "Show sibling births" toggle and using the same step-sibling-aware walk. "Show grandchildren's births" (#585) renders a grandchild's birth on the grandparent's timeline, walking biological and adopted children one generation down. All four are opt-in and default off; each has a corresponding customizable label in the Timeline labels panel. Death events are filtered to those that occur before the focal person's death (so the focal person needed to be alive to experience the event); grandchild births are filtered the same way. Filed by [@DigitalDreamn](https://github.com/DigitalDreamn).

### Changed

- **Event sort: point events sort before range events on shared start date** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up): The topological-sort tiebreak for events sharing the same start date now prefers point events (no `date_end`) over range events (with `date_end`). Reader expectation matches this rule: the discrete things that happened on a date show before the multi-year states that began on that date (e.g., "1920 Census Residence" sorts before "Residence 1920-1925"). Previously, tied dates fell back to insertion order, which felt arbitrary and produced the confusing display order reported on the [v0.22.45 auto-compute thread](https://github.com/banisterious/obsidian-charted-roots/issues/569). The fix propagates via "Compute sort order" or auto-compute-on-save; existing vaults will see `sort_order` values recomputed on the next save. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Internal: sibling-traversal centralized**: The dynamic Timeline block's sibling-walking code (parent-walk + custom `sibling`-relationship-type lookup + step-sibling exclusion) is now factored into a single `collectSiblingCrIds` helper method shared by the sibling-births and sibling-deaths paths. Mirrors the pattern-1 (renderer-coverage) closure direction from the architectural audit.

- **Internal: timeline-callout multi-column layout migrated to CSS Grid**: The auto-fitting multi-column layout on timeline event lists (under `.callout[data-callout="cr-timeline"]`) previously used CSS multicolumn properties (`column-width`, `column-gap`, `column-rule`). The Obsidian Community automated review flagged these as partially supported (the static support-matrix lookup didn't reflect Chromium's full support). The rules now use `display: grid` with `repeat(auto-fill, minmax(var(--cr-list-min-width), 1fr))`, which is universally supported and flagged-clean. Reading order shifts from column-major to row-major; for typical timeline lengths the visual flow reads naturally in either pattern. The `--cr-list-column-rule-color` and `--cr-list-column-rule-width` variables (deprecated 0-width separator) were dropped in the same change. Closes the last CSS-lint warning that the scanner was flagging on v0.22.45.

### Fixed

- **Family Chart Person details pane respects hidden state** ([#604](https://github.com/banisterious/obsidian-charted-roots/issues/604)): The `.cr-fcv-info-panel` rule and the global `.crc-hidden` rule were both single-class selectors with the same specificity, so bundling order made the panel's `display: flex` always win. The panel auto-opened on chart load and the X close button silently failed because adding `crc-hidden` was a no-op. A combined-class rule (`.cr-fcv-info-panel.crc-hidden`) wins the specificity comparison and the panel now hides as intended. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

- **Family Chart sibling sort: fictional-era-aware, with #590 time tiebreak** ([#605](https://github.com/banisterious/obsidian-charted-roots/issues/605)): The interactive Family Chart's `setSortChildrenFunction` callback used straight `localeCompare` on birthday strings, which produced incorrect order for fictional-era dates (lex compare puts "BBY 19" before "BBY 22" even though 22 BBY is chronologically earlier) AND lacked the #590 twin/triplet time tiebreak landed elsewhere in this release. The sort now matches the other four sibling-sort surfaces: universe-aware canonical-year compare via `DateService`, with lex string compare as the same-year tiebreak. Fifth and final site of the consolidation pattern flagged in [Discussion #597](https://github.com/banisterious/obsidian-charted-roots/discussions/597). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

- **Custom relationship overlay: clipping on first render and stub after refresh** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591)): Two distinct bugs in the Family Chart custom-relationship overlay surfaced together when a symmetric overlay relationship spans three generations (technical grandparent through grandchild). First, the arc sag was hard-coded along the +y axis, which collapsed near-vertical chords toward a straight line that clipped intermediate cards. The sag now applies along the down-oriented perpendicular to the chord, so vertical chords bow sideways and clear cards in between. Second, the post-animation stability poll was firing on the pre-animation `(0, 0)` plateau immediately after a refresh, capturing card positions before f3's entrance transition moved them; both endpoints collapsed onto the focal person's origin and the line shrank to a stub. The poll now requires at least one observed change before treating positions as stable. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Gramps import: shared events with non-Primary roles no longer inherited as the participant's own birth or death** ([#601](https://github.com/banisterious/obsidian-charted-roots/issues/601)): When a person was attached to a Gramps event in a non-Primary role (Informant, Witness, Family, etc.), the importer was extracting that event's date and place to the person's own `born` / `died` / birth-place / death-place fields. As a result, a person who appears on a relative's death event as the informant (the family member who registered the death) was being imported into Obsidian as deceased themselves. The importer now filters event references to the Primary role only (or unspecified, which Gramps treats as Primary by default). Reported by Tiberius on the Obsidian Forum.

## [0.22.45] - 2026-05-16

A multi-theme release. Bundle hygiene work nearly halves `main.js` size (14.7 MB to 8.27 MB) and closes the last tractable scanner Recommendation (Dynamic Code Execution). Two follow-up reports from @doctorwodka on the Add Custom Relationship modal's parent handling. Two new requests from @DigitalDreamn: a person filter for the event picker, plus an auto-compute extension to the v0.22.39 Event Relative ordering UI that closes the discoverability gap. And a four-surface sibling-sort consolidation arc covering the Profile View, Canvas Family Tree, and seven report / visual-tree / family-timeline surfaces. **883 tests passing across 68 suites**.

### Added

- **Event picker: optional person filter** ([#581](https://github.com/banisterious/obsidian-charted-roots/issues/581)): The Relative ordering event picker now scopes by participant via a new "Person:" dropdown alongside the existing Type filter. Source values are deduplicated from each event's `person` + `persons` wikilink fields. Reduces scrolling on vaults where multiple people have similarly-titled events. Suggested by [@DigitalDreamn](https://github.com/DigitalDreamn) after using the v0.22.39 UI on Ahsoka's events.

- **Auto-compute `sort_order` on event save** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up): When an event is saved with `before` / `after` constraints set or changed, the plugin now recomputes `sort_order` values across all events in the background using the existing topological sort. Closes the discoverability gap from v0.22.39: previously the constraints had to be materialized by running the "Compute sort order" command manually before they would take effect in the Events tab and Profile View renders. Fired fire-and-forget so the modal closes immediately; a cycle notice surfaces asynchronously if `before` / `after` constraints form a cycle.

### Fixed

- **Add Custom Relationship modal: gender-neutral parent setting honored, non-binary fallback added** ([#579](https://github.com/banisterious/obsidian-charted-roots/issues/579), [#580](https://github.com/banisterious/obsidian-charted-roots/issues/580)): The modal's `parent` save path was unconditionally routing to gendered `mother` / `father` fields, ignoring the "Enable gender-neutral parent property" setting (#579) and falling back to `father` for parents with non-binary sex (#580). The save path now routes to the gender-neutral `parents` array when either (a) the setting is on, or (b) the target's sex isn't `male` / `female`. Otherwise the gendered path is unchanged. Reported by [@doctorwodka](https://github.com/doctorwodka).

- **Children sort by birth date across Profile View, Canvas Family Tree, and report surfaces** ([#586](https://github.com/banisterious/obsidian-charted-roots/issues/586), [#587](https://github.com/banisterious/obsidian-charted-roots/issues/587)): Three rendering surfaces emitted children in frontmatter array order rather than birth order: the Profile View Children section (#586), the Canvas Family Tree (#587), and seven report and visual-tree surfaces (Family Group Sheet, Individual Summary, Register, Descendant Chart, Source Summary, Visual Tree, Family Timeline view). The sort is now consolidated into `RelationshipQueryService.getChildren()` via a new `sortByBirthDate` option that uses universe-aware canonical-year comparison, so descending fictional eras (BBY / GR / EF / DE / etc.) order correctly alongside Gregorian dates. Bio + adopted + step children merge into a single sorted list when `include: 'all'`. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn). Architectural follow-up tracked at [#588](https://github.com/banisterious/obsidian-charted-roots/issues/588).

### Changed

- **Internal: production minify enabled in esbuild config**: `main.js` drops from 14,710 KB to 8,460 KB (~50% reduction) with no functional changes. Pre-flight grep confirmed no `Function.name` / `.constructor.name` / `.toString()` introspection in plugin source, so identifier mangling is safe without `keepNames`. The Sync Standard 5 MB caveat in the 1.0 release notes softens substantially (~3.4 MB remaining versus ~9.5 MB previously); fully closing the threshold requires structural moves (jspdf consolidation, family-chart-premium evaluation) that stay post-1.0 scope.

- **Internal: closed the Dynamic Code Execution scanner Recommendation**: A new `patch-pdfmake.js` postinstall strips two `new Function("return this")()` sites from pdfmake's bundled core-js globalThis polyfill and webpack runtime. Both branches are unreachable in Obsidian's Electron runtime because the `typeof globalThis === "object"` early-return always fires. Removes the literals from `main.js` without changing runtime behavior. The IE5-8 setImmediate polyfill site remains handled by the existing `patch-core-js-polyfill.js`.

- **Internal: `createConfiguredFamilyGraph` wires a `DateService` by default**: The standalone factory used by report generators previously didn't inject a `DateService`, so any consumer opting into the new `sortByBirthDate` option got a silent no-op. The factory now constructs a `DateService` from the same three settings fields the plugin uses, so report-side and visual-tree-side callers inherit universe-aware sort automatically. (`src/core/reference-numbering.ts` is the one remaining surface that creates its own `FamilyGraphService` without this wiring; tracked at [#588](https://github.com/banisterious/obsidian-charted-roots/issues/588).)

## [0.22.44] - 2026-05-16

Same-day follow-up to v0.22.43 that actually closes the two CSS lint Warnings v0.22.43 was meant to silence. The source-level changes shipped correctly in v0.22.43 (`styles/family-chart-view.css` dropped `!important`, `styles/timeline-callouts.css` dropped `:has()`), but the bundled `styles.css` in the repo was not rebuilt and committed alongside. The Community automated review's CSS-lint rule reads `styles.css` from the repo at the tagged commit (not the CI-built release asset), so it still saw the old rules at the bundled paths even though the source paths had been fixed. v0.22.44 commits a freshly built `styles.css` matching the v0.22.43 source state, and updates the release-procedure documentation to reflect the new "rebuild + commit `styles.css` on CSS-touching releases" rule. No source-code changes; only the bundled stylesheet and release-procedure docs. **883 tests passing across 68 suites.**

### Fixed

- **Bundled `styles.css` rebuilt and committed.** The committed `styles.css` now matches the v0.22.43 source state: `!important` is gone from the `.card_cont.cr-hl-dim` rule, and the two sibling-aware `:has()` rules in timeline-callouts have been rewritten to class-based adjacent-sibling selectors per v0.22.43's `cr-has-timeline` post-processor. The scanner now sees zero `!important` declarations and zero `:has()` selectors in the bundled stylesheet (down from one and two respectively at v0.22.43).

### Changed

- **`docs/developer/release-procedure.md` flipped its guidance on `styles.css`.** The previous instruction was to skip `styles.css` during the version-bump commit because of a "known build-timestamp drift." That captured the symptom but documented the wrong remediation: the drift exists because we never rebuild + commit, and the Community automated review reads the bundled stylesheet from the repo. The correct rule is to rebuild via `npm run build`, then include `styles.css` in the version-bump commit whenever the release touched any CSS source.

## [0.22.43] - 2026-05-16

Follow-up to v0.22.42 closing the two remaining CSS lint Warning categories that the Community automated review's scan against v0.22.42 still surfaced. The release adds two new postinstall patches to `patch-family-chart.js` and a new markdown post-processor to `main.ts`, lets `styles/family-chart-view.css` drop `!important` and `styles/timeline-callouts.css` drop `:has()`. The multicolumn partial-support category stays as-is (timeline event lists rely on `column-width` / `column-gap` / `column-rule` for fluid multi-column layout; no longhand alternative). **883 tests passing across 68 suites**.

### Fixed

- **Dropped `!important` from `.card_cont.cr-hl-dim`** by patching family-chart's library to clean up its inline `opacity` styles after transitions. `family-chart` writes `style="opacity: 1"` on each card during D3 transitions, and inline styles have specificity 1,0,0,0, which forced our highlight-dim CSS rule to use `!important` to override. Two new patches in `patch-family-chart.js` append `.on("end", function () { d3.select(this).style("opacity", null); })` to the SVG and HTML `cardUpdate` transitions, so the inline opacity is removed when each transition finishes. CSS regains control without `!important`. Same fix proposed upstream; this is the local application. No user-visible change to highlight-dim behavior; tested in dev-vault across the initial chart render, pan / zoom, and highlight-group toggle paths.

- **Replaced sibling-aware `:has()` rules in `styles/timeline-callouts.css` with class-based selectors.** A new markdown post-processor registers a small DOM walk that adds `.cr-has-timeline` to any `<div>` containing a `[data-callout="cr-timeline"]` direct child. The two previous `:has()`-based spacing rules ("margin-top before a timeline-following div", "margin-bottom after a timeline-containing div") were rewritten to use adjacent-sibling combinators on the class instead, silencing the Community automated review's "Avoid `:has()`" Warning. Behavior is unchanged for the Timeline Report markdown output path (the only surface that emits `[!cr-timeline]` callouts); dynamic timeline blocks render as `.cr-dynamic-block.cr-timeline` and are unaffected.

## [0.22.42] - 2026-05-15

Follow-up to v0.22.41 that addresses the Community automated review's remaining Behavior-section Warning. The v0.22.41 scan, while clean of errors, surfaced a `setInterval` + network-call correlation pattern ("May perform periodic background data transmission"). `main.js` contained eight `setInterval` references: three plugin-authored (journey playback ticker, time slider animation, media upload count text) and five vendored. This release closes the three plugin sites and two of the vendored sites (the literal smoking gun — `setInterval` wrapping `fetch` in the same closure — was in `leaflet-distortableimage`'s mapknitter export status-poll, which the plugin never invokes). `main.js` `setInterval` count drops from 8 to 3; the remaining three are in d3-timer, html2canvas, and a leaflet circle-marker animation, all documented as deferred-investigation targets in `docs/planning/setinterval-vendored-investigation.md`. **883 tests passing across 68 suites**.

### Fixed

- **Migrated three plugin `setInterval` sites to recursive `setTimeout`.** The journey playback ticker (`map-view.ts:journeyPlaybackInterval`), time slider year animation (`map-view.ts:animationInterval`), and media upload modal file-count text re-render now reschedule themselves via `window.setTimeout` after each tick instead of running on a fixed interval. Functional behavior is unchanged — pause / resume, speed-change propagation, and cleanup all work identically — but the source no longer contributes to the scanner's setInterval correlation surface.

- **Stubbed two dead-code `setInterval` sites in `leaflet-distortableimage`.** Two new patches landed in `patch-leaflet-distortable.js`:
  - **mapknitter export status-poll** (`_defaultHandleStatusRes`). The library exposes an export-to-server flow that uploads a distorted image collection to `export.mapknitter.org` and polls the returned status URL via `setInterval` wrapping `fetch(req)` in the same closure. The plugin renders image overlays in-vault only and never invokes the export start flow, so the handler is unreachable. Removing it eliminates the textbook "periodic beaconing" pattern the scanner's Behavior rule looks for.
  - **webpack-dev-server live-reload poll.** The bundled `reloadApp` helper sets a `setInterval` that watches `window.location.protocol` and triggers a live reload. Same dead-code situation as the existing `WebSocketClient` and chunk-loader stubs (Patches 1 + 2) — the dev server is never running in production. Stubbed to a no-op `intervalId`.

### Added

- **`docs/planning/setinterval-vendored-investigation.md`** — committed planning doc cataloging the three remaining vendored `setInterval` sites (d3-timer core loop, html2canvas iframe-load polling, an unidentified leaflet plugin's circle-marker animation) with reachability assessments, patch-feasibility ratings, and a sequencing plan for further investigation if the scanner Warning persists. Also documents the conditions under which a `family-chart-premium` subscription investigation would be triggered.

## [0.22.41] - 2026-05-15

Follow-up to v0.22.40 that closes the remaining four sites flagged by the Community automated review's "dynamic `<script>` element creations" rule. The four sites were all an IE5-8 setImmediate polyfill bundled inside `core-js` and `pdfmake` (two each, since pdfmake ships its own copy of `core-js`). The branch is unreachable in Obsidian's Electron runtime because the earlier `MessageChannel` branch in the same polyfill chain always wins, so the `createElement('script')` lines are dead code. A new postinstall patch removes the IE8- branch from `core-js/internals/task.js` and `pdfmake/build/pdfmake.js` at source so it never reaches `main.js`. Bundled count goes from four to zero. **883 tests passing across 68 suites**.

### Fixed

- **Stripped IE5-8 setImmediate polyfill from `core-js` and `pdfmake`** (new postinstall `patch-core-js-polyfill.js`). The polyfill's IE8- detection branch (`if (ONREADYSTATECHANGE in createElement('script')) { ... }`) is microtask-scheduling fallback for IE5-8. In Electron, the earlier `MessageChannel` branch in the same `if/else if` chain always succeeds, so the IE8 path is never reached at runtime. The patch removes the branch from both bundled libraries at source. No user-visible change; setImmediate behavior is unchanged because the MessageChannel path was already the only path executed.

## [0.22.40] - 2026-05-15

A targeted scan-response release. The Obsidian Community automated review promoted "dynamic `<script>` element creations" from warning to error severity between v0.22.38 and v0.22.39's post-release scan; v0.22.39 was demoted on the Community Plugins website as a result. The rule fired on nine sites — all in vendored library code that never executes in Obsidian's Electron runtime. This release reduces the flagged surface from nine to four: stubs `leaflet-distortableimage`'s unreachable webpack chunk loader, and migrates ODT generation from `jszip` (which bundles UMD module-detection guards in four places) to the smaller, modern `fflate`. The four remaining sites — two in `core-js` and two in `pdfmake` (which bundles core-js internally) — are scoped for follow-up. **883 tests passing across 68 suites**.

### Fixed

- **Stubbed unreachable webpack chunk loader in `leaflet-distortableimage`**. The bundled library includes webpack's lazy-chunk loader (`__webpack_require__.l`) which dynamically creates a `<script>` element to fetch chunks. The plugin emits a single bundle (no code splitting), so this code path never executes, but the dynamic `createElement('script')` was flagged at error severity by the Community automated review. A postinstall patch (mirroring the existing `patch-family-chart.js`) now stubs the loader to a no-op that immediately invokes its `done()` callback. No user-visible change.

### Changed

- **Migrated ODT generation from `jszip` to `fflate`**. `jszip`'s bundled output contained four UMD module-detection guards using `document.createElement('script')`, all flagged at error severity. `fflate` is a smaller, modern, no-UMD-detection alternative supporting the same writer + reader subset. The migration introduces a thin adapter at `src/utils/zip.ts` (`ZipBuilder` / `ZipReader`, JSZip-shaped API) so the four call sites — Reports → ODT, Family Chart → ODT, Book → ODT, and Gramps `.gpkg` import — needed only near-mechanical edits. Functional behavior is unchanged; ODT files open identically in LibreOffice and the Gramps reader handles both tar.gz and ZIP-format `.gpkg` inputs as before. Centralizing the library boundary in the adapter means any future `fflate` version bump or alternative-library swap is a one-file change.
- **Internal: ZIP-format `.gpkg` test fixture**. Added `tests/fixtures/gramps/gramps-app-export-test11-small-zip.gpkg` plus a repack script (`tests/fixtures/gramps/repack-to-zip.js`) that converts tar.gz `.gpkg` archives (the format Gramps' export wizard produces) into ZIP-format archives. Lets the ZIP reader code path in `gpkg-extractor.ts` be exercised in dev-vault testing; Gramps does not produce ZIP-format `.gpkg` directly, so the existing fixtures only covered the tar.gz reader path.

## [0.22.39] - 2026-05-15

A focused reliability and UX release. Adds the long-requested **Event Relative ordering UI** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569)) so `before` / `after` constraints can be set through the Create / Edit Event modal instead of by hand-editing YAML. Fixes five map-view issues that surfaced during recent custom-map testing: a spurious WebSocket console error from a bundled dev-server client, a markercluster load-order cascade that broke open / close cycles, a child-map header layout that wrapped awkwardly on long map names, and a [#575](https://github.com/banisterious/obsidian-charted-roots/issues/575) freeze when person notes contained asymmetric relationship data. Also closes the largest category in the v0.22.38 Community automated review's CSS lint surface via a 25-selector `leaflet-distortable` dedupe — no user-visible change; the scanner is now in its fully-irreducible state. **883 tests passing across 68 suites**.

### Added

- **Event modal: Relative ordering section**: Create / Edit Event modal now exposes "After these events:" and "Before these events:" chip-list pickers for setting the `before` / `after` frontmatter arrays. The topological sort in the timeline exporters has supported these constraints since v0.20.x, but until now they could only be set via manual YAML editing. Use this for events with unknown or imprecise dates where chronology depends on relative ordering rather than calendar values. The Add picker excludes self and already-added events on the same side. (#569)

### Fixed

- **Map view: spurious "WebSocket connection to ws://localhost:8081/ws failed" error in DevTools** during custom-map edit mode. The `leaflet-distortableimage` library's bundled dist file accidentally includes a webpack-dev-server hot-reload client that opens a WebSocket to a non-existent localhost port on every module load. The connection failure was logged as an error every time a custom-map view was opened in edit mode — harmless in practice (the library's normal functionality is unaffected) but alarming-looking. A postinstall patch (`patch-leaflet-distortable.js`, mirroring the existing `patch-family-chart.js` pattern) now stubs the offending `WebSocketClient` constructor to a no-op object, so no connection attempt is made and no error is logged.

- **Map view: cluster cleanup errors during map close no longer cascade to break subsequent map opens**. A pre-existing leaflet.markercluster load-order issue throws "L.DistanceGrid is not a constructor" when clearing cluster layers during view destroy. Previously this poisoned global state and caused the next map open to fail with "leaflet.markercluster is not properly loaded". The map-controller's `destroy()` path now wraps each cleanup step (cluster clears, layer clears, image map manager, map.remove) in independent try-catches with warning logs, so a failure in one step doesn't propagate to the rest of teardown or the next session.

- **Map view: leaflet plugin registrations now survive multiple open/close cycles**. The `initializeLeafletPlugins()` (markercluster, heat, fullscreen, minimap, etc.) and `initDistortableImagePlugins()` (leaflet-toolbar, leaflet-distortableimage) loaders previously only set `window.L = L` on first call; subsequent map opens skipped the reattach. Across repeated cycles, the global L reference could drift (mechanism unclear — possibly Obsidian view-lifecycle interactions or another plugin clobbering window.L), causing the post-load registration checks to fail from the 2nd or 3rd cycle onward. Both loaders now defensively reattach `window.L = L` on every invocation before the cached imports resolve.

- **Map view: child-map header layout no longer wraps awkwardly when the map name is long**. The breadcrumb navigation (e.g., `The Dying Earth → River Scaum and its Major Tributaries`) is now rendered as its own row above the toolbar instead of sharing the toolbar's left section. The map-selector dropdown is also capped at `max-width: 240px` with ellipsis truncation so long map names don't push filter controls (collections dropdown, year range inputs) into a wrap. The selector's dropdown popup still shows full option text when opened.

- **Family Chart no longer freezes Obsidian when relationship data is asymmetric** ([#575](https://github.com/banisterious/obsidian-charted-roots/issues/575)). When a person note has a relationship `_id` field set (e.g., `father_id`) but the corresponding wikilink half is missing — a state that can be produced by interrupted writes, sync conflicts, or partial frontmatter edits — the family-chart library's internal tree construction could enter an infinite loop that froze the entire Obsidian app, not just the view. A bidirectional-symmetry pass now runs over the chart data before it reaches the library: any claimed parent / child / spouse reference that the other side doesn't mirror is dropped with a console warning, and the chart renders correctly with whatever symmetric data remains. The underlying note data is not modified — a future Data Quality enhancement will surface the asymmetric refs for repair through the UI. Reporter [@D4B2A](https://github.com/D4B2A).

### Changed

- **Internal: leaflet-distortable CSS dedupe**: 25 duplicate-selector cluster between `styles/map-view.css` and `styles/leaflet-distortable.css` consolidated to a single theme-aware block in `leaflet-distortable.css` with `.cr-map-view` scoping. Closes the largest category in the Community automated review's v0.22.38 CSS lint surface (the `.ldi-*`, `.leaflet-toolbar-icon.*`, `#toggle-keymapper`, etc. selectors). styles.css drops by 274 lines (41,244 → 40,970). No user-visible change in current Charted Roots usage — leaflet-distortable's popup toolbar and keymapper are intentionally suppressed in our map view (`suppressToolbar: true` at `image-map-manager.ts:686`), so the theme-aware values apply to UI that doesn't render. The consolidation is pure scanner cleanup plus defensive posture for any future flip of the suppression flag. Plan documented at [`docs/planning/leaflet-distortable-dedupe-plan.md`](docs/planning/leaflet-distortable-dedupe-plan.md).
- **Internal: `createSmartWikilink` accepts already-wikilinked input idempotently**. Defensive guard in `src/events/services/event-service.ts` lets callers pre-build wikilinks (with explicit basename disambiguation) and pass them through the service pipeline without double-wrapping. Enables the #569 event-modal save path.

## [0.22.38] - 2026-05-14

A large-scoped scan-cleanup release responding to the v0.22.37 community automated review (which still surfaced ~50 actionable CSS warnings despite previous patches). This release closes the cluster-duplicate and `:has()` perf categories the scanner flagged, and migrates ~190 button markup sites to Obsidian's native `ButtonComponent` API for theme consistency and to retire a long-standing CSS-duplication source. Also drops `!important` from 5 of 6 sites where empirical DevTools inspection confirmed they were unnecessary, replaces the multi-value `text-decoration` shorthand with non-flagged alternatives, and includes one small user-facing cosmetic fix for custom relationship category display. Branch net: 27 commits, ~750 lines deleted. **883 tests passing across 68 suites**.

### Changed

- **Native button migration**: ~190 `.crc-btn`/`--primary`/`--secondary`/`--danger`/bare markup sites converted to Obsidian's `new ButtonComponent().setCta()` / `.setWarning()` / bare `ButtonComponent` patterns across 50+ files. Native buttons inherit Obsidian's theme conventions automatically; modal "Cancel" / "Save" / "Apply" footers now match Obsidian's standard CTA look. Compact list-row buttons (`.crc-btn--small` family — 87 sites in dense surfaces like organization/place/source list rows) continue to use `.crc-btn` for layout density. Icon-only toolbar buttons (`.crc-btn--icon`) and inline text-link buttons (`.crc-btn-link`) also kept as-is. Visual effect: most modal CTAs are slightly more compact and theme-consistent; some surfaces will look subtly different across themes.
- **CSS cluster consolidation** (scan-flagged duplicates eliminated):
  - `.cr-stat-*` cluster across 3 files
  - `.crc-wizard-*` cluster across 5 files (15 duplicates)
  - `.crc-btn` family across 6 files (8 duplicates)
  - 9 miscellaneous cross-file duplicates (`.cr-error-text`, `.cr-export-stat`, `.crc-media-preview`, `.cr-badge`, `.crc-type-badge`, `.cr-subsection-heading`, `.crc-conflicts-section`, `.crc-info-callout`, `.crc-text-small`)
  - 8 utility clusters from the v0.22.37 scan (`.crc-loading`, `.crc-place-filter-type[s]`, `.crc-quality-*`, `.crc-modal-header`, `.cr-folder-suggestion*`, `.cr-sv-*` source-view header family, `.cr-progress-*` statistics progress family)
  - 3 within-file duplicate rule-block merges (`body` and callout-li in `timeline-callouts.css`; `.f3-form-cont` in `family-chart-view.css`)
- **`:has()` perf-warning rewrites**: 17 modal-sizing rules converted from `.modal:has(.X-modal)` to direct `.X-modal-sized` class added to `modalEl` in each modal's `onOpen`. 10 non-modal `:has()` rules also converted (textarea form-field detection, media-folder-filter checkbox state, body-level wizard state in source-image-wizard and source-media-linker). 2 sibling-aware `:has()` rules in `timeline-callouts.css` are structurally required (no class-based equivalent for sibling detection) and stay with documented `stylelint-disable` directives.
- **`!important` reduction (6 → 1)**: removed from `.cr-hidden`/`.crc-hidden` utility class (single-class specificity beats element defaults) and from 4 Leaflet container-scoped image-sizing rules (parent-class scope already wins against Obsidian's broader image rules — confirmed via DevTools cascade inspection). One legitimate site remains: `.card_cont.cr-hl-dim { opacity: 0.3 !important }` overrides the family-chart library's inline-style transitions; an upstream issue has been filed proposing a CSS-overridable approach.
- **Text-decoration partial-support reshape**: the 3 multi-value `text-decoration` shorthand sites (`line-through var(--text-error)`, `underline dotted`, `underline solid`) replaced with single-value shorthand plus alternative properties for the visual cues. The line-through-with-red use case now sets `color: var(--text-error)` so the now-uncolored strikethrough inherits the red text. The dotted/solid underline distinction in the variation count link now uses `border-bottom: 1px dotted/solid` instead of `text-decoration`.
- **Dead code removal**: `crc-btn--ghost` class (24 markup sites) had no CSS effect outside two specific scoped place-modal contexts whose parent classes weren't rendered anywhere; both the markup uses and the legacy `.crc-unlinked-place-item` / `.crc-referenced-place-item` CSS blocks (151 lines) were removed.
- **Internal: `docs/developer/automated-review-notes.md`** extended with a "CSS-specific known-and-accepted findings" section documenting the irreducible categories (multicolumn partial-support in timeline callouts, sibling-aware `:has()` in timeline callouts, the family-chart inline-style `!important`, and the vendored `leaflet-distortable` CSS duplicates).

### Fixed

- Custom relationship category names with multiple words now display correctly in the Entity Profile View's "Other relationships" section (e.g., "Jedi Order" instead of "Jedi_order"). The category-name lookup now resolves through `getRelationshipCategoryName()` so the configured display name is used rather than the slugified ID (#570).

## [0.22.37] - 2026-05-13

A scan-warning cleanup release responding to the v0.22.36 community automated review (which passed but reported a large warning surface). v0.22.34's `build-css.js` stripped all stylelint directives from the bundle to avoid the cross-component bleed problem from v0.22.32/33; the strip was too broad and unsilenced per-line `:has()` / `!important` / browser partial-support warnings that the scanner subsequently flagged. This release narrows the strip to file-level forms only (the actual bleed-risk shape), preserving per-line directives through the build. Also adds per-line silencers to the 9 documented-legitimate `!important` sites that lacked them; consolidates three truly-identical utility-class duplicates (`.cr-hidden`, `.crc-hidden`, `.crc-text--center`) into `base.css`; resolves 5 stylelint duplicate-declaration warnings in `control-center.css`. Scanner-architecture notes updated with the description-requirement applying to ALL inline directives plus findings on the 9 dynamic `<script>` element creations (all benign vendored polyfill code in `core-js` / `jspdf` / `leaflet-distortableimage`). Stability window unchanged — fifteenth patch in the v0.22.22-anchored window; all internal hygiene, none user-facing, none reset. **883 tests passing across 68 suites**.

### Changed

- **Internal: narrowed `build-css.js` stylelint-directive strip to file-level forms only**. v0.22.34's blanket strip removed `stylelint-disable-next-line` / `stylelint-disable-line` per-line directives from the bundle alongside the file-level `/* stylelint-disable */` / `/* stylelint-enable */` forms it was actually targeting (the file-level ones bled across component boundaries in the concatenated bundle and triggered "no rules have been disabled" complaints — a v0.22.32/33-era problem). Per-line directives have no bleed risk; they're now preserved through the build. This restores per-line suppression for `:has()` perf, `!important`, and browser partial-support warnings (text-decoration / text-indent / multicolumn longhands) that the v0.22.36 community scan surfaced. The negative-lookahead regex `(?!-[a-z])` distinguishes the file-level forms (stripped) from `-next-line` / `-line` forms (preserved).
- **Internal: added per-line `stylelint-disable-next-line` directives at the 9 documented-legitimate `!important` sites** across `base.css`, `control-center.css`, `family-chart-view.css`, `map-view.css`, and `universe-wizard.css`. Each directive carries a `-- reason` description naming the legitimate use case: utility-class display toggle (must beat all caller specificities), leaflet defensive tile override (max-width / max-height to allow custom sizing), family-chart inline-style override during overlay animation.
- **Internal: consolidated three truly-identical utility-class duplicates** flagged by the v0.22.36 community scan: `.cr-hidden` (moved from `control-center.css` and `universe-wizard.css` into `base.css` alongside `.crc-hidden` as a shared selector group); `.crc-hidden` (removed duplicate from `control-center.css`, canonical now in `base.css`); `.crc-text--center` (removed duplicate from `place-modals.css`, canonical in `base.css`). The remaining cross-file duplicate-selector warnings have intentionally-different rule bodies (e.g., `.crc-modal-header` in `media-modals.css` and `control-center.css` are two distinct modal-header styles that share a class name) and aren't safe to merge — those stay.
- **Internal: docs/developer/automated-review-notes.md** updated with the description-requirement that applies to ALL inline directives (enables too, not just disables — surfaced by the v0.22.35 scan) plus the vendored-library findings for the 9 dynamic `<script>` element creations flagged in v0.22.36 (all benign polyfill code in `core-js` via `jspdf` → `canvg`, `jspdf` itself, and `leaflet-distortableimage`'s webpack chunk loader).

### Fixed

- **Internal: resolved 5 stylelint duplicate-declaration warnings** in `styles/control-center.css`. `.crc-field-list code` had four duplicate properties (`padding`, `background`, `border-radius`, `font-size`) from an earlier-draft / later-edit overlap; cascade-aware merge keeps the final values plus the missing `font-family`. `.cr-progress-bar-container` had three same-value duplicates (`height`, `background`, `border-radius`); removed.

## [0.22.36] - 2026-05-13

A same-day follow-up to v0.22.35 that resolves the new scan error category surfaced after v0.22.35's release plus completes the recursive orphan sweep that v0.22.35's dead-code removal missed. The Community automated review against v0.22.35 reported 125 `Unexpected undescribed directive comment` errors — one per EOF `eslint-enable` that v0.22.35 added without a `-- reason` description (the line-1 disables had reasons, the new enables didn't). Each enable now carries `-- Match scope of file-level disable at top.` In parallel, the v0.22.35 deletion of thirteen `_*`-prefixed dormant helpers was a directed cleanup that didn't iterate over the orphan cascade; this release runs the cascade to fixed-point through five layers, removing ~40 newly-orphaned imports plus eleven downstream functions whose only callers were among the deleted helpers. Net: −999 lines across `people-tab.ts` and `trees-tab.ts`. Stability window unchanged — fourteenth patch in the v0.22.22-anchored window; all internal hygiene, none user-facing, none reset. **883 tests passing across 68 suites**.

### Changed

- **Internal: added `-- reason` descriptions to all 125 EOF `eslint-enable` directives**: Obsidian's Community automated review against v0.22.35 surfaced a new gating error category — `Unexpected undescribed directive comment` — at 125 sites, one per file-level disable's matching EOF enable. The line-1 disable directives already carried descriptions (e.g., `-- Obsidian API returns any-typed surfaces ...`); only the v0.22.35-added EOF enables lacked them. Each enable now reads `/* eslint-enable <rules> -- Match scope of file-level disable at top. */`. No runtime change; clears the entire 125-site error category from the scan surface.

### Removed

- **Internal: recursive orphan sweep of dead helpers and now-unused imports in `src/ui/people-tab.ts` and `src/trees/ui/trees-tab.ts`**: v0.22.35 deleted thirteen `_*`-prefixed dormant helpers but did not sweep for the cascade of imports and downstream functions whose only callers were the removed helpers. The Community scan against v0.22.35 flagged ~20 `defined but never used` warnings, which surfaced 5 transitive layers of dead code on iteration: imports (`Setting`, `TFile`, `normalizePath`, `CanvasGenerator`, `CanvasGenerationOptions`, `TreeOptions`, `ensureFolderExists`, `formatCanvasJson`, `LayoutType`, `StyleOverrides`, `Notice`, `Modal`, `getErrorMessage`, `getLogger`, `PersonPickerModal`, `ReferenceNumberingService`, `NumberingSystem`, `RecentImportInfo`, `GedcomImporterV2`, `GedcomImportOptionsV2`, `FilenameFormat`, `FilenameFormatOptions`, `GedcomDataV2`, `GedcomImportProgressModal`, `analyzeGedcomQuality`, `applyQualityFixes`, `GedcomQualityPreviewModal`, `TFolder`, `createPersonNote`, `PersonData`, `renderPersonTimeline`, `renderFamilyTimeline`, `isPersonNote`, `SOURCE_QUALITY_LABELS`, `FACT_KEY_TO_SOURCED_PROPERTY`, `SourcePickerModal`, `FactKey`, `PersonResearchCoverage`, `FactCoverageStatus`, `FACT_KEY_LABELS`, `CreateProofModal`, `PROOF_STATUS_LABELS`, `PROOF_CONFIDENCE_LABELS`, `ProofSummaryNote`), module-level `logger` constants where applicable, and downstream functions (`handleGedcomImportV2`, `executeGedcomImport`, `promptAssignReferenceNumbersAfterImport`, `selectRootPersonForNumbering`, `renderFactCoverageDetails`, `renderProofSummariesSection`, `renderProofCard`, `deleteProofSummary`, `getFactStatusIcon`, `calculateQualityCounts`, `addSourceCitationForFact`). Net: −999 lines across two files. Build / tests / lint all clean after final sweep.

## [0.22.35] - 2026-05-13

A focused scan-cleanup release that fully resolves the seven gating errors surfaced by the v0.22.34 Community automated review. Five errors come from `@typescript-eslint/no-unsafe-*` file-level disables missing matching `eslint-enable` directives — each disable now pairs with a trimmed EOF enable. Two errors come from `obsidianmd/ui/sentence-case` disables that the scanner forbids entirely (the rule is in a "Required" wrapper set the eslint-plugin itself doesn't enforce — only the scanner does); historical scan inspection confirmed the rule's underlying violations have never appeared in the warning surface, so the disables added in v0.22.34 were a strict regression and have been removed. Minor TypeScript hygiene also lands: two unnecessary non-null assertions dropped, a no-op destructure refactored, thirteen long-dormant `_*`-prefixed helper functions deleted along with their orphan support. Scanner-architecture findings captured for future reference at [`docs/developer/automated-review-notes.md`](docs/developer/automated-review-notes.md) — including the empirical evidence that the scanner does NOT read project `eslint.config.mjs` and the checklist of upstream `DEFAULT_BRANDS` / `DEFAULT_ACRONYMS` PRs to file. Stability window unchanged — this is the thirteenth patch in the v0.22.22-anchored window; all internal hygiene, none user-facing, none reset. **883 tests passing across 68 suites**.

### Changed

- **Internal: paired the `@typescript-eslint/no-unsafe-*` file-level disables with matching `eslint-enable` directives across 125 source files**: Obsidian's Community automated review against v0.22.34 flagged the unpaired file-level disables as five gating errors (one per rule: `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `no-unsafe-argument`). Each file now emits a matching `/* eslint-enable <rules> */` at EOF; ESLint's `--fix` had previously trimmed the line-1 disable to only the rules that fire in that file, and the end-of-file enable mirrors that trimmed list rule-for-rule. No runtime impact.
- **Internal: removed all 101 file-level `obsidianmd/ui/sentence-case` disables**: the v0.22.34 scan flagged these as gating errors with `Disabling 'obsidianmd/ui/sentence-case' is not allowed` (the scanner enforces a "Required" rule wrapper around the eslint-plugin) plus the matching `Requires 'eslint-enable' directive` error. Inspection of historical scans confirmed the rule's underlying violations have never appeared in the warning surface; the file-level disables added in v0.22.34's CSS hygiene sweep were a strict regression — converting zero scan warnings into 204 scan errors. The disables are removed; the eslint config keeps the rule at `warn` locally with our `brands` / `acronyms` lists for clean local lint. Scanner-architecture findings captured in [`docs/developer/automated-review-notes.md`](docs/developer/automated-review-notes.md) along with a checklist of upstream `DEFAULT_BRANDS` / `DEFAULT_ACRONYMS` PRs to file (Charted Roots, GEDCOM, ODT, Gramps, Mapbox, MapTiler, Stamen, Leaflet, etc.).

### Fixed

- **Internal: dropped two unnecessary non-null assertions** flagged by the v0.22.34 scan: `target!` inside the `flyTo` setTimeout callback in `src/maps/map-view.ts` (TypeScript already narrows `target` to non-null inside the surrounding `if (target)` guard) and `calendarSelect!.value` inside the `change` listener in `src/events/ui/place-timeline.ts` (same narrowing). Sites use the bare expressions now.
- **Internal: replaced a no-op destructure** in `src/reports/services/sources-by-role-generator.ts` where the loop was destructuring `[_crId, entries]` from `bySource.entries()` and discarding the key. The loop now iterates `bySource.values()` directly.

### Removed

- **Internal: removed thirteen abandoned `_*`-prefixed helper functions across `src/ui/people-tab.ts`, `src/trees/ui/trees-tab.ts`, and `src/ui/views/family-chart-export.ts`**: long-dormant draft helpers prefixed with leading underscore to mark them as intentionally unused (`_renderPersonTimelineBadge`, `_renderFamilyTimelineBadge`, `_renderPersonResearchCoverageBadge`, `_createPersonNoteAction`, `_createRelationshipField`, `_setupUnlinkButton`, `_extractPersonInfoFromFile`, `_clearRelationshipFields`, `_syncImportedRelationships`, `_handleTreeGeneration`, `_showGedcomAnalysis`, `_handleGedcomExport`, `_inlineStyles`). The v0.22.34 scan flagged each as `defined but never used` warnings. None had external callers; the leading-underscore convention was being used as a "preserve for later" marker rather than the lint-rule convention (intentionally-passed-but-unused locals). Removal also drops orphaned support (`RelationshipField` interface in `trees-tab.ts`, `RelationshipField` interface + `fatherField` / `motherField` / `spouseField` state + UI element handles + `updateHelpText` helper in `people-tab.ts`, `PersonPickerModal` and `PersonInfo` imports). The stale comment in `trees-tab.ts` that referenced the removed `syncImportedRelationships` function is rewritten to describe the design rationale without naming the missing function.

## [0.22.34] - 2026-05-13

A scan-cleanup release that fixes the v0.22.33 styles.css error-level blocker AND drops the bulk of the Community automated review's warning surface. One user-facing fix lands alongside: the **Map view Fullscreen toolbar button now shows an icon** — a long-standing visual gap from when the feature first shipped (the `leaflet-fullscreen` package's bundled CSS references a sprite PNG that was never included in our `styles.css`; replaced with inline SVG icons drawn via CSS mask). Everything else in this release is internal hygiene aimed at the scan: `!important` reduced 102 → 11 across stylesheets via specificity refactor; 21 duplicate-selector pairs consolidated (−189 lines net); `:has()` perf warnings silenced via per-line catch-all disables; 6-digit hex format normalized; `no-unsafe-*` typing and sentence-case audits silenced via file-level disable conventions covering 146 source files and 102 source files respectively; and partial-browser-support warnings annotated. Stability window unchanged — this is the twelfth patch in the v0.22.22-anchored window; all `medium-priority` or lower, none reset. **883 tests passing across 68 suites**.

### Fixed

- **Map view's Fullscreen toolbar button now shows an icon** (long-standing visual gap): the `leaflet-fullscreen` package's own CSS references an external `fullscreen.png` sprite that was never bundled into our shipped `styles.css`, so the button has been a blank square since the feature first shipped. Replaced with inline SVG icons (Lucide-style maximize / minimize) drawn via CSS `mask`, so they adapt to the current text color (theme-aware in light and dark themes). Both the default (maximize) and active (`leaflet-fullscreen-on`) states are covered.

### Changed

- **Internal: 6 partial-browser-support CSS warning sites annotated with `stylelint-disable-next-line`**: Obsidian's Community automated review flags `text-indent`, `text-decoration-style`, `text-underline-offset`, `text-decoration-color`, `column-width` / `column-gap` / `column-rule`, and `break-inside` as partially supported in Obsidian 1.11.4. These all work in Obsidian's Electron runtime in practice. Per-line catch-all disables (no rule name) silence the warning without the unknown-rule-name risk targeted disables would carry.
- **Internal: 21 duplicate-selector pairs consolidated across 5 stylesheets**: each pair of rules with the same selector was either (a) a subset/identical pair where the earlier rule contributed nothing observable to the cascade — deleted; or (b) a real merge where the earlier rule had unique properties that needed to fold into the later rule before deletion. Net: −95 lines across `control-center.css`, `cleanup-wizard.css`, `import-export-wizard.css`, `profile-view.css`, `tree-output.css`. One case (`.crc-section-header` margin shorthand interacting with a later `margin-top` override) required a manual cascade-aware merge to preserve the effective top-margin of 12px. Visual surfaces verified unchanged in dev-vault (guide tab, section headers, cleanup wizard, import/export wizard, tree wizard, person profile).
- **Internal: 46 `:has()` selector sites annotated with per-line `stylelint-disable-next-line` comments**: Obsidian's Community automated review flags `:has()` with an "Avoid `:has()` — significant performance issues due to broad selector invalidation" warning. Our uses are all narrowly scoped (modal sizing keyed on inner content classes, e.g., `.modal:has(.crc-media-picker-modal)`), where the perf concern doesn't apply. Per-line catch-all disables (no rule name) suppress the warning without risk of "unknown rule" feedback from scanner-side rule-name mismatches.
- **Internal: `!important` declarations reduced 102 → 11 across stylesheets via specificity refactor**: most existing `!important` uses were defensive against expected style competition rather than necessary inline-style overrides. Replaced with targeted specificity: leaflet override rules in `map-view.css` now prefix selectors with `.cr-map-view` (already-present container class) for the +1 specificity boost; family-chart `.card` resets use the natural 3-class selector specificity (`.cr-fcv-chart-container.card-style-circle .card`); chained-class modifiers (e.g., `.cr-map-btn.cr-map-btn-active`) replace bare modifier overrides. The remaining 11 declarations are: 4 in leaflet's own defensive core CSS (bundled with the plugin to protect against host-page `max-width` constraints on tiles and SVG); 3 `.cr-hidden` / `.crc-hidden` utility classes (the canonical use of `!important` — utility-class display toggle must win over everything); and 4 documented cases where an external library sets inline styles at runtime (family-chart's card-cont opacity during animations, etc.). Also flipped `background:` to `background-color:` across all leaflet override rules so the shorthand no longer wipes background-images that the leaflet plugins use for built-in icons (this was the root cause of the long-standing blank Fullscreen button on map views).
- **Internal: `obsidianmd/ui/sentence-case` silenced per-file across 102 source files**: the Batch B remainder from v0.22.30 (436 sites deferred for per-site review due to false-positive risk on quoted button labels, month names, proper-noun section paths, and example strings) addressed via file-level `eslint-disable` comments with reason annotations. Real Title Case violations (e.g., `Media Manager` → `Media manager`) can still be caught during code review or a future audit pass; the suppression is for the rule misfires that dominated the remaining surface. Drops the 436-warning category from both the local lint and the Community scan.
- **Internal: `@typescript-eslint/no-unsafe-*` rules surfaced at `warn` and silenced per-file across 146 source/test files**: previously these 5 rules (`no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `no-unsafe-argument`) were turned off in the local config because they flag legitimate `any`-from-Obsidian-API patterns (frontmatter access, file caches, plugin state). Obsidian's Community automated review runs them anyway with strict defaults — accounting for ~600+ flagged sites in the v0.22.33 scan and the largest single category of warnings. Pivoted to file-level `eslint-disable` comments with a reason annotation; ESLint's `--fix` then trimmed each comment to only the rules that actually fire in that file. Local rules flipped from `off` to `warn` so the disables are honored locally too (and any future un-disabled file surfaces warnings). Net effect: ~2,855 local no-unsafe warnings → 0; same suppression applies to the Community scan via the source-level comments.
- **Internal: stylelint `color-hex-length` flipped from `short` to `long`; all hex colors normalized to 6-digit form across the component stylesheets**: Obsidian's Community automated review against v0.22.33 flagged ~50 short-hex sites as `Use the full 6-digit hex format for consistency`. The community-scan preference is opposite to our prior local config (which preferred the shorter 3-digit form where possible). Aligning with the community preference: 9 component stylesheets normalized via `npm run lint:css:fix`; 8 additional sites in `styles/leaflet-distortable.css` (sheltered by its file-level `stylelint-disable`) converted manually. No runtime behavior change. Drops a ~50-warning category from the scan surface.
- **Internal: `build-css.js` now strips all `stylelint-*` directives from the bundled `styles.css`**: the directives (`/* stylelint-disable */`, `/* stylelint-enable */`, `/* stylelint-disable-next-line */`, `/* stylelint-disable-line */`) are source-level hints for the per-file lint pass and serve no purpose in the concatenated shipped bundle. Obsidian's Community automated review against v0.22.33 flagged `styles.css:90` as `no rules have been disabled` even though that line is a plain comment in our bundled output and our local stylelint passes cleanly with all `--report-*-disables` flags — most likely a scanner-side stylelint version or config difference we can't reproduce. Stripping the directives at bundle time eliminates the entire category of "needless disable" / "no rules disabled" / "rule already disabled" false-positive risk going forward, regardless of what scanner runs against the file. Source files keep their directives untouched; per-file `npm run lint:css` is unchanged. The earlier defensive auto-inject of `stylelint-enable` between concatenated components (v0.22.32 + v0.22.33) is also retired — the strip pass makes it unnecessary.

## [0.22.33] - 2026-05-12

A single-fix follow-up to v0.22.32. The Community automated scan against v0.22.32 surfaced one error-level finding (`no rules have been disabled` at `styles.css:90`) — the inverse failure of the directive-bleed bug v0.22.32 was meant to fix. The defensive `build-css.js` auto-inject from v0.22.32 was unconditional, so components without a file-level `stylelint-disable` got an orphan enable at their boundary. The auto-inject is now conditional on the disable/enable balance in each component. Everything else from the v0.22.32 scan was warning-tier (the `>5MB main.js` Sync Standard issue, the false-positive `setInterval` + network suspicion, the `Unsafe any` long tail, the `chalk` dev-dependency note); both attestation Recommendations now show as verified passes. Stability window unchanged — this is the eleventh patch in the v0.22.22-anchored window. **883 tests passing across 68 suites**.

### Fixed

- **Bundled `styles.css` no longer emits a `no rules have been disabled` stylelint error** ([surfaced by Obsidian's Community automated review against v0.22.32](https://github.com/banisterious/obsidian-charted-roots/issues/)): v0.22.32's defensive `build-css.js` change auto-injected `/* stylelint-enable */` between every concatenated component. The injection was unconditional — components with no file-level `stylelint-disable` got an orphan enable at their boundary, which stylelint flags as needless. The first such site was line 90 (the variables.css boundary), and it was the only error-level finding gating Community Plugins admission. The auto-inject is now conditional: it emits an enable only when a component has more file-level disables than enables. Line-scoped variants (`stylelint-disable-next-line`, `stylelint-disable-line`) don't count toward the balance since they don't bleed across components.

## [0.22.32] - 2026-05-12

A patch that addresses the single error-level finding from Obsidian's new Community automated review (the bundled `styles.css` "selector-class-pattern has already been disabled" stylelint failure that was gating admission) plus a follow-up fix for [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) where the v0.22.31 era-abbreviation rendering missed the Timeline flat-list path (the most common render). The rest of the patch is internal alignment with `eslint-plugin-obsidianmd` 0.3.0, which launched the same day as the new review platform and changed several rules — a timer-recommendation reversal (`activeWindow.X` -> `window.X`) covering ~152 sites plus eight previously-unflagged `requestAnimationFrame` calls, full clearance of the local `no-unused-vars` and `prefer-active-doc` warning categories (~234 sites combined), 46 `createElementNS svg` -> `createSvg` migrations, ten lazy `require()` -> top-level imports, and a defensive `build-css.js` change so future component CSS files can't bleed `stylelint-disable` directives across the bundle. Also new: a GitHub Actions release workflow (`.github/workflows/release.yml`) that runs the gate set, attests build provenance on `main.js` / `manifest.json` / `styles.css` via `actions/attest-build-provenance@v2`, and creates a draft release on tag push — addressing the two missing-attestation Recommendations from the same scan. Stability window unchanged — this is the tenth patch in the v0.22.22-anchored window; all `medium-priority` or lower, none reset. **883 tests passing across 68 suites** (was 880 / 68; +3 from the [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) follow-up's composition tests).

### Changed

- **Internal: `obsidianmd/ui/sentence-case` rule demoted from `error` to `warn` pending the Batch B per-site audit**: the 436 remaining sentence-case findings (deferred since v0.22.30 due to false-positive risk on quoted button labels, month names, and proper-noun section headings) were blocking the new CI release workflow's lint gate. Demoted to `warn` so releases pass the gate while still surfacing the work in `npm run lint` output; flip back to `error` when the per-site audit closes. No source-code changes.
- **Internal: DejaVu Sans Mono font source files now tracked in the repo so CI builds can regenerate `vfs_fonts_all.ts`**: the two `.ttf` files (`DejaVuSansMono.ttf` + `DejaVuSansMono-Oblique.ttf`, ~592 KB combined) were previously gitignored as build inputs and only present in the local working tree. CI checks out clean and the `build:fonts` step couldn't find them, failing the workflow. Tracked now under a `!`-prefixed `.gitignore` exception so other scratch `.ttf` files (RobotoMono variants) stay ignored. DejaVu Sans Mono is permissively licensed (Bitstream Vera + DejaVu derivatives); the fonts have always shipped baked into `main.js` via `vfs_fonts_all.ts` regardless of whether the sources were tracked.
- **Internal: eight stylelint rules demoted from error to warning + autofix sweep across 22 component stylesheets**: the new CI lint:css gate surfaced a 536-error stylelint baseline carried as a deferred audit (same shape as the sentence-case backlog). Eight rules covering the bulk of the findings were demoted to warning severity in `.stylelintrc.json` (`selector-class-pattern`, `color-function-notation`, `alpha-value-notation`, `shorthand-property-no-redundant-values`, `no-duplicate-selectors`, `hue-degree-notation`, `declaration-block-no-shorthand-property-overrides`, `declaration-block-no-duplicate-properties`). The remaining 8 stylistic errors (comment / declaration / custom-property empty-line-before, color-hex-length shortening) were cleared via `npm run lint:css:fix` across 22 source stylesheets — purely whitespace and short-hex normalizations, no functional CSS changes. Local lint:css now reports zero errors, 175 warnings (down from 536); CI passes. Flip the rules back to error per-rule as the audit closes.
- **New: tag-triggered release workflow with build-provenance attestations** (`.github/workflows/release.yml`): pushing a SemVer tag (plain like `0.22.32` or pre-release like `0.22.32-rc1`) now triggers a GitHub Actions workflow that runs `npm run lint` + `npm run lint:css` + `npm test` + `npm run build`, then calls `actions/attest-build-provenance@v2` against `main.js` / `manifest.json` / `styles.css`, then creates a **draft** GitHub Release titled `Charted Roots vX.Y.Z` with the three assets attached. The author pastes the audited release-description body via the web UI and clicks Publish — preserves the editorial gate (no auto-generated commit-message notes). End users and Obsidian's automated scanners can verify any release asset with `gh attestation verify main.js --repo banisterious/obsidian-charted-roots`. Addresses the two missing-attestation Recommendations from the Community-review scan. `.nvmrc` pins Node 20.20.2 so CI and local dev stay aligned (Node 20.11+ required since the `eslint-plugin-obsidianmd` 0.2.x upgrade). See [docs/developer/release-procedure.md](docs/developer/release-procedure.md) for the full CI-assisted release flow.
- **Internal: 46 `createElementNS('http://www.w3.org/2000/svg', ...)` calls migrated to `createSvg(...)`**: Obsidian provides a `createSvg(tagName)` global that returns a typed `SVGElement` with the correct namespace. Mechanical sed replacement across map / migration-diagram / family-chart / tree-preview / report renderers. Doesn't change runtime behavior; aligns with the Obsidian-recommended idiom flagged by the new community automated review.
- **Internal: cleared the entire `@typescript-eslint/no-unused-vars` warning category** (~71 sites). Two-part fix: (a) extended the rule's ignore patterns to honor the leading-underscore convention for variables, function declarations, caught errors, and destructured array elements (matching what was already configured for arguments) — this absorbs ~37 intentionally-dormant helpers in `people-tab.ts` and elsewhere already prefixed with `_`; (b) prefixed the remaining 31 unused trailing function arguments with `_` (mostly callback-signature contracts where this implementation doesn't consume the trailing arg) so the rule sees them as deliberately unused. Three genuinely unused imports/locals (in `person-picker.ts`, `relationship-calculator.test.ts`, and `relationship-loader.test.ts`) were removed. The local lint baseline now reports zero warnings — only the 436 deferred sentence-case errors remain.
- **Internal: bare `document.X` references migrated to `activeDocument.X` for popout window compatibility**: 163 sites across the codebase (`document.body`, `document.createElement`, `document.querySelector`, `document.createElementNS`, etc.) now use Obsidian's `activeDocument` ambient global. When a Charted Roots view is moved to an Obsidian popout window, `document` resolves to the LOAD-TIME window's document — meaning DOM lookups would target the wrong document. `activeDocument` resolves to whichever window is currently focused, matching `activeWindow` semantics. Mechanical sed migration; preserves member-access patterns like `node.ownerDocument` and `this.document` unchanged.
- **Internal: ten lazy `require()` call sites converted to top-level ES imports**: Obsidian's new automated review (via `@typescript-eslint/no-require-imports`, surfaced after the 0.3.0 upgrade) flags CommonJS-style `require()` calls. Across `place-lookup-service` / `map-view` / `family-chart-view` / `context-menus` / `calendar-view` / `events-section`, ten lazy-require sites were inherited from earlier code that needed circular-dep workarounds. None of the called modules actually import the calling file in current code, so all ten convert cleanly to top-level `import` declarations.
- **Internal: `eslint-plugin-obsidianmd` upgraded 0.2.9 -> 0.3.0 + timer rule reversal applied**: 0.3.0 launched the same day as the new Obsidian Community automated review platform (2026-05-12) and the community scan against v0.22.31 surfaced the consequences. Two rule changes affecting source code:
  - `prefer-active-window-timers` was renamed to `prefer-window-timers`, and its recommendation **inverted** — it now wants `window.setTimeout` instead of `activeWindow.setTimeout`. v0.22.31's Phase 2 work had migrated ~152 sites the other direction (bare `setTimeout` -> `activeWindow.setTimeout`). Reverted those plus eight previously-unflagged `requestAnimationFrame` calls (also covered by the renamed rule) to the new `window.X` form across the codebase.
  - `prefer-create-el` was removed from the recommended ruleset entirely. Our local config no longer references it.
  - The vitest setup file now polyfills `window` instead of `activeWindow` so tests still resolve to the host's `setTimeout` / `setInterval` / `requestAnimationFrame` in the Node runtime.
- **Internal: `build-css.js` now auto-injects `/* stylelint-enable */` between each concatenated component**, so any future component file's `/* stylelint-disable */` directive is automatically scoped to that component's section of the bundle and can't bleed into subsequent components. Defensive follow-up to the matching per-file fix below.

### Fixed

- **Bundled `styles.css` no longer emits a `selector-class-pattern has already been disabled` stylelint error**: two CSS source files (`styles/leaflet-distortable.css` and `styles/timeline-callouts.css`) opened with `/* stylelint-disable */` directives and had no matching `/* stylelint-enable */` at the bottom. When `build-css.js` concatenated them into `styles.css`, the disables bled into subsequent components — the leaflet-distortable blanket disable bled into timeline-callouts, then timeline-callouts' specific disable for `selector-class-pattern` triggered the "already disabled" error. Surfaced by Obsidian's new Community automated review against v0.22.31 as the only error-level finding (and the gating signal for admission). Added matching `/* stylelint-enable */` to both files so each component's disable scope is properly contained.
- **Era abbreviations now render in the dynamic Timeline flat-list view** ([#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) follow-up): the v0.22.31 fix routed two of the three Timeline render paths through the new `formatYearForDisplay` helper (the `{year}` template substitution and the sectioned default render), but missed the flat-list rendering in `renderTimelineList` — the most common rendering path. That site still used `entry.year` directly, which is `extractYear` output (era-stripped). Same one-line fix as the other two sites: route through `formatYearForDisplay(entry.date, context.person?.universe)`. Three new composition tests verify that the `formatDate -> formatYearForDisplay` chain preserves the era prefix for year-only inputs and falls through to digit-only output for standard ISO dates. Surfaced by [@doctorwodka](https://github.com/doctorwodka) during v0.22.31 verification.

## [0.22.31] - 2026-05-12

A patch built around a five-issue fictional-date reporter cluster from [@doctorwodka](https://github.com/doctorwodka) and [@DigitalDreamn](https://github.com/DigitalDreamn) ([#562](https://github.com/banisterious/obsidian-charted-roots/issues/562), [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563), [#564](https://github.com/banisterious/obsidian-charted-roots/issues/564), [#565](https://github.com/banisterious/obsidian-charted-roots/issues/565), [#566](https://github.com/banisterious/obsidian-charted-roots/issues/566)) — all five share the same structural shape (parallel date-handling helpers that were fictional-blind where `DateService` is fictional-aware), surfaced within 24 hours of each other and fixed as five small per-issue commits. Alongside the cluster, this release closes the first round of findings from Obsidian's new Community automated review platform (launched 2026-05-12) — five error-level findings were addressed in source, the long-standing 152-warning `prefer-active-window-timers` backlog was cleared in three commits, and an opportunistic onload-defer pass shaves sub-100ms from plugin load time. **One user-facing rename**: the categorized command launcher introduced in [#290](https://github.com/banisterious/obsidian-charted-roots/issues/290) is now "Open quick actions" (id `open-quick-actions`) instead of "Open command menu" — existing keybindings will need re-binding under Settings -> Hotkeys. Stability window unchanged — this is the ninth patch in the v0.22.22-anchored window; all `medium-priority` or lower, none reset. **880 tests passing across 68 suites** (was 834 / 63; +46 regressions from the fictional-date cluster).

### Fixed

- **Create Person and post-import relationship sync now honor folder filter, inclusive-parents, and DNA-tracking settings**: two paths in `people-tab.ts` (the Create Person modal action and the post-GEDCOM-import relationship sync sweep) constructed `BidirectionalLinker` directly with `new BidirectionalLinker(app)`, bypassing the `setFolderFilter` / `setEnableInclusiveParents` / `setEnableDnaTracking` setup that every other call site applies. Users with any of those toggles configured would see different sync behavior depending on whether the linker ran from these two entry points versus the file-modification or context-menu paths. Both sites now route through the `getBidirectionalLinker()` lazy singleton extracted in v0.22.31's Phase 0, so all bidirectional-sync entry points share the same configured linker instance.
- **Era abbreviations now render alongside years in dynamic Timeline and Relationship blocks** ([#563](https://github.com/banisterious/obsidian-charted-roots/issues/563)): both blocks computed the displayed birth/death year via `DynamicContentService.extractYear`, which recognizes BCE/BC + AD/CE suffixes but silently strips every other era prefix. For inputs like `BBY 1045`, `ABY 25`, or any custom-era abbreviation (`EF 30`, `DE 1265`), only the digit run survived — so users with fictional date systems saw bare numbers where era-qualified labels used to appear (regression visible from late April per the reporter). Added a new `formatYearForDisplay(dateStr, universe?)` helper that consults `DateService.parseDate` first — when the parser recognizes a fictional era, returns the canonical era-aware display (e.g., `BBY 1045`); otherwise falls through to the existing digit-only `extractYear` output. The relationships-block birth/death rendering and the timeline-block default-render plus format-string `{year}` substitution now route through the new helper. `extractYear` itself stays unchanged so the sort and margin-filter call sites that depend on its digit-only output keep working. Eleven new tests cover the BBY/ABY/EF/DE shapes, year-first inputs, post-#562 approximate fictional dates, ISO fallback, and the `extractYear` regression fence. Reporter [@DigitalDreamn](https://github.com/DigitalDreamn).
- **Timeline-block age annotations no longer silently render era-stripped values for multi-era inputs** ([#565](https://github.com/banisterious/obsidian-charted-roots/issues/565)): `computeEventAge` consults `DateService.calculateAge` first (correct canonical-year math) but had a fallback for inputs DateService couldn't parse — and the fallback called `extractYear` then `parseInt`, which strips fictional-era prefixes and subtracts era-local digits. For inputs like `EF 30` and `DE 100` (with EF epoch -100 and DE epoch 0), the fallback returned 70 (era-local difference) instead of the canonical 170 — exactly the era epoch off, matching the reporter's "100 years off" symptom. The fix bails out of the fallback (returns undefined) when either input matches a fictional-date shape (letter run adjacent to digit run, either order), so the timeline annotation is omitted rather than rendered with a silently wrong number. Real-world ISO inputs still flow through the fallback unchanged. Ten new tests fence the `looksLikeFictionalDate` heuristic across attached / detached / no-prefix / GEDCOM-qualifier overlap cases. Reporter [@doctorwodka](https://github.com/doctorwodka).
- **Multi-era events now sort by canonical year on Compute sort order** ([#564](https://github.com/banisterious/obsidian-charted-roots/issues/564)): the events tab's "Compute sort order" button (which assigns `sort_order` values based on date + before/after constraints) used a local `compareDates` helper whose year-extraction regex only matched a leading `-?\d+`. For multi-era inputs like `EF 10` and `DE 5`, both yielded 0 and the comparator fell to alphabetical `localeCompare` — putting `EF 10` (canonical -90 with EF epoch -100) AFTER `DE 5` (canonical 5 with DE epoch 0). The helper now consults `DateService.parseDate(date, universe)` first when a service is available, using canonical-year math across eras; falls back to the existing leading-integer regex for inputs neither side can parse, so standard ISO and negative-year dates behave exactly as before. The events tab's call site now passes `plugin.getDateService()` through. Seven new tests cover the headline scenario (`EF 10` before `DE 5`), boundary equivalence (`EF 100` = `DE 0`), mixed-era array sorting, ISO date preservation, and the documented fallback behavior. Reporter [@doctorwodka](https://github.com/doctorwodka).
- **Cross-era multi-era characters no longer silently drop from Longevity Analysis and Marriage Patterns** ([#566](https://github.com/banisterious/obsidian-charted-roots/issues/566)): same root cause as [#562](https://github.com/banisterious/obsidian-charted-roots/issues/562) — the approximation-marker strip. The reporter's character had birth `EF 30ish` and death `DE 1265-02-09`; before the #562 fix, `EF 30ish` failed every fictional parser pattern AND the final `\b(\d+)\b` extractYear fallback (because "30" has no trailing word boundary against the "ish" letters), so `extractYear` returned null, `calculateLifespan` returned null, and the `age !== null` filter dropped the character without surfacing anything. With #562's strip, `EF 30ish` parses cleanly as canonical year -70 and the character reappears in both Statistics views with the correct 1335-year lifespan. A regression-fence test in `tests/statistics-multi-era-ish-regression.test.ts` simulates the reporter's exact two-state scenario to prevent recurrence. Reporter [@doctorwodka](https://github.com/doctorwodka).
- **Fictional dates with trailing "ish" or "?" no longer drop off the Timeline Density chart** ([#562](https://github.com/banisterious/obsidian-charted-roots/issues/562)): the fictional-date parser's four regex patterns were anchored `^...$` and rejected any input carrying a trailing approximation marker. With multiple eras configured, a date like `EF 10ish` failed every fictional pattern, fell through to the standard fallback (which only accepts 4-digit years), and ended up matched by the final digit-run regex in `extractYear` — placing the event in the wrong decade (era-local `10s` instead of canonical `-90s` for an EF era with epoch `-100`). The reporter perceived this as "wholly removed" because the decade they expected no longer held it. Added a `stripApproximationMarkers` helper at the top of `FictionalDateParser` that strips trailing `ish` (attached or detached), trailing `?`, and prefix markers (`about`, `abt`, `circa`, `ca`, `c.`, `approx`, `approximately`, `~`) before pattern matching, and sets `isApproximate: true` on the returned `ParsedFictionalDate`. The flag propagates through `DateService.parseDate` so downstream consumers can render approximation indicators. The standard-date `isApproximateDate` recognizer is also extended to catch trailing `ish` (digit-anchored, so it doesn't false-positive on words like "Polish") and `?`. Twelve new tests cover the headline cases (`EF 10ish`, `EF 10 ish`, `10ish EF`, `EF 10?`, `circa EF 10`, `ca EF 10`, `approx EF 10`), the non-approximate controls, and the `DateService` integration. Reporter [@doctorwodka](https://github.com/doctorwodka).

### Changed

- **Command renamed: "Open command menu" -> "Open quick actions"** (heads-up — affects keybindings): the categorized command launcher introduced in [#290](https://github.com/banisterious/obsidian-charted-roots/issues/290) was registered with the id `open-command-menu` and the name "Open command menu". The new Obsidian Community automated review flags both of those for using the word "command" in command identifiers and names (the rule's intent is to avoid commands that are themselves named "command X" or pointing at "the command palette"). The launcher's name and id are now `Open quick actions` / `open-quick-actions`, and the Control Center dashboard tile is now labeled "Quick actions" instead of "Command Menu". The modal's behavior is unchanged — it's still the same searchable categorized launcher for plugin commands. **If you had a custom hotkey bound to the previous "Open command menu" command**, the binding will go inactive after the update; rebind it under "Settings -> Hotkeys" by searching for "Open quick actions".
- **Internal: cleared the new Obsidian Community automated review errors**: the new community review system rejects several patterns the previous review accepted, including disabling certain `obsidianmd/*` rules and disabling `@typescript-eslint/no-explicit-any`. Five error-level findings cleared in this release:
  - The heat-layer z-index on custom-image maps now routes through a Leaflet custom pane (`cr-heat-pane` in [map-view.css](styles/map-view.css)) instead of an inline `style.zIndex` assignment in [map-controller.ts](src/maps/map-controller.ts).
  - The Quick Actions command (above) no longer relies on disable directives for its id/name.
  - The citation-note frontmatter parser in [citation-note-service.ts](src/sources/services/citation-note-service.ts) types its parameter as `Record<string, unknown>` (with explicit casts per access) instead of `Record<string, any>` behind a disable directive.
- **Internal: vault listener registration and relationship-history init deferred off the plugin-load critical path**: `EventService.setupVaultListeners`, `WebClipperService.startWatching`, and the three file modification / delete / Universe rename handler registrations are now wired up inside an `onLayoutReady` callback rather than directly during `onload`, matching the existing pattern used by the Style Settings trigger and the version-upgrade check. `initializeRelationshipHistory` is now fire-and-forget (`void` instead of `await`) — consumers already null-guard `plugin.relationshipHistory` so the sub-second startup window before history initializes is safe. Together these shave sub-100ms from plugin onload time per Phase 1's measurements, with no behavioral change for users (file events fired during the brief gap between onload-finish and layout-ready don't happen in real usage since the vault has just opened).
- **Internal: removed unused `@typescript-eslint/require-await` disable directives**: forty-four `// eslint-disable-next-line @typescript-eslint/require-await` comments were added in v0.22.30's Batch A under the assumption the rule was active. The 0.2.9 recommended config actually sets that rule to `off`, so the disables were no-ops — flagged here as `Unused eslint-disable directive` warnings. All forty-four removed (across the fourteen view classes plus place-lookup-service / map-view / universe-maps-processor / migration-notice-view).
- **Internal: `UniverseService` consumers now use the `createUniverseService` factory**: eleven call sites (main.ts plus report-wizard, statistics-tab, universe-entities-processor, control-center, universes-tab ×2, edit-universe-modal, universe-wizard, bulk-operations, context-menu-helpers) constructed `UniverseService` via direct `new` calls, while the existing `createUniverseService(plugin)` factory had no external callers. Consolidated all of them onto the factory so future plugin-scoped setup (folder filter, settings injection, lifecycle wiring) only has to land in one place — mirroring the `createFamilyGraphService` / `createPlaceGraphService` shape used elsewhere in the codebase. Behaviorally a no-op today since the factory body is just `new UniverseService(plugin)`.
- **Internal: remaining bare timer calls (sleep helpers, render deferrals, metadata-cache waits) now run on the active window**: blanket migration of every remaining `setTimeout` / `setInterval` / `clearTimeout` / `clearInterval` call across `src/` and `main.ts` from the global form to `activeWindow.*`. Covers async sleep helpers (`await new Promise(resolve => activeWindow.setTimeout(resolve, ms))`), one-shot render deferrals on the map and family-chart views, post-write metadata-cache settling delays (manage-members modal, place-picker create flow), the cache-utils `waitForCacheRefresh` watchdog, and the file-modification debouncing inside web-clipper / event-service. Together with the two earlier commits this closes the entire 152-warning `prefer-active-window-timers` backlog from the 0.2.9 ESLint upgrade. Vitest now ships an `activeWindow = globalThis` setup so source code that runs under both real Obsidian and the unit-test runtime resolves the global to the host's `setTimeout` in tests.
- **Internal: modal focus-deferral and UI-yield timers now run on the active window**: twelve picker / wizard / quick-create modals deferred input focus or UI-render-yield via the global `setTimeout` rather than `activeWindow.setTimeout`. Same pop-out window risk as the view-attached debounce migration above — a modal opened in a pop-out would have its focus timer running on the main window's queue. Migrated sixteen sites across person-picker, place-picker, source-picker, event-picker, media-picker, media-gallery, unlinked-media, manage-members, book-builder, family-creation-wizard, create-map-wizard, and quick-create-person modals (focus deferrals, post-open UI-yield deferrals, and one click-handler attach deferral). Sixteen `prefer-active-window-timers` warnings cleared; cache-settling and metadata-cache-wait patterns left for the sleep-helper follow-up.
- **Internal: view-attached refresh-debounce timers now run on the active window**: fourteen `setTimeout`/`clearTimeout` calls across fourteen view classes (events, sources, organizations, universes, collections, data quality, places, people, statistics, statistics-service, relationships, profile, calendar, family chart) used the global `setTimeout` rather than `activeWindow.setTimeout`. When a view was moved to an Obsidian pop-out window, the global timer ran on the main window's queue and could fire after the pop-out's lifecycle had ended (or fail to fire if the main window was the one being closed). Migrated all refresh-debounce, sync-debounce, and persist-debounce timers to `activeWindow.setTimeout` / `activeWindow.clearTimeout` so they're bound to the view's actual window. Forty-six `prefer-active-window-timers` warnings cleared; one-shot deferred init and sleep-helper patterns left for follow-up commits.
- **Internal: snapshot-init `setTimeout` is now cancelled on plugin unload**: the bidirectional-linker snapshot initialization was deferred by 1 second via a bare `setTimeout` to avoid blocking plugin startup. If the user disabled Charted Roots within that window, the callback fired against a disposed plugin instance. The timer handle is now stored on the plugin and cleared in `onunload`.
- **Internal: `BidirectionalLinker` construction consolidated into `getBidirectionalLinker()` lazy singleton**: two call sites in `main.ts` were constructing the linker inline with identical setup code (folder filter + inclusive-parents toggle + DNA-tracking toggle). Extracted to a `getBidirectionalLinker()` method matching the existing `getSourceService` / `getProofSummaryService` pattern. Both call sites now read from the singleton; settings-staleness risk is unchanged from the prior `if (!this.bidirectionalLinker)` guards.
- **Internal: `collection_name` -> `group_name` migration scan now short-circuits after it completes**: the one-shot frontmatter migration that copies `collection_name` to `group_name` iterated every markdown file in the vault on every plugin load, with no flag to skip the scan once the work was done. On large vaults (5,000+ notes) the scan itself was a noticeable startup cost even after the migration had nothing left to do. Added a `migratedCollectionNameToGroupName` settings flag (defaulting to `false`); the flag flips to `true` after the first successful scan, and subsequent loads short-circuit immediately. Mirrors the existing `migratedToChartedRoots` flag pattern. A partial-failure path leaves the flag unset so the next load retries.

## [0.22.30] - 2026-05-11

A patch built around two reporter-surfaced fixes and the housekeeping side of the recent ESLint plugin upgrade. [#559](https://github.com/banisterious/obsidian-charted-roots/issues/559) closes a wikilink-redirection case where a duplicate cr_id outside the Charted Roots folder structure (typically a File-Recovery copy or stray archive) could shadow the canonical note and produce piped wikilinks pointing at the wrong file — surfaced by [@DigitalDreamn](https://github.com/DigitalDreamn) via [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537). [#560](https://github.com/banisterious/obsidian-charted-roots/issues/560) closes a fictional-vault decade-bucketing bug on Longevity Analysis and Timeline Density where negative years were rounded toward negative infinity (`-25` ended up in the `-30s`) — surfaced by [@doctorwodka](https://github.com/doctorwodka). Alongside, a security-hardening pass on the Family Chart circle-card render path (surfaced by the new `no-unsanitized/property` ESLint rule) replaces an `outerHTML` template-literal with DOM-API construction so user-supplied person names can't be interpreted as HTML, and an internal cleanup pass clears the 76 non-sentence-case real-signal errors that emerged from the `eslint-plugin-obsidianmd` 0.2.9 upgrade plus a first chunk of the sentence-case rebaseline (587 → 435). Stability window unchanged — this is the eighth patch in the v0.22.22-anchored window; all `medium-priority` or lower, none reset. **834 tests passing across 63 suites** (was 828 / 62; +6 regressions covering the negative-year decade bucketing in `extractDecade`).

### Fixed

- **Family Chart circle-card rendering no longer interprets person names as HTML** (security hardening): the circle-card update path replaced a card's `outerHTML` with a template-literal-built string that interpolated user-supplied person names, alt names, birth/death dates, and avatar paths directly. A name containing HTML characters (`<`, `>`, `&`) would render as markup or, in the worst case for a deliberately crafted name, execute as a script tag. Rebuilt via DOM APIs (`createDiv` / `createEl` / `appendText` / `card.replaceWith`) so all interpolated content is text-only. No behavioral change for well-formed data; malicious or accidentally HTML-bearing frontmatter values now render literally as text. Surfaced by the `no-unsanitized/property` rule in the ESLint plugin upgrade.
- **Negative-year decade bucketing on Longevity Analysis and Timeline Density** ([#560](https://github.com/banisterious/obsidian-charted-roots/issues/560)): both views computed decade buckets via `Math.floor(year / 10) * 10`, which rounds toward negative infinity. Positive years worked fine (1985 → 1980s), but negative years that didn't end in 0 were pushed into the next-more-negative decade — `-25` ended up in the `-30s`, `-21` in the `-30s`, etc. Reporter had a cluster of characters with `-21` to `-27` birth years labelled as `-30s`. Switched to `Math.trunc`, which rounds toward zero and matches BCE/BBY convention where the "-20s decade" spans years -20 through -29. Years in the open range `(-10, 10)` all bucket to `0s` (a `|| 0` guard collapses JavaScript's `-0` to `+0` so the label doesn't render as `-0s`). Fixed at all five sites (the shared `extractDecade` helper, three Timeline Density tallies for events / births / deaths, and the by-decade grouping in timeline-generator reports). Six unit tests cover positive years, the headline negative cases, exact-multiple-of-10 boundaries, the cross-zero `0s` collapse, and large negative years. Reported by [@doctorwodka](https://github.com/doctorwodka).
- **Wikilink writer no longer redirects to duplicate non-Charted-Roots files when a cr_id collision exists outside the plugin's folder structure** ([#559](https://github.com/banisterious/obsidian-charted-roots/issues/559)): the writer's cr_id-resolution helper (`findFileByCrId`, with three near-identical copies in `person-note-writer.ts`, `organization-service.ts`, and `place-note-writer.ts`) iterated every markdown file in the vault and returned the first match for a given cr_id. When two files shared a cr_id — typically a canonical Charted Roots note plus a duplicate that lived outside the CR folder structure (recovered via Obsidian's File Recovery, copied during troubleshooting, archived elsewhere) — the resolver could return the outside-CR duplicate, and the writer would silently emit a path-aliased wikilink (`[[Outside-CR-basename|Display Name]]`) pointing at the wrong file. The cr_id stayed correct in paired `<field>_id` arrays, so the underlying data wasn't lost — but renderers that filter on `cr_type` (the Family block, the Edit Person children list, etc.) dropped the entry because the resolved file wasn't a CR note, making it appear "missing." The fix consolidates the three copies into a shared `findCrNoteByCrId(app, crId, expectedCrType)` helper at `src/utils/cr-id-resolver.ts` that requires the candidate file to carry the expected `cr_type` in its frontmatter, so a non-CR duplicate can't shadow the canonical note. Each existing call site already knew which entity type it was writing — the person variant always wants `'person'`, the org variant `'organization'`, the place variant `'place'` — so threading the type through is a mechanical change with no caller-side logic shift. A follow-up pass caught a fourth in-file caller in `place-note-writer.ts`'s simpler `createWikilink` helper that the initial sweep missed (esbuild bundles without typecheck, so the stale `findFileByCrId` reference compiled through the production build but would have thrown at runtime if the parent-place picker fed it a cr_id); it now routes through the shared helper too. Six unit tests cover the new helper (basic match, no-match, cross-type rejection, outside-CR duplicate skip — the headline case, no-frontmatter skip, multiple-match-returns-first). Surfaced by [@DigitalDreamn](https://github.com/DigitalDreamn) via [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) — her vault had a canonical `Jodni Naberrie-Waldin.md` inside Charted Roots alongside a recovered `Jodni Naberrie.md` outside, both sharing Jodni's cr_id; after a save on a parent's note, Jodni's wikilink got redirected to the outside-CR file and she appeared missing from the parent's Family block until the duplicate was deleted.

### Changed

- **Internal: ESLint baseline cleared of all real-signal errors after the 0.2.9 plugin upgrade**: the `eslint-plugin-obsidianmd` 0.1.9 → 0.2.9 upgrade re-baselined the lint surface from 8197 problems down to 1592 (653 errors, 939 warnings), introducing new typed rules and refining existing ones. This patch clears the 76 non-sentence-case errors that surfaced — fire-and-forget `reloadCache` calls now use the `void` prefix (26 sites), an `asScalarString` helper guards frontmatter values from accidentally stringifying as `[object Object]` (11 sites), redundant type-union constituents are simplified (5 sites), template-literal expressions on `never` exhaustive-check fallbacks are wrapped via `String()` (4 sites), `instanceof SVGElement` checks are switched to Obsidian's cross-window-safe `.instanceOf(SVGElement)` (3 sites), unnecessary non-null assertions and type casts are dropped (6 sites), regex `no-useless-escape` cleanups (2 sites), single-hit cleanups (3 sites), and dev-dep adjustments (replaced `builtin-modules` with Node's native `node:module`, declared `leaflet-toolbar` as a direct dependency, allowlisted `chalk` as a build-script-only acceptable dependency, added a tests-files override permitting TFile-shaped stubs in mocks). Lint errors after this pass: 587 (all sentence-case; see next entry). Tests: 834 / 63.
- **Internal: sentence-case lint baseline reduced 587 → 435** via two waves: (1) expanded the `eslint.config.mjs` brand/acronym lists with DNA-testing services (AncestryDNA, 23andMe, MyHeritage), Obsidian's Web Clipper feature, A→Z/Z→A sort indicators, lowercase frontmatter keys preserved as literal-key form (`cr_id`, `cr_type`, `birth_place`, `death_place`, `burial_place`, `blood_brother`, `family_bible`, `secret_society`, `tax_record`), and date-format placeholders (`YYYY-MM-DD`, `DD MMM YYYY`, `DD MMM`, `MMM YYYY`, `YYYY`, `MMM`, `DD`) — clearing 124 false positives; (2) bulk-fixed 34 sites across 22 files where a registered brand (Markdown, Family Chart, Middle-earth, Charted Roots, Westeros, GEDCOM, Obsidian, OpenStreetMap, Nominatim, DNA) appeared lowercase inside flagged UI strings — clearing 28 errors. The remaining 435 sentence-case errors mix real Title Case → sentence case fixes with rule misfires on quoted button-label references and proper-noun lowercasing, and need per-site review; deferred.

## [0.22.29] - 2026-05-10

A patch built around a proactive bidirectional-sync audit and one same-day surfaced bug. The audit catalogued every field family currently doing hand-wired bidi sync (spouse + indexed-spouse + marriage details, bio children/parents, adoptive parents + adopted children, step parents + step children, org membership, custom relationships, and the `partners` alias) and the three directions each needs (A→B, B→A, edge cases — rename, delete, format conversion). Seven concrete gaps surfaced across the five disjoint sync locations; six landed in this patch as discrete fixes (the seventh — delete-cleanup for non-person entities — is filed as [#557](https://github.com/banisterious/obsidian-charted-roots/issues/557) for post-1.0). The audit-derived fixes are [#552](https://github.com/banisterious/obsidian-charted-roots/issues/552) (org-side member smart-wikilink rewrap), [#553](https://github.com/banisterious/obsidian-charted-roots/issues/553) (Add Relationship modal canonical-form writes), [#554](https://github.com/banisterious/obsidian-charted-roots/issues/554) (step-child reverse-direction sync), [#555](https://github.com/banisterious/obsidian-charted-roots/issues/555) (rename rewrap generalized to all relationship-array fields), and [#556](https://github.com/banisterious/obsidian-charted-roots/issues/556) (bidi-linker honors the `partners` alias for spouse). Sibling fix [#551](https://github.com/banisterious/obsidian-charted-roots/issues/551) ports the descriptive-field cluster (`alt_name`, `pronouns`, `religion`, `caste`) into the property aliases UI — surfaced via an upstream report and implemented alongside the audit bundle. [#558](https://github.com/banisterious/obsidian-charted-roots/issues/558) was surfaced during #554 dev-vault verification: a self-referential `stepmother` test edit revealed that five of the bidi-linker's eight sync functions were missing the self-reference guard their bio analogues have, so a typo or test edit pointed at the same note silently propagated into multiple frontmatter writes. Five matching guards added; bio paths were already covered. Stability window unchanged — this is the seventh patch in the v0.22.22-anchored window (after v0.22.23 through v0.22.28); all `medium-priority` or lower, none reset. **822 tests passing across 61 suites** (was 818 / 61; +4 regressions covering the new `partners` alias paths in `isSpouseInFrontmatter`). Reporters: @grg3wong via the upstream `donatso/family-chart` repo (#551); @DigitalDreamn via the v0.22.25 #542 verification thread which inspired the audit's framing (no direct #552–#558 reports).

### Fixed

- **Self-referential step, adoptive, adopted-child, and DNA-match entries no longer auto-propagate to the same note** ([#558](https://github.com/banisterious/obsidian-charted-roots/issues/558)): the bidirectional linker had self-reference guards on three sync functions (bio parent-to-child, bio child-to-parent, spouse) but was missing them on five others (step-parent-to-child, step-child-to-parent, adoptive-parent-to-child, adopted-child-to-parent, DNA-match). When a user pointed any of those kinship fields at their own note (typically a typo when picking a target, but reproducible by hand-editing), the linker silently wrote the paired field back onto the same note — turning a single self-referential typo into multiple self-referential frontmatter fields. The five missing guards now match the bio analogues: each function returns early with a warning log when the resolved target file equals the source file. Bio kinship and spouse paths were already covered. No behavioral change for non-self-referential paths. Surfaced by @banisterious's #554 dev-vault verification — a self-referential `stepmother` test edit caused the linker to write `step_child` back onto the same note.
- **Person rename now rewraps wikilinks in every relationship-array field, including indexed spouse, adopted/step children, gender-neutral parents, and custom relationships** ([#555](https://github.com/banisterious/obsidian-charted-roots/issues/555)): `RelationshipManager.updateRelationshipWikilinks` (invoked from the Edit Person rename path) had hardcoded twin lists of which fields to check — `father` / `mother` / `stepfather` / `stepmother` / `adoptive_father` / `adoptive_mother` / `parents` / `spouse` / `children`. Anything outside that list silently kept its pre-rename wikilink form: indexed `spouse1` through `spouse10`, `adopted_child` and `step_child` arrays on parents' notes, the gender-neutral `adoptive_parent` array, and any custom relationship field (`mentor`, `godparent`, `employer`, etc.). Obsidian's native wikilink rewrite still updated the `[[OldName]]` → `[[NewName]]` portion, so links didn't break — but the canonical-form rewrap with basename-ambiguity disambiguation ([#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)) didn't fire on those fields, leaving them as bare `[[NewName]]` even when they should hold `[[Folder/NewName|NewName]]`. The fix replaces both hardcoded lists (the `_id` check used to detect references, and the wikilink-field list used to drive rewrites) with a generic frontmatter scan: every `<field>_id` key is checked against the renamed person's cr_id, and every paired `<field>` wikilink gets rewrapped when the `_id` match succeeds. The id-match guard skips non-person `_id` fields naturally (place / event / source ids won't match a person's cr_id). Future relationship types added to the data model are covered automatically without needing to update this code. Surfaced by the bidirectional-sync audit (#552–#557); previously masked by the [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) self-heal pass, which normalizes through `createSmartWikilink` on the next save of each affected note.
- **Step-child reverse direction now syncs: parent's `step_child` populates child's `stepfather` / `stepmother`** ([#554](https://github.com/banisterious/obsidian-charted-roots/issues/554)): the bidirectional linker handled the step-relationship sync **one direction only** — when a child had `stepfather: [[Parent]]`, the parent's `step_child` array got the child added (via `syncStepParentChild`). The reverse direction was missing: adding `step_child: [[Child]]` directly on the parent's note (via Edit Person or by hand) left the child's `stepfather` / `stepmother` empty. This was asymmetric with the `adopted_child` analogue, which has always been bidirectional — adding `adopted_child: [[Child]]` on the parent runs `syncAdoptedChildToParent` and writes `adoptive_father` / `adoptive_mother` on the child based on the parent's sex. New `syncStepChildToParent` method modeled on the adopted-child shape closes the gap; the dispatch loop in `syncRelationships` now iterates `step_child` alongside `adopted_child`. Field selection is sex-driven (`stepfather` for male parents, `stepmother` for female parents); the sync skips silently when sex is unknown because there is no gender-neutral `step_parent` array to fall back to. Surfaced by the bidirectional-sync audit (#552–#557).
- **Bidirectional sync, deletion detection, and dedup now honor the `partners` alias for `spouse`** ([#556](https://github.com/banisterious/obsidian-charted-roots/issues/556)): the property-alias system registers `partners` as a canonical spouse-equivalent name for users who prefer that term, and the family graph honors the alias for reads. The bidirectional linker did not — it read `frontmatter.spouse` directly across every internal site, so a user who had switched their canonical to `partners` got none of the spouse-side behavior: no reciprocal write to the partner's note, no marriage-detail mirroring ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481)), no spouse-format preservation, and the deletion-detection guard ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423)) treated every save as a phantom removal cascade. Four sites now fall back to `partners` when `spouse` is absent: the sync-side read, the deletion-detection comparison, the snapshot capture for the next deletion comparison, and the dedup check in `addBidirectionalSpouseLink`. The `removeSpouseLink` unlink path also sweeps `partners` / `partners_id` so removals complete on partners-using targets. `isSpouseInFrontmatter` extended to scan `partners` alongside `spouse` and the indexed `spouseN` slots; covered by four new regression tests. Note: write-side alias respect (the linker writing `partners*` instead of `spouse*` onto a target who prefers that term) is a deeper-scope follow-up, deferred until it surfaces in user reports — current behavior writes `spouse*` regardless of the target's preference, which is asymmetric but not broken. Surfaced by the bidirectional-sync audit (#552–#557).
- **Add Relationship modal: source and reciprocal writes now use canonical-form wikilinks** ([#553](https://github.com/banisterious/obsidian-charted-roots/issues/553)): the Add Relationship modal writes the chosen relationship onto the source person's note and — for symmetric types like `twin` / `friend` ([#419](https://github.com/banisterious/obsidian-charted-roots/issues/419)) — mirrors it onto the target's note. Both writes used raw `[[basename]]` wikilinks, bypassing `createSmartWikilink` and so missing the basename-ambiguity disambiguation that the rest of the writer surface has been doing since [#540](https://github.com/banisterious/obsidian-charted-roots/issues/540). In vaults with two people sharing a basename across folders, the custom-relationship wikilink could resolve to the wrong file on save. Both sites now route through `createSmartWikilink`, producing the canonical `[[Folder/Name|Name]]` form when needed. Same shape as the [#552](https://github.com/banisterious/obsidian-charted-roots/issues/552) members-list fix; surfaced by the same bidirectional-sync audit.
- **Organization member list now writes canonical-form wikilinks with basename-ambiguity disambiguation** ([#552](https://github.com/banisterious/obsidian-charted-roots/issues/552)): when the person-side membership flow mirrored a change back to the organization's `members` / `members_id` arrays (the v0.22.25 #541 fix that made person-side adds reach the org's frontmatter), the org-side write used a raw `[[basename]]` wikilink instead of routing through `createSmartWikilink`. Vaults with two members sharing the same basename in different folders (e.g., two `John Smith` notes in `Folder A/` and `Folder B/`) collapsed to indistinguishable `[[John Smith]]` entries in the org's `members` array — the org's properties pane then resolved to whichever file Obsidian picked first, not necessarily the actual member. Same shape as the writer-side gap that [#549](https://github.com/banisterious/obsidian-charted-roots/issues/549) closed for Edit Organization and Edit Event modals; the org-side `syncMembersToOrg` now produces the canonical `[[Folder/Name|Name]]` form via the shared helper. Surfaced by the bidirectional-sync audit (#552–#557).
- **Property aliases UI now lists `alt_name`, `pronouns`, `religion`, and `caste`** ([#551](https://github.com/banisterious/obsidian-charted-roots/issues/551)): Settings → Properties → "Property and value configuration" → Person properties was missing the descriptive-field cluster from the start (the fields shipped throughout the rest of the plugin via #346 / #347 / #348 / #349 / #351 + #374 + #101 but were never registered in `PERSON_PROPERTY_METADATA`). Users with custom YAML key names for these properties can now map them through the settings UI rather than being forced to rename the frontmatter keys in their notes. Surfaced via @grg3wong's report on the upstream `donatso/family-chart` repo. Person-side `title` deferred — the `title` canonical is already used by events and sources, and the alias-storage layer doesn't currently scope canonicals by category, so closing the person-title gap cleanly needs either a rename or a small storage refactor (left for a separate change if it surfaces in user reports).

## [0.22.28] - 2026-05-10

A focused patch closing the remaining display-layer gaps in the wikilink-input cluster and adding property-based fuzz coverage to catch the next variant proactively. Three issues land together because they share the same `extractDisplayLabel` / fuzz-corpus pattern: [#543](https://github.com/banisterious/obsidian-charted-roots/issues/543) was re-opened from `released-testing` after @DigitalDreamn's verification surfaced a spouse-field render path that the original v0.22.25 fix missed (Father / Mother displayed clean while the indexed-spouse multi-select still showed raw `Charted Roots/People/Rebecca Wilkin|Rebecca Wilkin` form); [#549](https://github.com/banisterious/obsidian-charted-roots/issues/549) extends the same fix shape to the Edit Organization and Edit Event modals, with companion writer-side rewrap so edits to the editable free-text fields don't lose the wikilink shape on save (`updateOrganization` now wraps `parent_org` and `seat` via `createSmartWikilink`; `updateEvent` switched from `formatWikilink` to `createSmartWikilink` for `place` and `timeline`); [#548](https://github.com/banisterious/obsidian-charted-roots/issues/548) extends the existing `createSmartWikilink` fuzz suite (which landed inline between v0.22.24 and v0.22.25) to three additional helpers — `extractDisplayLabel`, `getCanonicalLinktext`, and the org/event variants of `createSmartWikilink` — so the next variant in the input-contract cluster is caught by tests rather than by a reporter. The corpus build surfaced a small robustness gap in `extractDisplayLabel`: bracket-wrapped inputs with internal whitespace (e.g., `[[ Errol Naberrie ]]`) preserved the leading/trailing whitespace; closed with a final `.trim()` at the end of the helper. Stability window unchanged — this is the sixth patch in the v0.22.22-anchored window (after v0.22.23, v0.22.24, v0.22.25, v0.22.26, v0.22.27); all `low-priority` or defensive coverage; none reset. **818 tests passing across 61 suites** (was 739 / 58). Reporter: @DigitalDreamn for #543 and the screenshot that pinned the spouse-field gap.

### Fixed

- **Edit Person modal: Spouse field and marriage location now display cleanly** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543) follow-up): the v0.22.25 fix added `extractDisplayLabel` to the relationship-field and place-field renderers in the Edit Person modal, but the indexed-spouse render path (`renderSpouseItem`) used a different code site that read `spouse.name` directly without the cleanup. @DigitalDreamn's screenshot showed the gap exactly: Father / Mother displayed clean (`Xander Wyndurri`, `Suzé Satirné-Wyndurri`) while the Spouse field still showed `Charted Roots/People/Rebecca Wilkin|Rebecca Wilkin`. Same fix shape — apply the helper at the spouse name span, the remove-button aria-label, and the readonly marriage-location input (the placeGraph branch). Free-text fallback for marriage location keeps the raw value so edits preserve the underlying wikilink shape. Underlying `spouse.name` and `spouse.marriageLocation` stay raw on disk; the writer re-canonicalizes on save. Required reopening #543 from `released-testing` because the original fix had been incomplete in implementation.
- **Edit Organization and Edit Event modals: display-layer coverage for piped wikilinks** ([#549](https://github.com/banisterious/obsidian-charted-roots/issues/549)): same shape as #543 applied to four additional sites — Edit Organization's `parent_org` and `seat` fields, Edit Event's `place` field (already picker-driven, readonly) and `timeline` field. Three of the four are user-typed free-text inputs where applying the display-cleanup alone would have caused edits to lose the wikilink shape on save (the user would see `Jedi Order` and edit it, the writer would store `Jedi Order` raw without brackets, breaking the link). The fix routes `updateOrganization`'s `parent_org` and `seat` writes through `createSmartWikilink` and switches `updateEvent`'s `place` and `timeline` writes from `formatWikilink` to `createSmartWikilink` (both helpers are idempotent when the input is already canonical, but `createSmartWikilink` additionally collapses pipe/path stems and re-resolves disambiguation, so edited cleaned values get the canonical wikilink form on save). The Edit Event place field was already readonly + picker-driven, so the cleanup there is purely cosmetic; the other three needed the writer-side rewrap as the load-bearing piece.

### Changed

- **Internal: `extractDisplayLabel` now trims its final output** ([#548](https://github.com/banisterious/obsidian-charted-roots/issues/548) fuzz finding): a property-based corpus added during the fuzz expansion (see below) caught a robustness gap — bracket-wrapped inputs with internal whitespace (e.g., a typed-by-hand `[[ Errol Naberrie ]]` in frontmatter) returned ` Errol Naberrie ` with the surrounding spaces preserved because neither the pipe nor the slash branch fired their inner trim. Adding a final `.trim()` to the helper closes the gap; idempotent since the helper already trimmed at entry. Real-world impact small (most frontmatter doesn't carry whitespace inside brackets), but the fix is one line and the property is easy to assert.
- **Internal: property-based fuzz coverage extended to four additional input-contract helpers** ([#548](https://github.com/banisterious/obsidian-charted-roots/issues/548)): the existing `createSmartWikilink` (person-note-writer variant) fuzz suite that landed between v0.22.24 and v0.22.25 — covering bare basenames, pre-formatted wikilinks, pipe-form residue, path-form residue, and combined-corruption shapes — now has parallel suites for `extractDisplayLabel` (45 tests in `tests/extract-display-label.test.ts`), `getCanonicalLinktext` (19 tests in new `tests/get-canonical-linktext.test.ts` covering vault-state shapes — unique basenames, ambiguous basenames, deeply nested paths, special characters), the organization-side `createSmartWikilink` variant (18 tests in new `tests/organization-smart-wikilink.test.ts` — same input-shape + vault-state matrix as the person variant), and the event-service `createSmartWikilink` variant (17 tests in new `tests/event-smart-wikilink.test.ts` — different fuzz dimension since this variant assumes clean inputs and disambiguates via explicit `basename`/`file` parameters; corpus exercises parameter combinations + special characters across vault states). Total +79 tests across the four helpers. When the next variant in the wikilink-input cluster surfaces, the fix flow becomes "add the new shape to the corpus and the existing assertions catch it" — the same payoff the original `createSmartWikilink` corpus has been delivering.



A preventative patch built around the cache-race audit filed as [#547](https://github.com/banisterious/obsidian-charted-roots/issues/547). Four cache-holding services — `FamilyGraphService`, `PlaceGraphService`, `OrganizationService`, `UniverseService` — shared a write-then-read race where each service's `reloadCache()` ran before Obsidian's metadata cache caught up to the just-written change, silently dropping new entries or holding pre-edit state until something else triggered another reload. `FamilyGraphService` masked the symptom with a 2-second `setTimeout` band-aid in `reloadCache`; the other three had no mitigation at all. This patch routes each writer through a shared `waitForCacheRefresh` helper (originally introduced privately on `MembershipService` for the [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) cache-timing follow-up) that resolves on the next `metadataCache.changed` event for each modified file, with a 500ms timeout fallback. The 2-second sleep on family-graph reloads is gone — batch operations (data-quality cleanups, bidirectional fixes, etc.) now finish ~2 seconds faster per batch. No user-reported bugs closed; this was proactive prevention work during the v0.22.22-anchored stability window. Companion ground-clearing: the `BatchOperationResult` shape was extended with `modifiedFiles: TFile[]` so consumers can thread the touched-file list through to the cache reload, and `place-graph.reloadCache()`'s signature went from synchronous-void to async-with-optional-modified-files (refresh-driven callers continue to work without changes; post-write callers in three modal flows now pass the new file list explicitly). The other half of the audit — external-edit invalidation via per-service `metadataCache.changed` subscription — remains open as a 1.x follow-up under #547; its fix shape requires service-lifetime redesign (each of the four services is instantiated on-demand in many UI paths, so attaching long-lived listeners means either hoisting to plugin-singletons the way [#519](https://github.com/banisterious/obsidian-charted-roots/issues/519) did for `ProofSummaryService` or threading lifecycle management through every consumer) and is better as a scoped change than a continuation of this audit. Stability window unchanged — this is the fifth patch in the 0.22.22-anchored window (after 0.22.23, 0.22.24, 0.22.25, 0.22.26), all medium/low priority, none reset. **739 tests passing across 58 suites** (was 730 / 56). Reporters: N/A — preventative.

### Changed

- **Batch operations on People, Places, and the data-quality wizard finish ~2 seconds faster** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)): `FamilyGraphService.reloadCache` previously slept unconditionally for 2 seconds before re-reading the metadata cache, a fixed-delay band-aid that gave Obsidian's file watcher time to catch up after batch writes. The sleep is now an event-driven wait that resolves as soon as the metadata cache reflects each modified file (typically tens of milliseconds rather than 2 seconds). Refresh-driven flows (e.g., reloading the cache before a read in places where no recent write occurred) skip the wait entirely. The change is invisible at the API level — callers see the same `await reloadCache()` pattern, just without the artificial delay.
- **Internal: cache-race fix applied across `FamilyGraphService`, `PlaceGraphService`, `OrganizationService`, and `UniverseService`** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)): each service's `reloadCache(modifiedFiles?)` now awaits Obsidian's `metadataCache.changed` event for each touched file before rebuilding. Without the wait, a `processFrontMatter` or `vault.create` write followed by an immediate cache reload could read pre-write state — silently dropping new organizations / universes / places from their respective caches, or leaving edited entries showing pre-edit values until something else triggered another reload. The `waitForCacheRefresh` helper that powers the wait was hoisted out of `MembershipService` (where it landed in the [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) cache-timing follow-up) into a shared utility at `src/utils/cache-utils.ts`. The on-demand instantiation pattern across the four services means `metadataCache.changed` subscription for external-edit invalidation (the audit's other half) requires a separate lifecycle redesign — tracked under #547 for 1.x.
- **Internal: `BatchOperationResult` extended with `modifiedFiles: TFile[]`** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)): `DataQualityService`'s batch-operation methods (date normalization, gender normalization, orphan-reference clearing, missing-ID repair, nested-property flattening, legacy-type migration, membership migration, bidirectional-inconsistency fix) now expose the list of files they touched. Consumers in `data-quality-tab.ts` and `data-quality-batch-ops.ts` thread this list through to `familyGraph.reloadCache(modifiedFiles)` so the post-batch cache rebuild waits for Obsidian to index each just-written file.

## [0.22.26] - 2026-05-09

A structural patch built around [#545](https://github.com/banisterious/obsidian-charted-roots/issues/545) (Canvas Family Tree silently dropping adopted children when generated from any ancestor of the adoptive parent) and the architectural pattern it surfaced. Five user-facing fixes ship behind one consolidation: a new `RelationshipQueryService` ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)) that unifies how every consumer walks the family-relationship graph. Pre-#546, each renderer / report / exporter that needed children or parents reimplemented its own walk over `PersonNode` arrays — which meant new relationship types (adopted children in [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) / [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526), gender-neutral parents earlier still) had to be threaded through every consumer independently, with gaps surfacing as user-reported bugs months later. The refactor introduces one canonical API; every consumer now declares which variants it walks via an explicit `include` flag at every call site, making the choice surfaced rather than incidental. Fourteen consumer files migrated; the standalone `sibling-walker` helper module retired (its public API is fully covered by the service). Two of the shipped fixes (family-timeline's silent drop of adopted/step children, GEDCOM-X export's silent drop of gender-neutral parents) were latent gaps the inventory surfaced — pre-#546 they'd have remained invisible until a user happened to hit the exact frontmatter configuration. Stability window unchanged — all five user-facing fixes are `bug` (medium-priority); none reset the gate. Anchor stays at v0.22.22, ~19 days of soak ahead. **730 tests passing across 56 suites** (was 706 / 55). Reporter: @DigitalDreamn for #545 and the step-parent edge case.

### Fixed

- **Canvas Family Tree now renders adopted children when generated from any ancestor of the adoptive parent** ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545)): descendant-direction tree generation was emitting an adoptive-parent edge but never adding the child as a positioned node, so canvas-generator silently dropped the edge when its endpoint position lookup failed. Reproduced by @DigitalDreamn generating Marie or Ben's tree (or a tree from Marie's father — any ancestor of an adoptive parent) and finding that Galen Marek and his bio parents never appeared. The fix has three parts: `buildDescendantTree` now adds adopted children to the tree's `nodes` map alongside the relationship edge; `buildFullTree` now walks `adoptedChildCrIds` from the parent's side (it previously only walked the reverse direction, so the adopted child had to be reachable through some other path before their adoptive parent could be discovered); and the family-chart layout's fallback positioning loop now considers adoptive and step parents when placing nodes the main layout engine missed (previously only bio `fatherCrId` / `motherCrId` were checked). Adopted children's own descendants still don't recurse into the parent's tree by default — preserves the prior intent that adopted children carry their own family line.
- **Step-parent edges now emit regardless of BFS visit order** ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545) thread): in the same investigation thread, @DigitalDreamn flagged that Shmi (Anakin's bio mother, Owen's stepmother) wasn't connected to Owen via a step-parent line in Anakin's full Canvas tree, even though Shmi declared `step_child: [[Owen]]` and Owen declared `stepmother: [[Shmi]]`. Root cause: `buildFullTree`'s step-parent and adoptive-parent branches used `!visited.has(stepX)` as a single guard for both cycle detection AND edge emission. When Shmi was reached via Anakin's bio-mother walk first (visited), then Owen's processing tried to emit the step-parent edge from Shmi to Owen, the visited check blocked the edge entirely. Anakin↔Cliegg worked only because Cliegg happened to be reached via Anakin's stepfather walk first — pure ordering luck. The fix decouples edge emission from cycle-checking: edges emit unconditionally with a separate dedup against existing edges, while the visited set continues to gate whether the parent is queued for further BFS processing. Same decoupling applied to `buildAncestorTree`'s step-parent and adoptive-parent branches.
- **Family timelines now include adopted and step children** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546) inventory): the family-timeline view (visible as a badge on People Tab rows and as the modal in Control Center) was iterating `focalPerson.childrenCrIds` only — silently dropping adopted and step children from the focal person's family-member list. A focal person whose only children were adopted would see a family timeline showing just self and spouse, with no indication that their adopted children had been omitted. Both the events-collection walk and the legend-population walk now route through `RelationshipQueryService.getChildren({ include: 'all' })`. Symmetric for the step-blended case: a focal person whose stepchildren had events would see no timeline badge at all because `totalEvents` came back zero.
- **GEDCOM-X export now includes gender-neutral parent relationships** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546) inventory): the exporter walked `fatherCrId`, `motherCrId`, gender-specific stepfather / stepmother arrays, and gender-specific adoptive parents — but never `parentCrIds` (gender-neutral bio) or `adoptiveParentCrIds` (gender-neutral adoptive). Persons declaring their parents via `parents: [[X]]` rather than `father:` / `mother:` had their parent relationships silently omitted from GEDCOM-X output. Consolidating the seven previous parent-walking branches into one `getParents({ include: 'all' })` call closed both gaps as a side effect.
- **Family-timeline badge member count now includes adopted and step children** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)): `getFamilyTimelineSummary`'s `memberCount` was iterating `childrenCrIds.length` directly, undercounting blended families. The People Tab badge gating uses `memberCount > 1` to decide whether to show the badge; a focal person with a spouse and only-adopted-or-step children would still see the badge (two members from self + spouse), but the tooltip and counts undercounted by the number of non-bio children. Now routes through the unified service to match the events-collection walk migrated alongside it.

### Changed

- **Internal: introduced `RelationshipQueryService` to consolidate family-relationship traversal** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)): pre-existing pattern saw each renderer / report / exporter that needed children or parents reimplement its own walk over `PersonNode` arrays — which left coverage gaps every time the schema added a new relationship variant. Each gap surfaced as a user-reported bug long after the schema change had landed. The new service exposes `getChildren` / `getParents` / `getSiblings` / `getSpouses` / `walkDescendants` / `walkAncestors` with an explicit `include` parameter (`'all' | 'bio' | 'adopted' | 'step'` for children / siblings; `'all' | 'bio' | 'adoptive' | 'step'` for parents). No default — every caller declares the variants it wants, surfacing what was previously incidental about each call site. Returned items carry a `kind` discriminator so consumers can style by relationship type without re-deriving from source. Fourteen consumer files migrated: `family-graph.ts`'s three tree-builders, `family-chart-layout`'s fallback positioning, five report generators (individual-summary, register, descendant-chart, family-group-sheet, collection-overview), `visual-tree-service`, `lineage-tracking`, `duplicate-detection`, the dynamic-content relationships-renderer, `relationship-calculator`'s BFS, `gedcomx-exporter`, `family-timeline`, and `source-summary`. The standalone `sibling-walker` helper module retired entirely; its public API is fully covered by `getSiblings`. Some sites still pending migration (canvas-split, hourglass-layout, timeline-layout, reference-numbering, map-view, book-builder, parts of family-chart-view, parts of profile-view's relationships section, data-quality's orphan-reference detection) are tracked for follow-up under #546's checklist — none represent user-visible bugs, just architectural-consistency cleanup.

## [0.22.25] - 2026-05-08

A focused three-fix patch closing the remaining loose ends from @DigitalDreamn's [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) verification cluster: a UI display gap in the Edit Person modal where wikilinks rendered raw inner content instead of clean labels, a writer-side bypass in the membership flow that meant `membership_orgs` skipped the canonical helper used elsewhere, and a follow-up cache-timing race in the v0.22.24 [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) sync that was writing person N-1's frontmatter when person N was added. Each one is a different symptom of the same underlying theme: code paths that should go through the canonical writer/parser helpers but didn't, surfacing as inconsistencies between what users see and what's stored. Also adds a property-based fuzz test for `createSmartWikilink` that exercises the writer against every input shape we've seen in the wild — defensive coverage so the next variant in the writer-input-contract cluster is caught proactively rather than user-reported. Stability window unchanged — all three fixes are `low-priority` or refinements; none reset the gate. Anchor stays at v0.22.22, ~13 days of soak ahead. **706 tests passing across 55 suites** (was 671 / 54). Reporter: @DigitalDreamn for all three.

### Fixed

- **Edit Person modal now parses wikilinks for display in relationship and place fields** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543)): The "Linked to:" labels and read-only input fields in Edit Person were displaying the raw inner content of wikilinks — `Charted Roots/People/Errol Naberrie|Errol Naberrie` instead of just `Errol Naberrie` — for any relationship or place field whose underlying frontmatter stored a piped or path-form wikilink. Surfaced after [#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)'s path-disambiguation landed: the canonical `[[path|basename]]` form is correct on disk but the modal didn't parse it for display. The fix introduces an `extractDisplayLabel` helper in `src/utils/wikilink-resolver.ts` that mirrors the writer-side stem-collapse pattern — strip brackets, then collapse pipe-form (`basename|alias` → `alias`) and path-form (`path/to/file` → `file`). Applied at the relationship and place field display sites in `create-person-modal.ts`. Underlying `fieldData.name` stays raw so the writer's `createSmartWikilink` can re-canonicalize on save. 20 new tests in `tests/extract-display-label.test.ts` covering bare strings, bracketed wikilinks, residue shapes from earlier bug eras, and round-trip idempotency.
- **Org wikilink writes from the membership flow now go through `createSmartWikilink`** ([#542](https://github.com/banisterious/obsidian-charted-roots/issues/542)): `addMembership` previously pushed `membership.org` into the `membership_orgs` array verbatim, bypassing the input-shape normalization (#537/#538) and basename-ambiguity disambiguation (#540) that every other relationship-field write got. Path-form residue from earlier duplicate-basename eras persisted indefinitely; new entries didn't disambiguate at write time even when basename collisions existed in the vault. The fix routes the new entry through `createSmartWikilink` and adds a full-array rewrite pass on every save, so existing entries normalize alongside the new one — historical residue heals on the next add or remove instead of waiting for that specific entry to be touched. Same pattern applied to `removeMembership` for the surviving entries. Reported by @DigitalDreamn during her [#538](https://github.com/banisterious/obsidian-charted-roots/issues/538) verification sweep, where her organization frontmatter still showed `[[Charted Roots/Organizations/Vessari Order|Vessari Order]]` after the v0.22.24 self-heal cleaned up every other relationship field.
- **Org-side member sync now waits for the metadata cache to refresh before reading person notes** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) follow-up): The v0.22.24 fix triggered `syncMembersToOrg` from person-side `addMembership` / `removeMembership` paths, but the sync re-read the metadata cache to assemble the member list — and Obsidian's `processFrontMatter` updates the file synchronously while the cache update fires asynchronously via the file watcher. Result: `syncMembersToOrg` ran on stale cache and wrote a member list "trailing one update behind" — adding person N propagated person N-1 to the org's frontmatter. @DigitalDreamn caught this with a multi-Jedi test (adding Quinlon Vos wrote Obi-Wan to the Jedi Order, adding Nejaa Halcyon wrote Quinlon, etc.). The fix introduces a `waitForCacheRefresh` helper that listens for the next `metadataCache.changed` event for the modified file (with a 500ms timeout fallback) before triggering the sync, so the cache reflects the just-written change by the time the member list is assembled.

## [0.22.24] - 2026-05-08

A four-fix batch closing relationship-correctness gaps surfaced during @DigitalDreamn's #537 verification sweep. Two extend the v0.22.22 wikilink-writer self-heal pattern: **#538** adds a slash-strip step to the round-trip collapse so file paths captured into wikilink alias slots — typically residue from periods when a vault contained duplicate-basename files outside the plugin's folder structure — heal back to canonical form on the next Edit Person save; **#540** detects basename ambiguity at write time and emits the path-form target with the basename as alias when ambiguity is present, so Obsidian's link resolver lands on the plugin-managed file rather than a non-CR sibling sharing the same basename. **#539** brings the Dynamic Relationship Block's `type: all` mode in line with its wiki contract by rendering custom-typed relationships from the person's `relationships` array — previously the block only rendered family-graph-derived sections regardless of mode. **#541** closes a bidirectional-sync gap where adding a membership from Edit Person → Add Membership left the org's own `members` / `members_id` frontmatter stale (the views worked because they scan person notes, but Obsidian Bases queries against the org saw out-of-date data). Stability window unchanged — all four fixes are `medium-priority` or `low-priority`, none reset the gate. Anchor stays at v0.22.22, ~14 days of soak ahead. **671 tests passing across 54 suites.** Reporter: @DigitalDreamn for all four.

### Fixed

- **Adding a membership from Edit Person now syncs to the organization's `members` frontmatter** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541)): The membership service's `syncMembersToOrg` (which keeps an organization's `members` / `members_id` frontmatter in sync with the person-side `org_membership_*` properties of its members) was only triggered from the org-side "Manage Members" modal. Adding or removing a membership through the Person's Edit Person → Add Membership flow updated the person's frontmatter but didn't propagate the change back to the org. Mostly invisible because the Org Profile View's Members section and the dynamic Members block both assemble member lists by scanning person notes, so the new member appeared correctly in those views — the discrepancy surfaced only in Obsidian Bases queries that read the org's own frontmatter directly. The fix calls a new `syncMembersToOrgIfResolvable` helper at the end of both `addMembership` and `removeMembership`, which best-effort resolves the org's TFile from the cr_id and triggers the existing sync. Skips silently when the org_id doesn't resolve. Reported by @DigitalDreamn while debugging the wikilink-grabby behavior in #538 follow-up — she noticed a newly-added member appeared in the dynamic block + profile pane but not in the org's frontmatter.
- **Dynamic Relationship Block's `type: all` mode now displays custom-typed relationships** ([#539](https://github.com/banisterious/obsidian-charted-roots/issues/539)): The wiki contract for `type: all` was "everything in extended, plus custom-typed relationships declared in the person's relationships frontmatter array (mentor, godparent, ally, etc.)." In practice the renderer ignored the custom-relationships array entirely — only the family-graph-derived sections (parents, spouse, children, siblings) ever rendered. Reported by @DigitalDreamn after configuring Plo Koon as Ahsoka's mentor (using the pre-built `mentor` custom type) and observing he didn't appear in the block at all. The fix fetches the person's relationships via `RelationshipService.getRelationshipsForPerson` plus `getInverseRelationships` (so symmetric / inverse-defined edges from the partner's note are picked up), filters to non-family-mapped types using the same `isOtherTypedRelationship` predicate the Profile View's Other subsection uses, deduplicates symmetric pairs by `type.id + targetCrId`, and groups entries by relationship type name. Each custom type renders as its own section after Siblings, preserving declaration order. Family-graph-derived sections are unchanged. Same predicate used by the Profile View's Other subsection so the two surfaces stay consistent.
- **Wikilink writer now disambiguates when a basename is shared with another vault file** ([#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)): When the plugin emitted `[[basename]]` for a relationship target, Obsidian's link resolver picked a winner without regard to which folder the plugin intended. In vaults containing duplicate basenames — e.g., a plugin-managed person note `Charted Roots/People/Plo Koon.md` AND an unrelated note `Story Arcs/Plo Koon.md` — the resolver could land on the non-CR sibling, producing cross-folder Graph view connections, click-through navigation to the wrong note, and silent rewiring of the wikilink to point at the non-CR file on subsequent saves. The fix uses a new `getCanonicalLinktext` helper in `src/utils/wikilink-resolver.ts` to detect basename ambiguity at write time: when the cr_id-resolved file's basename collides with another vault file, the writer emits the path-form target with the basename as alias (e.g., `[[Charted Roots/People/Plo Koon|Plo Koon]]`) so the resolver lands unambiguously on the intended file while the display text stays clean. Same fix applied to all four sibling copies of the helper (person / place / organization / relationship-manager). Reported by @DigitalDreamn while validating #538 on a vault with documented duplicate-basename conflicts. 4 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering ambiguous + unique cases, name-vs-basename divergence under ambiguity, and round-trip idempotency once disambiguated.
- **File paths in wikilink alias slot now self-heal on save** ([#538](https://github.com/banisterious/obsidian-charted-roots/issues/538)): Some on-disk wikilinks in person-note frontmatter had a file path in the alias slot — e.g., `[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]` instead of the canonical `[[Errol Naberrie]]`. Saving via Edit Person didn't clean them up because the v0.22.22 [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) self-heal only handled pipe-stem accumulation (`[[X|X|X]]` → `[[X]]`), not path-form input. The path-form residue typically arose from periods when a vault contained duplicate-basename files outside the plugin's folder structure: Obsidian's link resolver writes path-disambiguated wikilinks when a basename is ambiguous, those path forms got captured into other notes' frontmatter, and the loader→writer round-trip then preserved the path in the alias slot indefinitely. The fix extends the existing stem-collapse logic with a slash-strip step: after pipe-strip, any path remaining in the candidate display name is collapsed to its trailing segment (the basename). Affected vaults self-heal on the next Edit Person save, just like #537 — the writer regenerates the wikilink in canonical form. Same fix applied to all four sibling copies of the helper (person / place / organization / relationship-manager). Reported by @DigitalDreamn while sweeping her vault for #537 verification, where 12 of 95 person notes had pipe accumulation; a subset of those plus the `birth_place` field had the path-in-alias residue. 6 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering bare path-form, inverted alias-form, deeply-nested paths, and round-trip idempotency.

## [0.22.23] - 2026-05-07

A focused single-fix patch for the original #534 marriage-detail symmetric-write bug. Adding marriage details to a newly-linked spouse via Edit Person now correctly mirrors the indexed companion fields (date / location / status / divorce date) onto the spouse's frontmatter, instead of writing only the flat `spouse:` link and silently dropping the rest. The fix unifies both new-link and re-edit-with-details paths: whenever the source provides marriage details, the target now lands in indexed format regardless of its current shape, so the `spouseN_*` namespace exists to receive the companion fields. Stability window unchanged — still anchored to v0.22.22, ~21 days of soak ahead (#534 is labeled `medium-priority`, not critical/data-loss, so the gate doesn't reset). **661 tests passing across 54 suites.** Reporter: @DigitalDreamn.

### Fixed

- **Marriage details now write symmetrically when linking a new spouse via Edit Person** ([#534](https://github.com/banisterious/obsidian-charted-roots/issues/534)): Linking a spouse and adding marriage details (date / location / status / divorce date) in the same Edit Person save wrote the indexed `spouseN_*` companion fields to the editing person's frontmatter but left the spouse's frontmatter with only the flat `spouse:` link — no marriage details mirrored across. The bidirectional linker's `syncSpouse` correctly preserved the target's existing format on a new link (per #420 Gap B's fix), but for a target with no existing spouse data (or with flat data that didn't qualify for the existing `promoteFlatSpouseToIndexed` path), the format-detector picked flat, the helper wrote a flat `spouse:` entry, and the marriage-detail mirror step short-circuited because `targetIndex` stayed null — flat format has no `spouseN_*` namespace to write companion fields into. The fix forces indexed format on the target whenever the source provides marriage details, regardless of the target's current shape: empty targets get `spouse1` + `spouse1_id` + `spouse1_marriage_*`, and targets with existing flat data for other spouses get a new indexed slot alongside (mixed flat + indexed state, which `detectSpouseTargetFormat` already handles by recognizing 'indexed' on the next sync). Same change unifies both new-link and re-edit-with-details cases. Reported by @DigitalDreamn. New helper `findNextOpenSpouseSlot` extracted to `src/core/spouse-format-detector.ts`; 10 new tests in `tests/spouse-format-detector.test.ts` covering every slot-allocation scenario.

## [0.22.22] - 2026-05-07

A critical data-loss fix anchors this patch and gives the release its headline. **#537** addresses a wikilink alias-accumulation cascade where repeated saves added another `|alias` segment to existing wikilinks until they became unparseable, at which point the bidirectional linker treated the slot as broken and silently dropped it — propagating the loss outward through related notes (children scrubbed from parents, parents scrubbed from kids). The fix makes `createSmartWikilink` idempotent under the loader's stem form and self-heals already-corrupted vaults on the next save, collapsing accumulated triple-pipe entries back to canonical form. The bug was a regression introduced in v0.22.17's #510 work (when the helper was added) and broadened in v0.22.19's #524 extension (cr_id-based file lookup); per the [1.0 stability gate](VERSIONING.md#when-100-ships), a critical/data-loss issue filed during the soak window resets the anchor — **new anchor: v0.22.22; new soak window through ~2026-05-28.** Around #537, four enhancements: **#536** mirrors the Organization Profile View's Members section in the inverse direction with a new Memberships section on the Person Profile View; **#535** groups and sorts that Org Members section by role through a shared helper that the dynamic Members block also consumes; **#523** adds per-image captions to the dynamic media gallery block (right-click affordance, flat-YAML storage, frozen-gallery-aware) for the deep-archive use case; and a follow-up to 0.22.21's **#532** extends the birth-date sort to the Children section so adopted and step children intermix chronologically with bio kids instead of appending. **651 tests passing across 54 suites.** Reporters: @DigitalDreamn (#532 follow-up + #537), @doctorwodka (#535 + #536), @xBlack-Dogx (#523).

### Added

- **Per-image captions in the dynamic media gallery block** ([#523](https://github.com/banisterious/obsidian-charted-roots/issues/523)): Each thumbnail in the `charted-roots-media` block can now carry a short caption — useful for the deep-archive use case where many photos per person each benefit from a brief label like "1978 - Jon Aged 3" rather than a single long-form description in the note body. Captions render beneath the thumbnail in muted text, single-line truncated with full text on hover. Captions persist as a flat `media_captions` parallel string array on the entity note's frontmatter, index-aligned with the `media:` array — same shape as the `<type>_notes` pattern from #530, respecting the project's flat-YAML preference (no nested objects in frontmatter). Empty / missing slots are padded with empty strings to keep indices aligned, and the array reshuffles in lockstep when the user drags to reorder media. Right-click any thumbnail for **Set caption** / **Edit caption** / **Remove caption** options, mirroring the existing crop-region affordance. Frozen-gallery output (`❄️` button) preserves captions by injecting them into the wikilink alias slot (`![[wedding-1925.jpg|Wedding day, June 1925]]`), so the static markdown stays self-contained after the block is replaced. Reported by @xBlack-Dogx via discussion [#521](https://github.com/banisterious/obsidian-charted-roots/discussions/521). 8 new tests in `tests/media-captions.test.ts`.
- **The Person Profile View now shows organization memberships** ([#536](https://github.com/banisterious/obsidian-charted-roots/issues/536)): A new "Memberships" section appears between Relationships and Events on a person's profile when they have at least one organization membership (hidden otherwise). Each row shows the role label, organization link (clickable for entity navigation), date range, a "Current" badge for ongoing memberships, and per-membership notes on a separate line beneath in italic muted text — mirroring the layout of the Other Relationships subsection. Closes the long-standing inverse direction: the Organization Profile View has shown members for a while, but the Person Profile didn't show what organizations they belonged to. Reported by @doctorwodka.

### Changed

- **The Organization Profile View's Members section now groups members by role and sorts within each group** ([#535](https://github.com/banisterious/obsidian-charted-roots/issues/535)): Previously the section rendered as a flat list with `member` array order — readable for small orgs but hard to parse once role distinctions mattered. Members now appear under uppercase role headings (e.g. `FOUNDER`, `BISHOP`) with members sorted by name within each group, and the "MEMBERS" heading covering anyone with no explicit role. Order rules match the existing dynamic Members block (`charted-roots-members`): the org's declared `roles` list pins a sequence at the top, remaining named roles fall through alphabetically, and the no-role group is always last. The shared logic now lives in a single helper (`groupMembersByRole`) consumed by both the dynamic block and the profile section so the two surfaces stay in sync. Reported by @doctorwodka. 10 new tests in `tests/group-members-by-role.test.ts`.

### Fixed

- **Cascade saves no longer accumulate `|alias` segments on existing wikilinks until the entry is silently dropped** ([#537](https://github.com/banisterious/obsidian-charted-roots/issues/537)): `createSmartWikilink` was non-idempotent under the loader's stem form. After a legitimate first write that produced `[[basename|alias]]` (the format used whenever a person's `name` differs from their filename — supported since #524), the loader's `extractName` deliberately preserved the inner `basename|alias` content so the resolver downstream could split on `|` to find the basename stem. The next write fed that piped stem back into `createSmartWikilink`, which compared the file's actual basename against the *piped* input, found them different, and wrapped with another pipe — turning `[[basename|alias]]` into `[[basename|basename|alias]]` and then `[[basename|basename|basename|alias]]` on subsequent saves. Once the wikilink had three or more pipes the bidirectional linker treated the slot as broken and removed it entirely on the next pass, then propagated the loss outward through related notes (children dropped from parents' `children:`, parents scrubbed from kids' `father:` / `mother:`, etc.). The accumulation pattern existed in any vault containing a person whose `name` differs from their filename basename; @DigitalDreamn's vault hit it on every save because a duplicate-file state (a recovered original alongside a renamed current file, both carrying the same `cr_id`) made the basename-vs-alias path fire continuously instead of needing a name-vs-basename person to seed it. The fix collapses `basename|alias` stem input to the trailing alias segment before the basename comparison, making the helper idempotent under round-trip. Already-corrupted vaults self-heal on the next save: triple-pipe entries collapse back to canonical `[[basename|alias]]` or bare `[[name]]` form. Same fix applied to all four sibling copies of the helper (person / place / organization / relationship-manager). Reported by @DigitalDreamn while debugging [#534](https://github.com/banisterious/obsidian-charted-roots/issues/534). 5 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering idempotency, triple-pipe self-heal in both basename-matches and basename-differs scenarios, and trailing-whitespace robustness.
- **Children in the Dynamic Relationship Block are now sorted by birth date** ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532) follow-up): The 0.22.21 sort applied to siblings only — the Children section still iterated `childrenCrIds`, then `adoptedChildCrIds`, then `stepchildrenCrIds` in array order, leaving adopted and step children appended at the end of the list regardless of birth date. @DigitalDreamn caught this during 0.22.21 verification: Galen (adopted) sat below his younger bio siblings on his adoptive parents' page, and Ben's family showed Ben + elder brother out of order on dad's view because dad's `children:` frontmatter array was unsorted. Bio + adopted + step children are now merged and sorted using the same universe-aware `sortByBirthDate` helper (#532) that handles the siblings section, so the Children list reads chronologically regardless of frontmatter order or relationship-type source. Reported by @DigitalDreamn.

## [0.22.21] - 2026-05-06

Three fixes — all surfaced by the same reporter while verifying 0.22.20, all tracing back to display paths that hadn't been updated for the data-shape changes from 0.22.19's and 0.22.20's #525/#526 fix. **#531** and its follow-up resolve adopted children disappearing from bio-side households across the Dynamic Relationship Block (siblings + children sections) and the Dynamic Timeline Block — adopted children now live in `adoptedChildCrIds` rather than `childrenCrIds`, and three rendering paths needed to be taught about that. **#532** addresses the related discovery that the Dynamic Relationship Block had never sorted siblings by birth date — display order had always followed the parent's frontmatter `children:` array order, exposed when a sibling is added out of birth order. Sort now uses `dateService.getCanonicalYear` so descending fictional eras (Star Wars BBY) order correctly alongside Gregorian. **#533** fixes a related routing gap in the Profile view where custom relationship types filed under the "Family" category — like a user-defined `twin` — were dropped between the Other subsection's category filter and the Family subsection's PersonNode-only rendering, leaving them invisible regardless of their notes. Family-category customs now render inline beneath the bio Family groups with their notes from #530. All non-data-loss; stability window stays anchored to 0.22.17 (four patches in). 628 tests passing across 52 suites. Reporter: @DigitalDreamn for all three.

### Fixed

- **Custom relationship types filed under the Family category now render in the Profile view** ([#533](https://github.com/banisterious/obsidian-charted-roots/issues/533)): A custom type configured with `category: family` and no `familyGraphMapping` (e.g. a user-defined `twin`) was silently dropped from the Profile pane. The data persisted to frontmatter correctly (#530 fix verified), but `isOtherRelationship` short-circuited any `category === 'family'` row out of the Other subsection while the Family subsection only knew about PersonNode-derived bio fields (Father / Mother / Spouse / Child / etc.) and had no path to surface custom-typed family rows. Surfaced by @DigitalDreamn during verification of the #530 notes-display work — `vessari_master` (non-family category) rendered correctly with its note, `twin` (Family category) didn't render at all. Family-category custom relationships are now grouped by type name and appended inside the Family subsection beneath the bio groups, with each row using the existing `cr-profile__rel-row` layout and the custom type name as both the group title and the row label. Per-relationship `<type>_notes` (#530) render in italic beneath each row, matching the Other Relationships layout. The relationship count in the section header includes family-customs so the section unhides when the only relationships are custom-typed. Reported by @DigitalDreamn.
- **Adopted children now appear under the Children section of the Dynamic Relationship Block on the adoptive parent's page** ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531) follow-up): Same root-cause shape as the sibling fix, surfaced by @DigitalDreamn during verification of the original #531 patch. The Children section iterated only `childrenCrIds`, which post-#525/#526 contains bio kids only, so adoptive parents saw an empty or partial Children list. The section now also iterates `adoptedChildCrIds` and `stepchildrenCrIds`, with each non-bio source labeled "Adopted child" / "Stepchild" — mirroring the existing parents-side labels ("Adoptive father" / "Stepfather"). Reported by @DigitalDreamn.
- **Siblings in the Dynamic Relationship Block are now sorted by birth date instead of by the parent's `children:` array order** ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532)): The block iterated each parent's `childrenCrIds` and pushed siblings in array order, with no sort step — so display order followed whatever order the children were listed in the parent's frontmatter. Most families happened to appear correctly because users tend to list kids in birth order, but the moment a sibling was added later (or rearranged), the display would diverge. Siblings (bio + adoptive merged) are now sorted using `dateService.getCanonicalYear`, which normalizes both Gregorian and descending fictional eras (e.g. Star Wars BBY) onto a comparable scale — so oldest-first ordering reads correctly regardless of universe calendar. Persons without a parseable birth date sink to the end while preserving relative order; ties on the same year preserve original order (stable sort). Reported by @DigitalDreamn.
- **Adopted siblings now appear in the Dynamic Relationship Block and Dynamic Timeline Block on biological siblings' pages** ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531)): Direct cascade from 0.22.20's [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) / [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) follow-up, which correctly moved adopted children out of each parent's `childrenCrIds` and into the dedicated `adoptedChildCrIds` array so the Relationship Calculator stopped labeling them as blood relations. The dynamic Relationship Block's sibling walker (`findAdoptiveSiblingCrIds` in `sibling-walker.ts`) and the Timeline Block's sibling-births collection both still read only from `childrenCrIds`, so adopted children silently dropped off bio-side household pages once they no longer lived in that array. From the adopted child's own page, the link still worked (the walk runs from the adopted child's adoptive parents and lands on the parents' bio kids in `childrenCrIds`), which produced the asymmetry @DigitalDreamn reported — Galen sees his adoptive siblings, but those siblings don't see him. Both walks now also consult `adoptedChildCrIds` on each parent: `findAdoptiveSiblingCrIds` merges three sources (bio parents' `adoptedChildCrIds`, adoptive parents' `childrenCrIds`, adoptive parents' `adoptedChildCrIds` minus self), and the Timeline's parent walk extends to adoptive parents and gathers from both arrays. Step-sibling exclusion (#456) is preserved across the new sources. Reported by @DigitalDreamn. 6 new tests in `tests/sibling-walker.test.ts` covering each of the three adoptive-sibling sources plus a merged-and-deduped scenario; the prior "Galen case" test was reshaped to match the post-#525/#526 family-graph data shape.

## [0.22.20] - 2026-05-06

Three fixes — two follow-ups to 0.22.19's almost-fixes that didn't actually resolve the underlying bugs, plus a new bug surfaced by the same reporter. **#528** (Map view filter row clipping on Android phones) needed a flexbox correction (`flex: 0 0 100%` to override the inherited `flex-basis: 0`); the 0.22.19 attempt set `width: 100%` which got silently overridden in flex layout — diagnosed via on-device DevTools after the release shipped. **#525 + #526 follow-up**: parent → step/adopted child direction was still mislabeled as a blood relation because `step_child` and `adopted_child` relationship types routed bidirectional inverse entries into bio `childrenCrIds`; distinct `'stepchild'` / `'adopted_child'` `FamilyGraphMapping` values added with dedicated routing. **#530**: the Notes textarea on the Add Custom Relationship modal was capturing input but never persisting it; now writes a parallel `<type>_notes` flat array (matching the existing `<type>_from` / `<type>_to` convention) and the Entity Profile renders the notes inline beneath each relationship row. All non-data-loss; stability window stays anchored to 0.22.17 (three patches in). 622 tests passing across 52 suites. Reporters: @DigitalDreamn for the parent-direction follow-up + [#530](https://github.com/banisterious/obsidian-charted-roots/issues/530) (via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529)); @banisterious for the [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) follow-up.

### Fixed

- **Notes from the Add Relationship modal are now persisted to frontmatter** ([#530](https://github.com/banisterious/obsidian-charted-roots/issues/530), via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529)): The "Notes (optional)" textarea in the Add Custom Relationship modal captured what users typed into a private field, but the value was never referenced by any of the writer paths and silently fell out of scope when the modal closed. Notes are now written as a parallel `<type>_notes` flat array alongside `<type>` and `<type>_id`, index-aligned with the targets array — matches the existing `<type>_from` / `<type>_to` parallel-array convention already read by `parseFlatRelationships`, and respects the plugin's flat-YAML preference (no nested objects in frontmatter). Notes appear in the Entity Profile relationships section beneath each row that has one, italicized and indented to the link column. Currently scoped to non-bio relationship types (custom types + step / adoptive / foster / ward / etc.); bio family relationships (spouse / parent / child) use dedicated frontmatter fields with no notes slot and are tracked as a follow-up. Reported by @DigitalDreamn. 8 new tests in `tests/relationship-property-writer.test.ts` cover scalar / array / mixed-with-empty-padding / duplicate-skip cases.
- **Relationship Calculator parent → step/adopted child direction now produces correct labels** ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) follow-up): The 0.22.19 fix only resolved the child → parent direction. After the release, DigitalDreamn reported that going parent → child (e.g. Ben → Galen as adoptive father, Cliegg → Anakin as stepparent) still returned "Child" with `Blood: Yes`. Root cause was a separate bug in custom-relationship-array parsing: the `step_child` and `adopted_child` relationship type definitions had `familyGraphMapping: 'child'`, so when a parent's frontmatter contained a flat `adopted_child:` or `step_child:` array (which the bidirectional propagator writes when the inverse relationship is added), `parseRelationshipsArrayForFamilyGraph` pushed those entries into bio `childrenCrIds`. The relationship calculator's BFS then found the children via the bio edge first and labeled the path as a blood relation, ignoring the dedicated `adoptedChildCrIds` / `stepchildrenCrIds` arrays the family graph also populates. Fix: distinct `'stepchild'` / `'adopted_child'` mapping values added to the `FamilyGraphMapping` type union, with dedicated cases in `addToFamilyGraphResult` that route to the dedicated arrays, and matching merge paths in `extractPersonNode`. Verified end-to-end in the dev-vault with the Person A–G test fixtures: parent → adopted child now returns "Adopted child" + `Blood: No`; parent → stepchild returns "Stepchild" + `Blood: No`; bio paths and unrelated-person detection unchanged. Reported by @DigitalDreamn.
- **Map view filter row clipping on Android phones — actually fixed this time** ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)): The 0.22.19 attempt didn't actually resolve the bug. Both the existing `@media (max-width: 768px)` rule and the new `Platform.isPhone` class-based fallback set `width: 100%` on `.cr-map-toolbar-center`, but the base `flex: 1` declaration on that element sets `flex-basis: 0`, which overrides `width` for flex-layout sizing — computed `width: 100%` rendered as 75px against the right edge with controls stacking vertically. Diagnosed via `chrome://inspect` on a real Android device, which is now the pre-release verification step for any `mobile-*`-labeled fix. The fix replaces `width: 100%` with `flex: 0 0 100%` (don't grow, don't shrink, base 100%) in both the media-query block and the class-based block, which forces the section to its own row regardless of the conflicting `flex: 1`. Verified on Android device pre-release. Reporter: @banisterious.

## [0.22.19] - 2026-05-05

Four fixes addressing wikilink ambiguity, relationship-graph traversal, and mobile layout. **#524** corrected wikilinks generated by the relationship picker that linked to the wrong target when a person's `name` differed from their filename — same architectural shape as #510 from 0.22.17, different code path (the writers' `createSmartWikilink` helper). **#525 + #526** fix the Relationship Calculator's BFS to traverse step and adoptive parent/child edges that the family graph already populates, resolving direction-asymmetric labels (e.g. "Parent-in-law" vs "Child / Blood: Yes" for the same stepparent path) and adding correct `Stepparent` / `Stepchild` / `Stepsibling` / `Adoptive parent` / `Adopted child` / `Adoptive sibling` labels. **#528** fixes the Map view's center toolbar filters clipping off the right edge on Android phones, where the existing 768px viewport media query didn't fire reliably on Obsidian Mobile — wrap rules now apply class-based via `Platform.isPhone`, scoped to phones so iPad-landscape keeps the inline horizontal layout. All non-data-loss; stability window stays anchored to 0.22.17 (two patches in). 610 tests passing across 51 suites. Reporters: @doctorwodka for [#524](https://github.com/banisterious/obsidian-charted-roots/issues/524), @DigitalDreamn for [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) + [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526), @banisterious for [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528).

### Fixed

- **Wikilinks generated by the relationship picker no longer link to the wrong target when a person's `name` differs from their filename** ([#524](https://github.com/banisterious/obsidian-charted-roots/issues/524)): Same architectural shape as [#510](https://github.com/banisterious/obsidian-charted-roots/issues/510) from 0.22.17, different code path. The writers' `createSmartWikilink(name, app)` derived the file from the name via `getFirstLinkpathDest(name, '')`, which returned null when no file's basename matched the name (e.g., filing a person under their maiden name with `name` set to a married-name display). The fall-through wrote a bare `[[name]]` form that didn't resolve to anything. The `cr_id` link was unaffected — it's stored independently — making the bug silent until a user clicked the wikilink. `createSmartWikilink` in `person-note-writer.ts`, `place-note-writer.ts` (both quoted + unquoted variants), and `organization-service.ts` now accept an optional `crId` parameter and look up the file by cr_id when provided, falling back to the name-based lookup when no cr_id is available. ~20 person-side call sites pass the paired cr_id (father, mother, spouse 1-5, children, stepparents, adoptive parents, parents, birth_place, death_place, sources). Reported by @doctorwodka. 10 new tests in `tests/relationship-emit.test.ts` and the new `tests/person-note-writer-smart-wikilink.test.ts`.
- **Relationship Calculator handles step and adoptive relationships** ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526)): The Relationship Calculator's BFS only traversed bio-relationship edges (`father` / `mother` / `parents` / `children` / `spouses`) and ignored the step and adoptive edges that `family-graph.ts` already populates on each person node. Two consequences: paths that needed a step or adoptive edge to resolve returned "Not related" with a BFS-exhausted warning ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) — Galen → Ben as adoptive father), and paths the BFS happened to find through bio-fallback routes were labeled with the wrong direction-asymmetric terms ([#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) — Anakin → Cliegg returned "Parent-in-law" while Cliegg → Anakin returned "Child" with `Blood: Yes`; same path, two wrong labels). The BFS now traverses `stepfatherCrIds` / `stepmotherCrIds`, `adoptiveFatherCrId` / `adoptiveMotherCrId` / `adoptiveParentCrIds` going up and `stepchildrenCrIds` / `adoptedChildCrIds` going down, with each step tagged so the path-interpretation layer can produce **"Stepparent"** / **"Stepchild"** / **"Stepsibling"** / **"Adoptive parent"** / **"Adopted child"** / **"Adoptive sibling"** labels symmetrically and flag `Blood relation: No` for any path crossing a non-bio edge. Reported by @DigitalDreamn. **Behavior change**: users with existing step or adoptive relationship data will now see correct labels in the Relationship Calculator, the kinship report generator, and the path-step display in the Calculator modal — paths that previously resolved as "Not related", "Sibling-in-law", or "Child / Blood: Yes" through these edges will now read as the appropriate step/adoptive relationship. 11 new tests in `tests/relationship-calculator.test.ts`.
- **Map view filter row no longer clips off the right edge on Android phones** ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)): The center toolbar filters (`All collections` picker + `From year` / `To year` inputs) overflowed past the viewport on phones — visible labels read `All collection`, `Fron`, `To y` — because the existing `@media (max-width: 768px)` rule in `styles/map-view.css` (supposed to wrap the filter row onto its own line) didn't fire reliably on Obsidian Mobile. The same wrap behavior is now applied class-based via `Platform.isPhone` from `src/maps/map-view.ts`, mirroring the existing `crc-mobile-mode` pattern in Control Center. Scoped to phones — iPad-landscape keeps the inline horizontal layout. Reporter: @banisterious.

## [0.22.18] - 2026-05-03

Four rendering / consistency fixes. Two were surfaced while authoring the new chartedroots.com [/guides/](https://chartedroots.com/guides/) section: the Merge Wizard component creates ~20 distinct `cr-merge-*` classes but had no CSS file defining any of them ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514)), and the People base's Spouse(s) column was empty for users following the recommended indexed-spouse pattern ([#516](https://github.com/banisterious/obsidian-charted-roots/issues/516)). The other two are a metadata-cache race that left newly-created notes invisible to the Entity Profile pane until something else invalidated the cache ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519)), and raw `[[wikilink]]` syntax leaking into PDF/ODT output from Book Builder report chapters ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522)). All non-data-loss; stability window stays anchored to 0.22.17 (one patch in). 589 tests passing across 49 suites. Reporter: @DigitalDreamn for [#519](https://github.com/banisterious/obsidian-charted-roots/issues/519); @banisterious for the rest.

### Fixed

- **Merge Wizard renders as the intended 4-column comparison table** ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514)): The Merge Wizard component created ~20 distinct `cr-merge-*` class names but no CSS file ever defined any of them — layout fell back to default block flow, stacking each field / value / value / dropdown vertically instead of as a side-by-side comparison. New `styles/merge-wizard.css` wires up the side-by-side grid the component was always built to use, plus styling for the conflict dropdowns and the preview panel. While in there: the People base's "Multiple marriages" view filter was checking `!isEmpty(spouses_all)` ("has at least one"), corrected to `length > 1` ("actually multiple"). Surfaced while authoring the [find-and-merge-duplicates guide](https://chartedroots.com/guides/research/find-and-merge-duplicates/).
- **People base's Spouse(s) column shows all spouses for users following the indexed-spouse pattern** ([#516](https://github.com/banisterious/obsidian-charted-roots/issues/516)): The Spouse(s) column mapped directly to `note.spouse` only, so vaults using the recommended indexed pattern (`spouse1`, `spouse2`, etc.) saw an empty column even when multiple spouses were recorded. New `spouses_all` formula aggregates the flat `spouse` plus `spouse1` through `spouse5` and filters empties, so both single-spouse and multi-marriage households render correctly. Surfaced while authoring the [use-bases-for-data-analysis guide](https://chartedroots.com/guides/research/use-bases-for-data-analysis/).
- **Entity Profile pane stops showing "Could not load entity data" for newly-created entities** ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519)): A metadata-cache race in `EventService`, `SourceService`, and `ProofSummaryService`. Each service loaded its cache lazily and invalidated on writes, but didn't react to Obsidian indexing the new file later. After `createEvent` (or `createSource`, or `createProof`), a read between the write and Obsidian's metadata catch-up silently skipped the new file and marked the cache valid without it — invisible until something else invalidated. Each service now subscribes to `metadataCache.on('changed')` plus vault delete/rename, invalidating when a relevant `cr_type` file moves through the index. `ProofSummaryService` hoisted to a singleton on the plugin (was previously constructed per-render at 5 sites — singleton needed so the listeners persist for the plugin lifetime); consumer sites updated to use the new `getProofSummaryService` getter. Reported by @DigitalDreamn. 15 new tests in `tests/event-service-cache-race.test.ts`, `tests/source-service-cache-race.test.ts`, `tests/proof-summary-service-cache-race.test.ts`.
- **Report chapters in Book Builder no longer leak raw `[[wikilink]]` syntax into PDF/ODT output** ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522)): `BookGenerationService` already sanitized vault-note chapter content through a helper that strips wikilinks, frontmatter, and dynamic blocks — but the report chapter path stored the report generator's markdown into the chapter directly, with no sanitization. Report generators (Family Group Sheet, Individual Summary, Source Summary, Sources by Role) emit raw `[[Name]]` syntax intentionally for in-vault rendering, which the static export renderer then displays as literal text. `generateReportChapter` now applies the same sanitizer; helpers extracted to a standalone module so the regression can be fenced directly with realistic Family Group Sheet shaped input. Standalone-PDF report generation already had its own `stripWikilinks` and was unaffected. 7 new tests in `tests/book-sanitize-report-markdown.test.ts`.

## [0.22.17] - 2026-05-01

Three fixes addressing wikilink ambiguity and silent data destruction in the Edit Person modal, plus a discoverability change that surfaces the per-fact source citations UI by default. Closes a `data-loss` bug ([#512](https://github.com/banisterious/obsidian-charted-roots/issues/512)) where opening + saving Edit Person on a person with existing `sourced_*` attributions wiped them. **Stability window resets to 0.22.17** — first reset in thirteen patches (anchored to 0.22.4 since 2026-04-23). Reporters: @doctorwodka for [#510](https://github.com/banisterious/obsidian-charted-roots/issues/510), @banisterious for the rest discovered while validating that fix.

### Added

- **Top-level "Research" section in Settings** ([#511](https://github.com/banisterious/obsidian-charted-roots/issues/511)): The "Research tools" and "DNA tracking" subsections moved out of Advanced into a new top-level "Research" section, positioned between Places and Property & value aliases. Both subsections retain their existing labels and toggle wording — the only structural change is the section move so the toggles don't sit three levels deep under Advanced. The new section reads "Evidence-based genealogy and DNA workflows" and is broad enough to host future research-related settings without renaming. Existing user preferences are preserved (the move doesn't reset any saved values).

### Changed

- **Fact-level source tracking now defaults to on for new vaults** ([#511](https://github.com/banisterious/obsidian-charted-roots/issues/511)): The `trackFactSourcing` setting flips from `false` to `true` in `DEFAULT_SETTINGS`. New installs surface the "Fact-level source citations" section in Edit Person without requiring users to find and enable a buried toggle first. The section auto-collapses when no data is present (so empty-state cost is low) and auto-expands when populated. The existing implementation from #292 was already feature-complete; the previous default-off gate was masking an otherwise-usable surface. Existing vaults with the toggle explicitly off keep that preference. Safe to default-on now that #512 / #513 are closed.

### Fixed

- **Event creation wikilinks correctly disambiguate when persons share the same display name** ([#510](https://github.com/banisterious/obsidian-charted-roots/issues/510)): When two persons had the same `name` frontmatter property but different filenames (e.g. `Harold James 1.md` and `Harold James 2.md`, both with `name: Harold James`), creating an event for one of them silently linked to whichever file Obsidian's metadataCache picked first. The event modal had the right `TFile` reference from the picker callbacks but discarded it before passing data to `createEvent`, so the wikilink-writing helpers fell back to a name-only resolution. The picker callbacks now capture `file.basename` and plumb it through `personsBasenames` / `placeBasename` on `CreateEventData`, producing `[[Harold James 2|Harold James]]` instead of the ambiguous `[[Harold James]]`. Edit-mode round-trip is preserved via a new `parseWikilink` helper so re-saving an existing aliased event doesn't strip the disambiguation. Fix extends to the context-driven entry points (Edit Person modal's Create event button, right-click "Create event for this person", People tab submenus) so all five callers pass basename through. Reported by @doctorwodka. 16 new tests in `tests/event-wikilink-disambiguation.test.ts` and `tests/event-service-create-disambiguation.test.ts`.
- **Edit Person modal no longer wipes per-fact source attributions on save** ([#512](https://github.com/banisterious/obsidian-charted-roots/issues/512), `data-loss`): With `trackFactSourcing: true`, opening Edit Person on a person who had existing `sourced_birth_date` / `sourced_marriage_*` / etc. properties in frontmatter and clicking Save (even with no changes) silently deleted all of them. Both Edit Person callers (`people-tab.ts` and `bulk-operations.ts`) built the `editPersonData` object from frontmatter manually but never read `sourced_*` properties into `editPersonData.sourcedFacts`. The modal's save path always wrote `sourcedFacts` with all 10 fact properties (empty arrays for any the user hadn't touched), and the writer's update path deleted any property whose array was empty. New `extractSourcedFactsFromFrontmatter` helper parses the `sourced_*` arrays out of frontmatter, stripping wikilink brackets and pipe-aliases to leave just the basenames the modal's chip UI expects. Bug only fired when `trackFactSourcing: true` was explicitly enabled (the previous default was off), so existing default-settings vaults were unaffected. 11 new tests in `tests/extract-sourced-facts.test.ts`.
- **Spouse `marriage_location` stops degrading to nested-array YAML form** ([#513](https://github.com/banisterious/obsidian-charted-roots/issues/513)): The writer wrapped its `createSmartWikilink` output for `spouse{N}_marriage_location` in extra JS-string template quotes, producing a JS string like `'"[[Boston Suffolk County]]"'` (with embedded quote characters). `processFrontMatter`'s round-trip then reshaped that to the nested block-list form `[["Boston Suffolk County"]]` for the unrecognized link field. Drops the embedded quotes from the writer site so new saves emit the canonical wikilink string. New `normalizeMarriageLocation` helper coerces the degraded `[["Basename"]]` shape back to `[[Basename]]` when reading existing data, so notes round-tripped through the buggy writer self-heal on the next save. 7 new tests in `tests/normalize-marriage-location.test.ts`.

## [0.22.16] - 2026-04-30

Five fixes refining Universe handling and marriage popups across the modal and map surfaces. Edit Person dropdown now lists every universe form the user might pick (typed name + cascaded basename), the Edit Event modal exposes the Universe field on every event type and reactively reveals the Worldbuilding section when the user picks a narrative type, marriage popups pair the partner's age alongside the focal person's on the static-marker surface (parity with the journey-mode treatment from 0.22.15), and event / source / proof-summary filenames now preserve accented characters and casing instead of being slugified into ASCII-only forms. All non-data-loss; stability window stays anchored to 0.22.4 (twelve patches without a reset). Reporters: @DigitalDreamn for the verification thread that surfaced #505 / #507 / #508 / #509.

### Added

- **Static map marker popup pairs the partner's age alongside the focal person's** ([#508](https://github.com/banisterious/obsidian-charted-roots/issues/508)): The journey-mode rich popup gained partner age in 0.22.15 (#504), but the non-journey marker popup (clicked directly on a map marker) didn't. `buildMarkers` now resolves the spouse via `marriage.spouseId` from the same `people` array it iterates and threads `spouseBirthDate` onto marriage markers; the popup's existing `with X` participants line appends `(age N)` to the partner's entry when the spouse note has a resolvable birth date. Uses the same `DateService.calculateAge` path the focal age already uses, so fictional eras round-trip correctly. Format ends up `with Beru Whitesun (age 38)` alongside the existing focal-side `Marriage: 19 BBY (age 45)`. Compact in-line variant suggested by @DigitalDreamn during #504 verification — she'd originally meant the static popup when filing [#501](https://github.com/banisterious/obsidian-charted-roots/issues/501). 5 new tests in `tests/marriage-marker-spouse-birth.test.ts`.

### Fixed

- **Edit Person dropdown includes the universe note's typed name** ([#505](https://github.com/banisterious/obsidian-charted-roots/issues/505)): The right-click Edit Person flow merged universes from only two sources (`placeGraph.getAllUniverses()` and `familyGraph.getAllUniverses()`), omitting the universe-note source that the Control Center's `getCachedUniverses` already uses. After a Universe rename where sanitization stripped chars from the basename — e.g. typed `Star Wars (AU)` becoming basename `Star Wars AU` — the cascaded entity values made it into the dropdown but the typed name had no path in. Users saw only the basename and couldn't recognize the name they typed. Both call sites now go through a shared `mergeUniverseList` helper so the three-source merge can't drift apart again. Reported by @DigitalDreamn during #488 verification. 10 new tests in `tests/universe-cache-after-rename.test.ts`.
- **Universe field always available in Edit Event modal, regardless of event type** ([#507](https://github.com/banisterious/obsidian-charted-roots/issues/507)): The Universe Setting was bundled inside the conditional that gates the `isCanonical` toggle on narrative event types, so Vital (birth/marriage/death/burial) and Life (residence/immigration/etc.) events had no way to set their universe via the modal. Pulled Universe out into its own always-rendered Setting at the same level as Place / Timeline; `isCanonical` stays narrative-only since canon/non-canon is storytelling-specific. Follow-up: the Worldbuilding section that wraps `isCanonical` was decided once at form-build time from the initial `eventType` and never re-evaluated, so picking a narrative type from the dropdown after opening the modal didn't reveal the section. The section now always renders into the DOM and toggles `cr-hidden` based on `isNarrativeEventType(this.eventType)`; the event-type dropdown's onChange updates the visibility so users can switch into a narrative type and immediately see the `Canonical event` toggle without saving and reopening. Reported and verified by @DigitalDreamn. 5 new tests in `tests/event-narrative-type.test.ts`.
- **Event / Source / Proof Summary filenames preserve accented characters and casing** ([#509](https://github.com/banisterious/obsidian-charted-roots/issues/509)): Three services and the life-events migration helper each had their own private `slugify` running an aggressive `[^a-z0-9]+ -> -` regex that destroyed accented chars, lowercased everything, and turned spaces into hyphens. `Birth of Padmé Naberrie` became `birth-of-padm-naberrie.md`. Person notes go through `sanitizeName` which preserves accented characters, casing, apostrophes, hyphens, and spaces — same character was treated inconsistently across entity types. New `sanitizeFilename` helper wraps `sanitizeName` with a length cap and replaces all four call sites (event-service, source-service, proof-summary-service, life-events-migration-service). Filenames now preserve user typing the same way person notes already do. Existing files keep their old slugified names; only new files going forward use the preserved format. Reported by @DigitalDreamn during #506 investigation. 18 new tests in `tests/sanitize-filename.test.ts` (replacing 6 obsolete `slugifyTitle` tests).

## [0.22.15] - 2026-04-30

Three fixes that close the loose ends from 0.22.14's universe rename arc, plus a small enhancement to the marriage popup. The rename cascade now covers map notes, the universe code blocks survive the name↔basename divergence that sanitization causes when typed names contain parens / brackets / quotes, the map view re-syncs its filter when a map note's universe field changes, and the journey-mode marriage popup pairs the partner's age alongside the focal person's. All non-data-loss; stability window stays anchored to 0.22.4 (eleven patches without a reset). Reporters: @DigitalDreamn for the #488 verification thread that surfaced #503 + the #501 verification observation that surfaced #504.

### Added

- **Marriage popup pairs the partner's age alongside the focal person's** ([#504](https://github.com/banisterious/obsidian-charted-roots/issues/504)): Journey-mode marriage popups previously displayed the focal person's age at marriage but not the partner's, forcing the reader to navigate to the partner's note for the same calculation. `buildJourneyPaths` now resolves the spouse via `marriage.spouseId` from the same `people` array it iterates and threads `spouseBirthDate` onto marriage waypoints. The popup renders a separate `Partner's age` row when both the marriage date and a resolvable spouse birth date are present, paired with the existing focal-person `Age` row via the same `DateService.calculateAge` path so fictional eras work correctly. Legacy flat marriages without `spouseId`, and spouses without a `born` value, quietly omit the row. Suggested by @DigitalDreamn during [#501](https://github.com/banisterious/obsidian-charted-roots/issues/501) verification. 5 new tests in `tests/journey-marriage-spouse-birth.test.ts`.

### Fixed

- **Universe rename cascade rewrites map notes alongside other entity types** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)): The 0.22.14 cascade scope was `person | place | event | organization` — map notes (`cr_type: map`) carry a `universe:` field too, but were silently skipped, so after a rename the map kept pointing at the old universe and its marker filter no longer matched the cascaded entities. `cr_type: map` added to `REFERENCING_TYPES` so map notes ride the cascade with the rest. Reported by @DigitalDreamn during 0.22.14 verification.
- **Universe dynamic code blocks survive name↔basename divergence after rename** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)): The rename cascade writes the file basename to entity `universe:` fields, but the `charted-roots-universe-people` / `places` / `events` / `organizations` / `maps` block processors compared against the universe note's frontmatter `name`. When `sanitizeName` strips characters during the file rename (parens / brackets / quotes — e.g. `"The Dying Earth (Vance)"` → basename `"The Dying Earth Vance"`), the basename diverges from the typed name and the lookup silently returned zero entities ("No entities found for this universe"). New `getEntitiesForUniverseFile` matches against any of the universe note's aliases — basename, frontmatter `name`, or `cr_id` — so the lookup survives whichever form an entity's `universe:` field happens to hold. Both processors and the metadata-cache change handler use the alias set. Reported by @DigitalDreamn during 0.22.14 verification.
- **Map filter resolves universe cr_id to basename, and re-syncs when a map note changes** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)): Two related issues with the map view's universe filter chain. (1) `resolveUniverseFilterValue` returned the universe note's frontmatter `name` when given a cr_id, but the rename cascade writes the basename to entities — so after a rename like `"The Dying Earth"` → `"The Dying Earth (Vance)"` the resolved filter `"The Dying Earth (Vance)"` no longer matched cascaded places / people on basename `"The Dying Earth Vance"` and every marker silently disappeared. Resolver now returns the basename, which is what the cascade writes. (2) The map controller's in-memory `mapConfigs` cache stayed stale after an Edit Map save, so `getActiveMapUniverse()` kept returning the old value and refresh re-queried with the wrong filter. Map view now reloads `mapConfigs` and re-syncs `this.filters.universe` whenever a `cr_type: map` note's metadata changes. The resolver moves to its own module so the logic can be unit-tested without instantiating the view. Reported by @DigitalDreamn during 0.22.14 verification. 7 new tests in `tests/resolve-universe-filter.test.ts`, 8 new tests in `tests/universe-rename-cascade.test.ts` + `tests/universe-entities-by-file.test.ts`.

## [0.22.14] - 2026-04-30

Three fixes plus a Cleanup Wizard step. Closes the Universe rename direction end-to-end (Part 3 — the Edit Universe modal now actually renames the file, which fires the existing 0.22.12 Part 2 cascade); collapses pair-symmetric marriage markers into a single combined marker with both partner names in the popup (#501); and adds a Cleanup Wizard step that surfaces and fixes place notes lacking `cr_id` so they re-enter the place graph (#502, follow-on to #471's diagnostic warning). All non-data-loss; stability window stays anchored to 0.22.4 (ten patches without a reset). Reporters: @DigitalDreamn for #488 Part 3 verification + #501 surface from #493 / #498 testing.

### Added

- **Cleanup Wizard step: add cr_id to place notes** ([#502](https://github.com/banisterious/obsidian-charted-roots/issues/502)): Place notes lacking `cr_id` are silently excluded from the place graph cache by `PlaceGraphService.extractPlaceNode`, so by-name lookups, the Create Place modal's parent dropdown, and map markers can't see them. [#471](https://github.com/banisterious/obsidian-charted-roots/issues/471) shipped Layer 1 (a `warn`-level dev-console log on the skip); this is Layer 2 — a fixable batch step in the Post-Import Cleanup Wizard. Detects place-shaped notes via the same `isPlaceNote` detection used elsewhere, lists them in the preview, and applies a generated `cr_id` to each via `processFrontMatter` (defensive: skips notes that already have one in case state changed mid-run). Layer 3 (silent auto-heal during cache build) was discussed but rejected — the wizard route keeps schema issues visible to the user.

### Fixed

- **Edit Universe modal renames the file when the name property changes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 3): The 0.22.12 cascade (Part 2) is keyed on `vault.on('rename')` — it walks all entities and rewrites `universe:` plain-string references when a universe note's basename changes. But `UniverseService.updateUniverse` only wrote the new `name` value to the frontmatter and never renamed the file, so the cascade only fired when users renamed the universe FILE directly (drag, F2, wikilink rename). Most users naturally edit the name via the Edit Universe modal, which left the file basename unchanged and entities still pointing at the old name. `updateUniverse` now sanitizes the new name (via the existing `sanitizeName` helper) and calls `app.fileManager.renameFile` when the sanitized name differs from the current basename. The cascade fires automatically off the rename event, and Obsidian's native wikilink-rewrite handles `[[oldName]]` → `[[newName]]` updates for free. Reported by @DigitalDreamn.
- **Marriages between two spouses render as one combined marker with both partner names** ([#501](https://github.com/banisterious/obsidian-charted-roots/issues/501)): A marriage produced one map marker per spouse — Owen's `spouse1_marriage_*` slot rendered a marker for Owen at Tatooine; Beru's `spouse1_marriage_*` slot rendered a separate marker for Beru at the same place; neither popup named the partner. [#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)'s `eventCrId`-based dedup didn't catch this because marriages live on each spouse's frontmatter rather than as `cr_type: event` notes. `loadMarriages` now reads `spouseN` and `spouseN_id` alongside the existing marriage fields, attaches `spouseId` / `spouseName` to the resulting `MapMarker`, and a new `dedupeMarriageMarkers` pass (running after the event-cr_id dedup) groups by sorted-pair + place + date so Owen→Beru and Beru→Owen markers collapse into one. Both spouses appear in the surviving marker's `participants` list, so the existing popup rendering surfaces "Owen Lars / with Beru Whitesun" naturally. Journey-mode rich popup also gains a `Partner` row for marriage waypoints (covering @DigitalDreamn's "indicate to who" suggestion from [#498](https://github.com/banisterious/obsidian-charted-roots/issues/498) verification). Reporter: @DigitalDreamn via #493 / #498 verification. 8 new tests in `tests/marriage-marker-dedup.test.ts`.

## [0.22.13] - 2026-04-29

Six fixes spanning the map subsystem (multi-spouse marriage waypoints, multi-participant event dedup, child-place coordinate inheritance, journey-mode custom event labels) plus follow-ups to two 0.22.12 patches (compound coord row in Place modal, flat-format spouse promotion for marriage detail mirroring). Map UX gets the most attention this cycle: hierarchical places now render via parent fallback, multi-spouse people surface every marriage on the map, multi-participant events collapse into a single combined marker, and custom event types preserve their original label across journey popups + play-control labels. All non-data-loss; stability window stays anchored to 0.22.4 (nine patches without a reset). Reporter mix: @DigitalDreamn for the diagnostic isolation across #487 / #498 / #494 + the #481 follow-up; @doctorwodka closed out #491 verification.

### Fixed

- **Map journey mode reads every marriage on multi-spouse people** ([#498](https://github.com/banisterious/obsidian-charted-roots/issues/498)): Marriage waypoints and markers were sourced from a single set of legacy flat `marriage_place` / `marriage_place_id` / `marriage_date` frontmatter fields. People with multiple spouses (whose data is written to indexed `spouseN_marriage_*` slots after [#481](https://github.com/banisterious/obsidian-charted-roots/issues/481)'s bidirectional linker improvements) had no flat fields populated, so their journeys silently dropped every marriage. Surfaced by @DigitalDreamn during [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) verification — Cliegg Lars's death popup came back via the dedup fix, but neither of his two marriages appeared as waypoints. `MapDataService` now reads indexed slots `spouse1_marriage_*` through `spouse10_marriage_*` first (matching the writer's iteration bound), falls back to a single legacy flat entry otherwise, and emits one waypoint / marker per populated slot. The dropped `&& person.marriageDate` requirement also lets dateless marriages surface as waypoints (sorting to the end of the life-event run, like death and burial already do). 10 new tests in `tests/marriage-loader.test.ts`.
- **Events at child places render via inherited parent coordinates instead of disappearing** ([#494](https://github.com/banisterious/obsidian-charted-roots/issues/494)): When a person's `birth_place` / `death_place` / event location pointed at a child place (e.g., `Lars Homestead` with `parent_place: [[Tatooine]]`) that had no own pixel or geographic coordinates, the marker dropped silently because `hasValidCoordinates` returned false on the child. The map's place resolution now walks up the `parent_place` / `parent_place_id` chain when the resolved place has no own coords, inheriting positioning fields (`lat` / `lng` / `pixelX` / `pixelY` / `mapId` / `maps`) from the nearest ancestor that does. Popup and click-through keep the child's identity (`Lars Homestead` shows in the popup, opening the child's note), while the marker visually appears at the parent's location — appropriate when the parent is the most-zoomed map level the user has set up. Reported by @DigitalDreamn during [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) testing; her "Lars Homestead" note had only `parent_place: [[Tatooine]]` and `parent_place_id` with no own coordinates. Same shape covers the real-world equivalent (e.g., a Stockholm event on a vault where Stockholm has no coords but Sweden does). Adds `parentPlaceId` to the place cache and an `applyCoordinateFallback` step inside `resolvePlace`. 7 new tests in `tests/place-coordinate-fallback.test.ts`.
- **Multi-participant events render one combined marker instead of one per participant** ([#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)): A `cr_type: event` note referenced by multiple people (e.g., a wedding with bride + groom, a battle with multiple combatants) produced one map marker per participant stacked at the same location, inflating cluster counts and cluttering popups. `MapDataService.buildMarkers` iterates per-person and the same external event reached two different `events[]` arrays via `EventService.getEventsForPerson`, so each person's pass contributed its own marker for the same event. The fix threads the source event note's `cr_id` through `LifeEvent` and `MapMarker` (only set for external `cr_type: event` notes — inline events stay per-person, never dedup), then a new `dedupeEventMarkers` pass after marker collection groups by `eventCrId`, keeps one marker per group, and lists all participants in the popup with the event note's `person` (primary) field marked. Reported by @DigitalDreamn during [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) testing. 8 new tests in `tests/event-marker-dedup.test.ts`.
- **Journey mode popup and play-control label show the original event type for custom events** ([#499](https://github.com/banisterious/obsidian-charted-roots/issues/499)): Custom event types rendered as the literal string `Custom` in the journey-mode rich popup and the play-control label, instead of preserving the original type (e.g., `Backstory`). Sibling to [#466](https://github.com/banisterious/obsidian-charted-roots/issues/466), which fixed the same UX gap on static map markers via `customLabel` on `MapMarker`; the journey-mode rendering path was missed at the time. `JourneyWaypoint` now carries `customLabel`, `buildJourneyPaths` propagates it from the source `LifeEvent`, and a new `getJourneyWaypointEventLabel` helper resolves the display label (preferring `customLabel` for `custom` waypoints, falling back to the canonical `eventType` otherwise) so both render sites stay in sync. Reported by @DigitalDreamn during [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) verification. 5 new tests in `tests/journey-waypoint-display-label.test.ts`.
- **Pixel coordinates X / Y (and Latitude / Longitude) render as a single compound row** ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496) follow-up): The 0.22.12 fix tried to keep X / Y inline via `align-items: center` on a flex container of two adjacent setting-items, but @DigitalDreamn reported the rows still looked misaligned. DevTools inspection showed an Obsidian default `:first-child` / `:last-child` rule applying asymmetric padding (`0 0 16px` on X, `16px 0 0` on Y), pushing X content to the top of its box and Y content to the bottom. Specificity bumps couldn't reliably defeat the Obsidian default. Reworked the layout so X and Y (and the Latitude / Longitude pair under the same UI surface) live inside a single Setting's control area as plain inputs with inline `X` / `Y` labels — one setting-item, no adjacent-sibling padding asymmetry, side-by-side layout preserved. The Look up button stays in the same row alongside the lat / long inputs.
- **Marriage detail mirror also works when the partner's note uses legacy flat spouse format** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) follow-up): The 0.22.12 fix mirrored marriage details correctly when both partners' notes used the indexed `spouseN:` format, but missed the case where the partner was still on the legacy flat `spouse:` / `spouse_id:` shape. Couples that paired up before any marriage details existed (which is most pre-existing data) kept the flat shape on both sides; setting marriage details on one side promoted that note to indexed via the writer's existing path, but the linker's mirror step bailed because `findExistingSpouseIndex` only scanned indexed slots. Reported by @DigitalDreamn in her Bail / Breha Organa scenario; reproduced locally on a dev-vault couple matching the same shape. Adds `promoteFlatSpouseToIndexed` to the linker — when the target uses single-spouse flat format and the source has marriage details to mirror, the promotion atomically rewrites the target's `spouse:` / `spouse_id:` to `spouse1:` / `spouse1_id:` so the existing mirror code has a `spouseN_*` namespace to write the companion fields into. The atomic single-`processFrontMatter` write avoids a phantom-deletion cascade that the original sequential writes would have triggered (intermediate state where flat keys were removed but indexed keys not yet written looked like a deletion to the linker's snapshot diff).

## [0.22.12] - 2026-04-28

Eleven fixes plus two carried over from the late-0.22.11 cycle. The largest patch in the 0.22.x stability run, but every entry is non-data-loss; window stays anchored to 0.22.4 (eight patches without a reset). Headline themes: marriage-info symmetry between spouses (#481), Universe-note rename cascades through `universe:` references end-to-end (#488 Part 2 closes what Part 1 started in 0.22.11), journey-mode dedup no longer silently swallows death waypoints when a custom event sits at the same place (#487), and a clutch of map-UX polish (label legibility outline, popup dwell time, burial filter consistency). Person picker takes a partial Collections-rework cut so user-named groups finally appear as named tabs and components sharing a `group_name` merge instead of fragmenting into N "Family" entries (#491). Reporter mix: @DigitalDreamn for the diagnostic on #487 + #481 + #488; @doctorwodka for #486 dwell + #483 outline + the Collections-tab feedback that drove #491.

### Added

- **Person picker surfaces user-named groups and merges shared-name components** ([#491](https://github.com/banisterious/obsidian-charted-roots/issues/491) — partial; tab-label + merge fixes from a larger Collections rework): The picker's "Family groups" sidebar previously labeled every tab as `Family N` regardless of whether the connected component's members shared a `group_name`, and treated each disconnected graph component as its own tab even when multiple components shared a collection name. Now the picker uses the component's `collectionName` for the tab label when every member shares one (falling back to `Family N` when they don't), and merges components that share the same `collectionName` into a single tab so user collections that span unrelated characters (player groups, friend circles) appear as one group rather than N "Family" entries. Merge logic extracted to a pure helper at `src/core/family-component-merge.ts` with 10 regression tests. Reported by @doctorwodka after surfacing that the picker showed only auto-detected families with no path for her ~40 player characters' named groups; the broader Collections rework is post-1.0.
- **"Manage memberships" affordance on the person side** ([#490](https://github.com/banisterious/obsidian-charted-roots/issues/490)): The `ManageOrganizationMembersModal` was reachable from three places, all org-side (right-click on an Organization note, mobile flat menu on an Organization note, Organizations tab row menu in the Control Center). Editing a person's membership required first navigating to their organization — non-obvious enough that @DigitalDreamn surfaced the discoverability gap in [discussion #484](https://github.com/banisterious/obsidian-charted-roots/discussions/484) after spending ~2 hours hunting for the path. Adds a `Manage memberships...` item to the person context menu (desktop submenu under `Charted Roots`, plus the mobile flat menu for parity). Behavior: 0 memberships → notice; exactly 1 membership → opens the modal directly scoped to that org; 2+ memberships → opens a fuzzy picker scoped to the person's orgs and routes the modal to the chosen one.
- **Map path label outline setting for legibility on colorful or dark backgrounds** ([#483](https://github.com/banisterious/obsidian-charted-roots/issues/483)): Path labels (person names rendered along migration and journey paths) previously rendered with no contrasting outline, making them hard to read on busy fictional or colorful image-map backgrounds. Adds a new dropdown setting in the Places section: `Map path label outline` with three options — `None` (default, preserves existing behavior), `White outline`, `Black outline`. When enabled, each label's SVG `<text>` element gains `paint-order: stroke fill` plus a 2px stroke in the chosen color, producing a halo effect around the glyphs without changing the path color itself. Applies uniformly to migration paths and journey paths via the shared `addPathLabel` helper. Reported by @doctorwodka.

### Changed

- **Journey playback popup dwell time is now configurable and gives enough time to read** ([#486](https://github.com/banisterious/obsidian-charted-roots/issues/486)): The playback control previously labeled `1x` / `1.5x` / `2.5x` etc. controlled total step duration, not popup dwell, so most labels left dangerously little (or zero) time to read the rich waypoint popup. At default `1x` (2000ms total) the popup was visible for ~900ms after the camera fly; at the slowest `0.25x` setting the popup never opened before the next step fired. Reframed semantically — the control is now a **dwell-time selector** with explicit second labels (`2s` / `4s` / `6s` / `10s`, default `4s`). Total step interval = constant ~1100ms fly + configured dwell, so the popup always gets its full visible time regardless of fly duration. Tooltip on the button reads "Popup dwell time per step (click to cycle)" so the semantics are discoverable. Reported by @DigitalDreamn during [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) verification.
- **Journey playback preserves the user's zoom level between steps.** Each step previously called `flyTo(target, 12, { duration: 1 })` — a hardcoded zoom level that yanked the camera down to zoom 12 on every step regardless of how the user had framed the journey. On a wide journey (e.g. continental), this produced a jolting zoom-in between each waypoint. The step now passes `map.getZoom()` instead, so the user's framing — set by `fitBounds` on entry to journey mode and adjustable via manual zoom mid-playback — is respected throughout playback.

### Fixed

- **Universe note rename cascades to `universe:` references on referencing entity notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 2): Part 1 (shipped in 0.22.11 as `d461b3f2`) made the Edit Person Universe dropdown source from the Universe notes folder so renamed notes appeared in the dropdown immediately. Part 2 closes the loop on the actual data: when a Universe note is renamed (e.g. `Star Wars` → `Star Wars (AU)`), `universe:` plain-string references on people / places / events / organizations now cascade to the new name, so existing assignments stay valid. Adds `UniverseService.cascadeUniverseRename(oldBasename, newBasename)` and a `vault.on('rename')` handler in main.ts that fires it for `cr_type: universe` files. Detection reads the file content directly via `cachedRead` rather than the metadata cache — the cache is mid-update during the rename event and `getFileCache` returns null, and `metadataCache.on('changed')` doesn't fire for content-unchanged renames either. Only updates plain-string `universe:` values matching the old basename exactly; wikilink-syntax values are left alone (Obsidian's native rewrite handles those), and cr_id-based or slug-based references are stable identifiers that shouldn't change. Reported by @DigitalDreamn.
- **Marriage detail fields propagate bidirectionally between spouse notes** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481)): The bidirectional linker mirrored the `spouse` wikilink + `spouse_id` between two notes but skipped the `spouseN_marriage_date` / `_marriage_location` / `_marriage_location_id` / `_marriage_status` / `_divorce_date` companion fields. Filling marriage details on one partner's note left the other partner with just the spouse link — no date, no place, nothing in the dynamic timeline block for the marriage. Reported by @DigitalDreamn after noticing Shmi's timeline didn't include her marriage to Cliegg even though Cliegg's note had it. Fix extends `syncSpouse` to extract the marriage detail fields from the source's indexed slot and mirror them onto the target's matching slot — works for both initial fill (target has no details yet) and update propagation on top of an existing link (target previously stuck with stale or missing values). Only writes fields that are set on the source so values set independently on the target survive. Same field set the deletion handler already enumerated; coverage is now consistent in both directions. `findExistingSpouseIndex` locates the target's slot for already-linked partners by `spouseN_id` match (with wikilink fallback) so multi-spouse cases mirror to the correct slot. Sibling fix to the create/edit asymmetry meta-pattern (#411 / #415 / #426 / #429 / #478).
- **Pixel coordinates X and Y rows align vertically in the Create / Edit Place modal** ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496)): The X and Y inputs sit in a flex row (`.crc-coord-inputs`) but the parent had no `align-items` rule, defaulting to `stretch`. With each `.setting-item` flex child layouting its inner label + input independently, the X and Y rows could end up on slightly different vertical baselines depending on Obsidian's default `.setting-item` flex behavior. Fix adds `align-items: center` to the flex container so both rows align on a shared vertical center regardless of their internal layout. Reported by @DigitalDreamn.
- **Death and other event-typed waypoints survive when a custom event shares their location** ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487)): The journey-mode dedup key in `journeyWaypointDedupKey` was place-only — `id:${placeId}` (or coords composite) — so two consecutive same-place waypoints collapsed regardless of event type. The chronological sort places undated custom events at the end of the life-event run, immediately before death and burial; when their place matched the death's place, the dedup loop kept the custom event (encountered first) and silently dropped the death waypoint, leaving no death popup in journey mode. Diagnosed by @DigitalDreamn through methodical isolation on the Lars-family vault: replicated by adding a Backstory event at Tatooine (Cliegg's death location), which immediately swallowed the death popup; removing the Backstory's location restored the death after a reload. Fix folds `eventType` into the dedup key so same-place-different-type waypoints both survive (death + custom at Tatooine = two waypoints), while same-place-same-type still collapses (three residences at Smith Street = one waypoint, preserving the original [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) dedup intent).
- **Burial waypoints honor per-map visibility filter in journey mode** ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487)): The burial inclusion branch in `MapDataService.buildJourneyPaths` checked the universe filter but skipped the `isPlaceVisibleOnMap` per-map visibility filter that every other waypoint type (birth / marriage / life events / death) honors. A burial place hidden by per-map filter rules would still produce a journey waypoint on that map, while every other event type for the same person would respect the filter. Fix adds the missing `isPlaceVisibleOnMap` check so burial behaves consistently with the rest of the waypoint coverage rules. Surfaced while reading the same code path during the dedup-key investigation.
- **Map path labels hide instead of overflowing when zoomed out** ([#482](https://github.com/banisterious/obsidian-charted-roots/issues/482)): At minimum zoom, polylines collapsed to small pixel regions but leaflet-textpath kept rendering the full label text along them, so the text overflowed past the path endpoints — visible as a label "teleporting" to empty space alongside the canvas. The 0.22.11 label-host change addressed the multi-segment iteration problem (#472) but not this segment-too-short problem; @doctorwodka's 0.22.11 retest confirmed the symptom unchanged. Fix adds zoom-aware suppression: each path-label registration now estimates the rendered text pixel-width (`text.length × font-size × 0.6` — a conservative approximation that hides labels a touch before they actually overflow), compares to the chosen segment's screen-space length at the current zoom, and skips creating the host polyline when the segment can't fit the text. A new `pathLabelEntries` registry tracks every label so a debounced `zoomend` listener can re-evaluate visibility as the user zooms in or out — labels reappear when the segment grows enough to fit them. Geographic and pixel-CRS maps both benefit. Reported by @doctorwodka.
- **Fan chart PDF report option hidden from the catalog until a real renderer lands** ([#492](https://github.com/banisterious/obsidian-charted-roots/issues/492)): The `fan-chart-pdf` report type was registered in the catalog UI (report wizard, trees tab, book builder) but selecting it produced an ancestor pedigree tree rather than the promised semicircular fan chart. Root cause: `UnifiedTreeWizardModal` rewrites tree type `'fan'` to `'ancestors'` before tree generation, and there is no fan-specific layout downstream — the report type was a registered surface without an implementation. Hidden via a new `hidden` flag on `ReportMetadata`, with `getReportsByCategory` and the trees-tab iteration both honoring the flag. The option will be re-exposed when the fan-layout renderer is implemented.

## [0.22.11] - 2026-04-28

Six fixes — three follow-ups to recent patches plus three new bugs. All non-data-loss; stability window unchanged. The #442 follow-up effectively closes [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478) (the broken-wikilink-on-save empty-string injection) by removing the trigger condition: wikilinks now sweep at delete time alongside the existing `_id` cleanup, plus a latent scalar-form bug in the original 0.22.7 cleanup is fixed for only-child / only-spouse cases. #485 closes the `lat`/`lng`-only-on-pixel-CRS cluster that ran across [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) / [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) — all three journey-mode sites now use pixel coordinates correctly on `CRS.Simple` image maps. Reporter mix: @DigitalDreamn for #472 follow-up + #442 follow-up + #485 (via #474) + #488 Part 1; @doctorwodka for #476 follow-up; @Lemmeron for #489 (first report — welcome!).

### Fixed

- **Notes with custom non-person `cr_type` values no longer appear in the Person notes view** ([#489](https://github.com/banisterious/obsidian-charted-roots/issues/489)): A note with `cr_type: hex` (or any user-defined type the plugin doesn't know about) was being treated as a person and listed in the control center's Person notes browser. `FamilyGraphService.extractPersonNode` ran an *exclusion list* — checking for the known non-person types (source, event, place, organization, proof_summary, universe, citation) and treating any `cr_id`-bearing note that didn't match as a person. User-defined custom types like `hex` or `faction` fell through every exclusion and got coerced into people. Fix adds an explicit `isPersonNote` inclusion check after the exclusion list. `isPersonNote` already handles the unknown-`cr_type` case correctly (returns false when `cr_type` is set to anything other than `person`), while preserving the legacy "cr_id with no `cr_type` → treat as person" behavior for older vaults that pre-date strict type-tagging. Reported by @Lemmeron.
- **Edit Person modal's Universe dropdown now reflects renamed and newly-created Universe notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 1): The dropdown was sourced from the distinct `universe:` field values found across person and place notes — not from the actual Universe notes in the universes folder. Renaming a Universe note (e.g. `Star Wars` → `Star Wars (AU)`) left the dropdown showing the old name because no person/place file had been updated to reference the new name yet, and a freshly-created Universe note was absent from the dropdown until the first character was assigned to it. Reported by @DigitalDreamn. Fix unions `UniverseService.getAllUniverses()` (the authoritative universe-notes folder) into `getCachedUniverses` alongside the existing person-graph and place-graph extractions, so renamed and newly-created Universe notes appear in the dropdown immediately. Doesn't touch the deeper rename-cascade question — referencing notes still hold the old name in their `universe:` field until the user (or a future bidirectional rename-handler) updates them. Tracked as #488 Part 2.
- **Journey mode no longer briefly frames the bottom-left corner of `CRS.Simple` maps before flying to the first waypoint** ([#485](https://github.com/banisterious/obsidian-charted-roots/issues/485)): `MapView.applyJourneyFilter`'s initial `fitBounds` call read `marker.lat` / `marker.lng` only when computing the journey's framing rectangle. Pixel-coord places default `lat`/`lng` to 0, so on a custom image map (`CRS.Simple` / pixel coordinates) the bounds collapsed around `(0, 0)` — the bottom-left corner of the image — and the camera framed there briefly before `panToWaypoint` flew to the actual first waypoint. Reported by @DigitalDreamn during [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) verification on 0.22.10. Third site in the `#448 / #474` cluster (journey-path build dedup, camera fly-to and popup placement, now journey-mode framing — all the same lat/lng-only-on-pixel-CRS bug class). Fix mirrors #474's pattern: detect pixel CRS via `mapController.getCurrentCRS() === 'pixel'`, build bounds from each marker's `[pixelY, pixelX]` when available on pixel maps and from `[lat, lng]` otherwise. Geographic maps unaffected.
- **Negative birth years preserve sign when followed by a letter suffix** ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476) follow-up): @doctorwodka's 0.22.10 verification showed the fix worked for `-90` but not for the original `DE -5740ish` repro. The 0.22.10 standalone-negative regex required a trailing `\b` (word boundary) after the captured digits, which fires correctly between a digit and whitespace / punctuation / end-of-string but NOT between a digit and a letter — both are word chars, so no boundary. Without the boundary, suffixed forms like `DE -5740ish` failed the negative-detection branch entirely and fell through to the bare-digits fallback, which strips the sign. (`-90` happened to work because it took an earlier branch — the `^-(\d+)` ISO-negative rule — that has no trailing boundary requirement.) Replaced the trailing `\b` with `(?=$|[^0-9])` (lookahead for end-of-string or non-digit) so the negative-detection branch matches against any non-digit terminator. Also removed the duplicate `extractYear` implementation in the relationships renderer (a pre-existing bare `\b(\d{4})\b` regex that would have rendered any negative 4-digit year as positive in the relationships block — same class of bug as #476, on a different surface) and routed both call sites through the shared service helper. 3 new regression tests for the suffix case, the punctuation case, and the no-over-match case. Reported by @doctorwodka.
- **Person delete cleanup sweeps wikilink fields and handles single-relationship scalars** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up): Two gaps in the original 0.22.7 cleanup, both surfaced by @DigitalDreamn's verification on the Lars / Star Wars fixture. (1) The cleanup planner swept `*_id` arrays but not the parallel wikilink-bearing relationship fields (`father`, `children`, `step_child`, etc.) — the original implementation delegated wikilink cleanup to Obsidian's native rewriting, but Obsidian only rewrites wikilinks on rename, not on delete. Deleted persons left broken `[[placeholder]]` links in referencing notes' frontmatter, visible in the properties pane and a contributor to [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478)'s empty-string injection on the next save. (2) The "array" relationship fields are de-facto polymorphic: YAML serializers (and the plugin's own writer) emit a scalar string when the field has a single element, an array when it has multiple. The original cleanup's array-only branches silently skipped the scalar form, so deleting an only-child / only-step-child / only-spouse left the parent's `children_id` (or `step_child_id`, etc.) pointing at the dead cr_id. Fix extends the planner with a parallel wikilink-sweep branch (gated on the deleted file's basename) and converts every "array" field handler to accept both array and scalar shapes — array-form filters in place, scalar-form clears the key entirely if it matches. Wikilink matching handles path-prefixed (`[[Charted Roots/People/Foo]]`), display-aliased (`[[Foo|Bar]]`), heading-anchored, block-anchored, and `.md`-extensioned forms; comparison is case-insensitive to match Obsidian's own resolution. 24 new tests across scalar/array shapes, wikilink format normalization, polymorphic spouse handling, and combined sweeps.
- **Map path labels render upright on multi-waypoint paths via single-segment label-host** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472) follow-up): The 0.22.10 longest-segment-direction heuristic still left labels upside-down on some multi-waypoint paths — most visibly when two characters' journey paths shared the same visual segment in opposite traversal directions, where leaflet-textpath would render one label upright and the other inverted on the same line. Root cause: leaflet-textpath repeats the label along the entire polyline path and applies a single global 180° rotation when `orientation: 'flip'` is set. A path that bends in different screen-space directions can't be made upright everywhere by a single rotation — at least one segment will always render the label backward. No per-polyline flip decision can fix this when the path itself has segments pointing in different directions. Fixed by rendering labels on a separate invisible "label-host" polyline that covers only the longest screen-space segment of the source polyline, with `opacity: 0` and `weight: 0` so the line itself doesn't draw. The visible polyline keeps its full multi-waypoint shape; the label renders once per polyline on its longest segment with the correct flip decision; overlapping segments from different polylines each get their own correctly-oriented label. `shouldFlipPathLabel` is replaced by `findLongestScreenSegment` (returns segment endpoints plus screen-space points) and `createPathLabelHost` (builds the invisible host polyline and calls `setText` on it). Cleanup follows the existing `pathLayer` / `journeyLayer` `clearLayers()` teardown so no new tracking is needed. Supersedes the longest-segment-as-flip-heuristic from 0.22.10 (`2b4b3160`). Reported by @DigitalDreamn.

## [0.22.10] - 2026-04-27

Five fixes — three follow-ups to recent work plus two new bugs that surfaced during this week's website-capture sessions. All non-data-loss; stability window unchanged. Notable: #477 was a regression introduced by 0.22.9's #472 fix and caught + fixed within 24 hours. #480 is a sibling to [#453](https://github.com/banisterious/obsidian-charted-roots/issues/453)'s map time slider work — Calendar View was one more parallel year-rendering surface that hadn't been routed through `DateService`. Reporter mix: @DigitalDreamn for #459 follow-up + #472 follow-up + #477; @doctorwodka for #476; self-report (@banisterious) for #480 during the Calendar View capture session.

### Fixed

- **Calendar View accepts era-suffixed years and round-trips them on the navigation widget** ([#480](https://github.com/banisterious/obsidian-charted-roots/issues/480)): The Calendar View's year input was a bare `<input type="number">` constrained to `year > 0 && year < 10000`, displaying its value as plain `String(this.currentYear)` with no era awareness. Sibling to [#453](https://github.com/banisterious/obsidian-charted-roots/issues/453)'s map time slider work — the Calendar View's year-rendering surface hadn't been routed through `DateService`, so fictional-vault users saw "1499" rather than "1499 ABY" and couldn't enter descending-era values like "82 BBY" at all. Year input is now `type="text"`; the change handler routes input through `DateService.parseDate`, which accepts era-suffixed strings ("82 BBY", "1499 ABY", "30 AC"), ISO dates, and bare signed integers. When the parser resolves a fictional date, the system's universe is recorded alongside the canonical year so subsequent renders — including those after month-boundary rollovers — format via `formatCanonicalYear` for round-trip era display. Real-world years display as plain integers (current behavior preserved). Persisted state gains a `yearUniverse` field so era context survives view reopens. The `year > 0` constraint is dropped. Filed by @banisterious during the Calendar View capture session.
- **Negative birth years no longer flip positive on the timeline block** ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476)): `DynamicContentService.extractYear` handled four sign-bearing cases (BCE/BC suffix, ISO negative format like `-0011-01-15`, AD/CE suffix, and standard 4-digit years) but had no path for custom-era formats with an explicit standalone minus sign — for example, `DE -5740`. The 4-digit-year regex `\b(\d{4})\b` matched `5740` cleanly because `\b` (word boundary) eats the leading minus, dropping the sign and rendering the year as positive on the timeline block. Added a new `(?:^|[^0-9])-(\d+)\b` check that captures a digit run preceded by a standalone minus sign (one not preceded by another digit, so ISO separators like `1942-08-15` aren't mistaken for negatives). Placed between the existing ISO-negative branch and the 4-digit positive branch so existing positive-year cases are unaffected. New `tests/date-helpers.test.ts` cases (5) cover the custom-era prefix, mid-sentence negatives, short negatives (which fall outside the 4-digit branch), ISO date separators, and compound-word hyphens. Reported by @doctorwodka.
- **Console error spam from map path labels** ([#477](https://github.com/banisterious/obsidian-charted-roots/issues/477)): The 0.22.9 path-label fix passed `orientation: 'auto'` to leaflet-textpath as the no-flip branch, on the assumption that `'auto'` meant "follow path direction naturally." But leaflet-textpath@1.3.0 only recognizes `'flip'` (180°), `'perpendicular'` (90°), and numeric rotations — any other value falls through and is injected literally into the SVG `transform` attribute. The result was `transform="rotate(auto cx cy)"` — invalid SVG syntax, which the browser rejects with one console error per path label rendered. On dense maps with many migration / journey paths the console flooded with red. Fixed by omitting the `orientation` key entirely when no flip is needed; leaflet-textpath then skips its rotation block and the text follows the path geometry naturally (the behavior we'd assumed `'auto'` was producing). The screen-space flip decision from #472 is unchanged. As a side effect, paths the helper correctly identifies as not-needing-flip should now render cleanly instead of relying on the malformed transform; remaining label-orientation cases are still tracked under #472. Reported by @DigitalDreamn.
- **Map path label flip decision now segment-aware** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472) follow-up): The 0.22.9 fix introduced a `shouldFlipPathLabel` helper that picked between leaflet-textpath's `'flip'` and `'auto'` modes based on the path's screen-space chord (start point → end point). That helped most cases but missed paths where the chord direction disagrees with the segment where the label actually renders — leaflet-textpath places labels along the path itself, not along the chord, so multi-waypoint paths could have a chord pointing one way and a visible label segment pointing the other. Helper now finds the longest segment in screen-space and uses *its* direction; falls back to chord behavior naturally for 2-point paths since the only segment is the chord. Also defensively flattens `getLatLngs()` to handle the `LatLng[][]` multi-polyline case. Reported by @DigitalDreamn on her Star Wars galaxy map.
- **Create / Edit Place modal CSS overflow and coord-input width** ([#459](https://github.com/banisterious/obsidian-charted-roots/issues/459) follow-up): Two CSS issues left over from the 0.22.8 fix. (1) The `flex-shrink: 0` rule on `.crc-create-place-modal .setting-item-info` made the info column refuse to yield space when descriptions were long, so on narrower viewports the description text held its full natural width and pushed the 220px control column past the modal's right edge — inputs disappeared under the scroll bar. Dropped `flex-shrink: 0` so the info column shrinks (descriptions wrap to multiple lines on narrow modals) while keeping `min-width: 120px` for readability. (2) The 220px input-width rule was cascading into the Latitude/Longitude inputs in the coord-inputs section, which have their own `width: 100%` rule but were losing on specificity. Bumped the coord rule to `.crc-coord-inputs .setting-item-control input[type="text"]` so the rules tie on specificity and source order tilts the coord rule to win — Lat/Long inputs now fill their respective halves of the row again. Reported by @DigitalDreamn.

## [0.22.9] - 2026-04-26

Five fixes — all non-data-loss, all targeted, mostly map and timeline polish on top of 0.22.8. Continues the post-0.22.4 stability window without resetting it. Closes the **DateService-bypass cluster** that ran across 0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 (eight subsystems total, all era-aware now), adds a third surface to the **reality-window cluster** (sibling-births before focal birth), and wraps up the **pixel-coord coverage gaps** opened by [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448). Driven primarily by @DigitalDreamn's continued vault testing on the Lars / Star Wars fixture.

### Fixed

- **Journey-mode camera flies to pixel-coord waypoints on CRS.Simple image maps** ([#474](https://github.com/banisterious/obsidian-charted-roots/issues/474)): `panToWaypoint` only consulted `waypoint.lat` / `waypoint.lng` for the camera fly-to and rich-popup placement. Pixel-coord places default lat/lng to `0` (per the journey waypoint construction), so the camera flew to `(0, 0)` — bottom-left corner of `CRS.Simple` — and the popup opened there too, even though the popup *content* correctly named the right place. Now uses `[pixelY, pixelX]` when on pixel CRS and the waypoint has pixel coords; falls back to `[lat, lng]` for geographic maps. Same coord-system-aware pattern as [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) (which fixed the journey-path *build* path; this fixes the camera-follow path). Reported by @DigitalDreamn during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification, after #448 unblocked pixel-coord journeys and made the camera-mismatch newly visible.
- **Older siblings' births no longer appear before the focal person's birth on their timeline** ([#469](https://github.com/banisterious/obsidian-charted-roots/issues/469)): The sibling-births block in `gatherFamilyEvents` had no reality-window guard for events predating the focal person's birth. An older sibling's birth would render as the first entry on the focal person's timeline — Padmé Naberrie's timeline showed her older sister Sola's birth (50 BBY) above Padmé's own birth (46 BBY). Added a symmetric `isEventBeforeFocalBirth(focalBirthDate, eventDate, universe)` helper mirroring [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)'s `isEventAfterFocalDeath`, and applied it to the sibling-births iteration. Same-year siblings (twins, close-births) still surface — guard fires only on unambiguous before-focal-birth via `DateService.getCanonicalYear` so fictional descending eras (BBY) compare correctly. Reported by @DigitalDreamn.
- **Place notes silently excluded from the place graph now log a warning** ([#471](https://github.com/banisterious/obsidian-charted-roots/issues/471)): `PlaceGraphService.extractPlaceNode` early-returns when a place-shaped note lacks a `cr_id`, so such notes never enter `placeCache`. By-name lookups (`getPlaceByName`), Create Place modal's parent dropdown, map markers, and downstream consumers can't see them. The exclusion was completely silent — no log, no UI surface, no data-quality flag — making the failure mode hard to diagnose. Added a `warn`-level log on the skip with the file path so the exclusion is discoverable from the dev console. Surfaced during [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464) investigation as one of the candidate root causes for "by-name lookup returned undefined for a place that exists in the vault." A follow-up data-quality wizard check that surfaces and offers to fix missing-cr_id places is queued for a later cycle.
- **Map path labels read consistently upright across CRS.Simple image maps and geographic maps** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472)): leaflet-textpath's `'flip'` orientation mode picks rotation based on latlng coordinates directly, which produces inconsistent results on diagonal lines and on `CRS.Simple` image maps where coordinate orientation differs from screen orientation. Some labels rendered upright, others upside-down, on the same map. Added `shouldFlipPathLabel(polyline)` helper that computes the path's overall direction in screen-space (after CRS projection via `latLngToLayerPoint`) and chooses `'flip'` or `'auto'` accordingly. Both migration-path and journey-path label callsites now use it. The pre-existing leaflet-textpath flip path becomes a fallback for the unlikely case where the map ref isn't yet wired. Reported by @DigitalDreamn on her Star Wars galaxy map after [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) unblocked pixel-coord journey rendering and made the label feature visible for the first time on her vault.
- **Map time slider derives its year range from the data and renders era-formatted labels** ([#453](https://github.com/banisterious/obsidian-charted-roots/issues/453)): The map's "who was alive at year X" time slider had hardcoded `min='1800'` / `max='2000'` slider attributes and label text, which made the feature unusable for fictional-era universes (Star Wars BBY/ABY, Middle-earth TA/SA, etc.) — the slider was locked to a real-world span that didn't intersect the data. Two parts fixed: (1) the slider's min/max attrs are now derived from `MapData.yearRange` (which already computes correctly via the [#454](https://github.com/banisterious/obsidian-charted-roots/issues/454) fix, returning canonical signed years for fictional eras); (2) a new `DateService.formatCanonicalYear(year, universe)` helper inverts canonical years back to era-formatted strings ("82 BBY", "5 ABY") for slider min/max labels and the current-year display. Real-world dates and unconfigured universes fall back to `String(year)` cleanly. **Eighth and final DateService-bypass cluster site closed** since the cluster started in 0.22.5. Reported by @DigitalDreamn during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification.

## [0.22.8] - 2026-04-26

Nine fixes addressing eleven issues — biggest patch yet, all non-data-loss. Continues the post-0.22.4 stability window without resetting it. Driven primarily by @DigitalDreamn's continued vault testing on the Lars / Star Wars fixture; @doctorwodka contributed the marriage-stats report.

### Fixed

- **Statistics Dashboard date-inconsistency counter respects fictional eras** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) follow-up): The 0.22.6 fix routed `data-quality.ts`'s `parseYear` through `DateService` for fictional-era awareness, but the **Statistics Dashboard** has a parallel "Date inconsistencies" counter inside `StatisticsService` that uses its own `extractYear` regex with no era-awareness. Result: for BBY-style descending eras the digit-run got read as a positive number (`1045 BBY` → 1045, `1042 BBY` → 1042) and the naive `birthYear > deathYear` check fired even though the lifespan is coherent. `StatisticsService.extractYear` now defers to `DateService.parseDate` first so fictional dates resolve to their canonical signed year (negative for descending eras), matching the data-quality and map-data-service fix shapes from [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) and [#454](https://github.com/banisterious/obsidian-charted-roots/issues/454). Real-world dates fall through to the existing regex unchanged. Reported by @DigitalDreamn — the red error bar persisted on her vault after 0.22.7 because this surface is a separate code path from the original [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) fix.
- **Map popups for custom (`cr_type: event`) markers surface the original event type instead of a generic `Custom:` label** ([#466](https://github.com/banisterious/obsidian-charted-roots/issues/466)): When an event's `event_type` didn't match a built-in `MarkerType` (e.g., `backstory`, `migration` on a fictional-era timeline), it was resolved to `custom` for marker classification. The popup then rendered the literal `Custom: <date> (age N)`, dropping the category context the user had authored. Now `LifeEvent` and `MapMarker` carry an optional `customLabel` field populated from the raw event type (for inline events) or the event-note's `eventType` / `title` (for external `cr_type: event` notes); the popup renders `<originalType>:` when the resolved type is `custom` and a label is available, falling back to `Custom:` only when neither is set. Built-in event-type popups (birth, death, marriage, etc.) are unchanged. Reported by @DigitalDreamn during [#438](https://github.com/banisterious/obsidian-charted-roots/issues/438) verification.
- **Custom event marker color is now visually distinct from death event markers** ([#465](https://github.com/banisterious/obsidian-charted-roots/issues/465)): The default marker color for `cr_type: event` ("custom") map markers was pink (`#ec4899`), close enough to the death-event red (`#ef4444`) that scanning the map for one type vs. the other was harder than it should be. Changed the default to yellow (`#eab308`), which sits clearly outside the warm-red cluster while staying distinguishable from every other existing marker color (including the orange `occupation` marker — 23° hue separation). Map color settings aren't user-persisted yet, so this change applies on next plugin load with no migration needed. Reported by @DigitalDreamn during [#438](https://github.com/banisterious/obsidian-charted-roots/issues/438) verification.
- **Create Place modal recognizes parents created earlier in the same session and writes their cr_id** ([#463](https://github.com/banisterious/obsidian-charted-roots/issues/463), [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464)): Two bundled bugs reported by @DigitalDreamn, both rooted in a stale `placeGraph` cache. `PlaceGraphService.ensureCacheLoaded` only loads when the cache is empty, so newly-created place notes weren't visible to subsequent Create Place modal invocations in the same session. Symptoms: (a) typing an existing parent's name produced a spurious "<parent> doesn't exist" auto-create prompt ([#464](https://github.com/banisterious/obsidian-charted-roots/issues/464)); (b) saving anyway wrote only the `parent_place` wikilink without the companion `parent_place_id`, leaving a dual-storage half-write that only resolved after a subsequent Edit + Save round trip ([#463](https://github.com/banisterious/obsidian-charted-roots/issues/463)). Same class as the create/edit asymmetry meta-pattern called out in [#411](https://github.com/banisterious/obsidian-charted-roots/discussions/411). Two-part fix: refresh the cache when the modal opens, and resolve a typed parent name to its cr_id in `checkForMissingParent` before the auto-create branch fires (also suppresses the false-error path since the by-name lookup now hits).
- **Create Place modal text inputs render at consistent widths** ([#459](https://github.com/banisterious/obsidian-charted-roots/issues/459)): Universe and Parent place text inputs were noticeably narrower than Name, Aliases, and Collection in the same modal. Long descriptions on those rows ("For fictional/mythological places: the world or story it belongs to" and "The parent location in the hierarchy") pushed the info column wider, and the existing `flex-shrink: 0` rule meant the description section couldn't yield space back to the control column. Set a fixed 220px width on text inputs in the modal so all rows align regardless of description length. Reported by @DigitalDreamn.
- **Timeline filters relative events outside the focal person's reality window** ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456), [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)): Two related leaks where a person's Timeline block surfaced events that didn't fit their lived experience. Step-siblings' births appeared on each other's timelines because the sibling-iteration walked each parent's `childrenCrIds` without distinguishing biological from step-children — Anakin's timeline showed Owen's birth even though they share only a stepparent ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456)). And spouse deaths surfaced on the survivor's timeline even when the survivor pre-deceased the spouse — Shmi's timeline showed Cliegg's death even though Shmi died first ([#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)). Same class of bug, paired fix: a step-sibling filter mirroring the [#441](https://github.com/banisterious/obsidian-charted-roots/issues/441) stepchild treatment, plus a focal-death reality-window guard via a new `isEventAfterFocalDeath` helper that uses `DateService.getCanonicalYear` so fictional descending eras (BBY) compare correctly. Audit covered parent deaths in the same pass — those now also skip when the parent died after the focal person did. Reported by @DigitalDreamn during [#441](https://github.com/banisterious/obsidian-charted-roots/issues/441) and [#447](https://github.com/banisterious/obsidian-charted-roots/issues/447) verification.
- **Marriage statistics respect the fictional-dates age cap** ([#458](https://github.com/banisterious/obsidian-charted-roots/issues/458)): Two marriage-stat surfaces (age at first marriage in the Marriage Patterns analysis, marriage duration in the Longest Marriages records category) had a hardcoded `<= 80` upper bound that bypassed the `maxAge` getter the rest of the statistics engine uses. With `enableFictionalDates` on, that cap was supposed to lift to `Infinity` so long-lived characters (Tolkien elves, fantasy long-lived races, etc.) could contribute; instead it stayed at 80, silently dropping any marriage age over that threshold. Both sites now defer to `this.maxAge`. Real-world cap widens 80 → 120 to match the lifespan cap used elsewhere in the engine (a marriage at 86 — Hugh Hefner's last — now counts in real-world stats too). Reported by @doctorwodka.
- **Map year extraction respects fictional eras** ([#454](https://github.com/banisterious/obsidian-charted-roots/issues/454)): `MapDataService.extractYear` required a 4-digit numeric year, so fictional-era timestamps under 1000 like `82 BBY` / `41 BBY` parsed as `undefined`. That broke chronological sort on fictional-era timelines, dropped events from year-range filters, and downstream caused the "no journey path built" symptom on fictional-calendar maps before [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) was identified. `extractYear` now defers to `DateService.parseDate` first, picking up the canonical signed year (negative for descending eras like BBY) so the existing numeric comparisons stay coherent across fictional eras and era crossings. Falls back to the legacy 4-digit regex when DateService isn't available. Real-world dates unchanged. Same DateService-bypass class as [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433), [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434), [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439), and [#444](https://github.com/banisterious/obsidian-charted-roots/issues/444).
- **Person-delete cleanup now sweeps the `step_child_id` field on stepparents' notes** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up): The delete-cleanup planner shipped in 0.22.7 listed `stepchild_id` (no underscore) in its scan list, but the bidirectional-linker — the only code that writes the stepchild→stepparent reverse-link onto a stepparent's frontmatter — uses `step_child_id` (underscore between `step` and `child`). The two never matched, so deleting a person who was a stepchild on someone else's note left their cr_id stranded in the stepparent's `step_child_id` array even though every other relationship array got cleaned. Renamed the entry to `step_child_id` in [src/core/person-delete-cleanup.ts](src/core/person-delete-cleanup.ts) so the cleanup matches the field the rest of the plugin actually writes; the dropped `stepchild_id` form was a phantom, never written by anything. Reported by @DigitalDreamn during 0.22.7 verification.
- **Custom-relationships overlay arcs paint on top of the family-link layer in the typical case** ([#450](https://github.com/banisterious/obsidian-charted-roots/issues/450)): On multi-generational trees, the overlay's downward arcs route through the children-row link bundle and were silently hidden behind it. The original "always paint under family links" decision from [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) was meant to protect structural lines from being occluded by heavy overlay stacks (3+ arcs on a single endpoint pair), but it also hid the typical case where only one or two non-stacked arcs exist. Now `family-chart-view` paints the overlay group ON TOP of `links_view` by default and falls back to the original "under" behavior only when at least one endpoint pair has 3+ overlay arcs stacked on it (after structural-counterpart restyling drops in-place styled links from [#404](https://github.com/banisterious/obsidian-charted-roots/issues/404)). The [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) heavy-stack guarantee is preserved; non-stacked arcs are no longer hidden. Surfaced during a Custom Relationships Overlay motion-capture demo setup that exposed the visual on a real-world Anderson family fixture.
- **Map journey paths build correctly for pixel-coord places** ([#448](https://github.com/banisterious/obsidian-charted-roots/issues/448)): On custom image maps, every place uses pixel coordinates (`custom_coordinates_x` / `pixel_x`) and has no lat/lng — but `MapDataService.buildJourneyPaths` dedupes consecutive waypoints by comparing only `lat` and `lng`, which the waypoint construction defaults to `0` for pixel-coord places. The result: every pixel-coord waypoint shared `(0, 0)`, the dedup collapsed all of them into a single entry, and the `≥ 2 unique waypoints` check failed silently. For DigitalDreamn's Star Wars universe (Tatooine + Ator + Alderaan + Naboo + Tatooine across Cliegg Lars's life), no journey ever built. Replaced the lat/lng-only comparison with `journeyWaypointDedupKey`, which prefers `placeId` when available and falls back to a composite of both coordinate systems so neither collides with the other system's defaults. Geographic-map vaults are unaffected — same waypoints before and after. Surfaced during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification.
- **Wikipedia clipper template renders infobox photos correctly in Obsidian** ([#440](https://github.com/banisterious/obsidian-charted-roots/issues/440)): The `wikipedia-biography-basic.json` clipper template preserved infobox HTML with protocol-relative image URLs (`<img src="//upload.wikimedia.org/...">`). Browsers resolve protocol-relative URLs via the page's protocol, but Obsidian's `app://` renderer can't follow them — infobox photos rendered as broken-image icons in reading mode. Added a `replace` filter to the `selectorHtml:.infobox` extraction that rewrites `="//` to `="https://` so the preserved HTML carries valid absolute URLs. Re-import the template in Web Clipper to pick up the fix; not part of a versioned plugin release since clipper templates ship via `docs/clipper-templates/`.

---

## [0.22.7] - 2026-04-25

Seven changes across the map, timeline, profile view, and a new universe → calendar link. Six were follow-ups from @DigitalDreamn's testing — three from the post-#434 reply chain (#444, #445, #446), three from the #439 verification follow-up that surfaced relationship-array gaps (#441, #442, #443) — plus the #432 Phase 1 universe-calendar wiring and a small default flip (#447). All non-data-loss; stability window continues from 0.22.4 unchanged (2026-04-23 → ~2026-05-14).

### Added

- **Universe wizard and Edit Universe modal can link a default calendar** ([#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) Phase 1): The Universe setup wizard's step 2 now offers a three-way calendar picker — **None**, **Built-in calendar** (dropdown of Galactic Standard, Middle-earth, Westeros, Generic Fantasy Ages), and **Custom calendar** (the existing custom-calendar editor) — replacing the old binary "create custom calendar?" toggle. When the universe name slug-matches a built-in's universe field, that built-in is preselected (e.g., "Star Wars" → Galactic Standard, "Middle-earth" → Middle-earth Calendar, "Star Wars Legends" still resolves via slug-superset matching). The Edit Universe modal gains a matching Calendar field listing all built-ins plus any user-defined custom calendars from settings, with `(unset)` clearing the link. The Universes tab table surfaces the linked calendar as a sub-line under the entity counts. Selections write to the universe note's `default_calendar` frontmatter field; the parser is unchanged and continues to use global era-abbreviation matching at parse time (a layered contract per [docs/planning/universe-calendar-linking.md](docs/planning/universe-calendar-linking.md)). Existing universes with no `default_calendar` continue to behave as before — no migration. Phase 2 (parser-side reading of the link, bare-year inference) is deferred to a separate issue.

### Changed

- **Spouse death events now appear on the surviving spouse's timeline by default** ([#447](https://github.com/banisterious/obsidian-charted-roots/issues/447)): Flipped `timelineShowSpouseDeaths` from `false` to `true` so widow/widower context surfaces on the timeline dynamic block without requiring users to discover the setting. A spouse's death is a major life event for the survivor; previously the only place it surfaced automatically was the Properties panel. The setting toggle is unchanged — users who'd prefer to hide spouse deaths can still opt out from Settings → Charted Roots → Timeline. Existing users who haven't customized the setting will start seeing spouse deaths appear on surviving spouses' timelines after upgrading.

### Fixed

- **Deleted persons' cr_ids are removed from referencing notes' relationship arrays** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442)): When a person note was deleted, Obsidian rewrote the wikilink references on other notes (`father:` / `mother:` / `spouse:` / etc.) but left the parallel `*_id` arrays carrying orphaned cr_id strings (`father_id`, `stepchild_id`, `children_id`, etc.). Downstream code — timeline gathering, family chart, exports — would then try to resolve the dead ids and silently drop or mishandle the referencing person, masking other bugs and leaving residue across the vault. Charted Roots now registers a `metadataCache.on('deleted')` handler that, when a person note is removed, scans every other person note's `*_id` fields and removes the deleted cr_id from any matches. Covers all canonical fields (parents, step-parents, adoptive parents, adopted children, stepchildren, partners, children, indexed-spouse slots) plus user-aliased equivalents. Existing vault-wide orphans can still be cleaned via the existing data-quality "Remove orphaned cr_id references" tool. Reported by @DigitalDreamn during [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439) verification.
- **Stepchildren's birth events no longer appear on stepparents' timelines** ([#441](https://github.com/banisterious/obsidian-charted-roots/issues/441)): The Timeline dynamic block on a person's note showed birth events for the person's stepchildren under the "Show children's births" toggle (e.g., Cliegg Lars's timeline displayed "Birth of Anakin Skywalker" even though Cliegg married Anakin's mother after Anakin was born; Shmi's timeline showed "Birth of Owen" even though Owen is Cliegg's biological son). `gatherFamilyEvents` iterated `person.childrenCrIds` directly, and vault data commonly lists both biological and step children in that array — the principal-only filter that already exists for explicit event notes wasn't being applied at the relationship-array layer. Family-graph now derives `stepchildrenCrIds` on each parent by inverting the children's `stepfatherCrIds` / `stepmotherCrIds` (mirroring the existing `adoptedChildCrIds` reverse-walk), and the timeline's children-births block skips any id present in the new array. Adopted-children handling and the existing biological-child path are unchanged. Reported by @DigitalDreamn during [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439) verification.
- **Stepchildren are now visibly labeled in the Entity Profile View** ([#443](https://github.com/banisterious/obsidian-charted-roots/issues/443)): The Profile pane's relationships section listed stepchildren under the generic "Child" label, asymmetric with adopted children which already render as "Adopted child." A child can validly appear in multiple arrays (biological + step is the common case from the Lars / Skywalker setup that surfaced the bug), so the Children block now de-duplicates by labeling adopted and step children with their specific category and falling back to "Child" only when neither marker applies. Same data-model change powers the [#441](https://github.com/banisterious/obsidian-charted-roots/issues/441) timeline fix above. Reported by @DigitalDreamn during [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439) verification.
- **Map journey mode explains why playback isn't available instead of failing silently** ([#445](https://github.com/banisterious/obsidian-charted-roots/issues/445)): Entering journey mode for a person who didn't have at least 2 places with valid coordinates left the marker filter applied and the toolbar chip showing — but no playback panel appeared at the bottom of the map, with no Notice or message explaining why. `MapDataService.buildJourneyPaths` only includes a person when they have ≥ 2 unique resolvable waypoints, so persons with one resolvable place (or none) were silently skipped by `applyJourneyFilter`. `MapView` now renders an inline placeholder where the playback panel would have appeared, naming the person and stating that they need at least 2 places with valid coordinates. The placeholder reuses the same teardown path as the playback controls, so exiting journey mode clears it cleanly. Surfaced during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification.
- **Map fullscreen control shows correct tooltip** ([#446](https://github.com/banisterious/obsidian-charted-roots/issues/446)): The fullscreen toggle button below the map's zoom controls displayed the literal text "undefined" as its hover tooltip instead of "Enter fullscreen" / "Exit fullscreen." `MapController.initializeFullscreen` was passing `title` as a flat string, but `leaflet-fullscreen@1.0.2` expects an object keyed by fullscreen state (`{ 'false': ..., 'true': ... }`); the plugin's internal `options.title[isFullscreen]` lookup returned `undefined`, which got rendered verbatim. Click behavior was unaffected. Fixed by passing the option in the shape the plugin expects.
- **Map marker popups show ages and full date ranges** ([#444](https://github.com/banisterious/obsidian-charted-roots/issues/444)): Clicking an individual marker on the map view (residence, death, marriage, etc.) opened a popup that showed the person's name, event type, and a single date — but no age annotation, and for events with a `date_to` the end date was silently dropped. For Shmi Skywalker Lars dying at 22 BBY (born 72 BBY), the popup read `Death: 22 BBY` with no indication that she was 50; for a residence at Ator from 64 BBY to 22 BBY it read `Residence: 64 BBY` with the duration cut. `createPopupContent` in `MapController` now formats the date row through a new `formatPopupDateRange` helper that renders true durations as `from – to` and appends `(age N)` for non-birth events when `DateService.calculateAge` resolves a non-negative age — handles real-world ISO dates, BBY/ABY fictional eras, and era crossings via the same path the journey-mode rich popup already uses. Birth events suppress the age annotation since age 0 is redundant alongside the birth date itself. The marker now carries a `birthDate` field populated from `person.born` in both marker construction paths (dedicated-frontmatter and `events:` array entries). Sibling fix to [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434), which fixed the journey-mode rich popup — same fix shape on a separate code path; fifth surface in the DateService-bypass cluster alongside [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433), [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), and [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439).

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
