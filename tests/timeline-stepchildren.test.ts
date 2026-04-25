import { describe, expect, it, beforeEach } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';

/**
 * #441 — Stepchildren's birth events appear on stepparents' timelines.
 *
 * `gatherFamilyEvents` reads `person.childrenCrIds` directly. Vault data
 * commonly lists both biological and step children in that array (the
 * relationship UI flattens both into the generic children list), so without
 * a stepchild filter, a stepparent's timeline shows "Birth of <stepchild>"
 * for events the stepparent wasn't biologically present for.
 *
 * The fix: family-graph derives `stepchildrenCrIds` on each parent by
 * inverting the children's `stepfatherCrIds` / `stepmotherCrIds`, and
 * `gatherFamilyEvents` skips any entry that's in `stepchildrenCrIds`.
 *
 * This suite fences that exclusion. Reported by @DigitalDreamn during
 * #439 verification (Cliegg/Anakin and Shmi/Owen pairs in the Lars family).
 */

interface ChildLike {
	crId: string;
	name: string;
	birthDate?: string;
	file?: { basename: string };
}

interface MinimalPerson {
	crId: string;
	name: string;
	birthDate?: string;
	universe?: string;
	childrenCrIds: string[];
	stepchildrenCrIds: string[];
	adoptedChildCrIds: string[];
	spouseCrIds: string[];
	parentCrIds: string[];
	fatherCrId?: string;
	motherCrId?: string;
}

interface PrivateMembers {
	gatherFamilyEvents: (context: unknown) => Array<{ title: string; type: string; isFamilyEvent?: boolean }>;
}

function privates(renderer: TimelineRenderer): PrivateMembers {
	return renderer as unknown as PrivateMembers;
}

function makeRenderer(): { renderer: TimelineRenderer; settings: Record<string, unknown> } {
	const settings: Record<string, unknown> = {
		timelineShowChildrenBirths: true,
		timelineShowSpouseDeaths: false,
		timelineShowParentDeaths: false,
		timelineShowSiblingBirths: false,
		timelineShowAdoptedChildrenBirths: false,
		timelineChildBirthLabel: 'Birth of {name}',
		timelineAdoptedChildBirthLabel: 'Birth of {name}',
		timelineAdoptionLabel: 'Adopted {name}'
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

function buildContext(person: MinimalPerson, children: ChildLike[]): unknown {
	const childMap = new Map(children.map(c => [c.crId, c]));
	return {
		person,
		familyGraph: {
			getPersonByCrId: (crId: string) => childMap.get(crId)
		},
		eventService: null,
		file: { basename: person.name },
		crId: person.crId
	};
}

describe('TimelineRenderer.gatherFamilyEvents — stepchild filter (#441)', () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		({ renderer } = makeRenderer());
	});

	it("excludes stepchildren's births from the children-births block", () => {
		const cliegg: MinimalPerson = {
			crId: 'cliegg',
			name: 'Cliegg Lars',
			birthDate: '82 BBY',
			universe: 'star-wars',
			childrenCrIds: ['owen', 'anakin'],
			stepchildrenCrIds: ['anakin'],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: []
		};
		const children: ChildLike[] = [
			{ crId: 'owen', name: 'Owen Lars', birthDate: '40 BBY', file: { basename: 'Owen Lars' } },
			{ crId: 'anakin', name: 'Anakin Skywalker', birthDate: '41 BBY', file: { basename: 'Anakin Skywalker' } }
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(cliegg, children));

		const titles = entries.map(e => e.title);
		expect(titles).toContain('Birth of Owen Lars');
		expect(titles).not.toContain('Birth of Anakin Skywalker');
	});

	it('keeps biological children when no stepchildren are listed', () => {
		const person: MinimalPerson = {
			crId: 'p1',
			name: 'Parent',
			birthDate: '1850',
			childrenCrIds: ['c1', 'c2'],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: []
		};
		const children: ChildLike[] = [
			{ crId: 'c1', name: 'Child One', birthDate: '1880', file: { basename: 'Child One' } },
			{ crId: 'c2', name: 'Child Two', birthDate: '1885', file: { basename: 'Child Two' } }
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(person, children));

		expect(entries.map(e => e.title)).toEqual([
			'Birth of Child One',
			'Birth of Child Two'
		]);
	});

	it('excludes a child who is in BOTH stepchildren and adopted-children arrays (defensive overlap)', () => {
		// Unusual but representable: filtering must hold even if both flags
		// somehow got set on the same id.
		const person: MinimalPerson = {
			crId: 'p1',
			name: 'Parent',
			birthDate: '1850',
			childrenCrIds: ['c1'],
			stepchildrenCrIds: ['c1'],
			adoptedChildCrIds: ['c1'],
			spouseCrIds: [],
			parentCrIds: []
		};
		const children: ChildLike[] = [
			{ crId: 'c1', name: 'Edge Case', birthDate: '1880', file: { basename: 'Edge Case' } }
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(person, children));

		expect(entries).toEqual([]);
	});

	it('handles a person with only stepchildren (no biological children)', () => {
		const shmi: MinimalPerson = {
			crId: 'shmi',
			name: 'Shmi Skywalker Lars',
			birthDate: '72 BBY',
			universe: 'star-wars',
			childrenCrIds: ['owen'],
			stepchildrenCrIds: ['owen'],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: []
		};
		const children: ChildLike[] = [
			{ crId: 'owen', name: 'Owen Lars', birthDate: '40 BBY', file: { basename: 'Owen Lars' } }
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(shmi, children));

		expect(entries).toEqual([]);
	});
});
