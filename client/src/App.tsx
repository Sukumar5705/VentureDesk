import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ui/Toast';
import { RouteGuard } from './components/ui/RouteGuard';
import { AppShell } from './components/layout/AppShell';

// Public pages
import { LandingPage } from './pages/public/LandingPage';
import { DiscoveryPage } from './pages/public/DiscoveryPage';
import { OpportunityDetailPage } from './pages/public/OpportunityDetailPage';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Founder pages
import { FounderDashboardPage } from './pages/founder/FounderDashboardPage';
import { StartupProfilePage, StartupNewPage } from './pages/founder/StartupPage';
import { FounderOpportunitiesPage, NewOpportunityPage, EditOpportunityPage } from './pages/founder/OpportunitiesPage';
import { FounderInquiriesPage } from './pages/founder/FounderInquiriesPage';

// Investor pages
import { InvestorDashboardPage } from './pages/investor/InvestorDashboardPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminReviewDetailPage } from './pages/admin/AdminReviewDetailPage';

// Shared pages
import { ProfilePage } from './pages/ProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';

// Authenticated shell layout — wraps all protected pages
function AuthShell({ role }: { role?: 'founder' | 'investor' | 'admin' }) {
  return (
    <RouteGuard role={role}>
      <AppShell />
    </RouteGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* ── Public routes ─────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/startups" element={<DiscoveryPage />} />
            <Route path="/startups/:id" element={<OpportunityDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Founder routes (uses AppShell Outlet) ─────────── */}
            <Route element={<AuthShell role="founder" />}>
              <Route path="/founder/dashboard" element={<FounderDashboardPage />} />
              <Route path="/founder/startups" element={<StartupProfilePage />} />
              <Route path="/founder/startups/new" element={<StartupNewPage />} />
              <Route path="/founder/opportunities" element={<FounderOpportunitiesPage />} />
              <Route path="/founder/opportunities/new" element={<NewOpportunityPage />} />
              <Route path="/founder/opportunities/:id/edit" element={<EditOpportunityPage />} />
              <Route path="/founder/inquiries" element={<FounderInquiriesPage />} />
            </Route>

            {/* ── Investor routes ────────────────────────────────── */}
            <Route element={<AuthShell role="investor" />}>
              <Route path="/investor/dashboard" element={<InvestorDashboardPage />} />
            </Route>

            {/* ── Admin routes ───────────────────────────────────── */}
            <Route element={<AuthShell role="admin" />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
              <Route path="/admin/reviews/:id" element={<AdminReviewDetailPage />} />
            </Route>

            {/* ── Shared authenticated routes ───────────────────── */}
            <Route element={<AuthShell />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* ── 404 catch-all ─────────────────────────────────── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
