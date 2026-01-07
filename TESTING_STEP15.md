# Testing Guide - Step 15: Card Display Components

This guide will help you test that Step 15 has been implemented correctly. Step 15 is about the components that display Pokémon cards.

---

## What You're Testing

Step 15 created three new card display components:
1. **CardImage** - Shows card images with loading placeholders and error handling
2. **CardDetails** - Shows card information (name, number, set, rarity, artist)
3. **CardItem** - The complete card display (uses CardImage and CardDetails)

---

## Prerequisites

Before testing, make sure you have:
- ✅ Logged into the app
- ✅ Created at least one binder (if you don't have one, create one first)

**To create a binder (if needed):**
1. Open the app
2. Log in
3. You should see the Binder List screen (if not, navigate there)
4. Tap "Create New Binder" or the "+" button
5. Complete the questionnaire to create a binder

---

## How to Navigate to Cards

**Step 1:** Open the app and log in

**Step 2:** You should see the **Binder List** screen showing your binders

**Step 3:** Tap on any binder to open the **Binder Detail** screen

**Step 4:** This is where cards are displayed! You should see cards in a grid layout.

---

## Testing Checklist

### Test 1: Cards Display in Grid View ✅

**What to check:**
- [ ] Cards appear in a grid (multiple cards per row)
- [ ] Each card shows:
  - Card image
  - Card name
  - Card number (like "001/150")
- [ ] Cards are arranged neatly in rows

**Expected result:** You should see a grid of cards with images, names, and numbers visible.

---

### Test 2: Image Loading Placeholder ⏳

**What to check:**
- [ ] When you first open the binder detail screen, you might briefly see a loading spinner on cards
- [ ] The spinner should disappear once images load
- [ ] After images load, they should remain visible (not reload)

**Expected result:** Cards show a loading indicator briefly, then display the actual card images.

**Tip:** If you don't see loading spinners, the images might be cached already. Try:
- Close and reopen the app
- Navigate away and come back to the binder

---

### Test 3: Missing Cards Show at 50% Opacity 👻

**What to check:**
- [ ] Some cards appear dimmed/transparent (these are cards you don't own yet)
- [ ] Cards you own appear normal/bright
- [ ] Missing cards are clearly different from owned cards

**How to test:**
1. Look at your binder - you should see some cards that are dimmed
2. Tap on a dimmed card to mark it as "owned"
3. The card should become brighter/normal
4. Tap it again to mark it as "missing"
5. The card should become dimmed again

**Expected result:** Missing cards are 50% transparent, owned cards are 100% visible.

---

### Test 4: Switch to List View 📋

**What to check:**
- [ ] There should be a button or toggle to switch views (look for grid/list icons)
- [ ] Tap it to switch to list view
- [ ] Cards should display in a list (one card per row)
- [ ] Each card in list view should show:
  - Small card image on the left
  - Card name
  - Card number
  - Set name
  - Rarity

**Expected result:** Cards display differently in list view - more information visible, one card per row.

---

### Test 5: Card Images Maintain Correct Size 📐

**What to check:**
- [ ] Card images are not stretched or squished
- [ ] Cards look like proper Pokémon cards (taller than they are wide)
- [ ] All cards have the same size/aspect ratio

**Expected result:** All card images maintain proper proportions (aspect ratio).

---

### Test 6: Variant Badges (If Applicable) 🏷️

**What to check:**
- [ ] Some cards might have small colored badges (like "RH" for Reverse Holo)
- [ ] Badges appear in the corner of the card image
- [ ] Different variants have different badge colors

**Note:** You might not see variant badges if your binder doesn't track variants or if all cards are base versions.

---

### Test 7: Error Handling (Advanced) ⚠️

**What to check if an image fails to load:**
- [ ] If an image can't load, you should see a "?" symbol instead
- [ ] The app should not crash
- [ ] Other cards should still display normally

**How to test:** This is hard to test manually, but if you see a "?" on any card, that means the error handling is working!

---

### Test 8: Tap Cards to Toggle Ownership ☑️

**What to check:**
- [ ] Tap any card to mark it as "owned" or "missing"
- [ ] A checkbox (☑ or ☐) should appear on the card
- [ ] The card's opacity should change (dimmed = missing, bright = owned)
- [ ] Progress percentage at the top should update

**Expected result:** Tapping cards toggles between owned/missing and updates the display immediately.

---

## Visual Checks

### Grid View Should Show:
- ✅ Card images in a grid layout
- ✅ Card name below each image
- ✅ Card number below the name
- ✅ Checkbox indicator (☑ or ☐) on each card
- ✅ Variant badges (if applicable)
- ✅ Missing cards at 50% opacity

### List View Should Show:
- ✅ One card per row
- ✅ Small card image on the left
- ✅ Card information on the right (name, number, set, rarity)
- ✅ Checkbox indicator on the right side
- ✅ Missing cards at 50% opacity

---

## Common Issues and Solutions

### Problem: "I don't see any cards"

**Solutions:**
1. Make sure you've created a binder
2. Make sure you've selected a set or region in the binder
3. Try creating a new binder and selecting a set
4. Check if you're logged in

### Problem: "Images are not loading"

**Solutions:**
1. Check your internet connection
2. Wait a few seconds - images might be loading
3. Close and reopen the app
4. Check if other cards load (might be specific image URLs)

### Problem: "Cards look stretched or weird"

**Solutions:**
1. This shouldn't happen with Step 15 - if it does, report it!
2. Try switching between grid and list view
3. Close and reopen the app

---

## What Success Looks Like

✅ **You know Step 15 works correctly when:**
- Cards display in a grid with images, names, and numbers
- Loading indicators appear briefly when images load
- Missing cards are clearly dimmed (50% opacity)
- You can switch between grid and list views
- You can tap cards to toggle ownership
- Card images maintain proper proportions
- No errors or crashes occur

---

## Next Steps

Once Step 15 is confirmed working:
- ✅ Step 16: Add/Remove Cards functionality
- ✅ Step 17: Card Detail Screen (full card view when you tap a card)

---

## Need Help?

If something doesn't work as expected:
1. Take a screenshot
2. Note what you were doing when the issue occurred
3. Check the console/terminal for any error messages
4. Report the issue with details

---

**Happy Testing! 🎮**






