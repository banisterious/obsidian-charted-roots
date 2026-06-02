import { describe, expect, it } from 'vitest';
import { TimelineRenderer } from '../src/dynamic-content/renderers/timeline-renderer';
import { createDateService } from '../src/dates/services/date-service';

/**
 * #661 — `timelineShowSiblingMarriages` adds a sibling's marriage to the focal
 * person's Dynamic Timeline block, mirroring the parent (#608) and children
 * (#607) marriage toggles. Bio and adopted siblings are covered; step-siblings
 * are excluded by `collectSiblingCrIds`, and marriages outside the focal
 * person's reality window are skipped.
 */

interface Spouse {
	personId: string;
	marriageDate?: string;
	personLink?: string;
	marriageLocation?: string;
}
interface Relative {
	crId: string;
	name: string;
	birthDate?: string;
	childrenCrIds?: string[];
	adoptedChildCrIds?: string[];
	stepchildrenCrIds?: string[];
	spouses?: Spouse[];
	file?: { basename: string };
}
interface Person {
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
	motherCrId?: string;
	fatherCrId?: string;
}

function makeRenderer(settingsOverride: Record<string, unknown> = {}): TimelineRenderer {
	const settings: Record<string, unknown> = {
		timelineShowSiblingBirths: false,
		timelineShowSpouseDeaths: false,
		timelineShowParentDeaths: false,
		timelineShowSiblingMarriages: true,
		timelineSiblingMarriageLabel: 'Marriage of {name} to {spouse}',
		...settingsOverride,
	};
	const dateService = createDateService({
		enableFictionalDates: true,
		showBuiltInDateSystems: true,
		fictionalDateSystems: [],
	});
	const service = {
		getSettings: () => settings,
		getDateService: () => dateService,
		extractYear: (d: string | number | undefined): string => {
			if (d === undefined || d === null || d === '') return '';
			const m = String(d).match(/(\d{4})/);
			return m ? m[1] : '';
		},
		formatDate: (d: string | undefined): string => d ?? '',
		stripWikilink: (s: string): string => s.replace(/^\[\[/, '').replace(/\]\]$/, ''),
		createRelationshipService: () => ({
			getRelationshipsForPerson: () => [],
			getInverseRelationships: () => [],
		}),
	};
	return new TimelineRenderer(service as never);
}

function ctx(person: Person, relatives: Relative[]): unknown {
	const map = new Map(relatives.map(r => [r.crId, r]));
	return {
		person,
		familyGraph: { getPersonByCrId: (id: string) => map.get(id) },
		eventService: null,
		file: { basename: person.name },
		crId: person.crId,
	};
}

function gather(renderer: TimelineRenderer, c: unknown): Array<{ title: string; type: string }> {
	return (renderer as unknown as {
		gatherFamilyEvents: (c: unknown) => Array<{ title: string; type: string }>;
	}).gatherFamilyEvents(c);
}

function focal(overrides: Partial<Person> = {}): Person {
	return {
		crId: 'focal',
		name: 'Focal Person',
		birthDate: '1820',
		deathDate: '1880',
		childrenCrIds: [],
		stepchildrenCrIds: [],
		adoptedChildCrIds: [],
		spouseCrIds: [],
		parentCrIds: [],
		motherCrId: 'mom',
		...overrides,
	};
}

describe('TimelineRenderer.gatherFamilyEvents — sibling marriages (#661)', () => {
	it("adds a bio sibling's marriage with the spouse's name", () => {
		const relatives: Relative[] = [
			{ crId: 'mom', name: 'Mother', childrenCrIds: ['focal', 'sib'] },
			{ crId: 'sib', name: 'Jane Doe', spouses: [{ personId: 'spouseA', marriageDate: '1850' }], file: { basename: 'Jane Doe' } },
			{ crId: 'spouseA', name: 'John Smith' },
		];
		const entries = gather(makeRenderer(), ctx(focal(), relatives));
		const marriage = entries.find(e => e.type === 'family_sibling_marriage');
		expect(marriage?.title).toBe('Marriage of Jane Doe to John Smith');
	});

	it('omits sibling marriages when the toggle is off', () => {
		const relatives: Relative[] = [
			{ crId: 'mom', name: 'Mother', childrenCrIds: ['focal', 'sib'] },
			{ crId: 'sib', name: 'Jane Doe', spouses: [{ personId: 'spouseA', marriageDate: '1850' }] },
			{ crId: 'spouseA', name: 'John Smith' },
		];
		const entries = gather(makeRenderer({ timelineShowSiblingMarriages: false }), ctx(focal(), relatives));
		expect(entries.some(e => e.type === 'family_sibling_marriage')).toBe(false);
	});

	it("includes an adopted sibling's marriage", () => {
		const relatives: Relative[] = [
			{ crId: 'mom', name: 'Mother', childrenCrIds: ['focal'], adoptedChildCrIds: ['adoptedSib'] },
			{ crId: 'adoptedSib', name: 'Ada Lovelace', spouses: [{ personId: 'spouseB', marriageDate: '1855' }] },
			{ crId: 'spouseB', name: 'Charles B' },
		];
		const entries = gather(makeRenderer(), ctx(focal(), relatives));
		expect(entries.some(e => e.title === 'Marriage of Ada Lovelace to Charles B')).toBe(true);
	});

	it("excludes a step-sibling's marriage", () => {
		const relatives: Relative[] = [
			{ crId: 'mom', name: 'Mother', childrenCrIds: ['focal', 'stepSib'], stepchildrenCrIds: ['stepSib'] },
			{ crId: 'stepSib', name: 'Step Sibling', spouses: [{ personId: 'spouseC', marriageDate: '1850' }] },
			{ crId: 'spouseC', name: 'Some One' },
		];
		const entries = gather(makeRenderer(), ctx(focal(), relatives));
		expect(entries.some(e => e.type === 'family_sibling_marriage')).toBe(false);
	});

	it('skips a sibling marriage that falls after the focal person has died', () => {
		const relatives: Relative[] = [
			{ crId: 'mom', name: 'Mother', childrenCrIds: ['focal', 'sib'] },
			{ crId: 'sib', name: 'Jane Doe', spouses: [{ personId: 'spouseA', marriageDate: '1890' }] },
			{ crId: 'spouseA', name: 'John Smith' },
		];
		// Focal dies in 1880; the 1890 marriage is outside their reality window.
		const entries = gather(makeRenderer(), ctx(focal({ deathDate: '1880' }), relatives));
		expect(entries.some(e => e.type === 'family_sibling_marriage')).toBe(false);
	});
});
