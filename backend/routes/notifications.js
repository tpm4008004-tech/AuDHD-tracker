const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * POST /api/notifications/subscribe
 * Validates and persists push subscription object in MongoDB User collection.
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body || {};

    // Validation check: subscription, endpoint, and keys (p256dh, auth) must exist
    if (
      !subscription ||
      typeof subscription !== 'object' ||
      !subscription.endpoint ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.keys ||
      typeof subscription.keys !== 'object' ||
      !subscription.keys.p256dh ||
      !subscription.keys.auth
    ) {
      return res.status(400).json({
        error: 'Invalid push subscription. Payload must include subscription object with endpoint and keys (p256dh, auth).'
      });
    }

    let user;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user) {
      user = await User.findOne();
    }
    if (!user) {
      user = new User({
        googleId: 'default_google_id_' + Date.now(),
        email: 'user@example.com',
        name: 'Default User'
      });
    }

    user.pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Push subscription saved successfully',
      pushSubscription: user.pushSubscription
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
