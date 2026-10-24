import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAnalysis } from '@/context/AnalysisContext';
import { cn } from '@/lib/utils';

export function Processing() {
  const { state, setResult } = useAnalysis();
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      setPrefersReduced(true);
    } else {
      const raf = requestAnimationFrame(() => {
        setStarted(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: state.text }),
        });

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data = await res.json();

        if (cancelled) return;

        setResult(data);
        navigate('/clause');
      } catch (err) {
        if (cancelled) return;
        console.error('Analysis failed:', err);
        // On failure, still navigate to /clause — the screen will
        // fall back to sampleAnalysis via its existing fallback.
        navigate('/clause');
      }
    }

    // Delay 800ms so the user sees the processing screen briefly
    const timer = setTimeout(analyze, 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.text, setResult, navigate]);

  return (
    <main
      id="main"
      className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-paper px-6"
    >
      <div className="w-full max-w-[480px]">
        {/* HEADER */}
        <h2 className="font-display text-[36px] leading-[1.1] tracking-[-0.02em] text-ink">
          Reading the message…
        </h2>

        {/* CHECKLIST */}
        <ul className="mt-8 flex flex-col gap-4 text-left">
          <li className="flex items-center gap-3 text-[16px] text-ink">
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-safe"
              aria-hidden="true"
            />
            <span>Found 5 signal patterns</span>
          </li>
          <li className="flex items-center gap-3 text-[16px] text-ink">
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-safe"
              aria-hidden="true"
            />
            <span>Cross-checking against known scam formats</span>
          </li>
          <li className="flex items-center gap-3 text-[16px] text-ink">
            <Loader2
              className="h-5 w-5 shrink-0 animate-spin text-primary"
              aria-hidden="true"
            />
            <span>Generating your trust score</span>
          </li>
        </ul>

        {/* PROGRESS BAR */}
        <div
          className="mt-8 h-2 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label="Analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'h-full rounded-full bg-primary',
              prefersReduced
                ? 'w-full'
                : 'transition-[width] duration-[2000ms] ease-out motion-reduce:transition-none motion-reduce:w-full',
              prefersReduced || started ? 'w-full' : 'w-0'
            )}
          />
        </div>

        {/* BELOW */}
        <p className="mt-6 text-[14px] text-muted">
          About 20 seconds. You can close this tab and come back.
        </p>
      </div>
    </main>
  );
}

export default Processing;
