/**
 * Manual database of which sets have special reverse holo variants
 * (pokeball and masterball patterns).
 * 
 * This data is maintained manually since TCGDEX API doesn't track
 * specific reverse holo patterns - it only indicates if a card has
 * a reverse holo version, not what pattern it uses.
 * 
 * @author AI Assistant
 * @date 2025-12-15
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
 * Determine which special variants a card has based on API data.
 * 
 * Logic:
 * - Pokeball variant: Available if card has reverse: true
 * - Masterball variant: Available if card has reverse: true AND supertype === "Pokemon"
 * 
 * @param setId - The set ID
 * @param hasReverse - Whether the card has a reverse holo (from API)
 * @param supertype - The card's supertype (Pokemon, Trainer, Energy)
 * @returns Array of special variant types available for this card
 */
export function getSpecialVariantsForCard(
  setId: string,
  hasReverse: boolean,
  supertype: string
): ('poke-ball' | 'master-ball')[] {
  // Only special sets have these variants
  if (!hasSpecialVariants(setId)) {
    return [];
  }

  // Card must have reverse holo to have special variants
  if (!hasReverse) {
    return [];
  }

  const variants: ('poke-ball' | 'master-ball')[] = [];

  // Pokeball: Available for all cards with reverse holo
  variants.push('poke-ball');

  // Masterball: Only available for Pokemon cards with reverse holo
  if (supertype === 'Pokémon') {
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

