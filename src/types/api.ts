/**
 * pokemontcg.io API Response Types
 * 
 * These types match the pokemontcg.io API v2 response structure.
 * Reference: https://docs.pokemontcg.io/
 */

/**
 * Paginated API response wrapper from pokemontcg.io
 */
export interface PtcgioResponse<T> {
  data: T;
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

/**
 * pokemontcg.io Set response structure
 */
export interface PtcgioSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities?: {
    unlimited?: string;
    standard?: string;
    expanded?: string;
  };
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt?: string;
  images: {
    symbol: string;
    logo: string;
  };
}

/**
 * pokemontcg.io Card response structure
 */
export interface PtcgioCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  number: string;
  artist?: string;
  rarity?: string;
  nationalPokedexNumbers?: number[];
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    releaseDate: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url?: string;
    updatedAt?: string;
    prices?: Record<string, {
      low?: number;
      mid?: number;
      high?: number;
      market?: number;
      directLow?: number | null;
    }>;
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
