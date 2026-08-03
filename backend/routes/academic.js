const express = require('express');
const router = express.Router();
const Papa = require('papaparse');
const Event = require('../models/Event');
const User = require('../models/User');
const googleCalendarService = require('../services/googleCalendarService');

// Papaparse CSV Import Endpoint: POST /api/academic/import-csv
router.post('/import-csv', (req, res) => {
  try {
    const { csvData } = req.body;
    if (!csvData) {
      return res.status(400).json({ error: 'csvData string parameter is required' });
    }

    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true
    });

    if (parsed.errors && parsed.errors.length > 0) {
      return res.status(400).json({
        error: 'Error parsing CSV',
        details: parsed.errors
      });
    }

    res.json({
      success: true,
      rowCount: parsed.data.length,
      headers: parsed.meta.fields,
      data: parsed.data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2-Tap Attendance Safe Bunk Calculation Endpoint: POST /api/academic/safe-bunks
router.post('/safe-bunks', async (req, res) => {
  try {
    const { totalClasses, attendedClasses, targetPct = 0.75, courseRef, userId } = req.body;

    let total = Number(totalClasses);
    let attended = Number(attendedClasses);

    // If userId and courseRef provided, auto-aggregate from Event model if counts omitted
    if ((isNaN(total) || isNaN(attended)) && userId && courseRef) {
      const classEvents = await Event.find({
        userId,
        'attendance.isClass': true,
        'attendance.courseRef': courseRef
      });
      total = classEvents.length;
      attended = classEvents.filter(e => e.attendance.status === 'Attended').length;
    }

    if (isNaN(total) || isNaN(attended) || total < 0 || attended < 0) {
      return res.status(400).json({ error: 'Valid totalClasses and attendedClasses are required' });
    }

    const targetFraction = targetPct > 1 ? targetPct / 100 : targetPct; // allow 75 or 0.75
    const targetPctDisplay = targetFraction * 100;
    const currentPct = total > 0 ? (attended / total) * 100 : 0;
    
    let safeBunks = 0;
    let bunkDeficit = 0;
    let statusMessage = '';

    if (currentPct >= targetPctDisplay) {
      const maxTotalClassesAllowed = targetFraction > 0 ? Math.floor(attended / targetFraction) : Infinity;
      safeBunks = maxTotalClassesAllowed === Infinity ? Infinity : maxTotalClassesAllowed - total;
      bunkDeficit = 0;
      statusMessage = safeBunks === Infinity 
        ? 'You can safely miss Infinity more class(es).' 
        : `You can safely miss ${safeBunks} more class(es).`;
    } else {
      const numerator = (targetFraction * total) - attended;
      const denominator = 1 - targetFraction;
      bunkDeficit = denominator > 0 ? Math.ceil(numerator / denominator) : 0;
      safeBunks = 0;
      statusMessage = `Warning: You are below ${targetPctDisplay}% target! Need to attend ${bunkDeficit} class(es) without missing.`;
    }

    res.json({
      courseRef: courseRef || 'General',
      totalClasses: total,
      attendedClasses: attended,
      currentAttendancePct: Math.round(currentPct * 100) / 100,
      targetAttendancePct: targetPctDisplay,
      safeBunks: safeBunks,
      bunkDeficit: bunkDeficit,
      statusMessage: statusMessage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gmail Timetable Event Sync Endpoint: POST /api/academic/sync-gmail
router.post('/sync-gmail', async (req, res) => {
  try {
    const { userId, timetableEvents } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!Array.isArray(timetableEvents) || timetableEvents.length === 0) {
      return res.status(400).json({ error: 'timetableEvents array is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const createdEvents = [];

    for (const item of timetableEvents) {
      let gcalId = null;
      if (user.calendarToken) {
        gcalId = await googleCalendarService.pushEventToGoogleCalendar(
          user.calendarToken,
          item
        );
      }

      const event = new Event({
        userId: user._id,
        title: item.title,
        startTime: item.startTime || new Date(),
        endTime: item.endTime || new Date(Date.now() + 60 * 60 * 1000),
        type: item.type || 'Class',
        googleEventId: gcalId,
        piercesVoid: item.piercesVoid !== undefined ? item.piercesVoid : true,
        attendance: {
          isClass: item.type === 'Class' || item.isClass === true,
          courseRef: item.courseRef || item.title
        },
        webhookSource: 'GmailSync'
      });

      await event.save();
      createdEvents.push(event);
    }

    res.status(200).json({
      success: true,
      message: 'Gmail timetable synced successfully',
      syncedCount: createdEvents.length,
      events: createdEvents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

