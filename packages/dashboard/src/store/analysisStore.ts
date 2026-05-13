import { create } from 'zustand';
import type { AnalysisSnapshot, AnalysisResult } from '../types/analysis';
import * as api from '../lib/api';

interface AnalysisStore {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  lastRun: Date | null;
  snapshots: AnalysisSnapshot[];
  error: string | null;

  runAnalysis: () => Promise<AnalysisResult | null>;
  fetchSnapshots: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  isRunning: false, currentStep: '', progress: 0, lastRun: null, snapshots: [], error: null,

  runAnalysis: async () => {
    set({ isRunning: true, currentStep: 'Starting analysis...', progress: 10, error: null });
    try {
      set({ currentStep: 'Running graph algorithms...', progress: 40 });
      const result = await api.runAnalysis();
      set({ isRunning: false, currentStep: 'Complete', progress: 100, lastRun: new Date() });
      return result;
    } catch (e) {
      set({ isRunning: false, error: e instanceof Error ? e.message : 'Analysis failed', progress: 0 });
      return null;
    }
  },

  fetchSnapshots: async () => {
    try {
      const data = await api.getSnapshots();
      set({ snapshots: data.snapshots });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch snapshots' });
    }
  },
}));
