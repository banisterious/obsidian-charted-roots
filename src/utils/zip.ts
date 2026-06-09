/**
 * Thin ZIP adapter over fflate.
 *
 * Wraps the small subset of zip functionality the plugin actually uses
 * (ODT writers, .gpkg reader) in a JSZip-shaped API. Two reasons for the
 * shim layer rather than calling fflate directly:
 *
 * 1. The writer call sites are stateful builders that accrete files via
 *    `.file()` and finish with `.generateAsync()`. fflate's functional
 *    `zip({...}, cb)` shape would distribute Uint8Array conversion,
 *    base64 decoding, Blob wrapping, and STORE-level handling across
 *    every call site.
 * 2. Centralising the library boundary means a future swap (or fflate
 *    version bump) is a one-file change.
 */
import { strToU8, unzip, zip, type AsyncZippable } from 'fflate';

export type ZipCompression = 'STORE' | 'DEFLATE';

export interface ZipFileOptions {
	/** STORE = uncompressed (required for ODT mimetype). Defaults to DEFLATE. */
	compression?: ZipCompression;
	/** Content is a base64-encoded string; will be decoded to bytes. */
	base64?: boolean;
	/** JSZip-compat no-op for Uint8Array input. */
	binary?: boolean;
}

export interface ZipGenerateOptions {
	/** ODT files set this; embedded in the Blob's MIME type. */
	mimeType?: string;
}

/**
 * Builder for producing a ZIP archive as a Blob.
 *
 * Insertion order is preserved, which matters for ODT — the `mimetype`
 * entry must be the first record in the archive and uncompressed.
 */
export class ZipBuilder {
	private readonly entries: Map<string, { data: Uint8Array; level: number }> = new Map();

	file(path: string, content: string | Uint8Array, options?: ZipFileOptions): void {
		const data = toUint8Array(content, options);
		const level = options?.compression === 'STORE' ? 0 : 6;
		this.entries.set(path, { data, level });
	}

	generateAsync(options?: ZipGenerateOptions): Promise<Blob> {
		const input: Record<string, [Uint8Array, { level: number }]> = {};
		for (const [path, entry] of this.entries) {
			input[path] = [entry.data, { level: entry.level }];
		}

		return new Promise((resolve, reject) => {
			zip(input as AsyncZippable, (err, result) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(new Blob([result], { type: options?.mimeType ?? 'application/zip' }));
			});
		});
	}
}

/**
 * Reader entry returned from ZipReader.loadAsync. Mirrors the JSZip
 * `JSZipObject` subset the plugin uses: `dir` and `async('uint8array' | 'arraybuffer')`.
 */
export interface ZipReaderFile {
	dir: boolean;
	async(type: 'uint8array'): Promise<Uint8Array>;
	async(type: 'arraybuffer'): Promise<ArrayBuffer>;
}

/**
 * Reads a ZIP archive into a path → entry map.
 *
 * fflate's `unzip` omits directory-only entries from the result, so
 * `ZipReaderFile.dir` is effectively always false. The flag is retained
 * for JSZip API parity and is harmless if checked.
 */
export class ZipReader {
	readonly files: Record<string, ZipReaderFile>;

	private constructor(files: Record<string, ZipReaderFile>) {
		this.files = files;
	}

	static loadAsync(data: ArrayBuffer | Uint8Array): Promise<ZipReader> {
		const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
		return new Promise((resolve, reject) => {
			unzip(bytes, (err, result) => {
				if (err) {
					reject(err);
					return;
				}
				const files: Record<string, ZipReaderFile> = {};
				for (const [path, content] of Object.entries(result)) {
					files[path] = makeReaderFile(path, content);
				}
				resolve(new ZipReader(files));
			});
		});
	}
}

function makeReaderFile(path: string, content: Uint8Array): ZipReaderFile {
	return {
		dir: path.endsWith('/'),
		async(type: 'uint8array' | 'arraybuffer'): Promise<Uint8Array | ArrayBuffer> {
			if (type === 'arraybuffer') {
				return Promise.resolve(
					content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength)
				);
			}
			return Promise.resolve(content);
		},
	} as ZipReaderFile;
}

function toUint8Array(content: string | Uint8Array, options?: ZipFileOptions): Uint8Array {
	if (content instanceof Uint8Array) {
		return content;
	}
	if (options?.base64) {
		return base64ToUint8Array(content);
	}
	return strToU8(content);
}

function base64ToUint8Array(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
