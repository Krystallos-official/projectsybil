export interface SybilNode {
  id: string;
  name: string;
  department: string;
  role: string;
  avatar_url?: string;
  fragility_score: number;
  risk_tier: 'critical' | 'high' | 'medium' | 'low';
  betweenness_centrality: number;
  pagerank_score: number;
  degree_centrality: number;
  redundancy_score: number;
  community_id: number;
  community_label: string;
  last_analyzed?: string;
}

export interface SybilEdge {
  source: string;
  target: string;
  rel_type: string;
  weight: number;
  target_label?: string;
}

export interface GraphResponse {
  nodes: SybilNode[];
  edges: SybilEdge[];
  metrics: MetricsSummary;
}

export interface MetricsSummary {
  total_nodes: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  avg_fragility: number;
  last_analysis: string | null;
}
