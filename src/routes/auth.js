const express = require('express'); const bcrypt = require('bcrypt');
const User = require('../models/User'); const { AppError } = require('../middleware/errors');
const { issueToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../middleware/auth');
const { signupInput, loginInput } = require('../utils/validation'); const asyncHandler = require('../utils/asyncHandler');
const router = express.Router();
function safeUser(user) { return { id: String(user._id), firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, preferences: user.preferences, createdAt: user.createdAt, updatedAt: user.updatedAt }; }
router.post('/signup', asyncHandler(async (req, res) => {
  const input = signupInput(req.body); const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone, passwordHash });
  setAuthCookie(res, issueToken(user)); res.status(201).json({ success: true, data: { user: safeUser(user) } });
}));
router.post('/login', asyncHandler(async (req, res) => {
  const input = loginInput(req.body); const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!valid || user.accountStatus !== 'active') throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  setAuthCookie(res, issueToken(user)); res.json({ success: true, data: { user: safeUser(user) } });
}));
router.get('/me', requireAuth, (req, res) => res.json({ success: true, data: { user: safeUser(req.user) } }));
router.post('/logout', (_req, res) => { clearAuthCookie(res); res.json({ success: true, data: { message: 'Signed out' } }); });
module.exports = router;
