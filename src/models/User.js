const mongoose = require('mongoose');
const preferencesSchema = new mongoose.Schema({ theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' }, weeklyGoalMinutes: { type: Number, min: 0, max: 10080, default: 180 } }, { _id: false });
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
  lastName: { type: String, required: true, trim: true, minlength: 1, maxlength: 50 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true, index: true },
  phone: { type: String, required: true, unique: true, index: true, match: /^\+91[6-9]\d{9}$/ },
  passwordHash: { type: String, required: true, select: false },
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  preferences: { type: preferencesSchema, default: () => ({}) },
}, { timestamps: true, versionKey: false, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.__v; return ret; } } });
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
