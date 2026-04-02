import { Notice, TFile, TFolder, Menu, Platform, Modal } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { RegenerateOptionsModal } from '../ui/regenerate-options-modal';
import { TreeStatisticsModal } from '../ui/tree-statistics-modal';
import { PersonPickerModal } from '../ui/person-picker';
import { FolderScanModal } from '../ui/folder-scan-modal';
import { FolderStatisticsModal } from '../ui/folder-statistics-modal';
import { getErrorMessage } from '../core/error-utils';
import { ExcalidrawExporter } from '../excalidraw/excalidraw-exporter';
import { generateCrId } from '../core/uuid';
import { ReferenceNumberingService } from '../core/reference-numbering';
import type { NumberingSystem } from '../core/reference-numbering';
import { LineageTrackingService } from '../core/lineage-tracking';
import type { LineageType } from '../core/lineage-tracking';
import { FamilyGraphService } from '../core/family-graph';
import { TreePreviewRenderer } from '../ui/tree-preview';
import { isPlaceNote, isSourceNote, isEventNote, isMapNote, isSchemaNote, isUniverseNote, isPersonNote, isOrganizationNote } from '../utils/note-type-detection';
import { extractWikilinkPath } from '../utils/wikilink-resolver';
import { GeocodingService } from '../maps/services/geocoding-service';
import { SourcePickerModal, SourceService, CreateSourceModal, CitationGeneratorModal } from '../sources';
import { EventService } from '../events/services/event-service';
import { CreateEventModal } from '../events/ui/create-event-modal';
import { UniverseService, EditUniverseModal, UniverseWizardModal } from '../universes';
import { MediaManageModal } from '../core/ui/media-manage-modal';
import { CreatePlaceModal } from '../ui/create-place-modal';
import { PlaceLookupModal } from '../places/ui/place-lookup-modal';
import { CreatePersonModal } from '../ui/create-person-modal';
import { AddRelationshipModal } from '../ui/add-relationship-modal';
import { RelationshipManager } from '../core/relationship-manager';
import { RelationshipCalculatorModal } from '../ui/relationship-calculator-modal';
import { SchemaService, ValidationService } from '../schemas';
import { CreateMapWizardModal } from '../ui/create-map-wizard-modal';
import { SplitWizardModal } from '../ui/split-wizard-modal';
import { AddResearchQuestionModal } from '../ui/add-research-question-modal';
import { CleanupWizardModal } from '../ui/cleanup-wizard-modal';
import { CanvasStyleModal } from '../ui/canvas-style-modal';
import { ControlCenterModal } from '../ui/control-center';
import { CreateMapModal } from '../ui/create-map-modal';
import { CreateMissingPlacesModal } from '../ui/create-missing-places-modal';
import { CreateNoteModal } from '../ui/create-note-modal';
import { FindOnCanvasModal } from '../ui/find-on-canvas-modal';
import { ValidationResultsModal } from '../ui/validation-results-modal';
import { CreateOrganizationModal } from '../organizations/ui/create-organization-modal';
import { AddMembershipModal } from '../organizations/ui/add-membership-modal';
import { ManageOrganizationMembersModal } from '../organizations/ui/manage-members-modal';
import { EventPickerModal } from '../events/ui/event-picker-modal';
import { TimelineCanvasExporter } from '../events/services/timeline-canvas-exporter';
import { TimelineStyleModal } from '../events/ui/timeline-style-modal';
import { BookBuilderModal } from '../book/ui/book-builder-modal';
import { BookGenerationService } from '../book/services/book-generation-service';
import { RelationshipValidator } from '../core/relationship-validator';
import { getLogger } from '../core/logging';

const logger = getLogger('context-menus');

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
											await new Promise(resolve => setTimeout(resolve, 100));

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
									.setTitle('Open in family chart')
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
										await new Promise(resolve => setTimeout(resolve, 100));
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
								.setTitle('Charted Roots: Open in family chart')
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
						menu.addSeparator();

						const schemaName = fm?.name || file.basename;

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
											// Note: The actual editing would require passing the schema to the modal
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
												// Filter results to only this schema
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
					// Map notes get map-specific options (open map view with this map selected)
					// Also show for files in maps folder that aren't yet typed as map
					else if (isMap || isInMapsFolder) {
						menu.addSeparator();

						const mapId = fm?.map_id;
						const mapName = fm?.name || file.basename;

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
					// Place notes with cr_id get place-specific options
					else if (hasCrId && isPlace) {
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
												if (fm.coordinates.lat !== undefined && fm.coordinates.long !== undefined) {
													focusCoordinates = {
														lat: Number(fm.coordinates.lat),
														lng: Number(fm.coordinates.long),
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
												const placeName = fm?.name || file.basename;
												plugin.openLinkMediaModal(file, 'place', placeName);
											});
									});

									mediaSubmenu.addItem((mediaItem) => {
										mediaItem
											.setTitle('Manage media...')
											.setIcon('settings')
											.onClick(() => {
												const placeName = fm?.name || file.basename;
												openManageMediaModal(plugin, file, 'place', placeName);
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
											if (fm.coordinates.lat !== undefined && fm.coordinates.long !== undefined) {
												focusCoordinates = {
													lat: Number(fm.coordinates.lat),
													lng: Number(fm.coordinates.long),
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
										const placeName = fm?.name || file.basename;
										plugin.openLinkMediaModal(file, 'place', placeName);
									});
							});

							menu.addItem((item) => {
								item
									.setTitle('Charted Roots: Manage media...')
									.setIcon('settings')
									.onClick(() => {
										const placeName = fm?.name || file.basename;
										openManageMediaModal(plugin, file, 'place', placeName);
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
					// Source notes with cr_id get source-specific options
					else if (hasCrId && isSource) {
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
					// Person notes with cr_id get full person options
					else if (hasCrId && !isPlace && !isSource && !isEvent && !isUniverse && !isOrg) {
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
													plugin.app.workspace.revealLeaf(leaves[0]);
													const mapView = leaves[0].view as import('../maps/map-view').MapView;
													mapView.enterJourneyModeForPerson(crId, personName);
												} else {
													void plugin.app.workspace.getLeaf('tab').setViewState({
														type: 'canvas-roots-map',
														active: true
													}).then(() => {
														setTimeout(() => {
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
										.setTitle('Open in family chart')
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
															initialPerson: { name: personName, crId: crId }
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
									.setTitle('Charted Roots: Open in family chart')
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
													initialPerson: { name: personName, crId: crId }
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
					// Event notes with cr_id get event-specific options
					else if (hasCrId && isEvent) {
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
					// Organization notes with cr_id get organization-specific options
					else if (hasCrId && isOrg) {
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
					// Notes without cr_id still get "Add essential properties" option
					else if (!hasCrId) {
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
					// Universe notes with cr_id get universe-specific options
					else if (hasCrId && isUniverse) {
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

export async function confirmDeleteEvent(plugin: CanvasRootsPlugin, eventTitle: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Delete event');
		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

export async function confirmDeleteUniverse(plugin: CanvasRootsPlugin, universeName: string): Promise<boolean> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Delete universe');
		modal.contentEl.createEl('p', {
			text: `Are you sure you want to delete "${universeName}"? This action cannot be undone.`
		});
		modal.contentEl.createEl('p', {
			text: 'Note: This will not delete entities associated with this universe.',
			cls: 'mod-warning'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(false);
		});

		const deleteBtn = buttonContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			modal.close();
			resolve(true);
		});

		modal.open();
	});
}

export async function promptParentType(plugin: CanvasRootsPlugin): Promise<'father' | 'mother' | null> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Select parent type');

		modal.contentEl.createEl('p', {
			text: 'Is this person the father or mother?'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const fatherBtn = buttonContainer.createEl('button', {
			text: 'Father',
			cls: 'mod-cta'
		});
		fatherBtn.addEventListener('click', () => {
			modal.close();
			resolve('father');
		});

		const motherBtn = buttonContainer.createEl('button', {
			text: 'Mother',
			cls: 'mod-cta'
		});
		motherBtn.addEventListener('click', () => {
			modal.close();
			resolve('mother');
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(null);
		});

		modal.open();
	});
}

export async function promptSetCollectionName(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current group_name if it exists
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentCollectionName = cache?.frontmatter?.group_name || '';

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Set group name');

		modal.contentEl.createEl('p', {
			text: 'Enter a name for this connected group (family, faction, organization, etc.):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Smith Family", "House Stark", "The Council"',
			value: currentCollectionName,
			cls: 'cr-prompt-input'
		});

		modal.contentEl.createEl('p', {
			text: 'Leave empty to remove the group name.',
			cls: 'cr-help-text'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			void (async () => {
				const collectionName = input.value.trim();

				// Update or remove group_name in frontmatter
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					if (collectionName) {
						frontmatter.group_name = collectionName;
					} else {
						delete frontmatter.group_name;
					}
				});

				new Notice(collectionName
					? `Group name set to "${collectionName}"`
					: 'Group name removed'
				);

				modal.close();
				resolve();
			})();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve();
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function promptSetCollection(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current collection if it exists
	const cache = plugin.app.metadataCache.getFileCache(file);
	const currentCollection = cache?.frontmatter?.collection || '';

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Set collection');

		modal.contentEl.createEl('p', {
			text: 'Enter a collection to organize this person (e.g., "Paternal Line", "House Stark", "1800s Branch"):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Paternal Line", "Maternal Branch"',
			value: currentCollection,
			cls: 'cr-prompt-input'
		});

		modal.contentEl.createEl('p', {
			text: 'Collections let you organize people across family groups. Leave empty to remove.',
			cls: 'cr-help-text'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			void (async () => {
				const collection = input.value.trim();

				// Update or remove collection in frontmatter
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					if (collection) {
						frontmatter.collection = collection;
					} else {
						delete frontmatter.collection;
					}
				});

				new Notice(collection
					? `Collection set to "${collection}"`
					: 'Collection removed'
				);

				modal.close();
				resolve();
			})();
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve();
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function linkEntityToEvent(plugin: CanvasRootsPlugin, entityName: string,
	event: import('../events/types/event-types').EventNote,
	fieldName: 'persons' | 'sources'): Promise<void> {
	const wikilink = `[[${entityName}]]`;

	try {
		await plugin.app.fileManager.processFrontMatter(event.file, (frontmatter) => {
			if (!frontmatter[fieldName]) {
				frontmatter[fieldName] = [];
			}
			if (!Array.isArray(frontmatter[fieldName])) {
				frontmatter[fieldName] = [frontmatter[fieldName]];
			}

			const alreadyLinked = frontmatter[fieldName].some((entry: string) => {
				const refName = extractWikilinkPath(entry);
				return refName.toLowerCase() === entityName.toLowerCase();
			});

			if (!alreadyLinked) {
				frontmatter[fieldName].push(wikilink);
				new Notice(`Linked ${entityName} to ${event.title || event.file.basename}`);
			} else {
				new Notice(`${entityName} is already linked to this event`);
			}
		});
	} catch (err) {
		new Notice(`Failed to link ${entityName} to event`);
		console.error('linkEntityToEvent error:', err);
	}
}

export async function linkPersonToEvent(plugin: CanvasRootsPlugin, personFile: TFile, personName: string, event: import('../events/types/event-types').EventNote): Promise<void> {
	await linkEntityToEvent(plugin, personName, event, 'persons');
}

export async function linkSourceToEvent(plugin: CanvasRootsPlugin, sourceFile: TFile, event: import('../events/types/event-types').EventNote): Promise<void> {
	await linkEntityToEvent(plugin, sourceFile.basename, event, 'sources');
}

export function addSourceToPersonNote(plugin: CanvasRootsPlugin, file: TFile): void {
	new SourcePickerModal(plugin.app, plugin, {
		onSelect: async (source) => {
			// Get current sources from frontmatter
			const cache = plugin.app.metadataCache.getFileCache(file);
			const frontmatter = cache?.frontmatter || {};

			// Find the next available source slot
			let nextSlot = 1;
			if (frontmatter.source) {
				nextSlot = 2;
				while (frontmatter[`source_${nextSlot}`]) {
					nextSlot++;
				}
			}

			// Create the wikilink
			const sourceLink = `[[${source.filePath.replace(/\.md$/, '')}]]`;

			// Check if this source is already linked
			const existingSources: string[] = [];
			if (frontmatter.source) existingSources.push(String(frontmatter.source));
			for (let i = 2; i <= 50; i++) {
				const key = `source_${i}`;
				if (frontmatter[key]) {
					existingSources.push(String(frontmatter[key]));
				} else {
					break;
				}
			}

			if (existingSources.some(s => s.includes(source.filePath.replace(/\.md$/, '')))) {
				new Notice(`Source "${source.title}" is already linked to this person`);
				return;
			}

			// Add the source to frontmatter
			await plugin.app.fileManager.processFrontMatter(file, (fm) => {
				if (nextSlot === 1) {
					fm.source = sourceLink;
				} else {
					fm[`source_${nextSlot}`] = sourceLink;
				}
			});

			new Notice(`Linked source: ${source.title}`);
		}
	}).open();
}

export function openManageMediaModal(plugin: CanvasRootsPlugin, file: TFile, entityType: string, entityName: string): void {
	if (!plugin.mediaService) {
		new Notice('Media service not available');
		return;
	}

	// Get existing media from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingMedia = plugin.mediaService.parseMediaProperty(cache?.frontmatter || {});

	new MediaManageModal(
		plugin.app,
		plugin.mediaService,
		file,
		existingMedia,
		async (updatedMediaRefs) => {
			if (!plugin.mediaService) return;
			await plugin.mediaService.updateMediaProperty(file, updatedMediaRefs);
		},
		() => {
			// Re-open the link media modal when "Add media" is clicked
			plugin.openLinkMediaModal(file, entityType, entityName);
		},
		{
			entityName,
			entityType
		}
	).open();
}

export async function geocodeSinglePlace(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm) {
		new Notice('Could not read place frontmatter');
		return;
	}

	// Check if already has coordinates
	if (fm.latitude && fm.longitude) {
		new Notice('Place already has coordinates');
		return;
	}

	// Get the place name - prefer full_name, fall back to title or name
	const placeName = fm.full_name || fm.title || fm.name || file.basename;

	if (!placeName) {
		new Notice('Could not determine place name for geocoding');
		return;
	}

	// Get parent place name if available
	let parentName: string | undefined;
	if (fm.parent) {
		const placeGraph = plugin.createPlaceGraphService();
		placeGraph.reloadCache();
		const parentPlace = placeGraph.getPlaceByCrId(fm.parent);
		parentName = parentPlace?.name;
	}

	new Notice(`Geocoding "${placeName}"...`);

	const geocodingService = new GeocodingService(plugin.app);
	const result = await geocodingService.geocodeSingle(placeName, parentName);

	if (result.success && result.coordinates) {
		// Update the file with coordinates
		await geocodingService.updatePlaceCoordinates(file, result.coordinates);
		new Notice(`Found coordinates: ${result.coordinates.lat.toFixed(4)}, ${result.coordinates.long.toFixed(4)}`);
	} else {
		new Notice(result.error || 'Could not find coordinates for this place');
	}
}

export function openEditSourceModal(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get source data from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Source note does not have a cr_id');
		return;
	}

	// Get source from service
	const sourceService = new SourceService(plugin.app, plugin.settings);
	const source = sourceService.getSourceByPath(file.path);

	if (!source) {
		new Notice('Could not find source data');
		return;
	}

	// Open the modal in edit mode
	new CreateSourceModal(plugin.app, plugin, {
		editFile: file,
		editSource: source,
		onSuccess: () => {
			new Notice('Source updated');
		}
	}).open();
}

export function openCitationGenerator(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get source data from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Source note does not have a cr_id');
		return;
	}

	// Get source from service
	const sourceService = new SourceService(plugin.app, plugin.settings);
	const source = sourceService.getSourceByPath(file.path);

	if (!source) {
		new Notice('Could not find source data');
		return;
	}

	// Open the citation generator modal
	new CitationGeneratorModal(plugin.app, plugin, source).open();
}

export function openEditUniverseModal(plugin: CanvasRootsPlugin, file: TFile): void {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Universe note does not have a cr_id');
		return;
	}

	// Get universe from service
	const universeService = new UniverseService(plugin);
	const universe = universeService.getUniverseByFile(file);

	if (!universe) {
		new Notice('Could not find universe data');
		return;
	}

	// Open the edit modal
	new EditUniverseModal(plugin.app, plugin, {
		universe,
		file,
		onUpdated: () => {
			new Notice('Universe updated');
		}
	}).open();
}

export async function toggleRootPerson(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	// Get current root_person status
	const cache = plugin.app.metadataCache.getFileCache(file);
	const isRootPerson = cache?.frontmatter?.root_person === true;

	if (isRootPerson) {
		// Unmarking this person
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			delete frontmatter.root_person;
		});
		new Notice('Unmarked as root person');
	} else {
		// Marking this person - first unmark any existing root person
		const familyGraph = plugin.createFamilyGraphService();
		const { allMarked } = familyGraph.getMarkedRootPerson();

		for (const existingRoot of allMarked) {
			if (existingRoot.file.path !== file.path) {
				await plugin.app.fileManager.processFrontMatter(existingRoot.file, (frontmatter) => {
					delete frontmatter.root_person;
				});
			}
		}

		// Now mark the new root person
		await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter.root_person = true;
		});

		if (allMarked.length > 0 && allMarked.some(p => p.file.path !== file.path)) {
			new Notice('Marked as root person (previous root unmarked)');
		} else {
			new Notice('Marked as root person');
		}
	}
}

export async function assignReferenceNumbersFromPerson(plugin: CanvasRootsPlugin, file: TFile, system: NumberingSystem): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const crId = cache?.frontmatter?.cr_id;
	const personName = cache?.frontmatter?.name || file.basename;

	if (!crId) {
		new Notice('Invalid person note: missing cr_id');
		return;
	}

	try {
		const service = new ReferenceNumberingService(plugin.app);
		let stats;

		new Notice(`Assigning ${system} numbers from ${personName}...`);

		switch (system) {
			case 'ahnentafel':
				stats = await service.assignAhnentafel(crId);
				break;
			case 'daboville':
				stats = await service.assignDAboville(crId);
				break;
			case 'henry':
				stats = await service.assignHenry(crId);
				break;
			case 'generation':
				stats = await service.assignGeneration(crId);
				break;
		}

		new Notice(`Assigned ${stats.totalAssigned} ${system} numbers from ${stats.rootPerson}`);
	} catch (error) {
		logger.error('reference-numbering', `Failed to assign ${system} numbers`, error);
		new Notice(`Failed to assign numbers: ${getErrorMessage(error)}`);
	}
}

export async function assignLineageFromPerson(plugin: CanvasRootsPlugin, file: TFile, type: LineageType): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const crId = cache?.frontmatter?.cr_id;
	const personName = cache?.frontmatter?.name || file.basename;

	if (!crId) {
		new Notice('Invalid person note: missing cr_id');
		return;
	}

	// Prompt for lineage name
	const lineageName = await promptLineageName(plugin, personName);
	if (!lineageName) return;

	try {
		const service = new LineageTrackingService(plugin.app);
		new Notice(`Assigning "${lineageName}" lineage from ${personName}...`);

		const stats = await service.assignLineage({
			name: lineageName,
			rootCrId: crId,
			type: type
		});

		new Notice(`Assigned "${lineageName}" to ${stats.totalMembers} descendants (${stats.maxGeneration} generations)`);
	} catch (error) {
		logger.error('lineage-tracking', 'Failed to assign lineage', error);
		new Notice(`Failed to assign lineage: ${getErrorMessage(error)}`);
	}
}

export async function showCreatePlaceNotesForPerson(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm) {
		new Notice('No frontmatter found in this note');
		return;
	}

	// Collect all place references from this person
	const placeFields: string[] = [];

	// Birth/death/burial places
	if (fm.birth_place && typeof fm.birth_place === 'string') {
		placeFields.push(fm.birth_place);
	}
	if (fm.death_place && typeof fm.death_place === 'string') {
		placeFields.push(fm.death_place);
	}
	if (fm.burial_place && typeof fm.burial_place === 'string') {
		placeFields.push(fm.burial_place);
	}

	// Spouse marriage locations
	let spouseIndex = 1;
	while (fm[`spouse${spouseIndex}`] || fm[`spouse${spouseIndex}_id`]) {
		const marriageLocation = fm[`spouse${spouseIndex}_marriage_location`];
		if (marriageLocation && typeof marriageLocation === 'string') {
			placeFields.push(marriageLocation);
		}
		spouseIndex++;
	}

	// Deduplicate and filter out wikilinks (already linked to place notes)
	const uniquePlaces = [...new Set(placeFields)]
		.map(p => p.trim())
		.filter(p => p && !p.startsWith('[['));

	if (uniquePlaces.length === 0) {
		new Notice('No unlinked place references found in this person note');
		return;
	}

	// Check which places already have notes
	const placeGraph = plugin.createPlaceGraphService();
	placeGraph.reloadCache();

	const missingPlaces: string[] = [];
	for (const placeName of uniquePlaces) {
		const existingPlace = placeGraph.getPlaceByName(placeName);
		if (!existingPlace) {
			missingPlaces.push(placeName);
		}
	}

	if (missingPlaces.length === 0) {
		new Notice('All place references already have corresponding place notes');
		return;
	}

	// Show modal to select which places to create
	const { CreateMissingPlacesModal } = await import('../ui/create-missing-places-modal');

	const modal = new CreateMissingPlacesModal(
		plugin.app,
		missingPlaces.map(name => ({ name, count: 1 })),
		{
			directory: plugin.settings.peopleFolder || '',
			placeGraph, // Reuse the placeGraph from earlier in plugin function
			onComplete: (created: number) => {
				if (created > 0) {
					new Notice(`Created ${created} place note${created !== 1 ? 's' : ''}`);
				}
			}
		}
	);
	modal.open();
}

export async function promptLineageName(plugin: CanvasRootsPlugin, suggestedName: string): Promise<string | null> {
	// Extract surname for suggestion
	const nameParts = suggestedName.trim().split(/\s+/);
	const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : suggestedName;
	const suggestion = `${surname} Line`;

	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Enter lineage name');

		modal.contentEl.createEl('p', {
			text: 'Enter a name for this lineage (e.g., "Smith Line", "Tudor Dynasty"):'
		});

		const inputContainer = modal.contentEl.createDiv({ cls: 'setting-item-control' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'e.g., "Smith Line", "Tudor Dynasty"',
			value: suggestion,
			cls: 'cr-prompt-input'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const saveBtn = buttonContainer.createEl('button', {
			text: 'Assign',
			cls: 'mod-cta'
		});
		saveBtn.addEventListener('click', () => {
			const lineageName = input.value.trim();
			if (lineageName) {
				modal.close();
				resolve(lineageName);
			} else {
				new Notice('Please enter a lineage name');
			}
		});

		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => {
			modal.close();
			resolve(null);
		});

		// Allow Enter key to save
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});

		modal.open();

		// Focus the input
		setTimeout(() => {
			input.focus();
			input.select();
		}, 50);
	});
}

export async function regenerateTimelineCanvas(plugin: CanvasRootsPlugin, canvasFile: TFile): Promise<void> {
	try {
		new Notice('Regenerating timeline...');

		// Get event service
		const eventService = plugin.getEventService();
		if (!eventService) {
			new Notice('Event service not available');
			return;
		}

		// Get all events
		const events = eventService.getAllEvents();
		if (events.length === 0) {
			new Notice('No events found');
			return;
		}

		// Import and use TimelineCanvasExporter
		const { TimelineCanvasExporter } = await import('../events/services/timeline-canvas-exporter');
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);

		const result = await exporter.regenerateCanvas(canvasFile, events);

		if (result.success) {
			new Notice(`Timeline regenerated successfully! (${events.length} events)`);
		} else {
			new Notice(`Failed to regenerate timeline: ${result.error}`);
		}
	} catch (error: unknown) {
		console.error('Error regenerating timeline canvas:', error);
		new Notice('Failed to regenerate timeline. Check console for details.');
	}
}

export async function exportCanvasToExcalidraw(plugin: CanvasRootsPlugin, canvasFile: TFile) {
	try {
		new Notice('Exporting to Excalidraw...');

		// Initialize exporter
		const exporter = new ExcalidrawExporter(plugin.app);

		// Export canvas
		const result = await exporter.exportToExcalidraw({
			canvasFile,
			preserveColors: true,
			fontSize: 16,
			strokeWidth: 2
		});

		if (!result.success) {
			new Notice(`Export failed: ${result.errors.join(', ')}`);
			return;
		}

		// Save Excalidraw file to vault root
		const outputPath = `${result.fileName}.excalidraw.md`;
		await plugin.app.vault.create(outputPath, result.excalidrawContent!);

		new Notice(`Exported ${result.elementsExported} elements to ${result.fileName}.excalidraw.md`);

		// Open the newly created file
		const excalidrawFile = plugin.app.vault.getAbstractFileByPath(outputPath);
		if (excalidrawFile instanceof TFile) {
			const leaf = plugin.app.workspace.getLeaf(false);
			await leaf.openFile(excalidrawFile);
		}
	} catch (error: unknown) {
		console.error('Error exporting to Excalidraw:', error);
		new Notice(`Failed to export to Excalidraw: ${getErrorMessage(error)}`);
	}
}

export async function exportCanvasAsImage(plugin: CanvasRootsPlugin, canvasFile: TFile, format: 'png' | 'svg' | 'pdf') {
	try {
		new Notice(`Exporting as ${format.toUpperCase()}...`);

		// Read canvas to get root person
		const canvasContent = await plugin.app.vault.read(canvasFile);
		const canvasData = JSON.parse(canvasContent);
		const metadata = canvasData.metadata?.frontmatter;

		if ((metadata?.plugin !== 'charted-roots' && metadata?.plugin !== 'canvas-roots') || !metadata.generation?.rootCrId) {
			new Notice('This canvas does not contain Charted Roots tree data');
			return;
		}

		const rootCrId = metadata.generation.rootCrId;
		const treeType = metadata.generation.treeType || 'full';
		const maxGenerations = metadata.generation.maxGenerations || 0;
		const includeSpouses = metadata.generation.includeSpouses ?? true;

		// Build family tree
		const graphService = plugin.createFamilyGraphService();

		const familyTree = graphService.generateTree({
			rootCrId,
			treeType,
			maxGenerations,
			includeSpouses
		});

		if (!familyTree) {
			new Notice('Failed to build family tree from canvas data');
			return;
		}

		// Create a temporary container for the preview renderer
		const tempContainer = document.createElement('div');
		tempContainer.addClass('cr-offscreen-render');
		document.body.appendChild(tempContainer);

		try {
			// Render tree
			const renderer = new TreePreviewRenderer(tempContainer);
			renderer.setColorScheme(plugin.settings.nodeColorScheme);
			renderer.renderPreview(familyTree, {
				layoutType: metadata.generation.layoutType || plugin.settings.defaultLayoutType,
				treeType: treeType === 'ancestors' ? 'ancestor' : treeType === 'descendants' ? 'descendant' : 'full',
				direction: 'vertical',
				nodeWidth: plugin.settings.defaultNodeWidth,
				nodeHeight: plugin.settings.defaultNodeHeight,
				nodeSpacingX: plugin.settings.horizontalSpacing,
				nodeSpacingY: plugin.settings.verticalSpacing
			});

			// Export based on format
			if (format === 'png') {
				await renderer.exportAsPNG();
			} else if (format === 'svg') {
				renderer.exportAsSVG();
			} else if (format === 'pdf') {
				await renderer.exportAsPDF();
			}

			new Notice(`${format.toUpperCase()} exported successfully`);
		} finally {
			// Clean up temporary container
			document.body.removeChild(tempContainer);
		}
	} catch (error: unknown) {
		console.error(`Error exporting canvas as ${format}:`, error);
		new Notice(`Failed to export as ${format.toUpperCase()}: ${getErrorMessage(error)}`);
	}
}

export async function exportPersonTimelineFromFile(plugin: CanvasRootsPlugin, personFile: TFile,
	format: 'canvas' | 'excalidraw' = 'canvas'): Promise<void> {
	const eventService = plugin.getEventService();
	if (!eventService) {
		new Notice('Event service not available');
		return;
	}

	const cache = plugin.app.metadataCache.getFileCache(personFile);
	const personName = cache?.frontmatter?.name || personFile.basename;
	const allEvents = eventService.getAllEvents();
	const personLink = `[[${personName}]]`;

	// Filter events for this person
	const personEvents = allEvents.filter(e => {
		if (e.person) {
			const normalizedPerson = e.person.replace(/^\[\[/, '').replace(/\]\]$/, '').toLowerCase();
			return normalizedPerson === personName.toLowerCase();
		}
		return false;
	});

	if (personEvents.length === 0) {
		new Notice(`No events found for ${personName}`);
		return;
	}

	try {
		const { TimelineCanvasExporter } = await import('../events/services/timeline-canvas-exporter');
		const exporter = new TimelineCanvasExporter(plugin.app, plugin.settings);

		const result = await exporter.exportToCanvas(allEvents, {
			title: `${personName} Timeline`,
			filterPerson: personLink,
			layoutStyle: 'horizontal',
			colorScheme: 'event_type',
			includeOrderingEdges: true
		});

		if (result.success && result.path) {
			if (format === 'excalidraw') {
				// Convert to Excalidraw
				const { ExcalidrawExporter } = await import('../excalidraw/excalidraw-exporter');
				const excalidrawExporter = new ExcalidrawExporter(plugin.app);

				const canvasFile = plugin.app.vault.getAbstractFileByPath(result.path);
				if (!(canvasFile instanceof TFile)) {
					throw new Error('Canvas file not found after export');
				}

				const excalidrawResult = await excalidrawExporter.exportToExcalidraw({
					canvasFile,
					fileName: result.path.replace('.canvas', '').split('/').pop(),
					preserveColors: true
				});

				if (excalidrawResult.success && excalidrawResult.excalidrawContent) {
					// Save to vault root
					const excalidrawFileName = result.path.replace('.canvas', '.excalidraw.md').split('/').pop();
					const excalidrawPath = excalidrawFileName || result.path.replace('.canvas', '.excalidraw.md');
					await plugin.app.vault.create(excalidrawPath, excalidrawResult.excalidrawContent);
					new Notice(`Timeline exported to ${excalidrawPath}`);
					const file = plugin.app.vault.getAbstractFileByPath(excalidrawPath);
					if (file instanceof TFile) {
						void plugin.app.workspace.getLeaf(false).openFile(file);
					}
				} else {
					new Notice(`Excalidraw export failed: ${excalidrawResult.errors?.join(', ') || 'Unknown error'}`);
				}
			} else {
				new Notice(`Timeline exported to ${result.path}`);
				const file = plugin.app.vault.getAbstractFileByPath(result.path);
				if (file instanceof TFile) {
					void plugin.app.workspace.getLeaf(false).openFile(file);
				}
			}
		} else {
			new Notice(`Export failed: ${result.error || 'Unknown error'}`);
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		new Notice(`Export failed: ${message}`);
	}
}

export async function addEssentialPersonProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// cr_type: Set to 'person' if missing
					if (!frontmatter.cr_type) {
						frontmatter.cr_type = 'person';
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// born: Add as empty if missing
					if (!frontmatter.born) {
						frontmatter.born = '';
						propertiesAdded = true;
					}

					// died: Add as empty if missing
					if (!frontmatter.died) {
						frontmatter.died = '';
						propertiesAdded = true;
					}

					// father: Add as empty if missing
					if (!frontmatter.father) {
						frontmatter.father = '';
						propertiesAdded = true;
					}

					// mother: Add as empty if missing
					if (!frontmatter.mother) {
						frontmatter.mother = '';
						propertiesAdded = true;
					}

					// spouses: Add as empty array if missing
					if (!frontmatter.spouses) {
						frontmatter.spouses = [];
						propertiesAdded = true;
					}

					// children: Add as empty array if missing
					if (!frontmatter.children) {
						frontmatter.children = [];
						propertiesAdded = true;
					}

					// group_name: Add as empty if missing
					if (!frontmatter.group_name) {
						frontmatter.group_name = '';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential properties');
			} else {
				new Notice('Failed to add essential properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential person properties:', error);
		new Notice('Failed to add essential person properties');
	}
}

export async function addEssentialPlaceProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "place" (migrate from legacy 'type' property)
					if (frontmatter.cr_type !== 'place') {
						frontmatter.cr_type = 'place';
						propertiesAdded = true;
					}
					// Remove legacy 'type' property if it exists (migrated to cr_type)
					if (frontmatter.type === 'place') {
						delete frontmatter.type;
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// place_type: Add as empty if missing
					if (!frontmatter.place_type) {
						frontmatter.place_type = '';
						propertiesAdded = true;
					}

					// place_category: Use setting default if missing
					if (!frontmatter.place_category) {
						frontmatter.place_category = plugin.settings.defaultPlaceCategory;
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential place properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential place properties');
			} else {
				new Notice('Failed to add essential place properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential place properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential place properties:', error);
		new Notice('Failed to add essential place properties');
	}
}

export async function addEssentialMapProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "map"
					if (frontmatter.cr_type !== 'map') {
						frontmatter.cr_type = 'map';
						propertiesAdded = true;
					}

					// map_id: Generate from filename if missing
					if (!frontmatter.map_id) {
						frontmatter.map_id = file.basename.toLowerCase().replace(/\s+/g, '-');
						propertiesAdded = true;
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
						propertiesAdded = true;
					}

					// universe: Add empty if missing
					if (!frontmatter.universe) {
						frontmatter.universe = '';
						propertiesAdded = true;
					}

					// image: Add empty if missing
					if (!frontmatter.image) {
						frontmatter.image = '';
						propertiesAdded = true;
					}

					// bounds: Add flat properties if missing (check for both flat and nested)
					const hasFlatBounds = frontmatter.bounds_north !== undefined;
					const hasNestedBounds = frontmatter.bounds && typeof frontmatter.bounds === 'object';
					if (!hasFlatBounds && !hasNestedBounds) {
						frontmatter.bounds_north = 100;
						frontmatter.bounds_south = -100;
						frontmatter.bounds_east = 100;
						frontmatter.bounds_west = -100;
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential map properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential map properties');
			} else {
				new Notice('Failed to add essential map properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential map properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential map properties:', error);
		new Notice('Failed to add essential map properties');
	}
}

export async function addEssentialUniverseProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "universe"
					frontmatter.cr_type = 'universe';

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
					}

					// name: Use filename if missing
					if (!frontmatter.name) {
						frontmatter.name = file.basename;
					}

					// description: Add empty if missing
					if (frontmatter.description === undefined) {
						frontmatter.description = '';
					}

					// status: Default to 'active' if missing
					if (!frontmatter.status) {
						frontmatter.status = 'active';
					}

					// author: Add empty if missing
					if (frontmatter.author === undefined) {
						frontmatter.author = '';
					}

					// genre: Add empty if missing
					if (frontmatter.genre === undefined) {
						frontmatter.genre = '';
					}
				});

				processedCount++;

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential universe properties');
			} else {
				new Notice('Failed to add essential universe properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential universe properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential universe properties:', error);
		new Notice('Failed to add essential universe properties');
	}
}

export async function addEssentialSourceProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "source"
					if (frontmatter.cr_type !== 'source') {
						frontmatter.cr_type = 'source';
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// title: Use filename if missing
					if (!frontmatter.title) {
						frontmatter.title = file.basename;
						propertiesAdded = true;
					}

					// source_type: Default to 'other' if missing
					if (!frontmatter.source_type) {
						frontmatter.source_type = 'other';
						propertiesAdded = true;
					}

					// confidence: Default to 'unknown' if missing
					if (!frontmatter.confidence) {
						frontmatter.confidence = 'unknown';
						propertiesAdded = true;
					}

					// source_repository: Add empty if missing (check both new and legacy names)
					if (!frontmatter.source_repository && !frontmatter.repository) {
						frontmatter.source_repository = '';
						propertiesAdded = true;
					}

					// source_date: Add empty if missing (check both new and legacy names)
					if (!frontmatter.source_date && !frontmatter.date) {
						frontmatter.source_date = '';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential source properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential source properties');
			} else {
				new Notice('Failed to add essential source properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential source properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential source properties:', error);
		new Notice('Failed to add essential source properties');
	}
}

export async function addEssentialEventProperties(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let propertiesAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// cr_type: Must be "event"
					if (frontmatter.cr_type !== 'event') {
						frontmatter.cr_type = 'event';
						propertiesAdded = true;
					}

					// cr_id: Generate if missing
					if (!frontmatter.cr_id) {
						frontmatter.cr_id = generateCrId();
						propertiesAdded = true;
					}

					// title: Use filename if missing
					if (!frontmatter.title) {
						frontmatter.title = file.basename;
						propertiesAdded = true;
					}

					// event_type: Default to 'custom' if missing
					if (!frontmatter.event_type) {
						frontmatter.event_type = 'custom';
						propertiesAdded = true;
					}

					// date: Add empty if missing
					if (!frontmatter.date) {
						frontmatter.date = '';
						propertiesAdded = true;
					}

					// date_precision: Default to 'unknown' if missing
					if (!frontmatter.date_precision) {
						frontmatter.date_precision = 'unknown';
						propertiesAdded = true;
					}

					// persons: Add empty array if missing (use persons array, not deprecated singular person)
					if (!frontmatter.persons) {
						frontmatter.persons = [];
						propertiesAdded = true;
					}

					// place: Add empty if missing
					if (!frontmatter.place) {
						frontmatter.place = '';
						propertiesAdded = true;
					}

					// confidence: Default to 'unknown' if missing
					if (!frontmatter.confidence) {
						frontmatter.confidence = 'unknown';
						propertiesAdded = true;
					}
				});

				if (propertiesAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added essential event properties');
			} else if (skippedCount === 1) {
				new Notice('File already has all essential event properties');
			} else {
				new Notice('Failed to add essential event properties');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already complete`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Essential event properties: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding essential event properties:', error);
		new Notice('Failed to add essential event properties');
	}
}

export async function addCrId(plugin: CanvasRootsPlugin, files: TFile[]) {
	try {
		let processedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;

		for (const file of files) {
			try {
				let idAdded = false;

				await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
					// Skip if cr_id already exists
					if (frontmatter.cr_id) {
						return;
					}

					// All note types use plain cr_id format (cr_type identifies the note type)
					frontmatter.cr_id = generateCrId();
					idAdded = true;
				});

				if (idAdded) {
					processedCount++;
				} else {
					skippedCount++;
				}

			} catch (error: unknown) {
				console.error(`Error processing ${file.path}:`, error);
				errorCount++;
			}
		}

		// Show summary
		if (files.length === 1) {
			if (processedCount === 1) {
				new Notice('Added cr_id');
			} else if (skippedCount === 1) {
				new Notice('File already has cr_id');
			} else {
				new Notice('Failed to add cr_id');
			}
		} else {
			const parts = [];
			if (processedCount > 0) parts.push(`${processedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} already have cr_id`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Add cr_id: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		console.error('Error adding cr_id:', error);
		new Notice('Failed to add cr_id');
	}
}

export async function insertSourceRolesBlock(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const content = await plugin.app.vault.read(file);

		// Check if already has source roles block
		if (content.includes('```charted-roots-source-roles')) {
			new Notice('Source roles block already exists in this note');
			return;
		}

		// Build the block (self-referencing - no source parameter needed)
		const blockLines = [
			'',
			'```charted-roots-source-roles',
			'```',
			''
		];

		// Append to end of file
		const newContent = content.trimEnd() + '\n' + blockLines.join('\n');
		await plugin.app.vault.modify(file, newContent);

		new Notice('Source roles block added');

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Error inserting source roles block:', error);
		new Notice(`Failed to add source roles block: ${message}`);
	}
}

export async function insertMembersBlock(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const content = await plugin.app.vault.read(file);

		if (content.includes('```charted-roots-members')) {
			new Notice('Members block already exists in this note');
			return;
		}

		const blockLines = [
			'',
			'```charted-roots-members',
			'group-by: role',
			'```',
			''
		];

		// Append to end of file
		const newContent = content.trimEnd() + '\n' + blockLines.join('\n');
		await plugin.app.vault.modify(file, newContent);

		new Notice('Members block added');

	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('Error inserting members block:', error);
		new Notice(`Failed to add members block: ${message}`);
	}
}

export function showFolderStatistics(plugin: CanvasRootsPlugin, folder: TFolder): void {
	new FolderStatisticsModal(plugin.app, folder).open();
}

export async function openCanvasInFamilyChart(plugin: CanvasRootsPlugin, file: TFile): Promise<void> {
	try {
		const canvasContent = await plugin.app.vault.read(file);
		const canvasData = JSON.parse(canvasContent);
		const metadata = canvasData.metadata?.frontmatter;

		if ((metadata?.plugin !== 'charted-roots' && metadata?.plugin !== 'canvas-roots') || !metadata.generation?.rootCrId) {
			new Notice('This canvas does not contain Charted Roots tree data');
			return;
		}

		const rootCrId = metadata.generation.rootCrId;
		// Open in main workspace when triggered from canvas context menu
		await plugin.activateFamilyChartView(rootCrId, true);
	} catch (error) {
		logger.error('open-canvas-chart', 'Failed to open canvas in family chart', error);
		new Notice('Failed to read canvas file');
	}
}

