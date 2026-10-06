import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/residents'), api.get('/recommendations')]).then(([r, recs]) => {
      setResidents(r.data);
      setRecommendations(recs.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const totalAssessments = residents.reduce((s, r) => s + (r.assessments_done || 0), 0);
  const pendingRecs = recommendations.filter((r) => r.status === 'pending').length;
  const highPriority = recommendations.filter((r) => r.priority === 'high' && r.status === 'pending').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Staff Dashboard</h1>
        <p>Welcome, {user.name}. Here&apos;s an overview of resident activity engagement.</p>
      </div>

      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="card stat-card">
          <div className="stat-number">{residents.length}</div>
          <div className="stat-label">Total Residents</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number">{totalAssessments}</div>
          <div className="stat-label">Assessments Done</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number" style={{ color: '#f0a500' }}>{pendingRecs}</div>
          <div className="stat-label">Pending Recommendations</div>
        </div>
        <div className="card stat-card">
          <div className="stat-number" style={{ color: '#e53935' }}>{highPriority}</div>
          <div className="stat-label">High Priority</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Residents</h2>
            <Link to="/employee/residents" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Room</th>
                <th>Assessed</th>
                <th>Avg Rating</th>
              </tr>
            </thead>
            <tbody>
              {residents.slice(0, 6).map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/employee/residents/${r.id}`} style={{ color: '#4f7942', textDecoration: 'none', fontWeight: 500 }}>{r.name}</Link></td>
                  <td>{r.room_number || '—'}</td>
                  <td>{r.assessments_done}</td>
                  <td>{r.avg_rating ? `${r.avg_rating} ★` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>High Priority Recs</h2>
            <Link to="/employee/recommendations" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          {highPriority === 0 ? (
            <div className="empty-state"><p>No high-priority recommendations at the moment.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.filter((r) => r.priority === 'high' && r.status === 'pending').slice(0, 5).map((rec) => (
                <div key={rec.id} style={styles.recRow}>
                  <div>
                    <strong>{rec.resident_name}</strong>
                    {rec.room_number && <span style={styles.room}> • Room {rec.room_number}</span>}
                    <br />
                    <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{rec.activity_name}</span>
                  </div>
                  <span className="badge badge-red">high</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 16 }}>Residents with No Assessments</h2>
        {residents.filter((r) => r.assessments_done === 0).length === 0 ? (
          <p style={{ color: '#6b7280' }}>All residents have completed at least one assessment.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {residents.filter((r) => r.assessments_done === 0).map((r) => (
              <Link key={r.id} to={`/employee/residents/${r.id}`} style={styles.residentChip}>
                {r.name} {r.room_number ? `(${r.room_number})` : ''}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  recRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
  room: { color: '#6b7280', fontWeight: 400, fontSize: '0.9rem' },
  residentChip: { background: '#fef9c3', color: '#854d0e', padding: '6px 14px', borderRadius: 999, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 },
};
