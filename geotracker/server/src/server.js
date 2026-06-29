/**
 * GeoTracker Server
 * Express-based REST API for location tracking
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const db = require('./database');
const { router: apiRouter, broadcast } = require('./routes');

// Ensure data directory
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// API routes
app.use('/api', apiRouter);

// Serve web dashboard (if files exist)
const WEB_DIR = path.join(__dirname, '..', '..', 'web');
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR));
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║     📍 GeoTracker Server v1.0.0          ║
║     Listening on port ${PORT}                 ║
╚══════════════════════════════════════════╝
  `);

  // Initialize database
  db.initDB();

  // Auto-archive old data every 6 hours
  const archiveLoop = () => {
    try {
      const result = db.archiveOldData(31);
      if (result.archived > 0) {
        console.log(`[ARCHIVE] Archived ${result.archived} records`);
      }
    } catch (err) {
      console.error('[ARCHIVE] Error:', err.message);
    }
  };

  // Run first archive after 1 min, then every 6 hours
  setTimeout(archiveLoop, 60000);
  setInterval(archiveLoop, 6 * 60 * 60 * 1000);

  // Listen for new locations via broadcast hook (for batch inserts)
  // Real-time broadcast from mobile would call this
});

module.exports = app;
