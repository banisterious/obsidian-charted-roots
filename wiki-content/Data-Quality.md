# Data Quality

Canvas Roots includes comprehensive data quality tools to help you maintain accurate, consistent genealogical data. These tools detect issues, preview changes, and apply fixes across your vault.

## Overview

Data quality tools are available in two contexts:

1. **During GEDCOM import** - Preview issues before any files are created
2. **Post-import** - Analyze and fix issues in existing person notes

## Post-Import Cleanup Workflow

After importing a GEDCOM file (especially a "messy" one with data quality issues), follow this recommended sequence:

### Step 1: Review the Quality Report
**Location:** Control Center → Data Quality tab → "Run analysis"

Start here to understand the scope of issues. The report shows:
- Overall quality score (0-100)
- Issues grouped by severity (errors, warnings, info)
- Completeness metrics

This gives you the big picture before diving into fixes.

### Step 2: Fix Bidirectional Relationships
**Location:** Control Center → Data Quality tab → "Fix bidirectional relationships"

Run this early — it ensures the family graph is internally consistent. If a child lists a parent, the parent should list the child. This step is essential for tree generation and navigation to work correctly.

### Step 3: Normalize Date Formats
**Location:** Control Center → Data Quality tab → "Normalize date formats"

Converts varied date formats (`15 Mar 1920`, `Mar 15, 1920`, etc.) to the standard `YYYY-MM-DD` format. Standardized dates enable proper sorting, filtering, and age calculations.

### Step 4: Normalize Gender Values
**Location:** Control Center → Data Quality tab → "Normalize gender values"

Converts `M`, `Male`, `F`, `Female` to canonical `male`/`female` values. Consistent gender values are required for parent role validation (father vs. mother).

### Step 5: Clear Orphan References
**Location:** Control Center → Data Quality tab → "Clear orphan references"

Removes `father_id` and `mother_id` values that point to non-existent people. This cleans up dangling references that can cause errors in tree generation.

### Step 6: Standardize Place Names
**Location:** Control Center → Places tab → "Standardize place variants"

Unifies spelling variations ("USA" vs "United States of America", state abbreviations). Consistent place names enable proper grouping and hierarchy building.

### Step 7: Geocode Places
**Location:** Control Center → Places tab → "Bulk geocode"

Looks up coordinates for place notes that don't have them. Required for map visualizations. Note: Rate-limited to 1 request/second.

### Step 8: Enrich Place Hierarchy
**Location:** Control Center → Places tab → "Enrich place hierarchy"

Uses geocoding API to fill in `contained_by` relationships (city → county → state → country). Creates proper place containment chains.

### Optional: Flatten Nested Properties
**Location:** Control Center → Data Quality tab → "Flatten nested properties"

If your GEDCOM import created nested frontmatter (e.g., `coordinates: { lat: ..., long: ... }`), this converts them to flat properties (`coordinates_lat`, `coordinates_long`). Flat properties work better with Obsidian's property editor.

---

## Control Center Data Quality Tab

Access the Data Quality tab from Control Center to analyze and fix issues in your existing data.

### Quality Report

The Quality Report analyzes all person notes and generates:

- **Quality Score** (0-100) - Overall data quality rating
- **Issues by Severity** - Errors, warnings, and informational items
- **Issues by Category** - Date, relationship, data format, references, etc.
- **Completeness Metrics** - Percentage of notes with birth dates, parents, etc.

### Issue Categories

#### Date Inconsistencies

| Issue | Severity | Description |
|-------|----------|-------------|
| Death before birth | Error | Death date is earlier than birth date |
| Future birth/death | Error | Date is in the future |
| Unreasonable age | Warning | Lifespan exceeds 120 years |
| Born before parent | Error | Child's birth predates parent's birth |
| Parent too young | Warning | Parent was under 12 at child's birth |
| Parent too old | Warning | Father over 80 or mother over 55 at birth |
| Born after parent death | Error | Birth after mother's death (or >1 year after father's) |

#### Relationship Inconsistencies

| Issue | Severity | Description |
|-------|----------|-------------|
| Gender/role mismatch | Warning | Female listed as father, or male as mother |
| Self-reference | Error | Person listed as their own parent/spouse |
| Circular relationship | Error | A is parent of B, B is parent of A |
| Duplicate spouse | Warning | Same person listed multiple times as spouse |

#### Missing Data

| Issue | Severity | Description |
|-------|----------|-------------|
| No parents | Info | Neither father nor mother defined |
| One parent only | Info | Only one parent defined |
| No birth date | Info | Birth date not recorded |
| No gender | Info | Gender not specified |

#### Orphan References

| Issue | Severity | Description |
|-------|----------|-------------|
| Orphan parent ref | Warning | Father/mother ID points to non-existent person |
| Orphan spouse ref | Warning | Spouse ID points to non-existent person |
| Orphan child ref | Warning | Child ID points to non-existent person |

#### Data Format Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Non-standard date | Info | Date not in YYYY-MM-DD or YYYY format |
| Invalid gender value | Warning | Gender value not recognized |
| Nested property | Warning | Frontmatter contains nested objects |
| Legacy type property | Info | Uses `type` instead of `cr_type` |

## Batch Operations

### Fix Bidirectional Relationships

Ensures all parent-child and spouse relationships are properly reciprocated.

**What it fixes:**
- Child lists parent, but parent doesn't list child in `children_id`
- Parent lists child, but child doesn't have `father_id`/`mother_id` set
- Person lists spouse, but spouse doesn't reciprocate

**Preview mode:** Shows all inconsistencies before applying fixes

**Conflict handling:** When two people both claim the same child as their own, the tool flags this for manual resolution rather than automatically overwriting.

### Normalize Date Formats

Converts various date formats to the standard YYYY-MM-DD format.

**Formats recognized:**
- `15 Mar 1920` → `1920-03-15`
- `Mar 15, 1920` → `1920-03-15`
- `15/03/1920` → `1920-03-15`
- `about 1920` → `1920`

### Normalize Gender Values

Converts gender values to canonical forms using the value alias system.

**Default mappings:**
- `M`, `Male` → `male`
- `F`, `Female` → `female`

**Customization:** Configure additional mappings in Settings → Value Aliases

### Clear Orphan References

Removes `father_id` and `mother_id` values that point to non-existent `cr_id` values.

**Use case:** After deleting person notes, clear dangling references

### Migrate Legacy Type Property

Migrates from the legacy `type` property to the namespaced `cr_type` property.

**When to use:** If upgrading from an older version that used `type: person` instead of `cr_type: person`

## Place Data Quality

The Places tab in Control Center includes several data quality tools for place names.

### Standardize Place Names

Unifies spelling variations of place names across your vault.

**Example:** "New York City", "NYC", "New York, NY" → standardized to your chosen form

### Standardize Place Variants

Normalizes common abbreviations and alternate forms:

**Countries:**
- "United States of America", "United States", "US" → "USA"
- "United Kingdom", "Great Britain" → "UK"

**US States:**
- "California", "Cal." → "CA"
- "New York" → "NY"

### Merge Duplicate Places

Combines separate place notes that represent the same location.

**Detection methods:**
- Case-insensitive matching on `full_name`
- Title + parent combination matching

### Standardize Place Types

Converts generic place types (like "locality") to specific types (city, town, village).

## GEDCOM Import Quality Preview

When importing a GEDCOM file, Canvas Roots analyzes the data before creating any files.

### What's Detected

- **Date issues** - Death before birth, future dates, impossible ages
- **Relationship issues** - Gender/role mismatches, circular references
- **Reference issues** - Pointers to non-existent records
- **Data completeness** - Missing names, unknown sex, no dates
- **Place variants** - Inconsistent place name formats

### Place Variant Standardization

During import preview, you can choose canonical forms for place names:

1. Review detected variants (e.g., "USA" vs "United States of America")
2. Select your preferred form for each variant group
3. Changes apply to both file names and frontmatter values

This ensures consistency from the start, avoiding post-import cleanup.

### Preview Actions

- **Proceed with import** - Apply your choices and create files
- **Cancel** - Abort without creating any files

## Best Practices

### Regular Maintenance

1. Run the Quality Report periodically (monthly or after major imports)
2. Address errors first, then warnings
3. Informational items can often be ignored (missing data may be unavailable)

### Before Sharing Data

1. Run bidirectional relationship fix to ensure consistency
2. Check for orphan references
3. Standardize date formats for interoperability

### After GEDCOM Import

1. Review the quality preview before importing
2. Standardize place variants during import
3. Run the Places tab tools to complete place hierarchy

### Data Entry Guidelines

- Use YYYY-MM-DD format for dates (or YYYY for year-only)
- Use `cr_type` instead of `type` for note types
- Keep frontmatter flat (avoid nested objects)
- Enter gender as `male`, `female`, or `nonbinary`
