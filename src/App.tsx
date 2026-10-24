import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SkipLink } from '@/components/SkipLink';
import { ReadingOptionsProvider } from '@/components/ReadingOptionsContext';
import { AnalysisProvider } from '@/context/AnalysisContext';
import { ClauseView } from '@/screens/ClauseView';
import { AtAGlance } from '@/screens/AtAGlance';
import { Landing } from '@/screens/Landing';
import { Processing } from '@/screens/Processing';
import { ActionPlan } from '@/screens/ActionPlan';
import { useReadingOptions } from '@/components/ReadingOptionsContext';
import { Button } from '@/components/Button';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const { t } = useReadingOptions();
  const navigate = useNavigate();

  return (
    <main
      id="main"
      className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-3 px-6 py-16 text-center"
    >
      <h1 className="font-display text-4xl text-ink">
        404 — {t('notFound')}
      </h1>
      <p className="max-w-[420px] text-sm text-muted">
        {t('notFoundDescription')}
      </p>
      <Button
        variant="primary"
        className="mt-3"
        onClick={() => navigate('/')}
      >
        {t('backToStart')}
      </Button>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ReadingOptionsProvider>
        <AnalysisProvider>
          <SkipLink />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/glance" element={<AtAGlance />} />
            <Route path="/clause" element={<ClauseView />} />
            <Route path="/plan" element={<ActionPlan />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnalysisProvider>
      </ReadingOptionsProvider>
    </BrowserRouter>
  );
}
