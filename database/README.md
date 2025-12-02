# Database Schema Setup

This folder contains the SQL script to set up your Supabase database schema.

## How to Run the Schema Script

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Paste the SQL Script

1. Open the file `database/schema.sql` in this project
2. Copy the entire contents (Ctrl+A, then Ctrl+C)
3. Paste it into the Supabase SQL Editor (Ctrl+V)

### Step 3: Run the Script

1. Click the **Run** button (or press Ctrl+Enter)
2. Wait for the script to complete
3. You should see "Success. No rows returned" or similar success message

### Step 4: Verify the Schema

1. In Supabase dashboard, click on **Table Editor** in the left sidebar
2. You should see three new tables:
   - `user_profiles`
   - `binders`
   - `binder_cards`

3. Click on each table to verify the columns:
   - **user_profiles**: id, email, display_name, created_at, updated_at
   - **binders**: id, user_id, name, collection_mode, set, region, variants_to_track, variant_placement, layout_preference, nfc_tag_id, created_at, updated_at
   - **binder_cards**: id, binder_id, card_id, variant, created_at

### Step 5: Test the Schema (Optional)

You can run these test queries in the SQL Editor to verify everything works:

```sql
-- Check that tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'binders', 'binder_cards');

-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'binders', 'binder_cards');

-- Check that indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('binders', 'binder_cards');
```

## What Gets Created

### Tables

1. **user_profiles** - Extends Supabase auth.users with profile data
2. **binders** - Stores user binders with all preferences
3. **binder_cards** - Junction table linking cards to binders

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Policies prevent unauthorized access

### Indexes

- Index on `binders.user_id` for fast user binder lookups
- Index on `binders.nfc_tag_id` for fast NFC tag lookups
- Unique constraint on `binders.nfc_tag_id` (1:1 relationship)
- Indexes on `binder_cards.binder_id` and `binder_cards.card_id`

### Triggers

- Auto-update `updated_at` timestamps
- Auto-create user profile on signup

## Troubleshooting

### Error: "relation already exists"
- The table already exists. You can either:
  - Drop the existing table and re-run the script (⚠️ deletes data)
  - Or modify the script to use `CREATE TABLE IF NOT EXISTS` (already included)

### Error: "permission denied"
- Make sure you're running the script as the database owner
- Check that you're logged into the correct Supabase project

### Error: "extension uuid-ossp does not exist"
- This is rare, but if it happens, Supabase should have it enabled by default
- Contact Supabase support if this error persists

## Next Steps

After running this script successfully, proceed to **Step 7: Set Up Supabase Client** in BUILD_STEPS.md






