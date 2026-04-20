/**
 * Hard-coded Pokémon TCG Era and Set mappings
 * 
 * This file provides reliable, offline-friendly mappings of sets to their eras.
 * Eras are ordered newest first, and sets within each era are also ordered newest first.
 */

import type { PokemonSet } from '../services/api/pokemonApi';

/**
 * Mapping of app set IDs to pokemontcg.io set IDs (only for IDs that differ).
 * Sets not listed here use the same ID on both platforms.
 *
 * As of the rebuild against the Supabase pokemon_sets table, the static list
 * uses pokemontcg.io / DB IDs directly, so this mapping is intentionally empty.
 * Add entries here only if a future divergence requires it.
 */
const APP_TO_POKEMONTCGIO: Record<string, string> = {};

/**
 * Reverse mapping: pokemontcg.io set ID → app set ID.
 * Built automatically from the forward mapping.
 */
const POKEMONTCGIO_TO_APP: Record<string, string> = {};
for (const [appId, ptcgio] of Object.entries(APP_TO_POKEMONTCGIO)) {
  POKEMONTCGIO_TO_APP[ptcgio] = appId;
}

/**
 * Convert an app set ID to the pokemontcg.io set ID.
 */
export function getPtcgioSetId(appSetId: string): string {
  return APP_TO_POKEMONTCGIO[appSetId] || appSetId;
}

/**
 * Convert a pokemontcg.io set ID back to the app set ID.
 */
export function getAppSetId(ptcgioSetId: string): string {
  return POKEMONTCGIO_TO_APP[ptcgioSetId] || ptcgioSetId;
}

// ==================== SET IMAGE URL CACHE ====================

/**
 * Runtime cache for set logo/symbol URLs loaded from Supabase.
 * Populated by registerSetImageUrls() when sets are fetched.
 */
const setImageCache = new Map<string, { logo?: string; symbol?: string }>();

/**
 * Register logo/symbol URLs for sets (called when sets are loaded from Supabase or API).
 * This populates the cache so getSetLogoByName/getSetSymbolByName can look them up.
 */
export function registerSetImageUrls(sets: Array<{ name: string; logo?: string; symbol?: string }>): void {
  for (const set of sets) {
    if (set.logo || set.symbol) {
      const existing = setImageCache.get(set.name) || {};
      setImageCache.set(set.name, {
        logo: set.logo || existing.logo,
        symbol: set.symbol || existing.symbol,
      });
    }
  }
}

/**
 * Build a pokemontcg.io logo URL for a set as a fallback.
 */
function getPokemontcgioLogoUrl(setId: string): string {
  const ptcgioId = getPtcgioSetId(setId);
  return `https://images.pokemontcg.io/${ptcgioId}/logo.png`;
}

/**
 * Build a pokemontcg.io symbol URL for a set as a fallback.
 */
function getPokemontcgioSymbolUrl(setId: string): string {
  const ptcgioId = getPtcgioSetId(setId);
  return `https://images.pokemontcg.io/${ptcgioId}/symbol.png`;
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
    sets: [
      { id: 'me3', name: 'Perfect Order', releaseDate: '2026-03-27', logo: 'https://images.scrydex.com/pokemon/me3-logo/logo', symbol: 'https://images.scrydex.com/pokemon/me3-symbol/symbol' },
      { id: 'me2pt5', name: 'Ascended Heroes', releaseDate: '2026-01-30', logo: 'https://images.scrydex.com/pokemon/me2pt5-logo/logo', symbol: 'https://images.scrydex.com/pokemon/me2pt5-symbol/symbol' },
      { id: 'me2', name: 'Phantasmal Flames', releaseDate: '2025-11-14' },
      { id: 'me1', name: 'Mega Evolution', releaseDate: '2025-09-26' },
    ],
  },

  // Scarlet & Violet Era (2023-2025)
  {
    id: 'scarlet-violet',
    name: 'Scarlet & Violet',
    sets: [
      { id: 'zsv10pt5', name: 'Black Bolt', releaseDate: '2025-07-18' },
      { id: 'rsv10pt5', name: 'White Flare', releaseDate: '2025-07-18' },
      { id: 'sv10', name: 'Destined Rivals', releaseDate: '2025-05-30' },
      { id: 'sv9', name: 'Journey Together', releaseDate: '2025-03-28' },
      { id: 'sv8pt5', name: 'Prismatic Evolutions', releaseDate: '2025-01-17' },
      { id: 'sv8', name: 'Surging Sparks', releaseDate: '2024-11-08' },
      { id: 'sv7', name: 'Stellar Crown', releaseDate: '2024-09-13' },
      { id: 'sv6pt5', name: 'Shrouded Fable', releaseDate: '2024-08-02' },
      { id: 'sv6', name: 'Twilight Masquerade', releaseDate: '2024-05-24' },
      { id: 'sv5', name: 'Temporal Forces', releaseDate: '2024-03-22' },
      { id: 'sv4pt5', name: 'Paldean Fates', releaseDate: '2024-01-26' },
      { id: 'sv4', name: 'Paradox Rift', releaseDate: '2023-11-03' },
      { id: 'sv3pt5', name: '151', releaseDate: '2023-09-22' },
      { id: 'sv3', name: 'Obsidian Flames', releaseDate: '2023-08-11' },
      { id: 'sv2', name: 'Paldea Evolved', releaseDate: '2023-06-09' },
      { id: 'sv1', name: 'Scarlet & Violet', releaseDate: '2023-03-31' },
      { id: 'sve', name: 'Scarlet & Violet Energies', releaseDate: '2023-03-31' },
    ],
  },

  // Sword & Shield Era (2020-2023)
  {
    id: 'sword-shield',
    name: 'Sword & Shield',
    sets: [
      { id: 'swsh12pt5', name: 'Crown Zenith', releaseDate: '2023-01-20' },
      { id: 'swsh12', name: 'Silver Tempest', releaseDate: '2022-11-11' },
      { id: 'swsh11', name: 'Lost Origin', releaseDate: '2022-09-09' },
      { id: 'pgo', name: 'Pokémon GO', releaseDate: '2022-07-01' },
      { id: 'swsh10', name: 'Astral Radiance', releaseDate: '2022-05-27' },
      { id: 'swsh9', name: 'Brilliant Stars', releaseDate: '2022-02-25' },
      { id: 'swsh8', name: 'Fusion Strike', releaseDate: '2021-11-12' },
      { id: 'cel25', name: 'Celebrations', releaseDate: '2021-10-08' },
      { id: 'swsh7', name: 'Evolving Skies', releaseDate: '2021-08-27' },
      { id: 'swsh6', name: 'Chilling Reign', releaseDate: '2021-06-18' },
      { id: 'swsh5', name: 'Battle Styles', releaseDate: '2021-03-19' },
      { id: 'swsh45', name: 'Shining Fates', releaseDate: '2021-02-19' },
      { id: 'swsh4', name: 'Vivid Voltage', releaseDate: '2020-11-13' },
      { id: 'swsh35', name: "Champion's Path", releaseDate: '2020-09-25' },
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
      { id: 'sm75', name: 'Dragon Majesty', releaseDate: '2018-09-07' },
      { id: 'sm7', name: 'Celestial Storm', releaseDate: '2018-08-03' },
      { id: 'sm6', name: 'Forbidden Light', releaseDate: '2018-05-04' },
      { id: 'sm5', name: 'Ultra Prism', releaseDate: '2018-02-02' },
      { id: 'sm4', name: 'Crimson Invasion', releaseDate: '2017-11-03' },
      { id: 'sm35', name: 'Shining Legends', releaseDate: '2017-10-06' },
      { id: 'sm3', name: 'Burning Shadows', releaseDate: '2017-08-05' },
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
      { id: 'xy10', name: 'Fates Collide', releaseDate: '2016-05-02' },
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
      { id: 'bw11', name: 'Legendary Treasures', releaseDate: '2013-11-06' },
      { id: 'bw10', name: 'Plasma Blast', releaseDate: '2013-08-14' },
      { id: 'bw9', name: 'Plasma Freeze', releaseDate: '2013-05-08' },
      { id: 'bw8', name: 'Plasma Storm', releaseDate: '2013-02-06' },
      { id: 'bw7', name: 'Boundaries Crossed', releaseDate: '2012-11-07' },
      { id: 'dv1', name: 'Dragon Vault', releaseDate: '2012-10-05' },
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
      { id: 'hgss4', name: 'HS—Triumphant', releaseDate: '2010-11-03' },
      { id: 'hgss3', name: 'HS—Undaunted', releaseDate: '2010-08-18' },
      { id: 'hgss2', name: 'HS—Unleashed', releaseDate: '2010-05-12' },
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
      { id: 'pl2', name: 'Rising Rivals', releaseDate: '2009-05-16' },
      { id: 'pl1', name: 'Platinum', releaseDate: '2009-02-11' },
    ],
  },

  // Diamond & Pearl Era (2007-2009)
  {
    id: 'diamond-pearl',
    name: 'Diamond & Pearl',
    sets: [
      { id: 'dp7', name: 'Stormfront', releaseDate: '2008-11-01' },
      { id: 'dp6', name: 'Legends Awakened', releaseDate: '2008-08-01' },
      { id: 'dp5', name: 'Majestic Dawn', releaseDate: '2008-05-01' },
      { id: 'dp4', name: 'Great Encounters', releaseDate: '2008-02-01' },
      { id: 'dp3', name: 'Secret Wonders', releaseDate: '2007-11-01' },
      { id: 'dp2', name: 'Mysterious Treasures', releaseDate: '2007-08-01' },
      { id: 'dp1', name: 'Diamond & Pearl', releaseDate: '2007-05-01' },
    ],
  },

  // EX Era (2003-2007)
  {
    id: 'ex',
    name: 'EX',
    sets: [
      { id: 'ex16', name: 'Power Keepers', releaseDate: '2007-02-02' },
      { id: 'ex15', name: 'Dragon Frontiers', releaseDate: '2006-11-01' },
      { id: 'ex14', name: 'Crystal Guardians', releaseDate: '2006-08-01' },
      { id: 'ex13', name: 'Holon Phantoms', releaseDate: '2006-05-01' },
      { id: 'tk2b', name: 'EX Trainer Kit 2 Minun', releaseDate: '2006-03-01' },
      { id: 'tk2a', name: 'EX Trainer Kit 2 Plusle', releaseDate: '2006-03-01' },
      { id: 'ex12', name: 'Legend Maker', releaseDate: '2006-02-01' },
      { id: 'ex11', name: 'Delta Species', releaseDate: '2005-10-31' },
      { id: 'ex10', name: 'Unseen Forces', releaseDate: '2005-08-01' },
      { id: 'ex9', name: 'Emerald', releaseDate: '2005-05-01' },
      { id: 'ex8', name: 'Deoxys', releaseDate: '2005-02-01' },
      { id: 'ex7', name: 'Team Rocket Returns', releaseDate: '2004-11-01' },
      { id: 'ex6', name: 'FireRed & LeafGreen', releaseDate: '2004-09-01' },
      { id: 'tk1a', name: 'EX Trainer Kit Latias', releaseDate: '2004-06-01' },
      { id: 'tk1b', name: 'EX Trainer Kit Latios', releaseDate: '2004-06-01' },
      { id: 'ex5', name: 'Hidden Legends', releaseDate: '2004-06-01' },
      { id: 'ex4', name: 'Team Magma vs Team Aqua', releaseDate: '2004-03-01' },
      { id: 'ex3', name: 'Dragon', releaseDate: '2003-11-24' },
      { id: 'ex2', name: 'Sandstorm', releaseDate: '2003-09-18' },
      { id: 'ex1', name: 'Ruby & Sapphire', releaseDate: '2003-07-01' },
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
      { id: 'base6', name: 'Legendary Collection', releaseDate: '2002-05-24' },
    ],
  },

  // Neo Era (2000-2002)
  {
    id: 'neo',
    name: 'Neo',
    sets: [
      { id: 'neo4', name: 'Neo Destiny', releaseDate: '2002-02-28' },
      { id: 'neo3', name: 'Neo Revelation', releaseDate: '2001-09-21' },
      { id: 'neo2', name: 'Neo Discovery', releaseDate: '2001-06-01' },
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
      { id: 'base5', name: 'Team Rocket', releaseDate: '2000-04-24' },
      { id: 'base4', name: 'Base Set 2', releaseDate: '2000-02-24' },
      { id: 'base3', name: 'Fossil', releaseDate: '1999-10-10' },
      { id: 'base2', name: 'Jungle', releaseDate: '1999-06-16' },
      { id: 'base1', name: 'Base', releaseDate: '1999-01-09' },
    ],
  },

  // POP Series (2004-2009)
  {
    id: 'pop',
    name: 'POP Series',
    sets: [
      { id: 'pop9', name: 'POP Series 9', releaseDate: '2009-03-01' },
      { id: 'pop8', name: 'POP Series 8', releaseDate: '2008-09-01' },
      { id: 'pop7', name: 'POP Series 7', releaseDate: '2008-03-01' },
      { id: 'pop6', name: 'POP Series 6', releaseDate: '2007-09-01' },
      { id: 'pop5', name: 'POP Series 5', releaseDate: '2007-03-01' },
      { id: 'pop4', name: 'POP Series 4', releaseDate: '2006-08-01' },
      { id: 'pop3', name: 'POP Series 3', releaseDate: '2006-04-01' },
      { id: 'pop2', name: 'POP Series 2', releaseDate: '2005-08-01' },
      { id: 'pop1', name: 'POP Series 1', releaseDate: '2004-09-01' },
    ],
  },

  // Promotional Sets (Various Years)
  // All real promo sets present in the Supabase pokemon_sets table.
  {
    id: 'promos',
    name: 'Promotional Sets',
    sets: [
      { id: 'svp', name: 'Scarlet & Violet Black Star Promos', releaseDate: '2023-01-01' },
      { id: 'fut20', name: 'Pokémon Futsal Collection', releaseDate: '2020-09-11' },
      { id: 'swshp', name: 'SWSH Black Star Promos', releaseDate: '2019-11-15' },
      { id: 'smp', name: 'SM Black Star Promos', releaseDate: '2017-02-03' },
      { id: 'xyp', name: 'XY Black Star Promos', releaseDate: '2013-10-12' },
      { id: 'bwp', name: 'BW Black Star Promos', releaseDate: '2011-03-01' },
      { id: 'hsp', name: 'HGSS Black Star Promos', releaseDate: '2010-02-10' },
      { id: 'ru1', name: 'Pokémon Rumble', releaseDate: '2009-12-02' },
      { id: 'dpp', name: 'DP Black Star Promos', releaseDate: '2007-05-01' },
      { id: 'np', name: 'Nintendo Black Star Promos', releaseDate: '2003-10-01' },
      { id: 'bp', name: 'Best of Game', releaseDate: '2002-12-01' },
      { id: 'basep', name: 'Wizards Black Star Promos', releaseDate: '1999-07-01' },
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
 * Get the logo URL for a set by its name.
 * Checks: SetDefinition override → Supabase cache → pokemontcg.io fallback.
 */
export function getSetLogoByName(setName: string): string | null {
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.name === setName);
    if (set) {
      if (set.logo) return set.logo;
      const cached = setImageCache.get(setName);
      if (cached?.logo) return cached.logo;
      return getPokemontcgioLogoUrl(set.id);
    }
  }
  return null;
}

/**
 * Get the symbol/icon URL for a set by its name.
 * Checks: SetDefinition override → Supabase cache → pokemontcg.io fallback.
 */
export function getSetSymbolByName(setName: string): string | null {
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.name === setName);
    if (set) {
      if (set.symbol) return set.symbol;
      const cached = setImageCache.get(setName);
      if (cached?.symbol) return cached.symbol;
      return getPokemontcgioSymbolUrl(set.id);
    }
  }
  return null;
}

/**
 * Find which era a set belongs to by set ID (returns era name).
 * Accepts both app and pokemontcg.io set IDs.
 */
export function getEraForSetId(setId: string): string | null {
  const appId = getAppSetId(setId);
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.id === setId || s.id === appId);
    if (set) {
      return era.name;
    }
  }
  return null;
}

/**
 * Find which era ID a set belongs to by set ID (returns era id, e.g. 'base', 'neo', 'ex').
 * Accepts both app and pokemontcg.io set IDs.
 */
export function getEraIdForSetId(setId: string): string | null {
  const appId = getAppSetId(setId);
  for (const era of POKEMON_ERAS) {
    const set = era.sets.find(s => s.id === setId || s.id === appId);
    if (set) {
      return era.id;
    }
  }
  return null;
}

/**
 * Convert SetDefinition to PokemonSet format.
 * Uses Supabase-cached URLs when available, pokemontcg.io as fallback.
 */
export function convertSetToPokemonSet(setDef: SetDefinition, eraName: string): PokemonSet {
  const cached = setImageCache.get(setDef.name);
  
  return {
    id: setDef.id,
    name: setDef.name,
    series: eraName,
    releaseDate: setDef.releaseDate,
    logo: setDef.logo || cached?.logo || getPokemontcgioLogoUrl(setDef.id),
    symbol: setDef.symbol || cached?.symbol || getPokemontcgioSymbolUrl(setDef.id),
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
    setReleaseDateMap.set(set.id.toLowerCase(), set.releaseDate);
    // Also add by pokemontcg.io set ID so cards with those IDs can be sorted
    const ptcgioId = getPtcgioSetId(set.id);
    if (ptcgioId !== set.id) {
      setReleaseDateMap.set(ptcgioId.toLowerCase(), set.releaseDate);
    }
  }
}

// ==================== SET ID → ERA NAME LOOKUP ====================

const setIdToEraMap: Map<string, string> = new Map();

for (const era of POKEMON_ERAS) {
  for (const set of era.sets) {
    setIdToEraMap.set(set.id.toLowerCase(), era.name);
    const ptcgioId = getPtcgioSetId(set.id);
    if (ptcgioId !== set.id) {
      setIdToEraMap.set(ptcgioId.toLowerCase(), era.name);
    }
  }
}

/**
 * O(1) lookup: get the era name for a set ID.
 */
export function getEraNameBySetId(setId: string): string | null {
  if (!setId) return null;
  return setIdToEraMap.get(setId.toLowerCase()) || null;
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
 * Extract the numeric part from a card ID like "sv1-25" -> 25.
 * Falls back to a large number so non-numeric / unknown IDs sort to the end.
 */
function getCardIdNumericPart(id?: string): number {
  if (!id) return Number.MAX_SAFE_INTEGER;
  const parts = id.split('-');
  const numberPart = parts[parts.length - 1] || '';
  const match = numberPart.match(/^(\d+)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return parseInt(match[1], 10);
}

/**
 * Sort cards by set release date (newest first), then by card number (ascending).
 * Cards from unknown sets are placed at the end.
 *
 * @param cards - Array of cards to sort
 * @returns New sorted array (doesn't mutate original)
 */
export function sortCardsBySetDate<T extends { set?: string; id?: string }>(
  cards: T[]
): T[] {
  return [...cards].sort((a, b) => {
    const dateA = getSetReleaseDate(a.set || '') ||
                  getSetReleaseDate(a.id?.split('-')[0] || '') ||
                  '1900-01-01';
    const dateB = getSetReleaseDate(b.set || '') ||
                  getSetReleaseDate(b.id?.split('-')[0] || '') ||
                  '1900-01-01';

    const dateCompare = dateB.localeCompare(dateA);
    if (dateCompare !== 0) return dateCompare;

    const numA = getCardIdNumericPart(a.id);
    const numB = getCardIdNumericPart(b.id);
    if (numA !== numB) return numA - numB;

    return (a.id || '').localeCompare(b.id || '');
  });
}

