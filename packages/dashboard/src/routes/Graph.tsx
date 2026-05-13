import React, { useEffect } from 'react';
import { SybilGraph } from '../components/graph/SybilGraph';
import { GraphControls } from '../components/graph/GraphControls';
import { NodeTooltip } from '../components/graph/NodeTooltip';
import { WhatIfOverlay } from '../components/graph/WhatIfOverlay';
import { RiskPanel } from '../components/panels/RiskPanel';
import { NodeDetail } from '../components/panels/NodeDetail';
import { useGraphStore } from '../store/graphStore';

export default function GraphPage() {
  const { selectedNode, fetchGraph, nodes } = useGraphStore();

  useEffect(() => { if (nodes.length === 0) fetchGraph(); }, []);

  return (
    <div className="flex h-full">
      {/* Graph Canvas — 68% */}
      <div className="flex-1 relative overflow-hidden" style={{ minWidth: 0 }}>
        <SybilGraph />
        <GraphControls />
        <NodeTooltip />
        <WhatIfOverlay />
      </div>

      {/* Right Panel — 32% */}
      <div className="w-[380px] flex-shrink-0">
        {selectedNode ? <NodeDetail /> : <RiskPanel />}
      </div>
    </div>
  );
}
