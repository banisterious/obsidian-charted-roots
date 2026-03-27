# Evidence & Source Management

Charted Roots provides tools for managing genealogical sources and evidence, helping you document your research with proper citations and track which ancestors are well-documented.

---

## Table of Contents

- [Overview](#overview)
- [Source Notes](#source-notes)
  - [Creating a Source Note](#creating-a-source-note)
  - [Source Note Properties](#source-note-properties)
  - [Source Types](#source-types)
- [Linking Sources to People](#linking-sources-to-people)
- [Person Roles in Sources](#person-roles-in-sources)
  - [Role Categories](#role-categories)
  - [Adding Roles via YAML](#adding-roles-via-yaml)
  - [Adding Roles via Modal](#adding-roles-via-modal)
  - [Querying by Role](#querying-by-role)
- [Source Indicators on Trees](#source-indicators-on-trees)
  - [Enabling Source Indicators](#enabling-source-indicators)
  - [How Indicators Appear](#how-indicators-appear)
  - [How It Works](#how-it-works)
- [Fact-Level Source Tracking](#fact-level-source-tracking)
  - [Enabling Fact-Level Tracking](#enabling-fact-level-tracking)
  - [Adding Sourced Facts](#adding-sourced-facts)
  - [Trackable Facts](#trackable-facts)
  - [Coverage Threshold](#coverage-threshold)
  - [Where Coverage Appears](#where-coverage-appears)
- [Citation Notes](#citation-notes)
  - [Citation Note Properties](#citation-note-properties)
  - [Creating Citations](#creating-citations)
  - [Where Citations Appear](#where-citations-appear)
  - [Citation Folder](#citation-folder)
- [Sources Bases Template](#sources-bases-template)
  - [Creating a Sources Base](#creating-a-sources-base)
  - [Included Views](#included-views)
- [Best Practices](#best-practices)
  - [Organizing Source Notes](#organizing-source-notes)
  - [Naming Conventions](#naming-conventions)
    - [Page-Level Naming for Multi-Page Records](#page-level-naming-for-multi-page-records)
  - [Media Organization](#media-organization)
- [Bulk Source Image Import](#bulk-source-image-import)
  - [Opening the Wizard](#opening-the-wizard)
  - [Wizard Steps](#wizard-steps)
  - [Filename Parsing](#filename-parsing)
  - [Tips for Best Results](#tips-for-best-results)
- [Link Media to Existing Sources](#link-media-to-existing-sources)
  - [Opening the Wizard](#opening-the-wizard-1)
  - [Wizard Steps](#wizard-steps-1)
  - [Tips for Best Results](#tips-for-best-results-1)
  - [Confidence Levels](#confidence-levels)
- [Transcription Tips](#transcription-tips)
  - [Workflow](#workflow)
- [Source Classification (Mills)](#source-classification-mills)
  - [The three axes](#the-three-axes)
  - [Example](#example)
  - [How it integrates](#how-it-integrates)
- [Further Reading](#further-reading)
- [Related Pages](#related-pages)

---

## Overview

Charted Roots' source management system is inspired by the **Genealogical Proof Standard (GPS)**, the methodology used by professional genealogists to build reliable family histories. The GPS emphasizes:

- **Reasonably exhaustive research** - Thoroughly search relevant sources before drawing conclusions
- **Complete and accurate citations** - Document where evidence comes from so others can verify
- **Analysis and correlation** - Evaluate each source's quality and how evidence fits together
- **Resolution of conflicts** - Address contradictory evidence rather than ignoring it
- **Written conclusions** - Document your reasoning in proof summaries

While Charted Roots doesn't enforce strict GPS compliance, the source management features are designed to support these practices. Source notes capture citation details, quality classifications help you evaluate evidence, and the Research Gaps Report identifies where more research is needed.

To track overall research progress toward GPS-compliant documentation, you can use the [`research_level`](Frontmatter-Reference#research-level) property on person notes. This 0-6 scale (based on Yvette Hoitink's "Six Levels of Ancestral Profiles") helps you identify which ancestors need more work.

The Evidence & Source Management features enable you to:

- Create **source notes** documenting evidence (census records, vital records, photos, etc.)
- Link sources to person notes for proper citation
- Display **source indicators** on generated trees showing research quality
- Manage sources with an **Obsidian Bases template**

## Source Notes

Source notes are structured markdown files that document your evidence. They use flat frontmatter properties following Obsidian best practices.

**⚠️ Nested Properties and Obsidian Compatibility**

Charted Roots uses nested YAML structures for certain advanced features (like the Evidence Service). Obsidian's property panel doesn't support nested properties and will show "Type mismatch" warnings for them.

**Important:** Do not click "update" on any property showing a type mismatch warning, as this will corrupt the data by converting it to `"[object Object]"` strings.

To view or edit nested properties, use **Source mode** (Settings → Editor → Properties in document → Source) instead of the property panel.

### Creating a Source Note

**Manual creation:**

Create a new markdown file with this frontmatter structure:

```yaml
---
cr_type: source
cr_id: source-1900-census-smith
title: "1900 US Federal Census - Smith Family"
source_type: census
source_date: "1900-06-01"
source_date_accessed: "2024-03-15"
source_repository: "Ancestry.com"
source_repository_url: "https://www.ancestry.com/..."
collection: "1900 United States Federal Census"
location: "New York, Kings County, Brooklyn"
media:
  - "[[attachments/Census 1900 Smith p1.jpg]]"
  - "[[attachments/Census 1900 Smith p2.jpg]]"
confidence: high
---

# 1900 US Federal Census - Smith Family

## Transcription

Line 42: John Smith, Head, Male, White, Age 35, Married...

## Research Notes

This census confirms John's occupation as "carpenter" and lists 4 children.
```

**Using Bases:**

1. Right-click on a folder
2. Select "New sources base from template"
3. Use the table interface to create and edit sources

**Using the Import Wizard:**

See [Bulk Source Image Import](#bulk-source-image-import) below for importing multiple images at once.

### Source Note Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `cr_type` | string | Yes | Always `"source"` |
| `cr_id` | string | Yes | Unique identifier |
| `title` | string | Yes | Descriptive title |
| `source_type` | enum | Yes | Type of source (see below) |
| `source_date` | string | No | Date of the original document |
| `source_date_accessed` | string | No | When source was accessed |
| `source_repository` | string | No | Where source is held (archive, website) |
| `source_repository_url` | string | No | URL to online source |
| `collection` | string | No | Collection or record group name |
| `location` | string | No | Geographic location of record |
| `media` | array | No | Array of media file wikilinks |
| `confidence` | enum | No | `high`, `medium`, `low`, `unknown` |
| `source_quality` | enum | No | `primary`, `secondary`, `derivative` |
| `source_classification` | enum | No | `original`, `derivative`, `authored_narrative` |
| `information_classification` | enum | No | `primary`, `secondary`, `undetermined` |
| `evidence_classification` | enum | No | `direct`, `indirect`, `negative` |

### Source Types

| Type | Description |
|------|-------------|
| `census` | Population census records |
| `vital_record` | Birth, death, marriage certificates |
| `church_record` | Baptism, marriage, burial records |
| `photograph` | Photographs and portraits |
| `correspondence` | Letters, emails, postcards |
| `newspaper` | Newspaper articles |
| `obituary` | Death notices, memorial articles |
| `military_record` | Service records, draft cards, pensions |
| `immigration` | Ship manifests, naturalization, passports |
| `court_record` | Legal proceedings, divorces |
| `land_record` | Property records, deeds |
| `will` | Wills |
| `probate` | Estate inventories |
| `oral_history` | Interviews, recordings |

## Linking Sources to People

Source notes link to person notes using wikilinks in the note body. When a source note contains a link like `[[John Smith]]`, Charted Roots detects this connection automatically.

**Example source note linking to people:**

```markdown
---
cr_type: source
title: "1900 Census - Smith Household"
source_type: census
---

# 1900 Census - Smith Household

## People in this record

- [[John Smith]] - Head of household
- [[Mary Smith]] - Wife
- [[Robert Smith]] - Son

## Transcription
...
```

Charted Roots uses Obsidian's `resolvedLinks` to detect these connections, so any valid wikilink from a source to a person note will be counted.

## Person Roles in Sources

Genealogical source documents often name multiple people in different capacities—a death certificate names the deceased, informant, spouse, parents, and officials. Person roles let you track these relationships to support FAN (Friends, Associates, Neighbors) network research and assess information quality.

### Role Categories

Charted Roots recognizes seven canonical role categories:

| Role Property | Description | Examples |
|---------------|-------------|----------|
| `principals` | Subject(s) of the document | Deceased, testator, groom/bride |
| `witnesses` | Named witnesses | Signing witnesses, event witnesses |
| `informants` | Person providing information | Death certificate informant |
| `officials` | Authority figures | Clerks, judges, officiants, physicians |
| `enslaved_individuals` | Persons listed as property | Named in wills, inventories, appraisements |
| `family` | Family members of principals | Named relatives |
| `others` | Catch-all | Any role not fitting above |

### Adding Roles via YAML

Role entries use wikilink syntax with optional display text for role details:

```yaml
---
cr_type: source
source_type: probate
title: "Estate Inventory of John Smith Sr."
date: 1817-03-15

principals:
  - "[[John Smith Sr.|John Smith Sr. (Decedent)]]"
officials:
  - "[[Thomas Brown|Thomas Brown (Administrator)]]"
  - "[[James Wilson|James Wilson (Appraiser)]]"
enslaved_individuals:
  - "[[Mary]]"
  - "[[Peter]]"
family:
  - "[[John Smith Jr.|John Smith Jr. (Heir)]]"
---
```

The format is `"[[Link Target|Display Name (Role Details)]]"`. The role details in parentheses are optional and extracted for display in reports.

### Adding Roles via Modal

When creating or editing a source note via the Create/Edit Source modal:

1. Expand the **Person roles** section
2. Click **Add person**
3. Select a person from the picker
4. Choose a role category
5. Optionally add role details (e.g., "Administrator", "Heir")
6. Click **Add**

The modal writes the role to the appropriate frontmatter array automatically.

### Querying by Role

**DataView example** — Find all sources where a person was a witness:

```dataview
TABLE title, date
FROM "Sources"
WHERE contains(witnesses, "[[John Smith]]")
```

**Bases filter** — In an Obsidian Base, filter sources by role:
- Filter: `witnesses` contains `[[John Smith]]`
- Or use formula: `contains(witnesses, "John Smith")`

**Sources by Role report** — Generate a report from the Control Center showing all sources where a person appears by role. See [Statistics & Reports](Statistics-And-Reports#sources-by-role) for details.

**Dynamic block** — Display roles in a source note using the `charted-roots-source-roles` block. See [Dynamic Note Content](Dynamic-Note-Content#source-roles-block) for details.

## Source Indicators on Trees

When generating family trees, you can display badges showing how many sources link to each person. This provides at-a-glance research quality visibility.

### Enabling Source Indicators

1. Go to **Settings > Charted Roots > Canvas styling**
2. Enable **"Show source indicators"**
3. Generate or regenerate a family tree

### How Indicators Appear

- Nodes show badges like "📎 3" indicating 3 linked sources
- **Green badges** (3+ sources): Well-documented person
- **Yellow badges** (1-2 sources): Some documentation
- **No badge**: No sources linked yet

### How It Works

During tree generation, Charted Roots:

1. Scans all notes with `cr_type: source` frontmatter
2. Counts how many link to each person note
3. Adds small text nodes near person nodes showing the count

This helps you identify which ancestors need more research at a glance.

## Fact-Level Source Tracking

While [source indicators](#source-indicators-on-trees) show how many sources link to a person, **fact-level source tracking** goes deeper — it records *which specific facts* about a person have source citations. This aligns with the GPS principle that each key claim should be supported by evidence.

When enabled, person notes display a coverage score (e.g., "3/10 facts sourced") in the Control Center's Data Quality card and the Entity Profile View.

### Enabling Fact-Level Tracking

1. Go to **Settings > Charted Roots > Advanced > Research tools**
2. Enable **"Enable fact-level source tracking"**

### Adding Sourced Facts

Add `sourced_*` properties to a person note's frontmatter, listing the source notes that support each fact as wikilink arrays:

```yaml
sourced_birth_date:
  - "[[Birth Certificate - John Smith]]"
  - "[[1870 Census - Smith Family]]"
sourced_birth_place:
  - "[[Birth Certificate - John Smith]]"
sourced_parents:
  - "[[1870 Census - Smith Family]]"
sourced_occupation:
  - "[[1900 Census - Smith Family]]"
```

Each property is a simple array of source wikilinks, compatible with Obsidian's property panel.

**Important distinctions:**
- A **missing property** means the fact hasn't been tracked yet
- An **empty array** (`sourced_birth_date: []`) means the fact is explicitly marked as unsourced

### Trackable Facts

There are 10 fact types you can track:

| Property | Description |
|----------|-------------|
| `sourced_birth_date` | Sources for date of birth |
| `sourced_birth_place` | Sources for location of birth |
| `sourced_death_date` | Sources for date of death |
| `sourced_death_place` | Sources for location of death |
| `sourced_parents` | Sources for parent relationships |
| `sourced_spouse` | Sources for spouse relationships |
| `sourced_marriage_date` | Sources for date of marriage |
| `sourced_marriage_place` | Sources for location of marriage |
| `sourced_occupation` | Sources for occupation |
| `sourced_residence` | Sources for residence locations |

### Coverage Threshold

Not every person will have all 10 facts applicable (e.g., an ancestor who never married won't have marriage facts). The **fact coverage threshold** setting controls how many sourced facts count as "100% coverage."

- Go to **Settings > Charted Roots > Advanced > Research tools > Fact coverage threshold**
- Default: **6** — sourcing 6 of the 10 facts gives 100% coverage
- Adjust based on your research goals

### Where Coverage Appears

Once you add `sourced_*` properties, coverage data shows up in several places:

- **Control Center > Data Quality** — Research gaps card showing unsourced and weakly sourced facts across your vault, grouped by fact type
- **Entity Profile View** — Data quality section showing coverage percentage for the current person
- **Source indicators on trees** — When coverage display is enabled, tree badges show the coverage percentage alongside the source count
- **Reports** — Source summary and research gaps reports include fact coverage statistics

## Citation Notes

Citation notes provide per-citation metadata — linking a specific source to a specific fact on a person with page references and quality assessments. Each citation note represents one citation occurrence, mapping 1:1 to GEDCOM's `SOUR` blocks with `PAGE` and `QUAY` sub-tags.

### Citation Note Properties

| Property | Description | Example |
|----------|-------------|---------|
| `cr_type` | Always `citation` | `citation` |
| `cr_id` | Auto-generated unique ID | `abc-123-def-456` |
| `source` | Wikilink to the source note | `"[[Census 1850]]"` |
| `subject` | Wikilink to the person or event note | `"[[John Smith]]"` |
| `fact` | The frontmatter property being supported | `birth_date` |
| `page` | Page, entry, or location within the source | `p. 42, entry 15` |
| `quality` | Quality assessment (0–3, GEDCOM QUAY) | `3` |

**Quality values:**
- **0** — Unreliable
- **1** — Questionable
- **2** — Secondary evidence
- **3** — Primary evidence

### Creating Citations

**Manually:** Open a person note and run "Charted Roots: Add citation to current note" from the command palette or the command menu (Edit > Add citation). Select a source, choose the fact being cited, and optionally enter a page reference and quality rating.

**On GEDCOM import:** Citation notes are automatically generated from `SOUR` blocks that contain `PAGE` or `QUAY` metadata. Person notes are updated with a `citations` array linking to the generated notes.

### Where Citations Appear

- **Entity Profile View** — person profiles show a "Citations" section (after Sources) listing citations grouped by source, with fact labels, page references, and color-coded quality badges
- **GEDCOM export** — citation metadata is written back as `PAGE` and `QUAY` sub-tags under `SOUR` references
- **Gramps export** — citation metadata is written as `spage` and `confidence` elements within `sourceref` tags

### Citation Folder

Citation notes are stored in the Citations folder (default: `Charted Roots/Citations`). This is configurable in Settings > Folders.

## Sources Bases Template

Charted Roots includes a pre-configured Obsidian Bases template for managing sources in a spreadsheet-like interface.

### Creating a Sources Base

1. Right-click on a folder containing source notes
2. Select **"New sources base from template"**
3. A `.base` file is created with pre-configured views

### Included Views

| View | Description |
|------|-------------|
| All Sources | Complete inventory |
| By Type | Grouped by source_type |
| By Repository | Grouped by repository |
| By Confidence | Grouped by confidence level |
| Vital Records | Filtered to vital_record type |
| Census Records | Filtered to census type |
| Church Records | Filtered to church/parish records |
| Legal Documents | Wills, probate, land, court records |
| Military Records | Filtered to military_record type |
| Photos & Media | Photographs and newspapers |
| High Confidence | Only high-confidence sources |
| With Media | Sources that have media attached |
| Missing Media | Sources without media |
| By Date | Sorted by document date |
| Recently Accessed | Sorted by access date |
| By Collection | Grouped by collection name |
| By Location | Grouped by location |
| Media Gallery | Cards view with media as cover image |

## Best Practices

### Organizing Source Notes

- **One source per document**: Create separate notes for each distinct record
- **Reuse for families**: A census image can link to multiple family members
- **Use descriptive titles**: Include year, type, and key names
- **Add transcriptions**: Keep the original text in the note body

### Naming Conventions

Consider consistent naming for source notes:

- `1900 Census - Smith Family - Brooklyn NY`
- `Birth Certificate - John Smith - 1865`
- `Marriage License - Smith-Jones - 1890`

#### Page-Level Naming for Multi-Page Records

For census records, tax rolls, and other records where you capture multiple pages, consider naming by enumeration district (ED) and page number rather than by surname. This allows you to:

- Link multiple families or individuals to the same page
- Capture pages before and after your target for FAN (Friends, Associates, Neighbors) research
- Document enslaved ancestor research where multiple individuals appear on the same schedule

**Pattern:** `YYYY-recordType_State_County_Locality-ED-p`

**Examples:**
- `1880-census_SC_Chester_Baton-Rouge-ED37-p60`
- `1850-slave-schedule_VA_Henrico-ED12-p3`
- `1870-census_TN_Davidson_Nashville-ED45-p22`

This approach is especially valuable for:
- **Enslaved ancestor research** — Slave schedules and property records often need full-page context
- **FAN cluster analysis** — Neighbors and associates appear on adjacent enumeration pages
- **Urban research** — Multiple families of interest may appear on the same tenement page

### Media Organization

For source media files (images, PDFs):

- Store in a dedicated attachments folder
- Use descriptive filenames: `1900-census-smith-brooklyn-p1.jpg`
- Link via the `media` property in frontmatter

## Bulk Source Image Import

The **Import Source Images** wizard helps you bulk-import a folder of scanned documents or photos, automatically parsing filenames to extract metadata and creating source notes.

### Opening the Wizard

1. Open **Control Center** (ribbon icon or command palette)
2. Go to the **Sources** tab
3. Click **Import** next to "Import source images"

### Wizard Steps

#### Step 1: Select Folder

Choose the vault folder containing your source images.

**Filter options:**
- **Exclude thumbnails** - Skips files starting with `thumb_` or `thumbnail_`
- **Exclude non-images** - Skips `.txt`, `.doc`, `.pdf`, and other non-image files

The wizard shows a count of how many files will be processed.

#### Step 2: Rename Files (Optional)

Toggle **Standardize filenames** to rename files to a consistent format based on parsed metadata:

```
surname_given_byyyy_type_yyyy_location.ext
```

Example: `smith_john_b1865_census_1900_usa_ny.jpg`

The table shows:
- **Current name** - Original filename
- **Proposed name** - Suggested standardized name (editable)

Conflicts are highlighted if two files would have the same name. You can edit proposed names to resolve conflicts.

#### Step 3: Review Parsed Data

Review and edit the metadata extracted from filenames:

| Column | Description |
|--------|-------------|
| Filename | Final filename (after optional renaming) |
| Surnames | Extracted family names |
| Year | Record year (census year, document date) |
| Type | Source type (census, vital_record, etc.) |
| Location | Extracted place information |
| Multi-part | Groups multi-page documents together |
| Confidence | Parser confidence (green/yellow/red dot) |

**Editable fields:** Click any cell in Surnames, Year, Type, or Location to correct the parsed value.

**Multi-part documents:** Files with part indicators (`_p1`, `_p2`, `_a`, `_b`, `_page1`, etc.) are automatically grouped. All pages in a group will be linked to the same source note.

**Confidence indicators:**
- 🟢 **High** - Extracted surname + type + year
- 🟡 **Medium** - Extracted surname + (type OR year)
- 🔴 **Low** - Minimal information extracted

#### Step 4: Configure

Set where source notes will be created:

- **Source notes folder** - Destination folder for new source notes (default: your Sources folder from settings)

**Import summary** shows:
- Total source notes to create
- Total images to link
- Multi-part groups detected

#### Step 5: Execute

Click **Start import** to begin. The wizard:

1. Renames files (if enabled)
2. Creates source notes with parsed metadata
3. Links images via `media` properties
4. Shows progress and results

Results display:
- Number of sources created
- Number of images linked
- Log of each created source note

### Filename Parsing

The parser recognizes common genealogy naming patterns:

| Pattern | Example | Extracted |
|---------|---------|-----------|
| `surname_year_type` | `smith_1900_census.jpg` | Smith, 1900, census |
| `surname_given_byear_type` | `smith_john_b1865_birth.jpg` | Smith, John, b.1865, vital_record |
| `surname_year_place_type` | `smith_1920_usa_ny_census.jpg` | Smith, 1920, USA/NY, census |
| `surname_given_type_year` | `smith-john-census-1900.jpg` | Smith, John, 1900, census |
| Descriptive | `Birth Certificate - John Smith 1865.jpg` | Smith, John, 1865, vital_record |

**Recognized type keywords:**
- Census: `census`, `cens`
- Vital records: `birth`, `death`, `marriage`, `divorce`
- Military: `draft`, `wwi`, `wwii`, `military`, `civil_war`
- Immigration: `passenger`, `immigration`, `naturalization`, `pas_list`
- Other: `obit`, `obituary`, `will`, `probate`, `cemetery`, `gravestone`

**Multi-part indicators:**
- `_p1`, `_p2`, `_p3` (page numbers)
- `_a`, `_b`, `_c` (letters)
- `_01`, `_02` (numbered)
- `_page1`, `_page2`
- `_part1`, `_partA`

### Tips for Best Results

**Before importing:**

1. **Organize images** in a dedicated folder
2. **Rename consistently** if possible - the parser works best with `surname_year_type` patterns
3. **Remove duplicates** - the wizard doesn't detect duplicate images

**Filename best practices:**

```
thornwood_george_b1843_census_1870_usa_tn.jpg
calloway_1920_usa_ok_census_p1.jpg
smith_john_birth_1865.jpg
```

**After importing:**

1. Review created source notes
2. Add transcriptions and research notes
3. Link sources to person notes by adding wikilinks

## Link Media to Existing Sources

The **Link Media to Sources** wizard helps you attach images to source notes that don't already have media. This is useful when you have existing source notes (e.g., from GEDCOM import) and images that should be linked to them.

### Opening the Wizard

1. Open **Control Center** (ribbon icon or command palette)
2. Go to the **Sources** tab
3. Click **Link** next to "Link media to sources"

### Wizard Steps

#### Step 1: Select Folder

Choose the vault folder containing images to link. The wizard only shows **source notes without media** as potential targets.

A preview shows:
- Number of images found in the folder
- Number of source notes without media available to link

#### Step 2: Link Images to Sources

For each image, select which source note to attach it to.

**Smart suggestions:** The wizard analyzes filenames and scores potential matches based on:
- Surname matches (e.g., "smith" in filename matches "Smith Family Census")
- Year matches (e.g., "1900" in filename matches source with 1900 date)
- Type keywords (e.g., "census" in filename matches census source type)
- Location matches (e.g., "chicago" in filename matches source location)

**UI indicators:**
- **Confidence dots** - 🟢 High (strong match), 🟡 Medium, 🟠 Low, ⚪ None
- **Auto-selection** - Top suggestion is pre-selected when available
- **"+N more" badge** - Shows when alternative suggestions exist
- **Yellow highlighting** - Rows without suggestions need manual selection
- **Summary** - Shows "X auto-matched, Y need manual selection"

**Dropdown options:**
- **Suggestions group** - Top matches with match reasons shown
- **All sources group** - Complete list for manual selection

#### Step 3: Review

Review your selections before applying:
- Summary of images to link and sources to update
- List of all image → source mappings

#### Step 4: Execute

Click **Link media** to apply changes. The wizard:
1. Updates each source note's frontmatter with media wikilinks
2. Adds images to the `media` array property
3. Shows progress and results

### Tips for Best Results

**Naming images:** Use consistent naming that includes clues:
- `smith_census_1900.jpg` → matches sources with "Smith", "census", "1900"
- `henderson_obituary_1945.jpg` → matches obituary sources with "Henderson", "1945"

**Manual selection:** For images with generic names like `Document (3).jpg` or `Voice Memo 2020-03-15.jpg`, you'll need to manually select the correct source from the dropdown.

**Multiple images per source:** You can link multiple images to the same source note. Each additional image is appended to the `media` array.

### Confidence Levels

Use confidence to track source reliability:

| Level | When to Use |
|-------|-------------|
| `high` | Original records, official documents |
| `medium` | Secondary sources, family records |
| `low` | Unverified claims, conflicting information |
| `unknown` | Not yet evaluated |

## Transcription Tips

Charted Roots doesn't include built-in OCR, but you can transcribe documents using external tools:

| Tool | Best For |
|------|----------|
| [Transkribus](https://transkribus.eu/) | Historical handwriting |
| [FamilySearch Indexing](https://www.familysearch.org/indexing/) | Already indexed records |
| Claude/GPT-4 | General image transcription |
| Manual transcription | Difficult handwriting |

### Workflow

1. Create source note with metadata and media link
2. Open image in external tool or AI chat
3. Paste transcription into source note body
4. Add research notes interpreting the transcription

## Source Classification (Mills)

Charted Roots supports the three-axis classification system from Elizabeth Shown Mills' *Evidence Explained*. These optional properties provide finer-grained analysis than the basic `source_quality` property, and are available in the Create Source modal under the collapsible "Source classification (Mills)" section.

### The three axes

| Axis | Property | Question | Values |
|------|----------|----------|--------|
| Source | `source_classification` | What is the document? | `original`, `derivative`, `authored_narrative` |
| Information | `information_classification` | Who provided the information? | `primary`, `secondary`, `undetermined` |
| Evidence | `evidence_classification` | How does it relate to the research question? | `direct`, `indirect`, `negative` |

These are independent of each other — the same document can be an *original* source providing *secondary* information that serves as *indirect* evidence.

### Example

A death certificate is typically:
- **Source:** Original (the document itself is a first recording)
- **Information:** Mixed — the date and place of death are primary (recorded by the attending physician), but the parents' names are secondary (reported by an informant from memory)
- **Evidence:** Direct for the death event, indirect for the parents' identities

### How it integrates

When `information_classification` is set on a source, the evidence analysis system uses it instead of `source_quality` to determine whether a source counts as "primary" or "secondary" in the Research Gaps Report and proof summaries. Sources with only `source_quality` continue to work as before.

The Source Summary and Sources by Role reports conditionally display classification columns when any source has Mills data.

For detailed property documentation, see [Frontmatter Reference — Source Classification](Frontmatter-Reference#source-classification-mills-evidence-explained).

## Further Reading

The source classification and citation practices in Charted Roots are informed by established genealogical methodology:

- **Elizabeth Shown Mills**, *Evidence Explained: Citing History Sources from Artifacts to Cyberspace* (3rd ed., 2015) - The definitive guide to genealogical citation, introducing the distinction between sources, information, and evidence
- **Board for Certification of Genealogists**, *Genealogy Standards* (2nd ed., 2019) - Defines the Genealogical Proof Standard (GPS) and professional research practices

## Related Pages

- [Research Workflow](Research-Workflow) - GPS-aligned research projects, reports, and IRNs
- [Canvas Trees](Visual-Trees) - Generate trees with source indicators
- [Frontmatter Reference](Frontmatter-Reference) - Complete property documentation
- [Bases Integration](Bases-Integration) - Using Obsidian Bases for data management
- [Roadmap](Roadmap) - Planned source management features
