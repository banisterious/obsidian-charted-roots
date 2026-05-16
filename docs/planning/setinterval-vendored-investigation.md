# Investigation: Vendored setInterval Sites 1, 2, 5

**Status:** Planned (post-v0.22.42 if the v0.22.42 patches don't clear the scanner warning)
**Triggered by:** Community automated review's "Plugin combines `setInterval` with network calls" warning surfaced in the v0.22.41 scan.
**Related:** [`automated-review-notes.md` §5.5](../developer/automated-review-notes.md), `family-chart-premium-evaluation.md` (gitignored).

---

## Background

The v0.22.41 scan surfaced a Warning under Behavior:

> Plugin combines `setInterval` with network calls. May perform periodic background data transmission.

`main.js` contains 8 `setInterval` references: 3 plugin-authored + 5 vendored. v0.22.42 closes:

- All 3 plugin sites (journey playback ticker, time slider animation, media upload count text) by migrating to recursive `setTimeout`.
- Site 3: pdfmake status-URL polling (`setInterval` literally wrapped around `fetch(req)` — the scanner's smoking-gun pattern). Dead code in our usage; eliminated via postinstall patch.
- Site 4: webpack live-reload polling (bundled inside leaflet-distortable's webpack-dev-server). Dead code in production; eliminated alongside the existing chunk-loader stub.

If the scanner Warning persists after v0.22.42, this doc plans the investigation of the three remaining vendored sites.

---

## Sites under investigation

### Site 1: d3-timer core loop

**Source location (v0.22.41 main.js):** ~line 10085.

**Code shape:**
```js
clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
```

**Library:** `d3-timer` (transitive via `d3` and `family-chart`).

**Role:** Drives d3's timer infrastructure. The `interval` runs at `pokeDelay` (typically ~17ms or ~24ms) and pokes d3's task queue, which dispatches animation frames for transitions. Every d3 animation (family-chart transitions, force-directed layouts, custom d3 work) routes through this.

**Reachability:** Hot path. Reachable any time a family-chart animation runs or a custom d3 transition starts.

**Investigation tasks:**

- [ ] Read `node_modules/d3-timer/src/timer.js` to understand the full control flow.
- [ ] Identify whether `requestAnimationFrame` is the primary path and `setInterval` only the background-tab fallback. d3-timer's pattern is to use RAF when available and fall back to setInterval for browsers without RAF or for backgrounded tabs.
- [ ] Determine whether Obsidian's Electron renderer hits the fallback path at all. Electron may never background renderer tabs in a way that triggers d3-timer's setInterval fallback.
- [ ] If unreachable in Electron: patch alongside existing dead-code stubs.
- [ ] If reachable: assess recursive-setTimeout replacement risk via family-chart animation testing.

**family-chart-premium cross-check** (paid prerequisite; defer unless gated by independent value):

- [ ] Confirm subscription tier and access path for the private `family-chart-premium` repo.
- [ ] Clone source and inspect timer / transition infrastructure.
  - Does it still depend on `d3-timer` and `d3-transition`?
  - Does it use a non-d3 timer model (RAF-only loop, Motion One, etc.)?
  - Does it bundle its own copy of d3-timer or share with consumer?
- [ ] If premium uses a non-setInterval timer model, fold the finding into `family-chart-premium-evaluation.md` as an additional motivation for migration.

**Risk if patched:** High. d3-timer is hot-path animation infrastructure. Mis-patching would manifest as silent animation failures, frame drops, or stalls. Any patch needs verification against every animation entry point in family-chart and any other d3-transition consumer.

**Recommendation:** Investigation only. Patch only if the setInterval reaches a code path Electron doesn't exercise. Otherwise document alongside the existing family-chart `!important` finding as known-and-accepted.

---

### Site 2: html2canvas iframe-load polling

**Source location (v0.22.41 main.js):** ~line 33842.

**Code shape:**
```js
var interval2 = setInterval(function() {
  if (documentClone.body.childNodes.length > 0 && documentClone.readyState === "complete") {
    clearInterval(interval2);
    resolve(iframe);
  }
}, 50);
```

**Library:** `html2canvas` (bundled in our chart export path).

**Role:** Waits for a cloned iframe's body to load before resolving. Polls every 50ms until the iframe has child nodes and readyState is "complete".

**Reachability:** Only fires during html2canvas-based image export. Currently used by Family Chart PNG export and possibly tree exports.

**Investigation tasks:**

- [ ] Confirm which export paths use html2canvas vs. native canvas APIs or other approaches.
- [ ] Read html2canvas source for the surrounding context — is the polling a generic safety net, or does it run for every iframe-cloning operation?
- [ ] Assess whether the polling can be safely replaced with `iframe.contentWindow.addEventListener('load', ...)` plus a timeout fallback. This is the spec-correct event-driven approach and would remove the setInterval entirely.
- [ ] If yes: write a postinstall patch.
- [ ] Verify Family Chart PNG export still works post-patch via a dev-vault round trip.

**Risk if patched:** Moderate. html2canvas is dense minified code; regex matching the exact setInterval form may be fragile across versions. The semantic replacement (load event + fallback) is well understood and testable, but the patch surface is wider than the dead-code patches.

**Recommendation:** Patchable. Moderate effort. Defer until needed.

---

### Site 5: Leaflet plugin circle-marker animation

**Source location (v0.22.41 main.js):** ~line 217811.

**Code shape:**
```js
animate: function() {
  if (this._circleLoc) {
    var circle = this._circleLoc, tInt = 200, ss = 5,
        mr = parseInt(circle._radius / ss),
        oldrad = this.options.circle.radius,
        newrad = circle._radius * 2, acc = 0;
    circle._timerAnimLoc = setInterval(function() {
      acc += 0.5;
      mr += acc;
      newrad -= mr;
      circle.setRadius(newrad);
      if (newrad < oldrad) {
        clearInterval(circle._timerAnimLoc);
        circle.setRadius(oldrad);
      }
    }, tInt);
  }
}
```

**Library:** Unknown leaflet plugin. The `_circleLoc` / `_timerAnimLoc` naming and the ring-expansion animation suggest a plugin that adds a pulse / locate-me marker. Candidate plugins: `leaflet-search` (location-found marker pulse), `leaflet.locatecontrol`, or possibly a `leaflet.markercluster` overlay.

**Investigation tasks:**

- [ ] `grep -ln '_circleLoc\|_timerAnimLoc' node_modules/leaflet-*/` to identify the source plugin.
- [ ] Determine whether we ever trigger the `animate()` method in our usage. Inspect `src/maps/` for the relevant API call.
- [ ] If we never call it: confirm dead in our usage; patch alongside the leaflet-distortable patches (same shape as our existing dead-code stubs).
- [ ] If we do call it: assess recursive-setTimeout replacement.

**Risk if patched:**
- Dead in our usage: Low. Same pattern as the leaflet-distortable WebSocketClient / chunk loader stubs.
- Reachable: Moderate. The animation is purely visual; migration to setTimeout-recursion preserves behavior.

**Recommendation:** Identify the plugin first; reachability determines patch shape.

---

## Sequencing

1. **v0.22.42 ships:** plugin setInterval migrations + sites 3 + 4 dead-code patches. Scan after publish.
2. **If scan clears the Warning:** sites 1, 2, 5 stay as known-and-accepted. Document in `automated-review-notes.md`.
3. **If scan still flags:**
   1. Start with site 5 (cheapest if dead in our usage).
   2. Site 2 next (moderate patch, contained scope).
   3. Site 1 last — family-chart-premium evaluation gates whether to patch d3-timer at all.

## Decision criteria for family-chart-premium subscription

Subscribe and investigate ONLY if:

- Site 1 (d3-timer) is the only remaining blocker on removing the Warning, AND
- The investigation of Site 1 in the OSS d3-timer source reveals no safe patch path, AND
- Subscription cost is justified by combined value of this finding plus the existing irreducible `!important` driver (`family-chart-premium-evaluation.md`).

Otherwise defer indefinitely.

---

## Status field

- 2026-05-15 — Document created. Investigation deferred pending v0.22.42 scan result.
