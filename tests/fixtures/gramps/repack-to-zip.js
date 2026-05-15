/**
 * Repack a tar.gz Gramps Package (.gpkg) into a ZIP-format .gpkg.
 *
 * Gramps' export wizard writes .gpkg as a gzip-compressed tar archive, the
 * default container. The plugin's gpkg-extractor.ts also supports a ZIP
 * container format that some users hit in the wild, but Gramps itself does
 * not produce ZIP. Use this script to repack a tar.gz fixture into ZIP so
 * the ZIP reader code path can be exercised in tests / dev-vault import.
 *
 * Usage:
 *   node tests/fixtures/gramps/repack-to-zip.js [input.gpkg] [output.gpkg]
 *
 * Defaults:
 *   input  = gramps-app-export-test9-small.gpkg
 *   output = gramps-app-export-test11-small-zip.gpkg
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { zipSync } = require('fflate');

const FIXTURE_DIR = __dirname;
const DEFAULT_INPUT = 'gramps-app-export-test9-small.gpkg';
const DEFAULT_OUTPUT = 'gramps-app-export-test11-small-zip.gpkg';

const inputPath = path.join(FIXTURE_DIR, process.argv[2] || DEFAULT_INPUT);
const outputPath = path.join(FIXTURE_DIR, process.argv[3] || DEFAULT_OUTPUT);

console.log(`[repack-to-zip] Input:  ${path.basename(inputPath)}`);
console.log(`[repack-to-zip] Output: ${path.basename(outputPath)}`);

const compressed = fs.readFileSync(inputPath);
console.log(`[repack-to-zip] Read ${compressed.length} bytes`);

if (compressed[0] !== 0x1f || compressed[1] !== 0x8b) {
	console.error(
		'[repack-to-zip] Input is not gzip-compressed. Magic bytes:',
		compressed[0].toString(16),
		compressed[1].toString(16)
	);
	process.exit(1);
}

const decompressed = zlib.gunzipSync(compressed);
console.log(`[repack-to-zip] Decompressed to ${decompressed.length} bytes`);

// Tar parsing mirrors gpkg-extractor.ts::extractTar so the test fixture
// matches what the production extractor would see internally.

function isTarFile(data) {
	if (data.length < 263) return false;
	const magic = String.fromCharCode(
		data[257],
		data[258],
		data[259],
		data[260],
		data[261]
	);
	return magic === 'ustar';
}

function extractTar(data) {
	const files = {};
	let offset = 0;

	while (offset < data.length - 512) {
		const header = data.slice(offset, offset + 512);

		let allZero = true;
		for (let i = 0; i < header.length; i++) {
			if (header[i] !== 0) {
				allZero = false;
				break;
			}
		}
		if (allZero) break;

		let nameEnd = 0;
		while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++;
		const filename = new TextDecoder('utf-8').decode(header.slice(0, nameEnd));

		let sizeStr = '';
		for (let i = 124; i < 136; i++) {
			if (header[i] === 0 || header[i] === 32) break;
			sizeStr += String.fromCharCode(header[i]);
		}
		const fileSize = parseInt(sizeStr.trim(), 8) || 0;

		const typeFlag = header[156];

		offset += 512;

		if ((typeFlag === 0 || typeFlag === 48) && fileSize > 0 && filename) {
			const fileData = data.slice(offset, offset + fileSize);
			files[filename] = new Uint8Array(fileData);
		}

		offset += Math.ceil(fileSize / 512) * 512;
	}

	return files;
}

if (!isTarFile(decompressed)) {
	console.error(
		'[repack-to-zip] Decompressed data is not a tar archive (no "ustar" magic at offset 257). This input may be a plain gzip-XML .gpkg, which the ZIP reader path does not exercise.'
	);
	process.exit(1);
}

const tarFiles = extractTar(decompressed);
const entries = Object.keys(tarFiles);
console.log(`[repack-to-zip] Tar contains ${entries.length} files:`);
for (const name of entries) {
	console.log(`  - ${name} (${tarFiles[name].length} bytes)`);
}

const zipped = zipSync(tarFiles);
console.log(`[repack-to-zip] ZIP output: ${zipped.length} bytes`);

if (zipped[0] !== 0x50 || zipped[1] !== 0x4b) {
	console.error(
		'[repack-to-zip] Output is not a valid ZIP. Magic bytes:',
		zipped[0].toString(16),
		zipped[1].toString(16)
	);
	process.exit(1);
}

fs.writeFileSync(outputPath, zipped);
console.log(`[repack-to-zip] Wrote ${path.basename(outputPath)}`);
