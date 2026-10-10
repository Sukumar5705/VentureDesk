import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, MessagesSquare,
  ClipboardCheck, UserRound, LogOut, Menu, X,
  TrendingUp, Compass,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Logo } from '../ui/Logo';
import styles from './Sidebar.module.css';

interface NavItem { label: string; to: string; icon: React.ReactNode; }

const founderNav: NavItem[] = [
  { label: 'Overview',      to: '/founder/dashboard',      icon: <LayoutDashboard size={17} /> },
  { label: 'Startup',       to: '/founder/startups',       icon: <Building2 size={17} /> },
  { label: 'Opportunities', to: '/founder/opportunities',  icon: <TrendingUp size={17} /> },
  { label: 'Inquiries',     to: '/founder/inquiries',      icon: <MessagesSquare size={17} /> },
  { label: 'Profile',       to: '/profile',                icon: <UserRound size={17} /> },
];

const investorNav: NavItem[] = [
  { label: 'Dashboard',    to: '/investor/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Discover',     to: '/startups',           icon: <Compass size={17} /> },
  { label: 'My Inquiries', to: '/investor/inquiries', icon: <MessagesSquare size={17} /> },
  { label: 'Profile',      to: '/profile',            icon: <UserRound size={17} /> },
];

const adminNav: NavItem[] = [
  { label: 'Overview', to: '/admin/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Reviews',  to: '/admin/reviews',   icon: <ClipboardCheck size={17} /> },
  { label: 'Profile',  to: '/profile',         icon: <UserRound size={17} /> },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = user.role === 'founder' ? founderNav : user.role === 'investor' ? investorNav : adminNav;

  async function handleLogout() {
    await logout();
    showToast('success', 'Logged out successfully');
    navigate('/');
  }

  const sidebarContent = (
    <aside className={styles.sidebar} aria-label="Navigation">
      {/* Brand */}
      <div className={styles.brand}>
        <Logo variant="sidebar" size="md" />
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom user section */}
      <div className={styles.bottom}>
        <div className={styles.userRow}>
          <div className={styles.avatar} aria-hidden="true">
            {user.fullName[0].toUpperCase()}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{user.fullName}</span>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={15} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <div className={styles.desktopSidebar}>{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`${styles.mobileDrawer} ${mobileOpen ? styles.mobileDrawerOpen : ''}`}
        aria-modal="true"
      >
        <button
          className={styles.closeDrawer}
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>
        {sidebarContent}
      </div>
    </>
  );
}
