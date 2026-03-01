# Organization Member Management

Planning document for [#226](https://github.com/banisterious/obsidian-charted-roots/issues/226).

**Status:** ✅ Implemented (Unreleased)

---

## Overview

Add a dedicated modal for managing organization members with bulk add capability and full membership field editing, accessible via context menu from the Organization tab.

**Design Philosophy:**
- Leverage existing UI patterns (PersonPickerModal, inline editing)
- Full membership field support from day one
- Multi-select person picker for bulk operations
- Reusable component for other bulk-add scenarios

---

## Problem Statement

Currently, adding members to an organization requires:
1. Opening each person note individually
2. Adding `member_of` property with organization wikilink
3. Optionally adding membership details (role, rank, dates)

This is tedious for organizations with many members (guilds, military units, noble houses).

**User Request (@doctorwodka):**
> "I would like to see the Add Member feature... Add new entry to array of relations to selected Organisation note"

---

## User Requirements

Based on discussion in #226:

| Requirement | User Response |
|-------------|---------------|
| Entry point | Context menu from Organization tab ("Manage members") |
| Fields | Full set: role, rank, status, date joined, date left |
| Bulk add | Yes, multi-select person picker |

---

## Proposed Solution

### ManageOrganizationMembersModal

A dedicated modal for viewing, adding, and editing organization members.

**UI Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Manage members: House Stark                        [×] │
├─────────────────────────────────────────────────────────┤
│  [+ Add members]                                        │
│                                                         │
│  Current Members (5)                                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Eddard Stark                                        ││
│  │ Role: Lord  |  Rank: Head of House  |  Active      ││
│  │ Joined: 283 AC                          [Edit] [×] ││
│  ├─────────────────────────────────────────────────────┤│
│  │ Catelyn Stark                                       ││
│  │ Role: Lady  |  Joined: 283 AC           [Edit] [×] ││
│  ├─────────────────────────────────────────────────────┤│
│  │ Robb Stark                                          ││
│  │ Role: Heir  |  Active                   [Edit] [×] ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│                                        [Done]           │
└─────────────────────────────────────────────────────────┘
```

**Workflow:**
1. User right-clicks organization in Organization tab
2. Selects "Manage members" from context menu
3. Modal opens showing current members with inline details
4. "Add members" opens multi-select person picker
5. After selection, inline edit form appears for each new member
6. Changes are applied to person notes (adding/updating `member_of` property)

### Multi-Select Person Picker

Extend existing `PersonPickerModal` to support multi-selection:

```
┌─────────────────────────────────────────────────────────┐
│  Select members to add                              [×] │
├─────────────────────────────────────────────────────────┤
│  Search: [jon                    ]                      │
│                                                         │
│  ☑ Jon Snow                                             │
│  ☐ Jon Arryn                                            │
│  ☑ Arya Stark (already selected)                        │
│                                                         │
│  Selected (2): Jon Snow, Arya Stark                     │
│                                                         │
│                              [Cancel]  [Add selected]   │
└─────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Checkbox-based selection instead of click-to-select
- "Selected" summary bar at bottom
- Filter out people already members of the organization
- Support keyboard navigation (space to toggle, enter to confirm)

---

## Implementation

### Phase 1: Core Modal

1. **ManageOrganizationMembersModal** (`src/organizations/ui/manage-members-modal.ts`)
   - Load current members via `OrganizationService`
   - Display scrollable member list with details
   - Edit button opens inline form for membership fields
   - Remove button removes membership from person note

2. **Context menu integration** (`src/organizations/ui/organizations-tab.ts`)
   - Add "Manage members" option to organization context menu

3. **OrganizationService extensions** (`src/organizations/services/organization-service.ts`)
   - `getMembers(orgFile: TFile): MemberInfo[]`
   - `addMember(orgFile: TFile, personFile: TFile, details: MembershipDetails)`
   - `updateMember(personFile: TFile, orgLink: string, details: MembershipDetails)`
   - `removeMember(personFile: TFile, orgLink: string)`

### Phase 2: Multi-Select Person Picker

1. **MultiSelectPersonPickerModal** (`src/ui/multi-select-person-picker-modal.ts`)
   - Extend PersonPickerModal patterns
   - Checkbox-based UI
   - Selected items summary
   - Bulk return of selected persons

2. **Integration with ManageOrganizationMembersModal**
   - "Add members" button opens multi-select picker
   - After selection, show inline forms for membership details

### Phase 3: Reusable Component

- Extract multi-select picker for reuse in:
  - Create Family modal (bulk add children)
  - Future: Bulk relationship creation
  - Future: Bulk event participant assignment

---

## Data Model

### Membership Details

```typescript
interface MembershipDetails {
  role?: string;           // e.g., "Lord", "Squire", "Maester"
  rank?: string;           // e.g., "Head of House", "Bannerman"
  status?: 'active' | 'inactive' | 'deceased' | 'expelled';
  date_joined?: string;    // Supports fictional dates
  date_left?: string;
}
```

### Person Note Frontmatter

```yaml
member_of:
  - org: "[[House Stark]]"
    role: Lord
    rank: Head of House
    status: active
    date_joined: 283 AC
```

Or simple format (backward compatible):

```yaml
member_of:
  - "[[House Stark]]"
```

---

## Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Inline editing vs separate modal? | Inline editing | Keeps workflow fast; users see all members at a glance without extra modal layers |
| Batch membership details? | Individual editing only | Roles/ranks rarely identical across members; bulk add already saves the tedious selection step |
| Date validation? | Skip validation | Fictional dates make comparison impossible; trust users with their data |

---

## Related

- [Organization Member Management](../../wiki-content/Roadmap.md#organization-member-management) — Roadmap entry
- [Create Organization Modal](../../src/organizations/ui/create-organization-modal.ts) — Existing organization UI patterns
- [PersonPickerModal](../../src/ui/person-picker-modal.ts) — Base for multi-select picker
