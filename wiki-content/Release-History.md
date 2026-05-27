# Release History

This document contains detailed implementation documentation for completed Charted Roots features. For the current roadmap of planned features, see [Roadmap](Roadmap).

For version-specific changes, see the [CHANGELOG](../CHANGELOG.md) and [GitHub Releases](https://github.com/banisterious/obsidian-charted-roots/releases).

---

## Table of Contents

- [v0.22.x](#v022x)
  - [v0.22.52 Round-Up: Adoption Icon and Sex Marker Consistency](#v02252-round-up-adoption-icon-and-sex-marker-consistency-v02252)
  - [v0.22.51 Round-Up: Fictional-Date Polish and Timeline Sort-Order Tiebreak](#v02251-round-up-fictional-date-polish-and-timeline-sort-order-tiebreak-v02251)
  - [v0.22.50 Round-Up: Date-Parser Relaxation, Adoption-Event Always-On, and Mobile-Migration First Batch](#v02250-round-up-date-parser-relaxation-adoption-event-always-on-and-mobile-migration-first-batch-v02250)
  - [v0.22.49 Round-Up: Adoption-Event Coverage Expansion, Era-Aware Twin Tiebreak, and Audit-Plan Progress](#v02249-round-up-adoption-event-coverage-expansion-era-aware-twin-tiebreak-and-audit-plan-progress-v02249)
  - [v0.22.48 Round-Up: Timeline Coverage Expansion, Twin Sort Tiebreak, and Family Chart Kinship-Label Anchor](#v02248-round-up-timeline-coverage-expansion-twin-sort-tiebreak-and-family-chart-kinship-label-anchor-v02248)
  - [v0.22.47 Round-Up: Per-Field Conflict Guards, Marriage-Label Anchor, and #591 Follow-Up](#v02247-round-up-per-field-conflict-guards-marriage-label-anchor-and-591-follow-up-v02247)
  - [v0.22.46 Round-Up: Community-Driven Bug-Fix Release with Timeline Coverage Expansion and Events Filter Additions](#v02246-round-up-community-driven-bug-fix-release-with-timeline-coverage-expansion-and-events-filter-additions-v02246)
  - [v0.22.45 Round-Up: Bundle Hygiene, Sibling-Sort Consolidation, and Community-Reported Fixes](#v02245-round-up-bundle-hygiene-sibling-sort-consolidation-and-community-reported-fixes-v02245)
  - [v0.22.44: Bundled styles.css Rebuild and Release-Procedure Flip](#v02244-bundled-stylescss-rebuild-and-release-procedure-flip-v02244)
  - [v0.22.43: CSS Lint Cleanup, !important and :has() Closures](#v02243-css-lint-cleanup-important-and-has-closures-v02243)
  - [v0.22.40 – v0.22.42 Round-Up: Scanner Severity Response Arc](#v02240--v02242-round-up-scanner-severity-response-arc-v02240v02242)
  - [v0.22.39 Round-Up: Event Ordering UI, Map View Hardening, and Family Chart Asymmetry Drop](#v02239-round-up-event-ordering-ui-map-view-hardening-and-family-chart-asymmetry-drop-v02239)
  - [v0.22.38 Round-Up: Native Button Migration, CSS Scan Cleanup, and Custom Relationship Display](#v02238-round-up-native-button-migration-css-scan-cleanup-and-custom-relationship-display-v02238)
  - [v0.22.32 – v0.22.37 Round-Up: Community Automated Review Cleanup Arc](#v02232--v02237-round-up-community-automated-review-cleanup-arc-v02232v02237)
  - [v0.22.31 Round-Up: Fictional-Date Cluster, Community Review Cleanup, and Pop-out Window Timer Migration](#v02231-round-up-fictional-date-cluster-community-review-cleanup-and-pop-out-window-timer-migration-v02231)
  - [v0.22.30 Round-Up: cr_id Collision Filter, Negative-Year Decade Bucketing, and Family Chart XSS Hardening](#v02230-round-up-cr_id-collision-filter-negative-year-decade-bucketing-and-family-chart-xss-hardening-v02230)
  - [v0.22.29 Round-Up: Bidirectional-Sync Audit and the Seven Gaps It Surfaced](#v02229-round-up-bidirectional-sync-audit-and-the-seven-gaps-it-surfaced-v02229)
  - [v0.22.28 Round-Up: Edit-Modal Display Coverage and Property-Based Fuzz Expansion](#v02228-round-up-edit-modal-display-coverage-and-property-based-fuzz-expansion-v02228)
  - [v0.22.27 Round-Up: Cache-Race Audit and the End of the 2-Second Sleep](#v02227-round-up-cache-race-audit-and-the-end-of-the-2-second-sleep-v02227)
  - [v0.22.26 Round-Up: RelationshipQueryService and the Adopted/Step Children Coverage Sweep](#v02226-round-up-relationshipqueryservice-and-the-adoptedstep-children-coverage-sweep-v02226)
  - [v0.22.25 Round-Up: Modal Display Parsing, Membership Writer Cleanup, and Cache-Timing Follow-Up](#v02225-round-up-modal-display-parsing-membership-writer-cleanup-and-cache-timing-follow-up-v02225)
  - [v0.22.24 Round-Up: Wikilink Writer Hardening, Custom Relationships in All-Mode, and Org Membership Sync](#v02224-round-up-wikilink-writer-hardening-custom-relationships-in-all-mode-and-org-membership-sync-v02224)
  - [v0.22.23 Hotfix: Marriage-Detail Symmetric Write](#v02223-hotfix-marriage-detail-symmetric-write-v02223)
  - [v0.22.22 Round-Up: Wikilink Cascade Self-Heal, Profile View Symmetry, and Media Captions](#v02222-round-up-wikilink-cascade-self-heal-profile-view-symmetry-and-media-captions-v02222)
  - [v0.22.21 Round-Up: Dynamic Block Display Paths and Profile View Family-Custom Routing](#v02221-round-up-dynamic-block-display-paths-and-profile-view-family-custom-routing-v02221)
  - [v0.22.20 Round-Up: Mobile Pre-Release Verification and Two Follow-Up Fixes from v0.22.19](#v02220-round-up-mobile-pre-release-verification-and-two-follow-up-fixes-from-v02219-v02220)
  - [v0.22.19 Round-Up: Wikilink cr_id Disambiguation and Relationship Calculator BFS Expansion](#v02219-round-up-wikilink-cr_id-disambiguation-and-relationship-calculator-bfs-expansion-v02219)
  - [v0.22.18 Round-Up: Profile-Pane Cache Race and Three Rendering Fixes](#v02218-round-up-profile-pane-cache-race-and-three-rendering-fixes-v02218)
  - [v0.22.17 Round-Up: Edit Person Hardening and a Citation Surface Promotion](#v02217-round-up-edit-person-hardening-and-a-citation-surface-promotion-v02217)
  - [v0.22.16 Round-Up: Modal Polish, Marriage Popup Parity, and Filename Casing](#v02216-round-up-modal-polish-marriage-popup-parity-and-filename-casing-v02216)
  - [v0.22.15 Round-Up: Universe Rename Cascade Coverage and Marriage Popup Partner Age](#v02215-round-up-universe-rename-cascade-coverage-and-marriage-popup-partner-age-v02215)
  - [v0.22.14 Round-Up: Universe Rename Closure, Marriage Marker Pairing, and a Cleanup Wizard Step](#v02214-round-up-universe-rename-closure-marriage-marker-pairing-and-a-cleanup-wizard-step-v02214)
  - [v0.22.13 Round-Up: Map Coverage — Multi-Spouse, Multi-Participant, and Hierarchical Places](#v02213-round-up-map-coverage--multi-spouse-multi-participant-and-hierarchical-places-v02213)
  - [v0.22.12 Round-Up: Marriage Symmetry, Universe Rename Cascade, and Map UX Polish](#v02212-round-up-marriage-symmetry-universe-rename-cascade-and-map-ux-polish-v02212)
  - [v0.22.11 Round-Up: Path Label Architecture, Person-Delete Hardening, and Universe Dropdown](#v02211-round-up-path-label-architecture-person-delete-hardening-and-universe-dropdown-v02211)
  - [v0.22.10 Round-Up: Negative Years, Modal Polish, Calendar Era Input, and Auto Regression](#v02210-round-up-negative-years-modal-polish-calendar-era-input-and-auto-regression-v02210)
  - [v0.22.9 Round-Up: Map Polish, Sibling Reality Windows, and Cluster Closure](#v0229-round-up-map-polish-sibling-reality-windows-and-cluster-closure-v0229)
  - [v0.22.8 Round-Up: Map, Timeline, Statistics, and Modal Polish](#v0228-round-up-map-timeline-statistics-and-modal-polish-v0228)
  - [v0.22.7 Round-Up: Map UX, Stepchild Handling, and Universe-Calendar Linking](#v0227-round-up-map-ux-stepchild-handling-and-universe-calendar-linking-v0227)
  - [v0.22.6 Fix: Fictional-Era Coverage Round-Up](#v0226-fix-fictional-era-coverage-round-up-v0226)
  - [v0.22.5 Fix: Fictional-Calendar Gaps and Dynamic-Content Noise](#v0225-fix-fictional-calendar-gaps-and-dynamic-content-noise-v0225)
  - [v0.22.4 Hotfix: Step-Parent Save Path](#v0224-hotfix-step-parent-save-path-v0224)
  - [v0.22.3 Fix: Cross-Entity Collections Aggregation](#v0223-fix-cross-entity-collections-aggregation-v0223)
  - [v0.22.2 Hotfix: IDs-Only Relationship Arrays](#v0222-hotfix-ids-only-relationship-arrays-v0222)
  - [v0.22.1 Hotfix: Spouse Format Migration](#v0221-hotfix-spouse-format-migration-v0221)
  - [v0.22.0 Stability Release](#v0220-stability-release-v0220)
- [v0.21.x](#v021x)
  - [v0.21.0 Edit Person Round-Up](#v0210-edit-person-round-up-v0210)
- [v0.20.x](#v020x)
  - [v0.20.57 Feature Round-Up](#v02057-feature-round-up-v02057)
  - [Child Map Markers and Region Editing](#child-map-markers-and-region-editing-v02056)
  - [Linked Map Drill-Down Navigation](#linked-map-drill-down-navigation-v02056)
  - [Universe Entity Dynamic Blocks](#universe-entity-dynamic-blocks-v02056)
  - [Universe Map Thumbnails](#universe-map-thumbnails-v02056)
  - [Image Region Crop](#image-region-crop-v02055)
  - [PDF Previews in Media](#pdf-previews-in-media-v02054)
  - [Alt Name Display](#alt-name-display-v02052v02053)
  - [Calendar View](#calendar-view-v02047)
  - [Source Note Hierarchies](#source-note-hierarchies-v02046)
  - [Source Hierarchy Display](#source-hierarchy-display-v02046)
  - [Person-Focused Map Journey](#person-focused-map-journey-v02045)
  - [Customizable Timeline Display Templates](#customizable-timeline-display-templates-v02038)
  - [Citation Integration](#citation-integration-v02038)
  - [Family Events on Timelines](#family-events-on-timelines-v02037)
  - [Calculate Multiple Relationships](#calculate-multiple-relationships-v02036)
  - [Cross-Project Research Queries](#cross-project-research-queries-v02035)
  - [Historical Context Overlay and Age Annotations](#historical-context-overlay-and-age-annotations-v02034)
  - [Citation Metadata Support](#citation-metadata-support-v02034)
  - [Comprehensive GEDCOM Field Coverage](#comprehensive-gedcom-field-coverage-v02033)
  - [Book & Narrative Compilation](#book--narrative-compilation-v02026)
  - [Entity Profile View](#entity-profile-view-v02018)
  - [Structured Role Lists for Organizations](#structured-role-lists-for-organizations-v02017)
  - [Mills-Aligned Source Classification](#mills-aligned-source-classification-v02017)
  - [Map View Marker Layering](#map-view-marker-layering-v0203)
  - [Control Center Modularization](#control-center-modularization)
- [v0.19.x](#v019x)
  - [Unified Place Lookup](#unified-place-lookup-v01917)
  - [Inheritance & Succession Tracking](#inheritance--succession-tracking)
  - [Organization Member Management](#organization-member-management)
  - [Person Roles in Sources](#person-roles-in-sources-v01916)
  - [Event Type Icons](#event-type-icons-v01915)
  - [Multi-Spouse Visual Cues](#multi-spouse-visual-cues-v01914)
  - [GEDCOM Media Import](#gedcom-media-import-v01913)
  - [Research Workflow Phase 1](#research-workflow-phase-1-v01911)
  - [DNA Match Tracking](#dna-match-tracking-v0199)
  - [Name Components](#name-components-v0197)
  - [Per-Map Marker Assignment](#per-map-marker-assignment-v0196)
  - [GEDCOM Notes Support](#gedcom-notes-support-v0195)
  - [Timeline Event Description Display](#timeline-event-description-display-v0195)
  - [Romantic Relationship Label Preference](#romantic-relationship-label-preference-v0195)
  - [Partial Date Support](#partial-date-support-v0192)
  - [Plugin Rename: Canvas Roots → Charted Roots](#plugin-rename-canvas-roots--charted-roots-v0190)
- [v0.18.x](#v018x)
  - [Automatic Wikilink Resolution](#automatic-wikilink-resolution-v01832)
  - [MyHeritage GEDCOM Import Compatibility](#myheritage-gedcom-import-compatibility-v01828)
  - [Optional Person Names](#optional-person-names-v01827)
  - [DMS Coordinate Conversion](#dms-coordinate-conversion-v01827)
  - [DNA Match Tracking - Phase 1](#dna-match-tracking---phase-1-v01827)
  - [Web Clipper Integration - Phase 1](#web-clipper-integration---phase-1-v01825)
  - [Staging Management](#staging-management-v01824)
  - [Export Privacy & Sensitive Data](#export-privacy--sensitive-data-v01822)
  - [Card Style Options](#card-style-options-v01815)
  - [Gramps Notes Integration](#gramps-notes-integration-v01813)
  - [Edit Person Events & Sources](#edit-person-events--sources-v01814)
  - [Cleanup Wizard Phase 4](#cleanup-wizard-phase-4-v01811)
  - [Property Naming Normalization](#property-naming-normalization-v01811)
  - [Custom Map Authoring](#custom-map-authoring-v01810)
  - [Nested Properties Redesign](#nested-properties-redesign-v0189)
  - [Inclusive Parent Relationships](#inclusive-parent-relationships-v0187)
  - [Media Upload and Management Enhancement](#media-upload-and-management-enhancement-v0186)
  - [Timeline Export Consolidation](#timeline-export-consolidation-v0182)
  - [Create Person Enhancements](#create-person-enhancements-v0181)
  - [Event Person Property Consolidation](#event-person-property-consolidation-v0180)
- [v0.17.x](#v017x)
  - [Research Level Property](#research-level-property-v0175)
  - [Excalidraw Export Enhancements](#excalidraw-export-enhancements-v0171)
  - [Post-Import Cleanup Wizard](#post-import-cleanup-wizard-v0170)
  - [Source Array Migration](#source-array-migration-v0170)
  - [Migration Notice](#migration-notice-v0170)
- [v0.16.x](#v016x)
  - [Import/Export Hub](#importexport-hub-v0160)
- [v0.15.x](#v015x)
  - [Visual Tree PDF Quality Improvements](#visual-tree-pdf-quality-improvements-v0153)
  - [Report Wizard Enhancements](#report-wizard-enhancements-v0153)
  - [Report Generator ODT Export](#report-generator-odt-export-v0153)
  - [Calendarium Integration Phase 2](#calendarium-integration-phase-2-v0152)
  - [Family Chart Export Wizard](#family-chart-export-wizard-v0151)
  - [Family Chart Styling Panel](#family-chart-styling-panel-v0151)
  - [Universal Media Linking](#universal-media-linking-v0150)
- [v0.14.x](#v014x)
  - [Visual Tree Charts](#visual-tree-charts-v0140)
- [v0.13.x](#v013x)
  - [Control Center Dashboard](#control-center-dashboard-v0136)
  - [Extended Report Types](#extended-report-types-v0135)
  - [PDF Report Export](#pdf-report-export-v0134)
  - [Universe Management](#universe-management-v0130)
- [v0.12.x](#v012x)
  - [Configurable Normalization](#configurable-normalization-v01212)
  - [Step & Adoptive Parent Support](#step--adoptive-parent-support-v01210)
  - [Statistics & Reports](#statistics--reports-v0129)
  - [Dynamic Note Content](#dynamic-note-content-v0128)
  - [Gramps Source Import](#gramps-source-import-v0126)
  - [Bulk Source-Image Linking](#bulk-source-image-linking-v0125)
  - [Calendarium Integration Phase 1](#calendarium-integration-phase-1-v0120)
- [v0.11.x](#v011x)
  - [Export v2](#export-v2-v0110)
- [v0.10.x](#v010x)
  - [Sex/Gender Identity Fields](#sexgender-identity-fields-v01020)
  - [Unified Property Configuration](#unified-property-configuration-v01019)
  - [Data Enhancement Pass](#data-enhancement-pass-v01017)
  - [Type Customization](#type-customization-v0103)
  - [Flexible Note Type Detection](#flexible-note-type-detection-v0102)
  - [GEDCOM Import v2](#gedcom-import-v2-v0101)
  - [Chronological Story Mapping](#chronological-story-mapping-v0100)
- [v0.9.x](#v09x)
  - [Value Aliases](#value-aliases-v094)
  - [Property Aliases](#property-aliases-v093)
  - [Events Tab](#events-tab-v092)
  - [Style Settings Integration](#style-settings-integration-v091)
  - [Evidence Visualization](#evidence-visualization-v090)
- [v0.8.x](#v08x)
  - [Source Media Gallery & Document Viewer](#source-media-gallery--document-viewer-v080)
- [v0.7.x](#v07x)
  - [Organization Notes](#organization-notes-v070)
  - [Fictional Date Systems](#fictional-date-systems-v070)
  - [Custom Relationship Types](#custom-relationship-types-v070)
- [v0.6.x](#v06x)
  - [Schema Validation](#schema-validation-v063)
  - [Maps Tab](#maps-tab-v062)
  - [Geographic Features](#geographic-features-v060)
  - [Import/Export Enhancements](#importexport-enhancements-v060)

---

## v0.22.x

### v0.22.52 Round-Up: Adoption Icon and Sex Marker Consistency (v0.22.52)

Small reactive patch closing two reporter-driven UI papercuts. The focal person's own `Adopted` event row on the Dynamic Timeline Block now renders with an icon (the adoptive parent's `Adopted {name}` row already showed the generic family-event `users` icon, but the focal-own row had nothing — the renderer's icon resolution called `getEventType('adoption', ...)` and the built-in catalog had no entry with that id, so the lookup returned undefined and the row fell through to a placeholder span). The Edit Person modal now recognizes the single-letter sex markers (`M` / `F` / `X` / `U`) that Profile View has been writing and emits the same canonical form on save, ending a write-shape divergence that grayed out the dropdown when reopening a marker-form note. **1048 tests passing across 79 suites**.

**Fix: Dynamic Timeline Block focal-own `Adopted` event renders with an icon** ([#627](https://github.com/banisterious/obsidian-charted-roots/issues/627)): The renderer's icon resolution at the focal-own adoption row called `getEventType('adoption', ...)`, but the built-in `EVENT_TYPE_DEFINITIONS` array didn't include an entry with that id — so the lookup returned `undefined` and the renderer fell through to the placeholder span. The adoptive parent's `Adopted {name}` row was unaffected because it carries `isFamilyEvent: true` and gets the generic `users` icon via the family-event branch. The fix adds `adoption` as a built-in vital event type alongside birth / death / marriage / divorce (id `adoption`, icon `heart-handshake`, color `#fb923c` warm orange). The id also lands in the `CORE_EVENT_TYPES` tuple so the by-id category lookup agrees with the definition's `category` field. Side benefit: any other surface that consults the built-in event-type catalog (event timelines, map controller, Create/Edit Event modal, GEDCOM-related event mapping) picks up the new entry automatically — no call-site changes needed. 7 new test cases in `tests/event-type-adoption.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka); confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Edit Person modal recognizes single-letter sex markers and writes the canonical GEDCOM-aligned form** ([#629](https://github.com/banisterious/obsidian-charted-roots/issues/629)): Profile View writes single-letter sex markers (`M` / `F` / `X` / `U`) per `CANONICAL_SEX_VALUES` in the value-alias service. Edit Person previously wrote word forms (`male` / `female` / `nonbinary` / empty), so a person saved via Profile View as `sex: F` opened in Edit Person with the dropdown grayed out as if the value were unrecognized — and the two surfaces wrote divergent shapes for the same logical value. The fix routes the loaded sex value through `ValueAliasService.resolve('sex', ...)` so all known shapes (word forms, GEDCOM markers, aliases like `nb` / `enby` / `intersex`) normalize to the canonical M/F/X/U set before populating the dropdown. The dropdown's options also flip from word values to marker values with display labels (`Male` / `Female` / `Non-binary` / `Unknown`), gaining an explicit `Non-binary` (`X`) option and an explicit `Unknown` (`U`) option that the previous dropdown lacked. Saving an existing word-form note via Edit Person now writes the canonical marker, completing the migration per-note on next edit. Existing data is preserved on read (the value-alias service's case-insensitive resolve handles `MALE` / `Female` / `NonBinary` / custom user-defined aliases). 18 new test cases in `tests/sex-value-normalization.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Stability-window impact:** v0.22.52 is the sixth patch in the v0.22.46-anchored stability window opened on 2026-05-17. Two reactive fixes; doesn't reset the window. Post-release Community Plugins automated review held at 96 / 100 (same as v0.22.48 through v0.22.51 baselines; no new findings — six consecutive releases at this score).

### v0.22.51 Round-Up: Fictional-Date Polish and Timeline Sort-Order Tiebreak (v0.22.51)

Reactive patch closing three reporter-driven fictional-date and timeline-ordering papercuts on the heels of v0.22.50, plus one audit Phase 5 cleanup. Two follow-ups address scenarios v0.22.50's fixes didn't fully reach: inline approximation markers between an era and a 3-digit year (`born: DE ~310`) now strip cleanly so the fictional parser succeeds end-to-end ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up); and per-person Dynamic Timeline Blocks now consult the v0.22.45 [#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) `sort_order` topological values for same-year `before`/`after` tiebreaks instead of falling through to insertion order ([#625](https://github.com/banisterious/obsidian-charted-roots/issues/625)). Independently, fictional-era dates carrying an ISO-style `-MM-DD` suffix (e.g., `adoption_date: DE 1264-08-15`) now preserve the era prefix on display rather than rendering as a plain year ([#626](https://github.com/banisterious/obsidian-charted-roots/issues/626)). **1023 tests passing across 77 suites**.

**Fix: Fictional-era dates with an inline approximation marker parse correctly** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624) follow-up): The v0.22.50 fix relaxed the bare-digit fallback for #624's reported "3-digit year" symptom, but the actual data shape was a frontmatter value of `born: DE ~310` (era + inline tilde + 3-digit year). The inline tilde sitting between the era abbreviation and the year broke the fictional parser's pattern matching, because `stripApproximationMarkers` only handled markers at the start of the string with required trailing whitespace. Downstream effect on the Dynamic Timeline Block: the birth date parsed as `null`, the era-prefixed adoption date passed the safety-net check, and the renderer dropped the age annotation rather than risk an era-blind subtraction. The fix extends `stripApproximationMarkers` to also strip inline markers (between whitespace and a digit), covering `~`, `circa`, `c.`, `ca`, `about`, `abt`, and `approx(imately)` uniformly. So `"DE ~310"`, `"DE c. 1264"`, and `"DE circa 310"` all parse cleanly as fictional approximate dates with the era preserved. 8 new test cases in `tests/fictional-date-parser-approximation.test.ts` plus 5 new end-to-end timeline-renderer cases in `tests/timeline-renderer-age.test.ts` fence the inline-marker behavior across `~`, `c.`, `circa`, and the no-marker control. Reported by [@doctorwodka](https://github.com/doctorwodka) after the v0.22.50 fix didn't resolve her actual data shape.

**Fix: Per-person Dynamic Timeline Block respects `before`/`after` event ordering** ([#625](https://github.com/banisterious/obsidian-charted-roots/issues/625)): The v0.22.45 [#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) auto-compute service writes `sort_order` topological values onto events when their `before`/`after` frontmatter is set, and the Events timeline view consumes those values correctly. Per-person Dynamic Timeline Blocks were missed in that sweep: the renderer's `TimelineEntry` interface didn't expose the `sortOrder` field, the Event-to-TimelineEntry conversion dropped it, and the same-year tiebreak in the comparator never consulted it. So when [@doctorwodka](https://github.com/doctorwodka) filed a same-year pair where `Event A` had `after: [[Event B]]`, the person's timeline still rendered them in alphabetical insertion order rather than B-then-A. The fix adds the `sortOrder` field to `TimelineEntry`, copies it during the Event-to-Entry conversion, and inserts a sort_order check between the existing year compare and the existing rawDate tiebreak in `compareTimelineEntriesByDate`. The check only fires when both entries have a sort_order value, so events without `before`/`after` constraints (birth from person, marriages from spouse metadata, family events, context entries) continue to fall through to the rawDate / insertion-order behavior. Bug has been latent since v0.22.39 (when `before`/`after` properties first arrived). 6 new test cases in `tests/timeline-sort-year-tiebreak.test.ts`. Reported by [@doctorwodka](https://github.com/doctorwodka); confirmed by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Fictional-era dates with an ISO-style month/day suffix preserve the era prefix on display** ([#626](https://github.com/banisterious/obsidian-charted-roots/issues/626)): A frontmatter value like `adoption_date: DE 1264-08-15` (custom forward-direction calendar with month and day precision) rendered as a plain `1264` on the Dynamic Timeline Block while sibling rows on the same person correctly showed `DE 310` and `DE 1260`. The fictional parser's patterns are all anchored at end-of-string, and only the v0.22.47 [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up's `T HH:MM[:SS]` time suffix was stripped before pattern matching. So `DE 1264-08-15` failed every fictional pattern, fell through to the standard parser's 4-digit substring match, and ended up as a standard-typed date with no era preserved; `formatYearForDisplay` then reached `extractYear` and pulled only the digits. Age math was unaffected because `calculateAge` enters the standard-date fallback path and uses canonical-year arithmetic when one side parses as fictional and the other as standard. The fix extends the suffix-strip in both `parse()` and `looksLikeFictionalDate()` to also handle trailing `-MM-DD` and `-MM` shapes, mirroring how `T HH:MM[:SS]` is handled. Pure ISO dates like `2024-08-15` are still rejected by the explicit ISO-pattern check (now run before the strip in the look-ahead path). 18 new test cases in `tests/fictional-date-parser-date-suffix.test.ts`. Spotted during the v0.22.51 #624 follow-up dev-vault verification.

**Internal: Control Center mobile-mode check drops the body-class fallback** (audit Phase 5): `isMobileMode()` previously consulted both `Platform.isMobile` and `activeDocument.body.classList.contains('is-mobile')` as a belt-and-suspenders pair. v0.22.49's `MobileClassManager` (Phase 4a) made `Platform.isMobile` authoritative across the plugin, so the body-class check is redundant; the method now returns `Platform.isMobile` directly. No user-visible behavior change.

**Stability-window impact:** v0.22.51 is the fifth patch in the v0.22.46-anchored stability window opened on 2026-05-17. Three reactive fixes plus one Phase 5 cleanup; doesn't reset the window. Post-release Community Plugins automated review held at 96 / 100 (same as v0.22.48, v0.22.49, and v0.22.50 baselines; no new findings).

### v0.22.50 Round-Up: Date-Parser Relaxation, Adoption-Event Always-On, and Mobile-Migration First Batch (v0.22.50)

Three reporter-driven items plus the first sub-arc of audit Phase 4b. Two Family Chart fixes from [@doctorwodka](https://github.com/doctorwodka): the card display for six free-form text fields (`religion`, `alt name`, `nickname`, `title`, `occupation`, `caste`) now renders aliases instead of raw `[[…]]` markup when set to a wikilink ([#622](https://github.com/banisterious/obsidian-charted-roots/issues/622)); and bare 1-3 digit year strings stored in custom fictional-era calendars no longer drop the age annotation on the adoption event when paired with era-prefixed dates elsewhere on the same person ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624)). A toggle-gate removal on the Dynamic Timeline Block makes adopted-sibling and adopted-grandchild adoption events always-on ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)), mirroring the existing always-on adoptive-parent event from [#396](https://github.com/banisterious/obsidian-charted-roots/issues/396). Internally, audit Phase 4b's first sub-arc closes: three registered-view stylesheets (`map-view.css`, `family-chart-view.css`, `profile-view.css`) migrate from media-query-only to dual-path mobile coverage using v0.22.49's `MobileClassManager` classes. **986 tests passing across 76 suites**.

**Fix: Family Chart wikilink-shaped text fields render the alias instead of raw markup** ([#622](https://github.com/banisterious/obsidian-charted-roots/issues/622)): The card display for `religion`, `alt name`, `nickname`, `title`, `occupation`, and `caste` showed the raw wikilink (brackets plus full filename) instead of the user-assigned alias when one of these free-form text fields was set to a wikilink (e.g., `religion: "[[Religions/Catholic|Catholicism]]"` rendered literally instead of as `Catholicism`). The fix routes each field through a guarded `unwrapWikilinkDisplay` helper that strips brackets and collapses pipe-form to the alias only when the input is fully bracket-wrapped — plain text containing legitimate `/` or `|` characters (e.g., `occupation: "Cook/Server"`) passes through unchanged. The info panel's birth-place and death-place display sites already had a hand-rolled version of the same stripping; both consolidate onto the shared helper. 26 new test cases in `tests/unwrap-wikilink-display.test.ts` cover the bracketed, plain-text, partially-bracketed, and idempotency cases. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Bare 1-3 digit year strings parse as years across the date pipeline** ([#624](https://github.com/banisterious/obsidian-charted-roots/issues/624)): The date parser's final fallback previously required a 4-digit run, so a frontmatter value like `birth_date: 310` (a 3-digit canonical year in [@doctorwodka](https://github.com/doctorwodka)'s custom Earthfall calendar with epoch-zero forward-direction eras) had nowhere to land — the fictional parser rejected it (no era abbreviation) and the standard parser's `\b(\d{4})\b` regex skipped over it. The user-visible symptom surfaced on the Dynamic Timeline Block as a missing age annotation on the adoption event: when one side of the age calculation parsed cleanly as fictional (e.g., `adoption_date: DE 1264`) but the other side parsed as `null`, the renderer's safety-net check (refusing to subtract era-blind across mismatched eras, [#565](https://github.com/banisterious/obsidian-charted-roots/issues/565)) bailed to "no age" rather than risk a silently-wrong number. Other events on the same person rendered correctly when both sides happened to be bare 4-digit values. The fix adds an additional whole-string-anchored numeric branch to the standard-year fallback so bare digit-only inputs of any length parse as years; the existing 4-digit substring matching is preserved for inputs like `"March 12, 1942"`, and the whole-string anchor prevents accidental matches in strings like `"5 Jan"` or `"1900s"`. 25 new test cases across `tests/date-service-bare-year-parse.test.ts` and `tests/timeline-renderer-age.test.ts` fence the bare-year behavior and the mixed bare-plus-era timeline scenarios. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Changed: Dynamic Timeline Block adopted-sibling and adopted-grandchild adoption events are now always-on** ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)): The two emission blocks added in v0.22.49 ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)) were gated on the `Show adopted children's births` toggle, matching the toggle used for the parallel birth-event coverage. Verification feedback from [@DigitalDreamn](https://github.com/DigitalDreamn) pointed out that the adoption events represent family events the focal canonically experienced — the same shape as the adoptive parent's `Adopted {name}` event ([#396](https://github.com/banisterious/obsidian-charted-roots/issues/396)), which has always been emitted unconditionally — and should not depend on whether the user wants the broader adopted-children-births surfacing. The toggle gate is dropped from both blocks; the `kind === 'adopted'` and `adoptionDate`-required guards remain. Four new test cases in `tests/timeline-adoption-events-always-on.test.ts` fence the always-on behavior for both surfaces and the missing-adoption-date skip. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #621 follow-up.

**Internal: Phase 4b mobile-migration first batch** (`map-view.css`, `family-chart-view.css`, `profile-view.css`): First three per-component migrations consuming the v0.22.49 `MobileClassManager` infrastructure. Each migrated stylesheet's narrow-viewport rules now reach via dual paths: the original `@media (max-width: ...)` blocks stay in place for narrow desktop / tablet leaves, and parallel `.cr-phone` (or `.cr-mobile`) blocks — using the global classes applied by `MobileClassManager` to each registered view's container — handle phones (and tablets where applicable), where Obsidian's media queries don't fire reliably. **Map View** (originally [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)): toolbar wrap and `world-map-preview` thumbnail rules consolidate the view-local `cr-map-view-phone` class onto the global `.cr-phone`. **Family Chart View**: toolbar wrap at 600px, info-panel slim sidebar at 800px, and info-panel full-width-below at 600px all gain `.cr-phone` parallel coverage; phones now always stack the info panel below the chart regardless of orientation. **Entity Profile View**: the view-local `cr-profile--mobile` class consolidates onto the global `.cr-mobile`; the 400px phone-portrait header rules gain a `.cr-phone` parallel scoped to phones only, so iPad-portrait keeps its wider layout. The audit-plan finding that motivated the sub-arc split: `MobileClassManager` only reaches registered views via `registerCRView`, not modals. Sub-arc 4b-1 (registered views) closes here; sub-arc 4b-2 (Control Center modal cluster plus standalone wizards) is captured in a separate planning doc for a future cycle. Verified on Android via `chrome://inspect`.

**Stability-window impact:** v0.22.50 is the fourth patch in the v0.22.46-anchored stability window opened on 2026-05-17. Three reactive fixes plus first-batch internal mobile migration; doesn't reset the window. Post-release Community Plugins automated review held at 96 / 100 (same as v0.22.48 and v0.22.49 baselines; no new findings).

### v0.22.49 Round-Up: Adoption-Event Coverage Expansion, Era-Aware Twin Tiebreak, and Audit-Plan Progress (v0.22.49)

Continuation of the [@DigitalDreamn](https://github.com/DigitalDreamn) reporter cycle from v0.22.47 – v0.22.48 plus a tranche of audit-plan progress. The Dynamic Timeline Block now emits adoption events on the sibling and grandparent surfaces ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)) in parallel with the v0.22.48 [#618](https://github.com/banisterious/obsidian-charted-roots/issues/618) birth-event coverage extension; the same-year twin tiebreak shipped in v0.22.48 ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)) is now era-aware so firstborn twins land in the slot the reader expects under each era's display direction (BBY / BCE / etc.). On the UX and audit-plan side: the three Timeline subsections move out of `Settings -> Advanced` into a new top-level `Settings -> Timeline` section; the shared name-sanitization helper now preserves parentheses and curly braces in filenames ([#506](https://github.com/banisterious/obsidian-charted-roots/issues/506), audit Phase 5 closure); and Phase 4a of the audit plan ships the `MobileClassManager` infrastructure that Phase 4b's per-component CSS migration will consume. **931 tests passing across 73 suites**.

**Added: Adoption events on the sibling and grandparent Dynamic Timeline Blocks** ([#621](https://github.com/banisterious/obsidian-charted-roots/issues/621)): Extension of the v0.22.48 [#618](https://github.com/banisterious/obsidian-charted-roots/issues/618) work that brought birth-event coverage to those surfaces with distinct adopted-relation labels. The adoption event itself — already emitted as `Adopted {name}` on the adoptive parent's timeline since [#396](https://github.com/banisterious/obsidian-charted-roots/issues/396) — now also renders on the focal person's **sibling** timeline (`Adoption of {name}` by default) and the **grandparent** timeline (`Adoption of {name}` by default), so the focal person's experience of "your sibling joined the family" or "your grandchild joined the family" is visible on the right surfaces. Gated on the same `Show adopted children's births` toggle as the birth coverage. Both new labels are customizable under `Settings -> Timeline -> Timeline labels` and accept the `{name}` placeholder. Distinct from the adoptive parent's `Adopted {name}` label so the reader can tell which surface the event is on at a glance. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #618 follow-up. The toggle-gate decision drew a follow-up design rethink ([#623](https://github.com/banisterious/obsidian-charted-roots/issues/623)) — see post-release notes below.

**Fix: Dynamic Timeline Block: same-year twins now order correctly in descending eras** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) follow-on): The v0.22.48 [#609](https://github.com/banisterious/obsidian-charted-roots/issues/609) fix added a raw-date lex-compare tiebreak that put the firstborn at the top of a twin pair — correct for ISO dates (chronological = oldest at top, firstborn = oldest = top) but era-blind for descending eras (BBY, BCE, etc.) where the year sort already produces "newer at top" via era-blind numeric comparison. For a BBY twin pair, the firstborn was landing at the top, contradicting the surrounding "old at bottom" pattern. The comparator now detects descending-era rawDates via the `DateService` and inverts the tiebreak direction for them — secondborn lands at the top of the pair in chronological mode (matching the year sort's new-at-top direction), and firstborn lands at the top in reverse mode (matching the inverted year sort's old-at-top direction). Five new test cases in `tests/timeline-sort-year-tiebreak.test.ts` fence the inversion behavior, ISO back-compat, the `dateService`-omitted path, and the OR-not-AND semantic when only one twin parses as descending-era. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a #609 follow-up to the v0.22.48 fix.

**Changed: Timeline settings now live in their own top-level section** (was under Advanced): The three Timeline subsections — Timeline layout, Timeline labels, and Family events on timelines — move from `Settings -> Advanced` to a new `Settings -> Timeline` top-level section, placed right after `Dates & validation` so the temporal-display settings cluster together. Matches the v0.22.39 Research / DNA tracking promotion: Timeline-related settings have grown to ~17 toggles and labels over the v0.22.x cycle, and burying them inside Advanced no longer reflects how frequently they're tuned. The Advanced section keeps Folder filtering, Template detection, Integrations, Relationship calculator, and Logging; everything else stays where it was. No setting names or values change — only the location.

**Changed: Filenames preserve parentheses and curly braces** ([#506](https://github.com/banisterious/obsidian-charted-roots/issues/506)): The shared name-sanitization helper that runs on all importers (Gramps / GEDCOM / GEDCOM-X / CSV) and entity-creation flows previously stripped `( ) [ ] { }` from filenames and wikilink targets on the assumption all six were wikilink-breaking. Empirical evidence from the [#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) thread (confirmed end-to-end across file resolution, the rename cascade, and dynamic blocks) showed that parens and curly braces don't break Obsidian's wikilink parser — only square brackets do, because they are the wikilink delimiters. The character class now preserves `( ) { }` and continues to strip `[ ]` and the filesystem-illegal set (`\ : * ? " < > |`). User-facing effect: creating a universe named `Star Wars (AU)` via the Create Universe modal now produces a file with parens preserved in the basename, and entity references match end-to-end without falling back to the alias-aware lookup path. Same for person notes via the importers. Two new test cases fence the post-relaxation behavior. Closes [#506](https://github.com/banisterious/obsidian-charted-roots/issues/506) (audit plan Phase 5).

**Internal: Phase 4a mobile groundwork**: New `MobileClassManager` infrastructure attaches `cr-mobile` / `cr-desktop` / `cr-phone` / `cr-tablet` classes to each registered view's container element based on `Platform.is*` flags. The audit plan's Phase 4b — per-component CSS migration from `@media (max-width: 768px)` to class-scoped selectors — consumes these classes; this release just lays the infrastructure. The v0.22.20 [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) Map View fix established empirically that `@media (max-width: 768px)` doesn't fire reliably on Obsidian Mobile, so class-based selectors driven by `Platform.is*` are the path forward. All 15 registered views call into the manager via a new `registerCRView` factory wrapper; the previous `responsive.css` breakpoint block moves to `variables.css`, and `responsive.css` repurposes for the few cases that genuinely need viewport-driven scoping (print, theme overrides). New **Mobile layout** section in `docs/developer/coding-standards.md` documents the pattern. Seven new tests in `tests/mobile-class-manager.test.ts`.

**Internal: extract `shouldUseSubmenu()` helper for the platform-detection check used by submenu rendering**: The `Platform.isDesktop && !Platform.isMobile` dual check (deliberately stricter than `Platform.isDesktop` alone, because some hybrid platforms report both flags true) was duplicated across three sites in `people-tab.ts` and `context-menus.ts`. The new helper in `src/utils/platform-utils.ts` consolidates the pattern with a comment explaining why the dual check is load-bearing. No behavior change.

**Stability-window impact:** v0.22.49 ships as forward-looking enhancement + correctness pass + audit-plan progress on the v0.22.46-anchored stability window opened on 2026-05-17. No reset. Reporter cohort (#609, #621, #506) verified within 24h of release; #621's verification surfaced [#623](https://github.com/banisterious/obsidian-charted-roots/issues/623), a design rethink to remove the toggle gate from the sibling/grandparent adoption emission (queued for v0.22.50).

### v0.22.48 Round-Up: Timeline Coverage Expansion, Twin Sort Tiebreak, and Family Chart Kinship-Label Anchor (v0.22.48)

Reporter-driven release built around [@DigitalDreamn](https://github.com/DigitalDreamn)'s v0.22.47 verification feedback: two new Dynamic Timeline coverage toggles, three timeline correctness fixes, a custom-relationship dispatch fix, and a Family Chart kinship-label fix. Two new Dynamic Timeline toggles render children's marriages on the parent's timeline ([#607](https://github.com/banisterious/obsidian-charted-roots/issues/607)) and parent's marriages on the child's timeline ([#608](https://github.com/banisterious/obsidian-charted-roots/issues/608)) — both with bio + adopted + step coverage and customizable `{name}` / `{spouse}` label templates. Same-year twins now sort by birth-time suffix on the Dynamic Timeline Block ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)), fixing the surface missed by v0.22.46's sibling-sort consolidation. The "Show adopted children's births" toggle now governs the sibling + grandparent surfaces too ([#618](https://github.com/banisterious/obsidian-charted-roots/issues/618)), with distinct "Birth of adopted sibling / grandchild" labels when shown. Custom relationships mapped to `Father` / `Mother` now route through the parent scalar write path with the v0.22.47 conflict guard ([#616](https://github.com/banisterious/obsidian-charted-roots/issues/616)), closing a dropdown promise that previously fell through to a flat custom-property write. The Family Chart's "Show kinship labels" Parent label now anchors above each child's card edge (rather than at the link path midpoint) and renders only after card positions stabilize ([#619](https://github.com/banisterious/obsidian-charted-roots/issues/619)), eliminating the mid-animation snapshot that left labels overlapping cards until manual refresh. **917 tests passing across 72 suites**.

**Added: Children's marriages on the parent's Dynamic Timeline Block** ([#607](https://github.com/banisterious/obsidian-charted-roots/issues/607)): New `Show children's marriages` toggle under `Settings -> Advanced -> Family events on timelines` (default off) renders a child's marriage as a family event on the parent's Dynamic Timeline Block. Covers biological, adopted, and step children — anyone the focal person is recorded as a parent or stepparent of. Renders the marriage date, the spouse's name, and (when set) the marriage location. Skips marriages that postdate the focal person's death. Label template is customizable via `Settings -> Advanced -> Timeline labels -> Child marriage label`; supports `{name}` for the child and `{spouse}` for their spouse (default `Marriage of {name} to {spouse}`). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a follow-up to the v0.22.46 timeline-coverage cluster.

**Added: Parent's marriages on the child's Dynamic Timeline Block** ([#608](https://github.com/banisterious/obsidian-charted-roots/issues/608)): Symmetric companion to #607. New `Show parent's marriages` toggle (default off) renders parent marriage events on the focal child's Dynamic Timeline Block. Walks the focal child's biological and adoptive parents and iterates each parent's spouses, so stepparent acquisitions (a bio parent's remarriage) and adoptive-couple marriages both appear. **Skips the bio-pairing marriage** (when both partners in a marriage are biological parents of the focal child) — that pairing is already implicit in the parent links, so re-surfacing it just adds clutter; the toggle is meant for remarriages and adoptive couples. Each shared marriage emits once even when both partners are in the parent set (per-pair dedupe). Pre-birth and post-death filters apply for consistency with the other family-event blocks. Customizable via the new `Parent marriage label` setting with `{name}` and `{spouse}` placeholders. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Dynamic Timeline Block: same-year twins / triplets now sort by birth-time suffix** ([#609](https://github.com/banisterious/obsidian-charted-roots/issues/609)): The Dynamic Timeline Block sorted entries by year alone — when twins shared a year, the sort fell through to the surrounding `Array.prototype.sort` insertion order. Twins and triplets appeared in an arbitrary order that didn't follow the v0.22.46 sibling-sort consolidation. The sort now applies the same year-then-raw-date pattern used by `RelationshipQueryService.getChildren`: when two entries share a year, a lex compare on the raw frontmatter date string breaks the tie. For ISO dates with time (`1985-04-12T03:42` vs `1985-04-12T03:45`) and fictional-era dates with time (`BBY 29 T20:03:04` vs `BBY 29 T20:08:15`), this orders firstborn before secondborn. Eleven new unit tests in `tests/timeline-sort-year-tiebreak.test.ts` fence the comparator's contract; the three sort sites in the renderer now share an extracted helper. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up verification.

**Fix: "Show adopted children's births" toggle now governs the sibling + grandparent surfaces** ([#618](https://github.com/banisterious/obsidian-charted-roots/issues/618)): The toggle was honored on the adoptive parent's timeline but the sibling-births walk (#584) and grandchildren-births walk (#585) ignored it — adopted siblings and adopted grandchildren leaked through as plain `Birth of {name}` entries indistinguishable from biological entries. Both walks now respect the toggle: when off, the adopted relation is filtered out; when on, the entry uses a distinct label (`Birth of adopted sibling {name}` and `Birth of adopted grandchild {name}` by default) so the relationship is visible at a glance. Both labels are customizable under `Settings -> Advanced -> Timeline labels`. `collectSiblingCrIds` now returns a `Map<crId, 'bio' | 'adopted'>` so callers can discriminate; the sibling-deaths walk is unchanged (a sibling's death is meaningful regardless of adoption status). "Adopted wins" precedence: a sibling or grandchild reachable via both bio and adopted routes is treated as adopted, so the toggle's gating is the conservative call. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) verification cycle.

**Fix: Custom relationship `Maps to: Father` / `Maps to: Mother` now writes the gendered parent scalar** ([#616](https://github.com/banisterious/obsidian-charted-roots/issues/616)): The Add Relationship modal's save handler dispatches on the type's `familyGraphMapping` value, but only had explicit branches for `'spouse'`, `'parent'`, the built-in `'child'` id, and the built-in `'adoptive_parent'` id. The `'father'` and `'mother'` mappings — both standalone options in the `Maps to` dropdown alongside `'parent'` — fell through to the catch-all that writes a flat property keyed on the custom type's id, so they never reached the canonical `father:` / `mother:` scalar fields. Downstream consumers that read those scalars (Canvas Family Tree, Family Chart, the Relationship Calculator, the v0.22.47 per-field conflict guard from [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)) never saw the relationship. The save handler now dispatches `'father'` and `'mother'` directly to `RelationshipManager.addParentRelationship` with the matching parent type, so they take the same write path as the built-in Father / Mother relationship types — including the conflict-guard prompt on replace and the sex-mismatch warning notice. Surfaced by [@DigitalDreamn](https://github.com/DigitalDreamn) during the [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606) retest cycle. The broader audit of which other `Maps to` options should route to family-graph fields (stepparent, foster, guardian, custom-typed child, custom-typed adoptive_parent) is tracked in [Discussion #617](https://github.com/banisterious/obsidian-charted-roots/discussions/617).

**Fix: Family Chart "Show kinship labels": Parent label aligns with each child's card and renders on stable positions** ([#619](https://github.com/banisterious/obsidian-charted-roots/issues/619)): Two-part fix. (1) The `Parent` kinship label was positioned at the link path's arc-length midpoint, which for f3's `LinkVertical` shape (riser + horizontal trunk + descent) lands somewhere along the horizontal trunk for displaced children — rightmost labels drifted into empty trunk space with no card below them, and Parent labels under couple-parents stacked at the same column instead of one per child. The label now anchors to a fixed offset above each child's card top edge (or left edge in horizontal mode), positioned at the child's column. Per-child positioning gives each visible branch its own aligned label, and the card-relative anchor avoids the short-riser case where a riser midpoint would overlap the child card (f3 cards translate by `-50%, -50%` so the path endpoint is the card center; the label has to clear half the card height). Reads the live card dimensions so it works across all card styles (rectangle / compact / mini / circle). Handles both vertical (default) and horizontal chart orientations. (2) Initial-render and tree-update label scheduling were using a fixed `setTimeout(1500)` that sometimes snapshotted SVG path coordinates mid-animation, leaving the bottom label overlapping its card until the user hit the chart's refresh button. Both scheduling paths now poll `waitForCardPositionStability` — the same approach the custom-relationship overlay uses (#591). The toggle-on path stays a direct render since the chart is already at rest at that point. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) as a Discussion #602 follow-up observation, with the mid-animation half surfacing during dev-vault verification of the riser fix.

**Stability-window impact:** v0.22.48 ships as forward-looking enhancement + correctness pass on the v0.22.46-anchored stability window opened on 2026-05-17. No reset. Post-release Community scan returned clean — no new findings, posture holds at the v0.22.47 baseline of 96 / 100.

### v0.22.47 Round-Up: Per-Field Conflict Guards, Marriage-Label Anchor, and #591 Follow-Up (v0.22.47)

A focused fix release driven by reporter feedback from the v0.22.46 Discussion #602 thread plus a few quick-win polish items. The headline item is per-field conflict guards on the scalar parent fields ([#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)): adding a custom relationship type with `Maps to: Parent` no longer silently overwrites an existing `father` / `mother` reference — a confirmation modal now surfaces with a clear `Replace <name>` warning button, and the previous parent's `children` array is cleaned up on confirmed replace. The Canvas Family Tree's marriage-date labels ([#603](https://github.com/banisterious/obsidian-charted-roots/issues/603)) now anchor below the left spouse card instead of at the geometric midpoint of the spouse connector (which often landed between non-spouse cards). Two follow-ups land on top of v0.22.46 work: the fictional-era date parser ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up) now accepts the ISO 8601 time component for twin disambiguation on fictional-era dates (`BBY 29 T20:03:04`); the Family Chart custom-relationship overlay ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591) follow-up) gets a stable bow direction across renders, endpoints clipped to card edges, and verticality-weighted sag that clears intermediate cards. Plus a custom-relationship-type editor visibility fix (the Maps-to dropdown stayed hidden after toggling on) and the last `multicolumn`-family CSS warning removed (`break-inside: avoid` on timeline-callout list items, vestigial after the v0.22.46 Grid migration). **906 tests passing across 71 suites**.

**Fix: Per-field conflict guards on parent scalar writes** ([#606](https://github.com/banisterious/obsidian-charted-roots/issues/606)): Adding a relationship via the Add Relationship modal whose custom type has `Maps to: Parent (gender-neutral)` previously routed through `RelationshipManager.addParentRelationship` for male and female targets, which silently replaced any existing `father` / `mother` scalar field on the source note with no recovery path beyond Obsidian's file-recovery snapshot. The write now consults a per-field conflict policy: UI-driven sites (Add Relationship modal, context menus) surface a confirmation modal that displays which person is being replaced and offers `Cancel` (default on Escape / click-out) or `Replace <name>` (warning-styled). When the user confirms the replace, the previous parent's `children` / `children_id` arrays are also cleaned up so they don't keep claiming a child who has been re-parented elsewhere. Reactive write paths (bidirectional-linker) continue to use their existing skip-on-conflict behavior. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

**Fix: Canvas Family Tree marriage labels anchor below the left spouse** ([#603](https://github.com/banisterious/obsidian-charted-roots/issues/603)): Marriage metadata (`m. <year>`, plus optional location / divorce / status per the `Spouse edge label format` setting) was rendered as an Obsidian Canvas edge label on the spouse-to-spouse connector. Obsidian Canvas pins edge labels at the geometric midpoint of the line, and the siblings-then-spouses layout default frequently places non-spouse cards between the spouse pair, so a midpoint label could appear to belong to the wrong relationship. Marriage info now renders as a small text node anchored directly below the left spouse card. When the same card anchors multiple marriages, the labels stack vertically below the card in spouse-index order rather than overlapping. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

**Fix: Fictional-era dates with ISO 8601 time suffix parse correctly** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) follow-up): The v0.22.46 sibling-sort time tiebreak was designed against standard ISO 8601 dates (`1985-04-12T03:42`) and didn't account for adding a time component to a fictional-era date (`BBY 29 T20:03:04`). The fictional date parser is anchored at end-of-string, so a trailing `T HH:MM[:SS]` made every pattern fail; parsing fell through to the standard date path, losing the era prefix on display and producing a wildly off age. The parser now strips an optional `T HH:MM[:SS]` suffix (with or without a leading space) before pattern-matching, so the era and year parse correctly while the raw frontmatter string stays available for the sibling-sort tiebreak. The Profile View header and the Family Chart card display also strip the time component for cleaner rendering; the Edit Person modal still shows the full raw string when editing. The Edit Person modal's Birth date hint now mentions that appending `T HH:MM` is supported for twin disambiguation. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Family Chart custom-relationship overlay polish** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591) follow-up): The v0.22.46 fix for overlay clipping addressed the obvious case but left three smaller issues on a pure vertical adoptive chain reported by [@doctorwodka](https://github.com/doctorwodka). (1) The perpendicular orientation for the bow was derived from the chord's source / target enumeration, which f3 layout can flip across renders for vertical chords — so the bow direction would swap between initial draw and refresh, sometimes crossing an intermediate card on one render and clearing it on the next. The chord direction is now derived from a canonical upper-to-lower endpoint sort so the bow is stable. (2) The bezier endpoints were the card centers, so the visible line started inside the source card and ended inside the target. Each endpoint is now clipped to its card's rectangular boundary via ray-rectangle intersection. (3) The sag-scaling formula didn't guarantee the curve's perpendicular apex cleared the half-width of intermediate cards on the chord path. A new verticality-weighted clearance term ensures vertical chords through stacked cards get enough sag to bow fully around them. The fourth symptom in the same report (post-refresh top-endpoint drift) was not reproducible in the local dev-vault and is left for a follow-up if it persists post-upgrade.

**Fix: Custom relationship type editor: `Maps to` dropdown now reveals when "Include on family trees" is toggled on**: The toggle's onChange handler set `style.display = ''` directly, which couldn't override the initially-applied `.crc-hidden` class (`display: none` from `base.css`), so the mapping row stayed hidden no matter how many times the toggle was flipped. The handler now toggles the `crc-hidden` class to match the initial-hide mechanism. Surfaced while setting up the test fixture for the #606 conflict-guard verification.

**Internal: Drop vestigial `break-inside: avoid` from timeline-callout list items**: After the v0.22.46 multicolumn → Grid migration, the `break-inside: avoid` rule on `.callout[data-callout="cr-timeline"] .callout-content ul li` no longer did useful work — Grid cells are discrete and don't break across columns or pages. The scanner's lookup table classifies `break-inside` as part of the multicolumn property family, so this leftover rule was the sole reason a `multicolumn` warning kept appearing on the v0.22.46 scan. Removed. Closes the last CSS-lint warning the scanner was flagging.

**Stability-window impact:** v0.22.47 ships as a focused fix release built on the v0.22.46-anchored stability window opened on 2026-05-17. No reset.

### v0.22.46 Round-Up: Community-Driven Bug-Fix Release with Timeline Coverage Expansion and Events Filter Additions (v0.22.46)

A bug-fix-heavy release driven by post-v0.22.45 reporter feedback, with two architectural themes folded in. Four new dynamic Timeline block toggles for children's deaths, stepparent deaths, sibling deaths, and grandchild births (#582-#585). Three new filter controls on the Events timeline (#515): universe, place, and date range, gated behind a "More filters" disclosure. The sibling sort gained an ISO 8601 time tiebreak (#590) for twins and triplets, applied across all five rendering surfaces. The Family Chart's custom-relationship overlay (#591) and Person details pane (#604) had distinct bugs closed. The Gramps importer was attributing shared-event deaths to non-Primary participants (#601). The interactive Family Chart's sibling sort was missed in the #590 sweep (#605). A follow-up on #569 fixed the event-sort tiebreak for events sharing a start date so point events now sort before range events. **892 tests passing across 69 suites**.

**Feature: Four new family-event toggles on the dynamic Timeline block** ([#582](https://github.com/banisterious/obsidian-charted-roots/issues/582), [#583](https://github.com/banisterious/obsidian-charted-roots/issues/583), [#584](https://github.com/banisterious/obsidian-charted-roots/issues/584), [#585](https://github.com/banisterious/obsidian-charted-roots/issues/585)): The "Family events on timelines" settings panel expands the dynamic Timeline block's coverage of important life events of family members. "Show children's deaths" (#582) renders the death of a biological, adopted, or step-child on the parent's timeline when the parent was still living. "Show stepparent deaths" (#583) renders a stepparent's death on the stepchild's timeline. "Show sibling deaths" (#584) renders a sibling's death on the person's timeline, mirroring the existing "Show sibling births" toggle and using the same step-sibling-aware walk. "Show grandchildren's births" (#585) renders a grandchild's birth on the grandparent's timeline, walking biological and adopted children one generation down. All four are opt-in and default off; each has a corresponding customizable label in the Timeline labels panel. Death events are filtered to those that occur before the focal person's death (so the focal person needed to be alive to experience the event); grandchild births are filtered the same way. Filed by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Feature: Events timeline gains universe, place, and date-range filters** ([#515](https://github.com/banisterious/obsidian-charted-roots/issues/515)): The Events tab's Timeline card (Control Center) and the dockable Events sidebar both gain three new filter controls beyond the existing type / person / search trio. Universe filter scopes events by their `universe` field; sentinel options `(real-world)` (events with no universe set) and `(any fictional)` (events with any universe) are listed alongside each universe note in the vault. Place filter scopes events by their `place` wikilink. Date range filter narrows by year via two numeric inputs; events with no date are excluded when either bound is active. The new controls live under a "More filters" disclosure so the primary filter row stays compact on narrow widths; the disclosure opens automatically when any persisted secondary filter is set. The dockable sidebar persists all six filter values across Obsidian restarts via the existing view-state mechanism. Both implementations share a single `applyTimelineFilters` helper so the predicate stays consistent.

**Feature: Sibling sort tiebreak for twins and triplets via ISO 8601 time** ([#590](https://github.com/banisterious/obsidian-charted-roots/issues/590)): When siblings share a birth date, the sibling sort now falls through to a lexicographic compare on the raw `born` field, so twins and triplets recorded with an ISO 8601 time component (`1985-04-12T03:42`) sort deterministically by birth order. Existing `YYYY-MM-DD` values are unaffected. Side effect: siblings within the same calendar year now also sort by month and day instead of falling through to insertion order. Applied across all five sibling-sort sites: `RelationshipQueryService.getChildren()`, the Profile View Children section's helper, the family-graph layout sort used for Canvas Family Tree rendering, the Dynamic Relationship Block's local sort, and the interactive Family Chart's `setSortChildrenFunction`. The fifth site was the [#605](https://github.com/banisterious/obsidian-charted-roots/issues/605) finding surfaced from Discussion #602 mid-release.

**Fix: Custom relationship overlay clipping and post-refresh stub** ([#591](https://github.com/banisterious/obsidian-charted-roots/issues/591)): Two distinct bugs in the Family Chart's custom-relationship overlay surfaced together when a symmetric overlay relationship spans three generations. First, the arc sag was hard-coded along the +y axis, which collapsed near-vertical chords toward a straight line that clipped intermediate cards. The sag now applies along the down-oriented perpendicular to the chord, so vertical chords bow sideways and clear cards in between. Second, the post-animation stability poll was firing on the pre-animation `(0, 0)` plateau immediately after a refresh, capturing card positions before the chart's entrance transition moved them; both endpoints collapsed onto the focal person's origin and the line shrank to a stub. The poll now requires at least one observed change before treating positions as stable. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Gramps import respects event-reference role** ([#601](https://github.com/banisterious/obsidian-charted-roots/issues/601)): When a person was attached to a Gramps event in a non-Primary role (Informant, Witness, Family, etc.), the importer was extracting that event's date and place to the person's own `born` / `died` / birth-place / death-place fields. As a result, a person who appears on a relative's death event as the informant was being imported into Obsidian as deceased themselves. The importer now filters event references to the Primary role only (or unspecified, which Gramps treats as Primary by default). Reported by Tiberius on the Obsidian Forum.

**Fix: Family Chart Person details pane respects hidden state** ([#604](https://github.com/banisterious/obsidian-charted-roots/issues/604)): The `.cr-fcv-info-panel` rule and the global `.crc-hidden` rule were both single-class selectors with the same specificity, so bundling order made the panel's `display: flex` always win. The panel auto-opened on chart load and the X close button silently failed because adding `crc-hidden` was a no-op. A combined-class rule (`.cr-fcv-info-panel.crc-hidden`) wins the specificity comparison and the panel now hides as intended. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Family Chart sibling sort matches the other four sites** ([#605](https://github.com/banisterious/obsidian-charted-roots/issues/605)): The interactive Family Chart's `setSortChildrenFunction` callback used straight `localeCompare` on birthday strings, which produced incorrect order for fictional-era dates (lex compare puts "BBY 19" before "BBY 22" even though 22 BBY is chronologically earlier) and lacked the [#590](https://github.com/banisterious/obsidian-charted-roots/issues/590) twin / triplet time tiebreak landed elsewhere in this release. The sort now matches the other four sibling-sort surfaces: universe-aware canonical-year compare via `DateService`, with lex string compare as the same-year tiebreak. Fifth and final site of the consolidation pattern flagged in [Discussion #597](https://github.com/banisterious/obsidian-charted-roots/discussions/597). Reported by [@DigitalDreamn](https://github.com/DigitalDreamn) in [Discussion #602](https://github.com/banisterious/obsidian-charted-roots/discussions/602).

**Fix: Event sort places point events before range events on tied start dates** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up): When two events share a start date and one has a `date_end` (range) while the other doesn't (point), the point event now sorts first. Reader intuition: "what happened on this date" before "state that began here." Previous behavior fell through to insertion order which felt arbitrary and produced the confusing display order reported on the v0.22.45 auto-compute thread. Same tiebreak applies in both the initial date sort and the queue-processing sort inside Kahn's algorithm, so the order is consistent across the topo walk.

**Internal: Timeline-callout multi-column layout migrated to CSS Grid**: The auto-fitting multi-column layout on timeline event lists previously used CSS multicolumn properties (`column-width`, `column-gap`, `column-rule`). The Obsidian Community automated review flagged these as partially supported (the static support-matrix lookup didn't reflect Chromium's full support). The rules now use `display: grid` with `repeat(auto-fill, minmax(var(--cr-list-min-width), 1fr))`, which is universally supported and flagged-clean. Reading order shifts from column-major to row-major; for typical timeline lengths the visual flow reads naturally in either pattern. Closes the last CSS-lint warning that the scanner was flagging on v0.22.45.

**Internal: Sibling-traversal centralized**: The dynamic Timeline block's sibling-walking code (parent-walk + custom `sibling`-relationship-type lookup + step-sibling exclusion) is now factored into a single `collectSiblingCrIds` helper method shared by the sibling-births and sibling-deaths paths. Mirrors the pattern-1 (renderer-coverage) closure direction from the architectural audit.

**Stability-window impact:** v0.22.46 ships as a substantial release with five reporter-driven bug fixes plus the Timeline coverage and Events filter feature work. The release surfaced [#606](https://github.com/banisterious/obsidian-charted-roots/issues/606) (Maps-to data-loss bug, filed during Discussion #602's review) which resets the prior v0.22.22-anchored window. New stability window opens at v0.22.46 (2026-05-17), targeting ~2026-06-07 for the next no-reset-target. The v0.22.47 release will land per-field conflict guards as data-loss inoculation across the five write paths, plus the carryover ButtonComponent migration and the #603 Canvas marriage-date anchor fix.

### v0.22.45 Round-Up: Bundle Hygiene, Sibling-Sort Consolidation, and Community-Reported Fixes (v0.22.45)

A multi-theme release combining bundle-hygiene work that nearly halves `main.js`, closure of the last tractable scanner Recommendation (Dynamic Code Execution), two bug fixes for the Add Custom Relationship modal's parent handling reported by [@doctorwodka](https://github.com/doctorwodka), two enhancements from [@DigitalDreamn](https://github.com/DigitalDreamn) (an event-picker person filter plus auto-compute extension to the v0.22.39 Event Relative ordering UI), and a four-surface sibling-sort consolidation arc. **883 tests passing across 68 suites**.

**Feature: Event picker person filter** ([#581](https://github.com/banisterious/obsidian-charted-roots/issues/581)):
- The Relative ordering event picker (Create / Edit Event modal, "Add" button on the After or Before fields) gains a new "Person:" dropdown alongside the existing Type filter. Source values are deduplicated from each event's `person` + `persons` wikilink fields, parsed via a small `parseWikilinkRef` helper that handles `[[basename]]`, `[[path|alias]]`, and `[[basename|alias]]` shapes so the same person referenced via different wikilink forms groups under one filter value.
- Reduces scrolling on vaults where multiple people have similarly-titled events (e.g., Ahsoka and Quinlon Vos both having "Begins training at the Jedi Temple"). Suggested by @DigitalDreamn after using the v0.22.39 UI on Ahsoka's events.

**Feature: Auto-compute `sort_order` on event save** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569) follow-up):
- When the Create or Edit Event modal saves an event with `before` / `after` constraints set or changed, the plugin now recomputes `sort_order` values across all events via the existing `computeSortOrder` topological-sort service. Closes the discoverability gap from v0.22.39: previously the `before` / `after` frontmatter values only influenced the timeline exporters' topological sort, and surfaces like the Events tab and Profile View needed the user to run the "Compute sort order" command manually before the narrative order would reflect.
- Fired fire-and-forget after the save commits, so the modal closes immediately and the user doesn't wait for the recompute to traverse the full event set. A cycle notice surfaces asynchronously when `before` / `after` constraints form a cycle (the existing `SortOrderService` already returns `cycleEvents` in its result); the save itself succeeds in all cases.
- The auto-compute helper uses `waitForCacheRefresh` (from the v0.22.27 cache-race audit) so Obsidian's metadata cache reflects the just-written frontmatter before the recompute reads it back.

**Fix: Add Custom Relationship modal honors the gender-neutral parent setting + non-binary fallback** ([#579](https://github.com/banisterious/obsidian-charted-roots/issues/579), [#580](https://github.com/banisterious/obsidian-charted-roots/issues/580)):
- The modal's `parent` save path at [src/ui/add-relationship-modal.ts:195](src/ui/add-relationship-modal.ts#L195) was unconditionally routing to gendered `mother` / `father` fields via a ternary that defaulted to `father` when the target's sex wasn't `female`. Two bugs in one site: it ignored the "Enable gender-neutral parent property" setting (#579), and the implicit fallback to `father` for non-binary parents was wrong (#580).
- The save path now routes to the gender-neutral `parents` array when either (a) the setting is on, or (b) the target's sex isn't `male` / `female`. Otherwise the gendered path is unchanged. Reporter [@doctorwodka](https://github.com/doctorwodka).
- New `RelationshipManager.addInclusiveParentRelationship` handles the gender-neutral write: child's `parents` / `parents_id` arrays via a new `addToParentsArray` helper that mirrors the existing `addToChildrenArray` pattern (rebuilds from valid cr_ids, dedupes, dual storage), plus the reverse-side `addToChildrenArray` for the parent's children array. Matching `add_parent` / `remove_parent` variants added to `RelationshipChangeType` so relationship-history records cleanly.

**Fix: Children sort by birth date across Profile View, Canvas Family Tree, and report surfaces** ([#586](https://github.com/banisterious/obsidian-charted-roots/issues/586), [#587](https://github.com/banisterious/obsidian-charted-roots/issues/587)):
- Three rendering surfaces had been emitting children in frontmatter array order rather than birth order: Profile View Children section ([#586](https://github.com/banisterious/obsidian-charted-roots/issues/586)), Canvas Family Tree ([#587](https://github.com/banisterious/obsidian-charted-roots/issues/587)), and seven report / visual-tree / family-timeline surfaces. Same shape as the v0.22.21 sibling-sort fix ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532)), applied to additional separately-implemented child-iteration paths.
- Sort is consolidated into `RelationshipQueryService.getChildren()` via a new `sortByBirthDate?: DateService | null` option. When provided, results return merged across the requested variants (`include: 'all'` returns bio + adopted + step in one age-sorted list) using the universe-aware canonical-year compare so descending fictional eras (BBY / GR / EF / DE) order correctly alongside Gregorian dates. Persons without a parseable birth date sink to the end while preserving their relative order.
- For Canvas Family Tree specifically, the FamilyChartLayoutEngine reads children directly from `person.childrenCrIds` rather than from edges — so a precomputed `sortedChildrenByCrId` map is now populated on the FamilyTree result and the layout engine prefers this map over the raw frontmatter order.
- Display callers updated to opt in: Family Group Sheet, Individual Summary, Register, Descendant Chart, Source Summary reports + Visual Tree Service + Family Timeline view (member list). The Descendant Chart's prior `localeCompare`-based sort (which mis-ordered fictional eras) is replaced. Algorithm-only callers (depth measurement, generation queueing, duplicate detection, lineage tracking, BFS, statistics counts) untouched because their output isn't order-sensitive.
- `createConfiguredFamilyGraph` now constructs and wires a `DateService` so report generators inherit universe-aware sort automatically.
- Reporter [@DigitalDreamn](https://github.com/DigitalDreamn). Architectural consolidation tracking issue at [#588](https://github.com/banisterious/obsidian-charted-roots/issues/588) for the one remaining surface (`src/core/reference-numbering.ts` creates its own `FamilyGraphService` without DateService wiring) plus future-surface coverage.

**Internal: production minify enabled in esbuild config**:
- `main.js` drops from 14,710 KB to 8,460 KB (~50% reduction) with no functional changes. Pre-flight grep confirmed no `Function.name` / `.constructor.name` / `.toString()` introspection in plugin source, so identifier mangling is safe without `keepNames`.
- The "main.js exceeds Sync Standard 5 MB threshold" caveat from the 1.0 release notes softens substantially (~3.4 MB remaining vs ~9.5 MB previously). Fully closing the threshold requires structural moves (jspdf consolidation, family-chart-premium evaluation) that stay post-1.0 scope. Metafile audit shows the current contributors: plugin source ~4.6 MB, pdfmake ~2.3 MB, jspdf ~334 KB, leaflet ecosystem ~600 KB cumulative, family-chart + d3 ~250 KB cumulative.

**Internal: closed the Dynamic Code Execution scanner Recommendation**:
- New `patch-pdfmake.js` postinstall strips two `new Function("return this")()` sites from `node_modules/pdfmake/build/pdfmake.js`: the bundled core-js globalThis polyfill body and the webpack runtime's `__webpack_require__.g` initializer. Both fallback branches are unreachable in Obsidian's Electron runtime (the `typeof globalThis === "object"` early-return always fires).
- The patch follows the same shape as the existing `patch-core-js-polyfill.js`: exact-string locate + idempotency marker + fail-loud warning when the ORIGINAL string isn't found (vendor update protection). Wired into the postinstall chain after `patch-core-js-polyfill.js`; the IE5-8 setImmediate site stays handled by the existing patch (separate code path, no overlap).

**Testing:** Suite total **883** across 68 suites, unchanged. The new gender-neutral parent path doesn't yet have unit coverage (the bidirectional write is a defensive runtime pass like `dropAsymmetricRelationships` from v0.22.39); worth adding tests when revisiting `RelationshipManager`.

**Stability-window impact:** v0.22.45 is the twenty-third patch in the v0.22.22-anchored window. `medium-priority` mix of bundle hygiene + small UX feature + four user-facing bug fixes; doesn't reset the window. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.44: Bundled `styles.css` Rebuild and Release-Procedure Flip (v0.22.44)

Same-day follow-up to v0.22.43 that actually closes the two CSS lint Warnings v0.22.43 was meant to silence. The source-level changes shipped correctly in v0.22.43 (`styles/family-chart-view.css` dropped `!important`, `styles/timeline-callouts.css` dropped `:has()`), but the bundled `styles.css` in the repo was not rebuilt and committed alongside. The Community automated review's CSS-lint rule reads `styles.css` from the repo at the tagged commit (not the CI-built release asset), so it still saw the old rules at the bundled paths even though the source paths had been fixed. v0.22.44 commits a freshly built `styles.css` matching the v0.22.43 source state and updates the release-procedure documentation to reflect the new "rebuild + commit `styles.css` on CSS-touching releases" rule. No source-code changes; bundled stylesheet plus release-procedure docs only.

**Workflow gap surfaced by the v0.22.43 scan**:
- v0.22.43's scan against the published release still reported `!important` at `styles.css:18430` and `:has()` at `styles.css:27879, 27883` even though the matching source files (`styles/family-chart-view.css`, `styles/timeline-callouts.css`) were clean. Investigation traced the gap to two compounding factors: `styles.css` is tracked in git despite being listed in `.gitignore` (the entry only takes effect for new files, and tracking predates the `build-css.js` pipeline), and the Community automated review's scanner reads `styles.css` from the repo at the tagged commit, not from the CI-built release asset.
- During the v0.22.43 cut, the source files were committed but the bundled `styles.css` was never rebuilt and committed alongside. The same working-tree drift had persisted across the entire scan-cleanup arc, but earlier releases were only changing JavaScript surfaces, so it hadn't mattered.
- Option A (commit rebuilt `styles.css` on CSS-touching releases) chosen over Option B (untracking) because the scanner's reading model puts the bundled stylesheet in the "fetch from repo" category — untracking might leave the scanner blind to CSS findings entirely.

**Bundled `styles.css` rebuilt and committed**:
- The committed `styles.css` now matches the v0.22.43 source state: `!important` is gone from the `.card_cont.cr-hl-dim` rule, and the two sibling-aware `:has()` rules in timeline-callouts have been rewritten to class-based adjacent-sibling selectors per v0.22.43's `cr-has-timeline` post-processor. The scanner now sees zero `!important` declarations and zero `:has()` selectors in the bundled stylesheet (down from one and two respectively at v0.22.43).
- Post-release scan against v0.22.44 returned clean of the two warning categories. **Score bumped from 83 to 88 / 100.** Only the documented-irreducible findings remain (>5 MB main.js, four multicolumn partial-support warnings on timeline-callouts, and the three Behavior-section recommendations — Vault Enumeration, Clipboard Access, Dynamic Code Execution).

**Release-procedure documentation flipped**:
- [`docs/developer/release-procedure.md`](../docs/developer/release-procedure.md) previously instructed to skip `styles.css` during the version-bump commit because of a "known build-timestamp drift." That captured the symptom but documented the wrong remediation: the drift exists because we never rebuild and commit, and the Community automated review reads the bundled stylesheet from the repo. The correct rule is to rebuild via `npm run build`, then include `styles.css` in the version-bump commit whenever the release touched any CSS source.
- Both the version-bump file table and the bash code-block comment were updated. Three incidental pre-existing references to an internal-only project-conventions file were also cleaned up alongside (forward-only — not rewriting past commits).

**Testing:** Suite total **883** across 68 suites, unchanged. No source-code changes; only the bundled stylesheet and release-procedure docs.

**Stability-window impact:** v0.22.44 is the twenty-second patch in the v0.22.22-anchored window. `medium-priority` workflow and bundle hygiene; doesn't reset the window. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.43: CSS Lint Cleanup, `!important` and `:has()` Closures (v0.22.43)

Follow-up to v0.22.42 closing the two remaining CSS lint Warning categories that the v0.22.42 scan still surfaced (`!important` × 1, `:has()` × 2). The multicolumn partial-support category stays as-is since timeline event lists rely on `column-width` / `column-gap` / `column-rule` for fluid multi-column layout with no longhand alternative.

**`!important` closure via family-chart patch**:
- The single remaining `!important` was on `.card_cont.cr-hl-dim` in `styles/family-chart-view.css`, used to override family-chart's inline `style="opacity: 1"` that the library writes on every card during D3 transitions. Inline styles have specificity 1,0,0,0, so any CSS rule competing with them needs `!important` to win.
- Two new patches in `patch-family-chart.js` append `.on("end", function () { d3.select(this).style("opacity", null); })` to the library's SVG and HTML `cardUpdate` transitions. Once each transition completes, the inline opacity is cleared, and CSS regains control. Same fix proposed upstream at the maintainer's issue; this is the local application via the same postinstall pattern used elsewhere in the project.
- `styles/family-chart-view.css` now declares the highlight-dim rule without `!important`. No user-visible behavior change; the highlight-dim still works during and after animations across the chart-render, pan / zoom, and highlight-group toggle paths.

**`:has()` closure via class-based selectors**:
- The two sibling-aware `:has()` rules in `styles/timeline-callouts.css` set spacing between stacked `[!cr-timeline]` callouts and their non-timeline siblings. The rules were documented as "structurally required, no class-based equivalent" — true for pure CSS, but a tiny markdown post-processor can manage the equivalent state.
- A new `registerMarkdownPostProcessor` in `main.ts` walks the rendered content for `[data-callout="cr-timeline"]` elements and adds `.cr-has-timeline` to each one's immediate parent `<div>`. The two `:has()` rules were rewritten to use adjacent-sibling combinators on the class: `div:not(.cr-has-timeline) + .cr-has-timeline > [data-callout="cr-timeline"]` and `.cr-has-timeline + div:not(.cr-has-timeline)`.
- The rules only ever applied to Timeline Report markdown output (the only surface that emits `[!cr-timeline]` callouts); dynamic timeline blocks render as `.cr-dynamic-block.cr-timeline` and are unaffected.

**Internal: documentation**:
- [`docs/developer/implementation/third-party-libraries.md`](../docs/developer/implementation/third-party-libraries.md) was extended: the `patch-family-chart.js` entry now lists all three patches (calculateEnterAndExitPositions null guards from earlier, plus the two new SVG and HTML `cardUpdate` opacity-cleanup patches).

**Testing:** Suite total **883** across 68 suites, unchanged. The post-processor doesn't add testable surface; the family-chart patch was verified in dev-vault across the chart-render, pan / zoom, and highlight-group toggle paths.

**Stability-window impact:** v0.22.43 is the twenty-first patch in the v0.22.22-anchored window. `medium-priority` CSS hygiene; doesn't reset the window. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.40 – v0.22.42 Round-Up: Scanner Severity Response Arc (v0.22.40–v0.22.42)

Between v0.22.38 and v0.22.39's post-release scans, Obsidian's Community automated review promoted its "dynamic `<script>` element creations" rule from warning to error severity. The rule fires on `document.createElement('script')` calls in bundled JavaScript and is intended to catch plugins that load arbitrary external code. Charted Roots' v0.22.39 release scan flagged nine sites — all in vendored library code (`leaflet-distortableimage`'s webpack chunk loader, `jszip`'s UMD module-detection guards, and `core-js`'s IE5-8 setImmediate polyfill, the last of which `pdfmake` also bundles internally). Each pattern is feature-detection or dead-code that never executes in Obsidian's Electron runtime, but the scanner's static analysis can't distinguish reachable from unreachable code paths. The plugin was demoted on the Community Plugins website (Install button disabled). v0.22.40 and v0.22.41 closed the `<script>` surface; v0.22.42 closed the related "`setInterval` combined with network calls" Behavior Warning the v0.22.41 scan surfaced as a follow-up finding.

**v0.22.40: leaflet-distortable chunk loader stub + `jszip` → `fflate` migration**:
- **`patch-leaflet-distortable.js` extended** to stub `__webpack_require__.l` (the webpack chunk loader) alongside the existing `WebSocketClient` stub. The chunk loader uses `document.createElement('script')` to fetch lazy-loaded chunks; the plugin emits a single bundle (no code splitting), so the loader is never invoked. Stubbing it to a no-op that immediately calls `done({ type: "stub" })` removes the surface without affecting library behavior. Removes 1 site.
- **ODT generation migrated from `jszip` to `fflate`** via a new `ZipBuilder` / `ZipReader` adapter at [`src/utils/zip.ts`](../src/utils/zip.ts). `jszip`'s bundled output contained four UMD module-detection guards using `document.createElement('script')`, all flagged at error severity. `fflate` is a smaller (~8 KB vs `jszip`'s ~90 KB), modern, no-UMD-detection alternative. The adapter exposes a JSZip-shaped API so the four call sites (Reports → ODT, Family Chart → ODT, Book → ODT, Gramps `.gpkg` import) needed only near-mechanical edits, and a future `fflate` version bump or library swap is a one-file change. Functional behavior is unchanged — ODT files open identically in LibreOffice and the Gramps reader handles both tar.gz and ZIP-format `.gpkg` inputs as before. Removes 4 sites.
- **Internal: new ZIP-format `.gpkg` test fixture and repack script**. Gramps' export wizard does not produce ZIP-format `.gpkg` directly — it writes tar.gz. Added `tests/fixtures/gramps/gramps-app-export-test11-small-zip.gpkg` (generated from `test9-small.gpkg` via a new `repack-to-zip.js` script) so the ZIP reader code path in `gpkg-extractor.ts` can be exercised in dev-vault testing. Existing tar.gz fixtures still cover the default Gramps export path.
- Net result for v0.22.40: 9 → 4 sites. Still flagged at error severity (the rule is binary — any `> 0` count is an error), so the plugin remained demoted at this point.

**v0.22.41: `core-js` setImmediate polyfill strip**:
- **New `patch-core-js-polyfill.js` postinstall patch** strips the IE5-8 setImmediate polyfill branch from both `node_modules/core-js/internals/task.js` and `node_modules/pdfmake/build/pdfmake.js` (which bundles its own copy of `core-js`). The branch is `if (ONREADYSTATECHANGE in createElement('script')) { ... }` — a feature-detection fallback for IE5-8 microtask scheduling. In Obsidian's Electron runtime, the earlier `MessageChannel` branch in the same `if/else if` chain always succeeds, so the IE8 path is never reached. The patch removes the branch at source so it never reaches `main.js`. `setImmediate` behavior is unchanged because the MessageChannel path was already the only path executed. Removes 4 sites.
- Net result for v0.22.41: 4 → 0 sites. The post-release scan against v0.22.41 came back clean (no errors), 83 / 100 score, demotion lifted on the Community Plugins website. Scan surfaced a follow-up Behavior Warning ("Plugin combines `setInterval` with network calls") that v0.22.42 addressed next.

**v0.22.42: `setInterval` migration + dead-code polling stubs**:
- **Three plugin `setInterval` sites migrated to recursive `setTimeout`** (`map-view.ts:journeyPlaybackInterval`, `map-view.ts:animationInterval`, `media-upload-modal.ts` count-text re-render). Functional behavior is unchanged (pause / resume, speed-change propagation, and cleanup all work identically), but the source no longer contributes to the scanner's `setInterval` correlation surface.
- **Two dead-code `setInterval` sites stubbed in `leaflet-distortableimage`** via two new patches in `patch-leaflet-distortable.js`. The first stubs `_defaultHandleStatusRes`, which wraps `setInterval` around `fetch(req)` in the same closure to poll an export.mapknitter.org status URL — the textbook beaconing pattern the scanner's Behavior rule looks for. The plugin renders image overlays in-vault only and never invokes the export start flow, so the handler is unreachable. The second stubs the bundled webpack-dev-server live-reload `setInterval`, dead in production for the same reasons as the existing `WebSocketClient` and chunk-loader stubs. Both patches remove `setInterval` sites without affecting library behavior.
- **`docs/planning/setinterval-vendored-investigation.md`** added as a committed planning doc cataloging the three remaining vendored `setInterval` sites (d3-timer core loop, html2canvas iframe-load polling, an unidentified leaflet plugin's circle-marker animation) with reachability assessments and patch-feasibility ratings. Its trigger condition (investigation only if the scanner Warning persists) was rendered inactive by the v0.22.42 scan returning clean.
- Net result for v0.22.42: `main.js` `setInterval` count drops from 8 to 3 (the remaining three are in disjoint scopes from any `fetch()` so they don't trigger the rule). Post-release scan returned clean of the setInterval Warning. Score held at 83 / 100 — removing the Warning didn't move the bucketed score because main.js > 5 MB and the irreducible CSS findings (multicolumn / `!important` / `:has()`) each contribute. **Key learning:** the scanner's Behavior rule does **scope-level correlation**, not bundle-level token co-occurrence. Removing the literal `setInterval` wrapping `fetch()` in the same closure was sufficient; the other vendored `setInterval` calls in disjoint scopes did not trigger the rule.

**Internal: scan-response documentation**:
- [`docs/developer/automated-review-notes.md`](../docs/developer/automated-review-notes.md) gained a new §6 covering the three Behavior-section recommendations the v0.22.41 scan surfaced (Vault Enumeration, Clipboard Access, Dynamic Code Execution). Each is reviewed as either a legitimate plugin capability or a vendored-library false positive. The Dynamic Code Execution finding is from two `new Function("return this")()` sites in family-chart's bundled webpack runtime — the standard "find globalThis" pattern, not actual dynamic code execution.
- [`docs/developer/implementation/third-party-libraries.md`](../docs/developer/implementation/third-party-libraries.md) was extended in two passes: the existing `patch-leaflet-distortable.js` entry now covers both stubs (WebSocketClient + chunk loader), pdfmake's notes gained a `patch-core-js-polyfill.js` reference, and the entire JSZip section was replaced by an `fflate (ZIP archives)` section covering the adapter rationale, both reader and writer usage patterns, the ODT mimetype-first constraint, and migration context.

**Testing:** Suite total **883** across 68 suites, unchanged. The polyfill removal had no test impact because the removed branch was unreachable in any environment we test against (Electron / Node.js / modern Chromium all hit the MessageChannel branch).

**Outcome:** Total `createElement("script")` surface reduced from 9 sites in v0.22.39 to 0 in v0.22.41. `setInterval` count reduced from 8 to 3 in v0.22.42 with the setInterval+network Behavior Warning silenced (the remaining 3 sites are in scopes disjoint from any `fetch()`). Final scan posture: zero errors, 83 / 100 score, surfacing only the previously-documented irreducible findings (>5 MB main.js, family-chart `!important`, timeline-callouts multicolumn / `:has()`). The Community Plugins demotion lifted in v0.22.41 and the plugin remained listed throughout v0.22.42.

**Stability-window impact:** v0.22.40 is the eighteenth patch in the v0.22.22-anchored window; v0.22.41 the nineteenth; v0.22.42 the twentieth. All `medium-priority` scan-response work; none reset the window. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.39 Round-Up: Event Ordering UI, Map View Hardening, and Family Chart Asymmetry Drop (v0.22.39)

A focused reliability and UX release. Adds the long-requested Event Relative ordering UI ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569)) so `before` / `after` constraints can be set through the Create / Edit Event modal instead of by hand-editing YAML. Fixes four map-view issues that surfaced during recent custom-map testing — a spurious WebSocket console error from a bundled dev-server client, a markercluster load-order cascade that broke open / close cycles, a child-map header layout that wrapped awkwardly on long map names, and a global-L drift that broke leaflet plugin registrations across repeated open / close cycles — plus closes a separate Family Chart freeze ([#575](https://github.com/banisterious/obsidian-charted-roots/issues/575)) that fired when person notes contained asymmetric relationship data. Also closes the largest category from the v0.22.38 Community automated review's CSS lint surface (the vendored leaflet-distortable duplicates) via a 25-selector dedupe — no user-visible change. Note: between v0.22.38 and v0.22.39's post-release scans, the Community automated review promoted its "dynamic `<script>` element creations" rule from warning to error severity, demoting Charted Roots on the Community Plugins website; the [v0.22.40 – v0.22.42 Round-Up](#v02240--v02242-round-up-scanner-severity-response-arc-v02240v02242) above covers that response arc.

**Feature: Event Relative ordering UI** ([#569](https://github.com/banisterious/obsidian-charted-roots/issues/569)):
- The Create / Edit Event modal now exposes "After these events:" and "Before these events:" chip-list pickers in a new "Relative ordering" section between Worldbuilding and Transfer. Each chip displays the linked event's basename; the Add picker opens a single-select `EventPickerModal` that excludes self and already-added events on the same side.
- The topological sort in the timeline exporters (`timeline-canvas-exporter.ts` and `timeline-markdown-exporter.ts`) has supported the `before` / `after` frontmatter arrays since v0.20.x — until now those constraints could only be set via manual YAML editing, and the wiki documented the YAML shape but offered no UI affordance. The UI fills that gap.
- Use this for events with unknown or imprecise dates where chronology depends on relative ordering rather than calendar values (for example, "this exchange happened during the wedding" or "this letter arrived before the war started").
- Internal: a defensive guard in `createSmartWikilink` (`src/events/services/event-service.ts`) accepts already-bracketed input idempotently so the modal can pass pre-built wikilinks through the service pipeline without double-wrapping. Originally reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Family Chart no longer freezes Obsidian on asymmetric relationship data** ([#575](https://github.com/banisterious/obsidian-charted-roots/issues/575)):
- When a person note has a relationship `_id` field set (e.g., `father_id`) but the corresponding wikilink half is missing — a state that can be produced by interrupted writes, sync conflicts, or partial frontmatter edits — the family-chart library's internal tree construction could enter an infinite loop that froze the entire Obsidian app, not just the view.
- A new `dropAsymmetricRelationships()` bidirectional-symmetry pass runs over `chartData` before the data reaches `f3.createChart()`: any parent / child / spouse reference the other side doesn't mirror is dropped with a console warning and a summary count. The chart then renders correctly with whatever symmetric data remains.
- The underlying note data is not modified — only the in-memory chart input is filtered. A future Data Quality enhancement ([#576](https://github.com/banisterious/obsidian-charted-roots/issues/576), filed for post-1.0) will surface the asymmetric references for repair through the UI.
- Reporter [@D4B2A](https://github.com/D4B2A) traced the root cause themselves after reinstalling Charted Roots wiped the affected `_id` references. The original Family Chart freeze report ([#572](https://github.com/banisterious/obsidian-charted-roots/issues/572)) was closed as self-resolved via the reinstall, cross-referenced to #575 as the upstream fix.

**Fix: map view reliability hardening (four cascading patterns)**:
- **Spurious "WebSocket connection to ws://localhost:8081/ws failed" error in DevTools during custom-map edit mode.** The `leaflet-distortableimage` library's bundled dist file accidentally includes a webpack-dev-server hot-reload client that opens a WebSocket to a non-existent localhost port on every module load. The connection failure was logged as an error every time a custom-map view was opened in edit mode — harmless in practice (the library's normal functionality is unaffected) but alarming-looking. A new postinstall patch (`patch-leaflet-distortable.js`, mirroring the existing `patch-family-chart.js` pattern) stubs the offending `WebSocketClient` constructor to a no-op object, so no connection attempt is made and no error is logged.
- **Cluster cleanup errors during map close no longer cascade to break subsequent map opens.** A pre-existing leaflet.markercluster load-order issue throws `L.DistanceGrid is not a constructor` when clearing cluster layers during view destroy. Previously this poisoned global state and caused the next map open to fail with `leaflet.markercluster is not properly loaded`. The map-controller's `destroy()` path now wraps each cleanup step (cluster clears, layer clears, image map manager, `map.remove`) in independent try-catches with warning logs, so a failure in one step doesn't propagate to the rest of teardown or to the next session. The underlying load-order bug is tracked at [#574](https://github.com/banisterious/obsidian-charted-roots/issues/574); the try-catches are a workaround, not the root-cause fix.
- **Leaflet plugin registrations now survive multiple open / close cycles.** The `initializeLeafletPlugins()` (markercluster, heat, fullscreen, minimap, etc.) and `initDistortableImagePlugins()` (leaflet-toolbar, leaflet-distortableimage) loaders previously only set `window.L = L` on first call; subsequent map opens skipped the reattach. Across repeated cycles the global L reference could drift (mechanism unclear — possibly Obsidian view-lifecycle interactions or another plugin clobbering `window.L`), causing the post-load registration checks to fail from the 2nd or 3rd cycle onward. Both loaders now defensively reattach `window.L = L` on every invocation before the cached imports resolve.
- **Child-map header layout no longer wraps awkwardly when the map name is long.** The breadcrumb navigation (e.g., `The Dying Earth → River Scaum and its Major Tributaries`) is now rendered as its own row above the toolbar instead of sharing the toolbar's left section. The map-selector dropdown is also capped at `max-width: 240px` with ellipsis truncation so long map names don't push filter controls (collections dropdown, year-range inputs) into a wrap. The selector's dropdown popup still shows full option text when opened.

**Internal: leaflet-distortable CSS dedupe (largest category from the v0.22.38 scan)**:
- 25 duplicate-selector cluster between `styles/map-view.css` and `styles/leaflet-distortable.css` consolidated to a single theme-aware block in `leaflet-distortable.css` with `.cr-map-view` scoping. Closes the largest remaining category in the Community automated review's v0.22.38 CSS lint surface (the `.ldi-*`, `.leaflet-toolbar-icon.*`, `#toggle-keymapper`, etc. selectors). `styles.css` drops by 274 lines (41,244 → 40,970).
- No user-visible change in current Charted Roots usage — leaflet-distortable's popup toolbar and keymapper are intentionally suppressed in our map view (`suppressToolbar: true` at `image-map-manager.ts:686`), so the theme-aware values apply to UI that doesn't render. The consolidation is pure scanner cleanup plus defensive posture for any future flip of the suppression flag.
- Plan documented at [`docs/planning/leaflet-distortable-dedupe-plan.md`](../docs/planning/leaflet-distortable-dedupe-plan.md).

**Closures and follow-ups**:
- [#572](https://github.com/banisterious/obsidian-charted-roots/issues/572) — original Family Chart freeze report; closed as reporter-self-resolved via reinstall, cross-referenced to #575.
- [#574](https://github.com/banisterious/obsidian-charted-roots/issues/574) — tracking issue for the underlying `L.DistanceGrid` markercluster load-order bug that the destroy try-catches workaround but don't fix. Acceptance criteria: workarounds can be removed once root cause is fixed.
- [#576](https://github.com/banisterious/obsidian-charted-roots/issues/576) — "Surface asymmetric relationship references in Data Quality tab" enhancement, filed as a post-1.0 follow-up to #575's runtime-dropping fix.

**Testing:** Suite total **883** across 68 suites, unchanged from v0.22.38. No new tests in this release — the Event ordering UI is structural change with no testable assertions beyond what the modal already covers, and `dropAsymmetricRelationships()` is a defensive runtime pass without unit coverage (worth adding if the surface is revisited).

**Stability-window impact:** v0.22.39 is the seventeenth patch in the v0.22.22-anchored window. `high-priority` for the #575 freeze fix, but the fix is purely defensive (no schema change, no behavior change for symmetric data); doesn't reset the window. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.38 Round-Up: Native Button Migration, CSS Scan Cleanup, and Custom Relationship Display (v0.22.38)

A large-scoped scan-cleanup release that responds to the v0.22.37 Community automated review's remaining ~50 actionable CSS warnings, migrates ~190 button markup sites to Obsidian's native `ButtonComponent` API, and ships one small user-facing display fix. Branch net was 27 commits and roughly 750 lines deleted. The release leaves the scan posture in its irreducible-only state — the only categories remaining (vendored leaflet-distortable duplicates, multicolumn partial-support, sibling-aware `:has()`, and one structural `!important` against family-chart's inline styles) are all documented at [docs/developer/automated-review-notes.md](../docs/developer/automated-review-notes.md) §5 as known-and-accepted.

**Fix: Custom relationship category names with multiple words now display correctly in the Entity Profile View** ([#570](https://github.com/banisterious/obsidian-charted-roots/issues/570)):
- The "Other relationships" section in the Entity Profile View rendered the category slug ID with first-letter capitalization, producing "Jedi_order" for a "Jedi Order" custom category. The lookup was reaching for the internal storage identifier and capitalizing it, rather than consulting the configured display name.
- The fix routes the category-name lookup through the existing `getRelationshipCategoryName()` helper (already used elsewhere), which checks customizations → custom categories → built-ins and falls back to `capitalize(slug)` only for unknown IDs. The reporter verified the fix and noted a bonus: built-in Custom Relationship categories now display correctly too. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Native ButtonComponent migration (~190 sites)**:
- Standalone `.crc-btn--primary` / `--secondary` / `--danger` and bare `.crc-btn` markup across 50+ files were converted to Obsidian's `new ButtonComponent(parent).setButtonText(...).setCta()` / `.setWarning()` / bare patterns. Native buttons inherit Obsidian theme conventions automatically, so modal "Cancel" / "Save" / "Apply" footers now match Obsidian's standard CTA look.
- Out of scope intentionally: the `.crc-btn--small` family (87 sites in dense list rows — Obsidian's `ButtonComponent` has no small equivalent), `.crc-btn--icon` (18 icon-only toolbar buttons), `.crc-btn--text` (1), and `.crc-btn-link` (10). These keep their custom styling.
- Eight additional sites (icon + text dynamic composition like the events-tab export button) were deferred — each needs `setIcon` + `setButtonText` integration to preserve current visual and behavior, intentionally held back.

**CSS cluster consolidation arc**:
- Scan-flagged cross-file duplicate selectors were either consolidated (one canonical definition imported across consumers) or renamed when bodies diverged. Touched clusters: `.cr-stat-*` across 3 files; `.crc-wizard-*` across 5 files (15 duplicates); `.crc-btn` family across 6 files (8 duplicates); 9 miscellaneous cross-file duplicates (`.cr-error-text`, `.cr-export-stat`, `.crc-media-preview`, etc.); 8 utility clusters from the v0.22.37 scan (`.crc-loading`, `.crc-place-filter-type[s]`, `.crc-quality-*`, `.crc-modal-header`, `.cr-folder-suggestion*`, `.cr-sv-*` source-view header family, `.cr-progress-*` statistics progress family).
- Three within-file duplicate rule-block merges in `timeline-callouts.css` and `family-chart-view.css`. No visual change.

**`:has()` perf-warning rewrites (17 modal + 3 non-modal)**:
- The scanner flags `:has()` as a perf concern due to broad selector invalidation. Charted Roots' uses were narrowly-scoped (modal sizing keyed on inner content classes), but the warnings still counted against the scan baseline.
- The pattern: each modal's `onOpen()` now adds a `.{modal-name}-sized` class to `modalEl`, and CSS targets the class directly rather than `.modal:has(.X-modal)`. 17 modals converted across staging-manager, book-builder, cleanup-wizard, import/export wizards, hub modals, and media modals.
- Three non-modal conversions: textarea form-field detection (`.cr-create-note-modal .setting-item:has(textarea)` → `.cr-create-note-modal-textarea-setting` class added in TS); checkbox state (`.crc-media-folder-filter-toggle:has(.checkbox:checked)` → `--checked` modifier toggled by change handler); body-level wizard state (`body:has(.cr-image-wizard|cr-media-linker)` → `body.cr-{wizard}-active` managed by wizard `onOpen` / `onClose`).
- Two sibling-aware `:has()` rules in `timeline-callouts.css` are structurally required (no class-based equivalent for sibling detection) and stay with documented `stylelint-disable-next-line` directives.

**`!important` reduction (6 → 1)**:
- DevTools cascade inspection confirmed 5 sites didn't actually need `!important`: the `.cr-hidden` / `.crc-hidden` utility class (single-class specificity beats element defaults) and 4 Leaflet container-scoped image-sizing rules (parent-class scope already wins against Obsidian's broader image rules).
- One legitimate site remains: `.card_cont.cr-hl-dim { opacity: 0.3 !important }` overrides the family-chart library's inline-style transitions, which set `style="opacity: 1"` on every card update and persist after the transition ends — no CSS-only escape. An upstream issue was filed proposing a `.on('end', ...)` cleanup that would restore CSS controllability.

**Text-decoration partial-support reshape**:
- The 3 multi-value `text-decoration` shorthand sites (`line-through var(--text-error)`, `underline dotted`, `underline solid`) were replaced with single-value shorthand plus alternative properties. `.cr-code-old pre` now sets `color: var(--text-error)` so the now-uncolored strikethrough inherits the red text. `.crc-variation-count-link` uses `border-bottom: 1px dotted/solid` instead of `text-decoration: underline dotted/solid`. Visual result nearly identical; scanner-clean.

**Dead-code removal**:
- The `.crc-btn--ghost` class had been applied at 24 markup sites but had no CSS effect outside two scoped place-modal contexts whose parent classes were never rendered in markup. Both the markup uses and the legacy `.crc-unlinked-place-item` / `.crc-referenced-place-item` CSS blocks (151 lines) were removed.

**Upstream and library evaluation**:
- Filed an upstream issue at `donatso/family-chart` proposing the inline-style cleanup that would let downstream consumers override card opacity via CSS. The proposal is a small `.on('end', function() { d3.select(this).style('opacity', null); })` addition to the `cardUpdate` and `cardEnter` transitions.
- Drafted an internal evaluation of `family-chart-premium` as a post-1.0 migration candidate, covering license, inline-style behavior, API delta investigation, and rough phasing. Triggered by the irreducible `!important` finding above.

**Internal: CSS known-and-accepted findings section added to automated-review-notes.md**:
- [`docs/developer/automated-review-notes.md`](../docs/developer/automated-review-notes.md) gained a new §5 documenting the irreducible categories that future scans will surface: the family-chart `!important`, multicolumn partial-support in timeline callouts, sibling-aware `:has()` in timeline callouts, the vendored leaflet-distortable CSS duplicates, and release-level recurring findings (>5MB main.js, the Bitcoin wallet false-positive, the setInterval+network false-positive).

**Testing:** Suite total **883** across 68 suites, unchanged from v0.22.37. No new tests — this release is internal refactor + display-only fix.

**Reporters:** [@DigitalDreamn](https://github.com/DigitalDreamn) for [#570](https://github.com/banisterious/obsidian-charted-roots/issues/570).

**Stability-window impact:** no reset — this is the sixteenth patch in the v0.22.22-anchored window. All `medium-priority` or lower; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28). Scan posture is now in the irreducible-only state.

---

### v0.22.32 – v0.22.37 Round-Up: Community Automated Review Cleanup Arc (v0.22.32–v0.22.37)

Obsidian Community launched its new automated review platform on 2026-05-12, scanning every plugin release for security and code-quality patterns. Charted Roots ran the scan-feedback loop across six releases between v0.22.31 and v0.22.38, addressing each round of findings until the posture stabilized in an irreducible-only state. Most of the work was internal hygiene (ESLint plugin upgrades, timer migrations, stylelint directive iteration, CSS duplicate consolidation), but two user-facing items also landed in this arc.

**Fix: Map view Fullscreen toolbar button now shows an icon** (v0.22.34) — **long-standing visual gap**:
- The `leaflet-fullscreen` package's bundled CSS references an external `fullscreen.png` sprite that was never included in Charted Roots' shipped `styles.css`. The button has been a blank square in the map toolbar since the feature first shipped. Surfaced indirectly during the v0.22.34 `!important` audit — the broader `background:` → `background-color:` flip across leaflet override rules (added to stop the shorthand from wiping background images) revealed that the underlying image wasn't there to begin with.
- Replaced with inline SVG icons (Lucide-style maximize / minimize) drawn via CSS `mask`, so the icons adapt to the current text color (theme-aware in light and dark themes). Both the default state and the active (`leaflet-fullscreen-on`) state are covered.

**Fix: Era abbreviations now render in the dynamic Timeline flat-list view** (v0.22.32, [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) follow-up):
- The v0.22.31 era-abbreviation fix routed two of the three Timeline render paths through the new `formatYearForDisplay` helper, but missed the flat-list rendering in `renderTimelineList` — the most common Timeline render path. Bare years still appeared where `BBY 1045` / `EF 30` / `DE 1265` should have. Same one-line fix as the other two sites: route through `formatYearForDisplay(entry.date, context.person?.universe)`. Surfaced by [@doctorwodka](https://github.com/doctorwodka) during v0.22.31 verification. Three composition tests added to fence the helper chain.

**New: tag-triggered release workflow with build-provenance attestations** (v0.22.32):
- [`.github/workflows/release.yml`](../.github/workflows/release.yml) now runs on SemVer tag push (plain like `0.22.32` or pre-release like `0.22.32-rc1`). The workflow executes `npm run lint` + `npm run lint:css` + `npm test` + `npm run build`, calls `actions/attest-build-provenance@v2` against `main.js` / `manifest.json` / `styles.css`, and creates a **draft** GitHub Release titled `Charted Roots vX.Y.Z` with the three assets attached. The author pastes the audited release-description body via the web UI and clicks Publish — preserving the editorial gate (no auto-generated commit-message notes).
- End users and Obsidian's automated scanners can verify any release asset with `gh attestation verify main.js --repo banisterious/obsidian-charted-roots`. Addresses the two missing-attestation Recommendations from the Community-review scan. See [docs/developer/release-procedure.md](../docs/developer/release-procedure.md) for the full mechanical checklist.

**Internal: `eslint-plugin-obsidianmd` 0.2.9 → 0.3.0 + timer rule reversal** (v0.22.32):
- 0.3.0 launched the same day as the new Community review platform. The `prefer-active-window-timers` rule was renamed to `prefer-window-timers` and its recommendation **inverted** — it now wants `window.setTimeout` instead of `activeWindow.setTimeout`. v0.22.31's Phase 2 migration had moved ~152 sites the other direction; v0.22.32 reverted those plus eight previously-unflagged `requestAnimationFrame` calls back to the new `window.X` form. `prefer-create-el` was removed from the recommended ruleset entirely.
- Also cleared the entire `@typescript-eslint/no-unused-vars` warning category (~71 sites) via leading-underscore ignore-pattern extension plus 31 trailing-argument underscore-prefixes for callback signatures. 46 `createElementNS('http://www.w3.org/2000/svg', ...)` calls migrated to Obsidian's `createSvg(tagName)` global. 10 lazy `require()` sites converted to top-level ES imports. 163 `document.X` references migrated to `activeDocument.X` for pop-out window correctness.

**Internal: stylelint directive handling — three-release iteration**:
- **v0.22.32** introduced a defensive `build-css.js` change that auto-injected `/* stylelint-enable */` between every concatenated component, so component-level `stylelint-disable` directives couldn't bleed across boundaries in the bundle. The injection was unconditional.
- **v0.22.33** addressed the immediate consequence: components without a file-level disable got an orphan enable, which stylelint flags as needless ("no rules have been disabled" at `styles.css:90`). The auto-inject became conditional — emits an enable only when a component has more file-level disables than enables. This was the single error-level finding gating Community Plugins admission against v0.22.32.
- **v0.22.34** flipped the strategy entirely: `build-css.js` now strips all `stylelint-*` directives from the bundled output. The directives are source-level hints serving no purpose in the concatenated shipped bundle; stripping them eliminated the entire category of "needless disable" / "no rules disabled" / "rule already disabled" false-positive risk going forward, regardless of which scanner runs against the file.
- **v0.22.37** narrowed the strip back to file-level forms only. v0.22.34's blanket strip had unintentionally removed per-line `stylelint-disable-next-line` directives alongside the file-level forms it was actually targeting, which unsilenced the per-line `:has()` / `!important` / browser partial-support warnings the v0.22.36 scan subsequently flagged. Per-line directives have no bleed risk; they're now preserved through the build via the regex `(?!-[a-z])` negative-lookahead that distinguishes file-level forms (stripped) from `-next-line` / `-line` forms (preserved).

**Internal: `!important` reduction, `:has()` annotation, and CSS hygiene** (v0.22.34):
- Reduced `!important` declarations from 102 → 11 across stylesheets via targeted specificity refactors. Most uses were defensive against expected style competition rather than necessary inline-style overrides. Leaflet override rules in `map-view.css` now prefix selectors with `.cr-map-view` (already-present container class) for a +1 specificity boost; family-chart `.card` resets use natural 3-class selector specificity; chained-class modifiers (e.g., `.cr-map-btn.cr-map-btn-active`) replace bare modifier overrides. The remaining 11 declarations break down: 4 defensive leaflet core CSS, 3 `.cr-hidden` / `.crc-hidden` utility classes (utility-class display toggle must win over everything), 4 documented cases where an external library sets inline styles at runtime.
- 21 duplicate-selector pairs consolidated across 5 stylesheets (`control-center.css`, `cleanup-wizard.css`, `import-export-wizard.css`, `profile-view.css`, `tree-output.css`). One case required a manual cascade-aware merge to preserve effective top-margin behavior on `.crc-section-header`.
- 46 `:has()` selector sites annotated with per-line `stylelint-disable-next-line` catch-all comments. All uses are narrowly scoped (modal sizing keyed on inner content classes); the scanner's "broad selector invalidation" perf concern doesn't apply, but the warnings still counted.
- `color-hex-length` flipped from `short` to `long` to align with the community-scan preference; ~50 short-hex sites normalized to 6-digit form.

**Internal: `no-unsafe-*` and `sentence-case` per-file disables — three-release iteration**:
- **v0.22.34** added file-level `obsidianmd/ui/sentence-case` disables across 102 source files (covering the 436-warning Batch B remainder from v0.22.30 — quoted button labels, month names, proper-noun section paths, example strings) plus file-level `@typescript-eslint/no-unsafe-*` disables across 146 source/test files (the ~600+ flagged sites from `any`-typed Obsidian API surfaces).
- **v0.22.35** discovered that the v0.22.34 approach broke the Community scan in two ways. First, the `obsidianmd/ui/sentence-case` rule lives in a "Required" wrapper set the scanner enforces but the eslint-plugin itself doesn't — historical scan inspection confirmed the underlying violations had never actually appeared in the warning surface, so the disables were a strict regression (converting 0 warnings into 204 errors). The 101 sentence-case disables were removed entirely. Second, the `no-unsafe-*` file-level disables needed matching `eslint-enable` directives at EOF; each file now emits a trimmed enable mirroring its disable rule-for-rule.
- **v0.22.36** addressed the new error category surfaced by v0.22.35: `Unexpected undescribed directive comment` at 125 sites, one per EOF `eslint-enable` that lacked a `-- reason` description. The line-1 disable directives already carried descriptions; only the newly-added enables didn't. Each enable now reads `/* eslint-enable <rules> -- Match scope of file-level disable at top. */`.
- **v0.22.37** added per-line `stylelint-disable-next-line` directives with `-- reason` descriptions at the 9 documented-legitimate `!important` sites that were unsilenced by v0.22.34's directive-strip rollback. Each directive names the legitimate use case (utility-class display toggle, leaflet defensive override, family-chart inline-style override during overlay animation).

**Internal: recursive orphan sweep** (v0.22.36) — −999 lines:
- v0.22.35 deleted thirteen long-dormant `_*`-prefixed helper functions across `people-tab.ts` / `trees-tab.ts` / `family-chart-export.ts` but didn't iterate over the orphan cascade. The Community scan against v0.22.35 surfaced ~20 `defined but never used` warnings, which on iteration exposed 5 transitive layers of dead code: ~40 imports, module-level `logger` constants, and 11 downstream functions whose only callers were the deleted helpers. Net: −999 lines across `src/ui/people-tab.ts` and `src/trees/ui/trees-tab.ts`. Build / tests / lint all clean after the final sweep.

**Internal: scanner-architecture findings captured** (v0.22.34 – v0.22.37):
- [`docs/developer/automated-review-notes.md`](../docs/developer/automated-review-notes.md) was extended across these four releases with empirical findings about the scanner's behavior: it does NOT read project `eslint.config.mjs` (so locally-configured warning suppressions don't carry over to the scan), it enforces a "Required" wrapper around `obsidianmd/*` that the eslint-plugin itself doesn't enforce, all inline directives (disables AND enables) require `-- reason` descriptions, and stylelint per-line catch-all directives (no rule name) are ignored by the scanner for the `!important` and `:has()` / partial-support categories. The doc also catalogs the upstream `DEFAULT_BRANDS` / `DEFAULT_ACRONYMS` PRs to file against `obsidianmd/eslint-plugin` (Charted Roots, GEDCOM, ODT, Gramps, Mapbox, MapTiler, Stamen, Leaflet, etc.) per [issue #103](https://github.com/obsidianmd/eslint-plugin/issues/103) precedent.

**One user-facing rename in this arc** (v0.22.32 carryforward from v0.22.31):
- The categorized command launcher was renamed from "Open command menu" to "Open quick actions" in v0.22.31 because the new scanner flags commands using "command" in id or name. Users with custom hotkeys bound to the previous command must re-bind under Settings → Hotkeys by searching for "Open quick actions". The modal behavior is unchanged.

**Testing:** Suite total **883** across 68 suites at v0.22.32 (was 880 / 68 at v0.22.31); +3 composition tests from the [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563) follow-up. v0.22.33 – v0.22.37 are all internal hygiene with no test-suite changes.

**Stability-window impact:** no resets across all six releases. v0.22.32 is the tenth patch, v0.22.33 the eleventh, v0.22.34 the twelfth, v0.22.35 the thirteenth, v0.22.36 the fourteenth, and v0.22.37 the fifteenth in the v0.22.22-anchored window. All `medium-priority` or lower. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.31 Round-Up: Fictional-Date Cluster, Community Review Cleanup, and Pop-out Window Timer Migration (v0.22.31)

A patch around a five-issue fictional-date reporter cluster from [@doctorwodka](https://github.com/doctorwodka) and [@DigitalDreamn](https://github.com/DigitalDreamn) ([#562](https://github.com/banisterious/obsidian-charted-roots/issues/562) through [#566](https://github.com/banisterious/obsidian-charted-roots/issues/566)) that all surfaced within 24 hours and share the same structural shape: parallel date-handling helpers across the codebase that were fictional-blind where `DateService` is fictional-aware. Fixed as five small per-issue commits. Alongside the cluster, this release closes the first round of findings from Obsidian's new Community automated review platform (launched the same day, 2026-05-12) — five error-level findings addressed in source. The long-standing 152-warning `prefer-active-window-timers` backlog from the 0.2.9 ESLint plugin upgrade is cleared in three commits, an opportunistic onload-defer pass shaves sub-100ms from plugin load time, and an existing latent correctness gap on bidirectional-sync setup gets closed.

**Fix: Fictional dates with trailing "ish" or "?" no longer drop off the Timeline Density chart** ([#562](https://github.com/banisterious/obsidian-charted-roots/issues/562)):
- The fictional-date parser's four regex patterns were anchored `^...$` and rejected any input carrying a trailing approximation marker. With multiple eras configured, a date like `EF 10ish` failed every fictional pattern, fell through to the standard fallback (which only accepts 4-digit years), and ended up matched by the final digit-run regex in `extractYear` — placing the event in the wrong decade (era-local `10s` instead of canonical `-90s` for an EF era with epoch `-100`). The reporter perceived this as "wholly removed" because the decade they expected no longer held it.
- Added a `stripApproximationMarkers` helper at the top of `FictionalDateParser` that strips trailing `ish` (attached or detached), trailing `?`, and prefix markers (`about`, `abt`, `circa`, `ca`, `c.`, `approx`, `approximately`, `~`) before pattern matching, and sets `isApproximate: true` on the returned `ParsedFictionalDate`. The flag propagates through `DateService.parseDate` so downstream consumers can render approximation indicators.
- The standard-date `isApproximateDate` recognizer is also extended to catch trailing `ish` (digit-anchored, so it doesn't false-positive on words like "Polish") and `?`. Twelve new tests cover the headline cases, the non-approximate controls, and the `DateService` integration. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Era abbreviations now render alongside years in dynamic Timeline and Relationship blocks** ([#563](https://github.com/banisterious/obsidian-charted-roots/issues/563)):
- Both blocks computed the displayed birth/death year via `DynamicContentService.extractYear`, which recognizes BCE/BC + AD/CE suffixes but silently strips every other era prefix. For inputs like `BBY 1045`, `ABY 25`, or any custom-era abbreviation (`EF 30`, `DE 1265`), only the digit run survived — so users with fictional date systems saw bare numbers where era-qualified labels used to appear.
- Added a new `formatYearForDisplay(dateStr, universe?)` helper that consults `DateService.parseDate` first; when the parser recognizes a fictional era, returns the canonical era-aware display (e.g., `BBY 1045`); otherwise falls through to the existing digit-only `extractYear` output. The relationships-block birth/death rendering and the timeline-block default-render plus format-string `{year}` substitution now route through the new helper. `extractYear` itself stays unchanged so the sort and margin-filter call sites that depend on its digit-only output keep working.
- Eleven new tests cover the BBY/ABY/EF/DE shapes, year-first inputs, post-#562 approximate fictional dates, ISO fallback, and the `extractYear` regression fence. Reported by [@DigitalDreamn](https://github.com/DigitalDreamn).

**Fix: Multi-era events sort by canonical year on Compute sort order** ([#564](https://github.com/banisterious/obsidian-charted-roots/issues/564)):
- The events tab's "Compute sort order" button (which assigns `sort_order` values based on date + before/after constraints) used a local `compareDates` helper whose year-extraction regex only matched a leading `-?\d+`. For multi-era inputs like `EF 10` and `DE 5`, both yielded 0 and the comparator fell to alphabetical `localeCompare` — putting `EF 10` (canonical -90 with EF epoch -100) AFTER `DE 5` (canonical 5 with DE epoch 0).
- The helper now consults `DateService.parseDate(date, universe)` first when a service is available, using canonical-year math across eras; falls back to the existing leading-integer regex for inputs neither side can parse, so standard ISO and negative-year dates behave exactly as before. The events tab's call site now passes `plugin.getDateService()` through. Seven new tests cover the headline scenario (`EF 10` before `DE 5`), boundary equivalence (`EF 100` = `DE 0`), mixed-era array sorting, ISO date preservation, and the documented fallback behavior. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Timeline-block age annotations no longer silently render era-stripped values for multi-era inputs** ([#565](https://github.com/banisterious/obsidian-charted-roots/issues/565)):
- `computeEventAge` consults `DateService.calculateAge` first (correct canonical-year math) but had a fallback for inputs DateService couldn't parse — and the fallback called `extractYear` then `parseInt`, which strips fictional-era prefixes and subtracts era-local digits. For inputs like `EF 30` and `DE 100` (with EF epoch -100 and DE epoch 0), the fallback returned 70 (era-local difference) instead of the canonical 170 — exactly the era epoch off, matching the reporter's "100 years off" symptom.
- The fix bails out of the fallback (returns undefined) when either input matches a fictional-date shape (letter run adjacent to digit run, either order), so the timeline annotation is omitted rather than rendered with a silently wrong number. Real-world ISO inputs still flow through the fallback unchanged. Ten new tests fence the `looksLikeFictionalDate` heuristic across attached / detached / no-prefix / GEDCOM-qualifier overlap cases. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Cross-era multi-era characters no longer silently drop from Longevity Analysis and Marriage Patterns** ([#566](https://github.com/banisterious/obsidian-charted-roots/issues/566)):
- Same root cause as [#562](https://github.com/banisterious/obsidian-charted-roots/issues/562) — the approximation-marker strip. The reporter's character had birth `EF 30ish` and death `DE 1265-02-09`; before the #562 fix, `EF 30ish` failed every fictional parser pattern AND the final `\b(\d+)\b` extractYear fallback (because "30" has no trailing word boundary against the "ish" letters), so `extractYear` returned null, `calculateLifespan` returned null, and the `age !== null` filter dropped the character without surfacing anything.
- With #562's strip, `EF 30ish` parses cleanly as canonical year -70 and the character reappears in both Statistics views with the correct 1335-year lifespan. A regression-fence test in `tests/statistics-multi-era-ish-regression.test.ts` simulates the reporter's exact two-state scenario to prevent recurrence. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Fix: Create Person and post-import relationship sync now honor folder filter, inclusive-parents, and DNA-tracking settings**:
- Two paths in `people-tab.ts` (the Create Person modal action and the post-GEDCOM-import relationship sync sweep) constructed `BidirectionalLinker` directly with `new BidirectionalLinker(app)`, bypassing the `setFolderFilter` / `setEnableInclusiveParents` / `setEnableDnaTracking` setup that every other call site applies. Users with any of those toggles configured would see different sync behavior depending on whether the linker ran from these two entry points versus the file-modification or context-menu paths.
- Both sites now route through the `getBidirectionalLinker()` lazy singleton extracted in v0.22.31's Phase 0, so all bidirectional-sync entry points share the same configured linker instance. The fix is structural — surfaced by Phase 1 of the architectural audit's service-instantiation survey rather than a reporter.

**User-facing rename: "Open command menu" → "Open quick actions"**:
- The categorized command launcher introduced in [#290](https://github.com/banisterious/obsidian-charted-roots/issues/290) was registered with the id `open-command-menu` and the name "Open command menu". Obsidian's new Community automated review (launched 2026-05-12) flags both of those — the rule rejects commands that use the word "command" in their id or name. The launcher is now `open-quick-actions` / "Open quick actions", and the Control Center dashboard tile is now labeled "Quick actions". The modal's behavior is unchanged.
- **Users with custom hotkeys bound to the previous "Open command menu" command will need to rebind** under Settings → Hotkeys by searching for "Open quick actions". The internal modal class `CommandMenuModal` and the source file `command-menu-modal.ts` stay as-is — only the user-facing identifiers changed.

**Cleared: five errors from the new Obsidian Community automated review**:
- The new community review system rejects several patterns the previous review accepted, including disabling certain `obsidianmd/*` rules and disabling `@typescript-eslint/no-explicit-any`. Five error-level findings cleared:
  - The heat-layer z-index on custom-image maps now routes through a Leaflet custom pane (`cr-heat-pane` in `map-view.css`) instead of an inline `style.zIndex` assignment in `map-controller.ts`. The pane gets its z-index from CSS rather than JS.
  - The Quick Actions command (above) no longer relies on disable directives for its id/name.
  - The citation-note frontmatter parser in `citation-note-service.ts` types its parameter as `Record<string, unknown>` (with explicit casts per access) instead of `Record<string, any>` behind a disable directive.
- These five plus the v0.22.30 Family Chart XSS fix bring the v0.22.29 scan's six error-level findings down to zero on the v0.22.31 codebase.

**Internal: 152-warning pop-out window timer migration cleared in three commits**:
- The `obsidianmd/prefer-active-window-timers` rule (added in the 0.2.9 ESLint plugin upgrade) flags bare `setTimeout` / `setInterval` / `clearTimeout` / `clearInterval` calls that should route through `activeWindow.*` for pop-out window correctness. The 0.2.9 baseline carried 152 such warnings across the codebase.
- Migrated in three commits matching the timer's intent: (a) the ~30 view-attached refresh / sync / persist debounce timers across fourteen view classes, where pop-out window correctness directly matters; (b) the ~15 modal focus-deferral and UI-yield timers across twelve picker / wizard / quick-create modals; (c) the remaining ~75 sleep helpers, render deferrals, and metadata-cache-wait patterns. Vitest gets a new `tests/setup.ts` that points `activeWindow` at `globalThis` so source code resolves to the host's `setTimeout` in tests.
- Together these clear the entire 152-warning backlog. The pop-out-window correctness payoff is small in practice (users have to be actively using Obsidian pop-outs) but the bundle-level finding cleared.

**Internal: opportunistic onload defer + service-construction consolidation**:
- `EventService.setupVaultListeners`, `WebClipperService.startWatching`, and the three file modification / delete / Universe-rename handler registrations now run inside an `onLayoutReady` callback rather than directly during `onload`. `initializeRelationshipHistory` is now fire-and-forget (`void` instead of `await`) — consumers already null-guard the property. Sub-100ms shaved off plugin load time per Phase 1's measurements; file events fired during the brief gap between onload-finish and layout-ready don't happen in real usage since the vault has just opened.
- Eleven `UniverseService` consumer sites (main.ts plus report-wizard, statistics-tab, universe-entities-processor, control-center, universes-tab ×2, edit-universe-modal, universe-wizard, bulk-operations, context-menu-helpers) consolidated onto the existing but barely-used `createUniverseService` factory, matching the pattern used elsewhere in the codebase.

**Internal: removed forty-four unused `@typescript-eslint/require-await` disable directives**:
- The disables were added in v0.22.30's Batch A under the assumption the rule was active. The 0.2.9 recommended config actually sets that rule to `off`, so the disables were no-ops — flagged here as `Unused eslint-disable directive` warnings. All forty-four removed.

**Testing:** Suite total **880** (was 834 at v0.22.30), 68 suites. +46 regression tests across the five fictional-date cluster issues (`tests/fictional-date-parser-approximation.test.ts`, `tests/sort-order-fictional.test.ts`, `tests/timeline-renderer-age-fallback.test.ts`, `tests/statistics-multi-era-ish-regression.test.ts`, `tests/dynamic-content-format-year-for-display.test.ts`).

**Reporters:** [@doctorwodka](https://github.com/doctorwodka) for [#562](https://github.com/banisterious/obsidian-charted-roots/issues/562), [#564](https://github.com/banisterious/obsidian-charted-roots/issues/564), [#565](https://github.com/banisterious/obsidian-charted-roots/issues/565), and [#566](https://github.com/banisterious/obsidian-charted-roots/issues/566); [@DigitalDreamn](https://github.com/DigitalDreamn) for [#563](https://github.com/banisterious/obsidian-charted-roots/issues/563).

**Stability-window impact:** no reset — this is the ninth patch in the v0.22.22-anchored window (after v0.22.23 through v0.22.30). All `medium-priority` or lower; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.30 Round-Up: cr_id Collision Filter, Negative-Year Decade Bucketing, and Family Chart XSS Hardening (v0.22.30)

A patch around two reporter-surfaced fixes plus a security-hardening pass on the Family Chart render path and the housekeeping side of a recent ESLint plugin upgrade. [#559](https://github.com/banisterious/obsidian-charted-roots/issues/559) closes a wikilink-redirection case where an outside-CR duplicate cr_id (typically a File-Recovery copy or stray archive) could shadow the canonical note. [#560](https://github.com/banisterious/obsidian-charted-roots/issues/560) closes a fictional-vault decade-bucketing bug on Longevity Analysis and Timeline Density where negative years rounded toward negative infinity. Alongside, the Family Chart circle-card render path was rebuilt via DOM APIs so user-supplied person names can't be interpreted as HTML.

**Fix: Wikilinks no longer redirect to recovered-duplicate files when a cr_id collision exists outside the Charted Roots folder** ([#559](https://github.com/banisterious/obsidian-charted-roots/issues/559)):
- The writer's cr_id-resolution helper (`findFileByCrId`, with three near-identical copies in `person-note-writer.ts`, `organization-service.ts`, and `place-note-writer.ts`) iterated every markdown file in the vault and returned the first match for a given cr_id. When two files shared a cr_id — typically a canonical Charted Roots note plus an outside-CR duplicate (recovered via Obsidian's File Recovery, copied during troubleshooting, or archived elsewhere) — the resolver could return the outside-CR duplicate, and the writer would silently emit a path-aliased wikilink (`[[Outside-CR-basename|Display Name]]`) pointing at the wrong file.
- The cr_id stayed correct in paired `<field>_id` arrays, so the underlying data wasn't lost. But renderers that filter on `cr_type` (the Family block, the Edit Person children list, etc.) dropped the entry because the resolved file wasn't a CR-typed note, making it appear "missing" until the duplicate was deleted.
- The fix consolidates the three copies into a shared `findCrNoteByCrId(app, crId, expectedCrType)` helper at `src/utils/cr-id-resolver.ts` that requires the candidate file to carry the expected `cr_type` in its frontmatter, so a non-CR duplicate can't shadow the canonical note. Each existing call site already knew which entity type it was writing — the person variant always wants `'person'`, the org variant `'organization'`, the place variant `'place'` — so threading the type through is a mechanical change with no caller-side logic shift. A follow-up pass caught a fourth in-file caller in `place-note-writer.ts`'s simpler `createWikilink` helper that the initial sweep missed (esbuild bundles without typecheck, so the stale reference compiled through the production build but would have thrown at runtime if the parent-place picker fed it a cr_id).
- Six unit tests cover the new helper: basic match, no-match, cross-type rejection, outside-CR duplicate skip (the headline case), no-frontmatter skip, and multiple-match-returns-first. Surfaced by [@DigitalDreamn](https://github.com/DigitalDreamn) via [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) — her vault had a canonical `Jodni Naberrie-Waldin.md` inside Charted Roots alongside a recovered `Jodni Naberrie.md` outside, both sharing Jodni's cr_id.

**Fix: Negative-year decade bucketing on Longevity Analysis and Timeline Density** ([#560](https://github.com/banisterious/obsidian-charted-roots/issues/560)):
- Both views computed decade buckets via `Math.floor(year / 10) * 10`, which rounds toward negative infinity. Positive years worked fine (1985 → 1980s), but negative years that didn't end in 0 were pushed into the next-more-negative decade: `-25` → `-30s`, `-21` → `-30s`, `-29` → `-30s`. Reporter had a cluster of fictional-vault characters with `-21` to `-27` birth years all labelled as `-30s`.
- Switched to `Math.trunc`, which rounds toward zero and matches BCE/BBY convention where the "-20s decade" spans years -20 through -29. Years in the open range `(-10, 10)` all bucket to `0s` (a `|| 0` guard collapses JavaScript's `-0` to `+0` so the label doesn't render as `-0s`).
- Fixed at all five sites: the shared `extractDecade` helper plus three Timeline Density tallies (events / births / deaths) and the by-decade grouping in `timeline-generator.ts`. Six unit tests cover positive years, the headline negative cases, exact-multiple-of-10 boundaries, the cross-zero `0s` collapse, and large negative years. Reported by [@doctorwodka](https://github.com/doctorwodka).

**Hardening: Family Chart circle-card rendering no longer interprets person names as HTML**:
- The circle-card update path replaced a card's `outerHTML` with a template-literal-built string that interpolated user-supplied person names, alt names, birth/death dates, and avatar paths directly. A name containing HTML characters (`<`, `>`, `&`) would render as markup or, in the worst case for a deliberately crafted name, execute as a script tag.
- Rebuilt via DOM APIs (`createDiv` / `createEl` / `appendText` / `card.replaceWith`) so all interpolated content is text-only. No behavioral change for well-formed data; malicious or accidentally HTML-bearing frontmatter values now render literally as text. Surfaced by the new `no-unsanitized/property` rule introduced in the `eslint-plugin-obsidianmd` 0.2.9 upgrade — exactly the kind of latent issue the rule exists to catch.

**Internal: ESLint baseline cleared of all real-signal errors after the 0.2.9 plugin upgrade**:
- The `eslint-plugin-obsidianmd` 0.1.9 → 0.2.9 upgrade re-baselined the lint surface from 8197 problems down to 1592 (653 errors, 939 warnings), introducing new typed rules and refining existing ones. This patch clears the 76 non-sentence-case errors that surfaced — fire-and-forget `reloadCache` calls now use the `void` prefix (26 sites), an `asScalarString` helper guards frontmatter values from accidentally stringifying as `[object Object]` (11 sites), redundant type-union constituents are simplified (5 sites), template-literal expressions on `never` exhaustive-check fallbacks are wrapped via `String()` (4 sites), `instanceof SVGElement` checks are switched to Obsidian's cross-window-safe `.instanceOf(SVGElement)` (3 sites), unnecessary non-null assertions and type casts dropped (6 sites), regex `no-useless-escape` cleanups (2 sites), single-hit cleanups (3 sites), and dev-dep adjustments (replaced `builtin-modules` with Node's native `node:module`, declared `leaflet-toolbar` as a direct dependency, allowlisted `chalk` as a build-script-only acceptable dependency, added a tests-files override permitting TFile-shaped stubs in mocks).
- Plus a first chunk of the sentence-case rebaseline (587 → 435) via brand/acronym config expansion (DNA-testing services, Web Clipper, A→Z sort indicators, lowercase frontmatter keys, date-format placeholders) and 34 brand-cap source fixes across 22 files. The remaining 435 sentence-case errors mix real Title Case → sentence case fixes with rule misfires on quoted button-label references and proper-noun lowercasing; each needs per-site review and is deferred.

**Testing:** Suite total **834** (was 828 at v0.22.29), 63 suites. +6 regression tests in `tests/statistics-decade-bucketing.test.ts` covering positive years, negative non-multiples-of-10, exact-multiple boundaries, the cross-zero `0s` collapse, and large negative years.

**Reporters:** [@DigitalDreamn](https://github.com/DigitalDreamn) for [#559](https://github.com/banisterious/obsidian-charted-roots/issues/559) (via the #537 follow-up thread); [@doctorwodka](https://github.com/doctorwodka) for [#560](https://github.com/banisterious/obsidian-charted-roots/issues/560).

**Stability-window impact:** no reset — this is the eighth patch in the v0.22.22-anchored window (after v0.22.23 through v0.22.29). All `medium-priority` or lower; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.29 Round-Up: Bidirectional-Sync Audit and the Seven Gaps It Surfaced (v0.22.29)

A patch built around a proactive bidirectional-sync audit and one bug surfaced during testing. The audit catalogued every field family currently doing hand-wired bidi sync — spouse + indexed-spouse + marriage details, bio children/parents, adoptive parents + adopted children, step parents + step children, organization membership, custom relationships, and the `partners` alias — across the three directions each needs (A→B, B→A, edge cases like rename / delete / format conversion). Seven concrete gaps surfaced across the five disjoint sync locations; six landed in this patch as discrete fixes. The seventh — delete-cleanup for non-person entities — is filed as [#557](https://github.com/banisterious/obsidian-charted-roots/issues/557) for post-1.0. Sibling fix [#551](https://github.com/banisterious/obsidian-charted-roots/issues/551) ported the descriptive-field cluster (`alt_name`, `pronouns`, `religion`, `caste`) into the property aliases UI — surfaced via an upstream report and implemented alongside the audit bundle. [#558](https://github.com/banisterious/obsidian-charted-roots/issues/558) was surfaced during #554 dev-vault verification: a self-referential `stepmother` test edit revealed that five of the bidi-linker's eight sync functions were missing the self-reference guard their bio analogues have.

**Fix: Property aliases UI now lists `alt_name`, `pronouns`, `religion`, and `caste`** ([#551](https://github.com/banisterious/obsidian-charted-roots/issues/551)):
- Settings → Properties → "Property and value configuration" → Person properties was missing the descriptive-field cluster from the start. The fields themselves shipped throughout the rest of the plugin via #346 / #347 / #348 / #349 / #351 + #374 + #101, but `PERSON_PROPERTY_METADATA` was never updated, so users with custom YAML key names for these properties had no UI to map them through — they were forced to rename the frontmatter keys in their notes to match the canonical names.
- Surfaced via @grg3wong's report on the upstream `donatso/family-chart` repo (issue #97) — a misposted comment about Charted Roots that turned out to flag three things: this aliases gap, a question about the split-names toggle location (answered: hamburger menu rather than settings), and a missing character-limit name-wrapping feature (not currently planned). Redirect comment posted on the upstream issue with the three answers.
- Person-side `title` deferred — the `title` canonical is already used by events and sources, and the alias-storage layer doesn't currently scope canonicals by category. Closing the person-title gap cleanly needs either a rename or a small storage refactor (left for a separate change if it surfaces in user reports).

**Fix: Person rename now rewraps wikilinks in every relationship-array field** ([#555](https://github.com/banisterious/obsidian-charted-roots/issues/555)):
- `RelationshipManager.updateRelationshipWikilinks` (invoked from the Edit Person rename path) had hardcoded twin lists of which fields to check: `father` / `mother` / `stepfather` / `stepmother` / `adoptive_father` / `adoptive_mother` / `parents` / `spouse` / `children`. Anything outside that list silently kept its pre-rename wikilink form: indexed `spouse1` through `spouse10`, `adopted_child` and `step_child` arrays on parents' notes, the gender-neutral `adoptive_parent` array, and any custom relationship field (`mentor`, `godparent`, `employer`, etc.).
- Obsidian's native wikilink rewrite still updated the `[[OldName]]` → `[[NewName]]` portion, so links didn't break — but the canonical-form rewrap with basename-ambiguity disambiguation (#540) didn't fire on those fields, leaving them as bare `[[NewName]]` even when they should hold `[[Folder/NewName|NewName]]`. The #537 self-heal pass would normalize them on the next save of each affected note, so the gap was largely invisible in practice — but the catalog included it for completeness.
- The fix replaces both hardcoded lists with a generic frontmatter scan: every `<field>_id` key is checked against the renamed person's cr_id, and every paired `<field>` wikilink gets rewrapped when the `_id` match succeeds. The id-match guard skips non-person `_id` fields naturally (place / event / source ids won't match a person's cr_id). Future relationship types added to the data model are covered automatically without needing to update this code.

**Fix: Bidirectional linker now honors the `partners` alias for `spouse`** ([#556](https://github.com/banisterious/obsidian-charted-roots/issues/556)):
- The property-alias system registers `partners` as a canonical spouse-equivalent name for users who prefer that term, and the family graph honors the alias for reads (`family-graph.ts:1720-1728` falls back to `partners` / `partners_id` when `spouse` is absent). The bidirectional linker did not — it read `frontmatter.spouse` directly across every internal site.
- A user who had switched their canonical to `partners` got none of the spouse-side behavior: no reciprocal write to the partner's note, no marriage-detail mirroring (#481), no spouse-format preservation (flat ↔ indexed), and the deletion-detection guard (#423) treated every save as a phantom removal cascade.
- Five sites now fall back to `partners` when `spouse` is absent: the sync-side read in `syncRelationships`, the deletion-detection comparison in `syncDeletions`, the snapshot capture in `updateSnapshot` (for the next deletion comparison), the dedup check in `addBidirectionalSpouseLink`, and the unlink sweep in `removeSpouseLink` (which now removes from both `spouse*` and `partners*` arrays so removals complete regardless of canonical). `isSpouseInFrontmatter` extended to scan `partners` alongside `spouse` and the indexed `spouseN` slots; covered by 4 new regression tests.
- Note: write-side alias respect (the linker writing `partners*` instead of `spouse*` onto a target who prefers that term) is a deeper-scope follow-up, deferred until it surfaces in user reports. Current behavior writes `spouse*` regardless of the target's preference — asymmetric but not broken.

**Fix: Step-child reverse direction now syncs — parent's `step_child` populates child's `stepfather` / `stepmother`** ([#554](https://github.com/banisterious/obsidian-charted-roots/issues/554)):
- The bidirectional linker handled the step-relationship sync **one direction only**: when a child had `stepfather: [[Parent]]`, the parent's `step_child` array got the child added (via `syncStepParentChild`). The reverse direction was missing — adding `step_child: [[Child]]` directly on the parent's note (via Edit Person or by hand) left the child's `stepfather` / `stepmother` empty.
- This was asymmetric with the `adopted_child` analogue, which has always been bidirectional — adding `adopted_child: [[Child]]` on the parent runs `syncAdoptedChildToParent` and writes `adoptive_father` / `adoptive_mother` on the child based on the parent's sex. The step variant just never got the same treatment when it was added.
- New `syncStepChildToParent` method modeled on the adopted-child shape closes the gap; the dispatch loop in `syncRelationships` now iterates `step_child` alongside `adopted_child`. Field selection is sex-driven (`stepfather` for male parents, `stepmother` for female parents); the sync skips silently when sex is unknown because there is no gender-neutral `step_parent` array to fall back to (unlike `adopted_child`, which can use `adoptive_parent`).

**Fix: Self-referential step / adoptive / DNA-match entries no longer auto-propagate to the same note** ([#558](https://github.com/banisterious/obsidian-charted-roots/issues/558)):
- The bidirectional linker had self-reference guards on three sync functions (`syncParentChild`, `syncChildToParent`, `syncSpouse` / `addBidirectionalSpouseLink`) but was missing them on five others: `syncStepParentChild`, `syncStepChildToParent` (newly added by #554), `syncAdoptiveParentChild`, `syncAdoptedChildToParent`, and `syncDnaMatch`. When a user pointed any of those kinship fields at their own note (typically a typo when picking a target, but reproducible by hand-editing), the linker silently wrote the paired field back onto the same note.
- Surfaced during #554 dev-vault verification: a self-referential `stepmother: "[[Mirelle Vendren]]"` edit on Mirelle's own note caused the linker's `syncStepParentChild` to resolve the wikilink → Mirelle's own file → write `step_child: ["[[Mirelle Vendren]]"]` + `step_child_id: ["<Mirelle's cr_id>"]` back onto her note. Single typo, multiple frontmatter mutations.
- The five missing guards now match the bio analogues: each function returns early with a warning log when the resolved target file equals the source file. Bio kinship and spouse paths were already covered. No behavioral change for non-self-referential paths.

**Fix: Add Relationship modal — source and reciprocal writes now use canonical-form wikilinks** ([#553](https://github.com/banisterious/obsidian-charted-roots/issues/553)):
- The Add Relationship modal writes the chosen relationship onto the source person's note and — for symmetric types like `twin` / `friend` (#419) — mirrors it onto the target's note. Both writes used raw `[[basename]]` wikilinks, bypassing `createSmartWikilink` and so missing the basename-ambiguity disambiguation that the rest of the writer surface has been doing since #540.
- In vaults with two people sharing a basename across folders, the custom-relationship wikilink could resolve to the wrong file on save. Both sites now route through `createSmartWikilink`, producing the canonical `[[Folder/Name|Name]]` form when needed. Same shape as the #552 members-list fix; surfaced by the same bidirectional-sync audit.

**Fix: Organization member list now writes canonical-form wikilinks** ([#552](https://github.com/banisterious/obsidian-charted-roots/issues/552)):
- When the person-side membership flow mirrored a change back to the organization's `members` / `members_id` arrays (the v0.22.25 #541 fix that made person-side adds reach the org's frontmatter), the org-side write used a raw `[[basename]]` wikilink instead of routing through `createSmartWikilink`. Vaults with two members sharing the same basename in different folders collapsed to indistinguishable `[[Name]]` entries in the org's `members` array — the org's properties pane then resolved to whichever file Obsidian picked first.
- Same shape as the writer-side gap that #549 closed for Edit Organization and Edit Event modals. The org-side `syncMembersToOrg` now produces the canonical `[[Folder/Name|Name]]` form via the shared helper.

**Architectural reference: bidirectional-sync audit catalog**:
- The audit doc ([`docs/planning/bidirectional-sync-audit.md`](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/bidirectional-sync-audit.md)) maps the five disjoint sync locations and the seven concrete gaps across the six relationship field families. Bidi-sync is currently hand-wired across five places — `BidirectionalLinker.syncRelationships` (the big metadata-cache-driven dispatcher), `RelationshipManager.updateRelationshipWikilinks` (the rename-canonicalization path), `person-note-writer.ts`'s reverse-unlink pass (the Edit Person save flow), `person-delete-cleanup.ts` (the on-delete sweep, currently the closest thing to a declarative bidi-field registry but person-only and delete-only), and `AddRelationshipModal.writeReciprocalRelationshipProperties` (the symmetric-type reciprocal write).
- Read-side traversal is unified (v0.22.26 `RelationshipQueryService`); write-side bidi-sync is not. The larger declarative-field-table refactor that would unify all five locations is out of scope for the soak window — worth revisiting post-1.0 once the gap catalog is closed.

**Testing:** Suite total **822** (was 818 at v0.22.28), 61 suites. +4 regression tests in `tests/spouse-format-detector.test.ts` covering the new `partners` alias branches in `isSpouseInFrontmatter` (flat scalar, flat array, no-match, partners + spouse mixed). The other audit fixes are routing-only or symmetry additions and rely on the existing helper suites that consume them (family-graph, spouse-format-detector, etc.). #554's `syncStepChildToParent` and #558's self-reference guards have no integration tests because `BidirectionalLinker` has no integration-test infrastructure — coverage on this layer lives on the helpers it consumes, consistent with project practice.

**Reporters:** @grg3wong via the upstream `donatso/family-chart` issue #97 for [#551](https://github.com/banisterious/obsidian-charted-roots/issues/551)'s scope. The audit bundle (#552–#557) and the surfaced self-reference bug (#558) were self-reported during the proactive audit and #554 dev-vault verification.

**Stability-window impact:** no reset — this is the seventh patch in the v0.22.22-anchored window (after v0.22.23, v0.22.24, v0.22.25, v0.22.26, v0.22.27, v0.22.28). All `medium-priority` or lower; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.28 Round-Up: Edit-Modal Display Coverage and Property-Based Fuzz Expansion (v0.22.28)

A focused patch closing the remaining display-layer gaps in the wikilink-input cluster and adding property-based fuzz coverage to catch the next variant proactively. Three issues land together because they share the same `extractDisplayLabel` / fuzz-corpus pattern: [#543](https://github.com/banisterious/obsidian-charted-roots/issues/543) was re-opened from `released-testing` after @DigitalDreamn's verification surfaced a spouse-field render path the original v0.22.25 fix missed; [#549](https://github.com/banisterious/obsidian-charted-roots/issues/549) extends the same fix shape to the Edit Organization and Edit Event modals, with companion writer-side rewrap so edits to the editable free-text fields don't lose the wikilink shape on save; [#548](https://github.com/banisterious/obsidian-charted-roots/issues/548) extends the existing `createSmartWikilink` fuzz suite to three additional helpers so the next variant in the input-contract cluster is caught by tests rather than by a reporter.

**Fix: Edit Person modal Spouse field now displays clean labels** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543) follow-up):
- The v0.22.25 #543 fix added `extractDisplayLabel` to the relationship-field renderer (`createRelationshipField`) and the place-field renderer (`createPlaceField`) in `create-person-modal.ts`, but the indexed-spouse render path (`renderSpouseItem`) used a different code site that read `spouse.name` directly without the cleanup. @DigitalDreamn's verification screenshot showed the gap exactly: Father / Mother displayed clean (`Xander Wyndurri`, `Suzé Satirné-Wyndurri`) while the Spouse field still showed `Charted Roots/People/Rebecca Wilkin|Rebecca Wilkin` — the canonical disambiguated form from #540 leaking through to the modal display layer. The Father / Mother fields had been protected since v0.22.25; the Spouse field was a missed coverage site.
- Root cause: `renderSpouseItem` in `create-person-modal.ts:2373` set the visible name span via `nameSpan.setText(spouse.name)`, where `spouse.name` came from `relationship-loader.ts`'s `extractName` which returns the raw inner content of the wikilink (`match[1]` from `/\[\[([^\]]+)\]\]/`). For a piped or path-form wikilink, that inner content includes the pipe and path, which then leaked into the modal display.
- The fix applies `extractDisplayLabel` at three sites in `renderSpouseItem`: the spouse name span, the remove-button `aria-label` (so screen readers also get the clean name), and the readonly marriage-location input value (for the `placeGraph` branch). The free-text fallback for marriage location keeps the raw value so any user edit preserves the underlying wikilink shape on save. Underlying `spouse.name` and `spouse.marriageLocation` stay raw on disk; the writer re-canonicalizes on save.
- Required reopening #543 from `released-testing` because the original v0.22.25 fix was incomplete in implementation. The original issue body had explicitly listed "Spouses" as one of the affected fields; the fix landed for relationship + place fields but missed the spouse render path's separate code.

**Fix: Edit Organization and Edit Event modals — display-layer coverage and writer-side rewrap** ([#549](https://github.com/banisterious/obsidian-charted-roots/issues/549)):
- Same shape as #543 applied to four additional sites: Edit Organization's `parent_org` and `seat` fields (in `create-organization-modal.ts`'s edit mode, lines 235 and 275), Edit Event's `place` field (already picker-driven readonly at `create-event-modal.ts:775`) and `timeline` field (free-text editable at line 374).
- Three of the four are user-typed free-text inputs where applying the display-cleanup alone would have caused regressions on save: the user would see `Jedi Order` (cleaned form), edit it, the writer would store `Jedi Order` raw without brackets, breaking the link. Pre-fix, `OrganizationService.updateOrganization` wrote `parent_org` and `seat` as raw `data.X` to frontmatter without any wikilink wrapping — a writer-side gap the cleaned-display would have exposed.
- The fix routes `updateOrganization`'s `parent_org` and `seat` writes through `createSmartWikilink` (the org-side variant in `organization-service.ts`), and switches `updateEvent`'s `place` and `timeline` writes from `formatWikilink` to `createSmartWikilink` (the event-side variant in `event-service.ts`). Both helpers are idempotent when the input is already canonical, but `createSmartWikilink` additionally collapses pipe/path stems and re-resolves disambiguation, so edited cleaned values get the canonical wikilink form on save (display → cleaned text → save → canonical form).
- The Edit Event place field was already readonly + picker-driven (the picker callback fills the field with the canonical wikilink form), so the cleanup there is purely cosmetic. The other three are free-text editable inputs where the writer-side rewrap is the load-bearing piece — without it, the display cleanup would have been net negative.

**Internal: `extractDisplayLabel` final-trim closure** ([#548](https://github.com/banisterious/obsidian-charted-roots/issues/548) fuzz finding):
- The property-based corpus added during the fuzz expansion (see below) caught a small robustness gap: bracket-wrapped inputs with internal whitespace (e.g., a typed-by-hand `[[ Errol Naberrie ]]` in frontmatter) returned ` Errol Naberrie ` with the surrounding spaces preserved because neither the pipe-collapse branch nor the path-collapse branch fired their inner trim — both code paths call `.trim()` on the segment after splitting, but only when the input has a pipe or slash.
- Fix: a final `.trim()` at the helper's return statement. Idempotent since the helper already trimmed at entry. Real-world impact small (most frontmatter doesn't carry whitespace inside brackets), but the property is now asserted in the corpus and the fix is one line.

**Internal: property-based fuzz coverage extended to four input-contract helpers** ([#548](https://github.com/banisterious/obsidian-charted-roots/issues/548)):
- The existing `createSmartWikilink` fuzz suite that landed inline between v0.22.24 and v0.22.25 (covering the person-note-writer variant with bare basenames, pre-formatted wikilinks, pipe-form residue, path-form residue, and combined-corruption shapes) now has parallel suites for three additional helpers plus an extension to the `extractDisplayLabel` test file.
- **`extractDisplayLabel`** (`tests/extract-display-label.test.ts`): existing 25 targeted regression tests, plus a new property-based block with 17 corpus cases covering bare strings, bracketed wikilinks, residue from earlier bug eras (#537 / #538), and edge cases (whitespace, unicode, apostrophes, diacritics, CJK characters). Asserts: output contains no brackets / pipes / slashes, output is trimmed, idempotency holds. The corpus surfaced the whitespace gap fixed above.
- **`getCanonicalLinktext`** (new file `tests/get-canonical-linktext.test.ts`, 19 tests): targeted regression tests for unique-vault and ambiguous-vault behavior, plus a property-based block covering deeply nested paths, three-way ambiguity, and special characters. Asserts: output never contains brackets/pipes, no `.md` suffix, exactly matches `file.basename` (unique case) or `file.path` sans `.md` (ambiguous case).
- **`createSmartWikilink` — organization-side variant** (new file `tests/organization-smart-wikilink.test.ts`, 18 tests): mirrors the person-note-writer fuzz pattern with org-typed cr_ids and paths. Tested under both unique-vault and ambiguous-vault setups. Same assertions: parseable wikilink shape, ambiguous-vault output contains the canonical CR path, round-trip idempotency holds.
- **`createSmartWikilink` — event-service variant** (new file `tests/event-smart-wikilink.test.ts`, 17 tests): different fuzz dimension since this variant assumes clean inputs and disambiguates via explicit `basename` / `file` parameters rather than doing pipe/path stem collapse on the input. The corpus exercises parameter combinations + special characters across vault states (basename match, basename divergence, file present, file absent, vault resolution path, no-resolution fallback).
- Total +79 tests across the four helpers (45 / 19 / 18 / 17). When the next variant in the wikilink-input cluster surfaces, the fix flow becomes "add the new shape to the corpus and the existing assertions catch it" — the same payoff the original `createSmartWikilink` corpus has been delivering since v0.22.25.

**Testing:** Suite total **818** (was 739 at v0.22.27), 61 suites. +17 new corpus cases in `extract-display-label.test.ts` (existing 28 stayed), +19 new in `get-canonical-linktext.test.ts`, +18 new in `organization-smart-wikilink.test.ts`, +17 new in `event-smart-wikilink.test.ts`. Net +79 across the fuzz expansion.

**Reporters:** @DigitalDreamn for [#543](https://github.com/banisterious/obsidian-charted-roots/issues/543)'s spouse-field gap. The screenshot pinpointed exactly which render path the v0.22.25 fix had missed, which is what made the additional fix flow obvious rather than triage-driven.

**Stability-window impact:** no reset — this is the sixth patch in the v0.22.22-anchored window (after v0.22.23, v0.22.24, v0.22.25, v0.22.26, v0.22.27). All `low-priority` or defensive coverage; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28), ~18 days of soak ahead.

---

### v0.22.27 Round-Up: Cache-Race Audit and the End of the 2-Second Sleep (v0.22.27)

A preventative patch built around the cache-race audit filed as [#547](https://github.com/banisterious/obsidian-charted-roots/issues/547). Four cache-holding services — `FamilyGraphService`, `PlaceGraphService`, `OrganizationService`, `UniverseService` — shared a write-then-read race where each service's `reloadCache()` ran before Obsidian's metadata cache caught up to the just-written change, silently dropping new entries from the cache or holding pre-edit state until something else triggered another reload. `FamilyGraphService` masked the symptom with a 2-second `setTimeout` band-aid in `reloadCache`; the other three had no mitigation at all. This patch routes each writer through a shared `waitForCacheRefresh` helper (originally introduced privately on `MembershipService` for the [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) cache-timing follow-up) that resolves on the next `metadataCache.changed` event for each modified file, with a 500ms timeout fallback. The 2-second sleep on family-graph reloads is gone — batch operations (data-quality cleanups, bidirectional fixes) now finish ~2 seconds faster per batch. No user-reported bugs closed; this was proactive prevention work during the v0.22.22-anchored stability window.

**Helper extraction: `waitForCacheRefresh` promoted to a shared utility** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)):
- The helper landed privately on `MembershipService` in v0.22.25 as the cache-timing follow-up to [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) (DigitalDreamn's multi-Jedi test surfaced the "trailing one update behind" pattern when person→org membership sync was reading stale cache between `processFrontMatter` and the org-side mirror write).
- Hoisted to `src/utils/cache-utils.ts` so any service-layer code performing the write→read pattern can call it. Signature: `waitForCacheRefresh(app: App, file: TFile, timeoutMs = 500): Promise<void>`. Listens for the next `metadataCache.changed` event for the target file, with a timeout fallback so the caller proceeds if the event doesn't fire within the window (e.g., when the cache was already up to date by registration time, or when the write touched only file content the metadata cache doesn't track).
- 4 unit tests in `tests/cache-utils.test.ts` cover resolution on the changed event, ignoring unrelated files, the timeout fallback, and listener cleanup after resolution.

**Fix: `FamilyGraphService.reloadCache` 2-second sleep replaced with event-driven wait** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)):
- The pre-fix code in `src/core/family-graph.ts:373-382` slept unconditionally for 2 seconds before re-reading the metadata cache. The comment named the race directly: *"After batch operations, files are modified but Obsidian's file watcher needs time to detect changes and update the metadata cache."* Fixed-delay shotgun — brittle on slow systems, wasted UX on fast ones, paid by every batch-op caller whether or not they'd recently written.
- New signature: `reloadCache(modifiedFiles?: TFile[]): Promise<void>`. When `modifiedFiles` is provided, awaits each file's metadata-cache refresh via `Promise.all(files.map(f => waitForCacheRefresh(app, f)))` before rebuilding. When omitted, rebuilds immediately — refresh-driven flows (e.g., reloading before a read in places where no recent write occurred) skip the wait entirely, a strict UX improvement over the old 2-second tax.
- Companion change: `BatchOperationResult` extended with `modifiedFiles: TFile[]`. Ten batch-operation methods in `DataQualityService` (date normalization, gender normalization, orphan-reference clearing, missing-ID repair, nested-property flattening, legacy-type migration, membership migration, bidirectional-inconsistency fix) now expose the list of files they touched. Consumers in `data-quality-tab.ts` and the seven flows in `data-quality-batch-ops.ts` thread this through to `familyGraph.reloadCache(modifiedFiles)`. Plus the parent-conflict resolution path in `people-tab.ts` (modifies child + claimant files) now passes its modified set explicitly.

**Fix: `OrganizationService.reloadCache` and `UniverseService.reloadCache` now wait for cache refresh after writes** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)):
- Pre-fix, both services performed `vault.create` / `processFrontMatter` and immediately called `reloadCache()` synchronously. The reload's `loadOrganizationCache()` / `loadUniverseCache()` walks every markdown file calling `metadataCache.getFileCache(file)` — for the just-written file, the cache could still be empty, silently dropping the new entry. User-visible symptom: a freshly created organization or universe could be missing from dropdowns and pickers until the next manual reload.
- Both services now use `reloadCache(modifiedFiles?: TFile[])` with the same `Promise.all(waitForCacheRefresh)` shape as FamilyGraph. Three callers updated per service: `createOrganization` / `updateOrganization`; `createUniverse` / `updateUniverse` / `cascadeUniverseRename`. The cascade case is the most exposed — pre-fix, N `processFrontMatter` writes followed by a single `reloadCache()` could leave all N entries showing the old universe value in the cache; post-fix, the reload waits for each touched file's `metadataCache.changed` event.

**Fix: `PlaceGraphService.reloadCache` signature change with three post-write callers updated** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547)):
- Same `reloadCache(modifiedFiles?)` async signature as the other three services. Of the ~15 caller sites across the codebase, three were post-write flows that needed the file list passed through:
  - `create-missing-places-modal.ts`: the auto-link flow creates N place notes via `createPlaceNote` then reloads to pick them up for the place-reference-rewrite pass. Capturing the returned TFiles into a `createdFiles: TFile[]` array threads through to the reload.
  - `cleanup-wizard-modal.ts:3168-3176`: the parent-place hierarchy creation loop creates a place, reads it back via `getPlaceByCrId(newCrId)`, and uses the returned node to seed the next iteration's parent. Pre-fix, the read could see an empty cache entry until Obsidian caught up.
  - `enrich-place-hierarchy-modal.ts:629-641`: same shape as the cleanup-wizard parent-place loop.
- The other ~12 caller sites are refresh-driven (fresh service → reload → read with no recent write) and continue to work without changes — they pass no `modifiedFiles` and skip the wait.

**Architectural decision: external-edit invalidation deferred to 1.x** ([#547](https://github.com/banisterious/obsidian-charted-roots/issues/547) Out of Scope):
- The cache-race audit had two halves. The shipped half (write→read race) had a clear, single-pattern fix. The deferred half (external-edit invalidation via per-service `metadataCache.changed` subscription, the shape that [#519](https://github.com/banisterious/obsidian-charted-roots/issues/519) applied to `EventService` / `SourceService` / `ProofSummaryService`) requires service-lifetime redesign because each of the four services in this audit is instantiated on-demand in many UI paths.
- Attaching long-lived listeners means either hoisting to plugin-singletons (the path #519 took for `ProofSummaryService`) or threading lifecycle management (`registerEvent`, `offref` on disposal) through every consumer. That's a separate scoped change rather than a continuation of this audit. #547 stays open as the tracking surface.

**Testing:** Suite total **739** (was 730 at v0.22.26), 58 suites. +4 helper unit tests in `tests/cache-utils.test.ts`, +5 integration tests in `tests/services-reload-cache-race.test.ts` (one per service plus one for the no-args refresh path on FamilyGraphService). Mock surface in `tests/mocks/obsidian.ts` extended with `Modal`, `Setting`, `PluginSettingTab`, `TextComponent`, `AbstractInputSuggest`, `setIcon` stubs plus a default empty `resolvedLinks` map — needed so service tests that transitively pull `settings.ts` can load in the test runtime.

**Reporters:** N/A — preventative work.

**Stability-window impact:** no reset — this is the fifth patch in the v0.22.22-anchored window (after v0.22.23, v0.22.24, v0.22.25, v0.22.26). All medium/low priority; none reset. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.26 Round-Up: RelationshipQueryService and the Adopted/Step Children Coverage Sweep (v0.22.26)

A structural patch built around [#545](https://github.com/banisterious/obsidian-charted-roots/issues/545) (Canvas Family Tree silently dropping adopted children when generated from any ancestor of the adoptive parent) and the architectural pattern it surfaced. Five user-facing fixes ship behind one consolidation: a new `RelationshipQueryService` ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)) that unifies how every consumer walks the family-relationship graph. Pre-#546, each renderer / report / exporter that needed children or parents reimplemented its own walk over `PersonNode` arrays — which meant new relationship types (adopted children in [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) / [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526), gender-neutral parents earlier still) had to be threaded through every consumer independently, with gaps surfacing as user-reported bugs months later. Two of the shipped fixes (family-timeline silent drop, GEDCOM-X gender-neutral parent omission) were latent gaps the inventory surfaced — pre-#546 they'd have remained invisible until a user happened to hit the exact frontmatter configuration.

**Fix: Canvas Family Tree now renders adopted children when generated from any ancestor of the adoptive parent** ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545)):
- @DigitalDreamn reproduced the bug by generating Marie or Ben's Canvas Family Tree (or a tree from Marie's father — any ancestor of an adoptive parent) and finding that Galen Marek (her adopted child) and his bio parents never appeared. Same bug shape regardless of root.
- Root cause was three-layered. `buildDescendantTree` in `src/core/family-graph.ts:967-980` was emitting an adoptive-parent edge but never adding the adopted child to the tree's `nodes` map. `buildFullTree` only walked `adoptedChildCrIds` from the child's side via the reverse `adoptive_X` field, so an adopted child unreachable through bio parents never entered the tree from the adoptive parent's full-tree mode either. Family-chart layout's fallback positioning loop in `src/core/family-chart-layout.ts:133-167` only checked `fatherCrId` / `motherCrId`, so even if an adopted child made it into the tree's nodes map, the layout engine couldn't position them when their bio parents weren't in the rendered subset.
- The fix is three-part. `buildDescendantTree` now adds adopted children to the nodes map alongside the relationship edge; `buildFullTree` now walks `adoptedChildCrIds` and `stepchildrenCrIds` from the parent's side; family-chart layout's Strategy 3 fallback now considers `adoptiveFatherCrId`, `adoptiveMotherCrId`, `adoptiveParentCrIds`, `stepfatherCrIds`, and `stepmotherCrIds` in addition to bio parents.
- 11 hand-crafted regression tests in `tests/family-graph-tree-builders.test.ts` cover both this and the step-parent edge fix below, with explicit golden-output assertions for the bug shapes (Galen-descendant, Galen-full-tree, Shmi/Owen step-ordering, Anakin/Cliegg working-case regression guard).

**Fix: Step-parent edges now emit regardless of BFS visit order** ([#545](https://github.com/banisterious/obsidian-charted-roots/issues/545) thread):
- In the same investigation, @DigitalDreamn flagged that Shmi (Anakin's bio mother, Owen's stepmother) wasn't connected to Owen via a step-parent line in Anakin's full Canvas tree, even though both Shmi declared `step_child: [[Owen]]` and Owen declared `stepmother: [[Shmi]]`. Anakin↔Cliegg worked but Shmi↔Owen didn't.
- Root cause: `buildFullTree`'s step-parent and adoptive-parent branches used `!visited.has(stepX)` as a single guard for both cycle detection AND edge emission. When Shmi was reached via Anakin's bio-mother walk first (visited), then Owen's processing tried to emit the step-parent edge from Shmi to Owen, the visited check blocked the edge entirely. Anakin↔Cliegg worked only because Cliegg happened to be reached via Anakin's stepfather walk first — pure ordering luck.
- The fix decouples edge emission from cycle-checking: edges emit unconditionally with a separate dedup against existing edges, while the visited set continues to gate whether the parent is queued for further BFS processing. Same decoupling applied to `buildAncestorTree`'s step-parent and adoptive-parent branches.

**Fix: Family timelines now include adopted and step children** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546) inventory):
- The family-timeline view (badge in People Tab rows, modal in Control Center) was iterating `focalPerson.childrenCrIds` only — silently dropping adopted and step children from the focal person's family-member list. A focal person whose only children were adopted would see a family timeline showing just self and spouse, with no indication their adopted children had been omitted. Symmetric for the step-blended case.
- Both the events-collection walk in `renderFamilyTimeline` and the legend-population walk in `getFamilyTimelineSummary` now route through `RelationshipQueryService.getChildren({ include: 'all' })`. The same fix corrects an undercount in the badge's displayed `memberCount` for blended families — `getFamilyTimelineSummary` was iterating `childrenCrIds.length` directly, so the People Tab badge tooltip ("Family: N events, M members") undercounted M by the number of non-bio children.

**Fix: GEDCOM-X export now includes gender-neutral parent relationships** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546) inventory):
- The exporter walked `fatherCrId`, `motherCrId`, gender-specific `stepfather` / `stepmother` arrays, and gender-specific adoptive parents — but never `parentCrIds` (gender-neutral bio) or `adoptiveParentCrIds` (gender-neutral adoptive). Persons declaring their parents via `parents: [[X]]` rather than `father:` / `mother:` had their parent relationships silently omitted from GEDCOM-X output.
- Consolidating the seven previous parent-walking branches in `gedcomx-exporter.ts` into one `getParents({ include: 'all' })` call closed both gaps as a side effect of the migration, with the `kind` discriminator on returned items driving the GEDCOM-X fact tag (`AdoptiveParent`, `StepParent`, or no fact for bio).

**Architectural: `RelationshipQueryService` introduction** ([#546](https://github.com/banisterious/obsidian-charted-roots/issues/546)):
- The new service in `src/core/relationship-query-service.ts` exposes `getChildren` / `getParents` / `getSiblings` / `getSpouses` / `walkDescendants` / `walkAncestors` with an explicit `include` parameter (`'all' | 'bio' | 'adopted' | 'step'` for children / siblings; `'all' | 'bio' | 'adoptive' | 'step'` for parents). No default — every caller declares the variants it wants, surfacing what was previously incidental about each call site. Returned items carry a `kind` discriminator (`'bio' | 'adopted' | 'step'` or `'bio' | 'adoptive' | 'step'`) so consumers can style by relationship type without re-deriving from source.
- `walkDescendants` and `walkAncestors` stop at adopted/adoptive/step boundaries by default — preserves the existing convention that adopted children carry their own family line and shouldn't bleed into a strict descendant traversal. Consumers opt in via `followAdopted` / `followAdoptive` / `followStep` flags.
- Fourteen consumer files migrated: `family-graph.ts`'s three tree-builders, family-chart-layout's fallback positioning, five report generators (individual-summary, register, descendant-chart, family-group-sheet, collection-overview), visual-tree-service's descendant walk, lineage-tracking, duplicate-detection, the dynamic-content relationships-renderer (children + siblings), relationship-calculator's BFS, gedcomx-exporter, family-timeline, and source-summary-generator.
- The standalone `sibling-walker` helper module (added in #417 / extended in #525 / #526) retired entirely; its public API is fully covered by `getSiblings`. 35 service unit tests in `tests/relationship-query-service.test.ts` cover every API method, every `include` variant, and edge cases (orphans, cycles, dedupe, max-generations).
- Some sites still pending migration (canvas-split, hourglass-layout, timeline-layout, reference-numbering, map-view, book-builder, parts of family-chart-view, parts of profile-view's relationships section, data-quality's orphan-reference detection) are tracked under #546's checklist for follow-up — none represent user-visible bugs, just architectural-consistency cleanup.

**Testing:** Suite total **730** (was 706 at v0.22.25), 56 suites. +35 service unit tests, +11 tree-builder regression tests, –22 retired with the `sibling-walker` module. Net +24 across the migration.

**Reporters:** @DigitalDreamn for [#545](https://github.com/banisterious/obsidian-charted-roots/issues/545) and the step-parent edge case, which surfaced the architectural pattern that drove the rest of this release.

**Stability-window impact:** no reset — all five user-facing fixes are `bug` (medium-priority); none reset the gate. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28). Four patches in the new window now (v0.22.23/v0.22.24/v0.22.25/v0.22.26).

---

### v0.22.25 Round-Up: Modal Display Parsing, Membership Writer Cleanup, and Cache-Timing Follow-Up (v0.22.25)

A focused three-fix patch closing the remaining loose ends from @DigitalDreamn's [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) verification cluster — surfaced and shipped same-day as v0.22.24. Each is a different symptom of the same theme: code paths that should have gone through the canonical writer/parser helpers but didn't, surfacing as inconsistencies between what users see and what's stored. Cycle also added a property-based fuzz test for `createSmartWikilink` between releases as defensive coverage so the next variant in the writer-input-contract cluster gets caught proactively rather than user-reported.

**Fix: Edit Person modal now parses wikilinks for display in relationship and place fields** ([#543](https://github.com/banisterious/obsidian-charted-roots/issues/543)):
- The "Linked to:" labels and read-only input fields in Edit Person were displaying the raw inner content of wikilinks — `Charted Roots/People/Errol Naberrie|Errol Naberrie` instead of just `Errol Naberrie` — for any relationship or place field whose underlying frontmatter stored a piped or path-form wikilink. Surfaced after [v0.22.24](#v02224-round-up-wikilink-writer-hardening-custom-relationships-in-all-mode-and-org-membership-sync-v02224)'s [#540](https://github.com/banisterious/obsidian-charted-roots/issues/540) path-disambiguation landed: the canonical `[[path|basename]]` form is correct on disk but the modal didn't parse it for display.
- New `extractDisplayLabel` helper in `src/utils/wikilink-resolver.ts` mirrors the writer-side stem-collapse pattern — strip brackets, then collapse pipe-form (`basename|alias` → `alias`) and path-form (`path/to/file` → `file`). Applied at the relationship and place field display sites in `src/ui/create-person-modal.ts`.
- Underlying `fieldData.name` stays raw so the writer's `createSmartWikilink` re-canonicalizes on save — display-layer fix only, no data-layer changes.
- 20 new tests in `tests/extract-display-label.test.ts` covering bare strings, bracketed wikilinks, residue shapes from earlier bug eras (#537/#538), and round-trip idempotency.

**Fix: Org wikilink writes from the membership flow now route through `createSmartWikilink`** ([#542](https://github.com/banisterious/obsidian-charted-roots/issues/542)):
- `addMembership` in `src/organizations/services/membership-service.ts` was pushing `membership.org` into the `membership_orgs` array verbatim — bypassing the input-shape normalization (#537/#538) and basename-ambiguity disambiguation (#540) that every other relationship-field write got. Path-form residue from earlier duplicate-basename eras persisted indefinitely; new entries didn't disambiguate at write time even when basename collisions existed in the vault.
- The fix routes the new entry through `createSmartWikilink` (now exported from `src/organizations/services/organization-service.ts` so the membership service can call it). Also adds a full-array rewrite pass on every save so existing entries normalize alongside the new one — historical residue heals on the next add or remove instead of waiting for that specific entry to be touched. Same pattern applied to `removeMembership` for the surviving entries.
- Reported by @DigitalDreamn during her #538 verification sweep, where her organization frontmatter still showed `[[Charted Roots/Organizations/Vessari Order|Vessari Order]]` after the v0.22.24 self-heal cleaned up every other relationship field.

**Fix: Org-side member sync now waits for the metadata cache to refresh before reading person notes** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) follow-up):
- The v0.22.24 [#541](https://github.com/banisterious/obsidian-charted-roots/issues/541) fix triggered `syncMembersToOrg` from person-side `addMembership` / `removeMembership` paths, but the sync re-read the metadata cache to assemble the member list — and Obsidian's `processFrontMatter` updates the file synchronously while the cache update fires asynchronously via the file watcher event. Result: `syncMembersToOrg` ran on stale cache and wrote a member list "trailing one update behind" — adding person N propagated person N-1 to the org's frontmatter.
- @DigitalDreamn caught this with a multi-Jedi test: adding Quinlon Vos to the Jedi Order wrote Obi-Wan to the org's frontmatter; adding Nejaa Halcyon next wrote Quinlon. Always trailing one update behind.
- New `waitForCacheRefresh` helper in `MembershipService` listens for the next `metadataCache.changed` event for the modified file (with a 500ms timeout fallback), then triggers the sync. So the cache reflects the just-written change by the time the member list is assembled. Called from both `addMembership` and `removeMembership`.
- Filed as a refinement under the existing #541 issue rather than a new filing, since the original fix's shape is correct — just needed the missing synchronization step.

**Defensive infrastructure: Property-based fuzz test for `createSmartWikilink`**:
- Three writer-input-contract bugs surfaced in v0.22.22 / v0.22.24 ([#537](https://github.com/banisterious/obsidian-charted-roots/issues/537), [#538](https://github.com/banisterious/obsidian-charted-roots/issues/538), [#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)), each one a different input shape the helper didn't handle correctly. Each fix added a new transformation step (pipe-strip → slash-strip → ambiguity disambiguation), and each one was reactive — the bug surfaced first, the test was added second.
- The fuzz suite (added between v0.22.24 and v0.22.25) exercises the writer against a corpus of every input shape we've seen in the wild plus the canonical clean cases, asserting parseable-output shape and round-trip idempotency: `f(loaderView(f(x))) === f(x)`. Tested under both unique-vault and ambiguous-vault setups (the latter for #540's path-form output assertion).
- 15 new test cases. When the next variant surfaces, the fix flow becomes "add the new shape to the corpus + the existing test catches it" — the test file is now the de facto contract for the writer's input handling.

**Testing:** Suite total **706** (was 671 at v0.22.24), 55 suites. +6 for #538, +4 for #540 (both at v0.22.24), +15 for the fuzz suite, +20 for `extractDisplayLabel`. #539 + #541/#542/#543 fixes were renderer / service-with-I/O / UI changes verified visually in dev-vault per the codebase convention.

**Reporters:** @DigitalDreamn for all three.

**Stability-window impact:** no reset — all three fixes are `low-priority` or refinements (#541-followup is shipped under the existing released-testing label). Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28). Three patches in the new window now (v0.22.23/v0.22.24/v0.22.25).

---

### v0.22.24 Round-Up: Wikilink Writer Hardening, Custom Relationships in All-Mode, and Org Membership Sync (v0.22.24)

A four-fix batch closing relationship-correctness gaps surfaced during @DigitalDreamn's verification sweep of the v0.22.22 [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) fix. Two fixes extend the v0.22.22 wikilink-writer self-heal pattern to additional input shapes; one closes a renderer gap where the Dynamic Relationship Block's `type: all` mode wasn't honoring its wiki contract; one closes a bidirectional-sync gap where person-side membership changes left the org's frontmatter stale.

**Fix: File paths in wikilink alias slot now self-heal on save** ([#538](https://github.com/banisterious/obsidian-charted-roots/issues/538)):
- Some on-disk wikilinks in person-note frontmatter had a file path in the alias slot — e.g., `[[Errol Naberrie|Charted Roots/People/Errol Naberrie]]` instead of the canonical `[[Errol Naberrie]]`. Saving via Edit Person didn't clean them up because the v0.22.22 [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537) self-heal only handled pipe-stem accumulation (`[[X|X|X]]` → `[[X]]`), not path-form input.
- The path-form residue typically arose from periods when a vault contained duplicate-basename files outside the plugin's folder structure: Obsidian's link resolver writes path-disambiguated wikilinks when a basename is ambiguous, those path forms got captured into other notes' frontmatter, and the loader→writer round-trip then preserved the path in the alias slot indefinitely.
- The fix extends the existing stem-collapse logic with a slash-strip step in `createSmartWikilink` (`src/core/person-note-writer.ts:65-71`): after the pipe-strip, any remaining path collapses to its trailing segment (the basename). Affected vaults self-heal on the next Edit Person save, just like #537.
- Same fix applied to all four sibling copies of the helper (person / place / organization / relationship-manager). 6 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering bare path-form, inverted alias-form, deeply-nested paths, and round-trip idempotency.

**Fix: Wikilink writer disambiguates when basename is shared with another vault file** ([#540](https://github.com/banisterious/obsidian-charted-roots/issues/540)):
- When the plugin emitted `[[basename]]` for a relationship target, Obsidian's link resolver picked a winner without regard to which folder the plugin intended. In vaults containing duplicate basenames — e.g., a plugin-managed person note `Charted Roots/People/Plo Koon.md` AND an unrelated note `Story Arcs/Plo Koon.md` — the resolver could land on the non-CR sibling, producing cross-folder Graph view connections, click-through navigation to the wrong note, and silent rewiring of the wikilink to point at the non-CR file on subsequent saves.
- @DigitalDreamn caught this in her vault by routinely checking Obsidian's Graph view to verify connections — the "grabby" behavior on her newly-created Charted Roots Plo Koon file linking out to her original story-arc Plo Koon was the symptom that surfaced the gap.
- The fix uses a new `getCanonicalLinktext` helper in `src/utils/wikilink-resolver.ts` that detects basename ambiguity at write time. When the cr_id-resolved file's basename collides with another vault file, the writer emits the path-form target with the basename as alias (`[[Charted Roots/People/Plo Koon|Plo Koon]]`) so the resolver lands unambiguously on the intended file while the display text stays clean.
- Same fix applied to all four sibling copies. 4 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering ambiguous + unique cases, name-vs-basename divergence under ambiguity, and round-trip idempotency once disambiguated.

**Fix: Dynamic Relationship Block's `type: all` mode now displays custom-typed relationships** ([#539](https://github.com/banisterious/obsidian-charted-roots/issues/539)):
- The wiki contract for `type: all` was "everything in extended, plus custom-typed relationships declared in the person's relationships frontmatter array (mentor, godparent, ally, etc.)." In practice the renderer ignored the custom-relationships array entirely — only the family-graph-derived sections (parents, spouse, children, siblings) ever rendered, regardless of mode.
- @DigitalDreamn caught it by configuring Plo Koon as Ahsoka's mentor (using the pre-built `mentor` custom type) and observing he didn't appear in the dynamic block at all — only Ahsoka's parents showed up.
- The fix in `src/dynamic-content/renderers/relationships-renderer.ts` fetches the person's relationships via `RelationshipService.getRelationshipsForPerson` plus `getInverseRelationships` (so symmetric / inverse-defined edges from the partner's note are picked up), filters to non-family-mapped types using the same `isOtherTypedRelationship` predicate the Profile View's Other subsection uses, deduplicates symmetric pairs by `type.id + targetCrId`, and groups entries by relationship type name. Each custom type renders as its own section after Siblings, preserving declaration order.
- Family-graph-derived sections are unchanged. The same predicate is shared with the Profile View's Other subsection so the two surfaces stay consistent.

**Fix: Adding a membership from Edit Person now syncs to the organization's `members` frontmatter** ([#541](https://github.com/banisterious/obsidian-charted-roots/issues/541)):
- The membership service's `syncMembersToOrg` (which keeps an organization's `members` / `members_id` frontmatter in sync with the person-side `org_membership_*` properties of its members) was only triggered from the org-side "Manage Members" modal. Adding or removing a membership through the Person's Edit Person → Add Membership flow updated the person's frontmatter but didn't propagate the change back to the org.
- Mostly invisible because the Org Profile View's Members section and the dynamic Members block both assemble member lists by scanning person notes, so the new member appeared correctly in those views — the discrepancy surfaced only in Obsidian Bases queries that read the org's own frontmatter directly.
- The fix calls a new `syncMembersToOrgIfResolvable` helper at the end of both `addMembership` and `removeMembership`, which best-effort resolves the org's TFile from the cr_id and triggers the existing sync. Skips silently when the org_id doesn't resolve.
- Reported by @DigitalDreamn while debugging the wikilink-grabby behavior in #538 follow-up — she noticed a newly-added member appeared in the dynamic block + profile pane but not in the org's frontmatter.

**Testing:** Suite total **671** (was 661 at v0.22.23), 54 suites. +10 new tests across #538 (6) and #540 (4). #539 and #541 verified visually in dev-vault per the codebase convention for renderer + service-with-I/O changes.

**Reporters:** @DigitalDreamn for all four.

**Stability-window impact:** no reset — all four fixes are `medium-priority` or `low-priority`, none reset the gate. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.23 Hotfix: Marriage-Detail Symmetric Write (v0.22.23)

A focused single-fix follow-up to v0.22.22, shipped same day. Linking a new spouse via Edit Person and adding marriage details (date / location / status / divorce date) in the same save was writing the indexed `spouseN_*` companion fields to the editing person's frontmatter but leaving the spouse's frontmatter with only the flat `spouse:` link — no marriage details mirrored across. Reported by @DigitalDreamn while debugging the broader cascade behavior that became #537.

**Fix: Marriage details now write symmetrically when linking a new spouse via Edit Person** ([#534](https://github.com/banisterious/obsidian-charted-roots/issues/534)):
- The bidirectional linker's `syncSpouse` ([src/core/bidirectional-linker.ts:850](https://github.com/banisterious/obsidian-charted-roots/blob/main/src/core/bidirectional-linker.ts#L850)) correctly preserved the target's existing format on a new link (per [#420](https://github.com/banisterious/obsidian-charted-roots/issues/420) Gap B's fix from v0.22.0). But for a target with no existing spouse data, `detectSpouseTargetFormat` picked flat, the helper wrote a flat `spouse:` entry, and `targetIndex` stayed null. The marriage-detail mirror step at line 1039 (`if (marriageDetails && targetIndex !== null)`) then short-circuited — flat format genuinely doesn't have a `spouseN_*` companion-field namespace, so the original author treated this as by-design.
- The fix forces indexed format on the target whenever the source provides marriage details, regardless of the target's current shape: empty targets get `spouse1` + `spouse1_id` + `spouse1_marriage_*`, and targets with existing flat data for OTHER spouses get a new indexed slot alongside the flat data (mixed flat + indexed state, which `detectSpouseTargetFormat` already handles by recognizing 'indexed' on the next sync).
- New `findNextOpenSpouseSlot` helper extracted to `src/core/spouse-format-detector.ts` — exposes the next open `spouseN` slot uniformly so the linker can pick a slot regardless of whether the detector picked flat or indexed.
- 10 new tests in `tests/spouse-format-detector.test.ts` covering empty / flat-only / gap-filling / partial-id / all-full slot allocation. Existing `promoteFlatSpouseToIndexed` path for the alreadyLinked-with-same-spouse case is unchanged.

**Testing:** Suite total **661** (was 651 at v0.22.22), 54 suites.

**Reporters:** @DigitalDreamn.

**Stability-window impact:** no reset — [#534](https://github.com/banisterious/obsidian-charted-roots/issues/534) is `medium-priority`, not critical/data-loss. Window remains anchored to v0.22.22 (2026-05-07 → ~2026-05-28).

---

### v0.22.22 Round-Up: Wikilink Cascade Self-Heal, Profile View Symmetry, and Media Captions (v0.22.22)

Five items, one of them resetting the stability window. The headline is a `critical` + `data-loss` + `regression` fix — a wikilink alias-accumulation cascade where repeated saves added another `|alias` segment to existing wikilinks until they became unparseable, at which point the bidirectional linker treated the slot as broken and silently dropped it, propagating the loss outward through related notes (children scrubbed from parents, parents scrubbed from kids). The bug was a regression introduced in v0.22.17's [#510](https://github.com/banisterious/obsidian-charted-roots/issues/510) work (the `createSmartWikilink` helper was added) and broadened in v0.22.19's [#524](https://github.com/banisterious/obsidian-charted-roots/issues/524) extension (cr_id-based file lookup) — exactly the case the soak window's "no critical/data-loss filed during the window" gate is designed to catch. The fix is **idempotent under loader→writer round-trip and self-healing for already-corrupted vaults**: triple-pipe entries collapse back to canonical form on the next save through Edit Person, no manual repair needed.

Around #537, four enhancements rode along: a Person Profile Memberships section mirroring the Org Profile's Members section in the inverse direction, an Org Profile Members grouping/sorting refactor backed by a shared helper, per-image captions in the dynamic media gallery block, and a follow-up to v0.22.21's birth-date sort that extends to the Children section.

**Fix: Cascade saves no longer accumulate `|alias` segments on existing wikilinks until the entry is silently dropped** ([#537](https://github.com/banisterious/obsidian-charted-roots/issues/537), `critical` + `data-loss` + `regression`):
- `createSmartWikilink` was non-idempotent under the loader's stem form. The loader's `extractName` ([src/plugin/relationship-loader.ts:67](https://github.com/banisterious/obsidian-charted-roots/blob/main/src/plugin/relationship-loader.ts#L67)) deliberately preserves the inner content of `[[basename|alias]]` — including the pipe — so the resolver downstream can split on `|` to find the basename stem. Existing test at `tests/relationship-loader.test.ts:46-49` codifies this contract.
- The writer side then fed `'mildred-barrow|Mildred Barrow'` (or similar) into `createSmartWikilink`. Without recognizing the pipe, it compared the file's actual basename against the *piped* input, found them different, and wrapped with another pipe → `[[mildred-barrow|mildred-barrow|Mildred Barrow]]`. Each loader→writer round-trip added one segment. After 3+ pipes, the bidirectional linker couldn't parse the wikilink, treated the slot as broken, and removed it on the next pass.
- The accumulation pattern existed in any vault containing a person whose `name` differs from their filename basename. @DigitalDreamn's vault hit it on every save because of a duplicate-file state (a recovered original alongside a renamed current file, both carrying the same `cr_id`) which made `findFileByCrId` return ambiguous winners that triggered the basename-vs-alias path continuously, instead of needing a name-vs-basename person to seed it.
- Surfaced during diagnostic work that preceded [#534](https://github.com/banisterious/obsidian-charted-roots/issues/534). Once the corruption pattern was documented (Save 1: `[[Errol Naberrie]]` → Save 2: `[[Errol Naberrie|Errol Naberrie]]` → Save 3: `[[Errol Naberrie|Errol Naberrie|Errol Naberrie]]` → Save 4: entry removed), the trace through `extractName` → `createSmartWikilink` was direct.
- Fix: collapse `basename|alias` stem input to the trailing alias before the basename comparison, making the helper idempotent under round-trip. Already-corrupted vaults self-heal on the next save: triple-pipe entries collapse back to canonical `[[basename|alias]]` or bare `[[name]]` form. Same fix applied to all four sibling copies of the helper (`person-note-writer.ts`, `place-note-writer.ts`, `organization-service.ts`, `relationship-manager.ts`).
- 5 new tests in `tests/person-note-writer-smart-wikilink.test.ts` covering idempotency, triple-pipe self-heal in both basename-matches and basename-differs scenarios, and trailing-whitespace robustness.

**Feature: Person Profile Memberships section** ([#536](https://github.com/banisterious/obsidian-charted-roots/issues/536)):
- New section between Relationships and Events on a person's profile when they have at least one organization membership (hidden otherwise). Mirrors the Org Profile View's Members section in the inverse direction — closes a long-standing UX symmetry gap where the org view showed members but the person view didn't show what organizations they belonged to.
- Each row shows the role label, organization link (clickable for entity navigation), date range, a "Current" badge for ongoing memberships, and per-membership notes on a separate line beneath in italic muted text — mirroring the layout of the Other Relationships subsection from v0.22.20's [#530](https://github.com/banisterious/obsidian-charted-roots/issues/530). Briefcase icon on the section header. Wired into `src/profile-view/profile-view.ts` between the Relationships and Events section calls; new `src/profile-view/sections/memberships-section.ts`.
- Reported by @doctorwodka.

**Refactor: Org Profile Members section grouped + sorted by role** ([#535](https://github.com/banisterious/obsidian-charted-roots/issues/535)):
- Previously the section rendered as a flat list with `member` array order — readable for small orgs but hard to parse once role distinctions mattered. Members now appear under uppercase role headings (e.g. `FOUNDER`, `BISHOP`) with members sorted by name within each group, and a generic "MEMBERS" heading covering anyone with no explicit role.
- Order rules match the existing dynamic Members block (`charted-roots-members`): the org's declared `roles` list pins a sequence at the top, remaining named roles fall through alphabetically, and the no-role group is always last.
- Shared logic extracted to `src/organizations/utils/group-members-by-role.ts` — pure helper consumed by both the dynamic Members block and the Org Profile section, so the two surfaces stay in sync. New abstraction worth remembering when extending member-display surfaces.
- 10 new tests in `tests/group-members-by-role.test.ts`. Reported by @doctorwodka.

**Feature: Per-image captions in the dynamic media gallery block** ([#523](https://github.com/banisterious/obsidian-charted-roots/issues/523)):
- Each thumbnail in the `charted-roots-media` block can now carry a short caption — useful for the deep-archive use case where many photos per person each benefit from a brief label like "1978 - Jon Aged 3" rather than a single long-form description in the note body.
- Captions render beneath the thumbnail in muted text, single-line truncated with full text on hover. Right-click any thumbnail for **Set caption** / **Edit caption** / **Remove caption** options, mirroring the existing crop-region affordance.
- Storage: flat `media_captions` parallel string array on the entity note's frontmatter, index-aligned with the `media:` array — same shape as the `<type>_notes` pattern from v0.22.20's [#530](https://github.com/banisterious/obsidian-charted-roots/issues/530), respecting the project's flat-YAML preference. Empty / missing slots are padded with empty strings to keep indices aligned, and the array reshuffles in lockstep when the user drags to reorder media.
- Frozen-gallery output (`❄️` button) preserves captions by injecting them into the wikilink alias slot (`![[wedding-1925.jpg|Wedding day, June 1925]]`), so the static markdown stays self-contained after the block is replaced.
- New `src/core/ui/caption-modal.ts` — single-text-input dialog parallel to `CropRegionModal`, reusable for any future per-image-metadata affordances. 8 new tests in `tests/media-captions.test.ts`. Reported by @xBlack-Dogx via discussion [#521](https://github.com/banisterious/obsidian-charted-roots/discussions/521).

**Fix: Children in the Dynamic Relationship Block now sorted by birth date** ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532) follow-up):
- The v0.22.21 sort applied to siblings only. The Children section in `src/dynamic-content/renderers/relationships-renderer.ts` still iterated `childrenCrIds`, then `adoptedChildCrIds`, then `stepchildrenCrIds` in array order, leaving adopted and step children appended at the end of the list regardless of birth date.
- Bio + adopted + step children are now merged and sorted using the same universe-aware `sortByBirthDate` helper that handles the siblings section, so the Children list reads chronologically regardless of frontmatter order or relationship-type source.
- Caught during v0.22.21 verification on Galen's adoptive parents' page (Galen sat below his younger bio siblings). Reported by @DigitalDreamn.

**Verification:** all five items verified in the dev-vault before pushing. The #537 self-heal was confirmed by repeatedly saving Edit Person on a person with name ≠ filename basename — the wikilink stays canonical under round-trip rather than accumulating pipes.

**Testing:** **651** tests passing across **54** suites (was 628 at v0.22.21). Delta: +10 in `tests/group-members-by-role.test.ts` (#535), +8 in `tests/media-captions.test.ts` (#523), +5 in `tests/person-note-writer-smart-wikilink.test.ts` (#537).

**Reporters:** @DigitalDreamn (#532 follow-up + #537), @doctorwodka (#535 + #536), @xBlack-Dogx (#523).

**Stability-window impact:** **window reset.** [#537](https://github.com/banisterious/obsidian-charted-roots/issues/537)'s `critical` + `data-loss` + `regression` flag triggers the gate per [VERSIONING.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/VERSIONING.md#when-100-ships) ("three weeks of BRAT testing with no new critical or data-loss issues filed"). New anchor: v0.22.22; new soak window 2026-05-07 → ~2026-05-28. The regression originated in v0.22.17 / v0.22.19 work — a window-internal regression, exactly the case the gate is designed to catch.

---

### v0.22.21 Round-Up: Dynamic Block Display Paths and Profile View Family-Custom Routing (v0.22.21)

Three bug fixes — all surfaced by the same reporter (@DigitalDreamn) while verifying v0.22.20, all tracing back to display paths that hadn't been updated for the data-shape change v0.22.20's [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) / [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) follow-up made: adopted children moved out of each parent's `childrenCrIds` and into the dedicated `adoptedChildCrIds` array, which fixed the Relationship Calculator's blood-relation labeling but left three rendering paths reading the wrong array. The v0.22.21 cycle taught those paths about `adoptedChildCrIds`, plus closed two unrelated display gaps that were exposed during the same verification pass: the Dynamic Relationship Block had never sorted siblings by birth date (pure YAML-order display, easy to miss when the array happened to be in birth order), and custom relationship types filed under the "Family" category fell into a routing dead zone in the Profile view (excluded from Other by category, never picked up by the bio-only Family subsection rendering).

**Fix: Adopted siblings now appear in the Dynamic Relationship Block and Dynamic Timeline Block on biological siblings' pages** ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531)):
- Direct cascade from v0.22.20's [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) / [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) follow-up. The dynamic Relationship Block's sibling walker (`findAdoptiveSiblingCrIds` in `src/dynamic-content/sibling-walker.ts`) and the Timeline Block's sibling-births collection in `src/dynamic-content/renderers/timeline-renderer.ts` both still read only from `childrenCrIds`, so adopted children silently dropped off bio-side household pages once they no longer lived in that array. From the adopted child's own page, the link still worked (the walk runs from the adopted child's adoptive parents and lands on the parents' bio kids in `childrenCrIds`), which produced an asymmetry: Galen sees his adoptive siblings, but those siblings don't see him.
- `src/dynamic-content/sibling-walker.ts` — added `gatherAdoptedSiblingsFromParents` helper. `findAdoptiveSiblingCrIds` now merges three sources: bio parents' `adoptedChildCrIds` (anyone adopted into self's bio household), adoptive parents' `childrenCrIds` (bio kids of adoptive parents — already worked), and adoptive parents' `adoptedChildCrIds` minus self (other adopted siblings).
- `src/dynamic-content/renderers/timeline-renderer.ts` — sibling-births walk extended to include adoptive parents and to gather from both `childrenCrIds` and `adoptedChildCrIds`. Step-sibling exclusion ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456)) preserved across the new sources.
- 6 new tests added to `tests/sibling-walker.test.ts` covering each of the three adoptive-sibling sources plus a merged-and-deduped scenario; the prior "Galen case" test was reshaped to match the post-#525/#526 family-graph data shape.

**Fix: Adopted children now appear under the Children section of the Dynamic Relationship Block on the adoptive parent's page** ([#531](https://github.com/banisterious/obsidian-charted-roots/issues/531) follow-up):
- Same root-cause shape as the sibling fix, surfaced by @DigitalDreamn during verification of the original [#531](https://github.com/banisterious/obsidian-charted-roots/issues/531) patch. The Children section in `src/dynamic-content/renderers/relationships-renderer.ts` iterated only `childrenCrIds`, which post-#525/#526 contains bio kids only, so adoptive parents saw an empty or partial Children list.
- Children section now also iterates `adoptedChildCrIds` and `stepchildrenCrIds`, with each non-bio source labeled "Adopted child" / "Stepchild" — mirroring the existing parents-side labels ("Adoptive father" / "Stepfather"). Same pattern used by the Profile view's Family subsection (#443).

**Fix: Siblings in the Dynamic Relationship Block are now sorted by birth date** ([#532](https://github.com/banisterious/obsidian-charted-roots/issues/532)):
- The block iterated each parent's `childrenCrIds` and pushed siblings in array order, with no sort step — display order followed whatever order children were listed in the parent's frontmatter `children:` array. Most families happened to appear correctly because users tend to list kids in birth order, but the moment a sibling was added later (or rearranged), the display would diverge from birth order while everywhere else looked fine. @DigitalDreamn caught this on her Wilkin family where Ben was listed before A in the parent's `children:` array, so every sibling's view of that family showed Ben (b. 54 BBY) before A (b. 56 BBY) — wrong direction in the Star Wars descending-era convention.
- `src/dynamic-content/renderers/relationships-renderer.ts` — added a `sortByBirthDate` private method that uses `dateService.getCanonicalYear(birthDate, universe)` for the comparison. Canonical-year normalization handles both Gregorian (ascending) and descending fictional eras (BBY, etc.) on the same scale, so oldest-first ordering reads correctly regardless of universe calendar. Persons without a parseable birth date sink to the end while preserving relative order; ties on the same year preserve original order (stable sort via decorate-sort-undecorate).
- Sort applies to bio + adoptive siblings merged together — adoptive entries get the "Adoptive sibling" label, bio entries are unlabeled, but both intermix in birth order rather than being grouped by source. Children-section sort was deliberately left as YAML-order for now (the bug report was about siblings only); can be added in a follow-up if requested.

**Fix: Custom relationship types filed under the Family category now render in the Profile view** ([#533](https://github.com/banisterious/obsidian-charted-roots/issues/533)):
- A custom type configured with `category: family` and no `familyGraphMapping` (e.g. a user-defined `twin`) was silently dropped from the Profile pane. The data persisted to frontmatter correctly (#530 fix verified), but `isOtherRelationship` short-circuited any `category === 'family'` row out of the Other subsection while the Family subsection only knew about PersonNode-derived bio fields (Father / Mother / Spouse / Child / etc.) and had no path to surface custom-typed family rows. Surfaced by @DigitalDreamn during verification of the #530 notes-display work — `vessari_master` (non-family category) rendered correctly with its note, `twin` (Family category) didn't render at all.
- `src/profile-view/sections/relationships-section.ts` — added `isFamilyCustomRelationship` helper (`category === 'family'` AND not built-in-with-mapping) and a `renderFamilyCustomGroup` function that mirrors the Other-row layout (each entry wrapped in `cr-profile__rel-item` so per-relationship notes from #530 sit beneath the row). `renderRelationshipsSection` now computes `familyCustoms` and threads them into `renderFamilySubsection`, which appends them after the bio Children group, grouped by type name. The relationship count includes family-customs so the section unhides when the only relationships are custom-typed.
- No CSS changes — the `cr-profile__rel-notes` class added in v0.22.20 already styles the notes line correctly.

**Verification (dev-vault Person A-G fixtures, plus a `twin` relationship added between Person A and Person F):** all three fixes verified in the dev-vault before pushing. Person G (bio child of Person B) now sees Person A and Person F as adoptive siblings. Person A and Person F now see each other as twins via the Family subsection's new TWIN group, with the per-relationship note "Person A is the elder twin of Person F" rendered in italic beneath the row.

**Testing:** 6 new tests in `tests/sibling-walker.test.ts`. Suite total 628 (was 622 at start of cycle), 52 suites.

**Reporters:** @DigitalDreamn for all three issues.

**Stability-window impact:** no reset — all three changes are non-data-loss. Window continues from 0.22.17's anchor: 2026-05-01 → ~2026-05-22. Four patches in.

---

### v0.22.20 Round-Up: Mobile Pre-Release Verification and Two Follow-Up Fixes from v0.22.19 (v0.22.20)

Three bug fixes — two of them follow-ups to v0.22.19 attempts that didn't actually resolve their underlying bugs, plus one new bug surfaced by the same reporter (@DigitalDreamn) while testing the v0.22.19 release. The cycle established a new pre-release device-verification step for any `mobile-*`-labeled fix: install on the actual platform via direct file copy or BRAT and verify before tagging, rather than shipping based on best-effort diagnosis. The `chrome://inspect` workflow (Android Obsidian's WebView from desktop Chrome's remote inspector) was set up during this cycle and paid off on its first use — the v0.22.19 [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) attempt looked correct from desktop typecheck + tests + DOM inspection, but the rendered layout was still wrong because of a flexbox subtlety only visible in the box-model overlay on the actual device.

**Fix: Map view filter row clipping on Android phones — actually fixed this time** ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)):
- `styles/map-view.css` — replaced `width: 100%` with `flex: 0 0 100%` (don't grow, don't shrink, base 100%) in both the `@media (max-width: 768px)` block and the `.cr-map-view-phone` class-based block added in v0.22.19. The 0.22.19 attempt had set `width: 100%` on the assumption the media query wasn't firing on Obsidian Mobile; on-device DevTools showed the class WAS being applied AND `width: 100%` WAS in computed styles, but the bounding-box overlay read `div.cr-map-toolbar-center 75 × 177` — actual rendered width 75px against the right edge with content stacking vertically.
- Root cause: the base `.cr-map-toolbar-center { flex: 1 }` declaration sets `flex-basis: 0%` (per the `flex` shorthand). In CSS flexbox, `flex-basis` overrides `width` for layout sizing when it's anything other than `auto`. So `width: 100%` was a no-op for layout — the section was being sized by `flex-basis: 0` plus remaining space. Both the existing media query and the v0.22.19 class-based fallback had this bug; the media query never actually worked on narrow desktop windows either, but no one had been testing narrow-desktop layouts.
- Verified on the Android device pre-commit by deploying the build and re-inspecting via `chrome://inspect`. Bounding box now spans the full toolbar width and the filter row sits on its own line below the toolbar icons. Reported by @banisterious.

**Fix: Relationship Calculator parent → step/adopted child direction now produces correct labels** ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) follow-up):
- The v0.22.19 fix only resolved the child → parent direction. After the release, @DigitalDreamn reported that going parent → child (e.g., Ben → Galen as adoptive father, Cliegg → Anakin as stepparent) still returned "Child" with `Blood: Yes`, and Owen still registered as Anakin's bio sibling. Root cause was a separate bug in custom-relationship-array parsing: the `step_child` and `adopted_child` relationship type definitions had `familyGraphMapping: 'child'`, so when a parent's frontmatter contained a flat `adopted_child:` or `step_child:` array (which the modal's bidirectional propagator writes when the inverse relationship is added), `parseRelationshipsArrayForFamilyGraph` pushed those entries into bio `childrenCrIds`. The relationship calculator's BFS then found the children via the bio edge first and labeled the path as a blood relation, ignoring the dedicated `adoptedChildCrIds` / `stepchildrenCrIds` arrays the family graph also populates.
- `src/relationships/types/relationship-types.ts` — extended `FamilyGraphMapping` union with `'stepchild'` and `'adopted_child'`.
- `src/relationships/constants/default-relationship-types.ts` — `step_child.familyGraphMapping` → `'stepchild'`, `adopted_child.familyGraphMapping` → `'adopted_child'`.
- `src/core/family-graph.ts` — added `stepchildrenCrIds` and `adoptedChildCrIds` to the `parseRelationshipsArrayForFamilyGraph` result type, added `case 'stepchild'` and `case 'adopted_child'` to `addToFamilyGraphResult`, and added merge loops in `extractPersonNode` for both arrays alongside the existing `childrenCrIds` merge.
- 4 new tests in `tests/family-graph-step-adopted-child-mapping.test.ts` covering `adopted_child` → `adoptedChildCrIds`, `step_child` → `stepchildrenCrIds`, bio child regression guard via `children_id`, and a mixed bio + adopted scenario. Verified end-to-end with the Person A-G dev-vault fixtures: parent → adopted child reads "Adopted child" with `Blood: No`, parent → stepchild reads "Stepchild" with `Blood: No`, bio paths and unrelated-pair detection unchanged. Reported by @DigitalDreamn.

**Fix: Notes from the Add Custom Relationship modal are now persisted** ([#530](https://github.com/banisterious/obsidian-charted-roots/issues/530), via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529)):
- The "Notes (optional)" textarea in the Add Custom Relationship modal had been capturing user input into a private `this.notes` field, but the captured value was never referenced by any of the writer paths (`writeAdoptiveParentProperties`, `writeRelationshipProperties`, the `RelationshipManager` family-method calls). Notes silently fell out of scope when the modal closed. The wiki referenced the notes element in the manual-frontmatter sections and the Best Practices section encouraged adding notes — both promised something the modal wasn't delivering.
- Initial implementation used the nested `relationships:` array format documented in the legacy wiki examples. User caught this during review — nested objects in YAML frontmatter aren't reliably supported by Obsidian's frontmatter editor, Bases, and other tooling. The plugin's design preference is flat YAML throughout (separate `cr_type: event` notes, 10 flat `sourced_*` arrays for fact-level citations). Reverted to the flat-YAML pattern.
- `src/relationships/relationship-property-writer.ts` — `addFlatRelationship` now accepts an optional `{ notes? }` parameter and writes a parallel `<type>_notes` flat array alongside the existing `<type>` and `<type>_id` arrays. Empty/missing slots are padded with empty strings to keep indices aligned with the targets array. Matches the existing `<type>_from` / `<type>_to` parallel-array convention already read by `parseFlatRelationships`.
- `src/relationships/services/relationship-service.ts` — `parseFlatRelationships` now reads `<type>_notes` and populates `ParsedRelationship.notes`.
- `src/ui/add-relationship-modal.ts` — `writeRelationshipProperties` and `writeReciprocalRelationshipProperties` (for symmetric custom types) pass `this.notes.trim() || undefined` through to `addFlatRelationship`.
- `src/profile-view/sections/relationships-section.ts` — `renderOtherSubsection` wraps each relationship row in a new `cr-profile__rel-item` container, with a `.cr-profile__rel-notes` div below for any non-empty note (italic, muted, indented to the link column).
- `styles/profile-view.css` — minimal styling for `.cr-profile__rel-notes` (italic, muted color, padding-left calculated so the note aligns with the link column).
- 8 new tests added to `tests/relationship-property-writer.test.ts` covering scalar and array forms, padding behavior when adding a note to a later target, preservation of earlier notes when adding a later note, alignment when adding a target with no note, the duplicate-skip path, and whitespace trimming. Currently scoped to non-bio relationship types (custom types + step / adoptive / foster / ward / etc.); bio family relationships (spouse / parent / child) use dedicated frontmatter fields with no notes slot and are tracked as a follow-up. Reported by @DigitalDreamn.

**Mobile pre-release verification pattern (new for `mobile-*` fixes):** for releases containing any `mobile-ios` or `mobile-android` labeled fix, verify on the target device class **before tagging** rather than after. The flow:
1. Build + deploy to dev-vault for desktop sanity-check.
2. Copy `main.js`, `styles.css`, `manifest.json` to the target device's `<vault>/.obsidian/plugins/charted-roots/` folder.
3. Reload Obsidian on the device.
4. Verify the fix and inspect via `chrome://inspect` (Android, from desktop Chrome's remote inspector) or Safari Web Inspector (iOS, requires Mac).
5. Only tag and ship if the device-side verification confirms the fix.

**Testing:** 12 new tests (4 in `tests/family-graph-step-adopted-child-mapping.test.ts`, 8 added to `tests/relationship-property-writer.test.ts`), suite total 622 (was 610 at start of cycle), 52 suites.

**Reporters:** @DigitalDreamn for the [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) + [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) parent-direction follow-up + [#530](https://github.com/banisterious/obsidian-charted-roots/issues/530) (via discussion [#529](https://github.com/banisterious/obsidian-charted-roots/discussions/529), then filed as a tracking issue). @banisterious for the [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) follow-up.

**Stability-window impact:** no reset — all three changes are non-data-loss. Window continues from 0.22.17's anchor: 2026-05-01 → ~2026-05-22. Three patches in.

---

### v0.22.19 Round-Up: Wikilink cr_id Disambiguation and Relationship Calculator BFS Expansion (v0.22.19)

Four bug fixes addressing wikilink ambiguity, relationship-graph traversal, and mobile layout. **#524**: wikilinks generated by the relationship picker linked to the wrong target when a person's `name` differed from their filename — same architectural shape as #510 from 0.22.17, different code path (the writers' `createSmartWikilink` helper). **#525 + #526**: the Relationship Calculator's BFS only traversed bio edges and ignored the step / adoptive edges that `family-graph.ts` already populates, so paths needing those edges resolved as "Not related" or got mislabeled with direction-asymmetric bio terms. **#528**: Map view's center toolbar filters overflowed past the right edge of the viewport on Android phones because the existing 768px viewport media query didn't fire reliably on Obsidian Mobile. (Note: post-release verification revealed that the v0.22.19 #525/#526 fix only resolved the child → parent direction, and the #528 attempt didn't actually resolve the bug. Both follow-ups landed in v0.22.20.)

**Fix: Wikilinks via cr_id when name and filename diverge** ([#524](https://github.com/banisterious/obsidian-charted-roots/issues/524)):
- The writers' `createSmartWikilink(name, app)` derived the file from the name via `getFirstLinkpathDest(name, '')`, which returns null when no file's basename matches the name (e.g., filing a person under their maiden name with `name` set to a married-name display). The fall-through wrote a bare `[[name]]` form that didn't resolve to anything. The `cr_id` link was unaffected — stored independently — making the bug silent until a user clicked the wikilink.
- `createSmartWikilink` in `src/core/person-note-writer.ts`, `src/core/place-note-writer.ts` (both quoted and unquoted variants), and `src/organizations/services/organization-service.ts` now accept an optional `crId` parameter and look up the file by cr_id when provided, falling back to the name-based lookup when no cr_id is available.
- ~20 person-side call sites pass the paired cr_id (father, mother, spouse 1-5, children, stepfather, stepmother, adoptive parents, parents, birth_place, death_place, sources). Place-side passes `parentPlaceId`. Org-side signature kept consistent for a future picker-plumbing pass.
- `src/core/relationship-emit.ts` — `computeRelationshipArrayPatch` wikilinker callback gains optional `id` argument so the array-patch helper plumbs ids per-name.
- `createSmartWikilink` exported from `person-note-writer.ts` for testing. `tests/mocks/obsidian.ts` extended with `MetadataCache.getFirstLinkpathDest` so the writer's fallback path works in tests.
- 10 new tests: 4 in `tests/relationship-emit.test.ts` for the wikilinker-receives-id signature; 6 in new `tests/person-note-writer-smart-wikilink.test.ts` for the cr_id-based file resolution. Reported by @doctorwodka.

**Fix: Relationship Calculator handles step and adoptive relationships** ([#525](https://github.com/banisterious/obsidian-charted-roots/issues/525), [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526)):
- The BFS in `src/core/relationship-calculator.ts` only traversed `fatherCrId` / `motherCrId` / `parentCrIds` going up, `childrenCrIds` going down, and `spouseCrIds` lateral. It didn't traverse the step / adoptive edges that `family-graph.ts` already populates on each `PersonNode` (`stepfatherCrIds`, `stepmotherCrIds`, `adoptiveFatherCrId`, `adoptiveMotherCrId`, `adoptiveParentCrIds`, `stepchildrenCrIds`, `adoptedChildCrIds`).
- Two consequences: paths needing those edges to resolve returned "Not related" with a BFS-exhausted warning (#525 — Galen → Ben as adoptive father, where Galen had no bio parents to traverse upward), and paths the BFS happened to find through bio-fallback routes were labeled with the wrong direction-asymmetric terms (#526 — Anakin → Cliegg returned "Parent-in-law" while Cliegg → Anakin returned "Child" with `Blood: Yes`; same path, two wrong labels).
- The BFS now traverses all step + adoptive parent edges going up and all step + adopted child edges going down, with each step in the path tagged via an expanded `RelationshipStep.relationship` union to record the actual edge type traversed.
- `analyzePath` derives a `pathKind` (`bio` / `step` / `adoptive`); `generateRelationshipDescription` applies "Step" / "Adoptive" prefixes through new `applyStepPrefix` / `applyAdoptivePrefix` helpers that produce labels like `Stepparent`, `Stepchild`, `Stepsibling`, `Step-grandparent`, `Adoptive parent`, `Adopted child`, `Adoptive sibling`, `Adoptive grandparent`. `isBloodRelation` is now `false` whenever any non-bio edge appears on the path (fixes the #526 Anakin/Owen "registers as a blood relation" report).
- `src/ui/relationship-calculator-modal.ts` — `getRelationshipLabel` switch extended for the 6 new path-step variants so the path display reads "Stepfather" / "Adoptive mother" / etc. instead of an empty string.
- 11 new tests in `tests/relationship-calculator.test.ts` covering #525 symmetric adoptive parent + adoptive sibling + adoptive grandparent, #526 symmetric step parent + Anakin/Owen non-blood-relation pattern, multi-hop coverage, bio path regression guard. **Behavior change:** users with existing step or adoptive relationship data will see corrected labels in the Relationship Calculator, the kinship report generator, and the path-step display where previously they saw "Not related", "Sibling-in-law", or "Child / Blood: Yes". Reported by @DigitalDreamn.
- **Note:** post-release, @DigitalDreamn reported that the parent → step/adopted child direction still mislabeled as bio. The fix above only resolved the child → parent direction; a separate bug in custom-relationship-array parsing was rerouting bidirectionally-written entries into bio `childrenCrIds`. Follow-up landed in v0.22.20.

**Fix: Map view filter row wraps on Android phones (first attempt)** ([#528](https://github.com/banisterious/obsidian-charted-roots/issues/528)):
- The center toolbar filters (collection picker, year-range inputs) overflowed past the right edge of the viewport on phones — visible labels read `All collection`, `Fron`, `To y` — because the existing `@media (max-width: 768px)` rule in `styles/map-view.css` (which gives `.cr-map-toolbar-center` `order: 3` + `width: 100%` to wrap onto its own row) didn't fire reliably on Obsidian Mobile.
- `src/maps/map-view.ts` — added a `Platform.isPhone` check in `buildUI()` that adds a `cr-map-view-phone` class to the view container, mirroring the existing `crc-mobile-mode` pattern in Control Center. Scoped to phones (not iPad) so iPad-landscape keeps the inline horizontal layout.
- `styles/map-view.css` — `.cr-map-view-phone .cr-map-toolbar-center` selectors mirror the existing 768px media-query rules.
- **Note:** this attempt didn't actually resolve the bug. The class WAS applied per `chrome://inspect` post-release, but the layout was still broken because both the existing media query and the new class-based fallback set `width: 100%`, which is silently overridden by the inherited `flex-basis: 0` from the base `flex: 1` declaration. Real fix landed in v0.22.20 (replaced `width: 100%` with `flex: 0 0 100%`). Reported by @banisterious.

**Testing:** 21 new tests, suite total 610 (was 589 at start of cycle), 51 suites.
- `tests/relationship-emit.test.ts` (4 tests, #524) — wikilinker-receives-id signature.
- `tests/person-note-writer-smart-wikilink.test.ts` (6 tests, #524) — cr_id-based file resolution + name-fallback path.
- `tests/relationship-calculator.test.ts` (11 tests, #525/#526) — step + adoptive symmetric resolution + bio regression guards.

**Reporters:** @doctorwodka for [#524](https://github.com/banisterious/obsidian-charted-roots/issues/524) (continued name/basename divergence testing after #510). @DigitalDreamn for [#525](https://github.com/banisterious/obsidian-charted-roots/issues/525) + [#526](https://github.com/banisterious/obsidian-charted-roots/issues/526) (with detailed reproductions including console captures that made the BFS-exhausted trace fast). @banisterious for [#528](https://github.com/banisterious/obsidian-charted-roots/issues/528) (spotted while attempting to reproduce #527 on a personal Android device).

**Stability-window impact:** no reset — all four changes are non-data-loss. Window continues from 0.22.17's anchor: 2026-05-01 → ~2026-05-22. Two patches in.

---

### v0.22.18 Round-Up: Profile-Pane Cache Race and Three Rendering Fixes (v0.22.18)

Four fixes refining rendering and state-sync across the Merge Wizard, the Bases People base, the Entity Profile pane, and Book Builder report output. **The Merge Wizard** had no CSS file at all — the component creates ~20 distinct `cr-merge-*` class names that never had a matching style, so layout fell back to default block flow ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514)). **The People base's Spouse(s) column** was empty for users following the recommended indexed-spouse pattern (`spouse1`, `spouse2`, etc.) because the column mapped directly to `note.spouse` only ([#516](https://github.com/banisterious/obsidian-charted-roots/issues/516)). **The Entity Profile pane** showed "Could not load entity data" for newly-created notes until the user navigated away and back — a metadata-cache race in `EventService`, `SourceService`, and `ProofSummaryService` ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519)). And **Book Builder report chapters** leaked raw `[[wikilink]]` syntax into PDF/ODT output because the report path skipped the sanitizer the vault-note path already used ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522)).

Two of the four (#514 and #516) surfaced while authoring the new chartedroots.com [/guides/](https://chartedroots.com/guides/) section — guide-authoring as a bug-discovery channel turned out to be valuable for hitting workflows the maintainer doesn't otherwise exercise daily. #519 was reported by @DigitalDreamn after creating a new event note and seeing the profile pane fail to update; the same audit pattern revealed identical race conditions in `SourceService` and `ProofSummaryService` that hadn't been reported but were waiting to fire. **Stability window stays anchored to 0.22.17** (one patch in since the 2026-05-01 anchor reset). All four fixes non-data-loss.

**Fix: Merge Wizard renders as the intended 4-column comparison table** ([#514](https://github.com/banisterious/obsidian-charted-roots/issues/514)):
- `styles/merge-wizard.css` (new, 276 lines) + `build-css.js` — the Merge Wizard component creates ~20 distinct `cr-merge-*` class names but no CSS file ever defined any of them. Layout fell back to default block flow — each field/value/value/dropdown stacked vertically instead of laying out as the intended 4-column side-by-side comparison. Includes a responsive breakpoint at 700px that collapses the four-column grid into a stacked layout for narrow viewports.
- `src/constants/base-template.ts` — while in there, the People base's "Multiple marriages" view filter was checking `!isEmpty(spouses_all)` ("has at least one"), corrected to `length > 1` ("actually multiple"). Surfaced while authoring the [find-and-merge-duplicates guide](https://chartedroots.com/guides/research/find-and-merge-duplicates/).

**Fix: People base's Spouse(s) column shows all spouses for users following the indexed-spouse pattern** ([#516](https://github.com/banisterious/obsidian-charted-roots/issues/516)):
- `src/constants/base-template.ts` — the column mapped directly to `note.spouse` only, so vaults using the recommended indexed pattern (`spouse1`, `spouse2`, etc.) saw an empty column even when multiple spouses were recorded. New `spouses_all` formula aggregates the flat `spouse` plus `spouse1` through `spouse5` and filters empties: `[note.spouse, note.spouse1, ...spouse5].flat().filter(!value.isEmpty())`. Both single-spouse and multi-marriage households render correctly. Existing user vaults need to recreate their `people.base` to pick up the new template. Surfaced while authoring the [use-bases-for-data-analysis guide](https://chartedroots.com/guides/research/use-bases-for-data-analysis/).

**Fix: Entity Profile pane stops showing "Could not load entity data" for newly-created entities** ([#519](https://github.com/banisterious/obsidian-charted-roots/issues/519)):
- `src/events/services/event-service.ts` + `src/sources/services/source-service.ts` + `src/sources/services/proof-summary-service.ts` — each service loaded its cache lazily and invalidated on writes, but didn't react to Obsidian indexing the new file later. After `createEvent` (or `createSource`, or `createProof`), a read between the write and Obsidian's metadata catch-up silently skipped the new file (`app.metadataCache.getFileCache(newFile)?.frontmatter` returns `undefined` until indexing completes) and marked the cache valid without it. The cache stayed poisoned until something external invalidated. Each service now has a `setupVaultListeners(plugin)` method that subscribes to `metadataCache.on('changed')` plus vault `delete` / `rename`, invalidating when a relevant `cr_type` file moves through the index.
- `main.ts` — `ProofSummaryService` hoisted to a singleton via a new `getProofSummaryService()` getter (was previously constructed per-render at 5 sites — singleton needed so the metadata-cache listeners persist for the plugin lifetime). Five consumer sites updated to use the getter: `src/profile-view/profile-data-loader.ts`, `src/ui/data-quality-tab.ts` (×2), `src/ui/people-tab.ts`, `src/sources/ui/create-proof-modal.ts`, plus `populateConflictCounts` in `main.ts` itself.
- `tests/mocks/obsidian.ts` — extended with `MetadataCache.on('changed' / 'resolve' / 'resolved')` event support and a minimal `Plugin` class with `registerEvent()` so the regression tests can exercise the listener path. 15 new tests across `tests/event-service-cache-race.test.ts`, `tests/source-service-cache-race.test.ts`, `tests/proof-summary-service-cache-race.test.ts` — the race repro, delete handling, rename handling, cross-type isolation, listener-count assertion. Reported by @DigitalDreamn.

**Fix: Report chapters in Book Builder no longer leak raw `[[wikilink]]` syntax into PDF/ODT output** ([#522](https://github.com/banisterious/obsidian-charted-roots/issues/522)):
- `src/book/services/book-generation-service.ts` — `BookGenerationService` already sanitized vault-note chapter content through a `sanitizeVaultNoteMarkdown` helper that strips wikilinks, frontmatter, and dynamic blocks, but the report chapter path stored the report generator's markdown into the chapter directly with no sanitization. Report generators (`FamilyGroupSheetGenerator`, `IndividualSummaryGenerator`, `SourceSummaryGenerator`, `SourcesByRoleGenerator`) emit raw `[[Name]]` syntax intentionally for in-vault rendering, which the static export renderer then displayed as literal text. `generateReportChapter` now applies the same sanitizer.
- `src/book/services/sanitize-markdown.ts` (new) — helpers extracted from `book-generation-service.ts` into a standalone module with no app imports, so the regression tests can fence the sanitizer's contract without dragging in the Obsidian `Modal` class transitively. The standalone-PDF report path was unaffected because `pdf-report-renderer.ts` had its own `stripWikilinks` method and called it at render time.
- 7 new tests in `tests/book-sanitize-report-markdown.test.ts` — simple wikilinks, piped wikilinks, table-cell wikilinks, multi-link lines, non-wikilink bracket safety, frontmatter stripping, dynamic-block stripping. Realistic Family Group Sheet shaped input.

**Testing:** 22 new tests, suite total 589 (was 567 at start of cycle), 49 suites.
- `tests/event-service-cache-race.test.ts` (5 tests, #519) — race repro after `createEvent` (cache reloads once `metadataCache.on('changed')` fires for the new file), delete invalidates, rename invalidates, non-event file changes don't invalidate, three event listeners registered on the plugin.
- `tests/source-service-cache-race.test.ts` (5 tests, #519) — same shape against `SourceService.createSource`.
- `tests/proof-summary-service-cache-race.test.ts` (5 tests, #519) — same shape against `ProofSummaryService.createProof`.
- `tests/book-sanitize-report-markdown.test.ts` (7 tests, #522) — sanitizer contract against realistic report-shaped markdown.

**Reporters:** @DigitalDreamn for [#519](https://github.com/banisterious/obsidian-charted-roots/issues/519) (with detailed reproduction + console capture that made the metadata-cache trace fast). @banisterious for the other three, two surfaced while authoring the new /guides/ section.

**Stability-window impact:** no reset — all four changes are non-data-loss. Window continues from 0.22.17's anchor: 2026-05-01 → ~2026-05-22. First patch in since the reset.

---

### v0.22.17 Round-Up: Edit Person Hardening and a Citation Surface Promotion (v0.22.17)

Three fixes addressing wikilink ambiguity and silent data destruction in the Edit Person modal, plus a discoverability change that surfaces the per-fact source citations UI by default. Closes a `data-loss` bug ([#512](https://github.com/banisterious/obsidian-charted-roots/issues/512)) where opening + saving Edit Person on a person with existing `sourced_*` attributions wiped them. **Event creation** now correctly disambiguates persons that share a `name` property but live in different files ([#510](https://github.com/banisterious/obsidian-charted-roots/issues/510)). **Spouse marriage_location** stops degrading to a nested-array YAML form on save ([#513](https://github.com/banisterious/obsidian-charted-roots/issues/513)). And the existing per-fact citations UI in Edit Person — already feature-complete from #292, just hidden behind an off-by-default gate — gets promoted into a new top-level "Research" section in Settings and defaults to on for new vaults ([#511](https://github.com/banisterious/obsidian-charted-roots/issues/511)).

Driven by @doctorwodka's careful repro on [#510](https://github.com/banisterious/obsidian-charted-roots/issues/510) and the validation testing that surfaced #512 / #513 / #511 in cascade. **Stability window resets to 0.22.17** — first reset in thirteen patches (window had been anchored to 0.22.4 since 2026-04-23). The reset is unavoidable given the data-loss severity of #512; bundling #511's discoverability change into the same release gets the per-fact citations workflow into users' hands without further wait.

**Fix: Event creation wikilinks disambiguate persons that share a display name** ([#510](https://github.com/banisterious/obsidian-charted-roots/issues/510)):
- `src/events/services/event-service.ts` — when two persons had the same `name` frontmatter property but different filenames (e.g. `Harold James 1.md` and `Harold James 2.md`, both with `name: Harold James`), creating an event for one of them silently linked to whichever file Obsidian's metadataCache picked first. The wikilink helpers `formatWikilink` and `createSmartWikilink` now accept an optional `basename` parameter that trumps the metadataCache fallback, producing `[[Harold James 2|Harold James]]` instead of the ambiguous `[[Harold James]]`.
- `src/events/types/event-types.ts` + `src/events/ui/create-event-modal.ts` — `CreateEventData` gains `personBasename` / `personsBasenames` / `placeBasename` fields. The event modal captures `file.basename` from `PersonPickerModal` and `PlacePickerModal` callbacks and threads it through. Edit-mode round-trip is preserved via a new `parseWikilink` helper so re-saving an existing aliased event doesn't strip the disambiguation.
- `src/plugin/context-menus.ts` + `src/ui/people-tab.ts` + `src/ui/create-person-modal.ts` — the context-driven entry points (Edit Person modal's Create event button, right-click "Create event for this person", People tab submenus) extend the `initialPerson` shape to carry basename so all five callers pass disambiguation through. Reported by @doctorwodka. 16 new tests across `tests/event-wikilink-disambiguation.test.ts` and `tests/event-service-create-disambiguation.test.ts`.

**Fix: Edit Person modal stops wiping per-fact source attributions on save** ([#512](https://github.com/banisterious/obsidian-charted-roots/issues/512), `data-loss`):
- `src/core/person-note-writer.ts` — new `extractSourcedFactsFromFrontmatter(fm)` helper parses `sourced_*` arrays out of frontmatter, stripping wikilink brackets and pipe-aliases to leave just the basenames the modal's chip UI expects. Returns `undefined` when no `sourced_*` properties are present so callers can leave `editPersonData.sourcedFacts` unset in that case.
- `src/ui/people-tab.ts` + `src/plugin/bulk-operations.ts` — both Edit Person callers built `editPersonData` from frontmatter manually but never read `sourced_*` properties into `editPersonData.sourcedFacts`. The modal's save path always wrote `sourcedFacts` with all 10 fact properties (empty arrays for any the user hadn't touched), and the writer's update path deleted any property whose array was empty. Net effect: opening + saving Edit Person on a person with existing per-fact attributions silently wiped them. Both callers now use the new helper. The bulk-operations site previously had its own inline implementation with a flaw of its own — its regex passed `"basename|alias"` through with the pipe intact when an aliased wikilink was present.
- Bug only fired when `trackFactSourcing: true` was explicitly enabled (the previous default was off), so existing default-settings vaults were unaffected. 11 new tests in `tests/extract-sourced-facts.test.ts`.

**Fix: Spouse `marriage_location` stops degrading to nested-array YAML form** ([#513](https://github.com/banisterious/obsidian-charted-roots/issues/513)):
- `src/core/person-note-writer.ts` — the writer wrapped its `createSmartWikilink` output for `spouse{N}_marriage_location` in extra JS-string template quotes, producing a JS string like `'"[[Boston Suffolk County]]"'` (with embedded quote characters). `processFrontMatter`'s round-trip then reshaped that to the nested block-list form `[["Boston Suffolk County"]]` for the unrecognized link field. Drops the embedded quotes from the writer site so new saves emit the canonical wikilink string.
- New `normalizeMarriageLocation` helper coerces the degraded `[["Basename"]]` shape back to `[[Basename]]` when reading existing data, applied at both modal-feeding load sites (`src/core/person-note-writer.ts` reverse-unlink path + `src/ui/people-tab.ts` editPersonData spouseMetadata block). Notes round-tripped through the buggy writer self-heal on the next Edit Person save. Other consumers of the field (map-data-service, standardize-places) treat the field differently and aren't covered by this fix — out of scope for the reported bug. 7 new tests in `tests/normalize-marriage-location.test.ts`.

**Added: Top-level "Research" section in Settings with fact tracking enabled by default** ([#511](https://github.com/banisterious/obsidian-charted-roots/issues/511)):
- `src/settings.ts` — the "Research tools" and "DNA tracking" subsections moved out of Advanced into a new top-level "Research" section, positioned between Places and Property & value aliases. Both subsections retain their existing labels and toggle wording — the only structural change is the section move so the toggles don't sit three levels deep under Advanced. The new section reads "Evidence-based genealogy and DNA workflows" and is broad enough to host future research-related settings without renaming.
- `DEFAULT_SETTINGS.trackFactSourcing` flips from `false` to `true`. New installs surface the "Fact-level source citations" section in Edit Person without requiring users to find and enable a buried toggle first. The section auto-collapses when no data is present (so empty-state cost is low) and auto-expands when populated. The existing implementation from #292 was already feature-complete; the previous default-off gate was masking an otherwise-usable surface. Existing vaults with the toggle explicitly off keep that preference. Safe to default-on now that #512 / #513 are closed. The discovery cascade started with @banisterious validating the #510 fix in a dev vault that included `sourced_*` properties — opening Edit Person on William Anderson and saving wiped them, surfacing #512; the spouse field's nested-array form was visible in the same file, surfacing #513; and the validation made clear that the per-fact UI banisterious had been planning to build for [#511](https://github.com/banisterious/obsidian-charted-roots/issues/511) already existed — just gated behind the off-by-default toggle.

**Testing:** 34 new tests, suite total 567 (was 533 at start of cycle).
- `tests/event-wikilink-disambiguation.test.ts` (11 tests, #510) — basename-aware helper produces `[[basename|name]]` when given an explicit basename, falls back to metadataCache resolution otherwise, preserves already-bracketed input as a passthrough, handles whitespace.
- `tests/event-service-create-disambiguation.test.ts` (5 tests, #510) — end-to-end through `EventService.createEvent`: person + personBasename produces aliased wikilink, basename-equals-name produces unaliased, multi-person with shared display name disambiguates per-index, placeBasename produces aliased place, legacy `person` shifted to front of persons preserves index alignment with personsBasenames.
- `tests/extract-sourced-facts.test.ts` (11 tests, #512) — extractor returns undefined when no `sourced_*` properties present, strips wikilink brackets and pipe-aliases, handles single-string legacy form, passes bare strings through, skips empty / null / non-string entries defensively, ignores non-sourced frontmatter properties.
- `tests/normalize-marriage-location.test.ts` (7 tests, #513) — passes clean wikilink strings through, reshapes the nested-array block-list form to canonical wikilink, returns undefined for unrecognized shapes, handles whitespace.

### v0.22.16 Round-Up: Modal Polish, Marriage Popup Parity, and Filename Casing (v0.22.16)

Five fixes refining Universe handling and marriage popups across modal and map surfaces. **Edit Person dropdown** now lists every form a universe might reach the user via the dropdown ([#505](https://github.com/banisterious/obsidian-charted-roots/issues/505) — typed name + cascaded basename, post-#503 alias-aware matching means picking either resolves correctly). The **Edit Event modal** exposes the Universe field on every event type ([#507](https://github.com/banisterious/obsidian-charted-roots/issues/507) — previously gated alongside the narrative-only `isCanonical` toggle, leaving Vital and Life events with no path to set their universe via the modal) and reactively reveals the Worldbuilding section when the user picks a narrative type from the dropdown after opening the modal. **Marriage popups** pair the partner's age alongside the focal person's on the static-marker surface ([#508](https://github.com/banisterious/obsidian-charted-roots/issues/508) — parity with the journey-mode treatment from 0.22.15's #504), and **event / source / proof-summary filenames** now preserve accented characters and casing instead of being slugified into ASCII-only forms ([#509](https://github.com/banisterious/obsidian-charted-roots/issues/509)).

Driven by @DigitalDreamn's verification thread that surfaced #505, #507, #508, and #509 across multiple cycles. The investigation track she seeded with empirical evidence in [#506](https://github.com/banisterious/obsidian-charted-roots/issues/506) (parens / brackets / braces in filenames) bore fruit indirectly here — #509's filename generators were a separate aggressive sanitization path that the same testing pass surfaced. All five changes are non-data-loss; stability window continues unchanged from 0.22.4. Twelfth patch in the run without a reset.

**Fix: Edit Person dropdown includes the universe note's typed name** ([#505](https://github.com/banisterious/obsidian-charted-roots/issues/505)):
- `src/plugin/bulk-operations.ts` — the right-click Edit Person flow merged universes from only two sources (`placeGraph.getAllUniverses()` and `familyGraph.getAllUniverses()`), omitting the universe-note source that the Control Center's `getCachedUniverses` already uses. After a Universe rename where sanitization stripped chars from the basename — e.g. typed `Star Wars (AU)` becoming basename `Star Wars AU` — the cascaded entity values made it into the dropdown but the typed name had no path in. Users saw only the basename and couldn't recognize the name they typed.
- New `src/universes/services/merged-universe-list.ts` extracts the merge logic into a shared `mergeUniverseList` helper. Both call sites (Control Center + Edit Person via context menu) now go through it, so the three-source merge can't drift apart again. 10 new tests in `tests/universe-cache-after-rename.test.ts`. Reported by @DigitalDreamn during #488 verification.

**Fix: Universe field always available in Edit Event modal, reactively** ([#507](https://github.com/banisterious/obsidian-charted-roots/issues/507)):
- `src/events/ui/create-event-modal.ts` — the Universe Setting was bundled inside the conditional that gates the `isCanonical` toggle on narrative event types, so Vital (birth/marriage/death/burial) and Life (residence/immigration/etc.) events had no way to set their universe via the modal. Pulled Universe out into its own always-rendered Setting at the same level as Place / Timeline; `isCanonical` stays narrative-only since canon/non-canon is storytelling-specific, not applicable to vital records or life events.
- Follow-up: the Worldbuilding section that wraps `isCanonical` was decided once at form-build time from the initial `eventType` and never re-evaluated, so picking a narrative type from the dropdown after opening the modal didn't reveal the section. The section now always renders into the DOM and toggles `cr-hidden` based on `isNarrativeEventType(this.eventType)`. The event-type dropdown's onChange updates the visibility so users can switch into a narrative type and immediately see the `Canonical event` toggle without saving and reopening.
- `isNarrativeEventType` lives in `src/events/types/event-types.ts` so the membership fence test can import without pulling in the modal's UI deps. 5 new tests in `tests/event-narrative-type.test.ts`. Reported and verified by @DigitalDreamn.

**Added: Static map marker popup pairs the partner's age alongside the focal person's** ([#508](https://github.com/banisterious/obsidian-charted-roots/issues/508)):
- `src/maps/types/map-types.ts` + `src/maps/map-data-service.ts` — the journey-mode rich popup gained partner age in 0.22.15 (#504), but the non-journey marker popup (clicked directly on a map marker) didn't. `MapMarker` gains `spouseBirthDate?: string`; `buildMarkers` builds the same `peopleById` lookup `buildJourneyPaths` already does, resolves the spouse via `marriage.spouseId`, and threads the spouse's `born` value onto marriage markers when resolvable.
- `src/maps/map-controller.ts` — the static popup's existing `with X` participants line appends `(age N)` to the partner's entry when the marker carries `spouseBirthDate`. Uses the same `DateService.calculateAge` path the focal age already uses, so fictional eras round-trip correctly. Format ends up `with Beru Whitesun (age 38)` alongside the existing focal-side `Marriage: 19 BBY (age 45)`. Compact in-line variant suggested by @DigitalDreamn during #504 verification — she'd originally meant the static popup when filing [#501](https://github.com/banisterious/obsidian-charted-roots/issues/501). 5 new tests in `tests/marriage-marker-spouse-birth.test.ts`.

**Fix: Event / Source / Proof Summary filenames preserve accented characters and casing** ([#509](https://github.com/banisterious/obsidian-charted-roots/issues/509)):
- `src/events/services/event-service.ts` + `src/sources/services/source-service.ts` + `src/sources/services/proof-summary-service.ts` + `src/events/services/life-events-migration-service.ts` — three services and the life-events migration helper each had their own private `slugify` running an aggressive `[^a-z0-9]+ -> -` regex that destroyed accented chars, lowercased everything, and turned spaces into hyphens. `Birth of Padmé Naberrie` became `birth-of-padm-naberrie.md`. Person notes go through `sanitizeName` which preserves accented characters, casing, apostrophes, hyphens, and spaces — same character was treated inconsistently across entity types.
- `src/utils/name-sanitization.ts` — new `sanitizeFilename(title, maxLength = 100)` helper wraps `sanitizeName` with a length cap and replaces all four call sites. Filenames now preserve user typing the same way person notes already do. Existing files keep their old slugified names; only new files going forward use the preserved format. Mixed state is unavoidable without a separate migration step. 18 new tests in `tests/sanitize-filename.test.ts` (replacing 6 obsolete `slugifyTitle` tests). Reported by @DigitalDreamn during #506 investigation.

**Testing:** 38 new tests, suite total 533 (was 495 at start of cycle).
- `tests/universe-cache-after-rename.test.ts` (10 tests, #505) — alias preservation across rename, three-source merge with divergent basenames, exact-string dedup, sort order, empty inputs.
- `tests/event-narrative-type.test.ts` (5 tests, #507 follow-up) — narrative-type membership for canonical types, vital types, life types, transfer / custom / empty rejection, case-sensitivity.
- `tests/marriage-marker-spouse-birth.test.ts` (5 tests, #508) — happy path with both spouses in dataset, missing spouseId fallback, missing born value, numeric-year coercion, no bleed onto non-marriage markers.
- `tests/sanitize-filename.test.ts` (18 tests, #509) — accented preservation, casing preservation, apostrophes / hyphens / spaces preservation, wikilink-unsafe stripping, length cap with custom max, empty / pathological input handling, parity with `sanitizeName` under cap.

**Reporters:** @DigitalDreamn for the verification thread that surfaced #505 / #507 / #508 / #509 across multiple cycles. The empirical evidence she contributed in #506 about filesystem- and wikilink-safe characters informed the conservative `sanitizeFilename` approach in #509.

**Issues filed during this cycle (post-1.0 / deferred):**
- [#506](https://github.com/banisterious/obsidian-charted-roots/issues/506) — investigation track for relaxing `WIKILINK_UNSAFE_CHARS` (parens / brackets / braces) once cross-platform wikilink safety is verified. Marked `post-1.0`.

**Stability-window impact:** no reset — all five changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Twelfth patch (0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 / 0.22.10 / 0.22.11 / 0.22.12 / 0.22.13 / 0.22.14 / 0.22.15 / 0.22.16) without a window reset. About two weeks of soak left.

---

### v0.22.15 Round-Up: Universe Rename Cascade Coverage and Marriage Popup Partner Age (v0.22.15)

Three fixes that close the loose ends from 0.22.14's universe rename arc, plus a small enhancement to the marriage popup. **The rename cascade now covers map notes** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503), Part 1 of three) — `cr_type: map` joins the cascade so map notes' `universe:` field gets rewritten alongside person/place/event/organization. **Universe code blocks survive the name↔basename divergence** that sanitization causes when typed names contain parens / brackets / quotes (Part 2) — new alias-aware lookup matches against any of basename, frontmatter `name`, or `cr_id`. **The map view re-syncs its filter** when a map note's universe field changes (Part 3) — both via cr_id resolution returning the basename and via auto-reloading `mapConfigs` on map-note metadata change. And the **journey-mode marriage popup** pairs the partner's age alongside the focal person's ([#504](https://github.com/banisterious/obsidian-charted-roots/issues/504), suggested by @DigitalDreamn during #501 verification).

The three #503 sub-fixes form a "Part 4" of the universe rename arc that started in 0.22.11 (#488 Part 1, dropdown sourcing), continued in 0.22.12 (#488 Part 2, cascade for plain-string references), and #488 Part 3 in 0.22.14 (Edit Universe modal triggers the cascade). #503 is the gap-closing pass: scope expansion (maps in cascade) + read-side resilience (alias-aware lookups + filter resync). Driven entirely by @DigitalDreamn's 0.22.14 verification thread, which exposed gaps the original tests didn't surface. All four changes are non-data-loss; stability window continues unchanged from 0.22.4. Eleventh patch in the run without a reset.

**Fix: Universe rename cascade rewrites map notes alongside other entity types** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)):
- `src/universes/services/universe-service.ts` — the 0.22.14 cascade scope was `person | place | event | organization`. Map notes (`cr_type: map`) carry a `universe:` field too but were silently skipped, so after a rename the map kept pointing at the old universe and its marker filter no longer matched the cascaded entities. `cr_type: map` added to `REFERENCING_TYPES` so map notes ride the cascade with the rest. Reported by @DigitalDreamn during 0.22.14 verification.

**Fix: Universe dynamic code blocks survive name↔basename divergence after rename** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)):
- `src/universes/services/universe-service.ts` — the rename cascade writes the file basename to entity `universe:` fields, but the `charted-roots-universe-people` / `places` / `events` / `organizations` / `maps` block processors compared against the universe note's frontmatter `name`. When `sanitizeName` strips characters during the file rename (parens / brackets / quotes — e.g. `"The Dying Earth (Vance)"` → basename `"The Dying Earth Vance"`), the basename diverges from the typed name and the lookup silently returned zero entities ("No entities found for this universe").
- New `getEntitiesForUniverseFile` matches against any of the universe note's aliases — basename, frontmatter `name`, or `cr_id` — so the lookup survives whichever form an entity's `universe:` field happens to hold (post-cascade basename, dropdown-written name, or cr_id reference). `src/dynamic-content/processors/universe-entities-processor.ts` and `src/dynamic-content/processors/universe-maps-processor.ts` both adopt the alias-aware shape, including the metadata-cache change handler comparison so cache invalidation respects the same alias set.

**Fix: Map filter resolves universe cr_id to basename, and re-syncs when a map note changes** ([#503](https://github.com/banisterious/obsidian-charted-roots/issues/503)):
- New `src/maps/resolve-universe-filter.ts` + `src/maps/map-view.ts` — two related issues with the map view's universe filter chain. (1) `resolveUniverseFilterValue` returned the universe note's frontmatter `name` when given a cr_id, but the rename cascade writes the basename to entities — so after a rename like `"The Dying Earth"` → `"The Dying Earth (Vance)"` the resolved filter `"The Dying Earth (Vance)"` no longer matched cascaded places / people on basename `"The Dying Earth Vance"` and every marker silently disappeared. Resolver now returns the basename, which is what the cascade writes. (2) The map controller's in-memory `mapConfigs` cache stayed stale after an Edit Map save, so `getActiveMapUniverse()` kept returning the old value and refresh re-queried with the wrong filter.
- `src/maps/map-controller.ts` — new `reloadMapConfigs()` method exposed publicly. Map view now calls it from a `syncMapConfigOnChange` helper on every metadata-cache change for `cr_type: map` files, then re-resolves `this.filters.universe` from `getActiveMapUniverse()` so refresh re-queries with the fresh filter. The resolver moves to its own module so the logic can be unit-tested without instantiating MapView. 7 new tests in `tests/resolve-universe-filter.test.ts`.

**Added: Marriage popup pairs the partner's age alongside the focal person's** ([#504](https://github.com/banisterious/obsidian-charted-roots/issues/504)):
- `src/maps/types/map-types.ts` + `src/maps/map-data-service.ts` — journey-mode marriage popups previously displayed the focal person's age at marriage but not the partner's, forcing the reader to navigate to the partner's note for the same calculation. `JourneyWaypoint` gains `spouseBirthDate?: string`; `buildJourneyPaths` builds a `peopleById` lookup from the same `people` array it iterates, resolves the spouse via `marriage.spouseId`, and threads the spouse's `born` value onto the marriage waypoint when resolvable.
- `src/maps/map-view.ts` — popup renders a separate `Partner's age` row when both the marriage date and a resolvable spouse birth date are present, paired with the existing focal-person `Age` row via the same `DateService.calculateAge` path so fictional eras work correctly. Legacy flat marriages without `spouseId`, and spouses without a `born` value, quietly omit the row. Suggested by @DigitalDreamn during #501 verification. 5 new tests in `tests/journey-marriage-spouse-birth.test.ts`.

**Testing:** 20 new tests, suite total 500 (was 480 at start of cycle).
- `tests/universe-rename-cascade.test.ts` (3 tests, #503 Part 1) — map cr_type inclusion, multi-type rewrite in single pass, unrelated cr_types untouched.
- `tests/universe-entities-by-file.test.ts` (5 tests, #503 Part 2) — basename / name / cr_id alias matching post-rename and pre-rename, no-match isolation, case-insensitive across aliases.
- `tests/resolve-universe-filter.test.ts` (7 tests, #503 Part 3) — cr_id-to-basename resolution with name divergence, pass-through for already-name values, null / empty handling, multi-universe selection, legacy `type: universe` shape support.
- `tests/journey-marriage-spouse-birth.test.ts` (5 tests, #504) — happy path, missing spouseId fallback, missing born value, numeric-year coercion, no bleed onto non-marriage waypoints.

**Reporters:** @DigitalDreamn for the 0.22.14 verification thread that surfaced #503 (all three sub-fixes — cascade scope gap, dynamic-block lookup divergence, map filter freshness) and the #501 verification observation that prompted #504.

**Stability-window impact:** no reset — all four changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Eleventh patch (0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 / 0.22.10 / 0.22.11 / 0.22.12 / 0.22.13 / 0.22.14 / 0.22.15) without a window reset.

---

### v0.22.14 Round-Up: Universe Rename Closure, Marriage Marker Pairing, and a Cleanup Wizard Step (v0.22.14)

Three fixes plus one Cleanup Wizard step. Closes the **Universe rename direction end-to-end** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 3, the third part of a three-part arc): the Edit Universe modal now actually renames the file when the name property changes, which triggers the existing 0.22.12 Part 2 cascade automatically. Collapses **pair-symmetric marriage markers** into a single combined marker with both partner names in the popup ([#501](https://github.com/banisterious/obsidian-charted-roots/issues/501) — sibling to [#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)'s `cr_type: event` dedup, but for marriages, which live as frontmatter on each spouse's note rather than as event notes). And adds a **Cleanup Wizard step** ([#502](https://github.com/banisterious/obsidian-charted-roots/issues/502), Layer 2 of the original [#471](https://github.com/banisterious/obsidian-charted-roots/issues/471) plan) that surfaces place notes lacking `cr_id` and offers a "Generate cr_id" fix so they re-enter the place graph.

Driven by @DigitalDreamn's verification of the 0.22.13 cycle: her Edit Universe testing surfaced the missing rename trigger that became #488 Part 3, and her #493 / #498 verification observations seeded #501. All four changes are non-data-loss; stability window continues unchanged from 0.22.4. Tenth patch in the run without a reset.

**Fix: Edit Universe modal renames the file when the name property changes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 3):
- `src/universes/services/universe-service.ts` — the 0.22.12 Part 2 cascade walks all entities and rewrites `universe:` plain-string references when a universe note's basename changes, but it's keyed on `vault.on('rename')`. `UniverseService.updateUniverse` was only writing the new `name` to the frontmatter; the file basename stayed the same. The cascade only fired when users renamed the universe FILE directly (drag, F2, wikilink rename). Editing via the Edit Universe modal — the natural path — left entities pointing at the old name. The dropdown showing both old and new names was a side effect of `getCachedUniverses` combining distinct `universe:` values from people / places (still the old name) with universe-note names (new name).
- `updateUniverse` now sanitizes the new name (via the existing `sanitizeName` helper) and calls `app.fileManager.renameFile` when the sanitized name differs from the current basename. The cascade fires automatically off the rename event, and Obsidian's native wikilink-rewrite handles `[[oldName]]` → `[[newName]]` updates for free. Reported by @DigitalDreamn after testing 0.22.13's Part 2 cascade — verified end-to-end on a dev-vault rename of "The Dying Earth" before commit.
- The three-part arc closes here: Part 1 (0.22.11, `d461b3f2`) made the Edit Person Universe dropdown source from the universes folder; Part 2 (0.22.12, `452bcffd`) added the rename cascade for plain-string `universe:` references; Part 3 (0.22.14) makes the Edit Universe modal trigger that cascade naturally instead of requiring users to know to rename the file directly.

**Fix: Marriages between two spouses render as one combined marker with both partner names** ([#501](https://github.com/banisterious/obsidian-charted-roots/issues/501)):
- `src/maps/map-data-service.ts` + `src/maps/types/map-types.ts` — a marriage produced one map marker per spouse (Owen's `spouse1_marriage_*` slot rendered a marker for Owen at Tatooine; Beru's `spouse1_marriage_*` slot rendered a separate marker for Beru at the same place). Neither popup named the partner. [#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)'s `eventCrId`-based dedup didn't catch this because marriages live on each spouse's frontmatter rather than as `cr_type: event` notes.
- `loadMarriages` now reads `spouseN` and `spouseN_id` alongside the existing marriage fields, attaches `spouseId` / `spouseName` to the resulting `MapMarker`. A new `dedupeMarriageMarkers` pass (running after the event-cr_id dedup) groups by sorted-pair + place + date so Owen→Beru and Beru→Owen markers collapse into one. Both spouses appear in the surviving marker's `participants` list, so the existing popup rendering surfaces "Owen Lars / with Beru Whitesun" naturally.
- Journey-mode rich popup also gains a `Partner` row for marriage waypoints (covering @DigitalDreamn's "indicate to who" suggestion from [#498](https://github.com/banisterious/obsidian-charted-roots/issues/498) verification). 8 new tests in `tests/marriage-marker-dedup.test.ts`.

**Added: Cleanup Wizard step — add cr_id to place notes** ([#502](https://github.com/banisterious/obsidian-charted-roots/issues/502)):
- `src/ui/cleanup-wizard-types.ts` + `src/ui/cleanup-wizard-modal.ts` — new step 15 in the Post-Import Cleanup Wizard. Detects place-shaped notes via the canonical `isPlaceNote` detection, lists them in the preview, and applies a generated `cr_id` to each via `processFrontMatter` (defensive: skips notes that already have one in case state changed mid-run). Mirrors the step 14 child-to-children pattern.
- Layer 2 of the original [#471](https://github.com/banisterious/obsidian-charted-roots/issues/471) three-layer plan. Layer 1 (the `warn`-level dev-console log) shipped in 0.22.9. Layer 3 (silent auto-heal during cache build) was discussed but rejected — keeping schema issues visible via the wizard preserves user awareness.

**Test: Fence FamilyGraphService.extractPersonNode non-person rejection** ([#489](https://github.com/banisterious/obsidian-charted-roots/issues/489) follow-up):
- `tests/family-graph-extract-person.test.ts` — 6 tests fencing the inclusion check that #489 added in 0.22.11. Custom `cr_type` values ("hex" / "faction") return null instead of falling through and being coerced into people; existing place / person / legacy cr_id-no-cr_type / missing-cr_id paths preserve their behavior. The fix shipped without dedicated test coverage; this fences the regression class so future refactors can't quietly break it.

**Testing:** 6 new tests, suite total 480 (was 466 at start of cycle; +14 across this and the closing #489 fence).
- `tests/marriage-marker-dedup.test.ts` (8 tests, #501) — pass-through non-marriage, single-marriage pass-through, sorted-pair collapse, legacy-no-spouseId pass-through, two unrelated couples kept separate, same couple different dates, same couple different places, multi-spouse with shared-partner-only-some-marriages.
- `tests/family-graph-extract-person.test.ts` (6 tests, #489 follow-up) — custom non-person cr_type rejection, place sentinel preservation, person extraction, legacy-no-cr_type fallback, missing-cr_id null.
- #488 Part 3 / #502 — manually verified by reporter / developer; integration-test mocking burden is high for marginal fence value.

**Reporters:** @DigitalDreamn for #488 Part 3 verification report + #501 surface from #493 / #498 testing.

**Stability-window impact:** no reset — all four changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Tenth patch (0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 / 0.22.10 / 0.22.11 / 0.22.12 / 0.22.13 / 0.22.14) without a window reset. About two weeks of soak left.

---

### v0.22.13 Round-Up: Map Coverage — Multi-Spouse, Multi-Participant, and Hierarchical Places (v0.22.13)

Six fixes, all map-adjacent. Most-impactful is the **map-coverage cluster** — three classes of map data that were silently invisible now render correctly: multi-spouse marriages on a multi-spouse person's journey ([#498](https://github.com/banisterious/obsidian-charted-roots/issues/498)), multi-participant events that previously stacked one marker per participant ([#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)), and child-place events on vaults without a zoomed-in child map ([#494](https://github.com/banisterious/obsidian-charted-roots/issues/494)). Plus a journey-popup label fix that completes the [#466](https://github.com/banisterious/obsidian-charted-roots/issues/466) custom-label work across the second render path ([#499](https://github.com/banisterious/obsidian-charted-roots/issues/499)), and two follow-ups to 0.22.12: a sturdier compound-row layout for the Place modal coordinate inputs ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496) follow-up) and a flat-format spouse promotion that lets the marriage-detail mirror work even when the partner's note hasn't been migrated to indexed shape yet ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) follow-up).

Driven heavily by @DigitalDreamn's continuing testing on the Star Wars / Lars-family vault: her [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) verification surfaced the missing-marriages observation that became #498 and the "custom" journey popup label that became #499; her Lars Homestead frontmatter clinched the diagnosis on #494; her Bail / Breha Organa repro drove the #481 follow-up. @doctorwodka also closed out #491 verification (both halves verified — tab labels and the merge step). All six changes are non-data-loss; stability window continues unchanged from 0.22.4.

**Fix: Map journey mode reads every marriage on multi-spouse people** ([#498](https://github.com/banisterious/obsidian-charted-roots/issues/498)):
- `src/maps/map-data-service.ts` — marriage waypoints and markers were sourced from a single set of legacy flat `marriage_place` / `marriage_place_id` / `marriage_date` frontmatter fields. People with multiple spouses (whose data is written to indexed `spouseN_marriage_*` slots after #481's bidirectional linker improvements) had no flat fields populated, so journeys silently dropped every marriage. `PersonData.marriages` becomes an array; new `loadMarriages` helper reads indexed slots `spouse1_marriage_*` through `spouse10_marriage_*` (matching the writer's iteration bound), falls back to a single legacy flat entry, and skips empty slots.
- `buildMarkers` and `buildJourneyPaths` iterate the array, emitting one waypoint / marker per populated slot. Drops the `&& person.marriageDate` requirement so dateless marriages still surface (sorting to the end of the life-event run, like death and burial already do). 10 new tests in `tests/marriage-loader.test.ts`. Surfaced by @DigitalDreamn during #487 verification — Cliegg Lars's death popup came back via the dedup fix, but neither of his two marriages appeared as waypoints.

**Fix: Multi-participant events render one combined marker instead of one per participant** ([#493](https://github.com/banisterious/obsidian-charted-roots/issues/493)):
- `src/maps/map-data-service.ts` + `src/maps/types/map-types.ts` — a `cr_type: event` note referenced by multiple people (e.g., a wedding with bride + groom, a battle with multiple combatants) produced one map marker per participant stacked at the same location. `buildMarkers` iterates per-person and `EventService.getEventsForPerson` surfaces the same external event for each participant, so each per-person pass contributed its own marker.
- Threads the event note's `cr_id` through `LifeEvent` and `MapMarker` (set only for external `cr_type: event` notes — inline events stay per-person, never dedup), then a new `dedupeEventMarkers` pass after marker collection groups by `eventCrId`, keeps one marker per group with the event note's `person` field as primary, and lists all participants in the popup. 8 new tests in `tests/event-marker-dedup.test.ts`. Reported by @DigitalDreamn during #487 testing.

**Fix: Events at child places render via inherited parent coordinates instead of disappearing** ([#494](https://github.com/banisterious/obsidian-charted-roots/issues/494)):
- `src/maps/map-data-service.ts` — when a person's `birth_place` / `death_place` / event location pointed at a child place (e.g., `Lars Homestead` with `parent_place: [[Tatooine]]`) that had no own pixel or geographic coordinates, the marker dropped silently because `hasValidCoordinates` returned false on the child. The map's place resolution now walks up the `parent_place` / `parent_place_id` chain when the resolved place has no own coords, inheriting positioning fields (`lat` / `lng` / `pixelX` / `pixelY` / `mapId` / `maps`) from the nearest ancestor that does.
- Popup and click-through keep the child's identity (`Lars Homestead` shows in the popup, opening the child's note); the marker visually appears at the parent's location — appropriate when the parent is the most-zoomed map level the user has set up. Same shape covers the real-world equivalent (a Stockholm event on a vault where Stockholm has no coords but Sweden does). Adds `parentPlaceId` to the place cache and an `applyCoordinateFallback` step inside `resolvePlace`. 7 new tests in `tests/place-coordinate-fallback.test.ts`. The forward-looking question of what happens once a child has its own coords on a *child* map (and you're viewing the parent map) is tracked separately as [#500](https://github.com/banisterious/obsidian-charted-roots/issues/500).

**Fix: Journey mode popup and play-control label show the original event type for custom events** ([#499](https://github.com/banisterious/obsidian-charted-roots/issues/499)):
- `src/maps/types/map-types.ts` + `src/maps/map-view.ts` — custom event types rendered as the literal string `Custom` in the journey-mode rich popup and play-control label, instead of preserving the original type (e.g., `Backstory`). Sibling to [#466](https://github.com/banisterious/obsidian-charted-roots/issues/466), which fixed the same UX gap on static map markers via `customLabel` on `MapMarker`; the journey-mode rendering path was missed at the time.
- `JourneyWaypoint` now carries `customLabel`, `buildJourneyPaths` propagates it from the source `LifeEvent`, and a new `getJourneyWaypointEventLabel` helper resolves the display label (preferring `customLabel` for `custom` waypoints, falling back to canonical `eventType` otherwise) so both render sites stay in sync. 5 new tests in `tests/journey-waypoint-display-label.test.ts`. Reported by @DigitalDreamn during #487 verification.

**Fix: Pixel coordinates X / Y (and Latitude / Longitude) render as a single compound row** ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496) follow-up):
- `src/ui/create-place-modal.ts` + `styles/place-modals.css` — the 0.22.12 fix tried to keep X / Y inline via `align-items: center` on a flex container of two adjacent setting-items, but @DigitalDreamn reported the rows still looked misaligned. DevTools inspection showed an Obsidian default `:first-child` / `:last-child` rule applying asymmetric padding (`0 0 16px` on X, `16px 0 0` on Y), pushing X content to the top of its box and Y content to the bottom. Specificity bumps couldn't reliably defeat the Obsidian default.
- Reworked the layout so X and Y (and the Latitude / Longitude pair under the same UI surface) live inside a single Setting's control area as plain inputs with inline labels — one setting-item, no adjacent-sibling padding asymmetry, side-by-side layout preserved. The Look up button stacks below the lat/long inputs via `flex-direction: column` on the controlEl. Pixel inputs render at 100px each via a `--pixel` modifier; geographic inputs at 140px via `--geo` to accommodate signed decimals and DMS strings.

**Fix: Marriage detail mirror also works when the partner's note uses legacy flat spouse format** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) follow-up):
- `src/core/bidirectional-linker.ts` — the 0.22.12 fix mirrored marriage details correctly when both partners' notes used the indexed `spouseN:` format, but missed the case where the partner was still on the legacy flat `spouse:` / `spouse_id:` shape. Couples that paired up before any marriage details existed kept the flat shape on both sides; setting marriage details on one side promoted that note to indexed via the writer's existing path, but the linker's mirror step bailed because `findExistingSpouseIndex` only scanned indexed slots.
- New `promoteFlatSpouseToIndexed` helper — when the target uses single-spouse flat format and the source has marriage details to mirror, the promotion atomically rewrites the target's `spouse:` / `spouse_id:` to `spouse1:` / `spouse1_id:` so the existing mirror code has a `spouseN_*` namespace to write the companion fields into. The atomic single-`processFrontMatter` write avoids a phantom-deletion cascade that sequential writes would have triggered. Reported by @DigitalDreamn in her Bail / Breha Organa scenario; reproduced locally on a dev-vault couple matching the same shape.

**Testing:** 30 new tests, suite total 466 (was 436 at start of this cycle).
- `tests/marriage-loader.test.ts` (10 tests) — indexed-slot reading, legacy fallback, partial fields, wikilink unwrap, indexed-wins precedence for #498.
- `tests/event-marker-dedup.test.ts` (8 tests) — pass-through, single participant, dedup, primary selection, fallback, multi-event, mixed inline+external for #493.
- `tests/place-coordinate-fallback.test.ts` (7 tests) — own-coords pass-through, parent-by-id / parent-by-name inheritance, grandparent walk, no-ancestor fallback, identity preservation, cycle protection for #494.
- `tests/journey-waypoint-display-label.test.ts` (5 tests) — customLabel preservation, fallback paths, built-in type ignoring stray customLabel for #499.

**Reporters:** @DigitalDreamn for #498, #494, #499, #481 follow-up, and continued #487 diagnostic isolation; @doctorwodka closed out #491 verification (tab labels + merge step) and confirmed #496 visual misalignment.

**Issues filed during this cycle (post-1.0 / deferred):**
- [#497](https://github.com/banisterious/obsidian-charted-roots/issues/497) — `group_name` vs `collection` discoverability gap on the Person picker; tracked separately from the post-1.0 Collections rework.
- [#500](https://github.com/banisterious/obsidian-charted-roots/issues/500) — hierarchical-maps fallback when a child has its own coords on a child map but the user is viewing the parent map; tied to the post-1.0 hierarchical-maps UX work.

**Stability-window impact:** no reset — all six changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Ninth patch (0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 / 0.22.10 / 0.22.11 / 0.22.12 / 0.22.13) without a window reset.

---

### v0.22.12 Round-Up: Marriage Symmetry, Universe Rename Cascade, and Map UX Polish (v0.22.12)

Eleven fixes — the largest 0.22.x patch and arguably the most consequential. Closes one of the long-standing **create/edit asymmetry** cases (marriage details mirror between spouses now, sibling pattern with [#411](https://github.com/banisterious/obsidian-charted-roots/issues/411) / [#415](https://github.com/banisterious/obsidian-charted-roots/issues/415) / [#426](https://github.com/banisterious/obsidian-charted-roots/issues/426) / [#429](https://github.com/banisterious/obsidian-charted-roots/issues/429) / [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478)); closes the **Universe rename direction** end-to-end alongside Part 1 from 0.22.11; and resolves a journey-mode dedup bug that had been silently dropping death popups whenever a custom event sat at the same place. Plus three pieces of map-UX polish, a partial cut at the Person Picker rework, two affordance additions, and a catalog hide for an under-implemented report type. Driven by @DigitalDreamn's diagnostic isolation work on [#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) (turned an ambiguous `needs-discussion` into a real code fix), her reproduction context for [#481](https://github.com/banisterious/obsidian-charted-roots/issues/481) and [#496](https://github.com/banisterious/obsidian-charted-roots/issues/496), and @doctorwodka's pushback on the original [#491](https://github.com/banisterious/obsidian-charted-roots/issues/491) triage that pivoted the picker fixes from "post-1.0 rework" to a 0.22.12 partial.

All eleven changes are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14) — eight patches without a reset.

**Fix: Marriage detail fields propagate bidirectionally between spouse notes** ([#481](https://github.com/banisterious/obsidian-charted-roots/issues/481)):
- `src/core/bidirectional-linker.ts` — the linker mirrored `spouse` + `spouse_id` between two notes but skipped the `spouseN_marriage_date` / `_marriage_location` / `_marriage_location_id` / `_marriage_status` / `_divorce_date` companion fields. Filling marriage details on one partner's note left the other partner with just the spouse link — no date, no place, nothing in the dynamic timeline block for the marriage.
- `syncSpouse` now accepts an optional `MarriageDetails` object extracted from the source's indexed slot via `extractMarriageDetails`. New `findExistingSpouseIndex` helper locates the target's slot for already-linked partners by `spouseN_id` match (with wikilink fallback), so updates propagate on top of an existing link, not just initial fill. `writeMarriageDetailsToTarget` only writes fields that are SET on the source — undefined source fields are left alone on the target so independently-set values survive.
- Same field set the deletion handler at [bidirectional-linker.ts:1473](https://github.com/banisterious/obsidian-charted-roots/blob/main/src/core/bidirectional-linker.ts#L1473) already enumerated; coverage is now consistent in both directions. Reported by @DigitalDreamn after noticing Shmi's timeline didn't include her marriage to Cliegg even though Cliegg's note had it.

**Fix: Universe note rename cascades to `universe:` references on referencing entity notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 2):
- `src/universes/services/universe-service.ts` — new `cascadeUniverseRename(oldBasename, newBasename)` iterates all markdown files, filters to `cr_type` of person / place / event / organization, and rewrites `universe:` plain-string fields that exactly match `oldBasename` to `newBasename`. Wikilink-syntax values (`[[Old Name]]`) are left to Obsidian's native rewrite, and `cr_id`-based or slug-based references are stable identifiers that don't track the basename. Reloads the universe cache on success so downstream consumers (dropdown, validators) pick up the new state.
- `main.ts` — `registerUniverseRenameHandler` subscribes to `vault.on('rename')` and dispatches the cascade for `cr_type: universe` files. Critical implementation note: the metadata cache is mid-update during the rename event so `getFileCache` returns null synchronously, and `metadataCache.on('changed')` doesn't fire for content-unchanged renames either. Took two failed approaches (synchronous cache read; one-shot `changed` listener) before landing on the working pattern: read the file content directly via `cachedRead` and parse `cr_type` from the frontmatter with a regex.
- Pairs with Part 1 from 0.22.11 (Edit Person dropdown sources from the universes folder) to close the rename direction end-to-end. The full universe-calendar Phase 2 work (parser-side era awareness, calendar-level `current_year`) is still post-1.0.

**Fix: Journey waypoint dedup key differentiates by event type** ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487)):
- `src/maps/types/map-types.ts` — `journeyWaypointDedupKey` was place-only (`id:${placeId}` or coords composite). The chronological sort places undated custom events at the end of the life-event run, immediately before death and burial; when their place matched the death's place, the consecutive-dedup loop kept the custom event and silently dropped the death waypoint, leaving no death popup in journey mode.
- Diagnosed by @DigitalDreamn through methodical isolation on the Lars-family vault: replicated by adding a Backstory event at Tatooine (Cliegg's death location), watching it swallow the death popup, removing the Backstory's location, and confirming the death returned only after a reload. Her bug report turned an initially `needs-discussion`-labeled issue into a real code fix.
- Fix folds `eventType` into the dedup key so same-place-different-type waypoints both survive (death + custom at Tatooine = two waypoints), while same-place-same-type still collapses (multi-residence at one address = one waypoint, preserving [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448)'s dedup intent). Four new tests in `tests/journey-waypoint-dedup.test.ts` covering the cross-type case and undefined-eventType backward compatibility.

**Fix: Burial waypoints honor per-map visibility filter in journey mode** ([#487](https://github.com/banisterious/obsidian-charted-roots/issues/487) sibling):
- `src/maps/map-data-service.ts` — the burial inclusion branch in `buildJourneyPaths` checked the universe filter but skipped the `isPlaceVisibleOnMap` per-map visibility filter that every other waypoint type (birth / marriage / life events / death) honors. A burial place hidden by per-map filter rules would still produce a journey waypoint on that map, while every other event type for the same person would respect the filter.
- One-line addition of the missing filter call brings burial behavior in line with the rest of the waypoint-coverage rules. Surfaced while reading the same code path during the dedup-key investigation.

**Feat: Map path label outline setting for legibility on colorful or dark backgrounds** ([#483](https://github.com/banisterious/obsidian-charted-roots/issues/483)):
- New plugin setting `pathLabelStroke: 'none' | 'white' | 'black'` (default `'none'`, preserving existing behavior). Lives in the Places section of plugin settings, alongside Heat map intensity. Plumbed through `MapSettings` → `MapView.getMapSettings()` → `MapController.addPathLabel`.
- When non-`none`, each label's SVG `<text>` element gains `paint-order: stroke fill` plus a 2px stroke in the chosen color, producing a halo effect around the glyphs without changing the path color itself. Applies uniformly to migration paths and journey paths via the shared `addPathLabel` helper. Reported by @doctorwodka for legibility on busy fictional image-map backgrounds where the default colored text washes out.

**Feat: Journey playback control reframed as popup dwell time** ([#486](https://github.com/banisterious/obsidian-charted-roots/issues/486)):
- The slider previously labeled `1x` / `1.5x` / `2.5x` etc. controlled total step duration, not popup dwell. After the ~1100ms camera fly the popup got whatever was left, so at default `1x` (2000ms total) the popup was visible for ~900ms; at the slowest `0.25x` setting the popup never opened before the next step fired.
- Reframed semantically as an explicit dwell-time selector with second labels: `2s` / `4s` / `6s` / `10s`, default `4s`. Total step interval is now `JOURNEY_FLY_MS (1100) + dwellMs`, so the popup always gets its full visible time regardless of fly duration. `journeyMode.speed` renamed to `journeyMode.dwellMs`; CSS class kept (`cr-map-journey-speed`) for minimal churn. Tooltip on the button reads "Popup dwell time per step (click to cycle)" so the semantics are discoverable. Reported by @DigitalDreamn during [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) verification.

**Fix: Map path labels hide instead of overflowing when zoomed out** ([#482](https://github.com/banisterious/obsidian-charted-roots/issues/482)):
- `src/maps/map-controller.ts` — at minimum zoom, polylines collapsed to small pixel regions but leaflet-textpath kept rendering the full label text along them, so the text overflowed past the path endpoints, visible as a label "teleporting" to empty space alongside the canvas. The 0.22.11 label-host fix (#472) addressed the multi-segment iteration problem but not this segment-too-short problem.
- Adds zoom-aware suppression: each path-label registration estimates the rendered text pixel-width and compares to the chosen segment's screen-space length at the current zoom; skips creating the host polyline when the segment can't fit the text. New `pathLabelEntries` registry tracks every label so a debounced `zoomend` listener can re-evaluate visibility as the user zooms. Reported by @doctorwodka.

**Feat: Person picker uses collection names and merges shared-name components** ([#491](https://github.com/banisterious/obsidian-charted-roots/issues/491) — partial):
- `src/ui/person-picker.ts` — the picker labeled every tab as `Family ${index + 1}` regardless of whether a connected component's members shared a `group_name`, and treated each disconnected graph component as its own tab even when multiple components shared a collection name. Player groups spanning unrelated characters appeared as N separate "Family" entries.
- Picker now uses `component.collectionName` for the tab label when every member shares one (falls back to `Family N` otherwise), and merges components with the same collectionName into a single tab. Merge logic extracted to `src/core/family-component-merge.ts` with 10 regression tests covering empty input, pass-through of unnamed components, merge-by-name, mixed named/unnamed, sort-by-size-after-merge, representative selection rules, and input immutability.
- Partial cut from a larger Collections rework that's still post-1.0. Reported by @doctorwodka who pushed back on an initial mistaken triage that asserted the picker already used named user collections — verifying her observation in code surfaced both this gap and the type-narrowing that was discarding the `collectionName` data the graph service already computed.

**Feat: "Manage memberships..." affordance on the person side** ([#490](https://github.com/banisterious/obsidian-charted-roots/issues/490)):
- `src/plugin/context-menus.ts` — `ManageOrganizationMembersModal` was reachable from three places, all org-side. Editing a person's membership required navigating to the organization first — non-obvious enough that @DigitalDreamn surfaced the discoverability gap in [discussion #484](https://github.com/banisterious/obsidian-charted-roots/discussions/484) after spending ~2 hours hunting for the path.
- Adds `Manage memberships...` to the person context menu (desktop submenu under `Charted Roots` plus the mobile flat menu for parity). Helper `openManageMembershipsForPerson` handles three cases: 0 memberships → notice; exactly 1 → opens the modal directly scoped to that org; 2+ → opens a `FuzzySuggestModal` picker scoped to the person's orgs and routes the modal to the chosen one.

**Fix: Pixel coordinates X and Y rows align vertically in the Create / Edit Place modal** ([#496](https://github.com/banisterious/obsidian-charted-roots/issues/496)):
- `styles/place-modals.css` — the X and Y inputs sit in a flex row (`.crc-coord-inputs`) but the parent had no `align-items` rule, defaulting to `stretch`. Each `.setting-item` flex child layouts its inner label + input independently; depending on Obsidian's default `.setting-item` flex behavior, the rows could end up on slightly different vertical baselines.
- One-line fix: add `align-items: center` to the flex container so both rows share a vertical center regardless of internal layout. Reported by @DigitalDreamn with a screenshot showing the misalignment.

**Fix: Fan chart PDF report option hidden from the catalog until a real renderer lands** ([#492](https://github.com/banisterious/obsidian-charted-roots/issues/492)):
- `src/reports/types/report-types.ts` — `fan-chart-pdf` was registered in the catalog UI (report wizard, trees tab, book builder) but `UnifiedTreeWizardModal` rewrites tree type `'fan'` to `'ancestors'` before tree generation, and there is no fan-specific layout downstream. The catalog entry was a registered surface without an implementation: selecting it produced an ancestor pedigree tree instead of the promised semicircular fan chart.
- Adds an optional `hidden?: boolean` flag on `ReportMetadata`; `getReportsByCategory` and the trees-tab visual-trees iteration both honor it. The option will be re-exposed when the fan-layout renderer is implemented. Surfaced during the v0.22.12 Reports gallery media capture session when the Victoria fan-chart PDF rendered as a tree.

**Changed: Journey playback preserves the user's zoom level between steps:**
- `src/maps/map-view.ts` — each step previously called `flyTo(target, 12, { duration: 1 })` — a hardcoded zoom level that yanked the camera down to zoom 12 on every step regardless of how the user had framed the journey. On a wide journey (continental, multi-system fictional), this produced a jolting zoom-in between each waypoint. The step now passes `map.getZoom()` instead, so the user's framing — set by `fitBounds` on entry to journey mode and adjustable via manual zoom mid-playback — is respected throughout playback.

**Testing:** 14 new tests, suite total 436 (was 422 at start of this cycle).
- `tests/journey-waypoint-dedup.test.ts` (+4 tests) — eventType-in-key behavior for #487 (cross-type at same placeId, same-type still collapses, undefined-eventType consistency, cross-type at coord-fallback path).
- `tests/family-component-merge.test.ts` (10 tests) — merge-by-collectionName regression coverage for #491 (empty input, pass-through, merge cases, sort-by-size, representative selection, input immutability).
- #481 / #483 / #486 / #488 Part 2 / #490 / #492 / #496 — manually verified by reporter and/or developer; full test coverage out of scope for the rename event hook and CSS visual regressions.

**Reporters:** @DigitalDreamn for #481, #487, #488 Part 2, #496 (and #487's diagnostic isolation that turned `needs-discussion` into a real code fix); @doctorwodka for #483, #486, and the #491 picker pushback; @doctorwodka also confirmed #482 verification feedback.

**Stability-window impact:** no reset — all eleven changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Eighth patch (0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 / 0.22.10 / 0.22.11 / 0.22.12) without a window reset.

---

### v0.22.11 Round-Up: Path Label Architecture, Person-Delete Hardening, and Universe Dropdown (v0.22.11)

Six fixes — three follow-ups to recent patches plus three new bugs. All non-data-loss. The #442 follow-up effectively closes [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478) (the broken-wikilink-on-save empty-string injection) by removing the trigger condition: wikilinks now sweep at delete time alongside the existing `_id` cleanup, plus a latent scalar-form bug in the original 0.22.7 cleanup is fixed for only-child / only-spouse cases. [#485](https://github.com/banisterious/obsidian-charted-roots/issues/485) closes the **lat/lng-only-on-pixel-CRS cluster** that ran across [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) / [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) — all three journey-mode sites now use pixel coordinates correctly on `CRS.Simple` image maps. Reporter mix: @DigitalDreamn for #472 follow-up + #442 follow-up + #485 (via #474) + #488 Part 1; @doctorwodka for #476 follow-up; @Lemmeron for #489 (first contribution).

All six changes are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14).

**Fix: Map path labels render upright on multi-waypoint paths via single-segment label-host** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472) follow-up):
- `src/maps/map-controller.ts` — the 0.22.10 longest-segment heuristic still left labels upside-down on some multi-waypoint paths, most visibly when two characters' journey paths shared the same visual segment in opposite traversal directions. Root cause: leaflet-textpath repeats the label along the entire polyline path and applies a single global 180° rotation when `orientation: 'flip'` is set. A path that bends in different screen-space directions can't be made upright everywhere by a single rotation — at least one segment will always render the label backward.
- Structural fix: render labels on a separate invisible "label-host" polyline that covers only the longest screen-space segment of the source polyline, with `opacity: 0` and `weight: 0` so the line itself doesn't draw. The visible polyline keeps its full multi-waypoint shape; the label renders once per polyline on its longest segment with the correct flip decision. `shouldFlipPathLabel` is replaced by `findLongestScreenSegment` and `createPathLabelHost`. Supersedes the longest-segment-as-flip-heuristic from 0.22.10.

**Fix: Person delete cleanup sweeps wikilinks and handles single-relationship scalars** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up):
- `src/core/person-delete-cleanup.ts` — two gaps in the original 0.22.7 cleanup, both surfaced by @DigitalDreamn's verification on the Lars / Star Wars fixture. (1) The cleanup planner swept `*_id` arrays but not the parallel wikilink-bearing relationship fields (`father`, `children`, `step_child`, etc.) — the original implementation delegated wikilink cleanup to Obsidian's native rewriting, but Obsidian only rewrites wikilinks on rename, not on delete. Deleted persons left broken `[[placeholder]]` links in referencing notes' frontmatter. (2) The "array" relationship fields are de-facto polymorphic: YAML serializers emit a scalar string when the field has a single element. The original cleanup's array-only branches silently skipped the scalar form, so deleting an only-child / only-step-child / only-spouse left the parent's `children_id` pointing at the dead cr_id.
- Fix extends the planner with a parallel wikilink-sweep branch (gated on the deleted file's basename) and converts every "array" field handler to accept both array and scalar shapes. Wikilink matching handles path-prefixed, display-aliased, heading-anchored, block-anchored, and `.md`-extensioned forms; comparison is case-insensitive. 24 new tests across scalar/array shapes, wikilink format normalization, polymorphic spouse handling, and combined sweeps.
- **Effectively closes [#478](https://github.com/banisterious/obsidian-charted-roots/issues/478)** by removing the trigger condition: the broken-wikilink + empty-string injection chain that #478 documented now can't fire because there are no broken wikilinks left after delete. The save-time injection path itself remains unmodified.

**Fix: Negative birth years preserve sign when followed by a letter suffix** ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476) follow-up):
- `src/dates/services/date-service.ts` — @doctorwodka's 0.22.10 verification showed the fix worked for `-90` but not for the original `DE -5740ish` repro. The 0.22.10 standalone-negative regex required a trailing `\b` (word boundary) after the captured digits, which fires correctly between a digit and whitespace / punctuation / end-of-string but NOT between a digit and a letter — both are word chars, so no boundary. Without the boundary, suffixed forms like `DE -5740ish` failed the negative-detection branch entirely and fell through to the bare-digits fallback, which strips the sign.
- Replaced the trailing `\b` with `(?=$|[^0-9])` lookahead so the negative-detection branch matches against any non-digit terminator. Also removed the duplicate `extractYear` implementation in the relationships renderer (a pre-existing bare `\b(\d{4})\b` regex that would have rendered any negative 4-digit year as positive in the relationships block — same class of bug as #476, on a different surface) and routed both call sites through the shared service helper. 3 new regression tests for the suffix case, the punctuation case, and the no-over-match case.

**Fix: Journey mode no longer briefly frames the bottom-left corner of CRS.Simple maps before flying to the first waypoint** ([#485](https://github.com/banisterious/obsidian-charted-roots/issues/485)):
- `src/maps/map-view.ts` — `applyJourneyFilter`'s initial `fitBounds` call read `marker.lat` / `marker.lng` only when computing the journey's framing rectangle. Pixel-coord places default lat/lng to 0, so on a custom image map (`CRS.Simple` / pixel coordinates) the bounds collapsed around `(0, 0)` — the bottom-left corner of the image — and the camera framed there briefly before `panToWaypoint` flew to the actual first waypoint. Reported by @DigitalDreamn during [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) verification.
- **Third site in the [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) / [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) cluster** (journey-path build dedup, camera fly-to and popup placement, now journey-mode framing — all the same lat/lng-only-on-pixel-CRS bug class). Fix mirrors #474's pattern: detect pixel CRS via `mapController.getCurrentCRS() === 'pixel'`, build bounds from each marker's `[pixelY, pixelX]` when available on pixel maps and from `[lat, lng]` otherwise. Geographic maps unaffected. Cluster fully closed.

**Feat: Edit Person modal's Universe dropdown reflects renamed and newly-created Universe notes** ([#488](https://github.com/banisterious/obsidian-charted-roots/issues/488) Part 1):
- `src/ui/control-center.ts` — `getCachedUniverses` previously sourced the dropdown from the distinct `universe:` field values found across person and place notes, not from the actual Universe notes in the universes folder. Renaming a Universe note (e.g. `Star Wars` → `Star Wars (AU)`) left the dropdown showing the old name because no person/place file had been updated to reference the new name yet, and a freshly-created Universe note was absent from the dropdown until the first character was assigned to it. Reported by @DigitalDreamn.
- Fix unions `UniverseService.getAllUniverses()` (the authoritative universe-notes folder) into `getCachedUniverses` alongside the existing person-graph and place-graph extractions, so renamed and newly-created Universe notes appear in the dropdown immediately. Doesn't touch the deeper rename-cascade question — referencing notes still hold the old name in their `universe:` field until a future bidirectional rename-handler updates them. Tracked as #488 Part 2 (closed in 0.22.12).

**Fix: Custom non-person `cr_type` notes no longer appear as people** ([#489](https://github.com/banisterious/obsidian-charted-roots/issues/489)):
- `src/core/family-graph.ts` — a note with `cr_type: hex` (or any user-defined type the plugin doesn't know about) was being treated as a person and listed in the control center's Person notes browser. `FamilyGraphService.extractPersonNode` ran an exclusion list — checking for the known non-person types (source, event, place, organization, proof_summary, universe, citation) and treating any `cr_id`-bearing note that didn't match as a person. User-defined custom types like `hex` or `faction` fell through every exclusion and got coerced into people.
- Fix adds an explicit `isPersonNote` inclusion check after the exclusion list. `isPersonNote` already handles the unknown-`cr_type` case correctly (returns false when `cr_type` is set to anything other than `person`), while preserving the legacy "cr_id with no `cr_type` → treat as person" behavior for older vaults that pre-date strict type-tagging. Reported by @Lemmeron — first contribution.

**Testing:** 32 new tests across this cycle, suite total 422 (was 390 at start).
- `tests/person-delete-cleanup.test.ts` (+24 tests) — wikilink sweep across path-prefixed / display-aliased / heading-anchored / block-anchored / `.md`-extensioned forms, scalar-form polymorphic field handling, combined sweeps. #442 follow-up.
- `tests/date-service-extract-year-suffix.test.ts` (+3 tests) — suffix case, punctuation case, no-over-match case for #476 follow-up.
- `tests/family-graph-person-detection.test.ts` (+5 tests) — `isPersonNote` inclusion check for #489.
- #472 / #485 / #488 — manually verified by reporter; Leaflet map mocking out of scope.

**Reporters:** @DigitalDreamn for #472 follow-up, #442 follow-up, #485 (via #474), and #488 Part 1; @doctorwodka for #476 follow-up; @Lemmeron for #489 (first contribution from this reporter).

**Stability-window impact:** no reset — all six changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Seventh patch (0.22.5 → 0.22.11) without a reset.

---

### v0.22.10 Round-Up: Negative Years, Modal Polish, Calendar Era Input, and Auto Regression (v0.22.10)

Five fixes — three new bugs and two follow-ups. Mix of new diagnostics from @DigitalDreamn (#459 follow-up modal overflow, #472 follow-up label flip refinement, #477 console-error regression caught and fixed within 24 hours of 0.22.9 ship), @doctorwodka's standalone-negative regex (#476), and a self-reported Calendar View era-input issue (#480). The 0.22.9 #472 fix introduced the #477 regression by passing leaflet-textpath an undocumented `'auto'` orientation value that fell through and got injected literally into the SVG transform attribute — caught quickly via console-error spam reports and reverted to the documented behavior.

All five changes are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14).

**Fix: Calendar View accepts era-suffixed years and round-trips them** ([#480](https://github.com/banisterious/obsidian-charted-roots/issues/480)):
- `src/calendar/calendar-view.ts` — the year-input field was a `<input type="number">` with a `min="0"` constraint, so users on fictional-era universes (Star Wars BBY/ABY, Middle-earth TA/SA, etc.) couldn't enter their era-formatted year strings. Constraint relaxed and input changed to `type="text"`. Change handler now routes through `DateService.parseDate`, accepting era-suffixed strings ("82 BBY", "1499 ABY", "30 AC"), ISO dates, and bare signed integers. When the parser resolves a fictional date, the system's universe is recorded alongside the canonical year (new `currentYearUniverse` field) so renders — including month-boundary rollovers — format via `formatCanonicalYear`. Persisted state gains a `yearUniverse` field so era context survives view reopens.
- The `year > 0` constraint was the visible blocker but the deeper issue was the Calendar View having its own year-rendering surface that wasn't era-aware — same DateService-bypass class as the cluster that ran 0.22.5 → 0.22.9, just on a different surface. Self-reported during the Calendar View capture session for the website-features-page media program.

**Fix: Create Place modal overflow and coord input width** ([#459](https://github.com/banisterious/obsidian-charted-roots/issues/459) follow-up):
- `styles/place-modals.css` — @DigitalDreamn re-verified after 0.22.8 and reported inputs *still* disappearing under the scroll bar. Diagnosis: 0.22.8's 220px input-width fix gave consistent widths but didn't address the underlying `flex-shrink: 0` on `.crc-create-place-modal .setting-item-info`. On narrow viewports descriptions held natural width and pushed the control column past the modal's right edge. Also during dev verification, the 220px rule was cascading into the Latitude/Longitude inputs (which have their own `width: 100%` rule) and winning on specificity, leaving 220px lat/long inputs with empty space to the right.
- Two fixes in this commit: drop `flex-shrink: 0` (info column shrinks, descriptions wrap, controls stay in frame) and bump `.crc-coord-inputs .setting-item-control input[type="text"]` specificity to win the source-order tie. Built and verified in dev vault.

**Fix: Use longest segment for map path label flip decision** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472) follow-up):
- `src/maps/map-controller.ts` — @DigitalDreamn verified 0.22.9's chord-based `shouldFlipPathLabel` heuristic. Result: previously-flipped line now correct, but a *different* diagonal still upside-down. The chord-based heuristic was too coarse for multi-waypoint paths where chord direction disagrees with the segment where the label actually renders.
- Refinement: helper now finds the longest segment in screen-space and uses its direction. Falls back to chord behavior naturally for 2-point paths. Also defensively flattens `getLatLngs()` for the `LatLng[][]` multi-polyline case. Closing more cases but not all — the structural fix follows in 0.22.11 (#472 final).

**Fix: Negative birth years preserve sign in `extractYear`** ([#476](https://github.com/banisterious/obsidian-charted-roots/issues/476)):
- `src/dynamic-content/services/dynamic-content-service.ts` — `extractYear` had four sign-bearing branches but no rule for custom-era formats with explicit standalone minus signs. The 4-digit-year regex `\b(\d{4})\b` matched the digits and dropped the leading `-` because `\b` (word boundary) eats it.
- New `(?:^|[^0-9])-(\d+)\b` branch captures standalone negatives while excluding ISO date separators (where the hyphen is between digits). 5 new tests in `tests/date-helpers.test.ts`. Reported by @doctorwodka — first contribution from this reporter.

**Fix: Stop passing `'auto'` orientation to leaflet-textpath** ([#477](https://github.com/banisterious/obsidian-charted-roots/issues/477)):
- `src/maps/map-controller.ts` — @DigitalDreamn reported a wall of console errors on 0.22.9: `setText` errors with `transform="rotate(auto cx cy)"`. Sharper bug than the #472 follow-up could fix: leaflet-textpath@1.3.0 only recognizes `'flip'` (180°), `'perpendicular'` (90°), or numeric rotations — `'auto'` is undocumented and falls through, getting injected literally into the SVG transform. Browser rejects each one as invalid. **0.22.9 regression** caused by the #472 fix's misunderstanding of leaflet-textpath's API.
- Fix omits the `orientation` key entirely when no flip is needed (per leaflet-textpath line 128 source `if (options.orientation)`, undefined skips the rotation block). Side effect: paths the helper correctly identifies as not-needing-flip now render cleanly instead of relying on the malformed transform — some of #472's remaining upside-down cases may resolve here too. Caught and fixed within 24 hours of 0.22.9 ship.

**Testing:** 8 new tests across this cycle, suite total 390 (was 382 at start).
- `tests/date-helpers.test.ts` (+5 tests) — standalone-negative regex for #476.
- `tests/calendar-view-era-input.test.ts` (+3 tests) — era-suffixed parsing for #480.
- #459 / #472 follow-up / #477 — manually verified by reporter.

**Reporters:** @DigitalDreamn for #459 follow-up, #472 follow-up, and #477 (caught the regression within 24 hours); @doctorwodka for #476 (first contribution); self-report for #480.

**Stability-window impact:** no reset — all five changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14. Sixth patch (0.22.5 → 0.22.10) without a reset.

---

### v0.22.9 Round-Up: Map Polish, Sibling Reality Windows, and Cluster Closure (v0.22.9)

Five fixes — all non-data-loss, mostly map and timeline polish on top of 0.22.8. Closes the **DateService-bypass cluster** that ran across 0.22.5 / 0.22.6 / 0.22.7 / 0.22.8 / 0.22.9 (eight subsystems total, all era-aware now); adds a third site to the **reality-window cluster** (sibling-births before focal birth); and wraps up the **pixel-coord coverage gaps** opened by [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) (build-path), with [#472](https://github.com/banisterious/obsidian-charted-roots/issues/472) (label flip) and [#474](https://github.com/banisterious/obsidian-charted-roots/issues/474) (camera fly-to) closing the follow path. Driven primarily by @DigitalDreamn's continued vault testing on the Lars / Star Wars fixture (four of five fixes); the fifth surfaced from her [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464) investigation thread.

All five changes are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14).

**Fix: Map time slider derives its year range from data and renders era-formatted labels** ([#453](https://github.com/banisterious/obsidian-charted-roots/issues/453)):
- `src/maps/map-view.ts` — slider min/max attrs now derive from `MapData.yearRange` (which already returns canonical signed years for fictional eras via [#454](https://github.com/banisterious/obsidian-charted-roots/issues/454)). Previously hardcoded to `1800` / `2000`, making the feature unusable on fictional-era universes — the slider's range never intersected the data.
- `src/dates/services/date-service.ts` — new `formatCanonicalYear(year, universe?)` helper inverts canonical years back to era-formatted strings ("82 BBY", "5 ABY") for slider min/max labels and the current-year display. Real-world dates and unconfigured universes fall back to `String(year)`.
- **Eighth and final site of the DateService-bypass cluster** that ran across 0.22.5 → 0.22.9 (data-quality validator, map popup ages, data-quality date inconsistencies, timeline ages, map marker popups, map year extraction, statistics dashboard, and now the time slider).
- New test file `tests/date-service-format-canonical-year.test.ts` (10 tests) covers era-formatted inversion across BBY / ABY / TA / SA, real-world fallback, and the universe-unconfigured path.

**Fix: Older siblings' births no longer appear before the focal person's birth on their timeline** ([#469](https://github.com/banisterious/obsidian-charted-roots/issues/469)):
- `src/dynamic-content/renderers/timeline-renderer.ts` — the sibling-births block in `gatherFamilyEvents` had no reality-window guard for events predating the focal person's birth. An older sibling's birth would render as the first entry on the focal person's own timeline — Padmé Naberrie's timeline showed her older sister Sola's birth (50 BBY) above Padmé's own birth (46 BBY), exposing the inconsistency.
- New `isEventBeforeFocalBirth(focalBirthDate, eventDate, universe)` helper symmetric to [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)'s `isEventAfterFocalDeath`. Same-year siblings (twins, close births) still surface — the guard fires only on unambiguous before-focal-birth via `DateService.getCanonicalYear`, so fictional descending eras (BBY) compare correctly. No focal birth date allows everything (current behavior for unknown-birth focal persons).
- **Third site of the reality-window cluster** alongside [#456](https://github.com/banisterious/obsidian-charted-roots/issues/456) (step-sibling filter) and [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457) (after-focal-death guard for spouse + parent surfaces). The pattern across all three: same `gatherFamilyEvents` block, two symmetric helpers (`isEventBeforeFocalBirth` / `isEventAfterFocalDeath`).
- Added 4 tests to `tests/timeline-reality-window.test.ts` mirroring the existing #457 suite (signed-year arithmetic, same-year admit, no-birth admit-all).

**Fix: Map path labels read consistently upright across CRS.Simple image maps and diagonal lines** ([#472](https://github.com/banisterious/obsidian-charted-roots/issues/472)):
- `src/maps/map-controller.ts` — leaflet-textpath's `'flip'` orientation mode picks rotation directly from latlng coordinates, which produces inconsistent results on diagonal lines and on `CRS.Simple` image maps where coordinate orientation differs from screen orientation. Some labels rendered upright, others upside-down on the same map.
- New `shouldFlipPathLabel(polyline)` helper computes the path's overall direction in screen-space (after CRS projection via `latLngToLayerPoint`) and chooses `'flip'` or `'auto'` accordingly. Both migration-path and journey-path label callsites now use it. The pre-existing leaflet-textpath flip remains a fallback for the unlikely case where the map ref isn't yet wired.
- Pixel-coord coverage closure (alongside [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) journey-path build dedup and #474 camera fly-to below). Surfaced once #448 unblocked pixel-coord journey rendering and made the label feature visible for the first time on @DigitalDreamn's Star Wars galaxy fixture.

**Fix: Journey-mode camera flies to pixel-coord waypoints on CRS.Simple image maps** ([#474](https://github.com/banisterious/obsidian-charted-roots/issues/474)):
- `src/maps/map-view.ts` — `panToWaypoint` only consulted `waypoint.lat` / `waypoint.lng` for the camera fly-to and rich-popup placement. Pixel-coord places default lat/lng to `0` (per the journey waypoint construction), so the camera flew to `(0, 0)` — bottom-left corner of `CRS.Simple` — and the popup opened there too, even though the popup *content* correctly named the right place.
- Now uses `[pixelY, pixelX]` when on pixel CRS and the waypoint has pixel coords; falls back to `[lat, lng]` for geographic maps. Same coord-system-aware pattern as [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448), which fixed the journey-path *build* path; this fixes the camera-*follow* path. Pixel-coord coverage closure round-three.
- Reported by @DigitalDreamn during [#434](https://github.com/banisterious/obsidian-charted-roots/issues/434) verification, after #448 unblocked pixel-coord journeys and made the camera-mismatch newly visible. Manually verified against her vault; no new tests since Leaflet map mocking is out of scope for the current harness.

**Fix: Place notes silently excluded from the place graph now log a warning** ([#471](https://github.com/banisterious/obsidian-charted-roots/issues/471)):
- `src/core/place-graph.ts` — `PlaceGraphService.extractPlaceNode` early-returns when a place-shaped note lacks a `cr_id`, so such notes never enter `placeCache`. By-name lookups (`getPlaceByName`), Create Place modal's parent dropdown, map markers, and downstream consumers can't see them. The exclusion was completely silent — no log, no UI surface, no data-quality flag.
- Added a `warn`-level log on the skip with the file path so the exclusion is now discoverable from the dev console. A follow-up data-quality wizard check that surfaces and offers to fix missing-`cr_id` places is queued for a later cycle.
- Surfaced during the [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464) investigation as one of the candidate root causes for "by-name lookup returned undefined for a place that exists in the vault" — Coruscant in @DigitalDreamn's vault was created via the Organizations flow on April 8th and may not have generated a place-side `cr_id` at that time.

**Testing:** 14 new tests across two files, suite total 390 (was 376 at start of this cycle).
- `tests/date-service-format-canonical-year.test.ts` (10 tests) — era-formatted label inversion for #453.
- `tests/timeline-reality-window.test.ts` (+4 tests) — before-focal-birth guard for #469 (added to the existing file).
- #471 / #472 / #474 — manually verified by reporter; Leaflet map mocking and console-spy harnesses out of scope for the current vitest setup.

**Reporters:** @DigitalDreamn for #453, #469, #472, #474 (four of five, all from continued Lars / Star Wars vault testing); the #471 diagnostic surfaced from her #464 investigation thread.

**Stability-window impact:** no reset — all five changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14.

---

### v0.22.8 Round-Up: Map, Timeline, Statistics, and Modal Polish (v0.22.8)

Nine fixes addressing eleven issues — biggest 0.22.x patch, all non-data-loss. Driven mostly by @DigitalDreamn's continued vault testing on the Lars / Star Wars fixture (eight of eleven), with @doctorwodka contributing the marriage-statistics report (first contribution). Pattern of the cluster: every fix is a parallel surface or write-path gap that a previous round-up partially closed. The DateService-bypass cluster claimed two more sites (#454 map year extraction, #437 follow-up Statistics Dashboard counter) — count is now seven distinct subsystems where era-naive year extraction silently broke fictional dates. Create/edit asymmetry pattern surfaced again in the Place modal (#463). Marker color and popup label gaps fell out of #438's verification.

All eleven changes are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14).

**Fix: Statistics Dashboard date-inconsistency counter respects fictional eras** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437) follow-up):
- `src/statistics/services/statistics-service.ts` — `extractYear` now defers to `DateService.parseDate` first when a fictional calendar resolves the input. Constructor takes an optional `plugin` ref to reach the date service; both production callers (`statistics-tab.ts`, `statistics-view.ts`) updated to pass it. Falls through to the existing regex for real-world dates.
- The 0.22.6 fix routed `data-quality.ts`'s `parseYear` through `DateService` for fictional-era awareness, but this Statistics Dashboard surface is a separate code path with its own `extractYear` regex. For BBY descending eras, the digit-run got read as a positive number (`1045 BBY` → 1045) and the naive `birthYear > deathYear` check fired on coherent lifespans. Same fix shape as #437 / #454; seventh DateService-bypass site surfaced and fixed since the cluster started.

**Fix: Map year extraction respects fictional eras** ([#454](https://github.com/banisterious/obsidian-charted-roots/issues/454)):
- `src/maps/map-data-service.ts` — `MapDataService.extractYear` previously required a 4-digit numeric year, so fictional-era timestamps under 1000 like `82 BBY` / `41 BBY` parsed as `undefined`. Broke chronological sort on fictional-era timelines, dropped events from year-range filters, and downstream contributed to the "no journey path built" symptom on fictional-calendar maps before [#448](https://github.com/banisterious/obsidian-charted-roots/issues/448) was identified as the actual root cause. `extractYear` now defers to `DateService.parseDate` first, picking up the canonical signed year (negative for descending eras) so existing numeric comparisons stay coherent. Falls back to the legacy 4-digit regex when DateService isn't available.
- Sixth DateService-bypass surface (alongside #433, #434, #437, #439, #444); paired with #437 follow-up above to bring the count to seven.

**Fix: Marriage statistics respect the fictional-dates age cap** ([#458](https://github.com/banisterious/obsidian-charted-roots/issues/458)):
- `src/statistics/services/statistics-service.ts` — two marriage-stat surfaces had a hardcoded `<= 80` upper bound that bypassed the `maxAge` getter the rest of the engine uses. With `enableFictionalDates` on, `maxAge` returns `Infinity` to admit long-lived characters; the hardcoded `80` silently dropped marriages over that threshold. `getMarriagePatternAnalysis` (age at first marriage) and `computeLongestMarriages` (marriage duration) now both defer to `this.maxAge`. Real-world cap widens 80 → 120 to match the lifespan cap used elsewhere.
- New test file `tests/statistics-marriage-age-cap.test.ts` (6 tests) covers the cap behavior across both surfaces and fictional/real-world modes.

**Fix: Map journey paths build correctly for pixel-coord places** ([#448](https://github.com/banisterious/obsidian-charted-roots/issues/448)):
- `src/maps/map-data-service.ts` — `buildJourneyPaths` previously deduped consecutive waypoints by comparing `lat` and `lng` only. On custom image maps, every pixel-coord place uses `pixel_x` / `pixel_y` and defaults `lat` / `lng` to `0`, so all pixel-coord waypoints shared `(0, 0)` and the dedup collapsed all of them into a single entry. The "≥ 2 unique waypoints" check then failed silently, and journey playback was unavailable for fictional-map vaults regardless of how many places were authored.
- `src/maps/types/map-types.ts` — new `journeyWaypointDedupKey` helper prefers `placeId` when available and falls back to a composite of both coordinate systems so pixel-coord and geographic places no longer collide on each other's defaults.
- Was the actual root cause of "no play button on Cliegg Lars" through the entire #434 thread. The #445 placeholder correctly diagnosed "no journey built" but the underlying cause was dedup collapse, not insufficient input.

**Fix: Custom-relationships overlay arcs paint on top of family-link layer in the typical case** ([#450](https://github.com/banisterious/obsidian-charted-roots/issues/450)):
- `src/family-tree/family-chart-view.ts` — the original "always paint under family links" decision from [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) was meant to protect structural lines from being occluded by heavy overlay stacks (3+ arcs on a single endpoint pair). But it also hid the typical case where only one or two non-stacked arcs exist — overlay arcs disappeared behind family links instead of layering over them. Renderer now paints the overlay group ON TOP of `links_view` by default and falls back to the original "under" behavior only when at least one endpoint pair has 3+ overlay arcs stacked on it (preserves the [#386](https://github.com/banisterious/obsidian-charted-roots/issues/386) heavy-stack guarantee).
- New `shouldPaintOverlayUnderLinks(maxArcStackDepth)` helper in `src/family-tree/family-chart-overlay-z.ts` returns `true` only when depth ≥ 3.
- Surfaced during a Custom Relationships Overlay motion-capture demo setup; the visual problem made the demo not worth recording until the z-order was fixed.

**Fix: Timeline filters relative events outside the focal person's reality window** ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456), [#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)):
- `src/dynamic-content/renderers/timeline-renderer.ts` — two related leaks where the timeline surfaced events that didn't fit the focal person's lived experience. **Step-siblings' births** appeared on each other's timelines because the sibling-iteration walked each parent's `childrenCrIds` without distinguishing biological from step-children — Anakin's timeline showed Owen's birth even though they share only a stepparent ([#456](https://github.com/banisterious/obsidian-charted-roots/issues/456)). **Spouse deaths** surfaced on the survivor's timeline even when the survivor pre-deceased the spouse — Shmi's timeline showed Cliegg's death even though Shmi died first ([#457](https://github.com/banisterious/obsidian-charted-roots/issues/457)).
- Paired fix: step-sibling filter mirroring the [#441](https://github.com/banisterious/obsidian-charted-roots/issues/441) stepchild treatment (skip any id present in any parent's `stepchildrenCrIds` from the sibling-births iteration), plus a new `isEventAfterFocalDeath` helper using `DateService.getCanonicalYear` so fictional descending eras (BBY) compare correctly. Audit covered parent deaths in the same pass — those now also skip when the parent died after the focal person did. Same-year events allowed (intra-year ordering unknown). No death date on focal person allows everything (current behavior for living persons).
- New test file `tests/timeline-reality-window.test.ts` (8 tests) covers the step-sibling filter and the focal-death guards across spouse and parent surfaces.

**Fix: Person-delete cleanup now sweeps the `step_child_id` field on stepparents' notes** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442) follow-up):
- `src/core/person-delete-cleanup.ts` — the cleanup planner shipped in 0.22.7 listed `stepchild_id` (no underscore) in its scan list, but the bidirectional-linker — the only code that writes the stepchild→stepparent reverse-link onto a stepparent's frontmatter — uses `step_child_id` (underscore between `step` and `child`). Two parallel hardcoded lists never matched, so deleting a person who was a stepchild on someone else's note left their cr_id stranded in the stepparent's `step_child_id` array even though every other relationship array got cleaned. Renamed the entry to `step_child_id` so the cleanup matches the field the rest of the plugin actually writes; the dropped `stepchild_id` form was a phantom, never written by anything.

**Fix: Create Place modal recognizes parents created earlier in the same session and writes their cr_id** ([#463](https://github.com/banisterious/obsidian-charted-roots/issues/463), [#464](https://github.com/banisterious/obsidian-charted-roots/issues/464)):
- `src/ui/create-place-modal.ts` — two bundled bugs sharing a stale `placeGraph` cache root cause. `PlaceGraphService.ensureCacheLoaded` only loads when the cache is empty, so newly-created place notes weren't visible to subsequent Create Place modal invocations in the same session. Symptoms: typing an existing parent's name produced a spurious "<parent> doesn't exist" auto-create prompt ([#464](https://github.com/banisterious/obsidian-charted-roots/issues/464)); saving anyway wrote only the `parent_place` wikilink without the companion `parent_place_id`, leaving a dual-storage half-write that only resolved after a subsequent Edit + Save round trip ([#463](https://github.com/banisterious/obsidian-charted-roots/issues/463)).
- Two-part fix: (1) refresh the cache when the modal opens so the dropdown sees the current vault state; (2) in `checkForMissingParent`, when a typed parent name matches an existing place via `getPlaceByName`, populate `parentPlaceId` and `parentPlace` from the resolved node and clear `pendingParentPlace` before the auto-create branch fires.
- Same class as the create/edit asymmetry meta-pattern called out in [#411](https://github.com/banisterious/obsidian-charted-roots/discussions/411): the Edit modal's load+save round trip eventually resolves `parent_place_id` correctly via the place graph, but the Create write-path skipped the companion field write.

**Fix: Map popups for custom (`cr_type: event`) markers surface the original event type** ([#466](https://github.com/banisterious/obsidian-charted-roots/issues/466)):
- `src/maps/types/map-types.ts` — `LifeEvent` and `MapMarker` both gain `customLabel?: string`. Carries the raw user-authored event type (or event-note title) when the resolved `MarkerType` collapses to `custom`.
- `src/maps/map-data-service.ts` — `parseEventsArray` (inline events on the person's frontmatter) and `loadExternalEventsForPerson` (external `cr_type: event` notes) populate `customLabel` from the raw `event_type` or the `EventNote.title` when the resolved type is `custom`. Marker construction threads the field through.
- `src/maps/map-controller.ts` — `createPopupContent` uses `customLabel` (capitalized) as the popup type label when `data.type === 'custom'` and a label is available; falls back to the literal `Custom:` only when neither raw event_type nor title exists. Built-in event-type popups (birth, death, marriage, etc.) are unchanged.
- New test file `tests/map-popup-custom-label.test.ts` (3 tests) fences the customLabel propagation.

**Fix: Custom event marker color is now visually distinct from death event markers** ([#465](https://github.com/banisterious/obsidian-charted-roots/issues/465)):
- `src/maps/types/map-types.ts` and `src/maps/map-view.ts` — both hardcoded defaults for `customMarkerColor` changed from pink (`#ec4899`) to yellow (`#eab308`). Pink sat too close to death red (`#ef4444`) on dense maps, making custom event markers hard to distinguish from death markers when scanning.
- Map color settings aren't user-persisted yet (per the TODO in `getMapSettings`), so this applies on next plugin load with no migration needed.

**Fix: Create Place modal text inputs render at consistent widths** ([#459](https://github.com/banisterious/obsidian-charted-roots/issues/459)):
- `styles/place-modals.css` — text inputs in the Create Place modal now render at a fixed 220px width regardless of description length. Without this, rows with long descriptions (Universe, Parent place) had narrower inputs than rows with short descriptions (Name, Aliases, Collection) because the existing `flex-shrink: 0` rule on `.setting-item-info` meant the description column couldn't yield space back to the control column.

**Fix: Wikipedia clipper template renders infobox photos correctly in Obsidian** ([#440](https://github.com/banisterious/obsidian-charted-roots/issues/440)):
- `docs/clipper-templates/wikipedia-biography-basic.json` — protocol-relative image URLs (`<img src="//upload.wikimedia.org/...">`) preserved in the infobox HTML can't be resolved by Obsidian's `app://` renderer, so infobox photos rendered as broken-image icons in reading mode. Added a `replace` filter to the `selectorHtml:.infobox` extraction that rewrites `="//` to `="https://` so the preserved HTML carries valid absolute URLs.
- Re-import the template in Web Clipper to pick up the fix; not part of a versioned plugin release since clipper templates ship via `docs/clipper-templates/`.

**Testing:** 33 new tests across five files for a suite total of 376 (was 343 at start of this cycle).
- `tests/map-data-service-extract-year.test.ts` (10 tests) — fictional-era support and the legacy regex fallback for #454.
- `tests/statistics-marriage-age-cap.test.ts` (6 tests) — marriage age and longest-marriages caps for #458.
- `tests/timeline-reality-window.test.ts` (8 tests) — step-sibling filter and focal-death guards for #456 / #457.
- `tests/map-popup-custom-label.test.ts` (3 tests) — customLabel propagation for #466.
- `tests/statistics-extract-year-fictional.test.ts` (6 tests) — DateService routing for #437 follow-up.

**Reporters:** @DigitalDreamn for #437 follow-up, #442 follow-up, #448, #450 (overlay observation), #454, #456, #457, #459, #463 + #464, #465, #466 (eight of eleven, all from continued Lars / Star Wars vault testing). @doctorwodka for #458 (first contribution).

**Stability-window impact:** no reset — all eleven changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14.

---

### v0.22.7 Round-Up: Map UX, Stepchild Handling, and Universe-Calendar Linking (v0.22.7)

Seven changes shipped in one bundle, six of them follow-ups from @DigitalDreamn's testing on her Star Wars / Lars-family vault. Three came from the post-#434 reply chain after she walked through the marker popup, fullscreen control, and journey-mode UX (#444, #445, #446). Three more fell out of the #439 timeline-fix verification when stepchildren and orphaned cr_ids surfaced in the same screenshots (#441, #442, #443). Plus the #432 Phase 1 universe-calendar wiring landed (the contract decision recorded earlier in the v0.22.5 cluster), and `timelineShowSpouseDeaths` flipped on by default (#447) so widow/widower context surfaces without setting discovery.

All seven are non-data-loss. Stability window continues unchanged from 0.22.4 (2026-04-23 → ~2026-05-14).

**Feature: Universe → default calendar wiring** ([#432](https://github.com/banisterious/obsidian-charted-roots/issues/432) Phase 1):
- `src/universes/ui/universe-wizard.ts` — wizard step 2 now offers a three-way picker (None / Built-in / Custom) replacing the binary "create custom calendar?" toggle. Built-in mode shows a dropdown of `DEFAULT_DATE_SYSTEMS`. When the universe name slug-matches a built-in's `universe` field, that built-in is preselected (Star Wars → Galactic Standard, Middle-earth → Middle-earth Calendar, "Star Wars Legends" via slug-superset).
- `src/universes/ui/edit-universe-modal.ts` — new Calendar field listing built-ins plus user-defined custom calendars from settings, with `(unset)` clearing the link. Calendars no longer in the available list show as "(missing)" so users don't silently lose values.
- `src/universes/ui/universes-tab.ts` — entity-counts cell on each row now has a "Default: <name>" sub-line when `default_calendar` is set.
- `src/universes/ui/calendar-suggest.ts` — extracted `universeNameToSlug` and `suggestBuiltinForUniverseName` into their own module so unit tests can exercise the slug-match logic without pulling `Modal` in via the wizard's main file.
- Layered contract per [docs/planning/universe-calendar-linking.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/universe-calendar-linking.md): `universe.default_calendar` is the explicit pointer, the parser is unchanged and continues to use global era-abbreviation matching at parse time. Existing universes with no `default_calendar` continue to behave as before — no migration. Phase 2 (parser-side reading, bare-year inference) deferred to a separate issue.

**Change: Spouse-deaths-on-timeline default flipped to `true`** ([#447](https://github.com/banisterious/obsidian-charted-roots/issues/447)):
- `src/settings.ts` — `DEFAULT_SETTINGS.timelineShowSpouseDeaths` flipped from `false` to `true`. Existing users who haven't customized the setting will start seeing spouse deaths appear on surviving spouses' timelines after upgrading. Toggle remains in place for opt-out. Filed off DigitalDreamn's observation that the only place "widowed" status surfaced automatically was the Properties panel.

**Fix: Person-delete cleanup for orphaned cr_ids** ([#442](https://github.com/banisterious/obsidian-charted-roots/issues/442)):
- `src/core/person-delete-cleanup.ts` (new) — `planFrontmatterCleanup` rules engine over a single note's frontmatter, `cleanupPersonReferencesAfterDelete` walks the vault and applies the plan via `fileManager.processFrontMatter`, `getDeletedPersonCrId` recovers the cr_id from `metadataCache`'s `prevCache` callback argument.
- `main.ts` — registers a `metadataCache.on('deleted')` handler that gates on person-note-only and removes the deleted cr_id from canonical scalar fields (`father_id`, `mother_id`, `adoptive_*_id`), array fields (`parents_id`, `step*_id`, `adoptive_parent_id`, `adopted_child_id`, `partners_id`, `children_id`, `stepchild_id`), the polymorphic `spouse_id` (string or array), and indexed-spouse slots (`spouse1_id`, `spouse2_id`, ...). Honors property aliases.
- Existing vault-wide orphans from prior deletes still go through the data-quality "Remove orphaned cr_id references" tool — that path is untouched.

**Fix: Stepchildren on stepparent timelines and in profile pane** ([#441](https://github.com/banisterious/obsidian-charted-roots/issues/441), [#443](https://github.com/banisterious/obsidian-charted-roots/issues/443)):
- `src/core/family-graph.ts` — PersonNode gains `stepchildrenCrIds: string[]`, populated in the second pass by inverting each child's `stepfatherCrIds` / `stepmotherCrIds`. Mirrors the existing `adoptedChildCrIds` reverse-walk pattern.
- `src/core/cross-import-detection.ts` and `src/core/canvas-split.ts` — initialize and filter the new field at the construction sites that build PersonNodes.
- `src/dynamic-content/renderers/timeline-renderer.ts` — `gatherFamilyEvents` skips any childCrId in `stepchildrenCrIds` from the children-births block. Adopted-children handling unchanged.
- `src/profile-view/sections/relationships-section.ts` — Children block de-duplicates by labeling adopted and step children with their specific category and falling back to "Child" only when neither marker applies. A child validly in both biological and step arrays now renders as "Stepchild" (specificity wins).

**Fix: Map marker popup ages and date ranges** ([#444](https://github.com/banisterious/obsidian-charted-roots/issues/444)):
- `src/maps/types/map-types.ts` — `MapMarker` gains `birthDate?: string`, plus a new `formatPopupDateRange` helper that renders `from – to` for true durations and collapses identical / single-sided cases.
- `src/maps/map-data-service.ts` — both `createMarkerFromPlace` and `createMarkerFromEvent` populate `birthDate` from `person.born`, mirroring the JourneyPath shape from #434.
- `src/maps/map-controller.ts` — `createPopupContent` formats the date row through `formatPopupDateRange` and appends `(age N)` for non-birth events when `DateService.calculateAge` resolves a non-negative age. Same `age.error` guard pattern as #439 to skip descending-era false positives. Birth events suppress the age annotation since age 0 is redundant alongside the birth date itself.
- Sibling fix to #434 — same fix shape on a separate code path; fifth surface in the DateService-bypass cluster alongside #433, #437, #439.

**Fix: Map journey mode explains why playback isn't available** ([#445](https://github.com/banisterious/obsidian-charted-roots/issues/445)):
- `src/maps/map-view.ts` — `applyJourneyFilter` now renders an inline placeholder where the playback panel would have appeared when the selected person has fewer than 2 unique resolvable waypoints. The placeholder names the person and states what's needed; reuses `journeyControlsEl` so existing teardown clears it cleanly.
- `styles/map-view.css` — `.cr-map-journey-controls--empty` and `.cr-map-journey-empty-message` modifiers for the placeholder variant.

**Fix: Map fullscreen control tooltip** ([#446](https://github.com/banisterious/obsidian-charted-roots/issues/446)):
- `src/maps/map-controller.ts` — `initializeFullscreen` now passes `title` to `leaflet-fullscreen` as `{ 'false': 'Enter fullscreen', 'true': 'Exit fullscreen' }` (the option shape the plugin actually expects). The previous flat-string form caused `options.title['false']` to evaluate to `undefined`, which got rendered verbatim as the tooltip.

**Testing:** 51 new tests across five files for a suite total of 330 (was 279 at the start of this cycle).
- `tests/map-marker-popup-data.test.ts` (12 tests) — `formatPopupDateRange` and `MapMarker.birthDate` population for #444.
- `tests/universe-calendar-suggest.test.ts` (12 tests) — `universeNameToSlug` and `suggestBuiltinForUniverseName` for #432 Phase 1.
- `tests/timeline-stepchildren.test.ts` (4 tests) — stepchild filtering on the timeline gathering path for #441.
- `tests/person-delete-cleanup.test.ts` (23 tests) — scalar / array / polymorphic / indexed-spouse / property-alias / non-person handling for #442.
- No new tests for #443, #445, #446, #447 — DOM rendering / settings-default flips / config-shape changes that don't have a fence-able pure surface, but the data-model changes that power them are covered by #441 and #444 tests.

**Reporters:** @DigitalDreamn for #441, #442, #443, #444, #445, #446 (the entire vault-testing chain off #434 and #439 verification).

**Stability-window impact:** no reset — all seven changes are non-data-loss. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14.

---

### v0.22.6 Fix: Fictional-Era Coverage Round-Up (v0.22.6)

Three non-data-loss fixes that all share the same DateService-bypass root cause first surfaced in v0.22.5's #433 / #434 cluster. Two of the three were filed during v0.22.5 testing and reflection (#437, #438); the third was filed and fixed off DigitalDreamn's verification follow-up on #434, where a screenshot revealed a *fourth* surface where the same naive year-subtraction pattern lived (#439). Pattern of the cluster: when a feature was scaffolded for real-world dates and a fictional-calendar surface was added later, the surface inherited the wrong arithmetic.

**Fix: Date-inconsistency checks respect fictional eras** ([#437](https://github.com/banisterious/obsidian-charted-roots/issues/437)):
- `src/core/data-quality.ts` — `parseYear` now accepts an optional `universe` and defers to `DateService.parseDate` first, returning the canonical signed year (negative for descending eras like BBY, positive for ABY). Cross-era arithmetic stays coherent across all six date-inconsistency check codes (`DEATH_BEFORE_BIRTH`, `UNREASONABLE_AGE`, `BORN_BEFORE_PARENT`, `PARENT_TOO_YOUNG`, `PARENT_TOO_OLD`, `BORN_AFTER_PARENT_DEATH`). New `isFictionalDate` helper gates `FUTURE_BIRTH` / `FUTURE_DEATH` (the only checks that compare against the real-world current year) — they're now skipped when the person's dates resolve as fictional. Real-world comparisons unchanged.

**Fix: Map journey surfaces life events from `cr_type: event` notes** ([#438](https://github.com/banisterious/obsidian-charted-roots/issues/438)):
- `src/maps/map-data-service.ts` — `getPersonData` now also calls `EventService.getEventsForPerson` for each person and normalizes the returned `EventNote`s into the same `LifeEvent` shape the journey already understands. The two sources are merged with a dedup key (`event_type | place(unwrapped) | date_from`); inline entries win on conflict. Birth / death / marriage / divorce stay filtered out so dedicated-field waypoints aren't doubled. New `coerceDateValue` helper normalizes YAML `Date` objects (unquoted ISO dates like `date_from: 1905-04-05`) into ISO strings so the chronological sort doesn't drop them. For dev-vault-style schemas (which use external event notes), journeys previously collapsed down to whatever the dedicated frontmatter milestones supported — often two or three waypoints across an entire life.

**Fix: Timeline dynamic block respects fictional eras when annotating ages** ([#439](https://github.com/banisterious/obsidian-charted-roots/issues/439)):
- `src/dynamic-content/services/dynamic-content-service.ts` — added `getDateService()` accessor on the service so renderers can reach the plugin's date service without a direct plugin reference.
- `src/dynamic-content/renderers/timeline-renderer.ts` — new `computeEventAge(birthDate, eventDate, universe)` helper that defers to `DateService.calculateAge` and falls back to naive year subtraction only for real-world dates or when DateService isn't available. The helper checks `AgeCalculation.error` so it doesn't fall through to the naive path after the fictional parser has already flagged the dates as reversed. Replaced eight call sites: the person's own events, `parseContextNote`, six entry-builders inside `gatherFamilyEvents` (children's births, spouse / parent deaths, sibling births, adoptions, adopted children's births), and the marriage / divorce paths in `buildTimelineEntries`. Also dropped the `birthYear: number` parameter from `gatherFamilyEvents` and `parseContextNote` since they now read `birthDate` and `universe` from the context's person object directly.

**Testing:** 38 new tests across three files. `tests/data-quality-fictional-dates.test.ts` (10 tests) covers BBY-span coherence, parent-child ordering across descending eras, and FUTURE-check skipping for #437. `tests/map-data-service-life-events.test.ts` (13 tests) covers merge / dedup / wikilink-vs-raw normalization / date coercion for #438. `tests/timeline-renderer-age.test.ts` (15 tests) covers BBY span ages (the actual Cliegg Lars numbers), era crossings, real-world dates, fallback when DateService is unavailable, and missing/invalid inputs for #439. Suite total: 279 tests.

**Reporter:** @DigitalDreamn for the verification follow-up on #434 that surfaced #439's screenshot.

**Stability-window impact:** no reset — three non-data-loss fixes. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14.

---

### v0.22.5 Fix: Fictional-Calendar Gaps and Dynamic-Content Noise (v0.22.5)

Three non-data-loss fixes surfaced during triage of @DigitalDreamn's Star Wars universe setup ([#428](https://github.com/banisterious/obsidian-charted-roots/discussions/428)) and #429 investigation. The trace revealed that `DateService` — the central entry point for standard + fictional date parsing — existed as an exported class but was never instantiated on the plugin, so every consumer that might have used it was either silently degrading to numeric-year logic or flagging fictional dates as invalid. This release wires the service up and brings three surfaces into the fold.

**Groundwork: Wire `DateService` onto the plugin.** Instantiated alongside the other long-lived services in `onload()` and refreshed inside `saveSettings()` so consumers always see the current fictional-date configuration. Groundwork for [#432](https://github.com/banisterious/obsidian-charted-roots/issues/432), and a prerequisite for both #434 and #433. Exposed via `plugin.getDateService()`.

**Fix: Map popup age and duration respect fictional calendars** ([#434](https://github.com/banisterious/obsidian-charted-roots/issues/434)):
- `src/maps/types/map-types.ts` — added `birthDate?: string` to `JourneyPath` so the raw input is preserved alongside the extracted `birthYear`.
- `src/maps/map-data-service.ts` — populated `birthDate` when assembling journey paths.
- `src/maps/map-view.ts` — threaded the whole `JourneyPath` through `journeyStep` / `toggleJourneyPlayback` / `panToWaypoint` / `buildRichWaypointPopup` (replacing the bare `birthYear?: number` param), and swapped the numeric-subtraction age and duration calculations for `DateService.calculateAge(birthDate, waypointDate, universe)` with a numeric fallback when the service isn't available.

**Fix: Data-quality validator accepts fictional dates** ([#433](https://github.com/banisterious/obsidian-charted-roots/issues/433)):
- `src/core/data-quality.ts` — `isStandardDateFormat` and `normalizeDateString` now take an optional `universe` argument and defer to `DateService.parseDate` when the real-world regex gates fail; a string that parses as fictional counts as recognized. All six callers (two in `checkDataFormat`, two in the `Fix all` normalizer, two in the preview path) pass the person's universe through. `NON_STANDARD_DATE` no longer fires for `22 BBY`-style inputs on persons scoped to a universe with an active fictional calendar, and the bulk-normalize path stops trying to rewrite them toward `YYYY-MM-DD`.

**Fix: Dynamic-content processors skip cleanly when the source file is missing** ([#431](https://github.com/banisterious/obsidian-charted-roots/issues/431)):
- `src/dynamic-content/services/dynamic-content-service.ts` — `buildContext` now returns `null` with a warn log instead of throwing `Could not find file: …` when `app.vault.getAbstractFileByPath` can't resolve `ctx.sourcePath`. Matches the skip-and-warn pattern `BidirectionalLinker` already uses.
- All 18 callsites across `media-processor`, `timeline-processor`, `relationships-processor`, `sources-processor`, `transfers-processor`, and `extractions-processor` — initial renders and every re-render closure inside `metadataCache.on('changed')` and `vault.on('create')` handlers — now bail out cleanly when the context can't be built. Fixes a DevTools console flood triggered on every metadata tick whenever a container note was renamed or deleted before Obsidian cleaned up the `MarkdownRenderChild`.

**Testing:** No new unit tests this release; changes are behavior-threading and null-guard additions that existing suites cover. Suite remains at 241 tests. Verified manually against the #428 repro (Galactic Standard Calendar behavior on a `universe-star-wars-<suffix>` universe) and the #431 repro (rename a frontmatter-linked note with a dynamic block open).

**Reporter:** @DigitalDreamn for the underlying discussion and repros that surfaced all three gaps.

**Stability-window impact:** no reset — three non-data-loss fixes. Window continues from 0.22.4's start: 2026-04-23 → ~2026-05-14.

---

### v0.22.4 Hotfix: Step-Parent Save Path (v0.22.4)

Critical data-loss regression. Opening Edit Person on an existing person note, linking a step-father or step-mother, and hitting Save showed a success notice, but the step-parent fields were silently dropped — never written to the file. A classic create/edit asymmetry: the modal's save payload emitted the fields, `createPersonNote` handled them correctly, but `updatePersonNote` had no step-parent branch. The load path was also incomplete, so existing step-parent values in frontmatter never round-tripped into the modal on open.

**Fix: Close the three-way step-parent gap** ([#429](https://github.com/banisterious/obsidian-charted-roots/issues/429)):
- `src/plugin/relationship-loader.ts` — extended `LoadedRelationships` with `stepfatherName/Id` and `stepmotherName/Id` singletons; added extraction with the same wikilink-fallback pattern used for adoptive parents (supports explicit `stepfather_id`, falls back to name-resolution, falls back to basename match).
- `src/plugin/bulk-operations.ts` — destructured the new step-parent fields from the loader and added them to the `editPersonData` passed to the Edit Person modal.
- `src/core/person-note-writer.ts` — added step-father and step-mother write branches to `updatePersonNote`, mirroring the adjacent adoptive-parent pattern. Handles array inputs (as `createPersonNote` does), supports the single-slot case the modal actually uses (length 1), and clears frontmatter correctly when the user unlinks.

**Track B (Universe / Collection wipe) — not reproduced:** Reporter also observed existing Universe and Collection fields being cleared during the same broken save. We could not reproduce this in a clean post-fix environment (fixture with `universe: Star Wars` + `collection: Test 429 Collection` pre-set, step-mother linked, saved — both fields preserved). Code-tracing the Universe / Collection dropdown logic found no path from normal step-parent save to unrelated-field clearing. Most likely explanation: user-state-dependent interaction (an unintentional click on the Universe or Collection dropdown triggering the `__custom__` onChange path, which sets the closure value to `undefined` and saves as an empty string, which the writer treats as a clear). If the wipe recurs post-0.22.4, we'll reopen with a new reproducer.

**Testing:** 6 new regression tests in `relationship-loader.test.ts` covering the step-parent load path (no data, explicit IDs, wikilink fallback, basename fallback, stepmother parity, coexistence with adoptive parents). Suite grows from 235 to 241 tests.

**Reporter:** @DigitalDreamn (fifth bug surfaced this week, three of which were critical data-loss).

**Stability-window impact:** critical data-loss regression triggers the window reset per VERSIONING.md. The 3-week BRAT stability window re-starts from this release; new end-date ~2026-05-14.

---

### v0.22.3 Fix: Cross-Entity Collections Aggregation (v0.22.3)

Medium-priority UX bug — no data loss, stability window not reset. Creating a Collection through the Create Place modal wrote the value to the place note's frontmatter correctly, but the Collection was invisible to the Edit Person modal's Collection dropdown, the Control Center's Collections tab, and the dockable Collections sidebar. The reverse direction worked fine: Collections created via Edit Person appeared in Create Place's dropdown, because Create Place already aggregated from both person and place notes. The asymmetry lived in `FamilyGraphService.getUserCollections()` — it scanned person notes only, and three UI surfaces relied on it as their sole source of truth.

**Fix: Cross-entity aggregator + three UI surface updates** ([#426](https://github.com/banisterious/obsidian-charted-roots/issues/426)):
- New pure helper at `src/core/collections-aggregator.ts` merges person-side and place-side collection counts into a unified `{ name, personCount, placeCount, totalCount }` list, sorted by totalCount desc then name asc.
- Edit Person's `loadExistingCollections` now uses the aggregator so place-created Collections appear in the dropdown.
- Control Center's Collections tab and dockable Collections sidebar both use the aggregator. Badge rendering is contextual: "X people" / "X places" / "X people, Y places" depending on membership. Empty-state text updated to mention both entity types.
- `FamilyGraphService.getUserCollections()` is unchanged — it stays person-focused for the Canvas Collection Overview (person-first family+collection composition) and Collection Analytics (person-centric metrics). Those two surfaces are intentionally out of scope.

**Testing:** 13 new regression tests for the aggregator covering person-only, place-only, mixed membership, tie-breaking (totalCount desc, then alphabetical), duplicate-name collapse, empty-string name defense, and zero-count row dropping. Suite grows from 222 to 235 tests.

**Reporter:** @DigitalDreamn (second bug report this week).

**Stability-window impact:** no reset — #426 is a medium-priority UX bug, not critical data-loss. Window continues from 0.22.2's start: 2026-04-23 → ~2026-05-14.

**Related post-1.0 FR** (to file separately): standalone Collection creation. Collections are currently purely membership-derived (no Collection-as-entity), so the only way to create one is to commit to a person or place that will live in it. Consistent with Obsidian's tag convention, but worth considering a dedicated Create-Collection entry point post-1.0.

---

### v0.22.2 Hotfix: IDs-Only Relationship Arrays (v0.22.2)

Critical data-loss bug, distinct from 0.22.0's spouse-format issues. Opening Edit Person on a note whose frontmatter had `children_id` (or `spouse_id` / `parents_id`) without the paired `children:` / `spouse:` / `parents:` wikilink array showed an empty relationships section, and saving wiped the `*_id` block entirely. The inverse shape of [#410](https://github.com/banisterious/obsidian-charted-roots/issues/410) — that fix covered wikilinks-without-IDs, but when the wikilink key was entirely absent the loader exited before ever looking at the IDs.

**Fix: Symmetric IDs-only fallback in the relationship loader** ([#415](https://github.com/banisterious/obsidian-charted-roots/issues/415)):
- New `resolveCrIdToName` helper is the inverse of the existing `resolveNameToCrId` — takes a `cr_id` and returns the stored display name by looking up the person in the graph.
- `loadAlignedArray` now falls back to walking the `*_id` array when the wikilink key is genuinely absent (null / undefined). An explicitly empty `children: []` is still treated as an intentional empty list and skips the fallback — prevents phantom resurrection of stale IDs on a note that was cleared deliberately.
- On save, the writer emits both arrays, healing the frontmatter to the full dual-storage shape.
- Orphan IDs (present in `*_id` but pointing to a deleted / missing person note) are preserved round-trip with the ID string itself as a visible placeholder name. Produces `[[id-str]]` in the wikilink array — ugly-but-visible, so the user can find and fix it rather than silent drop or `[[]]` corruption.

**Testing:** 13 new regression tests — 4 for the new `resolveCrIdToName` resolver and 9 for the IDs-only fallback path (children / spouse / parents coverage, scalar vs. array coercion, orphan-ID handling, explicit-`[]` discrimination, falsy-entry skipping, dormancy when both arrays present). Suite grew from 209 to 222 tests.

**Reporter:** @DigitalDreamn (Benjymn Wilkin frontmatter — 5 children_id entries, no children wikilink array, save wiped the block).

**Stability-window impact:** critical data-loss bug triggers the window reset per VERSIONING.md. The 3-week BRAT stability window re-starts from this release; new end-date ~2026-05-14.

---

### v0.22.1 Hotfix: Spouse Format Migration (v0.22.1)

Critical data-loss regression introduced by 0.22.0's #420 fix. Editing an existing spouse to add marriage date / location / status upgraded the spouse field from flat `spouse:` to indexed `spouse1:` format, which the bidirectional linker misread as "spouse removed" — firing a phantom-deletion cascade that wiped spouse data on both sides.

**Fix: Format-migration detection in `syncDeletions`** ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423)):
- New `isSpouseInFrontmatter` pure helper scans every possible spouse location (flat + all `spouse{N}` slots) before the deletion detector fires `removeSpouseLink`.
- If the disappeared wikilink appears anywhere else in the current frontmatter, it's a format migration, not a deletion. Cascade is skipped.
- Protects both the flat → indexed upgrade (common when adding marriage metadata) and the indexed → flat downgrade (less common but same guarantee).

**Fix: Complete metadata cleanup in `removeSpouseLink`** ([#423](https://github.com/banisterious/obsidian-charted-roots/issues/423)):
- Previous cleanup removed `spouse{N}`, `spouse{N}_id`, `spouse{N}_marriage_date`, `spouse{N}_marriage_location`, `spouse{N}_divorce_date` — but not `spouse{N}_marriage_location_id` or `spouse{N}_marriage_status`, leaving orphaned metadata when a legitimate unlink occurred.
- Cleanup is now complete, in parity with the existing `person-note-writer.ts` clear at line ~1742.

**Testing:** 20 new regression tests for `isSpouseInFrontmatter` covering flat / indexed / mixed-state / format-migration / null-value / object-shape inputs. Suite grew from 189 to 209 tests.

**Reporter:** @doctorwodka (clean YAML-based repro on #420).

**Stability-window impact:** critical data-loss regression triggers the window reset per VERSIONING.md. The 3-week BRAT stability window re-starts from this release; new end-date ~2026-05-14.

---

### v0.22.0 Stability Release (v0.22.0)

The first release after 0.21.0 on the path to 1.0. Addresses a critical data-loss bug surfaced during 1.0-gate testing, four lower-severity bugs, and one feature addition. The 3-week BRAT stability window resets to this release.

**Fix: Cross-note spouse writes preserve indexed format** ([#420](https://github.com/banisterious/obsidian-charted-roots/issues/420)):
- Adding a spouse from a different note could previously downgrade the target's indexed `spouseN:` format to flat `spouse:` keys, silently wiping the target's other spouses. Silent data loss on any cross-note spouse write to a multi-spouse person.
- Both bidirectional write paths (the linker's `syncSpouse` and the `addBidirectionalSpouseLink` helper used by Create / Edit Person) now inspect the target's existing format and append to indexed slots when present.
- Mixed states (residue flat keys alongside indexed slots from earlier bad writes) route to indexed so prior corruption doesn't compound.

**Fix: Life Events Migration idempotent on re-run** ([#414](https://github.com/banisterious/obsidian-charted-roots/issues/414)):
- Running the Cleanup Wizard's Life Events Migration twice on the same person note used to mint a duplicate event note each time because collision-avoidance only deduped by filename.
- Migration now scans for existing `cr_type: event` notes before creating new ones and reuses any with a matching `(persons, event_type, date)` tuple.
- Strict date matching: `"1850"` and `"1850-01-01"` are different identities, so user refinements aren't silently merged.
- Cleanup Wizard notice reports `(reused N existing events)` alongside the created count.

**Fix: Timeline no longer crashes on bare-year numeric dates** ([#416](https://github.com/banisterious/obsidian-charted-roots/issues/416)):
- Obsidian's Properties panel writes `died: 1893` (unquoted) as a Number. The timeline's date helpers called `.trim()` on the input and threw `TypeError`, surfacing as Obsidian's red code-block error.
- Helpers now accept `string | number | undefined | null` and coerce at entry. Same-class fix applied to `formatDisplayDate` so the person picker also handles numeric-YAML date fields without crashing.

**Fix: Dynamic relationships block surfaces adoptive siblings in `extended` / `all` modes** ([#417](https://github.com/banisterious/obsidian-charted-roots/issues/417)):
- The block's sibling derivation only walked biological parent edges, so adoptive siblings (other children of adoptive parents) never appeared — even in extended / all modes.
- Adoptive parent edges are now walked alongside biological ones. Results are labeled `Adoptive sibling:` to distinguish them, matching the existing `Adoptive father` / `Adoptive mother` label pattern.
- Deduped against the biological set, so a person present on both edges lists once, unlabeled.

**Fix: Symmetric custom relationships auto-propagate** ([#419](https://github.com/banisterious/obsidian-charted-roots/issues/419)):
- Adding a symmetric custom relationship (e.g., "twin") from person A to person B used to leave B's note untouched. Built-in symmetric types (spouse, biological sibling) already reciprocated via the bidirectional linker; custom types didn't.
- The Add Relationship modal now mirrors the entry onto the target when the type's `symmetric` flag is set.
- Idempotent: re-adding the same symmetric link from either side is a silent no-op.

**Added: Burial renders on the person timeline** ([#408](https://github.com/banisterious/obsidian-charted-roots/issues/408)):
- `burial_date` and `burial_place` were already recognized by the GEDCOM importer/exporter, map markers, and cleanup tooling — but the `charted-roots-timeline` block was the one place they didn't surface.
- Burial is now emitted alongside birth, death, adoption, and marriage with a `"Buried"` label, `"in {place}"` suffix when `burial_place` is set, and age computed from `born`.
- Honors the timeline block's `include: [...]` filter.

**Testing gate:** Vitest suite grew from 109 to 189 tests. New pure-helper modules: sibling walker, relationship property writer, event identity, spouse format detector, date-display coercion. Every 0.22.0 fix in a volatile code path landed with regression tests.

---

## v0.21.x

### v0.21.0 Edit Person Round-Up (v0.21.0)

Stability release focused on four Edit Person modal round-trip bugs. No feature work.

**Fix: Relationships not dropped when IDs are partial or wikilink basenames differ from `name`** ([#410](https://github.com/banisterious/obsidian-charted-roots/issues/410)):
- The v0.20.62 fix for [#403](https://github.com/banisterious/obsidian-charted-roots/issues/403) closed the all-wikilinks-no-IDs case but left sibling gaps. The name-based fallback resolver now also matches on the note's basename; the array-field fallback runs per-entry instead of all-or-nothing. Unresolvable wikilinks are preserved through the round trip rather than dropped.

**Fix: Clearing Universe and ten other optional fields now actually clears frontmatter** ([#406](https://github.com/banisterious/obsidian-charted-roots/issues/406)):
- Fields affected: `universe`, `collection`, `personType`, `sex`, `givenName`, `maidenName`, `pronouns`, `dnaTestingCompany`, `dnaKitId`, `dnaMatchType`, `dnaNotes`. All use the established `?? ''` (or `?? []`) pattern so the writer's clear path actually fires.

**Fix: Nickname field round-trips on edit** ([#412](https://github.com/banisterious/obsidian-charted-roots/issues/412)):
- Three gaps in the path (load, type, save) all closed. Nickname now behaves like every other optional string field, including clearing via empty input.

**Fix: Endogamy flag toggle-off persists** ([#413](https://github.com/banisterious/obsidian-charted-roots/issues/413)):
- The onChange handler's `value || undefined` idiom converted a toggled-off `false` to `undefined`, which the writer read as "untouched." Fixed by passing the boolean through directly.

**Testing infrastructure:** Vitest test harness added with 31 regression tests for the relationship load path. New [VERSIONING.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/VERSIONING.md) documents plugin-specific SemVer rules and 1.0 criteria.

---

## v0.20.x

### v0.20.57 Feature Round-Up (v0.20.57)

A collection of enhancements addressing TODO items and community feedback.

**Multiple person picker in event modal** ([#366](https://github.com/banisterious/obsidian-charted-roots/issues/366)):
- The create/edit event modal now supports adding multiple people to an event (e.g., marriages, group events)
- Additional persons saved to the `persons` frontmatter array
- Persisted across modal state restoration

**Marriage data in Family Group Sheet** ([#370](https://github.com/banisterious/obsidian-charted-roots/issues/370)):
- Family Group Sheet reports now include marriage date and place
- Extracted from spouse relationship data (indexed `spouse1_marriage_date` etc.)
- Both markdown and PDF output updated. Multiple marriages supported.

**Targeted schema validation** ([#367](https://github.com/banisterious/obsidian-charted-roots/issues/367)):
- "Validate matching notes" context menu action on schemas runs validation against only notes matching that schema
- Progress modal and result summary

**Organization membership statistics** ([#368](https://github.com/banisterious/obsidian-charted-roots/issues/368)):
- Organizations statistics card now shows real membership counts
- People with memberships, total memberships, empty organizations

**Universe and collection pickers in Report Wizard** ([#369](https://github.com/banisterious/obsidian-charted-roots/issues/369)):
- Report types targeting a universe or collection now have fuzzy-search picker modals
- Replaces "not yet implemented" notices

**Web Clipper discoverability** ([#364](https://github.com/banisterious/obsidian-charted-roots/issues/364)):
- Info boxes in the Places, Sources, and People tabs link to Web Clipper wiki templates
- Relevant examples per entity type (Wikidata for Places, FamilySearch for People)

**Fix: Step-parent assignment** ([#365](https://github.com/banisterious/obsidian-charted-roots/issues/365)):
- Step-parent relationships from the `relationships` array now check the target person's sex
- Female step-parents correctly assigned to `stepmotherCrIds` instead of always `stepfatherCrIds`

---

### Child Map Markers and Region Editing (v0.20.56)

Visual tools for managing child map regions on parent maps.

**GitHub Issue:** [#362](https://github.com/banisterious/obsidian-charted-roots/issues/362)

**Child map markers:**
- Gold map-icon markers appear on parent maps for every child map that has `parent_map` set
- Positioned at the center of `parent_region` if defined, or at the parent map center as fallback
- Popup shows child map name with "Open map" and "Edit/Draw region" buttons
- Dedicated layer with "Child maps" toggle in the Layers menu

**On-map region editing:**
- Click a child map marker → "Edit region" (or "Draw region" for maps without a region)
- Draggable dashed blue rectangle with four corner resize handles
- Floating save/cancel toolbar at the top of the map
- Works at any zoom level for precision positioning
- Saves `parent_region_x/y/w/h` to the child map's frontmatter immediately

**Region drawing modal:**
- "Draw region" button in Map Creation Wizard Step 2 when a parent map is selected
- Canvas-based drawing on the parent map image with drag, resize, and coordinate readout
- Also available via right-click context menu on child map notes ("Draw/Edit parent region")

**Documentation:** [Custom Maps — Child Map Markers](Custom-Maps#child-map-markers), [Custom Maps — Editing Regions](Custom-Maps#editing-regions-on-the-map)

---

### Linked Map Drill-Down Navigation (v0.20.56)

Full drill-down navigation between custom maps for multi-scale worldbuilding.

**GitHub Issue:** [#361](https://github.com/banisterious/obsidian-charted-roots/issues/361)

**Phase 1 — Place-level linking:**
- `linked_map` property on place notes enables drill-down from one map to another
- Clicking a place marker shows an "Open [map name]" button in the popup

**Phase 2 — Map hierarchy and breadcrumbs:**
- `parent_map` property on child map notes establishes parent-child relationships
- Breadcrumb navigation in the Map View toolbar (e.g., "The Dying Earth → River Scaum")
- "Parent map" dropdown in the Map Creation Wizard

**Phase 3 — Visual overlay regions:**
- `parent_region_x/y/w/h` properties on child map notes define where the child sits on the parent
- Clickable dashed blue rectangles rendered on the parent map
- Hover shows child map name tooltip, click drills down to the child map

**Documentation:** [Custom Maps — Linked Maps](Custom-Maps#linked-maps-drill-down-navigation), [Frontmatter Reference — Map Hierarchy](Frontmatter-Reference#map-hierarchy)

---

### Universe Entity Dynamic Blocks (v0.20.56)

Four new dynamic content blocks for universe notes that automatically list all entities belonging to that universe.

**GitHub Issue:** [#359](https://github.com/banisterious/obsidian-charted-roots/issues/359)

**Blocks:**
- `charted-roots-universe-people` — table with name, born, died, occupation
- `charted-roots-universe-places` — table with name and place type
- `charted-roots-universe-events` — table with event name, date, type badge, and place
- `charted-roots-universe-organizations` — table with name and type

All entries are clickable wikilinks. Supports `sort` (name/date/type) and `limit` parameters. Auto-refreshes when vault data changes.

---

### Universe Map Thumbnails (v0.20.56)

New `charted-roots-universe-maps` dynamic block renders clickable map image thumbnails for custom maps belonging to a universe.

**GitHub Issue:** [#360](https://github.com/banisterious/obsidian-charted-roots/issues/360)

**Features:**
- Click a thumbnail to open it in Map View
- Shows place count badge per map
- Supports `size` parameter (small/medium/large)

---

### Image Region Crop (v0.20.55)

Select a region of an image (e.g., a face in a group photo) to use as the thumbnail on person cards, media blocks, and profile views.

**GitHub Issue:** [#354](https://github.com/banisterious/obsidian-charted-roots/issues/354)

**Features:**
- **`media_crop` frontmatter property** — Stores crop coordinates (x, y, w, h) per image per note
- **Crop selection modal** — Canvas-based UI with draggable/resizable rectangle, darkened overlay, and live preview
- **Right-click menu** — "Set crop region" / "Edit crop region" / "Remove crop" on any image in the media block
- **Applied everywhere** — Media block thumbnails, Family Chart avatars, Entity Profile View

**Data model (Option B — separate property, backward compatible):**
```yaml
media:
  - "[[group-photo.jpg]]"
media_crop:
  - image: group-photo.jpg
    x: 100
    y: 50
    w: 200
    h: 250
```

**Documentation:** [Frontmatter Reference — Image Crop Regions](Frontmatter-Reference#image-crop-regions), [Media Management](Media-Management#supported-file-types)

---

### PDF Previews in Media (v0.20.54)

PDFs attached to person and source notes now show a first-page thumbnail preview instead of a generic file icon.

**GitHub Issue:** [#350](https://github.com/banisterious/obsidian-charted-roots/issues/350)

**Where PDF thumbnails display:**
- `charted-roots-media` dynamic block in reading view
- Sources tab media gallery in Control Center
- Entity Profile View media section

**Implementation:**
- Uses Obsidian's built-in `loadPdfJs()` API (no bundled dependencies)
- Thumbnails rendered at 200×280px from the first page
- In-memory cache for fast subsequent renders
- Async generation with placeholder fallback
- Click behavior unchanged (opens in Obsidian's PDF viewer, compatible with PDF++)

**Documentation:** [Media Management](Media-Management#supported-file-types), [Dynamic Note Content — Media Block](Dynamic-Note-Content#media-block)

---

### Alt Name Display (v0.20.52–v0.20.53)

New `alt_name` frontmatter property for person notes, designed for multilingual genealogy where both native script and romanized names need to be visible at a glance.

**GitHub Issues:** [#346](https://github.com/banisterious/obsidian-charted-roots/issues/346), [#347](https://github.com/banisterious/obsidian-charted-roots/issues/347), [#348](https://github.com/banisterious/obsidian-charted-roots/issues/348), [#349](https://github.com/banisterious/obsidian-charted-roots/issues/349)

**Where alt name displays:**
- Family Chart View cards (below main name, with auto-adjusting card height)
- Family Chart Person details panel
- Entity Profile View header (muted styling)
- Map view marker popups (birth, death, marriage, burial, event markers)
- SVG visual tree chart nodes (all layout algorithms)
- Excalidraw export nodes
- Circle card style (Family Chart)

**Documentation:** [Frontmatter Reference — alt_name](Frontmatter-Reference#basic-information), [Data Entry — Alternate Name](Data-Entry#alternate-name-alt_name)

---

### Calendar View (v0.20.47)

A new workspace view showing a monthly calendar grid of significant dates across the vault — birthdays, death anniversaries, marriage dates, and other life events.

**GitHub Issue:** [#299](https://github.com/banisterious/obsidian-charted-roots/issues/299)

**Features:**
- Monthly calendar grid with color-coded event dots (blue = birth, red = death, yellow = marriage)
- Text labels toggle showing person names inside day cells
- Month dropdown and year input for instant navigation to any date
- Day click detail panel showing all events with person name, type, year, years ago, and place
- Imprecise dates section ("This month, day unknown") for entries with month but no day
- Event type and living/deceased filters via filter menu
- Right-click day cells to create events with date pre-filled
- Keyboard navigation (arrow keys for month, T for today)
- State persistence across reloads (month, year, filters, label toggle)

**Entry points:** Command palette, Control Center dashboard tile, Events tab button, person note context menu ("Show on calendar" → birth month/year), event note context menu ("Show on calendar" → event date).

**Data sources:** Person notes (birth/death dates via FamilyGraphService) and event notes (marriage, baptism, immigration, etc. via EventService).

**Documentation:** [Calendar View](Calendar-View)

---

### Source Note Hierarchies (v0.20.46)

New `source_parent` and `source_parent_id` properties for linking child source notes to a parent document, enabling modeling of multi-document record groups like probate packets, census pages, and multi-volume collections.

**GitHub Issue:** [#337](https://github.com/banisterious/obsidian-charted-roots/issues/337)

**Features:**
- `source_parent` (wikilink) and `source_parent_id` (cr_id) properties on source notes, following the existing dual-storage pattern
- Parent source picker with autocomplete in the Create/Edit Source modal (under Additional details)
- Parsing, reading, and writing in `SourceService`
- Frontmatter Reference documentation updated

**Use cases:** Probate packets (case-level parent + child documents), multi-page census transcriptions, record groups or multi-volume collections.

**Documentation:** [Evidence & Sources — Source Hierarchies](Evidence-And-Sources#source-hierarchies), [Frontmatter Reference — Source Hierarchy](Frontmatter-Reference#source-hierarchy)

---

### Source Hierarchy Display (v0.20.46)

Hierarchy-aware display features built on top of the `source_parent` relationship, adding navigation and filtering across related source notes.

**GitHub Issue:** [#338](https://github.com/banisterious/obsidian-charted-roots/issues/338)

**Profile view sections:**
- **Parent source** — Link to the parent source at the top of child source profiles
- **Child documents** — List of all child sources on parent profiles, with source type badge, title, and date
- **Related documents** — Sibling sources (same parent, excluding self) on child profiles
- **Source tree** — Collapsible tree visualization on parent profiles showing the full hierarchy with indented child nodes

**Sources tab filtering:**
- "Has parent (child sources)" — show only sources with a parent
- "No parent (top-level)" — show only sources without a parent
- "Children of [source]" — show children of a specific parent source

---

### Person-Focused Map Journey (v0.20.45)

Journey mode in the Map View isolates a single person's geographic path and provides animated step-through playback with rich popups and family overlay.

**GitHub Issue:** [#295](https://github.com/banisterious/obsidian-charted-roots/issues/295)

**Phase 1 — Person filter and isolation:**
- Route button in toolbar opens person picker to enter journey mode
- Filters all markers and paths to the selected person
- Fits map bounds to the person's waypoints
- Person indicator in toolbar with clear button
- "Show journey on map" context menu on person notes

**Phase 2 — Animated step-through playback:**
- Floating playback controls (prev/play/next) with smooth fly-to animation
- Progress bar, waypoint label, step counter, speed selector (0.25×–2.5×)
- Auto-loops back to start

**Phase 3 — Rich waypoint popups:**
- Each stop shows event type, date, place, age, duration at location, and description

**Phase 4 — Family journey overlay:**
- Toggle button shows dimmed journey paths for immediate family
- Color-coded by relationship: blue (parents), pink (spouses), emerald (children)
- Click a family path popup to switch focus to that person's journey

**Documentation:** [Geographic Features — Journey Mode](Geographic-Features#journey-mode)

---

### Customizable Timeline Display Templates (v0.20.38)

Four new capabilities for controlling how timeline entries are displayed in dynamic content blocks.

**GitHub Issue:** [#325](https://github.com/banisterious/obsidian-charted-roots/issues/325)

**Features:**
- **Layout modes:** `layout` parameter with `chronological` (default), `grouped` (sections for personal/family/context), and `personal-first` options
- **Label customization:** Six settings under Advanced > Timeline labels to override birth, death, and family event labels with `{name}` placeholder support
- **Format strings:** Per-block `format` parameter with `{year}`, `{title}`, `{place}`, `{age}` placeholders
- **Template notes:** Reference a markdown note via `template: [[Note]]` to define custom sections with independent sort, include, and format

---

### Citation Integration (v0.20.38)

Bidirectional sync between citation notes and `sourced_*` fields, plus citation statistics in the dashboard.

**GitHub Issue:** [#324](https://github.com/banisterious/obsidian-charted-roots/issues/324)

**Features:**
- Three new commands: sync sourced fields from citations (per-person and vault-wide), generate citation notes from existing sourced fields
- Source summary report includes a Page column when citation notes have page references
- New "Citation statistics" section in the statistics dashboard: total citations, coverage percentage, quality distribution, most cited sources

---

### Family Events on Timelines (v0.20.37)

Person timelines can now show family members' life events for broader genealogical context.

**GitHub Issue:** [#323](https://github.com/banisterious/obsidian-charted-roots/issues/323)

**Features:**
- Children's births, spouse deaths, parent deaths, and sibling births on person timelines
- Controlled by four global toggles in Settings > Advanced (all off by default)
- Each entry links to the family member's note with age annotations
- Per-block suppression via `familyEvents: none`
- Consistent icon rendering when family events are present

---

### Calculate Multiple Relationships (v0.20.36)

The relationship calculator now finds multiple relationship paths between two people through different common ancestors.

**GitHub Issue:** [#321](https://github.com/banisterious/obsidian-charted-roots/issues/321)

**Features:**
- After the primary (shortest) result, "Find more relationships" searches for additional paths
- Each result shows relationship type, common ancestor name, and blood/marriage indicator
- Ancestor couples who are spouses are grouped together (e.g., "via John Smith & Jane Doe")
- Configurable max search depth in Settings > Advanced (default 10 generations, 0 for unlimited)

---

### Cross-Project Research Queries (v0.20.35)

Two new ways to see all research activity for a person across research projects, journals, and reports.

**GitHub Issue:** [#303](https://github.com/banisterious/obsidian-charted-roots/issues/303)

**Features:**
- "Research activity" section in person profiles aggregates IRNs, log entries, journals, reports, and projects referencing the person, grouped by project with date ranges and result indicators
- "Find related research" command (also in the command menu) opens a modal with the same grouped view, with a person picker if no person note is active

---

### Historical Context Overlay and Age Annotations (v0.20.34)

Timelines can now overlay historical events and display age annotations for richer genealogical context.

**GitHub Issue:** [#296](https://github.com/banisterious/obsidian-charted-roots/issues/296)

**Features:**
- `context: [[Note]]` parameter in timeline code blocks references a note containing historical events
- Context events rendered with muted styling and landmark icon
- `defaultTimelineContext` setting applies a context note to all timelines globally
- All timeline events display age annotations when the person's birth date is known

---

### Citation Metadata Support (v0.20.34)

New citation entity type for per-citation page references and quality assessments, with full GEDCOM roundtrip support.

**GitHub Issue:** [#316](https://github.com/banisterious/obsidian-charted-roots/issues/316)

**Features:**
- Citation notes with page references (`citation_page`) and quality assessments (`citation_quality`)
- GEDCOM import generates citation notes from `SOUR` blocks with `PAGE`/`QUAY` sub-tags
- GEDCOM and Gramps exports write citation metadata back as `PAGE`/`QUAY`
- "Add citation" command and modal for manual creation
- Citations section in Entity Profile View grouped by source with fact labels, page references, and color-coded quality badges
- New `citationsFolder` setting (default: `Charted Roots/Citations`)

---

### Comprehensive GEDCOM Field Coverage (v0.20.33)

Full import/export support for 16+ additional GEDCOM 5.5.1 fields, ensuring near-lossless roundtrip data fidelity.

**GitHub Issue:** [#317](https://github.com/banisterious/obsidian-charted-roots/issues/317) (umbrella)

**New fields (import + export):**
- **Name components:** NPFX (prefix), NSFX (suffix), SPFX (surname prefix), NICK (export added)
- **Person attributes:** TITL, RELI, NATI, DSCR, IDNO, PROP, CAST, NCHI, NMR, SSN
- **Burial:** BURI.DATE and BURI.PLAC imported to person frontmatter
- **Death cause:** DEAT.CAUS imported to `death_cause`
- **Age at event:** AGE sub-tag stored on event notes and re-exported
- **Date ranges:** FROM/TO format now parsed and exported (previously only BET/AND)

**Export roundtrip fixes:**
- Family events (MARR, DIV, MARB, MARC, MARL, MARS, DIVF) export on FAM records instead of generic EVEN
- NAME line constructed from explicit NPFX/GIVN/SPFX/SURN/NSFX components
- Duplicate BIRT/DEAT/BURI/OCCU records eliminated
- OCCU exports as inline value instead of NOTE sub-tag
- Six event type export mappings added: MARB, MARC, MARL, MARS, DIVF, CHRA

**Still open:** [#316](https://github.com/banisterious/obsidian-charted-roots/issues/316) — Citation-level metadata (PAGE/QUAY) requires a data model decision and is tracked separately.

**Planning document:** [gedcom-field-coverage.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/gedcom-field-coverage.md)

---

### Book & Narrative Compilation (v0.20.26)

A book builder that combines multiple generated reports, visual trees, and user-written vault notes into a single sequenced document with cover page, table of contents, and optional index. Outputs as PDF or ODT.

**GitHub Issue:** [#294](https://github.com/banisterious/obsidian-charted-roots/issues/294)

**Chapter Types:**

| Type | Description |
|------|-------------|
| Generated report | Any of the 17 existing report types, configured inline |
| Visual tree | Pedigree, descendant, hourglass, or fan chart embedded as image |
| Vault note | User-written markdown rendered into the document |
| Section divider | Title page for a new part of the book |

**Preset Templates:**

| Template | Audience | Typical contents |
|----------|----------|-----------------|
| Family history book | Family sharing | Cover, pedigree chart, individual summaries, family group sheets, descendant register, timeline, bibliography, index |
| Research compilation | Researcher | Cover, gaps report, source summaries, individual summaries, ahnentafel, bibliography |
| Blank | Any | Empty canvas, user builds from scratch |

| Change | Description |
|--------|-------------|
| Book builder modal | 4-step wizard for metadata, chapter selection with drag-and-drop ordering, output config, and progress-tracked generation |
| `.book.json` definitions | Saveable book definitions that can be reopened and re-generated as vault data changes |
| Consolidated bibliography | Deduplicates footnotes across chapters into a single bibliography section |
| Name index | Auto-generated index sorted by last name with alphabetical grouping |
| Chapter numbering | Numeric or Roman numeral chapter numbers |
| Template intelligence | Templates derive chapters from the family graph — individual summaries for direct-line ancestors, family group sheets per nuclear family |
| Regenerate command | Re-generate a book from its `.book.json` definition without opening the wizard, with change detection reporting which chapters were updated |

**Entry points:** "Open book builder" command, Control Center tile (Trees & reports tab), context menu on `.book.json` files.

**Documentation:**
- [Book Builder](Book-Builder) — Usage documentation
- [Book & Narrative Compilation Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/book-narrative-compilation.md) — Design and implementation plan

---

### Entity Profile View (v0.20.18)

A dockable Profile View that auto-syncs to the active note and displays all related data for any entity type (Person, Place, Event, Source, Organization) in collapsible sections, enabling deep work without tab-hopping.

**GitHub Issue:** [#251](https://github.com/banisterious/obsidian-charted-roots/issues/251) | **Discussion:** [#242](https://github.com/banisterious/obsidian-charted-roots/discussions/242)

**Phase 1 — Read-only Profile View:**

| Change | Description |
|--------|-------------|
| Auto-syncing view | `ItemView` follows the active note with 150ms debounce |
| Identity header | Entity type badge, avatar, key metadata, pin toggle |
| Collapsible sections | Chevron toggle with compact summaries for all 5 entity types |
| Person sections | Relationships (family + custom), Events, Sources, Media, Data Quality |
| Place sections | Events at location, Sources, Media, Map preview (coordinates + "Open in Geo Map") |
| Event sections | Participants, Sources, Media |
| Source sections | Referenced facts (vault-wide scan), Media |
| Organization sections | Members, Events, Sources, Media |
| Pin/unpin | Freeze on a specific entity; multiple instances for side-by-side comparison |
| Breadcrumb navigation | In-place entity traversal |
| State persistence | Pinned entity, section states, breadcrumbs persist across sessions |

**Phase 2 — Inline editing:**

| Change | Description |
|--------|-------------|
| Click-to-edit | All identity header fields across all five entity types |
| Input types | Text, number, and select (dropdown) — Enter or blur saves, Escape cancels |
| Single active field | Clicking another field saves the first automatically |
| Empty placeholders | Clickable placeholders for adding new values |
| Frontmatter save | Direct save via `processFrontMatter()` with property alias support |
| Wikilink requoting | Automatic requoting for link-valued fields |

**Phase 3 — Polish and integration:**

| Change | Description |
|--------|-------------|
| Lazy rendering | `contentRenderer` defers DOM until first expand |
| Keyboard navigation | ArrowUp/Down, Enter/Space, Home/End on section headers (WAI-ARIA accordion) |
| Mobile-responsive | 44px touch targets, narrow-pane media query for stacked metadata |
| Map preview | Embedded Leaflet map for place profiles, lazy init/cleanup on collapse |

**Documentation:**
- [Entity Profile View](Entity-Profile-View) — Usage documentation
- [Entity Profile View Implementation](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/developer/implementation/profile-view.md) — Developer implementation guide
- [Entity Profile Views Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/entity-profile-views.md) — Full specifications for all phases
- Community contributors: @prentissw (workflow feedback, Relationships section)

---

### Structured Role Lists for Organizations (v0.20.17)

Adds a `roles` property to organization notes defining valid roles and display order, with role picker autocomplete in membership modals.

**GitHub Issue:** [#274](https://github.com/banisterious/obsidian-charted-roots/issues/274)

**New frontmatter property:**

```yaml
roles:
  - Lord
  - Heir
  - Castellan
  - Maester
```

List order defines rank/display order (first = highest). Stored on the org note.

| Change | Description |
|--------|-------------|
| `roles` property | Ordered list of valid role names on organization notes |
| Role picker | Autocomplete suggestions when adding/editing memberships |
| Type default roles | Organization types can define default role templates |
| Members block fallback | 3-level ordering: block `role-order` → org `roles` → alphabetical |
| Chip editor UI | Add/remove roles with tag-style chips in create/edit modals |

**Role ordering fallback chain** in `charted-roots-members` blocks:
1. Block-level `role-order` config (explicit override)
2. Organization's `roles` property (inherited from note)
3. Alphabetical order (default)

---

### Mills-Aligned Source Classification (v0.20.17)

Adds three optional source classification axes from Elizabeth Shown Mills' *Evidence Explained*, enabling GPS-oriented genealogists to apply the standard analytical framework used in professional genealogy.

**GitHub Issue:** [#276](https://github.com/banisterious/obsidian-charted-roots/issues/276)

**New frontmatter properties:**

| Property | Values | Question |
|----------|--------|----------|
| `source_classification` | `original`, `derivative`, `authored_narrative` | What is the document? |
| `information_classification` | `primary`, `secondary`, `undetermined` | Who provided the info? |
| `evidence_classification` | `direct`, `indirect`, `negative` | How does it relate to the question? |

**Changes:**

| Change | Description |
|--------|-------------|
| Create Source modal | Collapsible "Source classification (Mills)" section with three dropdowns |
| Evidence analysis | `information_classification` takes precedence over `source_quality` when present |
| Reports | Source Summary, Sources by Role, and PDF reports conditionally show classification columns |
| Templates | Census (derivative/primary), vital record (original/primary/direct), full template (three suggesters) |

All three properties are optional. Existing sources using only `source_quality` or `confidence` continue to work identically.

**Community contributor:** @ANYroots (Mills methodology, real-world examples)

---

### Map View Marker Layering (v0.20.3)

Improved visual distinction between event markers and place markers on the Map View when the "All places" layer is enabled.

**GitHub Issue:** [#164](https://github.com/banisterious/obsidian-charted-roots/issues/164)

**Changes:**

| Change | Description |
|--------|-------------|
| Hollow circles | Place markers now use hollow teal circles instead of solid circles |
| Z-ordering | Event markers render on top of place markers (`zIndexOffset: -1000`) |
| CSS refactor | Marker icons now use CSS classes instead of inline styles |

**Visual Distinction:**
- **Event markers**: Solid colored circles (12px) — birth (red), death (black), etc.
- **Place markers**: Hollow teal circles (10px) — clearly distinguishable as background context

**Community contributor:** @ANYroots (use case, feedback)

---

### Control Center Modularization

Break the Control Center modal into modular, independently dockable workspace views. The Control Center remains available for quick, transient access while dockable views serve extended work sessions.

**GitHub Discussion:** [#239](https://github.com/banisterious/obsidian-charted-roots/discussions/239), [#240](https://github.com/banisterious/obsidian-charted-roots/discussions/240)

**Phase 1 — Component Extraction:**

Extracted all 16 tabs from the monolithic `control-center.ts` (~13,760 lines) into individual component files, reducing it to ~1,450 lines (89% reduction). Removed 3 legacy redirect tabs (Status, Guide, Statistics). No user-facing changes.

**Phase 2 — Dockable ItemViews:**

Created 9 dockable sidebar views, each accessible via a dock button on the corresponding Control Center card header or via the command palette.

| View | Command | Icon | Content |
|------|---------|------|---------|
| People | `Open people` | `user` | Filter/sort/search table with expandable details, context menus |
| Places | `Open places` | `map-pin` | Filter/sort/search table with category badges, coordinates |
| Events | `Open events` | `calendar` | Type/person/date filters, sortable timeline table |
| Sources | `Open sources` | `book-open` | Filter/sort table with type/confidence badges |
| Organizations | `Open organizations` | `building` | Filter/sort table with type badges, member counts |
| Relationships | `Open relationships` | `users` | Filter by type/category/person, sort, context menus |
| Universes | `Open universes` | `globe` | Filter/sort/search with status badges, entity counts |
| Collections | `Open collections` | `folder-tree` | Mode switcher (all people / families / collections) |
| Data quality | `Open data quality` | `shield-check` | Research gaps, source conflicts, auto-running vault-wide analysis |

**Key design decisions:**
- The Control Center modal is **not deprecated** — modal and dockable views share the same extracted components
- Each view is single-instance (clicking the dock button focuses an existing view rather than creating a duplicate)
- Views auto-refresh on vault changes (debounced 2s) and persist filter/sort/search state across sessions
- Data Quality view is a read-only dashboard (not an entity list) — batch operations, wizards, and data tools remain modal-only
- Dock buttons appear on hover over card headers, using the `panel-right` icon

**Relationships tab enhancements** (prerequisite for dockable view):
- Added filter dropdowns (by type, category, person)
- Added sort options (by type, from-person, to-person, date)
- Added pagination with load-more pattern
- Added context menus on rows

See [Control Center Modularization Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/control-center-modularization.md) for full specifications.

---

## v0.19.x

### Unified Place Lookup (v0.19.17)

Query multiple place databases (Wikidata, GeoNames, Nominatim) from a single interface and create properly-formatted place notes with coordinates, hierarchies, and standardized names.

**GitHub Issue:** [#218](https://github.com/banisterious/obsidian-charted-roots/issues/218) | **Related:** [#128](https://github.com/banisterious/obsidian-charted-roots/issues/128) (Web Clipper Integration)

**Data Sources:**

| Source | Best For | Status |
|--------|----------|--------|
| Wikidata | Well-known places, multilingual research | ✅ Complete |
| GeoNames | Modern geography, worldwide coverage | ✅ Complete (requires free username) |
| Nominatim/OSM | Geocoding, address lookup | ✅ Complete |
| FamilySearch Places | U.S. genealogy, historical jurisdictions | Deferred (requires OAuth) |
| GOV | German/European historical boundaries | Deferred (needs API research) |

| Change | Description |
|--------|-------------|
| PlaceLookupService | Multi-source lookup with Wikidata, GeoNames, and Nominatim integration |
| Rate limiting | 1 req/sec for Nominatim/GeoNames, 500ms for Wikidata |
| Place type mapping | GeoNames fcode → Charted Roots, Wikidata P31 → Charted Roots |
| PlaceLookupModal | Source selection chips and result cards with side-by-side comparison |
| Create Place integration | "Look up place" button in Create Place modal header |
| Command palette | Standalone "Look up place" command |
| Auto-populate | Coordinates, place type, and parent place from results |
| GeoNames config | Username configuration in Settings → Places |

**Documentation:**
- [Unified Place Lookup Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/unified-place-lookup.md) — Design and implementation plan

---

### Inheritance & Succession Tracking

Track ownership changes, property transfers, and succession relationships through the existing event system with a new `transfer` event type and dedicated UI.

**GitHub Issue:** [#123](https://github.com/banisterious/obsidian-charted-roots/issues/123)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Transfer event type | New event type for ownership transfers, property inheritance, and succession |
| Transfer history block | `charted-roots-transfers` dynamic block shows transfer timeline for any entity |
| Context menu integration | Right-click person/place/organization notes to insert transfer history |
| Property aliases | `previous_owner`, `new_owner`, `transferred_to`, `inherited_from` map to canonical fields |

**Use Cases:**

| Scenario | How to Model |
|----------|--------------|
| Property inheritance | Transfer event with `previous_owner` (decedent) and `new_owner` (heir) |
| Enslaved ancestor tracking | Transfer events linking to probate/sale sources |
| Title succession | Transfer event with `position` field for the title/role |
| Worldbuilding succession | Chain of transfer events for thrones, lordships, etc. |

**YAML Example:**

```yaml
type: transfer
date: 1845-03-15
previous_owner: "[[John Smith Sr.]]"
new_owner: "[[John Smith Jr.]]"
subject: "[[Smith Family Farm]]"
source: "[[Probate Record 1845]]"
notes: "Inherited upon father's death"
```

See [Inheritance & Succession Tracking Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/inheritance-succession-tracking.md) for design details.

---

### Organization Member Management

Manage organization memberships directly from the Organizations tab or file explorer with a dedicated modal supporting bulk add and inline editing.

**GitHub Issue:** [#226](https://github.com/banisterious/obsidian-charted-roots/issues/226)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Manage members modal | Dedicated modal for viewing, adding, and editing organization members |
| Multi-select person picker | Bulk add members with checkbox selection and search |
| Inline membership editing | Edit role, date joined, and date left directly in the member list |
| Context menu integration | "Manage members..." option in Organizations tab and file explorer right-click menus |
| Real-time updates | Member list updates immediately after add/edit/remove operations |

**Access Points:**

- **Organizations tab:** Right-click an organization row → "Manage members..."
- **File explorer:** Right-click an organization note → Charted Roots → "Manage members..."

**Membership Fields:**

| Field | Description |
|-------|-------------|
| Role | Position or title within the organization (e.g., "Lord", "Squire", "Maester") |
| Date joined | When the person joined the organization (supports fictional dates) |
| Date left | When the person left; empty means currently active |

See [Organization Member Management Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/organization-member-management.md) for design details.

---

### Person Roles in Sources (v0.19.16)

Track the roles that people play in source documents (principal, witness, informant, official, etc.) to support FAN network research, information quality assessment, and enslaved ancestor research.

**GitHub Issue:** [#219](https://github.com/banisterious/obsidian-charted-roots/issues/219)

**Discussion:** [#189](https://github.com/banisterious/obsidian-charted-roots/discussions/189)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Role properties | Seven canonical role categories in source note frontmatter |
| Inline notation | `"[[Person\|Person (Role details)]]"` format for readability |
| Dynamic block | `charted-roots-source-roles` renders role table with person links |
| Context menu | Right-click on source notes to insert roles block |
| Modal UI | Assign roles when linking people to sources via Create/Edit Source modal |
| Sources by Role report | Control Center report showing all sources where a person appears by role |

**Role Categories:**

| Role | Use Case |
|------|----------|
| `principals` | Subject(s) of the document (deceased, testator, groom/bride) |
| `witnesses` | Named witnesses to events or document signing |
| `informants` | Person providing information (affects quality assessment) |
| `officials` | Clerks, judges, officiants, physicians, undertakers |
| `enslaved_individuals` | Persons listed as property in wills, inventories |
| `family` | Family members named in relation to principals |
| `others` | Catch-all for roles not fitting above categories |

**YAML Example:**

```yaml
principals:
  - "[[John Smith Sr.|John Smith Sr. (Decedent)]]"
officials:
  - "[[Thomas Brown|Thomas Brown (Administrator)]]"
enslaved_individuals:
  - "[[Mary]]"
  - "[[Peter]]"
```

**Dynamic Block:**

````markdown
```charted-roots-source-roles
source: "[[Estate Inventory of John Smith Sr.]]"
```
````

**Sources by Role Report Options:**

- Filter by role type (witness, informant, official, etc.)
- Grouping: by role, by source, or chronological
- Show role details and source quality ratings

See [Person Roles in Sources Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/person-roles-in-sources.md) for implementation details.

Community contributors: @ANYroots (original proposal, use cases, terminology), @wilbry (simplified role categories)

---

### Event Type Icons (v0.19.15)

Display Lucide icons for event types in timelines and map popups, reducing visual clutter and improving cohesiveness.

**GitHub Issue:** [#184](https://github.com/banisterious/obsidian-charted-roots/issues/184)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Global setting | `eventIconMode` in Preferences > Canvas & Trees |
| Display modes | `text` (default), `icon` (with tooltip), `both` (icon + text) |
| Person/family/place timelines | Icons in Control Center timeline views |
| Dynamic timeline block | Icons in `canvas-roots-timeline` code blocks |
| Map popup icons | Event type icons with matching colors in map popups |
| Tooltip support | Hover tooltip shows event type name in icon-only mode |
| Fallback icon | Calendar icon for custom types without assigned icons |

**Display Modes:**

| Mode | Description |
|------|-------------|
| `text` | Current behavior: text labels only (default) |
| `icon` | Icons only, with text in tooltip |
| `both` | Icon + text label |

**Note:** Canvas tree event nodes were not applicable since canvas exports use file embeds.

See [Event Type Icons Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/event-type-icons.md) for implementation details.

---

### Multi-Spouse Visual Cues (v0.19.14)

Visual cues in the family chart clarify relationships when a person has multiple spouses, making it clear who the "hub" person is.

**GitHub Issue:** [#195](https://github.com/banisterious/obsidian-charted-roots/issues/195)

**The Problem:** When displaying multi-spouse families in the family chart, the horizontal layout can be ambiguous—making it unclear which person has multiple marriages.

**The Solution:** Spouse numbering on connecting edges (①, ② etc.) indicates marriage order. Numbers work in static exports (PNG, SVG, PDF) unlike hover-based solutions.

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Multi-spouse detection | `getSpouseNumberForLink()` identifies spouse order |
| Circled numbers | ①②③... displayed on spouse connection edges |
| Label positioning | Numbers positioned in visible gap between cards |
| Kinship toggle integration | Works with "Show kinship labels" toggle |
| Export compatibility | Labels included in PNG, SVG, and PDF exports |

See [Multi-Spouse Visual Cues Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/multi-spouse-visual-cues.md) for implementation details.

---

### GEDCOM Media Import (v0.19.13)

Import media object references (OBJE records) from GEDCOM files, bringing GEDCOM import to full parity with Gramps for media handling.

**GitHub Issue:** [#202](https://github.com/banisterious/obsidian-charted-roots/issues/202)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| OBJE record parsing | Parse top-level `0 @Oxxxx@ OBJE` records to build media handle → file path map |
| Reference collection | Collect `1 OBJE @Oxxxx@` references on INDI, FAM, SOUR, and event records |
| Path resolution | Convert external file paths to vault-relative wikilinks (filename-only by default) |
| Path prefix stripping | Optional setting to strip external path prefixes for complex folder structures |
| Import wizard preview | Live preview showing path → wikilink mappings before import |
| Vault validation | Validates files exist in vault and reports missing media after import |
| Inline OBJE support | Handle both pointer (`@Oxxxx@`) and inline OBJE formats |

**Import Wizard Options:**

- **Media references** — Enable/disable media import
- **Path prefix** — Optional external path prefix to strip from GEDCOM paths

**Frontmatter Output:**

```yaml
media:
  - "[[photo1.jpg]]"
  - "[[document.pdf]]"
```

**Note:** Media is added to person notes, event notes, and source notes based on where the OBJE reference appears in the GEDCOM file.

---

### Research Workflow Phase 1 (v0.19.11)

GPS-aligned research workflow entity types for managing research projects, reports, individual research notes, and research journals within Obsidian.

**GitHub Issue:** [#145](https://github.com/banisterious/obsidian-charted-roots/issues/145) (consolidates #124, #125)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| 5 research entity types | `research_project`, `research_report`, `individual_research_note`, `research_journal`, `research_log_entry` |
| Note type detection | Recognize entities via `cr_type` frontmatter property |
| Tag detection | Recognize via tags including `#irn` shorthand for Individual Research Notes |
| Statistics integration | Research section in Statistics view with entity counts and status breakdowns |
| Status tracking | Project statuses (open, in-progress, on-hold, completed) and report statuses (draft, review, final, published) |

**Entity Types:**

| Type | Purpose |
|------|---------|
| `research_project` | Hub for complex, multi-phase research cases |
| `research_report` | Living document analyzing specific research questions |
| `individual_research_note` | Synthesis between reports and person notes (IRN) |
| `research_journal` | Daily/session tracking across projects |
| `research_log_entry` | Individual log entries as separate queryable notes |

**Key Properties:**

- `subject` — Links IRN to the person being researched
- `up` — Links to parent in research hierarchy (project → report, etc.)
- `status` — Current state of project or report
- `private` — Exclude from exports when true
- `related` — Related research entities

**Files Created:**

- `src/research/types/research-types.ts` — Type definitions for research entities
- `src/research/index.ts` — Module exports

**Files Modified:**

- `src/utils/note-type-detection.ts` — Added research entity types and detection functions
- `src/statistics/types/statistics-types.ts` — Added research statistics types
- `src/statistics/services/statistics-service.ts` — Added research entity counting and `getResearchStatistics()`
- `src/statistics/constants/statistics-constants.ts` — Added RESEARCH section ID
- `src/statistics/ui/statistics-view.ts` — Added research section with entity cards and status breakdowns
- `styles/statistics.css` — Added research card and status badge styles

**Documentation:**

- [Research Workflow](Research-Workflow) — User documentation
- [Research Workflow Integration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/research-workflow-integration.md) — Detailed specifications

**Community Contributors:** @ANYroots (IRN structure, GPS methodology), @wilbry (lightweight approach, research journal concept)

---

### DNA Match Tracking (v0.19.9)

Opt-in DNA match tracking for genetic genealogists, enabling recording of key DNA matches alongside family tree research. All features are invisible when the setting is disabled (default: OFF).

**GitHub Issue:** [#126](https://github.com/banisterious/obsidian-charted-roots/issues/126)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| `enableDnaTracking` setting | Master toggle in Settings → Advanced → DNA tracking |
| DNA Match person type | Select "DNA Match" when creating persons to mark them as genetic matches |
| DNA Information fields | Track shared cM, testing company, kit ID, match type, endogamy flag, notes |
| `dna_match` relationship | Bidirectional relationship type (A→B automatically creates B→A) |
| DNA badge in person picker | Shows flask icon and shared cM value for DNA Match persons |
| `dna` relationship category | New category for DNA/genetic relationships |

**Match Types:**
- `BKM` — Best Known Match (confirmed relationship, high confidence)
- `BMM` — Best Mystery Match (strong match, relationship unknown)
- `confirmed` — DNA confirms documented relationship
- `unconfirmed` — Match recorded but not yet analyzed

**Design Philosophy:**
- Charted Roots is not a DNA analysis tool—specialized tools (DNAPainter, Genetic Affairs, etc.) handle that well
- Focus on tracking "key matches" (BKM/BMM methodology) rather than comprehensive DNA management
- All features are opt-in via settings; default experience is unchanged

**Files Modified:**

- `src/settings.ts` — Added `enableDnaTracking` setting
- `src/ui/settings-tab.ts` — Added DNA tracking toggle in Advanced section
- `src/models/person.ts` — Added `personType` and DNA properties to interfaces
- `src/ui/create-person-modal.ts` — Added Person Type dropdown and DNA fields
- `src/ui/control-center.ts` — Added DNA fields to Edit Person modal
- `src/relationships/types/relationship-types.ts` — Added `dna` category, `requiresSetting` property
- `src/relationships/constants/default-relationship-types.ts` — Added `dna_match` relationship type
- `src/core/bidirectional-linker.ts` — Added `syncDnaMatch()` and `removeDnaMatchLink()` methods
- `src/ui/person-picker-modal.ts` — Added DNA badge rendering

**Documentation:**

- [DNA Match Tracking Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/dna-match-tracking.md)

---

### Name Components (v0.19.7)

Explicit name component properties in frontmatter for multi-surname cultures (Hispanic, Portuguese) and maiden/married name tracking.

**GitHub Issues:** [#174](https://github.com/banisterious/obsidian-charted-roots/issues/174), [#192](https://github.com/banisterious/obsidian-charted-roots/issues/192)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| `given_name` property | First/given name(s) - populated from GEDCOM GIVN tag |
| `surnames` property | Array of surnames - supports multiple (Hispanic/Portuguese naming) |
| `maiden_name` property | Birth surname (already existed with aliases) |
| `married_names` property | Array of married surnames - supports multiple marriages |
| Statistics integration | Top Surnames counts all surnames in array |
| Split Wizard integration | Matches against all surname variants |
| GEDCOM import | Writes `given_name` and `surnames` from GIVN/SURN tags |
| GEDCOM export | Exports name components to GIVN/SURN tags |
| Create/Edit Person modal | Fields for all name component properties |

**Usage Examples:**

Hispanic dual surnames:
```yaml
name: "José García López"
surnames:
  - García
  - López
```

Maiden name tracking:
```yaml
name: "Jane Smith"
maiden_name: "Jones"
```

Maiden-name-as-primary convention:
```yaml
name: "Jane Jones"
married_names:
  - "Smith"
  - "Williams"
```

**Property Priority for Statistics:**

When computing surname statistics via `extractSurnames()`:
1. If `surnames` array exists → count each surname
2. Else if `maiden_name` exists → count that (for maiden-name-primary users)
3. Else → fall back to parsing last word from `name`

**Files Modified:**

- `src/utils/name-utils.ts` — **New**: `extractSurnames()`, `extractAllSurnames()`, `matchesSurname()`
- `src/core/property-alias-service.ts` — Added name component property definitions
- `src/core/family-graph.ts` — Added PersonNode properties, frontmatter parsing
- `src/statistics/services/statistics-service.ts` — Uses `extractSurnames()`
- `src/ui/split-wizard-modal.ts` — Uses `matchesSurname()` for matching
- `src/gedcom/gedcom-importer-v2.ts` — Writes name components to frontmatter
- `src/core/person-note-writer.ts` — Supports writing name components
- `src/ui/create-person-modal.ts` — Added name component input fields
- `src/ui/control-center.ts` — Passes name components to edit modal
- `main.ts` — Context menu passes name components to edit modal
- `src/gedcom/gedcom-exporter.ts` — Exports name components to GEDCOM tags

**Documentation:**

- [Name Components Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/name-components.md)

---

### Per-Map Marker Assignment (v0.19.6)

Restrict places to specific custom maps within a universe. Enables regional maps, era-specific views, and detail-level separation without affecting universe-wide filtering.

**GitHub Issue:** [#153](https://github.com/banisterious/obsidian-charted-roots/issues/153)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| `maps` property | Array of map IDs that a place should appear on |
| Backward compatibility | Places without `maps` appear on all maps in their universe |
| Path filtering | Paths/journeys only appear if both endpoints are visible on current map |
| Create Place modal | "Restrict to maps" checkbox section with available maps |
| Auto-select current map | When creating a place from a pixel map, current map is pre-selected |

**Usage:**

Add a `maps` property to place notes to restrict which maps they appear on:

```yaml
name: Fort Ticonderoga
universe: colonial-america
maps:
  - french-indian-war-map
  - revolutionary-war-map
```

**Filtering Logic:**
- If place has no `maps` property: Shows on all maps with matching universe (existing behavior)
- If place has `maps` property: Only shows on specified map(s)
- Events inherit filtering from their associated places
- Paths appear only if both endpoints are visible on the current map

**UI Integration:**

The Create/Edit Place modal includes a "Restrict to maps" section when custom maps exist in the vault:
- Checkboxes for each available map in the same universe
- Current map is highlighted and auto-selected when creating from a pixel map click
- Empty selection means "show on all maps" (backward compatible)

---

### GEDCOM Notes Support (v0.19.5)

Import GEDCOM NOTE tags attached to individuals into person notes, with support for inline notes, multi-line continuation, and shared NOTE record references.

**GitHub Issue:** [#179](https://github.com/banisterious/obsidian-charted-roots/issues/179)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Inline notes | `1 NOTE text` tags parsed and imported |
| Multi-line notes | `CONT` (newline) and `CONC` (concatenate) continuation support |
| Referenced notes | `1 NOTE @N001@` resolves shared NOTE records |
| Embedded notes | Notes appear in "## Notes" section with "### GEDCOM note" headers |
| Separate note files | Optional toggle creates individual note entity files with wikilinks |
| Import wizard toggle | Step 3 → Entity types → Notes checkbox |

**Import Options:**

- **Import notes** (default: on) — Import NOTE tags attached to individuals
- **Create separate note files** (default: off) — Create individual note files instead of embedding content

**Output Formats:**

Embedded (default):
```markdown
## Notes

### GEDCOM note

Information from Mary Jones in letter of September 25, 1990.
```

Separate file (when enabled):
- Creates `Note for {Person Name}.md` in Notes folder
- Person note contains wikilink: `- [[Note for John Smith]]`

**Files Modified:**

- `src/gedcom/gedcom-types.ts` — Added `notes`, `noteRefs` to individual interface; added `GedcomNoteRecord`
- `src/gedcom/gedcom-parser-v2.ts` — Parse `1 NOTE` under INDI; parse `0 @N001@ NOTE` records
- `src/gedcom/gedcom-importer-v2.ts` — Resolve notes, format and write to person notes or create separate files
- `src/gedcom/gedcom-note-formatter.ts` — New file: `formatGedcomNotesSection()`
- `src/gedcom/gedcom-import-wizard-modal.ts` — Added "Import notes" and "Create separate note files" toggles

**Documentation:**

- [GEDCOM Notes Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/gedcom-notes.md)

**Future Work:**

- Family-level notes (deferred)
- GEDCOM export with notes (deferred)

---

### Timeline Event Description Display (v0.19.5)

Timeline now shows event descriptions for all event types when a description exists, instead of showing the generic event title.

**GitHub Issue:** [#157](https://github.com/banisterious/obsidian-charted-roots/issues/157)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Description display | Events show "Type: description" when description exists |
| Birth/death exception | These events continue showing full title with person's name |
| List and markdown | Both timeline list view and markdown export updated |

**Example:**

Before: `1850 — Census of John Smith`
After: `1850 — Census: 1850 Federal Census`

**Implementation:**

Changed from allowlist (`DESCRIPTION_DISPLAY_TYPES`) to blocklist (`TITLE_ONLY_TYPES = ['birth', 'death']`). All other event types (census, custom, occupation, residence, military, education, marriage, engagement, etc.) now show description when available.

**Files Modified:**

- `src/dynamic-content/renderers/timeline-renderer.ts` — Updated display logic in `renderTimelineList()` and `generateMarkdown()`

**Related:**

- [#183](https://github.com/banisterious/obsidian-charted-roots/issues/183) — Birth event role filtering (tracked separately)

---

### Romantic Relationship Label Preference (v0.19.5)

UI preference setting to choose whether the plugin displays "Spouse" or "Partner" terminology throughout menus, forms, labels, and wizards. The underlying data model and property names remain unchanged.

**GitHub Issue:** [#167](https://github.com/banisterious/obsidian-charted-roots/issues/167)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Setting toggle | "Romantic relationship label" dropdown in Settings → Sex & gender |
| Terminology options | "Spouse" (default) or "Partner" |
| UI-only change | Affects ~37 UI strings across 14 files; no data model changes |

**What Changes:**
- All UI labels showing "Spouse"/"Spouses" switch to "Partner"/"Partners" when enabled
- Includes: person edit modals, family wizard, tree wizard, canvas settings, statistics display

**What Does NOT Change:**
- Frontmatter property names (`spouse`, `partners`)
- Property alias mappings
- Data model and relationship types
- Export formats (GEDCOM, CSV column headers)

**Files Added:**

- `src/utils/terminology.ts` — Helper functions for dynamic terminology

**Files Modified:**

- `src/settings.ts` — Setting interface, default value, UI dropdown
- `src/ui/modals/create-person-modal.ts` — Person creation/editing UI
- `src/ui/wizards/family-creation-wizard.ts` — Family wizard labels
- `src/control-center/tabs/preferences-tab.ts` — Display preferences
- `src/ui/modals/canvas-style-modal.ts` — Canvas style overrides
- `src/ui/wizards/unified-tree-wizard-modal.ts` — Tree wizard options
- `src/ui/wizards/split-wizard-modal.ts` — Canvas split options
- `src/ui/views/family-chart-view.ts` — Family chart relationship labels
- `src/control-center/control-center.ts` — Statistics display
- `src/ui/modals/merge-wizard-modal.ts` — Merge preview fields

**Documentation:**

- [Spouse/Partner Terminology Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/spouse-partner-terminology.md)

---

### Partial Date Support (v0.19.2)

Enhanced date handling to preserve partial dates and GEDCOM qualifiers throughout the import/export round-trip, with user-friendly display formatting.

**GitHub Issue:** [#172](https://github.com/banisterious/obsidian-charted-roots/issues/172)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Partial date import | Month-only dates (`MAR 1950`) preserved as `1950-03` instead of normalizing to `1950-03-01` |
| GEDCOM qualifier preservation | `ABT`, `BEF`, `AFT`, `CAL`, `EST` qualifiers stored as-is (e.g., `ABT 1878`) |
| Date range preservation | `BET 1882 AND 1885` stored intact |
| User-friendly display | Qualifiers formatted for readability: `ABT 1878` → "c. 1878", `BEF 1950` → "before 1950" |
| Export round-trip | Partial dates and qualifiers exported back to GEDCOM, Gramps, and GedcomX formats correctly |

**Display Formatting:**

| Stored Format | Display Format |
|---------------|----------------|
| `ABT 1878` | c. 1878 |
| `BEF 1950` | before 1950 |
| `AFT 1880` | after 1880 |
| `CAL 1945` | c. 1945 |
| `EST 1880` | c. 1880 |
| `BET 1882 AND 1885` | 1882–1885 |
| `1855-03` | Mar 1855 |
| `1855-03-15` | 15 Mar 1855 |

**Files Modified:**

- `src/import/gedcom-date-parser.ts` — Detect and preserve partial dates and qualifiers
- `src/import/gedcom-to-obsidian.ts` — Updated to use partial date parsing
- `src/dates/utils/date-display.ts` — New utility for user-friendly display formatting
- `src/dates/services/date-service.ts` — Added `formatDisplayDate()` method
- `src/export/gedcom-exporter.ts` — Export qualifiers in GEDCOM format
- `src/export/gramps-exporter.ts` — Export qualifiers in Gramps XML format
- `src/export/gedcomx-exporter.ts` — Export qualifiers in GedcomX JSON format

---

### Plugin Rename: Canvas Roots → Charted Roots (v0.19.0)

Renamed the plugin from "Canvas Roots" to "Charted Roots" to better reflect the plugin's broader genealogical visualization capabilities beyond Obsidian Canvas.

**GitHub Issue:** [#141](https://github.com/banisterious/obsidian-charted-roots/issues/141)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Plugin rename | All code, documentation, and UI updated from "Canvas Roots" to "Charted Roots" |
| Repository rename | GitHub repository renamed from `obsidian-canvas-roots` to `obsidian-charted-roots` |
| Automatic vault migration | One-time migration of canvas metadata and code blocks on first load |
| Backward compatibility | Dual-registration for protocol handlers and commands; old identifiers continue working |

**Migration Service:**

The plugin includes a one-time migration service that automatically updates:
- Canvas metadata: `plugin: 'canvas-roots'` → `plugin: 'charted-roots'`
- Code blocks: `canvas-roots-timeline`, `canvas-roots-relationships`, `canvas-roots-media` → `charted-roots-*`

**What Stays the Same:**
- All vault data and notes
- CSS class prefixes (`cr-*`)
- Property prefixes (`cr_*`)
- All plugin functionality and settings

**For BRAT Users:**

If you installed via BRAT using the old repository name, update your configuration:
1. Settings → BRAT → Beta Plugin List
2. Remove `banisterious/obsidian-canvas-roots`
3. Add `banisterious/obsidian-charted-roots`

**Files Added:**

- `src/migration/plugin-rename-migration-service.ts` — One-time vault migration service

**Documentation:**

- [Plugin Rename Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/plugin-rename.md)
- Community discussion: [#58](https://github.com/banisterious/obsidian-charted-roots/discussions/58)

---

## v0.18.x

### Automatic Wikilink Resolution (v0.18.32)

Automatically resolve `[[Person Name]]` wikilinks in relationship fields to `cr_id` values, creating family graph relationships without requiring manual `_id` field population.

**GitHub Issue:** [#104](https://github.com/banisterious/obsidian-charted-roots/issues/104)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| PersonIndexService | Centralized service for cr_id ↔ file lookups with caching |
| FamilyGraph integration | Wikilinks in relationship fields automatically resolve to cr_id values |
| Data Quality warnings | Ambiguous wikilinks (multiple files with same basename) surface in Data Quality report |
| Performance optimization | Index built on plugin load, updated incrementally via metadataCache events |
| Service consolidation | RelationshipValidator and ProofSummaryService use centralized PersonIndexService |

**Key Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| Precedence | Explicit `_id` fields always take precedence over wikilink resolution |
| Read-only | Resolution does not modify user files |
| Ambiguity handling | When multiple files share the same basename, resolution returns null and a warning is shown |

**Example:**

```yaml
# Before: Required explicit _id field
father: "[[John Smith]]"
father_id: "abc-123-def-456"

# After: Just the wikilink works
father: "[[John Smith]]"
# cr_id resolved automatically from John Smith.md
```

**Files Added:**

- `src/core/person-index-service.ts` — Centralized person index with wikilink resolution

**Files Modified:**

- `src/core/family-graph.ts` — Integrated PersonIndexService for wikilink resolution
- `src/core/relationship-validator.ts` — Uses PersonIndexService for cr_id lookups
- `src/sources/services/proof-summary-service.ts` — Uses PersonIndexService for wikilink resolution
- `src/core/data-quality.ts` — Added ambiguous wikilink detection
- `main.ts` — Initializes and wires PersonIndexService to all consumers

**Documentation:**

- [Wikilink Resolution Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/wikilink-to-crid-resolution.md)

---

### MyHeritage GEDCOM Import Compatibility (v0.18.28)

Automatic detection and preprocessing of MyHeritage GEDCOM exports to fix vendor-specific formatting issues.

**GitHub Issue:** [#144](https://github.com/banisterious/obsidian-charted-roots/issues/144)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Auto-detection | Detects MyHeritage GEDCOM files by `1 SOUR MYHERITAGE` tag and double-encoded entities |
| UTF-8 BOM removal | Strips byte order mark that prevents parsing |
| Double-encoded entity fix | Decodes `&amp;lt;` → `<`, `&amp;nbsp;` → space, etc. |
| Single-encoded entity fix | Handles mixed encoding (single + double in same file) |
| `<br>` tag conversion | Converts `<br>` and `<br/>` to newlines |
| Decorative HTML stripping | Removes `<a>text</a>` tags without href attributes |
| Compatibility mode setting | Settings → Data & detection with Auto/MyHeritage/None options |
| Import results reporting | Shows preprocessing fixes applied in import results modal |

**Compatibility Modes:**

| Mode | Behavior |
|------|----------|
| Auto (default) | Detect MyHeritage files and apply fixes automatically |
| MyHeritage | Always apply fixes (for manually edited files) |
| None | Disable preprocessing (original behavior) |

**Files Added:**

- `src/gedcom/gedcom-preprocessor.ts` — Preprocessing logic with detection and fixes

**Files Modified:**

- `src/gedcom/gedcom-importer-v2.ts` — Integrated preprocessor into import pipeline
- `src/gedcom/gedcom-types.ts` — Added `preprocessingApplied` and `preprocessingFixes` to result types
- `src/settings.ts` — Added `gedcomCompatibilityMode` setting and UI control
- `src/ui/gedcom-import-modal.ts` — Display preprocessing info in import results

**Documentation:**

- [MyHeritage GEDCOM Compatibility Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/myheritage-gedcom-compatibility.md)

---

### Optional Person Names (v0.18.27)

Create placeholder person notes without names, filling in details later as research progresses.

**GitHub Issue:** [#140](https://github.com/banisterious/obsidian-charted-roots/issues/140)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Optional name fields | Given Name and Surname are no longer required when creating person notes |
| Unnamed display | Unnamed persons display as "Unnamed" in Family Wizard and other UI components |
| Data quality warning | `NO_NAME` warning added to Data Quality Report for persons without names |
| Completeness metrics | `withName` metric added to track persons with names vs. unnamed |

**Use Case:**

Genealogists often know relationships before identities. For example, "John's father existed" is known before discovering the father's name. This feature allows creating placeholder persons to build family structures, then filling in names as research progresses.

**Files Modified:**

- `src/core/person-note-writer.ts` — Made `name` property optional in `PersonData` interface
- `src/ui/create-person-modal.ts` — Removed name validation, allowing empty names
- `src/ui/family-creation-wizard.ts` — Display "Unnamed" fallback for persons without names
- `src/core/data-quality.ts` — Added `NO_NAME` warning and `withName` completeness metric

**Documentation:**

- [Optional Person Names Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/optional-person-names.md)

---

### DMS Coordinate Conversion (v0.18.27)

Opt-in DMS (degrees, minutes, seconds) parsing for coordinate input in place creation.

**GitHub Issue:** [#121](https://github.com/banisterious/obsidian-charted-roots/issues/121)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| DMS format parsing | Enter coordinates like `33°51'08"N` or `33 51 08 N` |
| Auto-conversion | DMS automatically converts to decimal degrees for storage |
| Opt-in setting | Enable via Settings → Data & detection → "Accept DMS coordinate format" |
| Multiple formats | Supports symbol notation, space-separated, hyphen-separated, and direction prefix |

**Supported Formats:**

- `33°51'08"N` — Standard DMS with symbols
- `33 51 08 N` — Space-separated
- `33-51-08-N` — Hyphen-separated
- `N 33 51 08` — Direction prefix
- `33.8522` — Decimal pass-through (always supported)

**Files Modified:**

- `src/utils/coordinate-converter.ts` — New DMS parsing utility
- `src/settings.ts` — Added `enableDMSCoordinates` setting
- `src/ui/create-place-modal.ts` — Integrated DMS parser into coordinate inputs

**Documentation:**

- [DMS Coordinate Conversion Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/dms-coordinate-conversion.md)

---

### DNA Match Tracking - Phase 1 (v0.18.27)

Lightweight DNA match tracking for genetic genealogy workflows.

**GitHub Issue:** [#126](https://github.com/banisterious/obsidian-charted-roots/issues/126)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| DNA match template | Template snippet in template snippets modal with Templater prompts |
| Bases view | "DNA Matches" view in People Bases template, filtered by `dna_shared_cm` |
| Property display names | Friendly names for DNA properties in Bases views |
| Documented properties | `dna_shared_cm`, `dna_testing_company`, `dna_kit_id`, `dna_match_type`, `dna_endogamy_flag`, `dna_notes` |

**DNA Properties:**

| Property | Description | Example |
|----------|-------------|---------|
| `dna_shared_cm` | Shared centiMorgans | `1847` |
| `dna_testing_company` | Testing company | `AncestryDNA`, `23andMe`, `FamilyTreeDNA` |
| `dna_kit_id` | Kit identifier | `ABC123` |
| `dna_match_type` | Match classification | `BKM`, `BMM`, `confirmed`, `unconfirmed` |
| `dna_endogamy_flag` | Endogamy indicator | `true` / `false` |
| `dna_notes` | Free-form notes | `Matches on chromosome 7` |

**Match Types:**

- `BKM` — Best Known Match (confirmed relationship, high confidence)
- `BMM` — Best Mystery Match (strong match, relationship unknown)
- `confirmed` — DNA confirms documented relationship
- `unconfirmed` — Match recorded but not yet analyzed

**Files Modified:**

- `src/ui/template-snippets-modal.ts` — Added DNA match template
- `src/constants/base-template.ts` — Added DNA Matches view and property display names

**Future Phases:**

Phase 2-4 (planned) will add UI support for DNA Match person subtype, DNA relationship type, and visualization/reports. See [DNA Match Tracking Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/dna-match-tracking.md) for details.

---

### Web Clipper Integration - Phase 1 (v0.18.25)

Auto-detect and manage web-clipped notes in staging workflow with dedicated filtering and tracking.

**GitHub Issue:** [#128](https://github.com/banisterious/obsidian-plugins/issues/128)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Clipper metadata detection | Auto-detect notes with `clip_source_type`, `clipped_from`, or `clipped_date` properties |
| File watcher integration | Real-time detection when Web Clipper creates notes in staging folder |
| Dashboard indicator | Unified "Staging" card shows breakdown: X clipped / Y other notes |
| Staging Manager filtering | Toggle buttons: [All] [Clipped] [Other] with multi-level filtering |
| Unread clip tracking | Unread clip count resets when Staging Manager opens |
| Template flexibility | Works with any user-created Web Clipper templates |

**Clipper Metadata Properties:**

| Property | Description | Example |
|----------|-------------|---------|
| `clip_source_type` | Type of clipped content | `obituary`, `census`, `article` |
| `clipped_from` | Original source URL | `https://example.com/article` |
| `clipped_date` | Date content was clipped | `2026-01-05` |

**Staging Workflow Integration:**

```
Web Clipper creates note → Auto-detected in staging →
Review in Staging Manager (filter: Clipped) →
Promote to main tree → Cleanup
```

**Multi-Level Filtering:**

The toggle buttons filter at three levels:
1. **Stats summary** — Only counts matching entities
2. **Batch cards** — Only shows batches containing matches
3. **File lists** — Only shows matching files within batches

**UI Components:**

| Component | Description |
|-----------|-------------|
| Dashboard card | Shows "X clipped / Y other" breakdown when clips present |
| Filter toggles | Three buttons: All (default), Clipped, Other |
| Active state | Selected filter highlighted with accent color |
| Empty states | "No clipped notes" / "No other notes" when filter yields no results |

**Files Modified:**

- `src/core/staging-service.ts` — Clipper metadata detection, file watcher
- `src/ui/staging-management-modal.ts` — Filter UI and multi-level filtering logic
- `src/ui/views/control-center-view.ts` — Dashboard card hybrid visibility
- `styles/staging-manager.css` — Filter button styles

**Documentation:**

- [Web Clipper Integration](Web-Clipper-Integration) — User guide with setup and workflow
- [Data Entry](Data-Entry#clipping-from-web-sources) — Comparison with other data entry methods
- [Web Clipper Integration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/web-clipper-integration.md) — Implementation details

**Future Phases:**

Phase 2 and beyond (planned):
- LLM extraction guidance in wiki
- Multi-person clipping from census pages
- Auto-create source notes linked to clipped people

---

### Staging Management (v0.18.24)

Dedicated UI for managing staged imports with batch organization, duplicate detection, and promotion workflow.

**GitHub Issue:** [#137](https://github.com/banisterious/obsidian-charted-roots/issues/137)

**Features Implemented:**

| Feature | Description |
|---------|-------------|
| Staging Manager modal | Accessible via Control Center → Staging Manager button |
| Batch organization | Imports grouped by timestamped subfolder (YYYY-MM-DD_HH-mm-ss) |
| Entity breakdown | Count of people, places, sources, events, organizations per batch |
| Duplicate detection | Cross-import detection identifies potential duplicates across batches |
| Expandable file lists | Click batch headers to preview individual entities before promoting |
| Promote to main tree | Move staged entities from staging folder to main tree folder |
| Batch cleanup | Delete batches after promotion or when no longer needed |
| File preview | Click any file row to open in new tab for review |

**Staging Workflow:**

```
Import → Review in Staging Manager → Resolve duplicates → Promote → Cleanup
```

**Duplicate Detection:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Name similarity | 60% | Levenshtein distance comparison |
| Date proximity | 30% | Birth/death year within threshold |
| Gender match | 5% bonus | Additional confidence when genders match |

Default thresholds: minConfidence=60, minNameSimilarity=70, maxYearDifference=5

**UI Components:**

| Component | Description |
|-----------|-------------|
| Stats summary | Total files, batches, and potential duplicates |
| Batch cards | Collapsible cards showing batch info and entity counts |
| Entity type badges | Color-coded badges (person, place, source, event, org) |
| Chevron toggle | Visual indicator for expand/collapse state |
| Action buttons | Promote All, Delete Batch per batch card |

**Files Modified:**

- `src/ui/staging-management-modal.ts` — Main modal with batch listing and file preview
- `src/core/staging-service.ts` — Staging folder operations and file retrieval
- `src/core/cross-import-detection.ts` — Duplicate detection algorithms
- `styles/staging-manager.css` — Modal and file list styling

**Documentation:**

- [Import Workflow](Import-Workflow#staging-folder) — Staging folder configuration
- [Staging Management Planning](../docs/planning/staging-management.md) — Implementation details

---

### Export Privacy & Sensitive Data (v0.18.22)

Comprehensive privacy protection for sensitive genealogical data during exports and canvas generation.

**GitHub Issue:** [#95](https://github.com/banisterious/obsidian-charted-roots/issues/95)

**Features Implemented:**

| Phase | Feature | Description |
|-------|---------|-------------|
| 1 | Sensitive field redaction | SSN, identity numbers automatically excluded via `PersonNode` whitelist |
| 2 | `cr_living` override | Manual frontmatter property to override automatic living detection |
| 3 | Private fields list | `private_fields` frontmatter property for user-defined sensitive fields |
| 4-5 | Deadname + Export warnings | Confirmation dialog before exporting private fields |
| 6 | Discoverability | Post-import notice, export preview warning when privacy disabled |
| 7 | Pronouns field | `pronouns` property displayed in pickers and reports |
| 8 | Canvas privacy | Privacy-aware canvas/Excalidraw generation in Tree Wizard |

**Canvas Privacy Protection:**

| Feature | Description |
|---------|-------------|
| Text node obfuscation | Living persons shown as text nodes with obfuscated names |
| Hidden option | Exclude living persons entirely from generated canvas |
| Wikilinks preserved | Text nodes include `[[filename]]` for navigation |
| Preview integration | Wizard shows count of privacy-protected persons |
| Format choice | "Text node" (obfuscated) or "File node" (clickable) |

**Known Limitations:**
- Canvas JSON is plain text (not encrypted)
- File nodes reveal identity in canvas JSON
- Wikilinks in text nodes contain original filename
- Privacy applied at generation time only (no runtime toggle)

**Files Modified:**
- `src/core/canvas-generator.ts` — Privacy node creation helpers
- `src/core/privacy-service.ts` — Sensitive field utilities
- `src/trees/ui/unified-tree-wizard-modal.ts` — Privacy UI and preview count

**Documentation:**
- [Privacy & Security](Privacy-And-Security) — User guide
- [SECURITY.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/SECURITY.md) — Security policy
- [Export Privacy Planning](../docs/planning/archive/export-privacy-sensitive-data.md) — Implementation details

---

### Card Style Options (v0.18.15)

Choose from 4 card styles in Family Chart view to match your visualization needs.

**Card Styles:**

| Style | Description |
|-------|-------------|
| Rectangle | Default style with avatar thumbnails and full details (name, dates) |
| Circle | Circular avatar cards with name labels below |
| Compact | Text-only cards without avatars for denser layouts |
| Mini | Smaller name-only cards for high-level overviews |

**Features:**

| Feature | Description |
|---------|-------------|
| Style menu | Access via toolbar Style menu → Card Style submenu |
| State persistence | Card style persists across Obsidian restarts |
| Export support | PNG/PDF export works with all card styles including Circle |
| Open note button | Appears on all card styles (smaller on Mini) |

**Technical Details:**

- Rectangle, Compact, Mini use SVG card renderer
- Circle uses HTML card renderer with custom styling
- Circle cards are converted to native SVG elements during export to avoid tainted canvas issues
- State is saved immediately when changing style via `requestSaveLayout()`

**Files Modified:**

| File | Changes |
|------|---------|
| `src/ui/views/family-chart-view.ts` | Card style state, menu, renderer switching, export embedding |
| `styles/family-chart-view.css` | Circle card styles, gender-based colors |

---

### Gramps Notes Integration (v0.18.13)

Import notes attached to Gramps entities during Gramps XML/.gpkg import.

**Phased Implementation:**

| Phase | Feature | Version | Status |
|-------|---------|---------|--------|
| 1 | Embedded person notes | v0.18.13 | ✅ Complete |
| 2 | Other entity notes (events, places) | v0.18.13 | ✅ Complete |
| 3 | Family entity type | — | Deferred |
| 4 | Separate note files | v0.18.15 | ✅ Complete |
| 5 | Export & sync back to Gramps | — | Deferred |

**Phase 1-2: Embedded Notes (v0.18.13)**

| Feature | Description |
|---------|-------------|
| Person notes | Import notes attached to persons as "## Notes" section at bottom of person note |
| Multiple notes | Organized by type (e.g., "### Research", "### Person Note") |
| Style conversion | Bold, italic, strikethrough, underline, superscript, subscript, links |
| Formatted notes | Preformatted notes wrapped in code fences to preserve whitespace |
| Privacy handling | `private: true` added to frontmatter if any note has privacy flag |
| Event notes | Notes attached to events appended to event note content |
| Place notes | Notes attached to places appended to place note content |
| Family notes | Family-level notes attached to marriage/partnership events |
| Import wizard | Toggle to enable/disable notes import (enabled by default) |

**Phase 4: Separate Note Files (v0.18.15)**

| Feature | Description |
|---------|-------------|
| Import option | "Create separate note files" checkbox in Gramps import wizard (opt-in) |
| Note entities | Notes created as `cr_type: note` entities in configured Notes folder |
| Note naming | Generated from type + first referencing entity (e.g., "Research on John Smith") |
| Entity linking | Entity notes sections use wikilinks instead of embedded content |
| Create Note modal | Manual note creation with note type, title, privacy toggle, linked entities |
| Context menu | "New Charted Roots note" in Notes folder right-click menu |
| Command palette | "Charted Roots: Create note" command |
| Bases template | Notes base template with 11 views |

**Deferred Phases:**

Phases 3 (Family Entity) and 5 (Export & Sync) are deferred indefinitely pending user demand. See [planning doc](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/gramps-notes-family-integration.md) for rationale.

**Documentation:**
- See [Gramps Notes & Family Integration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/gramps-notes-family-integration.md) for detailed specifications

---

### Edit Person Events & Sources (v0.18.14)

Add events and sources sections to the Edit Person modal, allowing users to manage all person-related data from a single interface instead of editing multiple notes separately.

**Features:**

| Feature | Description |
|---------|-------------|
| Sources section | Multi-value picker to link source notes with Link and Create buttons |
| Source storage | Stores as `sources` (wikilinks) and `sources_id` (cr_ids) arrays for reliable linking |
| Events section | Display events referencing this person with type badges and dates |
| Event linking | Link/unlink existing events or create new events with person pre-filled |
| Type badges | Color-coded type badges for both events and sources matching picker modal styles |

**Data Model:**

- Events use inverse relationships: event notes contain `persons: ["[[Person]]"]`
- Linking an event from the person modal modifies the event note, not the person note
- Sources follow the dual-storage pattern: `sources` (wikilinks) + `sources_id` (cr_ids)

**Implementation:**

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Sources section with multi-value picker | ✅ Complete |
| 2 | Events section with link/create/unlink | ✅ Complete |
| 3 | Polish (type badges, display formatting) | ✅ Complete |

**Bug Fixes:**

| Fix | Description |
|-----|-------------|
| Context menu Edit Person | Fixed missing plugin reference causing "Plugin not available" error |
| Children display | Fixed children displaying as cr_ids instead of names (#86) |

**Documentation:**
- See [Edit Person Events & Sources Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/edit-person-events-sources.md) for detailed specifications

---

### Cleanup Wizard Phase 4 (v0.18.11)

User experience refinements for the Post-Import Cleanup Wizard, improving accessibility and feedback during batch operations.

**Features:**

| Feature | Description |
|---------|-------------|
| Batch Progress Indicators | Real-time progress bars during batch operations (Steps 2-6, 10-14) showing current/total count and current file |
| Keyboard Navigation | Full keyboard accessibility: arrow keys for tile selection, Enter/Space to activate, Escape to go back |

**Batch Progress Implementation:**

- Progress callbacks added to all batch methods in `DataQualityService` and migration services
- UI re-renders every 5 items to show progress without excessive updates
- Displays "Processing X of Y notes..." with animated progress bar
- Shows current filename being processed

**Keyboard Navigation Implementation:**

- Arrow keys navigate between tiles on overview screen
- Enter/Space activates focused tile
- Escape returns to overview or closes modal from step view
- ARIA attributes (role, aria-label) for screen reader accessibility
- Visual focus indicators matching hover styles

**Remaining Phase 4 Tasks (Deferred):**

| Task | Status | Notes |
|------|--------|-------|
| Step Reordering | Deferred | Drag-drop tiles with dependency validation |
| Cleanup Profiles | Deferred | Save/load named configurations |
| Step Animations | Deferred | Smooth transitions between views |
| Schema Integration | Deferred | Depends on schema validation feature |

**Documentation:**
- See [Cleanup Wizard Phase 4 Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/cleanup-wizard-phase4.md) for detailed specifications

---

### Property Naming Normalization (v0.18.11)

Standardized property naming for consistency and Obsidian compatibility, completing the `child` → `children` migration.

**Problem Solved:**

The codebase had inconsistent naming for the children wikilink property:
- `child` (singular) - legacy, used by older code paths
- `children` (plural) - preferred, matches `children_id`

This caused duplicate properties to appear in YAML when both systems wrote to the same note.

**Solution:**

| Component | Change |
|-----------|--------|
| Cleanup Wizard Step 14 | Batch migrate `child` → `children` across vault with preview |
| Documentation | `children` marked as canonical in Frontmatter-Reference.md |
| Deprecation Notice | Clear deprecation note with migration instructions |
| Wizard Extensibility | Fixed hardcoded step count to use `WIZARD_STEPS.length` |

**Migration Logic:**
- Detects person notes with legacy `child` property
- Merges with existing `children` if both exist (deduplicates)
- Removes legacy `child` property after migration

**Backward Compatibility:**
- Plugin reads both `child` and `children` during transition
- Future breaking change to remove `child` read support planned

**Documentation:**
- See [Deprecate Child Property Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/deprecate-child-property.md) for detailed specifications

---

### Custom Map Authoring (v0.18.10)

Streamlined custom map creation and place positioning, eliminating manual coordinate entry.

**Features:**

| Feature | Description |
|---------|-------------|
| Map Creation Wizard | 4-step guided wizard: select image → configure map → add initial places → review & create |
| Right-Click to Create Place | Right-click on custom map → "Create place here" → coordinates auto-filled |
| Draggable Place Markers | Drag markers to reposition (edit mode required), auto-update frontmatter, undo support |
| Place Marker Context Menu | Right-click markers to edit, open note, or copy coordinates |
| Icon-Only Toolbar | Map View toolbar buttons converted to icons with tooltips for space efficiency |

**Map Creation Wizard Steps:**
1. **Select Image** — Browse vault for map image with preview and auto-detected dimensions
2. **Configure Map** — Set name, universe (optional), coordinate system (pixel default for fantasy maps)
3. **Add Places** — Click on map preview to add initial locations (optional, can skip)
4. **Review & Create** — Summary view, then create map note and all place notes at once

**Entry Points:**
- Control Center → Maps → "Create map wizard"
- Command palette: "Charted Roots: Create custom map"
- Context menu on image files: "Use as custom map"

**Technical Notes:**
- Wizard supports inline universe creation
- Modal state persistence allows resuming interrupted sessions
- Coordinates properly convert between DOM (y=0 at top) and Leaflet Simple CRS (y=0 at bottom)

**Documentation:**
- See [Custom Map Authoring Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/custom-map-authoring.md) for detailed specifications

---

### Nested Properties Redesign (v0.18.9)

Redesigned two features to use Obsidian-compatible flat property formats, eliminating "Type mismatch" warnings in the Properties panel and preventing data corruption.

**Problem Solved:**

Two plugin features used nested YAML structures incompatible with Obsidian's property panel:
- `sourced_facts` (Evidence Tracking) - nested objects with source arrays
- `events` (Life Events) - inline array of event objects

This caused "Type mismatch" warnings and risked data corruption if users clicked "update" in the property panel. ([GitHub Issue #52](https://github.com/banisterious/obsidian-charted-roots/issues/52))

**Solution:**

**1. Evidence Tracking → Flat Properties**

Replaced nested `sourced_facts` object with individual flat properties:

```yaml
# Old format (nested - incompatible)
sourced_facts:
  birth_date:
    sources:
      - "[[Census 1870]]"
  death_date:
    sources:
      - "[[Death Certificate]]"

# New format (flat - compatible)
sourced_birth_date:
  - "[[Census 1870]]"
sourced_death_date:
  - "[[Death Certificate]]"
```

10 flat properties for each fact type:
- `sourced_birth_date`, `sourced_birth_place`
- `sourced_death_date`, `sourced_death_place`
- `sourced_parents`, `sourced_spouse`
- `sourced_marriage_date`, `sourced_marriage_place`
- `sourced_occupation`, `sourced_residence`

**2. Life Events → Event Note Files**

Replaced inline `events` array with separate event note files:

```yaml
# Old format (inline array - incompatible)
events:
  - event_type: residence
    place: "[[New York]]"
    date_from: "1920"

# New format (event note links - compatible)
life_events:
  - "[[Events/John Smith - Residence 1920]]"
```

Each event becomes a first-class note with full frontmatter, enabling:
- Searchability and linking
- Tags and attachments
- Source citations per event
- Organized in Events folder

**3. Cleanup Wizard Integration**

Added two new migration steps (now 13-step wizard):

| Step | Name | Description |
|------|------|-------------|
| 12 | Migrate Evidence Tracking | Convert `sourced_facts` → `sourced_*` flat properties |
| 13 | Migrate Life Events | Convert inline `events` → event note files with `life_events` links |

**4. Migration Notice (v0.18.9)**

- Shows on upgrade to v0.18.9+
- Explains both migrations with before/after examples
- Checkmarks indicate completed migrations
- "Open Cleanup Wizard" button for migration
- "Skip for now" button as escape hatch

**5. Backward Compatibility**

- Plugin reads both old and new formats during transition
- Old data continues to work until migrated
- Migration can be done at user's convenience

**Benefits:**
- No more "Type mismatch" warnings in Properties panel
- Safe to edit properties without data corruption
- Better Dataview and Bases compatibility
- Each event as a note enables linking, tags, and attachments

**Files Changed:**
- `src/sources/types/source-types.ts` - New property types and mappings
- `src/types/frontmatter.ts` - New `sourced_*` and `life_events` properties
- `src/sources/services/evidence-service.ts` - Dual-format reading
- `src/ui/control-center.ts` - Write to flat properties
- `src/sources/services/sourced-facts-migration-service.ts` - Step 12 migration
- `src/events/services/life-events-migration-service.ts` - Step 13 migration
- `src/ui/cleanup-wizard-modal.ts` - Steps 12 and 13
- `src/ui/views/migration-notice-view.ts` - v0.18.9 notice
- `src/settings.ts` - Migration completion tracking

---

### Inclusive Parent Relationships (v0.18.7)

Opt-in gender-neutral parent relationship support allowing users to represent diverse family structures while preserving traditional father/mother fields.

**Problem Solved:**

Users with nonbinary parents or those who prefer gender-neutral terminology had no way to represent these relationships. The plugin only supported gendered parent fields (father/mother), which doesn't accommodate all family structures.

**User Request:** "What if one or both parents are nonbinary? Could you add a 'Parent' option to father/mother?" ([GitHub Issue #63](https://github.com/banisterious/obsidian-charted-roots/issues/63))

**Solution:**

A complete opt-in gender-neutral parent system that coexists with traditional relationships:

**1. Settings (Control Center > Preferences)**
- **Enable Inclusive Parents** toggle (default: OFF)
- **Parent Field Label** text setting for customization (default: "Parents")
  - Examples: "Parents", "Guardians", "Progenitors", "Lolos"
  - Label shown in UI only; frontmatter always uses `parents` property
- Conditional visibility: label setting only shown when toggle enabled

**2. Schema Changes**
- New `parents` property (wikilinks, can be array for multiple parents)
- New `parents_id` property (Charted Roots IDs, dual storage pattern)
- Independent of `father`/`mother` — users can use either or both
- Supports mixed usage for blended families or migration scenarios

**3. Create/Edit Person Modal**
- Parents field appears when setting enabled (above father/mother)
- Multi-select person picker (same pattern as children field)
- Inline parent creation via person picker
- No gender pre-fill (unlike father/mother)
- Uses custom label from settings

**4. Family Graph Integration**
- FamilyGraphService reads `parents`/`parents_id` relationships
- Included in ancestor/descendant calculations
- Same treatment as father/mother for graph traversal
- Spouse edges between 2 parents (same pattern as father/mother)
- Priority order for fallback: biological → gender-neutral → adoptive

**5. Bidirectional Linking**
- When person added to `parents` array, automatically adds to each parent's `children` array
- Uses dual storage: both wikilinks (`parents`) and IDs (`parents_id`)
- Deduplication prevents duplicate entries
- Handles removal: when parent removed, child removed from their `children`
- Supports aliased wikilinks (`[[basename|name]]`) when filename differs from name

**6. Relationship Displays**
- **Relationships Block** (`canvas-roots-relationships`): Shows parents with "Parent" label
- **Family Chart View**: Displays gender-neutral parents in interactive tree
- **Sibling Detection**: Checks gender-neutral parents' children for siblings

**Design Principles:**

1. **Opt-in, not replacement** — Father/mother fields remain; this adds alongside
2. **Configurable** — Users customize terminology to their preference
3. **Non-disruptive** — Users with traditional setups see no UI changes
4. **Coexistent** — Can use father, mother, AND parents simultaneously

**Schema Example:**

```yaml
# Child's note
name: Jamie Smith
parents:
  - "[[Alex Smith]]"
  - "[[Jordan Smith]]"
parents_id:
  - "I0045"
  - "I0046"
```

```yaml
# Parent's note (automatically updated via bidirectional linking)
name: Alex Smith
children:
  - "[[Jamie Smith]]"
children_id:
  - "I0050"
```

**Implementation:**

**Files Modified:**
- [src/settings.ts](../../src/settings.ts) — Settings schema and UI
- [src/types/frontmatter.ts](../../src/types/frontmatter.ts#L62-L63) — Schema definition
- [src/core/family-graph.ts](../../src/core/family-graph.ts#L48) — Family graph integration
- [src/core/bidirectional-linker.ts](../../src/core/bidirectional-linker.ts#L227-L241) — Bidirectional sync
- [src/core/person-note-writer.ts](../../src/core/person-note-writer.ts#L393-L412) — Frontmatter writing
- [src/dynamic-content/renderers/relationships-renderer.ts](../../src/dynamic-content/renderers/relationships-renderer.ts#L150-L156) — Relationships display
- [src/ui/views/family-chart-view.ts](../../src/ui/views/family-chart-view.ts#L1090-L1097) — Family Chart View

**User Benefits:**
- Represents nonbinary parents respectfully
- Supports diverse family structures (queer families, cultural variations)
- Fully customizable terminology
- Backward compatible — no disruption to existing workflows
- Full integration across all family graph features

**Technical Details:**

**Dual Storage Pattern:**
```yaml
# Both wikilinks and IDs stored for flexibility
parents: ["[[Alex Smith]]"]  # For display and linking
parents_id: ["I0045"]         # For reliable graph traversal
```

**Priority Order (Fallback Logic):**
1. Check biological parents (father/mother)
2. If none, check gender-neutral parents
3. If none, check adoptive parents

**Bidirectional Sync:**
- Uses same `children` array as father/mother relationships
- Each parent in `parents` array gets child added to their `children`
- Deduplication by both cr_id and wikilink
- Deletion detection for relationship cleanup

**Planning Documentation:**
- See [planning document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/inclusive-parent-relationships.md) for detailed specifications and design decisions

---

### Media Upload and Management Enhancement (v0.18.6)

Comprehensive media upload and management system allowing users to upload files directly from Charted Roots and link them to entities without manual file management.

**Problem Solved:**

Users could link existing vault files to entities (people, places, events, etc.), but had no way to upload new files directly from the plugin. This required breaking the workflow to manually add files to the vault before linking them, creating friction when attaching scanned documents, photos, or certificates to research.

**User Request:** "Can't link the Birth Certificate or picture" ([GitHub Issue #60](https://github.com/banisterious/obsidian-charted-roots/issues/60))

**Solution:**

A complete media upload and linking system with multiple workflows:

**1. Settings Enhancement**
- Drag-and-drop reordering of media folders in Preferences
- First folder in list becomes upload destination
- Visual feedback during drag operations

**2. Expanded Media Manager Dashboard**
- 6-tile layout (3×2 grid) vs. previous 4-tile layout
- **Row 1 (Browse & Discover):**
  - Linked Media Gallery — view all linked media with filters
  - Find Unlinked — discover orphaned media files
  - Source Media Linker — smart filename-based matching
- **Row 2 (Add & Link):**
  - Upload Media — standalone file upload with optional linking
  - Link Media — media-first workflow (select files → choose entities)
  - Bulk Link to Entities — entity-first workflow (select entities → choose files)

**3. Standalone Upload Modal**
- Drag-and-drop file upload with browse fallback
- Upload to first configured media folder
- Read-only destination display with helpful hint
- Multiple file selection
- Auto-rename collision handling (incremental numbering)
- File type validation
- Optional entity linking after upload

**4. Inline Upload in Media Picker**
- "Upload files..." button in MediaPickerModal
- Follows PlacePickerModal "Create new place" pattern
- Auto-selects newly uploaded files
- Available in both context menu and Dashboard workflows

**5. Entity Picker Modal**
- Select entities after choosing media files (media-first workflow)
- Supports all entity types: Person, Event, Place, Organization, Source
- **Person-specific filters:**
  - Living status: All / Living only / Deceased only
  - Birth date: All / Has date / Missing date
  - Sex: All / Male / Female
- **Person-specific sorting:**
  - Name (A-Z / Z-A)
  - Birth year (oldest first / youngest first)
  - Recently modified
- Shows which entities already have selected media linked
- Bulk linking with progress modal for ≥5 entities

**6. Consistent Upload Availability**
- Context menu flow: Right-click entity → Media → Link media → Upload files
- Media Manager tile: Link Media → Upload files
- Both workflows use same enhanced MediaPickerModal

**Architecture:**

**"Read Many, Write One" model:**
- Files upload to `mediaFolders[0]` (first configured folder)
- MediaPickerModal browses ALL media folders
- Users can reorganize files later via Obsidian's file explorer
- Drag-and-drop reordering in settings allows changing upload destination

**Key Design Decisions:**
- Media folders separate from maps folder (maps via place map picker)
- No destination dropdown (simplified UX, predictable behavior)
- Auto-rename collision handling vs. prompting user
- Inline upload in existing modals vs. separate upload-only modal

**Implementation:**

**Files Created:**
- `src/core/ui/media-upload-modal.ts` (302 lines) — Standalone upload modal
- `src/core/ui/entity-picker-modal.ts` (608 lines) — Entity selection with filtering

**Files Modified:**
- `src/ui/preferences-tab.ts` — Drag-and-drop reordering
- `src/core/ui/media-manager-modal.ts` — 6-tile layout
- `src/core/ui/media-picker-modal.ts` — Inline upload button
- `main.ts` — Context menu upload support
- `styles/preferences.css` — Folder reordering styles
- `styles/media-modals.css` — Upload and entity picker styles

**User Benefits:**
- No context switching to add files to vault
- Streamlined workflow for attaching documents to research
- Consistent upload experience across all entry points
- Visual media folder management in settings
- Powerful entity selection with filters for media-first workflows

**Technical Details:**

Uses Obsidian Vault API:
```typescript
await this.app.vault.createBinary(path, arrayBuffer)
```

Auto-rename collision handling:
- `photo.jpg` → `photo 1.jpg` → `photo 2.jpg` (incremental)
- Prevents overwrite accidents
- Allows quick bulk uploads without manual renaming

**Planning Documentation:**
- See [archived planning document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archived/media-upload-enhancement.md) for detailed specifications

---

### Timeline Export Consolidation (v0.18.2)

Consolidated all timeline export functionality from the Events tab Export card into the unified Reports wizard, creating a single comprehensive experience with all 8 export formats.

**Problem Solved:**

Timeline exports existed in two separate locations with different capabilities:

| Location | Formats | Strengths | Weaknesses |
|----------|---------|-----------|------------|
| Events tab → Export card | Canvas, Excalidraw, 4 markdown formats | Visual exports, styling options | No PDF/ODT, no date range filter |
| Reports → Timeline | PDF, ODT, markdown table | Document exports, advanced filters | No Canvas/Excalidraw, limited markdown |

Users had to navigate between two different UIs to access the full range of export options.

**Solution:**

All timeline export capabilities are now unified in **Statistics & Reports → Reports → Timeline**:

| Category | Formats |
|----------|---------|
| Visual exports | Canvas, Excalidraw (requires Excalidraw plugin) |
| Documents | PDF, ODT |
| Markdown | Vertical timeline (callouts), Table, Simple list, Dataview query |

**Consolidated Features:**

| Feature | Source |
|---------|--------|
| All filters | Person, event type, group, place, universe, date range |
| Canvas/Excalidraw styling | Layout (horizontal/vertical/Gantt), color scheme, ordering edges |
| Excalidraw drawing options | Style, font, stroke width |
| PDF/ODT options | Page size, date format, cover page |
| Grouping options | None, by year, by decade, by person, by place |
| Data quality insights | Timeline gaps, unsourced events, orphan events |

**Implementation Phases:**

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Add Canvas, Excalidraw, and additional markdown formats to Reports Timeline | ✓ Complete |
| 2 | Redesign wizard steps for format selection and format-specific options | ✓ Complete |
| 3 | Add deprecation notice to Events tab Export card | ✓ Complete |

**Deprecation Notice:**

The Events tab Export card now displays a notice directing users to the Reports wizard. The Export card will be removed in a future release.

**Documentation:**
- See [Timeline Export Consolidation Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/timeline-export-consolidation.md) for detailed specifications

---

### Create Person Enhancements (v0.18.1)

A comprehensive set of enhancements to streamline family tree creation, addressing the tedious workflow of jumping in and out of modals when building a family tree from scratch.

**Problem Solved:**

Building a family tree required constant context-switching:
1. Create Person A → Save → Close
2. Create Person B → Save → Close
3. Edit Person A to link B as spouse → Save → Close
4. Create Child C → Save → Close
5. Edit Child C to set parents → Save → Close
6. ...repeat endlessly

**Solution:**

Four phases of enhancements enable continuous family creation without leaving the modal flow.

**Phase 1: Inline Person Creation**

| Feature | Description |
|---------|-------------|
| "Create new" in pickers | When selecting father/mother/spouse, offer "Create new person" option |
| QuickCreatePersonModal | Simplified sub-modal for creating new family members inline |
| Smart defaults | Pre-fill sex for parents (father→male, mother→female) |
| Folder context menu | "Create person" option in People folder context menu |

**Phase 2: Children Section in Edit Modal**

| Feature | Description |
|---------|-------------|
| Children picker | Multi-select person picker to view/manage children in Edit mode |
| Inline creation | Create new children directly using Phase 1 infrastructure |
| Auto-detection | Infer `father`/`mother` field from parent's `sex` property |
| Bidirectional sync | Adding/removing children updates both parent and child notes |

**Phase 3: "Add Another" Flow**

After creating a person, the modal shows quick actions to continue building the family:
- **Add spouse** → Opens spouse picker with inline creation
- **Add child** → Opens child picker with inline creation
- **Add parent** → Shows father/mother choice, then opens parent picker
- **Done** → Closes modal

**Phase 4: Family Creation Wizard**

A dedicated 5-step wizard for creating an entire nuclear family at once:

| Step | Description |
|------|-------------|
| Start | Choose mode: start from scratch or build around existing person |
| Step 1 | Create central person (name, nickname, sex, birth date) |
| Step 2 | Add spouse(s) — supports multiple, create new or pick existing |
| Step 3 | Add children — create new or pick existing |
| Step 4 | Add parents (father and mother) |
| Step 5 | Review — visual family tree preview, stats summary, confirm |

**Wizard Features:**

| Feature | Description |
|---------|-------------|
| Visual tree preview | Mini family tree showing all members with initials |
| Batch creation | All notes created with relationships automatically linked |
| Merge logic | Links existing persons without overwriting their existing relationships |
| State persistence | Resume interrupted wizard sessions via `ModalStatePersistence` |
| Multiple entry points | Command palette, Dashboard tile, People tab, folder context menu |

**Bundled Enhancement: Nickname Property**

Added `nickname` as a first-class frontmatter property:
- Added to `PersonData` interface
- Supported in Create/Edit Person and QuickCreate modals
- Import support for GEDCOM (`NICK`), Gramps (`nick`), and GEDCOM X

**Entry Points:**

| Entry Point | Action |
|-------------|--------|
| Command: `Charted Roots: Create family wizard` | Opens Family Creation Wizard |
| Dashboard → Create Family tile | Opens Family Creation Wizard |
| People tab → Actions → Create family | Opens Family Creation Wizard |
| People folder context menu → Create family | Opens wizard with folder pre-selected |
| People folder context menu → Create person | Opens CreatePersonModal with folder pre-selected |

**Documentation:**
- [Create Person Enhancements Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/create-person-enhancements.md) - Detailed specifications
- [Data Entry](Data-Entry) - User documentation

---

### Event Person Property Consolidation (v0.18.0)

Consolidates the dual `person`/`persons` event properties into a single unified `persons` array format for all event types.

**Problem Solved:**

Event notes previously used two different properties to track participants:
- `person` (string): Single participant for individual events (birth, death, occupation)
- `persons` (array): Multiple participants for family events (marriage, divorce, residence)

This duality created complexity in base templates (required formula workarounds), importers (must decide which property to use), and user understanding.

**Solution:**

All events now use the `persons` array property. Single-participant events simply have an array with one element:

```yaml
# Single-participant event
persons:
  - "[[John Smith]]"

# Multi-participant event
persons:
  - "[[John Smith]]"
  - "[[Jane Doe]]"
```

**Features:**

| Feature | Description |
|---------|-------------|
| **Unified Property** | All importers (GEDCOM, Gramps, GEDCOM X) now write `persons` array |
| **Migration Wizard Step** | Cleanup Wizard Step 11 detects and migrates legacy `person` properties |
| **Backward Compatibility** | Base templates and services continue reading both properties |
| **Migration Notice** | Users upgrading from v0.17.x see a one-time notice with migration guidance |

**Migration:**

1. Open the Cleanup Wizard (Control Center → Data Quality, or command palette)
2. Navigate to Step 11: "Migrate Event Person Properties"
3. Review detected notes and click "Apply All"

The legacy `person` property continues to be read indefinitely for backward compatibility.

**Documentation:**
- [Events And Timelines](Events-And-Timelines) - Updated property documentation
- [Frontmatter Reference](Frontmatter-Reference#person-and-place-links) - Updated event properties

---

## v0.17.x

### Research Level Property (v0.17.5)

A `research_level` property for Person notes to track research progress toward GPS-compliant documentation. Based on Yvette Hoitink's "Six Levels of Ancestral Profiles" system.

**Problem Solved:**

Genealogists need a way to track how thoroughly each ancestor has been researched, supporting the GPS principle of "reasonably exhaustive research." Previously, there was no standardized way to indicate which ancestors need more work.

**Research Levels:**

| Level | Name | Description |
|-------|------|-------------|
| 0 | Unidentified | Ancestor exists but no name established (placeholder) |
| 1 | Name Only | Name known, appears in others' records, no vital dates |
| 2 | Vital Statistics | Birth, marriage, death dates researched |
| 3 | Life Events | Occupations, residences, children, spouses documented |
| 4 | Extended Records | Property, military, religion, legal records researched |
| 5 | GPS Complete | Exhaustive research complete, written proof summary exists |
| 6 | Biography | Full narrative biography with historical context |

**Features:**

| Feature | Description |
|---------|-------------|
| **Edit Modal Selector** | Dropdown in Create/Edit Person modal to set research level |
| **Research Gaps Report** | Filter/sort by level, show statistics by level range |
| **Bases Views** | "By research level" grouped view, "Needs research" filtered view |
| **GEDCOM Export** | `_RESEARCH_LEVEL` custom tag |
| **Gramps Export** | `<attribute type="Research Level">` element |
| **Round-trip Import** | Both formats import back into `research_level` property |

**UI Integration:**

The research level selector appears in the Edit Person modal when `trackFactSourcing` is enabled in settings. The "(Not assessed)" option allows distinguishing between "not yet evaluated" and "Level 0 (Unidentified)".

**Files Modified:**

| File | Changes |
|------|---------|
| `src/types/frontmatter.ts` | ResearchLevel type, RESEARCH_LEVELS metadata |
| `src/core/person-note-writer.ts` | researchLevel in PersonData |
| `src/ui/create-person-modal.ts` | Dropdown selector |
| `src/core/family-graph.ts` | researchLevel in PersonNode |
| `src/reports/services/gaps-report-generator.ts` | Filtering, sorting, statistics |
| `src/gedcom/gedcom-exporter.ts` | `_RESEARCH_LEVEL` export |
| `src/gramps/gramps-exporter.ts` | "Research Level" attribute export |
| `src/gedcom/gedcom-parser-v2.ts` | Import parsing |
| `src/gramps/gramps-parser.ts` | Import parsing |
| `src/constants/base-template.ts` | Bases views |

See [Research Level Property Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/research-level-property.md) for implementation details.

---

### Excalidraw Export Enhancements (v0.17.1)

Enhanced Excalidraw export with ExcalidrawAutomate API integration, style customization, and improved output quality.

**Problem Solved:**

The previous Excalidraw export was functional but limited:
- **Manual text sizing:** Text dimensions estimated with character width multiplier, often inaccurate
- **Static arrows:** Connections didn't adapt when elements were moved in Excalidraw
- **No wiki links:** Couldn't click nodes to navigate to person notes
- **No style control:** Fixed visual style with no customization options
- **Temp file pollution:** Intermediate canvas files left behind after export

**Features:**

| Feature | Description |
|---------|-------------|
| **ExcalidrawAutomate API** | Uses API when available for smart connectors and accurate text measurement |
| **Smart connectors** | Arrows adapt when elements are moved (API mode) |
| **Wiki links** | Nodes link to person notes via Excalidraw's link property |
| **Spouse styling** | Spouse relationships rendered with dashed lines |
| **Drawing style options** | Architect (clean), Artist (sketchy), Cartoonist (rough) |
| **Font family options** | Virgil (handwritten), Cascadia (code), system fonts |
| **Fill/stroke styles** | Solid, hachure, cross-hatch fills; solid, dashed, dotted strokes |
| **Node content levels** | Name only, name + dates, or name + dates + places |
| **Dedicated wizard step** | Excalidraw style options in separate step for better UX |
| **JSON fallback** | Works without Excalidraw plugin using direct JSON generation |

**Wizard Flow (Excalidraw):**

| Step | Content |
|------|---------|
| 1 | Select root person |
| 2 | Choose tree type |
| 3 | Select output format (Excalidraw) |
| 4 | Canvas options (scope, colors) |
| 5 | Preview tree |
| 6 | Excalidraw style options |
| 7 | Output settings and generate |

**Files Modified:**

| File | Changes |
|------|---------|
| `src/excalidraw/excalidraw-exporter.ts` | API integration, style options, smart connectors |
| `src/trees/ui/unified-tree-wizard-modal.ts` | Excalidraw style step, form data fields |
| `src/excalidraw/excalidraw-automate.d.ts` | Type definitions for EA API |

**Bug Fixes:**

- Text centering in Excalidraw boxes
- Duplicate visible boxes (removed `box` parameter from `addText`)
- Wiki link brackets appearing in labels (stripped, set via element link property)
- Temporary canvas file cleanup after export
- Generate button reactivity on canvas name input
- Duplicate navigation footer in wizard

---

### Post-Import Cleanup Wizard (v0.17.0)

A 10-step guided wizard that consolidates post-import data quality operations into a single, sequential workflow. After importing a GEDCOM file (especially one with data quality issues), users previously had to navigate multiple Control Center tabs and run operations in the correct order. The wizard provides a unified experience with progress tracking.

**Problem Solved:**

- **Scattered tools:** Cleanup operations were spread across Data Quality, Places, and other tabs
- **Unknown order:** No guidance on which operations to run first
- **Manual coordination:** Users had to remember to run each step and track what's done

**Wizard Steps:**

| Step | Operation | Type |
|------|-----------|------|
| 1 | Quality Report | Review-only |
| 2 | Fix Bidirectional Relationships | Batch-fix |
| 3 | Normalize Date Formats | Batch-fix |
| 4 | Normalize Gender Values | Batch-fix |
| 5 | Clear Orphan References | Batch-fix |
| 6 | Migrate Source Properties | Batch-fix |
| 7 | Standardize Place Variants | Interactive |
| 8 | Bulk Geocode | Interactive |
| 9 | Enrich Place Hierarchy | Interactive |
| 10 | Flatten Nested Properties | Batch-fix |

**Features:**

| Feature | Description |
|---------|-------------|
| **Overview Grid** | 5×2 tile grid showing all 10 steps with status badges |
| **Progress Tracking** | Horizontal progress bar with step completion state |
| **Preview Mode** | Each batch step shows proposed changes before applying |
| **Session Persistence** | Wizard state saved to resume interrupted cleanup |
| **Smart Defaults** | Auto-skip steps with zero detected issues |
| **Summary Report** | Export completion stats to markdown |

**Entry Points:**
- Import Wizard results: "Run Cleanup Wizard" button
- Control Center > Data Quality > Quick Start card
- Command palette: "Charted Roots: Post-Import Cleanup Wizard"

**Technical Notes:**
- `CleanupWizardModal` orchestrates the 10-step flow
- Reuses existing services: `DataQualityService`, `GeocodingService`, `PlaceGraphService`, `SourceMigrationService`
- State persisted in `plugin.settings.cleanupWizardState`

**Files Added:**

| File | Purpose |
|------|---------|
| `src/ui/modals/cleanup-wizard-modal.ts` | Main wizard modal with step navigation |
| `styles/cleanup-wizard.css` | Wizard-specific styling |

See [Post-Import Cleanup Wizard Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/post-import-cleanup-wizard.md) for implementation details.

---

### Source Array Migration (v0.17.0)

Migration from indexed source properties (`source`, `source_2`, `source_3`) to a YAML array format (`sources: []`). This change improves scalability, simplifies Dataview queries, and aligns with modern frontmatter practices.

**Problem Solved:**

The indexed format had limitations:
- **Fixed slots:** Only 3 source slots available per entity
- **Query complexity:** Dataview queries had to check multiple properties
- **Schema rigidity:** Adding more sources required schema changes

**Format Change:**

```yaml
# Old format (no longer supported)
source: "[[Birth Certificate]]"
source_2: "[[Census 1920]]"
source_3: "[[Family Bible]]"

# New format (unlimited sources)
sources:
  - "[[Birth Certificate]]"
  - "[[Census 1920]]"
  - "[[Family Bible]]"
  - "[[Interview Notes]]"
```

**Migration Phases:**

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Support both formats (read array, fall back to indexed) | ✅ Complete |
| Phase 2 | Add migration tooling via Cleanup Wizard Step 6 | ✅ Complete |
| Phase 3 | Deprecate indexed format (console warnings) | ✅ Complete |
| Phase 4 | Remove indexed format support | ✅ Complete |

**Features:**

| Feature | Description |
|---------|-------------|
| **Wizard Integration** | Step 6 of Cleanup Wizard handles migration |
| **Preview Mode** | Shows proposed changes before applying |
| **Batch Processing** | Migrates all notes in one operation |
| **Merge Support** | Combines indexed sources with existing array |
| **Legacy Warning** | Console warning for notes still using old format |

**Technical Notes:**
- `SourceMigrationService` handles detection and migration
- GEDCOM and Gramps importers now write array format by default
- Statistics service only reads `sources` array (indexed parsing removed)

**Files Added:**

| File | Purpose |
|------|---------|
| `src/sources/services/source-migration-service.ts` | Detection and migration logic |

**Breaking Change:** The indexed format (`source`, `source_2`, etc.) is no longer parsed. Users with legacy notes should run the Cleanup Wizard Step 6 to migrate.

See [Source Array Migration Planning](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/source-array-migration.md) for implementation details.

---

### Migration Notice (v0.17.0)

A one-time workspace tab displayed when users upgrade to v0.17.0, informing them about the source array format change and providing a direct path to the Cleanup Wizard.

**Features:**
- Opens as main workspace tab on first load after upgrade
- Shows before/after code examples of format change
- "Open Cleanup Wizard" button for immediate migration
- "Dismiss" button marks notice as seen
- Version tracking via `lastSeenVersion` setting

**Files Added:**

| File | Purpose |
|------|---------|
| `src/ui/views/migration-notice-view.ts` | Workspace view for upgrade notice |
| `styles/migration-notice.css` | Notice styling |

---

## v0.16.x

### Import/Export Hub (v0.16.0)

Modal-based hub with step-by-step wizards for importing and exporting genealogical data, replacing the previous Import/Export tab in Control Center.

**Problem Solved:**

The previous import/export experience was fragmented:
- **Scattered UI:** Import/export lived in a Control Center tab, but progress displayed in separate modals
- **Disconnected numbering:** Post-import reference numbering was a separate modal, not integrated into the import workflow
- **Limited guidance:** No step-by-step flow for format selection, options, and preview

**Features:**

| Feature | Description |
|---------|-------------|
| **Hub Modal** | Two-card layout (Import, Export) matching Reports Hub and Media Manager patterns |
| **Import Wizard** | 7-step guided import with format selection, file picker, options, preview, progress, numbering, and completion |
| **Export Wizard** | 6-step guided export with format selection, folder picker, privacy controls, preview, progress, and completion |
| **Integrated Numbering** | Reference numbering (Ahnentafel, d'Aboville, Henry, Generation) built into import flow |
| **Privacy Controls** | Living person exclusion with redact vs. exclude options in export wizard |

**Import Wizard Steps:**

| Step | Purpose |
|------|---------|
| 1. Format | Select GEDCOM 5.5.1, GEDCOM X (JSON), Gramps XML/.gpkg, or CSV |
| 2. File | Drag-and-drop file picker |
| 3. Options | Entity types, target folder, conflict handling, dynamic blocks toggle |
| 4. Preview | Entity counts, duplicate warnings |
| 5. Import | Progress with real-time log |
| 6. Numbering | Optional reference numbering with root person picker |
| 7. Complete | Summary with actions |

**Export Wizard Steps:**

| Step | Purpose |
|------|---------|
| 1. Format | Select GEDCOM 5.5.1, GEDCOM X (JSON), Gramps XML, or CSV |
| 2. Folders | Preference folders or custom folder pickers |
| 3. Options | Privacy controls, inclusions (sources, places, notes, media) |
| 4. Preview | Entity counts, privacy summary |
| 5. Export | Progress with real-time log |
| 6. Complete | Download/save options |

**Technical Notes:**

- Reuses existing import/export logic (GEDCOM parsing, export generation)
- Integrates `ReferenceNumberingService` for numbering step
- `.gpkg` format includes embedded media, extracted and linked during import

**Files Added:**

| File | Purpose |
|------|---------|
| `src/ui/import-export-hub-modal.ts` | Hub modal with import/export cards |
| `src/ui/import-wizard-modal.ts` | 7-step import wizard |
| `src/ui/export-wizard-modal.ts` | 6-step export wizard |

See [Import/Export Hub Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/import-export-hub-plan.md) for implementation details.

---

## v0.15.x

### Visual Tree PDF Quality Improvements (v0.15.3)

Improved rendering quality for Visual Tree PDFs generated from the unified tree wizard, achieving parity with Family Chart PDF exports.

**Problem Solved:**
- Visual Tree PDFs generated via pdfmake appeared slightly blurry compared to Family Chart PDFs using jsPDF
- The pdfmake image embedding was resampling the tree image, causing quality loss
- No dynamic page sizing option for optimal digital viewing

**Changes:**

| Change | Description |
|--------|-------------|
| **4× scale rendering** | Increased canvas scale from 2× to 4× in `visual-tree-svg-renderer.ts` |
| **Aspect ratio preservation** | Removed explicit height constraint from pdfmake image content |
| **Quality parity** | Visual Tree PDFs now match Family Chart PDF sharpness |

**Technical Details:**

The quality difference stemmed from how images are embedded in PDFs:

- **jsPDF (Family Chart):** Sizes the PDF page to match the content, avoiding any resampling
- **pdfmake (Visual Tree):** Used fixed page sizes with explicit width/height, causing resampling

The fix increases the source canvas resolution (4× instead of 2×) to compensate for any resampling, and removes the explicit height constraint to preserve aspect ratio.

**Files Changed:**

| File | Change |
|------|--------|
| `src/trees/services/visual-tree-svg-renderer.ts` | Changed scale from 2 to 4 |
| `src/reports/services/pdf-report-renderer.ts` | Removed height from image content |

See [Visual Tree PDF Enhancements Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/visual-tree-pdf-enhancements.md) for technical analysis.

---

### Report Wizard Enhancements (v0.15.3)

Multi-step wizard interface for the Report Generator with improved UX, step-by-step navigation, and streamlined report creation.

**Problem Solved:**
- The Report Generator modal had grown complex with 13 report types, 5 categories, and extensive PDF options
- All options were displayed at once, creating cognitive overload
- No way to save common report configurations for reuse

**Features:**

| Feature | Description |
|---------|-------------|
| **5-step wizard** | Report Type → Subject → Content Options → Output & Styling → Generate |
| **Step navigation** | Previous/Next buttons with step indicator |
| **Category filtering** | Filter reports by category (Genealogical, Research, Timeline, Geographic, Summary) |
| **Dynamic options** | Content options step adapts to selected report type |
| **Format selection** | Choose output format (Vault, Markdown, PDF, ODT) in Output step |

**Wizard Steps:**

| Step | Purpose |
|------|---------|
| 1. Report Type | Category filter + report selection from 13 types |
| 2. Subject | Person/place/universe/collection picker based on report type |
| 3. Content Options | Report-specific toggles (generations, spouses, sources, etc.) |
| 4. Output & Styling | Format selection + PDF/ODT customization options |
| 5. Generate | Review settings and generate report |

**Files Changed:**

| File | Change |
|------|--------|
| `src/reports/ui/report-wizard-modal.ts` | New multi-step wizard modal |
| `src/reports/services/pdf-report-renderer.ts` | ODT generation support |
| `styles/report-wizard.css` | Wizard styling with compact cards |

See [Report Wizard Enhancements Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/report-wizard-enhancements.md) for implementation details.

---

### Report Generator ODT Export (v0.15.3)

ODT (Open Document Text) export capability for all report types, enabling document merging workflows with LibreOffice Writer and Microsoft Word.

**Problem Solved:**
- Reports could only be saved as Markdown or PDF
- No editable document format for further customization
- Users couldn't easily merge text reports with visual tree charts

**Features:**

| Feature | Description |
|---------|-------------|
| **All 13 report types** | ODT export available for all report types |
| **Cover page support** | Optional title page with logo, title, subtitle, and notes |
| **Rich content** | Tables, lists, bold/italic text preserved |
| **Image embedding** | Visual tree charts embedded as images (for tree reports) |
| **Title in document** | Optional title at top of document (when not using cover page) |
| **No external dependencies** | Uses JSZip (bundled with Obsidian) + manual XML generation |

**ODT Generation:**

ODT files are ZIP archives containing XML. The generator creates:

| File | Purpose |
|------|---------|
| `content.xml` | Document content with text, tables, and images |
| `styles.xml` | Paragraph, table, and character styles |
| `meta.xml` | Document metadata (title, author, date) |
| `manifest.xml` | File manifest for the archive |
| `Pictures/` | Embedded images (tree charts, logos) |

**Unified Tree Wizard Integration:**

The unified tree wizard also supports ODT output:
- ODT option in Step 3 (Output Format)
- Title field in Step 5 for document title
- Filename based on title field value
- Tree image embedded in ODT document

**Files Changed:**

| File | Change |
|------|--------|
| `src/reports/services/odt-generator.ts` | New ODT generation service |
| `src/reports/services/pdf-report-renderer.ts` | ODT generation for reports |
| `src/trees/ui/unified-tree-wizard-modal.ts` | ODT support in tree wizard |

See [Report Generator ODT Export Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/report-generator-odt-export.md) for implementation details.

---

### Calendarium Integration Phase 2 (v0.15.2)

Display events with Calendarium `fc-*` date fields on Charted Roots timelines, with calendar filtering support.

**Problem Solved:**
- Events using Calendarium's `fc-date` format weren't visible on Charted Roots timelines
- No way to filter timeline views by calendar system when mixing real and fictional dates
- Timeline badges in People tab didn't show event counts

**Features:**

| Feature | Description |
|---------|-------------|
| **fc-date Parsing** | Read `fc-date` or `fc-start` as event start date |
| **fc-end Support** | Read `fc-end` as event end date for date ranges (lifespans, reigns) |
| **Month Conversion** | Handle 0-indexed months from Calendarium (converts to 1-indexed) |
| **Calendar Filter** | Dropdown to filter timelines by `fc-calendar` value |
| **Timeline Badges** | Calendar icon with event count in People tab table rows |
| **Timeline Modal** | Click badge to open full timeline in modal dialog |

**Settings:**

| Setting | Description |
|---------|-------------|
| `syncCalendariumEvents` | Enable/disable fc-* field parsing (default: false) |
| Integration mode | Must be set to "Read-only" in Preferences → Integrations |

**How It Works:**

1. Enable Calendarium integration in Preferences → Integrations
2. Enable "Show Calendarium dates on timelines" toggle
3. Event notes with `fc-date` fields will now appear on timelines
4. The `fc-calendar` value is used as the date system for filtering

**Example Event Note:**

```yaml
---
cr_type: event
cr_id: "20251223120000"
title: "Birth of Aragorn"
event_type: birth
person: "[[Aragorn]]"
fc-date:
  year: 2931
  month: 2
  day: 1
fc-calendar: Middle-earth
---
```

**Related Documentation:**
- [Calendarium Integration](Fictional-Date-Systems#calendarium-integration)
- [Events & Timelines](Events-And-Timelines)

---

### Family Chart Export Wizard (v0.15.1)

Multi-step export wizard for Family Chart view with format presets, customization options, and progress tracking.

**Problem Solved:**
- The export dropdown menu was cluttered and easy to trigger accidentally
- No preview of export settings before generating
- Large exports could freeze the UI without progress indication
- No way to remember last-used settings

**Features:**

| Feature | Description |
|---------|-------------|
| **5 Quick Presets** | Quick Share (PNG 1x), High Quality (PNG 2x), Print Ready (PDF), Editable (SVG), Document (ODT) |
| **Format Options** | PNG, SVG, PDF, ODT with format-specific settings |
| **Scope Selection** | Full tree or limited depth (1-5 generations) |
| **PDF Options** | Page size (fit/A4/letter/legal/tabloid), layout (single/tiled), orientation (auto/portrait/landscape) |
| **Cover Page** | Optional title page for PDF/ODT with custom title and subtitle |
| **Avatar Toggle** | Include or exclude person thumbnails |
| **Progress Modal** | Real-time progress with phase indicators and cancel button |
| **Settings Memory** | Last-used format, scale, and options remembered |

**Export Presets:**

| Preset | Format | Settings | Use Case |
|--------|--------|----------|----------|
| **Quick Share** | PNG | 1x scale, no avatars | Social media, messaging |
| **High Quality** | PNG | 2x scale, with avatars | Printing, archiving |
| **Print Ready** | PDF | Cover page, with avatars | Physical prints, sharing |
| **Editable** | SVG | Vector format, no avatars | Editing in Inkscape/Illustrator |
| **Document** | ODT | Cover page, with avatars | Merging with reports in Word/LibreOffice |

**ODT Export:**

The ODT format creates an OpenDocument Text file that can be opened in LibreOffice Writer or Microsoft Word. This enables:
- Merging family charts with narrative text
- Adding custom formatting and styling
- Creating comprehensive family history documents

Technical implementation uses JSZip for creating the ODT ZIP archive with manual XML generation (no external library dependencies).

**Files Changed:**

| File | Change |
|------|--------|
| `src/ui/views/family-chart-export-wizard.ts` | New export wizard modal |
| `src/ui/views/family-chart-export-progress-modal.ts` | Progress tracking modal |
| `src/ui/views/odt-generator.ts` | ODT generation using JSZip |
| `src/ui/views/family-chart-view.ts` | Export button wiring, exportWithOptions method |
| `src/settings.ts` | LastFamilyChartExportSettings interface |
| `styles/family-chart-export.css` | Wizard and progress modal styling |

See [Family Chart View](Family-Chart-View#exporting) for usage documentation.

---

### Family Chart Styling Panel (v0.15.1)

In-view color theming for Family Chart with preset themes and custom color picker.

**Problem Solved:**
- Chart color options were only accessible via the Style Settings plugin
- Users without Style Settings couldn't customize colors
- No quick way to switch between color themes

**Features:**

| Feature | Description |
|---------|-------------|
| **Palette Button** | Toolbar button opens theme menu |
| **5 Theme Presets** | Classic, Pastel, Earth Tones, High Contrast, Monochrome |
| **Customize Modal** | Color pickers for all 7 chart colors |
| **Live Preview** | Colors update in real-time while adjusting |
| **Settings Persistence** | Custom colors saved across sessions |
| **Reset Option** | Reverts to default colors |

**Theme Presets:**

| Theme | Female | Male | Unknown | Description |
|-------|--------|------|---------|-------------|
| **Classic** | Pink `#c48a92` | Blue `#789fac` | Gray `#d3d3d3` | Default colors |
| **Pastel** | Soft pink `#f4c2c2` | Soft blue `#a7c7e7` | Lavender `#e6e6fa` | Lighter, softer tones |
| **Earth Tones** | Terracotta `#cc7a6f` | Sage `#8fbc8f` | Sand `#d2b48c` | Natural, warm palette |
| **High Contrast** | Magenta `#ff00ff` | Cyan `#00ffff` | Yellow `#ffff00` | Accessibility-focused |
| **Monochrome** | Dark gray `#666666` | Medium gray `#888888` | Light gray `#aaaaaa` | No color coding |

**Customizable Colors:**

| Color | Description |
|-------|-------------|
| **Female card** | Background color for female person cards |
| **Male card** | Background color for male person cards |
| **Unknown card** | Background color for unknown gender cards |
| **Background (light)** | Chart background in light theme |
| **Background (dark)** | Chart background in dark theme |
| **Text (light)** | Card text color in light theme |
| **Text (dark)** | Card text color in dark theme |

**Interaction with Style Settings:**

If you have the Style Settings plugin installed:
- In-view settings take precedence (applied via inline styles)
- "Reset to defaults" clears in-view settings, revealing Style Settings values
- Both can coexist—use in-view for quick switching, Style Settings for vault-wide defaults

**Files Changed:**

| File | Change |
|------|--------|
| `src/ui/views/family-chart-view.ts` | Palette button, theme presets, FamilyChartStyleModal |
| `src/settings.ts` | FamilyChartColors interface |
| `styles/family-chart-view.css` | Style modal CSS |

See [Family Chart View](Family-Chart-View#styling) for usage documentation.

---

### Universal Media Linking (v0.15.0)

Extend the `media` property to all entity types (Person, Event, Place, Organization) with Gramps Package (`.gpkg`) import support and dynamic inline galleries.

**Problem Solved:**
- The `media` property was only supported on Source notes
- Gramps Package (`.gpkg`) import ignored bundled media files
- No way to display media galleries inline within person notes
- Writers and worldbuilders couldn't attach character portraits, location art, or scene illustrations

**Features:**

| Feature | Description |
|---------|-------------|
| **Universal media property** | `media` supported on Person, Event, Place, Source, Organization notes |
| **Gramps Package import** | `.gpkg` files import with media extraction to vault |
| **Media linking during import** | Media files linked to all entity types based on Gramps `objref` references |
| **Dynamic media gallery** | `canvas-roots-media` code block renders inline gallery |
| **Editable mode** | Drag-to-reorder with `editable: true` option |
| **Freeze to callout** | Convert gallery to styled `[!info|cr-frozen-gallery]` callout |
| **Style Settings** | Gallery appearance customizable via Style Settings plugin |
| **Find Unlinked Media** | Tool to discover orphaned media files in vault |
| **Media folder filtering** | Settings to exclude folders from media searches |

**Dynamic Media Gallery:**

~~~markdown
```canvas-roots-media
columns: 3
size: medium
editable: false
title: Media
```
~~~

**Configuration options:**

| Option | Values | Description |
|--------|--------|-------------|
| `columns` | 2-6, `auto` | Number of columns in grid (default: 3) |
| `size` | `small`, `medium`, `large` | Thumbnail size (default: medium) |
| `editable` | `true`, `false` | Enable drag-to-reorder (default: false) |
| `title` | string | Custom header text (default: "Media") |

**Editable Mode:**

When `editable: true` is set:
- Items show a drag handle on hover
- Drag items to reorder their position
- First item becomes the thumbnail (shown on Family Chart nodes)
- Frontmatter is updated automatically when you drop
- Gallery has a dashed border to indicate edit mode

**Frozen Gallery:**

Click the freeze button (❄️) to convert to a styled callout:

~~~markdown
> [!info|cr-frozen-gallery]
> ![[portrait.jpg]]
> ![[wedding-photo.jpg]]
> ![[birth-certificate.pdf]]
~~~

The frozen gallery renders images in a flex layout with click-and-hold zoom.

**Entity Support:**

| Entity Type | Use Cases |
|-------------|-----------|
| **Person** | Photos, portraits, scanned documents, character concept art |
| **Event** | Ceremony photos, certificates, scene illustrations |
| **Place** | Location photos, historical maps, fantasy maps, floor plans |
| **Organization** | Logos, group photos, faction banners, heraldry |
| **Source** | Original records, digitized documents |

**Gramps Package Import:**

When importing a `.gpkg` file:
1. Media files are extracted to your configured media folder
2. `objref` elements in the Gramps XML are resolved to vault paths
3. `media` wikilinks are added to Person, Event, Place, and Source frontmatter
4. First media item serves as thumbnail (matching Gramps convention)

**Implementation Phases:**

| Phase | Scope |
|-------|-------|
| Phase 1 | Add `media` property to Person, Event, Place, Organization schemas |
| Phase 2 | Find Unlinked Media tool, Media Manager integration |
| Phase 3 | Media folder filtering and settings |
| Phase 4 | Gramps Package (`.gpkg`) import with media extraction |
| Phase 5 | Dynamic `canvas-roots-media` block with freeze support |

**Files Changed:**

| File | Change |
|------|--------|
| `src/gramps/types.ts` | Added `mediaRefs` to GrampsPerson, GrampsEvent, GrampsPlace interfaces |
| `src/gramps/gramps-parser.ts` | Parse `objref` elements, populate `mediaRefs` arrays |
| `src/gramps/gramps-importer.ts` | Resolve media refs to wikilinks during note creation |
| `src/dynamic-content/media-processor.ts` | New processor for `canvas-roots-media` blocks |
| `src/dynamic-content/dynamic-content-service.ts` | Media gallery rendering and freeze logic |
| `styles/dynamic-content.css` | Gallery grid, editable mode, frozen callout styles |

See [Dynamic Note Content: Media Block](Dynamic-Note-Content#media-block) for usage documentation and [Universal Media Linking Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/universal-media-linking.md) for implementation details.

---

## v0.14.x

### Visual Tree Charts (v0.14.0)

Unified tree generation wizard supporting both Canvas and PDF output, with visual tree reports in the Statistics Dashboard.

**Problem Solved:**
- Two separate wizards for Canvas and PDF tree generation created confusion
- No visual tree diagrams in the Statistics and Reports system
- Canvas Trees tab lacked modern dashboard design
- No custom icons for tree chart types

**Features:**

| Feature | Description |
|---------|-------------|
| **Unified Tree Wizard** | Single wizard for both Canvas and PDF output with dynamic step flow |
| **Visual Tree Reports** | 4 chart types in Statistics Dashboard: Pedigree, Descendant, Hourglass, Fan Chart |
| **Custom SVG Icons** | Themeable icons for each chart type (`cr-pedigree-tree`, `cr-descendant-tree`, `cr-hourglass-tree`, `cr-fan-chart`) |
| **Canvas Trees Tab** | Redesigned dashboard with recent trees, statistics, and quick actions |
| **PDF Options** | Page size, orientation, node content, color schemes, large tree handling |

**Wizard Step Flow:**

```
Step 1: Person Selection
    ↓
Step 2: Tree Type Selection
    ↓
Step 3: Output Format (Canvas vs PDF)
    ├── Canvas → Step 4a: Canvas Options → Step 5a: Preview → Step 6a: Output
    └── PDF → Step 4b: PDF Options → Step 5b: Output
```

**Chart Types:**

| Chart Type | Description |
|------------|-------------|
| **Pedigree Tree** | Ancestors branching upward from root person |
| **Descendant Tree** | Descendants branching downward from root person |
| **Hourglass Tree** | Both ancestors and descendants from root person |
| **Fan Chart** | Semicircular pedigree (PDF only, placeholder for future) |

**PDF Generation Paths:**

| Path | Library | Quality | Use Case |
|------|---------|---------|----------|
| **Unified Wizard** | pdfmake | Good | Quick PDF generation from wizard |
| **Family Chart View** | jsPDF | Excellent | High-quality printable output |

The Family Chart view produces superior visual output (orthogonal connectors, profile icons, better spouse positioning). Both paths are maintained for different use cases.

**Files Changed:**

| File | Change |
|------|--------|
| `src/trees/ui/unified-tree-wizard-modal.ts` | New unified wizard modal |
| `src/trees/services/visual-tree-service.ts` | Tree building and layout service |
| `src/reports/services/pdf-report-renderer.ts` | Extended with visual tree PDF generation |
| `src/reports/types/report-types.ts` | Added 4 visual tree report types |
| `src/ui/lucide-icons.ts` | Added 4 custom SVG icons |
| `src/ui/control-center.ts` | Canvas Trees tab dashboard redesign |
| `styles/tree-output.css` | New card and wizard styles |

**Removed Files:**
- `src/trees/ui/tree-generation-wizard.ts` (1500+ lines, replaced by unified wizard)
- `src/trees/ui/visual-tree-wizard-modal.ts` (570+ lines, replaced by unified wizard)

See [Canvas Trees](Visual-Trees) for user documentation and [Tree Visualization Overhaul Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/tree-visualization-overhaul.md) for implementation details.

---

## v0.13.x

### Control Center Dashboard (v0.13.6)

Transform the Control Center's Status tab into a Dashboard with quick-action tiles, providing mobile-friendly access to common operations.

**Problem Solved:**
- Status tab displayed entity counts and vault health but no actions
- Common operations required navigating to other tabs or Command Palette
- Mobile users faced extra friction due to limited screen space
- No quick access to frequently-used operations

**Features:**

| Feature | Description |
|---------|-------------|
| **Dashboard tab** | Replaces Status tab as the Control Center's home screen |
| **9 quick-action tiles** | One-tap access to Person, Event, Source, Place, Report, Statistics, Import, Tree Output, and Map |
| **Vault Health section** | Collapsible section with entity counts and completeness metrics |
| **Recent Files** | Last 5 accessed files with type badges and click-to-open |
| **Context menu** | Right-click Recent items for type-specific actions |
| **First-run notice** | Dismissible welcome message for new users |
| **Responsive grid** | 3-column on desktop, 2-column on mobile |

**Quick Action Tiles:**

| Tile | Icon | Action |
|------|------|--------|
| **Person** | `user` | Opens Create Person modal |
| **Event** | `calendar` | Opens Create Event modal |
| **Source** | `file-text` | Opens Create Source modal |
| **Place** | `map-pin` | Opens Create Place modal |
| **Report** | `file-chart-pie` | Opens Report Generator modal |
| **Statistics** | `bar-chart-3` | Opens Statistics Dashboard view |
| **Import** | `upload` | Opens Import/Export tab |
| **Tree Output** | `git-branch` | Opens Tree Output tab |
| **Map** | `map` | Opens Map View |

**Recent Files Context Menu:**

| Entity Type | Actions |
|-------------|---------|
| All types | Open note |
| Place | Open in Map View (zooms to coordinates if available) |
| Person | Open in Family Chart |

**Vault Health Section:**

| Metric | Description |
|--------|-------------|
| **Entity counts** | People, Events, Sources, Places, Organizations, Canvases |
| **Completeness** | Percentage of people with key data (birth, death, parents) |
| **Issues** | Count of data quality warnings with "View details" link |

**Technical Details:**
- New `DashboardTab` component in `src/ui/dashboard-tab.ts`
- New `RecentFilesService` in `src/core/recent-files-service.ts`
- Recent files stored in `plugin.settings.dashboardRecentFiles`
- Dashboard styles in `styles/dashboard.css`
- Vault Health section collapse state persisted in settings

See [Control Center Dashboard Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/control-center-dashboard.md) for implementation details.

---

### Extended Report Types (v0.13.5)

Six new report types expanding the report generator beyond traditional genealogical reports, plus enhanced PDF customization options.

**Problem Solved:**
- Reports were limited to 7 genealogical report types
- No way to document sources for a person in aggregate
- No timeline report showing all events chronologically
- No place-focused summaries
- No reports for worldbuilders (universe/collection overviews)
- Limited PDF customization options

**New Report Types:**

| Report | Category | Description |
|--------|----------|-------------|
| **Source Summary** | Research | All sources cited for a person, grouped by fact type, with quality ratings and gap analysis |
| **Timeline Report** | Timeline | Chronological list of events with filtering by date range, event type, and participants |
| **Place Summary** | Geographic | All events and people associated with a location (born, died, resided, married) |
| **Media Inventory** | Research | Media files with linked entities, orphaned file detection, coverage gap analysis |
| **Universe Overview** | Summary | Entity statistics for a fictional world with date ranges and entity type breakdown |
| **Collection Overview** | Summary | Summary of a user collection or family component with member list and statistics |

**Report Category Selector:**

The Report Generator modal now includes a category selector that groups all 13 report types:

| Category | Reports |
|----------|---------|
| Genealogical | Ahnentafel, Pedigree Chart, Descendant Chart, Register Report, Family Group Sheet, Individual Summary |
| Research | Source Summary, Gaps Report, Media Inventory |
| Timeline | Timeline Report |
| Geographic | Place Summary |
| Summary | Universe Overview, Collection Overview |

**Source Summary Report:**

| Feature | Description |
|---------|-------------|
| **Root person picker** | Select subject for the report |
| **Grouping options** | By fact type, source type, or quality |
| **Quality indicators** | Primary, secondary, derivative classification |
| **Citation details** | Full citations with repository info |
| **Gap analysis** | Highlights unsourced facts needing documentation |

**Timeline Report:**

| Feature | Description |
|---------|-------------|
| **Date range filter** | Optional start and end dates |
| **Event type filter** | Filter to specific event types |
| **Participant filter** | Events involving specific people |
| **Grouping** | None, by year, by decade, by person, by place |
| **Source inclusion** | Toggle source references |

**Place Summary Report:**

| Feature | Description |
|---------|-------------|
| **Root place picker** | Select subject location |
| **Child places** | Option to include events at child locations |
| **Date range filter** | Filter events by date |
| **Place hierarchy** | Shows containment chain |
| **Coordinate display** | Includes lat/long when available |

**Media Inventory Report:**

| Feature | Description |
|---------|-------------|
| **Scope selection** | All media, sources only, or by folder |
| **Orphan detection** | Lists media files not linked to any entity |
| **Coverage gaps** | Shows entities that could have media but don't |
| **File type breakdown** | Images, PDFs, audio counts |
| **Grouping** | By entity type, folder, or file type |

**Universe Overview Report:**

| Feature | Description |
|---------|-------------|
| **Universe picker** | Select subject universe |
| **Entity breakdown** | Counts per type (people, places, events, organizations, sources) |
| **Date range** | Earliest to latest dates using fictional dates if applicable |
| **Geographic summary** | Places with coordinates and coverage percentage |
| **Date systems** | Lists calendar systems used in the universe |
| **Recent activity** | Optionally lists recently modified entities |

**Collection Overview Report:**

| Feature | Description |
|---------|-------------|
| **Collection picker** | User collections or auto-detected family components |
| **Member list** | People with key dates (birth, death) |
| **Generation analysis** | Ancestor/descendant counts by generation |
| **Geographic distribution** | Places and counts |
| **Surname distribution** | For family components |
| **Sort options** | By birth date, name, or death date |

**Enhanced PDF Options:**

| Option | Description |
|--------|-------------|
| **Custom title** | Override default report title |
| **Custom title scope** | Apply to cover only, headers only, or both |
| **Custom subtitle** | Additional text below title on cover page |
| **Cover notes** | Extended notes section on cover page |
| **Date format** | MDY (12/20/2025), DMY (20/12/2025), or YMD (2025-12-20) |

**Access Points:**
- Statistics Dashboard → Reports section → Generate
- Command palette: "Charted Roots: Generate Report"

**Technical Details:**
- Each report type has a dedicated generator class in `src/reports/services/`
- All reports use shared PDF infrastructure via `PdfReportRenderer`
- Report options stored in modal state and passed to generators
- Same output options: Save to vault, Download as MD, Download as PDF

See [Extended Report Types Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/extended-report-types.md) for implementation details.

---

### PDF Report Export (v0.13.4)

Export genealogical reports as professionally styled PDF documents, generated entirely locally with no internet connection required.

**Problem Solved:**
- Reports could only be saved as markdown files or copied to clipboard
- No way to share polished, print-ready reports with family members
- Professional archiving required manual formatting in external tools

**Features:**

| Feature | Description |
|---------|-------------|
| **All 7 report types** | Ahnentafel, Pedigree Chart, Descendant Chart, Register Report, Family Group Sheet, Individual Summary, Gaps Report |
| **Page size options** | A4 or Letter |
| **Optional cover page** | Title page with report name, subject, generation date, and Charted Roots branding |
| **Logo/crest support** | Add custom image to cover page (automatically resized for optimal file size) |
| **100% local generation** | PDFs created entirely on device using bundled pdfmake library |
| **Privacy-first design** | No data sent to any server; no internet connection required |

**PDF Options:**

| Option | Description |
|--------|-------------|
| **Page size** | A4 or Letter |
| **Include cover page** | Add a title page with report metadata |
| **Logo or crest** | Optional image for cover page (PNG, JPEG, GIF, WebP) |

**Cover Page Contents:**
- Report title (e.g., "Ahnentafel Report")
- Subject name (e.g., "Ancestors of John Smith")
- Decorative separator line
- Generation date
- "Charted Roots for Obsidian" branding
- Optional logo/crest centered at top

**Privacy & Security:**

Genealogical data is highly personal. PDF generation is designed with privacy as a core principle:

- **100% local generation** — PDFs are created entirely on your device using the pdfmake library bundled with the plugin
- **No internet connection required** — No data is sent to any server or cloud service
- **No external dependencies** — Fonts are embedded; no network requests are made during generation
- **Downloads to your system** — Files save to your operating system's Downloads folder, outside your vault

**Access Points:**
- Statistics Dashboard → Reports section → Generate → Select "Download as PDF"
- Command palette: "Charted Roots: Open Statistics Dashboard"

**Technical Details:**
- Uses pdfmake library (~400KB) for document generation, lazy-loaded on first use
- Renders directly from structured report data (not markdown parsing)
- Logo images automatically resized to max 200×200px to reduce file size
- Separate from jsPDF dependency used for Family Chart canvas export

See [Statistics & Reports](Statistics-And-Reports#pdf-export) for usage documentation.

---

### Universe Management (v0.13.0)

First-class universe entity type for managing fictional worlds, with a dedicated Control Center tab, guided setup wizard, and comprehensive statistics integration.

**Problem Solved:**
- Worldbuilders had no central place to manage fictional universes (Middle-earth, Westeros, etc.)
- The `universe` field was a plain string with no validation, leading to typos creating duplicate "universes"
- No way to see which entities belonged to which universe
- No guided setup for creating a new world with calendar, map, and validation rules

**Universe Entity:**

Universe notes (`cr_type: universe`) serve as a canonical registry for fictional worlds:

```yaml
cr_type: universe
cr_id: middle-earth
name: Middle-earth
description: A fantasy world created by J.R.R. Tolkien
author: J.R.R. Tolkien
genre: fantasy
status: active
default_calendar: shire-reckoning
default_map: middle-earth-map
```

**Features:**

| Feature | Description |
|---------|-------------|
| **Universe entity type** | First-class note type with full CRUD support |
| **UniverseService** | Entity aggregation, orphan detection, statistics |
| **Universes tab** | Dedicated Control Center tab (conditional visibility) |
| **Create Universe wizard** | Multi-step guided setup with optional calendar, map, and schema |
| **Statistics integration** | Universes section with entity counts and drill-down |
| **Guide tab documentation** | Universe notes section in Essential Properties card |
| **Context menu action** | "Add essential universe properties" for universe notes |
| **Universes base template** | 12 pre-configured views for browsing universes |

**Universes Tab:**

The Universes tab appears in Control Center when:
- Any universe notes exist in the vault, OR
- Any orphan universe strings exist (entities with `universe` field but no matching note)

This keeps the UI clean for genealogists who never use fictional worlds.

| Card | Description |
|------|-------------|
| **Actions** | Create universe (wizard), Create universes base |
| **Your universes** | List of universe notes with entity counts |
| **Orphan universe strings** | Entities referencing non-existent universes |

**Create Universe Wizard:**

| Step | Description | Skippable |
|------|-------------|-----------|
| 1 | Universe details (name, description, author, genre, status) | No |
| 2 | Custom calendar? Creates linked date system | Yes |
| 3 | Custom map? Creates linked map configuration | Yes |
| 4 | Validation schema? Creates scoped schema | Yes |
| 5 | Summary with links to all created entities | No |

**Statistics Integration:**

The Statistics dashboard includes a Universes section showing:
- Universe count and list
- Per-universe entity breakdown (people, events, places, sources, organizations)
- Drill-down to view entities filtered by universe
- "View full statistics →" link to dashboard with universe filter

**Universes Base Template:**

12 pre-configured views for browsing universes:
- All Universes
- By Status (active, draft, archived)
- By Genre, By Author
- With/Without Calendars
- With/Without Maps
- Recently Created

**Context Menu:**

Right-click on a universe note to access:
- Add essential universe properties
- Open in Universes tab
- Create related entities (person, event, place, etc.) pre-populated with universe

**Backward Compatibility:**

- String-only `universe` values continue to function
- Orphan detection shows entities referencing non-existent universe notes
- New entities can link to universe notes via wikilink or use string values

See [Universe Management Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/universe-management.md) for implementation details.

---

## v0.12.x

### Configurable Normalization (v0.12.12)

User-configurable sex value normalization modes that allow worldbuilders to protect custom sex values from GEDCOM-standard normalization.

**Problem Solved:**
- Worldbuilders using custom sex values (e.g., "hermaphrodite", "neuter" for alien species) had those values normalized to GEDCOM M/F when running "Normalize sex values"
- No way to skip normalization for notes covered by schemas with custom sex enum definitions
- All-or-nothing approach: either normalize everything or nothing

**Features:**

| Feature | Description |
|---------|-------------|
| **Three normalization modes** | Standard (GEDCOM M/F), Schema-aware (skip protected notes), Disabled (never normalize) |
| **Schema-aware detection** | Checks if person has applicable schema with custom `sex` enum values |
| **Preview enhancement** | Shows which notes will be skipped due to schema override |
| **Preferences setting** | New dropdown in Preferences → Data Quality |

**Normalization Modes:**

| Mode | Behavior |
|------|----------|
| **Standard** | Normalize all sex values to GEDCOM M/F (default, existing behavior) |
| **Schema-aware** | Skip notes covered by schemas that define custom sex enum values |
| **Disabled** | Never normalize sex values (preview shows what would change) |

**Schema-Aware Example:**

A worldbuilder creates a schema for their sci-fi universe:

```yaml
---
cr_type: schema
cr_id: schema-alien-species
applies_to_type: universe
applies_to_value: "Sci-Fi Universe"
---

```json schema
{
  "properties": {
    "sex": {
      "type": "enum",
      "values": ["male", "female", "neuter", "hermaphrodite"]
    }
  }
}
```

With **Schema-aware** mode enabled, person notes in the "Sci-Fi Universe" with sex values like "hermaphrodite" will be skipped during normalization, while notes in other universes (or without a universe) will still be normalized to GEDCOM M/F.

**Integration:**
- Builds on [Value Aliases](Release-History#value-aliases-v094) for synonym mapping
- Builds on [Schema Validation](Release-History#schema-validation-v063) for custom enum detection
- Uses existing Data Quality tab batch operation infrastructure

See [Sex/Gender Identity Expansion Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/sex-gender-expansion.md) for Phase 4 implementation details.

---

### Step & Adoptive Parent Support (v0.12.10)

Comprehensive support for non-biological parent relationships, improving GEDCOM import fidelity and enabling accurate representation of blended families.

**Problem Solved:**
- GEDCOM files with step-parent or adoptive relationships (via `PEDI` tags) were imported as primary parent claims, triggering false conflicts
- No way to distinguish biological parents from step/adoptive parents in the data model
- Canvas trees could not visualize non-biological parent relationships

**Features:**

| Feature | Description |
|---------|-------------|
| **GEDCOM PEDI parsing** | Parse `PEDI` tags (`birth`, `step`, `adop`, `foster`) from GEDCOM 5.5.1 files |
| **Gramps mrel/frel parsing** | Parse `mrel`/`frel` attributes (`Birth`, `Stepchild`, `Adopted`) from Gramps XML |
| **GEDCOM X lineage types** | Parse lineage type facts (`StepParent`, `AdoptiveParent`, etc.) from GEDCOM X JSON |
| **Round-trip export** | Export step/adoptive parents with PEDI tags (GEDCOM), mrel/frel (Gramps), lineage facts (GEDCOM X) |
| **Dedicated frontmatter fields** | `stepfather_id`, `stepmother_id`, `adoptive_father_id`, `adoptive_mother_id` |
| **Conflict detection** | Step/adoptive parents excluded from biological parent conflicts |
| **Canvas visualization** | Step-parents shown with dashed lines, adoptive parents with dotted lines |
| **Tree generation toggles** | "Include step-parents" and "Include adoptive parents" options |
| **Create/Edit modal** | New section for manual entry of step/adoptive parents |
| **Statistics breakdown** | Parent type breakdown in Data Completeness, blended family metrics |

**New Frontmatter Fields:**

```yaml
# Biological parents (existing)
father_id: abc-123-def-456
mother_id: ghi-789-jkl-012

# Step-parents (can have multiple)
stepfather_id:
  - mno-345-pqr-678
  - abc-111-def-222
stepmother_id: stu-901-vwx-234

# Adoptive parents
adoptive_father_id: yza-567-bcd-890
adoptive_mother_id: efg-123-hij-456
```

**GEDCOM 5.5.1 Pedigree Types:**

| PEDI Value | Meaning | Charted Roots Field |
|------------|---------|-------------------|
| `birth` | Biological | `father_id`, `mother_id` |
| `adop` | Adopted | `adoptive_father_id`, `adoptive_mother_id` |
| `step` | Step-child | `stepfather_id`, `stepmother_id` |
| `foster` | Foster child | (stored but not specially handled) |
| (absent) | Assumed biological | `father_id`, `mother_id` |

**Gramps XML Pedigree Types:**

| mrel/frel Value | Meaning | Charted Roots Field |
|-----------------|---------|-------------------|
| `Birth` | Biological | `father_id`, `mother_id` |
| `Adopted` | Adopted | `adoptive_father_id`, `adoptive_mother_id` |
| `Stepchild` | Step-child | `stepfather_id`, `stepmother_id` |
| `Foster` | Foster child | (stored but not specially handled) |
| (absent) | Assumed biological | `father_id`, `mother_id` |

**GEDCOM X Lineage Types:**

| Lineage Type | Meaning | Charted Roots Field |
|--------------|---------|-------------------|
| `BiologicalParent` | Biological | `father_id`, `mother_id` |
| `AdoptiveParent` | Adopted | `adoptive_father_id`, `adoptive_mother_id` |
| `StepParent` | Step-parent | `stepfather_id`, `stepmother_id` |
| `FosterParent` | Foster parent | (stored but not specially handled) |
| `GuardianParent` | Guardian | (stored but not specially handled) |
| `SociologicalParent` | Sociological | (stored but not specially handled) |
| (absent) | Assumed biological | `father_id`, `mother_id` |

**New Relationship Types:**

| Type | Line Style | Color |
|------|------------|-------|
| `step_parent` / `step_child` | Dashed | Teal (#14b8a6) |
| `adoptive_parent` / `adopted_child` | Dotted | Cyan (#06b6d4) |

**Statistics Enhancements:**

| Metric | Description |
|--------|-------------|
| **Parent type breakdown** | Counts of biological, step, and adoptive parents in Completeness section |
| **Biologically orphaned** | People with no biological parents but have step/adoptive |
| **Blended family count** | People with multiple parent types |

**Tree Behavior:**
- Ancestor trees: Step/adoptive parents included as leaf nodes (no ancestry recursion)
- Full trees: Step/adoptive parents included by default, follow their connections
- Both respect the include toggles in tree generation UI

See [Step & Adoptive Parent Support Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/step-adoptive-parent-support.md) for implementation details.

---

### Statistics & Reports (v0.12.9)

Comprehensive statistics dashboard and report generation system for analyzing vault data and generating formatted genealogical reports.

**Problem Solved:**
- No centralized view of vault statistics (entity counts, completeness, quality)
- No way to generate standard genealogical reports (Family Group Sheets, Pedigree Charts)
- Data quality issues were scattered and hard to track

**Statistics Dashboard:**

| Section | Description |
|---------|-------------|
| **Entity overview** | Counts for people, events, sources, places, organizations, canvases |
| **Data completeness** | Progress bars for birth dates, death dates, sources, parents, spouses |
| **Data quality** | Clickable issues with drill-down to affected records |
| **Gender distribution** | Visual breakdown with bar chart |
| **Top lists** | Surnames, locations, occupations, sources with drill-down |
| **Extended statistics** | Longevity, family size, marriage patterns, migration, source coverage, timeline density |

**Data Quality Drill-Down:**

| Issue Type | Severity | Description |
|------------|----------|-------------|
| **Date inconsistencies** | Error | Birth after death, age over 120 |
| **Missing birth dates** | Warning | People without birth date |
| **Missing death dates** | Warning | With birth but no death (excluding living) |
| **Orphaned people** | Warning | No relationships at all |
| **Incomplete parents** | Warning | Only one parent linked |
| **Unsourced events** | Info | Events without sources |
| **Places without coordinates** | Info | Missing lat/long |

Click any issue to expand and see affected records. Click a person chip to open their note. Right-click for context menu. Ctrl+hover for preview.

**Report Types:**

| Report | Description |
|--------|-------------|
| **Family Group Sheet** | Single family unit with parents, marriage, children |
| **Individual Summary** | Complete record of one person |
| **Ahnentafel Report** | Numbered ancestor list |
| **Gaps Report** | Analysis of missing data |
| **Register Report** | NGSQ-style descendant numbering |
| **Pedigree Chart** | ASCII ancestor tree |
| **Descendant Chart** | ASCII descendant tree |

**Report Options:**
- Select root person
- Configure generation depth (2-10)
- Toggle details, spouses, sources
- Output as new note or clipboard

**Extended Statistics:**

| Analysis | Description |
|----------|-------------|
| **Longevity** | Average lifespan by decade and location |
| **Family size** | Children per family with distribution |
| **Marriage patterns** | Age at marriage by sex, remarriage rates |
| **Migration** | Birth-to-death location changes, top routes |
| **Source coverage** | Coverage by generation depth |
| **Timeline density** | Events per decade with gap detection |

**Access Points:**
- Control Center → Statistics tab → "Open Statistics Dashboard"
- Command palette: "Charted Roots: Open Statistics Dashboard"
- Reports section in Statistics Dashboard

See [Statistics & Reports](Statistics-And-Reports) for detailed usage documentation.

---

### Dynamic Note Content (v0.12.8)

Live computed content blocks within person notes using custom code block processors. Content updates dynamically from vault data with option to freeze to static markdown.

**Problem Solved:**
- Person notes contained only frontmatter and user-written content
- Computed data (timelines, relationships) required navigating to Control Center
- No way to see a person's full story in one place

**Features:**

| Feature | Description |
|---------|-------------|
| **Timeline block** | `canvas-roots-timeline` renders chronological events for a person |
| **Relationships block** | `canvas-roots-relationships` shows family members with wikilinks |
| **Freeze to markdown** | Convert live blocks to static markdown via toolbar button |
| **Create Person toggle** | Option to include blocks when creating new person notes |
| **Import wizard toggle** | Option to include blocks during GEDCOM/Gramps/CSV import |
| **Insert commands** | Context menu and command palette actions for existing notes |
| **Bulk insert** | Add blocks to all person notes in a folder |

**Code Block Types:**

~~~markdown
```canvas-roots-timeline
sort: chronological
```

```canvas-roots-relationships
type: immediate
```
~~~

**Timeline Block:**
- Shows birth, death, and all linked events chronologically
- Displays year, event title, and place with wikilinks
- Configuration options: `sort` (chronological/reverse), `include`/`exclude` event types, `limit`

**Relationships Block:**
- Shows parents, spouse(s), children, and optionally siblings
- Each person rendered as clickable wikilink with birth-death dates
- Configuration options: `type` (immediate/extended/all), `include`/`exclude` relationship types

**Freeze to Markdown:**
- Toolbar button converts live block to static markdown
- Preserves wikilinks and formatting
- Useful for export compatibility or manual editing

**Inserting Blocks:**

| Method | Description |
|--------|-------------|
| **Create Person modal** | "Include dynamic blocks" toggle |
| **Import wizards** | "Include dynamic blocks" toggle in GEDCOM/Gramps/CSV import |
| **Context menu** | Right-click person note → "Insert dynamic blocks" |
| **Command palette** | "Charted Roots: Insert dynamic blocks" |
| **Bulk insert** | Right-click folder → "Insert dynamic blocks in folder" |

**Technical Details:**
- Uses Obsidian's `registerMarkdownCodeBlockProcessor` API
- `DynamicContentService` provides shared utilities for config parsing and data resolution
- `TimelineProcessor` and `RelationshipsProcessor` handle block rendering
- Content computed on note open; manual refresh via code block edit

**Bug Fixes (v0.12.8):**
- Fixed Family Chart zoom buttons showing "NaN%" and causing chart to vanish (incorrect scale multiplier)
- Fixed "Open family chart" showing wrong person instead of current note
- Fixed Family Chart opening in sidebar instead of main workspace

---

### Gramps Source Import (v0.12.6)

Import source and citation records from Gramps XML files, creating Charted Roots source notes with full metadata and linking citations to person/event notes.

**Problem Solved:**
- Gramps XML import supported people, places, and events, but source/citation records were not imported
- Users migrating from Gramps had to manually recreate source documentation
- Repository metadata and media references were lost during migration

**Features:**

| Feature | Description |
|---------|-------------|
| **Source note creation** | One note per Gramps source record with full metadata |
| **Repository support** | Parse `<repositories>` and `<reporef>` elements for archive/library data |
| **Media references** | Store Gramps media handles in `gramps_media_refs` for manual linking |
| **Source property aliases** | Full property alias support for all 15 source properties |
| **Gramps ID preservation** | Store `gramps_handle` and `gramps_id` for re-import scenarios |
| **Progress indicator** | Real-time progress modal during import |
| **UI toggles** | Obsidian-style toggles for import options |

**Field Mapping:**

| Gramps Field | Charted Roots Property |
|--------------|----------------------|
| `<stitle>` | `title` |
| `<sauthor>` | `author` |
| `<spubinfo>` | `repository` (fallback) |
| Repository `<rname>` | `repository` |
| Repository `<type>` | `repository_type` |
| `<reporef medium>` | `source_medium` |
| `<noteref>` text | Note body content |
| `<objref>` handles | `gramps_media_refs` |

**Confidence Scale Mapping:**

| Gramps (0-4) | Meaning | Charted Roots |
|--------------|---------|--------------|
| 0 | Very Low | low |
| 1 | Low | low |
| 2 | Normal | medium |
| 3 | High | high |
| 4 | Very High | high |

**Source Property Aliases:**

All 15 source properties support aliasing via Preferences → Property aliases:

| Property | Description |
|----------|-------------|
| `cr_id` | Unique identifier |
| `cr_type` | Note type (source) |
| `title` | Source title |
| `author` | Author/creator |
| `source_type` | Type (census, vital_record, etc.) |
| `repository` | Archive or website |
| `repository_type` | Library, Archive, etc. |
| `source_medium` | Book, Electronic, etc. |
| `confidence` | High/medium/low |
| `url` | Online source URL |
| `access_date` | Date accessed |
| `citation_detail` | Page, volume, etc. |
| `gramps_handle` | Original Gramps handle |
| `gramps_id` | Original Gramps ID |
| `gramps_media_refs` | Media handles for manual linking |

**Import Options UI:**

The Gramps import modal includes Obsidian-style toggles for:
- Create source notes (enabled by default)
- Create place notes
- Create event notes

Each toggle shows the count of records found in the file.

**Technical Details:**
- Parses `<sources>`, `<citations>`, `<notes>`, and `<repositories>` sections
- Resolves note references to include text in source note body
- Resolves repository references to get name, type, and medium
- Builds citation-to-source mapping for linking to person/event notes
- Source type inferred from title keywords (census, vital_record, church_record, etc.)

See [Gramps Source Import Planning Document](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/gramps-source-import.md) for full implementation details.

---

### Bulk Source-Image Linking (v0.12.5)

Two wizard tools for managing source images: importing new images as source notes, and linking existing images to existing source notes.

**Problem Solved:**
- Genealogists often have hundreds of source images (census records, vital records, photos) with inconsistent naming conventions
- Manual creation of source notes from images is tedious
- Existing source notes without media require manual attachment of related images
- No way to bulk-process images with intelligent metadata extraction

**Features:**

**Source Image Import Wizard** (`Sources tab → Import`):

| Feature | Description |
|---------|-------------|
| **Folder selection** | Browse vault folders containing source images |
| **Filename parsing** | Extract surnames, years, record types, locations from filenames |
| **Confidence indicators** | Visual dots (green/yellow/orange/gray) showing parse quality |
| **Editable metadata** | Review and correct parsed data before import |
| **Source note creation** | Creates source notes with media wikilinks in frontmatter |

**Source Media Linker Wizard** (`Sources tab → Link`):

| Feature | Description |
|---------|-------------|
| **Target sources** | Only shows source notes without existing media |
| **Smart suggestions** | Scores potential matches based on filename analysis |
| **Auto-selection** | Top suggestion pre-selected with confidence indicator |
| **"+N more" badge** | Shows when alternative suggestions exist |
| **Row highlighting** | Yellow background for rows needing manual selection |
| **Summary breakdown** | Shows auto-matched vs. manual selection counts |

**Filename Parser:**

Extracts metadata from common genealogy image naming patterns:

| Pattern | Extracted Data |
|---------|----------------|
| `smith_census_1900.jpg` | Surname: Smith, Type: census, Year: 1900 |
| `Marriage Cert Boston 1875.jpeg` | Type: marriage, Location: Boston, Year: 1875 |
| `henderson_obituary_1945.jpg` | Surname: Henderson, Type: obituary, Year: 1945 |

**Confidence Scoring:**

| Score Range | Confidence | Visual |
|-------------|------------|--------|
| ≥50 | High | 🟢 Green dot |
| 30-49 | Medium | 🟡 Yellow dot |
| 1-29 | Low | 🟠 Orange dot |
| 0 | None | ⚪ Gray dot |

**Technical Details:**
- `ImageFilenameParser` service handles filename analysis
- Source matching uses scoring algorithm based on surname, year, type, and location overlap
- Media stored as wikilinks in source frontmatter (`media`, `media_2`, etc.)
- Builds on existing `SourceService` for note creation and updates

---

### Calendarium Integration Phase 1 (v0.12.0)

Integration with the [Calendarium](https://github.com/javalent/calendarium) plugin to import calendar definitions for fictional dates.

**Problem Solved:**
- Worldbuilders using Calendarium for fantasy calendar management had to manually recreate calendar definitions in Charted Roots
- No way to leverage existing Calendarium calendar structure (eras, year directions)

**Features:**

| Feature | Description |
|---------|-------------|
| **Calendar import** | Automatically import Calendarium calendars as Charted Roots date systems |
| **Era preservation** | Era names, abbreviations, and year directions are preserved |
| **Zero configuration** | Calendars appear automatically when integration is enabled |
| **Invisible when not needed** | Integrations card only appears if Calendarium is installed |

**How It Works:**

1. Install [Calendarium](https://github.com/javalent/calendarium) plugin
2. Open Control Center → Preferences → Integrations
3. Set Integration mode to "Read-only (import calendars)"
4. Calendarium calendars appear in Date Systems card and Create Event modal

**Technical Details:**

- Uses `window.Calendarium` global API
- Waits for Calendarium settings to load before importing
- Converts Calendarium eras to Charted Roots `FictionalEra` format
- Handles starting eras (epoch 0) and regular eras with dates
- Extracts era abbreviations from Calendarium format strings

**Settings:**

| Setting | Options | Default |
|---------|---------|---------|
| `calendariumIntegration` | `off`, `read` | `off` |

**Future Phases:**
- Phase 2: Display Calendarium events on timelines
- Phase 3: Bidirectional sync between plugins
- Phase 4: Cross-calendar date translation

See [Fictional Date Systems - Calendarium Integration](Fictional-Date-Systems#calendarium-integration) and [Roadmap - Calendarium Integration](Roadmap#calendarium-integration) for details.

---

## v0.11.x

### Export v2 (v0.11.0)

Complete overhaul of export functionality with full entity support and round-trip fidelity with GEDCOM Import v2.

See [export-v2.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/export-v2.md) for implementation plan.

**Problem Solved:**
- Previous exports only included people (person notes)
- Events, sources, places, and custom relationships were lost on export
- No round-trip fidelity with GEDCOM Import v2 (import created entity notes, but export discarded them)
- Limited export options and no real-time statistics

**Full Entity Export:**

All four export formats (GEDCOM 5.5.1, GEDCOM X, Gramps XML, CSV) now support:

| Entity Type | Export Support |
|-------------|----------------|
| **People** | Full person records with all properties |
| **Events** | All 22 event types with dates, places, participants, sources, confidence levels |
| **Sources** | Source notes with citations, repositories, quality classification |
| **Places** | Place hierarchy, coordinates, categories, types preserved |
| **Custom Relationships** | Godparent, guardian, mentor, etc. (GEDCOM: ASSO records; other formats: dedicated fields) |

**Enhanced Export UI:**

- **Export statistics preview**: Real-time count of entities before export
  - Shows people count, event count, source count, place count
  - Respects collection filters and branch filters
  - Updates dynamically as options change
- **Entity inclusion toggles**: Granular control over what to include
  - Toggle people, events, sources, places individually
  - Statistics update to reflect selections
- **Format-specific options**:
  - GEDCOM: Version selector (5.5.1 vs 7.0), collection codes toggle, custom relationships toggle
  - All formats: Entity toggles, output location, privacy settings
- **Output location options**:
  - Download file (traditional behavior)
  - Save to vault (specify folder path)
- **Export progress modal**: Full-screen modal showing:
  - Current phase (loading, filtering, privacy, events, sources, places, generating, writing)
  - Progress bar with percentage
  - Running statistics (entities processed so far)
  - Phase-specific icons and labels
- **Last export info**: Display previous export timestamp, entity counts, destination

**Property & Value Alias Integration:**

All exporters now respect user-configured property and value aliases:

- **Property aliases**: Export using canonical property names (e.g., `born` → `BIRT` in GEDCOM)
- **Value aliases**: Map custom event types, sex values, place categories to canonical values before export
- **Gender identity field**: New `gender_identity` property exported appropriately for each format
  - GEDCOM: Custom `_GEND` tag
  - GEDCOM X: `gender` field
  - Gramps XML: Custom attribute
  - CSV: Dedicated column

**Custom Relationships Export:**

GEDCOM 5.5.1 now exports custom relationships as ASSO records:

```gedcom
1 ASSO @I2@
2 RELA godparent
2 NOTE Relationship from 1920-05-15 to 1935-08-20
2 NOTE Became godparent at baptism
```

- Includes relationship type name as RELA descriptor
- Date ranges in NOTE subrecords
- Custom notes preserved
- Only defined relationships exported (not inferred bidirectional ones)
- Toggle option in export settings (enabled by default)

**Round-Trip Fidelity:**

Exports now preserve all data from GEDCOM Import v2:

| Import Creates | Export Preserves |
|----------------|------------------|
| Event notes | All event types, dates, places, participants, sources |
| Source notes | Citations, repositories, confidence levels, media links |
| Place notes | Hierarchy, coordinates, categories, historical names |
| Custom relationships | ASSO records with full metadata |

**Before Export v2:**
```
Import GEDCOM → 500 people, 350 events, 200 sources, 150 places
Export GEDCOM → 500 people only (850 entities lost)
```

**After Export v2:**
```
Import GEDCOM → 500 people, 350 events, 200 sources, 150 places
Export GEDCOM → 500 people, 350 events, 200 sources, 150 places (full fidelity)
```

**Architecture:**

- **Shared ExportOptionsBuilder**: Consolidated UI component used across all export formats
- **Service injection pattern**: Exporters conditionally load EventService, SourceService, PlaceGraphService, RelationshipService
- **Progress callback system**: Unified progress reporting for all export phases
- **ExportStatisticsService**: Calculates real-time entity counts based on current filter settings

---

## v0.10.x

### Sex/Gender Identity Fields (v0.10.20)

Separate `gender_identity` field for inclusive handling of sex and gender, with full export support across all formats.

See [sex-gender-expansion.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/sex-gender-expansion.md) for implementation plan (Phases 1-3).

**Problem Solved:**
- The `sex` field follows GEDCOM standards (M/F) for historical record compatibility, but doesn't capture gender identity
- Writers and worldbuilders need separate fields for biological sex vs. gender identity
- LGBTQ+ genealogists researching trans individuals need respectful data handling

**Features:**

**Gender Identity Field (Phase 1):**
- New optional `gender_identity` property on person notes
- Separate from biological `sex` field for historical record accuracy
- Displayed in People tab person details
- Included in all export formats:
  - GEDCOM: Custom `_GEND` tag
  - GEDCOM X: `gender` field
  - Gramps XML: Custom attribute
  - CSV: Dedicated column

**Schema-Based Definitions (Phase 2):**
- Schema system supports custom sex/gender values via `enum` types
- Scoped by collection or universe for worldbuilding
- Example: `sex` values of ["male", "female", "neuter", "hermaphrodite", "asexual"] for alien species

**Value Aliases (Phase 3):**
- Sex field supports 4 canonical values: male, female, nonbinary, unknown
- Built-in synonyms (M → male, F → female)
- Custom aliases configurable via Unified Property Configuration UI
- All exporters respect value aliases

**User Personas:**
- **Genealogist:** Uses `sex` field with GEDCOM M/F values; optionally `gender_identity` for living relatives or LGBTQ+ research
- **Fiction writer / Worldbuilder:** Custom sex values via Schema, separate `gender_identity` field for character development

**Respectful Trans Documentation:**
When documenting trans individuals:
- `name` field holds chosen/current name (displayed by default)
- Optional `birth_name` field for birth records if needed for research
- `gender_identity` captures current identity
- `sex` captures what appears on historical records
- Privacy options can exclude `birth_name` and `sex` from exports

---

### Unified Property Configuration (v0.10.19)

Consolidated property and value alias management in a single interface with comprehensive coverage of all canonical properties.

See [unified-property-config.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/unified-property-config.md) for implementation plan.

**Problem Solved:**
- Property aliases were managed through modal-based workflows with limited discoverability
- Users couldn't see which properties supported aliasing without trial and error
- Value aliases were separate from property aliases with inconsistent UI
- No search/filter to find specific properties across ~55 canonical properties

**Features:**

**Property Aliases:**
- **Comprehensive coverage**: All 56 canonical properties across Person (28), Event (20), and Place (8) entity types
- **Collapsible sections**: Properties grouped by entity type (all collapsed by default)
- **Lazy rendering**: Section content only renders when first expanded for performance
- **Search/filter**: Find properties by label, description, canonical name, or common aliases
- **Inline editing**: Configure aliases directly with auto-save on blur
- **Validation**: Checks for empty values, self-aliasing, conflicts with other properties/aliases

**Value Aliases:**
- **Unified interface**: Value aliases styled consistently with property aliases
- **Four value types**: Event type (13 values), Sex (4 values), Place category (6 values), Note type (8 values)
- **Alias count badges**: Section headers show how many aliases are configured per field
- **Inline editing**: Configure value mappings with validation on blur
- **Canonical value labels**: Human-readable display of canonical values

**UI Improvements:**
- Native Obsidian Setting components for consistent look and feel
- Validation on blur (not on keystroke) to avoid blocking partial input
- All sections use HTML `<details>` elements for native collapsibility
- Search box with real-time filtering across all properties

**Property Coverage:**

| Entity Type | Properties | Examples |
|-------------|------------|----------|
| Person | 28 | name, born, died, cr_id, sex, gender_identity, father, mother, spouse, children, birth_place, death_place, occupation, nickname, maiden_name |
| Event | 20 | title, event_type, date, date_precision, place, person, participants, groups, sources, confidence |
| Place | 8 | name, full_name, parent_place, latitude, longitude, place_type, place_category, historical_name |

**Value Coverage:**

| Field | Canonical Values | Examples |
|-------|------------------|----------|
| Event type | 13 | birth, death, marriage, burial, residence, occupation, education, military, immigration, baptism, confirmation, ordination, custom |
| Sex | 4 | male, female, nonbinary, unknown |
| Place category | 6 | real, historical, disputed, legendary, mythological, fictional |
| Note type | 8 | person, place, event, source, organization, map, schema, timeline |

---

### Data Enhancement Pass (v0.10.17)

Commands and UI tools to upgrade existing vaults by creating missing linked entities from existing person note data. Designed for users who imported GEDCOM before Charted Roots supported event, place, or source note types.

See [data-enhancement-pass.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/data-enhancement-pass.md) for implementation plan.

**Use Cases:**
- Imported GEDCOM before v0.10.0: No event notes were created; birth/death dates are flat properties
- Imported GEDCOM before v0.9.0: No source notes; source citations were ignored
- Have place strings instead of wikilinks: `birthPlace: "Dublin, Ireland"` instead of `birthPlace: "[[Dublin, Ireland]]"`
- Want event notes for existing data: Retroactively create event notes to use timeline features

**Generate Place Notes (v0.10.17):**
- Scans person notes for `birth_place`, `death_place` properties
- Scans event notes for `place` properties
- Detects string values (not wikilinks) that need conversion
- Creates place notes with proper hierarchy (parents created first)
- Updates references to use wikilinks
- Preview mode shows what will be created/modified
- Matches existing place notes to avoid duplicates
- Progress indicator during bulk generation with cancel support
- Paginated results table with search/sort after completion
- Edit button on each result to open Edit Place modal

**Planned Features:**
- Generate Events from Dates: Create event notes from person `birthDate`/`deathDate` properties
- Re-parse GEDCOM for Sources: Re-import GEDCOM to extract sources, matching to existing person notes

---

### Type Customization (v0.10.3)

Full type manager for each note category: events, sources, organizations, relationships, and places. Create, edit, hide, and customize types and categories with user-defined names.

**Type Managers:**

Each Control Center tab now includes a "Manage types" card:

| Tab | Types | Features |
|-----|-------|----------|
| Events | 22 built-in event types | Custom types, categories (Core, Extended, Narrative), icon/color |
| Sources | 6 built-in source types | Custom types, categories, description |
| Organizations | 11 built-in org types | Custom types, categories |
| Relationships | 17 built-in relationship types | Custom types, color, line style (solid, dashed, dotted) |
| Places | 16 built-in place types | Custom types, categories, hierarchy level (0-99) |

**Type Management Features:**
- **Create custom types**: Add new types with full customization
- **Override built-in types**: Change name, description, icon, color
- **Hide types**: Remove from dropdowns while preserving existing notes
- **Reset to defaults**: Restore customized built-in types
- **Delete custom types**: Remove user-created types entirely

**Category Management:**
- Create custom categories to group related types
- Rename built-in categories to match your terminology
- Reorder categories with sort order field
- Hide unused categories (built-in or custom)
- "Show all" button to restore hidden categories

**Place Type Specifics:**
- Hierarchy levels (0-99) determine valid parent-child relationships
- Categories (geographic, political, settlement, subdivision, structure) organize the UI
- Users can assign place types to any category regardless of hierarchy
- Quick level presets for common hierarchy positions

**Settings Storage:**
```typescript
// Per-category settings (events shown as example)
customEventTypes: EventTypeDefinition[];
eventTypeCustomizations: Record<string, Partial<EventTypeDefinition>>;
hiddenEventTypes: string[];
customEventCategories: EventCategoryDefinition[];
categoryCustomizations: Record<string, Partial<EventCategoryDefinition>>;
hiddenCategories: string[];
```

**Use Cases:**
- Rename "birth" to "nameday" for fantasy world-building
- Add "coronation" and "succession" event types for dynasty tracking
- Create "Land Records" source type for property research
- Hide unused relationship types like "apprentice" or "mentor"
- Add "Bodies of Water" category for place types

---

### Flexible Note Type Detection (v0.10.2)

Support multiple methods for identifying Charted Roots note types, avoiding conflicts with other plugins that use the `type` property.

**Problem Solved:**
- The generic `type` property conflicts with other plugins (Templater, Dataview, etc.)
- Some users prefer tags (`#person`) over frontmatter properties
- Need a namespaced property to avoid conflicts

**New Standard: `cr_type`**

New installations now use `cr_type` as the primary type property:
```yaml
cr_type: person
```

This aligns with the existing `cr_id` convention and avoids conflicts with other plugins.

**Detection Methods (checked in order):**
1. **`cr_type` property** - New default, namespaced to avoid conflicts (e.g., `cr_type: person`)
2. **`type` property** - Legacy fallback for existing vaults (e.g., `type: person`)
3. **Tags** - Additional fallback via tags (`#person`, `#place`, `#event`, `#source`, `#map`, `#organization`)
   - Supports nested tags (e.g., `#genealogy/person`)

**Settings:**
- **Primary type property**: Choose between `cr_type` (default) or `type` (legacy)
- **Enable tag-based detection**: Toggle tags as fallback detection method

**Supported Note Types:**
- `person` - Person notes with family relationships
- `place` - Place notes with geographic data
- `event` - Event notes for chronological mapping
- `source` - Source notes for evidence management
- `map` - Custom map configuration notes
- `organization` - Organization notes for hierarchies
- `schema` - Schema validation notes
- `proof_summary` - GPS proof summary notes

**Backwards Compatibility:**
- Existing users automatically keep `type` as their primary (migrated on first load)
- Both properties are always checked (primary first, then fallback)
- Person notes with `cr_id` but no explicit type are still detected as persons
- No migration of existing notes required

---

### GEDCOM Import v2 (v0.10.1)

Enhanced GEDCOM import that creates source notes, event notes, and place notes in addition to person notes.

**Import Options UI:**
- Toggle for each note type: people, events, sources, places
- Filename format selection: Original (John Smith.md), Kebab-case (john-smith.md), Snake_case (john_smith.md)
- Per-type filename formats via "Customize per note type" toggle
- Progress modal showing import phases with running statistics
- File analysis with counts before confirming import

**Source Import:**
- Parse `SOUR` records and `@S1@`-style source references
- Create source notes (`cr_type: source`) with available metadata
- Support for `TITL`, `AUTH`, `PUBL`, `REPO` fields

**Event Import:**
- Create event notes (`cr_type: event`) for all supported GEDCOM tags:
  - **Core (4):** `BIRT`, `DEAT`, `MARR`, `DIV`
  - **Life Events (6):** `BURI`, `CREM`, `ADOP`, `GRAD`, `RETI`, `CENS`
  - **Career/Residence (3):** `RESI`, `OCCU`, `EDUC`
  - **Legal/Estate (4):** `PROB`, `WILL`, `NATU`, `MILI`
  - **Migration (2):** `IMMI`, `EMIG`
  - **Religious (8):** `BAPM`, `CHR`, `CHRA`, `CONF`, `FCOM`, `ORDN`, `BARM`, `BASM`, `BLES`
  - **Family (7):** `ENGA`, `MARB`, `MARC`, `MARL`, `MARS`, `ANUL`, `DIVF`
- Preserve date precision from GEDCOM (`ABT`, `BEF`, `AFT`, `BET`)

**Person Attributes (stored as properties):**
- `DSCR` → `physicalDescription`
- `IDNO` → `identityNumber` (sensitive - redacted from exports)
- `NATI` → `nationality`
- `RELI` → `religion`
- `TITL` → `title`
- `PROP` → `property`
- `CAST` → `caste`
- `NCHI` → `childrenCount`
- `NMR` → `marriageCount`
- `SSN` → `ssn` (sensitive - redacted from exports)

**Place Import:**
- Hierarchical place structure parsing (`City, County, State, Country`)
- Create place notes (`type: place`) with parent/child relationships
- Duplicate detection: case-insensitive matching on `full_name` property
- Fallback matching: title + parent combination for same-named places
- Update existing places (add missing parent links) instead of creating duplicates

**Performance:**
- Optimized connected components analysis (O(n+m) instead of O(n×m))
- Paginated People tab (100 at a time) for large imports
- Progress callback throughout all import phases

**Integration Points:**
- Staging folder support (import to staging, review, then merge)
- Property aliases (use configured property names)
- Value aliases (map GEDCOM event types to Charted Roots types)

---

### Chronological Story Mapping (v0.10.0)

Event-based timeline visualization supporting genealogists (source-derived events), worldbuilders (canonical events), and writers/plotters (narrative timelines).

See [Events And Timelines](Events-And-Timelines) wiki page for full documentation.

**Features:**
- Event notes (`cr_type: event`) as first-class entities with 22 built-in event types
- Create Event Modal for manual event creation
- Source event extraction ("Extract events" action with smart suggestions)
- Person Timeline view (calendar badge on person list items)
- Family Timeline view (aggregate events for person + spouses + children)
- Place Timeline view (events at a location over time)
- Global Timeline in Events tab with filtering and gap analysis
- Relative ordering with `before`/`after` constraints
- Compute sort order (topological sort from DAG relationships)
- Groups/factions property for filtering by nation, faction, organization
- Timeline Canvas/Excalidraw export with multiple layouts (horizontal, vertical, Gantt)
- Color-coding by event type, category, confidence, or monochrome
- Events Base template with 20 pre-configured views
- Fictional date system integration (`date_system` field, era-based dates)
- Per-canvas style overrides preserved during regeneration

**Event Schema:**
```yaml
cr_type: event
cr_id: "20251205123456"
title: "Birth of John Smith"
event_type: birth
date: 1850-03-15
date_precision: exact
person: "[[John Smith]]"
place: "[[Dublin, Ireland]]"
sources:
  - "[[1850 Birth Certificate]]"
confidence: high
groups:
  - "Smith Family"
```

**Event Types:**
- Core (4): birth, death, marriage, divorce
- Extended (9): burial, residence, occupation, education, military, immigration, baptism, confirmation, ordination
- Narrative (8): anecdote, lore_event, plot_point, flashback, foreshadowing, backstory, climax, resolution

---

## v0.9.x

### Value Aliases (v0.9.4)

Extend Property Aliases to support custom property *values*. Allows users with existing vaults to use custom terminology (e.g., `nameday` instead of `birth` for event types) without editing existing notes.

See [value-aliases.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/value-aliases.md) for implementation plan.

**Features:**
- Map custom values to Charted Roots canonical values
- Support for three field types:
  - **Event type**: `birth`, `death`, `marriage`, `burial`, `residence`, `occupation`, `education`, `military`, `immigration`, `baptism`, `confirmation`, `ordination`, `custom`
  - **Sex**: `male`, `female`, `nonbinary`, `unknown`
  - **Place category**: `real`, `historical`, `disputed`, `legendary`, `mythological`, `fictional`
- Graceful fallback: unknown event types treated as `custom`
- Unified "Aliases" card in Preferences with property names and property values sections

---

### Property Aliases (v0.9.3)

Map custom frontmatter property names to Charted Roots fields, enabling compatibility with existing vaults and other plugins without requiring property renaming.

See [Settings & Configuration](Settings-And-Configuration) wiki page for configuration documentation.

**Features:**
- Configure aliases in Control Center → Preferences → Property Aliases
- Read resolution: canonical property first, then falls back to aliases
- Write integration: imports create notes with aliased property names
- Essential Properties UI displays aliased property names when configured
- Bases templates generated with aliased property names
- Full support for all person note properties (identity, dates, places, relationships)

**Supported Properties:**
- Identity fields: `name`, `cr_id`, `type`, `sex`, `gender`, `nickname`, `maiden_name`
- Date fields: `born`, `died`
- Location fields: `birth_place`, `death_place`
- Relationship fields: `father`, `father_id`, `mother`, `mother_id`, `spouse`, `spouse_id`, `child`, `children_id`
- Other fields: `occupation`, `universe`, `image`, `sourced_facts`, `relationships`

---

### Events Tab (v0.9.2)

Dedicated Events tab in the Control Center improves discoverability of Fictional Date Systems and provides foundation for Chronological Story Mapping features.

See [events-tab.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/events-tab.md) for implementation details.

**Features:**
- **Date systems card**: Moved from Canvas Settings with all existing functionality
- **Statistics card**: Date coverage metrics (birth/death dates), fictional date usage breakdown
- **Event notes card**: Foundation for Chronological Story Mapping

---

### Style Settings Integration (v0.9.1)

Charted Roots styling options exposed via the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin.

See [Styling & Theming](Styling-And-Theming) wiki page for full documentation.

**Family Chart View Colors:**
- Female card color (default: `rgb(196, 138, 146)`)
- Male card color (default: `rgb(120, 159, 172)`)
- Unknown gender card color (default: `rgb(211, 211, 211)`)
- Chart background (light/dark themes)
- Card text color (light/dark themes)

**Evidence Visualization Colors:**
- Primary source color (default: `#22c55e` green)
- Secondary source color (default: `#f59e0b` amber)
- Derivative source color (default: `#ef4444` red)
- Research coverage color bands (well-researched, moderate, needs research)

---

### Evidence Visualization (v0.9.0)

Visual research methodology tools aligned with the Genealogical Proof Standard (GPS).

See [evidence-visualization-plan.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/evidence-visualization-plan.md) for implementation details.

**Genealogical Standards Support:**

| Standard | Feature |
|----------|---------|
| GPS completeness | Fact coverage map showing sourced vs. unsourced claims |
| Source classification | Primary/secondary/derivative visual indicators |
| Evidence correlation | Proof clusters grouping sources supporting conclusions |
| Conflict documentation | Visual markers for contradictory evidence |
| Written conclusions | Proof summary nodes documenting reasoning |

**Fact-Level Source Coverage:**
```yaml
sourced_facts:
  birth_date:
    sources: ["[[1850 Census]]", "[[Family Bible]]"]
  birth_place:
    sources: ["[[1850 Census]]"]
  death_date:
    sources: []  # Explicitly unsourced
```

**Source Quality Classification:**

| Classification | Meaning | Examples |
|----------------|---------|----------|
| Primary | Created at/near event by participant/witness | Original vital records, census, contemporary letters |
| Secondary | Created later from memory or hearsay | Family bibles (later entries), obituaries, oral histories |
| Derivative | Copies, transcriptions, or abstracts | Database transcriptions, published abstracts |

**Features:**
- Research Gaps Report in Data Quality tab
- Person fact coverage display (which facts have sources)
- Enhanced source indicator tooltips on canvas
- Schema validation for `sourced_facts`
- Source quality visualization with color coding
- Proof summary notes and conflict documentation
- Canvas conflict markers

---

## v0.8.x

### Source Media Gallery & Document Viewer (v0.8.0)

Centralized evidence management linking source documents to person notes.

See [Evidence & Sources](Evidence-And-Sources) wiki page for full documentation.

**Features:**
- Source note type (`cr_type: source`) with frontmatter schema
- 13 built-in source types (census, vital_record, photo, correspondence, newspaper, military, immigration, etc.)
- Source counting using Obsidian's `resolvedLinks` metadata cache
- **Source indicators on generated trees**: Small badges (e.g., "📎 3") on person nodes showing linked source count
  - Color-coded: green for 3+ sources (well-documented), yellow for 1-2 sources
  - Toggle in Settings → Charted Roots → Canvas styling → "Show source indicators"
- **Media Gallery in Sources Tab**: Thumbnail grid with search and filtering
  - Filter by media type (images, documents)
  - Filter by source type
  - Search by filename or source title
  - Lightbox viewer with keyboard navigation (arrow keys, Escape)
- Sources Bases template with 17 pre-configured views
- **Citation Generator**: Generate formatted citations in multiple styles
  - Chicago Manual of Style
  - Evidence Explained (Elizabeth Shown Mills) - genealogical standard
  - MLA (Modern Language Association)
  - Turabian

**Source Note Schema:**
```yaml
cr_type: source
cr_id: source-1900-census-smith
title: "1900 US Federal Census - Smith Family"
source_type: census
source_date: "1900-06-01"
source_repository: "Ancestry.com"
media: "[[Census 1900.pdf]]"
confidence: high
```

---

## v0.7.x

### Organization Notes (v0.7.0)

Define and visualize non-genealogical hierarchies (houses, guilds, corporations).

**Organization Note Schema:**
```yaml
cr_type: organization
name: "House Stark"
parent_org: "[[The North]]"
org_type: noble_house
founded: "Age of Heroes"
motto: "Winter is Coming"
seat: "[[Winterfell]]"
```

**Person Membership:**
```yaml
house: "[[House Stark]]"
role: "Lord of Winterfell"
house_from: "TA 280"
memberships:
  - org: "[[Night's Watch]]"
    role: "Lord Commander"
    from: "TA 300"
    to: "TA 305"
```

**Visualization:**
- D3-based org chart (tree, radial, dendrogram layouts)
- View by organization or by person
- Color coding by role, tenure, or organization type
- Temporal filtering
- Export as PNG, SVG, PDF

---

### Fictional Date Systems (v0.7.0)

Custom calendars and eras for world-building and historical research.

See [Fictional Date Systems](Fictional-Date-Systems) wiki page for full documentation.

**Features:**
- Era definitions with name, abbreviation, epoch offset, and direction (forward/backward)
- Date parsing for `{abbrev} {year}` format (e.g., "TA 2941", "AC 283")
- Built-in presets: Middle-earth, Westeros, Star Wars, Generic Fantasy calendars
- Universe-scoped calendar systems
- Date Systems card in Events tab
- Test date parsing input for validation
- Custom date system creation with era table editor
- Canonical year conversion for sorting/comparison
- Age calculation within calendar systems

**Usage in Person Notes:**
```yaml
born: "TA 2890"
died: "FoA 61"
```

---

### Custom Relationship Types (v0.7.0)

Define non-familial relationships beyond parent/child/spouse.

See [Custom Relationships](Custom-Relationships) wiki page for full documentation.

**Features:**
- 12 built-in relationship types across 4 categories (Legal, Religious, Professional, Social)
- Relationships Tab in Control Center for management
- Add Relationship Modal with category-grouped dropdown
- Frontmatter storage in `relationships` array
- Canvas edge support with colored edges
- Statistics card with relationship counts

**Schema:**
```yaml
relationships:
  - type: godparent
    target: "[[Jane Doe]]"
    target_id: person-jane-doe
    notes: "Became godparent at baptism in 1920"
```

---

## v0.6.x

### Schema Validation (v0.6.3)

User-defined validation schemas to catch data inconsistencies and enforce data quality rules.

See [Schema Validation](Schema-Validation) wiki page for full documentation.

**Features:**
- **Schema Notes**: New note type (`type: schema`) with JSON code block for schema definition
- **Schemas Tab**: Dedicated Control Center tab for schema management
  - Create Schema modal with full UI (no manual JSON editing required)
  - Edit existing schemas
  - Schema gallery with scope badges
  - Vault-wide validation with results display
  - Recent violations list
- **Schema Scopes**: Apply schemas by collection, folder, universe, or all people
- **Property Validation**:
  - Required properties
  - Type validation (string, number, date, boolean, enum, wikilink, array)
  - Enum validation with allowed values
  - Number range validation (min/max)
  - Wikilink target type validation (verify linked note type)
- **Conditional Requirements**: `requiredIf` conditions based on other properties
- **Custom Constraints**: JavaScript expressions for cross-property validation
- **Data Quality Integration**: Schema violations section in Data Quality tab
- **Commands**: "Open schemas tab", "Validate vault against schemas"

---

### Maps Tab (v0.6.2)

Dedicated Maps tab in Control Center for geographic features management.

See [maps-tab.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/maps-tab.md) for implementation details.

**Features:**
- Dedicated Maps tab in Control Center with 4 cards
- **Open Map View card**: Quick access with coordinate coverage stats
- **Custom Maps gallery**: Thumbnail grid with image previews (~150×100px)
  - Map name overlay and universe badge
  - Hover actions: Edit button and context menu button
  - Click thumbnail to open map in Map View
- **Visualizations card**: Migration diagrams and place network tools
- **Map Statistics card**: Coordinate coverage, custom map count, universe list

**Custom Map Management:**
- Create Map Modal for new map notes with image picker, bounds, and universe
- Edit Map Modal to update existing map properties
- Duplicate map with auto-generated unique ID
- Export map configuration to JSON
- Import map from JSON with duplicate ID detection
- Delete map with confirmation dialog

---

### Geographic Features (v0.6.0)

Interactive Map View with Leaflet.js for visualizing family history geographically.

See [leaflet-maps-plan.md](https://github.com/banisterious/obsidian-charted-roots/blob/main/docs/planning/archive/leaflet-maps-plan.md) for implementation details.

**Features:**
- Interactive Map View with Leaflet.js and OpenStreetMap tiles
- Color-coded markers (birth, death, marriage, burial) with clustering
- Additional marker types (residence, occupation, education, military, immigration, religious, custom)
- Events array support for multiple life events per person
- Migration paths with directional arrows and person name labels (TextPath)
- Custom image maps for fictional worlds with universe-based switching
- Time slider animation ("who was alive in year X?")
- Heat map layer for geographic concentration
- Fullscreen mode, mini-map, place search
- Side-by-side map comparison (split view)
- GeoJSON and SVG overlay export
- Interactive image alignment (Leaflet.DistortableImage) - drag corners to align maps
- Pixel-based coordinates (L.CRS.Simple) for worldbuilders
- Route/journey visualization (connect all life events chronologically)

---

### Import/Export Enhancements (v0.6.0)

Multiple format support for data interchange with other genealogy software.

**Features:**
- GEDCOM import/export
- GEDCOM X import/export (JSON format)
- Gramps XML import/export
- CSV import/export
- Privacy-aware exports with redaction options
- Separate Import and Export cards in Control Center UI
