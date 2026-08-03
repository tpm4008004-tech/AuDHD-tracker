const mongoose = require('mongoose');

const MealLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  date: { type: Date, required: true }, // Normalized to start of day
  
  // The 4 Windows
  // Target is to hit 3 out of 4.
  breakfast: {
    logged: { type: Boolean, default: false },
    timeWindow: { type: String, default: "08:00-10:00" }
  },
  lunch: {
    logged: { type: Boolean, default: false },
    timeWindow: { type: String, default: "13:00-15:00" }
  },
  snacks: {
    logged: { type: Boolean, default: false },
    timeWindow: { type: String, default: "18:00-19:00" }
  },
  dinner: {
    logged: { type: Boolean, default: false },
    timeWindow: { type: String, default: "20:00-22:30" }
  },

  // Cron job checks this to ping if falling behind
  warningSent: { type: Boolean, default: false }

}, { timestamps: true });

// Virtual to check if target (3/4) is met
MealLogSchema.virtual('targetMet').get(function() {
  const count = [this.breakfast.logged, this.lunch.logged, this.snacks.logged, this.dinner.logged].filter(Boolean).length;
  return count >= 3;
});

module.exports = mongoose.model('MealLog', MealLogSchema);
