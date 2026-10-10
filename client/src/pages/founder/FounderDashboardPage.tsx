import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, MessagesSquare, Building2, PlusCircle } from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import * as startupApi from '../../api/startups';
import * as oppApi from '../../api/opportunities';
import { formatDate } from '../../utils/format';
import styles from '../Dashboard.module.css';

export function FounderDashboardPage() {
  const { user } = useAuth();
  const [startup, setStartup] = useState<startupApi.Startup | null | 'not-found'>(null);
  const [opportunities, setOpportunities] = useState<oppApi.Opportunity[]>([]);
  const [inquiries, setInquiries] = useState<startupApi.Inquiry[]>([]);
  const [loadingStartup, setLoadingStartup] = useState(true);
  const [loadingOpps, setLoadingOpps] = useState(true);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [errorOpps, setErrorOpps] = useState<string | null>(null);
  const [errorInquiries, setErrorInquiries] = useState<string | null>(null);

  const fetchStartup = useCallback(() => {
    setLoadingStartup(true);
    startupApi.getMyStartup()
      .then(s => setStartup(s))
      .catch(e => { if ((e as { status?: number }).status === 404) setStartup('not-found'); else setStartup('not-found'); })
      .finally(() => setLoadingStartup(false));
  }, []);

  const fetchOpps = useCallback(() => {
    setLoadingOpps(true); setErrorOpps(null);
    oppApi.listMyOpportunities()
      .then(list => setOpportunities(list))
      .catch(e => setErrorOpps((e as Error).message))
      .finally(() => setLoadingOpps(false));
  }, []);

  const fetchInquiries = useCallback(() => {
    setLoadingInquiries(true); setErrorInquiries(null);
    startupApi.getStartupInquiries({ limit: 5 })
      .then(res => setInquiries(res.data))
      .catch(e => setErrorInquiries((e as Error).message))
      .finally(() => setLoadingInquiries(false));
  }, []);

  useEffect(() => {
    fetchStartup();
    fetchOpps();
    fetchInquiries();
  }, [fetchStartup, fetchOpps, fetchInquiries]);

  // Count opportunities by status
  const oppStatusCounts = opportunities.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const inquiryStatusCounts = inquiries.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Overview</h1>
        <p className={styles.subtitle}>Hello, {user?.fullName}. Here is your startup overview.</p>
      </header>

      {/* Startup profile prompt */}
      {!loadingStartup && startup === 'not-found' && (
        <div className={styles.promptCard} style={{ marginBottom: 24 }}>
          <Building2 size={28} color="#171717" strokeWidth={1.8} style={{ marginBottom: 8 }} />
          <p>You haven't created a startup profile yet. Create one to start submitting opportunities.</p>
          <Link to="/founder/startups/new" style={{ textDecoration: 'none' }}>
            <Button>
              <PlusCircle size={15} /> Create startup profile
            </Button>
          </Link>
        </div>
      )}

      {/* Opportunity metrics */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Opportunities</h2>
        {loadingOpps ? (
          <div className={styles.metricsGrid}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : errorOpps ? (
          <ErrorState message={errorOpps} onRetry={fetchOpps} />
        ) : (
          <>
            <div className={styles.metricsGrid}>
              <MetricCard label="Total" value={opportunities.length} icon={<TrendingUp size={16} />} />
              <MetricCard label="Pending Review" value={oppStatusCounts['pending_review'] ?? 0} color="var(--status-pending)" />
              <MetricCard label="Approved" value={oppStatusCounts['approved'] ?? 0} color="var(--status-approved)" />
              <MetricCard label="Changes Requested" value={oppStatusCounts['changes_requested'] ?? 0} color="var(--status-changes)" />
            </div>
            <div className={styles.actionRow}>
              <Link to="/founder/opportunities"><Button variant="secondary" size="sm">View all opportunities</Button></Link>
              <Link to="/founder/opportunities/new"><Button size="sm"><PlusCircle size={14} /> New opportunity</Button></Link>
            </div>
          </>
        )}
      </section>

      {/* Inquiry metrics */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inquiries</h2>
        {loadingInquiries ? (
          <div className={styles.metricsGrid}>
            {[1,2,3,4].map(i => <SkeletonCard key={i} lines={2} />)}
          </div>
        ) : errorInquiries ? (
          <ErrorState message={errorInquiries} onRetry={fetchInquiries} />
        ) : (
          <div className={styles.metricsGrid}>
            <MetricCard label="Total Inquiries" value={inquiries.length} icon={<MessagesSquare size={16} />} />
            <MetricCard label="New" value={inquiryStatusCounts['new'] ?? 0} color="var(--inquiry-new)" />
            <MetricCard label="In Progress" value={(inquiryStatusCounts['contacted'] ?? 0) + (inquiryStatusCounts['meeting_scheduled'] ?? 0) + (inquiryStatusCounts['due_diligence'] ?? 0)} color="var(--inquiry-meeting)" />
            <MetricCard label="Closed Won" value={inquiryStatusCounts['closed_won'] ?? 0} color="var(--inquiry-won)" />
          </div>
        )}
      </section>

      {/* Recent inquiries */}
      {!loadingInquiries && !errorInquiries && inquiries.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recent inquiries</h2>
          <div className={styles.listCard}>
            {inquiries.slice(0, 5).map(inq => (
              <div key={inq.id} className={styles.listRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.listTitle}>{inq.investor?.fullName ?? 'Investor'}</div>
                  <div className={styles.listMeta}>{inq.opportunity?.title ?? '—'}</div>
                </div>
                <StatusBadge status={inq.status} type="inquiry" />
                <span className={styles.listMeta}>{formatDate(inq.createdAt)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Link to="/founder/inquiries"><Button variant="secondary" size="sm">View all inquiries</Button></Link>
          </div>
        </section>
      )}

      {!loadingInquiries && !errorInquiries && inquiries.length === 0 && (
        <section className={styles.section}>
          <EmptyState title="No inquiries yet" description="Inquiries from investors will appear here once your opportunities are approved." />
        </section>
      )}
    </div>
  );
}
