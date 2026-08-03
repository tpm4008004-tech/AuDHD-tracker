const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');

describe('Academic Parser & 2-Tap Attendance Calculator', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('Papaparse CSV import endpoint parses CSV string correctly', async () => {
    const sampleCsv = `CourseCode,CourseName,TotalClasses,AttendedClasses\nMBA601,Corporate Strategy,20,18\nMBA602,Financial Accounting,20,14`;

    const res = await request(app)
      .post('/api/academic/import-csv')
      .send({ csvData: sampleCsv });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rowCount).toBe(2);
    expect(res.body.headers).toEqual(['CourseCode', 'CourseName', 'TotalClasses', 'AttendedClasses']);
    expect(res.body.data[0].CourseCode).toBe('MBA601');
    expect(res.body.data[0].AttendedClasses).toBe(18);
  });

  test('2-tap attendance safe bunk calculator computes correct safe bunks', async () => {
    // 15 attended out of 15 total classes at 75% target => Math.floor(15 / 0.75) - 15 = 20 - 15 = 5 safe bunks
    const res = await request(app)
      .post('/api/academic/safe-bunks')
      .send({
        totalClasses: 15,
        attendedClasses: 15,
        targetPct: 0.75
      });

    expect(res.status).toBe(200);
    expect(res.body.safeBunks).toBe(5);
    expect(res.body.currentAttendancePct).toBe(100);
    expect(res.body.targetAttendancePct).toBe(75);
  });

  test('2-tap attendance calculator handles attendance deficit when below target', async () => {
    // 10 attended out of 16 total classes => 62.5% attendance vs 75% target
    const res = await request(app)
      .post('/api/academic/safe-bunks')
      .send({
        totalClasses: 16,
        attendedClasses: 10,
        targetPct: 0.75
      });

    expect(res.status).toBe(200);
    expect(res.body.safeBunks).toBe(0);
    expect(res.body.bunkDeficit).toBeGreaterThan(0);
    expect(res.body.statusMessage).toContain('Warning: You are below');
  });
});
