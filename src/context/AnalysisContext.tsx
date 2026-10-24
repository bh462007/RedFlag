import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import type { AnalysisResult } from '@/data';

export type AnalysisState = {
  text: string;
  result: AnalysisResult | null;
  error: string | null;
};

export type AnalysisContextType = {
  state: AnalysisState;
  text: string;
  result: AnalysisResult | null;
  setText: (t: string) => void;
  setResult: (r: AnalysisResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalysisState>({
    text: '',
    result: null,
    error: null,
  });

  const setText = useCallback((t: string) => {
    setState({ text: t, result: null, error: null });
  }, []);

  const setResult = useCallback((r: AnalysisResult | null) => {
    setState((prev) => ({ ...prev, result: r, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ text: '', result: null, error: null });
  }, []);

  const value = useMemo(
    () => ({
      state,
      text: state.text,
      result: state.result,
      setText,
      setResult,
      setError,
      reset,
    }),
    [state, setText, setResult, setError, reset]
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
