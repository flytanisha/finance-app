/**
 * Canonical mock data used across all tests.
 * Keeps the fixtures in one place so any schema change only needs one edit.
 */
import type { HistoryPoint, StockQuote } from '../types/finance';

export const MOCK_QUOTES: Record<string, StockQuote> = {
  '^STOXX50E': {
    symbol: '^STOXX50E',
    longName: 'Euro Stoxx 50',
    regularMarketPrice: 5300.25,
    regularMarketChange: 42.75,
    regularMarketChangePercent: 0.81,
    chartPreviousClose: 5257.5,
    regularMarketVolume: 1_230_000,
    fiftyTwoWeekHigh: 5500.0,
    fiftyTwoWeekLow: 4600.0,
    regularMarketTime: 1_700_000_000,
  },
  '^GDAXI': {
    symbol: '^GDAXI',
    longName: 'DAX',
    regularMarketPrice: 18_200.0,
    regularMarketChange: -50.0,
    regularMarketChangePercent: -0.27,
    chartPreviousClose: 18_250.0,
    regularMarketVolume: 980_000,
    fiftyTwoWeekHigh: 19_000.0,
    fiftyTwoWeekLow: 15_000.0,
    regularMarketTime: 1_700_000_000,
  },
  '^N225': {
    symbol: '^N225',
    longName: 'Nikkei 225',
    regularMarketPrice: 38_500.0,
    regularMarketChange: 100.0,
    regularMarketChangePercent: 0.26,
    chartPreviousClose: 38_400.0,
    regularMarketVolume: 0,
    fiftyTwoWeekHigh: 40_000.0,
    fiftyTwoWeekLow: 30_000.0,
    regularMarketTime: 1_700_000_000,
  },
  '^DJI': {
    symbol: '^DJI',
    longName: 'Dow Jones Industrial Average',
    regularMarketPrice: 39_000.0,
    regularMarketChange: 200.0,
    regularMarketChangePercent: 0.52,
    chartPreviousClose: 38_800.0,
    regularMarketVolume: 2_000_000,
    fiftyTwoWeekHigh: 42_000.0,
    fiftyTwoWeekLow: 32_000.0,
    regularMarketTime: 1_700_000_000,
  },
  URTH: {
    symbol: 'URTH',
    longName: 'MSCI World',
    regularMarketPrice: 135.5,
    regularMarketChange: 0.5,
    regularMarketChangePercent: 0.37,
    chartPreviousClose: 135.0,
    regularMarketVolume: 500_000,
    fiftyTwoWeekHigh: 145.0,
    fiftyTwoWeekLow: 110.0,
    regularMarketTime: 1_700_000_000,
  },
};

/** A minimal intraday history series for the "day" range. */
export const MOCK_INTRADAY: HistoryPoint[] = [
  { date: '2026-07-13T13:30:00.000Z', open: 5290, high: 5310, low: 5285, close: 5300, volume: 100_000 },
  { date: '2026-07-13T13:35:00.000Z', open: 5300, high: 5320, low: 5298, close: 5315, volume: 110_000 },
  { date: '2026-07-13T13:40:00.000Z', open: 5315, high: 5325, low: 5308, close: 5318, volume: 95_000  },
];
