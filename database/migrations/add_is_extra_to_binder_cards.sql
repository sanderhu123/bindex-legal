-- ============================================================================
-- Migration: Add is_extra column to binder_cards table
-- Purpose: Track which cards are "extra" (not part of official set) in Master Set binders
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Add is_extra column to binder_cards table
-- This column marks cards that aren't officially part of the set but were added by user
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for fast filtering of extra cards
-- This helps when querying "show me all extra cards in this binder"
CREATE INDEX IF NOT EXISTS idx_binder_cards_is_extra 
ON public.binder_cards(binder_id, is_extra);

-- Step 3: Create composite index for common queries
-- This helps when querying "show me extra cards that are owned"
CREATE INDEX IF NOT EXISTS idx_binder_cards_extra_owned 
ON public.binder_cards(binder_id, is_extra, is_owned);

-- ============================================================================
-- Verification Queries (run these after migration to confirm it worked)
-- ============================================================================

-- Verify column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'binder_cards' 
  AND column_name = 'is_extra';

-- Expected result:
-- column_name | data_type | column_default | is_nullable
-- is_extra    | boolean   | false          | YES

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'binder_cards' 
  AND indexname LIKE '%extra%';

-- Expected result:
-- indexname                      | indexdef
-- idx_binder_cards_is_extra      | CREATE INDEX ... ON public.binder_cards USING btree (binder_id, is_extra)
-- idx_binder_cards_extra_owned   | CREATE INDEX ... ON public.binder_cards USING btree (binder_id, is_extra, is_owned)

-- ============================================================================
-- Example Queries (for testing after migration)
-- ============================================================================

-- Get all extra cards in a specific binder:
-- SELECT * FROM binder_cards WHERE binder_id = 'your-binder-id' AND is_extra = TRUE;

-- Get count of extra cards per binder:
-- SELECT binder_id, COUNT(*) as extra_count 
-- FROM binder_cards 
-- WHERE is_extra = TRUE 
-- GROUP BY binder_id;

-- Get extra cards that are owned:
-- SELECT * FROM binder_cards 
-- WHERE binder_id = 'your-binder-id' 
--   AND is_extra = TRUE 
--   AND is_owned = TRUE;

-- ============================================================================
-- Rollback (if needed - use with caution!)
-- ============================================================================

-- To remove the is_extra column (only if something goes wrong):
-- DROP INDEX IF EXISTS idx_binder_cards_extra_owned;
-- DROP INDEX IF EXISTS idx_binder_cards_is_extra;
-- ALTER TABLE public.binder_cards DROP COLUMN IF EXISTS is_extra;

