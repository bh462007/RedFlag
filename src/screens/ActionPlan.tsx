import { useMemo, useState, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { cn } from '@/lib/utils';
import { actionItems } from '@/data';

export function ActionPlan() {
  const [raised, setRaised] = useState<Set<string>>(new Set());
  const [shareCopied, setShareCopied] = useState(false);

  const shareText = useMemo(
    () =>
      actionItems
        .map((item, i) => `${i + 1}. ${item.title}\n   ${item.request}`)
        .join('\n\n'),
    [],
  );

  const toggleRaised = (id: string) =>
    setRaised((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
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
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const onPrint = () => window.print();

  return (
    <div className="min-h-screen bg-paper">
      <main
        id="main"
        className="mx-auto w-full max-w-[800px] px-6 py-12 md:py-16"
      >
        <header className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold leading-tight text-ink md:text-4xl">
            Before you sign, raise these 6 things
          </h1>
        </header>

        <ol className="flex flex-col gap-4">
          {actionItems.map((item, index) => {
            const isRaised = raised.has(item.id);
            return (
              <ActionRow
                key={item.id}
                number={index + 1}
                title={item.title}
                detail={item.detail}
                request={item.request}
                isRaised={isRaised}
                onToggle={() => toggleRaised(item.id)}
              />
            );
          })}
        </ol>

        <p className="mt-8 text-sm text-muted">
          Send this list to someone you trust before you sign.
        </p>

        <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={onShare} className="w-full sm:w-auto">
            {shareCopied ? 'Copied ✓' : 'Share'}
          </Button>
          <Button variant="secondary" onClick={onPrint} className="w-full sm:w-auto">
            Print
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Sample lease. Figures are illustrative.
        </p>
      </main>
    </div>
  );
}

function ActionRow({
  number,
  title,
  detail,
  request,
  isRaised,
  onToggle,
}: {
  number: number;
  title: string;
  detail: string;
  request: string;
  isRaised: boolean;
  onToggle: () => void;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <li
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 transition-opacity duration-200 sm:flex-row sm:items-start sm:gap-4',
        isRaised && 'opacity-60',
      )}
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
            aria-hidden
          >
            {number}
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold leading-snug text-ink">
                {isRaised ? `✓ ${title}` : title}
              </h2>
              {isRaised && (
                <Chip tone="safe" className="h-8 px-4 text-xs">
                  Raised
                </Chip>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted">{detail}</p>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:mt-1">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isRaised}
          className="no-print inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted transition-colors hover:text-ink hover:bg-paper"
        >
          <span
            className={cn(
              'inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border',
              isRaised
                ? 'border-safe bg-safe text-white'
                : 'border-muted bg-surface',
            )}
            aria-hidden
          >
            {isRaised && <Check className="h-3 w-3" />}
          </span>
          Mark as raised
        </button>

        <CopyRequestButton request={request} />
      </div>
    </li>
  );
}

function CopyRequestButton({ request }: { request: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(request);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = request;
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg px-3',
        'text-xs font-medium leading-none',
        'border border-primary bg-surface text-primary',
        'transition-colors hover:bg-primary/5',
      )}
    >
      {copied ? 'Copied ✓' : 'Copy request'}
    </button>
  );
}
