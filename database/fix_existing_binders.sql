-- ============================================
-- Fix Existing Binders: Recalculate Total Cards
-- ============================================
-- This script helps you manually set total_cards for existing binders
-- Run this AFTER the main migration if you have existing binders
-- ============================================

-- INSTRUCTIONS:
-- You need to manually update each binder with the correct total_cards value
-- based on the set or region they're tracking.
--
-- Example queries below - modify the numbers based on your actual card counts

-- ============================================
-- Step 1: View your binders and their current state
-- ============================================
SELECT 
  id,
  name,
  collection_mode,
  set,
  region,
  total_cards,
  owned_cards
FROM public.binders
ORDER BY created_at DESC;

-- ============================================
-- Step 2: Update total_cards for each binder
-- ============================================
-- You'll need to look up how many cards are in each set/region
-- and update accordingly

-- Example: Update a specific binder by ID
-- UPDATE public.binders
-- SET total_cards = 102  -- Replace with actual card count for that set/region
-- WHERE id = 'your-binder-id-here';

-- Example: Update all binders for a specific set
-- UPDATE public.binders
-- SET total_cards = 102  -- Replace with actual card count
-- WHERE set = 'Base Set' AND collection_mode = 'master-set';

-- Example: Update all binders for a specific region
-- UPDATE public.binders
-- SET total_cards = 151  -- Kanto has 151 Pokemon
-- WHERE region = 'Kanto' AND collection_mode = 'region';

-- ============================================
-- Common Set/Region Card Counts
-- ============================================
-- Use these as a reference, but verify with your actual data

-- REGIONS (Pokédex counts):
-- Kanto: 151
-- Johto: 100
-- Hoenn: 135
-- Sinnoh: 107
-- Unova: 156
-- Kalos: 72
-- Alola: 88
-- Galar: 96
-- Paldea: 120

-- SETS: Vary widely (50-200+ cards per set)
-- You'll need to check each set individually

-- ============================================
-- Step 3: Verify the fix worked
-- ============================================
SELECT 
  b.id,
  b.name,
  b.collection_mode,
  b.set,
  b.region,
  b.total_cards,
  b.owned_cards,
  CASE 
    WHEN b.total_cards > 0 THEN ROUND((b.owned_cards::FLOAT / b.total_cards) * 100)
    ELSE 0
  END as progress_percentage
FROM public.binders b
ORDER BY b.created_at DESC;

