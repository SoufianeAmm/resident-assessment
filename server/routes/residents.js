const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Employee gets all residents with their assessment stats
router.get('/', requireRole('employee'), (req, res) => {
  const residents = db.prepare(`
    SELECT u.id, u.name, u.email, u.room_number, u.created_at,
      COUNT(DISTINCT a.id) as assessments_done,
      COUNT(DISTINCT r.id) as recommendations_count,
      ROUND(AVG(a.rating), 1) as avg_rating
    FROM users u
    LEFT JOIN assessments a ON u.id = a.resident_id
    LEFT JOIN recommendations r ON u.id = r.resident_id AND r.status = 'pending'
    WHERE u.role = 'resident'
    GROUP BY u.id
    ORDER BY u.name
  `).all();
  res.json(residents);
});

// Employee gets a single resident profile
router.get('/:id', requireRole('employee'), (req, res) => {
  const resident = db.prepare(
    'SELECT id, name, email, room_number, created_at FROM users WHERE id = ? AND role = \'resident\''
  ).get(req.params.id);
  if (!resident) return res.status(404).json({ error: 'Resident not found.' });
  res.json(resident);
});

// Get current user profile (both roles)
router.get('/me/profile', (req, res) => {
  const user = db.prepare(
    'SELECT id, name, email, role, room_number, department, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(user);
});

module.exports = router;
