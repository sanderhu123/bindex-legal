-- ============================================
-- Migration: Add Progress Caching to Binders
-- ============================================
-- This migration adds total_cards and owned_cards columns
-- to the binders table for instant progress calculation
-- ============================================

-- Add total_cards column (expected number of cards for this binder)
ALTER TABLE public.binders 
ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0;

-- Add owned_cards column (number of cards user currently owns)
ALTER TABLE public.binders 
ADD COLUMN IF NOT EXISTS owned_cards INTEGER DEFAULT 0;

-- Add comment to explain the columns
COMMENT ON COLUMN public.binders.total_cards IS 'Total number of cards expected in this binder (based on set/region)';
COMMENT ON COLUMN public.binders.owned_cards IS 'Number of cards currently owned in this binder';

-- ============================================
-- Trigger to Auto-Update owned_cards Count
-- ============================================
-- This trigger automatically updates the owned_cards count
-- whenever cards are added or removed from a binder

-- Function to update owned_cards count
CREATE OR REPLACE FUNCTION update_binder_owned_cards()
RETURNS TRIGGER AS $$
BEGIN
  -- Update owned_cards count based on the number of cards in binder_cards
  UPDATE public.binders
  SET owned_cards = (
    SELECT COUNT(*)
    FROM public.binder_cards
    WHERE binder_id = COALESCE(NEW.binder_id, OLD.binder_id)
  )
  WHERE id = COALESCE(NEW.binder_id, OLD.binder_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist (to allow re-running this script)
DROP TRIGGER IF EXISTS update_owned_cards_on_insert ON public.binder_cards;
DROP TRIGGER IF EXISTS update_owned_cards_on_delete ON public.binder_cards;

-- Trigger on INSERT (when cards are added)
CREATE TRIGGER update_owned_cards_on_insert
  AFTER INSERT ON public.binder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_owned_cards();

-- Trigger on DELETE (when cards are removed)
CREATE TRIGGER update_owned_cards_on_delete
  AFTER DELETE ON public.binder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_owned_cards();

-- ============================================
-- Initialize owned_cards for Existing Binders
-- ============================================
-- This updates owned_cards for any existing binders
-- Run this once after the migration

UPDATE public.binders
SET owned_cards = (
  SELECT COUNT(*)
  FROM public.binder_cards
  WHERE binder_cards.binder_id = binders.id
);

-- ============================================
-- Verification Queries (Optional)
-- ============================================
-- Uncomment to verify the migration worked:

-- Check columns were added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'binders' 
-- AND column_name IN ('total_cards', 'owned_cards');

-- Check owned_cards matches actual count
-- SELECT 
--   b.id,
--   b.name,
--   b.owned_cards,
--   COUNT(bc.id) as actual_count
-- FROM public.binders b
-- LEFT JOIN public.binder_cards bc ON bc.binder_id = b.id
-- GROUP BY b.id, b.name, b.owned_cards;

