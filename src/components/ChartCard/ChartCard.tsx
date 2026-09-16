import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import styles from './ChartCard.module.css';

export interface ChartSeries {
  dataKey: string;
  label:   string;
  color:   string;
}

interface ChartCardProps {
  title:  string;
  data:   Record<string, unknown>[];
  series: ChartSeries[];
  xKey:   string;
  /** Height of the chart area in pixels. Defaults to 240. */
  height?: number;
  /** Optional formatter for X-axis tick labels */
  xTickFormatter?: (value: string) => string;
  /** Optional formatter for Y-axis tick labels */
  yTickFormatter?: (value: number) => string;
  /** Draw a reference line at y=0 (useful for % return charts) */
  showZeroLine?: boolean;
  /** Shown while data is loading */
  loading?: boolean;
  /** Shown when data fetch failed */
  error?: string | null;
}

export function ChartCard({
  title,
  data,
  series,
  xKey,
  height = 240,
  xTickFormatter,
  yTickFormatter,
  showZeroLine = false,
  loading = false,
  error   = null,
}: ChartCardProps) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>

      {loading && (
        <div className={styles.overlay} style={{ height }}>
          <span className={styles.loadingText}>Loading…</span>
        </div>
      )}

      {error && !loading && (
        <div className={styles.overlay} style={{ height }}>
          <span className={styles.errorText}>{error}</span>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className={styles.overlay} style={{ height }}>
          <span className={styles.emptyText}>No data available</span>
        </div>
      )}

      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey={xKey}
              tickFormatter={xTickFormatter}
              tick={{ fontSize: 11, fill: '#57606a' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fontSize: 11, fill: '#57606a' }}
              axisLine={false}
              tickLine={false}
              width={62}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value: unknown, name: unknown) => [
                typeof value === 'number' && yTickFormatter
                  ? yTickFormatter(value)
                  : String(value),
                String(name),
              ]}
              labelFormatter={(label: unknown) => {
                const s = String(label);
                return xTickFormatter ? xTickFormatter(s) : s;
              }}
            />
            {series.length > 1 && (
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
            )}
            {showZeroLine && (
              <ReferenceLine y={0} stroke="#e5e7eb" strokeDasharray="4 2" />
            )}
            {series.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.label}
                stroke={s.color}
                dot={false}
                strokeWidth={2}
                connectNulls={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
