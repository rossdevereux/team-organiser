---
name: continuous-documentation-sync
description: Mandates updating user guides and documentation whenever functional or UI changes are made
trigger: on-task-complete
---

# Rule: Continuous Documentation & User Guide Synchronization

Whenever you implement a new feature, alter user workflows, modify settings, or change UI interactions:
You MUST update `docs/USER_GUIDE.md` (and any related in-app help texts) in the same task before concluding work.

### Strict Maintenance Rules:
1. **Coach-Centric Tone:** Write from the perspective of helping a volunteer grassroots football coach on a Sunday morning. Avoid developer jargon, API paths, and code references.
2. **Reflect Workflow Changes:**
   - If a new button, toggle, or modal is added, document its location and exact purpose.
   - If a constraint or calculation changes (e.g. Fair Play minutes, substitution rules, squad caps), update the explanation.
   - If a feature is deprecated or relocated, update the guide immediately.
3. **Dual-Check Protocol:**
   - Check 1: `CHANGELOG.md` & `CHANGELOG.user.md` updated.
   - Check 2: `docs/USER_GUIDE.md` reflects the current user experience.
   - Check 3: Run `npm run lint:docs` to ensure all internal links and required topics are valid.
