import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { CopyButton } from '@/components/CopyButton';
import { AnalysisError } from '@/components/AnalysisError';
import { useAnalysis } from '@/context/AnalysisContext';
import { cn } from '@/lib/utils';

export function ActionPlan() {
  const navigate = useNavigate();
  const { state } = useAnalysis();
  const result = state.result;
  const steps = result?.whatToDo ?? [];

  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleStep = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allRequestsText = useMemo(
    () => steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n\n'),
    [steps]
  );

  if (!result) {
    return (
      <AnalysisError
        message={state.error ?? 'Submit a message before opening the action plan.'}
      />
    );
  }

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allRequestsText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = allRequestsText;
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
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main
      id="main"
      className="min-h-[calc(100vh-64px)] bg-paper px-6 py-16"
    >
      <div className="mx-auto max-w-[800px]">
        {/* HEADER */}
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            ACTION PLAN
          </p>
          <h1 className="mt-3 font-display text-[44px] leading-[1.1] tracking-[-0.02em] text-ink">
            Before you respond, do these things
          </h1>
          <p className="mt-4 max-w-[560px] text-[16px] text-muted">
            Five minutes of checking saves months of regret. Copy each step and act on it.
          </p>
        </header>

        {/* STEP LIST (mt-12, flex column gap-4) */}
        <div className="mt-12 flex flex-col gap-4">
          {steps.map((step, index) => {
            const stepId = `step-${index}`;
            const isChecked = checkedIds.includes(stepId);
            return (
              <div
                key={stepId}
                className={cn(
                  'rounded-lg border border-border bg-surface p-5 transition-opacity',
                  isChecked && 'opacity-60'
                )}
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  {/* Left: numbered circle */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[16px] italic text-white">
                    {index + 1}
                  </div>

                  {/* Middle: Title & Detail */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[17px] font-semibold text-ink">
                        {isChecked && (
                          <span className="mr-1 font-bold text-safe">✓</span>
                        )}
                        {step}
                      </h2>
                      {isChecked && (
                        <Chip
                          tone="safe"
                          className="h-5 px-2 text-[10px] font-semibold"
                        >
                          RAISED
                        </Chip>
                      )}
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted">
                      Copy this and complete it before you respond.
                    </p>
                  </div>

                  {/* Right (desktop) / below (mobile): Copy Button */}
                  <div className="mt-2 shrink-0 self-start sm:mt-0">
                    <CopyButton text={step} label="Copy request" />
                  </div>
                </div>

                {/* Below middle column: full width checkbox row (mt-3) */}
                <div className="mt-3 border-t border-border/50 pt-3">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(stepId)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Mark as raised</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <footer className="mt-8">
          <p className="text-[15px] text-muted">
            Send this list to someone you trust before you respond.
          </p>

          <div className="no-print mt-6 flex flex-wrap gap-3 print:hidden">
            <Button variant="primary" onClick={handleCopyAll}>
              {copiedAll ? 'Copied ✓' : 'Copy all steps'}
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              Print
            </Button>
            <Button variant="ghost" onClick={() => navigate('/clause')}>
              ← Back to analysis
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default ActionPlan;
