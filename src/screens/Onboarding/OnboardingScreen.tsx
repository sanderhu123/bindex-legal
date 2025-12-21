import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CollectionMode, VariantPlacement, LayoutPreference, PokemonArtStyle } from '../../types';
import type { Region } from '../../services/api/pokemonApi';
import { createBinder } from '../../services/supabase/binders';
import Step1CollectionMode from './Step1CollectionMode';
import Step2MasterSet from './Step2MasterSet';
import Step2Region from './Step2Region';
import Step3Variants from './Step3Variants';
import Step3VariantPlacement from './Step3VariantPlacement';
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
  selectedVariants: string[]; // Always includes 'base' implicitly
  // Step 2B (Region)
  selectedRegion: Region | null;
  // Step 3 (Region: Pokemon Art Style, Master Set: Variants)
  pokemonArtStyle: PokemonArtStyle | null;
  variantPlacement: VariantPlacement | null;
  // Step 4 (Region: Layout, Master Set: Variant Placement)
  layoutPreference: LayoutPreference | null;
  // Step 5 (Region: Binder Name, Master Set: Layout)
  // Step 6 (Master Set: Binder Name)
  binderName: string | null;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const nfcTagId = (route.params as { nfcTagId?: string })?.nfcTagId;

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    collectionMode: null,
    selectedSetId: null,
    selectedSetName: null,
    selectedVariants: [],
    selectedRegion: null,
    pokemonArtStyle: null,
    variantPlacement: null,
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

  const handleBack = () => {
    if (currentStep > 1) {
      // For region mode: step 1 → 2 → 3 (art style) → 4 (layout) → 5 (binder name)
      // For master-set mode: step 1 → 2 → 3 (variants) → 4 (variant placement) → 5 (layout) → 6 (binder name)
      if (state.collectionMode === 'region' && currentStep === 5) {
        setCurrentStep(4); // Go back from step 5 (binder name) to step 4 (layout)
      } else if (state.collectionMode === 'region' && currentStep === 4) {
        setCurrentStep(3); // Go back from step 4 (layout) to step 3 (art style)
      } else if (state.collectionMode === 'master-set' && currentStep === 6) {
        setCurrentStep(5); // Go back from step 6 (binder name) to step 5 (layout)
      } else {
        setCurrentStep(currentStep - 1);
      }
    } else {
      handleCancel();
    }
  };

  // Calculate total steps (5 for region, 6 for master-set)
  const getTotalSteps = (): number => {
    return state.collectionMode === 'region' ? 5 : 6;
  };

  // Get the actual step number for display
  const getActualStep = (): number => {
    // For region mode: step 1 → 1, step 2 → 2, step 3 → 3, step 4 → 4, step 5 → 5
    // For master-set mode: step 1 → 1, step 2 → 2, step 3 → 3, step 4 → 4, step 5 → 5, step 6 → 6
    return currentStep;
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
        }
        return false;
      case 3:
        // Step 3: Pokemon Art Style for Region, Variants for Master Set
        if (state.collectionMode === 'region') {
          return state.pokemonArtStyle !== null; // User must select art style
        }
        // For Master Set, variants are optional (can proceed with empty array)
        return true;
      case 4:
        // Step 4: Layout for Region, Variant placement for Master Set
        if (state.collectionMode === 'region') {
          return state.layoutPreference !== null;
        }
        return state.variantPlacement !== null;
      case 5:
        // Step 5: Binder name for Region, Layout for Master Set
        if (state.collectionMode === 'region') {
          return state.binderName !== null && state.binderName.trim() !== '';
        }
        return state.layoutPreference !== null;
      case 6:
        // Step 6: Binder name for Master Set (last step)
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

    // Determine the last step based on collection mode
    const lastStep = state.collectionMode === 'region' ? 5 : 6;
    
    if (currentStep === lastStep) {
      // Last step - finish
      handleFinish();
    } else if (currentStep < lastStep) {
      setCurrentStep(currentStep + 1);
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

      // Prepare variants array (always include 'base' for master-set, just 'base' for region)
      const variantsToTrack = state.collectionMode === 'master-set' 
        ? ['base', ...state.selectedVariants]
        : ['base']; // Region mode only has base cards

      console.log('[Questionnaire] ===== SAVING BINDER WITH VARIANTS =====');
      console.log('[Questionnaire] Collection Mode:', state.collectionMode);
      console.log('[Questionnaire] Selected Variants (from state):', state.selectedVariants);
      console.log('[Questionnaire] Variants to Track (final array):', variantsToTrack);
      console.log('[Questionnaire] Set:', state.selectedSetName);
      console.log('[Questionnaire] ==========================================');

      // Create binder
      const binder = await createBinder({
        name: binderName,
        collectionMode: state.collectionMode!,
        set: state.collectionMode === 'master-set' ? state.selectedSetName || undefined : undefined,
        region: state.collectionMode === 'region' ? state.selectedRegion || undefined : undefined,
        variantsToTrack,
        variantPlacement: state.collectionMode === 'master-set' ? (state.variantPlacement || undefined) : undefined,
        layoutPreference: state.layoutPreference || undefined,
        pokemonArtStyle: state.collectionMode === 'region' ? (state.pokemonArtStyle || undefined) : undefined,
        nfcTagId: nfcTagId || undefined,
      });

      console.log('[Questionnaire] ===== BINDER CREATED =====');
      console.log('[Questionnaire] Binder ID:', binder.id);
      console.log('[Questionnaire] Binder variantsToTrack:', binder.variantsToTrack);
      console.log('[Questionnaire] ===========================');

      // Navigate to binder detail
      navigation.replace('BinderDetail', { binderId: binder.id });
    } catch (error: any) {
      console.error('Error creating binder:', error);
      Alert.alert('Error', error.message || 'Failed to create binder. Please try again.');
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
        }
        return null;
      case 3:
        // Step 3: Pokemon Art Style for Region, Variants for Master Set
        if (state.collectionMode === 'region') {
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
        // Step 5: Binder name for Region, Layout for Master Set
        if (state.collectionMode === 'region') {
          // Generate default name based on region
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
          <Step4Layout
            value={state.layoutPreference}
            onChange={(layout) => setState({ ...state, layoutPreference: layout })}
          />
        );
      case 6:
        // Step 6: Binder name for Master Set (last step)
        // Generate default name based on set
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
      <View style={styles.savingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.savingText}>Creating binder...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{currentStep === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(getActualStep() / getTotalSteps()) * 100}%` }]} />
      </View>

      {/* Step content */}
      <View style={styles.content}>{renderStep()}</View>

      {/* Footer with Next button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceedToNextStep() && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canProceedToNextStep()}
        >
          <Text style={styles.nextButtonText}>
            {(state.collectionMode === 'region' && currentStep === 5) || 
             (state.collectionMode === 'master-set' && currentStep === 6)
              ? 'Create Binder' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  savingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#eee',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
