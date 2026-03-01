# Project Configuration - Bindr

## App Information
- **App Name**: Bindr
- **App Type**: Pokémon TCG Binder Tracker
- **Platform**: Cross-platform (iOS + Android)

## API Configuration

### Pokémon TCG API
- **API Key**: `4fff0075-cf2c-4871-aed2-53afa1cfc65a`
- **Base URL**: `https://api.pokemontcg.io/v2/` (standard endpoint)
- **Authentication**: API key in header
- **Rate Limits**: Check API documentation for current limits

### API Usage
- Use mockup data for initial development/testing
- Switch to real API when ready (Step 23 in BUILD_STEPS.md)
- Handle API errors gracefully with fallback to mockup data

## Collection Modes Configuration

### Master Set Mode
- **Sets**: All Pokémon TCG sets
- **Organization**: By era (e.g., Base Set Era, Sword & Shield Era, etc.)
- **Ordering**: Newest to oldest within each era
- **Display**: Show era groupings, then sets within era

### Region Mode
- **Regions**: All Pokédex regions
- **Regions List**: 
  - Kanto (Gen 1)
  - Johto (Gen 2)
  - Hoenn (Gen 3)
  - Sinnoh (Gen 4)
  - Unova (Gen 5)
  - Kalos (Gen 6)
  - Alola (Gen 7)
  - Galar (Gen 8)
  - Paldea (Gen 9)
- **Ordering**: Oldest to newest (Kanto first, Paldea last)
- **Display**: Show region name and generation number

### Custom Mode
- **Cards**: Any cards from any set/region
- **Organization**: User-defined
- **Ordering**: User preference

**Note**: Custom mode is not part of the initial onboarding questionnaire. Users can create custom binders later from the main binder list screen.

## Authentication Configuration

### Supported Methods
1. **Email/Password** (required)
   - Email validation
   - Password requirements (min 6 characters recommended)
   - Password reset functionality

2. **Social Login** (optional)
   - Google Sign-In
   - Apple Sign-In (iOS)
   - Facebook Sign-In (optional, can add later)

### Implementation
- Use Supabase Auth for all authentication methods
- Handle authentication state globally
- Support account linking (email + social)

## UI Configuration

### Design Style
- **Style**: Simple and clean, not fancy
- **Goal**: Keep it minimal and straightforward
- **Theme**: Default React Native Paper theme
- **Colors**: Use default Material Design colors
- **Fonts**: System defaults

### App Branding
- **App Name**: Bindr
- **Display Name**: Bindr (can be changed in app.json later)

## App Flow & Navigation

### Primary Entry Point: NFC Tag Scanning
**NFC Tag Integration:**
- Each physical binder contains an NFC tag
- Tapping phone on NFC tag launches the app
- App reads NFC tag ID and determines next action

**First-Time NFC Scan (New Tag):**
1. User taps phone on NFC tag in physical binder
2. App launches via NFC intent
3. App detects new/unregistered NFC tag
4. **Questionnaire starts** - Onboarding for that binder
5. User completes questionnaire
6. Binder created and linked to NFC tag ID
7. App opens to that binder

**Subsequent NFC Scan (Existing Tag):**
1. User taps phone on NFC tag in physical binder
2. App launches via NFC intent
3. App reads NFC tag ID
4. App finds linked binder in database
5. App opens directly to that binder (no questionnaire)

**Error Handling:**
- If NFC tag belongs to another user → Show error: "This binder belongs to someone else"
- If NFC tag read fails → Show error and allow manual binder selection

### Secondary Entry Points
- **Manual App Launch** → Binder List screen
- **Create Binder Manually** → Can create binders without NFC (from binder list)

### Main Flow (Simple & Clean)
1. **NFC Scan** - Primary entry point (launches app)
2. **Questionnaire** - Onboarding for new binder (triggered by new NFC tag)
3. **Binder List** - Shows all binders with progress (manual entry)
4. **Binder Detail** - View cards in binder
5. **Card List** - Search + owned/missing toggle

### Navigation Structure
- Keep navigation simple and intuitive
- Main screens accessible from bottom navigation or drawer
- No complex nested navigation
- Clear back buttons and navigation paths
- NFC deep linking handled automatically

## Onboarding Questionnaire

### Purpose
When a user creates a new binder, they go through a questionnaire to set up their collection preferences.

### Questionnaire Flow

#### Step 1: Collection Mode Selection
**Question**: "How do you want to collect?"
- **Master Set** (one set per binder)
- **Region** (one Pokédex region per binder)

**Note**: Custom mode is not shown here - users can create custom binders from the main binder list.

---

#### Step 2A: Master Set Configuration (if Master Set selected)

**2A.1: Choose a Set**
- Display all sets
- **Sorting**: Newest → Oldest
- Show sets organized by era (grouped)
- User selects one set

**2A.2: Show Variants for Selected Set**
Display which variants exist for that set:
- **Base cards** (always included, required)
- **Optional variants** (only show if set supports them):
  - Reverse Holo
  - Poké Ball
  - Master Ball

**2A.3: Variant Selection**
- User can choose which variants count toward 100% completion
- Base cards are always included
- User can toggle optional variants on/off
- Progress calculation includes only selected variants

---

#### Step 2B: Region Configuration (if Region selected)

**2B.1: Choose a Region**
- Display all regions: Kanto → Paldea (oldest to newest)
- Show generation number (Gen 1, Gen 2, etc.)
- User selects one region

**2B.2: Special Forms**
- **Base Pokédex only** (default, always included)
- Optionally include special forms later (not in initial questionnaire)
- Note: Special forms can be added later from settings

---

#### Step 3: Variant Placement Preference
**Question**: "How do you want to place variants?"

Options:
- **Group with base card** - Variants appear next to their base card
- **All variants at the end** - Base cards first, then all variants grouped at the end

**Applies to**: Master Set mode (variants) and Region mode (if special forms are added later)

---

#### Step 4: Binder Layout Preference
**Question**: "Choose your binder layout"

Options:
- **Auto** - App decides optimal layout
- **3×3** - 3 columns, 3 rows grid
- **4×3** - 4 columns, 3 rows grid

**Default**: 3×3 if user doesn't select

---

### Questionnaire Implementation Notes
- Show one question at a time (step-by-step)
- Clear "Next" and "Back" buttons
- Progress indicator (e.g., "Step 2 of 4")
- Can skip/cancel and return to binder list
- Save preferences to binder configuration
- Use these preferences when displaying cards in binder

### Binder Configuration Storage
Each binder stores:
- Collection mode (master-set or region)
- Selected set (if master-set)
- Selected region (if region)
- Variants to track (array of variant types)
- Variant placement preference (grouped or end)
- Layout preference (auto, 3x3, or 4x3)

## Data Structure

### Card Fields
- Name
- Number (set number, e.g., "001/150")
- Set (set name)
- Rarity
- Illustrator
- Image URL (from API)
- Pokédex Number (for region mode)

### Binder Fields
- Name (user-defined)
- Collection Mode (master-set, region, custom)
- Set (if master-set mode)
- Region (if region mode)
- Variants to Track (array: ['base', 'reverse-holo', 'poke-ball', 'master-ball'])
- Variant Placement ('grouped' or 'end')
- Layout Preference ('auto', '3x3', '4x3')
- **NFC Tag ID** (unique identifier from NFC tag, 1:1 relationship)
- **UserId** (owner of the binder)
- Card IDs (array of owned card IDs)
- Created Date
- Updated Date

### NFC Tag Relationship
- **1:1 Relationship**: One NFC tag = One binder
- **Tag Ownership**: Each NFC tag can only be linked to one user's binder
- **Tag Storage**: NFC tag ID stored in binder record
- **Tag Detection**: App checks if tag is new (no binder) or existing (has binder)

## Default Behaviors

### Grid View
- Options: Auto, 3×3, or 4×3 (set during onboarding questionnaire)
- Default: 3×3 if not specified
- Card aspect ratio: Maintain API image aspect ratio
- Layout preference stored per binder

### List View
- Compact list format
- Show: Image thumbnail, name, number, set, rarity
- Quick actions: Add/remove toggle

### Missing Cards
- Opacity: 0.5 (50% transparent)
- Still clickable to view details
- Visual indicator (optional: gray overlay or border)

### Progress Tracking
- Format: "X/Y cards (Z%)"
- Show: Progress bar + percentage
- Update: Real-time as cards added/removed

### Search & Filter
- **Master Set Mode Default**: Order by set number
- **Region Mode Default**: Order by Pokédex number
- **Custom Mode Default**: Order by user preference (default: newest first)

## Development Notes

### Mockup Data
- Create comprehensive mockup data covering:
  - Multiple sets from different eras
  - Cards from all regions
  - Various rarities and artists
  - Match real API response structure

### Testing Strategy
- Start with mockup data
- Test all collection modes
- Test authentication flows
- Test offline functionality
- Switch to real API for final testing

## Environment Variables

Add to `.env` file:
```
EXPO_PUBLIC_POKEMON_API_KEY=4fff0075-cf2c-4871-aed2-53afa1cfc65a
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## NFC Configuration

### NFC Tag Requirements
- **Reading**: App must read NFC tag ID when launched from tag
- **Writing**: Optional - can write binder ID to tag for future use
- **Platform Support**: iOS 13+ and Android (NFC enabled devices)
- **Permissions**: NFC reading permission required

### NFC Implementation
- Use React Native NFC library (e.g., `react-native-nfc-manager`)
- Handle NFC intents for app launch
- Store NFC tag ID in binder record
- Query binders by NFC tag ID
- Validate tag ownership (check userId)

### NFC Error Handling
- Tag belongs to another user → Error: "This binder belongs to someone else"
- Tag read fails → Error message + option to select binder manually
- NFC not supported → Fallback to manual binder creation
- NFC disabled → Prompt user to enable NFC

## Notes
- Keep API key secure (use environment variables)
- Never commit API key to Git (already in .gitignore)
- Use mockup data during development to avoid API rate limits
- Switch to real API when ready for production testing
- NFC functionality requires physical device testing (simulators don't support NFC)

