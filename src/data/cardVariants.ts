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
 * RARITY RESTRICTIONS:
 * - Holo variant: ONLY for rarity "Rare" (exactly "Rare", not "Rare Holo" or others)
 * - Reverse holo, Pokeball holo, Masterball holo: ONLY for Common/Uncommon/Rare
 * - NOT available for higher rarities: Rare Holo, Double Rare, Ultra Rare, etc.
 * 
 * 1. HOLO (all sets): 
 *    - Available if API says holo: true
 *    - AND rarity is exactly "Rare"
 * 
 * 2. REVERSE HOLO (all sets): 
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare
 * 
 * 3. POKEBALL HOLO (special sets only): Follows EXACT same logic as reverse holo
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare
 *    - Only in special sets (Prismatic Evolutions, White Flare, Black Bolt)
 * 
 * 4. MASTERBALL HOLO (special sets only): Same as reverse holo + Pokemon restriction
 *    - Available if API says reverse: true
 *    - AND rarity is Common/Uncommon/Rare
 *    - AND card must be Supertype "Pokemon" (not Trainer or Energy)
 *    - Only in special sets (Prismatic Evolutions, White Flare, Black Bolt)
 * 
 * @author AI Assistant
 * @date 2025-12-21
 */

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
 * - Pokeball variant: Available if reverse: true AND rarity is Common/Uncommon/Rare (same as reverse holo)
 * - Masterball variant: Available if reverse: true AND rarity is Common/Uncommon/Rare AND supertype === "Pokemon"
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

  // Only Common, Uncommon, and Rare cards can have reverse/pokeball/masterball holos
  const allowsReverseHolo = (
    rarity === 'Common' || 
    rarity === 'Uncommon' || 
    rarity === 'Rare'
  );

  if (!allowsReverseHolo) {
    return [];
  }

  const variants: ('poke-ball' | 'master-ball')[] = [];

  // Pokeball Holo: Available for Common/Uncommon/Rare with reverse holo (exact same logic as reverse holo)
  variants.push('poke-ball');

  // Masterball Holo: Only available for Pokemon cards with reverse holo that are Common/Uncommon/Rare
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
    'reverse-holo',
  ];

  // Special sets also have pokeball and masterball variants
  if (hasSpecialVariants(setId)) {
    variants.push('poke-ball', 'master-ball');
  }

  return variants;
}

