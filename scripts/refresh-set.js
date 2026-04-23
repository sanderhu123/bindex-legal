/**
 * Refresh cards for a single set in Supabase from pokemontcg.io.
 *
 * Usage:
 *   node scripts/refresh-set.js <setId>
 *
 * Example:
 *   node scripts/refresh-set.js me2pt5
 *
 * Requires .env with:
 *   EXPO_PUBLIC_POKEMON_TCG_API_KEY
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const setId = process.argv[2];
if (!setId) {
  console.error('Usage: node scripts/refresh-set.js <setId>');
  process.exit(1);
}

const API_KEY = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars (EXPO_PUBLIC_POKEMON_TCG_API_KEY, EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAllCards(setId) {
  const all = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    const url = `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=250&page=${page}`;
    const res = await fetch(url, { headers: { 'X-Api-Key': API_KEY } });
    if (!res.ok) {
      throw new Error(`API ${res.status}: ${await res.text()}`);
    }
    const r = await res.json();
    total = r.totalCount;
    all.push(...r.data);
    page++;
    if (r.data.length === 0) break;
  }

  return all;
}

(async () => {
  console.log(`Fetching cards for set: ${setId}`);
  const cards = await fetchAllCards(setId);
  console.log(`Fetched ${cards.length} cards from pokemontcg.io`);

  const map = new Map();
  for (const c of cards) {
    if (!c.id) continue;
    map.set(c.id, {
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
      has_reverse_holo: !!(c.tcgplayer?.prices?.reverseHolofoil),
      pokedex_number: c.nationalPokedexNumbers?.[0] || null,
    });
  }
  const rows = Array.from(map.values());
  if (rows.length < cards.length) {
    console.log(`Deduped ${cards.length - rows.length} duplicate id(s) -> ${rows.length} unique cards`);
  }

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('pokemon_cards')
      .upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
  }
  console.log(`Upserted ${rows.length} rows`);

  // Verify
  const { count } = await supabase
    .from('pokemon_cards')
    .select('*', { count: 'exact', head: true })
    .eq('set_id', setId);
  console.log(`Total rows in DB for ${setId}: ${count}`);

  const { data: sirs } = await supabase
    .from('pokemon_cards')
    .select('id, number, name')
    .eq('set_id', setId)
    .eq('rarity', 'Special Illustration Rare')
    .order('number');
  console.log(`Special Illustration Rares: ${sirs?.length || 0}`);
  if (sirs) {
    for (const s of sirs) console.log(`  ${s.number} - ${s.name}`);
  }
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
