import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import * as adminApi from '../../api/admin';
import type { Opportunity } from '../../api/opportunities';
import { formatINR, formatDate } from '../../utils/format';
import { STAGE_LABELS } from '../../api/opportunities';
import styles from '../Dashboard.module.css';

const STATUS_FILTERS = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'rejected', label: 'Rejected' },
];

export function AdminReviewsPage() {
  const navigate = useNavigate();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending_review');

  const fetchOpps = useCallback((s: string) => {
    setLoading(true);
    setError(null);
    adminApi.adminListOpportunities(s)
      .then(res => setOpps(res.data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOpps(status); }, [fetchOpps, status]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reviews</h1>
        <p className={styles.subtitle}>Review submitted startup opportunities.</p>
      </header>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--vd-border-muted)',
              background: status === f.value ? 'var(--vd-text)' : 'var(--vd-card-strong)',
              color: status === f.value ? '#fff' : 'var(--vd-text)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 150ms, color 150ms',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchOpps(status)} />
      ) : opps.length === 0 ? (
        <EmptyState
          title={`No ${STATUS_FILTERS.find(f => f.value === status)?.label.toLowerCase() ?? 'items'}`}
          description="No opportunities match this filter right now."
        />
      ) : (
        <div className={styles.listCard}>
          {opps.map(opp => (
            <div
              key={opp.id}
              className={styles.listRow}
              style={{ cursor: 'pointer', flexWrap: 'wrap', gap: 12 }}
              onClick={() => navigate(`/admin/reviews/${opp.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/reviews/${opp.id}`); }}
              aria-label={`Review ${opp.title}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.listTitle}>{opp.title}</div>
                <div className={styles.listMeta} style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {opp.startupSnapshot?.name && <span>{opp.startupSnapshot.name}</span>}
                  {opp.stage && <span>· {STAGE_LABELS[opp.stage] ?? opp.stage}</span>}
                  {opp.fundingRequired && <span>· {formatINR(opp.fundingRequired)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <StatusBadge status={opp.status} />
                <span className={styles.listMeta}>
                  {formatDate(opp.submittedAt ?? opp.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
