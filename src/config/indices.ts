import type { IndexConfig } from '../types/finance';

/**
 * Single source of truth for the five tracked indices.
 * Add or remove entries here — the rest of the app adapts automatically.
 */
export const INDICES: IndexConfig[] = [
  { symbol: '^STOXX50E', displayName: 'Euro Stoxx 50',               shortName: 'STOXX50' },
  { symbol: '^GDAXI',    displayName: 'DAX',                         shortName: 'DAX'     },
  { symbol: '^N225',     displayName: 'Nikkei 225',                   shortName: 'N225'    },
  { symbol: '^DJI',      displayName: 'Dow Jones Industrial Average', shortName: 'DJIA'    },
  { symbol: 'URTH',      displayName: 'MSCI World',                   shortName: 'MSCI W'  },
];

/** Colour assigned to each index in multi-series charts (positionally aligned with INDICES) */
export const INDEX_COLORS: string[] = [
  '#3b82d4', // blue   — STOXX50
  '#10b981', // green  — DAX
  '#f59e0b', // amber  — N225
  '#ef4444', // red    — DJIA
  '#8b5cf6', // purple — MSCI World
];
