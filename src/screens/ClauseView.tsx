import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ClauseSection } from '@/components/ClauseSection';
import { CopyButton } from '@/components/CopyButton';
import { ReadingOptionsDialog } from '@/components/ReadingOptionsDialog';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { clauses, type Clause } from '@/data';

type NavItem = {
  id: string;
  label: string;
  count: number;
  clauseId?: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { id: 'all', label: 'All', count: 47, clauseId: 'deposit' },
  { id: 'money', label: 'Money', count: 12, clauseId: 'deposit' },
  { id: 'exit', label: 'Exit', count: 5, clauseId: 'lock-in' },
  { id: 'repairs', label: 'Repairs', count: 9, disabled: true },
  { id: 'rules', label: 'Rules', count: 21, disabled: true },
];

export function ClauseView() {
  const navigate = useNavigate();
  const [activeNavId, setActiveNavId] = useState('all');
  const [clauseIndex, setClauseIndex] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const activeClause: Clause = clauses[clauseIndex];
  const riskyVariant = activeClause.variants.find((v) => v.tone === 'danger')!;
  const fairVariant = activeClause.variants.find((v) => v.tone === 'safe')!;

  const originalScrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const isFirstClause = clauseIndex === 0;
  const isLastClause = clauseIndex === clauses.length - 1;

  const fadeEnabled = useMemo(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const triggerFade = useCallback(() => {
    if (fadeEnabled) setFadeKey((k) => k + 1);
  }, [fadeEnabled]);

  const selectNav = useCallback(
    (item: NavItem) => {
      if (item.disabled || !item.clauseId) return;
      setActiveNavId(item.id);
      const idx = clauses.findIndex((c) => c.id === item.clauseId);
      if (idx >= 0 && idx !== clauseIndex) {
        setClauseIndex(idx);
        triggerFade();
      }
    },
    [clauseIndex, triggerFade],
  );

  const goPrevious = useCallback(() => {
    if (isFirstClause) return;
    setClauseIndex((i) => Math.max(0, i - 1));
    triggerFade();
  }, [isFirstClause, triggerFade]);

  const goNext = useCallback(() => {
    if (isLastClause) {
      navigate('/plan');
      return;
    }
    setClauseIndex((i) => Math.min(clauses.length - 1, i + 1));
    triggerFade();
  }, [isLastClause, navigate, triggerFade]);

  // Auto-scroll highlighted clause into view when variant changes
  useEffect(() => {
    const el = highlightRef.current;
    const container = originalScrollRef.current;
    if (!el || !container) return;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [clauseIndex]);

  const costText = deriveCost(activeClause);

  const fadeClass = fadeEnabled ? 'animate-clause-fade' : '';

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface px-6">
        <span className="text-lg font-semibold text-ink">Clause by Clause</span>
        <ReadingOptionsDialog />
      </header>

      {/* Desktop: three columns */}
      <div className="hidden flex-1 md:flex">
        <DesktopNavRail
          items={navItems}
          activeId={activeNavId}
          onSelect={selectNav}
        />

        <DesktopOriginalColumn
          scrollRef={originalScrollRef}
          highlightRef={highlightRef}
          activeClause={activeClause}
          activeClauseText={riskyVariant.text}
          fadeClass={fadeClass}
          fadeKey={fadeKey}
        />

        <DesktopExplanationColumn
          key={fadeKey}
          clause={activeClause}
          riskyVariant={riskyVariant}
          fairVariant={fairVariant}
          costText={costText}
          fadeClass={fadeClass}
          isFirstClause={isFirstClause}
          isLastClause={isLastClause}
          onPrevious={goPrevious}
          onNext={goNext}
        />
      </div>

      {/* Mobile */}
      <MobileClauseView
        navItems={navItems}
        activeNavId={activeNavId}
        onSelectNav={selectNav}
        clause={activeClause}
        riskyVariant={riskyVariant}
        fairVariant={fairVariant}
        costText={costText}
        fadeClass={fadeClass}
        fadeKey={fadeKey}
        isFirstClause={isFirstClause}
        isLastClause={isLastClause}
        onPrevious={goPrevious}
        onNext={goNext}
      />

      <footer className="border-t border-border bg-surface px-6 py-4 text-center text-xs text-muted">
        Sample lease. Figures are illustrative.
      </footer>
    </div>
  );
}

/* ---------- Desktop ---------- */

function DesktopNavRail({
  items,
  activeId,
  onSelect,
}: {
  items: NavItem[];
  activeId: string;
  onSelect: (item: NavItem) => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <nav
        aria-label="Clause categories"
        className="w-44 shrink-0 border-r border-border bg-surface"
      >
        <ul className="flex flex-col py-2">
          {items.map((item) => {
            const active = item.id === activeId;
            const baseBtn = cn(
              'flex h-12 w-full items-center justify-between px-4 text-sm font-medium',
              'transition-colors',
              active
                ? 'bg-[#EEF2F8] text-primary'
                : 'text-ink hover:bg-paper',
              item.disabled && 'cursor-not-allowed text-muted hover:bg-transparent',
            );
            if (item.disabled) {
              return (
                <li key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-disabled="true"
                        disabled
                        className={cn(baseBtn, 'border-l-[3px] border-l-transparent')}
                      >
                        <span>{item.label}</span>
                        <span className="tabular-nums text-muted">{item.count}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Not in this demo</TooltipContent>
                  </Tooltip>
                </li>
              );
            }
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    baseBtn,
                    active
                      ? 'border-l-[3px] border-l-primary'
                      : 'border-l-[3px] border-l-transparent',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums text-muted">{item.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </TooltipProvider>
  );
}

function DesktopOriginalColumn({
  scrollRef,
  highlightRef,
  activeClause,
  activeClauseText,
  fadeClass,
  fadeKey,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  highlightRef: React.RefObject<HTMLDivElement>;
  activeClause: Clause;
  activeClauseText: string;
  fadeClass: string;
  fadeKey: number;
}) {
  return (
    <div
      className="flex w-[40%] shrink-0 flex-col border-r border-border bg-paper"
    >
      <div className="px-6 pt-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Original text
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-6 pt-2"
      >
        <div className="rounded-lg bg-surface p-6 shadow-[0_1px_2px_rgba(18,22,31,0.06)]">
          <div className="flex flex-col gap-4 leading-[26px] text-[15px] text-ink">
            {clauses.map((c) => {
              const isActive = c.id === activeClause.id;
              const text =
                c.variants.find((v) => v.tone === 'danger')?.text ?? '';
              return (
                <div key={c.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {c.number}
                  </p>
                  <p
                    ref={isActive ? highlightRef : undefined}
                    className={cn(
                      'rounded-lg p-2 transition-colors',
                      isActive
                        ? 'bg-highlight'
                        : 'bg-transparent',
                    )}
                  >
                    {text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div key={fadeKey} className={cn('mt-4', fadeClass)}>
          <p className="text-xs text-muted">
            Showing the risky variant of {activeClause.number}. Switch clauses
            from the left rail.
          </p>
        </div>
      </div>
    </div>
  );
}

function DesktopExplanationColumn({
  clause,
  riskyVariant,
  fairVariant,
  costText,
  fadeClass,
  isFirstClause,
  isLastClause,
  onPrevious,
  onNext,
}: {
  clause: Clause;
  riskyVariant: NonNullable<ReturnType<typeof findVariant>>;
  fairVariant: NonNullable<ReturnType<typeof findVariant>>;
  costText: string;
  fadeClass: string;
  isFirstClause: boolean;
  isLastClause: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { language } = useReadingOptions();
  const isHindiDeposit = language === 'hi' && clause.id === 'deposit';
  const meaningLabel = isHindiDeposit ? 'इसका मतलब क्या है' : 'What this means';
  const meaningText = isHindiDeposit
    ? 'आपको शिफ्ट होने से पहले छह महीने का किराया देना होगा — ₹1,68,000।'
    : riskyVariant.plain;
  const isHindi = isHindiDeposit;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-12 py-8">
        <div className={cn('mx-auto flex max-w-[640px] flex-col gap-8', fadeClass)}>
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex items-center gap-2">
              <li>Agreement</li>
              <li aria-hidden className="text-muted">›</li>
              <li>{clause.category}</li>
              <li aria-hidden className="text-muted">›</li>
              <li className="text-ink">{clause.number}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-6">
            <Chip
              tone="danger"
              className="h-8 px-4 text-sm"
            >
              {riskyVariant.label}
            </Chip>

            <h1 className="text-3xl font-semibold leading-tight text-ink">
              {clause.title}
            </h1>

            <div className="flex flex-col gap-8">
              <ClauseSection label={meaningLabel}>
                <p className={cn('leading-relaxed', isHindi && 'font-devanagari')}>
                  {meaningText}
                </p>
              </ClauseSection>

              <ClauseSection label="What it could cost you">
                <p className="leading-relaxed">{costText}</p>
              </ClauseSection>

              <div>
                <ClauseSection label="Ask for this instead">
                  <div className="mt-2 rounded-lg border border-primary p-4">
                    <p className={cn('leading-relaxed', isHindi && 'font-devanagari')}>
                      {fairVariant.plain}
                    </p>
                  </div>
                </ClauseSection>
                <div className="mt-4">
                  <CopyButton text={fairVariant.plain} label="Copy this" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface px-12 py-4">
        <Button
          variant="ghost"
          onClick={onPrevious}
          disabled={isFirstClause}
          className="h-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous clause
        </Button>
        {isLastClause ? (
          <Button variant="primary" onClick={onNext} className="h-12">
            See action plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" onClick={onNext} className="h-12">
            Next clause
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Mobile ---------- */

function MobileClauseView({
  navItems,
  activeNavId,
  onSelectNav,
  clause,
  riskyVariant,
  fairVariant,
  costText,
  fadeClass,
  fadeKey,
  isFirstClause,
  isLastClause,
  onPrevious,
  onNext,
}: {
  navItems: NavItem[];
  activeNavId: string;
  onSelectNav: (item: NavItem) => void;
  clause: Clause;
  riskyVariant: NonNullable<ReturnType<typeof findVariant>>;
  fairVariant: NonNullable<ReturnType<typeof findVariant>>;
  costText: string;
  fadeClass: string;
  fadeKey: number;
  isFirstClause: boolean;
  isLastClause: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { language } = useReadingOptions();
  const isHindiDeposit = language === 'hi' && clause.id === 'deposit';
  const meaningLabel = isHindiDeposit ? 'इसका मतलब क्या है' : 'What this means';
  const meaningText = isHindiDeposit
    ? 'आपको शिफ्ट होने से पहले छह महीने का किराया देना होगा — ₹1,68,000।'
    : riskyVariant.plain;

  return (
    <div className="flex flex-1 flex-col md:hidden">
      <nav
        aria-label="Clause categories"
        className="flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-2 [scrollbar-width:none]"
      >
        {navItems.map((item) => {
          const active = item.id === activeNavId;
          return (
            <TooltipProvider key={item.id} delayDuration={200}>
              {item.disabled ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-disabled="true"
                      disabled
                      className={cn(
                        'inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold',
                        'border border-border text-muted cursor-not-allowed',
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="tabular-nums">{item.count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Not in this demo</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectNav(item)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-primary text-white'
                      : 'border border-border bg-surface text-ink',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums opacity-70">{item.count}</span>
                </button>
              )}
            </TooltipProvider>
          );
        })}
      </nav>

      <main
        id="main"
        className="flex flex-1 flex-col overflow-y-auto px-4 pb-24 pt-4"
      >
        <div key={fadeKey} className={cn('flex flex-col gap-6', fadeClass)}>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{clause.category}</span>
            <span aria-hidden>›</span>
            <span className="text-ink">{clause.number}</span>
          </div>

          <Chip tone="danger" className="h-8 w-fit px-4 text-sm">
            {riskyVariant.label}
          </Chip>

          <h1 className="text-2xl font-semibold leading-tight text-ink">
            {clause.title}
          </h1>

          <Accordion type="single" collapsible className="border-y border-border">
            <AccordionItem value="original" className="border-b-0">
              <AccordionTrigger className="text-sm font-semibold text-ink">
                Show original clause
              </AccordionTrigger>
              <AccordionContent>
                <p className="leading-relaxed text-ink">{riskyVariant.text}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <ClauseSection label={meaningLabel}>
            <p className={cn('leading-relaxed', isHindiDeposit && 'font-devanagari')}>
              {meaningText}
            </p>
          </ClauseSection>

          <ClauseSection label="What it could cost you">
            <p className="leading-relaxed">{costText}</p>
          </ClauseSection>

          <div>
            <ClauseSection label="Ask for this instead">
              <div className="mt-2 rounded-lg border border-primary p-4">
                <p className={cn('leading-relaxed', isHindiDeposit && 'font-devanagari')}>
                  {fairVariant.plain}
                </p>
              </div>
            </ClauseSection>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-between gap-4 border-t border-border bg-surface px-4 shadow-[0_1px_2px_rgba(18,22,31,0.06)]">
        <CopyButton text={fairVariant.plain} label="Copy this" />
        {isLastClause ? (
          <Button variant="primary" onClick={onNext} className="h-12">
            See action plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="secondary" onClick={onNext} className="h-10">
            Next clause
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function findVariant(clause: Clause, tone: 'danger' | 'safe') {
  return clause.variants.find((v) => v.tone === tone);
}

function deriveCost(clause: Clause): string {
  if (clause.id === 'deposit') {
    return 'If the landlord withholds the deposit unfairly, you could lose the full ₹1,68,000 — the equivalent of about six months of rent. Without a written deduction list or a refund deadline, recovering it means a formal dispute, which can take months.';
  }
  if (clause.id === 'lock-in') {
    return 'Leaving during the 11-month lock-in forfeits your entire ₹1,68,000 deposit. That is roughly ₹15,300 per month of the lock-in — a steep cost for a job relocation, a breakup, or any reason you need to move early.';
  }
  return clause.variants.find((v) => v.tone === 'danger')?.whyItMatters ?? '';
}
