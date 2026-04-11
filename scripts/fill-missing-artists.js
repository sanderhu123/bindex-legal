/**
 * Fill missing artist/illustrator data from TCGdex API.
 * Finds all cards in Supabase with null artist, fetches the illustrator
 * from TCGdex, and updates the row.
 * 
 * Run: node scripts/fill-missing-artists.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY
);

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';

// pokemontcg.io set ID → TCGdex set ID (only for sets that differ)
const PTCGIO_TO_TCGDEX_SET = {
  'sv1': 'sv01', 'sv2': 'sv02', 'sv3': 'sv03', 'sv4': 'sv04', 'sv5': 'sv05',
  'sv6': 'sv06', 'sv7': 'sv07', 'sv8': 'sv08', 'sv9': 'sv09', 'sv10': 'sv10',
  'sv3pt5': 'sv03.5', 'sv4pt5': 'sv04.5', 'sv6pt5': 'sv06.5',
  'sv8pt5': 'sv08.5',
  'zsv10pt5': 'sv10.5b', 'rsv10pt5': 'sv10.5w',
  'me1': 'me01', 'me2': 'me02', 'me2pt5': 'me02.5', 'me3': 'me03',
  'sm35': 'sm3.5', 'sm75': 'sm7.5',
  'swsh35': 'swsh3.5', 'swsh45': 'swsh4.5', 'swsh12pt5': 'swsh12.5',
  'base6': 'lc', 'fut20': 'fut2020', 'hsp': 'hgssp', 'bp': 'bog',
  'sve': 'sve',
};

function ptcgioCardIdToTcgdex(ptcgioId) {
  const lastDash = ptcgioId.lastIndexOf('-');
  if (lastDash <= 0) return null;

  const setId = ptcgioId.slice(0, lastDash);
  const number = ptcgioId.slice(lastDash + 1);

  const tcgdexSet = PTCGIO_TO_TCGDEX_SET[setId] || setId;
  // TCGdex uses zero-padded numbers for most sets
  const paddedNumber = /^\d+$/.test(number) ? number.padStart(3, '0') : number;

  return `${tcgdexSet}-${paddedNumber}`;
}

async function fetchTcgdexCard(tcgdexId) {
  try {
    const response = await fetch(`${TCGDEX_BASE}/cards/${tcgdexId}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function main() {
  console.log('=== Fill Missing Artists from TCGdex ===\n');

  // Fetch all cards missing artist (in pages of 1000)
  const allMissing = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('pokemon_cards')
      .select('id, set_id')
      .is('artist', null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('Query error:', error); return; }
    allMissing.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`Found ${allMissing.length} cards missing artist\n`);

  let updated = 0;
  let notFound = 0;
  let noArtist = 0;

  for (let i = 0; i < allMissing.length; i++) {
    const card = allMissing[i];
    const tcgdexId = ptcgioCardIdToTcgdex(card.id);

    if (!tcgdexId) { notFound++; continue; }

    const tcgdexCard = await fetchTcgdexCard(tcgdexId);

    if (!tcgdexCard) {
      notFound++;
      continue;
    }

    if (!tcgdexCard.illustrator) {
      noArtist++;
      continue;
    }

    const { error } = await supabase
      .from('pokemon_cards')
      .update({ artist: tcgdexCard.illustrator })
      .eq('id', card.id);

    if (error) {
      console.error(`  Error updating ${card.id}:`, error.message);
    } else {
      updated++;
    }

    // Progress every 100 cards
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${allMissing.length} (updated: ${updated}, not found: ${notFound}, no artist: ${noArtist})`);
    }

    // Small delay to be nice to TCGdex
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`\n=== Done! ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Not found on TCGdex: ${notFound}`);
  console.log(`Found but no artist: ${noArtist}`);
  console.log(`Total processed: ${allMissing.length}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
