/**
 * TCGDEX API Client
 * 
 * Base API client for making requests to the TCGDEX API.
 * TCGDEX is a free, open-source API - no authentication required.
 * 
 * Base URL: https://api.tcgdex.net/v2/
 * Documentation: https://tcgdex.dev/ (TCGDEX API)
 * 
 * Note: https://assets.tcgdex.net is for images/assets only, not API calls
 */

import type { ApiError, ApiRequestOptions } from '../../types/api';

/**
 * TCGDEX API base URL
 * Note: This is the correct API endpoint (not assets.tcgdex.net which is for images)
 */
const BASE_URL = 'https://api.tcgdex.net/v2/';

/**
 * Default headers for API requests
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Build query string from params object
 */
function buildQueryString(params: Record<string, string | number | boolean>): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Build full URL with optional query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${BASE_URL}${cleanEndpoint}`;
  
  if (params && Object.keys(params).length > 0) {
    return `${url}${buildQueryString(params)}`;
  }
  
  return url;
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const errorData = await response.json();
    return {
      error: errorData.error || 'Unknown error',
      message: errorData.message,
      statusCode: response.status,
    };
  } catch {
    // If JSON parsing fails, return a generic error
    return {
      error: 'Failed to parse error response',
      message: `HTTP ${response.status}: ${response.statusText}`,
      statusCode: response.status,
    };
  }
}

/**
 * Base API client function
 * 
 * @param endpoint - API endpoint (e.g., 'sets', 'cards', 'sets/{id}/cards')
 * @param options - Request options (method, headers, body, params)
 * @returns Promise with the response data
 * @throws ApiClientError if the request fails
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
  } = options;

  // Build full URL with query parameters
  const url = buildUrl(endpoint, params);

  // Merge default headers with custom headers
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  // Prepare request config
  const requestConfig: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body if present (for POST, PUT, etc.)
  if (body && (method === 'POST' || method === 'PUT')) {
    requestConfig.body = JSON.stringify(body);
  }

  try {
    // Log the URL for debugging (can be removed in production)
    console.log('[API] Making request to:', url);
    
    const response = await fetch(url, requestConfig);

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await parseErrorResponse(response);
      
      // Handle specific status codes
      if (response.status === 429) {
        throw new ApiClientError(
          'Rate limit exceeded. Please try again later.',
          response.status,
          errorData
        );
      }
      
      if (response.status >= 500) {
        throw new ApiClientError(
          'Server error. Please try again later.',
          response.status,
          errorData
        );
      }
      
      throw new ApiClientError(
        errorData.message || errorData.error || 'Request failed',
        response.status,
        errorData
      );
    }

    // Parse JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Handle network errors
    if (error instanceof ApiClientError) {
      throw error;
    }
    
    // Handle fetch errors (network issues, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiClientError(
        'Network error. Please check your internet connection.',
        undefined,
        error
      );
    }
    
    // Re-throw unknown errors
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      undefined,
      error
    );
  }
}

/**
 * Convenience method for GET requests
 */
export async function get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
  return apiClient<T>(endpoint, { method: 'GET', params });
}

/**
 * Convenience method for POST requests
 */
export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiClient<T>(endpoint, { method: 'POST', body });
}

/**
 * Convenience method for PUT requests
 */
export async function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiClient<T>(endpoint, { method: 'PUT', body });
}

/**
 * Convenience method for DELETE requests
 */
export async function del<T>(endpoint: string): Promise<T> {
  return apiClient<T>(endpoint, { method: 'DELETE' });
}

