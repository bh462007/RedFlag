import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { useAnalysis } from '@/context/AnalysisContext';
import { useReadingOptions } from '@/components/ReadingOptionsContext';

export function AnalysisError({ message }: { message: string }) {
  const { reset } = useAnalysis();
  const { t } = useReadingOptions();
  const navigate = useNavigate();

  const handleTryAgain = () => {
    reset();
    navigate('/');
  };

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-paper px-6"
    >
      <div className="w-full max-w-[520px] rounded-lg border border-border bg-surface p-8">
        <h1 className="font-display text-4xl text-ink">{t('analysisUnavailable')}</h1>
        <p className="mt-3 text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleTryAgain}>
            {t('tryAgain')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            {t('newCheck')}
          </Button>
        </div>
      </div>
    </main>
  );
}
