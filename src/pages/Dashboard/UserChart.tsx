import { useHistory } from '../../hooks/useHistory';
import { ChartCard } from '../../components/ChartCard';
import { formatIntradayTick, formatPrice } from '../../services/financeService';
import styles from './Dashboard.module.css';

interface UserChartProps {
  symbol: string;
}

/**
 * Renders an intraday (day-range) chart for any user-supplied ticker symbol.
 * Reuses useHistory and ChartCard — loading, error, and empty states are
 * handled by ChartCard itself.
 */
export function UserChart({ symbol }: UserChartProps) {
  const { data, loading, error } = useHistory(symbol, 'day');

  const chartData = (data ?? []).map((p) => ({
    date:  p.date,
    price: p.close,
  }));

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {symbol}
        <span className={styles.badge}>intraday</span>
      </h2>
      <p className={styles.subtitle}>5-minute candles · current session · absolute price</p>
      <div className={styles.userChart}>
        <ChartCard
          title=""
          data={chartData}
          series={[{ dataKey: 'price', label: 'Price', color: '#7c5cd8' }]}
          xKey="date"
          height={240}
          xTickFormatter={formatIntradayTick}
          yTickFormatter={(v) => formatPrice(v, 0)}
          loading={loading}
          error={error}
        />
      </div>
    </section>
  );
}
