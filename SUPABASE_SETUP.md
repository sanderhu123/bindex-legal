# Supabase Setup Guide

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub, Google, or email (free account)

## Step 2: Create New Project

1. Once logged in, click "New Project"
2. Fill in the project details:
   - **Name**: Choose a name (e.g., "pokemon-tcg-tracker")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest region to you
   - **Pricing Plan**: Select "Free" plan
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be set up

## Step 3: Get Your Credentials

1. In your Supabase project dashboard, click on **Settings** (gear icon) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:

   - **Project URL**: Looks like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

## Step 4: Create .env File

1. In your project root folder (`TrackerApp`), create a new file named `.env`
2. Copy this template and fill in your values:

```
EXPO_PUBLIC_SUPABASE_URL=your-project-url-here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace `your-project-url-here` with your actual Project URL
4. Replace `your-anon-key-here` with your actual anon public key

**Example:**
```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.example
```

## Step 5: Verify Setup

- ✅ `.env` file is created in the project root
- ✅ `.env` file contains `EXPO_PUBLIC_SUPABASE_URL`
- ✅ `.env` file contains `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `.env` file is NOT committed to Git (it's in `.gitignore`)

## Important Notes

- **Never commit `.env` to Git** - It contains sensitive credentials
- The `.env` file is already in `.gitignore` so it won't be committed
- Use `EXPO_PUBLIC_` prefix for environment variables in Expo
- Restart your Expo dev server after creating/updating `.env` file

## Next Steps

After completing this setup, we'll proceed to Step 6: Set Up Database Schema.

