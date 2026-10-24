import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { AnalysisError } from '@/components/AnalysisError';
import { useAnalysis } from '@/context/AnalysisContext';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import {
  type ClauseTone,
  type RedFlagSeverity,
} from '@/data';

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
  { tone: ClauseTone; label: string }
> = {
  severe: { tone: 'danger', label: 'SEVERE' },
  high: { tone: 'danger', label: 'HIGH' },
  medium: { tone: 'warn', label: 'MEDIUM' },
  low: { tone: 'safe', label: 'LOW' },
};

export function AtAGlance() {
  const navigate = useNavigate();
  const { state } = useAnalysis();
  const { t } = useReadingOptions();
  if (!state.result) {
    return (
      <AnalysisError
        message={state.error ?? t('submitBeforeReport')}
      />
    );
  }
  const result = state.result;
  const redFlagCount = result.redFlags.length;
  const severeFlagCount = result.redFlags.filter(
    (flag) => flag.severity === 'severe',
  ).length;
  const highFlagCount = result.redFlags.filter(
    (flag) => flag.severity === 'high',
  ).length;

  const riskTier = getRiskTier(result.trustScore);
  const riskLabel =
    riskTier.label === 'Very high risk'
      ? t('veryHighRisk')
      : riskTier.label === 'High risk'
        ? t('highRisk')
        : riskTier.label === 'Moderate risk'
          ? t('moderateRisk')
          : riskTier.label === 'Low risk'
            ? t('lowRisk')
            : t('veryLowRisk');
  const riskChip =
    riskTier.chipText === 'VERY HIGH'
      ? t('veryHigh')
      : riskTier.chipText === 'HIGH'
        ? t('high')
        : riskTier.chipText === 'MODERATE'
          ? t('moderate')
          : riskTier.chipText === 'LOW'
            ? t('low')
            : t('veryLow');

  const scoreColorClass =
    riskTier.tone === 'danger'
      ? 'text-danger'
      : riskTier.tone === 'warn'
      ? 'text-warn'
      : 'text-safe';

  return (
    <main
      id="main"
      className="min-h-[calc(100vh-64px)] bg-paper px-6 py-16"
    >
      <div className="mx-auto max-w-[1080px]">
        {/* HEADER BLOCK (centered, margin-bottom 48px) */}
        <header className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('trustReport')}
          </p>
          <h1 className="mt-3 font-display text-[48px] leading-[1.05] tracking-[-0.02em] text-ink">
            {t('trustReportTitle')}
          </h1>
          <p className="mt-4 text-[16px] text-muted">
            {redFlagCount === 0
              ? t('noWarningSignals')
              : t('warningSignalCount', {
                  count: redFlagCount,
                  countLabel: t(redFlagCount === 1 ? 'oneSignal' : 'manySignals'),
                })}
            {severeFlagCount > 0 &&
              ` ${t('severeCount', {
                count: severeFlagCount,
                countLabel: t(severeFlagCount === 1 ? 'oneIs' : 'manyAre'),
                countVerb: t(severeFlagCount === 1 ? 'oneIs' : 'manyAre'),
              })}`}
            {highFlagCount > 0 &&
              ` ${t('highPriorityCount', {
                count: highFlagCount,
                countLabel: t(highFlagCount === 1 ? 'oneIs' : 'manyAre'),
                countVerb: t(highFlagCount === 1 ? 'oneIs' : 'manyAre'),
              })}`}
          </p>
        </header>

        {/* TRUST SCORE HERO CARD (mb-12) */}
        <div className="mb-12 flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-surface p-10 md:flex-row md:items-center">
          {/* Left side */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {t('trustScore')}
            </p>
            <div className="mt-3 flex items-baseline">
              <span
                className={`font-display text-[72px] leading-none tracking-[-0.03em] tabular-nums md:text-[96px] ${scoreColorClass}`}
              >
                {result.trustScore}
              </span>
              <span className="mb-3 ml-2 text-3xl text-muted">/100</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Chip tone={riskTier.tone}>{riskChip}</Chip>
              <span className="text-[15px] text-muted">{riskLabel}</span>
            </div>
          </div>

          {/* Right side (only if result.trustScore < 50) */}
          {result.trustScore < 50 && (
            <div className="max-w-[280px] text-left md:text-right">
              <p className="text-[14px] leading-relaxed text-muted">
                {t('doNotRespond')}
              </p>
              <p className="text-[14px] leading-relaxed text-muted">
                {t('reportCybercrime')}
              </p>
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/clause')}
                  className="px-0 md:px-4"
                >
                  {t('viewFullAnalysis')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* SIGNAL GRID (mb-12) */}
        <section aria-label={t('signalsDetected')} className="mb-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('signalsDetected')}
          </p>
          {result.redFlags.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <Chip tone="safe">{t('safe')}</Chip>
                <span className="text-[17px] font-semibold text-ink">
                  {t('noSignalsDetected')}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.redFlags.map((flag, idx) => {
                const sev = severityMap[flag.severity] || severityMap.low;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => navigate('/clause')}
                    className="flex flex-col rounded-lg border border-border bg-surface p-5 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center">
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
                    </div>
                    <p className="mt-3 text-[17px] font-semibold text-ink">
                      {flag.text}
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">
                      {flag.explanation}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* BOTTOM CTA BANNER (mb-8) */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-[17px] font-semibold text-ink">
              {redFlagCount === 0
                ? t('reviewMessage')
                : t('reviewFlags', {
                    count: redFlagCount,
                    countLabel: t(redFlagCount === 1 ? 'oneFlag' : 'manyFlags'),
                  })}
            </p>
            <p className="mt-1 text-[14px] text-muted">
              {t('eachMessage')}
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/plan')}>
            {t('openActionPlan')}
          </Button>
        </div>

        {/* BOTTOM MUTED LINE */}
        <p className="mt-12 text-center text-[13px] text-muted">
          {t('sampleAnalysisNote')}
        </p>
        <p className="mt-2 text-center text-[13px] text-muted">
          {t('aiLanguageNote')}
        </p>
      </div>
    </main>
  );
}

export default AtAGlance;
