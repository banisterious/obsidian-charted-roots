import { describe, expect, it } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * #623 — Adopted-sibling and adopted-grandchild adoption events on the
 * Dynamic Timeline Block should render unconditionally, mirroring the
 * adoptive parent's always-on `Adopted {name}` event (#396).
 *
 * v0.22.49 shipped the events (#621) gated on `timelineShowAdoptedChildrenBirths`,
 * matching the toggle used for the parallel birth-event coverage. Verification
 * feedback from @DigitalDreamn flagged that the adoption events represent
 * family events the focal canonically experienced, independent of whether the
 * user wants the broader adopted-children-births surfacing — so the events
 * lose the toggle gate in v0.22.50 while keeping the `kind === 'adopted'` and
 * `adoptionDate`-required guards.
 */

interface MinimalPerson {
	crId: string;
	name: string;
	birthDate?: string;
	deathDate?: string;
	universe?: string;
	childrenCrIds?: string[];
	adoptedChildCrIds?: string[];
	stepchildrenCrIds?: string[];
	adoptionDate?: string;
	fatherCrId?: string;
	motherCrId?: string;
	parentCrIds?: string[];
	adoptiveFatherCrId?: string;
	adoptiveMotherCrId?: string;
	adoptiveParentCrIds?: string[];
	spouseCrIds?: string[];
	file?: { basename: string };
}

interface PrivateMembers {
	gatherFamilyEvents: (context: unknown) => Array<{ title: string; type: string; rawDate?: string }>;
}

function privates(renderer: TimelineRenderer): PrivateMembers {
	return renderer as unknown as PrivateMembers;
}

function makeRenderer(settingsOverrides: Record<string, unknown> = {}): {
	renderer: TimelineRenderer;
	settings: Record<string, unknown>;
} {
	const settings: Record<string, unknown> = {
		timelineShowChildrenBirths: false,
		timelineShowSpouseDeaths: false,
		timelineShowParentDeaths: false,
		timelineShowSiblingBirths: false,
		timelineShowAdoptedChildrenBirths: false, // gate explicitly off — the #623 contract
		timelineAdoptedSiblingAdoptionLabel: 'Adoption of {name}',
		timelineAdoptedGrandchildAdoptionLabel: 'Adoption of {name}',
		...settingsOverrides
	};

	const service = {
		getSettings: () => settings,
		getDateService: () => null,
		extractYear: (dateStr: string | number | undefined): string => {
			if (dateStr === undefined || dateStr === null || dateStr === '') return '';
			const value = typeof dateStr === 'string' ? dateStr : String(dateStr);
			const match = value.match(/(\d{4})/);
			return match ? match[1] : '';
		},
		formatDate: (dateStr: string | undefined): string => dateStr ?? '',
		createRelationshipService: () => ({
			getRelationshipsForPerson: () => [],
			getInverseRelationships: () => []
		})
	};

	return { renderer: new TimelineRenderer(service as never), settings };
}

function buildContext(person: MinimalPerson, others: MinimalPerson[]): unknown {
	const personMap = new Map(others.map(p => [p.crId, p]));
	return {
		person,
		familyGraph: {
			getPersonByCrId: (crId: string) => personMap.get(crId)
		},
		eventService: null,
		file: { basename: person.name },
		crId: person.crId
	};
}

describe('TimelineRenderer adoption-events always-on (#623)', () => {
	describe('adopted-sibling adoption events', () => {
		it('emits when the adopted-children-births toggle is off', () => {
			const { renderer } = makeRenderer();

			const focal: MinimalPerson = {
				crId: 'focal',
				name: 'Focal Person',
				fatherCrId: 'dad',
				childrenCrIds: [],
				adoptedChildCrIds: [],
				spouseCrIds: []
			};
			const dad: MinimalPerson = {
				crId: 'dad',
				name: 'Dad',
				childrenCrIds: ['focal'],
				adoptedChildCrIds: ['adopted-sibling']
			};
			const adoptedSibling: MinimalPerson = {
				crId: 'adopted-sibling',
				name: 'Adopted Sibling',
				adoptionDate: '1990-05-12',
				file: { basename: 'Adopted Sibling' }
			};

			const entries = privates(renderer).gatherFamilyEvents(
				buildContext(focal, [dad, adoptedSibling])
			);

			const adoptionEntries = entries.filter(e => e.type === 'adoption');
			expect(adoptionEntries).toHaveLength(1);
			expect(adoptionEntries[0].title).toBe('Adoption of Adopted Sibling');
			expect(adoptionEntries[0].rawDate).toBe('1990-05-12');
		});

		it('skips siblings without an adoption date', () => {
			const { renderer } = makeRenderer();

			const focal: MinimalPerson = {
				crId: 'focal',
				name: 'Focal Person',
				fatherCrId: 'dad',
				childrenCrIds: [],
				adoptedChildCrIds: [],
				spouseCrIds: []
			};
			const dad: MinimalPerson = {
				crId: 'dad',
				name: 'Dad',
				childrenCrIds: ['focal'],
				adoptedChildCrIds: ['adopted-sibling']
			};
			const adoptedSibling: MinimalPerson = {
				crId: 'adopted-sibling',
				name: 'Adopted Sibling',
				file: { basename: 'Adopted Sibling' }
			};

			const entries = privates(renderer).gatherFamilyEvents(
				buildContext(focal, [dad, adoptedSibling])
			);

			expect(entries.filter(e => e.type === 'adoption')).toHaveLength(0);
		});
	});

	describe('adopted-grandchild adoption events', () => {
		it('emits when the adopted-children-births toggle is off', () => {
			const { renderer } = makeRenderer();

			const focal: MinimalPerson = {
				crId: 'focal',
				name: 'Focal Person',
				childrenCrIds: ['child'],
				adoptedChildCrIds: [],
				spouseCrIds: []
			};
			const child: MinimalPerson = {
				crId: 'child',
				name: 'Child',
				adoptedChildCrIds: ['adopted-grandchild']
			};
			const adoptedGrandchild: MinimalPerson = {
				crId: 'adopted-grandchild',
				name: 'Adopted Grandchild',
				adoptionDate: '2015-07-20',
				file: { basename: 'Adopted Grandchild' }
			};

			const entries = privates(renderer).gatherFamilyEvents(
				buildContext(focal, [child, adoptedGrandchild])
			);

			const adoptionEntries = entries.filter(e => e.type === 'adoption');
			expect(adoptionEntries).toHaveLength(1);
			expect(adoptionEntries[0].title).toBe('Adoption of Adopted Grandchild');
			expect(adoptionEntries[0].rawDate).toBe('2015-07-20');
		});

		it('skips grandchildren without an adoption date', () => {
			const { renderer } = makeRenderer();

			const focal: MinimalPerson = {
				crId: 'focal',
				name: 'Focal Person',
				childrenCrIds: ['child'],
				adoptedChildCrIds: [],
				spouseCrIds: []
			};
			const child: MinimalPerson = {
				crId: 'child',
				name: 'Child',
				adoptedChildCrIds: ['adopted-grandchild']
			};
			const adoptedGrandchild: MinimalPerson = {
				crId: 'adopted-grandchild',
				name: 'Adopted Grandchild',
				file: { basename: 'Adopted Grandchild' }
			};

			const entries = privates(renderer).gatherFamilyEvents(
				buildContext(focal, [child, adoptedGrandchild])
			);

			expect(entries.filter(e => e.type === 'adoption')).toHaveLength(0);
		});
	});
});
