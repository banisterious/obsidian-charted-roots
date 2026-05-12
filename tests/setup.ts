// Obsidian exposes `activeWindow` as an ambient global pointing at the
// currently-focused window. The unit-test runtime has no equivalent, so we
// point it at globalThis — `activeWindow.setTimeout` then resolves to the
// host's setTimeout, which is what we want for the source code under test.
(globalThis as unknown as { activeWindow: typeof globalThis }).activeWindow = globalThis;
