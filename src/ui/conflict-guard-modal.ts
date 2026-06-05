/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Obsidian Modal / Setting APIs are typed loosely (any-typed surfaces); project policy accepts these. */
import { App, ButtonComponent, Modal } from 'obsidian';
import type { ConflictContext, ConflictDecision } from '../core/conflict-policy';
import { setButtonDestructive } from './button-helpers';

/**
 * Confirmation modal shown when a write would overwrite an existing
 * scalar relationship field (father / mother / spouse) with a different
 * person reference.
 *
 * Default decision on close-without-button (X / Escape / click-out) is
 * `cancel`, so accidental dismissal preserves the existing data (#606).
 */
export class ConflictGuardModal extends Modal {
	private decision: ConflictDecision = 'cancel';
	private resolveFn: ((decision: ConflictDecision) => void) | null = null;

	private constructor(app: App, private readonly ctx: ConflictContext) {
		super(app);
	}

	/**
	 * Open the modal and return a promise resolving to the user's decision.
	 * The promise resolves once the modal is closed (whether by button click
	 * or dismissal); dismissal resolves to `cancel`.
	 */
	static prompt(app: App, ctx: ConflictContext): Promise<ConflictDecision> {
		return new Promise((resolve) => {
			const modal = new ConflictGuardModal(app, ctx);
			modal.resolveFn = resolve;
			modal.open();
		});
	}

	onOpen(): void {
		const { contentEl, ctx } = this;
		contentEl.empty();
		contentEl.addClass('crc-conflict-guard-modal');

		contentEl.createEl('h2', { text: 'Replace existing value?' });

		const body = contentEl.createDiv({ cls: 'crc-conflict-guard-body' });
		body.createEl('p', {
			text: `${ctx.subjectFile.basename} already has ${ctx.fieldLabel} set to ${ctx.existingDisplay}.`,
		});
		body.createEl('p', {
			text: `Replacing it with ${ctx.newDisplay} will remove the existing reference from the note's frontmatter.`,
		});

		const buttons = contentEl.createDiv({ cls: 'crc-conflict-guard-buttons' });
		new ButtonComponent(buttons)
			.setButtonText('Cancel')
			.onClick(() => {
				this.decision = 'cancel';
				this.close();
			});
		setButtonDestructive(new ButtonComponent(buttons)
			.setButtonText(`Replace ${ctx.existingDisplay}`))
			.onClick(() => {
				this.decision = 'replace';
				this.close();
			});
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolveFn?.(this.decision);
	}
}

/**
 * Convenience for UI construction sites: builds a prompt-style
 * `ConflictPolicy` bound to the given `App` reference.
 */
export function promptOnConflict(app: App) {
	return (ctx: ConflictContext) => ConflictGuardModal.prompt(app, ctx);
}

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call -- Match scope of file-level disable at top. */
