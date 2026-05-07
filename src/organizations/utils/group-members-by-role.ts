/**
 * Group-members-by-role helper (#535).
 *
 * Pure function — no DOM, no Obsidian dependencies. Used by both the
 * Dynamic Members block (`charted-roots-members`) and the Organization
 * Profile View's Members section so the two surfaces share the same
 * grouping + ordering rules.
 */

/** Default heading used when an item has no role assigned. */
export const NO_ROLE_HEADING = 'Members';

/**
 * Anything that has a (possibly empty) `role` field can be grouped.
 * Intentionally minimal so both `MemberEntry` and `PersonMembership`
 * (and any future shape) can flow through.
 */
export interface HasRole {
	role: string;
}

/**
 * Group items by role with the standard role-order fallback chain:
 *
 *   1. If `roleOrder` is provided, those roles appear first in that
 *      sequence (only when at least one item carries each role).
 *   2. Remaining named roles follow alphabetically.
 *   3. The no-role group (if any) is always last.
 *
 * Input order within each role bucket is preserved — callers that need
 * a sort within a group should sort the input first and let the helper
 * group it.
 */
export function groupMembersByRole<T extends HasRole>(
	items: readonly T[],
	roleOrder?: readonly string[]
): Map<string, T[]> {
	const roleMap = new Map<string, T[]>();
	for (const item of items) {
		const role = item.role || NO_ROLE_HEADING;
		const group = roleMap.get(role) || [];
		group.push(item);
		roleMap.set(role, group);
	}

	const sorted = new Map<string, T[]>();

	if (roleOrder && roleOrder.length > 0) {
		const pinned = new Set(roleOrder);
		for (const role of roleOrder) {
			if (roleMap.has(role)) {
				sorted.set(role, roleMap.get(role)!);
			}
		}
		const remaining = Array.from(roleMap.keys())
			.filter(k => k !== NO_ROLE_HEADING && !pinned.has(k))
			.sort((a, b) => a.localeCompare(b));
		for (const key of remaining) {
			sorted.set(key, roleMap.get(key)!);
		}
	} else {
		const named = Array.from(roleMap.keys())
			.filter(k => k !== NO_ROLE_HEADING)
			.sort((a, b) => a.localeCompare(b));
		for (const key of named) {
			sorted.set(key, roleMap.get(key)!);
		}
	}

	if (roleMap.has(NO_ROLE_HEADING)) {
		sorted.set(NO_ROLE_HEADING, roleMap.get(NO_ROLE_HEADING)!);
	}

	return sorted;
}
