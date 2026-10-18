import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ClauseSectionProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function ClauseSection({ label, children, className }: ClauseSectionProps) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </h4>
      <div className="text-base text-ink">{children}</div>
    </section>
  );
}
