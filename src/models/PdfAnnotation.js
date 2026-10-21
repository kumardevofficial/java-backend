const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentId: { type: String, required: true, trim: true, maxlength: 180 },
  topicId: { type: String, trim: true, maxlength: 120, default: null },
  pageNumber: { type: Number, required: true, min: 1, max: 100000 },
  annotationType: { type: String, enum: ['highlight', 'note'], required: true },
  selectedText: { type: String, trim: true, maxlength: 5000, default: '' },
  note: { type: String, trim: true, maxlength: 5000, default: '' },
  anchor: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true, versionKey: false });
schema.index({ userId: 1, documentId: 1, pageNumber: 1, updatedAt: -1 });
schema.index({ userId: 1, _id: 1 });
module.exports = mongoose.models.PdfAnnotation || mongoose.model('PdfAnnotation', schema);
