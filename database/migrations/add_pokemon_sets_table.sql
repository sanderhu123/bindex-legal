-- database/migrations/add_pokemon_sets_table.sql
-- Stores all Pokémon TCG sets from pokemontcg.io
-- This is shared/public data (not per-user), so no RLS needed

CREATE TABLE IF NOT EXISTS pokemon_sets (
  id TEXT PRIMARY KEY,                -- pokemontcg.io set ID (e.g. "sv1", "swsh12pt5")
  name TEXT NOT NULL,                 -- "Scarlet & Violet", "Crown Zenith"
  series TEXT NOT NULL,               -- "Scarlet & Violet", "Sword & Shield"
  printed_total INT NOT NULL,         -- Number of cards in the printed set
  total INT NOT NULL,                 -- Total cards including secrets
  release_date TEXT,                  -- "2023/01/20"
  symbol_url TEXT,                    -- Set symbol image URL
  logo_url TEXT,                      -- Set logo image URL
  ptcgo_code TEXT,                    -- Online game code (e.g. "CRZ")
  parent_set_id TEXT,                 -- For sub-sets: points to main set (e.g. "swsh12pt5gg" → "swsh12pt5")
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anyone to read set data (public card database)
ALTER TABLE pokemon_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sets" ON pokemon_sets
  FOR SELECT USING (true);
