import { useCallback, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReadingOptions } from '@/components/ReadingOptionsContext';

export interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className, label = 'Copy' }: CopyButtonProps) {
  const { t } = useReadingOptions();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
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
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-lg px-3',
        'text-xs font-medium leading-none',
        'border border-border bg-surface text-muted',
        'transition-colors hover:text-ink hover:bg-paper',
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden />
          <span>{t('copied')}</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          <span>{label === 'Copy' ? t('copy') : label}</span>
        </>
      )}
    </button>
  );
}
