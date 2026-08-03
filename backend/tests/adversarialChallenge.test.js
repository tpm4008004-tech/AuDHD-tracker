const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Event = require('../models/Event');
const User = require('../models/User');

describe('Adversarial Challenger Stress Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  // -------------------------------------------------------------
  // 1. Math.ceil Boundary Conditions
  // -------------------------------------------------------------
  describe('1. Math.ceil Boundary Conditions (Rollover)', () => {
    test('exact integer 3.0 days yields extension of 3 days (not 4)', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task 3.0',
        deadline: initialDeadline,
        progressPct: 50
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: 3.0, currentDate: '2026-08-02T10:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.extensionDays).toBe(3);
      expect(res.body.rolloverCount).toBe(1);
      const expected = new Date(initialDeadline.getTime() + 3 * 86400000).toISOString();
      expect(new Date(res.body.newDeadline).toISOString()).toBe(expected);
    });

    test('fractional 3.1 days yields extension of 4 days', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task 3.1',
        deadline: initialDeadline,
        progressPct: 50
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: 3.1, currentDate: '2026-08-02T10:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.extensionDays).toBe(4);
      expect(res.body.rolloverCount).toBe(1);
    });

    test('small fraction 0.1 days yields extension of 1 day', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task 0.1',
        deadline: initialDeadline,
        progressPct: 90
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: 0.1, currentDate: '2026-08-02T10:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.extensionDays).toBe(1);
      expect(res.body.rolloverCount).toBe(1);
    });

    test('exact 0.0 remaining days yields 0 extension days and does not increment rolloverCount', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task 0.0',
        deadline: initialDeadline,
        progressPct: 100
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: 0.0, currentDate: '2026-08-02T10:00:00Z' });

      expect(res.status).toBe(200);
      expect(res.body.extensionDays).toBe(0);
      expect(res.body.rolloverCount).toBe(0);
    });

    test('string numerical input "3.1" correctly parses to Math.ceil("3.1") = 4', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task string 3.1',
        deadline: initialDeadline
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: '3.1' });

      expect(res.status).toBe(200);
      expect(res.body.extensionDays).toBe(4);
    });

    test('non-numeric input "invalid" results in NaN extensionDays and no deadline change', async () => {
      const initialDeadline = new Date('2026-08-01T10:00:00Z');
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({
        userId,
        title: 'Task invalid string',
        deadline: initialDeadline
      });
      await task.save();

      const res = await request(app)
        .post(`/api/tasks/${task._id}/rollover`)
        .send({ remainingDays: 'invalid' });

      expect(res.status).toBe(200);
      expect(res.body.rolloverCount).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. Pacing Check Thresholds & Re-triggering Bug
  // -------------------------------------------------------------
  describe('2. Pacing Check Thresholds & Re-running Pacing Checks', () => {
    test('evaluates 19% (warning), 19.9% (warning), 20% (no warning), 21% (no warning)', async () => {
      const userId = new mongoose.Types.ObjectId();

      const t19 = new Task({ userId, title: 'Task 19%', deadline: new Date(), progressPct: 19 });
      await t19.save();
      const t199 = new Task({ userId, title: 'Task 19.9%', deadline: new Date(), progressPct: 19.9 });
      await t199.save();
      const t20 = new Task({ userId, title: 'Task 20%', deadline: new Date(), progressPct: 20 });
      await t20.save();
      const t21 = new Task({ userId, title: 'Task 21%', deadline: new Date(), progressPct: 21 });
      await t21.save();

      const res = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: userId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.checkedCount).toBe(4);
      expect(res.body.warnings.length).toBe(2);

      const warnedTaskIds = res.body.warnings.map(w => String(w.taskId));
      const id19 = String(t19._id);
      const id199 = String(t199._id);

      expect(warnedTaskIds.includes(id19)).toBe(true);
      expect(warnedTaskIds.includes(id199)).toBe(true);
    });

    test('re-running pacing-check prevents duplicate warnings when pacingWarningSent flag is true', async () => {
      const userId = new mongoose.Types.ObjectId();
      const task = new Task({ userId, title: 'Repeat Check Task', deadline: new Date(), progressPct: 15, pacingWarningSent: false });
      await task.save();

      // Run check 1st time
      const res1 = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: userId.toString() });
      expect(res1.body.warnings.length).toBe(1);

      // Verify flag was set in DB
      const updatedTask = await Task.findById(task._id);
      expect(updatedTask.pacingWarningSent).toBe(true);

      // Run check 2nd time - should NOT send duplicate warning
      const res2 = await request(app)
        .post('/api/tasks/pacing-check')
        .send({ userId: userId.toString() });
      
      expect(res2.body.warnings.length).toBe(0); 
    });
  });

  // -------------------------------------------------------------
  // 3. Deconstructor Chunk Size Calculation
  // -------------------------------------------------------------
  describe('3. Deconstructor Chunk Size Calculation', () => {
    test('4 hours total -> 8 chunks of 30 mins = 240 mins (2 chunks per stage)', async () => {
      const res = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 4 });

      expect(res.status).toBe(200);
      expect(res.body.chunks.length).toBe(8);
      const totalMins = res.body.chunks.reduce((acc, c) => acc + c.durationMins, 0);
      expect(totalMins).toBe(240);
    });

    test('2 hours total -> 4 chunks of 30 mins = 120 mins (1 chunk per stage)', async () => {
      const res = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 2 });

      expect(res.status).toBe(200);
      expect(res.body.chunks.length).toBe(4);
      const totalMins = res.body.chunks.reduce((acc, c) => acc + c.durationMins, 0);
      expect(totalMins).toBe(120);
    });

    test('1 hour total -> produces 2 chunks of 30 mins = 60 mins total duration', async () => {
      const res = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 1 });

      expect(res.status).toBe(200);
      // Math.max(1, Math.ceil(60/30)) = 2 chunks
      expect(res.body.chunks.length).toBe(2);
      const totalMins = res.body.chunks.reduce((acc, c) => acc + c.durationMins, 0);
      expect(totalMins).toBe(60);
      expect(res.body.totalEstimatedHours).toBe(1);
    });

    test('5 hours total -> 10 chunks of 30 mins = 300 mins (3, 3, 2, 2 distribution across stages)', async () => {
      const res = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 5 });

      expect(res.status).toBe(200);
      expect(res.body.chunks.length).toBe(10);
      
      const stages = res.body.chunks.map(c => c.stage);
      const c1 = stages.filter(s => s === 'Context/Primary Research').length;
      const c2 = stages.filter(s => s === 'Secondary Requirements').length;
      const c3 = stages.filter(s => s === 'Execution').length;
      const c4 = stages.filter(s => s === 'Polishing').length;

      expect(c1).toBe(3);
      expect(c2).toBe(3);
      expect(c3).toBe(2);
      expect(c4).toBe(2);
    });

    test('4.2 hours total -> Math.ceil(252/30) = 9 chunks of 30 mins = 270 mins', async () => {
      const res = await request(app)
        .post('/api/tasks/deconstruct')
        .send({ totalEstimatedHours: 4.2 });

      expect(res.status).toBe(200);
      expect(res.body.chunks.length).toBe(9);
      const totalMins = res.body.chunks.reduce((acc, c) => acc + c.durationMins, 0);
      expect(totalMins).toBe(270);
    });
  });

  // -------------------------------------------------------------
  // 4. Sleep Shifter (Multiple Tasks & Protected Events)
  // -------------------------------------------------------------
  describe('4. Sleep Shifter Edge Cases', () => {
    test('shifts 3 flexible tasks and 2 flexible events while leaving 2 rigid tasks and 2 protected events untouched', async () => {
      const userId = new mongoose.Types.ObjectId();
      const baseTime = new Date('2026-08-03T08:00:00Z');

      // Create 3 flexible tasks
      for (let i = 1; i <= 3; i++) {
        const t = new Task({
          userId,
          title: `Flexible Task ${i}`,
          deadline: new Date(baseTime.getTime() + i * 3600000),
          isFlexible: true
        });
        await t.save();
      }

      // Create 2 rigid tasks
      for (let i = 1; i <= 2; i++) {
        const t = new Task({
          userId,
          title: `Rigid Task ${i}`,
          deadline: new Date(baseTime.getTime() + i * 3600000),
          isFlexible: false
        });
        await t.save();
      }

      // Create 2 protected events (piercesVoid: true)
      for (let i = 1; i <= 2; i++) {
        const e = new Event({
          userId,
          title: `Protected Class ${i}`,
          startTime: new Date(baseTime.getTime() + i * 3600000),
          endTime: new Date(baseTime.getTime() + (i + 1) * 3600000),
          type: 'Class',
          piercesVoid: true
        });
        await e.save();
      }

      // Create 2 flexible events (piercesVoid: false)
      for (let i = 1; i <= 2; i++) {
        const e = new Event({
          userId,
          title: `Flexible Study ${i}`,
          startTime: new Date(baseTime.getTime() + i * 3600000),
          endTime: new Date(baseTime.getTime() + (i + 1) * 3600000),
          type: 'Meeting',
          piercesVoid: false
        });
        await e.save();
      }

      // Recalculate sleep shift by 60 mins
      const res = await request(app)
        .post('/api/sleep/recalculate')
        .send({ userId: userId.toString(), oversleptMins: 60 });

      expect(res.status).toBe(200);
      expect(res.body.shiftedTasksCount).toBe(3);
      expect(res.body.protectedEventsCount).toBe(2);
      expect(res.body.shiftedEventsCount).toBe(2);

      // Verify flexible tasks were shifted by 60 mins
      const flexTasks = await Task.find({ userId, isFlexible: true });
      flexTasks.forEach((t, idx) => {
        const expected = new Date(baseTime.getTime() + (idx + 1) * 3600000 + 3600000).toISOString();
        expect(t.deadline.toISOString()).toBe(expected);
      });

      // Verify rigid tasks were NOT shifted
      const rigidTasks = await Task.find({ userId, isFlexible: false });
      rigidTasks.forEach((t, idx) => {
        const expected = new Date(baseTime.getTime() + (idx + 1) * 3600000).toISOString();
        expect(t.deadline.toISOString()).toBe(expected);
      });
    });

    test('oversleeping shift can create scheduling collisions between shifted flexible events and fixed protected events', async () => {
      const userId = new mongoose.Types.ObjectId();
      const baseTime = new Date('2026-08-03T08:00:00Z');

      // Flexible event 9:00 - 10:00 AM
      const flexEvent = new Event({
        userId,
        title: 'Flexible Morning Reading',
        startTime: new Date(baseTime.getTime() + 1 * 3600000),
        endTime: new Date(baseTime.getTime() + 2 * 3600000),
        type: 'Meeting',
        piercesVoid: false
      });
      await flexEvent.save();

      // Protected Class 10:30 - 11:30 AM
      const protectedEvent = new Event({
        userId,
        title: 'Protected Lecture',
        startTime: new Date(baseTime.getTime() + 2.5 * 3600000),
        endTime: new Date(baseTime.getTime() + 3.5 * 3600000),
        type: 'Class',
        piercesVoid: true
      });
      await protectedEvent.save();

      // Oversleep by 60 mins
      await request(app)
        .post('/api/sleep/recalculate')
        .send({ userId: userId.toString(), oversleptMins: 60 });

      const updatedFlex = await Event.findById(flexEvent._id);
      const updatedProtected = await Event.findById(protectedEvent._id);

      // Flex event shifted to 10:00 - 11:00 AM
      // Protected event remains 10:30 - 11:30 AM
      // Collision detected! (Overlap between 10:30 and 11:00 AM)
      const hasOverlap = updatedFlex.startTime < updatedProtected.endTime && updatedFlex.endTime > updatedProtected.startTime;
      expect(hasOverlap).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. Void State Filtering & Webhook Inconsistency
  // -------------------------------------------------------------
  describe('5. Void State Filtering with piercesVoid true vs false', () => {
    test('active Void state mutes piercesVoid: false events and allows piercesVoid: true events', async () => {
      const user = new User({
        googleId: 'void-test-user',
        email: 'voidtest@example.com',
        voidState: {
          isActive: true,
          endTime: new Date(Date.now() + 2 * 3600000)
        }
      });
      await user.save();

      const e1 = new Event({
        userId: user._id,
        title: 'Soft Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Meeting',
        piercesVoid: false
      });
      await e1.save();

      const e2 = new Event({
        userId: user._id,
        title: 'Hard Class',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Class',
        piercesVoid: true
      });
      await e2.save();

      const res = await request(app)
        .post('/api/events/check-void')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.isVoidActive).toBe(true);
      expect(res.body.totalEvents).toBe(2);
      expect(res.body.activeNotificationsCount).toBe(1);
      expect(res.body.activeNotifications[0]._id).toBe(e2._id.toString());
    });

    test('expired Void state (isActive: true but endTime in past) returns all events', async () => {
      const user = new User({
        googleId: 'void-expired-user',
        email: 'voidexpired@example.com',
        voidState: {
          isActive: true,
          endTime: new Date(Date.now() - 60000) // 1 min ago
        }
      });
      await user.save();

      const e1 = new Event({
        userId: user._id,
        title: 'Soft Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'Meeting',
        piercesVoid: false
      });
      await e1.save();

      const res = await request(app)
        .post('/api/events/check-void')
        .send({ userId: user._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.isVoidActive).toBe(false);
      expect(res.body.activeNotificationsCount).toBe(1);
    });

    test('INCONSISTENCY CHECK: Webhook defaults Meeting to piercesVoid: true, whereas POST /api/events defaults Meeting to piercesVoid: false', async () => {
      const userId = new mongoose.Types.ObjectId();

      // 1. Direct API creation for Meeting
      const resDirect = await request(app)
        .post('/api/events')
        .send({
          userId,
          title: 'Direct Meeting',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          type: 'Meeting'
        });
      expect(resDirect.status).toBe(201);
      expect(resDirect.body.piercesVoid).toBe(false);

      // 2. Webhook API creation for Meeting
      const resWebhook = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'Webhook Meeting',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          type: 'Meeting'
        });
      expect(resWebhook.status).toBe(201);
      // EMPIRICAL INCONSISTENCY FINDING: Webhook assigns piercesVoid = true for Meeting!
      expect(resWebhook.body.event.piercesVoid).toBe(true);
    });
  });
});
