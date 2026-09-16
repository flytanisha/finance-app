import { Dashboard } from './pages/Dashboard';
import './app.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Finance Dashboard</h1>
        <p className="app-subtitle">
          Euro Stoxx 50 · DAX · Nikkei 225 · Dow Jones · MSCI World
        </p>
      </header>

      <main className="app-main">
        <Dashboard />
      </main>
    </div>
  );
}
