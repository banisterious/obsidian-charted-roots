import obsidianmd from "eslint-plugin-obsidianmd";
import depend from "eslint-plugin-depend";

export default [
	// Ignore patterns (must come early so they apply to all later configs)
	{
		ignores: [
			"main.js",
			"*.mjs",
			"version-bump.mjs",
			"audit-metafile.mjs",
			"node_modules/**",
			"docs/**",
			"external/**",
			"build-css.js",
			"build-fonts.js",
			"patch-family-chart.js",
			"gedcom-testing/**",
			"mockups/**",
			"tests/fixtures/**",
			"dev-vault/**",
			"wiki-content/**",
			"*.config.ts",
			"vitest.config.ts",
			// 0.3.0 of eslint-plugin-obsidianmd added typed-rule entries to its
			// `recommendedPluginRulesConfig` without a file-pattern restriction,
			// so rules that require parser services (e.g., `no-plugin-as-component`)
			// now try to load on non-TS files like package.json. We don't lint
			// JSON/Markdown/HTML/CSS — ignore them globally so the typed rules
			// don't fail at load.
			"**/*.json",
			"**/*.md",
			"**/*.html",
			"**/*.css",
		],
	},

	// TypeScript parser configuration for the recommended config's typed rules.
	// The plugin's recommended config enables type-aware rules (no-deprecated,
	// await-thenable, no-floating-promises, etc.) but doesn't know where the
	// project's tsconfig lives — needs to be wired up at the consumer side.
	{
		files: ["main.ts", "src/**/*.ts", "tests/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// Plugin-recommended config bundle:
	//   - TypeScript ESLint type-checked rules
	//   - Full obsidianmd/* rule set (commands, settings-tab, vault, ui/sentence-case,
	//     prefer-create-el, prefer-active-doc, validate-manifest, etc.)
	//   - @microsoft/eslint-plugin-sdl (no-inner-html, no-document-write)
	//   - eslint-plugin-no-unsanitized
	//   - eslint-plugin-import (no-extraneous-dependencies)
	//   - eslint-plugin-depend
	//   - obsidianmd/rule-custom-message which wraps no-console with an Obsidian-specific message
	...obsidianmd.configs.recommended,

	// Project-specific overrides on top of the recommended config.
	// Scoped to match the Obsidian plugin bot's actual blocking surface
	// rather than the full recommended strictness — local lint is a
	// pre-push check, not a stricter superset.
	{
		files: ["main.ts", "src/**/*.ts", "tests/**/*.ts"],
		rules: {
			// Type-checked TS rules disabled: the plugin bot doesn't run
			// these, and they flag legitimate any-from-Obsidian-API patterns
			// throughout the codebase. Disabling them locally keeps `npm run
			// lint` aligned with what actually blocks publishing.
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",

			// prefer-active-doc, prefer-window-timers: surface as visible
			// suggestions rather than blocking errors — the publish bot doesn't
			// enforce them at error level. (`prefer-create-el` was removed from
			// the recommended ruleset in 0.3.0; `prefer-active-window-timers`
			// was renamed to `prefer-window-timers` with the
			// `activeWindow.X` -> `window.X` recommendation inverted.)
			"obsidianmd/prefer-active-doc": "warn",
			"obsidianmd/prefer-window-timers": "warn",

			// no-unused-vars: respect the leading-underscore convention for
			// intentionally-unused locals, function declarations, and caught
			// errors — matches the args pattern that the recommended config
			// already applies. Several "soft-deleted" helpers in people-tab.ts
			// and elsewhere are prefixed with `_` to mark them as intentionally
			// dormant.
			"@typescript-eslint/no-unused-vars": ["warn", {
				args: "after-used",
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				caughtErrorsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_",
				ignoreRestSiblings: true,
			}],

			// Sentence-case rule applies to UI text; not relevant for test files.

				// (test-file overrides follow this block.)
			// Sentence-case rule needs CR-specific brands and acronyms.
			// Providing brands/acronyms REPLACES the defaults rather than
			// merging — every default term the codebase relies on must be
			// re-included here.
			//
			// Severity is "warn" pending the Batch B per-site audit of the
			// 436 flagged sites — a mix of real Title Case -> sentence case
			// fixes and rule misfires on quoted button-label references,
			// month names, and proper-noun section headings. Until that
			// audit lands, ship the surface as warnings so releases pass
			// CI gating; flip back to "error" when the audit closes.
			"obsidianmd/ui/sentence-case": ["warn", {
				enforceCamelCaseLower: true,
				brands: [
					// From defaults (essential ones we use)
					"iOS", "iPadOS", "macOS", "Windows", "Android", "Linux",
					"Obsidian", "Obsidian Sync", "Obsidian Publish",
					"Google Drive", "Dropbox", "OneDrive", "iCloud Drive",
					"Excalidraw", "Mermaid", "Markdown", "LaTeX",
					"JavaScript", "TypeScript", "Node.js",
					"npm", "pnpm", "Yarn", "Git", "GitHub", "GitLab",
					"VS Code", "Visual Studio Code",
					// Charted Roots specific
					"Charted Roots",
					"Control Center",
					"Family Chart",
					"Web Clipper", // Obsidian's official feature name
					"Canvas Roots", // Pre-rename name, still appears in migration paths
					"Calendarium",
					"Templater",
					"Dataview",
					"Leaflet",
					"Bases",
					// Genealogy formats and software
					"GEDCOM",
					"GEDCOM X",
					"GedcomX",
					"Gramps",
					"FamilySearch",
					"Find a Grave",
					"FindAGrave",
					"Beyond Kin",
					"Wikipedia",
					"Wikidata",
					// DNA testing services
					"AncestryDNA",
					"23andMe",
					"MyHeritage",
					"Ancestry",
					"Family Tree DNA",
					// Sort direction indicators (kept all-caps by convention)
					"A→Z",
					"Z→A",
					// Frontmatter keys referenced in UI text — preserved as literal
					// lowercase form so users see the on-disk YAML key name.
					"cr_id",
					"cr_type",
					"birth_place",
					"blood_brother",
					"burial_place",
					"death_place",
					"family_bible",
					"secret_society",
					"tax_record",
					// Fictional universes and eras
					"Middle-earth",
					"Westeros",
					"Star Wars",
					"Shire",
					"Third Age",
					"Second Age",
					"First Age",
					"Fourth Age",
					// Genealogical numbering systems
					"Ahnentafel",
					"d'Aboville",
					"Henry",
					// Font names
					"Comic Shanns",
					"Lilita One",
					"Lexend Deca",
					"Inter",
					"Roboto",
					"Open Sans",
					"Fira Code",
					"JetBrains Mono",
					// Map providers
					"OpenStreetMap",
					"Mapbox",
					"Stadia",
					"Thunderforest",
					"CartoDB",
					"Esri",
				],
				acronyms: [
					// From defaults (essential ones)
					"API", "HTTP", "HTTPS", "URL", "DNS", "TCP", "IP", "SSH", "TLS", "SSL",
					"JSON", "XML", "HTML", "CSS", "PDF", "CSV", "YAML", "SQL",
					"PNG", "JPG", "JPEG", "GIF", "SVG",
					"SDK", "IDE", "CLI", "GUI", "REST",
					"UI", "OK", "ID", "UUID", "GUID",
					"DOM", "CDN", "FAQ", "AI", "ML",
					// Charted Roots specific
					"TA", "SA", "FA",  // Middle-earth era abbreviations
					"BBY", "ABY",      // Star Wars era abbreviations
					"GEDCOM",
					"ODT",             // OpenDocument Text (export format)
					"MD",              // Markdown
					"BRAT",            // Obsidian Beta Reviewers Auto-update Tester
					"PII",             // Personally Identifiable Information
					"AC", "BC",        // Time period abbreviations (Westeros, historical)
					"CR",              // Charted Roots short form
					"DNA",             // Used as standalone acronym throughout DNA features
					// Date format placeholders (preserved as-is in UI)
					"YYYY-MM-DD",
					"DD MMM YYYY",
					"DD MMM",
					"MMM YYYY",
					"YYYY",
					"MMM",
					"DD",
				],
			}],
		},
	},

	// Test files legitimately construct TFile-shaped stubs to fence
	// behavior without mocking the entire vault. `instanceof TFile` is
	// the right check in production code; tests don't have real TFile
	// instances to check against.
	{
		files: ["tests/**/*.ts"],
		rules: {
			"obsidianmd/no-tfile-tfolder-cast": "off",
		},
	},

	// depend/ban-dependencies flags chalk because newer v5+ is ESM-only
	// and there are smaller alternatives. We use chalk v4 (CJS) only in
	// build-css.js for build-time colored logging — replacing it would
	// be churn with no shipped-bundle impact. Allowlisted here.
	{
		plugins: { depend },
		rules: {
			"depend/ban-dependencies": ["error", { allowed: ["chalk"] }],
		},
	},
];
