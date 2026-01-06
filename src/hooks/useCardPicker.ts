import { useState, useCallback, useRef, useEffect } from 'react';
import { searchCardsByName, type CardSearchOptions } from '../services/api/pokemonApi';
import { sortCardsBySetDate } from '../data/pokemonEras';
import type { Card } from '../types';

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
  /** Error message if search failed */
  error: string | null;
  /** Whether there are more results to load */
  hasMore: boolean;
  /** Load more results (pagination) */
  loadMore: () => void;
  /** Clear search and results */
  clear: () => void;
  /** Manually trigger search */
  search: () => void;
  /** Total results found (may be more than loaded) */
  totalFound: number;
}

/**
 * Custom hook for card picker search functionality.
 * 
 * Provides debounced search, pagination, loading states, and error handling.
 * Used by CardPickerModal for searching cards across all sets.
 * 
 * @param options - Configuration options
 * @returns Object with search state and methods
 * 
 * @example
 * const { query, setQuery, results, loading, error } = useCardPicker({
 *   debounceMs: 300,
 *   pokemonOnly: true,
 * });
 */
export function useCardPicker(options?: UseCardPickerOptions): UseCardPickerReturn {
  const {
    debounceMs = 300,
    initialQuery = '',
    pokemonOnly = false,
    pageSize = 30,
  } = options || {};

  // State
  const [query, setQueryInternal] = useState(initialQuery);
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [offset, setOffset] = useState(0);

  // Refs for debouncing and cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute the search
   */
  const executeSearch = useCallback(async (searchQuery: string, searchOffset: number = 0) => {
    // Skip empty queries
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalFound(0);
      setHasMore(false);
      setError(null);
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
    }

    try {
      console.log('[useCardPicker] Executing search:', { query: searchQuery, offset: searchOffset, pageSize });

      const searchOptions: CardSearchOptions = {
        limit: pageSize,
        offset: searchOffset,
        pokemonOnly,
      };

      const cards = await searchCardsByName(searchQuery, searchOptions);

      // Sort by set release date (newest first) - this is the default sort
      const sortedCards = sortCardsBySetDate(cards);

      console.log('[useCardPicker] Search complete:', { 
        query: searchQuery, 
        resultsCount: sortedCards.length,
        offset: searchOffset,
        sortedBy: 'set-date-newest',
      });

      // Update results
      if (searchOffset === 0) {
        // New search - replace results
        setResults(sortedCards);
        setTotalFound(sortedCards.length);
      } else {
        // Pagination - append and re-sort to maintain order
        setResults(prev => sortCardsBySetDate([...prev, ...sortedCards]));
        setTotalFound(prev => prev + sortedCards.length);
      }

      // Check if there might be more results
      // If we got a full page, assume there could be more
      setHasMore(cards.length === pageSize);
      setOffset(searchOffset + cards.length);

    } catch (err: any) {
      // Ignore abort errors
      if (err?.name === 'AbortError') {
        console.log('[useCardPicker] Search aborted');
        return;
      }

      console.error('[useCardPicker] Search error:', err);
      setError(err?.message || 'Failed to search cards');
      
      if (searchOffset === 0) {
        setResults([]);
        setTotalFound(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [pokemonOnly, pageSize]);

  /**
   * Debounced query setter
   */
  const setQuery = useCallback((newQuery: string) => {
    setQueryInternal(newQuery);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset pagination when query changes
    setOffset(0);

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(newQuery, 0);
    }, debounceMs);
  }, [debounceMs, executeSearch]);

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
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setQueryInternal('');
    setResults([]);
    setError(null);
    setHasMore(false);
    setTotalFound(0);
    setOffset(0);
    setLoading(false);
  }, []);

  /**
   * Manually trigger search (bypasses debounce)
   */
  const search = useCallback(() => {
    // Clear debounce timer
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
    hasMore,
    loadMore,
    clear,
    search,
    totalFound,
  };
}

