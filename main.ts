import { Plugin, Notice, TFile, TFolder, Menu, Platform, Modal } from 'obsidian';
import { CanvasRootsSettings, DEFAULT_SETTINGS, CanvasRootsSettingTab } from './src/settings';
import { ControlCenterModal } from './src/ui/control-center';
import { RegenerateOptionsModal } from './src/ui/regenerate-options-modal';
import { TreeStatisticsModal } from './src/ui/tree-statistics-modal';
import { PersonPickerModal } from './src/ui/person-picker';
import { RelationshipManager } from './src/core/relationship-manager';
import { LoggerFactory } from './src/core/logging';
import { FamilyGraphService } from './src/core/family-graph';
import { CanvasGenerator } from './src/core/canvas-generator';
import { BASE_TEMPLATE } from './src/constants/base-template';

export default class CanvasRootsPlugin extends Plugin {
	settings: CanvasRootsSettings;

	async onload() {
		console.log('Loading Canvas Roots plugin');

		await this.loadSettings();

		// Initialize logger with saved log level
		LoggerFactory.setLogLevel(this.settings.logLevel);

		// Add settings tab
		this.addSettingTab(new CanvasRootsSettingTab(this.app, this));

		// Add ribbon icon for Control Center
		this.addRibbonIcon('users', 'Open Canvas Roots Control Center', () => {
			new ControlCenterModal(this.app, this).open();
		});

		// Add command: Open Control Center
		this.addCommand({
			id: 'open-control-center',
			name: 'Open control center',
			callback: () => {
				new ControlCenterModal(this.app, this).open();
			}
		});

		// Add command: Generate Tree for Current Note
		this.addCommand({
			id: 'generate-tree-for-current-note',
			name: 'Generate tree for current note',
			callback: () => {
				this.generateTreeForCurrentNote();
			}
		});

		// Add command: Regenerate Canvas
		this.addCommand({
			id: 'regenerate-canvas',
			name: 'Regenerate canvas',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile();

				if (!activeFile || activeFile.extension !== 'canvas') {
					new Notice('No active canvas. Please open a canvas file first.');
					return;
				}

				// Show options modal
				new RegenerateOptionsModal(this.app, this, activeFile).open();
			}
		});

		// Add command: Create Person Note
		this.addCommand({
			id: 'create-person-note',
			name: 'Create person note',
			callback: () => {
				this.createPersonNote();
			}
		});

		// Add command: Generate All Trees (for multi-family vaults)
		this.addCommand({
			id: 'generate-all-trees',
			name: 'Generate all trees',
			callback: () => {
				this.generateAllTrees();
			}
		});

		// Add command: Create Base Template
		this.addCommand({
			id: 'create-base-template',
			name: 'Create Base template',
			callback: () => {
				this.createBaseTemplate();
			}
		});

		// Add context menu items for person notes, canvas files, and folders
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				// Only show submenus on desktop (mobile doesn't support them)
				const useSubmenu = Platform.isDesktop && !Platform.isMobile;

				// Canvas files: Regenerate canvas
				if (file instanceof TFile && file.extension === 'canvas') {
					menu.addSeparator();

					if (useSubmenu) {
						menu.addItem((item) => {
							const submenu: Menu = item
								.setTitle('Canvas Roots')
								.setIcon('git-fork')
								.setSubmenu();

							submenu.addItem((subItem) => {
								subItem
									.setTitle('Regenerate canvas')
									.setIcon('refresh-cw')
									.onClick(async () => {
										// Open the canvas file first
										const leaf = this.app.workspace.getLeaf(false);
										await leaf.openFile(file);

										// Give canvas a moment to load
										await new Promise(resolve => setTimeout(resolve, 100));

										// Show options modal
										new RegenerateOptionsModal(this.app, this, file).open();
									});
							});

							submenu.addItem((subItem) => {
								subItem
									.setTitle('Show tree statistics')
									.setIcon('bar-chart')
									.onClick(async () => {
										new TreeStatisticsModal(this.app, file).open();
									});
							});
						});
					} else {
						// Mobile: flat menu with prefix
						menu.addItem((item) => {
							item
								.setTitle('Canvas Roots: Regenerate canvas')
								.setIcon('refresh-cw')
								.onClick(async () => {
									const leaf = this.app.workspace.getLeaf(false);
									await leaf.openFile(file);
									await new Promise(resolve => setTimeout(resolve, 100));
									new RegenerateOptionsModal(this.app, this, file).open();
								});
						});

						menu.addItem((item) => {
							item
								.setTitle('Canvas Roots: Show tree statistics')
								.setIcon('bar-chart')
								.onClick(async () => {
									new TreeStatisticsModal(this.app, file).open();
								});
						});
					}
				}

				// Person notes: Generate family tree
				if (file instanceof TFile && file.extension === 'md') {
					const cache = this.app.metadataCache.getFileCache(file);
					if (cache?.frontmatter?.cr_id) {
						menu.addSeparator();

						if (useSubmenu) {
							menu.addItem((item) => {
								const submenu: Menu = item
									.setTitle('Canvas Roots')
									.setIcon('git-fork')
									.setSubmenu();

								submenu.addItem((subItem) => {
									subItem
										.setTitle('Generate family tree')
										.setIcon('git-fork')
										.onClick(async () => {
											const modal = new ControlCenterModal(this.app, this);
											await modal.openWithPerson(file);
										});
								});

								// Add relationship submenu
								const relationshipSubmenu = submenu.addItem((subItem) => {
									return subItem
										.setTitle('Add relationship...')
										.setIcon('user-plus')
										.setSubmenu();
								});

								relationshipSubmenu.addItem((relItem) => {
									relItem
										.setTitle('Add parent')
										.setIcon('user')
										.onClick(() => {
											const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
												const relationshipMgr = new RelationshipManager(this.app);

												// Ask which parent type
												const parentType = await this.promptParentType();
												if (parentType) {
													await relationshipMgr.addParentRelationship(
														file,
														selectedPerson.file,
														parentType
													);
												}
											});
											picker.open();
										});
								});

								relationshipSubmenu.addItem((relItem) => {
									relItem
										.setTitle('Add spouse')
										.setIcon('heart')
										.onClick(() => {
											const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
												const relationshipMgr = new RelationshipManager(this.app);
												await relationshipMgr.addSpouseRelationship(file, selectedPerson.file);
											});
											picker.open();
										});
								});

								relationshipSubmenu.addItem((relItem) => {
									relItem
										.setTitle('Add child')
										.setIcon('baby')
										.onClick(() => {
											const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
												const relationshipMgr = new RelationshipManager(this.app);
												await relationshipMgr.addChildRelationship(file, selectedPerson.file);
											});
											picker.open();
										});
								});
							});
						} else {
							// Mobile: flat menu with prefix
							menu.addItem((item) => {
								item
									.setTitle('Canvas Roots: Generate family tree')
									.setIcon('git-fork')
									.onClick(async () => {
										const modal = new ControlCenterModal(this.app, this);
										await modal.openWithPerson(file);
									});
							});

							menu.addItem((item) => {
								item
									.setTitle('Canvas Roots: Add parent')
									.setIcon('user')
									.onClick(() => {
										const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
											const relationshipMgr = new RelationshipManager(this.app);
											const parentType = await this.promptParentType();
											if (parentType) {
												await relationshipMgr.addParentRelationship(
													file,
													selectedPerson.file,
													parentType
												);
											}
										});
										picker.open();
									});
							});

							menu.addItem((item) => {
								item
									.setTitle('Canvas Roots: Add spouse')
									.setIcon('heart')
									.onClick(() => {
										const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
											const relationshipMgr = new RelationshipManager(this.app);
											await relationshipMgr.addSpouseRelationship(file, selectedPerson.file);
										});
										picker.open();
									});
							});

							menu.addItem((item) => {
								item
									.setTitle('Canvas Roots: Add child')
									.setIcon('baby')
									.onClick(() => {
										const picker = new PersonPickerModal(this.app, async (selectedPerson) => {
											const relationshipMgr = new RelationshipManager(this.app);
											await relationshipMgr.addChildRelationship(file, selectedPerson.file);
										});
										picker.open();
									});
							});
						}
					}
				}

				// Folders: Set as people folder
				if (file instanceof TFolder) {
					menu.addSeparator();

					if (useSubmenu) {
						menu.addItem((item) => {
							const submenu: Menu = item
								.setTitle('Canvas Roots')
								.setIcon('git-fork')
								.setSubmenu();

							submenu.addItem((subItem) => {
								subItem
									.setTitle('Set as people folder')
									.setIcon('users')
									.onClick(async () => {
										this.settings.peopleFolder = file.path;
										await this.saveSettings();
										new Notice(`People folder set to: ${file.path}`);
									});
							});

							submenu.addItem((subItem) => {
								subItem
									.setTitle('Import GEDCOM to this folder')
									.setIcon('upload')
									.onClick(async () => {
										// Set this folder as the people folder
										this.settings.peopleFolder = file.path;
										await this.saveSettings();

										// Open Control Center to GEDCOM tab
										const modal = new ControlCenterModal(this.app, this);
										modal.openToTab('gedcom');
									});
							});
						});
					} else {
						// Mobile: flat menu with prefix
						menu.addItem((item) => {
							item
								.setTitle('Canvas Roots: Set as people folder')
								.setIcon('users')
								.onClick(async () => {
									this.settings.peopleFolder = file.path;
									await this.saveSettings();
									new Notice(`People folder set to: ${file.path}`);
								});
						});

						menu.addItem((item) => {
							item
								.setTitle('Canvas Roots: Import GEDCOM to this folder')
								.setIcon('upload')
								.onClick(async () => {
									// Set this folder as the people folder
									this.settings.peopleFolder = file.path;
									await this.saveSettings();

									// Open Control Center to GEDCOM tab
									const modal = new ControlCenterModal(this.app, this);
									modal.openToTab('gedcom');
								});
						});
					}
				}
			})
		);
	}

	async onunload() {
		console.log('Unloading Canvas Roots plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Prompt user to select parent type (father or mother)
	 * Returns 'father', 'mother', or null if cancelled
	 */
	private async promptParentType(): Promise<'father' | 'mother' | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Select parent type');

			modal.contentEl.createEl('p', {
				text: 'Is this person the father or mother?'
			});

			const buttonContainer = modal.contentEl.createDiv({ cls: 'modal-button-container' });
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '8px';
			buttonContainer.style.justifyContent = 'flex-end';
			buttonContainer.style.marginTop = '16px';

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

	private async generateTreeForCurrentNote() {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('No active note. Please open a person note first.');
			return;
		}

		// Check if the active file is a person note (has cr_id)
		const cache = this.app.metadataCache.getFileCache(activeFile);
		if (!cache?.frontmatter?.cr_id) {
			new Notice('Current note is not a person note (missing cr_id field)');
			return;
		}

		// Open Control Center with this person pre-selected
		const modal = new ControlCenterModal(this.app, this);
		await modal.openWithPerson(activeFile);
	}

	async regenerateCanvas(canvasFile: TFile, direction?: 'vertical' | 'horizontal') {
		try {
			new Notice('Regenerating canvas...');

			// 1. Read current Canvas JSON
			const canvasContent = await this.app.vault.read(canvasFile);
			const canvasData = JSON.parse(canvasContent);

			if (!canvasData.nodes || canvasData.nodes.length === 0) {
				new Notice('Canvas is empty - nothing to regenerate');
				return;
			}

			// 2. Try to read original generation metadata from canvas
			const storedMetadata = canvasData.metadata?.frontmatter;
			const isCanvasRootsTree = storedMetadata?.plugin === 'canvas-roots';

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
					const file = this.app.vault.getAbstractFileByPath(node.file);
					if (file instanceof TFile) {
						const cache = this.app.metadataCache.getFileCache(file);
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
			const graphService = new FamilyGraphService(this.app);
			const familyTree = await graphService.generateTree({
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
			const nodeWidth = storedMetadata?.layout?.nodeWidth ?? this.settings.defaultNodeWidth;
			const nodeHeight = storedMetadata?.layout?.nodeHeight ?? this.settings.defaultNodeHeight;
			const nodeSpacingX = storedMetadata?.layout?.nodeSpacingX ?? this.settings.horizontalSpacing;
			const nodeSpacingY = storedMetadata?.layout?.nodeSpacingY ?? this.settings.verticalSpacing;
			const originalDirection = storedMetadata?.generation?.direction ?? 'vertical';

			// 7. Recalculate layout preserving original parameters (except direction if user changed it)
			const canvasGenerator = new CanvasGenerator();

			// Convert plural tree type (from TreeOptions) to singular (for LayoutOptions)
			const layoutTreeType: 'ancestor' | 'descendant' | 'full' =
				treeType === 'ancestors' ? 'ancestor' :
				treeType === 'descendants' ? 'descendant' :
				'full';

			const newCanvasData = canvasGenerator.generateCanvas(familyTree, {
				nodeSpacingX,
				nodeSpacingY,
				nodeWidth,
				nodeHeight,
				direction: direction ?? originalDirection,
				treeType: layoutTreeType,
				nodeColorScheme: this.settings.nodeColorScheme,
				showLabels: true,
				useFamilyChartLayout: true,
				parentChildArrowStyle: this.settings.parentChildArrowStyle,
				spouseArrowStyle: this.settings.spouseArrowStyle,
				parentChildEdgeColor: this.settings.parentChildEdgeColor,
				spouseEdgeColor: this.settings.spouseEdgeColor,
				canvasRootsMetadata: {
					plugin: 'canvas-roots',
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
					}
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
			const formattedJson = this.formatCanvasJson(updatedCanvasData);
			await this.app.vault.modify(canvasFile, formattedJson);

			new Notice(`Canvas regenerated successfully! (${newCanvasData.nodes.length} people)`);
		} catch (error) {
			console.error('Error regenerating canvas:', error);
			new Notice('Failed to regenerate canvas. Check console for details.');
		}
	}

	/**
	 * Format canvas JSON to match Obsidian's exact format
	 * Uses tabs for structure and compact objects on single lines
	 */
	private formatCanvasJson(data: unknown): string {
		const canvasData = data as {
			nodes: Array<Record<string, unknown>>;
			edges: Array<Record<string, unknown>>;
			metadata?: Record<string, unknown>;
		};

		const lines: string[] = [];
		lines.push('{');

		// Nodes array
		lines.push('\t"nodes":[');
		canvasData.nodes.forEach((node, i) => {
			const isLast = i === canvasData.nodes.length - 1;
			const nodeStr = JSON.stringify(node);
			lines.push(`\t\t${nodeStr}${isLast ? '' : ','}`);
		});
		lines.push('\t],');

		// Edges array
		lines.push('\t"edges":[');
		canvasData.edges.forEach((edge, i) => {
			const isLast = i === canvasData.edges.length - 1;
			const edgeStr = JSON.stringify(edge);
			lines.push(`\t\t${edgeStr}${isLast ? '' : ','}`);
		});
		lines.push('\t],');

		// Metadata
		lines.push('\t"metadata":{');
		lines.push('\t\t"version":"1.0-1.0",');
		const frontmatter = canvasData.metadata?.frontmatter || {};
		lines.push(`\t\t"frontmatter":${JSON.stringify(frontmatter)}`);
		lines.push('\t}');

		lines.push('}');

		return lines.join('\n');
	}

	private createPersonNote() {
		// Open Control Center to the Data Entry tab
		const modal = new ControlCenterModal(this.app, this);
		modal.openToTab('data-entry');
	}

	private async generateAllTrees() {
		new Notice('Finding all family groups...');

		try {
			// Open Control Center to generate all trees
			const modal = new ControlCenterModal(this.app, this);
			await modal.openAndGenerateAllTrees();
		} catch (error) {
			console.error('Error generating all trees:', error);
			new Notice('Failed to generate all trees. Check console for details.');
		}
	}

	private async createBaseTemplate() {
		try {
			// Suggest a filename
			const defaultPath = 'family-members.base';

			// Check if file already exists
			const existingFile = this.app.vault.getAbstractFileByPath(defaultPath);
			if (existingFile) {
				new Notice('Base template already exists at family-members.base');
				// Open the existing file
				if (existingFile instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(existingFile);
				}
				return;
			}

			// Create the file with template content
			const file = await this.app.vault.create(defaultPath, BASE_TEMPLATE);

			new Notice('Base template created successfully!');

			// Open the newly created file
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
		} catch (error) {
			console.error('Error creating Base template:', error);
			new Notice('Failed to create Base template. Check console for details.');
		}
	}
}
