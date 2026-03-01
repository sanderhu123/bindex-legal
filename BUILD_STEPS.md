# Build Steps - Pokémon TCG Binder Tracker App

> **📅 Last Updated:** March 1, 2026  
> **🎯 Status:** ~90% Complete - Core features done, Phase 10 (Advanced Features) done, Binder Position System done, Binder Edit Mode complete. Monetization redesigned: In-App Purchase (Pro upgrade) via RevenueCat — replaces old activation code system.  
> **✅ Major Milestones:** All phases 1-8 complete, Phase 10 (Advanced Features) complete, Step 33 (Binder Position System) complete, Step 34 (Binder Edit Mode) complete. Phase 9 (Monetization) redesigned and not yet started. Old Phase 11 (Activation Codes) removed.

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
- **Phase 10**: Advanced Collection Features (Steps 28-32) - All complete
  - Step 28: Global Card Search Foundation ✅ (28A + 28B)
  - Step 29: Custom Binder Mode ✅ (29A + 29B)
  - Step 30: Extra Cards in Master Set ✅ (30A + 30B + 30C)
  - Step 31: Region Mode Card Selection ✅ (31A + 31B + 31C + 31D)
  - Step 32: Polish & Integration ✅ (32A + 32B + 32C)
- **Step 33**: Binder Position System - All complete
  - Step 33A: Binder Page View Component ✅
  - Step 33B: Page Navigator Component ✅
  - Step 33C: Jump to Page Modal ✅
  - Step 33D: Binder View Mode in BinderDetailScreen ✅
  - Step 33E: Position Info in Card Details ✅
  - Step 33F: Page Headers Toggle in Grid View ✅
  - Step 33G: Variants in Position System ✅

- **Step 34**: Binder Edit Mode - All complete
  - Step 34A: Update View Modes UI & Interactions ✅
  - Step 34B: Create Binder Edit Screen (Master Set / Custom) ✅
  - Step 34C: Implement Tap-to-Select System (with Remove button) ✅
  - Step 34D: Implement Card Placeholder Tray & Trash Zone ✅
  - Step 34E: Implement Insert Functionality (Plus Signs) ✅
  - Step 34F: Implement Drag & Drop System ✅
  - Step 34G: Implement Undo & Save System ✅
  - Step 34H: Region Binder Edit (Simple Version Picker) ✅
  - Step 34I: Database Storage for Card Positions ✅
### ⚠️ **Partially Implemented**
- **Step 16**: Add/Remove Cards - Basic tap-to-toggle works, but dedicated AddCardScreen not created
- **Step 19**: Offline Support - React Query caching exists, but dedicated offline storage files not created
- **Step 24F**: Variant Handling - Comprehensive logic implemented, needs integration testing

### ❌ **Not Yet Implemented**
- **Phase 9**: Monetization — Pro Upgrade via In-App Purchase (RevenueCat) - Not started
  - Step 27A: Database Schema for Pro System
  - Step 27B: RevenueCat Account & SDK Setup
  - Step 27C: Pro Check Service (`isUserPro()`)
  - Step 27D: Binder Creation Limit (1 free binder)
  - Step 27E: Binder Deletion Limit (1 free do-over)
  - Step 27F: Upgrade Screen UI
  - Step 27G: Restore Purchases
  - Step 27H: Integration & Testing
- **Step 23**: Comprehensive Testing - Needs user testing
- **Step 25**: Build for Production - Not started
- **Step 26**: Deploy to App Stores - Not started

### 🗑️ **Removed / Replaced**
- **Old Phase 11**: Binder Activation System (Step 35) — **Removed.** Was based on physical binders with activation codes. Replaced by Phase 9 (In-App Purchase Pro model). Code to remove: `registeredTags.ts`, `ActivationCodeScreen.tsx`, `add_registered_tags.sql`, `test_activation_codes.sql`.
- **Old Step 27**: Premium System (NFC-based Freemium) — **Replaced** with new Step 27 (In-App Purchase Pro).
- **Step 36**: NFC Tag Integration — **Removed.** No longer needed for app-only monetization.

### 📊 **Overall Progress**: ~90% Complete (Core features done, Phase 10 advanced features done, Binder Position System done, Binder Edit Mode complete. Remaining: monetization (Pro upgrade), old activation code cleanup, testing, production build)

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
- [x] **Status**: Completed (all substeps 24A-G done)

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

## Phase 9: Monetization (Pro Upgrade via In-App Purchase)

### Step 27: Pro System (One-Time In-App Purchase)
- [ ] **Status**: Not started

**What we're doing:** Implement a one-time in-app purchase ("Pro Upgrade") using RevenueCat. The app is free to download. Free users get 1 binder to try the app. Pro users get unlimited binders. All features are the same — the only difference is binder quantity.

> **Note:** This replaces the old monetization plans (NFC premium activation in old Step 27, and activation code system in old Phase 11/Step 35). Those systems have been removed. The app is now app-only — no physical binder dependency.

**Business Model:**

| | Free | Pro (one-time purchase, $4.99–$6.99) |
|---|---|---|
| Binders | 1 | Unlimited |
| Cards per binder | Unlimited | Unlimited |
| All collection modes | Yes | Yes |
| Search & filter | Yes | Yes |
| Grid, list & binder views | Yes | Yes |
| Progress tracking | Yes | Yes |
| Cloud sync | Yes | Yes |
| Binder edit mode | Yes | Yes |
| Delete binders | 1 do-over (lifetime) | Unlimited |

**Why one-time purchase (not subscription):**
- A card tracker is a long-term tool, not a daily-content app
- Collectors already spend money on cards — another monthly bill feels wrong
- One-time purchase = better reviews, less churn, simpler to manage
- RevenueCat supports both models, so subscriptions can be added later if needed

**Free tier anti-gaming:**
- Free users can create 1 binder (lifetime count, not active count)
- Free users get 1 "do-over" — they can delete their binder once and create a new one
- After the do-over is used, they cannot delete or create new binders without upgrading
- This prevents users from cycling through binders to avoid paying

**Complete User Flow:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FREE USER FLOW                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User downloads app from App Store / Play Store (free)                      │
│          ↓                                                                  │
│  Creates account (or logs in)                                               │
│          ↓                                                                  │
│  Creates 1st binder → works normally                                        │
│          ↓                                                                  │
│  Tries to create 2nd binder → "Upgrade to Pro" prompt                      │
│          ↓                                                                  │
│  Wants to start over? → Can delete binder (1 do-over)                      │
│     Shows warning: "This is your only do-over. Are you sure?"              │
│          ↓                                                                  │
│  After do-over is used:                                                     │
│     - Can create 1 new binder                                               │
│     - Cannot delete again → "Upgrade to Pro"                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PRO UPGRADE FLOW                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User taps "Upgrade to Pro" (from limit prompt or Settings)                 │
│          ↓                                                                  │
│  Upgrade screen shows:                                                      │
│     - What Pro includes (unlimited binders)                                 │
│     - Price ($4.99–$6.99, one-time)                                         │
│     - "Buy Pro" button                                                      │
│     - "Restore Purchase" link                                               │
│          ↓                                                                  │
│  User taps "Buy Pro" → Apple/Google payment sheet appears                   │
│          ↓                                                                  │
│  Payment successful → RevenueCat confirms → user_tier = 'pro'              │
│          ↓                                                                  │
│  User now has unlimited binders forever                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Sub-Steps Overview:**

| Sub-Step | Description | Dependencies |
|----------|-------------|-------------|
| 27A | Database: Add `user_tier` and `free_deletions_used` | Supabase |
| 27B | RevenueCat Account & SDK Setup | Apple/Google dev accounts |
| 27C | Pro Check Service (`isUserPro()`) | 27A, 27B |
| 27D | Binder Creation Limit (1 free binder) | 27C |
| 27E | Binder Deletion Limit (1 free do-over) | 27C |
| 27F | Upgrade Screen UI | 27B, 27C |
| 27G | Restore Purchases | 27B |
| 27H | Integration & Testing | All above |

---

#### Step 27A: Database Schema for Pro System
- [ ] **Status**: Not started

**What we're doing:** Add two fields to the `user_profiles` table in Supabase to track whether a user is Pro and how many times they've used their free delete.

**Database Changes:**

Run this SQL in Supabase SQL Editor:

```sql
-- Add Pro system fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS free_deletions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_binders_created INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pro_purchased_at TIMESTAMP WITH TIME ZONE;

-- Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_tier 
ON public.user_profiles(user_tier);
```

**What gets created:**
- `user_tier` — `'free'` or `'pro'` (default: `'free'`)
- `free_deletions_used` — starts at 0, max 1 for free users (tracks the do-over)
- `lifetime_binders_created` — total binders ever created (doesn't decrease on delete)
- `pro_purchased_at` — when the user bought Pro (null if free)

**Testing:**
- [ ] SQL runs without errors in Supabase
- [ ] New columns appear in user_profiles table
- [ ] Default values are correct (`'free'`, 0, 0, null)
- [ ] Check constraint works (try setting user_tier to 'invalid' — should fail)

---

#### Step 27B: RevenueCat Account & SDK Setup
- [ ] **Status**: Not started

**What we're doing:** Create a RevenueCat account, set up the product in Apple/Google stores, and install the RevenueCat SDK in the app.

**Prerequisites:**
- Apple Developer Account ($99/year) — needed for App Store in-app purchases
- Google Play Developer Account ($25 one-time) — needed for Play Store in-app purchases

**Steps:**

**1. Create RevenueCat Account:**
- Go to [https://www.revenuecat.com](https://www.revenuecat.com)
- Sign up for a free account
- Create a new project in the RevenueCat dashboard

**2. Set Up Product in Apple App Store Connect:**
- Go to App Store Connect → Your App → In-App Purchases
- Create a new "Non-Consumable" in-app purchase
- Product ID: `pro_upgrade` (or similar)
- Reference Name: "Pro Upgrade"
- Price: $4.99–$6.99 (choose your price tier)
- Add description and screenshot for App Review

**3. Set Up Product in Google Play Console:**
- Go to Google Play Console → Your App → Monetize → Products → In-app products
- Create a new "One-time product"
- Product ID: `pro_upgrade` (must match Apple's ID for simplicity)
- Price: Same as Apple
- Add description

**4. Connect Stores to RevenueCat:**
- In RevenueCat dashboard, add your Apple and Google apps
- Enter your App Store shared secret and Google service account credentials
- RevenueCat will verify the connection

**5. Create Entitlement & Offering in RevenueCat:**
- Create an Entitlement called `pro` (this is what your app checks)
- Create an Offering called `default`
- Add your `pro_upgrade` product to the offering
- Link the entitlement to the product

**6. Install SDK in App:**

```bash
npm install react-native-purchases
```

**7. Initialize RevenueCat in App.tsx:**

```typescript
import Purchases from 'react-native-purchases';

// In your App initialization:
Purchases.configure({
  apiKey: Platform.OS === 'ios' 
    ? 'your_apple_api_key_from_revenuecat' 
    : 'your_google_api_key_from_revenuecat',
});
```

**Testing:**
- [ ] RevenueCat account created
- [ ] Apple in-app purchase product created (`pro_upgrade`)
- [ ] Google in-app purchase product created (`pro_upgrade`)
- [ ] RevenueCat connected to both stores
- [ ] Entitlement `pro` created in RevenueCat
- [ ] `react-native-purchases` installed in project
- [ ] SDK initializes without errors
- [ ] No TypeScript errors

---

#### Step 27C: Pro Check Service (`isUserPro()`)
- [ ] **Status**: Not started

**What we're doing:** Create a centralized service that checks if a user is Pro. Every screen that needs to know the user's tier calls this one function.

**Files to create:**
- `src/services/pro/proService.ts` — Pro check functions

**What gets implemented:**

```typescript
// src/services/pro/proService.ts

import Purchases from 'react-native-purchases';
import { supabase } from '../supabase/client';

/**
 * Check if the current user has Pro access.
 * Checks RevenueCat first (source of truth for purchases),
 * then syncs with Supabase user_tier.
 */
export async function isUserPro(): Promise<boolean>

/**
 * Get the user's current binder usage info.
 * Returns: canCreate, canDelete, currentBinders, lifetimeBinders, tier
 */
export async function getBinderUsage(): Promise<BinderUsage>

/**
 * Check if the user can create a new binder.
 * Free users: lifetime_binders_created < 2 (1 original + 1 do-over recreation)
 * Pro users: always true
 */
export async function canCreateBinder(): Promise<boolean>

/**
 * Check if the user can delete a binder.
 * Free users: free_deletions_used < 1
 * Pro users: always true
 */
export async function canDeleteBinder(): Promise<boolean>

/**
 * Record that a binder was created (increments lifetime counter).
 */
export async function recordBinderCreated(): Promise<void>

/**
 * Record that a free deletion was used (increments do-over counter).
 */
export async function recordDeletionUsed(): Promise<void>
```

**Testing:**
- [ ] `isUserPro()` returns `false` for free users
- [ ] `isUserPro()` returns `true` for Pro users
- [ ] `canCreateBinder()` returns `true` when under limit
- [ ] `canCreateBinder()` returns `false` when at limit (free user)
- [ ] `canDeleteBinder()` returns `true` when do-over not used
- [ ] `canDeleteBinder()` returns `false` when do-over already used (free user)
- [ ] Pro users can always create and delete
- [ ] No TypeScript errors

---

#### Step 27D: Binder Creation Limit (1 Free Binder)
- [ ] **Status**: Not started

**What we're doing:** Add a check before binder creation. Free users can only create 1 binder (with 1 do-over). If they're at their limit, show an "Upgrade to Pro" prompt instead.

**Files to modify:**
- `src/screens/BinderList/BinderListScreen.tsx` — Check limit before "Create Binder"
- `src/screens/Onboarding/OnboardingScreen.tsx` — Check limit at start of questionnaire

**What gets implemented:**
- Before creating a binder, call `canCreateBinder()`
- If allowed → proceed normally (and call `recordBinderCreated()`)
- If blocked → show modal: "Upgrade to Pro for unlimited binders"

**Testing:**
- [ ] Free user can create 1st binder → works
- [ ] Free user tries 2nd binder → blocked with upgrade prompt
- [ ] Pro user can create unlimited binders → always works
- [ ] Upgrade prompt has "Upgrade to Pro" button
- [ ] Upgrade button navigates to upgrade screen

---

#### Step 27E: Binder Deletion Limit (1 Free Do-Over)
- [ ] **Status**: Not started

**What we're doing:** Add a check before binder deletion. Free users get 1 "do-over" delete. After that, deleting requires Pro.

**Files to modify:**
- `src/screens/BinderList/BinderListScreen.tsx` — Check before allowing delete
- `src/screens/BinderDetail/BinderDetailScreen.tsx` — If delete is available there too

**What gets implemented:**
- Before deleting, call `canDeleteBinder()`
- If allowed (do-over not used):
  - Show warning: "This is your only do-over. After this, you won't be able to delete binders unless you upgrade to Pro. Continue?"
  - On confirm → delete binder + call `recordDeletionUsed()`
- If blocked (do-over already used):
  - Show: "You've used your free do-over. Upgrade to Pro to manage your binders."
- Pro users → normal delete with standard confirmation

**Testing:**
- [ ] Free user can delete 1st binder → works (with warning)
- [ ] Warning message is clear about do-over
- [ ] Free user tries 2nd delete → blocked with upgrade prompt
- [ ] Pro user can delete any binder → always works
- [ ] After do-over, user can create a new binder (slot freed up)

---

#### Step 27F: Upgrade Screen UI
- [ ] **Status**: Not started

**What we're doing:** Create a screen or modal that shows what Pro includes and lets users purchase it.

**Files to create:**
- `src/screens/Upgrade/UpgradeScreen.tsx` — Upgrade screen

**UI Layout:**

```
┌─────────────────────────────────────┐
│  ← Back                            │
│                                     │
│  Upgrade to Pro                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  ✓ Unlimited binders        │    │
│  │  ✓ Delete & recreate freely │    │
│  │  ✓ All features included    │    │
│  │  ✓ One-time purchase        │    │
│  │  ✓ No subscription          │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Buy Pro — $X.XX             │    │
│  │  (one-time, forever yours)   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Already purchased?                 │
│  [Restore Purchase]                 │
│                                     │
└─────────────────────────────────────┘
```

**What gets implemented:**
- List of Pro benefits
- "Buy Pro" button → triggers RevenueCat purchase flow
- "Restore Purchase" link → restores previous purchases
- Success state → "You're now Pro!" with confetti or check mark
- Error state → "Purchase failed. Please try again."
- Loading state during purchase

**Testing:**
- [ ] Screen displays correctly
- [ ] Pro benefits listed clearly
- [ ] "Buy Pro" button triggers purchase flow
- [ ] Successful purchase updates user_tier to 'pro'
- [ ] Failed purchase shows error message
- [ ] "Restore Purchase" works for previous buyers
- [ ] Back button works
- [ ] Accessible from Settings and from limit prompts

---

#### Step 27G: Restore Purchases
- [ ] **Status**: Not started

**What we're doing:** Allow users to restore their Pro purchase on a new device or after reinstalling. Apple requires this button to exist.

**What gets implemented:**
- "Restore Purchases" button on Upgrade screen and in Settings
- Calls `Purchases.restorePurchases()` from RevenueCat
- If Pro entitlement found → update user_tier to 'pro'
- If nothing found → "No previous purchases found"

**Testing:**
- [ ] Restore button exists on Upgrade screen
- [ ] Restore button exists in Settings
- [ ] Restoring finds previous purchase → unlocks Pro
- [ ] Restoring with no purchase → shows "No purchases found"
- [ ] Works on new device with same Apple/Google account

---

#### Step 27H: Integration & Testing
- [ ] **Status**: Not started

**What we're doing:** Test the complete Pro system end-to-end.

**Testing Checklist:**

**Free User Flow:**
- [ ] New user starts with `user_tier = 'free'`
- [ ] Can create 1 binder → works
- [ ] Tries 2nd binder → sees upgrade prompt
- [ ] Can delete binder (do-over) → works with warning
- [ ] Tries 2nd delete → sees upgrade prompt
- [ ] After do-over delete, can create 1 new binder

**Pro Purchase Flow:**
- [ ] Upgrade screen shows correct price
- [ ] "Buy Pro" triggers Apple/Google payment
- [ ] Successful payment → `user_tier = 'pro'`
- [ ] Can now create unlimited binders
- [ ] Can now delete binders freely
- [ ] Pro status persists across app restarts

**Restore Flow:**
- [ ] Uninstall and reinstall app
- [ ] Log in with same account
- [ ] "Restore Purchase" finds the Pro purchase
- [ ] Pro status is restored

**Edge Cases:**
- [ ] Purchase fails → stays on free, shows error
- [ ] Network error during purchase → handled gracefully
- [ ] User cancels purchase → stays on free, no error
- [ ] RevenueCat is unreachable → app still works (free mode)

**General:**
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] App doesn't crash on Pro checks


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
13. ✅ **Advanced Features** - Custom binders, extra cards, region card selection
14. ✅ **Binder Position System** - Page view, navigation, position info
15. ⏳ **Binder Edit Mode** - Partially done (select, swap, placeholder done; insert, drag-drop, region edit, position storage remaining)

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

2. **Binder Edit Mode** (Step 34): ✅ All complete
   - **Step 34E**: Insert Functionality (Plus Signs) ✅
   - **Step 34F**: Drag & Drop System ✅
   - **Step 34H**: Region Binder Edit (Simple Version Picker) ✅
   - **Step 34I**: Database Storage for Card Positions ✅

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
   - Test Phase 10 features (custom binders, extra cards, region selection)
   - Test Binder Position System (page view, navigation, jump to page)
   - Test Binder Edit Mode (select, swap, placeholder, undo/save)

6. **Production Build** (Step 25):
   - Configure EAS build
   - Create production builds for iOS and Android

7. **App Store Deployment** (Step 26):
   - Create app store listings
   - Prepare screenshots
   - Submit to App Store and Google Play

### ✅ **What's Already Working:**
- Complete authentication system (email/password + social login)
- Binder creation with comprehensive questionnaire (Master Set + Region + Custom modes)
- Card display with grid/list/binder views
- Search and filter functionality
- Progress tracking with caching
- Real API integration with TCGDEX SDK
- Comprehensive variant system (reverse holo, pokeball, masterball)
- Rate limiting and caching (5-minute cache, exponential backoff)
- Error handling throughout
- Modern, clean UI with loading states and empty states
- **Phase 10 Advanced Features (all complete):**
  - Global card search across all sets (Step 28)
  - Card picker modal with debounced search (Step 28B)
  - Custom binder mode with positional grid (Step 29)
  - Extra cards in Master Set binders with gold badge (Step 30)
  - Region mode card selection with version picker (Step 31)
  - Performance optimizations and error handling polish (Step 32)
- **Binder Position System (all complete - Step 33):**
  - Binder Page View with slot numbers
  - Page navigator with arrows and jump-to-page
  - Position info (Page X, Slot Y) in card details
  - Page headers toggle in grid view
- **Binder Edit Mode (complete - Step 34):**
  - Edit button in binder header (Step 34A)
  - Long-press enlarge preview in Grid/Binder views (Step 34A)
  - Full Binder Edit Screen with page navigation (Step 34B)
  - Tap-to-select with cross-page selection (Step 34C)
  - Card Placeholder tray with trash zone (Step 34D)
  - Insert functionality with plus signs (Step 34E)
  - Drag & drop system (Step 34F)
  - Undo stack and save system (Step 34G)
  - Region binder edit with version picker (Step 34H)
  - Database storage for card positions (Step 34I)
- **Binder Activation System (mostly complete - Step 35):**
  - Database registered_tags table with RLS (Step 35A)
  - Binder limit functions (Step 35B)
  - Activation code validation service (Step 35E)
  - Activation code entry UI screen (Step 35F)
  - Transfer binder ownership service (Step 35I)
- **Additional features:**
  - Migration system for database schema updates
  - Admin screen for fixing existing binders
  - Performance monitoring and API metrics
  - User-friendly error messages
  - Image retry logic and priority loading
  - Pokemon art style preferences (Region mode)
  - Era-based set organization
  - Persistent search cache (memory + AsyncStorage)

### 🎯 **Current State:** 
The app is **~95% complete** and fully functional for core and advanced features. You can create binders (Master Set, Region, Custom), add cards, track progress, search globally, add extra cards, select region card versions, view binder pages, edit card positions (insert, drag & drop), and activate binder codes. What remains is:
- **Phase 9** (Step 27): Premium/monetization system
- **Step 35J**: Binder limit enforcement in UI
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
- [x] **Status**: Completed (28A + 28B both done)

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
- [x] **Status**: Completed

**What we're doing:** Fully implement the Custom binder mode where users can add any cards from any set

**Current state:** Both onboarding flow and BinderDetailScreen fully implemented.

---

#### Step 29A: Update Custom Binder Creation Flow
- [x] **Status**: Completed

**What we're doing:** Add proper onboarding flow for Custom binders

**Files modified:**
- `src/components/Binder/CollectionModeSelector.tsx` - Added "Custom" option with icon ✅
- `src/screens/Onboarding/OnboardingScreen.tsx` - Added Custom mode flow (3 steps) ✅

**Custom Mode Onboarding Flow (3 steps):**
1. **Step 1**: Collection Mode - Select "Custom"
2. **Step 2**: Layout Preference - Choose 3×3 or 4×3
3. **Step 3**: Binder Name - Enter name

**What was implemented:**
- ✅ Added Custom mode option to CollectionModeSelector with icon and description
- ✅ Updated OnboardingScreen to handle Custom mode (3 steps instead of 5/6)
- ✅ Custom mode skips set selection, region selection, and variant selection
- ✅ Custom binders save with collectionMode='custom' and no variantsToTrack

**Testing:**
- [x] Custom mode appears as option in Step 1 (implemented)
- [x] Selecting Custom skips to layout preference (implemented)
- [x] Can complete Custom binder creation (implemented)
- [ ] Custom binder saved to database correctly - Ready to test
- [ ] Custom binder appears in binder list - Ready to test

---

#### Step 29B: Update BinderDetailScreen for Custom Mode
- [x] **Status**: Completed (Revised - Positional Grid)

**What we're doing:** Show a predefined grid of card slots that users can tap to add cards

**Files created/modified:**
- `database/migrations/add_position_to_binder_cards.sql` - Add position column migration
- `src/components/Card/EmptyCardSlot.tsx` - Empty slot component with "+" icon and "Add Card" text
- `src/services/supabase/cards.ts` - Added position-aware functions
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Positional grid implementation

**What was implemented:**
- ✅ **Positional Grid**: 360 slots for 3×3 layout, 480 slots for 4×3 layout
- ✅ **EmptyCardSlot Component**: Shows "+" icon with "Add Card" text and slot number
- ✅ **Position-Based Storage**: Cards stored with position in `binder_cards` table
- ✅ Cards stay in their assigned position (slot 5 is always slot 5)
- ✅ Removing a card leaves an empty slot (no shifting)
- ✅ Progress shows "📦 X / Y cards" format (e.g., "📦 5 / 360 cards")
- ✅ Tap empty slot → opens CardPickerModal with slot number in title
- ✅ Tap filled slot → removes the card from that position
- ✅ No search/filter for Custom mode (slots-based grid)
- ✅ Grid-only view (no list view for Custom mode)

**Database Changes (Run in Supabase SQL Editor):**
```sql
-- Add position column to binder_cards table
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Add index for fast position lookups
CREATE INDEX IF NOT EXISTS idx_binder_cards_position 
ON public.binder_cards(binder_id, position) 
WHERE position IS NOT NULL;

-- Add unique constraint for one card per position
CREATE UNIQUE INDEX IF NOT EXISTS idx_binder_cards_unique_position 
ON public.binder_cards(binder_id, position) 
WHERE position IS NOT NULL;
```

**New Card Service Functions:**
- `getBinderCardsWithPositions(binderId)` - Get Map<position, cardData>
- `addCardAtPosition(binderId, cardId, position, variant)` - Add card at specific slot
- `removeCardByPosition(binderId, position)` - Remove card from slot

**Testing:**
- [x] Positional grid implemented (slots 0-359 or 0-479)
- [x] EmptyCardSlot component created
- [x] Position-aware card services created
- [x] Tap empty slot opens card picker (implemented)
- [x] Tap filled slot removes card (implemented)
- [x] Progress shows "X / Y cards" format (implemented)
- [ ] Run database migration in Supabase - **Required before testing**
- [ ] Cards stay in assigned positions - Ready to test
- [ ] Removed card leaves empty slot - Ready to test
- [ ] Cards persist after app restart - Ready to test

**How to Test Step 29B:**

1. **Run the database migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `database/migrations/add_position_to_binder_cards.sql`

2. **Create Custom binder:**
   - Go through onboarding, select Custom
   - Choose 3×3 or 4×3 layout
   - Complete binder creation

3. **Test empty grid:**
   - Open the Custom binder
   - Should see grid of empty slots with "+" and "Add Card"
   - Each slot shows "Slot 1", "Slot 2", etc.
   - Progress shows "📦 0 / 360 cards" (or 480 for 4×3)

4. **Test adding cards:**
   - Tap any empty slot (e.g., Slot 5)
   - CardPickerModal opens with title "Add Card to Slot 5"
   - Search for a card (e.g., "Charizard")
   - Select a card
   - Card appears in that specific slot
   - Progress updates to "📦 1 / 360 cards"

5. **Test removing cards:**
   - Tap on a filled slot (card)
   - Card is removed, slot becomes empty again
   - Progress decreases

6. **Test position persistence:**
   - Add cards to slots 1, 5, and 10
   - Close and reopen the binder
   - Cards should still be in slots 1, 5, and 10 (not shifted)

---

### Step 30: Extra Cards in Master Set Binders
- [ ] **Status**: Not started

**What we're doing:** Allow users to add cards to a Master Set binder that aren't officially in that set

**Use case:** User wants to track a promo Pikachu card alongside their Scarlet & Violet set, even though that Pikachu isn't in the set.

---

#### Step 30A: Update Database Schema for Extra Cards
- [x] **Status**: Completed

**What we're doing:** Track which cards are "extra" (not part of official set)

**Files created:**
- `database/migrations/add_is_extra_to_binder_cards.sql` - Migration script for is_extra column

**Database Changes (Run in Supabase SQL Editor):**
```sql
-- Add is_extra column to binder_cards table
ALTER TABLE public.binder_cards
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

-- Index for filtering extra cards
CREATE INDEX IF NOT EXISTS idx_binder_cards_is_extra 
ON public.binder_cards(binder_id, is_extra);

-- Composite index for extra + owned queries
CREATE INDEX IF NOT EXISTS idx_binder_cards_extra_owned 
ON public.binder_cards(binder_id, is_extra, is_owned);
```

**What gets created:**
- `binder_cards.is_extra` - Boolean column marking cards not officially in the set (default: FALSE)
- `idx_binder_cards_is_extra` - Index for fast extra card filtering
- `idx_binder_cards_extra_owned` - Composite index for extra + owned queries

**Testing:**
- [x] Migration file created with SQL
- [ ] SQL runs without errors in Supabase - **Required before testing**
- [ ] New column appears in binder_cards table - Ready to test
- [ ] Default value is correct (FALSE) - Ready to test
- [ ] Can query extra cards for a binder - Ready to test

**How to Run Migration:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `database/migrations/add_is_extra_to_binder_cards.sql`
3. Run the migration
4. Run the verification queries to confirm it worked

---

#### Step 30B: Update Card Services for Extra Cards
- [x] **Status**: Completed

**What we're doing:** Update card services to handle extra cards

**Files modified:**
- `src/services/supabase/cards.ts` - Added functions for extra cards ✅

**Functions implemented:**
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
 * Get all extra cards with their variants in a binder
 */
export async function getExtraCardsWithVariants(
  binderId: string
): Promise<Array<{ cardId: string; variant: string | null; isOwned: boolean }>>

/**
 * Check if a card is an extra card in a binder
 */
export async function isExtraCard(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<boolean>

/**
 * Remove an extra card from a binder
 */
export async function removeExtraCardFromBinder(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<void>

/**
 * Toggle the ownership status of an extra card
 */
export async function toggleExtraCardOwnership(
  binderId: string,
  cardId: string,
  variant?: string
): Promise<boolean>
```

**What was implemented:**
- ✅ `addExtraCardToBinder()` - Adds card with `is_extra = true` flag
- ✅ `getExtraCardsInBinder()` - Returns card IDs where `is_extra = true`
- ✅ `getExtraCardsWithVariants()` - Returns full details (cardId, variant, isOwned)
- ✅ `isExtraCard()` - Checks if a specific card is marked as extra
- ✅ `removeExtraCardFromBinder()` - Removes only extra cards (not regular set cards)
- ✅ `toggleExtraCardOwnership()` - Toggles owned/missing status for extra cards
- ✅ Logging with `[30B]` prefix for debugging
- ✅ Extra cards don't affect main completion percentage (tracked separately)
- ✅ Validation to prevent adding regular set cards as extra

**Testing:**
- [x] addExtraCardToBinder() marks card as extra (implemented)
- [x] getExtraCardsInBinder() returns only extra cards (implemented)
- [x] isExtraCard() correctly identifies extra cards (implemented)
- [x] Regular cards are not marked as extra (validation added)
- [x] No TypeScript errors
- [ ] Test adding extra card to Master Set binder - Ready to test (requires Step 30A migration)
- [ ] Test removing extra card - Ready to test
- [ ] Test toggling extra card ownership - Ready to test

---

#### Step 30C: Update BinderDetailScreen for Extra Cards
- [x] **Status**: Completed

**What we're doing:** Display extra cards in Master Set binders and allow adding them

**Files created:**
- `src/components/Card/ExtraCardItem.tsx` - Extra card component with "EXTRA" badge

**Files modified:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Handle extra cards display

**UI Changes:**
- ✅ Add "Add Extra Card" button below progress bar (dashed gold border)
- ✅ Extra cards section at the bottom of the card grid (after all set cards load)
- ✅ Visual indicator for extra cards (gold "EXTRA" badge + gold border)
- ✅ Progress tracking shows: "X/Y (Z%) + W extras" format

**What was implemented:**
- ✅ ExtraCardItem component with gold border and "EXTRA" badge
- ✅ Load extra cards from database (uses getExtraCardsWithVariants)
- ✅ Extra cards appear in main grid AFTER regular set cards (not in separate section)
- ✅ 9 empty "Add Extra" slots at the end of the grid for adding more extra cards
- ✅ "Add Extra Card" button opens CardPickerModal (additional way to add)
- ✅ Can toggle extra card ownership (tap checkbox)
- ✅ Can remove extra cards (long-press → confirm dialog)
- ✅ Progress bar shows "+ W extras" if extra cards exist
- ✅ Extra cards don't affect main set completion percentage

**Testing:**
- [x] "Add Extra Card" button appears for Master Set binders (implemented)
- [x] Extra cards appear in separate section (implemented)
- [x] Extra cards have visual indicator (gold badge + border)
- [x] Progress shows "X/Y + Z extras" format (implemented)
- [x] Can add extra cards via picker (implemented)
- [x] Can remove extra cards (implemented - long-press)
- [x] Extra cards don't affect main progress percentage (implemented)
- [ ] Run database migration first - **Required before testing**
- [ ] Test adding extra card from different set - Ready to test
- [ ] Test removing extra card - Ready to test
- [ ] Test toggling extra card ownership - Ready to test

**How to Test Step 30C:**

1. **Run the database migration first:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `database/migrations/add_is_extra_to_binder_cards.sql`
   - Verify the `is_extra` column is added

2. **Open a Master Set binder:**
   - Should see normal set cards
   - Should see "Add Extra Card" button (gold dashed border)
   - Progress bar shows only set cards initially

3. **Add an extra card:**
   - Tap "➕ Add Extra Card" button
   - Search for a card from a different set (e.g., search "Pikachu")
   - Select the card
   - Scroll to bottom to see "Extra Cards" section
   - Card should appear with gold "EXTRA" badge
   - Progress should update to show "+ 1 extra"

4. **Toggle extra card ownership:**
   - Tap the checkbox on the extra card
   - Card should toggle between owned (bright) and missing (faded)

5. **Remove an extra card:**
   - Long-press on an extra card
   - Confirm the removal dialog
   - Card should disappear from extras section
   - Progress updates accordingly

6. **Check progress:**
   - Main progress (X/Y) should NOT include extra cards
   - Extra cards show separately as "+ W extras"

---

### Step 31: Region Mode Card Selection
- [ ] **Status**: Not started

**What we're doing:** Allow users to select a specific TCG card image to represent each Pokémon in Region mode

**Use case:** User taps Bulbasaur slot → sees all Bulbasaur TCG cards → selects their favorite → that card image replaces the generic Bulbasaur sprite.

---

#### Step 31A: Create Database Table for Region Card Selections
- [x] **Status**: Completed

**What we're doing:** Store which TCG card the user selected for each Pokémon slot

**Files created:**
- `database/migrations/add_region_pokemon_cards_table.sql` - Full migration script with RLS, indexes, and comments

**How to Run Migration:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `database/migrations/add_region_pokemon_cards_table.sql`
3. Run the migration
4. Run the verification queries at the bottom to confirm it worked

**What gets created:**
- `region_pokemon_cards` table with columns:
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - References auth.users
  - `binder_id` (UUID) - References binders table
  - `pokedex_number` (INTEGER) - National Pokédex number
  - `selected_card_id` (TEXT) - TCGDEX card ID
  - `created_at`, `updated_at` - Timestamps
- RLS policies for SELECT, INSERT, UPDATE, DELETE
- Indexes for fast lookups (binder_id, user_id, binder+pokedex composite)
- Unique constraint on (binder_id, pokedex_number)
- Auto-update trigger for updated_at

**Testing:**
- [x] Migration file created with comprehensive SQL
- [ ] SQL runs without errors in Supabase - **Required before testing**
- [ ] Table created successfully - Ready to test
- [ ] RLS policies applied - Ready to test
- [ ] Can insert a selection - Ready to test
- [ ] Unique constraint prevents duplicate Pokémon selections per binder - Ready to test
- [ ] Can query selections for a binder - Ready to test

---

#### Step 31B: Create Region Card Selection Service
- [x] **Status**: Completed

**What we're doing:** Create service functions for managing region card selections

**Files created:**
- `src/services/supabase/regionCards.ts` - Region card selection CRUD ✅

**Functions implemented:**
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

/**
 * Batch set multiple card selections at once (bonus function)
 */
export async function setMultipleSelectedCards(
  binderId: string,
  selections: Array<{ pokedexNumber: number; cardId: string }>
): Promise<void>

/**
 * Clear all card selections for a binder (bonus function)
 */
export async function clearAllSelectionsForBinder(
  binderId: string
): Promise<void>

/**
 * Check if a specific Pokémon has a custom card selected
 */
export async function hasSelectedCard(
  binderId: string,
  pokedexNumber: number
): Promise<boolean>

/**
 * Get the count of custom card selections for a binder
 */
export async function getSelectionCount(binderId: string): Promise<number>
```

**What was implemented:**
- ✅ `getSelectedCardForPokemon()` - Returns card ID or null for a Pokémon slot
- ✅ `setSelectedCardForPokemon()` - Saves/updates card selection (upsert)
- ✅ `getAllSelectedCardsForBinder()` - Returns Map<pokedexNumber, cardId>
- ✅ `clearSelectedCardForPokemon()` - Removes selection for single Pokémon
- ✅ `setMultipleSelectedCards()` - Batch upsert for bulk operations
- ✅ `clearAllSelectionsForBinder()` - Clears all selections (for binder reset/delete)
- ✅ `hasSelectedCard()` - Quick check if Pokémon has custom card
- ✅ `getSelectionCount()` - Count of custom selections in binder
- ✅ All functions verify user authentication and binder ownership
- ✅ All functions verify binder is Region mode (where applicable)
- ✅ Detailed logging with `[31B]` prefix for debugging
- ✅ Proper error handling (returns null/empty instead of crashing for read ops)
- ✅ Exported from `src/services/supabase/index.ts`

**Testing:**
- [x] getSelectedCardForPokemon() returns card ID or null (implemented)
- [x] setSelectedCardForPokemon() saves selection with upsert (implemented)
- [x] getAllSelectedCardsForBinder() returns all selections as Map (implemented)
- [x] clearSelectedCardForPokemon() removes selection (implemented)
- [x] No TypeScript errors ✅
- [ ] Test with real data after running Step 31A migration - Ready to test

---

#### Step 31C: Update Region Mode Display
- [x] **Status**: Completed

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
- [x] Region binder shows default sprites by default ✅
- [x] Selected cards show TCG card image instead of sprite ✅
- [x] Card selection persists after app restart ✅
- [x] Performance is acceptable (loading not too slow) ✅

---

#### Step 31D: Create Pokemon Card Picker Flow
- [x] **Status**: Complete

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
- [x] Tapping Region card opens card picker
- [x] Card picker pre-fills with Pokémon name
- [x] All cards for that Pokémon are shown
- [x] Selecting card saves to database
- [x] Binder display updates with new image
- [x] Can clear selection to revert to sprite
- [x] Visual indicator shows which Pokémon have custom cards

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
- [x] **Status**: Completed (32A ✅, 32B ✅, 32C ✅)

**What we're doing:** Final polish and integration of all custom card features

---

#### Step 32A: Unified Card Picker Experience
- [x] **Status**: Complete ✅

**What we're doing:** Ensure card picker works consistently across all features

**Files updated:**
- `src/components/CardPicker/CardPickerModal.tsx` - Improved with responsive layout, keyboard handling
- `src/components/CardPicker/CardSearchResults.tsx` - Added memoization, keyboard dismiss on scroll

**Improvements made:**
- [x] Same animation for all uses (slide up, 300ms timing)
- [x] Same search behavior (debounced, 300ms)
- [x] Same result display (memoized CardResultItem component)
- [x] Proper keyboard handling (dismiss on scroll, submit, backdrop press)
- [x] Works on all screen sizes (useWindowDimensions for responsive layout)
- [x] Performance optimizations (React.memo, FlatList tuning)
- [x] hitSlop on buttons for better touch targets

---

#### Step 32B: Performance Optimization
- [x] **Status**: Complete ✅

**What we're doing:** Optimize performance for large search results and many card selections

**Files created/updated:**
- `src/services/searchCache.ts` - New persistent search cache service
- `src/components/CardPicker/CardSearchResults.tsx` - Added lazy loading and getItemLayout
- `src/services/supabase/regionCards.ts` - Added in-memory caching for region selections
- `src/services/index.ts` - Export new search cache service

**Optimizations implemented:**
- [x] Cache search results - New `searchCache.ts` service with memory + persistent storage
  - In-memory cache for instant access (5 min)
  - Persistent storage via AsyncStorage (30 min)
  - LRU-like behavior (max 20 cached searches)
- [x] Lazy load card images in picker - Only load images for visible items
  - Uses viewability tracking to detect visible items
  - Images load with `priority: 'low'` for better performance
- [x] Batch load region card selections - Single query loads all selections
  - In-memory cache with 5 minute duration
  - Automatic cache invalidation on updates
- [x] Use React.memo for card items - `CardResultItem` is memoized
- [x] Virtualized list for search results - FlatList with optimizations:
  - `getItemLayout` for instant scroll calculations
  - `removeClippedSubviews` to free off-screen views
  - `maxToRenderPerBatch`, `windowSize`, `updateCellsBatchingPeriod` tuning

**Performance improvements:**
- Search results load instantly from cache on repeat searches
- Scrolling is smoother with fixed item height (no measurement needed)
- Images only load when visible (reduces network and memory)
- Region card selections cached for 5 minutes (fewer database queries)

---

#### Step 32C: Error Handling & Edge Cases
- [x] **Status**: Complete ✅

**What we're doing:** Handle all error cases gracefully

**Files created/updated:**
- `src/utils/errorUtils.ts` - New error utilities for classification and user-friendly messages
- `src/components/CardPicker/CardSearchResults.tsx` - Added retry button, error icons, empty state hints
- `src/hooks/useCardPicker.ts` - Added query sanitization, original error tracking
- `src/components/CardPicker/CardPickerModal.tsx` - Pass originalError and onRetry to search results
- `src/screens/CardDetail/CardDetailScreen.tsx` - Better error handling for missing cards

**Edge cases handled:**
- [x] Card no longer exists in API (deleted set) - Shows "This card is no longer available" message
- [x] Network error during search - Shows 📶 icon, user-friendly message, and "Try Again" button
- [x] Rate limit hit during search - Shows ⏳ icon, "Too many requests" message, and retry option
- [x] User tries to add same card twice - Already handled in `addExtraCardToBinder` with error message
- [x] Very long Pokémon names in search - Already using `numberOfLines={1}` with truncation
- [x] Special characters in search query - Sanitized in `useCardPicker` (removes `<>{}[]\/"|` etc.)
- [x] Empty search results - Shows 🤔 icon with helpful search tips

**Error utilities added:**
- `classifyError()` - Identifies error type (network, rate_limit, not_found, server, etc.)
- `getUserFriendlyErrorMessage()` - Returns human-readable error messages
- `canRetryError()` - Determines if retry is possible
- `sanitizeSearchQuery()` - Cleans search input of dangerous characters
- `truncateName()` - Truncates long names for display

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

### Step 33: Binder Position System (Physical Binder Organizer)
- [x] **Status**: Completed (all substeps 33A-G done)

**What we're doing:** Adding features to help users see where cards belong in their physical binder (which page and which slot). This includes a dedicated "Binder View" mode, position info in card details, and optional page headers in the grid view.

**Overview of Features:**
1. **Binder Page View** - New view mode showing one binder page at a time
2. **Jump to Page** - Tap page number to navigate to a specific page
3. **Position in Card Details** - Show "Page X, Slot Y" when viewing card details
4. **Page Headers Toggle** - Optional page separators in grid view

**Position Calculation:**
- Page = `Math.floor(cardIndex / cardsPerPage) + 1`
- Slot = `(cardIndex % cardsPerPage) + 1`
- Cards per page: 9 (for 3×3 layout) or 12 (for 4×3 layout)

---

#### Step 33A: Create Binder Page View Component
- [x] **Status**: Completed

**What we're doing:** Create the main component that displays one binder page at a time with slot numbers visible on each card.

**Files to create:**
- `src/components/Binder/BinderPageView.tsx` - Main page view component

**Component Structure:**
```tsx
interface BinderPageViewProps {
  cards: CardWithOwnership[];
  currentPage: number;
  totalPages: number;
  cardsPerPage: number; // 9 or 12
  columns: number; // 3 or 4
  cardWidth: number;
  binderId: string;
  onPageChange: (page: number) => void;
  onCardPress: (card: CardWithOwnership) => void;
}
```

**Visual Layout (3×3 example):**
```
┌───────────┬───────────┬─────────────┐
│    ①      │    ②      │    ③       │
│  [Card]   │  [Card]   │  [Card]    │
├───────────┼───────────┼─────────────┤
│    ④      │    ⑤      │    ⑥       │
│  [Card]   │  [Card]   │  [Card]    │
├───────────┼───────────┼─────────────┤
│    ⑦      │    ⑧      │    ⑨       │
│  [Card]   │  [Card]   │  [Card]    │
└───────────┴───────────┴─────────────┘
```

**Implementation Details:**
- Display slot number badge (①②③ etc.) on each card position
- Show card image with ownership indicator (same as grid view)
- Handle tap to toggle ownership
- Empty slots (for Custom binders) show slot number with "Add Card" placeholder

**Testing:**
- [x] Component renders without errors
- [x] Correct number of cards per page (9 or 12)
- [x] Slot numbers visible on each card
- [x] Cards display correctly (image, ownership indicator)
- [x] Tap toggles ownership
- [x] Empty slots handled correctly for Custom binders

---

#### Step 33B: Create Page Navigator Component
- [x] **Status**: Completed

**What we're doing:** Create the navigation bar that shows current page and allows navigation between pages.

**Files to create:**
- `src/components/Binder/PageNavigator.tsx` - Navigation bar component

**Component Structure:**
```tsx
interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onJumpToPage: () => void; // Opens jump modal
}
```

**Visual Layout:**
```
┌─────────────────────────────────────┐
│    ◄     Page 5 of 42     ►         │
└─────────────────────────────────────┘
```

**Implementation Details:**
- Left arrow button (◄) - Go to previous page (disabled on page 1)
- Right arrow button (►) - Go to next page (disabled on last page)
- Center text "Page X of Y" - Tappable to open jump-to-page modal
- Swipe left/right gesture support (optional enhancement)

**Testing:**
- [x] Component renders with correct page info
- [x] Left arrow navigates to previous page
- [x] Right arrow navigates to next page
- [x] Arrows disabled at first/last page
- [x] Tapping page number triggers onJumpToPage callback
- [x] Styling matches app theme

---

#### Step 33C: Create Jump to Page Modal
- [x] **Status**: Completed

**What we're doing:** Create a modal that lets users type a page number to jump directly to that page.

**Files to create:**
- `src/components/Binder/JumpToPageModal.tsx` - Modal for entering page number

**Component Structure:**
```tsx
interface JumpToPageModalProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  onClose: () => void;
  onJump: (pageNumber: number) => void;
}
```

**Visual Layout:**
```
┌─────────────────────────────────────┐
│         Jump to Page                │
├─────────────────────────────────────┤
│                                     │
│    Enter page number (1-42):        │
│    ┌─────────────────────────┐      │
│    │          12             │      │
│    └─────────────────────────┘      │
│                                     │
│    [Cancel]           [Go]          │
└─────────────────────────────────────┘
```

**Implementation Details:**
- Text input for page number (numeric keyboard)
- Validate input is within range (1 to totalPages)
- Show error message if invalid number entered
- "Cancel" button closes modal
- "Go" button jumps to page and closes modal
- Pressing Enter/Submit also jumps to page

**Testing:**
- [x] Modal opens and closes correctly
- [x] Input accepts only numbers
- [x] Valid page numbers work
- [x] Invalid numbers show error (too low, too high, not a number)
- [x] Cancel closes modal without navigation
- [x] Go button navigates to entered page
- [x] Keyboard dismisses after navigation

---

#### Step 33D: Add Binder View Mode to BinderDetailScreen
- [x] **Status**: Completed

**What we're doing:** Add "Binder" as a third view mode option (alongside Grid and List).

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Add Binder view mode

**Changes:**

1. **Update ViewMode type:**
```tsx
type ViewMode = 'grid' | 'list' | 'binder';
```

2. **Add view toggle button:**
```tsx
<View style={styles.viewToggle}>
  <TouchableOpacity
    style={[styles.toggleButton, viewMode === 'grid' && styles.toggleButtonActive]}
    onPress={() => setViewMode('grid')}
  >
    <Text>Grid</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
    onPress={() => setViewMode('list')}
  >
    <Text>List</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggleButton, viewMode === 'binder' && styles.toggleButtonActive]}
    onPress={() => setViewMode('binder')}
  >
    <Text>Binder</Text>
  </TouchableOpacity>
</View>
```

3. **Add state for page navigation:**
```tsx
const [currentPage, setCurrentPage] = useState(1);
const [showJumpModal, setShowJumpModal] = useState(false);

// Calculate total pages based on cards and layout
const cardsPerPage = gridColumns === 4 ? 12 : 9;
const totalPages = Math.ceil(filteredCards.length / cardsPerPage);

// Get cards for current page
const pageCards = useMemo(() => {
  const startIndex = (currentPage - 1) * cardsPerPage;
  const endIndex = startIndex + cardsPerPage;
  return filteredCards.slice(startIndex, endIndex);
}, [filteredCards, currentPage, cardsPerPage]);
```

4. **Render Binder view when selected:**
```tsx
if (viewMode === 'binder') {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView>
        <ListHeaderComponent />
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={() => setCurrentPage(p => Math.max(1, p - 1))}
          onNextPage={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          onJumpToPage={() => setShowJumpModal(true)}
        />
        <BinderPageView
          cards={pageCards}
          currentPage={currentPage}
          totalPages={totalPages}
          cardsPerPage={cardsPerPage}
          columns={gridColumns}
          cardWidth={cardWidth}
          binderId={binder.id}
          onPageChange={setCurrentPage}
          onCardPress={handleToggleCard}
        />
      </ScrollView>
      <JumpToPageModal
        visible={showJumpModal}
        currentPage={currentPage}
        totalPages={totalPages}
        onClose={() => setShowJumpModal(false)}
        onJump={(page) => {
          setCurrentPage(page);
          setShowJumpModal(false);
        }}
      />
    </SafeAreaView>
  );
}
```

**Testing:**
- [x] Three view mode buttons visible (Grid, List, Binder)
- [x] Binder mode shows page navigator
- [x] Correct cards displayed for current page
- [x] Page navigation works (arrows)
- [x] Jump to page works
- [ ] Works for Master Set binders - Ready to test
- [ ] Works for Region binders - Ready to test
- [ ] Works for Custom binders - Ready to test
- [ ] Switching between view modes preserves position (optional) - Ready to test

**How to Test Step 33D:**

1. **Open any binder:**
   - Should see view toggle with Grid, List, Binder options

2. **Switch to Binder view:**
   - Tap "Binder" button
   - Should see page navigator at top
   - Should see 9 cards (3×3) or 12 cards (4×3) per page
   - Each card should have slot number visible

3. **Test navigation:**
   - Tap right arrow (►) to go to next page
   - Tap left arrow (◄) to go back
   - Verify arrows disable at first/last page

4. **Test jump to page:**
   - Tap "Page X of Y" text
   - Modal should open
   - Enter valid page number
   - Should jump to that page

5. **Test card interaction:**
   - Tap card to toggle ownership
   - Ownership change should persist

---

#### Step 33E: Add Position Info to Card Details
- [x] **Status**: Completed

**What we're doing:** Show the card's binder position (Page X, Slot Y) when viewing card details.

**Files to modify:**
- `src/screens/CardDetail/CardDetailScreen.tsx` - Add position display
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Pass card index when navigating

**Changes to BinderDetailScreen:**

When navigating to CardDetail, pass the card's index:
```tsx
// Find card index in the full sorted list
const cardIndex = cards.findIndex(c => c.id === card.id);

navigation.navigate('CardDetail', {
  cardId: card.id,
  binderId: binder.id,
  isOwned: card.isOwned,
  cardIndex: cardIndex, // NEW
  cardsPerPage: cardsPerPage, // NEW (9 or 12)
});
```

**Changes to CardDetailScreen:**

1. **Receive new params:**
```tsx
const cardIndex = route.params?.cardIndex;
const cardsPerPage = route.params?.cardsPerPage || 9;
```

2. **Calculate position:**
```tsx
const binderPosition = useMemo(() => {
  if (cardIndex === undefined || cardIndex < 0) return null;
  
  const page = Math.floor(cardIndex / cardsPerPage) + 1;
  const slot = (cardIndex % cardsPerPage) + 1;
  
  return { page, slot };
}, [cardIndex, cardsPerPage]);
```

3. **Display position:**
```tsx
{binderPosition && (
  <View style={styles.positionContainer}>
    <Text style={styles.positionIcon}>📍</Text>
    <Text style={styles.positionText}>
      Page {binderPosition.page}, Slot {binderPosition.slot}
    </Text>
  </View>
)}
```

**Visual Layout:**
```
┌─────────────────────────────────────┐
│          [Card Image]               │
│                                     │
│  Charizard                          │
│  #006/165 · Rare Holo               │
│  Prismatic Evolutions               │
│                                     │
│  📍 Page 1, Slot 6                  │  ← NEW
│                                     │
│  Artist: Mitsuhiro Arita            │
└─────────────────────────────────────┘
```

**Testing:**
- [x] Position displays correctly for Master Set cards (implemented)
- [x] Position displays correctly for Region cards (implemented)
- [x] Position displays correctly for Custom binder cards (implemented)
- [x] Position calculation is accurate (implemented)
- [x] No position shown when cardIndex not provided (implemented)
- [x] Styling matches app theme (implemented)

**How to Test Step 33E:**

1. **Open a Master Set binder:**
   - Tap on any card to view details
   - Should see "📍 Page X, Slot Y" below card info

2. **Verify position accuracy:**
   - Note the position shown (e.g., "Page 2, Slot 5")
   - Go back to binder, switch to Binder view
   - Navigate to Page 2
   - Verify the card is in Slot 5

3. **Test with different layouts:**
   - Test with 3×3 layout binder (9 cards per page)
   - Test with 4×3 layout binder (12 cards per page)
   - Verify positions are correct for both

---

#### Step 33F: Add Page Headers Toggle to Grid View
- [x] **Status**: Completed

**What we're doing:** Add a toggle in the filter panel that shows/hides page separator headers in the grid view.

**Files to create:**
- `src/components/Binder/PageHeader.tsx` - Page header/separator component

**Files to modify:**
- `src/components/Filter/FilterPanel.tsx` - Add toggle for page breaks
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Implement sectioned grid

**PageHeader Component:**
```tsx
interface PageHeaderProps {
  pageNumber: number;
}

export default function PageHeader({ pageNumber }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>📖 Page {pageNumber}</Text>
      <View style={styles.line} />
    </View>
  );
}
```

**Visual Layout:**
```
─────────── 📖 Page 1 ───────────
[Card] [Card] [Card]
[Card] [Card] [Card]
[Card] [Card] [Card]

─────────── 📖 Page 2 ───────────
[Card] [Card] [Card]
...
```

**Changes to FilterPanel:**

Add toggle below ownership filter:
```tsx
interface FilterPanelProps {
  ownershipFilter: OwnershipFilter;
  onOwnershipFilterChange: (filter: OwnershipFilter) => void;
  showPageBreaks?: boolean; // NEW
  onShowPageBreaksChange?: (show: boolean) => void; // NEW
}

// In render:
{onShowPageBreaksChange && (
  <TouchableOpacity
    style={styles.toggleRow}
    onPress={() => onShowPageBreaksChange(!showPageBreaks)}
  >
    <Text style={styles.toggleLabel}>Show page breaks</Text>
    <Text style={styles.toggleIcon}>
      {showPageBreaks ? '☑' : '☐'}
    </Text>
  </TouchableOpacity>
)}
```

**Changes to BinderDetailScreen:**

1. **Add state:**
```tsx
const [showPageBreaks, setShowPageBreaks] = useState(false);
```

2. **Pass to FilterPanel:**
```tsx
<FilterPanel
  ownershipFilter={ownershipFilter}
  onOwnershipFilterChange={setOwnershipFilter}
  showPageBreaks={showPageBreaks}
  onShowPageBreaksChange={setShowPageBreaks}
/>
```

3. **Use SectionList when page breaks enabled:**
```tsx
// Group cards by page
const cardSections = useMemo(() => {
  if (!showPageBreaks) return null;
  
  const sections: { title: string; data: CardWithOwnership[] }[] = [];
  let currentPage = 1;
  
  for (let i = 0; i < filteredCards.length; i += cardsPerPage) {
    sections.push({
      title: `Page ${currentPage}`,
      data: filteredCards.slice(i, i + cardsPerPage),
    });
    currentPage++;
  }
  
  return sections;
}, [filteredCards, showPageBreaks, cardsPerPage]);

// Render with SectionList when enabled
if (viewMode === 'grid' && showPageBreaks && cardSections) {
  return (
    <SectionList
      sections={cardSections}
      renderSectionHeader={({ section }) => (
        <PageHeader pageNumber={parseInt(section.title.split(' ')[1])} />
      )}
      renderItem={({ item }) => (
        <CardItem card={item} ... />
      )}
      ...
    />
  );
}
```

**Testing:**
- [x] Toggle appears in filter panel (implemented)
- [x] Toggle default is OFF (no page breaks)
- [x] Turning ON shows page headers between pages (implemented with SectionList)
- [x] Turning OFF removes page headers (implemented)
- [x] Page headers show correct page numbers (implemented)
- [x] Cards still render correctly with headers (implemented)
- [ ] Performance acceptable with many pages - Ready to test
- [ ] Toggle state resets when leaving binder (or persists - choose behavior) - Ready to test

**How to Test Step 33F:**

1. **Open a Master Set binder in Grid view:**
   - Scroll down to filter area
   - Should see "☐ Show page breaks" toggle

2. **Enable page breaks:**
   - Tap the toggle (should show ☑)
   - Grid should now show page headers
   - "📖 Page 1" before first 9 cards
   - "📖 Page 2" before next 9 cards, etc.

3. **Verify accuracy:**
   - Count cards between headers
   - Should be exactly 9 (3×3) or 12 (4×3) cards per page

4. **Disable page breaks:**
   - Tap toggle again
   - Headers should disappear
   - Grid returns to normal continuous view

5. **Test with filters:**
   - Apply ownership filter (e.g., "Missing")
   - Page breaks should still work correctly with filtered cards

---

#### Step 33G: Handle Variants in Position System
- [x] **Status**: Complete

**What we're doing:** Ensure variant cards (base, reverse-holo, etc.) each have their own position displayed correctly.

**Implementation Details:**

When `variantPlacement` is "grouped":
- Pikachu (base) → Page 1, Slot 1
- Pikachu (reverse-holo) → Page 1, Slot 2
- Raichu (base) → Page 1, Slot 3
- etc.

When `variantPlacement` is "end":
- All base cards first with positions 1, 2, 3...
- All variants at end with their own positions

**No new files needed** - the existing position calculation already works because:
- Cards are already sorted with variants in correct positions
- `cardIndex` reflects the actual position in the sorted list
- Each variant is a separate card with its own index

**Testing:**
- [x] Base card shows correct position
- [x] Reverse-holo variant shows different position (next slot)
- [x] "Grouped" placement: variants adjacent to base card
- [x] "End" placement: all variants at end with correct positions
- [x] Card detail shows correct position for each variant

**How to Test Step 33G:**

1. **Create Master Set binder with variants:**
   - Select both "base" and "reverse-holo" variants
   - Choose "grouped" placement

2. **Check positions in Binder view:**
   - Card #1 base should be Slot 1
   - Card #1 reverse-holo should be Slot 2
   - Card #2 base should be Slot 3
   - etc.

3. **Check Card Details:**
   - Tap base card → shows "Page 1, Slot 1"
   - Tap reverse-holo of same card → shows "Page 1, Slot 2"

4. **Test "end" placement:**
   - Create binder with "end" variant placement
   - All base cards should have positions 1, 2, 3...
   - Variants at end should have positions continuing the sequence

---

**Overall Testing Checklist for Step 33:**
- [x] Binder view mode works (Step 33A-D) - Implemented
- [x] Page navigation works (arrows and jump) - Implemented
- [x] Position shows in Card Details (Step 33E) - Implemented
- [x] Page headers toggle works in Grid view (Step 33F) - Implemented
- [x] Variants have correct positions (Step 33G)
- [ ] Works for Master Set binders - Ready to test
- [ ] Works for Region binders - Ready to test
- [ ] Works for Custom binders - Ready to test
- [ ] Works with 3×3 layout - Ready to test
- [ ] Works with 4×3 layout - Ready to test
- [ ] No TypeScript errors - Ready to test
- [ ] No console errors - Ready to test
- [ ] Performance acceptable - Ready to test

---

### Step 34: Binder Edit Mode (Physical Binder Organizer)
- [x] **Status**: Complete ✅ (34A ✅, 34B ✅, 34C ✅, 34D ✅, 34E ✅, 34F ✅, 34G ✅, 34H ✅, 34I ✅)

**What we're doing:** Create a comprehensive binder editing system that allows users to organize their cards like a physical binder. This includes drag & drop, tap-to-select, insert functionality, and a Card Placeholder for cross-page moves.

**Overview of View Modes & Edit Button:**
```
┌─────────────────────────────────────────┐
│  My Binder                  [📝 Edit]   │  ← Edit button (new)
│                                         │
│  View: [Grid] [List] [Binder]           │  ← 3 view modes (existing)
│  Filter: [All ▼]                        │
└─────────────────────────────────────────┘
```

**Key Features:**
- **Grid View**: Visual browsing + mark owned (tap checkbox), long-press enlarges card
- **List View**: Fast tracking (no images), tap row = toggle owned, no card details
- **Binder View**: Visual binder pages + mark owned, long-press enlarges card
- **Binder Edit Mode**: Full organization (Master Set/Custom) or simple version picker (Region)

**Binder Type Differences:**

| Feature | Master Set / Custom | Region |
|---------|---------------------|--------|
| Binder Edit | Full (drag, swap, insert, placeholder) | Simple (pick versions only) |
| Card order | User arranges freely | Fixed (Pokédex order) |
| Slots | Any card anywhere | One card per Pokémon |

---

#### Step 34A: Update View Modes UI & Interactions
- [x] **Status**: Completed

**What we're doing:** Update the Grid, List, and Binder view modes to have consistent, simplified interactions. Add the "Edit" button to navigate to Binder Edit mode.

**Files to modify:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Add Edit button, update tap handlers
- `src/components/Card/CardItem.tsx` - Update tap/long-press behavior
- `src/types/navigation.ts` - Add BinderEdit screen params

**Interaction Summary:**

| Mode | Tap Card | Tap Checkbox | Long-Press | Card Details? |
|------|----------|--------------|------------|---------------|
| **Grid** | Card details | Toggle owned | Enlarge preview | ✅ Yes |
| **List** | Toggle owned | Toggle owned | - | ❌ No |
| **Binder (View)** | Card details | Toggle owned | Enlarge preview | ✅ Yes |

**Changes to BinderDetailScreen:**

1. **Add Edit button in header:**
```tsx
<View style={styles.headerRight}>
  <TouchableOpacity 
    style={styles.editButton}
    onPress={() => navigation.navigate('BinderEdit', { binderId: binder.id })}
  >
    <Text style={styles.editButtonIcon}>📝</Text>
    <Text style={styles.editButtonText}>Edit</Text>
  </TouchableOpacity>
</View>
```

2. **Update List view tap behavior:**
```tsx
// In List view, tapping the row toggles ownership (no card details)
const handleListItemPress = (card: CardWithOwnership) => {
  toggleCardOwnership(card.id, !card.isOwned);
};
```

3. **Add long-press enlarge preview for Grid/Binder:**
```tsx
const [enlargedCard, setEnlargedCard] = useState<CardWithOwnership | null>(null);

const handleLongPress = (card: CardWithOwnership) => {
  setEnlargedCard(card);
};

const handleLongPressRelease = () => {
  setEnlargedCard(null);
};

// Render enlarged card overlay
{enlargedCard && (
  <Pressable 
    style={styles.enlargeOverlay}
    onPressOut={handleLongPressRelease}
  >
    <Image 
      source={{ uri: enlargedCard.imageUrl }}
      style={styles.enlargedCard}
    />
  </Pressable>
)}
```

**Visual - Enlarged Card Preview:**
```
┌─────────────────────────────────────────┐
│  (Dimmed background)                    │
│                                         │
│     ┌───────────────────────┐           │
│     │                       │           │
│     │    Enlarged Card      │           │
│     │       Image           │           │
│     │                       │           │
│     │                       │           │
│     └───────────────────────┘           │
│                                         │
│  Release to close                       │
└─────────────────────────────────────────┘
```

**Navigation Types Update:**

```tsx
// src/types/navigation.ts
export type RootStackParamList = {
  // ... existing params
  BinderEdit: { binderId: string };
};
```

**Testing:**
- [x] Edit button visible in binder header (implemented)
- [x] Edit button navigates to BinderEdit screen (implemented)
- [x] Grid: tap card = card details, tap checkbox = toggle owned (implemented)
- [x] Grid: long-press = enlarge preview, release = close (implemented)
- [x] List: tap row = toggle owned, no card details available (implemented)
- [x] Binder: tap card = card details, tap checkbox = toggle owned (implemented)
- [x] Binder: long-press = enlarge preview, release = close (implemented)
- [ ] Checkbox position unchanged from current design - Ready to test
- [ ] No TypeScript errors - Ready to test

**How to Test Step 34A:**

1. **Open any binder:**
   - Should see "📝 Edit" button in top right
   - Tap it → should navigate to Binder Edit screen (empty for now)

2. **Test Grid view:**
   - Tap on a card image → should open card details
   - Tap on checkbox → should toggle owned status
   - Long-press card → card should enlarge
   - Release → card returns to normal

3. **Test List view:**
   - Tap anywhere on the row → should toggle owned status
   - Should NOT be able to open card details

4. **Test Binder view:**
   - Tap on a card image → should open card details
   - Tap on checkbox → should toggle owned status
   - Long-press card → card should enlarge
   - Release → card returns to normal

---

#### Step 34B: Create Binder Edit Screen (Master Set / Custom)
- [x] **Status**: Completed

**What we're doing:** Create the main Binder Edit screen with page navigation, card slots, and the Card Placeholder tray.

**Files to create:**
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Main edit screen
- `src/screens/BinderEdit/index.ts` - Export
- `src/components/BinderEdit/CardSlot.tsx` - Individual card slot component
- `src/components/BinderEdit/CardPlaceholder.tsx` - Bottom tray component
- `src/components/BinderEdit/SelectedCardBar.tsx` - Cross-page selection reminder

**Files to modify:**
- `src/navigation/AppNavigator.tsx` - Add BinderEdit screen

**Screen Layout:**
```
┌───────────────────────────────────────────┐
│  [← Back]        Page 1/20          [→]   │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │ 🃏 Charizard #6 selected   [Cancel]  │ │  ← Selection bar (when active)
│  └──────────────────────────────────────┘ │
│                                           │
│  +  ┌────┐  +  ┌────┐  +  ┌────┐  +      │  ← Plus signs for insert
│     │Card│     │Card│     │Card│          │
│     │ 1  │     │ 2  │     │ 3  │          │
│     └────┘     └────┘     └────┘          │
│                                           │
│  +  ┌────┐  +  ┌────┐  +  ┌────┐  +      │
│     │Card│     │Card│     │    │          │  ← Empty slot
│     │ 4  │     │ 5  │     │    │          │
│     └────┘     └────┘     └────┘          │
│                                           │
│  +  ┌────┐  +  ┌────┐  +  ┌────┐  +      │
│     │Card│     │    │     │    │          │
│     │ 7  │     │    │     │    │          │
│     └────┘     └────┘     └────┘          │
├═══════════════════════════════════════════┤
│  📥 CARD PLACEHOLDER                 0/18 │
│  ╔════╗  ╔════╗  ╔════╗  ╔════╗      →   │
│  ║    ║  ║    ║  ║    ║  ║    ║          │
│  ╚════╝  ╚════╝  ╚════╝  ╚════╝          │
└───────────────────────────────────────────┘
```

**BinderEditScreen Component:**

```tsx
// src/screens/BinderEdit/BinderEditScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

interface BinderEditScreenProps {}

interface CardPosition {
  cardId: string | null;
  slotIndex: number; // Global index across all pages
}

interface SelectedCard {
  cardId: string;
  cardName: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number;
}

export default function BinderEditScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { binderId } = route.params as { binderId: string };
  
  // State
  const [binder, setBinder] = useState<Binder | null>(null);
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [originalPositions, setOriginalPositions] = useState<CardPosition[]>([]);
  const [placeholderCards, setPlaceholderCards] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [undoStack, setUndoStack] = useState<CardPosition[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const cardsPerPage = binder?.layoutPreference === '4x3' ? 12 : 9;
  const totalPages = 20;
  const totalSlots = cardsPerPage * totalPages; // 360 or 480
  const placeholderMaxSlots = 18;
  
  // Load binder and card positions
  useEffect(() => {
    loadBinder();
  }, [binderId]);
  
  // Initialize binder with cards based on collection mode
  // - Master Set: Pre-populate with all cards from the set in order
  // - Custom: Start empty (user adds cards manually)
  // - Region: Pre-populate with Pokémon in Pokédex order
  const initializeBinder = async (binderData: Binder) => {
    const slotsPerPage = binderData.layoutPreference === '4x3' ? 12 : 9;
    const totalSlotCount = slotsPerPage * 20; // 20 pages
    
    // Initialize all slots
    const positions: CardPosition[] = [];
    
    if (binderData.collectionMode === 'master-set' && binderData.set) {
      // Master Set: Pre-populate with set cards in order
      let cards = await getCardsBySet(binderData.set);
      
      // Apply variant filtering if specified
      if (binderData.variantsToTrack && binderData.variantsToTrack.length > 0) {
        cards = cards.filter(card => {
          const cardVariant = card.variant || 'base';
          return binderData.variantsToTrack!.includes(cardVariant);
        });
      }
      
      // Place cards in slots (in order)
      for (let i = 0; i < totalSlotCount; i++) {
        if (i < cards.length) {
          positions.push({
            cardId: cards[i].id,
            cardName: cards[i].name,
            imageUrl: cards[i].imageUrl,
            slotIndex: i,
          });
        } else {
          positions.push({ cardId: null, slotIndex: i });
        }
      }
    } else if (binderData.collectionMode === 'region' && binderData.region) {
      // Region: Pre-populate with Pokémon in Pokédex order
      const cards = await getCardsByRegion(binderData.region, binderData.pokemonArtStyle);
      
      for (let i = 0; i < totalSlotCount; i++) {
        if (i < cards.length) {
          positions.push({
            cardId: cards[i].id,
            cardName: cards[i].name,
            imageUrl: cards[i].imageUrl,
            slotIndex: i,
          });
        } else {
          positions.push({ cardId: null, slotIndex: i });
        }
      }
    } else {
      // Custom: Start empty
      for (let i = 0; i < totalSlotCount; i++) {
        positions.push({ cardId: null, slotIndex: i });
      }
    }
    
    setCardPositions(positions);
    setOriginalPositions(positions);
  };
  
  // Handle back button - prompt to save
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasChanges) {
        showSavePrompt();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [hasChanges]);
  
  // Get cards for current page
  const currentPageCards = useMemo(() => {
    const startIndex = (currentPage - 1) * cardsPerPage;
    return cardPositions.slice(startIndex, startIndex + cardsPerPage);
  }, [cardPositions, currentPage, cardsPerPage]);
  
  // Save prompt
  const showSavePrompt = () => {
    Alert.alert(
      'Save changes?',
      'You have unsaved changes to your binder.',
      [
        { text: "Don't Save", style: 'destructive', onPress: () => navigation.goBack() },
        { text: 'Save', onPress: () => saveAndExit() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  const saveAndExit = async () => {
    await savePositions();
    navigation.goBack();
  };
  
  const handleBack = () => {
    if (hasChanges) {
      showSavePrompt();
    } else {
      navigation.goBack();
    }
  };
  
  // Card picker for adding cards to empty slots
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  
  // Handle tapping empty slot or + sign to add card
  const handleAddCardToSlot = (slotIndex: number) => {
    setTargetSlotIndex(slotIndex);
    setShowCardPicker(true);
  };
  
  // Handle card selection from picker
  const handleCardPickerSelect = (cardId: string, cardName: string) => {
    // Check if card is already placed elsewhere in the binder
    const existingSlot = cardPositions.find(pos => pos.cardId === cardId);
    
    if (existingSlot) {
      // Card already placed - show warning but allow it
      Alert.alert(
        'Card Already Placed',
        `${cardName} is already in Slot ${existingSlot.slotIndex + 1} (Page ${Math.floor(existingSlot.slotIndex / cardsPerPage) + 1}). Add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Anyway', 
            onPress: () => placeCardInSlot(cardId),
          },
        ]
      );
    } else {
      placeCardInSlot(cardId);
    }
  };
  
  const placeCardInSlot = (cardId: string) => {
    if (targetSlotIndex === null) return;
    
    saveUndoState();
    
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[targetSlotIndex].cardId = cardId;
      return newPositions;
    });
    
    setHasChanges(true);
    setShowCardPicker(false);
    setTargetSlotIndex(null);
  };
  
  // ... more implementation in following steps
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with navigation */}
      {/* Selection bar when card selected */}
      {/* Card grid with plus signs */}
      {/* Card Placeholder tray with trash zone */}
      
      {/* Card Picker Modal */}
      <CardPickerModal
        visible={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        onSelectCard={handleCardPickerSelect}
        binderType={binder?.collectionMode}
        setId={binder?.setId}
        region={binder?.region}
      />
    </SafeAreaView>
  );
}
```

**Testing:**
- [x] BinderEdit screen loads with binder data (implemented)
- [x] Shows correct number of pages (20) (implemented)
- [x] Shows correct cards per page (9 for 3×3, 12 for 4×3) (implemented)
- [x] Page navigation works (arrows) (implemented)
- [x] Jump to page works (implemented)
- [x] Card Placeholder tray visible at bottom (implemented)
- [x] Back button shows save prompt when changes made (implemented)
- [x] Master Set binder pre-populates with set cards in order (implemented)
- [x] Region binder pre-populates with Pokémon in Pokédex order (implemented)
- [x] Custom binder starts with all empty slots (implemented)
- [x] Tap empty slot → opens card picker (implemented)
- [x] Card picker shows all cards for binder type (implemented)
- [x] Selecting card places it in slot (implemented)
- [ ] Duplicate card warning shown when placing card that exists elsewhere - Ready to test
- [ ] "Add Anyway" places duplicate card - Ready to test
- [ ] No TypeScript errors - Ready to test

**How to Test Step 34B:**

1. **Navigate to Binder Edit:**
   - Open any Master Set or Custom binder
   - Tap "📝 Edit" button
   - Should see Binder Edit screen

2. **Verify layout:**
   - Should see 9 cards (3×3) or 12 cards (4×3) per page
   - Should see page navigator at top
   - Should see Card Placeholder tray at bottom

3. **Test navigation:**
   - Tap arrows to change pages
   - Tap page number to jump

4. **Test save prompt:**
   - Make no changes, tap back → should exit immediately
   - (After implementing changes) Make changes, tap back → should see prompt

5. **Test Master Set pre-population:**
   - Create/open a Master Set binder
   - Open Binder Edit → cards should be pre-populated in set order
   - First card in set should be in slot 1, etc.

6. **Test Custom binder (empty start):**
   - Create/open a Custom binder
   - Open Binder Edit → all slots should be empty

7. **Test adding cards:**
   - Tap an empty slot → card picker opens
   - Search/select a card → card placed in slot
   - Add the same card to another slot → should see warning
   - Tap "Add Anyway" → card placed (duplicate allowed)

---

#### Step 34C: Implement Tap-to-Select System
- [x] **Status**: Completed

**What we're doing:** Implement the tap-to-select interaction where tapping a card selects it (glowing border), then tapping a destination moves/swaps/inserts the card. Selection persists across pages.

**Files to modify:**
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Add selection logic
- `src/components/BinderEdit/CardSlot.tsx` - Add selected state styling
- `src/components/BinderEdit/SelectedCardBar.tsx` - Show selected card info

**Selection States:**

| State | Visual |
|-------|--------|
| Normal | Default card appearance |
| Selected | Glowing border (gold/yellow) |
| Empty slot | Dashed border, slightly dimmed |
| Missing card | Grayed out / transparent |

**SelectedCardBar Component (with Remove button):**
```tsx
// src/components/BinderEdit/SelectedCardBar.tsx
interface SelectedCardBarProps {
  cardName: string;
  onRemove: () => void;
  onCancel: () => void;
}

export default function SelectedCardBar({ cardName, onRemove, onCancel }: SelectedCardBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🃏</Text>
      <Text style={styles.text}>{cardName} selected</Text>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Text style={styles.removeText}>🗑️ Remove</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelText: {
    color: '#888',
    fontSize: 12,
  },
});
```

**Selection Logic:**
```tsx
// In BinderEditScreen
const handleSlotPress = (slotIndex: number, cardId: string | null) => {
  if (selectedCard) {
    // A card is already selected - perform action
    if (slotIndex === selectedCard.sourceSlot) {
      // Tapped same card - deselect
      setSelectedCard(null);
    } else if (cardId) {
      // Tapped another card - swap
      performSwap(selectedCard.sourceSlot, slotIndex);
      setSelectedCard(null);
    } else {
      // Tapped empty slot - move
      performMove(selectedCard.sourceSlot, slotIndex);
      setSelectedCard(null);
    }
  } else {
    // No card selected - select this one (if it has a card)
    if (cardId) {
      const card = getCardById(cardId);
      setSelectedCard({
        cardId,
        cardName: card?.name || 'Unknown Card',
        sourceSlot: slotIndex,
        sourceIndex: slotIndex,
      });
    }
  }
};

const handleEmptySpacePress = () => {
  // Deselect current card
  setSelectedCard(null);
};

const handleCancelSelection = () => {
  setSelectedCard(null);
};
```

**Cross-Page Selection:**
```tsx
// Selection persists when changing pages
const handlePageChange = (newPage: number) => {
  // Keep selectedCard state - don't reset it
  setCurrentPage(newPage);
};

// When rendering, show selection bar if card is selected
{selectedCard && (
  <SelectedCardBar
    cardName={selectedCard.cardName}
    onRemove={handleRemoveCard}
    onCancel={handleCancelSelection}
  />
)}
```

**Remove Card Functionality:**
```tsx
// Remove card from slot (via selection bar button)
const handleRemoveCard = () => {
  if (!selectedCard) return;
  
  // Show confirmation dialog
  Alert.alert(
    'Remove Card',
    `Remove ${selectedCard.cardName} from this slot?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: () => performRemoveCard(),
      },
    ]
  );
};

const performRemoveCard = () => {
  if (!selectedCard) return;
  
  // Save undo state
  saveUndoState();
  
  if (selectedCard.sourceSlot === 'placeholder') {
    // Remove from placeholder
    setPlaceholderCards(prev => 
      prev.filter((_, i) => i !== selectedCard.sourceIndex)
    );
  } else {
    // Remove from binder slot - slot becomes empty
    setCardPositions(prev => {
      const newPositions = [...prev];
      newPositions[selectedCard.sourceSlot as number].cardId = null;
      return newPositions;
    });
  }
  
  setHasChanges(true);
  setSelectedCard(null);
};
```

**Swap Logic:**
```tsx
const performSwap = (sourceSlot: number, targetSlot: number) => {
  // Save current state for undo
  saveUndoState();
  
  setCardPositions(prev => {
    const newPositions = [...prev];
    const temp = newPositions[sourceSlot].cardId;
    newPositions[sourceSlot].cardId = newPositions[targetSlot].cardId;
    newPositions[targetSlot].cardId = temp;
    return newPositions;
  });
  
  setHasChanges(true);
};

const performMove = (sourceSlot: number, targetSlot: number) => {
  // Save current state for undo
  saveUndoState();
  
  setCardPositions(prev => {
    const newPositions = [...prev];
    newPositions[targetSlot].cardId = newPositions[sourceSlot].cardId;
    newPositions[sourceSlot].cardId = null;
    return newPositions;
  });
  
  setHasChanges(true);
};
```

**CardSlot Styling:**
```tsx
// src/components/BinderEdit/CardSlot.tsx
const styles = StyleSheet.create({
  slot: {
    width: slotSize,
    height: slotSize * 1.4, // Card aspect ratio
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selected: {
    borderWidth: 3,
    borderColor: '#FFD700', // Gold
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#666',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  missing: {
    opacity: 0.5,
  },
});
```

**Testing:**
- [x] Tap card → card gets selected (glowing border) (implemented)
- [x] Selection bar appears with card name, Remove button, and Cancel button (implemented)
- [x] Tap same card → deselects (implemented)
- [x] Tap empty space → deselects (implemented)
- [x] Tap Cancel button → deselects (implemented)
- [x] Tap another card → cards swap positions (implemented)
- [x] Tap empty slot → card moves there (implemented)
- [x] Navigate to different page → selection persists (implemented)
- [x] Selection bar still visible on different page (implemented)
- [x] Swap/move works across pages (implemented)
- [x] hasChanges flag updates correctly (implemented)
- [x] Tap Remove button → shows confirmation dialog (implemented)
- [ ] Confirm remove → card removed, slot becomes empty - Ready to test
- [ ] Cancel remove → card stays in place - Ready to test

**How to Test Step 34C:**

1. **Test selection:**
   - Tap any card → should see glowing border
   - Should see selection bar: "🃏 Charizard #6 selected [🗑️ Remove] [Cancel]"

2. **Test deselection:**
   - Tap same card → deselects
   - Tap empty space → deselects
   - Tap Cancel → deselects

3. **Test swap:**
   - Select card A
   - Tap card B
   - Cards should swap positions

4. **Test move:**
   - Select a card
   - Tap empty slot
   - Card should move, leaving empty slot behind

5. **Test cross-page:**
   - Select a card on Page 1
   - Navigate to Page 5
   - Selection bar still visible
   - Tap a card on Page 5 → should swap across pages

6. **Test remove (via button):**
   - Select a card
   - Tap "🗑️ Remove" button in selection bar
   - Should see confirmation: "Remove Charizard from this slot?"
   - Tap "Remove" → card removed, slot empty
   - Tap "Cancel" → card stays

---

#### Step 34D: Implement Card Placeholder Tray & Trash Zone
- [x] **Status**: Completed

**What we're doing:** Create the Card Placeholder tray at the bottom of the screen for temporarily holding cards during reorganization. Also add a Trash Zone for permanently removing cards from slots.

**Files to create/modify:**
- `src/components/BinderEdit/CardPlaceholder.tsx` - The tray component with trash zone

**Visual Design:**
```
┌══════════════════════════════════════════════════════════┐
│  📥 CARD PLACEHOLDER  3/18              🗑️ REMOVE       │
│  ╔════╗ ╔════╗ ╔════╗ ╔════╗  →      ┌ ─ ─ ─ ─ ─ ┐     │
│  ║Card║ ║Card║ ║Card║ ║    ║         │  Drop to  │     │
│  ║ A  ║ ║ B  ║ ║ C  ║ ║    ║         │  Remove   │     │
│  ╚════╝ ╚════╝ ╚════╝ ╚════╝         └ ─ ─ ─ ─ ─ ┘     │
└══════════════════════════════════════════════════════════┘

When dragging (invite effect):
┌══════════════════════════════════════════════════════════┐
│  📥 CARD PLACEHOLDER  ✨ Drop here! ✨ 3/18  🗑️ REMOVE ✨│
│  ╔════╗ ╔════╗ ╔════╗ ╔════╗        ╔═══════════════╗   │
│  ║ ✨ ║ ║Card║ ║Card║ ║ ✨ ║        ║  ✨ Drop to  ✨║   │
│  ║    ║ ║ B  ║ ║ C  ║ ║    ║        ║    Remove     ║   │
│  ╚════╝ ╚════╝ ╚════╝ ╚════╝        ╚═══════════════╝   │
└──────────────────────────────────────────────────────────┘
```

**Placeholder Full Handling:**
When placeholder is full (18/18) and user tries to add another card:
- Show message: "Placeholder is full (18/18)"
- Block the action
- User must remove cards from placeholder first

**CardPlaceholder Component (with Trash Zone):**
```tsx
// src/components/BinderEdit/CardPlaceholder.tsx
interface CardPlaceholderProps {
  cards: string[]; // Card IDs in placeholder
  maxSlots: number; // 18
  visibleSlots: number; // 3 or 4 based on layout
  onSlotPress: (index: number, cardId: string | null) => void;
  onInsertBetween: (index: number) => void;
  onTrashDrop: () => void; // Called when card dropped on trash
  isDragging: boolean;
  selectedCardId: string | null;
}

export default function CardPlaceholder({
  cards,
  maxSlots,
  visibleSlots,
  onSlotPress,
  onInsertBetween,
  onTrashDrop,
  isDragging,
  selectedCardId,
}: CardPlaceholderProps) {
  // Create slots array (cards + empty slots up to visible amount)
  const slots = useMemo(() => {
    const result: (string | null)[] = [...cards];
    while (result.length < Math.max(visibleSlots, cards.length + 1)) {
      result.push(null);
    }
    return result.slice(0, maxSlots);
  }, [cards, visibleSlots, maxSlots]);
  
  const isFull = cards.length >= maxSlots;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>📥</Text>
        <Text style={styles.title}>CARD PLACEHOLDER</Text>
        {isDragging && !isFull && (
          <Text style={styles.dropHint}>✨ Drop here! ✨</Text>
        )}
        <Text style={[styles.counter, isFull && styles.counterFull]}>
          {cards.length}/{maxSlots}
        </Text>
      </View>
      
      <View style={styles.contentRow}>
        {/* Placeholder slots */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
        >
          {slots.map((cardId, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.slot,
                !cardId && styles.emptySlot,
                isDragging && !isFull && styles.inviteSlot,
                selectedCardId === cardId && styles.selectedSlot,
              ]}
              onPress={() => onSlotPress(index, cardId)}
            >
              {cardId ? (
                <CardImage cardId={cardId} size="small" />
              ) : (
                <View style={styles.emptySlotContent}>
                  <Text style={styles.emptyIcon}>+</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Trash Zone */}
        <TouchableOpacity
          style={[
            styles.trashZone,
            isDragging && styles.trashZoneActive,
          ]}
          onPress={onTrashDrop}
        >
          <Text style={styles.trashIcon}>🗑️</Text>
          <Text style={styles.trashText}>
            {isDragging ? 'Drop to\nRemove' : 'REMOVE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

**Placeholder Full Handling:**
```tsx
// In BinderEditScreen - when trying to move to placeholder
const performMoveToPlaceholder = (card: SelectedCard, targetIndex: number) => {
  // Check if placeholder is full
  if (placeholderCards.length >= placeholderMaxSlots) {
    Alert.alert(
      'Placeholder Full',
      'The placeholder is full (18/18). Remove some cards first.',
      [{ text: 'OK' }]
    );
    return;
  }
  
  // Save undo state
  saveUndoState();
  
  // ... rest of move logic
};
```

**Trash Zone Remove Logic:**
```tsx
// Handle dropping card on trash zone (via drag & drop)
const handleTrashDrop = () => {
  if (!draggedCard) return;
  
  // Show confirmation
  const cardName = getCardById(draggedCard.cardId)?.name || 'this card';
  Alert.alert(
    'Remove Card',
    `Remove ${cardName} from this slot?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: () => {
          saveUndoState();
          
          if (draggedCard.sourceSlot === 'placeholder') {
            setPlaceholderCards(prev => 
              prev.filter((_, i) => i !== draggedCard.sourceIndex)
            );
          } else {
            setCardPositions(prev => {
              const newPositions = [...prev];
              newPositions[draggedCard.sourceSlot as number].cardId = null;
              return newPositions;
            });
          }
          
          setHasChanges(true);
        },
      },
    ]
  );
};
```

**Styles:**
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  dropHint: {
    color: '#FFD700',
    fontSize: 12,
    marginRight: 8,
  },
  counter: {
    color: '#666',
    fontSize: 12,
  },
  counterFull: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 8,
  },
  slot: {
    width: 60,
    height: 84,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#444',
    backgroundColor: '#2a2a3e',
    overflow: 'hidden',
  },
  emptySlot: {
    borderStyle: 'dashed',
    borderColor: '#555',
  },
  inviteSlot: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  selectedSlot: {
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  emptySlotContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    color: '#555',
    fontSize: 24,
  },
  // Trash Zone styles
  trashZone: {
    width: 70,
    height: 84,
    marginHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#666',
    backgroundColor: '#2a2a3e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashZoneActive: {
    borderColor: '#ff4444',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    shadowColor: '#ff4444',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  trashIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  trashText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
});
```

**Integration with BinderEditScreen:**
```tsx
// In BinderEditScreen
const handlePlaceholderSlotPress = (index: number, cardId: string | null) => {
  if (selectedCard) {
    if (selectedCard.sourceSlot === 'placeholder' && selectedCard.sourceIndex === index) {
      // Tapped same card - deselect
      setSelectedCard(null);
    } else if (cardId) {
      // Swap with placeholder card
      performPlaceholderSwap(selectedCard, index);
      setSelectedCard(null);
    } else {
      // Move to empty placeholder slot
      performMoveToPlaceholder(selectedCard, index);
      setSelectedCard(null);
    }
  } else if (cardId) {
    // Select placeholder card
    const card = getCardById(cardId);
    setSelectedCard({
      cardId,
      cardName: card?.name || 'Unknown Card',
      sourceSlot: 'placeholder',
      sourceIndex: index,
    });
  }
};
```

**Testing:**
- [x] Card Placeholder tray visible at bottom (implemented)
- [x] Trash Zone visible next to placeholder (implemented)
- [x] Shows correct count (X/18) (implemented)
- [x] Counter turns red when full (18/18) (implemented)
- [x] Scrollable when more than visible slots (implemented)
- [x] Tap placeholder slot with card → selects it (implemented)
- [x] Tap empty placeholder slot with card selected → moves card there (implemented)
- [x] Swap between binder and placeholder works (implemented)
- [x] Swap within placeholder works (implemented)
- [ ] Invite effect shows when dragging (requires Step 34F drag implementation)
- [x] Tray style looks like "holding tray" (implemented)
- [ ] Placeholder full → shows "Placeholder is full" message - Ready to test
- [ ] Trash zone highlights when dragging (requires Step 34F drag implementation)
- [ ] Drop on trash → shows confirmation dialog - Ready to test
- [ ] Confirm remove → card removed from slot - Ready to test

**How to Test Step 34D:**

1. **Verify placeholder appearance:**
   - Should see tray at bottom with "📥 CARD PLACEHOLDER" header
   - Should show "0/18" counter
   - Should have 3-4 visible empty slots
   - Should see "🗑️ REMOVE" trash zone on the right

2. **Test interactions:**
   - Select a binder card
   - Tap empty placeholder slot → card moves to placeholder
   - Counter updates to "1/18"
   - Tap placeholder card → selects it
   - Tap binder slot → card returns to binder

3. **Test scrolling:**
   - Add multiple cards to placeholder
   - Should be able to scroll horizontally
   - Should see scroll indicator or shadow

4. **Test placeholder full:**
   - Add 18 cards to placeholder
   - Counter shows "18/18" in red
   - Try to add another card → should see "Placeholder is full" message

5. **Test trash zone (via drag):**
   - Long-press and drag a card toward trash zone
   - Trash zone should glow/highlight
   - Drop on trash → confirmation dialog
   - Confirm → card removed, slot empty

---

#### Step 34E: Implement Insert Functionality (Plus Signs)
- [x] **Status**: Complete ✅

**What we're doing:** Add plus signs between cards that allow inserting a card, pushing other cards to the right.

**Visual Layout:**
```
+  ┌────┐  +  ┌────┐  +  ┌────┐  +
   │ A  │     │ B  │     │ C  │
   └────┘     └────┘     └────┘

User inserts X at second + sign:

+  ┌────┐  +  ┌────┐  +  ┌────┐  +
   │ A  │     │ X  │     │ B  │
   └────┘     └────┘     └────┘
                         ↑ C pushed to next row/page
```

**Files to create/modify:**
- `src/components/BinderEdit/InsertButton.tsx` - Plus sign button
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Add insert logic

**InsertButton Component:**
```tsx
// src/components/BinderEdit/InsertButton.tsx
interface InsertButtonProps {
  onPress: () => void;
  isActive: boolean; // Show when card is selected
  isHighlighted: boolean; // Glow when dragging nearby
}

export default function InsertButton({ onPress, isActive, isHighlighted }: InsertButtonProps) {
  if (!isActive) {
    return <View style={styles.spacer} />;
  }
  
  return (
    <TouchableOpacity 
      style={[styles.button, isHighlighted && styles.highlighted]}
      onPress={onPress}
    >
      <Text style={styles.icon}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  spacer: {
    width: 20,
  },
  button: {
    width: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 4,
  },
  highlighted: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
  },
  icon: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Insert Logic:**
```tsx
const performInsert = (insertAtIndex: number) => {
  // Save undo state
  saveUndoState();
  
  if (!selectedCard) return;
  
  const sourceCardId = selectedCard.cardId;
  
  setCardPositions(prev => {
    const newPositions = [...prev];
    
    // Remove card from source
    if (selectedCard.sourceSlot === 'placeholder') {
      // Remove from placeholder
      setPlaceholderCards(p => p.filter((_, i) => i !== selectedCard.sourceIndex));
    } else {
      // Remove from binder slot
      newPositions[selectedCard.sourceSlot as number].cardId = null;
    }
    
    // Shift cards right from insert point
    for (let i = newPositions.length - 1; i > insertAtIndex; i--) {
      newPositions[i].cardId = newPositions[i - 1].cardId;
    }
    
    // Insert the card
    newPositions[insertAtIndex].cardId = sourceCardId;
    
    return newPositions;
  });
  
  setHasChanges(true);
  setSelectedCard(null);
};

// Handle overflow to next page
const handleOverflow = () => {
  // Last card on binder gets pushed to Card Placeholder
  const lastCardId = cardPositions[cardPositions.length - 1].cardId;
  if (lastCardId && placeholderCards.length < 18) {
    setPlaceholderCards(prev => [...prev, lastCardId]);
  } else if (lastCardId) {
    // Binder is full!
    Alert.alert('Binder is full', 'Cannot insert - all slots are occupied.');
    return false;
  }
  return true;
};
```

**Row Layout with Plus Signs:**
```tsx
// Render a row of cards with plus signs
const renderRow = (rowCards: CardPosition[], rowStartIndex: number) => {
  const columnsPerRow = binder?.layoutPreference === '4x3' ? 4 : 3;
  
  return (
    <View style={styles.row}>
      {/* Plus sign at start of row */}
      <InsertButton
        onPress={() => performInsert(rowStartIndex)}
        isActive={!!selectedCard}
        isHighlighted={false}
      />
      
      {rowCards.map((slot, colIndex) => (
        <React.Fragment key={slot.slotIndex}>
          <CardSlot
            cardId={slot.cardId}
            slotIndex={slot.slotIndex}
            isSelected={selectedCard?.sourceSlot === slot.slotIndex}
            onPress={() => handleSlotPress(slot.slotIndex, slot.cardId)}
          />
          
          {/* Plus sign after each card */}
          <InsertButton
            onPress={() => performInsert(rowStartIndex + colIndex + 1)}
            isActive={!!selectedCard}
            isHighlighted={false}
          />
        </React.Fragment>
      ))}
    </View>
  );
};
```

**Testing:**
- [ ] Plus signs appear between cards when card is selected
- [ ] Plus signs hidden when no card selected
- [ ] Plus sign at start of each row
- [ ] Plus sign at end of each row
- [ ] Tap plus sign → card inserted at that position
- [ ] Cards shift right after insert
- [ ] Overflow pushes to next page
- [ ] Overflow from last page pushes to Card Placeholder
- [ ] Full binder shows "Binder is full" message

**How to Test Step 34E:**

1. **Verify plus signs appear:**
   - Select any card
   - Should see "+" buttons appear between all cards

2. **Test insert:**
   - Select card A
   - Tap "+" between cards B and C
   - Order should be: B, A, C (A inserted, C shifted right)

3. **Test overflow:**
   - Fill up page 1
   - Insert card at start of page 1
   - Last card should move to page 2

4. **Test full binder:**
   - Fill all 360/480 slots
   - Try to insert
   - Should see "Binder is full" message

---

#### Step 34F: Implement Drag & Drop System
- [x] **Status**: Complete ✅

**What we're doing:** Implement long-press drag & drop for moving, swapping, and inserting cards.

**Files to modify:**
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Add drag handling
- `src/components/BinderEdit/CardSlot.tsx` - Add drag source/target
- `src/components/BinderEdit/CardPlaceholder.tsx` - Add drag target

**Drag Behaviors:**

| Drag Action | Result |
|-------------|--------|
| Drag onto another card | Swap positions |
| Drag to empty slot | Move to that slot |
| Drag between two cards | Insert (shift right) |
| Drag to Card Placeholder | Move to placeholder |
| Drag from Placeholder to binder | Insert/swap/move |
| Drag to Trash Zone | Remove card (with confirmation) |

**Using React Native Gesture Handler:**
```tsx
import { GestureHandlerRootView, PanGestureHandler, LongPressGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Dragging state
const [draggedCard, setDraggedCard] = useState<DraggedCard | null>(null);
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);

interface DraggedCard {
  cardId: string;
  sourceSlot: number | 'placeholder';
  sourceIndex: number;
  startX: number;
  startY: number;
}

const handleLongPressStart = (card: CardPosition, event: any) => {
  setDraggedCard({
    cardId: card.cardId!,
    sourceSlot: card.slotIndex,
    sourceIndex: card.slotIndex,
    startX: event.absoluteX,
    startY: event.absoluteY,
  });
};

const handleDrag = (event: any) => {
  if (!draggedCard) return;
  translateX.value = event.translationX;
  translateY.value = event.translationY;
};

const handleDragEnd = (event: any) => {
  if (!draggedCard) return;
  
  // Determine drop target based on position
  const dropTarget = getDropTargetAtPosition(
    draggedCard.startX + event.translationX,
    draggedCard.startY + event.translationY
  );
  
  if (dropTarget) {
    if (dropTarget.type === 'card') {
      performSwap(draggedCard.sourceSlot, dropTarget.slotIndex);
    } else if (dropTarget.type === 'empty') {
      performMove(draggedCard.sourceSlot, dropTarget.slotIndex);
    } else if (dropTarget.type === 'insert') {
      performInsert(dropTarget.insertIndex);
    } else if (dropTarget.type === 'placeholder') {
      performMoveToPlaceholder(draggedCard, dropTarget.index);
    } else if (dropTarget.type === 'trash') {
      // Handle trash drop with confirmation
      handleTrashDrop();
    }
  }
  
  // Reset drag state
  translateX.value = withSpring(0);
  translateY.value = withSpring(0);
  setDraggedCard(null);
};

// Dragged card visual (floating above everything)
const animatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateX: translateX.value },
    { translateY: translateY.value },
  ],
}));

{draggedCard && (
  <Animated.View style={[styles.draggedCard, animatedStyle]}>
    <CardImage cardId={draggedCard.cardId} />
  </Animated.View>
)}
```

**Drop Target Detection:**
```tsx
// Use layout measurements to detect what's under the drag
const slotRefs = useRef<Map<number, { x: number; y: number; width: number; height: number }>>(new Map());

const getDropTargetAtPosition = (x: number, y: number): DropTarget | null => {
  // Check each slot
  for (const [index, layout] of slotRefs.current.entries()) {
    if (
      x >= layout.x && x <= layout.x + layout.width &&
      y >= layout.y && y <= layout.y + layout.height
    ) {
      const cardId = cardPositions[index]?.cardId;
      return {
        type: cardId ? 'card' : 'empty',
        slotIndex: index,
      };
    }
    
    // Check insert zones (between cards)
    // ...
  }
  
  // Check placeholder area
  // ...
  
  return null;
};
```

**Testing:**
- [ ] Long-press card → card "lifts" and follows finger
- [ ] Drag onto another card → swap
- [ ] Drag to empty slot → move
- [ ] Drag between cards → insert (when insert zones detected)
- [ ] Drag to Card Placeholder → move to placeholder
- [ ] Drag from Placeholder to binder → works
- [ ] Drag to Trash Zone → shows confirmation, removes card
- [ ] Release in invalid area → card returns to original position
- [ ] Visual feedback during drag (card follows finger, slots highlight)
- [ ] Invite effect on Card Placeholder when dragging
- [ ] Trash Zone highlights red when dragging near it

**How to Test Step 34F:**

1. **Test drag initiation:**
   - Long-press any card
   - Card should "lift" and follow your finger

2. **Test swap:**
   - Drag card A onto card B
   - They should swap positions

3. **Test move:**
   - Drag card to empty slot
   - Card should move there

4. **Test placeholder:**
   - Drag card down to Card Placeholder
   - Card should appear in placeholder
   - Drag card from placeholder to binder slot

5. **Test trash zone:**
   - Drag card toward Trash Zone
   - Zone should glow red
   - Drop on trash → confirmation dialog
   - Confirm → card removed

6. **Test cancel:**
   - Start dragging, release in empty space
   - Card should return to original position

---

#### Step 34G: Implement Undo & Save System
- [x] **Status**: Completed

**What we're doing:** Add undo functionality and save confirmation when exiting.

**Files to modify:**
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Add undo logic and save

**Undo Stack:**
```tsx
const [undoStack, setUndoStack] = useState<UndoState[]>([]);
const maxUndoSteps = 10;

interface UndoState {
  cardPositions: CardPosition[];
  placeholderCards: string[];
}

const saveUndoState = () => {
  setUndoStack(prev => {
    const newStack = [...prev, {
      cardPositions: [...cardPositions],
      placeholderCards: [...placeholderCards],
    }];
    // Keep only last N states
    return newStack.slice(-maxUndoSteps);
  });
};

const performUndo = () => {
  if (undoStack.length === 0) return;
  
  const lastState = undoStack[undoStack.length - 1];
  setCardPositions(lastState.cardPositions);
  setPlaceholderCards(lastState.placeholderCards);
  setUndoStack(prev => prev.slice(0, -1));
};
```

**Undo Button:**
```tsx
// In Card Placeholder header
<TouchableOpacity 
  onPress={performUndo}
  disabled={undoStack.length === 0}
  style={[styles.undoButton, undoStack.length === 0 && styles.undoDisabled]}
>
  <Text style={styles.undoText}>↩ Undo</Text>
</TouchableOpacity>
```

**Save Logic:**
```tsx
const savePositions = async () => {
  try {
    // Save to database
    await updateBinderCardPositions(binderId, cardPositions);
    setOriginalPositions([...cardPositions]);
    setHasChanges(false);
    setUndoStack([]);
  } catch (error) {
    Alert.alert('Error', 'Failed to save changes. Please try again.');
  }
};

// Save prompt on exit
const showSavePrompt = () => {
  Alert.alert(
    'Save changes?',
    'You have unsaved changes to your binder.',
    [
      { 
        text: "Don't Save", 
        style: 'destructive', 
        onPress: () => navigation.goBack() 
      },
      { 
        text: 'Save', 
        onPress: async () => {
          await savePositions();
          navigation.goBack();
        }
      },
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
    ]
  );
};
```

**Visual - Card Placeholder with Undo:**
```
┌═══════════════════════════════════════════┐
│  📥 CARD PLACEHOLDER   [↩ Undo]      3/18 │
│  ╔════╗  ╔════╗  ╔════╗  ╔════╗      →   │
│  ║Card║  ║Card║  ║Card║  ║    ║          │
│  ╚════╝  ╚════╝  ╚════╝  ╚════╝          │
└═══════════════════════════════════════════┘
```

**Testing:**
- [x] Undo button visible in Card Placeholder header (implemented)
- [x] Undo disabled when no actions to undo (implemented)
- [x] Undo reverts last action (implemented)
- [x] Multiple undos work (up to 10) (implemented)
- [x] Back button shows save prompt when changes exist (implemented)
- [x] "Save" saves changes and exits (implemented)
- [x] "Don't Save" discards changes and exits (implemented)
- [x] "Cancel" stays on edit screen (implemented)
- [x] Android back button triggers save prompt (implemented)

**How to Test Step 34G:**

1. **Test undo:**
   - Move a card
   - Tap "Undo"
   - Card should return to original position
   - Do multiple actions, undo each one

2. **Test save prompt:**
   - Make some changes
   - Tap back button
   - Should see "Save changes?" dialog

3. **Test save:**
   - Make changes, tap Save
   - Exit and re-enter binder edit
   - Changes should persist

4. **Test don't save:**
   - Make changes, tap "Don't Save"
   - Re-enter binder edit
   - Changes should be gone

---

#### Step 34H: Region Binder Edit (Simple Version Picker)
- [x] **Status**: Complete ✅

**What we're doing:** Create a simplified Binder Edit mode for Region binders that only allows picking which version of each Pokémon card to display.

**Differences from Master Set/Custom:**

| Feature | Master Set / Custom | Region |
|---------|---------------------|--------|
| Card order | User arranges | Fixed (Pokédex order) |
| Tap card | Select (glow) | Open version picker |
| Drag & drop | ✅ Yes | ❌ No |
| Card Placeholder | ✅ Yes | ❌ No |
| Plus signs (insert) | ✅ Yes | ❌ No |

**Files to modify:**
- `src/screens/BinderEdit/BinderEditScreen.tsx` - Add Region mode branch

**Region Mode Layout:**
```
┌───────────────────────────────────────────┐
│  [← Back]     Kanto - Page 1/17     [→]   │
│                                           │
│  ┌────────┐  ┌────────┐  ┌────────┐      │
│  │ #001   │  │ #002   │  │ #003   │      │
│  │ 🌿     │  │ 🌿     │  │ 🌿     │      │
│  │Bulba-  │  │Ivy-    │  │Venu-   │      │
│  │saur    │  │saur    │  │saur    │      │
│  └────────┘  └────────┘  └────────┘      │
│                                           │
│  Tap a Pokémon to choose a card version   │
└───────────────────────────────────────────┘
```

**Region Mode Logic:**
```tsx
// In BinderEditScreen
if (binder.collectionMode === 'region') {
  return <RegionBinderEditView binder={binder} />;
}

// RegionBinderEditView
const handlePokemonTap = async (pokemon: PokemonSlot) => {
  // Open card picker for this Pokémon
  setCardPickerPokemon(pokemon);
  setShowCardPicker(true);
};

const handleCardSelected = async (cardId: string) => {
  // Save selection
  await setSelectedCardForPokemon(binderId, pokemon.pokedexNumber, cardId);
  setShowCardPicker(false);
  // Refresh display
  await loadBinder();
};

const handleClearSelection = async (pokemon: PokemonSlot) => {
  await clearSelectedCardForPokemon(binderId, pokemon.pokedexNumber);
  await loadBinder();
};
```

**Testing:**
- [ ] Region binders open simplified edit view
- [ ] No drag & drop functionality
- [ ] No Card Placeholder
- [ ] No plus signs / insert
- [ ] Cards in fixed Pokédex order
- [ ] Tap Pokémon → opens version picker
- [ ] Select card → saves selection
- [ ] Can clear selection to revert to default

**How to Test Step 34H:**

1. **Open Region binder edit:**
   - Create or open a Region binder
   - Tap "📝 Edit"
   - Should see simplified layout (no plus signs, no placeholder)

2. **Test version picker:**
   - Tap on Pikachu
   - Should see all Pikachu cards from all sets
   - Select one → binder shows that card

3. **Test clear:**
   - Find option to clear selection
   - Should revert to default sprite

---

#### Step 34I: Database Storage for Card Positions
- [x] **Status**: Complete ✅

**What we're doing:** Create the database table and service functions to store and retrieve card positions for binder organization.

**Files to create:**
- `database/migrations/add_binder_card_positions.sql` - Database migration
- `src/services/supabase/binderPositions.ts` - Service functions

**Files to modify:**
- `src/services/supabase/index.ts` - Export new service

**Database Table:**

```sql
-- database/migrations/add_binder_card_positions.sql

-- Table to store card positions in binders (for Master Set and Custom binders)
CREATE TABLE IF NOT EXISTS binder_card_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL, -- Position in binder (0-359 for 3x3, 0-479 for 4x3)
  card_id TEXT NOT NULL, -- TCGDEX card ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each slot can only have one card
  UNIQUE(binder_id, slot_index)
);

-- Indexes for fast lookups
CREATE INDEX idx_binder_positions_binder ON binder_card_positions(binder_id);
CREATE INDEX idx_binder_positions_user ON binder_card_positions(user_id);

-- RLS Policies
ALTER TABLE binder_card_positions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own positions
CREATE POLICY "Users can view own positions" ON binder_card_positions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own positions
CREATE POLICY "Users can insert own positions" ON binder_card_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own positions
CREATE POLICY "Users can update own positions" ON binder_card_positions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own positions
CREATE POLICY "Users can delete own positions" ON binder_card_positions
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_binder_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER binder_positions_updated_at
  BEFORE UPDATE ON binder_card_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_positions_updated_at();
```

**Service Functions:**

```tsx
// src/services/supabase/binderPositions.ts
import { supabase } from './client';

interface CardPosition {
  slotIndex: number;
  cardId: string | null;
}

interface StoredPosition {
  id: string;
  binder_id: string;
  slot_index: number;
  card_id: string;
}

/**
 * Get all card positions for a binder
 */
export async function getCardPositionsForBinder(
  binderId: string
): Promise<CardPosition[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('binder_card_positions')
    .select('slot_index, card_id')
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id)
    .order('slot_index');
  
  if (error) {
    console.error('[34I] Error loading positions:', error);
    return [];
  }
  
  // Convert to CardPosition array
  return (data || []).map(row => ({
    slotIndex: row.slot_index,
    cardId: row.card_id,
  }));
}

/**
 * Save all card positions for a binder (batch upsert)
 */
export async function saveCardPositionsForBinder(
  binderId: string,
  positions: CardPosition[]
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  // Filter out empty slots
  const filledPositions = positions.filter(p => p.cardId !== null);
  
  // Delete existing positions for this binder
  const { error: deleteError } = await supabase
    .from('binder_card_positions')
    .delete()
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (deleteError) {
    console.error('[34I] Error deleting old positions:', deleteError);
    throw deleteError;
  }
  
  // Insert new positions
  if (filledPositions.length > 0) {
    const rows = filledPositions.map(p => ({
      user_id: user.user!.id,
      binder_id: binderId,
      slot_index: p.slotIndex,
      card_id: p.cardId,
    }));
    
    const { error: insertError } = await supabase
      .from('binder_card_positions')
      .insert(rows);
    
    if (insertError) {
      console.error('[34I] Error saving positions:', insertError);
      throw insertError;
    }
  }
  
  console.log(`[34I] Saved ${filledPositions.length} card positions for binder ${binderId}`);
}

/**
 * Clear all positions for a binder
 */
export async function clearAllPositionsForBinder(
  binderId: string
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('binder_card_positions')
    .delete()
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('[34I] Error clearing positions:', error);
    throw error;
  }
}

/**
 * Get count of placed cards in a binder
 */
export async function getPlacedCardCount(
  binderId: string
): Promise<number> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return 0;
  
  const { count, error } = await supabase
    .from('binder_card_positions')
    .select('*', { count: 'exact', head: true })
    .eq('binder_id', binderId)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('[34I] Error counting positions:', error);
    return 0;
  }
  
  return count || 0;
}
```

**Integration with BinderEditScreen:**

```tsx
// In BinderEditScreen - loadBinder function
const loadBinder = async () => {
  try {
    // Get binder details
    const binderData = await getBinderById(binderId);
    setBinder(binderData);
    
    // Calculate total slots
    const slots = binderData.layoutPreference === '4x3' ? 480 : 360;
    
    // Load saved positions from database
    const savedPositions = await getCardPositionsForBinder(binderId);
    
    // If user has saved positions, use them
    if (savedPositions.length > 0) {
      const allPositions: CardPosition[] = [];
      for (let i = 0; i < slots; i++) {
        const saved = savedPositions.find(p => p.slotIndex === i);
        allPositions.push({
          slotIndex: i,
          cardId: saved?.cardId || null,
          cardName: saved?.cardName,
          imageUrl: saved?.imageUrl,
        });
      }
      setCardPositions(allPositions);
      setOriginalPositions([...allPositions]);
    } else {
      // No saved positions - pre-populate based on collection mode
      // Master Set: cards in set order
      // Region: Pokémon in Pokédex order  
      // Custom: all empty slots
      await initializeBinder(binderData);
    }
  } catch (error) {
    console.error('Error loading binder:', error);
    Alert.alert('Error', 'Failed to load binder. Please try again.');
  }
};

// In savePositions function
const savePositions = async () => {
  try {
    await saveCardPositionsForBinder(binderId, cardPositions);
    setOriginalPositions([...cardPositions]);
    setHasChanges(false);
    setUndoStack([]);
  } catch (error) {
    Alert.alert('Error', 'Failed to save changes. Please try again.');
  }
};
```

**Testing:**
- [ ] Migration runs without errors
- [ ] Table created with correct columns
- [ ] RLS policies applied
- [ ] getCardPositionsForBinder returns saved positions
- [ ] saveCardPositionsForBinder saves correctly
- [ ] clearAllPositionsForBinder works
- [ ] Positions persist after app restart
- [ ] Positions isolated per user (RLS)
- [ ] Positions isolated per binder

**How to Test Step 34I:**

1. **Run migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration SQL
   - Verify table created

2. **Test saving:**
   - Open Binder Edit, place some cards
   - Save and exit
   - Re-open Binder Edit → cards should be in same positions

3. **Test persistence:**
   - Close app completely
   - Reopen and check binder → positions preserved

4. **Test isolation:**
   - Log in as different user
   - Should not see other user's positions

---

**Overall Testing Checklist for Step 34:**
- [x] Edit button visible and navigates correctly (Step 34A) ✅
- [x] View modes have correct interactions (Step 34A) ✅
- [x] Binder Edit screen loads correctly (Step 34B) ✅
- [x] Empty binder starts with all empty slots (Step 34B) ✅
- [ ] Card picker with duplicate warning works (Step 34B) - Ready to test
- [x] Tap-to-select works with cross-page selection (Step 34C) ✅
- [x] Remove via selection bar button works (Step 34C) ✅
- [x] Card Placeholder works correctly (Step 34D) ✅
- [ ] Trash zone for removing cards works (Step 34D) - Ready to test
- [ ] Placeholder full handling works (Step 34D) - Ready to test
- [ ] Insert (plus signs) works correctly (Step 34E) - Ready to test
- [ ] Drag & drop works correctly (Step 34F) - Ready to test
- [x] Undo and save system works (Step 34G) ✅
- [x] Region binder has simplified edit mode (Step 34H) ✅
- [ ] Database positions save and load correctly (Step 34I) - Ready to test
- [ ] Works for Master Set binders - Ready to test
- [ ] Works for Custom binders - Ready to test
- [x] Works for Region binders ✅ (Step 34H)
- [ ] Works with 3×3 layout - Ready to test
- [ ] Works with 4×3 layout - Ready to test
- [ ] No TypeScript errors - Ready to test
- [ ] No console errors - Ready to test
- [ ] Performance acceptable - Ready to test

---

## Phase 11: Binder Activation System — REMOVED

> **Removed:** This entire phase has been replaced by the new Phase 9 (Pro Upgrade via In-App Purchase). The activation code system and NFC tag integration are no longer part of the app's monetization strategy.
>
> **Code to clean up (when ready):**
> - `src/services/supabase/registeredTags.ts` — delete
> - `src/screens/ActivationCode/ActivationCodeScreen.tsx` — delete
> - `database/migrations/add_registered_tags.sql` — delete (don't run; if already run in Supabase, drop the table)
> - `database/test_activation_codes.sql` — delete
> - Remove activation code references from `AppNavigator.tsx`, `OnboardingScreen.tsx`, `binders.ts`, `services/supabase/index.ts`
> - Remove `registered_tags` table from Supabase (if created)
> - Remove old `get_binder_limit()`, `can_user_create_binder()`, `get_user_binder_info()` SQL functions from Supabase (if created)
>
> **If you want physical binders later:** The old plan is documented earlier in this file (old Step 35 content). You can re-implement it alongside the Pro system.


---
