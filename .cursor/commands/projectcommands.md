# Project Commands - Pokémon TCG Binder Tracker

## Setup Commands

### Initial Project Setup
```bash
# Create new Expo project with TypeScript
npx create-expo-app@latest TrackerApp --template

# Navigate to project
cd TrackerApp

# Install dependencies
npm install

# Install additional required packages
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install @tanstack/react-query
npm install @supabase/supabase-js  # For Supabase (recommended)
# OR npm install firebase  # For Firebase (alternative)
npm install expo-image
npm install react-native-paper
npm install zustand

# NFC Integration
npm install react-native-nfc-manager
# OR for Expo: npx expo install expo-nfc

# Install dev dependencies
npm install --save-dev @types/react @types/react-native
```

### Supabase Setup (Recommended)
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase in project
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Generate TypeScript types from database
supabase gen types typescript --local > src/types/supabase.ts
```

### Firebase Setup (Alternative)
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Select:
# - Firestore
# - Authentication
# - Hosting (optional)
```

### Environment Setup
```bash
# Create .env file (add to .gitignore)
touch .env

# For Supabase, add to .env:
# EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# EXPO_PUBLIC_POKEMON_API_KEY=4fff0075-cf2c-4871-aed2-53afa1cfc65a

# For Firebase, add to .env:
# EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
# EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
# EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# EXPO_PUBLIC_POKEMON_API_KEY=your_pokemon_api_key
```

## Development Commands

### Start Development Server
```bash
# Start Expo development server
npm start
# or
npx expo start

# Start with specific options
npx expo start --clear          # Clear cache
npx expo start --tunnel         # Use tunnel for remote access
npx expo start --ios            # Open iOS simulator
npx expo start --android        # Open Android emulator
```

### Run on Devices
```bash
# iOS Simulator (Mac only)
npx expo start --ios

# Android Emulator
npx expo start --android

# Scan QR code with Expo Go app on physical device

# Note: NFC testing requires physical device (simulators don't support NFC)
# Test NFC functionality on real iOS/Android device
```

### Type Checking
```bash
# Run TypeScript type checker
npx tsc --noEmit

# Watch mode for type checking
npx tsc --noEmit --watch
```

### Linting & Formatting
```bash
# Install ESLint and Prettier (if not already installed)
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev prettier eslint-config-prettier

# Run linter
npx eslint src/

# Fix linting issues
npx eslint src/ --fix

# Format code with Prettier
npx prettier --write src/
```

## Testing Commands

### Run Tests
```bash
# Install testing dependencies (if not installed)
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Specific Features
```bash
# Test API service
npm test -- api

# Test components
npm test -- components

# Test hooks
npm test -- hooks

# Test NFC service
npm test -- nfc

# Note: NFC integration tests may require mocking NFC hardware
```

## Build Commands

### Development Build
```bash
# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Build for development
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Build
```bash
# Build for iOS
eas build --profile production --platform ios

# Build for Android
eas build --profile production --platform android

# Build for both platforms
eas build --profile production --platform all
```

### Submit to App Stores
```bash
# Submit to App Store (iOS)
eas submit --platform ios

# Submit to Google Play Store (Android)
eas submit --platform android

# Submit to both
eas submit --platform all
```

## Database Commands

### Database Management

#### Supabase (Recommended)
```bash
# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts

# Run migrations
supabase db push

# View database in Supabase Studio
supabase studio

# Reset local database
supabase db reset
```

#### Firebase Firestore (Alternative)
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# View Firestore data
firebase firestore:get /binders
```

### Database Seeding (Mockup Data)
```bash
# Run seed script to populate mockup data
npm run seed

# Or manually
node scripts/seedMockupData.js
```

### NFC Testing Commands
```bash
# Test NFC tag reading (requires physical device)
# NFC functionality cannot be tested in simulators

# For iOS: Ensure NFC capability is enabled in Xcode
# For Android: Ensure NFC permission is in AndroidManifest.xml

# Test NFC tag scanning:
# 1. Build app on physical device
# 2. Tap NFC tag in physical binder
# 3. App should launch and read tag ID
# 4. Check if tag is new (questionnaire) or existing (open binder)
```

## Utility Commands

### Clean Build
```bash
# Clear Expo cache
npx expo start --clear

# Clear node modules and reinstall
rm -rf node_modules
npm install

# Clear watchman cache (if using)
watchman watch-del-all
```

### Generate Types
```bash
# Generate TypeScript types from API responses (if using codegen)
npm run generate-types
```

### Check Dependencies
```bash
# Check for outdated packages
npm outdated

# Check for security vulnerabilities
npm audit

# Fix security vulnerabilities
npm audit fix
```

## Git Commands

### Common Git Workflows
```bash
# Create feature branch
git checkout -b feature/binder-creation

# Commit changes
git add .
git commit -m "Add binder creation screen"

# Push to remote
git push origin feature/binder-creation

# Create pull request (use GitHub/GitLab UI or CLI)
```

### Git Hooks (if configured)
```bash
# Pre-commit hook runs automatically
# Runs: linting, type checking, tests

# Manual pre-commit check
npm run pre-commit
```

## Debugging Commands

### Debug Mode
```bash
# Start with debugger
npx expo start --dev-client

# Open React Native Debugger
# Install: https://github.com/jhen0409/react-native-debugger
```

### Logs
```bash
# View Expo logs
npx expo start --verbose

# View Firebase logs
firebase functions:log

# View device logs (iOS)
xcrun simctl spawn booted log stream

# View device logs (Android)
adb logcat
```

## Package Management

### Add Dependencies
```bash
# Add production dependency
npm install package-name

# Add development dependency
npm install --save-dev package-name

# Add Expo package
npx expo install package-name
```

### Update Dependencies
```bash
# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Update Expo SDK
npx expo install --fix
```

## Environment Management

### Switch Environments
```bash
# Development
cp .env.development .env

# Production
cp .env.production .env

# Staging
cp .env.staging .env
```

## Documentation Commands

### Generate Documentation
```bash
# Generate API documentation (if using JSDoc)
npm run docs

# Serve documentation locally
npm run docs:serve
```

## Performance Analysis

### Bundle Analysis
```bash
# Analyze bundle size
npx expo export --dump-sourcemap

# Use source-map-explorer
npx source-map-explorer build/index.js
```

## Common Workflows

### Daily Development Workflow
```bash
# 1. Start development server
npx expo start

# 2. Make changes in code

# 3. Check types
npx tsc --noEmit

# 4. Run linter
npx eslint src/ --fix

# 5. Test changes on device/simulator
```

### Before Committing
```bash
# 1. Check types
npx tsc --noEmit

# 2. Run linter
npx eslint src/ --fix

# 3. Format code
npx prettier --write src/

# 4. Run tests
npm test

# 5. Commit
git add .
git commit -m "Descriptive message"
```

### Before Release
```bash
# 1. Update version in app.json and package.json

# 2. Run full test suite
npm test

# 3. Test NFC functionality on physical devices (iOS and Android)
#    - Test new tag scanning (questionnaire flow)
#    - Test existing tag scanning (direct binder open)
#    - Test error handling (tag belongs to another user)

# 4. Build for production
eas build --profile production --platform all

# 5. Test production build

# 6. Submit to stores
eas submit --platform all
```

## Troubleshooting Commands

### Common Issues
```bash
# Metro bundler cache issues
npx expo start --clear

# Node modules issues
rm -rf node_modules package-lock.json
npm install

# Watchman issues (Mac/Linux)
watchman watch-del-all
rm -rf node_modules
npm install

# iOS build issues
cd ios
pod deintegrate
pod install
cd ..

# Android build issues
cd android
./gradlew clean
cd ..
```

## Custom Scripts (Add to package.json)

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/",
    "clean": "rm -rf node_modules && npm install",
    "seed": "node scripts/seedMockupData.js",
    "pre-commit": "npm run type-check && npm run lint && npm test"
  }
}
```

