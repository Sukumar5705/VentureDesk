import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, roleDashboard } from '../../contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  role?: 'founder' | 'investor' | 'admin';
}

export function RouteGuard({ children, role }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While session is restoring, show full-page spinner
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: [
          'radial-gradient(ellipse at 8% 10%, rgba(188, 231, 174, 0.82), transparent 42%)',
          'radial-gradient(ellipse at 82% 8%, rgba(247, 207, 183, 0.82), transparent 42%)',
          'radial-gradient(ellipse at 62% 90%, rgba(208, 222, 153, 0.68), transparent 38%)',
          '#eee9df',
        ].join(', '),
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(16,20,22,0.12)',
            borderTopColor: 'var(--vd-text)',
            animation: 'spin 0.8s linear infinite',
          }} aria-label="Loading" role="status" />
          <span style={{
            fontSize: 14, color: 'rgba(16,20,22,0.5)',
            fontFamily: 'var(--font-sans)',
          }}>
            Loading VentureDesk...
          </span>
        </div>
      </div>
    );
  }

  // Unauthenticated → /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wrong role → user's own dashboard
  if (role && user.role !== role) {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  return <>{children}</>;
}
