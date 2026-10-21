const jwt = require('jsonwebtoken'); const User = require('../models/User'); const { env, cookieOptions } = require('../config/env'); const { AppError } = require('./errors');
function issueToken(user) { return jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, issuer: 'javaprep-api', audience: 'javaprep-web' }); }
function setAuthCookie(res, token) { res.cookie(env.cookieName, token, cookieOptions); }
function clearAuthCookie(res) { const { maxAge: _maxAge, ...options } = cookieOptions; res.clearCookie(env.cookieName, options); }
async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[env.cookieName];
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    const payload = jwt.verify(token, env.jwtSecret, { issuer: 'javaprep-api', audience: 'javaprep-web' });
    const user = await User.findById(payload.sub);
    if (!user || user.accountStatus !== 'active') throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue');
    req.user = user; next();
  } catch (err) { next(err instanceof AppError ? err : new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue')); }
}
module.exports = { issueToken, setAuthCookie, clearAuthCookie, requireAuth };
