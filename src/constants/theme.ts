/**
 * Bindex Design System
 * Clean & minimal with neutral palette. Primary teal (#126D5F) used sparingly.
 * Font: Poppins
 */

export const colors = {
  // Primary — used sparingly for key actions and accents
  primary: '#126D5F',
  primaryDark: '#0E5A4E',
  primaryLight: '#1A8F7D',

  // Secondary
  secondary: '#2D2D2D',

  // Backgrounds
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  backgroundDark: '#EEEEEE',

  // Surface (cards, modals)
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  text: '#1A1A1A',
  textSecondary: '#4A4A4A',
  textTertiary: '#8A8A8A',
  textLight: '#B0B0B0',

  // Borders
  border: '#E8E8E8',
  borderLight: '#F2F2F2',

  // Status colors
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#126D5F',

  // Card variant colors
  variantReverseHolo: '#FFD700',
  variantPokeBall: '#FF6B6B',
  variantMasterBall: '#4ECDC4',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(255, 255, 255, 0.9)',

  // Disabled
  disabled: '#D4D4D4',
  disabledText: '#B0B0B0',
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
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
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,

  // Weight values kept for backward compatibility
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
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const screenPadding = spacing.lg;

export const componentSpacing = {
  small: spacing.sm,
  medium: spacing.md,
  large: spacing.lg,
} as const;
