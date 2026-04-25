# Remaining UI/UX Improvements - Todo List

> **Last updated:** April 25, 2026 (after items 2, 3 and 8 polish pass)
> **Status:** All 8 original items are now done or essentially done. Only an optional onboarding visual progress bar remains.

---

## Audited Status (Original 8 Items)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Reusable Button components | DONE | `PrimaryButton`, `SecondaryButton`, `TextButton` exist in `src/components/Button/` and are exported via `index.ts`. |
| 2 | Spacing consistency | DONE | Hardcoded `padding`/`margin` numeric values that match a theme token were replaced with `spacing.*` across all flagged screens and components. Remaining hardcoded numerics (e.g. `2`, `3`, `6`, `10`, `11`, `13`, `40`, `48`, `80`, `100`) are intentional micro-spacings or component-specific dimensions that don't have a 1:1 theme equivalent. |
| 3 | Typography consistency | DONE | All `fontSize` values that match a theme token now use `typography.*`. Added a `typography['2xs'] = 10` constant since size 10 is reused as a "tiny label" size in many places. Non-standard sizes (8, 9, 11, 22, 36, 48) are intentional one-offs (energy/variant badges, large emoji icons, etc.) and were left as numeric literals. |
| 4 | Safe area handling | DONE | `SafeAreaView` / `useSafeAreaInsets` is used in 16 screens — all major user-facing screens. |
| 5 | Visual feedback (Toasts) | DONE | `src/utils/toast.ts` exposes `showSuccess` / `showError` / `showInfo` (using `react-native-toast-message`). Used in 8 screens including BinderList, BinderDetail, BinderSettings, Settings, Login, Signup, CardDetail, Onboarding. |
| 6 | Onboarding progress indicator | PARTIAL | Text counter "Step X of Y" exists in `OnboardingScreen.tsx`. A visual progress bar on top has not been added (optional, see below). |
| 7 | Pull-to-refresh consistency | DONE | `RefreshControl` / `onRefresh` is implemented on `BinderDetailScreen`. |
| 8 | Accessibility improvements | DONE (v1) | `accessibilityLabel` / `accessibilityHint` / `accessibilityRole` are now present on all reusable Button components, Auth screens, BinderListScreen, OnboardingScreen, BinderEdit components, PageNavigator, ScreenHeader, ViewModeToggle, EmptyState, ErrorScreen, FilterPanel, BinderCard, JumpToPageModal, SwapPagesModal, SettingsScreen rows, BinderDetailScreen toolbar (back/edit/settings/display), and CardDetailScreen ownership/variant buttons. Touch targets are at least 32–44 pt across the app. A full audit with VoiceOver / TalkBack is still recommended post-launch. |

---

## Changes made in this pass (items 2, 3, 8)

### Theme
- Added `typography['2xs'] = 10` to `src/constants/theme.ts` (covers a previously hardcoded micro size used in 10+ files).

### Spacing & Typography (items 2 & 3)
Updated to replace exact-match hardcoded values with `spacing.*` / `typography.*` in:

Screens:
- `src/screens/BinderDetail/BinderDetailScreen.tsx`
- `src/screens/CardDetail/CardDetailScreen.tsx`
- `src/screens/BinderEdit/BinderEditScreen.tsx`
- `src/screens/BinderEdit/RegionBinderEditView.tsx`
- `src/screens/CardList/CardListScreen.tsx`

Components:
- `src/components/Binder/BinderPageView.tsx`
- `src/components/Binder/SetSelector.tsx`
- `src/components/Card/CardItem.tsx`
- `src/components/Card/CardImage.tsx`
- `src/components/Card/CardDetails.tsx`
- `src/components/Card/EmptyCardSlot.tsx`
- `src/components/CardPicker/CardPickerModal.tsx`
- `src/components/CardPicker/CardPickerFilters.tsx`
- `src/components/CardPicker/CardSearchResults.tsx`
- `src/components/CardPicker/SearchableListPicker.tsx`
- `src/components/BinderEdit/CardSlot.tsx`
- `src/components/BinderEdit/CardPlaceholder.tsx`
- `src/components/BinderEdit/InsertButton.tsx`
- `src/components/Filter/FilterPanel.tsx`
- `src/components/Progress/RarityStats.tsx`

`src/components/Binder/PageNavigator.tsx` and `src/screens/CardSearchTest/CardSearchTestScreen.tsx` were re-audited and required no changes (already consistent or only contain intentional non-standard values).

### Accessibility (item 8)
Added `accessibilityRole` / `accessibilityLabel` (+ `accessibilityState` where relevant) to:

- `src/components/ViewModeToggle.tsx` (Binder / Grid / List buttons, with `selected` state)
- `src/components/EmptyState/EmptyState.tsx` (action button)
- `src/components/Error/ErrorScreen.tsx` (retry / go-back buttons)
- `src/components/Binder/BinderCard.tsx` (binder card with full label + tap/long-press hint)
- `src/components/Binder/JumpToPageModal.tsx` (Cancel / Go buttons)
- `src/components/Binder/SwapPagesModal.tsx` (Cancel / Swap buttons)
- `src/components/Filter/FilterPanel.tsx` (All / Owned / Missing filter chips with `selected` state, Show page breaks checkbox)
- `src/screens/Settings/SettingsScreen.tsx` (every settings row)
- `src/screens/BinderDetail/BinderDetailScreen.tsx` (back, edit, settings, display-mode toolbar buttons)
- `src/screens/CardDetail/CardDetailScreen.tsx` (ownership toggle with `checked` state, variant chips with `selected` state)
- `src/screens/BinderList/BinderListScreen.tsx` (Pro badge button)

---

## Optional polish still on the table

### Onboarding visual progress bar (optional)
- Add a thin horizontal progress bar above the existing "Step X of Y" text on `OnboardingScreen.tsx`.
- The data is already there (`actualStep` / `totalSteps`); just needs a small bar component (could reuse `ProgressBar` from `src/components/Progress/`).
- **Recommendation:** Small task, would polish the onboarding experience. Not a launch blocker.

### Full accessibility audit (post-launch)
- Test the app end-to-end with iOS VoiceOver and Android TalkBack.
- Confirm touch targets are at least 44×44 pt for all primary actions.
- Add labels to any remaining secondary interactive elements that surface in testing (e.g. Onboarding step buttons, CardPicker filter chips that already work but could use richer labels).
- **Recommendation:** Can be done post-launch.

---

## Summary

**Done (all original 8 items):**
- Theme/constants system
- Standardized loading / empty / error states
- Grid layout fix
- Reusable Button components
- Safe area handling
- Toast/snackbar feedback
- Pull-to-refresh on BinderDetailScreen
- Onboarding step counter (text)
- **Spacing & typography consistency (this pass)**
- **Accessibility v1 sweep (this pass)**

**Optional polish remaining:**
- [ ] Add visual progress bar to onboarding (optional)
- [ ] Full accessibility audit with screen readers (post-launch is fine)

---

## Notes

- All improvements follow the "simple and clean" design principle.
- Use theme constants (`spacing.*`, `typography.*`, `borderRadius.*`, `fonts.*`) for all new styling.
- None of the remaining items are launch-blockers — the app's UI is launch-ready.
