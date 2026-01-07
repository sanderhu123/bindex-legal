-- ============================================
-- Migration: Add position and is_owned columns to binder_cards
-- ============================================
-- Purpose: Support positional card placement in Custom binders
--          and track owned/missing status per card
-- Run this in Supabase SQL Editor
-- ============================================

-- Add position column to binder_cards table
-- Position is NULL for Master Set and Region binders (they use fixed ordering)
-- Position is 0-359 (3x3 layout) or 0-479 (4x3 layout) for Custom binders
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Add is_owned column to track owned/missing status
-- TRUE = owned (bright), FALSE = missing (dimmed)
-- For Custom binders: allows marking cards as "missing" while keeping them in a slot
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS is_owned BOOLEAN DEFAULT TRUE;

-- Add index for fast position lookups (used when loading Custom binder cards)
CREATE INDEX IF NOT EXISTS idx_binder_cards_position 
ON public.binder_cards(binder_id, position) 
WHERE position IS NOT NULL;

-- Add unique constraint for Custom binders: one card per position per binder
-- This prevents placing two cards in the same slot
-- Note: We use a partial unique index since position can be NULL for non-Custom binders
CREATE UNIQUE INDEX IF NOT EXISTS idx_binder_cards_unique_position 
ON public.binder_cards(binder_id, position) 
WHERE position IS NOT NULL;

-- Update RLS policy to allow updating position (for moving cards later if needed)
CREATE POLICY "Users can update cards in own binders"
  ON public.binder_cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.binders
      WHERE binders.id = binder_cards.binder_id
      AND binders.user_id = auth.uid()
    )
  );

-- ============================================
-- Verification queries
-- ============================================
-- Uncomment to verify the migration:

-- Check column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'binder_cards' AND column_name = 'position';

-- Check index exists
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'binder_cards' AND indexname LIKE '%position%';

