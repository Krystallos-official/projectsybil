import { useEffect } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
export function useTimeline() {
  const { snapshots, fetchSnapshots } = useAnalysisStore();
  useEffect(() => { if (snapshots.length === 0) fetchSnapshots(); }, []);
  return { snapshots };
}
