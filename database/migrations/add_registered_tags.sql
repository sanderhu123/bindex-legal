-- database/migrations/add_registered_tags.sql
-- Step 35A: Registered Tags Table (Activation Code System)
-- Step 35B: Binder Limit Functions

-- ============================================
-- REGISTERED TAGS TABLE (Activation Code System)
-- ============================================
-- This table stores every activation code you create before shipping.
-- Only codes in this table can be used to activate binders.
-- The tag_uid column is optional (for future NFC support).

CREATE TABLE IF NOT EXISTS public.registered_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identification
  activation_code TEXT UNIQUE NOT NULL,            -- Printed code (e.g., "BINDER-7X9K-M2PQ")
  tag_uid TEXT UNIQUE,                             -- Optional: NFC hardware UID (for future use)
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'available'         -- 'available', 'claimed', or 'disabled'
    CHECK (status IN ('available', 'claimed', 'disabled')),
  
  -- Ownership
  claimed_by UUID REFERENCES auth.users(id),       -- User who activated this code (null until claimed)
  claimed_at TIMESTAMP WITH TIME ZONE,             -- When it was activated
  binder_id UUID REFERENCES public.binders(id),    -- The binder it's linked to (null until setup complete)
  
  -- Transfer history
  previous_owners UUID[] DEFAULT '{}',             -- Array of previous owner user IDs
  
  -- Admin/inventory tracking
  batch_id TEXT,                                   -- Optional: track inventory batches (e.g., "batch-2026-01")
  notes TEXT,                                      -- Optional: admin notes
  
  -- Timestamps
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- When you registered the code
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Fast lookup by activation code (main validation flow)
CREATE INDEX IF NOT EXISTS idx_registered_tags_activation_code 
ON public.registered_tags(activation_code);

-- Fast lookup by status (admin queries)
CREATE INDEX IF NOT EXISTS idx_registered_tags_status 
ON public.registered_tags(status);

-- Fast lookup by user (count how many codes a user has activated)
CREATE INDEX IF NOT EXISTS idx_registered_tags_claimed_by 
ON public.registered_tags(claimed_by);

-- Fast lookup by binder (find code for a specific binder)
CREATE INDEX IF NOT EXISTS idx_registered_tags_binder_id 
ON public.registered_tags(binder_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.registered_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read codes (to validate on entry)
CREATE POLICY "Users can check code status"
  ON public.registered_tags
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can update codes they are claiming (status = 'available')
-- or codes they already own (e.g., for transfer)
CREATE POLICY "Users can claim available codes"
  ON public.registered_tags
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' 
    AND (
      -- Can claim available codes
      (status = 'available')
      -- Can update own claimed codes (e.g., for transfer)
      OR (claimed_by = auth.uid())
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- When claiming: must set claimed_by to own user ID
      -- When transferring: claimed_by can be set to null
      (claimed_by = auth.uid() OR claimed_by IS NULL)
    )
  );

-- Note: INSERT and DELETE are restricted to service role only (admin/scripts)
-- Regular users cannot add or remove codes — only you manage this

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_registered_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registered_tags_updated_at
  BEFORE UPDATE ON public.registered_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_registered_tags_updated_at();

-- ============================================
-- STEP 35B: BINDER LIMIT FUNCTIONS
-- ============================================

-- FUNCTION: Get number of binders a user is allowed to create
-- Based on how many activation codes they've used:
-- 0 codes → 1 binder
-- 1 code  → 3 binders
-- 2 codes → 5 binders
-- 3+ codes → unlimited (returns 999 as "unlimited")

CREATE OR REPLACE FUNCTION get_binder_limit(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  tag_count INTEGER;
BEGIN
  -- Count how many codes this user has claimed
  SELECT COUNT(*) INTO tag_count
  FROM public.registered_tags
  WHERE claimed_by = user_id
    AND status = 'claimed';
  
  -- Return binder limit based on code count
  IF tag_count >= 3 THEN
    RETURN 999; -- Unlimited
  ELSIF tag_count = 2 THEN
    RETURN 5;
  ELSIF tag_count = 1 THEN
    RETURN 3;
  ELSE
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Check if user can create a new binder
-- Returns true if user hasn't reached their binder limit

CREATE OR REPLACE FUNCTION can_user_create_binder(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_binders INTEGER;
  binder_limit INTEGER;
BEGIN
  -- Count current binders
  SELECT COUNT(*) INTO current_binders
  FROM public.binders
  WHERE binders.user_id = can_user_create_binder.user_id;
  
  -- Get limit
  binder_limit := get_binder_limit(user_id);
  
  -- Check
  RETURN current_binders < binder_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: Get user's binder usage info
-- Returns current count, limit, and codes activated
-- Useful for displaying in the UI

CREATE OR REPLACE FUNCTION get_user_binder_info(user_id UUID)
RETURNS TABLE(
  current_binders INTEGER,
  binder_limit INTEGER,
  tags_activated INTEGER,
  is_unlimited BOOLEAN
) AS $$
DECLARE
  tag_count INTEGER;
  b_limit INTEGER;
  b_count INTEGER;
BEGIN
  -- Count claimed codes
  SELECT COUNT(*)::INTEGER INTO tag_count
  FROM public.registered_tags
  WHERE claimed_by = get_user_binder_info.user_id
    AND status = 'claimed';
  
  -- Get limit
  b_limit := get_binder_limit(get_user_binder_info.user_id);
  
  -- Count current binders
  SELECT COUNT(*)::INTEGER INTO b_count
  FROM public.binders
  WHERE binders.user_id = get_user_binder_info.user_id;
  
  -- Return results
  current_binders := b_count;
  binder_limit := b_limit;
  tags_activated := tag_count;
  is_unlimited := (tag_count >= 3);
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'registered_tags'
ORDER BY ordinal_position;
