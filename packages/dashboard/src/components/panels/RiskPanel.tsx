import React from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Badge } from '../ui/Badge';
import { formatScore } from '../../lib/formatters';
import { colorByRiskTier } from '../../lib/colorScale';

export function RiskPanel() {
  const { nodes, selectNode, selectedNode } = useGraphStore();
  const sorted = [...nodes].sort((a, b) => (b.fragility_score || 0) - (a.fragility_score || 0));

  return (
    <div className="h-full bg-surface border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-display text-lg text-risk-critical tracking-wider">RISK REGISTER</h2>
        <div className="text-text-muted font-mono text-[10px] mt-1">{nodes.length} employees analyzed</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((node) => (
          <button key={node.id} onClick={() => selectNode(node.id)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-highlight transition-colors font-mono text-xs ${selectedNode?.id === node.id ? 'bg-highlight border-l-2 border-l-accent-cyan' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-text-primary font-semibold text-[12px] truncate mr-2">{node.name}</span>
              <Badge tier={node.risk_tier} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{node.department}</span>
              <span className="font-semibold" style={{ color: colorByRiskTier(node.risk_tier) }}>
                {formatScore(node.fragility_score)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
