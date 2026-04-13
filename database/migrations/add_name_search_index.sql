-- Speed up card name searches (ILIKE '%query%') by adding a trigram index.
-- This turns full table scans into fast index lookups.

-- 1. Enable the pg_trgm extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create a GIN trigram index on the name column
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_trgm
ON pokemon_cards USING gin (name gin_trgm_ops);
