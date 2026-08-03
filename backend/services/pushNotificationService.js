const webpush = require('web-push');

// Set VAPID details with environment variables or fallback values for dev/testing
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvH5_t49LgW1m_u9dM-0_2t3k4567890abcdef_dummy_public';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'dummy_private_key_1234567890abcdef';
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@audhd-tracker.local';

try {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
} catch (err) {
  console.warn('VAPID initialization notice:', err.message);
}

/**
 * Safe push notification dispatch wrapper using web-push
 * @param {Object} subscription - PushSubscription object containing endpoint and keys
 * @param {Object|String} payload - Notification payload
 * @returns {Promise<Object>} Result object with success flag and detail/error
 */
async function sendPushNotification(subscription, payload) {
  if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
    return { success: false, reason: 'Invalid or missing push subscription object' };
  }

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  try {
    const result = await webpush.sendNotification(subscription, payloadString);
    return { success: true, result };
  } catch (err) {
    console.error('Push notification send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPushNotification
};
