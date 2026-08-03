describe('Service Worker Push & Notification Click Handlers', () => {
  let listeners = {};
  let showNotificationMock;
  let matchAllMock;
  let openWindowMock;

  beforeEach(() => {
    listeners = {};

    showNotificationMock = jest.fn().mockResolvedValue(undefined);
    matchAllMock = jest.fn();
    openWindowMock = jest.fn().mockResolvedValue(undefined);

    // Mock global self, registration, and clients for Service Worker environment
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

  it('push event: executes push handler and calls showNotification with pacing check warning payload', async () => {
    expect(listeners['push']).toBeDefined();

    const pacingCheckPayload = {
      notification: {
        title: 'Milestone Pacing Warning: Essay 1',
        body: 'Task "Essay 1" is at 15% progress (< 20%). Action required!',
        icon: '/icon-192x192.png',
        url: '/tasks/essay-1',
      },
    };

    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => pacingCheckPayload,
        text: () => JSON.stringify(pacingCheckPayload),
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('Milestone Pacing Warning: Essay 1');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'Task "Essay 1" is at 15% progress (< 20%). Action required!',
      icon: '/icon-192x192.png',
      data: {
        url: '/tasks/essay-1',
      },
    });
  });

  it('push event: handles flat payload root structure correctly', async () => {
    expect(listeners['push']).toBeDefined();

    const flatPayload = {
      title: 'Flat Pacing Warning',
      body: 'Progress is 10%',
      icon: '/custom-icon.png',
      url: '/tasks/flat-1',
    };

    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => flatPayload,
        text: () => JSON.stringify(flatPayload),
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['push'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(showNotificationMock.mock.calls.length).toBe(1);
    expect(showNotificationMock.mock.calls[0][0]).toBe('Flat Pacing Warning');
    expect(showNotificationMock.mock.calls[0][1]).toEqual({
      body: 'Progress is 10%',
      icon: '/custom-icon.png',
      data: {
        url: '/tasks/flat-1',
        title: 'Flat Pacing Warning',
        body: 'Progress is 10%',
        icon: '/custom-icon.png',
        url: '/tasks/flat-1',
      },
    });
  });

  it('push event: handles non-JSON text gracefully with default fallback title', async () => {
    expect(listeners['push']).toBeDefined();

    const waitUntilPromises = [];
    const mockEvent = {
      data: {
        json: () => {
          throw new SyntaxError('Unexpected token');
        },
        text: () => 'Plain text notification warning message',
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
      body: 'Plain text notification warning message',
      icon: '/icon-192x192.png',
      data: {
        url: '/',
      },
    });
  });

  it('notificationclick event: closes notification and focuses an existing matching window client', async () => {
    expect(listeners['notificationclick']).toBeDefined();

    const closeMock = jest.fn();
    const focusMock = jest.fn().mockResolvedValue(undefined);

    const existingClient = {
      url: 'http://localhost:3000/tasks/essay-1',
      focus: focusMock,
    };

    matchAllMock.mockResolvedValue([existingClient]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: {
          url: '/tasks/essay-1',
        },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls[0][0]).toEqual({ type: 'window', includeUncontrolled: true });
    expect(focusMock.mock.calls.length).toBe(1);
    expect(openWindowMock.mock.calls.length).toBe(0);
  });

  it('notificationclick event: closes notification and calls openWindow if no matching or open window client exists', async () => {
    expect(listeners['notificationclick']).toBeDefined();

    const closeMock = jest.fn();
    matchAllMock.mockResolvedValue([]);

    const waitUntilPromises = [];
    const mockEvent = {
      notification: {
        close: closeMock,
        data: {
          url: '/tasks/essay-1',
        },
      },
      waitUntil: (p) => {
        waitUntilPromises.push(p);
      },
    };

    listeners['notificationclick'](mockEvent);
    await Promise.all(waitUntilPromises);

    expect(closeMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls.length).toBe(1);
    expect(matchAllMock.mock.calls[0][0]).toEqual({ type: 'window', includeUncontrolled: true });
    expect(openWindowMock.mock.calls.length).toBe(1);
    expect(openWindowMock.mock.calls[0][0]).toBe('/tasks/essay-1');
  });
});
