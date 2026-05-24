// Pregame — schedule data
// 48 teams, 104 matches (72 group stage + 32 knockout).
//
// IMPORTANT: Team-to-group assignments and per-match details (kickoff times,
// broadcasts) reflect best-effort reconstruction of the FIFA 2026 schedule.
// Verify all entries against fifa.com before public launch. Knockout teams
// resolve as group stage finishes June 24-26, 2026.
//
// Time format: ISO 8601 with venue UTC offset. Mexico = -06:00 (no DST),
// US Eastern = -04:00 (EDT), Central = -05:00 (CDT), Pacific = -07:00 (PDT).

const TEAMS = {
  // Hosts
  USA: { name: 'USA', flag: '🇺🇸' },
  MEX: { name: 'Mexico', flag: '🇲🇽' },
  CAN: { name: 'Canada', flag: '🇨🇦' },
  // UEFA
  ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  FRA: { name: 'France', flag: '🇫🇷' },
  ESP: { name: 'Spain', flag: '🇪🇸' },
  ITA: { name: 'Italy', flag: '🇮🇹' },
  GER: { name: 'Germany', flag: '🇩🇪' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  BEL: { name: 'Belgium', flag: '🇧🇪' },
  CRO: { name: 'Croatia', flag: '🇭🇷' },
  SUI: { name: 'Switzerland', flag: '🇨🇭' },
  DEN: { name: 'Denmark', flag: '🇩🇰' },
  SWE: { name: 'Sweden', flag: '🇸🇪' },
  POL: { name: 'Poland', flag: '🇵🇱' },
  AUT: { name: 'Austria', flag: '🇦🇹' },
  NOR: { name: 'Norway', flag: '🇳🇴' },
  // CONMEBOL
  BRA: { name: 'Brazil', flag: '🇧🇷' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  PAR: { name: 'Paraguay', flag: '🇵🇾' },
  // CONCACAF
  CRC: { name: 'Costa Rica', flag: '🇨🇷' },
  PAN: { name: 'Panama', flag: '🇵🇦' },
  JAM: { name: 'Jamaica', flag: '🇯🇲' },
  HON: { name: 'Honduras', flag: '🇭🇳' },
  // AFC
  JPN: { name: 'Japan', flag: '🇯🇵' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
  IRN: { name: 'Iran', flag: '🇮🇷' },
  KSA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  IRQ: { name: 'Iraq', flag: '🇮🇶' },
  UZB: { name: 'Uzbekistan', flag: '🇺🇿' },
  UAE: { name: 'UAE', flag: '🇦🇪' },
  // CAF
  MAR: { name: 'Morocco', flag: '🇲🇦' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  TUN: { name: 'Tunisia', flag: '🇹🇳' },
  ALG: { name: 'Algeria', flag: '🇩🇿' },
  EGY: { name: 'Egypt', flag: '🇪🇬' },
  NGA: { name: 'Nigeria', flag: '🇳🇬' },
  CIV: { name: 'Ivory Coast', flag: '🇨🇮' },
  GHA: { name: 'Ghana', flag: '🇬🇭' },
  CMR: { name: 'Cameroon', flag: '🇨🇲' },
  // OFC
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  // Playoff winners (placeholder)
  PO1: { name: 'Playoff Winner 1', flag: '🏳️' },
  PO2: { name: 'Playoff Winner 2', flag: '🏳️' },
};

// Group assignments. 12 groups × 4 teams.
const GROUPS = {
  A: ['MEX', 'KOR', 'CMR', 'SWE'],
  B: ['CAN', 'ECU', 'TUN', 'CRO'],
  C: ['USA', 'JAM', 'KSA', 'IRN'],
  D: ['ARG', 'PAR', 'IRQ', 'NOR'],
  E: ['ENG', 'CRC', 'EGY', 'JPN'],
  F: ['ESP', 'POL', 'NZL', 'ITA'],
  G: ['BRA', 'PAN', 'NGA', 'BEL'],
  H: ['FRA', 'AUS', 'GHA', 'AUT'],
  I: ['GER', 'HON', 'CIV', 'URU'],
  J: ['POR', 'UAE', 'COL', 'DEN'],
  K: ['NED', 'PO1', 'MAR', 'SUI'],
  L: ['SEN', 'UZB', 'ALG', 'PO2'],
};

// Helper: build a group match. dateStr = 'YYYY-MM-DD', kickoff = 'HH:MM' (24-h),
// offset = '-06:00' / '-05:00' / '-04:00' / '-07:00' (venue UTC offset).
function gm(num, dateStr, kickoff, offset, venue, city, group, slotA, slotB, broadcast) {
  return {
    num,
    date: dateStr,
    kickoffISO: `${dateStr}T${kickoff}:00${offset}`,
    venue,
    city,
    stage: 'group',
    group,
    teamA: { code: GROUPS[group][slotA - 1] },
    teamB: { code: GROUPS[group][slotB - 1] },
    broadcast,
  };
}

// Helper: build a knockout match with placeholder teams.
function km(num, dateStr, kickoff, offset, venue, city, stage, placeholderA, placeholderB, broadcast) {
  return {
    num,
    date: dateStr,
    kickoffISO: `${dateStr}T${kickoff}:00${offset}`,
    venue,
    city,
    stage,
    group: null,
    teamA: { placeholder: placeholderA },
    teamB: { placeholder: placeholderB },
    broadcast,
  };
}

const FOX = ['FOX'];
const FOXT = ['FOX', 'Telemundo'];
const FS1 = ['FS1'];
const FS1T = ['FS1', 'Telemundo'];

const MATCHES = [
  // Opening day
  gm(1, '2026-06-11', '12:00', '-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'A', 1, 2, FOXT),
  // June 12
  gm(2, '2026-06-12', '12:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'B', 1, 2, FOX),
  gm(3, '2026-06-12', '15:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 1, 2, FOXT),
  gm(4, '2026-06-12', '18:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 1, 2, FOX),
  // June 13
  gm(5, '2026-06-13', '12:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'E', 1, 2, FOX),
  gm(6, '2026-06-13', '15:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'F', 1, 2, FOXT),
  gm(7, '2026-06-13', '18:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'G', 1, 2, FOX),
  gm(8, '2026-06-13', '21:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'H', 1, 2, FOX),
  // June 14
  gm(9, '2026-06-14', '12:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'I', 1, 2, FOX),
  gm(10, '2026-06-14', '15:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'J', 1, 2, FOXT),
  gm(11, '2026-06-14', '18:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'K', 1, 2, FOX),
  gm(12, '2026-06-14', '21:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'L', 1, 2, FOXT),
  // June 15
  gm(13, '2026-06-15', '12:00', '-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'A', 3, 4, FOX),
  gm(14, '2026-06-15', '15:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'B', 3, 4, FOX),
  gm(15, '2026-06-15', '18:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 3, 4, FOXT),
  gm(16, '2026-06-15', '21:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 3, 4, FOX),
  // June 16
  gm(17, '2026-06-16', '12:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'E', 3, 4, FOX),
  gm(18, '2026-06-16', '15:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'F', 3, 4, FOX),
  gm(19, '2026-06-16', '18:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'G', 3, 4, FOX),
  gm(20, '2026-06-16', '21:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'H', 3, 4, FOX),
  // June 17
  gm(21, '2026-06-17', '12:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'I', 3, 4, FOX),
  gm(22, '2026-06-17', '15:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'J', 3, 4, FOX),
  gm(23, '2026-06-17', '18:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'K', 3, 4, FOX),
  gm(24, '2026-06-17', '21:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'L', 3, 4, FOX),
  // June 18 (Round 2 starts)
  gm(25, '2026-06-18', '12:00', '-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'A', 1, 3, FOXT),
  gm(26, '2026-06-18', '15:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'B', 1, 3, FOX),
  gm(27, '2026-06-18', '18:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 1, 3, FOXT),
  gm(28, '2026-06-18', '21:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 1, 3, FOX),
  // June 19
  gm(29, '2026-06-19', '12:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'E', 1, 3, FOX),
  gm(30, '2026-06-19', '15:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'F', 1, 3, FOX),
  gm(31, '2026-06-19', '18:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'G', 1, 3, FOX),
  gm(32, '2026-06-19', '21:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'H', 1, 3, FOX),
  // June 20
  gm(33, '2026-06-20', '12:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'I', 1, 3, FOX),
  gm(34, '2026-06-20', '15:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'J', 1, 3, FOX),
  gm(35, '2026-06-20', '18:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'K', 1, 3, FOX),
  gm(36, '2026-06-20', '21:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'L', 1, 3, FOX),
  // June 21
  gm(37, '2026-06-21', '12:00', '-06:00', 'Estadio Akron', 'Guadalajara, MEX', 'A', 2, 4, FOX),
  gm(38, '2026-06-21', '15:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'B', 2, 4, FOX),
  gm(39, '2026-06-21', '18:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 2, 4, FOXT),
  gm(40, '2026-06-21', '21:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 2, 4, FOX),
  // June 22
  gm(41, '2026-06-22', '12:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'E', 2, 4, FOX),
  gm(42, '2026-06-22', '15:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'F', 2, 4, FOX),
  gm(43, '2026-06-22', '18:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'G', 2, 4, FOX),
  gm(44, '2026-06-22', '21:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'H', 2, 4, FOX),
  // June 23
  gm(45, '2026-06-23', '12:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'I', 2, 4, FOX),
  gm(46, '2026-06-23', '15:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'J', 2, 4, FOX),
  gm(47, '2026-06-23', '18:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'K', 2, 4, FOX),
  gm(48, '2026-06-23', '21:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'L', 2, 4, FOX),
  // June 24 — Round 3 (simultaneous kickoffs per group)
  gm(49, '2026-06-24', '12:00', '-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'A', 1, 4, FOXT),
  gm(50, '2026-06-24', '12:00', '-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'A', 2, 3, FOX),
  gm(51, '2026-06-24', '16:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'B', 1, 4, FOX),
  gm(52, '2026-06-24', '16:00', '-04:00', 'BC Place', 'Vancouver, CAN', 'B', 2, 3, FOX),
  gm(53, '2026-06-24', '20:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 1, 4, FOXT),
  gm(54, '2026-06-24', '20:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'C', 2, 3, FOX),
  // June 25
  gm(55, '2026-06-25', '12:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 1, 4, FOX),
  gm(56, '2026-06-25', '12:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'D', 2, 3, FOX),
  gm(57, '2026-06-25', '16:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'E', 1, 4, FOX),
  gm(58, '2026-06-25', '16:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'E', 2, 3, FOX),
  gm(59, '2026-06-25', '20:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'F', 1, 4, FOX),
  gm(60, '2026-06-25', '20:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'F', 2, 3, FOX),
  // June 26
  gm(61, '2026-06-26', '12:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'G', 1, 4, FOXT),
  gm(62, '2026-06-26', '12:00', '-07:00', 'BC Place', 'Vancouver, CAN', 'G', 2, 3, FOX),
  gm(63, '2026-06-26', '16:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'H', 1, 4, FOX),
  gm(64, '2026-06-26', '16:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'H', 2, 3, FOX),
  gm(65, '2026-06-26', '20:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'I', 1, 4, FOX),
  gm(66, '2026-06-26', '20:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'I', 2, 3, FOX),
  // June 27
  gm(67, '2026-06-27', '12:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'J', 1, 4, FOX),
  gm(68, '2026-06-27', '12:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'J', 2, 3, FOX),
  gm(69, '2026-06-27', '16:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'K', 1, 4, FOX),
  gm(70, '2026-06-27', '16:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'K', 2, 3, FOX),
  gm(71, '2026-06-27', '20:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'L', 1, 4, FOXT),
  gm(72, '2026-06-27', '20:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'L', 2, 3, FOX),

  // Round of 32 (June 28 - July 2)
  km(73, '2026-06-28', '12:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'R32', 'Winner Group A', 'Best 3rd: C/D/E', FOXT),
  km(74, '2026-06-28', '16:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'R32', 'Winner Group B', 'Runner-up Group F', FOX),
  km(75, '2026-06-28', '20:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'R32', 'Winner Group C', 'Best 3rd: A/B/F', FOXT),
  km(76, '2026-06-29', '12:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'R32', 'Winner Group D', 'Best 3rd: B/E/F', FOX),
  km(77, '2026-06-29', '16:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'R32', 'Winner Group E', 'Runner-up Group I', FOX),
  km(78, '2026-06-29', '20:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'R32', 'Winner Group F', 'Runner-up Group D', FOX),
  km(79, '2026-06-30', '12:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'R32', 'Winner Group G', 'Best 3rd: H/I/L', FOXT),
  km(80, '2026-06-30', '16:00', '-04:00', 'BMO Field', 'Toronto, CAN', 'R32', 'Winner Group H', 'Runner-up Group C', FOX),
  km(81, '2026-06-30', '20:00', '-07:00', 'Lumen Field', 'Seattle, USA', 'R32', 'Winner Group I', 'Best 3rd: G/H/J', FOX),
  km(82, '2026-07-01', '12:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'R32', 'Winner Group J', 'Runner-up Group K', FOX),
  km(83, '2026-07-01', '16:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'R32', 'Winner Group K', 'Runner-up Group J', FOX),
  km(84, '2026-07-01', '20:00', '-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'R32', 'Winner Group L', 'Best 3rd: I/J/K', FOXT),
  km(85, '2026-07-02', '12:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'R32', 'Runner-up Group A', 'Runner-up Group B', FOX),
  km(86, '2026-07-02', '16:00', '-07:00', 'BC Place', 'Vancouver, CAN', 'R32', 'Runner-up Group E', 'Runner-up Group H', FOX),
  km(87, '2026-07-02', '20:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'R32', 'Runner-up Group G', 'Runner-up Group L', FOX),
  km(88, '2026-07-02', '20:00', '-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'R32', 'Best 3rd: A/F/L', 'Best 3rd: D/E/J', FOX),

  // Round of 16 (July 3 - July 7)
  km(89, '2026-07-03', '12:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'R16', 'Winner 73', 'Winner 74', FOXT),
  km(90, '2026-07-03', '16:00', '-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'R16', 'Winner 75', 'Winner 76', FOX),
  km(91, '2026-07-04', '12:00', '-04:00', 'Gillette Stadium', 'Boston, USA', 'R16', 'Winner 77', 'Winner 78', FOX),
  km(92, '2026-07-04', '16:00', '-05:00', 'NRG Stadium', 'Houston, USA', 'R16', 'Winner 79', 'Winner 80', FOX),
  km(93, '2026-07-05', '12:00', '-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'R16', 'Winner 81', 'Winner 82', FOX),
  km(94, '2026-07-05', '16:00', '-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'R16', 'Winner 83', 'Winner 84', FOXT),
  km(95, '2026-07-06', '16:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'R16', 'Winner 85', 'Winner 86', FOX),
  km(96, '2026-07-07', '16:00', '-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'R16', 'Winner 87', 'Winner 88', FOX),

  // Quarterfinals (July 9 - July 11)
  km(97, '2026-07-09', '16:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'QF', 'Winner 89', 'Winner 90', FOXT),
  km(98, '2026-07-10', '16:00', '-07:00', "Levi's Stadium", 'San Francisco, USA', 'QF', 'Winner 91', 'Winner 92', FOX),
  km(99, '2026-07-10', '20:00', '-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'QF', 'Winner 93', 'Winner 94', FOX),
  km(100, '2026-07-11', '16:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', 'QF', 'Winner 95', 'Winner 96', FOXT),

  // Semifinals (July 14 - July 15)
  km(101, '2026-07-14', '16:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'SF', 'Winner 97', 'Winner 98', FOXT),
  km(102, '2026-07-15', '16:00', '-04:00', 'AT&T Stadium', 'Dallas, USA', 'SF', 'Winner 99', 'Winner 100', FOXT),

  // 3rd place (July 18)
  km(103, '2026-07-18', '12:00', '-04:00', 'Hard Rock Stadium', 'Miami, USA', '3rd', 'Loser 101', 'Loser 102', FOXT),

  // Final (July 19)
  km(104, '2026-07-19', '15:00', '-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'F', 'Winner 101', 'Winner 102', FOXT),
];

// Expose to window for schedule.js
window.WC26_DATA = { TEAMS, GROUPS, MATCHES };
