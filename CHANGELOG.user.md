# SubShuffle Release Notes

## [Unreleased]

### Added
- **Payment History & VAT Receipts in Settings** ([#35](https://github.com/rossdevereux/team-organiser/issues/35)):
  - Coaches can now view their complete subscription payment history directly inside **Settings → Billing & Plan**.
  - Download official PDF VAT receipts with one click (`📄 Receipt ↗`) for grassroots club expense claims, automatically retained for 24 months.
  - Enhanced subscription renewal reliability to ensure delayed payment notifications never interrupt active matchday accounts.

## [1.6.1] - 2026-10-25

### Fixed
- **Coach Subscription & Entitlement Preservation**: Fixed an issue where completing or syncing the setup wizard could reset coach subscription details and entitlement badges on the user account.

## [1.6.0] - 2026-10-25

### Added
- **Interactive New Coach Setup Wizard & Guided Feature Tour** ([#28](https://github.com/rossdevereux/team-organiser/issues/28)):
  - New coaches are now greeted with a streamlined, 3-step setup wizard to get matchday-ready in under 60 seconds.
  - **1-Tap FA Match Presets:** Quickly choose 5v5 (U7/U8), 7v7 (U9/U10), or 9v9 (U11/U12) with pre-configured period lengths and 50%+ equal game time thresholds built right in.
  - **3 Squad Setup Options:** Instant 1-click Demo squad loader (10 players), quick single-player form, or bulk CSV spreadsheet file drop.
  - **Guided Spotlight Tour:** Walk through your first lineup with a spotlight highlighting the substitute bench, 1-tap Auto-Balance button, tactical pitch formation, and Fair Play minutes gauge.
  - **Replay Setup Anytime:** Replay the setup wizard and guided tour whenever you need from your account menu or the Coach User Guide page.

### Fixed
- **Desktop Header & Laptop Layout Refinements** ([#32](https://github.com/rossdevereux/team-organiser/issues/32)):
  - Fixed tab label concatenation in the secondary navigation bar; the tab now cleanly reads **Rotation Matrix** across all match formats and languages instead of merging period prefixes (e.g. `2-HalfRotation Matrix`).
  - Resolved header overcrowding and overlapping controls on laptop viewports ($1024\text{px}$, $1280\text{px}$, and $1366\text{px}$) by collapsing secondary action labels into sleek icon buttons (`Live Match`, `Share / Export`, and compact `Pro` trial badge).
  - Ensured long team names and opponent names truncate gracefully with ellipsis inside the header breadcrumb pill (`[ Team › Match ▾ ]`) so they never collide with right-side action buttons.
  - Expanded widescreen desktop header spacing up to $1700\text{px}$ on high-resolution displays ($1920\text{px}$ HD), providing generous breathing room across all controls.
- **Touchline Mobile Experience & Modal Bottom-Sheet Ergonomics** ([#31](https://github.com/rossdevereux/team-organiser/issues/31)):
  - Redesigned dialogs and modals (Suggested Substitutions, Matchday Squad Selector, Score & Scorers, and Sign In) to open as native bottom-sheets on smartphones with easy swipeable gestures and rounded corners.
  - Fixed an issue where the bottom action button covered the last substitution card on smaller screens; modal lists now scroll smoothly with dedicated clearance above sticky footers.
  - Large touch targets ($\ge 44\text{px}$) across all close icons, score adjusters, and period buttons make touchline management easy even with cold or wet hands.
  - The Rotation Matrix now pins player names on the left while swiping through periods, and includes a **Period Cards** view toggle on mobile to easily review period rosters as cards.
  - Hardened the tactical 2D pitch display so player cards and names never overlap or get crushed on compact phone screens.

## [1.5.2] - 2026-10-25

### Fixed
- **Mobile Header & Navigation Bar Responsiveness** ([#30](https://github.com/rossdevereux/team-organiser/issues/30)):
  - Redesigned the top header for mobile and touchline phone screens so team names, subscription badges, and the coach User Menu never overflow or get pushed off-screen.
  - Team switcher automatically collapses to a compact button displaying your active team name with ellipsis truncation on smaller screens.
  - Navigation tabs (Lineup, Matrix, Fair Play Minutes, Awards, Squad, Fixtures, etc.) swipe smoothly with horizontal touch scrolling and an edge fade cue indicating scrollable tabs without horizontal page wobble.

## [1.5.1] - 2026-10-24

### Fixed
- **Season Presentation Day Awards Sheet Printing**: Resolved an issue where an extra solid dark full-page rectangle appeared at the beginning of print previews and PDF exports before the awards sheet. Printing now starts directly on a clean, single-page presentation certificate.

## [1.5.0] - 2026-10-24

### Added
- **Continuous Lineups & In-Game Rolling Substitutions** ([#25](https://github.com/rossdevereux/team-organiser/issues/25)):
  - Coaches can now keep the starting 7 players on the pitch across half-time without auto-rotation scrambling the squad at the break.
  - Set custom in-game substitution intervals (e.g. rolling changes every 12.5 minutes) with pro-rated playing time equity calculated automatically.
  - Customise substitution timing per fixture in the Edit Fixture dialog (e.g. cup halves vs league quarters) without changing global club settings.
  - Live match screen provides audio alerts and 1-tap touchline substitution prompts when your scheduled substitution window arrives.
  - Printable team sheets and WhatsApp messages now clearly list planned in-game rolling substitutions and estimated player minutes.

### Fixed
- **Season Presentation Day Awards Sheet Printing** ([#26](https://github.com/rossdevereux/team-organiser/issues/26)):
  - Resolved an issue where clicking "Print / Save PDF" in the Season Presentation & Awards Sheet dialog rendered a blank or solid dark sheet in browser print previews.
- **Team Settings Modal Scrolling & Save Button Visibility** ([#29](https://github.com/rossdevereux/team-organiser/issues/29)):
  - Redesigned the Team & Match Settings dialog with a scrollable settings window and pinned footer buttons.
  - The "Save Changes" and "Cancel" buttons are now always visible and accessible on laptops, tablets, and phones without needing to scroll past the bottom of the page.

## [1.4.0] - 2026-10-24

### Added
- **Pitchside Performance & Latency Telemetry** ([#24](https://github.com/rossdevereux/team-organiser/issues/24)):
  - Added Firebase Performance Monitoring to benchmark core matchday operations (including auto-rotations, touchline substitutions, CSV roster parsing, and season dashboard loading) to ensure fast, stutter-free performance on mobile devices pitchside.
- **Matchday Adoption Telemetry & Analytics** ([#23](https://github.com/rossdevereux/team-organiser/issues/23)):
  - Added privacy-safe Google Analytics (GA4) integration via Firebase Analytics to track core grassroots usage (such as auto-rotations run, pitchside stopwatches started, WhatsApp team sheets shared, and roster CSV imports) with zero child personal data collected.
- **Automated Sunday Morning Coach User Journey Tests**: Added automated real-user journeys testing squad onboarding, matchday rotation planning, pitchside live match tracking, fair play equity math, and multi-team isolation on desktop and mobile.

### Fixed
- **Fractional Match Period Durations**: You can now schedule match periods with fractional minutes (such as 12.5 minutes for FA Under-10 four-quarter formats) without form validation errors.
- **Goalkeeper Lock Persistence**: Fixed an issue where locking a player as a fixed goalkeeper during player creation wasn't saved immediately.
- **Scrollable Team Switcher**: Teams dropdown menu in the top bar now scrolls smoothly when managing multiple club squads.
- **Match Status Completion**: Finalizing live match scores cleanly records match completion and updates season statistics without requiring page reloads.

## [1.3.0] - 2026-10-24

### Added
- **Team Dashboard, Season Leaderboards & Presentation Day Awards** ([#17](https://github.com/rossdevereux/team-organiser/issues/17)):
  - Added an all-in-one Team Dashboard tab to track season performance, achievements, and player development.
  - **Golden Boot Leaderboard:** Celebrates top squad scorers with gold, silver, and bronze rankings, goals-per-match ratios, and hat-trick badges (⚽⚽⚽).
  - **Player of the Match (POTM) Tracker:** Ranks squad POTM recipients with star honors and tracks latest award match opponents.
  - **The Wall (Defensive Recognition):** Celebrates defenders and goalkeepers equally by tracking clean sheets achieved on pitch, defensive playing minutes, and shutout percentages.
  - **Positional Versatility Breakdown:** Visual color-coded distribution showing time spent in Goalkeeper (🧤), Defence (🛡️), Midfield (⚡), and Attack (🎯), plus designated goalkeeper coverage metrics.
  - **Milestone & Badge Celebrations:** Auto-calculates milestone awards including Appearance Clubs (10, 25, 50 matches), Safe Hands (3+ clean sheets for keepers), First Goal Hero, and Ever-Present attendance.
  - **Print Presentation Day Awards Sheet:** Generate an official presentation day certificate and season summary suitable for printing or PDF export on end-of-season awards night.

## [1.2.0] - 2026-10-24

### Added
- **Comprehensive Coach User Guide & Help Center**:
  - Added an in-app Coach User Guide accessible from the top navigation bar and account menu ([#22](https://github.com/rossdevereux/team-organiser/issues/22)).
  - Includes step-by-step guides for Sunday morning matchday preparation, FA youth match formats (5v5 to 11v11), fair-play auto-rotation calculations, pitchside stopwatch controls, mid-match injuries, and referee team sheet exports.
  - Features quick topic search, interactive table of contents, and print-friendly formatting for offline reference.
- **Complimentary "Free for Life" Lifetime Status**:
  - Club Owners can now grant permanent "Free for Life" status to individual coaches from the Admin Portal.
  - Coaches with Free for Life access enjoy perpetual active access to all features with no trial expiration or recurring fees.
- **30-Day Free Trial & SubShuffle Pro Billing**:
  - New coaches automatically receive an automatic, credit-card-free 30-day trial upon registering to try out automatic rotations on real matchdays ([#6](https://github.com/rossdevereux/team-organiser/issues/6)).
  - Top navigation now features an active trial countdown pill showing your remaining trial days with color indicators.
  - Added a Billing & Plan section in Team Settings to manage subscriptions, view renewal dates, and access VAT invoices in the Stripe Customer Portal.
  - No Hostage Data guarantee: if your trial ends, you retain permanent free access to view match lineups, minutes stats, and export pitch sheets.

### Changed
- **Grassroots Infrastructure Pricing**:
  - Transparent cost-recovery pricing: Coach Monthly at **£1.50/month** or Coach Annual at **£15.00/year** (~£1.25/month), strictly covering server and cloud infrastructure expenses.

## [1.1.9] - 2026-10-24

### Added
- **Dynamic Sub Rebalancer for Mid-Match Injuries & Early Departures**:
  - Touchline emergency substitution action: tap "Injured / Left Early" on any active player badge or bench card to immediately bring on a bench substitute ([#18](https://github.com/rossdevereux/team-organiser/issues/18)).
  - Departing players are automatically locked out of all remaining quarters or halves.
  - The rotation engine automatically rebalances future periods across remaining healthy squad members, prioritizing players with the lowest pitch time to protect the FA 50%+ rule.
  - Playing minutes for departed players are frozen at their exact minute of exit for accurate Fair Play tracking.

## [1.1.8] - 2026-10-18

### Fixed
- **Offline Service Worker Caching Error**:
  - Fixed a browser console error (`Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported`) that occurred when submitting forms, saving match data, or signing in.

### Improved
- **Bandwidth-Saving Live Match Synchronization**:
  - Live match tracking now uses a lightweight heartbeat status check that transfers 95% less mobile data pitchside, saving phone battery and mobile data allowances ([#16](https://github.com/rossdevereux/team-organiser/issues/16)).
  - Live status polling automatically pauses when you lock your phone or switch to another app, and resumes instantly when returning to the app.
  - Polling automatically stops once a match is marked completed.

## [1.1.7] - 2026-10-18

### Fixed
- **Fair Play & Minutes Tracker Sync with Logged Match Time**:
  - Recording match time or finalising scores now immediately updates player season totals and the Fair Play & Minutes tracker without needing to refresh your browser ([#15](https://github.com/rossdevereux/team-organiser/issues/15)).
  - The Fair Play tracker now accurately displays each player's total match minutes, percentage of available team game time, and status badges (`Balanced` vs `Below Target`) based on recorded playing time.

## [1.1.6] - 2026-10-18

### Added
- **Real-Time Pitchside Stopwatch & Substitution Sync**:
  - The live match stopwatch and period timer now automatically sync with the cloud. If your phone loses battery, you refresh your browser, or you switch apps on the touchline, the match timer and active half resume seamlessly at the exact second without losing any progress.
  - Substitutions made during a match now log and save immediately to the cloud with exact timestamps, keeping co-coaches viewing from other devices completely in sync.

## [1.1.5] - 2026-10-18

### Added
- **Email-Proof Assistant Coach Sharing**:
  - When inviting a co-coach, SubShuffle now links their permanent account ID rather than just their email address. If an assistant coach changes their email address in the future, they will automatically retain access to shared team squads and matchdays.
  - You can now see which assistant coaches have access to your team squads, whether their account is linked or pending first sign-in, and revoke access at any time.

## [1.1.4] - 2026-10-18

### Added
- **Multi-Language Support Across All Screens**: SubShuffle is now fully translated into English, Spanish (Español), French (Français), and German (Deutsch) across all sections, including the tactical pitch, substitutions bench, squad roster, match matrix, fixture manager, fair play stats, and the substitution calculator ([#7](https://github.com/rossdevereux/team-organiser/issues/7)).

### Improved
- **Revamped Sign-In Screen**: Enhanced the login and account registration dialog with larger, easy-to-read forms and touch-friendly buttons on mobile phones and desktop screens.

### Fixed
- **Team Data Isolation When Switching Teams**: Resolved an issue where players and fixtures from your primary team remained visible after creating or switching to a secondary team. Switching teams now immediately loads only that team's roster and schedule, showing a clean empty state for newly created squads ([#13](https://github.com/rossdevereux/team-organiser/issues/13)).

## [1.1.3] - 2026-10-18

### Added
- **Equal Playing Time Calculator**: A free public calculator to plan halves and quarter splits for 5v5, 7v7, 9v9, and 11v11 youth matches without needing to log in.
- **WhatsApp Match Previews**: Clean social preview cards displaying the pitch lineup and app title when sharing SubShuffle links in WhatsApp or text messages.
- **FA Youth Rules Guide**: Dedicated reference guide covering FA pitch formats, match lengths, ball sizes, and equal game time rules by age group.
- **Features Showcase**: Explore all SubShuffle tools, offline matchday features, and lineup capabilities in one place.
- **Email & Facebook Login**: Create an account and sign in using your email address and password, or connect via Facebook, in addition to Google Sign-In.
- **Password Reset**: Easily request a password reset email if you forget your login credentials.

### Improved
- **Faster Public Page Loading**: Enhanced page loading speeds and streamlined navigation so coaches on mobile devices can access match resources instantly.

## [1.1.2] - 2026-10-18

### Improved
- **Platform Maintenance**: Routine platform synchronization and performance improvements across devices.

## [1.1.1] - 2026-10-17

### Added
- **Coach Release Notes**: Simplified release notes without technical jargon to help you quickly see what is new.

### Improved
- **Menu Bar & Navigation**: Consolidated user controls into a single avatar profile menu and combined export options into one dropdown to save screen space on mobile.
- **Matchday Pitch Controls**: Moved halves, formation selectors, and auto-balance directly above the pitch view for faster matchday adjustments.
- **Simplified Footer Bar**: Streamlined the bottom bar to focus on quick settings and version information.

### Fixed
- **Admin User Invites**: Resolved an issue where newly invited coaches did not show up immediately in the team directory.

## [1.1.0] - 2026-10-17

### Added
- **Match Scores & Goal Scorers**: Record live and full-time scores, track goal scorers, and monitor season goal tallies.
- **Visual Release Notes**: Easily browse what is new, improved, or fixed across all versions directly in the app.
- **Matchday Position Locks**: Lock goalkeepers or defenders in position for a specific match while keeping fair rotations for outfielders.

### Improved
- **Equal Game Time Engine**: Enhanced substitution recommendations so locked players stay on the pitch while everyone else rotates fairly.

### Fixed
- **Team Privacy & Access**: Ensured coaches and team admins only view their own squads and match schedules.

## [1.0.0] - 2026-10-12

### Added
- **Fair Play Rotation Planner**: Automatically generate balanced youth football lineups ensuring equal pitch time for every child.
- **Interactive 2D Football Pitch**: Visualise match formations across 5-a-side, 7-a-side, 9-a-side, and 11-a-side formats.
- **Full-Season Rotation Matrix**: Inspect match participation across the entire season and export cards directly to WhatsApp.
- **Player Absence Tracker**: Mark player holidays and absences to prevent scheduling unavailable players.
- **Tactical Substitution Assistant**: Get smart recommendations during matches to rotate substitutes without breaking fair play rules.
