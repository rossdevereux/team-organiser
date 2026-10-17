---
name: github-issue-lifecycle
description: >-
  Agent-agnostic workflow to automate GitHub issue management and semantic releases
  using the GitHub CLI (gh), package.json versioning, and Keep a Changelog standards.
  Compatible with any AI coding agent (Claude Code, Cursor, Copilot, Antigravity, Aider) or CLI user.
compatibility: universal
tools:
  - gh
  - git
  - npm
triggers:
  - "pick up issue"
  - "start issue"
  - "work on issue"
  - "complete issue"
  - "close issue"
  - "cut a release"
  - "publish release"
  - "bump version"
---

# GitHub Issue Lifecycle & Release Pipeline Skill

> **Universal Agent Skill**: This skill is agent-agnostic and fully functional across any AI coding assistant (Claude Code, Cursor, GitHub Copilot, Antigravity, Windsurf, Aider) as well as human engineers using standard command-line tools (`gh`, `git`, `npm`).

This skill defines standardized, step-by-step procedures to manage GitHub issues and automate semantic releases using the GitHub CLI (`gh`), `package.json`, and `CHANGELOG.md` (following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html)).

---

## Prerequisites & Guardrails

### 1. GitHub CLI Authentication
Before executing any `gh` commands, verify authentication status:

```bash
gh auth status
```

**Guardrail**: If not authenticated or token lacks permissions, authenticate with `repo` scope:
```bash
gh auth login --web --scopes repo
```

### 2. Clean Working Tree
Before branching or releasing, verify the working directory has no uncommitted changes:

```bash
# Bash / PowerShell
git status --porcelain
```
If output is not empty, commit or stash changes before proceeding:
```bash
git stash save "WIP before issue workflow"
```

### 3. Missing `## [Unreleased]` Section Guardrail
If `CHANGELOG.md` lacks an `## [Unreleased]` section, initialize it right beneath the top header:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

### Changed

### Fixed
```

---

## Workflow 1: Pick Up an Issue

Use this workflow when beginning work on a GitHub issue.

### Step 1: Fetch Issue Details
View the issue title, description, and metadata:

```bash
gh issue view <id>
```

### Step 2: Assign Issue to `@me` and Apply `in-progress` Label
Ensure the `in-progress` label exists, then assign yourself and attach the label:

**Bash / Zsh:**
```bash
# Ensure label exists in repository
gh label create "in-progress" --color "0E8A16" --description "Work currently in progress" --force 2>/dev/null || true

# Assign and label
gh issue edit <id> --add-assignee "@me" --add-label "in-progress"
```

**PowerShell (Windows):**
```powershell
try { gh label create "in-progress" --color "0E8A16" --description "Work currently in progress" --force } catch {}
gh issue edit <id> --add-assignee "@me" --add-label "in-progress"
```

### Step 3: Create a Clean Working Branch
Ensure you branch from the latest `main`:

```bash
git checkout main
git pull origin main
```

Derive a short slug from the issue title (lowercase, words separated by hyphens, alphanumeric only, ~3-5 words):
```bash
# Format: issue-<id>-<short-slug>
# Example: issue-42-fix-goalkeeper-rotation
git checkout -b issue-<id>-<short-slug>
```

---

## Workflow 2: Complete an Issue

Use this workflow when feature work or bug fixing is completed and ready to be committed and closed.

### Step 1: Update `CHANGELOG.md`
Append the completed change under the `## [Unreleased]` section of `CHANGELOG.md` under the appropriate category:
- `### Added` — New user-facing features or capabilities.
- `### Changed` — Modifications or enhancements to existing behavior.
- `### Deprecated` — Features slated for removal in upcoming releases.
- `### Removed` — Deleted features or removed components.
- `### Fixed` — Bug fixes or error resolution.
- `### Security` — Vulnerability mitigations or security enhancements.

Format:
```markdown
## [Unreleased]

### Fixed
- Fixed pitch player inspection drawer layout and text collision in [`PitchView.tsx`](client/src/components/PitchView.tsx) ([#<id>](https://github.com/<owner>/<repo>/issues/<id>)).
```

### Step 2: Commit Changes Referencing the Issue
Stage all modified files including `CHANGELOG.md` and commit using closing syntax:

```bash
git add -A
git commit -m "fix(pitch): resolve player inspection drawer layout collision (closes #<id>)"
# or for new features:
# git commit -m "feat(rotation): allow per-fixture goalkeeper position unlocking (closes #<id>)"
```

### Step 3: Push Branch, Post Comment, and Close Issue
Push the working branch to the remote repository:

```bash
git push -u origin HEAD
```

Retrieve the short commit hash:
**Bash / Zsh:**
```bash
COMMIT_HASH=$(git rev-parse --short HEAD)
gh issue comment <id> --body "Completed in commit \`$COMMIT_HASH\`. Closing issue."
gh issue edit <id> --remove-label "in-progress"
gh issue close <id> --reason "completed"
```

**PowerShell (Windows):**
```powershell
$COMMIT_HASH = (git rev-parse --short HEAD)
gh issue comment <id> --body "Completed in commit \`$COMMIT_HASH\`. Closing issue."
gh issue edit <id> --remove-label "in-progress"
gh issue close <id> --reason "completed"
```

---

## Workflow 3: Cut a Release

Use this workflow to bump versions, migrate unreleased changelog notes, tag, and publish a GitHub release.

### Step 1: Pre-Release Verification
Verify that `main` is clean and all tests and builds pass:

```bash
git checkout main
git pull origin main

# Verify working tree is clean
git status --porcelain

# Run test suite & production build
npm test
npm run build
```

### Step 2: Bump Version in `package.json`
Bump semantic version (`patch`, `minor`, or `major`) without creating an automatic git tag:

```bash
npm version <patch|minor|major> --no-git-tag-version
```

Read the new version:
**Bash / Zsh:**
```bash
NEW_VERSION=$(node -p "require('./package.json').version")
RELEASE_DATE=$(date +%Y-%m-%d)
echo "Preparing release v$NEW_VERSION ($RELEASE_DATE)"
```

**PowerShell (Windows):**
```powershell
$NEW_VERSION = (node -p "require('./package.json').version")
$RELEASE_DATE = (Get-Date -Format "yyyy-MM-dd")
Write-Host "Preparing release v$NEW_VERSION ($RELEASE_DATE)"
```

### Step 3: Migrate `CHANGELOG.md` Entries
In `CHANGELOG.md`:
1. Verify that `## [Unreleased]` contains entries. (If empty, stop and ensure changes are recorded).
2. Insert a new version heading below `## [Unreleased]`:
   ```markdown
   ## [Unreleased]

   ## [X.Y.Z] - YYYY-MM-DD
   ```
3. Move all bullet points that were under `## [Unreleased]` into the new `## [X.Y.Z] - YYYY-MM-DD` section.
4. Leave `## [Unreleased]` completely empty at the top.

### Step 4: Commit and Tag
Stage `package.json`, `package-lock.json`, and `CHANGELOG.md`:

**Bash / Zsh:**
```bash
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main --follow-tags
```

**PowerShell (Windows):**
```powershell
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin main --follow-tags
```

### Step 5: Publish GitHub Release (Optional)
Generate release notes from `CHANGELOG.md` and publish with `gh release create`:

**Bash / Zsh:**
```bash
gh release create "v$NEW_VERSION" \
  --title "v$NEW_VERSION ($RELEASE_DATE)" \
  --generate-notes
```

Or pass custom release notes extracted from `CHANGELOG.md`:
```bash
gh release create "v$NEW_VERSION" \
  --title "v$NEW_VERSION" \
  --notes "Release v$NEW_VERSION. See CHANGELOG.md for details."
```

**PowerShell (Windows):**
```powershell
gh release create "v$NEW_VERSION" --title "v$NEW_VERSION ($RELEASE_DATE)" --generate-notes
```

---

## Quick Reference Summary

Action | Primary Commands
:--- | :---
**1. Pick up issue** | `gh issue view <id>` <br> `gh issue edit <id> --add-assignee "@me" --add-label "in-progress"` <br> `git checkout -b issue-<id>-<slug>`
**2. Complete issue** | Update `CHANGELOG.md` <br> `git commit -m "... (closes #<id>)"` <br> `gh issue edit <id> --remove-label "in-progress"` <br> `gh issue close <id> --reason "completed"`
**3. Cut release** | `npm version <patch\|minor\|major> --no-git-tag-version` <br> Migrate `CHANGELOG.md` entries from `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD` <br> `git commit -m "chore(release): vX.Y.Z"` <br> `git tag -a "vX.Y.Z" -m "Release vX.Y.Z"` <br> `git push origin main --follow-tags` <br> `gh release create "vX.Y.Z"`
