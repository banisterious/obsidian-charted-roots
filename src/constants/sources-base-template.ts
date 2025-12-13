/**
 * Obsidian Bases template for managing Canvas Roots source notes
 */
export const SOURCES_BASE_TEMPLATE = `visibleProperties:
  - note.name
  - note.source_type
  - note.source_repository
  - note.source_date
  - note.confidence
  - note.collection
  - note.location
summaries:
  total_sources: values.length
filters:
  or:
    - note.type == "source"
    - file.hasProperty("source_type")
formulas:
  display_name: title || file.name
  has_media: if(media, "Yes", "No")
  year_only: if(source_date, source_date.year, "")
properties:
  cr_id:
    displayName: ID
  note.title:
    displayName: Title
  note.source_type:
    displayName: Type
  note.source_repository:
    displayName: Repository
  note.source_date:
    displayName: Date
  note.source_date_accessed:
    displayName: Accessed
  note.confidence:
    displayName: Confidence
  note.collection:
    displayName: Collection
  note.location:
    displayName: Location
  note.source_repository_url:
    displayName: URL
  note.media:
    displayName: Media
  formula.display_name:
    displayName: Display Name
  formula.has_media:
    displayName: Has Media
  formula.year_only:
    displayName: Year
views:
  - name: All Sources
    type: table
    filter: {}
    order:
      - note.title
      - note.source_type
      - note.source_repository
      - note.source_date
      - note.confidence
    sort:
      - property: note.title
        direction: asc
  - name: By Type
    type: table
    filter: {}
    group:
      - property: note.source_type
    sort:
      - property: note.title
        direction: asc
  - name: By Repository
    type: table
    filter: {}
    group:
      - property: note.source_repository
    sort:
      - property: note.title
        direction: asc
  - name: By Confidence
    type: table
    filter: {}
    group:
      - property: note.confidence
    sort:
      - property: note.title
        direction: asc
  - name: Vital Records
    type: table
    filter:
      note.source_type: vital_record
    sort:
      - property: note.source_date
        direction: asc
  - name: Census Records
    type: table
    filter:
      note.source_type: census
    sort:
      - property: note.source_date
        direction: asc
  - name: Church Records
    type: table
    filter:
      or:
        - note.source_type: church_record
        - note.source_type: parish_register
    sort:
      - property: note.source_date
        direction: asc
  - name: Legal Documents
    type: table
    filter:
      or:
        - note.source_type: will
        - note.source_type: probate
        - note.source_type: land_record
        - note.source_type: court_record
    sort:
      - property: note.source_date
        direction: asc
  - name: Military Records
    type: table
    filter:
      note.source_type: military_record
    sort:
      - property: note.source_date
        direction: asc
  - name: Photos & Media
    type: table
    filter:
      or:
        - note.source_type: photograph
        - note.source_type: newspaper
    sort:
      - property: note.source_date
        direction: desc
  - name: High Confidence
    type: table
    filter:
      note.confidence: high
    sort:
      - property: note.title
        direction: asc
  - name: Low Confidence
    type: table
    filter:
      or:
        - note.confidence: low
        - note.confidence: unknown
    sort:
      - property: note.title
        direction: asc
  - name: With Media
    type: table
    filter:
      note.media:
        ne: null
    sort:
      - property: note.title
        direction: asc
  - name: Missing Media
    type: table
    filter:
      note.media:
        eq: null
    sort:
      - property: note.title
        direction: asc
  - name: By Date
    type: table
    filter:
      note.source_date:
        ne: null
    sort:
      - property: note.source_date
        direction: asc
  - name: Recently Accessed
    type: table
    filter:
      note.source_date_accessed:
        ne: null
    sort:
      - property: note.source_date_accessed
        direction: desc
  - name: By Collection
    type: table
    filter:
      note.collection:
        ne: null
    group:
      - property: note.collection
    sort:
      - property: note.title
        direction: asc
  - name: By Location
    type: table
    filter:
      note.location:
        ne: null
    group:
      - property: note.location
    sort:
      - property: note.title
        direction: asc
`;
