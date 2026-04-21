import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		globals: false,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/types.ts']
		}
	},
	resolve: {
		alias: {
			// Intercept `import { ... } from 'obsidian'` in tests and route to mock.
			obsidian: path.resolve(__dirname, 'tests/mocks/obsidian.ts')
		}
	}
});
