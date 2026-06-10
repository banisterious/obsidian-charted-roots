import { describe, expect, it } from 'vitest';
import {
	normalizeOrgRefName,
	collectOrgReferenceNames,
	computeOrgIdBackfill
} from '../src/organizations/orphan-organizations';

/**
 * #708 — orphan organization detection/adoption. Pure helpers: reference-name
 * extraction across the event/person org fields, and the membership_org_ids
 * backfill applied when an orphan is adopted.
 */
describe('normalizeOrgRefName (#708)', () => {
	it('strips wikilink brackets and aliases, and a folder path', () => {
		expect(normalizeOrgRefName('[[Galactic Republic]]')).toBe('Galactic Republic');
		expect(normalizeOrgRefName('[[Organizations/Jedi Order|The Order]]')).toBe('Jedi Order');
		expect(normalizeOrgRefName('Plain Name')).toBe('Plain Name');
	});

	it('returns empty string for non-string / blank values', () => {
		expect(normalizeOrgRefName(undefined)).toBe('');
		expect(normalizeOrgRefName(42)).toBe('');
		expect(normalizeOrgRefName('   ')).toBe('');
	});
});

describe('collectOrgReferenceNames (#708)', () => {
	it('collects from the event organizations list', () => {
		expect(collectOrgReferenceNames({ organizations: ['[[Jedi Order]]', '[[Galactic Senate]]'] }))
			.toEqual(['Jedi Order', 'Galactic Senate']);
	});

	it('collects from flat membership_orgs, legacy nested memberships, and singular fields', () => {
		expect(collectOrgReferenceNames({ membership_orgs: ['[[House Stark]]'] })).toEqual(['House Stark']);
		expect(collectOrgReferenceNames({ memberships: [{ org: '[[Night\'s Watch]]' }] })).toEqual(["Night's Watch"]);
		expect(collectOrgReferenceNames({ organization: '[[Faceless Men]]' })).toEqual(['Faceless Men']);
		expect(collectOrgReferenceNames({ house: 'House Tully' })).toEqual(['House Tully']);
	});

	it('dedupes case-insensitively across fields, first spelling wins', () => {
		expect(collectOrgReferenceNames({
			organizations: ['[[Jedi Order]]'],
			membership_orgs: ['[[jedi order]]', '[[Galactic Senate]]']
		})).toEqual(['Jedi Order', 'Galactic Senate']);
	});

	it('returns empty for no org fields / missing frontmatter', () => {
		expect(collectOrgReferenceNames({ name: 'Someone' })).toEqual([]);
		expect(collectOrgReferenceNames(null)).toEqual([]);
		expect(collectOrgReferenceNames(undefined)).toEqual([]);
	});
});

describe('computeOrgIdBackfill (#708)', () => {
	it('fills the new cr_id into the aligned empty slot for a matching org', () => {
		expect(computeOrgIdBackfill(['[[Jedi Order]]'], [''], 'Jedi Order', 'org-jedi-1'))
			.toEqual(['org-jedi-1']);
	});

	it('keeps the arrays index-aligned when membership_org_ids is missing or short', () => {
		expect(computeOrgIdBackfill(['[[Senate]]', '[[Jedi Order]]'], undefined, 'Jedi Order', 'org-jedi-1'))
			.toEqual(['', 'org-jedi-1']);
	});

	it('does not overwrite an existing id, and matches case-insensitively', () => {
		expect(computeOrgIdBackfill(['[[Jedi Order]]'], ['org-existing'], 'jedi order', 'org-jedi-1'))
			.toBeNull();
	});

	it('returns null when nothing references the orphan or there are no membership_orgs', () => {
		expect(computeOrgIdBackfill(['[[Senate]]'], [''], 'Jedi Order', 'org-jedi-1')).toBeNull();
		expect(computeOrgIdBackfill(undefined, undefined, 'Jedi Order', 'org-jedi-1')).toBeNull();
	});
});
