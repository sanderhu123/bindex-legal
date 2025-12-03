/**
 * Theme constants for consistent styling across the app
 * Follows "simple and clean" design principle
 */

export const colors = {
  // Primary colors
  primary: '#007AFF',
  primaryDark: '#0051D5',
  primaryLight: '#5AC8FA',
  
  // Secondary colors
  secondary: '#5856D6',
  
  // Background colors
  background: '#FFFFFF',
  backgroundLight: '#F5F5F5',
  backgroundDark: '#E0E0E0',
  
  // Text colors
  text: '#000000',
  textSecondary: '#333333',
  textTertiary: '#666666',
  textLight: '#999999',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  
  // Status colors
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  
  // Card variant colors
  variantReverseHolo: '#FFD700',
  variantPokeBall: '#FF6B6B',
  variantMasterBall: '#4ECDC4',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.9)',
  
  // Disabled state
  disabled: '#CCCCCC',
  disabledText: '#999999',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  
  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Screen padding (consistent across all screens)
export const screenPadding = spacing.lg;

// Component spacing
export const componentSpacing = {
  small: spacing.sm,
  medium: spacing.md,
  large: spacing.lg,
} as const;

