const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_12345';
const testDbPath = path.resolve(__dirname, 'test.db');
process.env.DATABASE_PATH = testDbPath;

// Clean up any previous test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { getDb, resetDb } = require('../src/config/db');
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  // Initialize test database
  getDb(testDbPath);

  // Start HTTP server on random available port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  resetDb();
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      // ignore
    }
  }
});

// Helper for HTTP requests
async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  let data;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data
  };
}

describe('TaskFlow REST API Comprehensive Test Suite', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = null;
  let userBId = null;
  let createdTaskId = null;

  test('GET /api/health should return 200 and healthy status', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
    assert.ok(res.body.timestamp);
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register should create a user and return JWT token', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'alice_dev',
          email: 'alice@example.com',
          password: 'password123'
        }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.username, 'alice_dev');
      assert.equal(res.body.data.user.email, 'alice@example.com');
      assert.equal(res.body.data.user.password_hash, undefined, 'Password hash must never be returned');

      userAToken = res.body.data.token;
      userAId = res.body.data.user.id;
    });

    test('POST /api/auth/register should register second user', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'bob_dev',
          email: 'bob@example.com',
          password: 'password123'
        }
      });

      assert.equal(res.status, 201);
      userBToken = res.body.data.token;
      userBId = res.body.data.user.id;
    });

    test('POST /api/auth/register should fail when email is invalid (400)', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'charlie',
          email: 'invalid-email-address',
          password: 'password123'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error, 'Validation Error');
      assert.ok(res.body.errors.some((e) => e.field === 'email'));
    });

    test('POST /api/auth/register should fail when password is less than 6 chars (400)', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'charlie',
          email: 'charlie@example.com',
          password: '123'
        }
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'password'));
    });

    test('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'alice_new',
          email: 'alice@example.com',
          password: 'password123'
        }
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'Conflict');
    });

    test('POST /api/auth/register should reject duplicate username with 409 Conflict', async () => {
      const res = await request('/api/auth/register', {
        method: 'POST',
        body: {
          username: 'alice_dev',
          email: 'another_email@example.com',
          password: 'password123'
        }
      });

      assert.equal(res.status, 409);
      assert.equal(res.body.error, 'Conflict');
    });

    test('POST /api/auth/login should authenticate with email and return token', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: {
          identifier: 'alice@example.com',
          password: 'password123'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.email, 'alice@example.com');
    });

    test('POST /api/auth/login should authenticate with username', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: {
          identifier: 'alice_dev',
          password: 'password123'
        }
      });

      assert.equal(res.status, 200);
      assert.ok(res.body.data.token);
    });

    test('POST /api/auth/login should reject incorrect password with 401 Unauthorized', async () => {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: {
          identifier: 'alice@example.com',
          password: 'wrong_password'
        }
      });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    test('GET /api/auth/me should return current user profile with valid token', async () => {
      const res = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.id, userAId);
      assert.equal(res.body.data.user.username, 'alice_dev');
    });
  });

  describe('Route Protection & Auth Middleware', () => {
    test('GET /api/tasks without token should return 401 Unauthorized', async () => {
      const res = await request('/api/tasks');
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Authentication Required');
    });

    test('GET /api/tasks with malformed token header should return 401 Unauthorized', async () => {
      const res = await request('/api/tasks', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Invalid Token Format');
    });

    test('GET /api/tasks with invalid JWT should return 401 Unauthorized', async () => {
      const res = await request('/api/tasks', {
        headers: { Authorization: 'Bearer this.is.an.invalid.token' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Invalid Token');
    });
  });

  describe('Tasks CRUD & Input Validation', () => {
    test('POST /api/tasks should create a task with valid payload (201 Created)', async () => {
      const res = await request('/api/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          title: 'Implement Unit Tests',
          description: 'Write tests for auth and task endpoints',
          status: 'in_progress',
          priority: 'high',
          dueDate: '2026-12-31'
        }
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.task.title, 'Implement Unit Tests');
      assert.equal(res.body.data.task.status, 'in_progress');
      assert.equal(res.body.data.task.priority, 'high');
      assert.equal(res.body.data.task.userId, userAId);

      createdTaskId = res.body.data.task.id;
    });

    test('POST /api/tasks should reject missing title with 400 Bad Request', async () => {
      const res = await request('/api/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          description: 'No title provided',
          status: 'pending'
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
      assert.ok(res.body.errors.some((e) => e.field === 'title'));
    });

    test('POST /api/tasks should reject invalid status with 400 Bad Request', async () => {
      const res = await request('/api/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          title: 'Test Status',
          status: 'not_a_valid_status'
        }
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'status'));
    });

    test('POST /api/tasks should reject invalid dueDate format with 400 Bad Request', async () => {
      const res = await request('/api/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          title: 'Test Date',
          dueDate: 'invalid-date'
        }
      });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'dueDate'));
    });

    test('GET /api/tasks should list tasks for authenticated user (200 OK)', async () => {
      const res = await request('/api/tasks', {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.tasks));
      assert.equal(res.body.data.tasks.length, 1);
      assert.equal(res.body.data.tasks[0].id, createdTaskId);
      assert.ok(res.body.data.pagination);
    });

    test('GET /api/tasks/:id should fetch single task (200 OK)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.task.id, createdTaskId);
      assert.equal(res.body.data.task.title, 'Implement Unit Tests');
    });

    test('GET /api/tasks/:id with non-existent id should return 404 Not Found', async () => {
      const res = await request('/api/tasks/99999', {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');
    });

    test('GET /api/tasks/invalid-id should return 400 Bad Request', async () => {
      const res = await request('/api/tasks/abc', {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Invalid Parameter');
    });

    test('PUT /api/tasks/:id should perform full update (200 OK)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          title: 'Complete and Document Tests',
          description: 'Fully documented test suite with coverage',
          status: 'completed',
          priority: 'medium',
          dueDate: '2026-10-20'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.task.title, 'Complete and Document Tests');
      assert.equal(res.body.data.task.status, 'completed');
    });

    test('PATCH /api/tasks/:id should perform partial update (200 OK)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {
          priority: 'high'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.task.priority, 'high');
      assert.equal(res.body.data.task.title, 'Complete and Document Tests');
    });

    test('PATCH /api/tasks/:id with empty payload should return 400 Bad Request', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: {}
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Validation Error');
    });

    test('GET /api/tasks/stats/summary should return correct aggregate stats', async () => {
      const res = await request('/api/tasks/stats/summary', {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.stats.total, 1);
      assert.equal(res.body.data.stats.byStatus.completed, 1);
      assert.equal(res.body.data.stats.byPriority.high, 1);
    });
  });

  describe('Multi-tenant User Isolation & Data Protection', () => {
    test('User B cannot view User A task (404 Not Found)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        headers: { Authorization: `Bearer ${userBToken}` }
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.error, 'Not Found');
    });

    test('User B cannot update User A task (404 Not Found)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${userBToken}` },
        body: {
          title: 'Malicious Overwrite'
        }
      });

      assert.equal(res.status, 404);
    });

    test('User B cannot delete User A task (404 Not Found)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userBToken}` }
      });

      assert.equal(res.status, 404);
    });

    test('User B task list is empty and does not expose User A tasks', async () => {
      const res = await request('/api/tasks', {
        headers: { Authorization: `Bearer ${userBToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.tasks.length, 0);
      assert.equal(res.body.data.pagination.total, 0);
    });
  });

  describe('Task Deletion', () => {
    test('DELETE /api/tasks/:id deletes task for owner (200 OK)', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    test('GET /api/tasks/:id after deletion returns 404 Not Found', async () => {
      const res = await request(`/api/tasks/${createdTaskId}`, {
        headers: { Authorization: `Bearer ${userAToken}` }
      });

      assert.equal(res.status, 404);
    });
  });
});
