import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  type: { type: String, enum: ['study', 'break'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: 0, min: 0 }
}, { _id: true });

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateKey: { type: String, required: true, index: true },
  loginAt: { type: Date, required: true },
  logoutAt: { type: Date, default: null },
  totalDuration: { type: Number, default: 0, min: 0 },
  studyDuration: { type: Number, default: 0, min: 0 },
  breakDuration: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['studying', 'break', 'logged_out'], default: 'studying' },
  activities: { type: [activitySchema], default: [] }
}, { timestamps: true, optimisticConcurrency: true });

sessionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { logoutAt: null } }
);
sessionSchema.index({ userId: 1, dateKey: -1 });

export default mongoose.model('StudySession', sessionSchema);
