import React from 'react';
import { useUIStore } from '../../store/uiStore';

export function GraphControls() {
  const { graphColorMode, setGraphColorMode } = useUIStore();
  return (
    <div className="absolute top-4 left-4 z-10 bg-surface/90 backdrop-blur border border-border rounded-lg p-3 font-mono text-xs">
      <div className="text-text-muted mb-2 uppercase tracking-wider text-[10px]">Color By</div>
      <div className="flex gap-2">
        <button onClick={() => setGraphColorMode('risk')}
          className={`px-3 py-1 rounded border transition-colors ${graphColorMode === 'risk' ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10' : 'border-border text-text-secondary hover:text-text-primary'}`}>
          Risk
        </button>
        <button onClick={() => setGraphColorMode('community')}
          className={`px-3 py-1 rounded border transition-colors ${graphColorMode === 'community' ? 'border-accent-purple text-accent-purple bg-accent-purple/10' : 'border-border text-text-secondary hover:text-text-primary'}`}>
          Community
        </button>
      </div>
      <div className="mt-3 text-text-muted text-[10px]">
        <div>Click: Select node</div>
        <div>Right-click: What-If</div>
        <div>Scroll: Zoom</div>
      </div>
    </div>
  );
}
