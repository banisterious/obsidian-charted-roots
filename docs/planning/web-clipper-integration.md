# Web Clipper Integration

Planning document for integrating Obsidian Web Clipper with Canvas Roots for genealogical research.

- **Status:** Planning
- **GitHub Issue:** [#128](https://github.com/banisterious/obsidian-canvas-roots/issues/128)
- **Created:** 2025-01-04
- **Updated:** 2025-01-04
- **Depends On:** [#137](https://github.com/banisterious/obsidian-canvas-roots/issues/137) (Staging Management UI) for Phase 2

---

## Overview

Obsidian Web Clipper is an official browser extension that captures web content into Obsidian notes. This integration provides ready-to-use templates for capturing genealogical data from common sources like obituaries, Find A Grave, FamilySearch, and Wikipedia biographies.

### Goals

1. **Streamline research capture** — One-click clipping of genealogical data with structured frontmatter
2. **Reduce manual data entry** — Auto-extract names, dates, relationships from web sources
3. **Integrate with staging workflow** — Clipped notes land in staging for review before promotion

### Non-Goals

- Building a custom web scraper (Web Clipper handles extraction)
- Modifying Web Clipper itself (we distribute templates only)
- Real-time sync with genealogy websites

---

## Phase 1: Template Distribution

**Status:** Ready to implement

Distribute ready-to-use JSON template files that users manually import into Web Clipper.

### Template Location

**Option A (Recommended):** `docs/clipper-templates/` in main repo
- Simpler maintenance
- Templates versioned with plugin releases
- Users can find templates alongside documentation

**Option B:** Separate repository
- Independent versioning
- Cleaner separation of concerns
- More overhead to maintain

### Proposed Templates

| Template | Source | Extraction Method |
|----------|--------|-------------------|
| Generic Obituary | Any obituary site | LLM extraction |
| Find A Grave | findagrave.com | CSS selectors + LLM |
| FamilySearch Person | familysearch.org | CSS selectors |
| Wikipedia Biography | wikipedia.org | Schema.org + infobox parsing |

### Template Structure

Each template produces a note with Canvas Roots frontmatter:

```yaml
---
cr_type: person
cr_id:
name: "Extracted Name"
born: "YYYY-MM-DD"
died: "YYYY-MM-DD"
birth_place: "City, State"
death_place: "City, State"
# Clipping metadata
clipped_from: "{{url}}"
clipped_date: "{{date}}"
clip_source_type: obituary
---

# {{title}}

{{content}}
```

### Property Alias Handling

**Challenge:** Users may have custom property aliases (e.g., `birth_date` instead of `born`).

**Options:**

1. **Document canonical names** — Templates use canonical names; users adjust manually if needed
2. **Multiple template variants** — Provide common alias variations
3. **Post-processing script** — User runs cleanup wizard step after clipping

**Recommendation:** Option 1 (document canonical names) for Phase 1. The Cleanup Wizard can handle property normalization for users with custom aliases.

### User Workflow

1. Install Obsidian Web Clipper browser extension
2. Download template JSON from `docs/clipper-templates/`
3. Import template in Web Clipper settings
4. Configure output folder to staging folder (e.g., `Family/People/Staging/clips`)
5. Browse genealogy site, click Web Clipper, select template
6. Note created in staging folder with extracted data
7. Review and edit in Obsidian
8. Use Staging Manager (#137) to promote to main tree

### Implementation Steps

1. Create `docs/clipper-templates/` directory
2. Create `README.md` with setup instructions
3. Create `generic-obituary.json` template
4. Create `find-a-grave.json` template
5. Create `familysearch-person.json` template
6. Create `wikipedia-biography.json` template
7. Add wiki documentation page
8. Link from Data Entry documentation

### Template Development Notes

Based on community feedback:
- Web Clipper requires double quotes in extraction instructions
- Include clipper variables in the context field for better LLM extraction
- Test templates against real pages before release

---

## Phase 2: File Watcher (Future)

**Status:** Blocked by #137 (Staging Management UI)

Automatically detect clipped notes and offer guided import.

### Concept

1. Monitor staging folder for new files
2. Detect files with `clip_source_type` frontmatter
3. Show notification or badge: "3 new clipped notes to review"
4. Open Staging Manager with filter for clipped notes
5. Guide user through review and promotion

### Dependencies

- **#137 Staging Management UI** — Provides the review/promote workflow
- File watching capability (Obsidian's vault events)

### Implementation Considerations

- Use Obsidian's `vault.on('create', ...)` event
- Filter for files in staging folder with clip metadata
- Debounce notifications to avoid spam during bulk imports
- Consider "auto-assign cr_id" option for clipped notes

---

## Phase 3: Enhanced Extraction (Future)

**Status:** Conceptual

More sophisticated extraction capabilities.

### Potential Features

- **Relationship extraction** — Parse "survived by" sections in obituaries
- **Multi-person clipping** — Extract family group from census page
- **Source linking** — Auto-create source note linked to clipped person
- **Place standardization** — Normalize place names during extraction

### Research Needed

- Web Clipper's LLM extraction capabilities and limits
- Schema.org markup availability on genealogy sites
- CSS selector stability on target sites

---

## Template Specifications

### Generic Obituary Template

**Target:** Any obituary page (newspapers, funeral homes, legacy.com)

**Extraction Strategy:** LLM-based with structured prompts

**Fields to Extract:**
- Full name (including maiden name if mentioned)
- Birth date and place
- Death date and place
- Parents' names
- Spouse name(s)
- Children's names
- Siblings' names
- Key life events mentioned

**Prompt Structure:**
```
Extract the following from this obituary:
- Full name of the deceased
- Birth date (format: YYYY-MM-DD or partial)
- Death date (format: YYYY-MM-DD or partial)
- Birth place (city, state/country)
- Death place (city, state/country)
- Spouse name(s)
- Parents' names
- Children's names (comma-separated)
```

### Find A Grave Template

**Target:** findagrave.com memorial pages

**Extraction Strategy:** CSS selectors (stable structure) + LLM for bio

**Key Selectors:**
- Name: `#bio-name`
- Birth date: `#birthDateLabel`
- Death date: `#deathDateLabel`
- Birth place: `#birthLocationLabel`
- Death place: `#deathLocationLabel`
- Cemetery: `#cemeteryNameLabel`

**Additional Fields:**
- Memorial ID (from URL)
- Plot location
- Inscription text

### FamilySearch Person Template

**Target:** familysearch.org/tree/person/[ID]

**Extraction Strategy:** CSS selectors

**Key Fields:**
- Name, birth, death, parents, spouses, children
- FamilySearch PID (for future linking)
- Sources count

### Wikipedia Biography Template

**Target:** wikipedia.org biography pages

**Extraction Strategy:** Schema.org + infobox parsing

**Key Fields:**
- Name from title
- Birth/death from infobox
- Summary paragraph for notes

---

## Documentation Updates

### Wiki Pages to Create/Update

- [ ] Create: `Web-Clipper-Integration.md` — Setup guide and template catalog
- [ ] Update: `Data-Entry.md` — Add Web Clipper as import method
- [ ] Update: `Roadmap.md` — Add Web Clipper integration entry

### Template README

Each template should include:
- Target site(s)
- Setup instructions
- Field mappings
- Known limitations
- Version history

---

## Open Questions

1. **Template versioning** — How to handle schema changes that break templates?
   - Semantic versioning in template metadata?
   - Compatibility notes in wiki?

2. **LLM vs CSS selectors** — When to prefer each?
   - CSS: Stable, predictable sites (Find A Grave, FamilySearch)
   - LLM: Variable format sites (obituaries, newspapers)

3. **Property alias support** — Worth supporting in Phase 1?
   - Current recommendation: No, use canonical names
   - Cleanup Wizard handles normalization

4. **Community contributions** — How to accept template contributions?
   - PR to main repo?
   - Template gallery in discussions?

---

## Related Documents

- [Staging Management Enhancement](staging-management-enhancement.md)
- [Data Entry](../../wiki-content/Data-Entry.md)
- [Obsidian Web Clipper Documentation](https://help.obsidian.md/Clipper)

---

## Notes

This plan was created based on GitHub issue #128 discussion. Key community input:
- @wilbry tested templates and noted Web Clipper requires double quotes in prompts
- Clipper variables in context field improve LLM extraction quality
