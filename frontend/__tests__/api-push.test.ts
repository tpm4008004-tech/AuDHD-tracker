import { subscribePushNotifications, api } from '../lib/api';

describe('Push Notifications API Client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts push subscription object to /api/notifications/subscribe', async () => {
    const mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-device-token-123',
      keys: {
        p256dh: 'BNc_test_p256dh_key_sample',
        auth: 'test_auth_secret_sample',
      },
    };

    const mockResponseBody = {
      success: true,
      message: 'Push subscription saved',
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponseBody),
    });

    const result = await subscribePushNotifications(mockSubscription, 'user123');

    expect(global.fetch.mock.calls.length).toBe(1);
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/notifications/subscribe');
    expect(global.fetch.mock.calls[0][1]).toEqual({
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        subscription: mockSubscription,
        userId: 'user123',
      }),
    });
    expect(result).toEqual(mockResponseBody);
  });

  it('handles PushSubscription object with toJSON method via api object wrapper', async () => {
    const mockSubJson = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-device-token-456',
      keys: {
        p256dh: 'key456',
        auth: 'auth456',
      },
    };

    const mockPushSubscription = {
      toJSON: jest.fn().mockReturnValue(mockSubJson),
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true, message: 'Push subscription saved' }),
    });

    const response = await api.subscribePushNotifications(mockPushSubscription, 'user456');

    expect(mockPushSubscription.toJSON.mock.calls.length).toBe(1);
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:5000/api/notifications/subscribe');
    expect(global.fetch.mock.calls[0][1]).toEqual({
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        subscription: mockSubJson,
        userId: 'user456',
      }),
    });
    expect(response).toEqual({ success: true, message: 'Push subscription saved' });
  });

  it('throws an error when HTTP response is not ok', async () => {
    const mockSubscription = {
      endpoint: 'https://invalid-endpoint',
    };

    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ error: 'Push subscription payload is invalid' }),
    });

    let thrownError;
    try {
      await subscribePushNotifications(mockSubscription);
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();
    expect(thrownError.message).toBe('Push subscription payload is invalid');
  });
});
