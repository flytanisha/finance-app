/**
 * MSW request handlers that intercept /api/* calls during tests.
 * Each handler returns the canonical fixture data from fixtures.ts.
 */
import { http, HttpResponse } from 'msw';
import { INDICES } from '../config/indices';
import { MOCK_INTRADAY, MOCK_QUOTES } from './fixtures';

export const handlers = [
  // ── /api/quote/:symbol ─────────────────────────────────────────────────────
  http.get('/api/quote/:symbol', ({ params }) => {
    const symbol = decodeURIComponent(params.symbol as string);
    const quote = MOCK_QUOTES[symbol];
    if (!quote) {
      return HttpResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }
    return HttpResponse.json(quote);
  }),

  // ── /api/history/:symbol ───────────────────────────────────────────────────
  // Returns the same intraday series for every symbol + range combination so
  // integration tests can focus on rendering logic rather than data variance.
  http.get('/api/history/:symbol', () => {
    return HttpResponse.json(MOCK_INTRADAY);
  }),
];

// Build a catch-all that returns 404 for every symbol that is NOT in our
// mock map, so tests relying on `onUnhandledRequest: 'error'` fail loudly
// if unexpected routes are hit.
export const missingSymbolHandlers = INDICES.map((idx) =>
  http.get(`/api/quote/${encodeURIComponent(idx.symbol)}`, () =>
    HttpResponse.json(MOCK_QUOTES[idx.symbol] ?? { error: 'not found' }, {
      status: MOCK_QUOTES[idx.symbol] ? 200 : 404,
    }),
  ),
);
