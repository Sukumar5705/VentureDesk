import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, TrendingUp, DollarSign } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import * as oppApi from '../../api/opportunities';
import { formatINR, formatDate } from '../../utils/format';
import { INDUSTRY_LABELS } from '../../api/startups';
import { STAGE_LABELS } from '../../api/opportunities';
import { ApiRequestError } from '../../api/client';
import styles from './OpportunityDetailPage.module.css';

export function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [opp, setOpp] = useState<oppApi.PublicOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showInquiry, setShowInquiry] = useState(false);
  const [message, setMessage] = useState('');
  const [msgError, setMsgError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // The public API returns a list filtered by status=approved
    // We need to fetch the specific opportunity — use listPublicOpportunities and find by id
    // There is no dedicated GET /api/opportunities/:id for public, so we call the list
    oppApi.listPublicOpportunities({ limit: 100 })
      .then(res => {
        const found = res.data.find(o => o.id === id);
        if (!found) { setNotFound(true); return; }
        setOpp(found);
      })
      .catch((err: unknown) => {
        const e = err as ApiRequestError;
        if (e.status === 404) setNotFound(true);
        else setError(e.message ?? 'Failed to load opportunity');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleInquiry() {
    const trimmed = message.trim();
    if (!trimmed) { setMsgError('Message is required'); return; }
    if (trimmed.length > 1000) { setMsgError('Message must be 1000 characters or fewer'); return; }
    setMsgError('');
    setSubmitting(true);
    try {
      await oppApi.createInquiry(id!, trimmed);
      setInquirySent(true);
      setShowInquiry(false);
      showToast('success', 'Inquiry sent successfully!');
    } catch (err: unknown) {
      const e = err as ApiRequestError;
      if (e.status === 409) {
        showToast('warning', 'You have already sent an inquiry for this opportunity');
        setShowInquiry(false);
      } else {
        showToast('error', e.message ?? 'Failed to send inquiry');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <PublicNavbar />
      <main className={styles.main}>
        <Skeleton height={40} width="60%" style={{ marginBottom: 16 }} />
        <Skeleton height={20} width="40%" style={{ marginBottom: 32 }} />
        <Skeleton height={200} borderRadius="20px" />
      </main>
    </div>
  );

  if (notFound) return (
    <div className={styles.page}>
      <PublicNavbar />
      <main className={styles.main}>
        <div className={styles.notFound}>
          <h2>Opportunity not found</h2>
          <p>This listing may have been removed or is no longer available.</p>
          <Link to="/startups"><Button variant="secondary">← Back to marketplace</Button></Link>
        </div>
      </main>
    </div>
  );

  if (error) return (
    <div className={styles.page}>
      <PublicNavbar />
      <main className={styles.main}>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </main>
    </div>
  );

  if (!opp) return null;

  const canInquire = user?.role === 'investor';
  const showLoginPrompt = !user;

  return (
    <div className={styles.page}>
      <PublicNavbar />
      <main className={styles.main}>
        <Link to="/startups" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to marketplace
        </Link>

        <div className={styles.layout}>
          {/* Left — main content */}
          <div className={styles.mainCol}>
            <div className={styles.card}>
              <div className={styles.badges}>
                <span className={styles.industryBadge}>{INDUSTRY_LABELS[opp.startup?.industry] ?? opp.startup?.industry}</span>
                <span className={styles.stageBadge}>{STAGE_LABELS[opp.stage] ?? opp.stage}</span>
              </div>
              <h1 className={styles.title}>{opp.title}</h1>
              <p className={styles.startupName}>{opp.startup?.name}</p>

              <div className={styles.metaRow}>
                <span className={styles.metaItem}><MapPin size={13} aria-hidden="true" /> {opp.startup?.location}</span>
                <span className={styles.metaItem}><TrendingUp size={13} aria-hidden="true" /> {STAGE_LABELS[opp.stage] ?? opp.stage}</span>
                <span className={styles.metaItem}><DollarSign size={13} aria-hidden="true" /> {formatINR(opp.fundingRequired)}</span>
              </div>

              {opp.description && (
                <section className={styles.section}>
                  <h2>About this opportunity</h2>
                  <p>{opp.description}</p>
                </section>
              )}

              {opp.useOfFunds && (
                <section className={styles.section}>
                  <h2>Use of funds</h2>
                  <p>{opp.useOfFunds}</p>
                </section>
              )}

              {opp.startup?.description && (
                <section className={styles.section}>
                  <h2>About {opp.startup.name}</h2>
                  <p>{opp.startup.description}</p>
                  {opp.startup.website && (
                    <a href={opp.startup.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                      Visit website ↗
                    </a>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* Right — CTA */}
          <aside className={styles.sidebar}>
            <div className={styles.ctaCard}>
              <div className={styles.fundingLabel}>Funding target</div>
              <div className={styles.fundingAmount}>{formatINR(opp.fundingRequired)}</div>
              <div className={styles.publishedAt}>Published {formatDate(opp.publishedAt)}</div>

              {inquirySent ? (
                <div className={styles.sentMsg}>✓ Inquiry sent</div>
              ) : showInquiry ? (
                <div className={styles.inquiryForm}>
                  <Textarea
                    label="Your message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Introduce yourself and explain your interest..."
                    maxLength={1000}
                    rows={5}
                    error={msgError}
                  />
                  <div className={styles.charCount}>{message.length}/1000</div>
                  <div className={styles.formBtns}>
                    <Button onClick={handleInquiry} loading={submitting} style={{ flex: 1 }}>
                      Send inquiry
                    </Button>
                    <Button variant="secondary" onClick={() => setShowInquiry(false)} disabled={submitting}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : canInquire ? (
                <Button style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowInquiry(true)}>
                  Express Interest
                </Button>
              ) : showLoginPrompt ? (
                <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
                  Sign in to Express Interest
                </Button>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
