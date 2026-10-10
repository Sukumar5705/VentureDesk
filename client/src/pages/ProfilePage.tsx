import { useAuth, roleDashboard } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { UserRound, Mail, Shield, Calendar, LogOut } from 'lucide-react';
import styles from './Dashboard.module.css';

const ROLE_LABELS: Record<string, string> = {
  founder: 'Founder',
  investor: 'Investor',
  admin: 'Administrator',
};

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--vd-text-secondary)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  const createdAt = user.createdAt
    ? new Date(user.createdAt).toISOString().slice(0, 10)
    : '—';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Your account information.</p>
      </header>

      <div style={{ maxWidth: 480 }}>
        {/* Avatar & name */}
        <div className={styles.card} style={{ textAlign: 'center', padding: '32px 24px', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--vd-text)', color: '#fff',
            fontSize: 28, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }} aria-hidden="true">
            {user.fullName[0].toUpperCase()}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{user.fullName}</h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 14px', borderRadius: 'var(--radius-pill)',
            fontSize: 12, fontWeight: 600,
            background: 'rgba(101,217,149,0.12)', color: 'var(--vd-green)',
            border: '1px solid rgba(101,217,149,0.3)',
          }}>
            <Shield size={12} style={{ marginRight: 4 }} aria-hidden="true" />
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>

        {/* Details */}
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--vd-text-secondary)' }}>
            Account Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <UserRound size={16} color="var(--vd-text-secondary)" aria-hidden="true" />
              <div>
                <div style={{ fontSize: 12, color: 'var(--vd-text-secondary)', marginBottom: 1 }}>Full Name</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user.fullName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mail size={16} color="var(--vd-text-secondary)" aria-hidden="true" />
              <div>
                <div style={{ fontSize: 12, color: 'var(--vd-text-secondary)', marginBottom: 1 }}>Email</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={16} color="var(--vd-text-secondary)" aria-hidden="true" />
              <div>
                <div style={{ fontSize: 12, color: 'var(--vd-text-secondary)', marginBottom: 1 }}>Member since</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{createdAt}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => navigate(roleDashboard(user.role))}
          >
            ← Back to Dashboard
          </Button>
          <Button
            variant="danger"
            onClick={handleLogout}
          >
            <LogOut size={15} aria-hidden="true" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
