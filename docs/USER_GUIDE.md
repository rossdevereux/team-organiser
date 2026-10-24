# SubShuffle Coach User Guide
### The Complete Grassroots Football Matchday Companion

Welcome to **SubShuffle**! SubShuffle is designed from the ground up for grassroots volunteer football coaches, team managers, and club secretaries. Running youth football should be about player enjoyment, technical development, and stress-free Sunday mornings — not doing frantic spreadsheet calculations in the rain on the sideline.

This guide walks you through every stage of your season, from your initial team setup to touchline substitution management and post-match FA fair-play reports.

---

## Table of Contents
- [1. Getting Started & Club Setup](#1-getting-started--club-setup)
  - [Creating Your Team](#creating-your-team)
  - [Age Groups & FA Formats](#age-groups--fa-formats)
  - [Match Rules & Duration](#match-rules--duration)
  - [Equal Playing Time Thresholds](#equal-playing-time-thresholds)
- [2. Squad & Player Management](#2-squad--player-management)
  - [Adding & Editing Players](#adding--editing-players)
  - [Positions & Fixed Goalkeepers](#positions--fixed-goalkeepers)
  - [Holiday & Availability Blackout Dates](#holiday--availability-blackout-dates)
  - [Bulk CSV Roster Import](#bulk-csv-roster-import)
- [3. Fixture Scheduling & Match Preparation](#3-fixture-scheduling--match-preparation)
  - [Adding Fixtures](#adding-fixtures)
  - [Selecting the Matchday Squad](#selecting-the-matchday-squad)
  - [WhatsApp Match Call-Up Cards](#whatsapp-match-call-up-cards)
- [4. The Fair-Play Rotation Engine](#4-the-fair-play-rotation-engine)
  - [How Auto-Rotation Works](#how-auto-rotation-works)
  - [Understanding Rotation Matrix Warnings](#understanding-rotation-matrix-warnings)
  - [Manual Touchline Swaps](#manual-touchline-swaps)
  - [Formations & Tactical Setups](#formations--tactical-setups)
- [5. Pitchside Live Match Tracking](#5-pitchside-live-match-tracking)
  - [The Pitchside Match Stopwatch](#the-pitchside-match-stopwatch)
  - [Sideline Substitution Alarms](#sideline-substitution-alarms)
  - [Mid-Match Injuries & Early Departure Rebalancing](#mid-match-injuries--early-departure-rebalancing)
  - [Logging Goals, Scorers & Awards](#logging-goals-scorers--awards)
- [6. Post-Match & Fair Play Analytics](#6-post-match--fair-play-analytics)
  - [Finalising Match Results](#finalising-match-results)
  - [Season Fair Play Equity Gauges](#season-fair-play-equity-gauges)
  - [Team Dashboard, Awards & Leaderboards](#team-dashboard-awards--leaderboards)
  - [Official Referee PDF Match Sheets](#official-referee-pdf-match-sheets)
  - [Presentation Day Awards Cards](#presentation-day-awards-cards)
  - [WhatsApp Post-Match Debrief](#whatsapp-post-match-debrief)
- [7. Administration, Roles & Subscriptions](#7-administration-roles--subscriptions)
  - [Coach & Member Roles](#coach--member-roles)
  - [Free Trial & Grassroots Pricing](#free-trial--grassroots-pricing)
  - [Complimentary Free for Life Access](#complimentary-free-for-life-access)
  - [Backups & Disaster Recovery](#backups--disaster-recovery)
- [8. Frequently Asked Questions (FAQ) & Touchline Tips](#8-frequently-asked-questions-faq--touchline-tips)

---

## 1. Getting Started & Club Setup

### Creating Your Team
When you first log in with your Google or email account, SubShuffle allows you to create your team profile under the **Teams** menu:
1. Open the **Teams** tab in the top navigation.
2. Tap **Create New Team** (or use the team dropdown in the header).
3. Enter your team name (e.g. *The Rovers FC U10s*), your club affiliation, and select your age category.

### Age Groups & FA Formats
SubShuffle automatically pre-configures standard Football Association (FA) youth football specifications based on your format:
- **5-a-side (U7 & U8):** 5 on pitch, recommended matchday squad cap of 8, standard 40-minute match (2x 20 min halves or 4x 10 min quarters).
- **7-a-side (U9 & U10):** 7 on pitch, squad cap of 10, standard 50-minute match (2x 25 min halves or 4x 12.5 min quarters).
- **9-a-side (U11 & U12):** 9 on pitch, squad cap of 12–14, standard 60-minute match (2x 30 min halves).
- **11-a-side (U13+):** 11 on pitch, squad cap of 16, standard 70–90 min match.

### Match Rules & Duration
In the **Team & League Settings** dialog (accessible via the gear icon or your profile avatar menu):
- **Match Period Count:** Choose between **2 Halves** (traditional) or **4 Quarters** (frequently used in U7–U10 leagues).
- **Period Duration:** Set the length in minutes of each half or quarter (e.g. 25 minutes per half for a 50-minute U10 fixture).
- **Default Substitution Interval:** Set an alert timer (e.g. every 10 or 12 minutes) if you prefer rolling sideline changes within each half.

### Equal Playing Time Thresholds
The FA Charter Standard and grassroots leagues mandate minimum playing time (typically at least **50% playing time across every match** for every attending player).
- In your settings, set your **Target Playing Time Equity** (default is 50%).
- SubShuffle's rotation algorithm uses this threshold to ensure no child sits on the bench for more than their fair share.

---

## 2. Squad & Player Management

### Adding & Editing Players
Manage your team roster from the **Squad** page:
1. Tap **Add Player** at the top right of the Squad view.
2. Enter the player's full name, preferred squad number (optional), and preferred positions.
3. Tap **Save Player**. The player will immediately appear in your squad list and become available for match selection.

### Positions & Fixed Goalkeepers
Every player can have general position preferences:
- **Goalkeeper (GK)**
- **Defence (CB, LB, RB)**
- **Midfield (CM, LM, RM)**
- **Attack (ST, CF)**

#### Fixed Goalkeeper Lock
Many grassroots teams have a dedicated goalkeeper who does not rotate into outfield positions, or who plays the full match in goal.
- When editing a player, toggle **Fixed Position**.
- Select **Goalkeeper (GK)** (or another position).
- When Fixed Position is enabled, the auto-rotation engine keeps this player in goal across all periods without rotating them off to the bench, redistributing outfield rotations evenly among remaining squad members.

### Holiday & Availability Blackout Dates
Parents often let coaches know weeks in advance when a player will be on holiday or unavailable for a match:
1. In the **Squad** view, click on any player card and tap **Manage Availability**.
2. Select any calendar date to mark the player as unavailable (blackout date).
3. When creating or managing a fixture on that date, SubShuffle will flag the player with an amber airplane icon, preventing accidental selection.

### Bulk CSV Roster Import
If you have an existing spreadsheet of players from your club registration:
1. Open the **Squad** tab and click **Import CSV**.
2. Download our template or upload a CSV file with columns: `Name, SquadNumber, Positions`.
3. Preview and confirm the roster — all players are created in a single click.

---

## 3. Fixture Scheduling & Match Preparation

### Adding Fixtures
Plan your season fixtures from the **Fixtures** page:
1. Tap **Add Fixture**.
2. Fill in the **Opponent**, **Venue** (Home / Away / Neutral), **Date**, and **Kick-off Time**.
3. Optionally add pitch directions, venue postcode, and meet time.

### Selecting the Matchday Squad
Not every player attends every fixture due to squad caps or illness:
1. Select your upcoming fixture from the header dropdown or Fixtures list.
2. Open the **Squad Selection** drawer.
3. Check the players who are attending the match (e.g. 10 players for a 7v7 fixture).
4. Any non-attending players are marked as **Rested**. Rested players do not accrue penalty warnings, and SubShuffle remembers who sat out so they can be prioritized for selection next Sunday.

### WhatsApp Match Call-Up Cards
Never type out Sunday morning match messages from scratch again:
1. Open your fixture and click **Share / Export** in the top navigation bar.
2. Select **WhatsApp Squad Card**.
3. SubShuffle automatically formats an emoji-rich message including:
   - Match details, date, kick-off time, and meet time.
   - Venue address and Google Maps directions link.
   - Selected matchday squad list with squad numbers.
4. Click **Copy to Clipboard** or **Open in WhatsApp** to instantly post into your team parent chat.

---

## 4. The Fair-Play Rotation Engine

### How Auto-Rotation Works
SubShuffle's core innovation is its FA-compliant **Fair-Play Auto-Rotation Engine**:
1. When you select your matchday squad, tap the green **Auto-Rotate** wand button.
2. The engine calculates an optimal mathematical matrix across all periods (Halves or Quarters):
   - **Playtime Equity:** Maximizes fair pitch minutes so all players achieve 50%+ game time.
   - **Bench Equity:** Ensures no player sits on the bench for consecutive periods.
   - **Position Balance:** Respects each child's position preferences while encouraging multi-position development.
   - **Goalkeeper Protection:** Keeps fixed goalkeepers in goal while balancing outfield roles.

### Understanding Rotation Matrix Warnings
Switch to the **Matrix** tab to view your entire match plan at a glance:
- **Green checks:** The player meets or exceeds their target 50% playing time threshold.
- **Amber warning (Low Minutes):** The player is projected to play less than the 50% target threshold. Tap the player to swap them into an additional period.
- **Red warning (Rest Streak):** A player is scheduled to sit on the bench for 2 consecutive periods. The engine flags this so you can swap them into the action.

### Manual Touchline Swaps
You always have 100% tactical control over your lineup:
- **On the Pitch View:** Click on any player on the pitch, then click any substitute on the bench (or another position on the pitch). They instantly swap positions.
- **Undo Rotation:** If you make a mistake, tap the **Undo** button in the header toolbar to revert to your previous lineup.

### Formations & Tactical Setups
SubShuffle supports all standard youth formations:
- **5-a-side:** 1-2-1, 2-1-1, 2-2.
- **7-a-side:** 2-3-1, 3-2-1, 2-2-2, 3-1-2.
- **9-a-side:** 3-3-2, 3-2-3, 4-3-1, 2-4-2.
- **11-a-side:** 4-4-2, 4-3-3, 3-5-2, 4-2-3-1.

You can also design custom formations by clicking the formation badge and dragging player slots to custom coordinates on the pitch.

---

## 5. Pitchside Live Match Tracking

### The Pitchside Match Stopwatch
On matchday morning, tap **Live Match** in the top toolbar:
- Tap **Start Period** to start the pitchside stopwatch.
- The timer runs accurately pitchside and automatically synchronizes with the cloud — if your phone battery dies, you refresh your screen, or you switch apps, the clock continues running with zero time drift.
- Tap **Pause** at any point for referee injury stoppages.

### Sideline Substitution Alarms
If you use rolling substitutions within halves (e.g. every 10 minutes):
- SubShuffle triggers a visual notification and audio alert when your substitution window opens.
- The **Suggested Subs** drawer displays exactly who is scheduled to come off and who should come on, keeping touchline panic to zero.

### Mid-Match Injuries & Early Departure Rebalancing
Grassroots football is unpredictable — a player gets injured in the 12th minute or has to leave early:
1. Tap the player token on the live pitch and select **Injured / Left Early**.
2. SubShuffle prompts you to choose which bench substitute to bring on immediately.
3. The **Dynamic Sub Rebalancer** automatically:
   - Freezes the injured player's game time at their exact exit minute.
   - Locks the departed player out of all future periods.
   - Rebalances the remaining quarters or halves across remaining fit players, prioritizing those with the fewest minutes so fair play is preserved.

### Logging Goals, Scorers & Awards
Keep track of match milestones on the touchline:
- Tap **Record Goal** to log home and away score updates.
- Assign the goal scorer and assist (optional).
- At the final whistle, designate the **Player of the Match** award.

---

## 6. Post-Match & Fair Play Analytics

### Finalising Match Results
When the match concludes:
1. Tap **Finalise Match** in the live match modal.
2. Confirm the final score line and verify that recorded substitution minutes match the touchline events.
3. Locking the match writes all player minutes directly into your team's season-long statistics.

### Season Fair Play Equity Gauges
Open the **Stats** tab at any point in the season:
- **Game Time Equity Gauge:** Displays the percentage distribution of minutes across your entire roster.
- **Fair Play Indicator:** Green indicates all squad members are within 10% of equal game time.
- **Development Chart:** Visualizes what positions each player has experienced (defence vs midfield vs attack) over the course of the campaign.

### Team Dashboard, Awards & Leaderboards
The **Team Dashboard** (accessible via the top navigation or from the Fair Play Stats view) delivers a comprehensive, season-long analytics hub designed specifically for grassroots teams:
- **Overview KPIs Ribbon:** Real-time tracking of team record (Wins, Draws, Losses), Win Rate %, Goals For / Conceded / Goal Difference, Clean Sheets count, Squad Equity Compliance %, and Average Squad Attendance.
- **Golden Boot Leaderboard:** Celebrates squad goal scorers ranked with Gold, Silver, and Bronze badges, tracking goals per match ratio and detecting hat-tricks (⚽⚽⚽).
- **Player of the Match (POTM) Tracker:** Ranks squad POTM recipients with star honors and tracks recency details (opponent and match date).
- **The Wall (Defensive Recognition):** Essential for youth football to ensure defenders and goalkeepers are celebrated equally alongside forwards. Tracks clean sheets achieved on pitch, combined defensive and goalkeeper playing minutes, and shutout rate percentage.
- **Positional Versatility Breakdown:** Visual multi-segment progress bars illustrating the exact distribution of minutes across Goalkeeper (🧤), Defence (🛡️), Midfield (⚡), and Attack (🎯), accompanied by versatility development labels (*Specialist*, *Developing*, *Versatile*, and *Total Footballer*), plus Designated Goalkeeper coverage percentage.
- **Auto-Generated Milestone Badges:** Celebrates player accomplishments such as Appearance Clubs (10, 25, 50 matches), Safe Hands (3+ clean sheets for keepers), First Goal Hero, Ever-Present (100% attendance), and team Clean Sheet streaks.

### Official Referee PDF Match Sheets
Need to submit team sheets to the league secretary or referee before kick-off?
1. Tap **Share / Export** -> **Print Team Sheet**.
2. SubShuffle formats an official FA-standard team sheet complete with starting lineup, substitutes, squad numbers, coaches, and fair play notes.
3. Print directly to a wireless printer or save as a PDF.

### Presentation Day Awards Cards
At the end of your season or for club presentation nights:
1. Open the **Team Dashboard** and tap **Print Awards Sheet**.
2. SubShuffle automatically formats an official, high-contrast Presentation Day Certificate and Season Summary including full win-loss record, Golden Boot winner, Player of the Season, The Wall defensive honors, milestone achievements, and an official coach verification line.
3. Print on A4 cardstock or save as a clean PDF record for players and parents.

### WhatsApp Post-Match Debrief
Share match highlights with parents:
- Tap **Post-Match Summary** -> **Share to WhatsApp**.
- Generates a supportive, positive debrief highlighting player effort, team play, and the Player of the Match.

---

## 7. Administration, Roles & Subscriptions

### Coach & Member Roles
SubShuffle uses zero-latency role-based security:
- **Club Owner:** Full system governance. Manage users, assign token roles, export database snapshots, and manage billing.
- **Team Coach:** Full matchday access. Create fixtures, manage squads, run auto-rotations, and track live matches.
- **Viewer / Parent:** Read-only access to view lineups, match results, and pitch sheets without editing permissions.

### Free Trial & Grassroots Pricing
- **30-Day Free Trial:** Every newly registered coach gets an automatic 30-day free trial of SubShuffle Pro with zero credit card required.
- **Grassroots Cost Recovery Pricing:**
  - **Coach Monthly:** **£1.50 / month** (flexible, cancel anytime).
  - **Coach Annual:** **£15.00 / year** (only ~£1.25/month).
  - Priced strictly to cover cloud server and database hosting costs.
- **No Hostage Data Policy:** If your subscription ends, your data is never locked. You retain permanent free access to view historical lineups, view minutes stats, and export team sheets.

### Complimentary Free for Life Access
Club Owners can grant **Free for Life** status to individual volunteer coaches directly in the **Admin Portal** under the **Users** tab. Coaches with Free for Life access enjoy perpetual active access without any recurring subscription fees.

### Backups & Disaster Recovery
In the **Admin Portal** under **Backups & Disaster Recovery**:
- Click **Export JSON Backup** to download an encrypted snapshot of all your teams, players, fixtures, and settings.
- Restore backups seamlessly onto any device.

---

## 8. Frequently Asked Questions (FAQ) & Touchline Tips

**Q: Can I use SubShuffle when there is no 4G signal at the pitch?**  
*A: Yes! SubShuffle is a Progressive Web App (PWA). Once opened, the offline service worker caches the app. You can plan rotations, run the live stopwatch, and manage substitutions completely offline. Everything synchronizes automatically once your phone reconnects to mobile data or Wi-Fi.*

**Q: What if I have an odd number of players attending?**  
*A: SubShuffle's rotation algorithm handles any squad size (e.g. 9 players for a 7v7 match). The engine splits periods to ensure all players receive equal playing time within 1 to 2 minutes of difference.*

**Q: How do I install SubShuffle as an app on my phone?**  
*A: In Safari on iOS, tap the Share icon and select **Add to Home Screen**. In Chrome on Android, tap the three dots and tap **Install App**. SubShuffle will open full-screen like a native app with zero browser address bar distractions.*

**Q: Can multiple coaches manage the same team?**  
*A: Yes. In the **Teams** tab, click **Share Team** and enter your assistant coach's email address. They will receive instant access to co-manage lineups and matchday substitutions.*

**Q: How does SubShuffle protect club and player privacy?**  
*A: SubShuffle uses role-based access tokens to ensure only authorized coaches have access to team squads. Matchday telemetry (such as anonymous feature adoption metrics like auto-rotations run and live stopwatch activations) uses Google Analytics (GA4) with zero personally identifiable child player information transmitted.*

**Q: How does SubShuffle ensure fast pitchside responsiveness on mobile devices?**  
*A: SubShuffle monitors network latency and client operations in real-time using Firebase Performance Monitoring. Core workflows like rotation calculations and live touchline substitutions are benchmarked continuously to ensure smooth performance even on low-end mobile devices and flaky touchline connections.*

---

*SubShuffle — Grassroots Football Rotations Made Fair & Stress-Free.*
