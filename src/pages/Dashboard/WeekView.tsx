import { useCallback, useState, useEffect } from 'react';
import { ChartCard } from '../../components/ChartCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useHistory } from '../../hooks/useHistory';
import { INDICES, INDEX_COLORS } from '../../config/indices';
import { formatPrice, normalizeToReturn } from '../../services/financeService';
import styles from './Dashboard.module.css';
import type { HistoryPoint } from '../../types/finance';

// ── Per-index history fetcher — one hook per component to satisfy Rules of Hooks

interface IndexHistoryProps {
  onData: (symbol: string, points: HistoryPoint[] | null) => void;
}

function IndexHistory0({ onData }: IndexHistoryProps) {
  const { data } = useHistory(INDICES[0].symbol, '7d');
  useEffect(() => { onData(INDICES[0].symbol, data); }, [data, onData]);
  return null;
}
function IndexHistory1({ onData }: IndexHistoryProps) {
  const { data } = useHistory(INDICES[1].symbol, '7d');
  useEffect(() => { onData(INDICES[1].symbol, data); }, [data, onData]);
  return null;
}
function IndexHistory2({ onData }: IndexHistoryProps) {
  const { data } = useHistory(INDICES[2].symbol, '7d');
  useEffect(() => { onData(INDICES[2].symbol, data); }, [data, onData]);
  return null;
}
function IndexHistory3({ onData }: IndexHistoryProps) {
  const { data } = useHistory(INDICES[3].symbol, '7d');
  useEffect(() => { onData(INDICES[3].symbol, data); }, [data, onData]);
  return null;
}
function IndexHistory4({ onData }: IndexHistoryProps) {
  const { data } = useHistory(INDICES[4].symbol, '7d');
  useEffect(() => { onData(INDICES[4].symbol, data); }, [data, onData]);
  return null;
}

const HISTORY_COMPONENTS = [
  IndexHistory0, IndexHistory1, IndexHistory2, IndexHistory3, IndexHistory4,
];

// ── WeekView ──────────────────────────────────────────────────────────────────

/**
 * 7-day view — two sections:
 *  1. Multi-series line chart: all five indices normalised to % return from
 *     the first day so incomparable absolute price levels become comparable.
 *  2. Mini summary table: start price, latest price, 7-day return per index.
 */
export function WeekView() {
  const [allData, setAllData] = useState<Record<string, HistoryPoint[] | null>>({});
  const [loadedCount, setLoadedCount] = useState(0);

  const handleData = useCallback((symbol: string, points: HistoryPoint[] | null) => {
    setAllData((prev) => {
      const next = { ...prev, [symbol]: points };
      setLoadedCount(Object.keys(next).length);
      return next;
    });
  }, []);

  const loading = loadedCount < INDICES.length;

  // ── Build merged chart data ───────────────────────────────────────────────
  const dateSet  = new Set<string>();
  const seriesMap: Record<string, Record<string, number>> = {};

  INDICES.forEach(({ symbol }) => {
    const points = allData[symbol];
    if (!points) return;
    normalizeToReturn(points).forEach(({ date, value }) => {
      dateSet.add(date);
      if (!seriesMap[date]) seriesMap[date] = {};
      seriesMap[date][symbol] = value;
    });
  });

  const chartData = Array.from(dateSet)
    .sort()
    .map((date) => ({ date, ...seriesMap[date] }));

  const series = INDICES.map((index, i) => ({
    dataKey: index.symbol,
    label:   index.shortName,
    color:   INDEX_COLORS[i],
  }));

  // ── Build summary rows ────────────────────────────────────────────────────
  const summaryRows = INDICES.map((index, i) => {
    const points = allData[index.symbol];
    if (!points || points.length < 2) return null;
    const start = points[0].close;
    const end   = points[points.length - 1].close;
    const ret   = ((end - start) / start) * 100;
    return { index, start, end, ret, color: INDEX_COLORS[i] };
  }).filter(Boolean) as Array<{
    index: { displayName: string; symbol: string };
    start: number;
    end:   number;
    ret:   number;
    color: string;
  }>;

  return (
    <div>
      {/* Hidden fetcher components */}
      {HISTORY_COMPONENTS.map((Comp, i) => (
        <Comp key={INDICES[i].symbol} onData={handleData} />
      ))}

      {/* ── Comparison chart ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          7-Day Performance
          <span className={styles.badge}>% return</span>
        </h2>
        <p className={styles.subtitle}>
          Normalised to the first trading day in the window — shows relative
          performance regardless of absolute price level.
        </p>
        {loading && <LoadingSpinner label="Loading history…" />}
        {!loading && (
          <div className={styles.comparisonChart}>
            <ChartCard
              title=""
              data={chartData}
              series={series}
              xKey="date"
              height={300}
              showZeroLine
              yTickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
            />
          </div>
        )}
      </section>

      {/* ── Summary table ── */}
      {!loading && summaryRows.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7-Day Summary</h2>
          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th>Index</th>
                <th>7d ago</th>
                <th>Latest</th>
                <th>Return</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.index.symbol}>
                  <td>
                    <span className={styles.dot} style={{ background: row.color }} />
                    {row.index.displayName}
                  </td>
                  <td>{formatPrice(row.start)}</td>
                  <td>{formatPrice(row.end)}</td>
                  <td className={row.ret >= 0 ? styles.positive : styles.negative}>
                    {row.ret >= 0 ? '+' : ''}{row.ret.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
