import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { formatNumber, formatTimeAgo } from '../../lib/formatters';

export function MetricsBar() {
  const { metrics } = useGraphStore();
  const [animatedValues, setAnimatedValues] = useState({ nodes: 0, critical: 0, high: 0 });

  useEffect(() => {
    if (!metrics) return;
    // Animate count-up
    const duration = 800;
    const start = Date.now();
    const target = { nodes: metrics.total_nodes, critical: metrics.critical_count, high: metrics.high_count };
    const animate = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3); // ease-out cubic
      setAnimatedValues({
        nodes: Math.round(target.nodes * ease),
        critical: Math.round(target.critical * ease),
        high: Math.round(target.high * ease),
      });
      if (pct < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [metrics]);

  if (!metrics) return null;

  return (
    <div className="flex items-center gap-6 font-mono text-xs">
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted uppercase text-[10px]">Nodes</span>
        <span className="text-text-primary font-semibold">{formatNumber(animatedValues.nodes)}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-risk-critical uppercase text-[10px]">Critical</span>
        <span className="text-risk-critical font-semibold">{animatedValues.critical}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-risk-high uppercase text-[10px]">High</span>
        <span className="text-risk-high font-semibold">{animatedValues.high}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted uppercase text-[10px]">Last Run</span>
        <span className="text-accent-cyan">{formatTimeAgo(metrics.last_analysis)}</span>
      </div>
    </div>
  );
}
