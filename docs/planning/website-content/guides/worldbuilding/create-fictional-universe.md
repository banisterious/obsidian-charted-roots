# Outline — create-fictional-universe

**Status:** 📋 Outline. Not yet drafted.
**Slug:** `create-fictional-universe`
**Title:** I want to create a fictional universe
**Track:** worldbuilding
**Difficulty:** easy
**Time estimate:** ~5-10 min
**Relevant releases:** 0.22.17
**Length estimate (drafted):** ~700 words

---

## Framing

A worldbuilder starting a new fantasy / sci-fi / historical-fiction project, or migrating an existing project to Charted Roots. The universe note is the foundational entity — it groups characters, places, events, organizations, sources; provides defaults for calendars and maps; and unlocks autocomplete + orphan detection across worldbuilding workflows. Success endpoint: a universe note exists with the right metadata, optionally linked to a calendar / map / schema, and the Universes tab in Control Center shows it with starter entity counts of zero.

This is the foundational worldbuilding guide. The other three P0 worldbuilding guides (`set-up-custom-calendar`, `build-fictional-family-tree`, `create-custom-image-map`) all assume a universe exists.

## What you'll need

- A name for your universe. Examples: "Middle-earth", "Dying Earth", "Star Wars", "The Gaean Reach", or something custom.
- (Optional) An idea of which date system you'll use:
  - **None** — use real-world Gregorian dates.
  - **Built-in** — Galactic Standard, Middle-earth Calendar, Westeros, Generic Fantasy Ages.
  - **Custom** — your own eras with names and epochs.
- (Optional) A map image file if you want a custom map for the universe.
- (Optional) An idea of validation rules if you want schema enforcement.

## Steps

1. **Open the Create Universe Wizard.** Three paths:
   - Command palette → `Charted Roots: Create universe`
   - Control Center → **Universes** tab → **Create Universe** tile (if no universes exist) or **Create universe** button in the Actions card
   - Statistics Dashboard → **Universes** section → Create button
2. **Step 1 (Universe details).** Fill in:
   - **Name** (required) — e.g., "Middle-earth"
   - **ID** — auto-generated from the name in kebab-case (`middle-earth`); customizable if you want a different identifier
   - **Description** — brief overview
   - **Author** — creator of the world (J.R.R. Tolkien, Jack Vance, you)
   - **Genre** — fantasy, sci-fi, historical, etc.
   - **Status** — `active` (currently being developed), `draft` (early development), or `archived`
3. **Step 2 (Custom calendar — optional).** Choose:
   - **None** — skip; use Gregorian dates.
   - **Built-in** — pick from Galactic Standard / Middle-earth / Westeros / Generic Fantasy Ages. The wizard preselects a built-in if your universe name slug-matches one (e.g., "Star Wars" → Galactic Standard).
   - **Custom** — define inline with eras, abbreviations, and epochs. See `set-up-custom-calendar` for deeper coverage.
4. **Step 3 (Custom map — optional).** Skip for real-world maps. Otherwise select an image file and define coordinate bounds. See `create-custom-image-map` for deeper coverage.
5. **Step 4 (Validation schema — optional).** Skip if you don't want schema enforcement. Otherwise define required properties scoped to this universe. Useful when different universes need different validation rules (e.g., a sci-fi universe requires a `species` property; a fantasy universe requires `house_affiliation`).
6. **Step 5 (Summary).** Review the created entities. Each has a link to open it directly.
7. **Verify.** Open the Universes tab in Control Center. Your universe appears in the **Your Universes** card with entity counts (0 each, until you start creating people / events / places linked to it). Open the universe note itself — frontmatter shows `cr_type: universe`, your metadata, and any linked `default_calendar` / `default_map`.

## Variations

- **Manual creation (no wizard).** Write the YAML frontmatter directly with `cr_type: universe`, `cr_id`, `name`, and optional fields. No autocomplete, no built-in linking, but minimal.
- **Add to an existing string-based universe.** If you already have entities tagged with `universe: "Middle-earth"` as plain strings, the Universes tab's **Orphan Universe Strings** card flags them. Click an orphan string to see all entities using that value, then create a universe note with that ID — the entities then benefit from the registry.
- **Multiple universes for crossover work.** Each universe is independent. Create as many as you need (alternate-history fork of a real-world tree, multiple short-story settings, etc.). Entities can be scoped to one universe via the `universe:` property.
- **Built-in calendar with no custom map.** Common combination — pick a built-in in step 2, skip step 3.

## Related guides

- [I want to set up a custom calendar with eras](set-up-custom-calendar)
- [I want to build a family tree for fictional characters](build-fictional-family-tree)
- [I want to create a custom map of my fictional world](create-custom-image-map)

## Reference

- Wiki: [Universe Notes](https://github.com/banisterious/obsidian-charted-roots/wiki/Universe-Notes)
- Wiki: [Fictional Date Systems](https://github.com/banisterious/obsidian-charted-roots/wiki/Fictional-Date-Systems)
- Wiki: [Geographic Features](https://github.com/banisterious/obsidian-charted-roots/wiki/Geographic-Features)

## Screenshot needs

- **1 load-bearing capture (existing):** **`docs/images/cr-universe-overview.png`** — Dying Earth universe note with People (17) and Events (28) tables auto-rendered. Drop in after step 7 as the "what success looks like" shot. The dynamic blocks aren't this guide's headline, but the shot conveys the universe-as-aggregator feel concisely.
- *Possible new capture:* Step 1 of the Create Universe Wizard with the universe-details form filled in. Would clarify what the wizard looks like vs. relying on prose. Skip unless you want it during the screenshot pass — the wizard form is conventional enough that prose covers it.

## Open questions for review

- The "Manual creation" Variation duplicates a lot of the wiki's manual-frontmatter section. Worth keeping in the guide (some readers will scan Variations only) versus pointing at the wiki. Lean toward keeping the brief mention since the YAML shape is short.
- The 5-step wizard has 4 optional steps (calendar / map / schema / summary). Drafting risk: making each one sound load-bearing when most readers will skip 2-3 of them. Plan to lean hard on "skip if you don't need this" framing in the draft.
- Step 7 verification refers to entity counts being zero — true at creation. If we want to instead show a populated universe (more visually compelling), the screenshot already does that work for us. Keeping the verification step text-only.
- Cross-references to the other 3 P0 worldbuilding guides will be live once those drafts ship. For the live website, they should resolve to working URLs from launch.
