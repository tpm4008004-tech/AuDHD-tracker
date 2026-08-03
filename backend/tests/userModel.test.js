const { connectDB, closeDB, clearDB } = require('./setup');
const User = require('../models/User');

describe('User Model Default Date Bug Fix', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  test('lastResetMonth default should evaluate dynamically via function', async () => {
    const currentMonth = new Date().getMonth();
    const user = new User({
      googleId: 'google-12345',
      email: 'test@example.com',
      name: 'Test User'
    });
    await user.save();

    expect(user.dopamineFund.lastResetMonth).toBe(currentMonth);
    expect(typeof User.schema.path('dopamineFund.lastResetMonth').defaultValue).toBe('function');
  });
});
