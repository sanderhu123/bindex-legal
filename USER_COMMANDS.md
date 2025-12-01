# User Commands - Pokémon TCG Binder Tracker

## Quick Start Commands

### First Time Setup
```bash
# 1. Install Node.js (if not installed)
# Download from: https://nodejs.org/

# 2. Install Expo CLI globally
npm install -g expo-cli

# 3. Navigate to project folder
cd TrackerApp

# 4. Install project dependencies
npm install

# 5. Start the app
npm start
```

### Daily Use
```bash
# Start the app (run this every time you work on the project)
npm start

# Then:
# - Press 'i' for iOS simulator (Mac only)
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on your phone
```

## Common Tasks

### I want to see my app running
```bash
npm start
```
Then press the key for your platform or scan the QR code.

### I want to add a new feature
1. Tell the AI: "I want to add [feature name]"
2. AI will create the code
3. Test it by running `npm start`

### I want to fix an error
1. Copy the error message
2. Tell the AI: "I'm getting this error: [paste error]"
3. AI will fix it
4. Test with `npm start`

### I want to change how something looks
1. Tell the AI: "I want to change [what] to [how]"
2. AI will update the code
3. See changes by running `npm start`

### I want to add a new screen
1. Tell the AI: "I want to add a screen for [purpose]"
2. AI will create the screen and navigation
3. Test with `npm start`

## App-Specific Commands

### Testing Collection Modes
```bash
# Start the app
npm start

# Then in the app:
# - Create a new binder
# - Select collection mode (Master Set, Region, or Custom)
# - Add cards to test
```

### Testing Offline Mode
```bash
# 1. Start the app
npm start

# 2. Load some cards (while online)

# 3. Turn off WiFi/mobile data on your device

# 4. Try to:
#    - View your binders
#    - Add/remove cards
#    - Search cards
# All should work offline!
```

### Testing Multi-User Sync
```bash
# 1. Start the app on Device 1
npm start

# 2. Create account and add cards

# 3. Start the app on Device 2 (or simulator)
npm start

# 4. Login with same account
# Cards should sync automatically
```

## When Things Go Wrong

### App won't start
```bash
# Clear cache and restart
npx expo start --clear
```

### Changes not showing up
```bash
# Reload the app:
# - Press 'r' in terminal
# - Or shake device and tap "Reload"
# - Or press Cmd+R (iOS) / Cmd+M then Reload (Android)
```

### Strange errors
```bash
# 1. Stop the app (Ctrl+C)

# 2. Clear everything
rm -rf node_modules
npm install

# 3. Clear Expo cache
npx expo start --clear
```

### Can't connect to phone
```bash
# Make sure:
# 1. Phone and computer are on same WiFi
# 2. Expo Go app is installed on phone
# 3. Try tunnel mode:
npx expo start --tunnel
```

## Building for App Stores

### Build for testing
```bash
# Install EAS CLI first
npm install -g eas-cli

# Login
eas login

# Build
eas build --profile development --platform android
# or
eas build --profile development --platform ios
```

### Build for release
```bash
# Production build
eas build --profile production --platform all
```

## Asking the AI for Help

### Good ways to ask:
- ✅ "I want to add a filter by rarity feature"
- ✅ "The card images aren't loading, can you fix it?"
- ✅ "I want to change the grid from 3x3 to 4x3"
- ✅ "How do I test offline mode?"

### Less helpful ways:
- ❌ "Make it better" (too vague)
- ❌ "Fix everything" (be specific)
- ❌ "Add features" (which features?)

## Understanding What's Happening

### When you run `npm start`:
1. Expo starts a development server
2. Your code is bundled and sent to your device
3. Changes you make update automatically (hot reload)

### When you see errors:
- **Red screen**: There's a code error - tell the AI
- **Yellow warnings**: Usually safe to ignore, but can tell AI if concerned
- **Build errors**: Something wrong with setup - tell the AI

### File structure (simplified):
```
TrackerApp/
├── src/
│   ├── screens/     # What you see (screens)
│   ├── components/  # Reusable pieces (buttons, cards)
│   └── services/   # Backend stuff (API, database)
└── package.json     # List of dependencies
```

## Common Questions

### "How do I add a new card?"
Tell the AI: "I want to add a button to add cards to my binder"

### "How do I delete a binder?"
Tell the AI: "I want to be able to delete binders"

### "How do I change colors?"
Tell the AI: "I want to change the [element] color to [color]"

### "How do I add search?"
Tell the AI: "I want to add search functionality"

### "The app is slow"
Tell the AI: "The app is running slowly, can you optimize it?"

## Testing Checklist

Before asking AI to add features, test current features:

- [ ] Can I create a binder?
- [ ] Can I select collection mode?
- [ ] Can I add cards?
- [ ] Can I see missing cards (transparent)?
- [ ] Can I switch between grid and list?
- [ ] Can I search for cards?
- [ ] Does it work offline?
- [ ] Does sync work between devices?
- [ ] Is progress percentage showing?

## Getting Help

### If something doesn't work:
1. **Copy the error message** (if any)
2. **Describe what you were trying to do**
3. **Tell the AI exactly what happened**
4. **AI will fix it**

### Example:
> "I tried to create a new binder, but when I tap the button, nothing happens. No error message, it just doesn't respond."

### If you want to learn:
- Ask: "Can you explain how [feature] works?"
- AI will explain in simple terms

## Remember

- **You don't need to write code** - AI does that
- **You don't need to understand everything** - AI handles the complex parts
- **Ask questions** - AI is here to help
- **Be specific** - The more details, the better AI can help
- **Test after changes** - Always run `npm start` to see your changes

## Quick Reference

| What you want | Command |
|--------------|---------|
| Start app | `npm start` |
| Clear cache | `npx expo start --clear` |
| iOS simulator | `npm start` then press `i` |
| Android emulator | `npm start` then press `a` |
| Reload app | Press `r` in terminal |
| Stop app | Press `Ctrl+C` |

