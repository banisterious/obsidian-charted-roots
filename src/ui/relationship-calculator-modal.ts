import { App, Modal, Notice } from 'obsidian';
import { PersonPickerModal, PersonInfo } from './person-picker';
import { RelationshipCalculator, RelationshipResult, RelationshipStep } from '../core/relationship-calculator';
import { createLucideIcon } from './lucide-icons';

/**
 * Modal for calculating relationships between two people
 */
export class RelationshipCalculatorModal extends Modal {
	private calculator: RelationshipCalculator;
	private personA: PersonInfo | null = null;
	private personB: PersonInfo | null = null;
	private result: RelationshipResult | null = null;

	// UI elements
	private personAContainer: HTMLElement;
	private personBContainer: HTMLElement;
	private calculateButton: HTMLButtonElement;
	private resultsContainer: HTMLElement;

	constructor(app: App) {
		super(app);
		this.calculator = new RelationshipCalculator(app);
	}

	/**
	 * Open the modal with a pre-selected person A
	 */
	openWithPersonA(person: PersonInfo): void {
		this.personA = person;
		this.open();
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add modal class for styling
		this.modalEl.addClass('cr-relationship-calculator-modal');

		// Create modal structure
		this.createModalContent();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createModalContent(): void {
		const { contentEl } = this;

		// Header
		const header = contentEl.createDiv({ cls: 'cr-relcalc-header' });
		const titleSection = header.createDiv({ cls: 'cr-relcalc-title' });
		const icon = createLucideIcon('git-compare', 20);
		titleSection.appendChild(icon);
		titleSection.appendText('Relationship calculator');

		// Description
		contentEl.createEl('p', {
			text: 'Select two people to calculate their family relationship.',
			cls: 'cr-relcalc-description'
		});

		// Person selection section
		const selectionSection = contentEl.createDiv({ cls: 'cr-relcalc-selection' });

		// Person A
		const personASection = selectionSection.createDiv({ cls: 'cr-relcalc-person' });
		personASection.createDiv({ cls: 'cr-relcalc-person__label', text: 'Person A' });
		this.personAContainer = personASection.createDiv({ cls: 'cr-relcalc-person__card' });
		this.renderPersonCard(this.personAContainer, this.personA, 'A');

		// Arrow indicator
		const arrowSection = selectionSection.createDiv({ cls: 'cr-relcalc-arrow' });
		const arrowIcon = createLucideIcon('arrow-right', 24);
		arrowSection.appendChild(arrowIcon);

		// Person B
		const personBSection = selectionSection.createDiv({ cls: 'cr-relcalc-person' });
		personBSection.createDiv({ cls: 'cr-relcalc-person__label', text: 'Person B' });
		this.personBContainer = personBSection.createDiv({ cls: 'cr-relcalc-person__card' });
		this.renderPersonCard(this.personBContainer, this.personB, 'B');

		// Calculate button
		const buttonContainer = contentEl.createDiv({ cls: 'cr-relcalc-actions' });
		this.calculateButton = buttonContainer.createEl('button', {
			cls: 'crc-btn crc-btn--primary crc-btn--large',
			text: 'Calculate relationship'
		});
		this.calculateButton.disabled = true;
		this.calculateButton.addEventListener('click', () => this.calculateRelationship());
		this.updateCalculateButton();

		// Results section (hidden initially)
		this.resultsContainer = contentEl.createDiv({ cls: 'cr-relcalc-results cr-hidden' });
	}

	private renderPersonCard(container: HTMLElement, person: PersonInfo | null, slot: 'A' | 'B'): void {
		container.empty();

		if (person) {
			// Show selected person
			const card = container.createDiv({ cls: 'cr-relcalc-card cr-relcalc-card--selected' });

			const cardMain = card.createDiv({ cls: 'cr-relcalc-card__main' });
			cardMain.createDiv({ cls: 'cr-relcalc-card__name', text: person.name });

			const cardMeta = card.createDiv({ cls: 'cr-relcalc-card__meta' });
			if (person.birthDate || person.deathDate) {
				const dates = person.birthDate && person.deathDate
					? `${person.birthDate} – ${person.deathDate}`
					: person.birthDate
						? `b. ${person.birthDate}`
						: `d. ${person.deathDate}`;
				cardMeta.createSpan({ cls: 'cr-relcalc-badge', text: dates });
			} else {
				cardMeta.createSpan({ cls: 'cr-relcalc-badge cr-relcalc-badge--id', text: person.crId });
			}

			// Change button
			const changeBtn = card.createEl('button', {
				cls: 'crc-btn crc-btn--text cr-relcalc-card__change',
				text: 'Change'
			});
			changeBtn.addEventListener('click', () => this.selectPerson(slot));
		} else {
			// Show empty state with select button
			const emptyCard = container.createDiv({ cls: 'cr-relcalc-card cr-relcalc-card--empty' });

			const emptyIcon = createLucideIcon('user-plus', 32);
			emptyIcon.addClass('cr-relcalc-card__icon');
			emptyCard.appendChild(emptyIcon);

			emptyCard.createDiv({ cls: 'cr-relcalc-card__empty-text', text: 'Click to select' });

			emptyCard.addEventListener('click', () => this.selectPerson(slot));
		}
	}

	private selectPerson(slot: 'A' | 'B'): void {
		const picker = new PersonPickerModal(this.app, (selectedPerson) => {
			if (slot === 'A') {
				this.personA = selectedPerson;
				this.renderPersonCard(this.personAContainer, this.personA, 'A');
			} else {
				this.personB = selectedPerson;
				this.renderPersonCard(this.personBContainer, this.personB, 'B');
			}
			this.updateCalculateButton();
			// Clear previous results when selection changes
			this.resultsContainer.addClass('cr-hidden');
			this.result = null;
		});
		picker.open();
	}

	private updateCalculateButton(): void {
		const canCalculate = this.personA !== null && this.personB !== null;
		this.calculateButton.disabled = !canCalculate;

		if (canCalculate) {
			this.calculateButton.removeClass('crc-btn--disabled');
		} else {
			this.calculateButton.addClass('crc-btn--disabled');
		}
	}

	private async calculateRelationship(): Promise<void> {
		if (!this.personA || !this.personB) {
			new Notice('Please select both people first');
			return;
		}

		// Show loading state
		this.calculateButton.disabled = true;
		this.calculateButton.setText('Calculating...');

		try {
			this.result = await this.calculator.calculateRelationship(
				this.personA.crId,
				this.personB.crId
			);

			if (this.result) {
				this.renderResults();
			} else {
				new Notice('Could not calculate relationship');
			}
		} catch (error: unknown) {
			console.error('Error calculating relationship:', error);
			new Notice('Error calculating relationship');
		} finally {
			this.calculateButton.disabled = false;
			this.calculateButton.setText('Calculate relationship');
		}
	}

	private renderResults(): void {
		if (!this.result) return;

		this.resultsContainer.empty();
		this.resultsContainer.removeClass('cr-hidden');

		// Result header
		const resultHeader = this.resultsContainer.createDiv({ cls: 'cr-relcalc-result-header' });

		// Relationship badge
		const relationshipBadge = resultHeader.createDiv({ cls: 'cr-relcalc-result-badge' });
		const relationshipIcon = this.getRelationshipIcon(this.result);
		relationshipBadge.appendChild(relationshipIcon);
		relationshipBadge.createSpan({
			cls: 'cr-relcalc-result-badge__text',
			text: this.result.relationshipDescription
		});

		// Result details
		const resultDetails = this.resultsContainer.createDiv({ cls: 'cr-relcalc-result-details' });

		// Generations info
		if (this.result.generationsUp > 0 || this.result.generationsDown > 0) {
			const genInfo = resultDetails.createDiv({ cls: 'cr-relcalc-result-stat' });
			genInfo.createSpan({ cls: 'cr-relcalc-result-stat__label', text: 'Generations:' });
			const genText = [];
			if (this.result.generationsUp > 0) {
				genText.push(`${this.result.generationsUp} up`);
			}
			if (this.result.generationsDown > 0) {
				genText.push(`${this.result.generationsDown} down`);
			}
			genInfo.createSpan({ cls: 'cr-relcalc-result-stat__value', text: genText.join(', ') });
		}

		// Blood relation
		const bloodInfo = resultDetails.createDiv({ cls: 'cr-relcalc-result-stat' });
		bloodInfo.createSpan({ cls: 'cr-relcalc-result-stat__label', text: 'Blood relation:' });
		bloodInfo.createSpan({
			cls: `cr-relcalc-result-stat__value ${this.result.isBloodRelation ? 'cr-text--success' : ''}`,
			text: this.result.isBloodRelation ? 'Yes' : 'No'
		});

		// Direct line
		const directInfo = resultDetails.createDiv({ cls: 'cr-relcalc-result-stat' });
		directInfo.createSpan({ cls: 'cr-relcalc-result-stat__label', text: 'Direct line:' });
		directInfo.createSpan({
			cls: `cr-relcalc-result-stat__value ${this.result.isDirectLine ? 'cr-text--success' : ''}`,
			text: this.result.isDirectLine ? 'Yes' : 'No'
		});

		// Common ancestor (if applicable)
		if (this.result.commonAncestor && !this.result.isDirectLine) {
			const ancestorInfo = resultDetails.createDiv({ cls: 'cr-relcalc-result-stat' });
			ancestorInfo.createSpan({ cls: 'cr-relcalc-result-stat__label', text: 'Common ancestor:' });
			ancestorInfo.createSpan({
				cls: 'cr-relcalc-result-stat__value',
				text: this.result.commonAncestor.name
			});
		}

		// Path visualization
		if (this.result.path.length > 1) {
			this.renderPathVisualization(this.resultsContainer);
		}

		// Action buttons
		const actionButtons = this.resultsContainer.createDiv({ cls: 'cr-relcalc-result-actions' });

		const copyBtn = actionButtons.createEl('button', {
			cls: 'crc-btn crc-btn--secondary'
		});
		const copyIcon = createLucideIcon('copy', 14);
		copyBtn.appendChild(copyIcon);
		copyBtn.appendText('Copy result');
		copyBtn.addEventListener('click', () => this.copyResult());
	}

	private renderPathVisualization(container: HTMLElement): void {
		if (!this.result || this.result.path.length <= 1) return;

		const pathSection = container.createDiv({ cls: 'cr-relcalc-path' });
		pathSection.createDiv({ cls: 'cr-relcalc-path__title', text: 'Relationship path' });

		const pathContainer = pathSection.createDiv({ cls: 'cr-relcalc-path__container' });

		this.result.path.forEach((step, index) => {
			// Person node
			const nodeEl = pathContainer.createDiv({ cls: 'cr-relcalc-path__node' });
			nodeEl.createSpan({ cls: 'cr-relcalc-path__name', text: step.person.name });

			// Arrow and relationship label (except for last node)
			if (index < this.result!.path.length - 1) {
				const nextStep = this.result!.path[index + 1];
				const arrowEl = pathContainer.createDiv({ cls: 'cr-relcalc-path__arrow' });

				const dirIcon = this.getDirectionIcon(nextStep.direction);
				arrowEl.appendChild(dirIcon);

				arrowEl.createSpan({
					cls: 'cr-relcalc-path__relation',
					text: this.getRelationshipLabel(nextStep.relationship)
				});
			}
		});
	}

	private getRelationshipIcon(result: RelationshipResult): HTMLElement {
		if (result.relationshipDescription === 'Spouse') {
			return createLucideIcon('heart', 18);
		}
		if (result.isDirectLine && result.generationsUp > 0) {
			return createLucideIcon('arrow-up', 18);
		}
		if (result.isDirectLine && result.generationsDown > 0) {
			return createLucideIcon('arrow-down', 18);
		}
		if (result.relationshipDescription.includes('Sibling')) {
			return createLucideIcon('users', 18);
		}
		if (result.relationshipDescription.includes('Cousin')) {
			return createLucideIcon('git-branch', 18);
		}
		return createLucideIcon('link', 18);
	}

	private getDirectionIcon(direction: RelationshipStep['direction']): HTMLElement {
		switch (direction) {
			case 'up':
				return createLucideIcon('arrow-up', 14);
			case 'down':
				return createLucideIcon('arrow-down', 14);
			case 'lateral':
				return createLucideIcon('arrow-right', 14);
			default:
				return createLucideIcon('circle', 14);
		}
	}

	private getRelationshipLabel(relationship: RelationshipStep['relationship']): string {
		switch (relationship) {
			case 'father':
				return 'Father';
			case 'mother':
				return 'Mother';
			case 'spouse':
				return 'Spouse';
			case 'child':
				return 'Child';
			default:
				return '';
		}
	}

	private copyResult(): void {
		if (!this.result || !this.personA || !this.personB) return;

		const lines = [
			`Relationship: ${this.personA.name} → ${this.personB.name}`,
			`Result: ${this.result.relationshipDescription}`,
			''
		];

		if (this.result.generationsUp > 0 || this.result.generationsDown > 0) {
			lines.push(`Generations: ${this.result.generationsUp} up, ${this.result.generationsDown} down`);
		}

		lines.push(`Blood relation: ${this.result.isBloodRelation ? 'Yes' : 'No'}`);
		lines.push(`Direct line: ${this.result.isDirectLine ? 'Yes' : 'No'}`);

		if (this.result.commonAncestor && !this.result.isDirectLine) {
			lines.push(`Common ancestor: ${this.result.commonAncestor.name}`);
		}

		if (this.result.path.length > 1) {
			lines.push('');
			lines.push('Path:');
			this.result.path.forEach((step, index) => {
				if (index === 0) {
					lines.push(`  ${step.person.name}`);
				} else {
					lines.push(`  → ${step.relationship} → ${step.person.name}`);
				}
			});
		}

		navigator.clipboard.writeText(lines.join('\n'));
		new Notice('Result copied to clipboard');
	}
}
