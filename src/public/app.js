// TaskFlow Interactive API Console Logic

const state = {
  token: localStorage.getItem('taskflow_token') || null,
  user: null,
  lastResponse: null,
  tasks: []
};

// DOM Elements
const authStatusChip = document.getElementById('auth-status-chip');
const authStatusText = document.getElementById('auth-status-text');
const logoutBtn = document.getElementById('logout-btn');
const tokenDisplay = document.getElementById('token-display');
const btnCopyToken = document.getElementById('btn-copy-token');
const headerAuthVal = document.getElementById('header-auth-val');
const chkIncludeAuth = document.getElementById('chk-include-auth');

const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');

const endpointSelect = document.getElementById('endpoint-select');
const currentMethod = document.getElementById('current-method');
const requestUrlInput = document.getElementById('request-url-input');
const requestBodyInput = document.getElementById('request-body-input');
const btnSendRequest = document.getElementById('btn-send-request');

const responseStatusBadge = document.getElementById('response-status-badge');
const responseTime = document.getElementById('response-time');
const responseOutput = document.getElementById('response-output');
const btnCopyCurl = document.getElementById('btn-copy-curl');
const btnCopyResponse = document.getElementById('btn-copy-response');

const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statProgress = document.getElementById('stat-progress');
const statPending = document.getElementById('stat-pending');
const btnRefreshStats = document.getElementById('btn-refresh-stats');

const tasksGrid = document.getElementById('tasks-grid');
const tasksEmptyState = document.getElementById('tasks-empty-state');
const btnRefreshTaskList = document.getElementById('btn-refresh-task-list');

const createModal = document.getElementById('create-modal');
const btnQuickCreateModal = document.getElementById('btn-quick-create-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const formQuickCreate = document.getElementById('form-quick-create');
const toastEl = document.getElementById('toast');

// Presets
const ENDPOINT_CONFIGS = {
  'tasks-list': {
    method: 'GET',
    url: '/api/tasks',
    body: '',
    requiresAuth: true
  },
  'tasks-create': {
    method: 'POST',
    url: '/api/tasks',
    body: JSON.stringify({
      title: 'Complete REST API Documentation',
      description: 'Document endpoints with status codes, payload shapes, and curl examples.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
    }, null, 2),
    requiresAuth: true
  },
  'tasks-get': {
    method: 'GET',
    url: '/api/tasks/1',
    body: '',
    requiresAuth: true
  },
  'tasks-update': {
    method: 'PUT',
    url: '/api/tasks/1',
    body: JSON.stringify({
      title: 'Updated REST API Implementation',
      description: 'All CRUD routes verified and tested with SQLite.',
      status: 'completed',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0]
    }, null, 2),
    requiresAuth: true
  },
  'tasks-patch': {
    method: 'PATCH',
    url: '/api/tasks/1',
    body: JSON.stringify({
      status: 'completed'
    }, null, 2),
    requiresAuth: true
  },
  'tasks-delete': {
    method: 'DELETE',
    url: '/api/tasks/1',
    body: '',
    requiresAuth: true
  },
  'tasks-stats': {
    method: 'GET',
    url: '/api/tasks/stats/summary',
    body: '',
    requiresAuth: true
  },
  'auth-register': {
    method: 'POST',
    url: '/api/auth/register',
    body: JSON.stringify({
      username: 'dev_user_' + Math.floor(Math.random() * 900 + 100),
      email: 'dev' + Math.floor(Math.random() * 900 + 100) + '@example.com',
      password: 'password123'
    }, null, 2),
    requiresAuth: false
  },
  'auth-login': {
    method: 'POST',
    url: '/api/auth/login',
    body: JSON.stringify({
      identifier: 'alex@example.com',
      password: 'password123'
    }, null, 2),
    requiresAuth: false
  },
  'auth-me': {
    method: 'GET',
    url: '/api/auth/me',
    body: '',
    requiresAuth: true
  }
};

// Toast notification helper
function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => {
    toastEl.className = 'toast';
  }, 3200);
}

// Update Auth UI
function updateAuthUI() {
  if (state.token) {
    authStatusChip.className = 'status-chip authenticated';
    authStatusText.textContent = state.user ? `${state.user.username} (Active)` : 'Authenticated';
    logoutBtn.style.display = 'inline-flex';
    tokenDisplay.textContent = state.token;
    tokenDisplay.className = 'token-display';
    btnCopyToken.disabled = false;
    headerAuthVal.textContent = `Bearer ${state.token.substring(0, 24)}...`;
    chkIncludeAuth.checked = true;
  } else {
    authStatusChip.className = 'status-chip unauthenticated';
    authStatusText.textContent = 'Not Authenticated';
    logoutBtn.style.display = 'none';
    tokenDisplay.textContent = 'No token active. Log in to authenticate requests.';
    tokenDisplay.className = 'token-display empty';
    btnCopyToken.disabled = true;
    headerAuthVal.textContent = 'None (Send unauthenticated to test 401)';
    chkIncludeAuth.checked = false;
  }
}

// Set Token
function setToken(token, user = null) {
  state.token = token;
  state.user = user;
  if (token) {
    localStorage.setItem('taskflow_token', token);
  } else {
    localStorage.removeItem('taskflow_token');
  }
  updateAuthUI();
  if (token) {
    fetchStats();
    fetchTasks();
  }
}

// Load Initial User if token exists
async function verifyActiveToken() {
  if (!state.token) return;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.user = data.data.user;
      updateAuthUI();
      fetchStats();
      fetchTasks();
    } else {
      // Token expired or invalid
      setToken(null);
    }
  } catch (err) {
    console.error('Token validation failed:', err);
  }
}

// Fetch Stats
async function fetchStats() {
  if (!state.token) return;
  try {
    const res = await fetch('/api/tasks/stats/summary', {
      headers: { Authorization: `Bearer ${state.token}` }
    });
    if (res.ok) {
      const json = await res.json();
      const stats = json.data.stats;
      statTotal.textContent = stats.total;
      statCompleted.textContent = stats.byStatus.completed || 0;
      statProgress.textContent = stats.byStatus.in_progress || 0;
      statPending.textContent = stats.byStatus.pending || 0;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// Fetch Tasks for Board
async function fetchTasks() {
  if (!state.token) {
    tasksEmptyState.style.display = 'block';
    tasksGrid.style.display = 'none';
    return;
  }

  try {
    const res = await fetch('/api/tasks?limit=50', {
      headers: { Authorization: `Bearer ${state.token}` }
    });

    if (res.ok) {
      const json = await res.json();
      state.tasks = json.data.tasks || [];
      renderTaskBoard();
    }
  } catch (err) {
    console.error('Error fetching tasks:', err);
  }
}

// Render Task Board
function renderTaskBoard() {
  if (!state.tasks || state.tasks.length === 0) {
    tasksEmptyState.style.display = 'block';
    tasksGrid.style.display = 'none';
    return;
  }

  tasksEmptyState.style.display = 'none';
  tasksGrid.style.display = 'grid';
  tasksGrid.innerHTML = '';

  state.tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'task-card';

    const statusBadgeClass =
      task.status === 'completed'
        ? 'badge-success'
        : task.status === 'in_progress'
        ? 'badge-warning'
        : 'badge-neutral';

    const priorityBadgeClass =
      task.priority === 'high'
        ? 'badge-danger'
        : task.priority === 'medium'
        ? 'badge-warning'
        : 'badge-neutral';

    const formattedDate = task.dueDate ? `📅 Due: ${task.dueDate}` : '📅 No due date';

    card.innerHTML = `
      <div>
        <div class="task-card-header">
          <span class="task-card-title">#${task.id} ${escapeHtml(task.title)}</span>
          <div class="task-card-badges">
            <span class="badge ${priorityBadgeClass}">${task.priority}</span>
            <span class="badge ${statusBadgeClass}">${task.status}</span>
          </div>
        </div>
        <p class="task-card-desc">${escapeHtml(task.description || 'No description provided.')}</p>
      </div>
      <div class="task-card-footer">
        <span>${formattedDate}</span>
        <div class="task-card-actions">
          <button class="btn btn-secondary btn-sm btn-quick-toggle" data-id="${task.id}" data-status="${task.status}">
            ${task.status === 'completed' ? '↺ Reopen' : '✓ Done'}
          </button>
          <button class="btn btn-secondary btn-sm btn-quick-inspect" data-id="${task.id}">🔍</button>
          <button class="btn btn-secondary btn-sm btn-quick-delete" data-id="${task.id}">🗑</button>
        </div>
      </div>
    `;

    tasksGrid.appendChild(card);
  });

  // Attach card event listeners
  document.querySelectorAll('.btn-quick-toggle').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const current = e.currentTarget.dataset.status;
      const nextStatus = current === 'completed' ? 'in_progress' : 'completed';
      await quickPatchStatus(id, nextStatus);
    });
  });

  document.querySelectorAll('.btn-quick-inspect').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      endpointSelect.value = 'tasks-get';
      applyEndpointConfig('tasks-get');
      requestUrlInput.value = `/api/tasks/${id}`;
      document.getElementById('param-id').value = id;
      sendApiRequest();
    });
  });

  document.querySelectorAll('.btn-quick-delete').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm(`Delete task #${id}?`)) {
        await quickDeleteTask(id);
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function quickPatchStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      showToast(`Task #${id} status updated to ${newStatus}`, 'success');
      fetchTasks();
      fetchStats();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to update task', 'error');
    }
  } catch (err) {
    showToast('Network error while updating task', 'error');
  }
}

async function quickDeleteTask(id) {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });
    if (res.ok) {
      showToast(`Task #${id} deleted`, 'info');
      fetchTasks();
      fetchStats();
    } else {
      const err = await res.json();
      showToast(err.message || 'Failed to delete task', 'error');
    }
  } catch (err) {
    showToast('Network error while deleting task', 'error');
  }
}

// Endpoint Selector change handler
function applyEndpointConfig(key) {
  const config = ENDPOINT_CONFIGS[key];
  if (!config) return;

  currentMethod.textContent = config.method;
  currentMethod.className = `method-tag method-${config.method.toLowerCase()}`;
  requestUrlInput.value = config.url;
  requestBodyInput.value = config.body;

  if (config.requiresAuth && state.token) {
    chkIncludeAuth.checked = true;
  }
}

endpointSelect.addEventListener('change', (e) => {
  applyEndpointConfig(e.target.value);
});

// Tab switching in Auth Card
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  formLogin.style.display = 'block';
  formRegister.style.display = 'none';
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  formRegister.style.display = 'block';
  formLogin.style.display = 'none';
});

// Request details tabs
document.querySelectorAll('.param-tab').forEach((tab) => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.param-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.param-pane').forEach((p) => p.classList.remove('active'));

    e.target.classList.add('active');
    const paneId = e.target.dataset.pane;
    document.getElementById(paneId).classList.add('active');
  });
});

// Preset Buttons
document.getElementById('preset-valid-task').addEventListener('click', () => {
  requestBodyInput.value = JSON.stringify({
    title: 'Deploy to Cloud Server',
    description: 'Set up reverse proxy with Nginx and SSL certificate',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-11-01'
  }, null, 2);
});

document.getElementById('preset-invalid-task').addEventListener('click', () => {
  // Empty title and invalid status to demonstrate validation error 400
  requestBodyInput.value = JSON.stringify({
    title: '',
    status: 'invalid_status_value',
    priority: 'ultra_high'
  }, null, 2);
});

document.getElementById('preset-sample-user').addEventListener('click', () => {
  const rand = Math.floor(Math.random() * 8999 + 1000);
  requestBodyInput.value = JSON.stringify({
    username: `coder_${rand}`,
    email: `coder_${rand}@example.com`,
    password: 'securePass123!'
  }, null, 2);
});

// URL Param Handlers
function updateUrlFromParams() {
  const base = requestUrlInput.value.split('?')[0];
  const params = new URLSearchParams();

  const status = document.getElementById('param-status').value;
  const priority = document.getElementById('param-priority').value;
  const search = document.getElementById('param-search').value;

  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (search) params.set('search', search);

  const query = params.toString();
  requestUrlInput.value = query ? `${base}?${query}` : base;
}

document.getElementById('param-status').addEventListener('change', updateUrlFromParams);
document.getElementById('param-priority').addEventListener('change', updateUrlFromParams);
document.getElementById('param-search').addEventListener('input', updateUrlFromParams);

document.getElementById('param-id').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  if (val) {
    requestUrlInput.value = requestUrlInput.value.replace(/\/api\/tasks(\/\d+)?/, `/api/tasks/${val}`);
  }
});

// Login Form Submit
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const json = await res.json();
    displayResponse(res.status, res.statusText, 0, json);

    if (res.ok && json.data && json.data.token) {
      setToken(json.data.token, json.data.user);
      showToast(`Welcome back, ${json.data.user.username}!`, 'success');
    } else {
      showToast(json.message || 'Login failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during login.', 'error');
  }
});

// Register Form Submit
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const json = await res.json();
    displayResponse(res.status, res.statusText, 0, json);

    if (res.ok && json.data && json.data.token) {
      setToken(json.data.token, json.data.user);
      showToast(`Account created! You are logged in as ${json.data.user.username}.`, 'success');
    } else {
      showToast(json.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during registration.', 'error');
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  setToken(null);
  showToast('Logged out successfully.', 'info');
});

// Copy Token
btnCopyToken.addEventListener('click', () => {
  if (state.token) {
    navigator.clipboard.writeText(state.token);
    showToast('Bearer token copied to clipboard!', 'success');
  }
});

// Send API Request (Console)
async function sendApiRequest() {
  const method = currentMethod.textContent.trim();
  const url = requestUrlInput.value.trim();
  const bodyText = requestBodyInput.value.trim();
  const includeAuth = chkIncludeAuth.checked;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (includeAuth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = {
    method,
    headers
  };

  if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
    try {
      // Validate JSON syntax locally before sending
      JSON.parse(bodyText);
      options.body = bodyText;
    } catch (parseErr) {
      // Still send as is to let user test server-side malformed JSON handling if they want!
      options.body = bodyText;
    }
  }

  btnSendRequest.disabled = true;
  btnSendRequest.textContent = 'Sending...';
  const startTime = performance.now();

  try {
    const res = await fetch(url, options);
    const duration = Math.round(performance.now() - startTime);
    let json;
    try {
      json = await res.json();
    } catch {
      json = { status: res.status, message: await res.text() };
    }

    displayResponse(res.status, res.statusText, duration, json);

    // If request was a login/register, auto capture token
    if (res.ok && json.data && json.data.token) {
      setToken(json.data.token, json.data.user);
    }

    // Refresh task list & stats if it was a task mutation
    if (url.startsWith('/api/tasks') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      fetchTasks();
      fetchStats();
    }
  } catch (networkErr) {
    const duration = Math.round(performance.now() - startTime);
    displayResponse(0, 'Network Error', duration, {
      error: 'Network Error',
      message: networkErr.message
    });
  } finally {
    btnSendRequest.disabled = false;
    btnSendRequest.textContent = 'Send Request 🚀';
  }
}

btnSendRequest.addEventListener('click', sendApiRequest);

// Display Response in JSON viewer
function displayResponse(status, statusText, duration, data) {
  state.lastResponse = data;

  // Status badge style
  let badgeClass = 'badge-neutral';
  if (status >= 200 && status < 300) badgeClass = 'badge-success';
  else if (status === 400) badgeClass = 'badge-warning';
  else if (status === 401 || status === 403 || status === 409) badgeClass = 'badge-danger';
  else if (status >= 500) badgeClass = 'badge-danger';

  responseStatusBadge.textContent = status ? `${status} ${statusText}` : 'Failed';
  responseStatusBadge.className = `badge ${badgeClass}`;
  responseTime.textContent = `${duration} ms`;

  responseOutput.textContent = JSON.stringify(data, null, 2);
}

// Copy JSON
btnCopyResponse.addEventListener('click', () => {
  if (state.lastResponse) {
    navigator.clipboard.writeText(JSON.stringify(state.lastResponse, null, 2));
    showToast('Response JSON copied!', 'success');
  }
});

// Copy cURL
btnCopyCurl.addEventListener('click', () => {
  const method = currentMethod.textContent.trim();
  const url = window.location.origin + requestUrlInput.value.trim();
  const bodyText = requestBodyInput.value.trim();
  const includeAuth = chkIncludeAuth.checked;

  let curl = `curl -X ${method} "${url}" \\\n  -H "Content-Type: application/json"`;

  if (includeAuth && state.token) {
    curl += ` \\\n  -H "Authorization: Bearer ${state.token}"`;
  }

  if (['POST', 'PUT', 'PATCH'].includes(method) && bodyText) {
    curl += ` \\\n  -d '${bodyText.replace(/'/g, "'\\''")}'`;
  }

  navigator.clipboard.writeText(curl);
  showToast('cURL command copied to clipboard!', 'success');
});

// Refresh buttons
btnRefreshStats.addEventListener('click', fetchStats);
btnRefreshTaskList.addEventListener('click', fetchTasks);

// Quick Create Modal
btnQuickCreateModal.addEventListener('click', () => {
  if (!state.token) {
    showToast('Please log in first to create tasks.', 'error');
    return;
  }
  createModal.style.display = 'flex';
});

btnCloseModal.addEventListener('click', () => {
  createModal.style.display = 'none';
});

btnCancelModal.addEventListener('click', () => {
  createModal.style.display = 'none';
});

formQuickCreate.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('modal-title').value.trim();
  const description = document.getElementById('modal-desc').value.trim();
  const status = document.getElementById('modal-status').value;
  const priority = document.getElementById('modal-priority').value;
  const dueDate = document.getElementById('modal-due').value;

  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify({
        title,
        description,
        status,
        priority,
        dueDate: dueDate || null
      })
    });

    const json = await res.json();
    if (res.ok) {
      showToast('Task created successfully!', 'success');
      createModal.style.display = 'none';
      formQuickCreate.reset();
      fetchTasks();
      fetchStats();
      displayResponse(res.status, res.statusText, 0, json);
    } else {
      showToast(json.message || 'Failed to create task.', 'error');
    }
  } catch (err) {
    showToast('Network error while creating task.', 'error');
  }
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  verifyActiveToken();
});
