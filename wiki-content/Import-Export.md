# Import & Export

Canvas Roots supports importing and exporting family data in GEDCOM, Gramps XML, and CSV formats.

## Table of Contents

- [GEDCOM Import/Export](#gedcom-importexport)
  - [Importing a GEDCOM File](#importing-a-gedcom-file)
  - [After Import](#after-import)
  - [Duplicate Handling](#duplicate-handling)
  - [Exporting to GEDCOM](#exporting-to-gedcom)
  - [Privacy Protection for Export](#privacy-protection-for-export)
- [Gramps XML Import](#gramps-xml-import)
  - [Supported File Formats](#supported-file-formats)
  - [Importing a Gramps File](#importing-a-gramps-file)
  - [What Gets Created](#what-gets-created)
  - [Place Linking](#place-linking)
  - [Supported Event Types](#supported-event-types)
  - [Limitations](#limitations)
- [CSV Import/Export](#csv-importexport)
  - [Importing from CSV/TSV](#importing-from-csvtsv)
  - [Exporting to CSV](#exporting-to-csv)
  - [Format Comparison](#format-comparison)
- [Selective Branch Export](#selective-branch-export)

## GEDCOM Import/Export

Canvas Roots provides full round-trip support for GEDCOM 5.5.1 format, allowing you to import family trees from popular genealogy software and export your Obsidian data back to GEDCOM format.

### Importing a GEDCOM File

**Using Control Center:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "GEDCOM" and **Direction** to "Import"
3. If folders aren't configured, expand **Configure folders** to set your people folder
4. Click **Import GEDCOM**
5. Select your `.ged` file
6. Review the file analysis (people, families, events, sources, places found)
7. Configure import options:
   - **Create people notes** - Person notes with relationships and life events (default: on)
   - **Create event notes** - Births, deaths, marriages, and other life events (default: on if events found)
   - **Create source notes** - Citations and references for genealogical records (default: on if sources found)
   - **Create place notes** - Locations with parent/child hierarchy (default: on if places found)
   - **Filename format** - Original (John Smith.md), Kebab-case (john-smith.md), or Snake_case (john_smith.md)
   - **Customize per note type** - Set different filename formats for each note type
8. Click **Import to vault** (or **Import to staging** if using staging folder)

**Data Quality Preview:**

Before any files are created, Canvas Roots analyzes the GEDCOM data and shows a quality preview modal if issues or place name variants are detected. This allows you to:

- **Review detected issues** organized by category:
  - **Dates**: Death before birth, future dates, events before birth/after death
  - **Relationships**: Gender/role mismatches, parent younger than child
  - **References**: Orphan references to non-existent records
  - **Data**: Missing names, unknown sex, no dates recorded

- **Standardize place name variants** before import:
  - Choose canonical forms for country names (e.g., "USA" vs "United States of America")
  - Standardize state abbreviations (e.g., "CA" vs "California")
  - Your choices affect both file names and frontmatter property values

- **Decide how to proceed**:
  - Click "Proceed with import" to apply your choices and continue
  - Click "Cancel" to abort without creating any files

This preview step ensures consistent data from the start, avoiding cleanup work after import.

**Progress Indicator:**

During import, a modal shows:
- Current phase (validating, parsing, places, sources, people, relationships, events)
- Progress bar with current/total count
- Running statistics (places, sources, people, events created)

**What Gets Created:**

| Note Type | What's Created |
|-----------|----------------|
| **People** | One note per individual with relationships, dates, places |
| **Events** | One note per life event (birth, death, marriage, etc.) linked to person |
| **Sources** | One note per GEDCOM source record with citation metadata |
| **Places** | Hierarchical place notes (city → county → state → country) |

**Supported GEDCOM Tags:**

*Individuals:*
- `INDI` - Individuals → person notes
- `NAME` - Person names
- `BIRT`/`DEAT` - Birth and death → event notes
- `DATE` - Event dates (with precision: `ABT`, `BEF`, `AFT`, `BET`)
- `PLAC` - Event locations → place wikilinks
- `FAMC`/`FAMS` - Family relationships
- `SEX` - Gender
- `_UUID` - Preserved as `cr_id`

*Events (create event notes):*
- **Core:** `BIRT`, `DEAT`, `MARR`, `DIV`
- **Life Events:** `BURI`, `CREM`, `ADOP`, `GRAD`, `RETI`, `CENS`
- **Career/Residence:** `RESI`, `OCCU`, `EDUC`
- **Legal/Estate:** `PROB`, `WILL`, `NATU`, `MILI`
- **Migration:** `IMMI`, `EMIG`
- **Religious:** `BAPM`, `CHR`, `CHRA`, `CONF`, `FCOM`, `ORDN`, `BARM`, `BASM`, `BLES`
- **Family:** `ENGA`, `MARB`, `MARC`, `MARL`, `MARS`, `ANUL`, `DIVF`

*Person Attributes (stored as properties):*
- `DSCR` → `physicalDescription`
- `IDNO` → `identityNumber`
- `NATI` → `nationality`
- `RELI` → `religion`
- `TITL` → `title`
- `PROP` → `property`
- `CAST` → `caste`
- `NCHI` → `childrenCount`
- `NMR` → `marriageCount`
- `SSN` → `ssn` (automatically redacted from exports)

*Sources:*
- `SOUR` - Source records → source notes
- `TITL` - Source title
- `AUTH` - Author
- `PUBL` - Publication info
- `REPO` - Repository

**Marriage Metadata (Enhanced Spouse Support):**
- `MARR` - Marriage events → `spouse1_marriage_date`
- `DIV` - Divorce events → `spouse1_divorce_date`
- `PLAC` - Marriage locations → `spouse1_marriage_location`

### After Import

1. **Wait for sync completion** - If bidirectional sync is enabled, Canvas Roots automatically processes all imported relationships. Progress notifications show sync status.
2. **Review imported notes** in your configured folders (People, Events, Sources, Places)
3. **Add research notes** below the frontmatter in each file
4. **Generate tree** using Control Center → Tree Generation

### Duplicate Handling

**Person Notes:**
If you import the same GEDCOM multiple times:
- Existing `cr_id` values are preserved
- Relationships are updated (not duplicated)
- New individuals are added
- Warnings appear for conflicts

**Place Notes:**
Place duplicate detection uses multiple strategies:
- **Primary:** Case-insensitive match on `full_name` property
- **Fallback:** Match by title + parent combination (for places with same name in different regions)
- Existing places are updated (missing parent links added) rather than duplicated

**State Abbreviation Normalization:**
US state abbreviations are automatically expanded to full names during import:
- Comma-separated: `Abbeville, SC, USA` → `Abbeville, South Carolina, USA`
- Space-separated: `Abbeville SC` → `Abbeville, South Carolina`

This prevents duplicate place notes from being created when GEDCOM data contains inconsistent state formats. All 50 US states plus DC are supported.

**Place Type Inference:**
When importing places, Canvas Roots uses context-aware type inference:
- Administrative division suffixes (County, Parish, Township, etc.) are detected
- When both "Abbeville" and "Abbeville County" exist as siblings, the non-suffixed version is inferred as a city/town rather than a county

### Exporting to GEDCOM

Export your family data back to GEDCOM format for sharing with other genealogy software or family members.

**Using Context Menu:**
1. Right-click on a folder containing person notes
2. Select **Export folder to GEDCOM**
3. Choose export options
4. Save the `.ged` file

**Using Control Center:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "GEDCOM" and **Direction** to "Export"
3. Click **Export GEDCOM**
4. Select the folder to export
5. Configure export options
6. Click **Export**

**What Gets Exported:**
- All person notes in the selected folder
- Relationships (parents, spouses, children)
- Birth and death dates/places
- Marriage metadata (dates, locations, divorce dates)
- `cr_id` values preserved as `_UUID` tags
- `group_name` values preserved as collection codes

### Privacy Protection for Export

Canvas Roots includes optional privacy controls for protecting living persons in GEDCOM exports:

**Enable Privacy Protection:**
1. Go to Settings → Canvas Roots → GEDCOM section
2. Enable "Privacy protection for living persons"
3. Configure the birth year threshold (default: 100 years ago)

**Privacy Options:**
- **Exclude living persons**: Completely remove potentially living people from export
- **Anonymize living persons**: Include structure but replace PII with "[Living]"

**How Living Status is Determined:**
- People without death dates AND born after the threshold year are considered potentially living
- Threshold is configurable (e.g., born after 1925 = potentially living)
- Family structure is maintained even when details are anonymized

**Use Cases:**
- Share family trees publicly without exposing living relatives' data
- Comply with genealogical privacy best practices
- Create "public" and "private" versions of your research

## Gramps XML Import

Canvas Roots supports importing family data from [Gramps](https://gramps-project.org/), a popular open-source genealogy application.

### Supported File Formats

- **`.gpkg`** - Gramps Package (recommended) — bundles XML data with media files
- **`.gramps`** - Native Gramps compressed format (gzip-compressed XML)
- **`.xml`** - Uncompressed Gramps XML export

> **💡 Tip:** Export from Gramps as `.gpkg` to include media files (photos, documents, scans). Canvas Roots will extract them to your vault automatically.

### Importing a Gramps File

**Using Control Center:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "Gramps XML" and **Direction** to "Import"
3. If folders aren't configured, expand **Configure folders** to set your people folder
4. Click **Import Gramps XML**
5. Select your `.gpkg`, `.gramps`, or `.xml` file
6. Review the file analysis (people, families, places, events, sources, media found)
7. Configure import options:
   - **Create source notes** - Source records with citations (default: on)
   - **Create place notes** - Location notes linked from person birth/death places (default: off)
   - **Create event notes** - Birth, death, marriage, and other life events (default: off)
8. Click **Import**

### What Gets Created

| Note Type | What's Created |
|-----------|----------------|
| **People** | One note per individual with relationships, dates, places, and linked media |
| **Sources** | One note per source record with citations and linked media |
| **Places** | One note per location (when enabled), linked from person notes, with linked media |
| **Events** | One note per life event (when enabled), linked to persons, places, and media |
| **Media** | Files extracted from `.gpkg` packages to your media folder |

### Place Linking

When you enable "Create place notes", Canvas Roots:
1. Creates place notes first
2. Automatically converts birth/death places in person notes to wikilinks
3. Links event notes to place notes as well

This creates a fully connected web of notes where you can navigate between people, events, and places.

### Supported Event Types

Gramps events are mapped to Canvas Roots event types:

| Gramps Event | Canvas Roots Type |
|--------------|-------------------|
| Birth | birth |
| Death | death |
| Marriage | marriage |
| Divorce | divorce |
| Burial | burial |
| Baptism, Christening | baptism |
| Confirmation | confirmation |
| Ordination | ordination |
| Residence | residence |
| Occupation | occupation |
| Military, Military Service | military |
| Immigration, Emigration, Naturalization | immigration |
| Education, Graduation | education |

Events not in this list are imported as "custom" type.

### Place Type Mapping

Gramps place types are preserved and mapped to Canvas Roots place types:
- Administrative: country, state, province, county, region, district, borough, municipality
- Populated: city, town, village, parish, neighborhood
- Specific: cemetery, church, building, farm, street, address

### After Import

1. Review imported notes in your configured folders
2. Add research notes below the frontmatter in each file
3. Generate tree using Control Center → Tree Generation

### Media Import from .gpkg

When importing a `.gpkg` package file, Canvas Roots:

1. **Extracts media files** to your configured media folder
2. **Links media to entities** — Photos, documents, and scans attached in Gramps are linked to the corresponding person, event, place, or source notes via the `media` frontmatter property
3. **Preserves order** — The first media item serves as the thumbnail (matching Gramps convention)

Media extracted from Gramps packages can be viewed using the [Media Gallery](Dynamic-Note-Content#media-block) dynamic block.

### Limitations

- **Notes**: Gramps note records are not imported as separate notes
- **Repositories**: Repository records create properties on sources but not separate notes

## CSV Import/Export

Canvas Roots supports CSV and TSV file formats for easy data exchange with spreadsheets and other applications.

### Importing from CSV/TSV

**Using Control Center:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "CSV" and **Direction** to "Import"
3. If folders aren't configured, expand **Configure folders** to set your people folder
4. Click **Import CSV**
5. Select your `.csv` or `.tsv` file
6. Review the auto-detected column mapping
7. Adjust mappings if needed
8. Click **Import**

**Auto-Detected Column Mapping:**

Canvas Roots automatically detects common column names and maps them to person properties:

| Detected columns | Maps to |
|-----------------|---------|
| name, full name, person | `name` |
| birth, born, birth date | `born` |
| death, died, death date | `died` |
| father, father name | `father` |
| mother, mother name | `mother` |
| spouse, spouse name | `spouse` |
| gender, sex | `gender` |

You can manually adjust any mapping before importing if the auto-detection doesn't match your file's column names.

**What Happens:**
- Creates one Markdown note per row
- Generates `cr_id` for each person automatically
- Creates relationship links when parent/spouse columns reference other people in the file
- Supports both wikilink format (`[[Name]]`) and plain text names

### Exporting to CSV

**Using Control Center:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "CSV" and **Direction** to "Export"
3. Click **Export CSV**
4. Select the folder to export
5. Configure columns to include
6. Enable privacy protection if needed
7. Click **Export**

**Configurable Columns:**

Choose which fields to include in your export:
- Core fields: name, cr_id, gender
- Dates: born, died
- Relationships: father, mother, spouse, children
- Metadata: collection, group_name, lineage

**Privacy Protection:**

Same privacy options as GEDCOM export:
- Exclude living persons entirely
- Anonymize living persons (replace PII with "[Living]")
- Configurable birth year threshold

### Format Comparison

| Feature | CSV | GEDCOM | Gramps XML |
|---------|-----|--------|------------|
| **Compatibility** | Spreadsheets, databases | Most genealogy software | Gramps only |
| **Structure** | Flat (one row per person) | Hierarchical (individuals + families) | Hierarchical with events |
| **Best for** | Quick edits, bulk changes | Software interchange | Gramps users |
| **Marriage data** | Limited | Full support | Full support |
| **Place hierarchy** | No | Limited | Yes |
| **Events** | No | Yes | Yes |
| **Sources** | No | Yes | Not yet |
| **Export support** | Yes | Yes | Import only |
| **Use case** | Working with data | Archiving/sharing | Migration from Gramps |

## Selective Branch Export

Export specific portions of your family tree rather than the entire dataset. Available for both GEDCOM and CSV formats.

### Branch Types

**Ancestors Only:**
Export only the ancestors (parents, grandparents, etc.) of a selected person.
- Useful for pedigree charts
- Creates focused lineage documentation
- Reduces file size for large trees

**Descendants Only:**
Export only the descendants (children, grandchildren, etc.) of a selected person.
- Useful for descendant reports
- Can optionally include spouses of descendants
- Great for sharing a specific family branch

### How to Use Selective Export

**In GEDCOM Export:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "GEDCOM" and **Direction** to "Export"
3. Click **Export GEDCOM**
4. Select "Branch export" mode
5. Choose a root person for the branch
6. Select branch type (ancestors or descendants)
7. Optionally enable "Include spouses" for descendant exports
8. Click **Export**

**In CSV Export:**
1. Open Control Center → **Import/Export** tab
2. Set **Format** to "CSV" and **Direction** to "Export"
3. Click **Export CSV**
4. Select "Branch export" mode
5. Choose a root person and branch type
6. Configure other options as needed
7. Click **Export**

### Combining with Collection Filtering

Selective branch export works together with collection filtering for precise exports:

1. Filter by collection to narrow the scope
2. Then apply branch selection to further refine
3. Result includes only people matching both criteria

**Example workflow:**
- Filter to "Maternal Line" collection
- Select branch: descendants of "Great-Grandmother Jane"
- Export only that specific branch within the maternal line

### Include Spouses Option

When exporting descendants, you can optionally include spouses:

- **Enabled**: Includes spouses of each descendant (helps show family units)
- **Disabled**: Exports only direct blood descendants

This option is particularly useful when you want complete family units rather than just the bloodline.
