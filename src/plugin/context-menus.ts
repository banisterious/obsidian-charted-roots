/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Obsidian API returns any-typed surfaces (frontmatter, file caches, plugin state); project policy accepts these. */
import { App, FuzzySuggestModal, Notice, TFile, TFolder, Menu, Platform, type CachedMetadata } from 'obsidian';
import type { OrganizationInfo } from '../organizations/types/organization-types';
import type CanvasRootsPlugin from '../../main';
import { VIEW_TYPE_CALENDAR } from '../calendar/calendar-view';
import {
	addCrId, addEssentialEventProperties, addEssentialMapProperties,
	addEssentialPersonProperties, addEssentialPlaceProperties,
	addEssentialSourceProperties, addEssentialUniverseProperties,
	addSourceToPersonNote, assignLineageFromPerson,
	assignReferenceNumbersFromPerson, confirmDeleteEvent,
	confirmDeleteUniverse, exportCanvasAsImage, exportCanvasToExcalidraw,
	exportPersonTimelineFromFile, geocodeSinglePlace, insertMembersBlock,
	insertSourceRolesBlock, linkPersonToEvent, linkSourceToEvent,
	openCanvasInFamilyChart, openCitationGenerator, openEditSourceModal,
	openEditUniverseModal, openManageMediaModal, promptParentType,
	promptSetCollection, promptSetCollectionName,
	openRegionDrawingForMap, regenerateTimelineCanvas,
	showCreatePlaceNotesForPerson, showFolderStatistics, toggleRootPerson
} from './context-menu-helpers';
import { RegenerateOptionsModal } from '../ui/regenerate-options-modal';
import { TreeStatisticsModal } from '../ui/tree-statistics-modal';
import { PersonPickerModal } from '../ui/person-picker';
import type { RelationshipContext } from '../ui/quick-create-person-modal';
import { FolderScanModal } from '../ui/folder-scan-modal';
import { getErrorMessage } from '../core/error-utils';
import { isPlaceNote, isSourceNote, isEventNote, isMapNote, isSchemaNote, isUniverseNote, isOrganizationNote } from '../utils/note-type-detection';
import { CreateSourceModal } from '../sources';
import { CreateEventModal } from '../events/ui/create-event-modal';
import { CreatePlaceModal } from '../ui/create-place-modal';
import { CreatePersonModal } from '../ui/create-person-modal';
import { AddRelationshipModal } from '../ui/add-relationship-modal';
import { RelationshipManager } from '../core/relationship-manager';
import { RelationshipCalculatorModal } from '../ui/relationship-calculator-modal';
import { SchemaService, ValidationService } from '../schemas';
import { CreateMapWizardModal } from '../ui/create-map-wizard-modal';
import { SplitWizardModal } from '../ui/split-wizard-modal';
import { ControlCenterModal } from '../ui/control-center';
import { FindOnCanvasModal } from '../ui/find-on-canvas-modal';
import { ValidationResultsModal } from '../ui/validation-results-modal';
import { RelationshipValidator } from '../core/relationship-validator';
import { getLogger } from '../core/logging';

const logger = getLogger('context-menus');

/**
 * Open ManageOrganizationMembersModal for a person, handling the 0 / 1 /
 * multiple memberships cases (#490). When the person belongs to a single
 * organization the modal opens directly; when they belong to multiple, a
 * fuzzy picker scoped to their orgs lets the user pick which to manage.
 */
async function openManageMembershipsForPerson(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const personCrId = cache?.frontmatter?.cr_id as string | undefined;
	if (!personCrId) {
		new Notice('Person has no cr_id; cannot resolve memberships');
		return;
	}

	const { ManageOrganizationMembersModal } = await import('../organizations/ui/manage-members-modal');
	const { createOrganizationService } = await import('../organizations/services/organization-service');
	const { createMembershipService } = await import('../organizations/services/membership-service');
	const orgService = createOrganizationService(plugin);
	const membershipService = createMembershipService(plugin, orgService);
	const memberships = membershipService.getPersonMemberships(personCrId);

	const orgs = memberships
		.map(m => m.org)
		.filter((org): org is OrganizationInfo => !!org);

	if (orgs.length === 0) {
		new Notice('This person has no organization memberships to manage');
		return;
	}

	const openForOrg = (org: OrganizationInfo): void => {
		new ManageOrganizationMembersModal(plugin.app, plugin, {
			organization: org,
			organizationService: orgService,
			membershipService: membershipService
		}).open();
	};

	if (orgs.length === 1) {
		openForOrg(orgs[0]);
		return;
	}

	new OrgPickerSuggest(plugin.app, orgs, openForOrg).open();
}

/**
 * Fuzzy picker for choosing among a person's organizations when they
 * belong to more than one (#490).
 */
class OrgPickerSuggest extends FuzzySuggestModal<OrganizationInfo> {
	constructor(
		app: App,
		private readonly orgs: OrganizationInfo[],
		private readonly onPick: (org: OrganizationInfo) => void
	) {
		super(app);
		this.setPlaceholder('Pick an organization to manage members');
	}

	getItems(): OrganizationInfo[] {
		return this.orgs;
	}

	getItemText(org: OrganizationInfo): string {
		return org.name;
	}

	onChooseItem(org: OrganizationInfo): void {
		this.onPick(org);
	}
}

/**
 * Register all context menu handlers for the plugin.
 * Called from plugin.onload() to set up file-menu and editor-menu events.
 */
export function registerContextMenus(plugin: CanvasRootsPlugin): void {
	// Add context menu items for person notes, canvas files, and folders
	plugin.registerEvent(
			plugin.app.workspace.on('file-menu', (menu, file) => {
				// Only show submenus on desktop (mobile doesn't support them)
				const useSubmenu = Platform.isDesktop && !Platform.isMobile;

				// Canvas files: Regenerate canvas
				if (file instanceof TFile && file.extension === 'canvas') {
					buildCanvasContextMenu(menu, plugin, file, useSubmenu);
				}

				// Book definition files (.book.json)
				if (file instanceof TFile && file.path.endsWith('.book.json')) {
					menu.addSeparator();
					menu.addItem((item) => {
						item.setTitle('Open in book builder');
						item.setIcon('book-open');
						item.onClick(async () => {
							try {
								const content = await plugin.app.vault.read(file);
								const definition = JSON.parse(content);
								const { BookBuilderModal } = await import('../book/ui/book-builder-modal');
								new BookBuilderModal(plugin, {
									definition,
									sourceFilePath: file.path,
								}).open();
							} catch (error) {
								logger.error('open-book-builder', 'Failed to open book definition', error);
								new Notice('Failed to read book definition file');
							}
						});
					});
					menu.addItem((item) => {
						item.setTitle('Regenerate book');
						item.setIcon('refresh-cw');
						item.onClick(async () => {
							try {
								const content = await plugin.app.vault.read(file);
								const definition = JSON.parse(content);
								const { BookGenerationService } = await import('../book/services/book-generation-service');
								const service = new BookGenerationService(plugin.app, plugin.settings, plugin);

								new Notice('Regenerating book...');
								const result = await service.generateBook(definition);

								if (result.success && result.blob) {
									BookGenerationService.downloadBook(result.blob, result.suggestedFilename);

									// Save updated hashes and timestamp
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
							} catch (error) {
								logger.error('regenerate-book', 'Failed to regenerate book', error);
								new Notice('Failed to regenerate book');
							}
						});
					});
				}

				// Markdown files: Person notes, Place notes, Source notes, Map notes, Schema notes, or plain notes
				if (file instanceof TFile && file.extension === 'md') {
					const cache = plugin.app.metadataCache.getFileCache(file);
					const fm = cache?.frontmatter;
					const hasCrId = !!fm?.cr_id;

					// Use centralized note type detection (supports cr_type, type, and tags)
					const detectionSettings = plugin.settings.noteTypeDetection;
					const isPlace = isPlaceNote(fm, cache, detectionSettings);
					const isSource = isSourceNote(fm, cache, detectionSettings);
					const isMap = isMapNote(fm, cache, detectionSettings);
					const isSchema = isSchemaNote(fm, cache, detectionSettings);
					const isEvent = isEventNote(fm, cache, detectionSettings);
					const isUniverse = isUniverseNote(fm, cache, detectionSettings);
					const isOrg = isOrganizationNote(fm, cache, detectionSettings);

					// Also check if file is in maps folder (for notes not yet typed as map)
					const mapsFolder = plugin.settings.mapsFolder;
					const isInMapsFolder = mapsFolder && file.path.startsWith(mapsFolder + '/');

					// Schema notes get schema-specific options
					if (isSchema) {
						buildSchemaContextMenu(menu, plugin, file, fm, cache, useSubmenu);
					}
					// Map notes get map-specific options (open map view with this map selected)
					// Also show for files in maps folder that aren't yet typed as map
					else if (isMap || isInMapsFolder) {
						buildMapContextMenu(menu, plugin, file, fm, useSubmenu);
					}
					// Place notes with cr_id get place-specific options
					else if (hasCrId && isPlace) {
						buildPlaceContextMenu(menu, plugin, file, fm, useSubmenu);
					}
					// Source notes with cr_id get source-specific options
					else if (hasCrId && isSource) {
						buildSourceContextMenu(menu, plugin, file, useSubmenu);
					}
					// Person notes with cr_id get full person options
					else if (hasCrId && !isPlace && !isSource && !isEvent && !isUniverse && !isOrg) {
						buildPersonContextMenu(menu, plugin, file, cache, useSubmenu);
					}
					// Event notes with cr_id get event-specific options
					else if (hasCrId && isEvent) {
						buildEventContextMenu(menu, plugin, file, cache, useSubmenu);
					}
					// Organization notes with cr_id get organization-specific options
					else if (hasCrId && isOrg) {
						buildOrganizationContextMenu(menu, plugin, file, useSubmenu);
					}
					// Notes without cr_id still get "Add essential properties" option
					else if (!hasCrId) {
						buildPlainMarkdownContextMenu(menu, plugin, file, useSubmenu);
					}
					// Universe notes with cr_id get universe-specific options
					else if (hasCrId && isUniverse) {
						buildUniverseContextMenu(menu, plugin, file, cache, useSubmenu);
					}
				}

				// Image files: Use as custom map
				const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
				if (file instanceof TFile && imageExtensions.includes(file.extension.toLowerCase())) {
					menu.addSeparator();

					menu.addItem((item) => {
						item
							.setTitle('Charted Roots: Use as custom map')
							.setIcon('map')
							.onClick(() => {
								new CreateMapWizardModal(plugin.app, plugin, {
									directory: plugin.settings.mapsFolder,
									preselectedImage: file
								}).open();
							});
					});
				}

				// Folders: Type-specific context menus
				if (file instanceof TFolder) {
					buildFolderContextMenu(menu, plugin, file, useSubmenu);
				}
			})
		);

		// Add context menu for multi-file selections
		plugin.registerEvent(
			plugin.app.workspace.on('files-menu', (menu, files) => {
				// Only show for multiple markdown files
				const markdownFiles = files.filter((f): f is TFile => f instanceof TFile && f.extension === 'md');

				if (markdownFiles.length === 0) return;

				// Check if any files are missing essential properties
				let hasMissingPersonProperties = false;
				let hasMissingPlaceProperties = false;
				let hasMissingSourceProperties = false;

				for (const file of markdownFiles) {
					const fileCache = plugin.app.metadataCache.getFileCache(file);
					const frontmatter = fileCache?.frontmatter || {};

					// Check person properties
					const hasAllPersonProperties =
						frontmatter.cr_id &&
						frontmatter.name &&
						('born' in frontmatter) &&
						('died' in frontmatter) &&
						(('father' in frontmatter) || ('father_id' in frontmatter)) &&
						(('mother' in frontmatter) || ('mother_id' in frontmatter)) &&
						(('spouses' in frontmatter) || ('spouse' in frontmatter) || ('spouse_id' in frontmatter)) &&
						(('children' in frontmatter) || ('children_id' in frontmatter)) &&
						('group_name' in frontmatter);

					// Check place properties (supports both cr_type and legacy type)
					const hasAllPlaceProperties =
						(frontmatter.cr_type === 'place' || frontmatter.type === 'place') &&
						frontmatter.cr_id &&
						frontmatter.name &&
						('place_type' in frontmatter) &&
						('place_category' in frontmatter);

					// Check source properties (supports both cr_type and legacy type)
					const hasAllSourceProperties =
						(frontmatter.cr_type === 'source' || frontmatter.type === 'source') &&
						frontmatter.cr_id &&
						frontmatter.title &&
						frontmatter.source_type &&
						('confidence' in frontmatter);

					if (!hasAllPersonProperties) hasMissingPersonProperties = true;
					if (!hasAllPlaceProperties) hasMissingPlaceProperties = true;
					if (!hasAllSourceProperties) hasMissingSourceProperties = true;

					// If all types are missing properties, no need to keep checking
					if (hasMissingPersonProperties && hasMissingPlaceProperties && hasMissingSourceProperties) break;
				}

				// Only show submenu if at least one type is missing properties
				if (hasMissingPersonProperties || hasMissingPlaceProperties || hasMissingSourceProperties) {
					const useSubmenu = Platform.isDesktop && !Platform.isMobile;
					menu.addSeparator();

					if (useSubmenu) {
						menu.addItem((item) => {
							const propsSubmenu: Menu = item
								.setTitle(`Charted Roots: Add essential properties (${markdownFiles.length} files)`)
								.setIcon('file-plus')
								.setSubmenu();

							if (hasMissingPersonProperties) {
								propsSubmenu.addItem((subItem) => {
									subItem
										.setTitle('Add essential person properties')
										.setIcon('user')
										.onClick(async () => {
											await addEssentialPersonProperties(plugin, markdownFiles);
										});
								});
							}

							if (hasMissingPlaceProperties) {
								propsSubmenu.addItem((subItem) => {
									subItem
										.setTitle('Add essential place properties')
										.setIcon('map-pin')
										.onClick(async () => {
											await addEssentialPlaceProperties(plugin, markdownFiles);
										});
								});
							}

								if (hasMissingSourceProperties) {
									propsSubmenu.addItem((subItem) => {
									subItem
										.setTitle('Add essential source properties')
										.setIcon('archive')
										.onClick(async () => {
											await addEssentialSourceProperties(plugin, markdownFiles);
										});
									});
								}

							// Add cr_id option
							propsSubmenu.addItem((subItem) => {
								subItem
									.setTitle('Add cr_id')
									.setIcon('key')
									.onClick(async () => {
										await addCrId(plugin, markdownFiles);
									});
							});
						});
					} else {
						// Mobile: flat menu
						if (hasMissingPersonProperties) {
							menu.addItem((item) => {
								item
									.setTitle(`Charted Roots: Add essential person properties (${markdownFiles.length} files)`)
									.setIcon('user')
									.onClick(async () => {
										await addEssentialPersonProperties(plugin, markdownFiles);
									});
							});
						}

						if (hasMissingPlaceProperties) {
							menu.addItem((item) => {
								item
									.setTitle(`Charted Roots: Add essential place properties (${markdownFiles.length} files)`)
									.setIcon('map-pin')
									.onClick(async () => {
										await addEssentialPlaceProperties(plugin, markdownFiles);
									});
							});
						}

						if (hasMissingSourceProperties) {
							menu.addItem((item) => {
								item
								.setTitle(`Charted Roots: Add essential source properties (${markdownFiles.length} files)`)
								.setIcon('archive')
								.onClick(async () => {
									await addEssentialSourceProperties(plugin, markdownFiles);
								});
							});
						}

						// Add cr_id option (mobile)
						menu.addItem((item) => {
							item
								.setTitle(`Charted Roots: Add cr_id (${markdownFiles.length} files)`)
								.setIcon('key')
								.onClick(async () => {
									await addCrId(plugin, markdownFiles);
								});
						});
					}
					}
			})
	);
}

/**
 * Build context menu items for canvas files (.canvas).
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildCanvasContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	// Check if this is a timeline canvas (async check for context menu)
	const checkTimelineCanvas = async (): Promise<boolean> => {
		try {
			const content = await plugin.app.vault.read(file);
			const data = JSON.parse(content);
			return data.metadata?.frontmatter?.['canvas-roots']?.type === 'timeline-export';
		} catch {
			return false;
		}
	};

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('git-fork')
				.setSubmenu();

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Regenerate canvas')
					.setIcon('refresh-cw')
					.onClick(async () => {
						// Check if timeline or tree canvas
						const isTimeline = await checkTimelineCanvas();
						if (isTimeline) {
							// Regenerate timeline
							await regenerateTimelineCanvas(plugin, file);
						} else {
							// Open the canvas file first
							const leaf = plugin.app.workspace.getLeaf(false);
							await leaf.openFile(file);

							// Give canvas a moment to load
							await new Promise(resolve => window.setTimeout(resolve, 100));

							// Show options modal
							new RegenerateOptionsModal(plugin.app, plugin, file).open();
						}
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Show tree statistics')
					.setIcon('bar-chart')
					.onClick(() => {
						new TreeStatisticsModal(plugin.app, file).open();
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Customize canvas styles')
					.setIcon('layout')
					.onClick(async () => {
						// Check if timeline or tree canvas
						const isTimeline = await checkTimelineCanvas();
						if (isTimeline) {
							const { TimelineStyleModal } = await import('../events/ui/timeline-style-modal');
							new TimelineStyleModal(plugin.app, plugin, file).open();
						} else {
							const { CanvasStyleModal } = await import('../ui/canvas-style-modal');
							new CanvasStyleModal(plugin.app, plugin, file).open();
						}
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open in Family Chart')
					.setIcon('git-fork')
					.onClick(async () => {
						await openCanvasInFamilyChart(plugin, file);
					});
			});

			// Export submenu (Excalidraw + images)
			submenu.addItem((subItem) => {
				const exportSubmenu: Menu = subItem
					.setTitle('Export')
					.setIcon('share')
					.setSubmenu();

				exportSubmenu.addItem((expItem) => {
					expItem
						.setTitle('Export to Excalidraw')
						.setIcon('pencil')
						.onClick(async () => {
							await exportCanvasToExcalidraw(plugin, file);
						});
				});

				exportSubmenu.addSeparator();

				exportSubmenu.addItem((expItem) => {
					expItem
						.setTitle('Export as PNG')
						.setIcon('image')
						.onClick(async () => {
							await exportCanvasAsImage(plugin, file, 'png');
						});
				});

				exportSubmenu.addItem((expItem) => {
					expItem
						.setTitle('Export as SVG')
						.setIcon('file-code')
						.onClick(async () => {
							await exportCanvasAsImage(plugin, file, 'svg');
						});
				});

				exportSubmenu.addItem((expItem) => {
					expItem
						.setTitle('Export as PDF')
						.setIcon('file-text')
						.onClick(async () => {
							await exportCanvasAsImage(plugin, file, 'pdf');
						});
				});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Split canvas wizard')
					.setIcon('layers')
					.onClick(() => {
						new SplitWizardModal(plugin.app, plugin.settings, plugin.folderFilter ?? undefined).open();
					});
			});

			submenu.addSeparator();

			submenu.addItem((subItem) => {
				subItem
					.setTitle('More options...')
					.setIcon('settings')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('tree-generation');
					});
			});
		});
	} else {
		// Mobile: flat menu with prefix
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Regenerate canvas')
				.setIcon('refresh-cw')
				.onClick(async () => {
					// Check if timeline or tree canvas
					const isTimeline = await checkTimelineCanvas();
					if (isTimeline) {
						await regenerateTimelineCanvas(plugin, file);
					} else {
						const leaf = plugin.app.workspace.getLeaf(false);
						await leaf.openFile(file);
						await new Promise(resolve => window.setTimeout(resolve, 100));
						new RegenerateOptionsModal(plugin.app, plugin, file).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Show tree statistics')
				.setIcon('bar-chart')
				.onClick(() => {
					new TreeStatisticsModal(plugin.app, file).open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Customize canvas styles')
				.setIcon('layout')
				.onClick(async () => {
					// Check if timeline or tree canvas
					const isTimeline = await checkTimelineCanvas();
					if (isTimeline) {
						const { TimelineStyleModal } = await import('../events/ui/timeline-style-modal');
						new TimelineStyleModal(plugin.app, plugin, file).open();
					} else {
						const { CanvasStyleModal } = await import('../ui/canvas-style-modal');
						new CanvasStyleModal(plugin.app, plugin, file).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in Family Chart')
				.setIcon('git-fork')
				.onClick(async () => {
					await openCanvasInFamilyChart(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export to Excalidraw')
				.setIcon('pencil')
				.onClick(async () => {
					await exportCanvasToExcalidraw(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export as PNG')
				.setIcon('image')
				.onClick(async () => {
					await exportCanvasAsImage(plugin, file, 'png');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export as SVG')
				.setIcon('file-code')
				.onClick(async () => {
					await exportCanvasAsImage(plugin, file, 'svg');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export as PDF')
				.setIcon('file-text')
				.onClick(async () => {
					await exportCanvasAsImage(plugin, file, 'pdf');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Split canvas wizard')
				.setIcon('layers')
				.onClick(() => {
					new SplitWizardModal(plugin.app, plugin.settings, plugin.folderFilter ?? undefined).open();
				});
		});
	}
}

/**
 * Build context menu items for person notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildPersonContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	cache: CachedMetadata | null,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('git-fork')
				.setSubmenu();

			// Edit person
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit person')
					.setIcon('edit')
					.onClick(() => {
						plugin.openEditPersonModal(file);
					});
			});

			// Show journey on map
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Show journey on map')
					.setIcon('route')
					.onClick(() => {
						const cache = plugin.app.metadataCache.getFileCache(file);
						const crId = cache?.frontmatter?.cr_id;
						const personName = cache?.frontmatter?.name || file.basename;
						if (crId) {
							const leaves = plugin.app.workspace.getLeavesOfType('canvas-roots-map');
							if (leaves.length > 0) {
								void plugin.app.workspace.revealLeaf(leaves[0]);
								const mapView = leaves[0].view as import('../maps/map-view').MapView;
								mapView.enterJourneyModeForPerson(crId, personName);
							} else {
								void plugin.app.workspace.getLeaf('tab').setViewState({
									type: 'canvas-roots-map',
									active: true
								}).then(() => {
									window.setTimeout(() => {
										const newLeaves = plugin.app.workspace.getLeavesOfType('canvas-roots-map');
										if (newLeaves.length > 0) {
											const mapView = newLeaves[0].view as import('../maps/map-view').MapView;
											mapView.enterJourneyModeForPerson(crId, personName);
										}
									}, 1000);
								});
							}
						}
					});
			});

			// Show on calendar
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Show on calendar')
					.setIcon('calendar')
					.onClick(() => {
						const cache = plugin.app.metadataCache.getFileCache(file);
						const birthDate = cache?.frontmatter?.birth_date || cache?.frontmatter?.birthDate;
						// Parse year and month from birth date
						let month = new Date().getMonth();
						let year = new Date().getFullYear();
						if (birthDate) {
							const dateStr = String(birthDate);
							const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})/);
							if (isoMatch) {
								year = parseInt(isoMatch[1]);
								month = parseInt(isoMatch[2]) - 1; // 0-indexed
							}
						}
						const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
						if (leaves.length > 0) {
							void plugin.app.workspace.revealLeaf(leaves[0]);
							const calView = leaves[0].view as import('../calendar/calendar-view').CalendarView;
							calView.navigateToDate(month, year);
						} else {
							void plugin.activateCalendarView().then(() => {
								window.setTimeout(() => {
									const newLeaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
									if (newLeaves.length > 0) {
										const calView = newLeaves[0].view as import('../calendar/calendar-view').CalendarView;
										calView.navigateToDate(month, year);
									}
								}, 500);
							});
						}
					});
			});

			// Generate report (#372)
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Generate report')
					.setIcon('file-text')
					.onClick(() => {
						const cache = plugin.app.metadataCache.getFileCache(file);
						const crId = cache?.frontmatter?.cr_id;
						const personName = cache?.frontmatter?.name || file.basename;
						if (crId) {
							void import('../reports/ui/report-wizard-modal').then(({ ReportWizardModal }) => {
								new ReportWizardModal(plugin, { personCrId: crId, personName }).open();
							});
						}
					});
			});

			// Manage memberships (#490) - person-side affordance for ManageOrganizationMembersModal
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Manage memberships...')
					.setIcon('users')
					.onClick(() => {
						void openManageMembershipsForPerson(plugin, file);
					});
			});

			// Relationships submenu (adding relationships, validation, calculation)
			submenu.addItem((subItem) => {
				const relationshipSubmenu: Menu = subItem
					.setTitle('Relationships')
					.setIcon('users')
					.setSubmenu();

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add father')
						.setIcon('user')
						.onClick(() => {
							// Build context for inline creation
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const directory = file.parent?.path || '';

							const createContext: RelationshipContext = {
								relationshipType: 'father',
								suggestedSex: 'male',
								parentCrId: crId,
								directory: directory
							};

							const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
								void (async () => {
									const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
									await relationshipMgr.addParentRelationship(
										file,
										selectedPerson.file,
										'father',
										selectedPerson.crId
									);
								})();
							}, {
								title: 'Select father',
								createContext: createContext,
								onCreateNew: () => {
									// Callback signals inline creation support
								},
								plugin: plugin
							});
							picker.open();
						});
				});

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add mother')
						.setIcon('user')
						.onClick(() => {
							// Build context for inline creation
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const directory = file.parent?.path || '';

							const createContext: RelationshipContext = {
								relationshipType: 'mother',
								suggestedSex: 'female',
								parentCrId: crId,
								directory: directory
							};

							const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
								void (async () => {
									const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
									await relationshipMgr.addParentRelationship(
										file,
										selectedPerson.file,
										'mother',
										selectedPerson.crId
									);
								})();
							}, {
								title: 'Select mother',
								createContext: createContext,
								onCreateNew: () => {
									// Callback signals inline creation support
								},
								plugin: plugin
							});
							picker.open();
						});
				});

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add spouse')
						.setIcon('heart')
						.onClick(() => {
							// Build context for inline creation
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const currentSex = cache?.frontmatter?.sex;
							const directory = file.parent?.path || '';

							// Suggest opposite sex if current person's sex is known
							let suggestedSex: 'male' | 'female' | undefined;
							if (currentSex === 'male' || currentSex === 'm') {
								suggestedSex = 'female';
							} else if (currentSex === 'female' || currentSex === 'f') {
								suggestedSex = 'male';
							}

							const createContext: RelationshipContext = {
								relationshipType: 'spouse',
								suggestedSex: suggestedSex,
								parentCrId: crId,
								directory: directory
							};

							const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
								void (async () => {
									const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
									await relationshipMgr.addSpouseRelationship(file, selectedPerson.file, selectedPerson.crId);
								})();
							}, {
								title: 'Select spouse',
								createContext: createContext,
								onCreateNew: () => {
									// Callback signals inline creation support
								},
								plugin: plugin
							});
							picker.open();
						});
				});

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add child')
						.setIcon('baby')
						.onClick(() => {
							// Build context for inline creation
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const directory = file.parent?.path || '';

							const createContext: RelationshipContext = {
								relationshipType: 'child',
								suggestedSex: undefined, // No sex suggestion for children
								parentCrId: crId,
								directory: directory
							};

							const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
								void (async () => {
									const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
									await relationshipMgr.addChildRelationship(file, selectedPerson.file, selectedPerson.crId);
								})();
							}, {
								title: 'Select child',
								createContext: createContext,
								onCreateNew: () => {
									// Callback signals inline creation support
								},
								plugin: plugin
							});
							picker.open();
						});
				});

				relationshipSubmenu.addSeparator();

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add custom relationship...')
						.setIcon('link-2')
						.onClick(() => {
							new AddRelationshipModal(plugin.app, plugin, file).open();
						});
				});

				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Add organization membership...')
						.setIcon('building')
						.onClick(async () => {
							const { AddMembershipModal } = await import('../organizations/ui/add-membership-modal');
							new AddMembershipModal(plugin.app, plugin, file, () => {
								new Notice('Membership added');
							}).open();
						});
				});

				relationshipSubmenu.addSeparator();

				// Validate relationships
				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Validate relationships')
						.setIcon('shield-check')
						.onClick(async () => {
							const validator = new RelationshipValidator(plugin.app);
							if (plugin.folderFilter) {
								validator.setFolderFilter(plugin.folderFilter);
							}
							if (plugin.personIndex) {
								validator.setPersonIndex(plugin.personIndex);
							}
							const result = await validator.validatePersonNote(file);
							new ValidationResultsModal(plugin.app, result).open();
						});
				});

				// Calculate relationship
				relationshipSubmenu.addItem((relItem) => {
					relItem
						.setTitle('Calculate relationship...')
						.setIcon('git-compare')
						.onClick(() => {
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const personName = cache?.frontmatter?.name || file.basename;
							if (crId) {
								const modal = new RelationshipCalculatorModal(plugin.app, plugin.settings);
								modal.openWithPersonA({
									name: personName,
									crId: crId,
									birthDate: cache?.frontmatter?.born,
									deathDate: cache?.frontmatter?.died,
									sex: cache?.frontmatter?.sex || cache?.frontmatter?.gender,
									file: file
								});
							}
						});
				});
			});

			// Open in family chart
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open in Family Chart')
					.setIcon('git-fork')
					.onClick(async () => {
						const cache = plugin.app.metadataCache.getFileCache(file);
						const crId = cache?.frontmatter?.cr_id;
						if (crId) {
							await plugin.activateFamilyChartView(crId);
						} else {
							new Notice('Could not find cr_id for this person note');
						}
					});
			});

			// Open profile
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open profile')
					.setIcon('id-card')
					.onClick(async () => {
						await plugin.activateProfileView(file);
					});
			});

			// Generate visual tree (opens wizard with person pre-selected)
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Generate visual tree')
					.setIcon('network')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openWithPerson(file);
					});
			});

			submenu.addSeparator();

			// Events submenu
			submenu.addItem((subItem) => {
				const eventsSubmenu: Menu = subItem
					.setTitle('Events')
					.setIcon('calendar')
					.setSubmenu();

				eventsSubmenu.addItem((evItem) => {
					evItem
						.setTitle('Create event for this person')
						.setIcon('calendar-plus')
						.onClick(async () => {
							const eventService = plugin.getEventService();
							if (eventService) {
								const cache = plugin.app.metadataCache.getFileCache(file);
								const personName = cache?.frontmatter?.name || file.basename;
								const crId = cache?.frontmatter?.cr_id;
								const { CreateEventModal } = await import('../events/ui/create-event-modal');
								new CreateEventModal(
									plugin.app,
									eventService,
									plugin.settings,
									{
										initialPerson: { name: personName, crId: crId, basename: file.basename }
									}
								).open();
							}
						});
				});

				eventsSubmenu.addItem((evItem) => {
					evItem
						.setTitle('Link to existing event')
						.setIcon('calendar-search')
						.onClick(async () => {
							const { EventPickerModal } = await import('../events/ui/event-picker-modal');
							new EventPickerModal(plugin.app, plugin, {
								onSelect: async (event) => {
									const cache = plugin.app.metadataCache.getFileCache(file);
									const personName = cache?.frontmatter?.name || file.basename;
									await linkPersonToEvent(plugin, file, personName, event);
								},
								allowCreate: false
							}).open();
						});
				});

				eventsSubmenu.addItem((evItem) => {
					evItem
						.setTitle('Export timeline to Canvas')
						.setIcon('layout')
						.onClick(async () => {
							await exportPersonTimelineFromFile(plugin, file, 'canvas');
						});
				});

				eventsSubmenu.addItem((evItem) => {
					evItem
						.setTitle('Export timeline to Excalidraw')
						.setIcon('pencil')
						.onClick(async () => {
							await exportPersonTimelineFromFile(plugin, file, 'excalidraw');
						});
				});
			});

			// Media submenu
			submenu.addItem((subItem) => {
				const mediaSubmenu: Menu = subItem
					.setTitle('Media')
					.setIcon('image')
					.setSubmenu();

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Link media...')
						.setIcon('image-plus')
						.onClick(() => {
							const personName = cache?.frontmatter?.name || file.basename;
							plugin.openLinkMediaModal(file, 'person', personName);
						});
				});

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Manage media...')
						.setIcon('settings')
						.onClick(() => {
							const personName = cache?.frontmatter?.name || file.basename;
							openManageMediaModal(plugin, file, 'person', personName);
						});
				});
			});

			// Add source
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add source...')
					.setIcon('archive')
					.onClick(() => {
						addSourceToPersonNote(plugin, file);
					});
			});

			submenu.addSeparator();

			// Mark as root person
			submenu.addItem((subItem) => {
				const cache = plugin.app.metadataCache.getFileCache(file);
				const isRootPerson = cache?.frontmatter?.root_person === true;
				subItem
					.setTitle(isRootPerson ? 'Unmark as root person' : 'Mark as root person')
					.setIcon('crown')
					.onClick(async () => {
						await toggleRootPerson(plugin, file);
					});
			});

			// Reference numbering submenu
			submenu.addItem((subItem) => {
				const refNumberSubmenu: Menu = subItem
					.setTitle('Assign reference numbers')
					.setIcon('hash')
					.setSubmenu();

				refNumberSubmenu.addItem((numItem) => {
					numItem
						.setTitle('Ahnentafel (ancestors)')
						.setIcon('arrow-up')
						.onClick(async () => {
							await assignReferenceNumbersFromPerson(plugin, file, 'ahnentafel');
						});
				});

				refNumberSubmenu.addItem((numItem) => {
					numItem
						.setTitle("d'Aboville (descendants)")
						.setIcon('arrow-down')
						.onClick(async () => {
							await assignReferenceNumbersFromPerson(plugin, file, 'daboville');
						});
				});

				refNumberSubmenu.addItem((numItem) => {
					numItem
						.setTitle('Henry (descendants)')
						.setIcon('arrow-down')
						.onClick(async () => {
							await assignReferenceNumbersFromPerson(plugin, file, 'henry');
						});
				});

				refNumberSubmenu.addItem((numItem) => {
					numItem
						.setTitle('Generation (all relatives)')
						.setIcon('users')
						.onClick(async () => {
							await assignReferenceNumbersFromPerson(plugin, file, 'generation');
						});
				});
			});

			// Lineage tracking submenu
			submenu.addItem((subItem) => {
				const lineageSubmenu: Menu = subItem
					.setTitle('Assign lineage')
					.setIcon('git-branch')
					.setSubmenu();

				lineageSubmenu.addItem((linItem) => {
					linItem
						.setTitle('All descendants')
						.setIcon('users')
						.onClick(async () => {
							await assignLineageFromPerson(plugin, file, 'all');
						});
				});

				lineageSubmenu.addItem((linItem) => {
					linItem
						.setTitle('Patrilineal (father\'s line)')
						.setIcon('arrow-down')
						.onClick(async () => {
							await assignLineageFromPerson(plugin, file, 'patrilineal');
						});
				});

				lineageSubmenu.addItem((linItem) => {
					linItem
						.setTitle('Matrilineal (mother\'s line)')
						.setIcon('arrow-down')
						.onClick(async () => {
							await assignLineageFromPerson(plugin, file, 'matrilineal');
						});
				});
			});

			// More submenu - less commonly used actions
			submenu.addItem((subItem) => {
				const moreSubmenu: Menu = subItem
					.setTitle('More')
					.setIcon('more-horizontal')
					.setSubmenu();

				// Find on canvas
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Find on canvas')
						.setIcon('search')
						.onClick(() => {
							const cache = plugin.app.metadataCache.getFileCache(file);
							const crId = cache?.frontmatter?.cr_id;
							const personName = cache?.frontmatter?.name || file.basename;
							if (crId) {
								new FindOnCanvasModal(plugin.app, personName, crId).open();
							}
						});
				});

				// Open in map view
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Open in map view')
						.setIcon('map')
						.onClick(async () => {
							await plugin.activateMapView();
						});
				});

				moreSubmenu.addSeparator();

				// Set group name
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Set group name')
						.setIcon('tag')
						.onClick(async () => {
							await promptSetCollectionName(plugin, file);
						});
				});

				// Set collection
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Set collection')
						.setIcon('folder')
						.onClick(async () => {
							await promptSetCollection(plugin, file);
						});
				});

				// Insert dynamic blocks
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Insert dynamic blocks')
						.setIcon('layout-template')
						.onClick(async () => {
							await plugin.insertDynamicBlocks([file]);
						});
				});

				// Create place notes from references
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Create place notes...')
						.setIcon('map-pin')
						.onClick(async () => {
							await showCreatePlaceNotesForPerson(plugin, file);
						});
				});

				moreSubmenu.addSeparator();

				// Validate against schemas
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Validate against schemas')
						.setIcon('clipboard-check')
						.onClick(async () => {
							const schemaService = new SchemaService(plugin);
							const validationService = new ValidationService(plugin, schemaService);

							const results = await validationService.validatePerson(file);

							if (results.length === 0) {
								new Notice('No schemas apply to this person.');
								return;
							}

							const errors = results.reduce((sum, r) => sum + r.errors.length, 0);
							const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

							if (errors === 0 && warnings === 0) {
								new Notice(`✓ Validated against ${results.length} schema${results.length > 1 ? 's' : ''} - all passed`);
							} else {
								new Notice(`Schema validation: ${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}`);
								// Open schemas tab to show details
								const modal = new ControlCenterModal(plugin.app, plugin);
								modal.openToTab('schemas');
							}
						});
				});

				// Add essential properties submenu
				moreSubmenu.addItem((moreItem) => {
					const propsSubmenu: Menu = moreItem
						.setTitle('Add essential properties')
						.setIcon('file-plus')
						.setSubmenu();

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Add essential person properties')
							.setIcon('user')
							.onClick(async () => {
								await addEssentialPersonProperties(plugin, [file]);
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Add essential place properties')
							.setIcon('map-pin')
							.onClick(async () => {
								await addEssentialPlaceProperties(plugin, [file]);
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Add essential source properties')
							.setIcon('archive')
							.onClick(async () => {
								await addEssentialSourceProperties(plugin, [file]);
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Add essential universe properties')
							.setIcon('globe')
							.onClick(async () => {
								await addEssentialUniverseProperties(plugin, [file]);
							});
					});
				});

				// Add cr_id only
				moreSubmenu.addItem((moreItem) => {
					moreItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, [file]);
						});
				});
			});
		});
	} else {
		// Mobile: flat menu with prefix
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Generate visual tree')
				.setIcon('git-fork')
				.onClick(() => {
					const modal = new ControlCenterModal(plugin.app, plugin);
					modal.openWithPerson(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit person')
				.setIcon('edit')
				.onClick(() => {
					plugin.openEditPersonModal(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open profile')
				.setIcon('id-card')
				.onClick(async () => {
					await plugin.activateProfileView(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Manage memberships...')
				.setIcon('users')
				.onClick(() => {
					void openManageMembershipsForPerson(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add parent')
				.setIcon('user')
				.onClick(() => {
					const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
						void (async () => {
							const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
							const parentType = await promptParentType(plugin);
							if (parentType) {
								await relationshipMgr.addParentRelationship(
									file,
									selectedPerson.file,
									parentType,
									selectedPerson.crId
								);
							}
						})();
					});
					picker.open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add spouse')
				.setIcon('heart')
				.onClick(() => {
					const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
						void (async () => {
							const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
							await relationshipMgr.addSpouseRelationship(file, selectedPerson.file, selectedPerson.crId);
						})();
					});
					picker.open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add child')
				.setIcon('baby')
				.onClick(() => {
					const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
						void (async () => {
							const relationshipMgr = new RelationshipManager(plugin.app, plugin.relationshipHistory);
							await relationshipMgr.addChildRelationship(file, selectedPerson.file, selectedPerson.crId);
						})();
					});
					picker.open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Validate relationships')
				.setIcon('shield-check')
				.onClick(async () => {
					const validator = new RelationshipValidator(plugin.app);
					if (plugin.folderFilter) {
						validator.setFolderFilter(plugin.folderFilter);
					}
					if (plugin.personIndex) {
						validator.setPersonIndex(plugin.personIndex);
					}
					const result = await validator.validatePersonNote(file);
					new ValidationResultsModal(plugin.app, result).open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Find on canvas')
				.setIcon('search')
				.onClick(() => {
					const cache = plugin.app.metadataCache.getFileCache(file);
					const crId = cache?.frontmatter?.cr_id;
					const personName = cache?.frontmatter?.name || file.basename;
					if (crId) {
						new FindOnCanvasModal(plugin.app, personName, crId).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in map view')
				.setIcon('map')
				.onClick(async () => {
					await plugin.activateMapView();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in Family Chart')
				.setIcon('git-fork')
				.onClick(async () => {
					const cache = plugin.app.metadataCache.getFileCache(file);
					const crId = cache?.frontmatter?.cr_id;
					if (crId) {
						await plugin.activateFamilyChartView(crId);
					} else {
						new Notice('Could not find cr_id for this person note');
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Calculate relationship...')
				.setIcon('git-compare')
				.onClick(() => {
					const cache = plugin.app.metadataCache.getFileCache(file);
					const crId = cache?.frontmatter?.cr_id;
					const personName = cache?.frontmatter?.name || file.basename;
					if (crId) {
						const modal = new RelationshipCalculatorModal(plugin.app, plugin.settings);
						modal.openWithPersonA({
							name: personName,
							crId: crId,
							birthDate: cache?.frontmatter?.born,
							deathDate: cache?.frontmatter?.died,
							sex: cache?.frontmatter?.sex || cache?.frontmatter?.gender,
							file: file
						});
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Set group name')
				.setIcon('tag')
				.onClick(async () => {
					await promptSetCollectionName(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Set collection')
				.setIcon('folder')
				.onClick(async () => {
					await promptSetCollection(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add source...')
				.setIcon('archive')
				.onClick(() => {
					addSourceToPersonNote(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Link media...')
				.setIcon('image-plus')
				.onClick(() => {
					const personName = cache?.frontmatter?.name || file.basename;
					plugin.openLinkMediaModal(file, 'person', personName);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Manage media...')
				.setIcon('settings')
				.onClick(() => {
					const personName = cache?.frontmatter?.name || file.basename;
					openManageMediaModal(plugin, file, 'person', personName);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Insert dynamic blocks')
				.setIcon('layout-template')
				.onClick(async () => {
					await plugin.insertDynamicBlocks([file]);
				});
		});

		// Events actions (mobile - flat menu)
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Create event')
				.setIcon('calendar-plus')
				.onClick(async () => {
					const eventService = plugin.getEventService();
					if (eventService) {
						const cache = plugin.app.metadataCache.getFileCache(file);
						const personName = cache?.frontmatter?.name || file.basename;
						const crId = cache?.frontmatter?.cr_id;
						const { CreateEventModal } = await import('../events/ui/create-event-modal');
						new CreateEventModal(
							plugin.app,
							eventService,
							plugin.settings,
							{
								initialPerson: { name: personName, crId: crId, basename: file.basename }
							}
						).open();
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Link to existing event')
				.setIcon('calendar-search')
				.onClick(async () => {
					const cache = plugin.app.metadataCache.getFileCache(file);
					const personName = cache?.frontmatter?.name || file.basename;
					const { EventPickerModal } = await import('../events/ui/event-picker-modal');
					new EventPickerModal(plugin.app, plugin, {
						onSelect: async (event) => {
							await linkPersonToEvent(plugin, file, personName, event);
						},
						allowCreate: false
					}).open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export timeline to Canvas')
				.setIcon('layout')
				.onClick(async () => {
					await exportPersonTimelineFromFile(plugin, file, 'canvas');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Export timeline to Excalidraw')
				.setIcon('pencil')
				.onClick(async () => {
					await exportPersonTimelineFromFile(plugin, file, 'excalidraw');
				});
		});

		menu.addItem((item) => {
			const cache = plugin.app.metadataCache.getFileCache(file);
			const isRootPerson = cache?.frontmatter?.root_person === true;
			item
				.setTitle(isRootPerson ? 'Charted Roots: Unmark as root person' : 'Charted Roots: Mark as root person')
				.setIcon('crown')
				.onClick(async () => {
					await toggleRootPerson(plugin, file);
				});
		});

		// Reference numbering (mobile - flat menu)
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign Ahnentafel numbers')
				.setIcon('hash')
				.onClick(async () => {
					await assignReferenceNumbersFromPerson(plugin, file, 'ahnentafel');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle("Charted Roots: Assign d'Aboville numbers")
				.setIcon('hash')
				.onClick(async () => {
					await assignReferenceNumbersFromPerson(plugin, file, 'daboville');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign Henry numbers')
				.setIcon('hash')
				.onClick(async () => {
					await assignReferenceNumbersFromPerson(plugin, file, 'henry');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign generation numbers')
				.setIcon('hash')
				.onClick(async () => {
					await assignReferenceNumbersFromPerson(plugin, file, 'generation');
				});
		});

		// Lineage tracking (mobile - flat menu)
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign lineage (all)')
				.setIcon('git-branch')
				.onClick(async () => {
					await assignLineageFromPerson(plugin, file, 'all');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign lineage (patrilineal)')
				.setIcon('git-branch')
				.onClick(async () => {
					await assignLineageFromPerson(plugin, file, 'patrilineal');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Assign lineage (matrilineal)')
				.setIcon('git-branch')
				.onClick(async () => {
					await assignLineageFromPerson(plugin, file, 'matrilineal');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Create place notes...')
				.setIcon('map-pin')
				.onClick(async () => {
					await showCreatePlaceNotesForPerson(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential person properties')
				.setIcon('user')
				.onClick(async () => {
					await addEssentialPersonProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential place properties')
				.setIcon('map-pin')
				.onClick(async () => {
					await addEssentialPlaceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential source properties')
				.setIcon('archive')
				.onClick(async () => {
					await addEssentialSourceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

/**
 * Build context menu items for folders.
 * Handles both desktop (submenu) and mobile (flat) variants,
 * with different options depending on the folder type.
 */
function buildFolderContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFolder,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	// Determine folder type
	const isPeopleFolder = file.path === plugin.settings.peopleFolder;
	const isPlacesFolder = file.path === plugin.settings.placesFolder;
	const isUniversesFolder = file.path === plugin.settings.universesFolder;
	const isSourcesFolder = file.path === plugin.settings.sourcesFolder;
	const isEventsFolder = file.path === plugin.settings.eventsFolder;
	const isOrganizationsFolder = file.path === plugin.settings.organizationsFolder;
	const isNotesFolder = file.path === plugin.settings.notesFolder;

	// Check for subfolders within People folder (for Create person action)
	const isPeopleSubfolder = !isPeopleFolder &&
		plugin.settings.peopleFolder &&
		file.path.startsWith(plugin.settings.peopleFolder + '/');

	// Check for subfolders within Places folder (for Create place action)
	const isPlacesSubfolder = !isPlacesFolder &&
		plugin.settings.placesFolder &&
		file.path.startsWith(plugin.settings.placesFolder + '/');

	// Helper to get files in folder
	const getFilesInFolder = () => plugin.app.vault.getMarkdownFiles()
		.filter(f => f.path.startsWith(file.path + '/'));

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('git-fork')
				.setSubmenu();

			// === PEOPLE FOLDER ===
			if (isPeopleFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create person')
						.setIcon('user-plus')
						.onClick(() => {
							const modal = new CreatePersonModal(plugin.app, {
								directory: file.path,
								familyGraph: plugin.createFamilyGraphService(),
								propertyAliases: plugin.settings.propertyAliases,
								placeGraph: plugin.createPlaceGraphService(),
								settings: plugin.settings,
								plugin: plugin
							});
							modal.open();
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create family')
						.setIcon('users')
						.onClick(() => {
							void import('../ui/family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
								new FamilyCreationWizardModal(plugin.app, plugin, file.path).open();
							});
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Import GEDCOM')
						.setIcon('upload')
						.onClick(() => {
							const modal = new ControlCenterModal(plugin.app, plugin);
							modal.openToTab('gedcom');
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Export GEDCOM')
						.setIcon('download')
						.onClick(() => {
							const modal = new ControlCenterModal(plugin.app, plugin);
							modal.openToTab('gedcom');
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Scan for relationship issues')
						.setIcon('shield-alert')
						.onClick(() => {
							new FolderScanModal(plugin.app, file, plugin.personIndex ?? undefined).open();
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add essential person properties')
						.setIcon('user')
						.onClick(async () => {
							await addEssentialPersonProperties(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Insert dynamic blocks')
						.setIcon('layout-template')
						.onClick(async () => {
							await plugin.insertDynamicBlocks(getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New people base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Generate all trees')
						.setIcon('git-fork')
						.onClick(async () => {
							await plugin.generateAllTrees();
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === PEOPLE SUBFOLDER ===
			// Show "Create person" for subfolders within People folder
			else if (isPeopleSubfolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create person')
						.setIcon('user-plus')
						.onClick(() => {
							const modal = new CreatePersonModal(plugin.app, {
								directory: file.path,
								familyGraph: plugin.createFamilyGraphService(),
								propertyAliases: plugin.settings.propertyAliases,
								placeGraph: plugin.createPlaceGraphService(),
								settings: plugin.settings,
								plugin: plugin
							});
							modal.open();
						});
				});
			}

			// === PLACES SUBFOLDER ===
			// Show "Create place" for subfolders within Places folder
			else if (isPlacesSubfolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create place')
						.setIcon('map-pin-plus')
						.onClick(() => {
							new CreatePlaceModal(plugin.app, {
								directory: file.path,
								familyGraph: plugin.createFamilyGraphService(),
								placeGraph: plugin.createPlaceGraphService(),
								settings: plugin.settings,
								plugin: plugin
							}).open();
						});
				});
			}

			// === PLACES FOLDER ===
			else if (isPlacesFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create place')
						.setIcon('map-pin-plus')
						.onClick(() => {
							new CreatePlaceModal(plugin.app, {
								directory: file.path,
								familyGraph: plugin.createFamilyGraphService(),
								placeGraph: plugin.createPlaceGraphService(),
								settings: plugin.settings,
								plugin: plugin
							}).open();
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add essential place properties')
						.setIcon('map-pin')
						.onClick(async () => {
							await addEssentialPlaceProperties(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New places base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createPlacesBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === UNIVERSES FOLDER ===
			else if (isUniversesFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add essential universe properties')
						.setIcon('globe')
						.onClick(async () => {
							await addEssentialUniverseProperties(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New universes base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createUniversesBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === SOURCES FOLDER ===
			else if (isSourcesFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create source')
						.setIcon('file-plus')
						.onClick(() => {
							new CreateSourceModal(plugin.app, plugin, {
								onSuccess: () => {}
							}).open();
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add essential source properties')
						.setIcon('archive')
						.onClick(async () => {
							await addEssentialSourceProperties(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New sources base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createSourcesBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === EVENTS FOLDER ===
			else if (isEventsFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Create event')
						.setIcon('calendar-plus')
						.onClick(() => {
							const eventService = plugin.getEventService();
							if (eventService) {
								new CreateEventModal(plugin.app, eventService, plugin.settings, {
									plugin: plugin
								}).open();
							}
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add essential event properties')
						.setIcon('calendar')
						.onClick(async () => {
							await addEssentialEventProperties(plugin, getFilesInFolder());
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New events base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createEventsBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === ORGANIZATIONS FOLDER ===
			else if (isOrganizationsFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New organizations base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createOrganizationsBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === NOTES FOLDER (Phase 4 Gramps Notes) ===
			else if (isNotesFolder) {
				submenu.addItem((subItem) => {
					subItem
						.setTitle('New Charted Roots note')
						.setIcon('file-plus')
						.onClick(async () => {
							const { CreateNoteModal } = await import('../ui/create-note-modal');
							new CreateNoteModal(plugin.app, plugin).open();
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				submenu.addItem((subItem) => {
					subItem
						.setTitle('New notes base from template')
						.setIcon('table')
						.onClick(async () => {
							await plugin.createNotesBaseTemplate(file);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}

			// === GENERIC/UNCONFIGURED FOLDER ===
			else {
				// Set as folder type options
				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as people folder')
						.setIcon('users')
						.onClick(async () => {
							plugin.settings.peopleFolder = file.path;
							await plugin.saveSettings();
							new Notice(`People folder set to: ${file.path}`);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as places folder')
						.setIcon('map-pin')
						.onClick(async () => {
							plugin.settings.placesFolder = file.path;
							await plugin.saveSettings();
							new Notice(`Places folder set to: ${file.path}`);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as universes folder')
						.setIcon('globe')
						.onClick(async () => {
							plugin.settings.universesFolder = file.path;
							await plugin.saveSettings();
							new Notice(`Universes folder set to: ${file.path}`);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as sources folder')
						.setIcon('archive')
						.onClick(async () => {
							plugin.settings.sourcesFolder = file.path;
							await plugin.saveSettings();
							new Notice(`Sources folder set to: ${file.path}`);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as events folder')
						.setIcon('calendar')
						.onClick(async () => {
							plugin.settings.eventsFolder = file.path;
							await plugin.saveSettings();
							new Notice(`Events folder set to: ${file.path}`);
						});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Set as organizations folder')
						.setIcon('building')
						.onClick(async () => {
							plugin.settings.organizationsFolder = file.path;
							await plugin.saveSettings();
							new Notice(`Organizations folder set to: ${file.path}`);
						});
				});

				submenu.addSeparator();

				// Add essential properties submenu
				submenu.addItem((subItem) => {
					const propsSubmenu: Menu = subItem
						.setTitle('Add essential properties')
						.setIcon('file-plus')
						.setSubmenu();

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Person properties')
							.setIcon('user')
							.onClick(async () => {
								await addEssentialPersonProperties(plugin, getFilesInFolder());
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Place properties')
							.setIcon('map-pin')
							.onClick(async () => {
								await addEssentialPlaceProperties(plugin, getFilesInFolder());
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Universe properties')
							.setIcon('globe')
							.onClick(async () => {
								await addEssentialUniverseProperties(plugin, getFilesInFolder());
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Source properties')
							.setIcon('archive')
							.onClick(async () => {
								await addEssentialSourceProperties(plugin, getFilesInFolder());
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Event properties')
							.setIcon('calendar')
							.onClick(async () => {
								await addEssentialEventProperties(plugin, getFilesInFolder());
							});
					});

					propsSubmenu.addItem((propItem) => {
						propItem
							.setTitle('Map properties')
							.setIcon('map')
							.onClick(async () => {
								await addEssentialMapProperties(plugin, getFilesInFolder());
							});
					});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Add cr_id')
						.setIcon('key')
						.onClick(async () => {
							await addCrId(plugin, getFilesInFolder());
						});
				});

				submenu.addSeparator();

				// Bases submenu
				submenu.addItem((subItem) => {
					const basesSubmenu: Menu = subItem
						.setTitle('New base from template')
						.setIcon('table')
						.setSubmenu();

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('People base')
							.setIcon('users')
							.onClick(async () => {
								await plugin.createBaseTemplate(file);
							});
					});

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('Places base')
							.setIcon('map-pin')
							.onClick(async () => {
								await plugin.createPlacesBaseTemplate(file);
							});
					});

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('Universes base')
							.setIcon('globe')
							.onClick(async () => {
								await plugin.createUniversesBaseTemplate(file);
							});
					});

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('Sources base')
							.setIcon('archive')
							.onClick(async () => {
								await plugin.createSourcesBaseTemplate(file);
							});
					});

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('Events base')
							.setIcon('calendar')
							.onClick(async () => {
								await plugin.createEventsBaseTemplate(file);
							});
					});

					basesSubmenu.addItem((baseItem) => {
						baseItem
							.setTitle('Organizations base')
							.setIcon('building')
							.onClick(async () => {
								await plugin.createOrganizationsBaseTemplate(file);
							});
					});
				});

				submenu.addItem((subItem) => {
					subItem
						.setTitle('Show folder statistics')
						.setIcon('bar-chart-2')
						.onClick(() => {
							showFolderStatistics(plugin, file);
						});
				});
			}
		});
	} else {
		// Mobile: flat menu with prefix - type-specific actions

		// === PEOPLE FOLDER (MOBILE) ===
		if (isPeopleFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Create person')
					.setIcon('user-plus')
					.onClick(() => {
						const modal = new CreatePersonModal(plugin.app, {
							directory: file.path,
							familyGraph: plugin.createFamilyGraphService(),
							propertyAliases: plugin.settings.propertyAliases,
							placeGraph: plugin.createPlaceGraphService(),
							settings: plugin.settings,
							plugin: plugin
						});
						modal.open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Create family')
					.setIcon('users')
					.onClick(() => {
						void import('../ui/family-creation-wizard').then(({ FamilyCreationWizardModal }) => {
							new FamilyCreationWizardModal(plugin.app, plugin, file.path).open();
						});
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Import GEDCOM')
					.setIcon('upload')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('gedcom');
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Export GEDCOM')
					.setIcon('download')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('gedcom');
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Scan for relationship issues')
					.setIcon('shield-alert')
					.onClick(() => {
						new FolderScanModal(plugin.app, file, plugin.personIndex ?? undefined).open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Add essential person properties')
					.setIcon('user')
					.onClick(async () => {
						await addEssentialPersonProperties(plugin, getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Insert dynamic blocks')
					.setIcon('layout-template')
					.onClick(async () => {
						await plugin.insertDynamicBlocks(getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Generate all trees')
					.setIcon('git-fork')
					.onClick(async () => {
						await plugin.generateAllTrees();
					});
			});
		}

		// === PEOPLE SUBFOLDER (MOBILE) ===
		// Show "Create person" for subfolders within People folder
		else if (isPeopleSubfolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Create person')
					.setIcon('user-plus')
					.onClick(() => {
						const modal = new CreatePersonModal(plugin.app, {
							directory: file.path,
							familyGraph: plugin.createFamilyGraphService(),
							propertyAliases: plugin.settings.propertyAliases,
							placeGraph: plugin.createPlaceGraphService(),
							settings: plugin.settings,
							plugin: plugin
						});
						modal.open();
					});
			});
		}

		// === PLACES FOLDER (MOBILE) ===
		else if (isPlacesFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Add essential place properties')
					.setIcon('map-pin')
					.onClick(async () => {
						await addEssentialPlaceProperties(plugin, getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New places base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createPlacesBaseTemplate(file);
					});
			});
		}

		// === UNIVERSES FOLDER (MOBILE) ===
		else if (isUniversesFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Add essential universe properties')
					.setIcon('globe')
					.onClick(async () => {
						await addEssentialUniverseProperties(plugin, getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New universes base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createUniversesBaseTemplate(file);
					});
			});
		}

		// === SOURCES FOLDER (MOBILE) ===
		else if (isSourcesFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Create source')
					.setIcon('file-plus')
					.onClick(() => {
						new CreateSourceModal(plugin.app, plugin, {
							onSuccess: () => {}
						}).open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Add essential source properties')
					.setIcon('archive')
					.onClick(async () => {
						await addEssentialSourceProperties(plugin, getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New sources base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createSourcesBaseTemplate(file);
					});
			});
		}

		// === EVENTS FOLDER (MOBILE) ===
		else if (isEventsFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Create event')
					.setIcon('calendar-plus')
					.onClick(() => {
						const eventService = plugin.getEventService();
						if (eventService) {
							new CreateEventModal(plugin.app, eventService, plugin.settings, {
								plugin: plugin
							}).open();
						}
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Add essential event properties')
					.setIcon('calendar')
					.onClick(async () => {
						await addEssentialEventProperties(plugin, getFilesInFolder());
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New events base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createEventsBaseTemplate(file);
					});
			});
		}

		// === ORGANIZATIONS FOLDER (MOBILE) ===
		else if (isOrganizationsFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New organizations base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createOrganizationsBaseTemplate(file);
					});
			});
		}

		// === NOTES FOLDER (MOBILE - Phase 4 Gramps Notes) ===
		else if (isNotesFolder) {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New note')
					.setIcon('file-plus')
					.onClick(async () => {
						const { CreateNoteModal } = await import('../ui/create-note-modal');
						new CreateNoteModal(plugin.app, plugin).open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: New notes base')
					.setIcon('table')
					.onClick(async () => {
						await plugin.createNotesBaseTemplate(file);
					});
			});
		}

		// === GENERIC FOLDER (MOBILE) ===
		else {
			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as people folder')
					.setIcon('users')
					.onClick(async () => {
						plugin.settings.peopleFolder = file.path;
						await plugin.saveSettings();
						new Notice(`People folder set to: ${file.path}`);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as places folder')
					.setIcon('map-pin')
					.onClick(async () => {
						plugin.settings.placesFolder = file.path;
						await plugin.saveSettings();
						new Notice(`Places folder set to: ${file.path}`);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as universes folder')
					.setIcon('globe')
					.onClick(async () => {
						plugin.settings.universesFolder = file.path;
						await plugin.saveSettings();
						new Notice(`Universes folder set to: ${file.path}`);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as sources folder')
					.setIcon('archive')
					.onClick(async () => {
						plugin.settings.sourcesFolder = file.path;
						await plugin.saveSettings();
						new Notice(`Sources folder set to: ${file.path}`);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as events folder')
					.setIcon('calendar')
					.onClick(async () => {
						plugin.settings.eventsFolder = file.path;
						await plugin.saveSettings();
						new Notice(`Events folder set to: ${file.path}`);
					});
			});

			menu.addItem((item) => {
				item
					.setTitle('Charted Roots: Set as organizations folder')
					.setIcon('building')
					.onClick(async () => {
						plugin.settings.organizationsFolder = file.path;
						await plugin.saveSettings();
						new Notice(`Organizations folder set to: ${file.path}`);
					});
			});
		}

		// Common actions for all folders (mobile)
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, getFilesInFolder());
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Show folder statistics')
				.setIcon('bar-chart-2')
				.onClick(() => {
					showFolderStatistics(plugin, file);
				});
		});
	}
}

/**
 * Build context menu items for schema notes.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildSchemaContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	fm: Record<string, unknown> | undefined,
	cache: CachedMetadata | null,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	const schemaName = typeof fm?.name === 'string' ? fm.name : file.basename;

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('clipboard-check')
				.setSubmenu();

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit schema')
					.setIcon('edit')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('schemas');
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Validate matching notes')
					.setIcon('play')
					.onClick(async () => {
						const schemaService = new SchemaService(plugin);
						const validationService = new ValidationService(plugin, schemaService);

						new Notice(`Validating notes against "${schemaName}"...`);

						try {
							const results = await validationService.validateVault();
							const schemaCrId = cache?.frontmatter?.cr_id;
							const schemaResults = results.filter(r => r.schemaCrId === schemaCrId);

							if (schemaResults.length === 0) {
								new Notice(`No notes match schema "${schemaName}"`);
							} else {
								const errors = schemaResults.filter(r => !r.isValid).length;
								new Notice(`Validated ${schemaResults.length} notes: ${schemaResults.length - errors} passed, ${errors} failed`);
							}
						} catch (error) {
							new Notice(`Validation failed: ${getErrorMessage(error)}`);
						}
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open schemas tab')
					.setIcon('external-link')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('schemas');
					});
			});
		});
	} else {
		// Mobile: flat menu for schema notes
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open schemas tab')
				.setIcon('clipboard-check')
				.onClick(() => {
					const modal = new ControlCenterModal(plugin.app, plugin);
					modal.openToTab('schemas');
				});
		});
	}
}

/**
 * Build context menu items for map notes.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildMapContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	fm: Record<string, unknown> | undefined,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	const mapId = fm?.map_id;
	const mapName = typeof fm?.name === 'string' ? fm.name : file.basename;

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('map')
				.setSubmenu();

			submenu.addItem((subItem) => {
				subItem
					.setTitle(`Open "${mapName}" in map view`)
					.setIcon('map')
					.onClick(async () => {
						await plugin.activateMapView(mapId);
					});
			});

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit map')
					.setIcon('edit')
					.onClick(async () => {
						const { CreateMapModal } = await import('../ui/create-map-modal');
						new CreateMapModal(plugin.app, {
							editFile: file,
							editFrontmatter: fm || {},
							propertyAliases: plugin.settings.propertyAliases
						}).open();
					});
			});

			// Draw/edit parent region (#362) — only shown for child maps
			if (fm?.parent_map) {
				submenu.addItem((subItem) => {
					const hasRegion = typeof fm?.parent_region_x === 'number';
					subItem
						.setTitle(hasRegion ? 'Edit parent region' : 'Draw parent region')
						.setIcon('square-dashed')
						.onClick(async () => {
							await openRegionDrawingForMap(plugin, file, fm);
						});
				});
			}

			submenu.addSeparator();

			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add essential map properties')
					.setIcon('globe')
					.onClick(async () => {
						await addEssentialMapProperties(plugin, [file]);
					});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});
		});
	} else {
		// Mobile: flat menu for map notes
		menu.addItem((item) => {
			item
				.setTitle(`Charted Roots: Open "${mapName}" in map view`)
				.setIcon('map')
				.onClick(async () => {
					await plugin.activateMapView(mapId);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit map')
				.setIcon('edit')
				.onClick(async () => {
					const { CreateMapModal } = await import('../ui/create-map-modal');
					new CreateMapModal(plugin.app, {
						editFile: file,
						editFrontmatter: fm || {},
						propertyAliases: plugin.settings.propertyAliases
					}).open();
				});
		});

		// Draw/edit parent region (#362) — only shown for child maps
		if (fm?.parent_map) {
			menu.addItem((item) => {
				const hasRegion = typeof fm?.parent_region_x === 'number';
				item
					.setTitle(`Charted Roots: ${hasRegion ? 'Edit parent region' : 'Draw parent region'}`)
					.setIcon('square-dashed')
					.onClick(async () => {
						await openRegionDrawingForMap(plugin, file, fm);
					});
			});
		}

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential map properties')
				.setIcon('globe')
				.onClick(async () => {
					await addEssentialMapProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

/**
 * Build context menu items for place notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildPlaceContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	fm: Record<string, unknown> | undefined,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('map-pin')
				.setSubmenu();

			// Set collection
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Set collection')
					.setIcon('folder')
					.onClick(async () => {
						await promptSetCollection(plugin, file);
					});
			});

			// Open in map view (zoom to place coordinates if available)
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open in map view')
					.setIcon('map')
					.onClick(async () => {
						// Extract coordinates from frontmatter if available
						let focusCoordinates: { lat: number; lng: number; zoom?: number } | undefined;
						if (fm?.coordinates_lat !== undefined && fm?.coordinates_long !== undefined) {
							focusCoordinates = {
								lat: Number(fm.coordinates_lat),
								lng: Number(fm.coordinates_long),
								zoom: 12
							};
						} else if (fm?.coordinates && typeof fm.coordinates === 'object') {
							// Legacy nested format
							if ((fm.coordinates as Record<string, unknown>).lat !== undefined && (fm.coordinates as Record<string, unknown>).long !== undefined) {
								focusCoordinates = {
									lat: Number((fm.coordinates as Record<string, unknown>).lat),
									lng: Number((fm.coordinates as Record<string, unknown>).long),
									zoom: 12
								};
							}
						}
						await plugin.activateMapView(undefined, false, undefined, focusCoordinates);
					});
			});

			// Edit place
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit place')
					.setIcon('edit')
					.onClick(() => {
						plugin.openEditPlaceModal(file);
					});
			});

			// Geocode place
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Geocode place')
					.setIcon('map-pin')
					.onClick(async () => {
						await geocodeSinglePlace(plugin, file);
					});
			});

			// Open profile
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open profile')
					.setIcon('id-card')
					.onClick(async () => {
						await plugin.activateProfileView(file);
					});
			});

			// Media submenu
			submenu.addItem((subItem) => {
				const mediaSubmenu: Menu = subItem
					.setTitle('Media')
					.setIcon('image')
					.setSubmenu();

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Link media...')
						.setIcon('image-plus')
						.onClick(() => {
							const placeName = typeof fm?.name === 'string' ? fm.name : file.basename;
							plugin.openLinkMediaModal(file, 'place', String(placeName));
						});
				});

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Manage media...')
						.setIcon('settings')
						.onClick(() => {
							const placeName = typeof fm?.name === 'string' ? fm.name : file.basename;
							openManageMediaModal(plugin, file, 'place', String(placeName));
						});
				});
			});

			submenu.addSeparator();

			// Add essential properties submenu
			submenu.addItem((subItem) => {
				const propsSubmenu: Menu = subItem
					.setTitle('Add essential properties')
					.setIcon('file-plus')
					.setSubmenu();

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential person properties')
						.setIcon('user')
						.onClick(async () => {
							await addEssentialPersonProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential place properties')
						.setIcon('map-pin')
						.onClick(async () => {
							await addEssentialPlaceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential source properties')
						.setIcon('archive')
						.onClick(async () => {
							await addEssentialSourceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential universe properties')
						.setIcon('globe')
						.onClick(async () => {
							await addEssentialUniverseProperties(plugin, [file]);
						});
				});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});
		});
	} else {
		// Mobile: flat menu for place notes
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Set collection')
				.setIcon('folder')
				.onClick(async () => {
					await promptSetCollection(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in map view')
				.setIcon('map')
				.onClick(async () => {
					// Extract coordinates from frontmatter if available
					let focusCoordinates: { lat: number; lng: number; zoom?: number } | undefined;
					if (fm?.coordinates_lat !== undefined && fm?.coordinates_long !== undefined) {
						focusCoordinates = {
							lat: Number(fm.coordinates_lat),
							lng: Number(fm.coordinates_long),
							zoom: 12
						};
					} else if (fm?.coordinates && typeof fm.coordinates === 'object') {
						// Legacy nested format
						if ((fm.coordinates as Record<string, unknown>).lat !== undefined && (fm.coordinates as Record<string, unknown>).long !== undefined) {
							focusCoordinates = {
								lat: Number((fm.coordinates as Record<string, unknown>).lat),
								lng: Number((fm.coordinates as Record<string, unknown>).long),
								zoom: 12
							};
						}
					}
					await plugin.activateMapView(undefined, false, undefined, focusCoordinates);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit place')
				.setIcon('edit')
				.onClick(() => {
					plugin.openEditPlaceModal(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open profile')
				.setIcon('id-card')
				.onClick(async () => {
					await plugin.activateProfileView(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Geocode place')
				.setIcon('map-pin')
				.onClick(async () => {
					await geocodeSinglePlace(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Link media...')
				.setIcon('image-plus')
				.onClick(() => {
					const placeName = typeof fm?.name === 'string' ? fm.name : file.basename;
					plugin.openLinkMediaModal(file, 'place', String(placeName));
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Manage media...')
				.setIcon('settings')
				.onClick(() => {
					const placeName = typeof fm?.name === 'string' ? fm.name : file.basename;
					openManageMediaModal(plugin, file, 'place', String(placeName));
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential person properties')
				.setIcon('user')
				.onClick(async () => {
					await addEssentialPersonProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential place properties')
				.setIcon('map-pin')
				.onClick(async () => {
					await addEssentialPlaceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential source properties')
				.setIcon('archive')
				.onClick(async () => {
					await addEssentialSourceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

/**
 * Build context menu items for source notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildSourceContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('archive')
				.setSubmenu();

			// Edit source
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit source')
					.setIcon('edit')
					.onClick(() => {
						openEditSourceModal(plugin, file);
					});
			});

			// Generate citation
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Generate citation')
					.setIcon('quote')
					.onClick(() => {
						openCitationGenerator(plugin, file);
					});
			});

			// Open in Sources tab
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open sources tab')
					.setIcon('archive')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('sources');
					});
			});

			// Open profile
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open profile')
					.setIcon('id-card')
					.onClick(async () => {
						await plugin.activateProfileView(file);
					});
			});

			// Add source roles block (#219)
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add source roles block')
					.setIcon('users')
					.onClick(async () => {
						await insertSourceRolesBlock(plugin, file);
					});
			});

			// Link to existing event
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Link to existing event')
					.setIcon('calendar-search')
					.onClick(async () => {
						const { EventPickerModal } = await import('../events/ui/event-picker-modal');
						new EventPickerModal(plugin.app, plugin, {
							onSelect: async (event) => {
								await linkSourceToEvent(plugin, file, event);
							},
							allowCreate: false
						}).open();
					});
			});

			submenu.addSeparator();

			// Add essential properties submenu
			submenu.addItem((subItem) => {
				const propsSubmenu: Menu = subItem
					.setTitle('Add essential properties')
					.setIcon('file-plus')
					.setSubmenu();

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential person properties')
						.setIcon('user')
						.onClick(async () => {
							await addEssentialPersonProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential place properties')
						.setIcon('map-pin')
						.onClick(async () => {
							await addEssentialPlaceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential source properties')
						.setIcon('archive')
						.onClick(async () => {
							await addEssentialSourceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential universe properties')
						.setIcon('globe')
						.onClick(async () => {
							await addEssentialUniverseProperties(plugin, [file]);
						});
				});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});
		});
	} else {
		// Mobile: flat menu for source notes
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit source')
				.setIcon('edit')
				.onClick(() => {
					openEditSourceModal(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Generate citation')
				.setIcon('quote')
				.onClick(() => {
					openCitationGenerator(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open sources tab')
				.setIcon('archive')
				.onClick(() => {
					const modal = new ControlCenterModal(plugin.app, plugin);
					modal.openToTab('sources');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open profile')
				.setIcon('id-card')
				.onClick(async () => {
					await plugin.activateProfileView(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add source roles block')
				.setIcon('users')
				.onClick(async () => {
					await insertSourceRolesBlock(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Link to existing event')
				.setIcon('calendar-search')
				.onClick(async () => {
					const { EventPickerModal } = await import('../events/ui/event-picker-modal');
					new EventPickerModal(plugin.app, plugin, {
						onSelect: async (event) => {
							await linkSourceToEvent(plugin, file, event);
						},
						allowCreate: false
					}).open();
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential person properties')
				.setIcon('user')
				.onClick(async () => {
					await addEssentialPersonProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential place properties')
				.setIcon('map-pin')
				.onClick(async () => {
					await addEssentialPlaceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential source properties')
				.setIcon('archive')
				.onClick(async () => {
					await addEssentialSourceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

/**
 * Build context menu items for event notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildEventContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	cache: CachedMetadata | null,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('calendar')
				.setSubmenu();

			// Open event
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open event')
					.setIcon('file')
					.onClick(() => {
						void plugin.app.workspace.getLeaf(false).openFile(file);
					});
			});

			// Open in new tab
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(() => {
						void plugin.app.workspace.getLeaf('tab').openFile(file);
					});
			});

			// Edit event
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit event')
					.setIcon('edit')
					.onClick(() => {
						plugin.openEditEventModal(file);
					});
			});

			// Open profile
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open profile')
					.setIcon('id-card')
					.onClick(async () => {
						await plugin.activateProfileView(file);
					});
			});

			// Show on calendar
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Show on calendar')
					.setIcon('calendar')
					.onClick(() => {
						const eventDate = cache?.frontmatter?.date || cache?.frontmatter?.event_date;
						let month = new Date().getMonth();
						let year = new Date().getFullYear();
						if (eventDate) {
							const dateStr = String(eventDate);
							const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})/);
							if (isoMatch) {
								year = parseInt(isoMatch[1]);
								month = parseInt(isoMatch[2]) - 1;
							}
						}
						const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
						if (leaves.length > 0) {
							void plugin.app.workspace.revealLeaf(leaves[0]);
							const calView = leaves[0].view as import('../calendar/calendar-view').CalendarView;
							calView.navigateToDate(month, year);
						} else {
							void plugin.activateCalendarView().then(() => {
								window.setTimeout(() => {
									const newLeaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_CALENDAR);
									if (newLeaves.length > 0) {
										const calView = newLeaves[0].view as import('../calendar/calendar-view').CalendarView;
										calView.navigateToDate(month, year);
									}
								}, 500);
							});
						}
					});
			});

			// Media submenu
			submenu.addItem((subItem) => {
				const mediaSubmenu: Menu = subItem
					.setTitle('Media')
					.setIcon('image')
					.setSubmenu();

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Link media...')
						.setIcon('image-plus')
						.onClick(() => {
							const eventTitle = cache?.frontmatter?.title || file.basename;
							plugin.openLinkMediaModal(file, 'event', eventTitle);
						});
				});

				mediaSubmenu.addItem((mediaItem) => {
					mediaItem
						.setTitle('Manage media...')
						.setIcon('settings')
						.onClick(() => {
							const eventTitle = cache?.frontmatter?.title || file.basename;
							openManageMediaModal(plugin, file, 'event', eventTitle);
						});
				});
			});

			submenu.addSeparator();

			// Add essential event properties
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add essential event properties')
					.setIcon('file-plus')
					.onClick(async () => {
						await addEssentialEventProperties(plugin, [file]);
					});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});

			submenu.addSeparator();

			// Delete event
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Delete event')
					.setIcon('trash')
					.onClick(async () => {
						const eventTitle = cache?.frontmatter?.title || file.basename;
						const confirmed = await confirmDeleteEvent(plugin, eventTitle);
						if (confirmed) {
							await plugin.app.fileManager.trashFile(file);
							new Notice(`Deleted event: ${eventTitle}`);
						}
					});
			});
		});
	} else {
		// Mobile: flat menu
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open event')
				.setIcon('file')
				.onClick(() => {
					void plugin.app.workspace.getLeaf(false).openFile(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in new tab')
				.setIcon('file-plus')
				.onClick(() => {
					void plugin.app.workspace.getLeaf('tab').openFile(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit event')
				.setIcon('edit')
				.onClick(() => {
					plugin.openEditEventModal(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open profile')
				.setIcon('id-card')
				.onClick(async () => {
					await plugin.activateProfileView(file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Link media...')
				.setIcon('image-plus')
				.onClick(() => {
					const eventTitle = cache?.frontmatter?.title || file.basename;
					plugin.openLinkMediaModal(file, 'event', eventTitle);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Manage media...')
				.setIcon('settings')
				.onClick(() => {
					const eventTitle = cache?.frontmatter?.title || file.basename;
					openManageMediaModal(plugin, file, 'event', eventTitle);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential event properties')
				.setIcon('file-plus')
				.onClick(async () => {
					await addEssentialEventProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Delete event')
				.setIcon('trash')
				.onClick(async () => {
					const eventTitle = cache?.frontmatter?.title || file.basename;
					const confirmed = await confirmDeleteEvent(plugin, eventTitle);
					if (confirmed) {
						await plugin.app.fileManager.trashFile(file);
						new Notice(`Deleted event: ${eventTitle}`);
					}
				});
		});
	}
}

/**
 * Build context menu items for organization notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildOrganizationContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('building')
				.setSubmenu();

			// Edit organization
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit organization')
					.setIcon('edit')
					.onClick(async () => {
						const { CreateOrganizationModal } = await import('../organizations/ui/create-organization-modal');
						const { createOrganizationService } = await import('../organizations/services/organization-service');
						const orgService = createOrganizationService(plugin);
						const org = orgService.getOrganizationByFile(file);
						if (org) {
							new CreateOrganizationModal(plugin.app, plugin, {
								onSuccess: () => {},
								editOrg: org,
								editFile: file
							}).open();
						} else {
							new Notice('Could not load organization');
						}
					});
			});

			// Manage members
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Manage members...')
					.setIcon('users')
					.onClick(async () => {
						const { ManageOrganizationMembersModal } = await import('../organizations/ui/manage-members-modal');
						const { createOrganizationService } = await import('../organizations/services/organization-service');
						const { createMembershipService } = await import('../organizations/services/membership-service');
						const orgService = createOrganizationService(plugin);
						const membershipService = createMembershipService(plugin, orgService);
						const org = orgService.getOrganizationByFile(file);
						if (org) {
							new ManageOrganizationMembersModal(plugin.app, plugin, {
								organization: org,
								organizationService: orgService,
								membershipService: membershipService
							}).open();
						} else {
							new Notice('Could not load organization');
						}
					});
			});

			// Insert members block (#268)
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Insert members block')
					.setIcon('layout-template')
					.onClick(async () => {
						await insertMembersBlock(plugin, file);
					});
			});

			// Open in Organizations tab
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open in Organizations tab')
					.setIcon('table')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('organizations');
					});
			});

			// Open profile
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open profile')
					.setIcon('id-card')
					.onClick(async () => {
						await plugin.activateProfileView(file);
					});
			});
		});
	} else {
		// Mobile: flat menu
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit organization')
				.setIcon('edit')
				.onClick(async () => {
					const { CreateOrganizationModal } = await import('../organizations/ui/create-organization-modal');
					const { createOrganizationService } = await import('../organizations/services/organization-service');
					const orgService = createOrganizationService(plugin);
					const org = orgService.getOrganizationByFile(file);
					if (org) {
						new CreateOrganizationModal(plugin.app, plugin, {
							onSuccess: () => {},
							editOrg: org,
							editFile: file
						}).open();
					} else {
						new Notice('Could not load organization');
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Manage members...')
				.setIcon('users')
				.onClick(async () => {
					const { ManageOrganizationMembersModal } = await import('../organizations/ui/manage-members-modal');
					const { createOrganizationService } = await import('../organizations/services/organization-service');
					const { createMembershipService } = await import('../organizations/services/membership-service');
					const orgService = createOrganizationService(plugin);
					const membershipService = createMembershipService(plugin, orgService);
					const org = orgService.getOrganizationByFile(file);
					if (org) {
						new ManageOrganizationMembersModal(plugin.app, plugin, {
							organization: org,
							organizationService: orgService,
							membershipService: membershipService
						}).open();
					} else {
						new Notice('Could not load organization');
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Insert members block')
				.setIcon('layout-template')
				.onClick(async () => {
					await insertMembersBlock(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open in Organizations tab')
				.setIcon('table')
				.onClick(() => {
					const modal = new ControlCenterModal(plugin.app, plugin);
					modal.openToTab('organizations');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open profile')
				.setIcon('id-card')
				.onClick(async () => {
					await plugin.activateProfileView(file);
				});
		});
	}
}

/**
 * Build context menu items for plain markdown notes without cr_id.
 * Offers options to add essential properties and cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildPlainMarkdownContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('git-fork')
				.setSubmenu();

			// Add essential properties submenu
			submenu.addItem((subItem) => {
				const propsSubmenu: Menu = subItem
					.setTitle('Add essential properties')
					.setIcon('file-plus')
					.setSubmenu();

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential person properties')
						.setIcon('user')
						.onClick(async () => {
							await addEssentialPersonProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential place properties')
						.setIcon('map-pin')
						.onClick(async () => {
							await addEssentialPlaceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential source properties')
						.setIcon('archive')
						.onClick(async () => {
							await addEssentialSourceProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential event properties')
						.setIcon('calendar')
						.onClick(async () => {
							await addEssentialEventProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential universe properties')
						.setIcon('globe')
						.onClick(async () => {
							await addEssentialUniverseProperties(plugin, [file]);
						});
				});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});
		});
	} else {
		// Mobile: flat menu
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential person properties')
				.setIcon('user')
				.onClick(async () => {
					await addEssentialPersonProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential place properties')
				.setIcon('map-pin')
				.onClick(async () => {
					await addEssentialPlaceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential source properties')
				.setIcon('archive')
				.onClick(async () => {
					await addEssentialSourceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential event properties')
				.setIcon('calendar')
				.onClick(async () => {
					await addEssentialEventProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential universe properties')
				.setIcon('globe')
				.onClick(async () => {
					await addEssentialUniverseProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

/**
 * Build context menu items for universe notes with cr_id.
 * Handles both desktop (submenu) and mobile (flat) variants.
 */
function buildUniverseContextMenu(
	menu: Menu,
	plugin: CanvasRootsPlugin,
	file: TFile,
	cache: CachedMetadata | null,
	useSubmenu: boolean
): void {
	menu.addSeparator();

	if (useSubmenu) {
		menu.addItem((item) => {
			const submenu: Menu = item
				.setTitle('Charted Roots')
				.setIcon('globe')
				.setSubmenu();

			// Open universe note
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open universe')
					.setIcon('file')
					.onClick(() => {
						void plugin.app.workspace.getLeaf(false).openFile(file);
					});
			});

			// Open universes tab
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Open universes tab')
					.setIcon('external-link')
					.onClick(() => {
						const modal = new ControlCenterModal(plugin.app, plugin);
						modal.openToTab('universes');
					});
			});

			// Edit universe
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Edit universe')
					.setIcon('edit')
					.onClick(() => {
						openEditUniverseModal(plugin, file);
					});
			});

			// Delete universe
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Delete universe')
					.setIcon('trash')
					.onClick(async () => {
						const universeName = cache?.frontmatter?.name || file.basename;
						const confirmed = await confirmDeleteUniverse(plugin, universeName);
						if (confirmed) {
							await plugin.app.fileManager.trashFile(file);
							new Notice(`Deleted universe: ${universeName}`);
						}
					});
			});

			submenu.addSeparator();

			// Add essential properties submenu
			submenu.addItem((subItem) => {
				const propsSubmenu: Menu = subItem
					.setTitle('Add essential properties')
					.setIcon('file-plus')
					.setSubmenu();

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential universe properties')
						.setIcon('globe')
						.onClick(async () => {
							await addEssentialUniverseProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential person properties')
						.setIcon('user')
						.onClick(async () => {
							await addEssentialPersonProperties(plugin, [file]);
						});
				});

				propsSubmenu.addItem((propItem) => {
					propItem
						.setTitle('Add essential place properties')
						.setIcon('map-pin')
						.onClick(async () => {
							await addEssentialPlaceProperties(plugin, [file]);
						});
				});
			});

			// Add cr_id only
			submenu.addItem((subItem) => {
				subItem
					.setTitle('Add cr_id')
					.setIcon('key')
					.onClick(async () => {
						await addCrId(plugin, [file]);
					});
			});
		});
	} else {
		// Mobile: flat menu for universe notes
		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Open universes tab')
				.setIcon('globe')
				.onClick(() => {
					const modal = new ControlCenterModal(plugin.app, plugin);
					modal.openToTab('universes');
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Edit universe')
				.setIcon('edit')
				.onClick(() => {
					openEditUniverseModal(plugin, file);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Delete universe')
				.setIcon('trash')
				.onClick(async () => {
					const universeName = cache?.frontmatter?.name || file.basename;
					const confirmed = await confirmDeleteUniverse(plugin, universeName);
					if (confirmed) {
						await plugin.app.fileManager.trashFile(file);
						new Notice(`Deleted universe: ${universeName}`);
					}
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential universe properties')
				.setIcon('globe')
				.onClick(async () => {
					await addEssentialUniverseProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential person properties')
				.setIcon('user')
				.onClick(async () => {
					await addEssentialPersonProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add essential place properties')
				.setIcon('map-pin')
				.onClick(async () => {
					await addEssentialPlaceProperties(plugin, [file]);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Charted Roots: Add cr_id')
				.setIcon('key')
				.onClick(async () => {
					await addCrId(plugin, [file]);
				});
		});
	}
}

export * from './context-menu-helpers';

/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- Match scope of file-level disable at top. */
