const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const Task = require('../models/Task');

describe('Ceiling Math Rollover Service', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('rounds UP remaining work of 3.1 days to a 4-day deadline extension (Math.ceil(3.1) = 4)', async () => {
    const initialDeadline = new Date('2026-08-01T10:00:00Z');
    const userId = new mongoose.Types.ObjectId();

    const task = new Task({
      userId,
      title: 'MBA Financial Modeling Report',
      type: 'Assignment',
      deadline: initialDeadline,
      progressPct: 40,
      isFlexible: true
    });
    await task.save();

    const res = await request(app)
      .post(`/api/tasks/${task._id}/rollover`)
      .send({
        remainingDays: 3.1,
        currentDate: '2026-08-02T10:00:00Z'
      });

    expect(res.status).toBe(200);
    expect(res.body.extensionDays).toBe(4);
    expect(res.body.rolloverCount).toBe(1);

    const expectedDeadline = new Date(initialDeadline.getTime() + 4 * 24 * 60 * 60 * 1000);
    expect(new Date(res.body.newDeadline).toISOString()).toBe(expectedDeadline.toISOString());

    // Verify task state in database
    const updatedTask = await Task.findById(task._id);
    expect(updatedTask.rolloverCount).toBe(1);
    expect(updatedTask.deadline.toISOString()).toBe(expectedDeadline.toISOString());
  });
});
