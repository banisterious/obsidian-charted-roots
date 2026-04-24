# Media Plan — stub

**Target pages:** `/gallery/_index.md` (new) plus inline embeds across landing, features, research, worldbuilding, and per-release pages.
**Status:** 📋 Stub — Phase 3 for new capture work; video section has a Phase 1 component that can ship immediately since the videos already exist.

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

- **Canvas Tree** — Standard, Compact, Timeline, Hourglass layouts, plus a multi-generation tree.
- **Family Chart view** — live exploration, color schemes (gender / generation / collection / monochrome).
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

- **Universe and fictional calendar** — a universe note with a linked custom calendar, plus an event in that universe showing a BBY/ABY date rendering correctly in the timeline. Anchors the worldbuilder side of the gallery.
- **Custom image maps** — a fictional-world map with waypoints, separate from the real-world interactive-map shot so each audience sees their use case represented.

### Data entry and organization

- **Edit Person modal** — relationships, dates, sources. Include the universe dropdown with a fictional universe selected.
- **Control Center** — Collections tab, Sources tab, Places tab, Events tab.
- **Book Builder** — one screenshot of a compiled narrative output.

---

## Notes for capture session

- Capture on both light and dark themes if layout supports it; otherwise pick the one the landing hero uses. The existing video tour uses dark mode; matching that in static + motion keeps the site visually coherent.
- Consistent window size and zoom across screenshots.
- Include a sample vault's worth of data so screenshots look populated, not empty.
- At least one end-to-end workflow composite is worth the extra effort. Strongest candidate: web clip → source note → attribution on a person note. Shows the research loop in three shots.
- Include at least one pair showing the same feature for genealogy vs. worldbuilding to reinforce the two-audience framing. The Canvas Tree section is a natural spot (real family + fictional family).
- For the worldbuilding shots, use a recognizable-enough fictional universe that readers catch the reference without distraction. Star Wars works if the plugin's built-in Galactic Standard Calendar is used; otherwise an original-but-simple universe is fine. The existing video tour uses Dying Earth and Gaean Reach fixtures, which could be reused for coherence.
- Motion loops should reuse the static shots' framing where possible. If the canvas tree generation loop starts from a tree that looks like the Canvas Tree static shot, the eye recognizes the continuity. Plan static and motion for the same feature in one sitting.

---

## Open questions

1. **Gallery page or embed-everywhere.** A dedicated `/gallery/` page is cleaner discovery but splits attention. Alternative: scatter screenshots through the feature and track pages, skip the gallery entirely. Lean: dedicated gallery as a visual index, with a few hero screenshots also embedded in landing and features for discoverability.
2. **Video embed vs. thumbnail link.** Auto-embedding multiple videos on a page is heavy; thumbnail-only with click-to-play is faster but loses visibility. Probably hybrid: hero video auto-embeds, secondary chapter deep-links are thumbnail-and-link.
3. **Deep-link format for chapters.** `&t=Xs` in the URL jumps to the chapter on click. For inline embeds, the `<iframe>` `start` parameter does the same. Pick one and be consistent.
4. **When to recapture the full feature tour again.** The existing production workflow already re-captures per major release. Website link should always point to the most recent; if a chapter timestamp shifts, the per-chapter deep-links need updating. Worth noting as recurring maintenance.
5. **Motion loop hosting.** GitHub Pages handles small files fine; heavier WebM might push toward self-hosting on the website's static assets. Revisit when loops actually exist.
