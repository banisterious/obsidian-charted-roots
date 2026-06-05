import { describe, it, expect } from 'vitest';
import { summarizeCoreIssues } from '../src/statistics/services/core-issues-summary';

describe('summarizeCoreIssues', () => {
	it('lists all three categories when each contributes', () => {
		const result = summarizeCoreIssues({ missingBirthDate: 3, orphanedPeople: 6, unsourcedEvents: 14 });
		expect(result.count).toBe(23);
		expect(result.subtitle).toBe('Missing births + orphans + unsourced events');
	});

	it('omits missing births when birth dates are complete (#676)', () => {
		const result = summarizeCoreIssues({ missingBirthDate: 0, orphanedPeople: 6, unsourcedEvents: 14 });
		expect(result.count).toBe(20);
		expect(result.subtitle).toBe('Orphans + unsourced events');
	});

	it('names a single contributing category', () => {
		const result = summarizeCoreIssues({ missingBirthDate: 0, orphanedPeople: 0, unsourcedEvents: 14 });
		expect(result.count).toBe(14);
		expect(result.subtitle).toBe('Unsourced events');
	});

	it('capitalizes a lone missing-births category', () => {
		const result = summarizeCoreIssues({ missingBirthDate: 5, orphanedPeople: 0, unsourcedEvents: 0 });
		expect(result.count).toBe(5);
		expect(result.subtitle).toBe('Missing births');
	});

	it('reports no core issues when everything is clean', () => {
		const result = summarizeCoreIssues({ missingBirthDate: 0, orphanedPeople: 0, unsourcedEvents: 0 });
		expect(result.count).toBe(0);
		expect(result.subtitle).toBe('No core issues');
	});
});
