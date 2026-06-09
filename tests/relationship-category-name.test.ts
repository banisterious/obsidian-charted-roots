import { describe, it, expect } from 'vitest';
import { RelationshipService } from '../src/relationships/services/relationship-service';
import type { RelationshipCategory } from '../src/relationships/types/relationship-types';
import type CanvasRootsPlugin from '../main';

/**
 * #707 — custom relationship categories rendered as blank labels in the
 * Relationships pane / Control Center filter dropdown (and the stats list),
 * because the label came from the built-in-only category name map, which
 * returns undefined for user-created category ids.
 *
 * The label now routes through RelationshipService.getCategoryName, which
 * resolves built-ins, renamed built-ins, and custom categories.
 */

function makeService(settings: {
	customRelationshipCategories?: Array<{ id: string; name: string; sortOrder: number }>;
	relationshipCategoryCustomizations?: Record<string, Partial<{ name: string }>>;
}): RelationshipService {
	const plugin = { settings } as unknown as CanvasRootsPlugin;
	return new RelationshipService(plugin);
}

describe('RelationshipService.getCategoryName (#707)', () => {
	it('resolves a built-in category to its display name', () => {
		const service = makeService({});
		expect(service.getCategoryName('family' as RelationshipCategory)).toBe('Family');
		expect(service.getCategoryName('legal' as RelationshipCategory)).toBe('Legal/Guardianship');
	});

	it('resolves a user-created custom category to its name instead of a blank label', () => {
		const service = makeService({
			customRelationshipCategories: [
				{ id: 'jedi_order', name: 'Jedi Order', sortOrder: 7 }
			]
		});
		const label = service.getCategoryName('jedi_order' as RelationshipCategory);
		expect(label).toBe('Jedi Order');
		expect(label).not.toBe('');
	});

	it('honors a renamed built-in category', () => {
		const service = makeService({
			relationshipCategoryCustomizations: { family: { name: 'Kin' } }
		});
		expect(service.getCategoryName('family' as RelationshipCategory)).toBe('Kin');
	});

	it('falls back to the id for an unknown category rather than returning blank', () => {
		const service = makeService({});
		expect(service.getCategoryName('mystery' as RelationshipCategory)).toBe('mystery');
	});
});
