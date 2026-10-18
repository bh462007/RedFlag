import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Processing() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const prefersReduced = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  useEffect(() => {
    if (prefersReduced.current) {
      setProgress(100);
      const t = setTimeout(() => navigate('/glance'), 300);
      return () => clearTimeout(t);
    }

    const duration = 2000;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => navigate('/glance'), 50);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-paper">
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center px-6 py-16"
      >
        <div className="flex w-full flex-col items-center gap-8 text-center">
          <h2 className="text-2xl font-semibold text-ink">
            Reading your lease&hellip;
          </h2>

          <ul className="flex w-full flex-col gap-4 text-left">
            <ChecklistRow label="Found 47 clauses" done />
            <ChecklistRow
              label="Checking deposit, lock-in and notice period"
              done
            />
            <ChecklistRow label="Looking for common traps" spinning />
          </ul>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Reading progress"
          >
            <div
              className={cn(
                'h-full rounded-full bg-primary',
                prefersReduced.current
                  ? 'w-full'
                  : 'transition-[width]',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-sm text-muted">
            About 20 seconds. You can close this tab and come back.
          </p>
        </div>
      </main>
    </div>
  );
}

function ChecklistRow({
  label,
  done,
  spinning,
}: {
  label: string;
  done?: boolean;
  spinning?: boolean;
}) {
  return (
    <li className="flex items-center gap-4 text-base text-ink">
      {done ? (
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-safe"
          aria-hidden
        >
          <Check className="h-5 w-5" />
        </span>
      ) : spinning ? (
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-primary"
          aria-hidden
        >
          <Spinner />
        </span>
      ) : (
        <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
      )}
      <span>{label}</span>
    </li>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      style={{ animationDuration: '2.4s' }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 3a9 9 0 1 0 9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
