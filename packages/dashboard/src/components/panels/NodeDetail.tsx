import React from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { formatScore, formatPercentage } from '../../lib/formatters';
import { colorByRiskTier } from '../../lib/colorScale';

export function NodeDetail() {
  const { selectedNode, selectNode, runWhatIf } = useGraphStore();
  if (!selectedNode) return null;
  const n = selectedNode;

  return (
    <div className="h-full bg-surface border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <button onClick={() => selectNode(null)} className="text-text-muted hover:text-text-primary font-mono text-xs mb-2 block">← Back to Risk Register</button>
        <div className="text-text-primary font-semibold text-lg">{n.name}</div>
        <div className="text-text-secondary font-mono text-xs mt-1">{n.role} · {n.department}</div>
        <div className="mt-2"><Badge tier={n.risk_tier} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* Fragility Score */}
        <div>
          <div className="text-text-muted uppercase text-[10px] tracking-wider mb-2">Fragility Score</div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-display" style={{ color: colorByRiskTier(n.risk_tier) }}>{formatScore(n.fragility_score)}</div>
            <div className="flex-1"><ProgressBar value={n.fragility_score} color={colorByRiskTier(n.risk_tier)} /></div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Betweenness', value: formatPercentage(n.betweenness_centrality || 0) },
            { label: 'PageRank', value: formatPercentage(n.pagerank_score || 0) },
            { label: 'Degree', value: formatPercentage(n.degree_centrality || 0) },
            { label: 'Redundancy', value: formatPercentage(n.redundancy_score || 0) },
          ].map((m) => (
            <div key={m.label} className="bg-elevated border border-border rounded p-3">
              <div className="text-text-muted text-[10px] uppercase">{m.label}</div>
              <div className="text-text-primary text-sm mt-1">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Community */}
        <div>
          <div className="text-text-muted uppercase text-[10px] tracking-wider mb-1">Community</div>
          <div className="text-accent-purple">{n.community_label}</div>
        </div>

        {/* What-If Button */}
        <button onClick={() => runWhatIf(n.id)}
          className="w-full py-3 bg-risk-critical/10 border border-risk-critical/30 rounded text-risk-critical hover:bg-risk-critical/20 transition-colors font-semibold">
          ⚠ SIMULATE REMOVAL
        </button>
      </div>
    </div>
  );
}
