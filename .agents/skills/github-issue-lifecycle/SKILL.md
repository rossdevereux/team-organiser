---
name: github-issue-lifecycle
description: >-
  Agent-agnostic workflow to create structured GitHub issues from chat conversations,
  manage issue lifecycles on the beta staging branch, cut semantic versions across
  monorepo packages, and promote verified beta releases into main (production) using
  the GitHub CLI (gh), git, and Keep a Changelog standards.
compatibility: universal
tools:
  - gh
  - git
  - npm
triggers:
  - "create issue"
  - "raise issue"
  - "log issue"
  - "new issue"
  - "pick up issue"
  - "start issue"
  - "work on issue"
  - "complete issue"
  - "close issue"
  - "cut a release"
  - "cut version"
  - "bump version"
  - "publish beta into main"
  - "promote beta to main"
  - "merge beta to main"
  - "release to production"
  - "deploy to live"
---

# GitHub Issue Lifecycle, Staging & Production Release Skill

> **Universal Agent Skill**: Compatible with any AI coding assistant (Antigravity, Claude Code, Cursor, GitHub Copilot, Windsurf, Aider) as well as engineers using standard CLI tools (`gh`, `git`, `npm`).

This skill defines standardized, step-by-step procedures to:
1. **Create rich, structured GitHub issues directly from chat discussions.**
2. **Pick up and implement issues on `beta`** (never directly on `main`).
3. **Complete and close issues** with full changelog and documentation hygiene.
4. **Cut semantic versions** across root, `client/`, and `server/` packages on `beta`.
5. **Publish / promote `beta` into `main`** to trigger a live production deployment (`https://subshuffle.com`) and publish a GitHub Release.

---

## Core Branching & Gatekeeper Guardrails

1. **`beta` is the Default Integration Branch**:
   - All feature branches (`issue-<id>-<slug>`) branch from `beta` and merge back into `beta`.
   - Pushing to `beta` automatically deploys to staging (`https://beta.subshuffle.com` / `backend-api-beta`).
2. **`main` is Strictly Locked to Production**:
   - Never commit directly to `main`.
   - Only merge `beta` into `main` when the user explicitly requests publishing/promoting `beta` to `main` (Workflow 5).
   - Always switch back to `beta` (`git checkout beta`) immediately after publishing to `main`.
3. **GitHub CLI Authentication**:
   - Verify `gh auth status` before running `gh` commands.

---

## Workflow 1: Create an Issue from Chat

Use this workflow when the user asks to create, log, or raise a GitHub issue from a chat conversation, bug report, or feature discussion.

### Step 1: Synthesize Issue Title, Labels & Structured Body
1. **Title**: Format using Conventional Commits:
   - `feat(<scope>): <concise summary>` (for new features/enhancements)
   - `fix(<scope>): <concise summary>` (for bugs/layout/logic fixes)
   - `chore(<scope>): <concise summary>` (for CI/CD, infra, or refactoring)
2. **Labels**: Choose one or more existing repository labels:
   - `enhancement` (features), `bug` (defects), `documentation` (docs/guides), `accessibility` (a11y/touch targets), `question`.
3. **Markdown Body Structure**:
   Draft a thorough specification derived from the chat context:
   - **Overview / Problem Statement**: Why this change is needed for coaches/users.
   - **Architecture / Technical Design**: Key components, API routes, data models, or state flows affected.
   - **Key Requirements**: Categorized bullet points of functional and technical details.
   - **Acceptance Criteria**: Actionable checklist (`- [ ] ...`) including test and mobile/desktop viewport expectations.

### Step 2: Create the Issue Safely via Temp Body File
To prevent PowerShell or Bash from mangling backticks, code blocks, or `$` variables in markdown, write the body to a temporary file and pass `--body-file`:

**PowerShell (Windows):**
```powershell
$BODY_FILE = Join-Path $env:TEMP "gh-issue-body.md"
@"
<structured markdown body>
"@ | Set-Content -Path $BODY_FILE -Encoding UTF8

gh issue create `
  --title "feat(scope): Concise summary of the feature or fix" `
  --label "enhancement" `
  --body-file $BODY_FILE

Remove-Item $BODY_FILE -Force
```

**Bash / Zsh:**
```bash
BODY_FILE=$(mktemp)
cat << 'EOF' > "$BODY_FILE"
<structured markdown body>
EOF

gh issue create \
  --title "feat(scope): Concise summary of the feature or fix" \
  --label "enhancement" \
  --body-file "$BODY_FILE"

rm -f "$BODY_FILE"
```

### Step 3: Confirm to User
Report the new Issue `#<id>` and clickable URL to the user, and ask whether they want to start working on it right away (Workflow 2) or leave it in the backlog.

---

## Workflow 2: Pick Up an Issue

Use this workflow when starting work on an existing GitHub issue (`"start issue <id>"`, `"pick up issue <id>"`).

### Step 1: Fetch Issue Details & Assign `@me`
```powershell
gh issue view <id>
try { gh label create "in-progress" --color "0E8A16" --description "Work currently in progress" --force } catch {}
gh issue edit <id> --add-assignee "@me" --add-label "in-progress"
```

### Step 2: Branch from Latest `beta`
Always branch from `beta` (never `main`):

```powershell
git checkout beta
git pull origin beta
git checkout -b issue-<id>-<short-slug>
```

---

## Workflow 3: Complete an Issue (Merge to `beta`)

Use this workflow when implementation is finished and verified.

### Step 1: Mandatory Documentation & Changelog Updates
1. Update **`CHANGELOG.md`** under `## [Unreleased]` (`### Added`, `### Changed`, or `### Fixed`) with file links and `([#<id>](https://github.com/rossdevereux/team-organiser/issues/<id>))`.
2. Update **`CHANGELOG.user.md`** under `## [Unreleased]` in a coach-friendly tone.
3. Update **`docs/USER_GUIDE.md`** if any user-facing workflows, UI, or settings changed, and run:
   ```powershell
   npm run lint:docs
   ```

### Step 2: Run Verification Suite
```powershell
npm test
npm run build
git checkout -- server/data/store.json
```

### Step 3: Commit, Close Issue & Merge into `beta`
**PowerShell (Windows):**
```powershell
git add -A
git commit -m "feat(<scope>): <description> (closes #<id>)"
$COMMIT_HASH = (git rev-parse --short HEAD)

# Comment & close GitHub issue
gh issue comment <id> --body "Completed in commit ``$COMMIT_HASH``. Closing issue."
gh issue edit <id> --remove-label "in-progress"
gh issue close <id> --reason "completed"

# Merge into beta and push to staging
git checkout beta
git merge issue-<id>-<short-slug>
git push origin beta
```

---

## Workflow 4: Cut a Version on `beta`

Use this workflow when asked to cut a version/release on `beta` (`"cut version"`, `"bump version"`, `"cut a release"`).

### Step 1: Bump Semantic Version Across All Monorepo Packages
Ensure you are on `beta` and bump root, `client`, and `server` `package.json` files without auto-tagging:

```powershell
git checkout beta
git pull origin beta

# Choose patch, minor, or major
npm version <patch|minor|major> --no-git-tag-version
npm version <patch|minor|major> --no-git-tag-version --prefix client
npm version <patch|minor|major> --no-git-tag-version --prefix server

$NEW_VERSION = (node -p "require('./package.json').version")
$RELEASE_DATE = (Get-Date -Format "yyyy-MM-dd")
Write-Host "Preparing release v$NEW_VERSION ($RELEASE_DATE)"
```

*(Optional)* Update `APP_VERSION` fallback constants in `client/src/components/support/SupportTicketModal.tsx` and `server/src/routes/support.ts` to match `$NEW_VERSION`.

### Step 2: Migrate `CHANGELOG.md` and `CHANGELOG.user.md` Entries
In both `CHANGELOG.md` and `CHANGELOG.user.md`:
1. Insert `## [X.Y.Z] - YYYY-MM-DD` directly beneath `## [Unreleased]`.
2. Move all items from `## [Unreleased]` into the new `## [X.Y.Z] - YYYY-MM-DD` section, leaving `## [Unreleased]` empty at the top.

### Step 3: Commit, Tag & Push to `beta`
```powershell
git add -A
git commit -m "chore(release): v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin beta --follow-tags
```

---

## Workflow 5: Publish `beta` into `main` (Production Promotion)

> **CRITICAL GATEKEEPER RULE**: Execute this workflow **ONLY** when the user explicitly commands publishing/promoting `beta` to `main` or production (e.g., *"Publish beta into main"*, *"Promote beta to main"*, *"Release to production"*, *"Deploy to live"*).

### Step 1: Pre-Promotion Quality Gate on `beta`
1. Checkout `beta` and ensure the working tree is clean and up-to-date:
   ```powershell
   git checkout beta
   git pull origin beta
   git status --porcelain
   ```
2. If `## [Unreleased]` in `CHANGELOG.md` contains uncut changes and the user hasn't cut a version yet, execute **Workflow 4** first so `beta` has a clean semantic version tag (`vX.Y.Z`).
3. Run the full verification suite:
   ```powershell
   npm test
   npm run lint:docs
   npm run build
   git checkout -- server/data/store.json
   ```
   *(If any check fails, abort immediately and report the error).*

### Step 2: Merge `beta` into `main` & Push to Production
**PowerShell (Windows):**
```powershell
$VERSION = (node -p "require('./package.json').version")
$RELEASE_DATE = (Get-Date -Format "yyyy-MM-dd")

# Switch to main and sync with remote
git checkout main
git pull origin main

# Fast-forward merge beta into main (or merge commit if histories diverged)
git merge beta --ff-only
if ($LASTEXITCODE -ne 0) {
  git merge beta -m "chore(release): promote beta v$VERSION to production"
}

# Push main and tags to trigger production CI/CD (subshuffle.com + team-organiser-api)
git push origin main --follow-tags
```

### Step 3: Create Official GitHub Release
Check if a GitHub Release already exists for `v$VERSION`; if not, publish one using the latest section from `CHANGELOG.md`:

```powershell
gh release view "v$VERSION" 2>$null
if ($LASTEXITCODE -ne 0) {
  gh release create "v$VERSION" `
    --target main `
    --title "v$VERSION ($RELEASE_DATE)" `
    --generate-notes
}
```

### Step 4: Return Workspace to `beta`
Immediately switch the local workspace back to `beta` so subsequent work never accidentally lands on `main`:

```powershell
git checkout beta
```

Confirm to the user:
- `beta` (`v$VERSION`) has been merged and pushed to `main`.
- GitHub Actions is deploying the live production environment (`https://subshuffle.com` and `team-organiser-api`).
- GitHub Release `v$VERSION` is published.
- Active local branch has been safely returned to `beta`.

---

## Quick Reference Summary

| Workflow | Trigger Examples | Primary Target Branch |
| :--- | :--- | :--- |
| **1. Create Issue from Chat** | `"create issue"`, `"log issue"`, `"raise issue"` | GitHub Issue Tracker (`gh issue create --body-file`) |
| **2. Pick Up Issue** | `"start issue 36"`, `"pick up issue 36"` | `issue-<id>-<slug>` branched from `beta` |
| **3. Complete Issue** | `"complete issue"`, `"close issue"` | Merge into `beta` & close via `gh issue close` |
| **4. Cut Version** | `"cut version"`, `"bump version"` | Bump root/`client`/`server` on `beta`, tag `vX.Y.Z`, push `origin beta --follow-tags` |
| **5. Publish `beta` to `main`** | `"publish beta into main"`, `"promote beta to main"` | Merge `beta` -> `main`, push `origin main --follow-tags`, `gh release create`, return to `beta` |
