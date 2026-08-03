const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');
const Event = require('../models/Event');
const { google } = require('googleapis');
const googleCalendarService = require('../services/googleCalendarService');

describe('Challenger M3 Empirical Stress Test Suite (Google Calendar Sync)', () => {
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
    mockInsert = jest.fn(async () => ({ data: { id: 'stress_gcal_ins_123' } }));
    mockPatch = jest.fn(async () => ({ data: { id: 'stress_gcal_patch_456' } }));
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

  describe('1. Users Lacking calendarToken', () => {
    test('POST /api/events for user without token does not call Google API and creates local event', async () => {
      const user = new User({ name: 'No Token User', email: 'notoken@example.com' });
      await user.save();

      const res = await request(app)
        .post('/api/events')
        .send({
          userId: user._id.toString(),
          title: 'Local Event',
          type: 'Study'
        });

      expect(res.status).toBe(201);
      expect(res.body.googleEventId).toBe(undefined);
      expect(mockInsert).toHaveBeenCalledTimes(0);
    });

    test('PUT /api/events/:id for user without token does not call Google API', async () => {
      const user = new User({ name: 'No Token User 2', email: 'notoken2@example.com' });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Original Title',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class'
      });
      await event.save();

      const res = await request(app)
        .put(`/api/events/${event._id}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(mockPatch).toHaveBeenCalledTimes(0);
      expect(mockInsert).toHaveBeenCalledTimes(0);
    });

    test('DELETE /api/events/:id for user without token deletes local event without Google API call', async () => {
      const user = new User({ name: 'No Token User 3', email: 'notoken3@example.com' });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Event To Delete',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Meeting'
      });
      await event.save();

      const res = await request(app).delete(`/api/events/${event._id}`);

      expect(res.status).toBe(200);
      expect(mockDelete).toHaveBeenCalledTimes(0);
      const check = await Event.findById(event._id);
      expect(check).toBe(null);
    });

    test('Gmail sync for user without token creates DB events with googleEventId=null and no API calls', async () => {
      const user = new User({ name: 'No Token Gmail User', email: 'nogmail@example.com' });
      await user.save();

      const res = await request(app)
        .post('/api/academic/sync-gmail')
        .send({
          userId: user._id.toString(),
          timetableEvents: [
            { title: 'Lecture A', type: 'Class' },
            { title: 'Lecture B', type: 'Class' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.syncedCount).toBe(2);
      expect(mockInsert).toHaveBeenCalledTimes(0);
      expect(res.body.events[0].googleEventId).toBe(null);
      expect(res.body.events[1].googleEventId).toBe(null);
    });

    test('POST /api/events with non-existent userId saves event locally without Google API call', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post('/api/events')
        .send({
          userId: fakeUserId,
          title: 'Orphan Event',
          type: 'Class'
        });

      expect(res.status).toBe(201);
      expect(res.body.googleEventId).toBe(undefined);
      expect(mockInsert).toHaveBeenCalledTimes(0);
    });
  });

  describe('2. Events With/Without googleEventId Transitions', () => {
    test('PUT on event created WITHOUT googleEventId pushes to Google Calendar when user HAS token', async () => {
      const user = new User({ name: 'Late Sync User', calendarToken: 'valid_token_late' });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Initially Unsynced Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class'
      });
      await event.save();

      const res = await request(app)
        .put(`/api/events/${event._id}`)
        .send({ title: 'Now Synced Event' });

      expect(res.status).toBe(200);
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(res.body.googleEventId).toBe('stress_gcal_ins_123');

      const updatedDB = await Event.findById(event._id);
      expect(updatedDB.googleEventId).toBe('stress_gcal_ins_123');
    });

    test('DELETE on event WITH googleEventId but user token REMOVED does not call Google delete', async () => {
      const user = new User({ name: 'Removed Token User', calendarToken: null });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Legacy Event',
        googleEventId: 'old_gcal_id_99',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Meeting'
      });
      await event.save();

      const res = await request(app).delete(`/api/events/${event._id}`);

      expect(res.status).toBe(200);
      expect(mockDelete).toHaveBeenCalledTimes(0);
      const check = await Event.findById(event._id);
      expect(check).toBe(null);
    });

    test('Zapier webhook with existing googleEventId does NOT re-push to Google Calendar', async () => {
      const user = new User({ name: 'Zapier User', calendarToken: 'zap_token_123' });
      await user.save();

      const res = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId: user._id.toString(),
          title: 'Already Synced In Zapier',
          googleEventId: 'pre_existing_zapier_gcal_id',
          type: 'Meeting'
        });

      expect(res.status).toBe(201);
      expect(mockInsert).toHaveBeenCalledTimes(0);
      expect(res.body.event.googleEventId).toBe('pre_existing_zapier_gcal_id');
    });
  });

  describe('3. Rate Limits (HTTP 429)', () => {
    test('POST /api/events handles 429 Rate Limit gracefully', async () => {
      mockInsert.mockImplementation(async () => {
        throw new Error('429 Too Many Requests: Rate limit exceeded');
      });

      const user = new User({ name: 'Rate Limit User', calendarToken: 'rl_token' });
      await user.save();

      const res = await request(app)
        .post('/api/events')
        .send({
          userId: user._id.toString(),
          title: 'Rate Limited Event',
          type: 'Class'
        });

      expect(res.status).toBe(201);
      expect(res.body._id).toBeDefined();
      expect(res.body.googleEventId).toBe(undefined);
    });

    test('PUT /api/events/:id handles 429 Rate Limit gracefully on patch', async () => {
      mockPatch.mockImplementation(async () => {
        throw new Error('429 Too Many Requests: User Rate Limit Exceeded');
      });

      const user = new User({ name: 'Rate Limit User 2', calendarToken: 'rl_token_2' });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Original Title',
        googleEventId: 'gcal_existing_id',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class'
      });
      await event.save();

      const res = await request(app)
        .put(`/api/events/${event._id}`)
        .send({ title: 'Updated Title Under Rate Limit' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title Under Rate Limit');
    });

    test('DELETE /api/events/:id handles 429 Rate Limit gracefully on delete', async () => {
      mockDelete.mockImplementation(async () => {
        throw new Error('429 Rate Limit Exceeded');
      });

      const user = new User({ name: 'Rate Limit User 3', calendarToken: 'rl_token_3' });
      await user.save();

      const event = new Event({
        userId: user._id,
        title: 'Delete Under Rate Limit',
        googleEventId: 'gcal_delete_target',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class'
      });
      await event.save();

      const res = await request(app).delete(`/api/events/${event._id}`);

      expect(res.status).toBe(200);
      const check = await Event.findById(event._id);
      expect(check).toBe(null);
    });
  });

  describe('4. Network Errors (ETIMEDOUT, ECONNREFUSED, Socket Hangup)', () => {
    test('pushEventToGoogleCalendar handles ETIMEDOUT network error', async () => {
      mockInsert.mockImplementation(async () => {
        throw new Error('connect ETIMEDOUT 142.250.190.46:443');
      });

      const result = await googleCalendarService.pushEventToGoogleCalendar('valid_token', {
        title: 'Timeout Event'
      });
      expect(result).toBe(null);
    });

    test('updateGoogleCalendarEvent handles ECONNREFUSED network error', async () => {
      mockPatch.mockImplementation(async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:443');
      });

      const result = await googleCalendarService.updateGoogleCalendarEvent('valid_token', 'gcal_id', {
        title: 'Refused Event'
      });
      expect(result).toBe(null);
    });

    test('deleteGoogleCalendarEvent handles socket hang up network error', async () => {
      mockDelete.mockImplementation(async () => {
        throw new Error('socket hang up');
      });

      const result = await googleCalendarService.deleteGoogleCalendarEvent('valid_token', 'gcal_id');
      expect(result).toBe(false);
    });

    test('Gmail timetable sync handles partial network failures across multiple items', async () => {
      let callCount = 0;
      mockInsert.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('ETIMEDOUT');
        }
        return { data: { id: `gcal_sync_res_${callCount}` } };
      });

      const user = new User({ name: 'Partial Failure User', calendarToken: 'pf_token' });
      await user.save();

      const res = await request(app)
        .post('/api/academic/sync-gmail')
        .send({
          userId: user._id.toString(),
          timetableEvents: [
            { title: 'Class 1', type: 'Class' },
            { title: 'Class 2', type: 'Class' },
            { title: 'Class 3', type: 'Class' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.syncedCount).toBe(3);
      expect(res.body.events[0].googleEventId).toBe('gcal_sync_res_1');
      expect(res.body.events[1].googleEventId).toBe(null);
      expect(res.body.events[2].googleEventId).toBe('gcal_sync_res_3');
    });
  });

  describe('5. Data Robustness & Edge Cases', () => {
    test('pushEventToGoogleCalendar handles eventData with missing/undefined start, end, title, type', async () => {
      const result = await googleCalendarService.pushEventToGoogleCalendar('valid_token', {});
      expect(result).toBe('stress_gcal_ins_123');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            summary: 'Untitled Event',
            description: ''
          })
        })
      );
    });

    test('pushEventToGoogleCalendar returns null if calendarToken is missing or empty', async () => {
      const resNull = await googleCalendarService.pushEventToGoogleCalendar(null, { title: 'Test' });
      const resEmpty = await googleCalendarService.pushEventToGoogleCalendar('', { title: 'Test' });
      expect(resNull).toBe(null);
      expect(resEmpty).toBe(null);
    });

    test('updateGoogleCalendarEvent returns null if parameters are missing', async () => {
      const res1 = await googleCalendarService.updateGoogleCalendarEvent(null, 'id', {});
      const res2 = await googleCalendarService.updateGoogleCalendarEvent('token', null, {});
      expect(res1).toBe(null);
      expect(res2).toBe(null);
    });

    test('deleteGoogleCalendarEvent returns false if parameters are missing', async () => {
      const res1 = await googleCalendarService.deleteGoogleCalendarEvent(null, 'id');
      const res2 = await googleCalendarService.deleteGoogleCalendarEvent('token', null);
      expect(res1).toBe(false);
      expect(res2).toBe(false);
    });
  });
});
