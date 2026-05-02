---
title: "I want to set up a custom calendar with eras"
description: Define a fictional date system with named eras, abbreviations, and epochs, then use it in person and event frontmatter.
track: worldbuilding
difficulty: medium
time_estimate: ~10 min
last_reviewed: 2026-05-01
relevant_releases: 0.22.17
---

# I want to set up a custom calendar with eras

Use this when your fictional world needs its own date system — alternate-history fork, custom fantasy ages, sci-fi reckonings, anything that doesn't fit Gregorian dates or one of the four built-in calendars (Middle-earth, Westeros, Star Wars, Generic Fantasy). By the end you'll have a calendar registered with named eras, optionally scoped to a universe, and you'll know how to use the resulting date format in person and event frontmatter.

If your universe is Middle-earth, Westeros, or Star Wars, you can skip this — the built-in calendars cover those. See [I want to use a built-in calendar](use-built-in-calendar) for that path.

## What you'll need

- A universe note for the world you're building, if you want the calendar scoped to a single universe (recommended). See [I want to create a fictional universe](create-fictional-universe).
- An idea of your world's eras: their names (e.g., "Age of Legends"), abbreviations (e.g., "AoL"), and epoch offsets (the year that anchors each era to the timeline).
- A choice of a "default era" — the one used when a date string doesn't specify which.

## Steps

### 1. Open the calendar settings

**Settings → Charted Roots → Dates & validation → Fictional date systems**. Or from the Control Center: Events tab → Actions → **Fictional date systems**.

Confirm **Enable fictional dates** is on. Toggling it on also removes the 120-year age cap in the statistics dashboard, so longevity-aware fixtures (elves, vampires) appear correctly.

### 2. Add a new system

Click **Add** in the Fictional date systems section. Fill in:

- **Name** — display name (e.g., "Aeons of My World")
- **ID** — auto-generated from the name; customizable
- **Universe** — link to your universe note. Optional, but recommended so the calendar only surfaces in date pickers for entities in this universe.

### 3. Define the eras

Click **+ Add era** for each era. For each one:

- **Name** — full era name (e.g., "Age of Legends")
- **Abbrev** — short form used in dates (e.g., "AoL")
- **Epoch** — year offset from the reference point. **0** for your primary/reference era. Negative numbers for earlier eras (e.g., a "Second Age" with epoch -3441 means SA 1 falls 3441 years before AoL 1). Positive numbers for later eras.
- **Direction** — **Forward** (years count up, like AD) or **Backward** (years count down, like BC).

### 4. Pick a default era

The dropdown sets which era is assumed when a date string omits an era prefix. Usually the "current" or most-used era in your storytelling.

### 5. Save

The system is now active. Date pickers in event-creation modals will offer it; the date parser will recognize era abbreviations from this calendar in person and event frontmatter.

### 6. Use the dates in frontmatter

The format is `{abbreviation} {year}` (case-insensitive):

```yaml
---
cr_type: person
name: A Character
universe: my-world
born: "AoL 2890"
died: "AoL 2961"
---
```

```yaml
---
cr_type: event
title: A Major Battle
event_type: military
date: "AoL 2941"
---
```

### 7. Verify

Test parsing in Settings: enter a date like `AoL 2941` in the **Test date parsing** input. Green = parsed correctly with era name + year + canonical year for sorting. Red = error message explaining what didn't match.

![Calendar View rendering a fictional date system: events appear with their universe-specific date format](images/cr-calendar-view-fictional.png)

## Variations

- **Use a built-in calendar instead.** If your world is Middle-earth, Westeros, Star Wars, or maps to the Generic Fantasy ages, skip the custom setup — see [I want to use a built-in calendar](use-built-in-calendar). The four built-ins are enabled by default; toggle **Show built-in systems** off to hide ones you don't use.
- **Calendarium plugin integration.** If you already maintain calendars in the Calendarium plugin, enable the integration under **Settings → Charted Roots → Advanced → Integrations** → set **Integration mode** to "Read-only (import calendars)". Calendarium calendars then appear alongside built-in and custom systems in date pickers. Read-only — Charted Roots doesn't modify the Calendarium definitions.
- **No universe link.** Skip the universe field if the calendar should apply globally. Useful if multiple universes share the same date system.
- **Editing later.** Custom systems can be edited (pencil icon) or deleted (trash icon) anytime. Built-in systems can only be hidden, not modified.

## Related guides

- [I want to create a fictional universe](create-fictional-universe) — pair the calendar with a universe note for cleaner scoping
- [I want to use a built-in calendar](use-built-in-calendar) — the easier path for Middle-earth / Westeros / Star Wars / Generic Fantasy
- [I want to build a family tree for fictional characters](build-fictional-family-tree)

## Reference

- Wiki: [Fictional Date Systems](https://github.com/banisterious/obsidian-charted-roots/wiki/Fictional-Date-Systems)
- Wiki: [Universe Notes](https://github.com/banisterious/obsidian-charted-roots/wiki/Universe-Notes)
- Wiki: [Frontmatter Reference](https://github.com/banisterious/obsidian-charted-roots/wiki/Frontmatter-Reference)

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+set-up-custom-calendar%3A+

---

## Notes for review

- The built-in calendar path is intentionally pushed to Variations + a Related-guides cross-link to `use-built-in-calendar` (P1). Keeps this guide focused on the "custom" promise in the title.
- Step 3's "Direction" explanation could probably be a callout in the Hugo port — it's the most likely point of confusion (positive vs negative epochs + forward vs backward direction interact in non-obvious ways).
- The `Test date parsing` step is small but high-value — verifying a custom era abbreviation is the easiest way to catch typos before they propagate into person frontmatter.
- Length: ~700 words.
