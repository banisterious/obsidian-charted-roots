/**
 * Obsidian Bases template for managing Canvas Roots place notes
 */

/**
 * Property aliases mapping type
 * Maps user's custom property name → Canvas Roots canonical name
 */
export type PropertyAliases = Record<string, string>;

/**
 * Get the display property name for a canonical property
 * If an alias exists, returns the user's aliased name; otherwise returns the canonical name
 */
function getPropertyName(canonical: string, aliases: PropertyAliases): string {
	// Find if user has an alias for this canonical property
	for (const [userProp, canonicalProp] of Object.entries(aliases)) {
		if (canonicalProp === canonical) {
			return userProp;
		}
	}
	return canonical;
}

/**
 * Generate the Places base template with property aliases applied
 * @param aliases Property aliases from plugin settings
 * @returns The base template string with aliased property names
 */
export function generatePlacesBaseTemplate(aliases: PropertyAliases = {}): string {
	// Get aliased property names for place properties
	const name = getPropertyName('name', aliases);
	const place_type = getPropertyName('place_type', aliases);
	const place_category = getPropertyName('place_category', aliases);
	const parent_place = getPropertyName('parent_place', aliases);
	const coordinates = getPropertyName('coordinates', aliases);
	const universe = getPropertyName('universe', aliases);
	const collection = getPropertyName('collection', aliases);
	const aliases_prop = getPropertyName('aliases', aliases);
	const cr_id = getPropertyName('cr_id', aliases);

	return `visibleProperties:
  - note.${name}
  - note.${place_type}
  - note.${place_category}
  - note.${parent_place}
  - note.${coordinates}
  - note.${universe}
  - note.${collection}
  - note.${aliases_prop}
summaries:
  total_places: values.length
filters:
  or:
    - file.hasProperty("${place_type}")
    - note.type == "place"
formulas:
  display_name: ${name} || file.name
  has_coords: if(${coordinates}, "Yes", "No")
  hierarchy_path: if(${parent_place}, ${parent_place} + " → " + ${name}, ${name})
properties:
  ${cr_id}:
    displayName: ID
  note.${name}:
    displayName: Name
  note.${place_type}:
    displayName: Type
  note.${place_category}:
    displayName: Category
  note.${parent_place}:
    displayName: Parent
  note.${coordinates}:
    displayName: Coordinates
  note.${universe}:
    displayName: Universe
  note.${collection}:
    displayName: Collection
  note.${aliases_prop}:
    displayName: Aliases
  formula.display_name:
    displayName: Display Name
  formula.has_coords:
    displayName: Has Coords
  formula.hierarchy_path:
    displayName: Hierarchy
views:
  - name: All Places
    type: table
    filter: {}
    order:
      - note.${name}
      - note.${place_type}
      - note.${place_category}
      - note.${parent_place}
      - note.${coordinates}
    sort:
      - property: note.${name}
        direction: asc
  - name: By Type
    type: table
    filter: {}
    group:
      - property: note.${place_type}
    sort:
      - property: note.${name}
        direction: asc
  - name: By Category
    type: table
    filter: {}
    group:
      - property: note.${place_category}
    sort:
      - property: note.${name}
        direction: asc
  - name: Countries
    type: table
    filter:
      note.${place_type}: country
    sort:
      - property: note.${name}
        direction: asc
  - name: States/Provinces
    type: table
    filter:
      or:
        - note.${place_type}: state
        - note.${place_type}: province
    sort:
      - property: note.${name}
        direction: asc
  - name: Cities/Towns
    type: table
    filter:
      or:
        - note.${place_type}: city
        - note.${place_type}: town
        - note.${place_type}: village
    sort:
      - property: note.${name}
        direction: asc
  - name: Real Places
    type: table
    filter:
      note.${place_category}: real
    sort:
      - property: note.${name}
        direction: asc
  - name: Historical Places
    type: table
    filter:
      note.${place_category}: historical
    sort:
      - property: note.${name}
        direction: asc
  - name: Fictional Places
    type: table
    filter:
      note.${place_category}: fictional
    sort:
      - property: note.${name}
        direction: asc
  - name: By Universe
    type: table
    filter:
      note.${universe}:
        ne: null
    group:
      - property: note.${universe}
    sort:
      - property: note.${name}
        direction: asc
  - name: With Coordinates
    type: table
    filter:
      note.${coordinates}:
        ne: null
    sort:
      - property: note.${name}
        direction: asc
  - name: Missing Coordinates
    type: table
    filter:
      and:
        - note.${coordinates}:
            eq: null
        - or:
            - note.${place_category}: real
            - note.${place_category}: historical
    sort:
      - property: note.${name}
        direction: asc
  - name: Orphan Places
    type: table
    filter:
      note.${parent_place}:
        eq: null
    sort:
      - property: note.${name}
        direction: asc
  - name: By Collection
    type: table
    filter:
      note.${collection}:
        ne: null
    group:
      - property: note.${collection}
    sort:
      - property: note.${name}
        direction: asc
`;
}

/**
 * Static base template for backward compatibility
 * Uses canonical property names (no aliases)
 * @deprecated Use generatePlacesBaseTemplate() instead
 */
export const PLACES_BASE_TEMPLATE = generatePlacesBaseTemplate();
