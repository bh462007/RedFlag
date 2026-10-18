import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FactCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
  children?: ReactNode;
}

export function FactCard({
  label,
  value,
  hint,
  className,
  children,
}: FactCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-6',
        'flex flex-col gap-2',
        className,
      )}
    >
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-lg font-semibold text-ink">{value}</dd>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      {children}
    </div>
  );
}
