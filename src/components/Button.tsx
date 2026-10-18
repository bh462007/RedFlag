import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary/90 active:bg-primary/95 shadow-sm',
  secondary:
    'bg-surface text-ink border border-border hover:bg-paper active:bg-paper/80',
  ghost: 'bg-transparent text-primary hover:bg-primary/5 active:bg-primary/10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5',
        'text-sm font-medium leading-none whitespace-nowrap',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
