import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/assessments/my'),
      api.get('/recommendations/my'),
    ]).then(([a, r]) => {
      setAssessments(a.data);
      setRecommendations(r.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading your dashboard...</div>;

  const highRated = assessments.filter((a) => a.rating >= 4);
  const pendingRecs = recommendations.filter((r) => r.status === 'pending' || r.status === 'scheduled');

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>Here&apos;s your life enrichment summary. Keep exploring activities you enjoy!</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="card stat-card">
          <div className="stat-number">{assessments.length}</div>
          <div className="stat-label">Activities Assessed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number" style={{ color: '#f0a500' }}>{highRated.length}</div>
          <div className="stat-label">Favourites (4★+)</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number" style={{ color: '#4f7942' }}>{pendingRecs.length}</div>
          <div className="stat-label">Recommendations for You</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Your Top Activities</h2>
            <Link to="/resident/assess" className="btn btn-sm btn-primary">Assess More</Link>
          </div>
          {highRated.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t rated any activities highly yet.</p>
              <Link to="/resident/assess" className="btn btn-primary" style={{ marginTop: 16 }}>Start Assessing</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {highRated.slice(0, 5).map((a) => (
                <div key={a.id} style={styles.actRow}>
                  <div>
                    <strong>{a.activity_name}</strong>
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>{a.category}</span>
                  </div>
                  <StarRating value={a.rating} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Staff Recommendations</h2>
            <Link to="/resident/recommendations" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          {pendingRecs.length === 0 ? (
            <div className="empty-state">
              <p>No recommendations yet. Complete some assessments and staff will suggest activities for you.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingRecs.slice(0, 5).map((r) => (
                <div key={r.id} style={styles.actRow}>
                  <div>
                    <strong>{r.activity_name}</strong>
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>{r.category}</span>
                  </div>
                  <PriorityBadge priority={r.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20, background: 'linear-gradient(135deg, #e8f5e3, #f7fdf5)', border: '1px solid #c6e6be' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '2.5rem' }}>💡</span>
          <div>
            <h3>Tell us what you enjoy!</h3>
            <p style={{ color: '#6b7280', marginTop: 4 }}>The more activities you assess, the better recommendations our staff can give you. It only takes a minute.</p>
          </div>
          <Link to="/resident/assess" className="btn btn-primary" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Assess Activities
          </Link>
        </div>
      </div>
    </div>
  );
}

function StarRating({ value }) {
  return (
    <span style={{ color: '#f0a500', fontSize: '1.1rem' }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };
  return <span className={`badge ${map[priority]}`}>{priority}</span>;
}

const styles = {
  actRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
};
