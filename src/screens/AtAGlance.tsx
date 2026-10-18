import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { cn } from '@/lib/utils';
import type { ClauseTone } from '@/data';

type FactCardData = {
  id: string;
  label: string;
  value: string;
  subLine: string;
  tone: ClauseTone;
  chipLabel: string;
  href?: string;
};

const cards: FactCardData[] = [
  {
    id: 'rent',
    label: 'Monthly rent',
    value: '₹28,000',
    subLine: 'Plus ₹3,500 maintenance',
    tone: 'safe',
    chipLabel: 'Fair',
  },
  {
    id: 'term',
    label: 'Lease term',
    value: '11 months',
    subLine: 'Lock-in matches the full term',
    tone: 'safe',
    chipLabel: 'Fair',
  },
  {
    id: 'deposit',
    label: 'Security deposit',
    value: '₹1,68,000',
    subLine: "Refund at the landlord's discretion",
    tone: 'danger',
    chipLabel: 'Risky',
    href: '/clause',
  },
  {
    id: 'lockin',
    label: 'Lock-in period',
    value: '11 months',
    subLine: 'Forfeits your full deposit if you leave early',
    tone: 'danger',
    chipLabel: 'Risky',
    href: '/clause?c=lockin',
  },
  {
    id: 'notice',
    label: 'Notice period',
    value: '2 months',
    subLine: 'Standard for the area',
    tone: 'safe',
    chipLabel: 'Fair',
  },
  {
    id: 'increase',
    label: 'Rent increase',
    value: '10% / year',
    subLine: 'Above the typical 5% in Bengaluru',
    tone: 'warn',
    chipLabel: 'Watch',
  },
];

export function AtAGlance() {
  return (
    <div className="min-h-screen bg-paper">
      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] px-6 py-12 md:px-12 md:py-16"
      >
        <header className="mb-8 flex flex-col gap-2">
          <h1 className="text-4xl font-semibold leading-tight text-ink md:text-5xl">
            Your lease at a glance
          </h1>
          <p className="text-base text-muted">
            Sample lease · 1BHK, Indiranagar, Bengaluru · 11 months
          </p>
        </header>

        <section
          aria-label="Lease facts"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {cards.map((card, index) => (
            <FactCardCell key={card.id} card={card} index={index} />
          ))}
        </section>

        <Banner />

        <p className="mt-8 text-center text-xs text-muted">
          Sample lease. Figures are illustrative.
        </p>
      </main>
    </div>
  );
}

function FactCardCell({ card, index }: { card: FactCardData; index: number }) {
  const isClickable = Boolean(card.href);
  // Cards 3 and 4 (0-indexed 2 and 3) get a 4px danger left border
  const hasDangerBorder = index === 2 || index === 3;

  const baseClass = cn(
    'flex flex-col gap-4 rounded-lg border bg-surface p-6',
    'transition-colors duration-150',
    hasDangerBorder
      ? 'border-border border-l-[4px] border-l-danger'
      : 'border-border',
    isClickable &&
      'cursor-pointer hover:border-primary hover:border-l-danger focus-visible:border-primary',
  );

  const inner = (
    <>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
        {card.label}
      </span>
      <span className="text-[28px] font-semibold leading-none text-ink">
        {card.value}
      </span>
      <span className="text-sm text-muted">{card.subLine}</span>
      <Chip tone={card.tone} className="mt-2 w-fit">
        {card.chipLabel}
      </Chip>
    </>
  );

  if (isClickable && card.href) {
    return (
      <Link to={card.href} className={baseClass} aria-label={`${card.label}: ${card.value}. ${card.subLine}. Read the clause.`}>
        {inner}
      </Link>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}

function Banner() {
  return (
    <section
      role="note"
      className="mt-8 flex flex-col gap-4 rounded-lg border border-danger bg-chip-danger p-6 md:flex-row md:items-center md:justify-between"
    >
      <p className="text-sm leading-relaxed text-ink md:text-[15px]">
        <span aria-hidden className="font-semibold">⚠</span> 2 clauses can cost
        you real money, and 3 more are worth negotiating. Here's what to raise.
      </p>
      <Link to="/clause" className="shrink-0">
        <Button variant="primary" className="w-full md:w-auto">
          Read clause by clause
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </section>
  );
}
