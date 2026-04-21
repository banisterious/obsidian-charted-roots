/**
 * Minimal mock of the Obsidian runtime API for Vitest.
 *
 * Expand incrementally as test coverage grows. The goal is "enough to
 * unit-test core/service code paths", not full fidelity with the real runtime.
 */

export class TFile {
	path: string;
	basename: string;
	extension: string;
	stat: { mtime: number; ctime: number; size: number };
	parent: TFolder | null;

	constructor(args: {
		path: string;
		basename: string;
		extension: string;
		stat?: { mtime: number; ctime: number; size: number };
		parent?: TFolder | null;
	}) {
		this.path = args.path;
		this.basename = args.basename;
		this.extension = args.extension;
		this.stat = args.stat ?? { mtime: 0, ctime: 0, size: 0 };
		this.parent = args.parent ?? null;
	}
}

export class TFolder {
	path: string;
	name: string;
	children: (TFile | TFolder)[];

	constructor(args: {
		path: string;
		name: string;
		children?: (TFile | TFolder)[];
	}) {
		this.path = args.path;
		this.name = args.name;
		this.children = args.children ?? [];
	}
}

export interface CachedMetadata {
	frontmatter?: Record<string, unknown>;
	frontmatterPosition?: { start: unknown; end: unknown };
}

/**
 * Vault event names supported by the mock. Real Obsidian has more
 * (`create`, `closed`, etc.); add as tests need them.
 */
export type VaultEventName = 'modify' | 'delete' | 'rename';

/**
 * Opaque handle returned by `Vault.on()`. Used with `offref()` to
 * remove the listener.
 */
export interface EventRef {
	event: VaultEventName;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	callback: (...args: any[]) => void;
}

export class Vault {
	files = new Map<string, TFile>();
	folders = new Map<string, TFolder>();
	private content = new Map<string, string>();
	private cacheRef: MetadataCache | null = null;
	private listeners = new Map<VaultEventName, Set<EventRef>>();

	getMarkdownFiles(): TFile[] {
		return [...this.files.values()].filter((f) => f.extension === 'md');
	}

	getAbstractFileByPath(path: string): TFile | TFolder | null {
		return this.files.get(path) ?? this.folders.get(path) ?? null;
	}

	async read(file: TFile): Promise<string> {
		return this.content.get(file.path) ?? '';
	}

	async modify(file: TFile, data: string): Promise<void> {
		this.content.set(file.path, data);
		this._fire('modify', file);
	}

	async create(path: string, data: string): Promise<TFile> {
		if (this.files.has(path)) {
			throw new Error(`File already exists: ${path}`);
		}
		const filename = path.split('/').pop() ?? path;
		const dotIdx = filename.lastIndexOf('.');
		const file = new TFile({
			path,
			basename: dotIdx > 0 ? filename.slice(0, dotIdx) : filename,
			extension: dotIdx > 0 ? filename.slice(dotIdx + 1) : '',
			stat: { mtime: Date.now(), ctime: Date.now(), size: data.length },
		});
		this.files.set(path, file);
		this.content.set(path, data);
		return file;
	}

	async createFolder(path: string): Promise<TFolder> {
		const normalized = path.replace(/\/+$/, '');
		if (this.folders.has(normalized)) {
			return this.folders.get(normalized)!;
		}
		const name = normalized.split('/').pop() ?? normalized;
		const folder = new TFolder({ path: normalized, name });
		this.folders.set(normalized, folder);
		return folder;
	}

	on(event: 'modify', callback: (file: TFile) => void): EventRef;
	on(event: 'delete', callback: (file: TFile) => void): EventRef;
	on(event: 'rename', callback: (file: TFile, oldPath: string) => void): EventRef;
	on(
		event: VaultEventName,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		callback: (...args: any[]) => void
	): EventRef {
		const ref: EventRef = { event, callback };
		let set = this.listeners.get(event);
		if (!set) {
			set = new Set();
			this.listeners.set(event, set);
		}
		set.add(ref);
		return ref;
	}

	offref(ref: EventRef): void {
		this.listeners.get(ref.event)?.delete(ref);
	}

	// Wire up the metadata cache so that processFrontMatter can keep it in sync.
	_attachMetadataCache(cache: MetadataCache): void {
		this.cacheRef = cache;
	}

	_getMetadataCache(): MetadataCache | null {
		return this.cacheRef;
	}

	// Test helper: seed a file into the mock vault.
	_addFile(file: TFile, content = ''): void {
		this.files.set(file.path, file);
		this.content.set(file.path, content);
	}

	/**
	 * Test helper: simulate Obsidian's rename behavior. Moves the file's
	 * vault entries, mutates its `path` and `basename`, and moves the
	 * metadata-cache entry under the new path. Does not fire the rename
	 * event — the caller decides when to do that via `_fire`.
	 */
	_rename(file: TFile, newPath: string): string {
		const oldPath = file.path;
		const content = this.content.get(oldPath) ?? '';
		this.files.delete(oldPath);
		this.content.delete(oldPath);

		const filename = newPath.split('/').pop() ?? '';
		const dotIdx = filename.lastIndexOf('.');
		file.path = newPath;
		file.basename = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
		file.extension = dotIdx > 0 ? filename.slice(dotIdx + 1) : '';

		this.files.set(newPath, file);
		this.content.set(newPath, content);

		if (this.cacheRef) {
			this.cacheRef._moveCacheEntry(oldPath, newPath);
		}
		return oldPath;
	}

	// Test helper: fire an event manually (for testing event-driven code).
	_fire(event: 'modify', file: TFile): void;
	_fire(event: 'delete', file: TFile): void;
	_fire(event: 'rename', file: TFile, oldPath: string): void;
	_fire(event: VaultEventName, ...args: unknown[]): void {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const ref of set) {
			ref.callback(...args);
		}
	}

	_listenerCount(event: VaultEventName): number {
		return this.listeners.get(event)?.size ?? 0;
	}
}

export class MetadataCache {
	private cache = new Map<string, CachedMetadata>();

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.get(file.path) ?? null;
	}

	// Internal: update the cache when a file's frontmatter changes.
	_updateFrontmatter(file: TFile, frontmatter: Record<string, unknown>): void {
		this.cache.set(file.path, { frontmatter });
	}

	// Test helper: seed metadata for a file.
	_setFrontmatter(file: TFile, frontmatter: Record<string, unknown>): void {
		this.cache.set(file.path, { frontmatter });
	}

	// Internal: used by Vault._rename to re-key a cache entry.
	_moveCacheEntry(oldPath: string, newPath: string): void {
		const entry = this.cache.get(oldPath);
		if (entry) {
			this.cache.set(newPath, entry);
			this.cache.delete(oldPath);
		}
	}
}

export class FileManager {
	constructor(
		private vault: Vault,
		private metadataCache: MetadataCache
	) {}

	async processFrontMatter(
		file: TFile,
		fn: (frontmatter: Record<string, unknown>) => void
	): Promise<void> {
		// Start from cached frontmatter if present (round-trips arrays / objects
		// without going through the lossy YAML round-trip below).
		const cached = this.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const frontmatter: Record<string, unknown> = { ...cached };

		// Fall back to parsing file content if the cache is empty (matches what
		// real Obsidian does on first read).
		if (Object.keys(frontmatter).length === 0) {
			const content = await this.vault.read(file);
			const parsed = parseFrontMatter(content);
			Object.assign(frontmatter, parsed.frontmatter);
		}

		fn(frontmatter);

		// Update the cache (real Obsidian does this asynchronously via a
		// metadata observer; the mock does it inline for test simplicity).
		this.metadataCache._updateFrontmatter(file, frontmatter);

		// Serialize back to disk. The mock serializer is YAML-lossy for arrays
		// and objects but adequate for tests that only verify cache state.
		const content = await this.vault.read(file);
		const { body } = parseFrontMatter(content);
		const serialized = serializeFrontMatter(frontmatter, body);
		await this.vault.modify(file, serialized);
	}
}

export class Notice {
	message: string;
	constructor(message: string, _timeout?: number) {
		this.message = message;
	}
}

export class App {
	vault: Vault;
	metadataCache: MetadataCache;
	fileManager: FileManager;

	constructor() {
		this.vault = new Vault();
		this.metadataCache = new MetadataCache();
		this.fileManager = new FileManager(this.vault, this.metadataCache);
		this.vault._attachMetadataCache(this.metadataCache);
	}
}

// Simple frontmatter parser/serializer for the mock. Real Obsidian uses a more
// sophisticated YAML handler; this is enough for unit-test round-trips.
function parseFrontMatter(content: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { frontmatter: {}, body: content };
	const fm: Record<string, unknown> = {};
	for (const line of match[1].split('\n')) {
		const kv = line.match(/^([^:]+):\s*(.*)$/);
		if (!kv) continue;
		fm[kv[1].trim()] = kv[2].trim();
	}
	return { frontmatter: fm, body: match[2] };
}

function serializeFrontMatter(
	frontmatter: Record<string, unknown>,
	body: string
): string {
	const lines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
	return `---\n${lines.join('\n')}\n---\n${body}`;
}
