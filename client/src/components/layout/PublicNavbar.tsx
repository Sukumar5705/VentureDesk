import { Link, useNavigate } from 'react-router-dom';
import { useAuth, roleDashboard } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import styles from './PublicNavbar.module.css';

export function PublicNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={styles.navbar}>
      <Link to="/" className={styles.brand} aria-label="VentureDesk home">
        <Logo variant="light" size="md" />
      </Link>

      <nav className={styles.nav} aria-label="Public navigation">
        <Link to="/startups" className={styles.navLink}>Explore</Link>
        {user ? (
          <Button size="sm" onClick={() => navigate(roleDashboard(user.role))}>
            Dashboard
          </Button>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>Sign in</Link>
            <Button size="sm" onClick={() => navigate('/register')}>Get started</Button>
          </>
        )}
      </nav>
    </header>
  );
}
