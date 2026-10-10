import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../contexts/ToastContext';
import * as startupApi from '../../api/startups';
import { updateInquiryStatus } from '../../api/inquiries';
import { formatDate, INQUIRY_TRANSITIONS, INQUIRY_STATUS_LABELS, truncate } from '../../utils/format';
import { ApiRequestError } from '../../api/client';
import styles from '../Dashboard.module.css';

const STATUS_FILTERS = ['', 'new', 'contacted', 'meeting_scheduled', 'due_diligence', 'closed_won', 'closed_lost'];

export function FounderInquiriesPage() {
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState<startupApi.Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetch = useCallback((status?: string) => {
    setLoading(true); setError(null); setNoProfile(false);
    startupApi.getStartupInquiries({ limit: 50, ...(status ? { status } : {}) })
      .then(res => setInquiries(res.data))
      .catch(e => {
        const err = e as ApiRequestError;
        if (err.status === 404) setNoProfile(true);
        else setError(err.message ?? 'Failed to load inquiries');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(filterStatus || undefined); }, [fetch, filterStatus]);

  async function advanceStatus(inqId: string, newStatus: string) {
    setUpdatingId(inqId);
    try {
      await updateInquiryStatus(inqId, newStatus);
      setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, status: newStatus } : i));
      showToast('success', `Status updated to ${INQUIRY_STATUS_LABELS[newStatus] ?? newStatus}`);
    } catch (err) {
      const e = err as ApiRequestError;
      showToast('error', e.message ?? 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  const isTerminal = (status: string) => ['closed_won', 'closed_lost'].includes(status);

  if (loading) return <div className={styles.page}><SkeletonCard lines={4} /><SkeletonCard lines={4} /></div>;

  if (noProfile) return (
    <div className={styles.page}>
      <header className={styles.header}><h1 className={styles.title}>Inquiries</h1></header>
      <EmptyState title="No startup profile" description="Create a startup profile to start receiving inquiries." action={<a href="/founder/startups/new"><Button size="sm">Create profile</Button></a>} />
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Inquiries</h1>
        <p className={styles.subtitle}>Manage investor interest in your opportunities.</p>
      </header>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--vd-border-muted)',
              background: filterStatus === s ? 'var(--vd-text)' : 'var(--vd-card-strong)',
              color: filterStatus === s ? '#fff' : 'var(--vd-text)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {s ? (INQUIRY_STATUS_LABELS[s] ?? s) : 'All'}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => fetch(filterStatus || undefined)} />
      ) : inquiries.length === 0 ? (
        <EmptyState title="No inquiries received yet" description="When investors express interest in your opportunities, inquiries will appear here." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inquiries.map(inq => {
            const expanded = expandedId === inq.id;
            const transitions = INQUIRY_TRANSITIONS[inq.status] ?? [];
            return (
              <div key={inq.id} className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : inq.id)}
                    style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Collapse' : 'Expand'} inquiry from ${inq.investor?.fullName ?? 'investor'}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--vd-text)' }}>{inq.investor?.fullName ?? 'Investor'}</span>
                      <StatusBadge status={inq.status} type="inquiry" />
                      {expanded ? <ChevronUp size={14} color="var(--vd-text-secondary)" /> : <ChevronDown size={14} color="var(--vd-text-secondary)" />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--vd-text-secondary)' }}>
                      {inq.opportunity?.title ?? '—'} · {formatDate(inq.createdAt)}
                    </div>
                    {!expanded && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--vd-text-secondary)' }}>{truncate(inq.message ?? '', 100)}</p>}
                  </button>

                  {!isTerminal(inq.status) && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                      {transitions.filter(t => t !== 'closed_lost').map(t => (
                        <Button key={t} size="sm" loading={updatingId === inq.id}
                          onClick={() => advanceStatus(inq.id, t)}>
                          → {INQUIRY_STATUS_LABELS[t] ?? t}
                        </Button>
                      ))}
                      <Button key="close" size="sm" variant="danger" loading={updatingId === inq.id}
                        onClick={() => advanceStatus(inq.id, 'closed_lost')}>
                        Close lost
                      </Button>
                    </div>
                  )}
                </div>

                {expanded && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--vd-border-muted)' }}>
                    <p style={{ fontSize: 14, color: 'var(--vd-text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>{inq.message}</p>
                    {inq.nextStep && <div style={{ fontSize: 12, color: 'var(--vd-text)', fontWeight: 500 }}>Next step: {inq.nextStep}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
