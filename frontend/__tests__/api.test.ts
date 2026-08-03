const api = require('../lib/api.ts').default || require('../lib/api.ts').api;

function createSpy(implementation) {
  const fn = function (...args) {
    fn.calls.push(args);
    if (fn.implementation) {
      return fn.implementation(...args);
    }
  };
  fn.calls = [];
  fn.implementation = implementation;
  return fn;
}

describe('lib/api.ts Empirical Verification & Stress Tests', () => {
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Academic & Attendance API', () => {
    it('calculateSafeBunks sends correct POST payload and headers', async () => {
      const mockResponse = {
        courseRef: 'CS101',
        totalClasses: 20,
        attendedClasses: 18,
        currentAttendancePct: 90,
        targetAttendancePct: 75,
        safeBunks: 4,
        bunkDeficit: 0,
        statusMessage: 'You can safely miss 4 more class(es).',
      };

      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockResponse,
      }));
      global.fetch = spyFetch;

      const requestData = {
        totalClasses: 20,
        attendedClasses: 18,
        targetPct: 0.75,
        courseRef: 'CS101',
        userId: 'user-1',
      };

      const result = await api.calculateSafeBunks(requestData);

      expect(spyFetch.calls.length).toBe(1);
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/academic/safe-bunks');
      expect(spyFetch.calls[0][1].method).toBe('POST');
      expect(spyFetch.calls[0][1].headers['Content-Type']).toBe('application/json');
      expect(spyFetch.calls[0][1].body).toBe(JSON.stringify(requestData));
      expect(result).toEqual(mockResponse);
    });

    it('updateEventAttendance sends PUT request with attendance status', async () => {
      const mockResponse = { _id: 'event-123', attendance: { status: 'Attended' } };

      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockResponse,
      }));
      global.fetch = spyFetch;

      const result = await api.updateEventAttendance('event-123', 'Attended');

      expect(spyFetch.calls.length).toBe(1);
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/events/event-123');
      expect(spyFetch.calls[0][1].method).toBe('PUT');
      expect(spyFetch.calls[0][1].body).toBe(JSON.stringify({ 'attendance.status': 'Attended' }));
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Events & Void State API', () => {
    it('getEvents handles optional userId parameter with encoding', async () => {
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => [],
      }));
      global.fetch = spyFetch;

      // Without userId
      await api.getEvents();
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/events');

      // With userId containing special characters
      await api.getEvents('user+test@domain.com');
      expect(spyFetch.calls[1][0]).toBe('http://localhost:5000/api/events?userId=user%2Btest%40domain.com');
    });

    it('getEventById sends GET request to specific id path', async () => {
      const mockEvent = { _id: 'evt-1', title: 'Lecture 1' };
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockEvent,
      }));
      global.fetch = spyFetch;

      const result = await api.getEventById('evt-1');
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/events/evt-1');
      expect(result).toEqual(mockEvent);
    });

    it('checkVoidState posts userId to /api/events/check-void', async () => {
      const mockVoidRes = {
        isVoidActive: true,
        totalEvents: 5,
        activeNotificationsCount: 2,
        activeNotifications: [],
      };
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockVoidRes,
      }));
      global.fetch = spyFetch;

      const result = await api.checkVoidState('usr-99');
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/events/check-void');
      expect(spyFetch.calls[0][1].method).toBe('POST');
      expect(spyFetch.calls[0][1].body).toBe(JSON.stringify({ userId: 'usr-99' }));
      expect(result).toEqual(mockVoidRes);
    });

    it('toggleVoidState posts isActive flag to /api/users/:userId/void', async () => {
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => ({ success: true }),
      }));
      global.fetch = spyFetch;

      await api.toggleVoidState('usr-99', true);
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/users/usr-99/void');
      expect(spyFetch.calls[0][1].method).toBe('POST');
      expect(spyFetch.calls[0][1].body).toBe(JSON.stringify({ isActive: true }));
    });
  });

  describe('Tasks & Chores API', () => {
    it('deconstructTask posts estimated hours to /api/tasks/deconstruct', async () => {
      const mockDeconstruct = {
        totalEstimatedHours: 4,
        chunks: [{ stage: 'Context/Primary Research', durationMins: 30, completed: false }],
      };
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockDeconstruct,
      }));
      global.fetch = spyFetch;

      const result = await api.deconstructTask(4);
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/tasks/deconstruct');
      expect(spyFetch.calls[0][1].method).toBe('POST');
      expect(spyFetch.calls[0][1].body).toBe(JSON.stringify({ totalEstimatedHours: 4 }));
      expect(result).toEqual(mockDeconstruct);
    });

    it('getChores correctly constructs query URL for chores endpoint', async () => {
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => [],
      }));
      global.fetch = spyFetch;

      await api.getChores('user-chores-1');
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/chores?userId=user-chores-1');
    });

    it('getUser fetches user by ID', async () => {
      const mockUser = { _id: 'u-10', name: 'Test User' };
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => mockUser,
      }));
      global.fetch = spyFetch;

      const result = await api.getUser('u-10');
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/users/u-10');
      expect(result).toEqual(mockUser);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('throws error message from JSON error payload on HTTP error response', async () => {
      global.fetch = createSpy(async () => ({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid parameters provided' }),
      }));

      let caught = null;
      try {
        await api.getUser('invalid-id');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toBe('Invalid parameters provided');
    });

    it('falls back to statusText when non-ok response body is not JSON', async () => {
      global.fetch = createSpy(async () => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Unexpected token <');
        },
      }));

      let caught = null;
      try {
        await api.getEvents();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toBe('Internal Server Error');
    });

    it('propagates network rejections from fetch', async () => {
      global.fetch = createSpy(async () => {
        throw new TypeError('Failed to fetch');
      });

      let caught = null;
      try {
        await api.getChores();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(caught.message).toBe('Failed to fetch');
    });
  });

  describe('Adversarial & Edge Case Mine', () => {
    it('handles 204 No Content gracefully or fails deterministically on JSON parse', async () => {
      global.fetch = createSpy(async () => ({
        ok: true,
        status: 204,
        statusText: 'No Content',
        json: async () => {
          throw new SyntaxError('Unexpected end of JSON input');
        },
      }));

      let caught = null;
      try {
        await api.getEvents();
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeDefined();
      expect(caught.name).toBe('SyntaxError');
    });

    it('handles non-string userId safely in query string building', async () => {
      const spyFetch = createSpy(async () => ({
        ok: true,
        json: async () => [],
      }));
      global.fetch = spyFetch;

      await api.getEvents(12345 as any);
      expect(spyFetch.calls[0][0]).toBe('http://localhost:5000/api/events?userId=12345');
    });
  });
});
