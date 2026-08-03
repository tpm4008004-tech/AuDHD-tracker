const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create a new user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle or set Void state (2-hour mute)
router.post('/:id/void', async (req, res) => {
  try {
    const { isActive, durationHours = 2 } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.voidState.isActive = isActive !== undefined ? isActive : true;
    if (user.voidState.isActive) {
      user.voidState.endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    } else {
      user.voidState.endTime = null;
    }
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bedtime calculation endpoint
router.get('/:id/bedtime', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const bedtime = user.calculateBedtime();
    res.json({ targetWakeTime: user.sleepSettings.targetWakeTime, suggestedBedtime: bedtime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
