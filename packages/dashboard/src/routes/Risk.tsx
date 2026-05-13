import React, { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatScore } from '../lib/formatters';
import { colorByRiskTier } from '../lib/colorScale';

export default function RiskPage() {
  const { nodes, fetchGraph } = useGraphStore();
  useEffect(() => { if (nodes.length === 0) fetchGraph(); }, []);

  const sorted = [...nodes].sort((a, b) => (b.fragility_score || 0) - (a.fragility_score || 0));
  const tiers = { critical: sorted.filter(n => n.risk_tier === 'critical'), high: sorted.filter(n => n.risk_tier === 'high'), medium: sorted.filter(n => n.risk_tier === 'medium'), low: sorted.filter(n => n.risk_tier === 'low') };

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="font-display text-2xl text-risk-critical tracking-wider mb-6">RISK REGISTER</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(['critical', 'high', 'medium', 'low'] as const).map(tier => (
          <div key={tier} className="bg-elevated border border-border rounded-lg p-4">
            <div className="text-text-muted font-mono text-[10px] uppercase tracking-wider mb-1">{tier}</div>
            <div className="font-display text-3xl" style={{ color: colorByRiskTier(tier) }}>{tiers[tier].length}</div>
          </div>
        ))}
      </div>

      {/* Full list */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_80px_200px] gap-4 px-4 py-3 border-b border-border bg-elevated font-mono text-[10px] text-text-muted uppercase tracking-wider">
          <div>Employee</div><div>Department</div><div>Fragility</div><div>Tier</div><div>Score</div>
        </div>
        {sorted.slice(0, 100).map(node => (
          <div key={node.id} className="grid grid-cols-[1fr_120px_100px_80px_200px] gap-4 px-4 py-3 border-b border-border/50 hover:bg-highlight transition-colors font-mono text-xs">
            <div className="text-text-primary">{node.name}</div>
            <div className="text-text-secondary">{node.department}</div>
            <div style={{ color: colorByRiskTier(node.risk_tier) }}>{formatScore(node.fragility_score)}</div>
            <div><Badge tier={node.risk_tier} /></div>
            <div><ProgressBar value={node.fragility_score} color={colorByRiskTier(node.risk_tier)} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
