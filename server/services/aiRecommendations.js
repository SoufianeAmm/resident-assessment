const db = require('../db/database');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// JSON schema passed to Ollama so the model is forced to return valid structured output
const responseSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          activity_id: { type: 'integer' },
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['activity_id', 'reason', 'priority'],
      },
    },
  },
  required: ['recommendations'],
};

// Activities list is stable — cache it as a prompt prefix for reuse
function getAllActivities() {
  return db.prepare('SELECT id, name, category, difficulty_level, description, benefits FROM activities ORDER BY category, name').all();
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

  // Small local models don't reliably follow "never recommend disliked activities",
  // so remove those from the candidate list before the model ever sees them.
  const excludedIds = new Set(
    assessments.filter((a) => a.rating <= 2 || a.interest_level === 'not_interested').map((a) => a.activity_id)
  );
  const candidates = getAllActivities().filter((a) => !excludedIds.has(a.id));
  if (candidates.length === 0) throw new Error('No eligible activities to recommend');
  const activitiesJson = JSON.stringify(candidates, null, 2);

  const systemPrompt = `You are a compassionate life enrichment coordinator at a senior living facility.
Your job is to recommend activities for residents based on their personal interests and assessment ratings.
Always respond with ONLY valid JSON — no markdown, no explanation, just the JSON.`;

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
{ "recommendations": [
  { "activity_id": 3, "reason": "...", "priority": "high" },
  ...
] }`;

  let response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: responseSchema,
        options: { temperature: 0.4 },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch {
    throw new Error(`Cannot reach Ollama at ${OLLAMA_URL}. Is Ollama running?`);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 404) throw new Error(`Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`);
    throw new Error(`Ollama error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const raw = data.message.content.trim();
  // Strip markdown code fences if the model wraps the JSON
  const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(json);
  let recs = Array.isArray(parsed) ? parsed : parsed.recommendations;

  if (!Array.isArray(recs)) throw new Error('AI returned non-array response');

  // Local models can hallucinate ids — keep only real, unique activities
  // Keep only real, eligible activities (drops hallucinated ids and anything the resident disliked)
  const validIds = new Set(candidates.map((a) => a.id));
  const seen = new Set();
  recs = recs.filter((r) => validIds.has(r.activity_id) && !seen.has(r.activity_id) && seen.add(r.activity_id)).slice(0, 5);
  if (recs.length === 0) throw new Error('AI returned no valid activities');

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
