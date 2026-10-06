const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'assessment.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('resident', 'employee')),
    room_number TEXT,
    department TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'easy' CHECK(difficulty_level IN ('easy', 'moderate', 'active')),
    benefits TEXT,
    duration_minutes INTEGER DEFAULT 60,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    interest_level TEXT NOT NULL CHECK(interest_level IN ('not_interested', 'somewhat', 'very_interested')),
    notes TEXT,
    assessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    UNIQUE(resident_id, activity_id)
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_id INTEGER NOT NULL,
    activity_id INTEGER NOT NULL,
    reason TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'declined')),
    source TEXT DEFAULT 'manual' CHECK(source IN ('manual', 'ai')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id),
    FOREIGN KEY (activity_id) REFERENCES activities(id)
  );
`);

// Add source column to existing databases that predate this migration
try {
  db.exec("ALTER TABLE recommendations ADD COLUMN source TEXT DEFAULT 'manual'");
} catch {
  // Column already exists — safe to ignore
}

// Seed default activities if none exist
const activityCount = db.prepare('SELECT COUNT(*) as count FROM activities').get();
if (activityCount.count === 0) {
  const insertActivity = db.prepare(
    'INSERT INTO activities (name, description, category, difficulty_level, benefits, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const seedActivities = db.transaction(() => {
    const activities = [
      // Physical
      ['Chair Yoga', 'Gentle yoga adapted for seated or standing with chair support', 'Physical', 'easy', 'Improves flexibility, balance, and relaxation', 45],
      ['Walking Club', 'Group walks around the facility or nearby paths', 'Physical', 'moderate', 'Cardiovascular health, social connection, fresh air', 60],
      ['Gentle Stretching', 'Light stretching exercises to maintain mobility', 'Physical', 'easy', 'Improves range of motion and reduces stiffness', 30],
      ['Dance Therapy', 'Movement and dance to music in a group setting', 'Physical', 'moderate', 'Physical fitness, joy, social bonding', 60],
      // Social
      ['Bingo', 'Classic bingo game with prizes and social fun', 'Social', 'easy', 'Mental alertness, social engagement, fun', 60],
      ['Card Games', 'Bridge, poker, rummy, and other card games', 'Social', 'easy', 'Cognitive stimulation, social connection', 90],
      ['Movie Nights', 'Watching films together and discussing afterward', 'Social', 'easy', 'Entertainment, conversation, shared experience', 120],
      ['Book Club', 'Monthly book discussions and reading sessions', 'Social', 'easy', 'Cognitive engagement, social discussion', 60],
      // Creative
      ['Painting & Art', 'Watercolor, acrylic, or craft painting sessions', 'Creative', 'easy', 'Creativity, focus, self-expression', 90],
      ['Knitting & Crafts', 'Knitting, crocheting, and other handcrafts', 'Creative', 'easy', 'Fine motor skills, relaxation, productivity', 60],
      ['Gardening Club', 'Tending to indoor plants or outdoor garden beds', 'Creative', 'moderate', 'Connection to nature, physical activity, nurturing', 60],
      ['Cooking Class', 'Simple cooking and baking sessions', 'Creative', 'moderate', 'Independence, creativity, enjoyment', 90],
      // Mental
      ['Puzzles', 'Jigsaw puzzles, crosswords, and brain teasers', 'Mental', 'easy', 'Cognitive stimulation, focus, patience', 60],
      ['Trivia Games', 'Group trivia on various topics', 'Mental', 'easy', 'Memory recall, fun competition, social engagement', 60],
      ['Memory Games', 'Activities specifically designed to strengthen memory', 'Mental', 'easy', 'Memory retention, mental exercise', 45],
      ['Reading Circle', 'Quiet reading with optional group discussion', 'Mental', 'easy', 'Relaxation, mental stimulation, imagination', 60],
      // Music
      ['Music Appreciation', 'Listening to and discussing different genres of music', 'Music', 'easy', 'Emotional wellbeing, memory, relaxation', 60],
      ['Sing-Along Sessions', 'Group singing of familiar songs', 'Music', 'easy', 'Joy, social bonding, breath control', 60],
      ['Drum Circle', 'Rhythm and percussion activity for all skill levels', 'Music', 'easy', 'Rhythm, coordination, group connection', 45],
      // Wellness
      ['Meditation & Mindfulness', 'Guided meditation and breathing exercises', 'Wellness', 'easy', 'Stress reduction, mental clarity, relaxation', 30],
      ['Pet Therapy', 'Visits and interaction with therapy animals', 'Wellness', 'easy', 'Emotional comfort, joy, reduced anxiety', 45],
      ['Reminiscence Therapy', 'Sharing life stories and memories in a group', 'Wellness', 'easy', 'Self-worth, connection, cognitive engagement', 60],
    ];
    for (const a of activities) insertActivity.run(...a);
  });
  seedActivities();
}

module.exports = db;
