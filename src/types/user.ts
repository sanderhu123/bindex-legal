/**
 * User tier — 'free' (default) or 'pro' (purchased upgrade)
 */
export type UserTier = 'free' | 'pro';

/**
 * User interface representing a user account
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  binders: string[]; // Binder IDs
  userTier: UserTier;
  freeDeletionsUsed: number;
  lifetimeBindersCreated: number;
  proPurchasedAt?: Date;
}

/**
 * Info about a user's binder usage limits
 */
export interface BinderUsage {
  tier: UserTier;
  canCreate: boolean;
  canDelete: boolean;
  currentBinderCount: number;
  lifetimeBindersCreated: number;
  freeDeletionsUsed: number;
}

