/**
 * Tests for the UserChart and SymbolSearch components.
 *
 * UserChart calls useHistory (GET /api/history/:symbol) which is intercepted
 * by the shared MSW server.  SymbolSearch tests run without network calls.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { UserChart } from './UserChart';
import { SymbolSearch } from '../../components/SymbolSearch';
import { server } from '../../test/server';

// Recharts uses ResizeObserver internally — jsdom doesn't provide it.
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver =
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

afterEach(cleanup);

// ── UserChart ─────────────────────────────────────────────────────────────────

describe('UserChart — loading state', () => {
  it('shows a loading overlay while the history fetch is in-flight', () => {
    server.use(
      http.get('/api/history/:symbol', async () => {
        await new Promise((r) => setTimeout(r, 5000)); // intentionally long
        return HttpResponse.json([]);
      }),
    );

    render(<UserChart symbol="AAPL" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe('UserChart — success state', () => {
  it('renders the symbol as the section heading', async () => {
    render(<UserChart symbol="AAPL" />);
    // heading is present immediately (not data-dependent)
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('renders the intraday badge', () => {
    render(<UserChart symbol="TSLA" />);
    expect(screen.getByText('intraday')).toBeInTheDocument();
  });

  it('shows "No data available" when the history endpoint returns an empty array', async () => {
    server.use(
      http.get('/api/history/:symbol', () => HttpResponse.json([])),
    );

    render(<UserChart symbol="EMPTY" />);

    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });
});

describe('UserChart — error state', () => {
  it('shows an error overlay when the history endpoint returns a 500', async () => {
    server.use(
      http.get('/api/history/:symbol', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );

    render(<UserChart symbol="BADSYM" />);

    await waitFor(() => {
      expect(screen.getByText(/\[500\]/)).toBeInTheDocument();
    });
  });

  it('shows an error overlay when the history endpoint returns a 404', async () => {
    server.use(
      http.get('/api/history/:symbol', () =>
        HttpResponse.json({ error: 'Symbol not found' }, { status: 404 }),
      ),
    );

    render(<UserChart symbol="UNKNOWN" />);

    await waitFor(() => {
      expect(screen.getByText(/\[404\]/)).toBeInTheDocument();
    });
  });
});

describe('UserChart — re-fetch on symbol change', () => {
  it('updates the heading when the symbol prop changes', async () => {
    const { rerender } = render(<UserChart symbol="AAPL" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();

    rerender(<UserChart symbol="MSFT" />);
    expect(screen.getByText('MSFT')).toBeInTheDocument();
  });
});

// ── SymbolSearch ──────────────────────────────────────────────────────────────

describe('SymbolSearch — validation', () => {
  it('does not call onSubmit when the input is empty', async () => {
    const onSubmit = vi.fn();
    render(<SymbolSearch onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /show chart/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation error message when submitted empty', async () => {
    render(<SymbolSearch onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /show chart/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/please enter a ticker symbol/i)).toBeInTheDocument();
  });

  it('clears the validation error once the user starts typing', async () => {
    render(<SymbolSearch onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /show chart/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('textbox'), 'A');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onSubmit with the trimmed, uppercased symbol', async () => {
    const onSubmit = vi.fn();
    render(<SymbolSearch onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), '  aapl  ');
    await userEvent.click(screen.getByRole('button', { name: /show chart/i }));

    expect(onSubmit).toHaveBeenCalledWith('AAPL');
  });

  it('does not call onSubmit for a whitespace-only entry', async () => {
    const onSubmit = vi.fn();
    render(<SymbolSearch onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), '   ');
    await userEvent.click(screen.getByRole('button', { name: /show chart/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
