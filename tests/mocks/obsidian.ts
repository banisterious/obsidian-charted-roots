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

/**
 * Factory for a mock TFile. Real Obsidian's `TFile` constructor takes no
 * arguments, so `new TFile({ ... })` does not type-check against the real
 * `.d.ts`; tests build files through this factory instead, which the augment
 * file (`obsidian-augment.d.ts`) types as returning a real `TFile` (#704).
 */
export function makeTFile(args: {
	path: string;
	basename: string;
	extension: string;
	stat?: { mtime: number; ctime: number; size: number };
	parent?: TFolder | null;
}): TFile {
	return new TFile(args);
}

/** Factory for a mock TFolder; see {@link makeTFile}. */
export function makeTFolder(args: {
	path: string;
	name: string;
	children?: (TFile | TFolder)[];
}): TFolder {
	return new TFolder(args);
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
 * Metadata-cache event names supported by the mock.
 */
export type MetadataCacheEventName = 'changed' | 'resolve' | 'resolved';

/**
 * Opaque handle returned by `Vault.on()` / `MetadataCache.on()`. Used
 * with `offref()` to remove the listener.
 */
export interface EventRef {
	event: VaultEventName | MetadataCacheEventName;
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
	private listeners = new Map<MetadataCacheEventName, Set<EventRef>>();
	private vaultRef: Vault | null = null;
	resolvedLinks: Record<string, Record<string, number>> = {};

	getFileCache(file: TFile): CachedMetadata | null {
		return this.cache.get(file.path) ?? null;
	}

	/**
	 * Resolve a linkpath to a file by basename (Obsidian's link resolver).
	 * The mock attaches the vault during App construction so we can search
	 * across all markdown files. Returns the first file whose basename
	 * matches `linkpath`. `_sourcePath` is ignored (Obsidian uses it for
	 * relative-link resolution; the mock doesn't model that).
	 */
	getFirstLinkpathDest(linkpath: string, _sourcePath: string): TFile | null {
		if (!this.vaultRef) return null;
		for (const file of this.vaultRef.getMarkdownFiles()) {
			if (file.basename === linkpath) return file;
		}
		return null;
	}

	_attachVault(vault: Vault): void {
		this.vaultRef = vault;
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

	on(
		event: 'changed',
		callback: (file: TFile, data: string, cache: CachedMetadata) => void
	): EventRef;
	on(event: 'resolve', callback: (file: TFile) => void): EventRef;
	on(event: 'resolved', callback: () => void): EventRef;
	on(
		event: MetadataCacheEventName,
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
		const set = this.listeners.get(ref.event as MetadataCacheEventName);
		set?.delete(ref);
	}

	// Test helper: fire a metadata-cache event manually.
	_fire(event: 'changed', file: TFile, data?: string, cache?: CachedMetadata): void;
	_fire(event: 'resolve', file: TFile): void;
	_fire(event: 'resolved'): void;
	_fire(event: MetadataCacheEventName, ...args: unknown[]): void {
		const set = this.listeners.get(event);
		if (!set) return;
		// For 'changed', pass file/data/cache; for 'resolve', file; for 'resolved', nothing.
		// Default the cache argument to the current entry if not provided.
		const augmented = [...args];
		if (event === 'changed' && augmented.length === 1) {
			const file = augmented[0] as TFile;
			augmented.push('', this.cache.get(file.path) ?? { frontmatter: undefined });
		}
		for (const ref of set) {
			ref.callback(...augmented);
		}
	}

	_listenerCount(event: MetadataCacheEventName): number {
		return this.listeners.get(event)?.size ?? 0;
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

/**
 * Minimal Modal stub. Modules that subclass Modal at module load time
 * (e.g., settings UI cards declared at the top level of files imported
 * via the settings transitive graph) need a base class to extend.
 * Tests don't usually exercise the modal flow.
 */
export class Modal {
	app: App;
	contentEl: HTMLElement;
	titleEl: HTMLElement;
	constructor(app: App) {
		this.app = app;
		this.contentEl = {} as HTMLElement;
		this.titleEl = {} as HTMLElement;
	}
	open(): void {
		// no-op
	}
	close(): void {
		// no-op
	}
	onOpen(): void {
		// no-op
	}
	onClose(): void {
		// no-op
	}
}

/**
 * Text component stub for settings UI subclasses that reference it.
 */
export class TextComponent {
	inputEl: HTMLInputElement;
	constructor() {
		this.inputEl = {} as HTMLInputElement;
	}
	setValue(_value: string): this { return this; }
	getValue(): string { return ''; }
	setPlaceholder(_placeholder: string): this { return this; }
	onChange(_cb: unknown): this { return this; }
}

/**
 * AbstractInputSuggest stub. Subclassed by FolderSuggest in settings.ts.
 * Generic parameter is preserved on the class signature; the body is empty.
 */
export class AbstractInputSuggest<T> {
	app: App;
	textInputEl: HTMLInputElement;
	constructor(app: App, textInputEl: HTMLInputElement) {
		this.app = app;
		this.textInputEl = textInputEl;
	}
	close(): void {
		// no-op
	}
	getSuggestions(_query: string): T[] | Promise<T[]> {
		return [] as T[];
	}
	renderSuggestion(_value: T, _el: HTMLElement): void {
		// no-op
	}
	selectSuggestion(_value: T): void {
		// no-op
	}
}

export function setIcon(_el: HTMLElement, _iconName: string): void {
	// no-op
}

/**
 * Plugin settings tab stub. Subclassed by the main settings file so it
 * needs to be present even though tests don't use it.
 */
export class PluginSettingTab {
	app: App;
	containerEl: HTMLElement;
	constructor(app: App, _plugin: unknown) {
		this.app = app;
		this.containerEl = {} as HTMLElement;
	}
	display(): void {
		// no-op
	}
	hide(): void {
		// no-op
	}
}

/**
 * Setting builder stub. Same rationale as Modal — settings UI files
 * may construct Settings at module load time.
 */
export class Setting {
	containerEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
	setName(_name: string): this { return this; }
	setDesc(_desc: string): this { return this; }
	addText(_cb: unknown): this { return this; }
	addToggle(_cb: unknown): this { return this; }
	addDropdown(_cb: unknown): this { return this; }
	addButton(_cb: unknown): this { return this; }
	addExtraButton(_cb: unknown): this { return this; }
	addTextArea(_cb: unknown): this { return this; }
	addSlider(_cb: unknown): this { return this; }
	addColorPicker(_cb: unknown): this { return this; }
	addSearch(_cb: unknown): this { return this; }
	addMomentFormat(_cb: unknown): this { return this; }
	then(_cb: unknown): this { return this; }
	setHeading(): this { return this; }
	setClass(_cls: string): this { return this; }
	setTooltip(_tooltip: string): this { return this; }
	setDisabled(_disabled: boolean): this { return this; }
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
		this.metadataCache._attachVault(this.vault);
	}
}

/**
 * Minimal Plugin mock. Just enough surface for services that need to
 * call `plugin.registerEvent()` to wire up vault / metadata-cache
 * listeners. Tracks registered EventRefs so tests can assert listener
 * cleanup without reaching into Obsidian internals.
 */
export class Plugin {
	app: App;
	private registeredEvents: EventRef[] = [];

	constructor(app: App) {
		this.app = app;
	}

	registerEvent(ref: EventRef): EventRef {
		this.registeredEvents.push(ref);
		return ref;
	}

	_registeredEventCount(): number {
		return this.registeredEvents.length;
	}
}

/**
 * Factory for a mock Plugin. Real Obsidian's `Plugin` is abstract, so
 * `new Plugin(app)` does not type-check; tests build one through this factory,
 * typed by the augment file as returning a real `Plugin` (#704).
 */
export function makePlugin(app: App): Plugin {
	return new Plugin(app);
}

/**
 * Normalize a path: collapse repeated slashes, strip leading/trailing slashes.
 * Mirrors the production behavior closely enough for path construction tests;
 * real Obsidian also handles platform-specific separators which we don't need
 * here.
 */
export function normalizePath(path: string): string {
	return path.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
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
