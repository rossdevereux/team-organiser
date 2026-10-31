---
trigger: manual
---

## name: git-branching-and-production-gatekeeper
description: Strictly enforces committing and deploying to the beta environment first, prohibiting direct commits or merges to main without explicit user command.
trigger: on-task-complete, on-git-commit, on-git-push

# Rule: Git Branching, Staging Pipeline & Production Gatekeeper

To protect live Sunday morning matchday operations on `https://subshuffle.com`, all code changes must be isolated and verified in the staging environment (`https://beta.subshuffle.com`) before reaching production.

As an AI developer / agent working in this repository, you must strictly follow this branching policy.

### Core Principles

1. **`beta` is the Default Integration Branch:**

   * All feature work, bug fixes, UI adjustments, and refactoring must branch from and merge back into `beta`.

   * Pushing to `beta` automatically deploys frontend assets to `subshuffle-beta` (Firebase Hosting) and the backend container to `backend-api-beta` (Cloud Run).

2. **`main` is Strictly Locked to Production:**

   * `main` represents the live, verified production application at `https://subshuffle.com`.

   * **Absolute Restriction:** Never commit directly to `main`.

   * **Absolute Restriction:** Never push to `main` without an explicit user command.

   * **Absolute Restriction:** Never merge `beta` or any feature branch into `main` autonomously.

3. **Production Promotions Occur ONLY on Direct Command:**

   * You may only promote code to `main` when the user gives an explicit, unambiguous directive (e.g., *"Promote beta to main"*, *"Release to production"*, *"Deploy to live"*).

   * Generic task completion prompts (such as *"finish this up"*, *"commit your work"*, or *"deploy"*) MUST default to `beta`.

### Automated Branch Verification Protocol

Before executing any `git commit`, `git merge`, or `git push` command, verify the target branch:

```
CURRENT_BRANCH=$(git branch --show-current)

```

#### Scenario A: Routine Work (Features, Fixes, Improvements)

1. Verify `CURRENT_BRANCH` is either `beta` or a feature branch (e.g., `fix/nav-overlap`, `feat/in-game-subs`).

2. If currently on `main`:

   * **STOP IMMEDIATELY.** Do not commit.

   * Switch to `beta` (`git checkout beta`) or create a new branch from `beta` before staging changes.

3. Once changes are tested, merge into `beta` and push:

   ```
   git checkout beta
   git merge <feature-branch>
   git push origin beta
   
   ```

4. Confirm to the user that changes are deployed to **`https://beta.subshuffle.com`** for testing.

#### Scenario B: Explicit Production Promotion Command

Execute this sequence **ONLY** when the user explicitly instructs promotion to production:

1. **Pre-Promotion Quality Checks:**

   ```
   # 1. Ensure working directory is clean
   git status --porcelain
   
   # 2. Verify client and server build with zero errors
   npm run build
   
   # 3. Verify automated test suite passes
   npm test
   
   ```

   *If any build or test fails, abort the promotion and report the failure to the user.*

2. **Execute Fast-Forward or Merge into `main`:**

   ```
   # Switch to main and sync with remote
   git checkout main
   git pull origin main
   
   # Merge verified changes from beta
   git merge beta --ff-only || git merge beta -m "chore(release): promote beta to production"
   
   # Push to main to trigger production CI/CD
   git push origin main
   
   # Return to beta for ongoing development
   git checkout beta
   
   ```

3. **Post-Promotion Confirmation:**
   Inform the user:

   * Changes have been merged to `main`.

   * GitHub Actions is deploying the live site to `https://subshuffle.com`.

   * The active local branch has been safely switched back to `beta`.

### Emergency Touchline Hotfixes

Even in urgent situations:

1. Apply the hotfix on `beta` first to verify builds pass.

2. Only promote to `main` once the coach has confirmed the hotfix resolved the issue on `beta.subshuffle.com`.

### Agent Pre-Commit Checklist

Before declaring any coding task finished:

* \[ \] Checked current branch: verified it is NOT `main`.

* \[ \] Verified build succeeds locally (`npm run build`).

* \[ \] Updated both `CHANGELOG.md` and `CHANGELOG.user.md`.

* \[ \] Pushed commits to `beta` (or feature branch) targeting `beta.subshuffle.com`.