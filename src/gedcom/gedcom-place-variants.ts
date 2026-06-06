/**
 * Conservative consolidation of variant place spellings during GEDCOM import
 * (#687). A single real place often appears under several `PLAC` forms across a
 * GEDCOM — "Montréal, Québec, Canada" / "Montreal, Quebec, Canada" / "Montreal,
 * QC, Canada" — and the importer used to spawn a separate note for each, which
 * fragments everything attached to that location.
 *
 * This module groups the collected place strings into variant sets and picks one
 * canonical display string per set, so the importer creates one note and folds
 * the other forms into its `historical_names` (coordinating with #635). It is
 * deliberately conservative: it merges only forms that are unambiguously the same
 * place — pure spelling variants (case / accents / whitespace / trailing
 * punctuation), and "same town, different jurisdiction tier" variants where the
 * leaf plus at least one more segment agree. It never merges on a leaf-only
 * match, so two distinct places that happen to share a leaf name (Quebec the
 * province vs Quebec the city) are left alone.
 *
 * Abbreviation expansion (QC -> Quebec, SC -> South Carolina) happens upstream in
 * the importer's place-string normalization, so those forms already share a
 * spelling signature by the time they reach here.
 *
 * Pure and vault-free: the "same location, different jurisdiction" decision is
 * injected as a predicate (the importer passes the segment-aware comparison).
 */

/** Strip diacritics so "Montréal" and "Montreal" fold together. */
function stripDiacritics(value: string): string {
	return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * A spelling signature for a place string: each comma segment lowercased, with
 * diacritics, periods (abbreviation dots), and whitespace runs removed, rejoined
 * with a delimiter. Two strings with the same signature are the same place
 * written differently (accents, case, spacing, "St." vs "St", "U.S.A." vs "USA").
 */
export function placeSpellingSignature(place: string): string {
	return place
		.split(',')
		.map(seg => stripDiacritics(seg).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim())
		.filter(seg => seg.length > 0)
		.join('|');
}

function segmentCount(place: string): number {
	return place.split(',').filter(s => s.trim().length > 0).length;
}

function hasDiacritics(place: string): boolean {
	return stripDiacritics(place) !== place;
}

/**
 * Pick the canonical display string from a set of variant forms. Prefers the
 * most-qualified form (most segments), then the richer spelling (keeps accents),
 * then the longer string, then alphabetical — so the choice is deterministic and
 * the kept form carries the most information. The discarded forms are preserved
 * as historical names, so this choice never loses data.
 */
function pickCanonical(variants: string[]): string {
	return [...variants].sort((a, b) => {
		const seg = segmentCount(b) - segmentCount(a);
		if (seg !== 0) return seg;
		const dia = Number(hasDiacritics(b)) - Number(hasDiacritics(a));
		if (dia !== 0) return dia;
		if (b.length !== a.length) return b.length - a.length;
		return a.localeCompare(b);
	})[0];
}

/**
 * Merge variant place strings into an existing historical-names list (#687,
 * reusing the #635 `historical_names` shape). Dedupes case-insensitively and
 * skips any form equal to the place's own name, so re-importing the same GEDCOM
 * doesn't pile up duplicate entries. Returns the merged list (existing entries
 * first); compare its length to the input to detect "nothing new".
 */
export function mergeVariantHistoricalNames(
	existing: Array<{ name: string; period?: string }>,
	canonicalName: string,
	variants: string[]
): Array<{ name: string; period?: string }> {
	const result = existing.map(h => ({ ...h }));
	const seen = new Set(result.map(h => h.name.trim().toLowerCase()));
	const canonicalKey = canonicalName.trim().toLowerCase();
	for (const variant of variants) {
		const name = variant.trim();
		const key = name.toLowerCase();
		if (!key || key === canonicalKey || seen.has(key)) continue;
		seen.add(key);
		result.push({ name });
	}
	return result;
}

export interface PlaceVariantConsolidation {
	/** Every input place string mapped to the canonical it consolidates into. */
	canonicalOf: Map<string, string>;
	/** Each canonical mapped to every input string in its group (canonical included). */
	membersOf: Map<string, string[]>;
	/**
	 * Each canonical mapped to its discarded variant display strings (the group's
	 * other forms), for writing as historical_names. Empty when a place had no
	 * variants.
	 */
	variantsOf: Map<string, string[]>;
}

/**
 * Group place strings into variant sets and choose a canonical for each.
 *
 * Two passes, both conservative:
 *  1. Spelling fold — group by {@link placeSpellingSignature} (case / accents /
 *     whitespace / trailing punctuation). These are unambiguously one place.
 *  2. Jurisdiction tier — union the spelling-canonicals where `isSameLocationVariant`
 *     says they are the same town under a differently-named higher tier (the
 *     importer passes a predicate that already requires the leaf plus at least
 *     one more segment to agree, so leaf-only collisions never merge).
 *
 * When no variants exist every place maps to itself with empty `variantsOf`, so
 * importing a clean GEDCOM is unaffected.
 */
export function consolidatePlaceVariants(
	placeStrings: string[],
	isSameLocationVariant: (a: string, b: string) => boolean
): PlaceVariantConsolidation {
	// Unique inputs, first-seen order preserved for stable grouping.
	const unique: string[] = [];
	const seen = new Set<string>();
	for (const place of placeStrings) {
		if (place && !seen.has(place)) {
			seen.add(place);
			unique.push(place);
		}
	}

	// Pass 1: fold pure spelling variants together.
	const bySignature = new Map<string, string[]>();
	for (const place of unique) {
		const sig = placeSpellingSignature(place);
		const group = bySignature.get(sig);
		if (group) {
			group.push(place);
		} else {
			bySignature.set(sig, [place]);
		}
	}
	// Spelling-canonical for each fold group, paired with its full member list.
	const spellingGroups = Array.from(bySignature.values()).map(members => ({
		canonical: pickCanonical(members),
		members,
	}));

	// Pass 2: union spelling-canonicals that are the same place under a different
	// jurisdiction tier. Simple union-find over the spelling-canonicals.
	const parent = new Map<string, string>();
	const find = (x: string): string => {
		let root = x;
		while (parent.get(root) !== root) root = parent.get(root) ?? root;
		let cur = x;
		while (parent.get(cur) !== root) {
			const next = parent.get(cur) ?? root;
			parent.set(cur, root);
			cur = next;
		}
		return root;
	};
	for (const g of spellingGroups) parent.set(g.canonical, g.canonical);
	const canonicals = spellingGroups.map(g => g.canonical);
	for (let i = 0; i < canonicals.length; i++) {
		for (let j = i + 1; j < canonicals.length; j++) {
			if (isSameLocationVariant(canonicals[i], canonicals[j])) {
				parent.set(find(canonicals[i]), find(canonicals[j]));
			}
		}
	}

	// Gather all input members under each union root, then choose a final canonical.
	const membersByRoot = new Map<string, string[]>();
	for (const g of spellingGroups) {
		const root = find(g.canonical);
		const bucket = membersByRoot.get(root);
		if (bucket) {
			bucket.push(...g.members);
		} else {
			membersByRoot.set(root, [...g.members]);
		}
	}

	const canonicalOf = new Map<string, string>();
	const membersOf = new Map<string, string[]>();
	const variantsOf = new Map<string, string[]>();
	for (const members of membersByRoot.values()) {
		const canonical = pickCanonical(members);
		membersOf.set(canonical, members);
		for (const member of members) {
			canonicalOf.set(member, canonical);
		}
		// Discarded variants = every distinct display form other than the canonical.
		const variants = members.filter(m => m !== canonical);
		if (variants.length > 0) {
			variantsOf.set(canonical, variants);
		}
	}

	return { canonicalOf, membersOf, variantsOf };
}
