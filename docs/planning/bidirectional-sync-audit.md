# Bidirectional Sync Audit

**Status:** 🔍 Survey complete — gaps filed as #552, #553, #554, #555, #556 (v0.22.29 bundle) and #557 (post-1.0 tracking).
**Date:** 2026-05-10
**Context:** Plan 2 from the v0.22.22 stability-window proactive-prevention block (`.session-restore.md`). Past bugs in this cluster: #481 (marriage details), #534 (marriage symmetry), #530 (relationship notes), #541 (org membership) — all reactive fixes after a user reported asymmetry. Goal: catalog the full picture pre-1.0 so we can fix or file each gap as a discrete issue.

---

## TL;DR

- **Bidirectional sync is hand-wired across five disjoint locations.** No central registry; each location's field coverage is slightly different.
- **Read-direction is unified** (v0.22.26 `RelationshipQueryService`); write-direction is not.
- **Six concrete gaps** identified, ranked by severity below. Three are small fixes suitable for v0.22.29; three are larger scope and deferred to post-1.0.
- **No data-loss gaps.** Self-heal (#537) masks rename canonicalization gaps. Delete cleanup gaps leave dangling cr_ids but don't lose user-authored data.

---

## 1. Infrastructure map

Bidirectional-sync logic lives in **five disjoint locations** with overlapping but inconsistent field coverage:

| Location | Owner | Trigger | Scope |
|---|---|---|---|
| `BidirectionalLinker.syncRelationships` ([src/core/bidirectional-linker.ts:148](src/core/bidirectional-linker.ts#L148)) | metadata-cache hook | `metadataCache.on('changed')` per person file | Hand-coded `if`-chain per field family; paired `syncX` + `removeXFromX` per relationship type |
| `RelationshipManager.updateRelationshipWikilinks` ([src/core/relationship-manager.ts:410](src/core/relationship-manager.ts#L410)) | Edit Person modal rename | In-modal `app.vault.rename` only | Hardcoded twin lists (id-field + wikilink-field) at lines 457-462 / 488-493; rewraps to canonical smart-wikilink form |
| `person-note-writer.ts` reverse-unlink pass ([src/core/person-note-writer.ts:2014-2060](src/core/person-note-writer.ts#L2014)) | Edit Person save | Inline during `updatePersonNote` | Removes the person from prior counterparts when a relationship field is cleared/changed |
| `person-delete-cleanup.ts` ([src/core/person-delete-cleanup.ts:35-92](src/core/person-delete-cleanup.ts#L35)) | metadata-cache hook | `metadataCache.on('deleted')` for person notes only | Declarative field lists (6 const arrays + 2 regexes) — most complete declarative registry in the codebase, but **delete-only and person-only** |
| `AddRelationshipModal.writeReciprocalRelationshipProperties` ([src/ui/add-relationship-modal.ts:309](src/ui/add-relationship-modal.ts#L309)) | Add Relationship modal | On save, when relationship type is `symmetric: true` | Single reciprocal write via `addFlatRelationship` |

**`RelationshipQueryService`** ([src/core/relationship-query-service.ts](src/core/relationship-query-service.ts)) is **read-only** — it unified the *read* direction in v0.22.26 (#546) but doesn't participate in writes.

**Universe rename cascade** ([main.ts:874-895](main.ts#L874)) handles plain-string `universe:` references via `UniverseService.cascadeUniverseRename`. This is the only entity type where rename cascades to plain-string references — Org/Place/Event/Source rely entirely on Obsidian's native `[[wikilink]]` rewrite.

---

## 2. Field-family findings

For each family, the three-direction check is: **A→B** (writing A propagates to B), **B→A** (the reverse), and **Edge cases** (rename, delete, format conversion).

### 2.1 Spouse + indexed-spouse + marriage details

Fields: `spouse` / `spouse_id` (flat polymorphic) | `spouse1` / `spouse1_id` / `marriage1_date` / `marriage1_location` / `marriage1_status` / `divorce1_date` (indexed, slots 1-10) | `partners` / `partners_id` (separate family, see below).

| Direction | Status | Where |
|---|---|---|
| A→B (set spouse on A, B's note updated) | ✅ Covered | `BidirectionalLinker.syncSpouse`; preserves target's existing format via `detectSpouseTargetFormat` |
| B→A (reverse) | ✅ Covered (same code path runs on B's save) | metadataCache.changed fires for B too |
| Marriage detail mirroring (date / location / status / divorce) | ✅ Covered (#481) | `writeMarriageDetailsToTarget` ([bidirectional-linker.ts:825](src/core/bidirectional-linker.ts#L825)); promotes flat→indexed on the target if needed via `promoteFlatSpouseToIndexed` |
| Delete (person deletion sweeps spouse refs) | ✅ Covered | `person-delete-cleanup.ts` — flat via `POLYMORPHIC_PERSON_ID_FIELDS`, indexed via `INDEXED_SPOUSE_ID_PATTERN` |
| Format conversion (flat ↔ indexed on save) | ✅ Covered | `person-note-writer.ts:1907-1978` switches based on `hasSpouseMetadata` |
| **Rename (person renamed → partner's spouse wikilink rewrap to canonical form)** | ⚠️ **GAP** — `RelationshipManager.updateRelationshipWikilinks` covers `spouse` but **not** `spouse1`..`spouseN` ([relationship-manager.ts:488-493](src/core/relationship-manager.ts#L488)) | Masked by #537 self-heal; partner's next save rewraps |

### 2.2 Bio children + parents (incl. gender-neutral)

Fields: `father` / `father_id` | `mother` / `mother_id` | `parents` / `parents_id` (gender-neutral, array) | `children` / `children_id` (array).

| Direction | Status | Where |
|---|---|---|
| A→B (set father/mother/parents on A → B's children updated) | ✅ Covered | `syncParentChild` (handles father, mother, parents) |
| B→A (set children on B → child's father/mother set based on B's sex) | ✅ Covered | `syncChildToParent` ([bidirectional-linker.ts:320-331](src/core/bidirectional-linker.ts#L320)) — looks up `personSex` and writes father vs mother accordingly. Gender-neutral parents arrays are written when sex isn't set or isn't M/F. |
| Delete | ✅ Covered | All four fields in `person-delete-cleanup.ts` |
| Rename canonicalization | ✅ Covered for all four fields | `updateRelationshipWikilinks` twin lists include all four |

**Subtle area:** when person sex changes from "male" to "female", existing children's `father` field needs to migrate to `mother`. Spot-check: not handled by bidi-linker (it only handles the additive direction). Likely surfaces extremely rarely (sex-change events are uncommon on retroactive data); flagging for awareness rather than as a filed gap.

### 2.3 Adoptive parents + adopted children

Fields: `adoptive_father` / `adoptive_father_id` | `adoptive_mother` / `adoptive_mother_id` | `adoptive_parent` / `adoptive_parent_id` (gender-neutral, array) | `adopted_child` / `adopted_child_id` (array).

| Direction | Status | Where |
|---|---|---|
| A→B (set adoptive_father/mother on A → B's adopted_child updated) | ✅ Covered | `syncAdoptiveParentChild` |
| B→A (set adopted_child on B → A's adoptive_father/mother set based on B's sex) | ✅ Covered | `syncAdoptedChildToParent` ([bidirectional-linker.ts:333-341](src/core/bidirectional-linker.ts#L333)) |
| Delete | ✅ Covered | All four in `person-delete-cleanup.ts` (`adoptive_father_id`, `adoptive_mother_id`, `adoptive_parent_id`, `adopted_child_id`) |
| Rename canonicalization (`adoptive_father`/`mother` only) | ✅ Covered | In `updateRelationshipWikilinks` twin lists |
| **Rename canonicalization for `adopted_child` array** | ⚠️ **GAP** — not in `updateRelationshipWikilinks` field list | Masked by Obsidian's native wikilink rewrite; canonical-form drift only |
| **Rename canonicalization for `adoptive_parent` (gender-neutral)** | ⚠️ **GAP** — not in `updateRelationshipWikilinks` field list | Same — masked by Obsidian's native rewrite |

### 2.4 Step parents + step children

Fields: `stepfather` / `stepfather_id` (array) | `stepmother` / `stepmother_id` (array) | `step_child` / `step_child_id` (array). No gender-neutral `step_parent` variant exists.

| Direction | Status | Where |
|---|---|---|
| A→B (set stepfather/stepmother on A → B's step_child updated) | ✅ Covered | `syncStepParentChild` ([bidirectional-linker.ts:1393-1466](src/core/bidirectional-linker.ts#L1393)) |
| **B→A (set step_child on B → A's stepfather/stepmother updated)** | ⚠️ **GAP** — bidi-linker doesn't read `step_child` from a parent's frontmatter | Asymmetric with the adopted_child analogue; if a user adds `step_child: [[A]]` directly (in-modal or hand-edit), A's note does NOT auto-receive `stepfather`/`stepmother`. Inconsistent with `adopted_child` direction which IS covered. |
| Delete | ✅ Covered | All three in `person-delete-cleanup.ts` |
| Rename canonicalization (`stepfather`/`stepmother`) | ✅ Covered | In `updateRelationshipWikilinks` twin lists |
| **Rename canonicalization for `step_child` array** | ⚠️ **GAP** | Same as adopted_child — masked by Obsidian's native rewrite |

### 2.5 Org membership

Fields (person side): `membership_orgs` / `membership_org_ids` / `membership_roles` / `membership_from_dates` / `membership_to_dates` / `membership_notes` (parallel arrays). Plus legacy: `memberships` (nested array), `house` / `house_id`, `organization` / `organization_id`.

Fields (org side): `members` / `members_id` (parallel arrays).

| Direction | Status | Where |
|---|---|---|
| A→B (add membership on person → org's members/members_id updated) | ✅ Covered (since v0.22.25 #541) | `MembershipService.addMembership`/`removeMembership` → `waitForCacheRefresh` → `syncMembersToOrg` |
| B→A (Manage Members modal on org-side → person's membership_orgs updated) | ✅ Covered (single source of truth — Manage Members modal calls the same `addMembership`/`removeMembership` person-side methods) | `manage-members-modal.ts` |
| Cache race on person→org sync | ✅ Covered (#541 follow-up) | `waitForCacheRefresh` before `syncMembersToOrg` |
| Person delete sweeps `membership_orgs` | ❌ **GAP** — `membership_org_ids` is NOT in `person-delete-cleanup.ts`'s field lists | If a person is deleted, other persons' `membership_orgs` parallel arrays aren't cleaned. (Edge case — only relevant if multiple people share a membership entry, which the data model doesn't support; flagging for verification.) |
| **Org delete sweeps person `membership_orgs`** | ❌ **GAP** — no delete handler exists for org notes at all | If an org is deleted, every member's `membership_orgs` / `membership_org_ids` arrays retain dangling refs |
| **Person delete sweeps org's `members` / `members_id`** | ❌ **GAP** — `person-delete-cleanup.ts` doesn't touch org notes | Org's member list retains dangling cr_id; Bases queries against the org show ghost members. Could be addressed via `MembershipService.syncMembersToOrg` triggered post-delete, but currently isn't. |
| **`syncMembersToOrg` writes raw `[[basename]]` not `createSmartWikilink`** | ⚠️ **GAP** ([membership-service.ts:377](src/organizations/services/membership-service.ts#L377)) | Org-side member list shows non-canonical form; basename ambiguity won't be disambiguated. Matches the pattern #549 fixed for Edit Org / Edit Event writers. |

### 2.6 Custom relationships (mentor, godparent, employer, etc.)

Fields: per relationship-type id from `DEFAULT_RELATIONSHIP_TYPES` + custom user-defined types. Each writes to `<typeId>` (wikilink array) / `<typeId>_id` (cr_id array) / optional `<typeId>_notes`.

| Direction | Status | Where |
|---|---|---|
| A→B for symmetric types (e.g. twin↔twin, friend↔friend) | ✅ Covered | `AddRelationshipModal.writeReciprocalRelationshipProperties` (#419) |
| A→B for inverse-asymmetric types (e.g. mentor→disciple, godparent→godchild) | 🟡 **By design** — relies on read-time inference via `RelationshipService.getInverseRelationships`; no frontmatter on target side. Documented behavior, not a gap. |
| Delete (custom relationship arrays swept when referenced person deleted) | ❌ **GAP** — `person-delete-cleanup.ts` field lists only cover the canonical kinship arrays, not custom-relationship `_id` arrays | Custom-relationship arrays retain dangling cr_ids after person deletion. Severity proportional to custom-relationship adoption — currently low, but pre-1.0 cleanup target. |
| **Rename canonicalization for custom relationship arrays** | ⚠️ **GAP** — not in `updateRelationshipWikilinks` twin lists | Masked by Obsidian's native rewrite; canonical-form drift only |
| **`AddRelationshipModal` writes raw `[[basename]]` not `createSmartWikilink`** | ⚠️ **GAP** ([add-relationship-modal.ts:284, 316](src/ui/add-relationship-modal.ts#L284)) | Both source and reciprocal writes; basename ambiguity not disambiguated. Matches the pattern #549 fixed for Edit Org / Edit Event writers. |

### 2.7 `partners` / `partners_id` — spouse alias (not a separate family)

`partners` is an **alias for `spouse`** for users who prefer that term. Registered as a canonical alias in [property-alias-service.ts:53](src/core/property-alias-service.ts#L53) and read as a fallback in [family-graph.ts:1720-1728](src/core/family-graph.ts#L1720). Delete-cleanup covers it via `ARRAY_PERSON_ID_FIELDS` so the partner ref is swept on deletion.

| Direction | Status | Where |
|---|---|---|
| Read (family graph honors alias) | ✅ Covered | `family-graph.ts:1720-1728` |
| Delete | ✅ Covered | `person-delete-cleanup.ts:48` (`partners_id`), `:85` (`partners`) |
| **A→B bidi sync when user authors `partners:` instead of `spouse:`** | ❌ **GAP** — `BidirectionalLinker` reads `frontmatter.spouse` directly without alias resolution ([bidirectional-linker.ts:287](src/core/bidirectional-linker.ts#L287)) | A user who chose `partners` as their canonical wouldn't get marriage-detail mirroring, spouse-format preservation, or reciprocal writes. The alias system covers reads but not writes. |
| Rename canonicalization | ❌ **GAP** | `updateRelationshipWikilinks` doesn't honor aliases either |

---

## 3. Identified gaps — ranked

### Severity legend

- 🔴 **Data-loss-shaped:** user-authored data could be silently dropped. None found in this audit.
- 🟠 **Inconsistency-shaped:** entities diverge across notes; surfaces as user reports of "I added X here but it doesn't show up there." All four past cluster bugs (#481, #534, #530, #541) had this shape.
- 🟡 **Cleanup-shaped:** dangling references after delete; harmless until something tries to resolve them.
- 🟢 **Canonical-form-shaped:** wikilink form drifts from canonical (path-prefix/pipe) after rename. Masked by #537 self-heal in nearly all cases.

### Gap inventory

| # | Gap | Issue | Severity | Scope | Release |
|---|---|---|---|---|---|
| G1 | `syncMembersToOrg` writes raw `[[basename]]` not `createSmartWikilink` | [#552](https://github.com/banisterious/obsidian-charted-roots/issues/552) | 🟠 | One file, ~3 lines | v0.22.29 |
| G2 | `AddRelationshipModal` (source + reciprocal) writes raw `[[basename]]` not `createSmartWikilink` | [#553](https://github.com/banisterious/obsidian-charted-roots/issues/553) | 🟠 | One file, ~2 sites | v0.22.29 |
| G3 | `step_child` → reverse direction (parent's `step_child` doesn't drive child's `stepfather`/`stepmother`) | [#554](https://github.com/banisterious/obsidian-charted-roots/issues/554) | 🟠 | Add a 5th case to `BidirectionalLinker.syncRelationships`'s if-chain + a new `syncStepChildToParent` method | v0.22.29 |
| G4 | `updateRelationshipWikilinks` missing field coverage: indexed spouse, `adopted_child`, `step_child`, `adoptive_parent`, custom relationships, `membership_orgs` | [#555](https://github.com/banisterious/obsidian-charted-roots/issues/555) | 🟢 | Extend twin lists + `getIdFieldName` map | v0.22.29 (low-risk extension) |
| G5 | No delete-cleanup for Org/Place/Event/Source notes — referencing persons retain dangling cr_ids | [#557](https://github.com/banisterious/obsidian-charted-roots/issues/557) | 🟡 | Larger scope — new cleanup handlers per entity type; analogous to `person-delete-cleanup` shape | Post-1.0 tracking |
| G6 | Custom-relationship `_id` arrays not swept by `person-delete-cleanup` | [#557](https://github.com/banisterious/obsidian-charted-roots/issues/557) | 🟡 | Extend delete-cleanup to enumerate custom-relationship type ids from settings | Post-1.0 (bundled into tracking issue) |
| G7 | `BidirectionalLinker` doesn't honor `partners` alias for `spouse` — users authoring `partners:` get no bidi sync, no marriage-detail mirroring, no format preservation | [#556](https://github.com/banisterious/obsidian-charted-roots/issues/556) | 🟠 | Route the spouse-field read in [bidirectional-linker.ts:287](src/core/bidirectional-linker.ts#L287) through the property-alias service (or fall back to `partners` when `spouse` is absent, mirroring `family-graph.ts:1720-1728`'s pattern) | v0.22.29 |

### Out of scope for this audit

- **Sex-change retroactive sync** (rename `father` → `mother` when subject's sex changes). Edge case; flagging for awareness, not filing.
- **Inverse-asymmetric custom relationships** with no reciprocal frontmatter (`mentor` doesn't write `disciple` on target). By design — covered by read-time inference in `RelationshipService.getInverseRelationships`. Documented behavior.
- **External-edit invalidation for cache-holding services** (Shape B from #547). Already tracked under #547, deferred to 1.x.
- **Declarative bidi-sync field table** — the larger fix that would unify all five locations. Out of scope for the soak window; revisit post-1.0 once the gap catalog is closed.

---

## 4. Filed issues

**v0.22.29 bundle** (filed 2026-05-10):
- [#552](https://github.com/banisterious/obsidian-charted-roots/issues/552) — G1: org-side `syncMembersToOrg` smart-wikilink rewrap
- [#553](https://github.com/banisterious/obsidian-charted-roots/issues/553) — G2: `AddRelationshipModal` smart-wikilink rewrap (source + reciprocal)
- [#554](https://github.com/banisterious/obsidian-charted-roots/issues/554) — G3: `step_child` reverse-direction sync
- [#555](https://github.com/banisterious/obsidian-charted-roots/issues/555) — G4: `updateRelationshipWikilinks` field-coverage extension
- [#556](https://github.com/banisterious/obsidian-charted-roots/issues/556) — G7: bidi-linker `partners` alias honoring

**Post-1.0 tracking** (filed 2026-05-10):
- [#557](https://github.com/banisterious/obsidian-charted-roots/issues/557) — G5 + G6: non-person delete-cleanup + custom-relationship array sweeping

Combines with the pending `#551` partial fix already in `[Unreleased]` for the v0.22.29 cut. Estimated ~4-5 hours of work; matches the pattern of recent display-coverage closures (#543/#549).
