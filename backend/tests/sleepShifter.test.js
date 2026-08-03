const request = require('supertest');
const app = require('../app');
const { connectDB, closeDB, clearDB } = require('./setup');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Event = require('../models/Event');

describe('Sleep Shifter Service', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('shifts flexible tasks by overslept duration while protecting piercesVoid events', async () => {
    const userId = new mongoose.Types.ObjectId();
    const now = new Date('2026-08-03T08:00:00Z');

    const initialTaskDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 12:00
    const initialClassStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const initialMeetingStart = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // 1. Flexible Task (should be shifted)
    const flexibleTask = new Task({
      userId,
      title: 'Read Economics Chapter 4',
      type: 'Book',
      deadline: initialTaskDeadline,
      isFlexible: true
    });
    await flexibleTask.save();

    // 2. Rigid Task (isFlexible: false, should NOT be shifted)
    const rigidTask = new Task({
      userId,
      title: 'Fixed Submission Deadline',
      type: 'Assignment',
      deadline: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      isFlexible: false
    });
    await rigidTask.save();

    // 3. Protected Event (piercesVoid: true, hard deadline / class)
    const protectedClassEvent = new Event({
      userId,
      title: 'Live Case Study Seminar',
      startTime: initialClassStart,
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      type: 'Class',
      piercesVoid: true
    });
    await protectedClassEvent.save();

    // 4. Flexible Event (piercesVoid: false)
    const flexibleMeetingEvent = new Event({
      userId,
      title: 'Flexible Study Session',
      startTime: initialMeetingStart,
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      type: 'Meeting',
      piercesVoid: false
    });
    await flexibleMeetingEvent.save();

    // Overslept by 90 minutes (1.5 hours)
    const res = await request(app)
      .post('/api/sleep/recalculate')
      .send({
        userId: userId.toString(),
        oversleptMins: 90
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.shiftedTasksCount).toBe(1);
    expect(res.body.protectedEventsCount).toBe(1);

    // Verify Flexible Task was shifted by 90 mins
    const updatedFlexibleTask = await Task.findById(flexibleTask._id);
    const expectedTaskDeadline = new Date(initialTaskDeadline.getTime() + 90 * 60 * 1000);
    expect(updatedFlexibleTask.deadline.toISOString()).toBe(expectedTaskDeadline.toISOString());

    // Verify Rigid Task was NOT shifted
    const updatedRigidTask = await Task.findById(rigidTask._id);
    expect(updatedRigidTask.deadline.toISOString()).toBe(rigidTask.deadline.toISOString());

    // Verify Protected Class Event start time was NOT shifted
    const updatedProtectedEvent = await Event.findById(protectedClassEvent._id);
    expect(updatedProtectedEvent.startTime.toISOString()).toBe(initialClassStart.toISOString());

    // Verify Flexible Event start time WAS shifted by 90 mins
    const updatedFlexibleEvent = await Event.findById(flexibleMeetingEvent._id);
    const expectedEventStart = new Date(initialMeetingStart.getTime() + 90 * 60 * 1000);
    expect(updatedFlexibleEvent.startTime.toISOString()).toBe(expectedEventStart.toISOString());
  });
});
