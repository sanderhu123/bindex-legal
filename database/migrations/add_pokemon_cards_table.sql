-- database/migrations/add_pokemon_cards_table.sql
-- Stores all Pokémon TCG cards from pokemontcg.io
-- This is shared/public data (not per-user), so no RLS needed

CREATE TABLE IF NOT EXISTS pokemon_cards (
  id TEXT PRIMARY KEY,                -- pokemontcg.io card ID (e.g. "sv1-25")
  name TEXT NOT NULL,                 -- "Pikachu"
  number TEXT NOT NULL,               -- Card number within set ("25", "GG01", "TG15")
  set_id TEXT NOT NULL REFERENCES pokemon_sets(id),
  set_name TEXT NOT NULL,             -- Denormalized for fast queries ("Scarlet & Violet")
  rarity TEXT,                        -- "Common", "Rare Holo", "Illustration Rare"
  artist TEXT,                        -- "Mitsuhiro Arita"
  supertype TEXT NOT NULL,            -- "Pokémon", "Trainer", "Energy"
  image_small TEXT,                   -- Small image URL
  image_large TEXT,                   -- Hi-res image URL
  set_printed_total INT,              -- Printed total of the set (for display)
  has_reverse_holo BOOLEAN DEFAULT FALSE,  -- Whether this card has a reverse holo variant
  pokedex_number INT,                 -- National Pokédex number (if Pokémon)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_pokemon_cards_set_id ON pokemon_cards(set_id);
CREATE INDEX idx_pokemon_cards_name ON pokemon_cards(name);
CREATE INDEX idx_pokemon_cards_pokedex ON pokemon_cards(pokedex_number) WHERE pokedex_number IS NOT NULL;

-- Allow anyone to read card data (public card database)
ALTER TABLE pokemon_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cards" ON pokemon_cards
  FOR SELECT USING (true);
