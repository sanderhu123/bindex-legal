-- ============================================
-- Quick Fix: Just Update Existing Triggers
-- ============================================
-- Run this if you've already run the main migration
-- and just need to fix the triggers
-- ============================================

-- Drop existing triggers (if any)
DROP TRIGGER IF EXISTS update_owned_cards_on_insert ON public.binder_cards;
DROP TRIGGER IF EXISTS update_owned_cards_on_delete ON public.binder_cards;

-- Make sure the function exists (this is safe to re-run)
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

-- Create triggers
CREATE TRIGGER update_owned_cards_on_insert
  AFTER INSERT ON public.binder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_owned_cards();

CREATE TRIGGER update_owned_cards_on_delete
  AFTER DELETE ON public.binder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_owned_cards();

-- Initialize owned_cards for all existing binders
UPDATE public.binders
SET owned_cards = (
  SELECT COUNT(*)
  FROM public.binder_cards
  WHERE binder_cards.binder_id = binders.id
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Triggers updated successfully!';
  RAISE NOTICE '✅ owned_cards counts synchronized!';
  RAISE NOTICE 'ℹ️  Now use the Fix button in your app to update total_cards';
END $$;

