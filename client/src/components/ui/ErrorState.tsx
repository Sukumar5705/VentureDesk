import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 12,
    }}>
      <AlertCircle size={40} color="var(--vd-red)" />
      <p style={{ margin: 0, fontSize: 15, color: 'var(--vd-text-secondary)' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 'var(--radius-pill)',
          background: 'var(--vd-text)', color: '#fff',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
        }}>
          <RefreshCw size={14} aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  );
}
