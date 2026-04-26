import { describe, expect, it, beforeEach } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';
import { createDateService, type DateService } from '../src/dates/services/date-service';

/**
 * #456 + #457 — focal-person reality-window guard on timeline relative-event
 * surfaces.
 *
 * #456: step-siblings' births appearing on each other's timelines (older
 *       step-sibling's birth appears before the focal person's own birth).
 *       Fix: filter step-siblings out of the sibling-births block by
 *       walking each parent's `stepchildrenCrIds`.
 *
 * #457: spouse death events appearing on the survivor's timeline even when
 *       the survivor pre-deceased the spouse. Audit covers parent deaths
 *       too. Fix: a focal-person reality-window guard that skips events
 *       whose date falls after the focal person's death.
 */

interface MinimalRelative {
	crId: string;
	name: string;
	birthDate?: string;
	deathDate?: string;
	childrenCrIds?: string[];
	stepchildrenCrIds?: string[];
	file?: { basename: string };
}

interface MinimalPerson {
	crId: string;
	name: string;
	birthDate?: string;
	deathDate?: string;
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
	gatherFamilyEvents: (context: unknown) => Array<{ title: string; type: string }>;
}

function privates(renderer: TimelineRenderer): PrivateMembers {
	return renderer as unknown as PrivateMembers;
}

function makeRenderer(opts: {
	settings?: Record<string, unknown>;
	dateService?: DateService | null;
} = {}): { renderer: TimelineRenderer; settings: Record<string, unknown> } {
	const settings: Record<string, unknown> = {
		timelineShowChildrenBirths: false,
		timelineShowSpouseDeaths: true,
		timelineShowParentDeaths: true,
		timelineShowSiblingBirths: true,
		timelineShowAdoptedChildrenBirths: false,
		timelineSpouseDeathLabel: 'Death of {name}',
		timelineParentDeathLabel: 'Death of {name}',
		timelineSiblingBirthLabel: 'Birth of {name}',
		...opts.settings,
	};

	const dateService = opts.dateService ?? createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});

	const service = {
		getSettings: () => settings,
		getDateService: () => dateService,
		extractYear: (dateStr: string | number | undefined): string => {
			if (dateStr === undefined || dateStr === null || dateStr === '') return '';
			const value = typeof dateStr === 'string' ? dateStr : String(dateStr);
			const match = value.match(/(\d{4})/);
			return match ? match[1] : '';
		},
		formatDate: (dateStr: string | undefined): string => dateStr ?? '',
		createRelationshipService: () => ({
			getRelationshipsForPerson: () => [],
			getInverseRelationships: () => [],
		}),
	};

	return { renderer: new TimelineRenderer(service as never), settings };
}

function buildContext(person: MinimalPerson, relatives: MinimalRelative[]): unknown {
	const map = new Map(relatives.map(r => [r.crId, r]));
	return {
		person,
		familyGraph: {
			getPersonByCrId: (crId: string) => map.get(crId),
		},
		eventService: null,
		file: { basename: person.name },
		crId: person.crId,
	};
}

describe('TimelineRenderer.gatherFamilyEvents — step-sibling filter (#456)', () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		({ renderer } = makeRenderer());
	});

	it("excludes a step-sibling who is in the shared parent's stepchildren list", () => {
		// Setup: Anakin is Shmi's bio son. Owen is Cliegg's bio son.
		// Shmi has both in her children list (Owen is her stepchild).
		// On Anakin's timeline, Owen should NOT appear as a sibling.
		const anakin: MinimalPerson = {
			crId: 'anakin',
			name: 'Anakin Skywalker',
			birthDate: '41 BBY',
			universe: 'star-wars',
			motherCrId: 'shmi',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'shmi',
				name: 'Shmi Skywalker',
				childrenCrIds: ['anakin', 'owen'],
				stepchildrenCrIds: ['owen'],
			},
			{ crId: 'owen', name: 'Owen Lars', birthDate: '40 BBY', file: { basename: 'Owen Lars' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(anakin, relatives));

		const titles = entries.map(e => e.title);
		expect(titles).not.toContain('Birth of Owen Lars');
	});

	it('keeps full siblings on the focal person timeline', () => {
		const luke: MinimalPerson = {
			crId: 'luke',
			name: 'Luke Skywalker',
			birthDate: '19 BBY',
			universe: 'star-wars',
			motherCrId: 'padme',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'padme',
				name: 'Padme',
				childrenCrIds: ['luke', 'leia'],
				stepchildrenCrIds: [],
			},
			{ crId: 'leia', name: 'Leia Organa', birthDate: '19 BBY', file: { basename: 'Leia Organa' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(luke, relatives));

		expect(entries.map(e => e.title)).toContain('Birth of Leia Organa');
	});
});

describe('TimelineRenderer.gatherFamilyEvents — focal-death reality window (#457)', () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		({ renderer } = makeRenderer());
	});

	it('excludes a spouse death that occurred after the focal person died (real-world)', () => {
		const focal: MinimalPerson = {
			crId: 'shmi',
			name: 'Shmi Skywalker Lars',
			birthDate: '1900',
			deathDate: '1948',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: ['cliegg'],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'cliegg',
				name: 'Cliegg Lars',
				birthDate: '1895',
				deathDate: '1962',
				file: { basename: 'Cliegg Lars' },
			},
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).not.toContain('Death of Cliegg Lars');
	});

	it('excludes a spouse death that occurred after the focal person died (BBY)', () => {
		const focal: MinimalPerson = {
			crId: 'shmi',
			name: 'Shmi Skywalker Lars',
			birthDate: '72 BBY',
			deathDate: '22 BBY',
			universe: 'star-wars',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: ['cliegg'],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'cliegg',
				name: 'Cliegg Lars',
				birthDate: '82 BBY',
				deathDate: '15 BBY',
				file: { basename: 'Cliegg Lars' },
			},
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).not.toContain('Death of Cliegg Lars');
	});

	it("includes a spouse's death when the focal person was alive at that moment", () => {
		const focal: MinimalPerson = {
			crId: 'cliegg',
			name: 'Cliegg Lars',
			birthDate: '82 BBY',
			deathDate: '15 BBY',
			universe: 'star-wars',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: ['shmi'],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'shmi',
				name: 'Shmi Skywalker Lars',
				birthDate: '72 BBY',
				deathDate: '22 BBY',
				file: { basename: 'Shmi Skywalker Lars' },
			},
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).toContain('Death of Shmi Skywalker Lars');
	});

	it('includes spouse death when the focal person has no death date', () => {
		const focal: MinimalPerson = {
			crId: 'p1',
			name: 'Living Spouse',
			birthDate: '1900',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: ['p2'],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{ crId: 'p2', name: 'Other', deathDate: '1980', file: { basename: 'Other' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).toContain('Death of Other');
	});

	it('excludes a parent death that occurred after the focal person died', () => {
		const focal: MinimalPerson = {
			crId: 'child',
			name: 'Predeceasing Child',
			birthDate: '1900',
			deathDate: '1940',
			motherCrId: 'mother',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'mother',
				name: 'Long-Lived Mother',
				birthDate: '1875',
				deathDate: '1960',
				file: { basename: 'Long-Lived Mother' },
			},
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).not.toContain('Death of Long-Lived Mother');
	});

	it('includes a parent death that occurred during the focal person life', () => {
		const focal: MinimalPerson = {
			crId: 'child',
			name: 'Surviving Child',
			birthDate: '1900',
			deathDate: '1980',
			motherCrId: 'mother',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'mother',
				name: 'Mother',
				birthDate: '1875',
				deathDate: '1950',
				file: { basename: 'Mother' },
			},
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).toContain('Death of Mother');
	});
});
