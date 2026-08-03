const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const googleCalendarService = require('../services/googleCalendarService');

// Zapier Webhook POST /api/webhooks/events
router.post('/events', async (req, res) => {
  try {
    const { userId, title, startTime, endTime, type, googleEventId, piercesVoid } = req.body;

    let shouldPierceVoid = false;
    if (piercesVoid !== undefined) {
      shouldPierceVoid = piercesVoid === true || piercesVoid === 'true';
    } else if (type === 'Class' || type === 'Meeting') {
      shouldPierceVoid = true;
    }

    let assignedGoogleEventId = googleEventId;

    if (userId && !assignedGoogleEventId) {
      const user = await User.findById(userId);
      if (user && user.calendarToken) {
        const eventPayload = {
          title: title || 'Zapier Event',
          startTime: startTime || new Date(),
          endTime: endTime || new Date(Date.now() + 60 * 60 * 1000),
          type: type || 'Class'
        };
        assignedGoogleEventId = await googleCalendarService.pushEventToGoogleCalendar(
          user.calendarToken,
          eventPayload
        );
      }
    }

    const event = new Event({
      userId,
      title,
      startTime: startTime || new Date(),
      endTime: endTime || new Date(Date.now() + 60 * 60 * 1000),
      type: type || 'Class',
      googleEventId: assignedGoogleEventId,
      piercesVoid: shouldPierceVoid,
      webhookSource: 'Zapier'
    });

    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created via Zapier webhook',
      event
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
