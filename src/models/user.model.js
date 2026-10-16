const { getDb } = require('../config/db');

class UserModel {
  static create({ username, email, passwordHash }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(username.trim(), email.trim().toLowerCase(), passwordHash);
    const userId = Number(result.lastInsertRowid);

    return this.findById(userId);
  }

  static findById(id) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, username, email, created_at
      FROM users
      WHERE id = ?
    `);
    const user = stmt.get(id);
    return user || null;
  }

  static findByEmail(email) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, created_at
      FROM users
      WHERE email = ?
    `);
    const user = stmt.get(email.trim().toLowerCase());
    return user || null;
  }

  static findByUsername(username) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, created_at
      FROM users
      WHERE username = ?
    `);
    const user = stmt.get(username.trim());
    return user || null;
  }

  static findByEmailOrUsername(identifier) {
    const db = getDb();
    const clean = identifier.trim();
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash, created_at
      FROM users
      WHERE email = ? OR username = ?
    `);
    const user = stmt.get(clean.toLowerCase(), clean);
    return user || null;
  }
}

module.exports = UserModel;
