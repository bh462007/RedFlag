
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import { useAnalysis } from '@/context/AnalysisContext';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const stageKeys: TranslationKey[] = [
  'preparingMessage',
  'analyzingRisk',
  'preparingReport',
];
const ANALYSIS_TIMEOUT_MS = 30_000;

export function Processing() {
  const {
    state,
    setResult,
    setError: setAnalysisError,
    reset,
  } = useAnalysis();
  const { t } = useReadingOptions();
  const navigate = useNavigate();
  const translateRef = useRef(t);
  translateRef.current = t;

  const [progress, setProgress] = useState(5);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const currentStage =
    progress < 25 ? 0 : progress < 65 ? 1 : 2;

  useEffect(() => {
    let cancelled = false;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let requestController: AbortController | undefined;

    // This is visual progress, not a measurement of the model's
    // internal reasoning. It stops at 90% until the API responds.
    const progressTimer = setInterval(() => {
      setProgress((previous) => {
        if (previous >= 90) return 90;

        return Math.min(
          previous + Math.max(1, (90 - previous) * 0.06),
          90
        );
      });
    }, 350);

    async function analyze() {
      const controller = new AbortController();
      requestController = controller;
      const timeout = setTimeout(
        () => controller.abort(),
        ANALYSIS_TIMEOUT_MS,
      );
      const startedAt = Date.now();

      try {
        setError('');
        setAnalysisError(null);
        console.info('Analysis request started', {
          textLength: state.text.length,
        });

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: state.text }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          if (res.status === 429) {
            throw new Error(
              translateRef.current('busyService', {
                seconds: data.retryAfterSeconds ?? 10,
              })
            );
          }

          throw new Error(
            data.error ||
              translateRef.current('requestFailed', { status: res.status }),
          );
        }

        const data = await res.json();

        if (cancelled) return;

        console.info('Analysis request completed', {
          status: res.status,
          durationMs: Date.now() - startedAt,
        });
        clearInterval(progressTimer);
        setProgress(100);
        setResult(data);

        // Briefly show completion before opening the report.
        navigationTimer = setTimeout(() => {
          if (!cancelled) navigate('/clause');
        }, 350);
      } catch (err) {
        if (cancelled) return;

        clearInterval(progressTimer);

        const message =
          err instanceof DOMException && err.name === 'AbortError'
            ? translateRef.current('analysisTimeout')
            : err instanceof Error
              ? err.message
              : translateRef.current('unableToComplete');

        console.error('Analysis request failed', {
          category:
            err instanceof DOMException && err.name === 'AbortError'
              ? 'timeout-or-cancelled'
              : 'request-error',
          durationMs: Date.now() - startedAt,
        });
        setError(
          translateRef.current('analysisFailed', { message }),
        );
        setAnalysisError(message);
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!state.text?.trim()) {
      setError(translateRef.current('noMessage'));
      clearInterval(progressTimer);
    } else {
      // Deferring the request lets Strict Mode's development-only cleanup
      // cancel the first effect setup before it reaches the server.
      startTimer = setTimeout(() => {
        void analyze();
      }, 0);
    }

    return () => {
      cancelled = true;
      if (startTimer) {
        clearTimeout(startTimer);
      }
      requestController?.abort();
      clearInterval(progressTimer);

      if (navigationTimer) {
        clearTimeout(navigationTimer);
      }
    };
  }, [state.text, setResult, setAnalysisError, navigate, attempt]);

  return (
    <main
      id="main"
      className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-paper px-6"
    >
      <div className="w-full max-w-[480px]">
        <h2 className="font-display text-[36px] leading-[1.1] tracking-[-0.02em] text-ink">
          {error
            ? t('analysisInterrupted')
            : progress === 100
              ? t('analysisComplete')
              : t('analyzingMessage')}
        </h2>

        <p className="mt-3 text-[14px] text-muted">
          {error
            ? t('reportNotReady')
            : progress === 100
              ? t('resultsReady')
              : t('checkingText')}
        </p>

        <ul className="mt-8 flex flex-col gap-5 text-left">
          {stageKeys.map((stageKey, index) => {
            const complete =
              progress === 100 || index < currentStage;
            const active =
              progress < 100 && index === currentStage;

            return (
              <li
                key={stageKey}
                className={cn(
                  'flex items-center gap-3 text-[16px]',
                  complete || active ? 'text-ink' : 'text-muted'
                )}
              >
                {complete ? (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-safe"
                    aria-hidden="true"
                  />
                ) : active ? (
                  <Loader2
                    className="h-5 w-5 shrink-0 animate-spin text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                )}

                <span>{t(stageKey)}</span>
              </li>
            );
          })}
        </ul>

        <div
          className="mt-8 h-2 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-label={t('analysis')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {error ? (
          <div className="mt-6">
            <p className="flex items-start gap-2 text-[14px] text-muted">
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                if (!state.text.trim()) {
                  reset();
                  navigate('/');
                  return;
                }

                setError('');
                setProgress(5);
                setAttempt((value) => value + 1);
              }}
              className="mt-4 rounded-md bg-primary px-5 py-3 text-sm text-white"
            >
              {t('tryAgain')}
            </button>
          </div>
        ) : (
          <p className="mt-6 text-[14px] text-muted">
            {progress === 100
              ? t('openingReport')
              : t('analysisCanTake')}
          </p>
        )}
      </div>
    </main>
  );
}

export default Processing;
