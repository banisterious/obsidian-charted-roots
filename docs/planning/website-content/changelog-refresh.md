# Changelog Page Refresh — draft

> **⚠ This planning doc is not a current snapshot of the live changelog.** The website at [chartedroots.com/changelog/](https://chartedroots.com/changelog/) is the canonical reader-facing surface and is current; the wiki [Release-History](../../../wiki-content/Release-History.md) is the canonical longer technical narrative. This file is a **working scratchpad** for refresh batches — useful for drafting new spotlights before they land on the website, not as a complete mirror of what's live. The body below covers v0.22.5–v0.22.14 (the original refresh batch) plus v0.22.18 (most recent), but **v0.22.15, v0.22.16, and v0.22.17 spotlights were ported directly to the website without mirroring back here**, and the v0.22.x cluster intro at the top of the body section is still at the v0.22.14 baseline ("fifteen releases / 480 tests / ten patches"). For canonical current state, read the live page; for technical depth, read the wiki Release-History.

**Target page:** `/changelog/_index.md` on chartedroots.com
**Status:** Ported to chartedroots.com 2026-04-24, refreshed 2026-04-25 with v0.22.6 + v0.22.7 spotlights, refreshed 2026-04-26 with v0.22.8 spotlights (#448 and #450 reframed from post-release into the 0.22.8 release; #442 follow-up added as inline addendum), refreshed 2026-04-26 (evening) with v0.22.9 spotlights (era-aware time slider closing the DateService cluster at eight sites; pixel-coord rendering follow-ups; older-sibling reality-window; place-graph diagnostic), refreshed 2026-04-28 with v0.22.10 + v0.22.11 spotlights (#485 closes the lat/lng-only-on-pixel-CRS cluster as the third site after #448 / #474; #442 follow-up effectively closes #478 by removing its broken-wikilink trigger; first contributions from @Lemmeron via #489 and @doctorwodka via #476). Drafted 2026-04-28 (late) with v0.22.12 spotlights (#481 marriage-detail symmetry, #487 dedup-key keeps death popups when a custom event shares the location, #488 Part 2 universe rename cascade, #483 + #486 map-readability dials). Drafted 2026-04-30 with v0.22.13 spotlights (map coverage closes four gaps — multi-spouse marriages, multi-participant events, child-place coords, custom event labels; place modal coord-row landing cleanly; marriage-detail mirroring across mixed spouse formats) + v0.22.14 spotlights (universe rename direction closes end-to-end via Part 3; marriage-marker pairing between two spouses; Cleanup Wizard step for places missing cr_id). Refreshed 2026-04-30 with v0.22.12 + v0.22.13 + v0.22.14 spotlights ported (ten new H3 sections plus cluster intro update to fifteen releases / 480 tests / ten patches without reset; #442 follow-up and #488 Part 1 had already shipped in the v0.22.10 + v0.22.11 batch and were skipped during this port). All four clusters (0.22.x, 0.21.x, 0.20.x, 0.19.x forward) live on `/changelog/`. Refreshed 2026-05-03 with v0.22.18 spotlights ported (three new H3 sections — combined Merge Wizard / Bases Spouse(s) entry surfacing the guides-authoring meta-narrative, Entity Profile metadata-cache race across three services, Book Builder report-chapter sanitizer; cluster intro live on the website was updated separately to nineteen releases / 589 tests / one patch in the new window — this planning doc's own intro paragraph remains at the v0.22.14 baseline since v0.22.15–v0.22.17 spotlights were ported directly to the website without mirroring back here, a backfill pass worth doing whenever convenient). Drafted 2026-05-06 with v0.22.19 + v0.22.20 spotlights (four new H3 sections: Relationship Calculator handles step + adoptive in both directions — combined #525 + #526 with the v0.22.19 + v0.22.20 two-pass story; Map view filter row wraps on Android phones — #528 with the v0.22.19 attempt + v0.22.20 flexbox fix and the on-device verification pattern that surfaced the gap; Notes from the Add Custom Relationship modal are now persisted — #530 via discussion #529; Wikilinks resolve correctly when name and filename diverge — #524, same architectural shape as #510). Drafted 2026-05-06 (later) with v0.22.21 spotlights (three new H3 sections at the top: combined Adopted children and siblings now appear consistently across the Dynamic Relationship Block and Timeline — #531 + follow-up, three rendering paths catching up to v0.22.20's #525/#526 routing change; Siblings in the Dynamic Relationship Block now sort by birth date — #532, exposed when a sibling is added out of YAML order; Custom relationship types filed under the Family category now render in the Profile view — #533, the routing dead zone surfaced via DigitalDreamn's `twin` test). Drafted 2026-05-07 with v0.22.22 + v0.22.23 spotlights (five new H3 sections at the top: Wikilink corruption from earlier internal helper changes now self-heals on save — #537, the data-loss regression introduced in v0.22.17 / v0.22.19 work that triggered the sixth window reset and whose fix is also recovery for already-affected vaults; The Person Profile View now shows organization memberships — #536, mirroring the inverse of the Org Profile View's existing Members section; Members in the Org Profile View now group and sort by role — #535, with shared logic between the Profile View and the dynamic Members block; Per-image captions in the dynamic media gallery — #523, with right-click affordances and frozen-gallery support; Marriage details now write symmetrically when linking a new spouse — #534, shipped same-day as v0.22.23 follow-up to the v0.22.22 batch). Drafted 2026-05-08 with v0.22.24 spotlights (four new H3 sections at the top, all four reported by @DigitalDreamn during her #537 verification sweep: File paths in wikilink alias slots now self-heal on save — #538, extending the v0.22.22 self-heal with a slash-strip step; The wikilink writer now disambiguates when basenames collide with files outside the plugin's folder structure — #540, surfaced by the "grabby" behavior in her vault's Graph view; The Dynamic Relationship Block's `all` mode now displays custom-typed relationships — #539, the renderer finally honoring its wiki contract; Adding an organization membership from Edit Person now syncs to the organization's frontmatter — #541, closing a Bases-visible bidi-sync gap). Drafted 2026-05-08 (later) with v0.22.25 spotlights (three new H3 sections at the top, same-day follow-up to v0.22.24, all three reported by @DigitalDreamn during her v0.22.24 verification: The Edit Person modal now displays clean labels for relationship and place fields — #543, surfaced after #540's path-disambiguation produced canonical `[[path|basename]]` output that the modal didn't parse; Org wikilink writes from the membership flow now route through the canonical helper — #542, closing the writer-side bypass that left `membership_orgs` outside the v0.22.22 / v0.22.24 self-heal coverage; Org-side member sync now waits for the metadata cache to refresh — #541 follow-up, closing the cache-timing race that produced "trailing one update behind" behavior in the multi-Jedi test). Cluster intro should update to 26 releases / 706 tests / three patches in the new window (anchored to v0.22.22) when ported. Drafted 2026-05-09 with v0.22.26 spotlights (three new H3 sections at the top: Canvas Family Tree adopted-children + step-relationships consistency — combined #545 + thread surfacing both the adoptive-parent-edge drop and the step-parent-edge visit-order dependency, with the architectural framing — `RelationshipQueryService` introduced under #546 — kept in the cluster intro update rather than its own H3; Family Timeline view now includes adopted and step children — #546 inventory closing two latent gaps, including a memberCount undercount in the People Tab badge tooltip; GEDCOM-X export now includes gender-neutral parent relationships — #546 inventory closing a third latent gap as a side effect of the architectural refactor). Cluster intro should now read 27 releases / 730 tests / four patches in the new window (anchored to v0.22.22) when ported. Backfill pass for v0.22.15–v0.22.17 still pending. Drafted 2026-05-09 (later) with v0.22.27 spotlight (one new H3 section at the top: Batch cleanups on People, Places, and the data-quality wizard finish faster — #547 cache-race audit, framed around the 2-second sleep removal and the same-shape fix applied to organization, universe, and place graphs; tracking issue stays open for the external-edit invalidation half deferred to 1.x). Ported to chartedroots.com 2026-05-09 as commit `62d01cf` with the v0.22.x cluster intro updated to 28 releases / 739 tests / five patches in the new window (anchored to v0.22.22). Drafted 2026-05-10 with v0.22.28 spotlights (two new H3 sections at the top: combined Edit-modal display coverage — #543 spouse-field follow-up + #549 Edit Organization / Edit Event extension, framed around the user-facing cleanup with writer-side rewrap as the supporting infrastructure; property-based fuzz coverage extension — #548 defensive testing across four input-contract helpers, +79 tests). Ported to chartedroots.com 2026-05-10 as commit `31b17c7` with the v0.22.x cluster intro updated to 29 releases / 818 tests / six patches in the new window (anchored to v0.22.22).
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

Fifteen releases across this cluster. Four same-day hotfixes (0.22.1 through 0.22.4) closed critical data-loss bugs surfaced by community testing. 0.22.5 through 0.22.14 brought the fictional-calendar work into shape, landed Phase 1 of the universe → calendar link, closed eight distinct surfaces where era-naive year extraction silently broke fictional dates, fully closed the lat/lng-only-on-pixel-CRS cluster across three journey-mode sites, hardened person-delete cleanup against broken wikilinks and single-relationship scalar serializations, mirrored marriage details bidirectionally between spouses, cascaded Universe-note renames across referencing entity notes end-to-end (Parts 1 + 2 + 3 across three releases), and surfaced four classes of map data that had been silently invisible — multi-spouse marriages, multi-participant events, child-place events, and custom event labels. Regression tests grew from 189 to 480 across the fifteen releases. Stability window has held since 0.22.4 (ten patches without a reset).

### Edit modal display now strips wikilink path/pipe across Person spouses, Organization, and Event fields ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543), [#549](https://github.com/banisterious/obsidian-charted-roots/issues/549))

Several modal fields had been displaying the raw inner content of wikilinks rather than the friendly display name. On Edit Person, the Spouse list and the marriage location showed the raw piped form like `Charted Roots/People/Rebecca Wilkin|Rebecca Wilkin` while Father / Mother displayed cleanly — surfaced by the multi-Jedi verification effort and pinned by a screenshot from a community user. On Edit Organization (parent_org, seat) and Edit Event (place, timeline), the same gap existed and hadn't been touched yet. v0.22.28 closes all four sites with the same display-cleanup helper that Father / Mother fields have been using since v0.22.25 — applied at the spouse render path, the marriage location render path, and the four additional modal fields. For the user-typed free-text fields (Edit Org parent/seat, Edit Event timeline), the writer also re-canonicalizes on save so edits don't lose the wikilink structure. Underlying frontmatter stays unchanged in all cases — only the modal display is cleaned up.

### Internal: property-based fuzz coverage extended to four wikilink-input helpers ([#548](https://github.com/banisterious/obsidian-charted-roots/issues/548))

Charted Roots has a small cluster of helpers that handle wikilink-shaped inputs: a writer that builds canonical wikilinks, a reader that extracts the display name, a basename-disambiguator. Most of the bug reports in this cluster have been a user hitting an input variant the writer hadn't anticipated, and the fix is to add handling for that variant. v0.22.25 introduced a property-based fuzz suite for the most-exposed helper (the person-note-writer's `createSmartWikilink`) — a corpus of every input shape we'd seen plus the canonical clean cases, asserting parseable-output shape and round-trip idempotency. v0.22.28 extends the same pattern to three additional helpers (the display-name extractor, the basename disambiguator, and the organization-side and event-side wikilink writers). 79 new tests across four files. Defensive coverage rather than user-facing change — when the next variant in this cluster surfaces, the fix flow becomes "add the new shape to the corpus and the existing assertions catch it."

### Batch cleanups on People, Places, and the data-quality wizard finish faster ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547))

The data-quality batch operations (deduplicate relationships, remove placeholder values, normalize names, repair missing IDs, fix bidirectional inconsistencies, and so on) used to pause for 2 seconds at the end of each run. The pause was a defensive workaround for a subtle timing problem: Obsidian's metadata cache catches up asynchronously after frontmatter writes, and the plugin's family-graph cache rebuild needed to wait long enough for that catch-up to complete before re-reading. v0.22.27 replaces the fixed 2-second wait with an event-driven one — the cache rebuild now waits exactly as long as Obsidian needs (typically tens of milliseconds), then proceeds. The same shape was applied to the place, organization, and universe graphs; newly created organizations, universes, and places now appear immediately in dropdowns and pickers instead of occasionally requiring a manual refresh. No user-reported bugs closed; this was preventative work during the v0.22.22-anchored stability window. Tracking issue [#547](https://github.com/banisterious/obsidian-charted-roots/issues/547) stays open for the second half of the audit (handling external file edits made outside the plugin), which is deferred to 1.x.

### The Canvas Family Tree now connects adopted children and step-relationships consistently ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545))

Generating a Canvas Family Tree from any ancestor of an adoptive parent — Marie's tree, Ben's tree, or a tree from Marie's father — was silently dropping adopted children entirely. The descendant-tree builder was emitting an adoptive-parent edge but never adding the child as a positioned node, so canvas rendering dropped the edge for missing endpoint position. The same investigation surfaced a second bug from the same thread: step-parent edges were being silently dropped when the step-parent happened to be reached via a different path first (e.g., Anakin's bio mother Shmi being processed before Owen's stepmother walk discovered her as Owen's stepmother), because the cycle-detection check was doubling as an edge-emission gate. Anakin↔Cliegg worked only because Cliegg happened to be reached via Anakin's stepfather walk first — pure ordering luck. Both fixed: the descendant builder now adds adopted children to the rendered tree, the full-tree builder walks adopted and step children from the parent's side, the family-chart layout's fallback positioning recognizes adoptive and step parents, and edge emission is decoupled from cycle-checking across all three tree-builders. Reported by @DigitalDreamn.

### The Family Timeline view now includes adopted and step children ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546))

The family-timeline view (the badge on People Tab rows and the modal in Control Center) was iterating only biological children when collecting events for the focal person's family. A focal person whose only children were adopted would see a timeline showing just self and spouse, with no indication that their adopted children had been omitted. The same gap caused the People Tab badge to undercount members in blended families — the displayed count and tooltip skipped over adopted and stepchildren. Both fixed by routing the events-collection walk and the legend-population walk through the new unified relationship query service introduced in this release. Surfaced as a latent gap during the architectural inventory rather than user-reported, but the fix lands alongside the user-facing Canvas Family Tree work since they're the same code-path family.

### GEDCOM-X export now includes gender-neutral parent relationships ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546))

The GEDCOM-X exporter walked all the gender-specific bio and adoptive parent fields plus the step-parent arrays — but never the gender-neutral `parents:` or `adoptive_parent:` arrays. Persons declaring their parents via `parents: [[X]]` rather than `father:` / `mother:` had their parent relationships silently omitted from GEDCOM-X output. Surfaced when consolidating the exporter's seven previous parent-walking branches into a single unified service call as part of the architectural refactor; the consolidation closed the coverage gap as a side effect rather than requiring a separate fix.

### The Edit Person modal now displays clean labels for relationship and place fields ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543))

The "Linked to:" labels and read-only input fields in the Edit Person modal were rendering the raw inner content of wikilinks — `Charted Roots/People/Errol Naberrie|Errol Naberrie` instead of just `Errol Naberrie` — for any relationship or place field whose underlying frontmatter stored a piped or path-form wikilink. Surfaced after the [#540](https://github.com/banisterious/obsidian-charted-roots/issues/540) basename-disambiguation landed in v0.22.24: the canonical `[[path|basename]]` form is correct on disk, but the modal didn't parse it for display. The fix adds a small `extractDisplayLabel` helper that mirrors the writer-side stem-collapse pattern (strip brackets, then collapse pipe-form to the alias and path-form to the basename), applied at the modal's display sites. Underlying frontmatter stays raw — the writer re-canonicalizes on save. Reported by @DigitalDreamn during her v0.22.24 verification, when she saw `[[Charted Roots/People/Plo Koon|Plo Koon]]` rendered as `Charted Roots/People/Plo Koon|Plo Koon` in the modal.

### Org wikilink writes from the membership flow now route through the canonical helper ([#542](https://github.com/banisterious/obsidian-charted-roots/issues/542))

The membership service's `addMembership` was pushing the org wikilink into the `membership_orgs` frontmatter array verbatim, bypassing the input-shape normalization (#537/#538) and basename-ambiguity disambiguation (#540) that every other relationship-field write got. Path-form residue from earlier duplicate-basename eras persisted indefinitely; new entries didn't disambiguate at write time even when basename collisions existed in the vault. The fix routes the new entry through the canonical wikilink helper and adds a full-array rewrite pass on every save, so existing entries normalize alongside the new one — historical residue heals on the next add or remove instead of waiting for that specific entry to be touched. Same pattern applied to remove-membership for the surviving entries. Surfaced by @DigitalDreamn during her [#538](https://github.com/banisterious/obsidian-charted-roots/issues/538) verification sweep, where her organization frontmatter still showed path-form wikilinks after every other relationship field had been cleaned up by the self-heal.

### Org-side member sync now waits for the metadata cache to refresh ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) follow-up)

The v0.22.24 [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) fix triggered the org's `members` / `members_id` sync from person-side membership add/remove flows, but the sync re-read the metadata cache to assemble the member list — and Obsidian's `processFrontMatter` updates the file synchronously while the cache update fires asynchronously via the file watcher event. Result: the sync ran on stale cache and wrote a member list "trailing one update behind" — adding person N propagated person N-1 to the org's frontmatter. The fix introduces a small wait-for-cache-refresh helper that listens for the next metadata cache update for the modified file before triggering the sync, with a 500ms timeout fallback. Caught by @DigitalDreamn with a multi-Jedi test (adding Quinlon Vos to the Jedi Order wrote Obi-Wan; adding Nejaa Halcyon next wrote Quinlon, etc.). Filed as a refinement under the existing #541 issue rather than a new filing.

### File paths in wikilink alias slots now self-heal on save ([#538](https://github.com/banisterious/obsidian-charted-roots/issues/538))

Some on-disk wikilinks had a file path captured into the alias slot — typically residue from periods when a vault contained duplicate-basename files outside the plugin's folder structure. The v0.22.22 [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) self-heal collapsed pipe-stem accumulation but didn't recognize path-form input, so the path remained even after saving the affected note. The v0.22.24 fix adds a slash-strip step to the round-trip collapse: when a file path appears in the alias slot, it gets stripped down to the basename on the next Edit Person save, just like the v0.22.22 self-heal did for accumulated pipes. Surfaced by @DigitalDreamn during her v0.22.22 verification sweep — twelve out of ninety-five person notes had pipe accumulation cleaned up by the v0.22.22 fix, and a subset of those plus the `birth_place` field had the path-in-alias residue that needed this follow-up extension.

### The wikilink writer now disambiguates when basenames collide with files outside the plugin's folder structure ([#540](https://github.com/banisterious/obsidian-charted-roots/issues/540))

When a vault contains two files sharing the same basename — a Charted Roots person note plus an unrelated note elsewhere — Obsidian's link resolver picks one based on its own heuristics, and the plugin's `[[basename]]` wikilinks could land on the wrong file. Symptom: cross-folder connections in Obsidian's Graph view, click-through navigation to the wrong note, and silent rewiring of the wikilink to point at the non-CR sibling on subsequent saves. The fix detects basename ambiguity at write time and emits the path-form target with the basename as alias (`[[Charted Roots/People/Plo Koon|Plo Koon]]`) so the resolver lands unambiguously on the intended file while the display text stays clean. @DigitalDreamn caught this in her vault by routinely checking Obsidian's Graph view to verify connections — the "grabby" behavior on a newly-created Charted Roots Plo Koon file linking out to her original story-arc Plo Koon was the symptom that surfaced the gap.

### The Dynamic Relationship Block's `all` mode now displays custom-typed relationships ([#539](https://github.com/banisterious/obsidian-charted-roots/issues/539))

The wiki contract for `type: all` was "everything in extended, plus custom-typed relationships declared in the person's relationships frontmatter array (mentor, godparent, ally, etc.)." In practice the renderer ignored the custom-relationships array entirely — only the family-graph-derived sections (parents, spouse, children, siblings) ever rendered, regardless of mode. The fix fetches the person's relationships via the relationship service, filters to non-family-mapped types using the same predicate the Profile View's "Other Relationships" subsection uses, deduplicates symmetric pairs, and groups entries by relationship type name. Each custom type renders as its own section after Siblings. Caught by @DigitalDreamn after configuring Plo Koon as Ahsoka's mentor and observing he didn't appear in the dynamic block at all.

### Adding an organization membership from Edit Person now syncs to the organization's frontmatter ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541))

The bidirectional sync that keeps an organization's `members` / `members_id` frontmatter in step with the person-side `org_membership_*` properties of its members was only triggered from the org-side "Manage Members" modal. Adding or removing a membership through the Person's Edit Person → Add Membership flow updated the person's frontmatter but didn't propagate the change back to the org. Mostly invisible because the Org Profile View's Members section and the dynamic Members block both assemble member lists by scanning person notes, so the new member appeared correctly there — the discrepancy only surfaced in Obsidian Bases queries that read the org's own frontmatter directly. The fix triggers the sync from both `addMembership` and `removeMembership` paths.

### Wikilink corruption from earlier internal helper changes now self-heals on save ([#537](https://github.com/banisterious/obsidian-charted-roots/issues/537))

A latent regression introduced by earlier work on the wikilink-writing helpers (the v0.22.17 disambiguation feature, broadened in v0.22.19) was causing repeated saves to add an extra `|alias` segment to existing wikilinks. After two or three saves the wikilink would end up with three or more pipes and stop being parseable, at which point the bidirectional linker would treat the slot as broken and silently drop the reference — propagating the loss outward through related notes (children scrubbed from parents, parents scrubbed from kids). The bug only fired on people whose `name` differed from their filename basename (a deliberate vault pattern), but in vaults with that pattern it was deterministic on every save. **The fix is self-healing.** Vaults with already-corrupted entries — triple-pipe wikilinks like `[[basename|basename|alias]]` or further-accumulated forms — collapse back to canonical form automatically on the next save through Edit Person, no manual repair needed. Reported by @DigitalDreamn while debugging an unrelated cascade in her Star Wars vault, where a duplicate-file state from a File Recovery session was amplifying the underlying helper bug into a continuous corruption pattern. The diagnostic she contributed — File Recovery timestamps showing the wikilink shape evolving across consecutive saves — was instrumental in identifying the round-trip non-idempotency. **Stability-window impact:** sixth window reset since the start of the 0.22.x run. The regression originated within the previous window (0.22.17 added the helper, 0.22.19 broadened it), exactly the case the gate is designed to catch.

### The Person Profile View now shows organization memberships ([#536](https://github.com/banisterious/obsidian-charted-roots/issues/536))

A new "Memberships" section appears between Relationships and Events on a person's profile when they have at least one organization membership (hidden otherwise). Each row shows the role label, organization link, date range, a "Current" badge for ongoing memberships, and per-membership notes on a separate line beneath. Closes a long-standing UX symmetry gap: the Organization Profile View has shown members for a while, but the Person Profile didn't show what organizations they belonged to. Reported by @doctorwodka.

### Members in the Org Profile View now group and sort by role ([#535](https://github.com/banisterious/obsidian-charted-roots/issues/535))

Previously the Members section in the Organization Profile View rendered as a flat list with `member` array order — readable for small orgs but hard to parse once role distinctions mattered. Members now appear under uppercase role headings (`FOUNDER`, `BISHOP`, etc.) with members sorted by name within each group, and a "MEMBERS" heading covering anyone with no explicit role. Order rules match the dynamic Members block: the org's declared `roles` list pins a sequence at the top, remaining named roles fall through alphabetically, and the no-role group is always last. The grouping logic now lives in a shared helper consumed by both the dynamic block and the profile section, so the two surfaces stay consistent. Reported by @doctorwodka.

[More in Organizations →](/features/#organizations)

### Per-image captions in the dynamic media gallery ([#523](https://github.com/banisterious/obsidian-charted-roots/issues/523))

Each thumbnail in the `charted-roots-media` block can now carry a short caption — useful for the deep-archive use case where many photos per person each benefit from a brief label like "1978 - Jon Aged 3" rather than a single long-form description in the note body. Captions render beneath the thumbnail in muted text, single-line truncated with full text on hover. Right-click any thumbnail for **Set caption** / **Edit caption** / **Remove caption** options, mirroring the existing crop-region affordance. Captions persist as a flat parallel array in frontmatter (respecting the project's flat-YAML preference), reshuffle in lockstep with media reorder, and ride through frozen-gallery export by injecting into the wikilink alias slot — so the static markdown stays self-contained after the block is replaced. Reported by @xBlack-Dogx via discussion [#521](https://github.com/banisterious/obsidian-charted-roots/discussions/521).

### Marriage details now write symmetrically when linking a new spouse ([#534](https://github.com/banisterious/obsidian-charted-roots/issues/534))

Linking a new spouse via Edit Person and adding marriage details (date / location / status / divorce date) in the same save was correctly writing the indexed companion fields to the editing person's frontmatter but leaving the spouse's frontmatter with only the flat link — no marriage details mirrored across. The fix unifies the bidirectional linker's spouse-write paths: whenever the source provides marriage details, the target now lands in the indexed frontmatter format that has the necessary slots to receive them. Both new-link and re-edit-with-details cases are covered by the same code path. Reported by @DigitalDreamn while debugging the broader cascade behavior that became #537. Shipped same-day as v0.22.23 follow-up to the v0.22.22 batch; medium-priority, doesn't reset the soak window.

### Adopted children and siblings now appear consistently across the Dynamic Relationship Block and Timeline ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531))

Two cascade effects from v0.22.20's #525/#526 routing change went unnoticed at release. That fix moved adopted children out of the parent's "biological children" bucket so the Relationship Calculator would stop labeling them as blood relations — but three rendering paths still read only from the bio bucket, so adopted children silently dropped off bio-side household pages. Bio siblings stopped seeing their adopted siblings in the Dynamic Relationship Block, the Dynamic Timeline Block stopped showing adopted-sibling birth events on those same pages, and adoptive parents stopped seeing their adopted children listed under "Children". From the adopted child's own page everything still looked fine — they could see their adoptive siblings — which made the asymmetry tricky to spot. All three views now surface adopted children and siblings correctly, with adopted children labeled "Adopted child" mirroring how adoptive parents are already labeled "Adoptive father" / "Adoptive mother". Reported by @DigitalDreamn during careful verification of the v0.22.20 release on her Wilkin household, with a meticulous follow-up that distinguished her bio Wilkin children seeing Galen on Timeline (via a manual `sibling:` declaration left over from earlier testing) from those who didn't (no such declaration to fall back on) — the side-path observation made the missing-walker diagnosis fast.

### Siblings in the Dynamic Relationship Block now sort by birth date ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532))

The block had been displaying siblings in whatever order they were listed in the parent's frontmatter `children:` array — fine when that order matched birth order (which is what most users do reflexively), but exposed the moment a sibling was added later or out of order. @DigitalDreamn caught this on her Wilkin family where Ben was listed before A in the parent's `children:` array, so every sibling's view of that family showed Ben (b. 54 BBY) before A (b. 56 BBY) — wrong direction in the Star Wars descending-era convention. The new sort respects custom-calendar conventions: descending fictional eras (BBY, etc.) order oldest-first the same as Gregorian dates, because the comparator works on a canonical-year scale rather than raw numeric values. Persons without a parseable birth date sink to the end while preserving relative order. Bio + adoptive siblings are merged and sorted together rather than grouped by source — the natural reading order is "by age," not "by relationship type."

### Custom relationship types filed under the Family category now render in the Profile view ([#533](https://github.com/banisterious/obsidian-charted-roots/issues/533))

A custom type configured under the "Family" category — like a user-defined `twin` — was being silently dropped from the Profile pane between two filters: the Other subsection's category check excluded it (because category was Family), and the Family subsection only knew about the built-in bio fields like Father / Mother / Spouse / Child, so it had no path to surface custom-typed family rows either. The data persisted to frontmatter correctly (#530's notes-persistence fix from v0.22.20 verified working), but the row was invisible regardless. Family-category custom relationships now render inline inside the Family subsection alongside the bio family rows, grouped by type name (e.g. a "TWIN" subsection appears beneath PARENTS / CHILDREN), with their per-relationship `<type>_notes` displayed beneath each row in italic muted text — matching the Other Relationships layout shipped in v0.22.20. Reported by @DigitalDreamn while comparing v0.22.20 notes-display behavior across her custom types: `vessari_master` (non-family category) rendered correctly with its note, `twin` (Family category) didn't render at all. The side-by-side comparison made the routing-dead-zone diagnosis obvious.

[More in Custom Relationships →](/features/#custom-relationships)

### Relationship Calculator handles step and adoptive relationships in both directions ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526))

The Relationship Calculator's BFS only traversed bio-relationship edges and ignored the step / adoptive edges that the family graph already populates on each person node. Going Galen → Ben as adoptive father returned "Not related" with a BFS-exhausted warning; going Anakin → Cliegg as stepparent returned "Parent-in-law" while Cliegg → Anakin returned "Child" with `Blood: Yes` — the same two-hop path producing two wrong direction-asymmetric labels. The fix now produces **Stepparent**, **Stepchild**, **Stepsibling**, **Adoptive parent**, **Adopted child**, and **Adoptive sibling** labels symmetrically, with multi-hop variants (Step-grandparent, Adoptive grandparent, Step-aunt/uncle, Adoptive cousin, etc.), and flags `Blood relation: No` whenever a path crosses a step or adoptive edge. The fix landed in two passes: v0.22.19 expanded the BFS to traverse the new edges and added the labels (resolving the child → parent direction); v0.22.20 fixed a separate bug in custom-relationship-array parsing that had been rerouting parent-side step/adopted-child entries into bio `childrenCrIds`, masking the parent → child direction.

**Behavior change:** users with existing step or adoptive relationship data will see corrected labels in the Relationship Calculator, the kinship report generator, and the path-step display where previously they saw "Not related", "Sibling-in-law", or "Child / Blood: Yes". Reported by @DigitalDreamn, with detailed reproductions on her Star Wars / Lars-family vault that made the BFS-exhausted trace fast.

[More in Features →](/features/#relationship-calculator)

### Map view filter row wraps onto its own line on Android phones ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528))

The center toolbar filters (collection picker, year-range inputs) had been overflowing past the right edge of the viewport on Android phones — visible labels read `All collection`, `Fron`, `To y` — because the existing 768px viewport media query that should have wrapped the row to its own line wasn't taking effect. v0.22.19 added a `Platform.isPhone` class-based fallback that didn't actually fix the bug; on-device DevTools (`chrome://inspect` from desktop Chrome to Android Obsidian's WebView) revealed the layout was still wrong because both paths set `width: 100%`, which is silently overridden by the inherited `flex-basis: 0` from the base `flex: 1` declaration. v0.22.20 replaced `width: 100%` with `flex: 0 0 100%` (don't grow, don't shrink, base 100%) and verified on the device pre-release. The cycle established a new pre-release device-verification step for any `mobile-*`-labeled fix: install on the actual platform via direct file copy or BRAT and verify before tagging, rather than shipping based on best-effort diagnosis. Reported by @banisterious while attempting to reproduce a separate iPad bug on a personal Android device.

### Notes from the Add Custom Relationship modal are now persisted ([#530](https://github.com/banisterious/obsidian-charted-roots/issues/530), via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529))

The "Notes (optional)" textarea in the Add Custom Relationship modal had been capturing what users typed but silently discarding it on save — the captured value was never referenced by any of the writer paths and just fell out of scope when the modal closed. The wiki referenced the notes element in the manual-frontmatter sections and the Best Practices section encouraged adding them; the modal wasn't delivering. Notes now persist as parallel `<type>_notes` flat arrays alongside the existing `<type>` and `<type>_id` arrays, index-aligned with the targets array — matches the existing `<type>_from` / `<type>_to` parallel-array convention already read by the parser, and respects the project's flat-YAML preference (no nested objects in frontmatter). Notes display in the Entity Profile relationships section beneath each row that has one, italicized and indented to align with the link column. Currently scoped to non-bio relationship types (custom + step / adoptive / foster / etc.); bio family relationships use dedicated frontmatter fields with no notes slot and are tracked as a follow-up. Reported by @DigitalDreamn via discussion #529.

[More in Custom Relationships →](/features/#custom-relationships)

### Wikilinks generated by the relationship picker resolve correctly when name and filename diverge ([#524](https://github.com/banisterious/obsidian-charted-roots/issues/524))

The writers' `createSmartWikilink` derived files from name via `getFirstLinkpathDest`, which returned null when no file's basename matched the name — a common case for users filing women under maiden name with the display name set to the married name. The fall-through wrote a bare `[[name]]` form that didn't resolve to anything, while the parallel `cr_id` link stayed correct, so the bug was silent until a user clicked the wikilink. Same architectural shape as #510 from 0.22.17 but on a different code path (the writer-side helper rather than the event-creation path). The helper now accepts an optional `crId` and resolves the file by id when provided, falling back to the name-based lookup when no cr_id is available. ~20 person-side call sites pass the paired cr_id through (father, mother, spouse 1-5, children, stepfather, stepmother, adoptive parents, parents, birth_place, death_place, sources). Reported by @doctorwodka after continued name/basename divergence testing.

### Map coverage closes four gaps: multi-spouse marriages, multi-participant events, child-place rendering, and custom event labels ([#493](https://github.com/banisterious/obsidian-charted-roots/issues/493), [#494](https://github.com/banisterious/obsidian-charted-roots/issues/494), [#498](https://github.com/banisterious/obsidian-charted-roots/issues/498), [#499](https://github.com/banisterious/obsidian-charted-roots/issues/499))

Four classes of map data that had been silently invisible now render correctly. Multi-spouse people surface every marriage on the journey path and as separate map markers — not just the first one written to legacy flat fields — because the marker pipeline now reads the indexed `spouseN_marriage_*` schema (#498). Multi-participant events (a wedding with bride and groom, a battle with multiple combatants) collapse into one combined marker with all participants listed in the popup, instead of stacked per-person duplicates (#493). Child places (e.g., "Lars Homestead" with `parent_place: [[Tatooine]]`) inherit the nearest ancestor's coordinates when they have none of their own, so events at child places appear at the visible parent's location instead of dropping silently — same shape covers the real-world equivalent of a Stockholm event on a vault where only Sweden has coordinates (#494). And the journey-mode rich popup preserves the original event type for custom events ("Backstory") instead of collapsing to the generic "Custom" label — sibling to an earlier static-marker fix that hadn't reached the journey-mode rendering path (#499).

Three of the four were surfaced by @DigitalDreamn during a single verification cycle on the Star Wars / Lars-family vault: Cliegg Lars's two marriages were missing from his journey, Lars Homestead set as his death location wasn't producing a marker, and the journey popup labeled his Backstory event as "Custom" instead of "Backstory."

[More in Features →](/features/#geographic-features)

### Marriages between two spouses render as one combined marker ([#501](https://github.com/banisterious/obsidian-charted-roots/issues/501))

Sibling to the multi-participant event dedup above (#493) but for marriages — which live as frontmatter on each spouse's note rather than as separate `cr_type: event` notes, so the existing event-id-based dedup didn't catch them. Owen Lars's marriage to Beru Whitesun produced one marker for Owen at Tatooine and another for Beru at the same place, with neither popup naming the partner. The map pipeline now attaches the partner's identity to each marriage marker, and a new dedup pass groups by sorted-pair + place + date so the two perspectives collapse into a single combined marker. Both spouses appear in the popup ("Owen Lars / with Beru Whitesun"), and the journey-mode popup gains a Partner row for marriage waypoints. Surfaced by @DigitalDreamn during her #493 / #498 verification.

### Two rendering fixes surfaced while authoring the chartedroots.com guides section ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514), [#516](https://github.com/banisterious/obsidian-charted-roots/issues/516))

The Merge Wizard component creates ~20 distinct `cr-merge-*` class names but no CSS file ever defined any of them — the layout fell back to default block flow, stacking each field / value / value / dropdown vertically instead of as the side-by-side comparison the component was always built to render (#514). New `styles/merge-wizard.css` wires up the grid plus styling for the conflict dropdowns and the preview panel. Surfaced while writing the [find-and-merge-duplicates guide](/guides/research/find-and-merge-duplicates/), where the screenshot was supposed to show a 4-column comparison and showed a stacked column instead.

A sibling fix landed the same release in the People base's Spouse(s) column (#516), which mapped directly to `note.spouse` only — so vaults using the recommended indexed pattern (`spouse1`, `spouse2`, etc.) saw an empty column even when multiple spouses were recorded. A new `spouses_all` formula aggregates the flat `spouse` plus `spouse1` through `spouse5`, filtering empties, so single-spouse and multi-marriage households both render. Surfaced while writing the [use-bases-for-data-analysis guide](/guides/research/use-bases-for-data-analysis/) — same dogfood loop, different surface.

Both bugs were authoring-time discoveries: the guide drafts assumed the displayed surface matched the documented behavior, and the gap surfaced the bug. Worth noting as a feedback loop the maintainer didn't anticipate but plans to keep.

### Entity Profile pane stops showing "Could not load entity data" for newly-created entities ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519))

A metadata-cache race in `EventService`, `SourceService`, and `ProofSummaryService`. Each service loaded its cache lazily and invalidated on writes, but didn't react to Obsidian indexing the new file later. After `createEvent` (or `createSource`, or `createProof`), a read between the write and Obsidian's metadata catch-up silently skipped the new file and marked the cache valid without it — invisible until something else invalidated. Each service now subscribes to `metadataCache.on('changed')` plus vault delete/rename, invalidating when a relevant `cr_type` file moves through the index. `ProofSummaryService` was hoisted to a singleton on the plugin (it had been constructed per-render at five sites — singleton was needed so the listeners persist for the plugin lifetime); consumer sites now use a `getProofSummaryService` getter. Reported by @DigitalDreamn. 15 new tests across three suites cover the regression.

[More in Features →](/features/#entity-profile-view)

### Report chapters in Book Builder no longer leak raw `[[wikilink]]` syntax into PDF/ODT output ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522))

`BookGenerationService` already sanitized vault-note chapter content through a helper that strips wikilinks, frontmatter, and dynamic blocks — but the report chapter path stored the report generator's markdown into the chapter directly with no sanitization. Report generators (Family Group Sheet, Individual Summary, Source Summary, Sources by Role) emit raw `[[Name]]` syntax intentionally for in-vault rendering, which the static export renderer then displayed as literal text. `generateReportChapter` now applies the same sanitizer; helpers were extracted into a standalone module so the regression is fenced directly with realistic Family Group Sheet shaped input. Standalone-PDF report generation already had its own `stripWikilinks` and was unaffected. Affects all four report chapter types when used in books.

[More in Features →](/features/#book-builder)

### Universe rename direction closes end-to-end ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 3)

Three-part arc closes here. Part 1 (v0.22.11) made the Edit Person Universe dropdown source from the universes folder so renamed notes appeared in the picker. Part 2 (v0.22.12) added the cascade that rewrites `universe:` plain-string references on referencing entities when a universe note's basename changes. Part 3 (v0.22.14) makes the Edit Universe modal trigger that cascade naturally instead of requiring users to know to rename the file directly: the modal now sanitizes the new name and triggers a real file rename when the name changes, which fires the existing cascade automatically and gets Obsidian's native wikilink-rewrite for free. Reported by @DigitalDreamn after her Part 2 verification — the natural path of editing a universe via its modal had been silently bypassing the cascade and leaving entities pointing at the old name.

### Cleanup Wizard adds a step for places missing cr_id ([#502](https://github.com/banisterious/obsidian-charted-roots/issues/502))

Place notes lacking `cr_id` are silently excluded from the place graph cache — they don't appear in by-name lookups, the Create Place modal's parent dropdown, or as map markers. This commonly affects places created via flows that don't auto-generate `cr_id` (the Organizations feature was one example) or imported from external sources where the import path didn't populate it. v0.22.9 added a dev-console warning when the exclusion fires; v0.22.14 adds a fixable step in the Post-Import Cleanup Wizard that surfaces all such places and offers a "Generate cr_id" fix action. Layer 2 of the original three-layer plan from #471. Layer 3 (silent auto-heal during cache build) was discussed but rejected — the wizard route preserves user awareness of schema state.

### Place modal coordinate inputs land cleanly ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496) follow-up)

A v0.22.12 fix tried to align the X / Y (and Latitude / Longitude) input pair via `align-items: center` on a flex container of two adjacent setting-items, but Obsidian's default child-pseudo-class padding rules pushed each input to opposite vertical edges of its container. The result: a row that looked like two staggered lines instead of one cleanly-aligned coordinate pair. v0.22.13 reworks the layout so both inputs live inside a single Setting's control area as compound controls, sidestepping the adjacent-setting-items pattern entirely. Pixel inputs render at 100px each; geographic inputs at 140px to accommodate signed decimals and DMS strings.

### Marriage detail mirroring works regardless of spouse format ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) follow-up)

A v0.22.12 fix mirrored marriage details (date, location, status) between two partners' notes when both used the indexed `spouseN:` format, but missed the case where one partner was still on the legacy flat `spouse:` / `spouse_id:` shape — common for couples that paired up before any marriage details existed. v0.22.13 adds an atomic flat-to-indexed promotion that runs whenever the mirror would otherwise bail because the partner is on the older schema. Reproduced on @DigitalDreamn's Bail / Breha Organa scenario: Breha had stayed flat-format because her note hadn't been re-saved since being originally linked, and the v0.22.12 mirror skipped her because it only scanned indexed slots. After the follow-up, setting marriage details on Bail propagates to Breha cleanly.

### Map time slider becomes era-aware (and closes the DateService cluster) ([#453](https://github.com/banisterious/obsidian-charted-roots/issues/453))

The map view's "who was alive at year X" time slider was hardcoded to a 1800–2000 real-world span, so on fictional-era universes (Star Wars BBY/ABY, Middle-earth TA/SA, etc.) the slider's range never intersected the data and the feature was effectively unusable. The slider now derives its min/max from the map's computed year range and renders labels via a new `formatCanonicalYear` helper that inverts canonical years back to era strings ("82 BBY", "5 ABY"). Real-world dates fall back to the plain numeric label. **Eighth and final site of the DateService-bypass cluster** that ran across 0.22.5 → 0.22.9 — every era-naive year-extraction subsystem flagged during the cluster is now era-aware.

[More in Features →](/features/#geographic-features)

### Pixel-coord cluster fully closes across three journey-mode sites ([#448](https://github.com/banisterious/obsidian-charted-roots/issues/448), [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474), [#485](https://github.com/banisterious/obsidian-charted-roots/issues/485))

Three map-mode code paths shared the same lat/lng-only assumption that broke silently on `CRS.Simple` image maps where every place uses pixel coordinates and lat/lng defaults to `(0, 0)`. v0.22.7 fixed the journey-path build dedup that was collapsing every pixel-coord waypoint onto a single phantom (#448). v0.22.10 fixed the camera fly-to and popup placement that landed at the bottom-left corner instead of the actual waypoint (#474). v0.22.11 closes the third site — the initial framing rectangle that ran on entering journey mode and briefly framed the bottom-left corner before the camera flew away (#485). Each site now detects `CRS.Simple` and uses `[pixelY, pixelX]` instead of `[lat, lng]`. Geographic maps unaffected. With all three closed, journey playback opens, frames, and steps through pixel-coord image maps end-to-end without the misframings that surfaced once #448 unblocked the visibility chain.

### Map path labels render upright on multi-waypoint paths ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472))

Path labels (place names rendered along migration and journey paths) flipped inconsistently — some upright, some upside-down on the same map — because leaflet-textpath repeats the label along the entire polyline path and applies a single global 180° rotation when its `flip` mode is on. Any path that bends in different screen-space directions can't be made upright everywhere by one rotation; at least one segment will always render the label backward. Three iterations of fix tried the chord direction (v0.22.9), then the longest-segment direction (v0.22.10), each closing more cases but not all. v0.22.11 lands the structural fix: labels now ride on a separate invisible polyline covering only the longest screen-space segment of the source path, so leaflet-textpath has a single segment to render along and the flip decision is correct for that segment alone. The visible polyline keeps its full multi-waypoint shape; overlapping segments from different polylines each get their own correctly-oriented label.

[More in Features →](/features/#geographic-features)

### Map readability gets two new dials ([#483](https://github.com/banisterious/obsidian-charted-roots/issues/483), [#486](https://github.com/banisterious/obsidian-charted-roots/issues/486))

Path labels gain an optional outline (white or black) so they remain legible on dark or richly-colored image-map backgrounds without changing the path color itself — the default-no-outline behavior is unchanged for neutral basemaps like OSM tiles. Separately, journey-mode playback gets a proper dwell-time selector with explicit second labels (2s / 4s / 6s / 10s, default 4s), replacing the previous slider that conflated "step duration" with "popup visibility window" and left popups visible for under a second at the default setting. The total step interval is now `dwell time + ~1.1s camera fly`, so the popup always gets the full configured window before the next step fires.

### Journey mode keeps death popups when a custom event shares the location ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487))

Journey-mode dedup was meant to suppress consecutive same-place waypoints — useful for collapsing three residence events at one address into a single visible step. But the dedup key only checked the place; it didn't include event type. So a custom event without a date sorted to the end of the life-event run and landed immediately before the death waypoint, and if it sat at the death's location, the dedup loop kept the custom event and silently dropped the death popup. The dedup key now folds in event type, so distinct event types at the same place both survive while same-type same-place events still collapse. Diagnosed by @DigitalDreamn through methodical isolation testing on the Lars-family vault — adding a Backstory event at Cliegg's death location reproduced the swallowed-popup behavior every time.

### Marriage details propagate between spouses ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481))

Filling marriage_date and marriage_location on one partner's note used to leave the other partner with just a spouse link and no marriage details. The bidirectional linker mirrored the spouse wikilink and ID but skipped the companion fields (`spouseN_marriage_date`, `_marriage_location`, `_marriage_location_id`, `_marriage_status`, `_divorce_date`) — a long-standing asymmetry in the create/edit write paths. Now those fields propagate from whichever side they're set on, on both initial fill and subsequent updates. Independently-set values on the receiving side aren't accidentally cleared (only set fields are mirrored), so user data set asymmetrically by intent survives. Reported by @DigitalDreamn after noticing Shmi's timeline didn't include her marriage to Cliegg even though Cliegg's note had it.

### Person delete cleanup sweeps wikilinks and single-relationship scalars ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up, [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478))

Two gaps in v0.22.7's person-delete cleanup, both surfaced once @DigitalDreamn verified the original `_id` sweep on the Lars / Star Wars fixture. The cleanup planner swept the canonical `*_id` arrays (`father_id`, `children_id`, etc.) but not the parallel wikilink-bearing fields (`father`, `children`, `step_child`, etc.) — the original implementation delegated wikilink cleanup to Obsidian's native rewriting, but Obsidian only rewrites wikilinks on rename, not on delete. Deleted persons left broken `[[placeholder]]` links visible in the properties pane and a contributor to a separate save-time bug (#478) that injected empty strings into the parallel `_id` array on the next save. v0.22.11 extends the planner with a parallel wikilink-sweep branch and converts every "array" field handler to accept both array and scalar shapes — turns out the plugin's own writer serializes single-relationship fields as scalars rather than single-element arrays, so deleting an only-child / only-step-child / only-spouse had been silently leaving the dead reference behind. **Closes #478 by removing its trigger:** with wikilinks cleaned up at delete time, no broken wikilink survives to the next save.

### Universe rename cascades through referencing entity notes ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 2)

v0.22.11's Part 1 fixed the Edit Person Universe dropdown so renamed Universe notes appeared in the picker immediately. v0.22.12's Part 2 closes the loop on the actual data: when a Universe note is renamed (e.g. "Star Wars" → "Star Wars (AU)"), `universe:` plain-string references on people / places / events / organizations now cascade to the new name, so existing assignments stay valid. The implementation reads the renamed file's content directly because Obsidian's metadata cache is mid-update during the rename event and `getFileCache` returns null at that moment. Wikilink-syntax universe values (`[[Old Name]]`) are left to Obsidian's native rewrite, and `cr_id`-based references are stable identifiers that don't track the basename.

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

**Full cluster:** [0.22.0](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.0) · [0.22.1](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.1) · [0.22.2](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.2) · [0.22.3](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.3) · [0.22.4](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.4) · [0.22.5](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.5) · [0.22.6](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.6) · [0.22.7](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.7) · [0.22.8](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.8) · [0.22.9](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.9) · [0.22.10](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.10) · [0.22.11](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.11) · [0.22.12](https://github.com/banisterious/obsidian-charted-roots/releases/tag/0.22.12)

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
