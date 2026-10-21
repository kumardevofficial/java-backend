const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

router.get('/ready', (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  const status = databaseReady ? 200 : 503;
  res.status(status).json({
    success: databaseReady,
    data: { status: databaseReady ? 'ready' : 'not_ready', database: databaseReady ? 'connected' : 'disconnected' },
  });
});

module.exports = router;
