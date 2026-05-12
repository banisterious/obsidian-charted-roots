/**
 * Bulk Operations
 *
 * Extracted from main.ts — edit modals, reference numbering, lineage tracking,
 * tree/canvas generation, and dynamic block insertion.
 */

import { Notice, TFile, Menu, Modal } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { PersonPickerModal } from '../ui/person-picker';
import { MediaPickerModal } from '../core/ui/media-picker-modal';
import { CreatePlaceModal } from '../ui/create-place-modal';
import { CreateEventModal } from '../events/ui/create-event-modal';
import { CreatePersonModal } from '../ui/create-person-modal';
import { ControlCenterModal } from '../ui/control-center';
import { ReferenceNumberingService } from '../core/reference-numbering';
import type { NumberingSystem } from '../core/reference-numbering';
import { LineageTrackingService } from '../core/lineage-tracking';
import type { LineageType } from '../core/lineage-tracking';
import { EventService } from '../events/services/event-service';
import { CanvasGenerator } from '../core/canvas-generator';
import { formatCanvasJson } from '../core/canvas-utils';
import { ExcalidrawExporter } from '../excalidraw/excalidraw-exporter';
import { getErrorMessage } from '../core/error-utils';
import { isPlaceNote, isSourceNote, isEventNote, isPersonNote, isOrganizationNote } from '../utils/note-type-detection';
import { extractSourcedFactsFromFrontmatter } from '../core/person-note-writer';
import { promptLineageName } from './context-menus';
import { getLogger } from '../core/logging';
import { extractName, loadRelationships } from './relationship-loader';
import { createUniverseService } from '../universes/services/universe-service';
import { mergeUniverseList } from '../universes/services/merged-universe-list';

const logger = getLogger('bulk-operations');

export function openLinkMediaModal(plugin: CanvasRootsPlugin, file: TFile, entityType: string, entityName: string): void {
	const mediaService = plugin.getMediaService();
	if (!mediaService) {
		new Notice('Media service not available');
		return;
	}

	// Get existing media from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const existingMedia = mediaService.parseMediaProperty(cache?.frontmatter || {});

	new MediaPickerModal(
		plugin.app,
		mediaService,
		(selectedFiles) => {
			const ms = plugin.getMediaService();
			if (!ms) return;

			// Add each selected file as a wikilink
			void (async () => {
				for (const mediaFile of selectedFiles) {
					const wikilink = ms.pathToWikilink(mediaFile.path);
					await ms.addMediaToEntity(file, wikilink);
				}

				new Notice(`Linked ${selectedFiles.length} media file${selectedFiles.length !== 1 ? 's' : ''} to ${entityName}`);
			})();
		},
		{
			title: 'Link media',
			subtitle: `Select media files to link to ${entityName}`,
			multiSelect: true,
			existingMedia
		},
		plugin
	).open();
}

/**
 * Open the place edit modal for a place note
 */
export function openEditPlaceModal(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get the place cr_id from frontmatter
	const cache = plugin.app.metadataCache.getFileCache(file);
	const crId = cache?.frontmatter?.cr_id;

	if (!crId) {
		new Notice('Place note does not have a cr_id');
		return;
	}

	// Load the place from the place graph
	const placeGraph = plugin.createPlaceGraphService();
	void placeGraph.reloadCache();
	const place = placeGraph.getPlaceByCrId(crId);

	if (!place) {
		new Notice('Could not find place in graph');
		return;
	}

	// Get family graph for collection options
	const familyGraph = plugin.createFamilyGraphService();
	void familyGraph.reloadCache();

	// Open the modal in edit mode
	new CreatePlaceModal(plugin.app, {
		editPlace: place,
		editFile: file,
		familyGraph,
		placeGraph,
		settings: plugin.settings
	}).open();
}

/**
 * Open the event edit modal for an event note
 */
export function openEditEventModal(plugin: CanvasRootsPlugin, file: TFile): void {
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Event note does not have a cr_id');
		return;
	}

	// Get event from service
	const eventService = new EventService(plugin.app, plugin.settings);
	const event = eventService.getEventByFile(file);

	if (!event) {
		new Notice('Could not find event data');
		return;
	}

	// Open the edit modal
	new CreateEventModal(plugin.app, eventService, plugin.settings, {
		editEvent: event,
		editFile: file,
		onUpdated: () => {
			new Notice('Event updated');
		}
	}).open();
}

/**
 * Open the person edit modal for a person note
 */
export function openEditPersonModal(plugin: CanvasRootsPlugin, file: TFile): void {
	// Get frontmatter data
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;

	if (!fm?.cr_id) {
		new Notice('Person note does not have a cr_id');
		return;
	}

	// Create graph services for name-to-crId resolution during relationship
	// load, plus the universe merge below. The loader handles fallback
	// resolution for relationships whose `_id` frontmatter key is missing
	// while the wikilink field is populated (#403, #410).
	const familyGraph = plugin.createFamilyGraphService();
	const placeGraph = plugin.createPlaceGraphService();

	// Load all relationship fields (indexed + legacy spouse, children,
	// parents, singleton father/mother/adoptive) in one pass.
	const relationships = loadRelationships(fm, familyGraph, (name, count) => {
		logger.warn('edit-person-modal', `Ambiguous wikilink "${name}" resolves to ${count} persons; skipping auto-resolution`);
	});
	const {
		spouseNames, spouseIds, spouseMetadata,
		childNames, childIds,
		parentNames, parentIds,
		fatherName, fatherId,
		motherName, motherId,
		adoptiveFatherName, adoptiveFatherId,
		adoptiveMotherName, adoptiveMotherId,
		stepfatherName, stepfatherId,
		stepmotherName, stepmotherId
	} = relationships;

	// Extract sources names/IDs
	const sourceNames: string[] = [];
	const sourceIds: string[] = [];
	if (fm.sources) {
		const sources = Array.isArray(fm.sources) ? fm.sources : [fm.sources];
		for (const s of sources) {
			const name = extractName(String(s));
			if (name) sourceNames.push(name);
		}
	}
	if (fm.sources_id) {
		const ids = Array.isArray(fm.sources_id) ? fm.sources_id : [fm.sources_id];
		for (const id of ids) {
			sourceIds.push(String(id));
		}
	}

	// Extract fact-level source attributions (#512). The helper handles
	// pipe-aliased wikilinks correctly — the previous inline regex passed
	// "basename|alias" through with the pipe intact.
	const sourcedFacts = extractSourcedFactsFromFrontmatter(fm as Record<string, unknown>);

	// Merge universes from three sources via the shared helper so the Edit
	// Person dropdown always reflects every universe the user has defined or
	// referenced. The earlier two-source merge here dropped the universe
	// note's typed `name` after a rename when sanitization stripped chars
	// from the basename — e.g. `Star Wars (AU)` typed name vanished while
	// the cascaded `Star Wars AU` basename was the only option offered
	// (#505).
	const universeService = createUniverseService(plugin);
	const allUniverses = mergeUniverseList({
		universeNoteNames: universeService.getAllUniverses().map(u => u.name),
		personUniverses: familyGraph.getAllUniverses(),
		placeUniverses: placeGraph.getAllUniverses(),
	});

	// Open the modal in edit mode
	new CreatePersonModal(plugin.app, {
		editFile: file,
		editPersonData: {
			crId: String(fm.cr_id),
			name: String(fm.name || ''),
			personType: fm.personType,
			gender: fm.gender || fm.sex,
			pronouns: fm.pronouns,
			nickname: fm.nickname,
			// Name components (#174, #192)
			givenName: fm.given_name,
			surnames: Array.isArray(fm.surnames) ? fm.surnames : (fm.surnames ? [fm.surnames] : undefined),
			maidenName: fm.maiden_name,
			marriedNames: Array.isArray(fm.married_names) ? fm.married_names : (fm.married_names ? [fm.married_names] : undefined),
			// Dates and places
			born: fm.born,
			died: fm.died,
			birthPlace: fm.birth_place,
			deathPlace: fm.death_place,
			birthPlaceId: fm.birth_place_id,
			birthPlaceName: extractName(fm.birth_place),
			deathPlaceId: fm.death_place_id,
			deathPlaceName: extractName(fm.death_place),
			occupation: fm.occupation,
			researchLevel: typeof fm.research_level === 'number' ? fm.research_level : undefined,
			fatherId: fatherId,
			fatherName: fatherName,
			motherId: motherId,
			motherName: motherName,
			adoptiveFatherId: adoptiveFatherId,
			adoptiveFatherName: adoptiveFatherName,
			adoptiveMotherId: adoptiveMotherId,
			adoptiveMotherName: adoptiveMotherName,
			stepfatherId: stepfatherId,
			stepfatherName: stepfatherName,
			stepmotherId: stepmotherId,
			stepmotherName: stepmotherName,
			spouseIds: spouseIds.length > 0 ? spouseIds : undefined,
			spouseNames: spouseNames.length > 0 ? spouseNames : undefined,
			spouseMetadata: spouseMetadata.length > 0 ? spouseMetadata : undefined,
			childIds: childIds.length > 0 ? childIds : undefined,
			childNames: childNames.length > 0 ? childNames : undefined,
			sourceIds: sourceIds.length > 0 ? sourceIds : undefined,
			sourceNames: sourceNames.length > 0 ? sourceNames : undefined,
			parentIds: parentIds.length > 0 ? parentIds : undefined,
			parentNames: parentNames.length > 0 ? parentNames : undefined,
			collection: fm.collection,
			universe: fm.universe,
			// DNA tracking fields
			dnaSharedCm: typeof fm.dna_shared_cm === 'number' ? fm.dna_shared_cm : undefined,
			dnaTestingCompany: fm.dna_testing_company,
			dnaKitId: fm.dna_kit_id,
			dnaMatchType: fm.dna_match_type,
			dnaEndogamyFlag: typeof fm.dna_endogamy_flag === 'boolean' ? fm.dna_endogamy_flag : undefined,
			dnaNotes: fm.dna_notes,
			// Fact-level source attributions (#512). Helper returns undefined
			// when no sourced_* properties are present.
			sourcedFacts
		},
		familyGraph,
		placeGraph,
		settings: plugin.settings,
		propertyAliases: plugin.settings.propertyAliases,
		existingUniverses: allUniverses,
		plugin: plugin
	}).open();
}

/**
 * Prompt user to select a person and assign reference numbers
 */
export function promptAssignReferenceNumbers(plugin: CanvasRootsPlugin, system: NumberingSystem): void {
	const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
		void (async () => {
			try {
				const service = new ReferenceNumberingService(plugin.app);
				let stats;

				new Notice(`Assigning ${system} numbers from ${selectedPerson.name}...`);

				switch (system) {
					case 'ahnentafel':
						stats = await service.assignAhnentafel(selectedPerson.crId);
						break;
					case 'daboville':
						stats = await service.assignDAboville(selectedPerson.crId);
						break;
					case 'henry':
						stats = await service.assignHenry(selectedPerson.crId);
						break;
					case 'generation':
						stats = await service.assignGeneration(selectedPerson.crId);
						break;
				}

				new Notice(`Assigned ${stats.totalAssigned} ${system} numbers from ${stats.rootPerson}`);
			} catch (error) {
				logger.error('reference-numbering', `Failed to assign ${system} numbers`, error);
				new Notice(`Failed to assign numbers: ${getErrorMessage(error)}`);
			}
		})();
	});
	picker.open();
}

/**
 * Prompt user to select a numbering system and clear those numbers
 */
export function promptClearReferenceNumbers(plugin: CanvasRootsPlugin): void {
	const systemChoices: { system: NumberingSystem; label: string }[] = [
		{ system: 'ahnentafel', label: 'Ahnentafel numbers' },
		{ system: 'daboville', label: "d'Aboville numbers" },
		{ system: 'henry', label: 'Henry numbers' },
		{ system: 'generation', label: 'Generation numbers' }
	];

	const menu = new Menu();
	for (const choice of systemChoices) {
		menu.addItem((item) => {
			item
				.setTitle(`Clear ${choice.label}`)
				.setIcon('trash-2')
				.onClick(async () => {
					try {
						const service = new ReferenceNumberingService(plugin.app);
						new Notice(`Clearing ${choice.label}...`);
						const count = await service.clearNumbers(choice.system);
						new Notice(`Cleared ${count} ${choice.label}`);
					} catch (error) {
						logger.error('clear-numbers', `Failed to clear ${choice.label}`, error);
						new Notice(`Failed to clear numbers: ${getErrorMessage(error)}`);
					}
				});
		});
	}
	menu.showAtMouseEvent(new MouseEvent('click'));
}

/**
 * Prompt user to select a person and lineage type, then assign lineage
 */
export function promptAssignLineage(plugin: CanvasRootsPlugin): void {
	const picker = new PersonPickerModal(plugin.app, (selectedPerson) => {
		void (async () => {
			// Show lineage type selection
			const lineageType = await promptLineageType(plugin);
			if (!lineageType) return;

			// Prompt for lineage name
			const lineageName = await promptLineageName(plugin, selectedPerson.name);
			if (!lineageName) return;

			try {
				const service = new LineageTrackingService(plugin.app);
				new Notice(`Assigning "${lineageName}" lineage from ${selectedPerson.name}...`);

				const stats = await service.assignLineage({
					name: lineageName,
					rootCrId: selectedPerson.crId,
					type: lineageType
				});

				new Notice(`Assigned "${lineageName}" to ${stats.totalMembers} descendants (${stats.maxGeneration} generations)`);
			} catch (error) {
				logger.error('lineage-tracking', 'Failed to assign lineage', error);
				new Notice(`Failed to assign lineage: ${getErrorMessage(error)}`);
			}
		})();
	});
	picker.open();
}

/**
 * Prompt user to select and remove a lineage
 */
export function promptRemoveLineage(plugin: CanvasRootsPlugin): void {
	try {
		const service = new LineageTrackingService(plugin.app);
		const lineages = service.getAllLineages();

		if (lineages.length === 0) {
			new Notice('No lineages found in vault');
			return;
		}

		const menu = new Menu();
		for (const lineage of lineages) {
			menu.addItem((item) => {
				item
					.setTitle(`Remove "${lineage}"`)
					.setIcon('trash-2')
					.onClick(async () => {
						try {
							new Notice(`Removing "${lineage}" lineage...`);
							const count = await service.removeLineage(lineage);
							new Notice(`Removed "${lineage}" from ${count} people`);
						} catch (error) {
							logger.error('lineage-tracking', 'Failed to remove lineage', error);
							new Notice(`Failed to remove lineage: ${getErrorMessage(error)}`);
						}
					});
			});
		}
		menu.showAtMouseEvent(new MouseEvent('click'));
	} catch (error) {
		logger.error('lineage-tracking', 'Failed to get lineages', error);
		new Notice(`Failed to get lineages: ${getErrorMessage(error)}`);
	}
}

/**
 * Prompt user to select a lineage type
 */
export async function promptLineageType(plugin: CanvasRootsPlugin): Promise<LineageType | null> {
	return new Promise((resolve) => {
		const modal = new Modal(plugin.app);
		modal.titleEl.setText('Select lineage type');

		modal.contentEl.createEl('p', {
			text: 'How should descendants be traced?'
		});

		const buttonContainer = modal.contentEl.createDiv({ cls: 'cr-prompt-buttons' });

		const allBtn = buttonContainer.createEl('button', {
			text: 'All descendants',
			cls: 'mod-cta'
		});
		allBtn.addEventListener('click', () => {
			modal.close();
			resolve('all');
		});

		const patriBtn = buttonContainer.createEl('button', {
			text: 'Patrilineal'
		});
		patriBtn.addEventListener('click', () => {
			modal.close();
			resolve('patrilineal');
		});

		const matriBtn = buttonContainer.createEl('button', {
			text: 'Matrilineal'
		});
		matriBtn.addEventListener('click', () => {
			modal.close();
			resolve('matrilineal');
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

export function generateTreeForCurrentNote(plugin: CanvasRootsPlugin): void {
	const activeFile = plugin.app.workspace.getActiveFile();

	if (!activeFile) {
		new Notice('No active note. Please open a person note first.');
		return;
	}

	// Check if the active file is a person note (has cr_id)
	const cache = plugin.app.metadataCache.getFileCache(activeFile);
	if (!cache?.frontmatter?.cr_id) {
		new Notice('Current note is not a person note (missing cr_id field)');
		return;
	}

	// Open Control Center with this person pre-selected
	const modal = new ControlCenterModal(plugin.app, plugin);
	modal.openWithPerson(activeFile);
}

export async function regenerateCanvas(plugin: CanvasRootsPlugin, canvasFile: TFile, direction?: 'vertical' | 'horizontal') {
	try {
		new Notice('Regenerating canvas...');

		// 1. Read current Canvas JSON
		const canvasContent = await plugin.app.vault.read(canvasFile);
		const canvasData = JSON.parse(canvasContent);

		if (!canvasData.nodes || canvasData.nodes.length === 0) {
			new Notice('Canvas is empty - nothing to regenerate');
			return;
		}

		// 2. Try to read original generation metadata from canvas
		const storedMetadata = canvasData.metadata?.frontmatter;
		const isCanvasRootsTree = storedMetadata?.plugin === 'charted-roots' || storedMetadata?.plugin === 'canvas-roots';

		// 3. Extract person note nodes (file nodes only)
		const personNodes = canvasData.nodes.filter(
			(node: { type: string; file?: string }) =>
				node.type === 'file' && node.file?.endsWith('.md')
		);

		if (personNodes.length === 0) {
			new Notice('No person notes found in canvas');
			return;
		}

		// 4. Determine root person and tree parameters
		let rootCrId: string | undefined;
		let rootPersonName: string | undefined;
		let treeType: 'full' | 'ancestors' | 'descendants' = 'full';
		let maxGenerations: number | undefined;
		let includeSpouses: boolean = true;

		if (isCanvasRootsTree && storedMetadata.generation) {
			// Use stored metadata if available
			rootCrId = storedMetadata.generation.rootCrId;
			rootPersonName = storedMetadata.generation.rootPersonName;
			treeType = storedMetadata.generation.treeType;
			maxGenerations = storedMetadata.generation.maxGenerations || undefined;
			includeSpouses = storedMetadata.generation.includeSpouses;
		} else {
			// Fallback: find first node with cr_id
			for (const node of personNodes) {
				const file = plugin.app.vault.getAbstractFileByPath(node.file);
				if (file instanceof TFile) {
					const cache = plugin.app.metadataCache.getFileCache(file);
					if (cache?.frontmatter?.cr_id) {
						rootCrId = cache.frontmatter.cr_id;
						rootPersonName = file.basename;
						break;
					}
				}
			}

			if (!rootCrId || !rootPersonName) {
				new Notice('No person notes with cr_id found in canvas');
				return;
			}

			// Default to full tree for canvases without metadata
			treeType = 'full';
			maxGenerations = undefined;
			includeSpouses = true;
		}

		// Validate we have root person info before proceeding
		if (!rootCrId || !rootPersonName) {
			new Notice('No person notes with cr_id found in canvas');
			return;
		}

		// 5. Build family tree using original parameters
		const graphService = plugin.createFamilyGraphService();
		const familyTree = graphService.generateTree({
			rootCrId,
			treeType,
			maxGenerations,
			includeSpouses
		});

		if (!familyTree) {
			new Notice('Failed to build family tree from canvas nodes');
			return;
		}

		// 6. Determine layout settings (prefer stored, fall back to current settings)
		const nodeWidth = storedMetadata?.layout?.nodeWidth ?? plugin.settings.defaultNodeWidth;
		const nodeHeight = storedMetadata?.layout?.nodeHeight ?? plugin.settings.defaultNodeHeight;
		const nodeSpacingX = storedMetadata?.layout?.nodeSpacingX ?? plugin.settings.horizontalSpacing;
		const nodeSpacingY = storedMetadata?.layout?.nodeSpacingY ?? plugin.settings.verticalSpacing;
		const originalDirection = storedMetadata?.generation?.direction ?? 'vertical';

		// 7. Recalculate layout preserving original parameters (except direction if user changed it)
		const canvasGenerator = new CanvasGenerator();

		// Convert plural tree type (from TreeOptions) to singular (for LayoutOptions)
		const layoutTreeType: 'ancestor' | 'descendant' | 'full' =
			treeType === 'ancestors' ? 'ancestor' :
			treeType === 'descendants' ? 'descendant' :
			'full';

		// Preserve style overrides from stored metadata if present
		const styleOverrides = storedMetadata?.styleOverrides;

		const newCanvasData = canvasGenerator.generateCanvas(familyTree, {
			nodeSpacingX,
			nodeSpacingY,
			nodeWidth,
			nodeHeight,
			direction: direction ?? originalDirection,
			treeType: layoutTreeType,
			nodeColorScheme: plugin.settings.nodeColorScheme,
			showLabels: true,
			useFamilyChartLayout: true,
			parentChildArrowStyle: plugin.settings.parentChildArrowStyle,
			spouseArrowStyle: plugin.settings.spouseArrowStyle,
			parentChildEdgeColor: plugin.settings.parentChildEdgeColor,
			spouseEdgeColor: plugin.settings.spouseEdgeColor,
			showSpouseEdges: plugin.settings.showSpouseEdges,
			spouseEdgeLabelFormat: plugin.settings.spouseEdgeLabelFormat,
			showSourceIndicators: plugin.settings.showSourceIndicators,
			showResearchCoverage: plugin.settings.trackFactSourcing,
			canvasRootsMetadata: {
				plugin: 'charted-roots',
				generation: {
					rootCrId: rootCrId,
					rootPersonName: rootPersonName,
					treeType: treeType,
					maxGenerations: maxGenerations || 0,
					includeSpouses,
					direction: direction ?? originalDirection,
					timestamp: Date.now()
				},
				layout: {
					nodeWidth,
					nodeHeight,
					nodeSpacingX,
					nodeSpacingY
				},
				// Preserve style overrides during regeneration
				styleOverrides: styleOverrides
			}
		});

		// 6. Update Canvas JSON with new data (preserves any non-person nodes)
		const updatedCanvasData = {
			...canvasData,
			nodes: newCanvasData.nodes,
			edges: newCanvasData.edges,
			metadata: newCanvasData.metadata
		};

		// 7. Format and write back to Canvas file (using same formatting as Control Center)
		const formattedJson = formatCanvasJson(updatedCanvasData);
		await plugin.app.vault.modify(canvasFile, formattedJson);

		new Notice(`Canvas regenerated successfully! (${newCanvasData.nodes.length} people)`);
	} catch (error: unknown) {
		console.error('Error regenerating canvas:', error);
		new Notice('Failed to regenerate canvas. Check console for details.');
	}
}
export function createPersonNote(plugin: CanvasRootsPlugin) {
	const familyGraph = plugin.createFamilyGraphService();

	new CreatePersonModal(plugin.app, {
		directory: plugin.settings.peopleFolder || '',
		familyGraph,
		propertyAliases: plugin.settings.propertyAliases,
		plugin: plugin,
		onCreated: (file) => {
			// Track the newly created person in recent files
			const recentService = plugin.getRecentFilesService();
			if (recentService) {
				void recentService.trackFile(file, 'person');
			}
		}
	}).open();
}

export async function generateAllTrees(plugin: CanvasRootsPlugin) {
	new Notice('Finding all family groups...');

	try {
		// Open Control Center to generate all trees
		const modal = new ControlCenterModal(plugin.app, plugin);
		await modal.openAndGenerateAllTrees();
	} catch (error: unknown) {
		console.error('Error generating all trees:', error);
		new Notice('Failed to generate all trees. Check console for details.');
	}
}

/**
 * Insert dynamic content blocks into person note(s)
 * Adds charted-roots-timeline and charted-roots-relationships code blocks
 */
export async function insertDynamicBlocks(plugin: CanvasRootsPlugin, files: TFile[]): Promise<void> {
	// For bulk operations (10+ files), show progress
	const showProgress = files.length >= 10;
	let progressNotice: Notice | null = null;

	if (showProgress) {
		progressNotice = new Notice(
			`Inserting dynamic blocks: 0/${files.length}...`,
			0 // Don't auto-dismiss
		);
	}

	try {
		let addedCount = 0;
		let skippedCount = 0;
		let errorCount = 0;
		let processedCount = 0;

		for (const file of files) {
			try {
				// Check if this note has cr_id
				const cache = plugin.app.metadataCache.getFileCache(file);
				if (!cache?.frontmatter?.cr_id) {
					skippedCount++;
					processedCount++;
					continue;
				}

				const content = await plugin.app.vault.read(file);
				const blocksToAdd: string[] = [];
				const detectionSettings = plugin.settings.noteTypeDetection;

				const fm = cache.frontmatter;

				if (isOrganizationNote(fm, cache, detectionSettings)) {
					// Organization note: insert members block (#268)
					const hasMembers = content.includes('```charted-roots-members');
					if (hasMembers) {
						skippedCount++;
						processedCount++;
						continue;
					}
					blocksToAdd.push('```charted-roots-members');
					blocksToAdd.push('group-by: role');
					blocksToAdd.push('```');
					blocksToAdd.push('');
				} else if (isPersonNote(fm, cache, detectionSettings)) {
					// Person note: insert relationships, timeline, media blocks
					const hasRelationships = content.includes('```charted-roots-relationships') || content.includes('```canvas-roots-relationships');
					const hasTimeline = content.includes('```charted-roots-timeline') || content.includes('```canvas-roots-timeline');
					const hasMedia = content.includes('```charted-roots-media') || content.includes('```canvas-roots-media');

					if (hasRelationships && hasTimeline && hasMedia) {
						skippedCount++;
						processedCount++;
						continue;
					}

					if (!hasRelationships) {
						blocksToAdd.push('```charted-roots-relationships');
						blocksToAdd.push('type: immediate');
						blocksToAdd.push('```');
						blocksToAdd.push('');
					}

					if (!hasTimeline) {
						blocksToAdd.push('```charted-roots-timeline');
						blocksToAdd.push('sort: chronological');
						blocksToAdd.push('```');
						blocksToAdd.push('');
					}

					if (!hasMedia) {
						blocksToAdd.push('```charted-roots-media');
						blocksToAdd.push('columns: 3');
						blocksToAdd.push('size: medium');
						blocksToAdd.push('editable: true');
						blocksToAdd.push('```');
						blocksToAdd.push('');
					}
				} else if (
					isEventNote(fm, cache, detectionSettings) ||
					isPlaceNote(fm, cache, detectionSettings) ||
					isSourceNote(fm, cache, detectionSettings)
				) {
					// Event/Place/Source notes: media block only (#269)
					const hasMedia = content.includes('```charted-roots-media') || content.includes('```canvas-roots-media');
					if (hasMedia) {
						skippedCount++;
						processedCount++;
						continue;
					}
					blocksToAdd.push('```charted-roots-media');
					blocksToAdd.push('columns: 3');
					blocksToAdd.push('size: medium');
					blocksToAdd.push('editable: true');
					blocksToAdd.push('```');
					blocksToAdd.push('');
				} else {
					// Unknown entity type — skip
					skippedCount++;
					processedCount++;
					continue;
				}

				if (blocksToAdd.length === 0) {
					skippedCount++;
					processedCount++;
					continue;
				}

				// Find insertion point after frontmatter
				const frontmatterEnd = content.indexOf('---', 3);
				if (frontmatterEnd === -1) {
					// No frontmatter, add at start
					const newContent = blocksToAdd.join('\n') + '\n' + content;
					await plugin.app.vault.modify(file, newContent);
				} else {
					// Insert after frontmatter
					const insertPoint = frontmatterEnd + 3;
					const before = content.slice(0, insertPoint);
					const after = content.slice(insertPoint);
					// Ensure proper spacing
					const newContent = before + '\n\n' + blocksToAdd.join('\n') + after;
					await plugin.app.vault.modify(file, newContent);
				}

				addedCount++;
				processedCount++;

				// Update progress notice every 5 files or at the end
				if (progressNotice && (processedCount % 5 === 0 || processedCount === files.length)) {
					progressNotice.setMessage(
						`Inserting dynamic blocks: ${processedCount}/${files.length} (${addedCount} added)...`
					);
				}

			} catch (error: unknown) {
				console.error(`Error adding dynamic blocks to ${file.path}:`, error);
				errorCount++;
				processedCount++;
			}
		}

		// Hide progress notice
		if (progressNotice) {
			progressNotice.hide();
		}

		// Show summary
		if (files.length === 1) {
			if (addedCount === 1) {
				new Notice('Added dynamic content blocks');
			} else if (skippedCount === 1) {
				new Notice('Note already has dynamic blocks or is not a supported note type');
			} else {
				new Notice('Failed to add dynamic blocks');
			}
		} else {
			const parts = [];
			if (addedCount > 0) parts.push(`${addedCount} updated`);
			if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
			if (errorCount > 0) parts.push(`${errorCount} errors`);
			new Notice(`Dynamic blocks: ${parts.join(', ')}`);
		}

	} catch (error: unknown) {
		// Hide progress notice on error
		if (progressNotice) {
			progressNotice.hide();
		}
		console.error('Error inserting dynamic blocks:', error);
		new Notice('Failed to add dynamic blocks');
	}
}

/**
 * Generate an Excalidraw tree directly from a person note
 * Uses default settings for quick generation
 */
export async function generateExcalidrawTreeForPerson(plugin: CanvasRootsPlugin, personFile: TFile) {
	try {
		new Notice('Generating Excalidraw tree...');

		// Get person info from file metadata
		const cache = plugin.app.metadataCache.getFileCache(personFile);
		if (!cache?.frontmatter?.cr_id) {
			new Notice('Invalid person note: missing cr_id');
			return;
		}

		const rootCrId = cache.frontmatter.cr_id;
		const rootName = cache.frontmatter.name || personFile.basename;

		// Generate tree with default settings
		const graphService = plugin.createFamilyGraphService();
		const familyTree = graphService.generateTree({
			rootCrId,
			treeType: 'full',
			maxGenerations: 5,
			includeSpouses: true
		});

		if (!familyTree) {
			new Notice('Failed to generate tree: root person not found');
			return;
		}

		// Generate canvas with default options
		const canvasGenerator = new CanvasGenerator();
		const canvasData = canvasGenerator.generateCanvas(familyTree, {
			direction: 'vertical',
			nodeSpacingX: 300,
			nodeSpacingY: 200,
			layoutType: plugin.settings.defaultLayoutType,
			nodeColorScheme: plugin.settings.nodeColorScheme,
			showLabels: true,
			useFamilyChartLayout: true,
			parentChildArrowStyle: plugin.settings.parentChildArrowStyle,
			spouseArrowStyle: plugin.settings.spouseArrowStyle,
			parentChildEdgeColor: plugin.settings.parentChildEdgeColor,
			spouseEdgeColor: plugin.settings.spouseEdgeColor,
			showSpouseEdges: plugin.settings.showSpouseEdges,
			spouseEdgeLabelFormat: plugin.settings.spouseEdgeLabelFormat,
			showSourceIndicators: plugin.settings.showSourceIndicators,
			showResearchCoverage: plugin.settings.trackFactSourcing
		});

		// Create temporary canvas file
		const tempCanvasName = `temp-${Date.now()}.canvas`;
		const tempCanvasPath = `${personFile.parent?.path || ''}/${tempCanvasName}`;
		const tempCanvasFile = await plugin.app.vault.create(tempCanvasPath, JSON.stringify(canvasData, null, '\t'));

		// Export to Excalidraw
		const exporter = new ExcalidrawExporter(plugin.app);
		const result = await exporter.exportToExcalidraw({
			canvasFile: tempCanvasFile,
			preserveColors: true,
			fontSize: 16,
			strokeWidth: 2
		});

		// Delete temporary canvas file (respects user's deletion preference)
		await plugin.app.fileManager.trashFile(tempCanvasFile);

		if (!result.success) {
			new Notice(`Export failed: ${result.errors.join(', ')}`);
			return;
		}

		// Save Excalidraw file to vault root
		const outputFileName = `Family Tree - ${rootName}.excalidraw.md`;

		// Check if file exists and create unique name if needed
		let finalPath = outputFileName;
		let counter = 1;
		while (plugin.app.vault.getAbstractFileByPath(finalPath)) {
			finalPath = `Family Tree - ${rootName} (${counter}).excalidraw.md`;
			counter++;
		}

		await plugin.app.vault.create(finalPath, result.excalidrawContent!);

		new Notice(`Generated Excalidraw tree with ${result.elementsExported} elements`);

		// Open the newly created file
		const excalidrawFile = plugin.app.vault.getAbstractFileByPath(finalPath);
		if (excalidrawFile instanceof TFile) {
			const leaf = plugin.app.workspace.getLeaf(false);
			await leaf.openFile(excalidrawFile);
		}
	} catch (error: unknown) {
		console.error('Error generating Excalidraw tree:', error);
		new Notice(`Failed to generate Excalidraw tree: ${getErrorMessage(error)}`);
	}
}
