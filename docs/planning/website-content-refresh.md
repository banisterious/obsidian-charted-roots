# Website Content Refresh (chartedroots.com)

Planning and orchestration for a multi-phase refresh of [chartedroots.com](https://chartedroots.com). Drafts live alongside this doc in [website-content/](website-content/); a separate session handles the Hugo port and deploy against `S:\Projects\websites\chartedroots.com`.

**Status:** 🔶 Scaffolding (2026-04-24) — structure in place, drafts pending.

---

## Why

The live site is ~4 months stale relative to the plugin:

- **Changelog page** stops at v0.19.1 (January 2026). Missing: all of 0.20.x, 0.21.x, 0.22.x — roughly 25 releases including most of the world-building and sources work.
- **Features page** reflects a January snapshot. Missing at least: Entity Profile Views, cross-entity Collections, fictional date systems with universe scoping, Mills source classification, structured role lists, Data Quality view, and plenty more.
- **Landing page** copy is decent but doesn't reflect the current feature depth.

With 1.0 approaching (stability window anchored to 0.22.4, target ~2026-05-14), the site should be current before the 1.0 announcement — both so the 1.0 page doesn't have to carry the backlog and so anyone who lands on the site during the launch sees the current state.

---

## Where content lives and how it ships

**This repo** — authoring happens here. Content drafts live in [website-content/](website-content/) as plain markdown. Rationale: the source material (CHANGELOG.md, wiki-content/Release-History.md, docs/, code) is right here, so cross-reference is trivial and drafts stay in sync when the plugin updates.

**Website repo** at `/mnt/s/Projects/websites/chartedroots.com` (Hugo + Blowfish theme, GitHub Pages via Actions) — a separate session ports each drafted doc into `/content/**/_index.md`, applies Hugo frontmatter, handles Blowfish-specific conventions, runs local preview, builds, and deploys.

Hand-off format: the website session reads files from `/mnt/s/Projects/obsidian-plugins/charted-roots/docs/planning/website-content/*.md` and ports content into the Hugo structure. Drafts are plain markdown with human-readable headings; Hugo frontmatter is added during the port.

---

## Style conventions

Applies to all drafts in this directory.

- **Voice:** Match the existing site. Plain-spoken, technically specific, no marketing fluff. "17+ report types" is fine. "Revolutionary genealogical experience" is not.
- **Audience:** Two tracks, both served by the same copy when possible. Traditional genealogists (family history, evidence, GEDCOM) and world-builders (fictional universes, custom calendars, narrative compilation). Avoid framing that implies one audience is primary.
- **Depth:** Moderate. Headline features get 2–4 sentences. Supporting capabilities get a short bullet or are grouped.
- **Curation:** On the changelog, skip small bug fixes and polish unless they illustrate a larger theme. Pick the 5–7 things a reader actually cares about per version cluster.
- **Links:** Use absolute GitHub URLs for issues (`https://github.com/banisterious/obsidian-charted-roots/issues/123`) and releases. Relative internal links stay relative (`/features/`).
- **Tense:** Past tense for "what shipped," present tense for "what it does." Active voice.
- **Screenshots:** Placeholder `![TODO screenshot: description]` markers in drafts. Real images added during port when available.
- **Version references:** `v0.22.5` style with the `v`. Not "version 0.22.5".

### Linking changelog spotlights to the features page

Changelog spotlights that describe a feature still on the site (as opposed to a bug fix or internal plumbing change) should end with a short "More in Features" link to the corresponding section of `/features/`. Skip the link when:

- the spotlight is a bug fix or stability improvement rather than a new capability
- the feature isn't covered on the features page
- the spotlight already links out to a track page (`/research/`, `/worldbuilding/`) that covers it more thoroughly

**Pattern:** last line of the spotlight, short arrow link.

```
[More in Features →](/features/#entity-profile-view)
```

**Anchor format:** Hugo's default — lowercase heading text, spaces become hyphens, `&` and other punctuation dropped. The features-refresh draft should write headings that generate the anchors the changelog spotlights reference. When features-refresh drafting starts, cross-check the anchor list in [changelog-refresh.md](website-content/changelog-refresh.md) against the headings it uses.

### Linking to wiki documentation

Deep pages (research-track, worldbuilding-track, features-refresh) link out to the authoritative wiki as "Read more" affordances at section boundaries, not inline. Narrative stays on the website; reference lives on the wiki. Landing, changelog, and FAQ generally don't need deep wiki links since they're already shallow-to-mid depth.

- **Pattern:** end-of-section link with an arrow, not inline mid-paragraph.

  ```
  [Read more: Evidence and sources →](https://github.com/banisterious/obsidian-charted-roots/wiki/Evidence-And-Sources)
  ```

- **URL format:** `https://github.com/banisterious/obsidian-charted-roots/wiki/<Page-Name>`. Wiki page names use title case with hyphens between words (e.g., `Web-Clipper-Integration`). The `wiki-content/` folder in this repo is the authoritative list of page names.
- **Maintenance:** wiki page renames will break these links. Worth a periodic audit, or a link-check step on the website's CI later.

### Voice preferences

Specific patterns to avoid in copy that'll ship on the site:

- **Em-dashes.** Budget: 0–1 per paragraph, zero preferred. Use a period, a comma, or parentheses instead.
- **Rule-of-three adjective triads.** "Careful, deliberate, and methodical." Pick one adjective and move on.
- **End-of-paragraph wrap-up sentences.** Phrases like "Together these close the book on X" or "This sets the stage for Y." Stop when the point is made.
- **"Whether you're X or Y" audience-bridging.** The existing landing page uses one instance. Don't compound it.
- **Marketing adjectives.** "Seamless," "comprehensive," "robust," "streamlined," "elevate," "professional-grade." If the feature is good, let it speak for itself.
- **Over-parallel symmetry.** "Previously X. Now Y. Previously A. Now B." Real prose is more ragged.
- **Semicolons joining related clauses.** "The validator did X; it now does Y." Split into two sentences.
- **Stacked parenthetical explainers.** One per paragraph, max.
- **Smart openers.** "Notably," "Importantly," "Crucially," "Worth noting." Drop most of them; trust the reader.
- **Overused vocabulary.** "Delve," "tapestry," "landscape," "realm," "journey" (in the metaphorical sense), "at its core," "in essence," "think of it as."

### Self-edit checklist (before hand-off)

Before marking a draft ready to port, run through the draft once with this list:

- [ ] Em-dash count under 1 per paragraph on average?
- [ ] No adjective triads? (Ctrl-F "and" — look for three-item adjective lists.)
- [ ] No wrap-up coda at paragraph ends?
- [ ] No stacked parentheticals?
- [ ] No marketing adjectives from the list above?
- [ ] Links use absolute URLs for GitHub, relative for internal?
- [ ] Version references use `v0.X.Y` format?

---

## Draft inventory

| Draft | Phase | Status | Target page |
|---|---|---|---|
| [changelog-refresh.md](website-content/changelog-refresh.md) | 1 | 🚀 Ported 2026-04-24 | `/changelog/_index.md` |
| [features-refresh.md](website-content/features-refresh.md) | 1 | 🚀 Ported 2026-04-24 | `/features/_index.md` |
| [landing-refresh.md](website-content/landing-refresh.md) | 2 | 📝 Pending | `/_index.md` |
| [whats-new-in-1-0.md](website-content/whats-new-in-1-0.md) | 2 | 📝 Pending (post-1.0) | `/1-0/_index.md` (new) |
| [media-plan.md](website-content/media-plan.md) | 1 (video) / 3 (static + motion) | 🚀 Video Phase 1 shipped 2026-04-24; static + motion pending | `/gallery/_index.md` (new) + inline embeds |
| [world-builder-track.md](website-content/world-builder-track.md) | 3 | 📋 Stub | `/worldbuilding/_index.md` (new) |
| [research-track.md](website-content/research-track.md) | 3 | 📋 Stub | `/research/_index.md` (new) |
| [faq.md](website-content/faq.md) | 3 | 📋 Stub | `/faq/_index.md` (new) |

**Status key:** 📝 Pending = not started · 🔶 In progress · ✅ Drafted, awaiting review · 🚀 Ported · 📋 Stub = outline only, no content yet.

---

## Phase plan

### Phase 1 — Catch-up (urgent)

Goal: bring the live site from its January snapshot to the current state before the 1.0 launch.

1. **Changelog refresh** — curated spotlights for 0.20.x, 0.21.x, 0.22.x clusters. Each cluster: 1-paragraph theme summary + 5–7 headline features (2–3 sentences each) + link to GitHub releases for the full list.
2. **Features refresh** — audit the existing features page section-by-section. Update stale entries, add missing capabilities (Entity Profile Views, Collections, universes, calendar view, etc.), keep the capability-area structure the current page uses.

### Phase 2 — 1.0 launch

Goal: coincide with 1.0 shipping.

3. **Landing refresh** — hero copy that reflects current feature depth, tighten the "Why Charted Roots?" section, keep install flow accurate (BRAT → Community Plugins when that flips).
4. **"What's new in 1.0" page** — launch-day spotlight. Drafted near the 1.0 release; goes live with the 1.0 tag.

### Phase 3 — New content (non-urgent)

Only tackled after Phases 1–2 land and the 1.0 dust settles.

5. **Media gallery.** Unified plan for static screenshots, motion loops (GIFs / WebM), and video. Part of it is Phase 1 (surface the two existing README-linked YouTube videos with chapter deep-links into research / worldbuilding / features); the static and motion portions are Phase 3 and require capture sessions.
6. **World-builder track page.** Dedicated narrative for the fictional-universes workflow. Links out to specific features (universes, custom calendars, image maps).
7. **Research track page.** Dedicated narrative for the evidence-and-sources workflow. Topic-focused (sources, citations, GPS workflow, data quality), not audience-gated. Parallels the worldbuilding page as a deep capability-area dive.
8. **FAQ.** Common questions. May pull from GitHub Discussions themes.

Additional ideas welcome. These are the ones I'd queue first.

---

## Source material pointers

For whoever is drafting, including future me:

- **[CHANGELOG.md](../../CHANGELOG.md)** — authoritative release log with per-version fix/feature narrative.
- **[wiki-content/Release-History.md](../../wiki-content/Release-History.md)** — deeper per-release write-ups, especially for 0.22.x hotfixes. Good raw material for spotlight paragraphs.
- **[docs/](../../docs/)** — architecture, developer, and user-facing docs. Feature descriptions often have a canonical phrasing here worth reusing.
- **Project conventions** — sentence-case UI text, naming conventions, and other standards documented in [docs/developer/coding-standards.md](../../docs/developer/coding-standards.md). The conventions that apply to in-plugin copy generally apply to site copy too.
- **[docs/assets/branding/](../../docs/assets/branding/)** — brand guide, seal, social cards. The "Where the logo appears" table tracks deployment status across surfaces.
- **[.session-restore.md](../../.session-restore.md)** — gitignored; current state snapshot including version, stability-window status, recent work.

---

## Open questions / deferred decisions

- **Install-path flip** — the Getting Started section currently leads with BRAT. Plan is to re-order to "from Community Plugins" once the directory listing lands, with BRAT as the fallback for early adopters. Timing is out of our hands (queue-driven); keep an eye on `project_community_plugins_status.md` in memory.
- **Changelog scope bound** — for the catch-up, do we go back to 0.20.0 or further? Currently proposing 0.19.2 onward (to close the gap on the live page) but anything 0.20.x+ is the meat. Will flag in the changelog draft.
- **Per-version vs per-cluster structure** — proposing cluster-level spotlights (0.20.x as one section, etc.) rather than per-release bullets. Worth confirming the first time we see a full draft — easy to flip to per-release if the cluster shape feels wrong.
