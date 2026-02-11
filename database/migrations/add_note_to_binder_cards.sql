-- ============================================================================
-- Migration: Add note column to binder_cards table
-- Purpose: Allow users to add a personal note to any card in their binder
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Add note column to binder_cards table
-- This column stores a short personal note the user writes about a card
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL;

-- ============================================================================
-- Verification Queries (run these after migration to confirm it worked)
-- ============================================================================

-- Verify column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'binder_cards' 
  AND column_name = 'note';

-- Expected result:
-- column_name | data_type | column_default | is_nullable
-- note        | text      | NULL           | YES

-- ============================================================================
-- Rollback (if needed - use with caution!)
-- ============================================================================

-- To remove the note column (only if something goes wrong):
-- ALTER TABLE public.binder_cards DROP COLUMN IF EXISTS note;
