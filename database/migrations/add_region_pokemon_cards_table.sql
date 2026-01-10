-- ============================================================================
-- Migration: Add region_pokemon_cards table
-- Purpose: Store which TCG card the user selected for each Pokémon in Region mode
-- Step: 31A - Region Mode Card Selection
-- Date: 2026-01-10
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the region_pokemon_cards table
-- ============================================================================

-- This table stores the user's card selection for each Pokémon slot in Region binders
-- For example: User selects a specific Charizard card to represent Charizard in their Kanto binder

CREATE TABLE IF NOT EXISTS public.region_pokemon_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User who made the selection
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Which binder this selection belongs to
  binder_id UUID NOT NULL REFERENCES public.binders(id) ON DELETE CASCADE,
  
  -- The Pokédex number of the Pokémon (e.g., 1 for Bulbasaur, 25 for Pikachu)
  pokedex_number INTEGER NOT NULL,
  
  -- The TCGDEX card ID selected by the user (e.g., "base1-4" for Base Set Charizard)
  selected_card_id TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One selection per Pokémon per binder (user can only pick one card per Pokémon slot)
  UNIQUE(binder_id, pokedex_number)
);

-- Add comment to table
COMMENT ON TABLE public.region_pokemon_cards IS 'Stores user card selections for Region mode binders - which TCG card represents each Pokémon';

-- Add comments to columns
COMMENT ON COLUMN public.region_pokemon_cards.pokedex_number IS 'National Pokédex number (1-1025+)';
COMMENT ON COLUMN public.region_pokemon_cards.selected_card_id IS 'TCGDEX card ID chosen by user';

-- ============================================================================
-- STEP 2: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.region_pokemon_cards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create RLS Policies
-- ============================================================================

-- Users can only view their own card selections
CREATE POLICY "Users can view own region card selections" 
ON public.region_pokemon_cards
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own card selections
CREATE POLICY "Users can insert own region card selections" 
ON public.region_pokemon_cards
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own card selections
CREATE POLICY "Users can update own region card selections" 
ON public.region_pokemon_cards
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own card selections
CREATE POLICY "Users can delete own region card selections" 
ON public.region_pokemon_cards
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: Create Indexes for Performance
-- ============================================================================

-- Index for fast lookups by binder (most common query)
CREATE INDEX IF NOT EXISTS idx_region_pokemon_cards_binder 
ON public.region_pokemon_cards(binder_id);

-- Index for user lookups (for user profile queries)
CREATE INDEX IF NOT EXISTS idx_region_pokemon_cards_user 
ON public.region_pokemon_cards(user_id);

-- Composite index for looking up a specific Pokémon in a binder
CREATE INDEX IF NOT EXISTS idx_region_pokemon_cards_binder_pokedex 
ON public.region_pokemon_cards(binder_id, pokedex_number);

-- ============================================================================
-- STEP 5: Create Trigger for auto-updating updated_at
-- ============================================================================

-- Note: This uses the existing update_updated_at_column() function from schema.sql
-- If you get an error about the function not existing, run schema.sql first

CREATE TRIGGER update_region_pokemon_cards_updated_at
  BEFORE UPDATE ON public.region_pokemon_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to confirm success)
-- ============================================================================

-- Verify table was created:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'region_pokemon_cards';

-- Verify columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'region_pokemon_cards'
-- ORDER BY ordinal_position;

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'region_pokemon_cards';

-- Verify policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'region_pokemon_cards';

-- Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'region_pokemon_cards';

-- ============================================================================
-- EXAMPLE USAGE (for testing after migration)
-- ============================================================================

-- Insert a card selection (replace UUIDs with real values):
-- INSERT INTO public.region_pokemon_cards (user_id, binder_id, pokedex_number, selected_card_id)
-- VALUES ('your-user-id', 'your-binder-id', 25, 'base1-58');

-- Get all selections for a binder:
-- SELECT pokedex_number, selected_card_id 
-- FROM public.region_pokemon_cards 
-- WHERE binder_id = 'your-binder-id';

-- Update a selection:
-- UPDATE public.region_pokemon_cards 
-- SET selected_card_id = 'sv1-25' 
-- WHERE binder_id = 'your-binder-id' AND pokedex_number = 25;

-- Clear a selection:
-- DELETE FROM public.region_pokemon_cards 
-- WHERE binder_id = 'your-binder-id' AND pokedex_number = 25;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
