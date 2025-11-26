import { App, TFile, Notice } from 'obsidian';

/**
 * Service for managing relationships between person notes
 * Handles bidirectional relationship updates in note frontmatter
 */
export class RelationshipManager {
	constructor(private app: App) {}

	/**
	 * Add a parent-child relationship
	 * Updates child's father_id/mother_id and parent's children_id
	 */
	async addParentRelationship(
		childFile: TFile,
		parentFile: TFile,
		parentType: 'father' | 'mother'
	): Promise<void> {
		// Extract cr_ids from both notes
		const childCrId = await this.extractCrId(childFile);
		const parentCrId = await this.extractCrId(parentFile);
		const parentSex = await this.extractSex(parentFile);

		if (!childCrId || !parentCrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return;
		}

		// Validate parent type matches sex
		if (parentType === 'father' && parentSex === 'F') {
			new Notice('Warning: selected person has sex: F but being added as father');
		} else if (parentType === 'mother' && parentSex === 'M') {
			new Notice('Warning: selected person has sex: M but being added as mother');
		}

		// Update child's frontmatter
		await this.updateParentField(childFile, parentCrId, parentType);

		// Update parent's children_id array
		await this.addToChildrenArray(parentFile, childCrId);

		new Notice(
			`Added ${parentFile.basename} as ${parentType} of ${childFile.basename}`
		);
	}

	/**
	 * Add a spouse relationship
	 * Updates both notes' spouse_id arrays (bidirectional)
	 */
	async addSpouseRelationship(person1File: TFile, person2File: TFile): Promise<void> {
		const person1CrId = await this.extractCrId(person1File);
		const person2CrId = await this.extractCrId(person2File);

		if (!person1CrId || !person2CrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return;
		}

		// Add each person to the other's spouse_id array
		await this.addToSpouseArray(person1File, person2CrId);
		await this.addToSpouseArray(person2File, person1CrId);

		new Notice(`Added spouse relationship between ${person1File.basename} and ${person2File.basename}`);
	}

	/**
	 * Add a parent-child relationship (inverse of addParent)
	 * Updates parent's children_id and child's father_id/mother_id
	 */
	async addChildRelationship(
		parentFile: TFile,
		childFile: TFile
	): Promise<void> {
		const parentCrId = await this.extractCrId(parentFile);
		const childCrId = await this.extractCrId(childFile);
		const parentSex = await this.extractSex(parentFile);

		if (!childCrId || !parentCrId) {
			new Notice('Error: could not find cr_id in one or both notes');
			return;
		}

		// Determine parent type from sex
		const parentType: 'father' | 'mother' = parentSex === 'F' ? 'mother' : 'father';

		// Update child's frontmatter
		await this.updateParentField(childFile, parentCrId, parentType);

		// Update parent's children_id array
		await this.addToChildrenArray(parentFile, childCrId);

		new Notice(`Added ${childFile.basename} as child of ${parentFile.basename}`);
	}

	/**
	 * Extract cr_id from note frontmatter
	 */
	private async extractCrId(file: TFile): Promise<string | null> {
		const content = await this.app.vault.read(file);
		const match = content.match(/^cr_id:\s*(.+)$/m);
		return match ? match[1].trim() : null;
	}

	/**
	 * Extract sex from note frontmatter
	 */
	private async extractSex(file: TFile): Promise<string | null> {
		const content = await this.app.vault.read(file);
		const match = content.match(/^sex:\s*(.+)$/m);
		return match ? match[1].trim() : null;
	}

	/**
	 * Update father_id or mother_id field in child's frontmatter
	 */
	private async updateParentField(
		childFile: TFile,
		parentCrId: string,
		parentType: 'father' | 'mother'
	): Promise<void> {
		const content = await this.app.vault.read(childFile);
		const fieldName = parentType === 'father' ? 'father_id' : 'mother_id';

		// Check if field already exists
		const existingMatch = content.match(new RegExp(`^${fieldName}:\\s*(.+)$`, 'm'));

		if (existingMatch) {
			// Field exists, check if it's empty or already has a value
			const existingValue = existingMatch[1].trim();
			if (existingValue && existingValue !== '""' && existingValue !== "''") {
				new Notice(`Warning: ${fieldName} already set to ${existingValue}, replacing with ${parentCrId}`);
			}

			// Replace existing field
			const updatedContent = content.replace(
				new RegExp(`^${fieldName}:\\s*.*$`, 'm'),
				`${fieldName}: ${parentCrId}`
			);
			await this.app.vault.modify(childFile, updatedContent);
		} else {
			// Field doesn't exist, add it after cr_id
			const updatedContent = content.replace(
				/^(cr_id:\s*.+)$/m,
				`$1\n${fieldName}: ${parentCrId}`
			);
			await this.app.vault.modify(childFile, updatedContent);
		}
	}

	/**
	 * Add cr_id to parent's children_id array
	 */
	private async addToChildrenArray(parentFile: TFile, childCrId: string): Promise<void> {
		const content = await this.app.vault.read(parentFile);

		// Check if child already in children_id
		const childrenMatch = content.match(/^children_id:\s*$/m);
		if (childrenMatch) {
			// Array format exists, check if child already listed
			const arrayMatch = content.match(/^children_id:\s*\n((?: {2}- .+\n)*)/m);
			if (arrayMatch) {
				const arrayContent = arrayMatch[1];
				if (arrayContent.includes(childCrId)) {
					// Already listed
					return;
				}
				// Add to existing array
				const updatedContent = content.replace(
					/^(children_id:\s*\n(?: {2}- .+\n)*)/m,
					`$1  - ${childCrId}\n`
				);
				await this.app.vault.modify(parentFile, updatedContent);
				return;
			}
		}

		// Check if single value format exists
		const singleMatch = content.match(/^children_id:\s*(.+)$/m);
		if (singleMatch) {
			const existingValue = singleMatch[1].trim();
			if (existingValue === childCrId) {
				// Already set
				return;
			}
			// Convert to array format
			const updatedContent = content.replace(
				/^children_id:\s*.+$/m,
				`children_id:\n  - ${existingValue}\n  - ${childCrId}`
			);
			await this.app.vault.modify(parentFile, updatedContent);
			return;
		}

		// Field doesn't exist, create it
		const updatedContent = content.replace(
			/^(cr_id:\s*.+)$/m,
			`$1\nchildren_id:\n  - ${childCrId}`
		);
		await this.app.vault.modify(parentFile, updatedContent);
	}

	/**
	 * Add cr_id to person's spouse_id array
	 */
	private async addToSpouseArray(personFile: TFile, spouseCrId: string): Promise<void> {
		const content = await this.app.vault.read(personFile);

		// Check if spouse already in spouse_id
		const spouseMatch = content.match(/^spouse_id:\s*$/m);
		if (spouseMatch) {
			// Array format exists, check if spouse already listed
			const arrayMatch = content.match(/^spouse_id:\s*\n((?: {2}- .+\n)*)/m);
			if (arrayMatch) {
				const arrayContent = arrayMatch[1];
				if (arrayContent.includes(spouseCrId)) {
					// Already listed
					return;
				}
				// Add to existing array
				const updatedContent = content.replace(
					/^(spouse_id:\s*\n(?: {2}- .+\n)*)/m,
					`$1  - ${spouseCrId}\n`
				);
				await this.app.vault.modify(personFile, updatedContent);
				return;
			}
		}

		// Check if single value format exists
		const singleMatch = content.match(/^spouse_id:\s*(.+)$/m);
		if (singleMatch) {
			const existingValue = singleMatch[1].trim();
			if (existingValue === spouseCrId) {
				// Already set
				return;
			}
			// Convert to array format
			const updatedContent = content.replace(
				/^spouse_id:\s*.+$/m,
				`spouse_id:\n  - ${existingValue}\n  - ${spouseCrId}`
			);
			await this.app.vault.modify(personFile, updatedContent);
			return;
		}

		// Field doesn't exist, create it
		const updatedContent = content.replace(
			/^(cr_id:\s*.+)$/m,
			`$1\nspouse_id:\n  - ${spouseCrId}`
		);
		await this.app.vault.modify(personFile, updatedContent);
	}
}
