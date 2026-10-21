const mongoose = require('mongoose');
const answerSchema = new mongoose.Schema({ questionId: { type: String, required: true, trim: true, maxlength: 160 }, selectedAnswer: { type: Number, min: 0, max: 100, default: null }, isCorrect: { type: Boolean, default: null } }, { _id: false });
const attemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  testId: { type: String, required: true, trim: true, maxlength: 120 },
  answers: { type: [answerSchema], default: [] },
  score: { type: Number, required: true, min: 0 }, questionCount: { type: Number, required: true, min: 0 },
  completionStatus: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'completed', index: true },
  startedAt: { type: Date, default: Date.now }, completedAt: { type: Date, default: Date.now }, durationSeconds: { type: Number, min: 0, max: 604800, default: null },
}, { timestamps: true, versionKey: false });
attemptSchema.index({ userId: 1, completedAt: -1 });
attemptSchema.index({ userId: 1, testId: 1, completedAt: -1 });
module.exports = mongoose.models.TestAttempt || mongoose.model('TestAttempt', attemptSchema);
