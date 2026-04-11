import type { Card } from '../../types';
import type { PokemonArtStyle } from '../../types';
import { mockCards, mockSets, type MockSet } from '../../data/mockupCards';
import { getPokemonByRegion } from '../../data/pokemonRegions';
import { getEras, getSetsByEra, getAllSets, convertSetToPokemonSet, sortCardsBySetDate, getPtcgioSetId, getAppSetId } from '../../data/pokemonEras';
import { getSpecialVariantsForCard, hasSpecialVariants, setHasReverseHolos } from '../../data/cardVariants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStorageFullError, emergencyStorageCleanup } from '../cacheManager';

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
 * Includes both TCGdex and pokemontcg.io formats.
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
 * Transform a pokemontcg.io card to our internal Card type.
 */
function transformPtcgioCardToCard(card: any): Card {
  return {
    id: card.id || '',
    name: card.name || '',
    number: card.number || '',
    set: card.set?.name || '',
    rarity: card.rarity || '',
    illustrator: card.artist || '',
    imageUrl: card.images?.small || '',
    imageUrlHiRes: card.images?.large || '',
    variant: 'base' as const,
    supertype: card.supertype || '',
    setTotal: card.set?.printedTotal ? String(card.set.printedTotal) : '',
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
  
  return variants;
}

// ==================== SET FUNCTIONS ====================

function sortSetsByDate(sets: PokemonSet[]): PokemonSet[] {
  return [...sets].sort((a, b) => {
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
  });
}

/**
 * Get minimal set data from pokemontcg.io for initial display.
 */
export async function getSetsMinimal(): Promise<PokemonSet[]> {
  const cacheKey = 'sets-minimal';
  
  const cachedData = getCachedData<PokemonSet[]>(cacheKey);
  if (cachedData) return cachedData;
  
  if (isRateLimited()) {
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) return staleCache.data;
    return mockSets;
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // pokemontcg.io returns up to 250 sets per page
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
        }));
      
      setCachedData(cacheKey, sets);
      return sets;
    } catch (error) {
      try { handleRateLimitError(error); } catch (e) {
        throw new Error('Too many requests to the card database. Please wait a moment and try again.');
      }
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
      }));
    
    return sortSetsByDate(sets);
  } catch (error) {
    console.error('[API] Error in getSets():', error);
    return mockSets;
  }
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
 * Convert a TCGdex-format card ID to pokemontcg.io format.
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
  
  // pokemontcg.io uses separate sub-set IDs for gallery/vault cards
  if (/^GG\d/i.test(numberPart)) {
    ptcgioSetId = ptcgioSetId + 'gg';
  } else if (/^TG\d/i.test(numberPart)) {
    ptcgioSetId = ptcgioSetId + 'tg';
  } else if (/^SV\d/i.test(numberPart)) {
    // Shiny Vault cards: swsh45 → swsh45sv, sm115 → sma
    const svSubSet = GALLERY_SUB_SETS[ptcgioSetId];
    if (svSubSet) {
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
 * Tries: direct pokemontcg.io ID → app/TCGdex ID → set name lookup → API search.
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
  
  // 3. Last resort: search pokemontcg.io API by set name
  try {
    const response = await ptcgioFetch('/sets', {
      q: `name:"${setIdentifier}"`,
    });
    if (response.data && response.data.length > 0) {
      return response.data[0].id;
    }
  } catch {
    // Fall through
  }
  
  // If nothing works, return the original (will likely fail but gives a clear error)
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

async function fetchCardsForOneSet(ptcgioSetId: string): Promise<any[]> {
  const allCards: any[] = [];
  let page = 1;
  let totalCount = Infinity;
  
  while (allCards.length < totalCount) {
    const response = await ptcgioFetch('/cards', {
      q: `set.id:${ptcgioSetId}`,
      pageSize: '250',
      page: String(page),
      orderBy: 'number',
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
 * Accepts either a TCGdex set ID (e.g., "sv01") or pokemontcg.io set ID (e.g., "sv1").
 */
export async function getCardsBySet(setIdentifier: string): Promise<Card[]> {
  console.log('[API] getCardsBySet() called:', { setIdentifier });
  const overallStartTime = performance.now();
  
  const CARD_CACHE_VERSION = 3;
  const cacheKey = `cards-v${CARD_CACHE_VERSION}-${setIdentifier}`;
  
  const cachedData = getCachedData<Card[]>(cacheKey);
  if (cachedData) {
    console.log('[API] Returning cached cards:', { count: cachedData.length });
    return cachedData;
  }
  
  if (isRateLimited()) {
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) return staleCache.data;
    return mockCards.filter((card) => card.set === setIdentifier);
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // Resolve set identifier (name or ID) to a pokemontcg.io set ID
      const ptcgioSetId = await resolveSetId(setIdentifier);
      console.log('[API] Fetching cards for set:', { input: setIdentifier, ptcgioSetId });
      
      const ptcgioCards = await fetchAllCardsForSet(ptcgioSetId);
      
      console.log('[API] Cards fetched:', { count: ptcgioCards.length });
      
      // Transform cards
      const transformedCards = ptcgioCards.map(transformPtcgioCardToCard);
      
      // Generate variants for each card
      const allVariantCards: Card[] = [];
      for (let i = 0; i < transformedCards.length; i++) {
        const variantCards = generateVariantCards(transformedCards[i], ptcgioCards[i]);
        allVariantCards.push(...variantCards);
      }
      
      const validCards = allVariantCards.filter(card => card.id && card.name);
      
      setCachedData(cacheKey, validCards);
      
      const duration = performance.now() - overallStartTime;
      console.log('[API] getCardsBySet() completed:', {
        baseCards: transformedCards.length,
        totalWithVariants: validCards.length,
        duration: `${duration.toFixed(0)}ms`,
      });
      
      return validCards;
    } catch (error) {
      try { handleRateLimitError(error); } catch {
        throw new Error('Too many requests to the card database. Please wait a moment and try again.');
      }
      
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
 * @param id - Card ID from pokemontcg.io (e.g., "sv1-1") or with variant suffix (e.g., "sv1-1-base")
 */
export async function getCardById(id: string): Promise<Card | null> {
  // Custom placeholder cards are stored in Supabase
  if (id.startsWith('custom-')) {
    const { getCustomCard } = require('../supabase/customCards');
    return getCustomCard(id);
  }

  const cacheKey = `card-${id}`;
  
  const cachedData = getCachedData<Card | null>(cacheKey);
  if (cachedData !== null) return cachedData;
  
  if (isRateLimited()) {
    const staleCache = apiCache.get(cacheKey);
    if (staleCache) return staleCache.data;
    return mockCards.find((c) => c.id === id) || null;
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      // Extract variant suffix and base ID
      const variantMatch = id.match(/-(base|holo|reverse|poke-ball|master-ball)$/);
      const variant = variantMatch ? variantMatch[1] : undefined;
      const baseId = id.replace(/-(base|holo|reverse|poke-ball|master-ball)$/, '');
      
      const variantMap: Record<string, string> = {
        'base': 'base',
        'holo': 'base',
        'reverse': 'reverse-holo',
        'poke-ball': 'poke-ball',
        'master-ball': 'master-ball',
      };
      const cardVariant = variant ? variantMap[variant] : undefined;
      
      // Convert TCGdex card ID to pokemontcg.io format (e.g., "swsh12.5-001" → "swsh12pt5-1")
      const ptcgioCardId = convertCardIdToPtcgio(baseId);
      console.log('[API] getCardById() ID conversion:', { original: baseId, converted: ptcgioCardId });
      
      // Fetch from pokemontcg.io
      const response = await ptcgioFetch(`/cards/${encodeURIComponent(ptcgioCardId)}`);
      const ptcgioCard = response.data;
      
      if (!ptcgioCard) {
        throw new Error(`Card "${id}" not found.`);
      }
      
      const transformedCard = transformPtcgioCardToCard(ptcgioCard);
      
      // Preserve variant from the original request
      if (variant) {
        transformedCard.id = id;
        transformedCard.variant = cardVariant as any;
      }
      
      setCachedData(cacheKey, transformedCard);
      return transformedCard;
    } catch (error) {
      try { handleRateLimitError(error); } catch {
        throw new Error('Too many requests to the card database. Please wait a moment and try again.');
      }
      
      console.error('[API] Error in getCardById():', { cardId: id, error });
      
      const mockCard = mockCards.find((c) => c.id === id);
      if (mockCard) return mockCard;
      
      throw new Error(`Unable to load card "${id}". Please check your internet connection.`);
    }
  });
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

const SEARCH_CACHE_DURATION = 2 * 60 * 1000;
const sortedSearchCache = new Map<string, { cards: Card[]; filterMeta: SearchFilterMeta; timestamp: number }>();

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
  
  if (params.name) parts.push(`name:"${params.name}*"`);
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
  
  const sanitizedQuery = query ? query.trim() : '';
  
  const filterKey = filters 
    ? `-era:${(filters.eras || []).sort().join(',')}-set:${(filters.setIds || []).sort().join(',')}-rar:${(filters.rarities || []).sort().join(',')}-ill:${(filters.illustrators || []).sort().join(',')}`
    : '';
  
  const sortedCacheKey = `sorted-search-${sanitizedQuery.toLowerCase()}-${pokemonOnly}-${exactMatch}${filterKey}`;
  
  // Check sorted cache
  const cachedSorted = sortedSearchCache.get(sortedCacheKey);
  if (cachedSorted && isSearchCacheValid(cachedSorted.timestamp)) {
    const paginatedResults = cachedSorted.cards.slice(offset, offset + limit);
    return { cards: paginatedResults, filterMeta: cachedSorted.filterMeta };
  }
  
  if (isRateLimited()) {
    if (cachedSorted) {
      return { cards: cachedSorted.cards.slice(offset, offset + limit), filterMeta: cachedSorted.filterMeta };
    }
    throw new Error('Too many requests. Please wait a moment and try again.');
  }
  
  const fullFetchCacheKey = `full-fetch-${sanitizedQuery.toLowerCase()}-${pokemonOnly}${filterKey}`;
  
  return deduplicateRequest(fullFetchCacheKey, async () => {
    try {
      // Build the pokemontcg.io query
      const queryParts: string[] = [];
      
      // Detect if query is a card number
      const isNumberSearch = sanitizedQuery && /^#?\d/.test(sanitizedQuery);
      // Detect if query is a card ID
      const isCardIdSearch = sanitizedQuery && /^(?=.*\d)[a-z0-9.]+[-][a-z0-9]+$/i.test(sanitizedQuery);
      
      if (isCardIdSearch) {
        // Direct card ID lookup
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
        } catch {
          // Fall through to empty result
        }
        return emptyResult;
      }
      
      if (isNumberSearch) {
        const cleaned = sanitizedQuery.replace(/^#/, '').split('/')[0];
        queryParts.push(`number:${cleaned}`);
        
        // If set total specified (e.g., "7/159"), filter by it
        if (sanitizedQuery.includes('/')) {
          const total = sanitizedQuery.split('/')[1];
          if (total && !isNaN(Number(total))) {
            queryParts.push(`set.printedTotal:${total}`);
          }
        }
      } else if (sanitizedQuery) {
        queryParts.push(`name:"${sanitizedQuery}*"`);
      }
      
      // Add single-value API filters
      if (filters?.setIds && filters.setIds.length === 1) {
        const ptcgioId = getPtcgioSetId(filters.setIds[0]);
        queryParts.push(`set.id:${ptcgioId}`);
      }
      if (filters?.rarities && filters.rarities.length === 1) {
        queryParts.push(`rarity:"${filters.rarities[0]}"`);
      }
      if (filters?.illustrators && filters.illustrators.length === 1) {
        queryParts.push(`artist:"${filters.illustrators[0]}"`);
      }
      
      if (pokemonOnly) {
        queryParts.push('supertype:Pokémon');
      }
      
      const ptcgioQuery = queryParts.join(' ');
      console.log('[API] Search query:', ptcgioQuery);
      
      const cardResults = await fetchAllSearchResults(ptcgioQuery);
      
      // Transform to our Card type
      let transformedCards: Card[] = cardResults
        .filter((card: any) => {
          const setId = card.set?.id || '';
          return isAllowedSetId(setId) && !isExcludedSet(setId);
        })
        .map(transformPtcgioCardToCard);
      
      // Client-side: "word starts with" filter for name searches
      if (sanitizedQuery && !isNumberSearch && !isCardIdSearch) {
        const lowerQuery = sanitizedQuery.toLowerCase();
        transformedCards = transformedCards.filter(card => {
          const name = card.name.toLowerCase();
          return name.startsWith(lowerQuery) ||
            name.split(/\s+/).some(word => word.startsWith(lowerQuery));
        });
      }

      // Exact match filter
      if (exactMatch && sanitizedQuery) {
        const escapedQuery = escapeRegExp(sanitizedQuery.toLowerCase());
        const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}(?:\\b|\\s|$)`, 'i');
        transformedCards = transformedCards.filter(card => wordBoundaryRegex.test(card.name));
      }
      
      // Client-side era filter
      if (filters?.eras && filters.eras.length > 0) {
        const eraSetIds = new Set<string>();
        for (const eraName of filters.eras) {
          const eraSetDefs = getSetsByEra(eraName);
          for (const s of eraSetDefs) {
            eraSetIds.add(s.id.toLowerCase());
            eraSetIds.add(getPtcgioSetId(s.id).toLowerCase());
          }
        }
        
        transformedCards = transformedCards.filter(card => {
          const cardSetId = extractSetIdFromCardId(card.id).toLowerCase();
          return eraSetIds.has(cardSetId);
        });
      }
      
      // Client-side multi-set filter
      if (filters?.setIds && filters.setIds.length > 1) {
        const setIdSet = new Set(filters.setIds.flatMap(s => [
          s.toLowerCase(),
          getPtcgioSetId(s).toLowerCase(),
        ]));
        transformedCards = transformedCards.filter(card => {
          const cardSetId = extractSetIdFromCardId(card.id).toLowerCase();
          return setIdSet.has(cardSetId);
        });
      }
      
      // Client-side multi-rarity filter
      if (filters?.rarities && filters.rarities.length > 1) {
        const raritySet = new Set(filters.rarities.map(r => r.toLowerCase()));
        transformedCards = transformedCards.filter(card =>
          card.rarity && raritySet.has(card.rarity.toLowerCase())
        );
      }
      
      // Client-side multi-illustrator filter
      if (filters?.illustrators && filters.illustrators.length > 1) {
        const illLower = filters.illustrators.map(i => i.toLowerCase());
        transformedCards = transformedCards.filter(card => {
          if (!card.illustrator) return false;
          return illLower.some(ill => card.illustrator.toLowerCase().includes(ill));
        });
      }
      
      // Sort by set release date (newest first)
      const allSortedCards = sortCardsBySetDate(transformedCards);
      
      // Build filter metadata from ALL matching cards
      const metaSetIds = new Set<string>();
      const metaEras = new Set<string>();
      const metaRarities = new Set<string>();
      for (const card of allSortedCards) {
        const cardSetId = extractSetIdFromCardId(card.id).toLowerCase();
        if (cardSetId) {
          metaSetIds.add(cardSetId);
          const eraForSet = getEras().find(era => {
            const eraSets = getSetsByEra(era.name);
            return eraSets.some(s => 
              s.id.toLowerCase() === cardSetId || 
              getPtcgioSetId(s.id).toLowerCase() === cardSetId
            );
          });
          if (eraForSet) metaEras.add(eraForSet.name);
        }
        if (card.rarity?.trim()) metaRarities.add(card.rarity);
      }
      
      const filterMeta: SearchFilterMeta = {
        setIds: Array.from(metaSetIds),
        eras: Array.from(metaEras),
        rarities: Array.from(metaRarities).sort((a, b) => a.localeCompare(b)),
      };
      
      // Cache the full sorted list
      sortedSearchCache.set(sortedCacheKey, {
        cards: allSortedCards,
        filterMeta,
        timestamp: Date.now(),
      });
      
      // Return requested page
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
      try { handleRateLimitError(error); } catch {
        throw new Error('Too many requests to the card database. Please wait a moment and try again.');
      }
      console.error('[API] Error in searchCardsByName():', error);
      return emptyResult;
    }
  });
}

// ==================== RARITY FUNCTIONS ====================

let cachedRarities: string[] | null = null;

/**
 * Fetch all available card rarities from pokemontcg.io.
 */
export async function getRarities(): Promise<string[]> {
  if (cachedRarities) return cachedRarities;

  try {
    const response = await ptcgioFetch('/rarities');
    cachedRarities = (response.data as string[]).sort((a, b) => a.localeCompare(b));
    return cachedRarities;
  } catch (error) {
    console.warn('[API] Failed to fetch rarities:', error);
    return [];
  }
}

/**
 * Fetch which rarities actually exist in specific set(s).
 */
const setRarityCache: Record<string, string[]> = {};

export async function getRaritiesForSets(setIds: string[]): Promise<string[]> {
  if (setIds.length === 0) return getRarities();

  const uncachedSetIds = setIds.filter(id => !setRarityCache[id]);
  
  if (uncachedSetIds.length > 0) {
    await Promise.all(uncachedSetIds.map(async (setId) => {
      try {
        const ptcgioId = getPtcgioSetId(setId);
        const response = await ptcgioFetch('/cards', {
          q: `set.id:${ptcgioId}`,
          pageSize: '250',
        });
        
        const rarities = new Set<string>();
        for (const card of response.data) {
          if (card.rarity) rarities.add(card.rarity);
        }
        setRarityCache[setId] = Array.from(rarities).sort((a, b) => a.localeCompare(b));
      } catch {
        setRarityCache[setId] = [];
      }
    }));
  }

  const merged = new Set<string>();
  for (const setId of setIds) {
    for (const r of (setRarityCache[setId] || [])) {
      merged.add(r);
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

// ==================== SET TOTAL COUNTS ====================

let setTotalCountCache: Map<string, number> | null = null;

/**
 * Fetch total card counts for every set from pokemontcg.io.
 */
export async function getSetTotalCounts(): Promise<Map<string, number>> {
  if (setTotalCountCache) return setTotalCountCache;

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
