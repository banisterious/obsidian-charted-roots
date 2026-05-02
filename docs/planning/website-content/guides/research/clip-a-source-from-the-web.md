---
title: "I want to capture a source from a website"
description: Use Obsidian Web Clipper to capture obituaries, Find a Grave memorials, FamilySearch profiles, or Wikipedia biographies into your staging folder for review and promotion.
track: research
difficulty: medium
time_estimate: ~15 min for setup; ~1 min per clip after that
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to capture a source from a website

Use this when your research surfaces evidence on the web — an obituary on a newspaper site, a Find a Grave memorial, a FamilySearch profile, a Wikipedia biography — and you want to capture it as a structured source note rather than copy-pasting into a blank file. By the end you'll have the Obsidian Web Clipper extension installed, a Charted Roots template imported, and a real clipped note sitting in your staging folder ready for review and promotion to the main tree.

## What you'll need

- A modern browser (Chrome / Edge / Firefox / Safari).
- A configured Staging folder under **Settings → Charted Roots → Folders → System folders**. See [I want to set up a staging workflow for messy imports](set-up-staging-workflow) if you don't have one.
- (Optional but recommended) The **Staging isolation** toggle enabled under **Settings → Charted Roots → Advanced → Folder filtering** so clips don't leak into tree generation until you promote them.
- An LLM API key if you plan to use the LLM-extraction templates (Obituary, FamilySearch, Wikipedia). The CSS-selector templates (Find a Grave, Wikipedia Basic) work without one.

## Steps

### 1. Install Obsidian Web Clipper

The official browser extension. Install from your browser's extension store:

- [Chrome / Edge](https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/web-clipper-obsidian/)
- [Safari](https://apps.apple.com/us/app/obsidian-web-clipper/id6720708363)

### 2. Configure Web Clipper's output

Open the Web Clipper extension settings and set:

- **Default vault** — your Obsidian vault.
- **Default folder** — your Charted Roots staging folder (e.g., `Family/Staging`).

This is the load-bearing setting. Charted Roots only detects clips that land in the configured staging folder; clips saved elsewhere won't auto-surface in Dashboard or Staging Manager.

### 3. Import a Charted Roots template

Charted Roots ships several pre-built templates at [docs/clipper-templates/](https://github.com/banisterious/obsidian-charted-roots/tree/main/docs/clipper-templates) in the repo:

| Template | Site | Method |
|---|---|---|
| Find a Grave — Person | findagrave.com | CSS selectors |
| Find a Grave — Person (LLM) | findagrave.com | AI extraction |
| Obituary — Generic | Any obituary site | AI extraction |
| FamilySearch — Person | familysearch.org | AI extraction |
| Wikipedia — Biography (LLM or Basic) | wikipedia.org | AI or CSS |
| Wikidata — Place (LLM) | wikidata.org | AI extraction |

Download the `.json` file for the template you want, open Web Clipper settings → **Import**, and select the file. Templates auto-trigger on matching URLs.

### 4. Clip a page

Navigate to a supported site, click the Web Clipper icon, pick the template (or use the auto-suggested one), review the extracted fields, click **Save to Obsidian**.

![Obsidian Web Clipper modal extracting structured fields from a Find a Grave memorial page](images/cr-web-clipper-modal.png)

### 5. Review in the Dashboard

Open Control Center → Dashboard. The **Staging** card shows: `3 clips (1 new), 1 other`. Click **Review** to open the Staging Manager.

In Staging Manager, use the toggle to filter to **Clipped** and inspect the new note. Read the extracted fields carefully — LLM extraction can hallucinate (especially for missing data like birth years), so verification before promotion is worth the few seconds.

![Clipped note in the staging folder, with metadata fields extracted by the Web Clipper template](images/cr-web-clipper-staging-note.png)

### 6. Promote to the main tree

When the clip looks correct:

- Click **Check duplicates** first to find any existing matches in the main tree (the Merge Wizard handles them — see [I want to find and merge duplicate persons](find-and-merge-duplicates)).
- Click **Promote** to move the note into your main tree. Promotion strips the clipper metadata properties, leaving a clean `cr_type: source` (or `cr_type: person`, `cr_type: place`) note.

## Variations

- **Custom templates.** Build your own template in Web Clipper's editor. Include at least one of `clip_source_type`, `clipped_from`, or `clipped_date` so Charted Roots detects it. Add Charted Roots properties (`cr_type: source`, `source_type: obituary`, etc.) for one-step promotion.
- **CSS selectors instead of LLM.** When the site has a stable structured layout (Find a Grave, Wikipedia), CSS-selector extraction is faster, cheaper, and never hallucinates. LLM templates are the right choice when the layout varies (newspaper obituaries).
- **Place clipping.** The Wikidata Place template extracts coordinates, place type, and administrative hierarchy from any Wikidata Q-page. Promotes directly into the Places folder with a generated `cr_id`.
- **Skipping staging.** Possible but discouraged — clips go straight to whatever folder Web Clipper points at. Without staging, you lose the review/promote workflow and risk LLM-fabricated data leaking into the main tree.

## Related guides

- [I want to set up a staging workflow for messy imports](set-up-staging-workflow)
- [I want to find and merge duplicate persons](find-and-merge-duplicates)
- [I want to attach one source to multiple people](attach-one-source-to-multiple-people)
- [I want to set up per-fact source citations](set-up-source-tracking)

## Reference

- Wiki: [Web Clipper Integration](https://github.com/banisterious/obsidian-charted-roots/wiki/Web-Clipper-Integration)
- Wiki: [Staging & Cleanup](https://github.com/banisterious/obsidian-charted-roots/wiki/Staging-And-Cleanup)
- Repo: [docs/clipper-templates/](https://github.com/banisterious/obsidian-charted-roots/tree/main/docs/clipper-templates) — the canonical template library

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+clip-a-source-from-the-web%3A+

---

## Notes for review

- LLM hallucination is called out at step 5 because it's the single biggest risk for new users. The Web Clipper wiki has more detail; this guide keeps the warning concise and points to verification as the mitigation.
- The "Skipping staging" Variation is a deliberate inclusion of the unsupported path — easier for readers to understand *why* staging matters when the alternative is named.
- This guide closes a placeholder cross-reference from `set-up-source-tracking` (P0, shipped). Once published, that cross-link becomes live.
- Length: ~720 words.
