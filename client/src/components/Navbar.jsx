import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';

  const residentLinks = [
    { to: '/resident/dashboard', label: 'Dashboard' },
    { to: '/resident/assess', label: 'Assess Activities' },
    { to: '/resident/recommendations', label: 'My Recommendations' },
  ];

  const employeeLinks = [
    { to: '/employee/dashboard', label: 'Dashboard' },
    { to: '/employee/residents', label: 'Residents' },
    { to: '/employee/recommendations', label: 'Recommendations' },
  ];

  const links = user?.role === 'resident' ? residentLinks : employeeLinks;

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>🌿</span>
          <span>Life Enrichment</span>
        </Link>
        <div style={styles.links}>
          {links.map((l) => (
            <Link key={l.to} to={l.to} style={{ ...styles.link, ...(isActive(l.to) ? styles.linkActive : {}) }}>
              {l.label}
            </Link>
          ))}
        </div>
        <div style={styles.right}>
          <span style={styles.userInfo}>
            <span style={styles.roleTag}>{user?.role}</span>
            {user?.name}
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  inner: { maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 32, height: 60 },
  logo: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#4f7942', fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap' },
  logoIcon: { fontSize: '1.4rem' },
  links: { display: 'flex', gap: 4, flex: 1 },
  link: { padding: '6px 14px', borderRadius: 8, textDecoration: 'none', color: '#6b7280', fontWeight: 500, fontSize: '0.95rem', transition: 'all 0.15s' },
  linkActive: { background: '#e8f5e3', color: '#3a5c30' },
  right: { display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', color: '#374151' },
  roleTag: { background: '#e8f5e3', color: '#3a5c30', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' },
  logoutBtn: { background: 'none', border: '1.5px solid #e2e8f0', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', color: '#6b7280', fontSize: '0.9rem', fontWeight: 500 },
};
