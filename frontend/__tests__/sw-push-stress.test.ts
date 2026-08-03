describe('Service Worker Push & Notification Click Stress Tests', () => {
  let listeners = {};
  let showNotificationMock;
  let matchAllMock;
  let openWindowMock;

  beforeEach(() => {
    listeners = {};

    showNotificationMock = jest.fn().mockResolvedValue(undefined);
    matchAllMock = jest.fn();
    openWindowMock = jest.fn().mockResolvedValue(undefined);

    global.self = {
      addEventListener: jest.fn((event, callback) => {
        listeners[event] = callback;
      }),
      registration: {
        showNotification: showNotificationMock,
      },
      clients: {
        matchAll: matchAllMock,
        openWindow: openWindowMock,
      },
      location: {
        origin: 'http://localhost:3000',
      },
    };

    try {
      delete require.cache[require.resolve('../worker/index.ts')];
    } catch (_err) {}
    require('../worker/index.ts');
  });

  afterEach(() => {
    delete global.self;
  });

  it('push event: handles null event.data gracefully', async () => {
    const waitUntilPromises = [];
    const mockEvent = {
      data: null,
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'New notification received',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
      },
    });
  });

  it('push event: handles undefined event.data gracefully', async () => {
    const waitUntilPromises = [];
    const mockEvent = {
      data: undefined,
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'New notification received',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
      },
    });
  });

  it('push event: handles json() returning null', async () => {
    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => null,
        text: () => 'null',
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'New notification received',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
      },
    });
  });

  it('push event: handles json() returning primitive strings, numbers, booleans', async () => {
    const primitives = ['string payload', 12345, true];

    for (const primitive of primitives) {
      showNotificationMock.mockClear();
      const waitUntilPromises = [];
      const mockEvent = {
        data: {
          json: () => primitive,
          text: () => String(primitive),
        },
        waitUntil: (p) => {
          waitUntilPromises.push(p);
        },
      };

      listeners['push'](mockEvent);
      await Promise.all(waitUntilPromises);

      expect(showNotificationMock.mock.calls.length).toBe(1);
      expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
      expect(showNotificationMock.mock.calls[0][1]).toEqual({
        body: 'New notification received',
        icon: '/icon-192x192.png',
        data: {
          url: '/',
        },
      });
    }
  });

  it('push event: handles json() returning array gracefully', async () => {
    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => ['a', 'b'],
        text: () => '["a","b"]',
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'New notification received',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
        '0': 'a',
        '1': 'b',
      },
    });
  });

  it('push event: handles payload with all null fields', async () => {
    const nullPayload = {
      title: null,
      body: null,
      icon: null,
      url: null,
      data: null,
    };

    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => nullPayload,
        text: () => JSON.stringify(nullPayload),
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1].body).toBe('New notification received');
    expect(showNotificationMock.mock.calls[0][1].icon).toBe('/icon-192x192.png');
  });

  it('push event: handles payload when payload.notification is null', async () => {
    const payload = {
      notification: null,
      title: 'Fallback Root Title',
      body: 'Fallback Root Body',
    };

    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => payload,
        text: () => JSON.stringify(payload),
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('Fallback Root Title');
    expect(showNotificationMock.mock.calls[0][1].body).toBe('Fallback Root Body');
  });

  it('push event: handles syntax error in JSON and failure in text extraction', async () => {
    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => {
          throw new SyntaxError('Malformed JSON');
        },
        text: () => {
          throw new Error('Stream read error');
        },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('AuDHD Life Tracker');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'New notification received',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
      },
    });
  });

  it('notificationclick event: handles missing or undefined notification.data', async () => {
    const closeMock = jest.fn();
    matchAllMock.mockResolvedValue([]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: undefined,
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls[0][0]).toEqual({ type: 'window', includeUncontrolled: true });
    expect(openWindowMock.mock.calls[0][0]).toBe('/');
  });

  it('notificationclick event: opens new window when no clients are open', async () => {
    const closeMock = jest.fn();
    matchAllMock.mockResolvedValue([]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: { url: '/tasks/pacing-check' },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(openWindowMock.mock.calls[0][0]).toBe('/tasks/pacing-check');
  });

  it('notificationclick event: focuses exact matching open window client', async () => {
    const closeMock = jest.fn();
    const focusMock = jest.fn().mockResolvedValue(undefined);

    matchAllMock.mockResolvedValue([
      { url: 'http://localhost:3000/tasks/pacing-check', focus: focusMock },
    ]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: { url: '/tasks/pacing-check' },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(focusMock.mock.calls.length).toBe(1);
    expect(openWindowMock.mock.calls.length).toBe(0);
  });

  it('notificationclick event: focuses first open window client if no exact URL match exists', async () => {
    const closeMock = jest.fn();
    const focusMock = jest.fn().mockResolvedValue(undefined);

    matchAllMock.mockResolvedValue([
      { url: 'http://localhost:3000/dashboard', focus: focusMock },
    ]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: { url: '/tasks/pacing-check' },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(focusMock.mock.calls.length).toBe(1);
    expect(openWindowMock.mock.calls.length).toBe(0);
  });

  it('notificationclick event: handles missing openWindow method gracefully', async () => {
    global.self.clients.openWindow = undefined;

    const closeMock = jest.fn();
    matchAllMock.mockResolvedValue([]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: { url: '/tasks' },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls.length).toBe(1);
  });
});
