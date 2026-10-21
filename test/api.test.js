process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-thirty-two-characters';
process.env.FRONTEND_ORIGINS = 'http://localhost:5173';
process.env.AUTH_COOKIE_SAME_SITE = 'lax';
const path = require('node:path');
const fs = require('node:fs');
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../.cache/mongodb-binaries');
const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const { createApp } = require('../src/app');
const app = createApp(); let mongo;
const signup = (overrides = {}) => ({ firstName: 'Asha', lastName: 'Rao', email: 'asha@example.com', phone: '9876543210', password: 'valid-pass-123', confirmPassword: 'valid-pass-123', ...overrides });
async function register(body) { return request.agent(app).post('/api/auth/signup').send(body); }
before(async () => { const dbPath = path.resolve(__dirname, '../.test-data');
  fs.mkdirSync(dbPath, { recursive: true });
  mongo = await MongoMemoryServer.create({ instance: { dbPath } }); await mongoose.connect(mongo.getUri()); });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); fs.rmSync(path.resolve(__dirname, '../.test-data'), { recursive: true, force: true }); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  assert.equal((await register(signup())).status, 201);
  assert.equal((await register(signup({ firstName: 'Bob', email: 'bob@example.com', phone: '9123456789' }))).status, 201);
});
test('signup validates phone and confirmation and returns no hash or token body', async () => {
  const invalid = await request(app).post('/api/auth/signup').send(signup({ phone: '12345' })); assert.equal(invalid.status, 422);
  const created = await register(signup({ email: 'new@example.com', phone: '9988776655' })); assert.equal(created.status, 201);
  assert.equal(JSON.stringify(created.body).includes('passwordHash'), false); assert.equal(JSON.stringify(created.body).includes('accessToken'), false);
  assert.ok(created.headers['set-cookie'].some((cookie) => cookie.includes('HttpOnly')));
  assert.equal((await register(signup({ email: 'other@example.com' }))).status, 409);
  assert.equal((await register(signup({ phone: '9988776656' }))).status, 409);
});
test('login has generic errors and /me requires cookie auth', async () => {
  const wrong = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'wrong-pass-123' });
  assert.equal(wrong.status, 401); assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS');
  const agent = request.agent(app); assert.equal((await agent.post('/api/auth/login').send({ email: 'ASHA@example.com', password: 'valid-pass-123' })).status, 200);
  assert.equal((await agent.get('/api/auth/me')).status, 200); assert.equal((await request(app).get('/api/auth/me')).status, 401);
  assert.equal((await agent.post('/api/auth/logout')).status, 200);
});
test('profile updates validate allowed fields and preserve normalized email', async () => {
  const agent = request.agent(app); await agent.post('/api/auth/login').send({ email: 'asha@example.com', password: 'valid-pass-123' });
  const updated = await agent.patch('/api/profile').send({ firstName: ' Asha K ', phone: '+919876543210' });
  assert.equal(updated.status, 200); assert.equal(updated.body.data.user.firstName, 'Asha K'); assert.equal(updated.body.data.user.phone, '+919876543210');
  assert.equal(updated.body.data.user.email, 'asha@example.com'); assert.equal((await agent.patch('/api/profile').send({ accountStatus: 'suspended' })).status, 422);
});
test('annotations are isolated across owners for read, update, and delete', async () => {
  const a = request.agent(app); const b = request.agent(app);
  await a.post('/api/auth/login').send({ email: 'asha@example.com', password: 'valid-pass-123' }); await b.post('/api/auth/login').send({ email: 'bob@example.com', password: 'valid-pass-123' });
  const created = await a.post('/api/profile/annotations').send({ documentId: '/book-notes/topics/arrays.pdf', topicId: 'arrays', pageNumber: 7, annotationType: 'highlight', selectedText: 'Array length', anchor: { x: 0.2, y: 0.3 } });
  assert.equal(created.status, 201); const id = created.body.data.annotation._id;
  assert.equal((await b.get('/api/profile/annotations')).body.data.items.length, 0);
  assert.equal((await b.patch(`/api/profile/annotations/${id}`).send({ note: 'no' })).status, 404);
  assert.equal((await b.delete(`/api/profile/annotations/${id}`)).status, 404);
  assert.equal((await a.get('/api/profile/annotations')).body.data.items.length, 1);
});
test('question and test histories are scoped to the authenticated user', async () => {
  const a = request.agent(app); const b = request.agent(app);
  const loginA = await a.post('/api/auth/login').send({ email: 'asha@example.com', password: 'valid-pass-123' });
  const loginB = await b.post('/api/auth/login').send({ email: 'bob@example.com', password: 'valid-pass-123' });
  assert.equal(loginA.status, 200, JSON.stringify(loginA.body)); assert.equal(loginB.status, 200, JSON.stringify(loginB.body));
  const questionSaved = await a.post('/api/profile/questions').send({ questionId: 'class-test-1-001', topicId: 'class-test-1', status: 'incorrect', selectedAnswer: 0, isCorrect: false });
  assert.equal(questionSaved.status, 201, JSON.stringify(questionSaved.body));
  const attemptSaved = await a.post('/api/profile/test-attempts').send({ testId: 'class-test-1', answers: [{ questionId: 'class-test-1-001', selectedAnswer: 0, isCorrect: false }], score: 0, questionCount: 1, completionStatus: 'completed' });
  assert.equal(attemptSaved.status, 201, JSON.stringify(attemptSaved.body));
  assert.equal((await a.get('/api/profile/questions')).body.data.pagination.total, 1); assert.equal((await b.get('/api/profile/questions')).body.data.pagination.total, 0);
  assert.equal((await a.get('/api/profile/test-attempts')).body.data.pagination.total, 1); assert.equal((await b.get('/api/profile/test-attempts')).body.data.pagination.total, 0);
});







test('health endpoint responds and growth analysis explains when Gemini is not configured', async () => {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.data.status, 'ok');
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: 'asha@example.com', password: 'valid-pass-123' });
  const growth = await agent.post('/api/profile/growth-analysis').send({});
  assert.equal(growth.status, 503);
  assert.equal(growth.body.error.code, 'AI_NOT_CONFIGURED');
});

