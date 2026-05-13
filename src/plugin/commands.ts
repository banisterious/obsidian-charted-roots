/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
/**
 * Command Registrations
 *
 * Extracted from main.ts — registers all plugin commands, ribbon icons,
 * and workspace events.
 */

import { Notice } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { ControlCenterModal } from '../ui/control-center';
import { RegenerateOptionsModal } from '../ui/regenerate-options-modal';
import { AddResearchQuestionModal } from '../ui/add-research-question-modal';
import { CleanupWizardModal } from '../ui/cleanup-wizard-modal';
import { SplitWizardModal } from '../ui/split-wizard-modal';
import { CreatePlaceModal } from '../ui/create-place-modal';
import { PlaceLookupModal } from '../places/ui/place-lookup-modal';
import { CreateMapWizardModal } from '../ui/create-map-wizard-modal';
import { MergeDuplicatePlacesModal, findDuplicatePlaceNotes } from '../ui/merge-duplicate-places-modal';
import { RelationshipCalculatorModal } from '../ui/relationship-calculator-modal';
import { RelationshipHistoryModal } from '../ui/relationship-history-modal';
import { SchemaService, ValidationService } from '../schemas';
import { UniverseWizardModal } from '../universes';
import { CreateEventModal } from '../events/ui/create-event-modal';
import { isPersonNote, isPlaceNote, isEventNote } from '../utils/note-type-detection';
import { getErrorMessage } from '../core/error-utils';
import { AddRelationshipModal } from '../ui/add-relationship-modal';
import { CommandMenuModal } from '../ui/command-menu-modal';
import { AddCitationModal } from '../sources/ui/add-citation-modal';
import { CitationSyncService } from '../sources/services/citation-sync-service';
import { formatChangeDescription } from '../core/relationship-history';
import {
	promptAssignReferenceNumbers,
	promptClearReferenceNumbers,
	promptAssignLineage,
	promptRemoveLineage,
	generateTreeForCurrentNote,
	createPersonNote,
} from './bulk-operations';

/**
 * Show relationship history modal
 */
function showRelationshipHistory(plugin: CanvasRootsPlugin): void {
	const relationshipHistory = plugin.getRelationshipHistory();
	if (!relationshipHistory) {
		new Notice('Relationship history is disabled. Enable it in settings.');
		return;
	}

	new RelationshipHistoryModal(plugin.app, relationshipHistory).open();
}

/**
 * Undo the most recent relationship change
 */
async function undoLastRelationshipChange(plugin: CanvasRootsPlugin): Promise<void> {
	const relationshipHistory = plugin.getRelationshipHistory();
	if (!relationshipHistory) {
		new Notice('Relationship history is disabled. Enable it in settings.');
		return;
	}

	const change = await relationshipHistory.undoLastChange();
	if (change) {
		new Notice(`Undone: ${formatChangeDescription(change)}`);
	}
}

export function registerCommandsAndEvents(plugin: CanvasRootsPlugin): void {
	// Add ribbon icon for control center
	plugin.addRibbonIcon('users', 'Open Charted Roots control center', () => {
		new ControlCenterModal(plugin.app, plugin).open();
	});

	// Add command: Open quick actions (#290 — categorized command launcher)
	plugin.addCommand({
		id: 'open-quick-actions',
		name: 'Open quick actions',
		callback: () => {
			new CommandMenuModal(plugin.app).open();
		}
	});

	// Add command: Open Control Center
	plugin.addCommand({
		id: 'open-control-center',
		name: 'Open control center',
		callback: () => {
			new ControlCenterModal(plugin.app, plugin).open();
		}
	});

	// Add command: Manage Staging Area
	plugin.addCommand({
		id: 'manage-staging-area',
		name: 'Manage staging area',
		callback: async () => {
			const { StagingManagementModal } = await import('../ui/staging-management-modal');
			new StagingManagementModal(plugin.app, plugin).open();
		}
	});

	// Add command: Open Statistics Dashboard
	plugin.addCommand({
		id: 'open-statistics-dashboard',
		name: 'Open statistics dashboard',
		callback: () => {
			void plugin.activateStatisticsView();
		}
	});

	// Add command: Open Relationships view
	plugin.addCommand({
		id: 'open-relationships-view',
		name: 'Open relationships',
		callback: () => {
			void plugin.activateRelationshipsView();
		}
	});

	// Add command: Open People view
	plugin.addCommand({
		id: 'open-people-view',
		name: 'Open people',
		callback: () => {
			void plugin.activatePeopleView();
		}
	});

	// Add command: Open Events view
	plugin.addCommand({
		id: 'open-events-view',
		name: 'Open events',
		callback: () => {
			void plugin.activateEventsView();
		}
	});

	// Add command: Open Places view
	plugin.addCommand({
		id: 'open-places-view',
		name: 'Open places',
		callback: () => {
			void plugin.activatePlacesView();
		}
	});

	// Add command: Open Organizations view
	plugin.addCommand({
		id: 'open-organizations-view',
		name: 'Open organizations',
		callback: () => {
			void plugin.activateOrganizationsView();
		}
	});

	// Add command: Open Sources view
	plugin.addCommand({
		id: 'open-sources-view',
		name: 'Open sources',
		callback: () => {
			void plugin.activateSourcesView();
		}
	});

	// Add command: Open Universes view
	plugin.addCommand({
		id: 'open-universes-view',
		name: 'Open universes',
		callback: () => {
			void plugin.activateUniversesView();
		}
	});

	// Add command: Open Collections view
	plugin.addCommand({
		id: 'open-collections-view',
		name: 'Open collections',
		callback: () => {
			void plugin.activateCollectionsView();
		}
	});

	// Add command: Open Data Quality view
	plugin.addCommand({
		id: 'open-data-quality-view',
		name: 'Open data quality',
		callback: () => {
			void plugin.activateDataQualityView();
		}
	});

	// Add command: Open Entity Profile
	plugin.addCommand({
		id: 'open-entity-profile',
		name: 'Open entity profile',
		callback: () => {
			void plugin.activateProfileView();
		}
	});

	// Add command: Add research question to current note
	plugin.addCommand({
		id: 'add-research-question',
		name: 'Add research question to current note',
		checkCallback: (checking: boolean) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;

			const cache = plugin.app.metadataCache.getFileCache(file);
			const crType = cache?.frontmatter?.cr_type;
			const crId = cache?.frontmatter?.cr_id;

			// Valid for person notes (with cr_id), event notes, and place notes
			const validTypes = ['person', 'event', 'place'];
			const isValidType = validTypes.includes(crType);
			const isLegacyPersonNote = crId && !crType; // Legacy person notes have cr_id but no cr_type

			if (!isValidType && !isLegacyPersonNote) return false;

			if (!checking) {
				new AddResearchQuestionModal(plugin.app, file).open();
			}
			return true;
		}
	});

	// Add command: Add citation to current note
	plugin.addCommand({
		id: 'add-citation',
		name: 'Add citation to current note',
		checkCallback: (checking: boolean) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;

			const cache = plugin.app.metadataCache.getFileCache(file);
			const crType = cache?.frontmatter?.cr_type;
			const crId = cache?.frontmatter?.cr_id;

			// Valid for person and event notes
			const validTypes = ['person', 'event'];
			const isValidType = validTypes.includes(crType);
			const isLegacyPersonNote = crId && !crType;

			if (!isValidType && !isLegacyPersonNote) return false;
			if (!crId) return false;

			if (!checking) {
				new AddCitationModal(plugin.app, plugin, file, crId as string).open();
			}
			return true;
		}
	});

	// Add command: Sync sourced fields from citations
	plugin.addCommand({
		id: 'sync-sourced-from-citations',
		name: 'Sync sourced fields from citation notes (current note)',
		checkCallback: (checking: boolean) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;

			const cache = plugin.app.metadataCache.getFileCache(file);
			const crId = cache?.frontmatter?.cr_id;
			if (!crId) return false;

			if (!checking) {
				const syncService = new CitationSyncService(plugin);
				void syncService.syncSourcedFieldsForPerson(file).then(count => {
					new Notice(count > 0
						? `Updated ${count} sourced field${count !== 1 ? 's' : ''}`
						: 'No citation notes found for this person'
					);
				});
			}
			return true;
		}
	});

	// Add command: Generate citations from sourced_* fields
	plugin.addCommand({
		id: 'generate-citations-from-sourced',
		name: 'Generate citation notes from sourced fields (current note)',
		checkCallback: (checking: boolean) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file) return false;

			const cache = plugin.app.metadataCache.getFileCache(file);
			const crId = cache?.frontmatter?.cr_id;
			if (!crId) return false;

			if (!checking) {
				const syncService = new CitationSyncService(plugin);
				void syncService.generateCitationsFromSourcedFields(file).then(count => {
					new Notice(count > 0
						? `Created ${count} citation note${count !== 1 ? 's' : ''}`
						: 'No new citations to generate (all sourced facts already have citation notes)'
					);
				});
			}
			return true;
		}
	});

	// Add command: Sync sourced fields vault-wide
	plugin.addCommand({
		id: 'sync-sourced-from-citations-vault',
		name: 'Sync sourced fields from citation notes (all people)',
		callback: () => {
			const syncService = new CitationSyncService(plugin);
			new Notice('Syncing sourced fields from citations...');
			void syncService.syncSourcedFieldsVaultWide().then(result => {
				new Notice(`Updated ${result.fieldsUpdated} fields across ${result.peopleUpdated} people`);
			});
		}
	});

	// Add command: Post-Import Cleanup Wizard
	plugin.addCommand({
		id: 'open-cleanup-wizard',
		name: 'Post-import cleanup wizard',
		callback: () => {
			new CleanupWizardModal(plugin.app, plugin).open();
		}
	});

	// Register workspace event to open Control Center to a specific tab
	// Used by Plugin Settings to link to Preferences tab
	// Register both new and legacy event names for backward compatibility
	const openControlCenter = (initialTab?: string) => {
		new ControlCenterModal(plugin.app, plugin, initialTab).open();
	};
	plugin.registerEvent(
		plugin.app.workspace.on('charted-roots:open-control-center' as 'layout-change', openControlCenter)
	);
	plugin.registerEvent(
		plugin.app.workspace.on('canvas-roots:open-control-center' as 'layout-change', openControlCenter) // Legacy
	);

	// Register workspace event to open Cleanup Wizard
	// Used by Migration Notice view
	const openCleanupWizard = () => {
		new CleanupWizardModal(plugin.app, plugin).open();
	};
	plugin.registerEvent(
		plugin.app.workspace.on('charted-roots:open-cleanup-wizard' as 'layout-change', openCleanupWizard)
	);
	plugin.registerEvent(
		plugin.app.workspace.on('canvas-roots:open-cleanup-wizard' as 'layout-change', openCleanupWizard) // Legacy
	);

	// Add command: Generate Tree for Current Note
	plugin.addCommand({
		id: 'generate-tree-for-current-note',
		name: 'Generate tree for current note',
		callback: () => {
			void generateTreeForCurrentNote(plugin);
		}
	});

	// Add command: Regenerate Tree
	plugin.addCommand({
		id: 'regenerate-tree',
		name: 'Regenerate tree',
		callback: () => {
			const activeFile = plugin.app.workspace.getActiveFile();

			if (!activeFile || activeFile.extension !== 'canvas') {
				new Notice('No active canvas. Please open a canvas file first.');
				return;
			}

			// Show options modal
			new RegenerateOptionsModal(plugin.app, plugin, activeFile).open();
		}
	});

	// Add command: Create Person Note
	plugin.addCommand({
		id: 'create-person-note',
		name: 'Create person note',
		callback: () => {
			createPersonNote(plugin);
		}
	});

	// Add command: Create Family Wizard
	plugin.addCommand({
		id: 'create-family-wizard',
		name: 'Create family wizard',
		callback: () => {
			void import('../ui/family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
				new FamilyCreationWizardModal(plugin.app, plugin).open();
			});
		}
	});

	// Add command: Create Event Note
	plugin.addCommand({
		id: 'create-event-note',
		name: 'Create event note',
		callback: () => {
			const eventService = plugin.getEventService();
			if (eventService) {
				new CreateEventModal(plugin.app, eventService, plugin.settings).open();
			}
		}
	});

	// Add command: Edit current note (opens appropriate edit modal based on note type)
	plugin.addCommand({
		id: 'edit-current-note',
		name: 'Edit current note',
		checkCallback: (checking) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile || activeFile.extension !== 'md') {
				return false;
			}

			const cache = plugin.app.metadataCache.getFileCache(activeFile);
			const fm = cache?.frontmatter;
			const detectionSettings = plugin.settings.noteTypeDetection;

			// Check if this is a supported note type
			const isPerson = isPersonNote(fm, cache, detectionSettings);
			const isPlace = isPlaceNote(fm, cache, detectionSettings);
			const isEvent = isEventNote(fm, cache, detectionSettings);

			if (!isPerson && !isPlace && !isEvent) {
				return false;
			}

			if (!checking) {
				if (isPerson) {
					plugin.openEditPersonModal(activeFile);
				} else if (isPlace) {
					plugin.openEditPlaceModal(activeFile);
				} else if (isEvent) {
					plugin.openEditEventModal(activeFile);
				}
			}

			return true;
		}
	});

	// Add command: Generate All Trees (for multi-family vaults)
	plugin.addCommand({
		id: 'generate-all-trees',
		name: 'Generate all trees',
		callback: () => {
			void plugin.generateAllTrees();
		}
	});

	// Add command: Create Base Template
	plugin.addCommand({
		id: 'create-base-template',
		name: 'Create base template',
		callback: () => {
			void plugin.createBaseTemplate();
		}
	});

	// Add command: Create Organizations Base Template
	plugin.addCommand({
		id: 'create-organizations-base-template',
		name: 'Create organizations base template',
		callback: () => {
			void plugin.createOrganizationsBaseTemplate();
		}
	});

	// Add command: Create Sources Base Template
	plugin.addCommand({
		id: 'create-sources-base-template',
		name: 'Create sources base template',
		callback: () => {
			void plugin.createSourcesBaseTemplate();
		}
	});

	// Add command: Create Places Base Template
	plugin.addCommand({
		id: 'create-places-base-template',
		name: 'Create places base template',
		callback: () => {
			void plugin.createPlacesBaseTemplate();
		}
	});

	// Add command: Create Events Base Template
	plugin.addCommand({
		id: 'create-events-base-template',
		name: 'Create events base template',
		callback: () => {
			void plugin.createEventsBaseTemplate();
		}
	});

	// Add command: Create Universe
	plugin.addCommand({
		id: 'create-universe',
		name: 'Create universe',
		callback: () => {
			new UniverseWizardModal(plugin, {
				onComplete: () => {
					// Universe created successfully
				}
			}).open();
		}
	});

	// Add command: Create Universes Base Template
	plugin.addCommand({
		id: 'create-universes-base-template',
		name: 'Create universes base template',
		callback: () => {
			void plugin.createUniversesBaseTemplate();
		}
	});

	// Add command: Create Notes Base Template
	plugin.addCommand({
		id: 'create-notes-base-template',
		name: 'Create notes base template',
		callback: () => {
			void plugin.createNotesBaseTemplate();
		}
	});

	// Add command: Create Research Base Template
	plugin.addCommand({
		id: 'create-research-base-template',
		name: 'Create research base template',
		callback: () => {
			void plugin.createResearchBaseTemplate();
		}
	});

	// Add command: Create All Base Templates
	plugin.addCommand({
		id: 'create-all-bases',
		name: 'Create all base templates',
		callback: () => {
			void plugin.createAllBases();
		}
	});

	// Add command: Calculate Relationship
	plugin.addCommand({
		id: 'calculate-relationship',
		name: 'Calculate relationship between people',
		callback: () => {
			new RelationshipCalculatorModal(plugin.app, plugin.settings).open();
		}
	});

	// Add command: Find Related Research
	plugin.addCommand({
		id: 'find-related-research',
		name: 'Find related research for person',
		callback: async () => {
			const { FindRelatedResearchModal } = await import('../ui/find-related-research-modal');
			const activeFile = plugin.app.workspace.getActiveFile();
			if (activeFile && isPersonNote(plugin.app, activeFile)) {
				const cache = plugin.app.metadataCache.getFileCache(activeFile);
				const name = (cache?.frontmatter?.name as string) || activeFile.basename;
				new FindRelatedResearchModal(plugin.app, name, activeFile.basename).open();
			} else {
				const { PersonPickerModal } = await import('../ui/person-picker');
				const picker = new PersonPickerModal(plugin.app, (person) => {
					new FindRelatedResearchModal(plugin.app, person.name, person.file.basename).open();
				});
				picker.open();
			}
		}
	});

	// Add command: Find Duplicates
	plugin.addCommand({
		id: 'find-duplicates',
		name: 'Find duplicate people',
		callback: async () => {
			const { DuplicateDetectionModal } = await import('../ui/duplicate-detection-modal');
			new DuplicateDetectionModal(plugin.app, plugin.settings).open();
		}
	});

	// Add command: Open Family Chart
	// If a person note is active, use it as the root; otherwise show picker/empty state
	plugin.addCommand({
		id: 'open-family-chart',
		name: 'Open Family Chart',
		callback: () => {
			// Try to get cr_id from active note if it's a person note
			const activeFile = plugin.app.workspace.getActiveFile();
			let crId: string | undefined;
			if (activeFile && activeFile.extension === 'md') {
				const cache = plugin.app.metadataCache.getFileCache(activeFile);
				crId = plugin.resolveFrontmatterProperty<string>(cache?.frontmatter, 'cr_id');
			}
			void plugin.activateFamilyChartView(crId);
		}
	});

	// Add command: Open Map View
	plugin.addCommand({
		id: 'open-map-view',
		name: 'Open map view',
		callback: () => {
			void plugin.activateMapView();
		}
	});

	// Add command: Open Calendar View
	plugin.addCommand({
		id: 'open-calendar-view',
		name: 'Open calendar view',
		callback: () => {
			void plugin.activateCalendarView();
		}
	});

	// Add command: Open Report Wizard (#372)
	plugin.addCommand({
		id: 'open-report-wizard',
		name: 'Open report wizard',
		callback: () => {
			void import('../reports/ui/report-wizard-modal').then(({ ReportWizardModal }) => {
				new ReportWizardModal(plugin).open();
			});
		}
	});

	// Add command: Open New Map View (for side-by-side comparison)
	plugin.addCommand({
		id: 'open-new-map-view',
		name: 'Open new map view (for comparison)',
		callback: () => {
			void plugin.activateMapView(undefined, true);
		}
	});

	// Add command: Open new Family Chart (always creates new tab)
	plugin.addCommand({
		id: 'open-new-family-chart',
		name: 'Open new Family Chart',
		callback: () => {
			void plugin.activateFamilyChartView(undefined, true, true);
		}
	});

	// Add command: Open Family Chart for Current Note
	plugin.addCommand({
		id: 'open-family-chart-for-note',
		name: 'Open current note in Family Chart',
		checkCallback: (checking) => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile || activeFile.extension !== 'md') {
				return false;
			}
			const cache = plugin.app.metadataCache.getFileCache(activeFile);
			const crId = plugin.resolveFrontmatterProperty<string>(cache?.frontmatter, 'cr_id');
			if (!crId) {
				return false;
			}
			if (!checking) {
				void plugin.activateFamilyChartView(crId);
			}
			return true;
		}
	});

	// Add command: Assign Ahnentafel Numbers
	plugin.addCommand({
		id: 'assign-ahnentafel',
		name: 'Assign Ahnentafel numbers (ancestors)',
		callback: () => {
			promptAssignReferenceNumbers(plugin, 'ahnentafel');
		}
	});

	// Add command: Assign d'Aboville Numbers
	plugin.addCommand({
		id: 'assign-daboville',
		name: "Assign d'Aboville numbers (descendants)",
		callback: () => {
			promptAssignReferenceNumbers(plugin, 'daboville');
		}
	});

	// Add command: Assign Henry Numbers
	plugin.addCommand({
		id: 'assign-henry',
		name: 'Assign Henry numbers (descendants)',
		callback: () => {
			promptAssignReferenceNumbers(plugin, 'henry');
		}
	});

	// Add command: Assign Generation Numbers
	plugin.addCommand({
		id: 'assign-generation',
		name: 'Assign generation numbers (all relatives)',
		callback: () => {
			promptAssignReferenceNumbers(plugin, 'generation');
		}
	});

	// Add command: Clear Reference Numbers
	plugin.addCommand({
		id: 'clear-reference-numbers',
		name: 'Clear reference numbers',
		callback: () => {
			promptClearReferenceNumbers(plugin);
		}
	});

	// Add command: Assign Lineage
	plugin.addCommand({
		id: 'assign-lineage',
		name: 'Assign lineage from root person',
		callback: () => {
			promptAssignLineage(plugin);
		}
	});

	// Add command: Remove Lineage
	plugin.addCommand({
		id: 'remove-lineage',
		name: 'Remove lineage tags',
		callback: () => {
			promptRemoveLineage(plugin);
		}
	});

	// Add command: View relationship history
	plugin.addCommand({
		id: 'view-relationship-history',
		name: 'View relationship history',
		callback: () => {
			showRelationshipHistory(plugin);
		}
	});

	// Add command: Undo last relationship change
	plugin.addCommand({
		id: 'undo-relationship-change',
		name: 'Undo last relationship change',
		callback: () => {
			void undoLastRelationshipChange(plugin);
		}
	});

	// Add command: Split Tree Wizard
	plugin.addCommand({
		id: 'split-tree-wizard',
		name: 'Split tree wizard',
		callback: () => {
			new SplitWizardModal(plugin.app, plugin.settings, plugin.getFolderFilter() ?? undefined).open();
		}
	});

	// Add command: Create Place Note
	plugin.addCommand({
		id: 'create-place-note',
		name: 'Create place note',
		callback: () => {
			new CreatePlaceModal(plugin.app, {
				directory: plugin.settings.placesFolder || '',
				familyGraph: plugin.createFamilyGraphService(),
				placeGraph: plugin.createPlaceGraphService(),
				settings: plugin.settings,
				plugin: plugin
			}).open();
		}
	});

	// Add command: Look up Place (#218)
	plugin.addCommand({
		id: 'lookup-place',
		name: 'Look up place',
		callback: () => {
			new PlaceLookupModal(plugin.app, {
				settings: plugin.settings,
				onSelect: (result) => {
					// Open Create Place modal with the selected result pre-populated
					new CreatePlaceModal(plugin.app, {
						directory: plugin.settings.placesFolder || '',
						initialName: result.standardizedName,
						initialPlaceType: result.placeType,
						familyGraph: plugin.createFamilyGraphService(),
						placeGraph: plugin.createPlaceGraphService(),
						settings: plugin.settings,
						plugin: plugin,
						prefilledCoordinates: result.coordinates ? {
							lat: result.coordinates.lat,
							lng: result.coordinates.lng
						} : undefined
					}).open();
				}
			}).open();
		}
	});

	// Add command: Create Custom Map
	plugin.addCommand({
		id: 'create-custom-map',
		name: 'Create custom map',
		callback: () => {
			new CreateMapWizardModal(plugin.app, plugin, {
				directory: plugin.settings.mapsFolder
			}).open();
		}
	});

	// Add command: Open Places Tab
	plugin.addCommand({
		id: 'open-places-tab',
		name: 'Open places tab',
		callback: () => {
			const modal = new ControlCenterModal(plugin.app, plugin);
			modal.openToTab('places');
		}
	});

	// Add command: Merge Duplicate Places
	plugin.addCommand({
		id: 'merge-duplicate-places',
		name: 'Merge duplicate place notes',
		callback: () => {
			const duplicateGroups = findDuplicatePlaceNotes(plugin.app, {
				settings: plugin.settings,
				folderFilter: plugin.getFolderFilter()
			});
			if (duplicateGroups.length === 0) {
				new Notice('No duplicate place notes found. Your places are unique!');
				return;
			}
			new MergeDuplicatePlacesModal(plugin.app, duplicateGroups).open();
		}
	});

	// Add command: Open Schemas Tab
	plugin.addCommand({
		id: 'open-schemas-tab',
		name: 'Open schemas tab',
		callback: () => {
			const modal = new ControlCenterModal(plugin.app, plugin);
			modal.openToTab('schemas');
		}
	});

	// Add command: Validate Vault Against Schemas
	plugin.addCommand({
		id: 'validate-vault-schemas',
		name: 'Validate vault against schemas',
		callback: async () => {
			const schemaService = new SchemaService(plugin);
			const validationService = new ValidationService(plugin, schemaService);

			new Notice('Running schema validation...');

			try {
				const results = await validationService.validateVault();
				const summary = validationService.getSummary(results);

				const failedCount = new Set(results.filter(r => !r.isValid).map(r => r.filePath)).size;
				const passedCount = summary.totalPeopleValidated - failedCount;

				new Notice(`Schema validation: ${passedCount} passed, ${failedCount} failed, ${summary.totalErrors} errors`);

				// Open Control Center to Schemas tab to show full results
				const modal = new ControlCenterModal(plugin.app, plugin);
				modal.openToTab('schemas');
			} catch (error) {
				new Notice(`Schema validation failed: ${getErrorMessage(error)}`);
			}
		}
	});

	// Add command: Add Custom Relationship
	plugin.addCommand({
		id: 'add-custom-relationship',
		name: 'Add custom relationship to current person',
		callback: () => {
			const activeFile = plugin.app.workspace.getActiveFile();

			if (!activeFile || activeFile.extension !== 'md') {
				new Notice('No active Markdown file. Please open a person note first.');
				return;
			}

			// Check if the file has a cr_id (is a person note)
			const cache = plugin.app.metadataCache.getFileCache(activeFile);
			if (!cache?.frontmatter?.cr_id) {
				new Notice('Current file is not a person note (missing cr_id)');
				return;
			}

			new AddRelationshipModal(plugin.app, plugin, activeFile).open();
		}
	});

	// Add command: Insert Dynamic Blocks
	plugin.addCommand({
		id: 'insert-dynamic-blocks',
		name: 'Insert dynamic blocks in current note',
		callback: async () => {
			const activeFile = plugin.app.workspace.getActiveFile();

			if (!activeFile || activeFile.extension !== 'md') {
				new Notice('No active Markdown file. Please open a person note first.');
				return;
			}

			// Check if the file has a cr_id (is a person note)
			const cache = plugin.app.metadataCache.getFileCache(activeFile);
			if (!cache?.frontmatter?.cr_id) {
				new Notice('Current file is not a person note (missing cr_id)');
				return;
			}

			await plugin.insertDynamicBlocks([activeFile]);
		}
	});

	// Add command: Open Relationships Tab
	plugin.addCommand({
		id: 'open-relationships-tab',
		name: 'Open relationships tab',
		callback: () => {
			const modal = new ControlCenterModal(plugin.app, plugin);
			modal.openToTab('relationships');
		}
	});

	// Add command: Create Organization Note
	plugin.addCommand({
		id: 'create-organization-note',
		name: 'Create organization note',
		callback: async () => {
			const { CreateOrganizationModal } = await import('../organizations');
			new CreateOrganizationModal(plugin.app, plugin, () => {
				// Optionally open to organizations tab after creation
			}).open();
		}
	});

	// Add command: Open Organizations Tab
	plugin.addCommand({
		id: 'open-organizations-tab',
		name: 'Open organizations tab',
		callback: () => {
			const modal = new ControlCenterModal(plugin.app, plugin);
			modal.openToTab('organizations');
		}
	});

	// Add command: Create Source Note
	plugin.addCommand({
		id: 'create-source-note',
		name: 'Create source note',
		callback: async () => {
			const { CreateSourceModal } = await import('../sources');
			new CreateSourceModal(plugin.app, plugin, () => {
				// Optionally open to sources tab after creation
			}).open();
		}
	});

	// Add command: Create Note (Phase 4 Gramps Notes)
	plugin.addCommand({
		id: 'create-note',
		name: 'Create note',
		callback: async () => {
			const { CreateNoteModal } = await import('../ui/create-note-modal');
			new CreateNoteModal(plugin.app, plugin).open();
		}
	});

	// Add command: Open Sources Tab
	plugin.addCommand({
		id: 'open-sources-tab',
		name: 'Open sources tab',
		callback: () => {
			const modal = new ControlCenterModal(plugin.app, plugin);
			modal.openToTab('sources');
		}
	});

	// Add command: Generate Place Notes
	plugin.addCommand({
		id: 'generate-place-notes',
		name: 'Generate place notes from place strings',
		callback: async () => {
			const { PlaceGeneratorModal } = await import('../enhancement/ui/place-generator-modal');
			new PlaceGeneratorModal(plugin.app, plugin.settings).open();
		}
	});

	// Add command: Open Book Builder
	plugin.addCommand({
		id: 'open-book-builder',
		name: 'Open book builder',
		callback: async () => {
			const { BookBuilderModal } = await import('../book/ui/book-builder-modal');
			new BookBuilderModal(plugin).open();
		}
	});

	// Add command: Regenerate book from .book.json
	plugin.addCommand({
		id: 'regenerate-book',
		name: 'Regenerate book from definition',
		checkCallback: (checking: boolean) => {
			const file = plugin.app.workspace.getActiveFile();
			if (!file || !file.path.endsWith('.book.json')) return false;
			if (checking) return true;

			void (async () => {
				try {
					const content = await plugin.app.vault.read(file);
					const definition = JSON.parse(content);
					const { BookGenerationService } = await import('../book/services/book-generation-service');
					const service = new BookGenerationService(plugin.app, plugin.settings, plugin);

					new Notice('Regenerating book...');
					const result = await service.generateBook(definition);

					if (result.success && result.blob) {
						BookGenerationService.downloadBook(result.blob, result.suggestedFilename);

						// Save updated hashes and timestamp back to definition
						definition.lastGeneratedAt = new Date().toISOString();
						definition.lastChapterHashes = result.chapterHashes;
						await plugin.app.vault.modify(file, JSON.stringify(definition, null, '\t'));

						const changedCount = result.changedChapters?.length ?? 0;
						const changeMsg = definition.lastChapterHashes
							? ` (${changedCount} chapter${changedCount !== 1 ? 's' : ''} changed)`
							: '';
						new Notice(`Book regenerated: ${result.stats.chapterCount} chapters${changeMsg}`);
					} else {
						new Notice(`Book generation failed: ${result.errors.join(', ')}`);
					}
				} catch (err) {
					new Notice(`Failed to regenerate book: ${err instanceof Error ? err.message : String(err)}`);
				}
			})();
			return true;
		}
	});
}