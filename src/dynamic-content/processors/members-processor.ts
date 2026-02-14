/**
 * Members Processor
 *
 * Handles the `charted-roots-members` code block.
 * Renders organization members grouped by role.
 *
 * Usage in a note:
 * ```charted-roots-members
 * group-by: role
 * ```
 */

import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type CanvasRootsPlugin from '../../../main';
import { DynamicContentService } from '../services/dynamic-content-service';
import { MembersRenderer, type MembersContext } from '../renderers/members-renderer';
import { createOrganizationService } from '../../organizations/services/organization-service';
import { createMembershipService } from '../../organizations/services/membership-service';
import { isOrganizationNote } from '../../utils/note-type-detection';

/**
 * Processor for charted-roots-members code blocks
 */
export class MembersProcessor {
	private plugin: CanvasRootsPlugin;
	private service: DynamicContentService;
	private renderer: MembersRenderer;

	constructor(plugin: CanvasRootsPlugin) {
		this.plugin = plugin;
		this.service = new DynamicContentService(plugin);
		this.renderer = new MembersRenderer(this.service);
	}

	/**
	 * Process a charted-roots-members code block
	 */
	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		try {
			// Parse config from code block source
			const config = this.service.parseConfig(source);

			// Create a MarkdownRenderChild for proper cleanup
			const component = new MarkdownRenderChild(el);
			ctx.addChild(component);

			// Resolve organization context
			const context = this.resolveOrgContext(ctx);

			if (!context) {
				this.renderError(el, 'This block must be placed in an organization note with a cr_id.');
				return;
			}

			// Initial render
			await this.renderer.render(el, context, config, component);

			// Register for metadata changes to re-render when membership data changes
			const orgService = createOrganizationService(this.plugin);
			const membershipService = createMembershipService(this.plugin, orgService);
			const peopleFolder = this.plugin.settings.peopleFolder || '';

			const metadataHandler = async (changedFile: TFile) => {
				// Re-render if the org note itself changed
				if (changedFile.path === context.orgFile.path) {
					const freshContext = this.resolveOrgContext(ctx);
					if (freshContext) {
						el.empty();
						await this.renderer.render(el, freshContext, config, component);
					}
					return;
				}

				// Re-render if a person note changed (membership data lives on person notes)
				if (peopleFolder && changedFile.path.startsWith(peopleFolder)) {
					// Rebuild members from scratch
					const crId = context.organization.crId;
					const freshMembers = membershipService.getOrganizationMembers(crId);
					const freshContext: MembersContext = {
						...context,
						members: freshMembers
					};
					el.empty();
					await this.renderer.render(el, freshContext, config, component);
				}
			};

			component.registerEvent(
				this.plugin.app.metadataCache.on('changed', metadataHandler)
			);

		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.renderError(el, `Error rendering members: ${message}`);
		}
	}

	/**
	 * Resolve the organization context from the current file
	 */
	private resolveOrgContext(ctx: MarkdownPostProcessorContext): MembersContext | null {
		const app = this.plugin.app;

		// Get current file
		const currentFile = app.vault.getAbstractFileByPath(ctx.sourcePath);
		if (!(currentFile instanceof TFile)) {
			return null;
		}

		// Check if current note is an organization note
		const cache = app.metadataCache.getFileCache(currentFile);
		const fm = cache?.frontmatter;

		if (!isOrganizationNote(fm, cache, this.plugin.settings.noteTypeDetection)) {
			return null;
		}

		const crId = fm?.cr_id as string | undefined;
		if (!crId) {
			return null;
		}

		// Get organization and members
		const orgService = createOrganizationService(this.plugin);
		const membershipService = createMembershipService(this.plugin, orgService);

		const organization = orgService.getOrganizationByFile(currentFile);
		if (!organization) {
			return null;
		}

		const members = membershipService.getOrganizationMembers(crId);

		return {
			organization,
			members,
			orgFile: currentFile,
			app
		};
	}

	/**
	 * Render an error message
	 */
	private renderError(el: HTMLElement, message: string): void {
		const container = el.createDiv({ cls: 'cr-dynamic-block cr-dynamic-block--error' });
		container.createDiv({ cls: 'cr-dynamic-block__error-message', text: message });
	}
}
