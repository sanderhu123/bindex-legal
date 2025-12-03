# Remaining UI/UX Improvements - Todo List

This document tracks the remaining UI/UX improvements from Step 21 that haven't been implemented yet.

## Status: Ready to Implement

---

## High Priority

### 1. Create Reusable Button Components
**Status:** Not started

**What to do:**
- Create standardized button components to replace all `TouchableOpacity` buttons
- Ensure consistent styling, loading states, and disabled states

**Files to create:**
- `src/components/Button/PrimaryButton.tsx` - Primary action button (blue)
- `src/components/Button/SecondaryButton.tsx` - Secondary action button (outlined)
- `src/components/Button/TextButton.tsx` - Text-only button (for links)

**Features:**
- Loading state support (shows spinner or "Loading..." text)
- Disabled state styling
- Consistent sizing (small, medium, large variants)
- Uses theme colors
- Proper touch feedback

**Files to update:**
- `src/screens/BinderList/BinderListScreen.tsx` - Replace create button, logout button
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Replace view toggle buttons
- `src/screens/Auth/LoginScreen.tsx` - Replace login, social buttons
- `src/screens/Auth/SignupScreen.tsx` - Replace signup button
- `src/screens/CardDetail/CardDetailScreen.tsx` - Replace ownership toggle button
- `src/components/EmptyState/EmptyState.tsx` - Use PrimaryButton
- `src/components/Error/ErrorScreen.tsx` - Use PrimaryButton and SecondaryButton
- Any other screens with buttons

**Testing:**
- [ ] All buttons use new components
- [ ] Loading states work correctly
- [ ] Disabled states work correctly
- [ ] Buttons look consistent across app
- [ ] Touch feedback works properly

---

### 2. Improve Spacing Consistency
**Status:** Not started

**What to do:**
- Review all screens and ensure spacing uses theme constants
- Standardize padding and margins throughout the app

**Files to review/update:**
- `src/screens/Onboarding/OnboardingScreen.tsx` and all step screens
- `src/screens/NfcHandler/NfcHandlerScreen.tsx`
- `src/components/Binder/BinderCard.tsx`
- `src/components/Card/CardItem.tsx`
- `src/components/Search/SearchBar.tsx`
- `src/components/Filter/FilterPanel.tsx`
- `src/components/Progress/ProgressBar.tsx`
- Any other components with hardcoded spacing

**Standard spacing to use:**
- Screen padding: `screenPadding` (24px)
- Component margins: `spacing.md` (16px)
- Small gaps: `spacing.sm` (8px)
- Large gaps: `spacing.lg` (24px)

**Testing:**
- [ ] All spacing uses theme constants
- [ ] No hardcoded padding/margin values
- [ ] Spacing looks consistent across screens
- [ ] Components have proper spacing between them

---

### 3. Improve Typography Consistency
**Status:** Not started

**What to do:**
- Review all text elements and ensure they use theme typography
- Create reusable text components (optional but helpful)

**Files to review/update:**
- All screen files - check all `Text` components
- All component files - check all `Text` components
- Replace hardcoded font sizes with theme typography values

**Optional: Create text components:**
- `src/components/Text/Heading.tsx` - For headings (h1, h2, h3 variants)
- `src/components/Text/Body.tsx` - For body text
- `src/components/Text/Caption.tsx` - For small text/captions

**Testing:**
- [ ] All text uses theme typography
- [ ] No hardcoded font sizes
- [ ] Typography looks consistent across app
- [ ] Text is readable and properly sized

---

## Medium Priority

### 4. Add Safe Area Handling
**Status:** Not started

**What to do:**
- Ensure content isn't hidden behind notches/status bars
- Use `react-native-safe-area-context` (already installed)

**Files to update:**
- `src/screens/BinderList/BinderListScreen.tsx`
- `src/screens/BinderDetail/BinderDetailScreen.tsx`
- `src/screens/CardDetail/CardDetailScreen.tsx`
- `src/screens/Auth/LoginScreen.tsx`
- `src/screens/Auth/SignupScreen.tsx`
- All other screens

**Implementation:**
- Wrap screens with `SafeAreaView` or use `useSafeAreaInsets()` hook
- Ensure headers and content respect safe areas

**Testing:**
- [ ] Content visible on devices with notches
- [ ] No content hidden behind status bar
- [ ] Works on both iOS and Android
- [ ] Bottom content accessible (not hidden by home indicator)

---

### 5. Add Visual Feedback (Toasts/Notifications)
**Status:** Not started

**What to do:**
- Add success/error feedback for user actions
- Use `react-native-paper` Snackbar (already installed)

**Files to create:**
- `src/components/Toast/Toast.tsx` or use react-native-paper Snackbar directly

**Actions to add feedback for:**
- Card added to binder
- Card removed from binder
- Binder created
- Binder deleted
- Any other user actions

**Files to update:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Card add/remove feedback
- `src/screens/BinderList/BinderListScreen.tsx` - Binder delete feedback
- `src/screens/Onboarding/OnboardingScreen.tsx` - Binder creation feedback
- Any other screens with user actions

**Testing:**
- [ ] Success messages show when actions complete
- [ ] Error messages show when actions fail
- [ ] Toasts don't block UI
- [ ] Messages are clear and helpful

---

### 6. Improve Onboarding/Questionnaire UX
**Status:** Not started

**What to do:**
- Add progress indicator (step X of Y)
- Improve step transitions
- Better visual separation between steps
- Add "Skip" option where appropriate

**Files to update:**
- `src/screens/Onboarding/OnboardingScreen.tsx`
- All step components (Step1CollectionMode, Step2MasterSet, etc.)

**Features to add:**
- Progress bar showing current step
- Step counter (e.g., "Step 2 of 5")
- Smooth transitions between steps
- Better visual hierarchy

**Testing:**
- [ ] Progress indicator shows correctly
- [ ] Step transitions are smooth
- [ ] Users can navigate back/forward easily
- [ ] Steps are clearly separated visually

---

## Low Priority (Nice to Have)

### 7. Add Pull-to-Refresh Consistency
**Status:** Not started

**What to do:**
- Add pull-to-refresh to screens that fetch data
- Currently only BinderListScreen has it

**Files to update:**
- `src/screens/BinderDetail/BinderDetailScreen.tsx` - Add pull-to-refresh for cards
- Any other list screens that fetch data

**Testing:**
- [ ] Pull-to-refresh works on all list screens
- [ ] Refresh indicator shows correctly
- [ ] Data updates after refresh

---

### 8. Accessibility Improvements
**Status:** Not started

**What to do:**
- Add accessibility labels to interactive elements
- Ensure touch targets are at least 44x44 points
- Test with screen readers

**Files to update:**
- All screen files - add `accessibilityLabel` to buttons, inputs, etc.
- All component files - add accessibility props

**Testing:**
- [ ] All interactive elements have accessibility labels
- [ ] Touch targets meet minimum size requirements
- [ ] Works with screen readers (iOS VoiceOver, Android TalkBack)

---

## Summary

**Completed:**
- ✅ Theme/constants system
- ✅ Standardized loading states
- ✅ Standardized empty states
- ✅ Standardized error handling
- ✅ Grid layout fix

**Remaining:**
- [ ] Button components (High priority)
- [ ] Spacing consistency (High priority)
- [ ] Typography consistency (High priority)
- [ ] Safe area handling (Medium priority)
- [ ] Visual feedback/toasts (Medium priority)
- [ ] Onboarding polish (Medium priority)
- [ ] Pull-to-refresh consistency (Low priority)
- [ ] Accessibility improvements (Low priority)

---

## Notes

- All improvements should follow the "simple and clean" design principle
- Use theme constants for all styling
- Test on both iOS and Android
- Keep changes incremental - test after each improvement

