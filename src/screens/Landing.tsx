import { Link } from 'react-router-dom';
import { ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { clauses } from '@/data';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import { cn } from '@/lib/utils';

export function Landing() {
  const deposit = clauses[0];
  const risky = deposit.variants.find((v) => v.tone === 'danger')!;
  const { language } = useReadingOptions();
  const isHindi = language === 'hi';
  const h1 = isHindi
    ? 'आपका किरायानामा, आपकी भाषा में।'
    : 'Your lease, in language you actually speak.';

  return (
    <div className="min-h-screen bg-paper">
      <main
        id="main"
        className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:gap-16"
      >
        {/* Left column 55% */}
        <div className="flex w-full flex-col items-start gap-6 lg:w-[55%]">
          <h1 className={cn('text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl lg:text-[56px]', isHindi && 'font-devanagari')}>
            {h1}
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-muted">
            Paste your rental agreement. Get every clause explained in plain
            English: what it means, what it could cost you, and what to ask the
            landlord to change.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:w-auto">
            <Link to="/processing" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto">
                Check my lease
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/processing" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                <Eye className="h-4 w-4" />
                See a sample lease
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted">
            Your document is never stored. Works on a phone. Not legal advice.
          </p>
        </div>

        {/* Right column 45% */}
        <div className="w-full lg:w-[45%]">
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[380px] rounded-lg border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(18,22,31,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {deposit.number}
                </span>
                <Chip tone="danger">{risky.label}</Chip>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-ink">
                {deposit.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-ink">
                You pay ₹1,68,000 upfront. You get it back whenever the
                landlord decides, minus whatever the landlord says the damages
                are.
              </p>
              <div className="rounded-lg bg-highlight p-2">
                <p className="text-xs leading-relaxed text-ink">
                  &ldquo;The deposit shall be refunded at the landlord&rsquo;s
                  discretion upon vacating&hellip;&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
