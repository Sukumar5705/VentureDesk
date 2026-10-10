import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, roleDashboard } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { ApiRequestError } from '../../api/client';
import styles from './AuthPage.module.css';

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'' | 'founder' | 'investor'>('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; password?: string; role?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  function validate() {
    const e: typeof errors = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    else if (fullName.trim().length > 100) e.fullName = 'Name must be 100 characters or fewer';
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (password.length > 128) e.password = 'Password must be 128 characters or fewer';
    if (!role) e.role = 'Please select a role';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await register(fullName.trim(), email, password, role as 'founder' | 'investor');
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 409) {
        setErrors({ email: 'Email is already registered' });
      } else if (e.status === 400 && e.details) {
        const fieldErrors: typeof errors = {};
        e.details.forEach(d => { (fieldErrors as Record<string, string>)[d.field] = d.message; });
        setErrors(fieldErrors);
      } else {
        showToast('error', e.message ?? 'Registration failed, please try again');
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
        <h1 className={styles.heading}>Create account</h1>
        <p className={styles.sub}>Join VentureDesk today</p>

        <form onSubmit={handleSubmit} noValidate className={styles.form}>
          {errors.form && (
            <div className={styles.formError} role="alert" aria-live="assertive">
              {errors.form}
            </div>
          )}
          <Input
            label="Full name" value={fullName}
            onChange={e => setFullName(e.target.value)}
            error={errors.fullName} maxLength={100} autoComplete="name" required
          />
          <Input
            label="Email" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            error={errors.email} autoComplete="email" required
          />
          <Input
            label="Password" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            error={errors.password} autoComplete="new-password"
            hint="Minimum 8 characters" required
          />
          <Select
            label="I am a…" value={role}
            onChange={e => setRole(e.target.value as typeof role)}
            error={errors.role}
          >
            <option value="">Select your role</option>
            <option value="founder">Founder</option>
            <option value="investor">Investor</option>
          </Select>
          <Button
            type="submit" loading={submitting}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
        <Link to="/" className={styles.homeLink}>← Back to home</Link>
      </div>
    </div>
  );
}
