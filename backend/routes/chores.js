const express = require('express');
const router = express.Router();
const Chore = require('../models/Chore');

// CREATE chore
router.post('/', async (req, res) => {
  try {
    const chore = new Chore(req.body);
    await chore.save();
    res.status(201).json(chore);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all chores
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.category) filter.category = req.query.category;
    const chores = await Chore.find(filter);
    
    // Convert to objects to include virtual 'isDue'
    const results = chores.map(c => {
      const obj = c.toObject({ virtuals: true });
      return obj;
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single chore
router.get('/:id', async (req, res) => {
  try {
    const chore = await Chore.findById(req.params.id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    res.json(chore.toObject({ virtuals: true }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE chore
router.put('/:id', async (req, res) => {
  try {
    const chore = await Chore.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    res.json(chore.toObject({ virtuals: true }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE chore
router.delete('/:id', async (req, res) => {
  try {
    const chore = await Chore.findByIdAndDelete(req.params.id);
    if (!chore) return res.status(404).json({ error: 'Chore not found' });
    res.json({ message: 'Chore deleted successfully', chore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
