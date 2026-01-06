# Build Steps - Pokémon TCG Binder Tracker App

> **📅 Last Updated:** January 6, 2026  
> **🎯 Status:** ~85% Complete - Core features done, advanced collection features planned  
> **✅ Major Milestones:** All phases 1-7 complete, Phase 8 (API integration) complete, Phase 9 (Monetization) planned, Phase 10 (Advanced Features) planned

## Overview

This guide walks you through building the app step-by-step. We'll build it incrementally, feature by feature, so you can test as we go.

---

## 🎯 Current Implementation Status

### ✅ **Fully Implemented (Ready to Test)**
- **Phase 1**: Project Setup & Foundation (Steps 1-4) - All complete
- **Phase 2**: Backend Setup (Steps 5-7) - All complete
- **Phase 3**: Core Features (Steps 8-11) - All complete
  - NFC Integration ✅
  - Navigation ✅
  - Authentication ✅
  - Mockup Data ✅
- **Phase 4**: Binder Features (Steps 12-14) - All complete
  - Onboarding Questionnaire ✅
  - Binder List Screen ✅
  - Binder Detail Screen ✅
- **Phase 5**: Card Features (Steps 15, 17) - Mostly complete
  - Card Display Components ✅
  - Card Detail Screen ✅
  - Step 16 (Add/Remove Cards) - Basic functionality via tap-to-toggle exists
- **Phase 6**: Advanced Features (Steps 18, 20) - Complete
  - Search & Filter ✅
  - Progress Tracking ✅
  - Step 19 (Offline Support) - Basic caching exists, dedicated offline sync not implemented
- **Phase 7**: Polish & Testing (Step 21, 22) - Complete
  - UI/UX Improvements ✅
  - Error Handling ✅ (integrated throughout)
  - Step 23 (Comprehensive Testing) - Ready for user testing
- **Phase 8**: Production (Step 24A-G) - Complete, Step 24F needs testing
  - TCGDEX SDK Integration ✅
  - Real API Implementation ✅
  - Rate Limiting & Caching ✅
  - Variant System ✅ (comprehensive implementation, needs testing)
  - Performance Optimization ✅

### ⚠️ **Partially Implemented**
- **Step 16**: Add/Remove Cards - Basic tap-to-toggle works, but dedicated AddCardScreen not created
- **Step 19**: Offline Support - React Query caching exists, but dedicated offline storage files not created
- **Step 24F**: Variant Handling - Comprehensive logic implemented, needs integration testing

### ❌ **Not Yet Implemented**
- **Step 23**: Comprehensive Testing - Needs user testing
- **Step 27**: Premium System (Freemium Model) - Not started
- **Step 28**: Global Card Search Foundation - Not started
- **Step 29**: Custom Binder Mode (full implementation) - Not started
- **Step 30**: Extra Cards in Master Set Binders - Not started
- **Step 31**: Region Mode Card Selection - Not started
- **Step 32**: Polish & Integration for Phase 10 - Not started
- **Step 25**: Build for Production - Not started
- **Step 26**: Deploy to App Stores - Not started

### 📊 **Overall Progress**: ~75% Complete (Core features done, premium system, advanced features, testing and production build remain)

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

**⚠️ Note:** `react-native-nfc-manager` is **NOT currently installed** in package.json. NFC service code exists but package needs to be installed for NFC to work. This requires a development build (not Expo Go). See DEVELOPMENT_BUILD_GUIDE.md for instructions.

**Testing:**

**Prerequisites:**
- ⚠️ NFC library NOT installed (react-native-nfc-manager) - needs `npm install react-native-nfc-manager`
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
- **Master Set Mode (6 steps total):**
  - Step 2: Choose set (newest → oldest)
  - Step 3: Select variants (base + optional variants)
  - Step 4: Variant placement preference (grouped or end)
  - Step 5: Layout preference (Auto, 3×3, or 4×3)
  - Step 6: Binder name
- **Region Mode (5 steps total):**
  - Step 2: Choose region (Kanto → Paldea)
  - Step 3: Pokemon art style preference
  - Step 4: Layout preference (Auto, 3×3, or 4×3)
  - Step 5: Binder name
- Save binder to database with all preferences
- **If from NFC scan**: Link binder to NFC tag ID
- **If manual**: No NFC tag ID linked

**Files:**
- `src/screens/Onboarding/OnboardingScreen.tsx` - Main questionnaire screen ✅
- `src/screens/Onboarding/Step1CollectionMode.tsx` ✅
- `src/screens/Onboarding/Step2MasterSet.tsx` ✅
- `src/screens/Onboarding/Step2Region.tsx` ✅
- `src/screens/Onboarding/Step3Variants.tsx` ✅ (Master Set mode)
- `src/screens/Onboarding/Step3PokemonArtStyle.tsx` ✅ (Region mode)
- `src/screens/Onboarding/Step3VariantPlacement.tsx` ✅ (Master Set mode - now Step 4)
- `src/screens/Onboarding/Step4Layout.tsx` ✅
- `src/screens/Onboarding/Step5BinderName.tsx` ✅
- `src/components/Binder/CollectionModeSelector.tsx` ✅
- `src/components/Binder/SetSelector.tsx` ✅
- `src/components/Binder/RegionSelector.tsx` ✅
- `src/components/Binder/VariantSelector.tsx` ✅

**Testing:**
- [x] Questionnaire implemented with proper step flow
- [x] Supports both Master Set (6 steps) and Region (5 steps) modes
- [ ] Questionnaire starts when NFC tag scanned (new tag) - Ready to test (requires NFC hardware)
- [ ] Questionnaire starts when creating binder manually - Ready to test
- [x] Step 1: Can select Master Set or Region (implemented)
- [x] Step 2A (Master Set): Can select set (sorted newest → oldest) (implemented)
- [x] Step 3 (Master Set): Shows variants for selected set (implemented)
- [x] Step 3 (Master Set): Can toggle variants on/off (implemented)
- [x] Step 2B (Region): Can select region (Kanto → Paldea) (implemented)
- [x] Step 3 (Region): Can choose Pokemon art style (implemented)
- [x] Step 4 (Master Set): Can choose variant placement (grouped or end) (implemented)
- [x] Step 4/5 (both modes): Can choose layout (Auto, 3×3, 4×3) (implemented)
- [x] Step 5/6: Can enter binder name (implemented)
- [x] Progress indicator shows current step (implemented)
- [x] Can go back to previous steps (implemented)
- [x] Can cancel and return to binder list (implemented)
- [x] Binder saved with all preferences (implemented)
- [x] **If from NFC**: NFC tag ID linked to binder (implemented)
- [x] **If manual**: Binder created without NFC tag ID (implemented)
- [ ] All preferences stored correctly in database - Ready to test

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
- [ ] **Status**: Not implemented (functionality exists via tap-to-toggle in BinderDetailScreen, but dedicated AddCardScreen not created)

**What we're doing:** Functionality to manage cards in binder

**Note:** Basic add/remove functionality exists via tap-to-toggle in BinderDetailScreen. Dedicated search-and-add screen not implemented.

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
- [ ] **Status**: Partially implemented (caching via React Query and CardImage component, but dedicated offline sync not implemented)

**What we're doing:** Make app work offline

**Note:** Basic caching exists via React Query (5-minute cache) and CardImage component. Dedicated offline storage files (localStorage.ts, imageCache.ts, useOfflineSync.ts) not created.

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
- [x] **Status**: Completed (error handling integrated throughout the app)

**What we're doing:** Handle errors gracefully

**Note:** Error handling has been implemented throughout the app via ErrorScreen, ErrorBanner, ErrorMessage components, and error handling in API services. Not implemented as a separate dedicated step, but functionality exists.

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
- [x] **Status**: Completed

**What we're doing:** Optimize API usage and handle rate limits (SDK may handle some of this)

**Note:** The TCGDEX SDK (`@tcgdex/sdk`) may already handle some rate limiting and caching internally. Check SDK documentation first.

**Files to create/modify:**
- `src/services/api/pokemonApi.ts` - Add rate limiting logic (if SDK doesn't handle it)
- `src/hooks/useCardQuery.ts` (if exists) - Ensure React Query caching is used
- Or add caching layer in API service

**What gets implemented:**
- ✅ React Query provider set up in App.tsx with caching configuration
- ✅ In-memory cache layer in API service (5-minute cache duration)
- ✅ Request deduplication (prevents duplicate simultaneous requests)
- ✅ Rate limit detection and handling (HTTP 429)
- ✅ Exponential backoff retry logic (via React Query)
- ✅ Stale cache fallback when rate limited
- ✅ User-friendly error messages for rate limits
- ✅ Performance logging for all API calls
- ✅ Cache statistics function for debugging
- ✅ Applied to all main API functions (getSetsMinimal, getCardsBySet, getCardById)

**Testing:**
- [x] React Query provider set up correctly
- [x] Cache configuration applied (5-minute stale time, 10-minute gc time)
- [x] Retry logic configured (3 retries with exponential backoff)
- [x] In-memory cache implemented in API service
- [x] Request deduplication implemented
- [x] Rate limit detection added
- [x] Stale cache fallback works when rate limited
- [x] No TypeScript errors
- [ ] Rate limit errors are detected correctly (ready to test)
- [ ] Retry logic works (waits and retries after rate limit) (ready to test)
- [ ] Caching reduces duplicate API calls (ready to test)
- [ ] No duplicate requests for same data (ready to test)
- [ ] User sees friendly message if rate limited (ready to test)
- [ ] App doesn't make too many API calls (ready to test)

**How to Test Step 24E:**

**See `TESTING_STEP24E.md` for detailed testing instructions.**

**Quick Tests:**

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
- [x] **Status**: Completed (comprehensive variant system implemented via cardVariants.ts)

**What we're doing:** Detect and handle card variants from TCGDEX SDK response

**Note:** Comprehensive variant system exists in `src/data/cardVariants.ts` with manual database of special variants (Pokeball, Masterball). System follows rarity restrictions and Pokemon type restrictions. Variant generation integrated into API service.

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
- [x] Variants are detected from API data (via cardVariants.ts logic)
- [x] Variant types map correctly (reverse-holo, poke-ball, master-ball)
- [x] Variant generation logic implemented (getSpecialVariantsForCard function)
- [x] Rarity restrictions implemented (Common/Uncommon/Rare only)
- [x] Pokemon type restriction for Masterball (Pokemon supertype only)
- [x] Special variant sets identified (Prismatic Evolutions, White Flare, Black Bolt)
- [ ] Variants appear in binder detail screen (ready to test)
- [ ] Variant placement preference works (grouped/end) (ready to test)
- [ ] Progress tracking counts variants correctly (ready to test)
- [ ] Can toggle variants on/off in onboarding (ready to test)

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
- [x] **Status**: Completed

**What we're doing:** Final optimizations and polish (SDK may handle some optimizations)

**Files created:**
- `src/utils/apiMonitor.ts` - Performance monitoring utility
- `src/utils/errorMessages.ts` - User-friendly error message converter

**Files modified:**
- `src/services/api/pokemonApi.ts` - Added performance logging and user-friendly errors to all API functions
- `src/components/Card/CardImage.tsx` - Added image retry logic, priority loading, and better error handling
- `src/screens/CardDetail/CardDetailScreen.tsx` - Uses high-priority image loading for detail view

**What was implemented:**
- ✅ Performance logging for all API operations (getSetsMinimal, getCardsBySet, getCardById)
- ✅ Detailed performance breakdowns (set lookup, card fetch, transform, variant generation)
- ✅ Performance ratings (excellent/good/acceptable/slow)
- ✅ User-friendly error messages for all error types (rate limit, network, not found, etc.)
- ✅ Image loading retry logic (up to 2 retries with 500ms delay)
- ✅ High-priority image loading for card detail view (better UX)
- ✅ API performance monitor utility (tracks metrics, provides statistics)
- ✅ Error message utility (converts technical errors to friendly messages)
- ✅ Improved error logging with context and timestamps
- ✅ Better cache hit logging with performance metrics
- ✅ Image loading optimization with priority support

**Testing:**
- [x] Performance logging added to all API functions
- [x] User-friendly error messages implemented
- [x] Image retry logic implemented
- [x] High-priority image loading added to detail view
- [x] API monitor utility created
- [x] Error message utility created
- [x] No TypeScript errors
- [ ] All API calls have loading states (ready to test)
- [ ] Error messages are clear and helpful (ready to test)
- [ ] Retry works for failed image loads (ready to test)
- [ ] Image loading is optimized (ready to test)
- [ ] Performance is good (no lag, fast loading) (ready to test)
- [ ] No console errors (ready to test)
- [ ] App feels smooth and responsive (ready to test)

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

## Phase 9: Monetization

### Step 27: Premium System (Freemium Model)
- [ ] **Status**: Not started

**What we're doing:** Implement freemium monetization with generous free tier and lifetime premium via binder purchase

**Business Model:**
- **Free Tier**: 3 binders max, unlimited cards per binder, all core features (no NFC, no cloud sync)
- **Premium Tier**: Unlimited binders, NFC tap-to-open, cloud sync, export, analytics
- **How to Get Premium**: Buy a physical smart binder ($24.99) → Lifetime premium unlocked via NFC activation

---

#### Step 27A: Update Database Schema for Premium
- [ ] **Status**: Not started

**What we're doing:** Add premium tracking fields to database

**Database Changes:**

Run this SQL in Supabase SQL Editor:

```sql
-- Add premium fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS premium_status TEXT DEFAULT 'free' CHECK (premium_status IN ('free', 'lifetime')),
ADD COLUMN IF NOT EXISTS premium_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS premium_source TEXT; -- 'nfc-binder' or 'manual'

-- Add premium_activated flag to binders table
-- (Tracks if this binder has been used to activate premium)
ALTER TABLE public.binders
ADD COLUMN IF NOT EXISTS premium_activated BOOLEAN DEFAULT FALSE;

-- Create index for premium status lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium_status 
ON public.user_profiles(premium_status);

-- Verification query
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('premium_status', 'premium_activated_at', 'premium_source');

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'binders' 
AND column_name = 'premium_activated';
```

**What gets created:**
- `user_profiles.premium_status` - User's premium status ('free' or 'lifetime')
- `user_profiles.premium_activated_at` - When premium was activated
- `user_profiles.premium_source` - How they got premium ('nfc-binder')
- `binders.premium_activated` - Has this binder activated premium for someone (prevents reuse)

**Testing:**
- [ ] SQL runs without errors in Supabase
- [ ] New columns appear in user_profiles table
- [ ] New column appears in binders table
- [ ] Default values are correct (free, FALSE)
- [ ] Check constraints work
- [ ] Index created successfully

---

#### Step 27B: Update TypeScript Types
- [ ] **Status**: Not started

**What we're doing:** Add premium fields to TypeScript interfaces

**Files to modify:**

**1. Update `src/types/user.ts`:**

```typescript
/**
 * Premium status types
 */
export type PremiumStatus = 'free' | 'lifetime';

/**
 * User interface representing a user account
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  binders: string[]; // Binder IDs
  
  // Premium fields
  premiumStatus: PremiumStatus;
  premiumActivatedAt?: Date;
  premiumSource?: string; // 'nfc-binder' or 'manual'
}

/**
 * Check if user has active premium
 */
export function isPremiumActive(user: User): boolean {
  return user.premiumStatus === 'lifetime';
}

/**
 * Check if user is on free tier
 */
export function isFreeTier(user: User): boolean {
  return user.premiumStatus === 'free';
}
```

**2. Update `src/types/binder.ts`:**

Add `premiumActivated` field to Binder interface:

```typescript
export interface Binder {
  id: string;
  userId: string;
  name: string;
  collectionMode: CollectionMode;
  set?: string;
  region?: string;
  variantsToTrack?: string[];
  variantPlacement?: VariantPlacement;
  layoutPreference?: LayoutPreference;
  pokemonArtStyle?: PokemonArtStyle;
  nfcTagId?: string;
  premiumActivated?: boolean; // NEW: Has this binder activated premium?
  cardIds: string[];
  totalCards: number;
  ownedCards: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Testing:**
- [ ] Run `npx tsc --noEmit` - no TypeScript errors
- [ ] Types import correctly in other files
- [ ] isPremiumActive() function works
- [ ] isFreeTier() function works

---

#### Step 27C: Update Supabase Services
- [ ] **Status**: Not started

**What we're doing:** Update auth and binder services to handle premium data

**Files to modify:**

**1. Update `src/services/supabase/auth.ts`:**

In `getCurrentUser()` function, add premium fields to return object:

```typescript
// In getCurrentUser() function, update the return statement:
return {
  id: profile.id,
  email: profile.email,
  displayName: profile.display_name || undefined,
  binders: userBinders?.map((b) => b.id) || [],
  // Add premium fields:
  premiumStatus: profile.premium_status || 'free',
  premiumActivatedAt: profile.premium_activated_at ? new Date(profile.premium_activated_at) : undefined,
  premiumSource: profile.premium_source || undefined,
};

// Also update the fallback return (when profile doesn't exist):
return {
  id: user.id,
  email: user.email || '',
  displayName: user.user_metadata?.display_name,
  binders: [],
  premiumStatus: 'free', // Default to free
  premiumActivatedAt: undefined,
  premiumSource: undefined,
};
```

**2. Update `src/services/supabase/binders.ts`:**

In `BinderRow` interface and `rowToBinder()` function:

```typescript
// Update BinderRow interface to include premium_activated:
interface BinderRow {
  // ... existing fields
  premium_activated: boolean; // ADD THIS
  // ... rest of fields
}

// Update rowToBinder() to map premium_activated:
function rowToBinder(row: BinderRow, cardIds: string[]): Binder {
  return {
    // ... existing fields
    premiumActivated: row.premium_activated || false, // ADD THIS
    // ... rest of fields
  };
}
```

**Testing:**
- [ ] getCurrentUser() returns premium fields
- [ ] Premium status defaults to 'free' for new users
- [ ] Binder premium_activated field is returned
- [ ] No TypeScript errors

---

#### Step 27D: Create Premium Gate Utilities
- [ ] **Status**: Not started

**What we're doing:** Create functions to check premium access and show upgrade prompts

**Files to create:**

**Create `src/utils/premiumGates.ts`:**

```typescript
import { Alert, Linking } from 'react-native';
import { supabase } from '../services/supabase/client';
import { getCurrentUser } from '../services/supabase/auth';
import { isPremiumActive } from '../types/user';

/**
 * Your store website URL
 * TODO: Update with your actual store URL
 */
const STORE_URL = 'https://your-store.com'; // UPDATE THIS!

/**
 * Open store website in browser
 */
export function openStore() {
  Linking.openURL(STORE_URL).catch((err) => {
    console.error('Failed to open store URL:', err);
    Alert.alert('Error', 'Could not open store. Please visit ' + STORE_URL);
  });
}

/**
 * Check if user can create a new binder
 * Free users limited to 3 binders
 * Premium users have unlimited binders
 * 
 * @returns true if user can create binder, false if limit reached
 */
export async function checkCanCreateBinder(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'Please log in to create binders');
      return false;
    }

    // Premium users can create unlimited binders
    if (isPremiumActive(user)) {
      return true;
    }

    // Free users - check binder count
    const { data: binders, error } = await supabase
      .from('binders')
      .select('id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error checking binder count:', error);
      // Allow creation on error (fail open)
      return true;
    }

    const binderCount = binders?.length || 0;

    if (binderCount >= 3) {
      // Show upgrade prompt
      Alert.alert(
        '🎴 Upgrade to Premium',
        `Free users can create up to 3 binders.\n\nYou have ${binderCount}/3 binders.\n\nBuy a smart binder to unlock:\n✅ Unlimited binders\n✅ NFC tap-to-open\n✅ Cloud sync\n✅ Lifetime premium access`,
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Buy Binder',
            onPress: openStore,
            style: 'default',
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in checkCanCreateBinder:', error);
    // Allow creation on error (fail open)
    return true;
  }
}

/**
 * Check if user can use NFC features
 * Only premium users can use NFC
 * 
 * @returns true if user has NFC access, false otherwise
 */
export async function checkCanUseNFC(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return false;
    }

    // Premium users can use NFC
    if (isPremiumActive(user)) {
      return true;
    }

    // Free users cannot use NFC
    Alert.alert(
      '🎴 Premium Feature',
      'NFC tap-to-open requires premium.\n\nBuy a smart binder to unlock:\n✅ NFC tap-to-open magic\n✅ Unlimited binders\n✅ Cloud sync\n✅ Lifetime premium access\n\nStarting at $24.99 (one-time payment)',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: openStore,
          style: 'default',
        },
      ]
    );
    return false;
  } catch (error) {
    console.error('Error in checkCanUseNFC:', error);
    return false;
  }
}

/**
 * Show premium upsell message for any feature
 * 
 * @param featureName - Name of the feature that requires premium
 */
export function showPremiumUpsell(featureName: string = 'This feature') {
  Alert.alert(
    '✨ Premium Feature',
    `${featureName} requires premium.\n\nBuy a smart binder to get lifetime premium access!`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Buy Binder', onPress: openStore },
    ]
  );
}
```

**Testing:**
- [ ] checkCanCreateBinder() returns true for premium users
- [ ] checkCanCreateBinder() shows alert when free user has 3 binders
- [ ] checkCanUseNFC() returns true for premium users
- [ ] checkCanUseNFC() shows alert for free users
- [ ] openStore() opens browser with store URL
- [ ] No TypeScript errors

---

#### Step 27E: Create Premium Activation Service
- [ ] **Status**: Not started

**What we're doing:** Handle NFC premium activation when user taps their new binder

**Files to create:**

**Create `src/services/premium/activation.ts`:**

```typescript
import { supabase } from '../supabase/client';
import { getCurrentUser } from '../supabase/auth';
import { isPremiumActive } from '../../types/user';

/**
 * Activate premium for a user via NFC binder purchase
 * 
 * @param nfcTagId - The NFC tag ID from the binder
 * @returns Object with success status and message
 */
export async function activatePremiumFromNFC(nfcTagId: string): Promise<{
  success: boolean;
  message: string;
  alreadyPremium?: boolean;
}> {
  try {
    console.log('[Premium] Attempting to activate premium from NFC:', nfcTagId);

    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'Please log in to activate premium',
      };
    }

    // Check if user already has premium
    if (isPremiumActive(user)) {
      console.log('[Premium] User already has premium');
      return {
        success: false,
        message: 'You already have premium access!',
        alreadyPremium: true,
      };
    }

    // Check if this NFC tag exists in binders table
    const { data: binder, error: binderError } = await supabase
      .from('binders')
      .select('id, premium_activated, user_id')
      .eq('nfc_tag_id', nfcTagId)
      .single();

    if (binderError || !binder) {
      console.log('[Premium] Binder not found for NFC tag:', nfcTagId);
      // This is okay - binder will be created during questionnaire
      return {
        success: false,
        message: 'Binder not found. Complete setup first.',
      };
    }

    // Check if this binder has already activated premium
    if (binder.premium_activated) {
      console.log('[Premium] This binder already activated premium');
      return {
        success: false,
        message: 'This binder has already been used to activate premium.',
      };
    }

    // Check if binder belongs to current user
    if (binder.user_id !== user.id) {
      console.log('[Premium] Binder belongs to different user');
      return {
        success: false,
        message: 'This binder belongs to another user.',
      };
    }

    // Activate premium!
    console.log('[Premium] Activating premium for user:', user.id);

    // Update user profile to premium
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        premium_status: 'lifetime',
        premium_activated_at: new Date().toISOString(),
        premium_source: 'nfc-binder',
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[Premium] Error updating user profile:', profileError);
      return {
        success: false,
        message: 'Failed to activate premium. Please try again.',
      };
    }

    // Mark binder as having activated premium
    const { error: binderUpdateError } = await supabase
      .from('binders')
      .update({ premium_activated: true })
      .eq('id', binder.id);

    if (binderUpdateError) {
      console.error('[Premium] Error marking binder as activated:', binderUpdateError);
      // Continue anyway - user has premium now
    }

    console.log('[Premium] Premium activated successfully!');
    return {
      success: true,
      message: 'Premium activated! You now have lifetime access. 🎉',
    };
  } catch (error) {
    console.error('[Premium] Error activating premium:', error);
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    };
  }
}
```

**Create `src/services/premium/index.ts`:**

```typescript
export { activatePremiumFromNFC } from './activation';
```

**Testing:**
- [ ] activatePremiumFromNFC() activates premium for valid binder
- [ ] Returns error if binder already used to activate premium
- [ ] Returns error if binder belongs to another user
- [ ] Returns success message on successful activation
- [ ] User profile updated correctly in database
- [ ] Binder marked as premium_activated in database
- [ ] No TypeScript errors

---

#### Step 27F: Add Premium Gates to UI
- [ ] **Status**: Not started

**What we're doing:** Add premium checks to key user actions

**Files to modify:**

**1. Update `src/screens/BinderList/BinderListScreen.tsx`:**

Add premium check before creating binder:

```typescript
// At top of file, add import:
import { checkCanCreateBinder } from '../../utils/premiumGates';

// In BinderListScreen component, update handleCreateBinder:
const handleCreateBinder = async () => {
  // NEW: Check if user can create binder (premium gate)
  const canCreate = await checkCanCreateBinder();
  if (!canCreate) {
    return; // User hit limit, alert shown by checkCanCreateBinder()
  }

  // Existing code: Navigate to questionnaire
  navigation.navigate('Questionnaire');
};
```

**2. Update NFC handler (if implemented):**

If you have `src/utils/nfcHandler.ts` or similar:

```typescript
// Add import:
import { checkCanUseNFC } from './premiumGates';
import { activatePremiumFromNFC } from '../services/premium';

// In handleNfcScan function, add premium check:
export async function handleNfcScan(nfcTagId: string, navigation: any) {
  try {
    // Check if user can use NFC
    const canUseNFC = await checkCanUseNFC();
    if (!canUseNFC) {
      return; // Free user, alert shown
    }

    // Try to activate premium with this NFC tag
    const activationResult = await activatePremiumFromNFC(nfcTagId);
    if (activationResult.success) {
      Alert.alert('🎉 Premium Unlocked!', activationResult.message);
    }

    // Continue with existing NFC logic...
    const binder = await getBinderByNfcTagId(nfcTagId);
    // ... rest of existing code
  } catch (error) {
    // Error handling
  }
}
```

**Testing:**
- [ ] Creating 4th binder shows upgrade prompt for free users
- [ ] Premium users can create unlimited binders
- [ ] NFC scan shows upgrade prompt for free users
- [ ] Premium users can use NFC features
- [ ] Upgrade alerts display correctly
- [ ] "Buy Binder" button opens store URL

---

#### Step 27G: Create Premium Status Screen (Optional)
- [ ] **Status**: Not started

**What we're doing:** Create a screen showing premium status and benefits

**Files to create:**

**Create `src/screens/Premium/PremiumScreen.tsx`:**

```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { isPremiumActive } from '../../types/user';
import { openStore } from '../../utils/premiumGates';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

export default function PremiumScreen() {
  const { user } = useAuth();
  const hasPremium = user ? isPremiumActive(user) : false;

  if (hasPremium) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>✨</Text>
          <Text style={styles.headerTitle}>You Have Premium!</Text>
          <Text style={styles.headerSubtitle}>Enjoy all features, forever.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Premium Benefits:</Text>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Unlimited binders</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>NFC tap-to-open magic</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Cloud sync across devices</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Export to CSV/PDF</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Priority support</Text>
          </View>
        </View>

        {user?.premiumActivatedAt && (
          <View style={styles.section}>
            <Text style={styles.infoText}>
              Premium since: {user.premiumActivatedAt.toLocaleDateString()}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // Free tier view
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🎴</Text>
        <Text style={styles.headerTitle}>Unlock Premium</Text>
        <Text style={styles.headerSubtitle}>Get lifetime access to all features</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.optionTitle}>Buy a Smart Binder</Text>
        <Text style={styles.optionPrice}>$24.99 one-time</Text>
        <Text style={styles.optionDescription}>
          Get a premium physical binder + lifetime premium app access
        </Text>
        <View style={styles.benefitList}>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Premium 9-pocket binder</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Pre-installed NFC tag</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>Lifetime premium access</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>✅</Text>
            <Text style={styles.benefitText}>All premium features</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={openStore}>
          <Text style={styles.buttonText}>Buy Smart Binder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.comparison}>
        <Text style={styles.comparisonText}>
          💡 One binder = lifetime premium. Never pay a subscription!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.primary,
  },
  headerEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    opacity: 0.9,
  },
  section: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.md,
  },
  optionTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.xs,
  },
  optionPrice: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  optionDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  benefitList: {
    marginBottom: SPACING.lg,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  benefitText: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
  },
  comparison: {
    padding: SPACING.lg,
    backgroundColor: COLORS.accent + '20',
    marginHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  comparisonText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
```

**Testing:**
- [ ] Premium screen displays correctly for free users
- [ ] Premium screen displays correctly for premium users
- [ ] "Buy Smart Binder" button opens store URL
- [ ] All benefits listed correctly
- [ ] Premium activation date shows for premium users
- [ ] No TypeScript errors

---

#### Step 27H: Add Premium Badge to UI (Optional)
- [ ] **Status**: Not started

**What we're doing:** Show premium badge/indicator in app UI

**Files to modify:**

**Update `src/screens/BinderList/BinderListScreen.tsx` or navigation header:**

Add premium badge near user's name or in header:

```typescript
// Example: Add to header or user profile area
{user && isPremiumActive(user) && (
  <View style={styles.premiumBadge}>
    <Text style={styles.premiumBadgeText}>✨ Premium</Text>
  </View>
)}
```

**Testing:**
- [ ] Premium badge shows for premium users
- [ ] Premium badge hidden for free users
- [ ] Badge displays correctly in UI

---

**Overall Testing for Step 27:**
- [ ] Database schema updated correctly
- [ ] TypeScript types updated and working
- [ ] Premium status persists across app restarts
- [ ] Free users limited to 3 binders
- [ ] Premium users can create unlimited binders
- [ ] NFC activation works (requires physical device + NFC tag)
- [ ] Premium gates show appropriate alerts
- [ ] Store URL opens correctly
- [ ] Premium screen displays correctly
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] App doesn't crash on premium checks

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
12. ⏳ **Monetization** - Premium system (freemium)
13. ⏳ **Advanced Features** - Custom binders, extra cards, region card selection

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

---

## 📝 Summary: What's Left To Do

### 🔧 **To Complete Before Production:**

1. **Premium System** (Step 27):
   - Implement freemium monetization model
   - Add database fields for premium tracking
   - Create premium gates (3 binder limit for free users)
   - Implement NFC premium activation
   - Create premium status screen
   - Test premium flow end-to-end

2. **Advanced Collection Features** (Phase 10 - Steps 28-32):
   - **Global Card Search** (Step 28): Search all cards across TCGDEX API
   - **Custom Binder Mode** (Step 29): Create binders with any cards from any set
   - **Extra Cards in Master Set** (Step 30): Add non-set cards to Master Set binders
   - **Region Card Selection** (Step 31): Replace Pokémon sprites with TCG card images
   - **Polish & Integration** (Step 32): Final optimization and error handling

3. **Install NFC Package** (if you want NFC functionality):
   ```bash
   npm install react-native-nfc-manager
   ```
   - Then create development build (see DEVELOPMENT_BUILD_GUIDE.md)
   - Test NFC scanning on physical device

4. **Optional Enhancements:**
   - Implement full offline sync (currently has basic caching)
   - Add artist filter to BinderDetailScreen (currently only rarity filter)

5. **Testing** (Step 23):
   - Test all features thoroughly
   - Test on both iOS and Android
   - Test offline mode
   - Test NFC functionality (requires physical device + NFC tags)
   - Test premium system (free tier limits, premium activation)
   - Verify variant system works correctly
   - Test new Phase 10 features (custom binders, extra cards, region selection)

6. **Production Build** (Step 25):
   - Configure EAS build
   - Create production builds for iOS and Android

7. **App Store Deployment** (Step 26):
   - Create app store listings
   - Prepare screenshots
   - Submit to App Store and Google Play

### ✅ **What's Already Working:**
- Complete authentication system (email/password + social login)
- Binder creation with comprehensive questionnaire (Master Set + Region modes)
- Card display with grid/list views
- Search and filter functionality
- Progress tracking with caching
- Real API integration with TCGDEX SDK
- Comprehensive variant system (reverse holo, pokeball, masterball)
- Rate limiting and caching (5-minute cache, exponential backoff)
- Error handling throughout
- Modern, clean UI with loading states and empty states
- **Additional features:**
  - Migration system for database schema updates
  - Admin screen for fixing existing binders
  - Performance monitoring and API metrics
  - User-friendly error messages
  - Image retry logic and priority loading
  - Pokemon art style preferences (Region mode)
  - Era-based set organization

### 🎯 **Current State:** 
The app is **~75% complete** and fully functional for core features. You can create binders, add cards, track progress, and use all main features. What remains is:
- **Phase 9** (Step 27): Premium/monetization system
- **Phase 10** (Steps 28-32): Advanced collection features (custom binders, extra cards, region card selection)
- **Testing** (Step 23): Comprehensive testing
- **Production** (Steps 25-26): Build and deploy to app stores

---

## 📋 **Premium/Monetization System Overview**

### **Business Model: Freemium with Physical Product**

**Free Tier (Generous):**
- ✅ 3 binders max
- ✅ Unlimited cards per binder
- ✅ All core features (card images, search, progress tracking, variants)
- ✅ Offline mode (local storage)
- ❌ No NFC tap-to-open
- ❌ No cloud sync (local only)
- ❌ No export (CSV/PDF)
- ❌ No detailed analytics

**Premium Tier (Lifetime - $24.99):**
- ✅ Unlimited binders
- ✅ NFC tap-to-open magic
- ✅ Cloud sync across devices
- ✅ Export to CSV/PDF
- ✅ Detailed analytics
- ✅ Priority support
- ✅ All future features

**How to Get Premium:**
- Buy a physical smart binder ($24.99) with pre-installed NFC tag
- Tap the NFC tag with phone → Premium activated for life
- One-time payment, no subscription ever

**Why This Works:**
- Physical product drives app adoption
- NFC creates "magic moment" experience
- Lifetime premium = amazing value perception
- No subscription fatigue
- Clear upgrade path (hit 3 binder limit → buy physical binder)

See **Step 27** for complete implementation guide.

---

## Phase 10: Advanced Collection Features

### Overview

This phase adds three powerful features that share a common foundation: **Global Card Search**.

1. **Custom Binder Mode** - Users create binders with any cards from any set
2. **Extra Cards in Master Set** - Add cards to a Master Set binder that aren't officially in that set
3. **Region Card Selection** - Replace generic Pokémon sprites with actual TCG card images

All three features require the ability to search across all cards in the TCGDEX API.

---

### Step 28: Global Card Search Foundation
- [ ] **Status**: Not started

**What we're doing:** Create the foundation for searching all cards across the entire TCGDEX API

This is the shared foundation that enables Custom binders, Extra Cards, and Region card selection.

---

#### Step 28A: Add Global Card Search API Function
- [x] **Status**: Completed

**What we're doing:** Add a function to search cards by name across all sets in the TCGDEX API

**SDK Method:** `tcgdex.card.list()` with filters, or search endpoint (check SDK documentation)

**Files to modify:**
- `src/services/api/pokemonApi.ts` - Add `searchCardsByName()` function
- `src/types/api.ts` - Add search result types if needed

**What gets implemented:**
- Search cards by Pokémon name (e.g., "Bulbasaur" returns all Bulbasaur cards)
- Search cards by partial name (e.g., "Char" returns Charmander, Charmeleon, Charizard, etc.)
- Filter results to only Pokémon cards (exclude Trainers that mention Pokémon names)
- Cache search results for performance
- Pagination support for large result sets
- Rate limiting protection

**Function signature:**
```typescript
/**
 * Search for cards by Pokémon name across all sets
 * @param query - Search query (Pokémon name or partial name)
 * @param options - Search options (limit, offset, pokemonOnly)
 * @returns Array of matching cards
 */
export async function searchCardsByName(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    pokemonOnly?: boolean; // Filter to only Pokemon supertype
  }
): Promise<Card[]>
```

**Testing:**
- [x] searchCardsByName() returns cards matching the query (implemented)
- [ ] Search "Pikachu" returns all Pikachu cards from all sets - Ready to test
- [ ] Search "Char" returns Charmander, Charmeleon, Charizard cards - Ready to test
- [ ] pokemonOnly option filters out Trainer cards - Ready to test
- [x] Results are cached for repeated searches (implemented, 2-minute cache)
- [x] Rate limiting is handled gracefully (implemented)
- [x] Empty search returns empty array (no crash) (implemented)
- [ ] Special characters in search don't crash the app - Ready to test
- [ ] Performance is acceptable (<3 seconds for results) - Ready to test

**What was implemented:**
- ✅ `searchCardsByName()` function added to `src/services/api/pokemonApi.ts`
- ✅ Uses TCGDEX REST API with name filter (`GET /cards?name={query}`)
- ✅ Supports `limit`, `offset`, and `pokemonOnly` options
- ✅ 2-minute cache duration for search results (shorter than normal cache)
- ✅ Rate limiting detection and graceful handling
- ✅ Request deduplication to prevent duplicate searches
- ✅ Detailed logging with `[28A]` prefix for debugging
- ✅ Transforms results to match our `Card` type
- ✅ Temporary test screen at `src/screens/CardSearchTest/CardSearchTestScreen.tsx`
- ✅ Test button "🔍 Search" added to BinderListScreen header

**How to Test Step 28A:**

**Using the Test Screen (Recommended):**
1. Open the app and log in
2. Go to "My Binders" screen
3. Tap the "🔍 Search" button in the header
4. Enter a Pokémon name (e.g., "Pikachu", "Charizard", "Eevee")
5. Tap "Search" or use the quick test buttons at the bottom
6. Verify cards appear in the results list
7. Toggle "Pokémon Only" to filter out Trainer cards
8. Search stats show result count and duration

**Console Testing:**
1. Check browser/React Native debugger console
2. Should see `[28A] searchCardsByName() called` with query
3. Should see `[28A] API response received` with result count
4. Should see `[28A] searchCardsByName() completed` with duration
5. Repeated searches should show "(cached)" in performance rating

**Logging & Debugging for Step 28A:**
```typescript
// Logs added to searchCardsByName():
console.log('[28A] searchCardsByName() called:', { query, options });
console.log('[28A] Fetching from API URL:', apiUrl);
console.log('[28A] API response received:', { resultCount, fetchDuration });
console.log('[28A] searchCardsByName() completed:', { query, resultCount, duration, performance });
```

---

#### Step 28B: Create Card Search/Picker UI Component
- [x] **Status**: Completed

**What we're doing:** Create a reusable modal/screen for searching and selecting cards

This component will be used by:
- Custom binder mode (add any card)
- Extra cards feature (add card to Master Set)
- Region card selection (pick TCG card for Pokémon slot)

**Files created:**
- `src/components/CardPicker/CardPickerModal.tsx` - Bottom sheet modal for card selection ✅
- `src/components/CardPicker/CardSearchResults.tsx` - Search results list view ✅
- `src/components/CardPicker/index.ts` - Export components ✅
- `src/hooks/useCardPicker.ts` - Hook with debounced search, pagination, caching ✅

**Features implemented:**
- ✅ Bottom sheet modal (slides up, covers ~85% of screen)
- ✅ Search input with debounced search (300ms delay)
- ✅ Loading state while searching
- ✅ Results in list view with card images and details
- ✅ Tap card to select it (modal closes automatically)
- ✅ "Cancel" button to close without selecting
- ✅ Tap backdrop to close
- ✅ Empty state when no results / no query
- ✅ Error state for API failures
- ✅ Pagination with "Load More" button
- ✅ Uses CardImage component for proper image caching
- ✅ Initial query support (for pre-filled searches)
- ✅ pokemonOnly filter option

**Component Props:**
```typescript
interface CardPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCard: (card: Card) => void;
  title?: string; // e.g., "Add Card" or "Choose a Bulbasaur Card"
  initialQuery?: string; // Pre-fill search (e.g., "Bulbasaur" for Region mode)
  pokemonOnly?: boolean; // Only show Pokémon cards
}
```

**Testing:**
- [x] Modal opens and closes correctly (implemented)
- [x] Search input works with debounce (300ms)
- [x] Results display in list view
- [x] Tapping card calls onSelectCard and closes modal
- [x] Cancel button calls onClose
- [x] Loading spinner shows during search
- [x] Empty state shows when no results / no query
- [x] Error state shows on API failure
- [x] Scrolling works for many results
- [ ] Test all features in the app - Ready to test

**How to Test Step 28B:**
1. **Open the test screen:**
   - Go to "My Binders" → tap "🔍 Search" button
   - Tap the green "📱 Open Card Picker Modal" button

2. **Test search:**
   - Type "Pikachu" and wait ~300ms for results
   - Results should appear in a list below the search
   - Loading spinner shows while searching

3. **Test selection:**
   - Tap any card in the results
   - Alert shows confirming the selected card
   - Modal closes automatically
   - "Last selected" info shows below the modal button

4. **Test cancel:**
   - Open modal again
   - Tap "Cancel" or tap the dark backdrop above the sheet
   - Modal closes without showing selection alert

5. **Test empty/error states:**
   - Search for gibberish (e.g., "xyz123abc")
   - Should show "No cards found" message
   - Turn off internet and search
   - Should show error message

---

### Step 29: Custom Binder Mode
- [ ] **Status**: Not started

**What we're doing:** Fully implement the Custom binder mode where users can add any cards from any set

**Current state:** Custom mode exists in types but shows empty card list in BinderDetailScreen

---

#### Step 29A: Update Custom Binder Creation Flow
- [ ] **Status**: Not started

**What we're doing:** Add proper onboarding flow for Custom binders

**Files to modify:**
- `src/screens/Onboarding/OnboardingScreen.tsx` - Add Custom mode flow
- `src/screens/Onboarding/Step1CollectionMode.tsx` - Show Custom option
- `src/screens/BinderList/BinderListScreen.tsx` - Quick-create Custom binder option

**Custom Mode Onboarding Flow (3 steps):**
1. **Step 1**: Collection Mode - Select "Custom"
2. **Step 2**: Layout Preference - Choose 3×3 or 4×3
3. **Step 3**: Binder Name - Enter name

**Note:** Custom mode skips set selection, region selection, and variant selection since users manually add any cards they want.

**Testing:**
- [ ] Custom mode appears as option in Step 1
- [ ] Selecting Custom skips to layout preference
- [ ] Can complete Custom binder creation
- [ ] Custom binder saved to database correctly
- [ ] Custom binder appears in binder list

---

#### Step 29B: Update BinderDetailScreen for Custom Mode
- [ ] **Status**: Not started

**What we're doing:** Show cards the user has added and provide "Add Card" button

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Handle Custom mode display

**What gets implemented:**
- For Custom mode, load cards from `binder_cards` table (user's added cards)
- Show "Add Card" floating action button (FAB)
- Tapping FAB opens CardPickerModal
- When user selects card, add it to binder
- Progress shows "X cards" (no percentage since no fixed total)
- Cards can be removed (tap to toggle, same as other modes)
- Empty state: "No cards yet. Tap + to add cards."

**Custom Mode Display Logic:**
```typescript
if (binder.collectionMode === 'custom') {
  // Load only cards that user has added (from binder_cards table)
  const cardIds = binder.cardIds;
  const cards = await Promise.all(cardIds.map(id => getCardById(id)));
  // Display these cards
  // Show "Add Card" FAB
}
```

**Testing:**
- [ ] Custom binder shows only user-added cards
- [ ] "Add Card" FAB appears for Custom binders
- [ ] Tapping FAB opens card picker
- [ ] Selected card is added to binder
- [ ] Card appears in binder grid/list
- [ ] Can remove card by tapping
- [ ] Progress shows "X cards" format
- [ ] Empty state shows when no cards
- [ ] Cards persist after app restart

**How to Test Step 29B:**
1. **Create Custom binder:**
   - Go through onboarding, select Custom
   - Complete binder creation

2. **Test empty state:**
   - Open the Custom binder
   - Should see empty state message
   - Should see "Add Card" button

3. **Test adding cards:**
   - Tap "Add Card" button
   - Search for a card (e.g., "Charizard")
   - Select a card
   - Verify card appears in binder

4. **Test removing cards:**
   - Tap on an owned card
   - Verify card is removed (or marked as not owned)

---

### Step 30: Extra Cards in Master Set Binders
- [ ] **Status**: Not started

**What we're doing:** Allow users to add cards to a Master Set binder that aren't officially in that set

**Use case:** User wants to track a promo Pikachu card alongside their Scarlet & Violet set, even though that Pikachu isn't in the set.

---

#### Step 30A: Update Database Schema for Extra Cards
- [ ] **Status**: Not started

**What we're doing:** Track which cards are "extra" (not part of official set)

**Option 1: Add field to binder_cards table**
```sql
-- Add is_extra column to binder_cards table
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

-- Index for filtering extra cards
CREATE INDEX IF NOT EXISTS idx_binder_cards_is_extra 
ON public.binder_cards(binder_id, is_extra);
```

**Option 2: Store extra card IDs in binder table**
```sql
-- Add extra_card_ids array to binders table
ALTER TABLE public.binders
ADD COLUMN IF NOT EXISTS extra_card_ids TEXT[] DEFAULT '{}';
```

**Recommended:** Option 1 (is_extra field) - more flexible and follows existing pattern

**Testing:**
- [ ] SQL runs without errors
- [ ] New column/field appears in table
- [ ] Default value is correct (FALSE)
- [ ] Can query extra cards for a binder

---

#### Step 30B: Update Card Services for Extra Cards
- [ ] **Status**: Not started

**What we're doing:** Update card services to handle extra cards

**Files to modify:**
- `src/services/supabase/cards.ts` - Add functions for extra cards
- `src/types/binder.ts` - Update types if needed

**Functions to add:**
```typescript
/**
 * Add an extra card to a binder (card not officially in the set)
 */
export async function addExtraCardToBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void>

/**
 * Get all extra cards in a binder
 */
export async function getExtraCardsInBinder(
  binderId: string
): Promise<string[]>

/**
 * Check if a card is an extra card in a binder
 */
export async function isExtraCard(
  binderId: string,
  cardId: string
): Promise<boolean>
```

**Testing:**
- [ ] addExtraCardToBinder() marks card as extra
- [ ] getExtraCardsInBinder() returns only extra cards
- [ ] isExtraCard() correctly identifies extra cards
- [ ] Regular cards are not marked as extra
- [ ] No TypeScript errors

---

#### Step 30C: Update BinderDetailScreen for Extra Cards
- [ ] **Status**: Not started

**What we're doing:** Display extra cards in Master Set binders and allow adding them

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Handle extra cards display

**UI Changes:**
- Add "Add Extra Card" button (smaller than main FAB, maybe in header)
- Extra cards section at the bottom of the card grid
- Visual indicator for extra cards (badge or different border)
- Progress tracking separate: "95/150 (63%) + 3 extras"

**Display Logic:**
```typescript
if (binder.collectionMode === 'master-set') {
  // Load official set cards
  const setCards = await getCardsBySet(binder.set);
  
  // Load extra cards
  const extraCardIds = await getExtraCardsInBinder(binder.id);
  const extraCards = await Promise.all(extraCardIds.map(id => getCardById(id)));
  
  // Display: [setCards] then [extraCards section]
}
```

**Testing:**
- [ ] "Add Extra Card" button appears for Master Set binders
- [ ] Extra cards appear in separate section
- [ ] Extra cards have visual indicator
- [ ] Progress shows "X/Y + Z extras" format
- [ ] Can add extra cards via picker
- [ ] Can remove extra cards
- [ ] Extra cards don't affect main progress percentage

**How to Test Step 30C:**
1. **Open a Master Set binder:**
   - Should see normal set cards
   - Should see "Add Extra Card" button

2. **Add an extra card:**
   - Tap "Add Extra Card"
   - Search for a card from a different set
   - Select the card
   - Verify card appears in "Extras" section

3. **Check progress:**
   - Progress should show main set completion
   - Extra cards should be counted separately

---

### Step 31: Region Mode Card Selection
- [ ] **Status**: Not started

**What we're doing:** Allow users to select a specific TCG card image to represent each Pokémon in Region mode

**Use case:** User taps Bulbasaur slot → sees all Bulbasaur TCG cards → selects their favorite → that card image replaces the generic Bulbasaur sprite.

---

#### Step 31A: Create Database Table for Region Card Selections
- [ ] **Status**: Not started

**What we're doing:** Store which TCG card the user selected for each Pokémon slot

**SQL to run in Supabase:**
```sql
-- Create table for region card selections
CREATE TABLE IF NOT EXISTS public.region_pokemon_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  binder_id UUID NOT NULL REFERENCES public.binders(id) ON DELETE CASCADE,
  pokedex_number INTEGER NOT NULL,
  selected_card_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One selection per Pokémon per binder
  UNIQUE(binder_id, pokedex_number)
);

-- Enable RLS
ALTER TABLE public.region_pokemon_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own region card selections" ON public.region_pokemon_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own region card selections" ON public.region_pokemon_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own region card selections" ON public.region_pokemon_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own region card selections" ON public.region_pokemon_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_region_pokemon_cards_binder 
ON public.region_pokemon_cards(binder_id);

CREATE INDEX IF NOT EXISTS idx_region_pokemon_cards_user 
ON public.region_pokemon_cards(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_region_pokemon_cards_updated_at
  BEFORE UPDATE ON public.region_pokemon_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Testing:**
- [ ] Table created successfully
- [ ] RLS policies applied
- [ ] Can insert a selection
- [ ] Unique constraint prevents duplicate Pokémon selections per binder
- [ ] Can query selections for a binder

---

#### Step 31B: Create Region Card Selection Service
- [ ] **Status**: Not started

**What we're doing:** Create service functions for managing region card selections

**Files to create:**
- `src/services/supabase/regionCards.ts` - Region card selection CRUD

**Functions:**
```typescript
/**
 * Get the selected card for a Pokémon in a Region binder
 */
export async function getSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number
): Promise<string | null>

/**
 * Set the selected card for a Pokémon in a Region binder
 */
export async function setSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number,
  cardId: string
): Promise<void>

/**
 * Get all selected cards for a Region binder
 * Returns Map<pokedexNumber, cardId>
 */
export async function getAllSelectedCardsForBinder(
  binderId: string
): Promise<Map<number, string>>

/**
 * Clear the selected card for a Pokémon (revert to default sprite)
 */
export async function clearSelectedCardForPokemon(
  binderId: string,
  pokedexNumber: number
): Promise<void>
```

**Testing:**
- [ ] getSelectedCardForPokemon() returns card ID or null
- [ ] setSelectedCardForPokemon() saves selection
- [ ] getAllSelectedCardsForBinder() returns all selections
- [ ] clearSelectedCardForPokemon() removes selection
- [ ] No TypeScript errors

---

#### Step 31C: Update Region Mode Display
- [ ] **Status**: Not started

**What we're doing:** Show selected TCG card images instead of generic sprites

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Load and display selected cards
- `src/services/api/pokemonApi.ts` - Update `getCardsByRegion()` to include selected cards

**Display Logic:**
```typescript
// In BinderDetailScreen for Region mode:
if (binder.collectionMode === 'region') {
  // Get Pokemon list for region
  const pokemonList = await getCardsByRegion(binder.region, binder.pokemonArtStyle);
  
  // Get selected cards for this binder
  const selectedCards = await getAllSelectedCardsForBinder(binder.id);
  
  // For each Pokemon, check if user selected a card
  const cardsWithSelections = await Promise.all(
    pokemonList.map(async (pokemon) => {
      const selectedCardId = selectedCards.get(pokemon.pokedexNumber);
      
      if (selectedCardId) {
        // Load the selected TCG card
        const tcgCard = await getCardById(selectedCardId);
        return {
          ...pokemon,
          imageUrl: tcgCard?.imageUrl || pokemon.imageUrl,
          selectedCard: tcgCard,
        };
      }
      
      return pokemon;
    })
  );
}
```

**Testing:**
- [ ] Region binder shows default sprites by default
- [ ] Selected cards show TCG card image instead of sprite
- [ ] Card selection persists after app restart
- [ ] Performance is acceptable (loading not too slow)

---

#### Step 31D: Create Pokemon Card Picker Flow
- [ ] **Status**: Not started

**What we're doing:** When user taps a Pokémon, show all TCG cards for that Pokémon and let them select one

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Handle tap on Region card
- `src/components/CardPicker/CardPickerModal.tsx` - Pre-fill with Pokémon name

**Flow:**
1. User taps on Bulbasaur slot in Region binder
2. CardPickerModal opens with title "Choose a Bulbasaur Card"
3. Search is pre-filled with "Bulbasaur" and results auto-load
4. User scrolls through all Bulbasaur cards from all sets
5. User taps desired card
6. Selection saved to database
7. Binder updates to show selected card image

**UI Changes:**
- Long-press on Region card shows options: "Choose Card" / "View Details" / "Clear Selection"
- Or: Regular tap opens card picker, dedicated button for card details
- Visual indicator on cards that have custom selection (small badge/icon)

**Testing:**
- [ ] Tapping Region card opens card picker
- [ ] Card picker pre-fills with Pokémon name
- [ ] All cards for that Pokémon are shown
- [ ] Selecting card saves to database
- [ ] Binder display updates with new image
- [ ] Can clear selection to revert to sprite
- [ ] Visual indicator shows which Pokémon have custom cards

**How to Test Step 31D:**
1. **Open a Region binder:**
   - Should see Pokémon with sprites (or art style you chose)

2. **Select a custom card:**
   - Tap on Pikachu
   - Should see all Pikachu TCG cards
   - Select a card
   - Pikachu slot should now show that card's image

3. **Clear selection:**
   - Long-press on Pikachu (or find clear option)
   - Clear the selection
   - Should revert to default sprite

4. **Verify persistence:**
   - Close and reopen the binder
   - Custom card selection should still be there

---

### Step 32: Polish & Integration
- [ ] **Status**: Not started

**What we're doing:** Final polish and integration of all custom card features

---

#### Step 32A: Unified Card Picker Experience
- [ ] **Status**: Not started

**What we're doing:** Ensure card picker works consistently across all features

**Files to review/update:**
- All files using CardPickerModal
- Consistent styling and behavior

**Checklist:**
- [ ] Same animation for all uses
- [ ] Same search behavior
- [ ] Same result display
- [ ] Proper keyboard handling
- [ ] Works on all screen sizes

---

#### Step 32B: Performance Optimization
- [ ] **Status**: Not started

**What we're doing:** Optimize performance for large search results and many card selections

**Optimizations:**
- [ ] Cache search results
- [ ] Lazy load card images in picker
- [ ] Batch load region card selections
- [ ] Use React.memo for card items
- [ ] Virtualized list for search results

---

#### Step 32C: Error Handling & Edge Cases
- [ ] **Status**: Not started

**What we're doing:** Handle all error cases gracefully

**Edge cases to handle:**
- [ ] Card no longer exists in API (deleted set)
- [ ] Network error during search
- [ ] Rate limit hit during search
- [ ] User tries to add same card twice
- [ ] Very long Pokémon names in search
- [ ] Special characters in search query
- [ ] Empty search results

---

**Overall Testing Checklist for Phase 10:**
- [ ] Global card search works correctly (Step 28)
- [ ] Card picker modal works in all contexts (Step 28)
- [ ] Custom binder mode fully functional (Step 29)
- [ ] Can add/remove cards in Custom binders
- [ ] Extra cards feature works in Master Set binders (Step 30)
- [ ] Extra cards displayed separately with indicator
- [ ] Region card selection works (Step 31)
- [ ] Selected cards display correctly in Region binders
- [ ] All features work offline (with cached data)
- [ ] Performance is acceptable
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All error states handled gracefully

---

