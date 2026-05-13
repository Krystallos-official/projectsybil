import React, { useState } from 'react';
import { Card } from '../components/ui/Card';

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState({
    summary: true, spofs: true, community: true, tools: true, busFactor: true, trends: true,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    // In production, would POST to analysis service and download PDF
    setTimeout(() => setGenerating(false), 2000);
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-accent-cyan tracking-wider mb-6">REPORT GENERATOR</h1>
      <Card className="space-y-4">
        <div>
          <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Company Name</label>
          <input className="mt-1 w-full bg-elevated border border-border rounded px-3 py-2 font-mono text-sm text-text-primary focus:border-accent-cyan outline-none" defaultValue="Acme Corp" />
        </div>
        <div>
          <label className="font-mono text-xs text-text-muted uppercase tracking-wider">Include Sections</label>
          <div className="mt-2 space-y-2">
            {Object.entries(sections).map(([key, checked]) => (
              <label key={key} className="flex items-center gap-2 font-mono text-xs text-text-secondary cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => setSections(s => ({ ...s, [key]: e.target.checked }))} className="accent-accent-cyan" />
                {key === 'summary' ? 'Executive Summary' : key === 'spofs' ? 'Critical SPOFs (Top 10)' : key === 'community' ? 'Community Structure' : key === 'tools' ? 'Tool Redundancy Analysis' : key === 'busFactor' ? 'Bus Factor Report' : 'Trend Analysis (6 months)'}
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-3 bg-accent-blue/10 border border-accent-blue/30 rounded text-accent-blue font-mono text-xs hover:bg-accent-blue/20 transition-colors disabled:opacity-50">
          {generating ? 'GENERATING...' : 'GENERATE PDF REPORT'}
        </button>
      </Card>
    </div>
  );
}
