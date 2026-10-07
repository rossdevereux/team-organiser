import { Formation } from '../types.js';

export const DEFAULT_FORMATIONS: Formation[] = [
  // ================= 5-a-side =================
  {
    id: '5-1-2-1',
    name: '1-2-1 Diamond',
    teamSize: 5,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF', label: 'Defender', category: 'Defence', x: 50, y: 68 },
      { code: 'MID_L', label: 'Left Wing', category: 'Midfield', x: 26, y: 46 },
      { code: 'MID_R', label: 'Right Wing', category: 'Midfield', x: 74, y: 46 },
      { code: 'ATT', label: 'Target Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '5-2-1-1',
    name: '2-1-1 Pyramid',
    teamSize: 5,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 30, y: 68 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 70, y: 68 },
      { code: 'MID', label: 'Midfield Engine', category: 'Midfield', x: 50, y: 46 },
      { code: 'ATT', label: 'Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '5-2-2',
    name: '2-2 Box',
    teamSize: 5,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 30, y: 68 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 70, y: 68 },
      { code: 'ATT_L', label: 'Left Forward', category: 'Attack', x: 32, y: 26 },
      { code: 'ATT_R', label: 'Right Forward', category: 'Attack', x: 68, y: 26 },
    ],
  },

  // ================= 7-a-side =================
  {
    id: '7-2-3-1',
    name: '2-3-1 (Standard)',
    teamSize: 7,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 28, y: 70 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 72, y: 70 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 20, y: 46 },
      { code: 'MID_C', label: 'Centre Midfield', category: 'Midfield', x: 50, y: 46 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 80, y: 46 },
      { code: 'ATT', label: 'Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '7-3-2-1',
    name: '3-2-1 (Solid Defense)',
    teamSize: 7,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 22, y: 70 },
      { code: 'DEF_C', label: 'Centre Back', category: 'Defence', x: 50, y: 72 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 78, y: 70 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 33, y: 46 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 67, y: 46 },
      { code: 'ATT', label: 'Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },
  {
    id: '7-2-2-2',
    name: '2-2-2 (Dual Strikers)',
    teamSize: 7,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 28, y: 70 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 72, y: 70 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 30, y: 46 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 70, y: 46 },
      { code: 'ATT_L', label: 'Left Forward', category: 'Attack', x: 32, y: 22 },
      { code: 'ATT_R', label: 'Right Forward', category: 'Attack', x: 68, y: 22 },
    ],
  },
  {
    id: '7-1-3-2',
    name: '1-3-2 (Attacking)',
    teamSize: 7,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_C', label: 'Sweeper / CB', category: 'Defence', x: 50, y: 72 },
      { code: 'MID_L', label: 'Left Wing', category: 'Midfield', x: 22, y: 48 },
      { code: 'MID_C', label: 'Centre Midfield', category: 'Midfield', x: 50, y: 48 },
      { code: 'MID_R', label: 'Right Wing', category: 'Midfield', x: 78, y: 48 },
      { code: 'ATT_L', label: 'Left Striker', category: 'Attack', x: 34, y: 22 },
      { code: 'ATT_R', label: 'Right Striker', category: 'Attack', x: 66, y: 22 },
    ],
  },

  // ================= 9-a-side =================
  {
    id: '9-3-3-2',
    name: '3-3-2 (Standard 9s)',
    teamSize: 9,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 22, y: 72 },
      { code: 'DEF_C', label: 'Centre Back', category: 'Defence', x: 50, y: 74 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 78, y: 72 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 22, y: 48 },
      { code: 'MID_C', label: 'Centre Midfield', category: 'Midfield', x: 50, y: 48 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 78, y: 48 },
      { code: 'ATT_L', label: 'Left Striker', category: 'Attack', x: 35, y: 22 },
      { code: 'ATT_R', label: 'Right Striker', category: 'Attack', x: 65, y: 22 },
    ],
  },
  {
    id: '9-3-2-3',
    name: '3-2-3 (Wing Play)',
    teamSize: 9,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 22, y: 72 },
      { code: 'DEF_C', label: 'Centre Back', category: 'Defence', x: 50, y: 74 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 78, y: 72 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 35, y: 50 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 65, y: 50 },
      { code: 'ATT_L', label: 'Left Wing', category: 'Attack', x: 20, y: 24 },
      { code: 'ATT_C', label: 'Centre Forward', category: 'Attack', x: 50, y: 20 },
      { code: 'ATT_R', label: 'Right Wing', category: 'Attack', x: 80, y: 24 },
    ],
  },
  {
    id: '9-4-3-1',
    name: '4-3-1 (Back Four)',
    teamSize: 9,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 18, y: 72 },
      { code: 'DEF_CL', label: 'Left Centre Back', category: 'Defence', x: 38, y: 74 },
      { code: 'DEF_CR', label: 'Right Centre Back', category: 'Defence', x: 62, y: 74 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 82, y: 72 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 25, y: 48 },
      { code: 'MID_C', label: 'Centre Midfield', category: 'Midfield', x: 50, y: 48 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 75, y: 48 },
      { code: 'ATT', label: 'Lone Striker', category: 'Attack', x: 50, y: 20 },
    ],
  },

  // ================= 11-a-side =================
  {
    id: '11-4-4-2',
    name: '4-4-2 (Classic)',
    teamSize: 11,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 18, y: 72 },
      { code: 'DEF_CL', label: 'Left Centre Back', category: 'Defence', x: 38, y: 74 },
      { code: 'DEF_CR', label: 'Right Centre Back', category: 'Defence', x: 62, y: 74 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 82, y: 72 },
      { code: 'MID_L', label: 'Left Wing', category: 'Midfield', x: 18, y: 48 },
      { code: 'MID_CL', label: 'Centre Midfield', category: 'Midfield', x: 38, y: 48 },
      { code: 'MID_CR', label: 'Centre Midfield', category: 'Midfield', x: 62, y: 48 },
      { code: 'MID_R', label: 'Right Wing', category: 'Midfield', x: 82, y: 48 },
      { code: 'ATT_L', label: 'Striker', category: 'Attack', x: 36, y: 20 },
      { code: 'ATT_R', label: 'Striker', category: 'Attack', x: 64, y: 20 },
    ],
  },
  {
    id: '11-4-3-3',
    name: '4-3-3 (Attack)',
    teamSize: 11,
    slots: [
      { code: 'GK', label: 'Goalkeeper', category: 'Goalkeeper', x: 50, y: 88 },
      { code: 'DEF_L', label: 'Left Back', category: 'Defence', x: 18, y: 72 },
      { code: 'DEF_CL', label: 'Left Centre Back', category: 'Defence', x: 38, y: 74 },
      { code: 'DEF_CR', label: 'Right Centre Back', category: 'Defence', x: 62, y: 74 },
      { code: 'DEF_R', label: 'Right Back', category: 'Defence', x: 82, y: 72 },
      { code: 'MID_L', label: 'Left Midfield', category: 'Midfield', x: 28, y: 50 },
      { code: 'MID_C', label: 'Holding Midfield', category: 'Midfield', x: 50, y: 54 },
      { code: 'MID_R', label: 'Right Midfield', category: 'Midfield', x: 72, y: 50 },
      { code: 'ATT_L', label: 'Left Wing', category: 'Attack', x: 20, y: 22 },
      { code: 'ATT_C', label: 'Centre Forward', category: 'Attack', x: 50, y: 18 },
      { code: 'ATT_R', label: 'Right Wing', category: 'Attack', x: 80, y: 22 },
    ],
  },
];

/**
 * Returns list of formations matching the team size (plus any custom formations)
 */
export const getFormationsForTeamSize = (
  teamSize: number,
  customFormations: Formation[] = []
): Formation[] => {
  const defaults = DEFAULT_FORMATIONS.filter((f) => f.teamSize === teamSize);
  const customs = customFormations.filter((f) => f.teamSize === teamSize);
  return [...defaults, ...customs];
};

/**
 * Finds a formation by id or name
 */
export const findFormation = (
  formationIdOrName: string,
  teamSize: number,
  customFormations: Formation[] = []
): Formation => {
  const all = [...DEFAULT_FORMATIONS, ...customFormations];
  const found = all.find(
    (f) =>
      (f.id === formationIdOrName || f.name === formationIdOrName) &&
      (teamSize ? f.teamSize === teamSize : true)
  );
  if (found) return found;

  // Fallback to first formation matching team size
  const matching = all.filter((f) => f.teamSize === teamSize);
  if (matching.length > 0) return matching[0];

  return DEFAULT_FORMATIONS[3]; // default 7-2-3-1
};
