-- ============================================
-- Migration: Add variant_order column to binders table
-- ============================================
-- Run this in Supabase SQL Editor if you already have a binders table
-- ============================================

-- Add variant_order column to binders table
-- Stores the user's preferred display order of variant groups
-- e.g. ['base', 'reverse-holo', 'poke-ball', 'master-ball', 'secret-rare']
ALTER TABLE public.binders
ADD COLUMN IF NOT EXISTS variant_order TEXT[];

COMMENT ON COLUMN public.binders.variant_order IS 'User-defined display order of variant groups for master-set binders (e.g. base, reverse-holo, poke-ball, master-ball, secret-rare)';
