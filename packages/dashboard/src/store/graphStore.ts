import { create } from 'zustand';
import type { SybilNode, SybilEdge, MetricsSummary } from '../types/graph';
import type { WhatIfResult } from '../types/analysis';
import * as api from '../lib/api';

interface GraphStore {
  nodes: SybilNode[];
  edges: SybilEdge[];
  metrics: MetricsSummary | null;
  selectedNode: SybilNode | null;
  hoveredNode: SybilNode | null;
  whatIfNode: string | null;
  whatIfResult: WhatIfResult | null;
  whatIfLoading: boolean;
  timelineDate: Date | null;
  isLoading: boolean;
  error: string | null;

  fetchGraph: () => Promise<void>;
  selectNode: (id: string | null) => void;
  setHoveredNode: (node: SybilNode | null) => void;
  runWhatIf: (id: string) => Promise<void>;
  restoreWhatIf: () => void;
  setTimelineDate: (date: Date) => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [], edges: [], metrics: null,
  selectedNode: null, hoveredNode: null,
  whatIfNode: null, whatIfResult: null, whatIfLoading: false,
  timelineDate: null, isLoading: false, error: null,

  fetchGraph: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getGraph();
      set({ nodes: data.nodes, edges: data.edges, metrics: data.metrics, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch graph', isLoading: false });
    }
  },

  selectNode: (id) => {
    const { nodes } = get();
    set({ selectedNode: id ? nodes.find(n => n.id === id) || null : null });
  },

  setHoveredNode: (node) => set({ hoveredNode: node }),

  runWhatIf: async (id) => {
    set({ whatIfNode: id, whatIfLoading: true });
    try {
      const result = await api.getWhatIf(id);
      set({ whatIfResult: result, whatIfLoading: false });
    } catch (e) {
      set({ whatIfLoading: false, error: e instanceof Error ? e.message : 'What-if failed' });
    }
  },

  restoreWhatIf: () => set({ whatIfNode: null, whatIfResult: null }),

  setTimelineDate: (date) => set({ timelineDate: date }),
}));
