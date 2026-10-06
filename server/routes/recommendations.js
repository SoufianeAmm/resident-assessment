const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateRecommendations } = require('../services/aiRecommendations');

const router = express.Router();

router.use(authenticateToken);

// Employee gets all recommendations
router.get('/', requireRole('employee'), (req, res) => {
  const recs = db.prepare(`
    SELECT r.*, u.name as resident_name, u.room_number, act.name as activity_name, act.category, act.duration_minutes
    FROM recommendations r
    JOIN users u ON r.resident_id = u.id
    JOIN activities act ON r.activity_id = act.id
    ORDER BY CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at DESC
  `).all();
  res.json(recs);
});

// Employee gets recommendations for a specific resident
router.get('/resident/:residentId', requireRole('employee'), (req, res) => {
  const recs = db.prepare(`
    SELECT r.*, act.name as activity_name, act.category, act.description, act.benefits, act.duration_minutes
    FROM recommendations r
    JOIN activities act ON r.activity_id = act.id
    WHERE r.resident_id = ?
    ORDER BY CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `).all(req.params.residentId);
  res.json(recs);
});

// Resident views their own recommendations
router.get('/my', requireRole('resident'), (req, res) => {
  const recs = db.prepare(`
    SELECT r.*, act.name as activity_name, act.category, act.description, act.benefits
    FROM recommendations r
    JOIN activities act ON r.activity_id = act.id
    WHERE r.resident_id = ?
    ORDER BY CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
  `).all(req.user.id);
  res.json(recs);
});

// Employee updates recommendation status
router.patch('/:id/status', requireRole('employee'), (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'scheduled', 'completed', 'declined'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const result = db.prepare('UPDATE recommendations SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Recommendation not found.' });
  res.json({ message: 'Status updated.' });
});

// Employee adds a manual recommendation
router.post('/', requireRole('employee'), (req, res) => {
  const { resident_id, activity_id, reason, priority } = req.body;
  if (!resident_id || !activity_id) return res.status(400).json({ error: 'resident_id and activity_id are required.' });
  try {
    const result = db.prepare(
      'INSERT INTO recommendations (resident_id, activity_id, reason, priority) VALUES (?, ?, ?, ?)'
    ).run(resident_id, activity_id, reason || null, priority || 'medium');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Recommendation added.' });
  } catch {
    res.status(500).json({ error: 'Failed to add recommendation.' });
  }
});

// Employee or resident triggers AI regeneration for a resident
router.post('/regenerate/:residentId', authenticateToken, async (req, res) => {
  const residentId = parseInt(req.params.residentId, 10);

  // Employees can regenerate for any resident; residents only for themselves
  if (req.user.role === 'resident' && req.user.id !== residentId) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    return res.status(503).json({ error: 'AI recommendations are not configured. Add your ANTHROPIC_API_KEY to server/.env and restart the server.' });
  }

  try {
    const recs = await generateRecommendations(residentId);
    res.json({ message: `AI generated ${recs.length} recommendations.`, count: recs.length });
  } catch (err) {
    console.error('AI regeneration error:', err.message);
    const detail = err.status === 401 ? 'Invalid API key.' : err.status === 429 ? 'Rate limit hit — try again in a moment.' : err.message;
    res.status(500).json({ error: `AI generation failed: ${detail}` });
  }
});

module.exports = router;
