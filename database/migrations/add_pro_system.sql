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
