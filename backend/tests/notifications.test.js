const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const pushService = require('../services/pushNotificationService');

describe('Push Notifications & Subscription API', () => {
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

  describe('POST /api/notifications/subscribe', () => {
    test('successfully stores push subscription object in MongoDB User collection', async () => {
      const user = new User({
        googleId: 'google_user_123',
        email: 'testuser@example.com',
        name: 'Test Push User'
      });
      await user.save();

      const validSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample_push_token_xyz',
        keys: {
          p256dh: 'BNc_test_p256dh_key_sample_data_hash',
          auth: 'auth_secret_key_123'
        }
      };

      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          userId: user._id.toString(),
          subscription: validSubscription
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Push subscription saved');
      expect(res.body.pushSubscription.endpoint).toBe(validSubscription.endpoint);
      expect(res.body.pushSubscription.keys.p256dh).toBe(validSubscription.keys.p256dh);
      expect(res.body.pushSubscription.keys.auth).toBe(validSubscription.keys.auth);

      // Verify in DB directly
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.pushSubscription).toBeDefined();
      expect(updatedUser.pushSubscription.endpoint).toBe(validSubscription.endpoint);
      expect(updatedUser.pushSubscription.keys.p256dh).toBe(validSubscription.keys.p256dh);
      expect(updatedUser.pushSubscription.keys.auth).toBe(validSubscription.keys.auth);
    });

    test('returns 400 Bad Request when subscription payload is missing', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('Invalid push subscription');
    });

    test('returns 400 Bad Request when subscription endpoint is missing', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          subscription: {
            keys: { p256dh: 'key', auth: 'auth' }
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('returns 400 Bad Request when subscription keys are incomplete', async () => {
      const res = await request(app)
        .post('/api/notifications/subscribe')
        .send({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/sample_push_token_xyz',
            keys: { p256dh: 'only_p256dh' }
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Pacing Check Push Notification Integration', () => {
    test('triggers sendPushNotification when task progressPct < 20 for subscribed user', async () => {
      const user = new User({
        googleId: 'google_user_pacing',
        email: 'pacinguser@example.com',
        name: 'Pacing User',
        pushSubscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/pacing_endpoint',
          keys: {
            p256dh: 'p256dh_key_sample',
            auth: 'auth_key_sample'
          }
        }
      });
      await user.save();

      const task = new Task({
        userId: user._id,
        title: 'High Priority Strategy Milestone',
        type: 'Assignment',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        progressPct: 15,
        pacingWarningSent: false
      });
      await task.save();

      const spySendPush = jest.spyOn(pushService, 'sendPushNotification');

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.warnings.length).toBe(1);
      expect(res.body.warnings[0].warningSent).toBe(true);
      expect(res.body.warnings[0].progressPct).toBe(15);
      expect(res.body.warnings[0].pushDispatched).toBe(true);

      expect(spySendPush).toHaveBeenCalledTimes(1);
      expect(spySendPush).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/pacing_endpoint'
        }),
        expect.objectContaining({
          notification: expect.objectContaining({
            title: expect.stringContaining('Milestone Pacing Warning: High Priority Strategy Milestone')
          })
        })
      );
    });
  });
});
