const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');

describe('4-Stage Assignment Deconstructor', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('deconstructs Assignment into strictly 30-minute chunks across 4 stages', async () => {
    const userId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post('/api/tasks')
      .send({
        userId,
        title: 'Corporate Strategy Term Paper',
        type: 'Assignment',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        assignmentDetails: {
          totalEstimatedHours: 4
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('Assignment');
    expect(res.body.assignmentDetails).toBeDefined();

    const chunks = res.body.assignmentDetails.chunks;
    // 4 hours = 240 mins => 8 chunks of 30 mins
    expect(chunks.length).toBe(8);

    chunks.forEach(chunk => {
      expect(chunk.durationMins).toBe(30);
      expect([
        'Context/Primary Research',
        'Secondary Requirements',
        'Execution',
        'Polishing'
      ]).toContain(chunk.stage);
    });

    // Check count of each stage (2 per stage)
    const contextChunks = chunks.filter(c => c.stage === 'Context/Primary Research');
    const secondaryChunks = chunks.filter(c => c.stage === 'Secondary Requirements');
    const executionChunks = chunks.filter(c => c.stage === 'Execution');
    const polishingChunks = chunks.filter(c => c.stage === 'Polishing');

    expect(contextChunks.length).toBe(2);
    expect(secondaryChunks.length).toBe(2);
    expect(executionChunks.length).toBe(2);
    expect(polishingChunks.length).toBe(2);
  });

  test('deconstruct endpoint handles direct totalEstimatedHours input', async () => {
    const res = await request(app)
      .post('/api/tasks/deconstruct')
      .send({ totalEstimatedHours: 2 });

    expect(res.status).toBe(200);
    // 2 hours = 120 mins => 4 chunks of 30 mins (1 chunk per stage)
    expect(res.body.chunks.length).toBe(4);
    res.body.chunks.forEach(chunk => {
      expect(chunk.durationMins).toBe(30);
    });
  });
});
