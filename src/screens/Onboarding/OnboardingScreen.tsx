import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CollectionMode, VariantPlacement, LayoutPreference, PokemonArtStyle } from '../../types';
import type { Region } from '../../services/api/pokemonApi';
import { createBinder } from '../../services/supabase/binders';
import { recordBinderCreated } from '../../services/pro/proService';
import { showSuccess, showError } from '../../utils/toast';
import { successVibration, lightTap } from '../../utils/haptics';
import { getAvailableVariantsForSet } from '../../data/cardVariants';
import LoadingScreen from '../../components/Loading/LoadingScreen';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, typography, borderRadius, screenPadding, shadows, type ThemeColors } from '../../constants/theme';
import Step1CollectionMode from './Step1CollectionMode';
import Step2MasterSet from './Step2MasterSet';
import Step2Region from './Step2Region';
import Step3Variants from './Step3Variants';
import Step3VariantPlacement from './Step3VariantPlacement';
import StepDisplayOrder from './StepDisplayOrder';
import Step3PokemonArtStyle from './Step3PokemonArtStyle';
import Step4Layout from './Step4Layout';
import Step5BinderName from './Step5BinderName';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'Questionnaire'>;

interface OnboardingState {
  // Step 1
  collectionMode: CollectionMode | null;
  // Step 2A (Master Set)
  selectedSetId: string | null;
  selectedSetName: string | null;
  selectedVariants: string[]; // User-selected variants (includes 'base' if chosen)
  // Step 2B (Region)
  selectedRegion: Region | null;
  // Step 3 (Region: Pokemon Art Style, Master Set: Variants)
  pokemonArtStyle: PokemonArtStyle | null;
  variantPlacement: VariantPlacement | null;
  variantOrder: string[]; // Display order of variant groups
  // Variant-aware card count (computed in Step 3, used in Step 6 layout)
  cardCount: number | null;
  // Step 4 (Region: Layout, Master Set: Variant Placement)
  layoutPreference: LayoutPreference | null;
  // Step 5 (Region: Binder Name, Master Set: Layout)
  // Step 6 (Master Set: Binder Name)
  binderName: string | null;
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToStep = (nextStep: number) => {
    const direction = nextStep > currentStep ? 1 : -1;
    Animated.timing(slideAnim, {
      toValue: direction * -1,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(direction * 1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };
  const [state, setState] = useState<OnboardingState>({
    collectionMode: null,
    selectedSetId: null,
    selectedSetName: null,
    selectedVariants: ['base'],
    selectedRegion: null,
    pokemonArtStyle: null,
    variantPlacement: null,
    variantOrder: ['base', 'reverse-holo', 'poke-ball', 'master-ball', 'stamp', 'energy', 'secret-rare'],
    cardCount: null,
    layoutPreference: null,
    binderName: null,
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Binder Creation',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Check if variant selection step (step 3) is needed for master-set mode.
  // Not needed for old sets that don't have reverse holos (e.g. Base Set, Neo, Gym).
  // Those sets only have 'base' as a variant, so there's nothing to choose.
  const needsVariantStep = (): boolean => {
    if (state.collectionMode !== 'master-set') return false;
    if (!state.selectedSetId) return true; // Default to showing it if no set selected yet
    const available = getAvailableVariantsForSet(state.selectedSetId);
    // If only 'base' is available, no need to show variant selection
    return available.length > 1;
  };

  // Check if variant placement step is needed for master-set mode.
  // Needed when user selected more than one variant type (e.g. Regular + Reverse Holo,
  // or Pokeball Holo + Masterball Holo, etc.)
  // Also not needed if variant step itself was skipped (old sets).
  const needsVariantPlacement = (): boolean => {
    if (state.collectionMode !== 'master-set') return false;
    if (!needsVariantStep()) return false;
    return state.selectedVariants.length > 1;
  };

  const handleBack = () => {
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      if (state.collectionMode === 'master-set') {
        // Step 6 (layout) — go back to display order (5) or skip variant steps
        if (currentStep === 6 && !needsVariantStep()) {
          prevStep = 2; // old sets: back to set selection
        }
        // Step 5 (display order) — skip placement (4) if only 1 variant
        if (currentStep === 5 && !needsVariantPlacement()) {
          prevStep = 3; // back to variant selection
        }
        // Step 4 (variant placement) — go back to variants (3)
        // Step 3 (variants) — go back to set (2)
      }
      animateToStep(prevStep);
    } else {
      handleCancel();
    }
  };

  // Calculate total steps (3 for custom, 5 for region, 4-7 for master-set)
  const getTotalSteps = (): number => {
    if (state.collectionMode === 'custom') return 3;
    if (state.collectionMode === 'region') return 5;
    // master-set: base is 7, minus 1 if no variant step, minus 3 if no variant step at all
    if (!needsVariantStep()) return 4; // old sets: mode → set → layout → name
    // With variants: 7 if placement needed, 6 if only placement skipped (display order always shows)
    return needsVariantPlacement() ? 7 : 6;
  };

  // Get the actual step number for display
  const getActualStep = (): number => {
    if (state.collectionMode !== 'master-set') return currentStep;
    
    let skipped = 0;
    
    // Step 3 (variants) skipped when set has no reverse holos
    if (!needsVariantStep() && currentStep > 3) skipped++;
    
    // Step 4 (variant placement) skipped when only 1 variant selected
    if (!needsVariantPlacement() && currentStep > 4) skipped++;
    
    return currentStep - skipped;
  };

  const canProceedToNextStep = (): boolean => {
    switch (currentStep) {
      case 1:
        return state.collectionMode !== null;
      case 2:
        if (state.collectionMode === 'master-set') {
          return state.selectedSetId !== null;
        } else if (state.collectionMode === 'region') {
          return state.selectedRegion !== null;
        } else if (state.collectionMode === 'custom') {
          return state.layoutPreference !== null;
        }
        return false;
      case 3:
        if (state.collectionMode === 'custom') {
          return state.binderName !== null && state.binderName.trim() !== '';
        } else if (state.collectionMode === 'region') {
          return state.pokemonArtStyle !== null;
        }
        return state.selectedVariants.length > 0;
      case 4:
        if (state.collectionMode === 'region') {
          return state.layoutPreference !== null;
        }
        // Master Set: variant placement
        return state.variantPlacement !== null;
      case 5:
        if (state.collectionMode === 'region') {
          return state.binderName !== null && state.binderName.trim() !== '';
        }
        // Master Set: display order — always valid (has defaults)
        return true;
      case 6:
        // Master Set: layout
        return state.layoutPreference !== null;
      case 7:
        // Master Set: binder name
        return state.binderName !== null && state.binderName.trim() !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Please make a selection', 'You need to select an option before continuing.');
      return;
    }

    // The last internal step number
    const lastInternalStep = state.collectionMode === 'custom' ? 3
      : state.collectionMode === 'region' ? 5
      : 7; // master-set
    
    if (currentStep === lastInternalStep) {
      handleFinish();
    } else {
      lightTap();
      let nextStep = currentStep + 1;
      
      if (state.collectionMode === 'master-set') {
        // Skip variant step for old sets without reverse holos
        if (nextStep === 3 && !needsVariantStep()) {
          setState(prev => ({ ...prev, selectedVariants: ['base'] }));
          nextStep = 6; // jump to layout
        }
        // Skip only placement if only 1 variant selected (display order still shows)
        else if (nextStep === 4 && !needsVariantPlacement()) {
          setState(prev => ({ ...prev, variantPlacement: 'grouped' }));
          nextStep = 5; // jump to display order, skip placement
        }

        // Build the variant order list when entering display order step
        if (nextStep === 5) {
          setState(prev => {
            const items = [...prev.selectedVariants, 'secret-rare'];
            const kept = prev.variantOrder.filter(k => items.includes(k));
            const missing = items.filter(k => !kept.includes(k));
            return { ...prev, variantOrder: [...kept, ...missing] };
          });
        }
      }
      
      animateToStep(nextStep);
    }
  };

  const handleFinish = async () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Error', 'Please complete all steps before finishing.');
      return;
    }

    setSaving(true);
    try {
      // Use custom binder name from user input
      const binderName = state.binderName?.trim() || 'My Binder';

      // Prepare variants array based on collection mode
      // - master-set: use the user's selected variants (includes 'base' if they chose it)
      // - region: only 'base'
      // - custom: empty array (custom binders don't track variants - user adds any cards)
      let variantsToTrack: string[];
      if (state.collectionMode === 'master-set') {
        variantsToTrack = [...state.selectedVariants];
      } else if (state.collectionMode === 'region') {
        variantsToTrack = ['base'];
      } else {
        variantsToTrack = []; // Custom mode - no variant tracking
      }

      console.log('[Questionnaire] ===== SAVING BINDER =====');
      console.log('[Questionnaire] Collection Mode:', state.collectionMode);
      console.log('[Questionnaire] Selected Variants (from state):', state.selectedVariants);
      console.log('[Questionnaire] Variants to Track (final array):', variantsToTrack);
      console.log('[Questionnaire] Set:', state.selectedSetName);
      console.log('[Questionnaire] Region:', state.selectedRegion);
      console.log('[Questionnaire] Layout:', state.layoutPreference);
      console.log('[Questionnaire] ==========================================');

      // Create binder
      const binder = await createBinder({
        name: binderName,
        collectionMode: state.collectionMode!,
        set: state.collectionMode === 'master-set' ? state.selectedSetName || undefined : undefined,
        region: state.collectionMode === 'region' ? state.selectedRegion || undefined : undefined,
        variantsToTrack: variantsToTrack.length > 0 ? variantsToTrack : undefined,
        variantPlacement: state.collectionMode === 'master-set' ? (state.variantPlacement || undefined) : undefined,
        variantOrder: state.collectionMode === 'master-set' && state.variantOrder.length > 0 ? state.variantOrder : undefined,
        layoutPreference: state.layoutPreference || undefined,
        pokemonArtStyle: state.collectionMode === 'region' ? (state.pokemonArtStyle || undefined) : undefined,
      });

      console.log('[Questionnaire] ===== BINDER CREATED =====');
      console.log('[Questionnaire] Binder ID:', binder.id);
      console.log('[Questionnaire] Binder collectionMode:', binder.collectionMode);
      console.log('[Questionnaire] Binder variantsToTrack:', binder.variantsToTrack);
      console.log('[Questionnaire] ===========================');

      // Track binder creation for Pro system limits
      try {
        await recordBinderCreated();
      } catch (err) {
        console.warn('[Questionnaire] Failed to record binder creation:', err);
      }

      // Navigate to binder detail
      successVibration();
      showSuccess('Binder created!');
      navigation.replace('BinderDetail', { binderId: binder.id });
    } catch (error: any) {
      console.error('Error creating binder:', error);
      showError('Failed to create binder', error.message || 'Please try again.');
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1CollectionMode
            value={state.collectionMode}
            onChange={(mode) => setState({ ...state, collectionMode: mode })}
          />
        );
      case 2:
        // Step 2: Set selection (Master Set), Region selection (Region), or Layout (Custom)
        if (state.collectionMode === 'master-set') {
          return (
            <Step2MasterSet
              selectedSetId={state.selectedSetId}
              selectedSetName={state.selectedSetName}
              onSetChange={(setId, setName) => setState({ ...state, selectedSetId: setId, selectedSetName: setName })}
            />
          );
        } else if (state.collectionMode === 'region') {
          return (
            <Step2Region
              selectedRegion={state.selectedRegion}
              onChange={(region) => setState({ ...state, selectedRegion: region })}
            />
          );
        } else if (state.collectionMode === 'custom') {
          return (
            <Step4Layout
              value={state.layoutPreference}
              onChange={(layout) => setState({ ...state, layoutPreference: layout })}
            />
          );
        }
        return null;
      case 3:
        // Step 3: Binder Name (Custom), Art Style (Region), or Variants (Master Set)
        if (state.collectionMode === 'custom') {
          return (
            <Step5BinderName
              value={state.binderName}
              onChange={(name) => setState({ ...state, binderName: name })}
              defaultName="My Custom Binder"
            />
          );
        } else if (state.collectionMode === 'region') {
          return (
            <Step3PokemonArtStyle
              value={state.pokemonArtStyle}
              onChange={(style) => setState({ ...state, pokemonArtStyle: style })}
            />
          );
        }
        return (
          <Step3Variants
            selectedSetId={state.selectedSetId}
            selectedVariants={state.selectedVariants}
            onChange={(variants) => setState({ ...state, selectedVariants: variants })}
            onCardCountChange={(count) => setState(prev => ({ ...prev, cardCount: count }))}
          />
        );
      case 4:
        // Step 4: Layout for Region, Variant placement for Master Set
        if (state.collectionMode === 'region') {
          return (
            <Step4Layout
              value={state.layoutPreference}
              onChange={(layout) => setState({ ...state, layoutPreference: layout })}
            />
          );
        }
        return (
          <Step3VariantPlacement
            value={state.variantPlacement}
            onChange={(placement) => setState({ ...state, variantPlacement: placement })}
          />
        );
      case 5:
        // Step 5: Binder name for Region, Display order for Master Set
        if (state.collectionMode === 'region') {
          let defaultName = 'My Binder';
          if (state.selectedRegion) {
            defaultName = `${state.selectedRegion} Region`;
          }
          return (
            <Step5BinderName
              value={state.binderName}
              onChange={(name) => setState({ ...state, binderName: name })}
              defaultName={defaultName}
            />
          );
        }
        return (
          <StepDisplayOrder
            variantPlacement={state.variantPlacement}
            variantOrder={state.variantOrder}
            onOrderChange={(order) => setState({ ...state, variantOrder: order })}
            selectedSetId={state.selectedSetId}
          />
        );
      case 6: {
        // Step 6: Layout for Master Set
        return (
          <Step4Layout
            value={state.layoutPreference}
            onChange={(layout) => setState({ ...state, layoutPreference: layout })}
            cardCount={state.cardCount}
          />
        );
      }
      case 7: {
        // Step 7: Binder name for Master Set (last step)
        let defaultName = 'My Binder';
        if (state.selectedSetName) {
          defaultName = state.selectedSetName;
        }
        return (
          <Step5BinderName
            value={state.binderName}
            onChange={(name) => setState({ ...state, binderName: name })}
            defaultName={defaultName}
          />
        );
      }
      default:
        return null;
    }
  };

  const getStepTitle = (): string => {
    const totalSteps = getTotalSteps();
    const actualStep = getActualStep();
    return `Step ${actualStep} of ${totalSteps}`;
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.savingContainer}>
        <LoadingScreen message="Creating binder..." fullScreen={false} />
      </SafeAreaView>
    );
  }

  const isLastStep = currentStep === (state.collectionMode === 'custom' ? 3 : state.collectionMode === 'region' ? 5 : 7);
  const totalSteps = getTotalSteps();
  const actualStep = getActualStep();
  const progressPercent = (actualStep / totalSteps) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel={currentStep === 1 ? 'Cancel' : 'Go back'}
          accessibilityRole="button"
        >
          {currentStep === 1 ? (
            <Text style={styles.cancelText}>Cancel</Text>
          ) : (
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          )}
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>
      {/* Step content with slide animation */}
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [-300, 0, 300],
              }),
            }],
            opacity: slideAnim.interpolate({
              inputRange: [-1, -0.5, 0, 0.5, 1],
              outputRange: [0, 0.5, 1, 0.5, 0],
            }),
          },
        ]}
      >
        {renderStep()}
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        {!canProceedToNextStep() && !isLastStep && (
          <Text style={styles.footerHint}>Select an option to continue</Text>
        )}
        <TouchableOpacity
          style={[
            styles.nextButton,
            isLastStep && styles.createButton,
            !canProceedToNextStep() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceedToNextStep()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canProceedToNextStep() }}
        >
          {isLastStep && (
            <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} style={styles.createIcon} />
          )}
          <Text style={styles.nextButtonText}>
            {isLastStep ? 'Create Binder' : 'Next'}
          </Text>
          {!isLastStep && (
            <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} style={styles.nextIcon} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  savingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    minWidth: 60,
  },
  cancelText: {
    fontSize: typography.base,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
  stepTitle: {
    fontSize: typography.sm,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
  placeholder: {
    width: 60,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.backgroundDark,
    borderRadius: 2,
    marginHorizontal: screenPadding,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: screenPadding,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  createButton: {
    backgroundColor: colors.primary,
  },
  nextButtonDisabled: {
    opacity: 0.4,
    ...shadows.sm,
  },
  nextButtonText: {
    color: colors.onPrimary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
  },
  nextIcon: {
    marginLeft: spacing.xs,
  },
  createIcon: {
    marginRight: spacing.sm,
  },
  });
