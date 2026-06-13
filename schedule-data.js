// WC26 Pregame — schedule data
// 48 teams, 104 matches (72 group stage + 32 knockout).
//
// Source: official FIFA 2026 final-draw schedule (FWC26 Match Schedule v17,
// 10 April 2026) cross-checked against Wikipedia per-group + knockout pages.
// Group match numbers are chronological (match 1 = opener). Knockout teams
// resolve as the group stage finishes (June 24-27, 2026).
//
// kickoffISO carries each venue's local UTC offset. US Eastern = -04:00 (EDT),
// Central = -05:00 (CDT), Pacific = -07:00 (PDT), Mexico = -06:00 (no DST).

const TEAMS = {
  USA: { name: 'USA', flag: '🇺🇸' },
  MEX: { name: 'Mexico', flag: '🇲🇽' },
  CAN: { name: 'Canada', flag: '🇨🇦' },
  RSA: { name: 'South Africa', flag: '🇿🇦' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
  CZE: { name: 'Czechia', flag: '🇨🇿' },
  BIH: { name: 'Bosnia & Herzegovina', flag: '🇧🇦' },
  QAT: { name: 'Qatar', flag: '🇶🇦' },
  SUI: { name: 'Switzerland', flag: '🇨🇭' },
  BRA: { name: 'Brazil', flag: '🇧🇷' },
  MAR: { name: 'Morocco', flag: '🇲🇦' },
  HAI: { name: 'Haiti', flag: '🇭🇹' },
  SCO: { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  PAR: { name: 'Paraguay', flag: '🇵🇾' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  TUR: { name: 'Türkiye', flag: '🇹🇷' },
  GER: { name: 'Germany', flag: '🇩🇪' },
  CUW: { name: 'Curaçao', flag: '🇨🇼' },
  CIV: { name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  JPN: { name: 'Japan', flag: '🇯🇵' },
  SWE: { name: 'Sweden', flag: '🇸🇪' },
  TUN: { name: 'Tunisia', flag: '🇹🇳' },
  BEL: { name: 'Belgium', flag: '🇧🇪' },
  EGY: { name: 'Egypt', flag: '🇪🇬' },
  IRN: { name: 'Iran', flag: '🇮🇷' },
  NZL: { name: 'New Zealand', flag: '🇳🇿' },
  ESP: { name: 'Spain', flag: '🇪🇸' },
  CPV: { name: 'Cabo Verde', flag: '🇨🇻' },
  KSA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  URU: { name: 'Uruguay', flag: '🇺🇾' },
  FRA: { name: 'France', flag: '🇫🇷' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  IRQ: { name: 'Iraq', flag: '🇮🇶' },
  NOR: { name: 'Norway', flag: '🇳🇴' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  ALG: { name: 'Algeria', flag: '🇩🇿' },
  AUT: { name: 'Austria', flag: '🇦🇹' },
  JOR: { name: 'Jordan', flag: '🇯🇴' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  COD: { name: 'DR Congo', flag: '🇨🇩' },
  UZB: { name: 'Uzbekistan', flag: '🇺🇿' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  CRO: { name: 'Croatia', flag: '🇭🇷' },
  GHA: { name: 'Ghana', flag: '🇬🇭' },
  PAN: { name: 'Panama', flag: '🇵🇦' },
};

// Group assignments. 12 groups × 4 teams.
const GROUPS = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

function gm(num, dateStr, kickoffISO, venue, city, group, a, b) {
  return { num, date: dateStr, kickoffISO, venue, city, stage: 'group', group,
    teamA: { code: a }, teamB: { code: b } };
}
function km(num, dateStr, kickoffISO, venue, city, stage, pa, pb) {
  return { num, date: dateStr, kickoffISO, venue, city, stage, group: null,
    teamA: { placeholder: pa }, teamB: { placeholder: pb } };
}

const MATCHES = [
  // Group stage (chronological, match 1 = opening match)
  // 2026-06-11
  gm(1, '2026-06-11', '2026-06-11T13:00:00-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'A', 'MEX', 'RSA'),
  gm(2, '2026-06-11', '2026-06-11T20:00:00-06:00', 'Estadio Akron', 'Guadalajara, MEX', 'A', 'KOR', 'CZE'),
  // 2026-06-12
  gm(3, '2026-06-12', '2026-06-12T15:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'B', 'CAN', 'BIH'),
  gm(4, '2026-06-12', '2026-06-12T18:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 'USA', 'PAR'),
  // 2026-06-13
  gm(5, '2026-06-13', '2026-06-13T12:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'B', 'QAT', 'SUI'),
  gm(6, '2026-06-13', '2026-06-13T18:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'C', 'BRA', 'MAR'),
  gm(7, '2026-06-13', '2026-06-13T21:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'C', 'HAI', 'SCO'),
  gm(8, '2026-06-13', '2026-06-13T21:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'D', 'AUS', 'TUR'),
  // 2026-06-14
  gm(9, '2026-06-14', '2026-06-14T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'E', 'GER', 'CUW'),
  gm(10, '2026-06-14', '2026-06-14T15:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'F', 'NED', 'JPN'),
  gm(11, '2026-06-14', '2026-06-14T19:00:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'E', 'CIV', 'ECU'),
  gm(12, '2026-06-14', '2026-06-14T20:00:00-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'F', 'SWE', 'TUN'),
  // 2026-06-15
  gm(13, '2026-06-15', '2026-06-15T12:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'H', 'ESP', 'CPV'),
  gm(14, '2026-06-15', '2026-06-15T12:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'G', 'BEL', 'EGY'),
  gm(15, '2026-06-15', '2026-06-15T18:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'H', 'KSA', 'URU'),
  gm(16, '2026-06-15', '2026-06-15T18:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'G', 'IRN', 'NZL'),
  // 2026-06-16
  gm(17, '2026-06-16', '2026-06-16T15:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'I', 'FRA', 'SEN'),
  gm(18, '2026-06-16', '2026-06-16T18:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'I', 'IRQ', 'NOR'),
  gm(19, '2026-06-16', '2026-06-16T20:00:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'J', 'ARG', 'ALG'),
  gm(20, '2026-06-16', '2026-06-16T21:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'J', 'AUT', 'JOR'),
  // 2026-06-17
  gm(21, '2026-06-17', '2026-06-17T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'K', 'POR', 'COD'),
  gm(22, '2026-06-17', '2026-06-17T15:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'L', 'ENG', 'CRO'),
  gm(23, '2026-06-17', '2026-06-17T19:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'L', 'GHA', 'PAN'),
  gm(24, '2026-06-17', '2026-06-17T20:00:00-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'K', 'UZB', 'COL'),
  // 2026-06-18
  gm(25, '2026-06-18', '2026-06-18T12:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'A', 'CZE', 'RSA'),
  gm(26, '2026-06-18', '2026-06-18T12:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'B', 'SUI', 'BIH'),
  gm(27, '2026-06-18', '2026-06-18T15:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'B', 'CAN', 'QAT'),
  gm(28, '2026-06-18', '2026-06-18T19:00:00-06:00', 'Estadio Akron', 'Guadalajara, MEX', 'A', 'MEX', 'KOR'),
  // 2026-06-19
  gm(29, '2026-06-19', '2026-06-19T12:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'D', 'USA', 'AUS'),
  gm(30, '2026-06-19', '2026-06-19T18:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'C', 'SCO', 'MAR'),
  gm(31, '2026-06-19', '2026-06-19T20:30:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'C', 'BRA', 'HAI'),
  gm(32, '2026-06-19', '2026-06-19T20:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'D', 'TUR', 'PAR'),
  // 2026-06-20
  gm(33, '2026-06-20', '2026-06-20T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'F', 'NED', 'SWE'),
  gm(34, '2026-06-20', '2026-06-20T16:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'E', 'GER', 'CIV'),
  gm(35, '2026-06-20', '2026-06-20T19:00:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'E', 'ECU', 'CUW'),
  gm(36, '2026-06-20', '2026-06-20T22:00:00-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'F', 'TUN', 'JPN'),
  // 2026-06-21
  gm(37, '2026-06-21', '2026-06-21T12:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'H', 'ESP', 'KSA'),
  gm(38, '2026-06-21', '2026-06-21T12:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'G', 'BEL', 'IRN'),
  gm(39, '2026-06-21', '2026-06-21T18:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'H', 'URU', 'CPV'),
  gm(40, '2026-06-21', '2026-06-21T18:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'G', 'NZL', 'EGY'),
  // 2026-06-22
  gm(41, '2026-06-22', '2026-06-22T12:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'J', 'ARG', 'AUT'),
  gm(42, '2026-06-22', '2026-06-22T17:00:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'I', 'FRA', 'IRQ'),
  gm(43, '2026-06-22', '2026-06-22T20:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'I', 'NOR', 'SEN'),
  gm(44, '2026-06-22', '2026-06-22T20:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'J', 'JOR', 'ALG'),
  // 2026-06-23
  gm(45, '2026-06-23', '2026-06-23T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'K', 'POR', 'UZB'),
  gm(46, '2026-06-23', '2026-06-23T16:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'L', 'ENG', 'GHA'),
  gm(47, '2026-06-23', '2026-06-23T19:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'L', 'PAN', 'CRO'),
  gm(48, '2026-06-23', '2026-06-23T20:00:00-06:00', 'Estadio Akron', 'Guadalajara, MEX', 'K', 'COL', 'COD'),
  // 2026-06-24
  gm(49, '2026-06-24', '2026-06-24T12:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'B', 'SUI', 'CAN'),
  gm(50, '2026-06-24', '2026-06-24T12:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'B', 'BIH', 'QAT'),
  gm(51, '2026-06-24', '2026-06-24T18:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'C', 'SCO', 'BRA'),
  gm(52, '2026-06-24', '2026-06-24T18:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'C', 'MAR', 'HAI'),
  gm(53, '2026-06-24', '2026-06-24T19:00:00-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'A', 'CZE', 'MEX'),
  gm(54, '2026-06-24', '2026-06-24T19:00:00-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'A', 'RSA', 'KOR'),
  // 2026-06-25
  gm(55, '2026-06-25', '2026-06-25T16:00:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'E', 'CUW', 'CIV'),
  gm(56, '2026-06-25', '2026-06-25T16:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'E', 'ECU', 'GER'),
  gm(57, '2026-06-25', '2026-06-25T18:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'F', 'JPN', 'SWE'),
  gm(58, '2026-06-25', '2026-06-25T18:00:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'F', 'TUN', 'NED'),
  gm(59, '2026-06-25', '2026-06-25T19:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'D', 'TUR', 'USA'),
  gm(60, '2026-06-25', '2026-06-25T19:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'D', 'PAR', 'AUS'),
  // 2026-06-26
  gm(61, '2026-06-26', '2026-06-26T15:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'I', 'NOR', 'FRA'),
  gm(62, '2026-06-26', '2026-06-26T15:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'I', 'SEN', 'IRQ'),
  gm(63, '2026-06-26', '2026-06-26T19:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'H', 'CPV', 'KSA'),
  gm(64, '2026-06-26', '2026-06-26T18:00:00-06:00', 'Estadio Akron', 'Guadalajara, MEX', 'H', 'URU', 'ESP'),
  gm(65, '2026-06-26', '2026-06-26T20:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'G', 'EGY', 'IRN'),
  gm(66, '2026-06-26', '2026-06-26T20:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'G', 'NZL', 'BEL'),
  // 2026-06-27
  gm(67, '2026-06-27', '2026-06-27T17:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'L', 'PAN', 'ENG'),
  gm(68, '2026-06-27', '2026-06-27T17:00:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'L', 'CRO', 'GHA'),
  gm(69, '2026-06-27', '2026-06-27T19:30:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'K', 'COL', 'POR'),
  gm(70, '2026-06-27', '2026-06-27T19:30:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'K', 'COD', 'UZB'),
  gm(71, '2026-06-27', '2026-06-27T21:00:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'J', 'ALG', 'AUT'),
  gm(72, '2026-06-27', '2026-06-27T21:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'J', 'JOR', 'ARG'),

  // Knockout stage
  // Round of 32
  km(73, '2026-06-28', '2026-06-28T12:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'R32', 'Runner-up Group A', 'Runner-up Group B'),
  km(74, '2026-06-29', '2026-06-29T16:30:00-04:00', 'Gillette Stadium', 'Boston, USA', 'R32', 'Winner Group E', 'Best 3rd: A/B/C/D/F'),
  km(75, '2026-06-29', '2026-06-29T19:00:00-06:00', 'Estadio BBVA', 'Monterrey, MEX', 'R32', 'Winner Group F', 'Runner-up Group C'),
  km(76, '2026-06-29', '2026-06-29T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'R32', 'Winner Group C', 'Runner-up Group F'),
  km(77, '2026-06-30', '2026-06-30T17:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'R32', 'Winner Group I', 'Best 3rd: C/D/F/G/H'),
  km(78, '2026-06-30', '2026-06-30T12:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'R32', 'Runner-up Group E', 'Runner-up Group I'),
  km(79, '2026-06-30', '2026-06-30T19:00:00-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'R32', 'Winner Group A', 'Best 3rd: C/E/F/H/I'),
  km(80, '2026-07-01', '2026-07-01T12:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'R32', 'Winner Group L', 'Best 3rd: E/H/I/J/K'),
  km(81, '2026-07-01', '2026-07-01T17:00:00-07:00', 'Levi\'s Stadium', 'San Francisco, USA', 'R32', 'Winner Group D', 'Best 3rd: B/E/F/I/J'),
  km(82, '2026-07-01', '2026-07-01T13:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'R32', 'Winner Group G', 'Best 3rd: A/E/H/I/J'),
  km(83, '2026-07-02', '2026-07-02T19:00:00-04:00', 'BMO Field', 'Toronto, CAN', 'R32', 'Runner-up Group K', 'Runner-up Group L'),
  km(84, '2026-07-02', '2026-07-02T12:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'R32', 'Winner Group H', 'Runner-up Group J'),
  km(85, '2026-07-02', '2026-07-02T20:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'R32', 'Winner Group B', 'Best 3rd: E/F/G/I/J'),
  km(86, '2026-07-03', '2026-07-03T18:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'R32', 'Winner Group J', 'Runner-up Group H'),
  km(87, '2026-07-03', '2026-07-03T20:30:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'R32', 'Winner Group K', 'Best 3rd: D/E/I/J/L'),
  km(88, '2026-07-03', '2026-07-03T13:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'R32', 'Runner-up Group D', 'Runner-up Group G'),
  // Round of 16
  km(89, '2026-07-04', '2026-07-04T17:00:00-04:00', 'Lincoln Financial Field', 'Philadelphia, USA', 'R16', 'Winner 74', 'Winner 77'),
  km(90, '2026-07-04', '2026-07-04T12:00:00-05:00', 'NRG Stadium', 'Houston, USA', 'R16', 'Winner 73', 'Winner 75'),
  km(91, '2026-07-05', '2026-07-05T16:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'R16', 'Winner 76', 'Winner 78'),
  km(92, '2026-07-05', '2026-07-05T18:00:00-06:00', 'Estadio Azteca', 'Mexico City, MEX', 'R16', 'Winner 79', 'Winner 80'),
  km(93, '2026-07-06', '2026-07-06T14:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'R16', 'Winner 83', 'Winner 84'),
  km(94, '2026-07-06', '2026-07-06T17:00:00-07:00', 'Lumen Field', 'Seattle, USA', 'R16', 'Winner 81', 'Winner 82'),
  km(95, '2026-07-07', '2026-07-07T12:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'R16', 'Winner 86', 'Winner 88'),
  km(96, '2026-07-07', '2026-07-07T13:00:00-07:00', 'BC Place', 'Vancouver, CAN', 'R16', 'Winner 85', 'Winner 87'),
  // Quarter-finals
  km(97, '2026-07-09', '2026-07-09T16:00:00-04:00', 'Gillette Stadium', 'Boston, USA', 'QF', 'Winner 89', 'Winner 90'),
  km(98, '2026-07-10', '2026-07-10T12:00:00-07:00', 'SoFi Stadium', 'Los Angeles, USA', 'QF', 'Winner 93', 'Winner 94'),
  km(99, '2026-07-11', '2026-07-11T17:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', 'QF', 'Winner 91', 'Winner 92'),
  km(100, '2026-07-11', '2026-07-11T20:00:00-05:00', 'Arrowhead Stadium', 'Kansas City, USA', 'QF', 'Winner 95', 'Winner 96'),
  // Semifinals
  km(101, '2026-07-14', '2026-07-14T14:00:00-05:00', 'AT&T Stadium', 'Dallas, USA', 'SF', 'Winner 97', 'Winner 98'),
  km(102, '2026-07-15', '2026-07-15T15:00:00-04:00', 'Mercedes-Benz Stadium', 'Atlanta, USA', 'SF', 'Winner 99', 'Winner 100'),
  // Third place
  km(103, '2026-07-18', '2026-07-18T17:00:00-04:00', 'Hard Rock Stadium', 'Miami, USA', '3rd', 'Loser 101', 'Loser 102'),
  // Final
  km(104, '2026-07-19', '2026-07-19T15:00:00-04:00', 'MetLife Stadium', 'New York/NJ, USA', 'F', 'Winner 101', 'Winner 102'),
];

// Expose to window for schedule.js
window.WC26_DATA = { TEAMS, GROUPS, MATCHES };
