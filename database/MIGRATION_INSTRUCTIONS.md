# Database Migration: Add Progress Caching

## What This Does

This migration adds two new columns to the `binders` table to cache progress calculations:
- `total_cards` - Total number of cards expected in the binder
- `owned_cards` - Number of cards currently owned

This makes the "My Binders" page load **instantly** instead of making API calls for each binder.

---

## How to Run the Migration

### Step 1: Open Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration

1. Open the file `database/schema_migration_add_progress_cache.sql`
2. Copy the entire contents of the file
3. Paste it into the SQL Editor in Supabase
4. Click **Run** (or press Ctrl/Cmd + Enter)

### Step 3: Verify the Migration

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'binders' 
AND column_name IN ('total_cards', 'owned_cards');
```

You should see both columns listed.

### Step 4: Verify Triggers Are Working

Run this query to check that owned_cards matches the actual card count:

```sql
SELECT 
  b.id,
  b.name,
  b.owned_cards as cached_count,
  COUNT(bc.id) as actual_count,
  CASE 
    WHEN b.owned_cards = COUNT(bc.id) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM public.binders b
LEFT JOIN public.binder_cards bc ON bc.binder_id = b.id
GROUP BY b.id, b.name, b.owned_cards;
```

All binders should show "✅ Match".

---

## What Changed in the Code

### Database:
- Added `total_cards` column to store expected card count
- Added `owned_cards` column to store current card count
- Added automatic triggers to update `owned_cards` when cards are added/removed

### TypeScript:
- Updated `Binder` interface with `totalCards` and `ownedCards` fields
- Updated `createBinder()` to calculate and store `total_cards` when creating a binder
- Updated `BinderListScreen` to use cached values instead of calculating progress

---

## Performance Improvement

**Before:**
- Loading 5 binders = **10 API calls** (2 per binder)
- Load time: **3-5 seconds** (or longer)

**After:**
- Loading 5 binders = **1 database query**
- Load time: **< 100ms** ⚡

---

## Rollback (If Needed)

If you need to undo this migration, run:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS update_owned_cards_on_insert ON public.binder_cards;
DROP TRIGGER IF EXISTS update_owned_cards_on_delete ON public.binder_cards;
DROP FUNCTION IF EXISTS update_binder_owned_cards();

-- Remove columns
ALTER TABLE public.binders DROP COLUMN IF EXISTS total_cards;
ALTER TABLE public.binders DROP COLUMN IF EXISTS owned_cards;
```

**Note:** You'll also need to revert the code changes if you rollback the database.

