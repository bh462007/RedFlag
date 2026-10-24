import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ClauseSection } from '@/components/ClauseSection';
import { CopyButton } from '@/components/CopyButton';
import { AnalysisError } from '@/components/AnalysisError';
import { ReadingOptionsDialog } from '@/components/ReadingOptionsDialog';
import { useAnalysis } from '@/context/AnalysisContext';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import {
  type ClauseTone,
  type RedFlagSeverity,
} from '@/data';
import { cn } from '@/lib/utils';

function getRiskTier(score: number): {
  label: string;
  chipText: string;
  tone: 'danger' | 'warn' | 'safe';
} {
  if (score <= 20) return { label: 'Very high risk',
                            chipText: 'VERY HIGH', tone: 'danger' };
  if (score <= 40) return { label: 'High risk',
                            chipText: 'HIGH', tone: 'danger' };
  if (score <= 60) return { label: 'Moderate risk',
                            chipText: 'MODERATE', tone: 'warn' };
  if (score <= 80) return { label: 'Low risk',
                            chipText: 'LOW', tone: 'safe' };
  return { label: 'Very low risk',
           chipText: 'VERY LOW', tone: 'safe' };
}

const severityMap: Record<
  RedFlagSeverity,
  { tone: ClauseTone }
> = {
  severe: { tone: 'danger' },
  high: { tone: 'danger' },
  medium: { tone: 'warn' },
  low: { tone: 'safe' },
};

function HighlightedMessage({
  text,
}: {
  text: string;
}) {
  return (
    <pre className="font-document whitespace-pre-wrap text-[15px] leading-[26px] text-ink">
      {text}
    </pre>
  );
}

export function ClauseView() {
  const navigate = useNavigate();
  const { state } = useAnalysis();
  const { t } = useReadingOptions();
  const result = state.result;
  const messageText = state.text;

  const [messageExpanded, setMessageExpanded] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);

  const stepsText = useMemo(
    () =>
      result?.whatToDo.map((step, i) => `${i + 1}. ${step}`).join('\n') ?? '',
    [result]
  );

  if (!result) {
    return (
      <AnalysisError
        message={state.error ?? t('submitBeforeReport')}
      />
    );
  }

  const handleCopyMobileSteps = async () => {
    try {
      await navigator.clipboard.writeText(stepsText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = stepsText;
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
    setCopiedMobile(true);
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  const riskTier = getRiskTier(result.trustScore);

  const scoreColorClass =
    riskTier.tone === 'danger'
      ? 'text-danger'
      : riskTier.tone === 'warn'
      ? 'text-warn'
      : 'text-safe';

  const h1Text =
    result.verdict === 'scam'
      ? t('scamHeading')
      : result.verdict === 'suspicious'
      ? t('suspiciousHeading')
      : t('legitimateHeading');

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-lg font-semibold text-ink"
        >
          RedFlag
        </button>
        <ReadingOptionsDialog />
      </header>

      {/* Main Two-Column Layout */}
      <main
        id="main"
        className="flex flex-1 flex-col bg-paper pb-[80px] md:h-[calc(100vh-64px)] md:flex-row md:overflow-hidden md:pb-0"
      >
        {/* LEFT PANE — the message */}
        <div className="w-full md:h-full md:w-[45%] md:overflow-y-auto md:border-r md:border-border">
          {/* Mobile accordion trigger */}
          <button
            type="button"
            onClick={() => setMessageExpanded((prev) => !prev)}
            aria-expanded={messageExpanded}
            aria-controls="mobile-message-card"
            className="flex w-full items-center justify-between border-y border-border bg-surface p-4 text-[15px] font-medium text-ink md:hidden"
          >
            <span>{t('showOriginal')}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted transition-transform duration-200',
                messageExpanded && 'rotate-180',
              )}
              aria-hidden
            />
          </button>

          {/* Mobile collapsible card */}
          {messageExpanded && (
            <div id="mobile-message-card" className="p-4 md:hidden">
              <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
                <HighlightedMessage
                  text={messageText}
                />
              </div>
            </div>
          )}

          {/* Desktop message content */}
          <div className="hidden p-8 md:block">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('yourMessage')}
            </p>
            <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <HighlightedMessage
                text={messageText}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANE — the analysis */}
        <div className="w-full p-6 md:h-full md:w-[55%] md:overflow-y-auto md:p-12">
          <div className="mx-auto flex w-full max-w-[640px] flex-col md:mx-0">
            {/* Breadcrumb */}
            <nav aria-label={t('analysis')} className="mb-6 text-sm text-muted">
              {t('analysis')}
            </nav>

            {/* TRUST SCORE BLOCK */}
            <div className="mb-8 flex flex-col gap-4">
              <div className="flex items-baseline">
                <span
                  className={cn(
                    'font-display text-[56px] leading-none tracking-[-0.02em] tabular-nums md:text-[72px]',
                    scoreColorClass,
                  )}
                >
                  {result.trustScore}
                </span>
                <span className="ml-1 text-2xl text-muted">/100</span>
              </div>
              <div className="flex items-center gap-3">
                <Chip tone={riskTier.tone}>{t(riskTier.chipText === 'VERY HIGH' ? 'veryHigh' : riskTier.chipText === 'HIGH' ? 'high' : riskTier.chipText === 'MODERATE' ? 'moderate' : riskTier.chipText === 'LOW' ? 'low' : 'veryLow')}</Chip>
                <span className="text-[15px] text-muted">{t(riskTier.label === 'Very high risk' ? 'veryHighRisk' : riskTier.label === 'High risk' ? 'highRisk' : riskTier.label === 'Moderate risk' ? 'moderateRisk' : riskTier.label === 'Low risk' ? 'lowRisk' : 'veryLowRisk')}</span>
              </div>
            </div>

            {/* Main Heading H1 */}
            <h1 className="mb-10 font-display text-[44px] leading-[1.1] tracking-[-0.02em] text-ink">
              {h1Text}
            </h1>

            {/* THREE SECTIONS */}
            <div className="flex flex-col gap-10">
              {/* Section 1: Red flags */}
              <ClauseSection label={t('redFlags')}>
                {result.redFlags.length === 0 ? (
                  <p className="py-4 text-[15px] text-muted">
                    {t('noScamSignals')}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {result.redFlags.map((flag, idx) => {
                      const sev =
                        severityMap[flag.severity] || severityMap.low;
                      return (
                        <li
                          key={idx}
                          className="border-b border-border py-[18px] last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <Chip
                              tone={sev.tone}
                              className="h-6 px-2.5 text-[11px] font-semibold"
                            >
                              {t(
                                flag.severity === 'severe'
                                  ? 'veryHigh'
                                  : flag.severity === 'high'
                                    ? 'high'
                                    : flag.severity === 'medium'
                                      ? 'moderate'
                                      : 'low',
                              )}
                            </Chip>
                            <span className="text-[17px] font-semibold text-ink">
                              {flag.text}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
                            {flag.explanation}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ClauseSection>

              {/* Section 2: Why it matters */}
              <ClauseSection label={t('whyItMatters')}>
                <p className="text-[17px] leading-[1.7] text-ink">
                  {result.whyItMatters}
                </p>
              </ClauseSection>

              {/* Section 3: What to do */}
              <ClauseSection label={t('whatToDo')}>
                <div className="rounded-lg border border-border bg-[#FBF7EE] p-6">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    {t('actionPlan')}
                  </p>
                  <ol className="flex flex-col">
                    {result.whatToDo.map((step, idx) => (
                      <li
                        key={idx}
                        className="mb-3 flex items-start gap-3 last:mb-0"
                      >
                        <span className="font-display italic text-[18px] text-muted min-w-[20px] shrink-0 leading-snug">
                          {idx + 1}.
                        </span>
                        <span className="text-[15px] leading-relaxed text-ink">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex justify-end">
                    <CopyButton text={stepsText} label={t('copyAllSteps')} />
                  </div>
                </div>
              </ClauseSection>
            </div>

            {/* Desktop Footer Row */}
            <div className="mt-12 hidden w-full items-center justify-between md:flex">
              <Button variant="ghost" onClick={() => navigate('/')}>
                {t('newCheck')}
              </Button>
              <Button variant="primary" onClick={() => navigate('/plan')}>
                {t('seeActionPlan')}
              </Button>
            </div>
            <p className="mt-8 text-[13px] text-muted">{t('aiLanguageNote')}</p>
          </div>
        </div>
      </main>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-border bg-surface px-4 md:hidden">
        <Button
          variant="ghost"
          onClick={handleCopyMobileSteps}
          aria-label={t('copyAllSteps')}
        >
          {copiedMobile ? t('copied') : t('copySteps')}
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/plan')}
          aria-label={t('seeActionPlan')}
        >
          {t('seePlan')}
        </Button>
      </div>
    </div>
  );
}

export default ClauseView;
