-- database/migrations/add_artist_normalized_search.sql
--
-- Make the illustrator filter accent-insensitive so typing "Mekayu"
-- finds cards by "Mékayu", "Jose" finds "José", etc.
--
-- Adds a generated `artist_normalized` column that lowercases AND strips
-- diacritics, plus a trigram index on it so ILIKE substring searches stay
-- fast. The app sends the same normalization in its query (see
-- normalizeForArtistSearch() in src/utils/searchNormalize.ts).
--
-- Safe to re-run.

-- 1. Make sure the unaccent and trigram extensions are enabled.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. unaccent() isn't IMMUTABLE by default (it depends on a dictionary),
--    so we wrap it in our own IMMUTABLE function so it can be used inside
--    a generated column.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT unaccent('unaccent', $1); $$;

-- 3. Generated column: lowercase + accent-stripped artist.
--    Examples:  "Mékayu"      -> "mekayu"
--               "José Vega"   -> "jose vega"
--               "ACO5"        -> "aco5"
ALTER TABLE pokemon_cards
ADD COLUMN IF NOT EXISTS artist_normalized TEXT
GENERATED ALWAYS AS (
  lower(immutable_unaccent(coalesce(artist, '')))
) STORED;

-- 4. GIN trigram index so ILIKE '%name%' on the normalized column is fast.
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_artist_normalized_trgm
ON pokemon_cards USING gin (artist_normalized gin_trgm_ops);
