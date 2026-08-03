const mongoose = require('mongoose');

const ChoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Clean Desk', 'Bathing', 'Room Arrangement', 'Cupboard', 'Laundry'],
    required: true 
  },
  
  // Floating Deadlines (e.g., 48 to 72 hours instead of a strict time)
  cycleHoursMin: { type: Number, default: 48 },
  cycleHoursMax: { type: Number, default: 72 },
  lastCompleted: { type: Date },
  
  // The 15-Minute Audio Buffer Logic
  audioBuffer: {
    enabled: { type: Boolean, default: true },
    preTransitionMins: { type: Number, default: 15 },
    postTransitionMins: { type: Number, default: 15 },
    audioSource: { type: String, default: '/audio/lofi-buffer.mp3' } // Local public dir
  },

  // Laundry Specific Logic (No actual washing time)
  laundryPhase: { 
    type: String, 
    enum: ['None', 'Gather & Give', 'Collect'], 
    default: 'None' 
  },
  baseDurationMins: { type: Number, default: 30 } // Main task time, excluding buffers

}, { timestamps: true });

// Virtual for calculating if the chore is currently due
ChoreSchema.virtual('isDue').get(function() {
  if (!this.lastCompleted) return true;
  const hoursSince = (Date.now() - this.lastCompleted.getTime()) / (1000 * 60 * 60);
  return hoursSince >= this.cycleHoursMin;
});

module.exports = mongoose.model('Chore', ChoreSchema);
