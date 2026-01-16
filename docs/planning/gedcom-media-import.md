# GEDCOM Media (OBJE) Import

**GitHub Issue:** [#202](https://github.com/banisterious/obsidian-charted-roots/issues/202)

**Status:** Implemented

---

## Problem Statement

GEDCOM files contain media object references (OBJE tags) that point to image and document files. Currently, GEDCOM import ignores these references, while Gramps import fully supports media linking. Users who prefer GEDCOM import (for better place name handling, smaller file size, faster import) lose media associations.

---

## User Feedback

From @jeff962:

> The only reason I've been using the .gpkg format for importing is to preserve the links to the media files. So if the GEDCOM could import links to media files, that would be a good solution since it's smaller and faster.

**Key context:** User's `Charted Roots/Media` folder is a symlink to their external media storage location, which matches the paths in their GEDCOM file.

---

## Implementation Summary

Both Phase 1 and Phase 2 are complete. The GEDCOM importer now has full media support:

### Features Implemented

1. **GEDCOM media types** (`src/gedcom/gedcom-types.ts`)
   - `GedcomMedia` interface for top-level OBJE records
   - `GedcomInlineMedia` interface for embedded media
   - `mediaRefs` arrays on individual, family, source, and event types

2. **OBJE parsing** (`src/gedcom/gedcom-parser-v2.ts`)
   - Parses top-level `0 @Oxxxx@ OBJE` records into `media` Map
   - Collects `1 OBJE @Oxxxx@` references on INDI, FAM, SOUR
   - Supports inline OBJE (no pointer) with nested FILE/FORM/TITL
   - Handles event-level media (`2 OBJE` under BIRT, DEAT, MARR, etc.)

3. **Path resolution** (`src/gedcom/gedcom-importer-v2.ts`)
   - Extracts filename from GEDCOM FILE paths
   - Optional prefix stripping for complex path structures
   - Validates files exist in vault using `getFirstLinkpathDest`
   - Tracks and reports missing media files

4. **Frontmatter generation**
   - Adds `media` property with wikilinks to person notes
   - Adds `media` property to event notes
   - Format: `media: ["[[filename.jpg]]"]`

5. **Import wizard UI** (`src/ui/import-wizard-modal.ts`)
   - "Media references" toggle to enable/disable media import
   - "External media path prefix" text field
   - Live preview showing path → wikilink mappings (up to 3 samples)

6. **Validation & reporting**
   - Checks if resolved filenames exist in vault
   - Shows media count in import complete Notice
   - Separate Notice for missing files with filenames listed

---

## GEDCOM OBJE Structure

### Media Object Definition

```gedcom
0 @O0205@ OBJE
1 FILE /media/linuxstore/pictures/Ancestors/Hatfield/Hatfield_2022.jpg
2 FORM jpg
2 TITL Hatfield_2022
```

### Media References

References can appear on individuals, families, sources, and events:

```gedcom
0 @I001@ INDI
1 NAME Someone /Hatfield/
1 OBJE @O0205@

0 @F001@ FAM
1 HUSB @I001@
1 OBJE @O0210@

0 @S001@ SOUR
1 TITL Birth Certificate
1 OBJE @O0215@
```

### Inline Media (Alternative Format)

Some GEDCOM files embed media directly without separate OBJE records:

```gedcom
0 @I001@ INDI
1 NAME Someone /Hatfield/
1 OBJE
2 FILE /path/to/image.jpg
2 FORM jpg
2 TITL Photo of Someone
```

---

## Proposed Solution

Implement GEDCOM OBJE import with parity to Gramps media handling.

### Phase 1: Core Implementation

1. **Add types for GEDCOM media objects**
   - `GedcomMedia` interface with handle, file path, form, title
   - `mediaRefs` arrays on person, family, source, event types

2. **Parse top-level OBJE records**
   - Build `Map<string, GedcomMedia>` from `0 @Oxxxx@ OBJE` records
   - Extract FILE path, FORM (format), TITL (title)

3. **Parse OBJE references**
   - Collect `1 OBJE @Oxxxx@` on INDI, FAM, SOUR records
   - Support inline OBJE (no pointer) for direct file references

4. **Path resolution**
   - Use existing media folder setting for base path
   - Convert external paths to vault-relative wikilinks
   - Handle both absolute and relative paths

5. **Add media property to frontmatter**
   - Same format as Gramps import: `media: ["[[filename.jpg]]"]`
   - Apply to persons, sources (events and places if referenced)

### Phase 2: Enhanced Path Handling (Future)

1. **Import wizard path mapping**
   - UI to specify external path prefix to strip
   - Preview of resolved paths before import

2. **Path validation**
   - Check if resolved files exist in vault
   - Report missing files in import summary

---

## Technical Considerations

### Differences from Gramps Import

| Aspect | Gramps | GEDCOM |
|--------|--------|--------|
| Media bundled | Yes (.gpkg contains files) | No (paths only) |
| Extraction needed | Yes | No |
| Path format | Relative to `mediapath` | Often absolute |
| Handle format | `_xxxxxxx` | `@Oxxxx@` |

### Path Resolution Strategy

The user's scenario:
- GEDCOM path: `/media/linuxstore/pictures/Ancestors/Hatfield/Hatfield_2022.jpg`
- Vault media folder: `Charted Roots/Media` (symlink to `/media/linuxstore/pictures/Ancestors`)
- Desired wikilink: `[[Hatfield/Hatfield_2022.jpg]]`

**Approach:**
1. User configures "external media base path" in import options
2. Strip that prefix from GEDCOM FILE paths
3. Prepend vault media folder path (if needed for full path resolution)
4. Generate wikilink with filename or relative path

### Files to Modify

1. **`src/gedcom/gedcom-types.ts`**
   - Add `GedcomMedia` interface
   - Add `mediaRefs` to relevant interfaces

2. **`src/gedcom/gedcom-parser-v2.ts`**
   - Parse OBJE records into media map
   - Parse OBJE references on INDI, FAM, SOUR

3. **`src/gedcom/gedcom-importer-v2.ts`**
   - Resolve media paths to wikilinks
   - Add `media` property to frontmatter generation

4. **Import wizard UI** (optional for Phase 1)
   - Add media path mapping option

---

## Implementation Plan

### Phase 1: Core OBJE Import ✅

1. **Add GEDCOM media types** ✅
   - Define `GedcomMedia` interface
   - Add `mediaRefs: string[]` to person, family, source types

2. **Implement OBJE parsing** ✅
   - Parse top-level `0 @Oxxxx@ OBJE` records
   - Build media handle → path map
   - Parse `1 OBJE` references (both pointer and inline forms)

3. **Implement path resolution** ✅
   - Reuse Gramps pattern with `mediaHandleToPath` map
   - Convert FILE paths to vault-relative wikilinks
   - Use existing media folder setting

4. **Update frontmatter generation** ✅
   - Add `media` property with resolved wikilinks
   - Follow same format as Gramps import

5. **Add import option** ✅
   - Checkbox: "Import media references"
   - Text field: "External media path prefix" (to strip)

### Phase 2: Validation & Preview ✅

1. **Path validation** ✅ - Check if files exist in vault using `getFirstLinkpathDest`
2. **Preview UI** ✅ - Show path mappings before import in wizard (up to 3 samples with live updates)
3. **Missing file report** ✅ - Summary of unresolved media via Notice after import

---

## Resolved Questions

1. **Support for OBJE on events?**
   - ✅ Yes, include event OBJE support in Phase 1
   - Per @jeff962: ~90% of media is on individuals, ~9% on events (birth/death certificates), ~1% on other events (occupation, residence)
   - Event media is common enough to warrant inclusion from the start

2. **Default behavior for path resolution?**
   - ✅ Use filename only as the default (no prefix configured)
   - Filename-only wikilinks like `[[Hatfield_2022.jpg]]` resolve if the file exists anywhere in the vault
   - Full absolute paths are unlikely to match another user's vault structure
   - Users with complex folder structures can configure prefix stripping for precise control
   - Warn in import summary if potential filename collisions are detected

3. **Handle missing OBJE records?**
   - ✅ Warn and skip with summary reporting
   - Collect all missing references and report at end: "3 media references could not be resolved: @O999@, @O1001@, @O1002@"
   - Matches existing behavior for unresolved person handles, missing places, etc.
   - Informs user without blocking the import

---

## Related

- [Gramps Media Import](../../src/gramps/gramps-importer.ts) - Reference implementation
- [Media Management wiki](https://github.com/banisterious/obsidian-charted-roots/wiki/Media-Management)
- Issue #202 - Original feature request
