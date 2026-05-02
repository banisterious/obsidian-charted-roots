---
title: "I want to help a non-technical family member get started"
description: A supporter's guide for setting up Charted Roots on behalf of a non-technical relative — install steps, what to teach, what to avoid, and when to recommend a different tool.
track: research
difficulty: medium
time_estimate: ~2 hours for the initial setup; ongoing for support
last_reviewed: 2026-05-02
relevant_releases: 0.22.17
---

# I want to help a non-technical family member get started

This guide is different from the others. You're not the user — you're the supporter. A relative has expressed interest in using Charted Roots and asked for your help. You want to set them up without overwhelming them or committing to permanent tech support. This guide is a playbook for that role.

It's based on real experience: the install process (Obsidian → BRAT → Charted Roots) succeeds technically, but leaves a non-technical user feeling overwhelmed if you skip the framing work. The setup is the easy part. The hand-off is the hard part.

## Before you begin: is this the right tool?

Honest assessment first. Charted Roots is a research tool with a learning curve. Walk through these questions with your relative before installing anything:

- **Do they want to *manage research* or just *view a tree*?** If they want to see a tree visualization without building one, simpler tools (Ancestry, FamilySearch, MyHeritage's free tier) may serve them better. Charted Roots rewards active research.
- **Are they already using Obsidian?** If not, they're learning two tools at once — significantly more overwhelm than one. If they don't use Obsidian for anything else, expect adoption to stall.
- **Do they enjoy learning new technology?** Some older users thrive on a new challenge; others find it stressful. Ask honestly. Stress predicts abandonment.
- **Will you be available for ongoing support?** If you're the only support resource and you can't commit to occasional follow-up sessions, this likely won't stick.

If the answer to any of these is "no" or "probably not," redirect:

- **Recommend Ancestry / FamilySearch** for the simplest "view your tree" experience.
- **Recommend Gramps** if they want a desktop GUI tool with a gentler learning curve and no Obsidian dependency.
- **Offer to be their Charted Roots manager instead** — you do the data entry and tree maintenance; they do the research; you share PDFs and printed reports. This division of labor works well when the family historian has the knowledge and you have the technical skills.

If they're a good fit, proceed.

## Setup: do the technical heavy lifting

Plan a 1-2 hour session, in person or via screen share. Don't try to walk through installation over the phone.

### 1. Install Obsidian

On their computer (not yours — different operating systems will confuse later instructions):

- Download Obsidian from [obsidian.md](https://obsidian.md/download).
- Run the installer. Take the defaults.
- Open Obsidian. Create a vault dedicated to their family tree (e.g., `Family Tree`). Save it somewhere they'll remember (Documents folder is fine).

### 2. Install BRAT

Charted Roots is currently distributed via [BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tool):

- In Obsidian, go to **Settings → Community plugins**.
- Click **Turn on community plugins** if it's off.
- Click **Browse**.
- Search for **BRAT**.
- Click **Install**, then **Enable**.

Explain in plain language: "BRAT is a helper plugin that lets you install Charted Roots, since Charted Roots isn't in the official plugin store yet."

### 3. Install Charted Roots via BRAT

- Go to **Settings → BRAT → Add Beta plugin**.
- Enter: `banisterious/obsidian-charted-roots`
- Click **Add Plugin**. Wait for the install (usually 5-10 seconds).
- Go to **Settings → Community plugins → Installed plugins**.
- Find Charted Roots in the list and toggle it on.

### 4. Configure basic settings

Walk through Charted Roots settings together:

- **Settings → Charted Roots → Folders → System folders**. Set the People folder, Sources folder, Events folder, and Places folder to their preferences (defaults are fine for most users; pick names that feel intuitive to your relative).
- Show them where settings are so they can find them later.

### 5. Create the first few people together

This is the most important part of the setup session. The plugin only feels useful once they've added their own family.

- Open **Control Center → People → Create Person**.
- Have them name the person. You drive the mouse.
- Add a parent. Then a grandparent. Then a sibling.
- Generate a simple family chart (Control Center → Visual Trees → New Tree).

The "aha" moment usually comes when they see their own family rendered as a tree.

### 6. Create a cheat sheet

Before you leave, write a one-page cheat sheet in plain language:

```
TO ADD A NEW PERSON
1. Click the ribbon icon (left side)
2. Click "People" tab
3. Click "Create Person"

TO SEE YOUR FAMILY TREE
1. Click the ribbon icon
2. Click "Visual Trees" tab
3. Click "New Tree"
4. Pick a person as the root

WHEN STUCK
- Email me at [your email]
- Or text [your phone]
```

Save the cheat sheet as a note in their vault and pin it. Print a hard copy too.

## What to emphasize when teaching

- **They can't break it.** Reassure them — Obsidian keeps backups, and editing a note won't destroy data. Fear of breaking things is the #1 reason non-technical users avoid features.
- **Start simple.** They don't need every feature. Focus on three things: adding people, linking relationships, viewing the chart. Everything else can wait.
- **It's okay to ask for help.** Make sure they have your contact info and feel comfortable using it.

## What will be overwhelming (and what to do about it)

Be ready for these pain points:

- **YAML frontmatter.** The `---` block at the top of notes looks intimidating. Tell them: "You don't need to edit that directly — use the Control Center forms instead. The plugin manages the YAML for you."
- **Obsidian jargon.** Terms like "vault," "canvas," "wikilink," "ribbon" are Obsidian-specific. Use analogies: "Vault is your filing cabinet. Canvas is a bulletin board. Wikilink is like a hyperlink between notes. Ribbon is the toolbar on the left."
- **Where to click.** Obsidian has many UI elements. Show them the 2-3 they'll use most: ribbon icon, command palette (`Ctrl+P`), file explorer.
- **File management.** If they're not comfortable with file systems, the file explorer is confusing. Tell them to use the People tab in Control Center for finding people, not the file explorer.

## After the setup session

- **Check in after a week.** Brief follow-up — call, text, email. Ask how they're doing. Offer a second session if they have questions.
- **Be ready to pivot.** If after 2-3 sessions they're still struggling, Charted Roots may not be the right tool. Don't push it. Suggest one of the alternatives (Gramps, Ancestry).
- **Look for signs of success.** If they're excited about owning their data, asking specific clarifying questions (vs. shutting down when confused), and willing to experiment, they'll be fine.
- **Look for signs of struggle.** If they expect it to "just work" without learning, ask "why is this so complicated?" repeatedly, or need step-by-step instructions for every action, the tool fit isn't there.

## Related guides

- [I want to add my first person from scratch](add-first-person-manually) — the workflow you'll walk through together
- [I want to migrate from Ancestry](migrate-from-ancestry) — if they have an existing Ancestry tree to bring across
- [I want to import a GEDCOM file and clean up the result](import-gedcom-and-cleanup)

## Reference

- Wiki: [Getting Started](https://github.com/banisterious/obsidian-charted-roots/wiki/Getting-Started)
- Wiki: [Community Use Cases — Helping a Non-Technical Family Member Get Started](https://github.com/banisterious/obsidian-charted-roots/wiki/Community-Use-Cases#helping-a-non-technical-family-member-get-started) — original case study this guide is built from
- [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) — the install conduit for Charted Roots while it's in beta

---

*Found something wrong or unclear? [Suggest an edit][issue-link] — opens a pre-filled issue with the `guides` label.*

[issue-link]: https://github.com/banisterious/obsidian-charted-roots/issues/new?labels=guides&title=%5BGuides%5D+onboard-non-technical-relative%3A+

---

## Notes for review

- **Non-standard shape on purpose** — per the earlier judgment call. The standard recipe template (What you'll need / Steps / Variations / Related / Reference) doesn't fit a meta-guide for the supporter persona. Replaced with: Before you begin / Setup / What to emphasize / What will be overwhelming / After the setup session. Per agreement with banisterious that this guide warrants the different shape.
- **Concrete install steps** at sections 1-3 (Obsidian, BRAT, Charted Roots) per banisterious's request — the wiki Community-Use-Cases entry hand-waves these; the guide makes them step-by-step.
- The "redirect to Gramps / Ancestry" framing in the Before-you-begin section is honest about Charted Roots not fitting every user. Worth being upfront — pushing the tool on the wrong audience produces frustrated relatives and worn-out supporters.
- The cheat sheet pattern at section 6 is the lightest single thing a supporter can do that has the highest sustained-impact on the relative's success.
- Length: ~1,180 words — over the 1000-word soft cap. Justified by the meta-guide shape: this is a playbook for a hard support situation, and trimming any of the five sections would leave a real gap. Worth flagging during the Hugo port as the "longest guide in the catalog by design."
