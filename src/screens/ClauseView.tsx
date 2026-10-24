import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ClauseSection } from '@/components/ClauseSection';
import { CopyButton } from '@/components/CopyButton';
import { ReadingOptionsDialog } from '@/components/ReadingOptionsDialog';
import { useAnalysis } from '@/context/AnalysisContext';
import {
  sampleAnalysis,
  sampleMessage,
  type ClauseTone,
  type RedFlagSeverity,
} from '@/data';
import { cn } from '@/lib/utils';

const HIGHLIGHT_SUBSTRINGS = [
  'hr@techstarthiring-india.com',
  'reviewing your profile on LinkedIn',
  'within 48 hours',
  'registration fee of 2,500',
  'refunded with your first salary',
];

const severityMap: Record<
  RedFlagSeverity,
  { tone: ClauseTone; label: string }
> = {
  severe: { tone: 'danger', label: 'SEVERE' },
  high: { tone: 'danger', label: 'HIGH' },
  medium: { tone: 'warn', label: 'MEDIUM' },
  low: { tone: 'safe', label: 'LOW' },
};

function HighlightedMessage({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  const elements = useMemo(() => {
    type Match = { start: number; end: number };
    const matches: Match[] = [];

    for (const sub of HIGHLIGHT_SUBSTRINGS) {
      let pos = 0;
      while ((pos = text.indexOf(sub, pos)) !== -1) {
        matches.push({ start: pos, end: pos + sub.length });
        pos += sub.length;
      }
    }

    if (matches.length === 0) {
      return [text];
    }

    matches.sort((a, b) => a.start - b.start);

    const nodes: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    matches.forEach((m, idx) => {
      if (m.start >= lastIndex) {
        if (m.start > lastIndex) {
          nodes.push(text.slice(lastIndex, m.start));
        }
        nodes.push(
          <mark
            key={`highlight-${idx}`}
            className={cn(
              'rounded-[2px] bg-highlight px-0.5 py-0.5 text-ink transition-opacity duration-200 motion-reduce:transition-none motion-reduce:opacity-100',
              visible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {text.slice(m.start, m.end)}
          </mark>
        );
        lastIndex = m.end;
      }
    });

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  }, [text, visible]);

  return (
    <pre className="font-document whitespace-pre-wrap text-[15px] leading-[26px] text-ink">
      {elements}
    </pre>
  );
}

export function ClauseView() {
  const navigate = useNavigate();
  const { state } = useAnalysis();
  const result = state.result ?? sampleAnalysis;
  const messageText = state.text || sampleMessage;

  const [messageExpanded, setMessageExpanded] = useState(false);
  const [highlightsVisible, setHighlightsVisible] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setHighlightsVisible(true);
        return;
      }
      const raf = requestAnimationFrame(() => {
        setHighlightsVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setHighlightsVisible(true);
    }
  }, []);

  const stepsText = useMemo(
    () => result.whatToDo.map((step, i) => `${i + 1}. ${step}`).join('\n'),
    [result.whatToDo]
  );

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

  const scoreColorClass =
    result.verdict === 'scam'
      ? 'text-danger'
      : result.verdict === 'suspicious'
      ? 'text-warn'
      : 'text-safe';

  const verdictTone: ClauseTone =
    result.verdict === 'scam'
      ? 'danger'
      : result.verdict === 'suspicious'
      ? 'warn'
      : 'safe';

  const verdictLabel =
    result.verdict === 'scam'
      ? 'SCAM'
      : result.verdict === 'suspicious'
      ? 'SUSPICIOUS'
      : 'SAFE';

  const riskLabel =
    result.verdict === 'scam'
      ? 'High risk'
      : result.verdict === 'suspicious'
      ? 'Needs checking'
      : 'Low risk';

  const h1Text =
    result.verdict === 'scam'
      ? 'This internship offer is very likely a scam'
      : result.verdict === 'suspicious'
      ? 'This offer shows some suspicious signals'
      : 'This offer looks legitimate';

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
            <span>Show original message</span>
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
                  visible={highlightsVisible}
                />
              </div>
            </div>
          )}

          {/* Desktop message content */}
          <div className="hidden p-8 md:block">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
              Your message
            </p>
            <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
              <HighlightedMessage
                text={messageText}
                visible={highlightsVisible}
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANE — the analysis */}
        <div className="w-full p-6 md:h-full md:w-[55%] md:overflow-y-auto md:p-12">
          <div className="mx-auto flex w-full max-w-[640px] flex-col md:mx-0">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
              Analysis
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
                <Chip tone={verdictTone}>{verdictLabel}</Chip>
                <span className="text-[15px] text-muted">{riskLabel}</span>
              </div>
            </div>

            {/* Main Heading H1 */}
            <h1 className="mb-10 font-display text-[44px] leading-[1.1] tracking-[-0.02em] text-ink">
              {h1Text}
            </h1>

            {/* THREE SECTIONS */}
            <div className="flex flex-col gap-10">
              {/* Section 1: Red flags */}
              <ClauseSection label="Red flags">
                {result.redFlags.length === 0 ? (
                  <p className="py-4 text-[15px] text-muted">
                    No scam signals detected.
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
                              {sev.label}
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
              <ClauseSection label="Why it matters">
                <p className="text-[17px] leading-[1.7] text-ink">
                  {result.whyItMatters}
                </p>
              </ClauseSection>

              {/* Section 3: What to do */}
              <ClauseSection label="What to do">
                <div className="rounded-lg border border-border bg-[#FBF7EE] p-6">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    ACTION PLAN
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
                    <CopyButton text={stepsText} label="Copy all steps" />
                  </div>
                </div>
              </ClauseSection>
            </div>

            {/* Desktop Footer Row */}
            <div className="mt-12 hidden w-full items-center justify-between md:flex">
              <Button variant="ghost" onClick={() => navigate('/')}>
                ← New check
              </Button>
              <Button variant="primary" onClick={() => navigate('/plan')}>
                See action plan →
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-t border-border bg-surface px-4 md:hidden">
        <Button
          variant="ghost"
          onClick={handleCopyMobileSteps}
          aria-label="Copy all steps"
        >
          {copiedMobile ? 'Copied ✓' : 'Copy steps'}
        </Button>
        <Button
          variant="primary"
          onClick={() => navigate('/plan')}
          aria-label="See action plan"
        >
          See plan →
        </Button>
      </div>
    </div>
  );
}

export default ClauseView;
