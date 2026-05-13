// In dev: Vite proxy handles /api → localhost:3001
// In production: VITE_API_URL points to deployed Render backend
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  return res.json();
}

import type { GraphResponse } from '../types/graph';
import type { WhatIfResult, TemporalData, AnalysisResult, AnalysisSnapshot } from '../types/analysis';
import type { ConnectorStatus } from '../types/api';

// Graph
export const getGraph = () => apiFetch<GraphResponse>('/graph/full');
export const getWhatIf = (nodeId: string) => apiFetch<WhatIfResult>(`/analysis/whatif/${nodeId}`);
export const getGraphAtSnapshot = (snapshotId: string) => apiFetch<GraphResponse>(`/graph/snapshot/${snapshotId}`);
export const getNodeDetail = (id: string) => apiFetch<any>(`/graph/node/${id}`);

// Analysis
export const runAnalysis = () => apiFetch<AnalysisResult>('/analysis/run', { method: 'POST' });
export const getSnapshots = () => apiFetch<{ snapshots: AnalysisSnapshot[] }>('/analysis/snapshots');
export const getTemporal = (nodeId: string) => apiFetch<TemporalData>(`/analysis/temporal/${nodeId}`);

// Connectors
export const getConnectors = () => apiFetch<{ connectors: ConnectorStatus[] }>('/ingest/connectors');
export const syncConnector = (name: string) => apiFetch<any>(`/ingest/sync/${name}`, { method: 'POST' });
export const seedMock = (scenario: string) => apiFetch<any>('/ingest/mock', { method: 'POST', body: JSON.stringify({ scenario }) });

// Health
export const getHealth = () => apiFetch<any>('/health');
