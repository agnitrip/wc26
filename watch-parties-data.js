// WC26 Pregame — watch parties data
// Starter list of country-specific and soccer-friendly venues across all
// 16 WC26 host cities in the US, Canada, and Mexico. US + Canada venues
// are sourced from general knowledge of well-known soccer bars and the
// active Reddit threads linked per city. Mexico host-city listings are
// mostly neighborhood-level pointers (public plazas where Mexico has
// historically hosted big-screen viewings, plus known nightlife districts)
// rather than specific bars — verify on arrival.
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
  { id: 'BOS', name: 'Boston / New England' },
  { id: 'NYC', name: 'New York / NJ' },
  { id: 'PHL', name: 'Philadelphia' },
  { id: 'ATL', name: 'Atlanta' },
  { id: 'MIA', name: 'Miami / South Florida' },
  { id: 'DAL', name: 'Dallas / Fort Worth' },
  { id: 'HOU', name: 'Houston' },
  { id: 'KC',  name: 'Kansas City' },
  { id: 'SF',  name: 'San Francisco / Bay Area' },
  { id: 'LA',  name: 'Los Angeles' },
  { id: 'SEA', name: 'Seattle' },
  { id: 'TOR', name: 'Toronto' },
  { id: 'VAN', name: 'Vancouver' },
  { id: 'CDMX', name: 'Mexico City' },
  { id: 'GDL',  name: 'Guadalajara' },
  { id: 'MTY',  name: 'Monterrey' },
];

// Host stadiums across the US, Canada, and Mexico. Used to tag venues near a stadium
// for traveling supporters / fans planning to be in the stadium area on
// match day.
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
  BMO: { name: 'BMO Field', city: 'Toronto, ON' },
  BCP: { name: 'BC Place', city: 'Vancouver, BC' },
  AZT: { name: 'Estadio Azteca', city: 'Mexico City, MX' },
  AKR: { name: 'Estadio Akron', city: 'Guadalajara, MX' },
  BBV: { name: 'Estadio BBVA', city: 'Monterrey, MX' },
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
  BOS: [
    { url: 'https://reddit.com/r/boston/search/?q=world+cup+bar&restrict_sr=1', label: 'r/boston: WC bar searches' },
    { url: 'https://reddit.com/r/Patriots/search/?q=gillette+world+cup&restrict_sr=1', label: 'r/Patriots: Gillette WC threads' },
  ],
  PHL: [
    { url: 'https://reddit.com/r/philadelphia/search/?q=world+cup+bar&restrict_sr=1', label: 'r/philadelphia: WC bar searches' },
  ],
  KC: [
    { url: 'https://reddit.com/r/kansascity/search/?q=world+cup+bar&restrict_sr=1', label: 'r/kansascity: WC bar searches' },
  ],
  SEA: [
    { url: 'https://reddit.com/r/Seattle/search/?q=world+cup+bar&restrict_sr=1', label: 'r/Seattle: WC bar searches' },
    { url: 'https://reddit.com/r/Sounders/search/?q=world+cup+bar&restrict_sr=1', label: 'r/Sounders: WC bar threads' },
  ],
  TOR: [
    { url: 'https://reddit.com/r/toronto/search/?q=world+cup+bar&restrict_sr=1', label: 'r/toronto: WC bar searches' },
    { url: 'https://reddit.com/r/torontoFC/search/?q=world+cup&restrict_sr=1', label: 'r/torontoFC: WC threads' },
  ],
  VAN: [
    { url: 'https://reddit.com/r/vancouver/search/?q=world+cup+bar&restrict_sr=1', label: 'r/vancouver: WC bar searches' },
    { url: 'https://reddit.com/r/whitecapsfc/search/?q=world+cup&restrict_sr=1', label: 'r/whitecapsfc: WC threads' },
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
    nearStadium: 'MET', walkTime: '10 min drive',
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
    nearStadium: 'SOFI', walkTime: '5 min drive',
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
    nearStadium: 'LEV', walkTime: '5 min drive',
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
    nearStadium: 'ATT', walkTime: 'walk-up',
  },
  {
    id: 'humperdinks-arlington', name: "Humperdink's Bar & Grill", address: '700 Six Flags Dr',
    neighborhood: 'Arlington', city: 'DAL', countries: ['GEN'],
    description: 'Sports bar ~5 min from AT&T Stadium. Brewpub with big-screen setup, pre-match standard for stadium-bound fans.',
    nearStadium: 'ATT', walkTime: '5 min drive',
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
    nearStadium: 'MBZ', walkTime: 'walk-up',
  },

  // ===== BOSTON / NEW ENGLAND =====
  {
    id: 'phoenix-landing-bos', name: 'Phoenix Landing', address: '512 Massachusetts Ave',
    neighborhood: 'Central Square, Cambridge', city: 'BOS', countries: ['IRL', 'GEN'],
    description: 'Long-running Cambridge soccer pub. Opens at 7am for European kickoffs. Hardcore Premier League and international crowd.',
  },
  {
    id: 'the-burren-bos', name: 'The Burren', address: '247 Elm St',
    neighborhood: 'Davis Square, Somerville', city: 'BOS', countries: ['IRL', 'GEN'],
    description: 'Irish pub with a serious soccer following. Multiple screens and an early-opening kitchen for morning matches.',
  },
  {
    id: 'lir-bos', name: 'Lir Irish Pub', address: '903 Boylston St',
    neighborhood: 'Back Bay, Boston', city: 'BOS', countries: ['IRL', 'GEN'],
    description: 'Boylston Street Irish pub. Reliable for big-tournament watch parties.',
  },
  {
    id: 'patriot-place-bos', name: 'Bar Louie at Patriot Place', address: '208 Patriot Pl',
    neighborhood: 'Foxborough', city: 'BOS', countries: ['GEN', 'USA'],
    description: 'Sports bar in the Patriot Place complex adjacent to Gillette Stadium. Pre-match destination on WC match days.',
    nearStadium: 'GIL', walkTime: 'walk-up',
  },

  // ===== PHILADELPHIA =====
  {
    id: 'misconduct-phl', name: 'Misconduct Tavern', address: '1511 Locust St',
    neighborhood: 'Rittenhouse', city: 'PHL', countries: ['GEN', 'USA'],
    description: 'Center City sports tavern with strong soccer following. Multiple screens, opens early for European matches.',
  },
  {
    id: 'mcgillins-phl', name: "McGillin's Olde Ale House", address: '1310 Drury St',
    neighborhood: 'Center City', city: 'PHL', countries: ['IRL', 'GEN'],
    description: "Philadelphia's oldest tavern (since 1860). Strong soccer crowd, especially for Premier League and international matches.",
  },
  {
    id: 'fado-phl', name: 'Fadó Irish Pub', address: '1500 Locust St',
    neighborhood: 'Center City', city: 'PHL', countries: ['IRL', 'GEN'],
    description: 'Irish pub with reliable WC coverage. Opens early for European kickoffs.',
  },
  {
    id: 'xfinity-live-phl', name: 'Xfinity Live!', address: '1100 Pattison Ave',
    neighborhood: 'South Philadelphia', city: 'PHL', countries: ['GEN', 'USA'],
    description: 'Sports/entertainment complex literally adjacent to Lincoln Financial Field. Multiple bars, big screens, match-day destination.',
    nearStadium: 'LIN', walkTime: 'walk-up',
  },

  // ===== KANSAS CITY =====
  {
    id: 'kc-bier-co-kc', name: 'KC Bier Co', address: '310 W 79th St',
    neighborhood: 'Waldo', city: 'KC', countries: ['GER', 'GEN'],
    description: 'German biergarten in Waldo. Reliable for Germany matches with a Spanish-mit-German crowd. Showing every WC match.',
  },
  {
    id: 'the-brick-kc', name: 'The Brick', address: '1727 McGee St',
    neighborhood: 'Crossroads', city: 'KC', countries: ['GEN', 'USA'],
    description: 'Crossroads Arts District bar with sports-bar setup. Pulls a local soccer crowd for the WC.',
  },
  {
    id: 'power-light-kc', name: 'Power & Light District (multiple bars)', address: '1330 Walnut St',
    neighborhood: 'Downtown', city: 'KC', countries: ['GEN', 'USA'],
    description: 'KC\'s downtown entertainment district with PBR Big Sky, Tengo Sed Cantina, Mosaic, and more. Pick your spot; all show big matches.',
  },

  // ===== SEATTLE =====
  {
    id: 'fx-mcrorys-sea', name: "FX McRory's", address: '419 Occidental Ave S',
    neighborhood: 'Pioneer Square', city: 'SEA', countries: ['GEN', 'USA'],
    description: 'Pioneer Square sports institution, walking distance to Lumen Field. Sounders crowd carries over for the WC.',
    nearStadium: 'LUM',
  },
  {
    id: 'fado-sea', name: 'Fadó Irish Pub', address: '801 1st Ave',
    neighborhood: 'Pioneer Square', city: 'SEA', countries: ['IRL', 'GEN'],
    description: 'Irish pub in Pioneer Square, near Lumen Field. Opens early for European matches and goes deep for the WC.',
    nearStadium: 'LUM',
  },
  {
    id: 'the-110-sea', name: 'The 110', address: '110 S Washington St',
    neighborhood: 'Pioneer Square', city: 'SEA', countries: ['GEN'],
    description: 'Sounders supporters bar. The Seattle soccer crowd shows up for any meaningful match.',
    nearStadium: 'LUM',
  },

  // ===== TORONTO =====
  // BMO Field is in Exhibition Place. Liberty Village + Maple Leaf Square are
  // short walks; Little Italy and Little Portugal are roughly a 10 min drive.
  {
    id: 'cafe-diplomatico-tor', name: 'Café Diplomatico', address: '594 College St',
    neighborhood: 'Little Italy', city: 'TOR', countries: ['ITA', 'GEN'],
    description: "Toronto's Italian soccer institution for over 50 years. Heated patio video board plus indoor screens, packed College Street crowd on Italy match days.",
    nearStadium: 'BMO',
  },
  {
    id: 'amigos-da-dundas-tor', name: 'Amigos da Dundas Sports Bar', address: '1570 Dundas St W',
    neighborhood: 'Little Portugal', city: 'TOR', countries: ['POR', 'BRA', 'GEN'],
    description: 'Portuguese-run sports bar in the heart of Little Portugal. Multiple screens, pastéis de nata on the menu, supporter clubs that sing through Portugal and Brazil matches.',
    nearStadium: 'BMO',
  },
  {
    id: 'dock-ellis-tor', name: 'The Dock Ellis', address: '1280 Dundas St W',
    neighborhood: 'Dundas West', city: 'TOR', countries: ['GEN', 'ENG'],
    description: 'No-fuss neighbourhood sports bar with large screens, foosball, pool, and gastropub food. Reliable for showing every match with sound and a mixed crowd.',
    nearStadium: 'BMO',
  },
  {
    id: 'real-sports-tor', name: 'Real Sports Bar & Grill', address: '15 York St',
    neighborhood: 'Maple Leaf Square', city: 'TOR', countries: ['GEN', 'USA', 'ENG'],
    description: 'Cavernous downtown sports bar with a 39-foot main screen and nearly 200 HD TVs. Walking distance from BMO Field, every match on somewhere with sound on the big one for marquee fixtures.',
    nearStadium: 'BMO',
  },
  {
    id: 'local-liberty-village-tor', name: 'LOCAL Public Eatery Liberty Village', address: '171 E Liberty St',
    neighborhood: 'Liberty Village', city: 'TOR', countries: ['GEN'],
    description: 'Liberty Village gastropub with 20 taps, shuffleboard, big patio with CN Tower views, and screens throughout. Roughly a 10 minute walk to BMO Field.',
    nearStadium: 'BMO', walkTime: '10 min walk',
  },

  // ===== VANCOUVER =====
  // BC Place is downtown at Pacific Blvd. Most of these are within a 5-15 min
  // walk; Caffè Soccavo is on Commercial Drive (Little Italy), 10 min drive.
  {
    id: 'soccavo-van', name: 'Caffè Soccavo', address: '1321 Commercial Dr',
    neighborhood: 'Commercial Drive', city: 'VAN', countries: ['ITA'],
    description: 'Italian sports cafe from the Via Tevere team. Opens at 8am so early Italy kickoffs are covered with espresso, prosecco, and pizza by the slice. Small room, packed on match days.',
  },
  {
    id: 'red-card-van', name: 'Red Card Sports Bar + Eatery', address: '560 Smithe St',
    neighborhood: 'Downtown', city: 'VAN', countries: ['GEN', 'ENG', 'ITA'],
    description: 'European-style soccer bar with 16 TVs, two projectors, and wood-fired pizza. Reliable Premier League and WC crowd, about an 8 minute walk from BC Place.',
    nearStadium: 'BCP', walkTime: '8 min walk',
  },
  {
    id: 'shark-club-van', name: 'Shark Club Sports Bar & Grill', address: '180 W Georgia St',
    neighborhood: 'Downtown', city: 'VAN', countries: ['GEN'],
    description: 'Classic big-room sports bar inside the Sandman Signature, across the street from BC Place and Rogers Arena. Open 11am daily, sound on for marquee matches.',
    nearStadium: 'BCP',
  },
  {
    id: 'library-square-van', name: 'Library Square Public House', address: '300 W Georgia St',
    neighborhood: 'Downtown', city: 'VAN', countries: ['GEN', 'IRL'],
    description: 'Two blocks from BC Place with 10-plus screens, a projector, and an outdoor viewing area built out for the 2026 tournament. Home of the Vancouver Celtic FC supporters.',
    nearStadium: 'BCP', walkTime: '2 min walk',
  },
  {
    id: 'lamplighter-van', name: 'The Lamplighter Public House', address: '92 Water St',
    neighborhood: 'Gastown', city: 'VAN', countries: ['ENG'],
    description: "Vancouver's oldest pub and the official home of the Manchester United Supporters Club. Two projector screens, brick and chandelier setting, about a 15 minute walk from BC Place through Gastown.",
    nearStadium: 'BCP', walkTime: '15 min walk',
  },

  // ===== Mexico host cities (CDMX, GDL, MTY) =====
  // These are neighborhood + landmark pointers rather than specific verified
  // bars. Mexico City has a long tradition of large outdoor public viewings
  // for major Mexico matches; expect similar for WC26 home matches. Confirm
  // specific venues on arrival via local sources.
  {
    id: 'zocalo-cdmx', name: 'Zócalo (Plaza de la Constitución)', address: 'Plaza de la Constitución',
    neighborhood: 'Centro Histórico', city: 'CDMX', countries: ['MEX'],
    description: "Mexico City's main public square. Big-screen public viewings have been a fixture during major Mexico matches and are expected for WC26 home games. Massive crowds, food vendors, family atmosphere.",
  },
  {
    id: 'roma-condesa-cdmx', name: 'Roma Norte / Condesa bar district', address: 'Av. Álvaro Obregón / Av. Tamaulipas',
    neighborhood: 'Roma Norte / Condesa', city: 'CDMX', countries: ['GEN'],
    description: "Walkable bar and restaurant cluster with dozens of cantinas, beer halls, and gastro pubs showing matches. Many open early for European kickoffs. Pick on arrival — too many options to name one.",
  },
  {
    id: 'azteca-area-cdmx', name: 'Estadio Azteca neighborhood', address: 'Calzada de Tlalpan 3465',
    neighborhood: 'Santa Úrsula Coapa', city: 'CDMX', countries: ['GEN'],
    description: "Bars, cantinas, and street vendors around the Azteca on match days. Walk the surrounding blocks for a fan-zone atmosphere before kickoff.",
    nearStadium: 'AZT',
  },
  {
    id: 'plaza-liberacion-gdl', name: 'Plaza de la Liberación', address: 'Plaza de la Liberación',
    neighborhood: 'Centro Histórico', city: 'GDL', countries: ['MEX'],
    description: "Guadalajara's historic central plaza, beside the Cathedral. Used for public viewings during major Mexico matches; open-air screen setups expected for WC26.",
  },
  {
    id: 'chapultepec-gdl', name: 'Avenida Chapultepec', address: 'Av. Chapultepec',
    neighborhood: 'Americana', city: 'GDL', countries: ['GEN'],
    description: "Guadalajara's main nightlife strip — dozens of bars, cantinas, and restaurants with screens. Walk the avenue and pick a spot; many open early for European kickoffs.",
  },
  {
    id: 'akron-area-gdl', name: 'Estadio Akron neighborhood', address: 'Periférico Manuel Gómez Morín 5000',
    neighborhood: 'Zapopan', city: 'GDL', countries: ['GEN'],
    description: "Bars and restaurants near the Chivas stadium. Expected match-day fan-zone activity for WC26; specific venues will firm up closer to kickoff.",
    nearStadium: 'AKR',
  },
  {
    id: 'macroplaza-mty', name: 'Macroplaza', address: 'Plaza Zaragoza',
    neighborhood: 'Centro', city: 'MTY', countries: ['MEX'],
    description: "Monterrey's central plaza — one of the largest in the world. Public-viewing setups expected during WC26 home matches, with crowds spilling into surrounding streets.",
  },
  {
    id: 'barrio-antiguo-mty', name: 'Barrio Antiguo', address: 'Barrio Antiguo',
    neighborhood: 'Centro', city: 'MTY', countries: ['GEN'],
    description: "Historic bar district with dozens of pubs, lounges, and live-music venues. Many show matches and stay open late; walkable, dense, easy to find a spot.",
  },
  {
    id: 'bbva-area-mty', name: 'Estadio BBVA neighborhood', address: 'Av. Pablo Livas 2011',
    neighborhood: 'Guadalupe', city: 'MTY', countries: ['GEN'],
    description: "Bars and restaurants around the Monterrey stadium. Expected match-day fan-zone activity for WC26; the area builds out closer to kickoff.",
    nearStadium: 'BBV',
  },
];

window.WC26_WP = { CITIES, WP_COUNTRIES, CITY_THREADS, VENUES, STADIUMS };
