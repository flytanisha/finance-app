import { useState } from 'react';
import type { TimeRange } from '../../types/finance';
import { ViewToggle } from '../../components/ViewToggle';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { QuarterView } from './QuarterView';
import styles from './Dashboard.module.css';

const VIEW_LABELS: Record<TimeRange, string> = {
  day:     'Current day — live quotes and intraday charts',
  '7d':    '7-day trend — daily close comparison',
  quarter: 'Last quarter — ~65 trading days comparison',
};

export function Dashboard() {
  const [range, setRange] = useState<TimeRange>('day');

  return (
    <div>
      <div className={styles.viewHeader}>
        <ViewToggle active={range} onChange={setRange} />
        <span className={styles.lastUpdated}>{VIEW_LABELS[range]}</span>
      </div>

      {range === 'day'     && <DayView />}
      {range === '7d'      && <WeekView />}
      {range === 'quarter' && <QuarterView />}
    </div>
  );
}
