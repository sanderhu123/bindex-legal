-- database/migrations/add_normalized_name_search.sql
--
-- Adds a normalized version of the card name to make searches tolerant
-- of punctuation. Card names like "Charizard-GX" or "Zacian LV.X" can
-- now be found by typing "Charizard GX" or "Zacian LV X".
--
-- The app sends the same normalization in its query (see
-- src/utils/searchNormalize.ts) and queries this column instead of `name`.
--
-- Safe to re-run.

-- 1. Make sure the trigram extension is enabled (used for fast LIKE search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add a generated column that stores a normalized lowercase version of
--    the name with common punctuation replaced by spaces and whitespace
--    collapsed. The expression must match normalizeForNameSearch() in
--    src/utils/searchNormalize.ts.
--
--    Example: "Charizard-GX"   -> "charizard gx"
--             "Zacian LV.X"    -> "zacian lv x"
--             "Mr. Mime"       -> "mr mime"
ALTER TABLE pokemon_cards
ADD COLUMN IF NOT EXISTS name_normalized TEXT
GENERATED ALWAYS AS (
  trim(
    regexp_replace(
      regexp_replace(lower(name), '[-.''’`,!?:]', ' ', 'g'),
      '\s+',
      ' ',
      'g'
    )
  )
) STORED;

-- 3. Create a GIN trigram index so ILIKE '%query%' searches stay fast.
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_name_normalized_trgm
ON pokemon_cards USING gin (name_normalized gin_trgm_ops);
