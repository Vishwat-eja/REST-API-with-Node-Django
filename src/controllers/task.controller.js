const TaskModel = require('../models/task.model');
const { VALID_STATUSES, VALID_PRIORITIES } = require('../middleware/validate');

class TaskController {
  static async createTask(req, res, next) {
    try {
      const { title, description, status, priority, dueDate } = req.body;
      const userId = req.user.id;

      const task = TaskModel.create({
        userId,
        title,
        description,
        status: status || 'pending',
        priority: priority || 'medium',
        dueDate: dueDate || null
      });

      return res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        data: { task }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllTasks(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        status,
        priority,
        search,
        sortBy = 'createdAt',
        order = 'DESC',
        page = 1,
        limit = 20
      } = req.query;

      // Validate query parameters
      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Query parameter 'status' must be one of: ${VALID_STATUSES.join(', ')}.`
        });
      }

      if (priority && !VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Query parameter 'priority' must be one of: ${VALID_PRIORITIES.join(', ')}.`
        });
      }

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (parsedPage - 1) * parsedLimit;

      const result = TaskModel.findAllByUser(userId, {
        status,
        priority,
        search,
        sortBy,
        order,
        limit: parsedLimit,
        offset
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTaskById(req, res, next) {
    try {
      const taskId = req.taskId;
      const userId = req.user.id;

      const task = TaskModel.findByIdAndUser(taskId, userId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Task with ID ${taskId} was not found.`
        });
      }

      return res.status(200).json({
        success: true,
        data: { task }
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTask(req, res, next) {
    try {
      const taskId = req.taskId;
      const userId = req.user.id;
      const { title, description, status, priority, dueDate } = req.body;

      // Verify task exists first
      const existingTask = TaskModel.findByIdAndUser(taskId, userId);
      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Task with ID ${taskId} was not found.`
        });
      }

      const updatedTask = TaskModel.update(taskId, userId, {
        title,
        description,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        dueDate: dueDate !== undefined ? dueDate : existingTask.dueDate
      });

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: { task: updatedTask }
      });
    } catch (err) {
      next(err);
    }
  }

  static async patchTask(req, res, next) {
    try {
      const taskId = req.taskId;
      const userId = req.user.id;
      const updates = req.body;

      // Verify task exists first
      const existingTask = TaskModel.findByIdAndUser(taskId, userId);
      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Task with ID ${taskId} was not found.`
        });
      }

      const updatedTask = TaskModel.update(taskId, userId, updates);

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully.',
        data: { task: updatedTask }
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTask(req, res, next) {
    try {
      const taskId = req.taskId;
      const userId = req.user.id;

      // Verify existence
      const existingTask = TaskModel.findByIdAndUser(taskId, userId);
      if (!existingTask) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Task with ID ${taskId} was not found.`
        });
      }

      const deleted = TaskModel.delete(taskId, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Task with ID ${taskId} could not be deleted.`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully.',
        data: {
          id: taskId,
          title: existingTask.title
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = TaskModel.getStatsByUser(userId);

      return res.status(200).json({
        success: true,
        data: { stats }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TaskController;
