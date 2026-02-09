import { useState, useCallback, useRef, useEffect } from 'react';
import { searchCardsByName, type CardSearchOptions } from '../services/api/pokemonApi';
import type { Card, CardSearchFilters } from '../types';
import { getUserFriendlyErrorMessage, sanitizeSearchQuery } from '../utils/errorUtils';

/**
 * Hook configuration options
 */
export interface UseCardPickerOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Initial search query */
  initialQuery?: string;
  /** Filter to only Pokémon cards */
  pokemonOnly?: boolean;
  /** Maximum results per page (default: 30) */
  pageSize?: number;
  /** 
   * Use exact word matching for names (default: false)
   * When true, searching "Pidgeot" will NOT match "Pidgeotto"
   */
  exactMatch?: boolean;
}

/**
 * Hook return type
 */
export interface UseCardPickerReturn {
  /** Current search query */
  query: string;
  /** Set the search query (triggers debounced search) */
  setQuery: (query: string) => void;
  /** Search results */
  results: Card[];
  /** Loading state */
  loading: boolean;
  /** Error message if search failed (user-friendly) */
  error: string | null;
  /** Original error object (for retry determination) - Step 32C */
  originalError: Error | null;
  /** Whether there are more results to load */
  hasMore: boolean;
  /** Load more results (pagination) */
  loadMore: () => void;
  /** Clear search and results */
  clear: () => void;
  /** Manually trigger search (also used as retry) */
  search: () => void;
  /** Total results found (may be more than loaded) */
  totalFound: number;
  /** Current active filters */
  filters: CardSearchFilters;
  /** Update filters (triggers new search) */
  setFilters: (filters: CardSearchFilters) => void;
  /** Clear all filters */
  clearFilters: () => void;
}

/**
 * Custom hook for card picker search functionality.
 * 
 * Provides debounced search, pagination, filters, loading states, and error handling.
 * Used by CardPickerModal for searching cards across all sets.
 * 
 * @param options - Configuration options
 * @returns Object with search state and methods
 */
export function useCardPicker(options?: UseCardPickerOptions): UseCardPickerReturn {
  const {
    debounceMs = 300,
    initialQuery = '',
    pokemonOnly = false,
    pageSize = 30,
    exactMatch = false,
  } = options || {};

  // State
  const [query, setQueryInternal] = useState(initialQuery);
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalError, setOriginalError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFiltersInternal] = useState<CardSearchFilters>({});

  // Refs for debouncing and cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Keep a ref to filters so executeSearch always uses the latest value
  const filtersRef = useRef<CardSearchFilters>(filters);
  filtersRef.current = filters;

  /**
   * Execute the search
   */
  const executeSearch = useCallback(async (
    searchQuery: string,
    searchOffset: number = 0,
    searchFilters?: CardSearchFilters
  ) => {
    // Use provided filters or the latest from ref
    const activeFilters = searchFilters ?? filtersRef.current;
    
    // Sanitize the query
    const sanitizedQuery = sanitizeSearchQuery(searchQuery);
    
    // Check if any filters are active
    const hasActiveFilters = activeFilters.era || activeFilters.setId || activeFilters.rarity || activeFilters.illustrator;
    
    // Skip if no query AND no filters
    if (!sanitizedQuery && !hasActiveFilters) {
      setResults([]);
      setTotalFound(0);
      setHasMore(false);
      setError(null);
      setOriginalError(null);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    if (searchOffset === 0) {
      setError(null);
      setOriginalError(null);
    }

    try {
      console.log('[useCardPicker] Executing search:', { 
        query: searchQuery, 
        sanitizedQuery,
        offset: searchOffset, 
        pageSize,
        filters: activeFilters,
      });

      const searchOptions: CardSearchOptions = {
        limit: pageSize,
        offset: searchOffset,
        pokemonOnly,
        exactMatch,
        filters: hasActiveFilters ? activeFilters : undefined,
      };

      // API returns cards sorted by set release date (newest first)
      const cards = await searchCardsByName(sanitizedQuery || '', searchOptions);

      console.log('[useCardPicker] Search complete:', { 
        query: sanitizedQuery, 
        resultsCount: cards.length,
        offset: searchOffset,
      });

      // Update results
      if (searchOffset === 0) {
        setResults(cards);
        setTotalFound(cards.length);
      } else {
        setResults(prev => [...prev, ...cards]);
        setTotalFound(prev => prev + cards.length);
      }

      setHasMore(cards.length === pageSize);
      setOffset(searchOffset + cards.length);
      setError(null);
      setOriginalError(null);

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[useCardPicker] Search aborted');
        return;
      }

      console.error('[useCardPicker] Search error:', err);
      
      const originalErr = err instanceof Error ? err : new Error(String(err));
      setOriginalError(originalErr);
      setError(getUserFriendlyErrorMessage(originalErr));
      
      if (searchOffset === 0) {
        setResults([]);
        setTotalFound(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [pokemonOnly, pageSize, exactMatch]);

  /**
   * Debounced query setter
   */
  const setQuery = useCallback((newQuery: string) => {
    setQueryInternal(newQuery);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setOffset(0);

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newQuery, 0);
    }, debounceMs);
  }, [debounceMs, executeSearch]);

  /**
   * Update filters and trigger a new search immediately
   */
  const setFilters = useCallback((newFilters: CardSearchFilters) => {
    setFiltersInternal(newFilters);
    filtersRef.current = newFilters;
    
    // Reset pagination
    setOffset(0);
    
    // Clear debounce and search immediately with new filters
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch(query, 0, newFilters);
  }, [query, executeSearch]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    executeSearch(query, offset);
  }, [loading, hasMore, query, offset, executeSearch]);

  /**
   * Clear search and results
   */
  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setQueryInternal('');
    setResults([]);
    setError(null);
    setOriginalError(null);
    setHasMore(false);
    setTotalFound(0);
    setOffset(0);
    setLoading(false);
    setFiltersInternal({});
    filtersRef.current = {};
  }, []);

  /**
   * Manually trigger search (bypasses debounce)
   */
  const search = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch(query, 0);
  }, [query, executeSearch]);

  // Initial search if initialQuery provided
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery, 0);
    }
  }, [initialQuery, executeSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    originalError,
    hasMore,
    loadMore,
    clear,
    search,
    totalFound,
    filters,
    setFilters,
    clearFilters,
  };
}
