import { useAnalysisStore } from '../store/analysisStore';
export function useAnalysis() {
  const store = useAnalysisStore();
  return store;
}
