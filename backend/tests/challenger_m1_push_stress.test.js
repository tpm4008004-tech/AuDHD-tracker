const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const pushService = require('../services/pushNotificationService');
const webpush = require('web-push');

describe('Challenger M1: Push Notifications & Pacing Dispatch Stress Suite', () => {
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

  describe('1. Push Subscription Validation & Schema Boundaries', () => {
    test('Rejects subscription when subscription is boolean or number', async () => {
      const resBool = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: true });
      expect(resBool.status).toBe(400);

      const resNum = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: 12345 });
      expect(resNum.status).toBe(400);
    });

    test('Rejects subscription when endpoint is non-string (e.g., object or number)', async () => {
      const resObjEndpoint = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          subscription: {
            endpoint: { url: 'https://push.example.com' },
            keys: { p256dh: 'p256', auth: 'auth' }
          }
        });
      expect(resObjEndpoint.status).toBe(400);
    });

    test('Rejects subscription when keys is string or missing required sub-keys', async () => {
      const resStringKeys = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          subscription: {
            endpoint: 'https://push.example.com',
            keys: 'invalid_keys_string'
          }
        });
      expect(resStringKeys.status).toBe(400);
    });

    test('Overwrites existing push subscription for specified user', async () => {
      const user = new User({
        googleId: 'g_user_update',
        email: 'update@example.com',
        pushSubscription: {
          endpoint: 'https://old-endpoint.com',
          keys: { p256dh: 'old_p256', auth: 'old_auth' }
        }
      });
      await user.save();

      const newSub = {
        endpoint: 'https://new-endpoint.com/token',
        keys: { p256dh: 'new_p256_key', auth: 'new_auth_key' }
      };

      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          userId: user._id.toString(),
          subscription: newSub
        });

      expect(res.status).toBe(200);
      expect(res.body.pushSubscription.endpoint).toBe(newSub.endpoint);

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.pushSubscription.endpoint).toBe(newSub.endpoint);
      expect(updatedUser.pushSubscription.keys.p256dh).toBe(newSub.keys.p256dh);
    });

    test('Falls back gracefully and creates default user if no users exist in database', async () => {
      const sub = {
        endpoint: 'https://push.example.com/fallback',
        keys: { p256dh: 'p256_val', auth: 'auth_val' }
      };

      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: sub });

      expect(res.status).toBe(200);
      expect(res.body.pushSubscription.endpoint).toBe(sub.endpoint);

      const users = await User.find();
      expect(users.length).toBe(1);
    });
  });

  describe('2. pushNotificationService Resilience & Transport Handling', () => {
    test('sendPushNotification returns success: false for invalid subscription objects without throwing', async () => {
      const resNull = await pushService.sendPushNotification(null, { test: 1 });
      expect(resNull.success).toBe(false);
      expect(resNull.reason).toBe('Invalid or missing push subscription object');

      const resEmpty = await pushService.sendPushNotification({}, 'hello');
      expect(resEmpty.success).toBe(false);

      const resNoKeys = await pushService.sendPushNotification({ endpoint: 'http://test' }, 'hello');
      expect(resNoKeys.success).toBe(false);
    });

    test('sendPushNotification stringifies object payloads and returns success: true on webpush success', async () => {
      const mockSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/mock_token',
        keys: { p256dh: 'mock_p256', auth: 'mock_auth' }
      };
      const mockPayload = { title: 'Test Payload', count: 42 };

      const spyWebPush = jest.spyOn(webpush, 'sendNotification').mockImplementation(async () => ({ statusCode: 201 }));

      const result = await pushService.sendPushNotification(mockSub, mockPayload);

      expect(result.success).toBe(true);
      expect(spyWebPush).toHaveBeenCalledWith(mockSub, JSON.stringify(mockPayload));
    });

    test('sendPushNotification catches network/gateway errors from webpush and returns success: false with error message', async () => {
      const mockSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/expired_token',
        keys: { p256dh: 'mock_p256', auth: 'mock_auth' }
      };

      jest.spyOn(webpush, 'sendNotification').mockImplementation(async () => {
        throw new Error('410 Gone: Subscription has expired or is no longer valid');
      });

      const result = await pushService.sendPushNotification(mockSub, { alert: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('410 Gone');
    });
  });

  describe('3. Milestone Pacing Check Push Integration Edge Cases', () => {
    test('pacing-check handles user without push subscription gracefully', async () => {
      const user = new User({
        googleId: 'g_user_nosub',
        email: 'nosub@example.com'
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'Task Without Push Sub',
        progressPct: 10,
        pacingWarningSent: false
      });
      await task.save();

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings.length).toBe(1);
      expect(res.body.warnings[0].pushDispatched).toBe(false);

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.pacingWarningSent).toBe(true);
    });

    test('pacing-check handles failed push dispatch (e.g. gateway error) without breaking response', async () => {
      const user = new User({
        googleId: 'g_user_failing_push',
        email: 'failpush@example.com',
        pushSubscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/failing_endpoint',
          keys: { p256dh: 'key', auth: 'auth' }
        }
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'Task With Failing Push',
        progressPct: 5,
        pacingWarningSent: false
      });
      await task.save();

      jest.spyOn(pushService, 'sendPushNotification').mockImplementation(async () => ({
        success: false,
        error: '500 Internal Gateway Error'
      }));

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings.length).toBe(1);
      expect(res.body.warnings[0].pushDispatched).toBe(false);
    });

    test('pacing-check does not dispatch warnings for tasks with progress >= 20%', async () => {
      const user = new User({
        googleId: 'g_user_good_progress',
        email: 'good@example.com',
        pushSubscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/good_endpoint',
          keys: { p256dh: 'key', auth: 'auth' }
        }
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'On Track Task',
        progressPct: 25,
        pacingWarningSent: false
      });
      await task.save();

      const spySend = jest.spyOn(pushService, 'sendPushNotification');

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings.length).toBe(0);
      expect(spySend).toHaveBeenCalledTimes(0);
    });
  });
});
