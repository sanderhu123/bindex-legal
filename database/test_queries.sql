-- ============================================
-- Database Schema Test Queries
-- Run these in Supabase SQL Editor to verify Step 6
-- ============================================

-- ============================================
-- TEST 1: Verify Index on nfc_tag_id exists
-- ============================================
SELECT 
  indexname, 
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'binders'
AND indexname LIKE '%nfc%';

-- Expected: Should show idx_binders_nfc_tag_id

-- ============================================
-- TEST 2: Verify Unique Constraint on nfc_tag_id
-- ============================================
-- Try to insert two binders with the same NFC tag ID
-- This should FAIL if unique constraint works

-- First, get a test user_id (replace with your actual user_id from auth.users)
-- You can get this by running: SELECT id FROM auth.users LIMIT 1;

-- Uncomment and run these (replace USER_ID_HERE with actual user_id):
-- INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
-- VALUES ('USER_ID_HERE', 'Test Binder 1', 'custom', 'test-nfc-123');

-- INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
-- VALUES ('USER_ID_HERE', 'Test Binder 2', 'custom', 'test-nfc-123');
-- Expected: Second insert should FAIL with unique constraint violation

-- ============================================
-- TEST 3: Verify Foreign Key Relationships
-- ============================================
-- Check foreign key constraints
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('binders', 'binder_cards', 'user_profiles');

-- Expected: Should show foreign keys:
-- - binders.user_id -> auth.users.id
-- - binder_cards.binder_id -> binders.id
-- - user_profiles.id -> auth.users.id

-- ============================================
-- TEST 4: Verify RLS Policies are Applied
-- ============================================
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'binders', 'binder_cards');

-- Expected: rowsecurity should be 't' (true) for all tables

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'binders', 'binder_cards')
ORDER BY tablename, policyname;

-- Expected: Should show multiple policies for each table

-- ============================================
-- TEST 5: Insert Test Data
-- ============================================
-- Get your user_id first (replace with your actual user_id)
-- SELECT id FROM auth.users LIMIT 1;

-- Then insert test binder (replace USER_ID_HERE):
-- INSERT INTO public.binders (user_id, name, collection_mode, set, variants_to_track, variant_placement, layout_preference, nfc_tag_id)
-- VALUES (
--   'USER_ID_HERE',
--   'Test Master Set Binder',
--   'master-set',
--   'base1',
--   ARRAY['base', 'reverse-holo'],
--   'grouped',
--   '3x3',
--   'test-nfc-456'
-- )
-- RETURNING *;

-- Expected: Should insert successfully and return the new binder

-- Insert test binder_card (replace BINDER_ID_HERE with id from above):
-- INSERT INTO public.binder_cards (binder_id, card_id, variant)
-- VALUES (
--   'BINDER_ID_HERE',
--   'test-card-123',
--   'base'
-- )
-- RETURNING *;

-- Expected: Should insert successfully

-- ============================================
-- TEST 6: Query Binder by NFC Tag ID
-- ============================================
-- Query binder by NFC tag (replace with test NFC tag ID from above):
-- SELECT * FROM public.binders WHERE nfc_tag_id = 'test-nfc-456';

-- Expected: Should return the binder we created

-- ============================================
-- TEST 7: Verify Triggers Work
-- ============================================
-- Check if triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('binders', 'user_profiles');

-- Expected: Should show update triggers for updated_at columns

-- ============================================
-- CLEANUP (Optional - remove test data)
-- ============================================
-- After testing, you can clean up test data:
-- DELETE FROM public.binder_cards WHERE card_id = 'test-card-123';
-- DELETE FROM public.binders WHERE nfc_tag_id LIKE 'test-nfc-%';











