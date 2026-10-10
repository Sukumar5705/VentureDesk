import { Link } from 'react-router-dom';
import { useAuth, roleDashboard } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div style={{
      minHeight: '100vh',
      background: [
        'radial-gradient(ellipse at 8% 10%, rgba(188, 231, 174, 0.82), transparent 42%)',
        'radial-gradient(ellipse at 82% 8%, rgba(247, 207, 183, 0.82), transparent 42%)',
        'radial-gradient(ellipse at 62% 90%, rgba(208, 222, 153, 0.68), transparent 38%)',
        '#eee9df',
      ].join(', '),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      padding: 24,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '48px 40px',
        maxWidth: 440,
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-floating)',
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          color: 'var(--vd-text)',
          lineHeight: 1,
          marginBottom: 8,
          letterSpacing: -2,
        }}>
          404
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px', color: 'var(--vd-text)' }}>
          Page not found
        </h1>
        <p style={{ fontSize: 14, color: 'var(--vd-text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/">
            <Button>
              <Home size={15} aria-hidden="true" /> Back to home
            </Button>
          </Link>
          {user && (
            <Link to={roleDashboard(user.role)}>
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
