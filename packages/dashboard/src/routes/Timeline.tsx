import React from 'react';
import { SybilGraph } from '../components/graph/SybilGraph';

export default function TimelinePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative"><SybilGraph /></div>
      <div className="h-[200px] bg-surface border-t border-border p-6">
        <h2 className="font-display text-lg text-accent-cyan tracking-wider mb-4">TIMELINE</h2>
        <div className="relative h-8 bg-elevated rounded-full">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-accent-cyan rounded-full shadow-lg shadow-accent-cyan/30 cursor-grab" />
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-border" />
        </div>
        <div className="flex justify-between font-mono text-[10px] text-text-muted mt-2">
          <span>6 months ago</span><span>3 months ago</span><span>Today</span>
        </div>
      </div>
    </div>
  );
}
