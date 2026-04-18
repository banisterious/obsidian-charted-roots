# MembershipData Type Cleanup

Plan for resolving the 6 `@typescript-eslint/no-deprecated` warnings tied to the `MembershipData` interface, left over from an incomplete data-model migration.

**Status:** 📝 Planning — awaiting decision on the two options below

**Related:**
- [eslint-cleanup-plan.md](eslint-cleanup-plan.md) — Tier 1 parent plan; this item was flagged as deferred migration work
- `src/organizations/types/organization-types.ts` — where `MembershipData` and its replacement both live

---

## Background

At some point an organization-membership data-model migration was started:

- **Before:** person notes stored memberships as a nested array: `memberships: [{org, org_id, role, from, to, notes}, ...]`
- **After:** person notes store memberships as flat parallel arrays: `membership_orgs`, `membership_org_ids`, `membership_roles`, `membership_from_dates`, `membership_to_dates`, `membership_notes`

**The vault-level migration is complete.** `MembershipService.addMembership()`, `removeMembership()`, and the data-quality cleanup all write to and read from the flat arrays. Legacy nested `memberships` arrays are still read (for backward compatibility) but are migrated to the flat form during cleanup.

**The type-level migration is incomplete.** The `MembershipData` interface — which describes the **nested object shape** — is still used in places where:

1. It's accurate: reading legacy nested data (still valid for old vault entries)
2. It's historical: modal → service API passes membership details as a single object rather than individual args

The `@deprecated` annotation currently blanket-covers both uses, which is what fires the 6 warnings.

---

## The 6 Warning Sites

| # | Location | Context |
|---|----------|---------|
| 1 | `src/organizations/index.ts:15` | Public re-export of the type |
| 2 | `src/organizations/services/membership-service.ts:11` | Import statement in the service |
| 3 | `src/organizations/services/membership-service.ts:191` | `addMembership(personFile, membership: MembershipData)` — API signature |
| 4 | `src/organizations/services/membership-service.ts:277` | `(m: MembershipData) => m.org_id !== orgCrId` — legacy-data read cast |
| 5 | `src/organizations/ui/add-membership-modal.ts:169` | Modal constructs `MembershipData` to pass to service |
| 6 | `src/organizations/ui/manage-members-modal.ts:299`, `:407` | Manage-members modal does the same (2 sites) |

(Warnings 5 and 6 are counted as separate usages but each file has one warning at the listed line.)

---

## Two Options

### Option A — Rename (recommended; ~1–2 hours)

The interface *itself* isn't wrong — the nested shape is still a valid way to describe a single membership record, whether read from legacy data or built in a modal. What's wrong is the name + the blanket `@deprecated` annotation.

**Steps:**

1. **Rename** `MembershipData` → `MembershipRecord` (or similar; see naming options below). Drop the `@deprecated` tag. Add a comment clarifying: *this is the in-memory shape of a single membership; the on-disk format uses flat parallel arrays.*
2. **Update** all 6 call sites to the new name. Mechanical find/replace.
3. **Verify** with `npm run lint` that the 6 warnings are gone.

**Naming candidates:**
- `MembershipRecord` — clearest; signals "one row of data"
- `MembershipEntry` — also fine; slightly more generic
- `Membership` — shortest but potentially clashes with the class or other concepts

**Pros:** Minimal churn, preserves the convenient object-based API between modals and service, makes the type's role accurate.

**Cons:** Doesn't separate "legacy read" from "modal input" at the type level — both paths use the same shape.

### Option B — Split into two types (~half-day)

If you want the type system to actually distinguish "we're reading old legacy data" from "we're accepting modal input," split:

- `LegacyMembershipEntry` — the nested shape as stored in old vault files. Used *only* in legacy-data read codepaths (`removeMembership` line 277, data-quality cleanup, importers that see old shape).
- `MembershipInput` — the modal-to-service API shape. Used for `addMembership()` and modal constructs.
- `MembershipData` is removed.

**Steps:**

1. Add `LegacyMembershipEntry` and `MembershipInput` interfaces. Both can be structurally identical to current `MembershipData`.
2. Update `addMembership` signature to take `MembershipInput`.
3. Update the 2 modals to construct `MembershipInput` objects.
4. Update line 277's cast to `LegacyMembershipEntry`.
5. Remove `MembershipData` export and type definition.

**Pros:** Type names reflect actual role; future changes to the nested legacy shape (unlikely but possible) can be made without affecting the modal API.

**Cons:** More churn for a distinction that doesn't change behavior. Two types that are structurally identical can feel like over-engineering.

### My recommendation

**Option A.** The distinction in Option B is theoretically cleaner but has no practical payoff — the two types would be structurally identical and both would be fine to mix up accidentally, since the data flows through both paths are already tested and correct. Option A is a 10-minute rename that makes the warnings go away and leaves the code in an honest state (no deprecation annotation lying about a migration that's already done).

---

## Non-Goals

- **No vault-data migration.** User frontmatter is already in the flat-array format (or reads cleanly as legacy on load). Nothing about user data changes.
- **No API behavior change.** The service contract between modals and `MembershipService` stays the same; only the type name changes.
- **No changes to how the flat arrays are read or written.** That code is stable.

---

## Testing

After the change:

- [ ] `npm run lint` — 6 `no-deprecated` warnings for `MembershipData` gone
- [ ] `npm run build` — clean
- [ ] Manual smoke test: open a person note with existing memberships in the Manage Members modal, verify data displays. Add a membership, verify it persists in the flat arrays. Remove, verify it's cleaned up.
- [ ] Data-quality "memberships → flat arrays" cleanup still runs on a note with a legacy nested array (the one site that reads legacy data).

---

## Estimated Effort

- **Option A:** 1–2 hours including the manual smoke test.
- **Option B:** Half a day.

---

## Open Questions Before Execution

1. **Option A or B?** My recommendation is A; flag if you'd prefer the cleaner split.
2. **New name for the type** (if going with A) — `MembershipRecord`, `MembershipEntry`, or something else?
3. **Data-quality code in `src/core/data-quality.ts`** uses `membership` as a local variable name when reading legacy `memberships` arrays (already typed as `Record<string, unknown>`). That codepath doesn't currently reference `MembershipData` but was affected by the broader cleanup in Tier 1 (the `asString()` helper). Worth confirming it doesn't need a parallel update.
