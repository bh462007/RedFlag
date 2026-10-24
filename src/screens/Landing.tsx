import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { useAnalysis } from '@/context/AnalysisContext';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import { sampleAnalysis, sampleMessage } from '@/data';
import { cn } from '@/lib/utils';

export function Landing() {
  const { text, setText, setResult } = useAnalysis();
  const { t } = useReadingOptions();
  const navigate = useNavigate();
  const [highlightVisible, setHighlightVisible] = useState(false);

  useEffect(() => {
    if (!text || text.trim() === '') {
      setText(sampleMessage);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setHighlightVisible(true);
        return;
      }
      const raf = requestAnimationFrame(() => {
        setHighlightVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setHighlightVisible(true);
    }
  }, []);

  return (
    <main
      id="main"
      className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-12 md:px-12 md:py-16"
    >
      <div className="flex w-full max-w-[1240px] flex-col items-center justify-between gap-8 md:flex-row md:items-center">
        {/* Left column — Message Check (55%) */}
        <div className="flex w-full flex-col items-start md:w-[55%]">
          {/* 4.1 Section label */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('messageCheck')}
          </p>

          {/* 4.2 Main heading */}
          <h1 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl md:text-[56px]">
            {t('landingTitle')}
          </h1>

          {/* 4.3 Supporting paragraph */}
          <p className="mt-4 max-w-[520px] font-sans text-base leading-[1.6] text-muted md:text-[18px]">
            {t('landingDescription')}
          </p>

          {/* 4.4 Controlled message textarea */}
          <div className="mt-6 w-full max-w-[520px]">
            <label htmlFor="message-input" className="sr-only">
              {t('messageLabel')}
            </label>
            <textarea
              id="message-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('messagePlaceholder')}
              className="min-h-[120px] w-full max-w-[520px] rounded-lg border border-border bg-surface p-4 font-sans text-[16px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* 4.5 Buttons */}
          <div className="mt-6 flex w-full flex-col gap-4 sm:flex-row sm:w-auto">
            <Button
              variant="primary"
              onClick={() => navigate('/processing')}
              className="w-full sm:w-auto"
            >
              {t('checkMessage')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(sampleAnalysis);
                navigate('/clause');
              }}
              className="w-full sm:w-auto"
            >
              {t('seeSample')}
            </Button>
          </div>

          {/* 4.6 Footer disclaimer */}
          <p className="mt-8 max-w-[520px] text-[14px] leading-relaxed text-muted">
            {t('privacyNotice')}
          </p>
        </div>

        {/* Right column — Layered Document Composition (45%) */}
        <div className="flex w-full items-center justify-center md:w-[45%] md:justify-end">
          <div className="relative w-full max-w-[400px]">
            {/* 5.2 Back card */}
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden -translate-y-3 translate-x-3 rotate-[3deg] rounded-lg bg-border md:block"
            />

            {/* 5.3 Front card */}
            <div className="relative z-10 flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(20,24,29,0.06)] md:rotate-[1.5deg] md:p-8">
              {/* A. Hanging clause number */}
              <p className="font-display text-[13px] italic text-muted">4.2</p>

              {/* B. Danger Chip */}
              <div className="w-fit">
                <Chip tone="danger">
                  {t('sampleCost')}
                </Chip>
              </div>

              {/* C. Document heading */}
              <h2 className="font-display text-[28px] leading-tight text-ink">
                {t('sampleHeading')}
              </h2>

              {/* D. Supporting line */}
              <p className="text-[14px] text-muted">
                {t('sampleDetail')}
              </p>

              {/* E. Highlighted lease clause */}
              <p
                className={cn(
                  'rounded bg-highlight p-2 font-sans text-[14px] leading-relaxed text-ink transition-opacity duration-200 motion-reduce:transition-none motion-reduce:opacity-100',
                  highlightVisible ? 'opacity-100' : 'opacity-0',
                )}
              >
                {t('sampleClause')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Landing;
