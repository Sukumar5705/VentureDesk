import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../contexts/ToastContext';
import * as adminApi from '../../api/admin';
import type { Opportunity } from '../../api/opportunities';
import { formatINR, formatDateDMY, formatDate } from '../../utils/format';
import { STAGE_LABELS } from '../../api/opportunities';
import { INDUSTRY_LABELS } from '../../api/startups';
import { ApiRequestError } from '../../api/client';
import styles from '../Dashboard.module.css';

export function AdminReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reviewNote, setReviewNote] = useState('');
  const [reviewNoteError, setReviewNoteError] = useState('');
  const [actionMode, setActionMode] = useState<'approve' | 'request_changes' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchOpp = useCallback(() => {
    if (!id) return;
    setLoading(true);
    adminApi.adminGetOpportunity(id)
      .then(o => setOpp(o))
      .catch(e => {
        const err = e as ApiRequestError;
        if (err.status === 404) setNotFound(true);
        else setError(err.message ?? 'Failed to load opportunity');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOpp(); }, [fetchOpp]);

  async function handleReview(decision: 'approved' | 'changes_requested' | 'rejected') {
    if ((decision === 'changes_requested' || decision === 'rejected') && !reviewNote.trim()) {
      setReviewNoteError('A review note is required for this action');
      return;
    }
    if (reviewNote.length > 1000) {
      setReviewNoteError('Review note must be 1000 characters or fewer');
      return;
    }
    setReviewNoteError('');
    setSubmitting(true);
    try {
      const updated = await adminApi.reviewOpportunity(id!, decision, reviewNote.trim() || undefined);
      setOpp(updated);
      setActionMode(null);
      showToast('success', `Opportunity ${decision === 'approved' ? 'approved' : decision === 'changes_requested' ? 'sent back for changes' : 'rejected'}.`);
    } catch (err) {
      const e = err as ApiRequestError;
      if (e.status === 409) showToast('error', e.message ?? 'Already reviewed');
      else showToast('error', e.message ?? 'Review action failed');
    } finally {
      setSubmitting(false);
    }
  }

  const isPendingReview = opp?.status === 'pending_review';

  if (loading) return (
    <div className={styles.page}>
      <Skeleton height={32} width="50%" style={{ marginBottom: 12 }} />
      <Skeleton height={18} width="30%" style={{ marginBottom: 32 }} />
      <Skeleton height={200} borderRadius="20px" />
    </div>
  );

  if (notFound) return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center', padding: 40 }}>
        <h2 style={{ marginBottom: 8 }}>Opportunity not found</h2>
        <p style={{ color: 'var(--vd-text-secondary)', marginBottom: 20 }}>
          This listing may have been removed or doesn't exist.
        </p>
        <Link to="/admin/reviews"><Button variant="secondary">← Back to reviews</Button></Link>
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.page}>
      <div className={styles.card} style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--vd-red)', marginBottom: 16 }}>{error}</p>
        <Button onClick={fetchOpp}>Retry</Button>
      </div>
    </div>
  );

  if (!opp) return null;

  return (
    <div className={styles.page}>
      <Link to="/admin/reviews" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--vd-text-secondary)', marginBottom: 24 }}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to reviews
      </Link>

      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className={styles.title} style={{ margin: 0 }}>{opp.title}</h1>
          <StatusBadge status={opp.status} size="md" />
        </div>
        {opp.submittedAt && (
          <p className={styles.subtitle}>Submitted {formatDateDMY(opp.submittedAt)}</p>
        )}
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Overview card */}
          <div className={styles.card}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Opportunity Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {opp.stage && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Stage</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{STAGE_LABELS[opp.stage] ?? opp.stage}</div>
                </div>
              )}
              {opp.fundingRequired && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Funding Required</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{formatINR(opp.fundingRequired)}</div>
                </div>
              )}
            </div>

            {opp.description && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Description</div>
                <p style={{ fontSize: 14, color: 'var(--vd-text-secondary)', lineHeight: 1.7 }}>{opp.description}</p>
              </div>
            )}

            {opp.useOfFunds && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Use of Funds</div>
                <p style={{ fontSize: 14, color: 'var(--vd-text-secondary)', lineHeight: 1.7 }}>{opp.useOfFunds}</p>
              </div>
            )}
          </div>

          {/* Startup snapshot */}
          {opp.startupSnapshot && (
            <div className={styles.card}>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Startup Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Name</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{opp.startupSnapshot.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Industry</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{INDUSTRY_LABELS[opp.startupSnapshot.industry] ?? opp.startupSnapshot.industry}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Location</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{opp.startupSnapshot.location}</div>
                </div>
                {opp.startupSnapshot.website && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', fontWeight: 500, marginBottom: 2 }}>Website</div>
                    <a href={opp.startupSnapshot.website} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 14, color: 'var(--vd-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Visit <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
              {opp.startupSnapshot.description && (
                <p style={{ fontSize: 13, color: 'var(--vd-text-secondary)', lineHeight: 1.6 }}>
                  {opp.startupSnapshot.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Review actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className={styles.card}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Review Actions</h2>

            {!isPendingReview ? (
              <div style={{ padding: '12px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--vd-text-secondary)' }}>
                  This opportunity has already been reviewed.
                </p>
                {opp.reviewNote && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Review note:</div>
                    <p style={{ fontSize: 13, color: 'var(--vd-text-secondary)' }}>{opp.reviewNote}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button
                    onClick={() => {
                      setActionMode('approve');
                      setReviewNote('');
                      setReviewNoteError('');
                    }}
                    style={{
                      justifyContent: 'center',
                      background: actionMode === 'approve' ? 'var(--vd-green)' : undefined,
                      borderColor: actionMode === 'approve' ? 'var(--vd-green)' : undefined,
                      color: actionMode === 'approve' ? 'var(--vd-text)' : undefined,
                    }}
                    disabled={submitting}
                  >
                    <CheckCircle2 size={15} aria-hidden="true" /> Approve
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActionMode('request_changes');
                      setReviewNote('');
                      setReviewNoteError('');
                    }}
                    style={{
                      justifyContent: 'center',
                      background: actionMode === 'request_changes' ? 'rgba(251,146,60,0.1)' : undefined,
                      borderColor: actionMode === 'request_changes' ? 'var(--vd-orange)' : undefined,
                      color: actionMode === 'request_changes' ? 'var(--vd-orange)' : undefined,
                    }}
                    disabled={submitting}
                  >
                    <AlertCircle size={15} aria-hidden="true" /> Request Changes
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setActionMode('reject');
                      setReviewNote('');
                      setReviewNoteError('');
                    }}
                    style={{
                      justifyContent: 'center',
                      opacity: actionMode === 'reject' ? 1 : undefined,
                    }}
                    disabled={submitting}
                  >
                    <XCircle size={15} aria-hidden="true" /> Reject
                  </Button>
                </div>

                {/* Review note input */}
                {(actionMode === 'request_changes' || actionMode === 'reject') && (
                  <div style={{ marginTop: 16 }}>
                    <Textarea
                      label="Review note (required)"
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                      placeholder="Explain what needs to change or why this is being rejected..."
                      maxLength={1000}
                      rows={4}
                      error={reviewNoteError}
                      required
                    />
                    <div style={{ fontSize: 11, color: 'var(--vd-text-secondary)', marginTop: 4 }}>
                      {reviewNote.length}/1000
                    </div>
                  </div>
                )}

                {actionMode && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <Button
                      loading={submitting}
                      onClick={() => handleReview(
                        actionMode === 'approve' ? 'approved'
                          : actionMode === 'request_changes' ? 'changes_requested'
                          : 'rejected'
                      )}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => { setActionMode(null); setReviewNote(''); setReviewNoteError(''); }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.card} style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: 'var(--vd-text-secondary)', marginBottom: 8 }}>Submission info</div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong>Submitted:</strong> {formatDate(opp.submittedAt ?? opp.createdAt)}</div>
              <div><strong>Status:</strong> <StatusBadge status={opp.status} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
