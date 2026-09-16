import type { StockQuote } from '../../types/finance';
import {
  formatChange,
  formatChangePct,
  formatPrice,
} from '../../services/financeService';
import styles from './QuoteCard.module.css';

interface QuoteCardProps {
  quote:       StockQuote;
  displayName: string;
}

/** Format a Unix-seconds timestamp as "HH:MM" local time */
function formatTime(unixSeconds: number): string {
  if (!unixSeconds) return '—';
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Compact volume formatter: 1_230_000 → "1.23M" */
function formatVolume(v: number): string {
  if (!v) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function QuoteCard({ quote, displayName }: QuoteCardProps) {
  const isPositive  = quote.regularMarketChange >= 0;
  const changeClass = isPositive ? styles.positive : styles.negative;
  const borderClass = isPositive ? styles.borderPositive : styles.borderNegative;

  return (
    <div className={`${styles.card} ${borderClass}`}>
      <div className={styles.header}>
        <span className={styles.name}>{displayName}</span>
        <span className={styles.symbol}>{quote.symbol}</span>
      </div>

      <div className={styles.price}>
        {formatPrice(quote.regularMarketPrice)}
      </div>

      <div className={`${styles.change} ${changeClass}`}>
        <span>{formatChange(quote.regularMarketChange)}</span>
        <span className={styles.changePct}>
          {formatChangePct(quote.regularMarketChangePercent)}
        </span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem} title="52-week high">
          H&nbsp;{formatPrice(quote.fiftyTwoWeekHigh, 0)}
        </span>
        <span className={styles.metaItem} title="52-week low">
          L&nbsp;{formatPrice(quote.fiftyTwoWeekLow, 0)}
        </span>
        {quote.regularMarketVolume > 0 && (
          <span className={styles.metaItem} title="Volume">
            Vol&nbsp;{formatVolume(quote.regularMarketVolume)}
          </span>
        )}
      </div>

      {quote.regularMarketTime > 0 && (
        <div className={styles.timestamp}>
          {formatTime(quote.regularMarketTime)}
        </div>
      )}
    </div>
  );
}
