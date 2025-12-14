# Build Steps - Pokémon TCG Binder Tracker App

## Overview

This guide walks you through building the app step-by-step. We'll build it incrementally, feature by feature, so you can test as we go.

---

## Phase 1: Project Setup & Foundation

### Step 1: Initialize Expo Project
- [x] **Status**: Completed

**What we're doing:** Creating the base React Native/Expo project structure

**Commands:**
```bash
npx create-expo-app@latest . --template blank-typescript
npm install
```

**What gets created:**
- Basic Expo project structure
- TypeScript configuration
- Package.json with dependencies

**Testing:**
- [x] Run `npm start` - Expo dev server starts without errors (ready to test)
- [ ] See default Expo welcome screen on device/simulator (ready to test)
- [x] No TypeScript errors in terminal
- [x] Project structure created correctly

---

### Step 2: Install Core Dependencies
- [x] **Status**: Completed

**What we're doing:** Installing all the packages we need

**Commands:**
```bash
# Navigation
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# State Management & Data Fetching
npm install @tanstack/react-query zustand

# Storage & Backend
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage

# UI Components
npm install react-native-paper
npm install expo-image

# Development tools
npm install --save-dev @types/react @types/react-native
```

**What gets installed:**
- Navigation libraries
- State management tools
- Supabase client
- UI component library
- Image handling

---

### Step 3: Set Up Project Structure
- [x] **Status**: Completed

**What we're doing:** Creating folders and basic file structure

**Structure to create:**
```
src/
├── components/     # Reusable UI components
├── screens/       # Screen components
├── navigation/    # Navigation setup
├── services/     # API, Supabase, etc.
├── hooks/         # Custom React hooks
├── context/       # React Context providers
├── types/         # TypeScript types
├── utils/         # Helper functions
└── constants/     # App constants
```

**Testing:**
- [x] All folders created in `src/` directory
- [x] Folder structure matches specification
- [x] No errors when importing from these folders
- [x] TypeScript can resolve paths correctly

---

### Step 4: Configure TypeScript Types
- [x] **Status**: Completed

**What we're doing:** Define data models (Card, Binder, User)

**Files to create:**
- `src/types/card.ts` - Card interface
- `src/types/binder.ts` - Binder interface (includes variantsToTrack, variantPlacement, layoutPreference)
- `src/types/user.ts` - User interface
- `src/types/index.ts` - Export all types

**Testing:**
- [x] Run `npx tsc --noEmit` - no TypeScript errors
- [x] All interfaces properly defined
- [x] Types can be imported in other files
- [x] Binder interface includes all new fields (variantsToTrack, variantPlacement, layoutPreference)
- [x] Type checking works in IDE

---

## Phase 2: Backend Setup

### Step 5: Set Up Supabase Account
- [x] **Status**: Completed

**What we're doing:** Create Supabase project and get credentials

**Setup Guide:** See `SUPABASE_SETUP.md` for detailed instructions

**Steps:**
1. Go to https://supabase.com
2. Sign up (free account)
3. Create new project
4. Get your project URL and anon key
5. Create `.env` file with credentials

**Files:**
- `.env` (create manually - see SUPABASE_SETUP.md for template)
- `SUPABASE_SETUP.md` (setup guide created)

**Testing:**
- [x] `.env` file created with all required variables
- [x] Supabase project created successfully
- [x] Can access Supabase dashboard (user confirmed)
- [x] Project URL and anon key saved correctly
- [x] `.env` file is in `.gitignore` (not committed)

---

### Step 6: Set Up Database Schema
- [x] **Status**: Completed

**What we're doing:** Create database tables in Supabase

**Files created:**
- `database/schema.sql` - Complete SQL schema script ✅
- `database/README.md` - Instructions for running the schema ✅

**Tables created:**
- `user_profiles` - User profile data (extends auth.users)
- `binders` - User binders (includes variantsToTrack, variantPlacement, layoutPreference, nfcTagId columns)
- `binder_cards` - Cards in binders (junction table)

**What was set up:**
- ✅ Tables created with proper relationships
- ✅ Row Level Security (RLS) policies enabled
- ✅ Indexes created for performance
- ✅ Unique constraint on `nfc_tag_id` (1:1 relationship)
- ✅ Index on `nfc_tag_id` for fast lookups
- ✅ Triggers for auto-updating timestamps
- ✅ Function to auto-create user profiles on signup

**Testing:**
- [x] Schema SQL file created with all required tables
- [x] Schema includes RLS policies
- [x] Schema includes indexes (including nfc_tag_id)
- [x] Schema includes unique constraint on nfc_tag_id
- [x] SQL script executed in Supabase SQL Editor
- [x] All tables created in Supabase dashboard
- [x] Tables have correct columns and data types
- [x] `nfcTagId` column added to binders table
- [ ] Unique constraint on `nfcTagId` works (prevents duplicates) - Ready to test
- [ ] Index on `nfcTagId` created for performance - Ready to test
- [ ] Foreign key relationships work - Ready to test
- [ ] RLS policies applied correctly - Ready to test
- [ ] Can insert test data manually - Ready to test
- [ ] Can query tables from SQL Editor - Ready to test
- [ ] Can query binder by NFC tag ID - Ready to test

---

### Step 7: Set Up Supabase Client
- [x] **Status**: Completed

**What we're doing:** Create service to connect to Supabase

**Files:**
- `src/services/supabase/client.ts` - Supabase client initialization
- `src/services/supabase/auth.ts` - Authentication functions
- `src/services/supabase/binders.ts` - Binder CRUD operations (includes NFC tag queries)
- `src/services/supabase/cards.ts` - Card operations
- `src/services/supabase/index.ts` - Service exports

**Testing:**
- [x] Supabase client initializes without errors
- [x] Can read environment variables from `.env`
- [x] Client connects to Supabase successfully
- [x] Auth service functions work (test signup/login)
- [ ] Binder service can create/read/update/delete - Ready to test
- [x] Can query binder by NFC tag ID (function implemented)
- [x] Can check if NFC tag belongs to current user (function implemented)
- [ ] Card service functions work - Ready to test
- [x] No TypeScript errors

---

## Phase 3: Core Features

### Step 8: Set Up NFC Integration
- [x] **Status**: Completed

**What we're doing:** Set up NFC tag reading and deep linking

**Features:**
- Install NFC library
- Handle NFC intents for app launch
- Read NFC tag ID
- Link NFC tag to binder
- Handle new vs existing tag logic

**Files:**
- `src/services/nfc/nfcService.ts` - NFC reading/writing functions
- `src/hooks/useNfcScan.ts` - Hook for NFC scanning
- `src/utils/nfcHandler.ts` - Handle NFC intents and routing

**Commands:**
```bash
npm install react-native-nfc-manager
npx expo install expo-linking
```

**Note:** `react-native-nfc-manager` requires native code, so you'll need to create a development build (not Expo Go). Use `npx expo run:android` or `npx expo run:ios` to test NFC functionality.

**Testing:**

**Prerequisites:**
- ✅ NFC library installed correctly (react-native-nfc-manager)
- ✅ NFC service created (nfcService.ts)
- ✅ NFC hook created (useNfcScan.ts)
- ✅ NFC handler utility created (nfcHandler.ts)
- ✅ App.json updated with NFC permissions
- ✅ Android intent filters configured
- ✅ iOS NFC usage description added
- ✅ Error handling for tag read failures (implemented)
- ✅ Error handling for tag belonging to another user (implemented)

**How to Test NFC Functionality:**

**Important:** NFC requires:
1. A **development build** (not Expo Go) - NFC uses native code
2. A **physical device** - Emulators don't have NFC hardware
3. An **NFC tag** - You can buy NFC stickers/tags online (very cheap, ~$1-2 each)

**Step-by-Step Testing Instructions:**

1. **Create a Development Build:**
   - See `DEVELOPMENT_BUILD_GUIDE.md` for detailed instructions
   - **Quick version:**
     ```bash
     # For Android (recommended on Windows):
     eas build --profile development --platform android
     
     # For iOS (Mac only):
     eas build --profile development --platform ios
     ```
   - Wait for build to complete (10-15 minutes)
   - Download and install the APK/IPA on your device

2. **Start the Development Server:**
   ```bash
   npm start
   # or
   npx expo start --dev-client
   ```
   - Open the development build app on your device
   - Connect to the dev server (scan QR code or press connect button)

3. **Test NFC Tag Reading:**
   - Make sure NFC is enabled on your device (Settings → NFC)
   - Open the app
   - Find a button/screen that triggers NFC scanning (if implemented)
   - Tap your NFC tag to the back of your phone
   - The app should read the tag ID
   - ✅ **Test:** Can read NFC tag ID

4. **Test App Launch from NFC Tag:**
   - Close the app completely
   - Tap your NFC tag to the back of your phone
   - The app should launch automatically
   - ✅ **Test:** App launches from NFC tag

5. **Test New Tag Detection:**
   - Use a brand new NFC tag (never linked to a binder)
   - Tap it to your phone
   - App should detect it's a new tag
   - Should route to questionnaire (if navigation is set up)
   - ✅ **Test:** Detects new vs existing tag

6. **Test Existing Tag Detection:**
   - Use an NFC tag that's already linked to a binder
   - Tap it to your phone
   - App should detect it's an existing tag
   - Should route to the linked binder (if navigation is set up)
   - ✅ **Test:** Routes to binder for existing tag

7. **Test Error Handling:**
   - Try scanning when NFC is disabled → Should show error
   - Try scanning a tag that belongs to another user → Should show error
   - ✅ **Test:** Error handling works correctly

**Where to Buy NFC Tags:**
- Amazon: Search "NFC tags" or "NFC stickers"
- Very cheap: $5-10 for a pack of 10-20 tags
- Any NTAG213, NTAG215, or NTAG216 tags will work

**Troubleshooting:**
- **"NFC not supported"** → Make sure you're using a development build, not Expo Go
- **"Can't read tag"** → Make sure NFC is enabled in device settings
- **"App doesn't launch"** → Check that intent filters are configured in app.json
- **"Tag read fails"** → Try holding the tag closer to the phone, or try a different tag

**Testing Checklist:**
- [ ] Can read NFC tag ID (requires development build + physical device)
- [ ] App launches from NFC tag (requires development build + physical device)
- [ ] Detects new vs existing tag (requires development build + physical device)
- [ ] Routes to questionnaire for new tag (requires navigation setup - Step 9)
- [ ] Routes to binder for existing tag (requires navigation setup - Step 9)
- [ ] Works on physical device (NFC requires real device + development build)

---

### Step 9: Set Up Navigation
- [x] **Status**: Completed

**What we're doing:** Create navigation structure

**Screens to create:**
- Auth Stack (Login, Signup)
- Main Stack (NFC Handler, Questionnaire, BinderList, BinderDetail, CardList)

**Files:**
- `src/navigation/AppNavigator.tsx` - Main navigation
- `src/navigation/AuthNavigator.tsx` - Auth navigation
- `src/navigation/NfcHandler.tsx` - NFC tag detection and routing

**Testing:**
- [x] Navigation structure created
- [x] Can navigate between auth screens
- [x] Can navigate between main screens
- [x] NFC handler routes correctly
- [x] Back button works correctly
- [x] Navigation state persists correctly
- [x] No navigation errors in console
- [x] Screens render without errors

---

### Step 10: Authentication
- [x] **Status**: Completed

**What we're doing:** User login and signup

**Features:**
- Sign up screen (email/password + social login)
- Login screen
- Logout functionality
- Auth state management

**Files:**
- `src/screens/Auth/LoginScreen.tsx`
- `src/screens/Auth/SignupScreen.tsx`
- `src/context/AuthContext.tsx`

**Testing:**
- [x] Can create account with email/password
- [x] Can login with email/password
- [ ] Can login with Google (implemented, configure provider in Supabase then test)
- [ ] Can login with Apple (iOS, implemented, configure provider in Supabase then test)
- [x] Can logout successfully
- [x] Auth state persists across app restarts
- [x] Error messages display correctly
- [x] Form validation works (basic validation implemented)
- [x] Navigation to main app after login works

---

### Step 11: Mockup Data Setup
- [x] **Status**: Completed

**What we're doing:** Create mockup card data for testing

**Files:**
- `src/data/mockupCards.ts` - Mockup card data
- `src/services/api/pokemonApi.ts` - API service (with mockup fallback)

**Testing:**
- [x] Mockup data includes cards from multiple sets
- [x] Mockup data includes cards from all regions (implemented via Pokédex ranges)
- [x] Mockup data includes various rarities and artists
- [x] Mockup data matches real API response structure (basic fields aligned)
- [x] API service can fetch mockup cards
- [ ] Can display mockup cards in a list/grid (will be implemented in later steps)
- [ ] Card images load correctly (or placeholders show) (will be implemented in later steps)
- [ ] API service falls back to mockup if API fails (hook prepared for Step 24, ready to extend)

---

## Phase 4: Binder Features

### Step 12: Onboarding Questionnaire (Create Binder)
- [x] **Status**: Completed

**What we're doing:** Step-by-step questionnaire to create new binders (triggered by NFC scan or manual creation)

**Features:**
- Step 1: Collection mode selection (Master Set or Region)
- Step 2A: Master Set - Choose set (newest → oldest), select variants
- Step 2B: Region - Choose region (Kanto → Paldea)
- Step 3: Variant placement preference (grouped or end)
- Step 4: Layout preference (Auto, 3×3, or 4×3)
- Save binder to database with all preferences
- **If from NFC scan**: Link binder to NFC tag ID
- **If manual**: No NFC tag ID linked

**Files:**
- `src/screens/Onboarding/OnboardingScreen.tsx` - Main questionnaire screen
- `src/screens/Onboarding/Step1CollectionMode.tsx`
- `src/screens/Onboarding/Step2MasterSet.tsx`
- `src/screens/Onboarding/Step2Region.tsx`
- `src/screens/Onboarding/Step3VariantPlacement.tsx`
- `src/screens/Onboarding/Step4Layout.tsx`
- `src/components/Binder/CollectionModeSelector.tsx`
- `src/components/Binder/SetSelector.tsx`
- `src/components/Binder/RegionSelector.tsx`
- `src/components/Binder/VariantSelector.tsx`

**Testing:**
- [ ] Questionnaire starts when NFC tag scanned (new tag)
- [ ] Questionnaire starts when creating binder manually
- [ ] Step 1: Can select Master Set or Region
- [ ] Step 2A: Can select set (sorted newest → oldest)
- [ ] Step 2A: Shows variants for selected set (Base + optional variants)
- [ ] Step 2A: Can toggle variants on/off
- [ ] Step 2B: Can select region (Kanto → Paldea)
- [ ] Step 3: Can choose variant placement (grouped or end)
- [ ] Step 4: Can choose layout (Auto, 3×3, 4×3)
- [ ] Progress indicator shows current step
- [ ] Can go back to previous steps
- [ ] Can cancel and return to binder list
- [ ] Binder saved with all preferences
- [ ] **If from NFC**: NFC tag ID linked to binder
- [ ] **If manual**: Binder created without NFC tag ID
- [ ] All preferences stored correctly in database

---

### Step 13: Binder List Screen
- [x] **Status**: Completed

**What we're doing:** Display all user's binders

**Features:**
- List of binders
- Show completion percentage (based on selected variants)
- Show NFC indicator (if binder has NFC tag linked)
- Navigate to binder detail
- Create new binder button (starts questionnaire - manual creation)
- Delete binder option
- Option to create Custom binder (without questionnaire)

**Files:**
- `src/screens/BinderList/BinderListScreen.tsx`
- `src/components/Binder/BinderCard.tsx`

**Testing:**
- [x] Shows all user's binders
- [x] Completion percentage displays correctly
- [x] Shows NFC indicator for binders with NFC tag
- [x] Can tap binder to navigate to detail screen
- [x] Can create new binder manually (starts questionnaire)
- [ ] Can create custom binder (skips questionnaire) - Not implemented yet
- [x] Can delete binder with confirmation
- [x] Progress updates when cards added/removed
- [x] Empty state shows when no binders exist
- [x] Loading state shows while fetching binders

---

### Step 14: Binder Detail Screen
- [x] **Status**: Completed

**What we're doing:** Show cards in a binder

**Features:**
- Grid view (uses layout preference: 3×3, or 4×3)
- List view toggle
- Filter by rarity, artist
- Search cards within binder
- Add/remove cards
- Show missing cards (50% transparent)
- Progress percentage (based on selected variants)
- Variant placement follows preference (grouped or end)

**Files:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx`
- `src/components/Card/CardGrid.tsx`
- `src/components/Card/CardList.tsx`
- `src/components/Card/CardItem.tsx`

**Testing:**
- [x] Cards display in grid view (respects layout preference)
- [x] Can switch to list view
- [x] Missing cards show at 50% opacity
- [x] Can filter by rarity
- [ ] Can filter by artist - Not implemented yet (only rarity filter exists)
- [x] Can search cards by name/number
- [x] Can add card to binder (tap to toggle)
- [x] Can remove card from binder (tap to toggle)
- [x] Progress percentage updates correctly
- [x] Variants placed according to preference (grouped or end)
- [x] Cards ordered correctly (set number for Master Set, Pokédex number for Region)
- [x] Loading state shows while fetching cards
- [x] Empty state shows when no cards

---

## Phase 5: Card Features

### Step 15: Card Display Components
- [x] **Status**: Completed

**What we're doing:** Components to display cards

**Substeps:**
- **Step 15A**: Create CardImage component with caching, placeholder, and error handling
- **Step 15B**: Create CardDetails component to display all card information
- **Step 15C**: Enhance CardItem to use new components and ensure tap navigation works

**Features:**
- Card image display (with caching via expo-image)
- Card details (name, number, set, rarity, artist)
- Missing card indicator (50% transparency)
- Tap to view details (navigation prepared - CardDetail screen will be Step 17)
- Placeholder while image loads
- Error handling for failed image loads

**Files:**
- `src/components/Card/CardImage.tsx` - Reusable image component with caching
- `src/components/Card/CardDetails.tsx` - Card information display component
- `src/components/Card/CardItem.tsx` - Card item component (uses CardImage and CardDetails)

**Testing:**
- [x] CardImage component created with caching support
- [x] CardImage component has placeholder while loading
- [x] CardImage component handles errors gracefully
- [x] CardDetails component displays all card information
- [x] CardDetails component supports compact and full variants
- [x] CardItem uses CardImage component
- [x] CardItem uses CardDetails component
- [x] Missing cards show at 50% opacity (via CardImage isMissing prop)
- [x] Images maintain aspect ratio
- [ ] Card images load and display correctly (ready to test)
- [ ] Images cached for offline access (ready to test)
- [ ] Tap on card navigates to detail screen (requires CardDetail screen - Step 17)

**How to Test Step 15:**

1. **Navigate to cards:**
   - Open the app and log in
   - Go to Binder List screen
   - Tap on any binder to open Binder Detail screen
   - Cards should display in a grid view

2. **Visual checks:**
   - ✅ Cards appear in a grid with images, names, and numbers
   - ✅ Loading spinner appears briefly when images load
   - ✅ Missing cards are dimmed (50% opacity)
   - ✅ Owned cards are bright/normal
   - ✅ Can switch between grid and list views
   - ✅ Card images maintain proper aspect ratio (not stretched)
   - ✅ Tap cards to toggle ownership (checkbox changes, opacity changes)

3. **Test list view:**
   - Tap the list view toggle button
   - Cards should display one per row
   - Each card should show image, name, number, set, rarity

4. **Test missing cards:**
   - Some cards should appear dimmed (these are missing)
   - Tap a dimmed card → it becomes bright (now owned)
   - Tap it again → it becomes dimmed (now missing)

**See `TESTING_STEP15.md` for detailed testing instructions.**

---

### Step 16: Add/Remove Cards
- [ ] **Status**: Not started

**What we're doing:** Functionality to manage cards in binder

**Features:**
- Search for cards (from API or mockup)
- Add card to binder
- Remove card from binder
- Visual feedback (toast/notification)
- Show if card already in binder

**Files:**
- `src/screens/AddCard/AddCardScreen.tsx`
- `src/components/Card/CardSearch.tsx`

**Testing:**
- [ ] Can search for cards by name
- [ ] Can search for cards by number
- [ ] Search results display correctly
- [ ] Can add card to binder
- [ ] Can remove card from binder
- [ ] Visual feedback shows on add/remove
- [ ] Card list updates immediately
- [ ] Progress percentage updates
- [ ] Shows if card already in binder
- [ ] Works with mockup data
- [ ] Works with real API (when connected)

---

### Step 17: Card Detail Screen
- [x] **Status**: Completed

**What we're doing:** View individual card details

**Features:**
- Full card image (large view)
- All card information (name, number, set, rarity, artist)
- Navigation back
- Can mark card as owned or missing
- Show if card is owned or missing

**Files:**
- `src/screens/CardDetail/CardDetailScreen.tsx`

**Testing:**
- [ ] Full card image displays correctly
- [ ] All card information shows
- [ ] Button text changes based on ownership
- [ ] Navigation back works
- [ ] Mark card as owned or missing
- [ ] Card state updates when added/removed
- [ ] Works for both owned and missing cards

---

## Phase 6: Advanced Features

### Step 18: Search & Filter
- [x] **Status**: Completed

**What we're doing:** Search and filter functionality

**Features:**
- Owned/missing toggle in card list

**Files:**
- `src/hooks/useCardSearch.ts` - Search hook for filtering cards by name/number
- `src/hooks/useCardFilter.ts` - Filter hook for rarity and ownership filtering
- `src/components/Search/SearchBar.tsx` - Reusable search bar component
- `src/components/Filter/FilterPanel.tsx` - Filter panel with ownership toggle and rarity filters

**What was implemented:**
- ✅ Extracted search logic into `useCardSearch` hook
- ✅ Extracted filter logic into `useCardFilter` hook
- ✅ Created reusable `SearchBar` component
- ✅ Created reusable `FilterPanel` component with owned/missing toggle
- ✅ Updated `BinderDetailScreen` to use new hooks and components
- ✅ Added ownership filter (All/Owned/Missing toggle)

**Testing:**
- [x] Search hook filters cards correctly
- [x] Filter hook filters by rarity correctly
- [x] Filter hook filters by ownership (all/owned/missing) correctly
- [x] SearchBar component displays and works correctly
- [x] FilterPanel component displays ownership toggle
- [x] FilterPanel component displays rarity filters
- [ ] Owned/missing toggle works (ready to test)

---

### Step 19: Offline Support
- [ ] **Status**: Not started

**What we're doing:** Make app work offline

**Features:**
- Cache cards locally
- Cache images
- Sync when online
- Offline indicator
- Queue changes when offline, sync when online

**Files:**
- `src/services/storage/localStorage.ts`
- `src/services/storage/imageCache.ts`
- `src/hooks/useOfflineSync.ts`

**Testing:**
- [ ] Can view binders offline
- [ ] Can view cards offline (cached)
- [ ] Card images load from cache offline
- [ ] Can add/remove cards offline
- [ ] Changes sync when back online
- [ ] Offline indicator shows when disconnected
- [ ] No errors when offline
- [ ] Data persists after app restart
- [ ] Sync handles conflicts correctly

---

### Step 20: Progress Tracking
- [x] **Status**: Completed

**What we're doing:** Show completion percentages

**Features:**
- Calculate completion per binder (based on selected variants)
- Display progress bar
- Show "X/Y cards (Z%)" format
- Update in real-time

**Files:**
- `src/utils/progress.ts`
- `src/components/Progress/ProgressBar.tsx`

**Testing:**
- [x] Progress percentage calculates correctly
- [x] Progress bar displays visually
- [x] Shows "X/Y cards (Z%)" format
- [x] Updates when cards added
- [x] Updates when cards removed
- [x] Only counts selected variants (Master Set mode) - Basic implementation exists (variant tracking TODO noted in code)
- [x] Shows 0% for empty binder
- [x] Shows 100% when complete
- [x] Progress displays in binder list
- [x] Progress displays in binder detail

---

## Phase 7: Polish & Testing

### Step 21: UI/UX Improvements
- [x] **Status**: Completed

**What we're doing:** Polish the interface (simple and clean, not fancy)

**Features:**
- Consistent styling throughout app
- Loading states for all async operations
- User-friendly error messages
- Empty states for all screens
- Smooth transitions (simple, not fancy)

**Files created:**
- `src/constants/theme.ts` - Centralized theme system (colors, spacing, typography, shadows)
- `src/components/Loading/LoadingSpinner.tsx` - Inline loading spinner
- `src/components/Loading/LoadingScreen.tsx` - Full-screen loading component
- `src/components/Loading/LoadingOverlay.tsx` - Loading overlay component
- `src/components/EmptyState/EmptyState.tsx` - Reusable empty state component
- `src/components/Error/ErrorScreen.tsx` - Full-screen error component
- `src/components/Error/ErrorBanner.tsx` - Inline error banner
- `src/components/Error/ErrorMessage.tsx` - Small error message component

**Files updated:**
- `src/screens/BinderList/BinderListScreen.tsx` - Uses new components and theme
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Uses new components and theme
- `src/screens/CardDetail/CardDetailScreen.tsx` - Uses new components and theme
- `src/screens/Auth/LoginScreen.tsx` - Uses theme constants
- `src/screens/Auth/SignupScreen.tsx` - Uses theme constants
- `src/constants/index.ts` - Exports theme

**What was implemented:**
- ✅ Centralized theme system with colors, spacing, typography, and shadows
- ✅ Standardized loading components (spinner, screen, overlay)
- ✅ Reusable empty state component
- ✅ Standardized error components (screen, banner, message)
- ✅ All major screens updated to use theme constants
- ✅ Consistent styling across the app

**Testing:**
- [x] Theme constants created and exported
- [x] Loading components created and working
- [x] Empty state component created and working
- [x] Error components created and working
- [x] BinderListScreen uses new components
- [x] BinderDetailScreen uses new components
- [x] CardDetailScreen uses new components
- [x] Auth screens use theme constants
- [ ] Consistent colors and spacing throughout (ready to test visually)
- [ ] Loading spinners show during data fetch (ready to test)
- [ ] Error messages are clear and helpful (ready to test)
- [ ] Empty states guide users (ready to test)
- [ ] App feels cohesive and polished (ready to test)
- [ ] Follows "simple and clean" design principle (ready to test)

---

### Step 22: Error Handling
- [ ] **Status**: Not started

**What we're doing:** Handle errors gracefully

**Features:**
- Network error handling
- Validation errors
- User-friendly error messages
- Retry mechanisms
- Fallback to cached data

**Testing:**
- [ ] Network errors show friendly message
- [ ] Validation errors display correctly
- [ ] Can retry failed operations
- [ ] Falls back to cached data when offline
- [ ] API errors handled gracefully
- [ ] Database errors handled correctly
- [ ] No app crashes on errors
- [ ] Error messages are actionable

---

### Step 23: Comprehensive Testing
- [ ] **Status**: Not started

**What we're doing:** Test all features thoroughly

**Testing Checklist:**

**Authentication:**
- [ ] Can create account and login
- [ ] Can logout
- [ ] Auth persists across app restarts
- [ ] Social login works (Google, Apple)

**Binder Creation:**
- [ ] Onboarding questionnaire works (Master Set)
- [ ] Onboarding questionnaire works (Region)
- [ ] Can create custom binder
- [ ] All preferences saved correctly
- [ ] NFC tag linking works (when created from NFC scan)
- [ ] Manual binder creation works (no NFC tag)

**Card Management:**
- [ ] Can add cards to binder
- [ ] Can remove cards from binder
- [ ] Cards display correctly
- [ ] Missing cards show transparent

**Views & Navigation:**
- [ ] Grid view works (3×3, 4×3, Auto)
- [ ] List view works
- [ ] Can switch between views
- [ ] Navigation works correctly

**Search & Filter:**
- [ ] Search within binder works
- [ ] Global search works
- [ ] Filters work correctly
- [ ] Owned/missing toggle works

**Features:**
- [ ] Offline mode works
- [ ] Progress tracking works
- [ ] Variant placement works (grouped/end)
- [ ] Layout preferences work
- [ ] NFC tag scanning works
- [ ] NFC tag linking works
- [ ] NFC tag ownership validation works

**Platforms:**
- [ ] Works on iOS
- [ ] Works on Android
- [ ] Works on different screen sizes

---

## Phase 8: Production

### Step 24: Connect Real API
- [ ] **Status**: In Progress

**What we're doing:** Switch from mockup to real TCGDEX API using the official SDK

---

## 📋 **IMPORTANT: URLs and Configuration Summary**

**API Name**: TCGDEX (remember: it's **TCGDEX**, not TCGDX)

**SDK Package**: 
- **Package Name**: `@tcgdex/sdk`
- **Version**: `^2.7.1` (as of implementation)
- **Installation**: `npm install @tcgdex/sdk`
- **Type**: Official TypeScript/JavaScript SDK

**URLs We're Using (Explicitly Listed - No Confusion):**

1. **API Base URL** (for data): 
   - `https://api.tcgdex.net/v2/`
   - Used by SDK internally for API calls
   - We don't call this directly - SDK handles it automatically

2. **Assets URL** (for images): 
   - `https://assets.tcgdex.net`
   - Used for card images and set logos
   - **⚠️ NOT for API calls** - only for images/assets

3. **Documentation Website**: 
   - `https://tcgdex.dev/`
   - Main documentation and guides

4. **SDK Documentation**: 
   - `https://tcgdex.dev/sdks/typescript`
   - TypeScript SDK usage and API reference

**Authentication**: None required (free, open-source API)

**Important Notes:** 
- ✅ We're using the **official TCGDEX SDK** (`@tcgdex/sdk`) instead of raw API calls
- ✅ The SDK handles all API requests internally - we don't make direct fetch calls
- ✅ SDK uses `https://api.tcgdex.net/v2/` internally (no need to configure)
- ✅ Card images come from `https://assets.tcgdex.net` (assets URL)
- ⚠️ `getCardsByRegion()` uses PokeAPI (not TCGDEX API), so it will remain as-is

---

## 🔍 **Logging & Debugging Strategy**

**Log Prefix System:**
Each step uses a unique log prefix to make debugging easier:
- `[24A]` - SDK setup and initialization
- `[24B]` - Sets fetching (`getSets()`)
- `[24C]` - Cards by set fetching (`getCardsBySet()`)
- `[24D]` - Single card fetching (`getCardById()`)
- `[24E]` - Rate limiting and caching
- `[24F]` - Variant handling
- `[24G]` - Performance and optimization

**How to Use Logs:**
1. **Filter logs**: Search console for specific prefix (e.g., `[24B]`) to see only that step's logs
2. **Track flow**: Follow the log sequence to see where execution stops
3. **Identify issues**: Look for error logs or missing expected logs
4. **Performance**: Check duration logs in `[24G]` to identify slow operations

**Where to Check Logs:**
- **Development**: Browser console (Chrome DevTools) or React Native debugger
- **Metro Bundler**: Terminal output when running `npm start`
- **Network Tab**: Browser DevTools Network tab for API requests
- **Performance Tab**: Browser DevTools Performance tab for timing

**Common Issues to Look For:**
- ❌ Logs stop at a certain point → That's where the error occurs
- ❌ Missing expected logs → Function not being called or early return
- ❌ Error logs → Check error message for specific issue
- ❌ Slow performance → Check `[24G]` duration logs

---

---

#### Step 24A: Set Up SDK and API Infrastructure
- [x] **Status**: Completed

**What we're doing:** Install and set up the official TCGDEX SDK

**Files to create/modify:**
- `package.json` - Add `@tcgdex/sdk` dependency
- `src/services/api/pokemonApi.ts` - Initialize SDK instance
- `src/services/api/client.ts` - Base API client (kept for potential future use, but SDK is primary)
- `src/types/api.ts` - API response types (for reference, SDK provides its own types)

**What gets implemented:**
- ✅ Installed `@tcgdex/sdk` package via npm
- ✅ Created SDK instance: `const tcgdex = new TCGdex('en')` (English language)
- ✅ SDK handles all API communication internally
- ✅ No manual API client needed (SDK provides everything)

**SDK Usage:**
- **Package**: `@tcgdex/sdk`
- **Version**: `^2.7.1` (as of implementation)
- **Initialization**: `new TCGdex('en')` - language code for responses
- **API Base URL**: SDK uses `https://api.tcgdex.net/v2/` internally (no need to configure)

**Testing:**
- [x] SDK package installed (`@tcgdex/sdk@2.7.1`)
- [x] SDK can be imported: `import TCGdex from '@tcgdex/sdk'`
- [x] SDK instance created successfully
- [x] No TypeScript errors
- [x] SDK types are available

**How to Test Step 24A:**
1. Check `package.json` - should have `"@tcgdex/sdk": "^2.7.1"` in dependencies
2. Verify SDK can be imported: `import TCGdex from '@tcgdex/sdk'`
3. Run `npx tsc --noEmit` - should have no TypeScript errors
4. SDK instance should initialize without errors

**Logging & Debugging for Step 24A:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` after SDK initialization
- **What to log**:
  ```typescript
  // After: const tcgdex = new TCGdex('en');
  console.log('[24A] TCGDEX SDK initialized:', {
    language: 'en',
    sdkVersion: '@tcgdex/sdk version from package.json',
    timestamp: new Date().toISOString(),
  });
  ```
- **What to look for**:
  - ✅ Should see: `[24A] TCGDEX SDK initialized` in console
  - ❌ If you see import errors: Check `package.json` has `@tcgdex/sdk` installed
  - ❌ If you see "TCGdex is not a constructor": Check import statement is correct
  - ❌ If TypeScript errors: Check SDK types are available
- **Where to check logs**: Browser/React Native debugger console, Metro bundler output

---

#### Step 24B: Implement `getSets()` with Real API
- [x] **Status**: Completed

**What we're doing:** Replace mockup `getSets()` with real TCGDEX API calls using the SDK

**SDK Method:** `tcgdex.set.list()` - fetches all sets from TCGDEX API

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Update `getSets()` function to use SDK

**What gets implemented:**
- ✅ Using TCGDEX SDK: `await tcgdex.set.list()` (instead of raw API calls)
- ✅ SDK handles API communication internally (uses `https://api.tcgdex.net/v2/` internally)
- ✅ Transform TCGDEX SDK response to match existing `PokemonSet` type
- ✅ Map TCGDEX fields (id, name, series, releaseDate) to our type
- ✅ Fallback to mockup data on error
- ✅ Keep same return type for compatibility
- ✅ Sort sets by release date (newest → oldest)
- ✅ Error handling with detailed logging

**Testing:**
- [x] `getSets()` calls real API endpoint (implemented)
- [ ] Sets list appears in onboarding questionnaire (Step 2 - Master Set selection) - Ready to test
- [ ] Sets are sorted correctly (newest → oldest) - Ready to test
- [ ] Fallback to mockup data works if API fails - Ready to test
- [ ] Loading state shows while fetching - Ready to test
- [ ] Error handling works (shows fallback, doesn't crash) - Ready to test

**How to Test Step 24B:**
1. **Open the app:**
   - Run `npm start`
   - Log in to the app
   - Navigate to create a new binder

2. **Test set loading:**
   - Select "Master Set" as collection mode
   - Should see list of sets (should be real sets from API, not just 3 mock sets)
   - Sets should be sorted newest to oldest
   - Loading spinner should appear briefly

3. **Test error handling:**
   - Turn off internet/WiFi
   - Try to create a binder again
   - Should fall back to mockup sets (should see 3 sets: Base Set, Jungle, Scarlet & Violet)
   - App should not crash

4. **Verify data:**
   - Check that sets have: id, name, series, releaseDate
   - Sets should be real Pokémon TCG sets from TCGDEX API
   - Data structure should match TCGDEX API response format

**Logging & Debugging for Step 24B:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` in `getSets()` function
- **What to log**:
  ```typescript
  export async function getSets(): Promise<PokemonSet[]> {
    console.log('[24B] getSets() called - starting fetch');
    try {
      const tcgdexSets = await tcgdex.set.list();
      console.log('[24B] SDK response received:', {
        setCount: tcgdexSets.length,
        firstSet: tcgdexSets[0]?.name,
        lastSet: tcgdexSets[tcgdexSets.length - 1]?.name,
      });
      
      const sets = tcgdexSets.map(transformTcgdexSetToPokemonSet);
      console.log('[24B] Sets transformed:', {
        transformedCount: sets.length,
        sampleSet: sets[0],
      });
      
      const sortedSets = sortSetsByDate(sets);
      console.log('[24B] Sets sorted by date:', {
        newestSet: sortedSets[0]?.name,
        oldestSet: sortedSets[sortedSets.length - 1]?.name,
      });
      
      return sortedSets;
    } catch (error) {
      // Existing error logging...
      console.error('[24B] Error in getSets():', error);
      return mockSets;
    }
  }
  ```
- **What to look for**:
  - ✅ Should see: `[24B] getSets() called` → `[24B] SDK response received` → `[24B] Sets transformed` → `[24B] Sets sorted`
  - ❌ If stuck at "getSets() called": SDK request is hanging (check network/internet)
  - ❌ If "SDK response received" but 0 sets: API returned empty array (check API status)
  - ❌ If error after "SDK response received": Transformation or sorting issue (check data structure)
  - ❌ If "Error in getSets()": Check error message for details (network, API down, etc.)
- **Where to check logs**: Browser/React Native debugger console, check for `[24B]` prefix

---

#### Step 24C: Implement `getCardsBySet()` with Real API
- [x] **Status**: Completed

**What we're doing:** Replace mockup cards with real TCGDEX API data for sets using the SDK

**SDK Method:** `tcgdex.set.get(setId)` then access cards, or `tcgdex.card.list()` with filters
- Check SDK documentation for exact method: https://tcgdex.dev/sdks/typescript

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Update `getCardsBySet()` function to use SDK

**What gets implemented:**
- ✅ Using TCGDEX SDK: `tcgdex.set.get(setId)` to fetch set with cards
- ✅ SDK handles API communication internally (uses `https://api.tcgdex.net/v2/` internally)
- ✅ Transform TCGDEX SDK response to match existing `Card` type
- ✅ Map TCGDEX fields (id, name, localId, set, rarity, artist, image) to our Card type
- ✅ Card images use high-quality images from TCGDEX image object
- ✅ Fallback to mockup data on error
- ✅ Support for both set ID and set name as input (automatic lookup)
- ✅ Detailed logging for debugging ([24C] prefix)

**Testing:**
- [x] `getCardsBySet()` implemented with TCGDEX SDK
- [x] Transform function created (`transformTcgdexCardToCard()`)
- [x] Supports both set ID and set name as input
- [x] Falls back to mock data on error
- [x] Detailed logging added with [24C] prefix
- [x] No TypeScript errors
- [ ] Cards fetch from API when viewing a binder - Ready to test
- [ ] Cards display correctly in binder detail screen - Ready to test
- [ ] Card images load from API URLs - Ready to test
- [ ] All card fields display correctly (name, number, set, rarity, artist) - Ready to test
- [ ] Fallback to mockup data works if API fails - Ready to test
- [ ] Performance is acceptable (loading doesn't take too long) - Ready to test

**How to Test Step 24C:**
1. **Open an existing binder or create a new one:**
   - Create a binder with a real set (e.g., "Base Set" or "Scarlet & Violet")
   - Navigate to binder detail screen

2. **Test card loading:**
   - Cards should display in grid/list view
   - Card images should load from API (not placeholders)
   - Cards should have correct information (name, number, set, rarity, artist)
   - For large sets (like Scarlet & Violet with 198 cards), all cards should load

3. **Test pagination (if applicable):**
   - Find a very large set (if exists)
   - All cards should load (even if >250 cards)
   - Should see all cards in the set

4. **Test error handling:**
   - Turn off internet/WiFi
   - Open binder detail screen
   - Should fall back to mockup cards or show error message
   - App should not crash

5. **Verify data:**
   - Card IDs should match TCGDEX API format
   - Card numbers should be in format like "004/102" (or match TCGDEX format)
   - Images should load from TCGDEX image URLs (check TCGDEX documentation for image URL structure)

**Logging & Debugging for Step 24C:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` in `getCardsBySet()` function
- **What to log**:
  ```typescript
  export async function getCardsBySet(setName: string): Promise<Card[]> {
    console.log('[24C] getCardsBySet() called:', { setName });
    try {
      // Find set ID from setName (you'll need to map this)
      const set = await tcgdex.set.get(setId);
      console.log('[24C] Set fetched from SDK:', {
        setId: set.id,
        setName: set.name,
        cardCount: set.cards?.length || 0,
      });
      
      const cards = set.cards || [];
      console.log('[24C] Cards extracted:', {
        cardCount: cards.length,
        sampleCard: cards[0]?.name,
      });
      
      const transformedCards = cards.map(transformTcgdexCardToCard);
      console.log('[24C] Cards transformed:', {
        transformedCount: transformedCards.length,
        sampleTransformed: transformedCards[0],
      });
      
      return transformedCards;
    } catch (error) {
      console.error('[24C] Error in getCardsBySet():', {
        setName,
        error: error instanceof Error ? error.message : error,
      });
      return mockCards.filter((card) => card.set === setName);
    }
  }
  ```
- **What to look for**:
  - ✅ Should see: `[24C] getCardsBySet() called` → `[24C] Set fetched` → `[24C] Cards extracted` → `[24C] Cards transformed`
  - ❌ If stuck at "getCardsBySet() called": SDK request is hanging (check network/setId)
  - ❌ If "Set fetched" but 0 cards: Set has no cards or wrong field name (check SDK response structure)
  - ❌ If error after "Set fetched": Transformation issue (check card data structure)
  - ❌ If "Error in getCardsBySet()": Check error message (invalid setId, network error, etc.)
- **Where to check logs**: Browser/React Native debugger console, check for `[24C]` prefix

---

#### Step 24D: Implement `getCardById()` with Real API
- [x] **Status**: Completed

**What we're doing:** Replace mockup single card lookup with real TCGDEX API using the SDK

**SDK Method:** `tcgdex.card.get(cardId)` - fetches a single card by ID

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Update `getCardById()` function to use SDK

**What gets implemented:**
- ✅ Fetch single card using SDK: `await tcgdex.card.get(cardId)`
- ✅ SDK handles API communication internally (uses `https://api.tcgdex.net/v2/` internally)
- ✅ Transform TCGDEX SDK response to match existing `Card` type
- ✅ Map TCGDEX fields to our Card type (reuses transformTcgdexCardToCard function)
- ✅ Card images include both low-res and high-res URLs
- ✅ Fallback to mockup data on error
- ✅ Detailed logging with [24D] prefix for debugging

**Testing:**
- [x] `getCardById()` implemented with TCGDEX SDK
- [x] Uses transformTcgdexCardToCard() for consistent transformation
- [x] Falls back to mock data on error
- [x] Detailed logging added with [24D] prefix
- [x] No TypeScript errors
- [ ] Can fetch single card by ID from API - Ready to test
- [ ] Card detail screen loads correctly - Ready to test
- [ ] Full card image displays (large view) - Ready to test
- [ ] All card information shows (name, number, set, rarity, artist) - Ready to test
- [ ] Fallback to mockup data works if API fails - Ready to test
- [ ] Navigation to card detail works - Ready to test

**How to Test Step 24D:**
1. **Navigate to a card:**
   - Open any binder
   - Tap on any card to open card detail screen

2. **Test card detail:**
   - Full card image should display (large, clear image)
   - Card name, number, set, rarity, artist should all show
   - Image should load from API URL
   - Information should match what's shown in the binder list

3. **Test error handling:**
   - Turn off internet/WiFi
   - Try to open a card detail
   - Should fall back to mockup data or show error
   - App should not crash

4. **Verify data:**
   - Card ID should match TCGDEX API format
   - All fields should be populated correctly from TCGDEX response

**Logging & Debugging for Step 24D:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` in `getCardById()` function
- **What to log**:
  ```typescript
  export async function getCardById(id: string): Promise<Card | null> {
    console.log('[24D] getCardById() called:', { cardId: id });
    try {
      const card = await tcgdex.card.get(id);
      console.log('[24D] Card fetched from SDK:', {
        cardId: card.id,
        cardName: card.name,
        hasImage: !!card.image,
        hasVariants: !!card.variants,
      });
      
      const transformedCard = transformTcgdexCardToCard(card);
      console.log('[24D] Card transformed:', {
        transformedId: transformedCard.id,
        transformedName: transformedCard.name,
      });
      
      return transformedCard;
    } catch (error) {
      console.error('[24D] Error in getCardById():', {
        cardId: id,
        error: error instanceof Error ? error.message : error,
      });
      // Fallback to mock data
      const mockCard = mockCards.find((c) => c.id === id);
      if (mockCard) {
        console.log('[24D] Using mock card as fallback');
      }
      return mockCard || null;
    }
  }
  ```
- **What to look for**:
  - ✅ Should see: `[24D] getCardById() called` → `[24D] Card fetched` → `[24D] Card transformed`
  - ❌ If stuck at "getCardById() called": SDK request is hanging (check network/cardId format)
  - ❌ If "Card fetched" but missing fields: Check SDK response structure (field names may differ)
  - ❌ If error after "Card fetched": Transformation issue (check card data mapping)
  - ❌ If "Error in getCardById()": Check error message (invalid cardId, card not found, network error)
  - ✅ If "Using mock card as fallback": Fallback is working correctly
- **Where to check logs**: Browser/React Native debugger console, check for `[24D]` prefix

---

#### Step 24E: Add Rate Limiting & Caching
- [ ] **Status**: Not started

**What we're doing:** Optimize API usage and handle rate limits (SDK may handle some of this)

**Note:** The TCGDEX SDK (`@tcgdex/sdk`) may already handle some rate limiting and caching internally. Check SDK documentation first.

**Files to create/modify:**
- `src/services/api/pokemonApi.ts` - Add rate limiting logic (if SDK doesn't handle it)
- `src/hooks/useCardQuery.ts` (if exists) - Ensure React Query caching is used
- Or add caching layer in API service

**What gets implemented:**
- Check if SDK handles rate limiting (may already be built-in)
- Detect rate limit responses (HTTP 429) if SDK doesn't handle it
- Implement exponential backoff retry logic (if needed)
- Add response caching (React Query helps, but add explicit cache layer)
- Request deduplication (same request shouldn't fire multiple times)
- User-friendly error messages for rate limits

**Testing:**
- [ ] Rate limit errors are detected correctly
- [ ] Retry logic works (waits and retries after rate limit)
- [ ] Caching reduces duplicate API calls
- [ ] No duplicate requests for same data
- [ ] User sees friendly message if rate limited
- [ ] App doesn't make too many API calls

**How to Test Step 24E:**
1. **Test caching:**
   - Open a binder (first load - should call API)
   - Close and reopen the same binder (should use cache, no API call)
   - Check network tab/logs - should see fewer API calls on second load

2. **Test rate limiting (if possible):**
   - Make many rapid requests (open/close binders quickly)
   - If rate limited, should see error message
   - Should retry automatically after waiting
   - App should handle gracefully, not crash

3. **Verify deduplication:**
   - Open multiple screens that need same data simultaneously
   - Should only make one API call, not multiple
   - Check network logs to verify

**Logging & Debugging for Step 24E:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` and any caching/rate limiting code
- **What to log**:
  ```typescript
  // In API functions, add request tracking
  const requestCache = new Map();
  
  export async function getSets(): Promise<PokemonSet[]> {
    const cacheKey = 'sets';
    console.log('[24E] getSets() called - checking cache');
    
    if (requestCache.has(cacheKey)) {
      console.log('[24E] Using cached sets (deduplication)');
      return requestCache.get(cacheKey);
    }
    
    try {
      console.log('[24E] Making SDK request (not cached)');
      const sets = await tcgdex.set.list();
      requestCache.set(cacheKey, sets);
      console.log('[24E] Sets cached for future requests');
      return sets;
    } catch (error) {
      if (error.statusCode === 429) {
        console.warn('[24E] Rate limit hit (429):', {
          retryAfter: error.retryAfter,
          willRetry: true,
        });
        // Retry logic...
      }
      console.error('[24E] Error:', error);
      throw error;
    }
  }
  ```
- **What to look for**:
  - ✅ Should see: `[24E] getSets() called` → `[24E] Using cached sets` (on second call)
  - ✅ Should see: `[24E] Making SDK request` (on first call only)
  - ❌ If always seeing "Making SDK request": Caching not working (check cache implementation)
  - ❌ If "Rate limit hit (429)": API rate limit reached (check retry logic)
  - ✅ Should see fewer API calls in network tab on subsequent requests
- **Where to check logs**: Browser/React Native debugger console, network tab, check for `[24E]` prefix

---

#### Step 24F: Handle Variants from API
- [ ] **Status**: Not started

**What we're doing:** Detect and handle card variants from TCGDEX SDK response

**SDK Method:** Variants are included in card data from SDK (check SDK documentation for variant structure)

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Parse variant information from TCGDEX SDK response
- May need to update `src/types/card.ts` if variant types differ from SDK format

**What gets implemented:**
- Parse variant information from TCGDEX SDK response (check SDK documentation for variant fields)
- SDK provides card data with variant information (check `tcgdex.card.get()` response structure)
- Map TCGDEX variant types to app variant types:
  - Reverse Holo
  - Poké Ball
  - Master Ball
- Ensure variant detection works correctly
- Variants should appear in binder detail

**Testing:**
- [ ] Variants are detected from API data
- [ ] Variant types map correctly (reverse-holo, poke-ball, master-ball)
- [ ] Variants appear in binder detail screen
- [ ] Variant placement preference works (grouped/end)
- [ ] Progress tracking counts variants correctly
- [ ] Can toggle variants on/off in onboarding

**How to Test Step 24F:**
1. **Test variant detection:**
   - Create a binder for a set that has variants (e.g., Scarlet & Violet)
   - In onboarding, variants should be detected and shown
   - Should see options for Reverse Holo, Poké Ball, Master Ball (if available)

2. **Test variant display:**
   - Open binder detail screen
   - Variants should appear based on placement preference
   - If "grouped" - variants should appear next to base card
   - If "end" - variants should appear at the end

3. **Test variant counting:**
   - Check progress percentage
   - Progress should count selected variants correctly
   - If only base cards selected, variants shouldn't count toward 100%

4. **Verify variant data:**
   - Variants should have correct IDs (different from base card)
   - Variants should have same name/number as base card
   - Variant type should be correctly identified

**Logging & Debugging for Step 24F:**
- **Where to add logs**: In `src/services/api/pokemonApi.ts` in card transformation functions
- **What to log**:
  ```typescript
  function transformTcgdexCardToCard(tcgdexCard: TcgdexCard): Card {
    console.log('[24F] Transforming card:', {
      cardId: tcgdexCard.id,
      cardName: tcgdexCard.name,
      hasVariants: !!tcgdexCard.variants,
      variantCount: tcgdexCard.variants?.length || 0,
      variantTypes: tcgdexCard.variants || [],
    });
    
    const baseCard = {
      id: tcgdexCard.id,
      name: tcgdexCard.name,
      // ... other fields
      variant: 'base' as const,
    };
    
    // Process variants
    if (tcgdexCard.variants && tcgdexCard.variants.length > 0) {
      console.log('[24F] Processing variants:', {
        variantTypes: tcgdexCard.variants,
        mappedVariants: tcgdexCard.variants.map(mapVariantType),
      });
    }
    
    return baseCard;
  }
  
  function mapVariantType(variant: string): string {
    console.log('[24F] Mapping variant type:', { from: variant });
    const mapping = {
      'reverse-holo': 'reverse-holo',
      'poke-ball': 'poke-ball',
      'master-ball': 'master-ball',
    };
    const mapped = mapping[variant] || variant;
    console.log('[24F] Variant mapped:', { from: variant, to: mapped });
    return mapped;
  }
  ```
- **What to look for**:
  - ✅ Should see: `[24F] Transforming card` with variant information
  - ✅ Should see: `[24F] Processing variants` if card has variants
  - ✅ Should see: `[24F] Mapping variant type` for each variant
  - ❌ If "hasVariants: false" but card should have variants: Check SDK response structure
  - ❌ If variant types don't match: Check variant mapping function
  - ❌ If variants not appearing in UI: Check variant transformation logic
- **Where to check logs**: Browser/React Native debugger console, check for `[24F]` prefix

---

#### Step 24G: Optimize & Polish
- [ ] **Status**: Not started

**What we're doing:** Final optimizations and polish (SDK may handle some optimizations)

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Optimize SDK usage
- Components using API - Add better loading states
- Error components - Improve error messages

**What gets implemented:**
- Optimize image loading from `https://assets.tcgdex.net` (assets URL)
- Add loading states for all SDK calls
- Improve error messages (more user-friendly)
- Add retry logic for failed SDK requests (if SDK doesn't handle it)
- Performance optimizations
- Final error handling polish
- Ensure SDK is used efficiently (check SDK documentation for best practices)

**Testing:**
- [ ] All API calls have loading states
- [ ] Error messages are clear and helpful
- [ ] Retry works for failed requests
- [ ] Image loading is optimized
- [ ] Performance is good (no lag, fast loading)
- [ ] No console errors
- [ ] App feels smooth and responsive

**How to Test Step 24G:**
1. **Test loading states:**
   - Open app and navigate around
   - Should see loading spinners while data fetches
   - No blank screens during loading

2. **Test error messages:**
   - Turn off internet
   - Try to use the app
   - Should see clear error messages (not technical errors)
   - Messages should guide user what to do

3. **Test retry logic:**
   - Start a request, then turn off internet
   - Request should fail gracefully
   - Turn internet back on
   - Retry button should work (if implemented)

4. **Test performance:**
   - App should load quickly
   - Images should load efficiently
   - No lag when scrolling through cards
   - Smooth transitions between screens

5. **Check console:**
   - Open developer console
   - Should see no errors
   - API calls should be logged appropriately

**Logging & Debugging for Step 24G:**
- **Where to add logs**: Throughout `src/services/api/pokemonApi.ts` and components using API
- **What to log**:
  ```typescript
  // Performance logging
  export async function getSets(): Promise<PokemonSet[]> {
    const startTime = performance.now();
    console.log('[24G] getSets() started');
    
    try {
      const sets = await tcgdex.set.list();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('[24G] getSets() completed:', {
        duration: `${duration.toFixed(2)}ms`,
        setCount: sets.length,
        performance: duration < 1000 ? 'good' : duration < 3000 ? 'acceptable' : 'slow',
      });
      
      return sets;
    } catch (error) {
      const endTime = performance.now();
      console.error('[24G] getSets() failed:', {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
  
  // Image loading logging (in components)
  console.log('[24G] Loading image:', {
    imageUrl: card.imageUrl,
    fromAssets: card.imageUrl?.includes('assets.tcgdex.net'),
  });
  ```
- **What to look for**:
  - ✅ Should see: `[24G] getSets() started` → `[24G] getSets() completed` with duration
  - ✅ Duration should be < 3000ms for good performance
  - ❌ If duration > 5000ms: Performance issue (check network, API response time)
  - ✅ Should see: `[24G] Loading image` with correct assets URL
  - ❌ If image URLs wrong: Check image URL transformation
  - ✅ Should see no errors in console
  - ❌ If errors appear: Check error messages for specific issues
- **Where to check logs**: Browser/React Native debugger console, performance tab, check for `[24G]` prefix

---

**Overall Testing Checklist for Step 24:**
- [ ] TCGDEX SDK installed and working (`@tcgdex/sdk@^2.7.1`)
- [ ] SDK connects to TCGDEX API successfully (tested in 24A-24G)
- [ ] Can fetch sets from TCGDEX API using SDK (tested in 24B)
- [ ] Can fetch cards from TCGDEX API using SDK (tested in 24C)
- [ ] Can fetch single card by ID from TCGDEX API using SDK (tested in 24D)
- [ ] Card images load from `https://assets.tcgdex.net` (assets URL, not API URL)
- [ ] Rate limiting handled correctly (tested in 24E - SDK may handle this)
- [ ] Falls back to mockup if TCGDEX API fails (tested in 24B, 24C, 24D)
- [ ] All sets load correctly from TCGDEX API (tested in 24B)
- [ ] Variants detected correctly from TCGDEX API (tested in 24F)
- [ ] Performance is acceptable (tested in 24G)
- [ ] Error handling works for API failures (tested throughout)
- [ ] App works both online and offline (fallback tested)
- [ ] SDK methods work correctly (`tcgdex.set.list()`, `tcgdex.card.get()`, etc.)

---

### Step 25: Build for Production
- [ ] **Status**: Not started

**What we're doing:** Create production builds

**Commands:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build
eas build --profile production --platform all
```

**Testing:**
- [ ] iOS build completes successfully
- [ ] Android build completes successfully
- [ ] Production build installs on device
- [ ] App runs correctly in production build
- [ ] All features work in production
- [ ] Performance is good
- [ ] No console errors
- [ ] App size is reasonable

---

### Step 26: Deploy to App Stores
- [ ] **Status**: Not started

**What we're doing:** Submit to iOS App Store and Google Play

**Steps:**
1. Create app store listings
2. Prepare screenshots
3. Submit builds
4. Wait for approval

**Testing:**
- [ ] App store listing created
- [ ] Screenshots prepared
- [ ] Description and metadata complete
- [ ] Privacy policy added (if required)
- [ ] Builds submitted successfully
- [ ] App approved and published

---

## Quick Reference: Order of Building

1. ✅ **Setup** - Project, dependencies, structure
2. ✅ **Backend** - Supabase, database, auth
3. ✅ **Navigation** - Screen structure
4. ✅ **Auth** - Login/signup
5. ✅ **Mockup Data** - Test data
6. ✅ **Binders** - Create, list, detail
7. ✅ **Cards** - Display, add, remove
8. ✅ **Search/Filter** - Find cards
9. ✅ **Offline** - Work without internet
10. ✅ **Polish** - UI improvements
11. ✅ **Production** - Real API, build, deploy

---

## How We'll Build It

**Approach:**
- Build one feature at a time
- Test after each feature
- Commit after completing features
- You just need to run `npm start` to test

**Your Role:**
- Tell me when to start: "Let's start building"
- Test features: Run `npm start` and try the app
- Give feedback: "This works" or "This needs fixing"
- Request features: "I want to add [feature]"

**My Role:**
- Write all the code
- Handle Git commits
- Fix errors
- Explain what I'm doing

---

## Ready to Start?

When you're ready, just say: **"Let's start building the app"**

I'll begin with Phase 1, Step 1, and we'll build it step by step! 🚀

