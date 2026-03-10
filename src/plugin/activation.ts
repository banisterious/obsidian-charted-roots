/**
 * View Activation Methods
 *
 * Extracted from main.ts — activates/reveals plugin views in the workspace.
 * Each method either reveals an existing view or creates a new one.
 */

import { TFile, WorkspaceLeaf } from 'obsidian';
import type CanvasRootsPlugin from '../../main';
import { FamilyChartView, VIEW_TYPE_FAMILY_CHART } from '../ui/views/family-chart-view';
import { VIEW_TYPE_MAP } from '../maps/map-view';
import { VIEW_TYPE_STATISTICS } from '../statistics';
import { VIEW_TYPE_RELATIONSHIPS } from '../relationships/ui/relationships-view';
import { VIEW_TYPE_PEOPLE } from '../ui/views/people-view';
import { VIEW_TYPE_EVENTS } from '../dates/ui/events-view';
import { VIEW_TYPE_PLACES } from '../ui/views/places-view';
import { VIEW_TYPE_ORGANIZATIONS } from '../organizations/ui/organizations-view';
import { VIEW_TYPE_SOURCES } from '../sources/ui/sources-view';
import { VIEW_TYPE_UNIVERSES } from '../universes/ui/universes-view';
import { VIEW_TYPE_COLLECTIONS } from '../ui/collections-view';
import { VIEW_TYPE_DATA_QUALITY } from '../ui/data-quality-view';
import { ProfileView, VIEW_TYPE_ENTITY_PROFILE } from '../profile-view/profile-view';

/**
 * Helper to activate a sidebar view — reveals existing or creates new in right sidebar
 */
async function activateSidebarView(plugin: CanvasRootsPlugin, viewType: string): Promise<void> {
	const { workspace } = plugin.app;

	const leaves = workspace.getLeavesOfType(viewType);
	if (leaves.length > 0) {
		void workspace.revealLeaf(leaves[0]);
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (leaf) {
		await leaf.setViewState({
			type: viewType,
			active: true
		});
		void workspace.revealLeaf(leaf);
	}
}

/**
 * Activate the Family Chart view
 */
export async function activateFamilyChartView(
	plugin: CanvasRootsPlugin,
	rootPersonId?: string,
	useMainWorkspace: boolean = true,
	forceNew: boolean = false
): Promise<void> {
	const { workspace } = plugin.app;

	let leaf: WorkspaceLeaf | null = null;
	let isNewLeaf = false;

	const leaves = workspace.getLeavesOfType(VIEW_TYPE_FAMILY_CHART);

	// Check if we should reuse an existing leaf
	// Only reuse if one exists, we're not forcing new, AND we have a root person to show
	// (without a root person, opening existing view would show stale data)
	if (leaves.length > 0 && !forceNew && rootPersonId) {
		if (useMainWorkspace) {
			const mainLeaf = leaves.find(l => l.getRoot() === workspace.rootSplit);
			leaf = mainLeaf || leaves[0];
		} else {
			leaf = leaves[0];
		}
	}

	// If no suitable existing leaf or if we need a new one
	if (!leaf) {
		if (useMainWorkspace) {
			leaf = workspace.getLeaf('tab');
		} else {
			leaf = workspace.getRightLeaf(false);
		}
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_FAMILY_CHART,
				active: true,
				state: rootPersonId ? { rootPersonId } : undefined
			});
			isNewLeaf = true;
		}
	}

	// Reveal the leaf in case it is in a collapsed sidebar
	if (leaf) {
		void workspace.revealLeaf(leaf);

		// If reusing an existing leaf, set the root person directly
		if (!isNewLeaf && rootPersonId && leaf.view instanceof FamilyChartView) {
			leaf.view.setRootPerson(rootPersonId);
		}
	}
}

/**
 * Activate the Map view
 */
export async function activateMapView(
	plugin: CanvasRootsPlugin,
	mapId?: string,
	forceNew = false,
	splitDirection?: 'horizontal' | 'vertical',
	focusCoordinates?: { lat: number; lng: number; zoom?: number }
): Promise<void> {
	const { workspace } = plugin.app;

	let leaf: WorkspaceLeaf | null = null;
	const leaves = workspace.getLeavesOfType(VIEW_TYPE_MAP);

	if (!forceNew && leaves.length > 0) {
		leaf = leaves[0];
	} else if (forceNew && leaves.length > 0 && splitDirection) {
		const existingLeaf = leaves[0];
		leaf = workspace.createLeafBySplit(existingLeaf, splitDirection);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_MAP, active: true });
		}
	} else {
		leaf = workspace.getLeaf('tab');
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_MAP, active: true });
		}
	}

	if (leaf) {
		void workspace.revealLeaf(leaf);

		setTimeout(() => {
			const mapView = leaf?.view as {
				mapController?: {
					setActiveMap: (id: string) => Promise<void>;
					setView: (center: { lat: number; lng: number }, zoom: number) => void;
				}
			};

			if (mapId && mapView?.mapController?.setActiveMap) {
				void mapView.mapController.setActiveMap(mapId);
			}

			if (focusCoordinates && mapView?.mapController?.setView) {
				const zoom = focusCoordinates.zoom ?? 12;
				mapView.mapController.setView(
					{ lat: focusCoordinates.lat, lng: focusCoordinates.lng },
					zoom
				);
			}
		}, 100);
	}
}

/**
 * Activate the Statistics Dashboard view (opens in main workspace tab)
 */
export async function activateStatisticsView(plugin: CanvasRootsPlugin): Promise<void> {
	const { workspace } = plugin.app;

	const leaves = workspace.getLeavesOfType(VIEW_TYPE_STATISTICS);
	if (leaves.length > 0) {
		void workspace.revealLeaf(leaves[0]);
		return;
	}

	const leaf = workspace.getLeaf('tab');
	await leaf.setViewState({
		type: VIEW_TYPE_STATISTICS,
		active: true
	});
	void workspace.revealLeaf(leaf);
}

export async function activateRelationshipsView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_RELATIONSHIPS);
}

export async function activatePeopleView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_PEOPLE);
}

export async function activateEventsView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_EVENTS);
}

export async function activatePlacesView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_PLACES);
}

export async function activateOrganizationsView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_ORGANIZATIONS);
}

export async function activateSourcesView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_SOURCES);
}

export async function activateUniversesView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_UNIVERSES);
}

export async function activateCollectionsView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_COLLECTIONS);
}

export async function activateDataQualityView(plugin: CanvasRootsPlugin): Promise<void> {
	return activateSidebarView(plugin, VIEW_TYPE_DATA_QUALITY);
}

/**
 * Open or reveal the entity profile view.
 * Finds an existing unpinned profile leaf, or creates a new one in the right sidebar.
 */
export async function activateProfileView(plugin: CanvasRootsPlugin, file?: TFile): Promise<void> {
	const { workspace } = plugin.app;

	const leaves = workspace.getLeavesOfType(VIEW_TYPE_ENTITY_PROFILE);
	const unpinnedLeaf = leaves.find(leaf => {
		const view = leaf.view;
		if (view instanceof ProfileView) {
			const state = view.getState();
			return !state.pinned;
		}
		return true;
	});

	if (unpinnedLeaf) {
		void workspace.revealLeaf(unpinnedLeaf);
		if (file && unpinnedLeaf.view instanceof ProfileView) {
			unpinnedLeaf.view.navigateToFile(file);
		}
		return;
	}

	const leaf = workspace.getRightLeaf(false);
	if (leaf) {
		await leaf.setViewState({
			type: VIEW_TYPE_ENTITY_PROFILE,
			active: true
		});
		void workspace.revealLeaf(leaf);
		if (file && leaf.view instanceof ProfileView) {
			leaf.view.navigateToFile(file);
		}
	}
}

/**
 * Move a Family Chart view from sidebar to main workspace
 */
export async function moveFamilyChartToMainWorkspace(
	plugin: CanvasRootsPlugin,
	currentLeaf: WorkspaceLeaf
): Promise<void> {
	const { workspace } = plugin.app;

	const currentView = currentLeaf.view;
	let rootPersonId: string | null = null;
	if (currentView instanceof FamilyChartView) {
		const state = currentView.getState();
		rootPersonId = state.rootPersonId;
	}

	currentLeaf.detach();

	const newLeaf = workspace.getLeaf('tab');
	await newLeaf.setViewState({ type: VIEW_TYPE_FAMILY_CHART, active: true });
	void workspace.revealLeaf(newLeaf);

	if (rootPersonId && newLeaf.view instanceof FamilyChartView) {
		newLeaf.view.setRootPerson(rootPersonId);
	}
}
