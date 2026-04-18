import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import obsidianmd from "eslint-plugin-obsidianmd";
import js from "@eslint/js";
import globals from "globals";

export default [
	// Base ESLint recommended rules
	js.configs.recommended,

	// Ignore patterns (must come early)
	{
		ignores: [
			"main.js",
			"*.config.mjs",
			"node_modules/**",
			"docs/**",
			"external/**",
			"build-css.js",
			"build-fonts.js",
			"patch-family-chart.js",
			"gedcom-testing/**",
			"mockups/**",
			"tests/fixtures/**",
		],
	},

	// TypeScript files configuration
	{
		files: ["main.ts", "src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
				ecmaVersion: 2022,
			},
			globals: {
				...globals.browser,
				...globals.node,
				// Obsidian adds these to the global scope at runtime
				createDiv: 'readonly',
				createEl: 'readonly',
				createSpan: 'readonly',
				createFragment: 'readonly',
			},
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			"obsidianmd": obsidianmd,
		},
		rules: {
			// TypeScript ESLint rules
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "none",
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-base-to-string": "warn",
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/no-deprecated": "warn",

			// General ESLint rules
			"no-console": ["error", { allow: ["warn", "error", "debug"] }],
			"no-case-declarations": "error",
			"no-constant-condition": "error",
			"prefer-const": "error",
			"no-var": "error",

			// Obsidian-specific rules
			"obsidianmd/no-forbidden-elements": "error",
			"obsidianmd/no-static-styles-assignment": "error",
			"obsidianmd/vault/iterate": "error",
			"obsidianmd/detach-leaves": "error",
			"obsidianmd/hardcoded-config-path": "error",
			"obsidianmd/no-plugin-as-component": "error",
			"obsidianmd/no-sample-code": "error",
			"obsidianmd/no-tfile-tfolder-cast": "error",
			"obsidianmd/no-view-references-in-plugin": "error",
			"obsidianmd/platform": "error",
			"obsidianmd/prefer-file-manager-trash-file": "warn",
			"obsidianmd/regex-lookbehind": "error",
			"obsidianmd/sample-names": "error",
			"obsidianmd/ui/sentence-case": ["error", {
				enforceCamelCaseLower: true,
				// Note: providing brands/acronyms REPLACES defaults, so we include needed defaults
				brands: [
					// From defaults (essential ones we use)
					"iOS", "iPadOS", "macOS", "Windows", "Android", "Linux",
					"Obsidian", "Obsidian Sync", "Obsidian Publish",
					"Google Drive", "Dropbox", "OneDrive", "iCloud Drive",
					"Excalidraw", "Mermaid", "Markdown", "LaTeX",
					"JavaScript", "TypeScript", "Node.js",
					"npm", "pnpm", "Yarn", "Git", "GitHub", "GitLab",
					"VS Code", "Visual Studio Code",
					// Canvas Roots specific
					"Canvas Roots",
					"Calendarium",
					"Templater",
					"Dataview",
					"Leaflet",
					// Genealogy formats and software
					"GEDCOM",
					"GEDCOM X",
					"GedcomX",
					"Gramps",
					"FamilySearch",
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
					// Canvas Roots specific
					"TA", "SA", "FA",  // Middle-earth era abbreviations
					"GEDCOM",
					"PII",  // Personally Identifiable Information
					"AC", "BC",  // Time period abbreviations (Westeros, historical)
				],
			}],
			"obsidianmd/commands/no-command-in-command-id": "error",
			"obsidianmd/commands/no-command-in-command-name": "error",
			"obsidianmd/commands/no-default-hotkeys": "error",
			"obsidianmd/commands/no-plugin-id-in-command-id": "error",
			"obsidianmd/commands/no-plugin-name-in-command-name": "error",
			"obsidianmd/settings-tab/no-manual-html-headings": "error",
			"obsidianmd/settings-tab/no-problematic-settings-headings": "error",
		},
	},
];
