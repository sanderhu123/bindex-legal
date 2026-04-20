import { useState, useCallback, useRef, useEffect } from 'react';
import { searchCardsByName, type CardSearchOptions, type SearchFilterMeta } from '../services/api/pokemonApi';
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
  /** Set query, clear old results, and search immediately (no debounce) */
  setQueryImmediate: (query: string) => void;
  /** Search results */
  results: Card[];
  /** Loading state */
  loading: boolean;
  /** True only when loading additional pages (pagination) */
  isLoadingMore: boolean;
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
  /** Metadata about all matching cards (for building filter dropdowns) */
  filterMeta: SearchFilterMeta;
  /** Update filters (triggers new search). Pass force=true to re-apply unchanged filters. */
  setFilters: (filters: CardSearchFilters, options?: { force?: boolean }) => void;
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalError, setOriginalError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFiltersInternal] = useState<CardSearchFilters>({});
  const [filterMeta, setFilterMeta] = useState<SearchFilterMeta>({ setIds: [], eras: [], rarities: [] });

  // Refs for debouncing and cancellation
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Keep a ref to filters so executeSearch always uses the latest value
  const filtersRef = useRef<CardSearchFilters>(filters);
  filtersRef.current = filters;
  // Ref to track if a load is in progress (more reliable than state for rapid calls)
  const loadingRef = useRef(false);

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
    const hasActiveFilters = (
      (activeFilters.eras && activeFilters.eras.length > 0) ||
      (activeFilters.setIds && activeFilters.setIds.length > 0) ||
      (activeFilters.rarities && activeFilters.rarities.length > 0) ||
      (activeFilters.illustrators && activeFilters.illustrators.length > 0)
    );
    
    if (!sanitizedQuery && !hasActiveFilters) {
      setResults([]);
      setTotalFound(0);
      setHasMore(false);
      setError(null);
      setOriginalError(null);
      // Reset filter metadata so the filter pickers fall back to the full
      // global lists (all eras/sets/rarities) instead of being stuck with
      // the metadata from the previous filtered search.
      setFilterMeta({ setIds: [], eras: [], rarities: [] });
      return;
    }

    if (sanitizedQuery && sanitizedQuery.length < 3 && !hasActiveFilters) {
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    loadingRef.current = true;
    setLoading(true);
    setIsLoadingMore(searchOffset > 0);
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
      const searchResult = await searchCardsByName(sanitizedQuery || '', searchOptions);
      const { cards, filterMeta: meta } = searchResult;

      console.log('[useCardPicker] Search complete:', { 
        query: sanitizedQuery, 
        resultsCount: cards.length,
        offset: searchOffset,
        filterMeta: { sets: meta.setIds.length, eras: meta.eras.length },
      });

      // Store filter metadata (only on first page -- metadata covers all results)
      if (searchOffset === 0) {
        setFilterMeta(meta);
      }

      // Update results (deduplicate to prevent "same key" errors on fast scrolling)
      if (searchOffset === 0) {
        setResults(cards);
        setTotalFound(cards.length);
      } else {
        setResults(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newCards = cards.filter(c => !existingIds.has(c.id));
          return [...prev, ...newCards];
        });
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
      loadingRef.current = false;
      setLoading(false);
      setIsLoadingMore(false);
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
   * Set query, clear stale results, and search immediately (no debounce).
   * Used when the query is already final (e.g. opening the picker for a Pokémon).
   */
  const setQueryImmediate = useCallback((newQuery: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setQueryInternal(newQuery);
    setResults([]);
    setOffset(0);
    setError(null);
    setOriginalError(null);
    setHasMore(false);
    setTotalFound(0);

    executeSearch(newQuery, 0);
  }, [executeSearch]);

  const normalizeFilterArray = useCallback((items?: string[]): string[] => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => a.localeCompare(b));
  }, []);

  const areFiltersEqual = useCallback((a: CardSearchFilters, b: CardSearchFilters): boolean => {
    const aEras = normalizeFilterArray(a.eras);
    const bEras = normalizeFilterArray(b.eras);
    const aSetIds = normalizeFilterArray(a.setIds);
    const bSetIds = normalizeFilterArray(b.setIds);
    const aRarities = normalizeFilterArray(a.rarities);
    const bRarities = normalizeFilterArray(b.rarities);
    const aIllustrators = normalizeFilterArray(a.illustrators);
    const bIllustrators = normalizeFilterArray(b.illustrators);

    return (
      JSON.stringify(aEras) === JSON.stringify(bEras) &&
      JSON.stringify(aSetIds) === JSON.stringify(bSetIds) &&
      JSON.stringify(aRarities) === JSON.stringify(bRarities) &&
      JSON.stringify(aIllustrators) === JSON.stringify(bIllustrators)
    );
  }, [normalizeFilterArray]);

  /**
   * Update filters and trigger a new search immediately
   */
  const setFilters = useCallback((newFilters: CardSearchFilters, options?: { force?: boolean }) => {
    const forceApply = options?.force === true;
    const currentFilters = filtersRef.current;
    const hasChanged = !areFiltersEqual(currentFilters, newFilters);

    if (!hasChanged && !forceApply) {
      return;
    }

    setFiltersInternal(newFilters);
    filtersRef.current = newFilters;
    
    // Reset pagination
    setOffset(0);
    
    // Clear debounce and search immediately with new filters
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch(query, 0, newFilters);
  }, [query, executeSearch, areFiltersEqual]);

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
    // Use loadingRef (instant) instead of loading state (async) to prevent
    // duplicate requests when swiping fast through the list
    if (loadingRef.current || !hasMore) return;
    executeSearch(query, offset);
  }, [hasMore, query, offset, executeSearch]);

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
    loadingRef.current = false;
    setLoading(false);
    setIsLoadingMore(false);
    setFilterMeta({ setIds: [], eras: [], rarities: [] });
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
    setQueryImmediate,
    results,
    loading,
    isLoadingMore,
    error,
    originalError,
    hasMore,
    loadMore,
    clear,
    search,
    totalFound,
    filterMeta,
    filters,
    setFilters,
    clearFilters,
  };
}
