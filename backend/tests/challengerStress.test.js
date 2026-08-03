const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');

describe('Challenger Stress & Boundary Analysis Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  describe('1. Papaparse CSV Parsing Boundary Tests', () => {
    test('Empty csvData string returns 400', async () => {
      const res = await request(app)
        .post('/api/academic/import-csv')
        .send({ csvData: '' });
      expect(res.status).toBe(400);
    });

    test('Whitespace csvData parses to empty array', async () => {
      const res = await request(app)
        .post('/api/academic/import-csv')
        .send({ csvData: '   \n\n\t  ' });
      expect(res.status).toBe(200);
      expect(res.body.rowCount).toBe(0);
    });

    test('Non-string csvData object causes 500 server crash', async () => {
      const objRes = await request(app)
        .post('/api/academic/import-csv')
        .send({ csvData: { code: 'MBA101' } });
      expect(objRes.status).toBe(500);
    });

    test('Duplicate headers in CSV overwrites previous column data', async () => {
      const csvWithDupHeaders = `Subject,Status,Status\nMBA601,Attended,Missed`;
      const res = await request(app)
        .post('/api/academic/import-csv')
        .send({ csvData: csvWithDupHeaders });
      expect(res.status).toBe(200);
      expect(res.body.data[0].Status).toBe('Missed');
    });
  });

  describe('2. Attendance Safe Bunk Boundary & Deficit Logic Tests', () => {
    test('Target attendance = 0% causes Division by Zero yielding Infinity safeBunks', async () => {
      const res = await request(app)
        .post('/api/academic/safe-bunks')
        .send({
          totalClasses: 10,
          attendedClasses: 8,
          targetPct: 0
        });
      expect(res.status).toBe(200);
      expect(res.body.safeBunks === Infinity).toBe(true);
    });

    test('bunkDeficit formula computes correct required classes when below target', async () => {
      const res = await request(app)
        .post('/api/academic/safe-bunks')
        .send({
          totalClasses: 10,
          attendedClasses: 5,
          targetPct: 0.75
        });
      expect(res.status).toBe(200);
      expect(res.body.bunkDeficit).toBe(10);
      const newTotal = 10 + res.body.bunkDeficit;
      const newAttended = 5 + res.body.bunkDeficit;
      const achievedPct = (newAttended / newTotal) * 100;
      expect(achievedPct >= 75).toBe(true);
    });
  });

  describe('3. Zapier Webhook Payload Handling Tests', () => {
    const userId = new mongoose.Types.ObjectId();

    test('String boolean piercesVoid: "false" correctly evaluates to false', async () => {
      const res = await request(app)
        .post('/api/webhooks/events')
        .send({
          userId,
          title: 'String False Test',
          type: 'Class',
          piercesVoid: 'false'
        });
      expect(res.status).toBe(201);
      expect(res.body.event.piercesVoid).toBe(false);
    });
  });

  describe('4. User Sleep Cycle & Recalculator Tests', () => {
    test('Bedtime endpoint returns dynamically calculated suggested bedtime based on user settings', async () => {
      const user1 = new User({
        googleId: 'g-user-1',
        email: 'user1@example.com',
        sleepSettings: {
          targetWakeTime: '06:00',
          sleepCycles: 5,
          latencyMins: 15
        }
      });
      await user1.save();

      const res = await request(app).get(`/api/users/${user1._id}/bedtime`);
      expect(res.status).toBe(200);
      expect(res.body.suggestedBedtime).toBe('22:15');
    });

    test('Sleep recalculate rejects 0 or negative overslept duration', async () => {
      const userId = new mongoose.Types.ObjectId();
      const resZero = await request(app)
        .post('/api/sleep/recalculate')
        .send({ userId: userId.toString(), oversleptMins: 0 });
      expect(resZero.status).toBe(400);
    });
  });
});
