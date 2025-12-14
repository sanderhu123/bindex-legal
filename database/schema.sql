-- ============================================
-- Pokémon TCG Binder Tracker Database Schema
-- ============================================
-- Run this script in Supabase SQL Editor
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS PROFILE TABLE
-- ============================================
-- Extends Supabase auth.users with additional profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. BINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.binders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  collection_mode TEXT NOT NULL CHECK (collection_mode IN ('master-set', 'region', 'custom')),
  set TEXT, -- For master-set mode
  region TEXT, -- For region mode (Kanto, Johto, etc.)
  variants_to_track TEXT[], -- Array of variant names ['base', 'reverse-holo', etc.]
  variant_placement TEXT CHECK (variant_placement IN ('grouped', 'end')),
  layout_preference TEXT CHECK (layout_preference IN ('auto', '3x3', '4x3')),
  pokemon_art_style TEXT CHECK (pokemon_art_style IN ('sprite', 'home', 'official-artwork')), -- For region mode
  nfc_tag_id TEXT UNIQUE, -- Unique constraint for 1:1 relationship
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.binders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own binders
CREATE POLICY "Users can view own binders"
  ON public.binders
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own binders
CREATE POLICY "Users can create own binders"
  ON public.binders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own binders
CREATE POLICY "Users can update own binders"
  ON public.binders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own binders
CREATE POLICY "Users can delete own binders"
  ON public.binders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_binders_user_id ON public.binders(user_id);

-- Index on nfc_tag_id for fast lookups (unique constraint already creates an index, but explicit is clearer)
CREATE INDEX IF NOT EXISTS idx_binders_nfc_tag_id ON public.binders(nfc_tag_id) WHERE nfc_tag_id IS NOT NULL;

-- ============================================
-- 3. BINDER_CARDS JUNCTION TABLE
-- ============================================
-- Stores which cards are in which binders
CREATE TABLE IF NOT EXISTS public.binder_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  binder_id UUID NOT NULL REFERENCES public.binders(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL, -- Card ID from Pokémon TCG API
  variant TEXT, -- Variant type (base, reverse-holo, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(binder_id, card_id, variant) -- Prevent duplicate cards with same variant
);

-- Enable Row Level Security
ALTER TABLE public.binder_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view cards in their own binders
CREATE POLICY "Users can view own binder cards"
  ON public.binder_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.binders
      WHERE binders.id = binder_cards.binder_id
      AND binders.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can add cards to their own binders
CREATE POLICY "Users can add cards to own binders"
  ON public.binder_cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.binders
      WHERE binders.id = binder_cards.binder_id
      AND binders.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can remove cards from their own binders
CREATE POLICY "Users can remove cards from own binders"
  ON public.binder_cards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.binders
      WHERE binders.id = binder_cards.binder_id
      AND binders.user_id = auth.uid()
    )
  );

-- Index on binder_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_binder_cards_binder_id ON public.binder_cards(binder_id);

-- Index on card_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_binder_cards_card_id ON public.binder_cards(card_id);

-- ============================================
-- 4. TRIGGERS FOR UPDATED_AT
-- ============================================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for binders table
CREATE TRIGGER update_binders_updated_at
  BEFORE UPDATE ON public.binders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_profiles table
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. FUNCTION TO CREATE USER PROFILE ON SIGNUP
-- ============================================
-- Automatically create a user profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERIFICATION QUERIES (Optional - for testing)
-- ============================================
-- Uncomment these to verify the schema after running:

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('user_profiles', 'binders', 'binder_cards');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('user_profiles', 'binders', 'binder_cards');

-- Check indexes
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('binders', 'binder_cards');






