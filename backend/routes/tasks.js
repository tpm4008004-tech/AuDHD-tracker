const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const pushService = require('../services/pushNotificationService');

// Helper function for 4-Stage Assignment Deconstruction
function deconstructAssignment(totalEstimatedHours) {
  const STAGES = [
    'Context/Primary Research',
    'Secondary Requirements',
    'Execution',
    'Polishing'
  ];
  const hours = totalEstimatedHours && totalEstimatedHours > 0 ? totalEstimatedHours : 4;
  const totalMins = hours * 60;
  const totalChunksCount = Math.max(1, Math.ceil(totalMins / 30));
  
  const chunks = [];
  const basePerStage = Math.floor(totalChunksCount / 4);
  const remainder = totalChunksCount % 4;

  STAGES.forEach((stage, idx) => {
    const stageChunksCount = basePerStage + (idx < remainder ? 1 : 0);
    for (let i = 0; i < stageChunksCount; i++) {
      chunks.push({
        stage: stage,
        durationMins: 30,
        completed: false
      });
    }
  });

  return { totalEstimatedHours: hours, chunks };
}

// CREATE task
router.post('/', async (req, res) => {
  try {
    const taskData = { ...req.body };

    // If type is Assignment, calculate 4-Stage Deconstruction if not already populated
    if (taskData.type === 'Assignment') {
      const estimatedHours = taskData.assignmentDetails?.totalEstimatedHours || taskData.totalEstimatedHours || 4;
      const deconstructed = deconstructAssignment(estimatedHours);
      taskData.assignmentDetails = deconstructed;
    }

    const task = new Task(taskData);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.type) filter.type = req.query.type;
    const tasks = await Task.find(filter);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully', task });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deconstruct Assignment Endpoint
router.post('/deconstruct', (req, res) => {
  const { totalEstimatedHours } = req.body;
  const result = deconstructAssignment(totalEstimatedHours);
  res.json(result);
});

// Ceiling Math Rollover Endpoint
router.post('/:id/rollover', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const { remainingDays, currentDate } = req.body;
    const now = currentDate ? new Date(currentDate) : new Date();

    let extensionDays = 0;
    if (remainingDays !== undefined) {
      // Ceiling math rollover: Math.ceil(remainingDays)
      extensionDays = Math.ceil(remainingDays);
    } else if (task.progressPct < 100 && now > task.deadline) {
      // Estimate remaining days based on remaining progress if remainingDays omitted
      const remainingWorkPct = 100 - task.progressPct;
      const rawDays = (remainingWorkPct / 100) * 4; // default scale
      extensionDays = Math.ceil(rawDays);
    }

    if (extensionDays > 0) {
      if (!task.originalDeadline) {
        task.originalDeadline = task.deadline;
      }
      const msToAdd = extensionDays * 24 * 60 * 60 * 1000;
      task.deadline = new Date(task.deadline.getTime() + msToAdd);
      task.rolloverCount += 1;
      await task.save();
    }

    res.json({
      task,
      extensionDays,
      newDeadline: task.deadline,
      rolloverCount: task.rolloverCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Milestone Pacing Check Endpoint
router.post('/pacing-check', async (req, res) => {
  try {
    const { userId } = req.body;
    const filter = {};
    if (userId) filter.userId = userId;

    const tasks = await Task.find(filter);
    const warningPayloads = [];

    for (const task of tasks) {
      if (!task.pacingWarningSent && task.progressPct < 20) {
        task.pacingWarningSent = true;
        task.lastPacingCheck = new Date();
        await task.save();

        const payload = {
          notification: {
            title: `Milestone Pacing Warning: ${task.title}`,
            body: `Task "${task.title}" is at ${task.progressPct}% progress (< 20%). Action required!`
          }
        };

        // Dispatch Web Push Notification if user has push subscription
        let pushResult = null;
        let user = null;
        if (task.userId) {
          user = await User.findById(task.userId);
        }
        if (!user) {
          user = await User.findOne();
        }
        if (user && user.pushSubscription && user.pushSubscription.endpoint) {
          pushResult = await pushService.sendPushNotification(user.pushSubscription, payload);
        }

        warningPayloads.push({
          warningSent: true,
          taskId: task._id,
          title: task.title,
          progressPct: task.progressPct,
          payload,
          pushDispatched: Boolean(pushResult && pushResult.success)
        });
      }
    }

    res.json({ checkedCount: tasks.length, warnings: warningPayloads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
