/**
 * User-friendly error messages (Step 24G)
 * 
 * Converts technical errors into friendly, actionable messages
 */

export interface FriendlyError {
  title: string;
  message: string;
  actionText?: string;
  canRetry: boolean;
}

/**
 * Convert technical error to user-friendly error
 */
export function getFriendlyError(error: any): FriendlyError {
  // Handle rate limit errors
  if (
    error?.status === 429 ||
    error?.statusCode === 429 ||
    error?.message?.toLowerCase().includes('rate limit') ||
    error?.message?.toLowerCase().includes('too many requests')
  ) {
    return {
      title: 'Please Wait',
      message: 'We\'re making too many requests to the card database. Please wait a moment and try again.',
      actionText: 'Retry',
      canRetry: true,
    };
  }

  // Handle network errors
  if (
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('fetch') ||
    error?.message?.toLowerCase().includes('connection') ||
    error?.message?.toLowerCase().includes('timeout')
  ) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to the internet. Please check your connection and try again.',
      actionText: 'Retry',
      canRetry: true,
    };
  }

  // Handle not found errors
  if (
    error?.status === 404 ||
    error?.statusCode === 404 ||
    error?.message?.toLowerCase().includes('not found')
  ) {
    return {
      title: 'Not Found',
      message: 'The requested card or set could not be found. It may have been removed or renamed.',
      actionText: 'Go Back',
      canRetry: false,
    };
  }

  // Handle auth errors
  if (
    error?.status === 401 ||
    error?.statusCode === 401 ||
    error?.message?.toLowerCase().includes('unauthorized') ||
    error?.message?.toLowerCase().includes('authentication')
  ) {
    return {
      title: 'Authentication Required',
      message: 'Please log in to continue using the app.',
      actionText: 'Log In',
      canRetry: false,
    };
  }

  // Handle permission errors
  if (
    error?.status === 403 ||
    error?.statusCode === 403 ||
    error?.message?.toLowerCase().includes('forbidden') ||
    error?.message?.toLowerCase().includes('permission')
  ) {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to access this resource.',
      actionText: 'Go Back',
      canRetry: false,
    };
  }

  // Handle server errors
  if (
    error?.status >= 500 ||
    error?.statusCode >= 500 ||
    error?.message?.toLowerCase().includes('server error')
  ) {
    return {
      title: 'Server Problem',
      message: 'The card database is having technical difficulties. Please try again in a few minutes.',
      actionText: 'Retry',
      canRetry: true,
    };
  }

  // Handle validation errors
  if (
    error?.status === 400 ||
    error?.statusCode === 400 ||
    error?.message?.toLowerCase().includes('invalid') ||
    error?.message?.toLowerCase().includes('validation')
  ) {
    return {
      title: 'Invalid Request',
      message: error?.message || 'The request was invalid. Please check your input and try again.',
      actionText: 'Go Back',
      canRetry: false,
    };
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: error?.message || 'An unexpected error occurred. Please try again.',
    actionText: 'Retry',
    canRetry: true,
  };
}

/**
 * Get friendly message for specific API operations
 */
export function getOperationError(operation: string, error: any): FriendlyError {
  const baseError = getFriendlyError(error);

  // Customize message based on operation
  switch (operation) {
    case 'getSets':
    case 'getSetsMinimal':
      return {
        ...baseError,
        message: 'Unable to load card sets. Please check your internet connection and try again.',
      };

    case 'getCardsBySet':
      return {
        ...baseError,
        message: 'Unable to load cards for this set. Please check your internet connection and try again.',
      };

    case 'getCardById':
      return {
        ...baseError,
        message: 'Unable to load this card. Please check your internet connection and try again.',
      };

    case 'addCardToBinder':
      return {
        ...baseError,
        message: 'Unable to add card to binder. Please try again.',
      };

    case 'removeCardFromBinder':
      return {
        ...baseError,
        message: 'Unable to remove card from binder. Please try again.',
      };

    default:
      return baseError;
  }
}

/**
 * Log error with context
 */
export function logError(operation: string, error: any, context?: any): void {
  console.error(`[24G-ERROR] ${operation} failed:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp: new Date().toISOString(),
  });
}

