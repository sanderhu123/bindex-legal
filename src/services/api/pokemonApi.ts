import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion, findPokemonByDexNumber } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, getAllSets, convertSetToPokemonSet, sortCardsBySetDate, getPtcgioSetId, getAppSetId, registerSetImageUrls, getEraNameBySetId } from '../../data/pokemonEras';
import { getSpecialVariantsForCard, hasSpecialVariants, hasStampEnergyVariants, setHasReverseHolos } from '../../data/cardVariants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStorageFullError, emergencyStorageCleanup } from '../cacheManager';
import { supabase } from '../supabase/client';
import { normalizeForNameSearch, normalizeForArtistSearch } from '../../utils/searchNormalize';

export type PokemonSet = MockSet;

export type Region =
  | 'Kanto'
  | 'Johto'
  | 'Hoenn'
  | 'Sinnoh'
  | 'Unova'
  | 'Kalos'
  | 'Alola'
  | 'Galar'
  | 'Paldea';

// ==================== POKEMONTCG.IO API CONFIGURATION ====================

const POKEMON_TCG_API_BASE = 'https://api.pokemontcg.io/v2';
const POKEMON_TCG_API_KEY = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY || '';

console.log('[API] pokemontcg.io API initialized:', {
  hasApiKey: !!POKEMON_TCG_API_KEY,
  baseUrl: POKEMON_TCG_API_BASE,
});

/**
 * Fetch helper for pokemontcg.io API with authentication and error handling.
 */
async function ptcgioFetch<T = any>(
  endpoint: string,
  params?: Record<string, string>
): Promise<T> {
  let url = `${POKEMON_TCG_API_BASE}${endpoint}`;
  if (params) {
    const queryParts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    if (queryParts.length > 0) {
      url += '?' + queryParts.join('&');
    }
  }

  console.log('[API] Request URL:', url);

  const headers: Record<string, string> = {};
  if (POKEMON_TCG_API_KEY) {
    headers['X-Api-Key'] = POKEMON_TCG_API_KEY;
  }

  const response = await fetch(url, { headers });

  if (response.status === 429) {
    handleRateLimitError({ status: 429, response });
  }

  if (!response.ok) {
    let errorBody = '';
    try { errorBody = await response.text(); } catch {}
    console.error('[API] Error response:', { status: response.status, body: errorBody, url });
    throw new Error(`pokemontcg.io API error: ${response.status} ${errorBody}`);
  }

  return response.json();
}

// ==================== EXCLUDED SETS ====================

/**
 * Pokémon TCG Pocket set IDs — these are from a different game and should be
 * excluded from all results in this app.
 */
const POCKET_SET_IDS = new Set([
  'a1', 'a1a', 'a2', 'a2a', 'a2b', 'a3', 'a3a', 'a3b', 'a4', 'a4a',
  'b1', 'b1a', 'p-a',
]);

function isPocketSet(setId: string): boolean {
  return POCKET_SET_IDS.has(setId.toLowerCase());
}

const MCDONALDS_SET_IDS = new Set([
  'mcd19', 'mcd18', 'mcd17', 'mcd16', 'mcd15', 'mcd14', 'mcd12', 'mcd11',
  'mcd21', 'mcd22',
]);

function isMcDonaldsSet(setId: string): boolean {
  return MCDONALDS_SET_IDS.has(setId.toLowerCase());
}

function isExcludedSet(setId: string): boolean {
  return isPocketSet(setId) || isMcDonaldsSet(setId);
}

// ==================== ALLOWED SET IDS ====================

/**
 * Whitelisted set IDs from hard-coded app data.
 * Includes both app and pokemontcg.io formats.
 */
const ALLOWED_SET_IDS = new Set<string>();
for (const set of getAllSets()) {
  ALLOWED_SET_IDS.add(set.id.toLowerCase());
  const ptcgioId = getPtcgioSetId(set.id);
  if (ptcgioId !== set.id) {
    ALLOWED_SET_IDS.add(ptcgioId.toLowerCase());
  }
}

function isAllowedSetId(setId: string): boolean {
  return ALLOWED_SET_IDS.has(setId.toLowerCase());
}

// ==================== CACHING & RATE LIMITING ====================

const apiCache = new Map<string, { data: any; timestamp: number }>();

const MEMORY_CACHE_DURATION = 5 * 60 * 1000;
const PERSISTENT_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;
const CACHE_PREFIX = '@pokemon_cache_';

let persistentCacheLoaded = false;
const pendingRequests = new Map<string, Promise<any>>();

let rateLimitResetTime: number = 0;
let rateLimitRetryCount: number = 0;
const MAX_RATE_LIMIT_RETRIES = 3;

function isMemoryCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < MEMORY_CACHE_DURATION;
}

function isPersistentCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < PERSISTENT_CACHE_DURATION;
}

export async function initializePersistentCache(): Promise<void> {
  if (persistentCacheLoaded) return;

  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    
    if (cacheKeys.length === 0) {
      persistentCacheLoaded = true;
      return;
    }
    
    const cachedItems = await AsyncStorage.multiGet(cacheKeys);
    let loadedCount = 0;
    
    for (const [key, value] of cachedItems) {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const cacheKey = key.replace(CACHE_PREFIX, '');
          if (isPersistentCacheValid(parsed.timestamp)) {
            apiCache.set(cacheKey, parsed);
            loadedCount++;
          } else {
            AsyncStorage.removeItem(key).catch(() => {});
          }
        } catch {
          // Skip unparseable entries
        }
      }
    }
    
    console.log('[CACHE] Persistent cache loaded:', { loadedItems: loadedCount });
    persistentCacheLoaded = true;
  } catch (error) {
    console.error('[CACHE] Failed to load persistent cache:', error);
    persistentCacheLoaded = true;
  }
}

function getCachedData<T>(cacheKey: string): T | null {
  const cached = apiCache.get(cacheKey);
  if (!cached) return null;
  
  if (!isMemoryCacheValid(cached.timestamp)) {
    if (!isPersistentCacheValid(cached.timestamp)) {
      apiCache.delete(cacheKey);
      AsyncStorage.removeItem(CACHE_PREFIX + cacheKey).catch(() => {});
      return null;
    }
  }
  
  return cached.data as T;
}

function setCachedData(cacheKey: string, data: any): void {
  const cacheEntry = { data, timestamp: Date.now() };
  apiCache.set(cacheKey, cacheEntry);
  
  if (cacheKey.startsWith('cards-') || cacheKey.startsWith('card-')) {
    AsyncStorage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(cacheEntry))
      .catch(async (error) => {
        if (isStorageFullError(error)) {
          await emergencyStorageCleanup();
        }
      });
  }
}

function isRateLimited(): boolean {
  if (rateLimitResetTime === 0) return false;
  if (Date.now() >= rateLimitResetTime) {
    rateLimitResetTime = 0;
    rateLimitRetryCount = 0;
    return false;
  }
  return true;
}

function handleRateLimitError(error: any): void {
  const is429 = 
    error?.status === 429 || 
    error?.statusCode === 429 || 
    error?.response?.status === 429 ||
    (error?.message && error.message.toLowerCase().includes('rate limit'));
  
  if (is429) {
    rateLimitRetryCount++;
    const retryAfter = error?.retryAfter || error?.response?.headers?.['retry-after'];
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    rateLimitResetTime = Date.now() + waitTime;
    
    throw new Error(
      `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. ` +
      `(Retry ${rateLimitRetryCount}/${MAX_RATE_LIMIT_RETRIES})`
    );
  }
}

async function deduplicateRequest<T>(
  cacheKey: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending as Promise<T>;
  
  const requestPromise = requestFn().finally(() => {
    pendingRequests.delete(cacheKey);
  });
  
  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function clearApiCache(): Promise<void> {
  apiCache.clear();
  pendingRequests.clear();
  
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function getCacheStats() {
  const entries = Array.from(apiCache.entries());
  return {
    totalEntries: apiCache.size,
    validMemoryEntries: entries.filter(([_, v]) => isMemoryCacheValid(v.timestamp)).length,
    validPersistentEntries: entries.filter(([_, v]) => isPersistentCacheValid(v.timestamp)).length,
    pendingRequests: pendingRequests.size,
    persistentCacheLoaded,
  };
}

// ==================== CARD TRANSFORM ====================

/**
 * Lazy lookup of "set ID → display name" built from the hard-coded eras data.
 * We populate it on first access so module-load order doesn't matter.
 */
let _setIdToNameMap: Map<string, string> | null = null;
function getSetIdToNameMap(): Map<string, string> {
  if (_setIdToNameMap) return _setIdToNameMap;
  _setIdToNameMap = new Map<string, string>();
  for (const set of getAllSets()) {
    _setIdToNameMap.set(set.id, set.name);
  }
  return _setIdToNameMap;
}

/**
 * Resolve the display set name for a card.
 *
 * Subset cards (Trainer Gallery, Galarian Gallery, Shiny Vault, Classic
 * Collection) live in their own pokemontcg.io set IDs (e.g. "swsh10tg") with
 * names like "Astral Radiance Trainer Gallery". For display purposes we want
 * to roll those up under the parent set ("Astral Radiance") so the user sees
 * a single set name + the parent's set icon.
 *
 * Falls back to the original `rawSetName` when the set isn't a known subset
 * or the parent name can't be resolved.
 */
function resolveDisplaySetName(setId: string | undefined | null, rawSetName: string): string {
  if (!setId) return rawSetName;
  const parentId = SUBSET_TO_PARENT_SET_ID[setId];
  if (!parentId) return rawSetName;
  const parentName = getSetIdToNameMap().get(parentId);
  return parentName || rawSetName;
}

/**
 * Transform a pokemontcg.io card to our internal Card type.
 */
function transformPtcgioCardToCard(card: any): Card {
  const rawSetName = card.set?.name || '';
  return {
    id: card.id || '',
    name: card.name || '',
    number: card.number || '',
    set: resolveDisplaySetName(card.set?.id, rawSetName),
    rarity: card.rarity || '',
    illustrator: card.artist || '',
    imageUrl: card.images?.small || '',
    imageUrlHiRes: card.images?.large || '',
    variant: 'base' as const,
    supertype: card.supertype || '',
    setTotal: card.set?.printedTotal ? String(card.set.printedTotal) : '',
  };
}

/**
 * Columns we read from the `pokemon_cards` table.
 *
 * Used everywhere we transform a row via `transformDbRowToCard` (and
 * `dbRowToPtcgioShape`, which also needs `has_reverse_holo` for variant
 * generation). Selecting only these columns instead of `*` dramatically
 * reduces payload size on large queries (sets, batch fetches, search), since
 * `*` otherwise pulls big columns we don't display (descriptions, attacks,
 * abilities, prices, etc.).
 */
const POKEMON_CARD_QUERY_COLUMNS =
  'id, name, number, set_id, set_name, set_printed_total, rarity, artist, supertype, image_small, image_large, has_reverse_holo';

/**
 * Transform a Supabase pokemon_cards row to our internal Card type.
 */
function transformDbRowToCard(row: any): Card {
  return {
    id: row.id || '',
    name: row.name || '',
    number: row.number || '',
    set: resolveDisplaySetName(row.set_id, row.set_name || ''),
    rarity: row.rarity || '',
    illustrator: row.artist || '',
    imageUrl: row.image_small || '',
    imageUrlHiRes: row.image_large || '',
    variant: 'base' as const,
    supertype: row.supertype || '',
    setTotal: row.set_printed_total ? String(row.set_printed_total) : '',
  };
}

/**
 * Build a fake ptcgioCard-like object from a DB row so existing
 * variant generation logic works without changes.
 */
function dbRowToPtcgioShape(row: any): any {
  return {
    set: { id: row.set_id },
    supertype: row.supertype,
    rarity: row.rarity,
    tcgplayer: row.has_reverse_holo ? { prices: { reverseHolofoil: true } } : undefined,
  };
}

// ==================== VARIANT GENERATION ====================

/**
 * Determine if a card has a reverse holo variant using pokemontcg.io data.
 * We check tcgplayer prices for a "reverseHolofoil" entry, and also
 * infer from rarity + set era when price data is unavailable.
 */
function cardHasReverseHolo(ptcgioCard: any): boolean {
  if (ptcgioCard.tcgplayer?.prices?.reverseHolofoil) {
    return true;
  }
  // Infer from set — if the set typically has reverse holos,
  // assume this card does too (will be filtered by rarity later)
  const setId = ptcgioCard.set?.id || '';
  const appSetId = getAppSetId(setId);
  return setHasReverseHolos(appSetId);
}

/**
 * Generate all variant cards from a base card.
 */
function generateVariantCards(baseCard: Card, ptcgioCard: any): Card[] {
  const variants: Card[] = [];
  const ptcgioSetId = ptcgioCard.set?.id || '';
  const appSetId = getAppSetId(ptcgioSetId);
  
  const supertype = ptcgioCard.supertype || '';
  const rarity = ptcgioCard.rarity || '';
  
  const allowsReverseHolo = (
    rarity === 'Common' || 
    rarity === 'Uncommon' || 
    rarity === 'Rare' ||
    rarity === 'Holo Rare' ||
    rarity === 'Rare Holo'
  );
  
  const hasReverse = allowsReverseHolo && cardHasReverseHolo(ptcgioCard);
  
  // Base variant (always)
  variants.push({
    ...baseCard,
    variant: 'base',
    id: `${baseCard.id}-base`,
  });
  
  // Stamp/Energy variants (Ascended Heroes style):
  // Pokémon get stamp + energy (no reverse holo), Trainers/Energy get reverse holo
  if (hasStampEnergyVariants(appSetId) && allowsReverseHolo) {
    const isPokemon = supertype === 'Pokémon' || supertype === 'Pokemon';
    if (isPokemon) {
      variants.push({
        ...baseCard,
        variant: 'stamp',
        id: `${baseCard.id}-stamp`,
      });
      variants.push({
        ...baseCard,
        variant: 'energy',
        id: `${baseCard.id}-energy`,
      });
    } else if (hasReverse) {
      variants.push({
        ...baseCard,
        variant: 'reverse-holo',
        id: `${baseCard.id}-reverse`,
      });
    }
  } else {
    // Reverse holo
    if (hasReverse && allowsReverseHolo) {
      variants.push({
        ...baseCard,
        variant: 'reverse-holo',
        id: `${baseCard.id}-reverse`,
      });
    }

    // Special variants (pokeball/masterball) for special sets
    if (hasSpecialVariants(appSetId)) {
      const specialVariants = getSpecialVariantsForCard(appSetId, hasReverse, supertype, rarity);
      for (const variantType of specialVariants) {
        variants.push({
          ...baseCard,
          variant: variantType,
          id: `${baseCard.id}-${variantType}`,
        });
      }
    }
  }
  
  return variants;
}

// ==================== SET FUNCTIONS ====================

/**
 * Sort cards by number: numeric cards first (1, 2, 3...), then
 * prefixed cards (GG01, TG01, SV01...) in their own numeric order.
 */
function sortCardsByNumber(cards: any[]): any[] {
  return [...cards].sort((a, b) => {
    const numA = a.number || '';
    const numB = b.number || '';
    
    const isNumericA = /^\d+$/.test(numA);
    const isNumericB = /^\d+$/.test(numB);
    
    // Both numeric: sort as numbers
    if (isNumericA && isNumericB) {
      return parseInt(numA, 10) - parseInt(numB, 10);
    }
    // Numeric comes before non-numeric
    if (isNumericA) return -1;
    if (isNumericB) return 1;
    
    // Both non-numeric: extract prefix and number (e.g. "GG01" → "GG", 1)
    const matchA = numA.match(/^([A-Za-z]+)(\d+)$/);
    const matchB = numB.match(/^([A-Za-z]+)(\d+)$/);
    
    if (matchA && matchB) {
      if (matchA[1] !== matchB[1]) return matchA[1].localeCompare(matchB[1]);
      return parseInt(matchA[2], 10) - parseInt(matchB[2], 10);
    }
    
    return numA.localeCompare(numB);
  });
}

function sortSetsByDate(sets: PokemonSet[]): PokemonSet[] {
  return [...sets].sort((a, b) => {
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
  });
}

/**
 * Get minimal set data for initial display.
 * Reads from Supabase pokemon_sets table. Falls back to API if table is empty.
 */
export async function getSetsMinimal(): Promise<PokemonSet[]> {
  const cacheKey = 'sets-minimal';
  
  const cachedData = getCachedData<PokemonSet[]>(cacheKey);
  if (cachedData) return cachedData;
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // Try Supabase first
      const { data: dbSets, error } = await supabase
        .from('pokemon_sets')
        .select('id, name, series, release_date, logo_url, symbol_url')
        .is('parent_set_id', null)
        .order('release_date', { ascending: false });
      
      if (!error && dbSets && dbSets.length > 0) {
        const sets: PokemonSet[] = dbSets
          .filter((s: any) => s.id && s.name && !isExcludedSet(s.id))
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            series: s.series || 'Unknown',
            releaseDate: s.release_date ? s.release_date.replace(/\//g, '-') : '',
            logo: s.logo_url || undefined,
            symbol: s.symbol_url || undefined,
          }));
        
        registerSetImageUrls(sets);
        setCachedData(cacheKey, sets);
        console.log('[API] getSetsMinimal() from Supabase:', { count: sets.length });
        return sets;
      }
      
      console.warn('[API] Supabase pokemon_sets empty or error, falling back to API');
    } catch (dbErr) {
      console.warn('[API] Supabase query failed, falling back to API:', dbErr);
    }
    
    // Fallback: fetch from pokemontcg.io API
    try {
      const response = await ptcgioFetch('/sets', {
        pageSize: '250',
        orderBy: '-releaseDate',
      });
      
      const sets: PokemonSet[] = response.data
        .filter((s: any) => s.id && s.name && !isExcludedSet(s.id))
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          series: s.series || 'Unknown',
          releaseDate: s.releaseDate ? s.releaseDate.replace(/\//g, '-') : '',
          logo: s.images?.logo || undefined,
          symbol: s.images?.symbol || undefined,
        }));
      
      registerSetImageUrls(sets);
      setCachedData(cacheKey, sets);
      return sets;
    } catch (error) {
      console.error('[API] Error in getSetsMinimal():', error);
      return mockSets;
    }
  });
}

/**
 * Get full set details for sets in a specific era using hard-coded data.
 * Sets are already ordered newest first.
 */
export async function getSetsBySerie(serieName: string): Promise<PokemonSet[]> {
  try {
    const setDefinitions = getSetsByEra(serieName);
    return setDefinitions.map(setDef => convertSetToPokemonSet(setDef, serieName));
  } catch (error) {
    console.error('[API] Error in getSetsBySerie():', error);
    return [];
  }
}

/**
 * Get all sets sorted by release date (newest first).
 * @deprecated Use getSetsMinimal() + getSetsBySerie() for better performance
 */
export async function getSets(): Promise<PokemonSet[]> {
  return getSetsMinimal();
}

// ==================== ID CONVERSION ====================

/**
 * Build a map of set name (lowercase) → app set ID from hard-coded era data.
 */
const setNameToIdMap = new Map<string, string>();
for (const set of getAllSets()) {
  setNameToIdMap.set(set.name.toLowerCase(), set.id);
}

/**
 * Convert an app-format card ID to pokemontcg.io format.
 * Handles set ID conversion, gallery sub-set suffixes, and card number zero-stripping.
 * 
 * pokemontcg.io puts Trainer Gallery and Galarian Gallery cards in separate sub-sets:
 *   "swsh9-TG01"   → "swsh9tg-TG01"   (Trainer Gallery)
 *   "swsh12.5-GG01" → "swsh12pt5gg-GG01" (Galarian Gallery)
 *   "sv01-025"     → "sv1-25"
 *   "base1-4"      → "base1-4" (unchanged)
 */
function convertCardIdToPtcgio(cardId: string): string {
  const lastDash = cardId.lastIndexOf('-');
  if (lastDash <= 0) return cardId;
  
  const setIdPart = cardId.slice(0, lastDash);
  const numberPart = cardId.slice(lastDash + 1);
  
  // Convert set ID
  let ptcgioSetId = getPtcgioSetId(setIdPart);
  
  // pokemontcg.io uses separate sub-set IDs for gallery/vault cards.
  // The endsWith() guards make these conversions idempotent so an ID that's
  // already in pokemontcg.io format (e.g. "swsh10tg-TG12") doesn't get a
  // second suffix appended ("swsh10tgtg-TG12" → 404).
  if (/^GG\d/i.test(numberPart)) {
    if (!ptcgioSetId.endsWith('gg')) ptcgioSetId += 'gg';
  } else if (/^TG\d/i.test(numberPart)) {
    if (!ptcgioSetId.endsWith('tg')) ptcgioSetId += 'tg';
  } else if (/^SV\d/i.test(numberPart)) {
    // Shiny Vault cards: swsh45 → swsh45sv, sm115 → sma.
    // Only remap if the current ID is a known parent (not already a subset).
    const svSubSet = GALLERY_SUB_SETS[ptcgioSetId];
    if (svSubSet && !ptcgioSetId.endsWith('sv') && ptcgioSetId !== 'sma') {
      ptcgioSetId = svSubSet;
    }
  }
  
  // Strip leading zeros from purely numeric card numbers ("001" → "1")
  let ptcgioNumber = numberPart;
  if (/^\d+$/.test(numberPart)) {
    ptcgioNumber = String(Number(numberPart));
  }
  
  return `${ptcgioSetId}-${ptcgioNumber}`;
}

/**
 * Resolve a set identifier (could be a name or an ID) to a pokemontcg.io set ID.
 * Tries: direct pokemontcg.io ID → app ID → set name lookup → API search.
 */
async function resolveSetId(setIdentifier: string): Promise<string> {
  // 1. Check if it's a known app set ID (e.g., "sv01", "me02")
  const directConvert = getPtcgioSetId(setIdentifier);
  if (directConvert !== setIdentifier || ALLOWED_SET_IDS.has(setIdentifier.toLowerCase())) {
    return directConvert;
  }
  
  // 2. Check if it's a set name in our hard-coded data
  const idFromName = setNameToIdMap.get(setIdentifier.toLowerCase());
  if (idFromName) {
    return getPtcgioSetId(idFromName);
  }
  
  // 3. Try Supabase pokemon_sets table by name
  try {
    const { data } = await supabase
      .from('pokemon_sets')
      .select('id')
      .ilike('name', setIdentifier)
      .limit(1)
      .maybeSingle();
    
    if (data?.id) return data.id;
  } catch {
    // Fall through
  }
  
  // 4. Last resort: return as-is
  return setIdentifier;
}

// ==================== CARD FUNCTIONS ====================

/**
 * Fetch all cards for a set from pokemontcg.io, handling pagination.
 */
// pokemontcg.io splits gallery/vault/classic sub-sets into separate set IDs
const GALLERY_SUB_SETS: Record<string, string> = {
  'swsh9': 'swsh9tg',       // Brilliant Stars → Trainer Gallery
  'swsh10': 'swsh10tg',     // Astral Radiance → Trainer Gallery
  'swsh11': 'swsh11tg',     // Lost Origin → Trainer Gallery
  'swsh12': 'swsh12tg',     // Silver Tempest → Trainer Gallery
  'swsh12pt5': 'swsh12pt5gg', // Crown Zenith → Galarian Gallery
  'swsh45': 'swsh45sv',     // Shining Fates → Shiny Vault
  'sm115': 'sma',           // Hidden Fates → Shiny Vault
  'cel25': 'cel25c',        // Celebrations → Classic Collection
};

/**
 * Reverse of GALLERY_SUB_SETS: subset set ID → parent set ID.
 * Used so we can show subset cards (Trainer Gallery, Galarian Gallery, Shiny
 * Vault, Classic Collection) under their parent set name and icon, instead of
 * as a separate "Astral Radiance Trainer Gallery" set.
 *
 * NOTE: Keep in sync with GALLERY_SUB_SETS above and PARENT_SET_MAP in
 * scripts/populate-card-database.js.
 */
const SUBSET_TO_PARENT_SET_ID: Record<string, string> = Object.fromEntries(
  Object.entries(GALLERY_SUB_SETS).map(([parent, child]) => [child, parent])
);

async function fetchCardsForOneSet(ptcgioSetId: string): Promise<any[]> {
  const allCards: any[] = [];
  let page = 1;
  let totalCount = Infinity;
  
  while (allCards.length < totalCount) {
    // NOTE: We intentionally do NOT use orderBy: 'number'.
    // pokemontcg.io sorts numbers as strings, which breaks pagination
    // (high-numbered secret rares get silently dropped across pages).
    // Sorting is done client-side via sortCardsByNumber.
    const response = await ptcgioFetch('/cards', {
      q: `set.id:${ptcgioSetId}`,
      pageSize: '250',
      page: String(page),
    });
    
    totalCount = response.totalCount;
    allCards.push(...response.data);
    page++;
    
    if (response.data.length === 0) break;
  }
  
  return allCards;
}

async function fetchAllCardsForSet(ptcgioSetId: string): Promise<any[]> {
  const allCards = await fetchCardsForOneSet(ptcgioSetId);
  
  // Also fetch gallery sub-set if one exists
  const gallerySuffix = GALLERY_SUB_SETS[ptcgioSetId];
  if (gallerySuffix) {
    try {
      const galleryCards = await fetchCardsForOneSet(gallerySuffix);
      console.log('[API] Gallery sub-set fetched:', { subSet: gallerySuffix, count: galleryCards.length });
      allCards.push(...galleryCards);
    } catch (err) {
      console.warn('[API] Failed to fetch gallery sub-set:', gallerySuffix, err);
    }
  }
  
  return allCards;
}

/**
 * Get cards for a specific set.
 * Reads from Supabase pokemon_cards table. Falls back to API if table is empty.
 */
export async function getCardsBySet(setIdentifier: string): Promise<Card[]> {
  console.log('[API] getCardsBySet() called:', { setIdentifier });
  const overallStartTime = performance.now();
  
  const CARD_CACHE_VERSION = 5;
  const cacheKey = `cards-v${CARD_CACHE_VERSION}-${setIdentifier}`;
  
  const cachedData = getCachedData<Card[]>(cacheKey);
  if (cachedData) {
    console.log('[API] Returning cached cards:', { count: cachedData.length });
    return cachedData;
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // Resolve to pokemontcg.io set ID
      const ptcgioSetId = await resolveSetId(setIdentifier);
      
      // Build list of set IDs to query (main + gallery sub-sets)
      const setIds = [ptcgioSetId];
      const gallerySuffix = GALLERY_SUB_SETS[ptcgioSetId];
      if (gallerySuffix) setIds.push(gallerySuffix);
      
      // Try Supabase first
      const { data: dbCards, error } = await supabase
        .from('pokemon_cards')
        .select(POKEMON_CARD_QUERY_COLUMNS)
        .in('set_id', setIds)
        .order('number');
      
      if (!error && dbCards && dbCards.length > 0) {
        console.log('[API] Cards from Supabase:', { count: dbCards.length, setIds });
        
        const sortedDbCards = sortCardsByNumber(dbCards);
        const transformedCards = sortedDbCards.map(transformDbRowToCard);
        
        // Generate variants
        const allVariantCards: Card[] = [];
        for (let i = 0; i < transformedCards.length; i++) {
          const fakeApiCard = dbRowToPtcgioShape(sortedDbCards[i]);
          const variantCards = generateVariantCards(transformedCards[i], fakeApiCard);
          allVariantCards.push(...variantCards);
        }
        
        const validCards = allVariantCards.filter(card => card.id && card.name);
        setCachedData(cacheKey, validCards);
        
        const duration = performance.now() - overallStartTime;
        console.log('[API] getCardsBySet() completed from Supabase:', {
          baseCards: transformedCards.length,
          totalWithVariants: validCards.length,
          duration: `${duration.toFixed(0)}ms`,
        });
        
        return validCards;
      }
      
      console.warn('[API] Supabase pokemon_cards empty for set, falling back to API:', setIds);
    } catch (dbErr) {
      console.warn('[API] Supabase query failed, falling back to API:', dbErr);
    }
    
    // Fallback: fetch from pokemontcg.io API
    try {
      const ptcgioSetId = await resolveSetId(setIdentifier);
      const ptcgioCards = await fetchAllCardsForSet(ptcgioSetId);
      
      const transformedCards = ptcgioCards.map(transformPtcgioCardToCard);
      
      const allVariantCards: Card[] = [];
      for (let i = 0; i < transformedCards.length; i++) {
        const variantCards = generateVariantCards(transformedCards[i], ptcgioCards[i]);
        allVariantCards.push(...variantCards);
      }
      
      const validCards = allVariantCards.filter(card => card.id && card.name);
      setCachedData(cacheKey, validCards);
      return validCards;
    } catch (error) {
      console.error('[API] Error in getCardsBySet():', error);
      const mockCardsFiltered = mockCards.filter((card) => card.set === setIdentifier);
      if (mockCardsFiltered.length === 0) {
        throw new Error(`Unable to load cards for "${setIdentifier}". Please check your internet connection.`);
      }
      return mockCardsFiltered;
    }
  });
}

/**
 * Generate Pokemon image URL based on Pokédex number and art style.
 */
export function getPokemonImageUrl(pokedexNumber: number, artStyle: PokemonArtStyle): string {
  const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  
  switch (artStyle) {
    case 'sprite':
      return `${baseUrl}/${pokedexNumber}.png`;
    case 'home':
      return `${baseUrl}/other/home/${pokedexNumber}.png`;
    case 'official-artwork':
      return `${baseUrl}/other/official-artwork/${pokedexNumber}.png`;
    default:
      return `${baseUrl}/${pokedexNumber}.png`;
  }
}

/**
 * Get cards for a Pokédex region using hardcoded Pokémon list.
 */
export async function getCardsByRegion(region: Region, pokemonArtStyle?: PokemonArtStyle): Promise<Card[]> {
  const pokemonList = getPokemonByRegion(region);
  
  return pokemonList.map((pokemon) => ({
    id: `region-${region}-${pokemon.number}`,
    name: pokemon.name,
    number: `#${pokemon.number.toString().padStart(3, '0')}`,
    set: `${region} Region`,
    rarity: '',
    illustrator: '',
    imageUrl: pokemonArtStyle ? getPokemonImageUrl(pokemon.number, pokemonArtStyle) : undefined,
    pokedexNumber: pokemon.number,
    variant: 'base' as const,
  }));
}

/**
 * Get a single card by ID.
 * Reads from Supabase pokemon_cards table. Falls back to API if not found.
 */
export async function getCardById(id: string): Promise<Card | null> {
  if (id.startsWith('custom-')) {
    const { getCustomCard } = require('../supabase/customCards');
    return getCustomCard(id);
  }

  if (id.startsWith('region-')) {
    const parts = id.split('-');
    const regionName = parts[1] as Region;
    const dexNumber = parseInt(parts[2], 10);

    // Primary lookup: try the region encoded in the ID.
    let pokemon = getPokemonByRegion(regionName).find(p => p.number === dexNumber);
    let resolvedRegion: Region | string = regionName;

    // Fallback: if the region in the ID is invalid/unknown (e.g. legacy
    // `region-Unknown-242` data) or just doesn't list this Pokémon, search
    // every region by dex number so we can still recover the correct name
    // (e.g. "Blissey" instead of "Pokémon #242").
    if (!pokemon && !isNaN(dexNumber)) {
      const found = findPokemonByDexNumber(dexNumber);
      if (found) {
        pokemon = found.entry;
        resolvedRegion = found.region;
      }
    }

    return {
      id,
      name: pokemon?.name ?? `Pokémon #${dexNumber}`,
      number: `#${dexNumber.toString().padStart(3, '0')}`,
      set: `${resolvedRegion} Region`,
      rarity: '',
      illustrator: '',
      // Always provide a sprite as a fallback image so region slots never
      // render as a blank/coloured placeholder when the TCG art isn't
      // available.
      imageUrl: !isNaN(dexNumber) ? getPokemonImageUrl(dexNumber, 'sprite') : undefined,
      pokedexNumber: dexNumber,
      variant: 'base' as const,
    };
  }

  const cacheKey = `card-${id}`;
  
  const cachedData = getCachedData<Card | null>(cacheKey);
  if (cachedData !== null) return cachedData;
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      const variantMatch = id.match(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/);
      const variant = variantMatch ? variantMatch[1] : undefined;
      const baseId = id.replace(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/, '');

      const variantMap: Record<string, string> = {
        'base': 'base',
        'holo': 'base',
        'reverse': 'reverse-holo',
        'poke-ball': 'poke-ball',
        'master-ball': 'master-ball',
        'stamp': 'stamp',
        'energy': 'energy',
      };
      const cardVariant = variant ? variantMap[variant] : undefined;
      
      const ptcgioCardId = convertCardIdToPtcgio(baseId);
      
      // Try Supabase first
      const { data: dbCard, error } = await supabase
        .from('pokemon_cards')
        .select(POKEMON_CARD_QUERY_COLUMNS)
        .eq('id', ptcgioCardId)
        .maybeSingle();
      
      if (!error && dbCard) {
        const transformedCard = transformDbRowToCard(dbCard);
        
        if (variant) {
          transformedCard.id = id;
          transformedCard.variant = cardVariant as any;
        }
        
        setCachedData(cacheKey, transformedCard);
        return transformedCard;
      }
      
      // Fallback: fetch from pokemontcg.io API
      console.log('[API] Card not in Supabase, fetching from API:', ptcgioCardId);
      const response = await ptcgioFetch(`/cards/${encodeURIComponent(ptcgioCardId)}`);
      const ptcgioCard = response.data;
      
      if (!ptcgioCard) return null;
      
      const transformedCard = transformPtcgioCardToCard(ptcgioCard);
      
      if (variant) {
        transformedCard.id = id;
        transformedCard.variant = cardVariant as any;
      }
      
      setCachedData(cacheKey, transformedCard);
      return transformedCard;
    } catch (error) {
      console.error('[API] Error in getCardById():', { cardId: id, error });
      
      const mockCard = mockCards.find((c) => c.id === id);
      if (mockCard) return mockCard;
      
      return null;
    }
  });
}

/**
 * Batch-fetch multiple cards by ID in a single Supabase query.
 * Cards already in memory/disk cache are returned from cache.
 * Remaining cards are fetched with one WHERE id IN (...) query.
 */
export async function getCardsByIds(ids: string[]): Promise<Map<string, Card>> {
  const result = new Map<string, Card>();
  if (ids.length === 0) return result;

  // Separate custom cards and resolve cached cards
  const uncachedEntries: Array<{ originalId: string; ptcgioId: string; variant?: string; variantLabel?: string }> = [];

  for (const id of ids) {
    if (id.startsWith('custom-')) {
      try {
        const { getCustomCard } = require('../supabase/customCards');
        const card = await getCustomCard(id);
        if (card) result.set(id, card);
      } catch {}
      continue;
    }

    const cacheKey = `card-${id}`;
    const cached = getCachedData<Card | null>(cacheKey);
    if (cached !== null) {
      result.set(id, cached);
      continue;
    }

    const variantMatch = id.match(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/);
    const variant = variantMatch ? variantMatch[1] : undefined;
    const baseId = id.replace(/-(base|holo|reverse|poke-ball|master-ball|stamp|energy)$/, '');
    const variantMap: Record<string, string> = {
      'base': 'base', 'holo': 'base', 'reverse': 'reverse-holo',
      'poke-ball': 'poke-ball', 'master-ball': 'master-ball',
      'stamp': 'stamp', 'energy': 'energy',
    };

    uncachedEntries.push({
      originalId: id,
      ptcgioId: convertCardIdToPtcgio(baseId),
      variant,
      variantLabel: variant ? variantMap[variant] : undefined,
    });
  }

  if (uncachedEntries.length === 0) return result;

  // Batch query Supabase
  const ptcgioIds = [...new Set(uncachedEntries.map(e => e.ptcgioId))];

  try {
    const { data: dbCards, error } = await supabase
      .from('pokemon_cards')
      .select(POKEMON_CARD_QUERY_COLUMNS)
      .in('id', ptcgioIds);

    if (!error && dbCards) {
      const dbMap = new Map<string, any>();
      for (const row of dbCards) {
        dbMap.set(row.id, row);
      }

      for (const entry of uncachedEntries) {
        const dbRow = dbMap.get(entry.ptcgioId);
        if (dbRow) {
          const card = transformDbRowToCard(dbRow);
          if (entry.variant) {
            card.id = entry.originalId;
            card.variant = entry.variantLabel as any;
          }
          setCachedData(`card-${entry.originalId}`, card);
          result.set(entry.originalId, card);
        }
      }
    }
  } catch (err) {
    console.warn('[API] Batch getCardsByIds Supabase error:', err);
  }

  // Fallback: any still-missing cards get fetched individually
  for (const entry of uncachedEntries) {
    if (!result.has(entry.originalId)) {
      try {
        const card = await getCardById(entry.originalId);
        if (card) result.set(entry.originalId, card);
      } catch {}
    }
  }

  return result;
}

/**
 * Get all eras using hard-coded data (ordered newest first).
 */
export function getErasList(): Array<{ id: string; name: string }> {
  return getEras();
}

// ==================== GLOBAL CARD SEARCH ====================

export interface CardSearchOptions {
  limit?: number;
  offset?: number;
  pokemonOnly?: boolean;
  exactMatch?: boolean;
  filters?: {
    eras?: string[];
    setIds?: string[];
    rarities?: string[];
    illustrators?: string[];
  };
}

export interface SearchFilterMeta {
  setIds: string[];
  eras: string[];
  rarities: string[];
}

export interface CardSearchResult {
  cards: Card[];
  filterMeta: SearchFilterMeta;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract the set ID from a card ID (everything before the last dash).
 */
function extractSetIdFromCardId(cardId: string): string {
  const lastDashIndex = cardId.lastIndexOf('-');
  if (lastDashIndex <= 0) return '';
  return cardId.slice(0, lastDashIndex);
}

/**
 * Map of "promo number prefixes" → app/pokemontcg.io set ID.
 * These are letter prefixes that appear in the printed card number on
 * Black Star Promo cards (e.g. card "SM211" lives in set "smp", with the
 * literal "SM" being part of the number, not the set ID).
 */
const PROMO_PREFIX_TO_SET_ID: Record<string, string> = {
  SM: 'smp',
  SWSH: 'swshp',
  XY: 'xyp',
  BW: 'bwp',
  HGSS: 'hsp',
  HS: 'hsp',
  DP: 'dpp',
};

/**
 * Cached longest-first list of known set IDs, used for splitting queries
 * like "svp051" → "svp-051". Built lazily because getAllSets() is cheap
 * but does a flatMap on every call.
 */
let cachedSortedSetIds: string[] | null = null;
function getSortedSetIdsLongestFirst(): string[] {
  if (cachedSortedSetIds) return cachedSortedSetIds;
  cachedSortedSetIds = getAllSets()
    .map(s => s.id.toLowerCase())
    .filter(id => id.length > 0)
    .sort((a, b) => b.length - a.length);
  return cachedSortedSetIds;
}

/**
 * Rewrite "shorthand" card-ID queries that omit the dash into their proper
 * dashed form so the existing card-ID search path can pick them up.
 *
 * Examples:
 *   "SM211"   → "smp-SM211"   (SM Black Star Promos)
 *   "SWSH123" → "swshp-SWSH123"
 *   "XY50"    → "xyp-XY50"
 *   "svp051"  → "svp-051"     (later normalised to "svp-51")
 *   "sv1025"  → "sv1-025"
 *
 * Returns the query unchanged when:
 *   - It already contains a dash (assumed to be a real card ID).
 *   - It doesn't look like any known promo / set-ID + number pattern.
 */
function rewriteShortCardIdQuery(query: string): string {
  if (!query || query.includes('-')) return query;

  // 1) Try promo-prefix match first. Order longest-first so "SWSH" beats "SW"
  //    and "HGSS" beats "HS".
  const promoPrefixes = ['SWSH', 'HGSS', 'SM', 'XY', 'BW', 'DP', 'HS'];
  for (const prefix of promoPrefixes) {
    const re = new RegExp(`^${prefix}(\\d+)$`, 'i');
    const m = query.match(re);
    if (m) {
      const setId = PROMO_PREFIX_TO_SET_ID[prefix];
      // Reconstruct with the canonical uppercase prefix so the DB id
      // (e.g. "smp-SM211") matches regardless of input case.
      return `${setId}-${prefix}${m[1]}`;
    }
  }

  // 2) Try "<known set id> + <number>" without a dash, e.g. "svp051".
  const lower = query.toLowerCase();
  for (const setId of getSortedSetIdsLongestFirst()) {
    if (lower.length > setId.length && lower.startsWith(setId)) {
      const rest = query.slice(setId.length);
      // Suffix must be alphanumeric and contain at least one digit
      // (so plain "svp" or "sve" alone don't get turned into card IDs).
      if (/^[a-z0-9]+$/i.test(rest) && /\d/.test(rest)) {
        return `${setId}-${rest}`;
      }
    }
  }

  return query;
}

const SEARCH_CACHE_DURATION = 2 * 60 * 1000;
const sortedSearchCache = new Map<string, { cards: Card[]; filterMeta: SearchFilterMeta; timestamp: number }>();

/**
 * Card-number prefixes that, when typed alone (no digits), are treated as
 * a "find all cards whose number starts with this prefix" search.
 *
 * Only listed prefixes trigger this path so we never collide with short
 * Pokémon names (Mew, Abra, Onix, Aron, Axew, etc.). All values must be
 * lowercase. Used by both pokemonApi.ts (for the Supabase + PTCG.io paths)
 * and useCardPicker.ts (to bypass the 3-char minimum query length).
 */
export const KNOWN_NUMBER_PREFIXES: ReadonlySet<string> = new Set([
  // Subset prefixes (small, distinctive subsets within larger sets)
  'tg',   // Trainer Gallery
  'gg',   // Galarian Gallery
  'sv',   // Shiny Vault
  'rc',   // Radiant Collection
  'h',    // Holo subsets (e-card era)
  'fa',   // Full Art (rare)
  // Promo set prefixes (also act as set IDs when combined with digits)
  'swsh', // Sword & Shield Promo
  'sm',   // Sun & Moon Promo
  'xy',   // XY Promo
  'bw',   // Black & White Promo
  'dp',   // Diamond & Pearl Promo
  'hgss', // HeartGold SoulSilver Promo
  'hs',   // HGSS (older naming)
]);

function isSearchCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < SEARCH_CACHE_DURATION;
}

/**
 * Build a pokemontcg.io query string from search parameters.
 */
function buildPtcgioQuery(params: {
  name?: string;
  number?: string;
  setId?: string;
  rarity?: string;
  artist?: string;
  supertype?: string;
}): string {
  const parts: string[] = [];
  
  if (params.name) parts.push(`name:"*${params.name}*"`);
  if (params.number) parts.push(`number:${params.number}`);
  if (params.setId) parts.push(`set.id:${params.setId}`);
  if (params.rarity) parts.push(`rarity:"${params.rarity}"`);
  if (params.artist) parts.push(`artist:"${params.artist}"`);
  if (params.supertype) parts.push(`supertype:${params.supertype}`);
  
  return parts.join(' ');
}

/**
 * Fetch all pages from pokemontcg.io for a given query.
 */
async function fetchAllSearchResults(query: string): Promise<any[]> {
  const allCards: any[] = [];
  let page = 1;
  let totalCount = Infinity;
  
  while (allCards.length < totalCount) {
    const response = await ptcgioFetch('/cards', {
      q: query,
      pageSize: '250',
      page: String(page),
      orderBy: '-set.releaseDate',
    });
    
    totalCount = response.totalCount;
    allCards.push(...response.data);
    page++;
    
    if (response.data.length === 0) break;
    // Safety limit: don't fetch more than 5 pages (1250 cards)
    if (page > 5) break;
  }
  
  return allCards;
}

/**
 * Search for cards by name across all sets.
 * Searches Supabase pokemon_cards table. Falls back to API if table is empty.
 */
export async function searchCardsByName(
  query: string,
  options?: CardSearchOptions
): Promise<CardSearchResult> {
  const { limit = 50, offset = 0, pokemonOnly = false, exactMatch = false, filters } = options || {};
  
  console.log('[API] searchCardsByName() called:', { query, limit, offset, pokemonOnly, exactMatch });
  const startTime = performance.now();
  
  const hasFilters = filters && (
    (filters.eras && filters.eras.length > 0) ||
    (filters.setIds && filters.setIds.length > 0) ||
    (filters.rarities && filters.rarities.length > 0) ||
    (filters.illustrators && filters.illustrators.length > 0)
  );
  
  const emptyResult: CardSearchResult = { cards: [], filterMeta: { setIds: [], eras: [], rarities: [] } };

  if ((!query || query.trim().length === 0) && !hasFilters) {
    return emptyResult;
  }
  
  // Rewrite shorthand IDs like "SM211" / "svp051" / "SWSH123" / "XY50"
  // into "smp-SM211" / "svp-051" / "swshp-SWSH123" / "xyp-XY50" so they go
  // down the existing card-ID search path. Done before the cache key so
  // different shorthand variants share the same cached results.
  const sanitizedQuery = rewriteShortCardIdQuery(query ? query.trim() : '');
  
  const filterKey = filters 
    ? `-era:${(filters.eras || []).sort().join(',')}-set:${(filters.setIds || []).sort().join(',')}-rar:${(filters.rarities || []).sort().join(',')}-ill:${(filters.illustrators || []).sort().join(',')}`
    : '';
  
  const sortedCacheKey = `sorted-search-${sanitizedQuery.toLowerCase()}-${pokemonOnly}-${exactMatch}${filterKey}`;
  
  const cachedSorted = sortedSearchCache.get(sortedCacheKey);
  if (cachedSorted && isSearchCacheValid(cachedSorted.timestamp)) {
    const paginatedResults = cachedSorted.cards.slice(offset, offset + limit);
    return { cards: paginatedResults, filterMeta: cachedSorted.filterMeta };
  }
  
  const fullFetchCacheKey = `full-fetch-${sanitizedQuery.toLowerCase()}-${pokemonOnly}${filterKey}`;
  
  return deduplicateRequest(fullFetchCacheKey, async () => {
    try {
      // Number search detection. Matches:
      //   - Pure-digit / "#123" queries:                "25", "#7", "001/159"
      //   - Alphanumeric-prefix card numbers:           "tg12", "gg01", "h1", "sve15"
      //     (1-4 letters immediately followed by a digit covers all known
      //     Pokémon TCG number prefixes: TG, GG, SV, SVE, SVP, RC, H, FA, ...)
      const isNumberSearch = !!sanitizedQuery && (
        /^#?\d/.test(sanitizedQuery) ||
        /^[a-z]{1,4}\d/i.test(sanitizedQuery)
      );
      const isCardIdSearch = sanitizedQuery && /^(?=.*\d)[a-z0-9.]+[-][a-z0-9]+$/i.test(sanitizedQuery);

      // "Number prefix" search: the user types a known card-number prefix
      // alone (no digits), e.g. "tg" -> all TG?? cards, "gg" -> all GG??
      // cards. Only triggered for an exact match against the whitelist below
      // so we never collide with name searches like "abra", "char", "mew".
      const isNumberPrefixSearch = !!sanitizedQuery
        && !isNumberSearch
        && !isCardIdSearch
        && KNOWN_NUMBER_PREFIXES.has(sanitizedQuery.toLowerCase());
      
      // ----- Resolve filter values for DB pushdown -----
      // Era filter is resolved to a list of set IDs (both app + pokemontcg.io
      // forms) using the static POKEMON_ERAS list.
      const eraSetIds: string[] | null = (filters?.eras && filters.eras.length > 0)
        ? (() => {
            const ids = new Set<string>();
            for (const eraName of filters.eras) {
              for (const s of getSetsByEra(eraName)) {
                ids.add(s.id);
                ids.add(getPtcgioSetId(s.id));
              }
            }
            return Array.from(ids);
          })()
        : null;

      const explicitSetIds: string[] | null = (filters?.setIds && filters.setIds.length > 0)
        ? Array.from(new Set(filters.setIds.flatMap(s => [s, getPtcgioSetId(s)])))
        : null;

      // Effective set IDs pushed to the main query. If both era and explicit
      // sets are active, intersect them so we never broaden beyond the user's
      // selection.
      const effectiveSetIds: string[] | null = (() => {
        if (eraSetIds && explicitSetIds) {
          const eraLower = new Set(eraSetIds.map(s => s.toLowerCase()));
          return explicitSetIds.filter(s => eraLower.has(s.toLowerCase()));
        }
        return explicitSetIds || eraSetIds;
      })();

      // ----- Helper: build a Supabase query with the search-defining
      // filters applied (text/number/cardId + pokemonOnly). User picker
      // filters (era/set/rarity/illustrator) are applied on top of this. -----
      const applySearchPredicates = (q: any) => {
        if (isCardIdSearch) {
          const ptcgioId = convertCardIdToPtcgio(sanitizedQuery);
          return q.eq('id', ptcgioId);
        }
        if (isNumberSearch) {
          const parts = sanitizedQuery.replace(/^#/, '').split('/');
          const rawNumber = parts[0];
          // For purely numeric queries, generate zero-padded variations so
          // typing "1", "01", or "001" all match cards stored as any of
          // those formats (older sets store "1", newer sets store "001").
          if (/^\d+$/.test(rawNumber)) {
            const stripped = rawNumber.replace(/^0+/, '') || '0';
            const variations = Array.from(new Set<string>([
              stripped,
              stripped.padStart(2, '0'),
              stripped.padStart(3, '0'),
              stripped.padStart(4, '0'),
            ]));
            q = q.in('number', variations);
          } else {
            // ilike (no wildcards) = case-insensitive equality, so "tg12"
            // matches a stored "TG12". Used for alphanumeric numbers like
            // "tg12", "gg01", "h1", "sve15".
            q = q.ilike('number', rawNumber);
          }
          // Only enforce the set's printed-total filter when the user gave
          // a real number (e.g. "25/172"). Subset totals like "TG30" aren't
          // stored in the DB, so we just ignore that part instead of
          // breaking the query with NaN.
          if (parts.length > 1 && parts[1] && /^\d+$/.test(parts[1])) {
            q = q.eq('set_printed_total', Number(parts[1]));
          }
          return q;
        }
        if (isNumberPrefixSearch) {
          // ilike with a trailing % = case-insensitive prefix match.
          // "tg" -> matches numbers TG01, TG02, ..., TG30 across all sets.
          return q.ilike('number', `${sanitizedQuery}%`);
        }
        if (sanitizedQuery) {
          // Search the punctuation-stripped column so users can type
          // "Charizard GX" to find "Charizard-GX", etc. The
          // name_normalized column is created in
          // database/migrations/add_normalized_name_search.sql and uses
          // the SAME rules as normalizeForNameSearch().
          const normalizedDbQuery = normalizeForNameSearch(sanitizedQuery);
          q = q.ilike('name_normalized', `%${normalizedDbQuery}%`);
        }
        if (pokemonOnly) {
          q = q.eq('supertype', 'Pokémon');
        }
        return q;
      };

      // ----- Filter helpers (computed BEFORE any DB call) -----
      // These are derived purely from inputs (filters / query / exactMatch),
      // not from query results, so we can build them up front and use them
      // for both the main query and the facet queries. That lets us fire
      // everything together via Promise.all below — saving another network
      // round-trip on cold loads (no main→facet wait chain).
      // Normalized (lowercase + accent-stripped) typed illustrator names,
      // used for client-side substring matching against the (also normalized)
      // artist field. Matches the SQL `artist_normalized` column logic.
      const illLower = (filters?.illustrators && filters.illustrators.length > 0)
        ? filters.illustrators.map(i => normalizeForArtistSearch(i)).filter(s => s.length > 0)
        : null;
      const rarityLower = (filters?.rarities && filters.rarities.length > 0)
        ? new Set(filters.rarities.map(r => r.toLowerCase()))
        : null;
      const lowerQuery = sanitizedQuery ? sanitizedQuery.toLowerCase() : '';
      // Same query, but with punctuation stripped so it matches the
      // normalized card name (see normalizeForNameSearch).
      const normalizedQuery = sanitizedQuery ? normalizeForNameSearch(sanitizedQuery) : '';
      const wordBoundaryRegex = (exactMatch && sanitizedQuery)
        ? new RegExp(`\\b${escapeRegExp(lowerQuery)}(?:\\b|\\s|$)`, 'i')
        : null;

      // Re-applies the same name-prefix / exactMatch / illustrator filters
      // that are applied client-side to the main results, so facets reflect
      // actually-displayable cards.
      // Pre-split the normalized query into words once. Each query word
      // must match the START of some word in the card's normalized name.
      // This is what gives "lv x" -> "Empoleon LV.X" while still rejecting
      // "char" -> "Macho" (no word in "macho" starts with "char").
      const normalizedQueryWords = normalizedQuery
        ? normalizedQuery.split(/\s+/).filter(Boolean)
        : [];

      const passesClientFilters = (row: { name?: string | null; artist?: string | null }) => {
        const name = row.name || '';
        if (normalizedQueryWords.length > 0 && !isNumberSearch && !isCardIdSearch && !isNumberPrefixSearch) {
          // Compare against the normalized name so punctuation in the
          // card name (e.g. "Charizard-GX") doesn't block matches.
          const nameWords = normalizeForNameSearch(name).split(/\s+/);
          const ok = normalizedQueryWords.every(qw =>
            nameWords.some(nw => nw.startsWith(qw))
          );
          if (!ok) return false;
        }
        if (wordBoundaryRegex && !wordBoundaryRegex.test(name)) return false;
        if (illLower) {
          if (!row.artist) return false;
          const a = normalizeForArtistSearch(row.artist);
          if (!illLower.some(i => a.includes(i))) return false;
        }
        return true;
      };

      // PostgREST `.or()` uses commas to separate conditions and parens to
      // group them, so any of those characters appearing inside an artist
      // name would break the filter string. Strip them from the value used
      // for the substring match (matching is fuzzy anyway, so a missing
      // paren in "Foo (Bar)" doesn't hurt).
      const sanitizeForOr = (s: string) => s.replace(/[,()]/g, ' ').trim();

      // Build a PostgREST OR clause for the illustrator filter, so the
      // substring match runs in Postgres (using the trigram index) instead
      // of being applied client-side after a 1000-row cap.
      //
      // We query `artist_normalized` (lowercased + accent-stripped) so users
      // can type "Mekayu" to find "Mékayu". The same normalization is
      // applied to the user-typed name via normalizeForArtistSearch().
      const illustratorOrClause: string | null = (illLower && filters?.illustrators)
        ? filters.illustrators
            .map(name => sanitizeForOr(normalizeForArtistSearch(name)))
            .filter(name => name.length > 0)
            .map(name => `artist_normalized.ilike.%${name}%`)
            .join(',') || null
        : null;

      // Builds a facet query: applies the search-defining filters + the
      // selected picker filters EXCEPT the one being skipped (so opening a
      // picker shows what would be available if you swapped its value).
      const buildFacetQuery = (
        selectCols: string,
        skip: 'era' | 'set' | 'rarity'
      ) => {
        let q = applySearchPredicates(supabase.from('pokemon_cards').select(selectCols));

        let setFilterIds: string[] | null = null;
        if (skip === 'era') {
          setFilterIds = explicitSetIds;
        } else if (skip === 'set') {
          setFilterIds = eraSetIds;
        } else {
          setFilterIds = effectiveSetIds;
        }
        if (setFilterIds && setFilterIds.length > 0) {
          q = q.in('set_id', setFilterIds);
        }
        if (skip !== 'rarity' && filters?.rarities && filters.rarities.length > 0) {
          q = q.in('rarity', filters.rarities);
        }
        if (illustratorOrClause) {
          q = q.or(illustratorOrClause);
        }
        return q;
      };

      // Only ask Supabase for the columns each facet actually needs.
      // `name` only matters when there is a text/exact-match query.
      // `artist` is no longer needed because the illustrator filter is now
      // pushed down to the DB via `.or(artist.ilike...)` instead of being
      // applied client-side via passesClientFilters.
      const facetNeedsName = !!(lowerQuery && !isNumberSearch && !isCardIdSearch && !isNumberPrefixSearch) || !!wordBoundaryRegex;
      const buildFacetCols = (primary: string) => {
        const cols = [primary];
        if (facetNeedsName) cols.push('name');
        return cols.join(', ');
      };

      // Era facet can use the static POKEMON_ERAS list (no DB call) when
      // nothing else narrows it. With an illustrator filter active we still
      // need a real query so we only show eras that have cards by that
      // artist.
      const eraFacetUnbounded = !sanitizedQuery
        && !explicitSetIds
        && !rarityLower
        && !illLower;

      // Set facet can use the DISTINCT-set_ids RPC (bypasses the 1000-row
      // Supabase cap) when nothing narrows by name / artist / rarity.
      const setFacetCanUseRpc = !sanitizedQuery
        && !rarityLower
        && !illLower;

      // ----- Main results query: ALL filters pushed down to the DB.
      // This avoids the previous bug where era filters were applied client-side
      // after a 1000-row LIMIT silently clipped most matching cards.
      // Only select the columns transformDbRowToCard / set-exclusion need —
      // not select('*'), which used to pull every column (descriptions,
      // attacks, prices, etc.) and was a major part of the slow first load.
      let supaQuery = applySearchPredicates(
        supabase.from('pokemon_cards').select(POKEMON_CARD_QUERY_COLUMNS)
      );

      if (effectiveSetIds && effectiveSetIds.length > 0) {
        supaQuery = supaQuery.in('set_id', effectiveSetIds);
      }
      if (filters?.rarities && filters.rarities.length > 0) {
        supaQuery = supaQuery.in('rarity', filters.rarities);
      }
      if (illustratorOrClause) {
        // Pushed down to Postgres (uses idx_pokemon_cards_artist_trgm).
        supaQuery = supaQuery.or(illustratorOrClause);
      }

      supaQuery = supaQuery.limit(1000);

      // ----- Fire main + facet queries in PARALLEL -----
      // The facet queries don't depend on the main query result (they only
      // depend on the filter inputs, which are already known). Running them
      // alongside the main query removes another full network round-trip
      // from the cold load.
      const [mainRes, setFacetRes, rarityFacetRes, eraFacetRes] = await Promise.all([
        supaQuery,
        setFacetCanUseRpc
          ? supabase.rpc('distinct_set_ids', {
              p_set_ids: eraSetIds,
              p_pokemon_only: pokemonOnly,
            })
          : buildFacetQuery(buildFacetCols('set_id'), 'set').limit(5000),
        buildFacetQuery(buildFacetCols('rarity'), 'rarity').limit(5000),
        eraFacetUnbounded
          ? Promise.resolve({ data: null as any, error: null as any })
          : buildFacetQuery(buildFacetCols('set_id'), 'era').limit(5000),
      ]);

      // ----- Process main query result -----
      const { data: dbCards, error } = mainRes;
      let transformedCards: Card[];

      if (!error && dbCards && dbCards.length > 0) {
        console.log('[API] Search results from Supabase:', { count: dbCards.length });
        transformedCards = dbCards
          .filter((row: any) => !isExcludedSet(row.set_id))
          .map(transformDbRowToCard);
      } else {
        // Fallback to API search (Supabase had no matching cards).
        console.warn('[API] Supabase search empty, falling back to API');
        const queryParts: string[] = [];

        if (isCardIdSearch) {
          try {
            const response = await ptcgioFetch(`/cards/${encodeURIComponent(sanitizedQuery)}`);
            if (response.data) {
              const card = transformPtcgioCardToCard(response.data);
              const filterMeta: SearchFilterMeta = {
                setIds: [response.data.set?.id || ''],
                eras: [],
                rarities: card.rarity ? [card.rarity] : [],
              };
              sortedSearchCache.set(sortedCacheKey, { cards: [card], filterMeta, timestamp: Date.now() });
              return { cards: [card], filterMeta };
            }
          } catch {}
          return emptyResult;
        }

        if (isNumberSearch) {
          const numParts = sanitizedQuery.replace(/^#/, '').split('/');
          queryParts.push(`number:${numParts[0]}`);
          // Same guard as the Supabase path: only enforce printed-total if
          // the user gave a real number, so "tg12/tg30" still finds TG12s
          // instead of dying on a non-numeric printedTotal.
          if (numParts.length > 1 && numParts[1] && /^\d+$/.test(numParts[1])) {
            queryParts.push(`set.printedTotal:${numParts[1]}`);
          }
        } else if (isNumberPrefixSearch) {
          // Lucene-style wildcard prefix match on the number field.
          queryParts.push(`number:${sanitizedQuery}*`);
        } else if (sanitizedQuery) {
          queryParts.push(`name:"*${sanitizedQuery}*"`);
        }
        if (pokemonOnly) queryParts.push('supertype:Pokémon');

        const cardResults = await fetchAllSearchResults(queryParts.join(' '));
        transformedCards = cardResults
          .filter((card: any) => !isExcludedSet(card.set?.id || ''))
          .map(transformPtcgioCardToCard);
      }

      // ----- Apply client-side filters to main results -----
      if (sanitizedQuery && !isNumberSearch && !isCardIdSearch && !isNumberPrefixSearch && normalizedQueryWords.length > 0) {
        transformedCards = transformedCards.filter(card => {
          // Each word of the (normalized) query must match the start of
          // some word in the (normalized) card name. So "lv x" matches
          // "Empoleon LV.X" (lv->lv, x->x), and "char" still rejects
          // "Macho" (no word in "macho" starts with "char").
          const nameWords = normalizeForNameSearch(card.name).split(/\s+/);
          return normalizedQueryWords.every(qw =>
            nameWords.some(word => word.startsWith(qw))
          );
        });
      }

      if (wordBoundaryRegex) {
        transformedCards = transformedCards.filter(card => wordBoundaryRegex.test(card.name));
      }

      if (illLower) {
        transformedCards = transformedCards.filter(card => {
          if (!card.illustrator) return false;
          const a = normalizeForArtistSearch(card.illustrator);
          return illLower.some(i => a.includes(i));
        });
      }

      const allSortedCards = sortCardsBySetDate(transformedCards);

      // ----- Process facet results -----
      const metaSetIds = new Set<string>();
      const metaEras = new Set<string>();
      const metaRarities = new Set<string>();

      // ---- Set facet ----
      if (!setFacetRes.error && setFacetRes.data) {
        for (const row of setFacetRes.data as any[]) {
          if (isExcludedSet(row.set_id)) continue;
          // passesClientFilters is a no-op when no text/illustrator filter is
          // active, which is exactly when the RPC path is taken — so it's
          // safe to call regardless of which path produced the rows.
          if (!passesClientFilters(row)) continue;
          if (row.set_id) metaSetIds.add(String(row.set_id).toLowerCase());
        }
      }

      // ---- Rarity facet ----
      if (!rarityFacetRes.error && rarityFacetRes.data) {
        for (const row of rarityFacetRes.data as any[]) {
          if (!passesClientFilters(row)) continue;
          if (row.rarity?.trim()) metaRarities.add(row.rarity);
        }
      }

      // ---- Era facet ----
      if (eraFacetUnbounded) {
        for (const e of getEras()) metaEras.add(e.name);
      } else if (!eraFacetRes.error && eraFacetRes.data) {
        for (const row of eraFacetRes.data as any[]) {
          if (isExcludedSet(row.set_id)) continue;
          if (!passesClientFilters(row)) continue;
          const eraName = getEraNameBySetId(String(row.set_id || '').toLowerCase());
          if (eraName) metaEras.add(eraName);
        }
      }

      const filterMeta: SearchFilterMeta = {
        setIds: Array.from(metaSetIds),
        eras: Array.from(metaEras),
        rarities: Array.from(metaRarities).sort((a, b) => a.localeCompare(b)),
      };
      
      sortedSearchCache.set(sortedCacheKey, { cards: allSortedCards, filterMeta, timestamp: Date.now() });
      
      const paginatedResults = allSortedCards.slice(offset, offset + limit);
      
      const duration = performance.now() - startTime;
      console.log('[API] searchCardsByName() completed:', {
        query: sanitizedQuery,
        total: allSortedCards.length,
        returned: paginatedResults.length,
        duration: `${duration.toFixed(0)}ms`,
      });
      
      return { cards: paginatedResults, filterMeta };
    } catch (error) {
      console.error('[API] Error in searchCardsByName():', error);
      return emptyResult;
    }
  });
}

// ==================== RARITY FUNCTIONS ====================

let cachedRarities: string[] | null = null;

/**
 * Get all available card rarities from Supabase.
 */
export async function getRarities(): Promise<string[]> {
  if (cachedRarities) return cachedRarities;

  try {
    // Use a Postgres function (created in Supabase) that returns DISTINCT
    // rarities directly, so we get every value regardless of table size.
    const { data, error } = await supabase.rpc('distinct_rarities');

    if (!error && data) {
      const rarities = new Set<string>();
      for (const row of data as Array<{ rarity: string | null }>) {
        if (row.rarity) rarities.add(row.rarity);
      }
      cachedRarities = Array.from(rarities).sort((a, b) => a.localeCompare(b));
      return cachedRarities;
    }
  } catch (err) {
    console.warn('[API] Failed to fetch rarities from Supabase:', err);
  }

  // Fallback to API
  try {
    const response = await ptcgioFetch('/rarities');
    cachedRarities = (response.data as string[]).sort((a, b) => a.localeCompare(b));
    return cachedRarities;
  } catch {
    return [];
  }
}

/**
 * Get which rarities exist in specific set(s) from Supabase.
 */
const setRarityCache: Record<string, string[]> = {};

export async function getRaritiesForSets(setIds: string[]): Promise<string[]> {
  if (setIds.length === 0) return getRarities();

  const uncachedSetIds = setIds.filter(id => !setRarityCache[id]);
  
  if (uncachedSetIds.length > 0) {
    const ptcgioIds = uncachedSetIds.map(id => getPtcgioSetId(id));
    
    try {
      const { data, error } = await supabase
        .from('pokemon_cards')
        .select('set_id, rarity')
        .in('set_id', ptcgioIds)
        .not('rarity', 'is', null);
      
      if (!error && data) {
        for (const setId of uncachedSetIds) {
          const ptcgioId = getPtcgioSetId(setId);
          const rarities = new Set<string>();
          for (const row of data) {
            if (row.set_id === ptcgioId && row.rarity) {
              rarities.add(row.rarity);
            }
          }
          setRarityCache[setId] = Array.from(rarities).sort((a, b) => a.localeCompare(b));
        }
      }
    } catch {
      for (const id of uncachedSetIds) setRarityCache[id] = [];
    }
  }

  const merged = new Set<string>();
  for (const setId of setIds) {
    for (const r of (setRarityCache[setId] || [])) {
      merged.add(r);
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

// ==================== ILLUSTRATOR FUNCTIONS ====================

let cachedIllustrators: string[] | null = null;

/**
 * Get every distinct illustrator (artist) name from Supabase.
 *
 * Used by the Card Picker's illustrator autocomplete dropdown so users can
 * pick a real artist name instead of guessing the spelling. Fetched once and
 * cached for the rest of the session.
 *
 * Uses the `distinct_artists` Postgres RPC (created in
 * database/migrations/add_artist_search_index.sql) so the full list is
 * returned in one round-trip without hitting the 1000-row Supabase fetch cap.
 */
export async function getIllustrators(): Promise<string[]> {
  if (cachedIllustrators) return cachedIllustrators;

  try {
    const { data, error } = await supabase.rpc('distinct_artists');

    if (!error && data) {
      const artists = new Set<string>();
      for (const row of data as Array<{ artist: string | null }>) {
        if (row.artist && row.artist.trim().length > 0) {
          artists.add(row.artist.trim());
        }
      }
      cachedIllustrators = Array.from(artists).sort((a, b) => a.localeCompare(b));
      return cachedIllustrators;
    }
    if (error) {
      console.warn('[API] distinct_artists RPC failed:', error);
    }
  } catch (err) {
    console.warn('[API] Failed to fetch illustrators from Supabase:', err);
  }

  // Fallback: scan the artist column directly (capped at 1000 rows by Supabase,
  // so this is a best-effort list if the RPC isn't available yet).
  try {
    const { data, error } = await supabase
      .from('pokemon_cards')
      .select('artist')
      .not('artist', 'is', null);

    if (!error && data) {
      const artists = new Set<string>();
      for (const row of data as Array<{ artist: string | null }>) {
        if (row.artist && row.artist.trim().length > 0) {
          artists.add(row.artist.trim());
        }
      }
      cachedIllustrators = Array.from(artists).sort((a, b) => a.localeCompare(b));
      return cachedIllustrators;
    }
  } catch {
    // ignore
  }

  return [];
}

// ==================== SET TOTAL COUNTS ====================

let setTotalCountCache: Map<string, number> | null = null;

/**
 * Get total card counts for every set from Supabase.
 */
export async function getSetTotalCounts(): Promise<Map<string, number>> {
  if (setTotalCountCache) return setTotalCountCache;

  try {
    const { data, error } = await supabase
      .from('pokemon_sets')
      .select('id, total');
    
    if (!error && data) {
      const totalMap = new Map<string, number>();
      for (const s of data) {
        if (s.id && s.total != null) {
          totalMap.set(s.id, Number(s.total));
        }
      }
      setTotalCountCache = totalMap;
      return totalMap;
    }
  } catch (err) {
    console.warn('[API] Supabase set counts failed:', err);
  }

  // Fallback to API
  try {
    const response = await ptcgioFetch('/sets', { pageSize: '250' });
    const totalMap = new Map<string, number>();
    for (const s of response.data) {
      if (s.id && s.total != null) {
        totalMap.set(s.id, Number(s.total));
      }
    }
    setTotalCountCache = totalMap;
    return totalMap;
  } catch (error) {
    console.warn('[API] Error fetching set counts:', error);
    return new Map();
  }
}
