import React from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import AppRoutes from './routes';
import { MetricsBar } from './components/panels/MetricsBar';
import { useAnalysis } from './hooks/useAnalysis';
import { useGraphStore } from './store/graphStore';
import { NAV_ITEMS } from './lib/constants';

function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-[220px] bg-surface border-r border-border flex flex-col py-4">
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path}
            className={`flex items-center gap-3 px-5 py-2.5 font-mono text-xs transition-colors ${active ? 'text-accent-cyan bg-highlight border-r-2 border-r-accent-cyan' : 'text-text-secondary hover:text-text-primary hover:bg-highlight/50'}`}>
            <span className="w-4 text-center opacity-60">
              {item.icon === 'network' ? '◈' : item.icon === 'alert-triangle' ? '⚠' : item.icon === 'clock' ? '◷' : item.icon === 'users' ? '◆' : item.icon === 'file-text' ? '▤' : '⚙'}
            </span>
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto px-5 py-2 font-mono text-[9px] text-text-muted">
        v1.0.0 · Neo4j Connected
      </div>
    </aside>
  );
}

function TopBar() {
  const { runAnalysis, isRunning } = useAnalysis();
  const { fetchGraph } = useGraphStore();

  const handleRun = async () => {
    const result = await runAnalysis();
    if (result) await fetchGraph();
  };

  return (
    <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-5">
      <Link to="/" className="font-display text-xl text-risk-critical tracking-widest hover:text-risk-critical/80 transition-colors">
        ◈ SYBIL
      </Link>
      <MetricsBar />
      <div className="flex items-center gap-3">
        <button onClick={handleRun} disabled={isRunning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs transition-colors ${isRunning ? 'border-risk-high text-risk-high animate-pulse' : 'border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10'}`}>
          {isRunning ? '⟳ RUNNING...' : '▶ RUN ANALYSIS'}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-risk-low animate-pulse" />
          <span className="font-mono text-[10px] text-text-muted">ONLINE</span>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-void text-text-primary overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <AppRoutes />
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
