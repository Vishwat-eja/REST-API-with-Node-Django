const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let dbInstance = null;

function getDb(customPath) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DATABASE_PATH || './data/tasks.db';

  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(process.cwd(), dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath === ':memory:' ? ':memory:' : path.resolve(process.cwd(), dbPath));

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
    } catch {
      // WAL might not be supported in some environments, ignore
    }
  }

  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      due_date TEXT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
  `);

  dbInstance = db;
  return dbInstance;
}

// Reset instance helper (useful for isolated tests)
function resetDb() {
  dbInstance = null;
}

module.exports = {
  getDb,
  resetDb
};
