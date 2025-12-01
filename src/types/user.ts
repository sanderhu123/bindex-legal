/**
 * User interface representing a user account
 */
export interface User {
  id: string;
  email: string;
  displayName?: string;
  binders: string[]; // Binder IDs
}

