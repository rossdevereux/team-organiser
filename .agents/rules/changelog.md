# Repository Rules: Synchronous Dual-Changelog Policy

## Rule Overview
This repository strictly maintains two synchronized changelogs:
1. **`CHANGELOG.md`** — Developer & technical changelog adhering to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
2. **`CHANGELOG.user.md`** — User-facing release notes written for grassroots youth football coaches, team managers, and parents, rendered directly in the app's Release Notes modal.

Whenever a new feature is added, existing functionality is improved, or a bug is fixed, **BOTH files MUST be updated synchronously under `## [Unreleased]`** before concluding the task.

---

## 1. Technical Changelog (`CHANGELOG.md`)

- **Audience**: Developers, maintainers, and CI/CD automation.
- **Allowed Subheaders**:
  - `### Added`: New features or components.
  - `### Changed`: Modifications to existing behavior or interfaces.
  - `### Deprecated`: APIs or features scheduled for removal.
  - `### Removed`: Deleted features or files.
  - `### Fixed`: Bug fixes and error resolutions.
  - `### Security`: Vulnerability remediations.
- **Content Requirements**: Reference affected components, hooks, or backend modules (e.g., [`PitchView.tsx`](client/src/components/PitchView.tsx), [`rotationService.ts`](server/src/services/rotationService.ts)), along with GitHub issue links (`([#10](...))`).

---

## 2. User Release Notes (`CHANGELOG.user.md`)

- **Audience**: Youth football coaches, team managers, club admins, and parents.
- **Strict Content Rules**:
  - **Zero Code Jargon**: Never include file names (`.tsx`, `.ts`), API verbs (`PUT /api/...`), internal function names, or test framework references.
  - **Outcome-Oriented**: Describe the practical user benefit (e.g., write "Record home and away match scores" instead of "Added ScoreScorersModal.tsx with reactive validation").
  - **Category Types**: Every entry must belong strictly to one of three categories:
    - `### Added`
    - `### Improved`
    - `### Fixed`
  - **Short & Scannable**:
    - Headline in bold under 6 words (e.g., `- **Match Scores & Goal Scorers**: ...`).
    - Summary bullet points strictly capped at 1–2 sentences.

---

## 3. Release Bumping
When cutting a new release (e.g. via GitHub issue lifecycle release skill):
- Convert `## [Unreleased]` in both `CHANGELOG.md` and `CHANGELOG.user.md` to `## [X.Y.Z] - YYYY-MM-DD`.
- Add a fresh empty `## [Unreleased]` section at the top of both files.

