import type {
  HistoryPoint,
  QuoteMap,
  StockQuote,
  TimeRange,
} from '../types/finance';

const BASE = '/api';

// ── HTTP helper ───────────────────────────────────────────────────────────────

/**
 * Thin typed GET wrapper.  Passes an optional AbortSignal so callers
 * (hooks) can cancel in-flight requests on unmount or dependency change.
 */
async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    // Proxy may return JSON { error: "…" } or plain text
    let detail: string;
    try {
      const body = await res.json() as { error?: string };
      detail = body.error ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`[${res.status}] ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ── Public fetch API ──────────────────────────────────────────────────────────

/**
 * Fetch a real-time quote snapshot for a single symbol.
 *
 * The proxy is responsible for computing `regularMarketChange` and
 * `regularMarketChangePercent` — those fields are absent from the
 * Yahoo Finance v8 chart API response.
 */
export async function fetchQuote(
  symbol: string,
  signal?: AbortSignal,
): Promise<StockQuote> {
  return get<StockQuote>(`/quote/${encodeURIComponent(symbol)}`, signal);
}

/**
 * Fetch quotes for all supplied symbols in parallel.
 * Returns a symbol-keyed map so consumers don't rely on array position.
 * Individual symbol failures are surfaced as thrown errors in the map entry.
 */
export async function fetchAllQuotes(
  symbols: string[],
  signal?: AbortSignal,
): Promise<QuoteMap> {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchQuote(s, signal)),
  );

  const map: QuoteMap = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      map[symbols[i]] = r.value;
    }
    // Rejected symbols are simply absent from the map;
    // callers can detect missing keys and show per-card error states.
  });
  return map;
}

/**
 * Fetch OHLCV history for a single symbol.
 *
 * - `day`     → intraday 5-min candles  (full ISO-8601 timestamp)
 * - `7d`      → daily candles, last 7 calendar days
 * - `quarter` → daily candles, last ~65 trading days
 */
export async function fetchHistory(
  symbol: string,
  range: TimeRange,
  signal?: AbortSignal,
): Promise<HistoryPoint[]> {
  return get<HistoryPoint[]>(
    `/history/${encodeURIComponent(symbol)}?range=${range}`,
    signal,
  );
}

// ── Pure normalisation utilities (also used server-side & in tests) ───────────

/**
 * Derive `regularMarketChange` and `regularMarketChangePercent` from raw
 * price fields.  Yahoo Finance v8 does NOT include these in chart responses.
 */
export function computeChange(
  price: number,
  prevClose: number,
): { change: number; changePct: number } {
  const change = price - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  return { change, changePct };
}

/**
 * Normalise a raw Yahoo Finance `meta` object into a typed `StockQuote`.
 * All optional fields fall back to safe defaults so the UI never receives
 * `undefined` or `NaN`.
 */
export function normalizeQuote(
  meta: {
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice: number;
    chartPreviousClose: number;
    regularMarketVolume?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    regularMarketTime?: number;
  },
): StockQuote {
  const price     = Number(meta.regularMarketPrice)  || 0;
  const prevClose = Number(meta.chartPreviousClose)  || 0;
  const { change, changePct } = computeChange(price, prevClose);

  return {
    symbol:                     meta.symbol,
    longName:                   meta.longName ?? meta.shortName ?? meta.symbol,
    regularMarketPrice:         price,
    regularMarketChange:        change,
    regularMarketChangePercent: changePct,
    chartPreviousClose:         prevClose,
    regularMarketVolume:        Number(meta.regularMarketVolume)  || 0,
    fiftyTwoWeekHigh:           Number(meta.fiftyTwoWeekHigh)     || 0,
    fiftyTwoWeekLow:            Number(meta.fiftyTwoWeekLow)      || 0,
    regularMarketTime:          Number(meta.regularMarketTime)    || 0,
  };
}

/**
 * Normalise one row of a positionally-aligned timestamp + OHLCV array pair.
 * Returns `null` for non-trading rows (null or zero close).
 */
export function normalizeHistoryPoint(
  unixSeconds: number,
  open:   number | null,
  high:   number | null,
  low:    number | null,
  close:  number | null,
  volume: number | null,
  isIntraday: boolean,
): HistoryPoint | null {
  if (!close || close <= 0) return null; // skip non-trading rows

  return {
    // Intraday: keep full ISO string so chart libs see distinct timestamps.
    // Daily: truncate to YYYY-MM-DD.
    date:   isIntraday
      ? new Date(unixSeconds * 1000).toISOString()
      : new Date(unixSeconds * 1000).toISOString().slice(0, 10),
    open:   open   ?? 0,
    high:   high   ?? 0,
    low:    low    ?? 0,
    close,
    volume: volume ?? 0,
  };
}

/**
 * Normalise a full raw Yahoo Finance history result array into typed
 * `HistoryPoint[]`, filtering out non-trading rows.
 */
export function normalizeHistory(
  timestamps: number[],
  ohlcv: {
    open:   (number | null)[];
    high:   (number | null)[];
    low:    (number | null)[];
    close:  (number | null)[];
    volume: (number | null)[];
  },
  isIntraday: boolean,
): HistoryPoint[] {
  return timestamps
    .map((t, i) =>
      normalizeHistoryPoint(
        t,
        ohlcv.open[i]   ?? null,
        ohlcv.high[i]   ?? null,
        ohlcv.low[i]    ?? null,
        ohlcv.close[i]  ?? null,
        ohlcv.volume[i] ?? null,
        isIntraday,
      ),
    )
    .filter((p): p is HistoryPoint => p !== null);
}

// ── Display formatting utilities ─────────────────────────────────────────────

/** "18432.75" → "18,432.75" */
export function formatPrice(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** -1.23 → "-1.23%"  |  +2.5 → "+2.50%" */
export function formatChangePct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/** 42.5 → "+42.50"  |  -7 → "-7.00" */
export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

/**
 * Format a full ISO-8601 intraday timestamp to "HH:MM" in local time.
 * Only call this on intraday timestamps — daily date strings will render
 * incorrectly because they have no time component.
 */
export function formatIntradayTick(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Normalise a history series to % return from the first close, for use in
 * multi-index comparison charts where absolute prices are incomparable.
 *
 * Returns an empty array if the series is empty or the base close is zero.
 */
export function normalizeToReturn(
  points: HistoryPoint[],
): Array<{ date: string; value: number }> {
  if (points.length === 0) return [];
  const base = points[0].close;
  if (base === 0) return [];
  return points.map((p) => ({
    date:  p.date,
    value: parseFloat((((p.close - base) / base) * 100).toFixed(3)),
  }));
}
