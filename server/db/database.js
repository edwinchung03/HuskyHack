const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../diary.sqlite');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    UNIQUE NOT NULL,
      title       TEXT    DEFAULT '',
      body        TEXT    DEFAULT '',
      audio_path  TEXT,
      image_path  TEXT,
      mood_label  TEXT    DEFAULT 'neutral',
      mood_color  TEXT    DEFAULT '#6C757D',
      mood_shape  TEXT    DEFAULT 'diamond',
      ai_summary  TEXT,
      ai_reflection TEXT,
      image_prompt  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      title            TEXT    NOT NULL,
      assumption       TEXT    NOT NULL,
      expected_outcome TEXT,
      context          TEXT,
      follow_up_date   TEXT,
      status           TEXT    DEFAULT 'pending',
      actual_outcome   TEXT,
      confidence       TEXT    DEFAULT 'medium',
      core_bet         TEXT,
      blind_spots      TEXT,
      ai_questions     TEXT,
      ai_analysis      TEXT,
      ai_reflection    TEXT,
      mood_label       TEXT    DEFAULT 'confident',
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = { getDb };
