import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };
const STATUS_BADGE = { pending: 'badge-blue', scheduled: 'badge-yellow', completed: 'badge-green', declined: 'badge-gray' };

export default function MyRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  async function load() {
    const r = await api.get('/recommendations/my');
    setRecommendations(r.data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const { data } = await api.post(`/recommendations/regenerate/${user.id}`);
      toast.success(data.message);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Regeneration failed.');
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <div className="loading">Loading recommendations...</div>;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Recommendations</h1>
          <p>Activities suggested for you — AI updates these whenever you rate something new.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? '✨ Thinking...' : '✨ Refresh AI Picks'}
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="card empty-state">
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</p>
          <h3>No recommendations yet</h3>
          <p>Complete activity assessments and our staff will suggest activities tailored to your interests.</p>
        </div>
      ) : (
        <div className="grid-2">
          {recommendations.map((rec) => (
            <div key={rec.id} className="card" style={styles.recCard}>
              <div style={styles.recHeader}>
                <div>
                  <h3>{rec.activity_name}</h3>
                  <span className="badge badge-gray">{rec.category}</span>
                </div>
                <span className={`badge ${PRIORITY_BADGE[rec.priority]}`}>{rec.priority} priority</span>
              </div>
              {rec.description && <p style={styles.desc}>{rec.description}</p>}
              {rec.benefits && (
                <div style={styles.benefits}>
                  <strong>Why it&apos;s good for you:</strong> {rec.benefits}
                </div>
              )}
              {rec.reason && (
                <div style={styles.reason}>
                  <strong>Staff note:</strong> {rec.reason}
                </div>
              )}
              <div style={styles.footer}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_BADGE[rec.status]}`}>{rec.status}</span>
                  {rec.source === 'ai' && <span className="badge" style={{ background: '#f0f4ff', color: '#4338ca' }}>✨ AI</span>}
                </div>
                <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                  {new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  recCard: { display: 'flex', flexDirection: 'column', gap: 10 },
  recHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  desc: { color: '#6b7280', fontSize: '0.9rem' },
  benefits: { background: '#e8f5e3', color: '#3a5c30', padding: '8px 12px', borderRadius: 8, fontSize: '0.88rem' },
  reason: { background: '#fff8e1', color: '#92650a', padding: '8px 12px', borderRadius: 8, fontSize: '0.88rem' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 12, borderTop: '1px solid #f1f5f9' },
};
