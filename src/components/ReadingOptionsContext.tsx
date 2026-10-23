import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FontSize = 'small' | 'medium' | 'large';
export type Language = 'en' | 'hi';

export interface ReadingOptions {
  fontSize: FontSize;
  highContrast: boolean;
  language: Language;
}

export interface ReadingOptionsContextValue extends ReadingOptions {
  setFontSize: (size: FontSize) => void;
  setHighContrast: (on: boolean) => void;
  setLanguage: (lang: Language) => void;
  reset: () => void;
}

const defaults: ReadingOptions = {
  fontSize: 'medium',
  highContrast: false,
  language: 'en',
};

const STORAGE_KEY = 'reading-options';

const ReadingOptionsContext = createContext<ReadingOptionsContextValue | null>(
  null,
);

const fontSizePercent: Record<FontSize, string> = {
  small: '100%',
  medium: '115%',
  large: '130%',
};

function loadInitial(): ReadingOptions {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ReadingOptions>;
    return {
      fontSize: parsed.fontSize ?? defaults.fontSize,
      highContrast: parsed.highContrast ?? defaults.highContrast,
      language: parsed.language ?? defaults.language,
    };
  } catch {
    return defaults;
  }
}

export function ReadingOptionsProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ReadingOptions>(loadInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = fontSizePercent[options.fontSize];
    root.classList.toggle('hc', options.highContrast);
    document.body.classList.toggle('high-contrast', options.highContrast);
    root.classList.toggle('lang-hi', options.language === 'hi');
  }, [options]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      /* ignore */
    }
  }, [options]);

  const value = useMemo<ReadingOptionsContextValue>(
    () => ({
      ...options,
      setFontSize: (fontSize) => setOptions((o) => ({ ...o, fontSize })),
      setHighContrast: (highContrast) =>
        setOptions((o) => ({ ...o, highContrast })),
      setLanguage: (language) => setOptions((o) => ({ ...o, language })),
      reset: () => setOptions(defaults),
    }),
    [options],
  );

  return (
    <ReadingOptionsContext.Provider value={value}>
      {children}
    </ReadingOptionsContext.Provider>
  );
}

export function useReadingOptions(): ReadingOptionsContextValue {
  const ctx = useContext(ReadingOptionsContext);
  if (!ctx) {
    throw new Error('useReadingOptions must be used within ReadingOptionsProvider');
  }
  return ctx;
}
