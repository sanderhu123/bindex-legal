-- database/migrations/add_artist_search_index.sql
--
-- Speed up illustrator (artist) filter and add an RPC that returns the full
-- distinct list of artists.
--
-- Background: the Card Picker's "Illustrator" filter does case-insensitive
-- substring matching on `artist`. Without a trigram index that becomes a
-- sequential scan of the whole pokemon_cards table. This migration adds the
-- index and a small RPC function so the autocomplete dropdown in the UI can
-- fetch every distinct artist in one round-trip (bypassing the 1000-row
-- Supabase fetch cap).
--
-- Safe to re-run.

-- 1. Make sure the trigram extension is enabled (used for fast ILIKE search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN trigram index on `artist` so ILIKE '%name%' stays fast.
CREATE INDEX IF NOT EXISTS idx_pokemon_cards_artist_trgm
ON pokemon_cards USING gin (artist gin_trgm_ops);

-- 3. RPC that returns every distinct, non-empty artist value.
--    Used by getIllustrators() in src/services/api/pokemonApi.ts to populate
--    the autocomplete dropdown.
CREATE OR REPLACE FUNCTION distinct_artists()
RETURNS TABLE (artist TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT artist
  FROM pokemon_cards
  WHERE artist IS NOT NULL
    AND length(trim(artist)) > 0
  ORDER BY artist;
$$;
