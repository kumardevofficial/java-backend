const { AppError } = require('../middleware/errors');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+91)?[6-9]\d{9}$/;
function object(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, 'INVALID_BODY', 'Request body must be a JSON object'); return body; }
function onlyKeys(body, allowed) { const extra = Object.keys(body).filter((key) => !allowed.includes(key)); if (extra.length) throw new AppError(422, 'INVALID_FIELDS', 'Request contains unsupported fields'); }
function string(value, label, min, max) { if (typeof value !== 'string') throw new AppError(422, 'VALIDATION_ERROR', `${label} must be text`); const out = value.trim(); if (out.length < min || out.length > max) throw new AppError(422, 'VALIDATION_ERROR', `${label} must be between ${min} and ${max} characters`); return out; }
function normalizeEmail(value) { const email = string(value, 'Email', 3, 254).toLowerCase(); if (!emailPattern.test(email)) throw new AppError(422, 'VALIDATION_ERROR', 'Enter a valid email address'); return email; }
function normalizePhone(value) { const raw = string(value, 'Phone number', 10, 13).replace(/[\s()-]/g, ''); if (!phonePattern.test(raw)) throw new AppError(422, 'VALIDATION_ERROR', 'Enter a valid 10-digit Indian mobile number beginning with 6–9'); return `+91${raw.replace(/^\+91/, '')}`; }
function password(value) { if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) throw new AppError(422, 'VALIDATION_ERROR', 'Password must be at least 8 characters and no more than 72 UTF-8 bytes'); return value; }
function signupInput(raw) {
  const body = object(raw); onlyKeys(body, ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword']);
  const firstName = string(body.firstName, 'First name', 1, 50); const lastName = string(body.lastName, 'Last name', 1, 50);
  const email = normalizeEmail(body.email); const phone = normalizePhone(body.phone); const pass = password(body.password);
  if (typeof body.confirmPassword !== 'string' || body.confirmPassword !== pass) throw new AppError(422, 'VALIDATION_ERROR', 'Passwords do not match');
  return { firstName, lastName, email, phone, password: pass };
}
function loginInput(raw) { const body = object(raw); onlyKeys(body, ['email', 'password']); return { email: normalizeEmail(body.email), password: password(body.password) }; }
function profileInput(raw) {
  const body = object(raw); onlyKeys(body, ['firstName', 'lastName', 'phone']);
  const out = {}; if (!Object.keys(body).length) throw new AppError(422, 'VALIDATION_ERROR', 'Provide at least one profile field');
  if (Object.hasOwn(body, 'firstName')) out.firstName = string(body.firstName, 'First name', 1, 50);
  if (Object.hasOwn(body, 'lastName')) out.lastName = string(body.lastName, 'Last name', 1, 50);
  if (Object.hasOwn(body, 'phone')) out.phone = normalizePhone(body.phone);
  return out;
}
function pagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page); const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new AppError(422, 'VALIDATION_ERROR', 'page must be positive and limit must be between 1 and 50');
  return { page, limit, skip: (page - 1) * limit };
}
function annotationInput(raw, partial = false) {
  const body = object(raw); const allowed = ['documentId', 'topicId', 'pageNumber', 'annotationType', 'selectedText', 'note', 'anchor']; onlyKeys(body, allowed);
  const out = {};
  for (const key of ['documentId', 'topicId', 'pageNumber', 'annotationType', 'selectedText', 'note', 'anchor']) {
    if (!Object.hasOwn(body, key)) { if (!partial && ['documentId', 'pageNumber', 'annotationType'].includes(key)) throw new AppError(422, 'VALIDATION_ERROR', `${key} is required`); continue; }
    const val = body[key];
    if (key === 'documentId') out[key] = string(val, key, 1, 180);
    else if (key === 'topicId') out[key] = val === null ? null : string(val, key, 1, 120);
    else if (key === 'pageNumber') { if (!Number.isInteger(val) || val < 1 || val > 100000) throw new AppError(422, 'VALIDATION_ERROR', 'pageNumber must be a positive integer'); out[key] = val; }
    else if (key === 'annotationType') { if (!['highlight', 'note'].includes(val)) throw new AppError(422, 'VALIDATION_ERROR', 'annotationType must be highlight or note'); out[key] = val; }
    else if (['selectedText', 'note'].includes(key)) out[key] = val === '' ? '' : string(val, key, 1, 5000);
    else if (key === 'anchor') { if (val !== null && (typeof val !== 'object' || Array.isArray(val) || Buffer.byteLength(JSON.stringify(val)) > 6000)) throw new AppError(422, 'VALIDATION_ERROR', 'anchor must be a small JSON object'); out[key] = val; }
  }
  return out;
}
module.exports = { object, onlyKeys, string, normalizeEmail, normalizePhone, password, signupInput, loginInput, profileInput, pagination, annotationInput };
