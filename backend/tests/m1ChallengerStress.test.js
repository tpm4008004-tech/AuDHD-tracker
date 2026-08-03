const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const pushService = require('../services/pushNotificationService');
const webpush = require('web-push');

describe('Challenger M1 Stress Testing - Push Notifications & Pacing Check Edge Cases', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
    jest.restoreAllMocks();
  });

  describe('Assignment 1: Stress test POST /api/notifications/subscribe', () => {
    test('returns 400 Bad Request when body is empty object', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 Bad Request when subscription is null', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: null });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 Bad Request when subscription is non-object (string, number, boolean)', async () => {
      for (const invalidVal of ['not_an_object', 12345, true]) {
        const res = await request(app)
          .post('/api/notifications/subscribe')
          .send({ subscription: invalidVal });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      }
    });

    test('returns 400 Bad Request when subscription is an array', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 Bad Request when subscription is empty object', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: {} });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 Bad Request when endpoint is missing, null, non-string, or empty', async () => {
      const invalidEndpoints = [undefined, null, 99999, {}, ''];

      for (const endpointVal of invalidEndpoints) {
        const res = await request(app)
          .post('/api/notifications/subscribe')
          .send({
            subscription: {
              endpoint: endpointVal,
              keys: { p256dh: 'sample_p256dh', auth: 'sample_auth' }
            }
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      }
    });

    test('returns 400 Bad Request when keys is missing, null, non-object, or empty', async () => {
      const invalidKeys = [undefined, null, 'invalid_keys_string', 12345, {}];

      for (const keysVal of invalidKeys) {
        const res = await request(app)
          .post('/api/notifications/subscribe')
          .send({
            subscription: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/token',
              keys: keysVal
            }
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      }
    });

    test('returns 400 Bad Request when keys.p256dh or keys.auth is missing, null, or empty string', async () => {
      const invalidKeyCombinations = [
        { auth: 'valid_auth' }, // missing p256dh
        { p256dh: 'valid_p256dh' }, // missing auth
        { p256dh: null, auth: 'valid_auth' },
        { p256dh: 'valid_p256dh', auth: null },
        { p256dh: '', auth: 'valid_auth' },
        { p256dh: 'valid_p256dh', auth: '' }
      ];

      for (const keysObj of invalidKeyCombinations) {
        const res = await request(app)
          .post('/api/notifications/subscribe')
          .send({
            subscription: {
              endpoint: 'https://fcm.googleapis.com/fcm/send/token',
              keys: keysObj
            }
          });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      }
    });

    test('successfully processes valid payload when userId is omitted (creates default user)', async () => {
      const validSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/token_no_user',
        keys: { p256dh: 'p256dh_val', auth: 'auth_val' }
      };

      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: validSub });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pushSubscription.endpoint).toBe(validSub.endpoint);

      // Confirm user created in DB
      const userInDb = await User.findOne({ 'pushSubscription.endpoint': validSub.endpoint });
      expect(userInDb).toBeDefined();
    });

    test('handles non-existent valid ObjectId by falling back to existing or default user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const validSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/token_non_existent',
        keys: { p256dh: 'p256dh_val', auth: 'auth_val' }
      };

      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ userId: nonExistentId, subscription: validSub });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Assignment 2: Verify behavior during POST /api/tasks/pacing-check when user has no or invalid push subscription', () => {
    test('handles user with NO push subscription gracefully (warningSent=true, pushDispatched=false)', async () => {
      const user = new User({
        googleId: 'no_push_user_1',
        email: 'nopush1@example.com',
        name: 'No Push User'
        // pushSubscription is omitted
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'Task Without Push Sub',
        type: 'Assignment',
        deadline: new Date(Date.now() + 86400000),
        progressPct: 10,
        pacingWarningSent: false
      });
      await task.save();

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.checkedCount).toBe(1);
      expect(res.body.warnings.length).toBe(1);
      expect(res.body.warnings[0].warningSent).toBe(true);
      expect(res.body.warnings[0].pushDispatched).toBe(false);

      // Verify task in DB updated pacingWarningSent
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.pacingWarningSent).toBe(true);
    });

    test('handles user with empty or incomplete push subscription object gracefully', async () => {
      const user = new User({
        googleId: 'incomplete_push_user',
        email: 'incomplete@example.com',
        name: 'Incomplete Push User',
        pushSubscription: {
          // endpoint omitted
          keys: { p256dh: 'key_only' }
        }
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'Task With Incomplete Sub',
        type: 'Assignment',
        deadline: new Date(Date.now() + 86400000),
        progressPct: 5,
        pacingWarningSent: false
      });
      await task.save();

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings[0].warningSent).toBe(true);
      expect(res.body.warnings[0].pushDispatched).toBe(false);
    });

    test('handles invalid push subscription / push gateway failure gracefully (webpush rejects)', async () => {
      const user = new User({
        googleId: 'failed_push_user',
        email: 'failedpush@example.com',
        name: 'Failed Push User',
        pushSubscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/invalid_expired_token',
          keys: { p256dh: 'p256dh_key', auth: 'auth_key' }
        }
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'Task With Invalid Gateway Token',
        type: 'Assignment',
        deadline: new Date(Date.now() + 86400000),
        progressPct: 18,
        pacingWarningSent: false
      });
      await task.save();

      // Mock webpush.sendNotification to simulate gateway 410 Gone failure
      jest.spyOn(webpush, 'sendNotification').mockImplementation(async () => {
        throw new Error('WebPushError: 410 Gone - Subscription expired');
      });

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings[0].warningSent).toBe(true);
      expect(res.body.warnings[0].pushDispatched).toBe(false);
    });

    test('pushNotificationService.sendPushNotification safe wrapper validation & error handling', async () => {
      // 1. Missing subscription
      const resNull = await pushService.sendPushNotification(null, { test: 1 });
      expect(resNull.success).toBe(false);
      expect(resNull.reason).toBe('Invalid or missing push subscription object');

      // 2. Incomplete subscription
      const resIncomplete = await pushService.sendPushNotification({ endpoint: 'https://foo' }, { test: 1 });
      expect(resIncomplete.success).toBe(false);
      expect(resIncomplete.reason).toBe('Invalid or missing push subscription object');

      // 3. Exception in webpush.sendNotification caught safely
      jest.spyOn(webpush, 'sendNotification').mockImplementation(async () => {
        throw new Error('Network connection timeout');
      });
      const resError = await pushService.sendPushNotification(
        { endpoint: 'https://foo', keys: { p256dh: 'a', auth: 'b' } },
        { test: 1 }
      );
      expect(resError.success).toBe(false);
      expect(resError.error).toBe('Network connection timeout');
    });
  });
});
