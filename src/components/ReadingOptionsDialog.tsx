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
} from '@/components/ReadingOptionsContext';

const fontSizes: { key: FontSize; labelKey: 'standard' | 'larger' | 'largest'; glyph: string }[] = [
  { key: 'small', labelKey: 'standard', glyph: 'A−' },
  { key: 'medium', labelKey: 'larger', glyph: 'A' },
  { key: 'large', labelKey: 'largest', glyph: 'A+' },
];

export function ReadingOptionsDialog() {
  const {
    fontSize,
    highContrast,
    language,
    setFontSize,
    setHighContrast,
    setLanguage,
    t,
  } = useReadingOptions();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 px-4 text-sm">
          <Settings className="h-4 w-4" />
          {t('readingOptions')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-ink">
            {t('readingOptions')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-2">
          {/* Text size */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">{t('textSize')}</legend>
            <div
              role="radiogroup"
              aria-label={t('textSize')}
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
                    aria-label={t(opt.labelKey)}
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
                {t('highContrast')}
              </span>
              <span className="text-xs text-muted">
                {t('highContrastHelp')}
              </span>
            </div>
            <Switch
              checked={highContrast}
              onCheckedChange={setHighContrast}
              aria-label={t('highContrast')}
            />
          </div>

          {/* Language */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-ink">{t('language')}</legend>
            <div
              role="radiogroup"
              aria-label={t('language')}
              className="flex gap-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={language === 'en'}
                onClick={() => setLanguage('en')}
                className={cn(
                  'inline-flex h-12 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                  'border-primary bg-primary text-white',
                )}
              >
                {t('english')}
              </button>
            </div>
          </fieldset>

          <p className="text-sm text-muted">
            {t('accessibilityHelp')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
