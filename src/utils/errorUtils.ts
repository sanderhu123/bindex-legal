/**
 * Error Utilities for Step 32C: Error Handling & Edge Cases
 * 
 * Provides:
 * - Error classification (network, rate limit, not found, etc.)
 * - User-friendly error messages
 * - Error type constants
 */

/**
 * Error types that can occur in the app
 */
export type AppErrorType = 
  | 'network'
  | 'rate_limit'
  | 'not_found'
  | 'duplicate'
  | 'auth'
  | 'server'
  | 'unknown';

/**
 * Structured app error with type and user message
 */
export interface AppError {
  type: AppErrorType;
  message: string;
  originalError?: Error;
  canRetry: boolean;
}

/**
 * Check if an error is a network/connectivity error
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('internet') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('networkerror')
  );
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Check for explicit rate limit mentions
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return true;
  }
  
  // Check for HTTP 429 status
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.status === 429 || err.statusCode === 429 || err.response?.status === 429) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an error is a "not found" error
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (errorMessage.includes('not found')) {
    return true;
  }
  
  // Check for HTTP 404 status
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.status === 404 || err.statusCode === 404 || err.response?.status === 404) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (errorMessage.includes('server error') || errorMessage.includes('internal server')) {
    return true;
  }
  
  // Check for HTTP 5xx status
  if (error && typeof error === 'object') {
    const err = error as any;
    const status = err.status || err.statusCode || err.response?.status;
    if (status && status >= 500 && status < 600) {
      return true;
    }
  }
  
  return false;
}

/**
 * Classify an error and return its type
 */
export function classifyError(error: unknown): AppErrorType {
  if (isNetworkError(error)) return 'network';
  if (isRateLimitError(error)) return 'rate_limit';
  if (isNotFoundError(error)) return 'not_found';
  if (isServerError(error)) return 'server';
  
  // Check for auth errors
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (errorMessage.includes('auth') || errorMessage.includes('not authenticated')) {
    return 'auth';
  }
  
  return 'unknown';
}

/**
 * User-friendly error messages for each error type
 */
const ERROR_MESSAGES: Record<AppErrorType, string> = {
  network: 'No internet connection. Please check your connection and try again.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  not_found: 'The card you\'re looking for is no longer available.',
  duplicate: 'This card is already in your binder.',
  auth: 'Please log in to continue.',
  server: 'The card database is temporarily unavailable. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Convert any error to a user-friendly AppError
 */
export function toAppError(error: unknown): AppError {
  const type = classifyError(error);
  const originalError = error instanceof Error ? error : new Error(String(error));
  
  return {
    type,
    message: ERROR_MESSAGES[type],
    originalError,
    canRetry: type === 'network' || type === 'rate_limit' || type === 'server',
  };
}

/**
 * Get a user-friendly message for an error
 * This is the main function to use in UI components
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  return appError.message;
}

/**
 * Check if an error is retryable
 */
export function canRetryError(error: unknown): boolean {
  const appError = toAppError(error);
  return appError.canRetry;
}

/**
 * Sanitize a search query to prevent issues
 * - Removes special characters that could cause API problems
 * - Trims whitespace
 * - Limits length to prevent abuse
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  // Trim whitespace
  let sanitized = query.trim();
  
  // Limit length to 100 characters (reasonable for Pokémon names)
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  // Remove dangerous characters that could break API calls
  // Keep: letters, numbers, spaces, hyphens, apostrophes (for names like "Farfetch'd")
  // Remove: quotes, brackets, slashes, etc.
  sanitized = sanitized.replace(/[<>{}[\]\\\/"|`~!@#$%^&*()+=;:]/g, '');
  
  // Collapse multiple spaces into one
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized;
}

/**
 * Truncate a long name for display
 * Used for very long Pokémon names in compact views
 */
export function truncateName(name: string, maxLength: number = 20): string {
  if (!name || name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
}
