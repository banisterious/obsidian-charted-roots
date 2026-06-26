# Changelog Page Refresh — draft

> **Goal:** chartedroots.com `/changelog/` is a curated presentation layer over the wiki's [`Release-History.md`](../../../wiki-content/Release-History.md). Top 3-5 user-facing highlights per wiki Round-Up, ~one paragraph each, with a **"Read the full release notes →"** link to the matching Round-Up anchor on the wiki. Internal arcs (scan-cleanup, ESLint hygiene, bundle pipeline) fold into a collapsed "Internal-only releases" block per cluster, or get omitted. Older clusters (v0.21.x, v0.20.x, v0.19.x) are already in roughly this shape and pick up wiki backlinks without re-drafting.

**Target page:** `/changelog/_index.md` on chartedroots.com
**Source material:** [wiki Release-History.md](../../../wiki-content/Release-History.md) (canonical longer-form), [CHANGELOG.md](../../../CHANGELOG.md) (per-release detail).
**Last ported:** 2026-06-20, commit `59f3059` on chartedroots.com@main (v0.22.69 through v0.22.73 Round-Up spotlights + cluster-intro metric bumps to seventy-four releases / 1569 tests at v0.22.73; scanner-streak prose carried through v0.22.73's clean post-release scan).
**Pending port (next session):** the **v0.22.74** and **v0.22.75 Round-Up** spotlights (both drafted below) plus the cluster-intro updates that accompany them — release count seventy-four → seventy-six, test count 1569 / v0.22.73 → 1618 / v0.22.75, the new v0.22.74 and v0.22.75 narrative sentences, and the scanner-streak extension through v0.22.75's clean post-release scan. Standing **verify-before-publish** reminders: the stability-window anchor (still v0.22.59, no resets through v0.22.75) and the scanner-streak prose against the #411 tracking.

---

## Authoring notes

- **Per-Round-Up grouping.** One H3 per wiki Round-Up event. Multi-release Round-Ups (e.g., v0.22.40-v0.22.42, v0.22.32-v0.22.37) stay as one H3 covering the arc.
- **User-facing filter.** Features, bug fixes a user can feel, UI changes, doc surfaces. Skip pure refactors, ESLint work, scan-response that doesn't reach the user.
- **3-5 paragraphs per Round-Up.** Each ~3-5 sentences, opening with the user-visible change. Issue numbers linked for traceability. Internal architecture lives in the wiki, not here.
- **Wiki backlink** closes each Round-Up: `**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#<anchor>)**`.
- **Internal-only Round-Ups** (no user-facing surface) get a single collapsed "Internal-only releases" entry at the end of each cluster.
- **Editorial style:** no em-dashes (colons / commas / periods), ASCII arrows (`->`) instead of Unicode (`→`) in code-shape contexts, keep backticks only for code identifiers.
- **Older clusters** (v0.21.x and earlier) keep their existing feature-headline shape, with wiki backlinks added alongside any existing features-page cross-links.
- **Cluster intro** for each major cluster: one paragraph framing the theme plus release count / tests / patches-without-reset metrics. No per-release detail in the intro.

---

## Draft content

Everything below this line is intended as the website page body. Hugo frontmatter (`title`, `description`, `date`, etc.) is added during the port.

---

# Changelog

For the full per-release log, see [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases) or the canonical [wiki Release History](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History). This page groups headline user-facing changes by release.

---

## v0.22.x: Stability run before 1.0

The stability run before Charted Roots 1.0. Seventy-six releases across the cluster: four same-day hotfixes (v0.22.1 through v0.22.4) closed critical data-loss bugs from community testing; the fictional-calendar work matured across v0.22.5 through v0.22.10; map coverage and reliability hardened across v0.22.7 through v0.22.14; the wikilink-writer hardening, bidirectional-sync audit, and architectural pattern work unfolded across v0.22.22 through v0.22.29; and Obsidian's Community Plugins automated review surfaced a multi-release cleanup arc running from v0.22.32 through v0.22.45 alongside ongoing feature work. A new stability window opened at v0.22.46 after a data-loss surface (#606) reset the previous v0.22.22-anchored run; v0.22.47 ships focused fixes built on that window, v0.22.48 ships a reporter-driven enhancement + correctness pass on top of it, v0.22.49 adds adoption-event coverage symmetry on the sibling and grandparent timelines plus an era-aware twin tiebreak and a settings reorganization, v0.22.50 relaxes the date parser to accept bare 1-3 digit years (closing an age-rendering bug for custom fictional-era calendars), makes adopted-sibling and adopted-grandchild adoption events always-on, and lands the first sub-arc of the audit Phase 4b mobile migration, v0.22.51 closes three fictional-date and timeline-ordering papercuts on the heels of v0.22.50 (inline approximation markers, per-person Timeline before/after ordering, and era-prefix preservation on ISO month/day suffixes), v0.22.52 closes two UI consistency papercuts (the focal person's own `Adopted` event row now renders with an icon, and the Edit Person modal recognizes single-letter sex markers and writes the same canonical GEDCOM-aligned form as Profile View), v0.22.53 closes five community-reported papercuts and lands the project's first accepted external code contribution (a Family Chart custom-relationship overlay self-heal after refresh, adoption-event icon continuity across the family-timeline surfaces, "Not a duplicate" dismissals that persist across sessions, a Calendar view month-and-year filter contributed by @MohammadYusif in #636, and a Merge Duplicate Places help-link 404 fix), v0.22.54 closes four reporter-driven UX papercuts across the Statistics Dashboard, the Relationships tab, the Dynamic Timeline Block, and the Control Center settings layout, v0.22.55 is a security-only patch bumping `jspdf` from 3.0.4 to 4.2.1 and `dompurify` from 3.3.0 to 3.4.7 to clear 18 dependency advisories surfaced by the v0.22.54 automated scan, v0.22.56 closes the Events tab Statistics card's fictional-date event count (so event notes now count alongside person notes for the fictional-date total) and strips an unreachable jspdf bundle code path that the v0.22.55 dep bump surfaced to the scanner, and v0.22.57 closes a reporter-driven cohort of eleven issues spanning fictional-date parsing (negative years, decade notation, custom-calendar attribution), the Events tab statistics, the Entity Profile views, and a new organization↔event link. v0.22.58 re-fixes several of those v0.22.57 issues that turned out to have a second render or save surface (fictional-date attribution, event aliases, the timeline export filter, and the Create/Edit Event Organizations field), plus a High Contrast connector-line fix and an opt-in sibling-marriage timeline toggle; and v0.22.59 fixes a children-list data-integrity bug (a data-loss-class fix, with a new Data Quality repair tool, that reset the v0.22.46 stability window to a new v0.22.59 anchor) and rebuilds the Family Chart Circle card style. v0.22.60 follows with a Family Chart card-legibility pass (long names wrap on the rectangular card styles, Circle widens to fit, the rectangle card is more compact, and the Pastel theme and Highlight Groups read correctly in every theme), plus a co-parent repair follow-up to the #666 tool and person-filtered export naming. v0.22.61 follows with an event-driven rewrite of the Statistics Dashboard migration analysis (movement events — Residence / Immigration / Emigration — instead of birth → death, so living migrants count and a place and its parent aren't treated as a move), historical-name preservation when merging duplicate places, and a run of Family Chart fixes (Circle avatars stay round and the chart no longer blanks on refresh in a pop-out window, and the tree re-compacts when cards shrink), alongside a Statistics Dashboard missing-births accuracy fix, symmetric custom-relationship cleanup on deletion, and distinguishing single-lineage export filenames. v0.22.62 polishes three reporter-flagged papercuts (the Statistics Dashboard issues card names only the categories that actually have something to fix, the Split canvas wizard's completion screen lays out correctly, and Family Chart Circle avatars keep their colored ring after fit-to-view) while adopting Obsidian 1.13.0's settings and button APIs behind a version guard, with no visible change on current releases. v0.22.63 is a reporter-driven follow-up: GEDCOM and GEDCOM-X imports keep generational name suffixes (Sr. / Jr. / III) so same-named relatives stay distinct, clearing a birth or death place in the Edit Person modal removes it on save, the event-driven migration analysis gains three accuracy refinements, Family Chart highlight groups no longer paint dimmed cards beneath the connector lines, and the person modal gains a burial date field while image crop regions move to flat properties. v0.22.64 restores the Family Chart focus indicator (it now takes the theme accent colour instead of the card text colour) and makes highlight groups work in a pop-out window, rewrites the Top migration routes to count each move a person made rather than only the net birthplace-to-final journey, and consolidates variant GEDCOM spellings of one place into a single note with historical names stored flat. v0.22.65 brings the Dynamic Timeline Block in line with fictional calendars (context-note events written in eras like BBY/ABY now display, and a timeline that mixes eras sorts and filters by true chronology), shows event icons consistently and by default, stops the Family Chart from labelling unmarried co-parents as spouses, writes the reverse parent link when a child is added from a parent's Edit Person modal, and warns before a very large import. v0.22.66 brings two timeline display options (a person's inline events list now appears alongside births and deaths, and rows can show a place's parent location so "Born in London" reads "Born in London, England"), an always-available living-status control in the Person modal, a whole-life context-margin window, and a run of organization, custom-relationship, and Family Chart refinements. v0.22.67 is a small reporter-driven patch (Family Chart highlight dimming no longer shows the connector lines through dimmed cards, and the relationships filter now labels custom relationship categories) landed alongside a codebase-wide type-checking pass that brings the TypeScript source to zero type-check errors with the check now gating CI, clearing two latent bugs (the Find related research command and the GEDCOM-X export count) along the way. v0.22.68 brings Organizations to parity with Universes (inline "+ New organization" in the membership modal, and orphan-organization adoption in the Control Center mirroring orphan universe values), adds configurable timeline place-context depth up to the full location hierarchy with wrapping for deep places, adds name-prefix / suffix / surname-particle fields to the Person modal, and restores the settings tab that rendered blank on Obsidian 1.13.1. v0.22.69 closes a reporter-driven date-and-ordering cohort (GEDCOM import understands many previously-dropped date formats and flags ambiguous ones in the preview, Compute sort order stops reporting phantom cycles for reciprocal before/after pairs and opens an inspectable result for real loops, fictional/era dates keep month and day, the Statistics date range counts death years, and timeline place context uses a place's name rather than its filename). v0.22.70 makes Calendarium calendars appear throughout the plugin (with the integration's settings moved beside them), stops place linking from spawning a duplicate when a place's display name differs from its filename, and makes the Statistics date range era-aware and grouped per universe so fictional dates no longer pollute the span. v0.22.71 overhauls place type management (per-category "+ Add type" with smart level defaults, and up/down reordering of categories and the types within them) and resolves display names instead of raw ids across the universe blocks, the Place Statistics card and pickers, and the Entity Profile pane, alongside an organization-member foreign-`type` fix and an "Uncategorized" Statistics bucket for universe-less fictional dates. v0.22.72 is a patch fixing two v0.22.71 regressions and a crash (organization members identified only by `cr_id` are listed again, the timeline no longer crashes on a bare-number date, and the parent-place dropdown shows display names), refines place-type reordering to preserve intentional ties and gaps with gear/pencil action icons, and bumps the bundled dompurify to 3.4.10 for a security advisory. v0.22.73 adds a marriage type field for spouse relationships, makes place-type hierarchies easier to grow upward (insert a type above an occupied level and push the rest down, plus icon row controls), ensures the Edit Person modal tags a note as a person, sorts Entity Profile memberships by start date, and clears a cluster of map and Entity Profile fixes for mixed real-world/fictional vaults (fictional events stay off the real-world map, place categories show their label, and map errors surface the real message), with another dompurify bump for a fresh advisory. v0.22.74 adds a default universe that applies itself to new notes when their universe field is left empty, adds a "Create family" entry to the person right-click menu that opens the family wizard pre-anchored on that person, fixes a map crash on an event with a non-text type, stops collections and universes from duplicating when typed as wikilinks, and makes the place-type "insert above" choice reliably take effect. v0.22.75 gives GEDCOM import per-format control over how ambiguous and event-labelled dates are read, brings living characters into the record superlatives (aged against a new per-universe current date), and adds a Data Quality check that finds and one-click-fixes type fields stored as numbers or dates, alongside fixes for hand-grouped family merging in the Collections tab, the default universe reaching people created outside the Create Person modal, post-create relationship actions, and multi-value collections. Regression tests grew from 189 at v0.22.0 to 1618 at v0.22.75. Obsidian's Community Plugins automated review held at 96 / 100 across seven consecutive releases (v0.22.48 through v0.22.53) before v0.22.54 surfaced the first dependency findings on a Charted Roots release; v0.22.55 cleared those findings via a dep bump but introduced one dynamic-script-element finding from jspdf 4.x's bundled output, v0.22.56 patched that code path so the scanner returned to the prior v0.22.53 baseline, v0.22.57 and v0.22.58 held at that baseline, and v0.22.59's post-release scan surfaced one advisory CSS warning (clip-path partial support, from the Circle card rebuild), which v0.22.60 cleared by moving the avatar clip to an SVG clip path, returning the post-release scan to the 96 / 100 baseline. v0.22.61's post-release scan then surfaced an ESLint directive error and Obsidian 1.13 API deprecation advisories, which v0.22.62 cleared via a scan-cleanup pass and the 1.13.0 dual-path; v0.22.63 held at the baseline; v0.22.64's post-release scan surfaced one no-unsafe-assignment warning from the new historical-names parsing, which v0.22.65 cleared; v0.22.65's own post-release Community scan came back clean; and v0.22.66 held at the 96 / 100 baseline with a clean post-release scan. v0.22.67's post-release scan surfaced one finding (an unnecessary-type-assertion pair), which v0.22.68 cleared; v0.22.69's scan flagged a deprecated tooltip API, removed in v0.22.70, whose post-release scan returned clean at 96 / 100; v0.22.71's scan surfaced a dompurify advisory cleared in v0.22.72, and v0.22.72's scan surfaced a fresh dompurify advisory cleared in v0.22.73; v0.22.73's post-release scan came back clean at 96 / 100; v0.22.74's post-release scan also came back clean; and v0.22.75's post-release scan came back clean as well.

### v0.22.75 Round-Up: GEDCOM date interpretation, living-people superlatives, and a mistyped-value check

**Choose how dates are read during GEDCOM import** ([#718](https://github.com/banisterious/obsidian-charted-roots/issues/718)): The import preview now offers per-format date controls, with counts so you can see how many dates each choice affects. Ambiguous slash dates (e.g. `05/06/1990`) can be read as day/month or month/day for the whole import, and dates carrying an event label (`Bapt`, `Buried`, …) can be imported or skipped. Leaving the controls untouched keeps the previous defaults. Builds on the date-format work from #716.

**Living people now appear in record superlatives** ([#749](https://github.com/banisterious/obsidian-charted-roots/issues/749)): The Statistics "Oldest people" record used to ignore anyone without a death date, so a long-lived living character could never top the list. Living people are now aged against a "current date" — today for real-world people, and a new per-universe current date (set in the Edit Universe dialog and the universe wizard) for fictional ones — and listed with a "(living)" marker. Real-world living ages are capped so a merely-missing death date doesn't look implausible, while fictional universes are uncapped. Raised by [@JakeTheLemon](https://github.com/JakeTheLemon).

**A one-click fix for type fields stored as numbers or dates** ([#758](https://github.com/banisterious/obsidian-charted-roots/issues/758)): A new "Fix mistyped property values" batch operation in the Data Quality tab scans your notes for type fields (`cr_type`, `event_type`, `place_category`, `org_type`, `source_type`) that were stored as a number or date instead of text — for example `event_type: 1850`, which YAML reads as a number and which previously broke the map refresh. It lists each affected note and value and converts them back to text in one click. Suggested by [@tenephor](https://github.com/tenephor).

**Hand-grouped families merge in the Collections tab** ([#761](https://github.com/banisterious/obsidian-charted-roots/issues/761)): People grouped by a manually-set group name (rather than biological links) showed up as separate one-person families in the Collections tab, even though the Person Picker merged them correctly. The Collections tab and its analytics now merge families that share a group name, matching the Person Picker. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**The default universe reaches more of the ways you add people** ([#751](https://github.com/banisterious/obsidian-charted-roots/issues/751) follow-up): The default universe setting was only applied by the "Create X" modals, so people added through the Create Family wizard or inline from the Edit Person modal were left without it. Both paths now apply the default universe to brand-new people. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**"Add to this person" works right after creating a person** ([#757](https://github.com/banisterious/obsidian-charted-roots/issues/757)): After creating a person, clicking Add spouse / child / parent in the follow-up dialog could fail with "No person context available", because the new person's id wasn't reliably available yet. The id is now established when the note is created, so the follow-up actions work immediately. Reported by [@pawel-k1200](https://github.com/pawel-k1200). This release also keeps a multi-value `collection` from blanking the collections, people, and family chart views, and cleans up universe labels in a few more places. Reported by [@lomarcanys](https://github.com/lomarcanys).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02275-round-up-gedcom-date-interpretation-living-people-superlatives-and-a-mistyped-value-data-quality-check-v02275)**

### v0.22.74 Round-Up: A default universe, a "Create family" shortcut, and a map crash fix

**Set a default universe for new notes** ([#751](https://github.com/banisterious/obsidian-charted-roots/issues/751)): A new "Default universe" setting (Settings → Places) applies a chosen universe to new people, places, events, and organizations when their universe field is left empty — so working in a single universe no longer means typing it on every note. For places it applies only to fictional categories, and you can still change or clear it per note. Defaults to none. Requested by [@doctorwodka](https://github.com/doctorwodka).

**"Create family" right from a person's menu** ([#754](https://github.com/banisterious/obsidian-charted-roots/issues/754)): The Relationships submenu on a person note now includes a "Create family..." entry that opens the family-creation wizard pre-anchored on that person — skipping the mode picker so you go straight to adding their spouses, children, and parents. Requested by [@pawel-k1200](https://github.com/pawel-k1200).

**The map no longer crashes on an event with a non-text type** ([#746](https://github.com/banisterious/obsidian-charted-roots/issues/746)): If an event note had an `event_type` that wasn't plain text — for example a bare number like `1850`, which YAML reads as a number — opening the map failed to load any data. Event type, title, and id values are now read as text wherever they're used, so a stray value is handled gracefully instead of breaking the whole map. Reported by [@tenephor](https://github.com/tenephor).

**Collections and universes stop duplicating when typed as wikilinks** ([#755](https://github.com/banisterious/obsidian-charted-roots/issues/755)): A `collection` or `universe` value entered as a wikilink (e.g. `[[Harra]]`) was treated as different from the plain form (`Harra`) or an aliased form, so the same value appeared multiple times in lists, filters, and dropdowns, showed raw brackets, and could even produce a connection to itself. These values are now normalized wherever they're gathered, so each is counted once no matter how it was typed. Reported by [@lomarcanys](https://github.com/lomarcanys).

**The place-type "insert above" choice now reliably takes effect** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734) follow-up): The "insert above and push the lower types down" option added last release computed the result but didn't always apply it; it now re-levels the affected types reliably. The create/edit place-type modal also shows a live preview of where the new type lands, and the per-row controls gain delete and show/hide icons. Follow-up from testing by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02274-round-up-default-universe-create-family-and-a-map-crash-fix-v02274)**

### v0.22.73 Round-Up: A marriage type field, friendlier place hierarchies, and clean map separation

**Record the type of a marriage** ([#628](https://github.com/banisterious/obsidian-charted-roots/issues/628)): Spouse relationships can now capture the kind of union — common-law marriage, cohabitation, domestic (civil) partnership, putative marriage, concubinage, and more — alongside the existing date, location, and status. The Person modal offers these as quick-pick presets with a "Custom..." option for anything else, and the type is mirrored to both partners. When set, it shows on Dynamic Timeline marriage rows (e.g. "Marriage to Jane Doe (Common-law marriage)"), controlled by a new "Show marriage type" setting that's on by default. Requested by [@Vericia](https://github.com/Vericia).

**Memberships in the Entity Profile sort by start date** ([#743](https://github.com/banisterious/obsidian-charted-roots/issues/743)): A person's memberships used to appear in insert order, with an edited one jumping to the bottom, leaving date ranges scattered. They now order by earliest start year — resolved era-aware, so fictional BBY/ABY dates sort by true chronology — with undated memberships last. On a tied start year, an ended membership sorts above an ongoing one, then ties break alphabetically by organization. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Editing a person now tags it as a person** ([#744](https://github.com/banisterious/obsidian-charted-roots/issues/744)): Saving in the Edit Person modal now fills in a missing `cr_type: person` automatically. A note that gained an id but never ran "Add essential person properties" could be edited indefinitely without ever being tagged, leaving type detection to guess. An existing `cr_type` is never overwritten. Requested by [@doctorwodka](https://github.com/doctorwodka).

**Insert a place type above an occupied hierarchy level** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734)): Creating or re-levelling a place type onto a level another type already holds now offers a choice — keep them tied, or insert above and push the lower types down. That makes the fiddly "add something above the current top" case (e.g. a galaxy above a region) a single action instead of renumbering by hand, while leaving intentional ties and gaps intact. The per-row Hide/Show and Reset controls are now compact icons with tooltips. Follow-up from testing by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fictional and real-world maps no longer bleed into each other** ([#747](https://github.com/banisterious/obsidian-charted-roots/issues/747)): In a mixed vault, events tied to fictional places (which use pixel coordinates) leaked onto the real-world map, clustering at 0,0 off the coast of Africa. Markers, place markers, heat map, and migration paths now render only the locations that belong to the active map's coordinate system, so each map shows only its own places. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**A place's category shows its proper label in the Entity Profile** ([#745](https://github.com/banisterious/obsidian-charted-roots/issues/745)): The profile heading displayed a place's internal category id (e.g. `historical`) rather than its label ("Historical"), which only appeared once you clicked in to edit. The heading now shows the proper label, while editing still round-trips the underlying id. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Map data failures now report the real error** ([#746](https://github.com/banisterious/obsidian-charted-roots/issues/746)): A failed map refresh used to show only a generic "Failed to load map data" and log an empty object, making platform-specific failures impossible to diagnose. The specific error now appears in both the notice and the log. Reported by [@tenephor](https://github.com/tenephor). This release also bumps the bundled dompurify to clear a fresh security advisory.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02273-round-up-worldbuilding-and-maps--marriage-type-friendlier-place-hierarchies-and-real-worldfictional-map-separation-v02273)**

### v0.22.72 Round-Up: Two regressions, a timeline crash, and place-type reorder polish

**Organization members identified only by id are listed again** ([#742](https://github.com/banisterious/obsidian-charted-roots/issues/742)): A regression in 0.22.71 made the org member scan require an explicit `cr_type: person`, so person notes relying on the long-supported "id and no explicit type" shape were silently dropped from their organizations' member lists — often leaving only one member visible. The scan now uses the shared person detection, which honours that legacy shape while keeping `cr_type` authoritative. Reported by [@doctorwodka](https://github.com/doctorwodka).

**The parent-place dropdown shows the display name for the top type** ([#739](https://github.com/banisterious/obsidian-charted-roots/issues/739)): When a place's type is the highest in its hierarchy, the dropdown's "No valid parent types for …" message showed the internal id. It now shows the type's display name — a spot missed by the earlier #732 fix. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**The timeline no longer crashes on a bare-year date** ([#741](https://github.com/banisterious/obsidian-charted-roots/issues/741)): A person note combining an inline `events:` array with a date written as a bare number (e.g. `born: 1850`, which YAML reads as a number) crashed the whole timeline render with "e.trim is not a function". The dedup key now coerces non-string date and place values to text. Reported by [@tenephor](https://github.com/tenephor).

**Place type reordering preserves intentional ties and gaps** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734) follow-up): The up/down controls in the Place type manager now swap a type's level with its neighbour's rather than renumbering the whole category. Default same-rank pairs stay tied, custom gaps are left intact, and a tied neighbour disables the arrow. The Customize/Edit action is now a gear/pencil icon with a tooltip to keep the row uncluttered. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn). This release also updates the bundled dompurify to clear two security advisories.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02272-round-up-two-02271-regressions-a-timeline-crash-and-place-type-reorder-refinements-v02272)**

### v0.22.71 Round-Up: Place type management overhaul and display names everywhere

**Smarter hierarchy ranks when adding place types** ([#734](https://github.com/banisterious/obsidian-charted-roots/issues/734)): Building a multi-level place hierarchy (e.g. Region → Sector → System for sci-fi worldbuilding) is far less fiddly. Each category in the Place type manager now has a **+ Add type** button that defaults the new type one level deeper than the deepest existing type, so successive adds auto-increment instead of all landing at the same level. Each type row also gains up/down arrows to reorder it within its category. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Reorder place type categories** ([#733](https://github.com/banisterious/obsidian-charted-roots/issues/733)): The Place type manager now has move-up/move-down buttons on each category. Previously a custom category couldn't be sorted above the built-in ones, so e.g. an "Astrographical" category was stuck below Geographic and Political divisions. Moving a category renumbers the whole list, so any category can be placed anywhere, including at the very top. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Adding an organization member no longer silently fails on a foreign `type`** ([#738](https://github.com/banisterious/obsidian-charted-roots/issues/738)): If a person note carried a `type` key (e.g. `type: character` from your own data model) alongside `cr_type: person`, adding them to an organization updated the person but left the organization's member list empty, with no error. The member scan now uses the shared note-type detection, where `cr_type` is authoritative and `type` is only a fallback. Reported by [@prayidae](https://github.com/prayidae).

**Display names instead of internal ids across more surfaces** ([#735](https://github.com/banisterious/obsidian-charted-roots/issues/735), [#732](https://github.com/banisterious/obsidian-charted-roots/issues/732), [#731](https://github.com/banisterious/obsidian-charted-roots/issues/731)): Several places that showed a raw sluggified id now show the proper display name — the Organization and Source type in the Entity Profile pane, the Place Statistics card and Places list and place modals, and the Type column of the universe dynamic blocks. Each resolves built-in names and customizations, with an unknown id falling back to a humanized form of the slug. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Universe-less fictional dates no longer skew the real-world statistics range** ([#719](https://github.com/banisterious/obsidian-charted-roots/issues/719) follow-up): A person with a BBY/ABY date but no universe link still resolves to a signed year, which the per-universe overview pooled into the real-world span — showing a bare `-33 — 9` where Gregorian years belong. Such dates now group under their own **Uncategorized** range, signalling that those entities need a universe assigned. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02271-round-up-place-type-management-overhaul-and-display-names-everywhere-v02271)**

### v0.22.70 Round-Up: Calendarium calendars everywhere, smarter place linking, and era-aware statistics

**Calendarium calendars now appear throughout Charted Roots** ([#725](https://github.com/banisterious/obsidian-charted-roots/issues/725)): With the Calendarium integration set to "read", calendars weren't showing in the event modal's date-system dropdown or other menus, because the bridge only populated its API reference on a single screen. It now reads the Calendarium API wherever it's needed, so calendars appear consistently, and it logs what it finds for easier diagnosis. (Recognizing Calendarium event dates on timelines is a separate switch — enable **Sync Calendarium events** as well.) Reported by [@Fatebreak](https://github.com/Fatebreak).

**Calendarium settings moved next to the calendars they control**: The "Calendarium integration" and "Sync Calendarium events" options now live in Settings → **Fictional date systems**, directly above the list of imported calendars, instead of under Advanced → Integrations. Toggling the integration refreshes that list in place. Follow-up to [#725](https://github.com/banisterious/obsidian-charted-roots/issues/725).

**Place linking no longer creates a duplicate note when a place's name differs from its filename** ([#724](https://github.com/banisterious/obsidian-charted-roots/issues/724)): Linking a birth, death, or marriage place to a note filed under a disambiguating filename (e.g. `Essex-MA-USA.md` with `name: Essex`) created a new `Essex.md` and linked that instead. The link now resolves by the correct note type, so it lands on the existing place. Two related gaps are fixed alongside: a linked marriage location can now be unlinked from the Person modal, and the place picker shows each place's parent hierarchy so same-named places can be told apart. Reported by [@tenephor](https://github.com/tenephor).

**Statistics date range is now era-aware and grouped per universe** ([#719](https://github.com/banisterious/obsidian-charted-roots/issues/719)): The overview's "Date range" read the leading four digits of each date, so a fictional `8082 BBY` was treated as year 8082 and pooled with real-world dates into a nonsensical span. Years now resolve through the same era-aware machinery the timeline uses, and the range is grouped per universe — real-world dates show a plain Gregorian span, fictional universes an era-correct one, and a mixed vault lists each separately. The same per-universe range feeds the Collections and folder-statistics views. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fictional years before a calendar's earliest era read sensibly** ([#729](https://github.com/banisterious/obsidian-charted-roots/issues/729)): A date that falls before every era a calendar defines used to render as a raw signed number (e.g. `-29 — 1538 GR`). It now reads relative to the earliest era, e.g. "29 before GR", anywhere canonical years are displayed, including the statistics range and the map time slider.

**Orphan organizations now include parents referenced only by another org** ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)): An organization named as another org's parent but with no note of its own wasn't listed under Orphan organizations, so it couldn't be created from there. Parent references are now scanned too. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02270-round-up-calendarium-integration-fix-and-settings-relocation-place-linking-by-note-type-and-era-aware-statistics-v02270)**

### v0.22.69 Round-Up: GEDCOM date-format import, an inspectable sort-order result, and era-aware date precision

**GEDCOM import understands many more date formats**: Import now reads many common date formats it used to drop silently, and flags anything ambiguous in the import preview so you can review it before committing.

**An inspectable result after "Compute sort order"** ([#723](https://github.com/banisterious/obsidian-charted-roots/issues/723)): When Compute sort order hit a before/after loop, its only feedback was a transient notice — the named events scrolled away and weren't actionable. The operation now opens a small result dialog whenever there are cycles or errors: it shows the updated count (or a "nothing to update" state) and lists the unorderable events as clickable links that open the note, so you can jump straight to each culprit and fix its "Occurs before/after". The quick-success case keeps the lightweight toast. Split from [#721](https://github.com/banisterious/obsidian-charted-roots/issues/721) ([@doctorwodka](https://github.com/doctorwodka)).

**Fictional and era dates keep month and day precision** ([#722](https://github.com/banisterious/obsidian-charted-roots/issues/722)): An era date with month or day precision such as `DE 1264-08-15` was parsed down to just its year, so two events sharing an era-year could only be ordered by a raw-string comparison that mis-sorts across eras. The parser now records the month and day, and the event sort orders by them within the same year. Surfaced by [@doctorwodka](https://github.com/doctorwodka).

**Event sort no longer reports a phantom cycle for reciprocal before/after** ([#721](https://github.com/banisterious/obsidian-charted-roots/issues/721)): When two events expressed the same ordering from both sides — one set to "Occurs before" the other, the other "Occurs after" the first — Compute sort order double-counted that single constraint and wrongly reported the pair as an unorderable cycle. Reciprocal relationships now order correctly, and a genuine loop now lists the event titles involved instead of only a count. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Timeline place context uses the place's name, not its filename** ([#720](https://github.com/banisterious/obsidian-charted-roots/issues/720)): The Dynamic Timeline Block's place-context hierarchy built its leaf segment from the place wikilink's filename rather than the note's display name, so vaults that disambiguate same-named places with distinct filenames saw the filename in the timeline. The leaf now uses the resolved place's name. Reported by [@tenephor](https://github.com/tenephor).

**Statistics date range now counts death years** ([#714](https://github.com/banisterious/obsidian-charted-roots/issues/714)): The "Date range" line anchored each person on a single year — their birth, or their death only if no birth was recorded — so death dates were dropped whenever a birth year existed. It now spans the earliest and latest of all birth and death years, so someone who lived 1900–1990 reads "1900 — 1990 (90 years)". Reported by [@DigitalDreamn](https://github.com/DigitalDreamn). The extended name fields also fold into a collapsible "Extended name options" section ([#717](https://github.com/banisterious/obsidian-charted-roots/issues/717)), and the orphan organization and universe rows lay out correctly ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02269-round-up-gedcom-date-format-import-an-inspectable-sort-order-result-and-era-aware-date-precision-v02269)**

### v0.22.68 Round-Up: Organizations come to parity, deeper timeline place context, and name affixes

**Timeline place context can show the full location hierarchy** ([#705](https://github.com/banisterious/obsidian-charted-roots/issues/705)): The place-context feature from v0.22.66 appended only the immediate parent, so "London, England" still left "Essex, Essex Co." ambiguous. You can now choose how many parent levels to append: set **Place context depth** under Settings (Timeline, Event display), with 1 being the immediate parent (the default) and 0 the full hierarchy up to the root place, or override per block with `place_context: <number>` or `place_context: full`. Long places wrap to the next line so deep hierarchies don't overflow the block. Requested by [@tenephor](https://github.com/tenephor), with the depth-selector and line-wrap suggestions from [@DigitalDreamn](https://github.com/DigitalDreamn).

**Create an organization without leaving the membership modal** ([#710](https://github.com/banisterious/obsidian-charted-roots/issues/710)): The organization dropdown in the Add membership modal now offers a **+ New organization** option, so you can create an organization on the spot instead of cancelling out to the Control Center and back. It mirrors the "+ New" options in the place and person modals. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Name prefix, suffix, and surname-particle fields in the Person modal** ([#709](https://github.com/banisterious/obsidian-charted-roots/issues/709)): The Add / Edit Person modal gains optional **Name prefix** (Dr., Rev.), **Name suffix** (Jr., III), and **Surname prefix** (von, de la) inputs, alongside the existing Given name and Surname(s) fields. They map to the `name_prefix` / `name_suffix` / `surname_prefix` properties used for GEDCOM round-trip, which previously could only be set by hand or populated by an import. Stemmed from discussion [#706](https://github.com/banisterious/obsidian-charted-roots/discussions/706) ([@Vericia](https://github.com/Vericia)).

**Adopt orphaned organizations from the Control Center** ([#708](https://github.com/banisterious/obsidian-charted-roots/issues/708)): Reference an organization that has no note yet (for example by typing one into an event's Organizations field) and it becomes an unlinked wikilink that never shows up in the Organizations tab. That tab now lists these under **Orphan organizations**, each with a **Create note** button (plus **Create all**); creating the note links up every existing reference and backfills the new organization's id onto the person notes that referenced it. It mirrors the Orphan universe values feature, bringing the two to parity. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Settings tab renders again on Obsidian 1.13.1**: The settings tab hosts its interface through a setting-definition render callback that relied on a container argument Obsidian 1.13.1 stopped providing, so the whole tab came up blank on that version. It now renders into the documented setting element. Obsidian 1.13.0 and earlier are unchanged.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02268-round-up-organization-workflow-improvements-configurable-place-context-and-an-obsidian-1131-settings-fix-v02268)**

### v0.22.67 Round-Up: Highlight dimming, custom relationship labels, and a full type-check pass

**Highlight dimming no longer shows connector lines through dimmed cards** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): The previous fix dimmed non-matching cards by making them translucent, so the full-brightness connector lines behind them showed through. Dimmed cards now stay fully opaque (dimmed with a filter rather than reduced opacity), so the links behind them are hidden again. It follows up the v0.22.66 highlight-dimming change. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Custom relationship categories are labelled in the relationships filter** ([#707](https://github.com/banisterious/obsidian-charted-roots/issues/707)): In the relationships filter's "By category" dropdown, a relationship category you created yourself appeared as a blank entry, clickable and functional but with no name, because the label came from the built-in category list only. Custom category names now resolve correctly, in both the Relationships pane and the Control Center Relationships tab. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**"Find related research" and GEDCOM-X export count fixes** ([#704](https://github.com/banisterious/obsidian-charted-roots/issues/704)): Running the **Find related research** command while viewing a person note didn't detect the note as a person, so it always fell through to the person-picker prompt instead of using the note you were already on; it now uses the active note when it is a person. And the completion notice for a GEDCOM-X export always read "0 people exported" because it counted from the wrong object, even though the exported file was complete; the notice now reports the actual number of people and relationships written.

**The codebase is now fully type-checked, with the check gating CI**: The TypeScript codebase reaches zero type-check errors and the type-check now gates CI, so a future type regression can't ship. The sweep also turned up and fixed two latent bugs along the way, in the "Find related research" command and the GEDCOM-X export count above.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02267-round-up-highlight-line-fix-relationship-filter-labels-and-a-fully-type-checked-codebase-v02267)**

### v0.22.66 Round-Up: Personal events and place context on timelines, plus a living-status control

**Personal events appear on timelines** ([#692](https://github.com/banisterious/obsidian-charted-roots/issues/692)): A person's inline events list (residence, occupation, immigration, and the like) used to show only on the Map View. Those events now also appear on the Dynamic Timeline Block, interleaved chronologically with births, deaths, and family events, and era-aware for fictional calendars. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Timelines can show place context** ([#701](https://github.com/banisterious/obsidian-charted-roots/issues/701)): Timeline rows can now append a place's parent location, so "Born in London" reads "Born in London, England" and you can tell which London it is. The parent comes from your place note hierarchy. It is off by default; turn it on under Settings (Events and timelines, Event display), or per block with `place_context: true`. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**A living-status control in the Person modal** ([#698](https://github.com/banisterious/obsidian-charted-roots/issues/698)): Marking someone living or deceased used to mean hand-editing a property, or enabling privacy protection to reveal a hidden override. A Living status dropdown (Automatic / Living / Deceased) now sits under the death fields in both the create and edit Person modals, always available. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Timeline context events span a person's whole life** ([#699](https://github.com/banisterious/obsidian-charted-roots/issues/699)): The historical-context lifespan margin was measured only against a person's own milestones, so context during a family-event-heavy period, or the later life of someone with no recorded death, could be dropped. The window now reflects the whole life, with family events widening it and a living person extending to their latest context event.

**Organizations, custom relationships, and the Family Chart** ([#700](https://github.com/banisterious/obsidian-charted-roots/issues/700), [#702](https://github.com/banisterious/obsidian-charted-roots/issues/702), [#703](https://github.com/banisterious/obsidian-charted-roots/issues/703), [#689](https://github.com/banisterious/obsidian-charted-roots/issues/689), [#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): Choosing Manage memberships on a person with no organizations now opens the Add membership dialog directly; the members block honours `sort: date`; custom relationships mapped to parent or spouse keep their own type instead of writing the built-in fields; the Family Chart focus outline width is adjustable (2 to 10 pixels) through Style Settings; and highlight dimming no longer washes out the connector lines. Reported by [@doctorwodka](https://github.com/doctorwodka), [@tenephor](https://github.com/tenephor), and [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02266-round-up-personal-events-and-place-context-on-timelines-plus-a-living-status-control-v02266)**

### v0.22.65 Round-Up: Fictional-calendar timelines, consistent event icons, and reciprocal child links

**Timelines handle fictional calendars** ([#693](https://github.com/banisterious/obsidian-charted-roots/issues/693), [#695](https://github.com/banisterious/obsidian-charted-roots/issues/695)): A historical-context note added to a Dynamic Timeline Block used to show its events only when the dates were four-digit years, so lines dated in a fictional era (like `BBY 32` or `32 BBY`) were skipped. Context dates now understand era abbreviations in either order, short years, and ranges. And a timeline that mixes eras such as BBY and ABY now sorts and filters by true chronology instead of the bare year number, so an `ABY 40` event no longer sinks below a `BBY 10` one. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Event icons show consistently, and by default** ([#691](https://github.com/banisterious/obsidian-charted-roots/issues/691)): In text mode a person's own events showed icons only when the timeline also contained a family event, so icons appeared on some rows but not others. Event icons are now all-or-nothing per timeline, controlled solely by the Event type display setting, which now defaults to "Icon with label" (existing vaults migrate once on upgrade; set it back to text any time). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Family Chart: unmarried co-parents, focus outline, and Circle highlight** ([#694](https://github.com/banisterious/obsidian-charted-roots/issues/694), [#689](https://github.com/banisterious/obsidian-charted-roots/issues/689), [#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): Two people who share a child but were never married are no longer labelled "Spouse" on kinship labels, the focus (root person) outline is drawn thicker so it stands out from the same-coloured connector lines, and highlight dimming no longer clips the connector lines on Circle cards. Reported by [@doctorwodka](https://github.com/doctorwodka) and [@DigitalDreamn](https://github.com/DigitalDreamn).

**Children added from a parent's Edit Person modal link back** ([#697](https://github.com/banisterious/obsidian-charted-roots/issues/697)): Creating or linking a child through a parent's Edit Person modal listed the child on the parent's note but left the child without a `father` / `mother` link, so the relationship was only half-connected. The reverse parent link is now written onto each child when the parent is saved. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**A warning before a very large import** ([#688](https://github.com/banisterious/obsidian-charted-roots/issues/688)): The import wizard's preview now shows how many notes an import will create and warns when that total is large enough to slow Obsidian down (around 10,000+), suggesting you narrow the file before committing. It appears before any notes are written, for every import format. Raised by [@inerlogic](https://github.com/inerlogic).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02265-round-up-fictional-calendar-timelines-consistent-event-icons-and-reciprocal-child-links-v02265)**

### v0.22.64 Round-Up: Family Chart focus indicator, per-move migration routes, and GEDCOM place consolidation

**Family Chart focus indicator is visible again** ([#689](https://github.com/banisterious/obsidian-charted-roots/issues/689)): The outline around the focus (root) person's card took its colour from the card's text, so the darker card text from v0.22.63 made it blend into dark cards and disappear. The outline now uses your theme accent colour, independent of the text, so the focused person is clearly marked in the chart and in exports. Reported by [@tenephor](https://github.com/tenephor).

**Highlight groups work in a pop-out window** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With the Family Chart moved to its own window, Highlight Groups had no effect (cards neither dimmed nor highlighted), because the highlight pass was looking for cards in the main window. It now applies within the chart's own window. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Migration routes count each move, not just the net journey** ([#684](https://github.com/banisterious/obsidian-charted-roots/issues/684)): "Top migration routes" modeled each person as a single first-to-last pair, which undercounted shared moves and hid round trips. It now counts each leg: a family that gathers and moves on is counted on the shared leg even when members were born in different places, a round trip contributes both legs, and intermediate stops appear. The migration rate and moved totals are unchanged. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**GEDCOM import consolidates variant spellings of a place** ([#687](https://github.com/banisterious/obsidian-charted-roots/issues/687)): A place that appeared under several `PLAC` spellings (for example "Montréal, Québec, Canada" and "Montreal, QC, Canada") used to create a separate note for each. Import now folds them into one note, expanding Canadian province abbreviations and consolidating accent / case / spacing variants while keeping the other forms as historical names. Historical names are also stored as flat properties now, clearing a Data Quality warning. Reported by [@inerlogic](https://github.com/inerlogic).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02264-round-up-family-chart-focus-indicator-per-move-migration-routes-and-gedcom-place-consolidation-v02264)**

### v0.22.63 Round-Up: Suffix-aware imports, a place-unlink fix, migration refinements, and flat crop data

**GEDCOM and GEDCOM-X imports keep generational name suffixes** ([#685](https://github.com/banisterious/obsidian-charted-roots/issues/685)): Relatives who shared a name and differed only by a suffix (Sr. / Jr. / III) had the suffix dropped, so they collided to one base name and were numbered instead. The suffix is now folded into the name and filename, so each person stays distinct. Reported by [@inerlogic](https://github.com/inerlogic).

**Unlinking a birth or death place in Edit Person removes it on save** ([#680](https://github.com/banisterious/obsidian-charted-roots/issues/680)): Clearing a person's birth or death place and saving without choosing a replacement left the old place wikilink in the note. The modal now signals a cleared place the way it signals a cleared parent, so it is removed. Reported by [@tenephor](https://github.com/tenephor).

**Migration analysis refinements** ([#643](https://github.com/banisterious/obsidian-charted-roots/issues/643)): The Places tab's statistics now use the same event-driven migration analysis as the Statistics Dashboard, a destination that is a sub-place counts toward the place that contains it, and the dashboard refreshes on its own after you add or edit a movement event. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Highlight groups paint above the connector lines** ([#670](https://github.com/banisterious/obsidian-charted-roots/issues/670)): With highlight groups active, dimmed cards could render beneath the relationship lines on Linux and macOS, so the lines cut across them. Dimming now uses an overlay over each card instead of lowering the card's opacity. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Burial date field and flat crop data** ([#682](https://github.com/banisterious/obsidian-charted-roots/issues/682), [#683](https://github.com/banisterious/obsidian-charted-roots/issues/683)): The Create/Edit Person modal gains a "Burial date" field alongside the birth and death dates, and image crop regions move from a nested array to flat properties so the Data Quality pane no longer flags a warning on cropped images. Requested by [@tenephor](https://github.com/tenephor) and [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02263-round-up-suffix-aware-imports-place-unlink-fix-migration-refinements-and-flat-crop-data-v02263)**

### v0.22.62 Round-Up: Stats issues card, Split wizard layout, and Circle ring

**Statistics Dashboard issues card lists only what's actually missing** ([#676](https://github.com/banisterious/obsidian-charted-roots/issues/676)): The dashboard's "Issues" card always spelled out "Missing births + orphans + unsourced events" even when a category had a zero count, so it could read "Missing births" with birth dates fully complete. The subtitle now names only the categories that actually contribute. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Split canvas wizard's completion screen lays out correctly** ([#673](https://github.com/banisterious/obsidian-charted-roots/issues/673)): The wizard's final "Complete" step rendered its file list and summary crammed together and overlapping the step indicator, because it used the wrong container style. It now uses the same column layout as every other step. Raised by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Family Chart Circle avatars keep their colored ring after "fit to view"** ([#677](https://github.com/banisterious/obsidian-charted-roots/issues/677)): With the Circle card style, "fit to view" kept the avatars round but dropped the gender-colored ring behind each one. The ring is now re-applied after the fit re-render. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02262-round-up-stats-issues-card-split-wizard-layout-circle-ring-and-the-1130-settings-api-v02262)**

### v0.22.61 Round-Up: Event-driven migration analysis, historical place names, and Family Chart pop-out fixes

**Migration analysis now uses movement events** ([#643](https://github.com/banisterious/obsidian-charted-roots/issues/643)): The Statistics Dashboard's migration section now reads Residence / Immigration / Emigration events instead of inferring moves from birth → death — so living migrants count, round-trip moves are captured, and a place and its own parent aren't treated as a move. Birth → death remains a labeled fallback. (The Migration Flow Diagram modal still uses birth → death; that moves over in a later pass.) Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Merging duplicate places preserves the discarded names** ([#635](https://github.com/banisterious/obsidian-charted-roots/issues/635)): Merging duplicates (for example, GEDCOM variants like "Hartford" and "Hartford, Connecticut") now keeps each discarded name as a historical name on the surviving place instead of trashing it; the modern name stays primary. Requested by [@Darcylynn](https://github.com/Darcylynn).

**Family Chart pop-out and spacing fixes** ([#677](https://github.com/banisterious/obsidian-charted-roots/issues/677), [#678](https://github.com/banisterious/obsidian-charted-roots/issues/678), [#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): Circle avatars stay round in a pop-out window, refreshing the chart in a (non-maximized) pop-out no longer blanks, and the tree re-compacts when cards get smaller again instead of staying stretched. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Statistics, relationships, and export fixes** ([#676](https://github.com/banisterious/obsidian-charted-roots/issues/676), [#675](https://github.com/banisterious/obsidian-charted-roots/issues/675), [#673](https://github.com/banisterious/obsidian-charted-roots/issues/673)): The dashboard's "missing births" notice now agrees with the completeness percentages, deleting a symmetric custom relationship cleans up the other person's note too, and single-lineage canvas exports get distinguishing filenames in the canvases folder.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02261-round-up-event-driven-migration-analysis-historical-place-names-and-family-chart-pop-out-fixes-v02261)**

### v0.22.60 Round-Up: Family Chart card legibility, a co-parent repair follow-up, and export naming

**Long names wrap on the Rectangle, Compact, and Mini card styles** ([#671](https://github.com/banisterious/obsidian-charted-roots/issues/671)): These card styles drew each name on a single line and clipped anything wider than the card at the right edge. A name that overflows now wraps onto a second line and the cards grow in height to fit, so multi-word names stay readable. A single very long word can still be trimmed; the wider Compact style or the "Split given/surname" option give names more room there. Reported by [@tenephor](https://github.com/tenephor).

**Circle cards widen and rectangle cards are more compact** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): The Circle card style used a fixed width, so longer names and the optional detail lines ran past the edge; Circle cards now measure their longest line and widen to fit. The default rectangle card, meanwhile, uses a smaller avatar and tighter spacing so a spouse couple no longer reads as one fused block. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Pastel theme uses readable card text in dark mode** ([#672](https://github.com/banisterious/obsidian-charted-roots/issues/672)): Under a dark Obsidian theme the Pastel preset drew white labels on its light pastel cards, which were hard to read. Because the pastel colors are light in both modes, Pastel now uses dark card text in both. Reported by [@tenephor](https://github.com/tenephor).

**"Repair misaligned children" fixes both parents of a shared child in one pass** ([#666](https://github.com/banisterious/obsidian-charted-roots/issues/666)): The v0.22.59 repair tool could fix one parent of a shared child but leave the other, and a broken child link could mask a real child. The tool now treats a broken link as a repair trigger and reconciles the co-parent of every recovered child in the same run, so both parents are fixed together. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Person-filtered timeline exports no longer overwrite each other** ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)): A timeline export took its file name from the title alone ("Event Timeline"), so exporting a second person collided with the first. The export now folds the filtered person into the title and file name (for example, "Event Timeline - Ahsoka Tano"). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02260-round-up-family-chart-card-legibility-co-parent-repair-and-export-naming-v02260)**

### v0.22.59 Round-Up: Children-list data-integrity fix, a repair tool, and the Circle card rebuild

**Misaligned children lists no longer mislabel or drop relationships** ([#666](https://github.com/banisterious/obsidian-charted-roots/issues/666)): A parent stores its children as two parallel lists, the display names and their stable hidden IDs, which have to line up one-for-one. If an ID went missing, the lists could fall out of step, and the next edit would silently re-pair a child's name with the wrong note or drop a reference. This is now prevented on both the edit and rename paths, and a new "Repair misaligned children" tool in the Data Quality tab rebuilds affected notes from each child's own parent links, recovering dropped children and clearing the misleading links, with a preview before anything is written. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Family Chart "Circle" card style shows connection indicators and the photo placeholder again** ([#669](https://github.com/banisterious/obsidian-charted-roots/issues/669)): The Circle card style was drawn a different way internally than the other card styles, so it never showed the small connection-indicator bubbles or handled the no-photo placeholder correctly. Circle now renders a round avatar, ringed in the gender color with the name centered below, on the same renderer the other styles use, so the bubbles, the placeholder, and branch expand and collapse all behave consistently across every theme. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Data Quality warning callouts are readable in every theme**: The "back up your vault" notice shown before batch repairs could render warning-colored text on a warning-colored background and disappear in some themes; it now uses the standard text color so the message and its icon stay legible.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02259-round-up-children-list-data-integrity-fix-a-repair-tool-and-the-circle-card-rebuild-v02259)**

### v0.22.58 Round-Up: Reporter follow-ups, a sibling-marriage toggle, and High Contrast lines

**"Show sibling's marriages" timeline toggle** ([#661](https://github.com/banisterious/obsidian-charted-roots/issues/661)): A new opt-in toggle adds a sibling's marriage to the focal person's Dynamic Timeline block, so you can see the focal person's age at a sibling's wedding, joining the existing toggles for parents' and children's marriages. It covers biological and adopted siblings, carries the spouse's name and marriage location, and is off by default. Requested by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Several v0.22.57 fixes that missed a second surface, now closed**: A custom calendar is attributed correctly when it shares era abbreviations with a built-in, by honoring the universe's default calendar ([#650](https://github.com/banisterious/obsidian-charted-roots/issues/650)); person-filtered Canvas and Excalidraw timeline exports return the selected person's events instead of "No events to export" ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)); the Create/Edit Event modal now actually saves its Organizations field ([#659](https://github.com/banisterious/obsidian-charted-roots/issues/659)); and event tables, timelines, and filter dropdowns show participant and place aliases instead of raw `Filename|Alias` text ([#658](https://github.com/banisterious/obsidian-charted-roots/issues/658)).

**Event profile header and Data Quality refresh**: An event's Entity Profile heading shows the event type's display name (for example "Plot point") instead of its internal slug ([#665](https://github.com/banisterious/obsidian-charted-roots/issues/665)), and the Data Quality view now refreshes once a note's metadata has been re-read, so corrected values clear from the list on their own instead of lingering ([#664](https://github.com/banisterious/obsidian-charted-roots/issues/664)).

**Family Chart connector lines stay visible in the High Contrast theme** ([#668](https://github.com/banisterious/obsidian-charted-roots/issues/668)): In High Contrast, the lines between cards were drawn in the same black as the card-label text and vanished against the theme's black background. The line color is now derived to stay visible against the chart background, while the other themes keep the line color they had. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02258-round-up-reporter-follow-ups-a-sibling-marriage-toggle-and-high-contrast-lines-v02258)**

### v0.22.57 Round-Up: Reporter cohort — fictional-date parsing, organization linking, and profile sections

**Link organizations to events** ([#659](https://github.com/banisterious/obsidian-charted-roots/issues/659)): Event notes can now reference organizations through an `organizations` wikilink array, and those events appear in the "Events" section of each linked organization's Entity Profile — the same way events already link to people and places. Set it from the Create/Edit Event modal's new "Organizations" field, or in frontmatter. Requested by [@doctorwodka](https://github.com/doctorwodka).

**Negative years and decade notation in fictional dates** ([#655](https://github.com/banisterious/obsidian-charted-roots/issues/655), [#660](https://github.com/banisterious/obsidian-charted-roots/issues/660)): The fictional-date parser rejected negative years (`EP -18`) and mis-handled their month/day suffixes, so negative-dated events sorted out of order. Negative years now parse correctly and sort earliest-first, and decade notation (`EP 30s`) is supported. Because every fictional-date surface routes through the parser, era display, ages, and statistics are corrected for these dates too. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Two new profile sections and a modal field**: A source note's profile gains a "Referenced events" section listing the events that cite it ([#654](https://github.com/banisterious/obsidian-charted-roots/issues/654), requested by [@DigitalDreamn](https://github.com/DigitalDreamn)), and the Create/Edit Organization modal gains a "Dissolved" field that was previously only settable by hand-editing YAML ([#649](https://github.com/banisterious/obsidian-charted-roots/issues/649), requested by [@doctorwodka](https://github.com/doctorwodka)).

**Events tab and Control Center fixes**: Fictional-date counting now matches what the plugin actually parses, including approximation markers and death-only dates ([#648](https://github.com/banisterious/obsidian-charted-roots/issues/648)); custom calendars sharing era abbreviations with a built-in are attributed correctly in "Systems in use" ([#650](https://github.com/banisterious/obsidian-charted-roots/issues/650)); the timeline export's "Filter by person" matches the selected person ([#657](https://github.com/banisterious/obsidian-charted-roots/issues/657)); the cross-tab "Manage media" action works again ([#656](https://github.com/banisterious/obsidian-charted-roots/issues/656)); the statistics card self-corrects after a cold start instead of showing a stale low count ([#651](https://github.com/banisterious/obsidian-charted-roots/issues/651)); "View full statistics" surfaces the dashboard in front of the modal ([#645](https://github.com/banisterious/obsidian-charted-roots/issues/645)); and event profiles show a participant's alias rather than the raw wikilink ([#658](https://github.com/banisterious/obsidian-charted-roots/issues/658)).

**Read the full release notes →** [v0.22.57 Round-Up on the wiki](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02257-round-up-reporter-cohort--fictional-date-parsing-organization-linking-and-profile-sections-v02257)

### v0.22.56 Round-Up: Fictional-date event count and jspdf bundle patch

**Events tab Statistics card counts event notes alongside person notes for the fictional-date total** ([#644](https://github.com/banisterious/obsidian-charted-roots/issues/644)): On the Control Center's Events tab, the Statistics card's "Fictional dates" subsection said "X notes use fictional date systems" but only counted person notes with fictional `born` or `died` dates — event notes' `date` field was never inspected, despite the label promising a count of "notes". So a vault with 19 fictional-dated events and 9 fictional-dated persons read as "9", and a vault with 3 fictional-dated events and 0 fictional-dated persons read as "0". The fix extends the calculation to include event notes alongside person notes in the same pass, so each fictional-dated event contributes one-for-one and "Systems in use" picks up event-detected systems automatically. The label stays accurate now that the count reflects both kinds of notes. Reported by [@doctorwodka](https://github.com/doctorwodka).

**jspdf bundle: dynamic script element creation stripped from the unreachable `pdfobjectnewwindow` output mode**: The v0.22.55 dep bump cleared 18 dependency advisories surfaced by the v0.22.54 automated scan, but the next scan found a new finding the previous bundled output didn't have: dynamic `<script>` element creation. The source: jspdf 4.x's `output('pdfobjectnewwindow')` mode opens a new window and dynamically loads a CDN script. It's the only `createElement('script')` call in jspdf's source. The plugin only ever calls `save()` (Family Chart export, Tree wizard PDF output); the `pdfobjectnewwindow` mode is never reached. A new `patch-jspdf.js` postinstall script replaces the unreachable case body with a `throw`, preserving the switch shape so jspdf still parses cleanly while dropping the dynamic script element creation from the bundle. The post-v0.22.56 Community Plugins automated review returned to the prior v0.22.53 baseline — closing the v0.22.54-v0.22.55-v0.22.56 dependency-security arc.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02256-round-up-fictional-date-event-count-and-jspdf-bundle-patch-v02256)**

### v0.22.55 Round-Up: Dependency security bump (jspdf and dompurify)

**Bump `jspdf` to 4.2.1 and `dompurify` to 3.4.7** to clear all 18 dependency advisories surfaced by the v0.22.54 Community Plugins automated review (10 against `jspdf` direct, 8 against `dompurify` transitively via `jspdf`) — the first time dependency findings have hit a Charted Roots release. The `jspdf` advisories cover Path Traversal, HTML Injection, PDF Injection in the `AcroForm` module, DoS via malformed image dimensions, stored XMP metadata injection, race conditions, and PDF Object Injection via free-text color. The `dompurify` advisories cover XSS, prototype pollution, and bypasses of `FORBID_TAGS` and `SAFE_FOR_TEMPLATES`. Upstream confirmed no breaking API changes through both 3.x and 4.x majors; the only behavioral change in jsPDF 4.0 is Node `fs` access restriction, which doesn't apply to Obsidian's renderer context. No application-code changes; both PDF surfaces (Family Chart export and Tree wizard PDF output) verified end-to-end in dev-vault.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02255-round-up-dependency-security-bump-jspdf-and-dompurify-v02255)**

### v0.22.54 Round-Up: Statistics and Relationships polish, Timeline era-aware sort, and Settings reorg

**Statistics Dashboard's "Events by type", "Sources by type", and "Places by category" show display names** ([#641](https://github.com/banisterious/obsidian-charted-roots/issues/641)): The three sections at the bottom of the Statistics Dashboard passed each stats key straight through as the row label, so rows came from slugified event-type IDs (`plot_point`, `backstory`), built-in source-type IDs, or canonical place-category IDs rendered as the raw identifier instead of the configured display name. Each section now routes the key through its catalog, so renames and custom event types flow through automatically. Unknown IDs capitalize as a fallback (`other` → `Other`, `legal` → `Legal`, `uncategorized` → `Uncategorized`) so orphan rows still render cleanly rather than vanishing. Raised by @DigitalDreamn in Discussion #639 (scope expanded to Sources and Places on the issue after dev-vault verification).

**Relationships tab Statistics card lays out rows with the label and count visually separated** ([#640](https://github.com/banisterious/obsidian-charted-roots/issues/640)): On the Relationships tab's Statistics card, the "By type" and "By category" rows rendered with the label and count run directly together (`Child131`, `Spouse22`, `Family169`) because five of the seven referenced CSS classes had never been defined. The missing rules are now in place: each row lays out as a flex row with the color swatch on the left, the type or category name in the middle, and the count right-aligned and semibold, matching the Statistics Dashboard's "Events by type" treatment. Raised by @DigitalDreamn in Discussion #639.

**Dynamic Timeline Block `sort_order` tiebreak respects descending-era timelines** ([#638](https://github.com/banisterious/obsidian-charted-roots/issues/638)): The v0.22.51 [#625](https://github.com/banisterious/obsidian-charted-roots/issues/625) fix taught per-person Dynamic Timeline Blocks to respect `before` / `after` Event ordering as a same-year tiebreak, but it skipped the era-inversion that v0.22.49's [#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) added to the rawDate tiebreak. So in a BBY / BC-style descending era the year sort correctly put old-at-bottom, but the `sort_order` pair flipped opposite and read in the wrong direction locally. Both tiebreaks now route through the same era-check helper, so they invert together when the pair parses as a backward-era fictional date and stay in sync if either tiebreak's rules change later. Reported by @DigitalDreamn — same reporter as the upstream #609 and #625 fixes she also surfaced.

**Control Center settings reorg — Event display and timeline context live alongside the Timeline section** ([#637](https://github.com/banisterious/obsidian-charted-roots/issues/637)): The **Event display** subsection (with the **Event type display** setting that controls how event types appear on timelines, canvas event nodes, and maps) moves from Canvas & Trees to the top of the Timeline section. **Default timeline context** and **Context lifespan margin** move from Advanced into a new **Context events** subsection in the same section. The section itself is renamed **Events & timelines** to reflect the broader scope. Sync Calendarium events stays in Advanced > Integrations as an integration toggle. No setting names or values change; the internal section identifier stays `timeline` so the open-state restore continues to recognize a previously-open section. Raised by @doctorwodka after spending 10 minutes looking for Event Display under Canvas & Trees rather than the Timeline section it conceptually belongs to.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02254-round-up-statistics-and-relationships-polish-timeline-era-aware-sort-and-settings-reorg-v02254)**

### v0.22.53 Round-Up: Family Chart overlay self-heal, adoption icon continuity, and first external contribution

**Family Chart custom-relationship overlay self-heals after refresh** ([#615](https://github.com/banisterious/obsidian-charted-roots/issues/615)): On some setups the overlay line's top endpoint could detach from its source card after a refresh, floating partway down toward the next-generation card. The overlay waits for the chart's entrance animation to finish before drawing, but on machines where the animation briefly stalls mid-flight that wait can fire too early and anchor the line to where a card was rather than where it ends up. The fix adds a backstop: shortly after drawing, the overlay checks whether any card has moved since, and if so it waits for the chart to fully settle and redraws, so a premature draw repairs itself a moment later. Reported by @doctorwodka.

**Adoption events on family timelines now use the adoption icon** ([#632](https://github.com/banisterious/obsidian-charted-roots/issues/632)): v0.22.52 gave the focal person's own `Adopted` row the warm-orange `heart-handshake` icon, but the adoption events on the *family*-timeline surfaces (the adoptive parent's `Adopted {name}` row, and the adopted-sibling and adopted-grandchild `Adoption of {name}` rows added in v0.22.50) still showed the generic family icon. They now share the same icon and color across every Dynamic Timeline surface, so an adoption reads as an adoption everywhere it appears. The adopted child's birth row keeps the generic icon, since it is a birth rather than an adoption. Raised by @DigitalDreamn.

**"Not a duplicate" dismissals now persist across sessions** ([#633](https://github.com/banisterious/obsidian-charted-roots/issues/633)): In the duplicate-detection modal, marking a pair "Not a duplicate" only removed it from the current scan, so the same pair reappeared on the next scan. Dismissed pairs are now saved across sessions and filtered out of future scans, and a new **Clear dismissed** button (visible only when there are dismissals) lets you undo a stale dismissal if you change your mind. Reported by @Darcylynn.

**Calendar view filters events by year as well as month** ([#634](https://github.com/banisterious/obsidian-charted-roots/issues/634), the project's first external contribution): Navigating the Calendar view to a specific month and year (for example February 1850) showed events from every year that shared that month, so a person born in February 2010 appeared on Feb 15, 1850 with their actual year noted on the row. The calendar now matches both the month and the year, so events from other years no longer surface on the displayed month. Reported by @Darcylynn; contributed by @MohammadYusif in [#636](https://github.com/banisterious/obsidian-charted-roots/pull/636), the project's first accepted external pull request.

**Merge Duplicate Places help link points at the current wiki**: The Help link in the Merge Duplicate Places modal pointed at an outdated URL and returned a 404. It now links to the current wiki, matching every other in-plugin help link. Reported by @Darcylynn.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02253-round-up-family-chart-overlay-self-heal-adoption-icon-continuity-and-first-external-contribution-v02253)**

### v0.22.52 Round-Up: Adoption icon and sex marker consistency

**Dynamic Timeline Block: focal person's own `Adopted` event renders with an icon** ([#627](https://github.com/banisterious/obsidian-charted-roots/issues/627)): The adoptive parent's `Adopted {name}` row already showed the generic family-event `users` icon, but the focal person's own `Adopted` row had no icon at all. The built-in event-type catalog had no entry with id `adoption`, so the renderer's icon resolution returned undefined and the row fell through to a placeholder span. The fix adds `adoption` as a built-in vital event type alongside birth / death / marriage / divorce (icon `heart-handshake`, warm orange). Side benefit: every other surface that consults the catalog (event timelines, map controller, Create/Edit Event modal, GEDCOM mapping) picks up the new entry automatically. Reported by @doctorwodka, confirmed by @DigitalDreamn.

**Edit Person modal recognizes single-letter sex markers and writes the canonical GEDCOM-aligned form** ([#629](https://github.com/banisterious/obsidian-charted-roots/issues/629)): Profile View writes single-letter sex markers (`M` / `F` / `X` / `U`); Edit Person previously wrote word forms (`male` / `female` / `nonbinary` / empty), so a person saved via Profile View as `sex: F` opened in Edit Person with the dropdown grayed as "unrecognized". The fix normalizes the loaded sex value through the existing value-alias service, so all known shapes (word forms, GEDCOM markers, aliases like `nb` / `enby` / `intersex`) converge on the canonical M/F/X/U set before populating the dropdown. The dropdown's options flip to marker values with display labels (Male / Female / Non-binary / Unknown), gaining explicit `X` and `U` options the previous version lacked. Existing word-form notes auto-convert on next save via Edit Person. Reported by @doctorwodka.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02252-round-up-adoption-icon-and-sex-marker-consistency-v02252)**

### v0.22.51 Round-Up: Fictional-date polish and timeline sort-order tiebreak

**Fictional-era dates with an inline approximation marker parse correctly** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up): The v0.22.50 fix addressed the bare-digit fallback for #624's reported "3-digit year" symptom but missed the actual data shape: a frontmatter `born: DE ~310` (era plus inline tilde plus 3-digit year). The inline tilde sitting between the era and the year broke the fictional parser's pattern matching. Downstream effect: the birth date parsed as null, and the renderer dropped the age annotation on the era-prefixed adoption event. The approximation stripper now handles inline markers (between whitespace and a digit), so `DE ~310`, `DE c. 1264`, and `DE circa 310` all parse cleanly as fictional approximate dates with the era preserved. Reported by @doctorwodka after the v0.22.50 fix didn't resolve her actual data shape.

**Per-person Dynamic Timeline Block respects `before`/`after` event ordering** ([#625](https://github.com/banisterious/obsidian-charted-roots/issues/625)): The v0.22.45 [#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) auto-compute service writes `sort_order` topological values onto events when their `before`/`after` frontmatter is set, and the Events timeline view consumes those values correctly. Per-person Dynamic Timeline Blocks were missed in that sweep: a same-year pair where `Event A` had `after: [[Event B]]` rendered in alphabetical insertion order rather than B-then-A. The same-year tiebreak in the per-person comparator now consults the `sort_order` values between the year compare and the existing rawDate tiebreak; events without `before`/`after` constraints (births, marriages, family events) keep their existing behavior. Latent since v0.22.39 when `before`/`after` properties first arrived. Reported by @doctorwodka, confirmed by @DigitalDreamn.

**Fictional-era dates with an ISO-style month/day suffix preserve the era prefix on display** ([#626](https://github.com/banisterious/obsidian-charted-roots/issues/626)): A frontmatter value like `adoption_date: DE 1264-08-15` (custom forward-direction calendar with month and day precision) rendered as a plain `1264` on the Dynamic Timeline Block while sibling rows on the same person correctly showed `DE 310` and `DE 1260`. The fictional parser already stripped trailing `T HH:MM:SS` time suffixes (per the v0.22.47 [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up for twin-disambiguation times); it now also strips `-MM-DD` and `-MM` ISO-style date suffixes, mirroring the same pattern. Age math was unaffected because the calculator enters the standard-date fallback path and uses canonical-year arithmetic when one side parses as fictional and the other as standard. Pure ISO dates like `2024-08-15` are still rejected by the explicit ISO-pattern check. Spotted during the v0.22.51 #624 follow-up dev-vault verification.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02251-round-up-fictional-date-polish-and-timeline-sort-order-tiebreak-v02251)**

### v0.22.50 Round-Up: Date-parser relaxation, adoption events always-on, and mobile-migration first batch

**Family Chart wikilink text fields render aliases instead of raw markup** ([#622](https://github.com/banisterious/obsidian-charted-roots/issues/622)): The card display for six free-form text fields (`religion`, `alt name`, `nickname`, `title`, `occupation`, `caste`) previously showed the raw wikilink (brackets plus full filename) when one of those fields was set to a wikilink. So `religion: "[[Religions/Catholic|Catholicism]]"` rendered literally instead of just `Catholicism`. A guarded helper now strips brackets and collapses to the alias only when the input is fully bracket-wrapped, so plain text containing a `/` or `|` (e.g., `occupation: "Cook/Server"`) passes through unchanged. The info panel's birth-place and death-place display sites consolidate onto the same helper. Reported by @doctorwodka.

**Bare 1-3 digit year strings parse correctly across the date pipeline** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624)): The date parser previously required a 4-digit value, so a frontmatter `birth_date: 310` (a 3-digit canonical year in a custom fictional-era calendar) was unparseable. When paired with an era-prefixed event date like `adoption_date: DE 1264`, the renderer's safety-net dropped the age annotation rather than risk a silently-wrong number across mismatched eras. Other events on the same person rendered correctly when both sides happened to be 4-digit values. The fix accepts any whole-string digit-only input as a year; existing 4-digit substring matching is preserved for inputs like `"March 12, 1942"`, and the whole-string anchor keeps strings like `"5 Jan"` or `"1900s"` from matching accidentally. Reported by @doctorwodka.

**Dynamic Timeline Block adopted-sibling and adopted-grandchild adoption events are now always-on** ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)): The two emission blocks added in v0.22.49 ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)) were gated on the `Show adopted children's births` toggle, matching the birth-event coverage. Verification feedback from @DigitalDreamn pointed out that adoption events represent family events the focal canonically experienced (same shape as the adoptive parent's `Adopted {name}` event from [#396](https://github.com/banisterious/obsidian-charted-roots/issues/396), which has always been emitted unconditionally), and shouldn't depend on whether the user wants the broader adopted-children-births surfacing. The toggle gate is dropped from both blocks; the `kind === 'adopted'` and `adoptionDate`-required guards remain. Reported by @DigitalDreamn as a #621 follow-up.

**Internal: Phase 4b mobile-migration first batch.** First three per-component CSS migrations consuming v0.22.49's `MobileClassManager` infrastructure: the Map View, Family Chart View, and Entity Profile View stylesheets all migrate from media-query-only to dual-path mobile coverage. The original `@media (max-width)` blocks stay in place for narrow desktop and tablet leaves, and parallel `.cr-phone` blocks handle phones, where Obsidian's media queries don't fire reliably. Phones in landscape with wide viewports now get the compact mobile layouts on the Map's world-map-preview thumbnail and the Family Chart's info panel. The audit-plan finding that motivated the sub-arc split: the `MobileClassManager` mechanism only reaches registered views, not modals. The Control Center modal cluster and standalone wizards are captured in a separate sub-arc planning doc for a future cycle. Verified on Android via `chrome://inspect`.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02250-round-up-date-parser-relaxation-adoption-event-always-on-and-mobile-migration-first-batch-v02250)**

### v0.22.49 Round-Up: Adoption-event coverage, era-aware twin sort, and settings reorganization

**Adoption events on the sibling and grandparent Dynamic Timeline Blocks** ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)): Extension of the v0.22.48 [#618](https://github.com/banisterious/obsidian-charted-roots/issues/618) work. The adoption event itself (previously emitted only on the adoptive parent's timeline as `Adopted {name}`) now also renders on the focal person's sibling timeline and grandparent timeline (`Adoption of {name}` by default), so the focal person's experience of "your sibling joined the family" or "your grandchild joined the family" is visible on the right surfaces. Both new labels are customizable under the new top-level `Settings -> Timeline -> Timeline labels` section. Distinct from the adoptive parent's `Adopted {name}` so the surface is clear at a glance. Reported by @DigitalDreamn as a #618 follow-up.

**Dynamic Timeline Block: same-year twins now order correctly in descending eras** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) follow-on): The v0.22.48 twin tiebreak put the firstborn at the top of a pair, correct for ISO dates (chronological = oldest at top) but era-blind for descending eras (BBY, BCE, etc.) where the year sort already produces "newer at top". For a BBY twin pair, the firstborn was landing at the top, contradicting the surrounding old-at-bottom pattern. The comparator now detects descending-era dates and inverts the tiebreak direction so same-year twins follow the same direction as their year neighbours. Reported by @DigitalDreamn.

**Timeline settings now live in their own top-level section** (was under Advanced): The three Timeline subsections — Timeline layout, Timeline labels, and Family events on timelines — move from `Settings -> Advanced` to a new `Settings -> Timeline` top-level section, placed right after `Dates & validation` so the temporal-display settings cluster together. Matches the v0.22.39 Research / DNA tracking promotion. Timeline-related settings have grown to ~17 toggles and labels over the v0.22.x cycle, and burying them inside Advanced no longer reflects how frequently they're tuned. No setting names or values change, only the location.

**Filenames preserve parentheses and curly braces** ([#506](https://github.com/banisterious/obsidian-charted-roots/issues/506)): The shared name-sanitization helper used by all importers and entity-creation flows previously stripped `( )`, `[ ]`, and `{ }` from filenames on the assumption all six were wikilink-breaking. Empirical evidence proved that only square brackets actually break wikilinks (they are the delimiters themselves). The character class now preserves `( )` and `{ }` while still stripping `[ ]` and the filesystem-illegal set. User-facing effect: creating a universe named `Star Wars (AU)` now produces a file with parens preserved in the basename, and entity references match end-to-end. Same for person notes via the importers.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02249-round-up-adoption-event-coverage-expansion-era-aware-twin-tiebreak-and-audit-plan-progress-v02249)**

### v0.22.48 Round-Up: Dynamic Timeline coverage expansion, twin sort tiebreak, and Family Chart kinship-label anchor

**Children's and parent's marriages on Dynamic Timeline Blocks** ([#607](https://github.com/banisterious/obsidian-charted-roots/issues/607), [#608](https://github.com/banisterious/obsidian-charted-roots/issues/608)): Two new opt-in toggles round out the family-event coverage. `Show children's marriages` adds a child's marriage as a family event on the parent's timeline; `Show parent's marriages` does the symmetric thing on the child's side, capturing stepparent acquisitions (a bio parent's remarriage) and adoptive-couple marriages. Both cover biological, adopted, and step relations and render the spouse's name plus the optional marriage location. The parent's-marriages toggle skips the bio-pairing marriage so it doesn't duplicate the relationship that's already implicit in the parent links. Customizable label templates use `{name}` for the focal person and `{spouse}` for their partner. Reported by @DigitalDreamn.

**Dynamic Timeline Block: same-year twins now sort by birth-time suffix** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)): The Dynamic Timeline Block sorted entries by year alone, so twins sharing a year fell through to arbitrary insertion order rather than honoring the v0.22.46 sibling-sort consolidation. The sort now applies the same year-then-raw-date tiebreak used elsewhere in the plugin: when two entries share a year, a lex compare on the raw frontmatter date string breaks the tie. ISO dates with time (`1985-04-12T03:42` vs `1985-04-12T03:45`) and fictional-era dates with time (`BBY 29 T20:03:04` vs `BBY 29 T20:08:15`) now order firstborn before secondborn. Eleven new unit tests fence the comparator contract; the three duplicated sort sites in the renderer now share an extracted helper. Reported by @DigitalDreamn.

**"Show adopted children's births" toggle now governs sibling and grandparent timelines** ([#618](https://github.com/banisterious/obsidian-charted-roots/issues/618)): The toggle was honored on the adoptive parent's timeline but the sibling-births and grandchildren-births walks ignored it. Adopted siblings and adopted grandchildren leaked through as plain `Birth of {name}` entries indistinguishable from biological ones. Both walks now respect the toggle: when off, the adopted relation is filtered out; when on, the entry uses a distinct label (`Birth of adopted sibling {name}` and `Birth of adopted grandchild {name}` by default) so the relationship is visible at a glance. Both labels are customizable. Sibling-deaths walk is unchanged, since a sibling's death is meaningful regardless of adoption status. Reported by @DigitalDreamn.

**Family Chart: kinship Parent label aligns with each child's card and renders on stable positions** ([#619](https://github.com/banisterious/obsidian-charted-roots/issues/619)): Two-part fix for the `Show kinship labels` feature. The Parent label used to sit at the link path's arc-length midpoint, which for displaced children landed on the horizontal trunk rather than on each child's visible "line down" branch; the rightmost label could end up in empty trunk space with no card below it. The label now anchors above each child's card edge, positioned at the child's column, so each visible branch gets its own aligned label. Initial-render scheduling also stopped relying on a fixed delay that sometimes snapshotted SVG coordinates mid-animation, eliminating the bottom-card overlap that previously required a manual refresh to clear. Reported by @DigitalDreamn.

**Custom relationship "Maps to: Father" / "Maps to: Mother" now writes the gendered parent scalar** ([#616](https://github.com/banisterious/obsidian-charted-roots/issues/616)): The Add Relationship modal dispatches custom relationship saves based on which family-graph field the type maps to. Father and Mother were exposed as dropdown options alongside the gender-neutral Parent, but the save handler had no branches for them — they fell through to a flat custom-property write rather than landing in the canonical `father:` / `mother:` scalar fields. Canvas Family Tree, Family Chart, the Relationship Calculator, and the v0.22.47 conflict guard never saw the relationship. The handler now dispatches both directly to the same write path as the built-in Father / Mother types, picking up the conflict-guard prompt and the sex-mismatch warning. Surfaced during a #606 retest by @DigitalDreamn.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02248-round-up-timeline-coverage-expansion-twin-sort-tiebreak-and-family-chart-kinship-label-anchor-v02248)**

### v0.22.47 Round-Up: Per-field conflict guards, marriage-label anchor, and #591 follow-up

**Custom relationship type with parent mapping no longer silently overwrites existing father/mother** ([#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)): Adding a relationship via the Add Relationship modal whose custom type maps to "Parent" used to silently replace any existing `father` / `mother` reference on the source note — the previous parent disappeared from frontmatter with only a passing notice. The write now consults a per-field conflict policy that surfaces a confirmation modal showing which person is being replaced and offering Cancel or "Replace <name>" (warning-styled). Cancel preserves the existing data with no spurious notices. Confirmed Replace cleans up the previous parent's `children` array so they don't keep claiming a child who's been re-parented elsewhere. Reactive bidirectional sync writes continue to use their existing skip-on-conflict guard. Reported by @DigitalDreamn.

**Canvas Family Tree marriage labels anchor below the left spouse** ([#603](https://github.com/banisterious/obsidian-charted-roots/issues/603)): Marriage metadata (`m. <year>` plus optional location and status) previously rendered as an Obsidian Canvas edge label on the spouse-to-spouse connector. Obsidian Canvas pins edge labels at the geometric midpoint of the line, and the default siblings-then-spouses layout frequently places non-spouse cards between the spouse pair, so the midpoint label could appear to belong to the wrong relationship. Marriage info now renders as a small text node anchored directly below the left spouse card. Multiple marriages on the same person stack vertically below their card in spouse-index order. Reported by @DigitalDreamn.

**Fictional-era dates accept ISO 8601 time suffix for twin disambiguation** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up): The v0.22.46 sibling-sort time tiebreak was designed against standard ISO 8601 dates and didn't account for adding a time component to a fictional-era date like `BBY 29 T20:03:04`. The fictional date parser now strips an optional `T HH:MM[:SS]` suffix (with or without a leading space) before pattern-matching, so the era and year parse correctly while the raw frontmatter string stays available for the sibling-sort tiebreak. The Profile View header and Family Chart card display also strip the time component for cleaner rendering. The Edit Person modal's Birth date hint now mentions that appending `T HH:MM` is supported. Reported by @DigitalDreamn.

**Family Chart custom-relationship overlay: stable bow direction and endpoints at card edges** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591) follow-up): The v0.22.46 fix addressed the obvious overlay-clipping case but left three smaller issues on a pure vertical adoptive chain. The bow direction was unstable across renders (sometimes through an intermediate card, sometimes around it), bezier endpoints sat inside the source / target cards rather than at their edges, and the sag-scaling formula didn't guarantee enough clearance to bow around intermediate stacked cards. Endpoints now sort canonically before computing the perpendicular, each end clips to its card's rectangular boundary, and a verticality-weighted clearance term ensures vertical chords get enough sag. The fourth symptom from the same report (post-refresh top-endpoint drift) was not reproducible locally and is left for follow-up if it persists after the upgrade. Reported by @doctorwodka.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02247-round-up-per-field-conflict-guards-marriage-label-anchor-and-591-follow-up)**

### v0.22.46 Round-Up: Community-driven bug-fix release with timeline coverage expansion and Events filter additions

**Custom relationship overlay clipping and post-refresh shrink, both fixed** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591)): The Family Chart's custom-relationship overlay had two distinct bugs in the way it drew curves between non-family relationships across generations. The first was a geometry bug where the arc could clip through the cards of people standing between the two endpoints, especially on near-vertical chords like grandparent to grandchild. The second was a timing bug where, after pressing the chart's refresh button, the overlay would render before the chart had finished its entrance animation and capture stale card positions, collapsing the line into a tiny stub. Both fixes ship together. Reported by @doctorwodka.

**Gramps import: shared events no longer attribute non-Primary participants' deaths to themselves** ([#601](https://github.com/banisterious/obsidian-charted-roots/issues/601)): The Gramps XML importer was reading every event a person appeared on as if they were its subject, regardless of the event reference's role. So a person who appeared on a relative's death event as the informant (the family member who registered the death with the town hall, for example) was being imported into Obsidian as deceased themselves. The importer now filters event references to the Primary role only. Reported by Tiberius on the Obsidian Forum.

**Four new family-event toggles on the dynamic Timeline block** ([#582](https://github.com/banisterious/obsidian-charted-roots/issues/582)-[#585](https://github.com/banisterious/obsidian-charted-roots/issues/585)): The "Family events on timelines" settings panel gains four new opt-in toggles. Show children's deaths surfaces the death of a biological, adopted, or step-child on the parent's timeline when the parent was still living. Show stepparent deaths surfaces a stepparent's death on the stepchild's timeline. Show sibling deaths surfaces a sibling's death on the person's timeline, mirroring the existing sibling-births toggle. Show grandchildren's births surfaces a grandchild's birth on the grandparent's timeline. All four are opt-in and default off; each has a corresponding customizable label. Death events are filtered to those that occurred while the focal person was alive. Filed by @DigitalDreamn.

**Three new filters on the Events timeline: universe, place, and date range** ([#515](https://github.com/banisterious/obsidian-charted-roots/issues/515)): The Events tab Timeline card and the dockable Events sidebar gain three new filter controls beyond the existing type, person, and search trio. The universe filter scopes events by their `universe` field with sentinel options for "(real-world)" (no universe set) and "(any fictional)" (any universe set) alongside per-universe entries. The place filter scopes by event `place` wikilink. The date range filter narrows by year via two numeric inputs. The new controls live under a "More filters" disclosure so the primary filter row stays compact on narrow widths. The dockable sidebar persists all six filter values across Obsidian restarts.

**Sibling sort gains an ISO 8601 time tiebreak for twins and triplets** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590)): When two siblings share a birth date, the sort now falls through to a lexicographic compare on the raw `born` field, so twins and triplets recorded with an ISO 8601 time component (`born: 1985-04-12T03:42`) sort deterministically by birth order. Existing date-only values continue to work unchanged. As a side effect, siblings within the same calendar year also sort by month and day instead of falling through to insertion order. Applied across all five sibling-sort rendering surfaces in the codebase. Suggested by @DigitalDreamn.

**Event sort: point events before range events on tied start dates** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up): When two events share a start date and only one has a `date_end`, the point event now sorts first. Reader intuition matches this rule: discrete events on a date show before multi-year states that began on that date (for example, "1920 Census Residence" sorts before "Residence 1920-1925"). Reported by @DigitalDreamn after running the v0.22.45 auto-compute and finding the residence event still pinned to the top.

**Family Chart Person details pane now actually hides when closed** ([#604](https://github.com/banisterious/obsidian-charted-roots/issues/604)): A CSS specificity collision was preventing the panel's hidden state from applying. The panel auto-opened on chart load and the X close button silently did nothing. Reported by @DigitalDreamn.

**Family Chart sibling sort: fictional-era-aware, with the #590 time tiebreak** ([#605](https://github.com/banisterious/obsidian-charted-roots/issues/605)): The interactive Family Chart's sibling sort was using straight lexicographic compare on birthday strings, which sorted "BBY 19" before "BBY 22" even though 22 BBY is chronologically earlier than 19 BBY. The sort now matches the other four sibling-sort surfaces: universe-aware canonical-year compare with the same ISO 8601 time tiebreak introduced by #590 elsewhere in this release.

**Scanner CSS cleanup: timeline-callout multicolumn migrated to CSS Grid**: The timeline-callout multi-column layout previously used CSS multicolumn properties that the Community automated review flagged as partially supported. The rules now use `display: grid` with `repeat(auto-fill, minmax(...))`, which is universally supported and flagged clean. Reading order shifts from column-major to row-major; for typical timeline lengths the visual flow reads naturally in either pattern. Closes the last CSS-lint warning the scanner was flagging on v0.22.45.

**[Read the full release notes ->](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02246-round-up-community-driven-bug-fix-release-with-timeline-coverage-expansion-and-events-filter-additions)**

### v0.22.45 Round-Up: Bundle hygiene, sibling-sort consolidation, and community-reported fixes

**Event picker person filter** ([#581](https://github.com/banisterious/obsidian-charted-roots/issues/581)): The Relative ordering event picker (Create / Edit Event modal, the "Add" button on the After or Before fields) gains a new "Person:" dropdown alongside the existing Type filter. Source values are deduplicated from each event's participant fields. Reduces scrolling when multiple people have similarly-titled events (for example, multiple characters who each have a "Begins training at the Jedi Temple" event). Suggested by @DigitalDreamn after using the v0.22.39 UI on Ahsoka's events.

**Event ordering takes effect immediately on save** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up): Saving an event with `before` / `after` constraints now recomputes `sort_order` values across all events in the background, so the Events tab and Profile View Events section reflect the narrative order right away. Previously the constraints had to be materialized by running the "Compute sort order" command manually before they would take effect in those rendering surfaces. The recompute fires fire-and-forget so the modal closes immediately; a cycle notice surfaces asynchronously if the constraints form a cycle.

**Add Custom Relationship modal honors the gender-neutral parent setting** ([#579](https://github.com/banisterious/obsidian-charted-roots/issues/579), [#580](https://github.com/banisterious/obsidian-charted-roots/issues/580)): The modal's `parent` save path was unconditionally routing to gendered `mother` / `father` fields, ignoring the "Enable gender-neutral parent property" setting (#579) and falling back to `father` for parents with non-binary sex (#580). The save path now routes to the gender-neutral `parents` array when either the setting is on or the target's sex isn't `male` / `female`. Otherwise the gendered path is unchanged. Reported by @doctorwodka.

**Children sort by birth date across Profile View, Canvas Family Tree, and report surfaces** ([#586](https://github.com/banisterious/obsidian-charted-roots/issues/586), [#587](https://github.com/banisterious/obsidian-charted-roots/issues/587)): Three rendering surfaces had been emitting children in frontmatter array order rather than birth order: the Profile View Children section (#586), Canvas Family Tree (#587), and seven additional report / visual-tree / family-timeline surfaces (Family Group Sheet, Individual Summary, Register, Descendant Chart, Source Summary, Visual Tree, Family Timeline view). All now sort by birth date with universe-aware canonical-year comparison, so descending fictional eras (BBY / GR / EF / DE etc.) order correctly alongside Gregorian dates. Bio + adopted + step children merge into a single age-sorted list. Reported by @DigitalDreamn. Architectural follow-up tracked at [#588](https://github.com/banisterious/obsidian-charted-roots/issues/588).

**Under the hood: `main.js` size reduced 50% (14.7 MB to 8.27 MB)**: Production minify enabled in the esbuild config. The "main.js exceeds Sync Standard 5 MB threshold" caveat in the 1.0 release notes softens substantially (~3.4 MB remaining versus ~9.5 MB previously). Fully closing the threshold requires structural moves that stay post-1.0 scope. The same release also closes the Dynamic Code Execution scanner Recommendation via a new pdfmake postinstall patch that strips two unreachable `new Function("return this")()` sites from the bundled core-js globalThis polyfill and webpack runtime.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02245-round-up-bundle-hygiene-sibling-sort-consolidation-and-community-reported-fixes-v02245)**

---

### v0.22.39 Round-Up: Event ordering UI, map view hardening, and Family Chart asymmetry drop

**Event Relative ordering UI** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569)): The Create / Edit Event modal now exposes "After these events:" and "Before these events:" chip-list pickers for setting the `before` / `after` constraint arrays. The topological sort in the timeline exporters has supported these constraints since v0.20.x, but until now they could only be set via manual YAML editing. Use this for events with unknown or imprecise dates where chronology depends on relative ordering rather than calendar values.

**Family Chart no longer freezes Obsidian on asymmetric relationship data** ([#575](https://github.com/banisterious/obsidian-charted-roots/issues/575)): When a person note had a relationship `_id` field set but the corresponding wikilink half missing (a state that can be produced by interrupted writes, sync conflicts, or partial frontmatter edits), the family-chart library's tree construction could enter an infinite loop that froze the entire Obsidian app. A bidirectional-symmetry pass now drops any asymmetric reference with a console warning before the data reaches the library; the chart renders correctly with whatever symmetric data remains. The underlying note data is not modified. Reporter @D4B2A.

**Map view reliability** ([#574](https://github.com/banisterious/obsidian-charted-roots/issues/574) follow-ups): Four cascading patterns fixed during recent custom-map testing. A spurious WebSocket console error from leaflet-distortableimage's bundled webpack-dev-server client is now silenced via a postinstall patch. Cluster cleanup errors during map close no longer cascade to break the next map open. Leaflet plugin registrations now survive multiple open / close cycles via a defensive `window.L = L` reattach on every invocation. The child-map header layout no longer wraps awkwardly on long map names: the breadcrumb moved to its own row and the map selector caps at 240px with ellipsis.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02239-round-up-event-ordering-ui-map-view-hardening-and-family-chart-asymmetry-drop-v02239)**

---

### v0.22.40 – v0.22.42 Round-Up: Plugin restored to Community Plugins after scanner severity escalation

Between v0.22.38 and v0.22.39's post-release scans, Obsidian's Community automated review promoted a previously-warning rule to error severity, demoting Charted Roots on the Community Plugins website (Install button disabled, plugin hidden from the in-app browser). v0.22.40 and v0.22.41 closed the nine flagged sites: all dead-code feature-detection in vendored libraries that never executes in Obsidian's Electron runtime. The fixes involved stubbing a webpack chunk loader, migrating ODT generation from `jszip` to `fflate`, and stripping an IE5-8 polyfill from `core-js` (and `pdfmake`'s bundled copy of `core-js`). v0.22.42 followed up on a related Behavior Warning about periodic background data transmission by migrating three plugin `setInterval` sites to recursive `setTimeout` and stubbing two dead-code polling loops in a bundled library. Final post-release scan returned clean of errors; demotion lifted. Users already installed retained the plugin throughout.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02240--v02242-round-up-scanner-severity-response-arc-v02240v02242)**

---

### v0.22.38 Round-Up: Native button migration and custom relationship display fix

**Native button migration**: Roughly 190 button markup sites converted to Obsidian's native `ButtonComponent` API across 50+ files. The shift covers standalone primary, secondary, and danger buttons plus bare neutrals. Native buttons inherit Obsidian's theme conventions, so modal "Cancel" / "Save" / "Apply" footers now match the standard CTA look across light, dark, and community themes. Compact list-row buttons (87 sites in dense surfaces) and icon-only toolbar buttons retain their custom variants. Most modal CTAs are slightly more compact and theme-consistent; some surfaces may look subtly different across themes.

**Custom relationship category names display correctly in the Entity Profile View** ([#570](https://github.com/banisterious/obsidian-charted-roots/issues/570)): The "Other relationships" section was rendering the internal storage identifier with first-letter capitalization, producing display strings like "Jedi_order" for a category configured as "Jedi Order". The category-name lookup now routes through the existing `getRelationshipCategoryName()` helper, which checks customizations, custom categories, and built-ins before falling back to `capitalize(slug)` only for unknown IDs. Built-in Custom Relationship categories also benefit from the routing change. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02238-round-up-native-button-migration-css-scan-cleanup-and-custom-relationship-display-v02238)**

---

### v0.22.32 – v0.22.37 Round-Up: Community Automated Review cleanup arc

This six-release arc was mostly internal scan-response work spread across June 2026. Two user-visible items landed in passing:

**Map view's Fullscreen toolbar button now shows an icon** (v0.22.34): The Fullscreen button on Map view had been a blank square since the feature first shipped: the `leaflet-fullscreen` package's bundled CSS referenced an external `fullscreen.png` sprite that was never included in Charted Roots' shipped stylesheet. Surfaced indirectly during the v0.22.34 `!important` audit. Replaced with inline SVG icons (Lucide-style maximize / minimize) drawn via CSS `mask`, so the icons adapt to the current text color and stay theme-aware. Both the default state and the active (`leaflet-fullscreen-on`) state are covered.

**Era abbreviations now render in the Timeline flat-list view** ([#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) follow-up, v0.22.32): The v0.22.31 era-abbreviation fix routed two of the three Timeline render paths through the new `formatYearForDisplay` helper, but missed the flat-list rendering, the most common Timeline render path. Bare years still appeared where `BBY 1045` / `EF 30` / `DE 1265` should have. Same one-line fix as the other two sites. Surfaced by [@doctorwodka](https://github.com/doctorwodka) during v0.22.31 verification.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02232--v02237-round-up-community-automated-review-cleanup-arc-v02232v02237)**

---

### v0.22.31 Round-Up: Fictional-date cluster and command rename

**Fictional-date cluster: five fixes for parallel date-handling helpers** ([#562](https://github.com/banisterious/obsidian-charted-roots/issues/562), [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563), [#564](https://github.com/banisterious/obsidian-charted-roots/issues/564), [#565](https://github.com/banisterious/obsidian-charted-roots/issues/565), [#566](https://github.com/banisterious/obsidian-charted-roots/issues/566)): Five reporter-surfaced issues landed within twenty-four hours of each other and turned out to share the same structural shape: parallel date-handling helpers across the codebase that were fictional-blind where the central `DateService` is fictional-aware. The symptoms varied: fictional dates with `ish` or `?` markers dropping off Timeline Density, era abbreviations being silently stripped, multi-era events sorting alphabetically, timeline-block age annotations rendering era-stripped, and cross-era characters silently disappearing from Longevity Analysis. All five surfaces fixed via era-aware parsing helpers, plus a Phase 1 investigation doc capturing the pattern as the seed for a post-1.0 consolidation. Forty-six new regression tests. Reported by [@doctorwodka](https://github.com/doctorwodka) and [@DigitalDreamn](https://github.com/DigitalDreamn).

**Command rename: "Open command menu" is now "Open quick actions"**: The categorized command launcher was registered with the id `open-command-menu` and the name "Open command menu". Obsidian's new Community automated review platform (launched 2026-05-12) flags both: the rule rejects commands that use the word "command" in their id or name. The launcher itself is unchanged. **Users with custom hotkeys bound to the previous "Open command menu" command will need to rebind** under Settings → Hotkeys by searching for "Open quick actions". The internal modal class and source file stay as-is.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02231-round-up-fictional-date-cluster-community-review-cleanup-and-pop-out-window-timer-migration-v02231)**

---

### v0.22.30 Round-Up: cr_id collision filter, negative-year decade bucketing, and Family Chart hardening

**Wikilinks no longer redirect to recovered-duplicate files outside the Charted Roots folder** ([#559](https://github.com/banisterious/obsidian-charted-roots/issues/559)): When a vault carried two notes sharing the same `cr_id` (typically a canonical Charted Roots note plus an outside-CR duplicate recovered via Obsidian's File Recovery, copied during troubleshooting, or archived elsewhere), saving a related note could silently rewrite the wikilink to point at the duplicate. The note then "disappeared" from Family blocks and Edit Person children lists because the resolved file wasn't a CR-typed note. The cr_id stayed correct in the paired `_id` array, so underlying data wasn't lost; only the displayed wikilink got redirected. The cr_id resolver now scopes to files that also carry the expected `cr_type` in their frontmatter. Reported by @DigitalDreamn via the #537 follow-up thread.

**Negative-year decade bucketing on Longevity Analysis and Timeline Density** ([#560](https://github.com/banisterious/obsidian-charted-roots/issues/560)): Both Statistics views computed decade buckets using `Math.floor`, which rounds toward negative infinity. For fictional-vault users with BCE-style descending eras, `-25` ended up in the `-30s` bucket instead of the `-20s`, and any non-multiple-of-ten negative year was off by one decade. Now switched to `Math.trunc`, which rounds toward zero and matches BCE / BBY convention. Reported by @doctorwodka.

**Family Chart circle-card rendering no longer interprets person names as HTML**: The Family Chart circle-card update path replaced a card's `outerHTML` with a template-literal-built string that interpolated user-supplied person names, alt names, and avatar paths directly. A name containing HTML characters would render as markup, and a deliberately crafted name could execute as a script tag. The cards now rebuild via DOM APIs so all interpolated content is text-only. No behavioral change for well-formed data; malicious or accidentally HTML-bearing frontmatter values now render literally as text.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02230-round-up-cr_id-collision-filter-negative-year-decade-bucketing-and-family-chart-xss-hardening-v02230)**

---

### v0.22.29 Round-Up: Bidirectional-sync audit closures

**Property aliases UI now lists `alt_name`, `pronouns`, `religion`, and `caste`** ([#551](https://github.com/banisterious/obsidian-charted-roots/issues/551)): The descriptive-field cluster had shipped throughout the rest of the plugin months ago, but Settings → Properties → "Property and value configuration" → Person properties never registered them. Users with custom YAML key names for these fields couldn't map them through the UI and had to either rename the keys in their notes or live without the aliases. The four properties are now in the registry. Person-side `title` is deferred (collision with events and sources). Reported by @grg3wong via the upstream `donatso/family-chart` repo.

**The bidirectional linker honors the `partners` alias for `spouse`** ([#556](https://github.com/banisterious/obsidian-charted-roots/issues/556)): The property-alias system had long registered `partners` as a canonical equivalent to `spouse`, but the bidirectional linker did not. Users who had chosen `partners` as their canonical got none of the spouse-side behavior: no reciprocal write to the partner's note, no marriage-detail mirroring, and the deletion-detection guard treated every save as a phantom removal cascade. Closed at five sites in the linker; the unlink path also sweeps both `spouse*` and `partners*` arrays so removals complete regardless of which canonical the target uses.

**Adding `step_child` on a parent's note back-fills the child's `stepfather` / `stepmother`** ([#554](https://github.com/banisterious/obsidian-charted-roots/issues/554)): Step-relationship sync had been bidirectional in one direction: setting `stepfather: [[Parent]]` on a child's note added the child to the parent's `step_child` array. The reverse direction was missing: setting `step_child: [[Child]]` directly on a parent's note left the child's `stepfather` / `stepmother` empty. Asymmetric with the `adopted_child` analogue, which had always covered both directions. The missing direction now writes `stepfather` or `stepmother` on each child based on the parent's sex. Sync skips silently when sex isn't set.

**Person rename rewraps wikilinks in every relationship-array field** ([#555](https://github.com/banisterious/obsidian-charted-roots/issues/555)): When you rename a person via the Edit Person modal, the plugin walks referencing notes and rewrites their wikilink fields. Previously the rewrite consulted a hardcoded list of nine kinship fields, so any other relationship-array field (indexed-spouse slots, `adopted_child` / `step_child` arrays on parents' notes, the gender-neutral `adoptive_parent` array, custom relationships like `mentor` or `godparent`) kept its pre-rename form. The rewrite is now generic: walks every `<field>_id` / `<field>` pair in the frontmatter. Future relationship types are covered automatically.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02229-round-up-bidirectional-sync-audit-and-the-seven-gaps-it-surfaced-v02229)**

---

### v0.22.28 Round-Up: Edit-modal display coverage

**Edit modal display strips wikilink path / pipe across Person spouses, Organization, and Event fields** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543), [#549](https://github.com/banisterious/obsidian-charted-roots/issues/549)): Several modal fields had been displaying the raw inner content of wikilinks rather than the friendly display name. On Edit Person, the Spouse list and the marriage location showed the raw piped form like `Charted Roots/People/Rebecca Wilkin|Rebecca Wilkin` while Father / Mother displayed cleanly. On Edit Organization (parent_org, seat) and Edit Event (place, timeline), the same gap existed. All four sites now use the same display-cleanup helper that Father / Mother fields have been using since v0.22.25, plus a writer-side re-canonicalization on save for the user-typed free-text fields. Underlying frontmatter stays unchanged.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02228-round-up-edit-modal-display-coverage-and-property-based-fuzz-expansion-v02228)**

---

### v0.22.27 Round-Up: Faster batch cleanups

**Batch cleanups on People, Places, and the data-quality wizard finish faster** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)): The data-quality batch operations (deduplicate relationships, remove placeholder values, normalize names, repair missing IDs, fix bidirectional inconsistencies, and so on) used to pause for 2 seconds at the end of each run. The pause was a defensive workaround for a subtle timing problem: Obsidian's metadata cache catches up asynchronously after frontmatter writes, and the plugin's family-graph cache rebuild needed to wait long enough for that catch-up before re-reading. The fixed 2-second wait is now event-driven: the cache rebuild waits exactly as long as Obsidian needs (typically tens of milliseconds) before proceeding. Same shape applied to the place, organization, and universe graphs; newly created organizations, universes, and places appear immediately in dropdowns instead of occasionally requiring a manual refresh.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02227-round-up-cache-race-audit-and-the-end-of-the-2-second-sleep-v02227)**

---

### v0.22.26 Round-Up: RelationshipQueryService and the adopted/step children coverage sweep

**Canvas Family Tree connects adopted children and step-relationships consistently** ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545)): Generating a Canvas Family Tree from any ancestor of an adoptive parent was silently dropping adopted children entirely: the descendant-tree builder was emitting an adoptive-parent edge but never adding the child as a positioned node, so canvas rendering dropped the edge for missing endpoint position. The same investigation surfaced a second bug: step-parent edges were being silently dropped when the step-parent happened to be reached via a different path first, because the cycle-detection check was doubling as an edge-emission gate. Both fixed: descendant builder now adds adopted children to the rendered tree, the full-tree builder walks adopted and step children from the parent's side, the family-chart layout's fallback positioning recognizes adoptive and step parents, and edge emission is decoupled from cycle-checking. Reported by @DigitalDreamn.

**Family Timeline view includes adopted and step children** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)): The family-timeline view (badge on People Tab rows, modal in Control Center) was iterating only biological children when collecting events for the focal person's family. A focal person whose only children were adopted would see a timeline showing just self and spouse, with no indication that their adopted children had been omitted. The same gap caused the People Tab badge to undercount members in blended families. Both fixed via a new unified relationship query service. Latent gap surfaced during architectural inventory rather than user-reported, but the fix lands alongside the user-facing Canvas Family Tree work since they're the same code-path family.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02226-round-up-relationshipqueryservice-and-the-adoptedstep-children-coverage-sweep-v02226)**

---

### v0.22.25 Round-Up: Modal display parsing and membership writer cleanup

**Edit Person modal displays clean labels for relationship and place fields** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543)): The "Linked to:" labels and read-only input fields in the Edit Person modal were rendering the raw inner content of wikilinks (`Charted Roots/People/Errol Naberrie|Errol Naberrie` instead of `Errol Naberrie`) for any relationship or place field whose underlying frontmatter stored a piped or path-form wikilink. Surfaced after the #540 basename-disambiguation landed in v0.22.24: the canonical `[[path|basename]]` form is correct on disk, but the modal didn't parse it for display. Added a small `extractDisplayLabel` helper mirroring the writer-side stem-collapse pattern. Underlying frontmatter stays raw; the writer re-canonicalizes on save. Reported by @DigitalDreamn.

**Org wikilink writes from the membership flow route through the canonical helper** ([#542](https://github.com/banisterious/obsidian-charted-roots/issues/542)): The membership service's `addMembership` was pushing the org wikilink into the `membership_orgs` frontmatter array verbatim, bypassing the input-shape normalization (#537 / #538) and basename-ambiguity disambiguation (#540) that every other relationship-field write got. Path-form residue persisted indefinitely; new entries didn't disambiguate at write time even when basename collisions existed. Now routes new entries through the canonical wikilink helper and adds a full-array rewrite pass on every save, so existing entries normalize alongside the new one.

**Org-side member sync waits for the metadata cache to refresh** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) follow-up): The v0.22.24 #541 fix triggered the org's `members` / `members_id` sync from person-side membership add/remove flows, but the sync re-read the metadata cache to assemble the member list, and Obsidian's `processFrontMatter` updates the file synchronously while the cache update fires asynchronously. Result: the sync ran on stale cache and wrote a member list trailing one update behind. Now uses a wait-for-cache-refresh helper that listens for the next metadata cache update before triggering the sync, with a 500ms timeout fallback. Caught by @DigitalDreamn with a multi-Jedi test.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02225-round-up-modal-display-parsing-membership-writer-cleanup-and-cache-timing-follow-up-v02225)**

---

### v0.22.24 Round-Up: Wikilink writer hardening and custom relationships

**File paths in wikilink alias slots self-heal on save** ([#538](https://github.com/banisterious/obsidian-charted-roots/issues/538)): Some on-disk wikilinks had a file path captured into the alias slot, typically residue from periods when a vault contained duplicate-basename files outside the plugin's folder structure. The v0.22.22 #537 self-heal collapsed pipe-stem accumulation but didn't recognize path-form input. A slash-strip step is now added to the round-trip collapse: when a file path appears in the alias slot, it gets stripped to the basename on the next Edit Person save. Surfaced by @DigitalDreamn during v0.22.22 verification.

**The wikilink writer disambiguates when basenames collide with files outside the plugin's folder structure** ([#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)): When a vault contains two files sharing the same basename (a Charted Roots person note plus an unrelated note elsewhere), Obsidian's link resolver picks one based on its own heuristics, and the plugin's `[[basename]]` wikilinks could land on the wrong file. Symptoms: cross-folder connections in Graph view, click-through navigation to the wrong note, silent rewiring to the non-CR sibling on subsequent saves. The writer now detects basename ambiguity at write time and emits the path-form target with the basename as alias (`[[Charted Roots/People/Plo Koon|Plo Koon]]`) so the resolver lands unambiguously while the display text stays clean.

**The Dynamic Relationship Block's `all` mode displays custom-typed relationships** ([#539](https://github.com/banisterious/obsidian-charted-roots/issues/539)): The wiki contract for `type: all` was "everything in extended, plus custom-typed relationships declared in the person's relationships frontmatter array (mentor, godparent, ally, etc.)." In practice the renderer ignored the custom-relationships array entirely; only the family-graph-derived sections (parents, spouse, children, siblings) ever rendered. The fix fetches the person's relationships, filters to non-family-mapped types using the same predicate the Profile View's "Other Relationships" subsection uses, deduplicates symmetric pairs, and groups entries by relationship type name.

**Adding an organization membership from Edit Person syncs to the organization's frontmatter** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541)): The bidirectional sync keeping an organization's `members` / `members_id` frontmatter in step with the person-side `org_membership_*` properties was only triggered from the org-side "Manage Members" modal. Adding or removing membership through the Person's Edit Person → Add Membership flow updated the person's frontmatter but didn't propagate the change back to the org. Mostly invisible because the Org Profile View's Members section and the dynamic Members block both assemble member lists by scanning person notes; the discrepancy only surfaced in Obsidian Bases queries that read the org's own frontmatter directly. Fix triggers the sync from both `addMembership` and `removeMembership` paths.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02224-round-up-wikilink-writer-hardening-custom-relationships-in-all-mode-and-org-membership-sync-v02224)**

---

### v0.22.23 Hotfix: Marriage-detail symmetric write

**Marriage details write symmetrically when linking a new spouse** ([#534](https://github.com/banisterious/obsidian-charted-roots/issues/534)): Linking a new spouse via Edit Person and adding marriage details (date / location / status / divorce date) in the same save was correctly writing the indexed companion fields to the editing person's frontmatter but leaving the spouse's frontmatter with only the flat link, no marriage details mirrored across. The fix unifies the bidirectional linker's spouse-write paths: whenever the source provides marriage details, the target now lands in the indexed frontmatter format that has the necessary slots to receive them. Both new-link and re-edit-with-details cases are covered. Reported by @DigitalDreamn. Shipped same-day as v0.22.23 follow-up to the v0.22.22 batch.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02223-hotfix-marriage-detail-symmetric-write-v02223)**

---

### v0.22.22 Round-Up: Wikilink cascade self-heal, Profile View symmetry, and media captions

**Wikilink corruption from earlier internal helper changes self-heals on save** ([#537](https://github.com/banisterious/obsidian-charted-roots/issues/537)): A latent regression introduced by earlier work on the wikilink-writing helpers (the v0.22.17 disambiguation feature, broadened in v0.22.19) was causing repeated saves to add an extra `|alias` segment to existing wikilinks. After two or three saves the wikilink would end up with three or more pipes and stop being parseable, at which point the bidirectional linker would treat the slot as broken and silently drop the reference, propagating the loss outward through related notes. The bug only fired on people whose `name` differed from their filename basename, but in vaults with that pattern it was deterministic on every save. **The fix is self-healing.** Vaults with already-corrupted entries collapse back to canonical form automatically on the next save through Edit Person, no manual repair needed. Reported by @DigitalDreamn.

**The Person Profile View shows organization memberships** ([#536](https://github.com/banisterious/obsidian-charted-roots/issues/536)): A new "Memberships" section appears between Relationships and Events on a person's profile when they have at least one organization membership (hidden otherwise). Each row shows the role label, organization link, date range, a "Current" badge for ongoing memberships, and per-membership notes on a separate line beneath. Closes a long-standing UX symmetry gap: the Organization Profile View has shown members for a while, but the Person Profile didn't show what organizations they belonged to. Reported by @doctorwodka.

**Members in the Org Profile View group and sort by role** ([#535](https://github.com/banisterious/obsidian-charted-roots/issues/535)): Previously the Members section in the Organization Profile View rendered as a flat list with `member` array order: readable for small orgs but hard to parse once role distinctions mattered. Members now appear under uppercase role headings (`FOUNDER`, `BISHOP`, etc.) with members sorted by name within each group, and a "MEMBERS" heading covering anyone with no explicit role. The org's declared `roles` list pins a sequence at the top, remaining named roles fall through alphabetically, no-role group last. Reported by @doctorwodka.

**Per-image captions in the dynamic media gallery** ([#523](https://github.com/banisterious/obsidian-charted-roots/issues/523)): Each thumbnail in the `charted-roots-media` block can now carry a short caption, useful for the deep-archive use case where many photos per person each benefit from a brief label like "1978 - Jon Aged 3" rather than a single long-form description in the note body. Captions render beneath the thumbnail in muted text, single-line truncated with full text on hover. Right-click any thumbnail for **Set caption** / **Edit caption** / **Remove caption** options. Captions persist as a flat parallel array in frontmatter, reshuffle in lockstep with media reorder, and ride through frozen-gallery export by injecting into the wikilink alias slot. Reported by @xBlack-Dogx via discussion [#521](https://github.com/banisterious/obsidian-charted-roots/discussions/521).

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02222-round-up-wikilink-cascade-self-heal-profile-view-symmetry-and-media-captions-v02222)**

---

### v0.22.21 Round-Up: Dynamic Block coverage for adopted and step relationships

**Adopted children and siblings appear consistently across the Dynamic Relationship Block and Timeline** ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531)): Two cascade effects from v0.22.20's #525 / #526 routing change went unnoticed at release. That fix moved adopted children out of the parent's "biological children" bucket so the Relationship Calculator would stop labeling them as blood relations, but three rendering paths still read only from the bio bucket. Bio siblings stopped seeing their adopted siblings in the Dynamic Relationship Block, the Dynamic Timeline Block stopped showing adopted-sibling birth events, and adoptive parents stopped seeing their adopted children listed under "Children". All three views now surface adopted children and siblings correctly, with adopted children labeled "Adopted child" mirroring how adoptive parents are already labeled. Reported by @DigitalDreamn.

**Siblings in the Dynamic Relationship Block sort by birth date** ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532)): The block had been displaying siblings in whatever order they were listed in the parent's frontmatter `children:` array, exposed the moment a sibling was added later or out of order. The new sort respects custom-calendar conventions: descending fictional eras (BBY, etc.) order oldest-first the same as Gregorian dates, because the comparator works on a canonical-year scale rather than raw numeric values. Persons without a parseable birth date sink to the end while preserving relative order.

**Custom relationship types filed under the Family category render in the Profile view** ([#533](https://github.com/banisterious/obsidian-charted-roots/issues/533)): A custom type configured under the "Family" category (like a user-defined `twin`) was being silently dropped from the Profile pane between two filters: the Other subsection's category check excluded it, and the Family subsection only knew about the built-in bio fields. The data persisted to frontmatter correctly, but the row was invisible. Family-category custom relationships now render inline inside the Family subsection alongside the bio family rows, grouped by type name, with their per-relationship `<type>_notes` displayed beneath each row in italic muted text.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02221-round-up-dynamic-block-display-paths-and-profile-view-family-custom-routing-v02221)**

---

### v0.22.20 Round-Up: Mobile pre-release verification and two follow-up fixes from v0.22.19

**Map view filter row wraps onto its own line on Android phones** ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)): The center toolbar filters (collection picker, year-range inputs) had been overflowing past the right edge of the viewport on Android phones, visible labels reading `All collection`, `Fron`, `To y`. v0.22.19 added a `Platform.isPhone` class-based fallback that didn't actually fix the bug; on-device DevTools revealed both paths set `width: 100%`, which is silently overridden by the inherited `flex-basis: 0` from the base `flex: 1` declaration. v0.22.20 replaced `width: 100%` with `flex: 0 0 100%` and verified on-device pre-release. The cycle established a new pre-release device-verification step for any `mobile-*`-labeled fix.

**Notes from the Add Custom Relationship modal are persisted** ([#530](https://github.com/banisterious/obsidian-charted-roots/issues/530), via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529)): The "Notes (optional)" textarea in the Add Custom Relationship modal had been capturing what users typed but silently discarding it on save. Notes now persist as parallel `<type>_notes` flat arrays alongside the existing `<type>` and `<type>_id` arrays, index-aligned with the targets array, matching the existing `<type>_from` / `<type>_to` parallel-array convention. Notes display in the Entity Profile relationships section beneath each row that has one. Currently scoped to non-bio relationship types; bio family relationships use dedicated frontmatter fields with no notes slot.

**Wikilinks generated by the relationship picker resolve correctly when name and filename diverge** ([#524](https://github.com/banisterious/obsidian-charted-roots/issues/524)): The writers' `createSmartWikilink` derived files from name via `getFirstLinkpathDest`, which returned null when no file's basename matched the name: a common case for users filing women under maiden name with the display name set to the married name. The fall-through wrote a bare `[[name]]` form that didn't resolve to anything, while the parallel `cr_id` link stayed correct, so the bug was silent until a user clicked the wikilink. The helper now accepts an optional `crId` and resolves the file by id when provided, falling back to the name-based lookup when no cr_id is available.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02220-round-up-mobile-pre-release-verification-and-two-follow-up-fixes-from-v02219-v02220)**

---

### v0.22.19 Round-Up: Relationship Calculator BFS expansion

**Relationship Calculator handles step and adoptive relationships in both directions** ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526)): The Relationship Calculator's BFS only traversed bio-relationship edges and ignored the step and adoptive edges that the family graph already populates on each person node. Going Galen → Ben as adoptive father returned "Not related" with a BFS-exhausted warning; going Anakin → Cliegg as stepparent returned "Parent-in-law" while Cliegg → Anakin returned "Child" with `Blood: Yes`: the same two-hop path producing two wrong direction-asymmetric labels. The fix now produces **Stepparent**, **Stepchild**, **Stepsibling**, **Adoptive parent**, **Adopted child**, and **Adoptive sibling** labels symmetrically, with multi-hop variants (Step-grandparent, Adoptive grandparent, Step-aunt/uncle, Adoptive cousin, etc.), and flags `Blood relation: No` whenever a path crosses a step or adoptive edge. Landed in two passes: v0.22.19 expanded the BFS; v0.22.20 fixed a separate parser bug that had been masking the parent → child direction. Reported by @DigitalDreamn.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02219-round-up-wikilink-cr_id-disambiguation-and-relationship-calculator-bfs-expansion-v02219)**

---

### v0.22.18 Round-Up: Profile-pane cache race and three rendering fixes

**Two rendering fixes surfaced while authoring the chartedroots.com guides section** ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514), [#516](https://github.com/banisterious/obsidian-charted-roots/issues/516)): The Merge Wizard component creates ~20 distinct `cr-merge-*` class names but no CSS file ever defined any of them; the layout fell back to default block flow, stacking each field / value / value / dropdown vertically instead of as the side-by-side comparison the component was always built to render. New `styles/merge-wizard.css` wires up the grid. A sibling fix landed the same release in the People base's Spouse(s) column, which mapped directly to `note.spouse` only, so vaults using the recommended indexed pattern (`spouse1`, `spouse2`, etc.) saw an empty column even when multiple spouses were recorded. A new `spouses_all` formula aggregates the flat `spouse` plus `spouse1` through `spouse5`. Both bugs were authoring-time discoveries during guide drafting.

**Entity Profile pane stops showing "Could not load entity data" for newly-created entities** ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519)): A metadata-cache race in `EventService`, `SourceService`, and `ProofSummaryService`. Each service loaded its cache lazily and invalidated on writes, but didn't react to Obsidian indexing the new file later. After `createEvent` (or `createSource`, or `createProof`), a read between the write and Obsidian's metadata catch-up silently skipped the new file and marked the cache valid without it. Each service now subscribes to `metadataCache.on('changed')` plus vault delete / rename, invalidating when a relevant `cr_type` file moves through the index. Reported by @DigitalDreamn.

**Report chapters in Book Builder no longer leak raw `[[wikilink]]` syntax into PDF / ODT output** ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522)): `BookGenerationService` already sanitized vault-note chapter content through a helper that strips wikilinks, frontmatter, and dynamic blocks, but the report chapter path stored the report generator's markdown into the chapter directly with no sanitization. Report generators emit raw `[[Name]]` syntax intentionally for in-vault rendering, which the static export renderer then displayed as literal text. `generateReportChapter` now applies the same sanitizer. Affects all four report chapter types when used in books.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02218-round-up-profile-pane-cache-race-and-three-rendering-fixes-v02218)**

---

### v0.22.17 Round-Up: Edit Person hardening and a citation surface promotion

A small release matching the title: Edit Person modal received several smaller hardening fixes, and citation handling was promoted to a more prominent surface in the relationships rendering path. See the wiki for the full per-issue breakdown.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02217-round-up-edit-person-hardening-and-a-citation-surface-promotion-v02217)**

---

### v0.22.16 Round-Up: Modal polish, marriage popup parity, and filename casing

A polish release covering three small user-facing surfaces: modal styling refinements, marriage popup consistency between Edit Person and the map view (matching the parity work done elsewhere across v0.22.x), and a fix for filename-casing differences on case-sensitive filesystems. See the wiki for the per-issue breakdown.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02216-round-up-modal-polish-marriage-popup-parity-and-filename-casing-v02216)**

---

### v0.22.15 Round-Up: Universe rename cascade coverage and marriage popup partner age

**Universe rename cascade coverage** picked up additional referencing surfaces missed in the v0.22.12 Part 2 work, and the marriage popup gained a partner-age display matching the v0.22.8 map popup ages and full date ranges work. See the wiki for the per-issue breakdown.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02215-round-up-universe-rename-cascade-coverage-and-marriage-popup-partner-age-v02215)**

---

### v0.22.14 Round-Up: Universe rename closure, marriage marker pairing, and a Cleanup Wizard step

**Universe rename direction closes end-to-end** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 3): Three-part arc closes here. Part 1 (v0.22.11) made the Edit Person Universe dropdown source from the universes folder so renamed notes appeared in the picker. Part 2 (v0.22.12) added the cascade that rewrites `universe:` plain-string references on referencing entities when a universe note's basename changes. Part 3 makes the Edit Universe modal trigger that cascade naturally instead of requiring users to know to rename the file directly: the modal now sanitizes the new name and triggers a real file rename when the name changes, which fires the existing cascade automatically. Reported by @DigitalDreamn after her Part 2 verification.

**Marriages between two spouses render as one combined marker** ([#501](https://github.com/banisterious/obsidian-charted-roots/issues/501)): Sibling to the multi-participant event dedup (#493) but for marriages, which live as frontmatter on each spouse's note rather than as separate `cr_type: event` notes. Owen Lars's marriage to Beru Whitesun produced one marker for Owen at Tatooine and another for Beru at the same place, with neither popup naming the partner. The map pipeline now attaches the partner's identity to each marriage marker, and a new dedup pass groups by sorted-pair + place + date so the two perspectives collapse into a single combined marker.

**Cleanup Wizard adds a step for places missing cr_id** ([#502](https://github.com/banisterious/obsidian-charted-roots/issues/502)): Place notes lacking `cr_id` are silently excluded from the place graph cache: they don't appear in by-name lookups, the Create Place modal's parent dropdown, or as map markers. v0.22.9 added a dev-console warning when the exclusion fires; v0.22.14 adds a fixable step in the Post-Import Cleanup Wizard that surfaces all such places and offers a "Generate cr_id" fix action.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02214-round-up-universe-rename-closure-marriage-marker-pairing-and-a-cleanup-wizard-step-v02214)**

---

### v0.22.13 Round-Up: Map coverage covering multi-spouse, multi-participant, and hierarchical places

**Map coverage closes four gaps** ([#493](https://github.com/banisterious/obsidian-charted-roots/issues/493), [#494](https://github.com/banisterious/obsidian-charted-roots/issues/494), [#498](https://github.com/banisterious/obsidian-charted-roots/issues/498), [#499](https://github.com/banisterious/obsidian-charted-roots/issues/499)): Four classes of map data that had been silently invisible now render correctly. Multi-spouse people surface every marriage on the journey path and as separate map markers (#498). Multi-participant events collapse into one combined marker with all participants listed in the popup, instead of stacked per-person duplicates (#493). Child places inherit the nearest ancestor's coordinates when they have none of their own, so events at child places appear at the visible parent's location instead of dropping silently (#494). And the journey-mode rich popup preserves the original event type for custom events ("Backstory") instead of collapsing to the generic "Custom" label (#499). Three of the four were surfaced by @DigitalDreamn during a single verification cycle on the Star Wars / Lars-family vault.

**Place modal coordinate inputs land cleanly** ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496) follow-up): A v0.22.12 fix tried to align the X / Y (and Latitude / Longitude) input pair via `align-items: center` on a flex container of two adjacent setting-items, but Obsidian's default child-pseudo-class padding rules pushed each input to opposite vertical edges. v0.22.13 reworks the layout so both inputs live inside a single Setting's control area as compound controls.

**Marriage detail mirroring works regardless of spouse format** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) follow-up): A v0.22.12 fix mirrored marriage details between two partners' notes when both used the indexed `spouseN:` format, but missed the case where one partner was still on the legacy flat `spouse:` / `spouse_id:` shape. v0.22.13 adds an atomic flat-to-indexed promotion that runs whenever the mirror would otherwise bail because the partner is on the older schema.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02213-round-up-map-coverage--multi-spouse-multi-participant-and-hierarchical-places-v02213)**

---

### v0.22.12 Round-Up: Marriage symmetry, Universe rename cascade, and map UX polish

**Marriage details propagate between spouses** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481)): Filling marriage_date and marriage_location on one partner's note used to leave the other partner with just a spouse link and no marriage details. The bidirectional linker mirrored the spouse wikilink and ID but skipped the companion fields (`spouseN_marriage_date`, `_marriage_location`, `_marriage_location_id`, `_marriage_status`, `_divorce_date`). Now those fields propagate from whichever side they're set on, on both initial fill and subsequent updates. Independently-set values on the receiving side aren't accidentally cleared. Reported by @DigitalDreamn.

**Journey mode keeps death popups when a custom event shares the location** ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487)): Journey-mode dedup was meant to suppress consecutive same-place waypoints, but the dedup key only checked the place; it didn't include event type. So a custom event without a date sorted to the end of the life-event run and landed immediately before the death waypoint, and if it sat at the death's location, the dedup loop kept the custom event and silently dropped the death popup. The dedup key now folds in event type, so distinct event types at the same place both survive while same-type same-place events still collapse.

**Universe rename cascades through referencing entity notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 2): v0.22.11's Part 1 fixed the Edit Person Universe dropdown so renamed Universe notes appeared in the picker immediately. v0.22.12's Part 2 closes the loop on the actual data: when a Universe note is renamed, `universe:` plain-string references on people / places / events / organizations now cascade to the new name.

**Map readability gets two new dials** ([#483](https://github.com/banisterious/obsidian-charted-roots/issues/483), [#486](https://github.com/banisterious/obsidian-charted-roots/issues/486)): Path labels gain an optional outline (white or black) so they remain legible on dark or richly-colored image-map backgrounds. Separately, journey-mode playback gets a proper dwell-time selector with explicit second labels (2s / 4s / 6s / 10s, default 4s), replacing the previous slider that conflated step duration with popup visibility window.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02212-round-up-marriage-symmetry-universe-rename-cascade-and-map-ux-polish-v02212)**

---

### v0.22.11 Round-Up: Path label architecture, person-delete hardening, and the Universe dropdown

**Map path labels render upright on multi-waypoint paths** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472)): Path labels flipped inconsistently (some upright, some upside-down on the same map) because leaflet-textpath repeats the label along the entire polyline path and applies a single global 180° rotation when its `flip` mode is on. Three iterations of fix tried the chord direction (v0.22.9), then the longest-segment direction (v0.22.10), each closing more cases but not all. v0.22.11 lands the structural fix: labels now ride on a separate invisible polyline covering only the longest screen-space segment of the source path, so leaflet-textpath has a single segment to render along and the flip decision is correct for that segment alone.

**Person delete cleanup sweeps wikilinks and single-relationship scalars** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up, [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478)): Two gaps in v0.22.7's person-delete cleanup, both surfaced once @DigitalDreamn verified the original `_id` sweep on the Lars / Star Wars fixture. The cleanup planner swept the canonical `*_id` arrays but not the parallel wikilink-bearing fields. Deleted persons left broken `[[placeholder]]` links visible in the properties pane and a contributor to a separate save-time bug (#478) that injected empty strings into the parallel `_id` array on the next save. v0.22.11 extends the planner with a parallel wikilink-sweep branch and converts every "array" field handler to accept both array and scalar shapes.

**Universe dropdown reflects renamed and newly-created Universe notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 1): Renaming a Universe note via the Edit Universe modal left the new name absent from the Edit Person modal's Universe dropdown, even after restarting Obsidian. Cause: the dropdown was sourced from the distinct `universe:` field values found across person and place notes, not from the actual Universe notes in the universes folder. v0.22.11 unions `UniverseService.getAllUniverses()` into the cached list alongside the existing graph extractions, so renamed and newly-created Universe notes appear immediately.

**Custom non-person `cr_type` notes filtered out of Person notes view** ([#489](https://github.com/banisterious/obsidian-charted-roots/issues/489)): A note with `cr_type: hex` (or any user-defined custom type the plugin doesn't know about) was being treated as a person and listed in the control center's Person notes browser alongside actual character notes; first surfaced on a hex-grid worldbuilding vault. The family-graph extractor used an exclusion list rather than an inclusion check. v0.22.11 adds an explicit inclusion check via the centralized `isPersonNote` helper. First contribution from @Lemmeron.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02211-round-up-path-label-architecture-person-delete-hardening-and-universe-dropdown-v02211)**

---

### v0.22.10 Round-Up: Negative years, modal polish, Calendar era input, and an auto regression

**Negative birth years preserve sign through suffixed forms and custom-era prefixes** ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476)): Custom-era date strings with explicit negative signs (`DE -5740`, `Year -1234 of the Reign`) were rendering on the timeline as positive numbers because the year-extraction regex used a word boundary that ate the leading minus sign on 4-digit numbers. v0.22.10 added a standalone-negative branch that captures digits preceded by a minus sign that isn't part of an ISO date separator. First contribution from @doctorwodka.

**Calendar View accepts era-suffixed years and round-trips them** ([#480](https://github.com/banisterious/obsidian-charted-roots/issues/480)): The Calendar View's year-navigation widget rendered `String(currentYear)` directly, with no era awareness, and constrained input to `0 < year < 10000`. So fictional-calendar vaults using descending eras saw "1499" instead of "1499 ABY" and couldn't enter "82 BBY" at all. The year input is now `type="text"`, the change handler routes through `DateService.parseDate`, and the resolved universe is recorded alongside the canonical year so subsequent renders format via `formatCanonicalYear` for round-trip era display. **Ninth and final site of the year-rendering cluster** that ran across the v0.22.x stability run.

**Console-error regression from `'auto'` orientation caught and fixed within 24 hours** ([#477](https://github.com/banisterious/obsidian-charted-roots/issues/477)): v0.22.9's path-label fix passed `orientation: 'auto'` to leaflet-textpath as the no-flip branch, but leaflet-textpath@1.3.0 only recognizes `'flip'`, `'perpendicular'`, and numeric rotations; anything else falls through and gets injected literally into the SVG `transform` attribute. The browser saw `transform="rotate(auto cx cy)"` and rejected each one as invalid, flooding the DevTools console with red on dense maps. v0.22.10 omits the `orientation` key entirely when no flip is needed. Caught + fixed within 24 hours of 0.22.9 shipping, thanks to @DigitalDreamn.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02210-round-up-negative-years-modal-polish-calendar-era-input-and-auto-regression-v02210)**

---

### v0.22.9 Round-Up: Map polish, sibling reality windows, and cluster closure

**Older siblings' births no longer appear before the focal person's birth** ([#469](https://github.com/banisterious/obsidian-charted-roots/issues/469)): The sibling-births block on a person's timeline had no reality-window guard for events predating the focal person's birth. An older sibling's birth would render as the first entry on the focal person's own timeline. A new symmetric guard mirrors the v0.22.8 after-focal-death guard: events before the focal person's birth are filtered, but same-year siblings (twins, close births) still surface via unambiguous before-focal-birth canonical-year comparison.

**Place graph silent-skip becomes a discoverable warning** ([#471](https://github.com/banisterious/obsidian-charted-roots/issues/471)): Place-shaped notes that lack a `cr_id` are excluded from the place graph, which means by-name lookups, modal dropdowns, and map markers can't see them. The exclusion was completely silent. A `warn`-level log on the skip with the file path now makes the exclusion discoverable from the dev console. The user-facing remediation in the Cleanup Wizard followed in v0.22.14.

**Map time slider becomes era-aware (and closes the DateService cluster)** ([#453](https://github.com/banisterious/obsidian-charted-roots/issues/453)): The map view's "who was alive at year X" time slider was hardcoded to a 1800-2000 real-world span, so on fictional-era universes the slider's range never intersected the data and the feature was effectively unusable. The slider now derives its min / max from the map's computed year range and renders labels via a new `formatCanonicalYear` helper. **Eighth and final site of the DateService-bypass cluster** that ran across v0.22.5 through v0.22.9.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0229-round-up-map-polish-sibling-reality-windows-and-cluster-closure-v0229)**

---

### v0.22.8 Round-Up: Map, timeline, statistics, and modal polish

**Map popups show ages and full date ranges** ([#444](https://github.com/banisterious/obsidian-charted-roots/issues/444)): Marker popups on the geographic map now append `(age N)` for non-birth events and render full `from - to` ranges for events with a `date_to`. For Shmi Skywalker Lars dying at 22 BBY, the popup now reads `Death: 22 BBY (age 50)`. For a residence at Ator from 64 BBY to 22 BBY, it shows the full duration instead of just the start date. Birth events suppress the redundant age 0 annotation.

**Map journey mode says why playback isn't available** ([#445](https://github.com/banisterious/obsidian-charted-roots/issues/445)): Entering journey mode for a person with fewer than two resolvable waypoints used to leave the marker filter applied with no explanation. The map now renders an inline placeholder where the playback panel would have appeared, naming the person and stating that they need at least 2 places with valid coordinates.

**Timeline filters relative events outside the focal person's reality window** ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456), [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)): Two related leaks where a person's timeline surfaced events that didn't fit their lived experience. Step-siblings' births appeared on each other's timelines (Anakin Skywalker's timeline showed Owen Lars's birth even though they share only a stepparent). Spouse deaths surfaced on the survivor's timeline even when the survivor pre-deceased the spouse. Same class of bug, paired fix: a step-sibling filter mirroring the v0.22.7 stepchild treatment, plus a focal-death reality-window guard.

**Statistics Dashboard date-inconsistency counter respects fictional eras** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) follow-up): The "Date inconsistencies" counter on the Statistics Dashboard had its own year-extraction logic that read digit runs as positive numbers, so coherent BBY lifespans tripped the naive `birthYear > deathYear` check and left a red error bar in place. The counter now consults the date service first.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0228-round-up-map-timeline-statistics-and-modal-polish-v0228)**

---

### v0.22.7 Round-Up: Map UX, stepchild handling, and universe-calendar linking

**Universe → calendar wiring** ([#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) Phase 1): The Universe wizard's step 2 now offers a three-way calendar picker (None, Built-in, Custom) replacing the earlier binary "create custom calendar?" toggle. When the universe name slug-matches a built-in calendar's universe field, that built-in is preselected. The Edit Universe modal gains a matching Calendar field, and the Universes tab shows the linked default calendar as a sub-line under entity counts.

**Spouse deaths now appear on timelines by default** ([#447](https://github.com/banisterious/obsidian-charted-roots/issues/447)): `timelineShowSpouseDeaths` flipped from `false` to `true`, so widow / widower context surfaces on the timeline dynamic block without users having to discover the setting first. The toggle is unchanged: anyone who'd rather hide spouse deaths can still opt out from Settings.

**Person-delete cleans up orphan cr_ids** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442)): When a person note is removed, Charted Roots now scans every other person note's `*_id` fields and removes the deleted cr_id from any matches. Previously Obsidian rewrote the wikilink references but left the parallel `*_id` arrays carrying orphaned strings, which downstream code would silently mishandle.

**Stepchildren on stepparent timelines and in the profile view** ([#441](https://github.com/banisterious/obsidian-charted-roots/issues/441), [#443](https://github.com/banisterious/obsidian-charted-roots/issues/443)): Stepchildren's birth events no longer appear on stepparents' timelines. The family-graph now derives `stepchildrenCrIds` on each parent by inverting the children's `stepfatherCrIds` / `stepmotherCrIds`, and the timeline's children-births block skips any id present in the new array. The Entity Profile View's Children block uses the same data to label stepchildren and adopted children with their specific category instead of the generic "Child" fallback.

**Fictional-era support extended across data quality, journey, and timeline** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), [#438](https://github.com/banisterious/obsidian-charted-roots/issues/438), [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439)): Date-inconsistency checks now respect descending eras like BBY and stop firing FUTURE_BIRTH / FUTURE_DEATH on fictional dates. Map journey playback merges life events from `cr_type: event` notes alongside the inline `events:` array. The timeline dynamic block routes age computation through `DateService.calculateAge` across all eight call sites.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0227-round-up-map-ux-stepchild-handling-and-universe-calendar-linking-v0227)**

---

### v0.22.6 Fix: Fictional-era coverage Round-Up

A focused release extending fictional-era support across data quality validators, map journey playback, and the timeline dynamic block. Three sibling fixes ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437), [#438](https://github.com/banisterious/obsidian-charted-roots/issues/438), [#439](https://github.com/banisterious/obsidian-charted-roots/issues/439)) building on v0.22.5's `DateService` plumbing. See the wiki for the per-issue breakdown.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0226-fix-fictional-era-coverage-round-up-v0226)**

---

### v0.22.5 Fix: Fictional-calendar gaps and dynamic-content noise

**Data-quality validator understands fictional dates** ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433)): Dates like `22 BBY` or `ABY 1042` stop getting flagged as non-standard for persons in a fictional-calendar universe. The validator used to accept only real-world formats (`YYYY-MM-DD`, `YYYY-MM`, `YYYY`). It now consults the fictional date parser first, so anything that resolves through a registered era abbreviation is recognized.

**Map popup ages respect fictional calendars** ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434)): Ages and durations in map waypoint popups now match the fictional calendar for universe-scoped entities. The code used to do plain numeric year subtraction, which falls apart for descending eras like BBY and fails outright on era boundaries like BBY-to-ABY. The popup now calls into the date service with the person's universe as context.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0225-fix-fictional-calendar-gaps-and-dynamic-content-noise-v0225)**

---

### v0.22.4 Hotfix: Step-Parent save path

**Step-parent persistence** ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429)): Setting a step-father or step-mother in Edit Person now writes to the file. Before v0.22.4, three separate gaps in the edit path caused the save to silently drop the step-parent fields: the frontmatter loader never extracted them, the plumbing between loader and modal didn't carry them, and the writer had no branch to persist them. Each gap existed in a path where adoptive parents already worked correctly. Six new regression tests cover the load side.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0224-hotfix-step-parent-save-path-v0224)**

---

### v0.22.3 Fix: Cross-Entity Collections aggregation

**Cross-entity Collections** ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426)): Collections defined on a place note are now visible in the Edit Person dropdown, the Control Center Collections tab, and the dockable Collections sidebar. Before v0.22.3 those surfaces only read from a person-focused aggregator, so a place-only Collection appeared to vanish. The aggregator was rewritten to merge person and place counts, and the UI shows membership badges like "5 people, 3 places" where the split matters.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0223-fix-cross-entity-collections-aggregation-v0223)**

---

### v0.22.2 Hotfix: IDs-only relationship arrays

**IDs-only relationship array recovery** ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415)): Edit Person handles notes whose frontmatter carries `children_id` / `spouse_id` / `parents_id` arrays but no paired wikilink arrays. Before v0.22.2, those notes loaded as empty relationship blocks and saving wiped the IDs. The load path now falls back to the ID array when the wikilink array is missing. An empty `[]` still counts as an intentional clear. Orphan IDs that don't resolve to any person in the vault are preserved as-is.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0222-hotfix-ids-only-relationship-arrays-v0222)**

---

### v0.22.1 Hotfix: Spouse format migration

**Spouse format migration hardening** ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423), [#420](https://github.com/banisterious/obsidian-charted-roots/issues/420), [#417](https://github.com/banisterious/obsidian-charted-roots/issues/417)): Three lingering issues from the v0.21 spouse-format migration are fixed. The phantom-deletion cascade that could fire during a migration no longer triggers. Cross-note indexed-spouse corruption on older notes is corrected on next load. Adoptive siblings render correctly in the relationships dynamic block.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0221-hotfix-spouse-format-migration-v0221)**

---

### v0.22.0 Stability release

The initial v0.22.0 release closed the v0.21.x Edit Person work and stabilized the spouse-format migration. Subsequent hotfixes (v0.22.1 through v0.22.4) addressed lingering migration edge cases surfaced by community testing.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0220-stability-release-v0220)**

---

<details>
<summary><strong>Internal-only releases in this cluster</strong></summary>

These releases shipped without user-visible changes: scanner-response work, ESLint hygiene, build pipeline, and bundle stylesheet maintenance.

- **v0.22.44**: Bundled `styles.css` rebuild and release-procedure flip. [Notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02244-bundled-stylescss-rebuild-and-release-procedure-flip-v02244)
- **v0.22.43**: CSS lint cleanup, `!important` and `:has()` closures. [Notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02243-css-lint-cleanup-important-and-has-closures-v02243)

</details>

**Full release list:** [GitHub Releases tags for v0.22.0 through v0.22.44 →](https://github.com/banisterious/obsidian-charted-roots/releases)

---

## v0.21.x: Edit Person Round-Up

v0.21.0 was a focused stability release centered on the Edit Person modal. Four round-trip bugs were fixed and the testing infrastructure was formalized.

### Relationships preserved through partial ID and basename mismatches ([#410](https://github.com/banisterious/obsidian-charted-roots/issues/410))

Relationships were being dropped on edit when the wikilink array held items whose target notes had basenames differing from the `name` field, or when only IDs were present without the paired wikilinks. The fix extended the v0.20.62 resolver to also match on a note's basename and made the array-field fallback run per-entry instead of all-or-nothing. Unresolvable wikilinks are now preserved through the round trip rather than silently dropped.

### Clearing optional fields actually clears frontmatter ([#406](https://github.com/banisterious/obsidian-charted-roots/issues/406))

Eleven optional person fields didn't actually clear when emptied through the modal. Affected fields included universe, collection, personType, sex, givenName, maidenName, pronouns, and the four DNA-related properties. All now use the `?? ''` (or `?? []`) pattern so the writer's clear path fires correctly. A sibling fix landed for the nickname field's three-way gap ([#412](https://github.com/banisterious/obsidian-charted-roots/issues/412)) and for the endogamy flag's toggle-off value getting converted to undefined ([#413](https://github.com/banisterious/obsidian-charted-roots/issues/413)).

### Testing infrastructure

A Vitest test harness landed alongside the fixes, with 31 regression tests for the relationship load path. The project's public API was formalized in a new [VERSIONING.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/VERSIONING.md) file documenting plugin-specific SemVer rules and the criteria for 1.0.

**[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v0210-edit-person-round-up-v0210)**

**Full cluster:** [v0.21.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.21.0).

---

## v0.20.x: World-building, sources, and narrative

The 0.20.x cluster ran several months and landed the bulk of the worldbuilding toolkit, the sources-and-evidence subsystem, and the narrative-compilation track. The headline additions are below. The [GitHub releases](https://github.com/banisterious/obsidian-charted-roots/releases) page has the per-release detail, and the [wiki Release History](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v020x) has the longer-form narrative for each feature.

### Entity Profile View ([#251](https://github.com/banisterious/obsidian-charted-roots/issues/251))

A dockable view that auto-syncs to the active note and displays all related data for any entity type (Person, Place, Event, Source, Organization) in collapsible sections. Replaces the tab-hopping that deep research used to require. Phase 1 shipped read-only in v0.20.18; later phases added inline editing on identity fields, lazy rendering of section content, keyboard navigation, and an embedded map preview for place profiles.

[More in Features →](/features/#entity-profile-view) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#entity-profile-view-v02018)

### Book and Narrative Compilation ([#294](https://github.com/banisterious/obsidian-charted-roots/issues/294))

A book builder that compiles generated reports, visual trees, and user-written vault notes into a single sequenced document. Output is PDF or ODT with a cover page, table of contents, and optional name index. Three preset templates (Family history book, Research compilation, Blank) derive chapter structure from the family graph. Book definitions save as `.book.json` files, so a book can be regenerated as the underlying vault data changes. Shipped in v0.20.26.

[More in Features →](/features/#book-builder) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#book--narrative-compilation-v02026)

### Evidence and sources matured across the cluster

Mills-aligned source classification ([#276](https://github.com/banisterious/obsidian-charted-roots/issues/276), v0.20.17) added three optional axes drawn from Elizabeth Shown Mills' *Evidence Explained*: source type, information type, and evidence type. Citation metadata support ([#316](https://github.com/banisterious/obsidian-charted-roots/issues/316), v0.20.34) introduced citation as a first-class entity with page references and quality assessments, with full GEDCOM roundtrip. Citation integration ([#324](https://github.com/banisterious/obsidian-charted-roots/issues/324), v0.20.38) wired bidirectional sync between citation notes and `sourced_*` fields. Source hierarchies ([#337](https://github.com/banisterious/obsidian-charted-roots/issues/337), [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338), v0.20.46) added `source_parent` and `source_parent_id` properties so multi-document record groups like probate packets, census pages, and multi-volume collections can be modeled as linked parent-child structures.

[More in Features →](/features/#evidence-and-sources) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#mills-aligned-source-classification-v02017)

### Comprehensive GEDCOM field coverage ([#317](https://github.com/banisterious/obsidian-charted-roots/issues/317))

v0.20.33 closed most of the roundtrip fidelity gaps with full import and export support for 16+ additional GEDCOM 5.5.1 fields: name components (NPFX, NSFX, SPFX, NICK), person attributes (TITL, RELI, NATI, IDNO, PROP, CAST, NCHI, NMR, SSN), burial date and place, death cause, and age-at-event. FROM / TO date ranges now parse and export alongside the existing BET / AND format. Fixes on the export side eliminated duplicate BIRT / DEAT / BURI records and moved family events onto FAM records where they belong.

[More in Features →](/features/#import-and-export) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#comprehensive-gedcom-field-coverage-v02033)

### Calendar View ([#299](https://github.com/banisterious/obsidian-charted-roots/issues/299))

v0.20.47 added a workspace view with a monthly calendar grid of significant dates across the vault: birthdays, death anniversaries, marriage dates, and other life events. Color-coded event dots per day, a text-label toggle for person names, a day detail panel with events and years-ago, filters by event type or living status. An "imprecise dates" section catches entries with a month but no day. Right-click a day cell to create an event pre-filled with that date.

[More in Features →](/features/#calendar-view) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#calendar-view-v02047)

### Map evolution

Three distinct map capabilities landed during the cluster. Person-focused map journey ([#295](https://github.com/banisterious/obsidian-charted-roots/issues/295), v0.20.45) isolated a single person's geographic path with animated step-through playback, rich waypoint popups, and a family-journey overlay color-coded by relationship. Child map markers with on-map region editing ([#362](https://github.com/banisterious/obsidian-charted-roots/issues/362), v0.20.56) put draggable markers on parent maps for every child map, with an inline overlay that saves `parent_region_x/y/w/h` back to frontmatter. Linked map drill-down navigation ([#361](https://github.com/banisterious/obsidian-charted-roots/issues/361), v0.20.56) added `linked_map` and `parent_map` properties for multi-scale worldbuilding, with breadcrumb navigation between maps.

[More in Features →](/features/#geographic-features) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#person-focused-map-journey-v02045)

### Universe tooling ([#359](https://github.com/banisterious/obsidian-charted-roots/issues/359), [#360](https://github.com/banisterious/obsidian-charted-roots/issues/360))

Universe notes picked up auto-generated content blocks in v0.20.56. `charted-roots-universe-people`, `-places`, `-events`, and `-organizations` render tables of every entity scoped to the current universe, with sorting and limits. A companion `charted-roots-universe-maps` block renders clickable thumbnail grids for every custom map belonging to the universe. All blocks refresh automatically when vault data changes.

[More in Features →](/features/#world-building) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#universe-entity-dynamic-blocks-v02056)

### Feature round-up release (v0.20.57)

A consolidated release aggregating smaller enhancements from community feedback. Multiple person picker in the event modal ([#366](https://github.com/banisterious/obsidian-charted-roots/issues/366)), marriage data in the Family Group Sheet report ([#370](https://github.com/banisterious/obsidian-charted-roots/issues/370)), targeted schema validation against notes matching a specific schema ([#367](https://github.com/banisterious/obsidian-charted-roots/issues/367)), organization membership statistics ([#368](https://github.com/banisterious/obsidian-charted-roots/issues/368)), universe and collection fuzzy pickers in the Report Wizard ([#369](https://github.com/banisterious/obsidian-charted-roots/issues/369)), and Web Clipper discoverability info-boxes in Places, Sources, and People tabs ([#364](https://github.com/banisterious/obsidian-charted-roots/issues/364)).

[Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#v02057-feature-round-up-v02057)

**Full cluster:** 62 releases spanning [v0.20.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.0) through [v0.20.62](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.20.62).

---

## v0.19.2–v0.19.x: Transition

The 0.19.x cluster continued after the v0.19.0 rename from Canvas Roots. Headline additions from v0.19.2 onward:

### Research workflow foundations ([#145](https://github.com/banisterious/obsidian-charted-roots/issues/145))

v0.19.11 introduced five GPS-aligned research entity types: `research_project`, `research_report`, `individual_research_note`, `research_journal`, and `research_log_entry`. Each has its own status tracking: projects use open / in-progress / on-hold / completed, reports use draft / review / final / published. A new research section in the Statistics view surfaces entity counts and status breakdowns. Tag detection recognizes `#irn` shorthand for individual research notes. This subsystem was the scaffolding the 0.20.x sources and citations work built on top of.

[More in Features →](/features/#research-workflow) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#research-workflow-phase-1-v01911)

### Organizations, roles, and inheritance (v0.19.16)

Three related capabilities shipped in v0.19.16. Organization Member Management added first-class membership modeling with roles and date ranges. Person Roles in Sources extended the same role-linking pattern to source notes, so informants, enumerators, clerks, and other source-side roles can be tracked as structured data. Inheritance & Succession Tracking added `inherited_from` and `successor` properties for title, estate, and office succession.

[More in Features →](/features/#organizations) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#organization-member-management)

### DNA Match Tracking ([#126](https://github.com/banisterious/obsidian-charted-roots/issues/126))

v0.19.9 added opt-in DNA match tracking for genetic genealogists, off by default. When enabled, person notes can be flagged as a DNA Match and tracked with shared cM, testing company, kit ID, match type (BKM / BMM / confirmed / unconfirmed), endogamy flag, and notes. A `dna_match` relationship type handles bidirectional linking. Scope is intentionally narrow: track key matches, not full chromosome analysis. Tools like DNAPainter handle that better and this feature is designed to live alongside them.

[More in Features →](/features/#dna-tracking) · [Read the full release notes →](https://github.com/banisterious/obsidian-charted-roots/wiki/Release-History#dna-match-tracking-v0199)

**Full cluster:** [v0.19.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.2) through [v0.19.17](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.19.17).

---

<details>
<summary><strong>Port history (collapsed)</strong></summary>

This appendix preserves the chronological port log from the original "cluster spotlight" model of this planning doc. Useful as an audit trail for which session added which content and which editorial style decisions landed when.

**Initial port (2026-04-24)** — Ported to chartedroots.com with v0.22.5 baseline. Scope-bound decision (open question 1): catch-up from 0.19.2 forward, pre-v0.19.2 left at user-approved state.

**v0.22.6 + v0.22.7 (2026-04-25)**, **v0.22.8 (2026-04-26)** including #448 + #450 reframed from post-release into the 0.22.8 release; #442 follow-up added as inline addendum. **v0.22.9 evening (2026-04-26)** with era-aware time slider closing the DateService cluster at eight sites; pixel-coord rendering follow-ups; older-sibling reality-window; place-graph diagnostic.

**v0.22.10 + v0.22.11 (2026-04-28)** with #485 closing the lat / lng-only-on-pixel-CRS cluster as the third site after #448 / #474; #442 follow-up effectively closes #478 by removing its broken-wikilink trigger; first contributions from @Lemmeron via #489 and @doctorwodka via #476.

**v0.22.12 + v0.22.13 + v0.22.14 (2026-04-28 + 2026-04-30)** with marriage-detail symmetry, dedup-key keeps death popups when a custom event shares the location, universe rename cascade, map-readability dials, multi-spouse marriages, multi-participant events, child-place coords, custom event labels, place modal coord-row landing, marriage-detail mirroring across mixed spouse formats, universe rename direction closes end-to-end via Part 3, marriage-marker pairing, Cleanup Wizard step for places missing cr_id.

**v0.22.18 (2026-05-03)** — three new H3 sections including combined Merge Wizard / Bases Spouse(s) entry surfacing the guides-authoring meta-narrative, Entity Profile metadata-cache race across three services, Book Builder report-chapter sanitizer. Cluster intro updated to nineteen releases / 589 tests / one patch in the new window. v0.22.15-v0.22.17 spotlights were ported directly to the website without mirroring back here.

**v0.22.19 + v0.22.20 (2026-05-06)** — four new H3 sections covering the Relationship Calculator step + adoptive two-pass story, Map view filter row Android wrapping, custom relationship notes persistence, and the wikilink name / filename divergence fix.

**v0.22.21 (2026-05-06)** — three new H3 sections covering adopted children / siblings consistency, siblings sort by birth, custom relationship types under the Family category.

**v0.22.22 + v0.22.23 (2026-05-07)** — five new H3 sections: wikilink corruption self-heal triggering the sixth window reset, Person Profile org memberships, Org Profile role grouping, per-image captions in dynamic media gallery, marriage details symmetric write same-day follow-up.

**v0.22.24 (2026-05-08)** — four new H3 sections from @DigitalDreamn's #537 verification sweep: file paths in alias slots self-heal, wikilink writer disambiguation for cross-folder collisions, Dynamic Relationship Block `all` mode for custom-typed relationships, org membership sync.

**v0.22.25 (2026-05-08 later)** — three new H3 sections, same-day follow-up to v0.22.24: Edit Person modal display cleanup, org wikilink writes through canonical helper, org-side member sync cache-timing.

**v0.22.26 (2026-05-09)** — three new H3 sections: Canvas Family Tree adopted children + step-relationships, Family Timeline view includes adopted / step children, GEDCOM-X gender-neutral parent relationships. RelationshipQueryService architectural framing kept in cluster intro.

**v0.22.27 (2026-05-09 later)** — one new H3 section: batch cleanups faster via cache-race audit and 2-second sleep removal. Ported as commit `62d01cf` with cluster intro at 28 releases / 739 tests / five patches.

**v0.22.28 (2026-05-10)** — two new H3 sections: combined Edit-modal display coverage extension, property-based fuzz coverage extension. Ported as commit `31b17c7` with cluster intro at 29 releases / 818 tests / six patches.

**v0.22.29 (2026-05-10 later)** — six new H3 sections covering the bidirectional-sync audit closures (#551, #556, #554, #555, #552 + #553 internal, #558 self-reference guards). Ported as commit `1a2e61f` with cluster intro at 30 releases / 822 tests / seven patches.

**v0.22.30 (2026-05-11)** — four new H3 sections covering cr_id collision filter, negative-year decade bucketing, Family Chart XSS hardening, ESLint baseline. Ported as commit `2c40b70` with cluster intro at 31 releases / 834 tests / eight patches.

**v0.22.31 (2026-05-12)** — six new H3 sections covering the fictional-date cluster, command rename, bidirectional-sync settings respect, scan-error backlog clear, pop-out window timer migration. Ported as commit `59142f6` with cluster intro at 32 releases / 880 tests / nine patches.

**v0.22.32 – v0.22.37 (2026-05-15)** — combined "Community Automated Review Cleanup Arc" entry with four H3 sections: Map view Fullscreen icon as the only user-facing fix, era abbreviations in Timeline flat-list view, tag-triggered release workflow with build-provenance attestations, internal scan-cleanup arc framing. v0.22.32–v0.22.37 already live on chartedroots.com via commit `4dc1419` (2026-05-14 combined-H3 form).

**v0.22.38 (2026-05-15)** — three new H3 sections: #570 custom relationship category display fix, native ButtonComponent migration covering ~190 modal CTA sites, internal scan-cleanup arc completion. Ported as commit `f5fa097` with cluster intro at 39 releases / 883 tests / sixteen patches.

**v0.22.40 + v0.22.41 (2026-05-15 later)** — combined "scan-cleanup arc finale" entry with one new H3: `createElement('script')` surface eliminated, `jszip` → `fflate` migration, IE5-8 setImmediate polyfill strip. New editorial style introduced: em-dashes converted to colons / commas / periods, ASCII arrows. Ported as commit `798c320` with cluster intro at 41 releases / 883 tests / nineteen patches. v0.22.39 spotlight deferred.

**v0.22.42 (2026-05-15 latest)** — v0.22.40 + v0.22.41 H3 renamed and extended to a v0.22.40 + v0.22.41 + v0.22.42 round-up covering setInterval + network Behavior Warning closure. Ported as commit `008fc50`, cluster intro at 42 / 883 / twenty.

**v0.22.43 (2026-05-16)** — new standalone H3 above the round-up: CSS lint cleanup, `!important` × 1 closed via family-chart patches, `:has()` × 2 closed via markdown post-processor. Ported as commit `df7fb9b`, cluster intro at 43 / 883 / twenty-one.

**Per-Round-Up restructure ported (2026-05-16)** — full new-shape rewrite. Per-Round-Up grouping replacing per-issue H3 sprawl. User-facing filter applied retroactively. Wiki backlinks added to every Round-Up. Internal-only releases collapsed into a per-cluster details block (v0.22.43, v0.22.44 currently captured there). v0.22.0 through v0.22.44 all in new shape. v0.21.x / v0.20.x / v0.19.x preserved with wiki backlinks added. Landed on chartedroots.com as commit `1785824`.

**Em-dash sweep ported (2026-05-16)** — same-day follow-up cleaning 25 em-dashes from the new v0.22.x content (drafting brief overstated cleanliness; sweep applied plugin-side as commit `edc2d9ca`, then website-side as the matching pass). Older clusters were already em-dash-free pre-sweep, contrary to the initial framing in the website-session brief. Landed on chartedroots.com as commit `a5caf13`.

**v0.22.45 Round-Up ported (2026-05-16)** — first incremental per-Round-Up port under the new shape. New H3 added at top of v0.22.x cluster with five user-facing highlight paragraphs (#581, #569 follow-up, #579 + #580, #586 + #587, bundle-hygiene + DCE closure summary). Cluster-intro metrics bumped to forty-six releases / twenty-three patches / 883 at v0.22.45. Landed on chartedroots.com as commit `d9ddf96`.

</details>

<details>
<summary><strong>Anchor list referenced by features-page cross-links</strong></summary>

These anchors are referenced by `[More in Features →]` links from older-cluster H3s. They assume the corresponding sections exist on `/features/` (Hugo default slugging: lowercase, spaces become hyphens, `&` dropped).

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
- `#custom-relationships`
- `#dynamic-content-blocks`
- `#statistics-and-reports`
- `#data-entry-and-management`
- `#relationship-calculator`

</details>
