/**
 * TCGDEX API Response Types
 * 
 * These types match the TCGDEX API response structure.
 * Reference: https://tcgdex.dev/ (TCGDEX API documentation)
 */

/**
 * Base API response structure
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

/**
 * TCGDEX Set response structure
 */
export interface TcgdexSet {
  id: string;
  name: string;
  series?: string;
  releaseDate?: string;
  legal?: {
    standard?: boolean;
    expanded?: boolean;
  };
  images?: {
    symbol?: string;
    logo?: string;
  };
}

/**
 * TCGDEX Card response structure
 */
export interface TcgdexCard {
  id: string;
  name: string;
  number?: string;
  set?: {
    id: string;
    name: string;
  };
  rarity?: string;
  artist?: string;
  images?: {
    small?: string;
    large?: string;
  };
  variants?: {
    normal: boolean;      // Regular non-foil version
    holo: boolean;        // Holofoil version
    reverse: boolean;     // Reverse holofoil version
    firstEdition: boolean; // First edition printing
    wPromo: boolean;      // W Promo variant
  }; // Note: API doesn't distinguish reverse holo patterns (pokeball vs masterball)
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: {
      normal?: {
        low?: number;
        mid?: number;
        high?: number;
      };
      holofoil?: {
        low?: number;
        mid?: number;
        high?: number;
      };
    };
  };
}

/**
 * API Error response structure
 */
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}

