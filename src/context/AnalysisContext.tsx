import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { AnalysisResult } from '@/data';

export type AnalysisState = {
  text: string;
  result: AnalysisResult | null;
};

export type AnalysisContextType = {
  state: AnalysisState;
  text: string;
  result: AnalysisResult | null;
  setText: (t: string) => void;
  setResult: (r: AnalysisResult | null) => void;
  reset: () => void;
};

export const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalysisState>({
    text: '',
    result: null,
  });

  const setText = (t: string) => {
    setState({ text: t, result: null });
  };

  const setResult = (r: AnalysisResult | null) => {
    setState((prev) => ({ ...prev, result: r }));
  };

  const reset = () => {
    setState({ text: '', result: null });
  };

  const value = useMemo(
    () => ({
      state,
      text: state.text,
      result: state.result,
      setText,
      setResult,
      reset,
    }),
    [state]
  );

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextType {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
