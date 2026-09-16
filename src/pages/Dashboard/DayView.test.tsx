/**
 * Integration tests for DayView.
 *
 * DayView calls useQuotes (polls /api/quote/:symbol for every index) and
 * renders QuoteCard + IntradayChart sub-trees.  MSW intercepts all /api/*
 * requests and returns the canonical fixtures from fixtures.ts so no real
 * network connection is needed.
 *
 * The MSW server is started/reset/stopped by the global setup.ts file.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { DayView } from './DayView';
import { server } from '../../test/server';
import { INDICES } from '../../config/indices';

// Recharts uses ResizeObserver internally — jsdom doesn't provide it, so we
// supply a minimal stub so renders don't throw.
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver =
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

afterEach(cleanup);

describe('DayView — Market Snapshot section', () => {
  it('shows a loading spinner before quotes arrive', () => {
    // Delay the response so the spinner is visible on first render.
    server.use(
      http.get('/api/quote/:symbol', async () => {
        await new Promise((r) => setTimeout(r, 5000)); // intentionally long
        return HttpResponse.json({});
      }),
    );

    render(<DayView />);
    expect(screen.getByText(/loading quotes/i)).toBeInTheDocument();
  });

  it('renders one QuoteCard per tracked index after quotes load', async () => {
    render(<DayView />);

    // Wait for all quote cards to appear.
    await waitFor(() => {
      expect(screen.getAllByText('Euro Stoxx 50').length).toBeGreaterThanOrEqual(1);
    });

    // Every index should be rendered (may appear in both QuoteCard + ChartCard).
    for (const idx of INDICES) {
      expect(screen.getAllByText(idx.displayName).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('displays the formatted price for Euro Stoxx 50', async () => {
    render(<DayView />);

    await waitFor(() => {
      // MOCK_QUOTES['^STOXX50E'].regularMarketPrice === 5300.25
      expect(screen.getByText('5,300.25')).toBeInTheDocument();
    });
  });

  it('displays a positive change with "+" prefix', async () => {
    render(<DayView />);

    await waitFor(() => {
      // regularMarketChange: 42.75  → formatChange → "+42.75"
      expect(screen.getByText('+42.75')).toBeInTheDocument();
    });
  });

  it('displays a negative change without "+" prefix', async () => {
    render(<DayView />);

    await waitFor(() => {
      // ^GDAXI  regularMarketChange: -50.0 → formatChange → "-50.00"
      expect(screen.getByText('-50.00')).toBeInTheDocument();
    });
  });

  it('renders an empty quote grid (no QuoteCards) when all symbol fetches return 503', async () => {
    // fetchAllQuotes uses Promise.allSettled, so individual 503s are silently
    // dropped from the map. The result is an empty map — no QuoteCards, no
    // error banner.  Assert that behaviour explicitly.
    server.use(
      http.get('/api/quote/:symbol', () =>
        HttpResponse.json({ error: 'Service unavailable' }, { status: 503 }),
      ),
    );

    render(<DayView />);

    await waitFor(() => {
      // After the fetch settles the loading spinner disappears.
      expect(screen.queryByText(/loading quotes/i)).not.toBeInTheDocument();
    });

    // No QuoteCards — none of the index symbols should appear as a <span class="symbol">.
    for (const idx of INDICES) {
      expect(screen.queryByText(idx.symbol)).not.toBeInTheDocument();
    }
  });
});

describe('DayView — Intraday Charts section', () => {
  it('renders the "Intraday Charts" section heading', async () => {
    render(<DayView />);
    // The heading is always in the DOM (not data-dependent).
    expect(screen.getByText('Intraday Charts')).toBeInTheDocument();
  });

  it('renders a chart card for each tracked index', async () => {
    render(<DayView />);

    // Chart cards use the index displayName as their h3 title.
    // We wait for the network round-trip to complete and then look for each.
    await waitFor(() => {
      for (const idx of INDICES) {
        // There will be two elements per index (QuoteCard + ChartCard title),
        // so use getAllByText and assert at least one match.
        expect(screen.getAllByText(idx.displayName).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('shows "No data available" when the history endpoint returns an empty array', async () => {
    server.use(
      http.get('/api/history/:symbol', () => HttpResponse.json([])),
    );

    render(<DayView />);

    await waitFor(() => {
      const empties = screen.getAllByText(/no data available/i);
      expect(empties.length).toBe(INDICES.length);
    });
  });

  it('shows an error overlay when the history endpoint returns a 500', async () => {
    server.use(
      http.get('/api/history/:symbol', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );

    render(<DayView />);

    await waitFor(() => {
      const errors = screen.getAllByText(/\[500\]/);
      expect(errors.length).toBe(INDICES.length);
    });
  });
});

describe('DayView — last-updated label', () => {
  it('shows a time label derived from the first quote\'s regularMarketTime', async () => {
    render(<DayView />);

    // regularMarketTime: 1_700_000_000 → toLocaleTimeString; just assert
    // the "Last updated HH:MM" pattern appears rather than hard-coding a
    // timezone-specific value.
    await waitFor(() => {
      expect(screen.getByText(/last updated \d{2}:\d{2}/i)).toBeInTheDocument();
    });
  });
});

describe('DayView — revalidating hint', () => {
  it('does NOT show the refreshing hint on initial load', async () => {
    render(<DayView />);

    await waitFor(() => {
      expect(screen.getByText('Euro Stoxx 50')).toBeInTheDocument();
    });

    expect(screen.queryByText(/refreshing/i)).not.toBeInTheDocument();
  });
});

// ── Snapshot of a stable, fully-loaded QuoteCard ─────────────────────────────

describe('DayView — snapshot', () => {
  it('matches the snapshot after data loads', async () => {
    const { container } = render(<DayView />);

    await waitFor(() => {
      expect(screen.getAllByText('Euro Stoxx 50').length).toBeGreaterThanOrEqual(1);
    });

    // Snapshot only the Market Snapshot section (first <section>) to avoid
    // noise from Recharts SVG output which varies by environment.
    const snapshotSection = container.querySelector('section');
    expect(snapshotSection).toMatchSnapshot();
  });
});
