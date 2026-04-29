# Release Procedure

Mechanical checklist for cutting a Charted Roots patch or minor release. Pairs with [VERSIONING.md](../../VERSIONING.md) (policy) and [CHANGELOG.md](../../CHANGELOG.md) (per-release log). Maintained because the same drift gotcha recurred across 0.22.9 and 0.22.10 — the canonical pattern is documented here so it doesn't recur a third time. **Validated:** 0.22.11 and 0.22.12 both shipped without tag drift after this procedure landed.

---

## TL;DR

1. Pre-flight checks pass (build, tests, type-check)
2. **Commit the version bump as its own commit** (six files: `manifest.json`, `versions.json`, `package.json`, `package-lock.json`, `README.md`, `CHANGELOG.md`)
3. **Tag against the bump commit** (not against `main` HEAD if anything else has landed since)
4. Push branch and tag
5. Create the GitHub Release pointing at the tag
6. Apply post-release labels (`next-release` → `released-testing`)
7. Wiki sync if any wiki-content edits are pending

The non-obvious step is #2-#3 ordering: tag against the bump commit specifically. See [Tag drift gotcha](#tag-drift-gotcha) below.

---

## Pre-flight

Before staging any version files:

- [ ] `npm run build` — clean, no errors
- [ ] `npm test -- --run` — all tests pass
- [ ] `npm run type-check` — no *new* errors (project carries a known TS-cleanup backlog; see CLAUDE.md / session-restore housekeeping)
- [ ] All fixes intended for the release are committed on `main`
- [ ] `[Unreleased]` section in CHANGELOG has all the entries the release should cover
- [ ] Manual verification on dev vault for any user-facing UI changes (capture screenshots if appropriate)

---

## Version bump files

Six files change for every release. The set is identical for patch and minor bumps:

| File | What to change |
|---|---|
| `manifest.json` | `"version": "X.Y.Z"` |
| `versions.json` | Add `"X.Y.Z": "<minAppVersion>"` entry at the end |
| `package.json` | `"version": "X.Y.Z"` |
| `package-lock.json` | Both top-level `version` and `packages.""` `version` |
| `README.md` | Badge URL: `version-X.Y.Z-blue.svg` |
| `CHANGELOG.md` | Flip `[Unreleased]` → `[X.Y.Z] - YYYY-MM-DD` with a fresh empty `[Unreleased]` above it. Add a short intro paragraph between the date header and the `### Fixed` (or `### Added` etc.) sub-section |

The CHANGELOG flip is the trickiest of the six — easy to miss the empty `[Unreleased]` placeholder above the new version section, which would cause the next release's preparation to fail.

---

## The commit + tag sequence

The ordering matters. **Commit the bump first, then tag against that commit.**

```bash
# Stage exactly the six bump files (NOT styles.css, which carries
# a known build-timestamp drift across sessions per session-restore)
git add CHANGELOG.md README.md manifest.json versions.json package.json package-lock.json

# Commit with the standard message format
git commit -m "chore: Bump version to X.Y.Z"

# Verify the bump commit landed at HEAD
git log --oneline -1

# Tag the bump commit explicitly (not just `git tag X.Y.Z` against
# whatever HEAD happens to be, in case the parallel session has
# pushed something on top)
git tag X.Y.Z <bump-commit-sha>

# Push branch first, then tag
git push origin main
git push origin X.Y.Z
```

After pushing, the tag should point at the `chore: Bump version to X.Y.Z` commit. Verify:

```bash
git show X.Y.Z --stat | head -8
# Should show "chore: Bump version to X.Y.Z" as the commit message.
```

---

## Tag drift gotcha

**The pattern that has recurred (0.22.9, 0.22.10):** Tag created via the GitHub Release UI before the local bump commit is pushed. The UI tags against the current `main` HEAD, which is the *previous* commit (e.g., the last fix commit). The version-bump file changes are still uncommitted locally. Result: tag points at a commit that still has the *old* version in `manifest.json`. Anyone who `git checkout <tag>` and builds from source gets the wrong version number.

### Why it happens

GitHub's Release UI offers to "create the tag for you" if you type a tag name that doesn't exist yet. That auto-creation tags against the *server's* current `main`, which doesn't yet have the bump commit because we haven't pushed it.

### Recovery procedure (if it happens again)

```bash
# 1. Commit the bump locally
git add CHANGELOG.md README.md manifest.json versions.json package.json package-lock.json
git commit -m "chore: Bump version to X.Y.Z"

# 2. Move the tag to the new bump commit
git tag -f X.Y.Z <bump-commit-sha>

# 3. Push branch
git push origin main

# 4. Force-push the moved tag
git push --force origin X.Y.Z
```

Force-pushing a tag (not a branch) is acceptable when the release just minted; blast radius is low because no downstream consumer has pulled the tag yet. Don't do this for tags that have been published for any meaningful time.

### How to avoid recurrence

**Always commit and push the bump locally before creating the GitHub Release.** Order:

1. Commit bump locally → push to origin
2. *Then* go to the GitHub Release UI
3. Pick the tag — the tag now exists on origin, the UI uses it as-is rather than auto-creating

Alternatively: tag locally with `git tag X.Y.Z`, push the tag (`git push origin X.Y.Z`), then create the release via the UI pointing at the existing tag.

---

## GitHub Release

- **Title format:** `Charted Roots vX.Y.Z` (no subtitle, no tagline — see auto-memory `feedback_release_title_format`)
- **Body:** structured release description matching the prior release's format. Sections by area (Map view, Timeline, Modals, etc.); fix bullets with issue links; stability-window note; tests note; reporters paragraph; `Install via BRAT:` line at the end.
- **Pre-release flag:** off for normal releases. On only if the release is intentionally an alpha / beta / rc.

The release description body is best drafted in advance and pasted via the UI. No AI attribution per the project's [no-AI-references rule](../../CLAUDE.md).

---

## Post-release labels

Per [auto-memory `feedback_issue_release_workflow`](../../CLAUDE.md): the user drives `next-release` → `released-testing` → close transitions. Mechanical steps after a release ships:

1. Apply `next-release` label to any issues whose fixes are in this release but didn't have it yet
2. Move all `next-release` labels for the release's issues to `released-testing`
3. Reporters verify, then transition to closed

Issues that get fix follow-ups (where the prior release's fix was incomplete) keep the `released-testing` label across the follow-up cycle; don't add `next-release` on top.

---

## Wiki + website sync

After the release is live:

- **Wiki content:** if any pages under `wiki-content/` were edited for this release, they need manual sync to the `obsidian-charted-roots.wiki` repo. Common targets: `Release-History.md` (always for a non-trivial release), feature pages updated with new behavior.
- **Website changelog spotlight:** add a cluster spotlight to `docs/planning/website-content/changelog-refresh.md` describing the release. The parallel website-port session ports it to chartedroots.com.
- **Wiki Release-History.md cluster spotlight:** add an entry under the cluster heading (e.g., `## v0.22.x`) summarizing the release. Pattern lives in the existing cluster spotlights.

---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Tag points at pre-bump commit | Bump committed after tag was created | [Recovery procedure](#recovery-procedure-if-it-happens-again) above |
| `git status` shows the bump files modified after release | Bump never committed locally | Commit + push them; not destructive but messy |
| `npm install` warns about lockfile mismatch | Forgot `package-lock.json` in the bump | Add it, commit, push |
| `versions.json` missing the new entry | Skipped during bump | Add it, push as a follow-up |
| GitHub Release shows old version on the badge | README badge URL not updated | Edit README in a follow-up commit |
| BRAT users see no update | `manifest.json` version not bumped | Critical — fix immediately |

---

## Related

- [VERSIONING.md](../../VERSIONING.md) — what counts as breaking, when 1.0 ships, GEDCOM round-trip API
- [CHANGELOG.md](../../CHANGELOG.md) — per-release log
- [docs/planning/website-content/changelog-refresh.md](../planning/website-content/changelog-refresh.md) — website-side changelog source-of-truth
- `wiki-content/Release-History.md` — wiki cluster-spotlight log
