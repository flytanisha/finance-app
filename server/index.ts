import express from 'express';
import type { Request, Response } from 'express';
import type {
  HistoryPoint,
  StockQuote,
  YFChartResponse,
} from '../src/types/finance.js';
import { normalizeHistory, normalizeQuote } from '../src/services/financeService.js';

const app  = express();
const PORT = 3001;

// ── Yahoo Finance constants ────────────────────────────────────────────────

const YF_BASE = 'https://query2.finance.yahoo.com/v8/finance/chart';

/** Required headers — Yahoo Finance rejects requests without a User-Agent */
const YF_HEADERS: HeadersInit = {
  'User-Agent': 'Mozilla/5.0 (compatible; finance-dashboard/1.0)',
  'Accept':     'application/json',
};

/** Upstream request timeout — fail fast rather than hanging indefinitely */
const UPSTREAM_TIMEOUT_MS = 10_000;

// ── CORS ───────────────────────────────────────────────────────────────────
// Allow requests from the Vite dev server (port 5173) and any localhost origin.

app.use((_req, res, next) => {
  const origin = _req.headers.origin ?? '';
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
});

// ── In-memory cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

const cache    = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/** Return cached value if still fresh, otherwise null */
function fromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  cache.delete(key); // evict expired entry
  return null;
}

/** Store a value with a TTL in seconds */
function toCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1_000 });
}

/**
 * Deduplicate concurrent requests for the same cache key.
 * If a fetch is already in progress, all callers share the same Promise —
 * only one upstream HTTP call is issued regardless of how many clients ask.
 */
async function fetchDeduped<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = fromCache<T>(key);
  if (hit) return hit;

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher().finally(() => inFlight.delete(key));
  inFlight.set(key, promise as Promise<unknown>);
  return promise;
}

// ── Upstream fetch helpers ─────────────────────────────────────────────────

/**
 * Fetch from Yahoo Finance with a timeout guard.
 * Throws a descriptive error if YF returns an error envelope or non-200.
 */
async function fetchYF(url: string): Promise<YFChartResponse> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let res: globalThis.Response;
  try {
    res = await fetch(url, { headers: YF_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status} for ${url}`);
  }

  const data = await res.json() as YFChartResponse;

  // YF sometimes returns HTTP 200 with an error payload
  if (data.chart.error) {
    throw new Error(
      `Yahoo Finance error: ${data.chart.error.code} — ${data.chart.error.description}`,
    );
  }
  if (!data.chart.result?.length) {
    throw new Error(`Yahoo Finance returned empty result for ${url}`);
  }

  return data;
}

// ── Date helpers ───────────────────────────────────────────────────────────

function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Math.floor(d.getTime() / 1_000);
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1_000);
}

// ── Cache TTLs ─────────────────────────────────────────────────────────────

const TTL: Record<string, number> = {
  day:     60,    // 1 min — intraday refreshes frequently
  '7d':    300,   // 5 min
  quarter: 3_600, // 1 hr  — quarterly data barely changes intraday
};

// ── Route: GET /api/health ─────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', cacheSize: cache.size, ts: Date.now() });
});

// ── Route: GET /api/quote/:symbol ──────────────────────────────────────────
//
// Returns a normalised StockQuote.
// Uses interval=5m&range=1d — interval=1d returns only 1 data point which
// is useless for same-day prices and also omits intraday meta updates.

app.get('/api/quote/:symbol', async (req: Request, res: Response) => {
  const symbol   = String(req.params['symbol']).toUpperCase();
  const cacheKey = `quote:${symbol}`;

  try {
    const quote = await fetchDeduped<StockQuote>(cacheKey, async () => {
      const url  = `${YF_BASE}/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
      const data = await fetchYF(url);
      const meta = data.chart.result![0].meta;

      const normalized = normalizeQuote(meta);
      toCache(cacheKey, normalized, TTL['day']);
      return normalized;
    });

    res.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[quote] ${symbol}: ${message}`);
    res.status(502).json({ error: message });
  }
});

// ── Route: GET /api/history/:symbol?range=day|7d|quarter ──────────────────
//
// range=day     → interval=5m, range=1d   (intraday, full ISO timestamps)
// range=7d      → interval=1d, period1/2  (daily candles, YYYY-MM-DD dates)
// range=quarter → interval=1d, period1/2  (~65 trading days)
//
// The `range` parameter is passed through from the React client so the proxy
// picks the correct Yahoo Finance URL shape without the UI knowing about it.

app.get('/api/history/:symbol', async (req: Request, res: Response) => {
  const symbol   = String(req.params['symbol']).toUpperCase();
  const range    = String(req.query['range'] ?? 'day');
  const cacheKey = `history:${symbol}:${range}`;

  try {
    const history = await fetchDeduped<HistoryPoint[]>(cacheKey, async () => {
      let url: string;
      let isIntraday: boolean;

      if (range === 'day') {
        // Intraday: must use interval=5m to get candles AND fresh meta.
        // interval=1d&range=1d returns only one end-of-day summary point.
        url        = `${YF_BASE}/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
        isIntraday = true;
      } else {
        // Daily history: add calendar buffer for weekends and market holidays.
        // 7d window → fetch 10 calendar days; quarter → fetch 95 calendar days.
        const calDays = range === '7d' ? 10 : 95;
        const p1      = daysAgo(calDays);
        const p2      = nowUnix();
        url        = `${YF_BASE}/${encodeURIComponent(symbol)}?interval=1d&period1=${p1}&period2=${p2}`;
        isIntraday = false;
      }

      const data      = await fetchYF(url);
      const result    = data.chart.result![0];
      const ohlcv     = result.indicators.quote[0];
      const timestamps = result.timestamp ?? [];

      const points = normalizeHistory(timestamps, ohlcv, isIntraday);

      toCache(cacheKey, points, TTL[range] ?? 60);
      return points;
    });

    res.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[history] ${symbol}/${range}: ${message}`);
    res.status(502).json({ error: message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Finance proxy → http://localhost:${PORT}`);
  console.log(`  GET /api/health`);
  console.log(`  GET /api/quote/:symbol`);
  console.log(`  GET /api/history/:symbol?range=day|7d|quarter`);
});
