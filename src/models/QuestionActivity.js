const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: String, required: true, trim: true, maxlength: 160 },
  topicId: { type: String, required: true, trim: true, maxlength: 120 },
  status: { type: String, enum: ['attempted', 'bookmarked', 'incorrect'], required: true },
  selectedAnswer: { type: Number, min: 0, max: 100, default: null },
  isCorrect: { type: Boolean, default: null }, lastAttemptedAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false });
schema.index({ userId: 1, questionId: 1 }, { unique: true });
schema.index({ userId: 1, status: 1, updatedAt: -1 });
schema.index({ userId: 1, topicId: 1, updatedAt: -1 });
module.exports = mongoose.models.QuestionActivity || mongoose.model('QuestionActivity', schema);
