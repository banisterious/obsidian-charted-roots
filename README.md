# Canvas Roots: A Planned D3-Powered Family Tree Plugin for Obsidian

**Canvas Roots** is a blueprint for an Obsidian plugin that will automatically generate complex, D3-calculated family trees directly onto the Canvas using structured note properties for non-overlapping layouts.

This planned Obsidian plugin concept is designed for genealogists, historians, and world-builders. It is designed to transform structured data in your Markdown notes (relationships, dates, locations) into perfectly laid-out family trees directly on the Obsidian Canvas.

The core idea is a hybrid approach: the plugin will use the power of D3.js for advanced layout calculation, but will generate the output using native Obsidian Canvas nodes and edges. This is intended to create a beautiful, structured chart that is fully editable and linkable within the Canvas environment.


## ✨ Planned Features

- **Automated Layout:** The plugin will generate precise, non-overlapping pedigree (ancestor) and descendant charts using specialized D3 algorithms (similar to [family-chart](https://donatso.github.io/family-chart-doc/examples/v2/1-basic-tree) logic).

- **Native Canvas Nodes:** The tree will be built from Obsidian file nodes, making every person immediately linkable to external research, images, and documents on the Canvas.

- **Bi-Directional Linking:** The plugin will automatically enforce two-way relationships (e.g., setting a father automatically sets the child, and vice-versa) in your note properties.

- **Relayout Command:** It will feature a command to recalculate and restore the D3-optimized layout with a single click if the Canvas nodes become manually rearranged.

- **Standardized Data:** Will use native YAML and inline fields for maximum compatibility with tools like Dataview.


## 🛠️ Conceptual Workflow

### 1. Structure Your Notes

Ensure each person's note contains the following YAML frontmatter or inline fields. The `cr_id` field is essential for persistence and mapping.

```
    ---
    cr_id: 12345-uuid-67890
    born: 1888-05-15
    died: 1952-08-20
    ---
    ## [[Person Name]]

    Father:: [[John Smith]]
    Mother:: [[Jane Doe]]
    Spouse:: [[Eliza Brown]]
    Child:: [[Robert Smith]]
```

### 2. Generate the Tree (Planned Command)

1. Open or create a new Obsidian Canvas file (`.canvas`).

2. Navigate to the note of the person you want to be the root (center) of the tree.

3. Open the Command Palette (`Ctrl/Cmd + P`).

4. The planned command will be: `Canvas Roots: Generate Tree for Current Note`.

The plugin is designed to instantly populate the Canvas with the structured, D3-calculated family tree.


### 3. Maintain the Layout (Planned Command)

- If you drag the notes or add new family members, the tree may lose its structure.

- The command to restore the D3 layout will be: `Canvas Roots: Re-Layout Current Canvas`.


## 💾 Data Interchange & Deep Sync (Planned)

The power of Canvas Roots will extend to integration with industry-standard genealogy tools via the GEDCOM format.


### Two-Mode GEDCOM Import

The plugin will offer flexibility when importing family data:

1. **Canvas Visualization Mode (Quick Import):** Import a large `.ged` file and render the tree directly onto the Canvas without creating hundreds of notes in your vault. Perfect for quick visual analysis of external data.

2. **Vault Deep-Sync Mode (Full Integration):** Import a `.ged` file and automatically generate Markdown notes for every individual, source, and place. This will populate the notes with structured properties, creating a rich, queryable genealogical database powered by Dataview.


### Round-Trip Data Integrity

- **Export Capability:** A core feature will be the ability to export all the data collected within the Obsidian notes back into a standard `.ged` file, ensuring your research remains portable and can be transferred back to dedicated genealogy software.

- **Deep Queries:** By populating note properties with rich data (dates, locations, sources), you'll be able to run complex genealogical queries against your vault.


## 🧑‍💻 Development Notes (Pre-Development Phase)

This project is currently in the specification and architecture phase. The future plugin relies on reading the vault's file structure, applying the layout logic of D3.js internally, and safely writing the positional data back into the Canvas JSON file. Careful handling of the Canvas Node ID and the person's `cr_id` is required for persistence.
