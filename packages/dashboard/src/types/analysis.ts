export interface WhatIfResult {
  removed_node: string;
  removed_node_name: string;
  disconnected_nodes: string[];
  disconnected_count: number;
  severed_paths: number;
  affected_projects: string[];
  orphaned_repos: string[];
  impact_score: number;
  interpretation: string;
}

export interface TemporalData {
  scores: { date: string; fragility: number }[];
  trend_direction: 'increasing' | 'stable' | 'decreasing';
  trend_magnitude: number;
  peak_score: number;
  peak_date: string | null;
  is_accelerating: boolean;
}

export interface AnalysisSnapshot {
  id: string;
  created_at: string;
  employee_count: number;
  critical_spofs: number;
  high_risk_nodes: number;
  avg_fragility: number;
  top_spof_id: string;
}

export interface AnalysisResult {
  snapshot_id: string;
  employee_count: number;
  critical_spofs: number;
  high_risk_nodes: number;
  avg_fragility: number;
  top_spof: { id: string; fragility: number };
  duration_seconds: number;
}
