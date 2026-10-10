import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth, roleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { ApiRequestError } from '../../api/client';
import styles from './AuthPage.module.css';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={from || roleDashboard(user.role)} replace />;
  }

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 401) {
        setErrors({ form: 'Invalid email or password' });
      } else if (e.status === 400) {
        setErrors({ form: 'Please check your input and try again' });
      } else if (e.message === 'Network error, please check your connection') {
        showToast('error', 'Network error, please check your connection');
      } else {
        showToast('error', 'Login succeeded but session could not be loaded. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <Logo variant="light" size="lg" />
        </div>
        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your account</p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {errors.form && (
            <div className={styles.formError} role="alert" aria-live="assertive">
              {errors.form}
            </div>
          )}
          <Input
            label="Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)} error={errors.email}
            autoComplete="email" required
          />
          <Input
            label="Password" type="password" value={password}
            onChange={e => setPassword(e.target.value)} error={errors.password}
            autoComplete="current-password" required
          />
          <Button
            type="submit"
            loading={submitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className={styles.footer}>
          Don't have an account? <Link to="/register" className={styles.link}>Create one</Link>
        </p>
        <Link to="/" className={styles.homeLink}>← Back to home</Link>
      </div>
    </div>
  );
}
