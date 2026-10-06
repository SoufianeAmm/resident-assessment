import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';

async function refreshRecommendations(residentId, setRecommendations) {
  const recs = await api.get(`/recommendations/resident/${residentId}`);
  setRecommendations(recs.data);
}

export default function ResidentProfile() {
  const { id } = useParams();
  const [resident, setResident] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showAddRec, setShowAddRec] = useState(false);
  const [newRec, setNewRec] = useState({ activity_id: '', reason: '', priority: 'medium' });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/residents/${id}`),
      api.get(`/assessments/resident/${id}`),
      api.get(`/recommendations/resident/${id}`),
      api.get('/activities'),
    ]).then(([r, a, recs, acts]) => {
      setResident(r.data);
      setAssessments(a.data);
      setRecommendations(recs.data);
      setActivities(acts.data);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const { data } = await api.post(`/recommendations/regenerate/${id}`);
      toast.success(data.message);
      await refreshRecommendations(id, setRecommendations);
    } catch (err) {
      toast.error(err.response?.data?.error || 'AI generation failed.');
    } finally {
      setRegenerating(false);
    }
  }

  async function addRecommendation(e) {
    e.preventDefault();
    try {
      await api.post('/recommendations', { resident_id: id, ...newRec });
      toast.success('Recommendation added!');
      const recs = await api.get(`/recommendations/resident/${id}`);
      setRecommendations(recs.data);
      setShowAddRec(false);
      setNewRec({ activity_id: '', reason: '', priority: 'medium' });
    } catch {
      toast.error('Failed to add recommendation.');
    }
  }

  async function updateStatus(recId, status) {
    try {
      await api.patch(`/recommendations/${recId}/status`, { status });
      setRecommendations((prev) => prev.map((r) => r.id === recId ? { ...r, status } : r));
      toast.success('Status updated!');
    } catch {
      toast.error('Failed to update status.');
    }
  }

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!resident) return <div className="page"><p>Resident not found.</p></div>;

  const topActivities = assessments.filter((a) => a.rating >= 4);

  return (
    <div className="page">
      <div style={styles.profileHeader}>
        <div style={styles.avatar}>{resident.name.charAt(0)}</div>
        <div>
          <h1>{resident.name}</h1>
          {resident.room_number && <p style={{ color: '#6b7280' }}>Room {resident.room_number}</p>}
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
            Member since {new Date(resident.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={styles.quickStats}>
          <div style={styles.qs}><strong>{assessments.length}</strong><span>Assessments</span></div>
          <div style={styles.qs}><strong>{topActivities.length}</strong><span>Top Picks</span></div>
          <div style={styles.qs}><strong>{recommendations.filter((r) => r.status === 'pending').length}</strong><span>Pending</span></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Activity Preferences</h2>
          {assessments.length === 0 ? (
            <div className="empty-state"><p>No assessments completed yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assessments.map((a) => (
                <div key={a.id} style={styles.assessRow}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{a.activity_name}</strong>
                    <span className="badge badge-gray" style={{ marginLeft: 8 }}>{a.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#f0a500' }}>{'★'.repeat(a.rating)}{'☆'.repeat(5 - a.rating)}</span>
                    <InterestBadge level={a.interest_level} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Recommendations</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-secondary" onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? '✨ Thinking...' : '✨ AI Regenerate'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => setShowAddRec(!showAddRec)}>
                {showAddRec ? 'Cancel' : '+ Add'}
              </button>
            </div>
          </div>

          {showAddRec && (
            <form onSubmit={addRecommendation} style={styles.addForm}>
              <div className="form-group">
                <label>Activity</label>
                <select value={newRec.activity_id} onChange={(e) => setNewRec({ ...newRec, activity_id: e.target.value })} required>
                  <option value="">Select an activity...</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={newRec.priority} onChange={(e) => setNewRec({ ...newRec, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reason / Staff Note (optional)</label>
                <textarea rows={2} placeholder="Why this activity?" value={newRec.reason} onChange={(e) => setNewRec({ ...newRec, reason: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Save Recommendation</button>
            </form>
          )}

          {recommendations.length === 0 && !showAddRec ? (
            <div className="empty-state"><p>No recommendations yet. Add one above.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map((rec) => (
                <div key={rec.id} style={styles.recCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{rec.activity_name}</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {rec.source === 'ai' && <span className="badge" style={{ background: '#f0f4ff', color: '#4338ca' }}>✨ AI</span>}
                      <PriorityBadge p={rec.priority} />
                    </div>
                  </div>
                  <span className="badge badge-gray">{rec.category}</span>
                  {rec.reason && <p style={styles.recReason}>{rec.reason}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Status:</span>
                    <select className="inline-select" value={rec.status} onChange={(e) => updateStatus(rec.id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InterestBadge({ level }) {
  const map = { not_interested: ['badge-gray', 'Not Interested'], somewhat: ['badge-blue', 'Somewhat'], very_interested: ['badge-green', 'Very Interested'] };
  const [cls, label] = map[level] || ['badge-gray', level];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function PriorityBadge({ p }) {
  const map = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };
  return <span className={`badge ${map[p]}`}>{p}</span>;
}

const styles = {
  profileHeader: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  avatar: { width: 72, height: 72, background: '#4f7942', color: '#fff', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, flexShrink: 0 },
  quickStats: { display: 'flex', gap: 24, marginLeft: 'auto' },
  qs: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, strong: { fontSize: '1.5rem', fontWeight: 700, color: '#4f7942' }, span: { fontSize: '0.8rem', color: '#6b7280' } },
  assessRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' },
  addForm: { background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' },
  recCard: { background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 },
  recReason: { color: '#6b7280', fontSize: '0.85rem', fontStyle: 'italic' },
};
