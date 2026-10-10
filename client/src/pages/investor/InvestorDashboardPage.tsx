import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, MessagesSquare, TrendingDown, TrendingUp } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as inquiryApi from '../../api/inquiries';
import { formatINR, formatDate, INQUIRY_STATUS_LABELS, INQUIRY_STATUS_COLORS } from '../../utils/format';
import { ApiRequestError } from '../../api/client';
import { STAGE_LABELS } from '../../api/opportunities';
import { INDUSTRY_LABELS } from '../../api/startups';
import styles from '../Dashboard.module.css';

const PIPELINE_STATUSES = ['new', 'contacted', 'meeting_scheduled', 'due_diligence', 'closed_won', 'closed_lost'];

export function InvestorDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [inquiries, setInquiries] = useState<inquiryApi.InvestorInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchInquiries = useCallback(() => {
    setLoading(true);
    setError(null);
    inquiryApi.listMyInquiries({ limit: 50 })
      .then(res => setInquiries(res.data ?? []))
      .catch(e => setError((e as Error).message ?? 'Failed to load inquiries'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  async function handleWithdraw(inqId: string) {
    setWithdrawingId(inqId);
    try {
      await inquiryApi.updateInquiryStatus(inqId, 'closed_lost');
      setInquiries(prev => prev.map(i => i.id === inqId ? { ...i, status: 'closed_lost' } : i));
      showToast('success', 'Inquiry withdrawn');
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 409) showToast('error', e.message ?? 'Cannot withdraw this inquiry');
      else showToast('error', 'Failed to withdraw inquiry');
    } finally {
      setWithdrawingId(null);
    }
  }

  const isWithdrawable = (status: string) =>
    ['new', 'contacted', 'meeting_scheduled', 'due_diligence'].includes(status);

  // Status counts for pipeline breakdown
  const statusCounts = inquiries.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  const activeCount = inquiries.filter(i => !['closed_won', 'closed_lost'].includes(i.status)).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Hello, {user?.fullName}. Track your investment pipeline.</p>
      </header>

      {/* Metric cards */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pipeline Overview</h2>
        {loading ? (
          <div className={styles.metricsGrid}>
            {[1, 2].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchInquiries} />
        ) : (
          <div className={styles.metricsGrid}>
            <MetricCard
              label="Total Inquiries"
              value={inquiries.length}
              icon={<MessagesSquare size={16} />}
            />
            <MetricCard
              label="Active"
              value={activeCount}
              icon={<TrendingUp size={16} />}
              color="var(--vd-green)"
            />
            <MetricCard
              label="Closed Won"
              value={statusCounts['closed_won'] ?? 0}
              color="var(--vd-green)"
            />
            <MetricCard
              label="Closed Lost"
              value={statusCounts['closed_lost'] ?? 0}
              color="var(--vd-red)"
              icon={<TrendingDown size={16} />}
            />
          </div>
        )}
      </section>

      {/* Pipeline status breakdown */}
      {!loading && !error && inquiries.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Status Breakdown</h2>
          <div className={styles.card} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PIPELINE_STATUSES.map(s => {
                const count = statusCounts[s] ?? 0;
                const color = INQUIRY_STATUS_COLORS[s] ?? 'var(--inquiry-new)';
                return (
                  <div key={s} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 16px', borderRadius: 12,
                    background: `${color}18`,
                    border: `1px solid ${color}33`,
                    minWidth: 80,
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: color === 'var(--inquiry-new)' ? 'var(--vd-text)' : color }}>
                      {count}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--vd-text-secondary)', marginTop: 2, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {INQUIRY_STATUS_LABELS[s] ?? s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Inquiry pipeline list */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Inquiries</h2>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchInquiries} />
        ) : inquiries.length === 0 ? (
          <EmptyState
            title="No inquiries yet"
            description="Browse startup opportunities and express interest to start building your pipeline."
            action={<Link to="/startups"><Button size="sm"><Compass size={14} /> Explore opportunities</Button></Link>}
          />
        ) : (
          <div className={styles.listCard}>
            {inquiries.map(inq => (
              <div key={inq.id} className={styles.listRow} style={{ flexWrap: 'wrap', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listTitle}>{inq.opportunity?.title ?? '—'}</div>
                  <div className={styles.listMeta} style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    {inq.opportunity?.startup?.name && (
                      <span>{inq.opportunity.startup.name}</span>
                    )}
                    {inq.opportunity?.startup?.industry && (
                      <span>· {INDUSTRY_LABELS[inq.opportunity.startup.industry] ?? inq.opportunity.startup.industry}</span>
                    )}
                    {inq.opportunity?.stage && (
                      <span>· {STAGE_LABELS[inq.opportunity.stage] ?? inq.opportunity.stage}</span>
                    )}
                    {inq.opportunity?.fundingRequired && (
                      <span>· {formatINR(inq.opportunity.fundingRequired)}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                  <StatusBadge status={inq.status} type="inquiry" />
                  <span className={styles.listMeta}>{formatDate(inq.updatedAt)}</span>
                  {isWithdrawable(inq.status) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={withdrawingId === inq.id}
                      onClick={() => handleWithdraw(inq.id)}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
