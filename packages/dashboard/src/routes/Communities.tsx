import React, { useEffect } from 'react';
import { SybilGraph } from '../components/graph/SybilGraph';
import { useGraphStore } from '../store/graphStore';

export default function CommunitiesPage() {
  const { nodes, fetchGraph } = useGraphStore();
  useEffect(() => { if (nodes.length === 0) fetchGraph(); }, []);

  const communities = new Map<string, typeof nodes>();
  nodes.forEach(n => {
    const label = n.community_label || 'Unknown';
    if (!communities.has(label)) communities.set(label, []);
    communities.get(label)!.push(n);
  });

  return (
    <div className="flex h-full">
      {/* Community list */}
      <div className="w-[320px] bg-surface border-r border-border overflow-y-auto p-4">
        <h2 className="font-display text-lg text-accent-purple tracking-wider mb-4">COMMUNITIES</h2>
        {[...communities.entries()].sort((a, b) => b[1].length - a[1].length).map(([label, members]) => (
          <div key={label} className="mb-3 p-3 bg-elevated border border-border rounded-lg">
            <div className="font-mono text-xs text-text-primary font-semibold">{label}</div>
            <div className="font-mono text-[10px] text-text-muted mt-1">{members.length} members</div>
            {members.length < 3 && <div className="font-mono text-[10px] text-risk-high mt-1">⚠ Isolated cluster</div>}
          </div>
        ))}
      </div>

      {/* Graph colored by community */}
      <div className="flex-1 relative"><SybilGraph /></div>
    </div>
  );
}
