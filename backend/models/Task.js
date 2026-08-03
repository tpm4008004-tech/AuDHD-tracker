const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['General', 'Assignment', 'Book', 'Hustle'], 
    default: 'General' 
  },
  
  // Dynamic Rollover & Pacing Logic
  deadline: { type: Date, required: true },
  originalDeadline: { type: Date }, // To track how far it's drifted
  progressPct: { type: Number, default: 0 }, // 0 to 100
  isFlexible: { type: Boolean, default: true }, // If true, gets shifted when oversleeping
  
  // Ceiling Math Rollovers
  rolloverCount: { type: Number, default: 0 },
  
  // Milestone Pacing
  lastPacingCheck: { type: Date, default: Date.now },
  pacingWarningSent: { type: Boolean, default: false }, // Set to true if < 20% warning sent

  // 4-Stage Assignment Deconstructor (Only used if type === 'Assignment')
  assignmentDetails: {
    totalEstimatedHours: { type: Number },
    chunks: [{
      stage: { 
        type: String, 
        enum: ['Context/Primary Research', 'Secondary Requirements', 'Execution', 'Polishing'] 
      },
      durationMins: { type: Number, default: 30 }, // Strictly 30 min chunks
      completed: { type: Boolean, default: false }
    }]
  },

  // Smart Book Tracker (Only used if type === 'Book')
  bookDetails: {
    totalPages: { type: Number },
    pagesRead: { type: Number, default: 0 },
    // Uses baseline: 100 pages = 1 hour. Virtual field will calculate remaining time.
  }
}, { timestamps: true });

TaskSchema.methods.calculateRollover = function(currentDate) {
  const now = currentDate ? new Date(currentDate) : new Date();
  const deadlineDate = new Date(this.deadline);
  if (this.progressPct < 100 && now > deadlineDate) {
    const remainingDays = Math.ceil(((100 - this.progressPct) / 100) * 4);
    if (remainingDays > 0) {
      if (!this.originalDeadline) {
        this.originalDeadline = this.deadline;
      }
      this.deadline = new Date(deadlineDate.getTime() + remainingDays * 86400000);
      this.rolloverCount = (this.rolloverCount || 0) + 1;
    }
  }
};

module.exports = mongoose.model('Task', TaskSchema);
