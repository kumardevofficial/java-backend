const express = require('express'); const { requireAuth } = require('../middleware/auth'); const { AppError } = require('../middleware/errors');
const { object, onlyKeys, string } = require('../utils/validation'); const asyncHandler = require('../utils/asyncHandler'); const LearningActivity = require('../models/LearningActivity');
const router = express.Router(); router.use(requireAuth);
router.post('/activity', asyncHandler(async (req, res) => {
  const body = object(req.body); onlyKeys(body, ['activityType', 'topicId', 'referenceId', 'correctCount', 'totalCount', 'durationSeconds']);
  const types = ['practice_answer', 'practice_completed', 'test_completed', 'topic_opened', 'annotation_created', 'recording_opened'];
  if (!types.includes(body.activityType)) throw new AppError(422, 'VALIDATION_ERROR', 'activityType is invalid');
  const entry = { userId: req.user._id, activityType: body.activityType };
  if (body.topicId !== undefined) entry.topicId = string(body.topicId, 'topicId', 1, 120);
  if (body.referenceId !== undefined) entry.referenceId = string(body.referenceId, 'referenceId', 1, 160);
  for (const key of ['correctCount', 'totalCount', 'durationSeconds']) if (body[key] !== undefined) { if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 604800) throw new AppError(422, 'VALIDATION_ERROR', `${key} must be a non-negative integer`); entry[key] = body[key]; }
  if (entry.correctCount !== undefined && entry.totalCount !== undefined && entry.correctCount > entry.totalCount) throw new AppError(422, 'VALIDATION_ERROR', 'correctCount cannot exceed totalCount');
  const activity = await LearningActivity.create(entry); res.status(201).json({ success: true, data: { activity } });
}));
module.exports = router;
