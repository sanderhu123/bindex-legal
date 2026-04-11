# Testing Guide for Steps 6 & 7

This guide helps you verify that Steps 6 and 7 are fully completed.

## Step 6: Database Schema Testing

### Quick Tests (Run in Supabase SQL Editor)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click **SQL Editor** in the left sidebar

2. **Run Test Queries**
   - Open `database/test_queries.sql` in your project
   - Copy and paste queries into SQL Editor
   - Run them one by one to verify each feature

### What to Test:

#### ✅ Test 1: Index on nfc_tag_id
```sql
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'binders'
AND indexname LIKE '%nfc%';
```
**Expected:** Should show `idx_binders_nfc_tag_id`

#### ✅ Test 2: Unique Constraint on nfc_tag_id
1. Get your user_id: `SELECT id FROM auth.users LIMIT 1;`
2. Insert first binder with NFC tag:
```sql
INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
VALUES ('YOUR_USER_ID', 'Test Binder 1', 'custom', 'test-nfc-123');
```
3. Try to insert second binder with same NFC tag (should FAIL):
```sql
INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
VALUES ('YOUR_USER_ID', 'Test Binder 2', 'custom', 'test-nfc-123');
```
**Expected:** Second insert should fail with unique constraint error

#### ✅ Test 3: Foreign Key Relationships
```sql
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
```
**Expected:** Should show foreign keys linking tables correctly

#### ✅ Test 4: RLS Policies
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'binders', 'binder_cards');
```
**Expected:** `rowsecurity` should be `t` (true) for all tables

#### ✅ Test 5: Insert Test Data
1. Get your user_id
2. Insert test binder:
```sql
INSERT INTO public.binders (user_id, name, collection_mode, set, variants_to_track, variant_placement, layout_preference, nfc_tag_id)
VALUES (
  'YOUR_USER_ID',
  'Test Master Set Binder',
  'master-set',
  'base1',
  ARRAY['base', 'reverse-holo'],
  'grouped',
  '3x3',
  'test-nfc-456'
)
RETURNING *;
```
**Expected:** Should insert successfully

#### ✅ Test 6: Query by NFC Tag ID
```sql
SELECT * FROM public.binders WHERE nfc_tag_id = 'test-nfc-456';
```
**Expected:** Should return the binder

---

## Step 7: Supabase Services Testing

### Option 1: Manual Testing (Recommended for Beginners)

1. **Create a Test Account**
   - You'll need to sign up first (we'll build the UI later)
   - For now, you can test through Supabase dashboard

2. **Test Basic Connection**
   - The client should already be working (Step 7 shows it's connected)
   - You can verify by checking if there are no errors when starting the app

### Option 2: Run Test Script (Advanced)

**Prerequisites:**
- Install ts-node: `npm install -g ts-node`
- Or use: `npx ts-node scripts/test-supabase-services.ts`

**Note:** This requires you to be authenticated first. Since we haven't built the auth UI yet, you can:
1. Wait until Step 10 (Authentication) is built
2. Or manually create a test account in Supabase dashboard

---

## Checklist

### Step 6 - Database Schema:
- [ ] Index on nfc_tag_id exists
- [ ] Unique constraint prevents duplicate NFC tags
- [ ] Foreign key relationships work
- [ ] RLS policies are enabled
- [ ] Can insert test data
- [ ] Can query binder by NFC tag ID

### Step 7 - Supabase Services:
- [ ] Client connects successfully ✅ (already verified)
- [ ] Auth service functions work (test after Step 10)
- [ ] Binder service CRUD works (test after Step 10)
- [ ] Card service functions work (test after Step 10)

**Note:** Some Step 7 tests require authentication, which we'll build in Step 10. The services are ready, but need the auth UI to test fully.

---

## After Testing

Once you've verified the tests:
1. Mark the checkboxes in `BUILD_STEPS.md`
2. Clean up test data (optional):
```sql
DELETE FROM public.binder_cards WHERE card_id = 'test-card-123';
DELETE FROM public.binders WHERE nfc_tag_id LIKE 'test-nfc-%';
```












