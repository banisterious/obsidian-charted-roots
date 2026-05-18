import { TFile } from 'obsidian';
import { getLogger } from './logging';

const logger = getLogger('conflict-policy');

/**
 * Resolution returned by a conflict policy.
 * 'replace' proceeds with the overwrite; 'cancel' aborts the write.
 */
export type ConflictDecision = 'replace' | 'cancel';

/**
 * Context describing the conflict that the policy is being asked to resolve.
 *
 * `existingValue` and `newValue` are the raw frontmatter values (typically
 * cr_ids for `*_id` fields, or wikilinks for the display fields).
 * `existingDisplay` and `newDisplay` are human-readable strings used by
 * prompts (typically person names or rendered wikilinks).
 */
export interface ConflictContext {
	fieldName: string;
	fieldLabel: string;
	existingValue: string;
	newValue: string;
	existingDisplay: string;
	newDisplay: string;
	subjectFile: TFile;
}

/**
 * A conflict policy decides what to do when a write would overwrite a
 * non-empty scalar relationship field (`father` / `mother` / `spouse`).
 *
 * UI-driven write paths (Add Relationship modal, Create / Edit Person)
 * should pass a prompt policy that surfaces a confirmation modal.
 * Reactive write paths (bidi-linker reciprocal writes, rename cascades)
 * should pass `skipOnConflict` so an unexpected conflict is logged and
 * skipped instead of producing a surprise modal during background sync.
 */
export type ConflictPolicy = (ctx: ConflictContext) => Promise<ConflictDecision>;

/**
 * Log the conflict and refuse the overwrite. Use for reactive write
 * paths where prompting would be jarring (bidi-linker, rename cascades).
 */
export const skipOnConflict: ConflictPolicy = async (ctx) => {
	logger.warn('skipOnConflict', `Skipping write due to conflict on ${ctx.fieldName}`, {
		file: ctx.subjectFile.path,
		fieldName: ctx.fieldName,
		existingValue: ctx.existingValue,
		newValue: ctx.newValue,
	});
	return 'cancel';
};

/**
 * Proceed with the overwrite unconditionally. Matches the pre-v0.22.47
 * default behavior. Provided so tests and explicit-overwrite paths can
 * opt in without depending on a falsy / undefined policy reference.
 */
export const overwriteOnConflict: ConflictPolicy = () => Promise.resolve('replace');
