import { Link, useNavigate } from 'react-router-dom';
import { Building2, TrendingUp, ClipboardCheck, ArrowRight, Compass } from 'lucide-react';
import { PublicNavbar } from '../../components/layout/PublicNavbar';
import { Button } from '../../components/ui/Button';
import { useAuth, roleDashboard } from '../../contexts/AuthContext';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PublicNavbar />
      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Connect ideas with capital</span>
          <h1 className={styles.headline}>Discover the next generation of startups.</h1>
          <p className={styles.description}>
            Explore startup opportunities and follow the journey from founder submission to investor discovery.
          </p>
          <div className={styles.ctas}>
            {user ? (
              <Button size="lg" onClick={() => navigate(roleDashboard(user.role))}>
                Go to Dashboard <ArrowRight size={16} aria-hidden="true" />
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => navigate('/register')}>
                  Get started <ArrowRight size={16} aria-hidden="true" />
                </Button>
                <Button size="lg" variant="secondary" onClick={() => navigate('/startups')}>
                  <Compass size={16} aria-hidden="true" /> Explore startups
                </Button>
              </>
            )}
          </div>
        </section>

        {/* Role sections */}
        <section className={styles.roles} aria-label="Platform roles">
          <h2 className={styles.rolesHeading}>Built for every stakeholder</h2>
          <div className={styles.rolesGrid}>
            <div className={styles.roleCard}>
              <div className={styles.roleIcon}>
                <Building2 size={22} color="#171717" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3>Founders</h3>
              <p>Create your startup profile, submit funding opportunities, and manage investor inquiries — all from a single dashboard.</p>
              {!user && (
                <Link to="/register" className={styles.roleLink}>
                  Register as a founder <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
            <div className={styles.roleCard}>
              <div className={styles.roleIcon}>
                <TrendingUp size={22} color="#171717" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3>Investors</h3>
              <p>Browse approved opportunities by industry, stage, and location. Track your inquiry pipeline from first contact to due diligence.</p>
              {!user && (
                <Link to="/register" className={styles.roleLink}>
                  Register as an investor <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
            <div className={styles.roleCard}>
              <div className={styles.roleIcon}>
                <ClipboardCheck size={22} color="#171717" strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3>Administrators</h3>
              <p>Review submitted opportunities, approve high-quality listings, request changes, or reject submissions that don't meet standards.</p>
            </div>
          </div>
        </section>

        {/* CTA footer */}
        <section className={styles.ctaSection}>
          <h2>Ready to get started?</h2>
          <p>Join VentureDesk and be part of the next startup success story.</p>
          <div className={styles.ctas}>
            <Button size="lg" onClick={() => navigate('/startups')}>
              <Compass size={16} aria-hidden="true" /> Explore opportunities
            </Button>
            {!user && (
              <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
                Create account
              </Button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
