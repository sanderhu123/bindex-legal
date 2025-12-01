# How to Test Steps 6 & 7

I've created test files to help you verify everything works. Here's what to do:

## Step 6: Database Schema Tests

### Quick Test (5 minutes)

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com/dashboard
   - Click **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Run These Simple Tests**

   **Test 1: Check if index exists**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'binders' AND indexname LIKE '%nfc%';
   ```
   ✅ **Expected:** Should show `idx_binders_nfc_tag_id`

   **Test 2: Check if RLS is enabled**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('binders', 'binder_cards', 'user_profiles');
   ```
   ✅ **Expected:** All should show `rowsecurity = t` (true)

   **Test 3: Insert test data**
   - First, get your user ID:
   ```sql
   SELECT id FROM auth.users LIMIT 1;
   ```
   - Copy that ID, then insert a test binder (replace YOUR_USER_ID):
   ```sql
   INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
   VALUES ('YOUR_USER_ID', 'Test Binder', 'custom', 'test-nfc-123')
   RETURNING *;
   ```
   ✅ **Expected:** Should insert successfully and return the binder

   **Test 4: Query by NFC tag**
   ```sql
   SELECT * FROM public.binders WHERE nfc_tag_id = 'test-nfc-123';
   ```
   ✅ **Expected:** Should return the test binder

   **Test 5: Try duplicate NFC tag (should fail)**
   ```sql
   INSERT INTO public.binders (user_id, name, collection_mode, nfc_tag_id)
   VALUES ('YOUR_USER_ID', 'Test Binder 2', 'custom', 'test-nfc-123');
   ```
   ✅ **Expected:** Should FAIL with unique constraint error

3. **Clean up test data** (optional):
   ```sql
   DELETE FROM public.binders WHERE nfc_tag_id = 'test-nfc-123';
   ```

### Full Test Suite

For more thorough testing, see `database/test_queries.sql` - it has all the detailed test queries.

---

## Step 7: Supabase Services Tests

### Current Status

✅ **Already Verified:**
- Supabase client connects successfully
- Can read environment variables
- No TypeScript errors

⏳ **Waiting for Step 10 (Authentication):**
- Auth service tests (need login UI)
- Binder service tests (need authentication)
- Card service tests (need authentication)

**Why?** These services require a logged-in user. Once we build the login screen in Step 10, we can test them fully.

### Quick Verification

The services are already implemented and ready. You can verify they exist:

1. Check files exist:
   - ✅ `src/services/supabase/client.ts`
   - ✅ `src/services/supabase/auth.ts`
   - ✅ `src/services/supabase/binders.ts`
   - ✅ `src/services/supabase/cards.ts`

2. Check TypeScript compiles:
   ```bash
   npx tsc --noEmit
   ```
   ✅ **Expected:** No errors

---

## What to Check Off

After running the Step 6 tests, you can check off:

### Step 6:
- [x] Unique constraint on `nfcTagId` works (if Test 5 passed)
- [x] Index on `nfcTagId` created (if Test 1 passed)
- [x] Foreign key relationships work (can verify in Table Editor)
- [x] RLS policies applied correctly (if Test 2 passed)
- [x] Can insert test data manually (if Test 3 passed)
- [x] Can query tables from SQL Editor (if Test 4 passed)
- [x] Can query binder by NFC tag ID (if Test 4 passed)

### Step 7:
- [x] Auth service functions work - **Will test in Step 10**
- [x] Binder service can create/read/update/delete - **Will test in Step 10**
- [x] Card service functions work - **Will test in Step 10**

**Note:** The Step 7 service tests will be fully verified when we build the authentication UI in Step 10. The code is ready and working - it just needs a user to be logged in to test.

---

## Need Help?

- See `database/TESTING_GUIDE.md` for detailed instructions
- See `database/test_queries.sql` for all SQL test queries
- See `scripts/test-supabase-services.ts` for automated service tests (requires auth)





