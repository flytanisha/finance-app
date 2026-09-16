import { ChartCard } from '../../components/ChartCard';
import { QuoteCard } from '../../components/QuoteCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useHistory } from '../../hooks/useHistory';
import { useQuotes } from '../../hooks/useQuotes';
import { INDICES, INDEX_COLORS } from '../../config/indices';
import { formatIntradayTick, formatPrice } from '../../services/financeService';
import styles from './Dashboard.module.css';

/**
 * Today view — two sections:
 *  1. Market Snapshot: one QuoteCard per index (price, change, 52w range, volume)
 *  2. Intraday Charts: one 5-min line chart per index
 *
 * Quotes are polled every 60 s.  While a background refresh is in progress
 * a "· refreshing" hint appears next to the section title instead of
 * replacing the whole card grid with a spinner.
 */
export function DayView() {
  const quotes = useQuotes();

  // Derive "last updated" from the first available quote's market time
  const lastUpdated = quotes.data
    ? Object.values(quotes.data)[0]?.regularMarketTime
    : null;

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated * 1000).toLocaleTimeString('en-US', {
        timeZone: 'UTC',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <div>
      {/* ── Market Snapshot ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Market Snapshot
          {quotes.revalidating && (
            <span className={styles.revalidating}>&nbsp;· refreshing</span>
          )}
        </h2>
        {lastUpdatedLabel && (
          <p className={styles.subtitle}>Last updated {lastUpdatedLabel}</p>
        )}

        {quotes.loading && <LoadingSpinner label="Loading quotes…" />}
        {quotes.error && !quotes.data && (
          <p className={styles.error}>{quotes.error}</p>
        )}
        {quotes.data && (
          <div className={styles.quoteGrid}>
            {INDICES.map((index) => {
              const quote = quotes.data![index.symbol];
              if (!quote) return null;
              return (
                <QuoteCard
                  key={index.symbol}
                  quote={quote}
                  displayName={index.displayName}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Intraday Charts ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Intraday Charts</h2>
        <p className={styles.subtitle}>5-minute candles · current session · absolute price</p>
        <div className={styles.chartGrid}>
          {INDICES.map((index, i) => (
            <IntradayChart key={index.symbol} index={index} color={INDEX_COLORS[i]} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface IntradayChartProps {
  index: { symbol: string; displayName: string };
  color: string;
}

function IntradayChart({ index, color }: IntradayChartProps) {
  const { data, loading, error } = useHistory(index.symbol, 'day');

  const chartData = (data ?? []).map((p) => ({
    date:  p.date,
    price: p.close,
  }));

  return (
    <ChartCard
      title={index.displayName}
      data={chartData}
      series={[{ dataKey: 'price', label: 'Price', color }]}
      xKey="date"
      height={200}
      xTickFormatter={formatIntradayTick}
      yTickFormatter={(v) => formatPrice(v, 0)}
      loading={loading}
      error={error}
    />
  );
}
