const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Event = require('../models/Event');

describe('Remediation Fixes Verification Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('1. User.js calculateBedtime dynamic calculation', () => {
    test('calculates bedtime correctly for default targetWakeTime 07:30 (returns 23:45)', () => {
      const user = new User({
        googleId: 'g-user-bedtime-1',
        email: 'bedtime1@example.com',
        sleepSettings: {
          targetWakeTime: '07:30',
          sleepCycles: 5,
          latencyMins: 15
        }
      });
      expect(user.calculateBedtime()).toBe('23:45');
    });

    test('calculates bedtime correctly for targetWakeTime 06:00 (returns 22:15)', () => {
      const user = new User({
        googleId: 'g-user-bedtime-2',
        email: 'bedtime2@example.com',
        sleepSettings: {
          targetWakeTime: '06:00',
          sleepCycles: 5,
          latencyMins: 15
        }
      });
      expect(user.calculateBedtime()).toBe('22:15');
    });

    test('handles negative rollover across midnight cleanly for targetWakeTime 01:00 (returns 17:15)', () => {
      const user = new User({
        googleId: 'g-user-bedtime-3',
        email: 'bedtime3@example.com',
        sleepSettings: {
          targetWakeTime: '01:00',
          sleepCycles: 5,
          latencyMins: 15
        }
      });
      expect(user.calculateBedtime()).toBe('17:15');
    });

    test('calculates bedtime correctly for 6 cycles from 10:00 (returns 00:45)', () => {
      const user = new User({
        googleId: 'g-user-bedtime-4',
        email: 'bedtime4@example.com',
        sleepSettings: {
          targetWakeTime: '10:00',
          sleepCycles: 6,
          latencyMins: 15
        }
      });
      expect(user.calculateBedtime()).toBe('00:45');
    });
  });

  describe('2. Task.js calculateRollover method', () => {
    test('extends deadline and increments rolloverCount when task incomplete and past deadline', () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const checkDate = new Date('2026-08-02T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();

      const task = new Task({
        userId,
        title: 'Unfinished Assignment',
        deadline: initialDeadline,
        progressPct: 50
      });

      // 50% progress -> remaining 50% work -> (50/100)*4 = 2 days -> Math.ceil(2) = 2
      task.calculateRollover(checkDate);

      const expectedDeadline = new Date(initialDeadline.getTime() + 2 * 24 * 60 * 60 * 1000);
      expect(task.deadline.toISOString()).toBe(expectedDeadline.toISOString());
      expect(task.rolloverCount).toBe(1);
      expect(task.originalDeadline.toISOString()).toBe(initialDeadline.toISOString());
    });

    test('does not extend deadline if progressPct is 100%', () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const checkDate = new Date('2026-08-02T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();

      const task = new Task({
        userId,
        title: 'Completed Assignment',
        deadline: initialDeadline,
        progressPct: 100
      });

      task.calculateRollover(checkDate);

      expect(task.deadline.toISOString()).toBe(initialDeadline.toISOString());
      expect(task.rolloverCount).toBe(0);
    });
  });

  describe('3. tasks.js pacing-check & deconstruct fixes', () => {
    test('pacing-check sets pacingWarningSent and prevents duplicate warnings', async () => {
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Low Progress Task',
        deadline: new Date(Date.now() + 86400000),
        progressPct: 10,
        pacingWarningSent: false
      });
      await task.save();

      // First check -> sends warning
      const res1 = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: userId.toString() });

      expect(res1.status).toBe(200);
      expect(res1.body.warnings.length).toBe(1);

      // Second check -> duplicate prevented, 0 warnings
      const res2 = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: userId.toString() });

      expect(res2.status).toBe(200);
      expect(res2.body.warnings.length).toBe(0);
    });

    test('deconstruct does not inflate small assignments (<2 hours)', async () => {
      // 1 hour assignment -> 2 chunks of 30 mins (total 60 mins)
      const res1 = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 1 });

      expect(res1.status).toBe(200);
      expect(res1.body.chunks.length).toBe(2);
      const totalMins1 = res1.body.chunks.reduce((acc, c) => acc + c.durationMins, 0);
      expect(totalMins1).toBe(60);

      // 0.5 hour assignment -> 1 chunk of 30 mins
      const res05 = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 0.5 });

      expect(res05.status).toBe(200);
      expect(res05.body.chunks.length).toBe(1);
    });
  });

  describe('4. academic.js safe-bunks deficit formula fix', () => {
    test('calculates correct consecutive classes needed when below target (total=16, attended=10, target=75%)', async () => {
      const res = await request(app)
        .post('/api/academic/safe-bunks')
        .send({
          totalClasses: 16,
          attendedClasses: 10,
          targetPct: 0.75
        });

      expect(res.status).toBe(200);
      expect(res.body.safeBunks).toBe(0);
      expect(res.body.bunkDeficit).toBe(8); // N = ceil((0.75*16 - 10)/0.25) = ceil(2/0.25) = 8
      expect(res.body.statusMessage).toBe('Warning: You are below 75% target! Need to attend 8 class(es) without missing.');
    });

    test('calculates correct consecutive classes needed when below target (total=10, attended=5, target=75%)', async () => {
      const res = await request(app)
        .post('/api/academic/safe-bunks')
        .send({
          totalClasses: 10,
          attendedClasses: 5,
          targetPct: 0.75
        });

      expect(res.status).toBe(200);
      expect(res.body.bunkDeficit).toBe(10); // N = ceil((7.5 - 5)/0.25) = 10
      expect(res.body.statusMessage).toBe('Warning: You are below 75% target! Need to attend 10 class(es) without missing.');
    });
  });

  describe('5. sleep.js recalculate excluding completed tasks', () => {
    test('shifts flexible incomplete tasks but ignores flexible completed tasks', async () => {
      const userId = new mongoose.Types.ObjectId();
      const initialDeadline = new Date('2026-08-05T10:00:00Z');

      const incompleteTask = new Task({
        userId,
        title: 'Incomplete Flexible Task',
        deadline: initialDeadline,
        progressPct: 40,
        isFlexible: true
      });
      await incompleteTask.save();

      const completedTask = new Task({
        userId,
        title: 'Completed Flexible Task',
        deadline: initialDeadline,
        progressPct: 100,
        isFlexible: true
      });
      await completedTask.save();

      const res = await request(app)
        .post('/api/sleep/recalculate')
        .send({
          userId: userId.toString(),
          oversleptMins: 60
        });

      expect(res.status).toBe(200);
      expect(res.body.shiftedTasksCount).toBe(1);

      // Verify incomplete task was shifted by 60 mins
      const updatedIncomplete = await Task.findById(incompleteTask._id);
      expect(updatedIncomplete.deadline.toISOString()).toBe(new Date(initialDeadline.getTime() + 60 * 60 * 1000).toISOString());

      // Verify completed task was NOT shifted
      const updatedCompleted = await Task.findById(completedTask._id);
      expect(updatedCompleted.deadline.toISOString()).toBe(initialDeadline.toISOString());
    });
  });

  describe('6. webhooks.js Zapier piercesVoid boolean parsing fix', () => {
    const userId = new mongoose.Types.ObjectId();

    test('correctly parses piercesVoid string "true" as true', async () => {
      const res = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'String True Event',
          type: 'Class',
          piercesVoid: 'true'
        });

      expect(res.status).toBe(201);
      expect(res.body.event.piercesVoid).toBe(true);
    });

    test('correctly parses piercesVoid string "false" as false', async () => {
      const res = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'String False Event',
          type: 'Class',
          piercesVoid: 'false'
        });

      expect(res.status).toBe(201);
      expect(res.body.event.piercesVoid).toBe(false);
    });

    test('correctly handles boolean piercesVoid true and false', async () => {
      const resTrue = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'Bool True Event',
          type: 'Class',
          piercesVoid: true
        });
      expect(resTrue.body.event.piercesVoid).toBe(true);

      const resFalse = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'Bool False Event',
          type: 'Class',
          piercesVoid: false
        });
      expect(resFalse.body.event.piercesVoid).toBe(false);
    });
  });
});
