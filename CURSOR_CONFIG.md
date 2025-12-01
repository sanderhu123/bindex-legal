# Cursor Configuration - Recommended Tools & Docs

## Recommended Documentation (Docs)

Add these documentation sources in Cursor Settings → Docs:

### Essential Docs (Highly Recommended)

1. **React Native Documentation**
   - URL: `https://reactnative.dev/docs/getting-started`
   - Why: Core framework documentation for components, APIs, and best practices
   - Use: Reference for React Native components, styling, and platform-specific code

2. **Expo Documentation**
   - URL: `https://docs.expo.dev/`
   - Why: Expo-specific APIs, configuration, and deployment guides
   - Use: Expo SDK features, image handling, navigation setup

3. **React Navigation Documentation**
   - URL: `https://reactnavigation.org/docs/getting-started`
   - Why: Navigation patterns, screen setup, and navigation options
   - Use: Setting up navigation between screens, tabs, stacks

4. **Supabase Documentation** (Recommended)
   - URL: `https://supabase.com/docs`
   - Why: Authentication, PostgreSQL database, cloud sync
   - Use: User authentication, data storage, real-time sync
   - Alternative: Firebase Docs at `https://firebase.google.com/docs` if using Firebase

5. **Pokémon TCG API Documentation**
   - URL: `https://docs.pokemontcg.io/`
   - Why: API endpoints, response formats, rate limits
   - Use: Fetching card data, understanding API structure

### Optional but Helpful Docs

6. **React Native Paper Documentation**
   - URL: `https://callstack.github.io/react-native-paper/`
   - Why: UI component library documentation
   - Use: If using React Native Paper for UI components

7. **TypeScript Documentation**
   - URL: `https://www.typescriptlang.org/docs/`
   - Why: TypeScript syntax and type definitions
   - Use: Understanding TypeScript features used in the project

## Tools & MCP (Optional)

### Not Required for This Project

For a beginner building a mobile app, **Tools & MCP are not necessary**. The AI can:
- Read and write files directly
- Search the codebase
- Run terminal commands
- Access web search

### If You Want to Add Tools Later

Only add these if you need advanced workflows:

1. **GitHub MCP** (if using GitHub)
   - Use: Managing pull requests, issues, branches via AI
   - Not needed: You can use Git commands manually

2. **Firebase MCP** (if using Firebase)
   - Use: Managing Firebase resources via AI
   - Not needed: Firebase CLI works fine for manual tasks

## How to Add Docs in Cursor

1. Open Cursor Settings (Ctrl+, or Cmd+,)
2. Go to "Features" → "Docs"
3. Click "Add Documentation"
4. Paste the URLs listed above
5. Cursor will index the documentation
6. AI will automatically reference these docs when helping you

## Priority Order

**Start with these 3:**
1. React Native Docs
2. Expo Docs
3. React Navigation Docs

**Add these when needed:**
4. Supabase Docs (when setting up authentication and database)
   - Alternative: Firebase Docs if using Firebase instead
5. Pokémon TCG API Docs (when integrating the API)

## Benefits of Adding Docs

- ✅ AI uses correct API syntax
- ✅ AI follows framework best practices
- ✅ AI provides accurate code examples
- ✅ Fewer errors and better code quality
- ✅ Faster development

## Note

You don't need to add all docs at once. Start with React Native and Expo, then add others as you need them. The AI will work fine without them, but having them makes the AI more accurate and helpful.

