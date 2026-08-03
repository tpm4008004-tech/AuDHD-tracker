const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');
const Event = require('../models/Event');
const { google } = require('googleapis');

describe('1-Way Google Calendar Sync Test Suite (R2)', () => {
  let mockInsert;
  let mockPatch;
  let mockDelete;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(() => {
    mockInsert = jest.fn().mockResolvedValue({ data: { id: 'gcal_event_insert_123' } });
    mockPatch = jest.fn().mockResolvedValue({ data: { id: 'gcal_event_patch_456' } });
    mockDelete = jest.fn().mockResolvedValue({ data: {} });

    jest.spyOn(google, 'calendar').mockReturnValue({
      events: {
        insert: mockInsert,
        patch: mockPatch,
        delete: mockDelete
      }
    });
  });

  afterEach(async () => {
    await clearDB();
    jest.restoreAllMocks();
  });

  test('POST /api/events creates Event and pushes to Google Calendar via calendar.events.insert when user has calendarToken', async () => {
    const user = new User({
      googleId: 'gcal_user_001',
      email: 'gcaluser@example.com',
      name: 'Google Sync User',
      calendarToken: 'sample_oauth_token_12345'
    });
    await user.save();

    const eventPayload = {
      userId: user._id.toString(),
      title: 'MBA Leadership Lecture',
      startTime: new Date('2026-08-10T10:00:00Z'),
      endTime: new Date('2026-08-10T11:30:00Z'),
      type: 'Class'
    };

    const res = await request(app)
      .post('/api/events')
      .send(eventPayload);

    expect(res.status).toBe(201);
    expect(res.body.googleEventId).toBe('gcal_event_insert_123');

    // Verify calendar.events.insert was called
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          summary: 'MBA Leadership Lecture'
        })
      })
    );

    // Verify database record has googleEventId
    const savedEvent = await Event.findById(res.body._id);
    expect(savedEvent.googleEventId).toBe('gcal_event_insert_123');
  });

  test('POST /api/events creates Event locally WITHOUT pushing to Google Calendar when user has NO calendarToken', async () => {
    const user = new User({
      googleId: 'gcal_user_002',
      email: 'notoken@example.com',
      name: 'No Token User'
    });
    await user.save();

    const res = await request(app)
      .post('/api/events')
      .send({
        userId: user._id.toString(),
        title: 'Offline Study Session',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'ProtectedBlock'
      });

    expect(res.status).toBe(201);
    expect(res.body.googleEventId).toBe(undefined);
    expect(mockInsert).toHaveBeenCalledTimes(0);
  });

  test('PUT /api/events/:id syncs updates to Google Calendar via calendar.events.patch', async () => {
    const user = new User({
      googleId: 'gcal_user_003',
      email: 'updateuser@example.com',
      calendarToken: 'valid_token_abc'
    });
    await user.save();

    const event = new Event({
      userId: user._id,
      title: 'Initial Strategy Meeting',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      type: 'Meeting',
      googleEventId: 'existing_gcal_id_999'
    });
    await event.save();

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .send({ title: 'Rescheduled Strategy Meeting' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Rescheduled Strategy Meeting');
    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'primary',
        eventId: 'existing_gcal_id_999',
        requestBody: expect.objectContaining({
          summary: 'Rescheduled Strategy Meeting'
        })
      })
    );
  });

  test('DELETE /api/events/:id removes event from Google Calendar via calendar.events.delete', async () => {
    const user = new User({
      googleId: 'gcal_user_004',
      email: 'deleteuser@example.com',
      calendarToken: 'valid_token_xyz'
    });
    await user.save();

    const event = new Event({
      userId: user._id,
      title: 'Cancelled Workshop',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      type: 'Class',
      googleEventId: 'delete_gcal_id_888'
    });
    await event.save();

    const res = await request(app)
      .delete(`/api/events/${event._id}`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'primary',
        eventId: 'delete_gcal_id_888'
      })
    );

    const deletedEvent = await Event.findById(event._id);
    expect(deletedEvent).toBe(null);
  });

  test('POST /api/webhooks/events pushes event to Google Calendar and stores googleEventId', async () => {
    const user = new User({
      googleId: 'gcal_user_005',
      email: 'webhookuser@example.com',
      calendarToken: 'webhook_token_555'
    });
    await user.save();

    const res = await request(app)
      .post('/api/webhooks/events')
      .send({
        userId: user._id.toString(),
        title: 'Zapier Synced Event',
        type: 'Meeting'
      });

    expect(res.status).toBe(201);
    expect(res.body.event.googleEventId).toBe('gcal_event_insert_123');
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  test('POST /api/academic/sync-gmail pushes timetable events to Google Calendar and stores googleEventIds', async () => {
    const user = new User({
      googleId: 'gcal_user_006',
      email: 'gmailuser@example.com',
      calendarToken: 'gmail_token_777'
    });
    await user.save();

    const timetableEvents = [
      { title: 'Morning MBA Accounting', startTime: '2026-08-04T09:00:00Z', endTime: '2026-08-04T10:30:00Z', type: 'Class' },
      { title: 'Afternoon Finance Lab', startTime: '2026-08-04T14:00:00Z', endTime: '2026-08-04T16:00:00Z', type: 'Class' }
    ];

    const res = await request(app)
      .post('/api/academic/sync-gmail')
      .send({
        userId: user._id.toString(),
        timetableEvents
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.syncedCount).toBe(2);
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(res.body.events[0].googleEventId).toBe('gcal_event_insert_123');
    expect(res.body.events[1].googleEventId).toBe('gcal_event_insert_123');
  });

  test('Gracefully catches Google API failures without crashing API or throwing 500 error', async () => {
    mockInsert.mockImplementation(async () => {
      throw new Error('Google API rate limit exceeded');
    });

    const user = new User({
      googleId: 'gcal_user_err',
      email: 'erroruser@example.com',
      calendarToken: 'error_token_999'
    });
    await user.save();

    const res = await request(app)
      .post('/api/events')
      .send({
        userId: user._id.toString(),
        title: 'Event During API Outage',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class'
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.googleEventId).toBe(undefined);
  });
});
