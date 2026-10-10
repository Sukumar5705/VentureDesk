import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowRight, RefreshCw, X } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import * as oppApi from '../../api/opportunities';
import { formatINR, formatDate } from '../../utils/format';
import { INDUSTRY_LABELS } from '../../api/startups';
import { STAGE_LABELS } from '../../api/opportunities';
import styles from './DiscoveryPage.module.css';

export function DiscoveryPage() {
  const [opportunities, setOpportunities] = useState<oppApi.PublicOpportunity[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [sortBy, setSortBy] = useState('publishedAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOpportunities = useCallback(async (params: oppApi.PublicListParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await oppApi.listPublicOpportunities(params);
      setOpportunities(res.data);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchOpportunities({ search, industry, stage, sortBy, order, page, limit: 12 });
    }, search ? 400 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, industry, stage, sortBy, order, page, fetchOpportunities]);

  function clearFilters() {
    setSearch(''); setIndustry(''); setStage('');
    setSortBy('publishedAt'); setOrder('desc'); setPage(1);
  }

  const hasFilters = search || industry || stage;

  return (
    <div className={styles.page}>
      <PublicNavbar />
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Explore Startups</h1>
            <p className={styles.subtitle}>Discover companies building across industries</p>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search opportunities..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              maxLength={100}
              aria-label="Search opportunities"
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <select
              value={industry}
              onChange={e => { setIndustry(e.target.value); setPage(1); }}
              className={styles.filterSelect}
              aria-label="Filter by industry"
            >
              <option value="">All Industries</option>
              {Object.entries(INDUSTRY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <select
              value={stage}
              onChange={e => { setStage(e.target.value); setPage(1); }}
              className={styles.filterSelect}
              aria-label="Filter by stage"
            >
              <option value="">All Stages</option>
              {Object.entries(STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <select
              value={`${sortBy}:${order}`}
              onChange={e => { const [s, o] = e.target.value.split(':'); setSortBy(s); setOrder(o); setPage(1); }}
              className={styles.filterSelect}
              aria-label="Sort by"
            >
              <option value="publishedAt:desc">Newest first</option>
              <option value="publishedAt:asc">Oldest first</option>
              <option value="fundingRequired:asc">Funding: low to high</option>
              <option value="fundingRequired:desc">Funding: high to low</option>
              <option value="title:asc">Name: A–Z</option>
            </select>

            {hasFilters && (
              <button className={styles.clearBtn} onClick={clearFilters} aria-label="Clear all filters">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.cardSkeleton}>
                <Skeleton height={120} borderRadius="12px" style={{ marginBottom: 16 }} />
                <Skeleton height={14} width="70%" style={{ marginBottom: 8 }} />
                <Skeleton height={12} width="50%" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchOpportunities({ search, industry, stage, sortBy, order, page, limit: 12 })} />
        ) : opportunities.length === 0 ? (
          <EmptyState
            title="No opportunities found"
            description={hasFilters ? "Try adjusting your filters to find more results." : "No approved opportunities are available yet."}
            action={hasFilters ? <Button variant="secondary" size="sm" onClick={clearFilters}><RefreshCw size={14} /> Clear filters</Button> : undefined}
          />
        ) : (
          <>
            <p className={styles.resultCount} aria-live="polite">
              {pagination.total} {pagination.total === 1 ? 'result' : 'results'}
            </p>
            <div className={styles.grid}>
              {opportunities.map(opp => (
                <Link key={opp.id} to={`/startups/${opp.id}`} className={styles.card} aria-label={`View ${opp.title}`}>
                  <div className={styles.cardHeader}>
                    <span className={styles.industryBadge}>{INDUSTRY_LABELS[opp.startup?.industry] ?? opp.startup?.industry}</span>
                    <span className={styles.stageBadge}>{STAGE_LABELS[opp.stage] ?? opp.stage}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{opp.title}</h3>
                  <p className={styles.startupName}>{opp.startup?.name}</p>
                  <p className={styles.cardDesc}>{opp.description ? (opp.description.length > 100 ? opp.description.slice(0, 100) + '…' : opp.description) : ''}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.funding}>{formatINR(opp.fundingRequired)}</span>
                    <span className={styles.location}>{opp.startup?.location}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.publishDate}>{formatDate(opp.publishedAt)}</span>
                    <span className={styles.viewLink}>View <ArrowRight size={13} aria-hidden="true" /></span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className={styles.pagination} role="navigation" aria-label="Pagination">
                <Button
                  variant="secondary" size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  aria-label="Previous page"
                >← Prev</Button>
                <span className={styles.pageInfo}>Page {page} of {pagination.pages}</span>
                <Button
                  variant="secondary" size="sm"
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                  aria-label="Next page"
                >Next →</Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
