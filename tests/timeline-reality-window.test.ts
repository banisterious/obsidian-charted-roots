import { describe, expect, it, beforeEach } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';
import { createDateService, type DateService } from '../src/dates/services/date-service';

/**
 * #456 + #457 + #469 — focal-person reality-window guard on timeline
 * relative-event surfaces.
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
 *
 * #469: full sibling's birth appearing on the focal person's timeline
 *       BEFORE the focal person's own birth (older sibling). Fix:
 *       symmetric reality-window guard `isEventBeforeFocalBirth` applied
 *       to the sibling-births block.
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

describe('TimelineRenderer.gatherFamilyEvents — focal-birth reality window (#469)', () => {
	let renderer: TimelineRenderer;

	beforeEach(() => {
		({ renderer } = makeRenderer());
	});

	it("excludes an older sibling's birth that predates the focal person's birth (BBY)", () => {
		// Setup: Padme Naberrie born 46 BBY. Sola, her older sister, born
		// 50 BBY. On Padme's timeline, Sola's birth shouldn't appear since
		// it predates Padme's own birth.
		const padme: MinimalPerson = {
			crId: 'padme',
			name: 'Padme Naberrie',
			birthDate: '46 BBY',
			universe: 'star-wars',
			motherCrId: 'jobal',
			childrenCrIds: [],
			stepchildrenCrIds: [],
			adoptedChildCrIds: [],
			spouseCrIds: [],
			parentCrIds: [],
		};
		const relatives: MinimalRelative[] = [
			{
				crId: 'jobal',
				name: 'Jobal Naberrie',
				childrenCrIds: ['padme', 'sola'],
				stepchildrenCrIds: [],
			},
			{ crId: 'sola', name: 'Sola Naberrie', birthDate: '50 BBY', file: { basename: 'Sola Naberrie' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(padme, relatives));

		expect(entries.map(e => e.title)).not.toContain('Birth of Sola Naberrie');
	});

	it("excludes an older sibling's birth that predates the focal person's birth (real-world)", () => {
		const focal: MinimalPerson = {
			crId: 'focal',
			name: 'Younger Sibling',
			birthDate: '1905',
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
				childrenCrIds: ['focal', 'older'],
				stepchildrenCrIds: [],
			},
			{ crId: 'older', name: 'Older Sibling', birthDate: '1900', file: { basename: 'Older Sibling' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).not.toContain('Birth of Older Sibling');
	});

	it("includes a younger sibling's birth that occurs after the focal person's birth", () => {
		const focal: MinimalPerson = {
			crId: 'focal',
			name: 'Older Sibling',
			birthDate: '1900',
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
				childrenCrIds: ['focal', 'younger'],
				stepchildrenCrIds: [],
			},
			{ crId: 'younger', name: 'Younger Sibling', birthDate: '1905', file: { basename: 'Younger Sibling' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).toContain('Birth of Younger Sibling');
	});

	it('includes a same-year sibling birth (intra-year ordering unknown)', () => {
		// Twins or close-births where the year matches: allow through; the
		// reality-window guard fires only on unambiguous before-focal-birth.
		const focal: MinimalPerson = {
			crId: 'focal',
			name: 'Twin A',
			birthDate: '1900',
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
				childrenCrIds: ['focal', 'twin'],
				stepchildrenCrIds: [],
			},
			{ crId: 'twin', name: 'Twin B', birthDate: '1900', file: { basename: 'Twin B' } },
		];

		const entries = privates(renderer).gatherFamilyEvents(buildContext(focal, relatives));

		expect(entries.map(e => e.title)).toContain('Birth of Twin B');
	});
});
