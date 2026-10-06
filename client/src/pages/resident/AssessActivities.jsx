import { useEffect, useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';

const INTEREST_OPTIONS = [
  { value: 'not_interested', label: 'Not Interested', emoji: '😕' },
  { value: 'somewhat', label: 'Somewhat Interested', emoji: '🙂' },
  { value: 'very_interested', label: 'Very Interested!', emoji: '😊' },
];

export default function AssessActivities() {
  const [activities, setActivities] = useState([]);
  const [myAssessments, setMyAssessments] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/activities'), api.get('/assessments/my')]).then(([acts, my]) => {
      setActivities(acts.data);
      const map = {};
      for (const a of my.data) {
        map[a.activity_id] = { rating: a.rating, interest_level: a.interest_level, notes: a.notes };
      }
      setMyAssessments(map);
      const cats = ['All', ...new Set(acts.data.map((a) => a.category))];
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, []);

  async function saveAssessment(activityId, field, value) {
    const current = myAssessments[activityId] || { rating: 3, interest_level: 'somewhat', notes: '' };
    const updated = { ...current, [field]: value };
    setMyAssessments((prev) => ({ ...prev, [activityId]: updated }));

    if (!updated.rating || !updated.interest_level) return;
    setSaving(activityId);
    try {
      await api.post('/assessments', { activity_id: activityId, ...updated });
      toast.success('Assessment saved!');
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  const filtered = activeCategory === 'All' ? activities : activities.filter((a) => a.category === activeCategory);
  const assessed = Object.keys(myAssessments).length;

  if (loading) return <div className="loading">Loading activities...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Assess Activities</h1>
        <p>Rate each activity and tell us how interested you are. This helps our staff plan the right programs for you.</p>
      </div>

      <div style={styles.progress}>
        <span>{assessed} of {activities.length} activities assessed</span>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(assessed / activities.length) * 100}%` }} />
        </div>
      </div>

      <div style={styles.categoryTabs}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            style={{ ...styles.tab, ...(activeCategory === cat ? styles.tabActive : {}) }}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {filtered.map((activity) => {
          const assessment = myAssessments[activity.id] || {};
          const isDone = !!assessment.rating;
          return (
            <div key={activity.id} className="card" style={{ ...styles.actCard, ...(isDone ? styles.actCardDone : {}) }}>
              <div style={styles.actHeader}>
                <div>
                  <h3>{activity.name}</h3>
                  <span className="badge badge-gray">{activity.category}</span>
                  <span className="badge badge-blue" style={{ marginLeft: 6 }}>{activity.difficulty_level}</span>
                </div>
                {isDone && <span style={styles.checkmark}>✓</span>}
              </div>
              <p style={styles.desc}>{activity.description}</p>
              {activity.benefits && (
                <p style={styles.benefits}><strong>Benefits:</strong> {activity.benefits}</p>
              )}
              <p style={styles.duration}>⏱ {activity.duration_minutes} min</p>

              <div style={styles.ratingSection}>
                <label style={styles.ratingLabel}>How would you rate this?</label>
                <div style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => saveAssessment(activity.id, 'rating', star)}
                      style={{ ...styles.star, color: (assessment.rating || 0) >= star ? '#f0a500' : '#d1d5db' }}>
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.interestSection}>
                <label style={styles.ratingLabel}>Your interest level:</label>
                <div style={styles.interestBtns}>
                  {INTEREST_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => saveAssessment(activity.id, 'interest_level', opt.value)}
                      style={{
                        ...styles.interestBtn,
                        ...(assessment.interest_level === opt.value ? styles.interestBtnActive : {}),
                      }}>
                      {opt.emoji} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {saving === activity.id && <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 8 }}>Saving...</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  progress: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: '#6b7280' },
  progressBar: { flex: 1, height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#4f7942', borderRadius: 999, transition: 'width 0.3s' },
  categoryTabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  tab: { padding: '6px 16px', borderRadius: 999, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', color: '#6b7280' },
  tabActive: { background: '#4f7942', borderColor: '#4f7942', color: '#fff' },
  actCard: { transition: 'all 0.2s' },
  actCardDone: { borderLeft: '4px solid #4f7942' },
  actHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  checkmark: { background: '#4f7942', color: '#fff', borderRadius: 999, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 },
  desc: { color: '#6b7280', fontSize: '0.9rem', marginBottom: 8 },
  benefits: { color: '#3a5c30', fontSize: '0.85rem', background: '#e8f5e3', padding: '6px 10px', borderRadius: 6, marginBottom: 8 },
  duration: { color: '#6b7280', fontSize: '0.85rem', marginBottom: 12 },
  ratingSection: { marginBottom: 12 },
  ratingLabel: { display: 'block', fontWeight: 500, fontSize: '0.9rem', marginBottom: 6 },
  stars: { display: 'flex', gap: 4 },
  star: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem', padding: 2, transition: 'transform 0.1s' },
  interestSection: { marginTop: 8 },
  interestBtns: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  interestBtn: { padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: '#374151' },
  interestBtnActive: { background: '#e8f5e3', borderColor: '#4f7942', color: '#3a5c30' },
};
