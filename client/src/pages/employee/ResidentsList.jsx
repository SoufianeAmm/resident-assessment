import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function ResidentsList() {
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/residents').then((r) => setResidents(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = residents.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.room_number || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading residents...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Residents</h1>
        <p>View all residents and their activity assessment progress.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className="form-group input"
          style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '1rem', width: '100%', maxWidth: 360 }}
          placeholder="Search by name or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Resident Name</th>
              <th>Room</th>
              <th>Assessments</th>
              <th>Avg Rating</th>
              <th>Pending Recs</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.room_number || '—'}</td>
                <td>
                  {r.assessments_done === 0 ? (
                    <span className="badge badge-yellow">None yet</span>
                  ) : (
                    r.assessments_done
                  )}
                </td>
                <td>{r.avg_rating ? `${r.avg_rating} ★` : '—'}</td>
                <td>
                  {r.recommendations_count > 0 ? (
                    <span className="badge badge-blue">{r.recommendations_count}</span>
                  ) : '—'}
                </td>
                <td style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td>
                  <Link to={`/employee/residents/${r.id}`} className="btn btn-sm btn-primary">View Profile</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state"><p>No residents found matching your search.</p></div>
        )}
      </div>
    </div>
  );
}
