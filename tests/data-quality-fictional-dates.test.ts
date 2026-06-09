import { describe, expect, it, beforeEach } from 'vitest';
import { TFile, makeTFile } from 'obsidian';
import { DataQualityService, type DataQualityIssue } from '../src/core/data-quality';
import { PersonNode } from '../src/core/family-graph';
import { createDateService, DateService } from '../src/dates/services/date-service';

/**
 * #437 — date-inconsistency checks ignore fictional eras.
 *
 * The Statistics Dashboard's data quality card was firing DEATH_BEFORE_BIRTH /
 * UNREASONABLE_AGE / PARENT_TOO_YOUNG / FUTURE_BIRTH / FUTURE_DEATH on
 * fictional-universe persons because `parseYear` pulled the first 4-digit
 * number out of the date string and ignored era context. For descending eras
 * (BBY) that produced reversed comparisons. This suite fences the fix.
 */

function makePerson(overrides: Partial<PersonNode>): PersonNode {
	const file = makeTFile({ path: 'p.md', basename: 'p', extension: 'md' });
	return {
		crId: 'p:any',
		name: 'Anonymous',
		stepfatherCrIds: [],
		stepmotherCrIds: [],
		adoptiveParentCrIds: [],
		adoptedChildCrIds: [],
		parentCrIds: [],
		spouseCrIds: [],
		childrenCrIds: [],
		file,
		...overrides,
	} as PersonNode;
}

function makeService(dateService: DateService): DataQualityService {
	const plugin = { getDateService: () => dateService } as never;
	return new DataQualityService(
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		plugin
	);
}

function runCheck(
	service: DataQualityService,
	person: PersonNode,
	peopleMap: Map<string, PersonNode> = new Map()
): DataQualityIssue[] {
	peopleMap.set(person.crId, person);
	// Private method exercised directly — checkDateInconsistencies is the unit
	// the issue targets, and going through analyze() would require a real
	// FamilyGraphService.
	return (
		service as unknown as {
			checkDateInconsistencies: (
				p: PersonNode,
				m: Map<string, PersonNode>
			) => DataQualityIssue[];
		}
	).checkDateInconsistencies(person, peopleMap);
}

describe('checkDateInconsistencies — fictional eras (#437)', () => {
	let dateService: DateService;
	let service: DataQualityService;

	beforeEach(() => {
		dateService = createDateService({
			enableFictionalDates: true,
			showBuiltInDateSystems: true,
			fictionalDateSystems: [],
		});
		service = makeService(dateService);
	});

	describe('descending era (BBY) lifespans', () => {
		it('treats 1042 BBY as three years after 1045 BBY (no DEATH_BEFORE_BIRTH)', () => {
			const person = makePerson({
				crId: 'p:yoda',
				birthDate: '1045 BBY',
				deathDate: '1042 BBY',
				universe: 'star-wars',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).not.toContain('DEATH_BEFORE_BIRTH');
			expect(codes).not.toContain('UNREASONABLE_AGE');
		});

		it('flags UNREASONABLE_AGE when a BBY span exceeds 120 years', () => {
			const person = makePerson({
				crId: 'p:yoda',
				birthDate: '900 BBY',
				deathDate: '4 ABY',
				universe: 'star-wars',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('UNREASONABLE_AGE');
			expect(codes).not.toContain('DEATH_BEFORE_BIRTH');
		});

		it('does not produce FUTURE_BIRTH or FUTURE_DEATH for fictional dates', () => {
			const person = makePerson({
				crId: 'p:rey',
				birthDate: '15 ABY',
				deathDate: '50 ABY',
				universe: 'star-wars',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).not.toContain('FUTURE_BIRTH');
			expect(codes).not.toContain('FUTURE_DEATH');
		});

		it('flags actual reversed BBY dates as DEATH_BEFORE_BIRTH', () => {
			// Born 1042 BBY (later in the BBY timeline) but died 1045 BBY (earlier)
			// — that genuinely is death before birth.
			const person = makePerson({
				crId: 'p:bad',
				birthDate: '1042 BBY',
				deathDate: '1045 BBY',
				universe: 'star-wars',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('DEATH_BEFORE_BIRTH');
		});
	});

	describe('parent-child ordering across descending eras', () => {
		it('does not fire BORN_BEFORE_PARENT when child BBY year is numerically larger', () => {
			const father = makePerson({
				crId: 'p:dad',
				birthDate: '1080 BBY',
				universe: 'star-wars',
			});
			const child = makePerson({
				crId: 'p:kid',
				birthDate: '1042 BBY',
				universe: 'star-wars',
				fatherCrId: 'p:dad',
			});

			const peopleMap = new Map<string, PersonNode>();
			peopleMap.set(father.crId, father);
			const issues = runCheck(service, child, peopleMap);

			const codes = issues.map(i => i.code);
			expect(codes).not.toContain('BORN_BEFORE_PARENT');
			expect(codes).not.toContain('PARENT_TOO_YOUNG');
		});

		it('flags PARENT_TOO_YOUNG when parent-child BBY gap is under 12', () => {
			const mother = makePerson({
				crId: 'p:mom',
				birthDate: '1050 BBY',
				universe: 'star-wars',
				sex: 'female',
			});
			const child = makePerson({
				crId: 'p:kid',
				birthDate: '1045 BBY', // mother was 5
				universe: 'star-wars',
				motherCrId: 'p:mom',
			});

			const peopleMap = new Map<string, PersonNode>();
			peopleMap.set(mother.crId, mother);
			const issues = runCheck(service, child, peopleMap);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('PARENT_TOO_YOUNG');
		});

		it('flags BORN_BEFORE_PARENT when child BBY year exceeds parent BBY year', () => {
			const father = makePerson({
				crId: 'p:dad',
				birthDate: '1042 BBY',
				universe: 'star-wars',
			});
			const child = makePerson({
				crId: 'p:kid',
				birthDate: '1080 BBY', // canonical -1080 < parent -1042
				universe: 'star-wars',
				fatherCrId: 'p:dad',
			});

			const peopleMap = new Map<string, PersonNode>();
			peopleMap.set(father.crId, father);
			const issues = runCheck(service, child, peopleMap);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('BORN_BEFORE_PARENT');
		});
	});

	describe('real-world dates remain unchanged', () => {
		it('still flags DEATH_BEFORE_BIRTH for real-world reversed dates', () => {
			const person = makePerson({
				crId: 'p:real',
				birthDate: '1900',
				deathDate: '1850',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('DEATH_BEFORE_BIRTH');
		});

		it('still flags FUTURE_BIRTH for real-world dates beyond now', () => {
			const farFuture = new Date().getFullYear() + 50;
			const person = makePerson({
				crId: 'p:future',
				birthDate: `${farFuture}`,
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).toContain('FUTURE_BIRTH');
		});

		it('does not fire DEATH_BEFORE_BIRTH for a coherent real-world span', () => {
			const person = makePerson({
				crId: 'p:ok',
				birthDate: '1900',
				deathDate: '1980',
			});

			const issues = runCheck(service, person);

			const codes = issues.map(i => i.code);
			expect(codes).not.toContain('DEATH_BEFORE_BIRTH');
			expect(codes).not.toContain('UNREASONABLE_AGE');
		});
	});
});
