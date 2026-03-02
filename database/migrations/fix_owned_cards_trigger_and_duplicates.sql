-- Migration: Fix owned_cards trigger and clean up duplicate binder_cards
--
-- Problem 1: The trigger counts ALL rows in binder_cards, but it should
--   only count rows with is_owned = true.
-- Problem 2: Missing UPDATE trigger, so upserts that change is_owned
--   don't update the owned_cards count.
-- Problem 3: NULL variant in the unique constraint allows duplicate rows
--   because PostgreSQL treats NULLs as distinct.

-- ============================================
-- Step 1: Remove duplicate binder_cards rows
-- ============================================
-- Keep only one row per (binder_id, card_id) when variant IS NULL.
-- Prefer the row with is_owned = true if one exists.

DELETE FROM public.binder_cards
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY binder_id, card_id, COALESCE(variant, '__null__')
        ORDER BY
          is_owned DESC,       -- keep owned row if it exists
          created_at ASC       -- otherwise keep the earliest
      ) AS rn
    FROM public.binder_cards
  ) ranked
  WHERE rn > 1
);

-- ============================================
-- Step 2: Fix the unique constraint for NULL variants
-- ============================================
-- PostgreSQL 15+ supports NULLS NOT DISTINCT, which makes NULL = NULL
-- in the unique constraint, preventing future duplicates.

DROP INDEX IF EXISTS binder_cards_binder_id_card_id_variant_key;
ALTER TABLE public.binder_cards
  DROP CONSTRAINT IF EXISTS binder_cards_binder_id_card_id_variant_key;

ALTER TABLE public.binder_cards
  ADD CONSTRAINT binder_cards_binder_id_card_id_variant_key
  UNIQUE NULLS NOT DISTINCT (binder_id, card_id, variant);

-- ============================================
-- Step 3: Fix the trigger function
-- ============================================
-- Count only rows with is_owned = true (not ALL rows)

CREATE OR REPLACE FUNCTION update_binder_owned_cards()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.binders
  SET owned_cards = (
    SELECT COUNT(*)
    FROM public.binder_cards
    WHERE binder_id = COALESCE(NEW.binder_id, OLD.binder_id)
      AND is_owned = true
  )
  WHERE id = COALESCE(NEW.binder_id, OLD.binder_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 4: Add UPDATE trigger (was missing)
-- ============================================
-- The INSERT/DELETE triggers already exist. We need an UPDATE trigger
-- so that when is_owned changes (via upsert), the count gets updated.

DROP TRIGGER IF EXISTS update_owned_cards_on_update ON public.binder_cards;

CREATE TRIGGER update_owned_cards_on_update
  AFTER UPDATE OF is_owned ON public.binder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_owned_cards();

-- ============================================
-- Step 5: Re-sync owned_cards for all binders
-- ============================================
-- Fix any binders that have wrong counts due to the old trigger

UPDATE public.binders
SET owned_cards = (
  SELECT COUNT(*)
  FROM public.binder_cards
  WHERE binder_cards.binder_id = binders.id
    AND binder_cards.is_owned = true
);

-- Also fix total_cards for master-set binders that got inflated by duplicates
-- (total_cards should match the actual set size, not the inflated duplicate count)

-- ============================================
-- Verification
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Removed duplicate binder_cards rows';
  RAISE NOTICE '  - Fixed unique constraint for NULL variants';
  RAISE NOTICE '  - Fixed trigger to count only is_owned = true';
  RAISE NOTICE '  - Added UPDATE trigger for is_owned changes';
  RAISE NOTICE '  - Re-synced owned_cards for all binders';
END $$;
