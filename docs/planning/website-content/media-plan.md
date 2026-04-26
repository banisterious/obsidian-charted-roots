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

**Embedding:** place the file in `static/img/` on the website repo, reference from markdown as `![Alt text](/img/cr-feature-variant.png)` or via Blowfish's image shortcode if it handles responsive sizing better. Motion loops use a plain `<video>` tag — Blowfish's `{{< video >}}` shortcode exists but defaults to `controls=true` and lacks `aria-label` support, so raw HTML is the cleaner path until a project-level `{{< motion >}}` shortcode is added (see "Future" section below). Pattern:

```html
<video autoplay muted loop playsinline preload="metadata" src="/img/cr-feature-variant.webm" aria-label="<short factual description>"></video>
```

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

---

## Deferred decisions

- **Per-page Open Graph images.** Once screenshots exist, hero shots for research-track and worldbuilding-track make good page-specific OG images (more distinctive on social shares than the site-wide card). Revisit after capture.
- **Any gallery page later.** Decided against for now. If reader-facing demand for a visual index emerges post-launch (Discussions, feedback), a simple `/screenshots/` page can be added later referencing already-embedded assets without re-capturing anything.

---

## Future

Surfaced during the Phase 1 deploy run (2026-04-25); not blockers, captured here so they don't get lost.

- **Project-level `{{< motion >}}` shortcode.** A wrapper around the autoplay/muted/loop/aria-label pattern would be cleaner than per-page raw HTML once the motion library grows past ~5-10 files. Blowfish's built-in `{{< video >}}` shortcode is full-featured but defaults to `controls=true` and lacks `aria-label` support — raw HTML is the better current path. A small project-level shortcode that matches the documented embed pattern would consolidate the markup.
- **Bandwidth on the features page.** With autoplay enabled, browsers fetch the full file regardless of `preload="metadata"`. Five loops at 8.7 MB total all download on first visit to `/features/`, and that grows as the motion library does. `IntersectionObserver`-based "play-when-visible" (loading metadata only until the video scrolls into view) would cap the on-page-load weight regardless of how many videos eventually live there. Worth doing if total page weight crosses ~15-20 MB or if visitor analytics flag a metered-connection concern.
