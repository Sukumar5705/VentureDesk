import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { useToast } from '../../contexts/ToastContext';
import * as startupApi from '../../api/startups';
import { ApiRequestError } from '../../api/client';
import styles from '../Dashboard.module.css';

const INDUSTRY_OPTIONS = startupApi.INDUSTRY_VALUES.map(v => ({ value: v, label: startupApi.INDUSTRY_LABELS[v] ?? v }));

export function StartupProfilePage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchStartup = useCallback(() => {
    setLoading(true);
    startupApi.getMyStartup()
      .then(s => {

        setName(s.name); setDescription(s.description); setIndustry(s.industry);
        setLocation(s.location); setWebsite(s.website ?? '');
      })
      .catch(e => {
        if ((e as ApiRequestError).status === 404) navigate('/founder/startups/new', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => { fetchStartup(); }, [fetchStartup]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (!industry) errs.industry = 'Industry is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await startupApi.updateMyStartup({ name: name.trim(), description: description.trim(), industry, location: location.trim(), ...(website ? { website } : {}) });

      showToast('success', 'Startup profile updated successfully');
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 400 && e.details) {
        const fieldErrors: Record<string, string> = {};
        e.details.forEach(d => { fieldErrors[d.field] = d.message; });
        setErrors(fieldErrors);
      } else showToast('error', e.message ?? 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Startup Profile</h1></header>
      <SkeletonCard lines={5} />
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Startup Profile</h1>
        <p className={styles.subtitle}>Manage your startup information visible to investors.</p>
      </header>

      <div className={styles.card} style={{ maxWidth: 600 }}>
        <form onSubmit={handleSave} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Startup name" value={name} onChange={e => setName(e.target.value)} error={errors.name} maxLength={100} required />
          <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} maxLength={2000} rows={4} required />
          <Select label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} error={errors.industry}>
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} error={errors.location} placeholder="e.g. Bengaluru, India" maxLength={100} required />
          <Input label="Website (optional)" type="url" value={website} onChange={e => setWebsite(e.target.value)} error={errors.website} placeholder="https://yourwebsite.com" maxLength={300} />
          <Button type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function StartupNewPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!description.trim()) errs.description = 'Description is required';
    if (!industry) errs.industry = 'Industry is required';
    if (!location.trim()) errs.location = 'Location is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await startupApi.createStartup({ name: name.trim(), description: description.trim(), industry, location: location.trim(), ...(website ? { website } : {}) } as startupApi.Startup);
      showToast('success', 'Startup profile created!');
      navigate('/founder/startups', { replace: true });
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 409) {
        showToast('warning', 'You already have a startup profile');
        navigate('/founder/startups', { replace: true });
      } else if (e.status === 400 && e.details) {
        const fieldErrors: Record<string, string> = {};
        e.details.forEach(d => { fieldErrors[d.field] = d.message; });
        setErrors(fieldErrors);
      } else showToast('error', e.message ?? 'Failed to create startup');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Create Startup Profile</h1>
        <p className={styles.subtitle}>Tell investors about your company.</p>
      </header>

      <div className={styles.card} style={{ maxWidth: 600 }}>
        <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Startup name" value={name} onChange={e => setName(e.target.value)} error={errors.name} maxLength={100} required />
          <Textarea label="Description" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} maxLength={2000} rows={4} required />
          <Select label="Industry" value={industry} onChange={e => setIndustry(e.target.value)} error={errors.industry}>
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} error={errors.location} placeholder="e.g. Bengaluru, India" maxLength={100} required />
          <Input label="Website (optional)" type="url" value={website} onChange={e => setWebsite(e.target.value)} error={errors.website} placeholder="https://yourwebsite.com" maxLength={300} />
          <Button type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Creating…' : 'Create profile'}
          </Button>
        </form>
      </div>
    </div>
  );
}
