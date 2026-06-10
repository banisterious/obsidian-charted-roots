/**
 * Pure helpers for orphan-organization detection and adoption (#708).
 *
 * An "orphan" organization is a name referenced by an entity — an event's
 * `organizations` list, a person's `membership_orgs` / legacy membership
 * fields — that has no matching organization note. Mirrors the orphan-universe
 * feature, but organization references are wikilinks resolved by basename
 * rather than plain string values.
 *
 * These functions are deliberately free of Obsidian APIs so they can be unit
 * tested; the service layer feeds them frontmatter and the known-org set.
 */

const WIKILINK_RE = /^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/;

/**
 * Normalize an organization reference value to a bare name: strip wikilink
 * brackets and any alias, drop a folder path, and trim. A plain string is
 * returned trimmed.
 */
export function normalizeOrgRefName(value: unknown): string {
	if (typeof value !== 'string') return '';
	const trimmed = value.trim();
	const match = trimmed.match(WIKILINK_RE);
	const target = match ? match[1] : trimmed;
	const base = target.includes('/') ? target.slice(target.lastIndexOf('/') + 1) : target;
	return base.trim();
}

/** Coerce a frontmatter value to a string array (single value → one-element array). */
function toArray(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

/**
 * Collect every organization name a note's frontmatter references, across all
 * supported fields, deduped (case-insensitive, first spelling wins). Covers the
 * event `organizations` list, the flat `membership_orgs` list, the legacy
 * nested `memberships[].org`, and the legacy singular `organization` / `house`.
 */
export function collectOrgReferenceNames(fm: Record<string, unknown> | undefined | null): string[] {
	if (!fm) return [];
	const names: string[] = [];
	const seen = new Set<string>();

	const add = (raw: unknown): void => {
		const name = normalizeOrgRefName(raw);
		if (!name) return;
		const key = name.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		names.push(name);
	};

	for (const v of toArray(fm.organizations)) add(v);
	for (const v of toArray(fm.membership_orgs)) add(v);
	for (const m of toArray(fm.memberships)) {
		if (m && typeof m === 'object' && 'org' in m) add((m as { org: unknown }).org);
	}
	add(fm.organization);
	add(fm.house);

	return names;
}

/**
 * Given the index-aligned `membership_orgs` / `membership_org_ids` arrays of a
 * person note, return an updated `membership_org_ids` array that fills in
 * `newCrId` at every position whose org name matches `orphanName` and whose id
 * slot is currently empty. The result is padded to the length of
 * `membershipOrgs` so the two arrays stay index-aligned. Returns `null` when
 * nothing changed (no matching, already-filled, or no membership_orgs).
 */
export function computeOrgIdBackfill(
	membershipOrgs: unknown,
	membershipOrgIds: unknown,
	orphanName: string,
	newCrId: string
): string[] | null {
	const orgs = toArray(membershipOrgs).map(v => (typeof v === 'string' ? v : ''));
	if (orgs.length === 0) return null;
	const ids = toArray(membershipOrgIds).map(v => (typeof v === 'string' ? v : ''));

	const target = orphanName.trim().toLowerCase();
	const result: string[] = [];
	let changed = false;

	for (let i = 0; i < orgs.length; i++) {
		const existing = ids[i] ?? '';
		const matches = normalizeOrgRefName(orgs[i]).toLowerCase() === target;
		if (matches && !existing) {
			result.push(newCrId);
			changed = true;
		} else {
			result.push(existing);
		}
	}

	return changed ? result : null;
}
