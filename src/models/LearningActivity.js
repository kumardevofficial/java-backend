const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityType: { type: String, enum: ['practice_answer', 'practice_completed', 'test_completed', 'topic_opened', 'annotation_created', 'recording_opened'], required: true },
  topicId: { type: String, trim: true, maxlength: 120, default: null },
  referenceId: { type: String, trim: true, maxlength: 160, default: null },
  correctCount: { type: Number, min: 0, default: null }, totalCount: { type: Number, min: 0, default: null },
  durationSeconds: { type: Number, min: 0, max: 604800, default: null },
  occurredAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, versionKey: false });
schema.index({ userId: 1, occurredAt: -1 });
module.exports = mongoose.models.LearningActivity || mongoose.model('LearningActivity', schema);
