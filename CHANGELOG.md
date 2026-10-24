# Changelog

All notable changes to the **SubShuffle (Team Organiser)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Comprehensive Coach User Guide & In-App Documentation Viewer** ([#22](https://github.com/rossdevereux/team-organiser/issues/22)):
  - Authored a comprehensive grassroots coach handbook [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) covering club setup, squad management, FA match rules, auto-rotation engines, live match stopwatches, mid-match emergency rebalancing, post-match fair-play analytics, administration roles, and pricing.
  - Implemented responsive in-app documentation reader [`GuidePage.tsx`](client/src/pages/GuidePage.tsx) accessible at `/guide` with raw markdown import, sticky Table of Contents sidebar, real-time topic search filter, heading anchor resolution, and print/share actions.
  - Integrated `/guide` route into [`router.tsx`](client/src/router.tsx), public routes whitelist in [`RootLayout.tsx`](client/src/RootLayout.tsx), top navigation in [`Navbar.tsx`](client/src/components/Navbar.tsx), public navigation in [`PublicNav.tsx`](client/src/components/PublicNav.tsx), and user profile dropdown in [`UserMenu.tsx`](client/src/components/UserMenu.tsx).
  - Established persistent agent rules in [`.agents/rules/documentation.md`](.agents/rules/documentation.md), [`.antigravity/rules/documentation.md`](.antigravity/rules/documentation.md), and [`AGENTS.md`](AGENTS.md) mandating continuous synchronization between features, user guide, and changelogs.
  - Added documentation verification linter [`scripts/verify-docs.ts`](scripts/verify-docs.ts) and `"lint:docs"` npm script enforcing non-emptiness, anchor integrity, and core feature keyword presence.
- **Complimentary "Free for Life" Status & Backend Subscription Management**:
  - Added `'free_for_life'` to `SubscriptionTier` and `'lifetime'` to `SubscriptionStatus` across [`shared/types.ts`](shared/types.ts), [`server/src/types.ts`](server/src/types.ts), and [`client/src/types.ts`](client/src/types.ts).
  - Implemented `PUT /api/admin/users/:uid/subscription` in [`server/src/routes/admin.ts`](server/src/routes/admin.ts) allowing Club Owners to grant `free_for_life` or update subscription tiers for individual users, with immediate Firebase custom token claims syncing (`subscriptionStatus`, `subscriptionTier`).
  - Updated entitlement check `isSubscriptionActive` and fast path claims verification in [`server/src/middleware/requireActiveSubscription.ts`](server/src/middleware/requireActiveSubscription.ts) granting perpetual write access with zero lockout or trial expiry.
  - Enhanced Admin Portal [`AdminUsersTab.tsx`](client/src/components/admin/AdminUsersTab.tsx) with a "Free for Life" KPI counter, subscription status pills, and dropdown selectors to update user subscriptions on the fly.
  - Added `👑 Free for Life` presentation badges and banners across [`TrialBadge.tsx`](client/src/components/TrialBadge.tsx), [`PaywallModal.tsx`](client/src/components/PaywallModal.tsx), and [`SettingsModal.tsx`](client/src/components/SettingsModal.tsx).
- **Free Trial Lifecycle, Subscription Paywall & Stripe Billing Integration** ([#6](https://github.com/rossdevereux/team-organiser/issues/6)):
  - Added `UserSubscription`, `SubscriptionTier`, and `SubscriptionStatus` data models across [`shared/types.ts`](shared/types.ts), [`server/src/types.ts`](server/src/types.ts), and [`client/src/types.ts`](client/src/types.ts).
  - Implemented automatic credit-card-free 30-day trial provisioning upon registration in [`server/src/db/storage.ts`](server/src/db/storage.ts) with zero-lookup Firebase custom claims syncing (`subscriptionStatus`, `subscriptionTier`) in [`server/src/auth/claims.ts`](server/src/auth/claims.ts).
  - Built Stripe billing router [`server/src/routes/billing.ts`](server/src/routes/billing.ts) supporting Stripe Checkout session generation (`POST /api/billing/create-checkout-session`), Stripe Customer Portal sessions (`POST /api/billing/create-portal-session`), subscription status retrieval (`GET /api/billing/subscription`), and raw-body Stripe webhook signature verification (`POST /api/billing/webhook`) handling checkout completions, plan updates, deletions, and payment failures.
  - Added feature gating middleware [`server/src/middleware/requireActiveSubscription.ts`](server/src/middleware/requireActiveSubscription.ts) gating active match planning, live rotations, and fixture creation with `402 Payment Required` (`{ code: 'TRIAL_EXPIRED' }`) while strictly preserving full read-only and export access for past matches, stats, and PDF downloads (no hostage data policy).
  - Built navigation trial status badge [`TrialBadge.tsx`](client/src/components/TrialBadge.tsx) displaying dynamic trial countdown with color cues (green for >5 days, amber for ≤3 days, red for expired) and upgrade prompts.
  - Implemented paywall modal [`PaywallModal.tsx`](client/src/components/PaywallModal.tsx) with transparent plan comparisons and value propositions.
  - Added dedicated "Billing & Plan" management tab inside user settings modal [`SettingsModal.tsx`](client/src/components/SettingsModal.tsx) and "Manage Subscription" option in [`UserMenu.tsx`](client/src/components/UserMenu.tsx).
  - Integrated paywall interception and subscription state into [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) and mounted modal in [`GlobalModals.tsx`](client/src/components/GlobalModals.tsx).
  - Added comprehensive test suite in [`server/src/tests/stripeBilling.test.ts`](server/src/tests/stripeBilling.test.ts) covering trial provisioning, entitlement calculation, 402 paywall middleware enforcement, checkout sessions, webhook processing, and admin lifetime grants.

### Changed
- **Grassroots Pricing Infrastructure Cost Recovery**:
  - Adjusted subscription catalog in [`server/src/routes/billing.ts`](server/src/routes/billing.ts) to **£1.50/month** (`unitAmount: 150`) and **£15.00/year** (`unitAmount: 1500`, ~£1.25/mo) strictly to cover cloud server, database, and infrastructure costs.
  - Updated plan presentation and upgrade buttons in [`PaywallModal.tsx`](client/src/components/PaywallModal.tsx) and [`SettingsModal.tsx`](client/src/components/SettingsModal.tsx).

## [1.1.9] - 2026-10-24

### Added
- **Dynamic Sub Rebalancer for Mid-Match Injuries & Early Departures** ([#18](https://github.com/rossdevereux/team-organiser/issues/18)):
  - Added `EarlyDeparture` model and `earlyDepartures?: EarlyDeparture[]` on `Fixture` across [`shared/types.ts`](shared/types.ts), [`server/src/types.ts`](server/src/types.ts), and [`client/src/types.ts`](client/src/types.ts) tracking exact period, minute, match minute, reason, replacement sub, and pro-rated minutes.
  - Implemented dynamic sub rebalancer engine `rebalanceRemainingPeriods(...)` in [`server/src/services/rotationService.ts`](server/src/services/rotationService.ts) to instantly swap injured on-pitch players with a selected bench sub, lock departed players out of all subsequent periods, and redistribute remaining quarters/halves across active squad members prioritizing lowest-minute players to maintain the FA 50%+ rule.
  - Added dedicated endpoint `POST /api/fixtures/:id/early-departure` in [`server/src/routes/api.ts`](server/src/routes/api.ts) persisting early departure records, rebalanced squads, and timestamped audit logs in `liveMatchState.subLog`.
  - Created touchline emergency prompt modal [`EmergencyDepartureModal.tsx`](client/src/components/EmergencyDepartureModal.tsx) with reason selectors, minute sliders defaulting to the live match stopwatch, immediate bench substitute selection with player playtime stats, and rebalance guarantee summaries.
  - Integrated "Injured / Left Early" touchline action buttons into [`PitchView.tsx`](client/src/components/PitchView.tsx), [`BenchView.tsx`](client/src/components/BenchView.tsx), and [`LiveMatchModal.tsx`](client/src/components/LiveMatchModal.tsx), plus a mid-match departures list and pitch badge indicators.
  - Updated `calculateMatchStats` in [`server/src/services/rotationService.ts`](server/src/services/rotationService.ts) and [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) along with `applyFixtureMinutes` in [`server/src/db/storage.ts`](server/src/db/storage.ts) to freeze departed players' logged match minutes at their exact exit minute.
  - Added comprehensive test suite in [`server/src/tests/dynamicSubRebalancer.test.ts`](server/src/tests/dynamicSubRebalancer.test.ts).

## [1.1.8] - 2026-10-18

### Fixed
- **Service Worker Cache PUT Non-GET Request Error**:
  - Guarded against unsupported non-GET HTTP methods in [`client/public/sw.js`](client/public/sw.js) to resolve `TypeError: Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported` when executing POST, PUT, or DELETE operations (e.g. Firebase Auth sign-ins, match updates, external APIs).
  - Restricted service worker interception exclusively to same-origin assets and Google Fonts, ensuring third-party APIs bypass cache operations.
  - Added `.catch(...)` error handlers on all `cache.put(...)` invocations and incremented cache storage to `subshuffle-offline-v4`.

### Changed
- **Optimised Live Match Status Polling & Heartbeat** ([#16](https://github.com/rossdevereux/team-organiser/issues/16)):
  - Added minimal runtime status endpoint `GET /api/fixtures/:id/live-status` in [`server/src/routes/api.ts`](server/src/routes/api.ts) delivering match state (`status`, `period`, `homeScore`, `awayScore`, `periodStartedAt`, `version`, `updatedAt`) in under 150 bytes uncompressed payload size.
  - Implemented HTTP conditional request handling via `ETag` (`W/"<id>-<version>-<timestamp>"`) returning `304 Not Modified` with empty body (0 bytes) whenever fixture state has not mutated.
  - Added Edge CDN and browser caching header `Cache-Control: public, max-age=1, s-maxage=3, stale-while-revalidate=2` and exposed `ETag` via CORS in [`server/src/index.ts`](server/src/index.ts).
  - Configured Express server response compression threshold to 256 bytes (`compression({ threshold: 256 })`) in [`server/src/index.ts`](server/src/index.ts).
  - Implemented monotonic `version` increment and `updatedAt` timestamp tracking in `saveFixture` in [`server/src/db/storage.ts`](server/src/db/storage.ts).
  - Created client polling hook [`useLiveMatchStatus`](client/src/hooks/useLiveMatchStatus.ts) with adaptive polling intervals (5s during active live matches, 30s during half-time/pre-match, stops on match completion), Page Visibility API listeners that pause polling on locked screens or hidden tabs, and persistent ETag header passing.
  - Integrated `useLiveMatchStatus` into [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx), replacing high-overhead full fixture polling.
  - Added unit test suite in [`server/src/tests/liveMatchStatusPolling.test.ts`](server/src/tests/liveMatchStatusPolling.test.ts) and Playwright E2E suite in [`e2e/live-status-polling.spec.ts`](e2e/live-status-polling.spec.ts).

## [1.1.7] - 2026-10-18

### Fixed
- **Fair Play & Minutes Cumulative Match Tracking** ([#15](https://github.com/rossdevereux/team-organiser/issues/15)):
  - Added `creditedMinutes?: Record<string, number>` to `Fixture` across [`shared/types.ts`](shared/types.ts), [`server/src/types.ts`](server/src/types.ts), and [`client/src/types.ts`](client/src/types.ts) to track credited match minutes idempotently per player and prevent duplicate increments.
  - Implemented `applyFixtureMinutes(fixture)` in [`server/src/db/storage.ts`](server/src/db/storage.ts) to automatically calculate minute and appearance deltas when fixtures are saved via `updatePostMatchRecording`, `updateFixtureScore`, `updateFixture`, or removed via `deleteFixture`, updating each player's `totalMinutesPlayed` and `matchesPlayed` in storage.
  - Updated API endpoints `PUT /api/fixtures/:id/post-match` and `PUT /api/fixtures/:id/score` in [`server/src/routes/api.ts`](server/src/routes/api.ts) to return updated player records (`updatedPlayers`).
  - Enhanced [`FairPlayStats.tsx`](client/src/components/FairPlayStats.tsx) and [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) to inspect recorded match time (`postMatchRecording` and `creditedMinutes`) alongside period lineups, calculating dynamic team available minutes and real-time player game time percentages without requiring page reloads.
  - Updated [`SeasonFairPlayView.tsx`](client/src/components/fairplay/SeasonFairPlayView.tsx) to display exact game time percentages and dynamic playtime balance badges (`Balanced` vs `Below Target (X%)`).
  - Added unit test suite in [`server/src/tests/fairPlayMinutes.test.ts`](server/src/tests/fairPlayMinutes.test.ts) and Playwright E2E suite in [`e2e/fair-play-minutes.spec.ts`](e2e/fair-play-minutes.spec.ts).

## [1.1.6] - 2026-10-18

### Added
- **Live Match State Machine & Synchronised Stopwatch Persistence** ([#14](https://github.com/rossdevereux/team-organiser/issues/14)):
  - Added `LiveMatchState`, `LiveMatchPeriodTimer`, and `LiveMatchSubLogEntry` data models on `Fixture` in [`client/src/types.ts`](client/src/types.ts) and [`server/src/types.ts`](server/src/types.ts).
  - Implemented `updateLiveMatchState(fixtureId, liveMatchState)` in [`server/src/db/storage.ts`](server/src/db/storage.ts) and registered API endpoint `PUT /api/fixtures/:id/live-state` in [`server/src/routes/api.ts`](server/src/routes/api.ts), persisting current period, startedAt timestamp, accumulated elapsed seconds, and in-match substitution logs to Firestore and local storage.
  - Re-architected [`LiveMatchModal.tsx`](client/src/components/LiveMatchModal.tsx) and [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) to deterministically derive live elapsed time from `startedAt` timestamps across all devices, ensuring resilience against page reloads, browser app switching, or device shutdowns pitchside.
  - Added `executeLiveSubstitution(offPlayerId, onPlayerId, targetPosition)` in [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) to immediately execute and persist sideline substitutions and update the live substitution log timeline without requiring post-match commits.
  - Implemented multi-device background polling in [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) for active live matches, keeping remote assistant coaches and viewers in lockstep sync.
  - Added unit test suite in [`server/src/tests/liveMatchState.test.ts`](server/src/tests/liveMatchState.test.ts) and Playwright E2E suite in [`e2e/live-match-persistence.spec.ts`](e2e/live-match-persistence.spec.ts) covering reload resilience, stopwatch continuity, and sideline substitution persistence.

## [1.1.5] - 2026-10-18

### Added
- **Immutable User ID Resolution for Team Sharing**:
  - Enhanced team sharing (`POST /api/teams/:id/share`) in [`server/src/routes/api.ts`](server/src/routes/api.ts) to resolve recipient emails to their immutable Firebase Auth `uid` via `getAuth().getUserByEmail` (with fallback to existing registered users) and store the permanent `userId` in `team.sharedWith` and structured `team.sharedMembers`.
  - Added `pendingInvites: string[]` on `Team` model in [`server/src/types.ts`](server/src/types.ts) and [`client/src/types.ts`](client/src/types.ts) for invited coaches who have not registered an account yet.
  - Implemented automatic invite claiming via `claimPendingInvites(userId, email)` in [`server/src/db/storage.ts`](server/src/db/storage.ts) during team retrieval (`GET /api/teams`), converting pending email invites to linked `userId` entries upon first user registration or sign-in.
  - Added team unsharing endpoint (`DELETE /api/teams/:id/share/:memberIdOrEmail`) and context action `unshareTeam` in [`client/src/context/MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx).
  - Added shared coaches list with status badges (`Linked UID` vs `Pending`) and access revocation controls in [`TeamManager.tsx`](client/src/components/TeamManager.tsx).
  - Added unit test coverage in [`server/src/tests/teamAdminVisibility.test.ts`](server/src/tests/teamAdminVisibility.test.ts) verifying immutable `userId` access retention across email changes, pending invite claiming, and unsharing access revocation.

## [1.1.4] - 2026-10-18

### Added
- **Application-Wide Internationalisation Coverage (i18n)** ([#7](https://github.com/rossdevereux/team-organiser/issues/7)):
  - Expanded comprehensive locale translation schemas across English (`en`), Spanish (`es`), French (`fr`), and German (`de`) in [`client/src/locales/`](client/src/locales/).
  - Wired full translation dictionaries (`t(...)`) into all core matchday, squad, and public views:
    - Tactical Pitch & Substitutes: [`PitchView.tsx`](client/src/components/PitchView.tsx) and [`BenchView.tsx`](client/src/components/BenchView.tsx).
    - Squad Roster & Availability: [`SquadManager.tsx`](client/src/components/SquadManager.tsx).
    - Match Rotation Matrix: [`RotationMatrix.tsx`](client/src/components/RotationMatrix.tsx).
    - Team Management & Assistant Coach Invites: [`TeamManager.tsx`](client/src/components/TeamManager.tsx).
    - Matchdays & Logistics: [`FixtureManager.tsx`](client/src/components/FixtureManager.tsx).
    - Fair Play & Playing Time Analytics: [`FairPlayStats.tsx`](client/src/components/FairPlayStats.tsx).
    - Youth Substitution Calculator: [`CalculatorPage.tsx`](client/src/pages/CalculatorPage.tsx).
    - Modals & Pitchside Exports: [`WhatsAppExportModal.tsx`](client/src/components/WhatsAppExportModal.tsx), [`ScoreScorersModal.tsx`](client/src/components/ScoreScorersModal.tsx), [`SuggestedSubsModal.tsx`](client/src/components/SuggestedSubsModal.tsx), [`PrintMatchSheet.tsx`](client/src/components/PrintMatchSheet.tsx), and [`AuthModal.tsx`](client/src/components/auth/AuthModal.tsx).

### Fixed
- **Multi-Team Data Isolation & Cross-Team Leakage Prevention** ([#13](https://github.com/rossdevereux/team-organiser/issues/13)):
  - Enforced mandatory `teamId: string` across client and server entity models for `Player` and `Fixture` in [`client/src/types.ts`](client/src/types.ts) and [`server/src/types.ts`](server/src/types.ts).
  - Updated backend API validation in [`server/src/routes/api.ts`](server/src/routes/api.ts) (`POST /api/players`, `POST /api/fixtures`, `POST /api/players/bulk`) to reject requests missing `teamId` with HTTP 400.
  - Hardened `GET /api/players` and `GET /api/fixtures` to filter strictly by `teamId`.
  - Fixed client-side state caching in [`client/src/context/MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx): `setActiveTeamId` now immediately flushes previous team players, fixtures, and period states upon team switch, and `refreshTeamData` no longer ignores empty arrays (`[]`) returned for secondary or newly created teams.
  - Configured Firestore Security Rules in [`firestore.rules`](firestore.rules) and registered in [`firebase.json`](firebase.json) to restrict read/write access for `players` and `fixtures` strictly to users with authorized team ownership or shared coach access.
  - Added full test suite in [`server/src/tests/teamDataIsolation.test.ts`](server/src/tests/teamDataIsolation.test.ts) and Playwright E2E suite in [`e2e/team-data-isolation.spec.ts`](e2e/team-data-isolation.spec.ts) covering team data scoping, sequential team switching, 400 validation for missing `teamId`, and secondary team empty state isolation.
- **Authentication Dialog Viewport & Sizing**:
  - Teleported [`AuthModal.tsx`](client/src/components/auth/AuthModal.tsx) directly to `document.body` via React Portals (`createPortal`), preventing ancestor `backdrop-blur-xl` and header bounding constraints from clipping modal height to 64px.
  - Expanded dialog layout, input fields (`py-3 sm:py-3.5`, `text-sm sm:text-base`), and buttons (`min-h-[50px]`) for touch-friendly mobile interaction and high-contrast desktop readability.
  - Added `variant="hero"` and `variant="card"` options in [`AuthButton.tsx`](client/src/components/AuthButton.tsx) and updated [`LandingHero.tsx`](client/src/components/LandingHero.tsx) to provide prominent, full-sized call-to-action buttons.

## [1.1.3] - 2026-10-18

### Added
- **Technical SEO, Robots & Sitemap**:
  - Added crawl-optimized [`robots.txt`](client/public/robots.txt) allowing public indexable routes (`/`, `/calculator`, `/features`, `/rules`) and disallowing internal authenticated matchday routes ([#11](https://github.com/rossdevereux/team-organiser/issues/11)).
  - Generated XML sitemap [`sitemap.xml`](client/public/sitemap.xml) with public page priorities, change frequencies, and publication timestamps ([#11](https://github.com/rossdevereux/team-organiser/issues/11)).
  - Added Schema.org structured data (JSON-LD) for `SoftwareApplication` (SportsApplication with free tier definitions) and `FAQPage` in [`index.html`](client/index.html).
- **Open Graph & Twitter Social Sharing Cards**:
  - Integrated Open Graph (`og:*`) and Twitter Card (`summary_large_image`) metadata in [`index.html`](client/index.html) optimized for WhatsApp, iMessage, Facebook, and Twitter link unfurling ([#11](https://github.com/rossdevereux/team-organiser/issues/11)).
  - Created 1200×630px social card preview image asset [`og-preview.png`](client/public/og-preview.png) and compressed mobile companion [`og-preview.jpg`](client/public/og-preview.jpg).
- **Public Equal Playing Time & Sub Rotation Calculator (`/calculator`)**:
  - Implemented client-side interactive rotation calculator [`CalculatorPage.tsx`](client/src/pages/CalculatorPage.tsx) supporting 5v5, 7v7, 9v9, and 11v11 formats, custom match durations, and quarter splits without requiring user sign-in ([#11](https://github.com/rossdevereux/team-organiser/issues/11)).
  - Added period-by-period rotation matrix simulation and one-click WhatsApp rotation summary export.
- **Email/Password & Facebook Authentication**:
  - Introduced unified multi-provider authentication dialog [`AuthModal.tsx`](client/src/components/auth/AuthModal.tsx) supporting Google Sign-In, Facebook Login, and Email/Password credentials with password confirmation and password reset dispatch ([#12](https://github.com/rossdevereux/team-organiser/issues/12)).
  - Implemented centralized authentication service [`auth.ts`](client/src/services/auth.ts) encapsulating `signInWithGoogle`, `signInWithFacebook`, `signInWithEmail`, `registerWithEmail`, and `sendPasswordReset` with coach-friendly error mapping and account collision handling (`auth/account-exists-with-different-credential`).
  - Exported configured `FacebookAuthProvider` with `email` and `public_profile` scopes in [`firebase.ts`](client/src/firebase.ts).
  - Integrated `AuthModal` into [`AuthButton.tsx`](client/src/components/AuthButton.tsx) and [`UserMenu.tsx`](client/src/components/UserMenu.tsx).
- **Indexable Grassroots Public Landing Pages**:
  - Added dedicated public features showcase [`FeaturesPage.tsx`](client/src/pages/FeaturesPage.tsx) at `/features`.
  - Added FA youth formats, ball sizes, match timings, and equal playing time reference guide [`RulesPage.tsx`](client/src/pages/RulesPage.tsx) at `/rules`.
  - Added shared responsive header [`PublicNav.tsx`](client/src/components/PublicNav.tsx).

### Changed
- **Production Domain Configuration**:
  - Configured production domain to `https://subshuffle.com` across canonical links, Open Graph, Twitter cards, Schema.org structured data, `robots.txt`, XML sitemap, and WhatsApp clipboard sharing links.
- **Route Code Splitting & Core Web Vitals**:
  - Configured `React.lazy()` route-level code splitting for authenticated dashboard pages in [`router.tsx`](client/src/router.tsx) with custom suspense loader ([#11](https://github.com/rossdevereux/team-organiser/issues/11)).
  - Refactored manual chunk splitting in [`vite.config.ts`](client/vite.config.ts) for `markdown-vendor` and `i18n-vendor`, reducing core client index bundle from 656 KB to 389 KB.
  - Decoupled public routes in [`RootLayout.tsx`](client/src/RootLayout.tsx) from dashboard data loading so public landing pages achieve sub-1.5s mobile LCP.
  - Added preconnect and preload hints for Google Fonts and brand icon in [`index.html`](client/index.html).

## [1.1.2] - 2026-10-18

### Changed
- **Version Alignment**: Synchronized application and workspace package versions to 1.1.2 across root, client, and server workspaces.

## [1.1.1] - 2026-10-17

### Added
- **Coach-Friendly Visual Release Notes (`CHANGELOG.user.md`)**:
  - Introduced standalone user-facing release notes document [`CHANGELOG.user.md`](CHANGELOG.user.md) crafted specifically for grassroots coaches, team managers, and parents with zero code jargon and outcome-oriented summaries ([#10](https://github.com/rossdevereux/team-organiser/issues/10)).
  - Implemented typed release notes utility [`userChangelog.ts`](client/src/utils/userChangelog.ts) with structured TypeScript export `CHANGELOG_DATA` and Vite raw markdown import (`?raw`).
  - Added repository policy rule in [`.agents/rules/changelog.md`](.agents/rules/changelog.md) enforcing synchronous updates between developer `CHANGELOG.md` and user `CHANGELOG.user.md`.

### Changed
- **Markdown-Powered Release Notes Modal ([`ReleaseNotesModal.tsx`](client/src/components/ReleaseNotesModal.tsx))**:
  - Refactored the in-app release notes viewer to render raw Markdown via `react-markdown` and `remark-gfm` with custom Tailwind component styling for `h2` version titles, calendar date pills, coloured category badges (`Added` emerald, `Improved` sky, `Fixed` amber), clean bullet lists, and bright typography ([#10](https://github.com/rossdevereux/team-organiser/issues/10)).
  - Maintained accessibility and real-time search/category filtering without requiring authentication.
- **Menu Bar & Navigation Layout Consolidation**:
  - Replaced sprawling navigation bar header controls with a consolidated Avatar profile menu ([`UserMenu.tsx`](client/src/components/UserMenu.tsx)) encapsulating user details, role badge (`Club Admin`, `Team Coach`, `Member`, `Guest Coach`), language selector with flags (`GB EN`, `ES`, `DE`, `FR`), Team & League Settings, and Sign In / Sign Out actions ([#9](https://github.com/rossdevereux/team-organiser/issues/9)).
  - Combined export and sharing actions into a single `Share / Export ▾` dropdown menu in [`Navbar.tsx`](client/src/components/Navbar.tsx) providing quick access to "WhatsApp Squad Card" and "Print Team Sheet".
  - Consolidated team and match selection into a single breadcrumb selector pill (`[ Team › Match ▾ ]`) with outside-click dismissal to save header space.
  - Relocated pitch-specific controls (*Halves / Match Periods*, *Formation*, and *Auto-Balance*) out of the global navigation bar and into a dedicated pitch controls toolbar directly above the 2D football pitch in [`PitchView.tsx`](client/src/components/PitchView.tsx).
  - Streamlined primary navigation tabs row into an edge-to-edge horizontally scrollable track (`overflow-x-auto no-scrollbar scroll-smooth`) with minimum touch targets of 44×44px, eliminating awkward multi-line menu bar wrapping on mobile and tablet devices.

### Fixed
- **Admin Portal User Provisioning & Invite State**: Corrected user invite payload serialization in [`adminApi.ts`](client/src/utils/adminApi.ts) and immediate UI state update in [`AdminPortal.tsx`](client/src/components/AdminPortal.tsx).

### Removed
- **Duplicate Footer Action Items**: Removed redundant action buttons from the global footer bar (*Print Pitch Sheet*, *Teams & Sharing*, *League Settings*, and *WhatsApp Announcement*) in [`RootLayout.tsx`](client/src/RootLayout.tsx) in favor of the primary navigation tabs and utility controls in the top navbar header ([#8](https://github.com/rossdevereux/team-organiser/issues/8)).

## [1.1.0] - 2026-10-17

### Added
- **Fixture Final Score & Goal Scorers (Live Match & Post-Match Results)**:
  - Added ability to record match scores (Home and Away) and individual goal scorers with player attribution, stoppage time minutes format (e.g. `23`, `45+2`), and own-goal (`OG`) flags ([#4](https://github.com/rossdevereux/team-organiser/issues/4)).
  - Implemented interactive [`ScoreScorersModal.tsx`](client/src/components/ScoreScorersModal.tsx) with score steppers, reactive validation banners preventing goal scorers from exceeding entered score totals, and quick live/final status toggling.
  - Implemented live scoreboard controls and real-time score adjustment buttons inside [`LiveMatchModal.tsx`](client/src/components/LiveMatchModal.tsx).
  - Added prominent score badges and goal scorers breakdown tags on fixture cards in [`FixtureManager.tsx`](client/src/components/FixtureManager.tsx), [`AllFixturesTable.tsx`](client/src/components/AllFixturesTable.tsx), and active match header in [`RootLayout.tsx`](client/src/RootLayout.tsx).
  - Integrated goal metrics into season player fair play and match participation statistics in [`FairPlayStats.tsx`](client/src/components/FairPlayStats.tsx) and [`SeasonFairPlayView.tsx`](client/src/components/fairplay/SeasonFairPlayView.tsx).
  - Added backend endpoint `PUT /api/fixtures/:id/score` in [`api.ts`](server/src/routes/api.ts) and `updateFixtureScore` in [`storage.ts`](server/src/db/storage.ts) with input sanitization and validation rules.
  - Added unit test suite in [`fixtureScore.test.ts`](server/src/tests/fixtureScore.test.ts) and end-to-end tests across Chromium, Mobile, and Tablet viewports in [`fixture-score.spec.ts`](e2e/fixture-score.spec.ts).
- **Application Version & Interactive Changelog View**:
  - Dynamically injected the semver application version from `package.json` into the client build via Vite (`import.meta.env.VITE_APP_VERSION`), accessible via [`version.ts`](client/src/utils/version.ts).
  - Added discrete, accessible version indicator button in the global footer across both the main matchday layout ([`RootLayout.tsx`](client/src/RootLayout.tsx)) and public landing page ([`LandingHero.tsx`](client/src/components/LandingHero.tsx)).
  - Implemented public, mobile-responsive [`ChangelogModal.tsx`](client/src/components/ChangelogModal.tsx) featuring real-time search filtering, category filter chips (*All Updates*, *Features*, *Improvements*, *Bug Fixes*), GitHub issue link references, and keyboard accessibility without requiring authentication.
  - Added backend endpoint `GET /api/changelog` in [`api.ts`](server/src/routes/api.ts) and markdown parsing service [`changelogService.ts`](server/src/services/changelogService.ts) with cache-control headers and resilient client-side offline fallback ([#5](https://github.com/rossdevereux/team-organiser/issues/5)).
  - Added unit test coverage in [`changelogService.test.ts`](server/src/tests/changelogService.test.ts) and end-to-end Playwright tests in [`footer-changelog.spec.ts`](e2e/footer-changelog.spec.ts).
- **GitHub Issue Lifecycle & Release Pipeline Skill**: Added [`github-issue-lifecycle.md`](.antigravity/skills/github-issue-lifecycle.md) providing step-by-step procedures, shell commands, and guardrails for picking up GitHub issues via `gh`, completing issues with closing commits and `CHANGELOG.md` updates, and cutting semantic releases with `package.json` bumping and git tagging.
- **Fixture-Specific Position Locks & Global Unlock Overrides**:
  - Added ability for coaches to lock or unlock player positions on a per-fixture basis while preserving global locking defaults on player profiles (e.g. keep GK locked in goal all match one week, and unlock them to rotate freely the next week).
  - Added matchday lock/unlock toggle and descriptive status badges in the pitch player inspection drawer in [`PitchView.tsx`](client/src/components/PitchView.tsx) indicating whether a player is `🔒 Locked (Profile Default)`, `🔒 Locked for this Match`, or `🔓 Unlocked for this Match (Overrides Profile)`.
  - Added "Matchday Fixed Positions" configuration panel to [`EditFixtureModal.tsx`](client/src/components/EditFixtureModal.tsx) enabling coaches to lock or unlock specific players directly when scheduling or editing fixtures.
  - Added unit test coverage in [`rotationService.test.ts`](server/src/tests/rotationService.test.ts) verifying multi-period goalkeeper rotation when a globally locked goalkeeper is unlocked on a fixture, fixture-level locking of otherwise rotating goalkeepers, and substitution suggestions for unlocked players.
- **Fixed Player Position All Match**:
  - Added support for fixing/locking a player in position for the full match duration (e.g. dedicated goalkeeper or anchor defender with no intention of swapping out) at both player profile level (`isFixedPosition`, `fixedPosition`) and per-fixture level (`fixedPlayerPositions`).
  - Added interactive Lock/Unlock toggle button in the player inspection drawer and lock indicators on pitch player cards in [`PitchView.tsx`](client/src/components/PitchView.tsx).
  - Added "Lock / Fix in Position All Match" toggle and position selector dropdown to [`PlayerFormModal.tsx`](client/src/components/squad/PlayerFormModal.tsx).
  - Added visual lock indicators and fixed role badges in [`SquadManager.tsx`](client/src/components/SquadManager.tsx) and [`RotationMatrix.tsx`](client/src/components/RotationMatrix.tsx).
  - Added fixed player protection banner and clipboard copy annotation to [`SuggestedSubsModal.tsx`](client/src/components/SuggestedSubsModal.tsx).
  - Added dedicated endpoint `PUT /api/fixtures/:id/fixed-positions` in [`api.ts`](server/src/routes/api.ts) for live matchday position lock persistence.
  - Added comprehensive test coverage in [`rotationService.test.ts`](server/src/tests/rotationService.test.ts) validating `getFixedPositionsMap`, multi-period goalkeeper locking, outfield position preservation, and sideline substitution exclusion.
- Standalone offline demo dataset in [`demoData.ts`](client/src/utils/demoData.ts) providing instant sample rosters, formations, and fixtures for unauthenticated or offline demo sessions.

### Changed
- **Fair Rotation Engine & Sideline Substitutions**:
  - Enhanced `getFixedPositionsMap` in [`rotationService.ts`](server/src/services/rotationService.ts) to support fixture-level unlock overrides (`UNLOCKED`, `NONE`, `ROTATE`) that supersede global player profile locking defaults.
  - Enhanced `generateFairRotation` in [`rotationService.ts`](server/src/services/rotationService.ts) to reserve pitch slots across all match periods for fixed players, exclude them from rotation off, and fairly recalculate playing time targets and Hungarian optimal assignments for remaining players.
  - Enhanced `generateSuggestedSubstitutions` and `findBestOutgoingPitchPlayer` in [`rotationService.ts`](server/src/services/rotationService.ts) across all 3 strategies (*Equal Game Time & Unused Subs*, *Positional Match*, and *Rolling Single Sub*) to ensure fixed players are never substituted off while continuing to track their full match minutes.
  - Enhanced `selectMatchdaySquad` in [`rotationService.ts`](server/src/services/rotationService.ts) to guarantee fixed players are prioritized in matchday squad selection.
  - Enhanced [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) with `isPlayerFixed`, `getFixedPlayerPosition`, `toggleFixedPlayerPosition`, and `setFixtureFixedPosition` to synchronize locked positions across all period lineups in real time and persist per-fixture overrides to the server.
- Refactored demo mode entry and user sign-out lifecycle in [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx) to provide unified `enterDemoMode()` and `signOutUser()` actions across [`LandingPage.tsx`](client/src/pages/LandingPage.tsx) and [`AuthButton.tsx`](client/src/components/AuthButton.tsx).

### Fixed
- **Team Admin Multi-Tenant Visibility & Access Control**:
  - Ensured authenticated team administrators and coaches only see teams specifically created by them or explicitly shared with them, preventing inadvertent team leakage across different club accounts ([#3](https://github.com/rossdevereux/team-organiser/issues/3)).
  - Eliminated demo seed team leakage (`The Rovers FC (U10s)` and `(U12s)`) into authenticated sessions caused by unauthenticated `localStorage` cache fallback in [`MatchdayContext.tsx`](client/src/context/MatchdayContext.tsx), scoping cached teams to the authenticated user ID (`subshuffle_cached_teams_${currentUser.uid}`).
  - Enforced strict backend authorization checks in [`storage.ts`](server/src/db/storage.ts) and [`api.ts`](server/src/routes/api.ts) for `GET /api/teams`, `GET/PUT/DELETE /api/teams/:id`, `POST /api/teams/:id/share`, `GET/POST/PUT/DELETE /api/players`, and `GET/POST/PUT/DELETE /api/fixtures`.
  - Added clean empty state display ("No Teams Found", "Create Your First Team") in [`TeamManager.tsx`](client/src/components/TeamManager.tsx) and persistent `+ Create Team` CTA button in [`Navbar.tsx`](client/src/components/Navbar.tsx) when an admin user has no teams configured.
  - Added team ownership and sharing indicator badges ("Your Team", "Created by you", "Shared with You", "Shared with you by <coach>") in [`TeamManager.tsx`](client/src/components/TeamManager.tsx).
  - Added comprehensive backend authorization unit tests in [`teamAdminVisibility.test.ts`](server/src/tests/teamAdminVisibility.test.ts) and multi-viewport end-to-end tests in [`team-admin-visibility.spec.ts`](e2e/team-admin-visibility.spec.ts).
- Fixed pitch player inspection drawer layout and styling in [`PitchView.tsx`](client/src/components/PitchView.tsx): resolved severe horizontal text collision and overlapping badges by separating player profile info, playing time stats, and action buttons into a clean, responsive, multi-tier layout with dedicated actions toolbar.
- Fixed pitch player node click in [`PitchView.tsx`](client/src/components/PitchView.tsx) prematurely activating swap mode, which previously suppressed the player inspection drawer from opening. Clicking any pitch node now smoothly opens the inspection drawer with matchday lock/unlock controls, stats, call-off options, and highlighted selection ring.
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
