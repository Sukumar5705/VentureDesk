import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CheckCircle2, Clock } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import * as adminApi from '../../api/admin';
import type { Opportunity } from '../../api/opportunities';
import { formatINR, formatDate } from '../../utils/format';
import { STAGE_LABELS } from '../../api/opportunities';
import styles from '../Dashboard.module.css';

export function AdminDashboardPage() {
  const [pendingOpps, setPendingOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi.adminListOpportunities('pending_review', 1, 5)
      .then(res => setPendingOpps(res.data))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>Review startup activity across VentureDesk.</p>
      </header>

      {/* Metric cards */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Review Queue</h2>
        {loading ? (
          <div className={styles.metricsGrid}>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPending} />
        ) : (
          <div className={styles.metricsGrid}>
            <MetricCard
              label="Pending Review"
              value={pendingOpps.length}
              icon={<Clock size={16} />}
              color="var(--status-pending)"
            />
            <MetricCard
              label="In Queue"
              value={pendingOpps.length}
              icon={<ClipboardCheck size={16} />}
              sub="Needs your attention"
            />
          </div>
        )}
      </section>

      {/* Quick action */}
      <div className={styles.actionRow}>
        <Link to="/admin/reviews">
          <Button>
            <ClipboardCheck size={15} /> Go to Review Queue
          </Button>
        </Link>
      </div>

      {/* Recent pending submissions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Submissions Awaiting Review</h2>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchPending} />
        ) : pendingOpps.length === 0 ? (
          <EmptyState
            title="No pending submissions"
            description="All submissions have been reviewed. Check back later."
            icon={<CheckCircle2 size={40} />}
          />
        ) : (
          <div className={styles.listCard}>
            {pendingOpps.map(opp => (
              <Link key={opp.id} to={`/admin/reviews/${opp.id}`} style={{ textDecoration: 'none' }}>
                <div className={styles.listRow} style={{ cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.listTitle}>{opp.title}</div>
                    <div className={styles.listMeta} style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {opp.startupSnapshot?.name && <span>{opp.startupSnapshot.name}</span>}
                      {opp.stage && <span>· {STAGE_LABELS[opp.stage] ?? opp.stage}</span>}
                      {opp.fundingRequired && <span>· {formatINR(opp.fundingRequired)}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={opp.status} />
                    <span className={styles.listMeta}>{formatDate(opp.submittedAt ?? opp.createdAt)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!loading && !error && pendingOpps.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Link to="/admin/reviews">
              <Button variant="secondary" size="sm">View all submissions</Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
