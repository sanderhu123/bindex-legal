/**
 * Manual database of which sets have special reverse holo variants
 * (pokeball and masterball patterns).
 * 
 * This data is maintained manually since TCGDEX API doesn't track
 * specific reverse holo patterns - it only indicates if a card has
 * a reverse holo version, not what pattern it uses.
 * 
 * VARIANT LOGIC RULES:
 * =====================
 * 
 * RARITY RESTRICTION (ALL SETS):
 * - Reverse holo, Pokeball holo, and Masterball holo are ONLY available for:
 *   → Common, Uncommon, Rare, Holo Rare (aka Rare Holo)
 * - NOT available for higher rarities:
 *   → Double Rare, Ultra Rare, Illustration Rare, etc.
 * 
 * 1. REVERSE HOLO (most sets, but NOT old sets before Legendary Collection): 
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare/Holo Rare
 *    - NOT available in Base, Gym, Neo, Southern Islands, POP Series, or Promo eras
 * 
 * 2. POKEBALL HOLO (special sets only): Follows EXACT same logic as reverse holo
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare/Holo Rare
 *    - Only in special sets (Prismatic Evolutions, White Flare, Black Bolt)
 * 
 * 3. MASTERBALL HOLO (special sets only): Same as reverse holo + Pokemon restriction
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare/Holo Rare
 *    - AND card must be Supertype "Pokemon" (not Trainer or Energy)
 *    - Only in special sets (Prismatic Evolutions, White Flare, Black Bolt)
 * 
 * @author AI Assistant
 * @date 2025-12-21
 */

import { getEraIdForSetId } from './pokemonEras';

/**
 * Eras that do NOT have reverse holo cards at all.
 * Reverse holos were introduced with Legendary Collection (2002).
 * All eras before that, plus POP Series and Promotional sets, have no reverse holos.
 */
const NO_REVERSE_HOLO_ERAS = [
  'base',             // Base Set, Jungle, Fossil, Base Set 2, Team Rocket
  'gym',              // Gym Heroes, Gym Challenge
  'neo',              // Neo Genesis, Neo Discovery, Neo Revelation, Neo Destiny
  'southern-islands', // Southern Islands
  'pop',              // POP Series 1-9
  'promos',           // All promotional sets
] as const;

/**
 * Check if a set has reverse holo variants.
 * Returns false for old sets (before Legendary Collection) and promo/POP sets.
 * 
 * @param setId - The set ID to check (e.g., "base1", "sv08")
 * @returns True if the set has reverse holo cards
 */
export function setHasReverseHolos(setId: string): boolean {
  const eraId = getEraIdForSetId(setId);
  
  // If we can't find the era, assume it has reverse holos (safer default)
  if (!eraId) return true;
  
  return !NO_REVERSE_HOLO_ERAS.includes(eraId as any);
}

/**
 * Sets that have special reverse holo patterns (pokeball/masterball)
 */
export const SPECIAL_VARIANT_SETS = [
  'sv08.5',   // Prismatic Evolutions
  'sv10.5w',  // White Flare
  'sv10.5b',  // Black Bolt
] as const;

export type SpecialVariantSetId = typeof SPECIAL_VARIANT_SETS[number];

/**
 * Check if a set has special variant patterns (pokeball/masterball)
 * 
 * @param setId - The set ID to check (e.g., "sv08.5")
 * @returns True if the set has special variant patterns
 */
export function hasSpecialVariants(setId: string): boolean {
  return SPECIAL_VARIANT_SETS.includes(setId as SpecialVariantSetId);
}

/**
 * Determine which special variants a card has based on API data and rarity.
 * 
 * Logic:
 * - Pokeball variant: Available if reverse: true AND rarity is Common/Uncommon/Rare/Holo Rare (same as reverse holo)
 * - Masterball variant: Available if reverse: true AND rarity is Common/Uncommon/Rare/Holo Rare AND supertype === "Pokemon"
 * 
 * @param setId - The set ID
 * @param hasReverse - Whether the card has a reverse holo (from API)
 * @param supertype - The card's supertype (Pokemon, Trainer, Energy)
 * @param rarity - The card's rarity (Common, Uncommon, Rare, Rare Holo, etc.)
 * @returns Array of special variant types available for this card
 */
export function getSpecialVariantsForCard(
  setId: string,
  hasReverse: boolean,
  supertype: string,
  rarity: string
): ('poke-ball' | 'master-ball')[] {
  // Only special sets have these variants
  if (!hasSpecialVariants(setId)) {
    return [];
  }

  // Card must have reverse holo indicator from API
  if (!hasReverse) {
    return [];
  }

  // Only Common, Uncommon, Rare, and Holo Rare cards can have reverse/pokeball/masterball holos
  // Note: TCGDEX API uses "Holo Rare" for SWSH era, "Rare Holo" for older DP/HGSS era
  const allowsReverseHolo = (
    rarity === 'Common' || 
    rarity === 'Uncommon' || 
    rarity === 'Rare' ||
    rarity === 'Holo Rare' ||
    rarity === 'Rare Holo'
  );

  if (!allowsReverseHolo) {
    return [];
  }

  const variants: ('poke-ball' | 'master-ball')[] = [];

  // Pokeball Holo: Available for Common/Uncommon/Rare/Holo Rare with reverse holo (exact same logic as reverse holo)
  variants.push('poke-ball');

  // Masterball Holo: Only available for Pokemon cards with reverse holo that are Common/Uncommon/Rare/Holo Rare
  // (same logic as reverse holo, but restricted to Pokemon supertype only)
  // TCGDEX API returns "Pokémon" (with accent) for the category field
  if (supertype === 'Pokémon' || supertype === 'Pokemon') {
    variants.push('master-ball');
  }

  return variants;
}

/**
 * Get all possible variant types for a set (for questionnaire display)
 * 
 * @param setId - The set ID
 * @returns Array of all variant types that exist in this set
 */
export function getAvailableVariantsForSet(setId: string): ('base' | 'reverse-holo' | 'poke-ball' | 'master-ball')[] {
  const variants: ('base' | 'reverse-holo' | 'poke-ball' | 'master-ball')[] = [
    'base',
  ];

  // Only add reverse-holo if the set actually has reverse holos
  // (old sets before Legendary Collection and promo/POP sets don't have them)
  if (setHasReverseHolos(setId)) {
    variants.push('reverse-holo');

    // Special sets also have pokeball and masterball variants
    if (hasSpecialVariants(setId)) {
      variants.push('poke-ball', 'master-ball');
    }
  }

  return variants;
}

/**
 * Extract the TCGDEX set ID from a card ID.
 * Card IDs from the API look like "sv08.5-001". When the binder tracks
 * variants, generateVariantCards appends a suffix: "sv08.5-001-base",
 * "sv08.5-001-poke-ball", etc. This helper strips that suffix first.
 */
function extractSetId(cardId: string): string {
  let cleanId = cardId;
  const suffixes = ['-master-ball', '-poke-ball', '-reverse-holo', '-reverse', '-holo', '-base'];
  for (const s of suffixes) {
    if (cleanId.endsWith(s)) {
      cleanId = cleanId.substring(0, cleanId.length - s.length);
      break;
    }
  }
  const dash = cleanId.lastIndexOf('-');
  return dash > 0 ? cleanId.substring(0, dash) : '';
}

/**
 * Get the variant options available for a specific card based on its
 * set, rarity, and supertype. Used by the card detail screen to show
 * a variant selector.
 * 
 * @param cardId - Full card ID (e.g. "sv08.5-001" or "sv08.5-001-base")
 * @param rarity - Card rarity (Common, Uncommon, Rare, Holo Rare, etc.)
 * @param supertype - Card supertype (Pokémon, Trainer, Energy)
 * @returns Array of variant options; always starts with 'base'
 */
export function getAvailableVariantsForCard(
  cardId: string,
  rarity: string,
  supertype: string
): ('base' | 'reverse-holo' | 'poke-ball' | 'master-ball')[] {
  const setId = extractSetId(cardId);
  if (!setId) return ['base'];

  const allowsReverseHolo = (
    rarity === 'Common' ||
    rarity === 'Uncommon' ||
    rarity === 'Rare' ||
    rarity === 'Holo Rare' ||
    rarity === 'Rare Holo'
  );

  const variants: ('base' | 'reverse-holo' | 'poke-ball' | 'master-ball')[] = ['base'];

  if (allowsReverseHolo && setHasReverseHolos(setId)) {
    variants.push('reverse-holo');

    const specialVariants = getSpecialVariantsForCard(setId, true, supertype, rarity);
    variants.push(...specialVariants);
  }

  return variants;
}

