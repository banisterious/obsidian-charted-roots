# Media Plan — draft

**Target placement:** Inline embeds on landing, features, research-track, worldbuilding-track, and per-release pages. No dedicated gallery page.
**Status:** 🔶 In progress — video Phase 1 shipped 2026-04-24 (embeds live). Static screenshots and motion loops deferred until a capture session is scheduled. Approach and playbook below.

---

## Purpose

Visual content plan covering three media types: static screenshots, short motion loops (GIFs or WebM), and longer video. Same features often deserve coverage in more than one medium; this doc keeps that planning unified so a capture session can produce static and motion from the same setup.

---

## What exists today

- **Two YouTube videos** linked from the plugin README ([README.md](../../../README.md#demo)):
  - **Quick tour** (~2 min) — `https://youtu.be/elQfn1fk1VQ`. GEDCOM import → family tree → interactive chart → map view.
  - **Full feature tour** (~14 min, chaptered) — `https://www.youtube.com/watch?v=GnOHrG_nVvY`. Full walkthrough including dynamic blocks, highlight groups, custom-relationship overlay, maps, reports, and worldbuilding.
- **About 15 static screenshots** in [docs/images/](../../images/) covering Family Chart, map view, custom map, Control Center tabs, generate-tree flow, statistics, person note, relationship calculator, and branding assets.
- **No motion loops yet.**

---

## Video

### Phase 1: Surface the videos that already exist

Lands with the first website refresh. No new recording required. The existing full feature tour is chaptered, which means individual chapters can be deep-linked from the pages they best support.

**Main embeds:**

- **Landing page** — Quick tour embed as a "See it in action" section. Short form earns the hero slot.
- **Features page** — Full feature tour embedded at the top, with a note that chapter markers let readers jump straight to the capability they care about.

**Chapter deep-links** (from the full feature tour, video ID `GnOHrG_nVvY`):

| Chapter | Starts at | Deep-link target page |
|---|---|---|
| 1. Importing Data | 0:10 | features (GEDCOM / Gramps section) |
| 2. Person Notes & Dynamic Blocks | 1:11 | features (dynamic content) |
| 3. Interactive Family Chart | 1:45 | features (family chart) |
| 4. Maps & Journey Mode | 3:35 | features (maps), worldbuilding (custom maps) |
| 5. Calendar View | 4:49 | features (calendar) |
| 6. Creating a Family | 5:55 | features (wizards) |
| 7. Evidence & Sources | 6:47 | **research-track (primary)** |
| 8. Reports & Book Builder | 7:43 | features (reports), research-track (reports) |
| 9. Statistics Dashboard | 8:43 | features (statistics) |
| 10. Place Lookup | 9:20 | features (places) |
| 11. Bases Integration | 10:06 | features (Bases), wiki link to Bases-Integration |
| 12. World-Building | 10:52 | **worldbuilding-track (primary)** |
| 13. Closing | 12:20 | — |

Deep-link URL format: `https://www.youtube.com/watch?v=GnOHrG_nVvY&t=Xs` where X is the start time in seconds. Embed with the same format inside an `<iframe>` if a chapter-specific autoplay is desired.

**Where each page uses video:**

- **Landing:** Quick tour embedded in a hero-area "See it in action" block.
- **Features:** Full tour embedded at the top; capability sections can include a "Jump to [chapter] in the tour" link.
- **Research-track:** Chapter 7 (Evidence & Sources) deep-linked inline; Chapter 8 (Reports) deep-linked in the reports context.
- **Worldbuilding-track:** Chapter 12 (World-Building) deep-linked as the page's anchor video.
- **Changelog spotlights:** occasional deep-links where a chapter demonstrates a 0.20.x / 0.21.x / 0.22.x feature.

### Phase 2: Release-anchored demos

Ships around major releases (1.0 first). One-off per release, not a tutorial series. Follows the existing production pattern of per-release re-captures tracked in the internal demo-video production docs.

**Candidates:**

- **1.0 launch video.** Short, release-specific (~3 min). "Here's what ships with 1.0." Goes live with the 1.0 tag and lives on the What's New in 1.0 page.
- **Future major-release demos.** Decided per-release. Skip releases that don't have a clear narrative hook.

### Channel strategy

One-off release demos only. Not a tutorial series, not a regular-cadence channel. Tutorial content belongs on the wiki; the video role is to show features moving for releases and flagship capabilities, not to serve as the documentation surface.

### Hosting

YouTube for all video. Standard embed. No self-hosting overhead, no bandwidth cost, captions available. The trade-offs (YouTube-branded player, possible ad placement) are acceptable for the small total video footprint.

### Phase 1 port brief

**Status: ✅ Shipped 2026-04-24.** Video embeds live on landing and features pages.

For the separate session working against `/mnt/s/Projects/websites/chartedroots.com`. Everything below is ready to port without any new authoring work here.

**Target repo:** `/mnt/s/Projects/websites/chartedroots.com` (Hugo + Blowfish theme, GitHub Pages via Actions).

**Files to change:** `content/_index.md` (landing) and `content/features/_index.md` (features).

**Landing page change** — add a "See it in action" section after the "Why Charted Roots?" block and before "Key Features". Use Blowfish's YouTube shortcode if available (`{{< youtube id="elQfn1fk1VQ" >}}`) or a plain iframe embed.

Suggested section copy (no voice-tell scrubbing needed, it's brief and factual):

```markdown
## See it in action

A two-minute overview of the core workflow: import a GEDCOM, generate a family tree, explore the chart, and open the map view.

{{< youtube id="elQfn1fk1VQ" >}}

Longer feature tour (~14 minutes, chaptered) on the [features page](/features/).
```

**Features page change** — add the full tour embed at the top of the page body, above the existing "Charted Roots provides a complete genealogical toolkit…" intro. Suggested:

```markdown
{{< youtube id="GnOHrG_nVvY" >}}

*~14-minute chaptered walkthrough. Jump to a chapter using the YouTube chapter markers, or use the links below.*
```

Below that, a Jump-to-chapter list (optional, can be added inline where each feature section lives). Chapter timestamps to use:

| Chapter | Timestamp (seconds) | Feature area |
|---|---|---|
| 1. Importing Data | 10 | GEDCOM / Gramps |
| 2. Person Notes & Dynamic Blocks | 71 | Dynamic content |
| 3. Interactive Family Chart | 105 | Family chart |
| 4. Maps & Journey Mode | 215 | Maps |
| 5. Calendar View | 289 | Calendar |
| 6. Creating a Family | 355 | Wizards |
| 7. Evidence & Sources | 407 | Sources |
| 8. Reports & Book Builder | 463 | Reports |
| 9. Statistics Dashboard | 523 | Statistics |
| 10. Place Lookup | 560 | Places |
| 11. Bases Integration | 606 | Bases |
| 12. World-Building | 652 | Worldbuilding |

Deep-link format: `https://www.youtube.com/watch?v=GnOHrG_nVvY&t=<seconds>s` — e.g., Chapter 7 is `&t=407s`. In markdown: `[▶ Jump to Evidence & Sources chapter](https://www.youtube.com/watch?v=GnOHrG_nVvY&t=407s)`.

**Blowfish-specific checks during port:**

- Confirm the theme exposes a `youtube` shortcode. If not, use a plain iframe with `loading="lazy"` and the standard YouTube embed URL (`https://www.youtube.com/embed/VIDEO_ID?start=SECONDS`).
- Test dark mode rendering; YouTube thumbnails can wash out on some themes.
- Run `hugo server -D` locally before deploying.

**Commit message for the website repo** (keep the no-AI-attribution rule):

```
content: Add video embeds to landing and features pages

Landing gets the 2-minute quick tour as a new "See it in action"
section. Features gets the 14-minute chaptered tour at the top with
a note about using chapter markers to jump to specific capabilities.
Videos existed on YouTube and were already linked from the README;
this surfaces them on the site.
```

**Not in this port** (comes later, once content drafts catch up): chapter deep-links embedded inside individual feature-section paragraphs, track-page video embeds (research-track and worldbuilding-track pages don't exist yet).

---

## Motion loops (GIF / WebM / MP4)

No motion content exists yet. Candidates below are for the eventual capture session.

### Format

**Prefer WebM or muted-autoplay MP4 over GIF** for anything over 3 seconds. File sizes are 5–10× smaller at higher quality, and modern browsers autoplay silent loops fine. GIF is still acceptable for sub-3-second micro-loops where the size difference is negligible. Treat "GIF" as shorthand for "short autoplay loop" and pick the actual format at capture time based on duration and color depth.

### Candidates (4–10 seconds each, silent)

- **Canvas tree generation** — select root person, click generate, watch the tree lay out. Pays off the "automated genealogical layout" claim more than any static shot can.
- **Time-slider scrubbing on the interactive map** — drag the slider across decades, markers pop in and out. The map comes alive only in motion.
- **Journey playback** — waypoint-by-waypoint through a person's life on the map. Short version; the full playback is on YouTube.
- **Family chart relationship edit** — drag a relationship line (or use the modal) and watch the chart update instantly. Demonstrates the bidirectional sync.
- **Merge wizard conflict resolution** — accepting one side of a field conflict, seeing the merged record update. Reads mundane in static, reads clearly in motion.
- **Web Clipper click-to-source** — click the browser extension, pick the Charted Roots template, see the source note appear in Obsidian. A two-app composite.
- **Highlight Groups on the family chart** — adding a group, watching cards dim and glow. One of the strongest recent visual additions.
- **Custom Relationships Overlay toggle** — toggling the overlay on, watching styled lines appear on top of the biological tree.

### Placement

Inline-embedded in the feature sections they demonstrate. Not in a standalone gallery. Motion loops work best where the reader is already reading about the feature.

### Capture priorities

If motion loops get produced, rank: canvas tree generation first (strongest wow per second), then time-slider map, then highlight groups or custom-relationship overlay. The rest are fills.

---

## Static screenshots

### Visualization

- **Canvas Tree layouts** — Standard, Compact, Timeline, Hourglass, plus a multi-generation tree.
- **Canvas Tree color schemes** — Sex, Generation, Collection, Monochrome variants on the same root + layout. The four `nodeColorScheme` options apply to the Canvas tree generator (and PDF/report exports), not to the live Family Chart View — the in-view chart is hardcoded to gender coloring. Plan to capture as a separate set of four shots so the website Canvas tree generation section can carry both axes (layout + scheme) on the same fixture.
- **Family Chart view** — live exploration with the Person Details panel open; default gender coloring (the only scheme the live view renders); optionally a different theme preset (Classic vs Muted / Vibrant / etc., picked via the palette icon) to show theme-color variety; optionally a still of the Highlight Groups feature mid-effect to complement the existing `cr-family-chart-highlight-groups.webm` motion capture.
- **Interactive map** — migration paths, heat maps, time-slider animation.
- **Entity Profile View** — one screenshot per entity type (person, place, event, source, organization).
- **Calendar View** — real-world and fictional calendar side by side.

### Research workflow

- **Web Clipper capture flow** — two-shot composite: the Obsidian Web Clipper modal with a Charted Roots template selected (Find a Grave Person or FamilySearch Source) on the left, the resulting source note in the vault with citation metadata already populated on the right. The shot that most concretely answers "why this over a plain browser bookmark?"
- **Source hierarchy display** — a parent-source profile showing its child-document rows. A census or register with multiple sub-sources works well as a realistic example.
- **Attribution on entities** — a person profile view showing per-fact source attribution (birth date linked to source A, marriage to source B). Demonstrates the `sourced_*` properties surfacing in the UI.
- **Data quality tools** — the merge wizard mid-flow, or the 14-step post-import cleanup wizard showing progress. One representative shot of the subsystem is enough; the rest belongs on the wiki.
- **Reports** — pedigree chart, family group sheet, source summary. A few more from the 17+ catalog if visual variety suggests it.

### Worldbuilding

- **Universe and fictional calendar** — a universe note with a linked custom calendar, plus an event in that universe showing a BBY/ABY date rendering correctly in the timeline. Anchors the worldbuilder coverage across the site.
- **Custom image maps** — a fictional-world map with waypoints, separate from the real-world interactive-map shot so each audience sees their use case represented.

### Data entry and organization

- **Edit Person modal** — relationships, dates, sources. Include the universe dropdown with a fictional universe selected.
- **Control Center** — Collections tab, Sources tab, Places tab, Events tab.
- **Book Builder** — one screenshot of a compiled narrative output.

---

## Capture session playbook

When a capture session is scheduled, this is the end-to-end plan. Written so it can be picked up months from now without re-reading the whole file.

### Approach and effort

**Approach A: full dedicated capture.** Not hybrid, not minimal. Aim for roughly 25–35 static screenshots plus 8 motion loops, covering every bullet in the "Static screenshots" and "Motion loops" sections above.

**Realistic effort: 5–8 hours of focused work.** Breaks down roughly as:
- ~10 minutes per screenshot (set up vault state, capture, crop, name, optimize) times 25–35 shots = 4–6 hours
- ~15 minutes per motion loop (setup, record, trim, convert, optimize) times 8 loops = 2 hours
- Plus 30–60 minutes for file organization, renaming, and site-wide embed placement

Plan a dedicated session. This isn't a lunch-break task.

### Prerequisites

Before starting:

- **Fixtures ready.** The existing demo-video fixtures cover everything:
  - Real-world: `gedcom-sample-medium-full.ged` (60 people, 23 families, 91 places).
  - Worldbuilding: `gedcom-dying-earth.ged` (15 characters) and `gedcom-gaean-reach.ged` (18 characters).
  - Use these for consistency with the video tour, so readers who've seen the video recognize the data.
- **Obsidian appearance settings locked.** Dark mode, Obsidian zoom at 110–120% for readability, close unused panels and sidebars, disable system and Obsidian notifications. Same as the video-capture checklist.
- **Window size consistent.** 1920×1080 is the video standard; matching it for stills keeps everything visually coherent.
- **Recording tool ready.** ScreenToGif or OBS for motion. Any OS screenshot tool works for stills; consistency matters more than the specific tool.

### Capture order (priority within the full session)

Capture high-leverage content first so partial completion still produces a useful set. Within each tier, order is flexible.

**Tier 1: motion loops with the most impact per second.**

1. Canvas tree generation (select root, click generate, tree lays out)
2. Highlight Groups on the family chart (add a group, cards dim and glow)
3. Time-slider scrubbing on the map (decades sweep through)

**Tier 2: static shots that showcase the most visually distinctive recent features.**

4. Entity Profile View — one shot per entity type (person, place, event, source, organization)
5. Custom Relationships Overlay — family chart with overlay lines active
6. Book Builder — one shot of a compiled PDF page

**Tier 3: the rest of the motion loop candidates.**

7. Journey playback (short version)
8. Family chart relationship edit (drag-to-edit with bidirectional sync)
9. Merge wizard conflict resolution
10. Web Clipper click-to-source (two-app composite)
11. Custom Relationships Overlay toggle (motion version)

**Tier 4: remaining static coverage.**

12. Canvas Tree layouts (Standard, Compact, Timeline, Hourglass, multi-generation)
13. Family Chart View color schemes (gender, generation, collection, monochrome)
14. Calendar View (real-world and fictional side by side)
15. Interactive map (migration paths, heat map, custom image map)
16. Web Clipper capture flow (two-shot composite)
17. Source hierarchy display
18. Attribution on entities (sourced_* in profile view)
19. Data quality tools (merge wizard or cleanup wizard)
20. Reports (pedigree, family group sheet, source summary)
21. Universe and fictional calendar
22. Custom image map (fictional-world focus)
23. Edit Person modal (with universe dropdown populated)
24. Control Center tabs (Collections, Sources, Places, Events)

**Tier 5: end-to-end workflow composite.**

25. Web clip → source note → attribution on a person note (three-shot composite). Plan this as a single sitting so the chain stays visually coherent.

If a session runs short, stop at a tier boundary rather than leaving Tier N half-done. Tier 1 alone is about an hour and ships the content the site is most visibly missing.

### Remaining captures — action plans

Step-by-step plans for the captures still TBD as of 2026-04-30. Use the checkboxes to track progress within a session. Each plan assumes the global prerequisites above (dark mode, 110–120% zoom, 1920×1080 window, fixtures loaded). Post-capture steps are common to all five plans; they're listed once at the end rather than repeated.

#### A. Book Builder compiled output (Tier 2, item 6)

**Target:** `cr-book-builder-output.png` — placement intent: Book Builder subsection on `/features/`.
**Fixture:** Andersons (real-world coherence with the existing genealogy captures); fall back to Royal Families if a multi-generation narrative reads better in the chosen output style.
**Note:** No `.book.json` exists in dev-vault yet — the fixture has to be created during the session.

- [x] Open Andersons fixture vault.
- [x] Open Book Builder modal via Control Center → Book Builder tab (or command palette).
- [x] Define a small book scoped to ~3–5 generations starting at William Anderson; pick a narrative style that reads well as a single page (default narrative style is fine for a first capture).
- [x] Save the book definition (`.book.json` lands in the configured books folder).
- [x] Trigger generation; wait for the compiled output (PDF or markdown depending on the chosen pipeline).
- [x] Open the compiled output in Obsidian's PDF viewer (or in the editor for markdown output).
- [x] Frame the capture on a representative page: opening narrative paragraph + a generation transition visible in the same viewport, so the reader sees both prose and structure.
- [x] Capture full Obsidian window (left ribbon + folder pane visible per the playbook's whole-feature convention).
- [x] Save raw at 1920×1080 to `docs/images/raw/cr-book-builder-output.png`.

#### B. Universe overview (Tier 4, item 21)

**Target:** `cr-universe-overview.png` — placement intent: Worldbuilding section on `/features/`, anchoring the worldbuilder coverage.
**Fixture:** Dying Earth (the simpler of the two worldbuilder fixtures; fictional dates render as `DE NNNN`).

Originally scoped as "Universe and fictional calendar" with the universe→calendar `default_calendar:` link visible in frontmatter as a load-bearing element. After capture, it became clear the rich data tables (People + Events with `DE NNNN` dates rendering across both) carry the worldbuilding claim more concretely than a Properties-block link would. Filename and framing simplified to "universe overview"; the calendar relationship is communicated implicitly by the date format. **Website copy preceding the embed will need a revision** so the prose matches what the visual actually shows (worldbuilding overview / universe-scoped people + events with fictional dates) rather than the original frame (universe note with linked custom calendar visible).

- [x] Open Dying Earth fixture vault.
- [x] Open `The Dying Earth.md` universe note.
- [x] Verify the `charted-roots-universe-people` and `charted-roots-universe-events` blocks populate (28 events with `universe: The Dying Earth` set, 17 people — both well-seeded after the 0.22.15 alias-aware lookup fix).
- [x] Two-pane split of the same universe note: left pane scrolled to the People (17) section, right pane scrolled to the Events (28) section. Both blocks render `DE NNNN` dates in their respective columns, making the fictional calendar's effect visible across two surfaces in one shot. The Marriage of Cugel and Derwe entry visible in the right pane gives narrative continuity with #501's verification fixtures.
- [x] Capture full Obsidian window.
- [x] Save raw to `docs/images/raw/cr-universe-overview.png` (432 KB; well under 500 KB cap, oxipng pass at deploy time will land it ~340 KB).

**Deferred:** if a future capture session wants to make the universe→calendar linkage explicit, a small follow-on shot of the universe note's frontmatter Properties block expanded with `default_calendar:` visible would pair with this one. Not blocking; this single composite ships standalone.

#### C. Edit Person modal (Tier 4, item 23)

**Target:** `cr-edit-person-modal.png` — placement intent: Data entry and organization section on `/features/`.
**Fixture:** Dying Earth — populates the universe dropdown with a fictional value, which is the visual differentiator the brief asks for ("with universe dropdown populated"). Andersons works too if the worldbuilding angle is already covered nearby.

- [ ] Open Dying Earth fixture vault.
- [ ] Open a person note that has rich relationships, dates, and at least one source attached (Cugel the Clever has marriages + birth date + sources after the recent fixture work).
- [ ] Right-click the person → Charted Roots → Edit person.
- [ ] Verify all populated regions render: relationships section (parents / spouses / children), dates section, sources section.
- [ ] Scroll to the Universe dropdown; confirm it shows `The Dying Earth` (post-#505 fix this should now reflect the universe note's typed name even if a rename has happened).
- [ ] Frame the capture so relationships + dates + sources + universe dropdown are all visible in one viewport. If the modal is too tall, prioritize the relationships block + universe dropdown over the description / notes fields.
- [ ] Capture the modal-only region (tight crop per the playbook's modal convention) — left ribbon and folder pane can be cropped out to keep visual focus.
- [ ] Save raw to `docs/images/raw/cr-edit-person-modal.png`.

#### D. Control Center tabs (Tier 4, item 24)

**Targets:** `cr-control-center-collections.png`, `cr-control-center-sources.png`, `cr-control-center-places.png`, `cr-control-center-events.png` — placement intent: Data entry and organization section, 2×2 grid (reuse `.cr-grid-2` × 2 rows or introduce `.cr-grid-2x2`).
**Fixture:** Andersons — has the most populated cross-tab data (collections like `blood` / `married_in`, sources from the seeded citations work, places from the imported GEDCOM, events including the `cr-entity-profile-event.png` marriage).

- [ ] Open Andersons fixture vault.
- [ ] Open Control Center via command palette or ribbon icon.

For each of Collections / Sources / Places / Events:

- [ ] Switch to the tab.
- [ ] Verify the tab is in browse / list mode (not a sub-modal flow). Default landing state is fine.
- [ ] Confirm the visible row count is meaningful — at least 5 rows so the list shape reads, ideally 8–12 to convey realistic vault size without scrolling. Adjust filters if needed to surface representative content.
- [ ] Frame the capture on the modal pane (tab strip + content area visible). Crop out the rest of the Obsidian window since Control Center is a self-contained modal surface.
- [ ] Capture and save to `docs/images/raw/cr-control-center-<tab>.png`.

Style note: keep the same Control Center modal width and tab strip position across all four shots so the 2×2 grid reads as a series rather than four loose stills.

#### E. Tier 5 end-to-end composite (item 25)

**Targets:** `cr-workflow-clip.png`, `cr-workflow-source-note.png`, `cr-workflow-attribution.png` — placement intent: standalone three-shot row in the Research workflow / Evidence and sources subsection. Three-shot composite told as a left-to-right narrative.
**Fixture:** Andersons (consistent with the existing Web Clipper / Source hierarchy / Attribution captures). Public-domain biography target: any Find a Grave or Wikipedia page that fits the genealogy use case (Charles Hoy Fort already used in `cr-web-clipper-to-bio.webm`).

This composite intentionally ports captures #16 / #17 / #18 from earlier tiers into a single sitting so the visual chain is internally coherent. The three individual captures already exist (`cr-web-clipper-modal.webp`, sources work in `cr-source-hierarchy.png`, attribution in `cr-entity-attribution.png`), but the composite needs them captured *as a single workflow*: same browser tab → same staged note → same person note. Tier 5 is the "do this in one sitting" step.

**Stage 1 — Browser-side clip:**

- [ ] Open the chosen biography page in the browser.
- [ ] Click the Obsidian Web Clipper extension; select the Find a Grave Person template.
- [ ] Confirm the clipper preview pane shows structured fields (name, dates, places, sources).
- [ ] Capture the browser window with the clipper modal expanded over it; full screen including the page underneath so the reader sees both surfaces.
- [ ] Save raw to `docs/images/raw/cr-workflow-clip.png`.
- [ ] Click "Save" in the clipper to push the structured note to the Obsidian Staging folder.

**Stage 2 — Source note in vault:**

- [ ] Switch to Obsidian; open `Charted Roots/Staging/<just-clipped-note>.md`.
- [ ] Verify the frontmatter properties expanded — name, birth date, death date, places, sources URLs from the clip.
- [ ] Convert the staging note to a `cr_type: source` note (use the cleanup wizard's source-promotion step or manually add `cr_type: source` to the frontmatter).
- [ ] Confirm the note now renders in the Source hierarchy view with the clipped fields preserved.
- [ ] Capture the Obsidian window with the converted source note open + frontmatter properties expanded.
- [ ] Save raw to `docs/images/raw/cr-workflow-source-note.png`.

**Stage 3 — Attribution on the person note:**

- [ ] Open the person note that the clipped source documents (or create one matching the cited individual).
- [ ] Use the per-fact attribution UI (Edit Person → relationships / dates → attach source) to wire the clipped source to one or more facts on the person note.
- [ ] Open the person's Entity Profile View; verify the Citations section shows the clipped source grouping at least one fact, and the Data quality section reflects the new attribution.
- [ ] Capture the Entity Profile View with Citations + Data quality both visible in the viewport (similar framing to `cr-entity-attribution.png` but with the freshly-clipped source).
- [ ] Save raw to `docs/images/raw/cr-workflow-attribution.png`.

#### Common post-capture steps

Apply to every capture above. Mark off as the file moves through the pipeline.

- [ ] Run `oxipng -o 4` on the raw PNG.
- [ ] If the optimized PNG is over 500 KB, fall through to `cwebp -q 85` and ship as `.webp`.
- [ ] Verify final size sits under the 500 KB-per-static cap.
- [ ] Place the optimized version in the website repo at `static/img/cr-<feature>.<ext>`.
- [ ] Add the inline embed to the appropriate features-page section (raw `<img>` tag or `.cr-grid-2` figure block per the file organization conventions above).
- [ ] If the embed needs a caption, draft one in 3–8 words that names what the reader is looking at without restating prose around it.
- [ ] Update this document: move the capture from the action-plan section above to the "Static captures deployed" log below, with the date and on-site file size.
- [ ] Commit the raw to the plugin repo (`docs/images/raw/`) as a separate commit from the website port.

### Style consistency

- **Match the existing video tour's visual style** (dark mode, Obsidian zoom 110–120%, no spurious UI chrome).
- **Use the same fixture for the same feature across media types.** The canvas tree generation motion loop should start from a tree that looks like the Canvas Tree static shot, so the eye recognizes the continuity.
- **Include at least one genealogy-vs-worldbuilding pair.** The Canvas Tree layouts section is a natural spot: one real-family tree and one fictional-family tree, same layout, side by side. Reinforces the two-audience framing without extra prose.
- **For worldbuilding shots**, use a recognizable-enough fictional universe that readers catch the reference without distraction. The existing video tour uses Dying Earth and Gaean Reach fixtures, which should be reused for coherence.
- **Web Clipper shots should avoid AI-specific framing.** Prefer the CSS-variant template over the LLM variant for the screenshot unless the feature specifically benefits from showing structured extraction. Keeps the site's visible surface focused on the capture-to-source workflow.

### File organization

**Location:**

- **Website repo** (`static/img/` in `/mnt/s/Projects/websites/chartedroots.com/`): optimized, site-ready versions. Use `static/` (not `assets/`) for binary files referenced from raw-HTML embeds in markdown — Hugo doesn't auto-publish `assets/` files unless they're processed via `resources.Get` in a template, and raw `<video>` / `<img>` tags in markdown bypass that pipeline. `assets/` is reserved for things that go through Hugo Pipes (resize, fingerprint, etc.). Discovered during the Phase 1 deploy test run (2026-04-25).
- **Plugin repo** (`docs/images/raw/`): raw captures at full resolution. Serves as the archival source. If site assets ever need to be regenerated at different sizes, the originals live here.

**Naming convention:** `cr-<feature>-<variant>.<ext>`

Examples:

- `cr-canvas-tree-standard.png`
- `cr-canvas-tree-compact.png`
- `cr-canvas-tree-timeline.png`
- `cr-canvas-tree-hourglass.png`
- `cr-family-chart-highlight-groups.webm`
- `cr-custom-relationships-overlay.png`
- `cr-entity-profile-person.png`
- `cr-entity-profile-place.png`
- `cr-calendar-view-realworld.png`
- `cr-calendar-view-fictional.png`
- `cr-book-builder-output.png`
- `cr-map-time-slider.webm`

Scannable prefix (`cr-`), feature name, variant where relevant. Lowercase, hyphens between words, no underscores.

**Format:**

- **Static**: PNG for UI shots (crisp text). JPEG only for photographic content if any is ever needed.
- **Motion**: WebM preferred (smallest files, modern-browser autoplay). MP4 fallback if a target can't play WebM. GIF only for sub-3-second micro-loops where the size difference is negligible.
- **Size targets**: 500 KB or less per static screenshot after optimization; 5 MB or less per motion loop. Run through an optimizer (ImageOptim, squoosh.app, or equivalent) before committing to the website repo.

**Static capture conventions:**

- **Capture resolution.** 1920×1080 source. Full Obsidian window with default sidebar widths so feature shots all look like they came from the same setup.
- **Display width.** Optimize at the natural width up to ~1280px; embeds rely on CSS `max-width: 100%` for responsive scaling. Don't hand-resize below 1280 — browsers downscale crisply, but can't recover detail you've already thrown away.
- **Theme.** Default Obsidian dark theme across all captures. Consistency across the set matters more than which theme; mixing themes makes the set look inconsistent.
- **Window chrome.** Keep the left ribbon and one folder pane visible for whole-feature shots — users need visual anchors to know what they're looking at. Crop tight (modal-only or panel-only) for detail shots where the surrounding context isn't part of the feature.
- **Annotations.** No in-image arrows, callouts, or text overlays. Captions and prose around the embed carry the explanation. Keeps captures durable if UI shifts.
- **PNG optimization.** `oxipng` or `pngquant` lossless first; quantize to 256 colors only if the lossless pass doesn't hit 500 KB. Most UI-only captures clear the cap losslessly.
- **WebP alternative.** Optional for the rare shot where lossless PNG won't fit. Name `cr-<feature>.webp`; embed the same way as PNG.
- **Fixture data only.** Use the dev-vault fixture (Andersons, Schmidts, Star Wars, etc.). Never capture from a personal vault — easy to leak names, dates, or places without noticing.

**Embedding:** place the file in `static/img/` on the website repo, reference from markdown as `![Alt text](/img/cr-feature-variant.png)` or via Blowfish's image shortcode if it handles responsive sizing better. Motion loops use a plain `<video>` tag with the lazy-play attributes shipped 2026-04-27 — Blowfish's `{{< video >}}` shortcode exists but defaults to `controls=true` and lacks `aria-label` support, so raw HTML is the cleaner path until a project-level `{{< motion >}}` shortcode is added (see "Future" section below). Canonical pattern:

```html
<video muted loop playsinline preload="none" data-cr-lazy-src="/img/cr-feature-variant.webm" aria-label="<short factual description>"></video>
```

The `data-cr-lazy-src` attribute is consumed by `/static/js/cr-lazy-video.js`, an `IntersectionObserver` script wired into every page via `layouts/partials/extend-head.html`. When a `<video>` scrolls within ~200px of the viewport, the observer swaps `data-cr-lazy-src` into `src`, sets `autoplay = true`, and calls `.load()` — visible behavior identical to the previous autoplay-on-load pattern, but no full-file fetch happens before the user scrolls into range. Browsers without `IntersectionObserver` support fall back to eagerly loading every video on page load, matching pre-migration behavior.

`markup.goldmark.renderer.unsafe = true` is already set in `hugo.toml`, so raw HTML in markdown passes through untouched. CSS scoping for these embeds is keyed to `article video` so it only affects content-area videos, not anything Blowfish might render in chrome.

### After the session

1. Batch-optimize files locally (ImageOptim / squoosh / ffmpeg for WebM).
2. Commit raw captures to the plugin repo's `docs/images/raw/` as a separate commit from the website port.
3. Commit optimized versions to the website repo's `static/img/`.
4. Add inline embeds to features, research-track, worldbuilding-track, and landing pages where each visual fits the narrative.
5. Update this document to mark the capture as ✅ Complete with the date.

---

## Motion captures deployed

Running log of motion files live on the chartedroots.com features page. New deploys append below; legacy `Phase 1 motion deployment` was the original batch test run on 2026-04-25.

**Phase 1 batch (2026-04-25):**

- ✅ `cr-canvas-tree-generation.webm` — Canvas tree generation section
- ✅ `cr-family-chart-relationship-edit.webm` — Interactive Family Chart View subsection
- ✅ `cr-interactive-map-time.webm` — Geographic features → Interactive Map View subsection
- ✅ `cr-interactive-map-journey.webm` — Geographic features → Journey Mode subsection
- ✅ `cr-merge-wizard-conflict-res.webm` — Data Quality Tools subsection

Phase 1 total payload: ~8.7 MB on the features page. All five autoplay-on-visit on first load — see "Bandwidth" under Future below for the deferred follow-up.

**Continuation deploys (2026-04-25):**

- ✅ `cr-web-clipper-to-bio.webm` — Evidence and sources → Web Clipper integration subsection. Demonstrates the Wikipedia Biography (Basic) template clipping a biography page (Charles Fort) and the resulting source note appearing in the Obsidian Staging folder. ~1.05 MB; brings the features page motion total to ~9.75 MB across 6 captures — still well under the ~15-20 MB threshold where `IntersectionObserver` lazy-play would become a priority.

- ✅ `cr-family-chart-highlight-groups.webm` — Workspace views → Interactive Family Chart View subsection. ~639 KB. Demonstrates adding two highlight groups (Collection = blood, then Collection = married_in) on the Family Chart View and watching cards dim and glow as the matching subsets light up in different colors. Brings the features page motion total to ~10.4 MB across 7 captures.

- ✅ `cr-custom-relationships-overlay.webm` — Custom Relationships section (2026-04-27). 293 KB on-site, 299 KB raw — smallest motion file in the deployed set. Demonstrates the post-#450 paint-on-top behavior: overlay arcs draw on top of the biological tree by default. Anderson family fixture with William Anderson + three custom relationship types active (Mentor → Daniel Cooper, Best friend → David Martinez, Business partner → James Johnson); toggle action shows the overlay layering. Originally queued in the 2026-04-25 Phase 1 motion candidates list and deferred until #450 shipped + a real-world testing pass confirmed the visual reads cleanly; both preconditions met. Closes the visualization-track motion captures from the v1 media-plan queue. Eighth motion file in the deployed set.

---

## Static captures completed

Running log of static screenshots captured and tracked in the plugin repo at full resolution. Captured here = ready for the website session to optimize (oxipng / pngquant) and deploy to `static/img/` on chartedroots.com.

**Canvas tree layouts (2026-04-25):**

- ✅ `cr-canvas-tree-standard.png` (~305 KB) — Canvas tree generation section, layout grid (Standard).
- ✅ `cr-canvas-tree-compact.png` (~311 KB) — Canvas tree generation section, layout grid (Compact).
- ✅ `cr-canvas-tree-timeline.png` (~355 KB) — Canvas tree generation section, layout grid (Timeline).
- ✅ `cr-canvas-tree-hourglass.png` (~293 KB) — Canvas tree generation section, layout grid (Hourglass).
- ✅ `cr-canvas-tree-multi-generational.png` (~360 KB) — Canvas tree generation section, hero shot above the bullet list.

Anderson family fixture for the four layouts (matching the `cr-canvas-tree-generation.webm` motion loop already shipped). Royal-families-in-Europe GEDCOM imported into a throwaway vault for the multi-generational hero so the dev-vault's curated demo fixtures stayed intact. Total ~1.6 MB pre-optimization; all five already under the 500 KB-per-static cap. Placement intent: hero shot above the bullet list in the Canvas tree generation section, four layouts as a 2×2 grid below the bullet list.

**Family Chart view (2026-04-26):**

- ✅ `cr-family-chart-live.png` (~272 KB) — Interactive Family Chart View section, hero shot. William Anderson selected; Person Details panel open on the right showing first name / last name / alt name / pronouns / birth+death dates and places / sex / collection / spouses / children. Shows the chart "in use" rather than at rest.
- ✅ `cr-family-chart-gender.png` (~209 KB) — Default coloring (the only scheme the live view renders). Same root, same zoom; no panel. Pairs visually with the theme variant for "same data, different palette."
- ✅ `cr-family-chart-theme-earth-tones.png` (~209 KB) — Theme preset variant via the palette icon. Greens for male / reds for female, replacing the default teal / pink palette. Demonstrates the Theme menu's color-value variation.
- ✅ `cr-family-chart-highlight-groups.png` (~268 KB) — Highlight Groups feature mid-effect. Two groups active (matches the `cr-family-chart-highlight-groups.webm` motion capture's Collection = blood + Collection = married_in setup). Most cards dimmed; matching cards glow with each group's accent color. Static counterpart to the motion file.

Anderson family fixture across all four; same root (William Anderson) and same zoom level for visual coherence. Total ~960 KB pre-optimization; all four under the 500 KB-per-static cap losslessly. Placement intent: hero shot above the bullet list in the Interactive Family Chart View section; default gender + theme variant as a 2-up pair below the bullet list; highlight-groups still alongside or just above the existing `cr-family-chart-highlight-groups.webm` motion embed.

The original media-plan entry mentioned color schemes (gender / generation / collection / monochrome). After investigating the live view's rendering path, those four schemes apply only to the Canvas tree generator and PDF/report exports — the live Family Chart View is hardcoded to gender coloring. Entry reframed accordingly. Canvas Tree color schemes remain on the to-capture list as a separate four-shot set.

**Canvas Tree color schemes (2026-04-26):**

- ✅ `cr-canvas-tree-color-sex.png` (~312 KB) — Canvas tree generation section, color-scheme grid (Sex). Default coloring: distinct color for male and female cards.
- ✅ `cr-canvas-tree-color-generation.png` (~311 KB) — Color-scheme grid (Generation). Color bands per generation level — visually distinct row colors top-to-bottom.
- ✅ `cr-canvas-tree-color-collection.png` (~302 KB) — Color-scheme grid (Collection). Per-collection coloring; the Anderson fixture is mostly `blood` with a small `married_in` cluster, so the visible differentiation is subtle (most cards in one color with a small patch in another). Captures the feature accurately even if the demo data doesn't show off variety strongly. Worth a caption nuance on the website to set expectation that the per-collection colors scale with how varied the user's collections are.
- ✅ `cr-canvas-tree-color-monochrome.png` (~302 KB) — Color-scheme grid (Monochrome). All cards in one neutral color; print-friendly variant.

Anderson family fixture, William Anderson root, Standard layout, same canvas viewport across all four for visual coherence. Total ~1.2 MB pre-optimization; all four under the 500 KB-per-static cap losslessly. Placement intent: a **second 2×2 grid** in the Canvas tree generation section on the website features page, below the existing layouts grid. Top grid varies layout (Standard / Compact / Timeline / Hourglass); bottom grid varies color scheme (Sex / Generation / Collection / Monochrome). Captioned "Color schemes" or similar.

## Static captures deployed

Running log of static files live on the chartedroots.com features page. Mirrors the "Motion captures deployed" pattern; new deploys append below.

**Canvas tree layouts (2026-04-25):**

- ✅ `cr-canvas-tree-multi-generational.png` (287 KB) — Canvas tree generation section, hero above the bullet list.
- ✅ `cr-canvas-tree-standard.png` (222 KB) — Canvas tree generation section, layout grid (Standard).
- ✅ `cr-canvas-tree-compact.png` (229 KB) — Canvas tree generation section, layout grid (Compact).
- ✅ `cr-canvas-tree-timeline.png` (260 KB) — Canvas tree generation section, layout grid (Timeline).
- ✅ `cr-canvas-tree-hourglass.png` (212 KB) — Canvas tree generation section, layout grid (Hourglass).

`oxipng -o 4` lossless pass on each PNG before deploy yielded 20–27% reductions across the set. Total deployed payload: ~1.21 MB across five files (down from ~1.6 MB pre-optimization). All five sit comfortably under the 500 KB-per-static cap. Implemented as raw HTML `<figure>` for the hero and a `.cr-grid-2` CSS grid wrapping four captioned figures; mobile breakpoint at 700px collapses the grid to a single column. Existing `cr-canvas-tree-generation.webm` motion loop preserved between the bullets and the new layout grid.

**Family Chart view (2026-04-26):**

- ✅ `cr-family-chart-live.png` (193 KB) — Interactive Family Chart View section, hero above the bullet list. William Anderson selected with the Person Details panel open.
- ✅ `cr-family-chart-gender.png` (158 KB) — 2-up palette pair below the bullets (left), captioned "Default gender coloring".
- ✅ `cr-family-chart-theme-earth-tones.png` (158 KB) — 2-up palette pair below the bullets (right), captioned "Earth tones theme preset".
- ✅ `cr-family-chart-highlight-groups.png` (206 KB) — Captioned still ("Two highlight groups active") between the `cr-family-chart-relationship-edit.webm` and `cr-family-chart-highlight-groups.webm` motion embeds. Acts as the freeze-frame counterpart to the highlight-groups motion.

`oxipng -o 4` yielded 21–28% reductions across the four files. Total deployed payload: ~715 KB (down from ~958 KB pre-optimization). All four under the 500 KB-per-static cap. Reused the `.cr-grid-2` CSS class from the Canvas tree port — no new CSS needed. Section order after the port: lead → hero → bullets → 2-up palette grid → relationship-edit motion → highlight-groups still → highlight-groups motion → wiki link.

**Canvas Tree color schemes (2026-04-26):**

- ✅ `cr-canvas-tree-color-sex.png` (222 KB) — Canvas tree generation section, color-scheme grid (Sex). Default coloring.
- ✅ `cr-canvas-tree-color-generation.png` (220 KB) — Color-scheme grid (Generation). Color bands per generation level.
- ✅ `cr-canvas-tree-color-collection.png` (214 KB) — Color-scheme grid (Collection). Per-collection coloring; subtle on the Anderson fixture by design.
- ✅ `cr-canvas-tree-color-monochrome.png` (213 KB) — Color-scheme grid (Monochrome). Print-friendly variant.

`oxipng -o 4` yielded a consistent ~27% reduction across the four files. Total deployed payload: ~870 KB (down from ~1.23 MB pre-optimization). All four under the 500 KB-per-static cap. Placed as a second `.cr-grid-2` 2×2 grid below the existing layouts grid in the Canvas tree generation section. One-line italic bridge above the new grid frames the relationship to the layouts grid above ("Color schemes layer on top of layouts; any layout above pairs with any scheme below"). Short caveat paragraph below the grid sets expectation for the Collection shot — the Anderson fixture has limited collection variety, so the per-collection differentiation is subtle here; vaults that span maternal/paternal lines, immigration cohorts, or household groups see richer color variety. Caveat sits below the grid rather than as an extended figcaption, preserving 1-word caption parallelism with the layouts grid above. Section order after the port: lead → hero → bullets → motion → layouts grid → color-schemes grid → wiki link. Features page combined motion + static lifts to ~13.2 MB.

**Interactive Map (2026-04-26):**

- ✅ `cr-map-migration-paths.webp` (120 KB) — Interactive Map View, hero above bullets. William Anderson focal-mode arc from Boston → Miami with rich birth marker popup.
- ✅ `cr-map-heat.webp` (111 KB) — Interactive Map View, 2-up grid below time-slider motion (left). Continental zoom showing density across the US east.
- ✅ `cr-map-marker-popup.png` (240 KB) — Interactive Map View, 2-up grid (right). Tight crop on the standard marker popup demonstrating the date-range + age annotation.
- ✅ `cr-map-journey-playback.webp` (215 KB) — Journey Mode, 2-up grid (left). Rich waypoint popup mid-playback at William's Philadelphia occupation.
- ✅ `cr-map-family-journey-overlay.webp` (115 KB) — Journey Mode, 2-up grid (right). William focal + family-overlay toggle on; spouse and children paths color-coded.
- ✅ `cr-map-custom-image.webp` (336 KB) — Custom Image Maps, 2-up grid (left). The Dying Earth fixture, hand-drawn fantasy basemap.
- ✅ `cr-map-drilldown-breadcrumbs.webp` (392 KB) — Custom Image Maps, 2-up grid (right). River Scaum child map with breadcrumb back to parent.

Mixed PNG / WebP path on this batch. `oxipng -o 4` was run first on all three brief-flagged PNG candidates (migration-paths, heat, marker-popup); only marker-popup landed under the 500 KB cap (244 KB → 240 KB) and shipped as PNG. Migration-paths and heat fell through to `cwebp -q 85` after exceeding the cap (654 KB and 570 KB respectively). The remaining four files (journey-playback, family-overlay, custom-image, drilldown-breadcrumbs) went through `cwebp -q 85` directly per the brief's WebP-path designation; all four landed comfortably under cap with 84–88% reduction from source PNGs. Total deployed payload: ~1.5 MB across seven files (down from ~9.1 MB pre-optimization). Reused the `.cr-grid-2` CSS class — no new CSS. Features page combined motion + static lifts from ~13.2 MB to ~14.7 MB. **Lazy-play decision: path (a) — shipped now, IntersectionObserver-based lazy-play is the firm gate before any further capture deploy** (Entity Profile is queued at 5 shots, Calendar at 2; either would push the page over the 15 MB threshold without lazy-play in place).

**Site infrastructure: lazy-play `IntersectionObserver` (2026-04-27):**

Migrated the canonical motion-embed pattern (above) and all existing motion embeds on `/features/` to deferred-load via `IntersectionObserver`. First-load page weight on the features page no longer scales with the motion library — videos fetch only when scrolled within ~200px of the viewport, then autoplay as soon as enough buffer is available. Project-level observer script in `static/js/cr-lazy-video.js`, wired through `layouts/partials/extend-head.html` (Blowfish's project hook for head injections). Graceful fallback for browsers without `IntersectionObserver` support: every video loads eagerly, matching pre-migration behavior. One-shot observer (`unobserve` after first intersect) so re-scrolling doesn't re-fetch.

The seven existing motion embeds were migrated via a mechanical find-replace on the prefix; `cr-canvas-tree-generation.webm`, `cr-family-chart-relationship-edit.webm`, `cr-family-chart-highlight-groups.webm`, `cr-interactive-map-time.webm`, `cr-interactive-map-journey.webm`, `cr-merge-wizard-conflict-res.webm`, `cr-web-clipper-to-bio.webm` all carry the new `data-cr-lazy-src` shape. Unblocks the Entity Profile capture batch and the queued Calendar View / Custom Relationships Overlay batches.

**Entity Profile View (2026-04-27):**

- ✅ `cr-entity-profile-person.png` (426 KB) — Workspace Views → Entity Profile View, hero above the bullet list. William Anderson with relationships and events sections populated.
- ✅ `cr-entity-profile-place.png` (468 KB) — 2x2 grid below the bullets (top-left). Atlanta Fulton County with map preview, events at location, and the seeded sources section.
- ✅ `cr-entity-profile-event.png` (226 KB) — 2x2 grid (top-right). Marriage of William Anderson and Margaret O'Brien with participants populated.
- ✅ `cr-entity-profile-source.png` (258 KB) — 2x2 grid (bottom-left). 1950 US Federal Census with referenced facts grouped by entity.
- ✅ `cr-entity-profile-organization.png` (272 KB) — 2x2 grid (bottom-right). Inter-World Police Coordinating Company (Gaean Reach fixture) with members, events, and sources sections; demonstrates the worldbuilding angle inside an otherwise Andersons-fixture batch.

`oxipng -o 4` yielded 18–30% reductions across the five files; all five landed under the 500 KB cap losslessly, no fallthrough to `pngquant` or `cwebp`. Total deployed payload: ~1.65 MB across five files (down from ~2.20 MB pre-optimization). Reused the `.cr-grid-2` CSS class for the 2x2 grid below the hero — no new CSS. Statics ship as plain `<img>` per the prior decision; lazy-play applies to videos only since images cache well already.

Combined motion + static features-page payload after this batch is ~16.5 MB raw, but the prior commit's lazy-play rollout means first-load weight is now bounded by HTML + CSS + JS + statics regardless of the motion library size. Calendar View (2 shots) and the Custom Relationships Overlay motion capture are now unblocked.

**Calendar View (2026-04-27):**

- ✅ `cr-calendar-view-realworld.png` (164 KB) — Workspace Views → Calendar View, 2-up grid (left). Anderson family fixture at June 1928. Multiple event-type dots visible (yellow marriages, blue births); day-click detail panel open on William + Margaret's marriage.
- ✅ `cr-calendar-view-fictional.png` (178 KB) — 2-up grid (right). Gaean Reach fixture at April 1499. Day-click detail panel open on April 8 showing Mount Pleasant Massacre context (Donn Gersen + Elsa Gersen deaths plus Helen Henderson's birth via anniversary aggregation).

`oxipng -o 4` lossless pass on both files yielded 20–21% reductions; both well under the 500 KB cap (164 KB and 178 KB on-site, ~342 KB total). Reused the `.cr-grid-2` class — no new CSS. Closes the visualization-track captures called out in the media-plan queue. Custom Relationships Overlay motion capture is the only remaining queued visualization item.

**Web Clipper capture flow (2026-04-27):**

- ✅ `cr-web-clipper-modal.webp` (184 KB) — Workspace Views → Evidence and sources → Web Clipper integration, 2-up grid (left). Browser-side clip action on a Find a Grave page (Charles Hoy Fort, public-domain figure) with the `findagrave-person` template extracting structured fields into the clipper modal's preview.
- ✅ `cr-web-clipper-staging-note.png` (193 KB) — 2-up grid (right). Obsidian-side resulting note in the `Charted Roots/Staging/` folder; properties expanded showing 10 frontmatter fields preserved from the clip; body rendered with Vital Information section.

First two-app composite in the capture program. Pairs the trigger (browser) with the result (Obsidian Staging) to answer "why this over a plain browser bookmark?" The complementary `cr-web-clipper-to-bio.webm` motion (Wikipedia variant, deployed 2026-04-25) sits above this grid in the same subsection — together they show the Wikipedia variant in motion plus the Find a Grave variant as before/after composite. Caveat sentence appended below the grid framing the staged-vs-plugin-source-note distinction (the staged note is intentionally NOT a `cr_type:source` note; it's a structured-capture candidate awaiting user import).

Mixed PNG / WebP path on this batch. Modal shot was 881 KB raw; `oxipng -o 4` left it at 777 KB (12% reduction, still over cap), fell through to `cwebp -q 85` for 79% reduction down to 184 KB. Staging-note shot was 267 KB raw; `oxipng -o 4` got it to 193 KB (28% reduction, comfortably under cap), shipped as PNG. Total batch payload: ~377 KB across two files. Reused the `.cr-grid-2` class — no new CSS.

**Source hierarchy display (2026-04-28):**

- ✅ `cr-source-hierarchy.png` (308 KB) — Evidence and sources, single-shot figure. Probate Packet for Charles Henderson (1988) parent source profile in the Entity Profile View. Both `Child documents` (3 rows: Letters of Administration / Estate Inventory / Last Will and Testament, each with date + legal source-type badge) and `Source tree` sections expanded so the parent → indented-children structure reads in one glance.

Fixture (Probate Packet + 3 children) was already seeded for #338's Phase 1 work; no new fixture needed. Properties block in the center note collapsed so the right Profile View pane carries the visual weight; user-authored `## Child Documents` wikilink list visible in the body reinforces the plugin's structured rendering on the right. Placement intent: Evidence and sources subsection alongside the Web Clipper composite.

**Attribution on entities (2026-04-28):**

- ✅ `cr-entity-attribution.png` (416 KB) — Evidence and sources, single-shot figure. William Anderson person profile with `Citations` section expanded showing two source groupings (Family Bible: Birth Date with `Secondary evidence` badge + page locator; 1950 US Federal Census: Residence / Occupation / Spouse with `Primary evidence` badges), plus `Data quality` section showing `44% (4/9 facts)` source coverage with per-fact status breakdown.

Fixture seeding for the dev-vault throwaway: created 4 citation notes in `Charted Roots/Citations/` (one per cited fact) and added `sourced_birth_date: [[Family Bible]]` to William Anderson's frontmatter so Data quality coverage stays internally consistent with the citation count. Pairs with `cr-entity-profile-source.png` from the Entity Profile batch (the source-side Referenced Facts surface) — reader sees both directions of the citation graph. The 522 KB raw came in just over the 500 KB cap, but `oxipng -o 4` brought it to 416 KB on the lossless pass — comfortably under cap, shipped as PNG, no WebP fallthrough needed.

**Cleanup wizard (2026-04-28):**

- ✅ `cr-cleanup-wizard.png` (136 KB) — Data quality tools, single-shot figure. Post-Import Cleanup Wizard overview showing the 14-step tile grid (5×5×4 layout) with mixed badge state: Quality Report `2780 fixes` (focused, purple-bordered), Dates `110 fixes`, Orphans `14 fixes`, Place Names `1 fix`, Geocode + Hierarchy with `Has deps` link icons, plus several `0 issues` empties. Footer (`Close` / `Skip All & Exit` / `▶ Start Cleanup`) visible.

Captured on a throwaway vault with the Royal Families in Europe GEDCOM imported — same fixture pattern as `cr-canvas-tree-multi-generational.png`, preserves the curated dev-vault fixtures while showing realistic-volume issue counts. Pure post-pre-scan state, no steps run; the diagnostic counts tell the "look at what the wizard found" story without needing in-progress badges. Smallest research-track payload at 164 KB raw.

**Reports (2026-04-28):**

- ✅ `cr-report-pedigree-tree.png` (206 KB) — Reports, gallery shot 1 of 3. Pedigree tree PDF for Queen Victoria from the Royal Families fixture, rendered in Obsidian's PDF viewer. Four generations populated (Victoria → Frederick III + Victoria Adelaide → 4 grandparents → 8 great-great-grandparents) with sex-coded boxes (teal male, rose female), avatar circles, names + birth dates, and parent-child line connections. Page indicator `2 of 4`.
- ✅ `cr-report-family-group-sheet.png` (217 KB) — Reports, gallery shot 2 of 3. Family Group Sheet PDF for William Anderson + Margaret O'Brien on the dev-vault fixture. Tabular layout with HUSBAND / WIFE / MARRIAGE / CHILDREN sections; full vitals + occupation per spouse, marriage date, children table starting with Robert Anderson visible at the cut.
- ✅ `cr-report-source-summary.png` (197 KB) — Reports, gallery shot 3 of 3. Source Summary PDF for William Anderson on the dev-vault fixture. Summary block (Total sources / Primary / Secondary / Derivative / Unsourced facts counts) followed by `SOURCES BY FACT` table grouping Birth date (Family Bible) + Spouse / Occupation / Residence (1950 US Federal Census) with type and quality columns. Page indicator `1 of 2`.

Three-shot gallery covers graphical + tabular + textual report-output modes for visual variety per the brief. A 4th `cr-report-fan-chart.png` capture was attempted but the `fan-chart-pdf` renderer falls through to an ancestor pedigree tree (registered in the catalog UI but with no fan-specific layout downstream — filed as #492); fan chart dropped from the gallery. Source summary pairs cleanly with `cr-entity-attribution.png`: same fact-attribution data, two surfaces (interactive workspace view + portable PDF). Gallery sits in the Statistics and reports → Report Types (17+) subsection on the features page, hosted by a new `.cr-grid-3` CSS class (sibling to `.cr-grid-2`, same 700px collapse breakpoint).

Research-track batch totals: `oxipng -o 4` on all six raws yielded ~22% mean reduction (1.80 MB → 1.41 MB). All files landed under the 500 KB cap on the lossless pass — no WebP fallthrough needed for any shot in the batch (Attribution was the only candidate; came in at 416 KB). Total on-site payload across the six new statics: ~1.41 MB. New CSS shipped: `.cr-grid-3`.

---

## Deferred decisions

- **Per-page Open Graph images.** Once screenshots exist, hero shots for research-track and worldbuilding-track make good page-specific OG images (more distinctive on social shares than the site-wide card). Revisit after capture.
- **Any gallery page later.** Decided against for now. If reader-facing demand for a visual index emerges post-launch (Discussions, feedback), a simple `/screenshots/` page can be added later referencing already-embedded assets without re-capturing anything.

---

## Future

Surfaced during the Phase 1 deploy run (2026-04-25) and through subsequent deploy cycles; not blockers, captured here so they don't get lost.

- **Project-level `{{< motion >}}` shortcode.** *Case strengthened post-lazy-play (2026-04-27).* The motion-embed pattern now carries five attributes (`muted`, `loop`, `playsinline`, `preload="none"`, `data-cr-lazy-src`) plus `aria-label` — that's a lot to remember consistently across future deploys. Blowfish's built-in `{{< video >}}` shortcode defaults to `controls=true` and lacks `aria-label` support, so raw HTML stays the current path, but a small project-level wrapper would consolidate the markup and (per the layout-shift follow-up below) give a place to attach an `aspect-ratio` hint per-video if any capture diverges from the standard 16/9 ratio.
- **Bandwidth on the features page.** ✅ Shipped 2026-04-27. `IntersectionObserver`-based "play-when-visible" deployed on `/features/` — see "Site infrastructure: lazy-play `IntersectionObserver`" log entry above for details. First-load page weight no longer scales with the motion library; videos fetch on scroll-in within a ~200px head start.
- **Layout-shift on lazy-loaded videos.** *Follow-up surfaced during lazy-play deploy (2026-04-27); not urgent.* With `preload="none"` and `data-cr-lazy-src`, the `<video>` element has no source until the observer swaps it in, so it has zero intrinsic height and `article video { height: auto }` collapses it to 0. As each video scrolls into range and the source loads, the page jumps. On fast connections this happens within the 200px rootMargin head-start so the jump is mostly invisible; on slow connections it's user-visible. Suggested fix: add `aspect-ratio: 16 / 9` (the source-capture ratio) to `article video` in the website's `assets/css/custom.css`, or per-element via a wrapper if individual captures diverge. Reserves the space before hydration. Not urgent for desktop / fast WiFi but worth flagging before mobile traffic ramps up.
- **JS-disabled fallback (minor).** The new lazy-play pattern requires JavaScript to play any video. Pre-migration, autoplay was a pure HTML attribute. For users with JS disabled entirely (not just no `IntersectionObserver` — that case is handled by the brief's fallback), videos won't play at all. The captures are illustrative rather than load-bearing, so this is acceptable; recording it here so future Future-section readers don't re-discover.
