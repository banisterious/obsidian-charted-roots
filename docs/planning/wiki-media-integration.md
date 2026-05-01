# Wiki Media Integration

**Status:** 📋 Planned. Not started.
**Authored:** 2026-05-01.
**Trigger:** Begin once Phase 2 of [media-library-consolidation.md](media-library-consolidation.md) ships (legacy `docs/images/` files removed, README points at modern `raw/` shots). Wiki integration is additive; doing it after the legacy-cleanup pass keeps the asset library coherent.
**Out of scope today:** No commits yet. This is a written plan; per-phase commits land later.

---

## Why this plan exists

The website (`chartedroots.com`) and the README cover the v1 capture program. The wiki at `obsidian-charted-roots.wiki` does not. Today:

- Five legacy images in `wiki-content/images/` (`buy-me-a-coffee.png`, `family-tree-canvas.png`, `obsidian-canvas-tree-plugin.png`, `relationship-calculator.png`, `tree-output-ui.png`) — branding + early-development screenshots, predate the `cr-` naming convention.
- Three wiki pages reference images, all as illustrative `![[file.jpg]]` syntax inside code blocks demonstrating dynamic-content patterns ([Dynamic-Note-Content](../../wiki-content/Dynamic-Note-Content.md), [Media-Management](../../wiki-content/Media-Management.md), [Release-History](../../wiki-content/Release-History.md)). None of them are feature screenshots.

Result: the wiki is text-only across roughly 40 feature pages, while ~50 modern captures sit ready in `docs/images/raw/`. Many wiki pages would benefit from a single representative capture or a short motion loop where the feature is hard to describe in prose alone (journey playback, highlight groups, custom-relationship overlay).

Goal: embed a curated subset of the v1 capture library across feature wiki pages, with restraint — the wiki audience is reading docs, not browsing visuals. One hero per page, one or two motion loops where they add material clarity, no galleries.

---

## Selection criteria

Not every capture goes on the wiki. The features page on `chartedroots.com` is the marketing-oriented surface and uses captures aggressively; the wiki is reference documentation and treats them differently.

**Use a capture when:**

- The feature is materially hard to describe in prose alone (motion is the obvious case — journey playback, highlight groups dimming, time-slider scrubbing).
- The wiki page documents a UI surface the reader is about to navigate, and a single anchoring screenshot saves them locating the right modal / panel / tab.
- The capture removes ambiguity (e.g., "Profile View" can mean different things to different readers; a screenshot disambiguates).

**Skip a capture when:**

- The wiki page is conceptual / reference (Frontmatter Reference, Schema Validation, Privacy & Security). Adding a screenshot is decorative, not load-bearing.
- The page covers multiple features at a level of abstraction where any single screenshot would be misleading.
- The capture exists for the website's marketing framing (multi-shot composites, flagship hero shots) and would feel out of place in a docs context.

**One capture per page is the default.** Two if a page covers a dual-mode feature (real-world vs. fictional, static vs. journey, etc.). Galleries of four-plus shots belong on the website.

---

## Page-by-page mapping

Proposed embeds. `🎬` marks motion loops; `📸` marks static stills. "Anchor" = primary embed for the page; "Supporting" = optional second embed if the page warrants it.

| Wiki page | Anchor | Supporting | Notes |
|---|---|---|---|
| [Family-Chart-View](../../wiki-content/Family-Chart-View.md) | 📸 `cr-family-chart-live.png` | 🎬 `cr-family-chart-highlight-groups.webm` | Static hero + motion for the highlight groups feature (hard to convey in stills). |
| [Visual-Trees](../../wiki-content/Visual-Trees.md) | 🎬 `cr-canvas-tree-generation.webm` | 📸 `cr-canvas-tree-multi-generational.png` | Generation motion is the page's most useful asset; static hero supports. |
| [Tree-Preview](../../wiki-content/Tree-Preview.md) | — | — | Skip; conceptual / settings-oriented page. |
| [Geographic-Features](../../wiki-content/Geographic-Features.md) | 📸 `cr-map-migration-paths.png` | 🎬 `cr-interactive-map-time.webm` | Static for the at-rest map; motion for the time-slider. |
| [Custom-Maps](../../wiki-content/Custom-Maps.md) | 📸 `cr-map-custom-image.png` | 📸 `cr-map-drilldown-breadcrumbs.png` | Both shots tell the parent / child story; legitimate two-shot case. |
| [Calendar-View](../../wiki-content/Calendar-View.md) | 📸 `cr-calendar-view-realworld.png` | 📸 `cr-calendar-view-fictional.png` | Dual-mode feature; both shots earn their slot. |
| [Custom-Relationships](../../wiki-content/Custom-Relationships.md) | 🎬 `cr-custom-relationships-overlay.webm` | — | Toggle behavior is the point; motion-only. |
| [Relationship-Tools](../../wiki-content/Relationship-Tools.md) | — | — | Skip; consider a future calculator capture per `media-library-consolidation` Phase 3. |
| [Entity-Profile-View](../../wiki-content/Entity-Profile-View.md) | 📸 `cr-entity-profile-person.png` | — | One representative; the other four entity-type shots stay website-only. |
| [Web-Clipper-Integration](../../wiki-content/Web-Clipper-Integration.md) | 🎬 `cr-web-clipper-to-bio.webm` | 📸 `cr-web-clipper-modal.png` | Motion for the click-to-source action; still for the modal detail. |
| [Evidence-And-Sources](../../wiki-content/Evidence-And-Sources.md) | 📸 `cr-entity-attribution.png` | 📸 `cr-source-hierarchy.png` | Two-direction story (per-fact + parent-child sources). |
| [Research-Workflow](../../wiki-content/Research-Workflow.md) | 📸 `cr-workflow-attribution.png` | — | The website's Tier 5 composite is too marketing-flavored; one shot from it (the attribution endpoint) lands cleanly here. |
| [Staging-And-Cleanup](../../wiki-content/Staging-And-Cleanup.md) | 📸 `cr-cleanup-wizard.png` | — | Pre-scan tile grid; clear at a glance. |
| [Data-Quality](../../wiki-content/Data-Quality.md) | 🎬 `cr-merge-wizard-conflict-res.webm` | — | Motion shows the resolve-side step the prose can't fully convey. |
| [Statistics-And-Reports](../../wiki-content/Statistics-And-Reports.md) | 📸 `cr-report-pedigree-tree.png` | — | One report style is enough for the wiki; the website carries the gallery. |
| [Book-Builder](../../wiki-content/Book-Builder.md) | 📸 `cr-book-builder-output.png` | — | TOC page reads as inventory of what the feature produces. |
| [Control-Center](../../wiki-content/Control-Center.md) | 📸 `cr-control-center-collections.png` | — | One tab is enough; the four-tab grid is a website framing. |
| [Data-Entry](../../wiki-content/Data-Entry.md) | 📸 `cr-edit-person-modal.png` | — | Anchors the modal-driven entry workflow. |
| [Universe-Notes](../../wiki-content/Universe-Notes.md) | 📸 `cr-universe-overview.png` | — | Two-pane split conveys the feature directly. |
| [Fictional-Date-Systems](../../wiki-content/Fictional-Date-Systems.md) | 📸 `cr-calendar-view-fictional.png` | — | Reuses the calendar shot at this page since fictional dates are most visible there. |

**Pages explicitly skipped** (reference / conceptual / settings-oriented; adding visuals would be decorative):

- Home, Getting-Started, Data-Model, Data-Management, Import-Export, Templater-Integration, Bases-Integration, Events-And-Timelines, Media-Management, Frontmatter-Reference, Essential-Properties, Settings-And-Configuration, Schema-Validation, Styling-And-Theming, Privacy-And-Security, Advanced-Features, FAQ, Troubleshooting, Roadmap, Release-History, Community-Use-Cases, Context-Menus, Dynamic-Note-Content, Organization-Notes.

Total embed footprint: ~25 captures across ~17 wiki pages (mix of statics and motion). About half the v1 library; the rest stays website-only.

---

## Embed conventions for GitHub wiki

GitHub wiki rendering is GFM with a few platform quirks. Less flexible than Hugo + Blowfish.

**Static images** — plain markdown:

```markdown
![Migration paths between cities on the interactive map](images/cr-map-migration-paths.png)
```

Alt text matters more on the wiki than on the website, since the wiki audience is more likely to be navigating with a screen reader or with images disabled. Aim for 8-15 words that describe the feature state, not just the filename.

**Motion loops** — plain `<video>` tag with controls. GitHub wiki strips custom JavaScript, so the website's lazy-play `IntersectionObserver` pattern doesn't apply. Use `controls` so the reader can scrub:

```html
<video controls muted loop playsinline width="800">
  <source src="images/cr-canvas-tree-generation.webm" type="video/webm">
</video>
```

`muted` + `loop` + `playsinline` keep the loop UX consistent. `width="800"` keeps motion files from rendering at full source resolution on wide monitors. No `aria-label` (GitHub strips it from `<video>`); use a caption paragraph immediately below if context is needed.

**Captions** — single italic line below the embed when needed:

```markdown
![Migration paths between cities on the interactive map](images/cr-map-migration-paths.png)

*William Anderson focal-mode arc from Boston → Miami; rich birth marker popup visible.*
```

Captions are optional; use them when the embed needs disambiguation (which fixture, which mode, which feature variant). Skip when the surrounding prose already names the visual.

**Sizing** — no aggressive optimization required. GitHub wiki serves images at native size with CSS max-width handling responsive scaling. The website's 500 KB-per-static cap was about features-page payload; the wiki has different bandwidth dynamics (per-page reads, no all-on-one-page concern). Captures from `docs/images/raw/` can ship as-is in most cases. Re-optimize only if a specific shot is over ~1 MB.

**No `.cr-grid-2` / `.cr-grid-3`** — the wiki has no custom CSS. Multi-shot embeds (Custom Maps, Calendar View, Evidence and Sources) sit as two sequential `![]()` lines with one blank line between, rendering as stacked images.

---

## File transfer

The wiki is a separate repo (`obsidian-charted-roots.wiki`) cloned alongside the plugin repo. Image transfer is one-directional: copy from `docs/images/raw/` (plugin repo) to `wiki-content/images/` then sync to the wiki repo's `images/` directory.

```bash
# From plugin repo root, for each capture in the mapping table:
cp docs/images/raw/cr-<feature>.png wiki-content/images/
# Then sync wiki-content/ → obsidian-charted-roots.wiki/ per the existing wiki-sync workflow.
```

Filename stability matters here: changing a `cr-feature.png` filename in the future (e.g., a re-capture) requires updating both website embeds and wiki embeds. Treat the `cr-<feature>-<variant>.<ext>` names as stable references across surfaces. (Already a convention; flagging it because wiki integration roughly doubles the surface area over which renames cost something.)

---

## Phases

### Phase 1 — Visualization track

**Scope:** Family-Chart-View, Visual-Trees, Geographic-Features, Custom-Maps, Calendar-View, Custom-Relationships. Six pages, ~10 embeds.

**Why first:** Visualization captures are the most well-tested in the deployed website context, and these pages currently have the largest visual gap (text-heavy on features that are inherently visual).

**Steps:**
1. Copy the relevant captures from `docs/images/raw/` to `wiki-content/images/`.
2. Edit the six wiki pages to add the embeds at the top of the most relevant section (typically the page's primary feature description, not the introduction).
3. Sync `wiki-content/` to the wiki repo.
4. Verify rendering on at least one motion embed (motion is the highest-risk for wiki rendering oddities).

**Risk:** Low. Pure additive content; no existing references to break.

### Phase 2 — Research track

**Scope:** Web-Clipper-Integration, Evidence-And-Sources, Research-Workflow, Staging-And-Cleanup, Data-Quality, Statistics-And-Reports, Book-Builder. Seven pages, ~9 embeds.

**Why second:** The research track is the genealogy-workflow narrative — most coherent when the visualization track lands first to anchor the "explore your data" half of the story.

**Steps:** Same as Phase 1.

**Risk:** Low.

### Phase 3 — Workspace + worldbuilding

**Scope:** Entity-Profile-View, Control-Center, Data-Entry, Universe-Notes, Fictional-Date-Systems. Five pages, ~6 embeds.

**Steps:** Same as Phase 1.

**Risk:** Low.

### Phase 4 — Legacy cleanup (optional)

**Scope:** The five legacy images in `wiki-content/images/` (`family-tree-canvas.png` is the most clearly superseded by `cr-canvas-tree-multi-generational.png`; the others — `obsidian-canvas-tree-plugin.png`, `relationship-calculator.png`, `tree-output-ui.png` — are early-development screenshots not directly mapped to current captures).

**Steps:**
1. Audit which legacy images are still referenced from any wiki page (re-run `git grep` per the consolidation doc's pattern).
2. For each unreferenced legacy image: `git rm`.
3. For each referenced legacy image: replace the reference with a modern capture if one fits, or schedule a re-capture per `media-library-consolidation.md` Phase 3 if not.
4. `buy-me-a-coffee.png` stays — branding, not a feature capture.

**Risk:** Low if the audit is thorough. Skipping this phase is acceptable; legacy images don't actively harm anything.

---

## Acceptance criteria

- [ ] Phase 1: Six visualization-track wiki pages have embeds; rendered cleanly on the live wiki.
- [ ] Phase 2: Seven research-track wiki pages have embeds.
- [ ] Phase 3: Five workspace + worldbuilding wiki pages have embeds.
- [ ] Phase 4 (optional): Legacy `wiki-content/images/` files audited; unreferenced superseded shots removed.
- [ ] All embeds use the conventions in this doc (alt text 8-15 words; `<video controls>` for motion; no custom CSS classes).
- [ ] No broken image references on any wiki page (audit by walking the live wiki post-Phase-3).

---

## Open questions

1. **Wiki-sync cadence.** The `wiki-content/` → wiki repo sync is currently manual; this plan adds three batches that need syncing. Worth aligning Phase boundaries with natural wiki-sync windows (e.g., when Release-History.md spotlights are also pending sync) so each push is a coherent batch.
2. **Whether Visual-Trees gets the color-scheme grid.** The website's Canvas Tree section carries both the layout grid (4 shots) and the color-scheme grid (4 shots) as 2×2 grids. The wiki page could justify the layout grid as a 2×2-equivalent stack since layouts are conceptually distinct. Color schemes are decorative-variation enough that one shot probably suffices for the wiki audience. Tentatively excluded from the mapping; revisit if the page reads thin without it.
3. **Whether to backport captures into Release-History wiki spotlights.** The release spotlights in `wiki-content/Release-History.md` currently link to GitHub release notes. Adding a representative still per release where the capture exists would make the wiki Release-History richer, at the cost of expanding scope significantly. Probably out of scope for this plan; a separate "Release-History media spotlights" pass could come later.
4. **Mobile-friendliness of motion embeds.** GitHub wiki on mobile renders `<video>` tags reasonably, but the 800px width hint may cause horizontal overflow on narrow viewports. Worth a spot-check during Phase 1 deploy on actual mobile.

---

## Related work

- [media-library-consolidation.md](media-library-consolidation.md) — the parent cleanup plan; wiki integration is additive on top of the consolidated library, not a replacement for the README / website work.
- [website-content/media-plan.md](website-content/media-plan.md) — capture conventions and the deployment log; this plan adopts the same naming / fixture / sizing conventions but relaxes the strictest optimization rules since the wiki has different bandwidth dynamics.
