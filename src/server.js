const mongoose = require('mongoose'); const { env } = require('./config/env'); const { createApp, connectDatabase } = require('./app');
function safeStartupHint(error) {
  const configHints = new Set([
    'MONGODB_URI is required',
    'JWT_SECRET or AUTH_SECRET must be a real random secret of at least 32 characters',
    'AUTH_COOKIE_SAME_SITE must be one of lax, strict, or none',
    'SameSite=None cookies require Secure in production',
  ]);
  if (configHints.has(error.message)) return error.message;
  if (error.name === 'MongoServerSelectionError') return 'Cannot reach MongoDB. Check the URI, Atlas Network Access IP allowlist, and database user credentials.';
  if (error.name === 'MongoParseError') return 'MONGODB_URI has an invalid format. Check the Atlas connection string.';
  return 'Check the backend configuration and try again.';
}
async function start() {
  await connectDatabase();
  const server = createApp().listen(env.port, () => console.log(JSON.stringify({ level: 'info', message: 'API listening', port: env.port, environment: env.nodeEnv })));
  console.log(JSON.stringify({ level: 'info', message: 'Database connected' }));
  const shutdown = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
start().catch((error) => { console.error(JSON.stringify({ level: 'error', message: 'Startup failed', name: error.name || 'Error', hint: safeStartupHint(error) })); process.exit(1); });

