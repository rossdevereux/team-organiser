# Changelog

All notable changes to the **SubShuffle (Team Organiser)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Standalone offline demo dataset in [`demoData.ts`](client/src/utils/demoData.ts) providing instant sample rosters, formations, and fixtures for unauthenticated or offline demo sessions.

### Changed
- Refactored demo mode entry and user sign-out lifecycle in [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) to provide unified `enterDemoMode()` and `signOutUser()` actions across [`LandingPage.tsx`](client/src/pages/LandingPage.tsx) and [`AuthButton.tsx`](client/src/components/AuthButton.tsx).

### Fixed
- Fixed unauthenticated "Try Live Demo" button leading to a completely blank screen due to unhandled empty team responses from server/Firestore cold starts. Added resilient client-side and server-side fallback datasets in [`storage.ts`](server/src/db/storage.ts) and [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx), along with helpful empty-state recovery cards in [`PitchView.tsx`](client/src/components/PitchView.tsx) and [`BenchView.tsx`](client/src/components/BenchView.tsx).
- Fixed private user team state persisting in memory after logging out and clicking the demo button. Implemented complete in-memory context purging, `localStorage` cache cleanup (`subshuffle_cached_*`), and URL query parameter sanitization upon sign-out and demo mode initialization.

---

## [1.0.0] - 2026-10-12

### Added
- **Equal Playing Time & Auto-Balance Rotation Engine**:
  - Fair match rotation algorithm (`rotationService.ts`) preventing consecutive benchings and distributing minutes evenly.
  - Configurable rotation intervals (5m, 8m, 10m, 12m, 15m, 20m).
  - Unused substitute prioritization and historical season minutes balancing.
  - Tactical substitution strategies: *Equal Game Time & Unused Subs*, *Positional Match (Like-for-like role preservation)*, and *Rolling Single Sub*.
  - Configurable match duration and period structures (2 Halves, 3 Periods, or 4 Quarters).
- **Interactive Pitch & Formation Support**:
  - Out-of-the-box support for **5-a-side**, **7-a-side**, **9-a-side**, and **11-a-side** youth football formats.
  - Custom formation builder with pitch coordinates editor (e.g., `2-3-1`, `3-2-1`, `2-4-1`, `3-1-2`).
  - Interactive visual pitch with one-click player swaps and positional drag-and-drop.
  - Interactive Bench View (`BenchView.tsx`) with player statuses, call-off controls, and suggested substitution indicators.
- **Roster & Player Tenure Management**:
  - Registration tenure tracking with optional sign-on and leave dates to restrict selection to active players.
  - Vacation and absence calendar (`PlayerHolidayModal.tsx`) with visual warning badges across all matchday rosters.
  - Bulk CSV player import modal (`CSVImportModal.tsx`) with validation.
  - Granular player roles: broad tactical categories (Goalkeeper, Defence, Midfield, Attack) and specific positional roles.
- **Fixtures & Multi-Fixture Matrix View**:
  - Comprehensive fixture scheduler and editor (`FixtureManager.tsx`, `EditFixtureModal.tsx`).
  - Panoramic season matrix table (`MatrixPage.tsx`, `RotationMatrix.tsx`) showing pitch lineups, bench, and rested players per fixture.
  - One-click clipboard export in formatted text and TSV for sharing via WhatsApp, email, or spreadsheets.
  - Printable team sheet layout (`PrintMatchSheet.tsx`).
- **Live Matchday & Post-Match Tracking**:
  - Live match console (`LiveMatchModal.tsx`) with in-game period timers and sideline suggested substitutions (`SuggestedSubsModal.tsx`).
  - Post-match participation tracking (`PostMatchModal.tsx`) supporting 100% equal credit default or minute-by-minute slider adjustments with coach notes.
  - Fair play analytics views: per-matchday breakdown (`MatchdayFairPlayView.tsx`) and aggregated season statistics (`SeasonFairPlayView.tsx`, `FairPlayStats.tsx`).
- **Administration & Multi-Team Support**:
  - Multi-team workspace switcher (`Navbar.tsx`) with independent squad rosters, pitch sizes, and formations per team.
  - Admin management portal (`AdminPortal.tsx`) featuring Club Settings (`AdminClubSettingsTab.tsx`), User Role Management (`AdminUsersTab.tsx`), and Data Backup/Export (`AdminBackupTab.tsx`).
  - Firebase Authentication with Google Sign-In and secure multi-tenant Firestore persistence with local mock fallback.
- **Internationalization (i18n)**:
  - Full localization support via `i18next` with language switcher (`LanguageSelector.tsx`) and translations for English (`en`), German (`de`), Spanish (`es`), and French (`fr`).
  - User preferences settings modal (`SettingsModal.tsx`).
- **Client Architecture & Offline PWA**:
  - Migration to TanStack Router (`router.tsx`) and TanStack Query (`queryClient.ts`) for modular page routing and caching.
  - Progressive Web App (PWA) offline support with service worker (`sw.js`) and web app manifest (`manifest.json`).
  - Skeleton loading states (`PageLoadingSkeleton.tsx`) and centralized modal manager (`GlobalModals.tsx`).
- **Automated Testing & CI/CD**:
  - Comprehensive Playwright end-to-end tests across Chromium, mobile, and tablet configurations.
  - Comprehensive Node.js test runner unit test suites for `rotationService` and storage modules.
  - GitHub Actions deployment workflow for Google Cloud Run (backend) and Firebase Hosting (frontend).

### Fixed
- Fixed deployment workflow script and README build instructions (`797bb0d`).
- Resolved reactive synchronization between pitch and bench selection during matchday call-offs.
