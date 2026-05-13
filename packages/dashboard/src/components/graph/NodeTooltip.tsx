import React from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Badge } from '../ui/Badge';
import { formatScore } from '../../lib/formatters';

export function NodeTooltip() {
  const { hoveredNode } = useGraphStore();
  if (!hoveredNode) return null;

  return (
    <div className="absolute top-4 right-4 z-20 bg-surface/95 backdrop-blur border border-border rounded-lg p-4 w-64 font-mono text-xs shadow-xl pointer-events-none">
      <div className="text-text-primary font-semibold text-sm mb-1">{hoveredNode.name}</div>
      <div className="text-text-secondary mb-3">{hoveredNode.role} · {hoveredNode.department}</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted">Fragility</span>
        <span className="font-semibold" style={{ color: hoveredNode.risk_tier === 'critical' ? '#ff1a3c' : hoveredNode.risk_tier === 'high' ? '#ff6b00' : '#e8eaf6' }}>
          {formatScore(hoveredNode.fragility_score)}
        </span>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted">Risk Tier</span>
        <Badge tier={hoveredNode.risk_tier} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-text-muted">Community</span>
        <span className="text-text-secondary">{hoveredNode.community_label}</span>
      </div>
    </div>
  );
}
