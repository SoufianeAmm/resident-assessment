import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };

export default function AllRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/recommendations').then((r) => setRecommendations(r.data)).finally(() => setLoading(false));
  }, []);

  async function updateStatus(recId, status) {
    try {
      await api.patch(`/recommendations/${recId}/status`, { status });
      setRecommendations((prev) => prev.map((r) => r.id === recId ? { ...r, status } : r));
      toast.success('Status updated!');
    } catch {
      toast.error('Failed to update status.');
    }
  }

  const filtered = filter === 'all' ? recommendations : recommendations.filter((r) => r.status === filter);

  const counts = {
    all: recommendations.length,
    pending: recommendations.filter((r) => r.status === 'pending').length,
    scheduled: recommendations.filter((r) => r.status === 'scheduled').length,
    completed: recommendations.filter((r) => r.status === 'completed').length,
  };

  if (loading) return <div className="loading">Loading recommendations...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Recommendations</h1>
        <p>Review and manage activity recommendations for all residents.</p>
      </div>

      <div style={styles.filterBar}>
        {['pending', 'scheduled', 'completed', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={styles.count}>{counts[f] || 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Resident</th>
              <th>Room</th>
              <th>Activity</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((rec) => (
              <tr key={rec.id}>
                <td>
                  <Link to={`/employee/residents/${rec.resident_id}`} style={{ color: '#4f7942', textDecoration: 'none', fontWeight: 500 }}>
                    {rec.resident_name}
                  </Link>
                </td>
                <td>{rec.room_number || '—'}</td>
                <td>
                  <strong>{rec.activity_name}</strong>
                  {rec.source === 'ai' && <span className="badge" style={{ marginLeft: 6, background: '#f0f4ff', color: '#4338ca' }}>✨ AI</span>}
                </td>
                <td><span className="badge badge-gray">{rec.category}</span></td>
                <td><span className={`badge ${PRIORITY_BADGE[rec.priority]}`}>{rec.priority}</span></td>
                <td style={{ maxWidth: 200, color: '#6b7280', fontSize: '0.85rem' }}>{rec.reason || '—'}</td>
                <td>
                  <select className="inline-select" value={rec.status} onChange={(e) => updateStatus(rec.id, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state"><p>No recommendations with status &quot;{filter}&quot;.</p></div>
        )}
      </div>
    </div>
  );
}

const styles = {
  filterBar: { display: 'flex', gap: 8, marginBottom: 20 },
  filterBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', color: '#6b7280' },
  filterActive: { background: '#4f7942', borderColor: '#4f7942', color: '#fff' },
  count: { background: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: '1px 7px', fontSize: '0.8rem' },
};
