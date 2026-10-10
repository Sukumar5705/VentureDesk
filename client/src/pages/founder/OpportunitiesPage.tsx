import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Edit2, Send, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../contexts/ToastContext';
import * as oppApi from '../../api/opportunities';
import { STAGE_LABELS } from '../../api/opportunities';
import { formatINR, formatDate } from '../../utils/format';
import { ApiRequestError } from '../../api/client';
import styles from '../Dashboard.module.css';

const STAGE_OPTIONS = Object.entries(STAGE_LABELS);

export function FounderOpportunitiesPage() {
  const { showToast } = useToast();
  const [opportunities, setOpportunities] = useState<oppApi.Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true); setError(null);
    oppApi.listMyOpportunities()
      .then(list => setOpportunities(list))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleSubmit(opp: oppApi.Opportunity) {
    const missing = [];
    if (!opp.stage) missing.push('stage');
    if (!opp.fundingRequired) missing.push('fundingRequired');
    if (!opp.description) missing.push('description');
    if (!opp.useOfFunds) missing.push('useOfFunds');
    if (missing.length) {
      showToast('error', `Missing required fields: ${missing.join(', ')}`);
      return;
    }
    setSubmittingId(opp.id);
    try {
      const updated = await oppApi.submitOpportunity(opp.id);
      setOpportunities(prev => prev.map(o => o.id === opp.id ? (updated as oppApi.Opportunity) : o));
      showToast('success', 'Submitted for review!');
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 400 && e.details) showToast('error', `Missing: ${e.details.map(d => d.field).join(', ')}`);
      else showToast('error', e.message ?? 'Failed to submit');
    } finally {
      setSubmittingId(null);
    }
  }

  const isEditable = (status: string) => ['draft', 'changes_requested'].includes(status);
  const isSubmittable = (o: oppApi.Opportunity) => ['draft', 'changes_requested'].includes(o.status) && o.stage && o.fundingRequired && o.description && o.useOfFunds;

  if (loading) return <div className={styles.page}><SkeletonCard lines={4} /><SkeletonCard lines={4} /></div>;
  if (error) return <div className={styles.page}><ErrorState message={error} onRetry={fetch} /></div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Opportunities</h1>
        <p className={styles.subtitle}>Manage your funding opportunities.</p>
      </header>

      <div className={styles.actionRow}>
        <Link to="/founder/opportunities/new">
          <Button size="sm"><PlusCircle size={14} /> New opportunity</Button>
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Create your first funding opportunity to get started."
          action={<Link to="/founder/opportunities/new"><Button size="sm"><PlusCircle size={14} /> Create opportunity</Button></Link>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {opportunities.map(opp => (
            <div key={opp.id} className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vd-text)' }}>{opp.title}</h3>
                    <StatusBadge status={opp.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--vd-text-secondary)' }}>
                    {opp.stage && <span>{STAGE_LABELS[opp.stage] ?? opp.stage}</span>}
                    {opp.fundingRequired && <span>{formatINR(opp.fundingRequired)}</span>}
                    <span>{formatDate(opp.createdAt)}</span>
                  </div>
                  {opp.status === 'changes_requested' && opp.reviewNote && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(251,146,60,0.1)', borderRadius: 8, border: '1px solid rgba(251,146,60,0.3)' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertCircle size={14} color="var(--vd-orange)" style={{ marginTop: 1 }} />
                        <div>
                          <strong style={{ fontSize: 12, color: 'var(--vd-orange)' }}>Reviewer feedback:</strong>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--vd-text-secondary)' }}>{opp.reviewNote}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  {isEditable(opp.status) && (
                    <Link to={`/founder/opportunities/${opp.id}/edit`}>
                      <Button variant="secondary" size="sm"><Edit2 size={13} /> Edit</Button>
                    </Link>
                  )}
                  {isEditable(opp.status) && (
                    <Button
                      size="sm"
                      loading={submittingId === opp.id}
                      disabled={!isSubmittable(opp)}
                      aria-label={!isSubmittable(opp) ? 'Complete all required fields before submitting' : undefined}
                      onClick={() => handleSubmit(opp)}
                    >
                      <Send size={13} /> Submit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create / Edit Opportunity Form ────────────────────────────────────────────

function OpportunityForm({ opp, onSave }: { opp?: oppApi.Opportunity; onSave: (o: oppApi.Opportunity) => void }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState(opp?.title ?? '');
  const [stage, setStage] = useState(opp?.stage ?? '');
  const [funding, setFunding] = useState(opp?.fundingRequired?.toString() ?? '');
  const [description, setDescription] = useState(opp?.description ?? '');
  const [useOfFunds, setUseOfFunds] = useState(opp?.useOfFunds ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (funding && (isNaN(Number(funding)) || Number(funding) < 1)) errs.fundingRequired = 'Enter a positive amount';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    const data: Partial<oppApi.Opportunity> = {
      title: title.trim(),
      ...(stage && { stage }),
      ...(funding && { fundingRequired: Number(funding) }),
      ...(description.trim() && { description: description.trim() }),
      ...(useOfFunds.trim() && { useOfFunds: useOfFunds.trim() }),
    };
    try {
      let result: oppApi.Opportunity;
      if (opp) {
        result = await oppApi.updateOpportunity(opp.id, data);
      } else {
        result = await oppApi.createOpportunity(data);
      }
      showToast('success', opp ? 'Opportunity updated' : 'Opportunity created');
      onSave(result);
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 400 && e.details) {
        const fieldErrors: Record<string, string> = {};
        e.details.forEach(d => { fieldErrors[d.field] = d.message; });
        setErrors(fieldErrors);
      } else if (e.status === 404) {
        showToast('error', 'Create a startup profile first');
        navigate('/founder/startups/new');
      } else showToast('error', e.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} error={errors.title} maxLength={150} required />
      <Select label="Stage (optional)" value={stage} onChange={e => setStage(e.target.value)} error={errors.stage}>
        <option value="">Select stage</option>
        {STAGE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <Input label="Funding required (INR, optional)" type="number" min={1} value={funding} onChange={e => setFunding(e.target.value)} error={errors.fundingRequired} placeholder="e.g. 5000000" />
      <Textarea label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} error={errors.description} maxLength={2000} rows={4} />
      <Textarea label="Use of funds (optional)" value={useOfFunds} onChange={e => setUseOfFunds(e.target.value)} error={errors.useOfFunds} maxLength={2000} rows={3} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" loading={saving}>{saving ? 'Saving…' : opp ? 'Save changes' : 'Create opportunity'}</Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/founder/opportunities')}>Cancel</Button>
      </div>
    </form>
  );
}

export function NewOpportunityPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>New Opportunity</h1></header>
      <div className={styles.card} style={{ maxWidth: 600 }}>
        <OpportunityForm onSave={opp => navigate(`/founder/opportunities/${opp.id}/edit`)} />
      </div>
    </div>
  );
}

export function EditOpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const [opp, setOpp] = useState<oppApi.Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    oppApi.listMyOpportunities()
      .then(list => {
        const found = list.find(o => o.id === id);
        if (!found) setError('Opportunity not found');
        else setOpp(found);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.page}><SkeletonCard lines={5} /></div>;
  if (error) return <div className={styles.page}><ErrorState message={error} /></div>;
  if (!opp) return null;

  if (!['draft', 'changes_requested'].includes(opp.status)) {
    return (
      <div className={styles.page}>
        <header className={styles.header}><h1 className={styles.title}>{opp.title}</h1></header>
        <div className={styles.card}>
          <p style={{ color: 'var(--vd-text-secondary)' }}>This opportunity cannot be edited (status: {opp.status}).</p>
          <Link to="/founder/opportunities" style={{ marginTop: 12, display: 'inline-block' }}><Button variant="secondary">Back to opportunities</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Edit Opportunity</h1></header>
      <div className={styles.card} style={{ maxWidth: 600 }}>
        <OpportunityForm opp={opp} onSave={() => navigate('/founder/opportunities')} />
      </div>
    </div>
  );
}
