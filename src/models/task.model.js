const { getDb } = require('../config/db');

class TaskModel {
  static create({ userId, title, description = '', status = 'pending', priority = 'medium', dueDate = null }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, description, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      title.trim(),
      description ? description.trim() : '',
      status,
      priority,
      dueDate || null
    );

    const taskId = Number(result.lastInsertRowid);
    return this.findByIdAndUser(taskId, userId);
  }

  static findByIdAndUser(id, userId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT id, user_id AS userId, title, description, status, priority, due_date AS dueDate, created_at AS createdAt, updated_at AS updatedAt
      FROM tasks
      WHERE id = ? AND user_id = ?
    `);
    const task = stmt.get(id, userId);
    return task || null;
  }

  static findAllByUser(userId, options = {}) {
    const db = getDb();
    const {
      status,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'DESC',
      limit = 20,
      offset = 0
    } = options;

    const conditions = ['user_id = ?'];
    const params = [userId];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (search && search.trim()) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const pattern = `%${search.trim()}%`;
      params.push(pattern, pattern);
    }

    const sortColumnsMap = {
      id: 'id',
      title: 'title',
      status: 'status',
      priority: 'priority',
      dueDate: 'due_date',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    const sortColumn = sortColumnsMap[sortBy] || 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClause = conditions.join(' AND ');

    const countStmt = db.prepare(`
      SELECT COUNT(*) AS total
      FROM tasks
      WHERE ${whereClause}
    `);
    const countResult = countStmt.get(...params);
    const total = countResult ? countResult.total : 0;

    const query = `
      SELECT id, user_id AS userId, title, description, status, priority, due_date AS dueDate, created_at AS createdAt, updated_at AS updatedAt
      FROM tasks
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const tasksStmt = db.prepare(query);
    const tasks = tasksStmt.all(...params, limit, offset);

    return {
      tasks,
      pagination: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  static update(id, userId, updates = {}) {
    const db = getDb();
    const setClauses = ['updated_at = datetime(\'now\')'];
    const params = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      params.push(updates.title.trim());
    }

    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description !== null ? updates.description.trim() : '');
    }

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }

    if (updates.priority !== undefined) {
      setClauses.push('priority = ?');
      params.push(updates.priority);
    }

    if (updates.dueDate !== undefined) {
      setClauses.push('due_date = ?');
      params.push(updates.dueDate || null);
    }

    params.push(id, userId);

    const query = `
      UPDATE tasks
      SET ${setClauses.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const stmt = db.prepare(query);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return null;
    }

    return this.findByIdAndUser(id, userId);
  }

  static delete(id, userId) {
    const db = getDb();
    const stmt = db.prepare(`
      DELETE FROM tasks
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }

  static getStatsByUser(userId) {
    const db = getDb();
    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?');
    const total = totalStmt.get(userId).count;

    const byStatusStmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
      GROUP BY status
    `);
    const statusRows = byStatusStmt.all(userId);
    const byStatus = { pending: 0, in_progress: 0, completed: 0 };
    for (const row of statusRows) {
      byStatus[row.status] = row.count;
    }

    const byPriorityStmt = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
      GROUP BY priority
    `);
    const priorityRows = byPriorityStmt.all(userId);
    const byPriority = { low: 0, medium: 0, high: 0 };
    for (const row of priorityRows) {
      byPriority[row.priority] = row.count;
    }

    const overdueStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
        AND status != 'completed'
        AND due_date IS NOT NULL
        AND date(due_date) < date('now')
    `);
    const overdue = overdueStmt.get(userId).count;

    return {
      total,
      byStatus,
      byPriority,
      overdue
    };
  }
}

module.exports = TaskModel;
