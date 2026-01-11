# GEDCOM Notes Support

- **Status:** Planning
- **Target Version:** TBD
- **GitHub Issue:** [#179](https://github.com/banisterious/obsidian-charted-roots/issues/179)
- **Created:** 2026-01-11
- **Origin:** User feedback from wilbry

---

## Overview

Import `NOTE` tags from GEDCOM files into person notes and family/event notes. This captures valuable research notes, informal source references, and family stories that pre-date modern sourcing standards (GPS). Also export notes back to GEDCOM for round-trip compatibility.

## Motivation

Many GEDCOM files—especially those from older software like PAF—contain valuable research context in NOTE fields:

> "Information from PERSON in letter of September 25, 1990"

These notes represent potential source leads that shouldn't be lost during import.

## GEDCOM NOTE Structure

GEDCOM supports notes at multiple levels:

### Individual-level notes

```gedcom
0 @I123@ INDI
1 NAME John /Smith/
1 NOTE This person was known to have lived in Boston.
2 CONT Additional line of the note.
2 CONC  continued on same line
```

### Family-level notes

```gedcom
0 @F001@ FAM
1 HUSB @I001@
1 WIFE @I002@
1 NOTE The couple eloped against family wishes.
```

### Referenced notes (shared across records)

```gedcom
0 @N001@ NOTE
1 CONC This is a shared note that can be referenced
1 CONT by multiple individuals or events.

0 @I123@ INDI
1 NAME John /Smith/
1 NOTE @N001@
```

### Event-level notes (already partially supported)

```gedcom
0 @I123@ INDI
1 BIRT
2 DATE 1 JAN 1900
2 NOTE Born at home during a snowstorm.
```

Event-level notes are captured in `event.description`, but `CONT`/`CONC` handling needs enhancement.

## Implementation

### Phase 0: Preprocessor enhancement for CONT

**File:** `src/gedcom/gedcom-preprocessor.ts`

The preprocessor already handles `CONC` (concatenation without newline). Add support for `CONT` (continuation with newline):

```typescript
// In normalizeConcFields or new normalizeContinuationFields:
// Handle CONT lines - join with newline character
if (/^\s*\d+\s+CONT\s/.test(lines[i + 1])) {
    // Similar logic to CONC but join with '\n' instead of ''
}
```

This ensures multi-line notes are properly assembled before reaching the parser.

### Phase 1: Parse individual-level notes

**File:** `src/gedcom/gedcom-types.ts`

Add notes field to individual interface:

```typescript
export interface GedcomIndividualV2 {
    // ... existing fields ...

    /** Individual-level notes (1 NOTE under INDI) - inline text */
    notes: string[];
    /** References to shared NOTE records */
    noteRefs: string[];
}
```

**File:** `src/gedcom/gedcom-parser-v2.ts`

Parse `1 NOTE` tags under INDI records:

```typescript
// In parseIndividualLine for level 1:
case 'NOTE':
    // Check if this is a reference (@N123@) or inline note
    if (value.startsWith('@') && value.endsWith('@')) {
        // Store reference for later resolution
        individual.noteRefs = individual.noteRefs || [];
        individual.noteRefs.push(value.replace(/@/g, ''));
    } else {
        // Inline note (CONT/CONC already handled by preprocessor)
        individual.notes = individual.notes || [];
        individual.notes.push(value);
    }
    break;
```

### Phase 1b: Parse family-level notes

**File:** `src/gedcom/gedcom-types.ts`

Add notes field to family interface:

```typescript
export interface GedcomFamilyV2 {
    // ... existing fields ...

    /** Family-level notes (1 NOTE under FAM) */
    notes: string[];
    /** References to shared NOTE records */
    noteRefs: string[];
}
```

**File:** `src/gedcom/gedcom-parser-v2.ts`

Parse `1 NOTE` tags under FAM records (same pattern as INDI).

### Phase 2: Parse referenced NOTE records

**File:** `src/gedcom/gedcom-types.ts`

Add note record type:

```typescript
export interface GedcomNoteRecord {
    id: string;      // e.g., "N001"
    text: string;    // Full note content
}
```

Add to parsed data:

```typescript
export interface GedcomDataV2 {
    // ... existing fields ...
    notes: Map<string, GedcomNoteRecord>;
}
```

**File:** `src/gedcom/gedcom-parser-v2.ts`

Add `NOTE` case to the level-0 record switch in `parseMainRecords`:

```typescript
// In the level 0 switch:
case 'NOTE':
    // Start parsing a new NOTE record
    currentNote = {
        id: line.xref || '',
        text: line.value || ''
    };
    break;
```

Resolve references during import by looking up `noteRefs` in `data.notes` map.

### Phase 3: Write notes to person/event notes (embedded)

**File:** `src/gedcom/gedcom-importer-v2.ts`

Format notes and add to `personData.notesContent`:

```typescript
// After resolving all notes for a person (inline + referenced)
const allNotes = [
    ...(individual.notes || []),
    ...(individual.noteRefs || []).map(ref => data.notes.get(ref)?.text).filter(Boolean)
];
if (allNotes.length > 0) {
    personData.notesContent = formatGedcomNotesSection(allNotes);
}
```

### Phase 3b: Write family notes to marriage events

Family-level notes are associated with the marriage relationship. Options:

1. **Add to both spouses' notes** with context: "Family note (with {spouse name})"
2. **Add to marriage event** if events are being imported
3. **Create a separate family note file** linking to both spouses

Recommended approach: Add to marriage event description or create relationship note.

**File:** `src/gedcom/gedcom-note-formatter.ts` (new)

```typescript
/**
 * Format GEDCOM notes as markdown section
 */
export function formatGedcomNotesSection(notes: string[]): string {
    if (notes.length === 0) return '';

    const sections: string[] = ['## Notes', ''];

    for (let i = 0; i < notes.length; i++) {
        // Use "GEDCOM Note" or "GEDCOM Note 1", "GEDCOM Note 2" for multiple
        const header = notes.length === 1
            ? 'GEDCOM note'
            : `GEDCOM note ${i + 1}`;

        sections.push(`### ${header}`);
        sections.push('');
        sections.push(notes[i]);
        sections.push('');
    }

    return sections.join('\n');
}
```

### Phase 4: Optional separate note files

**File:** `src/gedcom/gedcom-types.ts`

Add import option:

```typescript
export interface GedcomImportOptionsV2 {
    // ... existing options ...

    /** Whether to import notes attached to individuals (default: true) */
    importNotes?: boolean;
    /** Whether to create separate note files instead of embedding (default: false) */
    createSeparateNoteFiles?: boolean;
    /** Folder for separate note files (default: Charted Roots/Notes) */
    notesFolder?: string;
}
```

**File:** `src/gedcom/gedcom-importer-v2.ts`

When `createSeparateNoteFiles` is enabled:

1. Create note files in `notesFolder` with naming: `Note for {Person Name}.md`
2. For multiple notes: `Note 1 for {Person Name}.md`, `Note 2 for {Person Name}.md`
3. Add wikilinks to person note instead of embedded content

Note file frontmatter:

```yaml
---
cr_type: note
cr_id: note_gedcom_I123_1
gedcom_xref: I123
gedcom_note_id: N001  # Only for referenced notes, preserves original ID for round-trip
---
```

### Phase 5: UI toggle in import wizard

**File:** `src/gedcom/gedcom-import-wizard-modal.ts`

Add checkbox in import options:

```typescript
new Setting(container)
    .setName('Import notes')
    .setDesc('Import NOTE tags attached to individuals')
    .addToggle(toggle => toggle
        .setValue(this.options.importNotes !== false)
        .onChange(value => {
            this.options.importNotes = value;
        }));

new Setting(container)
    .setName('Create separate note files')
    .setDesc('Create individual note files instead of embedding in person notes')
    .addToggle(toggle => toggle
        .setValue(this.options.createSeparateNoteFiles ?? false)
        .onChange(value => {
            this.options.createSeparateNoteFiles = value;
        }));
```

## Output Examples

### Embedded (default)

Person note `John Smith.md`:

```markdown
---
cr_type: person
name: John Smith
born: 1900-01-01
---

## Notes

### GEDCOM note

Information from Mary Jones in letter of September 25, 1990.
```

### Separate file

Person note `John Smith.md`:

```markdown
---
cr_type: person
name: John Smith
born: 1900-01-01
---

## Notes

- [[Note for John Smith]]
```

Note file `Note for John Smith.md`:

```markdown
---
cr_type: note
cr_id: note_gedcom_I123_1
gedcom_xref: I123
---

Information from Mary Jones in letter of September 25, 1990.
```

### Phase 6: GEDCOM export with notes

**File:** `src/gedcom/gedcom-exporter.ts`

Export notes from person notes back to GEDCOM:

```typescript
// In buildIndividualRecord:
// Check for ## Notes section or notesContent property
const notesContent = extractNotesFromMarkdown(personNote);
if (notesContent) {
    for (const note of notesContent) {
        // Write as inline NOTE with CONT for line breaks
        const lines = note.split('\n');
        gedcomLines.push(`1 NOTE ${lines[0]}`);
        for (let i = 1; i < lines.length; i++) {
            gedcomLines.push(`2 CONT ${lines[i]}`);
        }
    }
}
```

**File:** `src/gedcom/gedcom-note-extractor.ts` (new)

```typescript
/**
 * Extract notes from a person note's markdown content
 * Looks for ## Notes section with ### subsections
 */
export function extractNotesFromMarkdown(content: string): string[] {
    // Parse markdown to find ## Notes section
    // Extract content from ### subsections
    // Return array of note texts
}
```

## Files Modified

| File | Changes |
|------|---------|
| `src/gedcom/gedcom-preprocessor.ts` | Add `CONT` handling alongside existing `CONC` |
| `src/gedcom/gedcom-types.ts` | Add `notes`, `noteRefs` to individual and family; add `GedcomNoteRecord`; add import options |
| `src/gedcom/gedcom-parser-v2.ts` | Parse `1 NOTE` under INDI/FAM; add `NOTE` case to level-0 switch |
| `src/gedcom/gedcom-importer-v2.ts` | Resolve notes, format and add to `personData.notesContent` or create separate files; track `notesImported` stat |
| `src/gedcom/gedcom-note-formatter.ts` | New file: `formatGedcomNotesSection()` |
| `src/gedcom/gedcom-note-extractor.ts` | New file: `extractNotesFromMarkdown()` for export |
| `src/gedcom/gedcom-exporter.ts` | Write notes as `1 NOTE` with `2 CONT` for line breaks |
| `src/gedcom/gedcom-import-wizard-modal.ts` | Add "Import notes" and "Create separate note files" toggles |

## Testing Checklist

### Import
- [ ] Inline notes (`1 NOTE text`) are parsed correctly
- [ ] Multi-line notes with `CONT` preserve line breaks
- [ ] Continuation with `CONC` concatenates without line break
- [ ] Referenced notes (`1 NOTE @N001@`) are resolved
- [ ] Multiple notes per person are numbered correctly
- [ ] Notes appear in `## Notes` section of person notes
- [ ] Family notes are handled appropriately
- [ ] Separate note files are created when option enabled
- [ ] Wikilinks to note files are correct
- [ ] Import wizard toggles work correctly
- [ ] Notes are not imported when option disabled
- [ ] Import statistics include `notesImported` count

### Export
- [ ] Notes from `## Notes` section are exported
- [ ] Multi-line notes use `CONT` continuation
- [ ] Round-trip preserves note content (import → export → import)
- [ ] Referenced note IDs are preserved when possible (`gedcom_note_id`)

## Comparison with Gramps Notes

| Feature | Gramps | GEDCOM |
|---------|--------|--------|
| Rich formatting | Yes (bold, italic, links) | No |
| Note types | Yes (Research, Person Note, etc.) | No |
| Privacy flags | Yes | No |
| Shared notes | Yes (via handles) | Yes (via xrefs) |
| Style ranges | Yes | No |
| Export support | No | Yes (this feature) |

The GEDCOM implementation is simpler due to lack of formatting, but follows the same architectural pattern established for Gramps notes import, with the addition of export support.

## Future Considerations

- **Source-level notes**: Notes attached to SOUR records could be imported to source notes
- **Note type inference**: Could attempt to categorize notes based on content patterns
- **Gramps export**: Add note export to Gramps exporter for parity
