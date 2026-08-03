const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export interface SafeBunkRequest {
  totalClasses?: number;
  attendedClasses?: number;
  targetPct?: number;
  courseRef?: string;
  userId?: string;
}

export interface SafeBunkResponse {
  courseRef: string;
  totalClasses: number;
  attendedClasses: number;
  currentAttendancePct: number;
  targetAttendancePct: number;
  safeBunks: number;
  bunkDeficit: number;
  statusMessage: string;
}

export interface DeconstructResponse {
  totalEstimatedHours: number;
  chunks: Array<{
    stage: string;
    durationMins: number;
    completed: boolean;
  }>;
}

export interface VoidStateCheckResponse {
  isVoidActive: boolean;
  totalEvents: number;
  activeNotificationsCount: number;
  activeNotifications: any[];
}

export const subscribePushNotifications = (
  subscription: any,
  userId?: string
): Promise<any> => {
  const subJson =
    typeof subscription?.toJSON === 'function'
      ? subscription.toJSON()
      : subscription;

  return fetchJson('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subJson, userId }),
  });
};

export const api = {
  // Push Notifications
  subscribePushNotifications: (subscription: any, userId?: string) =>
    subscribePushNotifications(subscription, userId),

  // Academic & Attendance
  calculateSafeBunks: (data: SafeBunkRequest) =>
    fetchJson<SafeBunkResponse>('/api/academic/safe-bunks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEventAttendance: (eventId: string, status: 'Attended' | 'Missed') =>
    fetchJson<any>(`/api/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify({ 'attendance.status': status }),
    }),

  // Events & Void State
  getEvents: (userId?: string) =>
    fetchJson<any[]>(`/api/events${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),

  getEventById: (id: string) =>
    fetchJson<any>(`/api/events/${id}`),

  checkVoidState: (userId: string) =>
    fetchJson<VoidStateCheckResponse>('/api/events/check-void', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  toggleVoidState: (userId: string, isActive: boolean) =>
    fetchJson<any>(`/api/users/${userId}/void`, {
      method: 'POST',
      body: JSON.stringify({ isActive }),
    }),

  // Tasks & Assignment Deconstruction
  deconstructTask: (totalEstimatedHours: number) =>
    fetchJson<DeconstructResponse>('/api/tasks/deconstruct', {
      method: 'POST',
      body: JSON.stringify({ totalEstimatedHours }),
    }),

  // Chores
  getChores: (userId?: string) =>
    fetchJson<any[]>(`/api/chores${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),

  // User details
  getUser: (userId: string) =>
    fetchJson<any>(`/api/users/${userId}`),
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
  module.exports.api = api;
  module.exports.subscribePushNotifications = subscribePushNotifications;
  module.exports.default = api;
}

export default api;
