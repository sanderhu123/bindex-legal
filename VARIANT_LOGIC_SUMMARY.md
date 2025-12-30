# Card Variant Logic Summary

## Overview
This document explains how card variants (Reverse Holo, Pokeball Holo, and Masterball Holo) work in the app.

---

## Variant Types

### 1. Base Card
- **Always available** for every card
- Default variant type

### 2. Holo
- Available if the TCGDEX API indicates `holo: true`
- Standard holographic cards

### 3. Reverse Holo
- Available if the TCGDEX API indicates `reverse: true`
- Standard reverse holographic cards (entire card background is holo except the artwork)

### 4. Pokeball Holo ⚡ NEW
- **Follows EXACT same logic as Reverse Holo**
- Available if `reverse: true` (same condition as reverse holo)
- Only available in special sets:
  - Prismatic Evolutions (sv08.5)
  - White Flare (sv10.5w)
  - Black Bolt (sv10.5b)

### 5. Masterball Holo ⚡ NEW
- **Almost same as Reverse Holo + Pokemon restriction**
- Available if `reverse: true` AND card is `Supertype: "Pokemon"`
- NOT available for Trainer or Energy cards
- Only available in special sets:
  - Prismatic Evolutions (sv08.5)
  - White Flare (sv10.5w)
  - Black Bolt (sv10.5b)

---

## Logic Rules

### Pokeball Holo Logic
```
IF card has reverse holo (reverse: true)
THEN card can have Pokeball holo variant
```
**Same as reverse holo - no additional restrictions**

### Masterball Holo Logic
```
IF card has reverse holo (reverse: true)
AND card supertype === "Pokemon"
THEN card can have Masterball holo variant
```
**Same as reverse holo BUT only for Pokemon cards**

---

## Implementation Details

### Files Modified

#### 1. `src/data/cardVariants.ts`
- Contains `SPECIAL_VARIANT_SETS` array with set IDs that have special variants
- `getSpecialVariantsForCard()` function implements the logic:
  ```typescript
  // Pokeball: Available for all cards with reverse holo
  variants.push('poke-ball');

  // Masterball: Only available for Pokemon cards with reverse holo
  if (supertype === 'Pokémon' || supertype === 'Pokemon') {
    variants.push('master-ball');
  }
  ```
- Handles both "Pokémon" (with accent) and "Pokemon" (without) from TCGDEX API

#### 2. `src/services/api/pokemonApi.ts`
- `generateVariantCards()` function generates all variant cards
- Uses `getSpecialVariantsForCard()` to determine which special variants are available
- Logs variant generation for debugging: `[VARIANT]` prefix

### Visual Display

#### Badge Colors (defined in `src/constants/theme.ts`)
- **Reverse Holo**: Gold (#FFD700) - Badge: "RH"
- **Pokeball Holo**: Red (#FF6B6B) - Badge: "PB"
- **Masterball Holo**: Teal (#4ECDC4) - Badge: "MB"

#### UI Components
- `CardItem.tsx`: Shows variant badges on card grid/list items
- `CardDetails.tsx`: Shows variant badges on card detail screen
- `VariantSelector.tsx`: Allows users to select which variants to track during onboarding

---

## Examples

### Example 1: Pikachu (Pokemon) in Prismatic Evolutions
- Has `reverse: true` in API
- Supertype: "Pokémon"
- **Available variants**: Base, Holo(?), Reverse Holo, **Pokeball Holo**, **Masterball Holo**

### Example 2: Professor's Research (Trainer) in Prismatic Evolutions
- Has `reverse: true` in API
- Supertype: "Trainer"
- **Available variants**: Base, Reverse Holo, **Pokeball Holo**
- **NOT available**: Masterball Holo (because it's a Trainer, not a Pokemon)

### Example 3: Basic Energy (Energy) in Prismatic Evolutions
- Has `reverse: true` in API
- Supertype: "Energy"
- **Available variants**: Base, Reverse Holo, **Pokeball Holo**
- **NOT available**: Masterball Holo (because it's an Energy, not a Pokemon)

### Example 4: Any card in Base Set
- Base Set is NOT a special variant set
- **Available variants**: Base, Holo(?), Reverse Holo
- **NOT available**: Pokeball Holo, Masterball Holo (set doesn't support them)

---

## Testing

To test the variant logic:

1. **Create a binder** with a special set (Prismatic Evolutions, White Flare, or Black Bolt)
2. **Check during onboarding** - should see options for Reverse Holo, Pokeball Holo, and Masterball Holo
3. **View cards in binder** - Pokemon cards should show all three special variants
4. **View Trainer/Energy cards** - should NOT show Masterball Holo badge
5. **Check console logs** - look for `[VARIANT]` prefix to see what variants are generated

---

## Technical Notes

### API Field Mapping
- TCGDEX API field `category` maps to our `supertype`
- TCGDEX API field `variants.reverse` maps to our `hasReverse` check
- TCGDEX returns "Pokémon" (with accent), but we also support "Pokemon" (without) for compatibility

### Database Storage
- Each variant is stored as a separate card ID: `{baseId}-{variant}`
- Example: `sv08.5-1-base`, `sv08.5-1-reverse`, `sv08.5-1-poke-ball`, `sv08.5-1-master-ball`
- Users select which variants to track in `binder.variantsToTrack` array

### Progress Tracking
- Progress calculation includes only the variants user selected to track
- If user only tracks Base + Reverse Holo, Pokeball and Masterball variants don't count toward 100%

---

## Summary

✅ **Pokeball Holo** = Reverse Holo logic (no changes)
✅ **Masterball Holo** = Reverse Holo logic + Pokemon only
✅ Implementation complete and committed
✅ All UI components already support the variants
✅ Logging in place for debugging

**Date Implemented**: December 21, 2025
**Status**: ✅ Complete


