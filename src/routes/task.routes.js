const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/task.controller');
const { authenticateToken } = require('../middleware/auth');
const {
  validateTaskId,
  validateCreateTask,
  validatePutTask,
  validatePatchTask
} = require('../middleware/validate');

// All task routes require authentication
router.use(authenticateToken);

// Task statistics endpoint (placed before :id to prevent matching 'stats' as an id)
router.get('/stats/summary', TaskController.getStats);

// Task CRUD endpoints
router.route('/')
  .get(TaskController.getAllTasks)
  .post(validateCreateTask, TaskController.createTask);

router.route('/:id')
  .get(validateTaskId, TaskController.getTaskById)
  .put(validateTaskId, validatePutTask, TaskController.updateTask)
  .patch(validateTaskId, validatePatchTask, TaskController.patchTask)
  .delete(validateTaskId, TaskController.deleteTask);

module.exports = router;
