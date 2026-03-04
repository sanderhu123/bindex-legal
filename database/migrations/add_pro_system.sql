-- Step 27A: Add Pro system fields to user_profiles table
-- Run this in Supabase SQL Editor

-- Add Pro system columns
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS free_deletions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_binders_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pro_purchased_at TIMESTAMP WITH TIME ZONE;

-- Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_tier 
ON public.user_profiles(user_tier);

-- RPC function: increment lifetime_binders_created by 1
CREATE OR REPLACE FUNCTION public.increment_lifetime_binders(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET lifetime_binders_created = COALESCE(lifetime_binders_created, 0) + 1
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function: increment free_deletions_used by 1
CREATE OR REPLACE FUNCTION public.increment_free_deletions(user_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles
  SET free_deletions_used = COALESCE(free_deletions_used, 0) + 1
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
