const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  title: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  type: { 
    type: String, 
    enum: ['Class', 'Meeting', 'ProtectedBlock', 'Void'], // Void blocks mute everything else
    required: true 
  },
  
  // 1-Way Google Calendar Sync (App is Source of Truth)
  googleEventId: { type: String }, // Stores ID after pushing to GCal
  
  // Hard Deadlines / Classes pierce the Void state
  piercesVoid: { type: Boolean, default: false }, 

  // Attendance Tracker (Only for Classes)
  attendance: {
    isClass: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Attended', 'Missed'], default: 'Pending' },
    // E.g. "12/15 completed" - this helps calculate Safe Bunks across a semester.
    // In a real app, these targets might live on a separate "Course" schema, 
    // but for simplicity they are aggregated here.
    courseRef: { type: String } 
  },
  
  webhookSource: { type: String } // e.g., 'Zapier', 'Make', 'Manual'

}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
