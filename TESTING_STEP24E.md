# Testing Step 24E - Rate Limiting & Caching

## What Was Implemented

Step 24E adds comprehensive caching and rate limiting to optimize API usage and improve performance:

### Key Features
1. **React Query Integration** - Global query client with automatic caching
2. **In-Memory Cache** - 5-minute cache for API responses
3. **Request Deduplication** - Prevents duplicate simultaneous requests
4. **Rate Limit Detection** - Detects HTTP 429 and handles gracefully
5. **Exponential Backoff** - Automatic retry with increasing delays
6. **Stale Cache Fallback** - Uses old cache when rate limited
7. **Performance Logging** - Tracks duration of all API calls

### How It Works

#### React Query Caching (App.tsx)
- **Stale Time**: 5 minutes - data is fresh for 5 minutes
- **GC Time**: 10 minutes - cached data kept for 10 minutes
- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Refetch on Focus**: Automatically refreshes data when app regains focus

#### In-Memory Cache (pokemonApi.ts)
- **Cache Duration**: 5 minutes per entry
- **Cache Key Format**:
  - Sets: `"sets-minimal"`
  - Cards by set: `"cards-{setIdentifier}"`
  - Single card: `"card-{cardId}"`
- **Auto-Cleanup**: Expired entries removed when accessed

#### Request Deduplication
- If the same request is already in progress, reuse the existing promise
- Prevents multiple API calls for the same data
- Cleared automatically when request completes

#### Rate Limit Handling
- Detects HTTP 429 responses
- Extracts `Retry-After` header (or defaults to 60 seconds)
- Blocks all requests until rate limit expires
- Falls back to stale cache or mock data
- Shows user-friendly error messages

---

## How to Test

### Prerequisites
- App is running: `npm start`
- You're logged in
- Console/DevTools is open to see logs

---

### Test 1: Caching Works (No Duplicate API Calls)

**What to test:** Opening the same binder multiple times should only call the API once

**Steps:**
1. Open the app and log in
2. Navigate to Binder List screen
3. Open DevTools console (or React Native debugger)
4. Tap on any binder to open it
5. **Look for logs:** You should see `[24E] Making SDK request` and `[24C]` logs
6. Go back to Binder List
7. Tap the SAME binder again
8. **Look for logs:** You should see `[24E] Returning cached cards` (NO new API request)
9. Wait 5 minutes
10. Tap the same binder again
11. **Look for logs:** You should see `[24E] Making SDK request` (cache expired, new request)

**Expected Results:**
- ✅ First open: API call made (`[24E] Making SDK request`)
- ✅ Second open (within 5 min): Uses cache (`[24E] Returning cached cards`)
- ✅ After 5 minutes: New API call made (cache expired)
- ✅ Cards display correctly in all cases
- ✅ No duplicate API calls in Network tab (if available)

---

### Test 2: Request Deduplication (No Simultaneous Duplicates)

**What to test:** Multiple simultaneous requests for the same data should only trigger one API call

**Steps:**
1. Open the app
2. Open DevTools console
3. Navigate to Binder List
4. Quickly tap on multiple binders that need the same set data
5. **Look for logs:** Should see `[24E] Request already pending, using existing promise`

**Expected Results:**
- ✅ Only ONE API request made per unique data
- ✅ Log shows: `[24E] Request already pending, using existing promise`
- ✅ All screens show the same data correctly
- ✅ No errors or crashes

**Note:** This is harder to test manually - might need to trigger it programmatically or with very fast tapping

---

### Test 3: Cache Statistics (Debugging Tool)

**What to test:** The cache statistics function works correctly

**Steps:**
1. Open the app
2. Open a few binders to populate cache
3. Open DevTools console
4. Run this in the console (or add to a debug screen):
   ```javascript
   import { getCacheStats } from './src/services/api/pokemonApi';
   console.log(getCacheStats());
   ```
5. **Look for output:** Should show cache statistics

**Expected Output:**
```javascript
{
  totalEntries: 5,          // Number of cached items
  validEntries: 5,          // Number still fresh
  expiredEntries: 0,        // Number expired
  pendingRequests: 0,       // Currently in-flight
  oldestEntry: 1703001234567, // Timestamp
  newestEntry: 1703001456789  // Timestamp
}
```

**Expected Results:**
- ✅ Statistics show correct number of entries
- ✅ Valid/expired counts make sense
- ✅ No errors when calling function

---

### Test 4: Performance Logging

**What to test:** API calls are logged with duration

**Steps:**
1. Open the app
2. Open DevTools console
3. Navigate to any binder
4. **Look for logs:** Should see duration in milliseconds

**Expected Logs:**
```
[24E] Making SDK request for cards
[24C] Set fetched using identifier as ID: {...}
[24C] Variant cards generated: {
  duration: "1234.56ms",
  performance: "good"  // or "acceptable" or "slow"
}
```

**Expected Results:**
- ✅ Duration is logged for all API calls
- ✅ Performance indicator is shown (`good` < 3s, `acceptable` < 10s, `slow` > 10s)
- ✅ Logs help identify slow operations

---

### Test 5: Rate Limit Detection (If Possible)

**What to test:** App handles rate limiting gracefully

⚠️ **Warning:** This is hard to test without actually hitting rate limits. TCGDEX API might not have strict rate limits, so you might not encounter this in normal usage.

**Steps (if you want to try):**
1. Make MANY rapid API calls (open/close binders very quickly, repeatedly)
2. **If rate limited:** Watch for logs and behavior

**Expected Results (if rate limited):**
- ✅ Log shows: `[24E] Rate limit hit (429)`
- ✅ App shows user-friendly error message (not technical error)
- ✅ App falls back to stale cache (if available)
- ✅ App doesn't crash
- ✅ After waiting, requests work again

**What to look for:**
```
[24E] Rate limit hit (429): {
  retryCount: 1,
  maxRetries: 3,
  waitTime: 60000,
  resetTime: "2023-12-19T12:34:56.789Z"
}
```

**User-Friendly Error Message:**
```
"Rate limit exceeded. Please wait 60 seconds before trying again. (Retry 1/3)"
```

**Note:** If you never hit rate limits, that's fine! It means the caching is working well.

---

### Test 6: Stale Cache Fallback (When Rate Limited)

**What to test:** When rate limited, app uses old cached data instead of failing

**Prerequisites:** Need to be rate limited (see Test 5) OR simulate it

**Steps:**
1. Load a binder (populates cache)
2. Wait 5 minutes (cache becomes stale)
3. Get rate limited (or simulate by modifying code temporarily)
4. Try to load the same binder again
5. **Look for logs:** Should see `[24E] Returning stale cache due to rate limit`

**Expected Results:**
- ✅ Binder loads with old cached data (even though cache is stale)
- ✅ Log shows: `[24E] Returning stale cache due to rate limit`
- ✅ No error shown to user (or friendly message)
- ✅ App continues to work

**Fallback Order:**
1. Fresh cache (< 5 min) → Use it
2. Stale cache (> 5 min) → Use it if rate limited
3. Mock data → Last resort if no cache

---

### Test 7: Clear Cache Function

**What to test:** Manual cache clearing works

**Steps:**
1. Load some binders (populates cache)
2. Verify cache is populated (use `getCacheStats()`)
3. Call `clearApiCache()` in console:
   ```javascript
   import { clearApiCache } from './src/services/api/pokemonApi';
   clearApiCache();
   ```
4. Check cache stats again
5. Reload a binder

**Expected Results:**
- ✅ Cache is cleared (stats show 0 entries)
- ✅ Log shows: `[24E] API cache cleared`
- ✅ Next binder load makes fresh API call (no cache hit)
- ✅ Cache starts repopulating

---

## Visual Indicators

### Cache Hit (Good)
- **Fast load time** (instant or near-instant)
- **No loading spinner** (or very brief)
- **Logs show:** `[24E] Returning cached cards`

### Cache Miss (Normal)
- **Loading spinner** appears
- **API call made** (network activity)
- **Logs show:** `[24E] Making SDK request`

### Rate Limited (Warning)
- **Error message** displayed to user
- **Falls back** to cached data (if available)
- **Logs show:** `[24E] Rate limit hit (429)`

---

## Common Issues & Troubleshooting

### Issue: "Cache never expires, always using cached data"
- **Check:** Look for timestamp in logs
- **Check:** Verify `CACHE_DURATION` is set correctly (5 minutes = 300,000 ms)
- **Fix:** Call `clearApiCache()` to manually clear

### Issue: "Cache not working, always making API calls"
- **Check:** Look for logs - should see `[24E] Cache miss` or `[24E] Cache expired`
- **Check:** Verify cacheKey is consistent (same format each time)
- **Check:** Verify cache is being set (look for `[24E] Data cached`)

### Issue: "App crashes on rate limit"
- **Check:** Error handling is working correctly
- **Check:** Fallback to mock data is implemented
- **Fix:** Check console for error stack trace

### Issue: "Duplicate requests still happening"
- **Check:** Look for `[24E] Request already pending` logs
- **Check:** Verify requests use exact same cacheKey
- **Note:** Different parameters = different cacheKey = separate requests (expected)

---

## Performance Benchmarks

### Expected Performance
- **Cache hit:** < 50ms (instant)
- **API call (sets):** 500-2000ms (good)
- **API call (cards):** 1000-5000ms (acceptable for large sets)
- **API call (single card):** 200-1000ms (good)

### Slow Performance Indicators
- **> 10 seconds:** Logged as "slow" in console
- **Causes:** Large sets (200+ cards), slow network, rate limiting
- **Solution:** Caching helps - second load will be instant

---

## Summary

Step 24E adds intelligent caching and rate limiting to make the app:
- **Faster** - No unnecessary API calls
- **More Resilient** - Handles rate limits gracefully
- **Better UX** - Instant loads for cached data
- **Debuggable** - Comprehensive logging

### Key Logs to Look For
- `[24E] Cache hit` → Good! Using cached data
- `[24E] Cache miss` → Normal, making API call
- `[24E] Making SDK request` → API call in progress
- `[24E] Data cached` → Response cached for future use
- `[24E] Request already pending` → Deduplication working
- `[24E] Rate limit hit (429)` → Rate limited (rare, handled gracefully)

### Next Steps
- Test caching in real usage (open/close binders)
- Monitor console for logs
- Verify no duplicate API calls
- Check performance improvements
- If everything works well, proceed to **Step 24F: Handle Variants from API**

