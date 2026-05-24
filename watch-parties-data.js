// WC26 Anywhere — watch parties data
// Starter list of country-specific and soccer-friendly venues across the
// 7 most-asked US cities. Sourced from general knowledge of well-known
// soccer bars + the active Reddit threads linked per city.
//
// IMPORTANT: This is a v0 starter list. Hours, screening plans, and even
// "is this place still open" should be verified by phone before travel.
// Page caveat surfaces this prominently.
//
// Fields:
//   id            - kebab-case unique slug
//   name          - venue name
//   address       - street + zip if known
//   neighborhood  - human-friendly area name
//   city          - one of the CITIES ids
//   countries     - array of team codes (matches schedule TEAMS keys); use
//                   ['GEN'] for general soccer pubs that show all matches
//   description   - one or two sentence note on what to expect
//   sourceUrl     - optional reddit/article link if specifically referenced
//   sourceLabel   - optional source attribution text

const CITIES = [
  { id: 'NYC', name: 'New York / NJ' },
  { id: 'LA',  name: 'Los Angeles' },
  { id: 'SF',  name: 'San Francisco / Bay Area' },
  { id: 'DAL', name: 'Dallas / Fort Worth' },
  { id: 'MIA', name: 'Miami / South Florida' },
  { id: 'HOU', name: 'Houston' },
  { id: 'ATL', name: 'Atlanta' },
];

// Host stadiums in the US. Used to tag venues near a stadium for
// traveling supporters / fans planning to be in the stadium area on match day.
const STADIUMS = {
  MET: { name: 'MetLife Stadium', city: 'East Rutherford, NJ' },
  GIL: { name: 'Gillette Stadium', city: 'Foxborough, MA' },
  LIN: { name: 'Lincoln Financial Field', city: 'Philadelphia, PA' },
  MBZ: { name: 'Mercedes-Benz Stadium', city: 'Atlanta, GA' },
  HRD: { name: 'Hard Rock Stadium', city: 'Miami Gardens, FL' },
  NRG: { name: 'NRG Stadium', city: 'Houston, TX' },
  ATT: { name: 'AT&T Stadium', city: 'Arlington, TX' },
  ARH: { name: 'Arrowhead Stadium', city: 'Kansas City, MO' },
  LEV: { name: "Levi's Stadium", city: 'Santa Clara, CA' },
  SOFI: { name: 'SoFi Stadium', city: 'Inglewood, CA' },
  LUM: { name: 'Lumen Field', city: 'Seattle, WA' },
};

// Countries used on this page. GEN = general soccer pub (no specific country).
const WP_COUNTRIES = {
  GEN: { name: 'General soccer', flag: '⚽' },
  USA: { name: 'USA', flag: '🇺🇸' },
  MEX: { name: 'Mexico', flag: '🇲🇽' },
  ARG: { name: 'Argentina', flag: '🇦🇷' },
  BRA: { name: 'Brazil', flag: '🇧🇷' },
  COL: { name: 'Colombia', flag: '🇨🇴' },
  ECU: { name: 'Ecuador', flag: '🇪🇨' },
  ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  IRL: { name: 'Ireland', flag: '🇮🇪' },
  ESP: { name: 'Spain', flag: '🇪🇸' },
  ITA: { name: 'Italy', flag: '🇮🇹' },
  GER: { name: 'Germany', flag: '🇩🇪' },
  POR: { name: 'Portugal', flag: '🇵🇹' },
  FRA: { name: 'France', flag: '🇫🇷' },
  NED: { name: 'Netherlands', flag: '🇳🇱' },
  JAM: { name: 'Jamaica', flag: '🇯🇲' },
  HAI: { name: 'Haiti', flag: '🇭🇹' },
  MAR: { name: 'Morocco', flag: '🇲🇦' },
  SEN: { name: 'Senegal', flag: '🇸🇳' },
  JPN: { name: 'Japan', flag: '🇯🇵' },
  KOR: { name: 'South Korea', flag: '🇰🇷' },
};

// Per-city Reddit/community resources (where users find more venues).
const CITY_THREADS = {
  NYC: [
    { url: 'https://reddit.com/r/AskNYC/comments/1smofvk/looking_for_countryspecific_world_cup_bars_in_new/', label: 'r/AskNYC: country-specific WC bars' },
    { url: 'https://reddit.com/r/AskNYC/comments/1tbailj/best_bars_in_manhattan_to_watch_world_cup_games/', label: 'r/AskNYC: best Manhattan WC bars' },
    { url: 'https://reddit.com/r/AskNYC/comments/1sr624y/world_cup_barscafesrestaurants/', label: 'r/AskNYC: WC bars/cafes/restaurants' },
  ],
  LA: [
    { url: 'https://reddit.com/r/LosAngeles/search/?q=world+cup+bar&restrict_sr=1', label: 'r/LosAngeles: WC bar searches' },
  ],
  SF: [
    { url: 'https://reddit.com/r/sanfrancisco/search/?q=world+cup&restrict_sr=1', label: 'r/sanfrancisco: WC searches' },
  ],
  DAL: [
    { url: 'https://reddit.com/r/Dallas/search/?q=world+cup+bar&restrict_sr=1', label: 'r/Dallas: WC bar searches' },
  ],
  MIA: [
    { url: 'https://reddit.com/r/Miami/search/?q=world+cup&restrict_sr=1', label: 'r/Miami: WC searches' },
  ],
  HOU: [
    { url: 'https://reddit.com/r/houston/search/?q=world+cup+bar&restrict_sr=1', label: 'r/houston: WC bar searches' },
  ],
  ATL: [
    { url: 'https://reddit.com/r/atlanta/search/?q=world+cup+bar&restrict_sr=1', label: 'r/atlanta: WC bar searches' },
  ],
};

const VENUES = [
  // ===== NEW YORK / NJ =====
  {
    id: 'smithfield-nyc', name: 'Smithfield Hall', address: '215 W 28th St',
    neighborhood: 'Chelsea', city: 'NYC', countries: ['GEN', 'ENG'],
    description: 'Long-standing Chelsea sports bar with multiple screens. Goes deep for big tournaments and Premier League weekends.',
  },
  // Near MetLife Stadium (East Rutherford, NJ)
  {
    id: 'redeye-grill-secaucus', name: 'Red Robin / Redd\'s Tavern', address: 'Plaza at Harmon Meadow',
    neighborhood: 'Secaucus, NJ', city: 'NYC', countries: ['GEN', 'USA'],
    description: 'Sports bar in the Harmon Meadow complex. ~10 min drive to MetLife. Pre-match crowd on stadium days.',
    nearStadium: 'MET',
  },
  {
    id: 'mulligans-hoboken', name: "Mulligan's Bar", address: '159 First St',
    neighborhood: 'Hoboken, NJ', city: 'NYC', countries: ['GEN', 'IRL'],
    description: 'Hoboken sports bar with PATH-train access to NJ Transit for MetLife. Strong soccer crowd.',
    nearStadium: 'MET',
  },
  {
    id: 'football-factory-nyc', name: 'The Football Factory at Legends', address: '6 W 33rd St',
    neighborhood: 'Midtown', city: 'NYC', countries: ['GEN', 'ENG'],
    description: 'Purpose-built soccer-watching venue. Reserves seats per supporter group for big matches.',
  },
  {
    id: '11th-st-bar-nyc', name: '11th Street Bar', address: '510 E 11th St',
    neighborhood: 'East Village', city: 'NYC', countries: ['IRL', 'GEN'],
    description: 'Irish bar that opens early for European kickoffs. Mixed crowd, friendly to most teams.',
  },
  {
    id: 'amity-hall-uptown-nyc', name: 'Amity Hall Uptown', address: '942 Amsterdam Ave',
    neighborhood: 'Upper West Side', city: 'NYC', countries: ['GEN', 'USA'],
    description: 'Sports bar with a soccer-leaning crowd. USMNT matches pull a big local turnout.',
  },
  {
    id: 'banter-bar-nyc', name: 'Banter Bar', address: '132 Havemeyer St',
    neighborhood: 'Williamsburg, Brooklyn', city: 'NYC', countries: ['AUS', 'GEN'],
    description: 'Australian bar with an international soccer crowd. Strong for Socceroos and Premier League.',
  },

  // ===== LOS ANGELES =====
  {
    id: 'greenwood-la', name: 'The Greenwood', address: '904 N Fairfax Ave',
    neighborhood: 'Fairfax', city: 'LA', countries: ['GEN', 'ENG'],
    description: 'Soccer-first pub that shows every meaningful match in the season. Premier League crowd, but turns up for WC.',
  },
  // Near SoFi Stadium (Inglewood)
  {
    id: 'three-weavers-inglewood', name: 'Three Weavers Brewing', address: '1031 W Manchester Blvd',
    neighborhood: 'Inglewood', city: 'LA', countries: ['GEN', 'USA'],
    description: 'Inglewood taproom walking distance from SoFi Stadium. Big-screen setup, neighborhood crowd on match days.',
    nearStadium: 'SOFI',
  },
  {
    id: 'lockhart-inglewood', name: 'Lockhart Smokehouse', address: '11460 La Cienega Blvd',
    neighborhood: 'Inglewood', city: 'LA', countries: ['GEN'],
    description: 'Sports-bar-and-BBQ ~5 min from SoFi. Pre-match destination for stadium-bound fans.',
    nearStadium: 'SOFI',
  },
  {
    id: 'cock-bull-la', name: 'Ye Olde Kings Head', address: '116 Santa Monica Blvd',
    neighborhood: 'Santa Monica', city: 'LA', countries: ['ENG', 'GEN'],
    description: 'Classic British pub a block from the beach. Opens early for European kickoffs.',
  },
  {
    id: 'sevilla-tapas-la', name: 'Sevilla',
    address: '140 Pine Ave', neighborhood: 'Long Beach',
    city: 'LA', countries: ['ESP'],
    description: 'Spanish tapas bar and flamenco club. Reliable for Spain matches with a Spanish-speaking crowd.',
  },
  {
    id: 'simmzys-la', name: "Simmzy's Pub", address: '229 W Grand Ave',
    neighborhood: 'El Segundo', city: 'LA', countries: ['GEN'],
    description: 'South Bay sports bar with a soccer-aware staff. Shows every match.',
  },

  // ===== SAN FRANCISCO / BAY AREA =====
  {
    id: 'mad-dog-fog-sf', name: 'Mad Dog in the Fog', address: '530 Haight St',
    neighborhood: 'Lower Haight', city: 'SF', countries: ['ENG', 'GEN'],
    description: 'The SF soccer pub. Opens at 4am for European kickoffs and is full by the first whistle.',
  },
  // Near Levi's Stadium (Santa Clara) — 45 mi south of SF, separate world for Bay Area fans
  {
    id: 'splash-san-jose', name: 'Splash San Jose', address: '65 Post St',
    neighborhood: 'Downtown San Jose', city: 'SF', countries: ['GEN'],
    description: 'Downtown San Jose sports bar ~10 min from Levi\'s. South Bay watch-party hub on stadium match days.',
    nearStadium: 'LEV',
  },
  {
    id: 'pedros-santa-clara', name: "Pedro's Restaurant & Cantina", address: '3935 Freedom Cir',
    neighborhood: 'Santa Clara', city: 'SF', countries: ['MEX'],
    description: 'Mexican restaurant 5 minutes from Levi\'s. Spanish commentary on Mexico match days, big crowd.',
    nearStadium: 'LEV',
  },
  {
    id: 'kezar-pub-sf', name: 'Kezar Pub', address: '770 Stanyan St',
    neighborhood: 'Cole Valley', city: 'SF', countries: ['IRL', 'GEN'],
    description: 'Cole Valley institution next to Kezar Stadium. Soccer-leaning bar with full-volume audio for big matches.',
  },
  {
    id: 'maggie-mcgarry-sf', name: "Maggie McGarry's", address: '1353 Grant Ave',
    neighborhood: 'North Beach', city: 'SF', countries: ['IRL', 'GEN'],
    description: 'Irish pub on Grant Ave. Reliable for Premier League weekends and international matches.',
  },
  {
    id: 'final-final-sf', name: 'Final Final', address: '2990 Baker St',
    neighborhood: 'Cow Hollow', city: 'SF', countries: ['GEN', 'USA'],
    description: 'Neighborhood sports bar that switches to soccer mode for big tournaments.',
  },

  // ===== DALLAS / FORT WORTH =====
  {
    id: 'trinity-hall-dal', name: 'Trinity Hall Irish Pub', address: '5321 E Mockingbird Ln',
    neighborhood: 'Mockingbird Station', city: 'DAL', countries: ['IRL', 'GEN'],
    description: 'Irish pub at Mockingbird Station. Opens early for European matches, strong soccer crowd for WC.',
  },
  // Near AT&T Stadium (Arlington)
  {
    id: 'texas-live-arlington', name: 'Texas Live!', address: '1650 E Randol Mill Rd',
    neighborhood: 'Arlington', city: 'DAL', countries: ['GEN', 'USA'],
    description: 'Massive entertainment complex literally adjacent to AT&T Stadium. PBR Texas, Live! Arena, and multiple bars. WC match-day destination.',
    nearStadium: 'ATT',
  },
  {
    id: 'humperdinks-arlington', name: "Humperdink's Bar & Grill", address: '700 Six Flags Dr',
    neighborhood: 'Arlington', city: 'DAL', countries: ['GEN'],
    description: 'Sports bar ~5 min from AT&T Stadium. Brewpub with big-screen setup, pre-match standard for stadium-bound fans.',
    nearStadium: 'ATT',
  },
  {
    id: 'londoner-dal', name: 'The Londoner', address: '5535 Greenville Ave',
    neighborhood: 'Greenville Ave', city: 'DAL', countries: ['ENG', 'GEN'],
    description: 'British-style pub chain. Multiple DFW locations, all show Premier League and WC matches.',
  },
  {
    id: 'gas-monkey-dal', name: 'Gas Monkey Bar N Grill', address: '10261 Technology Blvd E',
    neighborhood: 'Northwest Dallas', city: 'DAL', countries: ['GEN', 'USA'],
    description: 'Sports bar with multiple screens. Becomes a USA-game destination for big tournaments.',
  },
  {
    id: 'fadi-mexican-dal', name: 'Fadi Mexican Grill',
    address: 'Multiple DFW locations', neighborhood: 'DFW area',
    city: 'DAL', countries: ['MEX'],
    description: 'Mexican grill that screens Mexico matches with Spanish-language commentary.',
  },

  // ===== MIAMI / SOUTH FLORIDA =====
  {
    id: 'fritz-franz-mia', name: 'Fritz & Franz Bierhaus', address: '60 Merrick Way',
    neighborhood: 'Coral Gables', city: 'MIA', countries: ['GER', 'GEN'],
    description: 'German Bierhaus. Long-running WC watch party tradition, though recent venue dispute with the city may move the location. Confirm before going.',
    sourceUrl: 'https://www.miamiherald.com/news/local/community/miami-dade/coral-gables/article288245420.html',
    sourceLabel: 'Miami Herald 2026',
  },
  // Near Hard Rock Stadium (Miami Gardens)
  {
    id: 'shulas-aventura', name: "Shula's Bar & Grill", address: '20801 Biscayne Blvd',
    neighborhood: 'Aventura', city: 'MIA', countries: ['GEN', 'USA'],
    description: 'Aventura sports bar ~10 min from Hard Rock Stadium. Pre-match destination for stadium-bound fans.',
    nearStadium: 'HRD',
  },
  {
    id: 'tap42-aventura', name: 'Tap 42', address: '19565 Biscayne Blvd',
    neighborhood: 'Aventura Mall', city: 'MIA', countries: ['GEN'],
    description: 'Craft beer + sports bar at Aventura Mall, easy access to Hard Rock Stadium. Showing every match.',
    nearStadium: 'HRD',
  },
  {
    id: 'manolos-mia', name: "Manolo's", address: '17350 Collins Ave',
    neighborhood: 'Sunny Isles Beach', city: 'MIA', countries: ['ARG'],
    description: 'Argentine cafe and bar. Sunny Isles is the heart of Argentine Miami; this is the place for Argentina matches.',
  },
  {
    id: 'haitian-watch-party-mia', name: 'Little Haiti watch parties', address: 'Little Haiti district',
    neighborhood: 'Little Haiti', city: 'MIA', countries: ['HAI'],
    description: 'Haiti qualified for the WC for the first time since 1974. South Florida has the largest Haitian population in the US; expect organized watch parties around Little Haiti, NE 54th-79th St area, during Haiti match days.',
  },
  {
    id: 'duffys-mia', name: "Duffy's Sports Grill",
    address: 'Multiple South Florida locations', neighborhood: 'South Florida-wide',
    city: 'MIA', countries: ['GEN', 'USA'],
    description: 'South Florida sports-bar chain. Shows every WC match across all locations.',
  },

  // ===== HOUSTON =====
  {
    id: 'pitch-25-hou', name: 'Pitch 25', address: '2120 Walker St',
    neighborhood: 'East Downtown', city: 'HOU', countries: ['GEN'],
    description: 'Purpose-built soccer bar from former USMNT player Brian Ching. Multi-screen, every match, every kickoff. Walking distance to NRG via shuttle.',
    nearStadium: 'NRG',
  },
  {
    id: 'rudyards-hou', name: 'Rudyard\'s British Pub', address: '2010 Waugh Dr',
    neighborhood: 'Montrose', city: 'HOU', countries: ['ENG', 'GEN'],
    description: 'Houston institution with strong British and soccer crowd. WC matches pull standing-room-only.',
  },
  {
    id: 'el-tiempo-hou', name: 'El Tiempo Cantina',
    address: 'Multiple Houston locations', neighborhood: 'Houston-wide',
    city: 'HOU', countries: ['MEX'],
    description: 'Tex-Mex chain that turns into a Mexico-game venue with Spanish-language commentary on match days.',
  },
  {
    id: 'shay-mcelroy-hou', name: "Shay McElroy's Irish Pub", address: '903 Durham Dr',
    neighborhood: 'The Heights', city: 'HOU', countries: ['IRL', 'GEN'],
    description: 'Heights Irish pub. Reliable for big international tournaments.',
  },

  // ===== ATLANTA =====
  {
    id: 'brewhouse-atl', name: 'Brewhouse Cafe', address: '401 Moreland Ave NE',
    neighborhood: 'Little Five Points', city: 'ATL', countries: ['GEN', 'ENG'],
    description: 'Atlanta\'s soccer bar of record. Multiple screens, every match, crowd that actually watches the game.',
  },
  {
    id: 'fado-atl', name: 'Fado Irish Pub', address: '273 Buckhead Ave NE',
    neighborhood: 'Buckhead', city: 'ATL', countries: ['IRL', 'GEN'],
    description: 'Buckhead Irish pub. Opens early for European kickoffs and shows every WC match.',
  },
  {
    id: 'el-toro-atl', name: 'El Toro Mexican Restaurant',
    address: 'Multiple metro Atlanta locations', neighborhood: 'Metro Atlanta',
    city: 'ATL', countries: ['MEX'],
    description: 'Mexican-restaurant chain. Mexico matches pull a Spanish-speaking crowd; commentary in Spanish on match days.',
  },
  {
    id: 'sports-and-social-atl', name: 'Sports & Social', address: '20 Centennial Olympic Park Dr',
    neighborhood: 'Downtown', city: 'ATL', countries: ['GEN', 'USA'],
    description: 'Mercedes-Benz Stadium-adjacent sports bar. Walk-up venue for any Atlanta-hosted WC match.',
    nearStadium: 'MBZ',
  },
];

window.WC26_WP = { CITIES, WP_COUNTRIES, CITY_THREADS, VENUES, STADIUMS };
