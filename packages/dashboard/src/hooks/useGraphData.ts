import { useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
export function useGraphData() {
  const { nodes, edges, metrics, isLoading, error, fetchGraph } = useGraphStore();
  useEffect(() => { if (nodes.length === 0) fetchGraph(); }, []);
  return { nodes, edges, metrics, isLoading, error, refetch: fetchGraph };
}
