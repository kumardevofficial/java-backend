const cors = require('cors'); const express = require('express'); const helmet = require('helmet');
const cookieParser = require('cookie-parser'); const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose'); const { env, assertStartupConfig } = require('./config/env');
const { AppError, errorHandler, notFound, tooManyRequests } = require('./middleware/errors');
const authRoutes = require('./routes/auth'); const profileRoutes = require('./routes/profile'); const learningRoutes = require('./routes/learning');
const User = require('./models/User'); const TestAttempt = require('./models/TestAttempt');
const QuestionActivity = require('./models/QuestionActivity'); const PdfAnnotation = require('./models/PdfAnnotation');
const LearningActivity = require('./models/LearningActivity');
let connectionPromise = null;
function readinessFailureReason(error) {
  if (error.message === 'MONGODB_URI is required') return 'missing_mongodb_uri';
  if (error.message.startsWith('JWT_SECRET') || error.message.startsWith('AUTH_SECRET')) return 'missing_or_invalid_auth_secret';
  if (error.name === 'MongoParseError') return 'invalid_mongodb_uri';
  if (error.code === 18 || error.codeName === 'AuthenticationFailed') return 'mongodb_authentication_failed';
  if (error.name === 'MongoServerSelectionError') return 'mongodb_unreachable_check_atlas_network_access';
  if (error.name === 'MongoNetworkError') return 'mongodb_network_error';
  return 'database_connection_or_index_initialization_failed';
}
async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) return connectionPromise;
  assertStartupConfig();
  connectionPromise = (async () => {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
      await Promise.all([User.init(), TestAttempt.init(), QuestionActivity.init(), PdfAnnotation.init(), LearningActivity.init()]);
    } finally { connectionPromise = null; }
  })();
  return connectionPromise;
}
function createApp() {
  const app = express(); app.disable('x-powered-by'); if (env.nodeEnv === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin(origin, callback) { if (!origin || env.frontendOrigins.includes(origin)) return callback(null, true); return callback(new AppError(403, 'CORS_ORIGIN_DENIED', 'Request origin is not allowed')); }, credentials: true }));
  app.use((req, _res, next) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { const origin = req.get('origin'); if (origin && !env.frontendOrigins.includes(origin)) return next(new AppError(403, 'CSRF_ORIGIN_DENIED', 'Request origin is not allowed')); } next(); });
  app.use(express.json({ limit: '32kb' })); app.use(cookieParser());
  app.get('/', (_req, res) => res.json({ success: true, data: { name: 'JavaPrep API', health: '/api/health', readiness: '/api/ready' } }));
  app.get('/favicon.ico', (_req, res) => res.sendStatus(204));
  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.get('/api/ready', async (_req, res) => {
    try { await connectDatabase(); res.json({ success: true, data: { status: 'ready', database: 'connected' } }); }
    catch (error) {
      console.error(JSON.stringify({ level: 'error', message: 'Readiness check failed', reason: readinessFailureReason(error), errorName: error.name || 'Error', mongoCode: error.code || null }));
      res.status(503).json({ success: false, data: { status: 'not_ready', database: 'disconnected' } });
    }
  });
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: env.nodeEnv === 'test' ? 1000 : 20, standardHeaders: 'draft-7', legacyHeaders: false, handler: tooManyRequests }));
  app.use(['/api/auth', '/api/profile', '/api/learning'], (_req, _res, next) => { connectDatabase().then(() => next()).catch(next); });
  app.use('/api/auth', authRoutes); app.use('/api/profile', profileRoutes); app.use('/api/learning', learningRoutes);
  app.use(notFound); app.use(errorHandler); return app;
}
const app = createApp();
app.createApp = createApp;
app.connectDatabase = connectDatabase;
module.exports = app;

