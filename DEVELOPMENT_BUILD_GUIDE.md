# Development Build Guide

This guide will help you create a development build for testing features that require native capabilities.

---

## Prerequisites

✅ EAS CLI installed (you have it)  
✅ Logged into Expo (you're logged in as: kraizes)  
✅ EAS configured (you have eas.json)  
✅ expo-dev-client installed (you have it)

---

## Step 1: Choose Your Platform

### Option A: Android (Recommended for Windows)

**Requirements:**
- Android device or emulator
- OR physical Android phone connected via USB

**Build Command:**
```bash
eas build --profile development --platform android
```

### Option B: iOS (Mac Only)

**Requirements:**
- Mac computer
- Xcode installed
- iOS device or simulator

**Build Command:**
```bash
eas build --profile development --platform ios
```

---

## Step 2: Build the App

### For Android:

1. **Open terminal in your project folder** (you're already there)

2. **Run the build command:**
   ```bash
   eas build --profile development --platform android
   ```

3. **You'll be asked some questions:**
   - "Would you like to generate a new Android Keystore?" → Type `y` and press Enter
   - This creates a signing key for your app (you'll need this for future builds)

4. **The build will start:**
   - It uploads your code to Expo's servers
   - Builds the Android app
   - This takes about 10-15 minutes
   - You'll see progress in the terminal

5. **When it's done:**
   - You'll get a download link
   - Or a QR code to scan with your phone

### For iOS (Mac only):

1. **Run the build command:**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Follow the prompts** (similar to Android)

---

## Step 3: Install the Development Build

### Option A: Download and Install (Android)

1. **Get the build:**
   - Check your email (Expo sends a link)
   - Or scan the QR code from the terminal
   - Or go to: https://expo.dev/accounts/kraizes/projects/trackerapp/builds

2. **Download the APK file**

3. **Install on your Android device:**
   - Enable "Install from Unknown Sources" in Android settings
   - Open the downloaded APK file
   - Tap "Install"
   - Tap "Open" when done

### Option B: Use Android Emulator

1. **Start Android Studio**
2. **Open AVD Manager** (Android Virtual Device Manager)
3. **Start an emulator**
4. **Drag and drop the APK** onto the emulator window
5. **Or use adb:**
   ```bash
   adb install path/to/your-app.apk
   ```

---

## Step 4: Start the Development Server

1. **In your terminal, run:**
   ```bash
   npm start
   ```
   or
   ```bash
   npx expo start --dev-client
   ```

2. **You'll see a QR code**

3. **Open the development build app** on your device/emulator

4. **Scan the QR code** or press the button to connect

5. **Your app will load!**

---

## Troubleshooting

### Build Fails

**Error: "No credentials found"**
- Run: `eas credentials` to set up credentials

**Error: "Build timeout"**
- Try again, sometimes builds take longer

### App Won't Connect to Dev Server

**Make sure:**
- Phone and computer are on the same WiFi
- Firewall isn't blocking the connection
- Dev server is running (`npm start`)

---

## Next Steps

1. Test all features that require native capabilities (like NFC)
2. Test the full login flow
3. When ready for production, build with: `eas build --profile production`

---

## Need Help?

If you get stuck:
1. Check the error message in the terminal
2. Check Expo dashboard: https://expo.dev/accounts/kraizes/projects/trackerapp
3. Ask me for help with specific errors

Good luck! 🚀

