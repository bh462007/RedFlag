import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClauseTone } from '@/data';

export interface ChipProps {
  tone: ClauseTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

const toneConfig: Record<
  ClauseTone,
  { bg: string; text: string; icon: ReactNode; label: string }
> = {
  danger: {
    bg: 'bg-chip-danger',
    text: 'text-danger',
    icon: <AlertOctagon className="h-3.5 w-3.5" aria-hidden />,
    label: 'Risky',
  },
  warn: {
    bg: 'bg-chip-warn',
    text: 'text-warn',
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden />,
    label: 'Watch',
  },
  safe: {
    bg: 'bg-chip-safe',
    text: 'text-safe',
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
    label: 'Fair',
  },
};

export function Chip({ tone, children, className, icon }: ChipProps) {
  const cfg = toneConfig[tone];
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full px-4',
        'text-xs font-semibold leading-none',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      {icon ?? cfg.icon}
      <span>{children ?? cfg.label}</span>
    </span>
  );
}
