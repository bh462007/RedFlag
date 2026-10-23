import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SkipLink } from '@/components/SkipLink';
import { ReadingOptionsProvider } from '@/components/ReadingOptionsContext';
import { AnalysisProvider } from '@/context/AnalysisContext';
import { ClauseView } from '@/screens/ClauseView';
import { AtAGlance } from '@/screens/AtAGlance';
import { Landing } from '@/screens/Landing';
import { Processing } from '@/screens/Processing';
import { ActionPlan } from '@/screens/ActionPlan';

function Placeholder({ name }: { name: string }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-2 px-6 py-16 text-center"
    >
      <h1 className="text-2xl font-semibold text-ink">{name}</h1>
      <p className="text-sm text-muted">This screen is not built yet.</p>
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
            <Route path="*" element={<Placeholder name="Landing" />} />
          </Routes>
        </AnalysisProvider>
      </ReadingOptionsProvider>
    </BrowserRouter>
  );
}
