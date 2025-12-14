# Step 24: Connect TCGDEX API - Detailed Breakdown

## Overview

**What we're doing:** Replace mockup data with real TCGDEX API using the TypeScript SDK, implement static configuration files for eras and variants, and optimize for fast initial load with smart caching.

**Key Decisions:**
- Use TCGDEX TypeScript SDK (not REST API)
- Hardcode era definitions with set IDs
- Static config for variants per set
- Fast initial load with smart caching
- Remove all mockup data (hard cutover)
- Versioned config files with update mechanism

---

## Phase 1: Install and Set Up TCGDEX SDK

### Step 24.1: Install TCGDEX TypeScript SDK
- [x] **Status**: Completed (Note: SDK doesn't exist on npm, creating custom TypeScript client wrapper)

**What we're doing:** Create a TypeScript client wrapper for TCGDEX REST API (since official SDK doesn't exist on npm)

**Note:** The TCGDEX TypeScript SDK packages (`@tcgdx/typescript` and `tcgdx`) are not available on npm. Instead, we'll create a custom TypeScript client wrapper that acts as our SDK.

**Files created:**
- `src/services/api/tcgdxClient.ts` - Custom TCGDEX TypeScript client wrapper

**Testing:**
- [x] Client wrapper created successfully
- [x] No TypeScript errors
- [x] Can import client in TypeScript files

---

### Step 24.2: Create TCGDEX Client Service
- [x] **Status**: Completed

**What we're doing:** Create a service file to initialize and configure the TCGDEX client

**Files created:**
- `src/services/api/tcgdxClient.ts` - TCGDEX client initialization and configuration

**What was implemented:**
- Initialize TCGDEX client with proper configuration
- Set default language (English)
- Configure error handling with timeout support
- Export client instance for use in other services

**Testing:**
- [x] Client initializes without errors
- [x] Client can be imported in other files
- [x] No TypeScript errors
- [x] Client configuration is correct

---

## Phase 2: Create Static Configuration Files

### Step 24.3: Create Set Eras Configuration
- [x] **Status**: Completed

**What we're doing:** Create static configuration mapping set IDs to eras

**Files created:**
- `src/config/setEras.ts` - Era definitions with set ID mappings

**What was implemented:**
- Version field (`SET_ERAS_VERSION: '1.0.0'`)
- Last updated date field (`SET_ERAS_LAST_UPDATED: '2024-12-10'`)
- Era definitions object mapping era names to arrays of set IDs
- Helper functions:
  - `getEraForSet(setId: string): string | null`
  - `getSetsInEra(era: string): readonly string[]`
  - `getAllEras(): readonly string[]`
  - `getErasSorted(): readonly string[]` (newest era first)

**Era structure implemented:**
- Scarlet & Violet Era
- Sword & Shield Era
- Sun & Moon Era
- XY Era
- Black & White Era
- HeartGold & SoulSilver Era
- Platinum Era
- Diamond & Pearl Era
- EX Era
- Neo Era
- Base Set Era

**Testing:**
- [x] Config file created with version field
- [x] All major eras included (Base Set, Neo, EX, Diamond & Pearl, Sword & Shield, Scarlet & Violet)
- [x] Helper functions work correctly
- [x] Can get era for a set ID
- [x] Can get all sets in an era
- [x] Eras can be sorted (newest first)
- [x] TypeScript types are correct

---

### Step 24.4: Create Set Variants Configuration
- [x] **Status**: Completed

**What we're doing:** Create static configuration mapping set IDs to available variants

**Files created:**
- `src/config/setVariants.ts` - Variant definitions per set

**What was implemented:**
- Version field (`SET_VARIANTS_VERSION: '1.0.0'`)
- Last updated date field (`SET_VARIANTS_LAST_UPDATED: '2024-12-10'`)
- Variants object mapping set IDs to arrays of available variants
- Variant types: `'base' | 'holo' | 'reverse-holo' | 'poke-ball' | 'master-ball'` (updated CardVariant type)
- Helper functions:
  - `getVariantsForSet(setId: string): readonly CardVariant[]`
  - `hasVariant(setId: string, variant: CardVariant): boolean`
  - `getDefaultVariantsForSet(setId: string): readonly CardVariant[]` (returns ['base'] if not found)

**Variant structure implemented:**
- Modern sets (SV, SWSH): All variants including poke-ball and master-ball
- Older sets: Base and holo variants
- Default fallback: ['base'] for unknown sets

**Testing:**
- [x] Config file created with version field
- [x] Variants mapped for major sets
- [x] Helper functions work correctly
- [x] Can get variants for a set ID
- [x] Can check if variant exists for a set
- [x] Default variants returned for unknown sets
- [x] TypeScript types match CardVariant type

---

### Step 24.5: Create Config Index File
- [x] **Status**: Completed

**What we're doing:** Create an index file to export all config helpers

**Files created:**
- `src/config/index.ts` - Export all config functions and constants

**What was implemented:**
- Export all helper functions from `setEras.ts`
- Export all helper functions from `setVariants.ts`
- Export config version constants
- Re-export types if needed

**Testing:**
- [x] Index file created
- [x] All config functions can be imported from `src/config`
- [x] No circular dependencies
- [x] TypeScript resolves imports correctly

---

## Phase 3: Update Type Definitions

### Step 24.6: Update Card Type for TCGDEX
- [x] **Status**: Completed

**What we're doing:** Update Card interface to match TCGDEX API response structure

**Files updated:**
- `src/types/card.ts` - Updated Card interface

**What was checked/added:**
- Card ID format supports TCGDEX (e.g., `sv1-1` or TCGDEX format)
- Image URL structure supports TCGDEX
- Set ID vs Set Name handling (added `setId?` field)
- Variant detection from TCGDEX data (variant field already present)
- Pokédex number extraction (for Region mode) - already present
- Updated CardVariant type to include 'holo'
- Added mapper function type: `TCGDEXCardMapper`

**What was added:**
- Optional `setId` field for TCGDEX compatibility
- Mapper function type definition
- Updated CardVariant to include 'holo'

**Testing:**
- [x] Card type updated correctly
- [x] TCGDEX types defined (in separate file)
- [x] Mapper function type defined
- [x] No breaking changes to existing Card usage
- [x] TypeScript compiles without errors

---

### Step 24.7: Create TCGDEX Type Definitions
- [x] **Status**: Completed

**What we're doing:** Create TypeScript types for TCGDEX API responses

**Files created:**
- `src/types/tcgdx.ts` - TCGDEX API types

**What was implemented:**
- `TCGDEXSet` interface (matches TCGDEX Set response)
- `TCGDEXCard` interface (matches TCGDEX Card response)
- `TCGDEXSeries` interface
- Response wrapper types (`TCGDEXResponse<T>`)
- Error response types (`TCGDEXError`)

**Testing:**
- [x] Types match TCGDEX API structure
- [x] Types can be imported and used
- [x] No TypeScript errors
- [x] Types exported from types/index.ts

---

## Phase 4: Create API Service Layer

### Step 24.8: Create Sets Service
- [x] **Status**: Completed

**What we're doing:** Create service to fetch sets from TCGDEX API

**Files created:**
- `src/services/api/tcgdxSets.ts` - Sets fetching service

**What was implemented:**
- `getAllSets(): Promise<TCGDEXSet[]>` - Fetch all sets from TCGDEX
- `getSetById(setId: string): Promise<TCGDEXSet | null>` - Get single set
- `getSetsByEra(era: string): Promise<TCGDEXSet[]>` - Get sets filtered by era (using static config)
- `getSetsSorted(): Promise<TCGDEXSet[]>` - Get sets sorted newest → oldest, grouped by era
- Error handling with try/catch
- Handles multiple response formats (wrapped/unwrapped)

**Performance considerations:**
- Uses static config for era grouping (fast lookup)
- Sorts in memory after fetching (faster than API sorting)
- Handles unknown sets gracefully

**Testing:**
- [x] Service functions implemented
- [x] Can get single set by ID
- [x] Can filter sets by era
- [x] Sets sorted correctly (newest → oldest)
- [x] Sets grouped by era correctly
- [x] Error handling implemented
- [ ] Caching (to be implemented with React Query in later steps)

---

### Step 24.9: Create Cards Service
- [ ] **Status**: Not started

**What we're doing:** Create service to fetch cards from TCGDEX API

**Files to create:**
- `src/services/api/tcgdxCards.ts` - Cards fetching service

**What to implement:**
- `getCardsBySet(setId: string): Promise<Card[]>` - Get all cards for a set
- `getCardById(cardId: string): Promise<Card | null>` - Get single card
- `searchCards(query: string): Promise<Card[]>` - Search cards by name/number
- `getCardsByVariant(setId: string, variant: CardVariant): Promise<Card[]>` - Filter cards by variant
- Card mapper: `mapTCGDEXCardToCard(tcgdxCard: TCGDEXCard): Card`
- Variant detection logic (from TCGDEX card data)
- Error handling

**Performance considerations:**
- Lazy load cards (fetch on demand per set)
- Cache cards per set
- Use static config for variant filtering (fast lookup)
- Batch requests if possible

**Testing:**
- [ ] Can fetch cards for a set
- [ ] Can get single card by ID
- [ ] Can search cards
- [ ] Can filter cards by variant
- [ ] Card mapper converts TCGDEX format to app format correctly
- [ ] Variants detected correctly from TCGDEX data
- [ ] Error handling works
- [ ] Caching works (if implemented)

---

### Step 24.10: Create Card Mapper Utility
- [ ] **Status**: Not started

**What we're doing:** Create utility to map TCGDEX card data to app Card format

**Files to create:**
- `src/utils/tcgdxMapper.ts` - TCGDEX to app data mapper

**What to implement:**
- `mapTCGDEXSetToSet(tcgdxSet: TCGDEXSet): Set` - Map TCGDEX set to app Set format
- `mapTCGDEXCardToCard(tcgdxCard: TCGDEXCard): Card` - Map TCGDEX card to app Card format
- Extract variant from TCGDEX card data (check card properties for variant indicators)
- Extract Pokédex number from card name/data (for Region mode)
- Handle image URLs (use TCGDEX image URLs)
- Handle set IDs vs names

**Variant detection logic:**
- Check TCGDEX card properties for variant indicators
- Use static config to validate variants exist for set
- Default to 'base' if variant not detected

**Testing:**
- [ ] Set mapper works correctly
- [ ] Card mapper works correctly
- [ ] Variants extracted correctly
- [ ] Pokédex numbers extracted correctly (for Region mode)
- [ ] Image URLs mapped correctly
- [ ] Handles missing/optional fields gracefully
- [ ] No data loss during mapping

---

## Phase 5: Update Existing Services

### Step 24.11: Replace Mockup Data in pokemonApi.ts
- [ ] **Status**: Not started

**What we're doing:** Replace mockup data functions with TCGDEX API calls

**Files to update:**
- `src/services/api/pokemonApi.ts` - Replace mockup with TCGDEX

**What to replace:**
- Remove `mockSets` import
- Remove `mockCards` import
- Update `getSets()` to use TCGDEX sets service
- Update `getCardsBySet()` to use TCGDEX cards service
- Update `getCardById()` to use TCGDEX cards service
- Keep `getCardsByRegion()` (still uses Pokédex data, not TCGDEX)
- Remove fallback to mockup data

**What to keep:**
- `getCardsByRegion()` function (Region mode doesn't use TCGDEX)
- Type exports if needed

**Testing:**
- [ ] `getSets()` returns TCGDEX sets
- [ ] `getCardsBySet()` returns TCGDEX cards
- [ ] `getCardById()` returns TCGDEX card
- [ ] `getCardsByRegion()` still works (unchanged)
- [ ] No references to mockup data remain
- [ ] Error handling works (no fallback to mockup)

---

### Step 24.12: Update Set Selector Component
- [ ] **Status**: Not started

**What we're doing:** Update set selector to use TCGDEX sets with era grouping

**Files to update:**
- `src/components/Binder/SetSelector.tsx` - Update to use TCGDEX sets

**What to update:**
- Fetch sets from TCGDEX (not mockup)
- Group sets by era using static config
- Sort sets newest → oldest within each era
- Display era headers
- Handle loading states
- Handle error states

**Testing:**
- [ ] Sets fetched from TCGDEX
- [ ] Sets grouped by era correctly
- [ ] Sets sorted newest → oldest
- [ ] Era headers display correctly
- [ ] Loading state shows while fetching
- [ ] Error state shows if fetch fails
- [ ] Can select a set
- [ ] Set selection works correctly

---

### Step 24.13: Update Variant Selector Component
- [ ] **Status**: Not started

**What we're doing:** Update variant selector to use static config for available variants

**Files to update:**
- `src/components/Binder/VariantSelector.tsx` - Update to use static config

**What to update:**
- Use `getVariantsForSet()` from static config
- Display only variants available for selected set
- Show base variant as required (always checked, disabled)
- Show optional variants as toggleable
- Handle sets not in config (default to ['base'])

**Testing:**
- [ ] Variants loaded from static config
- [ ] Only available variants shown for selected set
- [ ] Base variant always included and required
- [ ] Optional variants can be toggled
- [ ] Unknown sets default to ['base']
- [ ] Variant selection saves correctly

---

## Phase 6: Implement Caching Strategy

### Step 24.14: Set Up React Query for Caching
- [ ] **Status**: Not started

**What we're doing:** Configure React Query for API response caching

**Files to update/create:**
- `src/services/api/queryClient.ts` - React Query client configuration
- Update `App.tsx` or root component - Wrap app with QueryClientProvider

**What to configure:**
- Cache time for sets (long, e.g., 24 hours - sets rarely change)
- Cache time for cards (medium, e.g., 1 hour - cards don't change)
- Stale time configuration
- Retry logic for failed requests
- Error handling

**Testing:**
- [ ] React Query client configured
- [ ] QueryClientProvider wraps app
- [ ] Sets cached for appropriate time
- [ ] Cards cached for appropriate time
- [ ] Failed requests retry correctly
- [ ] Cache persists across app restarts (if configured)

---

### Step 24.15: Create Cache Hooks
- [ ] **Status**: Not started

**What we're doing:** Create custom hooks using React Query for fetching data

**Files to create:**
- `src/hooks/useTcgdxSets.ts` - Hook for fetching sets
- `src/hooks/useTcgdxCards.ts` - Hook for fetching cards

**What to implement:**
- `useTcgdxSets()` - Fetch all sets with caching
- `useTcgdxSet(setId: string)` - Fetch single set with caching
- `useTcgdxCardsBySet(setId: string)` - Fetch cards for set with caching
- `useTcgdxCard(cardId: string)` - Fetch single card with caching
- Loading states
- Error states
- Refetch functions

**Testing:**
- [ ] Hooks return data correctly
- [ ] Loading states work
- [ ] Error states work
- [ ] Caching works (no duplicate requests)
- [ ] Can refetch data manually
- [ ] Hooks can be used in components

---

## Phase 7: Remove Mockup Data

### Step 24.16: Remove Mockup Data Files
- [ ] **Status**: Not started

**What we're doing:** Delete mockup data files (no longer needed)

**Files to delete:**
- `src/data/mockupCards.ts` - Delete mockup cards and sets

**What to check before deleting:**
- No imports of mockup data remain in codebase
- All references replaced with TCGDEX API calls
- Region mode still works (doesn't use mockup)

**Testing:**
- [ ] Mockup files deleted
- [ ] No import errors after deletion
- [ ] App still compiles
- [ ] No references to mockup data in codebase
- [ ] Region mode still works

---

### Step 24.17: Update Type Exports
- [ ] **Status**: Not started

**What we're doing:** Remove MockSet type, update exports

**Files to update:**
- `src/services/api/pokemonApi.ts` - Remove MockSet type export
- `src/types/index.ts` - Update type exports if needed

**What to update:**
- Remove `PokemonSet = MockSet` type alias
- Use TCGDEX Set type instead
- Update any type references

**Testing:**
- [ ] MockSet type removed
- [ ] TCGDEX Set type used instead
- [ ] No TypeScript errors
- [ ] Type exports updated correctly

---

## Phase 8: Performance Optimizations

### Step 24.18: Optimize Sets Loading
- [ ] **Status**: Not started

**What we're doing:** Optimize initial sets load for fast app startup

**Performance strategies:**
- Pre-fetch sets list on app startup (in background)
- Cache sets list aggressively (24+ hours)
- Use static config for era grouping (no API call needed)
- Sort in memory (faster than API sorting)
- Lazy load set details (only fetch when needed)

**Files to update:**
- `src/hooks/useTcgdxSets.ts` - Optimize caching
- `src/services/api/tcgdxSets.ts` - Optimize fetching

**Testing:**
- [ ] Sets load quickly on app startup
- [ ] Sets cached correctly
- [ ] No duplicate API calls
- [ ] Era grouping is fast (uses static config)
- [ ] Sorting is fast (in memory)

---

### Step 24.19: Optimize Cards Loading
- [ ] **Status**: Not started

**What we're doing:** Optimize cards loading per set (lazy load, cache)

**Performance strategies:**
- Lazy load cards (only fetch when binder opened)
- Cache cards per set
- Use static config for variant filtering (no API filtering needed)
- Batch card image loading
- Pre-fetch popular sets in background (optional)

**Files to update:**
- `src/hooks/useTcgdxCards.ts` - Optimize caching
- `src/services/api/tcgdxCards.ts` - Optimize fetching

**Testing:**
- [ ] Cards load only when needed (lazy loading)
- [ ] Cards cached per set
- [ ] Variant filtering is fast (uses static config)
- [ ] No duplicate API calls for same set
- [ ] Image loading optimized

---

### Step 24.20: Add Loading States
- [ ] **Status**: Not started

**What we're doing:** Add proper loading states for all TCGDEX API calls

**Files to update:**
- All components using TCGDEX data
- `src/components/Loading/` - Use existing loading components

**What to add:**
- Loading spinner while fetching sets
- Loading spinner while fetching cards
- Skeleton loaders for better UX (optional)
- Error states with retry buttons

**Testing:**
- [ ] Loading states show while fetching data
- [ ] Error states show on failure
- [ ] Can retry failed requests
- [ ] Loading states don't block UI unnecessarily

---

## Phase 9: Error Handling

### Step 24.21: Implement Error Handling
- [ ] **Status**: Not started

**What we're doing:** Add comprehensive error handling for TCGDEX API

**Error types to handle:**
- Network errors (no internet)
- API errors (4xx, 5xx)
- Timeout errors
- Invalid set/card IDs
- Rate limiting (if applicable)

**Files to create/update:**
- `src/utils/tcgdxErrors.ts` - Error handling utilities
- Update all TCGDEX service files - Add error handling

**What to implement:**
- Error type detection
- User-friendly error messages
- Retry logic for transient errors
- Error logging
- Fallback behavior (show empty state, not crash)

**Testing:**
- [ ] Network errors handled gracefully
- [ ] API errors handled gracefully
- [ ] Invalid IDs handled gracefully
- [ ] Error messages are user-friendly
- [ ] App doesn't crash on errors
- [ ] Can retry failed requests

---

## Phase 10: Testing and Validation

### Step 24.22: Test Sets Fetching
- [ ] **Status**: Not started

**What we're doing:** Test that sets are fetched correctly from TCGDEX

**Testing checklist:**
- [ ] Can fetch all sets from TCGDEX
- [ ] Sets include all required fields (id, name, releaseDate, etc.)
- [ ] Sets sorted correctly (newest → oldest)
- [ ] Sets grouped by era correctly (using static config)
- [ ] Can get single set by ID
- [ ] Error handling works (invalid ID, network error)
- [ ] Caching works (no duplicate requests)
- [ ] Loading states show correctly
- [ ] Performance is acceptable (< 2 seconds for sets list)

---

### Step 24.23: Test Cards Fetching
- [ ] **Status**: Not started

**What we're doing:** Test that cards are fetched correctly from TCGDEX

**Testing checklist:**
- [ ] Can fetch cards for a set
- [ ] Cards include all required fields (id, name, number, imageUrl, etc.)
- [ ] Can get single card by ID
- [ ] Can search cards by name/number
- [ ] Variants detected correctly from TCGDEX data
- [ ] Card mapper converts TCGDEX format correctly
- [ ] Error handling works
- [ ] Caching works (no duplicate requests)
- [ ] Loading states show correctly
- [ ] Performance is acceptable (< 3 seconds for full set)

---

### Step 24.24: Test Variant Detection
- [ ] **Status**: Not started

**What we're doing:** Test that variants are detected and filtered correctly

**Testing checklist:**
- [ ] Variants detected from TCGDEX card data
- [ ] Static config used for variant availability
- [ ] Can filter cards by variant
- [ ] Variant selector shows correct variants for set
- [ ] Base variant always available
- [ ] Optional variants shown only if available for set
- [ ] Unknown sets default to ['base'] variant

---

### Step 24.25: Test Era Grouping
- [ ] **Status**: Not started

**What we're doing:** Test that sets are grouped by era correctly

**Testing checklist:**
- [ ] Sets grouped by era using static config
- [ ] Era headers display correctly
- [ ] Sets sorted newest → oldest within each era
- [ ] Eras sorted newest → oldest
- [ ] Unknown sets handled gracefully (no era, or default era)
- [ ] Performance is fast (uses static config, no API calls)

---

### Step 24.26: Test Performance
- [ ] **Status**: Not started

**What we're doing:** Test that performance meets requirements (fast initial load)

**Performance tests:**
- [ ] App startup time acceptable (< 2 seconds to interactive)
- [ ] Sets list loads quickly (< 2 seconds)
- [ ] Cards load quickly per set (< 3 seconds)
- [ ] No unnecessary API calls (caching works)
- [ ] Static config lookups are fast (< 10ms)
- [ ] Memory usage acceptable
- [ ] No performance regressions

---

### Step 24.27: Test Error Scenarios
- [ ] **Status**: Not started

**What we're doing:** Test error handling in various scenarios

**Error scenarios to test:**
- [ ] No internet connection (offline)
- [ ] API server down (5xx error)
- [ ] Invalid set ID (404 error)
- [ ] Invalid card ID (404 error)
- [ ] Rate limiting (429 error, if applicable)
- [ ] Timeout errors
- [ ] Malformed API responses

**For each scenario:**
- [ ] Error handled gracefully (no crash)
- [ ] User-friendly error message shown
- [ ] Can retry request
- [ ] App remains functional (other features work)

---

### Step 24.28: Integration Testing
- [ ] **Status**: Not started

**What we're doing:** Test full integration with existing app features

**Integration tests:**
- [ ] Onboarding questionnaire works with TCGDEX sets
- [ ] Set selector shows TCGDEX sets grouped by era
- [ ] Variant selector shows correct variants from static config
- [ ] Binder creation works with TCGDEX data
- [ ] Binder detail screen shows TCGDEX cards
- [ ] Card detail screen shows TCGDEX card data
- [ ] Search works with TCGDEX cards
- [ ] Filtering works with TCGDEX cards
- [ ] Progress tracking works correctly
- [ ] Region mode still works (unchanged)

---

## Phase 11: Cleanup and Documentation

### Step 24.29: Remove Unused Code
- [ ] **Status**: Not started

**What we're doing:** Remove any unused code, imports, or comments

**Files to check:**
- All service files
- All component files
- All type files

**What to remove:**
- Unused imports
- Commented-out code
- Old mockup references in comments
- Unused types
- Unused utility functions

**Testing:**
- [ ] No unused imports
- [ ] No commented-out code
- [ ] No references to mockup data
- [ ] Code is clean and maintainable

---

### Step 24.30: Update Documentation
- [ ] **Status**: Not started

**What we're doing:** Update project documentation to reflect TCGDEX integration

**Files to update:**
- `README.md` - Update API section
- `PROJECT_CONFIG.md` - Update API configuration
- `BUILD_STEPS.md` - Mark Step 24 as completed

**What to document:**
- TCGDEX API usage
- Static config files location and purpose
- How to update static configs (when new sets release)
- Caching strategy
- Performance considerations

**Testing:**
- [ ] Documentation updated
- [ ] API section accurate
- [ ] Config update process documented
- [ ] Performance notes included

---

## Summary

**Total Steps:** 30 sub-steps

**Key Deliverables:**
1. TCGDEX SDK integrated
2. Static config files for eras and variants
3. API service layer for sets and cards
4. Caching strategy implemented
5. Mockup data removed
6. Performance optimizations
7. Error handling
8. Full testing completed

**Estimated Time:** 2-3 days (depending on TCGDEX API complexity and testing)

**Dependencies:**
- TCGDEX TypeScript SDK must be available and working
- TCGDEX API must be accessible
- Static configs need initial population with set data

---

## Notes

- **Static Config Updates:** When new sets are released, update `setEras.ts` and `setVariants.ts` config files with new set IDs and variants
- **Versioning:** Config files have version fields - increment when updating
- **Performance:** Static configs enable fast lookups without API calls
- **Caching:** React Query handles API response caching automatically
- **Error Handling:** Always handle errors gracefully - show user-friendly messages, don't crash
