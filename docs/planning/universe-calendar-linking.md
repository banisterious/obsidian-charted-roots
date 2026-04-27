# Universe ↔ Calendar Linking

Planning document for wiring the universe → calendar relationship end-to-end. The `default_calendar` field already exists on the Universe type ([universe-types.ts:35](../../src/universes/types/universe-types.ts#L35)) but no consumer reads it, and the wizard / Edit Universe modal have no way to set it. This doc decides the contract and scopes the work to ship it.

**Status:** ✅ Phase 1 implemented (2026-04-25) — wizard, Edit Universe modal, and Universes tab default-calendar surface all wired; parser-side Phase 2 deferred to a separate issue.

**Related:**
- [#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) — tracking issue (this doc)
- [#428](https://github.com/banisterious/obsidian-charted-roots/issues/428) — original Q&A that surfaced the gap (Star Wars universe + Galactic Standard Calendar)
- [#433](https://github.com/banisterious/obsidian-charted-roots/issues/433) — sibling fix shipped in v0.22.5 (data-quality validator)
- [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) — sibling fix shipped in v0.22.5 (map popup age)
- [#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) — sibling fix queued for v0.22.6 (date-inconsistency checks)

**Depends on:** `DateService` instantiation on the plugin — ✅ shipped in v0.22.5 as groundwork.

---

## Overview

The plugin has two parallel fields that gesture at "this universe uses this calendar," and neither is wired:

- **`calendar.universe`** — string on `FictionalDateSystem` ([date-types.ts:44](../../src/dates/types/date-types.ts#L44)). Read by `findSystemByUniverse` ([fictional-date-parser.ts:167-183](../../src/dates/parser/fictional-date-parser.ts#L167-L183)) for tie-breaking when an era abbreviation matches multiple systems. Built-in calendars set this to short slugs like `'star-wars'` ([default-date-systems.ts:101](../../src/dates/constants/default-date-systems.ts#L101)).
- **`universe.default_calendar`** — string on `UniverseInfo` ([universe-types.ts:35](../../src/universes/types/universe-types.ts#L35)). Written and read by `UniverseService` ([universe-service.ts:324-325](../../src/universes/services/universe-service.ts#L324-L325), [:679](../../src/universes/services/universe-service.ts#L679)). Zero consumers in `src/dates/`, `src/core/`, or anywhere else outside the universe service itself — a write to a void.

The user-visible symptom from #428 was "I created a Star Wars universe and the wizard didn't offer me Galactic Standard Calendar." The deeper symptom is that even if the user wanted to link them, there's no surface to do it.

### What's already true today (corrections to the issue body)

Tracing the parser end-to-end during #428 turned up two facts worth recording before deciding the contract:

1. **`calendar.universe` is a *preference*, not a strict gate.** The parser at [fictional-date-parser.ts:117-138](../../src/dates/parser/fictional-date-parser.ts#L117-L138) finds the era by abbreviation globally first (BBY/ABY are unique across the built-ins, so they always hit), *then* tries to upgrade to a universe-scoped system. If the upgrade fails, the global match stands. That's why DigitalDreamn's BBY dates parse correctly today despite the slug mismatch (`universe-star-wars-mo56lkav` ≠ `'star-wars'`).
2. **Slug derivation is already implicit.** `createUniverse` builds the cr_id as `universe-<name-slug>-<timestamp>` ([universe-service.ts:205](../../src/universes/services/universe-service.ts#L205)). The slug `'star-wars'` is recoverable from the universe name `'Star Wars'` without any schema change.

Both facts narrow the scope: the parser already degrades gracefully, and the wizard already has the data it needs to *suggest* a built-in calendar based on the universe name. The work is to (a) decide which field carries the explicit link, (b) wire it through the UI, and (c) decide whether the parser starts reading it.

---

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Single contract or layered? | **Layered.** `universe.default_calendar` is the explicit pointer (Contract B). `calendar.universe` stays as a soft scoping hint for built-ins, **never as a runtime gate.** | Real fiction has multi-calendar universes (Middle-earth: Shire Reckoning + King's Reckoning; Star Wars: Galactic Standard + Mandalorian). The "which calendars belong here" and "which is the default" questions don't collapse into one. Layered also means the slug-mismatch problem disappears: nothing depends on `calendar.universe` matching a universe `cr_id` exactly. |
| What does `universe.default_calendar` store? | **Calendar `id`** for built-ins (e.g., `'star_wars'`) or **calendar note `cr_id`** for user-created custom calendars. Resolver in `DateService` handles the lookup uniformly. | One field, two ID spaces, single resolver. Avoids inventing a wrapper or splitting the field. |
| Should the parser read `default_calendar` in v1? | **No.** Phase 1 ships UI-only — the link is recorded but the parser is unchanged. | Today's global-abbrev-first behavior already satisfies the issue's primary acceptance criterion ("fictional dates auto-resolve without per-event dropdown") for unique abbreviations. Bare-year inference (where the link genuinely matters) is its own scope question. Shipping UI-only fits inside the stability window. |
| Bare-year inference (`1042` → `1042 ABY`)? | **Phase 2, separate issue.** Not in this scope. | Needs design (default era selection, ambiguity rules, opt-in vs. always-on). UI-only Phase 1 doesn't depend on it. |
| Keep `calendar.universe` field on built-ins? | **Yes — as a wizard hint only.** The wizard slug-matches the universe name against built-in `universe` fields to *suggest* a default calendar pick. Never consulted at parse time. | Preserves zero-friction Star-Wars-name → Galactic-Standard suggestion without baking slug-matching into runtime. |
| Migration for existing universes? | **None.** `default_calendar` is optional; absence means "no explicit link." Existing universes continue to behave as today (global abbrev parse). | Zero-cost rollout. Users opt in by editing their universe. |
| Where does the picker UI live? | **Wizard step 2** (replace toggle with built-in / custom / none) and **Edit Universe modal** (new "Calendar" field with the same dropdown + "Unset"). | The two surfaces users hit when first creating and later managing a universe. Symmetrical create/edit pattern, lesson carried from #415 / #426 / #429. |
| Sentinel value for "no calendar"? | **Empty / unset.** No `default_calendar` key in frontmatter. | Standard plugin pattern. Avoids inventing a `'none'` reserved id. |

---

## Phase 1 — UI wiring (this scope)

Three small, surgical changes. None touch the parser.

### 1. Universe wizard — replace step 2

**Current:** [universe-wizard.ts:373-436](../../src/universes/ui/universe-wizard.ts#L373-L436) shows a single toggle ("Create custom calendar?") that, when on, reveals a custom-calendar editor. Built-ins are invisible.

**New:** Step 2 starts with a three-option radio group:

- **Built-in calendar** — dropdown of `DEFAULT_DATE_SYSTEMS`. If the universe name slug-matches a built-in's `universe` field, that built-in is preselected. (Star Wars universe → Galactic Standard Calendar preselected; Tolkien universe → Middle-earth preselected.)
- **Custom calendar** — current custom-calendar editor (unchanged).
- **None** — no calendar linkage. This is the default for genres that don't need one.

When the wizard finalizes:
- *Built-in* writes `default_calendar: <calendar.id>` to the universe note frontmatter; no calendar note is created.
- *Custom* creates the calendar note (current behavior) AND writes `default_calendar: <calendar.cr_id>` to the universe.
- *None* writes nothing for `default_calendar`.

**Files:** [universe-wizard.ts](../../src/universes/ui/universe-wizard.ts), wizard finalize path in [universe-service.ts](../../src/universes/services/universe-service.ts).

### 2. Edit Universe modal — add Calendar field

**Current:** No calendar field. Status, name, description, author, genre. (Locate exact file in implementation.)

**New:** Add a "Calendar" `Setting` row. Dropdown values:

- `(unset)`
- All built-in calendars (`DEFAULT_DATE_SYSTEMS` ids)
- All custom calendar notes whose `universe` field is unset OR matches this universe's slug (so unaffiliated customs and same-universe customs both show)

Saving persists to `default_calendar` via `UniverseService.updateUniverse`. Setting back to `(unset)` removes the key from frontmatter (write path needs to handle the empty case — confirm `updateUniverse` already does, since `defaultCalendar !== undefined` is the gate at [universe-service.ts:324](../../src/universes/services/universe-service.ts#L324)).

### 3. Display surface (small)

The Universe profile view (or Universes tab card) should show the linked calendar by name. Existing entity-counts row already includes a `calendars` count ([universe-types.ts:89](../../src/universes/types/universe-types.ts#L89)) — augment with a "Default: <calendar name>" line when `default_calendar` is set.

**Decision deferred:** whether to render the calendar as a clickable link to the calendar note (custom) or to the settings page (built-in). Keep it as plain text in v1 if linking adds friction.

---

## Phase 2 — Parser integration (separate issue, deferred)

The piece this doc *doesn't* ship. Captured here so the contract is consistent when Phase 2 starts.

When `universe` is passed to `DateService.parseDate(dateStr, universe)`:

1. Resolve the universe's `default_calendar` (lookup via universe service).
2. If a default calendar exists and its `id`/`cr_id` matches a system in `FictionalDateParser.systems`, prefer that system when the parsed abbreviation matches one of its eras.
3. **Bare-year inference (further sub-decision):** if `dateStr` is a bare year (`1042`) and the universe has a `default_calendar` with a `defaultEra`, treat as `1042 <defaultEra.abbrev>`. Behind a settings toggle? Always on? Open question.
4. **Calendar `current_year` field for fictional "now" ([#473](https://github.com/banisterious/obsidian-charted-roots/issues/473)):** custom calendars gain an optional `current_year` frontmatter field. When a statistic or DateService consumer needs a fictional "now" (e.g., ongoing-marriage durations, living-person ages with no death date), Phase 2 reads `current_year` off the universe's linked calendar. Cascade: explicit `current_year` → use it; absent → fall back to latest-known-event year across the universe (option 3 in #473); both unavailable → skip the calculation. Real-world calendars unchanged (continue to use `new Date().getFullYear()`). Refinement endorsed by @doctorwodka in [#473 discussion](https://github.com/banisterious/obsidian-charted-roots/issues/473) — putting the field on the calendar rather than each universe note avoids per-universe friction and rides the existing `default_calendar` link without additional plumbing on the universe side.

Phase 2 is a separate issue — intentionally not bundled here, because it has its own design surface (ambiguity rules, opt-in vs. always-on, interaction with real-world dates on fictional-universe entities, fictional-`now` cascade for statistics surfaces).

---

## Out of scope

- **Parser changes** beyond what's already shipped in v0.22.5 (DateService instantiation) and v0.22.6 (#437 fictional-era awareness in data-quality checks). Parser stays as-is in Phase 1.
- **Multi-calendar universes** with explicit per-entity calendar overrides. Phase 1 is "one default calendar per universe." Per-entity overrides are #435 (Edit Person dating-system dropdown), already filed for post-1.0.
- **Calendar-creation flow improvements** outside the wizard (e.g., a standalone "Create calendar" command). Existing custom-calendar UX is unchanged.
- **Slug normalization** as a runtime mechanism. The wizard's name-slug → built-in-suggestion is a one-time convenience; the parser never compares slugs at runtime.

---

## Acceptance criteria (Phase 1)

Per the issue:

- [ ] Contract decision recorded in this doc and referenced from the issue.
- [ ] Universe wizard offers built-in / custom / none, with the slug-matched built-in preselected when appropriate.
- [ ] Edit Universe modal has a Calendar field that reads and writes `default_calendar`.
- [ ] Existing universes work unchanged when `default_calendar` is absent (no migration, no behavior regression).
- [ ] `calendar.universe` field on built-ins is documented as a wizard hint only — no runtime parse-time consumer added.
- [ ] At least one Phase 1 test fences the wizard finalize path (built-in selected → frontmatter contains `default_calendar: <calendar.id>`).

The original issue's "fictional dates auto-resolve without per-event dropdown selection" criterion is already met today for unique-abbreviation cases (BBY, TA, AC, etc.). Phase 2 covers the bare-year case explicitly.

---

## Open questions for Phase 1

These are small but worth noting before starting:

1. **Custom calendar dropdown filtering.** "Customs unaffiliated with any universe" — is that the right scope, or should we show all customs and trust the user? Risk: showing every Middle-earth-scoped custom in a Star Wars universe's dropdown.
2. **Wizard preselect granularity.** Slug-match against the built-in's `universe` field is the obvious heuristic. Should fuzzier matches be tried (e.g., universe name "Star Wars Legends" → still preselect Galactic Standard)? Probably yes for a v1 nicety; document the matching rules in code.
3. **Universe profile view changes.** Worth doing in Phase 1 or follow-up? Light lift, but it's a sixth surface change. Keeping it in scope unless it spills.

---

## Implementation order

1. Wizard step 2 rewrite (largest single change; sets the data shape).
2. Edit Universe modal Calendar field (mirror of wizard logic).
3. Universe profile view default-calendar line.
4. Phase 1 test — wizard finalize path writes correct `default_calendar`.
5. CHANGELOG `[Unreleased]` entry under "Added" describing the new wizard option and Edit Universe field.

Total expected scope: ~1 focused session. No critical-path changes; non-data-loss; window-eligible.
