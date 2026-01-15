# Timeline Event Filtering

**GitHub Issue:** [#183](https://github.com/banisterious/obsidian-charted-roots/issues/183)

**Status:** Phase 1 Complete

**Related:** Event roles discussion (future)

---

## Problem Statement

When a person appears in an event's `persons` array (as a participant, witness, or family member), that event incorrectly appears on their timeline. This is most problematic for:

- **Birth events** - A parent listed in the birth event appears to have that birth on their own timeline
- **Death events** - Family members present at a death see it on their timeline as if it were their own death

The current `getEventsForPerson()` function returns all events where the person appears in either the `person` field (principal) or `persons` array (participants) without distinguishing roles.

---

## User Feedback

From @JPR56400 (v0.19.7):

> The **Birth** event displayed is not the correct one.

The user imported a Gramps file and found birth events showing incorrectly on person timelines.

---

## Current Behavior

```typescript
getEventsForPerson(personLink: string): EventNote[] {
    return events.filter(e => {
        if (e.person && this.normalizeWikilink(e.person) === normalizedLink) {
            return true;
        }
        if (e.persons?.some(p => this.normalizeWikilink(p) === normalizedLink)) {
            return true;
        }
        return false;
    });
}
```

This returns ALL events where the person appears anywhere, regardless of their role.

---

## Proposed Solution: Phased Approach

### Phase 1: Principal-Only Filtering for Birth/Death (Simple Fix)

For birth and death events specifically, only show on a person's timeline if they are the **principal** (in the singular `person` field), not a participant.

**Implementation:**

```typescript
getEventsForPerson(personLink: string): EventNote[] {
    return events.filter(e => {
        const isPrincipal = e.person && this.normalizeWikilink(e.person) === normalizedLink;
        const isParticipant = e.persons?.some(p => this.normalizeWikilink(p) === normalizedLink);

        // For birth/death, only include if person is the principal
        if (e.eventType === 'birth' || e.eventType === 'death') {
            return isPrincipal;
        }

        // For other events, include if principal OR participant
        return isPrincipal || isParticipant;
    });
}
```

**Scope:**
- Modify `getEventsForPerson()` in `src/events/services/event-service.ts`
- Affects person timeline, dynamic content timeline, family timeline

**Benefits:**
- Simple, targeted fix
- No schema changes required
- Forward-compatible with roles system

**Limitations:**
- Only addresses birth/death; other event types (baptism, funeral) may have similar issues
- No way for users to override (e.g., if they want a parent's timeline to show children's births)

### Phase 2: Roles-Based Filtering (Future)

Add role tracking to events for fine-grained control over timeline inclusion.

**Schema Addition:**

```yaml
# Event frontmatter
person: "[[John Smith]]"
persons:
  - "[[Jane Smith]]"
  - "[[Dr. Brown]]"
person_roles:
  "[[Jane Smith]]": mother
  "[[Dr. Brown]]": witness
```

Or alternatively:

```yaml
participants:
  - person: "[[Jane Smith]]"
    role: mother
  - person: "[[Dr. Brown]]"
    role: witness
```

**Features:**
- Define which roles should appear on timeline (configurable)
- Default rules per event type (e.g., birth: only `principal` and `child` roles)
- User override per event or globally

**Timeline Inclusion Rules:**

| Event Type | Roles Included on Timeline |
|------------|---------------------------|
| birth | principal (the child) |
| death | principal (the deceased) |
| marriage | principal, spouse |
| baptism | principal (the baptized) |
| census | all participants |
| residence | all participants |
| custom | all participants |

---

## Additional Issues from #183

The user also reported issues that have been split into separate bugs:

- **Census events as custom type** - [#205](https://github.com/banisterious/obsidian-charted-roots/issues/205)
- **Event titles not using Gramps description** - [#206](https://github.com/banisterious/obsidian-charted-roots/issues/206)
- **Birth/death events not linking to event notes** - [#207](https://github.com/banisterious/obsidian-charted-roots/issues/207)

---

## Implementation Plan

### Phase 1: Birth/Death Principal Filtering

1. Modify `getEventsForPerson()` to filter birth/death by principal only
2. Add unit tests for the filtering logic
3. Document the behavior change in wiki

### Phase 2: Roles System (Future)

1. Design roles schema (coordinate with ongoing roles discussion)
2. Update Gramps/GEDCOM importers to extract roles
3. Add role-based filtering configuration
4. Update timeline rendering to show role badges

---

## Files to Modify

### Phase 1

- `src/events/services/event-service.ts` - `getEventsForPerson()` method

### Phase 2

- `src/events/types/event-types.ts` - Add roles types
- `src/events/services/event-service.ts` - Role-aware filtering
- `src/gramps/gramps-parser.ts` - Extract roles from Gramps
- `src/gedcom/gedcom-parser-v2.ts` - Extract roles from GEDCOM
- `src/settings.ts` - Role filtering configuration

---

## Resolved Questions

1. **Should baptism/christening also use principal-only filtering?**
   - ✅ Yes, included in Phase 1 implementation

2. **Should funeral events filter similarly to death?**
   - ✅ Yes, included in Phase 1 implementation

3. **What about marriage witnesses?**
   - ✅ Kept current behavior for marriage (include participants) - both spouses need to see the event

---

## Related

- [Event Service](../../src/events/services/event-service.ts)
- [Person Timeline](../../src/events/ui/person-timeline.ts)
- [Dynamic Content Timeline](../../src/dynamic-content/processors/timeline-processor.ts)
