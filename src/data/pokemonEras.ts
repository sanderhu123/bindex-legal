/**
 * Hard-coded Pokémon TCG Era and Set mappings
 * 
 * This file provides reliable, offline-friendly mappings of sets to their eras.
 * Eras are ordered newest first, and sets within each era are also ordered newest first.
 * 
 * Structure matches TCGDEX API organization where sets have a "series" field
 * that corresponds to these era names.
 */

import type { PokemonSet } from '../services/api/pokemonApi';

/**
 * Generate logo URL for a set from TCGDEX
 * Uses the series slug from getSeriesSlugFromId to construct the correct path
 */
function getSetLogoUrl(setId: string, seriesSlug: string): string {
  // Get the actual series slug from our mapping (more reliable)
  const actualSeriesSlug = getSeriesSlugFromId(setId);
  
  // If set has no images, return empty string
  if (actualSeriesSlug === 'NO_IMAGES') {
    return '';
  }
  
  // Use the actual series slug if available, otherwise fall back to provided one
  const series = actualSeriesSlug || seriesSlug;
  
  // NOTE: Logos keep the dot in set IDs (e.g., 'sm3.5'), unlike card images which remove it
  // Sets without a series slug - try direct path
  if (!series) {
    return `https://assets.tcgdex.net/en/${setId}/logo.png`;
  }
  
  // Standard logo URL pattern
  return `https://assets.tcgdex.net/en/${series}/${setId}/logo.png`;
}

/**
 * Generate symbol URL for a set from TCGDEX
 */
function getSetSymbolUrl(setId: string): string {
  const seriesSlug = getSeriesSlugFromId(setId);
  
  // If set has no images, return empty string
  if (seriesSlug === 'NO_IMAGES' || !seriesSlug) {
    return '';
  }
  
  // NOTE: Symbols keep the dot in set IDs (e.g., 'sm3.5'), unlike card images which remove it
  return `https://assets.tcgdex.net/univ/${seriesSlug}/${setId}/symbol.png`;
}

/**
 * Get series slug from set ID for TCGDEX asset URLs.
 * 
 * TCGDEX asset URL format: https://assets.tcgdex.net/{lang}/{series}/{set}/{card}/{quality}.{ext}
 * Some older sets don't need a series prefix (returns empty string for those).
 * 
 * @param setId - The set ID (e.g., 'swsh3', 'cel25', 'base1')
 * @returns The series slug for the asset URL, or empty string if no series needed
 */
/**
 * Convert app set ID to TCGDEX set ID.
 * 
 * Some sets in the app use different IDs than TCGDEX uses.
 * This function maps app set IDs to the correct TCGDEX set IDs.
 * 
 * @param appSetId - The set ID used in the app (e.g., '2021swsh')
 * @returns The TCGDEX set ID (e.g., 'mcd21')
 */
export function getTcgdexSetId(appSetId: string): string {
  // McDonald's collections - app uses year+era format, TCGDEX uses mcdYY format
  const mcdonaldsMapping: Record<string, string> = {
    '2021swsh': 'mcd21',
    '2019sm': 'mcd19',
    '2018sm': 'mcd18',
    '2017sm': 'mcd17',
    '2016xy': 'mcd16',
    '2015xy': 'mcd15',
    '2014xy': 'mcd14',
    '2012bw': 'mcd12',
    '2011bw': 'mcd11',
  };
  
  if (appSetId in mcdonaldsMapping) {
    return mcdonaldsMapping[appSetId];
  }
  
  // All other sets use the same ID in app and TCGDEX
  return appSetId;
}

/**
 * Clean card number for TCGDEX asset URLs.
 * 
 * Promo cards often have card numbers like "SM198", "SWSH123", "SVP196"
 * but TCGDEX expects just the numeric part: "198", "123", "196"
 * 
 * @param cardNumber - The card number (e.g., 'SM198', 'SWSH123', '25')
 * @param setId - The set ID (e.g., 'smp', 'swshp', 'base1')
 * @returns The cleaned card number for TCGDEX URLs
 */
export function cleanCardNumberForTcgdex(cardNumber: string, setId: string): string {
  // Only clean promo card numbers that have set prefixes
  const promoSets = ['mep', 'svp', 'swshp', 'smp', 'xyp', 'bwp', 'hgssp', 'dpp', 'np', 'basep'];
  
  if (!promoSets.includes(setId.toLowerCase())) {
    // Not a promo set, return as-is
    return cardNumber;
  }
  
  // Remove common promo prefixes (case-insensitive)
  // Examples: SM198 → 198, SWSH123 → 123, SVP196 → 196
  const prefixPatterns = [
    /^MEP/i,     // Mega Evolution Promos
    /^SVP?/i,    // SV/SVP Promos
    /^SWSH/i,    // SWSH Promos
    /^SM/i,      // SM Promos
    /^XY/i,      // XY Promos
    /^BW/i,      // BW Promos
    /^HGSS/i,    // HGSS Promos
    /^DP/i,      // DP Promos
  ];
  
  let cleaned = cardNumber;
  for (const pattern of prefixPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '');
      break;
    }
  }
  
  return cleaned || cardNumber; // Return original if cleaning results in empty string
}

export function getSeriesSlugFromId(setId: string): string {
  // === SETS WITHOUT CARD IMAGES ON TCGDEX ===
  // These sets either don't have images, or only have set symbol/logo but no card images
  // Return 'NO_IMAGES' as a special marker so the caller knows not to try fallback URLs
  const noImageSets = [
    // Sets with no images at all
    'wp',           // W Promotional
    'jumbo',        // Jumbo cards
    'ex5.5',        // Poké Card Creator Pack
    'exu',          // Unseen Forces Unown Collection
    'rc',           // Radiant Collection
    'xya',          // Yellow A Alternate (XY)
    'svp',          // SVP Black Star Promos (no logo/symbol in API)
    'mep',          // MEP Black Star Promos
    'P-A',          // Promos-A
    
    // Sets with symbol but no card images
    'bog',          // Best of Game (has symbol, no card images)
    '2021swsh',     // McDonald's 2021 (has logo, no card images)
    
    // All McDonald's sets (verified: no card images on TCGDEX)
    '2014xy',       // McDonald's 2014
    '2015xy',       // McDonald's 2015
    '2016xy',       // McDonald's 2016
    '2017sm',       // McDonald's 2017
    '2018sm',       // McDonald's 2018
    '2019sm',       // McDonald's 2019
    '2011bw',       // McDonald's 2011
    '2012bw',       // McDonald's 2012
    
    // Trainer Kits (tk-*)
    'tk-ex-latio', 'tk-ex-latia', 'tk-ex-p', 'tk-ex-m',
    'tk-dp-l', 'tk-dp-m', 'tk-hs-g', 'tk-hs-r',
    'tk-bw-z', 'tk-bw-e', 'tk-xy-sy', 'tk-xy-n',
    'tk-xy-b', 'tk-xy-w', 'tk-xy-latia', 'tk-xy-latio',
    'tk-xy-p', 'tk-xy-su', 'tk-sm-l', 'tk-sm-r',
  ];
  if (noImageSets.includes(setId)) {
    return 'NO_IMAGES';
  }
  
  // === DECIMAL-POINT MINI-SETS ===
  // These need their dot removed for the URL (sm3.5 → sm35)
  // BUT they still use their parent series (sm, swsh, sv, etc.)
  // The set ID conversion is handled by convertSetIdForUrl()
  // Here we just return the correct series
  if (setId.includes('.')) {
    // Extract series from before the number
    if (setId.startsWith('sm')) return 'sm';
    if (setId.startsWith('swsh')) return 'swsh';
    if (setId.startsWith('sv')) return 'sv';
    if (setId.startsWith('xy')) return 'xy';
    if (setId.startsWith('bw')) return 'bw';
    if (setId.startsWith('ex')) return 'ex';
  }
  
  // === SPECIAL SETS WITH CONFIRMED IMAGES ===
  // Based on TCGDEX API logo/symbol URLs
  
  // Sword & Shield era special sets
  if (setId === 'cel25') return 'swsh';     // Celebrations → swsh series
  if (setId === 'fut2020') return 'swsh';   // Pokémon Futsal → swsh series
  
  // Sun & Moon era special sets
  if (setId === 'det1') return 'sm';        // Detective Pikachu → sm series
  if (setId === 'sm115') return 'sm';       // Hidden Fates → sm series
  if (setId === 'sma') return 'sm';         // Yellow A Alternate → sm series
  
  // XY era special sets
  if (setId === 'g1') return 'xy';          // Generations → xy series
  if (setId === 'dc1') return 'xy';         // Double Crisis → xy series
  
  // Black & White era special sets
  if (setId === 'dv1') return 'bw';         // Dragon Vault → bw series
  
  // Call of Legends has its own series
  if (setId === 'col1') return 'col';       // Call of Legends → col series
  
  // Neo era special sets
  if (setId === 'si1') return 'neo';        // Southern Islands → neo series
  
  // E-Card era special sets
  if (setId === 'sp') return 'ecard';       // Sample → ecard series
  
  // Platinum era special sets
  if (setId === 'ru1') return 'pl';         // Pokémon Rumble → pl series
  
  // Legendary Collection has its own series
  if (setId === 'lc') return 'lc';          // Legendary Collection → lc series
  
  // Note: McDonald's sets are in noImageSets - no card images available
  
  // === PROMO SETS WITH IMAGES ===
  // Based on TCGDEX API logo/symbol URLs showing series path
  if (setId === 'swshp') return 'swsh';     // SWSH Black Star Promos → swsh series
  if (setId === 'smp') return 'sm';         // SM Black Star Promos → sm series
  if (setId === 'xyp') return 'xy';         // XY Black Star Promos → xy series
  if (setId === 'bwp') return 'bw';         // BW Black Star Promos → bw series
  if (setId === 'hgssp') return 'hgss';     // HGSS Black Star Promos → hgss series
  if (setId === 'dpp') return 'dp';         // DP Black Star Promos → dp series
  if (setId === 'np') return 'pop';         // Nintendo Black Star Promos → pop series
  if (setId === 'basep') return 'base';     // Wizards Black Star Promos → base series
  
  // === TCGP (Pokemon TCG Pocket) sets ===
  if (setId === 'A1' || setId === 'A1a' || setId === 'A2' || 
      setId === 'A2a' || setId === 'A2b' || setId === 'A3' ||
      setId === 'A3a' || setId === 'A3b' || setId === 'A4' ||
      setId === 'A4a' || setId === 'B1' || setId === 'B1a') {
    return 'tcgp';
  }
  
  // === STANDARD SERIES (prefix matching) ===
  if (setId.startsWith('me')) return 'me';       // Mega Evolution era
  if (setId.startsWith('sv')) return 'sv';       // Scarlet & Violet era
  if (setId.startsWith('swsh')) return 'swsh';   // Sword & Shield era
  if (setId.startsWith('sm')) return 'sm';       // Sun & Moon era
  if (setId.startsWith('xy')) return 'xy';       // XY era
  if (setId.startsWith('bw')) return 'bw';       // Black & White era
  if (setId.startsWith('hgss')) return 'hgss';   // HeartGold & SoulSilver era
  if (setId.startsWith('pl')) return 'pl';       // Platinum era
  if (setId.startsWith('dp')) return 'dp';       // Diamond & Pearl era
  if (setId.startsWith('ex')) return 'ex';       // EX era
  if (setId.startsWith('ecard')) return 'ecard'; // E-Card era
  if (setId.startsWith('pop')) return 'pop';     // POP Series
  
  // === CLASSIC SETS (have their own series names) ===
  if (setId.startsWith('neo')) return 'neo';     // Neo era
  if (setId.startsWith('gym')) return 'gym';     // Gym era
  if (setId.startsWith('base')) return 'base';   // Base era
  
  // Fallback: return empty string
  return '';
}

/**
 * Convert set ID to the format used in TCGDEX URLs.
 * 
 * - Removes dots from mini-set IDs (sm3.5 → sm35)
 * - Maps app set IDs to TCGDEX set IDs where different
 * 
 * @param setId - The set ID (e.g., 'sm3.5', '2021swsh')
 * @returns The set ID formatted for TCGDEX URLs
 */
export function convertSetIdForUrl(setId: string): string {
  // Remove dots from mini-set IDs
  if (setId.includes('.')) {
    return setId.replace('.', '');
  }
  
  return setId;
}

/**
 * Era definition with ordered sets (newest first)
 */
export interface EraDefinition {
  id: string;
  name: string; // This matches the "series" field in API responses
  logo?: string; // Era logo URL
  sets: SetDefinition[];
}

/**
 * Set definition with basic information
 */
export interface SetDefinition {
  id: string;
  name: string;
  releaseDate: string;
  logo?: string;
  symbol?: string;
}

/**
 * Complete era and set definitions
 * Ordered: Newest era first, newest sets first within each era
 */
export const POKEMON_ERAS: EraDefinition[] = [
  // Mega Evolution Era (2025-present)
  {
    id: 'mega-evolution',
    name: 'Mega Evolution',
    // Note: TCGDEX doesn't have era logos, only set logos
    sets: [
      { id: 'me02', name: 'Phantasmal Flames', releaseDate: '2025-11-14' },
      { id: 'me01', name: 'Mega Evolution', releaseDate: '2025-09-26' },
    ],
  },
  
  // Scarlet & Violet Era (2023-2025)
  {
    id: 'scarlet-violet',
    name: 'Scarlet & Violet',
    sets: [
      { id: 'sv10.5b', name: 'Black Bolt', releaseDate: '2025-07-18' },
      { id: 'sv10.5w', name: 'White Flare', releaseDate: '2025-07-18' },
      { id: 'sv10', name: 'Destined Rivals', releaseDate: '2025-05-30' },
      { id: 'sv09', name: 'Journey Together', releaseDate: '2025-03-28' },
      { id: 'sv08.5', name: 'Prismatic Evolutions', releaseDate: '2025-01-17' },
      { id: 'sv08', name: 'Surging Sparks', releaseDate: '2024-11-08' },
      { id: 'sv07', name: 'Stellar Crown', releaseDate: '2024-09-13' },
      { id: 'sv06.5', name: 'Shrouded Fable', releaseDate: '2024-08-02' },
      { id: 'sv06', name: 'Twilight Masquerade', releaseDate: '2024-05-24' },
      { id: 'sv05', name: 'Temporal Forces', releaseDate: '2024-03-22' },
      { id: 'sv04.5', name: 'Paldean Fates', releaseDate: '2024-01-26' },
      { id: 'sv04', name: 'Paradox Rift', releaseDate: '2023-11-03' },
      { id: 'sv03.5', name: '151', releaseDate: '2023-09-22' },
      { id: 'sv03', name: 'Obsidian Flames', releaseDate: '2023-08-11' },
      { id: 'sv02', name: 'Paldea Evolved', releaseDate: '2023-06-09' },
      { id: 'sv01', name: 'Scarlet & Violet', releaseDate: '2023-03-31' },
    ],
  },
  
  // Sword & Shield Era (2020-2023)
  {
    id: 'sword-shield',
    name: 'Sword & Shield',
    sets: [
      { id: 'swsh12.5', name: 'Crown Zenith', releaseDate: '2023-01-20' },
      { id: 'swsh12', name: 'Silver Tempest', releaseDate: '2022-11-11' },
      { id: 'swsh11', name: 'Lost Origin', releaseDate: '2022-09-09' },
      { id: 'swsh10.5', name: 'Pokémon GO', releaseDate: '2022-07-01' },
      { id: 'swsh10', name: 'Astral Radiance', releaseDate: '2022-05-27' },
      { id: 'swsh9', name: 'Brilliant Stars', releaseDate: '2022-02-25' },
      { id: 'swsh8', name: 'Fusion Strike', releaseDate: '2021-11-12' },
      { id: 'cel25', name: 'Celebrations', releaseDate: '2021-10-08' },
      { id: 'swsh7', name: 'Evolving Skies', releaseDate: '2021-08-27' },
      { id: 'swsh6', name: 'Chilling Reign', releaseDate: '2021-06-18' },
      { id: 'swsh5', name: 'Battle Styles', releaseDate: '2021-03-19' },
      { id: 'swsh4.5', name: 'Shining Fates', releaseDate: '2021-02-19' },
      { id: 'swsh4', name: 'Vivid Voltage', releaseDate: '2020-11-13' },
      { id: 'swsh3.5', name: "Champion's Path", releaseDate: '2020-09-25' },
      { id: 'swsh3', name: 'Darkness Ablaze', releaseDate: '2020-08-14' },
      { id: 'swsh2', name: 'Rebel Clash', releaseDate: '2020-05-01' },
      { id: 'swsh1', name: 'Sword & Shield', releaseDate: '2020-02-07' },
    ],
  },
  
  // Sun & Moon Era (2017-2020)
  {
    id: 'sun-moon',
    name: 'Sun & Moon',
    sets: [
      { id: 'sm12', name: 'Cosmic Eclipse', releaseDate: '2019-11-01' },
      { id: 'sm115', name: 'Hidden Fates', releaseDate: '2019-08-23' },
      { id: 'sm11', name: 'Unified Minds', releaseDate: '2019-08-02' },
      { id: 'sm10', name: 'Unbroken Bonds', releaseDate: '2019-05-03' },
      { id: 'det1', name: 'Detective Pikachu', releaseDate: '2019-04-05' },
      { id: 'sm9', name: 'Team Up', releaseDate: '2019-02-01' },
      { id: 'sm8', name: 'Lost Thunder', releaseDate: '2018-11-02' },
      { id: 'sm7.5', name: 'Dragon Majesty', releaseDate: '2018-09-07' },
      { id: 'sm7', name: 'Celestial Storm', releaseDate: '2018-08-03' },
      { id: 'sm6', name: 'Forbidden Light', releaseDate: '2018-05-04' },
      { id: 'sm5', name: 'Ultra Prism', releaseDate: '2018-02-02' },
      { id: 'sm4', name: 'Crimson Invasion', releaseDate: '2017-11-03' },
      { id: 'sm3.5', name: 'Shining Legends', releaseDate: '2017-10-06' },
      { id: 'sm3', name: 'Burning Shadows', releaseDate: '2017-08-04' },
      { id: 'sm2', name: 'Guardians Rising', releaseDate: '2017-05-05' },
      { id: 'sm1', name: 'Sun & Moon', releaseDate: '2017-02-03' },
    ],
  },
  
  // XY Era (2013-2017)
  {
    id: 'xy',
    name: 'XY',
    sets: [
      { id: 'xy12', name: 'Evolutions', releaseDate: '2016-11-02' },
      { id: 'xy11', name: 'Steam Siege', releaseDate: '2016-08-03' },
      { id: 'xy10', name: 'Fates Collide', releaseDate: '2016-05-04' },
      { id: 'g1', name: 'Generations', releaseDate: '2016-02-22' },
      { id: 'xy9', name: 'BREAKpoint', releaseDate: '2016-02-03' },
      { id: 'xy8', name: 'BREAKthrough', releaseDate: '2015-11-04' },
      { id: 'xy7', name: 'Ancient Origins', releaseDate: '2015-08-12' },
      { id: 'xy6', name: 'Roaring Skies', releaseDate: '2015-05-06' },
      { id: 'dc1', name: 'Double Crisis', releaseDate: '2015-03-25' },
      { id: 'xy5', name: 'Primal Clash', releaseDate: '2015-02-04' },
      { id: 'xy4', name: 'Phantom Forces', releaseDate: '2014-11-05' },
      { id: 'xy3', name: 'Furious Fists', releaseDate: '2014-08-13' },
      { id: 'xy2', name: 'Flashfire', releaseDate: '2014-05-07' },
      { id: 'xy1', name: 'XY', releaseDate: '2014-02-05' },
      { id: 'xy0', name: 'Kalos Starter Set', releaseDate: '2013-11-08' },
    ],
  },
  
  // Black & White Era (2011-2013)
  {
    id: 'black-white',
    name: 'Black & White',
    sets: [
      { id: 'bw11', name: 'Legendary Treasures', releaseDate: '2013-11-08' },
      { id: 'rc', name: 'Radiant Collection', releaseDate: '2013-11-08' },
      { id: 'bw10', name: 'Plasma Blast', releaseDate: '2013-08-14' },
      { id: 'bw9', name: 'Plasma Freeze', releaseDate: '2013-05-08' },
      { id: 'bw8', name: 'Plasma Storm', releaseDate: '2013-02-06' },
      { id: 'dv1', name: 'Dragon Vault', releaseDate: '2012-10-05' },
      { id: 'bw7', name: 'Boundaries Crossed', releaseDate: '2012-11-07' },
      { id: 'bw6', name: 'Dragons Exalted', releaseDate: '2012-08-15' },
      { id: 'bw5', name: 'Dark Explorers', releaseDate: '2012-05-09' },
      { id: 'bw4', name: 'Next Destinies', releaseDate: '2012-02-08' },
      { id: 'bw3', name: 'Noble Victories', releaseDate: '2011-11-16' },
      { id: 'bw2', name: 'Emerging Powers', releaseDate: '2011-08-31' },
      { id: 'bw1', name: 'Black & White', releaseDate: '2011-04-25' },
    ],
  },
  
  // HeartGold & SoulSilver Era (2010-2011)
  {
    id: 'heartgold-soulsilver',
    name: 'HeartGold & SoulSilver',
    sets: [
      { id: 'col1', name: 'Call of Legends', releaseDate: '2011-02-09' },
      { id: 'hgss4', name: 'Triumphant', releaseDate: '2010-11-03' },
      { id: 'hgss3', name: 'Undaunted', releaseDate: '2010-08-18' },
      { id: 'hgss2', name: 'Unleashed', releaseDate: '2010-05-12' },
      { id: 'hgss1', name: 'HeartGold & SoulSilver', releaseDate: '2010-02-10' },
    ],
  },
  
  // Platinum Era (2009-2010)
  {
    id: 'platinum',
    name: 'Platinum',
    sets: [
      { id: 'pl4', name: 'Arceus', releaseDate: '2009-11-04' },
      { id: 'pl3', name: 'Supreme Victors', releaseDate: '2009-08-19' },
      { id: 'pl2', name: 'Rising Rivals', releaseDate: '2009-05-20' },
      { id: 'pl1', name: 'Platinum', releaseDate: '2009-02-11' },
    ],
  },
  
  // Diamond & Pearl Era (2007-2009)
  {
    id: 'diamond-pearl',
    name: 'Diamond & Pearl',
    sets: [
      { id: 'dp7', name: 'Stormfront', releaseDate: '2008-11-05' },
      { id: 'dp6', name: 'Legends Awakened', releaseDate: '2008-08-20' },
      { id: 'dp5', name: 'Majestic Dawn', releaseDate: '2008-05-21' },
      { id: 'dp4', name: 'Great Encounters', releaseDate: '2008-02-13' },
      { id: 'dp3', name: 'Secret Wonders', releaseDate: '2007-11-07' },
      { id: 'dp2', name: 'Mysterious Treasures', releaseDate: '2007-08-22' },
      { id: 'dp1', name: 'Diamond & Pearl', releaseDate: '2007-05-23' },
    ],
  },
  
  // EX Era (2003-2007)
  {
    id: 'ex',
    name: 'EX',
    sets: [
      { id: 'ex16', name: 'Power Keepers', releaseDate: '2007-02-14' },
      { id: 'ex15', name: 'Dragon Frontiers', releaseDate: '2006-11-08' },
      { id: 'ex14', name: 'Crystal Guardians', releaseDate: '2006-08-30' },
      { id: 'ex13', name: 'Holon Phantoms', releaseDate: '2006-05-03' },
      { id: 'ex12', name: 'Legend Maker', releaseDate: '2006-02-13' },
      { id: 'ex11', name: 'Delta Species', releaseDate: '2005-10-31' },
      { id: 'ex10', name: 'Unseen Forces', releaseDate: '2005-08-22' },
      { id: 'ex9', name: 'Emerald', releaseDate: '2005-05-09' },
      { id: 'ex8', name: 'Deoxys', releaseDate: '2005-02-14' },
      { id: 'ex7', name: 'Team Rocket Returns', releaseDate: '2004-11-08' },
      { id: 'ex6', name: 'FireRed & LeafGreen', releaseDate: '2004-09-29' },
      { id: 'ex5', name: 'Hidden Legends', releaseDate: '2004-06-01' },
      { id: 'ex4', name: 'Team Magma vs Team Aqua', releaseDate: '2004-03-15' },
      { id: 'ex3', name: 'Dragon', releaseDate: '2003-11-24' },
      { id: 'ex2', name: 'Sandstorm', releaseDate: '2003-09-17' },
      { id: 'ex1', name: 'Ruby & Sapphire', releaseDate: '2003-06-18' },
    ],
  },
  
  // E-Card Era (2002-2003)
  {
    id: 'ecard',
    name: 'E-Card',
    sets: [
      { id: 'ecard3', name: 'Skyridge', releaseDate: '2003-05-12' },
      { id: 'ecard2', name: 'Aquapolis', releaseDate: '2003-01-15' },
      { id: 'ecard1', name: 'Expedition Base Set', releaseDate: '2002-09-15' },
    ],
  },
  
  // Legendary Collection Era (2002)
  {
    id: 'legendary-collection',
    name: 'Legendary Collection',
    sets: [
      { id: 'lc', name: 'Legendary Collection', releaseDate: '2002-05-24' },
    ],
  },
  
  // Neo Era (2000-2002)
  {
    id: 'neo',
    name: 'Neo',
    sets: [
      { id: 'neo4', name: 'Neo Destiny', releaseDate: '2002-02-28' },
      { id: 'neo3', name: 'Neo Revelation', releaseDate: '2001-09-21' },
      { id: 'neo2', name: 'Neo Discovery', releaseDate: '2001-06-16' },
      { id: 'neo1', name: 'Neo Genesis', releaseDate: '2000-12-16' },
    ],
  },
  
  // Southern Islands (2001)
  {
    id: 'southern-islands',
    name: 'Southern Islands',
    sets: [
      { id: 'si1', name: 'Southern Islands', releaseDate: '2001-07-31' },
    ],
  },
  
  // Gym Era (2000)
  {
    id: 'gym',
    name: 'Gym',
    sets: [
      { id: 'gym2', name: 'Gym Challenge', releaseDate: '2000-10-16' },
      { id: 'gym1', name: 'Gym Heroes', releaseDate: '2000-08-14' },
    ],
  },
  
  // Base Era (1999-2000)
  {
    id: 'base',
    name: 'Base',
    sets: [
      { id: 'base4', name: 'Base Set 2', releaseDate: '2000-02-24' },
      { id: 'base5', name: 'Team Rocket', releaseDate: '2000-04-24' },
      { id: 'base3', name: 'Fossil', releaseDate: '1999-10-10' },
      { id: 'base2', name: 'Jungle', releaseDate: '1999-06-16' },
      { id: 'base1', name: 'Base Set', releaseDate: '1999-01-09' },
    ],
  },
  
  // POP Series (2004-2008)
  {
    id: 'pop',
    name: 'POP Series',
    sets: [
      { id: 'pop9', name: 'POP Series 9', releaseDate: '2008-03-01' },
      { id: 'pop8', name: 'POP Series 8', releaseDate: '2007-09-01' },
      { id: 'pop7', name: 'POP Series 7', releaseDate: '2007-03-01' },
      { id: 'pop6', name: 'POP Series 6', releaseDate: '2006-09-01' },
      { id: 'pop5', name: 'POP Series 5', releaseDate: '2006-03-01' },
      { id: 'pop4', name: 'POP Series 4', releaseDate: '2005-08-01' },
      { id: 'pop3', name: 'POP Series 3', releaseDate: '2005-04-01' },
      { id: 'pop2', name: 'POP Series 2', releaseDate: '2004-09-01' },
      { id: 'pop1', name: 'POP Series 1', releaseDate: '2004-03-01' },
    ],
  },
  
  // Promotional Sets (Various Years)
  {
    id: 'promos',
    name: 'Promotional Sets',
    // Note: Promos don't have a unified logo, using generic symbol placeholder
    sets: [
      { id: 'mep', name: 'MEP Black Star Promos', releaseDate: '2025-09-26' },
      { id: 'svp', name: 'SVP Black Star Promos', releaseDate: '2023-03-31' },
      { id: '2021swsh', name: "Macdonald's Collection 2021", releaseDate: '2021-01-01' },
      { id: 'fut2020', name: 'Pokémon Futsal 2020', releaseDate: '2020-01-01' },
      { id: 'swshp', name: 'SWSH Black Star Promos', releaseDate: '2020-02-07' },
      { id: '2019sm', name: "Macdonald's Collection 2019", releaseDate: '2019-01-01' },
      { id: 'sma', name: 'Yellow A Alternate', releaseDate: '2018-01-01' },
      { id: '2018sm', name: "Macdonald's Collection 2018", releaseDate: '2018-01-01' },
      { id: '2017sm', name: "Macdonald's Collection 2017", releaseDate: '2017-01-01' },
      { id: 'smp', name: 'SM Black Star Promos', releaseDate: '2017-02-03' },
      { id: '2016xy', name: "Macdonald's Collection 2016", releaseDate: '2016-01-01' },
      { id: '2015xy', name: "Macdonald's Collection 2015", releaseDate: '2015-01-01' },
      { id: '2014xy', name: "Macdonald's Collection 2014", releaseDate: '2014-01-01' },
      { id: 'xyp', name: 'XY Black Star Promos', releaseDate: '2014-02-05' },
      { id: 'xya', name: 'Yello A Alternate', releaseDate: '2014-01-01' },
      { id: '2012bw', name: "Macdonald's Collection 2012", releaseDate: '2012-01-01' },
      { id: '2011bw', name: "Macdonald's Collection 2011", releaseDate: '2011-01-01' },
      { id: 'ru1', name: 'Pokémon Rumble', releaseDate: '2009-12-16' },
      { id: 'bwp', name: 'BW Black Star Promos', releaseDate: '2011-04-25' },
      { id: 'hgssp', name: 'HGSS Black Star Promos', releaseDate: '2010-02-10' },
      { id: 'dpp', name: 'DP Black Star Promos', releaseDate: '2007-05-23' },
      { id: 'bog', name: 'Best of Game', releaseDate: '2002-09-15' },
      { id: 'np', name: 'Nintendo Black Star Promos', releaseDate: '2003-06-18' },
      { id: 'basep', name: 'Wizards Black Star Promos', releaseDate: '1999-01-09' },
      { id: 'wp', name: 'W Promotional', releaseDate: '1999-01-01' },
      { id: 'sp', name: 'Sample', releaseDate: '2002-09-15' },
      { id: 'jumbo', name: 'Jumbo cards', releaseDate: '1999-01-01' },
    ],
  },
];

/**
 * Get all eras ordered newest first
 */
export function getEras(): Array<{ id: string; name: string; logo?: string }> {
  return POKEMON_ERAS.map(era => ({
    id: era.id,
    name: era.name,
    logo: era.logo,
  }));
}

/**
 * Get sets for a specific era, ordered newest first
 */
export function getSetsByEra(eraName: string): SetDefinition[] {
  const era = POKEMON_ERAS.find(e => e.name === eraName);
  return era ? [...era.sets] : [];
}

/**
 * Get all sets from all eras, ordered by era (newest first) and within era (newest first)
 */
export function getAllSets(): SetDefinition[] {
  return POKEMON_ERAS.flatMap(era => era.sets);
}

/**
 * Find which era a set belongs to by set name
 */
export function getEraForSet(setName: string): string | null {
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.name === setName);
    if (set) {
      return era.name;
    }
  }
  return null;
}

/**
 * Get the logo URL for a set by its name
 */
export function getSetLogoByName(setName: string): string | null {
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.name === setName);
    if (set) {
      const seriesSlug = getSeriesSlugFromId(set.id);
      return set.logo || getSetLogoUrl(set.id, seriesSlug);
    }
  }
  return null;
}

/**
 * Find which era a set belongs to by set ID
 */
export function getEraForSetId(setId: string): string | null {
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.id === setId);
    if (set) {
      return era.name;
    }
  }
  return null;
}

/**
 * Convert SetDefinition to PokemonSet format
 */
export function convertSetToPokemonSet(setDef: SetDefinition, eraName: string): PokemonSet {
  const seriesSlug = getSeriesSlugFromId(setDef.id);
  
  return {
    id: setDef.id,
    name: setDef.name,
    series: eraName,
    releaseDate: setDef.releaseDate,
    logo: setDef.logo || getSetLogoUrl(setDef.id, seriesSlug),
    symbol: setDef.symbol || getSetSymbolUrl(setDef.id),
  };
}

// ==================== SET RELEASE DATE LOOKUP ====================

/**
 * Build a lookup map from set name → release date
 * Used for sorting search results by set release date
 */
const setReleaseDateMap: Map<string, string> = new Map();

// Build the map once at module load time
for (const era of POKEMON_ERAS) {
  for (const set of era.sets) {
    setReleaseDateMap.set(set.name.toLowerCase(), set.releaseDate);
    // Also add by set ID for fallback
    setReleaseDateMap.set(set.id.toLowerCase(), set.releaseDate);
  }
}

/**
 * Get the release date for a set by name or ID
 * Returns null if set not found (will sort to end)
 */
export function getSetReleaseDate(setNameOrId: string): string | null {
  if (!setNameOrId) return null;
  const key = setNameOrId.toLowerCase();
  return setReleaseDateMap.get(key) || null;
}

/**
 * Sort cards by set release date (newest first)
 * Cards from unknown sets are placed at the end
 * 
 * @param cards - Array of cards to sort
 * @returns New sorted array (doesn't mutate original)
 */
export function sortCardsBySetDate<T extends { set?: string; id?: string }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => {
    // Try to get release date from set name first, then from card ID prefix
    const dateA = getSetReleaseDate(a.set || '') || 
                  getSetReleaseDate(a.id?.split('-')[0] || '') ||
                  '1900-01-01'; // Unknown sets go to end
    const dateB = getSetReleaseDate(b.set || '') || 
                  getSetReleaseDate(b.id?.split('-')[0] || '') ||
                  '1900-01-01';
    
    // Sort descending (newest first)
    return dateB.localeCompare(dateA);
  });
}

