import { useReadingOptions } from '@/components/ReadingOptionsContext';

export function SkipLink() {
  const { t } = useReadingOptions();

  return (
    <a href="#main" className="skip-link">
      {t('skipToMain')}
    </a>
  );
}
