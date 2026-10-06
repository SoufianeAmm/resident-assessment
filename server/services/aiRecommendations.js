const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db/database');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Activities list is stable — cache it as a prompt prefix for reuse
let cachedActivitiesBlock = null;
function getActivitiesBlock() {
  if (!cachedActivitiesBlock) {
    const activities = db.prepare('SELECT id, name, category, difficulty_level, description, benefits FROM activities ORDER BY category, name').all();
    cachedActivitiesBlock = JSON.stringify(activities, null, 2);
  }
  return cachedActivitiesBlock;
}

async function generateRecommendations(residentId) {
  const resident = db.prepare('SELECT id, name FROM users WHERE id = ? AND role = ?').get(residentId, 'resident');
  if (!resident) throw new Error('Resident not found');

  const assessments = db.prepare(`
    SELECT a.activity_id, a.rating, a.interest_level, a.notes, act.name, act.category
    FROM assessments a JOIN activities act ON a.activity_id = act.id
    WHERE a.resident_id = ?
    ORDER BY a.rating DESC
  `).all(residentId);

  const activitiesJson = getActivitiesBlock();

  const systemPrompt = `You are a compassionate life enrichment coordinator at a senior living facility.
Your job is to recommend activities for residents based on their personal interests and assessment ratings.
Always respond with ONLY a valid JSON array — no markdown, no explanation, just the JSON.`;

  const userPrompt = `Resident: ${resident.name}

Their activity assessments so far:
${assessments.length === 0
  ? 'No assessments yet — recommend a balanced variety of beginner-friendly activities.'
  : assessments.map(a =>
      `- "${a.name}" (${a.category}): ${a.rating}/5 stars, interest: ${a.interest_level}${a.notes ? `, note: "${a.notes}"` : ''}`
    ).join('\n')
}

All available activities:
${activitiesJson}

Rules:
1. Recommend exactly 5 activities from the list above (use their real id values).
2. Prioritize activities in categories the resident rated highly (4–5 stars or very_interested).
3. Never recommend an activity they rated 1–2 stars or marked not_interested.
4. Include variety — do not repeat the same category more than twice.
5. For residents with no assessments, choose easy difficulty activities across different categories.
6. Each reason must be warm, personal, and 1–2 sentences — reference their specific interests if known.
7. priority must be "high", "medium", or "low". Use "high" for activities closely matching their top interests.

Return this exact JSON shape:
[
  { "activity_id": 3, "reason": "...", "priority": "high" },
  ...
]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        // Cache the system prompt — it never changes between calls
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].text.trim();
  // Strip markdown code fences if the model wraps the JSON
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const recs = JSON.parse(json);

  if (!Array.isArray(recs)) throw new Error('AI returned non-array response');

  applyRecommendations(residentId, recs);
  return recs;
}

function applyRecommendations(residentId, recs) {
  // IDs the AI wants active for this resident
  const aiActivityIds = recs.map((r) => r.activity_id);

  // Remove stale AI-pending recs that are no longer in the new list
  const existing = db.prepare(
    "SELECT id, activity_id FROM recommendations WHERE resident_id = ? AND source = 'ai' AND status = 'pending'"
  ).all(residentId);

  const staleIds = existing
    .filter((r) => !aiActivityIds.includes(r.activity_id))
    .map((r) => r.id);

  if (staleIds.length > 0) {
    db.prepare(`DELETE FROM recommendations WHERE id IN (${staleIds.map(() => '?').join(',')})`).run(...staleIds);
  }

  // Upsert each AI recommendation
  const upsert = db.prepare(`
    INSERT INTO recommendations (resident_id, activity_id, reason, priority, source, status)
    VALUES (?, ?, ?, ?, 'ai', 'pending')
    ON CONFLICT DO NOTHING
  `);

  const update = db.prepare(`
    UPDATE recommendations
    SET reason = ?, priority = ?, status = 'pending', created_at = CURRENT_TIMESTAMP
    WHERE resident_id = ? AND activity_id = ? AND source = 'ai' AND status = 'pending'
  `);

  const transact = db.transaction(() => {
    for (const rec of recs) {
      const rows = update.run(rec.reason, rec.priority, residentId, rec.activity_id);
      if (rows.changes === 0) {
        upsert.run(residentId, rec.activity_id, rec.reason, rec.priority);
      }
    }
  });
  transact();
}

module.exports = { generateRecommendations };
