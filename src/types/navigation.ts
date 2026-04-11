import type { StackScreenProps } from '@react-navigation/stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

// Main app navigation props
export type MainStackScreenProps<T extends keyof MainStackParamList> = StackScreenProps<
  MainStackParamList,
  T
>;

// Auth navigation props
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;












