// ── Domain types ─────────────────────────────────────────────────────────────

/** A single index / ETF as known to the UI */
export interface IndexConfig {
  symbol: string;
  displayName: string;
  shortName: string;
}

/** Normalised quote snapshot returned by /api/quote/:symbol */
export interface StockQuote {
  symbol: string;
  longName: string;
  regularMarketPrice: number;
  /** Computed server-side: regularMarketPrice − chartPreviousClose */
  regularMarketChange: number;
  /** Computed server-side: (change / chartPreviousClose) × 100 */
  regularMarketChangePercent: number;
  chartPreviousClose: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  /** Unix seconds of the last price update */
  regularMarketTime: number;
}

/** One OHLCV candle — used for both intraday (5 min) and daily history */
export interface HistoryPoint {
  /**
   * Intraday: full ISO-8601 string  e.g. "2026-07-13T13:30:00.000Z"
   * Daily:    date string            e.g. "2026-07-13"
   *
   * NEVER truncate intraday timestamps to YYYY-MM-DD — chart libs will
   * collapse all candles to one data point.
   */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Time-range selector used across the UI, hooks, and proxy */
export type TimeRange = 'day' | '7d' | 'quarter';

/** Generic async fetch state wrapper */
export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  /** Set when the most recent fetch failed. Stale `data` may still be present. */
  error: string | null;
  /** True while a background re-poll is running but stale data is already shown */
  revalidating: boolean;
}

/**
 * Quotes keyed by Yahoo Finance symbol string.
 * Allows the UI to look up any index in O(1) without positional coupling.
 */
export type QuoteMap = Record<string, StockQuote>;

// ── Raw Yahoo Finance v8 response types ────────────────────────────────────
// These only live on the server; kept here so the proxy and any tests share
// one canonical definition without importing a third-party schema package.

export interface YFMeta {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  /** Use this for previous-close — regularMarketPreviousClose is often absent */
  chartPreviousClose: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketTime?: number;
}

export interface YFQuoteArray {
  open:   (number | null)[];
  high:   (number | null)[];
  low:    (number | null)[];
  close:  (number | null)[];
  volume: (number | null)[];
}

export interface YFResult {
  meta: YFMeta;
  timestamp: number[];
  indicators: {
    quote: [YFQuoteArray];
    adjclose?: [{ adjclose: (number | null)[] }];
  };
}

export interface YFChartResponse {
  chart: {
    result: YFResult[] | null;
    error: { code: string; description: string } | null;
  };
}
