const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Event = require('../models/Event');
const Chore = require('../models/Chore');

describe('CRUD Routes & Zapier Webhook Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  const userId = new mongoose.Types.ObjectId();

  test('Task CRUD operations', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/tasks')
      .send({
        userId,
        title: 'Study Accounting',
        type: 'General',
        deadline: new Date()
      });
    expect(createRes.status).toBe(201);
    const taskId = createRes.body._id;

    // Read list
    const listRes = await request(app).get(`/api/tasks?userId=${userId}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);

    // Read single
    const singleRes = await request(app).get(`/api/tasks/${taskId}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.title).toBe('Study Accounting');

    // Update
    const updateRes = await request(app)
      .put(`/api/tasks/${taskId}`)
      .send({ progressPct: 80 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.progressPct).toBe(80);

    // Delete
    const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);
    expect(deleteRes.status).toBe(200);
  });

  test('Event CRUD operations', async () => {
    const createRes = await request(app)
      .post('/api/events')
      .send({
        userId,
        title: 'Group Strategy Meeting',
        type: 'Meeting',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000)
      });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body._id;

    const singleRes = await request(app).get(`/api/events/${eventId}`);
    expect(singleRes.status).toBe(200);
    expect(singleRes.body.title).toBe('Group Strategy Meeting');
  });

  test('Chore CRUD operations', async () => {
    const createRes = await request(app)
      .post('/api/chores')
      .send({
        userId,
        title: 'Clean Desk',
        category: 'Clean Desk'
      });
    expect(createRes.status).toBe(201);
    const choreId = createRes.body._id;

    const listRes = await request(app).get(`/api/chores?userId=${userId}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body[0].isDue).toBe(true);
  });

  test('Zapier webhook POST /api/webhooks/events sets piercesVoid', async () => {
    const webhookRes = await request(app)
      .post('/api/webhooks/events')
      .send({
        userId,
        title: 'Zapier Synced Exam Review',
        type: 'Class',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        googleEventId: 'gcal-event-999'
      });

    expect(webhookRes.status).toBe(201);
    expect(webhookRes.body.success).toBe(true);
    expect(webhookRes.body.event.piercesVoid).toBe(true);
    expect(webhookRes.body.event.webhookSource).toBe('Zapier');

    // Verify event in DB
    const savedEvent = await Event.findById(webhookRes.body.event._id);
    expect(savedEvent.piercesVoid).toBe(true);
  });
});
