/**
 * Data Quality Section (Person)
 *
 * Displays research level, source coverage percentage,
 * research questions, and proof summary links.
 */

import type { App } from 'obsidian';
import type { PersonProfileData, SectionToggleFn, SectionState } from '../profile-types';
import { renderProfileSection } from './section-base';

interface DataQualitySectionOptions {
	sectionStates: SectionState;
	onToggle: SectionToggleFn;
	app: App;
}

/** Research level labels (Hoitink's Six Levels) */
const RESEARCH_LEVEL_LABELS: Record<number, string> = {
	0: 'Unidentified',
	1: 'Name only',
	2: 'Dates & places',
	3: 'Sources attached',
	4: 'Evidence analyzed',
	5: 'Proof complete',
	6: 'Biography'
};

export function renderDataQualitySection(
	parent: HTMLElement,
	data: PersonProfileData,
	options: DataQualitySectionOptions
): void {
	const hasLevel = data.node.researchLevel !== undefined && data.node.researchLevel !== null;
	const hasCoverage = data.researchCoverage !== null;
	const hasQuestions = data.needsResearch.length > 0;
	const hasProofs = data.proofSummaries.length > 0;

	if (!hasLevel && !hasCoverage && !hasQuestions && !hasProofs) return;

	// Build summary
	const summaryParts: string[] = [];
	if (hasLevel) {
		summaryParts.push(`Level ${data.node.researchLevel}`);
	}
	if (hasCoverage) {
		summaryParts.push(`${data.researchCoverage!.coveragePercent}% sourced`);
	}
	const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : 'No research data';

	const content = renderProfileSection(parent, {
		sectionId: 'data-quality',
		title: 'Data quality',
		summary,
		expanded: options.sectionStates['data-quality'] ?? false,
		onToggle: options.onToggle,
		icon: 'shield-check'
	});
	if (!content) return;

	// Research level
	if (hasLevel) {
		const levelEl = content.createDiv({ cls: 'cr-profile__dq-level' });
		const level = data.node.researchLevel!;
		levelEl.createSpan({ text: 'Research level: ', cls: 'cr-profile__dq-label' });
		levelEl.createSpan({
			text: `${level} — ${RESEARCH_LEVEL_LABELS[level] || 'Unknown'}`,
			cls: 'cr-profile__dq-value'
		});

		// Visual bar
		const bar = content.createDiv({ cls: 'cr-profile__dq-bar' });
		const fill = bar.createDiv({ cls: 'cr-profile__dq-bar-fill' });
		fill.style.width = `${(level / 6) * 100}%`;
	}

	// Source coverage
	if (hasCoverage) {
		const coverage = data.researchCoverage!;
		const covEl = content.createDiv({ cls: 'cr-profile__dq-coverage' });
		covEl.createSpan({ text: 'Source coverage: ', cls: 'cr-profile__dq-label' });
		covEl.createSpan({
			text: `${coverage.coveragePercent}% (${coverage.sourcedFactCount}/${coverage.totalFactCount} facts)`,
			cls: 'cr-profile__dq-value'
		});

		// Per-fact breakdown
		if (coverage.facts && coverage.facts.length > 0) {
			const factList = content.createDiv({ cls: 'cr-profile__dq-facts' });
			for (const fact of coverage.facts) {
				const factRow = factList.createDiv({ cls: 'cr-profile__dq-fact-row' });
				const factLabel = fact.factKey.replace(/_/g, ' ');
				factRow.createSpan({ text: factLabel, cls: 'cr-profile__dq-fact-key' });
				factRow.createSpan({
					text: fact.status,
					cls: `cr-profile__dq-fact-status cr-profile__dq-fact-status--${fact.status}`
				});
			}
		}
	}

	// Research questions
	if (hasQuestions) {
		const qEl = content.createDiv({ cls: 'cr-profile__dq-questions' });
		qEl.createSpan({
			text: `Research questions (${data.needsResearch.length})`,
			cls: 'cr-profile__dq-label'
		});
		const qList = qEl.createEl('ul');
		for (const q of data.needsResearch) {
			qList.createEl('li', { text: q });
		}
	}

	// Proof summaries
	if (hasProofs) {
		const proofEl = content.createDiv({ cls: 'cr-profile__dq-proofs' });
		proofEl.createSpan({
			text: `Proof summaries (${data.proofSummaries.length})`,
			cls: 'cr-profile__dq-label'
		});
		const proofList = proofEl.createDiv();
		for (const proof of data.proofSummaries) {
			const proofLink = proofList.createSpan({
				text: proof.title || proof.filePath,
				cls: 'cr-profile__entity-link'
			});
			proofLink.addEventListener('click', () => {
				void options.app.workspace.openLinkText(proof.filePath, '');
			});
		}
	}
}
