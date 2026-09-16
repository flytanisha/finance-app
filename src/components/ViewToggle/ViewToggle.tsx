import type { TimeRange } from '../../types/finance';
import styles from './ViewToggle.module.css';

const TABS: { label: string; value: TimeRange }[] = [
  { label: 'Today',   value: 'day'     },
  { label: '7 Days',  value: '7d'      },
  { label: 'Quarter', value: 'quarter' },
];

interface ViewToggleProps {
  active: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function ViewToggle({ active, onChange }: ViewToggleProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Time range">
      {TABS.map(({ label, value }) => (
        <button
          key={value}
          role="tab"
          aria-selected={active === value}
          className={`${styles.tab} ${active === value ? styles.active : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
