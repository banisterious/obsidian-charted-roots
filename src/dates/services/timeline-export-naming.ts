import { extractDisplayLabel } from '../../utils/wikilink-resolver';

/**
 * Build the timeline export title, folding in the active person filter so a
 * person-filtered export gets its own title and file name instead of every
 * export overwriting one shared "event-timeline" file (#657 follow-up). A
 * plain hyphen keeps the file-name stem (derived via `toSafeFilename`) clean.
 *
 * @param title       The user-entered (or default) timeline title.
 * @param personValue The "Filter by person" selection (a person reference, or
 *                    empty for "All people").
 */
export function timelineExportTitle(title: string, personValue: string): string {
	const label = personValue ? extractDisplayLabel(personValue) : '';
	return label ? `${title} - ${label}` : title;
}
