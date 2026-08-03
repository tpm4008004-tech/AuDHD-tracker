const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // OAuth & Identity
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String },
  calendarToken: { type: String }, // For 1-way sync out to Google Calendar
  
  // Push Subscription for Native/Web Push Notifications
  pushSubscription: {
    endpoint: { type: String },
    keys: {
      p256dh: { type: String },
      auth: { type: String }
    }
  },
  
  // Sleep & Auto-Recalculator logic
  sleepSettings: {
    targetWakeTime: { type: String, default: "07:30" }, // e.g., "07:30"
    sleepCycles: { type: Number, enum: [5, 6], default: 5 }, // 90-min cycles
    latencyMins: { type: Number, default: 15 } // Time to fall asleep
  },

  // Dopamine Fund (₹5,000 monthly limit visualizer)
  dopamineFund: {
    monthlyLimit: { type: Number, default: 5000 },
    currentSpent: { type: Number, default: 0 },
    lastResetMonth: { type: Number, default: () => new Date().getMonth() } // Used to auto-reset
  },

  // The "Void" Button state (Mutes soft notifications)
  voidState: {
    isActive: { type: Boolean, default: false },
    endTime: { type: Date } // 2 hours from activation
  }
}, { timestamps: true });

UserSchema.methods.calculateBedtime = function() {
  const wakeTime = (this.sleepSettings && this.sleepSettings.targetWakeTime) || "07:30";
  const cycles = (this.sleepSettings && typeof this.sleepSettings.sleepCycles === 'number') ? this.sleepSettings.sleepCycles : 5;
  const latency = (this.sleepSettings && typeof this.sleepSettings.latencyMins === 'number') ? this.sleepSettings.latencyMins : 15;

  const [hStr, mStr] = wakeTime.split(':');
  const targetH = parseInt(hStr, 10) || 0;
  const targetM = parseInt(mStr, 10) || 0;
  const wakeMins = targetH * 60 + targetM;

  const totalSleepMins = (cycles * 90) + latency;
  let bedtimeMins = wakeMins - totalSleepMins;

  while (bedtimeMins < 0) {
    bedtimeMins += 1440;
  }
  bedtimeMins = bedtimeMins % 1440;

  const bedtimeH = Math.floor(bedtimeMins / 60);
  const bedtimeM = bedtimeMins % 60;

  return `${String(bedtimeH).padStart(2, '0')}:${String(bedtimeM).padStart(2, '0')}`;
};

module.exports = mongoose.model('User', UserSchema);
