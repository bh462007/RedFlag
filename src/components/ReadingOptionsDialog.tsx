import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/Button';
import { cn } from '@/lib/utils';
import {
  useReadingOptions,
  type FontSize,
  type Language,
} from '@/components/ReadingOptionsContext';

const fontSizes: { key: FontSize; label: string; glyph: string }[] = [
  { key: 'small', label: 'Standard', glyph: 'A−' },
  { key: 'medium', label: 'Larger', glyph: 'A' },
  { key: 'large', label: 'Largest', glyph: 'A+' },
];

const languages: { key: Language; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'hi', label: 'हिंदी' },
];

export function ReadingOptionsDialog() {
  const {
    fontSize,
    highContrast,
    language,
    setFontSize,
    setHighContrast,
    setLanguage,
  } = useReadingOptions();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 px-4 text-sm">
          <Settings className="h-4 w-4" />
          Reading options
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">
            Reading options
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* Text size */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">Text size</legend>
            <div
              role="radiogroup"
              aria-label="Text size"
              className="flex gap-2"
            >
              {fontSizes.map((opt) => {
                const active = fontSize === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    onClick={() => setFontSize(opt.key)}
                    className={cn(
                      'inline-flex h-12 flex-1 items-center justify-center rounded-lg border text-base font-semibold transition-colors',
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-ink hover:bg-paper',
                    )}
                  >
                    {opt.glyph}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* High contrast */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">
                High contrast
              </span>
              <span className="text-xs text-muted">
                Stronger borders and darker text for easier reading
              </span>
            </div>
            <Switch
              checked={highContrast}
              onCheckedChange={setHighContrast}
              aria-label="High contrast"
            />
          </div>

          {/* Language */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">Language</legend>
            <div
              role="radiogroup"
              aria-label="Language"
              className="flex gap-2"
            >
              {languages.map((opt) => {
                const active = language === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setLanguage(opt.key)}
                    className={cn(
                      'inline-flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                      opt.key === 'hi' && 'font-devanagari',
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-surface text-ink hover:bg-paper',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <p className="text-sm text-muted">
            Every screen works with a keyboard and a screen reader.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
