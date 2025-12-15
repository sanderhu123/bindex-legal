-- ============================================
-- Migration: Add pokemon_art_style column to binders table
-- ============================================
-- Run this in Supabase SQL Editor if you already have a binders table
-- ============================================

-- Add pokemon_art_style column to binders table
ALTER TABLE public.binders
ADD COLUMN IF NOT EXISTS pokemon_art_style TEXT CHECK (pokemon_art_style IN ('sprite', 'home', 'official-artwork'));

-- Add comment to document the column
COMMENT ON COLUMN public.binders.pokemon_art_style IS 'Pokemon art style preference for region mode binders (sprite, home, or official-artwork)';


