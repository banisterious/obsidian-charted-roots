/**
 * Obsidian Bases template for managing Canvas Roots organization notes
 */
export const ORGANIZATIONS_BASE_TEMPLATE = `visibleProperties:
  - note.name
  - note.org_type
  - note.parent_org
  - note.founded
  - note.dissolved
  - note.motto
  - note.seat
  - note.universe
  - note.collection
summaries:
  total_organizations: values.length
filters:
  or:
    - note.type == "organization"
    - file.hasProperty("org_type")
formulas:
  display_name: name || file.name
  is_active: if(dissolved, "No", "Yes")
  hierarchy_path: if(parent_org, parent_org + " → " + name, name)
properties:
  cr_id:
    displayName: ID
  note.name:
    displayName: Name
  note.org_type:
    displayName: Type
  note.parent_org:
    displayName: Parent
  note.founded:
    displayName: Founded
  note.dissolved:
    displayName: Dissolved
  note.motto:
    displayName: Motto
  note.seat:
    displayName: Seat
  note.universe:
    displayName: Universe
  note.collection:
    displayName: Collection
  formula.display_name:
    displayName: Display Name
  formula.is_active:
    displayName: Active
  formula.hierarchy_path:
    displayName: Hierarchy
views:
  - name: All Organizations
    type: table
    filter: {}
    order:
      - note.name
      - note.org_type
      - note.parent_org
      - note.founded
      - note.dissolved
    sort:
      - property: note.name
        direction: asc
  - name: By Type
    type: table
    filter: {}
    group:
      - property: note.org_type
    sort:
      - property: note.name
        direction: asc
  - name: Noble Houses
    type: table
    filter:
      note.org_type: noble_house
    sort:
      - property: note.name
        direction: asc
  - name: Guilds
    type: table
    filter:
      note.org_type: guild
    sort:
      - property: note.name
        direction: asc
  - name: Corporations
    type: table
    filter:
      note.org_type: corporation
    sort:
      - property: note.name
        direction: asc
  - name: Military Units
    type: table
    filter:
      note.org_type: military
    sort:
      - property: note.name
        direction: asc
  - name: Religious Orders
    type: table
    filter:
      note.org_type: religious
    sort:
      - property: note.name
        direction: asc
  - name: Political Entities
    type: table
    filter:
      note.org_type: political
    sort:
      - property: note.name
        direction: asc
  - name: Educational
    type: table
    filter:
      note.org_type: educational
    sort:
      - property: note.name
        direction: asc
  - name: Active Organizations
    type: table
    filter:
      note.dissolved:
        eq: null
    sort:
      - property: note.name
        direction: asc
  - name: Dissolved Organizations
    type: table
    filter:
      note.dissolved:
        ne: null
    sort:
      - property: note.dissolved
        direction: desc
  - name: By Universe
    type: table
    filter:
      note.universe:
        ne: null
    group:
      - property: note.universe
    sort:
      - property: note.name
        direction: asc
  - name: Top-Level Organizations
    type: table
    filter:
      note.parent_org:
        eq: null
    sort:
      - property: note.name
        direction: asc
  - name: Sub-Organizations
    type: table
    filter:
      note.parent_org:
        ne: null
    group:
      - property: note.parent_org
    sort:
      - property: note.name
        direction: asc
  - name: By Collection
    type: table
    filter:
      note.collection:
        ne: null
    group:
      - property: note.collection
    sort:
      - property: note.name
        direction: asc
  - name: With Seat
    type: table
    filter:
      note.seat:
        ne: null
    sort:
      - property: note.name
        direction: asc
  - name: Missing Seat
    type: table
    filter:
      note.seat:
        eq: null
    sort:
      - property: note.name
        direction: asc
`;
