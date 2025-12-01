# User Rules - Pokémon TCG Binder Tracker

## Core Principles

1. **User is a beginner with no coding experience**
   - Always provide ready-to-use, complete code
   - Avoid asking the user to write code manually
   - Explain what code does in simple terms when relevant
   - Never assume prior programming knowledge

2. **Only create what is explicitly requested**
   - Do NOT add features, UI elements, or functionality unless explicitly asked
   - If unsure about requirements, ASK for clarification before implementing
   - When user says "I don't want AI to create something I did not ask for" - take it seriously

3. **Ask for clarification when uncertain**
   - If requirements are ambiguous or unclear, ask questions first
   - Better to ask than to assume and create wrong features
   - Clarify edge cases and user preferences before coding

## Project Context

### App Purpose
- Mobile app for tracking Pokémon TCG card collections
- Users track which cards they own and which ones they miss
- Multi-user support with cloud sync and local storage
- Works offline

### Key Features
- **Multiple Binders**: Users can create multiple binders
- **Collection Modes**: 
  - Master Set (one set per binder) - with variant selection
  - Region (one Pokédex region per binder) - base Pokédex only
  - Custom (any cards) - created from binder list, not questionnaire
- **Onboarding Questionnaire**: Step-by-step setup when creating new binder
  - Collection mode selection (Master Set or Region)
  - Set/Region selection
  - Variant selection (Master Set only)
  - Variant placement preference
  - Layout preference (Auto, 3×3, or 4×3)
- **Card Display**: Grid view (3x3 or 4x3) or list view
- **Card Details**: Name, number, set, rarity, artist
- **Visual Indicators**: Missing cards shown slightly transparent
- **Progress Tracking**: Completion percentage per binder (based on selected variants)
- **Search**: Both within binder and globally
- **Filtering**: Default filters based on collection mode

### App Flow

**Primary Entry Point: NFC Tag Scanning**
- User taps phone on NFC tag in physical binder
- App launches and reads NFC tag ID
- **New tag**: Triggers questionnaire → Creates binder → Links to tag → Opens binder
- **Existing tag**: Opens linked binder directly

**Secondary Entry Points:**
- Manual app launch → Binder List screen
- Can create binders manually (without NFC) from binder list

**Main Screens:**
1. **NFC Scan Handler** - Detects tag and routes to questionnaire or binder
2. **Questionnaire** - Onboarding for new binder creation (triggered by new NFC tag)
3. **Binder List** - Shows all binders with progress
4. **Binder Detail** - View cards in binder
5. **Card List** - Search + owned/missing toggle

### UI/UX Principles
- **Simple and clean**, not fancy
- Keep main flow straightforward
- Minimal design with clear navigation

### Technical Stack
- **Platform**: Cross-platform (iOS + Android)
- **Framework**: React Native with Expo
- **Backend**: Supabase (recommended) or Firebase (multi-user, cloud sync)
- **Data Source**: Pokémon TCG API (API key configured, use mockup data for testing)
- **UI Style**: Minimal design
- **App Name**: Bindr

## AI Behavior Guidelines

### When Writing Code
- Provide complete, working code files
- Include all necessary imports and dependencies
- Ensure code follows PROJECT_RULES.md standards
- Add helpful comments explaining complex logic
- Use TypeScript for type safety

### When User Requests Features
1. **Understand the requirement fully**
   - Read the request carefully
   - Check if it aligns with existing features
   - Identify any conflicts or dependencies

2. **Ask clarifying questions if needed**
   - Don't assume implementation details
   - Clarify UI/UX preferences
   - Confirm edge cases

3. **Implement exactly what was asked**
   - No extra features
   - No "nice-to-have" additions
   - Stick to the specification

### When User Asks Questions
- Provide clear, beginner-friendly explanations
- Use analogies when helpful
- Reference specific files/code when explaining
- Offer examples when relevant

### Error Handling
- If code has errors, fix them immediately
- Explain what went wrong in simple terms
- Provide the corrected code
- Don't leave broken code for the user to fix

## Communication Style

- **Clear and direct**: Avoid jargon, explain technical terms
- **Helpful but not overbearing**: Provide context without overwhelming
- **Respectful**: Acknowledge user's beginner status without condescension
- **Proactive**: Anticipate potential issues and address them

## What NOT to Do

- ❌ Don't add features not explicitly requested
- ❌ Don't assume the user knows programming concepts
- ❌ Don't create code that requires manual editing by the user
- ❌ Don't skip error handling or edge cases
- ❌ Don't use complex patterns without explanation
- ❌ Don't create incomplete code snippets
- ❌ Don't make changes without user approval (unless fixing errors)

## What TO Do

- ✅ Provide complete, ready-to-use code
- ✅ Ask clarifying questions when requirements are unclear
- ✅ Explain code in simple terms when helpful
- ✅ Follow project conventions and rules
- ✅ Test code before presenting it
- ✅ Fix errors immediately
- ✅ Respect user's explicit instructions
- ✅ **Automatically commit to Git** when appropriate (see Git Commit Guidelines below)

## Git Commit Guidelines

**AI will automatically commit changes to Git when:**

1. **After completing a feature**
   - Example: "Add binder creation screen"
   - Example: "Implement card grid view"

2. **After fixing bugs or errors**
   - Example: "Fix image loading issue"
   - Example: "Fix navigation error"

3. **After making significant changes**
   - Example: "Set up Supabase authentication"
   - Example: "Add TypeScript types for cards"

4. **After refactoring or improving code**
   - Example: "Refactor card component for better performance"
   - Example: "Improve error handling"

**Commit message format:**
- Clear and descriptive
- Start with action verb: "Add", "Fix", "Update", "Refactor", etc.
- Brief description of what changed

**When NOT to commit:**
- ❌ After every single small edit (wait for logical completion)
- ❌ If code is broken or incomplete
- ❌ If user explicitly asks not to commit

**User preference:** AI handles Git commits automatically - user doesn't need to think about it.

