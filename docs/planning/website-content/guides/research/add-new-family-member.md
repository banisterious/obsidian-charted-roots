---
title: "I want to add a new family member"
description: Add a new person (e.g., a new baby) with parents linked, a birth event recorded, and media attached — the most efficient workflow at ~34 interactions.
track: research
difficulty: easy
time_estimate: ~5 min
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to add a new family member

Use this when something has happened in the family — a baby is born, a marriage takes place, a death occurs — and you want to update your tree with the new person, the related event, and any documentation (birth certificate, photo) in one efficient pass. The example below uses a new baby; the same shape works for any life event.

By the end you'll have the new person linked to both parents bidirectionally, a birth event note linked to the person and the place, and any photos or certificates attached as media.

## What you'll need

- The parents already in your tree as person notes.
- The birth date, time, and place (or whatever life-event details apply).
- (Optional) Media files — birth certificate scan, hospital photo, etc.

## Steps

The most efficient workflow uses the **Create Person first** path. Other entry points (Create Event first, or adding via the parent's relationship menu) work but require more interactions.

### 1. Create the person note

Open Control Center → Dashboard → **Create New Person Note**. Enter the basics:

- **Name** — e.g., "Boy Smith" or whatever placeholder you use until the family settles on a name.
- **Sex** — male / female / other.
- (Optional) **Birth date** — quick to add now while you're in the form.

Don't save yet — the next steps link the parents while the modal is still open.

### 2. Link both parents in the same form

In the Edit Person modal's relationship section:

- **Father** → click **Link** → select the existing father from the picker.
- **Mother** → click **Link** → select the existing mother.

Linking both parents now (rather than after creating the person) is what keeps this workflow efficient. Bidirectional linking is automatic — both parents' children lists update without you having to edit them separately.

![Edit Person modal showing relationship fields with father, mother, and spouse populated](images/cr-edit-person-modal.png)

Click **Create Person** → **Done**.

### 3. Create the birth event

Back at the Dashboard → **Create New Event Note**.

- **Title** — e.g., "Birth of Boy Smith".
- **Event type** — Birth.
- **Primary Person** → click **Link** → select the new person.
- **Place** → click **Link** → select the existing birth location, or click **Create New Place** if it's somewhere new (have lat/long ready or look up coordinates).

Click **Create Event**.

### 4. (Optional) Attach media

Right-click the new person note → **Charted Roots → Media → Link Media** → upload the photo. Repeat for the event note (the birth certificate scan typically lives on the event note rather than the person note).

For multiple files, the media picker accepts batch uploads.

### 5. Verify

Open the new person's note. Frontmatter shows `cr_type: person`, `cr_id`, both parents as wikilinks, and any media. Both parents' notes now show the new person in their `children` array. The event note shows the person, place, and event-type metadata.

## Variations

- **For a marriage event.** Create the spouse note first (or link the existing spouse), then create the marriage event in step 3 with event type `marriage`, both parties as `persons`, and the marriage location as `place`. Charted Roots also writes spouse-marriage metadata (`spouse1_marriage_date`, `spouse1_marriage_location`) to both person notes.
- **For a death event.** Same shape — create the death event in step 3 with event type `death`, the deceased as primary person, and the place of death. The person's `died` field updates from the event date.
- **Create-event-first path.** Open Create Event first, link the new person via the **Create New Person** button inside the event's primary-person picker. Slightly less efficient (~39 interactions vs. ~34) because you have to navigate to the person note afterward to link parents.
- **Add-via-parent path.** Right-click the parent's note → **Charted Roots → Add Relationship → Add Child → Create New Child**. Most intuitive but least efficient (~45 interactions) because adding the child via one parent doesn't auto-link to the other parent — you have to repeat for the second parent.
- **Family Creation Wizard for whole groups.** If you're entering several siblings or a whole nuclear family at once, use [the wizard](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Entry#family-creation-wizard) instead of repeating this workflow per child.

## Related guides

- [I want to add my first person from scratch](add-first-person-manually) — the foundational workflow this guide builds on
- [I want to set up per-fact source citations](set-up-source-tracking) — to record the source for the birth event
- [I want to find and merge duplicate persons](find-and-merge-duplicates) — if you accidentally create a duplicate

## Reference

- Wiki: [Data Entry](https://github.com/banisterious/obsidian-charted-roots/wiki/Data-Entry)
- Wiki: [Community Use Cases — Adding a New Family Member](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#adding-a-new-family-member) — original interaction-count comparison

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+add-new-family-member%3A+

---

## Notes for review

- Headlined the new-baby workflow because it's the most-asked variant and the wiki Community-Use-Cases entry quantifies the efficiency comparison around it. Marriage and death use cases get Variations bullets — same shape, different event type.
- Interaction-count framing (~34 vs ~39 vs ~45) carried over from the wiki source. Not strictly necessary in the guide; could be cut if it reads as numerical-overhead. Currently kept because it justifies the path-ordering recommendation.
- Cross-linked the Family Creation Wizard for the multi-person case. Could split into its own guide later if family-wizard usage warrants depth.
- Length: ~770 words.
