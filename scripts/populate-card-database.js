/**
 * Populate Supabase with all Pokémon TCG card and set data from pokemontcg.io.
 * 
 * Run from the project root:
 *   node scripts/populate-card-database.js
 * 
 * Requires .env with:
 *   EXPO_PUBLIC_POKEMON_TCG_API_KEY
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Prefer service role key (bypasses RLS for write operations).
// Falls back to anon key for read-only operations or if RLS allows writes.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!API_KEY) { console.error('Missing EXPO_PUBLIC_POKEMON_TCG_API_KEY in .env'); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing Supabase URL or key in .env'); process.exit(1); }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not set. Writes may fail due to RLS.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sub-sets that belong to a parent set
const PARENT_SET_MAP = {
  'swsh9tg': 'swsh9',
  'swsh10tg': 'swsh10',
  'swsh11tg': 'swsh11',
  'swsh12tg': 'swsh12',
  'swsh12pt5gg': 'swsh12pt5',
  'swsh45sv': 'swsh45',
  'sma': 'sm115',
  'cel25c': 'cel25',
};

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: { 'X-Api-Key': API_KEY },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchAllSets() {
  console.log('Fetching all sets...');
  const result = await apiFetch('/sets', { pageSize: '250', orderBy: 'releaseDate' });
  console.log(`  Found ${result.data.length} sets`);
  return result.data;
}

async function fetchCardsForSet(setId) {
  const allCards = [];
  let page = 1;
  let totalCount = Infinity;

  while (allCards.length < totalCount) {
    // NOTE: We intentionally do NOT use orderBy: 'number'.
    // pokemontcg.io sorts numbers as strings, which breaks pagination
    // (high-numbered secret rares get silently dropped across pages).
    const result = await apiFetch('/cards', {
      q: `set.id:${setId}`,
      pageSize: '250',
      page: String(page),
    });

    totalCount = result.totalCount;
    allCards.push(...result.data);
    page++;

    if (result.data.length === 0) break;
  }

  return allCards;
}

function cardHasReverseHolo(card) {
  return !!(card.tcgplayer?.prices?.reverseHolofoil);
}

async function insertSets(sets) {
  console.log(`Inserting ${sets.length} sets into Supabase...`);

  const rows = sets.map(s => ({
    id: s.id,
    name: s.name,
    series: s.series,
    printed_total: s.printedTotal,
    total: s.total,
    release_date: s.releaseDate || null,
    symbol_url: s.images?.symbol || null,
    logo_url: s.images?.logo || null,
    ptcgo_code: s.ptcgoCode || null,
    parent_set_id: PARENT_SET_MAP[s.id] || null,
  }));

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from('pokemon_sets')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  Error inserting sets batch ${i}:`, error.message);
      throw error;
    }
  }

  console.log('  Sets inserted successfully');
}

async function insertCards(cards) {
  const rowsById = new Map();
  for (const c of cards) {
    if (!c.id) continue;
    rowsById.set(c.id, {
      id: c.id,
      name: c.name,
      number: c.number,
      set_id: c.set.id,
      set_name: c.set.name,
      rarity: c.rarity || null,
      artist: c.artist || null,
      supertype: c.supertype || 'Unknown',
      image_small: c.images?.small || null,
      image_large: c.images?.large || null,
      set_printed_total: c.set?.printedTotal || null,
      has_reverse_holo: cardHasReverseHolo(c),
      pokedex_number: c.nationalPokedexNumbers?.[0] || null,
    });
  }
  const rows = Array.from(rowsById.values());

  if (rows.length < cards.length) {
    console.log(`    (deduped ${cards.length - rows.length} duplicate id(s))`);
  }

  // Insert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('pokemon_cards')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  Error inserting cards batch:`, error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('=== Pokémon TCG Database Population Script ===\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Supabase: ${SUPABASE_URL}\n`);

  // Step 1: Fetch and insert all sets
  const sets = await fetchAllSets();
  await insertSets(sets);

  // Step 2: Fetch and insert cards for each set
  let totalCards = 0;
  let apiCalls = 0;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    process.stdout.write(`[${i + 1}/${sets.length}] ${set.name} (${set.id})... `);

    try {
      const cards = await fetchCardsForSet(set.id);
      apiCalls += Math.ceil(cards.length / 250) || 1;
      
      if (cards.length > 0) {
        await insertCards(cards);
        totalCards += cards.length;
        console.log(`${cards.length} cards`);
      } else {
        console.log('0 cards (empty set)');
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    // Small delay to be nice to the API (50ms between sets)
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n=== Done! ===`);
  console.log(`Total sets: ${sets.length}`);
  console.log(`Total cards: ${totalCards}`);
  console.log(`API calls used: ~${apiCalls + 1}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
