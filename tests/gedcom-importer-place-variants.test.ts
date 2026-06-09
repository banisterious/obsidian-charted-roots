/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any -- driving private importer methods through a vault mock for an integration test. */
import { describe, expect, it } from 'vitest';
import { App } from 'obsidian';
import { GedcomImporterV2 } from '../src/gedcom/gedcom-importer-v2';
import type CanvasRootsPlugin from '../main';
import type { GedcomImportOptionsV2 } from '../src/gedcom/gedcom-types';

/**
 * #687 — variant place spellings consolidate into one note on GEDCOM import.
 * Drives the importer's place-note creation through the vault mock and asserts
 * that accent variants collapse to a single note, the discarded forms land in
 * historical_names, and every form still resolves to that note for linking.
 */

function makeImporter(): GedcomImporterV2 {
	const app = new App();
	const plugin = { app, settings: {} } as unknown as CanvasRootsPlugin;
	return new GedcomImporterV2(app, plugin);
}

const options = {
	placesFolder: 'Places',
	filenameFormat: 'original',
} as unknown as GedcomImportOptionsV2;

describe('GEDCOM place-variant consolidation on import (#687)', () => {
	it('creates one note per place and folds variant spellings into historical_names', async () => {
		const importer = makeImporter();
		// Accent variants of one city and its province, as two PLAC forms might
		// appear across a GEDCOM, plus the shared country.
		const places = new Map<string, string[]>([
			['Montréal, Québec, Canada', ['Montréal', 'Québec', 'Canada']],
			['Montreal, Quebec, Canada', ['Montreal', 'Quebec', 'Canada']],
			['Québec, Canada', ['Québec', 'Canada']],
			['Quebec, Canada', ['Quebec', 'Canada']],
			['Canada', ['Canada']],
		]);

		const { placeToNoteInfo, created } = await (importer as any).createPlaceNotes(
			places,
			options,
			() => {},
		);

		// Three real places (city, province, country) — not five notes.
		expect(created).toBe(3);

		// Both spellings of the city resolve to the same note.
		const cityPath = placeToNoteInfo.get('Montréal, Québec, Canada').path;
		expect(placeToNoteInfo.get('Montreal, Quebec, Canada').path).toBe(cityPath);
		// And both spellings of the province.
		const provincePath = placeToNoteInfo.get('Québec, Canada').path;
		expect(placeToNoteInfo.get('Quebec, Canada').path).toBe(provincePath);

		// The discarded spelling is preserved as a historical name on the city note,
		// written as a FLAT string list (not a nested `- name:` object) (#687).
		const cityFile = (importer as any).app.vault.getAbstractFileByPath(cityPath);
		const content = await (importer as any).app.vault.read(cityFile);
		expect(content).toContain('historical_names:');
		expect(content).toContain('- "Montreal, Quebec, Canada"');
		expect(content).not.toContain('- name:');
	});

	it('leaves a clean place set as one note each (no historical_names)', async () => {
		const importer = makeImporter();
		const places = new Map<string, string[]>([
			['Boston, Suffolk, Massachusetts, USA', ['Boston', 'Suffolk', 'Massachusetts', 'USA']],
			['Suffolk, Massachusetts, USA', ['Suffolk', 'Massachusetts', 'USA']],
			['Massachusetts, USA', ['Massachusetts', 'USA']],
			['USA', ['USA']],
		]);

		const { created } = await (importer as any).createPlaceNotes(places, options, () => {});
		expect(created).toBe(4);
	});
});

describe('GEDCOM place normalization: Canadian provinces (#687)', () => {
	it('expands a province postal code in its own segment', () => {
		const importer = makeImporter();
		expect((importer as any).normalizePlaceString('Westmount, QC, Canada'))
			.toBe('Westmount, Quebec, Canada');
	});

	it('expands an older / longhand province abbreviation', () => {
		const importer = makeImporter();
		expect((importer as any).normalizePlaceString('Toronto, Ont., Canada'))
			.toBe('Toronto, Ontario, Canada');
	});

	it('splits a trailing province abbreviation off a space-joined segment', () => {
		const importer = makeImporter();
		expect((importer as any).normalizePlaceString('Halifax NS'))
			.toBe('Halifax, Nova Scotia');
	});
});
