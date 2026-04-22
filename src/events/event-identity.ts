/**
 * Event identity helpers.
 *
 * Compute a canonical key for a (persons, event_type, date) tuple so
 * the life-events migration can detect when an existing event note
 * already encodes the event about to be created and skip creating a
 * duplicate (#414). The same key generator runs on both sides — the
 * inline event being migrated and the existing event-note frontmatter
 * on disk — so a successful match guarantees the migration can reuse
 * the existing note's wikilink rather than minting a new file.
 *
 * Pure: no I/O, no Obsidian types, fully unit-testable.
 */

/**
 * Input shape for computing an event identity. Persons may be given as
 * raw wikilinks (`"[[Alice]]"`, `"[[alice|Alice Smith]]"`) or plain
 * names; the helper strips wikilink syntax and aliases.
 */
export interface EventIdentityInput {
	persons: readonly string[];
	eventType: string;
	date?: string | number | null;
}

/**
 * Strip `[[...]]` wikilink syntax and any `|alias` suffix, keeping the
 * link target. Used so two references to the same person compare equal
 * regardless of wikilink-vs-plain-name or with/without alias.
 */
function normalizePersonRef(ref: string): string {
	let s = ref.trim();
	if (s.startsWith('[[') && s.endsWith(']]')) {
		s = s.slice(2, -2);
	}
	const pipeIdx = s.indexOf('|');
	if (pipeIdx !== -1) {
		s = s.slice(0, pipeIdx);
	}
	return s.trim();
}

/**
 * Coerce a date value to a trimmed string for exact-match identity.
 * Numbers (bare-year YAML) stringify. Null / undefined / empty → '',
 * so an event with no date matches another event with no date.
 */
function normalizeDate(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return '';
	return String(value).trim();
}

/**
 * Compute a canonical identity key for an event. Two events produce the
 * same key when they represent the same (person-set, event_type, date)
 * tuple. Persons are sorted so argument order doesn't affect the key.
 * Returns null when required fields (persons or event_type) are missing
 * or empty — such events can't participate in dedup matching.
 *
 * Date matching is strict string equality (after trim). `"1850"` does
 * NOT match `"1850-01-01"`; the intent is to dedup re-runs of identical
 * source data, not to collapse refinements the user has made to an
 * existing event note.
 */
export function computeEventIdentity(input: EventIdentityInput): string | null {
	const persons = input.persons
		.map(normalizePersonRef)
		.filter(p => p.length > 0);
	if (persons.length === 0) return null;

	const eventType = input.eventType.trim().toLowerCase();
	if (eventType.length === 0) return null;

	const sortedPersons = [...persons].sort();
	const date = normalizeDate(input.date);
	return `${sortedPersons.join('|')}||${eventType}||${date}`;
}

/**
 * Extract an identity key from an existing event-note's frontmatter.
 * Supports the modern `persons` array, a scalar `persons` value, and
 * the legacy `person` scalar. Returns null if the frontmatter can't
 * be resolved to a valid identity (missing persons, missing event_type).
 */
export function extractEventIdentityFromFrontmatter(
	fm: Record<string, unknown>
): string | null {
	let persons: string[] = [];
	const personsValue = fm.persons;
	if (Array.isArray(personsValue)) {
		persons = personsValue.filter((p): p is string => typeof p === 'string');
	} else if (typeof personsValue === 'string') {
		persons = [personsValue];
	} else if (typeof fm.person === 'string') {
		persons = [fm.person];
	}

	const eventType = typeof fm.event_type === 'string' ? fm.event_type : '';
	const dateRaw = fm.date;
	const date = (typeof dateRaw === 'string' || typeof dateRaw === 'number')
		? dateRaw
		: undefined;

	return computeEventIdentity({ persons, eventType, date });
}
