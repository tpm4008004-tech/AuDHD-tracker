const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const Task = require('../models/Task');

describe('Milestone Pacing Service', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('weekly task at 19% progress (< 20%) fires web-push warning payload', async () => {
    const userId = new mongoose.Types.ObjectId();

    // Task 1: 19% progress (should fire warning)
    const taskBehind = new Task({
      userId,
      title: 'Weekly Case Study Review',
      type: 'General',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progressPct: 19,
      pacingWarningSent: false
    });
    await taskBehind.save();

    // Task 2: 50% progress (should NOT fire warning)
    const taskOnTrack = new Task({
      userId,
      title: 'Marketing Strategy Presentation',
      type: 'General',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      progressPct: 50,
      pacingWarningSent: false
    });
    await taskOnTrack.save();

    const res = await request(app)
      .post('/api/tasks/pacing-check')
      .send({ userId: userId.toString() });

    expect(res.status).toBe(200);
    expect(res.body.warnings.length).toBe(1);
    expect(res.body.warnings[0].warningSent).toBe(true);
    expect(res.body.warnings[0].taskId).toBe(taskBehind._id.toString());
    expect(res.body.warnings[0].progressPct).toBe(19);
    expect(res.body.warnings[0].payload.notification.title).toContain('Milestone Pacing Warning');

    // Verify DB update
    const updatedTaskBehind = await Task.findById(taskBehind._id);
    expect(updatedTaskBehind.pacingWarningSent).toBe(true);

    const updatedTaskOnTrack = await Task.findById(taskOnTrack._id);
    expect(updatedTaskOnTrack.pacingWarningSent).toBe(false);
  });
});
