import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';

export function AnalysisError({ message }: { message: string }) {
  const navigate = useNavigate();

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-paper px-6"
    >
      <div className="w-full max-w-[520px] rounded-lg border border-border bg-surface p-8">
        <h1 className="font-display text-4xl text-ink">Analysis unavailable</h1>
        <p className="mt-3 text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate('/processing')}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            New check
          </Button>
        </div>
      </div>
    </main>
  );
}
