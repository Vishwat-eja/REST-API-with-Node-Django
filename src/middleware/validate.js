const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const VALID_STATUSES = ['pending', 'in_progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function validateRegister(req, res, next) {
  const { username, email, password } = req.body || {};
  const errors = [];

  if (!username || typeof username !== 'string' || !username.trim()) {
    errors.push({ field: 'username', message: 'Username is required.' });
  } else if (!USERNAME_REGEX.test(username.trim())) {
    errors.push({
      field: 'username',
      message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.'
    });
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address.' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters long.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Validation failed for one or more fields.',
      errors
    });
  }

  next();
}

function validateLogin(req, res, next) {
  const { identifier, email, username, password } = req.body || {};
  const loginIdentifier = identifier || email || username;
  const errors = [];

  if (!loginIdentifier || typeof loginIdentifier !== 'string' || !loginIdentifier.trim()) {
    errors.push({ field: 'identifier', message: 'Email or username is required.' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Validation failed for one or more fields.',
      errors
    });
  }

  req.loginIdentifier = loginIdentifier.trim();
  next();
}

function validateTaskId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Parameter',
      message: 'Task ID must be a positive integer.'
    });
  }
  req.taskId = id;
  next();
}

function validateCreateTask(req, res, next) {
  const { title, description, status, priority, dueDate } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push({ field: 'title', message: 'Title is required and cannot be empty.' });
  } else if (title.trim().length > 150) {
    errors.push({ field: 'title', message: 'Title cannot exceed 150 characters.' });
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (description.length > 1000) {
      errors.push({ field: 'description', message: 'Description cannot exceed 1000 characters.' });
    }
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }
  }

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`
      });
    }
  }

  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    const timestamp = Date.parse(dueDate);
    if (isNaN(timestamp)) {
      errors.push({
        field: 'dueDate',
        message: 'dueDate must be a valid ISO date string (e.g. 2026-12-31).'
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Validation failed for one or more fields.',
      errors
    });
  }

  next();
}

function validatePutTask(req, res, next) {
  const { title, description, status, priority, dueDate } = req.body || {};
  const errors = [];

  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push({ field: 'title', message: 'Title is required for full update.' });
  } else if (title.trim().length > 150) {
    errors.push({ field: 'title', message: 'Title cannot exceed 150 characters.' });
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (description.length > 1000) {
      errors.push({ field: 'description', message: 'Description cannot exceed 1000 characters.' });
    }
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }
  }

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`
      });
    }
  }

  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    const timestamp = Date.parse(dueDate);
    if (isNaN(timestamp)) {
      errors.push({
        field: 'dueDate',
        message: 'dueDate must be a valid ISO date string (e.g. 2026-12-31).'
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Validation failed for one or more fields.',
      errors
    });
  }

  next();
}

function validatePatchTask(req, res, next) {
  const body = req.body || {};
  const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
  const providedFields = Object.keys(body).filter((key) => allowedFields.includes(key));

  if (providedFields.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'At least one field to update must be provided (title, description, status, priority, or dueDate).'
    });
  }

  const errors = [];

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      errors.push({ field: 'title', message: 'Title cannot be empty.' });
    } else if (body.title.trim().length > 150) {
      errors.push({ field: 'title', message: 'Title cannot exceed 150 characters.' });
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (body.description.length > 1000) {
      errors.push({ field: 'description', message: 'Description cannot exceed 1000 characters.' });
    }
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`
      });
    }
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(body.priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`
      });
    }
  }

  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '') {
    const timestamp = Date.parse(body.dueDate);
    if (isNaN(timestamp)) {
      errors.push({
        field: 'dueDate',
        message: 'dueDate must be a valid ISO date string (e.g. 2026-12-31).'
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Validation failed for one or more fields.',
      errors
    });
  }

  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateTaskId,
  validateCreateTask,
  validatePutTask,
  validatePatchTask,
  VALID_STATUSES,
  VALID_PRIORITIES
};
