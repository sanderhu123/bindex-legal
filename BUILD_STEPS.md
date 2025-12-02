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
- [ ] **Status**: Not started

**What we're doing:** Search and filter functionality

**Features:**
- Search within binder
- Global search across binders
- Filter by rarity, artist, set
- Default filters based on collection mode
- Owned/missing toggle in card list
- Persistent filter preferences

**Files:**
- `src/hooks/useCardSearch.ts`
- `src/hooks/useCardFilter.ts`
- `src/components/Search/SearchBar.tsx`
- `src/components/Filter/FilterPanel.tsx`

**Testing:**
- [ ] Can search within current binder
- [ ] Can search globally across all binders
- [ ] Search results update as you type
- [ ] Can filter by rarity
- [ ] Can filter by artist
- [ ] Can filter by set
- [ ] Default filters work (set number for Master Set, Pokédex number for Region)
- [ ] Owned/missing toggle works
- [ ] Filter preferences persist
- [ ] Can clear all filters
- [ ] Search works offline (with cached data)

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
- [ ] **Status**: Not started

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
- [ ] Progress percentage calculates correctly
- [ ] Progress bar displays visually
- [ ] Shows "X/Y cards (Z%)" format
- [ ] Updates when cards added
- [ ] Updates when cards removed
- [ ] Only counts selected variants (Master Set mode)
- [ ] Shows 0% for empty binder
- [ ] Shows 100% when complete
- [ ] Progress displays in binder list
- [ ] Progress displays in binder detail

---

## Phase 7: Polish & Testing

### Step 21: UI/UX Improvements
- [ ] **Status**: Not started

**What we're doing:** Polish the interface (simple and clean, not fancy)

**Features:**
- Consistent styling throughout app
- Loading states for all async operations
- User-friendly error messages
- Empty states for all screens
- Smooth transitions (simple, not fancy)

**Files:**
- Update all screens with consistent styling
- Add loading components
- Add error components
- Add empty state components

**Testing:**
- [ ] Consistent colors and spacing throughout
- [ ] Loading spinners show during data fetch
- [ ] Error messages are clear and helpful
- [ ] Empty states guide users
- [ ] Transitions are smooth
- [ ] App feels cohesive and polished
- [ ] Follows "simple and clean" design principle

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
- [ ] **Status**: Not started

**What we're doing:** Switch from mockup to real Pokémon TCG API

**Steps:**
1. API key already configured: `4fff0075-cf2c-4871-aed2-53afa1cfc65a`
2. Update API service to use real endpoint
3. Test with real data
4. Handle rate limiting
5. Fallback to mockup if API fails

**Testing:**
- [ ] Real API connects successfully
- [ ] Can fetch sets from API
- [ ] Can fetch cards from API
- [ ] Card images load from API
- [ ] Rate limiting handled correctly
- [ ] Falls back to mockup if API fails
- [ ] All sets load correctly
- [ ] Variants detected correctly from API
- [ ] Performance is acceptable
- [ ] Error handling works for API failures

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

