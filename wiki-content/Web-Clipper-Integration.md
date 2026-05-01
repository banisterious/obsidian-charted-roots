# Web Clipper Integration

Capture genealogical data from web sources directly into your Charted Roots vault using Obsidian Web Clipper.

![Obsidian Web Clipper modal extracting structured fields from a Find a Grave memorial page](images/cr-web-clipper-modal.png)

---

## Table of Contents

- [Overview](#overview)
- [Ready-to-Use Templates](#ready-to-use-templates)
- [Setup](#setup)
- [Workflow](#workflow)
- [Creating Custom Templates](#creating-custom-templates)
- [Community Templates](#community-templates)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Web Clipper Integration?

Charted Roots integrates with [Obsidian Web Clipper](https://obsidian.md/help/web-clipper), the official browser extension for capturing web content. This integration streamlines the process of collecting genealogical data from online sources.

### When to Use It

Web Clipper is ideal for capturing:
- **Obituaries** from newspaper websites
- **Find A Grave** memorial pages
- **FamilySearch** person profiles
- **Wikipedia** biographies
- **Census records** from online databases
- **Historical documents** from archives

### How It Works with Staging Manager

1. Create Web Clipper templates with special metadata properties
2. Clip content from web pages into your staging folder
3. Charted Roots automatically detects clipped notes
4. Dashboard shows: "3 clips (1 new), 1 other"
5. Review clips in Staging Manager with filtering
6. Promote verified data to your main tree

---

## Ready-to-Use Templates

Charted Roots provides curated, tested Web Clipper templates that work out of the box. Download, import into Web Clipper, and start clipping.

### Available Templates

| Template | Source | Method | AI Required? |
|----------|--------|--------|-------------|
| **Find a Grave — Person** | findagrave.com | CSS selectors | No |
| **Find a Grave — Person (LLM)** | findagrave.com | AI extraction | Yes |
| **Obituary — Generic** | Any obituary site | AI extraction | Yes |
| **FamilySearch — Person** | familysearch.org | AI extraction | Yes |
| **Wikipedia — Biography (LLM)** | wikipedia.org | AI extraction | Yes |
| **Wikipedia — Biography (Basic)** | wikipedia.org | CSS selectors | No |
| **Wikidata — Place (LLM)** | wikidata.org | AI extraction | Yes |

### Quick Start

1. Download template `.json` files from [docs/clipper-templates/](https://github.com/banisterious/obsidian-charted-roots/tree/main/docs/clipper-templates)
2. Open the Web Clipper browser extension settings
3. Click **Import** and select the downloaded template
4. Navigate to a supported site (e.g., Find a Grave) — the template auto-triggers
5. Click the Web Clipper icon → clip the page
6. The clipped note appears in your staging folder, ready for review and promotion

Templates auto-trigger on matching URLs (Find a Grave, FamilySearch, Wikidata) or can be manually selected (Obituary, Wikipedia).

### Place Templates

The **Wikidata — Place (LLM)** template extracts structured geographic place data:
- Auto-triggers on Wikidata Q-pages (`wikidata.org/wiki/Q*`)
- Extracts coordinates, place type, administrative hierarchy, and alternate names
- Works with Charted Roots' staging promotion workflow
- Automatically assigns `cr_id` and routes to Places folder on promotion

See the [detailed template documentation](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/clipper-templates/CLIPPER-TEMPLATES.md) for setup instructions, fields extracted, and usage examples for each template.

---

## Setup

### 1. Install Obsidian Web Clipper

Install the browser extension for your browser:
- [Chrome/Edge](https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/web-clipper-obsidian/)
- [Safari](https://apps.apple.com/us/app/obsidian-web-clipper/id6720708363)

### 2. Configure Output Folder

**Important:** Configure Web Clipper to save clips to your Charted Roots staging folder.

1. Open Web Clipper settings
2. Set **Default vault** to your Obsidian vault
3. Set **Default folder** to your staging folder (e.g., `Family/Staging`)

**Why this matters:** Charted Roots only detects clips saved to the staging folder. Clips saved elsewhere won't be detected or filtered.

### 3. Verify Staging Settings

In Obsidian:
1. Open **Settings → Charted Roots → Folders → System folders**
2. Verify **Staging folder** matches Web Clipper's output folder
3. Enable **Staging isolation** (Settings → Charted Roots → Advanced → Folder filtering)

---

## Creating Custom Templates

### Clipper Metadata Properties

For Charted Roots to detect your clipped notes, include **at least one** of these properties in your Web Clipper templates:

| Property | Purpose | Example Value |
|----------|---------|---------------|
| `clip_source_type` | Type of source | `obituary`, `findagrave`, `census` |
| `clipped_from` | Original URL | `{{url}}` (Web Clipper variable) |
| `clipped_date` | Timestamp | `{{date}}` (Web Clipper variable) |

**Note:** All three properties are recommended but optional. Including them enables:
- Detection and filtering in Staging Manager
- Source tracking for citations
- Chronological organization

### Minimal Example Template

```yaml
---
clip_source_type: obituary
clipped_from: "{{url}}"
clipped_date: "{{date}}"
---

# {{title}}

{{content}}
```

### Adding Genealogical Properties

Combine clipper metadata with Charted Roots properties:

```yaml
---
cr_type: person
clip_source_type: obituary
clipped_from: "{{url}}"
clipped_date: "{{date}}"
name: "{{title}}"
# ... other properties extracted by Web Clipper
---

{{content}}
```

### Tips for LLM-Based Extraction

Based on community testing:

**Use double quotes in prompts:**
- ✅ Correct: `Extract "birth date" from the text`
- ❌ Wrong: `Extract 'birth date' from the text`

**Include Web Clipper variables in context:**
- Helps LLM understand the source material
- Improves extraction accuracy
- Example context: `URL: {{url}}, Date: {{date}}`

**Choose appropriate models:**
- Larger models (Mistral 8B, Small 3.2) perform better
- Smaller models may hallucinate data not in source
- Always verify extracted data in staging review

**Be aware of hallucination:**
- LLM extractors may fabricate missing data (e.g., birth years)
- This reinforces the value of the staging review workflow
- Never blindly promote clips without verification

---

## Workflow

### 1. Clipping Content

![Web Clipper click-to-source flow: clicking the extension produces a structured source note in the vault](images/cr-web-clipper-to-bio.gif)

*Wikipedia biography variant: clicking the extension extracts the page; the resulting source note appears in the Obsidian Staging folder.*

1. Navigate to a web page with genealogical data
2. Click the Obsidian Web Clipper browser extension icon
3. Select your template (or use default)
4. Review extracted data
5. Click **Save to Obsidian**

### 2. Reviewing Clips in Dashboard

After clipping, Charted Roots detects the new note:

1. Open **Control Center** → **Dashboard** tab
2. The **Staging** card shows: "3 clips (1 new), 1 other"
   - "3 clips" = total clipped notes in staging
   - "(1 new)" = clips added since you last opened Staging Manager
   - "1 other" = non-clipped staging files (GEDCOM imports, manual notes)

### 3. Using Staging Manager Filter

1. Click **Review** on the Staging card to open Staging Manager
2. Use toggle buttons to filter:
   - **All** — Show all staging content
   - **Clipped** — Show only clipped notes (files with clipper metadata)
   - **Other** — Show only non-clipped files (imports, manual entries)

The filter applies at all levels:
- Summary stats recalculate
- Batches (subfolders) hide if they contain no matching files
- Files within batches filter based on metadata

### 4. Promoting to Main Tree

After verifying clipped data:

1. Review the content for accuracy (check for LLM hallucinations)
2. Add or correct any missing information
3. Use batch actions:
   - **Check duplicates** — Find potential matches in main tree
   - **Promote** — Move to main tree (removes clipper metadata)
   - **Delete** — Discard if inaccurate or duplicate

---

## Community Templates

### Sharing Your Templates

Have a great Web Clipper template for genealogy? Share it with the community:

1. Post in [GitHub Discussions](https://github.com/banisterious/obsidian-charted-roots/discussions)
2. Include:
   - Source type (Find A Grave, obituary, etc.)
   - Template JSON
   - Usage notes and tips
   - Example output

### Finding Community Templates

Check GitHub Discussions for templates shared by other users. Look for:
- Specific source types you research (Find A Grave, FamilySearch, etc.)
- Extraction methods (LLM vs CSS selectors)
- Recent templates compatible with current Web Clipper version

### Official Templates

See [Ready-to-Use Templates](#ready-to-use-templates) above for the full list of curated templates provided by Charted Roots.

### Potential Future Place Templates

**GOV (Geschichtliches Ortsverzeichnis)** — Historical German/European place database with temporal boundary tracking
- **URL Pattern:** `gov.genealogy.net/item/show/*`
- **Best for:** German, Austrian, Polish, and European genealogy; church jurisdictions
- **Why it's a good candidate:** Browsable pages with historical jurisdiction data and temporal relationships

**Note on other sources:** For API-based place sources (FamilySearch Places API, GeoNames, OpenStreetMap Nominatim), Charted Roots is planning native plugin integration via the **Unified Place Lookup** feature. This will provide a better user experience than Web Clipper templates for API-only sources. See [Place Data Sources Research](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/research/place-data-sources.md) for detailed comparison of all available sources.

### Potential Future Person/Record Templates

Community members have suggested templates for these genealogy-specific sites:

| Site | Type | Notes |
|------|------|-------|
| **JewishGen** | Records database | Jewish genealogical records and databases |
| **ItalianGen** | Records database | Italian genealogical records |
| **ReclaimTheRecords** | Vital records | FOIA-obtained vital records collections |
| **NARA** | Archives | US National Archives catalog and digitized records |
| **BillionGraves** | Cemetery records | GPS-tagged headstone photos and transcriptions |
| **Newspapers.com** | Historical newspapers | Obituaries, birth/marriage announcements |

These sites typically have structured page layouts that could work well with CSS selector extraction (no LLM required).

**Interested in developing a template?** Share your work in the [Web Clipper Templates discussion](https://github.com/banisterious/obsidian-charted-roots/discussions/categories/web-clipper-templates).

---

## Troubleshooting

### Clips Not Detected

**Problem:** Clipped notes don't appear in Dashboard or filter in Staging Manager

**Solutions:**
1. Verify clip was saved to the staging folder configured in Charted Roots settings
2. Check that your template includes at least one clipper metadata property: `clip_source_type`, `clipped_from`, or `clipped_date`
3. Reload Obsidian (file watcher only detects files created after plugin loads)

### Dashboard Shows Zero Clips

**Problem:** Dashboard card shows "0 clips" even though you clipped notes

**Causes:**
- Files created before plugin loaded (file watcher limitation)
- Files missing clipper metadata properties
- Files saved outside staging folder

**Solution:** Create a new clip after reloading Obsidian to verify detection works.

### Filter Not Working

**Problem:** Toggle buttons in Staging Manager don't filter correctly

**Solutions:**
1. Verify clipped notes have clipper metadata in frontmatter
2. Check that Web Clipper template is saving metadata properties
3. Try closing and reopening Staging Manager (filter state resets on open)

### LLM Extraction Issues

**Problem:** Extracted data is inaccurate or fabricated

**Solutions:**
1. Use larger LLM models (Mistral 8B, Small 3.2)
2. Improve prompt with double quotes: `"birth date"` not `'birth date'`
3. Include Web Clipper variables in context field
4. Always verify data in staging before promoting
5. Consider CSS selectors for structured data (Find A Grave, FamilySearch)

---

## Related Pages

- [Data Entry](Data-Entry) — Other methods for adding genealogical data
- [Staging & Cleanup](Staging-And-Cleanup) — Managing staging folder and duplicates
- [Import & Export](Import-Export) — Bulk import from GEDCOM or Gramps

---

**Questions or suggestions?** Open an issue on [GitHub](https://github.com/banisterious/obsidian-charted-roots/issues).
