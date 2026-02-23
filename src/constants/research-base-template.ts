/**
 * Obsidian Bases template for managing Charted Roots research workflow entities
 */
export const RESEARCH_BASE_TEMPLATE = `visibleProperties:
  - formula.display_name
  - formula.entity_type
  - note.status
  - note.date
  - note.subject
  - note.project
  - note.up
summaries:
  total_research: 'values.length'
filters:
  or:
    - 'cr_type == "research_project"'
    - 'cr_type == "research_report"'
    - 'cr_type == "individual_research_note"'
    - 'cr_type == "research_journal"'
    - 'cr_type == "research_log_entry"'
formulas:
  display_name: 'title || file.name'
  entity_type: 'if(cr_type == "research_project", "Project", if(cr_type == "research_report", "Report", if(cr_type == "individual_research_note", "IRN", if(cr_type == "research_journal", "Journal", if(cr_type == "research_log_entry", "Log Entry", cr_type)))))'
properties:
  cr_id:
    displayName: ID
  note.cr_type:
    displayName: Type
  note.title:
    displayName: Title
  note.status:
    displayName: Status
  note.date:
    displayName: Date
  note.subject:
    displayName: Subject
  note.project:
    displayName: Project
  note.source:
    displayName: Source
  note.searched_for:
    displayName: Searched For
  note.result:
    displayName: Result
  note.reportTo:
    displayName: Audience
  note.research_level:
    displayName: Research Level
  note.up:
    displayName: Parent
  note.related:
    displayName: Related
  note.private:
    displayName: Private
  note.repositories:
    displayName: Repositories
  formula.display_name:
    displayName: Name
  formula.entity_type:
    displayName: Entity Type
views:
  - name: All Research
    type: table
    order:
      - formula.display_name
      - formula.entity_type
      - note.status
      - note.date
  - name: Research Projects
    type: table
    filters:
      and:
        - 'cr_type == "research_project"'
    order:
      - formula.display_name
      - note.status
      - note.research_level
  - name: Research Reports
    type: table
    filters:
      and:
        - 'cr_type == "research_report"'
    order:
      - formula.display_name
      - note.status
      - note.reportTo
  - name: Individual Research Notes
    type: table
    filters:
      and:
        - 'cr_type == "individual_research_note"'
    order:
      - formula.display_name
      - note.subject
      - note.status
  - name: Research Journals
    type: table
    filters:
      and:
        - 'cr_type == "research_journal"'
    order:
      - formula.display_name
      - note.date
      - note.repositories
  - name: Research Log Entries
    type: table
    filters:
      and:
        - 'cr_type == "research_log_entry"'
    order:
      - note.date
      - note.project
      - note.source
      - note.searched_for
      - note.result
  - name: By Status
    type: table
    groupBy:
      property: note.status
      direction: ASC
    order:
      - formula.display_name
      - formula.entity_type
  - name: By Project
    type: table
    filters:
      and:
        - 'cr_type == "research_log_entry"'
    groupBy:
      property: note.project
      direction: ASC
    order:
      - note.date
      - note.source
      - note.result
  - name: In Progress
    type: table
    filters:
      or:
        - 'status == "in-progress"'
        - 'status == "open"'
        - 'status == "draft"'
        - 'status == "review"'
    order:
      - formula.display_name
      - formula.entity_type
      - note.status
  - name: Completed
    type: table
    filters:
      or:
        - 'status == "completed"'
        - 'status == "final"'
        - 'status == "published"'
    order:
      - formula.display_name
      - formula.entity_type
  - name: Negative Findings
    type: table
    filters:
      and:
        - 'result == "negative"'
    order:
      - note.date
      - note.project
      - note.source
      - note.searched_for
  - name: Private
    type: table
    filters:
      and:
        - 'private == true'
    order:
      - formula.display_name
      - formula.entity_type
`;
