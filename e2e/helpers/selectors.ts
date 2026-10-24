export const Selectors = {
  // Navigation Bar & Links
  navbar: {
    brandLink: 'header a[title*="SubShuffle Lineup Planner"]',
    teamSwitcherBtn: 'button[data-testid="team-switcher-button"]',
    fixtureSwitcherBtn: 'button[data-testid="fixture-switcher-button"]',
    userMenuBtn: 'button[data-testid="user-menu-button"]',
    settingsMenuItem: 'button[data-testid="settings-menu-item"]',
    shareExportBtn: 'button[data-testid="share-export-button"]',
    whatsappExportItem: 'button[data-testid="whatsapp-export-item"]',
    printExportItem: 'button[data-testid="print-export-item"]',
    liveMatchBtn: 'header button[title*="Pitchside stopwatch"], button[title*="Live Match"]',
    tabs: {
      lineup: 'nav a[role="button"]:has-text("Lineup")',
      matrix: 'nav a[role="button"]:has-text("Matrix")',
      stats: 'nav a[role="button"]:has-text("Fair Play"), nav a[role="button"]:has-text("Stats")',
      dashboard: 'nav a[role="button"]:has-text("Awards"), nav a[role="button"]:has-text("Dashboard")',
      squad: 'nav a[role="button"]:has-text("Squad")',
      fixtures: 'nav a[role="button"]:has-text("Fixtures")',
      teams: 'nav a[role="button"]:has-text("Teams")',
      admin: 'nav a[role="button"]:has-text("Admin")',
      guide: 'nav a[role="button"]:has-text("Guide")',
    },
  },

  // Team Settings Modal
  settingsModal: {
    dialog: 'div.fixed.inset-0:has-text("Team & League Settings")',
    pitchPlayersSelect: 'div.fixed.inset-0:has-text("Team & League Settings") select:first-of-type',
    squadCapInput: 'div.fixed.inset-0:has-text("Team & League Settings") input[type="number"]:first-of-type',
    matchPeriodsSelect: 'div.fixed.inset-0:has-text("Team & League Settings") select:nth-of-type(2)',
    periodDurationInput: 'div.fixed.inset-0:has-text("Team & League Settings") input[type="number"][step="0.5"]',
    targetGameTimeInput: 'div.fixed.inset-0:has-text("Team & League Settings") input[type="number"][min="40"]',
    saveBtn: 'div.fixed.inset-0:has-text("Team & League Settings") button[type="submit"]',
    closeBtn: 'div.fixed.inset-0:has-text("Team & League Settings") button:has(.lucide-x)',
  },

  // Squad Management Tab
  squad: {
    addPlayerBtn: 'button:has-text("Add Player")',
    importCsvBtn: 'button:has-text("Import CSV")',
    exportCsvBtn: 'button:has-text("Export CSV")',
    playerCard: (name: string) => `div:has(h3:text-is("${name}"))`,
    editPlayerBtn: (name: string) => `div:has(h3:text-is("${name}")) button[title="Edit player"]`,
    holidaysBtn: (name: string) => `div:has(h3:text-is("${name}")) button:has-text("Holidays"), div:has(h3:text-is("${name}")) button:has-text("Away")`,
    formModal: {
      nameInput: 'input[placeholder="e.g. Leo Davies"]',
      numberInput: 'input[placeholder="e.g. 7"]',
      saveBtn: 'form button:has-text("Save Player")',
      positionBtn: (pos: string) => `button:has-text("${pos}")`,
      fixedPositionCheckbox: 'input[type="checkbox"]',
      fixedPositionSelect: 'select:has(option[value="GK"])',
    },
    csvModal: {
      dialog: 'div.fixed.inset-0:has-text("Import Squad via CSV")',
      textarea: 'div.fixed.inset-0:has-text("Import Squad via CSV") textarea',
      importBtn: 'div.fixed.inset-0:has-text("Import Squad via CSV") button:has-text("Import")',
    },
    holidayModal: {
      dialog: 'div.fixed.inset-0:has-text("Manage Holidays & Absences")',
      singleDateInput: 'div.fixed.inset-0:has-text("Manage Holidays & Absences") input[type="date"]',
      addDateBtn: 'button:has-text("Add Day")',
      closeBtn: 'div.fixed.inset-0:has-text("Manage Holidays & Absences") button:has(.lucide-x)',
    },
  },

  // Fixtures Tab
  fixtures: {
    newFixtureBtn: 'button:has-text("Add Fixture"), button:has-text("New Fixture")',
    modal: {
      dialog: 'div.fixed.inset-0:has-text("Schedule New Fixture"), form:has-text("Add Fixture")',
      opponentInput: 'input[placeholder*="Oakridge Youth Tigers"]',
      submitBtn: 'form button:has-text("Schedule Fixture"), form button:has-text("Create Fixture"), form button:has-text("Save")',
    },
  },

  // Pitch & Lineup
  lineup: {
    reBalanceBtn: 'button[title*="Auto-balance squad across match periods"], button:has-text("Re-Balance")',
    resetSheetBtn: 'button[title*="Reset and clear all period lineups"]',
    squadButton: 'button[title*="Edit matchday squad sheet"]',
    liveMatchHeroBtn: 'button:has-text("Live Match")',
    periodButton: (p: number) => `button:has-text("Period ${p}"), button:has-text("Quarter ${p}"), button:has-text("${p === 1 ? '1st Half' : p === 2 ? '2nd Half' : 'Period ' + p}")`,
  },

  // Live Touchline Match Modal
  liveMatch: {
    modal: 'div.fixed.inset-0:has-text("Sideline Live Match")',
    startTimerBtn: 'button:has-text("Start Timer")',
    pauseTimerBtn: 'button:has-text("Pause Timer")',
    periodBtn: (p: number) => `button:has-text("Period ${p}"), button:has-text("Half ${p}")`,
    offSelect: 'select:has(option:text-matches("Outgoing Player|Select Outgoing", "i"))',
    onSelect: 'select:has(option:text-matches("Incoming Sub|Select Incoming", "i"))',
    confirmSubBtn: 'button:has-text("Confirm Substitution Now")',
    injuryBtn: 'button:has-text("Injured / Left Early Rebalance")',
    homeScorePlusBtn: 'button[aria-label="Increase home score live"]',
    scorersModalBtn: 'button:has-text("Scorers")',
    closeBtn: 'button[title*="Close live match"]',
  },

  // WhatsApp Export Modal
  whatsappModal: {
    modal: 'div.fixed.inset-0:has-text("WhatsApp")',
    announcementText: 'div.fixed.inset-0:has-text("WhatsApp") pre',
    copyBtn: 'button:has-text("Copy Team Sheet Announcement"), button:has-text("Copy")',
    closeBtn: 'div.fixed.inset-0:has-text("WhatsApp") button:has(.lucide-x), div.fixed.inset-0:has-text("WhatsApp") button:has-text("Close")',
  },
};
