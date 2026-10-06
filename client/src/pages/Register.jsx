import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'resident', room_number: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate(data.user.role === 'resident' ? '/resident/dashboard' : '/employee/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>🌿</span>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Life Enrichment Assessment Portal</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Margaret Johnson" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label>I am a...</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="resident">Resident</option>
              <option value="employee">Employee / Staff</option>
            </select>
          </div>
          {form.role === 'resident' && (
            <div className="form-group">
              <label>Room Number (optional)</label>
              <input type="text" placeholder="e.g. 204A" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
            </div>
          )}
          {form.role === 'employee' && (
            <div className="form-group">
              <label>Department (optional)</label>
              <input type="text" placeholder="e.g. Life Enrichment" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
          )}
          <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={styles.loginLink}>
          Already have an account? <Link to="/login" style={{ color: '#4f7942' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8f5e3 0%, #f7f9f7 100%)', padding: 20 },
  card: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '40px 36px', width: '100%', maxWidth: 440 },
  header: { textAlign: 'center', marginBottom: 28 },
  icon: { fontSize: '3rem' },
  title: { fontSize: '1.8rem', color: '#1a1a2e', marginTop: 8 },
  subtitle: { color: '#6b7280', marginTop: 4 },
  loginLink: { textAlign: 'center', marginTop: 20, color: '#6b7280', fontSize: '0.9rem' },
};
