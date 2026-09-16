import { useCallback, useEffect, useRef, useState } from 'react';
import type { FetchState, QuoteMap } from '../types/finance';
import { INDICES } from '../config/indices';
import { fetchAllQuotes } from '../services/financeService';

const POLL_INTERVAL_MS = 60_000;

/**
 * Fetches real-time quotes for all five tracked indices and re-polls every
 * 60 seconds.
 *
 * Returns a `QuoteMap` (symbol → StockQuote) so UI components can look up
 * any index by symbol without relying on array position.  If an individual
 * symbol fetch fails the entry is simply absent from the map — the rest of
 * the dashboard stays functional.
 *
 * `revalidating` is `true` while a background poll is running and stale
 * data is already on screen, so the UI can show a subtle "refreshing" hint
 * without replacing the whole view with a spinner.
 */
export function useQuotes(): FetchState<QuoteMap> {
  const symbols = INDICES.map((i) => i.symbol);

  const [state, setState] = useState<FetchState<QuoteMap>>({
    data:         null,
    loading:      true,
    error:        null,
    revalidating: false,
  });

  // Keep a ref to the current AbortController so the in-flight request can
  // be cancelled if the component unmounts during the initial load.
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (isBackground: boolean) => {
      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      // Background poll: show revalidating flag, keep current data visible.
      // First load: show full loading spinner (data is null).
      setState((prev) => ({
        ...prev,
        loading:      prev.data === null && !isBackground,
        revalidating: isBackground && prev.data !== null,
        error:        null,
      }));

      try {
        const map = await fetchAllQuotes(symbols, signal);
        if (signal.aborted) return;
        setState({ data: map, loading: false, error: null, revalidating: false });
      } catch (err) {
        if (signal.aborted) return;
        const message = err instanceof Error ? err.message : 'Failed to load quotes';
        setState((prev) => ({
          data:         prev.data,   // keep stale data visible
          loading:      false,
          error:        message,
          revalidating: false,
        }));
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    load(false);

    timerRef.current = setInterval(() => {
      // oxlint-disable-next-line react/set-state-in-effect
      load(true);
    }, POLL_INTERVAL_MS);

    return () => {
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  return state;
}
