const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Event = require('../models/Event');

// POST /api/sleep/recalculate
router.post('/recalculate', async (req, res) => {
  try {
    const { userId, oversleptMins, oversleptHours } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const minsToShift = oversleptMins !== undefined ? Number(oversleptMins) : (oversleptHours ? Number(oversleptHours) * 60 : 0);
    if (isNaN(minsToShift) || minsToShift <= 0) {
      return res.status(400).json({ error: 'Valid oversleptMins or oversleptHours > 0 is required' });
    }

    const shiftMs = minsToShift * 60 * 1000;

    // Fetch flexible tasks for user
    const tasks = await Task.find({ userId });
    const shiftedTasks = [];
    const unshiftedTasks = [];

    for (const task of tasks) {
      if (task.isFlexible && task.progressPct < 100) {
        task.deadline = new Date(task.deadline.getTime() + shiftMs);
        await task.save();
        shiftedTasks.push(task);
      } else {
        unshiftedTasks.push(task);
      }
    }

    // Fetch events for user
    const events = await Event.find({ userId });
    const protectedEvents = [];
    const shiftedEvents = [];

    for (const event of events) {
      if (event.piercesVoid) {
        // Protected event: hard deadline / class, do NOT shift
        protectedEvents.push(event);
      } else {
        // Flexible event: shift startTime & endTime
        event.startTime = new Date(event.startTime.getTime() + shiftMs);
        event.endTime = new Date(event.endTime.getTime() + shiftMs);
        await event.save();
        shiftedEvents.push(event);
      }
    }

    res.json({
      success: true,
      oversleptMins: minsToShift,
      shiftedTasksCount: shiftedTasks.length,
      protectedEventsCount: protectedEvents.length,
      shiftedEventsCount: shiftedEvents.length,
      shiftedTasks,
      protectedEvents,
      shiftedEvents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
