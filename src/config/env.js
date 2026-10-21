const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
function csv(value) { return (value || '').split(',').map((item) => item.trim()).filter(Boolean); }
const nodeEnv = process.env.NODE_ENV || 'development';
const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'none' : 'lax')).toLowerCase();
if (!['lax', 'strict', 'none'].includes(sameSite)) throw new Error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none');
const env = {
  nodeEnv, port: Number(process.env.PORT) || 4000, mongoUri: process.env.MONGODB_URI || '',
  frontendOrigins: csv(process.env.FRONTEND_ORIGINS || 'http://localhost:5173'),
  // AUTH_SECRET was used by an earlier deployment setup; keep it as a backward-compatible alias.
  jwtSecret: process.env.JWT_SECRET || process.env.AUTH_SECRET || '', jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  cookieName: process.env.AUTH_COOKIE_NAME || 'javaprep_access', cookieSameSite: sameSite,
  geminiApiKey: process.env.GEMINI_API_KEY || '', geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};
function assertStartupConfig() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (env.jwtSecret.length < 32 || /replace|example|placeholder/i.test(env.jwtSecret)) throw new Error('JWT_SECRET or AUTH_SECRET must be a real random secret of at least 32 characters');
  if (env.cookieSameSite === 'none' && nodeEnv === 'production' && process.env.AUTH_COOKIE_SECURE === 'false') throw new Error('SameSite=None cookies require Secure in production');
}
const cookieOptions = { httpOnly: true, secure: nodeEnv === 'production' || process.env.AUTH_COOKIE_SECURE === 'true', sameSite: env.cookieSameSite, path: '/', maxAge: 15 * 60 * 1000 };
module.exports = { env, cookieOptions, assertStartupConfig };

