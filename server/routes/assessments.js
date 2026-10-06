const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateRecommendations } = require('../services/aiRecommendations');

const router = express.Router();

router.use(authenticateToken);

// Resident submits or updates their assessment for an activity
router.post('/', requireRole('resident'), (req, res) => {
  const { activity_id, rating, interest_level, notes } = req.body;
  if (!activity_id || !rating || !interest_level) {
    return res.status(400).json({ error: 'activity_id, rating, and interest_level are required.' });
  }
  try {
    db.prepare(`
      INSERT INTO assessments (resident_id, activity_id, rating, interest_level, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(resident_id, activity_id) DO UPDATE SET
        rating = excluded.rating,
        interest_level = excluded.interest_level,
        notes = excluded.notes,
        assessed_at = CURRENT_TIMESTAMP
    `).run(req.user.id, activity_id, rating, interest_level, notes || null);

    res.status(201).json({ message: 'Assessment saved. AI recommendations updating...' });

    // Trigger AI recommendations asynchronously — only if key is configured
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
      generateRecommendations(req.user.id).catch((err) => {
        console.error(`AI recommendation error for resident ${req.user.id}:`, err.message);
      });
    }
  } catch {
    res.status(500).json({ error: 'Failed to save assessment.' });
  }
});

// Resident gets their own assessments
router.get('/my', requireRole('resident'), (req, res) => {
  const assessments = db.prepare(`
    SELECT a.*, act.name as activity_name, act.category, act.description
    FROM assessments a
    JOIN activities act ON a.activity_id = act.id
    WHERE a.resident_id = ?
    ORDER BY a.assessed_at DESC
  `).all(req.user.id);
  res.json(assessments);
});

// Employee views all assessments
router.get('/all', requireRole('employee'), (req, res) => {
  const assessments = db.prepare(`
    SELECT a.*, u.name as resident_name, u.room_number, act.name as activity_name, act.category
    FROM assessments a
    JOIN users u ON a.resident_id = u.id
    JOIN activities act ON a.activity_id = act.id
    ORDER BY a.assessed_at DESC
  `).all();
  res.json(assessments);
});

// Employee views assessments for a specific resident
router.get('/resident/:residentId', requireRole('employee'), (req, res) => {
  const assessments = db.prepare(`
    SELECT a.*, act.name as activity_name, act.category, act.description, act.benefits
    FROM assessments a
    JOIN activities act ON a.activity_id = act.id
    WHERE a.resident_id = ?
    ORDER BY a.rating DESC, a.assessed_at DESC
  `).all(req.params.residentId);
  res.json(assessments);
});

module.exports = router;
