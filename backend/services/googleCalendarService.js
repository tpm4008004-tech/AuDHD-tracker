const { google } = require('googleapis');

/**
 * Creates an OAuth2 client initialized with user's access token
 * @param {string} calendarToken - Google OAuth2 access token
 * @returns {object} Google Calendar API client instance
 */
function getCalendarClient(calendarToken) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'MOCK_CLIENT_ID',
    process.env.GOOGLE_CLIENT_SECRET || 'MOCK_CLIENT_SECRET',
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  );

  if (calendarToken) {
    oAuth2Client.setCredentials({ access_token: calendarToken });
  }

  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

/**
 * Pushes a new event to user's primary Google Calendar (1-Way Sync OUT)
 * @param {string} calendarToken - User's Google access token
 * @param {object} eventData - Event details (title, startTime, endTime, type)
 * @returns {Promise<string|null>} Created googleEventId or null
 */
async function pushEventToGoogleCalendar(calendarToken, eventData) {
  if (!calendarToken) return null;
  try {
    const calendar = getCalendarClient(calendarToken);
    const startIso = eventData.startTime ? new Date(eventData.startTime).toISOString() : new Date().toISOString();
    const endIso = eventData.endTime ? new Date(eventData.endTime).toISOString() : new Date(Date.now() + 3600000).toISOString();

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: eventData.title || 'Untitled Event',
        description: eventData.type ? `Type: ${eventData.type}` : '',
        start: { dateTime: startIso },
        end: { dateTime: endIso }
      }
    });

    return (response && response.data && response.data.id) ? response.data.id : null;
  } catch (err) {
    console.error('Google Calendar pushEvent error:', err.message);
    return null;
  }
}

/**
 * Updates an existing event on Google Calendar
 * @param {string} calendarToken - User's Google access token
 * @param {string} googleEventId - Google Event ID
 * @param {object} eventData - Updated event details
 * @returns {Promise<string|null>} Google Event ID or null
 */
async function updateGoogleCalendarEvent(calendarToken, googleEventId, eventData) {
  if (!calendarToken || !googleEventId) return null;
  try {
    const calendar = getCalendarClient(calendarToken);
    const requestBody = {};
    if (eventData.title !== undefined) requestBody.summary = eventData.title;
    if (eventData.type !== undefined) requestBody.description = `Type: ${eventData.type}`;
    if (eventData.startTime !== undefined) requestBody.start = { dateTime: new Date(eventData.startTime).toISOString() };
    if (eventData.endTime !== undefined) requestBody.end = { dateTime: new Date(eventData.endTime).toISOString() };

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody
    });

    return (response && response.data && response.data.id) ? response.data.id : googleEventId;
  } catch (err) {
    console.error('Google Calendar updateEvent error:', err.message);
    return null;
  }
}

/**
 * Deletes an event from Google Calendar
 * @param {string} calendarToken - User's Google access token
 * @param {string} googleEventId - Google Event ID
 * @returns {Promise<boolean>} True if successfully deleted
 */
async function deleteGoogleCalendarEvent(calendarToken, googleEventId) {
  if (!calendarToken || !googleEventId) return false;
  try {
    const calendar = getCalendarClient(calendarToken);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    });
    return true;
  } catch (err) {
    console.error('Google Calendar deleteEvent error:', err.message);
    return false;
  }
}

module.exports = {
  pushEventToGoogleCalendar,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent
};
