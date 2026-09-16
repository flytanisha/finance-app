import { useState } from 'react';
import styles from './SymbolSearch.module.css';

interface SymbolSearchProps {
  onSubmit: (symbol: string) => void;
}

export function SymbolSearch({ onSubmit }: SymbolSearchProps) {
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) {
      setValidationError('Please enter a ticker symbol.');
      return;
    }
    setValidationError(null);
    onSubmit(trimmed);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label htmlFor="symbol-input" className={styles.label}>
        Add a symbol
      </label>
      <div className={styles.inputRow}>
        <input
          id="symbol-input"
          className={styles.input}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (validationError) setValidationError(null);
          }}
          placeholder="e.g. AAPL, TSLA, ^FTSE"
          aria-describedby={validationError ? 'symbol-error' : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className={styles.button}>
          Show chart
        </button>
      </div>
      {validationError && (
        <p id="symbol-error" className={styles.error} role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}
