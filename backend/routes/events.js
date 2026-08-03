const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const googleCalendarService = require('../services/googleCalendarService');

// CREATE event
router.post('/', async (req, res) => {
  try {
    const eventData = { ...req.body };
    if (eventData.type === 'Class' && eventData.piercesVoid === undefined) {
      eventData.piercesVoid = true;
    }

    if (eventData.userId) {
      const user = await User.findById(eventData.userId);
      if (user && user.calendarToken) {
        const googleEventId = await googleCalendarService.pushEventToGoogleCalendar(
          user.calendarToken,
          eventData
        );
        if (googleEventId) {
          eventData.googleEventId = googleEventId;
        }
      }
    }

    const event = new Event(eventData);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET all events
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.type) filter.type = req.query.type;
    const events = await Event.find(filter);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE event
router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    Object.assign(event, req.body);
    await event.save();

    if (event.userId) {
      const user = await User.findById(event.userId);
      if (user && user.calendarToken) {
        if (event.googleEventId) {
          await googleCalendarService.updateGoogleCalendarEvent(
            user.calendarToken,
            event.googleEventId,
            req.body
          );
        } else {
          const gcalId = await googleCalendarService.pushEventToGoogleCalendar(
            user.calendarToken,
            event
          );
          if (gcalId) {
            event.googleEventId = gcalId;
            await event.save();
          }
        }
      }
    }

    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.userId && event.googleEventId) {
      const user = await User.findById(event.userId);
      if (user && user.calendarToken) {
        await googleCalendarService.deleteGoogleCalendarEvent(
          user.calendarToken,
          event.googleEventId
        );
      }
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully', event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check Void filtering endpoint
router.post('/check-void', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const now = new Date();

    const isVoidActive = user && user.voidState && user.voidState.isActive && user.voidState.endTime && now < user.voidState.endTime;

    const events = await Event.find({ userId });
    
    // Filter events based on void state: if void active, only keep piercesVoid === true
    const activeNotifications = events.filter(event => {
      if (isVoidActive) {
        return event.piercesVoid === true;
      }
      return true;
    });

    res.json({
      isVoidActive: Boolean(isVoidActive),
      totalEvents: events.length,
      activeNotificationsCount: activeNotifications.length,
      activeNotifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
