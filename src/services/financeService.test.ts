/**
 * Unit tests for the pure formatting and normalisation utilities exported
 * from financeService.ts.  No network or rendering involved.
 */
import { describe, expect, it } from 'vitest';
import {
  computeChange,
  formatChange,
  formatChangePct,
  formatIntradayTick,
  formatPrice,
  normalizeHistory,
  normalizeHistoryPoint,
  normalizeQuote,
  normalizeToReturn,
} from '../services/financeService';

// ── computeChange ─────────────────────────────────────────────────────────────

describe('computeChange', () => {
  it('returns positive change when price > prevClose', () => {
    const { change, changePct } = computeChange(110, 100);
    expect(change).toBeCloseTo(10);
    expect(changePct).toBeCloseTo(10);
  });

  it('returns negative change when price < prevClose', () => {
    const { change, changePct } = computeChange(90, 100);
    expect(change).toBeCloseTo(-10);
    expect(changePct).toBeCloseTo(-10);
  });

  it('returns zero change when price equals prevClose', () => {
    const { change, changePct } = computeChange(100, 100);
    expect(change).toBe(0);
    expect(changePct).toBe(0);
  });

  it('returns zero changePct when prevClose is 0 (avoids division by zero)', () => {
    const { change, changePct } = computeChange(50, 0);
    expect(change).toBe(50);
    expect(changePct).toBe(0);
  });
});

// ── normalizeQuote ────────────────────────────────────────────────────────────

describe('normalizeQuote', () => {
  it('maps all fields correctly from a complete meta object', () => {
    const quote = normalizeQuote({
      symbol:               'AAPL',
      longName:             'Apple Inc.',
      regularMarketPrice:   189.5,
      chartPreviousClose:   185.0,
      regularMarketVolume:  50_000_000,
      fiftyTwoWeekHigh:     200.0,
      fiftyTwoWeekLow:      140.0,
      regularMarketTime:    1_700_000_000,
    });

    expect(quote.symbol).toBe('AAPL');
    expect(quote.longName).toBe('Apple Inc.');
    expect(quote.regularMarketPrice).toBe(189.5);
    expect(quote.regularMarketChange).toBeCloseTo(4.5);
    expect(quote.regularMarketChangePercent).toBeCloseTo(2.432);
    expect(quote.chartPreviousClose).toBe(185.0);
    expect(quote.regularMarketVolume).toBe(50_000_000);
    expect(quote.fiftyTwoWeekHigh).toBe(200.0);
    expect(quote.fiftyTwoWeekLow).toBe(140.0);
    expect(quote.regularMarketTime).toBe(1_700_000_000);
  });

  it('falls back longName → shortName → symbol when longName is absent', () => {
    const withShort = normalizeQuote({
      symbol: 'SPY', shortName: 'SPDR S&P 500',
      regularMarketPrice: 450, chartPreviousClose: 448,
    });
    expect(withShort.longName).toBe('SPDR S&P 500');

    const symbolOnly = normalizeQuote({
      symbol: 'SPY',
      regularMarketPrice: 450, chartPreviousClose: 448,
    });
    expect(symbolOnly.longName).toBe('SPY');
  });

  it('coerces undefined optional numerics to 0 instead of NaN', () => {
    const quote = normalizeQuote({
      symbol: 'X',
      regularMarketPrice: 10,
      chartPreviousClose: 9,
    });
    expect(quote.regularMarketVolume).toBe(0);
    expect(quote.fiftyTwoWeekHigh).toBe(0);
    expect(quote.fiftyTwoWeekLow).toBe(0);
    expect(quote.regularMarketTime).toBe(0);
  });
});

// ── normalizeHistoryPoint ─────────────────────────────────────────────────────

describe('normalizeHistoryPoint', () => {
  const unixTs = 1_700_000_000; // arbitrary Unix timestamp

  it('returns a HistoryPoint for a valid intraday row', () => {
    const point = normalizeHistoryPoint(unixTs, 100, 105, 99, 103, 500_000, true);
    expect(point).not.toBeNull();
    expect(point!.close).toBe(103);
    // Intraday: full ISO string expected
    expect(point!.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns a HistoryPoint with a truncated date for daily rows', () => {
    const point = normalizeHistoryPoint(unixTs, 100, 105, 99, 103, 500_000, false);
    expect(point).not.toBeNull();
    // Daily: YYYY-MM-DD only
    expect(point!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns null when close is null', () => {
    expect(normalizeHistoryPoint(unixTs, 100, 105, 99, null, 500_000, false)).toBeNull();
  });

  it('returns null when close is zero (non-trading row)', () => {
    expect(normalizeHistoryPoint(unixTs, 0, 0, 0, 0, 0, false)).toBeNull();
  });

  it('returns null when close is negative', () => {
    expect(normalizeHistoryPoint(unixTs, 0, 0, 0, -1, 0, false)).toBeNull();
  });

  it('coerces null OHLCV fields to 0', () => {
    const point = normalizeHistoryPoint(unixTs, null, null, null, 50, null, false);
    expect(point).not.toBeNull();
    expect(point!.open).toBe(0);
    expect(point!.high).toBe(0);
    expect(point!.low).toBe(0);
    expect(point!.volume).toBe(0);
  });
});

// ── normalizeHistory ──────────────────────────────────────────────────────────

describe('normalizeHistory', () => {
  const ts = [1_700_000_000, 1_700_000_300, 1_700_000_600];
  const ohlcv = {
    open:   [100, 101, null],
    high:   [105, 106, null],
    low:    [99,  100, null],
    close:  [103, 104, null],   // last row has null close → should be filtered
    volume: [1000, 2000, null],
  };

  it('filters out null-close rows and returns the rest', () => {
    const points = normalizeHistory(ts, ohlcv, false);
    expect(points).toHaveLength(2);
    expect(points[0].close).toBe(103);
    expect(points[1].close).toBe(104);
  });

  it('returns an empty array for empty inputs', () => {
    expect(normalizeHistory([], { open: [], high: [], low: [], close: [], volume: [] }, false)).toEqual([]);
  });
});

// ── formatPrice ───────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats with two decimal places by default', () => {
    expect(formatPrice(18432.7)).toBe('18,432.70');
  });

  it('respects a custom decimals argument', () => {
    expect(formatPrice(18432.75, 0)).toBe('18,433');
  });

  it('adds thousands separators', () => {
    expect(formatPrice(1000.0)).toBe('1,000.00');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0.00');
  });
});

// ── formatChangePct ───────────────────────────────────────────────────────────

describe('formatChangePct', () => {
  it('prepends "+" for positive values', () => {
    expect(formatChangePct(2.5)).toBe('+2.50%');
  });

  it('does not double-prepend "+" for zero', () => {
    expect(formatChangePct(0)).toBe('+0.00%');
  });

  it('formats negative values without "+"', () => {
    expect(formatChangePct(-1.23)).toBe('-1.23%');
  });
});

// ── formatChange ──────────────────────────────────────────────────────────────

describe('formatChange', () => {
  it('prepends "+" for positive values', () => {
    expect(formatChange(42.5)).toBe('+42.50');
  });

  it('formats negative values without "+"', () => {
    expect(formatChange(-7)).toBe('-7.00');
  });

  it('formats zero as "+0.00"', () => {
    expect(formatChange(0)).toBe('+0.00');
  });
});

// ── formatIntradayTick ────────────────────────────────────────────────────────

describe('formatIntradayTick', () => {
  it('extracts HH:MM from a full ISO-8601 string', () => {
    // Use a fixed UTC offset so this test is timezone-independent:
    // toISOString() returns UTC, so we test with UTC midnight.
    const iso = '2026-07-13T00:30:00.000Z';
    const result = formatIntradayTick(iso);
    // Result depends on local timezone; just verify "HH:MM" format.
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

// ── normalizeToReturn ─────────────────────────────────────────────────────────

describe('normalizeToReturn', () => {
  const base = [
    { date: '2026-07-01', open: 100, high: 105, low: 99, close: 100, volume: 1000 },
    { date: '2026-07-02', open: 100, high: 110, low: 100, close: 110, volume: 2000 },
    { date: '2026-07-03', open: 110, high: 115, low: 108, close: 105, volume: 1500 },
  ];

  it('first point is always 0%', () => {
    const result = normalizeToReturn(base);
    expect(result[0].value).toBe(0);
  });

  it('calculates % return from the first close', () => {
    const result = normalizeToReturn(base);
    // (110 - 100) / 100 * 100 = 10.000
    expect(result[1].value).toBeCloseTo(10.0);
    // (105 - 100) / 100 * 100 = 5.000
    expect(result[2].value).toBeCloseTo(5.0);
  });

  it('preserves the date field on each point', () => {
    const result = normalizeToReturn(base);
    expect(result.map((r) => r.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });

  it('returns an empty array for an empty series', () => {
    expect(normalizeToReturn([])).toEqual([]);
  });

  it('returns an empty array when the base close is zero', () => {
    const zeroBase = [{ date: '2026-07-01', open: 0, high: 0, low: 0, close: 0, volume: 0 }];
    expect(normalizeToReturn(zeroBase)).toEqual([]);
  });
});
