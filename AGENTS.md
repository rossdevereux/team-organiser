# Repository Rules & Guidelines for Agents and Contributors

## Changelog Policy (Mandatory)

This repository strictly maintains a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standards and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### When to Update `CHANGELOG.md`
Every time you:
1. **Add a new feature** or component (`### Added`)
2. **Modify or enhance an existing feature/behavior** (`### Changed`)
3. **Deprecate an API, component, or behavior** (`### Deprecated`)
4. **Remove a feature or file** (`### Removed`)
5. **Fix a bug or error** (`### Fixed`)
6. **Address a security concern or vulnerability** (`### Security`)

**You MUST record the change in `CHANGELOG.md` under the `## [Unreleased]` section.**

### Formatting Guidelines
- Add the entry as a bullet point under the appropriate subheader (`Added`, `Changed`, `Fixed`, etc.) within `## [Unreleased]`.
- Provide a concise description of what was changed and why, linking to relevant components or modules (e.g. `BenchView.tsx`, `rotationService.ts`) where appropriate.
- Never let code changes (features, enhancements, bug fixes) be finalized without an accompanying `CHANGELOG.md` update.

## Continuous Documentation & User Guide Policy (Mandatory)

Whenever you add a feature, update workflows, change settings, or modify UI interactions:
- **You MUST update [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md)** to reflect the changes in a clear, coach-friendly tone for grassroots volunteers.
- Run `npm run lint:docs` to verify internal anchor links and ensure all required core topic sections remain intact.

