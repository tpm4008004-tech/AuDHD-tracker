const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');
const Event = require('../models/Event');
const { google } = require('googleapis');
const googleCalendarService = require('../services/googleCalendarService');

describe('Challenger M3.2 - Google Calendar 1-Way Sync Stress & Edge Cases', () => {
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
    mockInsert = jest.fn(async () => ({ data: { id: 'stress_gcal_insert_999' } }));
    mockPatch = jest.fn(async () => ({ data: { id: 'stress_gcal_patch_888' } }));
    mockDelete = jest.fn(async () => ({ data: {} }));

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

  test('1. Invalid date input handled gracefully without throwing unhandled RangeError', async () => {
    const user = new User({
      googleId: 'gcal_user_invalid_date',
      email: 'invaliddate@example.com',
      calendarToken: 'token_invalid_date'
    });
    await user.save();

    const res = await request(app)
      .post('/api/events')
      .send({
        userId: user._id.toString(),
        title: 'Malformed Date Event',
        startTime: 'invalid-date-string',
        endTime: 'another-bad-date',
        type: 'Class'
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.googleEventId).toBe(undefined);
  });

  test('2. Late Token Sync: PUT update generates googleEventId if event originally lacked one', async () => {
    const user = new User({
      googleId: 'gcal_user_late_token',
      email: 'latetoken@example.com',
      calendarToken: 'newly_connected_token'
    });
    await user.save();

    const event = new Event({
      userId: user._id,
      title: 'Legacy Event Before Sync Enabled',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      type: 'Meeting'
    });
    await event.save();
    expect(event.googleEventId).toBe(undefined);

    const res = await request(app)
      .put(`/api/events/${event._id}`)
      .send({ title: 'Updated Legacy Event' });

    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(res.body.googleEventId).toBe('stress_gcal_insert_999');

    const updatedDbEvent = await Event.findById(event._id);
    expect(updatedDbEvent.googleEventId).toBe('stress_gcal_insert_999');
  });

  test('3. Zapier Webhook with existing googleEventId does NOT trigger duplicate Google Calendar insert', async () => {
    const user = new User({
      googleId: 'gcal_user_zapier_dup',
      email: 'zapierdup@example.com',
      calendarToken: 'zapier_token_123'
    });
    await user.save();

    const res = await request(app)
      .post('/api/webhooks/events')
      .send({
        userId: user._id.toString(),
        title: 'Already Synced via External Zapier',
        googleEventId: 'pre_existing_zapier_gcal_id',
        type: 'Class'
      });

    expect(res.status).toBe(201);
    expect(res.body.event.googleEventId).toBe('pre_existing_zapier_gcal_id');
    expect(mockInsert).toHaveBeenCalledTimes(0);
  });

  test('4. Partial batch failure during Gmail Timetable Sync handles failed items individually', async () => {
    let callCount = 0;
    mockInsert.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Google Calendar 503 Service Unavailable');
      }
      return { data: { id: `gcal_success_${callCount}` } };
    });

    const user = new User({
      googleId: 'gcal_user_batch_err',
      email: 'batcherr@example.com',
      calendarToken: 'batch_token_456'
    });
    await user.save();

    const res = await request(app)
      .post('/api/academic/sync-gmail')
      .send({
        userId: user._id.toString(),
        timetableEvents: [
          { title: 'Failing Event 1', startTime: new Date() },
          { title: 'Succeeding Event 2', startTime: new Date() }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.syncedCount).toBe(2);
    expect(res.body.events[0].googleEventId).toBe(null);
    expect(res.body.events[1].googleEventId).toBe('gcal_success_2');
  });

  test('5. Direct service calls with null/undefined inputs fail gracefully', async () => {
    const res1 = await googleCalendarService.pushEventToGoogleCalendar(null, { title: 'Test' });
    expect(res1).toBe(null);

    const res2 = await googleCalendarService.updateGoogleCalendarEvent('token', null, { title: 'Test' });
    expect(res2).toBe(null);

    const res3 = await googleCalendarService.deleteGoogleCalendarEvent('token', null);
    expect(res3).toBe(false);

    const res4 = await googleCalendarService.pushEventToGoogleCalendar('token', undefined);
    expect(res4).toBe(null);
  });

  test('6. Deleting event for user without token does not invoke Google delete API', async () => {
    const user = new User({
      googleId: 'gcal_user_del_notoken',
      email: 'delnotoken@example.com'
    });
    await user.save();

    const event = new Event({
      userId: user._id,
      title: 'Event To Delete',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      googleEventId: 'some_id'
    });
    await event.save();

    const res = await request(app)
      .delete(`/api/events/${event._id}`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(0);
  });
});
