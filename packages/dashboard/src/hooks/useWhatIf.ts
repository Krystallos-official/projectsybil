import { useGraphStore } from '../store/graphStore';
export function useWhatIf() {
  const { whatIfNode, whatIfResult, whatIfLoading, runWhatIf, restoreWhatIf } = useGraphStore();
  return { whatIfNode, whatIfResult, whatIfLoading, runWhatIf, restoreWhatIf };
}
