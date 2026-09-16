import { useEffect, useState } from 'react';
import type { FetchState, HistoryPoint, TimeRange } from '../types/finance';
import { fetchHistory } from '../services/financeService';

/**
 * Fetches OHLCV history for a single symbol and re-fetches whenever
 * `symbol` or `range` changes.
 *
 * Uses an `AbortController` to cancel the in-flight request when the
 * component unmounts or when `symbol`/`range` change before the previous
 * fetch completes — prevents stale data from overwriting a newer result.
 *
 * No polling — historical data is stable within a TTL window that the
 * proxy server manages with its own cache.
 */
export function useHistory(symbol: string, range: TimeRange): FetchState<HistoryPoint[]> {
  const [state, setState] = useState<FetchState<HistoryPoint[]>>({
    data:         null,
    loading:      true,
    error:        null,
    revalidating: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // Show loading immediately on symbol/range change
    // oxlint-disable-next-line react/set-state-in-effect
    setState({ data: null, loading: true, error: null, revalidating: false });

    fetchHistory(symbol, range, signal)
      .then((points) => {
        if (signal.aborted) return;
        setState({ data: points, loading: false, error: null, revalidating: false });
      })
      .catch((err) => {
        if (signal.aborted) return;
        setState({
          data:         null,
          loading:      false,
          error:        err instanceof Error ? err.message : 'Failed to load history',
          revalidating: false,
        });
      });

    return () => controller.abort();
  }, [symbol, range]);

  return state;
}
