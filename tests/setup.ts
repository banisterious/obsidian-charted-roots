/* eslint-disable obsidianmd/no-global-this -- test setup polyfill; the rule
   is for source code, and stubbing `window` in the Node runtime requires
   reaching through globalThis */

// Obsidian provides `window` (load-time window) and `activeWindow` (currently-
// focused window) as ambient globals. Plugin source code uses `window.setTimeout`
// for timer calls (per the obsidianmd/prefer-window-timers rule). The unit-test
// runtime is Node, which has no `window` — so we polyfill it to globalThis,
// which exposes the host's `setTimeout` / `setInterval` / etc.
(globalThis as unknown as { window: typeof globalThis }).window = globalThis;
