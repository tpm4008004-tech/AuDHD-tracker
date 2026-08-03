const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');
const Event = require('../models/Event');

describe('The Void State vs Hard Deadlines', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('piercesVoid events (like classes/hard deadlines) bypass 2-hour mute state', async () => {
    // Create user and activate 2-hour Void state
    const user = new User({
      googleId: 'google-void-user',
      email: 'void@example.com',
      name: 'Void User',
      voidState: {
        isActive: true,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });
    await user.save();

    // Event 1: Soft event (muted during Void state)
    const softEvent = new Event({
      userId: user._id,
      title: 'Casual Networking Chat',
      startTime: new Date(Date.now() + 30 * 60 * 1000),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      type: 'Meeting',
      piercesVoid: false
    });
    await softEvent.save();

    // Event 2: Hard class deadline event (pierces Void state)
    const classEvent = new Event({
      userId: user._id,
      title: 'Macroeconomics Lecture',
      startTime: new Date(Date.now() + 30 * 60 * 1000),
      endTime: new Date(Date.now() + 90 * 60 * 1000),
      type: 'Class',
      piercesVoid: true
    });
    await classEvent.save();

    const res = await request(app)
      .post('/api/events/check-void')
      .send({ userId: user._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.isVoidActive).toBe(true);
    expect(res.body.totalEvents).toBe(2);
    expect(res.body.activeNotificationsCount).toBe(1);
    expect(res.body.activeNotifications[0]._id).toBe(classEvent._id.toString());
    expect(res.body.activeNotifications[0].piercesVoid).toBe(true);
  });
});
